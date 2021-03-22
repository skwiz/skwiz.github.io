// Instantiate the object
var I18n = I18n || {};

// Set default locale to english
I18n.defaultLocale = "en";

// Set default pluralization rule
I18n.pluralizationRules = {
  en: function(n) {
    return n === 0 ? ["zero", "none", "other"] : n === 1 ? "one" : "other";
  }
};

// Set current locale to null
I18n.locale = null;
I18n.fallbackLocale = null;

// Set the placeholder format. Accepts `{{placeholder}}` and `%{placeholder}`.
I18n.PLACEHOLDER = /(?:\{\{|%\{)(.*?)(?:\}\}?)/gm;

I18n.SEPARATOR = ".";

I18n.noFallbacks = false;

I18n.isValidNode = function(obj, node, undefined) {
  return obj[node] !== null && obj[node] !== undefined;
};

I18n.lookup = function(scope, options) {
  options = options || {};

  var translations = this.prepareOptions(I18n.translations),
    locale = options.locale || I18n.currentLocale(),
    messages = translations[locale] || {},
    currentScope;

  options = this.prepareOptions(options);

  if (typeof scope === "object") {
    scope = scope.join(this.SEPARATOR);
  }

  if (options.scope) {
    scope = options.scope.toString() + this.SEPARATOR + scope;
  }

  var originalScope = scope;
  scope = scope.split(this.SEPARATOR);

  if (scope.length > 0 && scope[0] !== "js") {
    scope.unshift("js");
  }

  while (messages && scope.length > 0) {
    currentScope = scope.shift();
    messages = messages[currentScope];
  }

  if (messages === undefined && this.extras && this.extras[locale]) {
    messages = this.extras[locale];
    scope = originalScope.split(this.SEPARATOR);

    while (messages && scope.length > 0) {
      currentScope = scope.shift();
      messages = messages[currentScope];
    }
  }

  if (messages === undefined) {
    messages = options.defaultValue;
  }

  return messages;
};

// Merge serveral hash options, checking if value is set before
// overwriting any value. The precedence is from left to right.
//
//   I18n.prepareOptions({name: "John Doe"}, {name: "Mary Doe", role: "user"});
//   #=> {name: "John Doe", role: "user"}
//
I18n.prepareOptions = function() {
  var options = {},
    opts,
    count = arguments.length;

  for (var i = 0; i < count; i++) {
    opts = arguments[i];

    if (!opts) {
      continue;
    }

    for (var key in opts) {
      if (!this.isValidNode(options, key)) {
        options[key] = opts[key];
      }
    }
  }

  return options;
};

I18n.interpolate = function(message, options) {
  options = this.prepareOptions(options);

  var matches = message.match(this.PLACEHOLDER),
    placeholder,
    value,
    name;

  if (!matches) {
    return message;
  }

  for (var i = 0; (placeholder = matches[i]); i++) {
    name = placeholder.replace(this.PLACEHOLDER, "$1");

    if (typeof options[name] === "string") {
      // The dollar sign (`$`) is a special replace pattern, and `$&` inserts
      // the matched string. Thus dollars signs need to be escaped with the
      // special pattern `$$`, which inserts a single `$`.
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
      value = options[name].replace(/\$/g, "$$$$");
    } else {
      value = options[name];
    }

    if (!this.isValidNode(options, name)) {
      value = "[missing " + placeholder + " value]";
    }

    var regex = new RegExp(
      placeholder.replace(/\{/gm, "\\{").replace(/\}/gm, "\\}")
    );
    message = message.replace(regex, value);
  }

  return message;
};

I18n.translate = function(scope, options) {
  options = this.prepareOptions(options);
  options.needsPluralization = typeof options.count === "number";
  options.ignoreMissing = !this.noFallbacks;

  var translation = this.findTranslation(scope, options);

  if (!this.noFallbacks) {
    if (!translation && this.fallbackLocale) {
      options.locale = this.fallbackLocale;
      translation = this.findTranslation(scope, options);
    }

    options.ignoreMissing = false;

    if (!translation && this.currentLocale() !== this.defaultLocale) {
      options.locale = this.defaultLocale;
      translation = this.findTranslation(scope, options);
    }

    if (!translation && this.currentLocale() !== "en") {
      options.locale = "en";
      translation = this.findTranslation(scope, options);
    }
  }

  try {
    return this.interpolate(translation, options);
  } catch (error) {
    return this.missingTranslation(scope);
  }
};

I18n.findTranslation = function(scope, options) {
  var translation = this.lookup(scope, options);

  if (translation && options.needsPluralization) {
    translation = this.pluralize(translation, scope, options);
  }

  return translation;
};

I18n.toNumber = function(number, options) {
  options = this.prepareOptions(options, this.lookup("number.format"), {
    precision: 3,
    separator: this.SEPARATOR,
    delimiter: ",",
    strip_insignificant_zeros: false
  });

  var negative = number < 0,
    string = Math.abs(number)
      .toFixed(options.precision)
      .toString(),
    parts = string.split(this.SEPARATOR),
    buffer = [],
    formattedNumber;

  number = parts[0];

  while (number.length > 0) {
    buffer.unshift(number.substr(Math.max(0, number.length - 3), 3));
    number = number.substr(0, number.length - 3);
  }

  formattedNumber = buffer.join(options.delimiter);

  if (options.precision > 0) {
    formattedNumber += options.separator + parts[1];
  }

  if (negative) {
    formattedNumber = "-" + formattedNumber;
  }

  if (options.strip_insignificant_zeros) {
    var regex = {
      separator: new RegExp(options.separator.replace(/\./, "\\.") + "$"),
      zeros: /0+$/
    };

    formattedNumber = formattedNumber
      .replace(regex.zeros, "")
      .replace(regex.separator, "");
  }

  return formattedNumber;
};

I18n.toHumanSize = function(number, options) {
  var kb = 1024,
    size = number,
    iterations = 0,
    unit,
    precision;

  while (size >= kb && iterations < 4) {
    size = size / kb;
    iterations += 1;
  }

  if (iterations === 0) {
    unit = this.t("number.human.storage_units.units.byte", { count: size });
    precision = 0;
  } else {
    unit = this.t(
      "number.human.storage_units.units." +
        [null, "kb", "mb", "gb", "tb"][iterations]
    );
    precision = size - Math.floor(size) === 0 ? 0 : 1;
  }

  options = this.prepareOptions(options, {
    precision: precision,
    format: this.t("number.human.storage_units.format"),
    delimiter: ""
  });

  number = this.toNumber(size, options);
  number = options.format.replace("%u", unit).replace("%n", number);

  return number;
};

I18n.pluralizer = function(locale) {
  var pluralizer = this.pluralizationRules[locale];
  if (pluralizer !== undefined) return pluralizer;
  return this.pluralizationRules["en"];
};

I18n.findAndTranslateValidNode = function(keys, translation) {
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (this.isValidNode(translation, key)) return translation[key];
  }
  return null;
};

I18n.pluralize = function(translation, scope, options) {
  if (typeof translation !== "object") return translation;

  options = this.prepareOptions(options);
  var count = options.count.toString();

  var pluralizer = this.pluralizer(options.locale || this.currentLocale());
  var key = pluralizer(Math.abs(count));
  var keys = typeof key === "object" && key instanceof Array ? key : [key];

  var message = this.findAndTranslateValidNode(keys, translation);

  if (message !== null || options.ignoreMissing) {
    return message;
  }

  return this.missingTranslation(scope, keys[0]);
};

I18n.missingTranslation = function(scope, key) {
  var message = "[" + this.currentLocale() + this.SEPARATOR + scope;
  if (key) {
    message += this.SEPARATOR + key;
  }
  return message + "]";
};

I18n.currentLocale = function() {
  return I18n.locale || I18n.defaultLocale;
};

I18n.enableVerboseLocalization = function() {
  var counter = 0;
  var keys = {};
  var t = I18n.t;

  I18n.noFallbacks = true;

  I18n.t = I18n.translate = function(scope, value) {
    var current = keys[scope];
    if (!current) {
      current = keys[scope] = ++counter;
      var message = "Translation #" + current + ": " + scope;
      if (value && Object.keys(value).length > 0) {
        message += ", parameters: " + JSON.stringify(value);
      }
      // eslint-disable-next-line no-console
      console.info(message);
    }
    return t.apply(I18n, [scope, value]) + " (#" + current + ")";
  };
};

I18n.enableVerboseLocalizationSession = function() {
  sessionStorage.setItem("verbose_localization", "true");
  I18n.enableVerboseLocalization();

  return "Verbose localization is enabled. Close the browser tab to turn it off. Reload the page to see the translation keys.";
};

// shortcuts
I18n.t = I18n.translate;


MessageFormat = {locale: {}};
I18n._compiledMFs = {"too_few_topics_and_posts_notice_MF" : function(d){
var r = "";
r += "Let's <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">start the discussion!</a> There ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "is <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topic";
return r;
},
"other" : function(d){
var r = "";
r += "are <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " and ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> post";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> posts";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Visitors need more to read and reply to – we recommend at least ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topic";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " and ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> post";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> posts";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Only staff can see this message.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Let's <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">start the discussion!</a> There ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "is <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topic";
return r;
},
"other" : function(d){
var r = "";
r += "are <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Visitors need more to read and reply to – we recommend at least ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topic";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Only staff can see this message.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "Let's <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">start the discussion!</a> There ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "is <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> post";
return r;
},
"other" : function(d){
var r = "";
r += "are <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> posts";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Visitors need more to read and reply to – we recommend at least ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> post";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> posts";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Only staff can see this message.";
return r;
}, "logs_error_rate_notice.reached_hour_MF" : function(d){
var r = "";
r += "<b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["relativeAge"];
r += "</b> – <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["url"];
r += "' target='_blank'>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "rate";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/hour";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/hour";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> reached site setting limit of ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/hour";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/hour";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "logs_error_rate_notice.reached_minute_MF" : function(d){
var r = "";
r += "<b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["relativeAge"];
r += "</b> – <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["url"];
r += "' target='_blank'>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "rate";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> reached site setting limit of ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "logs_error_rate_notice.exceeded_hour_MF" : function(d){
var r = "";
r += "<b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["relativeAge"];
r += "</b> – <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["url"];
r += "' target='_blank'>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "rate";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/hour";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/hour";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> exceeded site setting limit of ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/hour";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/hour";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "logs_error_rate_notice.exceeded_minute_MF" : function(d){
var r = "";
r += "<b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["relativeAge"];
r += "</b> – <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["url"];
r += "' target='_blank'>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "rate";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> exceeded site setting limit of ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " error/minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " errors/minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "There ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "replyCount";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "is <b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> reply";
return r;
},
"other" : function(d){
var r = "";
r += "are <b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> replies";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " with an estimated read time of <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "readingTime";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " minutes";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "There ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "UNREAD";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"0" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "is <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " unread</a> ";
return r;
},
"other" : function(d){
var r = "";
r += "are <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " unread</a> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "NEW";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"0" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_2 = "BOTH";
var k_2=d[lastkey_2];
var off_1 = 0;
var pf_1 = { 
"true" : function(d){
var r = "";
r += "and ";
return r;
},
"false" : function(d){
var r = "";
r += "is ";
return r;
},
"other" : function(d){
var r = "";
return r;
}
};
r += (pf_1[ k_2 ] || pf_1[ "other" ])( d );
r += " <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> topic";
return r;
},
"other" : function(d){
var r = "";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_2 = "BOTH";
var k_2=d[lastkey_2];
var off_1 = 0;
var pf_1 = { 
"true" : function(d){
var r = "";
r += "and ";
return r;
},
"false" : function(d){
var r = "";
r += "are ";
return r;
},
"other" : function(d){
var r = "";
return r;
}
};
r += (pf_1[ k_2 ] || pf_1[ "other" ])( d );
r += " <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " remaining, or ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "browse other topics in ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["catLink"];
return r;
},
"false" : function(d){
var r = "";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["latestLink"];
return r;
},
"other" : function(d){
var r = "";
return r;
}
};
r += (pf_0[ k_1 ] || pf_0[ "other" ])( d );
return r;
}, "topic.bumped_at_title_MF" : function(d){
var r = "";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["FIRST_POST"];
r += ": ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["CREATED_AT"];
r += "\n";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["LAST_POST"];
r += ": ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["BUMPED_AT"];
return r;
}, "flagging.delete_confirm_MF" : function(d){
var r = "";
r += "You are about to delete ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> post";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> posts";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " and ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> topic";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " from this user, remove their account, block signups from their IP address <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b>, and add their email address <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> to a permanent block list. Are you sure this user is really a spammer?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "This topic has ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "count";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " reply";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " replies";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "ratio";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"low" : function(d){
var r = "";
r += "with a high like to post ratio";
return r;
},
"med" : function(d){
var r = "";
r += "with a very high like to post ratio";
return r;
},
"high" : function(d){
var r = "";
r += "with an extremely high like to post ratio";
return r;
},
"other" : function(d){
var r = "";
return r;
}
};
r += (pf_0[ k_1 ] || pf_0[ "other" ])( d );
r += "\n";
return r;
}, "admin.user.delete_all_posts_confirm_MF" : function(d){
var r = "";
r += "You are about to delete ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " post";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " posts";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " and ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " topic";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " topics";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ur"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.ur = function ( n ) {
  if ( n === 1 ) {
    return "one";
  }
  return "other";
};

(function() {
  I18n.messageFormat = function(key, options) {
    var fn = I18n._compiledMFs[key];
    if (fn) {
      try {
        return fn(options);
      } catch (err) {
        return err.message;
      }
    } else {
      return "Missing Key: " + key;
    }
  };
})();

I18n.translations = {"ur":{"js":{"number":{"format":{"separator":".","delimiter":"،"},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"بائٹ","other":"بائٹس"},"gb":"جی بی","kb":"کے بی","mb":"ایم بی","tb":"ٹی بی"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"h:mm a","timeline_date":"MMM YYYY","long_no_year_no_time":"MMM D","full_no_year_no_time":"MMMM Do","long_with_year":"MMM D, YYYY h:mm a","long_with_year_no_time":"MMM D, YYYY","full_with_year_no_time":"MMMM Do, YYYY","long_date_with_year":"MMM D, 'YY LT","long_date_without_year":"MMM D, LT","long_date_with_year_without_time":"MMM D, 'YY","long_date_without_year_with_linebreak":"MMM D \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"MMM D, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} قبل","tiny":{"half_a_minute":"ایک لحظہ قبل","less_than_x_seconds":{"one":"\u003c %{count} سیکنڈ","other":"\u003c %{count} سیکنڈ"},"x_seconds":{"one":"%{count} سیکنڈ","other":"%{count} سیکنڈ"},"less_than_x_minutes":{"one":"\u003c %{count}منٹ","other":"\u003c %{count}منٹ "},"x_minutes":{"one":"%{count} منٹ","other":"%{count} منٹس"},"about_x_hours":{"one":"%{count} گھنٹا","other":"%{count} گھنٹے"},"x_days":{"one":"%{count} دن","other":"%{count} دن"},"x_months":{"one":"%{count}ماہ","other":"%{count}مہینے"},"about_x_years":{"one":"%{count} سال","other":"%{count} سال"},"over_x_years":{"one":"\u003e %{count} سال","other":"\u003e %{count} سال"},"almost_x_years":{"one":"%{count} سال","other":"%{count} سال"},"date_month":"MMM D","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} منٹ","other":"%{count} منٹس"},"x_hours":{"one":"%{count} گھنٹا","other":"%{count} گھنٹے"},"x_days":{"one":"%{count} دن","other":"%{count} دن"},"date_year":"MMM D, 'YY"},"medium_with_ago":{"x_minutes":{"one":"%{count} منٹ قبل","other":"%{count} منٹ قبل"},"x_hours":{"one":"%{count} گھنٹہ قبل ","other":" %{count} گھنٹے قبل "},"x_days":{"one":"%{count} دن قبل","other":"%{count} دن قبل"},"x_months":{"one":"%{count} ماہ قبل","other":" %{count} مہینے قبل"},"x_years":{"one":"%{count} سال قبل","other":"%{count} سال قبل"}},"later":{"x_days":{"one":"%{count} دن بعد","other":"%{count} دن بعد"},"x_months":{"one":"%{count} مہینے بعد","other":"%{count} مہینے بعد"},"x_years":{"one":"%{count} سال بعد","other":"%{count} سال بعد"}},"previous_month":"پچھلے ماہ","next_month":"اگلے ماہ","placeholder":"تاریخ"},"share":{"topic_html":"ٹاپک: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"پوسٹ #%{postNumber}","close":"بند کریں"},"action_codes":{"public_topic":"اس ٹاپک کو پبلک بنایا گیا %{when}","private_topic":"اس ٹاپک کو ذاتی پیغام بنایا گیا %{when}","split_topic":"اس ٹاپک کو تقسیم کیا گیا %{when}","invited_user":"دعوت دی %{who} %{when}","invited_group":"دعوت دی %{who} %{when}","user_left":"%{who}نے خود کواِس پیغام سے ہٹا دیا %{when} ","removed_user":"ہٹایا %{who} %{when}","removed_group":"ہٹایا %{who} %{when}","autobumped":"خود کار طریقے سے بَمپ کریں %{when}","autoclosed":{"enabled":"بند کیا %{when}","disabled":"کھولا %{when}"},"closed":{"enabled":"بند کیا %{when}","disabled":"کھولا %{when}"},"archived":{"enabled":"آرکائیو کیا %{when}","disabled":"آرکائیو سے ہٹا دیا %{when}"},"pinned":{"enabled":"پن کر دیا %{when}","disabled":"پن ہٹا دیا %{when}"},"pinned_globally":{"enabled":"عالمی سطح پر پن کر دیا %{when}","disabled":"پن ہٹا دیا %{when}"},"visible":{"enabled":"مندرج %{when}","disabled":"غیر مندرج %{when}"},"banner":{"enabled":"اِس کو بینر بنا لیا %{when}۔ یہ ہر صفحے کے سب سے اوپر دکھایا جائے گا جب تک صارف اِسے برخاست نہیں کر دیتا۔","disabled":"اِس بینر کو ہٹا دیا %{when}۔ یہ اب ہر صفحے کے سب سے اوپر دکھایا نہیں جائے گا۔"}},"wizard_required":"اپنے نئے ڈِسکورس پر خوش آمدید! \u003ca href='%{url}' data-auto-route='true'\u003eسیٹ اَپ وزرڈ\u003c/a\u003e سے آغاز کرتے ہیں۔✨","emails_are_disabled":" ای میل کو منتظم کی طرف سے غیر فعال کر دیا گیا ہے. کسی بھی قسم کی ای میل نہیں بھیجی جائیں گی۔","bootstrap_mode_disabled":"بُوٹسٹرَیپ مَوڈ 24 گھنٹوں کے اندر غیر فعال کر دیا جائے گا۔","themes":{"default_description":"ڈِیفالٹ","broken_theme_alert":"تِھیم/کمپنَینٹ %{theme} میں ایسی غلطیاں ہیں جو آپ کی سائٹ کو صحیح طریقے سے کام کرنے سے روک سکتی ہیں! آپ اِسے %{path} پر غیر فعال کریں۔"},"s3":{"regions":{"ap_northeast_1":"ایشیا پیسفک (ٹوکیو)","ap_northeast_2":"ایشیا پیسفک (سیول)","ap_south_1":"ایشیا پیسفک (ممبئی)","ap_southeast_1":"ایشیا پیسفک (سنگاپور)","ap_southeast_2":"ایشیا پیسفک (سڈنی)","ca_central_1":"کینیڈا (مرکزی)","cn_north_1":"چین (بیجنگ)","cn_northwest_1":"چین (ننگزیا)","eu_central_1":"یورپی یونین (فرینکفرٹ)","eu_north_1":"یورپی یونین (اسٹاک ہوم)","eu_west_1":"یورپی یونین (آئر لینڈ)","eu_west_2":"یورپی یونین (لندن)","eu_west_3":"یورپی یونین (پیرس)","sa_east_1":"جنوبی امریکہ (ساؤ پالو)","us_east_1":"امریکی مشرق (شمالی ورجینیا)","us_east_2":"امریکی مشرق (اَوہائیو)","us_gov_east_1":"اے ڈبلیو ایس گَو کلاوڈ (امریکہ-مشرق)","us_gov_west_1":"اے ڈبلیو ایس گَو کلاوڈ (امریکہ-مغرب)","us_west_1":"امریکی مغرب (شمالی کیلی فورنیا)","us_west_2":"امریکی مغرب (اوریگن)"}},"edit":"اس ٹاپک کے عنوان اور زمرے میں ترمیم کریں","expand":"مزید کھولیں","not_implemented":"یہ خصوصیت ابھی تک لاگو نہیں کی گئی، معضرت!","no_value":"نہیں ","yes_value":"ہاں ","submit":"شائع","generic_error":"معذرت، ایک تکنیکی خرابی کا سامنا کرنا پڑا ہے۔","generic_error_with_reason":"ایک تکنیکی خرابی پیش آئی: %{error}","go_ahead":"آگے بڑھیے","sign_up":"سائن اپ","log_in":"لاگ ان","age":"عمر ","joined":"شمولیت اختیار کر لی","admin_title":"منتظم","show_more":"مزید ","show_help":"اختیارات","links":"لنکس","links_lowercase":{"one":"لنک","other":"لنکس"},"faq":"عمومی سوالات","guidelines":"ہدایات","privacy_policy":"نجی معلومات کی حفاظت پالیسی","privacy":"جی معلومات کی حفاظت","tos":"سروس کی شرائط","rules":"قوانین","conduct":"ضابطہ اخلاق","mobile_view":"موبائل وِیو","desktop_view":"ڈیسک ٹاپ وِیو","you":"آپ ","or":"یا ","now":"ابھی ","read_more":"مزید پڑھیں ","more":"مزید ","less":"کم ","never":"کبھی نہیں ","every_30_minutes":"ہر 30 منٹ","every_hour":"ہر گھنٹے","daily":"روزانہ ","weekly":"ہفتہ وار ","every_month":"ہر مہینے","every_six_months":"ہر چھ ماہ","max_of_count":"زیادہ سے زیادہ %{count}","alternation":"یا ","character_count":{"one":"%{count} حرف","other":"%{count} حروف"},"related_messages":{"title":"متعلقہ پیغامات","see_all":"@%{username} کی طرف سے \u003ca href=\"%{path}\"\u003eتمام پیغامات\u003c/a\u003e دیکھیں..."},"suggested_topics":{"title":"تجویز کیے گئے ٹاپک","pm_title":"تجویز کیے گئے پیغامات"},"about":{"simple_title":"بارے میں","title":"%{title} کے بارے میں","stats":"سائٹ کے اعدادوشمار","our_admins":"ہمارے ایڈمن","our_moderators":"ہمارے ماڈریٹرز","moderators":"ماڈریٹرز","stat":{"all_time":"تمام اوقات","last_7_days":"آخری 7","last_30_days":"آخری 30"},"like_count":"لائیکس","topic_count":"ٹاپک","post_count":"پوسٹ","user_count":"صارفین","active_user_count":"متحرک صارفین","contact":"ہم سے رابطہ کریں","contact_info":"اس سائٹ کے بارے میں کسی اہم مسئلہ یا فوری معاملہ کی صورت میں، براہ مہربانی %{contact_info} پر رابطہ کریں۔"},"bookmarked":{"title":"بُک مارک","clear_bookmarks":"بک مارکس ختم کریں","help":{"bookmark":"اِس ٹاپک کی پہلی پوسٹ بُک مارک کرنے کے لئے کلک کریں","unbookmark":"اِس ٹاپک کے تمام بُک مارک ہٹانے کے لئے کلک کریں"}},"bookmarks":{"not_bookmarked":"اِس پوسٹ کو بُک مارک کریں","remove":"بُک مارک ہٹائیں","confirm_clear":"کیا آپ کو یقین ہے کہ آپ اِس ٹاپک سے اپنے تمام بُک مارکس ہٹانا چاہتے ہیں؟","save":"محفوظ کریں","search":"تلاش کریں","reminders":{"later_today":"آج بعد میں","tomorrow":"کَل","next_week":"اگلے ہفتے","later_this_week":"اِس ہفتے بعد میں","next_month":"اگلے ماہ"}},"drafts":{"resume":"جاری رکھیں","remove":"خارج کریں","new_topic":"نئے ٹاپک کا ڈرافٹ","new_private_message":"نئے ذاتی پیغام کا ڈرافٹ","topic_reply":"جواب ڈرافٹ کریں","abandon":{"confirm":"آپ نے پہلے ہی اِس ٹاپک میں ایک اور ڈرافٹ کھولا ہوا ہے۔ کیا آپ واقعی اُس کو چھوڑنا چاہتے ہیں؟","yes_value":"جی ہاں، تَرک کریں","no_value":"نہیں، رکھیں"}},"topic_count_latest":{"one":"%{count} نیا یا اَپ ڈیٹ کردہ ٹاپک دیکھیں۔","other":"%{count} نئے یا اَپ ڈیٹ کردہ ٹاپک دیکھیں۔"},"topic_count_unread":{"one":"%{count} غیر پڑھا ٹاپک دیکھیں۔","other":"%{count} غیر پڑھے ٹاپک دیکھیں۔"},"topic_count_new":{"one":"%{count} نیا ٹاپک دیکھیں۔","other":"%{count} نئے ٹاپک دیکھیں۔"},"preview":"پیشگی دیکھنا","cancel":"منسوخ","save":"تبدیلیاں محفوظ کریں","saving":"محفوظ کی جا رہی ہیں...","saved":"محفوظ کر لیا گیا ہے!","upload":"اَپ لوڈ","uploading":"اَپ لوڈ کیا جا رہا ہے...","uploading_filename":"اَپ لوڈ کیا جا رہا ہے: %{filename}...","clipboard":"کلِپ بورڈ","uploaded":"اَپ لوڈ کیا جا چکا ہے!","pasting":"پیسٹ کیا جا رہا ہے...","enable":"فعال کریں","disable":"غیر فعال کریں","continue":"جاری رکھی","undo":"کالعدم کریں","revert":"رِیوَرٹ","failed":"عمل ناکام رہا","switch_to_anon":"گمنام موڈ میں داخل ہوں","switch_from_anon":"گمنام موڈ سے باہر نکلیں","banner":{"close":"اس بینر کو برخاست کریں۔","edit":"اس بینر میں ترمیم کریں \u003e\u003e"},"pwa":{"install_banner":"کیا آپ \u003ca href\u003eاِس ڈیوائس پر %{title} انسٹال کرنا چاہتے ہیں؟\u003c/a\u003e"},"choose_topic":{"none_found":"کوئی ٹاپک نہیں ملے۔"},"choose_message":{"none_found":"کوئی پیغامات نہیں ملے۔"},"review":{"order_by":"کے حساب سے آرڈر","in_reply_to":"کے جواب میں","explain":{"why":"وضاحت کریں کہ یہ شے آخر میں قطار میں کیوں داخل ہو گئی","title":"قابل تجدید اسکورنگ","formula":"فارمولا","subtotal":"ذیلی کل","total":"کُل","min_score_visibility":"نموداری کیلئے کم از کم اسکور","score_to_hide":"پوسٹ چھپانے کیلئے اسکور","take_action_bonus":{"name":"کارروائی کی","title":"جب سٹاف کا ایک ممبر کارروائی کرنے کا انتخاب کرتا ہے تو فلَیگ کو بَونَس دیا جاتا ہے۔"},"user_accuracy_bonus":{"name":"صارف کی درستگی","title":"جن صارفین کے فلَیگز کے ساتھ تاریخی طور پر اتفاق کیا گیا ہو انہیں بَونَس دیا جاتا ہے۔"},"trust_level_bonus":{"name":"ٹرسٹ لَیول","title":"اعلی ٹرسٹ لَیول صارفین کی طرف سے تخلیق کردہ قابل تجدید اشیاء کا اسکور زیادہ ہوتا ہے۔"},"type_bonus":{"name":"قِسم بَونَس","title":"سٹاف کی طرف سے کچھ قابل تجدید اقسام کو بَونَس تفویض کیا جاسکتا ہے تاکہ ان کو اعلیٰ ترجیح بنایا جاسکے۔"}},"claim_help":{"optional":"آپ اس چیز کو کََلیم کرسکتے ہیں کہ دوسروں کو اِسکا جائزہ لینے سے روکا جا سکے۔","required":"اشیاء کا جائزہ لینے سے پہلے آپ کا اُن کو کََلیم کرنا ضروری ہے۔","claimed_by_you":"آپ نے اِس چیز کو کََلیم کر لیا ہے اور اِس کا جائزہ لے سکتے ہیں۔","claimed_by_other":"اِس چیز کا صرف \u003cb\u003e%{username}\u003c/b\u003e جائزہ لے سکتا ہے۔"},"claim":{"title":"اِس ٹاپک کو کََلیم کریں"},"unclaim":{"help":"اس کََلیم کو ہٹائیں"},"awaiting_approval":"منظوری کا منتظر","delete":"حذف کریں","settings":{"saved":"محفوظ کر لیا گیا","save_changes":"تبدیلیاں محفوظ کریں","title":"سیٹِنگ","priorities":{"title":"قابل تجدید ترجیحات"}},"moderation_history":"ماڈرَیشن ہِسٹری","view_all":"سب دیکھیں","grouped_by_topic":"ٹاپک کے لحاظ سے گروپ کردہ","none":"جائزہ لینے کے لئے کوئی اشیاء نہیں ہیں۔","view_pending":"زیرِاِلتوَاء دیکھیں","topic_has_pending":{"one":"اِس ٹاپک کی \u003cb\u003e%{count}\u003c/b\u003e پوسٹ کی منظوری زیر التواء ہے","other":"اِس ٹاپک کی \u003cb\u003e%{count}\u003c/b\u003e پوسٹس کی منظوری زیر التواء ہے"},"title":"جائزہ لیں","topic":"ٹاپک:","filtered_topic":"آپ نے ایک ٹاپک میں قابل تجدید مواد کو فِلٹر کر دیا ہے۔","filtered_user":"صارف","show_all_topics":"تمام ٹاپکس دکھائیں","deleted_post":"(پوسٹ حذف کر دی گئی)","deleted_user":"(صارف حذف کر دیا گیا)","user":{"bio":"بائیو","username":"صارف کا نام","email":"اِی میل","name":"نام","fields":"فیلڈز"},"user_percentage":{"agreed":{"one":"%{count}٪ متفق","other":"%{count}٪ متفق"},"disagreed":{"one":"%{count}٪ عدم اتفاق","other":"%{count}٪ عدم اتفاق"},"ignored":{"one":"%{count}٪ نظر انداز","other":"%{count}٪ نظر انداز"}},"topics":{"topic":"ٹاپک","reviewable_count":"شمار","reported_by":"کی طرف سے رپورٹ کردہ","deleted":"[ٹاپک حذف کر دیا گیا]","original":"(حقیقی ٹاپک)","details":"تفصیلات","unique_users":{"one":"%{count} صارف","other":"%{count} صارفین"}},"replies":{"one":"%{count} جواب","other":"%{count} جوابات"},"edit":"ترمیم","save":"محفوظ کریں","cancel":"منسوخ","new_topic":"اِس شے کی منظوری سے ایک نیا ٹاپک بن جائے گا","filters":{"all_categories":"(تمام زُمرَہ جات)","type":{"title":"قِسم","all":"(تمام اقسام)"},"minimum_score":"کم از کم اسکور:","refresh":"رِیفریش","status":"سٹیٹس","category":"زمرہ","orders":{"score":"اسکور","created_at":"کو بنایا گیا","created_at_asc":"کو بنایا گیا (ریوَرس)"},"priority":{"title":"کم از کم ترجیح","low":"(کوئی بھی)","medium":"درمیانی","high":"زیادہ"}},"conversation":{"view_full":"مکمل گفتگو دیکھیں"},"scores":{"about":"یہ اسکور رپورٹ کرنے والے کے ٹرسٹ لَیول پر مبنی ہے، اُن کے سابق فلَیگز کی درستگی، اور رپورٹ کردہ چیز کی ترجیح پر۔","score":"اسکور","date":"تاریخ","type":"قِسم","status":"سٹیٹس","submitted_by":"کی طرف سے شائع کردہ","reviewed_by":"کی طرف سے جائزہ کردہ"},"statuses":{"pending":{"title":"زیرِاِلتوَاء"},"approved":{"title":"منظورشدہ"},"rejected":{"title":"مسترد کر دی گئی"},"ignored":{"title":"نظر انداز کردہ"},"deleted":{"title":"حذف کردہ"},"reviewed":{"title":"(تمام جائزہ کردہ)"},"all":{"title":"(تمام)"}},"types":{"reviewable_flagged_post":{"title":"فلَیگ کردہ پوسٹ","flagged_by":"کی طرف سے فلَیگ کردہ"},"reviewable_queued_topic":{"title":"قطار شدہ ٹاپک"},"reviewable_queued_post":{"title":"قطار شدہ پوسٹ"},"reviewable_user":{"title":"صارف"}},"approval":{"title":"پوسٹ کو منظوری کی ضرورت ہے","description":"ہمیں آپ کی نئی پوسٹ موصول ہو چکی ہے لیکن یہ ظاہر ہونے سے پہلے ایک منتظم سے منظور ہونا ضروری ہے۔ براہ مہربانی صبر کریں۔","pending_posts":{"one":"آپ کی \u003cstrong\u003e%{count}\u003c/strong\u003e پوسٹ زیرِاِلتوَاء ہے۔","other":"آپ کی \u003cstrong\u003e%{count}\u003c/strong\u003e پوسٹس زیرِاِلتوَاء ہیں۔"},"ok":"ٹھیک"}},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e نے \u003ca href='%{topicUrl}'\u003eٹاپک\u003c/a\u003e پوسٹ کیا","you_posted_topic":"\u003ca href='%{userUrl}'\u003eآپ\u003c/a\u003e نے \u003ca href='%{topicUrl}'\u003eٹاپک\u003c/a\u003e پوسٹ کیا","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e نے \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e کا جواب دیا","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eآپ\u003c/a\u003e نے \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e کا جواب دیا","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e نے \u003ca href='%{topicUrl}'\u003eٹاپک\u003c/a\u003e کا جواب دیا","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eآپ\u003c/a\u003e نے \u003ca href='%{topicUrl}'\u003eٹاپک\u003c/a\u003e کا جواب دیا","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e نے \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e کا ذکر کیا","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e نے \u003ca href='%{user2Url}'\u003eآپ\u003c/a\u003e کا ذکر کیا","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eآپ\u003c/a\u003e نے \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e کا ذکر کیا","posted_by_user":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e نے پوسٹ کیا","posted_by_you":"\u003ca href='%{userUrl}'\u003eآپ\u003c/a\u003e نے پوسٹ کیا","sent_by_user":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e نے بھیجا","sent_by_you":"\u003ca href='%{userUrl}'\u003eآپ\u003c/a\u003e نے بھیجا"},"directory":{"filter_name":"صارفین کے ناموں کے حساب سے فلٹر کریں","title":"صارفین","likes_given":"دیا گیا","likes_received":"موصول ہوا","topics_entered":"دیکھ لیا گیا","topics_entered_long":"دیکھ لیے گئے ٹاپک","time_read":"وقت جو پڑھنے میں لگا","topic_count":"ٹاپک","topic_count_long":"بنائے گئے ٹاپک","post_count":"جوابات","post_count_long":"پوسٹ کیے گئے جوابات","no_results":"کوئی نتائج نہیں پائے گئے۔","days_visited":"زائرین کی تعداد","days_visited_long":"زیارت کے دن","posts_read":"پڑھ لیا گیا","posts_read_long":"پڑھی گئیں پوسٹس","total_rows":{"one":"%{count} صارف","other":"%{count} صارفین"}},"group_histories":{"actions":{"change_group_setting":"گروپ کی سیٹِنگ تبدیل کریں","add_user_to_group":"صارف شامل کریں","remove_user_from_group":"صارف خارج کریں","make_user_group_owner":"مالک بنائیں","remove_user_as_group_owner":"مالک منسوخ کریں"}},"groups":{"member_added":"شامل کر دیا گیا","member_requested":"درخواست کیا گیا","requests":{"title":"درخواستیں","reason":"وجہ","accept":"منظور","accepted":"منظور","deny":"انکار","denied":"انکار کر دیا","undone":"درخواست کالعدم","handle":"رکنیت کی درخواست سے نمٹیں"},"manage":{"title":"مَینَیج","name":"نام","full_name":"پورا نام","add_members":"ممبران شامل کریں","delete_member_confirm":"'%{username}' کو '%{group}' گروپ سے ہٹائیں؟","profile":{"title":"پروفائل"},"interaction":{"title":"تعامل","posting":"پوسٹ کرنا","notification":"اطلاع"},"email":{"title":"اِی میل","credentials":{"username":"صارف کا نام","password":"پاسورڈ"}},"membership":{"title":"ممبرشپ","access":"رسائی"},"logs":{"title":"لاگز","when":"کب","action":"عمل","acting_user":"عمل کرنے والا صارف","target_user":"ہدف صارف","subject":"موضوع","details":"تفصیلات","from":"سے","to":"کیلئے"}},"public_admission":"صارفین کو آزادی سے گروپ میں شمولیت اختیار کرنے کی اجازت دیں (گروپ کا عوامی طور پر ظاہر ہونا لاذمی ہو)","public_exit":"صارفین کو آزادانہ طور پر گروپ چھوڑنے کی اجازت دیں","empty":{"posts":"اس گروپ کے ارکان کی طرف سے کوئی پوسٹس نہیں ہیں۔","members":"اس گروپ میں کوئی ارکان ہیں۔","requests":"اس گروپ کے لئے فی الحال کوئی رکنیت کی درخواستیں نہیں ہیں۔","mentions":"اس گروپ کے کوئی تذکرے موجود نہیں ہیں۔","messages":"اس گروپ کے لئے فی الحال کوئی پیغامات نہیں ہیں۔","topics":"اِس گروپ کے ارکان کی طرف سے کوئی ٹاپک نہیں ہیں۔","logs":"اس گروپ کے لئے کوئی لاگز موجود نہیں ہیں۔"},"add":"شامل کریں","join":"شمولیت اختیار کریں","leave":"چھوڑ دیں","request":"درخواست","message":"پیغام","membership_request_template":"رکنیت کی درخواست بھیجنے کے دوران صارفین کیلئے ظاہر کیے جانے والی پہلے سے تیار کردہ مثال","membership_request":{"submit":"درخواست بھیجیں","title":"@%{group_name} میں شمولیت کی درخواست","reason":"گروپ مالکان کو بتائیے کہ آپ اس گروپ میں شامل ہونے کے کیوں مستحق ہیں"},"membership":"ممبرشپ ","name":"نام","group_name":"گروپ نام","user_count":"صارفین","bio":"گروپ کے بارے میں","selector_placeholder":"صارف نام درج کریں","owner":"مالِک","index":{"title":"گروپس","all":"تمام گروپس","empty":"کوئی نظر آنے والے گروپ موجود نہیں ہیں۔","filter":"گروپ قِسم کے حساب سے فِلٹر کریں","owner_groups":"میری ملکیت والے گروپس","close_groups":"بند گروپس","automatic_groups":"خودکار گروپس","automatic":"خود کار طریقے سے","closed":"بند","public":"عوامی","private":"ذاتی","public_groups":"عوامی گروپس","automatic_group":"خودکار گروپ","close_group":"گروپ بند کریں","my_groups":"میرے گروپس","group_type":"گروپ قِسم","is_group_user":"ممبر","is_group_owner":"مالِک"},"title":{"one":"گروپ","other":"گروپس"},"activity":"سرگرمی","members":{"title":"ممبران","filter_placeholder_admin":"صارف نام یا ای میل","filter_placeholder":"صارف نام","remove_member":"ممبر ہٹائیں","remove_member_description":"اِس گروپ سے \u003cb\u003e%{username}\u003c/b\u003e کو ہٹایں","make_owner":"مالک بنائیں","make_owner_description":"اِس گروپ پر \u003cb\u003e%{username}\u003c/b\u003e کو مالک بنائیں","remove_owner":"مالک کے طور پر ہٹائیں","remove_owner_description":"اِس گروپ پر سے \u003cb\u003e%{username}\u003c/b\u003e کو مالک کے طور پر ہٹائیں","owner":"مالِک","forbidden":"آپ کو ممبران دیکھنے کی اجازت نہیں ہے۔"},"topics":"ٹاپک","posts":"پوسٹ","mentions":"ذکر","messages":"پیغامات","notification_level":"گروپ پیغامات کیلئے اطلاعات کا پہلے سے طے شدہ لَیوَل","alias_levels":{"mentionable":"کون اِس گروپ کو @زکر کرسکتا ہے؟","messageable":"کون اِس گروپ کو پیغام بھیج سکتا ہے؟","nobody":"کوئی بھی نہیں","only_admins":"صرف منتظمین","mods_and_admins":"صرف ثالث اور منتظمین","members_mods_and_admins":"صرف گروپ کے اراکین، ثالث اور منتظمین","owners_mods_and_admins":"صرف گروپ مالکان، ثالث اور منتظمین","everyone":"ہر کوئی"},"notifications":{"watching":{"title":"نظر رکھی ہوئی ہے","description":"آپ کو ہر پیغام میں ہونے والی ہر نئی پوسٹ کے بارے میں مطلع کیا جائے گا، اور نئے جوابات کی گنتی دیکھائی جائے گی۔"},"watching_first_post":{"title":"پہلی پوسٹ پر نظر رکھی ہوئی ہے","description":"آپ کو اِس گروپ میں نئے پیغامات کے بارے میں مطلع کیا جائے گا لیکن پیغامات کے جوابات پر نہیں۔"},"tracking":{"title":"ٹریک کیا جا رہا","description":"اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا، اور نئے جوابات کی گنتی دیکھائی جائے گی۔"},"regular":{"title":"عمومی","description":"اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔"},"muted":{"title":"خاموش کِیا ہوا","description":"آپ کو اِس گروپ کے پیغامات کے بارے میں کسی بھی چیز پر مطلع نہیں کیا جائے گا۔"}},"flair_url":"اوتار فلیر کی تصویر","flair_bg_color":"اوتار فلیر کے پَسِّ منظر کا رنگ","flair_bg_color_placeholder":"(اختیاری) ہیکس رنگ نمبر","flair_color":"اوتار فلیر کا رنگ","flair_color_placeholder":"(اختیاری) ہیکس رنگ نمبر","flair_preview_icon":"آئکن کا مشاہدہ کریں","flair_preview_image":"تصویر کا مشاہدہ کریں"},"user_action_groups":{"1":"لائیکس دیے گئے","2":"لائیکس موصول ہوے","3":"بُکمارکس","4":"ٹاپکس","5":"جوابات","6":"جوابات","7":"تذکرے","9":"اقتباسات","11":"ترامیم","12":"بھیجی گئی اشیاء","13":"اِن باکس","14":"زیرِاِلتوَاء","15":"ڈرافٹس"},"categories":{"all":"تمام زُمرَہ جات","all_subcategories":"تمام","no_subcategory":"کوئی نہیں","category":"زمرہ","category_list":"زمرہ جات کی فہرست ظاہر کریں","reorder":{"title":"زمرہ جات کو دوبارہ ترتیب دیں","title_long":"زمرہ جات کی فہرست کو تنظیم نو کریں","save":"محفوظ کردینے کا حکم","apply_all":"لاگو کریں","position":"پوزیشن"},"posts":"پوسٹ","topics":"ٹاپک","latest":"تازہ ترین","toggle_ordering":"ترتیب کاری کا کنٹرول ٹاگل کریں","subcategories":"ذیلی زمرے","topic_sentence":{"one":"%{count} ٹاپک","other":"%{count} ٹاپک"},"topic_stat_sentence_week":{"one":"%{count} نیا ٹاپک گزشتہ ہفتے میں۔","other":"%{count} نئے ٹاپک گزشتہ ہفتے میں۔"},"topic_stat_sentence_month":{"one":"%{count} نیا ٹاپک گزشتہ ماہ میں۔","other":"%{count} نئے ٹاپک گزشتہ ماہ میں۔"}},"ip_lookup":{"title":"IP ایڈریس کا سراغ","hostname":"ہوسٹ کا نام","location":"محل وقوع","location_not_found":"(نامعلوم)","organisation":"ادارہ","phone":"فون","other_accounts":"اسی IP ایڈریس والے دوسرے اکاؤنٹس:","delete_other_accounts":"%{count} حذف کریں","username":"صارف کا نام","trust_level":"TL","read_time":"پڑھنے کیلئے اِستعمال ہونے والا وقت","topics_entered":" داخل ہوئے ٹاپک","post_count":"# پوسٹ","confirm_delete_other_accounts":"کیا آپ واقعی یہ اکاؤنٹس حذف کرنا چاہتے ہیں؟","powered_by":"\u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003eکا استعمال کرتے ہوئے ","copied":"کاپی کر لیا"},"user_fields":{"none":"(ایک آپشن منتخب کریں)"},"user":{"said":"%{username}:","profile":"پروفائل","mute":"خاموش کردیں","edit":"ترجیحات میں ترمیم کردیں","download_archive":{"button_text":"تمام ڈاؤن لوڈ کریں","confirm":"کیا آپ واقعی اپنی پوسٹس ڈاؤن لوڈ کرنا چاہتے ہیں؟","success":"ڈاؤن لوڈ کا آغاز کر دیا گیا ہے، عمل مکمل ہونے پر آپ کو پیغام کے ذریعے مطلع کر دیا جائے گا۔","rate_limit_error":"پوسٹس فی دن ایک بار ہی ڈاؤن لوڈ کی جا سکتی ہیں، براہ مہربانی کل دوبارہ کوشش کریں۔"},"new_private_message":"نیا پیغام","private_message":"پیغام","private_messages":"پیغامات","user_notifications":{"filters":{"all":"تمام","read":"پڑھ لیا گیا","unread":"بغیر پڑھے"},"ignore_duration_username":"صارف کا نام","ignore_duration_when":"دورانیہ:","ignore_duration_save":"نظر انداز کریں","ignore_duration_note":"براہ کرم نوٹ کریں کہ نظر انداز کا دورانیہ ختم ہونے کے بعد تمام نظرانداز خود کار طریقے سے ہٹا دیے جاتے ہیں۔","ignore_duration_time_frame_required":"براہ کرم ایک ٹائم فریم منتخب کریں","ignore_no_users":"آپ کے پاس کوئی نظر انداز صارفین موجود نہیں۔","ignore_option":"نظر انداز کردہ","ignore_option_title":"آپ کو اِس صارف سے متعلق اطلاعات نہیں ملیں گی اور اِن کے تمام ٹاپک اور جوابات چھپا دیے جائیں گے۔","add_ignored_user":"اضافہ کریں...","mute_option":"خاموش کِیا ہوا","mute_option_title":"آپ کو اِس صارف سے متعلق اطلاعات نہیں ملیں گی۔","normal_option":"عمومی","normal_option_title":" آپ کو مطلع کر دیا جائے گا اگر یہ صارف آپ کو جواب دیتا ہے، آپ کا اقتباس کرتا ہے، یا آپ کا ذکر کرتا ہے۔"},"activity_stream":"سرگرمی","preferences":"ترجیحات","feature_topic_on_profile":{"save":"محفوظ کریں","clear":{"title":"صاف کریں"}},"profile_hidden":"اِس صارف کی پبلک پروفائل پوشیدہ ہے۔","expand_profile":"مزید کھولیں","collapse_profile":"بند کریں","bookmarks":"بُکمارکس","bio":"سائٹ کے بارے میں","timezone":"ٹائم زون","invited_by":"کی طرف سے مدعو کیا گیا:","trust_level":"ٹرسٹ لَیول","notifications":"اطلاعات","statistics":"اعدادوشمار","desktop_notifications":{"label":"لائیو اطلاعات","not_supported":"نوٹیفیکیشن اس براؤزر کے لیئے غیر معاون ہیں۔ معذرت۔","perm_default":"اطلاعات چالو کریں","perm_denied_btn":"اِجازت نہیں دی گئی","perm_denied_expl":"آپ نے اطلاعات کے لئے اجازت دینے سے انکار کر دیا۔ اپنے براؤزر کی سیٹِنگ سے اطلاعات کی اجازت دیں۔","disable":"اطلاعات غیر فعال کریں","enable":"اطلاعات فعال کریں","consent_prompt":"جب لوگ آپ کی پوسٹس کا جواب دیں تو کیا آپ لائیو اطلاعات چاہتے ہیں؟"},"dismiss":"بر خاست کریں","dismiss_notifications":"سب بر خاست کریں","dismiss_notifications_tooltip":"تمام بغیر پڑھی اطلاعات کو پڑھی جا چکی اطلاعات کے طور پر مارک کریں","first_notification":"آپ کی پہلی نوٹیفکیشن! شروع کرنے کے لئے اسے منتخب کریں۔","dynamic_favicon":"براؤزر آئکن پر پر شمار دکھائیں","theme_default_on_all_devices":"میری تمام ڈیوائسز پر اِس کو ڈیفالٹ تھیم بنائیں","text_size_default_on_all_devices":"میری تمام ڈیوائسز پر اِس کو ڈیفالٹ ٹیکسٹ سائز بنائیں","allow_private_messages":"دوسرے صارفین کو مجھے ذاتی پیغامات بھیجنے کی اجازت دیں","external_links_in_new_tab":"تمام بیرونی ویب سائٹ کے لنکس ایک نئے ٹیب میں کھولیں","enable_quoting":"روشنی ڈالے گئے ٹَیکسٹ کے لئے اقتباسی جواب فعال کریں","enable_defer":"ٹاپکس کو بغیر پڑھا نشان زد کرنے کیلئے ملتوی فعال کریں","change":"بدلیں","moderator":"%{user} ایک ماڈریٹر ہے","admin":"%{user} ایک ایڈمِن ہے","moderator_tooltip":"یہ صارف ایک ماڈریٹر ہے","admin_tooltip":"یہ صارف ایک ایڈمِن ہے","silenced_tooltip":"یہ صارف خاموش کیا ہوا ہے","suspended_notice":"یہ صارف %{date} تک معطل ہے۔","suspended_permanently":"یہ صارف معطل ہے۔","suspended_reason":"وجہ:","email_activity_summary":"سرگرمی کا خلاصہ","mailing_list_mode":{"label":"میلنگ لسٹ کے موڈ","enabled":"میلنگ لسٹ کے موڈ فعال کریں","instructions":"یہ سیٹِنگ سرگرمی کے خلاصے کی جگہ لے لیتی ہے۔\u003cbr /\u003e\nخاموش کردہ ٹاپک اور زمرہ جات اِن اِیمیلز میں شامل نہیں ہیں۔\n","individual":"ہر نئی پوسٹ پر ایک ای میل بھیجیں","individual_no_echo":"میری اپنی کے سوا، ہر نئی پوسٹ پر ایک ای میل بھیجیں","many_per_day":"ہر نئی پوسٹ پر ایک ای میل بھیجیں (تقریباً %{dailyEmailEstimate} فی دن)","few_per_day":"ہر نئی پوسٹ پر ایک ای میل بھیجیں (تقریبا 2 فی دن)","warning":"میلنگ لسٹ موڈ فعال ہے۔ ایمَیل نوٹیفیکیشن کی ترتیبات منسوخ ہوگئی ہیں۔"},"tag_settings":"ٹیگز","watched_tags":"دیکھا گیا","watched_tags_instructions":"آپ خود کار طریقے سے اِن ٹیگ والے ٹاپکس کو دیکھیں گے۔ تمام نئی پوسٹ اور ٹاپکس کے بارے میں مطلع کیا جائے گا، اور نئی پوسٹس کی گنتی بھی ٹاپک کے ساتھ دکھائی جائے گی۔","tracked_tags":"ٹریک کیا ہوا","tracked_tags_instructions":"آپ خود کار طریقے سے اِن ٹیگ والے ٹاپکس کو ٹریک کریں گے۔ نئی پوسٹس کی گنتی ٹاپک کے ساتھ دکھائی جائے گی۔","muted_tags":"خاموش کِیا ہوا","muted_tags_instructions":"آپ کو اِن ٹیگ والے نئے ٹاپکس کی کسی بھی چیز کے بارے میں مطلع نہیں کیا جائے گا، اور یہ تازہ ترین میں بھی نظر نہیں آئیں گے۔","watched_categories":"دیکھا گیا","watched_categories_instructions":"آپ خود کار طریقے سے اِن زمرہ جات میں موجود تمام ٹاپکس کو دیکھیں گے۔ تمام نئی پوسٹ اور ٹاپکس کے بارے میں مطلع کیا جائے گا، اور نئی پوسٹس کی گنتی بھی ٹاپک کے ساتھ دکھائی جائے گی۔","tracked_categories":"ٹریک کیا ہوا","tracked_categories_instructions":"آپ خود کار طریقے سے اِن زمرہ جات میں موجود تمام ٹاپکس کو ٹریک کریں گے۔ نئی پوسٹس کی گنتی ٹاپک کے ساتھ دکھائی جائے گی۔","watched_first_post_categories":"پہلی پوسٹ پر نظر رکھی ہوئی ہے","watched_first_post_categories_instructions":"آپ کو اِن زمرہ جات میں ہر نئے ٹاپک کی پہلی پوسٹ کے بارے میں مطلع کیا جائے گا۔","watched_first_post_tags":"پہلی پوسٹ پر نظر رکھی ہوئی ہے","watched_first_post_tags_instructions":"آپ کو اِن ٹیگ والے ہر نئے ٹاپک کی پہلی پوسٹ کے بارے میں مطلع کیا جائے گا۔","muted_categories":"خاموش کِیا ہوا","muted_categories_instructions":"آپ کو اِن زمرہ جات میں موجود نئے ٹاپکس کی کسی بھی چیز کے بارے میں مطلع نہیں کیا جائے گا، اور یہ زمرہ جات یا تازہ ترین صفحات پر نظر نہیں آئیں گے۔","muted_categories_instructions_dont_hide":"آپ کو اِن زمرہ جات میں نئے ٹاپک کی کسی بھی چیز کے بارے میں مطلع نہیں کیا جائے گا۔","no_category_access":"ایک ماڈریٹر کے طور پر آپ کو زمرہ پر محدود رسائی حاصل ہے، محفوظ کرنا غیر فعال ہے۔","delete_account":"میرا اکاؤنٹ حذف کریں","delete_account_confirm":"کیا آپ واقعی مستقل طور پر اپنا اکاؤنٹ حذف کرنا چاہتے ہیں؟ اس عمل کو کالعدم نہیں کیا جا سکتا!","deleted_yourself":"آپ کے اکاؤنٹ کو کامیابی سے حزف کر دیا گیا ہے۔","delete_yourself_not_allowed":"اگر آپ چاہتے ہیں کہ آپ کا اکاؤنٹ حذف کر دیا جائے تو براہ کرم سٹاف کے کسی رکن سے رابطہ کریں۔","unread_message_count":"پیغامات","admin_delete":"حذف کریں","users":"صارفین","muted_users":"خاموش کِیا ہوا","ignored_users":"نظر انداز کردہ","tracked_topics_link":"دکھائیں","automatically_unpin_topics":"جب میں سب سے نیچے تک پہنچوں تو خود کار طریقے سے ٹاپک سے پن ہٹایں۔","apps":"ایپس","revoke_access":"رسائی کالعدم کریں","undo_revoke_access":"رسائی کالعدم کو منسوخ کریں","api_approved":"منظورشدہ","api_last_used_at":"آخری بار استعمال کیا:","theme":"تھیم","home":"ڈیفالٹ ہوم پیج","staged":"سٹَیجڈ","staff_counters":{"flags_given":"مدد گار فلَیگ","flagged_posts":"فلَیگ کی گئی پوسٹس","deleted_posts":"حذف کی گئی پوسٹس","suspensions":"معطلیاں","warnings_received":"تنبیہات"},"messages":{"all":"تمام","inbox":"اِن باکس","sent":"بھیجا جا چکا","archive":"آر کائیو","groups":"میرے گروپ","bulk_select":"پیغامات منتخب کریں","move_to_inbox":"اِنباکس میں منتقل کریں","move_to_archive":"آر کائیو","failed_to_move":"منتخب شدہ پیغامات کو منتقل کرنے میں ناکامی (شاید آپ کے نیٹ ورک بند ہے)","select_all":"تمام منتخب کریں","tags":"ٹیگز"},"preferences_nav":{"account":"اکاؤنٹ","profile":"پروفائل","emails":"اِی مَیل","notifications":"اطلاعات","categories":"زُمرَہ جات","users":"صارفین","tags":"ٹیگز","interface":"انٹرفیس","apps":"اَیپس"},"change_password":{"success":"(اِی میل بھیج دی گئ)","in_progress":"(اِی میل بھیجی جا رہی ہے)","error":"(خرابی)","action":" پاس ورڈ دوبارہ سیٹ کرنے کی اِی میل بھیجیں","set_password":"پاس ورڈ رکھیں","choose_new":"نیا پاس ورڈ منتخب کریں","choose":"پاس ورڈ منتخب کریں"},"second_factor_backup":{"regenerate":"دوبارہ تخلیق کریں","disable":"غیر فعال کریں","enable":"فعال کریں","enable_long":"بیک اپ کوڈ فعال کریں","copy_to_clipboard":"کلِپ بورڈ میں کاپی کریں","copy_to_clipboard_error":"کلِپ بورڈ میں ڈیٹا کاپی کرنے پر خرابی کا سامنا کر نا پرا","copied_to_clipboard":"کلِپ بورڈ میں کاپی کر لیا گیا","codes":{"title":"بیک اپ کوڈز تیار","description":"اِن بیک اپ کوڈز میں سے ہر ایک کو صرف ایک بار استعمال کیا جاسکتا ہے۔ انہیں کہیں محفوظ لیکن قابل رسائی رکھیں۔"}},"second_factor":{"confirm_password_description":"جاری رکھنے کیلئے براہ کرم اپنے پاسوَرڈ کی تصدیق کریں","name":"نام","label":"کَوڈ","rate_limit":"دوبارہ توثیقی کوڈ کی کوشش کرنے سے پہلے براہ کرم تھوڑا انتظار کریں۔","enable_description":"اِس QR کَوڈ کو کسی قابل اَیپ (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eاینڈرائڈ\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) میں اسکَین کریں اور اپنا توثیقی کَوڈ جمع کریں۔\n","disable_description":"براہ مہربانی اپنی اَیپ میں سے توثیقی کَوڈ درج کریں","show_key_description":"دستی طور پر درج کریں","short_description":"ایک بار استعمال والے سیکورٹی کوڈز کے ساتھ اپنے اکاؤنٹ کی حفاظت کریں۔\n","disable":"غیر فعال کریں","save":"محفوظ کریں","edit":"ترمیم","totp":{"title":"ٹوکن کی بنیاد پر تصديق کنندہ","default_name":"میرا تصديق کنندہ"},"security_key":{"register":"رجسٹر","save":"محفوظ کریں"}},"change_about":{"title":"\"میرے بارے میں\" تبدیل کریں","error":"اِس چیز کو تبدیل کرنے میں ایک خرابی کا سامنا کرنا پڑا۔"},"change_username":{"title":"صارف کا نام تبدیل کریں","confirm":"کیا آپ کو بالکل یقین ہے کہ آپ اپنا صارف نام تبدیل کرنا چاہتے ہیں؟","taken":"معذرت، یِہ صارف نام پہلے سے لیا جاچکا ہے۔","invalid":"یہ صارف نام غلط ہے۔ اِس میں صرف ہندسوں اور حروف کو شامل کیا جا سکتا ہے"},"add_email":{"add":"شامل کریں"},"change_email":{"title":"اِی میل تبدیل کریں","taken":"معذرت، یہ اِی میل دستیاب نہیں ہے۔","error":"آپ کا اِی میل تبدیل کرنے میں ایک خرابی کا سامنا کرنا پڑا۔ شاید یہ ایڈریس پہلے سے استعمال میں ہے؟","success":"ہم نے اِس ایڈریس پر ایک اِی میل بھیج دی ہے۔ براہ کرم، تصدیق کی ہدایات پر عمل کریں۔","success_staff":"ہم نے آپ کے موجودہ ایڈریس پر ایک اِی میل بھیج دی ہے۔ براہ کرم، تصدیق کی ہدایات پر عمل کریں۔"},"change_avatar":{"title":"اپنے پروفائل کی تصویر تبدیل کریں","letter_based":"سسٹم تفویض کردہ پروفائل تصویر","uploaded_avatar":"اپنی مرضی کی تصویر","uploaded_avatar_empty":"اپنی مرضی کی تصویر شامل کریں","upload_title":"آپنی تصویر اَپ لوڈ کریں","image_is_not_a_square":"انتباہ: ہم نے آپ کی تصویر کو کراپ کیا ہے؛ چوڑائی اور اونچائی برابر نہیں تھے۔"},"change_card_background":{"title":"صارف کارڈ کا پسِ منظر","instructions":"پسِ منظر کی تصاویر مرکوز ہوں گی اور اُن کی 590 پِکسل کی پہلے سے طے شدہ چوڑائی ہو گی۔"},"email":{"title":"اِی میل","primary":"بنیادی ایمیل","secondary":"ثانوی ایمیلز","primary_label":"بنیادی","update_email":"اِی میل تبدیل کریں","no_secondary":"کوئی ثانوی ایمیلز نہیں","instructions":"کبھی بھی عوام کو دکھایا نہیں گیا۔","ok":"ہم تصدیق کے لئے آپ کو اِی میل کریں گے","invalid":"براہ کرم، ایک قابلِ قبول ایِ میل ایڈریس درج کریں","authenticated":"آپ کے اِی میل کی توثیق کر دی گئی ہے %{provider}","frequency_immediately":"جس بارے میں ہم آپ کو اِی میل کر رہے ہیں، اگر آپ نے نہیں پڑھی ہوئی تو ہم فوری طور پر آپ کو اِی میل کریں گے۔","frequency":{"one":"ہم آپ کو اِی میل کریں گے صرف اُس صور میں کہ ہم نے آپ کو گزشتہ ایک منٹ میں نہ دیکھا ہو۔","other":"ہم آپ کو اِی میل کریں گے صرف اُس صور میں کہ ہم نے آپ کو گزشتہ %{count} منٹ میں نہ دیکھا ہو۔"}},"associated_accounts":{"title":"ایسوسی ایٹ اکاؤنٹس","connect":"کنَیکٹ","revoke":"منسوخ کریں","cancel":"منسوخ","not_connected":"(غیر کنَیکٹ شدہ)","confirm_modal_title":"%{provider} اکاؤنٹ کنیکٹ کریں","confirm_description":{"account_specific":"آپ کا %{provider} اکاؤنٹ '%{account_description}' تصدیق کیلئے استعمال کیا جائے گا۔","generic":"آپ کا %{provider} اکاؤنٹ تصدیق کیلئے استعمال کیا جائے گا۔"}},"name":{"title":"نام","instructions":"آپ کا پورا نام (اختیاری)","instructions_required":"آپ کا پورا نام","too_short":"آپ کا نام بہت چھوٹا ہے","ok":"آپ کا نام صحیح لگ رہا ہے"},"username":{"title":"صارف کا نام","instructions":"منفرد، کوئی خالی جگہ نہیں، مختصر","short_instructions":"لوگ آپ کا زکر @%{username} کے طور پر کر سکتے ہیں","available":"آپ کا صارف نام دستیاب ہے","not_available":"دستیاب نہیں۔ اِستعمال کریں %{suggestion}؟","not_available_no_suggestion":"دستیاب نہیں","too_short":"آپ کا صارف نام بہت چھوٹا ہے","too_long":"آپ کا صارف نام بہت طویل ہے","checking":"صارف نام کی دستیابی کی جانچ ہو رہی...","prefilled":"اِی میل اِس رجسٹرڈ صارف نام کے ساتھ میچ کرتا ہے"},"locale":{"title":"انٹرفیس کی زبان","instructions":"صارف کیلئے انٹرفیس کی زبان۔ یہ اُس وقت تبدیل ہو گی جب آپ وِیب سائٹ رِیفریش کریں ۔","default":"(ڈِیفالٹ)","any":"کوئی بھی"},"password_confirmation":{"title":"پاس ورڈ دوبارہ"},"auth_tokens":{"title":"حال ہی میں استعمال شدہ ڈِیوائیسِز","details":"تفصیلات","log_out_all":"تمام کو لاگ آُوٹ کریں","not_you":"آپ نہیں؟","show_all":"تمام دکھائیں (%{count})","show_few":"کم دکھائیں","was_this_you":"کیا یہ آپ تھے؟","was_this_you_description":"اگر یہ آپ نہیں تھے، تو ہم آپ کو اپنا پاسورڈ تبدیل کرنے اور ہر جگہ سے لاگ آُوٹ کرنے کی تجویز کرتے ہیں۔","browser_and_device":"%{device} پر %{browser}","secure_account":"میرا اکاؤنٹ محفوظ کریں","latest_post":"آپ نے آخری دفعہ پوسٹ کیا..."},"last_posted":"آخری پوسٹ","last_emailed":"جِسے آخری دفع اِی میل کی گئی","last_seen":"دیکھا ہوا","created":"شمولیت اختیار کی","log_out":"لاگ آُوٹ","location":"محل وقوع","website":"وِیب سائٹ","email_settings":"اِی میل","hide_profile_and_presence":"میری عوامی پروفائل اور موجودگی کی خصوصیات چھپائیں","enable_physical_keyboard":"آئی پَیڈ پر اصل کیبورڈ کی اجازت کو فعال کریں","text_size":{"title":"ٹیکسٹ سائز","smaller":"چهوٹا","normal":"عمومی","larger":"بڑا","largest":"سب سے بڑا"},"title_count_mode":{"title":"پسِ منظر صفحہ کا عنوان، جس کا شمار دکھاتا ہے:","notifications":"نئی اطلاعات","contextual":"نیا صفحہ کا مواد"},"like_notification_frequency":{"title":"جب لائک کیا جائے تو مطلع کریں","always":"ہمیشہ","first_time_and_daily":"پہلی بار پوسٹ کو لائک کیا جائے اور روزانہ","first_time":"پہلی بار پوسٹ کو لائک کیا جائے","never":"کبھی نہیں "},"email_previous_replies":{"title":"اِی میل کے نچلے حصے میں پچھلے جوابات شامل کریں","unless_emailed":"اگر ماضی میں بھیجا گیا ہو، تو نہیں","always":"ہمیشہ","never":"کبھی نہیں "},"email_digests":{"title":"جب میں یہاں کا دورا نہ کروں، مجھے مقبول ٹاپک اور جوابات کا ایک اِی میل خلاصہ بھیجیں","every_30_minutes":"ہر 30 منٹ","every_hour":"گھنٹہ وار","daily":"روزانہ ","weekly":"ہفتہ وار","every_month":"ہر مہینے","every_six_months":"ہر چھ ماہ"},"email_level":{"title":"مجھے ایک اِی میل بھیجیں اگر کوئی میرے پوسٹ کا اقتباس کرے، میری پوسٹ کا جواب دے، میرے @صارفنام کا تذکرا کرے، یا پجھے کسی ٹاپک میں مدعو کرے","always":"ہمیشہ","only_when_away":"صرف جب غیر حاضر","never":"کبھی نہیں "},"email_messages_level":"اگر کوئی مجھے پیغام بھیجیے تو مجھے ایک اِی میل بھیجیں","include_tl0_in_digests":"اِی میل خلاصہ میں نئے صارفین سے مواد شامل کریں","email_in_reply_to":"ای میل میں پوسٹ کے جواب کا اقتباس شامل کریں","other_settings":"دیگر","categories_settings":"زُمرَہ جات","new_topic_duration":{"label":"ٹاپک کو نیا سمجھا جائے، جب","not_viewed":"میں نے اُنہیں ابھی تک نہیں دیکھا","last_here":"میرے آخری دفع یہاں آنے کے بعد بنائے گئے","after_1_day":"پچھلے ایک دن میں بنائے گئے","after_2_days":"پچھلے 2 دنوں میں بنائے گئے","after_1_week":"پچھلے ایک ہفتے میں بنائے گئے","after_2_weeks":"پچھلے 2 ہفتوں میں بنائے گئے"},"auto_track_topics":"جس ٹاپک میں مَیں داخل ہوں اُسے خود کار طریقے سے ٹریک کریں","auto_track_options":{"never":"کبھی نہیں ","immediately":"ابھی اِسی وقت","after_30_seconds":"30 سیکنڈ کے بعد","after_1_minute":"1 منٹ کے بعد","after_2_minutes":"2 منٹ کے بعد","after_3_minutes":"3 منٹ کے بعد","after_4_minutes":"4 منٹ کے بعد","after_5_minutes":"5 منٹ کے بعد","after_10_minutes":"10 منٹ کے بعد"},"notification_level_when_replying":"جب میں ایک ٹاپک میں پوسٹ کروں، اُس ٹاپک کو مقرر کریں","invited":{"title":"دعوتیں","pending_tab":"زیرِاِلتوَاء","pending_tab_with_count":"زیرِاِلتوَاء (%{count})","redeemed_tab":"فائدہ اٹھا لیا گیا","redeemed_tab_with_count":"فائدہ اٹھا لیا گیا (%{count})","reinvited":"دعوت دوبارہ بھیج دی گئی","search":"دعوتیں تلاش کرنے کے لئے ٹائپ کریں...","user":"مدعو کیا گیا صارف","none":"ظاہر کرنے کے لئے کوئی دعوتیں نہیں ہیں۔","truncated":{"one":"پہلی دعوت دکھائی جا رہی ہیں۔","other":"پہلی %{count} دعوتیں دکھائی جا رہی ہیں۔"},"redeemed":"دعوتیں جِن سے فائدہ اٹھا لیا گیا ہے","redeemed_at":"فائدہ اٹھا لیا گیا","pending":"زیرِاِلتوَاء دعوتیں","topics_entered":" دیکھ لیے گئے ٹاپک","posts_read_count":"پڑھی گئیں پوسٹس","expired":"اِس دعوت کی میعاد ختم ہو چکی ہے۔","reinvite_all_confirm":"کیا آپ واقعی تمام دعوتیں دوبارہ بھیجنا چاہتے ہیں؟","time_read":"پڑھنے کیلئے اِستعمال ہونے والا وقت","days_visited":"دورہ کیے گئے دن","account_age_days":"دنوں میں اکاؤنٹ کی عمر","valid_for":"دعوت لنک صرف اِس اِی میل اِیڈریس کے لئے درست ہے:%{email}","invite_link":{"success":"دعوت لنک کامیابی سے بن گیا!"},"bulk_invite":{"error":"معذرت، فائل CSV فارمیٹ میں ہونا ضروری ہے۔"}},"password":{"title":"پاسورڈ","too_short":"آپ کا پاسورڈ بہت چھوٹا ہے","common":"وہ پاسورڈ کافی عام ہے","same_as_username":"آپ کا پاسورڈ وہی ہے جو آپ کا صارف نام ہے۔","same_as_email":"آپ کا پاسورڈ وہی ہے جو آپ کا اِی میل ہے۔","ok":"آپ کا پاسورڈ صحیح لگ رہا ہے","instructions":"کم از کم %{count} حروف"},"summary":{"title":"خلاصہ","stats":"اعدادوشمار","time_read":"پڑھنے کیلئے اِستعمال ہونے والا وقت","recent_time_read":"پڑھنے کیلئے اِستعمال ہونے والا حالیہ وقت","topic_count":{"one":"بنایا گیا ٹاپک","other":"بنائے گئے ٹاپک"},"post_count":{"one":"بنائی گئی پوسٹ","other":"بنائی گئیں پوسٹ"},"likes_given":{"one":"دیا گیا","other":"دیا گیا"},"likes_received":{"one":"موصول ہوا","other":"موصول ہوا"},"days_visited":{"one":"دن جس میں دورہ کیا گیا","other":"دن جن میں دورہ کیا گیا"},"topics_entered":{"one":"دیکھ لیا گیا ٹاپک","other":"دیکھ لیے گئے ٹاپک"},"posts_read":{"one":"پڑھی گئی پوسٹ","other":"پڑھی گئیں پوسٹس"},"bookmark_count":{"one":"بُک مارک","other":"بُکمارکس"},"top_replies":"ٹاپ جوابات","no_replies":"ابھی تک کوئی جوابات نہیں۔","more_replies":"مزید جوابات","top_topics":"ٹاپ ٹاپک","no_topics":"ابھی تک کوئی ٹاپک نہیں۔","more_topics":"مزید ٹاپک","top_badges":"ٹاپ بَیج","no_badges":"ابھی تک کوئی بَیج نہیں۔","more_badges":"مزید بَیج","top_links":"ٹاپ لنکس","no_links":"ابھی تک کوئی لنکس نہیں۔","most_liked_by":"جس کی طرف سے سب سے زیادہ لائک کیا گیا","most_liked_users":"سب سے زیادہ لائک کیا گیا","most_replied_to_users":"جس کو سب سے زیادہ جواب دیا گیا","no_likes":"ابھی تک کوئی لائکس نہیں۔","top_categories":"ٹاپ زُمرَہ جات","topics":"ٹاپک","replies":"جوابات"},"ip_address":{"title":"آخری IP ایڈریس"},"registration_ip_address":{"title":"رجسٹریشن IP ایڈریس"},"avatar":{"title":"پروفائل تصویر","header_title":"پروفائل، پیغامات، بک مارکس اور ترجیحات"},"title":{"title":"عنوان","none":"(کوئی نہیں)"},"primary_group":{"title":"پرائمری گروپ","none":"(کوئی نہیں)"},"filters":{"all":"تمام"},"stream":{"posted_by":"کی طرف سے پوسٹ کیا گیا","sent_by":"کی طرف سے بھیجا گیا","private_message":"پیغام","the_topic":"ٹاپک"}},"loading":"لوڈ ہو رہا ہے...","errors":{"prev_page":"لوڈ کرتے ہوئے","reasons":{"network":"نیٹ ورک کی خرابی","server":"سرور کی خرابی","forbidden":"رسائی سے اِنکار کر دیا گیا","unknown":"خرابی","not_found":"صفحہ نہیں ملا"},"desc":{"network":" براہِ مہربانی اپنا کنکشن چیک کریں","network_fixed":"لگتا ہے یہ وآپس آ گیا","server":"خرابی کوڈ: %{status}","forbidden":"آپ کو یہ دیکھنے کی اجازت نہیں ہے۔","not_found":"افوہ، ایپلیکیشن نے ایک ایسے URL کو لوڈ کرنے کی کوشش جو غیر موجود ہے۔","unknown":"کچھ غلط ہو گیا۔"},"buttons":{"back":"واپس جائیں","again":"دوبارہ کوشش کریں","fixed":"پیج لوڈ کریں"}},"modal":{"close":"بند کریں"},"close":"بند کریں","logout":"آپ لاگ آؤٹ ہو گئے تھے۔","refresh":"رِیفریش","home":"ہَوم","read_only_mode":{"enabled":"یہ سائٹ صرف پڑھنے کے مَوڈ میں ہے۔ براہِ مہربانی براؤز کرتے رہئیے، لیکن جواب دینا، لائکس دینا، اور دیگر اعمال ابھی کے لئے غیر فعال ہیں۔","login_disabled":"جب تک سائٹ صرف پڑھنے کے مَوڈ میں ہے لاگ اِن غیر فعال رہے گا۔","logout_disabled":"جب تک سائٹ صرف پڑھنے کے مَوڈ میں ہے لاگ آؤٹ غیر فعال رہے گا۔"},"learn_more":"اورجانیے...","first_post":"پہلی پوسٹ","mute":"خاموش کریں","unmute":"آواز چالو کریں","last_post":"پوسٹ کیا","time_read":"پڑھا","time_read_recently":"حال ہی میں %{time_read}","time_read_tooltip":"کُل وقت پڑھا %{time_read}","time_read_recently_tooltip":"کُل وقت پڑھنے میں لگا %{time_read}(%{recent_time_read} گزشتہ 60 دنوں میں) ","last_reply_lowercase":"آخری جواب","replies_lowercase":{"one":"جواب","other":"جوابات"},"signup_cta":{"sign_up":"سائن اپ","hide_session":"مجھے کل یاد دلائیں","hide_forever":"نہیں شکریہ","hidden_for_session":"ٹھیک ہے، میں تم سے کَل پوچھوں گا۔ آپ جب چاہیں، اکاؤنٹ بنانے کے لئے 'لاگ اِن' بھی استعمال کر سکتے ہیں.","intro":"ہیلو! ایسا لگتا ہے کہ آپ بحث سے لطف اندوز ہو رہے ہیں، لیکن آپ نے اکاؤنٹ کے لئے سائن اَپ نہیں کیا۔","value_prop":"جب آپ ایک اکاؤنٹ بناتے ہیں، ہم بالکل یاد رکھتے ہیں کہ آپ نے کیا پڑھا ہے، تاکہ جہاں سے آپ نے پڑھنا چھوڑا ہو بلکل وہاں ہی پر آپ کو ہمیشہ واپس پہنچایا جا سکے۔ جب بھی کوئی آپ کو جواب دیتا ہے، آپ کو یہاں اور اِی میل پر اطلاع بھی دے دی جاتی ہے۔ اور آپ محبت کو بانٹںے کیلئے پوسٹ لائیک کر سکتے ہیں۔ :heartpulse:"},"summary":{"enabled_description":"آپ اس ٹاپک کا خلاصہ ملاحظہ کررہے ہیں: سب سے دلچسپ پوسٹ کمیونٹی کی طرف سے متعین کی جاتی ہیں۔","enable":"اس ڑاپک کا خلاصہ کریں","disable":"تمام پوسٹیں دکھائیں"},"deleted_filter":{"enabled_description":"اِس ٹاپک میں حذف شدہ پوسٹ شامل ہیں، جو چھپا دی گئی ہیں۔","disabled_description":"ٹاپک کی حذف شدہ پوسٹ دکھائی گئی ہیں۔","enable":"حذف شدہ پوسٹس کو چھپائیں","disable":"حذف شدہ پوسٹس کو ظاہر کریں"},"private_message_info":{"title":"پیغام","leave_message":"کیا آپ واقعی یہ پیغام بھیجنا چاہتے ہیں؟","remove_allowed_user":"کیا آپ واقعی اِس پیغام سے %{name} ہٹانا چاہتے ہیں؟","remove_allowed_group":"کیا آپ واقعی اِس پیغام سے %{name} ہٹانا چاہتے ہیں؟"},"email":"اِی میل","username":"صارف نام","last_seen":"دیکھا گیا","created":"بنایا گیا","created_lowercase":"بنایا گیا","trust_level":"ٹرسٹ لَیول","search_hint":"صارف نام، ای میل یا IP ایڈریس","create_account":{"disclaimer":"رجسٹر کرنے پر آپ \u003ca href='%{privacy_link}' target='blank'\u003eپرائیوِیسی پالیسی\u003c/a\u003e اور \u003ca href='%{tos_link}' target='blank'\u003eسروس کی شرائط\u003c/a\u003e سے اتفاق کرتے ہیں۔","failed":"کچھ غلط ہو گیا، شاید یہ ای میل پہلے ہی سے رجسٹرڈ ہے، پاسورڈ بھول جانے والا لنک اِستعمال کر کے دیکھیں"},"forgot_password":{"title":"پاسورڈ رِی سَیٹ","action":"میں اپنا پاسورڈ بھول گیا","invite":"اپنا صارف نام یا اِی میل ایڈریس درج کریں، اور ہم آپ کو ایک پاسورڈ رِی سَیٹ ایمیل بھیج دیں گے۔","reset":"پاسورڈ رِی سَیٹ کریں","complete_username":"اگر کوئی اکاؤنٹ \u003cb\u003e%{username}\u003c/b\u003e سے میچ کرتا ہو گا، تو آپ کو پاسورڈ رِی سَیٹ کرنے کے لئے ہدایات کی ایک اِی میل جلد ہی موصول ہو جائے گی۔","complete_email":"اگر کوئی اکاؤنٹ \u003cb\u003e%{email}\u003c/b\u003e سے ملتا ہو گا، تو آپ کو پاسورڈ رِی سَیٹ کرنے کے لئے ہدایات کی ایک اِی میل جلد ہی موصول ہو جائے گی۔","complete_username_not_found":"کوئی اکاؤنٹ \u003cb\u003e%{username}\u003c/b\u003e سے میچ نہیں کرتا","complete_email_not_found":"کوئی اکاؤنٹ \u003cb\u003e%{email}\u003c/b\u003e سے میچ نہیں کرتا","help":"ای میل نہیں موصول ہر رہی؟ اپنے سپَیم فولڈر کو پہلے چیک کرلیجیے گا۔\u003cp\u003eآپ کو شک ہے کہ کونیسا ای میل ایڈریس آپ نے استعمال کیا ہے؟ ایک ای میل ایڈریس درج کریں اور ہم آپ کو بتائیں گے اگر یہ ہمارے پاس موجود ہے۔\u003c/p\u003e \u003cp\u003eاگر آپ کو اپنے اکاؤنٹ پر ای میل ایڈریس تک اب رسائی حاصل نہیں ہے، تو براہ کرم \u003ca href='%{basePath}/about'\u003eہمارے مددگار اسٹاف\u003c/a\u003e سے رابطہ کریں۔\u003c/p\u003e","button_ok":"ٹھیک ہے","button_help":"مدد"},"email_login":{"link_label":"مجھے ایک لاگ اِن لِنک ای میل کریں","button_label":"ای میل کے ساتھ","complete_username":"اگر ایک اکاؤنٹ صارف نام \u003cb\u003e%{username}\u003c/b\u003e سے میچ کرتا ہے، تو آپ کو جلد ہی لاگ اِن لِنک کے ساتھ ایک ای میل موصول ہو جانی چاہئے۔","complete_email":"اگر ایک اکاؤنٹ \u003cb\u003e%{email}\u003c/b\u003e سے میچ کرتا ہے، تو آپ کو جلد ہی لاگ اِن لِنک کے ساتھ ایک ای میل موصول ہو جانی چاہئے۔","complete_username_found":"ہمیں ایک ایسا اکاؤنٹ مل گیا جو صارف نام \u003cb\u003e%{username}\u003c/b\u003e سے میچ کرتا ہے، آپ کو جلد ہی لاگ اِن لِنک کے ساتھ ایک ای میل موصول ہو جانی چاہئے۔","complete_email_found":"ہمیں ایک ایسا اکاؤنٹ مل گیا جو \u003cb\u003e%{email}\u003c/b\u003e سے میچ کرتا ہے، آپ کو جلد ہی لاگ اِن لِنک کے ساتھ ایک ای میل موصول ہو جانی چاہئے۔","complete_username_not_found":"کوئی اکاؤنٹ صارف نام \u003cb\u003e%{username}\u003c/b\u003e سے میچ نہیں کرتا","complete_email_not_found":"کوئی اکاؤنٹ \u003cb\u003e%{email}\u003c/b\u003e سے میچ نہیں کرتا","confirm_title":"%{site_name} پر جاری رکھیں","logging_in_as":"%{email} کے طور پر لاگ اِن","confirm_button":"لاگ اِن مکمل"},"login":{"title":"لاگ اِن","username":"صارف","password":"پاسورڈ","second_factor_description":"براہ مہربانی اپنی اَیپ میں سے توثیقی کَوڈ درج کریں:","second_factor_backup_description":"براہ مہربانی اپنے بیک اپ کوڈز میں سے ایک درج کریں:","caps_lock_warning":"کیپس لاک آن ہے","error":"نامعلوم خرابی","cookies_error":"آپ کے براؤزر پر کُوکِیز غیر فعال لگ رہے ہیں۔ اُن کو فعال کیے بغیر آپ لاگ اِن شائد نہ کر سکیں۔","rate_limit":"دوبارہ لاگ اِن کرنے کی کوشش کرنے سے پہلے براہ کرم تھوڑا انتظار کریں۔","blank_username":"براہ مہربانی اپنا اِیمیل یا صارف نام درج کریں۔","blank_username_or_password":"براہ مہربانی اپنا اِیمیل یا صارف نام، اور پاسورڈ درج کریں۔","reset_password":"پاسورڈ رِی سَیٹ کریں","logging_in":"لاگ اِن ہو رہا ہے...","or":"یا","authenticating":"تصدیق کی جا رہی ہے...","awaiting_activation":"آپ کا اکاؤنٹ ایکٹیویشن کا انتظار کر رہا ہے، \"پاسورڈ بھول جانے\" والا لنک استعمال کر کہ ایک اور ایکٹیویشن اِی میل جاری کریں۔","awaiting_approval":"آپ کا اکاؤنٹ ابھی تک عملے کے کسی رکن کی طرف سے منظور نہیں کیا گیا۔ جب یہ منظوری مل جائے گی تو آپ کو ایک ای میل بھیج دی جائے گی۔","requires_invite":"معذرت، اس فورم تک رسائی صرف دعوت کے زریعے ممکن ہے۔","not_activated":"ابھی آپ لاگ ان نہیں کر سکتے۔ ہم پہلے آپ کو ایک ایکٹیویشن اِی میل \u003cb\u003e%{sentTo}\u003c/b\u003e پر بھیج چکے ہیں۔ براہ مہربانی، اپنے اکاؤنٹ کو چالو کرنے کے لئے اُس اِی میل میں دی گئی ہدایات پر عمل کریں۔","admin_not_allowed_from_ip_address":"آپ ایڈمن کے طور پر اِس آئی پی ایڈریس سے لاگ اِن نہیں ہو سکتے۔","resend_activation_email":"دوبارہ ایکٹیویشن ای میل بھیجنے کے لئے یہاں کلک کریں۔","resend_title":"ایکٹیویشن اِیمیل دوبارہ بھیجییں","change_email":"اِیمیل ایڈریس تبدیل کریں","provide_new_email":"ایک نیا ایڈریس فراہم کریں اور ہم آپ کی تصدیقی ای میل دوبارہ بھیجیں گے۔","submit_new_email":"اِیمیل ایڈریس اَپ ڈَیٹ کریں","sent_activation_email_again":"ہم نے آپ کو \u003cb\u003e%{currentEmail}\u003c/b\u003e پر ایک اور ایکٹیویشن اِی میل بھیجی ہے۔ اسے پہنچنے میں چند منٹ لگ سکتے ہیں؛ اپنے سپیم فولڈر کو چیک کرنا نہ بھولیے گا۔","sent_activation_email_again_generic":"ہم نے ایک اور ایکٹیویشن اِی میل بھیجی ہے۔ اسے پہنچنے میں چند منٹ لگ سکتے ہیں؛ اپنے سپیم فولڈر کو چیک کرنا نہ بھولیے گا۔","to_continue":"برائے مہربانی لاگ اِن کریں","preferences":"آپ کا اپنی صارف ترجیحات کو تبدیل کرنے کے لیے لاگ اِن ہونا ضروری ہے۔","not_approved":"آپ کا اکاؤنٹ ابھی تک منظور نہیں کیا گیا ہے۔ جب آپ لاگ اِن کر سکیں گو اِی میل کے ذریعے آپ کو مطلع کر دیا جائے گا۔","google_oauth2":{"name":"گُوگَل","title":"گوگل سے"},"twitter":{"name":"Twitter","title":"ٹویٹر سے"},"instagram":{"name":"اِنسٹاگرام","title":"اِنسٹاگرام سے"},"facebook":{"name":"فَیسبُک","title":"فیس بک سے"},"github":{"name":"گِٹ ہَب","title":"گِٹ ہَب سے"},"discord":{"name":"ڈِسکَورڈ","title":"ڈِسکَورڈ کے ساتھ"},"second_factor_toggle":{"totp":"بجائے ایک اَوتھینٹیکَیٹر اَیپ کا استعمال کریں","backup_code":"بجائے ایک بیک اپ کوڈ استعمال کریں"}},"invites":{"accept_title":"دعوت نامہ","welcome_to":"%{site_name} پر خوش آمدید!","invited_by":"آپ کو جن کی طرف سے مدعو کیا گیا تھا:","social_login_available":"آپ اِس اِیمیل کا استعمال کرتے ہوئے کسی بھی سوشل لاگ اِن کے ساتھ سائن اِن بھی کرسکیں گے۔","your_email":"آپ کے اکاؤنٹ کا اِیمیل ایڈریس \u003cb\u003e%{email}\u003c/b\u003e ہے۔","accept_invite":"دعوت قبول کریں","success":"آپ کا اکاؤنٹ بنا دیا گیا ہے اور اب آپ لاگ اِن کر سکتے ہیں۔","name_label":"نام","optional_description":"(اختیاری)"},"password_reset":{"continue":"%{site_name} پر جاری رکھیں"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"گُوگَل کلاسِک","facebook_messenger":"فَیس بُک مَیسنجر"},"category_page_style":{"categories_only":"صرف زمرہ جات","categories_with_featured_topics":"نمایاں ٹاپکس کے ساتھ زمرہ جات","categories_and_latest_topics":"زُمرہ جات اور تازہ ترین ٹاپکس","categories_and_top_topics":"زمرہ جات اور ٹاپ ٹاپکس","categories_boxes":"ذیلی زمرے والے خانے","categories_boxes_with_topics":"نمایاں ٹاپک والے خانے"},"shortcut_modifier_key":{"shift":"شفٹ","ctrl":"Ctrl","alt":"Alt","enter":"اَینٹر"},"conditional_loading_section":{"loading":"لوڈ ہو رہا ہے..."},"select_kit":{"default_header_text":"منتخب کریں...","no_content":"کوئی میل نہیں ملے","filter_placeholder":"تلاش کریں...","filter_placeholder_with_any":"تلاش کریں یا تخلیق کریں...","create":"'%{content}' بنائیں","max_content_reached":{"one":"آپ صرف %{count} چیز منتخب کرسکتے ہیں۔","other":"آپ صرف %{count} اشیاء منتخب کرسکتے ہیں۔"},"min_content_not_reached":{"one":"کم از کم %{count} چیز منتخب کریں۔","other":"کم از کم %{count} اشیاء منتخب کریں۔"}},"date_time_picker":{"from":"سے","to":"کیلئے"},"emoji_picker":{"filter_placeholder":"اِیمَوجی تلاش کریں","smileys_\u0026_emotion":"سمائیلیاں اور جذبات","people_\u0026_body":"لوگ اور جسم","animals_\u0026_nature":"جانور اور قدرت","food_\u0026_drink":"کھانے پینے","travel_\u0026_places":"سفر اور مقامات","activities":"سرگرمیاں","objects":"اشیاء","symbols":"علامات","flags":"فلَیگز","recent":"حال ہی میں استعمال کیے گئے","default_tone":"کوئی جِلد رنگ نہیں","light_tone":"ہلکا جِلد رنگ","medium_light_tone":"درمیانا ہلکا جِلد رنگ","medium_tone":"درمیانا جِلد رنگ","medium_dark_tone":"درمیانا سیاہ جِلد رنگ","dark_tone":"سیاہ جِلد رنگ","default":"اپنی مرضی کے اِیمَوجی"},"shared_drafts":{"title":"مشترکہ ڈرافٹس","destination_category":"مطلوبہ زُمرَہ","publish":"مشترکہ ڈرافٹس شائع کریں","confirm_publish":"کیا آپ واقعی اِس ڈرافٹ کو شائع کرنا چاہتے ہیں؟","publishing":"ٹاپک شائع کیا جا رہا ہے..."},"composer":{"emoji":"اِیمَوجی :)","more_emoji":"مزید...","options":"اختیارات","whisper":"سرگوشی","unlist":"غیر مندرج","add_warning":"یہ ایک آفیشل انتباہ ہے۔","toggle_whisper":"سرگوشی ٹَوگل کریں","toggle_unlisted":"غیر مندرج ٹَوگل کریں","posting_not_on_topic":"کون سے ٹاپک کا آپ جواب دینا چاہتے ہیں؟","saved_local_draft_tip":"مقامی طور پر محفوظ کر لیا گیا","similar_topics":"آپ کا ٹاپک ملتا ہے...","drafts_offline":"ڈرافٹس آف لائن","edit_conflict":"ترامیم میں تصادم","group_mentioned":{"one":"%{group} کا ذکر کر کہ، آپ \u003ca href='%{group_link}'\u003e%{count} شخص\u003c/a\u003e کو مطلع کرنے لگے ہیں - کیا آپ واقعی یہ کرنا چاہتے ہیں؟","other":"%{group} کا ذکر کر کہ، آپ \u003ca href='%{group_link}'\u003e%{count} لوگوں\u003c/a\u003e کو مطلع کرنے لگے ہیں - کیا آپ واقعی یہ کرنا چاہتے ہیں؟"},"cannot_see_mention":{"category":"آپ نے %{username} کا زکر کیا ہے لیکن چونکہ اُن کو اِس زمرے تک رسائی حاصل نہیں، اُن کو مطلع نہیں کیا جائے گا۔ آپ کو انہیں ایک ایسے گروپ میں شامل کرنے کی ضرورت ہے جسے اِس زمرے تک رسائی حاصل ہے۔","private":"آپ نے %{username} کا زکر کیا ہے لیکن چونکہ وہ یہ ذاتی پیغام نہیں دیکھ سکتے اُن کو مطلع نہیں کیا جائے گا۔ آپ کو اُنہیں اِس ذاتی پیغام میں مدعو کرنے کی ضرورت ہے۔"},"duplicate_link":"لگتا ہے کہ آپ کا \u003cb\u003e%{domain}\u003c/b\u003e لنک \u003cb\u003e@%{username}\u003c/b\u003e نے \u003ca href='%{post_url}'\u003e%{ago} کو ٹاپک میں پہلے سے ہی ایک جواب\u003c/a\u003e میں پوسٹ کر دیا تھا - کیا آپ واقعی یہ دوبارہ پوسٹ کرنا چاہتے ہیں؟","reference_topic_title":"RE: %{title}","error":{"title_missing":"عنوان درکار ہے","post_missing":"پوسٹ خالی نہیں ہو سکتی","try_like":"کیا آپ نے %{heart} بٹن اِستعمال کیا ہے؟","category_missing":"ایک زمرہ کا انتخاب کرنا ضروری ہے","topic_template_not_modified":"براہ مہربانی ٹاپک ٹَیمپلیٹ میں ترمیم کرکے اپنے ٹاپک میں تفصیلات اور مخصوصیات شامل کریں۔"},"save_edit":"ترمیم محفوظ کریں","overwrite_edit":"دوسری ترمیم کے اوپر لکھ ڈالیں","reply_original":"حقیقی ٹاپک پر جواب دیں","reply_here":"یہاں جواب دیں","reply":"جواب","cancel":"منسوخ","create_topic":"ٹاپک بنائیں","create_pm":"پیغام","create_whisper":"سرگوشی","create_shared_draft":"مشترکہ ڈرافٹ بنائیں","edit_shared_draft":"مشترکہ ڈرافٹ ترمیم کریں","title":"یا Ctrl+Enter دبائیں","users_placeholder":"ایک صارف شامل کریں","title_placeholder":"ایک مختصر جملہ میں بتائیے کہ یہ بحث کس چیز کے بارے میں ہے؟","title_or_link_placeholder":"عنوان ٹائپ کریں، یا ایک لنک یہاں پیسٹ کریں","edit_reason_placeholder":"آپ ترمیم کیوں کر رہے ہیں؟","topic_featured_link_placeholder":"عنوان کے ساتھ دکھایا گیا لنک درج کریں۔","remove_featured_link":"ٹاپک سے لنک ہٹا ئیں۔","reply_placeholder":"یہاں ٹائپ کریں۔ فارمیٹ کیلئے مارکڈائون، BBCode، یا HTML اِستعمال کریں۔ تصاویر ڈریگ یا پیسٹ کریں۔","reply_placeholder_no_images":"یہاں ٹائپ کریں۔ فارمیٹ کیلئے مارکڈائون، BBCode، یا HTML اِستعمال کریں۔","reply_placeholder_choose_category":"یہاں ٹائپ کرنے سے پہلے ایک زمرہ منتخب کریں۔","view_new_post":"اپنے نئی پوسٹ دیکھئیے۔","saving":"محفوظ کیا جا رہا ہے","saved":"محفوظ کر لیا گیا!","uploading":"اَپ لوڈ کیا جا رہا ہے...","show_preview":"پیش نظارہ دکھائیں \u0026raquo;","hide_preview":"\u0026laquo; پیش نظارہ چھپائیں","quote_post_title":"پوری پوسٹ کا اقتباس کریں","bold_label":"B","bold_title":"گہرا","bold_text":"گہرا ٹَیکسٹ","italic_label":"I","italic_title":"آئیٹیلک","italic_text":"زور دیا گیا ٹَیکسٹ","link_title":"ہائپرلِنک","link_description":"یہاں لِنک کی تفصیل درج کریں","link_dialog_title":"ہائپرلِنک ڈالیں","link_optional_text":"اختیاری عنوان","blockquote_text":"بلاک متن","code_title":"پہلے سے فارمیٹ کیا گیا ٹَیکسٹ","code_text":"حاشیہ نے ٹَیکسٹ کو پہلے سے 4 خالی جگہوں سے فارمیٹ کر دیا","paste_code_text":"کوڈ یہاں ٹائپ یا پیسٹ کریں","upload_title":"اَپ لوڈ","upload_description":"یہاں اَپ لوڈ کی تفصیل درج کریں","olist_title":"نمبروار فہرست","ulist_title":"بلٹ والی لسٹ","list_item":"فہرست آئٹم","toggle_direction":"سمت ٹَوگل کریں","help":"مارکڈائون ترمیم میں مدد","collapse":"کمپوزر پینل کو مینِمائز کریں","open":"کمپوزر پینل کھولیں","abandon":"کمپوزر بند اور ڈرافٹ ختم کردیں","enter_fullscreen":"پوری اسکرین کمپوزر کھولیں","exit_fullscreen":"پوری اسکرین کمپوزر کھولیں سے باہر آئیں","modal_ok":"ٹھیک","modal_cancel":"منسوخ","cant_send_pm":"معذرت، آپ %{username} کو پیغام نہیں بھیج سکتے۔","yourself_confirm":{"title":"کیا آپ وصول کنندگان کو شامل کرنا بھول گئے؟","body":"اِس وقت یہ پیغام صرف اپنے آپ کو بھیجا جا رہا ہے!"},"admin_options_title":"اس ٹاپک کیلئے عملے کی اختیاری سیٹِنگ","composer_actions":{"reply":"جواب","draft":"ڈرافٹ","edit":"ترمیم","reply_to_post":{"desc":"ایک مخصوص پوسٹ پر جواب دیں"},"reply_as_new_topic":{"label":"مُنسلِک ٹاپک کے طور پر جواب دیں","desc":"اِس ٹاپک سے منسلک ایک نیا ٹاپک بنائیں"},"reply_as_private_message":{"label":"نیا پیغام","desc":"نیا ذاتی پیغام بنائیں"},"reply_to_topic":{"label":"ٹاپک پر جواب دیں","desc":"ٹاپک کا جواب دیں، نہ کہ کسی مخصوص پوسٹ کا"},"toggle_whisper":{"label":"سرگوشی ٹَوگل کریں","desc":"سرگوشیاں صرف سٹاف اراکین کو نظر آتی ہیں"},"create_topic":{"label":"نیا ٹاپک"},"shared_draft":{"label":"مشترکہ ڈرافٹ"},"toggle_topic_bump":{"label":"ٹاپک بَمپ ٹَوگل کریں","desc":"تازہ ترین جواب کی تاریخ تبدیل کیے بغیر جواب دیں"}},"details_title":"Summary","details_text":"This text will be hidden"},"notifications":{"tooltip":{"regular":{"one":"%{count} اندیکھی اطلاع","other":"%{count} اندیکھی اطلاعات"},"message":{"one":"%{count} غیر پڑھا پیغام","other":"%{count} غیر پڑھے پیغامات"}},"title":"@نام کے ذکر، آپ کی پوسٹ اور ٹاپک پر جوابات، پیغامات، وغیرہ کی اطلاعات","none":"اِس وقت ویب سائٹ اطلاعات لوڈ کرنے سے قاصر ہے۔","empty":"کوئی اطلاعات نہیں ملیں۔","post_approved":"آپ کی پوسٹ منظور ہو گئی تھی","reviewable_items":"اشیاء جن کا جائزہ لینے کی ضرورت ہے","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_consolidated_description":{"one":"آپ کی %{count} پوسٹس کو لائیک کیا","other":"آپ کی %{count} پوسٹس کو لائیک کیا"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003eنے آپ کی دعوت قبول کرلی ","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003eنے %{description} منتقل کر دیا","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"'%{description}' حاصل کیا","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eنیا ٹاپک\u003c/span\u003e %{description}","membership_request_accepted":"'%{group_name}' میں رکنیت قبول کر لی گئی","group_message_summary":{"one":"آپ کے %{group_name} اِن باکس میں %{count} پیغام","other":"آپ کے %{group_name} اِن باکس میں %{count} پیغامات"},"popup":{"mentioned":"%{username} نے آپ کا تذکرہ \"%{topic}\" میں کیا - %{site_title}","group_mentioned":"%{username} نے آپ کا تذکرہ \"%{topic}\" میں کیا - %{site_title}","quoted":"%{username} نے \"%{topic}\" میں آپ کا حوالا دیا - %{site_title}","replied":"%{username} نے \"%{topic}\" میں آپ کو جواب دیا - %{site_title}","posted":"%{username} نے \"%{topic}\" میں پوسٹ کیا - %{site_title}","private_message":"%{username} نے \"%{topic}\" میں آپ کو زاتی پیغام بھیجا - %{site_title}","linked":"%{username} نے \"%{topic}\" سے آپ کی پوسٹ کو لنک کیا - %{site_title}","watching_first_post":"%{username} نے ایک نیا ٹاپک \"%{topic}\" بنایا - %{site_title}","confirm_title":"نوٹیفکیشن فعال - %{site_title}","confirm_body":"کامیابی! اطلاعات فعال ہوگئی ہیں۔","custom":"%{username} کی طرف سے %{site_title} پر اطلاعات"},"titles":{"mentioned":"ذکر کیا گیا","replied":"نیا جواب","quoted":"اقتباس کردہ","edited":"ترمیم کردہ","liked":"نیا لائیک","private_message":"نیا ذاتی پیغام","invited_to_private_message":"ذاتی پیغام کیلئے دعوت دی گئی","invitee_accepted":"دعوت قبول کر لی گئی","posted":"نئی پوسٹ","moved_post":"پوسٹ منتقل کر دی گئی","linked":"لنک کردہ","granted_badge":"بَیج عطا کیا گیا","invited_to_topic":"ٹاپک کیلئے دعوت دی گئی","group_mentioned":"گروپ کا ذکر کیا گیا","group_message_summary":"نئے گروپ پیغامات","watching_first_post":"نیا ٹاپک","topic_reminder":"ٹاپک یاد دہانی","liked_consolidated":"نئے لائیکس","post_approved":"منظورشدہ پوسٹ"}},"upload_selector":{"title":"ایک تصویر شامل کریں","title_with_attachments":"ایک تصویر یا ایک فائل شامل کریں","from_my_computer":"میری ڈیوائس سے","from_the_web":"انٹرنیٹ سے","remote_tip":"تصویر کا لنک","remote_tip_with_attachments":"تصویر یا فائل کا لنک %{authorized_extensions}","local_tip":"اپنے ڈیوائس سے تصاویر منتخب کریں","local_tip_with_attachments":"اپنے ڈیوائس سے تصاویر یا فائلیں منتخب کریں %{authorized_extensions}","hint":"(آپ اِن کو اَپ لوڈ کرنے کیلئیے ایڈیٹر میں ڈرَیگ \u0026 ڈراپ بھی کر سکتے ہیں)","hint_for_supported_browsers":"آپ تصاویر کو ایڈیٹر میں ڈرَیگ \u0026 ڈراپ یا پَیسٹ بھی کر سکتے ہیں","uploading":"اَپ لوڈ کیا جا رہا ہے","select_file":"فائل منتخب کریں","default_image_alt_text":"تصویر"},"search":{"sort_by":"ترتیب بہ","relevance":"مطابقت","latest_post":"تازہ ترین پوسٹ","latest_topic":"تازہ ترین ٹاپک","most_viewed":"سب سے زیادہ دیکھا گیا","most_liked":"سب سے زیادہ لائک کیا گیا","select_all":"تمام منتخب کریں","clear_all":"تمام کو صاف کریں","too_short":"آپ کا سَرچ ٹَرم بہت مختصر ہے۔","result_count":{"one":"\u003cspan class='term'\u003e%{term}\u003c/span\u003e\u003cspan\u003eکیلئے %{count} نتیجہ\u003c/span\u003e","other":"\u003cspan class='term'\u003e%{term}\u003c/span\u003e\u003cspan\u003eکیلئے %{count}%{plus} نتائج\u003c/span\u003e"},"title":"ٹاپک، پوسٹس، صارفین، یا زمرہ جات کو سَرچ کریں","full_page_title":"ٹاپک یا پوسٹس کو سَرچ کریں","no_results":"کوئی نتائج نہیں پائے گئے۔","no_more_results":"کوئی اور نتائج نہیں پائے گئے۔","post_format":"%{username} کی طرف سے #%{post_number}","results_page":"'%{term}' کیلئے سرچ کے نتائج","more_results":"مزید نتائج موجود ہیں۔ برائے مہربانی اپنے سرچ کے معیار کو محدود کریں۔","cant_find":"آپ جو ڈھونڈ رہے تھے وہ نہیں مل سکا؟","start_new_topic":"شاید ایک نیا ٹاپک شروع کریں؟","or_search_google":"یا اس کے بجائے گُوگَل کے ساتھ تلاش کرنے کی کوشش کریں:","search_google":"اس کے بجائے گُوگَل کے ساتھ تلاش کرنے کی کوشش کریں:","search_google_button":"گُوگَل","context":{"user":"@%{username} کے حساب سے پوسٹس تلاش کریں","category":"#%{category} زُمرَہ میں تلاش کریں","topic":"اِس ٹاپک میں تلاش کریں","private_messages":"پیغامات میں تلاش کریں"},"advanced":{"title":"اعلی درجے کی تلاشی","posted_by":{"label":"کی طرف سے پوسٹ کیا گیا"},"in_category":{"label":"زمرہ میں ڈالا گیا"},"in_group":{"label":"گروپ میں"},"with_badge":{"label":"بَیج کے ساتھ"},"with_tags":{"label":"ٹیگ ہواوا"},"filters":{"label":"صرف وہ ٹاپک/پوسٹس دکھائیں جو...","title":"صرف عنوان سے ملتے ہوئے","likes":"جو میں نے لائیک کیے","posted":"جن میں میں نے پوسٹ کیا","watching":"جو میں دیکھ رہا ہوں","tracking":"جو میں ٹریک کر رہا ہوں","private":"میرے پیغامات میں ہوں","bookmarks":"میں نے بُک مارک کیے ہوے ہوں","first":"جو سب سے پہلی پوسٹ ہو","pinned":"جو پِن ہوا ہو","seen":"جو میں نے پڑھ لیے ہوں","unseen":"جو میں نے نہ پڑھا ہو","wiki":"جو وِیکی ہو","images":"تصاویر شامل کریں","all_tags":"تمام درجِ بالا ٹیگز"},"statuses":{"label":"جہاں ٹاپک","open":"کھلے ہوں","closed":"بند ہوں","archived":"آر کائیو کیے ہوں","noreplies":"کے صفر جوابات ہوں","single_user":"صرف ایک صارف پر مشتمل ہوں"},"post":{"time":{"label":"پوسٹ کیا","before":"سے پہلے","after":"کے بعد"}}}},"hamburger_menu":"ایک اور ٹاپک فہرست یا زمرہ پر جائیں","new_item":"نیا","go_back":"واپس جائیں","not_logged_in_user":"موجودہ سرگرمی کے خلاصہ اور ترجیحات کے ساتھ صفحہِ صارف","current_user":"اپنے صفحہِ صارف پر جائیں","topics":{"new_messages_marker":"آخری وزٹ","bulk":{"select_all":"تمام منتخب کریں","clear_all":"تمام کو صاف کریں","unlist_topics":"ٹاپکس کو فہرست سے ہٹائیں","relist_topics":"ٹاپک دوبارہ فہرست کریں","reset_read":"\"پڑھ لیا گیا\" کو رِی سَیٹ کریں","delete":"ٹاپکس حذف کریں","dismiss":"بر خاست کریں","dismiss_read":"تمام نہ پڑھے گئے کو بر خاست کریں","dismiss_button":"بر خاست کریں...","dismiss_tooltip":"صرف نئی پوسٹس برخاست کریں یا ٹاپکس کو ٹریک کرنے سے رک جائیں","also_dismiss_topics":"ان ٹاپکس کو ٹریک کرنے سے رک جائیں تاکہ وہ کبھی دوبارہ میرے لیے \"نہ پڑھے گئے\"میں نظر نہ آئیں","dismiss_new":"نیا برخاست کریں","toggle":"ٹاپکس کے بَلک انتخاب کو ٹَوگل کریں","actions":"بَلک عمل","change_category":"زمرہ تبدیل کریں","close_topics":"ٹاپکس بند کریں","archive_topics":"ٹاپکس آر کائیو کریں","notification_level":"اطلاعات","choose_new_category":"ٹاپکس کیلئے نئے زمرہ کا انتخاب کریں:","selected":{"one":"آپ نے \u003cb\u003e%{count}\u003c/b\u003e ٹاپک منتخب کیا ہے۔","other":"آپ نے \u003cb\u003e%{count}\u003c/b\u003e ٹاپک منتخب کیے ہیں۔"},"change_tags":"ٹیگز بدلیں","append_tags":"ٹیگز میں اضافہ کریں","choose_new_tags":"ان ٹاپکس کیلئے نئے ٹیگز کا انتخاب کریں:","choose_append_tags":"ان ٹاپکس پر اضافہ کرنے کیلئے نئے ٹیگز کا انتخاب کریں:","changed_tags":"ان ٹاپکس کے ٹیگز تبدیل کر دیے گئے تھے۔"},"none":{"unread":"آپ کے پاس کوئی بغیر پڑھے ٹاپک موجود نہیں۔","new":"آپ کے پاس کوئی نئے ٹاپک موجود نہیں۔","read":"ابھی تک آپ نے کوئی ٹاپکس نہیں پڑھے۔","posted":"ابھی تک آپ نے کسی ٹاپک میں پوسٹ نہیں کیا۔","bookmarks":"ابھی تک آپ کے بُک مارک کیے ہوے کوئی ٹاپک نہیں ہیں۔","category":"کوئی %{category} کے ٹاپک موجود نہیں ہیں۔","top":"کوئی ٹاپ ٹاپک موجود نہیں ہیں۔"},"bottom":{"latest":"کوئی مزید تازہ ترین ٹاپک موجود نہیں ہیں۔","posted":"کوئی مزید پوسٹ کیے گئے ٹاپک موجود نہیں ہیں۔","read":"کوئی مزید پڑھ لیے گئے ٹاپک موجود نہیں ہیں۔","new":"کوئی مزید نئے ٹاپک موجود نہیں ہیں۔","unread":"کوئی مزید بغیر پڑھے ٹاپک موجود نہیں ہیں۔","category":"مزید کوئی %{category} کے ٹاپک موجود نہیں۔","top":"مزید کوئی ٹاپ ٹاپک موجود نہیں۔","bookmarks":"مزید کوئی بک مارک کیے ہوئے ٹاپک موجود نہیں۔"}},"topic":{"filter_to":{"one":"ٹاپک میں %{count} پوسٹ","other":"ٹاپک میں %{count} پوسٹس"},"create":"نیا ٹاپک","create_long":"نیا ٹاپک بنائیں","open_draft":"ڈرافٹ کھولیے","private_message":"ایک پیغام شروع کریں","archive_message":{"help":"اپنے آرکائیو میں پیغام منتقل کریں","title":"آرکائیو"},"move_to_inbox":{"title":"اِنباکس میں منتقل کریں","help":"پیغام واپس اِنباکس میں منتقل کریں"},"edit_message":{"help":"پیغام کی پہلی اشاعت میں ترمیم کریں","title":"ترمیم"},"defer":{"help":"بغیر پڑھا نشان زد کریں","title":"ملتوی کریں"},"list":"ٹاپک","new":"نیا ٹاپک","unread":"بغیر پڑھے","new_topics":{"one":"%{count} نیا ٹاپک","other":"%{count} نئے ٹاپک"},"unread_topics":{"one":"%{count} بغیر پڑھا گیا ٹاپک","other":"%{count} بغیر پڑھے گئے ٹاپک"},"title":"ٹاپک","invalid_access":{"title":"ٹاپک نجی ہے","description":"معذرت، آپ کو اس ڑاپک تک رسائی حاصل نہیں!","login_required":"آپ کو یہ ٹاپک دیکھنے کے لیے لاگ اِن ہونا ضروری ہے۔"},"server_error":{"title":"ٹاپک لوڈ ہونے میں ناکام رہا","description":"معذرت، ممکنہ طور پر کنکشن کے مسئلہ کی وجہ سے، ہم ٹاپک لوڈ نہیں کر سکے۔ براہ مہربانی دوبارہ کوشش کیجیے۔ مسئلہ برقرار رہے تو، ہمیں بتائیں۔"},"not_found":{"title":"ٹاپک نہیں ملا","description":"معزرت، ہم یہ ٹاپک نہیں ڈھونڈ سکے۔ شاید یہ کسی ماڈریٹر نے ہٹا دیا ہو؟"},"total_unread_posts":{"one":"آپ کے پاس اِس ٹاپک میں %{count} بغیر پڑھی پوسٹ موجود ہے","other":"آپ کے پاس اِس ٹاپک میں %{count} بغیر پڑھی پوسٹ موجود ہیں"},"unread_posts":{"one":"آپ کے پاس اِس ٹاپک میں %{count} بغیر پڑھی پرانی پوسٹ موجود ہے","other":"آپ کے پاس اِس ٹاپک میں %{count} بغیر پڑھی پرانی پوسٹ موجود ہیں"},"new_posts":{"one":"آپ کے آخری دفع یہ ٹاپک پڑھنے کے بعد %{count} نئی پوسٹ شائع ہوئی","other":"آپ کے آخری دفع یہ ٹاپک پڑھنے کے بعد %{count} نئی پوسٹ شائع ہوئیں"},"likes":{"one":"اِس ٹاپک میں %{count} لائیک ہے","other":"اِس ٹاپک میں %{count} لائیکس ہیں"},"back_to_list":"واپس ٹاپک فہرست پر","options":"ٹاپک اختیارات","show_links":"اِس ٹاپک کے اندر موجود لنکس دکھایں","toggle_information":"ٹاپک تفصیلات ٹَوگل کریں","read_more_in_category":"مزید پڑھنا چاہتے ہیں؟ %{catLink} اور %{latestLink} میں دوسرے ٹاپک دیکھیں۔","read_more":"مزید پڑھنا چاہتے ہیں؟ %{catLink} یا %{latestLink}۔","unread_indicator":"کسی ممبر نے ابھی تک اِس ٹاپک کی آخری پوسٹ نہیں پڑھی ہے۔","browse_all_categories":"تمام زمرہ جات براؤز کریں","view_latest_topics":"تازہ ترین ٹاپک دیکھیے","jump_reply_up":"اِس سے پرانے جواب پر جائیں","jump_reply_down":"اِس سے نئے جواب پر جائیں","deleted":"ٹاپک حذف کردیا گیا ہے","topic_status_update":{"title":"ٹاپک ٹائمر","save":"ٹائمر مقرر کریں","num_of_hours":"گھنٹوں کی تعداد:","remove":"ٹائمر ہٹائیں","publish_to":"شائع کریں:","when":"کب:","time_frame_required":"براہ کرم ایک ٹائم فریم منتخب کریں"},"auto_update_input":{"none":"ایک ٹائم فریم منتخب کریں","later_today":"آج بعد میں","tomorrow":"کَل","later_this_week":"اِس ہفتے بعد میں","this_weekend":"اِس ہفتےکےآخر میں","next_week":"اگلے ہفتے","next_month":"اگلے ماہ","forever":"ہمیشہ کیلئے","pick_date_and_time":"تاریخ اور وقت منتخب کریں","set_based_on_last_post":"آخری پوسٹ کی بنیاد پر بند کریں"},"publish_to_category":{"title":"اشاعت شیڈول کریں"},"temp_open":{"title":"عارضی طور پر کھولیں"},"auto_reopen":{"title":"خود کار طریقے سے ٹاپک کھولیں"},"temp_close":{"title":"عارضی طور پر بند کریں"},"auto_close":{"title":"خود کار طریقے سے ٹاپک بند کریں","error":"براہ کرم، ایک قابلِ قبول قدر درج کریں۔","based_on_last_post":"بند نہ کریں جب تک ٹاپک کی آخری پوسٹ کم از کم اتنی پرانی نہ ہو۔"},"auto_delete":{"title":"خود کار طریقے سے ٹاپک حذف کریں"},"auto_bump":{"title":"خود کار طریقے سے ٹاپک بَمپ کریں"},"reminder":{"title":"مجھے یاد دہانی کرائیں"},"status_update_notice":{"auto_open":"یہ ٹاپک خود کار طریقے سے کھول دیا جائے گا %{timeLeft}۔","auto_close":"یہ ٹاپک خود کار طریقے سے بند کر دیا جائے گا %{timeLeft}۔","auto_publish_to_category":"یہ ٹاپک \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e میں شائع کر دیا جائے گا %{timeLeft}۔","auto_delete":"یہ ٹاپک خود کار طریقے سے حذف کر دیا جائے گا %{timeLeft}۔","auto_bump":"یہ ٹاپک خود کار طریقے سے بَمپ کر دیا جائے گا %{timeLeft}۔","auto_reminder":"آپ کو اس ٹاپک کے بارے میں یاد دہانی کرائی جائے گا %{timeLeft}۔"},"auto_close_title":"خود کار طریقے سے بند کر نے کی سیٹِنگ","auto_close_immediate":{"one":"ٹاپک کی آخری پوسٹ ابھی سے %{count} گھنٹا پرانی ہے، اِسلیئے ٹاپک فوری طور پر بند کر دیا جائے گا۔","other":"ٹاپک کی آخری پوسٹ ابھی سے %{count} گھنٹے پرانی ہے، اِسلیئے ٹاپک فوری طور پر بند کر دیا جائے گا۔"},"timeline":{"back":"واپس","back_description":"آپنی آخری بغیر پڑھی پوسٹ پر واپس جائیں","replies_short":"%{current}/ %{total} "},"progress":{"title":"ٹاپک پیش رَفت","go_top":"سب سے اوپر","go_bottom":"سب سے نیچے","go":"جائیں","jump_bottom":"آخری پوسٹ پر جائیں","jump_prompt":"پر جائیں...","jump_prompt_long":"پر جائیں...","jump_bottom_with_number":"پوسٹ %{post_number} پر جائیں","jump_prompt_to_date":"اِس تاریخ تک","jump_prompt_or":"یا ","total":"کُل پوسٹس","current":"موجودہ پوسٹ"},"notifications":{"title":"آپ کو اس ٹاپک کے بارے میں کتنی بار مطلع کیا جاتا ہے، تبدیل کریں","reasons":{"mailing_list_mode":"آپ نے میلنگ لسٹ مَوڈ فعال کیا ہوا ہے، لہذا آپ کو اِی میل کے ذریعے اِس ٹاپک پر جوابات سے مطلع کردیا جائے گا۔","3_10":"آپ کو اطلاعات موصول ہوں گی کیونکہ آپ اِس ٹاپک پر موجود ایک ٹیگ دیکھ رہے ہیں۔","3_6":"آپ کو اطلاعات موصول ہوں گی کیونکہ آپ یہ زمرہ دیکھ رہے ہیں۔","3_5":"آپ کو اطلاعات موصول ہوں گی کیونکہ آپ نے خودکار طریقے سے اِس ٹاپک کو دیکھنا شروع کر دیا۔","3_2":"آپ کو اطلاعات موصول ہوں گی کیونکہ آپ اِس ٹاپک کو دیکھ رہے ہیں۔","3_1":"آپ کو اطلاعات موصول ہوں گی کیونکہ آپ نے یہ ٹاپک بنایا ہے۔","3":"آپ کو اطلاعات موصول ہوں گی کیونکہ آپ اِس ٹاپک کو دیکھ رہے ہیں۔","2_8":"آپ نئے جوابات کا شمار دیکھ سکیں گے کیونکہ آپ اِس زمرہ کو ٹرَیک کر رہے ہیں۔","2_4":"آپ نئے جوابات کا شمار دیکھ سکیں گے کیونکہ آپ نے اِس ٹاپک پر ایک جواب پوسٹ کیا۔","2_2":"آپ نئے جوابات کا شمار دیکھ سکیں گے کیونکہ آپ اِس ٹاپک کو ٹرَیک کر رہے ہیں۔","2":"You will see a count of new replies because you \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eread this topic\u003c/a\u003e.","1_2":"اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔","1":"اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔","0_7":"آپ اِس زمرہ میں تمام اطلاعات کو نظر انداز کر رہے ہیں۔","0_2":"آپ اِس ٹاپک کی تمام اطلاعات کو نظر انداز کر رہے ہیں۔","0":"آپ اِس ٹاپک کی تمام اطلاعات کو نظر انداز کر رہے ہیں۔"},"watching_pm":{"title":"نظر رکھی ہوئی ہے","description":"آپ کو اِس پیغام میں ہر نئے جواب کے بارے میں مطلع کیا جائے گا، اور نئے جوابات کی گنتی دیکھائی جائے گی۔"},"watching":{"title":"نظر رکھی ہوئی ہے","description":"آپ کو اِس ٹاپک میں ہر نئے جواب کے بارے میں مطلع کیا جائے گا، اور نئے جوابات کی گنتی دیکھائی جائے گی۔"},"tracking_pm":{"title":"ٹریک کیا جا رہا","description":"اِس پیغام پر نئے جوابات کی گنتی دیکھائی جائے گی۔ اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔"},"tracking":{"title":"ٹریک کیا جا رہا","description":"اِس ٹاپک پر نئے جوابات کی گنتی دیکھائی جائے گی۔ اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔"},"regular":{"title":"عمومی","description":"اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔"},"regular_pm":{"title":"عمومی","description":"اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔"},"muted_pm":{"title":"خاموش کِیا ہوا","description":"آپ کو اِس پیغام کی کسی بھی چیز کے بارے میں کبھی بھی مطلع نہیں کیا جائے گا۔"},"muted":{"title":"خاموش کِیا ہوا","description":"آپ کو اِس ٹاپک کی کسی بھی چیز کے بارے میں کبھی بھی مطلع نہیں کیا جائے گا، اور یہ تازہ ترین میں بھی نظر نہیں آئے گا۔"}},"actions":{"title":"عوامل","recover":"ٹاپک غیر حذف کریں","delete":"ٹاپک حذف کریں","open":"ٹاپک کھولیں","close":"ٹاپک بند کریں","multi_select":"پوسٹس منتخب کریں...","timed_update":"ٹاپک ٹائمر مقرر کریں...","pin":"ٹاپک پِن کریں...","unpin":"ٹاپک سے پِن ہٹائیں...","unarchive":"ٹاپک آرکائیو سے ختم کریں","archive":"ٹاپک آرکائیو کریں","invisible":"غیر مندرج بنائیں","visible":"مندرج بنائیں","reset_read":"\"پڑھ لیا گیا\" کا ڈیٹا رِی سَیٹ کریں","make_public":"ٹاپک پبلک بنائیں","make_private":"ذاتی پیغام بنائیں","reset_bump_date":"بَمپ تاریخ رِی سَیٹ کریں"},"feature":{"pin":"ٹاپک پِن کریں","unpin":"ٹاپک سے پِن ہٹائیں","pin_globally":"عالمی سطح پر ٹاپک پِن کریں","make_banner":"بینر ٹاپک","remove_banner":"بینر ٹاپک ہٹائیں"},"reply":{"title":"جواب","help":"اس ٹاپک کا جواب لکھنا شروع کریں"},"clear_pin":{"title":"پِن صاف کریں","help":"اِس ٹاپک کے پِن کا درجہ ہٹائیں تاکہ یہ آپ کے ٹاپکس کی فہرست کے سب سے اوپر ظاہر نہ ہو"},"share":{"title":"شیئر","extended_title":"لِنک شیئر کریں","help":"اِس ٹاپک کا لنک شئیر کریں"},"print":{"title":"پرنٹ","help":"اس ٹاپک کا \"پرنٹر فرینڈلی\" ورژن کھولیں"},"flag_topic":{"title":"فلَیگ","help":"اس ٹاپک پر توجہ کے لئے نجی طور پر اِسے فلَیگ کریں یا اس کے بارے میں ایک نجی نوٹیفکیشن بھیجیں","success_message":"آپ نے کامیابی سے اِس ٹاپک کو فلَیگ کیا"},"make_public":{"title":"پبلک ٹاپک میں تبدیل کریں","choose_category":"براہ کرم پبلک ٹاپک کیلئے ایک زمرہ منتخب کریں:"},"feature_topic":{"title":"اس ٹاپک کو نمایاں کریں","pin":"اِس ٹاپک کو %{categoryLink} زمرہ کے سب سے اُپر ظاہر کریں جب تک کہ","unpin":"اِس ٹاپک کو %{categoryLink} زمرہ کے سب سے اُپر ظاہر کرنے سے ہٹائیں","unpin_until":"اِس ٹاپک کو %{categoryLink} زمرہ کے سب سے اُپر ظاہر کرنے سے ہٹائیں یا \u003cstrong\u003e%{until}\u003c/strong\u003e تک اِنتظار کریں۔","pin_note":"صارفین خود سے انفرادی طور پر ٹاپک سے پن ہٹا سکتے ہیں۔","pin_validation":"اس ٹاپک کو پِن کرنے کیلئے ایک تاریخ کی ضرورت ہے۔","not_pinned":"%{categoryLink} میں کوئی ٹاپک پِن نہیں ہیں۔","already_pinned":{"one":"فی الحال %{categoryLink} میں پِن ہوے ٹاپک: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"فی الحال %{categoryLink} میں پِن ہوے ٹاپک: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"اِس ٹاپک کو تمام ٹاپکس کی فہرست کے سب سے اُپر ظاہر کریں جب تک کہ","unpin_globally":"اِس ٹاپک کو تمام ٹاپکس کی فہرست کے سب سے اُپر ظاہر کرنے سے ہٹائیں","unpin_globally_until":"اِس ٹاپک کو تمام ٹاپکس کی فہرست کے سب سے اُپر ظاہر کرنے سے ہٹائیں یا \u003cstrong\u003e%{until}\u003c/strong\u003e تک اِنتظار کریں۔","global_pin_note":"صارفین خود سے انفرادی طور پر ٹاپک سے پن ہٹا سکتے ہیں۔","not_pinned_globally":"کوئی ٹاپک عالمی سطح پر پِن نہیں ہوئے ہیں۔","already_pinned_globally":{"one":"فی الحال عالمی سطح پر پِن ہوئے ٹاپک: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"فی الحال عالمی سطح پر پِن ہوئے ٹاپک: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"اِس ٹاپک کو ایک بَینر بنا دیں جو تمام صفحات کے سب سے اوپر ظاہر ہو۔","remove_banner":"بَینر ہٹا دیں جو تمام صفحات کے سب سے اوپر ظاہر ہوتا ہے۔","banner_note":"صارفین بینر کو بند کرکے اِسے برطرف کر سکتے ہیں۔ آیک وقت میں صرف ایک ٹاپک کو بینر بنایا جا سکتا ہے۔","no_banner_exists":"کوئی بینر ٹاپک موجود نہیں ہیں۔","banner_exists":"فی الحال ایک بینر ٹاپک \u003cstrong class='badge badge-notification unread'\u003eموجود\u003c/strong\u003e ہے۔"},"inviting":"دعوت دی جا رہی ہے...","automatically_add_to_groups":"اِس دعوت نامہ میں اِن گروپوں تک رسائی بھی شامل ہے:","invite_private":{"title":"پیغام میں مدعو کریں","email_or_username":"مدعو کی اِی میل یا صارف نام","email_or_username_placeholder":"اِی میل ایڈریس یا صارف نام","action":"دعوت دیں","success":"ہم نے اِس پیغام میں حصہ لینے کے لئے اُس صارف کو مدعو کیا ہے۔","success_group":"ہم نے اِس پیغام میں حصہ لینے کے لئے اُس گروپ کو مدعو کیا ہے۔","error":"معذرت، اُس صارف کو مدعو کرتے وقت ایک تکنیکی خرابی کا سامنا کرنا پڑا","group_name":"گروپ نام"},"controls":"ٹاپک کنٹرولز","invite_reply":{"title":"دعوت","username_placeholder":"صارف نام","action":"دعوت بھیجیں","help":"اِی میل یا اطلاعات کے ذریعے اس ٹاپک کے لیے دوسروں کو مدعو کریں","to_topic_blank":"اُس شخص کا صارف نام یا اِیمیل ایڈریس درج کریں جسے آپ اِس ٹاپک میں مدعو کرنا چاہتے ہیں۔","to_topic_email":"آپ نے ایک اِیمیل ایڈریس درج کیا ہے۔ ہم ایک دعوت نامہ اِیمیل کریں گے جس سے آپ کے دوست کو فوری طور پر اِس ٹاپک پر جواب دینے کی اجازت مل جائے گی۔","to_topic_username":"آپ نے ایک صارف نام درج کیا ہے۔ ہم اِطلاع کے طور پر اُنہیں ایک لنک بھیجیں گے جس میں اِس ٹاپک کیلئے اُنہیں مدعو کیا جائے گا۔","to_username":"اُس شخص کا صارف نام درج کریں جسے آپ اِس ٹاپک میں مدعو کرنا چاہتے ہیں۔ ہم اِطلاع کے طور پر اُنہیں ایک لِنک بھیجیں گے جس میں اِس ٹاپک کیلئے اُنہیں مدعو کیا جائے گا۔","email_placeholder":"name@example.com","success_username":"ہم نے اِس ٹاپک میں حصہ لینے کے لئے اُس صارف کو مدعو کیا ہے۔","error":"معزرت، ہم اس شخص کو دعوت نہ دے سکے۔ شاید وہ پہلے ہی مدعو کیے جا چکے ہیں؟ (دعوتیں شرح محدود ہیں)","success_existing_email":"آیک صارف \u003cb\u003e%{emailOrUsername}\u003c/b\u003e والے ای میل کے ساتھ پہلے ہی موجود ہے۔ ہم نے اِس ٹاپک میں حصہ لینے کے لئے اُس صارف کو مدعو کر دیا ہے۔"},"login_reply":"جواب دینے کیلئے لاگ اِن کریں","filters":{"n_posts":{"one":"%{count} پوسٹ","other":"%{count} پوسٹس"},"cancel":"فِلٹر ہٹائیں"},"move_to":{"title":"میں منتقل کریں","action":"میں منتقل کریں","error":"پوسٹس منتقل کرنے میں ایک خرابی کا سامنا کرنا پڑا۔"},"split_topic":{"title":"نئے ٹاپک پر منتقل کریں","action":"نئے ٹاپک پر منتقل کریں","topic_name":"نیا ٹاپک عنوان","radio_label":"نیا ٹاپک","error":"نئے ٹاپک پر پوسٹس منتقل کرنے میں ایک خرابی کا سامنا کرنا پڑا۔","instructions":{"one":"آپ ایک نیا ٹاپک بنانے اور اپنی منتخب کردہ پوسٹ سے اِسے آباد کرنے والے ہیں۔","other":"آپ ایک نیا ٹاپک بنانے اور اپنی منتخب کردہ \u003cb\u003e%{count}\u003c/b\u003e پوسٹس سے اِسے آباد کرنے والے ہیں۔"}},"merge_topic":{"title":"موجودہ ٹاپک میں منتقل کریں","action":"موجودہ ٹاپک میں منتقل کریں","error":"اس ٹاپک میں پوسٹس منتقل کرنے میں ایک خرابی کا سامنا کرنا پڑا۔","radio_label":"موجودہ ٹاپک","instructions":{"one":"براہ مہربانی، وہ ٹاپک منتخب کریں جس میں آپ وہ پوسٹ منتقل کرنا چاہتے ہیں۔","other":"براہ مہربانی، وہ ٹاپک منتخب کریں جس میں آپ \u003cb\u003e%{count}\u003c/b\u003e پوسٹس منتقل کرنا چاہتے ہیں۔"}},"move_to_new_message":{"title":"نئے پیغام پر منتقل کریں","action":"نئے پیغام پر منتقل کریں","message_title":"نیا پیغام عنوان","radio_label":"نیا پیغام","participants":"شرکاء","instructions":{"one":"آپ ایک نیا پیغام بنانے اور اپنی منتخب کردہ پوسٹ سے اِسے آباد کرنے والے ہیں۔","other":"آپ ایک نیا پیغام بنانے اور اپنی منتخب کردہ \u003cb\u003e%{count}\u003c/b\u003e پوسٹس سے اِسے آباد کرنے والے ہیں۔"}},"move_to_existing_message":{"title":"موجودہ پیغام میں منتقل کریں","action":"موجودہ پیغام میں منتقل کریں","radio_label":"موجودہ پیغام","participants":"شرکاء","instructions":{"one":"براہ مہربانی، وہ پیغام منتخب کریں جس میں آپ وہ پوسٹ منتقل کرنا چاہتے ہیں۔","other":"براہ مہربانی، وہ پیغام منتخب کریں جس میں آپ \u003cb\u003e%{count}\u003c/b\u003e پوسٹس منتقل کرنا چاہتے ہیں۔"}},"merge_posts":{"title":"منتخب کردہ پوسٹس کو ضم کریں","action":"منتخب کردہ پوسٹس کو ضم کریں","error":"منتخب کردہ پوسٹس کو ضم کرنے میں ایک خرابی کا سامنا کرنا پڑا۔"},"publish_page":{"public":"عوامی"},"change_owner":{"title":"مالک تبدیل کریں","action":"پوسٹس کے مالک کو تبدیل کریں","error":"پوسٹس کے مالک کو تبدیل کرنے میں ایک خرابی کا سامنا کرنا پڑا۔","placeholder":"نئے مالک کا صارف نام","instructions":{"one":"براہ مہربانی، \u003cb\u003e%{old_user}\u003c/b\u003e کی پوسٹ کے نئے مالک کو منتخب کریں۔","other":"براہ مہربانی، \u003cb\u003e%{old_user}\u003c/b\u003e کی %{count} پوسٹس کے نئے مالک کو منتخب کریں۔"}},"change_timestamp":{"title":"ٹائمسٹیمپ تبدیل کریں...","action":"ٹائمسٹیمپ تبدیل کریں","invalid_timestamp":"ٹائمسٹیمپ مستقبل میں نہیں ہو سکتا۔","error":"ٹاپک کا ٹائمسٹیمپ تبدیل کرنے میں ایک خرابی کا سامنا کرنا پڑا۔","instructions":"براہ مہربانی ٹاپک کیلیئے نیا ٹائمسٹیمپ منتخب کریں۔ وقت کا فرق برابر رکھنے کیلیے ٹاپک میں پوسٹس کو اَپ ڈیٹ کر دیا جائے گا۔"},"multi_select":{"select":"منتخب","selected":"منتخب کردہ (%{count})","select_post":{"label":"منتخب","title":"انتخاب کیے ہوے میں پوسٹ شامل کریں"},"selected_post":{"label":"منتخب کیا ہوا","title":"منتخب کیے ہوے سے پوسٹ کو ہٹانے کیلئے کلک کریں"},"select_replies":{"label":"منتخب +جوابات","title":"منتخب کیے ہوے میں پوسٹ اور اِس کے تمام جوابات شامل کریں"},"select_below":{"label":"منتخب+ذیل میں","title":"منتخب کیے ہوے میں پوسٹ اور اِس کے بعد تمام شامل کریں"},"delete":"منتخب کیے ہوں کو حذف کریں","cancel":"انتخاب کرنا منسوخ کریں","select_all":"تمام منتخب کریں","deselect_all":"تمام غیر منتخب کریں","description":{"one":"آپ نے \u003cb\u003e%{count}\u003c/b\u003e پوسٹ منتخب کی ہے۔","other":"آپ نے \u003cb\u003e%{count}\u003c/b\u003e پوسٹس منتخب کی ہیں۔"}},"deleted_by_author":{"one":"(مصنف نے ٹاپک واپس لے لیا، %{count} گھنٹے میں یہ خود کار طریقے سے حذف کر دیا جائے گا الا یہ کہ اِسے فلیگ کیا گیا ہو)","other":"(مصنف نے ٹاپک واپس لے لیا، %{count} گھنٹوں میں یہ خود کار طریقے سے حذف کر دیا جائے گا الا یہ کہ اِسے فلیگ کیا گیا ہو)"}},"post":{"quote_reply":"اقتباس کریں","edit_reason":"وجہ:","post_number":"پوسٹ %{number}","ignored":"نظر انداز کردہ مواد","reply_as_new_topic":"منسلک ٹاپک کے طور پر جواب دیں","reply_as_new_private_message":"اُنہی وصول کنندگان کو نئے پیغام کے طور پر جواب دیں","continue_discussion":"%{postLink} سے بحث جاری:","follow_quote":"اقتباس کی گئی پوسٹ پر جائیں","show_full":"مکمل پوسٹ دکھائیں","show_hidden":"نظر انداز کردہ مواد دکھایں۔","deleted_by_author":{"one":"(مصنف نے پوسٹ واپس لے لی، %{count} گھنٹے میں یہ خود کار طریقے سے حذف کر دی جائے گی الا یہ کہ اِسے فلیگ کیا گیا ہو)","other":"(مصنف نے پوسٹ واپس لے لی، %{count} گھنٹوں میں یہ خود کار طریقے سے حذف کر دی جائے گی الا یہ کہ اِسے فلیگ کیا گیا ہو)"},"collapse":"بند کریں","expand_collapse":"کھولیں/بند کریں","locked":"ایک اسٹاف کے رکن نے اِس پوسٹ کو ترمیم ہونے سے روک دیا ہے","gap":{"one":"%{count} چھپایا ہوا جواب دیکھیں","other":"%{count} چھپائے ہوے جوابات دیکھیں"},"notice":{"new_user":"یہ پہلی مرتبہ ہے کہ %{user} نے پوسٹ کیا ہے — ہمیں اِن کو کمیونٹی میں خوش آمدید کہنا چاہئے!","returning_user":"کافی دیر ہو گئی ہے جب ہم نے %{user} کو دیکھا تھا — اُن کی آخری پوسٹ %{time} کو تھی۔"},"unread":"پوسٹ بغیر پڑھی ہے","has_replies":{"one":"%{count} جواب","other":"%{count} جوابات"},"has_likes_title":{"one":"%{count} شخص نے اِس پوسٹ کو لائیک کیا","other":"%{count} لوگوں نے اِس پوسٹ کو لائیک کیا"},"has_likes_title_only_you":" آپ نے اِس پوسٹ کو لائیک کیا","has_likes_title_you":{"one":"آپ اور %{count} دوسرے شخص نے اِس پوسٹ کو لائیک کیا","other":"آپ اور %{count} دوسرے لوگوں نے اِس پوسٹ کو لائیک کیا"},"errors":{"create":"معذرت، آپ کی پوسٹ بنانے میں ایک خرابی کا سامنا کرنا پڑا۔ براہ مہربانی دوبارہ کوشش کریں۔","edit":"معذرت، آپ کی پوسٹ ترمیم کرنے میں ایک خرابی کا سامنا کرنا پڑا۔ براہ مہربانی دوبارہ کوشش کریں۔","upload":"معذرت، یہ فائل اَپ لوڈ کرنے میں ایک خرابی کا سامنا کرنا پڑا۔ براہ مہربانی دوبارہ کوشش کریں۔","file_too_large":"معذرت، یہ فائل بہت بڑی ہے (زیادہ سے زیادہ سائز %{max_size_kb}kb) ہے۔ کیوں نہ آپ اپنی بڑی فائل ایک کلاؤڈ شیئرنگ سروس پر اَپ لوڈ کریں اور اس کا لنک پَیسٹ کریں؟","too_many_uploads":"معذرت، آپ ایک وقت میں صرف ایک ہی فائل اَپ لوڈ کر سکتے ہیں۔","upload_not_authorized":"معذرت، جو فائل آپ اَپ لوڈ کرنے کے کوشش کر رہے ہیں اُس کی اجازت نہیں ہے (اجازت یافتہ ایکسٹینشنز: %{authorized_extensions})۔","image_upload_not_allowed_for_new_user":"معذرت، نئے صارفین تصاویر اَپ لوڈ نہیں کر سکتے۔","attachment_upload_not_allowed_for_new_user":"معذرت، نئے صارفین اٹیچمنٹس اَپ لوڈ نہیں کر سکتے۔","attachment_download_requires_login":"معذرت، اٹیچمنٹس ڈائونلوڈ کرنے کیلیے آپ کا لاگ اِن ہونا ضروری ہے۔"},"abandon_edit":{"no_value":"نہیں، رکھیں","no_save_draft":"نہیں، ڈرافٹ محفوظ کریں"},"abandon":{"confirm":"کیا آپ واقعی اپنی پوسٹ کو تَرک کرنا چاہتے ہیں؟","no_value":"نہیں، رکھیں","no_save_draft":"نہیں، ڈرافٹ محفوظ کریں","yes_value":"جی ہاں، تَرک کریں"},"via_email":"یہ پوسٹ بذریعہ اِی میل پہنچی","via_auto_generated_email":"یہ پوسٹ ایک خود کار طریقے سے تخلیق کردہ اِی میل کے ذریعے پہنچی","whisper":"یہ پوسٹ ماڈریٹرز کے لئے ایک نجی وِھسپر ہے","wiki":{"about":"یہ پوسٹ ایک وِیکی ہے"},"archetypes":{"save":"محفوظ کرنے کے اختیارات"},"few_likes_left":"محبت شیئر کرنے کے لئے شکریہ! آپ کے پاس آج کے لئے صرف چند لائیکس بچے ہیں۔","controls":{"reply":"اس پوسٹ کا جواب لکھنا شروع کریں","like":" اِس پوسٹ کو لائیک کریں","has_liked":" آپ اِس پوسٹ کو لائیک کر چکے ہیں","read_indicator":"ممبران جنہوں نے اِس پوسٹ کو پڑھ لیا","undo_like":"لائیک کالعدم کریں","edit":" اِس پوسٹ کو ترمیم کریں","edit_action":"ترمیم","edit_anonymous":"معذرت، اِس پوسٹ کو ترمیم کرنے کیلیے آپ کا لاگ اِن ہونا ضروری ہے۔","flag":"اس پوسٹ پر توجہ کے لئے اِسے نجی طور پر فلَیگ کریں یا اس کے بارے میں ایک نجی نوٹیفکیشن بھیجیں","delete":"اِس پوسٹ کو حذف کریں","undelete":" اِس پوسٹ کو واپس لائیں","share":"اس پوسٹ کا لنک شیئرکریں","more":"مزید ","delete_replies":{"confirm":"کیا آپ اِس پوسٹ پر جوابات بھی حذف کرنا چاہتے ہیں؟","direct_replies":{"one":"جی ہاں، اور براہ راست %{count} جواب","other":"جی ہاں، اور براہ راست %{count} جوابات"},"all_replies":{"one":"جی ہاں، اور %{count} جواب","other":"جی ہاں، اور تمام %{count} جوابات"},"just_the_post":"نہیں، صرف یہ پوسٹ"},"admin":"پوسٹ ایڈمن کے ایکشن","wiki":"وِیکی بنائیں","unwiki":"وِیکی ختم کریں","convert_to_moderator":"اسٹاف رنگ شامل کریں","revert_to_regular":"اسٹاف رنگ ختم کریں","rebake":"HTML دوبارہ بِلڈ کریں","unhide":"چھپانا ختم کریں","change_owner":"پوسٹس کے مالک کو تبدیل کریں","grant_badge":"بَیج دیں","lock_post":"پوسٹ لاک کریں","lock_post_description":"شائع کرنے والے کو اِس پوسٹ میں ترمیم کرنے سے روک دیں","unlock_post":"پوسٹ کھول دیں","unlock_post_description":"شائع کرنے والے کو اِس پوسٹ میں ترمیم کرنے کی اجازت دیں","delete_topic_disallowed_modal":"آپ کے پاس اِس ٹاپک کو حذف کرنے کی اجازت نہیں ہے۔ اگر آپ واقعی اِسے حذف کروانا چاہتے ہیں تو، استدلال کے ساتھ ماڈریٹر کی توجہ کیلئے فلَیگ جمع کریں۔","delete_topic_disallowed":"آپ کے پاس اِس ٹاپک کو حذف کرنے کی اجازت نہیں ہے۔","delete_topic":"ٹاپک حذف کریں","add_post_notice":"اسٹاف نوٹِس شامل کریں","remove_timer":"ٹائمر ہٹائیں"},"actions":{"people":{"like_capped":{"one":"اور %{count} دوسرے شخص نے اِس کو لائیک کیا","other":"اور %{count} دوسرے لوگوں نے اِس کو لائیک کیا"}},"by_you":{"off_topic":"آپ نے اِس کو موضوع سے ہٹ کر ہونے کے طور پر فلَیگ کیا","spam":"آپ نے اِس کو سپَیم ہونے کے طور پر فلَیگ کیا","inappropriate":"آپ نے اِس کو نامناسب ہونے کے طور پر فلَیگ کیا","notify_moderators":"آپ نے اِس کو اعتدال کیلئے فلَیگ کیا","notify_user":"آپ نے اِس صارف کو پیغام بھیجا"}},"delete":{"confirm":{"one":"کیا آپ واقعی اُس پوسٹ کو حذف کرنا چاہتے ہیں؟","other":"کیا آپ واقعی ان %{count} پوسٹس کو حذف کرنا چاہتے ہیں؟"}},"merge":{"confirm":{"one":"کیا آپ واقعی ان پوسٹس کو ضم کرنا چاہتے ہیں؟","other":"کیا آپ واقعی ان %{count} پوسٹس کو ضم کرنا چاہتے ہیں؟"}},"revisions":{"controls":{"first":"پہلی رَوِیژن","previous":"پچھلی رَوِیژن","next":"اگلی رَوِیژن","last":"آخری رَوِیژن","hide":"رَوِیژن چھپائیں","show":"رَوِیژن دکھائیں","edit_wiki":"وِیکی میں ترمیم کریں","edit_post":"پوسٹ میں ترمیم کریں","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"پیش کیا گیا نتیجہ اضافوں اور کمیوں کو ساتھ اِن لائن دکھائیں","button":"HTML"},"side_by_side":{"title":"پیش کیے گیے نتیجہ کے اختلافات ساتھ ساتھ دکھائیں","button":"HTML"},"side_by_side_markdown":{"title":"رَا سورس کے اختلافات ساتھ ساتھ دکھائیں","button":"رَا"}}},"raw_email":{"displays":{"raw":{"title":"رَا اِی میل دکھائیں","button":"رَا"},"text_part":{"title":"ای میل کا ٹیکسٹ متن دکھائیں","button":"ٹیکسٹ"},"html_part":{"title":"ای میل کے متن کا html حصہ دکھائیں","button":"HTML"}}},"bookmarks":{"created":"بنایا گیا","name":"نام"}},"category":{"can":"کر سکتا ہے\u0026hellip; ","none":"(کوئی زمرہ نہیں)","all":"تمام زُمرَہ جات","choose":"زمرہ\u0026hellip;","edit":"ترمیم","edit_dialog_title":"ترمیم: %{categoryName}","view":"زمرہ میں ٹاپکس دیکھیے","general":"عام","settings":"سیٹِنگ","topic_template":"ٹاپک ٹَیمپلیٹ","tags":"ٹیگز","tags_allowed_tags":"اس زُمرہ میں اِن ٹیگز کو محدود کریں:","tags_allowed_tag_groups":"اس زُمرہ میں اِن ٹیگ گروپس کو محدود کریں:","tags_placeholder":"(اختیاری) اجازت والے ٹیگز کی فہرست","tag_groups_placeholder":"(اختیاری) اجازت والے ٹیگ گروپس کی فہرست","allow_global_tags_label":"دوسرے ٹیگز کی بھی اجازت دیں","topic_featured_link_allowed":"اس زمرہ میں نمایاں لنکس کو اجازت دیں","delete":"زمرہ حذف کریں","create":"نیا زمرہ","create_long":"نیا زمرہ بنائیں","save":"زمرہ محفوظ کریں","slug":"زمرہ سلَگ","slug_placeholder":"(اختیاری) URL کے لئے ڈیش دار الفاظ","creation_error":"زمرہ بنانے کے دوران ایک خرابی کا سامنا کرنا پڑا۔","save_error":"زمرہ محفوظ کرنے میں ایک خرابی کا سامنا کرنا پڑا۔","name":"زمرہ کا نام","description":"تفصیل","topic":"زمرہ کا ٹاپک","logo":"زمرہ کے لوگو تصویر","background_image":"زمرہ کے پسِ منظر کی تصویر","badge_colors":"بَیج رنگ","background_color":"پس منظر رنگ","foreground_color":"پیش منظر رنگ","name_placeholder":"زیادہ سے زیادہ ایک یا دو الفاظ","color_placeholder":"کوئی بھی ویب رنگ","delete_confirm":"کیا آپ واقعی اِس زمرہ کو حذف کرنا چاہتے ہیں؟","delete_error":"اِس زمرہ کو حذف کرنے میں ایک خرابی کا سامنا کرنا پڑا۔","list":"زمرہ جات کی فہرست دکھائیں","no_description":"براہ مہربانی اس زمرہ کی تفصیل شامل کریں۔","change_in_category_topic":"تفصیل ترمیم کریں","already_used":"یہ رنگ دوسرے زمرہ کیلیے استعمال ہو چکا ہے۔","security":"سیکورٹی","special_warning":"انتباہ: یہ زمرہ ایک پہلے سے بنایا ہوا زمرہ ہے اور اِس کی سیکورٹی سیٹِنگ میں ترمیم نہیں کی جا سکتی۔ اگر آپ اِس زمرہ کو استعمال کرنے کی خواہش نہیں رکھتے، تو اِسے کسی اور حوالے سے استعمال کرنے کی بجائے، حذف کردیں۔","uncategorized_security_warning":"یہ زمرہ خاص ہے۔ اِس کا مقصد بغیر زمرہ والے ٹاپکس کیلئے جگہ فراہم کرنا ہے؛ اِس میں سیکورٹی کی ترتیبات نہیں ہو سکتیں۔","uncategorized_general_warning":"یہ زمرہ خاص ہے۔ یہ نئے ٹاپکس جن کیلئے کسی زمرہ کا انتخاب نہ ہوا ہو، اُن کیلئے پہلے سے طے شدہ زمرہ کے طور پر استعمال ہوتا ہے۔ اگر آپ اِس رویے کو روکنے اور کسی زمرہ کے انتخاب کو لازمی کرنا چاہتے ہیں، تو \u003ca href=\"%{settingLink}\"\u003eبرائے مہربانی یہاں ترتیب کو غیر فعال کریں\u003c/a\u003e۔ اگر آپ نام یا تفصیل تبدیل کرنا چاہتے ہیں، تو \u003ca href=\"%{customizeLink}\"\u003eمرضی کے مطابق / ٹَیکسٹ متن\u003c/a\u003e پر جائیں۔","pending_permission_change_alert":"آپ نے اِس زمرہ میں %{group} کو شامل نہیں کیا ہے؛ اِن کو شامل کرنے کیلئے اِس بٹن پر کلک کریں۔","images":"تصاویر","email_in":"اپنی مرضی کا اِنکَمِنگ اِیمیل ایڈریس:","email_in_allow_strangers":"اکاؤنٹس نہ رکھنے والے گمنام صارفین کی طرف سے اِیمیلز کو قبول کریں","email_in_disabled":"ویب سائٹ کی سیٹِنگ میں اِیمیل کے ذریعے نئے ٹاپک پوسٹ کرنا غیر فعال کیا ہوا ہے۔ اِیمیل کے ذریعے نئے ٹاپک شائع کرنے کو چالو کرنے کے لئے،","email_in_disabled_click":"سیٹِنگ میں \"اِیمیل اِن\" فعال کریں۔","mailinglist_mirror":"زُمرہ میلنگ فہرست کا عکس ہے","show_subcategory_list":"اس زمرہ میں ذیلی زمرہ جات کی فہرست ٹاپکس سے مندرجہ بالا دکھائیں۔","num_featured_topics":"زمرہ کے صفحے پر دکھائے گئے ٹاپکس کی تعداد:","subcategory_num_featured_topics":"بالائی زمرہ کے صفحے پر دکھائے گئے نمایاں ٹاپکس کی تعداد:","all_topics_wiki":"نئے ٹاپکس کو پہلے ہی سے وِیکی بنائیں","subcategory_list_style":"ذیلی زمرہ جات فہرست کا سٹائل:","sort_order":"پہلے سے طے شدہ ترتیب:","default_view":"پہلے سے طے شدہ ویو:","default_top_period":"پہلے سے طے شدہ ٹاپ کی مدت:","allow_badges_label":"اس زُمرہ میں بیجز دینے کی اجازت دیں","edit_permissions":"ترمیم کرنے کی اجازتیں","review_group_name":"گروپ نام","require_topic_approval":"تمام نئے ٹاپکس کیلئے ماڈریٹر کی منظوری لازمی کریں","require_reply_approval":"تمام نئے جوابات کیلئے ماڈریٹر کی منظوری لازمی کریں","this_year":"اِس سال","position":"زمرہ جات کے صفحے پر پوزیشن:","default_position":"پہلے سے طے شدہ پوزیشن","position_disabled":"ایکٹیوٹی کے ہساب سے زُمرہ جات کی ترتیب دکھائی جائے گی۔ فہرستوں میں زُمرہ جات کی ترتیب کو کنٹرول کرنے کے لئے،","position_disabled_click":"\"مقررہ زمرہ جات پوزیشنوں\" کی سیٹِنگ فعال کریں۔","minimum_required_tags":"ایک ٹاپک میں ضروری ٹیگز کی کم از کم تعداد:","parent":"بالائی زمرہ","num_auto_bump_daily":"روزانہ خود کار طریقے سے بَمپ کرنے کیلئے کھلے ٹاپکس کی تعداد:","navigate_to_first_post_after_read":"ٹاپک پڑھنے کے بعد پہلی پوسٹ پر جائیں","notifications":{"watching":{"title":"نظر رکھی ہوئی ہے"},"watching_first_post":{"title":"پہلی پوسٹ پر نظر رکھی ہوئی ہے","description":"آپ کو اِس زمرہ میں نئے ٹاپکس کے بارے میں مطلع کیا جائے گا لیکن ٹاپکس کے جوابات پر نہیں۔"},"tracking":{"title":"ٹریک کیا جا رہا"},"regular":{"title":"عمومی","description":"اگر کوئی آپ کا @نام زکر کرتا ہے یا کوئی جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔"},"muted":{"title":"خاموش کِیا ہوا"}},"search_priority":{"label":"سرچ ترجیحات","options":{"normal":"عمومی","ignore":"نظر انداز کریں","very_low":"بہت کم","low":"کم","high":"زیادہ","very_high":"بہت زیادہ"}},"sort_options":{"default":"پہلے سے طے شدہ","likes":"لائیکس","op_likes":"اصل پوسٹ کے لائیکس","views":"وِیوز","posts":"پوسٹس","activity":"سرگرمی","posters":"پوسٹ کرنے والے","category":"زمرہ","created":"بنایا گیا"},"sort_ascending":"ترتیب صعودی","sort_descending":"ترتیب نزولی","subcategory_list_styles":{"rows":"سطریں","rows_with_featured_topics":"نمایاں ٹاپک والی سطریں","boxes":"خانے","boxes_with_featured_topics":"نمایاں ٹاپک والے خانے"},"settings_sections":{"general":"عام","moderation":"ماڈریٹر کا کام","appearance":"ظاہری شکل","email":"اِی میل"}},"flagging":{"title":"ہماری کمیونٹی کو مہذب رکھنے کے لئے مدد کا شکریہ!","action":"پوسٹ فلَیگ کریں","notify_action":"پیغام","official_warning":"آفیشل انتباہ","delete_spammer":"سپیم کرنے والے کو حذف کریں","yes_delete_spammer":"جی ہاں، سپیم کرنے والے کو حذف کریں","ip_address_missing":"(N/A)","hidden_email_address":"(مخفی)","submit_tooltip":"نجی فلَیگ جمع کریں","take_action_tooltip":"بجائے مزید کمیونٹی کی طرف سے فلَیگز کا انتظارکرنے کے، فوری طور پرفلَیگز کی حد تک پہنچ جائیں","cant":"معذرت، آپ اِس وقت اِس پوسٹکو فلَیگ نہیں کر سکتے۔","notify_staff":"عملے کو نجی طور پر مطلع کریں","formatted_name":{"off_topic":"یہ موضوع سے ہٹ کر ہے","inappropriate":"یہ نامناسب ہے","spam":"یہ سپَیم ہے"},"custom_placeholder_notify_user":"مخصوص ہوں، تعمیری ہوں، اور ہمیشہ مہربانی والا رویہ رکھیں۔","custom_placeholder_notify_moderators":"ہمیں خاص طور پر اُس چیز کے بارے میں مطلع کریں جس سے آپ فکر مند ہیں، اور جہاں ممکن ہو سکے متعلقہ لنکس اور مثالیں فراہم کریں۔","custom_message":{"at_least":{"one":"کم از کم %{count} حرف درج کریں","other":"کم از کم %{count} حروف درج کریں"},"more":{"one":"%{count} اور آگے بچا ہے...","other":"%{count} اور آگے بچے ہیں..."},"left":{"one":"%{count} باقی رہتا ہے...","other":"%{count} باقی رہتے ہیں..."}}},"flagging_topic":{"title":"ہماری کمیونٹی کو مہذب رکھنے کے لئے مدد کا شکریہ!","action":"ٹاپک فلَیگ کریں","notify_action":"پیغام"},"topic_map":{"title":"ٹاپک خلاصہ","participants_title":"اکثر پوسٹ کرنے والے","links_title":"مقبول لنکس","links_shown":"مزید لِنکس دکھایے","clicks":{"one":"%{count} کلک","other":"%{count} کلکس"}},"post_links":{"about":"اِس پوسٹ کے لئے مزید لنکس دکھائیں","title":{"one":"%{count} مزید","other":"%{count}مزید "}},"topic_statuses":{"warning":{"help":"یہ ایک آفیشل انتباہ ہے۔"},"bookmarked":{"help":"آپ نے اِس ٹاپک کو بُک مارک کیا"},"locked":{"help":"یہ ٹاکپ بند کر دیا گیا ہے؛ یہ مزید کوئی نئے جوابات قبول نہیں کرتا"},"archived":{"help":"یہ ٹاکپ آرکائیو کیا ہوا ہے؛ یہ منجمد ہے اور تبدیل نہیں کیا جاسکتا"},"locked_and_archived":{"help":"یہ ٹاکپ آرکائیو اور بند کیا ہوا ہے؛ یہ مزید کوئی نئے جوابات قبول نہیں کرتا اور تبدیل نہیں کیا جاسکتا"},"unpinned":{"title":"پن ہٹایا ہوا","help":"یہ ٹاپک آپ کے لئے پِن سے ہٹایا ہوا ہے؛ یہ معمول کے طور پر فہرست میں ظاہر ہو گا"},"pinned_globally":{"title":"عالمی سطح پر پِن کیا ہوا","help":"یہ ٹاپک عالمی سطح پر پِن کیا ہوا ہے؛ یہ تازہ ترین اور اپنے زمرہ کے سب سے اوپر دکھائی دے گا"},"pinned":{"title":"پِن ہوا","help":"یہ ٹاپک عالمی سطح پر پِن کیا ہوا ہے؛ یہ اپنے زمرہ کے سب سے اوپر دکھائی دے گا"},"unlisted":{"help":"یہ ٹاپک غیر کسی فہرست میں نہیں ہے؛ یہ ٹاپکس کی فہرست میں ظاہر نہیں ہو گا، اور صرف ایک براہ راست لنک کے ذریعے اِس تک رسائی ہو سکے گی"},"personal_message":{"title":"یہ ٹاپک ایک ذاتی پیغام ہے","help":"یہ ٹاپک ایک ذاتی پیغام ہے"}},"posts":"پوسٹس","original_post":"اصل پوسٹ","views":"وِیوز","views_lowercase":{"one":"وِیو","other":"وِیوز"},"replies":"جوابات","views_long":{"one":"اِس ٹاپک کو %{count} دفعہ دیکھا جا چکا ہے","other":"اِس ٹاپک کو %{number} دفعہ دیکھا جا چکا ہے"},"activity":"سرگرمی","likes":"لائیکس","likes_lowercase":{"one":"لائیک","other":"لائیکس"},"users":"صارفین","users_lowercase":{"one":"صارف","other":"صارفین"},"category_title":"زمرہ","history":"ہسٹری","changed_by":"%{author} کی طرف سے","raw_email":{"title":"آنے والی اِیمیل","not_available":"دستیاب نہیں ہے!"},"categories_list":"زمرہ جات فہرست","filters":{"with_topics":"%{filter} ٹاپک","with_category":"%{filter} %{category} ٹاپک","latest":{"title":"تازہ ترین","title_with_count":{"one":"تازہ ترین (%{count})","other":"تازہ ترین (%{count})"},"help":"حالیہ پوسٹ والے ٹاپک"},"read":{"title":"پڑھیں","help":"ٹاپک جو آپ نے پڑھے ہوے ہیں، اُس ترتیب میں جس میں آپ نے انہیں آخری دفعہ پڑھا تھا"},"categories":{"title":"زُمرَہ جات","title_in":"زمرہ - %{categoryName}","help":"تمام ٹاپک زمرہ کے لحاظ سے گروپ کیے گئے"},"unread":{"title":"بغیر پڑھے","title_with_count":{"one":"بغیر پڑھا (%{count})","other":"بغیر پڑھے (%{count})"},"help":" ٹاپک جن پر فی الحال آپ نے نظر رکھی ہوئی ہے یا بغیر پڑھی پوسٹس کے ساتھ ٹریک کر رہے ہیں","lower_title_with_count":{"one":"%{count} بغیر پڑھا ہوا","other":"%{count} بغیر پڑھے ہوئے"}},"new":{"lower_title_with_count":{"one":"%{count} نیا","other":"%{count} نئے"},"lower_title":"نئے","title":"نیا","title_with_count":{"one":"نیا (%{count})","other":"نئے (%{count})"},"help":"پچھلے چند دنوں میں بنائے گئے ٹاپک"},"posted":{"title":"میری پوسٹ","help":"ٹاپک جن میں آپ نے پوسٹ کیا ہے"},"bookmarks":{"title":"بُکمارکس","help":"ٹاپک جن کو آپ نے بُک مارک کیا ہے"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"%{categoryName} زمرہ میں تازہ تریں ٹاپک"},"top":{"title":"سب سے اوپر","help":"گزشتہ سال، مہینے، ہفتے یا دن میں سب سے سرگرم ترین ٹاپک","all":{"title":"تمام اوقات"},"yearly":{"title":"سالانہ"},"quarterly":{"title":"سہ ماہی"},"monthly":{"title":"ماہانہ"},"weekly":{"title":"ہفتہ وار"},"daily":{"title":"روزانہ "},"all_time":"تمام اوقات","this_year":"سال","this_quarter":"سہ ماہ","this_month":"مہینہ","this_week":"ہفتہ","today":"آج"}},"permission_types":{"full":"بنائیں / جواب دیں / ملاحظہ کریں","create_post":"جواب دیں / ملاحظہ کریں","readonly":"ملاحظہ کریں"},"lightbox":{"download":"ڈاؤن لوڈ","previous":"پچھلا (بائیں تیر کلید)","next":"اگلا (بائیں تیر کلید)","counter":"%curr% of %total%","close":"بند (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eمواد\u003c/a\u003e لوڈ نہیں کیا جا سکا۔","image_load_error":"\u003ca href=\"%url%\"\u003eتصویر\u003c/a\u003e لوڈ نہیں کی جا سکی۔"},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":"،","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} یا %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"کی بورڈ شارٹ کٹس","jump_to":{"title":"پر جائیں","home":"%{shortcut} ہَوم","latest":"%{shortcut} تازہ ترین","new":"%{shortcut} نیا","unread":"%{shortcut} بغیر پڑھے ہوئے","categories":"%{shortcut} زمرہ جات","top":"%{shortcut} ٹاپ","bookmarks":"%{shortcut} بک مارکس","profile":"%{shortcut} پروفائل","messages":"%{shortcut} پیغامات","drafts":"%{shortcut} ڈرافٹس"},"navigation":{"title":"نیویگیشن","jump":"%{shortcut} پوسٹ # پر جائیں","back":"%{shortcut} واپس","up_down":"%{shortcut} انتخاب منتقل کریں \u0026uarr; \u0026darr;","open":"%{shortcut} منتخب کردہ ٹاپک کھولیں","next_prev":"%{shortcut} اگلا/پچھلا سیکشن","go_to_unread_post":"%{shortcut} پہلی غیر پڑھی پوسٹ پر جائیں"},"application":{"title":"ایپلیکیشن","create":"%{shortcut} نیا ٹاپک بنائیں","notifications":"%{shortcut} اطلاعات کھولیں","hamburger_menu":"%{shortcut} ہیمبرگر مینو کھولیں","user_profile_menu":"%{shortcut} صارف مینو کھولیں","show_incoming_updated_topics":"اَپ ڈیٹ ہوے ٹاپک دکھائیں","search":"%{shortcut}سرچ ","help":"%{shortcut} کیبورڈ مدد کھولیں","dismiss_new_posts":"%{shortcut} برخاست کریں نئے/پوسٹس","dismiss_topics":"%{shortcut} ٹاپک برخاست کریں","log_out":"%{shortcut} لاگ آوٹ"},"composing":{"title":"کمپوز کرنا","return":"%{shortcut} کمپوزر پر واپس جائیں","fullscreen":"%{shortcut} پوری اسکرین کمپوزر"},"actions":{"title":"عمل","bookmark_topic":"%{shortcut} بُک مارک ٹاپک ٹوگل کریں","pin_unpin_topic":"%{shortcut} ٹاپک کو پِن کریں / سے پِن ہٹائیں","share_topic":"%{shortcut} ٹاپک شیئر کریں","share_post":"%{shortcut} پوسٹ شیئر کریں","reply_as_new_topic":"%{shortcut} منسلک ٹاپک کے طور پر جواب دیں","reply_topic":"%{shortcut} ٹاپک پر جواب دیں","reply_post":"%{shortcut} پوسٹ کا جواب دیں","quote_post":"%{shortcut} پوسٹ اقتباس کریں","like":"%{shortcut} پوسٹ لائیک کریں","flag":"%{shortcut} پوسٹ فلَیگ کریں","bookmark":"%{shortcut} پوسٹ بُک مارک کریں","edit":"%{shortcut} پوسٹ ترمیم کریں","delete":"%{shortcut} پوسٹ حذف کریں","mark_muted":"%{shortcut} ٹاپک خاموش کریں","mark_regular":"%{shortcut} معمول کا (ڈیفالٹ) ٹاپک","mark_tracking":"%{shortcut} ٹاپک ٹریک کریں","mark_watching":"%{shortcut} ٹاپک پر نظر رکھیں","print":"%{shortcut} ٹاپک پرِنٹ کریں","defer":"%{shortcut} ٹاپک ملتوی کریں"}},"badges":{"earned_n_times":{"one":"یہ بَیج %{count} دفعہ حاصل کیا","other":"یہ بَیج %{count} مرتبہ حاصل کیا"},"granted_on":"عطا کیا گیا %{date}","others_count":"دوسرے جن کے پاس یہ بَیج ہے (%{count})","title":"بَیج","allow_title":"آپ اِس بَیج کو عنوان کے طور پر استعمال کر سکتے ہیں","multiple_grant":"آپ اِس کو ایک سے زیادہ مرتبہ حاصل کر سکتے ہیں","badge_count":{"one":"%{count} بَیج","other":"%{count} بَیج"},"more_badges":{"one":"+%{count} مزید","other":"+%{count} مزید"},"granted":{"one":"%{count} عطا کیا گیا","other":"%{count} عطا کیے گئے"},"select_badge_for_title":"اپنے عنوان کے طور پر استعمال کرنے کے لئے ایک بیج منتخب کریں","none":"(کوئی نہیں)","successfully_granted":"%{username}کو کامیابی سے %{badge} عطا کیا","badge_grouping":{"getting_started":{"name":"شروعات"},"community":{"name":"کمیونٹی"},"trust_level":{"name":"ٹرسٹ لَیول"},"other":{"name":"دیگر"},"posting":{"name":"پوسٹ کرنا"}}},"tagging":{"all_tags":"تمام ٹیگز","other_tags":"دیگر ٹیگز","selector_all_tags":"تمام ٹیگز","selector_no_tags":"کوئی ٹیگ نہیں","changed":"تبدیل کیے گئے ٹیگ:","tags":"ٹیگز","choose_for_topic":"اختیاری ٹیگز","add_synonyms":"شامل کریں","delete_tag":"ٹیگ حذف کریں","delete_confirm":{"one":"کیا آپ واقعی اس ٹیگ کو حذف اور %{count} ٹاپک، جس کو یہ آسائین ہواوا ہے، سے ہٹا دینا چاہتے ہیں؟","other":"کیا آپ واقعی اس ٹیگ کو حذف اور %{count} ٹاپکس، جن کو یہ آسائین ہواوا ہے، سے ہٹا دینا چاہتے ہیں؟"},"delete_confirm_no_topics":"کیا آپ واقعی اِس ٹَیگ کو حذف کرنا چاہتے ہیں؟","rename_tag":"ٹیگ کا نام تبدیل کریں","rename_instructions":"ٹیگ کے لیے نئے نام کا انتخاب کریں:","sort_by":"ترتیب بہ:","sort_by_count":"شمار","sort_by_name":"نام","manage_groups":"ٹیگ گروپس کا انتظام کریں","manage_groups_description":"ٹیگز منظم کرنے کے گروپوں کی وضاحت کریں","upload":"اَپ لوڈ ٹیگز","upload_description":"بَلک میں ٹیگز بنانے کیلئے ایک csv فائل اَپ لوڈ کریں","upload_instructions":"فی سطر ایک، اختیاری طور پر ایک ٹیگ گروپ کے ساتھ 'tag_name,tag_group' کے فارمیٹ میں۔","upload_successful":"ٹیگز کامیابی سے اپ لوڈ ہو گئے","delete_unused_confirmation":{"one":"%{count} ٹیگ کو حذف کردیا جائے گا: %{tags}","other":"%{count} ٹیگز کو حذف کردیا جائے گا: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} اور %{count} مزید","other":"%{tags} اور %{count} مزید"},"delete_unused":"غیر استعمال شدہ ٹیگز حذف کریں","delete_unused_description":"تمام اُن ٹیگز کو حذف کریں جو کسی بھی ٹاپک یا ذاتی پیغام سے منسلک نہیں ہیں","cancel_delete_unused":"منسوخ","filters":{"without_category":"%{filter} %{tag} ٹاپکس","with_category":"%{filter} %{tag} ٹاپکس %{category} میں","untagged_without_category":"%{filter} غیر ٹیگ شدہ ٹاپک","untagged_with_category":"%{filter} غیر ٹیگ شدہ ٹاپک %{category} میں"},"notifications":{"watching":{"title":"نظر رکھی ہوئی ہے","description":"آپ خود کار طریقے سے اِس ٹیگ والے تمام ٹاپکس پر نظر رکھیں گے۔ تمام نئی پوسٹ اور ٹاپکس کے بارے میں مطلع کیا جائے گا، اور نئی پوسٹس کی گنتی بھی ٹاپک کے ساتھ دکھائی جائے گی۔"},"watching_first_post":{"title":"پہلی پوسٹ پر نظر رکھی ہوئی ہے","description":"آپ کو اِس ٹیگ میں نئے ٹاپکس کے بارے میں مطلع کیا جائے گا لیکن ٹاپکس کے جوابات پر نہیں۔"},"tracking":{"title":"ٹریک کیا جا رہا","description":"آپ خود کار طریقے سے اِس ٹیگ کے ساتھ موجود تمام ٹاپکس کو ٹریک کریں گے۔ بغیر پڑھی اور نئی پوسٹس کی گنتی ٹاپک کے ساتھ دکھائی جائے گی۔"},"regular":{"title":"معمولی","description":"اگر کوئی آپ کا @نام زکر کرتا ہے یا آپ کی پوسٹ پر جواب دیتا ہے تو آپ کو مطلع کر دیا جائے گا۔"},"muted":{"title":"خاموش کِیا ہوا","description":"آپ کو اِس ٹیگ کے ساتھ موجود نئے ٹاپکس کی کسی بھی چیز کے بارے میں مطلع نہیں کیا جائے گا، اور یہ تازہ ترین میں بھی نظر نہیں آئیں گے۔"}},"groups":{"title":"ٹیگ گروپس","about":"زیادہ آسانی سے ٹیگز کو منظم کرنے کے لیے اُن کو گروپوں میں شامل کریں۔","new":"نیا گروپ","tags_label":"اِس گروپ میں ٹیگز:","parent_tag_label":"بالائی ٹیگ:","parent_tag_description":"جب تک بالائی ٹیگ موجود نہیں ہوگا اِس گروپ کے ٹیگز استعمال نہیں کیے جاسکتے۔","one_per_topic_label":"اِس گروپ سے ایک ٹیگ فی ٹاپک محدود کریں","new_name":"نیا ٹیگ گروپ","save":"محفوظ کریں","delete":"حذف کریں","confirm_delete":"کیا آپ واقعی اِس ٹیگ گروپ کو حذف کرنا چاہتے ہیں؟","everyone_can_use":"ٹیگز ہر کوئی استعمال کر سکتا ہے"},"topics":{"none":{"unread":"آپ کے پاس کوئی بغیر پڑھے ٹاپک موجود نہیں۔","new":"آپ کے پاس کوئی نئے ٹاپک موجود نہیں۔","read":"ابھی تک آپ نے کوئی ٹاپکس نہیں پڑھے۔","posted":"ابھی تک آپ نے کسی ٹاپک میں پوسٹ نہیں کیا۔","latest":"کوئی تازہ ترین ٹاپک موجود نہیں ہیں۔","bookmarks":"ابھی تک آپ کے بُک مارک کیے ہوے کوئی ٹاپک نہیں ہیں۔","top":"کوئی ٹاپ ٹاپک موجود نہیں ہیں۔"}}},"invite":{"custom_message":"\u003ca href\u003eاپنی مرضی کا پیغام\u003c/a\u003e لکھ کر، اپنے دعوت نامہ کو ذرا سا مذید ذاتی بنائیں۔","custom_message_placeholder":"اپنی مرضی کے پیغام درج کریں","custom_message_template_forum":"ارے، آپ کو اس فورم میں شامل ہونا چاہیے!","custom_message_template_topic":"ارے، میں نے سوچا کہ آپ اِس ٹاپک سے لطف اندوز ہوں گے!"},"forced_anonymous":"انتہائی بوجھ کی وجہ سے، یہ عارضی طور پر سب کو ایسے دکھایا جا رہا ہے جیسے لاگ آؤٹ صارف اِسے دیکھتے ہیں۔","footer_nav":{"back":"واپس","share":"شیئر","dismiss":"بر خاست کریں"},"safe_mode":{"enabled":"سیف موڈ فعال ہے، سیف موڈ سے باہر نکلنے کے لئے اِس براؤزر وِنڈو کو بند کریں"},"presence":{"replying_to_topic":{"one":"جواب دیا جا رہا ہے","other":"جواب دیا جا رہا ہے"}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"تمام نئے صارفین کے لئے نیا صارف ٹیوٹوریل شروع کریں","welcome_message":"تمام نئے صارفین کو جلدی سے شروعات کرنے کے ٹیوٹوریل کے ساتھ خوش آمدید کا پیغام بھیجیں"}},"details":{"title":"Hide Details"},"discourse_local_dates":{"relative_dates":{"today":"آج %{time}","tomorrow":"کل %{time}","yesterday":"گزرا کَل %{time}","countdown":{"passed":"تاریخ گزر چکی ہے"}},"title":"تاریخ / وقت شامل کریں","create":{"form":{"insert":"شامل","advanced_mode":"اَیڈوانسڈ مَوڈ","simple_mode":"سادہ مَوڈ","timezones_title":"ظاہر کیے جانے والے ٹائم زَونز","timezones_description":"پیشگی اور فالبَیک میں تاریخیں ظاہر کرنے کیلئے ٹائم زَونز استعمال کیے جائیں گے۔","recurring_title":"دوبارہ آنا","recurring_description":"ایک واقعہ کی تکرار کی وضاحت کریں۔ فارم کی طرف سے پیدا ہونے والے تکرار کے اختیار کو آپ دستی طور پر ترمیم بھی کرسکتے ہیں اور مندرجہ ذیل کِیز میں سے ایک کا استعمال کر سکتے ہیں: سال، چوتھائی، مہینے، ہفتے، دن، گھنٹے، منٹ، سیکنڈ، ملی سکنڈ۔","recurring_none":"کوئی بار بار نہیں","invalid_date":"غلط تاریخ، یقینی بنائیں کہ تاریخ اور وقت درست ہیں","date_title":"تاریخ","time_title":"وقت","format_title":"تاریخ فارمَیٹ","timezone":"ٹائم زون","until":"جب تک...","recurring":{"every_day":"ہر دن","every_week":"ہر ہفتے","every_two_weeks":"ہر دو ہفتے","every_month":"ہر مہینے","every_two_months":"ہر دو ماہ","every_three_months":"ہر تین ماہ","every_six_months":"ہر چھ ماہ","every_year":"ہر سال"}}}},"poll":{"voters":{"one":"%{count} ووٹر","other":"ووٹرز"},"total_votes":{"one":"کُل ووٹ","other":"کُل ووٹ"},"average_rating":"اوسط ریٹینگ: \u003cstrong\u003e%{اوسط}\u003c/strong\u003e۔","public":{"title":"ووٹ \u003cstrong\u003eپبلک\u003c/strong\u003e ہیں۔"},"results":{"vote":{"title":"نتائج \u003cstrong\u003eووٹ\u003c/strong\u003e پر دکھائے جائیں گے۔"},"closed":{"title":"نتائج \u003cstrong\u003eبند ہونے\u003c/strong\u003e پر دکھائے جائیں گے۔"},"staff":{"title":"نتائج صرف \u003cstrong\u003eسٹاف\u003c/strong\u003e ممبران کو دکھائے جاتے ہیں۔"}},"cast-votes":{"title":"اپنے ووٹ دیں۔","label":"ابھی ووٹ دیں۔"},"show-results":{"title":"سروے کے نتائج ظاہر کریں","label":"نتائج دکھائیں"},"hide-results":{"title":"وآپس اپنے ووٹس پر"},"export-results":{"label":"ایکسپورٹ"},"open":{"title":"پول کھولیں","label":"کھولیں","confirm":"کیا آپ واقعی یہ پول کھولنا چاہتے ہیں؟"},"close":{"title":"پول بند کریں","label":"بند کریں","confirm":"کیا آپ واقعی یہ پول بند کرنا چاہتے ہیں؟"},"automatic_close":{"closes_in":"بند ہو جائیگا \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e میں۔","age":"بند \u003cstrong\u003e%{age}\u003c/strong\u003e"},"error_while_toggling_status":"معذرت، اِس پول کا سٹیٹس تبدیل کرتے وقت ایک تکنیکی خرابی کا سامنا کرنا پڑا۔","error_while_casting_votes":"معذرت، آپ کا ووٹ ڈالتے وقت ایک تکنیکی خرابی کا سامنا کرنا پڑا","error_while_fetching_voters":"معذرت، ووٹرز کو دکھاتے وقت ایک تکنیکی خرابی کا سامنا کرنا پڑا","ui_builder":{"title":"پول شروع کریے","insert":"پول شامل کریے","help":{"invalid_values":"کم از کم قدر زیادہ سے زیادہ قدر سے چھوٹا ہونا ضروری ہے۔","min_step_value":"کم از کم اضافہ یا کمی کی قدر 1 ہے"},"poll_type":{"label":"قِسم","regular":"اکیلا انتخاب","multiple":"ایک سے زیادہ انتخاب","number":"نمبر کی درجہ بندی"},"poll_result":{"label":"نتائج","always":"ہمیشہ نظر آتا ہے","vote":"ووٹ پر","closed":"بند کر دیا جب","staff":"صرف سٹاف کیلئے"},"poll_config":{"max":"زیادہ سے زیادہ","min":"کم از کم","step":"قدم"},"poll_public":{"label":"دکھایں جنہوں نے ووٹ دیا"},"poll_options":{"label":"فی سطر پول کی ہر ایک آپشن درج کریں"},"automatic_close":{"label":"خود کار طریقے سے پَول بند کریں"}}},"admin":{"site_settings":{"categories":{"chat_integration":"چَیٹ اِنٹیگرَیشَن"}}},"chat_integration":{"menu_title":"چَیٹ اِنٹیگرَیشَن","settings":"سیٹِنگ","no_providers":"آپ کو پلَگ اِن کی سیٹِنگ میں کچھ پرووَائیڈرز کو فعال کرنے کی ضرورت ہے","channels_with_errors":"پچھلی دفعہ پیغامات بھیجنے پر اِس پرووَائیڈر کے کچھ چینلز ناکام ہوگئے تھے۔ مزید جاننے کیلئے خرابی کے آئکن پر کلک کریں۔","channel_exception":"آخری دفعہ اِس چینل کو پیغام بھیجنے پر ایک نامعلوم خرابی کا سامنا کرنا پڑا۔","choose_group":"(ایک گروپ منتخب کریں)","all_categories":"(تمام زُمرَہ جات)","all_tags":"(تمام ٹَیگز)","create_rule":"اصول بنائیں","create_channel":"چینل بنائیں","delete_channel":"حذف کریں","test_channel":"ٹیسٹ","edit_channel":"ترمیم کریں","channel_delete_confirm":"کیا آپ واقعی یہ چینل حذف کرنا چاہتے ہیں؟ تمام منسلک اصول حذف ہو جائیں گے۔","test_modal":{"title":"ایک ٹیسٹ پیغام بھیجیں","topic":"ٹاپک","send":"ٹیسٹ پیغام بھیجیں","close":"بند کریں","error":"پیغام بھیجنے پر ایک نامعلوم خرابی کا سامنا کرنا پڑا۔ مزید جاننے کیلئے سائٹ لاگز چیک کریں۔","success":"پیغام کامیابی سے بھیجا گیا"},"type":{"normal":"عمومی","group_message":"گروپ پیغام","group_mention":"گروپ ذکر"},"filter":{"mute":"خاموش کریں","follow":"صرف پہلی پوسٹ","watch":"تمام پوسٹس اور جوابات"},"rule_table":{"filter":"فِلٹر","category":"زُمرَہ","tags":"ٹیگز","edit_rule":"ترمیم کریں","delete_rule":"حذف کریں"},"edit_channel_modal":{"title":"چینل ترمیم کریں","save":"چَینل محفوظ کریں","cancel":"منسوخ","provider":"پرووَائیڈر","channel_validation":{"ok":"درست","fail":"غلط فارمَیٹ"}},"edit_rule_modal":{"title":"اصول ترمیم کریں","save":"اصول محفوظ کریں","cancel":"منسوخ","provider":"پرووَائیڈر","type":"قِسم","channel":"چَینل","filter":"فِلٹر","category":"زُمرَہ","group":"گروپ","tags":"ٹیگز","instructions":{"type":"گروپ پیغامات یا ذکر کے بارے میں اطلاعات کو متحرک کرنے والی قِسم کو تبدیل کریں","filter":"اطلاعات کا لیول۔ خاموشی دوسرے مماثل اصولوں کو منسوخ کردیتی ہے","category":"یہ اصول صرف مخصوص زُمرہ کے ٹاپکس پر لاگو ہو گا","group":"یہ اصول اِس گروپ کا حوالہ دینے والی پوسٹس پر لاگو ہو گا","tags":"اگر متعین ہو، تو یہ اصول صرف ایسے ٹاپکس پر لاگو ہو گا جن پر اِن ٹیگز میں سے کم از کم ایک موجود ہو"}},"provider":{"slack":{"title":"سلَّیک","param":{"identifier":{"title":"چَینل","help":"ثال کے طور پر #چینل، @صارف نام۔"}},"errors":{"action_prohibited":"بَوٹ کو اُس چینل پر پوسٹ کرنے کی اجازت نہیں ہے","channel_not_found":"یہ مخصوص چینل سلَّیک پر موجود نہیں ہے"}},"telegram":{"title":"ٹَیلیگرام","param":{"name":{"title":"نام","help":"چَینل کی وضاحت کرنے کیلئے نام۔ یہ ٹَیلیگرام کے ساتھ کنکشن کیلئے استعمال نہیں کیا جاتا ہے۔"},"chat_id":{"title":"چَیٹ ID","help":"بَوٹ کی طرف سے آپ کو دیا گیا نمبر، یا @channelname کی فارم میں ایک براڈکاسٹ چینل آئیڈَینٹِیفائر"}},"errors":{"channel_not_found":"یہ مخصوص چینل ٹَیلیگرام پر موجود نہیں ہے","forbidden":"بَوٹ کو اِس چینل پر پوسٹ کرنے کی اجازت نہیں ہے"}},"discord":{"title":"ڈِسکَورڈ","param":{"name":{"title":"نام","help":"چَینل کی وضاحت کرنے کیلئے نام۔ یہ ڈِسکَورڈ کے ساتھ کنکشن کیلئے استعمال نہیں کیا جاتا ہے۔"},"webhook_url":{"title":"وَیب ھُوک URL","help":"آپ کے ڈِسکَورڈ سروَر کی سیٹِنگ میں بنایا گیا وَیب ھُوک URL"}}},"mattermost":{"title":"مَیٹرمَوسٹ","param":{"identifier":{"title":"چَینل","help":"ثال کے طور پر #چینل، @صارف نام۔"}},"errors":{"channel_not_found":"یہ مخصوص چینل مَیٹرمَوسٹ پر موجود نہیں ہے"}},"matrix":{"title":"مَیٹرِکس","param":{"name":{"title":"نام","help":"چَینل کی وضاحت کرنے کیلئے نام۔ یہ مَیٹرِکس کے ساتھ کنکشن کیلئے استعمال نہیں کیا جاتا ہے۔"},"room_id":{"title":"رُوم ID","help":"رُوم کا 'پرائیوَِیٹ آئیڈَینٹِیفائر'۔ یہ کچھ abcdefg:matrix.org! کی طرح نظر آنا چاہئے"}},"errors":{"unknown_token":"ایکسَیس ٹوکن غلط ہے","unknown_room":"رُوم ID غلط ہے"}},"zulip":{"title":"زُولِپ","param":{"stream":{"title":"سٹریم","help":"زُولِپ سٹریم کا نام جس پر پیغام بھیجا جانا چاہئے۔ مثال کے طور پر 'general'"},"subject":{"title":"موضوع","help":"بذریعہ بَوٹ بھیجے گئے اِن پیغامات کا موضوع دیا جانا چاہئیے"}},"errors":{"does_not_exist":"وہ سٹریم زُولِپ پر موجود نہیں ہے"}},"rocketchat":{"title":"راکٹ.چَیٹ","param":{"identifier":{"title":"چَینل","help":"مثال کے طور پر #چینل، @صارف نام۔"}},"errors":{"invalid_channel":"وہ چینل راکٹ چَیٹ پر موجود نہیں ہے"}},"gitter":{"title":"گِیٹر","param":{"name":{"title":"نام","help":"ایک گِیٹر روم کا نام مثال کے طور پر gitterHQ/services۔"},"webhook_url":{"title":"وَیب ھُوک URL","help":"فراہم کیے جانے والا URL، جب آپ گِیٹر روم میں ایک نئی اِنٹیگرَیشَن بناتے ہیں۔"}}},"flowdock":{"title":"فلَوڈَوک","param":{"flow_token":{"title":"فلَو ٹوکن","help":"ایک فلَو کا سَورس بنانے کے بعد فراہم ہونے والا فلَو ٹوکن جس میں آپ پیغامات بھیجنا چاہتے ہیں"}}}}}}},"en":{"js":{"dates":{"time_with_zone":"hh:mm a (z)","time_short_day":"ddd, h:mm a","long_no_year":"MMM D, h:mm a"},"share":{"twitter":"Share on Twitter","facebook":"Share on Facebook","email":"Send via email","url":"Copy and share URL"},"action_codes":{"forwarded":"forwarded the above email"},"topic_admin_menu":"topic actions","bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined.","other":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} users have joined."},"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)"}},"clear_input":"Clear input","x_more":{"one":"%{count} More","other":"%{count} More"},"bookmarked":{"help":{"unbookmark_with_reminder":"Click to remove all bookmarks and reminders in this topic. You have a reminder set %{reminder_at} for this topic."}},"bookmarks":{"created":"You've bookmarked this post. %{name}","created_with_reminder":"You've bookmarked this post with a reminder %{date}. %{name}","delete":"Delete Bookmark","confirm_delete":"Are you sure you want to delete this bookmark? The reminder will also be deleted.","no_timezone":"You have not set a timezone yet. You will not be able to set reminders. Set one up \u003ca href=\"%{basePath}/my/preferences/profile\"\u003ein your profile\u003c/a\u003e.","invalid_custom_datetime":"The date and time you provided is invalid, please try again.","list_permission_denied":"You do not have permission to view this user's bookmarks.","no_user_bookmarks":"You have no bookmarked posts; bookmarks allow you to quickly refer to specific posts.","auto_delete_preference":{"label":"Automatically delete","never":"Never","when_reminder_sent":"Once the reminder is sent","on_owner_reply":"After I reply to this topic"},"search_placeholder":"Search bookmarks by name, topic title, or post content","reminders":{"next_business_day":"Next business day","post_local_date":"Date in post","start_of_next_business_week":"Monday","start_of_next_business_week_alt":"Next Monday","custom":"Custom date and time","last_custom":"Last","none":"No reminder needed","today_with_time":"today at %{time}","tomorrow_with_time":"tomorrow at %{time}","at_time":"at %{date_time}","existing_reminder":"You have a reminder set for this bookmark which will be sent %{at_date_time}"}},"copy_codeblock":{"copied":"copied!"},"drafts":{"remove_confirmation":"Are you sure you want to delete this draft?"},"deleting":"Deleting...","choose_topic":{"title":{"search":"Search for a Topic","placeholder":"type the topic title, url or id here"}},"choose_message":{"title":{"search":"Search for a Message","placeholder":"type the message title, url or id here"}},"review":{"filtered_reviewed_by":"Reviewed By","user":{"website":"Website","reject_reason":"Reason"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"}},"filters":{"orders":{"score_asc":"Score (reverse)"}},"example_username":"username","reject_reason":{"title":"Why are you rejecting this user?","send_email":"Send rejection email"}},"relative_time_picker":{"minutes":{"one":"minute","other":"minutes"},"hours":{"one":"hour","other":"hours"},"days":{"one":"day","other":"days"},"months":{"one":"month","other":"months"},"years":{"one":"year","other":"years"},"relative":"Relative"},"time_shortcut":{"later_today":"Later today","next_business_day":"Next business day","tomorrow":"Tomorrow","next_week":"Next week","post_local_date":"Date in post","later_this_week":"Later this week","start_of_next_business_week":"Monday","start_of_next_business_week_alt":"Next Monday","next_month":"Next month","custom":"Custom date and time","relative":"Relative time","none":"None needed","last_custom":"Last"},"directory":{"username":"Username","last_updated":"Last Updated:"},"groups":{"add_members":{"title":"Add members to %{group_name}","description":"You can also paste in a comma separated list.","usernames":"Enter usernames or email addresses","input_placeholder":"Usernames or emails","notify_users":"Notify users"},"manage":{"email":{"status":"Synchronized %{old_emails} / %{total_emails} emails via IMAP.","credentials":{"title":"Credentials","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"Use SSL for SMTP","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"Use SSL for IMAP"},"settings":{"title":"Settings","allow_unknown_sender_topic_replies":"Allow unknown sender topic replies.","allow_unknown_sender_topic_replies_hint":"Allows unknown senders to reply to group topics. If this is not enabled, replies from email addresses not already included on the IMAP email thread or invited to the topic will create a new topic."},"mailboxes":{"synchronized":"Synchronized Mailbox","none_found":"No mailboxes were found in this email account.","disabled":"disabled"}},"categories":{"title":"Categories","long_title":"Category default notifications","description":"When users are added to this group, their category notification settings will be set to these defaults. Afterwards, they can change them.","watched_categories_instructions":"Automatically watch all topics in these categories. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_categories_instructions":"Automatically track all topics in these categories. A count of new posts will appear next to the topic.","watching_first_post_categories_instructions":"Users will be notified of the first post in each new topic in these categories.","regular_categories_instructions":"If these categories are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_categories_instructions":"Users will not be notified of anything about new topics in these categories, and they will not appear on the categories or latest topics pages."},"tags":{"title":"Tags","long_title":"Tags default notifications","description":"When users are added to this group, their tag notification settings will be set to these defaults. Afterwards, they can change them.","watched_tags_instructions":"Automatically watch all topics with these tags. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_tags_instructions":"Automatically track all topics with these tags. A count of new posts will appear next to the topic.","watching_first_post_tags_instructions":"Users will be notified of the first post in each new topic with these tags.","regular_tags_instructions":"If these tags are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_tags_instructions":"Users will not be notified of anything about new topics with these tags, and they will not appear in latest."}},"permissions":{"title":"Permissions","none":"There are no categories associated with this group.","description":"Members of this group can access these categories"},"confirm_leave":"Are you sure you want to leave this group?","allow_membership_requests":"Allow users to send membership requests to group owners (Requires publicly visible group)","members":{"make_primary":"Make Primary","make_primary_description":"Make this the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Remove as Primary","remove_primary_description":"Remove this as the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Remove Members","remove_members_description":"Remove selected users from this group","make_owners":"Make Owners","make_owners_description":"Make selected users owners of this group","remove_owners":"Remove Owners","remove_owners_description":"Remove selected users as owners of this group","make_all_primary":"Make All Primary","make_all_primary_description":"Make this the primary group for all selected users","remove_all_primary":"Remove as Primary","remove_all_primary_description":"Remove this group as primary","primary":"Primary"},"flair_upload_description":"Use square images no smaller than 20px by 20px.","flair_type":{"icon":"Select an icon","image":"Upload an image"}},"categories":{"muted":"Muted categories","topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"week","month":"month"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"n_more":"Categories (%{count} more)..."},"user_fields":{"required":"Please enter a value for \"%{name}\""},"user":{"user_notifications":{"filters":{"filter_by":"Filter By"},"ignore_duration_title":"Ignore User"},"notification_schedule":{"title":"Notification Schedule","label":"Enable custom notification schedule","tip":"Outside of these hours you will be put in 'do not disturb' automatically.","midnight":"Midnight","none":"None","monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday","to":"to"},"read":"Read","read_help":"Recently read topics","feature_topic_on_profile":{"open_search":"Select a New Topic","title":"Select a Topic","search_label":"Search for Topic by title","clear":{"warning":"Are you sure you want to clear your featured topic?"}},"use_current_timezone":"Use Current Timezone","desktop_notifications":{"each_browser_note":"Note: You have to change this setting on every browser you use. All notifications will be disabled when in \"do not disturb\", regardless of this setting."},"skip_new_user_tips":{"description":"Skip new user onboarding tips and badges","not_first_time":"Not your first time?","skip_link":"Skip these tips"},"color_scheme_default_on_all_devices":"Set default color scheme(s) on all my devices","color_scheme":"Color Scheme","color_schemes":{"default_description":"Theme default","disable_dark_scheme":"Same as regular","dark_instructions":"You can preview the dark mode color scheme by toggling your device's dark mode.","undo":"Reset","regular":"Regular","dark":"Dark mode","default_dark_scheme":"(site default)"},"dark_mode":"Dark Mode","dark_mode_enable":"Enable automatic dark mode color scheme","featured_topic":"Featured Topic","github_profile":"GitHub","regular_categories":"Regular","regular_categories_instructions":"You will see these categories in the “Latest” and “Top” topic lists.","muted_users_instructions":"Suppress all notifications and PMs from these users.","allowed_pm_users":"Allowed","allowed_pm_users_instructions":"Only allow PMs from these users.","allow_private_messages_from_specific_users":"Only allow specific users to send me personal messages","ignored_users_instructions":"Suppress all posts, notifications, and PMs from these users.","save_to_change_theme":"Theme will be updated after you click \"%{save_text}\"","staff_counters":{"rejected_posts":"rejected posts"},"preferences_nav":{"security":"Security"},"change_password":{"emoji":"lock emoji"},"second_factor_backup":{"title":"Two-Factor Backup Codes","manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"download_backup_codes":"Download backup codes","remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"use":"Use a backup code","enable_prerequisites":"You must enable a primary two-factor method before generating backup codes."},"second_factor":{"title":"Two-Factor Authentication","enable":"Manage Two-Factor Authentication","disable_all":"Disable All","forgot_password":"Forgot password?","extended_description":"Two-factor authentication adds extra security to your account by requiring a one-time token in addition to your password. Tokens can be generated on \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e and \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e devices.\n","oauth_enabled_warning":"Please note that social logins will be disabled once two-factor authentication has been enabled on your account.","use":"Use Authenticator app","enforced_notice":"You are required to enable two-factor authentication before accessing this site.","disable_confirm":"Are you sure you want to disable all two-factor methods?","edit_title":"Edit Authenticator","edit_description":"Authenticator Name","enable_security_key_description":"When you have your \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003ehardware security key\u003c/a\u003e prepared, press the Register button below.\n","totp":{"add":"Add Authenticator","name_and_code_required_error":"You must provide a name and the code from your authenticator app."},"security_key":{"title":"Security Keys","add":"Add Security Key","default_name":"Main Security Key","not_allowed_error":"The security key registration process either timed out or was cancelled.","already_added_error":"You have already registered this security key. You don’t have to register it again.","edit":"Edit Security Key","edit_description":"Security Key Name","name_required_error":"You must provide a name for your security key."}},"add_email":{"title":"Add Email"},"change_email":{"success_via_admin":"We've sent an email to that address. The user will need to follow the confirmation instructions in the email."},"change_avatar":{"gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, based on","gravatar_title":"Change your avatar on %{gravatarName}'s website","gravatar_failed":"We could not find a %{gravatarName} with that email address.","refresh_gravatar_title":"Refresh your %{gravatarName}"},"change_profile_background":{"title":"Profile Header","instructions":"Profile headers will be centered and have a default width of 1110px."},"change_featured_topic":{"title":"Featured Topic","instructions":"A link to this topic will be on your user card, and profile."},"email":{"unconfirmed_label":"unconfirmed","resend_label":"resend confirmation email","resending_label":"sending...","resent_label":"email sent","set_primary":"Set Primary Email","destroy":"Remove Email","add_email":"Add Alternate Email","auth_override_instructions":"Email can be updated from authentication provider.","admin_note":"Note: An admin user changing another non-admin user's email indicates the user has lost access to their original email account, so a reset password email will be sent to their new address. The user's email will not change until they complete the reset password process.","required":"Please enter an email address","invite_auth_email_invalid":"Your invitation email does not match the email authenticated by %{provider}"},"name":{"required":"Please enter a name"},"username":{"required":"Please enter a username","edit":"Edit username"},"invite_code":{"title":"Invite Code","instructions":"Account registration requires an invite code"},"auth_tokens":{"device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactive now\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"text_size":{"smallest":"Smallest"},"invited":{"expired_tab":"Expired","expired_tab_with_count":"Expired (%{count})","invited_via":"Invitation","invited_via_link":"link %{key} (%{count} / %{max} redeemed)","groups":"Groups","topic":"Topic","sent":"Created/Last Sent","expires_at":"Expires","edit":"Edit","remove":"Remove","copy_link":"Get Link","reinvite":"Resend Email","removed":"Removed","remove_all":"Remove Expired Invites","removed_all":"All Expired Invites removed!","remove_all_confirm":"Are you sure you want to remove all expired invites?","reinvite_all":"Resend All Invites","reinvited_all":"All Invites Sent!","create":"Invite","generate_link":"Create Invite Link","link_generated":"Here's your invite link!","single_user":"Invite by email","multiple_user":"Invite by link","invite_link":{"title":"Invite Link","error":"There was an error generating Invite link","max_redemptions_allowed_label":"How many people are allowed to register using this link?","expires_at":"When will this invite link expire?"},"invite":{"new_title":"Create Invite","edit_title":"Edit Invite","instructions":"Share this link to instantly grant access to this site:","copy_link":"copy link","expires_in_time":"Expires in %{time}.","expired_at_time":"Expired at %{time}.","show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options","type_email":"Invite just one email address","type_link":"Invite one or more people with a link","email":"Limit to email address:","max_redemptions_allowed":"Max number of uses:","add_to_groups":"Add to groups:","invite_to_topic":"Send to topic on first login:","expires_at":"Expire after:","custom_message":"Optional personal message:","send_invite_email":"Save and Send Email","save_invite":"Save Invite","invite_saved":"Invite was saved.","invite_copied":"Invite link was copied."},"bulk_invite":{"none":"No invitations to display on this page.","text":"Bulk Invite","instructions":"\u003cp\u003eInvite a list of users to get your community going quickly. Prepare a \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV file\u003c/a\u003e containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEvery email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.\u003c/p\u003e\n","progress":"Uploaded %{progress}%...","success":"File uploaded successfully. You will be notified via message when the process is complete."}},"password":{"required":"Please enter a password"},"avatar":{"name_and_description":"%{name} - %{description}","edit":"Edit Profile Picture"}},"modal":{"dismiss_error":"Dismiss error"},"assets_changed_confirm":"This site just received a software upgrade. Get the latest version now?","logs_error_rate_notice":{},"local_time":"Local Time","summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply.","other":"There are \u003cb\u003e%{count}\u003c/b\u003e replies."}},"private_message_info":{"invite":"Invite Others...","edit":"Add or Remove...","remove":"Remove...","add":"Add..."},"create_account":{"header_title":"Welcome!","subheader_title":"Let's create your account","title":"Create your account"},"forgot_password":{"complete_username_found":"We found an account that matches the username \u003cb\u003e%{username}\u003c/b\u003e. You should receive an email with instructions on how to reset your password shortly.","complete_email_found":"We found an account that matches \u003cb\u003e%{email}\u003c/b\u003e. You should receive an email with instructions on how to reset your password shortly."},"email_login":{"login_link":"Skip the password; email me a login link","emoji":"lock emoji"},"login":{"header_title":"Welcome Back","subheader_title":"Log in to your account","second_factor_title":"Two-Factor Authentication","second_factor_backup":"Log in using a backup code","second_factor_backup_title":"Two-Factor Backup","second_factor":"Log in using Authenticator app","security_key_description":"When you have your physical security key prepared press the Authenticate with Security Key button below.","security_key_alternative":"Try another way","security_key_authenticate":"Authenticate with Security Key","security_key_not_allowed_error":"The security key authentication process either timed out or was cancelled.","security_key_no_matching_credential_error":"No matching credentials could be found in the provided security key.","security_key_support_missing_error":"Your current device or browser does not support the use of security keys. Please use a different method.","email_placeholder":"Email / Username","not_allowed_from_ip_address":"You can't log in from that IP address.","omniauth_disallow_totp":"Your account has two-factor authentication enabled. Please log in with your password."},"invites":{"emoji":"envelope emoji","password_label":"Password"},"category_row":{"topic_count":{"one":"%{count} topic in this category","other":"%{count} topics in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory","other":"%{name} and %{count} subcategories"},"plus_subcategories":{"one":"+ %{count} subcategory","other":"+ %{count} subcategories"}},"select_kit":{"filter_by":"Filter by: %{name}","select_to_filter":"Select a value to filter","invalid_selection_length":{"one":"Selection must be at least %{count} character.","other":"Selection must be at least %{count} characters."},"components":{"categories_admin_dropdown":{"title":"Manage categories"}}},"shared_drafts":{"notice":"This topic is only visible to those who can publish shared drafts."},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"error":{"title_too_short":{"one":"Title must be at least %{count} character","other":"Title must be at least %{count} characters"},"title_too_long":{"one":"Title can't be more than %{count} character","other":"Title can't be more than %{count} characters"},"post_length":{"one":"Post must be at least %{count} character","other":"Post must be at least %{count} characters"},"tags_missing":{"one":"You must choose at least %{count} tag","other":"You must choose at least %{count} tags"}},"saved_draft":"Post draft in progress. Tap to resume.","link_url_placeholder":"Paste a URL or type to search topics","blockquote_title":"Blockquote","show_toolbar":"show composer toolbar","hide_toolbar":"hide composer toolbar","slow_mode":{"error":"This topic is in slow mode. In order to promote thoughtful, considered discussion you may only post once every %{duration}."},"composer_actions":{"reply_to_post":{"label":"Reply to a post by %{postUsername}"},"reply_as_new_topic":{"confirm":"You have a new topic draft saved, which will be overwritten if you create a linked topic."},"reply_as_new_group_message":{"label":"Reply as new group message","desc":"Create a new private message with the same recipients"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"}},"reload":"Reload","ignore":"Ignore"},"notifications":{"tooltip":{"high_priority":{"one":"%{count} unread high priority notification","other":"%{count} unread high priority notifications"}},"liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} others\u003c/span\u003e %{description}"},"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - completed","titles":{"bookmark_reminder":"bookmark reminder","bookmark_reminder_with_name":"bookmark reminder - %{name}","membership_request_consolidated":"new membership requests","reaction":"new reaction","votes_released":"Vote was released"}},"search":{"search_button":"Search","context":{"tag":"Search the #%{tag} tag"},"advanced":{"filters":{"created":"I created"},"statuses":{"public":"are public"},"post":{"count":{"label":"Posts"},"min":{"placeholder":"minimum"},"max":{"placeholder":"maximum"}},"views":{"label":"Views"},"min_views":{"placeholder":"minimum"},"max_views":{"placeholder":"maximum"}}},"view_all":"view all %{tab}","topics":{"bulk":{"move_messages_to_inbox":"Move to Inbox","change_notification_level":"Change Notification Level","remove_tags":"Remove All Tags","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from \u003cb\u003e%{count}\u003c/b\u003e topics. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic","other":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topics"}},"none":{"ready_to_create":"Ready to ","latest":"You're all caught up!","educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e","unread":"\u003cp\u003eYour unread topics appear here.\u003c/p\u003e\u003cp\u003eBy default, topics are considered unread and will show unread counts \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e if you:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreated the topic\u003c/li\u003e\u003cli\u003eReplied to the topic\u003c/li\u003e\u003cli\u003eRead the topic for more than 4 minutes\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOr if you have explicitly set the topic to Tracked or Watched via the 🔔 in each topic.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}},"bottom":{"tag":"There are no more %{tag} topics."}},"topic":{"feature_on_profile":{"help":"Add a link to this topic on your user card and profile","title":"Feature On Profile"},"remove_from_profile":{"warning":"Your profile already has a featured topic. If you continue, this topic will replace the existing topic.","help":"Remove the link to this topic on your user profile","title":"Remove From Profile"},"browse_all_tags":"Browse all tags","suggest_create_topic":"start a new conversation?","slow_mode_update":{"title":"Slow Mode","select":"Users may only post in this topic once every:","description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","save":"Enable","enabled_until":"(Optional) Enabled until:","remove":"Disable","hours":"Hours:","minutes":"Minutes:","seconds":"Seconds:","durations":{"15_minutes":"15 Minutes","1_hour":"1 Hour","4_hours":"4 Hours","1_day":"1 Day","1_week":"1 Week","custom":"Custom Duration"}},"slow_mode_notice":{"duration":"You need to wait %{duration} between posts in this topic"},"topic_status_update":{"num_of_days":"Number of days:","min_duration":"Duration must be greater than 0","max_duration":"Duration must be less than 20 years"},"auto_update_input":{"now":"Now","two_weeks":"Two weeks","two_months":"Two months","three_months":"Three months","four_months":"Four months","six_months":"Six months","one_year":"One year"},"auto_close":{"label":"Auto-close topic after:"},"auto_close_after_last_post":{"title":"Auto-Close Topic After Last Post"},"auto_delete_replies":{"title":"Auto-Delete Replies"},"status_update_notice":{"auto_close_after_last_post":"This topic will close %{duration} after the last reply.","auto_delete_replies":"Replies on this topic are automatically deleted after %{duration}."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily.","other":"The last post in the topic is already %{count} hours old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"}},"actions":{"slow_mode":"Set Slow Mode"},"feature_topic":{"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"}},"invite_private":{"not_allowed":"Sorry, that user can't be invited."},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link.","discourse_connect_enabled":"Enter the username of the person you'd like to invite to this topic.","success_email":"We mailed out an invitation to \u003cb\u003e%{invitee}\u003c/b\u003e. We'll notify you when the invitation is redeemed. Check the invitations tab on your user page to keep track of your invites."},"publish_page":{"title":"Page Publishing","publish":"Publish","description":"When a topic is published as a page, its URL can be shared and it will displayed with custom styling.","slug":"Slug","public_description":"People can see the page even if the associated topic is private.","publish_url":"Your page has been published at:","topic_published":"Your topic has been published at:","preview_url":"Your page will be published at:","invalid_slug":"Sorry, you can't publish this page.","unpublish":"Unpublish","unpublished":"Your page has been unpublished and is no longer accessible.","publishing_settings":"Publishing Settings"},"change_owner":{"instructions_without_old_user":{"one":"Please choose a new owner for the post","other":"Please choose a new owner for the %{count} posts"}}},"post":{"quote_share":"Share","wiki_last_edited_on":"wiki last edited on %{dateTime}","last_edited_on":"post last edited on %{dateTime}","has_replies_count":"%{count}","unknown_user":"(unknown/deleted user)","filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","view_all_posts":"View all posts","errors":{"too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."}},"cancel_composer":{"confirm":"What would you like to do with your post?","discard":"Discard","save_draft":"Save draft for later","keep_editing":"Keep editing"},"controls":{"publish_page":"Page Publishing","delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","other":"This topic currently has over %{count} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic","change_post_notice":"Change Staff Notice","delete_post_notice":"Delete Staff Notice","edit_timer":"edit timer"},"actions":{"people":{"like":{"one":"liked this","other":"liked this"},"read":{"one":"read this","other":"read this"},"read_capped":{"one":"and %{count} other read this","other":"and %{count} others read this"}}},"revisions":{"controls":{"revert":"Revert to revision %{revision}"}},"bookmarks":{"create":"Create bookmark","edit":"Edit bookmark","updated":"Updated","name_placeholder":"What is this bookmark for?","set_reminder":"Remind me","actions":{"delete_bookmark":{"name":"Delete bookmark","description":"Removes the bookmark from your profile and stops all reminders for the bookmark"},"edit_bookmark":{"name":"Edit bookmark","description":"Edit the bookmark name or change the reminder date and time"},"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}},"filtered_replies":{"viewing_posts_by":"Viewing %{post_count} posts by","viewing_subset":"Some replies are collapsed","viewing_summary":"Viewing a summary of this topic","post_number":"%{username}, post #%{post_number}","show_all":"Show all"}},"category":{"back":"Back to category","tags_tab_description":"Tags and tag groups specified above will only be available in this category and other categories that also specify them. They won't be available for use in other categories.","manage_tag_groups_link":"Manage tag groups","tag_group_selector_placeholder":"(Optional) Tag group","required_tag_group_description":"Require new topics to have tags from a tag group:","min_tags_from_required_group_label":"Num Tags:","required_tag_group_label":"Tag group:","security_add_group":"Add a group","permissions":{"group":"Group","see":"See","reply":"Reply","create":"Create","no_groups_selected":"No groups have been granted access; this category will only be visible to staff.","everyone_has_access":"This category is public, everyone can see, reply and create posts. To restrict permissions, remove one or more of the permissions granted to the \"everyone\" group.","toggle_reply":"Toggle Reply permission","toggle_full":"Toggle Create permission","inherited":"This permission is inherited from \"everyone\""},"read_only_banner":"Banner text when a user cannot create a topic in this category:","default_list_filter":"Default List Filter:","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","notifications":{"watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"list_filters":{"all":"all topics","none":"no subcategories"},"colors_disabled":"You can’t select colors because you have a category style of none."},"flagging":{"take_action":"Take Action...","take_action_options":{"default":{"title":"Take Action","details":"Reach the flag threshold immediately, rather than waiting for more community flags"},"suspend":{"title":"Suspend User","details":"Reach the flag threshold, and suspend the user"},"silence":{"title":"Silence User","details":"Reach the flag threshold, and silence the user"}},"flag_for_review":"Flag Post"},"filters":{"top":{"other_periods":"see top:"}},"browser_update":"Unfortunately, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eyour browser is too old to work on this site\u003c/a\u003e. Please \u003ca href=\"https://browsehappy.com\"\u003eupgrade your browser\u003c/a\u003e to view rich content, log in and reply.","keyboard_shortcuts_help":{"jump_to":{"next":"%{shortcut} Next Topic","previous":"%{shortcut} Previous Topic"},"bookmarks":{"title":"Bookmarking","enter":"%{shortcut} Save and close","later_today":"%{shortcut} Later today","later_this_week":"%{shortcut} Later this week","tomorrow":"%{shortcut} Tomorrow","next_week":"%{shortcut} Next week","next_month":"%{shortcut} Next month","next_business_week":"%{shortcut} Start of next week","next_business_day":"%{shortcut} Next business day","custom":"%{shortcut} Custom date and time","none":"%{shortcut} No reminder","delete":"%{shortcut} Delete bookmark"},"actions":{"topic_admin_actions":"%{shortcut} Open topic admin actions"},"search_menu":{"title":"Search Menu","prev_next":"%{shortcut} Move selection up and down","insert_url":"%{shortcut} Insert selection into open composer"}},"tagging":{"info":"Info","default_info":"This tag isn't restricted to any categories, and has no synonyms.","category_restricted":"This tag is restricted to categories you don't have permission to access.","synonyms":"Synonyms","synonyms_description":"When the following tags are used, they will be replaced with \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\".","other":"This tag belongs to these groups: %{tag_groups}."},"category_restrictions":{"one":"It can only be used in this category:","other":"It can only be used in these categories:"},"edit_synonyms":"Manage Synonyms","add_synonyms_label":"Add synonyms:","add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?","other":"Any place that currently uses these tags will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"add_synonyms_failed":"The following tags couldn't be added as synonyms: \u003cb\u003e%{tag_names}\u003c/b\u003e. Ensure they don't have synonyms and aren't synonyms of another tag.","remove_synonym":"Remove Synonym","delete_synonym_confirm":"Are you sure you want to delete the synonym \"%{tag_name}\"?","delete_confirm_synonyms":{"one":"Its synonym will also be deleted.","other":"Its %{count} synonyms will also be deleted."},"delete_no_unused_tags":"There are no unused tags.","tag_list_joiner":", ","groups":{"name_placeholder":"Tag Group Name","usable_only_by_groups":"Tags are visible to everyone, but only the following groups can use them","visible_only_to_groups":"Tags are visible only to the following groups"}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"forced_anonymous_login_required":"The site is under extreme load and cannot be loaded at this time, try again in a few minutes.","footer_nav":{"forward":"Forward"},"image_removed":"(image removed)","do_not_disturb":{"title":"Do not disturb for...","label":"Do not disturb","remaining":"%{remaining} remaining","options":{"half_hour":"30 minutes","one_hour":"1 hour","two_hours":"2 hours","tomorrow":"Until tomorrow","custom":"Custom"},"set_schedule":"Set a notification schedule"},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"presence":{"replying":{"one":"replying","other":"replying"},"editing":{"one":"editing","other":"editing"}},"discourse_local_dates":{"create":{"form":{"format_description":"Format used to display the date to the user. Use Z to show the offset and zz for the timezone name."}}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","example":"Welcome to Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Date/Time inputs"},"font_scale":{"title":"Font System"},"colors":{"title":"Colors"},"icons":{"title":"Icons","full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"categories":{"title":"Categories"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation":{"title":"Navigation"},"navigation_bar":{"title":"Navigation Bar"},"navigation_stacked":{"title":"Navigation Stacked"},"categories_list":{"title":"Categories List"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_statuses":{"title":"Topic Statuses"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_timer_info":{"title":"Topic Timers"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"post":{"title":"Post"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"suggested_topics":{"title":"Suggested Topics"},"post_menu":{"title":"Post Menu"},"modal":{"title":"Modal","header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}},"poll":{"results":{"groups":{"title":"You need to be a member of %{groups} to vote in this poll."}},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"between_min_and_max_options":"Choose between \u003cstrong\u003e%{min}\u003c/strong\u003e and \u003cstrong\u003e%{max}\u003c/strong\u003e options."}},"hide-results":{"label":"Show vote"},"group-results":{"title":"Group votes by user field","label":"Show breakdown"},"export-results":{"title":"Export the poll results"},"breakdown":{"title":"Poll results","votes":"%{count} votes","breakdown":"Breakdown","percentage":"Percentage","count":"Count"},"error_while_exporting_results":"Sorry, there was an error exporting poll results.","ui_builder":{"help":{"options_count":"Enter at least 1 option"},"poll_groups":{"label":"Allowed groups"},"poll_chart_type":{"label":"Chart type","bar":"Bar","pie":"Pie"},"poll_title":{"label":"Title (optional)"}}},"chat_integration":{"group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","filter":{"thread":"All posts with threaded replies"},"provider":{"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Name","help":"A name for the channel (only shown in the Discourse admin interface)"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new webhook"}}}}}}}};
I18n.locale = 'ur';
I18n.pluralizationRules.ur = MessageFormat.locale.ur;
//! moment.js
//! version : 2.29.1
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    global.moment = factory()
}(this, (function () { 'use strict';

    var hookCallback;

    function hooks() {
        return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback(callback) {
        hookCallback = callback;
    }

    function isArray(input) {
        return (
            input instanceof Array ||
            Object.prototype.toString.call(input) === '[object Array]'
        );
    }

    function isObject(input) {
        // IE8 will treat undefined and null as object if it wasn't for
        // input != null
        return (
            input != null &&
            Object.prototype.toString.call(input) === '[object Object]'
        );
    }

    function hasOwnProp(a, b) {
        return Object.prototype.hasOwnProperty.call(a, b);
    }

    function isObjectEmpty(obj) {
        if (Object.getOwnPropertyNames) {
            return Object.getOwnPropertyNames(obj).length === 0;
        } else {
            var k;
            for (k in obj) {
                if (hasOwnProp(obj, k)) {
                    return false;
                }
            }
            return true;
        }
    }

    function isUndefined(input) {
        return input === void 0;
    }

    function isNumber(input) {
        return (
            typeof input === 'number' ||
            Object.prototype.toString.call(input) === '[object Number]'
        );
    }

    function isDate(input) {
        return (
            input instanceof Date ||
            Object.prototype.toString.call(input) === '[object Date]'
        );
    }

    function map(arr, fn) {
        var res = [],
            i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function createUTC(input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
        // We need to deep clone this object.
        return {
            empty: false,
            unusedTokens: [],
            unusedInput: [],
            overflow: -2,
            charsLeftOver: 0,
            nullInput: false,
            invalidEra: null,
            invalidMonth: null,
            invalidFormat: false,
            userInvalidated: false,
            iso: false,
            parsedDateParts: [],
            era: null,
            meridiem: null,
            rfc2822: false,
            weekdayMismatch: false,
        };
    }

    function getParsingFlags(m) {
        if (m._pf == null) {
            m._pf = defaultParsingFlags();
        }
        return m._pf;
    }

    var some;
    if (Array.prototype.some) {
        some = Array.prototype.some;
    } else {
        some = function (fun) {
            var t = Object(this),
                len = t.length >>> 0,
                i;

            for (i = 0; i < len; i++) {
                if (i in t && fun.call(this, t[i], i, t)) {
                    return true;
                }
            }

            return false;
        };
    }

    function isValid(m) {
        if (m._isValid == null) {
            var flags = getParsingFlags(m),
                parsedParts = some.call(flags.parsedDateParts, function (i) {
                    return i != null;
                }),
                isNowValid =
                    !isNaN(m._d.getTime()) &&
                    flags.overflow < 0 &&
                    !flags.empty &&
                    !flags.invalidEra &&
                    !flags.invalidMonth &&
                    !flags.invalidWeekday &&
                    !flags.weekdayMismatch &&
                    !flags.nullInput &&
                    !flags.invalidFormat &&
                    !flags.userInvalidated &&
                    (!flags.meridiem || (flags.meridiem && parsedParts));

            if (m._strict) {
                isNowValid =
                    isNowValid &&
                    flags.charsLeftOver === 0 &&
                    flags.unusedTokens.length === 0 &&
                    flags.bigHour === undefined;
            }

            if (Object.isFrozen == null || !Object.isFrozen(m)) {
                m._isValid = isNowValid;
            } else {
                return isNowValid;
            }
        }
        return m._isValid;
    }

    function createInvalid(flags) {
        var m = createUTC(NaN);
        if (flags != null) {
            extend(getParsingFlags(m), flags);
        } else {
            getParsingFlags(m).userInvalidated = true;
        }

        return m;
    }

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    var momentProperties = (hooks.momentProperties = []),
        updateInProgress = false;

    function copyConfig(to, from) {
        var i, prop, val;

        if (!isUndefined(from._isAMomentObject)) {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (!isUndefined(from._i)) {
            to._i = from._i;
        }
        if (!isUndefined(from._f)) {
            to._f = from._f;
        }
        if (!isUndefined(from._l)) {
            to._l = from._l;
        }
        if (!isUndefined(from._strict)) {
            to._strict = from._strict;
        }
        if (!isUndefined(from._tzm)) {
            to._tzm = from._tzm;
        }
        if (!isUndefined(from._isUTC)) {
            to._isUTC = from._isUTC;
        }
        if (!isUndefined(from._offset)) {
            to._offset = from._offset;
        }
        if (!isUndefined(from._pf)) {
            to._pf = getParsingFlags(from);
        }
        if (!isUndefined(from._locale)) {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i = 0; i < momentProperties.length; i++) {
                prop = momentProperties[i];
                val = from[prop];
                if (!isUndefined(val)) {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    // Moment prototype object
    function Moment(config) {
        copyConfig(this, config);
        this._d = new Date(config._d != null ? config._d.getTime() : NaN);
        if (!this.isValid()) {
            this._d = new Date(NaN);
        }
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    function isMoment(obj) {
        return (
            obj instanceof Moment || (obj != null && obj._isAMomentObject != null)
        );
    }

    function warn(msg) {
        if (
            hooks.suppressDeprecationWarnings === false &&
            typeof console !== 'undefined' &&
            console.warn
        ) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;

        return extend(function () {
            if (hooks.deprecationHandler != null) {
                hooks.deprecationHandler(null, msg);
            }
            if (firstTime) {
                var args = [],
                    arg,
                    i,
                    key;
                for (i = 0; i < arguments.length; i++) {
                    arg = '';
                    if (typeof arguments[i] === 'object') {
                        arg += '\n[' + i + '] ';
                        for (key in arguments[0]) {
                            if (hasOwnProp(arguments[0], key)) {
                                arg += key + ': ' + arguments[0][key] + ', ';
                            }
                        }
                        arg = arg.slice(0, -2); // Remove trailing comma and space
                    } else {
                        arg = arguments[i];
                    }
                    args.push(arg);
                }
                warn(
                    msg +
                        '\nArguments: ' +
                        Array.prototype.slice.call(args).join('') +
                        '\n' +
                        new Error().stack
                );
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
        if (hooks.deprecationHandler != null) {
            hooks.deprecationHandler(name, msg);
        }
        if (!deprecations[name]) {
            warn(msg);
            deprecations[name] = true;
        }
    }

    hooks.suppressDeprecationWarnings = false;
    hooks.deprecationHandler = null;

    function isFunction(input) {
        return (
            (typeof Function !== 'undefined' && input instanceof Function) ||
            Object.prototype.toString.call(input) === '[object Function]'
        );
    }

    function set(config) {
        var prop, i;
        for (i in config) {
            if (hasOwnProp(config, i)) {
                prop = config[i];
                if (isFunction(prop)) {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
        // TODO: Remove "ordinalParse" fallback in next major release.
        this._dayOfMonthOrdinalParseLenient = new RegExp(
            (this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
                '|' +
                /\d{1,2}/.source
        );
    }

    function mergeConfigs(parentConfig, childConfig) {
        var res = extend({}, parentConfig),
            prop;
        for (prop in childConfig) {
            if (hasOwnProp(childConfig, prop)) {
                if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
                    res[prop] = {};
                    extend(res[prop], parentConfig[prop]);
                    extend(res[prop], childConfig[prop]);
                } else if (childConfig[prop] != null) {
                    res[prop] = childConfig[prop];
                } else {
                    delete res[prop];
                }
            }
        }
        for (prop in parentConfig) {
            if (
                hasOwnProp(parentConfig, prop) &&
                !hasOwnProp(childConfig, prop) &&
                isObject(parentConfig[prop])
            ) {
                // make sure changes to properties don't modify parent config
                res[prop] = extend({}, res[prop]);
            }
        }
        return res;
    }

    function Locale(config) {
        if (config != null) {
            this.set(config);
        }
    }

    var keys;

    if (Object.keys) {
        keys = Object.keys;
    } else {
        keys = function (obj) {
            var i,
                res = [];
            for (i in obj) {
                if (hasOwnProp(obj, i)) {
                    res.push(i);
                }
            }
            return res;
        };
    }

    var defaultCalendar = {
        sameDay: '[Today at] LT',
        nextDay: '[Tomorrow at] LT',
        nextWeek: 'dddd [at] LT',
        lastDay: '[Yesterday at] LT',
        lastWeek: '[Last] dddd [at] LT',
        sameElse: 'L',
    };

    function calendar(key, mom, now) {
        var output = this._calendar[key] || this._calendar['sameElse'];
        return isFunction(output) ? output.call(mom, now) : output;
    }

    function zeroFill(number, targetLength, forceSign) {
        var absNumber = '' + Math.abs(number),
            zerosToFill = targetLength - absNumber.length,
            sign = number >= 0;
        return (
            (sign ? (forceSign ? '+' : '') : '-') +
            Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) +
            absNumber
        );
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
        formatFunctions = {},
        formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken(token, padded, ordinal, callback) {
        var func = callback;
        if (typeof callback === 'string') {
            func = function () {
                return this[callback]();
            };
        }
        if (token) {
            formatTokenFunctions[token] = func;
        }
        if (padded) {
            formatTokenFunctions[padded[0]] = function () {
                return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
            };
        }
        if (ordinal) {
            formatTokenFunctions[ordinal] = function () {
                return this.localeData().ordinal(
                    func.apply(this, arguments),
                    token
                );
            };
        }
    }

    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens),
            i,
            length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '',
                i;
            for (i = 0; i < length; i++) {
                output += isFunction(array[i])
                    ? array[i].call(mom, format)
                    : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());
        formatFunctions[format] =
            formatFunctions[format] || makeFormatFunction(format);

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(
                localFormattingTokens,
                replaceLongDateFormatTokens
            );
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }

    var defaultLongDateFormat = {
        LTS: 'h:mm:ss A',
        LT: 'h:mm A',
        L: 'MM/DD/YYYY',
        LL: 'MMMM D, YYYY',
        LLL: 'MMMM D, YYYY h:mm A',
        LLLL: 'dddd, MMMM D, YYYY h:mm A',
    };

    function longDateFormat(key) {
        var format = this._longDateFormat[key],
            formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper
            .match(formattingTokens)
            .map(function (tok) {
                if (
                    tok === 'MMMM' ||
                    tok === 'MM' ||
                    tok === 'DD' ||
                    tok === 'dddd'
                ) {
                    return tok.slice(1);
                }
                return tok;
            })
            .join('');

        return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate() {
        return this._invalidDate;
    }

    var defaultOrdinal = '%d',
        defaultDayOfMonthOrdinalParse = /\d{1,2}/;

    function ordinal(number) {
        return this._ordinal.replace('%d', number);
    }

    var defaultRelativeTime = {
        future: 'in %s',
        past: '%s ago',
        s: 'a few seconds',
        ss: '%d seconds',
        m: 'a minute',
        mm: '%d minutes',
        h: 'an hour',
        hh: '%d hours',
        d: 'a day',
        dd: '%d days',
        w: 'a week',
        ww: '%d weeks',
        M: 'a month',
        MM: '%d months',
        y: 'a year',
        yy: '%d years',
    };

    function relativeTime(number, withoutSuffix, string, isFuture) {
        var output = this._relativeTime[string];
        return isFunction(output)
            ? output(number, withoutSuffix, string, isFuture)
            : output.replace(/%d/i, number);
    }

    function pastFuture(diff, output) {
        var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
        return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    }

    var aliases = {};

    function addUnitAlias(unit, shorthand) {
        var lowerCase = unit.toLowerCase();
        aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
        return typeof units === 'string'
            ? aliases[units] || aliases[units.toLowerCase()]
            : undefined;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    var priorities = {};

    function addUnitPriority(unit, priority) {
        priorities[unit] = priority;
    }

    function getPrioritizedUnits(unitsObj) {
        var units = [],
            u;
        for (u in unitsObj) {
            if (hasOwnProp(unitsObj, u)) {
                units.push({ unit: u, priority: priorities[u] });
            }
        }
        units.sort(function (a, b) {
            return a.priority - b.priority;
        });
        return units;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function absFloor(number) {
        if (number < 0) {
            // -0 -> 0
            return Math.ceil(number) || 0;
        } else {
            return Math.floor(number);
        }
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            value = absFloor(coercedNumber);
        }

        return value;
    }

    function makeGetSet(unit, keepTime) {
        return function (value) {
            if (value != null) {
                set$1(this, unit, value);
                hooks.updateOffset(this, keepTime);
                return this;
            } else {
                return get(this, unit);
            }
        };
    }

    function get(mom, unit) {
        return mom.isValid()
            ? mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]()
            : NaN;
    }

    function set$1(mom, unit, value) {
        if (mom.isValid() && !isNaN(value)) {
            if (
                unit === 'FullYear' &&
                isLeapYear(mom.year()) &&
                mom.month() === 1 &&
                mom.date() === 29
            ) {
                value = toInt(value);
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](
                    value,
                    mom.month(),
                    daysInMonth(value, mom.month())
                );
            } else {
                mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
            }
        }
    }

    // MOMENTS

    function stringGet(units) {
        units = normalizeUnits(units);
        if (isFunction(this[units])) {
            return this[units]();
        }
        return this;
    }

    function stringSet(units, value) {
        if (typeof units === 'object') {
            units = normalizeObjectUnits(units);
            var prioritized = getPrioritizedUnits(units),
                i;
            for (i = 0; i < prioritized.length; i++) {
                this[prioritized[i].unit](units[prioritized[i].unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (isFunction(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    var match1 = /\d/, //       0 - 9
        match2 = /\d\d/, //      00 - 99
        match3 = /\d{3}/, //     000 - 999
        match4 = /\d{4}/, //    0000 - 9999
        match6 = /[+-]?\d{6}/, // -999999 - 999999
        match1to2 = /\d\d?/, //       0 - 99
        match3to4 = /\d\d\d\d?/, //     999 - 9999
        match5to6 = /\d\d\d\d\d\d?/, //   99999 - 999999
        match1to3 = /\d{1,3}/, //       0 - 999
        match1to4 = /\d{1,4}/, //       0 - 9999
        match1to6 = /[+-]?\d{1,6}/, // -999999 - 999999
        matchUnsigned = /\d+/, //       0 - inf
        matchSigned = /[+-]?\d+/, //    -inf - inf
        matchOffset = /Z|[+-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi, // +00 -00 +00:00 -00:00 +0000 -0000 or Z
        matchTimestamp = /[+-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
        // any word (or two) characters or numbers including two/three word month in arabic.
        // includes scottish gaelic two word and hyphenated months
        matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,
        regexes;

    regexes = {};

    function addRegexToken(token, regex, strictRegex) {
        regexes[token] = isFunction(regex)
            ? regex
            : function (isStrict, localeData) {
                  return isStrict && strictRegex ? strictRegex : regex;
              };
    }

    function getParseRegexForToken(token, config) {
        if (!hasOwnProp(regexes, token)) {
            return new RegExp(unescapeFormat(token));
        }

        return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
        return regexEscape(
            s
                .replace('\\', '')
                .replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (
                    matched,
                    p1,
                    p2,
                    p3,
                    p4
                ) {
                    return p1 || p2 || p3 || p4;
                })
        );
    }

    function regexEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken(token, callback) {
        var i,
            func = callback;
        if (typeof token === 'string') {
            token = [token];
        }
        if (isNumber(callback)) {
            func = function (input, array) {
                array[callback] = toInt(input);
            };
        }
        for (i = 0; i < token.length; i++) {
            tokens[token[i]] = func;
        }
    }

    function addWeekParseToken(token, callback) {
        addParseToken(token, function (input, array, config, token) {
            config._w = config._w || {};
            callback(input, config._w, config, token);
        });
    }

    function addTimeToArrayFromToken(token, input, config) {
        if (input != null && hasOwnProp(tokens, token)) {
            tokens[token](input, config._a, config, token);
        }
    }

    var YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,
        WEEK = 7,
        WEEKDAY = 8;

    function mod(n, x) {
        return ((n % x) + x) % x;
    }

    var indexOf;

    if (Array.prototype.indexOf) {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function (o) {
            // I know
            var i;
            for (i = 0; i < this.length; ++i) {
                if (this[i] === o) {
                    return i;
                }
            }
            return -1;
        };
    }

    function daysInMonth(year, month) {
        if (isNaN(year) || isNaN(month)) {
            return NaN;
        }
        var modMonth = mod(month, 12);
        year += (month - modMonth) / 12;
        return modMonth === 1
            ? isLeapYear(year)
                ? 29
                : 28
            : 31 - ((modMonth % 7) % 2);
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
        return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
        return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
        return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PRIORITY

    addUnitPriority('month', 8);

    // PARSING

    addRegexToken('M', match1to2);
    addRegexToken('MM', match1to2, match2);
    addRegexToken('MMM', function (isStrict, locale) {
        return locale.monthsShortRegex(isStrict);
    });
    addRegexToken('MMMM', function (isStrict, locale) {
        return locale.monthsRegex(isStrict);
    });

    addParseToken(['M', 'MM'], function (input, array) {
        array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
        var month = config._locale.monthsParse(input, token, config._strict);
        // if we didn't find a month name, mark the date as invalid.
        if (month != null) {
            array[MONTH] = month;
        } else {
            getParsingFlags(config).invalidMonth = input;
        }
    });

    // LOCALES

    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split(
            '_'
        ),
        defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split(
            '_'
        ),
        MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,
        defaultMonthsShortRegex = matchWord,
        defaultMonthsRegex = matchWord;

    function localeMonths(m, format) {
        if (!m) {
            return isArray(this._months)
                ? this._months
                : this._months['standalone'];
        }
        return isArray(this._months)
            ? this._months[m.month()]
            : this._months[
                  (this._months.isFormat || MONTHS_IN_FORMAT).test(format)
                      ? 'format'
                      : 'standalone'
              ][m.month()];
    }

    function localeMonthsShort(m, format) {
        if (!m) {
            return isArray(this._monthsShort)
                ? this._monthsShort
                : this._monthsShort['standalone'];
        }
        return isArray(this._monthsShort)
            ? this._monthsShort[m.month()]
            : this._monthsShort[
                  MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'
              ][m.month()];
    }

    function handleStrictParse(monthName, format, strict) {
        var i,
            ii,
            mom,
            llc = monthName.toLocaleLowerCase();
        if (!this._monthsParse) {
            // this is not used
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
            for (i = 0; i < 12; ++i) {
                mom = createUTC([2000, i]);
                this._shortMonthsParse[i] = this.monthsShort(
                    mom,
                    ''
                ).toLocaleLowerCase();
                this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'MMM') {
                ii = indexOf.call(this._shortMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._longMonthsParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._longMonthsParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortMonthsParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeMonthsParse(monthName, format, strict) {
        var i, mom, regex;

        if (this._monthsParseExact) {
            return handleStrictParse.call(this, monthName, format, strict);
        }

        if (!this._monthsParse) {
            this._monthsParse = [];
            this._longMonthsParse = [];
            this._shortMonthsParse = [];
        }

        // TODO: add sorting
        // Sorting makes sure if one month (or abbr) is a prefix of another
        // see sorting in computeMonthsParse
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            if (strict && !this._longMonthsParse[i]) {
                this._longMonthsParse[i] = new RegExp(
                    '^' + this.months(mom, '').replace('.', '') + '$',
                    'i'
                );
                this._shortMonthsParse[i] = new RegExp(
                    '^' + this.monthsShort(mom, '').replace('.', '') + '$',
                    'i'
                );
            }
            if (!strict && !this._monthsParse[i]) {
                regex =
                    '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (
                strict &&
                format === 'MMMM' &&
                this._longMonthsParse[i].test(monthName)
            ) {
                return i;
            } else if (
                strict &&
                format === 'MMM' &&
                this._shortMonthsParse[i].test(monthName)
            ) {
                return i;
            } else if (!strict && this._monthsParse[i].test(monthName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function setMonth(mom, value) {
        var dayOfMonth;

        if (!mom.isValid()) {
            // No op
            return mom;
        }

        if (typeof value === 'string') {
            if (/^\d+$/.test(value)) {
                value = toInt(value);
            } else {
                value = mom.localeData().monthsParse(value);
                // TODO: Another silent failure?
                if (!isNumber(value)) {
                    return mom;
                }
            }
        }

        dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function getSetMonth(value) {
        if (value != null) {
            setMonth(this, value);
            hooks.updateOffset(this, true);
            return this;
        } else {
            return get(this, 'Month');
        }
    }

    function getDaysInMonth() {
        return daysInMonth(this.year(), this.month());
    }

    function monthsShortRegex(isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsShortStrictRegex;
            } else {
                return this._monthsShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsShortRegex')) {
                this._monthsShortRegex = defaultMonthsShortRegex;
            }
            return this._monthsShortStrictRegex && isStrict
                ? this._monthsShortStrictRegex
                : this._monthsShortRegex;
        }
    }

    function monthsRegex(isStrict) {
        if (this._monthsParseExact) {
            if (!hasOwnProp(this, '_monthsRegex')) {
                computeMonthsParse.call(this);
            }
            if (isStrict) {
                return this._monthsStrictRegex;
            } else {
                return this._monthsRegex;
            }
        } else {
            if (!hasOwnProp(this, '_monthsRegex')) {
                this._monthsRegex = defaultMonthsRegex;
            }
            return this._monthsStrictRegex && isStrict
                ? this._monthsStrictRegex
                : this._monthsRegex;
        }
    }

    function computeMonthsParse() {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var shortPieces = [],
            longPieces = [],
            mixedPieces = [],
            i,
            mom;
        for (i = 0; i < 12; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, i]);
            shortPieces.push(this.monthsShort(mom, ''));
            longPieces.push(this.months(mom, ''));
            mixedPieces.push(this.months(mom, ''));
            mixedPieces.push(this.monthsShort(mom, ''));
        }
        // Sorting makes sure if one month (or abbr) is a prefix of another it
        // will match the longer piece.
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);
        for (i = 0; i < 12; i++) {
            shortPieces[i] = regexEscape(shortPieces[i]);
            longPieces[i] = regexEscape(longPieces[i]);
        }
        for (i = 0; i < 24; i++) {
            mixedPieces[i] = regexEscape(mixedPieces[i]);
        }

        this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._monthsShortRegex = this._monthsRegex;
        this._monthsStrictRegex = new RegExp(
            '^(' + longPieces.join('|') + ')',
            'i'
        );
        this._monthsShortStrictRegex = new RegExp(
            '^(' + shortPieces.join('|') + ')',
            'i'
        );
    }

    // FORMATTING

    addFormatToken('Y', 0, 0, function () {
        var y = this.year();
        return y <= 9999 ? zeroFill(y, 4) : '+' + y;
    });

    addFormatToken(0, ['YY', 2], 0, function () {
        return this.year() % 100;
    });

    addFormatToken(0, ['YYYY', 4], 0, 'year');
    addFormatToken(0, ['YYYYY', 5], 0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PRIORITIES

    addUnitPriority('year', 1);

    // PARSING

    addRegexToken('Y', matchSigned);
    addRegexToken('YY', match1to2, match2);
    addRegexToken('YYYY', match1to4, match4);
    addRegexToken('YYYYY', match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
        array[YEAR] =
            input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
        array[YEAR] = hooks.parseTwoDigitYear(input);
    });
    addParseToken('Y', function (input, array) {
        array[YEAR] = parseInt(input, 10);
    });

    // HELPERS

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    // HOOKS

    hooks.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', true);

    function getIsLeapYear() {
        return isLeapYear(this.year());
    }

    function createDate(y, m, d, h, M, s, ms) {
        // can't just apply() to create a date:
        // https://stackoverflow.com/q/181348
        var date;
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            date = new Date(y + 400, m, d, h, M, s, ms);
            if (isFinite(date.getFullYear())) {
                date.setFullYear(y);
            }
        } else {
            date = new Date(y, m, d, h, M, s, ms);
        }

        return date;
    }

    function createUTCDate(y) {
        var date, args;
        // the Date.UTC function remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            args = Array.prototype.slice.call(arguments);
            // preserve leap years using a full 400 year cycle, then reset
            args[0] = y + 400;
            date = new Date(Date.UTC.apply(null, args));
            if (isFinite(date.getUTCFullYear())) {
                date.setUTCFullYear(y);
            }
        } else {
            date = new Date(Date.UTC.apply(null, arguments));
        }

        return date;
    }

    // start-of-first-week - start-of-year
    function firstWeekOffset(year, dow, doy) {
        var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
            fwd = 7 + dow - doy,
            // first-week day local weekday -- which local weekday is fwd
            fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

        return -fwdlw + fwd - 1;
    }

    // https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
        var localWeekday = (7 + weekday - dow) % 7,
            weekOffset = firstWeekOffset(year, dow, doy),
            dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
            resYear,
            resDayOfYear;

        if (dayOfYear <= 0) {
            resYear = year - 1;
            resDayOfYear = daysInYear(resYear) + dayOfYear;
        } else if (dayOfYear > daysInYear(year)) {
            resYear = year + 1;
            resDayOfYear = dayOfYear - daysInYear(year);
        } else {
            resYear = year;
            resDayOfYear = dayOfYear;
        }

        return {
            year: resYear,
            dayOfYear: resDayOfYear,
        };
    }

    function weekOfYear(mom, dow, doy) {
        var weekOffset = firstWeekOffset(mom.year(), dow, doy),
            week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
            resWeek,
            resYear;

        if (week < 1) {
            resYear = mom.year() - 1;
            resWeek = week + weeksInYear(resYear, dow, doy);
        } else if (week > weeksInYear(mom.year(), dow, doy)) {
            resWeek = week - weeksInYear(mom.year(), dow, doy);
            resYear = mom.year() + 1;
        } else {
            resYear = mom.year();
            resWeek = week;
        }

        return {
            week: resWeek,
            year: resYear,
        };
    }

    function weeksInYear(year, dow, doy) {
        var weekOffset = firstWeekOffset(year, dow, doy),
            weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
        return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    }

    // FORMATTING

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PRIORITIES

    addUnitPriority('week', 5);
    addUnitPriority('isoWeek', 5);

    // PARSING

    addRegexToken('w', match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W', match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (
        input,
        week,
        config,
        token
    ) {
        week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // LOCALES

    function localeWeek(mom) {
        return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
        dow: 0, // Sunday is the first day of the week.
        doy: 6, // The week that contains Jan 6th is the first week of the year.
    };

    function localeFirstDayOfWeek() {
        return this._week.dow;
    }

    function localeFirstDayOfYear() {
        return this._week.doy;
    }

    // MOMENTS

    function getSetWeek(input) {
        var week = this.localeData().week(this);
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek(input) {
        var week = weekOfYear(this, 1, 4).week;
        return input == null ? week : this.add((input - week) * 7, 'd');
    }

    // FORMATTING

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
        return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
        return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
        return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PRIORITY
    addUnitPriority('day', 11);
    addUnitPriority('weekday', 11);
    addUnitPriority('isoWeekday', 11);

    // PARSING

    addRegexToken('d', match1to2);
    addRegexToken('e', match1to2);
    addRegexToken('E', match1to2);
    addRegexToken('dd', function (isStrict, locale) {
        return locale.weekdaysMinRegex(isStrict);
    });
    addRegexToken('ddd', function (isStrict, locale) {
        return locale.weekdaysShortRegex(isStrict);
    });
    addRegexToken('dddd', function (isStrict, locale) {
        return locale.weekdaysRegex(isStrict);
    });

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
        var weekday = config._locale.weekdaysParse(input, token, config._strict);
        // if we didn't get a weekday name, mark the date as invalid
        if (weekday != null) {
            week.d = weekday;
        } else {
            getParsingFlags(config).invalidWeekday = input;
        }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
        week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
        if (typeof input !== 'string') {
            return input;
        }

        if (!isNaN(input)) {
            return parseInt(input, 10);
        }

        input = locale.weekdaysParse(input);
        if (typeof input === 'number') {
            return input;
        }

        return null;
    }

    function parseIsoWeekday(input, locale) {
        if (typeof input === 'string') {
            return locale.weekdaysParse(input) % 7 || 7;
        }
        return isNaN(input) ? null : input;
    }

    // LOCALES
    function shiftWeekdays(ws, n) {
        return ws.slice(n, 7).concat(ws.slice(0, n));
    }

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split(
            '_'
        ),
        defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        defaultWeekdaysRegex = matchWord,
        defaultWeekdaysShortRegex = matchWord,
        defaultWeekdaysMinRegex = matchWord;

    function localeWeekdays(m, format) {
        var weekdays = isArray(this._weekdays)
            ? this._weekdays
            : this._weekdays[
                  m && m !== true && this._weekdays.isFormat.test(format)
                      ? 'format'
                      : 'standalone'
              ];
        return m === true
            ? shiftWeekdays(weekdays, this._week.dow)
            : m
            ? weekdays[m.day()]
            : weekdays;
    }

    function localeWeekdaysShort(m) {
        return m === true
            ? shiftWeekdays(this._weekdaysShort, this._week.dow)
            : m
            ? this._weekdaysShort[m.day()]
            : this._weekdaysShort;
    }

    function localeWeekdaysMin(m) {
        return m === true
            ? shiftWeekdays(this._weekdaysMin, this._week.dow)
            : m
            ? this._weekdaysMin[m.day()]
            : this._weekdaysMin;
    }

    function handleStrictParse$1(weekdayName, format, strict) {
        var i,
            ii,
            mom,
            llc = weekdayName.toLocaleLowerCase();
        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._minWeekdaysParse = [];

            for (i = 0; i < 7; ++i) {
                mom = createUTC([2000, 1]).day(i);
                this._minWeekdaysParse[i] = this.weekdaysMin(
                    mom,
                    ''
                ).toLocaleLowerCase();
                this._shortWeekdaysParse[i] = this.weekdaysShort(
                    mom,
                    ''
                ).toLocaleLowerCase();
                this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
            }
        }

        if (strict) {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        } else {
            if (format === 'dddd') {
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else if (format === 'ddd') {
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._minWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            } else {
                ii = indexOf.call(this._minWeekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._weekdaysParse, llc);
                if (ii !== -1) {
                    return ii;
                }
                ii = indexOf.call(this._shortWeekdaysParse, llc);
                return ii !== -1 ? ii : null;
            }
        }
    }

    function localeWeekdaysParse(weekdayName, format, strict) {
        var i, mom, regex;

        if (this._weekdaysParseExact) {
            return handleStrictParse$1.call(this, weekdayName, format, strict);
        }

        if (!this._weekdaysParse) {
            this._weekdaysParse = [];
            this._minWeekdaysParse = [];
            this._shortWeekdaysParse = [];
            this._fullWeekdaysParse = [];
        }

        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already

            mom = createUTC([2000, 1]).day(i);
            if (strict && !this._fullWeekdaysParse[i]) {
                this._fullWeekdaysParse[i] = new RegExp(
                    '^' + this.weekdays(mom, '').replace('.', '\\.?') + '$',
                    'i'
                );
                this._shortWeekdaysParse[i] = new RegExp(
                    '^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$',
                    'i'
                );
                this._minWeekdaysParse[i] = new RegExp(
                    '^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$',
                    'i'
                );
            }
            if (!this._weekdaysParse[i]) {
                regex =
                    '^' +
                    this.weekdays(mom, '') +
                    '|^' +
                    this.weekdaysShort(mom, '') +
                    '|^' +
                    this.weekdaysMin(mom, '');
                this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
            }
            // test the regex
            if (
                strict &&
                format === 'dddd' &&
                this._fullWeekdaysParse[i].test(weekdayName)
            ) {
                return i;
            } else if (
                strict &&
                format === 'ddd' &&
                this._shortWeekdaysParse[i].test(weekdayName)
            ) {
                return i;
            } else if (
                strict &&
                format === 'dd' &&
                this._minWeekdaysParse[i].test(weekdayName)
            ) {
                return i;
            } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
                return i;
            }
        }
    }

    // MOMENTS

    function getSetDayOfWeek(input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (input != null) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, 'd');
        } else {
            return day;
        }
    }

    function getSetLocaleDayOfWeek(input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek(input) {
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }

        // behaves the same as moment#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.

        if (input != null) {
            var weekday = parseIsoWeekday(input, this.localeData());
            return this.day(this.day() % 7 ? weekday : weekday - 7);
        } else {
            return this.day() || 7;
        }
    }

    function weekdaysRegex(isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysStrictRegex;
            } else {
                return this._weekdaysRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                this._weekdaysRegex = defaultWeekdaysRegex;
            }
            return this._weekdaysStrictRegex && isStrict
                ? this._weekdaysStrictRegex
                : this._weekdaysRegex;
        }
    }

    function weekdaysShortRegex(isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysShortStrictRegex;
            } else {
                return this._weekdaysShortRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysShortRegex')) {
                this._weekdaysShortRegex = defaultWeekdaysShortRegex;
            }
            return this._weekdaysShortStrictRegex && isStrict
                ? this._weekdaysShortStrictRegex
                : this._weekdaysShortRegex;
        }
    }

    function weekdaysMinRegex(isStrict) {
        if (this._weekdaysParseExact) {
            if (!hasOwnProp(this, '_weekdaysRegex')) {
                computeWeekdaysParse.call(this);
            }
            if (isStrict) {
                return this._weekdaysMinStrictRegex;
            } else {
                return this._weekdaysMinRegex;
            }
        } else {
            if (!hasOwnProp(this, '_weekdaysMinRegex')) {
                this._weekdaysMinRegex = defaultWeekdaysMinRegex;
            }
            return this._weekdaysMinStrictRegex && isStrict
                ? this._weekdaysMinStrictRegex
                : this._weekdaysMinRegex;
        }
    }

    function computeWeekdaysParse() {
        function cmpLenRev(a, b) {
            return b.length - a.length;
        }

        var minPieces = [],
            shortPieces = [],
            longPieces = [],
            mixedPieces = [],
            i,
            mom,
            minp,
            shortp,
            longp;
        for (i = 0; i < 7; i++) {
            // make the regex if we don't have it already
            mom = createUTC([2000, 1]).day(i);
            minp = regexEscape(this.weekdaysMin(mom, ''));
            shortp = regexEscape(this.weekdaysShort(mom, ''));
            longp = regexEscape(this.weekdays(mom, ''));
            minPieces.push(minp);
            shortPieces.push(shortp);
            longPieces.push(longp);
            mixedPieces.push(minp);
            mixedPieces.push(shortp);
            mixedPieces.push(longp);
        }
        // Sorting makes sure if one weekday (or abbr) is a prefix of another it
        // will match the longer piece.
        minPieces.sort(cmpLenRev);
        shortPieces.sort(cmpLenRev);
        longPieces.sort(cmpLenRev);
        mixedPieces.sort(cmpLenRev);

        this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._weekdaysShortRegex = this._weekdaysRegex;
        this._weekdaysMinRegex = this._weekdaysRegex;

        this._weekdaysStrictRegex = new RegExp(
            '^(' + longPieces.join('|') + ')',
            'i'
        );
        this._weekdaysShortStrictRegex = new RegExp(
            '^(' + shortPieces.join('|') + ')',
            'i'
        );
        this._weekdaysMinStrictRegex = new RegExp(
            '^(' + minPieces.join('|') + ')',
            'i'
        );
    }

    // FORMATTING

    function hFormat() {
        return this.hours() % 12 || 12;
    }

    function kFormat() {
        return this.hours() || 24;
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, hFormat);
    addFormatToken('k', ['kk', 2], 0, kFormat);

    addFormatToken('hmm', 0, 0, function () {
        return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    });

    addFormatToken('hmmss', 0, 0, function () {
        return (
            '' +
            hFormat.apply(this) +
            zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2)
        );
    });

    addFormatToken('Hmm', 0, 0, function () {
        return '' + this.hours() + zeroFill(this.minutes(), 2);
    });

    addFormatToken('Hmmss', 0, 0, function () {
        return (
            '' +
            this.hours() +
            zeroFill(this.minutes(), 2) +
            zeroFill(this.seconds(), 2)
        );
    });

    function meridiem(token, lowercase) {
        addFormatToken(token, 0, 0, function () {
            return this.localeData().meridiem(
                this.hours(),
                this.minutes(),
                lowercase
            );
        });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PRIORITY
    addUnitPriority('hour', 13);

    // PARSING

    function matchMeridiem(isStrict, locale) {
        return locale._meridiemParse;
    }

    addRegexToken('a', matchMeridiem);
    addRegexToken('A', matchMeridiem);
    addRegexToken('H', match1to2);
    addRegexToken('h', match1to2);
    addRegexToken('k', match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);
    addRegexToken('kk', match1to2, match2);

    addRegexToken('hmm', match3to4);
    addRegexToken('hmmss', match5to6);
    addRegexToken('Hmm', match3to4);
    addRegexToken('Hmmss', match5to6);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['k', 'kk'], function (input, array, config) {
        var kInput = toInt(input);
        array[HOUR] = kInput === 24 ? 0 : kInput;
    });
    addParseToken(['a', 'A'], function (input, array, config) {
        config._isPm = config._locale.isPM(input);
        config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
        array[HOUR] = toInt(input);
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmmss', function (input, array, config) {
        var pos1 = input.length - 4,
            pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
        getParsingFlags(config).bigHour = true;
    });
    addParseToken('Hmm', function (input, array, config) {
        var pos = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos));
        array[MINUTE] = toInt(input.substr(pos));
    });
    addParseToken('Hmmss', function (input, array, config) {
        var pos1 = input.length - 4,
            pos2 = input.length - 2;
        array[HOUR] = toInt(input.substr(0, pos1));
        array[MINUTE] = toInt(input.substr(pos1, 2));
        array[SECOND] = toInt(input.substr(pos2));
    });

    // LOCALES

    function localeIsPM(input) {
        // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
        // Using charAt should be more compatible.
        return (input + '').toLowerCase().charAt(0) === 'p';
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i,
        // Setting the hour should keep the time, because the user explicitly
        // specified which hour they want. So trying to maintain the same hour (in
        // a new timezone) makes sense. Adding/subtracting hours does not follow
        // this rule.
        getSetHour = makeGetSet('Hours', true);

    function localeMeridiem(hours, minutes, isLower) {
        if (hours > 11) {
            return isLower ? 'pm' : 'PM';
        } else {
            return isLower ? 'am' : 'AM';
        }
    }

    var baseConfig = {
        calendar: defaultCalendar,
        longDateFormat: defaultLongDateFormat,
        invalidDate: defaultInvalidDate,
        ordinal: defaultOrdinal,
        dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
        relativeTime: defaultRelativeTime,

        months: defaultLocaleMonths,
        monthsShort: defaultLocaleMonthsShort,

        week: defaultLocaleWeek,

        weekdays: defaultLocaleWeekdays,
        weekdaysMin: defaultLocaleWeekdaysMin,
        weekdaysShort: defaultLocaleWeekdaysShort,

        meridiemParse: defaultLocaleMeridiemParse,
    };

    // internal storage for locale config files
    var locales = {},
        localeFamilies = {},
        globalLocale;

    function commonPrefix(arr1, arr2) {
        var i,
            minl = Math.min(arr1.length, arr2.length);
        for (i = 0; i < minl; i += 1) {
            if (arr1[i] !== arr2[i]) {
                return i;
            }
        }
        return minl;
    }

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0,
            j,
            next,
            locale,
            split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (
                    next &&
                    next.length >= j &&
                    commonPrefix(split, next) >= j - 1
                ) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return globalLocale;
    }

    function loadLocale(name) {
        var oldLocale = null,
            aliasedRequire;
        // TODO: Find a better way to register and load all the locales in Node
        if (
            locales[name] === undefined &&
            typeof module !== 'undefined' &&
            module &&
            module.exports
        ) {
            try {
                oldLocale = globalLocale._abbr;
                aliasedRequire = require;
                aliasedRequire('./locale/' + name);
                getSetGlobalLocale(oldLocale);
            } catch (e) {
                // mark as not found to avoid repeating expensive file require call causing high CPU
                // when trying to find en-US, en_US, en-us for every format call
                locales[name] = null; // null means not found
            }
        }
        return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function getSetGlobalLocale(key, values) {
        var data;
        if (key) {
            if (isUndefined(values)) {
                data = getLocale(key);
            } else {
                data = defineLocale(key, values);
            }

            if (data) {
                // moment.duration._locale = moment._locale = data;
                globalLocale = data;
            } else {
                if (typeof console !== 'undefined' && console.warn) {
                    //warn user if arguments are passed but the locale could not be set
                    console.warn(
                        'Locale ' + key + ' not found. Did you forget to load it?'
                    );
                }
            }
        }

        return globalLocale._abbr;
    }

    function defineLocale(name, config) {
        if (config !== null) {
            var locale,
                parentConfig = baseConfig;
            config.abbr = name;
            if (locales[name] != null) {
                deprecateSimple(
                    'defineLocaleOverride',
                    'use moment.updateLocale(localeName, config) to change ' +
                        'an existing locale. moment.defineLocale(localeName, ' +
                        'config) should only be used for creating a new locale ' +
                        'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.'
                );
                parentConfig = locales[name]._config;
            } else if (config.parentLocale != null) {
                if (locales[config.parentLocale] != null) {
                    parentConfig = locales[config.parentLocale]._config;
                } else {
                    locale = loadLocale(config.parentLocale);
                    if (locale != null) {
                        parentConfig = locale._config;
                    } else {
                        if (!localeFamilies[config.parentLocale]) {
                            localeFamilies[config.parentLocale] = [];
                        }
                        localeFamilies[config.parentLocale].push({
                            name: name,
                            config: config,
                        });
                        return null;
                    }
                }
            }
            locales[name] = new Locale(mergeConfigs(parentConfig, config));

            if (localeFamilies[name]) {
                localeFamilies[name].forEach(function (x) {
                    defineLocale(x.name, x.config);
                });
            }

            // backwards compat for now: also set the locale
            // make sure we set the locale AFTER all child locales have been
            // created, so we won't end up with the child locale set.
            getSetGlobalLocale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    }

    function updateLocale(name, config) {
        if (config != null) {
            var locale,
                tmpLocale,
                parentConfig = baseConfig;

            if (locales[name] != null && locales[name].parentLocale != null) {
                // Update existing child locale in-place to avoid memory-leaks
                locales[name].set(mergeConfigs(locales[name]._config, config));
            } else {
                // MERGE
                tmpLocale = loadLocale(name);
                if (tmpLocale != null) {
                    parentConfig = tmpLocale._config;
                }
                config = mergeConfigs(parentConfig, config);
                if (tmpLocale == null) {
                    // updateLocale is called for creating a new locale
                    // Set abbr so it will have a name (getters return
                    // undefined otherwise).
                    config.abbr = name;
                }
                locale = new Locale(config);
                locale.parentLocale = locales[name];
                locales[name] = locale;
            }

            // backwards compat for now: also set the locale
            getSetGlobalLocale(name);
        } else {
            // pass null for config to unupdate, useful for tests
            if (locales[name] != null) {
                if (locales[name].parentLocale != null) {
                    locales[name] = locales[name].parentLocale;
                    if (name === getSetGlobalLocale()) {
                        getSetGlobalLocale(name);
                    }
                } else if (locales[name] != null) {
                    delete locales[name];
                }
            }
        }
        return locales[name];
    }

    // returns locale data
    function getLocale(key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return globalLocale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    }

    function listLocales() {
        return keys(locales);
    }

    function checkOverflow(m) {
        var overflow,
            a = m._a;

        if (a && getParsingFlags(m).overflow === -2) {
            overflow =
                a[MONTH] < 0 || a[MONTH] > 11
                    ? MONTH
                    : a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH])
                    ? DATE
                    : a[HOUR] < 0 ||
                      a[HOUR] > 24 ||
                      (a[HOUR] === 24 &&
                          (a[MINUTE] !== 0 ||
                              a[SECOND] !== 0 ||
                              a[MILLISECOND] !== 0))
                    ? HOUR
                    : a[MINUTE] < 0 || a[MINUTE] > 59
                    ? MINUTE
                    : a[SECOND] < 0 || a[SECOND] > 59
                    ? SECOND
                    : a[MILLISECOND] < 0 || a[MILLISECOND] > 999
                    ? MILLISECOND
                    : -1;

            if (
                getParsingFlags(m)._overflowDayOfYear &&
                (overflow < YEAR || overflow > DATE)
            ) {
                overflow = DATE;
            }
            if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
                overflow = WEEK;
            }
            if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
                overflow = WEEKDAY;
            }

            getParsingFlags(m).overflow = overflow;
        }

        return m;
    }

    // iso 8601 regex
    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
        basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d|))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([+-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
        tzRegex = /Z|[+-]\d\d(?::?\d\d)?/,
        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
            ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
            ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
            ['YYYY-DDD', /\d{4}-\d{3}/],
            ['YYYY-MM', /\d{4}-\d\d/, false],
            ['YYYYYYMMDD', /[+-]\d{10}/],
            ['YYYYMMDD', /\d{8}/],
            ['GGGG[W]WWE', /\d{4}W\d{3}/],
            ['GGGG[W]WW', /\d{4}W\d{2}/, false],
            ['YYYYDDD', /\d{7}/],
            ['YYYYMM', /\d{6}/, false],
            ['YYYY', /\d{4}/, false],
        ],
        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
            ['HH:mm:ss', /\d\d:\d\d:\d\d/],
            ['HH:mm', /\d\d:\d\d/],
            ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
            ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
            ['HHmmss', /\d\d\d\d\d\d/],
            ['HHmm', /\d\d\d\d/],
            ['HH', /\d\d/],
        ],
        aspNetJsonRegex = /^\/?Date\((-?\d+)/i,
        // RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
        rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/,
        obsOffsets = {
            UT: 0,
            GMT: 0,
            EDT: -4 * 60,
            EST: -5 * 60,
            CDT: -5 * 60,
            CST: -6 * 60,
            MDT: -6 * 60,
            MST: -7 * 60,
            PDT: -7 * 60,
            PST: -8 * 60,
        };

    // date from iso format
    function configFromISO(config) {
        var i,
            l,
            string = config._i,
            match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
            allowTime,
            dateFormat,
            timeFormat,
            tzFormat;

        if (match) {
            getParsingFlags(config).iso = true;

            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(match[1])) {
                    dateFormat = isoDates[i][0];
                    allowTime = isoDates[i][2] !== false;
                    break;
                }
            }
            if (dateFormat == null) {
                config._isValid = false;
                return;
            }
            if (match[3]) {
                for (i = 0, l = isoTimes.length; i < l; i++) {
                    if (isoTimes[i][1].exec(match[3])) {
                        // match[2] should be 'T' or space
                        timeFormat = (match[2] || ' ') + isoTimes[i][0];
                        break;
                    }
                }
                if (timeFormat == null) {
                    config._isValid = false;
                    return;
                }
            }
            if (!allowTime && timeFormat != null) {
                config._isValid = false;
                return;
            }
            if (match[4]) {
                if (tzRegex.exec(match[4])) {
                    tzFormat = 'Z';
                } else {
                    config._isValid = false;
                    return;
                }
            }
            config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
            configFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    function extractFromRFC2822Strings(
        yearStr,
        monthStr,
        dayStr,
        hourStr,
        minuteStr,
        secondStr
    ) {
        var result = [
            untruncateYear(yearStr),
            defaultLocaleMonthsShort.indexOf(monthStr),
            parseInt(dayStr, 10),
            parseInt(hourStr, 10),
            parseInt(minuteStr, 10),
        ];

        if (secondStr) {
            result.push(parseInt(secondStr, 10));
        }

        return result;
    }

    function untruncateYear(yearStr) {
        var year = parseInt(yearStr, 10);
        if (year <= 49) {
            return 2000 + year;
        } else if (year <= 999) {
            return 1900 + year;
        }
        return year;
    }

    function preprocessRFC2822(s) {
        // Remove comments and folding whitespace and replace multiple-spaces with a single space
        return s
            .replace(/\([^)]*\)|[\n\t]/g, ' ')
            .replace(/(\s\s+)/g, ' ')
            .replace(/^\s\s*/, '')
            .replace(/\s\s*$/, '');
    }

    function checkWeekday(weekdayStr, parsedInput, config) {
        if (weekdayStr) {
            // TODO: Replace the vanilla JS Date object with an independent day-of-week check.
            var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
                weekdayActual = new Date(
                    parsedInput[0],
                    parsedInput[1],
                    parsedInput[2]
                ).getDay();
            if (weekdayProvided !== weekdayActual) {
                getParsingFlags(config).weekdayMismatch = true;
                config._isValid = false;
                return false;
            }
        }
        return true;
    }

    function calculateOffset(obsOffset, militaryOffset, numOffset) {
        if (obsOffset) {
            return obsOffsets[obsOffset];
        } else if (militaryOffset) {
            // the only allowed military tz is Z
            return 0;
        } else {
            var hm = parseInt(numOffset, 10),
                m = hm % 100,
                h = (hm - m) / 100;
            return h * 60 + m;
        }
    }

    // date and time from ref 2822 format
    function configFromRFC2822(config) {
        var match = rfc2822.exec(preprocessRFC2822(config._i)),
            parsedArray;
        if (match) {
            parsedArray = extractFromRFC2822Strings(
                match[4],
                match[3],
                match[2],
                match[5],
                match[6],
                match[7]
            );
            if (!checkWeekday(match[1], parsedArray, config)) {
                return;
            }

            config._a = parsedArray;
            config._tzm = calculateOffset(match[8], match[9], match[10]);

            config._d = createUTCDate.apply(null, config._a);
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

            getParsingFlags(config).rfc2822 = true;
        } else {
            config._isValid = false;
        }
    }

    // date from 1) ASP.NET, 2) ISO, 3) RFC 2822 formats, or 4) optional fallback if parsing isn't strict
    function configFromString(config) {
        var matched = aspNetJsonRegex.exec(config._i);
        if (matched !== null) {
            config._d = new Date(+matched[1]);
            return;
        }

        configFromISO(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        configFromRFC2822(config);
        if (config._isValid === false) {
            delete config._isValid;
        } else {
            return;
        }

        if (config._strict) {
            config._isValid = false;
        } else {
            // Final attempt, use Input Fallback
            hooks.createFromInputFallback(config);
        }
    }

    hooks.createFromInputFallback = deprecate(
        'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
            'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
            'discouraged. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
        if (a != null) {
            return a;
        }
        if (b != null) {
            return b;
        }
        return c;
    }

    function currentDateArray(config) {
        // hooks is actually the exported moment object
        var nowValue = new Date(hooks.now());
        if (config._useUTC) {
            return [
                nowValue.getUTCFullYear(),
                nowValue.getUTCMonth(),
                nowValue.getUTCDate(),
            ];
        }
        return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray(config) {
        var i,
            date,
            input = [],
            currentDate,
            expectedWeekday,
            yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear != null) {
            yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

            if (
                config._dayOfYear > daysInYear(yearToUse) ||
                config._dayOfYear === 0
            ) {
                getParsingFlags(config)._overflowDayOfYear = true;
            }

            date = createUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] =
                config._a[i] == null ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (
            config._a[HOUR] === 24 &&
            config._a[MINUTE] === 0 &&
            config._a[SECOND] === 0 &&
            config._a[MILLISECOND] === 0
        ) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? createUTCDate : createDate).apply(
            null,
            input
        );
        expectedWeekday = config._useUTC
            ? config._d.getUTCDay()
            : config._d.getDay();

        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }

        // check for mismatching day of week
        if (
            config._w &&
            typeof config._w.d !== 'undefined' &&
            config._w.d !== expectedWeekday
        ) {
            getParsingFlags(config).weekdayMismatch = true;
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow, curWeek;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = defaults(
                w.GG,
                config._a[YEAR],
                weekOfYear(createLocal(), 1, 4).year
            );
            week = defaults(w.W, 1);
            weekday = defaults(w.E, 1);
            if (weekday < 1 || weekday > 7) {
                weekdayOverflow = true;
            }
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            curWeek = weekOfYear(createLocal(), dow, doy);

            weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

            // Default to current week.
            week = defaults(w.w, curWeek.week);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < 0 || weekday > 6) {
                    weekdayOverflow = true;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from beginning of week
                weekday = w.e + dow;
                if (w.e < 0 || w.e > 6) {
                    weekdayOverflow = true;
                }
            } else {
                // default to beginning of week
                weekday = dow;
            }
        }
        if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
            getParsingFlags(config)._overflowWeeks = true;
        } else if (weekdayOverflow != null) {
            getParsingFlags(config)._overflowWeekday = true;
        } else {
            temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
            config._a[YEAR] = temp.year;
            config._dayOfYear = temp.dayOfYear;
        }
    }

    // constant that refers to the ISO standard
    hooks.ISO_8601 = function () {};

    // constant that refers to the RFC 2822 form
    hooks.RFC_2822 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
        // TODO: Move this to another part of the creation flow to prevent circular deps
        if (config._f === hooks.ISO_8601) {
            configFromISO(config);
            return;
        }
        if (config._f === hooks.RFC_2822) {
            configFromRFC2822(config);
            return;
        }
        config._a = [];
        getParsingFlags(config).empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i,
            parsedInput,
            tokens,
            token,
            skipped,
            stringLength = string.length,
            totalParsedInputLength = 0,
            era;

        tokens =
            expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) ||
                [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    getParsingFlags(config).unusedInput.push(skipped);
                }
                string = string.slice(
                    string.indexOf(parsedInput) + parsedInput.length
                );
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    getParsingFlags(config).empty = false;
                } else {
                    getParsingFlags(config).unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            } else if (config._strict && !parsedInput) {
                getParsingFlags(config).unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        getParsingFlags(config).charsLeftOver =
            stringLength - totalParsedInputLength;
        if (string.length > 0) {
            getParsingFlags(config).unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (
            config._a[HOUR] <= 12 &&
            getParsingFlags(config).bigHour === true &&
            config._a[HOUR] > 0
        ) {
            getParsingFlags(config).bigHour = undefined;
        }

        getParsingFlags(config).parsedDateParts = config._a.slice(0);
        getParsingFlags(config).meridiem = config._meridiem;
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(
            config._locale,
            config._a[HOUR],
            config._meridiem
        );

        // handle era
        era = getParsingFlags(config).era;
        if (era !== null) {
            config._a[YEAR] = config._locale.erasConvertYear(era, config._a[YEAR]);
        }

        configFromArray(config);
        checkOverflow(config);
    }

    function meridiemFixWrap(locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // this is not supposed to happen
            return hour;
        }
    }

    // date from string and array of format strings
    function configFromStringAndArray(config) {
        var tempConfig,
            bestMoment,
            scoreToBeat,
            i,
            currentScore,
            validFormatFound,
            bestFormatIsValid = false;

        if (config._f.length === 0) {
            getParsingFlags(config).invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            validFormatFound = false;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._f = config._f[i];
            configFromStringAndFormat(tempConfig);

            if (isValid(tempConfig)) {
                validFormatFound = true;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += getParsingFlags(tempConfig).charsLeftOver;

            //or tokens
            currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

            getParsingFlags(tempConfig).score = currentScore;

            if (!bestFormatIsValid) {
                if (
                    scoreToBeat == null ||
                    currentScore < scoreToBeat ||
                    validFormatFound
                ) {
                    scoreToBeat = currentScore;
                    bestMoment = tempConfig;
                    if (validFormatFound) {
                        bestFormatIsValid = true;
                    }
                }
            } else {
                if (currentScore < scoreToBeat) {
                    scoreToBeat = currentScore;
                    bestMoment = tempConfig;
                }
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
        if (config._d) {
            return;
        }

        var i = normalizeObjectUnits(config._i),
            dayOrDate = i.day === undefined ? i.date : i.day;
        config._a = map(
            [i.year, i.month, dayOrDate, i.hour, i.minute, i.second, i.millisecond],
            function (obj) {
                return obj && parseInt(obj, 10);
            }
        );

        configFromArray(config);
    }

    function createFromConfig(config) {
        var res = new Moment(checkOverflow(prepareConfig(config)));
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    function prepareConfig(config) {
        var input = config._i,
            format = config._f;

        config._locale = config._locale || getLocale(config._l);

        if (input === null || (format === undefined && input === '')) {
            return createInvalid({ nullInput: true });
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (isMoment(input)) {
            return new Moment(checkOverflow(input));
        } else if (isDate(input)) {
            config._d = input;
        } else if (isArray(format)) {
            configFromStringAndArray(config);
        } else if (format) {
            configFromStringAndFormat(config);
        } else {
            configFromInput(config);
        }

        if (!isValid(config)) {
            config._d = null;
        }

        return config;
    }

    function configFromInput(config) {
        var input = config._i;
        if (isUndefined(input)) {
            config._d = new Date(hooks.now());
        } else if (isDate(input)) {
            config._d = new Date(input.valueOf());
        } else if (typeof input === 'string') {
            configFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            configFromArray(config);
        } else if (isObject(input)) {
            configFromObject(config);
        } else if (isNumber(input)) {
            // from milliseconds
            config._d = new Date(input);
        } else {
            hooks.createFromInputFallback(config);
        }
    }

    function createLocalOrUTC(input, format, locale, strict, isUTC) {
        var c = {};

        if (format === true || format === false) {
            strict = format;
            format = undefined;
        }

        if (locale === true || locale === false) {
            strict = locale;
            locale = undefined;
        }

        if (
            (isObject(input) && isObjectEmpty(input)) ||
            (isArray(input) && input.length === 0)
        ) {
            input = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c._isAMomentObject = true;
        c._useUTC = c._isUTC = isUTC;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;

        return createFromConfig(c);
    }

    function createLocal(input, format, locale, strict) {
        return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
            'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
            function () {
                var other = createLocal.apply(null, arguments);
                if (this.isValid() && other.isValid()) {
                    return other < this ? this : other;
                } else {
                    return createInvalid();
                }
            }
        ),
        prototypeMax = deprecate(
            'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
            function () {
                var other = createLocal.apply(null, arguments);
                if (this.isValid() && other.isValid()) {
                    return other > this ? this : other;
                } else {
                    return createInvalid();
                }
            }
        );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return createLocal();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (!moments[i].isValid() || moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    // TODO: Use [].sort instead?
    function min() {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    }

    function max() {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    }

    var now = function () {
        return Date.now ? Date.now() : +new Date();
    };

    var ordering = [
        'year',
        'quarter',
        'month',
        'week',
        'day',
        'hour',
        'minute',
        'second',
        'millisecond',
    ];

    function isDurationValid(m) {
        var key,
            unitHasDecimal = false,
            i;
        for (key in m) {
            if (
                hasOwnProp(m, key) &&
                !(
                    indexOf.call(ordering, key) !== -1 &&
                    (m[key] == null || !isNaN(m[key]))
                )
            ) {
                return false;
            }
        }

        for (i = 0; i < ordering.length; ++i) {
            if (m[ordering[i]]) {
                if (unitHasDecimal) {
                    return false; // only allow non-integers for smallest unit
                }
                if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
                    unitHasDecimal = true;
                }
            }
        }

        return true;
    }

    function isValid$1() {
        return this._isValid;
    }

    function createInvalid$1() {
        return createDuration(NaN);
    }

    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        this._isValid = isDurationValid(normalizedInput);

        // representation for dateAddRemove
        this._milliseconds =
            +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days + weeks * 7;
        // It is impossible to translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months + quarters * 3 + years * 12;

        this._data = {};

        this._locale = getLocale();

        this._bubble();
    }

    function isDuration(obj) {
        return obj instanceof Duration;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.round(-1 * number) * -1;
        } else {
            return Math.round(number);
        }
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if (
                (dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))
            ) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    // FORMATTING

    function offset(token, separator) {
        addFormatToken(token, 0, 0, function () {
            var offset = this.utcOffset(),
                sign = '+';
            if (offset < 0) {
                offset = -offset;
                sign = '-';
            }
            return (
                sign +
                zeroFill(~~(offset / 60), 2) +
                separator +
                zeroFill(~~offset % 60, 2)
            );
        });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z', matchShortOffset);
    addRegexToken('ZZ', matchShortOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
        config._useUTC = true;
        config._tzm = offsetFromString(matchShortOffset, input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(matcher, string) {
        var matches = (string || '').match(matcher),
            chunk,
            parts,
            minutes;

        if (matches === null) {
            return null;
        }

        chunk = matches[matches.length - 1] || [];
        parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
        minutes = +(parts[1] * 60) + toInt(parts[2]);

        return minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff =
                (isMoment(input) || isDate(input)
                    ? input.valueOf()
                    : createLocal(input).valueOf()) - res.valueOf();
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(res._d.valueOf() + diff);
            hooks.updateOffset(res, false);
            return res;
        } else {
            return createLocal(input).local();
        }
    }

    function getDateOffset(m) {
        // On Firefox.24 Date#getTimezoneOffset returns a floating point.
        // https://github.com/moment/moment/pull/1871
        return -Math.round(m._d.getTimezoneOffset());
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset(input, keepLocalTime, keepMinutes) {
        var offset = this._offset || 0,
            localAdjust;
        if (!this.isValid()) {
            return input != null ? this : NaN;
        }
        if (input != null) {
            if (typeof input === 'string') {
                input = offsetFromString(matchShortOffset, input);
                if (input === null) {
                    return this;
                }
            } else if (Math.abs(input) < 16 && !keepMinutes) {
                input = input * 60;
            }
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (localAdjust != null) {
                this.add(localAdjust, 'm');
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    addSubtract(
                        this,
                        createDuration(input - offset, 'm'),
                        1,
                        false
                    );
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    function getSetZone(input, keepLocalTime) {
        if (input != null) {
            if (typeof input !== 'string') {
                input = -input;
            }

            this.utcOffset(input, keepLocalTime);

            return this;
        } else {
            return -this.utcOffset();
        }
    }

    function setOffsetToUTC(keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal(keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), 'm');
            }
        }
        return this;
    }

    function setOffsetToParsedOffset() {
        if (this._tzm != null) {
            this.utcOffset(this._tzm, false, true);
        } else if (typeof this._i === 'string') {
            var tZone = offsetFromString(matchOffset, this._i);
            if (tZone != null) {
                this.utcOffset(tZone);
            } else {
                this.utcOffset(0, true);
            }
        }
        return this;
    }

    function hasAlignedHourOffset(input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime() {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    function isDaylightSavingTimeShifted() {
        if (!isUndefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        var c = {},
            other;

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
            this._isDSTShifted =
                this.isValid() && compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    function isLocal() {
        return this.isValid() ? !this._isUTC : false;
    }

    function isUtcOffset() {
        return this.isValid() ? this._isUTC : false;
    }

    function isUtc() {
        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    // ASP.NET json date format regex
    var aspNetRegex = /^(-|\+)?(?:(\d*)[. ])?(\d+):(\d+)(?::(\d+)(\.\d*)?)?$/,
        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        // and further modified to allow for strings containing both week and day
        isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

    function createDuration(input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            diffRes;

        if (isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months,
            };
        } else if (isNumber(input) || !isNaN(+input)) {
            duration = {};
            if (key) {
                duration[key] = +input;
            } else {
                duration.milliseconds = +input;
            }
        } else if ((match = aspNetRegex.exec(input))) {
            sign = match[1] === '-' ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(absRound(match[MILLISECOND] * 1000)) * sign, // the millisecond decimal point is included in the match
            };
        } else if ((match = isoRegex.exec(input))) {
            sign = match[1] === '-' ? -1 : 1;
            duration = {
                y: parseIso(match[2], sign),
                M: parseIso(match[3], sign),
                w: parseIso(match[4], sign),
                d: parseIso(match[5], sign),
                h: parseIso(match[6], sign),
                m: parseIso(match[7], sign),
                s: parseIso(match[8], sign),
            };
        } else if (duration == null) {
            // checks for null or undefined
            duration = {};
        } else if (
            typeof duration === 'object' &&
            ('from' in duration || 'to' in duration)
        ) {
            diffRes = momentsDifference(
                createLocal(duration.from),
                createLocal(duration.to)
            );

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        if (isDuration(input) && hasOwnProp(input, '_isValid')) {
            ret._isValid = input._isValid;
        }

        return ret;
    }

    createDuration.fn = Duration.prototype;
    createDuration.invalid = createInvalid$1;

    function parseIso(inp, sign) {
        // We'd normally use ~~inp for this, but unfortunately it also
        // converts floats to ints.
        // inp may be undefined, so careful calling replace on it.
        var res = inp && parseFloat(inp.replace(',', '.'));
        // apply sign while we're at it
        return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
        var res = {};

        res.months =
            other.month() - base.month() + (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +base.clone().add(res.months, 'M');

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        if (!(base.isValid() && other.isValid())) {
            return { milliseconds: 0, months: 0 };
        }

        other = cloneWithOffset(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(
                    name,
                    'moment().' +
                        name +
                        '(period, number) is deprecated. Please use moment().' +
                        name +
                        '(number, period). ' +
                        'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.'
                );
                tmp = val;
                val = period;
                period = tmp;
            }

            dur = createDuration(val, period);
            addSubtract(this, dur, direction);
            return this;
        };
    }

    function addSubtract(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = absRound(duration._days),
            months = absRound(duration._months);

        if (!mom.isValid()) {
            // No op
            return;
        }

        updateOffset = updateOffset == null ? true : updateOffset;

        if (months) {
            setMonth(mom, get(mom, 'Month') + months * isAdding);
        }
        if (days) {
            set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
        }
        if (milliseconds) {
            mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
        }
        if (updateOffset) {
            hooks.updateOffset(mom, days || months);
        }
    }

    var add = createAdder(1, 'add'),
        subtract = createAdder(-1, 'subtract');

    function isString(input) {
        return typeof input === 'string' || input instanceof String;
    }

    // type MomentInput = Moment | Date | string | number | (number | string)[] | MomentInputObject | void; // null | undefined
    function isMomentInput(input) {
        return (
            isMoment(input) ||
            isDate(input) ||
            isString(input) ||
            isNumber(input) ||
            isNumberOrStringArray(input) ||
            isMomentInputObject(input) ||
            input === null ||
            input === undefined
        );
    }

    function isMomentInputObject(input) {
        var objectTest = isObject(input) && !isObjectEmpty(input),
            propertyTest = false,
            properties = [
                'years',
                'year',
                'y',
                'months',
                'month',
                'M',
                'days',
                'day',
                'd',
                'dates',
                'date',
                'D',
                'hours',
                'hour',
                'h',
                'minutes',
                'minute',
                'm',
                'seconds',
                'second',
                's',
                'milliseconds',
                'millisecond',
                'ms',
            ],
            i,
            property;

        for (i = 0; i < properties.length; i += 1) {
            property = properties[i];
            propertyTest = propertyTest || hasOwnProp(input, property);
        }

        return objectTest && propertyTest;
    }

    function isNumberOrStringArray(input) {
        var arrayTest = isArray(input),
            dataTypeTest = false;
        if (arrayTest) {
            dataTypeTest =
                input.filter(function (item) {
                    return !isNumber(item) && isString(input);
                }).length === 0;
        }
        return arrayTest && dataTypeTest;
    }

    function isCalendarSpec(input) {
        var objectTest = isObject(input) && !isObjectEmpty(input),
            propertyTest = false,
            properties = [
                'sameDay',
                'nextDay',
                'lastDay',
                'nextWeek',
                'lastWeek',
                'sameElse',
            ],
            i,
            property;

        for (i = 0; i < properties.length; i += 1) {
            property = properties[i];
            propertyTest = propertyTest || hasOwnProp(input, property);
        }

        return objectTest && propertyTest;
    }

    function getCalendarFormat(myMoment, now) {
        var diff = myMoment.diff(now, 'days', true);
        return diff < -6
            ? 'sameElse'
            : diff < -1
            ? 'lastWeek'
            : diff < 0
            ? 'lastDay'
            : diff < 1
            ? 'sameDay'
            : diff < 2
            ? 'nextDay'
            : diff < 7
            ? 'nextWeek'
            : 'sameElse';
    }

    function calendar$1(time, formats) {
        // Support for single parameter, formats only overload to the calendar function
        if (arguments.length === 1) {
            if (!arguments[0]) {
                time = undefined;
                formats = undefined;
            } else if (isMomentInput(arguments[0])) {
                time = arguments[0];
                formats = undefined;
            } else if (isCalendarSpec(arguments[0])) {
                formats = arguments[0];
                time = undefined;
            }
        }
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        var now = time || createLocal(),
            sod = cloneWithOffset(now, this).startOf('day'),
            format = hooks.calendarFormat(this, sod) || 'sameElse',
            output =
                formats &&
                (isFunction(formats[format])
                    ? formats[format].call(this, now)
                    : formats[format]);

        return this.format(
            output || this.localeData().calendar(format, this, createLocal(now))
        );
    }

    function clone() {
        return new Moment(this);
    }

    function isAfter(input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() > localInput.valueOf();
        } else {
            return localInput.valueOf() < this.clone().startOf(units).valueOf();
        }
    }

    function isBefore(input, units) {
        var localInput = isMoment(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() < localInput.valueOf();
        } else {
            return this.clone().endOf(units).valueOf() < localInput.valueOf();
        }
    }

    function isBetween(from, to, units, inclusivity) {
        var localFrom = isMoment(from) ? from : createLocal(from),
            localTo = isMoment(to) ? to : createLocal(to);
        if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
            return false;
        }
        inclusivity = inclusivity || '()';
        return (
            (inclusivity[0] === '('
                ? this.isAfter(localFrom, units)
                : !this.isBefore(localFrom, units)) &&
            (inclusivity[1] === ')'
                ? this.isBefore(localTo, units)
                : !this.isAfter(localTo, units))
        );
    }

    function isSame(input, units) {
        var localInput = isMoment(input) ? input : createLocal(input),
            inputMs;
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units) || 'millisecond';
        if (units === 'millisecond') {
            return this.valueOf() === localInput.valueOf();
        } else {
            inputMs = localInput.valueOf();
            return (
                this.clone().startOf(units).valueOf() <= inputMs &&
                inputMs <= this.clone().endOf(units).valueOf()
            );
        }
    }

    function isSameOrAfter(input, units) {
        return this.isSame(input, units) || this.isAfter(input, units);
    }

    function isSameOrBefore(input, units) {
        return this.isSame(input, units) || this.isBefore(input, units);
    }

    function diff(input, units, asFloat) {
        var that, zoneDelta, output;

        if (!this.isValid()) {
            return NaN;
        }

        that = cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

        units = normalizeUnits(units);

        switch (units) {
            case 'year':
                output = monthDiff(this, that) / 12;
                break;
            case 'month':
                output = monthDiff(this, that);
                break;
            case 'quarter':
                output = monthDiff(this, that) / 3;
                break;
            case 'second':
                output = (this - that) / 1e3;
                break; // 1000
            case 'minute':
                output = (this - that) / 6e4;
                break; // 1000 * 60
            case 'hour':
                output = (this - that) / 36e5;
                break; // 1000 * 60 * 60
            case 'day':
                output = (this - that - zoneDelta) / 864e5;
                break; // 1000 * 60 * 60 * 24, negate dst
            case 'week':
                output = (this - that - zoneDelta) / 6048e5;
                break; // 1000 * 60 * 60 * 24 * 7, negate dst
            default:
                output = this - that;
        }

        return asFloat ? output : absFloor(output);
    }

    function monthDiff(a, b) {
        if (a.date() < b.date()) {
            // end-of-month calculations work correct when the start month has more
            // days than the end month.
            return -monthDiff(b, a);
        }
        // difference in months
        var wholeMonthDiff = (b.year() - a.year()) * 12 + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2,
            adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        //check for negative zero, return zero if negative zero
        return -(wholeMonthDiff + adjust) || 0;
    }

    hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    function toString() {
        return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function toISOString(keepOffset) {
        if (!this.isValid()) {
            return null;
        }
        var utc = keepOffset !== true,
            m = utc ? this.clone().utc() : this;
        if (m.year() < 0 || m.year() > 9999) {
            return formatMoment(
                m,
                utc
                    ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
                    : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ'
            );
        }
        if (isFunction(Date.prototype.toISOString)) {
            // native implementation is ~50x faster, use it when we can
            if (utc) {
                return this.toDate().toISOString();
            } else {
                return new Date(this.valueOf() + this.utcOffset() * 60 * 1000)
                    .toISOString()
                    .replace('Z', formatMoment(m, 'Z'));
            }
        }
        return formatMoment(
            m,
            utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ'
        );
    }

    /**
     * Return a human readable representation of a moment that can
     * also be evaluated to get a new moment which is the same
     *
     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
     */
    function inspect() {
        if (!this.isValid()) {
            return 'moment.invalid(/* ' + this._i + ' */)';
        }
        var func = 'moment',
            zone = '',
            prefix,
            year,
            datetime,
            suffix;
        if (!this.isLocal()) {
            func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
            zone = 'Z';
        }
        prefix = '[' + func + '("]';
        year = 0 <= this.year() && this.year() <= 9999 ? 'YYYY' : 'YYYYYY';
        datetime = '-MM-DD[T]HH:mm:ss.SSS';
        suffix = zone + '[")]';

        return this.format(prefix + year + datetime + suffix);
    }

    function format(inputString) {
        if (!inputString) {
            inputString = this.isUtc()
                ? hooks.defaultFormatUtc
                : hooks.defaultFormat;
        }
        var output = formatMoment(this, inputString);
        return this.localeData().postformat(output);
    }

    function from(time, withoutSuffix) {
        if (
            this.isValid() &&
            ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
        ) {
            return createDuration({ to: this, from: time })
                .locale(this.locale())
                .humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function fromNow(withoutSuffix) {
        return this.from(createLocal(), withoutSuffix);
    }

    function to(time, withoutSuffix) {
        if (
            this.isValid() &&
            ((isMoment(time) && time.isValid()) || createLocal(time).isValid())
        ) {
            return createDuration({ from: this, to: time })
                .locale(this.locale())
                .humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    function toNow(withoutSuffix) {
        return this.to(createLocal(), withoutSuffix);
    }

    // If passed a locale key, it will set the locale for this
    // instance.  Otherwise, it will return the locale configuration
    // variables for this instance.
    function locale(key) {
        var newLocaleData;

        if (key === undefined) {
            return this._locale._abbr;
        } else {
            newLocaleData = getLocale(key);
            if (newLocaleData != null) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    var lang = deprecate(
        'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
        function (key) {
            if (key === undefined) {
                return this.localeData();
            } else {
                return this.locale(key);
            }
        }
    );

    function localeData() {
        return this._locale;
    }

    var MS_PER_SECOND = 1000,
        MS_PER_MINUTE = 60 * MS_PER_SECOND,
        MS_PER_HOUR = 60 * MS_PER_MINUTE,
        MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

    // actual modulo - handles negative numbers (for dates before 1970):
    function mod$1(dividend, divisor) {
        return ((dividend % divisor) + divisor) % divisor;
    }

    function localStartOfDate(y, m, d) {
        // the date constructor remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return new Date(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return new Date(y, m, d).valueOf();
        }
    }

    function utcStartOfDate(y, m, d) {
        // Date.UTC remaps years 0-99 to 1900-1999
        if (y < 100 && y >= 0) {
            // preserve leap years using a full 400 year cycle, then reset
            return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
        } else {
            return Date.UTC(y, m, d);
        }
    }

    function startOf(units) {
        var time, startOfDate;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year(), 0, 1);
                break;
            case 'quarter':
                time = startOfDate(
                    this.year(),
                    this.month() - (this.month() % 3),
                    1
                );
                break;
            case 'month':
                time = startOfDate(this.year(), this.month(), 1);
                break;
            case 'week':
                time = startOfDate(
                    this.year(),
                    this.month(),
                    this.date() - this.weekday()
                );
                break;
            case 'isoWeek':
                time = startOfDate(
                    this.year(),
                    this.month(),
                    this.date() - (this.isoWeekday() - 1)
                );
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date());
                break;
            case 'hour':
                time = this._d.valueOf();
                time -= mod$1(
                    time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
                    MS_PER_HOUR
                );
                break;
            case 'minute':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_MINUTE);
                break;
            case 'second':
                time = this._d.valueOf();
                time -= mod$1(time, MS_PER_SECOND);
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function endOf(units) {
        var time, startOfDate;
        units = normalizeUnits(units);
        if (units === undefined || units === 'millisecond' || !this.isValid()) {
            return this;
        }

        startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

        switch (units) {
            case 'year':
                time = startOfDate(this.year() + 1, 0, 1) - 1;
                break;
            case 'quarter':
                time =
                    startOfDate(
                        this.year(),
                        this.month() - (this.month() % 3) + 3,
                        1
                    ) - 1;
                break;
            case 'month':
                time = startOfDate(this.year(), this.month() + 1, 1) - 1;
                break;
            case 'week':
                time =
                    startOfDate(
                        this.year(),
                        this.month(),
                        this.date() - this.weekday() + 7
                    ) - 1;
                break;
            case 'isoWeek':
                time =
                    startOfDate(
                        this.year(),
                        this.month(),
                        this.date() - (this.isoWeekday() - 1) + 7
                    ) - 1;
                break;
            case 'day':
            case 'date':
                time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
                break;
            case 'hour':
                time = this._d.valueOf();
                time +=
                    MS_PER_HOUR -
                    mod$1(
                        time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE),
                        MS_PER_HOUR
                    ) -
                    1;
                break;
            case 'minute':
                time = this._d.valueOf();
                time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
                break;
            case 'second':
                time = this._d.valueOf();
                time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
                break;
        }

        this._d.setTime(time);
        hooks.updateOffset(this, true);
        return this;
    }

    function valueOf() {
        return this._d.valueOf() - (this._offset || 0) * 60000;
    }

    function unix() {
        return Math.floor(this.valueOf() / 1000);
    }

    function toDate() {
        return new Date(this.valueOf());
    }

    function toArray() {
        var m = this;
        return [
            m.year(),
            m.month(),
            m.date(),
            m.hour(),
            m.minute(),
            m.second(),
            m.millisecond(),
        ];
    }

    function toObject() {
        var m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds(),
        };
    }

    function toJSON() {
        // new Date(NaN).toJSON() === null
        return this.isValid() ? this.toISOString() : null;
    }

    function isValid$2() {
        return isValid(this);
    }

    function parsingFlags() {
        return extend({}, getParsingFlags(this));
    }

    function invalidAt() {
        return getParsingFlags(this).overflow;
    }

    function creationData() {
        return {
            input: this._i,
            format: this._f,
            locale: this._locale,
            isUTC: this._isUTC,
            strict: this._strict,
        };
    }

    addFormatToken('N', 0, 0, 'eraAbbr');
    addFormatToken('NN', 0, 0, 'eraAbbr');
    addFormatToken('NNN', 0, 0, 'eraAbbr');
    addFormatToken('NNNN', 0, 0, 'eraName');
    addFormatToken('NNNNN', 0, 0, 'eraNarrow');

    addFormatToken('y', ['y', 1], 'yo', 'eraYear');
    addFormatToken('y', ['yy', 2], 0, 'eraYear');
    addFormatToken('y', ['yyy', 3], 0, 'eraYear');
    addFormatToken('y', ['yyyy', 4], 0, 'eraYear');

    addRegexToken('N', matchEraAbbr);
    addRegexToken('NN', matchEraAbbr);
    addRegexToken('NNN', matchEraAbbr);
    addRegexToken('NNNN', matchEraName);
    addRegexToken('NNNNN', matchEraNarrow);

    addParseToken(['N', 'NN', 'NNN', 'NNNN', 'NNNNN'], function (
        input,
        array,
        config,
        token
    ) {
        var era = config._locale.erasParse(input, token, config._strict);
        if (era) {
            getParsingFlags(config).era = era;
        } else {
            getParsingFlags(config).invalidEra = input;
        }
    });

    addRegexToken('y', matchUnsigned);
    addRegexToken('yy', matchUnsigned);
    addRegexToken('yyy', matchUnsigned);
    addRegexToken('yyyy', matchUnsigned);
    addRegexToken('yo', matchEraYearOrdinal);

    addParseToken(['y', 'yy', 'yyy', 'yyyy'], YEAR);
    addParseToken(['yo'], function (input, array, config, token) {
        var match;
        if (config._locale._eraYearOrdinalRegex) {
            match = input.match(config._locale._eraYearOrdinalRegex);
        }

        if (config._locale.eraYearOrdinalParse) {
            array[YEAR] = config._locale.eraYearOrdinalParse(input, match);
        } else {
            array[YEAR] = parseInt(input, 10);
        }
    });

    function localeEras(m, format) {
        var i,
            l,
            date,
            eras = this._eras || getLocale('en')._eras;
        for (i = 0, l = eras.length; i < l; ++i) {
            switch (typeof eras[i].since) {
                case 'string':
                    // truncate time
                    date = hooks(eras[i].since).startOf('day');
                    eras[i].since = date.valueOf();
                    break;
            }

            switch (typeof eras[i].until) {
                case 'undefined':
                    eras[i].until = +Infinity;
                    break;
                case 'string':
                    // truncate time
                    date = hooks(eras[i].until).startOf('day').valueOf();
                    eras[i].until = date.valueOf();
                    break;
            }
        }
        return eras;
    }

    function localeErasParse(eraName, format, strict) {
        var i,
            l,
            eras = this.eras(),
            name,
            abbr,
            narrow;
        eraName = eraName.toUpperCase();

        for (i = 0, l = eras.length; i < l; ++i) {
            name = eras[i].name.toUpperCase();
            abbr = eras[i].abbr.toUpperCase();
            narrow = eras[i].narrow.toUpperCase();

            if (strict) {
                switch (format) {
                    case 'N':
                    case 'NN':
                    case 'NNN':
                        if (abbr === eraName) {
                            return eras[i];
                        }
                        break;

                    case 'NNNN':
                        if (name === eraName) {
                            return eras[i];
                        }
                        break;

                    case 'NNNNN':
                        if (narrow === eraName) {
                            return eras[i];
                        }
                        break;
                }
            } else if ([name, abbr, narrow].indexOf(eraName) >= 0) {
                return eras[i];
            }
        }
    }

    function localeErasConvertYear(era, year) {
        var dir = era.since <= era.until ? +1 : -1;
        if (year === undefined) {
            return hooks(era.since).year();
        } else {
            return hooks(era.since).year() + (year - era.offset) * dir;
        }
    }

    function getEraName() {
        var i,
            l,
            val,
            eras = this.localeData().eras();
        for (i = 0, l = eras.length; i < l; ++i) {
            // truncate time
            val = this.clone().startOf('day').valueOf();

            if (eras[i].since <= val && val <= eras[i].until) {
                return eras[i].name;
            }
            if (eras[i].until <= val && val <= eras[i].since) {
                return eras[i].name;
            }
        }

        return '';
    }

    function getEraNarrow() {
        var i,
            l,
            val,
            eras = this.localeData().eras();
        for (i = 0, l = eras.length; i < l; ++i) {
            // truncate time
            val = this.clone().startOf('day').valueOf();

            if (eras[i].since <= val && val <= eras[i].until) {
                return eras[i].narrow;
            }
            if (eras[i].until <= val && val <= eras[i].since) {
                return eras[i].narrow;
            }
        }

        return '';
    }

    function getEraAbbr() {
        var i,
            l,
            val,
            eras = this.localeData().eras();
        for (i = 0, l = eras.length; i < l; ++i) {
            // truncate time
            val = this.clone().startOf('day').valueOf();

            if (eras[i].since <= val && val <= eras[i].until) {
                return eras[i].abbr;
            }
            if (eras[i].until <= val && val <= eras[i].since) {
                return eras[i].abbr;
            }
        }

        return '';
    }

    function getEraYear() {
        var i,
            l,
            dir,
            val,
            eras = this.localeData().eras();
        for (i = 0, l = eras.length; i < l; ++i) {
            dir = eras[i].since <= eras[i].until ? +1 : -1;

            // truncate time
            val = this.clone().startOf('day').valueOf();

            if (
                (eras[i].since <= val && val <= eras[i].until) ||
                (eras[i].until <= val && val <= eras[i].since)
            ) {
                return (
                    (this.year() - hooks(eras[i].since).year()) * dir +
                    eras[i].offset
                );
            }
        }

        return this.year();
    }

    function erasNameRegex(isStrict) {
        if (!hasOwnProp(this, '_erasNameRegex')) {
            computeErasParse.call(this);
        }
        return isStrict ? this._erasNameRegex : this._erasRegex;
    }

    function erasAbbrRegex(isStrict) {
        if (!hasOwnProp(this, '_erasAbbrRegex')) {
            computeErasParse.call(this);
        }
        return isStrict ? this._erasAbbrRegex : this._erasRegex;
    }

    function erasNarrowRegex(isStrict) {
        if (!hasOwnProp(this, '_erasNarrowRegex')) {
            computeErasParse.call(this);
        }
        return isStrict ? this._erasNarrowRegex : this._erasRegex;
    }

    function matchEraAbbr(isStrict, locale) {
        return locale.erasAbbrRegex(isStrict);
    }

    function matchEraName(isStrict, locale) {
        return locale.erasNameRegex(isStrict);
    }

    function matchEraNarrow(isStrict, locale) {
        return locale.erasNarrowRegex(isStrict);
    }

    function matchEraYearOrdinal(isStrict, locale) {
        return locale._eraYearOrdinalRegex || matchUnsigned;
    }

    function computeErasParse() {
        var abbrPieces = [],
            namePieces = [],
            narrowPieces = [],
            mixedPieces = [],
            i,
            l,
            eras = this.eras();

        for (i = 0, l = eras.length; i < l; ++i) {
            namePieces.push(regexEscape(eras[i].name));
            abbrPieces.push(regexEscape(eras[i].abbr));
            narrowPieces.push(regexEscape(eras[i].narrow));

            mixedPieces.push(regexEscape(eras[i].name));
            mixedPieces.push(regexEscape(eras[i].abbr));
            mixedPieces.push(regexEscape(eras[i].narrow));
        }

        this._erasRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
        this._erasNameRegex = new RegExp('^(' + namePieces.join('|') + ')', 'i');
        this._erasAbbrRegex = new RegExp('^(' + abbrPieces.join('|') + ')', 'i');
        this._erasNarrowRegex = new RegExp(
            '^(' + narrowPieces.join('|') + ')',
            'i'
        );
    }

    // FORMATTING

    addFormatToken(0, ['gg', 2], 0, function () {
        return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
        return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken(token, getter) {
        addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg', 'weekYear');
    addWeekYearFormatToken('ggggg', 'weekYear');
    addWeekYearFormatToken('GGGG', 'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PRIORITY

    addUnitPriority('weekYear', 1);
    addUnitPriority('isoWeekYear', 1);

    // PARSING

    addRegexToken('G', matchSigned);
    addRegexToken('g', matchSigned);
    addRegexToken('GG', match1to2, match2);
    addRegexToken('gg', match1to2, match2);
    addRegexToken('GGGG', match1to4, match4);
    addRegexToken('gggg', match1to4, match4);
    addRegexToken('GGGGG', match1to6, match6);
    addRegexToken('ggggg', match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (
        input,
        week,
        config,
        token
    ) {
        week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
        week[token] = hooks.parseTwoDigitYear(input);
    });

    // MOMENTS

    function getSetWeekYear(input) {
        return getSetWeekYearHelper.call(
            this,
            input,
            this.week(),
            this.weekday(),
            this.localeData()._week.dow,
            this.localeData()._week.doy
        );
    }

    function getSetISOWeekYear(input) {
        return getSetWeekYearHelper.call(
            this,
            input,
            this.isoWeek(),
            this.isoWeekday(),
            1,
            4
        );
    }

    function getISOWeeksInYear() {
        return weeksInYear(this.year(), 1, 4);
    }

    function getISOWeeksInISOWeekYear() {
        return weeksInYear(this.isoWeekYear(), 1, 4);
    }

    function getWeeksInYear() {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    function getWeeksInWeekYear() {
        var weekInfo = this.localeData()._week;
        return weeksInYear(this.weekYear(), weekInfo.dow, weekInfo.doy);
    }

    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
        var weeksTarget;
        if (input == null) {
            return weekOfYear(this, dow, doy).year;
        } else {
            weeksTarget = weeksInYear(input, dow, doy);
            if (week > weeksTarget) {
                week = weeksTarget;
            }
            return setWeekAll.call(this, input, week, weekday, dow, doy);
        }
    }

    function setWeekAll(weekYear, week, weekday, dow, doy) {
        var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
            date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

        this.year(date.getUTCFullYear());
        this.month(date.getUTCMonth());
        this.date(date.getUTCDate());
        return this;
    }

    // FORMATTING

    addFormatToken('Q', 0, 'Qo', 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PRIORITY

    addUnitPriority('quarter', 7);

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
        array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter(input) {
        return input == null
            ? Math.ceil((this.month() + 1) / 3)
            : this.month((input - 1) * 3 + (this.month() % 3));
    }

    // FORMATTING

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PRIORITY
    addUnitPriority('date', 9);

    // PARSING

    addRegexToken('D', match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
        // TODO: Remove "ordinalParse" fallback in next major release.
        return isStrict
            ? locale._dayOfMonthOrdinalParse || locale._ordinalParse
            : locale._dayOfMonthOrdinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
        array[DATE] = toInt(input.match(match1to2)[0]);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    // FORMATTING

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PRIORITY
    addUnitPriority('dayOfYear', 4);

    // PARSING

    addRegexToken('DDD', match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
        config._dayOfYear = toInt(input);
    });

    // HELPERS

    // MOMENTS

    function getSetDayOfYear(input) {
        var dayOfYear =
            Math.round(
                (this.clone().startOf('day') - this.clone().startOf('year')) / 864e5
            ) + 1;
        return input == null ? dayOfYear : this.add(input - dayOfYear, 'd');
    }

    // FORMATTING

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PRIORITY

    addUnitPriority('minute', 14);

    // PARSING

    addRegexToken('m', match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    // FORMATTING

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PRIORITY

    addUnitPriority('second', 15);

    // PARSING

    addRegexToken('s', match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    // FORMATTING

    addFormatToken('S', 0, 0, function () {
        return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
        return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
        return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
        return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
        return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
        return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
        return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
        return this.millisecond() * 1000000;
    });

    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PRIORITY

    addUnitPriority('millisecond', 16);

    // PARSING

    addRegexToken('S', match1to3, match1);
    addRegexToken('SS', match1to3, match2);
    addRegexToken('SSS', match1to3, match3);

    var token, getSetMillisecond;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
        addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
        array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
        addParseToken(token, parseMs);
    }

    getSetMillisecond = makeGetSet('Milliseconds', false);

    // FORMATTING

    addFormatToken('z', 0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr() {
        return this._isUTC ? 'UTC' : '';
    }

    function getZoneName() {
        return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var proto = Moment.prototype;

    proto.add = add;
    proto.calendar = calendar$1;
    proto.clone = clone;
    proto.diff = diff;
    proto.endOf = endOf;
    proto.format = format;
    proto.from = from;
    proto.fromNow = fromNow;
    proto.to = to;
    proto.toNow = toNow;
    proto.get = stringGet;
    proto.invalidAt = invalidAt;
    proto.isAfter = isAfter;
    proto.isBefore = isBefore;
    proto.isBetween = isBetween;
    proto.isSame = isSame;
    proto.isSameOrAfter = isSameOrAfter;
    proto.isSameOrBefore = isSameOrBefore;
    proto.isValid = isValid$2;
    proto.lang = lang;
    proto.locale = locale;
    proto.localeData = localeData;
    proto.max = prototypeMax;
    proto.min = prototypeMin;
    proto.parsingFlags = parsingFlags;
    proto.set = stringSet;
    proto.startOf = startOf;
    proto.subtract = subtract;
    proto.toArray = toArray;
    proto.toObject = toObject;
    proto.toDate = toDate;
    proto.toISOString = toISOString;
    proto.inspect = inspect;
    if (typeof Symbol !== 'undefined' && Symbol.for != null) {
        proto[Symbol.for('nodejs.util.inspect.custom')] = function () {
            return 'Moment<' + this.format() + '>';
        };
    }
    proto.toJSON = toJSON;
    proto.toString = toString;
    proto.unix = unix;
    proto.valueOf = valueOf;
    proto.creationData = creationData;
    proto.eraName = getEraName;
    proto.eraNarrow = getEraNarrow;
    proto.eraAbbr = getEraAbbr;
    proto.eraYear = getEraYear;
    proto.year = getSetYear;
    proto.isLeapYear = getIsLeapYear;
    proto.weekYear = getSetWeekYear;
    proto.isoWeekYear = getSetISOWeekYear;
    proto.quarter = proto.quarters = getSetQuarter;
    proto.month = getSetMonth;
    proto.daysInMonth = getDaysInMonth;
    proto.week = proto.weeks = getSetWeek;
    proto.isoWeek = proto.isoWeeks = getSetISOWeek;
    proto.weeksInYear = getWeeksInYear;
    proto.weeksInWeekYear = getWeeksInWeekYear;
    proto.isoWeeksInYear = getISOWeeksInYear;
    proto.isoWeeksInISOWeekYear = getISOWeeksInISOWeekYear;
    proto.date = getSetDayOfMonth;
    proto.day = proto.days = getSetDayOfWeek;
    proto.weekday = getSetLocaleDayOfWeek;
    proto.isoWeekday = getSetISODayOfWeek;
    proto.dayOfYear = getSetDayOfYear;
    proto.hour = proto.hours = getSetHour;
    proto.minute = proto.minutes = getSetMinute;
    proto.second = proto.seconds = getSetSecond;
    proto.millisecond = proto.milliseconds = getSetMillisecond;
    proto.utcOffset = getSetOffset;
    proto.utc = setOffsetToUTC;
    proto.local = setOffsetToLocal;
    proto.parseZone = setOffsetToParsedOffset;
    proto.hasAlignedHourOffset = hasAlignedHourOffset;
    proto.isDST = isDaylightSavingTime;
    proto.isLocal = isLocal;
    proto.isUtcOffset = isUtcOffset;
    proto.isUtc = isUtc;
    proto.isUTC = isUtc;
    proto.zoneAbbr = getZoneAbbr;
    proto.zoneName = getZoneName;
    proto.dates = deprecate(
        'dates accessor is deprecated. Use date instead.',
        getSetDayOfMonth
    );
    proto.months = deprecate(
        'months accessor is deprecated. Use month instead',
        getSetMonth
    );
    proto.years = deprecate(
        'years accessor is deprecated. Use year instead',
        getSetYear
    );
    proto.zone = deprecate(
        'moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/',
        getSetZone
    );
    proto.isDSTShifted = deprecate(
        'isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information',
        isDaylightSavingTimeShifted
    );

    function createUnix(input) {
        return createLocal(input * 1000);
    }

    function createInZone() {
        return createLocal.apply(null, arguments).parseZone();
    }

    function preParsePostFormat(string) {
        return string;
    }

    var proto$1 = Locale.prototype;

    proto$1.calendar = calendar;
    proto$1.longDateFormat = longDateFormat;
    proto$1.invalidDate = invalidDate;
    proto$1.ordinal = ordinal;
    proto$1.preparse = preParsePostFormat;
    proto$1.postformat = preParsePostFormat;
    proto$1.relativeTime = relativeTime;
    proto$1.pastFuture = pastFuture;
    proto$1.set = set;
    proto$1.eras = localeEras;
    proto$1.erasParse = localeErasParse;
    proto$1.erasConvertYear = localeErasConvertYear;
    proto$1.erasAbbrRegex = erasAbbrRegex;
    proto$1.erasNameRegex = erasNameRegex;
    proto$1.erasNarrowRegex = erasNarrowRegex;

    proto$1.months = localeMonths;
    proto$1.monthsShort = localeMonthsShort;
    proto$1.monthsParse = localeMonthsParse;
    proto$1.monthsRegex = monthsRegex;
    proto$1.monthsShortRegex = monthsShortRegex;
    proto$1.week = localeWeek;
    proto$1.firstDayOfYear = localeFirstDayOfYear;
    proto$1.firstDayOfWeek = localeFirstDayOfWeek;

    proto$1.weekdays = localeWeekdays;
    proto$1.weekdaysMin = localeWeekdaysMin;
    proto$1.weekdaysShort = localeWeekdaysShort;
    proto$1.weekdaysParse = localeWeekdaysParse;

    proto$1.weekdaysRegex = weekdaysRegex;
    proto$1.weekdaysShortRegex = weekdaysShortRegex;
    proto$1.weekdaysMinRegex = weekdaysMinRegex;

    proto$1.isPM = localeIsPM;
    proto$1.meridiem = localeMeridiem;

    function get$1(format, index, field, setter) {
        var locale = getLocale(),
            utc = createUTC().set(setter, index);
        return locale[field](utc, format);
    }

    function listMonthsImpl(format, index, field) {
        if (isNumber(format)) {
            index = format;
            format = undefined;
        }

        format = format || '';

        if (index != null) {
            return get$1(format, index, field, 'month');
        }

        var i,
            out = [];
        for (i = 0; i < 12; i++) {
            out[i] = get$1(format, i, field, 'month');
        }
        return out;
    }

    // ()
    // (5)
    // (fmt, 5)
    // (fmt)
    // (true)
    // (true, 5)
    // (true, fmt, 5)
    // (true, fmt)
    function listWeekdaysImpl(localeSorted, format, index, field) {
        if (typeof localeSorted === 'boolean') {
            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        } else {
            format = localeSorted;
            index = format;
            localeSorted = false;

            if (isNumber(format)) {
                index = format;
                format = undefined;
            }

            format = format || '';
        }

        var locale = getLocale(),
            shift = localeSorted ? locale._week.dow : 0,
            i,
            out = [];

        if (index != null) {
            return get$1(format, (index + shift) % 7, field, 'day');
        }

        for (i = 0; i < 7; i++) {
            out[i] = get$1(format, (i + shift) % 7, field, 'day');
        }
        return out;
    }

    function listMonths(format, index) {
        return listMonthsImpl(format, index, 'months');
    }

    function listMonthsShort(format, index) {
        return listMonthsImpl(format, index, 'monthsShort');
    }

    function listWeekdays(localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    }

    function listWeekdaysShort(localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    }

    function listWeekdaysMin(localeSorted, format, index) {
        return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    }

    getSetGlobalLocale('en', {
        eras: [
            {
                since: '0001-01-01',
                until: +Infinity,
                offset: 1,
                name: 'Anno Domini',
                narrow: 'AD',
                abbr: 'AD',
            },
            {
                since: '0000-12-31',
                until: -Infinity,
                offset: 1,
                name: 'Before Christ',
                narrow: 'BC',
                abbr: 'BC',
            },
        ],
        dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal: function (number) {
            var b = number % 10,
                output =
                    toInt((number % 100) / 10) === 1
                        ? 'th'
                        : b === 1
                        ? 'st'
                        : b === 2
                        ? 'nd'
                        : b === 3
                        ? 'rd'
                        : 'th';
            return number + output;
        },
    });

    // Side effect imports

    hooks.lang = deprecate(
        'moment.lang is deprecated. Use moment.locale instead.',
        getSetGlobalLocale
    );
    hooks.langData = deprecate(
        'moment.langData is deprecated. Use moment.localeData instead.',
        getLocale
    );

    var mathAbs = Math.abs;

    function abs() {
        var data = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days = mathAbs(this._days);
        this._months = mathAbs(this._months);

        data.milliseconds = mathAbs(data.milliseconds);
        data.seconds = mathAbs(data.seconds);
        data.minutes = mathAbs(data.minutes);
        data.hours = mathAbs(data.hours);
        data.months = mathAbs(data.months);
        data.years = mathAbs(data.years);

        return this;
    }

    function addSubtract$1(duration, input, value, direction) {
        var other = createDuration(input, value);

        duration._milliseconds += direction * other._milliseconds;
        duration._days += direction * other._days;
        duration._months += direction * other._months;

        return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function add$1(input, value) {
        return addSubtract$1(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function subtract$1(input, value) {
        return addSubtract$1(this, input, value, -1);
    }

    function absCeil(number) {
        if (number < 0) {
            return Math.floor(number);
        } else {
            return Math.ceil(number);
        }
    }

    function bubble() {
        var milliseconds = this._milliseconds,
            days = this._days,
            months = this._months,
            data = this._data,
            seconds,
            minutes,
            hours,
            years,
            monthsFromDays;

        // if we have a mix of positive and negative values, bubble down first
        // check: https://github.com/moment/moment/issues/2166
        if (
            !(
                (milliseconds >= 0 && days >= 0 && months >= 0) ||
                (milliseconds <= 0 && days <= 0 && months <= 0)
            )
        ) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        seconds = absFloor(milliseconds / 1000);
        data.seconds = seconds % 60;

        minutes = absFloor(seconds / 60);
        data.minutes = minutes % 60;

        hours = absFloor(minutes / 60);
        data.hours = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        data.days = days;
        data.months = months;
        data.years = years;

        return this;
    }

    function daysToMonths(days) {
        // 400 years have 146097 days (taking into account leap year rules)
        // 400 years have 12 months === 4800
        return (days * 4800) / 146097;
    }

    function monthsToDays(months) {
        // the reverse of daysToMonths
        return (months * 146097) / 4800;
    }

    function as(units) {
        if (!this.isValid()) {
            return NaN;
        }
        var days,
            months,
            milliseconds = this._milliseconds;

        units = normalizeUnits(units);

        if (units === 'month' || units === 'quarter' || units === 'year') {
            days = this._days + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            switch (units) {
                case 'month':
                    return months;
                case 'quarter':
                    return months / 3;
                case 'year':
                    return months / 12;
            }
        } else {
            // handle milliseconds separately because of floating point math errors (issue #1867)
            days = this._days + Math.round(monthsToDays(this._months));
            switch (units) {
                case 'week':
                    return days / 7 + milliseconds / 6048e5;
                case 'day':
                    return days + milliseconds / 864e5;
                case 'hour':
                    return days * 24 + milliseconds / 36e5;
                case 'minute':
                    return days * 1440 + milliseconds / 6e4;
                case 'second':
                    return days * 86400 + milliseconds / 1000;
                // Math.floor prevents floating point math errors here
                case 'millisecond':
                    return Math.floor(days * 864e5) + milliseconds;
                default:
                    throw new Error('Unknown unit ' + units);
            }
        }
    }

    // TODO: Use this.as('ms')?
    function valueOf$1() {
        if (!this.isValid()) {
            return NaN;
        }
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            toInt(this._months / 12) * 31536e6
        );
    }

    function makeAs(alias) {
        return function () {
            return this.as(alias);
        };
    }

    var asMilliseconds = makeAs('ms'),
        asSeconds = makeAs('s'),
        asMinutes = makeAs('m'),
        asHours = makeAs('h'),
        asDays = makeAs('d'),
        asWeeks = makeAs('w'),
        asMonths = makeAs('M'),
        asQuarters = makeAs('Q'),
        asYears = makeAs('y');

    function clone$1() {
        return createDuration(this);
    }

    function get$2(units) {
        units = normalizeUnits(units);
        return this.isValid() ? this[units + 's']() : NaN;
    }

    function makeGetter(name) {
        return function () {
            return this.isValid() ? this._data[name] : NaN;
        };
    }

    var milliseconds = makeGetter('milliseconds'),
        seconds = makeGetter('seconds'),
        minutes = makeGetter('minutes'),
        hours = makeGetter('hours'),
        days = makeGetter('days'),
        months = makeGetter('months'),
        years = makeGetter('years');

    function weeks() {
        return absFloor(this.days() / 7);
    }

    var round = Math.round,
        thresholds = {
            ss: 44, // a few seconds to seconds
            s: 45, // seconds to minute
            m: 45, // minutes to hour
            h: 22, // hours to day
            d: 26, // days to month/week
            w: null, // weeks to month
            M: 11, // months to year
        };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime$1(posNegDuration, withoutSuffix, thresholds, locale) {
        var duration = createDuration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            weeks = round(duration.as('w')),
            years = round(duration.as('y')),
            a =
                (seconds <= thresholds.ss && ['s', seconds]) ||
                (seconds < thresholds.s && ['ss', seconds]) ||
                (minutes <= 1 && ['m']) ||
                (minutes < thresholds.m && ['mm', minutes]) ||
                (hours <= 1 && ['h']) ||
                (hours < thresholds.h && ['hh', hours]) ||
                (days <= 1 && ['d']) ||
                (days < thresholds.d && ['dd', days]);

        if (thresholds.w != null) {
            a =
                a ||
                (weeks <= 1 && ['w']) ||
                (weeks < thresholds.w && ['ww', weeks]);
        }
        a = a ||
            (months <= 1 && ['M']) ||
            (months < thresholds.M && ['MM', months]) ||
            (years <= 1 && ['y']) || ['yy', years];

        a[2] = withoutSuffix;
        a[3] = +posNegDuration > 0;
        a[4] = locale;
        return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set the rounding function for relative time strings
    function getSetRelativeTimeRounding(roundingFunction) {
        if (roundingFunction === undefined) {
            return round;
        }
        if (typeof roundingFunction === 'function') {
            round = roundingFunction;
            return true;
        }
        return false;
    }

    // This function allows you to set a threshold for relative time strings
    function getSetRelativeTimeThreshold(threshold, limit) {
        if (thresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return thresholds[threshold];
        }
        thresholds[threshold] = limit;
        if (threshold === 's') {
            thresholds.ss = limit - 1;
        }
        return true;
    }

    function humanize(argWithSuffix, argThresholds) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var withSuffix = false,
            th = thresholds,
            locale,
            output;

        if (typeof argWithSuffix === 'object') {
            argThresholds = argWithSuffix;
            argWithSuffix = false;
        }
        if (typeof argWithSuffix === 'boolean') {
            withSuffix = argWithSuffix;
        }
        if (typeof argThresholds === 'object') {
            th = Object.assign({}, thresholds, argThresholds);
            if (argThresholds.s != null && argThresholds.ss == null) {
                th.ss = argThresholds.s - 1;
            }
        }

        locale = this.localeData();
        output = relativeTime$1(this, !withSuffix, th, locale);

        if (withSuffix) {
            output = locale.pastFuture(+this, output);
        }

        return locale.postformat(output);
    }

    var abs$1 = Math.abs;

    function sign(x) {
        return (x > 0) - (x < 0) || +x;
    }

    function toISOString$1() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }

        var seconds = abs$1(this._milliseconds) / 1000,
            days = abs$1(this._days),
            months = abs$1(this._months),
            minutes,
            hours,
            years,
            s,
            total = this.asSeconds(),
            totalSign,
            ymSign,
            daysSign,
            hmsSign;

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return 'P0D';
        }

        // 3600 seconds -> 60 minutes -> 1 hour
        minutes = absFloor(seconds / 60);
        hours = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        years = absFloor(months / 12);
        months %= 12;

        // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
        s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';

        totalSign = total < 0 ? '-' : '';
        ymSign = sign(this._months) !== sign(total) ? '-' : '';
        daysSign = sign(this._days) !== sign(total) ? '-' : '';
        hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

        return (
            totalSign +
            'P' +
            (years ? ymSign + years + 'Y' : '') +
            (months ? ymSign + months + 'M' : '') +
            (days ? daysSign + days + 'D' : '') +
            (hours || minutes || seconds ? 'T' : '') +
            (hours ? hmsSign + hours + 'H' : '') +
            (minutes ? hmsSign + minutes + 'M' : '') +
            (seconds ? hmsSign + s + 'S' : '')
        );
    }

    var proto$2 = Duration.prototype;

    proto$2.isValid = isValid$1;
    proto$2.abs = abs;
    proto$2.add = add$1;
    proto$2.subtract = subtract$1;
    proto$2.as = as;
    proto$2.asMilliseconds = asMilliseconds;
    proto$2.asSeconds = asSeconds;
    proto$2.asMinutes = asMinutes;
    proto$2.asHours = asHours;
    proto$2.asDays = asDays;
    proto$2.asWeeks = asWeeks;
    proto$2.asMonths = asMonths;
    proto$2.asQuarters = asQuarters;
    proto$2.asYears = asYears;
    proto$2.valueOf = valueOf$1;
    proto$2._bubble = bubble;
    proto$2.clone = clone$1;
    proto$2.get = get$2;
    proto$2.milliseconds = milliseconds;
    proto$2.seconds = seconds;
    proto$2.minutes = minutes;
    proto$2.hours = hours;
    proto$2.days = days;
    proto$2.weeks = weeks;
    proto$2.months = months;
    proto$2.years = years;
    proto$2.humanize = humanize;
    proto$2.toISOString = toISOString$1;
    proto$2.toString = toISOString$1;
    proto$2.toJSON = toISOString$1;
    proto$2.locale = locale;
    proto$2.localeData = localeData;

    proto$2.toIsoString = deprecate(
        'toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)',
        toISOString$1
    );
    proto$2.lang = lang;

    // FORMATTING

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
        config._d = new Date(parseFloat(input) * 1000);
    });
    addParseToken('x', function (input, array, config) {
        config._d = new Date(toInt(input));
    });

    //! moment.js

    hooks.version = '2.29.1';

    setHookCallback(createLocal);

    hooks.fn = proto;
    hooks.min = min;
    hooks.max = max;
    hooks.now = now;
    hooks.utc = createUTC;
    hooks.unix = createUnix;
    hooks.months = listMonths;
    hooks.isDate = isDate;
    hooks.locale = getSetGlobalLocale;
    hooks.invalid = createInvalid;
    hooks.duration = createDuration;
    hooks.isMoment = isMoment;
    hooks.weekdays = listWeekdays;
    hooks.parseZone = createInZone;
    hooks.localeData = getLocale;
    hooks.isDuration = isDuration;
    hooks.monthsShort = listMonthsShort;
    hooks.weekdaysMin = listWeekdaysMin;
    hooks.defineLocale = defineLocale;
    hooks.updateLocale = updateLocale;
    hooks.locales = listLocales;
    hooks.weekdaysShort = listWeekdaysShort;
    hooks.normalizeUnits = normalizeUnits;
    hooks.relativeTimeRounding = getSetRelativeTimeRounding;
    hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
    hooks.calendarFormat = getCalendarFormat;
    hooks.prototype = proto;

    // currently HTML5 input type only supports 24-hour formats
    hooks.HTML5_FMT = {
        DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm', // <input type="datetime-local" />
        DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss', // <input type="datetime-local" step="1" />
        DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS', // <input type="datetime-local" step="0.001" />
        DATE: 'YYYY-MM-DD', // <input type="date" />
        TIME: 'HH:mm', // <input type="time" />
        TIME_SECONDS: 'HH:mm:ss', // <input type="time" step="1" />
        TIME_MS: 'HH:mm:ss.SSS', // <input type="time" step="0.001" />
        WEEK: 'GGGG-[W]WW', // <input type="week" />
        MONTH: 'YYYY-MM', // <input type="month" />
    };

    return hooks;

})));
//! moment-timezone.js
//! version : 0.5.31
//! Copyright (c) JS Foundation and other contributors
//! license : MIT
//! github.com/moment/moment-timezone

(function (root, factory) {
	"use strict";

	/*global define*/
	if (typeof module === 'object' && module.exports) {
		module.exports = factory(require('moment')); // Node
	} else if (typeof define === 'function' && define.amd) {
		define(['moment'], factory);                 // AMD
	} else {
		factory(root.moment);                        // Browser
	}
}(this, function (moment) {
	"use strict";

	// Resolves es6 module loading issue
	if (moment.version === undefined && moment.default) {
		moment = moment.default;
	}

	// Do not load moment-timezone a second time.
	// if (moment.tz !== undefined) {
	// 	logError('Moment Timezone ' + moment.tz.version + ' was already loaded ' + (moment.tz.dataVersion ? 'with data from ' : 'without any data') + moment.tz.dataVersion);
	// 	return moment;
	// }

	var VERSION = "0.5.31",
		zones = {},
		links = {},
		countries = {},
		names = {},
		guesses = {},
		cachedGuess;

	if (!moment || typeof moment.version !== 'string') {
		logError('Moment Timezone requires Moment.js. See https://momentjs.com/timezone/docs/#/use-it/browser/');
	}

	var momentVersion = moment.version.split('.'),
		major = +momentVersion[0],
		minor = +momentVersion[1];

	// Moment.js version check
	if (major < 2 || (major === 2 && minor < 6)) {
		logError('Moment Timezone requires Moment.js >= 2.6.0. You are using Moment.js ' + moment.version + '. See momentjs.com');
	}

	/************************************
		Unpacking
	************************************/

	function charCodeToInt(charCode) {
		if (charCode > 96) {
			return charCode - 87;
		} else if (charCode > 64) {
			return charCode - 29;
		}
		return charCode - 48;
	}

	function unpackBase60(string) {
		var i = 0,
			parts = string.split('.'),
			whole = parts[0],
			fractional = parts[1] || '',
			multiplier = 1,
			num,
			out = 0,
			sign = 1;

		// handle negative numbers
		if (string.charCodeAt(0) === 45) {
			i = 1;
			sign = -1;
		}

		// handle digits before the decimal
		for (i; i < whole.length; i++) {
			num = charCodeToInt(whole.charCodeAt(i));
			out = 60 * out + num;
		}

		// handle digits after the decimal
		for (i = 0; i < fractional.length; i++) {
			multiplier = multiplier / 60;
			num = charCodeToInt(fractional.charCodeAt(i));
			out += num * multiplier;
		}

		return out * sign;
	}

	function arrayToInt (array) {
		for (var i = 0; i < array.length; i++) {
			array[i] = unpackBase60(array[i]);
		}
	}

	function intToUntil (array, length) {
		for (var i = 0; i < length; i++) {
			array[i] = Math.round((array[i - 1] || 0) + (array[i] * 60000)); // minutes to milliseconds
		}

		array[length - 1] = Infinity;
	}

	function mapIndices (source, indices) {
		var out = [], i;

		for (i = 0; i < indices.length; i++) {
			out[i] = source[indices[i]];
		}

		return out;
	}

	function unpack (string) {
		var data = string.split('|'),
			offsets = data[2].split(' '),
			indices = data[3].split(''),
			untils  = data[4].split(' ');

		arrayToInt(offsets);
		arrayToInt(indices);
		arrayToInt(untils);

		intToUntil(untils, indices.length);

		return {
			name       : data[0],
			abbrs      : mapIndices(data[1].split(' '), indices),
			offsets    : mapIndices(offsets, indices),
			untils     : untils,
			population : data[5] | 0
		};
	}

	/************************************
		Zone object
	************************************/

	function Zone (packedString) {
		if (packedString) {
			this._set(unpack(packedString));
		}
	}

	Zone.prototype = {
		_set : function (unpacked) {
			this.name       = unpacked.name;
			this.abbrs      = unpacked.abbrs;
			this.untils     = unpacked.untils;
			this.offsets    = unpacked.offsets;
			this.population = unpacked.population;
		},

		_index : function (timestamp) {
			var target = +timestamp,
				untils = this.untils,
				i;

			for (i = 0; i < untils.length; i++) {
				if (target < untils[i]) {
					return i;
				}
			}
		},

		countries : function () {
			var zone_name = this.name;
			return Object.keys(countries).filter(function (country_code) {
				return countries[country_code].zones.indexOf(zone_name) !== -1;
			});
		},

		parse : function (timestamp) {
			var target  = +timestamp,
				offsets = this.offsets,
				untils  = this.untils,
				max     = untils.length - 1,
				offset, offsetNext, offsetPrev, i;

			for (i = 0; i < max; i++) {
				offset     = offsets[i];
				offsetNext = offsets[i + 1];
				offsetPrev = offsets[i ? i - 1 : i];

				if (offset < offsetNext && tz.moveAmbiguousForward) {
					offset = offsetNext;
				} else if (offset > offsetPrev && tz.moveInvalidForward) {
					offset = offsetPrev;
				}

				if (target < untils[i] - (offset * 60000)) {
					return offsets[i];
				}
			}

			return offsets[max];
		},

		abbr : function (mom) {
			return this.abbrs[this._index(mom)];
		},

		offset : function (mom) {
			logError("zone.offset has been deprecated in favor of zone.utcOffset");
			return this.offsets[this._index(mom)];
		},

		utcOffset : function (mom) {
			return this.offsets[this._index(mom)];
		}
	};

	/************************************
		Country object
	************************************/

	function Country (country_name, zone_names) {
		this.name = country_name;
		this.zones = zone_names;
	}

	/************************************
		Current Timezone
	************************************/

	function OffsetAt(at) {
		var timeString = at.toTimeString();
		var abbr = timeString.match(/\([a-z ]+\)/i);
		if (abbr && abbr[0]) {
			// 17:56:31 GMT-0600 (CST)
			// 17:56:31 GMT-0600 (Central Standard Time)
			abbr = abbr[0].match(/[A-Z]/g);
			abbr = abbr ? abbr.join('') : undefined;
		} else {
			// 17:56:31 CST
			// 17:56:31 GMT+0800 (台北標準時間)
			abbr = timeString.match(/[A-Z]{3,5}/g);
			abbr = abbr ? abbr[0] : undefined;
		}

		if (abbr === 'GMT') {
			abbr = undefined;
		}

		this.at = +at;
		this.abbr = abbr;
		this.offset = at.getTimezoneOffset();
	}

	function ZoneScore(zone) {
		this.zone = zone;
		this.offsetScore = 0;
		this.abbrScore = 0;
	}

	ZoneScore.prototype.scoreOffsetAt = function (offsetAt) {
		this.offsetScore += Math.abs(this.zone.utcOffset(offsetAt.at) - offsetAt.offset);
		if (this.zone.abbr(offsetAt.at).replace(/[^A-Z]/g, '') !== offsetAt.abbr) {
			this.abbrScore++;
		}
	};

	function findChange(low, high) {
		var mid, diff;

		while ((diff = ((high.at - low.at) / 12e4 | 0) * 6e4)) {
			mid = new OffsetAt(new Date(low.at + diff));
			if (mid.offset === low.offset) {
				low = mid;
			} else {
				high = mid;
			}
		}

		return low;
	}

	function userOffsets() {
		var startYear = new Date().getFullYear() - 2,
			last = new OffsetAt(new Date(startYear, 0, 1)),
			offsets = [last],
			change, next, i;

		for (i = 1; i < 48; i++) {
			next = new OffsetAt(new Date(startYear, i, 1));
			if (next.offset !== last.offset) {
				change = findChange(last, next);
				offsets.push(change);
				offsets.push(new OffsetAt(new Date(change.at + 6e4)));
			}
			last = next;
		}

		for (i = 0; i < 4; i++) {
			offsets.push(new OffsetAt(new Date(startYear + i, 0, 1)));
			offsets.push(new OffsetAt(new Date(startYear + i, 6, 1)));
		}

		return offsets;
	}

	function sortZoneScores (a, b) {
		if (a.offsetScore !== b.offsetScore) {
			return a.offsetScore - b.offsetScore;
		}
		if (a.abbrScore !== b.abbrScore) {
			return a.abbrScore - b.abbrScore;
		}
		if (a.zone.population !== b.zone.population) {
			return b.zone.population - a.zone.population;
		}
		return b.zone.name.localeCompare(a.zone.name);
	}

	function addToGuesses (name, offsets) {
		var i, offset;
		arrayToInt(offsets);
		for (i = 0; i < offsets.length; i++) {
			offset = offsets[i];
			guesses[offset] = guesses[offset] || {};
			guesses[offset][name] = true;
		}
	}

	function guessesForUserOffsets (offsets) {
		var offsetsLength = offsets.length,
			filteredGuesses = {},
			out = [],
			i, j, guessesOffset;

		for (i = 0; i < offsetsLength; i++) {
			guessesOffset = guesses[offsets[i].offset] || {};
			for (j in guessesOffset) {
				if (guessesOffset.hasOwnProperty(j)) {
					filteredGuesses[j] = true;
				}
			}
		}

		for (i in filteredGuesses) {
			if (filteredGuesses.hasOwnProperty(i)) {
				out.push(names[i]);
			}
		}

		return out;
	}

	function rebuildGuess () {

		// use Intl API when available and returning valid time zone
		try {
			var intlName = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (intlName && intlName.length > 3) {
				var name = names[normalizeName(intlName)];
				if (name) {
					return name;
				}
				logError("Moment Timezone found " + intlName + " from the Intl api, but did not have that data loaded.");
			}
		} catch (e) {
			// Intl unavailable, fall back to manual guessing.
		}

		var offsets = userOffsets(),
			offsetsLength = offsets.length,
			guesses = guessesForUserOffsets(offsets),
			zoneScores = [],
			zoneScore, i, j;

		for (i = 0; i < guesses.length; i++) {
			zoneScore = new ZoneScore(getZone(guesses[i]), offsetsLength);
			for (j = 0; j < offsetsLength; j++) {
				zoneScore.scoreOffsetAt(offsets[j]);
			}
			zoneScores.push(zoneScore);
		}

		zoneScores.sort(sortZoneScores);

		return zoneScores.length > 0 ? zoneScores[0].zone.name : undefined;
	}

	function guess (ignoreCache) {
		if (!cachedGuess || ignoreCache) {
			cachedGuess = rebuildGuess();
		}
		return cachedGuess;
	}

	/************************************
		Global Methods
	************************************/

	function normalizeName (name) {
		return (name || '').toLowerCase().replace(/\//g, '_');
	}

	function addZone (packed) {
		var i, name, split, normalized;

		if (typeof packed === "string") {
			packed = [packed];
		}

		for (i = 0; i < packed.length; i++) {
			split = packed[i].split('|');
			name = split[0];
			normalized = normalizeName(name);
			zones[normalized] = packed[i];
			names[normalized] = name;
			addToGuesses(normalized, split[2].split(' '));
		}
	}

	function getZone (name, caller) {

		name = normalizeName(name);

		var zone = zones[name];
		var link;

		if (zone instanceof Zone) {
			return zone;
		}

		if (typeof zone === 'string') {
			zone = new Zone(zone);
			zones[name] = zone;
			return zone;
		}

		// Pass getZone to prevent recursion more than 1 level deep
		if (links[name] && caller !== getZone && (link = getZone(links[name], getZone))) {
			zone = zones[name] = new Zone();
			zone._set(link);
			zone.name = names[name];
			return zone;
		}

		return null;
	}

	function getNames () {
		var i, out = [];

		for (i in names) {
			if (names.hasOwnProperty(i) && (zones[i] || zones[links[i]]) && names[i]) {
				out.push(names[i]);
			}
		}

		return out.sort();
	}

	function getCountryNames () {
		return Object.keys(countries);
	}

	function addLink (aliases) {
		var i, alias, normal0, normal1;

		if (typeof aliases === "string") {
			aliases = [aliases];
		}

		for (i = 0; i < aliases.length; i++) {
			alias = aliases[i].split('|');

			normal0 = normalizeName(alias[0]);
			normal1 = normalizeName(alias[1]);

			links[normal0] = normal1;
			names[normal0] = alias[0];

			links[normal1] = normal0;
			names[normal1] = alias[1];
		}
	}

	function addCountries (data) {
		var i, country_code, country_zones, split;
		if (!data || !data.length) return;
		for (i = 0; i < data.length; i++) {
			split = data[i].split('|');
			country_code = split[0].toUpperCase();
			country_zones = split[1].split(' ');
			countries[country_code] = new Country(
				country_code,
				country_zones
			);
		}
	}

	function getCountry (name) {
		name = name.toUpperCase();
		return countries[name] || null;
	}

	function zonesForCountry(country, with_offset) {
		country = getCountry(country);

		if (!country) return null;

		var zones = country.zones.sort();

		if (with_offset) {
			return zones.map(function (zone_name) {
				var zone = getZone(zone_name);
				return {
					name: zone_name,
					offset: zone.utcOffset(new Date())
				};
			});
		}

		return zones;
	}

	function loadData (data) {
		addZone(data.zones);
		addLink(data.links);
		addCountries(data.countries);
		tz.dataVersion = data.version;
	}

	function zoneExists (name) {
		if (!zoneExists.didShowError) {
			zoneExists.didShowError = true;
				logError("moment.tz.zoneExists('" + name + "') has been deprecated in favor of !moment.tz.zone('" + name + "')");
		}
		return !!getZone(name);
	}

	function needsOffset (m) {
		var isUnixTimestamp = (m._f === 'X' || m._f === 'x');
		return !!(m._a && (m._tzm === undefined) && !isUnixTimestamp);
	}

	function logError (message) {
		if (typeof console !== 'undefined' && typeof console.error === 'function') {
			console.error(message);
		}
	}

	/************************************
		moment.tz namespace
	************************************/

	function tz (input) {
		var args = Array.prototype.slice.call(arguments, 0, -1),
			name = arguments[arguments.length - 1],
			zone = getZone(name),
			out  = moment.utc.apply(null, args);

		if (zone && !moment.isMoment(input) && needsOffset(out)) {
			out.add(zone.parse(out), 'minutes');
		}

		out.tz(name);

		return out;
	}

	tz.version      = VERSION;
	tz.dataVersion  = '';
	tz._zones       = zones;
	tz._links       = links;
	tz._names       = names;
	tz._countries	= countries;
	tz.add          = addZone;
	tz.link         = addLink;
	tz.load         = loadData;
	tz.zone         = getZone;
	tz.zoneExists   = zoneExists; // deprecated in 0.1.0
	tz.guess        = guess;
	tz.names        = getNames;
	tz.Zone         = Zone;
	tz.unpack       = unpack;
	tz.unpackBase60 = unpackBase60;
	tz.needsOffset  = needsOffset;
	tz.moveInvalidForward   = true;
	tz.moveAmbiguousForward = false;
	tz.countries    = getCountryNames;
	tz.zonesForCountry = zonesForCountry;

	/************************************
		Interface with Moment.js
	************************************/

	var fn = moment.fn;

	moment.tz = tz;

	moment.defaultZone = null;

	moment.updateOffset = function (mom, keepTime) {
		var zone = moment.defaultZone,
			offset;

		if (mom._z === undefined) {
			if (zone && needsOffset(mom) && !mom._isUTC) {
				mom._d = moment.utc(mom._a)._d;
				mom.utc().add(zone.parse(mom), 'minutes');
			}
			mom._z = zone;
		}
		if (mom._z) {
			offset = mom._z.utcOffset(mom);
			if (Math.abs(offset) < 16) {
				offset = offset / 60;
			}
			if (mom.utcOffset !== undefined) {
				var z = mom._z;
				mom.utcOffset(-offset, keepTime);
				mom._z = z;
			} else {
				mom.zone(offset, keepTime);
			}
		}
	};

	fn.tz = function (name, keepTime) {
		if (name) {
			if (typeof name !== 'string') {
				throw new Error('Time zone name must be a string, got ' + name + ' [' + typeof name + ']');
			}
			this._z = getZone(name);
			if (this._z) {
				moment.updateOffset(this, keepTime);
			} else {
				logError("Moment Timezone has no data for " + name + ". See http://momentjs.com/timezone/docs/#/data-loading/.");
			}
			return this;
		}
		if (this._z) { return this._z.name; }
	};

	function abbrWrap (old) {
		return function () {
			if (this._z) { return this._z.abbr(this); }
			return old.call(this);
		};
	}

	function resetZoneWrap (old) {
		return function () {
			this._z = null;
			return old.apply(this, arguments);
		};
	}

	function resetZoneWrap2 (old) {
		return function () {
			if (arguments.length > 0) this._z = null;
			return old.apply(this, arguments);
		};
	}

	fn.zoneName  = abbrWrap(fn.zoneName);
	fn.zoneAbbr  = abbrWrap(fn.zoneAbbr);
	fn.utc       = resetZoneWrap(fn.utc);
	fn.local     = resetZoneWrap(fn.local);
	fn.utcOffset = resetZoneWrap2(fn.utcOffset);

	moment.tz.setDefault = function(name) {
		if (major < 2 || (major === 2 && minor < 9)) {
			logError('Moment Timezone setDefault() requires Moment.js >= 2.9.0. You are using Moment.js ' + moment.version + '.');
		}
		moment.defaultZone = name ? getZone(name) : null;
		return moment;
	};

	// Cloning a moment should include the _z property.
	var momentProperties = moment.momentProperties;
	if (Object.prototype.toString.call(momentProperties) === '[object Array]') {
		// moment 2.8.1+
		momentProperties.push('_z');
		momentProperties.push('_a');
	} else if (momentProperties) {
		// moment 2.7.0
		momentProperties._z = null;
	}

	loadData({
		"version": "2020a",
		"zones": [
			"Africa/Abidjan|GMT|0|0||48e5",
			"Africa/Nairobi|EAT|-30|0||47e5",
			"Africa/Algiers|CET|-10|0||26e5",
			"Africa/Lagos|WAT|-10|0||17e6",
			"Africa/Maputo|CAT|-20|0||26e5",
			"Africa/Cairo|EET|-20|0||15e6",
			"Africa/Casablanca|+00 +01|0 -10|010101010101010101010101010101|1O9e0 uM0 e00 Dc0 11A0 s00 e00 IM0 WM0 mo0 gM0 LA0 WM0 jA0 e00 28M0 e00 2600 gM0 2600 e00 2600 gM0 2600 e00 28M0 e00 2600 gM0|32e5",
			"Europe/Paris|CET CEST|-10 -20|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|11e6",
			"Africa/Johannesburg|SAST|-20|0||84e5",
			"Africa/Khartoum|EAT CAT|-30 -20|01|1Usl0|51e5",
			"Africa/Sao_Tome|GMT WAT|0 -10|010|1UQN0 2q00|",
			"Africa/Windhoek|CAT WAT|-20 -10|0101010|1Oc00 11B0 1nX0 11B0 1nX0 11B0|32e4",
			"America/Adak|HST HDT|a0 90|01010101010101010101010|1O100 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|326",
			"America/Anchorage|AKST AKDT|90 80|01010101010101010101010|1O0X0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|30e4",
			"America/Santo_Domingo|AST|40|0||29e5",
			"America/Fortaleza|-03|30|0||34e5",
			"America/Asuncion|-03 -04|30 40|01010101010101010101010|1O6r0 1ip0 19X0 1fB0 19X0 1fB0 19X0 1ip0 17b0 1ip0 17b0 1ip0 19X0 1fB0 19X0 1fB0 19X0 1fB0 19X0 1ip0 17b0 1ip0|28e5",
			"America/Panama|EST|50|0||15e5",
			"America/Mexico_City|CST CDT|60 50|01010101010101010101010|1Oc80 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|20e6",
			"America/Managua|CST|60|0||22e5",
			"America/La_Paz|-04|40|0||19e5",
			"America/Lima|-05|50|0||11e6",
			"America/Denver|MST MDT|70 60|01010101010101010101010|1O0V0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|26e5",
			"America/Campo_Grande|-03 -04|30 40|0101010101|1NTf0 1zd0 On0 1zd0 On0 1zd0 On0 1HB0 FX0|77e4",
			"America/Cancun|CST EST|60 50|01|1NKU0|63e4",
			"America/Caracas|-0430 -04|4u 40|01|1QMT0|29e5",
			"America/Chicago|CST CDT|60 50|01010101010101010101010|1O0U0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|92e5",
			"America/Chihuahua|MST MDT|70 60|01010101010101010101010|1Oc90 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0|81e4",
			"America/Phoenix|MST|70|0||42e5",
			"America/Whitehorse|PST PDT MST|80 70 70|010101010102|1O0W0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0|23e3",
			"America/New_York|EST EDT|50 40|01010101010101010101010|1O0T0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|21e6",
			"America/Los_Angeles|PST PDT|80 70|01010101010101010101010|1O0W0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|15e6",
			"America/Fort_Nelson|PST MST|80 70|01|1O0W0|39e2",
			"America/Halifax|AST ADT|40 30|01010101010101010101010|1O0S0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|39e4",
			"America/Godthab|-03 -02|30 20|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|17e3",
			"America/Grand_Turk|EST EDT AST|50 40 40|0121010101010101010|1O0T0 1zb0 5Ip0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|37e2",
			"America/Havana|CST CDT|50 40|01010101010101010101010|1O0R0 1zc0 Rc0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0 Rc0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0|21e5",
			"America/Metlakatla|PST AKST AKDT|80 90 80|01212120121212121212121|1PAa0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 uM0 jB0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|14e2",
			"America/Miquelon|-03 -02|30 20|01010101010101010101010|1O0R0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|61e2",
			"America/Montevideo|-02 -03|20 30|01|1O0Q0|17e5",
			"America/Noronha|-02|20|0||30e2",
			"America/Port-au-Prince|EST EDT|50 40|010101010101010101010|1O0T0 1zb0 3iN0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|23e5",
			"Antarctica/Palmer|-03 -04|30 40|010|1QSr0 Ap0|40",
			"America/Santiago|-03 -04|30 40|010101010101010101010|1QSr0 Ap0 1Nb0 Ap0 1Nb0 Ap0 1zb0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 11B0 1nX0 11B0|62e5",
			"America/Sao_Paulo|-02 -03|20 30|0101010101|1NTe0 1zd0 On0 1zd0 On0 1zd0 On0 1HB0 FX0|20e6",
			"Atlantic/Azores|-01 +00|10 0|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|25e4",
			"America/St_Johns|NST NDT|3u 2u|01010101010101010101010|1O0Ru 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|11e4",
			"Antarctica/Casey|+08 +11|-80 -b0|010|1RWg0 3m10|10",
			"Asia/Bangkok|+07|-70|0||15e6",
			"Asia/Vladivostok|+10|-a0|0||60e4",
			"Pacific/Bougainville|+11|-b0|0||18e4",
			"Asia/Tashkent|+05|-50|0||23e5",
			"Pacific/Auckland|NZDT NZST|-d0 -c0|01010101010101010101010|1ObO0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1io0 1a00 1fA0 1a00|14e5",
			"Asia/Baghdad|+03|-30|0||66e5",
			"Antarctica/Troll|+00 +02|0 -20|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|40",
			"Asia/Dhaka|+06|-60|0||16e6",
			"Asia/Amman|EET EEST|-20 -30|01010101010101010101010|1O8m0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0|25e5",
			"Asia/Kamchatka|+12|-c0|0||18e4",
			"Asia/Baku|+04 +05|-40 -50|010|1O9c0 1o00|27e5",
			"Asia/Barnaul|+06 +07|-60 -70|01|1QyI0|",
			"Asia/Beirut|EET EEST|-20 -30|01010101010101010101010|1O9a0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0|22e5",
			"Asia/Kuala_Lumpur|+08|-80|0||71e5",
			"Asia/Kolkata|IST|-5u|0||15e6",
			"Asia/Chita|+08 +09|-80 -90|01|1QyG0|33e4",
			"Asia/Ulaanbaatar|+08 +09|-80 -90|01010|1O8G0 1cJ0 1cP0 1cJ0|12e5",
			"Asia/Shanghai|CST|-80|0||23e6",
			"Asia/Colombo|+0530|-5u|0||22e5",
			"Asia/Damascus|EET EEST|-20 -30|01010101010101010101010|1O8m0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1qL0|26e5",
			"Asia/Yakutsk|+09|-90|0||28e4",
			"Asia/Dubai|+04|-40|0||39e5",
			"Asia/Famagusta|EET EEST +03|-20 -30 -30|0101201010101010101010|1O9d0 1o00 11A0 15U0 2Ks0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|",
			"Asia/Gaza|EET EEST|-20 -30|01010101010101010101010|1O8K0 1nz0 1220 1qL0 WN0 1qL0 WN0 1qL0 11c0 1oo0 11c0 1rc0 Wo0 1rc0 Wo0 1rc0 11c0 1oo0 11c0 1oo0 11c0 1oo0|18e5",
			"Asia/Hong_Kong|HKT|-80|0||73e5",
			"Asia/Hovd|+07 +08|-70 -80|01010|1O8H0 1cJ0 1cP0 1cJ0|81e3",
			"Europe/Istanbul|EET EEST +03|-20 -30 -30|01012|1O9d0 1tA0 U00 15w0|13e6",
			"Asia/Jakarta|WIB|-70|0||31e6",
			"Asia/Jayapura|WIT|-90|0||26e4",
			"Asia/Jerusalem|IST IDT|-20 -30|01010101010101010101010|1O8o0 1oL0 10N0 1rz0 W10 1rz0 W10 1rz0 10N0 1oL0 10N0 1oL0 10N0 1rz0 W10 1rz0 W10 1rz0 10N0 1oL0 10N0 1oL0|81e4",
			"Asia/Kabul|+0430|-4u|0||46e5",
			"Asia/Karachi|PKT|-50|0||24e6",
			"Asia/Kathmandu|+0545|-5J|0||12e5",
			"Asia/Magadan|+10 +11|-a0 -b0|01|1QJQ0|95e3",
			"Asia/Makassar|WITA|-80|0||15e5",
			"Asia/Manila|PST|-80|0||24e6",
			"Europe/Athens|EET EEST|-20 -30|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|35e5",
			"Asia/Novosibirsk|+06 +07|-60 -70|01|1Rmk0|15e5",
			"Asia/Pyongyang|KST KST|-90 -8u|010|1P4D0 6BA0|29e5",
			"Asia/Qyzylorda|+06 +05|-60 -50|01|1Xei0|73e4",
			"Asia/Rangoon|+0630|-6u|0||48e5",
			"Asia/Sakhalin|+10 +11|-a0 -b0|01|1QyE0|58e4",
			"Asia/Seoul|KST|-90|0||23e6",
			"Asia/Tehran|+0330 +0430|-3u -4u|01010101010101010101010|1O6ku 1dz0 1cp0 1dz0 1cN0 1dz0 1cp0 1dz0 1cp0 1dz0 1cp0 1dz0 1cN0 1dz0 1cp0 1dz0 1cp0 1dz0 1cp0 1dz0 1cN0 1dz0|14e6",
			"Asia/Tokyo|JST|-90|0||38e6",
			"Asia/Tomsk|+06 +07|-60 -70|01|1QXU0|10e5",
			"Europe/Lisbon|WET WEST|0 -10|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|27e5",
			"Atlantic/Cape_Verde|-01|10|0||50e4",
			"Australia/Sydney|AEDT AEST|-b0 -a0|01010101010101010101010|1ObQ0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0|40e5",
			"Australia/Adelaide|ACDT ACST|-au -9u|01010101010101010101010|1ObQu 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0|11e5",
			"Australia/Brisbane|AEST|-a0|0||20e5",
			"Australia/Darwin|ACST|-9u|0||12e4",
			"Australia/Eucla|+0845|-8J|0||368",
			"Australia/Lord_Howe|+11 +1030|-b0 -au|01010101010101010101010|1ObP0 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1fAu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1fzu 1cMu 1cLu 1cMu|347",
			"Australia/Perth|AWST|-80|0||18e5",
			"Pacific/Easter|-05 -06|50 60|010101010101010101010|1QSr0 Ap0 1Nb0 Ap0 1Nb0 Ap0 1zb0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 11B0 1nX0 11B0|30e2",
			"Europe/Dublin|GMT IST|0 -10|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|12e5",
			"Etc/GMT-1|+01|-10|0||",
			"Pacific/Fakaofo|+13|-d0|0||483",
			"Pacific/Kiritimati|+14|-e0|0||51e2",
			"Etc/GMT-2|+02|-20|0||",
			"Pacific/Tahiti|-10|a0|0||18e4",
			"Pacific/Niue|-11|b0|0||12e2",
			"Etc/GMT+12|-12|c0|0||",
			"Pacific/Galapagos|-06|60|0||25e3",
			"Etc/GMT+7|-07|70|0||",
			"Pacific/Pitcairn|-08|80|0||56",
			"Pacific/Gambier|-09|90|0||125",
			"Etc/UTC|UTC|0|0||",
			"Europe/Ulyanovsk|+03 +04|-30 -40|01|1QyL0|13e5",
			"Europe/London|GMT BST|0 -10|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|10e6",
			"Europe/Chisinau|EET EEST|-20 -30|01010101010101010101010|1O9c0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|67e4",
			"Europe/Moscow|MSK|-30|0||16e6",
			"Europe/Saratov|+03 +04|-30 -40|01|1Sfz0|",
			"Europe/Volgograd|+03 +04|-30 -40|01|1WQL0|10e5",
			"Pacific/Honolulu|HST|a0|0||37e4",
			"MET|MET MEST|-10 -20|01010101010101010101010|1O9d0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00|",
			"Pacific/Chatham|+1345 +1245|-dJ -cJ|01010101010101010101010|1ObO0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1io0 1a00 1fA0 1a00|600",
			"Pacific/Apia|+14 +13|-e0 -d0|01010101010101010101010|1ObO0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1io0 1a00 1fA0 1a00|37e3",
			"Pacific/Fiji|+13 +12|-d0 -c0|01010101010101010101010|1NF20 1SM0 uM0 1VA0 s00 1VA0 s00 1VA0 s00 20o0 pc0 20o0 s00 20o0 pc0 20o0 pc0 20o0 pc0 20o0 pc0 20o0|88e4",
			"Pacific/Guam|ChST|-a0|0||17e4",
			"Pacific/Marquesas|-0930|9u|0||86e2",
			"Pacific/Pago_Pago|SST|b0|0||37e2",
			"Pacific/Norfolk|+1130 +11 +12|-bu -b0 -c0|012121212121212|1PoCu 9Jcu 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0|25e4",
			"Pacific/Tongatapu|+13 +14|-d0 -e0|010|1S4d0 s00|75e3"
		],
		"links": [
			"Africa/Abidjan|Africa/Accra",
			"Africa/Abidjan|Africa/Bamako",
			"Africa/Abidjan|Africa/Banjul",
			"Africa/Abidjan|Africa/Bissau",
			"Africa/Abidjan|Africa/Conakry",
			"Africa/Abidjan|Africa/Dakar",
			"Africa/Abidjan|Africa/Freetown",
			"Africa/Abidjan|Africa/Lome",
			"Africa/Abidjan|Africa/Monrovia",
			"Africa/Abidjan|Africa/Nouakchott",
			"Africa/Abidjan|Africa/Ouagadougou",
			"Africa/Abidjan|Africa/Timbuktu",
			"Africa/Abidjan|America/Danmarkshavn",
			"Africa/Abidjan|Atlantic/Reykjavik",
			"Africa/Abidjan|Atlantic/St_Helena",
			"Africa/Abidjan|Etc/GMT",
			"Africa/Abidjan|Etc/GMT+0",
			"Africa/Abidjan|Etc/GMT-0",
			"Africa/Abidjan|Etc/GMT0",
			"Africa/Abidjan|Etc/Greenwich",
			"Africa/Abidjan|GMT",
			"Africa/Abidjan|GMT+0",
			"Africa/Abidjan|GMT-0",
			"Africa/Abidjan|GMT0",
			"Africa/Abidjan|Greenwich",
			"Africa/Abidjan|Iceland",
			"Africa/Algiers|Africa/Tunis",
			"Africa/Cairo|Africa/Tripoli",
			"Africa/Cairo|Egypt",
			"Africa/Cairo|Europe/Kaliningrad",
			"Africa/Cairo|Libya",
			"Africa/Casablanca|Africa/El_Aaiun",
			"Africa/Johannesburg|Africa/Maseru",
			"Africa/Johannesburg|Africa/Mbabane",
			"Africa/Lagos|Africa/Bangui",
			"Africa/Lagos|Africa/Brazzaville",
			"Africa/Lagos|Africa/Douala",
			"Africa/Lagos|Africa/Kinshasa",
			"Africa/Lagos|Africa/Libreville",
			"Africa/Lagos|Africa/Luanda",
			"Africa/Lagos|Africa/Malabo",
			"Africa/Lagos|Africa/Ndjamena",
			"Africa/Lagos|Africa/Niamey",
			"Africa/Lagos|Africa/Porto-Novo",
			"Africa/Maputo|Africa/Blantyre",
			"Africa/Maputo|Africa/Bujumbura",
			"Africa/Maputo|Africa/Gaborone",
			"Africa/Maputo|Africa/Harare",
			"Africa/Maputo|Africa/Kigali",
			"Africa/Maputo|Africa/Lubumbashi",
			"Africa/Maputo|Africa/Lusaka",
			"Africa/Nairobi|Africa/Addis_Ababa",
			"Africa/Nairobi|Africa/Asmara",
			"Africa/Nairobi|Africa/Asmera",
			"Africa/Nairobi|Africa/Dar_es_Salaam",
			"Africa/Nairobi|Africa/Djibouti",
			"Africa/Nairobi|Africa/Juba",
			"Africa/Nairobi|Africa/Kampala",
			"Africa/Nairobi|Africa/Mogadishu",
			"Africa/Nairobi|Indian/Antananarivo",
			"Africa/Nairobi|Indian/Comoro",
			"Africa/Nairobi|Indian/Mayotte",
			"America/Adak|America/Atka",
			"America/Adak|US/Aleutian",
			"America/Anchorage|America/Juneau",
			"America/Anchorage|America/Nome",
			"America/Anchorage|America/Sitka",
			"America/Anchorage|America/Yakutat",
			"America/Anchorage|US/Alaska",
			"America/Campo_Grande|America/Cuiaba",
			"America/Chicago|America/Indiana/Knox",
			"America/Chicago|America/Indiana/Tell_City",
			"America/Chicago|America/Knox_IN",
			"America/Chicago|America/Matamoros",
			"America/Chicago|America/Menominee",
			"America/Chicago|America/North_Dakota/Beulah",
			"America/Chicago|America/North_Dakota/Center",
			"America/Chicago|America/North_Dakota/New_Salem",
			"America/Chicago|America/Rainy_River",
			"America/Chicago|America/Rankin_Inlet",
			"America/Chicago|America/Resolute",
			"America/Chicago|America/Winnipeg",
			"America/Chicago|CST6CDT",
			"America/Chicago|Canada/Central",
			"America/Chicago|US/Central",
			"America/Chicago|US/Indiana-Starke",
			"America/Chihuahua|America/Mazatlan",
			"America/Chihuahua|Mexico/BajaSur",
			"America/Denver|America/Boise",
			"America/Denver|America/Cambridge_Bay",
			"America/Denver|America/Edmonton",
			"America/Denver|America/Inuvik",
			"America/Denver|America/Ojinaga",
			"America/Denver|America/Shiprock",
			"America/Denver|America/Yellowknife",
			"America/Denver|Canada/Mountain",
			"America/Denver|MST7MDT",
			"America/Denver|Navajo",
			"America/Denver|US/Mountain",
			"America/Fortaleza|America/Araguaina",
			"America/Fortaleza|America/Argentina/Buenos_Aires",
			"America/Fortaleza|America/Argentina/Catamarca",
			"America/Fortaleza|America/Argentina/ComodRivadavia",
			"America/Fortaleza|America/Argentina/Cordoba",
			"America/Fortaleza|America/Argentina/Jujuy",
			"America/Fortaleza|America/Argentina/La_Rioja",
			"America/Fortaleza|America/Argentina/Mendoza",
			"America/Fortaleza|America/Argentina/Rio_Gallegos",
			"America/Fortaleza|America/Argentina/Salta",
			"America/Fortaleza|America/Argentina/San_Juan",
			"America/Fortaleza|America/Argentina/San_Luis",
			"America/Fortaleza|America/Argentina/Tucuman",
			"America/Fortaleza|America/Argentina/Ushuaia",
			"America/Fortaleza|America/Bahia",
			"America/Fortaleza|America/Belem",
			"America/Fortaleza|America/Buenos_Aires",
			"America/Fortaleza|America/Catamarca",
			"America/Fortaleza|America/Cayenne",
			"America/Fortaleza|America/Cordoba",
			"America/Fortaleza|America/Jujuy",
			"America/Fortaleza|America/Maceio",
			"America/Fortaleza|America/Mendoza",
			"America/Fortaleza|America/Paramaribo",
			"America/Fortaleza|America/Recife",
			"America/Fortaleza|America/Rosario",
			"America/Fortaleza|America/Santarem",
			"America/Fortaleza|Antarctica/Rothera",
			"America/Fortaleza|Atlantic/Stanley",
			"America/Fortaleza|Etc/GMT+3",
			"America/Godthab|America/Nuuk",
			"America/Halifax|America/Glace_Bay",
			"America/Halifax|America/Goose_Bay",
			"America/Halifax|America/Moncton",
			"America/Halifax|America/Thule",
			"America/Halifax|Atlantic/Bermuda",
			"America/Halifax|Canada/Atlantic",
			"America/Havana|Cuba",
			"America/La_Paz|America/Boa_Vista",
			"America/La_Paz|America/Guyana",
			"America/La_Paz|America/Manaus",
			"America/La_Paz|America/Porto_Velho",
			"America/La_Paz|Brazil/West",
			"America/La_Paz|Etc/GMT+4",
			"America/Lima|America/Bogota",
			"America/Lima|America/Eirunepe",
			"America/Lima|America/Guayaquil",
			"America/Lima|America/Porto_Acre",
			"America/Lima|America/Rio_Branco",
			"America/Lima|Brazil/Acre",
			"America/Lima|Etc/GMT+5",
			"America/Los_Angeles|America/Ensenada",
			"America/Los_Angeles|America/Santa_Isabel",
			"America/Los_Angeles|America/Tijuana",
			"America/Los_Angeles|America/Vancouver",
			"America/Los_Angeles|Canada/Pacific",
			"America/Los_Angeles|Mexico/BajaNorte",
			"America/Los_Angeles|PST8PDT",
			"America/Los_Angeles|US/Pacific",
			"America/Los_Angeles|US/Pacific-New",
			"America/Managua|America/Belize",
			"America/Managua|America/Costa_Rica",
			"America/Managua|America/El_Salvador",
			"America/Managua|America/Guatemala",
			"America/Managua|America/Regina",
			"America/Managua|America/Swift_Current",
			"America/Managua|America/Tegucigalpa",
			"America/Managua|Canada/Saskatchewan",
			"America/Mexico_City|America/Bahia_Banderas",
			"America/Mexico_City|America/Merida",
			"America/Mexico_City|America/Monterrey",
			"America/Mexico_City|Mexico/General",
			"America/New_York|America/Detroit",
			"America/New_York|America/Fort_Wayne",
			"America/New_York|America/Indiana/Indianapolis",
			"America/New_York|America/Indiana/Marengo",
			"America/New_York|America/Indiana/Petersburg",
			"America/New_York|America/Indiana/Vevay",
			"America/New_York|America/Indiana/Vincennes",
			"America/New_York|America/Indiana/Winamac",
			"America/New_York|America/Indianapolis",
			"America/New_York|America/Iqaluit",
			"America/New_York|America/Kentucky/Louisville",
			"America/New_York|America/Kentucky/Monticello",
			"America/New_York|America/Louisville",
			"America/New_York|America/Montreal",
			"America/New_York|America/Nassau",
			"America/New_York|America/Nipigon",
			"America/New_York|America/Pangnirtung",
			"America/New_York|America/Thunder_Bay",
			"America/New_York|America/Toronto",
			"America/New_York|Canada/Eastern",
			"America/New_York|EST5EDT",
			"America/New_York|US/East-Indiana",
			"America/New_York|US/Eastern",
			"America/New_York|US/Michigan",
			"America/Noronha|Atlantic/South_Georgia",
			"America/Noronha|Brazil/DeNoronha",
			"America/Noronha|Etc/GMT+2",
			"America/Panama|America/Atikokan",
			"America/Panama|America/Cayman",
			"America/Panama|America/Coral_Harbour",
			"America/Panama|America/Jamaica",
			"America/Panama|EST",
			"America/Panama|Jamaica",
			"America/Phoenix|America/Creston",
			"America/Phoenix|America/Dawson_Creek",
			"America/Phoenix|America/Hermosillo",
			"America/Phoenix|MST",
			"America/Phoenix|US/Arizona",
			"America/Santiago|Chile/Continental",
			"America/Santo_Domingo|America/Anguilla",
			"America/Santo_Domingo|America/Antigua",
			"America/Santo_Domingo|America/Aruba",
			"America/Santo_Domingo|America/Barbados",
			"America/Santo_Domingo|America/Blanc-Sablon",
			"America/Santo_Domingo|America/Curacao",
			"America/Santo_Domingo|America/Dominica",
			"America/Santo_Domingo|America/Grenada",
			"America/Santo_Domingo|America/Guadeloupe",
			"America/Santo_Domingo|America/Kralendijk",
			"America/Santo_Domingo|America/Lower_Princes",
			"America/Santo_Domingo|America/Marigot",
			"America/Santo_Domingo|America/Martinique",
			"America/Santo_Domingo|America/Montserrat",
			"America/Santo_Domingo|America/Port_of_Spain",
			"America/Santo_Domingo|America/Puerto_Rico",
			"America/Santo_Domingo|America/St_Barthelemy",
			"America/Santo_Domingo|America/St_Kitts",
			"America/Santo_Domingo|America/St_Lucia",
			"America/Santo_Domingo|America/St_Thomas",
			"America/Santo_Domingo|America/St_Vincent",
			"America/Santo_Domingo|America/Tortola",
			"America/Santo_Domingo|America/Virgin",
			"America/Sao_Paulo|Brazil/East",
			"America/St_Johns|Canada/Newfoundland",
			"America/Whitehorse|America/Dawson",
			"America/Whitehorse|Canada/Yukon",
			"Antarctica/Palmer|America/Punta_Arenas",
			"Asia/Baghdad|Antarctica/Syowa",
			"Asia/Baghdad|Asia/Aden",
			"Asia/Baghdad|Asia/Bahrain",
			"Asia/Baghdad|Asia/Kuwait",
			"Asia/Baghdad|Asia/Qatar",
			"Asia/Baghdad|Asia/Riyadh",
			"Asia/Baghdad|Etc/GMT-3",
			"Asia/Baghdad|Europe/Kirov",
			"Asia/Baghdad|Europe/Minsk",
			"Asia/Bangkok|Antarctica/Davis",
			"Asia/Bangkok|Asia/Ho_Chi_Minh",
			"Asia/Bangkok|Asia/Krasnoyarsk",
			"Asia/Bangkok|Asia/Novokuznetsk",
			"Asia/Bangkok|Asia/Phnom_Penh",
			"Asia/Bangkok|Asia/Saigon",
			"Asia/Bangkok|Asia/Vientiane",
			"Asia/Bangkok|Etc/GMT-7",
			"Asia/Bangkok|Indian/Christmas",
			"Asia/Dhaka|Antarctica/Vostok",
			"Asia/Dhaka|Asia/Almaty",
			"Asia/Dhaka|Asia/Bishkek",
			"Asia/Dhaka|Asia/Dacca",
			"Asia/Dhaka|Asia/Kashgar",
			"Asia/Dhaka|Asia/Omsk",
			"Asia/Dhaka|Asia/Qostanay",
			"Asia/Dhaka|Asia/Thimbu",
			"Asia/Dhaka|Asia/Thimphu",
			"Asia/Dhaka|Asia/Urumqi",
			"Asia/Dhaka|Etc/GMT-6",
			"Asia/Dhaka|Indian/Chagos",
			"Asia/Dubai|Asia/Muscat",
			"Asia/Dubai|Asia/Tbilisi",
			"Asia/Dubai|Asia/Yerevan",
			"Asia/Dubai|Etc/GMT-4",
			"Asia/Dubai|Europe/Samara",
			"Asia/Dubai|Indian/Mahe",
			"Asia/Dubai|Indian/Mauritius",
			"Asia/Dubai|Indian/Reunion",
			"Asia/Gaza|Asia/Hebron",
			"Asia/Hong_Kong|Hongkong",
			"Asia/Jakarta|Asia/Pontianak",
			"Asia/Jerusalem|Asia/Tel_Aviv",
			"Asia/Jerusalem|Israel",
			"Asia/Kamchatka|Asia/Anadyr",
			"Asia/Kamchatka|Etc/GMT-12",
			"Asia/Kamchatka|Kwajalein",
			"Asia/Kamchatka|Pacific/Funafuti",
			"Asia/Kamchatka|Pacific/Kwajalein",
			"Asia/Kamchatka|Pacific/Majuro",
			"Asia/Kamchatka|Pacific/Nauru",
			"Asia/Kamchatka|Pacific/Tarawa",
			"Asia/Kamchatka|Pacific/Wake",
			"Asia/Kamchatka|Pacific/Wallis",
			"Asia/Kathmandu|Asia/Katmandu",
			"Asia/Kolkata|Asia/Calcutta",
			"Asia/Kuala_Lumpur|Asia/Brunei",
			"Asia/Kuala_Lumpur|Asia/Irkutsk",
			"Asia/Kuala_Lumpur|Asia/Kuching",
			"Asia/Kuala_Lumpur|Asia/Singapore",
			"Asia/Kuala_Lumpur|Etc/GMT-8",
			"Asia/Kuala_Lumpur|Singapore",
			"Asia/Makassar|Asia/Ujung_Pandang",
			"Asia/Rangoon|Asia/Yangon",
			"Asia/Rangoon|Indian/Cocos",
			"Asia/Seoul|ROK",
			"Asia/Shanghai|Asia/Chongqing",
			"Asia/Shanghai|Asia/Chungking",
			"Asia/Shanghai|Asia/Harbin",
			"Asia/Shanghai|Asia/Macao",
			"Asia/Shanghai|Asia/Macau",
			"Asia/Shanghai|Asia/Taipei",
			"Asia/Shanghai|PRC",
			"Asia/Shanghai|ROC",
			"Asia/Tashkent|Antarctica/Mawson",
			"Asia/Tashkent|Asia/Aqtau",
			"Asia/Tashkent|Asia/Aqtobe",
			"Asia/Tashkent|Asia/Ashgabat",
			"Asia/Tashkent|Asia/Ashkhabad",
			"Asia/Tashkent|Asia/Atyrau",
			"Asia/Tashkent|Asia/Dushanbe",
			"Asia/Tashkent|Asia/Oral",
			"Asia/Tashkent|Asia/Samarkand",
			"Asia/Tashkent|Asia/Yekaterinburg",
			"Asia/Tashkent|Etc/GMT-5",
			"Asia/Tashkent|Indian/Kerguelen",
			"Asia/Tashkent|Indian/Maldives",
			"Asia/Tehran|Iran",
			"Asia/Tokyo|Japan",
			"Asia/Ulaanbaatar|Asia/Choibalsan",
			"Asia/Ulaanbaatar|Asia/Ulan_Bator",
			"Asia/Vladivostok|Antarctica/DumontDUrville",
			"Asia/Vladivostok|Asia/Ust-Nera",
			"Asia/Vladivostok|Etc/GMT-10",
			"Asia/Vladivostok|Pacific/Chuuk",
			"Asia/Vladivostok|Pacific/Port_Moresby",
			"Asia/Vladivostok|Pacific/Truk",
			"Asia/Vladivostok|Pacific/Yap",
			"Asia/Yakutsk|Asia/Dili",
			"Asia/Yakutsk|Asia/Khandyga",
			"Asia/Yakutsk|Etc/GMT-9",
			"Asia/Yakutsk|Pacific/Palau",
			"Atlantic/Azores|America/Scoresbysund",
			"Atlantic/Cape_Verde|Etc/GMT+1",
			"Australia/Adelaide|Australia/Broken_Hill",
			"Australia/Adelaide|Australia/South",
			"Australia/Adelaide|Australia/Yancowinna",
			"Australia/Brisbane|Australia/Lindeman",
			"Australia/Brisbane|Australia/Queensland",
			"Australia/Darwin|Australia/North",
			"Australia/Lord_Howe|Australia/LHI",
			"Australia/Perth|Australia/West",
			"Australia/Sydney|Australia/ACT",
			"Australia/Sydney|Australia/Canberra",
			"Australia/Sydney|Australia/Currie",
			"Australia/Sydney|Australia/Hobart",
			"Australia/Sydney|Australia/Melbourne",
			"Australia/Sydney|Australia/NSW",
			"Australia/Sydney|Australia/Tasmania",
			"Australia/Sydney|Australia/Victoria",
			"Etc/UTC|Etc/UCT",
			"Etc/UTC|Etc/Universal",
			"Etc/UTC|Etc/Zulu",
			"Etc/UTC|UCT",
			"Etc/UTC|UTC",
			"Etc/UTC|Universal",
			"Etc/UTC|Zulu",
			"Europe/Athens|Asia/Nicosia",
			"Europe/Athens|EET",
			"Europe/Athens|Europe/Bucharest",
			"Europe/Athens|Europe/Helsinki",
			"Europe/Athens|Europe/Kiev",
			"Europe/Athens|Europe/Mariehamn",
			"Europe/Athens|Europe/Nicosia",
			"Europe/Athens|Europe/Riga",
			"Europe/Athens|Europe/Sofia",
			"Europe/Athens|Europe/Tallinn",
			"Europe/Athens|Europe/Uzhgorod",
			"Europe/Athens|Europe/Vilnius",
			"Europe/Athens|Europe/Zaporozhye",
			"Europe/Chisinau|Europe/Tiraspol",
			"Europe/Dublin|Eire",
			"Europe/Istanbul|Asia/Istanbul",
			"Europe/Istanbul|Turkey",
			"Europe/Lisbon|Atlantic/Canary",
			"Europe/Lisbon|Atlantic/Faeroe",
			"Europe/Lisbon|Atlantic/Faroe",
			"Europe/Lisbon|Atlantic/Madeira",
			"Europe/Lisbon|Portugal",
			"Europe/Lisbon|WET",
			"Europe/London|Europe/Belfast",
			"Europe/London|Europe/Guernsey",
			"Europe/London|Europe/Isle_of_Man",
			"Europe/London|Europe/Jersey",
			"Europe/London|GB",
			"Europe/London|GB-Eire",
			"Europe/Moscow|Europe/Simferopol",
			"Europe/Moscow|W-SU",
			"Europe/Paris|Africa/Ceuta",
			"Europe/Paris|Arctic/Longyearbyen",
			"Europe/Paris|Atlantic/Jan_Mayen",
			"Europe/Paris|CET",
			"Europe/Paris|Europe/Amsterdam",
			"Europe/Paris|Europe/Andorra",
			"Europe/Paris|Europe/Belgrade",
			"Europe/Paris|Europe/Berlin",
			"Europe/Paris|Europe/Bratislava",
			"Europe/Paris|Europe/Brussels",
			"Europe/Paris|Europe/Budapest",
			"Europe/Paris|Europe/Busingen",
			"Europe/Paris|Europe/Copenhagen",
			"Europe/Paris|Europe/Gibraltar",
			"Europe/Paris|Europe/Ljubljana",
			"Europe/Paris|Europe/Luxembourg",
			"Europe/Paris|Europe/Madrid",
			"Europe/Paris|Europe/Malta",
			"Europe/Paris|Europe/Monaco",
			"Europe/Paris|Europe/Oslo",
			"Europe/Paris|Europe/Podgorica",
			"Europe/Paris|Europe/Prague",
			"Europe/Paris|Europe/Rome",
			"Europe/Paris|Europe/San_Marino",
			"Europe/Paris|Europe/Sarajevo",
			"Europe/Paris|Europe/Skopje",
			"Europe/Paris|Europe/Stockholm",
			"Europe/Paris|Europe/Tirane",
			"Europe/Paris|Europe/Vaduz",
			"Europe/Paris|Europe/Vatican",
			"Europe/Paris|Europe/Vienna",
			"Europe/Paris|Europe/Warsaw",
			"Europe/Paris|Europe/Zagreb",
			"Europe/Paris|Europe/Zurich",
			"Europe/Paris|Poland",
			"Europe/Ulyanovsk|Europe/Astrakhan",
			"Pacific/Auckland|Antarctica/McMurdo",
			"Pacific/Auckland|Antarctica/South_Pole",
			"Pacific/Auckland|NZ",
			"Pacific/Bougainville|Antarctica/Macquarie",
			"Pacific/Bougainville|Asia/Srednekolymsk",
			"Pacific/Bougainville|Etc/GMT-11",
			"Pacific/Bougainville|Pacific/Efate",
			"Pacific/Bougainville|Pacific/Guadalcanal",
			"Pacific/Bougainville|Pacific/Kosrae",
			"Pacific/Bougainville|Pacific/Noumea",
			"Pacific/Bougainville|Pacific/Pohnpei",
			"Pacific/Bougainville|Pacific/Ponape",
			"Pacific/Chatham|NZ-CHAT",
			"Pacific/Easter|Chile/EasterIsland",
			"Pacific/Fakaofo|Etc/GMT-13",
			"Pacific/Fakaofo|Pacific/Enderbury",
			"Pacific/Galapagos|Etc/GMT+6",
			"Pacific/Gambier|Etc/GMT+9",
			"Pacific/Guam|Pacific/Saipan",
			"Pacific/Honolulu|HST",
			"Pacific/Honolulu|Pacific/Johnston",
			"Pacific/Honolulu|US/Hawaii",
			"Pacific/Kiritimati|Etc/GMT-14",
			"Pacific/Niue|Etc/GMT+11",
			"Pacific/Pago_Pago|Pacific/Midway",
			"Pacific/Pago_Pago|Pacific/Samoa",
			"Pacific/Pago_Pago|US/Samoa",
			"Pacific/Pitcairn|Etc/GMT+8",
			"Pacific/Tahiti|Etc/GMT+10",
			"Pacific/Tahiti|Pacific/Rarotonga"
		],
		"countries": [
			"AD|Europe/Andorra",
			"AE|Asia/Dubai",
			"AF|Asia/Kabul",
			"AG|America/Port_of_Spain America/Antigua",
			"AI|America/Port_of_Spain America/Anguilla",
			"AL|Europe/Tirane",
			"AM|Asia/Yerevan",
			"AO|Africa/Lagos Africa/Luanda",
			"AQ|Antarctica/Casey Antarctica/Davis Antarctica/DumontDUrville Antarctica/Mawson Antarctica/Palmer Antarctica/Rothera Antarctica/Syowa Antarctica/Troll Antarctica/Vostok Pacific/Auckland Antarctica/McMurdo",
			"AR|America/Argentina/Buenos_Aires America/Argentina/Cordoba America/Argentina/Salta America/Argentina/Jujuy America/Argentina/Tucuman America/Argentina/Catamarca America/Argentina/La_Rioja America/Argentina/San_Juan America/Argentina/Mendoza America/Argentina/San_Luis America/Argentina/Rio_Gallegos America/Argentina/Ushuaia",
			"AS|Pacific/Pago_Pago",
			"AT|Europe/Vienna",
			"AU|Australia/Lord_Howe Antarctica/Macquarie Australia/Hobart Australia/Currie Australia/Melbourne Australia/Sydney Australia/Broken_Hill Australia/Brisbane Australia/Lindeman Australia/Adelaide Australia/Darwin Australia/Perth Australia/Eucla",
			"AW|America/Curacao America/Aruba",
			"AX|Europe/Helsinki Europe/Mariehamn",
			"AZ|Asia/Baku",
			"BA|Europe/Belgrade Europe/Sarajevo",
			"BB|America/Barbados",
			"BD|Asia/Dhaka",
			"BE|Europe/Brussels",
			"BF|Africa/Abidjan Africa/Ouagadougou",
			"BG|Europe/Sofia",
			"BH|Asia/Qatar Asia/Bahrain",
			"BI|Africa/Maputo Africa/Bujumbura",
			"BJ|Africa/Lagos Africa/Porto-Novo",
			"BL|America/Port_of_Spain America/St_Barthelemy",
			"BM|Atlantic/Bermuda",
			"BN|Asia/Brunei",
			"BO|America/La_Paz",
			"BQ|America/Curacao America/Kralendijk",
			"BR|America/Noronha America/Belem America/Fortaleza America/Recife America/Araguaina America/Maceio America/Bahia America/Sao_Paulo America/Campo_Grande America/Cuiaba America/Santarem America/Porto_Velho America/Boa_Vista America/Manaus America/Eirunepe America/Rio_Branco",
			"BS|America/Nassau",
			"BT|Asia/Thimphu",
			"BW|Africa/Maputo Africa/Gaborone",
			"BY|Europe/Minsk",
			"BZ|America/Belize",
			"CA|America/St_Johns America/Halifax America/Glace_Bay America/Moncton America/Goose_Bay America/Blanc-Sablon America/Toronto America/Nipigon America/Thunder_Bay America/Iqaluit America/Pangnirtung America/Atikokan America/Winnipeg America/Rainy_River America/Resolute America/Rankin_Inlet America/Regina America/Swift_Current America/Edmonton America/Cambridge_Bay America/Yellowknife America/Inuvik America/Creston America/Dawson_Creek America/Fort_Nelson America/Vancouver America/Whitehorse America/Dawson",
			"CC|Indian/Cocos",
			"CD|Africa/Maputo Africa/Lagos Africa/Kinshasa Africa/Lubumbashi",
			"CF|Africa/Lagos Africa/Bangui",
			"CG|Africa/Lagos Africa/Brazzaville",
			"CH|Europe/Zurich",
			"CI|Africa/Abidjan",
			"CK|Pacific/Rarotonga",
			"CL|America/Santiago America/Punta_Arenas Pacific/Easter",
			"CM|Africa/Lagos Africa/Douala",
			"CN|Asia/Shanghai Asia/Urumqi",
			"CO|America/Bogota",
			"CR|America/Costa_Rica",
			"CU|America/Havana",
			"CV|Atlantic/Cape_Verde",
			"CW|America/Curacao",
			"CX|Indian/Christmas",
			"CY|Asia/Nicosia Asia/Famagusta",
			"CZ|Europe/Prague",
			"DE|Europe/Zurich Europe/Berlin Europe/Busingen",
			"DJ|Africa/Nairobi Africa/Djibouti",
			"DK|Europe/Copenhagen",
			"DM|America/Port_of_Spain America/Dominica",
			"DO|America/Santo_Domingo",
			"DZ|Africa/Algiers",
			"EC|America/Guayaquil Pacific/Galapagos",
			"EE|Europe/Tallinn",
			"EG|Africa/Cairo",
			"EH|Africa/El_Aaiun",
			"ER|Africa/Nairobi Africa/Asmara",
			"ES|Europe/Madrid Africa/Ceuta Atlantic/Canary",
			"ET|Africa/Nairobi Africa/Addis_Ababa",
			"FI|Europe/Helsinki",
			"FJ|Pacific/Fiji",
			"FK|Atlantic/Stanley",
			"FM|Pacific/Chuuk Pacific/Pohnpei Pacific/Kosrae",
			"FO|Atlantic/Faroe",
			"FR|Europe/Paris",
			"GA|Africa/Lagos Africa/Libreville",
			"GB|Europe/London",
			"GD|America/Port_of_Spain America/Grenada",
			"GE|Asia/Tbilisi",
			"GF|America/Cayenne",
			"GG|Europe/London Europe/Guernsey",
			"GH|Africa/Accra",
			"GI|Europe/Gibraltar",
			"GL|America/Godthab America/Danmarkshavn America/Scoresbysund America/Thule",
			"GM|Africa/Abidjan Africa/Banjul",
			"GN|Africa/Abidjan Africa/Conakry",
			"GP|America/Port_of_Spain America/Guadeloupe",
			"GQ|Africa/Lagos Africa/Malabo",
			"GR|Europe/Athens",
			"GS|Atlantic/South_Georgia",
			"GT|America/Guatemala",
			"GU|Pacific/Guam",
			"GW|Africa/Bissau",
			"GY|America/Guyana",
			"HK|Asia/Hong_Kong",
			"HN|America/Tegucigalpa",
			"HR|Europe/Belgrade Europe/Zagreb",
			"HT|America/Port-au-Prince",
			"HU|Europe/Budapest",
			"ID|Asia/Jakarta Asia/Pontianak Asia/Makassar Asia/Jayapura",
			"IE|Europe/Dublin",
			"IL|Asia/Jerusalem",
			"IM|Europe/London Europe/Isle_of_Man",
			"IN|Asia/Kolkata",
			"IO|Indian/Chagos",
			"IQ|Asia/Baghdad",
			"IR|Asia/Tehran",
			"IS|Atlantic/Reykjavik",
			"IT|Europe/Rome",
			"JE|Europe/London Europe/Jersey",
			"JM|America/Jamaica",
			"JO|Asia/Amman",
			"JP|Asia/Tokyo",
			"KE|Africa/Nairobi",
			"KG|Asia/Bishkek",
			"KH|Asia/Bangkok Asia/Phnom_Penh",
			"KI|Pacific/Tarawa Pacific/Enderbury Pacific/Kiritimati",
			"KM|Africa/Nairobi Indian/Comoro",
			"KN|America/Port_of_Spain America/St_Kitts",
			"KP|Asia/Pyongyang",
			"KR|Asia/Seoul",
			"KW|Asia/Riyadh Asia/Kuwait",
			"KY|America/Panama America/Cayman",
			"KZ|Asia/Almaty Asia/Qyzylorda Asia/Qostanay Asia/Aqtobe Asia/Aqtau Asia/Atyrau Asia/Oral",
			"LA|Asia/Bangkok Asia/Vientiane",
			"LB|Asia/Beirut",
			"LC|America/Port_of_Spain America/St_Lucia",
			"LI|Europe/Zurich Europe/Vaduz",
			"LK|Asia/Colombo",
			"LR|Africa/Monrovia",
			"LS|Africa/Johannesburg Africa/Maseru",
			"LT|Europe/Vilnius",
			"LU|Europe/Luxembourg",
			"LV|Europe/Riga",
			"LY|Africa/Tripoli",
			"MA|Africa/Casablanca",
			"MC|Europe/Monaco",
			"MD|Europe/Chisinau",
			"ME|Europe/Belgrade Europe/Podgorica",
			"MF|America/Port_of_Spain America/Marigot",
			"MG|Africa/Nairobi Indian/Antananarivo",
			"MH|Pacific/Majuro Pacific/Kwajalein",
			"MK|Europe/Belgrade Europe/Skopje",
			"ML|Africa/Abidjan Africa/Bamako",
			"MM|Asia/Yangon",
			"MN|Asia/Ulaanbaatar Asia/Hovd Asia/Choibalsan",
			"MO|Asia/Macau",
			"MP|Pacific/Guam Pacific/Saipan",
			"MQ|America/Martinique",
			"MR|Africa/Abidjan Africa/Nouakchott",
			"MS|America/Port_of_Spain America/Montserrat",
			"MT|Europe/Malta",
			"MU|Indian/Mauritius",
			"MV|Indian/Maldives",
			"MW|Africa/Maputo Africa/Blantyre",
			"MX|America/Mexico_City America/Cancun America/Merida America/Monterrey America/Matamoros America/Mazatlan America/Chihuahua America/Ojinaga America/Hermosillo America/Tijuana America/Bahia_Banderas",
			"MY|Asia/Kuala_Lumpur Asia/Kuching",
			"MZ|Africa/Maputo",
			"NA|Africa/Windhoek",
			"NC|Pacific/Noumea",
			"NE|Africa/Lagos Africa/Niamey",
			"NF|Pacific/Norfolk",
			"NG|Africa/Lagos",
			"NI|America/Managua",
			"NL|Europe/Amsterdam",
			"NO|Europe/Oslo",
			"NP|Asia/Kathmandu",
			"NR|Pacific/Nauru",
			"NU|Pacific/Niue",
			"NZ|Pacific/Auckland Pacific/Chatham",
			"OM|Asia/Dubai Asia/Muscat",
			"PA|America/Panama",
			"PE|America/Lima",
			"PF|Pacific/Tahiti Pacific/Marquesas Pacific/Gambier",
			"PG|Pacific/Port_Moresby Pacific/Bougainville",
			"PH|Asia/Manila",
			"PK|Asia/Karachi",
			"PL|Europe/Warsaw",
			"PM|America/Miquelon",
			"PN|Pacific/Pitcairn",
			"PR|America/Puerto_Rico",
			"PS|Asia/Gaza Asia/Hebron",
			"PT|Europe/Lisbon Atlantic/Madeira Atlantic/Azores",
			"PW|Pacific/Palau",
			"PY|America/Asuncion",
			"QA|Asia/Qatar",
			"RE|Indian/Reunion",
			"RO|Europe/Bucharest",
			"RS|Europe/Belgrade",
			"RU|Europe/Kaliningrad Europe/Moscow Europe/Simferopol Europe/Kirov Europe/Astrakhan Europe/Volgograd Europe/Saratov Europe/Ulyanovsk Europe/Samara Asia/Yekaterinburg Asia/Omsk Asia/Novosibirsk Asia/Barnaul Asia/Tomsk Asia/Novokuznetsk Asia/Krasnoyarsk Asia/Irkutsk Asia/Chita Asia/Yakutsk Asia/Khandyga Asia/Vladivostok Asia/Ust-Nera Asia/Magadan Asia/Sakhalin Asia/Srednekolymsk Asia/Kamchatka Asia/Anadyr",
			"RW|Africa/Maputo Africa/Kigali",
			"SA|Asia/Riyadh",
			"SB|Pacific/Guadalcanal",
			"SC|Indian/Mahe",
			"SD|Africa/Khartoum",
			"SE|Europe/Stockholm",
			"SG|Asia/Singapore",
			"SH|Africa/Abidjan Atlantic/St_Helena",
			"SI|Europe/Belgrade Europe/Ljubljana",
			"SJ|Europe/Oslo Arctic/Longyearbyen",
			"SK|Europe/Prague Europe/Bratislava",
			"SL|Africa/Abidjan Africa/Freetown",
			"SM|Europe/Rome Europe/San_Marino",
			"SN|Africa/Abidjan Africa/Dakar",
			"SO|Africa/Nairobi Africa/Mogadishu",
			"SR|America/Paramaribo",
			"SS|Africa/Juba",
			"ST|Africa/Sao_Tome",
			"SV|America/El_Salvador",
			"SX|America/Curacao America/Lower_Princes",
			"SY|Asia/Damascus",
			"SZ|Africa/Johannesburg Africa/Mbabane",
			"TC|America/Grand_Turk",
			"TD|Africa/Ndjamena",
			"TF|Indian/Reunion Indian/Kerguelen",
			"TG|Africa/Abidjan Africa/Lome",
			"TH|Asia/Bangkok",
			"TJ|Asia/Dushanbe",
			"TK|Pacific/Fakaofo",
			"TL|Asia/Dili",
			"TM|Asia/Ashgabat",
			"TN|Africa/Tunis",
			"TO|Pacific/Tongatapu",
			"TR|Europe/Istanbul",
			"TT|America/Port_of_Spain",
			"TV|Pacific/Funafuti",
			"TW|Asia/Taipei",
			"TZ|Africa/Nairobi Africa/Dar_es_Salaam",
			"UA|Europe/Simferopol Europe/Kiev Europe/Uzhgorod Europe/Zaporozhye",
			"UG|Africa/Nairobi Africa/Kampala",
			"UM|Pacific/Pago_Pago Pacific/Wake Pacific/Honolulu Pacific/Midway",
			"US|America/New_York America/Detroit America/Kentucky/Louisville America/Kentucky/Monticello America/Indiana/Indianapolis America/Indiana/Vincennes America/Indiana/Winamac America/Indiana/Marengo America/Indiana/Petersburg America/Indiana/Vevay America/Chicago America/Indiana/Tell_City America/Indiana/Knox America/Menominee America/North_Dakota/Center America/North_Dakota/New_Salem America/North_Dakota/Beulah America/Denver America/Boise America/Phoenix America/Los_Angeles America/Anchorage America/Juneau America/Sitka America/Metlakatla America/Yakutat America/Nome America/Adak Pacific/Honolulu",
			"UY|America/Montevideo",
			"UZ|Asia/Samarkand Asia/Tashkent",
			"VA|Europe/Rome Europe/Vatican",
			"VC|America/Port_of_Spain America/St_Vincent",
			"VE|America/Caracas",
			"VG|America/Port_of_Spain America/Tortola",
			"VI|America/Port_of_Spain America/St_Thomas",
			"VN|Asia/Bangkok Asia/Ho_Chi_Minh",
			"VU|Pacific/Efate",
			"WF|Pacific/Wallis",
			"WS|Pacific/Apia",
			"YE|Asia/Riyadh Asia/Aden",
			"YT|Africa/Nairobi Indian/Mayotte",
			"ZA|Africa/Johannesburg",
			"ZM|Africa/Maputo Africa/Lusaka",
			"ZW|Africa/Maputo Africa/Harare"
		]
	});


	return moment;
}));
//! moment.js locale configuration
//! locale : Urdu [ur]
//! author : Sawood Alam : https://github.com/ibnesayeed
//! author : Zack : https://github.com/ZackVision

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var months = [
            'جنوری',
            'فروری',
            'مارچ',
            'اپریل',
            'مئی',
            'جون',
            'جولائی',
            'اگست',
            'ستمبر',
            'اکتوبر',
            'نومبر',
            'دسمبر',
        ],
        days = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];

    var ur = moment.defineLocale('ur', {
        months: months,
        monthsShort: months,
        weekdays: days,
        weekdaysShort: days,
        weekdaysMin: days,
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD/MM/YYYY',
            LL: 'D MMMM YYYY',
            LLL: 'D MMMM YYYY HH:mm',
            LLLL: 'dddd، D MMMM YYYY HH:mm',
        },
        meridiemParse: /صبح|شام/,
        isPM: function (input) {
            return 'شام' === input;
        },
        meridiem: function (hour, minute, isLower) {
            if (hour < 12) {
                return 'صبح';
            }
            return 'شام';
        },
        calendar: {
            sameDay: '[آج بوقت] LT',
            nextDay: '[کل بوقت] LT',
            nextWeek: 'dddd [بوقت] LT',
            lastDay: '[گذشتہ روز بوقت] LT',
            lastWeek: '[گذشتہ] dddd [بوقت] LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: '%s بعد',
            past: '%s قبل',
            s: 'چند سیکنڈ',
            ss: '%d سیکنڈ',
            m: 'ایک منٹ',
            mm: '%d منٹ',
            h: 'ایک گھنٹہ',
            hh: '%d گھنٹے',
            d: 'ایک دن',
            dd: '%d دن',
            M: 'ایک ماہ',
            MM: '%d ماہ',
            y: 'ایک سال',
            yy: '%d سال',
        },
        preparse: function (string) {
            return string.replace(/،/g, ',');
        },
        postformat: function (string) {
            return string.replace(/,/g, '،');
        },
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return ur;

})));

// moment-timezone-localization for lang code: ur

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"عابدجان","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"اکّرا","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"عدیس ابابا","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"الجیئرس","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"اسمارا","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"بماکو","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"بنگوئی","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"بنجول","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"بِساؤ","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"بلینٹائر","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"برازاویلے","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"بجمبرا","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"قاہرہ","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"کیسا بلانکا","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"سیوٹا","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"کونکری","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"ڈکار","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"دار السلام","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"جبوتی","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"ڈوآلا","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"العیون","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"فری ٹاؤن","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"گبرون","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"ہرارے","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"جوہانسبرگ","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"جوبا","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"کیمپالا","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"خرطوم","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"کگالی","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"کنشاسا","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"لاگوس","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"لبرے ویلے","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"لوم","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"لوانڈا","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"لوبمباشی","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"لیوساکا","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"ملابو","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"مپوٹو","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"مسیرو","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"مبابین","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"موگادیشو","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"مونروویا","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"نیروبی","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"اینجامینا","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"نیامی","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"نواکشوط","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"اؤگاڈؤگوو","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"پورٹو نووو","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"ساؤ ٹوم","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"ٹریپولی","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"تیونس","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"ونڈہوک","id":"Africa/Windhoek"},{"value":"America/Adak","name":"اداک","id":"America/Adak"},{"value":"America/Anchorage","name":"اینکریج","id":"America/Anchorage"},{"value":"America/Anguilla","name":"انگویلا","id":"America/Anguilla"},{"value":"America/Antigua","name":"انٹیگوا","id":"America/Antigua"},{"value":"America/Araguaina","name":"اراگویانا","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"لا ریئوجا","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"ریو گالیگوس","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"سالٹا","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"سان جوآن","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"سان لوئس","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"ٹوکومین","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"اوشوآئیا","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"اروبا","id":"America/Aruba"},{"value":"America/Asuncion","name":"اسنسیئن","id":"America/Asuncion"},{"value":"America/Bahia","name":"باہیا","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"بہیا بندراز","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"بارباڈوس","id":"America/Barbados"},{"value":"America/Belem","name":"بیلیم","id":"America/Belem"},{"value":"America/Belize","name":"بیلائز","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"بلانک سبلون","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"بوآ وسٹا","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"بگوٹا","id":"America/Bogota"},{"value":"America/Boise","name":"بوائس","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"بیونس آئرس","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"کیمبرج کی کھاڑی","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"کیمپو گرینڈ","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"کنکیون","id":"America/Cancun"},{"value":"America/Caracas","name":"کراکاس","id":"America/Caracas"},{"value":"America/Catamarca","name":"کیٹامارکا","id":"America/Catamarca"},{"value":"America/Cayenne","name":"کائین","id":"America/Cayenne"},{"value":"America/Cayman","name":"کیمین","id":"America/Cayman"},{"value":"America/Chicago","name":"شکاگو","id":"America/Chicago"},{"value":"America/Chihuahua","name":"چیہوآہوآ","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"اٹیکوکن","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"کورڈوبا","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"کوسٹا ریکا","id":"America/Costa_Rica"},{"value":"America/Creston","name":"کریسٹون","id":"America/Creston"},{"value":"America/Cuiaba","name":"کوئیابا","id":"America/Cuiaba"},{"value":"America/Curacao","name":"کیوراکاؤ","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"ڈنمارک شاون","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"ڈاؤسن","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"ڈاؤسن کریک","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"ڈینور","id":"America/Denver"},{"value":"America/Detroit","name":"ڈیٹرائٹ","id":"America/Detroit"},{"value":"America/Dominica","name":"ڈومنیکا","id":"America/Dominica"},{"value":"America/Edmonton","name":"ایڈمونٹن","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"ایرونیپ","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"ال سلواڈور","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"فورٹ نیلسن","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"فورٹالیزا","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"گلیس کی کھاڑی","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"نوک","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"گوس کی کھاڑی","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"عظیم ترک","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"غرناطہ","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"گواڈیلوپ","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"گواٹے مالا","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"گوآیاکوئل","id":"America/Guayaquil"},{"value":"America/Guyana","name":"گیانا","id":"America/Guyana"},{"value":"America/Halifax","name":"ہیلیفیکس","id":"America/Halifax"},{"value":"America/Havana","name":"ہوانا","id":"America/Havana"},{"value":"America/Hermosillo","name":"ہرموسیلو","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"کنوکس، انڈیانا","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"مرینگو، انڈیانا","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"پیٹرزبرگ، انڈیانا","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"ٹیل سٹی، انڈیانا","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"ویوے، انڈیانا","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"ونسینیز، انڈیانا","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"وینامیک، انڈیانا","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"انڈیاناپولس","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"انووِک","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"ایکالوئٹ","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"جمائیکا","id":"America/Jamaica"},{"value":"America/Jujuy","name":"جوجوئی","id":"America/Jujuy"},{"value":"America/Juneau","name":"جونیئو","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"مونٹیسیلو، کینٹوکی","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"کرالینڈیجک","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"لا پاز","id":"America/La_Paz"},{"value":"America/Lima","name":"لیما","id":"America/Lima"},{"value":"America/Los_Angeles","name":"لاس اینجلس","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"لوئس ویلے","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"لوور پرنسس کوارٹر","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"میسیئو","id":"America/Maceio"},{"value":"America/Managua","name":"مناگوآ","id":"America/Managua"},{"value":"America/Manaus","name":"مناؤس","id":"America/Manaus"},{"value":"America/Marigot","name":"میریگوٹ","id":"America/Marigot"},{"value":"America/Martinique","name":"مارٹینک","id":"America/Martinique"},{"value":"America/Matamoros","name":"میٹاموروس","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"میزٹلان","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"مینڈوزا","id":"America/Mendoza"},{"value":"America/Menominee","name":"مینومینی","id":"America/Menominee"},{"value":"America/Merida","name":"میریڈا","id":"America/Merida"},{"value":"America/Metlakatla","name":"میٹلا کاٹلا","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"میکسیکو سٹی","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"میکلیئون","id":"America/Miquelon"},{"value":"America/Moncton","name":"مونکٹن","id":"America/Moncton"},{"value":"America/Monterrey","name":"مونٹیری","id":"America/Monterrey"},{"value":"America/Montevideo","name":"مونٹی ویڈیو","id":"America/Montevideo"},{"value":"America/Montserrat","name":"مونٹسیراٹ","id":"America/Montserrat"},{"value":"America/Nassau","name":"نساؤ","id":"America/Nassau"},{"value":"America/New_York","name":"نیو یارک","id":"America/New_York"},{"value":"America/Nipigon","name":"نپیگون","id":"America/Nipigon"},{"value":"America/Nome","name":"نوم","id":"America/Nome"},{"value":"America/Noronha","name":"نورونہا","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"بیولاہ، شمالی ڈکوٹا","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"وسط، شمالی ڈکوٹا","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"نیو سلیم، شمالی ڈکوٹا","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"اوجیناگا","id":"America/Ojinaga"},{"value":"America/Panama","name":"پنامہ","id":"America/Panama"},{"value":"America/Pangnirtung","name":"پینگنِرٹنگ","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"پراماریبو","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"فینکس","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"پورٹ او پرنس","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"پورٹ آف اسپین","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"پورٹو ویلہو","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"پیورٹو ریکو","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"پنٹا یریناس","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"رینی ریور","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"رینکن انلیٹ","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"ریسائف","id":"America/Recife"},{"value":"America/Regina","name":"ریجینا","id":"America/Regina"},{"value":"America/Resolute","name":"ریزولیوٹ","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"ریئو برینکو","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"سانتا ایزابیل","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"سنٹارین","id":"America/Santarem"},{"value":"America/Santiago","name":"سنٹیاگو","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"سانتو ڈومنگو","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"ساؤ پالو","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"اسکورز بائی سنڈ","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"سیٹکا","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"سینٹ برتھیلمی","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"سینٹ جانز","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"سینٹ کٹس","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"سینٹ لوسیا","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"سینٹ تھامس","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"سینٹ ونسنٹ","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"سوِفٹ کرنٹ","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"ٹیگوسیگالپے","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"تھولو","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"تھنڈر بے","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"تیجوآنا","id":"America/Tijuana"},{"value":"America/Toronto","name":"ٹورنٹو","id":"America/Toronto"},{"value":"America/Tortola","name":"ٹورٹولا","id":"America/Tortola"},{"value":"America/Vancouver","name":"وینکوور","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"وہائٹ ہارس","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"ونّیپیگ","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"یکوٹیٹ","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"ایلو نائف","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"کیسی","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"ڈیوس","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"ڈومونٹ ڈی ارویلے","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"میکواری","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"ماؤسن","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"میک مرڈو","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"پلمیر","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"روتھیرا","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"سیووا","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"ٹرول","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"ووستوک","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"لانگ ایئر بین","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"عدن","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"الماٹی","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"امّان","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"انیدر","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"اکتاؤ","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"اکٹوب","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"اشغبت","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"آتیراؤ","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"بغداد","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"بحرین","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"باکو","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"بنکاک","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"برنال","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"بیروت","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"بشکیک","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"برونئی","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"کولکاتا","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"چیتا","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"چوئبالسان","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"کولمبو","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"دمشق","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"ڈھاکہ","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"ڈلی","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"دبئی","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"دوشانبے","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"فاماگوسٹا","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"غزہ","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"ہیبرون","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"ہانگ کانگ","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"ہووارڈ","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"ارکتسک","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"جکارتہ","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"جے پورہ","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"یروشلم","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"کابل","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"کیمچٹکا","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"کراچی","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"کاٹھمنڈو","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"خندیگا","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"کریسنویارسک","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"کوالا لمپور","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"کیوچنگ","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"کویت","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"مکاؤ","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"میگیدن","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"مکاسر","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"منیلا","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"مسقط","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"نکوسیا","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"نوووکیوزنیسک","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"نوووسِبِرسک","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"اومسک","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"اورال","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"پنوم پن","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"پونٹیانک","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"پیونگ یانگ","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"قطر","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"کیزیلورڈا","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"رنگون","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"ریاض","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"ہو چی منہ سٹی","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"سخالین","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"سمرقند","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"سیئول","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"شنگھائی","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"سنگاپور","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"سرہدنیکولیمسک","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"تائپے","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"تاشقند","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"طبلیسی","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"تہران","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"تھمپو","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"ٹوکیو","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"ٹامسک","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"اولان باتار","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"یورومکی","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"اوست-نیرا","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"وینٹیانا","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"ولادی ووستک","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"یکوتسک","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"یکاٹیرِنبرگ","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"یریوان","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"ازوریس","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"برمودا","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"کینری","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"کیپ ورڈی","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"فارو","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"مڈیئرا","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"ریکجاوک","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"جنوبی جارجیا","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"سینٹ ہیلینا","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"اسٹینلے","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"اڈیلائڈ","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"برسبین","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"بروکن ہِل","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"کیوری","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"ڈارون","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"ایوکلا","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"ہوبارٹ","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"لِنڈمین","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"لارڈ ہووے","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"ملبورن","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"پرتھ","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"سڈنی","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"کوآرڈینیٹڈ یونیورسل ٹائم","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"ایمسٹرڈم","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"انڈورا","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"استراخان","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"ایتھنز","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"بلغراد","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"برلن","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"بریٹِسلاوا","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"برسلز","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"بخارسٹ","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"بڈاپسٹ","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"بزنجن","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"چیسیناؤ","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"کوپن ہیگن","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"آئرش اسٹینڈرڈ ٹائمڈبلن","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"جبل الطارق","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"گرنزی","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"ہیلسنکی","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"آئل آف مین","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"استنبول","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"جرسی","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"کالينينغراد","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"کیوو","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"کیروف","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"لسبن","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"لیوبلیانا","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"برٹش سمر ٹائملندن","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"لگژمبرگ","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"میڈرڈ","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"مالٹا","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"میریہام","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"مِنسک","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"موناکو","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"ماسکو","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"اوسلو","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"پیرس","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"پوڈگورسیا","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"پراگ","id":"Europe/Prague"},{"value":"Europe/Riga","name":"ریگا","id":"Europe/Riga"},{"value":"Europe/Rome","name":"روم","id":"Europe/Rome"},{"value":"Europe/Samara","name":"سمارا","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"سان ماریانو","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"سراجیوو","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"سیراٹو","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"سمفروپول","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"اسکوپجے","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"صوفیہ","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"اسٹاک ہوم","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"ٹالن","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"ٹیرانی","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"الیانوسک","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"ازگوروڈ","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"ویڈوز","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"واٹیکن","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"ویانا","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"وِلنیئس","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"وولگوگراد","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"وارسا","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"زیگریب","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"زیپوروزائی","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"زیورخ","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"انٹاناناریوو","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"چاگوس","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"کرسمس","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"کوکوس","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"کومورو","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"کرگیولین","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"ماہی","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"مالدیپ","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"ماریشس","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"مایوٹ","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"ری یونین","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"اپیا","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"آکلینڈ","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"بوگینولے","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"چیتھم","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"ایسٹر","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"ایفیٹ","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"اینڈربری","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"فکاؤفو","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"فجی","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"فیونافیوٹی","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"گیلاپیگوس","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"گامبیئر","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"گواڈل کینال","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"گوآم","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"ہونولولو","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"جانسٹن","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"کریتیماٹی","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"کوسرائی","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"کواجیلین","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"مجورو","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"مارکیساس","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"مڈوے","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"ناؤرو","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"نیئو","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"نورفوک","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"نؤمیا","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"پاگو پاگو","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"پلاؤ","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"پٹکائرن","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"پونپیئی","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"پورٹ موریسبی","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"راروٹونگا","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"سائپین","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"تاہیتی","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"ٹراوا","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"ٹونگاٹاپو","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"چیوک","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"ویک","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"ولّیس","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

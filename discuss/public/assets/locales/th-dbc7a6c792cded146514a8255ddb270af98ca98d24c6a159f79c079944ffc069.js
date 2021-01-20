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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["th"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.th = function ( n ) {
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

I18n.translations = {"th":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"other":"ไบต์"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}พัน","millions":"%{number}ล้าน"}},"dates":{"time":"h:mm a","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"MMM D","full_no_year_no_time":"MMMM Do","long_with_year":"MMM D, YYYY h:mm a","long_with_year_no_time":"MMM D, YYYY","full_with_year_no_time":"MMMM Do, YYYY","long_date_with_year":"MMM D, 'YY LT","long_date_without_year":"MMM D, LT","long_date_with_year_without_time":"MMM D, 'YY","long_date_without_year_with_linebreak":"MMM D \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"MMM D, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} วันก่อน","tiny":{"half_a_minute":"\u003c 1 นาที","less_than_x_seconds":{"other":"\u003c %{count} วินาที"},"x_seconds":{"other":"%{count} วินาที"},"less_than_x_minutes":{"other":"%{count}นาที"},"x_minutes":{"other":"%{count} นาที"},"about_x_hours":{"other":"%{count} ชั่วโมง"},"x_days":{"other":"%{count} วัน"},"x_months":{"other":"%{count}เดือน"},"about_x_years":{"other":"%{count} ปี"},"over_x_years":{"other":"\u003e %{count} ปี"},"almost_x_years":{"other":"%{count} ปี"},"date_month":"MMM D","date_year":"MMM 'YY"},"medium":{"x_minutes":{"other":"%{count} นาที"},"x_hours":{"other":"%{count} ชั่วโมง"},"x_days":{"other":"%{count} วัน"},"date_year":"MMM D, 'YY"},"medium_with_ago":{"x_minutes":{"other":"%{count} นาทีที่แล้ว"},"x_hours":{"other":"%{count} ชั่วโมงที่แล้ว"},"x_days":{"other":"%{count} วันที่แล้ว"},"x_months":{"other":"%{count}เดือนที่แล้ว"},"x_years":{"other":"%{count}ปีที่แล้ว"}},"later":{"x_days":{"other":"%{count} วันหลังจากนี้"},"x_months":{"other":"%{count} เดือนหลังจากนี้"},"x_years":{"other":"%{count} ปีหลังจากนี้"}},"previous_month":"เดือนที่แล้ว","next_month":"เดือนถัดไป","placeholder":"วัน"},"share":{"topic_html":"กระทู้: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"โพสต์ #%{postNumber}","close":"ปิด"},"action_codes":{"public_topic":"ทำให้กระทู้นี้เป็นสาธารณะ %{when} ","private_topic":"ทำให้กระทู้นี้เป็นข้อความส่วนตัว","split_topic":"แบ่งกระทู้นี้เมื่อ %{when}","invited_user":"ได้เชิญ %{who} %{when}","invited_group":"ได้เชิญ %{who} %{when}","user_left":"%{who}ลบตัวเองออกจากข้อความนี้%{when}","removed_user":"ลบ %{who} %{when}","removed_group":"ลบ %{who} %{when}","autoclosed":{"enabled":"ปิดเมื่อ %{when}","disabled":"เปิดเมื่อ %{when}"},"closed":{"enabled":"ปิดเมื่อ %{when}","disabled":"เปิดเมื่อ %{when}"},"archived":{"enabled":"ถูกเก็บเข้าคลังเมื่อ %{when}","disabled":"ถูกเอาออกจากคลังเมื่อ %{when}"},"pinned":{"enabled":"ถูกปักหมุดเมื่อ %{when}","disabled":"ถูกปลดหมุดเมื่อ %{when}"},"pinned_globally":{"enabled":"ถูกปักหมุดแบบรวมเมื่อ %{when}","disabled":"ถูกปลดหมุดเมื่อ %{when}"},"visible":{"enabled":"ถูกแสดงเมื่อ %{when}","disabled":"ถูกซ่อนเมื่อ %{when}"},"banner":{"enabled":"ทำให้เป็นแบนเนอร์%{when} จะปรากฏที่ด้านบนสุดของทุกหน้าจนกว่าจะผู้ใช้งานจะกดลบ","disabled":"ลบแบนเนอร์นี้%{when} จะไม่ปรากฏที่ด้านบนของหน้าใดๆ"},"forwarded":"ส่งต่ออีเมลข้างต้นแล้ว"},"emails_are_disabled":"อีเมลขาออกทั้งหมดถูกปิดโดยผู้ดูแลระบบ จะไม่มีอีเมลแจ้งเตือนใดๆถูกส่งออกไป","themes":{"default_description":"ค่าเริ่มต้น"},"s3":{"regions":{"ap_northeast_1":"เอเชียแปซิฟิก (โตเกียว)","ap_northeast_2":"เอเชียแปซิฟิก (โซล)","ap_south_1":"เอเชียแปซิฟิก (มุมไบ)","ap_southeast_1":"เอเชียแปซิฟิก (สิงคโปร์)","ap_southeast_2":"เอเชียแปซิฟิก (ซิดนีย์)","ca_central_1":"แคนาดา (กลาง)","cn_north_1":"จีน (ปักกิ่ง)","cn_northwest_1":"จีน (หนิงเซี่ย)","eu_central_1":"อียู (แฟรงก์เฟิร์ต)","eu_north_1":"อียู (สต็อกโฮล์ม)","eu_west_1":"อียู (ไอร์แลนด์)","eu_west_2":"อียู (ลอนดอน)","eu_west_3":"อียู (ปารีส)","sa_east_1":"อเมริกาใต้ (เซาเปาโล)","us_east_1":"สหรัฐอเมริกาฝั่งตะวันออก (เวอร์จิเนียเหนือ)","us_east_2":"สหรัฐอเมริกาฝั่งตะวันออก (โอไฮโอ)","us_gov_east_1":"AWS GovCloud (สหรัฐอเมริกาฝั่งตะวันออก)","us_gov_west_1":"AWS GovCloud (สหรัฐอเมริกาฝั่งตะวันตก)","us_west_1":"สหรัฐอเมริกาฝั่งตะวันตก (แคลิฟอร์เนียเหนือ)","us_west_2":"สหรัฐอเมริกาฝั่งตะวันตก (ออริกอน)"}},"edit":"แก้ไขหัวข้อและหมวดหมู่ของกระทู้นี้","expand":"ขยาย","not_implemented":"ขออภัย! คุณสมบัตินั้นยังไม่เสร็จสมบูรณ์","no_value":"ไม่ใช่","yes_value":"ใช่","submit":"ตกลง","generic_error":"ขออภัย เกิดข้อผิดพลาดขึ้น","generic_error_with_reason":"เกิดข้อผิดพลาดขึ้น: %{error}","go_ahead":"ไปต่อ","sign_up":"สมัครสมาชิก","log_in":"เข้าสู่ระบบ","age":"อายุ","joined":"เข้าร่วมแล้ว","admin_title":"ผู้ดูแลระบบ","show_more":"แสดงเพิ่มเติม","show_help":"ตัวเลือก","links":"ลิงก์","links_lowercase":{"other":"ลิงก์"},"faq":"คำถามที่พบบ่อย","guidelines":"คู่มือ","privacy_policy":"นโยบายความเป็นส่วนตัว","privacy":"ความเป็นส่วนตัว","tos":"เงื่อนไขการบริการ","rules":"กฎ","conduct":"กฎเกณฑ์และเงื่อนไข","mobile_view":"ดูแบบอุปกรณ์เคลื่อนที่","desktop_view":"ดูแบบเดสก์ท็อป","you":"คุณ","or":"หรือ","now":"ขณะนี้","read_more":"อ่านเพิ่มเติม","more":"เพิ่มเติม","less":"น้อย","never":"ไม่เคย","every_30_minutes":"ทุก 30 นาที","every_hour":"ทุกชั่วโมง","daily":"ทุกวัน","weekly":"รายสัปดาห์","every_month":"ทุกเดือน","every_six_months":"ทุกหกเดือน","max_of_count":"สูงสุดของ %{count}","alternation":"หรือ","character_count":{"other":"%{count} ตัวอักษร"},"related_messages":{"title":"ข้อความที่เกี่ยวข้อง","see_all":"ดู\u003ca href=\"%{path}\"\u003eข้อความทั้งหมด\u003c/a\u003eจาก @%{username}"},"suggested_topics":{"title":"กระทู้แนะนำ","pm_title":"ข้อความแนะนำ"},"about":{"simple_title":"เกี่ยวกับ","title":"เกี่ยวกับ %{title}","stats":"สถิติเว็บไซต์","our_admins":"แอดมินของเรา","our_moderators":"ผู้ดูแลของเรา","moderators":"ผู้ดูแล","stat":{"all_time":"ตลอดเวลา","last_7_days":"7 วันที่ผ่านมา","last_30_days":"30 วันที่ผ่านมา"},"like_count":"ถูกใจ","topic_count":"กระทู้","post_count":"โพสต์","user_count":"ผู้ใช้","active_user_count":"ผู้ใช้ที่ใช้งานอยู่","contact":"ติดต่อเรา","contact_info":"ในกรณีที่เกิดเหตุฉุกเฉินหรือประเด็นสำคัญที่ส่งผลต่อเว็บไซต์นี้ กรุณาติดต่อเราที่ %{contact_info}"},"bookmarked":{"title":"บุ๊กมาร์ก","clear_bookmarks":"ล้างบุ๊กมาร์ก","help":{"bookmark":"คลิกเพื่อ บุ๊คมาร์ค ที่โพสแรกของกระทู้นี้","unbookmark":"คลิกเพื่อลบบุ๊กมาร์กทั้งหมดในกระทู้นี้"}},"bookmarks":{"not_bookmarked":"บุ๊กมาร์กโพสต์นี้","remove":"ลบบุ๊กมาร์ก","delete":"ลบบุ๊กมาร์ก","confirm_clear":"คุณแน่ใจหรือว่าต้องการล้างบุ๊กมาร์กทั้งหมดจากกระทู้นี้","save":"บันทึก","invalid_custom_datetime":"วันและเวลาที่คุณกรอกไม่ถูกต้อง กรุณาลองอีกครั้ง","list_permission_denied":"คุณไม่ได้รับอนุญาตให้ดูบุ๊กมาร์กของผู้ใช้งานนี้","auto_delete_preference":{"label":"ลบโดยอัตโนมัติ","never":"ไม่เคย","on_owner_reply":"หลังจากฉันตอบกลับกระทู้นี้"},"search":"ค้นหา","reminders":{"later_today":"ภายหลังในวันนี้","next_business_day":"ในวันทำการถัดไป","tomorrow":"พรุ่งนี้","next_week":"สัปดาห์หน้า","later_this_week":"ภายหลังในสัปดาห์นี้","start_of_next_business_week":"วันจันทร์","start_of_next_business_week_alt":"วันจันทร์หน้า","next_month":"เดือนหน้า","custom":"วันและเวลาที่กำหนดเอง","last_custom":"ล่าสุด","today_with_time":"วันนี้ตอน%{time}","tomorrow_with_time":"พรุ่งนี้ตอน%{time}","at_time":"เมื่อ%{date_time}"}},"copy_codeblock":{"copied":"คัดลอกแล้ว!"},"drafts":{"resume":"ดำเนินการต่อ","remove":"ลบ","new_topic":"แบบร่างกระทู้ใหม่","new_private_message":"แบบร่างข้อความส่วนตัวใหม่","topic_reply":"ตอบแบบร่าง","abandon":{"confirm":"คุณได้เปิดแบบร่างอื่นในกระทู้นี้แล้ว แน่ใจหรือว่าต้องการละทิ้งมัน","yes_value":"ใช่ ละทิ้ง","no_value":"ไม่ เก็บไว้"}},"topic_count_latest":{"other":"ดู %{count} กระทู้ใหม่หรือที่อัปเดต"},"topic_count_unread":{"other":"ดู%{count}กระทู้ที่ยังไม่ได้อ่าน"},"topic_count_new":{"other":"ดู%{count}กระทู้ใหม่"},"preview":"แสดงตัวอย่าง","cancel":"ยกเลิก","save":"บันทึกการเปลี่ยนแปลง","saving":"กำลังบันทึก...","saved":"บันทึกแล้ว!","upload":"อัปโหลด","uploading":"กำลังอัปโหลด...","uploading_filename":"กำลังอัปโหลด: %{filename} ...","clipboard":"คลิปบอร์ด","uploaded":"อัปโหลดแล้ว!","pasting":"วาง...","enable":"เปิดใช้งาน","disable":"ปิดใช้งาน","continue":"ดำเนินการต่อ","undo":"เลิกทำ","revert":"ย้อนกลับ","failed":"ล้มเหลว","switch_to_anon":"เข้าสู่โหมดไม่ระบุชื่อ","switch_from_anon":"ออกจากโหมดไม่ระบุชื่อ","banner":{"close":"ปิดแบนเนอร์นี้","edit":"แก้ไขแบนเนอร์นี้ \u003e\u003e"},"pwa":{"install_banner":"คุณต้องการ\u003ca href\u003eติดตั้ง%{title}บนอุปกรณ์นี้ใช่ไหม\u003c/a\u003e"},"choose_topic":{"none_found":"ไม่พบกระทู้ใดๆ","title":{"search":"ค้นหากระทู้","placeholder":"ระบุหัวข้อกระทู้ หมายเลข หรือ url ที่นี่ "}},"choose_message":{"none_found":"ไม่พบข้อความ","title":{"search":"ค้นหาข้อความ","placeholder":"ระบุหัวข้อข้อความ หมายเลข หรือ url ที่นี่ "}},"review":{"order_by":"สั่งโดย","in_reply_to":"ตอบไปยัง","explain":{"total":"ทั้งหมด","trust_level_bonus":{"name":"ระดับความไว้ใจ"}},"awaiting_approval":"กำลังรอการยืนยัน","delete":"ลบ","settings":{"saved":"บันทึกแล้ว","save_changes":"บันทึกการเปลี่ยนแปลง","title":"การตั้งค่า"},"view_all":"ดูทั้งหมด","grouped_by_topic":"จัดกลุ่มโดยหมวดหมู่","topic_has_pending":{"other":"กระทู้นี้มี\u003cb\u003e%{count}\u003c/b\u003eโพสต์ที่กำลังรอการอนุมัติ"},"title":"รีวิว","topic":"กระทู้:","filtered_user":"ผู้ใช้","show_all_topics":"แสดงกระทู้ทั้งหมด","deleted_post":"(โพสต์ถูกลบ)","deleted_user":"(ผู้ใช้ถูกลบ)","user":{"website":"เว็บไซต์","username":"ชื่อผู้ใช้","email":"อีเมล","name":"ชื่อ"},"user_percentage":{"agreed":{"other":"%{count}% เห็นด้วย"},"disagreed":{"other":"%{count} % ไม่เห็นด้วย"},"ignored":{"other":"%{count} % ไม่สนใจ"}},"topics":{"topic":"หัวข้อ","deleted":"[กระทู้ถูกลบ]","original":"(กระทู้ต้นฉบับ)","details":"รายละเอียด","unique_users":{"other":"%{count} ผู้ใช้"}},"replies":{"other":"%{count} ตอบ"},"edit":"แก้ไข","save":"บันทึก","cancel":"ยกเลิก","filters":{"all_categories":"(หมวดหมู่ทั้งหมด)","type":{"title":"ชนิด","all":"(ทุกประเภท)"},"minimum_score":"คะแนนขั้นต่ำ:","refresh":"รีเฟรช","status":"สถานะ","category":"หมวดหมู่","orders":{"score":"คะแนน","created_at":"ถูกสร้างเมื่อ"},"priority":{"medium":"ปานกลาง","high":"สูง"}},"conversation":{"view_full":"ดูบทสนทนาทั้งหมด"},"scores":{"score":"คะแนน","date":"วันที่","type":"ชนิด","status":"สถานะ","submitted_by":"ยืนยันโดย","reviewed_by":"รีวิวโดย"},"statuses":{"pending":{"title":"อยู่ระหว่างการพิจารณา"},"approved":{"title":"อนุมัติ"},"rejected":{"title":"ปฏิเสธ"},"ignored":{"title":"ละเว้น"},"deleted":{"title":"ลบ"},"reviewed":{"title":"(ถูกรีวิวทั้งหมด)"},"all":{"title":"(ทุกสิ่ง)"}},"types":{"reviewable_flagged_post":{"title":"โพสต์ที่ถูกปักธง","flagged_by":"ถูกปักธงโดย"},"reviewable_user":{"title":"ผู้ใช้"}},"approval":{"title":"โพสต์นี้ต้องได้รับการอนุมัติ","description":"เราได้รับโพสต์ใหม่ของคุณแล้ว แต่ต้องได้รับการอนุมัติจากผู้ดูแลก่อนถึงจะปรากฏขึ้น กรุณารอสักครู่","pending_posts":{"other":"คุณมี\u003cstrong\u003e%{count}\u003c/strong\u003eโพสต์ที่กำลังรอการยืนยัน"},"ok":"ตกลง"}},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e โพสต์ \u003ca href='%{topicUrl}'\u003eกระทู้\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eคุณ\u003c/a\u003e โพสต์ \u003ca href='%{topicUrl}'\u003eกระทู้\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e ตอบกลับ \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eคุณ\u003c/a\u003e ตอบกลับ \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e ตอบกลับ \u003ca href='%{topicUrl}'\u003eกระทู้\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eคุณ\u003c/a\u003e ตอบกลับ \u003ca href='%{topicUrl}'\u003eกระทู้\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e พูดถึง \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e พูดถึง \u003ca href='%{user2Url}'\u003eคุณ\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eคุณ\u003c/a\u003e พูดถึง \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"โพสต์โดย \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"โพสต์โดย \u003ca href='%{userUrl}'\u003eคุณ\u003c/a\u003e","sent_by_user":"ถูกส่งโดย \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"ถูกส่งโดย \u003ca href='%{userUrl}'\u003eคุณ\u003c/a\u003e"},"directory":{"filter_name":"กรองด้วยชื่อผู้ใช้","title":"ผู้ใช้","likes_given":"ให้","likes_received":"รับ","topics_entered":"ดู","topics_entered_long":"กระทู้ที่ดู","time_read":"เวลาที่อ่าน","topic_count":"กระทู้","topic_count_long":"กระทู้ถูกสร้าง","post_count":"ตอบ","post_count_long":"คำตอบถูกโพสต์แล้ว","no_results":"ไม่พบผลการค้นหา","days_visited":"เยี่ยมชม","days_visited_long":"วันที่เยี่ยมชม","posts_read":"อ่าน","posts_read_long":"โพสต์ถูกอ่าน","last_updated":"อัปเดตล่าสุด:","total_rows":{"other":"%{count} ผู้ใช้"}},"group_histories":{"actions":{"change_group_setting":"แก้ไขการตั้งค่ากลุ่ม","add_user_to_group":"เพิ่มผู้ใช้","remove_user_from_group":"ลบผู้ใช้","make_user_group_owner":"ตั้งเป็นเจ้าของ"}},"groups":{"member_added":"เพิ่ม","member_requested":"ร้องขอเมื่อ","requests":{"title":"คำร้องขอ","reason":"เหตุผล","accept":"ยอมรับ","accepted":"ยอมรับแล้ว","deny":"ปฏิเสธ","denied":"ปฏิเสธแล้ว"},"manage":{"title":"จัดการ","name":"ชื่อ","full_name":"ชื่อ-นามสกุล","add_members":"เพิ่มสมาชิก","delete_member_confirm":"ลบ '%{username}' ออกจากกลุ่ม '%{group}' ใช่ไหม","profile":{"title":"โปรไฟล์"},"interaction":{"posting":"กำลังโพสต์","notification":"การแจ้งเตือน"},"email":{"title":"อีเมล","credentials":{"username":"ชื่อผู้ใช้","password":"รหัสผ่าน"}},"membership":{"title":"การเป็นสมาชิก","access":"การเข้าถึง"},"logs":{"when":"เมื่อ","acting_user":"ผู้ใช้ชั่วคราว","target_user":"ผู้ใช้เป้าหมาย","subject":"หัวข้อ","details":"รายละเอียด","from":"จาก","to":"ถึง"}},"public_exit":"อนุญาตให้ผู้ใช้ออกจากกลุ่มอย่างอิสระ","empty":{"posts":"ไม่มีโพสต์โดยสมาชิกของกลุ่มนี้","members":"ไม่มีสมาชิกในกลุ่มนี้","requests":"ไม่มีคำร้องขอเป็นสมาชิกของกลุ่มนี้","mentions":"ไม่มีการกล่าวถึงของกลุ่มนี้","messages":"ไม่มีข้อความสำหรับกลุ่มนี้","topics":"ไม่มีกระทู้โดยสมาชิกของกลุ่มนี้"},"add":"เพิ่ม","join":"เข้าร่วม","leave":"ออก","request":"ร้องขอ","message":"ข้อความ\u003cbr\u003e\u003cdiv\u003e\u003cbr data-mce-bogus=\"1\"\u003e\u003c/div\u003e","confirm_leave":"คุณแน่ใจหรือว่าต้องการออกจากกลุ่มนี้","membership_request":{"submit":"ส่งคำร้องขอ","title":"ขอเข้าร่วม @%{group_name}","reason":"บอกให้เจ้าของกลุ่มทราบว่าทำไมคุณถึงเหมาะสมกับกลุ่มนี้"},"membership":"การเป็นสมาชิก","name":"ชื่อ","group_name":"ชื่อกลุ่ม","user_count":"ผู้ใช้","bio":"เกี่ยวกับกลุ่ม","selector_placeholder":"กรอกชื่อผู้ใช้","owner":"เจ้าของ","index":{"title":"กลุ่ม","all":"ทุกกลุ่ม","empty":"ไม่มีกลุ่มที่เห็นได้","owner_groups":"กลุ่มที่ฉันเป็นเจ้าของ","close_groups":"กลุ่มปิด","automatic_groups":"กลุ่มอัตโนมัติ","automatic":"อัตโนมัติ","closed":"ปิด","public":"สาธารณะ","private":"ส่วนตัว","public_groups":"กลุ่มสาธารณะ","automatic_group":"กลุ่มอัตโนมัติ","close_group":"กลุ่มปิด","my_groups":"กลุ่มของฉัน","group_type":"ประเภทกลุ่ม","is_group_user":"สมาชิก","is_group_owner":"เจ้าของ"},"title":{"other":"กลุ่ม"},"activity":"กิจกรรม","members":{"title":"สมาชิก","filter_placeholder_admin":"ชื่อผู้ใช้หรืออีเมล","filter_placeholder":"ชื่อผู้ใช้","remove_member":"ลบสมาชิก","remove_member_description":"ลบ\u003cb\u003e%{username}\u003c/b\u003eออกจากกลุ่มนี้","make_owner":"แต่งตั้งเจ้าของ","make_owner_description":"แต่งตั้ง\u003cb\u003e%{username}\u003c/b\u003eเป็นเจ้าของกลุ่มนี้","remove_owner":"ลบในสถานะเจ้าของ","remove_owner_description":"ลบ\u003cb\u003e%{username}\u003c/b\u003eในสถานะเจ้าของกลุ่มนี้","owner":"เจ้าของ","forbidden":"คุณไม่ได้รับอนุญาตให้ดูสมาชิก"},"topics":"กระทู้","posts":"โพสต์","mentions":"กล่าวถึง","messages":"ข้อความ","alias_levels":{"mentionable":"ใครสามารถ @กล่าวถึงกลุ่มนี้ได้","messageable":"ใครสามารถส่งข้อความในกลุ่มนี้ได้","nobody":"ไม่มีใคร","only_admins":"เฉพาะแอดมิน","mods_and_admins":"เฉพาะผู้ดูแลระบบและแอดมิน","members_mods_and_admins":"เฉพาะสมาชิกกลุ่ม ผู้ดูแลระบบและแอดมิน","owners_mods_and_admins":"เฉพาะเจ้าของกลุ่ม ผู้ดูแลระบบ และแอดมินเท่านั้น","everyone":"ทุกคน"},"notifications":{"watching":{"title":"กำลังดู","description":"คุณจะถูกแจ้งเตือนทุกๆโพสต์ใหม่ในทุกๆข้อความ และจำนวนของคำตอบใหม่จะถูกแสดง"},"watching_first_post":{"title":"กำลังดูโพสต์แรก","description":"คุณจะได้รับการแจ้งเตือนเมื่อมีข้อความใหม่ในกลุ่มนี้ ยกเว้นคำตอบของข้อความเหล่านั้น"},"tracking":{"title":"กำลังติดตาม","description":"คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ และจำนวนของคำตอบใหม่จะถูกแสดง"},"regular":{"title":"ปกติ","description":"คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ"},"muted":{"title":"ปิด","description":"คุณจะไม่ได้รับการแจ้งเตือนใดๆเกี่ยวกับข้อความในกลุ่มนี้"}},"flair_upload_description":"ใช้รูปสี่เหลี่ยมไม่เล็กกว่า 20 พิกเซล x 20 พิกเซล","flair_preview_icon":"ไอคอนตัวอย่าง","flair_preview_image":"รูปภาพตัวอย่าง","flair_type":{"icon":"เลือกไอคอน","image":"อัปโหลดรูปภาพ"}},"user_action_groups":{"1":"ถูกใจ","2":"ถูกใจ","3":"บุ๊กมาร์ก","4":"กระทู้","5":"ตอบ","6":"ตอบสนอง","7":"กล่าวถึง","9":"อ้างอิง","11":"แก้ไข","12":"รายการที่ส่งแล้ว","13":"กล่องข้อความ","14":"อยู่ระหว่างการพิจารณา","15":"แบบร่าง"},"categories":{"all":"ทุกหมวดหมู่","all_subcategories":"ทั้งหมด","no_subcategory":"ไม่มี","category":"หมวดหมู่","category_list":"แสดงรายชื่อหมวดหมู่","reorder":{"title":"เรียงหมวดหมู่ใหม่","title_long":"จัดการรายชื่อหมวดหมู่ใหม่","save":"บันทึกคำสั่ง","apply_all":"นำไปใช้","position":"ตำแหน่ง"},"posts":"โพสต์","topics":"กระทู้","latest":"ล่าสุด","latest_by":"ล่าสุดโดย","toggle_ordering":"เปลี่ยนวิธีการจัดลำดับ","subcategories":"หมวดหมู่ย่อย","topic_sentence":{"other":"%{count}กระทู้"},"topic_stat_sentence_week":{"other":"%{count}กระทู้ใหม่ในสัปดาห์ที่ผ่านมา"},"topic_stat_sentence_month":{"other":"%{count}กระทู้ใหม่ในเดือนที่ผ่านมา"}},"ip_lookup":{"title":"มองหาที่อยู่ไอพี","hostname":"ชื่อโฮสต์","location":"สถานที่","location_not_found":"(ไม่ทราบ)","organisation":"องค์กร","phone":"โทรศัพท์","other_accounts":"บัญชีอื่นที่ใช้ไอพีนี้","delete_other_accounts":"ลบ %{count}","username":"ชื่อผู้ใช้","trust_level":"TL","read_time":"เวลาที่อ่าน","topics_entered":"กระทู้ที่เข้า","post_count":"# โพสต์","confirm_delete_other_accounts":"คุณแน่ใจแล้วหรือว่าจะลบบัญชีเหล่านี้","copied":"คัดลอกแล้ว"},"user_fields":{"none":"(เลือกตัวเลือก)"},"user":{"said":"%{username}:","profile":"โปรไฟล์","mute":"ปิด","edit":"แก้ไขการตั้งค่า","download_archive":{"button_text":"ดาวน์โหลดทั้งหมด","confirm":"คุณแน่ใจหรือว่าต้องการดาวน์โหลดโพสต์ของคุณ","success":"เริ่มดาวน์โหลด คุณจะได้รับการแจ้งเตือนทางข้อความเมื่อขั้นตอนเสร็จสิ้น","rate_limit_error":"สามารถดาวน์โหลดโพสต์ได้วันละหนึ่งครั้งเท่านั้น กรุณาลองใหม่พรุ่งนี้"},"new_private_message":"สร้างข้อความส่วนตัวใหม่","private_message":"ข้อความส่วนตัว","private_messages":"ข้อความ","user_notifications":{"filters":{"filter_by":"กรองโดย","all":"ทั้งหมด","read":"อ่าน","unread":"ยังไม่อ่าน"},"ignore_duration_title":"ละเว้นผู้ใช้","ignore_duration_username":"ชื่อผู้ใช้","ignore_duration_when":"ช่วงเวลา:","ignore_duration_save":"ไม่สนใจ","ignore_duration_time_frame_required":"กรุณาเลือกระยะเวลา","ignore_no_users":"คุณไม่มีผู้ใช้ที่ถูกละเว้น","ignore_option":"ละเว้นแล้ว","ignore_option_title":"คุณจะไม่ได้รับการแจ้งเตือนที่เกี่ยวข้องกับผู้ใช้รายนี้ และกระทู้และคำตอบทั้งหมดจะถูกซ่อนไว้","add_ignored_user":"เพิ่ม...","mute_option":"ปิด","mute_option_title":"คุณจะไม่ได้รับการแจ้งเตือนใดๆที่เกี่ยวกับผู้ใช้นี้","normal_option":"ปกติ","normal_option_title":"คุณจะได้รับการแจ้งเตือนเมื่อผู้ใช้นี้ตอบคุณ อ้างอิงถึงคุณ หรือกล่าวถึงคุณ"},"activity_stream":"กิจกรรม","preferences":"การตั้งค่า","feature_topic_on_profile":{"open_search":"เลือกกระทู้ใหม่","title":"เลือกกระทู้","search_label":"ค้นหากระทู้โดยหัวข้อ","save":"บันทึก","clear":{"title":"ล้าง","warning":"คุณแน่ใจหรือว่าต้องการล้างกระทู้เด่นของคุณ"}},"use_current_timezone":"ใช้เขตเวลาปัจจุบัน","profile_hidden":"โปรไฟล์สาธารณะของผู้ใช้นี้ถูกซ่อนอยู่","expand_profile":"ขยาย","collapse_profile":"ย่อ","bookmarks":"บุ๊กมาร์ก","bio":"เกี่ยวกับฉัน","timezone":"เขตเวลา","invited_by":"เชิญชวนโดย","trust_level":"ระดับความถูกต้อง","notifications":"การแจ้งเตือน","statistics":"สถิติ","desktop_notifications":{"label":"การแจ้งเตือนทันที","not_supported":"ขออภัย บราวเซอร์นี้ไม่สนับสนุนการแจ้งเตือน","perm_default":"เปิดการแจ้งเตือน","perm_denied_btn":"ไม่มีสิทธิ์เข้าถึง","perm_denied_expl":"คุณปฏิเสธการอนุญาตการแจ้งเตือน เปิดการแจ้งเตือนในการตั้งค่าบราวเซอร์ของคุณ","disable":"ปิดการแจ้งเตือน","enable":"เปิดการแจ้งเตือน","consent_prompt":"เมื่อมีคนตอบกลับโพสต์ของคุณ คุณต้องการการแจ้งเตือนโดยทันทีหรือไม่"},"dismiss":"ซ่อน","dismiss_notifications":"ซ่อนทั้งหมด","dismiss_notifications_tooltip":"ทำเครื่องหมายอ่านบนการแจ้งเตือนที่ยังไม่ได้อ่านทั้งหมด","first_notification":"การแจ้งเตือนแรกของคุณ! กดเลือกเพื่อเริ่มต้น","dynamic_favicon":"แสดงจำนวนบนไอคอนเบราว์เซอร์","theme_default_on_all_devices":"ทำให้ธีมนี้เป็นธีมเริ่มต้นบนทุกอุปกรณ์ของฉัน","text_size_default_on_all_devices":"ทำให้ขนาดฟอนต์นี้เป็นค่าเริ่มต้นบนทุกอุปกรณ์ของฉัน","allow_private_messages":"อนุญาตให้ผู้ใช้อื่นส่งข้อความส่วนตัวหาฉัน","external_links_in_new_tab":"เปิดลิงก์ภายนอกทั้งหมดในแท็บใหม่","enable_quoting":"เปิดการตอบกลับการอ้างอิงโดยไฮไลท์ข้อความ","change":"เปลี่ยนแปลง","featured_topic":"กระทู้เด่น","moderator":"%{user} เป็นผู้ดูแลระบบ","admin":"%{user} เป็นแอดมิน","moderator_tooltip":"ผู้ใช้นี้เป็นผู้ดูแลระบบ","admin_tooltip":"ผู้ใช้นี้เป็นแอดมิน","suspended_notice":"ผู้ใช้นี้ถูกระงับจนถึง %{date}","suspended_permanently":"ผู้ใช้นี้ถูกระงับชั่วคราว","suspended_reason":"เหตุผล:","email_activity_summary":"สรุปกิจกรรม","mailing_list_mode":{"label":"โหมดจดหมายข่าว","enabled":"เปิดใช้งานโหมดจดหมายข่าว","instructions":"การตั้งค่านี้จะเปลี่ยนแปลงการสรุปกิจกรรม\u003cbr /\u003e\nกระทู้และหมวดที่ปิดการแจ้งเตือนจะไม่ถูกรวมอยู่ในอีเมลเหล่านี้\n","individual":"ส่งอีเมลทุกครั้งที่มีโพสต์ใหม่","individual_no_echo":"ส่งอีเมลทุกครั้งที่มีโพสต์ใหม่ ยกเว้นของตัวฉันเอง","many_per_day":"ส่งอีเมลหาฉันทุกๆโพสต์ใหม่ (ประมาณ %{dailyEmailEstimate} ต่อวัน)","few_per_day":"ส่งอีเมลหาฉันทุกๆโพสต์ใหม่ (ประมาณ 2 ต่อวัน)"},"tag_settings":"แท็ก","watched_tags":"ดูแล้ว","tracked_tags":"ติดตาม","muted_tags":"ปิด","watched_categories":"ดูแล้ว","tracked_categories":"ติดตาม","watched_first_post_categories":"กำลังดูโพสต์แรก","watched_first_post_tags":"กำลังดูโพสต์แรก","muted_categories":"ปิดเสียง","delete_account":"ลบบัญชีของฉัน","delete_account_confirm":"คุณแน่ใจไหมที่จะลบบัญชีอย่างถาวร การดำเนินการนี้ไม่สามารถยกเลิกได้","deleted_yourself":"บัญชีของคุณถูกลบเรียบร้อยแล้ว","unread_message_count":"ข้อความ","admin_delete":"ลบ","users":"ผู้ใช้","muted_users":"ปิดการแจ้งเตือน","ignored_users":"ละเว้นแล้ว","ignored_users_instructions":"ระงับโพสต์ การแจ้งเตือน และข้อความส่วนตัวทั้งหมดจากผู้ใช้เหล่านี้","tracked_topics_link":"แสดง","automatically_unpin_topics":"ยกเลิกปักหมุดกระทู้อัตโนมัติเมื่อถึงท้ายหน้า","apps":"แอป","api_approved":"อนุมัติแล้ว:","api_last_used_at":"ใช้ครั้งสุดท้ายเมื่อ:","theme":"ธีม","save_to_change_theme":"ธีมจะถูกอัปเดตเมื่อคุณคลิก \"%{save_text}\"","home":"หน้าเริ่มต้น","staff_counters":{"flags_given":"ธงที่เป็นประโยชน์","flagged_posts":"โพสต์ที่ปักธง","deleted_posts":"โพสต์ที่ลบ","suspensions":"ระงับการใช้งาน","warnings_received":"คำเตือน","rejected_posts":"โพสต์ที่ถูกปฏิเสธ"},"messages":{"all":"ทั้งหมด","inbox":"กล่องจดหมายเข้า","sent":"ส่ง","archive":"คลัง","groups":"กลุ่มของฉัน","bulk_select":"เลือกข้อความ","move_to_inbox":"ย้ายไปกล่องขาเข้า","move_to_archive":"เก็บเข้าคลัง","failed_to_move":"เกิดความผิดพลาดในการย้ายข้อความที่เลือก (เครือข่ายของคุณอาจล่ม)","select_all":"เลือกทั้งหมด","tags":"แท็ก"},"preferences_nav":{"account":"บัญชี","profile":"โปรไฟล์","emails":"อีเมล","notifications":"การแจ้งเตือน","categories":"หมวดหมู่","users":"ผู้ใช้","tags":"แท็ก","apps":"แอป"},"change_password":{"success":"(อีเมลถูกส่งแล้ว)","in_progress":"(กำลังส่งอีเมล)","error":"(ผิดพลาด)","action":"ส่งอีเมลรีเซ็ทรหัสผ่าน","set_password":"ตั้งรหัสผ่าน","choose_new":"เลือกรหัสผ่านใหม่","choose":"เลือกรหัสผ่าน"},"second_factor_backup":{"disable":"ปิดใช้งาน","enable":"เปิดใช้งาน"},"second_factor":{"forgot_password":"ลืมรหัสผ่านใช่ไหม","confirm_password_description":"กรุณายืนยันรหัสผ่านเพื่อดำเนินการต่อ","name":"ชื่อ","disable":"ปิดใช้งาน","save":"บันทึก","edit":"แก้ไข","security_key":{"register":"ลงทะเบียน","save":"บันทึก"}},"change_about":{"title":"เปลี่ยนข้อมูลเกี่ยวกับฉัน","error":"เกิดความผิดพลาดในการแก้ไขค่านี้"},"change_username":{"title":"เปลี่ยนชื่อผู้ใช้","confirm":"คุณแน่ใจจริงๆหรือว่าต้องการเปลี่ยนชื่อผู้ใช้ของคุณ","taken":"ขออภัย มีผู้ใช้ชื่อนี้แล้ว","invalid":"ชื่อผู้ใช้ไม่ถูกต้อง จะต้องมีเพียงแค่ตัวอักษรและตัวเลขเท่านั้น"},"add_email":{"title":"เพิ่มอีเมล","add":"เพิ่ม"},"change_email":{"title":"เปลี่ยนอีเมล","taken":"ขออภัย อีเมลไม่ถูกต้อง","error":"มีข้อผิดพลาดในการเปลี่ยนอีเมล บางทีอีเมลนี้อาจถูกใช้งานแล้ว","success":"เราส่งอีเมลไปยังที่อยู่อีเมลดังกล่าวแล้ว กรุณาทำตามขั้นตอนยืนยัน","success_staff":"เราส่งอีเมลไปยังที่อยู่อีเมลปัจจุบันแล้ว กรุณาทำตามขั้นตอนยืนยัน"},"change_avatar":{"title":"เปลี่ยนรูปโปรไฟล์ของคุณ","gravatar_failed":"คุณไม่สามารถค้นหา%{gravatarName}ด้วยที่อยู่อีเมลนั้น","refresh_gravatar_title":"รีเฟรช%{gravatarName}ของคุณ","letter_based":"รูปโพรไฟล์ที่ระบบทำให้อัตโนมัติ","uploaded_avatar":"รูปกำหนดเอง","uploaded_avatar_empty":"เพิ่มรูปกำหนดเอง","upload_title":"อัปโหลดรูปภาพของคุณ","image_is_not_a_square":"คำเตือน: เราได้ตัดรูปภาพของคุณ; ความกว้างและความสูงไม่เท่ากัน"},"change_card_background":{"title":"พื้นหลังผู้ใช้","instructions":"รูปพื้นหลังจะถูกจัดให้อยู่ตรงกลางและมีความกว้างมาตรฐานที่ 590px"},"change_featured_topic":{"title":"กระทู้เด่น","instructions":"ลิงก์ไปยังกระทู้นี้จะอยู่บนการ์ดผู้ใช้และโปรไฟล์ของคุณ"},"email":{"title":"อีเมล","primary":"อีเมลหลัก","secondary":"อีเมลสำรอง","primary_label":"หลัก","unconfirmed_label":"ไม่ได้ยืนยัน","resend_label":"ส่งอีเมลยืนยันตัวตนอีกครั้ง","resending_label":"กำลังส่ง...","resent_label":"อีเมลถูกส่งแล้ว","update_email":"เปลี่ยนอีเมล","set_primary":"ตั้งอีเมลหลัก","destroy":"ลบอีเมล","add_email":"เพิ่มอีเมลสำรอง","no_secondary":"ไม่มีอีเมลสำรอง","instructions":"ไม่แสดงเป็นสาธารณะ","ok":"เราจะส่งอีเมลไปหาคุณเพื่อยืนยัน","required":"กรุณากรอกที่อยู่อีเมล","invalid":"กรุณาใส่อีเมลที่ถูกต้อง","authenticated":"อีเมลของคุณได้รับการยืนยันโดย %{provider}","frequency_immediately":"เราจะอีเมลถึงคุณทันทีหากคุณยังไม่ได้อ่านสิ่งที่เราอีเมลหาคุณ","frequency":{"other":"เราจะอีเมลหาคุณเฉพาะตอนที่ไม่ได้เห็นคุณเป็นเวลา %{count} นาที"}},"associated_accounts":{"connect":"เชื่อมต่อ","revoke":"เอาออก","cancel":"ยกเลิก","not_connected":"(ไม่เชื่อมต่อ)","confirm_modal_title":"เชื่อมต่อ%{provider}บัญชี"},"name":{"title":"ชื่อ","instructions":"ชื่อเต็มของคุณ (ไม่บังคับ)","instructions_required":"ชื่อเต็มของคุณ","required":"กรุณากรอกชื่อ","too_short":"ชื่อของคุณสั้นไป","ok":"ชื่อของคุณเหมาะสม"},"username":{"title":"ชื่อผู้ใช้","instructions":"ไม่เหมือนใคร, ไม่มีช่องว่าง, สั้น","short_instructions":"ผู้คนสามารถกล่าวถึงคุณโดย @%{username}","available":"ชื่อผู้ใช้ของคุณสามารถใช้ได้","not_available":"ใช้งานไม่ได้ กรุณาลอง%{suggestion}","not_available_no_suggestion":"ถูกใช้แล้ว","too_short":"ชื่อผู้ใช้สั้นไป","too_long":"ชื่อผู้ใช้ยาวไป","checking":"กำลังตรวจสอบชื่อผู้ใช้","prefilled":"อีเมลตรงกับชื่อผู้ใช้ที่ลงทะเบียนนี้","required":"กรุณากรอกชื่อผู้ใช้"},"locale":{"title":"ภาษา","instructions":"ภาษา จะเปลี่ยนเมื่อคุณรีเฟรชหน้า","default":"(ค่าเริ่มต้น)","any":"ใดๆ"},"password_confirmation":{"title":"ยืนยันรหัสผ่าน"},"invite_code":{"title":"รหัสเชิญ"},"auth_tokens":{"title":"อุปกรณ์ที่ถูกใช้เร็วๆนี้","details":"รายละเอียด","log_out_all":"ออกจากระบบทั้งหมด","not_you":"ไม่ใช่คุณใช่ไหม","show_all":"แสดงทั้งหมด (%{count})","show_few":"แสดงน้อยลง","was_this_you":"ใช่คุณหรือไม่","was_this_you_description":"ถ้าไม่ใช่คุณ เราแนะนำให้เปลี่ยนรหัสผ่านและออกจากระบบทุกเครื่อง","browser_and_device":"%{browser}บน%{device}","secure_account":"ตั้งค่าความปลอดภัยบัญชีของฉัน","latest_post":"คุณโพสต์ครั้งล่าสุด..."},"last_posted":"โพสต์ล่าสุด","last_emailed":"อีเมลล่าสุด","last_seen":"ดูแล้ว","created":"เข้าร่วมแล้ว","log_out":"ออกจากระบบ","location":"ที่อยู่","website":"เว็บไซต์","email_settings":"อีเมล","text_size":{"title":"ขนาดข้อความ","smallest":"เล็กที่สุด","smaller":"เล็กลง","normal":"ปกติ","larger":"ใหญ่ขึ้น","largest":"ใหญ่ที่สุด"},"title_count_mode":{"notifications":"การแจ้งเตือนใหม่"},"like_notification_frequency":{"title":"แจ้งเตือนเมื่อมีคนกดถูกใจ","always":"เสมอ","first_time_and_daily":"ครั้งแรกที่โพสโดนชอบในวันนี้","first_time":"ครั้งแรกที่โพสต์โดนกดถูกใจ","never":"ไม่เคย"},"email_previous_replies":{"title":"เพิ่มข้อความตอบรับเก่าในอีเมล","unless_emailed":"นอกจากว่าเคยส่งมาก่อน","always":"เสมอ","never":"ไม่เคย"},"email_digests":{"title":"เมื่อฉันไม่ได้เยี่ยมชมเว็บไซต์ ให้ส่งอีเมลสรุปกระทู้ยอดนิยมและการตอบกลับ","every_30_minutes":"ทุก 30 นาที","every_hour":"ทุกชั่วโมง","daily":"ทุกวัน","weekly":"ทุกสัปดาห์","every_month":"ทุกเดือน","every_six_months":"ทุกหกเดือน"},"email_level":{"title":"ส่งอีเมลเมื่อมีบางคนอ้างอิงถึงฉัน ตอบโพสต์ฉัน กล่าวถึงฉัน @ชื่อผู้ใช้ หรือเชิญฉันเข้าไปในกระทู้","always":"เสมอ","never":"ไม่เคย"},"email_messages_level":"ส่งอีเมลหาฉันเมื่อมีคนส่งข้อความส่วนตัวมาหาฉัน","include_tl0_in_digests":"รวมเนื้อหาจากผู้ใช้ใหม่ในอีเมลสรุป","email_in_reply_to":"เพิ่มการตอบในโพสท์ที่คัดกรองแล้วในอีเมล","other_settings":"อื่นๆ","categories_settings":"หมวดหมู่","new_topic_duration":{"label":"พิจารณาเป็นกระทู้ใหม่เมื่อ","not_viewed":"ฉันยังไม่ได้ดูมันเลย","last_here":"ถูกสร้างขึ้นเมื่อฉันดูครั้งล่าสุด","after_1_day":"ถูกสร้างขึ้นเมื่อวาน","after_2_days":"ถูกสร้างขึ้นเมื่อ 2 วันที่แล้ว","after_1_week":"ถูกสร้างขึ้นเมื่อสัปดาห์ที่แล้ว","after_2_weeks":"ถูกสร้างขึ้นเมื่อ 2 สัปดาห์ที่แล้ว"},"auto_track_topics":"ติดตามกระทู้ที่ฉันเข้าโดยอัตโนมัติ","auto_track_options":{"never":"ไม่เคย","immediately":"ทันที","after_30_seconds":"หลังจาก 30 วินาที","after_1_minute":"หลังจาก 1 นาที","after_2_minutes":"หลังจาก 2 นาที","after_3_minutes":"หลังจาก 3 นาที","after_4_minutes":"หลังจาก 4 นาที","after_5_minutes":"หลังจาก 5 นาที","after_10_minutes":"หลังจาก 10 นาที"},"invited":{"search":"พิมพ์เพื่อค้นหาคำเชิญ...","title":"เชิญชวน","user":"เชิญชวนผู้ใช้แล้ว","sent":"ส่งล่าสุด","none":"ไม่มีคำเชิญที่จะแสดง","truncated":{"other":"กำลังแสดงคำเชิญ %{count} รายการแรก"},"redeemed":"ยืนยันการเชิญชวน","redeemed_tab":"ยืนยัน","redeemed_tab_with_count":"ยืนยันแล้ว (%{count})","redeemed_at":"ยืนยัน","pending":"คำเชิญที่กำลังรอการพิจารณา","pending_tab":"กำลังรอ","pending_tab_with_count":"กำลังรอ (%{count})","topics_entered":"กระทู้ที่ดูแล้ว","posts_read_count":"โพสต์ที่อ่านแล้ว","expired":"การเชิญชวนนี้หมดอายุแล้ว","rescind":"ลบ","rescinded":"การเชิญชวนถูกลบออก","rescind_all":"ลบคำเชิญที่หมดอายุ","rescinded_all":"คำเชิญที่หมดอายุทั้งหมดถูกลบแล้ว!","rescind_all_confirm":"คุณแน่ใจหรือว่าต้องการลบคำเชิญที่หมดอายุทั้งหมด","reinvite":"ส่งการเชิญชวนอีกครั้ง","reinvite_all":"ส่งการเชิญชวนทั้งหมดอีกครั้ง","reinvite_all_confirm":"คุณแน่ใจหรือว่าต้องการส่งคำเชิญทั้งหมดอีกครั้ง","reinvited":"การเชิญชวนถูกส่งอีกครั้งแล้ว","reinvited_all":"การเชิญชวนทั้งหมดถูกส่งอีกครั้งแล้ว","time_read":"เวลาอ่าน","days_visited":"วันที่เข้าชม","account_age_days":"อายุบัญชีผู้ใช้ในหน่วยวัน","source":"ถูกเชิญโดย","links_tab":"ลิงก์","links_tab_with_count":"ลิงก์ (%{count})","link_url":"ลิงก์","link_created_at":"สร้างเมื่อ","link_groups":"กลุ่ม","link_expires_at":"หมดอายุ","valid_for":"ลิงก์คำเชิญใช้งานได้กับที่อยู่อีเมลนี้เท่านั้น: %{email}","invite_link":{"title":"ลิงก์คำเชิญ","success":"สร้างลิงก์คำเชิญสำเร็จแล้ว!","error":"มีข้อผิดพลาดในการสร้างลิงก์คำเชิญ","max_redemptions_allowed_label":"มีกี่คนที่ได้รับอนุญาตให้ลงทะเบียนใช้ลิงก์นี้","expires_at":"ลิงก์คำเชิญนี้จะหมดอายุเมื่อไร"},"bulk_invite":{"success":"ไฟล์ถูกอัปโหลดเรียบร้อยแล้ว คุณจะได้รับการแจ้งเตือนทางข้อความเมื่อขั้นตอนเสร็จสิ้น"}},"password":{"title":"รหัสผ่าน","too_short":"รหัสผ่านสั้นเกินไป","common":"รหัสผ่านง่ายเกินไป","same_as_username":"รหัสผ่านเหมือนกับชื่อผู้ใช้ของคุณ","same_as_email":"รหัสผ่านเหมือนกับอีเมลของคุณ","ok":"รหัสผ่านของคุณเหมาะสม","instructions":"อย่างน้อย %{count} ตัวอักษร","required":"กรุณากรอกรหัสผ่าน"},"summary":{"title":"สรุปภาพรวม","stats":"สถิติ","time_read":"เวลาอ่าน","recent_time_read":"เวลาอ่านเมื่อไม่นานมานี้","topic_count":{"other":"กระทู้ถูกสร้าง"},"post_count":{"other":"โพสต์ถูกสร้าง"},"likes_given":{"other":"ให้แล้ว"},"likes_received":{"other":"ได้รับแล้ว"},"days_visited":{"other":"วันที่เข้าชม"},"topics_entered":{"other":"กระทู้ที่ดู"},"posts_read":{"other":"โพสต์ถูกอ่าน"},"bookmark_count":{"other":"บุ๊กมาร์ก"},"top_replies":"คำตอบยอดนิยม","no_replies":"ยังไม่มีคำตอบ","more_replies":"คำตอบอื่น","top_topics":"กระทู้ยอดนิยม","no_topics":"ยังไม่มีกระทู้","more_topics":"กระทู้อื่น","top_badges":"เหรียญยอดนิยม","no_badges":"ยังไม่มีเหรียญ","more_badges":"เหรียญอื่น","top_links":"ลิงก์ยอดนิยม","no_links":"ยังไม่มีลิงก์","most_liked_by":"ถูกใจมากที่สุดโดย","most_liked_users":"ไลค์มากที่สุด","most_replied_to_users":"ถูกตอบมากที่สุด","no_likes":"ยังไม่มีใครถูกใจ","top_categories":"หมวดหมู่ยอดนิยม","topics":"หัวข้อ","replies":"ตอบ"},"ip_address":{"title":"ไอพีล่าสุด"},"registration_ip_address":{"title":"ไอพีที่ลงทะเบียน"},"avatar":{"title":"รูปโปรไฟล์","header_title":"โปรไฟล์ ข้อความ บุ๊กมาร์ก และการตั้งค่า"},"title":{"title":"ชื่อเรื่อง","none":"(ไม่มี)"},"primary_group":{"title":"กลุ่มหลัก","none":"(ไม่มี)"},"filters":{"all":"ทั้งหมด"},"stream":{"posted_by":"โพสต์โดย","sent_by":"ส่งโดย","private_message":"ข้อความส่วนตัว","the_topic":"กระทู้"}},"loading":"กำลังโหลด...","errors":{"prev_page":"พยายามที่จะโหลด","reasons":{"network":"เครือข่ายมีปัญหา","server":"เซิร์ฟเวอร์มีปัญหา","forbidden":"การเข้าถึงถูกปฏิเสธ","unknown":"ผิดพลาด","not_found":"ไม่พบหน้าดังกล่าว"},"desc":{"network":"โปรดตรวจสอบการเชื่อมต่อของคุณ","network_fixed":"ดูเหมือนว่ามันจะกลับมาแล้ว","server":"รหัสที่ผิดพลาด: %{status}","forbidden":"คุณไม่ได้รับอนุญาตให้ชม","not_found":"อุ๊ปส์! ระบบพยายามโหลดหน้าที่ไม่มีอยู่","unknown":"มีบางอย่างผิดปกติ"},"buttons":{"back":"ย้อนกลับ","again":"ลองอีกครั้ง","fixed":"โหลดหน้า"}},"modal":{"close":"ปิด","dismiss_error":"ละทิ้งข้อผิดพลาด"},"close":"ปิด","assets_changed_confirm":"เว็บไซต์นี้พึ่งอัปเดต รีเฟรชตอนนี้เพื่อใช้เวอร์ชันล่าสุด","logout":"คุณได้ออกจากระบบ","refresh":"รีเฟรช","home":"หน้าแรก","read_only_mode":{"enabled":"เว็บไซต์นี้อยู่ในโหมดอ่านเท่านั้น คุณสามารถดูได้แต่การตอบ ถูกใจ และอื่นๆถูกปิดอยู่ในขณะนี้","login_disabled":"การลงชื่อเข้าใช้จะไม่สามารถใช้งานได้เมื่อเว็บไซต์อยู่ในโหมดอ่านเท่านั้น","logout_disabled":"การออกจากระบบจะไม่สามารถใช้งานได้เมื่อเว็บไซต์อยู่ในโหมดอ่านเท่านั้น"},"learn_more":"เรียนรู้เพิ่มเติม...","all_time":"ทั้งหมด","all_time_desc":"กระทู้ทั้งหมดถูกสร้าง","year":"ปี","year_desc":"กระทู้ที่ถูกสร้างใน 365 วันที่ผ่านมา","month":"เดือน","month_desc":"กระทู้ที่ถูกสร้างใน 30 วันที่ผ่านมา","week":"สัปดาห์","week_desc":"กระทู้ที่ถูกสร้างใน 7 วันที่ผ่านมา","day":"วัน","first_post":"โพสต์แรก","mute":"ปิดเสียง","unmute":"เลิกปิดเสียง","last_post":"โพสต์แล้ว","local_time":"เวลาท้องถิ่น","time_read":"อ่าน","time_read_recently":"%{time_read}ไม่นานมานี้","time_read_tooltip":"อ่านทั้งหมด %{time_read} ครั้ง","time_read_recently_tooltip":"อ่านทั้งหมด %{time_read} ครั้ง (เมื่อ %{recent_time_read} ใน 60 วันที่ผ่านมา)","last_reply_lowercase":"การตอบล่าสุด","replies_lowercase":{"other":"ตอบ"},"signup_cta":{"sign_up":"สมัครสมาชิก","hide_session":"เตือนฉันพรุ่งนี้","hide_forever":"ไม่เป็นไร","hidden_for_session":"ไม่เป็นไร ฉันจะถามคุณพรุ่งนี้อีกครั้ง คุณสามารถใช้เมนู เข้าสู่ระบบ เพื่อสร้างบัญชีได้เช่นกัน"},"summary":{"enabled_description":"คุณกำลังดูสรุปของกระทู้นี้ : นี่คือโพสที่น่าสนใจที่สุดที่หลายๆคนแนะนำ","description":"มี \u003cb\u003e%{replyCount}\u003c/b\u003e คำตอบ","description_time":"มี \u003cb\u003e%{replyCount}\u003c/b\u003e คำตอบ โดยมีเวลาการอ่านประมาณ \u003cb\u003e%{readingTime} นาที\u003c/b\u003e.","enable":"สรุปกระทู้นี้","disable":"แสดงโพสต์ทั้งหมด"},"deleted_filter":{"enabled_description":"กระทู้นี้ซ่อนโพสต์ที่ถูกลบไปแล้ว","disabled_description":"โพสต์ที่ถูกลบแสดงในกระทู้","enable":"ซ่อนโพสต์ที่ถูกลบ","disable":"แสดงโพสต์ที่ถูกลบ"},"private_message_info":{"title":"ข้อความ","leave_message":"คุณต้องการละทิ้งข้อความนี้จริงๆใช่หรือไม่","remove_allowed_user":"คุณต้องการลบ %{name} จากข้อความนี้ใช่หรือไม่","remove_allowed_group":"คุณต้องการลบ %{name} จากข้อความนี้ใช่หรือไม่"},"email":"อีเมล","username":"ชื่อผู้ใช้","last_seen":"เห็น","created":"สร้างเมื่อ","created_lowercase":"ตั้งเมื่อ","trust_level":"ระดับความน่าไว้ใจ","search_hint":"ชื่อผู้ใช้ อีเมล หรือที่อยู่ไอพี","create_account":{"disclaimer":"เมื่อลงทะเบียน คุณได้ยอมรับ \u003ca href='%{privacy_link}' target='blank'\u003eนโยบายความเป็นส่วนตัว\u003c/a\u003e และ \u003ca href='%{tos_link}' target='blank'\u003e เงื่อนไขการบริการ\u003c/a\u003e","title":"สร้างบัญชีใหม่","failed":"มีบางอย่างผิดพลาด อีเมลนี้อาจถูกลงทะเบียนไว้แล้ว กดลิงก์หากลืมรหัสผ่าน"},"forgot_password":{"title":"รีเซ็ตรหัสผ่าน","action":"ฉันลืมรหัสผ่าน","invite":"กรอกชื่อผู้ใช้หรืออีเมลของท่าน เราจะส่งอีเมลสำหรับรีเซ็ตรหัสผ่านให้","reset":"รีเซ็ตรหัสผ่าน","complete_username":"ถ้าบัญชีตรงกับชื่อผู้ใช้ \u003cb\u003e%{username}\u003c/b\u003e คุณจะได้รับอีเมลเกี่ยวกับขั้นตอนการรีเซ็ตรหัสผ่านในไม่ช้า","complete_email":"ถ้าบัญชีตรงกับ \u003cb\u003e%{email}\u003c/b\u003e คุณจะได้รับอีเมลเกี่ยวกับขั้นตอนการรีเซ็ตรหัสผ่านในไม่ช้า","complete_username_not_found":"ไม่มีบัญชีที่ตรงกับชื่อผู้ใช้ \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"ไม่มีบัญชีที่ตรงกับ \u003cb\u003e%{email}\u003c/b\u003e","button_ok":"ตกลง","button_help":"ช่วยเหลือ"},"email_login":{"button_label":"ด้วยอีเมล","complete_username_not_found":"ไม่มีบัญชีที่ตรงกับชื่อผู้ใช้ \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"ไม่มีบัญชีที่ตรงกับ \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"ดำเนินการต่อไปยัง %{site_name}","logging_in_as":"กำลังเข้าสู่ระบบด้วย %{email}","confirm_button":"เสร็จสิ้นการเข้าสู่ระบบ"},"login":{"title":"เข้าสู่ระบบ","username":"ชื่อผู้ใช้","password":"รหัสผ่าน","security_key_alternative":"ลองวิธีอื่น","email_placeholder":"อีเมลหรือชื่อผู้ใช้","caps_lock_warning":"เปิดแคปล็อคอยู่","error":"ข้อผิดพลาดไม่ทราบสาเหตุ","cookies_error":"ดูเหมือนว่าเบราว์เซอร์ของคุณจะปิดการใช้งานคุกกี้ คุณอาจไม่สามารถเข้าสู่ระบบได้หากไม่เปิดใช้งานก่อน","rate_limit":"กรุณารอสักครู่ก่อนเข้าสู่ระบบอีกครั้ง","blank_username":"กรุณากรอกอีเมลหรือชื่อผู้ใช้","blank_username_or_password":"กรุณากรอกอีเมลหรือชื่อผู้ใช้ และรหัสผ่าน","reset_password":"รีเซ็ตรหัสผ่าน","logging_in":"กำลังลงชื่อเข้าใช้","or":"หรือ","authenticating":"กำลังตรวจสอบ...","awaiting_activation":"บัญชีของคุณกำลังรอการยืนยันตัวตน ใช้ลิงก์ลืมรหัสผ่านหากต้องการส่งอีเมลยืนยันตัวตนอีกครั้ง","awaiting_approval":"บัญชีของคุณยังไม่ได้รับการยืนยันโดยทีมงาน คุณจะได้รับอีเมลแจ้งเมื่อได้รับการยืนยันแล้ว","requires_invite":"ขออภัย, สามารถเข้าถึงได้เฉพาะผู้ที่ได้รับเชิญเท่านั้น","not_activated":"คุณไม่สามารถเข้าสู่ระบบได้ เราได้ส่งอีเมลยืนยันตัวตนไปหาคุณที่ \u003cb\u003e%{sentTo}\u003c/b\u003e กรุณาทำตามขั้นตอนในอีเมลเพื่อยืนยันตัวตนของคุณ","admin_not_allowed_from_ip_address":"คุณไม่สามารถเข้าสู่ระบบในสถานะแอดมินด้วยไอพีนี้ได้","resend_activation_email":"คลิกที่นี่เพื่อส่งอีเมลยืนยันตัวตนอีกครั้ง","resend_title":"ส่งอีเมลยืนยันตัวตนอีกครั้ง","change_email":"เปลี่ยนที่อยู่อีเมล","provide_new_email":"กรอกที่อยู่อีเมลใหม่ แล้วเราจะส่งอีเมลยืนยันตัวตนอีกครั้ง","submit_new_email":"อัปเดตที่อยู่อีเมล","sent_activation_email_again":"เราส่งอีเมลยืนยันตัวตนใหม่ไปให้คุณที่ \u003cb\u003e%{currentEmail}\u003c/b\u003e กรุณารอสักครู่และตรวจสอบในถังขยะอีเมลของคุณ","sent_activation_email_again_generic":"เราส่งอีเมลยืนยันตัวตนใหม่ไปแล้ว กรุณารอสักครู่และตรวจสอบในถังขยะอีเมลของคุณ","to_continue":"กรุณาเข้าสู่ระบบ","preferences":"คุณจำเป็นต้องเข้าสู่ระบบเพื่อเปลี่ยนการตั้งค่าผู้ใช้ของคุณได้","not_approved":"บัญชีของคุณยังไม่ได้รับการยืนยัน คุณจะได้รับการแจ้งเตือนทางอีเมลเมื่อคุณสามารถเข้าสู่ระบบได้","google_oauth2":{"name":"กูเกิล","title":"ด้วยกูเกิล"},"twitter":{"name":"ทวิตเตอร์","title":"ด้วยทวิตเตอร์"},"instagram":{"name":"อินสตาแกรม","title":"ด้วยอินสตาแกรม"},"facebook":{"name":"เฟซบุ๊ก","title":"ด้วยเฟซบุ๊ก"},"github":{"name":"กิตฮับ","title":"ด้วยกิตฮับ"},"discord":{"title":"โดยดิสคอร์ด"}},"invites":{"accept_title":"คำเชิญ","welcome_to":"ยินดีต้อนรับสู่ %{site_name}!","invited_by":"คุณถูกเชิญโดย:","your_email":"ที่อยู่อีเมลบัญชีของคุณคือ \u003cb\u003e%{email}\u003c/b\u003e","accept_invite":"ยอมรับคำเชิญ","success":"บัญชีของคุณถูกสร้าง คุณได้เข้าสู่ระบบแล้ว","name_label":"ชื่อ","optional_description":"(ทางเลือก)"},"password_reset":{"continue":"ดำเนินการต่อไปยัง %{site_name}"},"emoji_set":{"apple_international":"แอปเปิล/นานาชาติ","google":"กูเกิล","twitter":"ทวิตเตอร์","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"หมวดหมู่เท่านั้น","categories_with_featured_topics":"หมวดหมู่พร้อมด้วยกระทู้เด่น","categories_and_latest_topics":"หมวดหมู่และกระทู้ล่าสุด","categories_and_top_topics":"หมวดหมู่และกระทู้ยอดนิยม"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"เอ็นเทอร์"},"conditional_loading_section":{"loading":"กำลังโหลด..."},"select_kit":{"default_header_text":"เลือก...","no_content":"ไม่พบผลลัพธ์ที่ตรงกัน","filter_placeholder":"ค้นหา...","filter_placeholder_with_any":"ค้นหาหรือสร้าง...","create":"สร้าง: '%{content}'","max_content_reached":{"other":"คุณสามารถเลือกได้ %{count} รายการเท่านั้น"},"min_content_not_reached":{"other":"เลือกอย่างน้อย %{count} รายการ"}},"date_time_picker":{"from":"จาก","to":"ถึง"},"emoji_picker":{"filter_placeholder":"ค้นหาอีโมจิ","smileys_\u0026_emotion":"ยิ้มและอารมณ์","people_\u0026_body":"ผู้คนและร่างกาย","animals_\u0026_nature":"สัตว์และธรรมชาติ","food_\u0026_drink":"อาหารและเครื่องดื่ม","travel_\u0026_places":"ท่องเที่ยวและสถานที่","activities":"กิจกรรม","objects":"วัตถุ","symbols":"สัญลักษณ์","flags":"ธง","recent":"ใช่เมื่อไม่นานมานี้","default_tone":"ไม่มีโทนผิว","light_tone":"โทนผิวอ่อน","medium_light_tone":"โทนผิวอ่อนปานกลาง","medium_tone":"โทนผิวปานกลาง","medium_dark_tone":"โทนผิวเข้มปานกลาง","dark_tone":"โทนผิวเข้ม","default":"อีโมจิที่กำหนดเอง"},"shared_drafts":{"title":"แบบร่างที่ถูกแบ่งปัน","notice":"กระทู้นี้แสดงให้ผู้ที่สามารถเห็นหมวดหมู่ \u003cb\u003e%{category}\u003c/b\u003e เท่านั้น","publish":"เผยแพร่แบบร่างที่ถูกแบ่งปัน","confirm_publish":"คุณแน่ใจหรือว่าต้องการเผยแพร่แบบร่างนี้","publishing":"กำลังเผยแพร่กระทู้..."},"composer":{"emoji":"อีโมจิ :)","more_emoji":"อื่นๆ...","options":"ตัวเลือก","whisper":"กระซิบ","add_warning":"นี่คือคำเตือนอย่างเป็นทางการ","toggle_whisper":"เปิดกระซิบ","posting_not_on_topic":"กระทู้ไหนที่คุณต้องการตอบ","saved_local_draft_tip":"บันทึกบนอุปกรณ์","similar_topics":"กระทู้ของคุณใกล้เคียงกับ...","drafts_offline":"แบบร่างออฟไลน์","duplicate_link":"ดูเหมือนว่าลิงก์ของคุณ \u003cb\u003e%{domain}\u003c/b\u003e ถูกโพสต์ในกระทู้แล้วโดย \u003cb\u003e@%{username}\u003c/b\u003e ใน \u003ca href='%{post_url}'\u003e ตอบกลับเมื่อ %{ago}\u003c/a\u003e - คุณแน่ใจหรือว่าต้องการโพสต์มันอีกครั้ง","reference_topic_title":"ตอบกลับ: %{title}","error":{"title_missing":"ต้องมีชื่อเรื่อง","title_too_short":"ชื่อเรื่องต้องมีอย่างน้อย %{min} ตัวอักษร","title_too_long":"ชื่อเรื่องต้องไม่ยาวเกิน %{max} ตัวอักษร","post_missing":"โพสต์ไม่สามารถว่างได้","post_length":"โพสต์ต้องมีอย่างน้อย %{min} ตัวอักษร","try_like":"คุณได้ลองปุ่ม %{heart} แล้วหรือยัง","category_missing":"คุณต้องเลือกหมวดหมู่"},"save_edit":"บันทึกการแก้ไข","reply_original":"ตอบบนกระทู้ต้นฉบับ","reply_here":"ตอบที่นี่","reply":"ตอบกลับ","cancel":"ยกเลิก","create_topic":"สร้างกระทู้","create_pm":"ข้อความ","title":"หรือกด Ctrl+Enter","users_placeholder":"เพิ่มผู้ใช้","title_placeholder":"บทสนทนานี้เกี่ยวกับอะไร ขอสั้นๆ 1 ประโยค","title_or_link_placeholder":"พิมพ์หัวข้อ หรือวางลิงก์ที่นี่","edit_reason_placeholder":"ทำไมคุณถึงแก้ไข","topic_featured_link_placeholder":"กรอกลิงก์ที่แสดงหัวข้อ","remove_featured_link":"ลบลิงก์ออกจากกระทู้","reply_placeholder":"พิมพ์ที่นี่. ใช้ Markdown, BBCode หรือ HTML เพื่อจัดรูปแบบ สามารถลากหรือวางรูปภาพได้","reply_placeholder_no_images":"พิมพ์ที่นี่ ใช้ Markdown, BBCode หรือ HTML เพื่อจัดรูปแบบ","reply_placeholder_choose_category":"เลือกหมวดหมู่ก่อนพิมพ์ที่นี่","view_new_post":"ดูโพสต์ใหม่ของคุณ","saving":"กำลังบันทึก","saved":"บันทึกแล้ว!","saved_draft":"โพสต์ร่างกำลังดำเนินการ กดเพื่อดำเนินการต่อ","uploading":"กำลังอัปโหลด...","show_preview":"แสดงตัวอย่าง \u0026raquo;","hide_preview":"\u0026raquo; ซ่อนตัวอย่าง","quote_post_title":"อ้างถึงโพสต์ทั้งหมด","bold_label":"หนา","bold_title":"หนา","bold_text":"ตัวอักษรหนา","italic_label":"เอียง","italic_title":"เอียง","italic_text":"ตัวอักษรเอียง","link_title":"ลิงค์","link_description":"กรอกรายละเอียดลิงก์ที่นี่","link_dialog_title":"เพิ่มลิงค์","link_optional_text":"ชื่อเรื่องเพิ่มเติม","link_url_placeholder":"วาง URL หรือพิมพ์เพื่อค้นหากระทู้","blockquote_text":"ส่วนอ้างถึง","code_title":"ข้อความก่อนจัดรูปแบบ","code_text":"ข้อความก่อนจัดรูปแบบเยื้อง 4 เคาะ","paste_code_text":"พิมพ์หรือวางโค้ดที่นี่","upload_title":"อัปโหลด","upload_description":"กรอกรายละเอียดการอัปโหลดที่นี่","olist_title":"รายการลำดับ","ulist_title":"รายการดอกจันทร์","list_item":"รายการ","help":"ช่วยเหลือการจัดรูปแบบ","collapse":"ย่อหน้าเขียนกระทู้","open":"เปิดหน้าเขียนกระทู้","abandon":"ปิดหน้าเขียนกระทู้และละทิ้งแบบร่าง","enter_fullscreen":"ขยายหน้าเขียนกระทู้เต็มจอ","exit_fullscreen":"ออกจากหน้าเขียนกระทู้เต็มจอ","modal_ok":"ตกลง","modal_cancel":"ยกเลิก","cant_send_pm":"ขออภัย คุณไม่สามารถส่งข้อความหา %{username} ได้","yourself_confirm":{"title":"คุณลืมเพิ่มผู้รับหรือไม่","body":"ตอนนี้ข้อความนี้กำลังถูกส่งไปยังตัวคุณเท่านั้น"},"admin_options_title":"ตั้งค่าทางเลือกทีมงานสำหรับกระทู้นี้","composer_actions":{"reply":"ตอบ","draft":"แบบร่าง","edit":"แก้ไข","reply_to_post":{"desc":"ตอบกลับโพสต์ที่เจาะจง"},"reply_as_private_message":{"label":"ข้อความใหม่","desc":"สร้างข้อความส่วนตัวใหม่"},"reply_to_topic":{"label":"ตอบกลับกระทู้"},"create_topic":{"label":"กระทู้ใหม่"},"shared_draft":{"label":"แบบร่างที่ถูกแบ่งปัน"},"toggle_topic_bump":{"desc":"ตอบกลับโดยไม่เปลี่ยนวันที่ตอบกลับล่าสุด"}},"details_title":"สรุป","details_text":"ข้อความนี้จะถูกซ่อน"},"notifications":{"tooltip":{"regular":{"other":"%{count} การแจ้งเตือนที่ยังไม่เห็น"},"message":{"other":"%{count} ข้อความที่ยังไม่ได้อ่าน"},"high_priority":{"other":"มี %{count} การแจ้งเตือนสำคัญที่ยังไม่ได้อ่าน"}},"title":"การแจ้งเตือนการพูดถึง,การตอบกลับไปยังโพส กระทู้ หรือข้อความส่วนตัว และอื่นๆของ @name ","none":"ไม่สามารถโหลดการแจ้งเตือนได้ในขณะนี้","empty":"ไม่พบการแจ้งเตือน","post_approved":"โพสต์ของคุณได้รับการอนุมัติ","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","liked_consolidated_description":{"other":"ถูกใจ %{count} ครั้งต่อโพสต์ของคุณ"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e%{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003eยอมรับคำเชิญของคุณ","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003eได้ลบ%{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","watching_first_post":"\u003cspan\u003eกระทู้ใหม่\u003c/span\u003e%{description}","membership_request_accepted":"ถูกรับเป็นสมาชิกในกลุ่ม '%{group_name}'","group_message_summary":{"other":"%{count}ข้อความในกล่องขาเข้าของกลุ่ม %{group_name}"},"popup":{"mentioned":"%{username} กล่าวถึงคุณใน \"%{topic}\" - %{site_title}","group_mentioned":"%{username} กล่าวถึงคุณใน \"%{topic}\" - %{site_title}","quoted":"%{username} อ้างอิงถึงคุณใน \"%{topic}\" - %{site_title}","replied":"%{username} ตอบคุณใน \"%{topic}\" - %{site_title}","posted":"%{username} โพสต์ใน \"%{topic}\" - %{site_title}","private_message":"%{username}ได้ส่งข้อความส่วนตัวไปหาคุณใน \"%{topic}\"-%{site_title}","linked":"%{username} ลิงค์โพสของคุณจาก \"%{topic}\" - %{site_title}","watching_first_post":"%{username}ได้สร้างกระทู้ใหม่ \"%{topic}\"-%{site_title}","confirm_title":"เปิดการแจ้งเตือนแล้ว - %{site_title}","confirm_body":"สำเร็จแล้ว! การแจ้งเตือนถูกเปิดใช้งาน","custom":"การแจ้งเตือนจาก %{username} บน %{site_title}"},"titles":{"mentioned":"ได้กล่าวถึง","replied":"คำตอบใหม่","quoted":"ถูกอ้างอิงถึง","edited":"ถูกแก้ไข","liked":"การถูกใจใหม่","private_message":"ข้อความส่วนตัวใหม่","invited_to_private_message":"ถูกเชิญไปยังข้อความส่วนตัว","invitee_accepted":"คำเชิญถูกยอมรับ","posted":"โพสต์ใหม่","invited_to_topic":"ถูกเชิญไปยังกระทู้","group_message_summary":"ข้อความกลุ่มใหม่","watching_first_post":"กระทู้ใหม่","liked_consolidated":"ไลค์ใหม่","post_approved":"โพสต์ได้รับอนุมัติ"}},"upload_selector":{"title":"เพิ่มรูปภาพ","title_with_attachments":"เพิ่มรูปภาพหรือไฟล์","from_my_computer":"จากอุปกรณ์ของฉัน","from_the_web":"จากเว็บ","remote_tip":"ลิงก์ไปยังรูปภาพ","remote_tip_with_attachments":"ลิงก์ไปยังรูปภาพหรือไฟล์ %{authorized_extensions}","local_tip":"เลือกรูปภาพจากอุปกรณ์ของคุณ","local_tip_with_attachments":"เลือกรูปภาพหรือไฟล์จากอุปกรณ์ของคุณ %{authorized_extensions}","hint":"(คุณสามารถลากไปวางในช่องแก้ไขเพื่ออัปโหลดได้ด้วย)","hint_for_supported_browsers":"คุณสามารถลากหรือวางรูปภาพในช่องแก้ไขได้ด้วย","uploading":"กำลังอัปโหลด","select_file":"เลือกไฟล์","default_image_alt_text":"รูปภาพ"},"search":{"sort_by":"เรียงโดย","relevance":"เกี่ยวข้อง","latest_post":"โพสต์ล่าสุด","latest_topic":"กระทู้ล่าสุด","most_viewed":"ดูมากที่สุด","most_liked":"ถูกใจมากที่สุด","select_all":"เลือกทั้งหมด","clear_all":"ล้างทั้งหมด","too_short":"คำค้นหาสั้นเกินไป","title":"ค้นหากระทู้ โพสต์ ผู้ใช้ หรือหมวดหมู่","full_page_title":"ค้นหากระทู้หรือโพสต์","no_results":"ไม่มีผลการค้นหา","no_more_results":"ไม่มีผลการค้นหาเพิ่มเติมแล้ว","post_format":"#%{post_number} โดย %{username}","cant_find":"ไม่พบสิ่งที่คุณค้นหาใช่หรือไม่","start_new_topic":"ลองเริ่มกระทู้ใหม่ดีไหม","or_search_google":"หรือลองค้นหาด้วยกูเกิล:","search_google":"ลองค้นหาด้วยกูเกิล:","search_google_button":"กูเกิล","context":{"user":"ค้นหาโพสต์โดย @%{username}","category":"ค้นหาหมวด #%{category}","tag":"ค้นหาแท็ก #%{tag}","topic":"ค้นหากระทู้นี้","private_messages":"ค้นหาข้อความ"},"advanced":{"title":"ค้นหาขั้นสูงสุด","posted_by":{"label":"โพสต์โดย"},"in_category":{"label":"จัดหมวดหมู่"},"in_group":{"label":"ในกลุ่ม"},"with_tags":{"label":"แท็กแล้ว"},"filters":{"likes":"ฉันได้ถูกใจ","posted":"ฉันได้โพสต์ใน","created":"ฉันได้สร้าง","watching":"ฉันกำลังดู","tracking":"ฉันกำลังติดตาม","private":"ในข้อความของฉัน","bookmarks":"ฉันได้บุ๊กมาร์ก","first":"เป็นโพสต์แรกๆ","pinned":"ถูกปักหมุด","seen":"ฉันได้อ่าน","unseen":"ฉันยังไม่ได้อ่าน","images":"พร้อมรูปภาพ","all_tags":"แท็กด้านบนทั้งหมด"},"statuses":{"label":"ประเภทกระทู้","open":"เปิด","closed":"ปิด","public":"เป็นสาธารณะ","archived":"ถูกเก็บเข้าคลัง","noreplies":"ไม่มีการตอบกลับ","single_user":"มีผู้ใช้คนเดียว"},"post":{"time":{"label":"โพสต์แล้ว","before":"ก่อน","after":"หลังจาก"}}}},"hamburger_menu":"ไปยังรายการกระทู้หรือหมวดหมู่อื่น","new_item":"ใหม่","go_back":"ย้อนกลับ","not_logged_in_user":"หน้าผู้ใช้พร้อมสรุปกิจกรรมล่าสุดและการตั้งค่า","current_user":"ไปยังหน้าผู้ใช้ของคุณ","view_all":"ดูทั้งหมด","topics":{"new_messages_marker":"เยี่ยมชมครั้งล่าสุด","bulk":{"select_all":"เลือกทั้งหมด","clear_all":"ล้างทั้งหมด","unlist_topics":"กระทู้ที่ไม่ได้แสดง","reset_read":"ล้างจำนวนการอ่าน","delete":"ลบกระทู้","dismiss":"ซ่อน","dismiss_read":"ซ่อนทั้งหมดที่ไม่ได้อ่าน","dismiss_button":"ซ่อน...","dismiss_tooltip":"ซ่อนเฉพาะโพสต์ใหม่หรือหยุดติดตามกระทู้","also_dismiss_topics":"หยุดติดตามกระทู้เหล่านี้เพื่อไม่ให้แสดงว่าเป็นกระทู้ที่ยังไม่ได้อ่าน","dismiss_new":"ซ่อนใหม่","toggle":"สลับการเลือกกระทู้จำนวนมาก","actions":"การดำเนินการจำนวนมาก","change_category":"ตั้งค่าหมวดหมู่","close_topics":"ปิดกระทู้","archive_topics":"คลังกระทู้","notification_level":"การแจ้งเตือน","choose_new_category":"เลือกหมวดหมู่ใหม่ให้กระทู้","selected":{"other":"คุณได้เลือก \u003cb\u003e%{count}\u003c/b\u003e กระทู้"},"change_tags":"แทนที่แท็ก","choose_new_tags":"เลือกแท็กใหม่เพื่อกระทู้เหล่านี้:","changed_tags":"แท็กของกระทู้เหล่านี้ถูกเปลี่ยนแปลง"},"none":{"unread":"คุณไม่มีกระทู้ที่ยังไม่ได้อ่าน","new":"คุณไม่มีกระทู้ใหม่","read":"คุณยังไม่ได้อ่านกระทู้ใดๆเลย","posted":"คุณยังไม่ได้โพสต์ในกระทู้ใดๆเลย","bookmarks":"คุณยังไม่ได้บุ๊กมาร์กกระทู้ใดๆเลย","category":"ไม่มีกระทู้ในหมวด %{category}","top":"ไม่มีกระทู้ยอดนิยม"},"bottom":{"latest":"ไม่มีกระทู้ล่าสุดอีกแล้ว","posted":"ไม่มีกระทู้ที่โพสต์อีกแล้ว","read":"ไม่มีกระทู้ที่อ่านแล้วอีก","new":"ไม่มีกระทู้ใหม่อีกแล้ว","unread":"ไม่มีกระทู้ที่ยังไม่อ่านอีกแล้ว","category":"ไม่มีกระทู้อื่นอีกใน %{category}","top":"ไม่มีกระทู้ยอดนิยมอีกแล้ว","bookmarks":"ไม่มีกระทู้ที่บุ๊กมาร์กอีกแล้ว"}},"topic":{"filter_to":{"other":" %{count} โพสต์ในกระทู้"},"create":"กระทู้ใหม่","create_long":"สร้างกระทู้ใหม่","open_draft":"เปิดแบบร่าง","private_message":"เริ่มข้อความ","archive_message":{"help":"ย้ายข้อความไปคลังของคุณ","title":"คลัง"},"move_to_inbox":{"title":"ย้ายไปกล่องขาเข้า","help":"ย้ายข้อความกลับไปกล่องขาเข้า"},"edit_message":{"help":"แก้ไขโพสต์แรกของข้อความ","title":"แก้ไข"},"defer":{"help":"ทำเครื่องหมายว่ายังไม่ได้อ่าน"},"remove_from_profile":{"title":"ลบออกจากโปรไฟล์"},"list":"กระทู้","new":"กระทู้ใหม่","unread":"ยังไม่ได้อ่าน","new_topics":{"other":"%{count} กระทู้ใหม่"},"unread_topics":{"other":"%{count} กระทู้ที่ยังไม่ได้อ่าน"},"title":"กระทู้","invalid_access":{"title":"กระทู้นี้เป็นกระทู้ส่วนตัว","description":"ขออภัย คุณไม่สามารถเข้าถึงกระทู้ที่ต้องการได้!","login_required":"คุณจำเป็นต้องเข้าสู่ระบบเพื่อดูกระทู้นี้"},"server_error":{"title":"ไม่สามารถโหลดกระทู้ได้","description":"ขออภัย ไม่สามารถโหลดกระทู้ได้ อาจเป็นเพราะปัญหาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง หากยังไม่ได้รับการแก้ไข กรุณาติดต่อเรา"},"not_found":{"title":"ไม่พบกระทู้","description":"ขออภัย ไม่สามารถค้นหากระทู้นั้นได้ อาจถูกลบโดยผู้ดูแลระบบ"},"total_unread_posts":{"other":"คุณมี %{count} โพสต์ที่ยังไม่ได้อ่านในกระทู้นี้"},"unread_posts":{"other":"คุณมี %{count} โพสต์เก่าที่ยังไม่ได้อ่านในกระทู้นี้"},"new_posts":{"other":"มี %{count}โพสต์ใหม่ในกระทู้นี้ตั้งแต่คุณอ่านครั้งล่าสุด"},"likes":{"other":"มี %{count}ถูกใจในกระทู้นี้"},"back_to_list":"กลับไปที่รายชื่อกระทู้","options":"ตัวเลือกกระทู้","show_links":"แสดงลิงก์ในกระทู้นี้","read_more_in_category":"ต้องการอ่านเพิ่มใช่ไหม ลองดูกระทู้อื่นใน %{catLink} หรือ %{latestLink}","read_more":"ต้องการอ่านเพิ่มใช่ไหม %{catLink} หรือ %{latestLink}","unread_indicator":"ยังไม่มีสมาชิกอ่านโพสต์ล่าสุดของกระทู้นี้","view_latest_topics":"ดูกระทู้ล่าสุด","jump_reply_up":"ข้ามไปยังคำตอบก่อนหน้านี้","jump_reply_down":"ข้ามไปยังคำตอบหลังจากนี้","deleted":"กระทู้ถูกลบ","topic_status_update":{"num_of_hours":"จำนวนชั่วโมง:","num_of_days":"จำนวนวัน:","publish_to":"เผยแพร่ไปยัง:","when":"เมื่อ:"},"auto_update_input":{"now":"ตอนนี้","later_today":"ภายหลังในวันนี้","tomorrow":"พรุ่งนี้","later_this_week":"ภายหลังในสัปดาห์นี้","this_weekend":"สัปดาห์นี้","next_week":"สัปดาห์หน้า","two_weeks":"สองสัปดาห์","next_month":"เดือนหน้า","two_months":"สองเดือน","three_months":"สามเดือน","four_months":"สี่เดือน","six_months":"หกเดือน","one_year":"หนึ่งปี","forever":"ตลอดไป","pick_date_and_time":"เลือกวันและเวลา"},"temp_open":{"title":"เปิดชั่วคราว"},"auto_reopen":{"title":"กระทู้ที่เปิดอัตโนมัติ"},"temp_close":{"title":"ปิดชั่วคราว"},"auto_close":{"title":"กระทู้ที่ปิดอัตโนมัติ","error":"กรอกค่าที่ถูกต้อง","based_on_last_post":"ไม่ปิดจนกว่าโพสสุดท้ายในกระทู้นี่เก่า"},"auto_delete":{"title":"กระทู้ที่ลบอัตโนมัติ"},"reminder":{"title":"เตือนฉัน"},"auto_delete_replies":{"title":"คำตอบที่ลบอัตโนมัติ"},"status_update_notice":{"auto_open":"กระทู้นี้จะเปิดโดยอัตโนมัติ%{timeLeft}","auto_close":"กระทู้นี้จะถูกปิดอัตโนมัติใน %{timeLeft}","auto_close_based_on_last_post":"กระทู้นี้จะถูกปิด %{duration} หลังจากการตอบล่าสุด","auto_delete":"กระทู้นี้จะลบโดยอัตโนมัติ%{timeLeft}","auto_reminder":"คุณจะถูกเตือนเกี่ยวกับกระทู้นี้%{timeLeft}","auto_delete_replies":"คำตอบในกระทู้นี้จะถูกลบโดยอัตโนมัติหลังจาก%{duration}"},"auto_close_title":"ปิดการตั้งค่าอัตโนมัติ","auto_close_immediate":{"other":"โพสต์ล่าสุดของกระทู้นี้มีอายุ %{count} ชั่วโมงแล้ว กระทู้จะถูกปิดเร็วๆนี้"},"timeline":{"back":"กลับ","back_description":"กลับไปยังโพสต์ล่าสุดที่ยังไม่ได้อ่าน","replies_short":"%{current} / %{total}"},"progress":{"go_top":"ด้านบน","go_bottom":"ปุ่ม","go":"ไป","jump_bottom":"ข้ามไปยังโพสต์ล่าสุด","jump_prompt":"ข้ามไปยัง...","jump_prompt_of":"ของ %{count} โพสต์","jump_prompt_long":"ข้ามไปยัง...","jump_bottom_with_number":"ข้ามไปยังโพสต์ %{post_number}","jump_prompt_to_date":"ไปวันที่","jump_prompt_or":"หรือ","total":"โพสต์ทั้งหมด","current":"โพสต์ปัจจุบัน"},"notifications":{"title":"เปลี่ยนความถี่ในการรับการแจ้งเตือนเกี่ยวกระทู้นี้","reasons":{"3_10":"คุณจะได้รับการแจ้งเตือนเพราะคุณกำลังดูแท็กในกระทู้นี้","3_6":"คุณจะได้รับการแจ้งเตือนเพราะคุณกำลังดูหมวดหมู่นี้","3_5":"คุณจะได้รับการแจ้งเตือนเพราะคุณได้เริ่มดูกระทู้นี้อย่างอัตโนมัติ","3_2":"คุณจะได้รับการแจ้งเตือนเพราะคุณกำลังดูกระทู้นี้","3_1":"คุณจะได้รับการแจ้งเตือนเพราะคุณได้สร้างกระทู้นี้","3":"คุณจะได้รับการแจ้งเตือนเพราะคุณกำลังดูกระทู้นี้","2_8":"คุณจะเห็นจำนวนคำตอบใหม่เพราะคุณกำลังติดตามหมวดหมู่นี้","2_4":"คุณจะเห็นจำนวนคำตอบใหม่เพราะคุณได้โพสต์คำตอบไปยังกระทู้นี้","2_2":"คุณจะเห็นจำนวนคำตอบใหม่เพราะคุณกำลังติดตามกระทู้นี้","2":"You will see a count of new replies because you \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eread this topic\u003c/a\u003e.","1_2":"คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ","1":"คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ","0_2":"คุณไม่ต้องการรับการแจ้งเตือนทั้งหมดจากกระทู้นี้","0":"คุณไม่ต้องการรับการแจ้งเตือนทั้งหมดจากกระทู้นี้"},"watching_pm":{"title":"กำลังดู","description":"คุณจะได้รับการแจ้งเตือนของทุกคำตอบใหม่ในข้อความนี้ และจะเห็นจำนวนคำตอบใหม่"},"watching":{"title":"กำลังดู","description":"คุณจะได้รับการแจ้งเตือนของทุกคำตอบใหม่ในกระทู้นี้ และจะเห็นจำนวนคำตอบใหม่"},"tracking_pm":{"title":"ติดตาม","description":"จำนวนคำตอบใหม่จะถูกแสดงสำหรับข้อความนี้ คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ  @name หรือตอบคุณ"},"tracking":{"title":"ติดตาม","description":"จำนวนคำตอบใหม่จะถูกแสดงสำหรับกระทู้นี้ คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ"},"regular":{"title":"ปกติ","description":"คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ"},"regular_pm":{"title":"ปกติ","description":"คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ"},"muted_pm":{"title":"ปิด","description":"คุณจะไม่ได้รับการแจ้งเตือนใดๆเกี่ยวกับข้อความนี้"},"muted":{"title":"ปิดการแจ้งเตือน"}},"actions":{"title":"การกระทำ","recover":"เลิกลบกระทู้","delete":"ลบกระทู้","open":"เปิดกระทู้","close":"ปิดกระทู้","multi_select":"เลือกโพสต์...","pin":"ปักหมุดกระทู้...","unpin":"เลิกปักหมุดกระทู้","unarchive":"เลิกเก็บกระทู้เข้าคลัง","archive":"เก็บกระทู้เข้าคลัง","invisible":"ทำให้ไม่แสดงในรายชื่อ","visible":"ทำให้แสดงในรายชื่อ","reset_read":"ล้างข้อมูลการอ่าน","make_public":"ทำให้กระทู้เป็นสาธารณะ","make_private":"สร้างข้อความส่วนตัว"},"feature":{"pin":"ปักหมุดกระทู้","unpin":"เลิกปักหมุดกระทู้","pin_globally":"ปักหมุดกระทู้ทั้งหมด","make_banner":"ป้ายกระทู้","remove_banner":"ยกเลิกป้ายกระทู้"},"reply":{"title":"ตอบ","help":"เริ่มเขียนตอบกระทู้นี้"},"clear_pin":{"title":"ล้างหมุด"},"share":{"title":"แบ่งปัน","extended_title":"แบ่งปันลิงก์","help":"แบ่งปันลิงก์ไปยังกระทู้นี้"},"print":{"title":"พิมพ์เอกสาร"},"flag_topic":{"title":"ธง","help":"ปังธงกระทู้นี้เพื่อติดตามหรือรับการแจ้งเตือนเกี่ยวกับกระทู้","success_message":"คุณปักธงกระทู้นี้แล้ว"},"make_public":{"choose_category":"กรุณาเลือกหมวดหมู่สำหรับกระทู้สาธารณะ:"},"feature_topic":{"title":"แนะนำกระทู้นี้","pin":"ทำให้กระทู้นี้ปรากฏด้านบนสุดของหมวดหมู่ %{categoryLink} จนกระทั่ง","unpin":"ลบกระทู้นี้ออกจากด้านบนสุดของหมวดหมู่ %{categoryLink}","unpin_until":"ลบกระทู้นี้ออกจากด้านบนสุดของหมวดหมู่ %{categoryLink} หรือรอจนกระทั่ง \u003cstrong\u003e%{until}\u003c/strong\u003e","pin_validation":"จำเป็นต้องมีวันที่เพื่อปักหมุดกระทู้นี้","not_pinned":"ไม่มีกระทู้ที่ถูกปักหมุดใน %{categoryLink}","already_pinned":{"other":"ตอนนี้กระทู้ถูกปักหมุดใน %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"ทำให้กระทู้นี้ปรากฏด้านบนสุดของรายการกระทู้ทั้งหมดจนกระทั่ง","unpin_globally":"ลบกระทู้นี้ออกจากด้านบนสุดของรายการกระทู้ทั้งหมด","unpin_globally_until":"ลบกระทู้นี้ออกจากด้านบนสุดของรายการกระทู้ทั้งหมดหรือรอจนกระทั่ง \u003cstrong\u003e%{until}\u003c/strong\u003e","make_banner":"ทำให้กระทู้นี้เป็นแบนเนอร์ที่จะแสดงอยู่ด้านบนสุดของทุกหน้า","remove_banner":"เอาแบนเนอร์ที่แสดงบนทุกหน้าออก","banner_note":"ผู้ใช้งานสามารถที่จะยกเลิกแบนเนอร์ได้ด้วยการกดปิดทางขวาบนของแบนเนอร์ แบนเนอร์จะมีได้เพียงหนึ่งเดียวเท่านั้นในทุกเวลา","no_banner_exists":"ไม่มีกระทู้ไหนที่ถูกตั้งเป็นแบนเนอร์","banner_exists":"ในตอนนี้\u003cstrong class='badge badge-notification unread'\u003eมี\u003c/strong\u003eกระทู้ที่เป็นแบนเนอร์อยู่แล้ว"},"inviting":"กำลังเชิญ...","invite_private":{"title":"เชิญไปยังข้อความ","email_or_username":"อีเมลหรือชื่อผู้ใช้ที่ถูกเชิญ","email_or_username_placeholder":"อีเมลหรือชื่อผู้ใช้","action":"เชิญ","success":"เราได้เชิญผู้ใช้นั้นให้มีส่วนร่วมในข้อความนี้แล้ว","success_group":"เราได้เชิญกลุ่มนั้นให้เข้าร่วมในข้อความนี้แล้ว","error":"ขออภัย เกิดความผิดพลาดในการเชิญผู้ใช้ท่านนี้","group_name":"ชื่อกลุ่ม"},"controls":"การควบคุมหัวข้อ","invite_reply":{"title":"เชิญ","username_placeholder":"ชื่อผู้ใช้","action":"ส่งคำเชิญ","help":"เชิญคนอื่นมาที่กระทู้นี้โดยอีเมลหรือการแจ้งเตือน","to_forum":"เราจะส่งอีเมลสั้นๆเพื่ออนุญาตให้เพื่อนของคุณเข้าร่วมได้โดยทันทีเพียงคลิกลิงก์ ไม่จำเป็นต้องเข้าสู่ระบบ","sso_enabled":"กรอกชื่อผู้ใช้ของคนที่คุณต้องการเชิญมายังกระทู้นี้","to_topic_blank":"กรอกชื่อผู้ใช้หรือที่อยู่อีเมลของคนที่คุณต้องการเชิญมายังกระทู้นี้","to_topic_email":"คุณได้กรอกที่อยู่อีเมลแล้ว เราจะส่งอีเมลคำเชิญเพื่ออนุญาตเพื่อนของคุณให้ตอบกลับกระทู้นี้ได้โดยทันที","to_topic_username":"คุณได้กรอกชื่อผู้ใช้แล้ว เราจะส่งการแจ้งเตือนพร้อมลิงก์เพื่อเชิญพวกเขามายังกระทู้นี้","to_username":"กรอกชื่อผู้ใช้ของคนที่คุณต้องการเชิญ เราจะส่งการแจ้งเตือนพร้อมลิงก์เพื่อเชิญพวกเขามายังกระทู้นี้","email_placeholder":"name@example.com","success_username":"เราได้เชิญผู้ใช้นั้นให้เข้าร่วมในกระทู้นี้แล้ว","success_existing_email":"ผู้ใช้อีเมล \u003cb\u003e%{emailOrUsername}\u003c/b\u003eมีอยู่ที่นี่แล้ว เราได้เชิญผู้ใช้นั้นให้เข้าร่วมในกระทู้นี้แล้ว"},"login_reply":"เข้าสู่ระบบเพื่อตอบ","filters":{"n_posts":{"other":"%{count} โพสต์"},"cancel":"เอาตัวกรองออก"},"move_to":{"title":"ย้ายไปยัง","action":"ย้ายไปยัง","error":"มีข้อผิดพลาดในการย้ายโพสต์"},"split_topic":{"title":"ย้ายไปกระทู้ใหม่","action":"ย้ายไปกระทู้ใหม่","topic_name":"หัวข้อกระทู้ใหม่","radio_label":"กระทู้ใหม่","error":"มีข้อผิดพลาดในการย้ายโพสต์ไปยังกระทู้ใหม่"},"merge_topic":{"title":"ย้ายไปกระทู้ที่มีอยู่แล้ว","action":"ย้ายไปกระทู้ที่มีอยู่แล้ว","error":"มีข้อผิดพลาดในการย้ายโพสต์ไปยังกระทู้นั้น","radio_label":"กระทู้ที่มีอยู่แล้ว","instructions":{"other":"กรุณาเลือกกระทู้ที่คุณต้องการย้าย \u003cb\u003e%{count}\u003c/b\u003e โพสต์ไป"}},"move_to_new_message":{"title":"ย้ายไปข้อความใหม่","action":"ย้ายไปข้อความใหม่","message_title":"หัวข้อข้อความใหม่","radio_label":"สร้างข้อความใหม่"},"move_to_existing_message":{"title":"ย้ายไปข้อความที่มีอยู่แล้ว","action":"ย้ายไปข้อความที่มีอยู่แล้ว","radio_label":"ข้อความที่มีอยู่แล้ว","instructions":{"other":"กรุณาเลือกข้อความที่คุณต้องการย้าย\u003cb\u003e%{count}\u003c/b\u003eโพสต์ไป"}},"publish_page":{"title":"การเผยแพร่เพจ","publish":"เผยแพร่","public":"สาธารณะ","publish_url":"เพจของคุณถูกเผยแพร่เมื่อ:","topic_published":"กระทู้ของคุณถูกเผยแพร่เมื่อ:","preview_url":"เพจของคุณจะถูกเผยแพร่เมื่อ:","invalid_slug":"ขออภัย คุณไม่สามารถเผยแพร่เพจนี้","unpublish":"ไม่เผยแพร่","unpublished":"เพจของคุณถูกหยุดการเผยแพร่และไม่สามารถเข้าถึงได้อีกต่อไป","publishing_settings":"ตั้งค่าการเผยแพร่"},"change_owner":{"title":"เปลี่ยนเจ้าของ","action":"เปลี่ยนความเป็นเจ้าของ","error":"มีข้อผิดพลาดขณะกำลังเปลี่ยนความเป็นเจ้าของโพสต์","placeholder":"ชื่อผู้ใช้ของเจ้าของใหม่","instructions":{"other":"กรุณาเลือกเจ้าของใหม่สำหรับ %{count}โพสต์ โดย\u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"other":"กรุณาเลือกเจ้าของใหม่สำหรับ %{count}โพสต์"}},"change_timestamp":{"action":"เปลี่ยนแปลงเวลา"},"multi_select":{"select":"เลือก","selected":"เลือกแล้ว (%{count})","select_post":{"label":"เลือก","title":"เพิ่มโพสต์ไปยังการเลือก"},"selected_post":{"label":"เลือกแล้ว","title":"คลิกเพื่อลบโพสต์จากการเลือก"},"select_replies":{"label":"เลือก + ตอบ","title":"เพิ่มโพสต์และคำตอบทั้งหมดไปยังการเลือก"},"select_below":{"label":"เลือก+ด้านล่าง","title":"เพิ่มโพสต์และทุกอย่างหลังจากนั้นไปยังการเลือก"},"delete":"ลบที่เลือก","cancel":"ยกเลิกการเลือก","select_all":"เลือกทั้งหมด","deselect_all":"ไม่เลือกทั้งหมด","description":{"other":"คุณได้เลือก \u003cb\u003e%{count}\u003c/b\u003e โพสต์"}},"deleted_by_author":{"other":"(กระทู้ถูกแจ้งลบโดยเจ้าของ และจะถูกลบโดยอัตโนมัติใน%{count}ชั่วโมง เว้นแต่จะถูกปักธง)"}},"post":{"quote_reply":"อ้างอิง","edit_reason":"เหตุผล:","post_number":"โพสต์ %{number}","last_edited_on":"โพสต์ถูกแก้ไขล่าสุดเมื่อ","reply_as_new_topic":"ตอบด้วยหัวข้อที่ลิงค์ไว้","reply_as_new_private_message":"ตอบกลับด้วยข้อความใหม่ไปยังผู้รับคนเดียวกัน","follow_quote":"ไปยังโพสต์ที่ถูกกล่าวถึง","show_full":"แสดงโพสต์ทั้งหมด","deleted_by_author":{"other":"(โพสถูกแจ้งลบโดยเจ้าของ และจะถูกลบใน %{count} ชั่วโมงเว้นแต่จะถูกปักธง)"},"expand_collapse":"ขยาย/ย่อ","locked":"ทีมงานได้ปิดโพสต์นี้จากการแก้ไข","gap":{"other":"ดู%{count}คำตอบที่ถูกซ่อน"},"notice":{"new_user":"นี่เป็นครั้งแรกที่ %{user} ได้โพสต์ มาร่วมต้อนรับเขาสู่ชุมชนของเรากันเถอะ!","returning_user":"นานแล้วที่เราเห็น %{user} โพสต์ล่าสุดของเขาคือเมื่อ %{time}"},"unread":"โพสต์นี้ยังไม่ถูกอ่าน","has_replies":{"other":"%{count} ตอบ"},"unknown_user":"(ผู้ใช้ที่ลูกลบ/ไม่รู้จัก)","has_likes_title":{"other":"%{count} คนถูกใจโพสต์นี้"},"has_likes_title_only_you":"คุณถูกใจโพสต์นี้","has_likes_title_you":{"other":"คุณและคนอื่นอีก %{count}คนถูกใจโพสต์นี้"},"errors":{"create":"ขออภัย เกิดความผิดพลาดขณะกำลังสร้างโพสต์ของคุณ กรุณาลองใหม่อีกครั้ง","edit":"ขออภัย เกิดความผิดพลาดขณะกำลังแก้ไขโพสต์ของคุณ กรุณาลองใหม่อีกครั้ง","upload":"ขออภัย เกิดความผิดพลาดขณะกำลังอัปโหลดไฟล์ของคุณ กรุณาลองใหม่อีกครั้ง","too_many_uploads":"ขออภัย คุณสามารถอัปโหลดได้ครั้งละหนึ่งไฟล์เท่านั้น","image_upload_not_allowed_for_new_user":"ขออภัย ผู้ใช้ใหม่ไม่สามารถอัปโหลดรูปภาพได้","attachment_upload_not_allowed_for_new_user":"ขออภัย ผู้ใช้ใหม่ไม่สามารถอัปโหลดไฟล์แนบได้","attachment_download_requires_login":"ขออภัย คุณต้องเข้าสู่ระบบเพื่อดาวน์โหลดไฟล์แนบ"},"abandon_edit":{"confirm":"คุณแน่ใจหรือว่าต้องการละทิ้งการเปลี่ยนแปลง","no_value":"ไม่ เก็บไว้","no_save_draft":"ไม่ บันทึกแบบร่าง","yes_value":"ใช่ ละทิ้งการแก้ไข"},"abandon":{"confirm":"คุณแน่ใจหรือว่าต้องการละทิ้งโพสต์ของคุณ","no_value":"ไม่ เก็บไว้","no_save_draft":"ไม่ บันทึกแบบร่าง","yes_value":"ใช่ ละทิ้ง"},"via_email":"โพสนี้ถูกเก็บโดยอีเมล","whisper":"โพสนี้คือการกระซิบจากผู้ดูแล","wiki":{"about":"โพสนี้เป็นวิกิ; ผู้ใช้ธรรมดาสามารถแก้ไขได้"},"archetypes":{"save":"บันทึกการตั้งค่า"},"few_likes_left":"ขอบคุณสำหรับการแบ่งปันความรัก! คุณเหลือเพียงไม่กี่ไลค์สำหรับวันนี้","controls":{"reply":"เริ่มเขียนคำตอบโพสต์นี้","like":"ถูกใจโพสต์นี้","has_liked":"คุณได้ถูกใจโพสต์นี้แล้ว","read_indicator":"สมาชิกที่อ่านโพสต์นี้","undo_like":"เลิกถูกใจ","edit":"แก้ไขโพสต์นี้","edit_action":"แก้ไข","edit_anonymous":"ขออภัย คุณต้องเข้าสู่ระบบเพื่อแก้ไขโพสต์นี้","delete":"ลบโพสต์นี้","undelete":"เลิกลบโพสต์นี้","share":"แบ่งปันลิงก์ไปยังโพสต์นี้","more":"อื่นๆ","delete_replies":{"confirm":"คุณต้องการลบคำตอบไปยังโพสต์นี้ด้วยหรือไม่","direct_replies":{"other":"ใช่ และ %{count}คำตอบโดยตรง"},"all_replies":{"other":"ใช่ และทั้งหมด %{count}คำตอบ"},"just_the_post":"ไม่ แค่โพสต์นี้เท่านั้น"},"publish_page":"การเผยแพร่เพจ","unhide":"เลิกซ่อน","lock_post":"ล็อกโพสต์","lock_post_description":"ป้องกันผู้โพสต์จากการแก้ไขโพสต์นี้","unlock_post":"เลิกล็อกโพสต์นี้","unlock_post_description":"อนุญาตให้ผู้โพสต์แก้ไขโพสต์นี้","delete_topic_disallowed":"คุณไม่ได้รับอนุญาตให้ลบกระทู้นี้","delete_topic":"ลบกระทู้"},"actions":{"people":{"like":{"other":"ถูกใจแล้ว"},"read":{"other":"อ่านแล้ว"},"like_capped":{"other":"และอีก %{count}คนถูกใจสิ่งนี้"},"read_capped":{"other":"และอีก %{count}คนอ่านสิ่งนี้"}},"by_you":{"spam":"คุณปักธงไว้ว่าเป็นสแปม","inappropriate":"คุณปักธงไว้ว่าไม่เหมาะสม","notify_user":"คุณได้ส่งข้อความไปหาผู้ใช้นี้แล้ว"}},"delete":{"confirm":{"other":"คุณแน่ใจหรือว่าต้องการลบ %{count}โพสต์นี้"}},"revisions":{"controls":{"edit_post":"แก้ไขโพสต์","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e%{icon}\u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"button":"HTML"},"side_by_side":{"title":"HTML","button":"HTML"}}},"raw_email":{"displays":{"text_part":{"button":"ข้อความ"},"html_part":{"button":"HTML"}}},"bookmarks":{"create":"สร้างบุ๊กมาร์ก","edit":"แก้ไขบุ๊กมาร์ก","created":"สร้าง","updated":"อัปเดตแล้ว","name":"ชื่อ","name_placeholder":"บุ๊กมาร์กนี้สำหรับสิ่งใด","set_reminder":"เตือนฉัน","actions":{"delete_bookmark":{"name":"ลบบุ๊กมาร์ก"},"edit_bookmark":{"name":"แก้ไขบุ๊กมาร์ก"}}}},"category":{"none":"(ไม่มีหมวดหมู่)","all":"หมวดหมู่ทั้งหมด","edit":"แก้ไข","edit_dialog_title":"แก้ไข: %{categoryName}","view":"ดูกระทู้ในหมวดหมู่","general":"ทั่วไป","settings":"การตั้งค่า","topic_template":"รูปแบบกระทู้","tags":"แท็ก","allow_global_tags_label":"อนุญาตแท็กอื่นด้วย","delete":"ลบหมวดหมู่","create":"หมวดหมู่ใหม่","create_long":"สร้างหมวดหมู่ใหม่","save":"บันทึกหมวดหมู่","creation_error":"มีข้อผิดพลาดขณะสร้างหมวดหมู่","save_error":"มีข้อผิดพลาดในการบันทึกหมวดหมู่","name":"ชื่อหมวดหมู่","description":"รายละเอียด","topic":"กระทู้หมวดหมู่","logo":"รูปโลโก้หมวดหมู่","background_image":"รูปพื้นหลังหมวดหมู่","background_color":"สีพื้นหลัง","name_placeholder":"สูงสุดหนึ่งหรือสองคำ","delete_confirm":"คุณแน่ใจหรือว่าจะลบหมวดหมู่นี้ออก","delete_error":"มีข้อผิดพลาดในการลบหมวดหมู่","no_description":"กรุณาเพิ่มรายละเอียดสำหรับหมวดหมู่นี้","change_in_category_topic":"แก้ไขรายละเอียด","already_used":"สีนี้ถูกใช้สำหรับหมวดหมู่อื่นแล้ว","security":"ความปลอดภัย","pending_permission_change_alert":"คุณยังไม่ได้เพิ่ม %{group} ไปยังหมวดหมู่นี้ คลิกปุ่มนี้เพื่อเพิ่ม","images":"รูปภาพ","email_in_allow_strangers":"ยอมรับอีเมลจากผู้ใช้ที่ไม่ระบุชื่อและไม่มีบัญชี","edit_permissions":"แก้ไขการอนุญาต","review_group_name":"ชื่อกลุ่ม","require_topic_approval":"กระทู้ใหม่ทั้งหมดต้องผ่านการอนุมัติจากผู้ดูแลระบบ","require_reply_approval":"คำตอบใหม่ทั้งหมดต้องผ่านการอนุมัติจากผู้ดูแลระบบ","this_year":"ปีนี้","minimum_required_tags":"จำนวนแท็กขั้นต่ำในกระทู้:","notifications":{"watching":{"title":"กำลังดู"},"watching_first_post":{"title":"กำลังดูโพสต์แรก"},"tracking":{"title":"กำลังติดตาม"},"regular":{"title":"ปกติ","description":"คุณจะได้รับการแจ้งเตือนเมื่อมีคนกล่าวถึงชื่อของคุณ @name หรือตอบคุณ"},"muted":{"title":"ปิด"}},"search_priority":{"options":{"normal":"ปกติ","ignore":"ไม่สนใจ","very_low":"ต่ำมาก","low":"ต่ำ","high":"สูง","very_high":"สูงมาก"}},"sort_options":{"likes":"ถูกใจ","views":"ดู","posts":"โพสต์","activity":"กิจกรรม","posters":"ผู้โพสต์","category":"หมวดหมู่","created":"สร้าง"},"settings_sections":{"general":"ทั่วไป","email":"อีเมล"},"list_filters":{"all":"กระทู้ทั้งหมด","none":"ไม่มีหมวดหมู่ย่อย"}},"flagging":{"notify_action":"ข้อความส่วนตัว","official_warning":"คำเตือนอย่างเป็นทางการ","delete_spammer":"ลบสแปมเมอร์","yes_delete_spammer":"ใช่ ลบสแปมเมอร์","hidden_email_address":"(ถูกซ่อน)","cant":"ขออภัย คุณไม่สามารถปักธงโพสต์นี้ได้ในขณะนี้","notify_staff":"แจ้งทีมงานโดยส่วนตัว","formatted_name":{"inappropriate":"มันไม่เหมาะสม","spam":"มันคือสแปม"},"custom_placeholder_notify_moderators":"บอกเราในเรื่องที่คุณไม่สบายใจ พร้อมส่งลิงก์และตัวอย่างที่เกี่ยวข้องหากเป็นไปได้","custom_message":{"at_least":{"other":"กรอกอย่างน้อย %{count} ตัวอักษร"},"more":{"other":"อีก %{count}..."},"left":{"other":"เหลืออีก %{count}"}}},"flagging_topic":{"action":"ปักธงกระทู้","notify_action":"ข้อความส่วนตัว"},"topic_map":{"title":"สรุปกระทู้","participants_title":"ผู้โพสต์บ่อย","links_title":"ลิงก์ยอดนิยม","links_shown":"แสดงลิงก์เพิ่มอีก...","clicks":{"other":"%{count} คลิก"}},"post_links":{"title":{"other":"อีก %{count}"}},"topic_statuses":{"warning":{"help":"นี่คือคำเตือนอย่างเป็นทางการ"},"bookmarked":{"help":"คุณได้บุ๊กมาร์กกระทู้นี้แล้ว"},"locked":{"help":"กระทู้นี้ถูกปิด ไม่รับคำตอบใหม่อีกต่อไป"},"archived":{"help":"หัวข้อนี้ถูกจัดเก้บแล้ว; นั่นหมายความว่ามันถูกแช่แข็งและไม่สามารถเปลี่ยนแปลงได้"},"locked_and_archived":{"help":"หัวข้อนี้ถูกปิดและถูกจัดเก็บแล้ว; นั่นหมายความว่ามันไม่รับข้อความใหม่และไม่สามารถเปลี่ยนแปลงได้"},"unpinned":{"title":"เลิกปักหมุดแล้ว","help":"เลิกปักหมุดกระทู้นี้แล้ว มันจะถูกแสดงในลำดับปกติ"},"pinned":{"title":"ปักหมุดแล้ว","help":"ปักหมุดกระทู้นี้แล้ว มันจะถูกแสดงด้านบนสุดของหมวดหมู่"},"personal_message":{"title":"กระทู้นี้เป็นข้อความส่วนตัว","help":"กระทู้นี้เป็นข้อความส่วนตัว"}},"posts":"โพสต์","original_post":"โพสต์ต้นฉบับ","views":"ดู","views_lowercase":{"other":"ดู"},"replies":"ตอบ","views_long":{"other":"กระทู้นี้ถูกดู %{number}ครั้ง"},"activity":"กิจกรรม","likes":"ถูกใจ","likes_lowercase":{"other":"ถูกใจ"},"users":"ผู้ใช้","users_lowercase":{"other":"ผู้ใช้"},"category_title":"หมวดหมู่","history":"ประวัติ","changed_by":"โดย %{author}","raw_email":{"not_available":"ไม่พร้อม!"},"categories_list":"รายชื่อหมวดหมู่","filters":{"with_topics":"%{filter} กระทู้","with_category":"%{filter} %{category} กระทู้","latest":{"title":"ล่าสุด","title_with_count":{"other":"ล่าสุด (%{count})"},"help":"กระทู้พร้อมโพสต์ล่าสุด"},"read":{"title":"อ่าน"},"categories":{"title":"หมวดหมู่","title_in":"หมวดหมู่ - %{categoryName}","help":"ทุกกระทู้ถูกจัดกลุ่มโดยหมวดหมู่"},"unread":{"title":"ยังไม่อ่าน","title_with_count":{"other":"ยังไม่อ่าน (%{count})"},"help":"กระทู้ที่คุณกำลังดูหรือติดตามพร้อมโพสต์ที่ยังไม่อ่าน","lower_title_with_count":{"other":"%{count} ยังไม่อ่าน"}},"new":{"lower_title_with_count":{"other":"%{count} ใหม่"},"lower_title":"ใหม่","title":"ใหม่","title_with_count":{"other":"ใหม่ (%{count})"},"help":"กระทู้ที่ถูกสร้างในช่วงไม่กี่วันที่ผ่านมา"},"posted":{"title":"โพสต์ของฉัน","help":"กระทู้ที่คุณได้โพสต์"},"bookmarks":{"title":"บุ๊กมาร์ก","help":"กระทู้ที่คุณได้บุ๊กมาร์ก"},"category":{"title":"%{categoryName}","title_with_count":{"other":"%{categoryName} (%{count})"},"help":"กระทู้ล่าสุดในหมวดหมู่ %{categoryName}"},"top":{"title":"บน","help":"กระทู้ที่มีการเคลื่อนไหวมากที่สุดในปี เดือน สัปดาห์ หรือวันที่ผ่านมา","all":{"title":"ตลอดเวลา"},"yearly":{"title":"รายปี"},"quarterly":{"title":"รายไตรมาส"},"monthly":{"title":"รายเดือน"},"weekly":{"title":"รายสัปดาห์"},"daily":{"title":"รายวัน"},"all_time":"ตลอดเวลา","this_year":"ปี","this_quarter":"ไตรมาส","this_month":"เดือน","this_week":"สัปดาห์","today":"วันนี้","other_periods":"ดูด้านบน:"}},"permission_types":{"full":"สร้าง / ตอบ / ดู","create_post":"ตอบ / ดู","readonly":"ดู"},"lightbox":{"download":"ดาวน์โหลด","close":"ปิด (Esc)"},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":",","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1}หรือ%{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1}%{shortcut2}","title":"ปุ่มลัดของคีย์บอร์ด","jump_to":{"title":"ข้ามไปยัง","home":"%{shortcut} หน้าแรก","latest":"%{shortcut} ล่าสุด","new":"%{shortcut} ใหม่","unread":"%{shortcut} ยังไม่อ่าน","categories":"%{shortcut} หมวดหมู่","top":"%{shortcut} ด้านบน","bookmarks":"%{shortcut} บุ๊กมาร์ก","profile":"%{shortcut} โปรไฟล์","messages":"%{shortcut} ข้อความ","drafts":"%{shortcut}แบบร่าง"},"navigation":{"title":"การนำทาง","jump":"%{shortcut} ไปยังโพสต์ #","back":"%{shortcut} กลับ","up_down":"%{shortcut} ย้ายส่วน \u0026uarr; \u0026darr;","open":"%{shortcut} เปิดกระทู้ที่เลือก","next_prev":"%{shortcut} หมวดถัดไป/ก่อนหน้า","go_to_unread_post":"%{shortcut}ไปยังโพสต์แรกที่ยังไม่ได้อ่าน"},"application":{"title":"แอปพลิเคชัน","create":"%{shortcut} สร้างกระทู้ใหม่","notifications":"%{shortcut} เปิดการแจ้งเตือน","user_profile_menu":"%{shortcut} เปิดเมนูผู้ใช้","show_incoming_updated_topics":"%{shortcut} แสดงกระทู้ที่อัปเดต","search":"%{shortcut}ค้นหา","help":"%{shortcut} เปิดความช่วยเหลือของแป้นพิมพ์","dismiss_new_posts":"%{shortcut} ยกเลิกการโพสใหม่","dismiss_topics":"%{shortcut} ยกเลิกหัวข้อ","log_out":"%{shortcut} ออกจากระบบ"},"bookmarks":{"title":"บุ๊กมาร์ก","enter":"%{shortcut}บันทึกและปิด","later_today":"%{shortcut}ภายหลังในวันนี้","later_this_week":"%{shortcut}ภายหลังในสัปดาห์นี้","tomorrow":"%{shortcut}พรุ่งนี้","next_week":"%{shortcut}สัปดาห์หน้า","next_month":"%{shortcut}เดือนหน้า","next_business_week":"%{shortcut}เริ่มสัปดาห์หน้า","next_business_day":"%{shortcut}วันทำการถัดไป","delete":"%{shortcut}ลบบุ๊กมาร์ก"},"actions":{"title":"การกระทำ","bookmark_topic":"%{shortcut} บุ๊คมาร์คหัวข้อ","pin_unpin_topic":"%{shortcut} ปักหมุด/เลิกปักหมุดกระทู้","share_topic":"%{shortcut} แบ่งปันกระทู้","share_post":"%{shortcut} แบ่งปันโพสต์","reply_as_new_topic":"%{shortcut} ตอบแบบหัวข้อที่ลิงค์ไว้","reply_topic":"%{shortcut} ตอบไปยังกระทู้","reply_post":"%{shortcut} ตอบไปยังโพสต์","quote_post":"%{shortcut} อ้างถึงโพสต์","like":"%{shortcut} ถูกใจโพสต์","flag":"%{shortcut} ปักธงโพสต์","bookmark":"%{shortcut} บุ๊กมาร์กโพสต์","edit":"%{shortcut} แก้ไขโพสต์","delete":"%{shortcut} ลบโพสต์","mark_muted":"%{shortcut} ปิดการแจ้งเตือนกระทู้","mark_regular":"%{shortcut} หัวข้อ ทั่วไป (มาตราฐาน)","mark_tracking":"%{shortcut} ติดตามกระทู้","mark_watching":"%{shortcut} ดูกระทู้","print":"%{shortcut}พิมพ์กระทู้"},"search_menu":{"title":"เมนูค้นหา"}},"badges":{"granted_on":"ได้รับเมื่อ %{date}","title":"เหรียญ","allow_title":"คุณสามารถใช้เหรียญนี้เป็นชื่อเรื่อง","badge_count":{"other":"%{count}เหรียญ"},"more_badges":{"other":"อีก+%{count}"},"select_badge_for_title":"เลือกเหรียญเพื่อใช้เป็นชื่อเรื่อง","none":"(ไม่มี)","badge_grouping":{"getting_started":{"name":"กำลังเริ่มต้น"},"community":{"name":"ชุมชน"},"trust_level":{"name":"ระดับความไว้ใจ"},"other":{"name":"อื่นๆ"},"posting":{"name":"โพสต์"}}},"tagging":{"all_tags":"แท็กทั้งหมด","other_tags":"แท็กอื่น","selector_all_tags":"แท็กทั้งหมด","selector_no_tags":"ไม่มีแท็ก","changed":"เปลี่ยนแท็ก:","tags":"แท็ก","choose_for_topic":"แท็กทางเลือก","info":"ข้อมูล","tag_groups_info":{"other":"แท็กนี้เป็นของกลุ่มเหล่านี้: %{tag_groups}"},"category_restrictions":{"other":"สามารถใช้ได้แค่ในหมวดหมู่เหล่านี้เท่านั้น"},"add_synonyms":"เพิ่ม","delete_tag":"ลบแท็ก","delete_confirm_no_topics":"คุณแน่ใจหรือว่าต้องการลบแท็กนี้","rename_tag":"เปลี่ยนชื่อแท็ก","rename_instructions":"เลือกชื่อใหม่สำหรับแท็ก:","sort_by":"เรียงโดย:","sort_by_count":"นับ","sort_by_name":"ชื่อ","upload":"อัปโหลดแท็ก","upload_successful":"แท็กถูกอัปโหลดสำเร็จแล้ว","delete_unused_confirmation":{"other":"%{count}แท็กจะถูกลบ: %{tags}"},"delete_unused_confirmation_more_tags":{"other":"%{tags}และอีก%{count}"},"delete_unused":"ลบแท็กที่ไม่ได้ใช้","delete_unused_description":"ลบแท็กทั้งหมดที่ไม่ได้ถูกติดในกระทู้หรือข้อความส่วนตัวใดๆ","cancel_delete_unused":"ยกเลิก","filters":{"without_category":"%{filter} %{tag} กระทู้","with_category":"%{filter} %{tag} กระทู้ใน %{category}"},"notifications":{"watching":{"title":"กำลังดู"},"watching_first_post":{"title":"กำลังดูโพสต์แรก"},"tracking":{"title":"กำลังติดตาม"},"regular":{"title":"ทั่วไป"},"muted":{"title":"ปิด"}},"groups":{"new":"กลุ่มใหม่","tags_label":"แท็กในกลุ่มนี้:","one_per_topic_label":"จำกัดหนึ่งแท็กต่อหนึ่งกระทู้จากกลุ่มนี้","save":"บันทึก","delete":"ลบ","everyone_can_use":"ทุกคนสามารถใช้แท็กได้"},"topics":{"none":{"unread":"คุณไม่มีกระทู้ที่ยังไม่ได้อ่าน","new":"คุณไม่มีกระทู้ใหม่","read":"คุณยังไม่ได้อ่านกระทู้ใดๆเลย","posted":"คุณยังไม่ได้โพสต์ในกระทู้ใดๆเลย","latest":"ไม่มีกระทู้ล่าสุด","bookmarks":"คุณยังไม่ได้บุ๊กมาร์กกระทู้ใดๆเลย","top":"ไม่มีกระทู้ยอดนิยม"}}},"invite":{"custom_message_template_topic":"สวัสดี ฉันคิดว่าคุณอาจชอบกระทู้นี้!"},"footer_nav":{"back":"กลับ","forward":"ส่งต่อ","share":"แบ่งปัน","dismiss":"ซ่อน"},"details":{"title":"ซ่อนรายละเอียด"},"cakeday":{"today":"วันนี้","tomorrow":"พรุ่งนี้","all":"ทั้งหมด"},"discourse_local_dates":{"create":{"form":{"insert":"เพิ่ม","advanced_mode":"ระดับสูง","simple_mode":"ระดับพื้นฐาน","timezones_title":"เขตเวลาที่จะแสดง","recurring_title":"ซ้ำ","recurring_none":"ไม่ซ้ำ","invalid_date":"รูปแบบวันที่ไม่ถูกต้อง, ตรวจให้แน่ใจว่าวันที่และเวลาถูกต้อง","date_title":"วันที่","time_title":"เวลา","format_title":"รูปแบบวันที่","timezone":"เขตเวลา"}}},"poll":{"voters":{"other":"ผู้โหวต"},"total_votes":{"other":"คะแนนโหวตทั้งหมด"},"average_rating":"คะแนนเฉลี่ย: \u003cstrong\u003e%{average}\u003c/strong\u003e","cast-votes":{"title":"โหวต","label":"โหวตเดี๋ยวนี้"},"show-results":{"title":"แสดงผลโหวต","label":"แสดงผล"},"hide-results":{"title":"กลับสู่การโหวต"},"export-results":{"label":"ส่งออก"},"open":{"title":"เปิดโพล","label":"เปิด","confirm":"คุณแน่ใจหรือไม่ที่จะเปิดโพลนี้"},"close":{"title":"ปิดโพล","label":"ปิด","confirm":"คุณแน่ใจหรือไม่ที่จะปิดโพลนี้"},"error_while_toggling_status":"ขออภัย มีข้อผิดพลาดในการแสดงสถานะของโพล","error_while_casting_votes":"ขออภัย มีข้อผิดพลาดในการโหวต","error_while_fetching_voters":"ขออภัย มีข้อผิดพลาดในการแสดงผู้โหวต","ui_builder":{"title":"สร้างโพล","insert":"แทรกโพล","help":{"invalid_values":"ค่าต่ำสุดต้องน้อยกว่าค่าสูงสุด"},"poll_type":{"label":"ชนิด"},"poll_public":{"label":"แสดงรายชื่อผู้โหวต"},"poll_options":{"label":"ใส่ตัวเลือกบรรทัดละ 1 ตัวเลือก"}}}}},"en":{"js":{"number":{"human":{"storage_units":{"units":{"byte":{"one":"Byte"}}}}},"dates":{"tiny":{"less_than_x_seconds":{"one":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m"},"about_x_hours":{"one":"%{count}h"},"x_days":{"one":"%{count}d"},"x_months":{"one":"%{count}mon"},"about_x_years":{"one":"%{count}y"},"over_x_years":{"one":"\u003e %{count}y"},"almost_x_years":{"one":"%{count}y"}},"medium":{"x_minutes":{"one":"%{count} min"},"x_hours":{"one":"%{count} hour"},"x_days":{"one":"%{count} day"}},"medium_with_ago":{"x_minutes":{"one":"%{count} min ago"},"x_hours":{"one":"%{count} hour ago"},"x_days":{"one":"%{count} day ago"},"x_months":{"one":"%{count} month ago"},"x_years":{"one":"%{count} year ago"}},"later":{"x_days":{"one":"%{count} day later"},"x_months":{"one":"%{count} month later"},"x_years":{"one":"%{count} year later"}}},"share":{"twitter":"Share on Twitter","facebook":"Share on Facebook","email":"Send via email","url":"Copy and share URL"},"action_codes":{"autobumped":"automatically bumped %{when}"},"topic_admin_menu":"topic actions","wizard_required":"Welcome to your new Discourse! Let’s get started with \u003ca href='%{url}' data-auto-route='true'\u003ethe setup wizard\u003c/a\u003e ✨","bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined.","other":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} users have joined."},"bootstrap_mode_disabled":"Bootstrap mode will be disabled within 24 hours.","themes":{"broken_theme_alert":"Your site may not work because theme / component %{theme} has errors. Disable it at %{path}."},"links_lowercase":{"one":"link"},"character_count":{"one":"%{count} character"},"bookmarked":{"help":{"unbookmark_with_reminder":"Click to remove all bookmarks and reminders in this topic. You have a reminder set %{reminder_at} for this topic."}},"bookmarks":{"created":"You've bookmarked this post. %{name}","created_with_reminder":"You've bookmarked this post with a reminder %{date}. %{name}","confirm_delete":"Are you sure you want to delete this bookmark? The reminder will also be deleted.","no_timezone":"You have not set a timezone yet. You will not be able to set reminders. Set one up \u003ca href=\"%{basePath}/my/preferences/profile\"\u003ein your profile\u003c/a\u003e.","no_user_bookmarks":"You have no bookmarked posts; bookmarks allow you to quickly refer to specific posts.","auto_delete_preference":{"when_reminder_sent":"Once the reminder is sent"},"search_placeholder":"Search bookmarks by name, topic title, or post content","reminders":{"post_local_date":"Date in post","none":"No reminder needed","existing_reminder":"You have a reminder set for this bookmark which will be sent %{at_date_time}"}},"drafts":{"remove_confirmation":"Are you sure you want to delete this draft?"},"topic_count_latest":{"one":"See %{count} new or updated topic"},"topic_count_unread":{"one":"See %{count} unread topic"},"topic_count_new":{"one":"See %{count} new topic"},"deleting":"Deleting...","review":{"explain":{"why":"explain why this item ended up in the queue","title":"Reviewable Scoring","formula":"Formula","subtotal":"Subtotal","min_score_visibility":"Minimum Score for Visibility","score_to_hide":"Score to Hide Post","take_action_bonus":{"name":"took action","title":"When a staff member chooses to take action the flag is given a bonus."},"user_accuracy_bonus":{"name":"user accuracy","title":"Users whose flags have been historically agreed with are given a bonus."},"trust_level_bonus":{"title":"Reviewable items created by higher trust level users have a higher score."},"type_bonus":{"name":"type bonus","title":"Certain reviewable types can be assigned a bonus by staff to make them a higher priority."}},"claim_help":{"optional":"You can claim this item to prevent others from reviewing it.","required":"You must claim items before you can review them.","claimed_by_you":"You've claimed this item and can review it.","claimed_by_other":"This item can only be reviewed by \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"claim this topic"},"unclaim":{"help":"remove this claim"},"settings":{"priorities":{"title":"Reviewable Priorities"}},"moderation_history":"Moderation History","none":"There are no items to review.","view_pending":"view pending","topic_has_pending":{"one":"This topic has \u003cb\u003e%{count}\u003c/b\u003e post pending approval"},"filtered_topic":"You have filtered to reviewable content in a single topic.","filtered_reviewed_by":"Reviewed By","user":{"bio":"Bio","fields":"Fields","reject_reason":"Reason"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"},"agreed":{"one":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore"}},"topics":{"reviewable_count":"Count","reported_by":"Reported by","unique_users":{"one":"%{count} user"}},"replies":{"one":"%{count} reply"},"new_topic":"Approving this item will create a new topic","filters":{"orders":{"score_asc":"Score (reverse)","created_at_asc":"Created At (reverse)"},"priority":{"title":"Minimum Priority","low":"(any)"}},"scores":{"about":"This score is calculated based on the trust level of the reporter, the accuracy of their previous flags, and the priority of the item being reported."},"types":{"reviewable_queued_topic":{"title":"Queued Topic"},"reviewable_queued_post":{"title":"Queued Post"}},"approval":{"pending_posts":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e post pending."}},"example_username":"username","reject_reason":{"title":"Why are you rejecting this user?","send_email":"Send rejection email"}},"directory":{"username":"Username","total_rows":{"one":"%{count} user"}},"group_histories":{"actions":{"remove_user_as_group_owner":"Revoke owner"}},"groups":{"add_members":{"title":"Add members to %{group_name}","description":"You can also paste in a comma separated list.","usernames":"Enter usernames or email addresses","input_placeholder":"Usernames or emails","notify_users":"Notify users"},"requests":{"undone":"request undone","handle":"handle membership request"},"manage":{"interaction":{"title":"Interaction"},"email":{"status":"Synchronized %{old_emails} / %{total_emails} emails via IMAP.","credentials":{"title":"Credentials","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"Use SSL for SMTP","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"Use SSL for IMAP"},"mailboxes":{"synchronized":"Synchronized Mailbox","none_found":"No mailboxes were found in this email account.","disabled":"disabled"}},"categories":{"title":"Categories","long_title":"Category default notifications","description":"When users are added to this group, their category notification settings will be set to these defaults. Afterwards, they can change them.","watched_categories_instructions":"Automatically watch all topics in these categories. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_categories_instructions":"Automatically track all topics in these categories. A count of new posts will appear next to the topic.","watching_first_post_categories_instructions":"Users will be notified of the first post in each new topic in these categories.","regular_categories_instructions":"If these categories are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_categories_instructions":"Users will not be notified of anything about new topics in these categories, and they will not appear on the categories or latest topics pages."},"tags":{"title":"Tags","long_title":"Tags default notifications","description":"When users are added to this group, their tag notification settings will be set to these defaults. Afterwards, they can change them.","watched_tags_instructions":"Automatically watch all topics with these tags. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_tags_instructions":"Automatically track all topics with these tags. A count of new posts will appear next to the topic.","watching_first_post_tags_instructions":"Users will be notified of the first post in each new topic with these tags.","regular_tags_instructions":"If these tags are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_tags_instructions":"Users will not be notified of anything about new topics with these tags, and they will not appear in latest."},"logs":{"title":"Logs","action":"Action"}},"permissions":{"title":"Permissions","none":"There are no categories associated with this group.","description":"Members of this group can access these categories"},"public_admission":"Allow users to join the group freely (Requires publicly visible group)","empty":{"logs":"There are no logs for this group."},"allow_membership_requests":"Allow users to send membership requests to group owners (Requires publicly visible group)","membership_request_template":"Custom template to display to users when sending a membership request","index":{"filter":"Filter by group type"},"title":{"one":"Group"},"notification_level":"Default notification level for group messages","flair_url":"Avatar Flair Image","flair_bg_color":"Avatar Flair Background Color","flair_bg_color_placeholder":"(Optional) Hex color value","flair_color":"Avatar Flair Color","flair_color_placeholder":"(Optional) Hex color value"},"categories":{"muted":"Muted categories","topic_sentence":{"one":"%{count} topic"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month."},"n_more":"Categories (%{count} more)..."},"ip_lookup":{"powered_by":"using \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e"},"user_fields":{"required":"Please enter a value for \"%{name}\""},"user":{"user_notifications":{"ignore_duration_note":"Please note that all ignores are automatically removed after the ignore duration expires."},"desktop_notifications":{"each_browser_note":"Note: You have to change this setting on every browser you use. All notifications will be disabled when in \"do not disturb\", regardless of this setting."},"skip_new_user_tips":{"description":"Skip new user onboarding tips and badges","not_first_time":"Not your first time?","skip_link":"Skip these tips"},"color_scheme_default_on_all_devices":"Set default color scheme(s) on all my devices","color_scheme":"Color Scheme","color_schemes":{"default_description":"Theme default","disable_dark_scheme":"Same as regular","dark_instructions":"You can preview the dark mode color scheme by toggling your device's dark mode.","undo":"Reset","regular":"Regular","dark":"Dark mode","default_dark_scheme":"(site default)"},"dark_mode":"Dark Mode","dark_mode_enable":"Enable automatic dark mode color scheme","enable_defer":"Enable defer to mark topics unread","silenced_tooltip":"This user is silenced","github_profile":"GitHub","mailing_list_mode":{"warning":"Mailing list mode enabled. Email notification settings are overridden."},"watched_tags_instructions":"You will automatically watch all topics with these tags. You will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_tags_instructions":"You will automatically track all topics with these tags. A count of new posts will appear next to the topic.","muted_tags_instructions":"You will not be notified of anything about new topics with these tags, and they will not appear in latest.","watched_categories_instructions":"You will automatically watch all topics in these categories. You will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_categories_instructions":"You will automatically track all topics in these categories. A count of new posts will appear next to the topic.","watched_first_post_categories_instructions":"You will be notified of the first post in each new topic in these categories.","watched_first_post_tags_instructions":"You will be notified of the first post in each new topic with these tags.","muted_categories_instructions":"You will not be notified of anything about new topics in these categories, and they will not appear on the categories or latest pages.","muted_categories_instructions_dont_hide":"You will not be notified of anything about new topics in these categories.","regular_categories":"Regular","regular_categories_instructions":"You will see these categories in the “Latest” and “Top” topic lists.","no_category_access":"As a moderator you have limited category access, save is disabled.","delete_yourself_not_allowed":"Please contact a staff member if you wish your account to be deleted.","muted_users_instructions":"Suppress all notifications and PMs from these users.","allowed_pm_users":"Allowed","allowed_pm_users_instructions":"Only allow PMs from these users.","allow_private_messages_from_specific_users":"Only allow specific users to send me personal messages","revoke_access":"Revoke Access","undo_revoke_access":"Undo Revoke Access","staged":"Staged","preferences_nav":{"interface":"Interface"},"change_password":{"emoji":"lock emoji"},"second_factor_backup":{"title":"Two-Factor Backup Codes","regenerate":"Regenerate","enable_long":"Enable backup codes","manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"copy_to_clipboard":"Copy to Clipboard","copy_to_clipboard_error":"Error copying data to Clipboard","copied_to_clipboard":"Copied to Clipboard","download_backup_codes":"Download backup codes","remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"use":"Use a backup code","enable_prerequisites":"You must enable a primary two-factor method before generating backup codes.","codes":{"title":"Backup Codes Generated","description":"Each of these backup codes can only be used once. Keep them somewhere safe but accessible."}},"second_factor":{"title":"Two-Factor Authentication","enable":"Manage Two-Factor Authentication","disable_all":"Disable All","label":"Code","rate_limit":"Please wait before trying another authentication code.","enable_description":"Scan this QR code in a supported app (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) and enter your authentication code.\n","disable_description":"Please enter the authentication code from your app","show_key_description":"Enter manually","short_description":"Protect your account with one-time use security codes.\n","extended_description":"Two-factor authentication adds extra security to your account by requiring a one-time token in addition to your password. Tokens can be generated on \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e and \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e devices.\n","oauth_enabled_warning":"Please note that social logins will be disabled once two-factor authentication has been enabled on your account.","use":"Use Authenticator app","enforced_notice":"You are required to enable two-factor authentication before accessing this site.","disable_confirm":"Are you sure you want to disable all two-factor methods?","edit_title":"Edit Authenticator","edit_description":"Authenticator Name","enable_security_key_description":"When you have your \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003ehardware security key\u003c/a\u003e prepared, press the Register button below.\n","totp":{"title":"Token-Based Authenticators","add":"Add Authenticator","default_name":"My Authenticator","name_and_code_required_error":"You must provide a name and the code from your authenticator app."},"security_key":{"title":"Security Keys","add":"Add Security Key","default_name":"Main Security Key","not_allowed_error":"The security key registration process either timed out or was cancelled.","already_added_error":"You have already registered this security key. You don’t have to register it again.","edit":"Edit Security Key","edit_description":"Security Key Name","name_required_error":"You must provide a name for your security key."}},"change_email":{"success_via_admin":"We've sent an email to that address. The user will need to follow the confirmation instructions in the email."},"change_avatar":{"gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, based on","gravatar_title":"Change your avatar on %{gravatarName}'s website"},"change_profile_background":{"title":"Profile Header","instructions":"Profile headers will be centered and have a default width of 1110px."},"email":{"sso_override_instructions":"Email can be updated from SSO provider.","admin_note":"Note: An admin user changing another non-admin user's email indicates the user has lost access to their original email account, so a reset password email will be sent to their new address. The user's email will not change until they complete the reset password process.","frequency":{"one":"We'll only email you if we haven't seen you in the last minute."}},"associated_accounts":{"title":"Associated Accounts","confirm_description":{"account_specific":"Your %{provider} account '%{account_description}' will be used for authentication.","generic":"Your %{provider} account will be used for authentication."}},"invite_code":{"instructions":"Account registration requires an invite code"},"auth_tokens":{"device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactive now\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"hide_profile_and_presence":"Hide my public profile and presence features","enable_physical_keyboard":"Enable physical keyboard support on iPad","title_count_mode":{"title":"Background page title displays count of:","contextual":"New page content"},"email_level":{"only_when_away":"only when away"},"notification_level_when_replying":"When I post in a topic, set that topic to","invited":{"truncated":{"one":"Showing the first invite."},"link_redemption_stats":"Redemptions","create":"Invite","copy_link":"Show Link","generate_link":"Create Invite Link","link_generated":"Here's your invite link!","single_user":"Invite by email","multiple_user":"Invite by link","bulk_invite":{"none":"No invitations to display on this page.","text":"Bulk Invite","error":"Sorry, file should be CSV format.","confirmation_message":"You’re about to email invites to everyone in the uploaded file."}},"summary":{"topic_count":{"one":"topic created"},"post_count":{"one":"post created"},"likes_given":{"one":"given"},"likes_received":{"one":"received"},"days_visited":{"one":"day visited"},"topics_entered":{"one":"topic viewed"},"posts_read":{"one":"post read"},"bookmark_count":{"one":"bookmark"}},"date_of_birth":{"user_title":"Today is your birthday!","title":"Today is my birthday!","label":"Date of Birth"},"anniversary":{"user_title":"Today is the anniversary of the day you joined our community!","title":"Today is the anniversary of the day I joined this community!"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"logs_error_rate_notice":{},"replies_lowercase":{"one":"reply"},"signup_cta":{"intro":"Hello! Looks like you’re enjoying the discussion, but you haven’t signed up for an account yet.","value_prop":"When you create an account, we remember exactly what you’ve read, so you always come right back where you left off. You also get notifications, here and via email, whenever someone replies to you. And you can like posts to share the love. :heartpulse:"},"private_message_info":{"invite":"Invite Others...","edit":"Add or Remove...","remove":"Remove...","add":"Add..."},"forgot_password":{"complete_username_found":"We found an account that matches the username \u003cb\u003e%{username}\u003c/b\u003e. You should receive an email with instructions on how to reset your password shortly.","complete_email_found":"We found an account that matches \u003cb\u003e%{email}\u003c/b\u003e. You should receive an email with instructions on how to reset your password shortly.","help":"Email not arriving? Be sure to check your spam folder first.\u003cp\u003eNot sure which email address you used? Enter an email address and we’ll let you know if it exists here.\u003c/p\u003e\u003cp\u003eIf you no longer have access to the email address on your account, please contact \u003ca href='%{basePath}/about'\u003eour helpful staff.\u003c/a\u003e\u003c/p\u003e"},"email_login":{"link_label":"Email me a login link","emoji":"lock emoji","complete_username":"If an account matches the username \u003cb\u003e%{username}\u003c/b\u003e, you should receive an email with a login link shortly.","complete_email":"If an account matches \u003cb\u003e%{email}\u003c/b\u003e, you should receive an email with a login link shortly.","complete_username_found":"We found an account that matches the username \u003cb\u003e%{username}\u003c/b\u003e, you should receive an email with a login link shortly.","complete_email_found":"We found an account that matches \u003cb\u003e%{email}\u003c/b\u003e, you should receive an email with a login link shortly."},"login":{"second_factor_title":"Two-Factor Authentication","second_factor_description":"Please enter the authentication code from your app:","second_factor_backup":"Log in using a backup code","second_factor_backup_title":"Two-Factor Backup","second_factor_backup_description":"Please enter one of your backup codes:","second_factor":"Log in using Authenticator app","security_key_description":"When you have your physical security key prepared press the Authenticate with Security Key button below.","security_key_authenticate":"Authenticate with Security Key","security_key_not_allowed_error":"The security key authentication process either timed out or was cancelled.","security_key_no_matching_credential_error":"No matching credentials could be found in the provided security key.","security_key_support_missing_error":"Your current device or browser does not support the use of security keys. Please use a different method.","not_allowed_from_ip_address":"You can't log in from that IP address.","omniauth_disallow_totp":"Your account has two-factor authentication enabled. Please log in with your password.","discord":{"name":"Discord"},"second_factor_toggle":{"totp":"Use an authenticator app instead","backup_code":"Use a backup code instead"}},"invites":{"emoji":"envelope emoji","social_login_available":"You'll also be able to sign in with any social login using that email.","password_label":"Password"},"emoji_set":{"emoji_one":"JoyPixels (formerly EmojiOne)"},"category_page_style":{"categories_boxes":"Boxes with Subcategories","categories_boxes_with_topics":"Boxes with Featured Topics"},"category_row":{"topic_count":{"one":"%{count} topic in this category","other":"%{count} topics in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory","other":"%{name} and %{count} subcategories"},"plus_subcategories":{"one":"+ %{count} subcategory","other":"+ %{count} subcategories"}},"select_kit":{"max_content_reached":{"one":"You can only select %{count} item."},"min_content_not_reached":{"one":"Select at least %{count} item."},"invalid_selection_length":{"one":"Selection must be at least %{count} character.","other":"Selection must be at least %{count} characters."},"components":{"categories_admin_dropdown":{"title":"Manage categories"}}},"date_time_picker":{"errors":{"to_before_from":"To date must be later than from date."}},"shared_drafts":{"destination_category":"Destination Category"},"composer":{"unlist":"unlisted","toggle_unlisted":"Toggle Unlisted","edit_conflict":"edit conflict","group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"group_mentioned":{"one":"By mentioning %{group}, you are about to notify \u003ca href='%{group_link}'\u003e%{count} person\u003c/a\u003e – are you sure?","other":"By mentioning %{group}, you are about to notify \u003ca href='%{group_link}'\u003e%{count} people\u003c/a\u003e – are you sure?"},"cannot_see_mention":{"category":"You mentioned %{username} but they won't be notified because they do not have access to this category. You will need to add them to a group that has access to this category.","private":"You mentioned %{username} but they won't be notified because they are unable to see this personal message. You will need to invite them to this PM."},"error":{"tags_missing":{"one":"You must choose at least %{count} tag","other":"You must choose at least %{count} tags"},"topic_template_not_modified":"Please add details and specifics to your topic by editing the topic template."},"overwrite_edit":"Overwrite Edit","create_whisper":"Whisper","create_shared_draft":"Create Shared Draft","edit_shared_draft":"Edit Shared Draft","blockquote_title":"Blockquote","toggle_direction":"Toggle Direction","show_toolbar":"show composer toolbar","hide_toolbar":"hide composer toolbar","slow_mode":{"error":"This topic is in slow mode. In order to promote thoughtful, considered discussion you may only post once every %{duration}."},"composer_actions":{"reply_to_post":{"label":"Reply to a post by %{postUsername}"},"reply_as_new_topic":{"label":"Reply as linked topic","desc":"Create a new topic linked to this topic","confirm":"You have a new topic draft saved, which will be overwritten if you create a linked topic."},"reply_as_new_group_message":{"label":"Reply as new group message","desc":"Create a new private message with the same recipients"},"reply_to_topic":{"desc":"Reply to the topic, not any specific post"},"toggle_whisper":{"label":"Toggle whisper","desc":"Whispers are only visible to staff members"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"},"toggle_topic_bump":{"label":"Toggle topic bump"}},"reload":"Reload","ignore":"Ignore"},"notifications":{"tooltip":{"regular":{"one":"%{count} unseen notification"},"message":{"one":"%{count} unread message"},"high_priority":{"one":"%{count} unread high priority notification"}},"reviewable_items":"items requiring review","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} others\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"liked %{count} of your posts"},"granted_badge":"Earned '%{description}'","membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - completed","group_message_summary":{"one":"%{count} message in your %{group_name} inbox"},"titles":{"moved_post":"post moved","linked":"linked","bookmark_reminder":"bookmark reminder","bookmark_reminder_with_name":"bookmark reminder - %{name}","granted_badge":"badge granted","group_mentioned":"group mentioned","topic_reminder":"topic reminder","membership_request_consolidated":"new membership requests","reaction":"new reaction","votes_released":"Vote was released"}},"search":{"result_count":{"one":"\u003cspan\u003e%{count} result for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} results for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"results_page":"Search results for '%{term}'","more_results":"There are more results. Please narrow your search criteria.","search_button":"Search","advanced":{"with_badge":{"label":"With Badge"},"filters":{"label":"Only return topics/posts...","title":"Matching in title only","wiki":"are wiki"},"post":{"count":{"label":"Posts"},"min":{"placeholder":"minimum"},"max":{"placeholder":"maximum"}},"views":{"label":"Views"},"min_views":{"placeholder":"minimum"},"max_views":{"placeholder":"maximum"}}},"topics":{"bulk":{"relist_topics":"Relist Topics","selected":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e topic."},"append_tags":"Append Tags","choose_append_tags":"Choose new tags to append for these topics:","remove_tags":"Remove Tags","progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic","other":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topics"}},"none":{"ready_to_create":"Ready to ","latest":"You're all caught up!","educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e","unread":"\u003cp\u003eYour unread topics appear here.\u003c/p\u003e\u003cp\u003eBy default, topics are considered unread and will show unread counts \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e if you:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreated the topic\u003c/li\u003e\u003cli\u003eReplied to the topic\u003c/li\u003e\u003cli\u003eRead the topic for more than 4 minutes\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOr if you have explicitly set the topic to Tracked or Watched via the notification control at the bottom of each topic.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}},"bottom":{"tag":"There are no more %{tag} topics."}},"topic":{"filter_to":{"one":"%{count} post in topic"},"defer":{"title":"Defer"},"feature_on_profile":{"help":"Add a link to this topic on your user card and profile","title":"Feature On Profile"},"remove_from_profile":{"warning":"Your profile already has a featured topic. If you continue, this topic will replace the existing topic.","help":"Remove the link to this topic on your user profile"},"new_topics":{"one":"%{count} new topic"},"unread_topics":{"one":"%{count} unread topic"},"total_unread_posts":{"one":"you have %{count} unread post in this topic"},"unread_posts":{"one":"you have %{count} unread old post in this topic"},"new_posts":{"one":"there is %{count} new post in this topic since you last read it"},"likes":{"one":"there is %{count} like in this topic"},"toggle_information":"toggle topic details","browse_all_categories":"Browse all categories","browse_all_tags":"Browse all tags","suggest_create_topic":"start a new conversation?","slow_mode_update":{"title":"Slow Mode","select":"Users may only post in this topic once every:","description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","save":"Enable","enabled_until":"(Optional) Enabled until:","remove":"Disable","hours":"Hours:","minutes":"Minutes:","seconds":"Seconds:","durations":{"15_minutes":"15 Minutes","1_hour":"1 Hour","4_hours":"4 Hours","1_day":"1 Day","1_week":"1 Week","custom":"Custom Duration"}},"slow_mode_notice":{"duration":"You need to wait %{duration} between posts in this topic"},"topic_status_update":{"title":"Topic Timer","save":"Set Timer","remove":"Remove Timer","time_frame_required":"Please select a time frame"},"auto_update_input":{"none":"Select a timeframe","set_based_on_last_post":"Close based on last post"},"publish_to_category":{"title":"Schedule Publishing"},"auto_close":{"label":"Auto-close topic hours:"},"auto_bump":{"title":"Auto-Bump Topic"},"status_update_notice":{"auto_publish_to_category":"This topic will be published to \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_bump":"This topic will be automatically bumped %{timeLeft}."},"auto_close_immediate":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed immediately."},"progress":{"title":"topic progress"},"notifications":{"reasons":{"mailing_list_mode":"You have mailing list mode enabled, so you will be notified of replies to this topic via email.","0_7":"You are ignoring all notifications in this category."},"muted":{"description":"You will never be notified of anything about this topic, and it will not appear in latest."}},"actions":{"slow_mode":"Set Slow Mode","timed_update":"Set Topic Timer...","reset_bump_date":"Reset Bump Date"},"clear_pin":{"help":"Clear the pinned status of this topic so it no longer appears at the top of your topic list"},"print":{"help":"Open a printer friendly version of this topic"},"make_public":{"title":"Convert to Public Topic"},"feature_topic":{"pin_note":"Users can unpin the topic individually for themselves.","already_pinned":{"one":"Topics currently pinned in %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"},"global_pin_note":"Users can unpin the topic individually for themselves.","not_pinned_globally":"There are no topics pinned globally.","already_pinned_globally":{"one":"Topics currently pinned globally: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Topics currently pinned globally: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"}},"automatically_add_to_groups":"This invite also includes access to these groups:","invite_private":{"not_allowed":"Sorry, that user can't be invited."},"invite_reply":{"success_email":"We mailed out an invitation to \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. We'll notify you when the invitation is redeemed. Check the invitations tab on your user page to keep track of your invites.","error":"Sorry, we couldn't invite that person. Perhaps they have already been invited? (Invites are rate limited)"},"filters":{"n_posts":{"one":"%{count} post"}},"split_topic":{"instructions":{"one":"You are about to create a new topic and populate it with the post you've selected.","other":"You are about to create a new topic and populate it with the \u003cb\u003e%{count}\u003c/b\u003e posts you've selected."}},"merge_topic":{"instructions":{"one":"Please choose the topic you'd like to move that post to."}},"move_to_new_message":{"participants":"Participants","instructions":{"one":"You are about to create a new message and populate it with the post you've selected.","other":"You are about to create a new message and populate it with the \u003cb\u003e%{count}\u003c/b\u003e posts you've selected."}},"move_to_existing_message":{"participants":"Participants","instructions":{"one":"Please choose the message you'd like to move that post to."}},"merge_posts":{"title":"Merge Selected Posts","action":"merge selected posts","error":"There was an error merging the selected posts."},"publish_page":{"description":"When a topic is published as a page, its URL can be shared and it will displayed with custom styling.","slug":"Slug","public_description":"People can see the page even if the associated topic is private."},"change_owner":{"instructions":{"one":"Please choose a new owner for the post by \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Please choose a new owner for the post"}},"change_timestamp":{"title":"Change Timestamp...","invalid_timestamp":"Timestamp cannot be in the future.","error":"There was an error changing the timestamp of the topic.","instructions":"Please select the new timestamp of the topic. Posts in the topic will be updated to have the same time difference."},"multi_select":{"description":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e post."}},"deleted_by_author":{"one":"(topic withdrawn by author, will be automatically deleted in %{count} hour unless flagged)"}},"post":{"quote_share":"Share","ignored":"Ignored content","wiki_last_edited_on":"wiki last edited on","continue_discussion":"Continuing the discussion from %{postLink}:","show_hidden":"View ignored content.","deleted_by_author":{"one":"(post withdrawn by author, will be automatically deleted in %{count} hour unless flagged)"},"collapse":"collapse","gap":{"one":"view %{count} hidden reply"},"has_replies":{"one":"%{count} Reply"},"has_replies_count":"%{count}","has_likes_title":{"one":"%{count} person liked this post"},"has_likes_title_you":{"one":"you and %{count} other person liked this post"},"filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","errors":{"file_too_large":"Sorry, that file is too big (maximum size is %{max_size_kb}kb). Why not upload your large file to a cloud sharing service, then paste the link?","too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."},"upload_not_authorized":"Sorry, the file you are trying to upload is not authorized (authorized extensions: %{authorized_extensions})."},"abandon":{"title":"Abandon Draft"},"via_auto_generated_email":"this post arrived via an auto generated email","controls":{"flag":"privately flag this post for attention or send a private notification about it","delete_replies":{"direct_replies":{"one":"Yes, and %{count} direct reply"},"all_replies":{"one":"Yes, and %{count} reply"}},"admin":"post admin actions","wiki":"Make Wiki","unwiki":"Remove Wiki","convert_to_moderator":"Add Staff Color","revert_to_regular":"Remove Staff Color","rebake":"Rebuild HTML","change_owner":"Change Ownership","grant_badge":"Grant Badge","delete_topic_disallowed_modal":"You don't have permission to delete this topic. If you really want it to be deleted, submit a flag for moderator attention together with reasoning.","delete_topic_confirm_modal":"This topic currently has over %{minViews} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic","add_post_notice":"Add Staff Notice","change_post_notice":"Change Staff Notice","delete_post_notice":"Delete Staff Notice","remove_timer":"remove timer"},"actions":{"people":{"like":{"one":"liked this"},"read":{"one":"read this"},"like_capped":{"one":"and %{count} other liked this"},"read_capped":{"one":"and %{count} other read this"}},"by_you":{"off_topic":"You flagged this as off-topic","notify_moderators":"You flagged this for moderation"}},"delete":{"confirm":{"one":"Are you sure you want to delete that post?"}},"merge":{"confirm":{"one":"Are you sure you want to merge those posts?","other":"Are you sure you want to merge those %{count} posts?"}},"revisions":{"controls":{"first":"First revision","previous":"Previous revision","next":"Next revision","last":"Last revision","hide":"Hide revision","show":"Show revision","revert":"Revert to revision %{revision}","edit_wiki":"Edit Wiki"},"displays":{"inline":{"title":"Show the rendered output with additions and removals inline"},"side_by_side_markdown":{"title":"Show the raw source diffs side-by-side","button":"Raw"}}},"raw_email":{"displays":{"raw":{"title":"Show the raw email","button":"Raw"},"text_part":{"title":"Show the text part of the email"},"html_part":{"title":"Show the html part of the email"}}},"bookmarks":{"actions":{"delete_bookmark":{"description":"Removes the bookmark from your profile and stops all reminders for the bookmark"},"edit_bookmark":{"description":"Edit the bookmark name or change the reminder date and time"}}},"filtered_replies":{"viewing_posts_by":"Viewing %{post_count} posts by","viewing_subset":"Some replies are collapsed","viewing_summary":"Viewing a summary of this topic","post_number":"%{username}, post #%{post_number}","show_all":"Show all"}},"category":{"can":"can\u0026hellip; ","choose":"category\u0026hellip;","back":"Back to category","tags_allowed_tags":"Restrict these tags to this category:","tags_allowed_tag_groups":"Restrict these tag groups to this category:","tags_placeholder":"(Optional) list of allowed tags","tags_tab_description":"Tags and tag groups specified above will only be available in this category and other categories that also specify them. They won't be available for use in other categories.","tag_groups_placeholder":"(Optional) list of allowed tag groups","manage_tag_groups_link":"Manage tag groups","tag_group_selector_placeholder":"(Optional) Tag group","required_tag_group_description":"Require new topics to have tags from a tag group:","min_tags_from_required_group_label":"Num Tags:","required_tag_group_label":"Tag group:","topic_featured_link_allowed":"Allow featured links in this category","slug":"Category Slug","slug_placeholder":"(Optional) dashed-words for url","badge_colors":"Badge colors","foreground_color":"Foreground color","color_placeholder":"Any web color","list":"List Categories","security_add_group":"Add a group","permissions":{"group":"Group","see":"See","reply":"Reply","create":"Create","no_groups_selected":"No groups have been granted access; this category will only be visible to staff.","everyone_has_access":"This category is public, everyone can see, reply and create posts. To restrict permissions, remove one or more of the permissions granted to the \"everyone\" group.","toggle_reply":"Toggle Reply permission","toggle_full":"Toggle Create permission","inherited":"This permission is inherited from \"everyone\""},"special_warning":"Warning: This category is a pre-seeded category and the security settings cannot be edited. If you do not wish to use this category, delete it instead of repurposing it.","uncategorized_security_warning":"This category is special. It is intended as holding area for topics that have no category; it cannot have security settings.","uncategorized_general_warning":"This category is special. It is used as the default category for new topics that do not have a category selected. If you want to prevent this behavior and force category selection, \u003ca href=\"%{settingLink}\"\u003eplease disable the setting here\u003c/a\u003e. If you want to change the name or description, go to \u003ca href=\"%{customizeLink}\"\u003eCustomize / Text Content\u003c/a\u003e.","email_in":"Custom incoming email address:","email_in_disabled":"Posting new topics via email is disabled in the Site Settings. To enable posting new topics via email, ","email_in_disabled_click":"enable the \"email in\" setting.","mailinglist_mirror":"Category mirrors a mailing list","show_subcategory_list":"Show subcategory list above topics in this category.","read_only_banner":"Banner text when a user cannot create a topic in this category:","num_featured_topics":"Number of topics shown on the categories page:","subcategory_num_featured_topics":"Number of featured topics on parent category's page:","all_topics_wiki":"Make new topics wikis by default","subcategory_list_style":"Subcategory List Style:","sort_order":"Topic List Sort By:","default_view":"Default Topic List:","default_top_period":"Default Top Period:","default_list_filter":"Default List Filter:","allow_badges_label":"Allow badges to be awarded in this category","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","position":"Position on the categories page:","default_position":"Default Position","position_disabled":"Categories will be displayed in order of activity. To control the order of categories in lists, ","position_disabled_click":"enable the \"fixed category positions\" setting.","parent":"Parent Category","num_auto_bump_daily":"Number of open topics to automatically bump daily:","navigate_to_first_post_after_read":"Navigate to first post after topics are read","notifications":{"watching":{"description":"You will automatically watch all topics in these categories. You will be notified of every new post in every topic, and a count of new replies will be shown."},"watching_first_post":{"description":"You will be notified of new topics in this category but not replies to the topics."},"tracking":{"description":"You will automatically track all topics in these categories. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in these categories, and they will not appear in latest."}},"search_priority":{"label":"Search Priority"},"sort_options":{"default":"default","op_likes":"Original Post Likes"},"sort_ascending":"Ascending","sort_descending":"Descending","subcategory_list_styles":{"rows":"Rows","rows_with_featured_topics":"Rows with featured topics","boxes":"Boxes","boxes_with_featured_topics":"Boxes with featured topics"},"settings_sections":{"moderation":"Moderation","appearance":"Appearance"},"colors_disabled":"You can’t select colors because you have a category style of none.","topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"flagging":{"title":"Thanks for helping to keep our community civil!","action":"Flag Post","take_action":"Take Action...","take_action_options":{"default":{"title":"Take Action","details":"Reach the flag threshold immediately, rather than waiting for more community flags"},"suspend":{"title":"Suspend User","details":"Reach the flag threshold, and suspend the user"},"silence":{"title":"Silence User","details":"Reach the flag threshold, and silence the user"}},"ip_address_missing":"(N/A)","submit_tooltip":"Submit the private flag","take_action_tooltip":"Reach the flag threshold immediately, rather than waiting for more community flags","formatted_name":{"off_topic":"It's Off-Topic"},"custom_placeholder_notify_user":"Be specific, be constructive, and always be kind.","custom_message":{"at_least":{"one":"enter at least %{count} character"},"more":{"one":"%{count} to go..."},"left":{"one":"%{count} remaining"}}},"flagging_topic":{"title":"Thanks for helping to keep our community civil!"},"topic_map":{"clicks":{"one":"%{count} click"}},"post_links":{"about":"expand more links for this post","title":{"one":"%{count} more"}},"topic_statuses":{"pinned_globally":{"title":"Pinned Globally","help":"This topic is pinned globally; it will display at the top of latest and its category"},"unlisted":{"help":"This topic is unlisted; it will not be displayed in topic lists, and can only be accessed via a direct link"}},"views_lowercase":{"one":"view"},"views_long":{"one":"this topic has been viewed %{count} time"},"likes_lowercase":{"one":"like"},"users_lowercase":{"one":"user"},"raw_email":{"title":"Incoming Email"},"filters":{"latest":{"title_with_count":{"one":"Latest (%{count})"}},"read":{"help":"topics you've read, in the order that you last read them"},"unread":{"title_with_count":{"one":"Unread (%{count})"},"lower_title_with_count":{"one":"%{count} unread"}},"new":{"lower_title_with_count":{"one":"%{count} new"},"title_with_count":{"one":"New (%{count})"}},"category":{"title_with_count":{"one":"%{categoryName} (%{count})"}}},"browser_update":"Unfortunately, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eyour browser is too old to work on this site\u003c/a\u003e. Please \u003ca href=\"https://browsehappy.com\"\u003eupgrade your browser\u003c/a\u003e to view rich content, log in and reply.","lightbox":{"previous":"Previous (Left arrow key)","next":"Next (Right arrow key)","counter":"%curr% of %total%","content_load_error":"\u003ca href=\"%url%\"\u003eThe content\u003c/a\u003e could not be loaded.","image_load_error":"\u003ca href=\"%url%\"\u003eThe image\u003c/a\u003e could not be loaded."},"keyboard_shortcuts_help":{"jump_to":{"next":"%{shortcut} Next Topic","previous":"%{shortcut} Previous Topic"},"application":{"hamburger_menu":"%{shortcut} Open hamburger menu"},"composing":{"title":"Composing","return":"%{shortcut} Return to composer","fullscreen":"%{shortcut} Fullscreen composer"},"bookmarks":{"custom":"%{shortcut} Custom date and time","none":"%{shortcut} No reminder"},"actions":{"defer":"%{shortcut} Defer topic","topic_admin_actions":"%{shortcut} Open topic admin actions"},"search_menu":{"prev_next":"%{shortcut} Move selection up and down","insert_url":"%{shortcut} Insert selection into open composer"}},"badges":{"earned_n_times":{"one":"Earned this badge %{count} time","other":"Earned this badge %{count} times"},"others_count":"Others with this badge (%{count})","multiple_grant":"You can earn this multiple times","badge_count":{"one":"%{count} Badge"},"more_badges":{"one":"+%{count} More"},"granted":{"one":"%{count} granted","other":"%{count} granted"},"successfully_granted":"Successfully granted %{badge} to %{username}"},"tagging":{"default_info":"This tag isn't restricted to any categories, and has no synonyms.","category_restricted":"This tag is restricted to categories you don't have permission to access.","synonyms":"Synonyms","synonyms_description":"When the following tags are used, they will be replaced with \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\"."},"category_restrictions":{"one":"It can only be used in this category:"},"edit_synonyms":"Manage Synonyms","add_synonyms_label":"Add synonyms:","add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?","other":"Any place that currently uses these tags will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"add_synonyms_failed":"The following tags couldn't be added as synonyms: \u003cb\u003e%{tag_names}\u003c/b\u003e. Ensure they don't have synonyms and aren't synonyms of another tag.","remove_synonym":"Remove Synonym","delete_synonym_confirm":"Are you sure you want to delete the synonym \"%{tag_name}\"?","delete_confirm":{"one":"Are you sure you want to delete this tag and remove it from %{count} topic it is assigned to?","other":"Are you sure you want to delete this tag and remove it from %{count} topics it is assigned to?"},"delete_confirm_synonyms":{"one":"Its synonym will also be deleted.","other":"Its %{count} synonyms will also be deleted."},"manage_groups":"Manage Tag Groups","manage_groups_description":"Define groups to organize tags","upload_description":"Upload a csv file to create tags in bulk","upload_instructions":"One per line, optionally with a tag group in the format 'tag_name,tag_group'.","delete_unused_confirmation":{"one":"%{count} tag will be deleted: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} and %{count} more"},"delete_no_unused_tags":"There are no unused tags.","filters":{"untagged_without_category":"%{filter} untagged topics","untagged_with_category":"%{filter} untagged topics in %{category}"},"notifications":{"watching":{"description":"You will automatically watch all topics with this tag. You will be notified of all new posts and topics, plus the count of unread and new posts will also appear next to the topic."},"watching_first_post":{"description":"You will be notified of new topics in this tag but not replies to the topics."},"tracking":{"description":"You will automatically track all topics with this tag. A count of unread and new posts will appear next to the topic."},"regular":{"description":"You will be notified if someone mentions your @name or replies to your post."},"muted":{"description":"You will not be notified of anything about new topics with this tag, and they will not appear on your unread tab."}},"groups":{"title":"Tag Groups","about":"Add tags to groups to manage them more easily.","parent_tag_label":"Parent tag:","parent_tag_description":"Tags from this group can't be used unless the parent tag is present.","new_name":"New Tag Group","name_placeholder":"Tag Group Name","confirm_delete":"Are you sure you want to delete this tag group?","usable_only_by_groups":"Tags are visible to everyone, but only the following groups can use them","visible_only_to_groups":"Tags are visible only to the following groups"}},"invite":{"custom_message":"Make your invite a little bit more personal by writing a \u003ca href\u003ecustom message\u003c/a\u003e.","custom_message_placeholder":"Enter your custom message","approval_not_required":"User will be auto-approved as soon as they accept this invite.","custom_message_template_forum":"Hey, you should join this forum!"},"forced_anonymous":"Due to extreme load, this is temporarily being shown to everyone as a logged out user would see it.","safe_mode":{"enabled":"Safe mode is enabled, to exit safe mode close this browser window"},"image_removed":"(image removed)","do_not_disturb":{"title":"Do not disturb for...","save":"Save","label":"Do not disturb","remaining":"%{remaining} remaining","options":{"half_hour":"30 minutes","one_hour":"1 hour","two_hours":"2 hours","tomorrow":"Until tomorrow","custom":"Custom"}},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"presence":{"replying":{"one":"replying","other":"replying"},"editing":{"one":"editing","other":"editing"},"replying_to_topic":{"one":"replying","other":"replying"}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Start the new user tutorial for all new users","welcome_message":"Send all new users a welcome message with a quick start guide"}},"cakeday":{"none":" ","title":"Cakeday","upcoming":"Upcoming"},"birthdays":{"title":"Birthdays","month":{"title":"Birthdays in the Month of","empty":"There are no users celebrating their birthdays this month."},"upcoming":{"title":"Birthdays for %{start_date} - %{end_date}","empty":"There are no users celebrating their birthdays in the next 7 days."},"today":{"title":"Birthdays for %{date}","empty":"There are no users celebrating their birthdays today."},"tomorrow":{"empty":"There are no users celebrating their birthdays tomorrow."}},"anniversaries":{"title":"Anniversaries","month":{"title":"Anniversaries in the Month of","empty":"There are no users celebrating their anniversaries this month."},"upcoming":{"title":"Anniversaries for %{start_date} - %{end_date}","empty":"There are no users celebrating their anniversaries in the next 7 days."},"today":{"title":"Anniversaries for %{date}","empty":"There are no users celebrating their anniversaries today."},"tomorrow":{"empty":"There are no users celebrating their anniversaries tomorrow."}},"discourse_local_dates":{"relative_dates":{"today":"Today %{time}","tomorrow":"Tomorrow %{time}","yesterday":"Yesterday %{time}","countdown":{"passed":"date has passed"}},"title":"Insert date / time","create":{"form":{"format_description":"Format used to display the date to the user. Use Z to show the offset and zz for the timezone name.","timezones_description":"Timezones will be used to display dates in preview and fallback.","recurring_description":"Define the recurrence of an event. You can also manually edit the recurring option generated by the form and use one of the following keys: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","until":"Until...","recurring":{"every_day":"Every day","every_week":"Every week","every_two_weeks":"Every two weeks","every_month":"Every month","every_two_months":"Every two months","every_three_months":"Every three months","every_six_months":"Every six months","every_year":"Every year"}}}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","example":"Welcome to Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Date/Time inputs"},"font_scale":{"title":"Font System"},"colors":{"title":"Colors"},"icons":{"title":"Icons","full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"categories":{"title":"Categories"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation":{"title":"Navigation"},"navigation_bar":{"title":"Navigation Bar"},"navigation_stacked":{"title":"Navigation Stacked"},"categories_list":{"title":"Categories List"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_statuses":{"title":"Topic Statuses"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_timer_info":{"title":"Topic Timers"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"post":{"title":"Post"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"suggested_topics":{"title":"Suggested Topics"},"post_menu":{"title":"Post Menu"},"modal":{"title":"Modal","header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}},"poll":{"voters":{"one":"voter"},"total_votes":{"one":"total vote"},"public":{"title":"Votes are \u003cstrong\u003epublic\u003c/strong\u003e."},"results":{"groups":{"title":"You need to be a member of %{groups} to vote in this poll."},"vote":{"title":"Results will be shown on \u003cstrong\u003evote\u003c/strong\u003e."},"closed":{"title":"Results will be shown once \u003cstrong\u003eclosed\u003c/strong\u003e."},"staff":{"title":"Results are only shown to \u003cstrong\u003estaff\u003c/strong\u003e members."}},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"between_min_and_max_options":"Choose between \u003cstrong\u003e%{min}\u003c/strong\u003e and \u003cstrong\u003e%{max}\u003c/strong\u003e options."}},"hide-results":{"label":"Show vote"},"group-results":{"title":"Group votes by user field","label":"Show breakdown"},"export-results":{"title":"Export the poll results"},"automatic_close":{"closes_in":"Closes in \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Closed \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Poll results","votes":"%{count} votes","breakdown":"Breakdown","percentage":"Percentage","count":"Count"},"error_while_exporting_results":"Sorry, there was an error exporting poll results.","ui_builder":{"help":{"options_count":"Enter at least 1 option","min_step_value":"The minimum step value is 1"},"poll_type":{"regular":"Single Choice","multiple":"Multiple Choice","number":"Number Rating"},"poll_result":{"label":"Results","always":"Always visible","vote":"On vote","closed":"When closed","staff":"Staff only"},"poll_groups":{"label":"Allowed groups"},"poll_chart_type":{"label":"Chart type","bar":"Bar","pie":"Pie"},"poll_config":{"max":"Max","min":"Min","step":"Step"},"poll_title":{"label":"Title (optional)"},"automatic_close":{"label":"Automatically close poll"}}}}}};
I18n.locale = 'th';
I18n.pluralizationRules.th = MessageFormat.locale.th;
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
//! locale : Thai [th]
//! author : Kridsada Thanabulpong : https://github.com/sirn

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var th = moment.defineLocale('th', {
        months: 'มกราคม_กุมภาพันธ์_มีนาคม_เมษายน_พฤษภาคม_มิถุนายน_กรกฎาคม_สิงหาคม_กันยายน_ตุลาคม_พฤศจิกายน_ธันวาคม'.split(
            '_'
        ),
        monthsShort: 'ม.ค._ก.พ._มี.ค._เม.ย._พ.ค._มิ.ย._ก.ค._ส.ค._ก.ย._ต.ค._พ.ย._ธ.ค.'.split(
            '_'
        ),
        monthsParseExact: true,
        weekdays: 'อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัสบดี_ศุกร์_เสาร์'.split('_'),
        weekdaysShort: 'อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัส_ศุกร์_เสาร์'.split('_'), // yes, three characters difference
        weekdaysMin: 'อา._จ._อ._พ._พฤ._ศ._ส.'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'H:mm',
            LTS: 'H:mm:ss',
            L: 'DD/MM/YYYY',
            LL: 'D MMMM YYYY',
            LLL: 'D MMMM YYYY เวลา H:mm',
            LLLL: 'วันddddที่ D MMMM YYYY เวลา H:mm',
        },
        meridiemParse: /ก่อนเที่ยง|หลังเที่ยง/,
        isPM: function (input) {
            return input === 'หลังเที่ยง';
        },
        meridiem: function (hour, minute, isLower) {
            if (hour < 12) {
                return 'ก่อนเที่ยง';
            } else {
                return 'หลังเที่ยง';
            }
        },
        calendar: {
            sameDay: '[วันนี้ เวลา] LT',
            nextDay: '[พรุ่งนี้ เวลา] LT',
            nextWeek: 'dddd[หน้า เวลา] LT',
            lastDay: '[เมื่อวานนี้ เวลา] LT',
            lastWeek: '[วัน]dddd[ที่แล้ว เวลา] LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: 'อีก %s',
            past: '%sที่แล้ว',
            s: 'ไม่กี่วินาที',
            ss: '%d วินาที',
            m: '1 นาที',
            mm: '%d นาที',
            h: '1 ชั่วโมง',
            hh: '%d ชั่วโมง',
            d: '1 วัน',
            dd: '%d วัน',
            w: '1 สัปดาห์',
            ww: '%d สัปดาห์',
            M: '1 เดือน',
            MM: '%d เดือน',
            y: '1 ปี',
            yy: '%d ปี',
        },
    });

    return th;

})));

// moment-timezone-localization for lang code: th

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"อาบีจาน","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"อักกรา","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"แอดดิสอาบาบา","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"แอลเจียร์","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"แอสมารา","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"บามาโก","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"บังกี","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"บันจูล","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"บิสเซา","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"แบลนไทร์","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"บราซซาวิล","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"บูจุมบูรา","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"ไคโร","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"คาสซาบลางก้า","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"เซวตา","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"โกนากรี","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"ดาการ์","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"ดาร์เอสซาลาม","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"จิบูตี","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"ดูอาลา","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"เอลไอย์อุง","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"ฟรีทาวน์","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"กาโบโรเน","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"ฮาราเร","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"โจฮันเนสเบอร์ก","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"จูบา","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"คัมพาลา","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"คาร์ทูม","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"คิกาลี","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"กินชาซา","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"ลากอส","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"ลีเบรอวิล","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"โลเม","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"ลูอันดา","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"ลูบัมบาชิ","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"ลูซากา","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"มาลาโบ","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"มาปูโต","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"มาเซรู","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"อัมบาบาเน","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"โมกาดิชู","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"มันโรเวีย","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"ไนโรเบีย","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"เอ็นจาเมนา","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"นีอาเมย์","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"นูแอกชอต","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"วากาดูกู","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"ปอร์โต-โนโว","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"เซาตูเม","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"ตรีโปลี","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"ตูนิส","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"วินด์ฮุก","id":"Africa/Windhoek"},{"value":"America/Adak","name":"เอดัก","id":"America/Adak"},{"value":"America/Anchorage","name":"แองเคอเรจ","id":"America/Anchorage"},{"value":"America/Anguilla","name":"แองกิลลา","id":"America/Anguilla"},{"value":"America/Antigua","name":"แอนติกา","id":"America/Antigua"},{"value":"America/Araguaina","name":"อารากัวนา","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"ลาริโอจา","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"ริโอกาลเลกอส","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"ซัลตา","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"ซานฮวน","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"ซันลูอิส","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"ทูคูแมน","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"อูชูเอีย","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"อารูบา","id":"America/Aruba"},{"value":"America/Asuncion","name":"อะซุนซิออง","id":"America/Asuncion"},{"value":"America/Bahia","name":"บาเยีย","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"บาเอียบันเดรัส","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"บาร์เบโดส","id":"America/Barbados"},{"value":"America/Belem","name":"เบเลง","id":"America/Belem"},{"value":"America/Belize","name":"เบลีซ","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"บลังค์-ซาบลอน","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"บัววีชตา","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"โบโกตา","id":"America/Bogota"},{"value":"America/Boise","name":"บอยซี","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"บัวโนสไอเรส","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"อ่าวแคมบริดจ์","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"กัมปูกรันดี","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"แคนคุน","id":"America/Cancun"},{"value":"America/Caracas","name":"คาราคัส","id":"America/Caracas"},{"value":"America/Catamarca","name":"กาตามาร์กา","id":"America/Catamarca"},{"value":"America/Cayenne","name":"กาแยน","id":"America/Cayenne"},{"value":"America/Cayman","name":"เคย์แมน","id":"America/Cayman"},{"value":"America/Chicago","name":"ชิคาโก","id":"America/Chicago"},{"value":"America/Chihuahua","name":"ชีวาวา","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"คอรัลฮาร์เบอร์","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"คอร์โดบา","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"คอสตาริกา","id":"America/Costa_Rica"},{"value":"America/Creston","name":"เครสตัน","id":"America/Creston"},{"value":"America/Cuiaba","name":"กุยาบา","id":"America/Cuiaba"},{"value":"America/Curacao","name":"คูราเซา","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"ดานมาร์กสฮาวน์","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"ดอว์สัน","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"ดอว์สัน ครีก","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"เดนเวอร์","id":"America/Denver"},{"value":"America/Detroit","name":"ดีทรอยต์","id":"America/Detroit"},{"value":"America/Dominica","name":"โดมินิกา","id":"America/Dominica"},{"value":"America/Edmonton","name":"เอดมันตัน","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"เอรูเนเป","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"เอลซัลวาดอร์","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"ฟอร์ตเนลสัน","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"ฟอร์ตาเลซา","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"เกลซเบย์","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"กอดแธบ","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"กูสเบย์","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"แกรนด์เติร์ก","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"เกรนาดา","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"กวาเดอลูป","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"กัวเตมาลา","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"กัวยากิล","id":"America/Guayaquil"},{"value":"America/Guyana","name":"กายอานา","id":"America/Guyana"},{"value":"America/Halifax","name":"แฮลิแฟกซ์","id":"America/Halifax"},{"value":"America/Havana","name":"ฮาวานา","id":"America/Havana"},{"value":"America/Hermosillo","name":"เอร์โมซีโย","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"นอกซ์, อินดีแอนา","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"มาเรงโก, อินดีแอนา","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"ปีเตอร์สเบิร์ก, อินดีแอนา","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"เทลล์ซิตี, อินดีแอนา","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"วีเวย์, อินดีแอนา","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"วินเซนเนส, อินดีแอนา","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"วินาแมค, อินดีแอนา","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"อินเดียแนโพลิส","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"อินูวิก","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"อีกวาลิต","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"จาเมกา","id":"America/Jamaica"},{"value":"America/Jujuy","name":"จูจิว","id":"America/Jujuy"},{"value":"America/Juneau","name":"จูโน","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"มอนติเซลโล, เคนตักกี","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"คราเลนดิจค์","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"ลาปาซ","id":"America/La_Paz"},{"value":"America/Lima","name":"ลิมา","id":"America/Lima"},{"value":"America/Los_Angeles","name":"ลอสแองเจลิส","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"ลูส์วิลล์","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"โลเวอร์พรินซ์ ควอเตอร์","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"มาเซโอ","id":"America/Maceio"},{"value":"America/Managua","name":"มานากัว","id":"America/Managua"},{"value":"America/Manaus","name":"มาเนาส์","id":"America/Manaus"},{"value":"America/Marigot","name":"มาริโกต์","id":"America/Marigot"},{"value":"America/Martinique","name":"มาร์ตินีก","id":"America/Martinique"},{"value":"America/Matamoros","name":"มาตาโมรอส","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"มาซาทลาน","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"เมนดูซา","id":"America/Mendoza"},{"value":"America/Menominee","name":"เมโนมินี","id":"America/Menominee"},{"value":"America/Merida","name":"เมรีดา","id":"America/Merida"},{"value":"America/Metlakatla","name":"เมทลากาตละ","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"เม็กซิโกซิตี","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"มีเกอลง","id":"America/Miquelon"},{"value":"America/Moncton","name":"มองตัน","id":"America/Moncton"},{"value":"America/Monterrey","name":"มอนเตร์เรย์","id":"America/Monterrey"},{"value":"America/Montevideo","name":"มอนเตวิเดโอ","id":"America/Montevideo"},{"value":"America/Montserrat","name":"มอนเซอร์รัต","id":"America/Montserrat"},{"value":"America/Nassau","name":"แนสซอ","id":"America/Nassau"},{"value":"America/New_York","name":"นิวยอร์ก","id":"America/New_York"},{"value":"America/Nipigon","name":"นิปิกอน","id":"America/Nipigon"},{"value":"America/Nome","name":"นอม","id":"America/Nome"},{"value":"America/Noronha","name":"โนรอนฮา","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"โบลาห์, นอร์ทดาโคตา","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"เซนเตอร์, นอร์ทดาโคตา","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"นิวเซเลม, นอร์ทดาโคตา","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"โอจินากา","id":"America/Ojinaga"},{"value":"America/Panama","name":"ปานามา","id":"America/Panama"},{"value":"America/Pangnirtung","name":"พางนีทัง","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"ปารามาริโบ","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"ฟินิกซ์","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"ปอร์โตแปรงซ์","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"พอร์ทออฟสเปน","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"ปอร์ตูเวลโย","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"เปอโตริโก","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"ปุนตาอาเรนัส","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"เรนนี่ริเวอร์","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"แรงกินอินเล็ต","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"เรซีเฟ","id":"America/Recife"},{"value":"America/Regina","name":"ริไจนา","id":"America/Regina"},{"value":"America/Resolute","name":"เรโซลูท","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"รีโอบรังโก","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"ซานตาอิซาเบล","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"ซันตาเรม","id":"America/Santarem"},{"value":"America/Santiago","name":"ซันติอาโก","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"ซานโต โดมิงโก","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"เซาเปาลู","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"สกอเรสไบซันด์","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"ซิตกา","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"เซนต์บาร์เธเลมี","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"เซนต์จอนส์","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"เซนต์คิตส์","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"เซนต์ลูเซีย","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"เซนต์โธมัส","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"เซนต์วินเซนต์","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"สวิฟต์เคอร์เรนต์","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"เตกูซิกัลปา","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"ทูเล","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"ทันเดอร์เบย์","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"ทิฮัวนา","id":"America/Tijuana"},{"value":"America/Toronto","name":"โทรอนโต","id":"America/Toronto"},{"value":"America/Tortola","name":"ตอร์โตลา","id":"America/Tortola"},{"value":"America/Vancouver","name":"แวนคูเวอร์","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"ไวต์ฮอร์ส","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"วินนิเพก","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"ยากูทัต","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"เยลโลว์ไนฟ์","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"เคซีย์","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"เดวิส","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"ดูมองต์ดูร์วิลล์","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"แมคควอรี","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"มอว์สัน","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"แมคมัวโด","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"พาล์เมอร์","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"โรธีรา","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"ไซโยวา","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"โทรล","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"วอสตอค","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"ลองเยียร์เบียน","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"เอเดน","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"อัลมาตี","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"อัมมาน","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"อานาดีร์","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"อัคตาอู","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"อัคโทบี","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"อาชกาบัต","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"อทีราว","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"แบกแดด","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"บาห์เรน","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"บากู","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"กรุงเทพ","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"บาร์เนาว์","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"เบรุต","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"บิชเคก","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"บรูไน","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"โกลกาตา","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"ชิตา","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"ชอยบาลซาน","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"โคลัมโบ","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"ดามัสกัส","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"ดากา","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"ดิลี","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"ดูไบ","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"ดูชานเบ","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"แฟมากุสตา","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"กาซา","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"เฮบรอน","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"ฮ่องกง","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"ฮอฟด์","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"อีร์คุตสค์","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"จาการ์ตา","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"จายาปุระ","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"เยรูซาเลม","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"คาบูล","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"คามชัตกา","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"การาจี","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"กาตมันดุ","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"ฮันดืยกา","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"ครัสโนยาร์สก์","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"กัวลาลัมเปอร์","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"กูชิง","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"คูเวต","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"มาเก๊า","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"มากาดาน","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"มากัสซาร์","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"มะนิลา","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"มัสกัต","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"นิโคเซีย","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"โนโวคุซเนตสค์","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"โนโวซิบิร์สก์","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"โอมสก์","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"ออรัล","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"พนมเปญ","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"พอนเทียนัก","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"เปียงยาง","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"กาตาร์","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"ไคซีลอร์ดา","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"ย่างกุ้ง","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"ริยาร์ด","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"นครโฮจิมินห์","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"ซาคาลิน","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"ซามาร์กานด์","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"โซล","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"เซี่ยงไฮ้","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"สิงคโปร์","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"ซเรดเนคโคลิมสก์","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"ไทเป","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"ทาชเคนต์","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"ทบิลิซิ","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"เตหะราน","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"ทิมพู","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"โตเกียว","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"ตอมสค์","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"อูลานบาตอร์","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"อุรุมชี","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"อุสต์เนรา","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"เวียงจันทน์","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"วลาดิโวสต็อก","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"ยาคุตสค์","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"ยีคาเตอรินเบิร์ก","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"เยเรวาน","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"อาซอเรส","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"เบอร์มิวดา","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"คะเนรี","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"เคปเวิร์ด","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"แฟโร","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"มาเดรา","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"เรคยาวิก","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"เซาท์ จอร์เจีย","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"เซนต์เฮเลนา","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"สแตนลีย์","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"แอดิเลด","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"บริสเบน","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"โบรกเคนฮิลล์","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"คูร์รี","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"ดาร์วิน","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"ยูคลา","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"โฮบาร์ต","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"ลินดีแมน","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"ลอร์ดโฮว์","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"เมลเบิร์น","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"เพิร์ท","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"ซิดนีย์","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"เวลาสากลเชิงพิกัด","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"อัมสเตอดัม","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"อันดอร์รา","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"แอสตราคาน","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"เอเธนส์","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"เบลเกรด","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"เบอร์ลิน","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"บราติสลาวา","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"บรัสเซลส์","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"บูคาเรส","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"บูดาเปส","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"บุสซิงเง็น","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"คีชีเนา","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"โคเปนเฮเกน","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"เวลามาตรฐานไอร์แลนด์ดับบลิน","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"ยิบรอลตาร์","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"เกิร์นซีย์","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"เฮลซิงกิ","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"เกาะแมน","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"อิสตันบูล","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"เจอร์ซีย์","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"คาลินิงกราด","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"เคียฟ","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"คิรอฟ","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"ลิสบอน","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"ลูบลิยานา","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"เวลาฤดูร้อนอังกฤษลอนดอน","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"ลักเซมเบิร์ก","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"มาดริด","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"มอลตา","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"มารีฮามน์","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"มินสก์","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"โมนาโก","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"มอสโก","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"ออสโล","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"ปารีส","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"พอดกอรีตซา","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"ปราก","id":"Europe/Prague"},{"value":"Europe/Riga","name":"ริกา","id":"Europe/Riga"},{"value":"Europe/Rome","name":"โรม","id":"Europe/Rome"},{"value":"Europe/Samara","name":"ซามารา","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"ซานมารีโน","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"ซาราเยโว","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"ซาราทอฟ","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"ซิมเฟอโรโปล","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"สโกเปีย","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"โซเฟีย","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"สตอกโฮล์ม","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"ทาลลินน์","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"ติรานา","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"อะลิยานอฟ","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"อัซโกร็อด","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"วาดุซ","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"วาติกัน","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"เวียนนา","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"วิลนีอุส","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"วอลโกกราด","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"วอร์ซอ","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"ซาเกร็บ","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"ซาโปโรซี","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"ซูริค","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"อันตานานาริโว","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"ชากัส","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"คริสต์มาส","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"โคโคส","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"โคโมโร","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"แกร์เกอลอง","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"มาเอ","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"มัลดีฟส์","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"มอริเชียส","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"มาโยเต","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"เรอูนียง","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"อาปีอา","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"โอคแลนด์","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"บูเกนวิลล์","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"แชทัม","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"อีสเตอร์","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"เอฟาเต","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"เอนเดอร์เบอรี","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"ฟาเคาโฟ","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"ฟิจิ","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"ฟูนะฟูตี","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"กาลาปาโกส","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"แกมเบียร์","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"กัวดัลคานัล","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"กวม","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"โฮโนลูลู","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"จอห์นสตัน","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"คิริทิมาตี","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"คอสไร","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"ควาจาเลน","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"มาจูโร","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"มาร์เคซัส","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"มิดเวย์","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"นาอูรู","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"นีอูเอ","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"นอร์ฟอล์ก","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"นูเมอา","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"ปาโก ปาโก","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"ปาเลา","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"พิตแคร์น","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"โปนาเป","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"พอร์ตมอร์สบี","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"ราโรตองกา","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"ไซปัน","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"ตาฮีตี","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"ตาระวา","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"ตองกาตาปู","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"ทรัก","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"เวก","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"วาลลิส","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM YYYY'); };
moment.fn.longDate = function(){ return this.format('D MMMM YYYY LT'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

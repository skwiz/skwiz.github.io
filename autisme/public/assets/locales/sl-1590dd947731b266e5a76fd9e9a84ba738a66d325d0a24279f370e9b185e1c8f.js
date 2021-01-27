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
I18n._compiledMFs = {"topic.bumped_at_title_MF" : function(d){
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
}, "too_few_topics_and_posts_notice_MF" : function(d){
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["sl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.sl = function (n) {
  if ((n % 100) == 1) {
    return 'one';
  }
  if ((n % 100) == 2) {
    return 'two';
  }
  if ((n % 100) == 3 || (n % 100) == 4) {
    return 'few';
  }
  return 'other';
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

I18n.translations = {"sl":{"js":{"number":{"format":{"separator":",","delimiter":"."},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Bajt","two":"Bajta","few":"Bajti","other":"Bajtov"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"H:mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"D MMM","full_no_year_no_time":"D. MMMM","long_with_year":"D. MMM YYYY H:mm","long_with_year_no_time":"D. MMM YYYY","full_with_year_no_time":"D. MMMM YYYY","long_date_with_year":"MMM D, 'YY LT","long_date_without_year":"D. MMM LT","long_date_with_year_without_time":"D. MMM 'YY","long_date_without_year_with_linebreak":"D. MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D. MMM 'YY \u003cbr/\u003eLT","wrap_ago":"pred %{date}","tiny":{"half_a_minute":"\u003c 1 min","less_than_x_seconds":{"one":"\u003c %{count} s","two":"\u003c %{count} s","few":"\u003c %{count} s","other":"\u003c %{count} s"},"x_seconds":{"one":"%{count} s","two":"%{count} s","few":"%{count} s","other":"%{count} s"},"less_than_x_minutes":{"one":"\u003c %{count} min","two":"\u003c %{count} min","few":"\u003c %{count} min","other":"\u003c %{count} min"},"x_minutes":{"one":"%{count} min","two":"%{count} min","few":"%{count} min","other":"%{count} min"},"about_x_hours":{"one":"%{count} ura","two":"%{count} uri","few":"%{count} ure","other":"%{count} ur"},"x_days":{"one":"%{count} d","two":"%{count} d","few":"%{count} d","other":"%{count} d"},"x_months":{"one":"%{count} mes","two":"%{count} mes","few":"%{count} mes","other":"%{count} mes"},"about_x_years":{"one":"%{count} l","two":"%{count} l","few":"%{count} l","other":"%{count} l"},"over_x_years":{"one":"\u003e %{count} l","two":"\u003e %{count} l","few":"\u003e %{count} l","other":"\u003e %{count} l"},"almost_x_years":{"one":"%{count} l","two":"%{count} l","few":"%{count} l","other":"%{count} l"},"date_month":"D. MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} minuto","two":"%{count} minuti","few":"%{count} minute","other":"%{count} minut"},"x_hours":{"one":"%{count} uro","two":"%{count} uri","few":"%{count} ure","other":"%{count} ur"},"x_days":{"one":"%{count} dan","two":"%{count} dneva","few":"%{count} dnevi","other":"%{count} dni"},"date_year":"D. MMM 'YY"},"medium_with_ago":{"x_minutes":{"one":"pred %{count} minuto","two":"pred %{count} minutama","few":"pred %{count} minutami","other":"pred %{count} minutami"},"x_hours":{"one":"pred %{count} uro","two":"pred %{count} urama","few":"pred %{count} urami","other":"pred %{count} urami"},"x_days":{"one":"pred %{count} dnevom","two":"pred %{count} dnevoma","few":"pred %{count} dnevi","other":"pred %{count} dnevi"},"x_months":{"one":"pred %{count} mesecem","two":"pred %{count} mesecema","few":"pred %{count} meseci","other":"pred %{count} meseci"},"x_years":{"one":"pred %{count} letom","two":"pred %{count} letoma","few":"pred %{count} leti","other":"pred %{count} leti"}},"later":{"x_days":{"one":"čez %{count} dan","two":"čez %{count} dneva","few":"čez %{count} dneve","other":"čez %{count} dni"},"x_months":{"one":"čez %{count} mesec","two":"čez %{count} meseca","few":"čez %{count} mesece","other":"čez %{count} mesecev"},"x_years":{"one":"čez %{count} leto","two":"čez %{count} leti","few":"čez %{count} leta","other":"čez %{count} let"}},"previous_month":"Prejšnji mesec","next_month":"Naslednji mesec","placeholder":"datum"},"share":{"topic_html":"Tema: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"prispevek #%{postNumber}","close":"zapri","twitter":"Deli na Twitterju","facebook":"Deli na Facebooku","email":"Pošlji po e-pošti","url":"Kopiraj in deli URL"},"action_codes":{"public_topic":"je naredil temo javno %{when}","private_topic":"je spremenil temo v zasebno sporočilo %{when}","split_topic":"je razdelil temo %{when}","invited_user":"je povabil %{who} %{when}","invited_group":"je povabil %{who} %{when}","user_left":"%{who}se je odstranil s tega sporočila %{when}","removed_user":"je odstranil %{who} %{when}","removed_group":"je odstranil %{who} %{when}","autobumped":"samodejno izpostavljeno %{when}","autoclosed":{"enabled":"zaprto %{when}","disabled":"odprto %{when}"},"closed":{"enabled":"zaprto %{when}","disabled":"odprto %{when}"},"archived":{"enabled":"arhivirano %{when}","disabled":"odarhivirano %{when}"},"pinned":{"enabled":"pripeto %{when}","disabled":"odpeta %{when}"},"pinned_globally":{"enabled":"globalno pripeto %{when}","disabled":"odpeta %{when}"},"visible":{"enabled":"uvrščeno %{when}","disabled":"izločeno %{when}"},"banner":{"enabled":"je ustvaril ta oglasni trak %{when}. Pojavil se bo na vrhu vsake strani, dokler ga uporabnik ne opusti.","disabled":"je odstranil ta oglasni trak %{when}. Ne bo se več pojavljal na vrhu vsake strani."},"forwarded":"zgoraj navedeno sporočilo je bilo posredovano"},"topic_admin_menu":"dejanja teme","wizard_required":"Dobrodošli v vašem novem Discoursu! Začnimo s \u003ca href='%{url}' data-auto-route='true'\u003ečarovnikom za nastavitve\u003c/a\u003e ✨","emails_are_disabled":"Vsa odhodna e-pošta je bila globalno onemogočena iz strani administratorja. E-poštna obvestila ne bodo poslana.","bootstrap_mode_disabled":"Zagonski način bo onemogočen v 24 urah.","themes":{"default_description":"Privzeto","broken_theme_alert":"Vaše spletno mesto morda ne bo delovalo, ker ima tema / komponenta %{theme} napake. Onemogočite jo na %{path}."},"s3":{"regions":{"ap_northeast_1":"Asia Pacific (Tokyo)","ap_northeast_2":"Asia Pacific (Seoul)","ap_south_1":"Azija Pacifik (Mumbaj)","ap_southeast_1":"Asia Pacific (Singapore)","ap_southeast_2":"Asia Pacific (Sydney)","ca_central_1":"Canada (Central)","cn_north_1":"China (Beijing)","cn_northwest_1":"Kitajska (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"EU (Stockholm)","eu_west_1":"EU (Ireland)","eu_west_2":"EU (London)","eu_west_3":"EU (Paris)","sa_east_1":"Južna Amerika (São Paulo)","us_east_1":"US East (N. Virginia)","us_east_2":"US East (Ohio)","us_gov_east_1":"AWS GovCloud (ZDA-vzhod)","us_gov_west_1":"AWS GovCloud (ZDA-zahod)","us_west_1":"US West (N. California)","us_west_2":"US West (Oregon)"}},"edit":"uredi naslov in kategorijo te teme","expand":"Razširi","not_implemented":"Oprosti, ta funkcija še ni bila implementirana!","no_value":"Ne","yes_value":"Da","submit":"Išči","generic_error":"Ups, prišlo je do napake.","generic_error_with_reason":"Napaka: %{error}","go_ahead":"Nadaljuj","sign_up":"Registracija","log_in":"Prijava","age":"Starost","joined":"Pridružen","admin_title":"Admin","show_more":"Več","show_help":"možnosti","links":"Povezave","links_lowercase":{"one":"povezava","two":"povezavi","few":"povezave","other":"povezav"},"faq":"Pravila skupnosti","guidelines":"Navodila","privacy_policy":"Pravilnik o zasebnosti","privacy":"Zasebnost","tos":"Pogoji uporabe","rules":"Pravila","conduct":"Pravila obnašanja","mobile_view":"Mobilni pogled","desktop_view":"Namizni pogled","you":"Vi","or":"ali","now":"ravnokar","read_more":"preberi več","more":"Več","less":"Manj","never":"nikoli","every_30_minutes":"vsakih 30 minut","every_hour":"vsako uro","daily":"dnevno","weekly":"tedensko","every_month":"vsak mesec","every_six_months":"vsakih 6 mesecev","max_of_count":"največ od %{count}","alternation":"ali","character_count":{"one":"%{count} znak","two":"%{count} znaka","few":"%{count} znaki","other":"%{count} znakov"},"related_messages":{"title":"Povezana sporočila","see_all":"Poglej \u003ca href=\"%{path}\"\u003evsa sporočila\u003c/a\u003e od @%{username}..."},"suggested_topics":{"title":"Predlagane teme","pm_title":"Predlagana sporočila"},"about":{"simple_title":"O nas","title":"O %{title}","stats":"Statistika strani","our_admins":"Naši administratorji","our_moderators":"Naši moderatorji","moderators":"Moderatorji","stat":{"all_time":"Ves čas","last_7_days":"Zadnjih 7","last_30_days":"Zadnjih 30"},"like_count":"Všečki","topic_count":"Teme","post_count":"Prispevki","user_count":"Uporabniki","active_user_count":"Aktivni uporabniki","contact":"Pišite nam","contact_info":"V primeru kritične napake na strani ali nujne zadeve nam pišite na %{contact_info}."},"bookmarked":{"title":"Zaznamek","clear_bookmarks":"Odstrani zaznamke","help":{"bookmark":"ustvari zaznamek prvega prispevka v tej temi","unbookmark":"odstrani vse zaznamke v tej temi","unbookmark_with_reminder":"Kliknite, če želite odstraniti vse zaznamke in opomnike v tej temi. Za to temo imate opomnik nastavljen %{reminder_at}."}},"bookmarks":{"created":"To objavo ste dodali med zaznamke. %{name}","not_bookmarked":"zaznamuj prispevek","created_with_reminder":"To objavo ste zaznamovali z opomnikom %{date}. %{name}","remove":"Odstrani zaznamek","delete":"Odstrani zaznamek","confirm_delete":"Ali ste prepričani, da želite odstraniti ta zaznamek? Opomnik bo prav tako odstranjen.","confirm_clear":"Ste prepričani, da želite odstraniti vse svoje zaznamke iz te teme?","save":"Shrani","no_timezone":"Časovnega pasu še niste izbrali. Opomnikov ne boste mogli nastavljati dokler ga ne določite \u003ca href=\"%{basePath}/my/preferences/profile\"\u003ev svojem profilu\u003c/a\u003e.","invalid_custom_datetime":"Datum in čas, ki ste ju navedli, sta neveljavna. Poskusite znova.","list_permission_denied":"Nimate dovoljenja za ogled zaznamkov tega uporabnika.","no_user_bookmarks":"Nimate nobenega zaznamka; zaznamki vam omogočajo, da se hitro sklicujete na določene objave.","auto_delete_preference":{"label":"Samodejno izbriši","never":"Nikoli","when_reminder_sent":"Ko je opomnik poslan","on_owner_reply":"Ko odgovorim na to temo"},"search_placeholder":"Iščite zaznamke po imenu, naslovu teme ali vsebini objave","search":"Išči","reminders":{"later_today":"Kasneje v dnevu","next_business_day":"Naslednji delovni dan","tomorrow":"Jutri","next_week":"Naslednji teden","post_local_date":"Datum v objavi","later_this_week":"Kasneje v tednu","start_of_next_business_week":"Ponedeljek","start_of_next_business_week_alt":"Naslednji ponedeljek","next_month":"Naslednji mesec","custom":"Izberi datum in čas","last_custom":"Zadnji","none":"Opomnik ni potreben","today_with_time":"danes ob %{time}","tomorrow_with_time":"jutri ob %{time}","at_time":"ob %{date_time}","existing_reminder":"Za ta zaznamek imate nastavljen opomnik, ki bo poslan %{at_date_time}"}},"copy_codeblock":{"copied":"kopirano!"},"drafts":{"resume":"Nadaljuj","remove":"Odstrani","remove_confirmation":"Ali ste prepričani da hočete izbrisati ta osnutek?","new_topic":"Nov osnutek teme","new_private_message":"Nov osnutek zasebnega sporočila","topic_reply":"Osnutek odgovora","abandon":{"confirm":"V tej temi že imate drug osnutek. Ste prepričani, da ga želite opustiti?","yes_value":"Da, opusti","no_value":"Ne, obdrži"}},"topic_count_latest":{"one":"Poglej %{count} novo ali posodobljeno temo","two":"Poglej %{count} novi ali posodobljeni temi","few":"Poglej %{count} nove ali posodobljene teme","other":"Poglej %{count} novih ali posodobljenih tem"},"topic_count_unread":{"one":"Poglej %{count} neprebrano temo","two":"Poglej %{count} neprebrani temi","few":"Poglej %{count} neprebrane teme","other":"Poglej %{count} neprebranih tem"},"topic_count_new":{"one":"Poglej %{count} novo temo","two":"Poglej %{count} novi temi","few":"Poglej %{count} nove teme","other":"Poglej %{count} novih tem"},"preview":"predogled","cancel":"prekliči","deleting":"Brisanje...","save":"Shrani spremembe","saving":"Shranjujem...","saved":"Shranjeno!","upload":"Naloži","uploading":"Nalagam...","uploading_filename":"Nalagam: %{filename} ...","clipboard":"odložišče","uploaded":"Naloženo!","pasting":"Lepljenje...","enable":"Omogoči","disable":"Onemogoči","continue":"Nadaljuj","undo":"Razveljavi","revert":"Povrni","failed":"Spodletelo","switch_to_anon":"Vklopi anonimni način","switch_from_anon":"Izklopi anonimni način","banner":{"close":"Opusti ta oglasni trak.","edit":"Uredi ta oglasni trak \u003e\u003e"},"pwa":{"install_banner":"Ali želite \u003ca href\u003enamestiti %{title} na to napravo?\u003c/a\u003e"},"choose_topic":{"none_found":"Ni tem.","title":{"search":"Iskanje teme","placeholder":"tu vnesite naslov teme, URL ali id"}},"choose_message":{"none_found":"Ne najdem sporočila.","title":{"search":"Iskanje sporočila","placeholder":"tu vnesite naslov, URL ali id sporočila"}},"review":{"order_by":"Uredi po","in_reply_to":"v odgovor na","explain":{"formula":"Formula","subtotal":"Delna vsota","total":"Skupaj","trust_level_bonus":{"name":"nivo zaupanja"}},"awaiting_approval":"Čaka odobritev","delete":"Izbriši","settings":{"saved":"Shranjeno","save_changes":"Shrani spremembe","title":"Nastavitve"},"moderation_history":"Zgodovina moderiranja","view_all":"Prikaži vse","grouped_by_topic":"Združeno po skupinah","none":"Ni nobenih predmetov za odobritev.","view_pending":"poglej za odobritev","topic_has_pending":{"one":"Ta tema ima \u003cb\u003e%{count}\u003c/b\u003e prispevek za potrditev","two":"Ta tema ima \u003cb\u003e%{count}\u003c/b\u003e prispevka za potrditev","few":"Ta tema ima \u003cb\u003e%{count}\u003c/b\u003e prispevke za potrditev","other":"Ta tema ima \u003cb\u003e%{count}\u003c/b\u003e prispevkov za potrditev"},"title":"Pregled","topic":"Tema:","filtered_user":"Uporabnik","filtered_reviewed_by":"Pregledal","show_all_topics":"prikaži vse teme","deleted_post":"(prispevek izbrisan)","deleted_user":"(uporabnik izbrisan)","user":{"website":"Spletna stran","username":"Uporabniško ime","email":"E-naslov","name":"Polno ime","fields":"Polja"},"topics":{"topic":"Tema","reviewable_count":"Število","reported_by":"Prijavljen od","deleted":"[tema izbrisana]","original":"(izvorna tema)","details":"podrobnosti","unique_users":{"one":"%{count} uporabnik","two":"%{count} uporabnika","few":"%{count} uporabniki","other":"%{count} uporabnikov"}},"replies":{"one":"%{count} odgovor","two":"%{count} odgovora","few":"%{count} odgovori","other":"%{count} odgovorov"},"edit":"Uredi","save":"Shrani","cancel":"Prekliči","new_topic":"Odobritev tega elementa bo ustvarila novo temo","filters":{"all_categories":"(vse kategorije)","type":{"title":"Tip","all":"(vse vrste)"},"minimum_score":"Najnižja ocena:","refresh":"Osveži","status":"Stanje","category":"Kategorija","orders":{"score":"Ocena","created_at":"Ustvarjeno","created_at_asc":"Ustvarjeno (obratno)"},"priority":{"low":"(katerikoli)","medium":"Srednja","high":"Visoka"}},"conversation":{"view_full":"prikaži celo razpravo"},"scores":{"about":"Ta ocena je izračunana na podlagi nivoja zaupanja prijavitelja, ustreznosti njihovih prejšnjih prijav in prioritete prispevka, ki je bil prijavljen.","score":"Ocena","date":"Datum","type":"Tip","status":"Stanje","submitted_by":"Poslano od","reviewed_by":"Pregledano od"},"statuses":{"pending":{"title":"Za potrditev"},"approved":{"title":"Potrjeno"},"rejected":{"title":"Zavrnjeno"},"ignored":{"title":"Prezrto"},"deleted":{"title":"Izbrisano"},"reviewed":{"title":"(vsi pregledani)"},"all":{"title":"(vse)"}},"types":{"reviewable_flagged_post":{"title":"Prijavljen prispevek","flagged_by":"Prijavljen od"},"reviewable_queued_topic":{"title":"Tema v čakalni vrsti"},"reviewable_queued_post":{"title":"Prispevek za potrditev"},"reviewable_user":{"title":"Uporabnik"}},"approval":{"title":"Prispevek za odobritev.","description":"Prejeli smo vaš nov prispevek, vendar potrebuje odobritev s strani moderatorja preden bo objavljen. Prosimo za potrpežljivost.","pending_posts":{"one":"Imate \u003cstrong\u003e%{count}\u003c/strong\u003e prispevek za potrditev.","two":"Imate \u003cstrong\u003e%{count}\u003c/strong\u003e prispevka za potrditev.","few":"Imate \u003cstrong\u003e%{count}\u003c/strong\u003e prispevke za potrditev.","other":"Imate \u003cstrong\u003e%{count}\u003c/strong\u003e prispevkov za potrditev."},"ok":"OK"},"example_username":"uporabniško ime"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e je objavil \u003ca href='%{topicUrl}'\u003etemo\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eVi\u003c/a\u003e ste objavili \u003ca href='%{topicUrl}'\u003etemo\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e je odgovoril na \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eVi\u003c/a\u003e ste odgovorili na \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e je odgovoril na \u003ca href='%{topicUrl}'\u003etemo\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eVi\u003c/a\u003e ste odgovorili na \u003ca href='%{topicUrl}'\u003etemo\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e je omenil \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e je omenil \u003ca href='%{user2Url}'\u003evas\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eVi\u003c/a\u003e ste omenili \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Objavljeno od \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Objavljeno od \u003ca href='%{userUrl}'\u003evas\u003c/a\u003e","sent_by_user":"Poslano od \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Poslano od \u003ca href='%{userUrl}'\u003etebe\u003c/a\u003e"},"directory":{"username":"Uporabniško ime","filter_name":"filtriraj po uporabniškem imenu","title":"Uporabniki","likes_given":"Dano","likes_received":"Prejeto","topics_entered":"Ogledano","topics_entered_long":"Ogledane teme","time_read":"Prebrano","topic_count":"Tem","topic_count_long":"Ustvarjenih tem","post_count":"Odgovorov","post_count_long":"Objavljenih odgovorov","no_results":"Noben rezultat ni bil najden.","days_visited":"Obiskov","days_visited_long":"Dni prisotnosti","posts_read":"Prebrano","posts_read_long":"Prebranih prispevkov","last_updated":"Zadnja posodobitev:","total_rows":{"one":"%{count} uporabnik","two":"%{count} uporabnika","few":"%{count} uporabniki","other":"%{count} uporabnikov"},"map":{"title":"Zemljevid uporabnikov"},"list":{"title":"Seznam uporabnikov"}},"group_histories":{"actions":{"change_group_setting":"Spremeni nastavitve za skupino","add_user_to_group":"Dodaj uporabnika","remove_user_from_group":"Odstrani uporabnika","make_user_group_owner":"Spremeni v skrbnika","remove_user_as_group_owner":"Odstrani skrbnika"}},"groups":{"member_added":"Dodano","member_requested":"Zahtevano ob","add_members":{"title":"Dodaj člane v %{group_name}","description":"Sem lahko prilepite tudi seznam, ločen z vejicami.","usernames":"Vnesi uporabniška imena ali e-poštne naslove","input_placeholder":"Uporabniki ali e-poštni naslovi","notify_users":"Obvesti uporabnike"},"requests":{"title":"Zahtevki","reason":"Razlog","accept":"Odobri","accepted":"odobreno","deny":"Zavrni","denied":"zavrnjeno","undone":"zahtevek umaknjen","handle":"obravnavaj zahteve za članstvo"},"manage":{"title":"Upravljaj","name":"Ime skupine","full_name":"Polno ime","add_members":"Dodaj člane","delete_member_confirm":"Odstrani '%{username}' iz skupine '%{group}'?","profile":{"title":"Profil"},"interaction":{"title":"Interakcija","posting":"Objave","notification":"Obvestila"},"email":{"title":"E-naslov","status":"Sinhroniziranih %{old_emails} / %{total_emails} sporočil prek IMAP.","credentials":{"title":"Poverilnice","smtp_server":"Strežnik SMTP","smtp_port":"Vrata SMTP","smtp_ssl":"Uporabi SSL za SMTP","imap_server":"Strežnik IMAP","imap_port":"Vrata IMAP","imap_ssl":"Uporabi SSL za IMAP","username":"Uporabniško ime","password":"Geslo"},"mailboxes":{"synchronized":"Sinhronizirani nabiralnik","none_found":"V tem računu nismo našli poštnega nabiralnika.","disabled":"onemogočeno"}},"membership":{"title":"Članstvo","access":"Dostopnost"},"categories":{"title":"Kategorije","long_title":"Privzeta obvestila kategorije","description":"Ko so uporabniki dodani v to skupino, se njihove nastavitve obveščanja o kazegorijah nastavijo na te privzete vrednosti. Kasneje jih lahko ročno spremenijo.","watched_categories_instructions":"Samodejno opazuj vse teme v tej kategoriji. Člani skupine bodo obveščeni o vseh novih temah in prispevkih. Ob temi bo prikazano število novih prispevkov.","tracked_categories_instructions":"Samodejno sledi vsem temam v tej kategoriji. Število novih prispevkov se bo prikazovalo ob imenu teme.","watching_first_post_categories_instructions":"Uporabniki bodo obveščeni ob prvem prispevku v novi temi v tej kategoriji.","regular_categories_instructions":"Če so te kategorije utišane, bodo zopet vklopljene za člane skupine. Uporabniki bodo obveščeni, če bodo omenjeni ali jim bo kdo odgovoril.","muted_categories_instructions":"Nikoli ne boste obveščeni o novih temah v teh kategorijah in ne bodo se prikazovale med kategorijami in najnovejšimi."},"tags":{"title":"Oznake","long_title":"Privzeta obvestila oznak","description":"Ko so uporabniki dodani v to skupino, se njihove nastavitve obveščanja o oznakah nastavijo na te privzete vrednosti. Kasneje jih lahko ročno spremenijo.","watched_tags_instructions":"Samodejno opazuj vse teme s to oznako. Člani skupine bodo obveščeni o vseh novih temah in prispevkih. Ob temi bo prikazano število novih prispevkov.","tracked_tags_instructions":"Samodejno sledi vsem temam s to oznako. Ob temi bo prikazano število novih prispevkov.","watching_first_post_tags_instructions":"Člani bodo obveščeni ob prvem prispevku v novi temi s to oznako.","regular_tags_instructions":"Če so te oznake utišane, bodo zopet vklopljene za člane skupine. Uporabniki bodo obveščeni, če bodo omenjeni ali jim bo kdo odgovoril.","muted_tags_instructions":"Člani nikoli ne bodo obveščeni o novih temah s to oznako in ne bodo se prikazovale med najnovejšimi."},"logs":{"title":"Dnevniki","when":"Kdaj","action":"Dejanje","acting_user":"Izvajalec","target_user":"Ciljni uporabnik","subject":"Naslov","details":"Podrobnosti","from":"Od","to":"Za"}},"permissions":{"title":"Dovoljenja","none":"S to skupino ni povezana nobena kategorija.","description":"Člani te skupine lahko dostopajo do teh kategorij"},"public_admission":"Dovoli uporabnikom, da se sami pridružijo skupini (skupina mora biti javna)","public_exit":"Dovoli uporabnikom da sami zapustijo skupino","empty":{"posts":"Ni prispevkov članov skupine.","members":"Ta skupina nima članov.","requests":"Ni nobenih zahtevkov po članstvu v tej skupini.","mentions":"Ta skupina ni bila nikjer omenjena.","messages":"Ni sporočil za to skupino.","topics":"Člani te skupine nimajo nobene teme.","logs":"Dnevnik za to skupino je prazen."},"add":"Dodaj","join":"Pridruži se","leave":"Zapusti","request":"Zahteva","message":"Sporočilo","confirm_leave":"Ali ste prepričani, da želite zapustiti to skupino?","allow_membership_requests":"Dovoli uporabnikom, da lastnikom skupin pošiljajo zahteve za članstvo (zahteva javno vidno skupino)","membership_request_template":"Predloga za prikaz uporabnikom, ko zaprosijo za članstvo","membership_request":{"submit":"Zaprosi za članstvo","title":"Prošnja za pridružitev @%{group_name}","reason":"Sporoči skrbniku skupine zakaj spadaš v to skupino"},"membership":"Članstvo","name":"Ime","group_name":"Ime skupine","user_count":"Uporabniki","bio":"O skupini","selector_placeholder":"vnesi uporabniško ime","owner":"skrbnik","index":{"title":"Skupine","all":"Vse skupine","empty":"Ni javnih skupin.","filter":"Filtriraj po tipu skupine","owner_groups":"Sem skrbnik skupin","close_groups":"Zaprte skupine","automatic_groups":"Samodejne skupine","automatic":"Samodejno","closed":"Zaprto","public":"Javno","private":"Zasebno","public_groups":"Javne skupine","automatic_group":"Samodejna skupina","close_group":"Zapri skupino","my_groups":"Moje skupine","group_type":"Vrsta skupine","is_group_user":"Član","is_group_owner":"Skrbnik"},"title":{"one":"Skupina","two":"Skupini","few":"Skupine","other":"Skupine"},"activity":"Aktivnost","members":{"title":"Člani","filter_placeholder_admin":"uporabniško ime ali e-naslov","filter_placeholder":"uporabniško ime","remove_member":"Odstrani člana","remove_member_description":"Odstrani \u003cb\u003e%{username}\u003c/b\u003e iz te skupine","make_owner":"Izberi za skrbnika","make_owner_description":"Izberi \u003cb\u003e%{username}\u003c/b\u003e za skrbnika te skupine","remove_owner":"Odstrani kot skrbnika","remove_owner_description":"Odstrani \u003cb\u003e%{username} \u003c/b\u003e kot skrbnika te skupine","owner":"Skrbnik","forbidden":"Nimate dovoljenja da vidite člane."},"topics":"Teme","posts":"Prispevki","mentions":"Omembe","messages":"Sporočila","notification_level":"Privzeti nivo obvestil za sporočila skupini","alias_levels":{"mentionable":"Kdo lahko @omeni skupino?","messageable":"Kdo lahko pošlje sporočilo skupini?","nobody":"Nihče","only_admins":"Le administratorji","mods_and_admins":"Le moderatorji in administratorji","members_mods_and_admins":"Le člani skupine, moderatorji in administratorji","owners_mods_and_admins":"Samo za skrbnike skupin, moderatorje in administratorje","everyone":"Vsi"},"notifications":{"watching":{"title":"Opazujem","description":"Obveščeni boste o vsakem novem prispevku v vsakem sporočilu in prikazan bo število novih odgovorov."},"watching_first_post":{"title":"Opazujem prvi prispevek","description":"Obveščeni boste o novih sporočilih v tej skupini, ne pa tudi o odgovorih na ta sporočila."},"tracking":{"title":"Sledim","description":"Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori. Ob temi bo prikazano število novih odgovorov."},"regular":{"title":"Običajno","description":"Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori."},"muted":{"title":"Utišano","description":"Obveščeni boste o vsem na sporočilih v tej skupini."}},"flair_url":"Avatar Flair slika","flair_upload_description":"Uporabite kvadratne slike, ki niso manjše od 20 x 20 slikovnih pik.","flair_bg_color":"Avatar Flair barva ozadja","flair_bg_color_placeholder":"(neobvezno) Hex barvna vrednost","flair_color":"Avatar Flair barva","flair_color_placeholder":"(neobvezno) Hex barvna vrednost","flair_preview_icon":"Predogled ikone","flair_preview_image":"Predogled slike","flair_type":{"icon":"Izberite ikono","image":"Naložite sliko"}},"user_action_groups":{"1":"Dani všečki","2":"Prejeti všečki","3":"Zaznamki","4":"Teme","5":"Odgovori","6":"Odzivi","7":"Omembe","9":"Citati","11":"Urejanja","12":"Poslano","13":"Prejeto","14":"Čaka odobritev","15":"Osnutki"},"categories":{"all":"vse kategorije","all_subcategories":"vse","no_subcategory":"brez","category":"Kategorija","category_list":"Prikaži seznam kategorij","reorder":{"title":"Razvrsti kategorije","title_long":"Reorganiziraj seznam kategorij","save":"Shrani vrstni red","apply_all":"Uporabi","position":"Pozicija"},"posts":"Prispevki","topics":"Teme","latest":"Najnovejše","latest_by":"najnovejše po","toggle_ordering":"preklop nadzora razvrščanja","subcategories":"Pod Kategorija","muted":"Utišane kategorije","topic_sentence":{"one":"%{count} tema","two":"%{count} temi","few":"%{count} teme","other":"%{count} tem"},"topic_stat_sentence_week":{"one":"%{count} nova tema v preteklem tednu.","two":"%{count} novi temi v preteklem tednu.","few":"%{count} nove teme v preteklem tednu.","other":"%{count} novih tem v preteklem tednu."},"topic_stat_sentence_month":{"one":"%{count} nova tema v preteklem mesecu.","two":"%{count} novi temi v preteklem mesecu.","few":"%{count} nove teme v preteklem mesecu.","other":"%{count} novih tem v preteklem mesecu."},"n_more":"Kategorije (še %{count}) ..."},"ip_lookup":{"title":"Poizvedba IP naslova","hostname":"Ime gostitelja","location":"Lokacija","location_not_found":"(neznano)","organisation":"Organizacija","phone":"Telefon","other_accounts":"Ostali računi s tem IP naslovom:","delete_other_accounts":"Izbriši %{count}","username":"uporabniško ime","trust_level":"TL","read_time":"čas prebiranja","topics_entered":"vstop v teme","post_count":"# prispevkov","confirm_delete_other_accounts":"Ste prepričani, da želite izbrisati te račune?","powered_by":"s pomočjo \u003ca href='https://maxmind.com'\u003eMaxMindB\u003c/a\u003e","copied":"skopirano"},"user_fields":{"none":"(izberi možnost)","required":"Vnesite vrednost za \"%{name}«"},"user":{"said":"%{username}:","profile":"Profil","mute":"Utišaj","edit":"Uredi Nastavitve","download_archive":{"button_text":"Prenesi vse","confirm":"Ste prepričani, da želite prenesti svoje prispevke?","success":"Prenos se je začel, obveščeni boste s sporočilom, ko bo prenos končan.","rate_limit_error":"Prispevki so lahko prevešene enkrat dnevno, poskusi ponovno jutri."},"new_private_message":"Novo ZS","private_message":"Zasebno sporočilo","private_messages":"Zasebna sporočila","user_notifications":{"filters":{"filter_by":"Filtriraj po","all":"Vsi","read":"Čas branja","unread":"Neprebrane"},"ignore_duration_title":"Prezri uporabnika","ignore_duration_username":"Uporabniško ime","ignore_duration_when":"Trajanje:","ignore_duration_save":"Prezri","ignore_duration_note":"Vsi prezrti opomniki so samodejno odstranjeni ko poteče čas za preziranje.","ignore_duration_time_frame_required":"Izberite časovni okvir","ignore_no_users":"Nimate prezrtih uporabnikov","ignore_option":"Prezrti","ignore_option_title":"Ne boste prejemali obvestil povezanih z tem uporabnikom in vse njihove teme in odgovori bodo skriti.","add_ignored_user":"Dodaj...","mute_option":"Utišani","mute_option_title":"Ne boste prejemali obvestil povezanih s tem uporabnikom.","normal_option":"Običajno","normal_option_title":"Obveščeni boste, če vam ta uporabnik odgovori, vas citira ali vas omeni."},"activity_stream":"Aktivnost","preferences":"Nastavitve","feature_topic_on_profile":{"open_search":"Izberite novo temo","title":"Izberite temo","search_label":"Poiščite temo po naslovu","save":"Shrani","clear":{"title":"Počisti","warning":"Ali ste prepričani, da želite počistiti svojo izpostavljeno temo?"}},"use_current_timezone":"Uporabi trenutni časovni pas","profile_hidden":"Profil tega uporabnika je skrit.","expand_profile":"Razširi","collapse_profile":"Skrči","bookmarks":"Zaznamki","bio":"O meni","timezone":"Časovni pas","invited_by":"Povabilo od","trust_level":"Nivo zaupanja","notifications":"Obvestila","statistics":"Statistika","desktop_notifications":{"label":"Obvestila v brskalniku","not_supported":"Oprostite, obvestila niso podprta v tem brskalniku.","perm_default":"Vklopi obvestila","perm_denied_btn":"Dovoljenje zavrnjeno","perm_denied_expl":"Zavrnili ste dovoljenje za obvestila. Omogočite obvestila v nastavitvah vašega brskalnika.","disable":"Onemogoči obvestila","enable":"Omogoči obvestila","consent_prompt":"Ali hočete obvestila v brskalniku, ko prejmete odgovore na vaše prispevke?"},"dismiss":"Opusti","dismiss_notifications":"Opusti vse","dismiss_notifications_tooltip":"Označi vsa neprebrana obvestila kot prebrana","first_notification":"Vaše prvo obvestilo! Izberite ga za začetek.","dynamic_favicon":"Prikaži števec na ikoni brskalnika","skip_new_user_tips":{"description":"Preskoči namige in značke za nove uporabnike","not_first_time":"Niste začetnik?","skip_link":"Preskoči te namige"},"theme_default_on_all_devices":"Nastavi kot privzeti videz na vseh mojih napravah","color_scheme_default_on_all_devices":"Nastavi privzete barvne sheme v vseh mojih napravah","color_scheme":"Barvna shema","color_schemes":{"disable_dark_scheme":"Enako kot običajna","dark_instructions":"Barvno shemo temnega načina si lahko ogledate tako, da napravo preklopite v temni način.","undo":"Ponastavi","regular":"Običajna","dark":"Temni način","default_dark_scheme":"(privzeto za mesto)"},"dark_mode":"Temni način","dark_mode_enable":"Omogoči barvno shemo samodejnega temnega načina","text_size_default_on_all_devices":"Nastavi kot privzeto velikost besedila na vseh mojih napravah","allow_private_messages":"Dovoli drugim uporabnikom da mi pošiljajo zasebna sporočila.","external_links_in_new_tab":"Odpri vse zunanje povezave v novem zavihku","enable_quoting":"Omogoči odgovarjanje s citiranjem za poudarjen tekst","enable_defer":"Omogoči preloži za označiti teme kot neprebrane","change":"spremeni","featured_topic":"Izpostavljena tema","moderator":"%{user} je moderator","admin":"%{user} je administrator","moderator_tooltip":"Uporabnik je moderator","admin_tooltip":"Uporabnik je administrator","silenced_tooltip":"Ta uporabnik je utišan","suspended_notice":"Ta uporabnik je suspendiran do %{date}.","suspended_permanently":"Ta uporabnik je suspendiran","suspended_reason":"Razlog: ","github_profile":"GitHub","email_activity_summary":"Povzetek aktivnosti","mailing_list_mode":{"label":"E-sporočilo za vsak prispevek","enabled":"Vklopi pošiljanje e-sporočila za vsak prispevek","instructions":"Ta nastavitev spremeni povzetek aktivnosti.\u003cbr /\u003e\nIzključene teme in kategorije niso vključene v ta obvestila.\n","individual":"Pošljite e-sporočilo za vsako novo objavo","individual_no_echo":"Pošljite e-sporočilo za vsako novo objavo, razen moje","many_per_day":"Pošljite mi e-sporočilo za vsako novo objavo (okvirno %{dailyEmailEstimate} na dan)","few_per_day":"Pošljite mi e-sporočilo za vsako novo objavo (okvirno 2 na dan)","warning":"Način pošiljanja poštnega seznama je omogočen. Nastavitve obveščanja po e-pošti so preglašene."},"tag_settings":"Oznake","watched_tags":"Opazujem","watched_tags_instructions":"Samodejno boste opazovali vse teme s to oznako. Obveščeni boste o vseh novih temah in prispevkih. Ob temi bo prikazano število novih prispevkov.","tracked_tags":"Sledim","tracked_tags_instructions":"Samodejno boste sledili vse teme s to oznako. Ob temi bo prikazano število novih prispevkov.","muted_tags":"Utišano","muted_tags_instructions":"Nikoli ne boste obveščeni o novih temah s to oznako in ne bodo se prikazovale med najnovejšimi.","watched_categories":"Opazujem","watched_categories_instructions":"Samodejno boste opazovali vse teme v tej kategoriji. Obveščeni boste o vseh novih prispevkih in temah in število novih prispevkov se bo prikazovalo ob imenu teme.","tracked_categories":"Sledim","tracked_categories_instructions":"Samodejno boste sledili vsem temam v tej kategoriji. Število novih prispevkov se bo prikazovalo ob imenu teme.","watched_first_post_categories":"Opazujem prvi prispevek","watched_first_post_categories_instructions":"Obveščeni boste ob prvem prispevku v novi temi v tej kategoriji.","watched_first_post_tags":"Opazujem prvi prispevek","watched_first_post_tags_instructions":"Obveščeni boste ob prvem prispevku v novi temi s to oznako.","muted_categories":"Utišano","muted_categories_instructions":"Nikoli ne boste obveščeni o novih temah v tej kategoriji in ne bodo se prikazovale med najnovejšimi.","muted_categories_instructions_dont_hide":"Ne boste obveščeni o ničemer o novimi temami v teh kategorijah","regular_categories":"Običajne","regular_categories_instructions":"Te kategorije boste videli na seznamih tem \"Najnovejše\" in \"Najboljše\".","no_category_access":"Kot moderator imaš omejen dostop do kategorije, shranjevanje je onemogočeno","delete_account":"Izbriši moj račun","delete_account_confirm":"Ste prepričani, da želite trajno izbrisati svoj račun? Tega postopka ni mogoče razveljaviti!","deleted_yourself":"Vaš račun je bil uspešno izbrisan.","delete_yourself_not_allowed":"Če želite izbrisati svoj račun, se obrnite na člana osebja.","unread_message_count":"Sporočila","admin_delete":"Izbriši","users":"Uporabniki","muted_users":"Utišano","muted_users_instructions":"Zavrni vsa obvestila in ZS od teh uporabnikov.","allowed_pm_users":"Dovoljeni","allowed_pm_users_instructions":"Dovoli ZS samo od teh uporabnikov.","allow_private_messages_from_specific_users":"Dovoli samo določenim uporabnikom, da mi pošiljajo zasebna sporočila","ignored_users":"Prezrti","ignored_users_instructions":"Skrij vse objave, obvestila in ZS od teh uporabnikov.","tracked_topics_link":"Prikaži","automatically_unpin_topics":"Samodejno odpni temo, ko preberem zadnji prispevek.","apps":"Aplikacije","revoke_access":"Prekliči dostop","undo_revoke_access":"Razveljavi preklic dostopa","api_approved":"Odobreno","api_last_used_at":"Zadnjič uporabljeno:","theme":"Videz","save_to_change_theme":"Tema bo posodobljena, ko kliknete \"%{save_text}\"","home":"Privzeta začetna stran","staged":"Prirejen","staff_counters":{"flags_given":"oznake v pomoč","flagged_posts":"prijavljeni prispevki","deleted_posts":"izbrisani prispevki","suspensions":"suspendiranih","warnings_received":"opozorila","rejected_posts":"zavrnjene objave"},"messages":{"all":"Vse","inbox":"Prejeto","sent":"Poslano","archive":"Arhiv","groups":"Moje Skupine","bulk_select":"Izberi Sporočila","move_to_inbox":"Prestavi v Prejeto","move_to_archive":"Arhiv","failed_to_move":"Premik izbranih sporočil ni uspel (mogoče je vaša povezava prekinjena)","select_all":"Izberi vse","tags":"Oznake"},"preferences_nav":{"account":"Račun","profile":"Profil","emails":"E-sporočila","notifications":"Obvestila","categories":"Kategorije","users":"Uporabniki","tags":"Oznake","interface":"Uporabniški vmesnik","apps":"Aplikacije"},"change_password":{"success":"(e-sporočilo poslano)","in_progress":"(pošiljanje e-sporočila)","error":"(napaka)","action":"Pošlji e-sporočilo za zamenjavo gesla","set_password":"Nastavi geslo","choose_new":"Izberite novo geslo","choose":"Izberite geslo"},"second_factor_backup":{"title":"Rezervne potrditvene kode za preverjanje v dveh korakih","regenerate":"Ponovno ustvari","disable":"Onemogoči","enable":"Omogoči","enable_long":"Omogočite rezervne potrditvene kode","copy_to_clipboard":"Kopiraj v odložišče","copy_to_clipboard_error":"Napaka pri prenosu na odlagališče","copied_to_clipboard":"Kopirano v odložišče","download_backup_codes":"Prenesite nadomestne kode","use":"Uporabite nadomestno kodo","codes":{"title":"Rezervne potrditvene kode ustvarjene","description":"Vsaka od rezervnih potrditvenih kod se lahko uporabi samo enkrat. Shranite jih na varno, ampak dostopno mesto."}},"second_factor":{"title":"Preverjanje v dveh korakih","enable":"Upravljajte preverjanje v dveh korakih","disable_all":"Onemogoči vse","forgot_password":"Ste pozabili geslo?","confirm_password_description":"Vnesite geslo za nadaljevanje","name":"Polno ime","label":"Koda","rate_limit":"Počakajte preden uporabite novo potrditveno kodo.","enable_description":"Skeniraj to QR kodo v podprti aplikaciji (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) in vnesi vašo potrditveno kodo.\n","disable_description":"Vnesite potrditveno kodo iz vaše aplikacije","show_key_description":"Vnesite ročno","short_description":"Zaščitite svoj račun z varnostnimi kodami za enkratno uporabo.\n","oauth_enabled_warning":"Preverjanje v dveh korakih bo onemogočilo prijavo z družabnimi omrežji.","use":"Uporabite aplikacijo Authenticator","enforced_notice":"Obvezno morate vklopiti preverjanje v dveh korakih za dostop to tega spletnega mesta.","disable":"Onemogoči","disable_confirm":"Ali ste prepričani, da želite onemogočiti vse metode za preverjanje v dveh korakih?","save":"Shrani","edit":"Uredi","edit_title":"Uredi overitelja","edit_description":"Ime overitelja","totp":{"title":"Overjanje na osnovi žetonov","add":"Dodaj overitelja","default_name":"Moj overitelj","name_and_code_required_error":"Navesti morate ime in kodo iz aplikacije za preverjanje pristnosti."},"security_key":{"register":"Registracija","title":"Varnostni ključi","add":"Dodajte varnostni ključ","default_name":"Glavni varnostni ključ","not_allowed_error":"Postopek registracije varnostnega ključa je potekel ali pa je bil preklican.","already_added_error":"Ta varnostni ključ ste že registrirali. Ni ga treba ponovno registrirati.","edit":"Uredi varnostni ključ","save":"Shrani","edit_description":"Ime varnostnega ključa","name_required_error":"Navesti morate ime varnostnega ključa."}},"change_about":{"title":"Spremeni O meni","error":"Prišlo je do napake pri spreminjanju te vrednosti"},"change_username":{"title":"Spremeni uporabniško ime","confirm":"Ali ste prepričani, da želite zamenjati vaše uporabniško ime?","taken":"Oprostite, to uporabniško ime je zasedeno.","invalid":"Uporabniško ime ni pravilno. Vsebuje lahko samo črke in številke. Preslednica in posebni znaki niso dovoljeni."},"add_email":{"title":"Dodaj e-naslov","add":"dodaj"},"change_email":{"title":"Spremeni e-naslov","taken":"Ta e-naslov ni na voljo.","error":"Prišlo je do napake pri zamenjavi e-naslova. Je ta e-naslov že v uporabi?","success":"Poslali smo e-sporočilo na ta naslov. Sledite navodilom za potrditev.","success_via_admin":"Poslali smo e-sporočilo na ta naslov. Uporabnik bo moral slediti navodilom za potrditev.","success_staff":"Poslali smo e-sporočilo na vaš trenutni naslov. Sledite navodilom za potrditev."},"change_avatar":{"title":"Menjaj profilno sliko","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, na podlagi","gravatar_title":"Spremenite svoj avatar na spletnem mestu %{gravatarName}","gravatar_failed":"%{gravatarName} s tem e-poštnim naslovom ni bilo mogoče najti.","refresh_gravatar_title":"Osvežite svoj %{gravatarName}","letter_based":"Sistemska slika profila","uploaded_avatar":"Slika po meri","uploaded_avatar_empty":"Dodaj sliko po meri","upload_title":"Prenesi svojo sliko","image_is_not_a_square":"Opozorilo: obrezali smo vašo sliko; širina in višina nista bili enaki."},"change_profile_background":{"title":"Glava profila","instructions":"Glave profilov bodo centrirane in imele širino 1110px."},"change_card_background":{"title":"Ozadje kartice uporabnika","instructions":"Ozadje kartice bo centrirano in imelo širino 590px."},"change_featured_topic":{"title":"Izpostavljena tema","instructions":"Povezava do te teme bo na vaši uporabniški kartici in profilu."},"email":{"title":"E-naslov","primary":"E-naslov","secondary":"Dodatni e-naslovi","primary_label":"primarni","unconfirmed_label":"nepotrjeno","resend_label":"ponovno pošlji potrditveno e-sporočilo","resending_label":"pošiljanje...","resent_label":"e-sporočilo poslano","update_email":"Spremeni e-naslov","set_primary":"Nastavite primarni e-poštni naslov","destroy":"Odstrani e-poštni naslov","add_email":"Dodajte nadomestni e-poštni naslov","sso_override_instructions":"E-naslov se lahko spremeni pri SSO ponudniku.","no_secondary":"Ni dodatnih e-naslovov","instructions":"se nikoli ne prikaže javno","admin_note":"Opomba: Kadar skrbnik spremeni e-naslov drugega uporabnika, ki ni skrbnik, je to indikator, da je uporabnik izgubil dostop do svojega izvornega e-poštnega računa, zato bo e-poštno sporočilo za ponastavitev gesla poslano na nov naslov. Uporabnikov e-naslov ne bo spremenjen, dokler ne zaključi postopka ponastavitve gesla.","ok":"Poslali vam bomo e-sporočilo za potrditev.","required":"Vnesite e-poštni naslov","invalid":"Vnesite veljaven e-naslov.","authenticated":"Vaš e-poštni naslov je overil %{provider}","frequency_immediately":"Takoj vam bomo poslali e-pošto, če še niste prebrali stvari, o kateri vam pišemo.","frequency":{"one":"E-sporočilo bo poslano samo če niste bili aktivni v zadnji minuti.","two":"E-sporočilo bo poslano samo če niste bili aktivni vsaj %{count} minuti.","few":"E-sporočilo bo poslano samo če niste bili aktivni vsaj %{count} minute.","other":"E-sporočilo bo poslano samo če niste bili aktivni vsaj %{count} minut."}},"associated_accounts":{"title":"Povezani računi","connect":"Poveži","revoke":"Prekliči","cancel":"Prekliči","not_connected":"(ni povezano)","confirm_modal_title":"Poveži %{provider} račun","confirm_description":{"account_specific":"Vaš %{provider} račun '%{account_description}' bo uporabljen za preverjanje pristnosti.","generic":"Vaš %{provider} račun bo uporabljen za preverjanje pristnosti."}},"name":{"title":"Polno ime","instructions":"vaše polno ime (neobvezno)","instructions_required":"Vaše polno ime","required":"Vnesite ime","too_short":"Ime je prekratko","ok":"Vaše ime je ustrezno"},"username":{"title":"Uporabniško ime","instructions":"unikatno, brez presledkov, kratko","short_instructions":"Ljudje vas lahko omenijo kot @%{username}","available":"Vaše uporabniško ime je prosto","not_available":"Ni na voljo. Poskusi %{suggestion}?","not_available_no_suggestion":"Ni na voljo","too_short":"Vaše uporabniško ime je prekratko","too_long":"Vaše uporabniško ime je predolgo","checking":"Preverjam če je uporabniško ime prosto...","prefilled":"E-naslov ustreza uporabniškemu imenu","required":"Vnesite uporabniško ime"},"locale":{"title":"Jezik vmesnika","instructions":"Jezik uporabniškega vmesnika. Zamenjal se bo, ko boste osvežili stran.","default":"(privzeto)","any":"katerokoli"},"password_confirmation":{"title":"Geslo - ponovno"},"invite_code":{"title":"Koda za povabilo","instructions":"Za registracijo računa je potrebna koda za povabilo"},"auth_tokens":{"title":"Nedavno uporabljene naprave","details":"Podrobnosti","log_out_all":"Odjavi vse naprave","not_you":"To niste vi?","show_all":"Prikaži vse (%{count})","show_few":"Prikaži manj","was_this_you":"Ste bili to vi?","was_this_you_description":"Če to niste bili vi, vam predlagamo da spremenite geslo in se odjavite iz vseh naprav.","browser_and_device":"%{browser} na %{device}","secure_account":"Zavaruj moj račun","latest_post":"Nazadnje ste objavili...","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eaktiven zdaj\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"Zadnji prispevek","last_emailed":"Zadnja e-pošta","last_seen":"Viden","created":"Pridružen","log_out":"Odjava","location":"Lokacija","website":"Spletna stran","email_settings":"E-naslov","hide_profile_and_presence":"Skrij moj javni profil in prisotnost","enable_physical_keyboard":"Omogoči podporo fizične tipkovnice na iPadu","text_size":{"title":"Velikost besedila","smallest":"Najmanjša","smaller":"Majhna","normal":"Običajna","larger":"Večja","largest":"Največja"},"title_count_mode":{"title":"Stran v ozadju prikazuje števec kot:","notifications":"Nova obvestila","contextual":"Nova vsebina na strani"},"like_notification_frequency":{"title":"Obvesti o všečkih","always":"Vedno","first_time_and_daily":"Prvič ko je prispevek všečkan in dnevno","first_time":"Prvič ko je prispevek všečkan","never":"Nikoli"},"email_previous_replies":{"title":"Vključi prejšnje odgovore na koncu e-sporočila","unless_emailed":"če ni že poslano","always":"vedno","never":"nikoli"},"email_digests":{"title":"Ko nisem prisoten, mi pošljite e-sporočilo s povzetkom popularnih tem in prispevkov.","every_30_minutes":"vsakih 30 minut","every_hour":"vsako uro","daily":"dnevno","weekly":"tedensko","every_month":"vsak mesec","every_six_months":"vsakih 6 mesecev"},"email_level":{"title":"Pošlji mi e-sporočilo, ko me nekdo citira, odgovori na moj prispevek, omeni moje @ime ali me povabi v temo.","always":"vedno","only_when_away":"samo ko sem odsoten","never":"nikoli"},"email_messages_level":"Pošlji mi e-sporočilo, ko mi nekdo pošlje zasebno sporočilo","include_tl0_in_digests":"V e-sporočilo s povzetki vključi vsebino, ki so jo dodali novi uporabniki","email_in_reply_to":"Vključi povzetek prispevka v e-sporočilo","other_settings":"Ostalo","categories_settings":"Kategorije","new_topic_duration":{"label":"Obravnavaj temo kot novo","not_viewed":"je še neprebrana","last_here":"ustvarjeno po mojem zadnjem obisku","after_1_day":"ustvarjeno v zadnjem dnevu","after_2_days":"ustvarjeno v zadnjih 2 dnevih","after_1_week":"ustvarjeno v zadnjem tednu","after_2_weeks":"ustvarjeno v zadnjih 2 tednih"},"auto_track_topics":"Samodejno sledi temam, ki jih berem","auto_track_options":{"never":"nikoli","immediately":"takoj","after_30_seconds":"po 30 sekundah","after_1_minute":"po 1 minuti","after_2_minutes":"po 2 minutah","after_3_minutes":"po 3 minutah","after_4_minutes":"po 4 minutah","after_5_minutes":"po 5 minutah","after_10_minutes":"po 10 minutah"},"notification_level_when_replying":"Ko objavim v določeni temi, nastavi temo na","invited":{"search":"išči povabila...","title":"Povabila","user":"Povabljen uporabnik","sent":"Nazadnje poslano","none":"Ni povabil za prikaz.","truncated":{"one":"Prikazano prvo povabilo.","two":"Prikazana prva %{count} povabila.","few":"Prikazanih prva %{count} povabila.","other":"Prikazanih prvih %{count} povabil."},"redeemed":"Sprejeta povabila","redeemed_tab":"Sprejeto","redeemed_tab_with_count":"Sprejeto (%{count})","redeemed_at":"Sprejeto","pending":"Povabila v teku","pending_tab":"V teku","pending_tab_with_count":"V teku (%{count})","topics_entered":"Ogledanih tem","posts_read_count":"Prebranih prispevkov","expired":"To povabilo je poteklo.","rescind":"Odstrani","rescinded":"Povabilo odstranjeno","rescind_all":"Odstranite potekla povabila","rescinded_all":"Vsa pretečena povabila odstranjena!","rescind_all_confirm":"Ali ste prepričani, da hočete odstraniti vsa pretečena povabila?","reinvite":"Ponovno povabi","reinvite_all":"Ponovno pošlji vsa","reinvite_all_confirm":"Ste prepričani, da želite ponovno poslati vsa povabila?","reinvited":"Povabilo ponovno poslano","reinvited_all":"Vsa povabila ponovno poslana!","time_read":"Čas branja","days_visited":"Dni prisotnosti","account_age_days":"Starost računa v dnevih","source":"Povabljen preko","links_tab":"Povezave","links_tab_with_count":"Povezave (%{count})","link_url":"Povezava","link_created_at":"Ustvarjeno","link_redemption_stats":"Izkoriščene","link_groups":"Skupine","link_expires_at":"Poteče","copy_link":"Pokaži povezavo","generate_link":"Ustvari povezavo za povabilo","link_generated":"Tu je povezava do vašega povabila!","valid_for":"Povezava s povabilom je veljavna samo za e-naslov: %{email}","single_user":"Povabi po e-pošti","multiple_user":"Povabi po povezavi","invite_link":{"title":"Povezava povabila","success":"Povezava s povabilom ustvarjena!","error":"Pri ustvarjanju povezave povabila je prišlo do napake","max_redemptions_allowed_label":"Koliko ljudi se lahko registrira s to povezavo?","expires_at":"Kdaj bo ta povezava povabila potekla?"},"bulk_invite":{"text":"Skupinsko povabilo","success":"Datoteka je uspešno naložena. Obveščeni boste, ko bo postopek zaključen.","error":"Datoteka mora biti v CSV obliki.","confirmation_message":"Poslali boste povabila preko e-pošte vsem iz naložene datoteke."}},"password":{"title":"Geslo","too_short":"Vaše geslo je prekratko.","common":"To geslo je preveč običajno.","same_as_username":"Vaše geslo je enako kot uporabniško ime.","same_as_email":"Vaše geslo je enako kot vaš e-naslov.","ok":"Vaše geslo je videti v redu.","instructions":"vsaj %{count} znakov","required":"Vnesite geslo"},"summary":{"title":"Vsebina","stats":"Statistika","time_read":"čas branja","recent_time_read":"nedaven čas branja","topic_count":{"one":"ustvarjena tema","two":"ustvarjeni temi","few":"ustvarjene teme","other":"ustvarjenih tem"},"post_count":{"one":"prispevek","two":"prispevka","few":"prispevki","other":"prispevkov"},"likes_given":{"one":"dan","two":"dana","few":"dani","other":"danih"},"likes_received":{"one":"sprejet","two":"sprejeta","few":"sprejeti","other":"sprejetih"},"days_visited":{"one":"dan prisotnosti","two":"dneva prisotnosti","few":"dnevi prisotnosti","other":"dni prisotnosti"},"topics_entered":{"one":"ogledana tema","two":"ogledani temi","few":"ogledane teme","other":"ogledanih tem"},"posts_read":{"one":"prebran prispevek","two":"prebrana prispevka","few":"prebrani prispevki","other":"prebranih prispevkov"},"bookmark_count":{"one":"zaznamek","two":"zaznamka","few":"zaznamki","other":"zaznamkov"},"top_replies":"Najboljši odgovori","no_replies":"Ni odgovorov.","more_replies":"Več odgovorov","top_topics":"Najboljše teme","no_topics":"Ni prispevkov.","more_topics":"Več tem","top_badges":"Najboljše značke","no_badges":"Ni značk.","more_badges":"Več značk","top_links":"Najboljše povezave","no_links":"Ni povezav.","most_liked_by":"Največ všečkov od","most_liked_users":"Največ všečkov za","most_replied_to_users":"Največkrat odgovorjeno","no_likes":"Ni všečkov.","top_categories":"Najboljše kategorije","topics":"Teme","replies":"Odgovorov"},"ip_address":{"title":"Zadnji IP naslov"},"registration_ip_address":{"title":"Registracijski IP naslov"},"avatar":{"title":"Slika profila","header_title":"profil, zasebna sporočila, zaznamki in nastavitve"},"title":{"title":"Naziv","none":"(brez)"},"primary_group":{"title":"Primarna skupina","none":"(brez)"},"filters":{"all":"Vse"},"stream":{"posted_by":"Avtor","sent_by":"Poslano od","private_message":"zasebno sporočilo","the_topic":"tema"},"map_location":{"title":"Lokacija na zemljevidu","warning":"Vaša lokacija bo prikazana javno."}},"loading":"Nalagam...","errors":{"prev_page":"med nalaganjem","reasons":{"network":"napaka na mreži","server":"napaka na strežniku","forbidden":"dostop zavrnjen","unknown":"napaka","not_found":"stran ne obstaja"},"desc":{"network":"Preverite vašo povezavo","network_fixed":"Kaže, da povezava zopet deluje.","server":"Oznaka napake: %{status}","forbidden":"Nimate dostopa.","not_found":"Aplikacija je hotela naložiti URL, ki ne obstaja.","unknown":"Nekaj je šlo narobe."},"buttons":{"back":"Nazaj","again":"Poskusi ponovno","fixed":"Naloži stran"}},"modal":{"close":"zapri","dismiss_error":"Opustite napako"},"close":"Zapri","assets_changed_confirm":"Stran ji bala pravkar posodobljena. Osvežimo takoj za zadnjo verzijo?","logout":"Bili ste odjavljeni.","refresh":"Osveži","home":"Domov","read_only_mode":{"enabled":"To spletno mesto je v načinu samo za branje. Lahko nadaljujete z brskanjem, vendar bodo odgovori, všečki in druga dejanja za zdaj onemogočeni.","login_disabled":"Prijava je onemogočena dokler je stran v načinu za branje.","logout_disabled":"Odjava je onemogočena dokler je stran v načinu za branje."},"learn_more":"izvedite več...","all_time":"skupaj","all_time_desc":"skupaj ustvarjenih tem","year":"leto","year_desc":"teme, ustvarjene v preteklih 365 dneh","month":"mesec","month_desc":"teme, ustvarjene v preteklih 30 dneh","week":"teden","week_desc":"teme, ustvarjene v preteklih 7 dneh","day":"dan","first_post":"Prvi prispevek","mute":"Utišano","unmute":"Povrni glasnost","last_post":"Zadnji prispevek","local_time":"Lokalni čas","time_read":"Čas branja","time_read_recently":"%{time_read} nedavno","time_read_tooltip":"%{time_read} branja skupaj","time_read_recently_tooltip":"%{time_read} branja skupaj (%{recent_time_read} v zadnjih 60 dneh)","last_reply_lowercase":"zadnji odgovor","replies_lowercase":{"one":"odgovor","two":"odgovora","few":"odgovori","other":"odgovorov"},"signup_cta":{"sign_up":"Registracija","hide_session":"Spomni me jutri","hide_forever":"ne, hvala","hidden_for_session":"Hvala, ponovno vas vprašamo jutri. Vedno pa lahko uporabite gumb 'Prijava', da ustvarite nov račun.","intro":"Pozdravljeni! Vidimo, da uživate v branju razprave, vendar se še niste registrirali kot uporabnik.","value_prop":"Ko registrirate uporabniški račun, si lahko zapomnimo točno kaj ste že prebrali, tako da boste naslednjič lahko nadaljevali od tam, kjer ste končali. Lahko boste tudi prejemali obvestila, tukaj ali preko e-sporočila vsakič, ko vam nekdo odgovori. In lahko boste všečkali prispevke, ki so vam všeč. :heartpulse:"},"summary":{"enabled_description":"Ogledujete si povzetek teme: najbolj zanimive prispevke, kot jih je določila skupnost.","description":"Obstaja \u003cb\u003e%{replyCount}\u003c/b\u003e odgovorov.","description_time":"Obstaja \u003cb\u003e%{replyCount}\u003c/b\u003e odgovorov z ocenjenim časom branja \u003cb\u003e%{readingTime} minut\u003c/b\u003e.","enable":"Pripravi povzetek teme","disable":"Prikaži vse prispevke"},"deleted_filter":{"enabled_description":"Ta tema vsebuje izbrisane prispevke, ki so skriti.","disabled_description":"Izbrisani prispevki so prikazani.","enable":"Skrij izbrisane prispevke","disable":"Prikaži izbrisane prispevke"},"private_message_info":{"title":"Sporočilo","invite":"Povabi druge...","edit":"Dodaj ali odstrani...","remove":"Odstrani...","add":"Dodaj...","leave_message":"Ali hočete res zapustiti to sporočilo?","remove_allowed_user":"Ali resnično želite odstraniti %{name} s tega sporočila?","remove_allowed_group":"Ali resnično želite odstraniti %{name} s tega sporočila?"},"email":"E-naslov","username":"Uporabniško ime","last_seen":"Viden","created":"Ustvarjeno","created_lowercase":"ustvarjeno","trust_level":"Nivo zaupanja","search_hint":"uporabniško ime, e-naslov ali IP naslov","create_account":{"disclaimer":"Z registracijo sprejemate \u003ca href='%{privacy_link}' target='blank'\u003ePravilnik o zasebnosti\u003c/a\u003e in \u003ca href='%{tos_link}' target='blank'\u003ePogoje uporabe\u003c/a\u003e.","title":"Registracija uporabnika","failed":"Nekaj je šlo narobe, morda je ta e-naslov že registriran, poskusite povezavo za pozabljeno geslo."},"forgot_password":{"title":"Zamenjava gesla","action":"Pozabil sem geslo","invite":"Vpišite uporabniško ime ali e-naslov in poslali vam bomo e-sporočilo za zamenjavo gesla.","reset":"Zamenjaj geslo","complete_username":"Če obstaja račun za uporabniško ime \u003cb\u003e%{username}\u003c/b\u003e, boste kmalu prejeli e-sporočilo z navodili za zamenjavo gesla.","complete_email":"Če račun ustreza \u003cb\u003e%{email}\u003c/b\u003e, boste v kratkem prejeli e-sporočilo z navodili za zamenjavo gesla.","complete_username_found":"Račun z uporabniškim imenom \u003cb\u003e%{username}\u003c/b\u003e obstaja. V kratkem bi morali prejeti e-sporočilo z navodili za ponastavitev gesla.","complete_email_found":"Račun z uporabniškim imenom \u003cb\u003e%{email}\u003c/b\u003e obstaja. V kratkem bi morali prejeti e-sporočilo z navodili za ponastavitev gesla.","complete_username_not_found":"Račun z uporabniškim imenom \u003cb\u003e%{username}\u003c/b\u003e ne obstaja.","complete_email_not_found":"Račun z e-naslovom \u003cb\u003e%{email}\u003c/b\u003ene obstaja.","help":"Ali e-pošta ne prihaja? Najprej preverite mapo z neželeno pošto.\u003cp\u003eNe veste kateri e-naslov ste uporabili? Vpišite e-naslov in povedali vam bomo, če obstaja pri nas.\u003c/p\u003e\u003cp\u003eČe nimate več dostopa do e-naslova vašega računa se obrnite na \u003ca href='%{basePath}/about'\u003enašo ekipo.\u003c/a\u003e\u003c/p\u003e","button_ok":"V redu","button_help":"Pomoč"},"email_login":{"link_label":"Pošlji mi povezavo za prijavo na e-pošto","button_label":"z e-pošto","emoji":"emoji za ključavnico","complete_username":"Če obstaja račun za uporabniško ime \u003cb\u003e%{username}\u003c/b\u003e boste v kratkem prejeli e-sporočilo s povezavo za prijavo.","complete_email":"Če obstaja račun z e-naslovom \u003cb\u003e%{email}\u003c/b\u003e boste v kratkem prejeli e-sporočilo s povezavo za prijavo.","complete_username_found":"Račun z uporabniškim imenom \u003cb\u003e%{username}\u003c/b\u003e obstaja. V kratkem bi morali prejeti e-sporočilo s povezavo za samodejno prijavo.","complete_email_found":"Račun z e-naslovom \u003cb\u003e%{email}\u003c/b\u003e obstaja. V kratkem bi morali prejeti e-sporočilo s povezavo za samodejno prijavo.","complete_username_not_found":"Račun z uporabniškim imenom \u003cb\u003e%{username}\u003c/b\u003e ne obstaja.","complete_email_not_found":"Noben račun se ne ujema z \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Nadaljujte na %{site_name}","logging_in_as":"Prijava kot %{email}","confirm_button":"Zaključi prijavo"},"login":{"title":"Prijava","username":"Uporabnik","password":"Geslo","second_factor_title":"Preverjanje v dveh korakih","second_factor_description":"Vnesite potrditveno kodo iz vaše aplikacije:","second_factor_backup":"Prijavite se z nadomestno kodo","second_factor_backup_title":"Rezervna potrditvena koda","second_factor_backup_description":"Vnesite eno od rezervnih potrditvenih kod:","second_factor":"Prijavite se z aplikacijo Authenticator","security_key_description":"Ko imate pripravljen fizični varnostni ključ, pritisnite spodnji gumb Preveri pristnost z varnostnim ključem.","security_key_alternative":"Poskusite na drug način","security_key_authenticate":"Preverite z varnostnim ključem","security_key_not_allowed_error":"Postopek preverjanja z varnostnim ključem je potekel ali pa je bil preklican.","security_key_no_matching_credential_error":"V podanem varnostnem ključu ni bilo mogoče najti ustreznih poverilnic.","security_key_support_missing_error":"Vaša trenutna naprava ali brskalnik ne podpira uporabe varnostnih ključev. Uporabite drug način.","email_placeholder":"e-naslov ali uporabniško ime","caps_lock_warning":"Caps Lock je vključen","error":"Neznana napaka","cookies_error":"Brskalnik ima izklopljene piškotke. Mogoče se ne boste uspeli prijaviti, dokler jih ne omogočite.","rate_limit":"Počakajte preden se poskusite ponovno prijaviti.","blank_username":"Vnesite uporabniško ime ali e-naslov.","blank_username_or_password":"Vpišite e-naslov ali uporabniško ime in geslo.","reset_password":"Zamenjaj geslo","logging_in":"Prijava v teku...","or":"ali","authenticating":"Preverjanje...","awaiting_activation":"Vaš uporabniški račun čaka na aktivacijo. Če želite ponovno prejeti e-sporočilo za aktivacijo izberite povezavo za pozabljeno geslo.","awaiting_approval":"Vaš uporabniški račun še ni bil potrjen s strani člana osebja foruma. Ko bo potrjen boste prejeli e-sporočilo.","requires_invite":"Oprostite, dostop do foruma je mogoč samo preko povabila.","not_activated":"Ne morete se še prijaviti. Pred časom smo poslali aktivacijsko e-sporočilo na \u003cb\u003e%{sentTo}\u003c/b\u003e. Sledite navodilom v e-sporočilu da akitivirate vaš uporabniški račun.","not_allowed_from_ip_address":"Ne morete se prijaviti s tega IP naslova.","admin_not_allowed_from_ip_address":"Ne morete se prijaviti kot administrator iz tega IP naslova.","resend_activation_email":"Kliknite tukaj za ponovno pošiljanje aktivacijskega e-sporočila.","omniauth_disallow_totp":"Vaš račun ima vklopljeno preverjanje v dveh korakih. Prijavite se z vašim geslom.","resend_title":"Ponovno pošlji aktivacijsko e-sporočilo","change_email":"Spremeni e-naslov","provide_new_email":"Vpišite nov e-naslov in ponovno vam bomo poslali potrditveno e-sporočilo.","submit_new_email":"Posodobite e-poštni naslov","sent_activation_email_again":"Poslali smo vam novo aktivacijsko sporočilo na \u003cb\u003e%{currentEmail}\u003c/b\u003e. Lahko traja nekaj minut, da ga boste prejeli - drugače preverite mapo z neželeno pošto.","sent_activation_email_again_generic":"Poslali smo vam novo aktivacijsko sporočilo. Lahko traja nekaj minut, da ga boste prejeli - drugače preverite mapo z neželeno pošto.","to_continue":"Prijavite se","preferences":"Za spremembo nastavitev morate biti prijavljeni.","not_approved":"Vaš uporabniški račun še ni bil potrjen. Ko bo pripravljen za prijavo boste obveščeni preko e-sporočila.","google_oauth2":{"name":"Google","title":"Google"},"twitter":{"name":"Twitter","title":"Twitter"},"instagram":{"name":"Instagram","title":"z Instagramom"},"facebook":{"name":"Facebook","title":"s Facebookom"},"github":{"name":"GitHub","title":"z GitHubom"},"discord":{"name":"Discord","title":"z Discordom"},"second_factor_toggle":{"totp":"Namesto tega uporabite authenticator aplikacijo","backup_code":"Namesto tega uporabite rezervno potrditveno kodo"}},"invites":{"accept_title":"Povabilo","emoji":"emoji za pismo","welcome_to":"Dobrodošli na %{site_name}!","invited_by":"Povabljeni ste od:","social_login_available":"Omogočena vam bo tudi prijava preko družabnih omrežij s tem e-naslovom.","your_email":"E-naslov vašega računa je \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Sprejmi povabilo","success":"Vaš račun je ustvarjen in vi ste prijavljeni.","name_label":"Ime","password_label":"Geslo","optional_description":"(neobvezno)"},"password_reset":{"continue":"Nadaljujte na %{site_name}"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Samo kategorije","categories_with_featured_topics":"Kategorije z izpostavljenimi temami","categories_and_latest_topics":"Kategorije in najnovejše teme","categories_and_top_topics":"Kategorije in najboljše teme","categories_boxes":"Škatle s podkategorijami","categories_boxes_with_topics":"Škatle z izpostavljenimi temami"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"Nalagam..."},"select_kit":{"default_header_text":"Izberi...","no_content":"Ni zadetkov","filter_placeholder":"Išči...","filter_placeholder_with_any":"Išči ali ustvari novo...","create":"Ustvari: '%{content}'","max_content_reached":{"one":"Izberete lahko samo %{count} stvar.","two":"Izberete lahko samo %{count} stvari.","few":"Izberete lahko samo %{count} stvari.","other":"Izberete lahko samo %{count} stvari."},"min_content_not_reached":{"one":"Izberite vsaj %{count} stvar.","two":"Izberite vsaj %{count} stvari.","few":"Izberite vsaj %{count} stvari.","other":"Izberite vsaj %{count} stvari."}},"date_time_picker":{"from":"Od","to":"Do"},"emoji_picker":{"filter_placeholder":"Išči emoji","smileys_\u0026_emotion":"Smeški in emotikoni","people_\u0026_body":"Ljudje in telo","animals_\u0026_nature":"Živali in narava","food_\u0026_drink":"Hrana in pijača","travel_\u0026_places":"Potovanja in lokacije","activities":"Dejavnosti","objects":"Stvari","symbols":"Simboli","flags":"Zastave","recent":"Nedavno uporabljeni","default_tone":"Brez barve kože","light_tone":"Svetla barva kože","medium_light_tone":"Srednje svetla barva kože","medium_tone":"Srednja barva kože","medium_dark_tone":"Srednje temna barva kože","dark_tone":"Temna barva kože","default":"Emojiji po meri"},"shared_drafts":{"title":"Skupni osnutki","notice":"Ta tema je vidna samo tistim, ki lahko vidijo kategorijo \u003cb\u003e%{category}\u003c/b\u003e.","destination_category":"Ciljna kategorija","publish":"Objavi skupni osnutek","confirm_publish":"Ali ste prepričani da hočete objaviti ta osnutek?","publishing":"Objavljamo temo..."},"composer":{"emoji":"Emoji :)","more_emoji":"več...","options":"Možnosti","whisper":"šepet","unlist":"izločeno","add_warning":"To je uradno opozorilo.","toggle_whisper":"Preklopi šepet","toggle_unlisted":"Preklopi izločeno","posting_not_on_topic":"Na katero temo bi radi odgovorili?","saved_local_draft_tip":"shranjeno lokalno","similar_topics":"Vaša tema je podobna kot...","drafts_offline":"osnutki brez povezave","edit_conflict":"uredi spor","group_mentioned":{"one":"Z omembo %{group} boste obvestili \u003ca href='%{group_link}'\u003e%{count} osebo\u003c/a\u003e – ali ste prepričani?","two":"Z omembo %{group}boste obvestili \u003ca href='%{group_link}'\u003e%{count} osebi\u003c/a\u003e – ali ste prepričani?","few":"Z omembo %{group} boste obvestili \u003ca href='%{group_link}'\u003e%{count} osebe\u003c/a\u003e – ali ste prepričani?","other":"Z omembo %{group} boste obvestili \u003ca href='%{group_link}'\u003e%{count} oseb\u003c/a\u003e – ali ste prepričani?"},"cannot_see_mention":{"category":"Omenil si uporabnika %{username}, a ta ne bo obveščen saj nima dostopa do te kategorije. Dodati ga je potrebno v skupino ki lahko dostopa do kategorije.","private":"Omenili ste uporabnika %{username}, a ta ne bo obveščen, ker ne more videti tega zasebnega sporočila. Morali ga boste povabiti v to zasebno sporočilo."},"duplicate_link":"Povezava do \u003cb\u003e%{domain}\u003c/b\u003e bila že objavljena v temi od \u003cb\u003e@%{username}\u003c/b\u003e v \u003ca href='%{post_url}'\u003eodgovoru %{ago}\u003c/a\u003e – ali ste prepričani, da jo želite objaviti še enkrat?","reference_topic_title":"RE: %{title}","error":{"title_missing":"Naslov je obvezen","title_too_short":"Naslov mora vsebovati vsaj %{min} znakov","title_too_long":"Naslov ne more imeti več kot %{max} znakov","post_missing":"Prispevek ne more biti prazen","post_length":"Prispevek mora vsebovati vsaj %{min} znakov","try_like":"Ste že uporabili %{heart} gumb za všečkanje?","category_missing":"Izbrati morate kategorijo","tags_missing":{"one":"Izbrati morate vsaj %{count} oznako","two":"Izbrati morate vsaj %{count} oznaki","few":"Izbrati morate vsaj %{count} oznake","other":"Izbrati morate vsaj %{count} oznak"},"topic_template_not_modified":"Dodajte podrobnosti in značilnosti v vašo temo tako da uredite predlogo teme."},"save_edit":"Shrani spremembe","overwrite_edit":"Prepiši spremembo","reply_original":"Odgovori v izvorni temi","reply_here":"Odgovori tu","reply":"Odgovori","cancel":"Prekliči","create_topic":"Objavi temo","create_pm":"Pošlji","create_whisper":"Šepet","create_shared_draft":"Ustvari skupni osnutek","edit_shared_draft":"Uredi skupni osnutek","title":"Ali pritisnite Ctrl+Enter","users_placeholder":"Dodaj uporabnika","title_placeholder":"Kaj je tema prispevka v kratkem stavku?","title_or_link_placeholder":"vpiši naslov ali prilepi povezavo","edit_reason_placeholder":"zakaj spreminjate prispevek?","topic_featured_link_placeholder":"Vnesite povezavo prikazano z naslovom.","remove_featured_link":"Odstrani povezavo iz teme.","reply_placeholder":"Tu lahko pišeš. Možna je uporaba Markdown, BBcode ali HTML za oblikovanje. Sem lahko povlečeš ali prilepiš sliko.","reply_placeholder_no_images":"Tipkajte tukaj. Uporabite Markdown, BBCode ali HTML za oblikovanje.","reply_placeholder_choose_category":"Izberite kategorijo preden vnašate besedilo tukaj.","view_new_post":"Oglejte si svojo novo objavo.","saving":"Shranjujem","saved":"Shranjeno!","saved_draft":"Osnutek objave je v teku. Tapnite za nadaljevanje.","uploading":"Nalagam...","show_preview":"prikaži predogled \u0026raquo;","hide_preview":"\u0026laquo; skrij predogled","quote_post_title":"Citiraj cel prispevek","bold_label":"B","bold_title":"Krepko","bold_text":"krepko","italic_label":"I","italic_title":"Ležeče","italic_text":"poudarjeno","link_title":"Povezava","link_description":"vnesite opis povezave tukaj","link_dialog_title":"Vstavi povezavo","link_optional_text":"neobvezen naslov","link_url_placeholder":"Za iskanje po temah prilepite ali vpišite URL","blockquote_text":"Citirano","code_title":"Predoblikovano besedilo","code_text":"zamakni predoblikovano besedilo s 4 presledki","paste_code_text":"vpiši ali prilepi kodo","upload_title":"Naloži","upload_description":"vnesite opis prenosa tukaj","olist_title":"Oštevilčen seznam","ulist_title":"Seznam","list_item":"Element seznama","toggle_direction":"Preklopi smer","help":"pomoč pri Markdown urejanju","collapse":"minimiziraj urejevalnik","open":"odpri urejevalnik","abandon":"zapri urejevalnik in zavrzi osnutek","enter_fullscreen":"vklopi celozaslonski urejevalnik","exit_fullscreen":"izklopi celozaslonski urejevalnik","show_toolbar":"prikaži orodno vrstico urejevalnika","hide_toolbar":"skrij orodno vrstico urejevalnika","modal_ok":"V redu","modal_cancel":"Prekliči","cant_send_pm":"Ne moremo poslati sporočila %{username}.","yourself_confirm":{"title":"Ali ste pozabili dodati prejemnike?","body":"Trenutno bo to sporočilo poslano samo vam!"},"admin_options_title":"Neobvezne nastavitve osebja za to temo","composer_actions":{"reply":"Odgovori","draft":"Osnutek","edit":"Uredi","reply_to_post":{"label":"Odgovori na objavo osebe %{postUsername}","desc":"Odgovori na posamezen prispevek"},"reply_as_new_topic":{"label":"Odgovori v novi povezani temi","desc":"Ustvari novo temo povezano na to temo","confirm":"Shranjen je nov osnutek teme, ki bo prepisan, če ustvarite povezano temo."},"reply_as_private_message":{"label":"Novo ZS","desc":"Odgovori v zasebno sporočilo"},"reply_to_topic":{"label":"Odgovori v temi","desc":"Odgovori v temi, ne na posamezen prispevek"},"toggle_whisper":{"label":"Preklopi šepet","desc":"Šepeti so vidni samo članom osebja"},"create_topic":{"label":"Nova tema"},"shared_draft":{"label":"Skupen osnutek"},"toggle_topic_bump":{"label":"Preklopi izpostavljanje teme","desc":"Odgovori brez da spremeniš čas zadnjega odgovora"}},"details_title":"Povzetek","details_text":"To besedilo bo skrito, dokler ga bralec ne razširi","location":{"btn":"Dodaj lokacijo","title":"Dodaj lokacijo"}},"notifications":{"tooltip":{"regular":{"one":"%{count} neprebrano obvestilo","two":"%{count} neprebrani obvestili","few":"%{count} neprebrana obvestila","other":"%{count} neprebranih obvestil"},"message":{"one":"%{count} neprebrano sporočilo","two":"%{count} neprebrani sporočili","few":"%{count} neprebrana sporočila","other":"%{count} neprebranih sporočil"}},"title":"obvestila ko omeni vaše @ime, odgovorih na vaše prispevke in teme, zasebna sporočila","none":"Ta trenutek ne moremo naložiti obvestil.","empty":"Ni obvestil.","post_approved":"Vaš prispevek je bil odobren","reviewable_items":"čakajo na pregled","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_consolidated_description":{"one":"je všečkal %{count} vaš prispevek","two":"je všečkal %{count} vaša prispevka","few":"je všečkal %{count} vaše prispevke","other":"je všečkal %{count} vaših prispevkov"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e je sprejel tvoje povabilo.","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e premaknil %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Prislužili '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNova tema\u003c/span\u003e %{description}","membership_request_accepted":"Sprejeti v članstvo v '%{group_name}'","group_message_summary":{"one":"%{count} sporočilo v%{group_name} predalu","two":"%{count} sporočili v %{group_name} predalu","few":"%{count} sporočila v %{group_name} predalu","other":"%{count} sporočil v %{group_name} predalu"},"popup":{"mentioned":"%{username} vas je omenil v\"%{topic}\" - %{site_title}","group_mentioned":"%{username} vas je omenil v \"%{topic}\" - %{site_title}","quoted":"%{username} vas je citiral v \"%{topic}\" - %{site_title}","replied":"%{username} vam je odgovoril v \"%{topic}\" - %{site_title}","posted":"%{username} objavil v \"%{topic}\" - %{site_title}","private_message":"%{username} vam je poslal zasebno sporočilo \"%{topic}\" - %{site_title}","linked":"%{username} je dodal povezavo na vaš prispevek iz \"%{topic}\" - %{site_title}","watching_first_post":"%{username} je ustvaril novo temo \"%{topic}\" - %{site_title}","confirm_title":"Obvestila omogočena - %{site_title}","confirm_body":"Uspelo! Obvestila so bila omogočena.","custom":"Obvestilo od %{username} na %{site_title}"},"titles":{"mentioned":"omenjen","replied":"nov odgovor","quoted":"citiran","edited":"urejen","liked":"nov všeček","private_message":"novo zasebno sporočilo","invited_to_private_message":"povabljen v zasebno sporočilo","invitee_accepted":"povabilo sprejeto","posted":"nov prispevek","moved_post":"prispevek premaknjen","linked":"povezan","granted_badge":"značka podeljena","invited_to_topic":"povabljen v temo","group_mentioned":"omemba skupine","group_message_summary":"nova sporočila skupine","watching_first_post":"nova tema","topic_reminder":"opomnik teme","liked_consolidated":"novi všečki","post_approved":"prispevek odobren"}},"upload_selector":{"title":"Dodaj sliko","title_with_attachments":"Dodaj sliko ali datoteko","from_my_computer":"Iz moje naprave","from_the_web":"Iz spletne strani","remote_tip":"povezava do slike","remote_tip_with_attachments":"povezava do slike ali datoteke %{authorized_extensions}","local_tip":"izberite slike iz vaše naprave","local_tip_with_attachments":"izberite slike na svoji napravi %{authorized_extensions}","hint":"(slike lahko naložite tudi tako, da jih povlečete in spustite v urejevalnik)","hint_for_supported_browsers":"slike lahko naložite tudi tako, da jih povlečete in spustite v urejevalnik","uploading":"Nalagam","select_file":"Izberite datoteko","default_image_alt_text":"slika"},"search":{"sort_by":"Uredi po","relevance":"Pomembnosti","latest_post":"Najnovejšem prispevku","latest_topic":"Najnovejši temi","most_viewed":"Številu ogledov","most_liked":"Največ všečkov za","select_all":"Izberi vse","clear_all":"Počisti vse","too_short":"Niz za iskanje je prekratek","result_count":{"one":"\u003cspan\u003e%{count} zadetek za\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","two":"\u003cspan\u003e%{count}%{plus} zadetka za\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","few":"\u003cspan\u003e%{count}%{plus} zadetki za\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} zadetkov za\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"išči po temah, prispevkih, uporabnikih ali kategorijah","full_page_title":"išči teme ali prispevke","no_results":"Iskanje nima zadetkov.","no_more_results":"Ni več zadetkov iskanja.","post_format":"#%{post_number} od %{username}","results_page":"Zadetki iskanja za '%{term}'","more_results":"Obstaja več zadetkov. Zožite kriterije iskanja.","cant_find":"Ne najdete tega kar iščete?","start_new_topic":"Bi mogoče ustvarili novo temo?","or_search_google":"Ali poskusite iskati z Googlom:","search_google":"Poskusite iskati z Googlom:","search_google_button":"Google","context":{"user":"Išči prispevke od @%{username}","category":"Išči po #%{category} kategoriji","topic":"Išči po tej temi","private_messages":"Išči po zasebnih sporočilih"},"advanced":{"title":"Napredno iskanje","posted_by":{"label":"Avtor"},"in_category":{"label":"Kategorizirano"},"in_group":{"label":"V skupini"},"with_badge":{"label":"Z značko"},"with_tags":{"label":"Označeno"},"filters":{"label":"Vrni samo teme/prispevke...","title":"kjer se ujema naslov","likes":"ki sem jih všečkal","posted":"v katerih sem objavljal","watching":"ki jih opazujem","tracking":"ki jim sledim","private":"v mojih zasebnih sporočilih","bookmarks":"kjer sem ustvaril zaznamek","first":"ob prvem prispevku","pinned":"so pripete","seen":"ki sem jih prebral","unseen":"ki jih nisem prebral","wiki":"so wiki","images":"vsebujejo sliko(-e)","all_tags":"Vse zgornje oznake"},"statuses":{"label":"Kjer so teme","open":"odprte","closed":"zaprte","public":"so javni","archived":"arhivirane","noreplies":"brez odgovora","single_user":"od samo enega uporabnika"},"post":{"count":{"label":"Prispevki"},"min":{"placeholder":"najmanj"},"max":{"placeholder":"največ"},"time":{"label":"Objavljeno","before":"pred","after":"po"}},"views":{"label":"Ogledov"},"min_views":{"placeholder":"najmanj"},"max_views":{"placeholder":"največ"}}},"hamburger_menu":"pojdi na drug seznam tem ali kategorijo","new_item":"nov","go_back":"pojdi nazaj","not_logged_in_user":"stran uporabnika s povzetkom trenutnih aktivnosti in nastavitev","current_user":"pojdi na svojo uporabniško stran","view_all":"prikaži vse","topics":{"new_messages_marker":"zadnji obisk","bulk":{"select_all":"Izberi vse","clear_all":"Počisti vse","unlist_topics":"Izloči temo iz seznamov","relist_topics":"Postavi temo nazaj na seznam","reset_read":"Ponastavi prebrano","delete":"Izbriši teme","dismiss":"Opusti","dismiss_read":"Opusti vse neprebrane","dismiss_button":"Opusti","dismiss_tooltip":"Opusti samo nove teme ali prenehaj slediti temam","also_dismiss_topics":"Prenehaj slediti tem temam tako da se ne prikažejo več kot neprebrane","dismiss_new":"Opusti nove","toggle":"preklopi množično izbiro tem","actions":"Množična dejanja","change_category":"Določi kategorijo","close_topics":"Zapri teme","archive_topics":"Arhiviraj teme","notification_level":"Obvestila","choose_new_category":"Izberi novo kategorijo za temo:","selected":{"one":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e temo.","two":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e temi.","few":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e teme.","other":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e tem."},"change_tags":"Zamenjaj oznake","append_tags":"Dodaj oznake","choose_new_tags":"Izberite nove oznake za te teme:","choose_append_tags":"Izberite nove oznake da se dodajo na te teme:","changed_tags":"Oznake na teh temah so bile spremenjene.","remove_tags":"Odstrani oznake","progress":{"one":"Napredek: \u003cstrong\u003e%{count}\u003c/strong\u003e tema","two":"Napredek: \u003cstrong\u003e%{count}\u003c/strong\u003e temi","few":"Napredek: \u003cstrong\u003e%{count}\u003c/strong\u003e teme","other":"Napredek: \u003cstrong\u003e%{count}\u003c/strong\u003e tem"}},"none":{"unread":"Nimate neprebranih tem.","new":"Nimate novih tem.","read":"Niste prebrali še nobene teme.","posted":"Niste objavili še v nobeni temi.","ready_to_create":"Pripravljen ","latest":"Vse ste že prebrali!","bookmarks":"Nimate tem z zaznamki.","category":"Ni tem v kategoriji %{category} .","top":"Ni najboljših tem.","educate":{"unread":"\u003cp\u003eTu se prikažejo vaše neprebrane teme.\u003c/p\u003e\u003cp\u003ePrivzeto se teme prikažejo kot neprebrane s prikazom števila \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e če ste:\u003c/p\u003e\u003cul\u003e\u003cli\u003eUstvarili temo\u003c/li\u003e\u003cli\u003eOdgovorili na temo\u003c/li\u003e\u003cli\u003eBrali temo več kot 4 minute\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eIzrecno nastavili temo kot \"Opazujem\" ali \"Sledim\" preko nastavitev obveščanja na dnu teme.\u003c/p\u003e\u003cp\u003ePojdite na \u003ca href=\"%{userPrefsUrl}\"\u003enastavitve\u003c/a\u003e če želite spremembo.\u003c/p\u003e"}},"bottom":{"latest":"Ni več najnovejših tem.","posted":"Ni več objavljenih tem.","read":"Ni več prebranih tem.","new":"Ni več novih tem.","unread":"Ni več neprebranih tem.","category":"Ni več tem v kategoriji %{category}.","tag":"Ni več tem z oznako %{tag}.","top":"Ni več najboljših tem.","bookmarks":"Ni več tem z zaznamki."}},"topic":{"filter_to":{"one":"%{count} prispevek v temi","two":"%{count} prispevka v temi","few":"%{count} prispevki v temi","other":"%{count} prispevkov v temi"},"create":"Nova tema","create_long":"Ustvari novo temo","open_draft":"Odpri osnutek","private_message":"Novo zasebno sporočilo","archive_message":{"help":"Prestavi sporočilo v Arhiv","title":"Arhiviraj"},"move_to_inbox":{"title":"Prestavi v Prejeto","help":"Prestavi sporočilo nazaj v Prejeto"},"edit_message":{"help":"Uredi prvi prispevek sporočila","title":"Uredi"},"defer":{"help":"Označi kot neprebrano","title":"Preloži"},"feature_on_profile":{"help":"Na svojo uporabniško kartico in profil dodajte povezavo do te teme","title":"Izpostavi na profilu"},"remove_from_profile":{"warning":"Vaš profil že ima izpostavljeno temo. Če nadaljujete, bo ta tema nadomestila obstoječo temo.","help":"Odstrani povezavo do te teme z mojega uporabniškega profila","title":"Odstrani s profila"},"list":"Teme","new":"nova tema","unread":"neprebrana","new_topics":{"one":"%{count} nova tema","two":"%{count} novi temi","few":"%{count} nove teme","other":"%{count} novih tem"},"unread_topics":{"one":"%{count} neprebrana tema","two":"%{count} neprebrani temi","few":"%{count} neprebrane teme","other":"%{count} neprebranih tem"},"title":"Tema","invalid_access":{"title":"Tema je zasebna","description":"Oprostite, do te teme nimate dostopa!","login_required":"Morate biti prijavljeni da lahko dostopate do te teme."},"server_error":{"title":"Tema se ni uspela naložiti.","description":"Oprostite, ni nam uspelo naložiti te teme, verjetno zaradi napake na omrežju. Poskusite ponovno. Če se napaka ponavlja, nam sporočite."},"not_found":{"title":"Ne najdemo temo.","description":"Oprostite, ne najdemo te teme. Mogoče jo je odstranil moderator?"},"total_unread_posts":{"one":"imate %{count} neprebran prispevek v tej temi","two":"imate %{count} neprebrana prispevka v tej temi","few":"imate %{count} neprebrane prispevke v tej temi","other":"imate %{count} neprebranih prispevkov v tej temi"},"unread_posts":{"one":"imate %{count} neprebran star prispevek v tej temi","two":"imate %{count} neprebrana stara prispevka v tej temi","few":"imate %{count} neprebrane stare prispevke v tej temi","other":"imate %{count} neprebranih starih prispevkov v tej temi"},"new_posts":{"one":"%{count} nov prispevek v tej temi od kar ste jo zadnjič brali","two":"%{count} nova prispevka v tej temi od kar ste jo zadnjič brali","few":"%{count} novi prispevki v tej temi od kar ste jo zadnjič brali","other":"%{count} novih prispevkov v tej temi od kar ste jo zadnjič brali"},"likes":{"one":"%{count} všeček na tej temi","two":"%{count} všečka na tej temi","few":"%{count} všečki na tej temi","other":"%{count} všečkov na tej temi"},"back_to_list":"Nazaj na seznam tem","options":"Možnosti teme","show_links":"pokaži povezave v tej temi","toggle_information":"preklopi podrobnosti teme","read_more_in_category":"Brskaj po ostalih temah v %{catLink} ali %{latestLink}.","read_more":"Brskaj po ostalih temah %{catLink} ali %{latestLink}.","unread_indicator":"Noben član ni še prebral zadnjega prispevka v tej temi.","browse_all_categories":"Brskajte po vseh kategorijah","browse_all_tags":"Brskanje po vseh oznakah","view_latest_topics":"poglej najnovejše teme","suggest_create_topic":"začni nov pogovor?","jump_reply_up":"pojdi na prejšni odgovor","jump_reply_down":"pojdi na naslednji odgovor","deleted":"Tema je bila izbrisana","slow_mode_update":{"title":"Počasni način","select":"Uporabniki lahko v tej temi objavijo samo enkrat na:","description":"Za spodbujanje premišljene razprave v hitrih in burnih razpravah morajo uporabniki počakati, preden lahko ponovno objavijo v tej temi.","save":"Omogoči","remove":"Onemogoči","hours":"Ure:","minutes":"Minute:","seconds":"Sekunde:","durations":{"15_minutes":"15 minut","1_hour":"1 ura","4_hours":"4 ure","1_day":"1 dan","1_week":"1 teden","custom":"Trajanje po meri"}},"slow_mode_notice":{"duration":"Med objavami v tej temi morate počakati %{duration}"},"topic_status_update":{"title":"Opomnik teme","save":"Nastavi opomnik","num_of_hours":"Število ur:","num_of_days":"Število dni:","remove":"Odstrani opomnik","publish_to":"Objavi v:","when":"Kdaj:","time_frame_required":"Izberite časovni okvir"},"auto_update_input":{"none":"Izberi časovni okvir","now":"Zdaj","later_today":"Kasneje v dnevu","tomorrow":"Jutri","later_this_week":"Kasneje v tednu","this_weekend":"Ta vikend","next_week":"Naslednji teden","two_weeks":"Dva tedna","next_month":"Naslednji mesec","two_months":"Dveh mesecih","three_months":"Tri mesece","four_months":"Štirih mesecih","six_months":"Šest mesecev","one_year":"Eno leto","forever":"Za vedno","pick_date_and_time":"Izberi datum in čas","set_based_on_last_post":"Kloniraj na podlagi zadnjega prispevka"},"publish_to_category":{"title":"Objavi kasneje"},"temp_open":{"title":"Začasno odpri"},"auto_reopen":{"title":"Samodejno odpri temo"},"temp_close":{"title":"Začasno zapri"},"auto_close":{"title":"Samodejno zapri temo","label":"Samodejno zapri temo ob:","error":"Vnesite veljavno vsebino","based_on_last_post":"Ne zapri dokler zadnji prispevek v temi ni vsaj star."},"auto_delete":{"title":"Samodejno izbriši temo"},"auto_bump":{"title":"Samodejno izpostavi temo"},"reminder":{"title":"Opomni me"},"auto_delete_replies":{"title":"Samodejno izbriši odgovore"},"status_update_notice":{"auto_open":"Ta tema se bo samodejno odprla %{timeLeft}.","auto_close":"Ta tema se bo samodejno zaprla %{timeLeft}.","auto_publish_to_category":"Ta tema bo objavljena v \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_based_on_last_post":"Ta tema se bo zaklenila %{duration} po zadnjem odgovoru.","auto_delete":"Ta tema se bo sama izbrisala čez %{timeLeft}.","auto_bump":"Ta tema se bo sama izpostavila %{timeLeft}.","auto_reminder":"Opomnili vas bomo o tej temi %{timeLeft}.","auto_delete_replies":"Odgovori na to temo se samodejno izbrišejo po %{duration}."},"auto_close_title":"Samodejno zapri nastavitve","auto_close_immediate":{"one":"Zadnji prispevek v tej temi je star že %{count} uro, zato da bo tema zaprta nemudoma.","two":"Zadnji prispevek v tej temi je star že %{count} uri, zato da bo tema zaprta nemudoma.","few":"Zadnji prispevek v tej temi je star že %{count} ure, zato da bo tema zaprta nemudoma.","other":"Zadnji prispevek v tej temi je star že %{count} ur, zato da bo tema zaprta nemudoma."},"timeline":{"back":"Nazaj","back_description":"Pojdi nazaj na zadnji neprebrani prispevek","replies_short":"%{current} / %{total}"},"progress":{"title":"napredek teme","go_top":"na vrh","go_bottom":"dno","go":"pojdi","jump_bottom":"skoči na zadnji prispevek","jump_prompt":"skoči na...","jump_prompt_of":"od %{count} prispevkov","jump_prompt_long":"Skoči na...","jump_bottom_with_number":"skoči na prispevek %{post_number}","jump_prompt_to_date":"na datum","jump_prompt_or":"ali","total":"število prispevkov","current":"trenutni prispevek"},"notifications":{"title":"spremenite kako pogosto želite biti obveščeni o tej temi","reasons":{"mailing_list_mode":"Omogočeno imate e-sporočilo za vsak prispevek, zato boste o tej temi obveščeni preko e-pošte.","3_10":"Prejemali boste obvestila, ker opazujete oznako na tej temi.","3_6":"Prejemali boste obvestila, ker opazujete to kategorijo.","3_5":"Prejemali boste obvestila, ker ste začeli opazovati to temo samodejno.","3_2":"Prejemali boste obvestila, ker opazujete to kategorijo.","3_1":"Prejemali boste obvestila, ker ste ustvarili to temo.","3":"Prejemali boste obvestila, ker opazujete to temo.","2_8":"Videli boste število novih odgovorov, ker sledite tej kategoriji.","2_4":"Videli boste število novih odgovorov, ker ste objavili odgovor na to temo.","2_2":"Videli boste število novih odgovorov, ker sledite tej temi.","2":"Videli boste število novih odgovorov, ker ste \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eprebrali to temo\u003c/a\u003e.","1_2":"Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori.","1":"Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori.","0_7":"Ignorirate vsa obvestila za to kategorijo.","0_2":"Ne boste prejemali obvestil o tej temi.","0":"Ne boste prejemali obvestil o tej temi."},"watching_pm":{"title":"Opazujem","description":"Obveščeni boste o vsakem novem odgovoru v tem sporočilu. Ob temi bo prikazano število novih odgovorov."},"watching":{"title":"Opazujem","description":"Obveščeni boste o vsakem novem odgovoru v tej temi. Ob temi bo prikazano število novih odgovorov."},"tracking_pm":{"title":"Sledim","description":"Število novih odgovorov bo prikazano za to sporočilo. Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori."},"tracking":{"title":"Sledim","description":"Število novih odgovorov bo prikazano za to temo. Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori."},"regular":{"title":"Običajno","description":"Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori."},"regular_pm":{"title":"Običajno","description":"Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori."},"muted_pm":{"title":"Utišano","description":"Nikoli ne boste obveščeni o tem sporočilu."},"muted":{"title":"Utišano","description":"Nikoli ne boste obveščeni o tej temi. Ta tema se ne bo pojavila med najnovejšimi."}},"actions":{"title":"Akcije","recover":"Prekliči izbris teme","delete":"Izbriši temo","open":"Odpri temo","close":"Zapri temo","multi_select":"Izberite prispevke...","slow_mode":"Nastavi počasni način","timed_update":"Nastavi opomnik teme...","pin":"Pripni temo","unpin":"Odpni temo","unarchive":"Odarhiviraj temo","archive":"Arhiviraj temo","invisible":"Izloči iz seznamov","visible":"Naredi uvrščeno","reset_read":"Ponastavi podatke o branosti","make_public":"Spremeni v javno temo","make_private":"Spremeni v ZS","reset_bump_date":"Ponastavi izpostavljanje"},"feature":{"pin":"Pripni temo","unpin":"Odpni temo","pin_globally":"Pripni temo globalno","make_banner":"Tema na oglasnem traku","remove_banner":"Odstrani temo iz oglasnega traku"},"reply":{"title":"Odgovori","help":"sestavi odgovor na to temo"},"clear_pin":{"title":"Odpni temo","help":"Odstrani pripeto s te teme, tako da se ne pojavlja več na vrhu seznama tem"},"share":{"title":"Deli","extended_title":"Deli povezavo","help":"deli povezavo do te teme"},"print":{"title":"Natisni","help":"Odpri tiskalniku prilagojeno verzijo te teme"},"flag_topic":{"title":"Prijavi","help":"prijavi to temo moderatorjem ali pošlji opozorilo avtorju","success_message":"Uspešno ste prijavili to temo."},"make_public":{"title":"Pretvori v javno temo","choose_category":"Izberite kategorijo za to javno temo:"},"feature_topic":{"title":"Izpostavi to temo","pin":"Naj se ta tema prikaže na vrhu kategorije %{categoryLink} do","unpin":"Odpnite to temo iz vrha kategorije %{categoryLink}.","unpin_until":"Odstrani to temo iz vrha kategorije %{categoryLink} ali počakaj do \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Uporabniki lahko samostojno odpnejo temo.","pin_validation":"Datum je zahtevan, če želite pripeti to temo.","not_pinned":"Ni pripetih tem v %{categoryLink}.","already_pinned":{"one":"Trenutno pripeta tema v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"Trenutno pripeti temi v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"Trenutno pripete teme v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Trenutno pripetih tem v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Ta tema naj se pojavi na vrhu vseh seznamov tem do","confirm_pin_globally":{"one":"Trenutno imate %{count} globalno pripeto temo. Preveč pripetih tem je lahko breme za nove in anonimne uporabnike. Ali ste prepričani, da želite pripeti še eno globalno temo?","two":"Trenutno imate %{count} globalno pripeti temi. Preveč pripetih tem je lahko breme za nove in anonimne uporabnike. Ali ste prepričani, da želite pripeti še eno globalno temo?","few":"Trenutno imate %{count} globalno pripete teme. Preveč pripetih tem je lahko breme za nove in anonimne uporabnike. Ali ste prepričani, da želite pripeti še eno globalno temo?","other":"Trenutno imate %{count} globalno pripetih tem. Preveč pripetih tem je lahko breme za nove in anonimne uporabnike. Ali ste prepričani, da želite pripeti še eno globalno temo?"},"unpin_globally":"Odstrani to temo z vrha vseh seznamov tem.","unpin_globally_until":"Odstrani to temo z vrha seznama vseh tem ali počakaj do \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Uporabniki lahko samostojno odpnejo temo.","not_pinned_globally":"Ni globalno pripetih tem.","already_pinned_globally":{"one":"Trenutno globalno pripeta tema: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"Trenutno globalno pripeti temi: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"Trenutno globalno pripete teme: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Trenutno globalno pripetih tem: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Naredi to temo v oglasni trak, ki se bo prikazoval na vrhu vseh strani.","remove_banner":"Odstrani oglasni trak, ki se pojavlja na vrhu vseh strani.","banner_note":"Uporabniki lahko opustijo oglasni trak tako da ga zaprejo. Naenkrat je lahko samo ena tema v oglasnem traku.","no_banner_exists":"Ni nobene teme v oglasnem traku.","banner_exists":"Tema na oglasnem traku \u003cstrong class='badge badge-notification unread'\u003eže obstaja\u003c/strong\u003e."},"inviting":"Vabimo...","automatically_add_to_groups":"To povabilo bo prijatelja dodalo v naslednje skupine:","invite_private":{"title":"Povabi k sporočilu","email_or_username":"E-naslov ali uporabniško ime vabljenega","email_or_username_placeholder":"e-naslov ali uporabniško ime","action":"Povabi","success":"Povabili smo uporabnika/co, da sodeluje v tem pogovoru.","success_group":"Povabili smo skupino, da sodeluje v tem pogovoru.","error":"Prišlo je do napake ob vabilu uporabnika.","not_allowed":"Tega uporabnika žal ni mogoče povabiti.","group_name":"ime skupine"},"controls":"Akcije na temi...","invite_reply":{"title":"Povabi","username_placeholder":"uporabniško ime","action":"Pošlji povabilo","help":"povabi ostale v to temo preko e-sporočila ali obvestil","to_forum":"Poslali bomo kratko e-sporočilo s povezavo preko katere se bo vaš prijatelj lahko prijavil.","sso_enabled":"Vnesite uporabniško ime osebe, ki bi jo povabili v to temo.","to_topic_blank":"Vnesite uporabniško ime ali e-naslov osebe, ki bi ga radi povabili v to temo.","to_topic_email":"Vnesli ste e-naslov. Poslali bomo vabilo preko e-sporočila, ki bo vašemu prijatelju omogočila, da bo neposredno odgovoril v temo.","to_topic_username":"Vnesli ste uporabniško ime. Poslali mu bomo obvestilo s povezavo na to temo.","to_username":"Vnesite uporabniško ime osebe, ki bi jo povabili v to temo. Poslali mu bomo obvestilo s povezavo na to temo.","email_placeholder":"name@example.com","success_email":"Poslali smo povabilo na \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. Obvestili vas bomo, ko se bo uporabnik prvič prijavil. Na vaši uporabniški strani lahko v zavihku Povabila spremljate stanje vaših povabil.","success_username":"Povabili smo uporabnika, da sodeluje v tej temi.","error":"Nismo mogli povabiti to osebo. Mogoče je ta oseba že povabljena? (povabila so omejena)","success_existing_email":"Uporabnik z e-naslovom \u003cb\u003e%{emailOrUsername}\u003c/b\u003e že obstaja. Tega uporabnika smo povabili, da sodeluje v tej temi."},"login_reply":"Za odgovor je potrebna prijava","filters":{"n_posts":{"one":"%{count} prispevek","two":"%{count} prispevka","few":"%{count} prispevki","other":"%{count} prispevkov"},"cancel":"Odstrani filter"},"move_to":{"title":"Prestavi v","action":"prestavi v","error":"Med prestavljanjem prispevkov je prišlo do napake."},"split_topic":{"title":"Prestavi v novo temo","action":"prestavi v novo temo","topic_name":"Naslov nove teme","radio_label":"Nova tema","error":"Med prestavljanjem prispevkov v novo temo je prišlo do napake.","instructions":{"one":"Ustvarili boste novo temo in jo napolnili z izbranim prispevkom.","two":"Ustvarili boste novo temo in jo napolnili z \u003cb\u003e%{count}\u003c/b\u003e izbranima prispevkoma.","few":"Ustvarili boste novo temo in jo napolnili z \u003cb\u003e%{count}\u003c/b\u003e izbranimi prispevki.","other":"Ustvarili boste novo temo in jo napolnili z \u003cb\u003e%{count}\u003c/b\u003e izbranimi prispevki."}},"merge_topic":{"title":"Prestavi v obstoječo temo","action":"prestavi v obstoječo temo","error":"Med prestavljanjem prispevkov v to temo je prišlo do napake.","radio_label":"Obstoječa tema","instructions":{"one":"Izberite temo v katero bi prestavili prispevek.","two":"Izberite temo v katero bi prestavili \u003cb\u003e%{count}\u003c/b\u003e prispevka.","few":"Izberite temo v katero bi prestavili \u003cb\u003e%{count}\u003c/b\u003e prispevke.","other":"Izberite temo v katero bi prestavili \u003cb\u003e%{count}\u003c/b\u003e prispevkov."}},"move_to_new_message":{"title":"Prestavi v novo ZS","action":"prestavi v novo ZS","message_title":"Naslov novega sporočila","radio_label":"Novo zasebno sporočilo","participants":"Udeleženci","instructions":{"one":"Ustvarili boste novo sporočilo in ga napolnili z izbranim prispevkom.","two":"Ustvarili boste novo sporočilo in ga napolnili z \u003cb\u003e%{count}\u003c/b\u003e izbranima prispevkoma.","few":"Ustvarili boste novo sporočilo in ga napolnili z \u003cb\u003e%{count}\u003c/b\u003e izbranimi prispevki.","other":"Ustvarili boste novo sporočilo in ga napolnili z \u003cb\u003e%{count}\u003c/b\u003e izbranimi prispevki."}},"move_to_existing_message":{"title":"Prestavi v obstoječe zasebno sporočilo","action":"prestavi v obstoječe zasebno sporočilo","radio_label":"Obstoječe zasebno sporočilo","participants":"Udeleženci","instructions":{"one":"Izberite sporočilo v katero bi radi premaknili ta prispevek.","two":"Izberite sporočilo v katero bi radi premaknili ta \u003cb\u003e%{count}\u003c/b\u003e prispevka.","few":"Izberite sporočilo v katero bi radi premaknili te \u003cb\u003e%{count}\u003c/b\u003e prispevke.","other":"Izberite sporočilo v katero bi radi premaknili teh \u003cb\u003e%{count}\u003c/b\u003e prispevkov."}},"merge_posts":{"title":"Združi izbrane prispevke","action":"združi izbrane prispevke","error":"Med združevanjem izbranih prispevkov je prišlo do napake."},"publish_page":{"title":"Objavljanje strani","publish":"Objavi","description":"Ko je tema objavljena kot stran bo prikazana s prilagojenim slogom, njen URL pa lahko delite z drugimi.","public":"Javno","public_description":"Ljudje si lahko ogledajo stran, tudi če je povezana tema zasebna."},"change_owner":{"title":"Spremeni lastnika","action":"spremeni lastnika","error":"Med spreminjanjem lastništva prispevkov je prišlo do napake.","placeholder":"uporabniško ime novega lastnika","instructions":{"one":"Izberite novega lastnika za prispevek od \u003cb\u003e@%{old_user}\u003c/b\u003e","two":"Izberite novega lastnika za %{count} prispevka od \u003cb\u003e@%{old_user}\u003c/b\u003e","few":"Izberite novega lastnika za %{count} prispevke od \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Izberite novega lastnika za %{count} prispevkov od \u003cb\u003e@%{old_user}\u003c/b\u003e"}},"change_timestamp":{"title":"Spremeni čas objave...","action":"spremeni čas objave","invalid_timestamp":"Čas objave ne more biti v prihodnosti.","error":"Med spremembo časa objave je prišlo do napake.","instructions":"Izberite nov čas objave za temo. Prispevki v temi se bodo spremenili z enakim zamikom časa objave."},"multi_select":{"select":"izberi","selected":"izbrani (%{count})","select_post":{"label":"izberi","title":"Dodaj prispevek med izbrane"},"selected_post":{"label":"izbran","title":"Kliknite za odstranitev prispevka iz izbranih"},"select_replies":{"label":"izberi +odgovore","title":"Dodaj prispevek in vse njegove odgovore med izbrane"},"select_below":{"label":"izberi +nadaljnje","title":"Dodaj prispevek in vse nadaljnje med izbrane"},"delete":"izbriši izbrano","cancel":"prekliči izbiro","select_all":"izberi vse","deselect_all":"odznači vse","description":{"one":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e prispevek.","two":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e prispevka.","few":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e prispevke.","other":"Izbrali ste \u003cb\u003e%{count}\u003c/b\u003e prispevkov."}},"deleted_by_author":{"one":"(tema umaknjena s strani avtorja bo samodejno izbrisana v %{count} uri - razen če je prijavljena moderatorju)","two":"(tema umaknjena s strani avtorja bo samodejno izbrisana v %{count} urah - razen če je prijavljena moderatorju)","few":"(tema umaknjena s strani avtorja bo samodejno izbrisana v %{count} urah - razen če je prijavljena moderatorju)","other":"(tema umaknjena s strani avtorja bo samodejno izbrisana v %{count} urah - razen če je prijavljena moderatorju)"}},"post":{"quote_reply":"Citiraj","edit_reason":"Razlog: ","post_number":"prispevek %{number}","ignored":"Prezrta vsebina","wiki_last_edited_on":"wiki zadnjič spremenjen","last_edited_on":"prispevek zadnjič spremenjen","reply_as_new_topic":"Odgovori v novi povezani temi","reply_as_new_private_message":"Odgovori kot zasebno sporočilo z enakimi naslovniki","continue_discussion":"Nadaljevanje pogovora iz %{postLink}:","follow_quote":"pojdi na citiran prispevek","show_full":"Prikaži cel prispevek","show_hidden":"Prikaži prezrto vsebino.","deleted_by_author":{"one":"(prispevek umaknjen s strani avtorja se bo samodejno izbrisal po %{count} uri, če ni prijavljen moderatorju)","two":"(prispevek umaknjen s strani avtorja se bo samodejno izbrisal po %{count} urah, če ni prijavljen moderatorju)","few":"(prispevek umaknjen s strani avtorja se bo samodejno izbrisal po %{count} urah, če ni prijavljen moderatorju)","other":"(prispevek umaknjen s strani avtorja se bo samodejno izbrisal po %{count} urah - razen če je prijavljen moderatorju)"},"collapse":"skrči","expand_collapse":"razširi/skrči","locked":"član osebja je zaklenil ta prispevek za urejanje","gap":{"one":"poglej %{count} skriti odgovor","two":"poglej %{count} skrita odgovora","few":"poglej %{count} skrite odgovore","other":"poglej %{count} skritih odgovorov"},"notice":{"new_user":"Uporabnik %{user} je prvič objavil prispevek — poskrbimo da bo lepo sprejet v naši skupnosti!","returning_user":"Uporabnik %{user} že nekaj časa ni sodeloval na forumu — njihov zadnji prispevek je bil objavljen %{time}."},"unread":"Prispevek je neprebran","has_replies":{"one":"%{count} odgovor","two":"%{count} odgovora","few":"%{count} odgovore","other":"%{count} odgovorov"},"has_replies_count":"%{count}","has_likes_title":{"one":"%{count} uporabniku je prispevek všeč","two":"%{count} uporabnikoma je prispevek všeč","few":"%{count} uporabnikom je prispevek všeč","other":"%{count} uporabnikom je prispevek všeč"},"has_likes_title_only_you":"všečkali ste prispevek","has_likes_title_you":{"one":"vam in %{count} drugemu uporabniku je prispevek všeč","two":"vam in %{count} drugima uporabnikoma je prispevek všeč","few":"vam in %{count} drugim uporabnikom je prispevek všeč","other":"vam in %{count} drugim uporabnikom je prispevek všeč"},"filtered_replies_hint":{"one":"Oglejte si to objavo in njen odgovor","two":"Oglejte si to objavo in njena %{count} odgovora","few":"Oglejte si to objavo in njene %{count} odgovore","other":"Oglejte si to objavo in njenih %{count} odgovorov"},"errors":{"create":"Oprostite, pri ustvarjanju vašega prispevka je prišlo do napake. Poskusite ponovno.","edit":"Oprostite, pri ustvarjanju vašega prispevka je prišlo do napake. Poskusite ponovno.","upload":"Oprostite, pri prenosu datoteke je prišlo do napake. Poskusite ponovno.","file_too_large":"Datoteka je prevelika (največja velikost je %{max_size_kb}kb). Naložite vašo veliko datoteko na ponudnika v oblaku in objavite povezavo?","too_many_uploads":"Oprostite, naenkrat lahko naložite samo eno datoteko.","upload_not_authorized":"Oprostite, datoteka ki ste jo hoteli naložiti ni podprta (podprte pripone:%{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Oprostite, novi uporabniki ne morejo nalagati datotek.","attachment_upload_not_allowed_for_new_user":"Oprostite, novi uporabniki ne morejo nalagati priponk.","attachment_download_requires_login":"Oprostite, morate biti prijavljeni da lahko prenesete priponke."},"abandon_edit":{"no_value":"Ne, obdrži","no_save_draft":"Ne, shranite osnutek"},"abandon":{"confirm":"Ali ste prepričani, da hočete zavreči vaš prispevek?","no_value":"Ne, ohrani","no_save_draft":"Ne, shranite osnutek","yes_value":"Da, opusti"},"via_email":"ta prispevek je prispel preko e-sporočila","via_auto_generated_email":"ta prispevek je prispel preko samodejno ustvarjenega e-sporočila","whisper":"ta prispevek je zasebno šepetanje med moderatorji","wiki":{"about":"ta prispevek je wiki"},"archetypes":{"save":"Shrani možnosti"},"few_likes_left":"Hvala ker delite všečke! Danes jih imate samo še nekaj na voljo.","controls":{"reply":"sestavi odgovor na ta prispevek","like":"všečkaj ta prispevek","has_liked":"všečkali ste prispevek","read_indicator":"člani, ki so prebrali ta prispevek","undo_like":"razveljavi všeček","edit":"uredi prispevek","edit_action":"Uredi","edit_anonymous":"Oprostite vendar morate biti prijavljeni, da lahko uredite ta prispevek.","flag":"prijavi ta prispevek moderatorjem ali pošlji opozorilo avtorju","delete":"izbriši prispevek","undelete":"razveljavi izbris prispevka","share":"deli povezavo do tega prispevka","more":"Več","delete_replies":{"confirm":"Ali hočete izbrisati tudi vse odgovore na tem prispevku?","direct_replies":{"one":"Da, in %{count} neposreden odgovor","two":"Da, in %{count} neposredna odgovora","few":"Da, in %{count} neposredne odgovore","other":"Da, in %{count} neposrednih odgovorov"},"all_replies":{"one":"Da, in %{count} odgovor","two":"Da, in %{count} odgovora","few":"Da, in vse %{count} odgovore","other":"Da, in vseh %{count} odgovorov"},"just_the_post":"Ne, samo ta prispevek"},"admin":"ukrepi administratorja","wiki":"Naredi wiki","unwiki":"Odstrani wiki","convert_to_moderator":"Dodaj barvo osebja","revert_to_regular":"Odstrani barvo osebja","rebake":"Obnovi HTML","unhide":"Ponovni prikaži","change_owner":"Spremeni lastnika","grant_badge":"Podeli značko","lock_post":"Zakleni prispevek","lock_post_description":"onemogoči avtorju da ureja prispevek","unlock_post":"Odkleni prispevek","unlock_post_description":"omogoči avtorju da ureja prispevek","delete_topic_disallowed_modal":"Nimate pravic da izbrišete to temo. Če jo bi res radi izbrisali, jo prijavite osebju skupaj z razlogi.","delete_topic_disallowed":"nimate pravic za brisanje te teme","delete_topic":"izbriši temo","add_post_notice":"Dodaj obvestilo osebja","change_post_notice":"Spremeni obvestilo osebja","delete_post_notice":"Odstrani obvestilo osebja","remove_timer":"odstrani opomnik"},"actions":{"people":{"like_capped":{"one":"in %{count} drugemu uporabniku je prispevek všeč","two":"in %{count} drugima uporabnikoma je prispevek všeč","few":"in %{count} drugim uporabnikom je prispevek všeč","other":"in %{count} drugim uporabnikom je prispevek všeč"}},"by_you":{"off_topic":"Vi ste prijavili da ne ustreza temi","spam":"Vi ste prijavili kot neželeno","inappropriate":"Vi ste prijavili kot neprimerno","notify_moderators":"Ta prispevek ste prijavil moderatorjem","notify_user":"Poslali ste opozorilo avtorju"}},"delete":{"confirm":{"one":"Ali ste prepričani da hočete izbrisati ta %{count} prispevek?","two":"Ali ste prepričani da hočete izbrisati ta %{count} prispevka?","few":"Ali ste prepričani da hočete izbrisati te %{count} prispevke?","other":"Ali ste prepričani da hočete izbrisati teh %{count} prispevkov?"}},"merge":{"confirm":{"one":"Ali ste prepričani da hočete združiti ta %{count} prispevek?","two":"Ali ste prepričani da hočete združiti ta %{count} prispevka?","few":"Ali ste prepričani da hočete združiti te %{count} prispevke?","other":"Ali ste prepričani da hočete združiti teh %{count} prispevkov?"}},"revisions":{"controls":{"first":"Prva verzija","previous":"Prejšnja revizija","next":"Naslednja verzija","last":"Zadnja verzija","hide":"Skrij verzije","show":"Prikaži verzije","edit_wiki":"Uredi wiki","edit_post":"Uredi prispevek","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Prikaži končno obliko z dodajanji in izbrisi","button":"HTML"},"side_by_side":{"title":"Prikaži končno obliko z razlikami eno zraven druge","button":"HTML"},"side_by_side_markdown":{"title":"Prikaži izvorno obliko z razlikami eno zraven druge","button":"Izvorna oblika"}}},"raw_email":{"displays":{"raw":{"title":"Prikaži izvorno obliko e-sporočila","button":"Izvorna oblika"},"text_part":{"title":"Prikaži besedilo e-sporočila","button":"Besedilo"},"html_part":{"title":"Prikaži HTML obliko e-sporočila","button":"HTML"}}},"bookmarks":{"created":"Ustvarjeno","name":"Polno ime"},"filtered_replies":{"viewing_posts_by":"Ogled %{post_count} objav avtorja","viewing_subset":"Nekateri odgovori so strnjeni","viewing_summary":"Ogled povzetka te teme","post_number":"%{username}, objava #%{post_number}","show_all":"Pokaži vse"}},"category":{"can":"lahko\u0026hellip; ","none":"(brez kategorije)","all":"Vse kategorije","choose":"kategorija\u0026hellip;","edit":"Uredi","edit_dialog_title":"Uredi: %{categoryName}","view":"Poglej teme v kategoriji","general":"Splošno","settings":"Nastavitve","topic_template":"Predloga teme","tags":"Oznake","tags_allowed_tags":"Omeji te oznake na to kategorijo:","tags_allowed_tag_groups":"Omeji te skupine oznak na to kategorijo:","tags_placeholder":"(neobvezno) seznam dovoljenih oznak","tag_groups_placeholder":"(neobvezno) seznam dovoljenih oznak skupin","allow_global_tags_label":"Dovoli tudi druge oznake","topic_featured_link_allowed":"Dovoli najboljše povezave v tej kategoriji","delete":"Izbriši kategorijo","create":"Nova kategorija","create_long":"Ustvari novo kategorijo","save":"Shrani kategorijo","slug":"URL kategorije","slug_placeholder":"(neobvezno) besede-s-črtico za URL","creation_error":"Prišlo je do napake pri kreiranju kategorije.","save_error":"Prišlo je do napake pri shranjevanju kategorije.","name":"Ime kategorije","description":"Opis","topic":"kategorija teme","logo":"Logotip slika kategorije","background_image":"Slika ozadja kategorije","badge_colors":"Barve značk","background_color":"Barva ozadja","foreground_color":"Barva ospredja","name_placeholder":"Največ ena ali dve besede","color_placeholder":"Katerakoli spletna barva","delete_confirm":"Ste prepričani da želite izbrisati kategorijo?","delete_error":"Prišlo je do napake pri brisanju kategorije.","list":"Seznam kategorij","no_description":"Dodajte opis kategorije.","change_in_category_topic":"Uredi opis","already_used":"Ta barva je že uporabljena na drugi kategoriji.","security":"Varnost","security_add_group":"Dodaj skupino","permissions":{"group":"Skupina","see":"Glej","reply":"Odgovori","create":"Ustvari","no_groups_selected":"Dostop ni bil odobren nobeni skupini; ta kategorija bo vidna samo osebju.","everyone_has_access":"Ta kategorija je javna, vsi lahko vidijo, odgovarjajo in ustvarjajo objave. Če želite omejiti dovoljenja, odstranite eno ali več dovoljenj, dodeljenih skupini »vsi«.","toggle_reply":"Preklopi dovoljenje za odgovor","toggle_full":"Preklopi dovoljenje za ustvarjanje","inherited":"To dovoljenje je podedovano od \"vsi\""},"special_warning":"Ta kategorija je prednastavljena, zato varnostnih nastavitev ni mogoče urejati. Če ne želite uporabljati te kategorije jo raje izbrišite kot uporabljajte v drug namen.","uncategorized_security_warning":"Ta kategorija je posebna. Namenjena je za shranjevanje tem, ki nimajo kategorije. Zato ne more imeti varnostnih nastavitev.","uncategorized_general_warning":"Ta kategorija je posebna. Uporabi se kot privzeta kategorija za teme brez kategorije. Če hočete onemogočiti takšen način in hočete obvezno izbiro kategorije, \u003ca href=\"%{settingLink}\"\u003epotem onemogočite nastavitev tukaj\u003c/a\u003e. Če hočete spremeniti ime ali opis, pojdite \u003ca href=\"%{customizeLink}\"\u003ePrilagodi / Vsebina besedila\u003c/a\u003e.","pending_permission_change_alert":"Niste dodali %{group} v to kategorijo; kliknite ta gumb za dodajanje.","images":"Slike","email_in":"Dohodni e-naslov po meri:","email_in_allow_strangers":"Dovoli e-sporočila od anonimnih uporabnikov brez računa","email_in_disabled":"Objavljanje novih tem preko e-sporočila je onemogočeno v Nastavitvah strani. Za omogočanje objave novih tem preko e-sporočila, ","email_in_disabled_click":"vključite \"email in\" nastavitev.","mailinglist_mirror":"Kategorija zrcali poštni seznam","show_subcategory_list":"Prikaži seznam podkategorij nad temami za to kategorijo.","num_featured_topics":"Število tem prikazanih na seznamu kategorij:","subcategory_num_featured_topics":"Število osrednjih tem na strani nadrejene kategorije:","all_topics_wiki":"Naredi nove teme kot wiki","subcategory_list_style":"Stil seznama podkategorij:","sort_order":"Seznam tem urejen po:","default_view":"Privzet seznam tem:","default_top_period":"Privzeto obdobje za najboljše:","allow_badges_label":"Omogoči nagrajevanje z značkami v tej kategoriji","edit_permissions":"Uredi dovoljenja","review_group_name":"ime skupine","require_topic_approval":"Zahtevaj moderatorjevo potrditev vseh novih tem","require_reply_approval":"Zahteva odobritev moderatorja za vse nove odgovore","this_year":"to leto","position":"Položaj na strani kategorij:","default_position":"Privzeta pozicija","position_disabled":"Kategorije bodo razvrščene glede na aktivnost. Za kontrolo razvrščanja kategorij na seznamih, ","position_disabled_click":"omogoči nastavitev \"fiksnih položajev kategorij\"","minimum_required_tags":"Najmanjše število oznak zahtevanih na temi:","parent":"Nadrejena kategorija","num_auto_bump_daily":"Število odprtih tem, ki se samodejno izpostavijo vsak dan:","navigate_to_first_post_after_read":"Premakni se na prvi prispevek ko so vse teme prebrane","notifications":{"watching":{"title":"Opazujem","description":"Samodejno boste opazovali vse teme v tej kategoriji. Obveščeni boste za vsak nov prispevek v vsaki temi. Ob temi bo prikazano število novih odgovorov."},"watching_first_post":{"title":"Opazujem prvi prispevek","description":"Obveščeni boste o novih temah v tej kategoriji, ne pa tudi o odgovorih v temi."},"tracking":{"title":"Sledim","description":"Samodejno boste sledili vsem temam v tej kategoriji. Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori. Ob temi bo prikazano število novih odgovorov."},"regular":{"title":"Običajno","description":"Obveščeni boste, če nekdo omeni vaše @ime ali vam odgovori."},"muted":{"title":"Utišano","description":"O novih temah v tej kategoriji ne boste obveščeni in ne bodo se pojavile med najnovejšimi."}},"search_priority":{"label":"Pomembnost v iskalniku","options":{"normal":"Običajna","ignore":"Prezri","very_low":"Zelo nizka","low":"Nizka","high":"Visoka","very_high":"Zelo visoka"}},"sort_options":{"default":"privzeto","likes":"Všečki","op_likes":"Všečki izvornega prispevka","views":"Ogledi","posts":"Prispevki","activity":"Aktivnost","posters":"Avtorji","category":"Kategorija","created":"Ustvarjeno"},"sort_ascending":"Naraščajoče","sort_descending":"Padajoče","subcategory_list_styles":{"rows":"Vrstice","rows_with_featured_topics":"Vrstice z izpostavljenimi temami","boxes":"Škatle","boxes_with_featured_topics":"Škatle z izpostavljenimi temami"},"settings_sections":{"general":"Splošno","moderation":"Moderiranje","appearance":"Videz","email":"E-sporočila"},"location_enabled":"Dovoli dodajanje lokacije na teme v tej kategoriji","location_topic_status":"Omogoči ikone lokacije na seznamu tem v tej kategoriji.","location_map_filter_closed":"Ne prikaži zaprtih tem na zemljevidu v tej kategoriji."},"flagging":{"title":"Hvala, da pomagate ohraniti prijazno skupnost!","action":"Prijavi prispevek","take_action_options":{"silence":{"title":"Utišaj uporabnika"}},"notify_action":"Opozorilo","official_warning":"Uradno opozorilo","delete_spammer":"Izbriši spamerja","yes_delete_spammer":"Da, izbriši spamerja","ip_address_missing":"(N/A)","hidden_email_address":"(skrito)","submit_tooltip":"Pošlji zasebno opozorilo","take_action_tooltip":"Doseži zahtevan nivo prijav takoj in ne čakaj na več prijav s strani uporabnikov","cant":"Tega prispevka ne morete prijaviti v tem trenutku.","notify_staff":"Prijavite osebju foruma","formatted_name":{"off_topic":"Ne ustreza temi","inappropriate":"Neprimerno","spam":"Neželeno"},"custom_placeholder_notify_user":"Opozorilo naj bo konkretno, konstruktivno, predvsem pa prijazno.","custom_placeholder_notify_moderators":"Napišite kaj vas konkretno moti na prispevku in napišite konkretne primere ter dodajte povezave na motečo vsebino.","custom_message":{"at_least":{"one":"vnesite vsaj %{count} znak","two":"vnesite vsaj %{count} znaka","few":"vnesite vsaj %{count} znake","other":"vnesite vsaj %{count} znakov"},"more":{"one":"%{count} do konca...","two":"%{count} do konca...","few":"%{count} do konca...","other":"%{count} do konca..."},"left":{"one":"%{count} preostal","two":"%{count} preostala","few":"%{count} preostali","other":"%{count} preostalih"}}},"flagging_topic":{"title":"Hvala, da pomagate ohraniti prijazno skupnost!","action":"Prijavi temo","notify_action":"Opozorilo"},"topic_map":{"title":"Povzetek teme","participants_title":"Pogosto objavljajo","links_title":"Popularne povezave","links_shown":"prikaži več povezav...","clicks":{"one":"%{count} klik","two":"%{count} klika","few":"%{count} kliki","other":"%{count} klikov"}},"post_links":{"about":"razširi več povezav za to temo","title":{"one":"%{count} več","two":"%{count} več","few":"%{count} več","other":"%{count} več"}},"topic_statuses":{"warning":{"help":"To je uradno opozorilo."},"bookmarked":{"help":"Zaznamovali ste to temo."},"locked":{"help":"Ta tema je zaprta; ne sprejema več odgovorov."},"archived":{"help":"Ta tema je arhivirana; je zamrznjena in se ne more spreminjati."},"locked_and_archived":{"help":"Ta tema je zaprta in arhivirana; ne sprejema več novih odgovorov in se ne more spreminjati."},"unpinned":{"title":"Odpeta","help":"Ta tema je odpeta; prikazana bo v običajnem vrstnem redu"},"pinned_globally":{"title":"Pripeto globalno","help":"Ta tema je pripeta globalno; prikazala se bo na vrhu zadnjih tem in njene kategorije"},"pinned":{"title":"Pripeto","help":"Ta tema je pripeta; prikazala se bo na vrhu njene kategorije."},"unlisted":{"help":"Ta tema je izločena; ne bo se prikazovala na seznamih tem in se jo lahko dostopa samo preko neposredne povezave."},"personal_message":{"title":"Ta tema je zasebno sporočilo","help":"Ta tema je zasebno sporočilo"},"location":{"help":"Ta tema ima lokacijo."}},"posts":"Prispevki","original_post":"Izvirni prispevek","views":"Ogledi","views_lowercase":{"one":"ogled","two":"ogleda","few":"ogledi","other":"ogledov"},"replies":"Odgovori","views_long":{"one":"ta tema je bila ogledna %{number} krat","two":"ta tema je bila ogledna %{number} krat","few":"ta tema je bila ogledna %{number} krat","other":"ta tema je bila ogledna %{number} krat"},"activity":"Aktivnost","likes":"Všečki","likes_lowercase":{"one":"všeček","two":"všečka","few":"všečki","other":"všečkov"},"users":"Uporabniki","users_lowercase":{"one":"uporabnik","two":"uporabnika","few":"uporabniki","other":"uporabnikov"},"category_title":"Kategorija","history":"Zgodovina","changed_by":"od %{author}","raw_email":{"title":"Dohodno e-sporočilo","not_available":"Ni na voljo!"},"categories_list":"Seznam kategorij","filters":{"with_topics":"%{filter} teme","with_category":"%{filter} %{category} teme","latest":{"title":"Najnovejše","title_with_count":{"one":"Najnovejša (%{count})","two":"Najnovejši (%{count})","few":"Najnovejše (%{count})","other":"Najnovejših (%{count})"},"help":"teme z nedavnimi prispevki"},"read":{"title":"Prebrano","help":"teme, ki jih prebrali, urejene po času zadnjega branja"},"categories":{"title":"Kategorije","title_in":"Kategorija - %{categoryName}","help":"vse teme združene po kategorijah"},"unread":{"title":"Neprebrane","title_with_count":{"one":"Neprebrana (%{count})","two":"Neprebrani (%{count})","few":"Neprebrane (%{count})","other":"Neprebranih (%{count})"},"help":"teme, ki jih opazujete ali jim sledite z neprebranimi sporočili","lower_title_with_count":{"one":"%{count} neprebrana","two":"%{count} neprebrani","few":"%{count} neprebrane","other":"%{count} neprebranih"}},"new":{"lower_title_with_count":{"one":"%{count} nova","two":"%{count} novi","few":"%{count} nove","other":"%{count} novih"},"lower_title":"novo","title":"Nove","title_with_count":{"one":"Nova (%{count})","two":"Novi (%{count})","few":"Nove (%{count})","other":"Novih (%{count})"},"help":"teme ustvarjene v zadnjih dneh"},"posted":{"title":"Moji prispevki","help":"teme v katerih ste objavljali"},"bookmarks":{"title":"Zaznamki","help":"teme z zaznamki"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","two":"%{categoryName} (%{count})","few":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"zadnje teme v kategoriji %{categoryName}"},"top":{"title":"Najboljše","help":"najbolj aktivne teme v zadnjem letu, mesecu, tednu ali dnevu","all":{"title":"Ves čas"},"yearly":{"title":"V letu"},"quarterly":{"title":"V četrtletju"},"monthly":{"title":"Mesečno"},"weekly":{"title":"Tedensko"},"daily":{"title":"Dnevno"},"all_time":"Ves čas","this_year":"Leto","this_quarter":"Četrtletje","this_month":"Mesec","this_week":"Teden","today":"Danes"},"map":{"title":"Zemljevid","help":"Označi teme z lokacijami v tej kategoriji na zemljevidu."}},"browser_update":"Na žalost je \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003evaš brskalnik prestar za uporabo te spletne strani\u003c/a\u003e. Če si želite ogledati obogateno vsebino, se prijaviti in odgovarjati., prosim \u003ca href=\"https://browsehappy.com\"\u003enadgradite svoj brskalnik\u003c/a\u003e.","permission_types":{"full":"Ustvari / Odgovori / Vidi","create_post":"Odgovori / Vidi","readonly":"Vidi"},"lightbox":{"download":"prenesi","previous":"Predhodna (leva puščična tipka)","next":"Naslednja (desna puščična tipka)","counter":"%curr% od %total%","close":"Zapri (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eTe vsebina\u003c/a\u003e ne moremo naložiti.","image_load_error":"\u003ca href=\"%url%\"\u003eTe slike\u003c/a\u003e ne moremo naložiti."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} ali %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Bližnjice na tipkovnici","jump_to":{"title":"Skoči na","home":"%{shortcut} Domov","latest":"%{shortcut} Najnovejše","new":"%{shortcut} Novo","unread":"%{shortcut} Neprebrane","categories":"%{shortcut} Kategorije","top":"%{shortcut} Na vrh","bookmarks":"%{shortcut} Zaznamki","profile":"%{shortcut} Profil","messages":"%{shortcut} Zasebna sporočila","drafts":"%{shortcut} Osnutki","next":"%{shortcut} Nova tema","previous":"%{shortcut} Prejšnja tema"},"navigation":{"title":"Navigacija","jump":"%{shortcut} Pojdi na prispevek #","back":"%{shortcut} Nazaj","up_down":"%{shortcut} Prestavi izbiro \u0026uarr; \u0026darr;","open":"%{shortcut} Odpri izbrano temo","next_prev":"%{shortcut} Naslednja/predhodna sekcija","go_to_unread_post":"%{shortcut} Na prvi neprebran prispevek"},"application":{"title":"Aplikacija","create":"%{shortcut} Ustvari novo temo","notifications":"%{shortcut} Odpri obvestila","hamburger_menu":"%{shortcut} Odpri meni","user_profile_menu":"%{shortcut} Odpri uporabniški meni","show_incoming_updated_topics":"%{shortcut} Prikaži osvežene teme","search":"%{shortcut} Iskalnik","help":"%{shortcut} Odpri bližnjice na tipkovnici","dismiss_new_posts":"%{shortcut} Opusti nov/prispevek","dismiss_topics":"%{shortcut} Opusti teme","log_out":"%{shortcut} Odjava"},"composing":{"title":"Urejevalnik","return":"%{shortcut} Vrni se v urejevalnik","fullscreen":"%{shortcut} Celostranski urejevalnik"},"bookmarks":{"title":"Zaznamki","enter":"%{shortcut} Shrani in zapri","later_today":"%{shortcut} Kasneje danes","later_this_week":"%{shortcut} Kasneje ta teden","tomorrow":"%{shortcut} Jutri","next_week":"%{shortcut} Naslednji teden","next_month":"%{shortcut} Naslednji mesec","next_business_week":"%{shortcut} V začetku naslednjega tedna","next_business_day":"%{shortcut} Naslednji delovni dan","custom":"%{shortcut} Datum in ura po meri","none":"%{shortcut} Brez opomnika","delete":"%{shortcut} Izbriši zaznamek"},"actions":{"title":"Akcije","bookmark_topic":"%{shortcut}Dodaj/odstrani zaznamek na temi","pin_unpin_topic":"%{shortcut} Pripni/odpni temo","share_topic":"%{shortcut}Deli temo","share_post":"%{shortcut} Deli prispevek","reply_as_new_topic":"%{shortcut} Odgovori v novi povezani temi","reply_topic":"%{shortcut} Odgovori v temo","reply_post":"%{shortcut} Odgovori na prispevek","quote_post":"%{shortcut} Citiraj prispevek","like":"%{shortcut} Všečkaj prispevek","flag":"%{shortcut} Prijavi prispevek","bookmark":"%{shortcut} Dodaj zaznamek","edit":"%{shortcut} Uredi prispevek","delete":"%{shortcut} Zbriši prispevek","mark_muted":"%{shortcut} Utišaj temo","mark_regular":"%{shortcut} Običajna (privzeta) tema","mark_tracking":"%{shortcut} Sledi temi","mark_watching":"%{shortcut} Spremljaj temo","print":"%{shortcut} Natisni temo","defer":"%{shortcut} Preloži temo","topic_admin_actions":"%{shortcut} Odpri skrbniška dejanja teme"},"search_menu":{"title":"Iskalni meni","prev_next":"%{shortcut} Prestavi izbor gor in dol","insert_url":"%{shortcut} Vstavi izbor v odprti urejevalnik"}},"badges":{"earned_n_times":{"one":"Prislužili to značko %{count} krat","two":"Prislužili to značko %{count} krat","few":"Prislužili to značko %{count} krat","other":"Prislužili to značko %{count} krat"},"granted_on":"Podeljeno %{date}","others_count":"Drugi s to značko (%{count})","title":"Značke","allow_title":"To značko lahko uporabite kot naziv","multiple_grant":"To lahko prislužite večkrat.","badge_count":{"one":"%{count} značka","two":"%{count} znački","few":"%{count} značke","other":"%{count} značk"},"more_badges":{"one":"+%{count} več","two":"+%{count} več","few":"+%{count} več","other":"+%{count} več"},"granted":{"one":"%{count} podeljena","two":"%{count} podeljeni","few":"%{count} podeljene","other":"%{count} podeljenih"},"select_badge_for_title":"Izberite značko za svoj naziv","none":"(brez)","successfully_granted":"%{badge} uspešno podeljena %{username}","badge_grouping":{"getting_started":{"name":"Začetki"},"community":{"name":"Skupnost"},"trust_level":{"name":"Nivo zaupanja"},"other":{"name":"Druge"},"posting":{"name":"Prispevki"}}},"tagging":{"all_tags":"Vse oznake","other_tags":"Druge oznake","selector_all_tags":"vse oznake","selector_no_tags":"brez oznak","changed":"spremenjene oznake:","tags":"Oznake","choose_for_topic":"neobvezne oznake","default_info":"Ta oznaka ni omejena na nobeno kategorijo in nima sopomenk.","category_restricted":"Ta oznaka je omejena na kategorije, do katerih nimate dovoljenja za dostop.","synonyms":"Sopomenke","synonyms_description":"Ko bodo uporabljene naslednje oznake, bodo nadomeščene z \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Ta oznaka spada v skupino \"%{tag_groups}\".","two":"Ta oznaka spada v skupini \"%{tag_groups}\".","few":"Ta oznaka spada v skupine \"%{tag_groups}\".","other":"Ta oznaka spada v skupine \"%{tag_groups}\"."},"category_restrictions":{"one":"Uporablja se lahko le v tej kategoriji:","two":"Uporablja se lahko le v teh dveh kategorijah:","few":"Uporablja se lahko le v teh kategorijah:","other":"Uporablja se lahko le v teh kategorijah:"},"edit_synonyms":"Upravljanje sopomenk","add_synonyms_label":"Dodajte sopomenke:","add_synonyms":"Dodaj","add_synonyms_explanation":{"one":"Vsako mesto, ki trenutno uporablja to oznako, bo spremenjeno tako, da bo namesto tega uporabilo \u003cb\u003e%{tag_name}\u003c/b\u003e . Ali ste prepričani, da želite narediti to spremembo?","two":"Vsako mesto, ki trenutno uporablja ti dve oznaki, bo spremenjeno tako, da bo namesto tega uporabilo \u003cb\u003e%{tag_name}\u003c/b\u003e . Ali ste prepričani, da želite narediti to spremembo?","few":"Vsako mesto, ki trenutno uporablja te oznake, bo spremenjeno tako, da bo namesto tega uporabilo \u003cb\u003e%{tag_name}\u003c/b\u003e . Ali ste prepričani, da želite narediti to spremembo?","other":"Vsako mesto, ki trenutno uporablja te oznake, bo spremenjeno tako, da bo namesto tega uporabilo \u003cb\u003e%{tag_name}\u003c/b\u003e . Ali ste prepričani, da želite narediti to spremembo?"},"add_synonyms_failed":"Naslednjih oznak ni bilo mogoče dodati kot sopomenke: \u003cb\u003e%{tag_names}\u003c/b\u003e. Prepričajte se, da nimajo sopomenk in niso sopomenke druge oznake.","remove_synonym":"Odstrani sopomenko","delete_synonym_confirm":"Ali ste prepričani, da želite izbrisati sopomenko \"%{tag_name}\"?","delete_tag":"Izbriši oznako","delete_confirm":{"one":"Ali ste prepričani, da želite izbrisati to oznako in jo umaknili iz %{count} teme s to oznako?","two":"Ali ste prepričani, da želite izbrisati to oznako in jo umaknili iz %{count} tem s to oznako?","few":"Ali ste prepričani, da želite izbrisati to oznako in jo umaknili iz %{count} tem s to oznako?","other":"Ali ste prepričani, da želite izbrisati to oznako in jo umaknili iz %{count} tem s to oznako?"},"delete_confirm_no_topics":"Ali ste prepričani da hočete izbrisati to oznako?","delete_confirm_synonyms":{"one":"Izbrisana bo tudi njena sopomenka.","two":"Izbrisani bosta tudi njeni %{count} sopomenki.","few":"Izbrisane bodo tudi njene %{count} sopomenke.","other":"Izbrisanih bo tudi njenih %{count} sopomenk."},"rename_tag":"Preimenuj oznako","rename_instructions":"Izberite novo ime za oznako:","sort_by":"Uredi po:","sort_by_count":"številu","sort_by_name":"imenu","manage_groups":"Uredite skupine oznak","manage_groups_description":"Določi skupine za organiziranje oznak","upload":"Naloži oznake","upload_description":"Naloži datoteko CSV za množično ustvarjanje oznak","upload_instructions":"Ena na vrstico, po želji s skupino oznak v formatu 'tag_name,tag_group'.","upload_successful":"Oznake so bile uspešno naložene","delete_unused_confirmation":{"one":"%{count} oznaka bod izbrisana: %{tags}","two":"%{count} oznaki bosta izbrisani: %{tags}","few":"%{count} oznake bodo izbrisane: %{tags}","other":"%{count} oznak bo izbrisano: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} in %{count} druga","two":"%{tags} in %{count} drugi","few":"%{tags} in %{count} druge","other":"%{tags} in %{count} drugih"},"delete_no_unused_tags":"Ni neuporabljenih oznak.","delete_unused":"Izbriši neuporabljene oznake","delete_unused_description":"Izbriši vse oznake, ki se ne uporabljajo na nobeni temi ali zasebnem sporočilu","cancel_delete_unused":"Prekliči","filters":{"without_category":"%{filter} %{tag} teme","with_category":"%{filter} %{tag} teme v %{category}","untagged_without_category":"%{filter} neoznačenih tem","untagged_with_category":"%{filter} neoznačene teme v %{category}"},"notifications":{"watching":{"title":"Opazujem","description":"Samodejno boste opazovali vse teme s temi oznakami. Obveščeni boste za vsak nov prispevek v vsaki temi. Ob temi bo prikazano število novih odgovorov."},"watching_first_post":{"title":"Opazujem prvi prispevek","description":"Obveščeni boste o novih temah s temi oznakami, ne pa tudi o odgovorih v temah."},"tracking":{"title":"Sledim","description":"Samodejno boste sledili vsem temam s temi oznakami. Ob temi bo prikazano število novih odgovorov."},"regular":{"title":"Običajno","description":"Obveščeni boste, če nekdo omeni vaše @ime ali odgovori na vaš prispevek."},"muted":{"title":"Utišano","description":"Ne boste obveščeni o temah s temi oznakami in ne bodo se pojavile v seznamu neprebrane."}},"groups":{"title":"Skupine oznak","about":"Dodajte oznake v skupine da jih lažje upravljate","new":"Nova skupina","tags_label":"Oznake v tej skupini:","parent_tag_label":"Nadrejena oznaka:","parent_tag_description":"Oznake iz te skupine se ne morejo uporabiti, če ni prisotna tudi nadrejena oznaka.","one_per_topic_label":"Omeji na eno oznako na temo iz te skupine","new_name":"Nova skupina oznak","name_placeholder":"Ime skupine oznak","save":"Shrani","delete":"Izbriši","confirm_delete":"Ali ste prepričani, da hočete izbrisati to skupino oznak?","everyone_can_use":"Oznake lahko uporablja kdorkoli","usable_only_by_groups":"Oznake so vidne vsem, vendar jih lahko uporabljajo le naslednje skupine","visible_only_to_groups":"Oznake so vidne le naslednjim skupinam"},"topics":{"none":{"unread":"Nimate neprebranih tem.","new":"Nimate novih tem.","read":"Niste prebrali še nobene teme.","posted":"Niste objavili še v nobeni temi.","latest":"Ni najnovejših tem.","bookmarks":"Nimate tem z zaznamki.","top":"Ni najboljših tem."}}},"invite":{"custom_message":"Naredite vaše povabilo bolj osebno tako da napišete \u003ca href\u003eosebno sporočilo\u003c/a\u003e.","custom_message_placeholder":"Vnesi sporočilo po meri","custom_message_template_forum":"Pridruži se našemu forumu!","custom_message_template_topic":"Zdi se mi, da vam bo ta tema všeč!"},"forced_anonymous":"Zaradi visoke obremenitve je to prikazano vsem tako kot bi videl neprijavljen uporabnik.","footer_nav":{"back":"Nazaj","forward":"Naprej","share":"Deli","dismiss":"Opusti"},"safe_mode":{"enabled":"Varni način je vklopljen, za izklop varnega načina zaprite okno brskalnika."},"image_removed":"(slika odstranjena)","do_not_disturb":{"title":"Ne moti za ...","label":"Ne moti","remaining":"%{remaining} preostalo","options":{"half_hour":"30 minut","one_hour":"1 ura","two_hours":"2 uri","tomorrow":"Do jutri","custom":"Po meri"}},"presence":{"replying_to_topic":{"one":"odgovarja","two":"odgovarja","few":"odgovarja","other":"odgovarja"}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Začni vodič za nove uporabnike za vse nove uporabnike","welcome_message":"Pošlji sporočilo z dobrodošlico in kratkimi uvodnimi navodili vsem novim uporabnikom"}},"details":{"title":"Skrij podrobnosti"},"discourse_local_dates":{"relative_dates":{"today":"danes %{time}","tomorrow":"jutri %{time}","yesterday":"včeraj %{time}","countdown":{"passed":"datum je minil"}},"title":"Vstavi datum / uro","create":{"form":{"insert":"Dodaj","advanced_mode":"Napredni način","simple_mode":"Enostavni način","timezones_title":"Časovni pas za prikaz","timezones_description":"Časovni pas bo uporabljen za prikaz v predogledu ali kot rezerva.","recurring_title":"Ponovitev","recurring_description":"Določite ponovitev dogodka. Lahko ročno vnesete ponovitev pripravljeno iz obrazca in uporabite naslednje ključe: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","recurring_none":"Brez ponovitve","invalid_date":"Napačen datum - poskrbite, da sta datum in čas pravilna","date_title":"Datum","time_title":"Čas","format_title":"Oblika datuma","timezone":"Časovni pas","until":"Do...","recurring":{"every_day":"Vsak dan","every_week":"Vsak teden","every_two_weeks":"Vsaka dva tedna","every_month":"Vsak mesec","every_two_months":"Vsaka dva meseca","every_three_months":"Vsake tri mesece","every_six_months":"Vsakih šest mesecev","every_year":"Vsako leto"}}}},"location":{"address":"Naslov","name":{"title":"Opis (neobvezno)","desc":"npr. J. Novak mehanik"},"street":{"title":"Ulica in številka","desc":"npr. Ukmarjev trg 2"},"postalcode":{"title":"Poštna številka","desc":"npr. 6310"},"neighbourhood":{"title":"Soseska","desc":"npr. Bežigrad"},"city":{"title":"Mesto","desc":"npr. Izola"},"state":{"title":"Dežela ali pokrajina","desc":"npr. Primorska"},"country_code":{"title":"Država","placeholder":"Izberite državo"},"coordinates":"Koordinate","lat":{"title":"Z. širina","desc":"npr. -31.9456702"},"lon":{"title":"Z. dolžina","desc":"npr. 115.8626477"},"query":{"title":"Naslov","desc":"npr. Ukmarjev trg 2, Koper"},"geo":{"desc":"Lokacije zagotavlja {{provider}}","btn":{"label":"Poišči naslov"},"results":"Naslovi","no_results":"Ni zadetkov.","show_map":"Pokaži zemljevid"},"label":{"add":"Dodaj lokacijo","title":"Pokaži podrobnosti lokacije"},"clear":"počisti","done":"Shrani","errors":{"search":"Prišlo je do napake pri iskanju naslova. Počakajte 5 minut in poskusite ponovno."}},"map":{"search_placeholder":"Išči"},"discourse_calendar":{"invite_user_notification":"%{username} vas vabi na: %{description}","on_holiday":"Na počitnicah","holiday":"Praznik","add_to_calendar":"Dodaj v Googlov koledar","region":{"title":"Regija","use_current_region":"Uporabi trenutno regijo","names":{"ar":"Argentina","at":"Avstrija","au_act":"Avstralija (au_act)","au_nsw":"Avstralija (au_nsw)","au_nt":"Avstralija (au_nt)","au_qld_brisbane":"Avstralija (au_qld_brisbane)","au_qld_cairns":"Avstralija (au_qld_cairns)","au_qld":"Avstralija (au_qld)","au_sa":"Avstralija (au_sa)","au_tas_north":"Avstralija (au_tas_north)","au_tas_south":"Avstralija (au_tas_south)","au_tas":"Avstralija (au_tas)","au_vic_melbourne":"Avstralija (au_vic_melbourne)","au_vic":"Avstralija (au_vic)","au_wa":"Avstralija (au_wa)","au":"Avstralija","be_fr":"Belgija (be_fr)","be_nl":"Belgija (be_nl)","bg_bg":"Bolgarija (bg_bg)","bg_en":"Bolgarija (bg_en)","br":"Brazilija","ca_ab":"Kanada (ca_ab)","ca_bc":"Kanada (ca_bc)","ca_mb":"Kanada (ca_mb)","ca_nb":"Kanada (ca_nb)","ca_nl":"Kanada (ca_nl)","ca_ns":"Kanada (ca_ns)","ca_nt":"Kanada (ca_nt)","ca_nu":"Kanada (ca_nu)","ca_on":"Kanada (ca_on)","ca_pe":"Kanada (ca_pe)","ca_qc":"Kanada (ca_qc)","ca_sk":"Kanada (ca_sk)","ca_yt":"Kanada (ca_yt)","ca":"Kanada","ch_ag":"Švica (ch_ag)","ch_ai":"Švica (ch_ai)","ch_ar":"Švica (ch_ar)","ch_be":"Švica (ch_be)","ch_bl":"Švica (ch_bl)","ch_bs":"Švica (ch_bs)","ch_fr":"Švica (ch_fr)","ch_ge":"Švica (ch_ge)","ch_gl":"Švica (ch_gl)","ch_gr":"Švica (ch_gr)","ch_ju":"Švica (ch_ju)","ch_lu":"Švica (ch_lu)","ch_ne":"Švica (ch_ne)","ch_nw":"Švica (ch_nw)","ch_ow":"Švica (ch_ow)","ch_sg":"Švica (ch_sg)","ch_sh":"Švica (ch_sh)","ch_so":"Švica (ch_so)","ch_sz":"Švica (ch_sz)","ch_tg":"Švica (ch_tg)","ch_ti":"Švica (ch_ti)","ch_ur":"Švica (ch_ur)","ch_vd":"Švica (ch_vd)","ch_vs":"Švica (ch_vs)","ch_zg":"Švica (ch_zg)","ch_zh":"Švica (ch_zh)","ch":"Švica","cl":"Čile","co":"Kolumbija","cr":"Kostarika","cz":"Češka","de_bb":"Nemčija (de_bb)","de_be":"Nemčija (de_be)","de_bw":"Nemčija (de_bw)","de_by_augsburg":"Nemčija (de_by_augsburg)","de_by_cath":"Nemčija (de_by_cath)","de_by":"Nemčija (de_by)","de_hb":"Nemčija (de_hb)","de_he":"Nemčija (de_he)","de_hh":"Nemčija (de_hh)","de_mv":"Nemčija (de_mv)","de_ni":"Nemčija (de_ni)","de_nw":"Nemčija (de_nw)","de_rp":"Nemčija (de_rp)","de_sh":"Nemčija (de_sh)","de_sl":"Nemčija (de_sl)","de_sn_sorbian":"Nemčija (de_sn_sorbian)","de_sn":"Nemčija (de_sn)","de_st":"Nemčija (de_st)","de_th_cath":"Nemčija (de_th_cath)","de_th":"Nemčija (de_th)","de":"Nemčija","dk":"Danska","ee":"Estonija","el":"Grčija","es_an":"Španija (es_an)","es_ar":"Španija (es_ar)","es_ce":"Španija (es_ce)","es_cl":"Španija (es_cl)","es_cm":"Španija (es_cm)","es_cn":"Španija (es_cn)","es_ct":"Španija (es_ct)","es_ex":"Španija (es_ex)","es_ga":"Španija (es_ga)","es_ib":"Španija (es_ib)","es_lo":"Španija (es_lo)","es_m":"Španija (es_m)","es_mu":"Španija (es_mu)","es_na":"Španija (es_na)","es_o":"Španija (es_o)","es_pv":"Španija (es_pv)","es_v":"Španija (es_v)","es_vc":"Španija (es_vc)","es":"Španija","fi":"Finska","fr_a":"Francija (fr_a)","fr_m":"Francija (fr_m)","fr":"Francija","gb_con":"Združeno kraljestvo (gb_con)","gb_eaw":"Združeno kraljestvo (gb_eaw)","gb_eng":"Združeno kraljestvo (gb_eng)","gb_gsy":"Združeno kraljestvo (gb_gsy)","gb_iom":"Združeno kraljestvo (gb_iom)","gb_jsy":"Združeno kraljestvo (gb_jsy)","gb_nir":"Združeno kraljestvo (gb_nir)","gb_sct":"Združeno kraljestvo (gb_sct)","gb_wls":"Združeno kraljestvo (gb_wls)","gb":"Združeno kraljestvo","ge":"Gruzija","gg":"Guernsey","hk":"Hong Kong","hr":"Hrvaška","hu":"Madžarska","ie":"Irska","im":"Otok Man","is":"Islandija","it_bl":"Italija (it_bl)","it_fi":"Italija (it_fi)","it_ge":"Italija (it_ge)","it_pd":"Italija (it_pd)","it_rm":"Italija (it_rm)","it_ro":"Italija (it_ro)","it_to":"Italija (it_to)","it_tv":"Italija (it_tv)","it_ve":"Italija (it_ve)","it_vi":"Italija (it_vi)","it_vr":"Italija (it_vr)","it":"Italija","je":"Jersey","jp":"Japonska","kr":"Južna Koreja","li":"Lihtenštajn","lt":"Litva","lu":"Luksemburg","lv":"Latvija","ma":"Maroko","mt_en":"Malta (mt_en)","mt_mt":"Malta (mt_mt)","mx_pue":"Mehika (mx_pue)","mx":"Mehika","my":"Malezija","ng":"Nigerija","nl":"Nizozemska","no":"Norveška","nz_ak":"Nova Zelandija (nz_ak)","nz_ca":"Nova Zelandija (nz_ca)","nz_ch":"Nova Zelandija (nz_ch)","nz_hb":"Nova Zelandija (nz_hb)","nz_mb":"Nova Zelandija (nz_mb)","nz_ne":"Nova Zelandija (nz_ne)","nz_nl":"Nova Zelandija (nz_nl)","nz_ot":"Nova Zelandija (nz_ot)","nz_sc":"Nova Zelandija (nz_sc)","nz_sl":"Nova Zelandija (nz_sl)","nz_ta":"Nova Zelandija (nz_ta)","nz_we":"Nova Zelandija (nz_we)","nz_wl":"Nova Zelandija (nz_wl)","nz":"Nova Zelandija","pe":"Peru","ph":"Filipini","pl":"Poljska","pt_li":"Portugalska (pt_li)","pt_po":"Portugalska (pt_po)","pt":"Portugalska","ro":"Romunija","rs_cyrl":"Srbija (rs_cyrl)","rs_la":"Srbija (rs_la)","ru":"Rusija","se":"Švedska","sg":"Singapur","si":"Slovenija","sk":"Slovaška","th":"Tajska","tn":"Tunizija","tr":"Turčija","ua":"Ukrajina","unitednations":" (Združeni narodi)","ups":" (ups)","us_ak":"ZDA (us_ak)","us_al":"ZDA (us_al)","us_ar":"ZDA (us_ar)","us_az":"ZDA (us_az)","us_ca":"ZDA (us_ca)","us_co":"ZDA (us_co)","us_ct":"ZDA (us_ct)","us_dc":"ZDA (us_dc)","us_de":"ZDA (us_de)","us_fl":"ZDA (us_fl)","us_ga":"ZDA (us_ga)","us_gu":"ZDA (us_gu)","us_hi":"ZDA (us_hi)","us_ia":"ZDA (us_ia)","us_id":"ZDA (us_id)","us_il":"ZDA (us_il)","us_in":"ZDA (us_in)","us_ks":"ZDA (us_ks)","us_ky":"ZDA (us_ky)","us_la":"ZDA (us_la)","us_ma":"ZDA (us_ma)","us_md":"ZDA (us_md)","us_me":"ZDA (us_me)","us_mi":"ZDA (us_mi)","us_mn":"ZDA (us_mn)","us_mo":"ZDA (us_mo)","us_ms":"ZDA (us_ms)","us_mt":"ZDA (us_mt)","us_nc":"ZDA (us_nc)","us_nd":"ZDA (us_nd)","us_ne":"ZDA (us_ne)","us_nh":"ZDA (us_nh)","us_nj":"ZDA (us_nj)","us_nm":"ZDA (us_nm)","us_nv":"ZDA (us_nv)","us_ny":"ZDA (us_ny)","us_oh":"ZDA (us_oh)","us_ok":"ZDA (us_ok)","us_or":"ZDA (us_or)","us_pa":"ZDA (us_pa)","us_pr":"ZDA (us_pr)","us_ri":"ZDA (us_ri)","us_sc":"ZDA (us_sc)","us_sd":"ZDA (us_sd)","us_tn":"ZDA (us_tn)","us_tx":"ZDA (us_tx)","us_ut":"ZDA (us_ut)","us_va":"ZDA (us_va)","us_vi":"ZDA (us_vi)","us_vt":"ZDA (us_vt)","us_wa":"ZDA (us_wa)","us_wi":"ZDA (us_wi)","us_wv":"ZDA (us_wv)","us_wy":"ZDA (us_wy)","us":"ZDA","ve":"Venezuela","vi":"Deviški otoki (ZDA)","za":"Južna Afrika"}}},"group_timezones":{"search":"Išči...","group_availability":"Razpoložljivost %{group}"},"discourse_post_event":{"notifications":{"invite_user_notification":"%{username} vas vabi na %{description}","invite_user_predefined_attendance_notification":"%{username} vas je povabil na %{description} in vam določil udeležbo","before_event_reminder":"Dogodek se bo kmalu pričel %{description}","after_event_reminder":"Dogodek je zaključen %{description}","ongoing_event_reminder":"Dogodek je v teku  %{description}"},"preview":{"more_than_one_event":"Dodaš lahko največ en dogodek."},"edit_reason":"Dogodek posodobljen","topic_title":{"starts_at":"Dogodek se bo pričel: %{date}","ended_at":"Dogodek se je zaključil: %{date}","ends_in_duration":"Bo zaključen %{duration}"},"models":{"invitee":{"status":{"unknown":"Neodločen","going":"Pridem","not_going":"Ne pridem","interested":"Mogoče pridem"}},"event":{"expired":"Končan","status":{"standalone":{"title":"Samostojni","description":"Na samostojni dogodek prijava ni možna."},"public":{"title":"Javni","description":"Na javni dogodek se lahko prijavi kdorkoli."},"private":{"title":"Zasebni","description":"Na zasebni dogodek se lahko prijavijo samo povabljenci."}}}},"event_ui":{"show_all":"Pokaži vse","participants":{"one":"%{count} udeleženec.","two":"%{count} udeleženca.","few":"%{count} udeleženci.","other":"%{count} udeležencev."},"invite":"Obvesti uporabnika","add_to_calendar":"Dodaj v koledar","send_pm_to_creator":"Pošlji ZS %{username}","edit_event":"Uredi dogodek","export_event":"Izvozi dogodek","created_by":"Ustvaril","bulk_invite":"Skupinsko vabilo","close_event":"Zapri dogodek"},"invitees_modal":{"title_invited":"Seznam potrditev","title_participated":"Seznam udeležencev","filter_placeholder":"Filtriraj uporabnike"},"bulk_invite_modal":{"text":"Uvozi iz CSV","title":"Skupinsko vabilo","success":"Datoteka je uspešno naložena. Obveščeni boste, ko bo postopek zaključen.","error":"Datoteka mora biti v CSV obliki.","confirmation_message":"Poslali boste obvestilo vsem osebam iz datoteke.","description_public":"Skupinska vabila na javne dogodke lahko vsebujejo samo imena uporabnikov.","description_private":"Skupinska vabila na zasebne dogodke lahko vsebujejo samo imena grup.","download_sample_csv":"Prenesi vzorčno CSV datoteko","send_bulk_invites":"Pošlji vabila","group_selector_placeholder":"Izberi grupo...","user_selector_placeholder":"Izberi uporabnika...","inline_title":"Ročno dodajanje vabil","csv_title":"Dodajanje vabil iz CSV"},"builder_modal":{"custom_fields":{"label":"Polja po meri","placeholder":"Neobvezno","description":"Polja po meri so določena v sistemskih nastavitvah. Z njihovo pomočjo lahko izmenjujete podatke z drugimi vtičniki."},"create_event_title":"Ustvari dogodek","update_event_title":"Uredi dogodek","confirm_delete":"Res želiš izbrisati ta dogodek?","confirm_close":"Res želiš zapreti ta dogodek?","create":"Ustvari","update":"Shrani","attach":"Ustvari dogodek","add_reminder":"Dodaj opomnik","reminders":{"label":"Opomniki"},"recurrence":{"label":"Ponavljanje","none":"Brez","every_day":"Vsak dan","every_month":"Mesečno na ta dan","every_weekday":"Vsak delavnik","every_week":"Tedensko na ta dan"},"url":{"label":"URL","placeholder":"Neobvezno"},"name":{"label":"Ime dogodka","placeholder":"Neobvezno, privzeto enako imenu dogodka"},"invitees":{"label":"Povabljene grupe"},"status":{"label":"Status"}},"invite_user_or_group":{"title":"Obvesti uporabnike oz. grupe","invite":"Pošlji"},"upcoming_events":{"title":"Prihajajoči dogodki","creator":"Organizator","status":"Status","starts_at":"Prične se ob"}},"poll":{"voters":{"one":"glasovalec","two":"glasovalca","few":"glasovalci","other":"glasovalci"},"total_votes":{"one":"vseh glasov","two":"vseh glasov","few":"vseh glasov","other":"vseh glasov"},"average_rating":"Povprečna ocena: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Glasovi so \u003cstrong\u003ejavni\u003c/strong\u003e."},"results":{"groups":{"title":"Če želite glasovati v tej anketi, morate biti član %{groups}."},"vote":{"title":"Rezultati bodo vidni na \u003cstrong\u003eglasovnici\u003c/strong\u003e."},"closed":{"title":"Rezultati bodo prikazani, ko se glasovanje \u003cstrong\u003ezapre\u003c/strong\u003e."},"staff":{"title":"Rezultati so prikazani samo \u003cstrong\u003eosebju\u003c/strong\u003e."}},"multiple":{"help":{"at_least_min_options":{"one":"Izberite vsaj \u003cstrong\u003e%{count}\u003c/strong\u003e možnost.","two":"Izberite vsaj \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti.","few":"Izberite vsaj \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti.","other":"Izberite vsaj \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti."},"up_to_max_options":{"one":"Izberite največ \u003cstrong\u003e%{count}\u003c/strong\u003e možnost.","two":"Izberite največ \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti.","few":"Izberite največ \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti.","other":"Izberite največ \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti."},"x_options":{"one":"Izberite \u003cstrong\u003e%{count}\u003c/strong\u003e možnost.","two":"Izberite \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti.","few":"Izberite \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti.","other":"Izberite \u003cstrong\u003e%{count}\u003c/strong\u003e možnosti."},"between_min_and_max_options":"Izbirate lahko med \u003cstrong\u003e%{min}\u003c/strong\u003e in \u003cstrong\u003e%{max}\u003c/strong\u003e možnostmi."}},"cast-votes":{"title":"Oddajte svoj glas","label":"Glasuj!"},"show-results":{"title":"Prikaži rezultate ankete","label":"Prikaži rezultate"},"hide-results":{"title":"Nazaj na vašo glasovnico","label":"Prikaži oddane glasove"},"group-results":{"title":"Zbiranje glasov po uporabniškem polju","label":"Pokaži razčlenitev"},"export-results":{"title":"Izvozi rezultate ankete","label":"Izvozi"},"open":{"title":"Odpri anketo","label":"Odpri","confirm":"Ali ste prepričani da hočete odpreti to anketo?"},"close":{"title":"Zapri anketo","label":"Zapri","confirm":"Ali ste prepričani da hočete zapreti to anketo?"},"automatic_close":{"closes_in":"Se zapre v \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Zaprta \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Rezultati ankete","votes":"%{count} glasov","breakdown":"Razčlenitev","percentage":"Odstotki","count":"Število"},"error_while_toggling_status":"Prišlo je do napake med spreminjanjem statusa te ankete.","error_while_casting_votes":"Prišlo je do napake med oddajo vašega glasu.","error_while_fetching_voters":"Prišlo je do napake med prikazom glasovalcev.","error_while_exporting_results":"Prišlo je do napake pri izvozu rezultatov ankete.","ui_builder":{"title":"Ustvari anketo","insert":"Vstavi anketo","help":{"options_count":"Vnesite vsaj eno možnost","invalid_values":"Najmanjša vrednost mora biti manjša od največje vrednosti.","min_step_value":"Najmanjša vrednost koraka je 1."},"poll_type":{"label":"Tip","regular":"En odgovor","multiple":"Več odgovorov","number":"Številčna ocena"},"poll_result":{"label":"Rezultati","always":"Vedno vidni","vote":"Po glasovanju","closed":"Ko se zapre","staff":"Samo osebje"},"poll_groups":{"label":"Dovoljene skupine"},"poll_chart_type":{"label":"Vrsta grafikona","bar":"Stolpični","pie":"Tortni"},"poll_config":{"max":"Največ","min":"Najmanj","step":"Korak"},"poll_public":{"label":"Pokaži glasovalce"},"poll_options":{"label":"Vnesi en glasovalno opcijo na vrstico"},"automatic_close":{"label":"Samodejno zapri anketo"}}},"chat_integration":{"settings":"Nastavitve","choose_group":"(izberite skupino)","all_categories":"(vse kategorije)","all_tags":"(vse oznake)","delete_channel":"Izbriši","edit_channel":"Uredi","test_modal":{"topic":"Tema","close":"Zapri"},"type":{"normal":"Običajno"},"filter":{"mute":"Utišano"},"rule_table":{"filter":"Filter","category":"Kategorija","tags":"Oznake","edit_rule":"Uredi","delete_rule":"Izbriši"},"edit_channel_modal":{"cancel":"Prekliči"},"edit_rule_modal":{"cancel":"Prekliči","type":"Tip","filter":"Filter","category":"Kategorija","group":"Skupina","tags":"Oznake"},"provider":{"telegram":{"param":{"name":{"title":"Polno ime"}}},"discord":{"param":{"name":{"title":"Polno ime"}}},"matrix":{"param":{"name":{"title":"Polno ime"}}},"zulip":{"param":{"subject":{"title":"Naslov"}}},"gitter":{"param":{"name":{"title":"Polno ime"}}}}}}},"en":{"js":{"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined.","other":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} users have joined."},"clear_input":"Clear input","review":{"explain":{"why":"explain why this item ended up in the queue","title":"Reviewable Scoring","min_score_visibility":"Minimum Score for Visibility","score_to_hide":"Score to Hide Post","take_action_bonus":{"name":"took action","title":"When a staff member chooses to take action the flag is given a bonus."},"user_accuracy_bonus":{"name":"user accuracy","title":"Users whose flags have been historically agreed with are given a bonus."},"trust_level_bonus":{"title":"Reviewable items created by higher trust level users have a higher score."},"type_bonus":{"name":"type bonus","title":"Certain reviewable types can be assigned a bonus by staff to make them a higher priority."}},"claim_help":{"optional":"You can claim this item to prevent others from reviewing it.","required":"You must claim items before you can review them.","claimed_by_you":"You've claimed this item and can review it.","claimed_by_other":"This item can only be reviewed by \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"claim this topic"},"unclaim":{"help":"remove this claim"},"settings":{"priorities":{"title":"Reviewable Priorities"}},"filtered_topic":"You have filtered to reviewable content in a single topic.","user":{"bio":"Bio","reject_reason":"Reason"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"},"agreed":{"one":"%{count}% agree","other":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree","other":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore","other":"%{count}% ignore"}},"filters":{"orders":{"score_asc":"Score (reverse)"},"priority":{"title":"Minimum Priority"}},"reject_reason":{"title":"Why are you rejecting this user?","send_email":"Send rejection email"}},"user":{"notification_schedule":{"title":"Notification Schedule","label":"Enable custom notification schedule","tip":"Outside of these hours you will be put in 'do not disturb' automatically.","midnight":"Midnight","none":"None","monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday","to":"to"},"desktop_notifications":{"each_browser_note":"Note: You have to change this setting on every browser you use. All notifications will be disabled when in \"do not disturb\", regardless of this setting."},"color_schemes":{"default_description":"Theme default"},"change_password":{"emoji":"lock emoji"},"second_factor_backup":{"manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"enable_prerequisites":"You must enable a primary two-factor method before generating backup codes."},"second_factor":{"extended_description":"Two-factor authentication adds extra security to your account by requiring a one-time token in addition to your password. Tokens can be generated on \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e and \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e devices.\n","enable_security_key_description":"When you have your \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003ehardware security key\u003c/a\u003e prepared, press the Register button below.\n"},"invited":{"create":"Invite","bulk_invite":{"none":"No invitations to display on this page."}}},"logs_error_rate_notice":{},"emoji_set":{"emoji_one":"JoyPixels (formerly EmojiOne)"},"category_row":{"topic_count":{"one":"%{count} topic in this category","other":"%{count} topics in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory","other":"%{name} and %{count} subcategories"},"plus_subcategories":{"one":"+ %{count} subcategory","other":"+ %{count} subcategories"}},"select_kit":{"invalid_selection_length":{"one":"Selection must be at least %{count} character.","other":"Selection must be at least %{count} characters."},"components":{"categories_admin_dropdown":{"title":"Manage categories"}}},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"blockquote_title":"Blockquote","slow_mode":{"error":"This topic is in slow mode. In order to promote thoughtful, considered discussion you may only post once every %{duration}."},"composer_actions":{"reply_as_new_group_message":{"label":"Reply as new group message","desc":"Create a new private message with the same recipients"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"}},"reload":"Reload","ignore":"Ignore"},"notifications":{"tooltip":{"high_priority":{"one":"%{count} unread high priority notification","other":"%{count} unread high priority notifications"}},"liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} others\u003c/span\u003e %{description}"},"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - completed","titles":{"bookmark_reminder":"bookmark reminder","bookmark_reminder_with_name":"bookmark reminder - %{name}","membership_request_consolidated":"new membership requests","reaction":"new reaction","votes_released":"Vote was released"}},"search":{"search_button":"Search","context":{"tag":"Search the #%{tag} tag"},"advanced":{"filters":{"created":"I created"}}},"topics":{"none":{"educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}}},"topic":{"slow_mode_update":{"enabled_until":"(Optional) Enabled until:"},"publish_page":{"slug":"Slug","publish_url":"Your page has been published at:","topic_published":"Your topic has been published at:","preview_url":"Your page will be published at:","invalid_slug":"Sorry, you can't publish this page.","unpublish":"Unpublish","unpublished":"Your page has been unpublished and is no longer accessible.","publishing_settings":"Publishing Settings"},"change_owner":{"instructions_without_old_user":{"one":"Please choose a new owner for the post","other":"Please choose a new owner for the %{count} posts"}}},"post":{"quote_share":"Share","unknown_user":"(unknown/deleted user)","filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","errors":{"too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."}},"abandon_edit":{"confirm":"Are you sure you want to discard your changes?","yes_value":"Yes, discard edit"},"abandon":{"title":"Abandon Draft"},"controls":{"publish_page":"Page Publishing","delete_topic_confirm_modal":"This topic currently has over %{minViews} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic"},"actions":{"people":{"like":{"one":"liked this","other":"liked this"},"read":{"one":"read this","other":"read this"},"read_capped":{"one":"and %{count} other read this","other":"and %{count} others read this"}}},"revisions":{"controls":{"revert":"Revert to revision %{revision}"}},"bookmarks":{"create":"Create bookmark","edit":"Edit bookmark","updated":"Updated","name_placeholder":"What is this bookmark for?","set_reminder":"Remind me","actions":{"delete_bookmark":{"name":"Delete bookmark","description":"Removes the bookmark from your profile and stops all reminders for the bookmark"},"edit_bookmark":{"name":"Edit bookmark","description":"Edit the bookmark name or change the reminder date and time"}}}},"category":{"back":"Back to category","tags_tab_description":"Tags and tag groups specified above will only be available in this category and other categories that also specify them. They won't be available for use in other categories.","manage_tag_groups_link":"Manage tag groups","tag_group_selector_placeholder":"(Optional) Tag group","required_tag_group_description":"Require new topics to have tags from a tag group:","min_tags_from_required_group_label":"Num Tags:","required_tag_group_label":"Tag group:","read_only_banner":"Banner text when a user cannot create a topic in this category:","default_list_filter":"Default List Filter:","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","list_filters":{"all":"all topics","none":"no subcategories"},"colors_disabled":"You can’t select colors because you have a category style of none.","location_settings_label":"Locations"},"flagging":{"take_action":"Take Action...","take_action_options":{"default":{"title":"Take Action","details":"Reach the flag threshold immediately, rather than waiting for more community flags"},"suspend":{"title":"Suspend User","details":"Reach the flag threshold, and suspend the user"},"silence":{"details":"Reach the flag threshold, and silence the user"}}},"filters":{"top":{"other_periods":"see top:"}},"tagging":{"info":"Info"},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"do_not_disturb":{"set_schedule":"Set a notification schedule"},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"presence":{"replying":{"one":"replying","other":"replying"},"editing":{"one":"editing","other":"editing"}},"discourse_local_dates":{"create":{"form":{"format_description":"Format used to display the date to the user. Use Z to show the offset and zz for the timezone name."}}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","example":"Welcome to Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Date/Time inputs"},"font_scale":{"title":"Font System"},"colors":{"title":"Colors"},"icons":{"title":"Icons","full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"categories":{"title":"Categories"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation":{"title":"Navigation"},"navigation_bar":{"title":"Navigation Bar"},"navigation_stacked":{"title":"Navigation Stacked"},"categories_list":{"title":"Categories List"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_statuses":{"title":"Topic Statuses"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_timer_info":{"title":"Topic Timers"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"post":{"title":"Post"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"suggested_topics":{"title":"Suggested Topics"},"post_menu":{"title":"Post Menu"},"modal":{"title":"Modal","header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}},"location":{"geo":{"hide_map":"Hide Map"}},"discourse_calendar":{"region":{"none":"None"}},"poll":{"ui_builder":{"poll_title":{"label":"Title (optional)"}}},"admin":{"site_settings":{"categories":{"chat_integration":"Chat Integrations"}}},"chat_integration":{"menu_title":"Chat Integrations","no_providers":"You need to enable some providers in the plugin settings","channels_with_errors":"Some channels for this provider failed last time messages were sent. Click the error icon(s) to learn more.","channel_exception":"An unknown error occured when a message was last sent to this channel.","group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","create_rule":"Create Rule","create_channel":"Create Channel","test_channel":"Test","channel_delete_confirm":"Are you sure you want to delete this channel? All associated rules will be deleted.","test_modal":{"title":"Send a test message","send":"Send Test Message","error":"An unknown error occured while sending the message. Check the site logs for more information.","success":"Message sent successfully"},"type":{"group_message":"Group Message","group_mention":"Group Mention"},"filter":{"follow":"First post only","watch":"All posts and replies","thread":"All posts with threaded replies"},"edit_channel_modal":{"title":"Edit Channel","save":"Save Channel","provider":"Provider","channel_validation":{"ok":"Valid","fail":"Invalid format"}},"edit_rule_modal":{"title":"Edit Rule","save":"Save Rule","provider":"Provider","channel":"Channel","instructions":{"type":"Change the type to trigger notifications for group messages or mentions","filter":"Notification level. Mute overrides other matching rules","category":"This rule will only apply to topics in the specified category","group":"This rule will apply to posts referencing this group","tags":"If specified, this rule will only apply to topics which have at least one of these tags"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"action_prohibited":"The bot does not have permission to post to that channel","channel_not_found":"The specified channel does not exist on slack"}},"telegram":{"title":"Telegram","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Telegram."},"chat_id":{"title":"Chat ID","help":"A number given to you by the bot, or a broadcast channel identifier in the form @channelname"}},"errors":{"channel_not_found":"The specified channel does not exist on Telegram","forbidden":"The bot does not have permission to post to this channel"}},"discord":{"title":"Discord","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Discord."},"webhook_url":{"title":"Webhook URL","help":"The webhook URL created in your Discord server settings"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"channel_not_found":"The specified channel does not exist on Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Matrix."},"room_id":{"title":"Room ID","help":"The 'private identifier' for the room. It should look something like !abcdefg:matrix.org"}},"errors":{"unknown_token":"Access token is invalid","unknown_room":"Room ID is invalid"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"The name of the Zulip stream the message should be sent to. e.g. 'general'"},"subject":{"help":"The subject that these messages sent by the bot should be given"}},"errors":{"does_not_exist":"That stream does not exist on Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"invalid_channel":"That channel does not exist on Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"help":"A Gitter room's name e.g. gitterHQ/services."},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new integration in a Gitter room."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow Token","help":"The flow token provided after creating a source for a flow into which you want to send messages."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Name","help":"A name for the channel (only shown in the Discourse admin interface)"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new webhook"}}}}}}}};
I18n.locale = 'sl';
I18n.pluralizationRules.sl = MessageFormat.locale.sl;
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
//! locale : Slovenian [sl]
//! author : Robert Sedovšek : https://github.com/sedovsek

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    function processRelativeTime(number, withoutSuffix, key, isFuture) {
        var result = number + ' ';
        switch (key) {
            case 's':
                return withoutSuffix || isFuture
                    ? 'nekaj sekund'
                    : 'nekaj sekundami';
            case 'ss':
                if (number === 1) {
                    result += withoutSuffix ? 'sekundo' : 'sekundi';
                } else if (number === 2) {
                    result += withoutSuffix || isFuture ? 'sekundi' : 'sekundah';
                } else if (number < 5) {
                    result += withoutSuffix || isFuture ? 'sekunde' : 'sekundah';
                } else {
                    result += 'sekund';
                }
                return result;
            case 'm':
                return withoutSuffix ? 'ena minuta' : 'eno minuto';
            case 'mm':
                if (number === 1) {
                    result += withoutSuffix ? 'minuta' : 'minuto';
                } else if (number === 2) {
                    result += withoutSuffix || isFuture ? 'minuti' : 'minutama';
                } else if (number < 5) {
                    result += withoutSuffix || isFuture ? 'minute' : 'minutami';
                } else {
                    result += withoutSuffix || isFuture ? 'minut' : 'minutami';
                }
                return result;
            case 'h':
                return withoutSuffix ? 'ena ura' : 'eno uro';
            case 'hh':
                if (number === 1) {
                    result += withoutSuffix ? 'ura' : 'uro';
                } else if (number === 2) {
                    result += withoutSuffix || isFuture ? 'uri' : 'urama';
                } else if (number < 5) {
                    result += withoutSuffix || isFuture ? 'ure' : 'urami';
                } else {
                    result += withoutSuffix || isFuture ? 'ur' : 'urami';
                }
                return result;
            case 'd':
                return withoutSuffix || isFuture ? 'en dan' : 'enim dnem';
            case 'dd':
                if (number === 1) {
                    result += withoutSuffix || isFuture ? 'dan' : 'dnem';
                } else if (number === 2) {
                    result += withoutSuffix || isFuture ? 'dni' : 'dnevoma';
                } else {
                    result += withoutSuffix || isFuture ? 'dni' : 'dnevi';
                }
                return result;
            case 'M':
                return withoutSuffix || isFuture ? 'en mesec' : 'enim mesecem';
            case 'MM':
                if (number === 1) {
                    result += withoutSuffix || isFuture ? 'mesec' : 'mesecem';
                } else if (number === 2) {
                    result += withoutSuffix || isFuture ? 'meseca' : 'mesecema';
                } else if (number < 5) {
                    result += withoutSuffix || isFuture ? 'mesece' : 'meseci';
                } else {
                    result += withoutSuffix || isFuture ? 'mesecev' : 'meseci';
                }
                return result;
            case 'y':
                return withoutSuffix || isFuture ? 'eno leto' : 'enim letom';
            case 'yy':
                if (number === 1) {
                    result += withoutSuffix || isFuture ? 'leto' : 'letom';
                } else if (number === 2) {
                    result += withoutSuffix || isFuture ? 'leti' : 'letoma';
                } else if (number < 5) {
                    result += withoutSuffix || isFuture ? 'leta' : 'leti';
                } else {
                    result += withoutSuffix || isFuture ? 'let' : 'leti';
                }
                return result;
        }
    }

    var sl = moment.defineLocale('sl', {
        months: 'januar_februar_marec_april_maj_junij_julij_avgust_september_oktober_november_december'.split(
            '_'
        ),
        monthsShort: 'jan._feb._mar._apr._maj._jun._jul._avg._sep._okt._nov._dec.'.split(
            '_'
        ),
        monthsParseExact: true,
        weekdays: 'nedelja_ponedeljek_torek_sreda_četrtek_petek_sobota'.split('_'),
        weekdaysShort: 'ned._pon._tor._sre._čet._pet._sob.'.split('_'),
        weekdaysMin: 'ne_po_to_sr_če_pe_so'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'H:mm',
            LTS: 'H:mm:ss',
            L: 'DD. MM. YYYY',
            LL: 'D. MMMM YYYY',
            LLL: 'D. MMMM YYYY H:mm',
            LLLL: 'dddd, D. MMMM YYYY H:mm',
        },
        calendar: {
            sameDay: '[danes ob] LT',
            nextDay: '[jutri ob] LT',

            nextWeek: function () {
                switch (this.day()) {
                    case 0:
                        return '[v] [nedeljo] [ob] LT';
                    case 3:
                        return '[v] [sredo] [ob] LT';
                    case 6:
                        return '[v] [soboto] [ob] LT';
                    case 1:
                    case 2:
                    case 4:
                    case 5:
                        return '[v] dddd [ob] LT';
                }
            },
            lastDay: '[včeraj ob] LT',
            lastWeek: function () {
                switch (this.day()) {
                    case 0:
                        return '[prejšnjo] [nedeljo] [ob] LT';
                    case 3:
                        return '[prejšnjo] [sredo] [ob] LT';
                    case 6:
                        return '[prejšnjo] [soboto] [ob] LT';
                    case 1:
                    case 2:
                    case 4:
                    case 5:
                        return '[prejšnji] dddd [ob] LT';
                }
            },
            sameElse: 'L',
        },
        relativeTime: {
            future: 'čez %s',
            past: 'pred %s',
            s: processRelativeTime,
            ss: processRelativeTime,
            m: processRelativeTime,
            mm: processRelativeTime,
            h: processRelativeTime,
            hh: processRelativeTime,
            d: processRelativeTime,
            dd: processRelativeTime,
            M: processRelativeTime,
            MM: processRelativeTime,
            y: processRelativeTime,
            yy: processRelativeTime,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 7, // The week that contains Jan 7th is the first week of the year.
        },
    });

    return sl;

})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

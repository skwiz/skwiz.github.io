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

// Merge several hash options, checking if value is set before
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["el"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.el = function ( n ) {
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

I18n.translations = {"el":{"js":{"number":{"format":{"separator":",","delimiter":"."},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Byte","other":"Bytes"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}χιλ.","millions":"%{number}εκατ."}},"dates":{"time":"HH:mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH: mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"DD MMM","full_no_year_no_time":"Do MMMM","long_with_year":"D MMM YYYY HH:mm","long_with_year_no_time":"D MMM YYYY","full_with_year_no_time":"D MMMM YYYY","long_date_with_year":"D MMM 'YY LT","long_date_without_year":"MMM D, LT","long_date_with_year_without_time":"MMM D, 'YY","long_date_without_year_with_linebreak":"MMM D \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"MMM D, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} πριν","tiny":{"half_a_minute":"\u003c 1λ","less_than_x_seconds":{"one":"\u003c %{count} δ","other":"\u003c %{count} δ"},"x_seconds":{"one":"%{count} δ","other":"%{count} δ"},"less_than_x_minutes":{"one":"\u003c %{count} λ","other":"\u003c %{count}λ"},"x_minutes":{"one":"%{count} λ","other":"%{count} λ"},"about_x_hours":{"one":"%{count}ω","other":"%{count}ω"},"x_days":{"one":"%{count} η","other":"%{count} η"},"x_months":{"one":"%{count} μην","other":"%{count} μην"},"about_x_years":{"one":"%{count}χ","other":"%{count}χ"},"over_x_years":{"one":"\u003e %{count}χ","other":"\u003e %{count}χ"},"almost_x_years":{"one":"%{count}χ","other":"%{count}χ"},"date_month":"DD MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} λ","other":"%{count} λ"},"x_hours":{"one":"%{count} ω","other":"%{count} ω"},"x_days":{"one":"%{count} ημ","other":"%{count} ημ"},"date_year":"MMM D, 'YY"},"medium_with_ago":{"x_minutes":{"one":"πριν από %{count} λεπτό ","other":"πριν από %{count} λεπτά"},"x_hours":{"one":"πριν από %{count} ώρα","other":"πριν από %{count} ώρες"},"x_days":{"one":"πριν από %{count} ημέρα","other":"πριν από %{count} ημέρες"},"x_months":{"one":"πριν %{count} μήνα","other":"πριν %{count} μήνες"},"x_years":{"one":"πριν από %{count} χρόνο","other":"πριν από %{count} χρόνια"}},"later":{"x_days":{"one":"%{count} ημέρα μετά","other":"%{count} ημέρες μετά"},"x_months":{"one":"%{count} μήνα μετά","other":"%{count} μήνες μετά"},"x_years":{"one":"%{count} χρόνο μετά","other":"%{count} χρόνια μετά"}},"previous_month":"Προηγούμενος μήνας","next_month":"Επόμενος μήνας","placeholder":"ημερομηνία"},"share":{"topic_html":"Θέμα: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"ανάρτηση #%{postNumber}","close":"κλείσιμο","twitter":"Κοινοποιήστε στο Twitter","facebook":"Μοιραστείτε στο Facebook","email":"Αποστολή μέσω email","url":"Αντιγραφή και κοινοποίηση διεύθυνσης URL"},"action_codes":{"public_topic":"έκανε αυτό το θέμα δημόσιο στις %{when}","private_topic":"έκανε αυτό το θέμα ένα προσωπικό μήνυμα στις %{when}","split_topic":"διαχώρισε αυτό το θέμα στις %{when}","invited_user":"προσκάλεσε τον/την %{who} στις %{when}","invited_group":"προσκάλεσε την ομάδα %{who} στις %{when}","user_left":"%{who} αφαιρέθηκαν από αυτό το μήνυμα στις %{when}","removed_user":"αφαίρεσε τον χρήστη %{who} στις %{when}","removed_group":"αφαίρεσε την ομάδα %{who} στις %{when}","autobumped":"ωθήθηκε αυτόματα στις %{when}","autoclosed":{"enabled":"έκλεισε στις %{when}","disabled":"άνοιξε στις %{when}"},"closed":{"enabled":"έκλεισε στις %{when}","disabled":"άνοιξε στις %{when}"},"archived":{"enabled":"αρχειοθετήθηκε στις %{when}","disabled":"βγήκε από το αρχείο στις %{when}"},"pinned":{"enabled":"καρφιτσώθηκε στις %{when}","disabled":"ξεκαρφιτσώθηκε στις %{when}"},"pinned_globally":{"enabled":"καρφιτσώθηκε καθολικά στις %{when}","disabled":"ξεκαρφιτσώθηκε στις %{when}"},"visible":{"enabled":"ορατό στις %{when}","disabled":"κρυφό στις %{when}"},"banner":{"enabled":"το έκανε ανακοίνωση στις %{when}. Θα εμφανίζεται στην κορυφή κάθε σελίδας μέχρι να απορριφθεί από τον χρήστη.","disabled":"το αφαίρεσε από ανακοίνωση στις %{when}. Δε θα εμφανίζεται πλέον στην κορυφή κάθε σελίδας."},"forwarded":"προώθησε το παραπάνω email"},"topic_admin_menu":"ρυθμίσεις θέματος","wizard_required":"Καλώς ήλθατε στο νέο σας Discourse! Ας αρχίσουμε με τον \u003ca href='%{url}' data-auto-route='true'\u003eοδηγό εγκατάστασης\u003c/a\u003e ✨","emails_are_disabled":"Όλα τα εξερχόμενα emails έχουν απενεργοποιηθεί καθολικά από κάποιον διαχειριστή. Δε θα σταλεί καμία ειδοποίηση email.","software_update_prompt":{"dismiss":"Απόρριψη"},"bootstrap_mode_disabled":"Η λειτουργία bootstrap θα απενεργοποιηθεί εντός 24 ωρών.","themes":{"default_description":"Προεπιλογή","broken_theme_alert":"Ο ιστότοπός σας ενδέχεται να μη λειτουργεί επειδή το θέμα/συστατικό %{theme} έχει σφάλματα. Απενεργοποιήστε το στο %{path}."},"s3":{"regions":{"ap_northeast_1":"Ασία Ειρηνικός (Τόκιο)","ap_northeast_2":"Ασία Ειρηνικός (Σεούλ)","ap_south_1":"Ασία Ειρηνικός (Mumbai)","ap_southeast_1":"Ασία Ειρηνικός (Σιγκαπούρη)","ap_southeast_2":"Ασία Ειρηνικός (Σίδνεϊ)","ca_central_1":"Καναδάς (Κεντρική)","cn_north_1":"Κίνα (Πεκίνο)","cn_northwest_1":"Κίνα (Ningxia)","eu_central_1":"ΕΕ (Φρανκφούρτη)","eu_north_1":"ΕΕ (Στοκχόλμη)","eu_west_1":"ΕΕ (Ιρλανδία)","eu_west_2":"ΕΕ (Λονδίνο)","eu_west_3":"ΕΕ (Παρίσι)","sa_east_1":"Νότια Αμερική (Σάο Πάολο)","us_east_1":"Ανατολικές ΗΠΑ (Β. Βιρτζίνια)","us_east_2":"Ανατολικές ΗΠΑ (Οχάιο)","us_gov_east_1":"AWS GovCloud (US-East)","us_gov_west_1":"AWS GovCloud (US-West)","us_west_1":"Δυτικές ΗΠΑ (Β. Καλιφόρνια)","us_west_2":"Δυτικές ΗΠΑ (Όρεγκον)"}},"edit":"επεξεργασία του τίτλου και της κατηγορίας αυτού του θέματος","expand":"Επέκταση","not_implemented":"Αυτή η λειτουργία δεν έχει υλοποιηθεί ακόμα, συγγνώμη!","no_value":"Όχι","yes_value":"Ναι","submit":"Υποβολή","generic_error":"Λυπάμαι, προέκυψε κάποιο σφάλμα.","generic_error_with_reason":"Προέκυψε ένα σφάλμα: %{error}","sign_up":"Εγγραφή","log_in":"Σύνδεση","age":"Ηλικία","joined":"Έγινε μέλος","admin_title":"Διαχειριστής","show_more":"περισσότερα","show_help":"επιλογές","links":"Σύνδεσμοι","links_lowercase":{"one":"Σύνδεσμος","other":"σύνδεσμοι"},"faq":"Συχνές ερωτήσεις","guidelines":"Οδηγίες","privacy_policy":"Πολιτική ιδιωτικότητας","privacy":"Ιδιωτικότητα","tos":"Όροι χρήσης","rules":"Κανόνες","conduct":"Κώδικας δεοντολογίας","mobile_view":"Προβολή κινητού","desktop_view":"Προβολή υπολογιστή","or":"ή","now":"μόλις τώρα","read_more":"διαβάστε περισσότερα","more":"Περισσότερα","x_more":{"one":"%{count} Περισσότερο","other":"%{count} Περισσότερο"},"never":"ποτέ","every_30_minutes":"κάθε 30 λεπτά","every_hour":"κάθε ώρα","daily":"καθημερινά","weekly":"κάθε εβδομάδα","every_month":"κάθε μήνα","every_six_months":"κάθε έξι μήνες","max_of_count":"μέγιστο %{count}","character_count":{"one":"%{count} χαρακτήρα","other":"%{count} χαρακτήρες"},"related_messages":{"title":"Σχετικά μηνύματα","see_all":"Δείτε \u003ca href=\"%{path}\"\u003eόλα τα μηνύματα\u003c/a\u003e από @%{username}..."},"suggested_topics":{"title":"Προτεινόμενα θέματα","pm_title":"Προτεινόμενα μηνύματα"},"about":{"simple_title":"Σχετικά","title":"Σχετικά με %{title}","stats":"Στατιστικά ιστότοπου","our_admins":"Οι διαχειριστές μας","our_moderators":"Οι συντονιστές μας","moderators":"Συντονιστές","stat":{"all_time":"Συνολικά"},"like_count":"Μου αρέσει","topic_count":"Θέματα","post_count":"Αναρτήσεις","user_count":"Χρήστες","active_user_count":"Ενεργοί χρήστες","contact":"Επικοινωνήστε μαζί μας","contact_info":"Σε περίπτωση που προκύψει κάποιο κρίσιμο πρόβλημα ή κάποιο επείγον θέμα που αφορά αυτόν τον ιστότοπο, παρακαλούμε να επικοινωνήσετε μαζί μας στο %{contact_info}."},"bookmarked":{"title":"Σελιδοδείκτης","clear_bookmarks":"Καθαρισμός σελιδοδεικτών","help":{"bookmark":"Πάτήστε εδώ για να μπει σελιδοδείκτης στην πρώτη ανάρτηση του θέματος.","unbookmark":"Πατήστε εδώ για να αφαιρεθούν όλοι οι σελιδοδείκτες από αυτό το θέμα."}},"bookmarks":{"created":"Έχετε προσθέσει σελιδοδείκτη σε αυτήν την ανάρτηση. %{name}","not_bookmarked":"προσθέστε σελιδοδείκτη σε αυτήν την ανάρτηση","created_with_reminder":"Έχετε προσθέσει σελιδοδείκτη σε αυτήν την ανάρτηση με υπενθύμιση %{date}. %{name}","remove":"Αφαίρεση σελιδοδείκτη","delete":"Διαγραφή σελιδοδείκτη","confirm_delete":"Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτόν τον σελιδοδείκτη; Η υπενθύμιση θα διαγραφεί επίσης.","confirm_clear":"Είστε βέβαιοι ότι θέλετε να διαγράψετε όλους τους σελιδοδείκτες σας από αυτό το θέμα;","save":"Αποθήκευση","no_timezone":"Δεν έχετε ορίσει ζώνη ώρας ακόμη. Δε θα μπορείτε να ορίσετε υπενθυμίσεις. Ρυθμίστε κάποια \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eστο προφίλ σας\u003c/a\u003e.","invalid_custom_datetime":"Η ημερομηνία και η ώρα που δώσατε δεν είναι έγκυρη, παρακαλώ δοκιμάστε ξανά.","list_permission_denied":"Δεν έχετε άδεια για την προβολή των σελιδοδεικτών αυτού του χρήστη.","no_user_bookmarks":"Δεν έχετε σελιδοδείκτες. Οι σελιδοδείκτες σας επιτρέπουν να ανατρέξετε γρήγορα σε συγκεκριμένες αναρτήσεις.","auto_delete_preference":{"label":"Αυτόματη διαγραφή","never":"Ποτέ","when_reminder_sent":"Μόλις αποσταλεί η υπενθύμιση","on_owner_reply":"Αφού απαντήσω σε αυτό το θέμα"},"search_placeholder":"Αναζήτηση σελιδοδεικτών με βάση το όνομα, τον τίτλο θέματος ή το περιεχόμενο δημοσίευσης","search":"Αναζήτηση","reminders":{"today_with_time":"σήμερα στις %{time}","tomorrow_with_time":"αύριο στις %{time}","at_time":"στις %{date_time}","existing_reminder":"Έχετε ορίσει μια υπενθύμιση για αυτόν τον σελιδοδείκτη που θα σταλεί στις %{at_date_time}"}},"copy_codeblock":{"copied":"αντιγράφηκε!"},"drafts":{"resume":"Βιογραφικό","remove":"Αφαίρεση","new_topic":"Νέο προσχέδιο θέματος","topic_reply":"Προσχέδιο απάντησης","abandon":{"yes_value":"Απόρριψη"}},"topic_count_latest":{"one":"Δείτε %{count} νέο ή ενημερωμένο θέμα","other":"Δείτε %{count} νέα ή ενημερωμένα θέματα"},"topic_count_unread":{"one":"%{count} μη αναγνωσμένο θέμα","other":"Δείτε %{count} μη αναγνωσμένα θέματα"},"topic_count_new":{"one":"Δείτε %{count} νέο θέμα","other":"Δείτε %{count} νέα θέματα"},"preview":"προεπισκόπιση","cancel":"ακύρωση","save":"Αποθήκευση αλλαγών","saving":"Αποθήκευση...","saved":"Αποθηκεύτηκε!","upload":"Επιφόρτωση","uploading":"Επιφόρτωση...","uploading_filename":"Επιφόρτωση: %{filename}...","clipboard":"πρόχειρο","uploaded":"Επιφορτώθηκε!","pasting":"Επικόλληση ...","enable":"Ενεργοποίηση","disable":"Απενεργοποίηση","continue":"Συνεχίστε","undo":"Αναίρεση","revert":"Επαναφορά","failed":"Απέτυχε","switch_to_anon":"Έναρξη Κατάστασης Ανωνυμίας","switch_from_anon":"Τερματισμός Κατάστασης Ανωνυμίας","banner":{"close":"Απόρριψη αυτής της ανακοίνωσης.","edit":"Επεξεργασία αυτής της ανακοίνωσης \u003e\u003e"},"pwa":{"install_banner":"Θέλετε να \u003ca href\u003eεγκαταστήσετε %{title} σε αυτήν τη συσκευή;\u003c/a\u003e"},"choose_topic":{"none_found":"Δεν βρέθηκαν νήματα.","title":{"search":"Αναζητήστε ένα θέμα","placeholder":"πληκτρολογήστε τον τίτλο του θέματος, url ή id εδώ"}},"choose_message":{"none_found":"Δε βρέθηκαν αποτελέσματα.","title":{"search":"Αναζήτηση μηνύματος","placeholder":"πληκτρολογήστε τον τίτλο του μηνύματος, url ή id εδώ"}},"review":{"order_by":"Ταξινόμηση κατά","in_reply_to":"απαντώντας στο","explain":{"why":"εξηγήστε γιατί αυτό το στοιχείο κατέληξε στην ουρά","title":"Αναθεωρήσιμη βαθμολογία","formula":"Τύπος","subtotal":"Μερικό σύνολο","total":"Σύνολο","min_score_visibility":"Ελάχιστη βαθμολογία για προβολή","score_to_hide":"Βαθμολογία για απόκρυψη ανάρτησης","take_action_bonus":{"name":"ανέλαβε δράση","title":"Όταν ένα μέλος του προσωπικού επιλέγει να αναλάβει δράση, η σημαία λαμβάνει ένα μπόνους."},"user_accuracy_bonus":{"name":"ακρίβεια χρήστη","title":"Στους χρήστες των οποίων οι σημαίες έχουν συμφωνηθεί ιστορικά, δίνεται ένα μπόνους."},"trust_level_bonus":{"name":"επίπεδο εμπιστοσύνης","title":"Τα αναθεωρήσιμα στοιχεία που δημιουργούνται από χρήστες υψηλότερου επιπέδου εμπιστοσύνης έχουν υψηλότερη βαθμολογία."},"type_bonus":{"name":"τύπος μπόνους","title":"Ορισμένοι τύποι που μπορούν να αναθεωρηθούν μπορούν να λάβουν ένα μπόνους από το προσωπικό για να τους δώσουν υψηλότερη προτεραιότητα."}},"claim_help":{"optional":"Μπορείτε να υποβάλετε αξίωση για αυτό το στοιχείο για να αποτρέψετε την αξιολόγηση από άλλους.","required":"Πρέπει να διεκδικήσετε στοιχεία για να μπορέσετε να τα ελέγξετε.","claimed_by_you":"Έχετε διεκδικήσει αυτό το στοιχείο και μπορείτε να το ελέγξετε.","claimed_by_other":"Αυτό το στοιχείο μπορεί να αναθεωρηθεί μόνο από τον/την \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"διεκδικήστε αυτό το θέμα"},"unclaim":{"help":"καταργήστε αυτήν την αξίωση"},"awaiting_approval":"Αναμονή έγκρισης","delete":"Σβήσιμο","settings":{"saved":"Αποθηκεύτηκε! ","save_changes":"Αποθήκευση Αλλαγών","title":"Ρυθμίσεις","priorities":{"title":"Αναθεωρήσιμες προτεραιότητες"}},"moderation_history":"Ιστορικό εποπτείας","view_all":"Προβολή Όλων","grouped_by_topic":"Ομαδοποίηση ανά θέμα","none":"Δεν υπάρχουν στοιχεία για έλεγχο.","view_pending":"εκκρεμεί προβολή","topic_has_pending":{"one":"Αυτό το θέμα έχει \u003cb\u003e%{count}\u003c/b\u003e ανάρτηση εν αναμονή έγκρισης","other":"Αυτό το θέμα έχει \u003cb\u003e%{count}\u003c/b\u003e αναρτήσεις εν αναμονή έγκρισης"},"title":"Ανασκόπηση","topic":"Νήμα:","filtered_topic":"Έχετε φιλτράρει σε περιεχόμενο με δυνατότητα ελέγχου σε ένα μόνο θέμα.","filtered_user":"Χρήστης","filtered_reviewed_by":"Αναθεωρήθηκε από","show_all_topics":"εμφάνιση όλων των θεμάτων","deleted_post":"(η ανάρτηση διαγράφηκε)","deleted_user":"(ο χρήστης διαγράφηκε)","user":{"bio":"Βιογραφικό","website":"Website","username":"Όνομα Χρήστη","email":"Διεύθυνση Email","name":"Όνομα","fields":"Πεδία","reject_reason":"Αιτία"},"user_percentage":{"agreed":{"one":"%{count} συμφωνεί","other":"%{count} συμφωνούν"},"disagreed":{"one":"%{count} διαφωνεί","other":"%{count} διαφωνούν"},"ignored":{"one":"%{count} αγνοεί","other":"%{count} αγνοούν"}},"topics":{"topic":"Νήμα","reviewable_count":"Άθροισμα","reported_by":"Αναφέρθηκε από","deleted":"[Το θέμα διαγράφηκε]","original":"(αρχικό θέμα)","details":"λεπτομέρειες","unique_users":{"one":"%{count} χρήστης","other":"%{count} χρήστες"}},"replies":{"one":"%{count} απάντηση","other":"%{count} απαντήσεις"},"edit":"Επεξεργασία","save":"Αποθήκευση","cancel":"Άκυρο","new_topic":"Η έγκριση αυτού του στοιχείου θα δημιουργήσει ένα νέο θέμα","filters":{"all_categories":"(όλες οι κατηγορίες)","type":{"title":"Τύπος","all":"(όλοι οι τύποι)"},"minimum_score":"Ελάχιστη βαθμολογία:","refresh":"Ανανέωση ","status":"Κατάσταση","category":"Κατηγορία","orders":{"score":"Βαθμολογία","score_asc":"Βαθμολογία (αντίστροφα)","created_at":"Δημιουργήθηκε στις","created_at_asc":"Δημιουργήθηκε στις (αντίστροφα)"},"priority":{"title":"Ελάχιστη προτεραιότητα","any":"(οποιοδήποτε)","low":"Χαμηλή","medium":"Μεσαία","high":"Υψηλή"}},"conversation":{"view_full":"δείτε την πλήρη συνομιλία"},"scores":{"about":"Αυτή η βαθμολογία υπολογίζεται με βάση το επίπεδο εμπιστοσύνης του αναφέροντα, την ακρίβεια των προηγούμενων αναφορών του και την προτεραιότητα του αντικειμένου που αναφέρεται.","score":"Βαθμολογία","date":"Ημερομηνία","type":"Τύπος","status":"Κατάσταση","submitted_by":"Υποβλήθηκε από","reviewed_by":"Αναθεωρήθηκε από"},"statuses":{"pending":{"title":"Εκκρεμή"},"approved":{"title":"Εγκρίθηκε "},"rejected":{"title":"Απορρίφθηκε"},"ignored":{"title":"Αγνοήθηκε "},"deleted":{"title":"Διαγράφηκε"},"reviewed":{"title":"(όλα αναθεωρημένα)"},"all":{"title":"(τα πάντα)"}},"types":{"reviewable_flagged_post":{"title":"Επισημασμένη ανάρτηση","flagged_by":"Επισήμανση από"},"reviewable_queued_topic":{"title":"Θέμα σε ουρά"},"reviewable_queued_post":{"title":"Ανάρτηση σε ουρά"},"reviewable_user":{"title":"Χρήστης"},"reviewable_post":{"title":"Ανάρτηση"}},"approval":{"title":"Απαιτείται Έγκριση Ανάρτησης","description":"Λάβαμε την ανάρτησή σου, αλλά πρέπει πρώτα να εγκριθεί από έναν συντονιστή πριν εμφανιστεί. Παρακαλώ περιμένετε.","pending_posts":{"one":"Έχετε \u003cstrong\u003e%{count}\u003c/strong\u003e ανάρτηση σε εκκρεμότητα.","other":"Έχετε \u003cstrong\u003e%{count}\u003c/strong\u003e αναρτήσεις σε εκκρεμότητα."},"ok":"OK"},"example_username":"όνομα χρήστη"},"relative_time_picker":{"days":{"one":"ημέρα","other":"ημέρες"}},"time_shortcut":{"later_today":"Αργότερα σήμερα","next_business_day":"Επόμενη εργάσιμη ημέρα","tomorrow":"Αύριο","later_this_week":"Αργότερα αυτήν την εβδομάδα","this_weekend":"Αυτό το Σαββατοκύριακο","start_of_next_business_week":"Τη Δευτέρα","start_of_next_business_week_alt":"Την επόμενη Δευτέρα","next_month":"Τον άλλο μήνα","custom":"Προσαρμοσμένη ημερομηνία και ώρα"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e ανάρτησε \u003ca href='%{topicUrl}'\u003eτο νήμα \u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eΑνάρτησες\u003c/a\u003e αυτό \u003ca href='%{topicUrl}'\u003eτο νήμα\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e απάντησε στο \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eΑπάντησες\u003c/a\u003e στο \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e απάντησε στο \u003ca href='%{topicUrl}'\u003eνήμα\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eΑπάντησες\u003c/a\u003e στο \u003ca href='%{topicUrl}'\u003eνήμα\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e ανάφερε τον/την \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e ανάφερε \u003ca href='%{user2Url}'\u003eεσένα\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eΑνάφερες\u003c/a\u003e τον/την \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Αναρτήθηκε από τον/την \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Αναρτήθηκε από \u003ca href='%{userUrl}'\u003eεσένα\u003c/a\u003e","sent_by_user":"Στάλθηκε από τον/την \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Στάλθηκε από \u003ca href='%{userUrl}'\u003eεσένα\u003c/a\u003e"},"directory":{"username":"Όνομα Χρήστη","filter_name":"φιλτράρισμα με βάση το όνομα χρήστη","title":"Χρήστες","likes_given":"Δόθηκαν","likes_received":"Λήφθησαν","topics_entered":"Προβλήθηκαν","topics_entered_long":"Προβεβλημένα Νήματα","time_read":"Χρόνος Ανάγνωσης","topic_count":"Νήματα","topic_count_long":"Δημιουργημένα Νήματα","post_count":"Απαντήσεις","post_count_long":"Αναρτημένες Απαντήσεις","no_results":"Δεν βρέθηκαν αποτελέσματα.","days_visited":"Επισκέψεις","days_visited_long":"Ημέρες Επίσκεψης","posts_read":"Διαβασμένο","posts_read_long":"Διαβασμένες Αναρτήσεις","last_updated":"Τελευταία ενημέρωση:","total_rows":{"one":"%{count} χειριστής","other":"%{count} χρήστες"},"edit_columns":{"save":"Αποθήκευση","reset_to_default":"Επαναφορά στο προεπιλεγμένο"},"group":{"all":"όλες οι ομάδες"}},"group_histories":{"actions":{"change_group_setting":"Αλλαγή ρυθμίσεων ομάδας","add_user_to_group":"Προσθήκη χρήστη","remove_user_from_group":"Αφαίρεση χρήστη","make_user_group_owner":"Κάνε ιδιοκτήτη","remove_user_as_group_owner":"Απέσυρε ιδιοκτήτη"}},"groups":{"member_added":"Προστέθηκε","member_requested":"Ζητήθηκε στις","add_members":{"usernames_or_emails_placeholder":"ονόματα χρηστών ή email","notify_users":"Ειδοποίηση χρηστών"},"requests":{"title":"Αιτήματα","reason":"Αιτία","accept":"Αποδέχομαι","accepted":"αποδεκτό","deny":"Αρνούμαι","denied":"μη αποδεκτό","undone":"αναίρεση αιτήματος","handle":"χειριστείτε το αίτημα συμμετοχής"},"manage":{"title":"Διαχειριστείτε","name":"Όνομα","full_name":"Πλήρες Όνομα","invite_members":"Πρόσκληση","delete_member_confirm":"Να αφαιρεθεί ο/η '%{username}' από την ομάδα '%{group}' ;","profile":{"title":"Προφίλ"},"interaction":{"title":"Αλληλεπίδραση","posting":"Αναρτήσεις","notification":"Ειδοποίηση"},"email":{"title":"Διεύθυνση Email","status":"%{old_emails} / %{total_emails} συγχρονισμένα emails μέσω IMAP.","last_updated_by":"από","credentials":{"title":"Διαπιστευτήρια","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"Χρήση SSL για SMTP","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"Χρήση SSL για SMTP","username":"Όνομα Χρήστη","password":"Κωδικός Πρόσβασης"},"settings":{"title":"Ρυθμίσεις"},"mailboxes":{"synchronized":"Συγχρονισμένο γραμματοκιβώτιο","none_found":"Δε βρέθηκαν γραμματοκιβώτια σε αυτόν τον λογαριασμό email.","disabled":"Απενεργοποιημένο"}},"membership":{"title":"Συνδρομή","access":"Πρόσβαση"},"categories":{"title":"Κατηγορίες","long_title":"Προεπιλεγμένες ειδοποιήσεις κατηγορίας","description":"Όταν προστίθενται χρήστες σε αυτήν την ομάδα, οι ρυθμίσεις ειδοποίησης κατηγοριών θα οριστούν σε αυτές τις προεπιλογές. Στη συνέχεια, μπορούν να τις αλλάξουν.","watched_categories_instructions":"Παρακολουθήστε αυτόματα όλα τα θέματα σε αυτές τις κατηγορίες. Τα μέλη της ομάδας θα ειδοποιηθούν για όλες τις νέες αναρτήσεις και θέματα και θα εμφανιστεί επίσης ένας αριθμός νέων αναρτήσεων δίπλα στο θέμα.","tracked_categories_instructions":"Παρακολουθήστε αυτόματα όλα τα θέματα σε αυτές τις κατηγορίες. Ένα πλήθος νέων αναρτήσεων θα εμφανιστεί δίπλα στο θέμα.","watching_first_post_categories_instructions":"Οι χρήστες θα ειδοποιηθούν για την πρώτη ανάρτηση σε κάθε νέο θέμα σε αυτές τις κατηγορίες.","regular_categories_instructions":"Εάν αυτές οι κατηγορίες είναι σε σίγαση, θα καταργηθεί η σίγαση για τα μέλη της ομάδας. Οι χρήστες θα ειδοποιηθούν εάν αναφέρονται ή κάποιος απαντήσει σε αυτούς.","muted_categories_instructions":"Οι χρήστες δεν θα ειδοποιηθούν για νέα θέματα σε αυτές τις κατηγορίες και δεν θα εμφανίζονται στις σελίδες κατηγοριών ή τελευταίων θεμάτων."},"tags":{"title":"Ετικέτες","long_title":"Προεπιλεγμένες ειδοποιήσεις ετικετών","description":"Όταν προστίθενται χρήστες σε αυτήν την ομάδα, οι ρυθμίσεις ειδοποίησης ετικετών θα ρυθμιστούν σε αυτές τις προεπιλογές. Στη συνέχεια, μπορούν να τις αλλάξουν.","watched_tags_instructions":"Παρακολουθήστε αυτόματα όλα τα θέματα με αυτές τις ετικέτες. Τα μέλη της ομάδας θα ειδοποιηθούν για όλες τις νέες αναρτήσεις και θέματα και θα εμφανιστεί επίσης ένας αριθμός νέων δημοσιεύσεων δίπλα στο θέμα.","tracked_tags_instructions":"Παρακολουθήστε αυτόματα όλα τα θέματα με αυτές τις ετικέτες. Ένα πλήθος νέων δημοσιεύσεων θα εμφανιστεί δίπλα στο θέμα.","watching_first_post_tags_instructions":"Οι χρήστες θα ειδοποιηθούν για την πρώτη ανάρτηση σε κάθε νέο θέμα με αυτές τις ετικέτες.","regular_tags_instructions":"Εάν αυτές οι ετικέτες είναι σε σίγαση, θα καταργηθεί η σίγαση για μέλη της ομάδας. Οι χρήστες θα ειδοποιηθούν εάν αναφέρονται ή κάποιος απαντήσει σε αυτούς.","muted_tags_instructions":"Οι χρήστες δε θα ειδοποιηθούν για τίποτα σχετικό με νέα θέματα με αυτές τις ετικέτες, και αυτά δε θα εμφανίζονται στα πρόσφατα."},"logs":{"title":"Αρχεία καταγραφής","when":"Πότε","action":"Ενέργεια","acting_user":"Ενέργεια από","target_user":"Αποδέκτης","subject":"Αντικείμενο","details":"Λεπτομέρειες","from":"Από","to":"Προς"}},"permissions":{"title":"Δικαιώματα","none":"Δεν υπάρχουν κατηγορίες που σχετίζονται με αυτήν την ομάδα.","description":"Τα μέλη αυτής της ομάδας μπορούν να έχουν πρόσβαση σε αυτές τις κατηγορίες"},"public_admission":"Επίτρεψε στους χρήστες να προσχωρήσουν στην ομάδα (Απαιτεί δημόσια ορατή ομάδα)","public_exit":"Επίτρεψε στους χρήστες να αποχωρήσουν από την ομάδα","empty":{"posts":"Δεν υπάρχουν αναρτήσεις από μέλη της ομάδας.","members":"Δεν υπάρχουν μέλη σε αυτή την ομάδα.","requests":"Δεν υπάρχουν αιτήματα συμμετοχής για αυτήν την ομάδα.","mentions":"Δεν υπάρχουν αναφορές αυτής της ομάδας.","messages":"Δεν υπάρχουν μηνύματα για αυτή την ομάδα.","topics":"Δεν υπάρχουν νήματα από μέλη της ομάδας.","logs":"Δεν υπάρχουν logs για αυτή την ομάδα."},"add":"Προσθήκη","join":"Γίνετε μέλος","leave":"Αποχώρηση","request":"Αίτημα","message":"Μήνυμα","confirm_leave":"Είστε βέβαιοι ότι θέλετε να αποχωρήσετε από αυτήν την ομάδα;","allow_membership_requests":"Να επιτρέπεται στους χρήστες να στέλνουν αιτήματα συμμετοχής σε κατόχους ομάδων (Απαιτείται δημόσια ορατή ομάδα)","membership_request_template":"Προσαρμοσμένο πρότυπο που θα εμφανίζεται στους χρήστες όταν αποστέλλεται αίτημα συμμετοχής","membership_request":{"submit":"Αποστολή Αιτήματος","title":"Αιτήματα για συμετοχή @%{group_name}","reason":"Ενημέρωσε τους ιδιοκτήτες της ομάδας για τον λόγο που θέλεις να συμμετέχεις σε αυτήν"},"membership":"Συνδρομή","name":"Όνομα","group_name":"Όνομα ομάδας","user_count":"Χρήστες","bio":"Σχετικά με την Ομάδα","selector_placeholder":"εισαγωγή ονόματος χρήστη","owner":"ιδιοκτήτης","index":{"title":"Ομάδες","all":"Όλες οι ομάδες","empty":"Δεν υπάρχουν ορατές ομάδες.","filter":"Φιλτράρισμα κατά τύπο ομάδας","owner_groups":"Ομάδες που κατέχω","close_groups":"Κλειστές ομάδες","automatic_groups":"Αυτόματες ομάδες","automatic":"Αυτόματα","closed":"Κλειστό","public":"Δημόσια","private":"Ιδιωτική","public_groups":"Δημόσιες ομάδες","my_groups":"Οι Ομάδες Μου","group_type":"Τύπος ομάδας","is_group_user":"Μέλος","is_group_owner":"Ιδιοκτήτης"},"title":{"one":"Ομάδα","other":"Ομάδες"},"activity":"Δραστηριότητα","members":{"title":"Μέλη","filter_placeholder_admin":"όνομα χρήστη ή διεύθυνση ηλεκτρονικού ταχυδρομίου","filter_placeholder":"όνομα χρήστη","remove_member":"Αφαίρεση μέλους","remove_member_description":"Αφαίρεση \u003cb\u003e%{username}\u003c/b\u003e από αυτήν την ομάδα","make_owner":"Κάνε ιδιοκτήτη","make_owner_description":"Κάνε τον/την \u003cb\u003e%{username}\u003c/b\u003e κάτοχο αυτής της ομάδας","remove_owner":"Αφαίρεση ως κατόχου","remove_owner_description":"Αφαίρεση του/της \u003cb\u003e%{username}\u003c/b\u003e ως κατόχου αυτής της ομάδας","owner":"Ιδιοκτήτης","forbidden":"Δε σας επιτρέπεται να δείτε τα μέλη."},"topics":"Νήματα","posts":"Αναρτήσεις","mentions":"Αναφορές","messages":"Μηνύματα","notification_level":"Προκαθορισμένο επίπεδο ειδοποιήσεων για μηνύματα ομάδων","alias_levels":{"mentionable":"Ποιός μπορεί να @αναφέρει αυτή την ομάδα;","messageable":"Ποιός μπορεί να στείλει μήνυμα σε αυτή την ομάδα;","nobody":"Κανένας","only_admins":"Μόνο διαχειριστές","mods_and_admins":"Μόνο συντονιστές και διαχειριστές","members_mods_and_admins":"Μόνο τα μέλη της ομάδας, οι συντονιστές και οι διαχειριστές","owners_mods_and_admins":"Μόνο κάτοχοι ομάδων, συντονιστές και διαχειριστές","everyone":"Όλοι"},"notifications":{"watching":{"title":"Επιτηρείται","description":"Θα λαμβάνεις ειδοποιήσεις για κάθε καινούρια ανάρτηση σε κάθε μήνυμα και θα εμφανίζεται ο αριθμός των καινούριων απαντήσεων ."},"watching_first_post":{"title":"Επιτήρηση Πρώτης Ανάρτησης","description":"Θα ειδοποιηθείτε για νέα μηνύματα σε αυτήν την ομάδα αλλά όχι για απαντήσεις στα μηνύματα."},"tracking":{"title":"Παρακολουθείται","description":"Θα λαμβάνεις ειδοποιήσεις εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα και θα εμφανίζεται ο αριθμός των καινούριων απαντήσεων."},"regular":{"title":"Κανονικό","description":"Θα λαμβάνεις ειδοποιήσεις αν κάποιος αναφέρει το @name σου ή σου απαντήσει"},"muted":{"title":"Σε σιγή","description":"Δε θα ειδοποιηθείτε για τίποτα σχετικό με μηνύματα σε αυτήν την ομάδα."}},"flair_url":"Avatar Flair Εικόνα","flair_upload_description":"Χρησιμοποιήστε τετράγωνες εικόνες όχι μικρότερες από 20 εικονοστοιχεία έως 20 εικονοστοιχεία.","flair_bg_color":"Avatar Flair Χρώμα Φόντου","flair_bg_color_placeholder":"(Προαιρετικό) Τιμή χρώματος Hex","flair_color":"Avatar Flair Χρώμα","flair_color_placeholder":"(Προαιρετικό) Τιμή χρώματος Hex","flair_preview_icon":"Εικονίδιο Προεπισκόπησης","flair_preview_image":"Εικόνα Προεπισκόπησης","flair_type":{"icon":"Επιλέξτε ένα εικονίδιο","image":"Επιφορτώστε μια εικόνα"},"default_notifications":{"modal_description":"Θα θέλατε να εφαρμόσετε αυτήν την αλλαγή αναδρομικά; Αυτό θα αλλάξει τις προτιμήσεις για %{count} υπάρχοντες χρήστες.","modal_yes":"Ναι","modal_no":"Όχι, εφαρμόστε την αλλαγή μόνο προς τα εμπρός"}},"user_action_groups":{"1":"Αρέσει που Έδωσα","2":"Αρέσει που Έλαβα","3":"Σελιδοδείκτες","4":"Νήματα","5":"Απαντήσεις","6":"Αποκρίσεις","7":"Αναφορές","9":"Παραθέσεις","11":"Επεξεργασίες","12":"Απεσταλμένα","13":"Εισερχόμενα","14":"Εκκρεμή","15":"Προσχέδια"},"categories":{"all":"όλες οι κατηγορίες","all_subcategories":"όλα","no_subcategory":"κανένα","category":"Κατηγορία","category_list":"Εμφάνισε τη λίστα κατηγοριών","reorder":{"title":"Επαναταξινόμησε τις κατηγορίες","title_long":"Αναδιοργάνωση της λίστας κατηγοριών","save":"Αποθήκευση Κατάταξης","apply_all":"Εφαρμογή","position":"Θέση"},"posts":"Αναρτήσεις","topics":"Νήματα","latest":"Πρόσφατες","subcategories":"Υποκατηγορίες","muted":"Κατηγορίες σε σίγαση","topic_sentence":{"one":"%{count} θέμα","other":"%{count} νήματα"},"topic_stat_unit":{"week":"εβδομάδα","month":"μήνας"},"topic_stat_sentence_week":{"one":"%{count} νέο θέμα την περασμένη εβδομάδα.","other":"%{count} νέα θέματα την περασμένη εβδομάδα."},"topic_stat_sentence_month":{"one":"%{count} νέο θέμα τον περασμένο μήνα.","other":"%{count} νέα θέματα τον περασμένο μήνα."}},"ip_lookup":{"title":"Αναζήτηση Διεύθυνσης IP","hostname":"Hostname","location":"Τοποθεσία","location_not_found":"(άγνωστο)","organisation":"Οργανισμός","phone":"Τηλέφωνο","other_accounts":"Άλλοι λογαριασμοί με αυτή την IP διεύθυνση:","delete_other_accounts":"Διαγραφή %{count}","username":"όνομα χρήστη","trust_level":"TL","read_time":"χρόνος ανάγνωσης","topics_entered":"νήματα που προβλήθηκαν","post_count":"# αναρτήσεις","confirm_delete_other_accounts":"Είσε σίγουρος ότι θέλεις να διαγράψεις αυτούς τους λογαριασμούς;","powered_by":"χρησιμοποιώντας το \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"αντιγράφηκε"},"user_fields":{"none":"(διαλέξτε μία επιλογή)","required":"Παρακαλώ εισαγάγετε μια τιμή για το \"%{name}»"},"user":{"said":"%{username}:","profile":"Προφίλ","mute":"Σίγαση","edit":"Επεξεργασία Ρυθμίσεων","download_archive":{"button_text":"Λήψη Όλων","confirm":"Είσαι σίγουρος πως θέλεις να κάνεις λήψη των αναρτήσεών σου;","success":"Ξεκίνησε η διαδικασία λήψης. Θα ειδοποιηθείτε μόλις ολοκληρωθεί η διαδικασία.","rate_limit_error":"Μπορείς να κάνεις λήψη των αναρτήσεών σου μια φορά την ημέρα, προσπάθησε ξανά αύριο."},"new_private_message":"Νέο Μήνυμα","private_message":"Μήνυμα","private_messages":"Μηνύματα","user_notifications":{"filters":{"filter_by":"Φιλτράρισμα κατά","all":"Όλα","read":"Διαβασμένο","unread":"Αδιάβαστα"},"ignore_duration_title":"Αγνόησε χρήστη","ignore_duration_username":"Όνομα Χρήστη","ignore_duration_when":"Διάρκεια:","ignore_duration_save":"Αγνόηση","ignore_duration_note":"Λάβετε υπόψη ότι όλες οι παραβλέψεις αφαιρούνται αυτόματα μετά τη λήξη της διάρκειας παράβλεψης.","ignore_duration_time_frame_required":"Παρακαλώ επιλέξτε ένα χρονικό πλαίσιο","ignore_no_users":"Δεν έχετε αγνοήσει χρήστες.","ignore_option":"Αγνοήθηκε ","ignore_option_title":"Δε θα λαμβάνετε ειδοποιήσεις που σχετίζονται με αυτόν τον χρήστη και όλα τα θέματα και οι απαντήσεις τους θα είναι κρυφά.","add_ignored_user":"Προσθήκη...","mute_option":"Σίγαση","mute_option_title":"Δε θα λάβετε ειδοποιήσεις σχετικά με αυτόν τον χρήστη.","normal_option":"Φυσιολογικά","normal_option_title":"Θα ειδοποιηθείτε εάν αυτός ο χρήστης σας απαντήσει, σας παραθέσει ή σας αναφέρει."},"notification_schedule":{"none":"Κανένα","monday":"Τη Δευτέρα","to":"προς"},"activity_stream":"Δραστηριότητα","read":"Διαβασμένο","preferences":"Προτιμήσεις","feature_topic_on_profile":{"open_search":"Επιλέξτε ένα νέο θέμα","title":"Επιλέξτε ένα θέμα","search_label":"Αναζήτηση για θέμα κατά τίτλο","save":"Αποθήκευση","clear":{"title":"Καθαρισμός","warning":"Είστε βέβαιοι ότι θέλετε να καθαρίσετε το προτεινόμενο θέμα σας;"}},"use_current_timezone":"Χρήση τρέχουσας ζώνης ώρας","profile_hidden":"Το δημόσιο προφίλ αυτού του χρήστη είναι κρυφό.","expand_profile":"Επέκτεινε","collapse_profile":"Σύμπτυξη","bookmarks":"Σελιδοδείκτες","bio":"Σχετικά με εμένα","timezone":"Ζώνη ώρας","invited_by":"Προσκλήθηκε Από","trust_level":"Επίπεδο Εμπιστοσύνης","notifications":"Ειδοποιήσεις","statistics":"Στατιστικά","desktop_notifications":{"label":"Ζωντανές ειδοποιήσεις","not_supported":"Οι ειδοποιήσεις δεν υποστηρίζονται από αυτό το πρόγραμμα περιήγησης. Λυπάμαι.","perm_default":"Ενεργοποίησε τις Ειδοποιήσεις","perm_denied_btn":"Η άδεια απορρίφθηκε","perm_denied_expl":"Απορρίψατε την άδεια για ειδοποιήσεις. Επιτρέψτε τις ειδοποιήσεις μέσω των ρυθμίσεων του browser σας.","disable":"Απενεργοποίηση Ειδοποιήσεων","enable":"Ενεργοποίηση Ειδοποιήσεων","consent_prompt":"Θέλετε ζωντανές ειδοποιήσεις όταν οι χρήστες απαντούν στις αναρτήσεις σας;"},"dismiss":"Απόρριψη","dismiss_notifications":"Απόρριψη Όλων","dismiss_notifications_tooltip":"Όλες οι αδιάβαστες ειδοποιήσεις να χαρακτηριστούν διαβασμένες","first_notification":"Η πρώτη σου ειδοποίηση! Επίλεξε την για να ξεκινήσεις.","dynamic_favicon":"Εμφάνιση μετρήσεων στο εικονίδιο του περιηγητή","skip_new_user_tips":{"description":"Παράλειψη συμβουλών και σημάτων για την ενσωμάτωση νέου χρήστη","not_first_time":"Δεν είναι η πρώτη σας φορά;","skip_link":"Παραλείψτε αυτές τις συμβουλές"},"theme_default_on_all_devices":"Όρισε αυτό ως προεπιλεγμένο θέμα σε όλες τις συσκευές μου","color_scheme_default_on_all_devices":"Όρισε προεπιλεγμένο συνδυασμό χρωμάτων σε όλες τις συσκευές μου","color_scheme":"Συνδυασμός χρωμάτων","color_schemes":{"disable_dark_scheme":"Το ίδιο με το κανονικό","dark_instructions":"Μπορείτε να κάνετε προεπισκόπηση του συνδυασμού χρωμάτων σκοτεινής λειτουργίας αλλάζοντας τη σκοτεινή λειτουργία της συσκευής σας.","undo":"Επαναφορά","regular":"Τακτικός","dark":"Σκοτεινή λειτουργία","default_dark_scheme":"(προεπιλογή ιστότοπου)"},"dark_mode":"Σκοτεινή λειτουργία","dark_mode_enable":"Ενεργοποίηση αυτόματου συνδυασμού χρωμάτων σκοτεινής λειτουργίας","text_size_default_on_all_devices":"Όρισε αυτό ως προεπιλεγμένο μέγεθος κειμένου σε όλες τις συσκευές μου","allow_private_messages":"Επίτρεψε σε άλλους χρήστες να μου στέλνουν προσωπικά μηνύματα","external_links_in_new_tab":"Άνοιγε όλους τους εξωτερικούς συνδέσμους σε νέα καρτέλα","enable_quoting":"Το κείμενο που επισημαίνεται να παρατίθεται στην απάντηση ","enable_defer":"Ενεργοποίηση αναβολής για επισήμανση θεμάτων ως μη αναγνωσμένων","change":"αλλαγή","featured_topic":"Επιλεγμένο θέμα","moderator":"Ο/Η %{user} είναι συντονιστής","admin":"Ο/Η %{user} είναι διαχειριστής","moderator_tooltip":"Αυτός ο χρήστης είναι συντονιστής","admin_tooltip":"Αυτός ο χρήστης είναι διαχειριστής","silenced_tooltip":"Χρήστης σε σιγή","suspended_notice":"Αυτός ο χρήστης είναι σε αποβολή μέχρι τις %{date}.","suspended_permanently":"Ο χρήστης είναι αποβλημένος.","suspended_reason":"Αιτιολογία:","github_profile":"GitHub","email_activity_summary":"Περίληψη Ενεργειών","mailing_list_mode":{"label":"Λειτουργία ταχυδρομικής λίστας","enabled":"Ενεργοποίησε λειτουργία ταχυδρομικής λίστας","instructions":"\nΗ ρύθμιση παρακάμπτει την περίληψη δραστηριότητας.\u003cbr /\u003e\n\nΤα νήματα σε σίγαση και οι κατηγορίες δεν συμπεριλαμβάνονται σε αυτά τα ηλεκτρονικά μηνύματα.\n","individual":"Στείλε ένα email για κάθε νέα ανάρτηση","individual_no_echo":"Στείλε ένα email για κάθε νέα ανάρτηση, εκτός από τις δικές μου.","many_per_day":"Στείλε μου ένα email για κάθε νέα ανάρτηση (περίπου %{dailyEmailEstimate} τη μέρα)","few_per_day":"Στείλε μου ένα email για κάθε νέα ανάρτηση (περίπου 2 τη μέρα)","warning":"Η λειτουργία λίστας αλληλογραφίας είναι ενεργοποιημένη. Οι ρυθμίσεις ειδοποιήσεων μέσω email παρακάμπτονται."},"tag_settings":"Ετικέτες","watched_tags":"Επιτηρείται","watched_tags_instructions":"Θα επιτηρείς αυτόματα όλα τα νήματα με αυτές τις ετικέτες. Θα λαμβάνεις ειδοποιήσεις για όλες τις καινούριες αναρτήσεις και νήματα και η καταμέτρηση των καινούριων αναρτήσεων θα εμφανίζεται επίσης δίπλα στο νήμα.","tracked_tags":"Παρακολουθείται","tracked_tags_instructions":"Θα παρακολουθείς αυτόματα όλα τα νήματα με αυτές τις ετικέτες. Η καταμέτρηση των καινούριων αναρτήσεων θα εμφανίζεται δίπλα στο νήμα.","muted_tags":"Σίγαση","muted_tags_instructions":"Δε θα λαμβάνεις ειδοποιήσεις για τίποτα σχετικά με νέα νήματα με αυτές τις ετικέτες και δε θα εμφανίζονται στα τελευταία. ","watched_categories":"Επιτηρείται","watched_categories_instructions":"Θα παρακολουθείς αυτόματα όλα τα νήματα σε αυτές τις κατηγορίες. Θα λαμβάνεις ειδοποιήσεις για όλες τις καινούριες αναρτήσεις και νήματα και η καταμέτρηση των καινούριων αναρτήσεων θα εμφανίζεται επίσης δίπλα στο νήμα.","tracked_categories":"Παρακολουθείται","tracked_categories_instructions":"Θα παρακολουθείς αυτόματα όλα τα νήματα σε αυτές τις κατηγορίες. Η καταμέτρηση των καινούριων αναρτήσεων θα εμφανίζεται δίπλα στο νήμα.","watched_first_post_categories":"Επιτήρηση Πρώτης Ανάρτησης","watched_first_post_categories_instructions":"Θα ειδοποιηθείς για την πρώτη ανάρτηση σε κάθε νέο νήμα αυτών των κατηγοριών.","watched_first_post_tags":"Επιτήρηση Πρώτης Ανάρτησης","watched_first_post_tags_instructions":"Θα ειδοποιηθείς για την πρώτη ανάρτηση σε κάθε νέο νήμα με αυτές τις ετικέτες. ","muted_categories":"Σε σίγαση","muted_categories_instructions":"Δε θα ειδοποιηθείτε για τίποτα σχετικό με νέα θέματα σε αυτές τις κατηγορίες και αυτά δε θα εμφανίζονται στις σελίδες κατηγοριών ή πρόσφατων.","muted_categories_instructions_dont_hide":"Δε θα ειδοποιηθείτε για τίποτα σχετικό με νέα θέματα σε αυτές τις κατηγορίες.","regular_categories":"Τακτικός","regular_categories_instructions":"Θα βλέπετε αυτές τις κατηγορίες στις λίστες θεμάτων «Πρόσφατα» και «Κορυφαία».","no_category_access":"Ως συντονιστής έχεις περιορισμένη πρόσβαση στην κατηγορία, η αποθήκευση είναι απενεργοποιημένη.","delete_account":"Διαγραφή Λογαριασμού","delete_account_confirm":"Είσαι σίγουρος πως θέλεις να διαγράψεις μόνιμα τον λογαριασμό σου; Αυτή η πράξη είναι μη αναστρέψιμη!","deleted_yourself":"Ο λογαριασμός σου διαγράφηκε.","delete_yourself_not_allowed":"Παρακαλούμε επικοινωνήστε με ένα μέλος του προσωπικού εάν επιθυμείτε να διαγραφεί ο λογαριασμός σας.","unread_message_count":"Μηνύματα","admin_delete":"Διαγραφή","users":"Χρήστες","muted_users":"Σε σίγαση","muted_users_instructions":"Αποκρύψετε όλες τις ειδοποιήσεις και τα ΠΜ από αυτούς τους χρήστες.","allowed_pm_users":"Επιτρέπεται","allowed_pm_users_instructions":"Να επιτρέπονται μόνο ΠΜ από αυτούς τους χρήστες.","allow_private_messages_from_specific_users":"Να επιτρέπεται μόνο σε συγκεκριμένους χρήστες να μου στέλνουν προσωπικά μηνύματα","ignored_users":"Αγνοήθηκε ","ignored_users_instructions":"Απόκρυψη όλων των αναρτήσεωμ, ειδοποιήσεων και ΠΜ από αυτούς τους χρήστες.","tracked_topics_link":"Δείξε","automatically_unpin_topics":"Τα νήματα ξεκαρφιτσώνονται αυτόματα όταν φτάνω στο κάτω μέρος.","apps":"Εφαρμογές","revoke_access":"Ανάκληση Πρόσβασης","undo_revoke_access":"Απενεργοποίηση Ανάκλησης Πρόσβασης","api_approved":"Εγκεκριμένο:","api_last_used_at":"Τελευταία χρήση στις:","theme":"Θέμα","save_to_change_theme":"Το θέμα θα ενημερωθεί αφού κάνετε κλικ στο \"%{save_text}\"","home":"Προεπιλεγμένη Αρχική Σελίδα","staged":"Υπό μετάβαση","staff_counters":{"flags_given":"χρήσιμες σημάνσεις","flagged_posts":"επισημασμένες αναρτήσεις","deleted_posts":"διαγραμμένες αναρτήσεις","suspensions":"αποβολές","warnings_received":"προειδοποιήσεις","rejected_posts":"απορριφθείσες αναρτήσεις"},"messages":{"all":"Όλα","inbox":"Εισερχόμενα","sent":"Απεσταλμένα","archive":"Αρχείο","groups":"Οι Ομάδες Μου","move_to_inbox":"Μετακίνηση στα Εισερχόμενα","move_to_archive":"Αρχειοθέτηση","failed_to_move":"Αποτυχία μετακίνησης των επιλεγμένων μηνυμάτων (πιθανόν δεν υπάρχει σύνδεση στο δίκτυο)","tags":"Ετικέτες"},"preferences_nav":{"account":"Λογαριασμός","security":"Ασφάλεια","profile":"Προφίλ","emails":"Emails","notifications":"Ειδοποιήσεις","categories":"Κατηγορίες","users":"Χρήστες","tags":"Ετικέτες","interface":"Διεπαφή","apps":"Εφαρμογές"},"change_password":{"success":"(το email στάλθηκε)","in_progress":"(αποστολή email)","error":"(σφάλμα)","emoji":"κλειδώστε τα emoji","action":"Αποστολή Email Επαναφοράς Συνθηματικού","set_password":"Ορισμός Συνθηματικού","choose_new":"Επιλέξτε νέο κωδικό πρόσβασης","choose":"Επιλέξτε έναν κωδικό πρόσβασης"},"second_factor_backup":{"regenerate":"Αναδημιουγία","disable":"Απενεργοποίηση","enable":"Ενεργοποίηση","enable_long":"Ενεργοποίηση εφεδρικών κωδικών","copy_to_clipboard":"Αντιγραφή στο Clipboard","copy_to_clipboard_error":"Σφάλμα αντιγραφής δεδομένων στο Clipboard","copied_to_clipboard":"Αντιγράφτηκε στο Clipboard","download_backup_codes":"Μεταφόρτωση εφεδρικών κωδικών","use":"Χρησιμοποιήστε έναν εφεδρικό κωδικό","codes":{"title":"Δημιουργήθηκαν εφεδρικοί κωδικοί","description":"Κάθε ένας από αυτούς τους εφεδρικούς κωδικούς μπορεί να χρησιμοποιηθεί μόνο μία φορά. Κρατήστε τους κάπου ασφαλείς αλλά προσβάσιμους."}},"second_factor":{"disable_all":"Απενεργοποίηση όλων","forgot_password":"Ξεχάσατε τον κωδικό?","confirm_password_description":"Επιβεβαιώστε τον κωδικό πρόσβασης σας για να συνεχίσετε","name":"Όνομα","label":"Κωδικός","rate_limit":"Παρακαλώ περιμένετε πριν δοκιμάσετε έναν άλλο κωδικό ελέγχου ταυτότητας.","enable_description":"Σαρώστε αυτόν τον κωδικό QR σε μια υποστηριζόμενη εφαρμογή (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e - \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) και εισαγάγετε τον κωδικό ελέγχου ταυτότητας.\n","disable_description":"Παρακαλώ εισαγάγετε τον κωδικό ελέγχου ταυτότητας από την εφαρμογή σας","show_key_description":"Εισαγάγετε χειροκίνητα","short_description":"Προστατέψτε τον λογαριασμό σας με κωδικούς ασφαλείας μίας χρήσης.\n","use":"Χρησιμοποιήστε την εφαρμογή Authenticator","disable":"Απενεργοποίηση","save":"Αποθήκευση","edit":"Επεξεργασία","enable_security_key_description":"Όταν έχετε προετοιμάσει το \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003eκλειδί ασφαλείας υλικού\u003c/a\u003e , πατήστε το κουμπί Εγγραφή παρακάτω.\n","totp":{"title":"Επαληθευτές βάσει τεκμηρίων","add":"Προσθήκη επαληθευτή","default_name":"Ο επαληθευτής μου","name_and_code_required_error":"Πρέπει να δώσετε ένα όνομα και τον κωδικό από την εφαρμογή ελέγχου ταυτότητας."},"security_key":{"register":"Εγγραφή","title":"Κλειδιά ασφαλείας","add":"Προσθήκη κλειδιού ασφαλείας","default_name":"Κύριο κλειδί ασφαλείας","not_allowed_error":"Η διαδικασία καταχώρισης κλειδιού ασφαλείας είτε έληξε είτε ακυρώθηκε.","already_added_error":"Έχετε ήδη καταχωρίσει αυτό το κλειδί ασφαλείας. Δε χρειάζεται να το καταχωρίσετε ξανά.","edit":"Επεξεργασία κλειδιού ασφαλείας","save":"Αποθήκευση","edit_description":"Όνομα κλειδιού ασφαλείας","name_required_error":"Πρέπει να δώσετε ένα όνομα για το κλειδί ασφαλείας σας."}},"change_about":{"title":"Άλλαξε τα «σχετικά με εμένα»","error":"Προέκυψε σφάλμα στην αλλαγή της αξίας."},"change_username":{"title":"Αλλαγή Ονόματος Χρήστη","confirm":"Είστε απόλυτα βέβαιοι ότι θέλετε να αλλάξετε το όνομα χρήστη σας;","taken":"Λυπούμαστε, αυτό το όνομα χρήστη χρησιμοποιείται ήδη.","invalid":"Αυτό το όνομα χρήστη δεν είναι έγκυρο. Θα πρέπει να αποτελείται μόνο από αριθμούς και γράμματα"},"add_email":{"title":"Προσθήκη email","add":"προσθήκη"},"change_email":{"title":"Αλλαγή διεύθυνσης Email","taken":"Λυπούμαστε, αυτή η διεύθυνση email δεν είναι διαθέσιμη.","error":"Υπήρξε ένα σφάλμα κατά την αλλαγή της διεύθυνσης email σου. Ίσως αυτή η διεύθυνση είναι ήδη σε χρήση;","success":"Έχουμε στείλει ένα email σε αυτή τη διεύθυνση. Παρακαλούμε ακολούθησε τις οδηγίες επιβεβαίωσης που περιέχει.","success_staff":"Στείλαμε ένα email στην τρέχουσα διεύθυνσή σας. Παρακαλούμε ακολουθήστε τις οδηγίες επικύρωσης."},"change_avatar":{"title":"Αλλαγή της φωτογραφίας του προφίλ σου","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, με βάση το","gravatar_title":"Αλλάξτε το avatar σας στον ιστότοπο του %{gravatarName}","gravatar_failed":"Δε μπορέσαμε να βρούμε ένα %{gravatarName} με αυτή τη διεύθυνση email.","refresh_gravatar_title":"Ανανεώστε το %{gravatarName} σας","letter_based":"Εικόνα προφίλ που ανέθεσε το σύστημα","uploaded_avatar":"Προσαρμοσμένη εικόνα","uploaded_avatar_empty":"Πρόσθεσε μια δική σου εικόνα","upload_title":"Ανέβασε την εικόνα σου","image_is_not_a_square":"Προσοχή: Περικόψαμε την εικόνα σου γιατί το ύψος και το πλάτος δεν ήταν ίσα."},"change_profile_background":{"title":"Κεφαλίδα προφίλ","instructions":"Οι κεφαλίδες προφίλ θα κεντράρονται και θα έχουν προεπιλεγμένο πλάτος 1110 εικονοστοιχεία."},"change_card_background":{"title":"Φόντο Καρτέλας Χρήστη","instructions":"Οι εικόνες στο φόντο θα κεντραρίζονται και το προκαθορισμένο πλάτος τους είναι 590px."},"change_featured_topic":{"title":"Προτεινόμενο θέμα","instructions":"Ένας σύνδεσμος προς αυτό το θέμα θα βρίσκεται στην κάρτα χρήστη και στο προφίλ σας."},"email":{"title":"Email","primary":"Πρωτεύον email","secondary":"Δευτερεύοντα email","primary_label":"κύριο","unconfirmed_label":"ανεξακρίβωτο","resend_label":"επαναποστολή email ενεργοποίησης","resending_label":"αποστολή...","resent_label":"το email στάλθηκε","update_email":"Αλλαγή διεύθυνσης Email","set_primary":"Ορισμός πρωτεύοντος email","destroy":"Αφαίρεση email","add_email":"Προσθήκη εναλλακτικού email","no_secondary":"Χωρίς δευτερεύοντα emails","instructions":"Ποτέ δεν εμφανίζεται στο κοινό.","ok":"Για επιβεβαίωση θα σου στείλουμε ένα email","required":"Παρακαλώ εισάγετε μια διεύθυνση ηλεκτρονικού ταχυδρομείου","invalid":"Παρακαλώ δώσε μία έγκυρη διεύθυνση email","authenticated":"Η διεύθυνση email σου ταυτοποιήθηκε από τον πάροχο %{provider}","frequency_immediately":"Θα σου στείλουμε αμέσως email, εάν δεν έχεις διαβάσει αυτό για το οποίο σου στέλνουμε το μήνυμα.","frequency":{"one":"Θα σου στείλουμε ηλεκτρονικό μήνυμα μόνο εάν δε σε έχουμε δει το τελευταίο λεπτό.","other":"Θα σου στείλουμε ηλεκτρονικό μήνυμα μόνο εάν δεν σε έχουμε δει τα τελευταία %{count} λεπτά."}},"associated_accounts":{"title":"Συνδεδεμένοι λογαριασμοί","connect":"Συνδεθείτε","revoke":"Ανάκληση","cancel":"Άκυρο","not_connected":"(μη συνδεδεμένος)","confirm_modal_title":"Σύνδεση λογαριασμού %{provider}","confirm_description":{"account_specific":"Ο %{provider} λογαριασμός σας «%{account_description}» θα χρησιμοποιηθεί για έλεγχο ταυτότητας.","generic":"Ο %{provider} λογαριασμός σας θα χρησιμοποιηθεί για έλεγχο ταυτότητας."}},"name":{"title":"Όνομα","instructions":"το ονοματεπώνυμό σου (προαιρετικό)","instructions_required":"Το ονοματεπώνυμό σου","required":"Παρακαλώ εισαγάγετε ένα όνομα","too_short":"Το όνομά σου είναι πολύ μικρό","ok":"Το όνομά σου είναι καλό"},"username":{"title":"Όνομα Χρήστη","instructions":"μοναδικό, χωρίς κενά, σύντομο","short_instructions":"Οι άλλοι μπορούν να αναφερθούν σε σένα με το @%{username} ","available":"Το όνομα χρήστη είναι διαθέσιμο","not_available":"Δεν είναι διαθέσιμο. Δοκίμασε %{suggestion};","not_available_no_suggestion":"Μη διαθέσιμο ","too_short":"Το όνομα χρήστη σου είναι μικρό","too_long":"Το όνομα χρήστη σου είναι μεγάλο","checking":"Έλεγχεται αν το όνομα χρήστη είναι διαθέσιμο...","prefilled":"Η διεύθυνση email ταιριάζει με το εγγεγραμμένο όνομα χρήστη","required":"Παρακαλώ εισαγάγετε ένα όνομα χρήστη"},"locale":{"title":"Γλώσσα διεπαφής","instructions":"Η γλώσσα της διεπαφής. Θα αλλάξει μόλις ανανεωθεί η σελίδα","default":"(προεπιλογή)","any":"καθένα"},"password_confirmation":{"title":"Επανάληψη του κωδικού πρόσβασης"},"invite_code":{"title":"Κωδικός πρόσκλησης","instructions":"Η εγγραφή λογαριασμού απαιτεί κωδικό πρόσκλησης"},"auth_tokens":{"title":"Πρόσφατα χρησιμοποιημένες συσκευές","details":"Λεπτομέρειες","log_out_all":"Αποσύνδεση όλων","not_you":"Όχι εσείς;","show_all":"Εμφάνιση όλων (%{count})","show_few":"Εμφάνιση λιγότερων","was_this_you":"Ήσασταν εσείς;","was_this_you_description":"Εάν δεν ήσασταν εσείς, σας συνιστούμε να αλλάξετε τον κωδικό πρόσβασής σας και να αποσυνδεθείτε από παντού.","browser_and_device":"%{browser} σε %{device}","secure_account":"Ασφάλισε τον λογαριασμό μου","latest_post":"Τελευταία δημοσιεύσατε το…"},"last_posted":"Τελευταία Ανάρτηση","last_seen":"Εθεάθη","created":"Μέλος από","log_out":"Αποσύνδεση","location":"Τοποθεσία","website":"Ιστοσελίδα","email_settings":"Email","hide_profile_and_presence":"Κρύψε τα δημόσια χαρακτηριστικά προφίλ και παρουσίας μου.","enable_physical_keyboard":"Ενεργοποιήστε την υποστήριξη φυσικού πληκτρολογίου στο iPad","text_size":{"title":"Μέγεθος κειμένου","smallest":"Το μικρότερο","smaller":"Μικρότερο","normal":"Φυσιολογικά","larger":"Μεγαλύτερο","largest":"Το μεγαλύτερο"},"title_count_mode":{"title":"Ο τίτλος σελίδας φόντου εμφανίζει τον αριθμό των:","notifications":"Νέων ειδοποιήσεων","contextual":"Νέου περιεχομένου σελίδας"},"like_notification_frequency":{"title":"Ειδοποίησέ με όταν έχω \"μου αρέσει\"","always":"Πάντα","first_time_and_daily":"Πρώτη φορά που μια ανάρτησή έχει \"μου αρέσει\" και καθημερινά","first_time":"Πρώτη φορά που μια ανάρτηση έχει \"μου αρέσει\"","never":"Ποτέ"},"email_previous_replies":{"title":"Συμπερίλαβε προηγούμενες απαντήσεις στο κάτω μέρος των email","unless_emailed":"εάν δεν έχει σταλεί προηγουμένως","always":"πάντα","never":"ποτέ"},"email_digests":{"title":"Όταν δεν επισκέπτομαι εδώ, στείλε μου μια περίληψη μέσω email με δημοφιλή θέματα και απαντήσεις","every_30_minutes":"κάθε 30 λεπτά","every_hour":"ωριαία","daily":"καθημερινά","weekly":"εβδομαδιαία","every_month":"κάθε μήνα","every_six_months":"κάθε έξι μήνες"},"email_level":{"title":"Στείλε μου ένα email όταν κάποιος παραθέσει ανάρτησή μου, απαντήσει σε ανάρτησή μου, αναφέρει το @username μου ή με προσκαλεί σε ένα νήμα.","always":"πάντα","only_when_away":"μόνο όταν είμαι μακριά","never":"ποτέ"},"email_messages_level":"Στείλε μου ένα email όταν κάποιος μου στείλει προσωπικό μήνυμα.","include_tl0_in_digests":"Συμπερίλαβε περιεχόμενο από νέους χρήστες σε περιληπτικά email","email_in_reply_to":"Συμπερίλαβε ένα απόσπασμα της απαντημένης ανάρτησης στο email","other_settings":"Λοιπά","categories_settings":"Κατηγορίες","new_topic_duration":{"label":"Τα νήματα να θεωρούνται νέα όταν","not_viewed":"Δεν τα έχω δει αυτά ακόμη","last_here":"δημιουργήθηκαν από την τελευταία επίσκεψή μου","after_1_day":"δημιουργήθηκαν την τελευταία ημέρα","after_2_days":"δημιουργήθηκαν τις 2 τελευταίες ημέρες","after_1_week":"δημιουργήθηκαν την τελευταία εβδομάδα","after_2_weeks":"δημιουργήθηκαν τις 2 τελευταίες εβδομάδες"},"auto_track_topics":"Τα νήματα που επισκέπτομαι να παρακολουθούνται αυτόματα ","auto_track_options":{"never":"ποτέ","immediately":"αμέσως","after_30_seconds":"μετά από 30 δευτερόλεπτα","after_1_minute":"μετά από 1 λεπτό","after_2_minutes":"μετά από 2 λεπτά","after_3_minutes":"μετά από 3 λεπτά","after_4_minutes":"μετά από 4 λεπτά","after_5_minutes":"μετά από 5 λεπτά","after_10_minutes":"μετά από 10 λεπτά"},"notification_level_when_replying":"Όταν αναρτώ σε ένα νήμα, τοποθέτησε αυτό το νήμα σε","invited":{"title":"Προσκλήσεις","pending_tab":"Εκρεμείς","pending_tab_with_count":"Εκρεμείς (%{count})","redeemed_tab":"Αποδεκτές","redeemed_tab_with_count":"Αποδεκτές (%{count})","invited_via":"Πρόσκληση","groups":"Ομάδες","topic":"Νήμα","expires_at":"Λήγει","edit":"Επεξεργασία","remove":"Αφαίρεση","reinvited":"Η πρόσκληση στάλθηκε ξανά","search":"γράψε για να αναζητήσεις προσκλήσεις...","user":"Προσκεκλημένος Χρήστης","none":"Δεν υπάρχουν προσκλήσεις για προβολή.","truncated":{"one":"Δείχνοντας την πρώτη πρόσκληση.","other":"Προβάλονται οι πρώτες %{count} προσκλήσεις."},"redeemed":"Αποδεκτές Προσκλήσεις","redeemed_at":"Αποδεκτές","pending":"Εκρεμείς προσκλήσεις","topics_entered":"Προβεβλημένα Νήματα","posts_read_count":"Διαβασμένες Αναρτήσεις","expired":"Αυτή η πρόσκληση έχει λήξει.","remove_all":"Αφαίρεση ληγμένων προσκλήσεων","removed_all":"Όλες οι ληγμένες προσκλήσεις αφαιρέθηκαν!","remove_all_confirm":"Είστε βέβαιοι ότι θέλετε να αφαιρέσετε όλες τις ληγμένες προσκλήσεις;","reinvite_all_confirm":"Σίγουρα θέλετε να στείλετε ξανά όλες τις προσκλήσεις;","time_read":"Χρόνος Ανάγνωσης","days_visited":"Μέρες Επίσκεψης","account_age_days":"Ηλικία λογαριασμού σε ημέρες","create":"Πρόσκληση","valid_for":"Ο σύνδεσμος πρόσκλησης είναι έγκυρος μόνο για αυτή τη διεύθυνση email: %{email}","invite_link":{"title":"Σύνδεσμος πρόσκλησης","success":"Η δημιουργία του συνδέσμου πρόσκλησης έγινε επιτυχώς!","error":"Παρουσιάστηκε σφάλμα κατά τη δημιουργία συνδέσμου πρόσκλησης","max_redemptions_allowed_label":"Πόσα άτομα επιτρέπεται να εγγραφούν χρησιμοποιώντας αυτόν τον σύνδεσμο;","expires_at":"Πότε θα λήξει αυτός ο σύνδεσμος πρόσκλησης;"},"bulk_invite":{"text":"Μαζική πρόσκληση","error":"Λυπούμαστε, το αρχείο πρέπει να έχει την μορφή CSV."}},"password":{"title":"Κωδικός Πρόσβασης","too_short":"Ο κωδικός πρόσβασης είναι μικρός.","common":"Ο κωδικός πρόσβασης είναι πολύ κοινός.","same_as_username":"Ο κωδικός πρόσβασης που έδωσες είναι ο ίδιος με το όνομα χρήστη.","same_as_email":"Ο κωδικός πρόσβασής σου είναι ίδιος με τη διεύθυνση email σου.","ok":"Ο κωδικός πρόσβασης φαίνεται καλός.","instructions":"τουλάχιστον %{count} χαρακτήρες","required":"Παρακαλώ εισαγάγετε έναν κωδικό πρόσβασης"},"summary":{"title":"Περίληψη","stats":"Στατιστικά","time_read":"χρόνος ανάγνωσης","recent_time_read":"πρόσφατος χρόνος ανάγνωσης","topic_count":{"one":"δημιουργημένο θέμα","other":"δημιουργημένα θέματα"},"post_count":{"one":"δημιουργημένη ανάρτηση","other":"δημιουργημένες αναρτήσεις"},"likes_given":{"one":"δόθηκε","other":"δόθηκαν"},"likes_received":{"one":"ελήφθη","other":"ελήφθησαν"},"days_visited":{"one":"ημέρα επίσκεψης","other":"ημέρες επίσκεψης"},"topics_entered":{"one":"νήμα προβλήθηκε","other":"νήματα προβλήθηκαν"},"posts_read":{"one":"διαβασμένη ανάρτηση","other":"διαβασμένες αναρτήσεις"},"bookmark_count":{"one":"σελιδοδείκτης","other":"σελιδοδείκτες"},"top_replies":"Κορυφαίες Απαντήσεις","no_replies":"Καμία απάντηση ακόμα.","more_replies":"Περισσότερες Απαντήσεις","top_topics":"Κορυφαία Νήματα","no_topics":"Κανένα νήμα ακόμα.","more_topics":"Περισσότερα Νήματα","top_badges":"Κορυφαία Παράσημα","no_badges":"Κανένα παράσημο ακόμα.","more_badges":"Περισσότερα Παράσημα","top_links":"Κορυφαίοι Σύνδεσμοι","no_links":"Κανένας σύνδεσμος ακόμα.","most_liked_by":"Περισσότερα \"Μου αρέσει\" από","most_liked_users":"Περισσότερα \"Μου αρέσει\"","most_replied_to_users":"Περισσότερες απαντήσεις προς","no_likes":"Κανένα μου αρέσει ακόμα.","top_categories":"Κορυφαίες Κατηγορίες","topics":"Θέματα","replies":"Απαντήσεις"},"ip_address":{"title":"Τελευταία διεύθυνση IP"},"registration_ip_address":{"title":"Διεύθυνσης IP Εγγραφής"},"avatar":{"title":"Εικόνα προφίλ","header_title":"προφίλ, μηνύματα, σελιδοδείκτες και προτιμήσεις"},"title":{"title":"Τίτλος","none":"(κανένας)"},"flair":{"none":"(κανένας)"},"primary_group":{"title":"Κύρια ομάδα","none":"(κανένα)"},"filters":{"all":"Όλα"},"stream":{"posted_by":"Αναρτήθηκε από","sent_by":"Στάλθηκε από","private_message":"μήνυμα","the_topic":"το νήμα"}},"loading":"Φόρτωση... ","errors":{"prev_page":"κατά το φόρτωμα","reasons":{"network":"Σφάλμα Δικτύου","server":"Σφάλμα Διακομιστή","forbidden":"Άρνηση Πρόσβασης","unknown":"Σφάλμα","not_found":"Η σελίδα δεν βρέθηκε"},"desc":{"network":"Παρακαλώ έλεγξε την σύνδεση.","network_fixed":"Μοιάζει να επανήλθε.","server":"Κωδικός σφάλματος: %{status}","forbidden":"Δεν επιτρέπεται να το δείς αυτό.","not_found":"Ουπς, η εφαρμογή προσπάθησε να φορτώσει μια διεύθυνση URL που δεν υπάρχει.","unknown":"Κάτι δεν πήγε καλά."},"buttons":{"back":"Πίσω","again":"Δοκίμασε ξανά","fixed":"Φόρτωση Σελίδας"}},"modal":{"close":"κλείσιμο","dismiss_error":"Παράβλεψη σφάλματος"},"close":"Κλείσιμο","logout":"Αποσυνδέθηκες.","refresh":"Ανανέωση","home":"Αρχική Σελίδα","read_only_mode":{"enabled":"Αυτή η ιστοσελίδα είναι σε λειτουργία μόνο ανάγνωσης. Παρακαλώ συνέχισε να κάνεις περιήγηση, όμως το να απαντάς να πατάς \"μου αρέσει\" και κάποιες άλλες λειτουργίες δεν είναι διαθέσιμες τώρα.","login_disabled":"Η δυνατότητα σύνδεσης έχει απενεργοποιηθεί όσο η ιστοσελίδα είναι σε κατάσταση μόνο ανάγνωσης.","logout_disabled":"Η αποσύνδεση δεν είναι διαθέσιμη ενώ η ιστοσελίδα είναι σε λειτουργία μόνο ανάγνωσης."},"learn_more":"μάθε περισσότερα...","first_post":"Πρώτη ανάρτηση","mute":"Σίγαση","unmute":"Αναίρεση σίγασης","last_post":"Αναρτήθηκε","local_time":"Τοπική ώρα","time_read":"Διαβάστηκε","time_read_recently":"%{time_read} πρόσφατα","time_read_tooltip":"%{time_read} συνολικός χρόνος ανάγνωσης","time_read_recently_tooltip":"%{time_read}συνολικός χρόνος ανάγνωσης (%{recent_time_read} τις τελευταίες 60 ημέρες)","last_reply_lowercase":"τελευταία απάντηση","replies_lowercase":{"one":"απάντηση","other":"απαντήσεις"},"signup_cta":{"sign_up":"Εγγραφή","hide_session":"Υπενθύμιση αύριο","hide_forever":"όχι ευχαριστώ","intro":"Γεια! Φαίνεται ότι απολαμβάνεις τη συζήτηση, αλλά δεν έχεις εγγραφεί ακόμα για λογαριασμό.","value_prop":"Όταν δημιουργείτε έναν λογαριασμό, θυμόμαστε ακριβώς τι έχετε διαβάσει, έτσι ώστε να επιστρέφετε πάντα από εκεί που σταματήσατε. Μπορείτε επίσης να λαμβάνετε ειδοποιήσεις, εδώ και μέσω ηλεκτρονικού ταχυδρομείου, κάθε φορά που κάποιος σας απαντά. Και μπορείτε να σας αρέσουν οι δημοσιεύσεις και να μοιραστείς την αγάπη. :heartpulse:"},"summary":{"enabled_description":"Βλέπεις μια περίληψη αυτού του νήματος: οι πιο ενδιαφέρουσες αναρτήσεις, όπως αυτές καθορίστηκαν από την κοινότητα.","enable":"Σύνοψη του Νήματος","disable":"Εμφάνιση όλων των αναρτήσεων"},"deleted_filter":{"enabled_description":"Αυτό το νήμα περιέχει σβησμένες αναρτήσεις, οι οποίες αποκρύπτονται.","disabled_description":"Σε αυτό το νήμα εμφανίζονται oι σβησμένες αναρτήσεις.","enable":"Κρύψε τις σβησμένες αναρτήσεις","disable":"Εμφάνισε τις σβησμένες αναρτήσεις"},"private_message_info":{"title":"Μήνυμα","invite":"Προσκαλέστε άλλους...","edit":"Προσθέστε ή αφαιρέστε...","add":"Προσθήκη...","leave_message":"Σίγουρα θελετε να αφήσετε αυτό το μήνυμα;","remove_allowed_user":"Θέλεις σίγουρα να αφαιρέσεις τον/την %{name} από αυτή τη συζήτηση;","remove_allowed_group":"Θέλεις σίγουρα να αφαιρέσεις τον/την %{name} από αυτό το μήνυμα;"},"email":"Email","username":"Όνομα Χρήστη","last_seen":"Εθεάθη","created":"Δημιουργήθηκε","created_lowercase":"δημιουργήθηκε","trust_level":"Επίπεδο Εμπιστοσύνης","search_hint":"όνομα χρήστη, email ή IP διεύθυνση","create_account":{"header_title":"Καλωσόρισες!","disclaimer":"Κάνοντας εγγραφή συμφωνείς με την \u003ca href='%{privacy_link}'\u003eπολιτική ιδιωτικότητας\u003c/a\u003e και με τους \u003ca href='%{tos_link}'\u003eόρους χρήσης\u003c/a\u003e.","failed":"Κάτι πήγε στραβά. Ίσως αυτή η διεύθυνση email να είναι ήδη δηλωμένη. Δοκίμασε την λειτουργία «ξέχασα τον κωδικό μου»."},"forgot_password":{"title":"Επαναφορά Κωδικού","action":"Ξέχασα τον κωδικό πρόσβασής μου","invite":"Δώσε το όνομα χρήστη σου ή την διεύθυνση email σου και θα σου στείλουμε ένα email για να ορίσεις νέο κωδικό πρόσβασης.","reset":"Επαναφορά Κωδικού Πρόσβασης","complete_username":"Αν βρεθεί λογαριασμός με το όνομα χρήστη \u003cb\u003e%{username}\u003c/b\u003e, σύντομα θα λάβεις ένα email με οδηγίες για το πως να ορίσεις νέο κωδικό πρόσβασης.","complete_email":"Αν υπάρχει λογαριασμός με τη διεύθυνση \u003cb\u003e%{email}\u003c/b\u003e, σε λίγο θα λάβεις ένα email με οδηγίες για το πως να ορίσεις νέο κωδικό πρόσβασης.","complete_username_found":"Βρήκαμε έναν λογαριασμό που να ταιριάζει με το όνομα χρήστη \u003cb\u003e%{username}\u003c/b\u003e. Θα πρέπει να λάβετε ένα email με οδηγίες σχετικά με τον τρόπο επαναφοράς του κωδικού πρόσβασής σας σύντομα.","complete_email_found":"Βρήκαμε έναν λογαριασμό που να ταιριάζει με το \u003cb\u003e%{email}\u003c/b\u003e. Θα πρέπει να λάβετε ένα email με οδηγίες σχετικά με τον τρόπο επαναφοράς του κωδικού πρόσβασής σας σύντομα.","complete_username_not_found":"Δεν υπάρχει λογαριασμός με το όνομα χρήστη \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Δεν υπάρχει λογαριασμός με τη διεύθυνση \u003cb\u003e%{email}\u003c/b\u003e","help":"Δεν λαμβάνετε το email; Ελέγξτε αρχικά τον φάκελο spam.\u003cp\u003eΔεν γνωρίζετε ποια διεύθυνση email χρησιμοποιήσατε; Πείτε μας την διεύθυνση που θεωρείτε πιο πιθανή και θα σας πούμε αν υπάρχει στο σύστημα.\u003c/p\u003e\u003cp\u003eΑν δεν έχετε πλέον πρόσβαση στην διεύθυνση email του λογαριασμού σας, παρακαλούμε επικοινωνήστε\u003ca href='%{basePath}/about'\u003eμε την ομάδα διαχείρισης.\u003c/a\u003e\u003c/p\u003e","button_ok":"OK","button_help":"Βοήθεια"},"email_login":{"link_label":"Στείλτε μου ένα σύνδεσμο σύνδεσης","button_label":"με email","emoji":"κλειδώστε τα emoji","complete_username":"Εάν ένας λογαριασμός αντιστοιχεί στο όνομα χρήστη \u003cb\u003e%{username}\u003c/b\u003e, θα πρέπει να λάβετε σύντομα ένα email με έναν σύνδεσμο σύνδεσης.","complete_email":"Εάν ένας λογαριασμός αντιστοιχεί στο \u003cb\u003e%{email}\u003c/b\u003e, θα πρέπει να λάβετε σύντομα ένα email με έναν σύνδεσμο σύνδεσης.","complete_username_found":"Βρήκαμε έναν λογαριασμό που αντιστοιχεί στο όνομα χρήστη \u003cb\u003e%{username}\u003c/b\u003e, θα πρέπει να λάβετε σύντομα ένα email με έναν σύνδεσμο σύνδεσης.","complete_email_found":"Βρήκαμε έναν λογαριασμό που αντιστοιχεί στο \u003cb\u003e%{email}\u003c/b\u003e, θα πρέπει να λάβετε σύντομα ένα email με έναν σύνδεσμο σύνδεσης.","complete_username_not_found":"Δεν υπάρχει λογαριασμός με το όνομα χρήστη \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Δεν υπάρχει λογαριασμός με τη διεύθυνση \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Συνεχίστε στην %{site_name}","logging_in_as":"Σύνδεση ως %{email}","confirm_button":"Ολοκληρώστε τη σύνδεση"},"login":{"subheader_title":"Συνδέσου στον λογαριασμό σου","username":"Όνομα Χρήστη","password":"Κωδικός Πρόσβασης","second_factor_description":"Παρακαλώ εισαγάγετε τον κωδικό ελέγχου ταυτότητας από την εφαρμογή σας:","second_factor_backup":"Συνδεθείτε χρησιμοποιώντας έναν εφεδρικό κωδικό","second_factor_backup_description":"Παρακαλώ εισαγάγετε έναν από τους εφεδρικούς κωδικούς σας:","second_factor":"Συνδεθείτε χρησιμοποιώντας την εφαρμογή Authenticator","security_key_description":"Όταν έχετε προετοιμάσει το φυσικό κλειδί ασφαλείας σας, πατήστε το κουμπί «Έλεγχος ταυτότητας με κλειδί ασφαλείας» παρακάτω.","security_key_alternative":"Δοκιμάστε με έναν άλλο τρόπο","security_key_authenticate":"Έλεγχος ταυτότητας με κλειδί ασφαλείας","security_key_not_allowed_error":"Η διαδικασία ελέγχου ταυτότητας κλειδιού ασφαλείας είτε έληξε είτε ακυρώθηκε.","security_key_no_matching_credential_error":"Δε βρέθηκαν διαπιστευτήρια που να ταιριάζουν στο παρεχόμενο κλειδί ασφαλείας.","security_key_support_missing_error":"Η τρέχουσα συσκευή ή το πρόγραμμα περιήγησής σας δεν υποστηρίζει τη χρήση κλειδιών ασφαλείας. Παρακαλώ χρησιμοποιήστε διαφορετική μέθοδο.","caps_lock_warning":"Είναι ενεργά τα ΚΕΦΑΛΑΙΑ","error":"Άγνωστο σφάλμα","cookies_error":"Το πρόγραμμα περιήγησής σας φαίνεται να έχει απενεργοποιήσει τα cookies. Ίσως να μη μπορείτε να συνδεθείτε χωρίς να τα ενεργοποιήσετε πρώτα.","rate_limit":"Παρακαλώ περιμένετε προτού προσπαθήσετε ξανά να συνδεθείτε.","blank_username":"Παρακαλώ εισαγάγετε το email ή το όνομα χρήστη σας.","blank_username_or_password":"Παρακαλώ δώσε την διεύθυνση email σου ή το όνομα χρήστη σου καθώς και τον κωδικό πρόσβασής σου.","reset_password":"Επαναφορά Κωδικού Πρόσβασης","logging_in":"Σύνδεση...","or":"Ή","authenticating":"Ταυτοποιώ...","awaiting_activation":"Ο λογαριασμός σας αναμένει ενεργοποίηση, χρησιμοποιήστε τον σύνδεσμο ξεχασμένου συνθηματικού για δημιουργία νέου email ενεργοποίησης.","awaiting_approval":"Ο λογαριασμός σου δεν έχει εγκριθεί από κανέναν συνεργάτη ακόμη. Θα λάβεις ένα email όταν εγκριθεί.","requires_invite":"Λυπούμαστε, αλλά η πρόσβαση σε αυτό το φόρουμ είναι δυνατή μόνο με πρόσκληση.","not_activated":"Δεν γίνεται να συνδεθείς ακόμη. Έχουμε ήδη στείλει ένα email με οδηγίες ενεργοποίησης στη διεύθυνση \u003cb\u003e%{sentTo}\u003c/b\u003e. Ακολούθησε τις οδηγίες σε αυτό το μήνυμα για να ενεργοποιήσεις το λογαριασμό σου.","not_allowed_from_ip_address":"Δεν μπορείς να συνδεθείς από αυτή τη διεύθυνση IP.","admin_not_allowed_from_ip_address":"Από αυτή τη διεύθυνση IP δεν επιτρέπεται να συνδεθείς ως διαχειριστής.","resend_activation_email":"Πάτησε εδώ για να σταλεί ξανά το email ενεργοποίησης.","resend_title":"Επαναποστολή Email Ενεργοποίησης","change_email":"Αλλαγή Διεύθυνσης Email","provide_new_email":"Καταχωρήστε μια νέα διεύθυνση και θα σας στείλουμε εκ νέου το email ενεργοποίησης.","submit_new_email":"Ενημέρωση Διεύθυνσης Email","sent_activation_email_again":"Στάλθηκε ένα ακόμα email ενεργοποίησης στο \u003cb\u003e%{currentEmail}\u003c/b\u003e. Θα χρειαστούν κάποια λεπτά για να το λάβεις, βεβαιώσου ότι έλεγξες και το φάκελο ανεπιθύμητης αλληλογραφίας.","sent_activation_email_again_generic":"Στείλαμε ένα άλλο email ενεργοποίησης. Μπορεί να χρειαστούν μερικά λεπτά για να φτάσει· βεβαιωθείτε ότι έχετε ελέγξει τον φάκελο ανεπιθύμητης αλληλογραφίας σας.","to_continue":"Παρακαλώ Συνδεθείτε","preferences":"Πρέπει να συνδεθείς για να αλλάξεις τις προτιμήσεις χρήστη.","not_approved":"Ο λογαριασμός σας δεν έχει εγκριθεί ακόμα. Θα ειδοποιηθείτε με email όταν είστε έτοιμοι να συνδεθείτε.","google_oauth2":{"name":"Google","title":"μέσω της Google"},"twitter":{"name":"Twitter","title":"μέσω του Twitter"},"instagram":{"name":"Instagram","title":"μέσω του Instagram"},"facebook":{"name":"Facebook","title":"μέσω του Facebook"},"github":{"name":"GitHub","title":"μέσω του GitHub"},"discord":{"name":"Discord","title":"με το Discord"},"second_factor_toggle":{"totp":"Χρησιμοποιήστε αντ 'αυτού μια εφαρμογή ελέγχου ταυτότητας","backup_code":"Χρησιμοποιήστε αντ 'αυτού έναν εφεδρικό κωδικό"}},"invites":{"accept_title":"Πρόσκληση","emoji":"emoji φακέλου","welcome_to":"Καλώς ήλθατε στην %{site_name}!","invited_by":"Προσκληθήκατε από:","social_login_available":"Μπορείτε επίσης να συνδεθείτε μέσω λογαριασμών κοινωνικής δικτύωσης στους οποίους χρησιμοποιείτε αυτό το email.","your_email":"Η διεύθυνση email του λογαριασμού σας είναι \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Αποδοχή Πρόσκλησης","success":"Ο λογαριασμός σας έχει δημιουργηθεί και έχετε συνδεθεί. ","name_label":"Όνομα","password_label":"Κωδικός Πρόσβασης","optional_description":"(προεραιτικό)"},"password_reset":{"continue":"Συνεχίστε στην %{site_name}"},"emoji_set":{"apple_international":"Apple/Διεθνής","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Μόνο Κατηγορίες","categories_with_featured_topics":"Κατηγορίες με Προτεινόμενα Νήματα","categories_and_latest_topics":"Κατηγορίες και Τελευταία Νήματα","categories_and_top_topics":"Κατηγορίες και κορυφαία θέματα","categories_boxes":"Κουτιά με υποκατηγορίες","categories_boxes_with_topics":"Κουτιά με προτεινόμενα θέματα"},"shortcut_modifier_key":{"shift":" Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"Φόρτωση..."},"category_row":{"topic_count":{"one":"%{count} θέμα σε αυτήν την κατηγορία","other":"%{count} θέματα σε αυτήν την κατηγορία"},"plus_subcategories_title":{"one":"%{name} και μία υποκατηγορία","other":"%{name} και %{count} υποκατηγορίες"},"plus_subcategories":{"one":"+ %{count} υποκατηγορία","other":"+ %{count} υποκατηγορίες"}},"select_kit":{"default_header_text":"Επιλογή...","no_content":"Δεν βρέθηκαν αποτελέσματα","filter_placeholder":"Αναζήτηση...","filter_placeholder_with_any":"Αναζητήστε ή δημιουργήστε...","create":"Δημιουργήστε: '%{content}'","max_content_reached":{"one":"Μπορείτε να επιλέξετε μόνο %{count} στοιχείο.","other":"Μπορείτε να επιλέξετε μόνο %{count} στοιχεία."},"min_content_not_reached":{"one":"Επιλέξτε τουλάχιστον %{count} στοιχείο.","other":"Επιλέξτε τουλάχιστον %{count} στοιχεία."},"invalid_selection_length":{"one":"Η επιλογή πρέπει να έχει τουλάχιστον %{count} χαρακτήρα.","other":"Η επιλογή πρέπει να έχει τουλάχιστον %{count} χαρακτήρες."},"components":{"categories_admin_dropdown":{"title":"Διαχείριση κατηγοριών"}}},"date_time_picker":{"from":"Από","to":"Προς"},"emoji_picker":{"filter_placeholder":"Αναζήτηση για emoji","smileys_\u0026_emotion":"Χαμόγελα και συγκίνηση","people_\u0026_body":"Άνθρωποι και Σώμα","animals_\u0026_nature":"Ζώα και Φύση","food_\u0026_drink":"Φαγητό και Ποτό","travel_\u0026_places":"Ταξίδια και μέρη","activities":"Δραστηριότητες","objects":"Αντικείμενα","symbols":"Σύμβολα","flags":"Σημάνσεις","recent":"Πρόσφατα χρησιμοποιημένα","default_tone":"Χωρίς απόχρωση επιδερμίδας","light_tone":"Λευκή απόχρωση επιδερμίδας","medium_light_tone":"Ανοιχτόχρωμη απόχρωση επιδερμίδας","medium_tone":"Μέτρια απόχρωση επιδερμίδας","medium_dark_tone":"Σκουρόχρωμη απόχρωση επιδερμίδας","dark_tone":"Σκούρη απόχρωση επιδερμίδας","default":"Προσαρμοσμένα emojis"},"shared_drafts":{"title":"Κοινόχρηστα Προσχέδια","destination_category":"Κατηγορία προορισμού","publish":"Δημοσίευση κοινόχρηστου προσχεδίου","confirm_publish":"Είσαι βέβαιοι πως θέλετε να δημοσιεύσετε αυτό το προσχέδιο;","publishing":"Δημοσίευση θέματος..."},"composer":{"emoji":"Emoji :)","more_emoji":"περισσότερα...","options":"Επιλογές","whisper":"ψιθύρισμα","unlist":"κρυμμένο","add_warning":"Αυτή είναι μια επίσημη προειδοποίηση.","toggle_whisper":"Εναλλαγή Ψιθύρων","toggle_unlisted":"Εναλλαγή Κρυφών","posting_not_on_topic":"Σε ποιο νήμα θέλεις να απαντήσεις;","saved_local_draft_tip":"αποθηκεύτηκε τοπικά","similar_topics":"Το νήμα σας είναι παρόμοιο με ...","drafts_offline":"τοπικά πρόχειρα","edit_conflict":"επεξεργασία διένεξης","group_mentioned":{"one":"Αναφέροντας %{group}, πρόκειται να λάβει ειδοποίηση \u003ca href='%{group_link}'\u003e %{count} άτομο\u003c/a\u003e - είσαι βέβαιος;","other":"Αναφέροντας το %{group}, πρόκειται να ειδοποίησεις \u003ca href='%{group_link}'\u003e%{count} μέλη\u003c/a\u003e - είσαι σίγουρος;"},"cannot_see_mention":{"category":"Ανέφερες το %{username} αλλά δε θα λάβουν ειδοποίηση, επειδή δεν έχουν πρόσβαση σε αυτή την κατηγορία. Θα πρέπει να τους προσθέσεις σε μια ομάδα που έχει πρόσβαση σε αυτή την κατηγορία.","private":"Ανέφερες %{username} αλλά δεν θα λάβουν ειδοποίηση, επειδή δεν μπορούν να δουν αυτό το προσωπικό μήνυμα. Πρέπει να τους προσκαλέσεις σε αυτό το ΠΜ."},"duplicate_link":"Όπως φαίνετα ο σύνδεσμος σας προς \u003cb\u003e%{domain}\u003c/b\u003e έχει ήδη αναρτηθεί στο νήμα από \u003cb\u003e@%{username}\u003c/b\u003e σε μία \u003ca href='%{post_url}'\u003eαπάντηση πριν από %{ago}\u003c/a\u003e – θέλετε σίγουρα να αναρτήσετε τον σύνδεσμο ξανά;","reference_topic_title":"ΑΠ: %{title}","error":{"title_missing":"Απαιτείται τίτλος","post_missing":"Η ανάρτηση δε μπορεί να είναι κενή","try_like":"Έχετε δοκιμάσει το κουμπί %{heart};","category_missing":"Πρέπει να διαλέξεις μια κατηγορία","tags_missing":{"one":"Πρέπει να επιλέξετε τουλάχιστον %{count} ετικέτα","other":"Πρέπει να επιλέξετε τουλάχιστον %{count} ετικέτες"},"topic_template_not_modified":"Παρακαλώ προσθέστε λεπτομέρειες στο θέμα σας με την επεξεργασία του προτύπου θέματος."},"save_edit":"Αποθήκευση Επεξεργασίας","overwrite_edit":"Αντικατάσταση επεξεργασίας","reply_original":"Απάντηση στο αρχικό νήμα","reply_here":"Απάντησε Εδώ","reply":"Απάντηση","cancel":"Ακύρωση","create_topic":"Δημιουργία Νήματος","create_pm":"Μήνυμα","create_whisper":"Ψυθίρισμα","create_shared_draft":"Δημιουργήστε κοινόχρηστο προσχέδιο","edit_shared_draft":"Επεξεργασία κοινόχρηστου προσχεδίου","title":"Ή πάτα Ctrl+Enter","users_placeholder":"Προσθήκη χρήστη","title_placeholder":"Τι αφορά αυτή η συζήτησης σε μία σύντομη πρόταση;","title_or_link_placeholder":"Πληκτρολόγησε τίτλο, ή κάνε επικόλληση ένα σύνδεσμο εδώ","edit_reason_placeholder":"γιατί αναθεωρείς;","topic_featured_link_placeholder":"Εισάγετε τον συνδέσμο που εμφανίζεται με τον τίτλο","remove_featured_link":"Αφαιρέστε σύνδεσμο από το θέμα.","reply_placeholder":"Πληκτρολόγησε εδώ. Χρησιμοποίησε την μορφή Markdown, BBCode, ή HTML. Σύρε ή επικόλλησε εικόνες.","reply_placeholder_no_images":"Πληκτρολογήστε εδώ. Χρησιμοποιήστε Markdown, BBCode ή HTML για να μορφοποιήσετε.","reply_placeholder_choose_category":"Επιλέξτε μια κατηγορία πριν πληκτρολογήσετε εδώ.","view_new_post":"Δες τη νέα σου ανάρτηση.","saving":"Αποθηκεύεται","saved":"Αποθηκεύτηκε!","saved_draft":"Δημοσίευση προσχεδίου σε εξέλιξη. Πατήστε για να συνεχίσετε.","uploading":"Ανεβαίνει...","quote_post_title":"Παράθεση ολόκληρης την ανάρτησης","bold_label":"B","bold_title":"Έντονα","bold_text":"έντονη γραφή","italic_label":"I","italic_title":"Έμφαση","italic_text":"κείμενο σε έμφαση","link_title":"Υπερσύνδεσμος","link_description":"δώσε εδώ μια περιγραφή για το σύνδεσμο","link_dialog_title":"Εισαγωγή Υπερσύνδεσμου","link_optional_text":"προαιρετικός τίτλος","link_url_placeholder":"Επικολλήστε μια διεύθυνση URL ή πληκτρολογήστε για να αναζητήσετε θέματα","blockquote_title":"Blockquote","blockquote_text":"Blockquote","code_title":"Προ-διαμορφωμένο κείμενο","code_text":"το προ-διαμορφωμένο κείμενο να μπει σε εσοχή με 4 κενά","paste_code_text":"πληκτρολογήστε ή επικολλήστε τον κώδικα εδώ","upload_title":"Ανέβασμα","upload_description":"δώσε μια περιγραφή για την μεταφόρτωση","olist_title":"Αριθμημένη λίστα","ulist_title":"Κουκίδες","list_item":"Στοιχείο Λίστας","toggle_direction":"Εναλλαγή κατεύθυνσης","help":"Βοήθεια Επεξεργασίας Markdown","collapse":"ελαχιστοποιήστε το πλαίσιο επεξεργαστή κειμένου","open":"ανοίξτε το πλαίσιο επεξεργαστή κειμένου","abandon":"κλείστε τον επεξεργαστή κειμένου και απορρίψτε το προσχέδιο","enter_fullscreen":"μεταβείτε σε επεξεργαστή κειμένου πλήρους οθόνης","exit_fullscreen":"έξοδος από επεξεργαστή κειμένου πλήρους οθόνης","modal_ok":"OK","modal_cancel":"Ακύρωση","cant_send_pm":"Λυπούμαστε, δεν μπορείτε να στείλετε μήνυμα στο χρήστη %{username}.","yourself_confirm":{"title":"Ξεχάσατε να προσθέσετε αποδέκτες;","body":"Αυτή τη στιγμή το μήνυμα στέλνεται μόνο σε εσάς!"},"admin_options_title":"Προαιρετικές ρυθμίσεις συνεργατών για αυτό το νήμα","composer_actions":{"reply":"Απάντηση","draft":"Προσχέδιο","edit":"Επεξεργασία","reply_to_post":{"label":"Απάντηση στην ανάρτηση του %{postUsername}","desc":"Απάντηση σε μια συγκεκριμένη ανάρτηση"},"reply_as_new_topic":{"label":"Απάντηση ως συνδεδεμένο θέμα","desc":"Δημιουργήστε ένα νέο θέμα που συνδέεται με αυτό το θέμα","confirm":"Έχετε αποθηκεύσει ένα νέο προσχέδιο θέματος, το οποίο θα αντικατασταθεί εάν δημιουργήσετε ένα συνδεδεμένο θέμα."},"reply_as_new_group_message":{"label":"Απάντηση ως νέο ομαδικό μήνυμα"},"reply_as_private_message":{"label":"Νέο μήνυμα","desc":"Δημιουργήστε ένα νέο προσωπικό μήνυμα"},"reply_to_topic":{"label":"Απάντηση στο θέμα","desc":"Απάντηση στο θέμα, όχι σε συγκεκριμένη ανάρτηση"},"toggle_whisper":{"label":"Εναλλαγή ψιθύρων","desc":"Οι ψίθυροι είναι ορατοί μόνο στα μέλη του προσωπικού"},"create_topic":{"label":"Νέο Νήμα"},"shared_draft":{"label":"Κοινόχρηστο προσχέδιο"},"toggle_topic_bump":{"label":"Εναλλαγή ώθησης θέματος","desc":"Απάντηση χωρίς αλλαγή της τελευταίας ημερομηνίας απάντησης"}},"reload":"Ανανέωση","ignore":"Αγνόηση","details_title":"Περίληψη","details_text":"Αυτό το κείμενο θα είναι κρυφό"},"notifications":{"tooltip":{"regular":{"one":"%{count} μη αναγνωσμένη ειδοποίηση","other":"%{count} αναγνωσμένες ειδοποιήσεις"},"message":{"one":"%{count} μη αναγνωσμένο μήνυμα","other":"%{count} μη αναγνωσμένα μηνύματα"},"high_priority":{"one":"%{count} μη αναγνωσμένη ειδοποίηση υψηλής προτεραιότητας","other":"%{count} μη αναγνωσμένες ειδοποιήσεις υψηλής προτεραιότητας"}},"title":"ειδοποιήσεις για αναφορές στο @name, απαντήσεις στις αναρτήσεις σου και στα νήματά σου, προσωπικά μηνύματα, κλπ.","none":"Αυτή τη στιγμή δεν είναι δυνατόν να φορτωθούν οι ειδοποιήσεις.","empty":"Δεν βρέθηκαν ειδοποιήσεις.","post_approved":"Η ανάρτησή σας εγκρίθηκε","reviewable_items":"στοιχεία που απαιτούν αναθεώρηση","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} και %{count} ακόμα\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} και %{count} ακόμα\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"μου άρεσε %{count} από τις αναρτήσεις σας","other":"μου άρεσαν %{count} από τις αναρτήσεις σας"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e αποδέχτηκε την πρόσκλησή σου","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e μετακίνησε %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Έλαβες '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eΝέο Νήμα\u003c/span\u003e %{description}","membership_request_accepted":"Η συμμετοχή έγινε αποδεκτή στο '%{group_name}'","reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - ολοκληρώθηκε","group_message_summary":{"one":"%{count} μήνυμα στα εισερχόμενα της ομάδας %{group_name}","other":"%{count} μηνύματα στα εισερχόμενα της ομάδας %{group_name} "},"popup":{"mentioned":"%{username} σε ανέφερε στο \"%{topic}\" - %{site_title}","group_mentioned":"%{username} σε ανέφερε στο \"%{topic}\" - %{site_title}","quoted":"%{username} σε παράθεσε στο \"%{topic}\" - %{site_title}","replied":"%{username} σου απάντησε στο \"%{topic}\" - %{site_title}","posted":"%{username} ανάρτησε στο \"%{topic}\" - %{site_title}","private_message":"Ο/Η %{username} σας έστειλε ένα προσωπικό μήνυμα στο \"%{topic}\" - %{site_title}","linked":"%{username} έκανε μια σύνδεση στην ανάρτηση που έκανες στο νήμα \"%{topic}\" - %{site_title}","watching_first_post":"Ο/Η %{username} δημιούργησε ένα νέο θέμα \"%{topic}\" - %{site_title}","confirm_title":"Ενεργοποιημένες ειδοποιήσεις - %{site_title}","confirm_body":"Επιτυχία! Οι ειδοποιήσεις έχουν ενεργοποιηθεί.","custom":"Ειδοποίηση από %{username} στο %{site_title}"},"titles":{"mentioned":"αναφέρθηκε","replied":"νέα απάντηση","quoted":"παρέθεσε","edited":"επεξεργάστηκε","liked":"νέο «μου αρέσει»","private_message":"νέο προσωπικό μήνυμα","invited_to_private_message":"προσκλήθηκε σε προσωπικό μήνυμα","invitee_accepted":"Η πρόσκληση έγινε αποδεκτή","posted":"νέα ανάρτηση","moved_post":"η ανάρτηση μετακινήθηκε","linked":"συνέδεσε","bookmark_reminder":"υπενθύμιση σελιδοδείκτη","bookmark_reminder_with_name":"υπενθύμιση σελιδοδείκτη - %{name}","granted_badge":"παραχωρήθηκε σήμα","invited_to_topic":"προσκλήθηκε στο θέμα","group_mentioned":"αναφερθείσα ομάδα","group_message_summary":"νέα ομαδικά μηνύματα","watching_first_post":"νέο νήμα","topic_reminder":"υπενθύμιση θέματος","liked_consolidated":"νέα «μου αρέσει»","post_approved":"η ανάρτηση εγκρίθηκε","membership_request_consolidated":"νέα αιτήματα συμμετοχής","reaction":"νέα αντίδραση","votes_released":"Η ψηφοφορία κυκλοφόρησε"}},"upload_selector":{"uploading":"Ανεβαίνει","select_file":"Επιλογή Αρχείου","default_image_alt_text":"εικόνα"},"search":{"sort_by":"Ταξινόμηση κατά","relevance":"Συνάφεια","latest_post":"Νεότερη Ανάρτηση","latest_topic":"Νεότερο Νήμα","most_viewed":"Περισσότερες Εμφανίσεις","most_liked":"Περισσότερα \"Μου Αρέσει\"","select_all":"Επιλογή Όλων","clear_all":"Καθαρισμός Όλων","too_short":"Ο όρος αναζήτησής σου είναι πολύ μικρός.","result_count":{"one":"\u003cspan\u003e%{count} αποτέλεσμα για\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} αποτελέσματα για\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"ψάξε σε νήματα, αναρτήσεις, χρήστες ή κατηγορίες","full_page_title":"αναζήτηση θεμάτων ή αναρτήσεων","no_results":"Δε βρέθηκαν αποτελέσματα.","no_more_results":"Δε βρέθηκαν άλλα αποτελέσματα","post_format":"#%{post_number} από %{username}","results_page":"Αποτελέσματα αναζήτησης για '%{term}'","more_results":"Υπάρχουν περισσότερα αποτελέσματα. Παρακαλούμε περιορίστε την αναζήτησή σας.","cant_find":"Δεν μπορείτε να βρείτε αυτό που ψάχνετε;","start_new_topic":"Ίσως να ξεκινούσατε ένα νέο νήμα;","or_search_google":"Ή προσπαθήστε να κάνετε αναζήτηση με το Google:","search_google":"Προσπαθήστε να κάνετε αναζήτηση με το Google:","search_google_button":"Google","search_button":"Αναζήτηση","context":{"user":"Ψάξε στις αναρτήσεις του χρήστη @%{username}","category":"Αναζήτηση στην κατηγορία #%{category} ","tag":"Αναζήτηση στην ετικέτα #%{tag}","topic":"Ψάξε σε αυτό το νήμα","private_messages":"Αναζήτηση στα μηνύματα"},"advanced":{"title":"Προηγμένη Αναζήτηση","posted_by":{"label":"Αναρτήθηκε από"},"in_category":{"label":"Κατηγοριοποιημένα"},"in_group":{"label":"Σε ομάδα"},"with_badge":{"label":"Με Παράσημο"},"with_tags":{"label":"Με ετικέτα"},"filters":{"label":"Επίστρεψε μόνο θέματα/αναρτήσεις...","title":"Ταιριάζει μόνο στον τίτλο","likes":"μου άρεσαν","posted":"απάντησα","created":"Δημιούργησα","watching":"επιτηρώ","tracking":"παρακολουθώ","private":"Στα μηνύματά μου","bookmarks":"Έθεσα σελιδοδείκτη","first":"είναι η πρώτη ανάρτηση","pinned":"είναι καρφιτσωμένα","seen":"Διάβασα","unseen":"δεν διάβασα","wiki":" είναι βίκι","images":"συμπεριλάβετε εικόνες","all_tags":"Όλες οι παραπάνω ετικέτες"},"statuses":{"label":"Τα οποία νήματα","open":"είναι ανοιχτά","closed":"είναι κλειστά","public":"είναι δημόσια","archived":"είναι αρχειοθετημένα","noreplies":"έχουν μηδέν απαντήσεις","single_user":"περιέχουν ένα μόνο χρήστη"},"post":{"count":{"label":"Αναρτήσεις"},"time":{"label":"Αναρτήθηκε","before":"πριν","after":"μετά"}},"views":{"label":"Προβολές"}}},"hamburger_menu":"πήγαινε σε άλλη καταχώρηση νήματος ή κατηγορία","new_item":"καινούριο","go_back":"επιστροφή","not_logged_in_user":"σελίδα λογαριασμού που περιέχει σύνοψη της τρέχουσας δραστηριότητας και τις προτιμήσεις","current_user":"πήγαινε στη σελίδα του λογαριασμού σου","topics":{"new_messages_marker":"τελευταία επίσκεψη","bulk":{"select_all":"Επιλογή Όλων","clear_all":"Καθαρισμός Όλων","unlist_topics":"Απόκρυψη Νημάτων","relist_topics":"Εμφάνιση Νημάτων","reset_read":"Μηδενισμός Διαβασμένων","delete":"Διαγραφή Νημάτων","dismiss":"Απόρριψη","dismiss_read":"Απόρριψη όλων των μη αναγνωσμένων","dismiss_button":"Απόρριψη...","dismiss_tooltip":"Απόρριψη μόνο των νέων αναρτήσεων ή διακοπή της παρακολούθησης νημάτων","also_dismiss_topics":"Διακοπή παρακολούθησης αυτών των νημάτων ώστε να μην εμφανιστούν ξανά ως μη αναγνωσμένα σε εμένα","dismiss_new":"Αγνόησε τα νέα","toggle":"εναλλαγή μαζικής επιλογής νημάτων","actions":"Μαζικές Ενέργειες","change_category":"Θέσε Κατηγορία","close_topics":"Κλείσιμο Νημάτων","archive_topics":"Αρχειοθέτηση Νημάτων","move_messages_to_inbox":"Μετακίνηση στα Εισερχόμενα","notification_level":"Ειδοποιήσεις","choose_new_category":"Διάλεξε νέα κατηγορία για τα νήματα:","selected":{"one":"Έχεις διαλέξει \u003cb\u003e%{count}\u003c/b\u003e νήμα.","other":"Έχεις διαλέξει \u003cb\u003e%{count}\u003c/b\u003e νήματα."},"change_tags":"Αντικατάσταση Ετικετών ","append_tags":"Προσάρτηση Ετικετών ","choose_new_tags":"Επίλεξε καινούριες ετικέτες για αυτά τα νήματα:","choose_append_tags":"Επιλογή νέων ετικετών για την προσάρτηση τους σε αυτά τα νήματα","changed_tags":"Οι ετικέτες αυτών των νημάτων έχουν αλλάξει."},"none":{"unread":"Έχεις διαβάσει όλα τα νήματα.","new":"Δεν υπάρχουν νέα νήματα.","read":"Δεν έχεις διαβάσει κανένα νήμα ακόμη.","posted":"Δεν έχεις αναρτήσει σε κάποιο νήμα ακόμη.","bookmarks":"Δεν έχεις βάλει σελιδοδείκτη σε κανένα νήμα.","category":"Δεν υπάρχουν νήματα στην κατηγορία %{category}.","top":"Δεν υπάρχουν κορυφαία νήματα."},"bottom":{"latest":"Δεν υπάρχουν άλλα πρόσφατα νήματα.","posted":"Δεν υπάρχουν άλλα αναρτημένα νήματα.","read":"Δεν υπάρχουν άλλα διαβασμένα νήματα.","new":"Δεν υπάρχουν άλλα νέα νήματα.","unread":"Δεν υπάρχουν άλλα αδιάβαστα νήματα.","category":"Δεν υπάρχουν άλλα νήματα στην κατηγορία %{category}.","tag":"Δεν υπάρχουν άλλα θέματα με ετικέτα %{tag}.","top":"Δεν υπάρχουν άλλα κορυφαία νήματα.","bookmarks":"Δεν υπάρχουν άλλα νήματα με σελιδοδείκτη."}},"topic":{"filter_to":{"one":"%{count} δημοσίευση σε νήματα","other":"%{count} αναρτήσεις σε νήματα"},"create":"Νέο Νήμα","create_long":"Δημιουργία νέου Νήματος","open_draft":"Άνοιγμα προσχεδίου","private_message":"Στείλε ένα προσωπικό μήνυμα","archive_message":{"help":"Αρχειοθέτηση μηνύματος","title":"Αρχειοθέτηση"},"move_to_inbox":{"title":"Μετακίνηση στα Εισερχόμενα","help":"Μετακίνηση μηνύματος πίσω στα Εισερχόμενα"},"edit_message":{"help":"Επεξεργασία της πρώτης ανάρτησης του μηνύματος","title":"Επεξεργασία"},"defer":{"help":"Σήμανση ως μη αναγνωσμένο","title":"Αναβολή"},"list":"Νήματα","new":"νέο νήμα","unread":"αδιάβαστο","new_topics":{"one":"%{count} νέο νήμα","other":"%{count} νέα νήματα"},"unread_topics":{"one":"%{count} μη αναγνωσμένο νήμα","other":"%{count} αδιάβαστα νήματα"},"title":"Νήμα","invalid_access":{"title":"Το νήμα είναι ιδιωτικό","description":"Λυπούμαστε, αλλά δεν έχεις πρόσβαση σε αυτό το νήμα!","login_required":"Θα πρέπει να συνδεθείς για να δείς αυτό το νήμα."},"server_error":{"title":"Το νήμα δεν ήταν δυνατό να φορτωθεί","description":"Λυπούμαστε, δεν μπορέσαμε να φορτώσουμε αυτό το νήμα, πιθανότατα λόγω προβλήματος στη σύνδεση. Παρακαλούμε δοκίμασε ξανά. Εάν το πρόβλημα επιμείνει ενημερώσέ μας."},"not_found":{"title":"Το νήμα δεν βρέθηκε.","description":"Συγνώμη, δεν μπορέσαμε να βρούμε αυτό το νήμα συζήτησης. Μήπως έχει αφαιρεθεί από κάποιον συντονιστή;"},"unread_posts":{"one":"έχεις %{count} αδιάβαστη ανάρτηση σε αυτό το νήμα","other":"έχεις %{count} αδιάβαστες αναρτήσεις σε αυτό το νήμα"},"likes":{"one":"υπάρχει %{count} «Μου αρέσει» σε αυτό το νήμα","other":"υπάρχουν %{count} «μου αρέσει» σε αυτό το νήμα"},"back_to_list":"Επιστροφή στη Λίστα Νημάτων","options":"Ρυθμίσεις Νήματος","show_links":"εμφάνιση συνδέσμων εντός του νήματος","read_more_in_category":"Θέλεις να διαβάσεις περισσότερα; Βρες άλλα νήματα στο %{catLink} ή %{latestLink}.","read_more":"Θέλεις να διαβασεις περισσότερα; %{catLink} ή %{latestLink}.","unread_indicator":"Κανένα μέλος δεν έχει διαβάσει ακόμη την τελευταία ανάρτηση αυτού του θέματος.","browse_all_categories":"Περιήγηση σε όλες τις κατηγορίες","browse_all_tags":"Περιηγηθείτε σε όλες τις ετικέτες","view_latest_topics":"δες τα πρόσφατα νήματα","jump_reply_up":"μετάβαση στην απάντηση που προηγείται","jump_reply_down":"μετάβαση στην απάντηση που ακολουθεί","deleted":"Το νήμα έχει διαγραφεί ","slow_mode_update":{"enable":"Ενεργοποίηση","remove":"Απενεργοποίηση","hours":"ώρες:","durations":{"10_minutes":"10 Λεπτά","15_minutes":"15 Λεπτά","30_minutes":"30 Λεπτά","45_minutes":"45 Λεπτά","1_hour":"1 ώρα","2_hours":"2 Ώρες","4_hours":"4 ώρες","8_hours":"8 ώρες","12_hours":"12 ώρες","24_hours":"24 ώρες"}},"topic_status_update":{"title":"Χρονοδιακόπτης Νήματος","save":"Ρύθμιση Χρονοδιακόπτη","num_of_hours":"Ώρες:","num_of_days":"Αριθμός ημερών:","remove":"Αφαίρεση Χρονοδιακόπτη","publish_to":"Δημοσίευση Σε:","when":"Πότε:","time_frame_required":"Παρακαλώ επιλέξτε ένα χρονικό πλαίσιο"},"auto_update_input":{"none":"Επιλέξτε χρονικό περιθώριο","now":"Τώρα","later_today":"Αργότερα σήμερα","tomorrow":"Αύριο","later_this_week":"Αργότερα αυτή την εβδομάδα","this_weekend":"Αυτό το Σαββατοκύριακο","next_week":"Την άλλη εβδομάδα","next_month":"Τον άλλο μήνα","forever":"Για Πάντα","pick_date_and_time":"Επίλεξε ημερομηνία και ώρα","set_based_on_last_post":"Κλείσε ανάλογα με την τελευταία ανάρτηση"},"publish_to_category":{"title":"Χρονοδιάγραμμα Δημοσιεύσεων"},"temp_open":{"title":"Ανοιχτό Προσωρινά"},"temp_close":{"title":"Κλειστό Προσωρινά"},"auto_close":{"title":"Αυτόματο κλείσιμο νήματος","error":"Παρακαλώ εισάγετε μια έγκυρη αξία.","based_on_last_post":"Να μην κλείσει μέχρι η τελευταία ανάρτηση στο νήμα να είναι τόσο παλιά."},"auto_delete":{"title":"Αυτόματη διαγραφή νήματος"},"auto_bump":{"title":"Αυτόματη ώθηση θέματος"},"reminder":{"title":"Υπενθύμισέ Μου"},"auto_delete_replies":{"title":"Αυτόματη διαγραφή απαντήσεων"},"status_update_notice":{"auto_open":"Αυτό το νήμα θα ανοίξει αυτόματα σε %{timeLeft}.","auto_close":"Αυτό το νήμα θα κλείσει αυτόματα σε %{timeLeft}.","auto_publish_to_category":"Αυτό το νήμα θα αναρτηθεί στην κατηγορία \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_after_last_post":"Αυτό το νήμα θα κλείσει σε %{duration} μετά την τελευταία απάντηση.","auto_delete":"Αυτό το νήμα θα διαγραφεί αυτόματα σε %{timeLeft}.","auto_bump":"Αυτό το θέμα θα ωθηθεί αυτόματα %{timeLeft}.","auto_reminder":"Θα λάβεις υπενθύμιση σχετικά με αυτό το νήμα σε %{timeLeft}.","auto_delete_replies":"Οι απαντήσεις σε αυτό το θέμα διαγράφονται αυτόματα μετά από %{duration}."},"auto_close_title":"Ρυθμίσεις για το αυτόματο κλείσιμο","auto_close_immediate":{"one":"Η τελευταία δημοσίευση στο νήμα είναι ήδη %{count} ώρα παλιό, έτσι το νήμα θα κλείσει αμέσως.","other":"Η τελευταία ανάρτηση είναι ήδη %{count} ώρες παλιά, έτσι το νήμα θα κλείσει αμέσως."},"timeline":{"back":"Πίσω","back_description":"Πήγαινε πίσω στην τελευταία μη αναγνωσμένη ανάρτηση","replies_short":"%{current} / %{total}"},"progress":{"title":"πρόοδος νήματος","go_top":"αρχή","go_bottom":"τέλος","go":"πάμε","jump_bottom":"μετάβαση στην τελευταία ανάρτηση","jump_prompt":"μετάβαση σε...","jump_prompt_long":"Μετάβαση σε...","jump_bottom_with_number":"μετάβαση στην ανάρτηση %{post_number}","jump_prompt_to_date":"μέχρι σήμερα","jump_prompt_or":"ή","total":"σύνολο αναρτήσεων","current":"τρέχουσα ανάρτηση"},"notifications":{"title":"άλλαξε το πόσο συχνά ειδοποιείσαι για αυτό το θέμα","reasons":{"mailing_list_mode":"Έχεις ενεργοποιημένη τη λειτουργία λίστας αποδεκτών αλληλογραφίας, έτσι θα λαμβάνεις ενημερώσεις για τις απαντήσεις για το νήμα μέσω email.","3_10":"Θα λαμβάνεις ειδοποιήσεις επειδή επιτηρείς μια ετικέτα σε αυτό το νήμα.","3_6":"Θα λαμβάνεις ειδοποιήσεις επειδή επιτηρείς αυτήν την κατηγορία.","3_5":"Θα λαμβάνεις ειδοποιήσεις επειδή ξεκίνησες να επιτηρείς αυτόματα αυτό το νήμα.","3_2":"Θα λαμβάνεις ειδοποιήσεις επειδή επιτηρείς αυτό το νήμα.","3_1":"Θα λαμβάνεις ειδοποιήσεις επειδή δημιούργησες αυτό το νήμα.","3":"Θα λαμβάνεις ειδοποιήσεις επειδή επιτηρείς αυτό το νήμα.","2_8":"Θα βλέπεις έναν μετρητή νέων απαντήσεων επειδή παρακολουθείς αυτήν την κατηγορία.","2_4":"Θα βλέπεις έναν μετρητή νέων απαντήσεων επειδή απάντησες σε αυτό το νήμα.","2_2":"Θα βλέπεις έναν μετρητή νέων απαντήσεων επειδή παρακολουθείς αυτό το νήμα.","2":"You will see a count of new replies because you \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eread this topic\u003c/a\u003e.","1_2":"Θα λαμβάνεις ειδοποιήσεις εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα.","1":"Θα λαμβάνεις ειδοποιήσεις εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα.","0_7":"Αγνοείς όλες τις ειδοποιήσεις αυτής της κατηγορίας.","0_2":"Αγνοείς όλες τις ειδοποιήσεις αυτού του νήματος.","0":"Αγνοείς όλες τις ειδοποιήσεις αυτού του νήματος."},"watching_pm":{"title":"Επιτηρείται","description":"Θα λαμβάνεις ειδοποιήσεις για κάθε νέα απάντηση σε αυτό το μήνυμα και ένας μετρητής νέων απαντήσεων θα εμφανίζεται."},"watching":{"title":"Επιτηρείται","description":"Θα λαμβάνεις ειδοποιήσεις για κάθε νέα απάντηση σε αυτό το νήμα και ένας μετρητής νέων απαντήσεων θα εμφανίζεται."},"tracking_pm":{"title":"Παρακολουθείται","description":"Ένας μετρητής νέων απαντήσεων θα εμφανίζεται για αυτό το μήνυμα. Θα λαμβάνεις ειδοποιήσεις εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα."},"tracking":{"title":"Παρακολουθείται","description":"Ένας μετρητής νέων απαντήσεων θα εμφανίζεται για αυτό το νήμα. Θα λαμβάνεις ειδοποιήσεις εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα."},"regular":{"title":"Φυσιολογικό","description":"Θα ειδοποιηθείς εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα."},"regular_pm":{"title":"Φυσιολογικό","description":"Θα ειδοποιηθείς εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα."},"muted_pm":{"title":"Σε σίγαση","description":"Δε θα ειδοποιείσαι ποτέ για οτιδήποτε σχετικά με αυτό το μήνυμα."},"muted":{"title":"Σε σίγαση","description":"Δε θα ειδοποιείσαι ποτέ για οτιδήποτε σχετικά με αυτό το θέμα και δε θα εμφανίζεται στα τελευταία."}},"actions":{"title":"Ενέργειες","recover":"Επαναφορά του νήματος","delete":"Διαγραφή Νήματος","open":"Νέο Νήμα","close":"Κλείσιμο Νήματος","multi_select":"Διάλεξε Αναρτήσεις...","timed_update":"Θέσε Χρονοδιακόπτη Νήματος...","pin":"Καρφίτσωμα Νήματος...","unpin":"Ξεκαρφίτσωμα Νήματος...","unarchive":"Επαναφορά Νήματος από Αρχείο","archive":"Αρχειοθέτηση Νήματος","invisible":"Απόκρυψη Νήματος","visible":"Εμφάνιση Νήματος","reset_read":"Μηδενισμός Διαβασμένων","make_public":"Κάνε Δημόσιο το Νήμα","make_private":"Κάνε προσωπικό μήνυμα","reset_bump_date":"Επαναφορά ημερομηνίας ώθησης"},"feature":{"pin":"Καρφίτσωμα Νήματος","unpin":"Ξεκαρφίτσωμα Νήματος","pin_globally":"Καθολικό Καρφίτσωμα Νήματος","remove_banner":"Αφαίρεση Νήματος Ανακοίνωσης"},"reply":{"title":"Απάντηση","help":"ξεκινήστε να συνθέτετε μια απάντηση σε αυτό το νήμα"},"share":{"title":"Κοινοποίηση","extended_title":"Μοιραστείτε έναν σύνδεσμο","help":"κοινοποίησε έναν σύνδεσμο προς αυτό το νήμα","invite_users":"Πρόσκληση"},"print":{"title":"Εκτύπωση","help":"Άνοιξε μια φιλική έκδοση εκτυπωτή αυτού του νήματος"},"flag_topic":{"title":"Σήμανση","help":"επισήμανε ιδιωτικά αυτό το νήμα για έλεγχο ή στείλε μια προσωπική ειδοποίηση σχετικά με αυτό","success_message":"Επισήμανες αυτό το νήμα."},"make_public":{"title":"Μετατροπή σε δημόσιο θέμα","choose_category":"Παρακαλώ επιλέξτε μια κατηγορία για το δημόσιο θέμα:"},"feature_topic":{"title":"Θέσε το νήμα σε προβολή","pin":"Το νήμα αυτό να εμφανίζεται στην κορυφή της %{categoryLink} κατηγορίας μέχρι","unpin":"Απομάκρυνε το νήμα από την κορυφή της κατηγορίας %{categoryLink}.","unpin_until":"Απομάκρυνε το νήμα από την κορυφή της %{categoryLink} κατηγορίας ή περίμενε μέχρι \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Οι χρήστες μπορούν να ξεκαρφιτσώσουν αυτό το νήμα ο καθένας για τον εαυτό του.","pin_validation":"Απαιτείται ημερομηνία για να καρφιτσώσεις το νήμα.","not_pinned":"Δεν υπάρχουν νήματα καρφιτσωμένα σε %{categoryLink}.","already_pinned":{"one":"Νήμα καρφιτσωμένο σε %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Νήματα καρφιτσωμένα σε %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Εμφάνισε αυτό το νήμα στην κορυφή όλων των λιστών νημάτων μέχρι","unpin_globally":"Αφαίρεσε αυτό το νήμα από την κορυφή όλων των λίστων νημάτων","unpin_globally_until":"Αφαίρεσε αυτό το νήμα από την κορυφή όλων των λίστων νημάτων ή περίμενε μέχρι \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Οι χρήστες μπορούν να ξεκαρφιτσώσουν το νήμα ο καθένας για τον εαυτό του.","not_pinned_globally":"Δεν υπάρχουν καθολικά καρφιτσωμένα νήματα.","already_pinned_globally":{"one":"Πρόσφατα καθολικά καρφιτσωμένα νήματα:\u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Πρόσφατα καθολικά καρφιτσωμένα νήματα: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Αυτό το νήμα να γίνει νήμα ανακοίνωσης και να εμφανίζεται στην κορυφή όλων των σελίδων.","remove_banner":"Αφαίρεσε το νήμα ανακοίνωσης το οποίο εμφανίζεται στην κορυφή όλων των σελίδων.","banner_note":"Οι χρήστες μπορούν να κλείσουν την ανακοίνωση έτσι ώστε να μην εμφανίζεται σε αυτούς. Ένα μόνο νήμα μπορεί να είναι νήμα ανακοίνωσης κάθε φορά.","no_banner_exists":"Δεν υπάρχει νήμα ανακοίνωσης.","banner_exists":"\u003cstrong class='badge badge-notification unread'\u003eΥπάρχει\u003c/strong\u003e προς το παρόν ένα νήμα ανακοίνωσης."},"inviting":"Οι προσκλήσεις αποστέλλονται...","automatically_add_to_groups":"Αυτή η πρόσκληση συμπεριλαμβάνει επίσης και πρόσβαση σε αυτές τις ομάδες:","invite_private":{"title":"Πρόσκληση σε Μήνυμα","email_or_username":"Διεύθυνση email ή όνομα χρήστη του προσκεκλημένου","email_or_username_placeholder":"διεύθυνση email ή όνομα χρήστη","action":"Πρόσκληση","success":"Προσκαλέσαμε το χρήστη να συμμετέχει σε αυτό το μήνυμα.","success_group":"Προσκαλέσαμε την ομάδα να συμμετέχει σε αυτό το μήνυμα.","error":"Συγγνώμη, παρουσιάστηκε σφάλμα κατά την πρόσκληση αυτού του χρήστη.","not_allowed":"Λυπάμαι, αυτός ο χρήστης δε μπορεί να προσκληθεί.","group_name":"όνομα ομάδας"},"controls":"Λειτουργίες Νήματος","invite_reply":{"title":"Πρόσκληση","username_placeholder":"όνομα χρήστη","action":"Αποστολή Πρόσκλησης","help":"να προσκληθούν και άλλοι σε αυτό το νήμα με email ή με ειδοποίηση","discourse_connect_enabled":"Δώσε το όνομα χρήστη του ατόμου που θα ήθελες να προσκαλέσεις σε αυτό το νήμα.","to_topic_blank":"Δώσε το όνομα χρήστη ή το email του ατόμου που θα ήθελες να προσκαλέσεις σε αυτό το νήμα.","to_topic_email":"Έδωσες μια διεύθυνση email. Θα στείλουμε μια πρόσκληση που θα επιτρέπει στον παραλήπτη να απαντήσει άμεσα σε αυτό το νήμα.","to_topic_username":"Έδωσες όνομα χρήστη. Θα στείλουμε ειδοποίηση με ένα σύνδεσμο πρόσκλησης προς αυτό το νήμα.","to_username":"Δώσε το όνομα χρήστη του ατόμου που θα ήθελες να προσκαλέσεις. Θα στείλουμε ειδοποίηση με ένα σύνδεσμο πρόσκλησης προς αυτό το νήμα.","email_placeholder":"name@example.com","success_email":"Στείλαμε μια πρόσκληση στον/στην \u003cb\u003e%{invitee}\u003c/b\u003e. Θα σε ειδοποιήσουμε όταν η πρόσκληση γίνει αποδεκτή. Στη σελίδα του προφίλ σου μπορείς να παρακολουθήσεις την εξέλιξη όλων των προσκλήσεών σου.","success_username":"Προσκαλέσαμε τον χρήστη να συμμετέχει σε αυτό το νήμα.","error":"Λυπούμαστε αλλά δεν μπορέσαμε να προσκαλέσουμε αυτό το άτομο. Μήπως έχει ήδη προσκληθεί; (ο ρυθμός αποστολής προσκλήσεων είναι περιορισμένος)","success_existing_email":"Ο χρήστης με email \u003cb\u003e%{emailOrUsername}\u003c/b\u003e υπάρχει ήδη. Προσκαλέσαμε αυτόν τον χρήστης να συμμετέχει στο νήμα."},"login_reply":"Συνδέσου για να απαντήσεις","filters":{"n_posts":{"one":"%{count} ανάρτηση","other":"%{count} αναρτήσεις"},"cancel":"Αφαίρεση φίλτρου"},"move_to":{"title":"Μετακίνηση σε","action":"μετακίνηση σε","error":"Παρουσιάστηκε σφάλμα κατά τη μετακίνηση αναρτήσεων."},"split_topic":{"title":"Μεταφορά σε Νέο Νήμα ","action":"μεταφορά σε νέο νήμα ","topic_name":"Νέος τίτλος θέματος","radio_label":"Νέο Νήμα","error":"Παρουσιάστηκε σφάλμα κατά τη μεταφορά των αναρτήσεων στο νέο νήμα.","instructions":{"one":"Ετοιμάζεσαι να δημιουργήσεις ένα νέο νήμα και να μεταφέρεις σε αυτό την επιλεγμένη ανάρτηση.","other":"Ετοιμάζεσαι να δημιουργήσεις ένα νέο νήμα και να μεταφέρεις σε αυτό τις \u003cb\u003e%{count}\u003c/b\u003e επιλεγμένες αναρτήσεις."}},"merge_topic":{"title":"Μεταφορά σε Υφιστάμενο Νήμα","action":"μεταφορά σε υφιστάμενο νήμα","error":"Παρουσιάστηκε σφάλμα κατά τη μεταφορά των αναρτήσεων σε αυτό το νήμα. ","radio_label":"Υπάρχον θέμα","instructions":{"one":"Παρακαλώ επίλεξε το νήμα στο οποίο θέλεις να μεταφέρεις την ανάρτηση.","other":"Παρακαλώ επίλεξε το νήμα στο οποίο θέλεις να μεταφέρεις τις \u003cb\u003e%{count}\u003c/b\u003e αυτές αναρτήσεις."}},"move_to_new_message":{"title":"Μετακίνηση σε νέο μήνυμα","action":"μετακίνηση σε νέο μήνυμα","message_title":"Τίτλος νέου μηνύματος","radio_label":"Νέο Μήνυμα","participants":"Συμμετέχοντες","instructions":{"one":"Πρόκειται να δημιουργήσετε ένα νέο μήνυμα και να το συμπληρώσετε με την ανάρτηση που έχετε επιλέξει.","other":"Πρόκειται να δημιουργήσετε ένα νέο μήνυμα και να το συμπληρώσετε με τις \u003cb\u003e%{count}\u003c/b\u003e αναρτήσεις που έχετε επιλέξει."}},"move_to_existing_message":{"title":"Μετακίνηση σε υπάρχον μήνυμα","action":"μετακίνηση σε υπάρχον μήνυμα","radio_label":"Υπάρχον μήνυμα","participants":"Συμμετέχοντες","instructions":{"one":"Παρακαλώ επιλέξτε το μήνυμα στο οποίο θέλετε να μετακινήσετε αυτήν την ανάρτηση.","other":"Παρακαλώ επιλέξτε το μήνυμα στο οποίο θέλετε να μετακινήσετε αυτές τις \u003cb\u003e%{count}\u003c/b\u003e αναρτήσεις."}},"merge_posts":{"title":"Συγχώνευσε Επιλεγμένες Αναρτήσεις","action":"συγχώνευσε επιλεγμένες αναρτήσεις","error":"Προέκυψε σφάλμα κατά τη συγχώνευση των επιλεγμένων αναρτήσεων."},"publish_page":{"title":"Δημοσίευση σελίδας","publish":"Δημοσιεύστε","description":"Όταν ένα θέμα δημοσιεύεται ως σελίδα, η διεύθυνση URL του μπορεί να κοινοποιηθεί και θα εμφανίζεται με προσαρμοσμένο στυλ.","slug":"Slug","public":"Δημόσια","public_description":"Οι χρήστες μπορούν να δουν τη σελίδα ακόμα και αν το σχετικό θέμα είναι ιδιωτικό.","publish_url":"Η σελίδα σας έχει δημοσιευτεί στη διεύθυνση:","topic_published":"Το θέμα σας έχει δημοσιευτεί στη διεύθυνση:","preview_url":"Η σελίδα σας θα δημοσιευτεί στη διεύθυνση:","invalid_slug":"Λυπάμαι, δε μπορείτε να δημοσιεύσετε αυτήν τη σελίδα.","unpublish":"Κατάργηση δημοσίευσης","unpublished":"Η σελίδα σας δεν έχει δημοσιευτεί και δεν είναι πλέον προσβάσιμη.","publishing_settings":"Ρυθμίσεις δημοσίευσης"},"change_owner":{"title":"Αλλαγή ιδιοκτήτη","action":"αλλαγή ιδιοκτήτη","error":"Παρουσιάστηκε ένα σφάλμα κατά την αλλαγή του ιδιοκτήτη των αναρτήσεων.","placeholder":"όνομα χρήστη του νέου ιδιοκτήτη","instructions":{"one":"Παρακαλώ επιλέξτε έναν νέο ιδιοκτήτη για την ανάρτηση από \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Παρακαλώ επιλέξτε έναν νέο ιδιοκτήτη για τις %{count} αναρτήσεις από \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Παρακαλώ επιλέξτε έναν νέο ιδιοκτήτη για την ανάρτηση","other":"Παρακαλώ επιλέξτε έναν νέο ιδιοκτήτη για τις %{count} αναρτήσεις"}},"change_timestamp":{"title":"Αλλαγή Χρονοσήμανσης...","action":"αλλαγή χρονοσήμανσης","invalid_timestamp":"Η χρονοσήμανση δεν μπορεί να υπάρξει στο μέλλον.","error":"Προέκυψε σφάλμα κατά την αλλαγή χρονοσήμανσης του νήματος.","instructions":"Παρακαλώ επίλεξε τη νέα χρονοσήμανση του νήματος. Οι αναρτήσεις του νήματος θα ενημερωθούν ώστε να έχουν την ίδια διαφορά ώρας."},"multi_select":{"select":"επίλεξε","selected":"επιλεγμένες (%{count})","select_post":{"label":"επίλεξε","title":"Προσθήκη ανάρτησης στην επιλογή"},"selected_post":{"label":"επιλεγμένη","title":"Κάντε κλικ για να αφαιρέσετε την ανάρτηση από την επιλογή"},"select_replies":{"label":"επίλεξε +απαντήσεις","title":"Προσθέστε την ανάρτηση και όλες τις απαντήσεις της στην επιλογή"},"select_below":{"label":"επιλέξτε + παρακάτω","title":"Προσθέστε την ανάρτηση και όλες μετά από αυτήν στην επιλογή"},"delete":"διαγραφή επιλεγμένων","cancel":"ακύρωση επιλογής","select_all":"επιλογή όλων","deselect_all":"απεπιλογή όλων","description":{"one":"Έχεις επιλέξει \u003cb\u003e%{count}\u003c/b\u003e ανάρτηση.","other":"Έχεις επιλέξει \u003cb\u003e%{count}\u003c/b\u003e αναρτήσεις."}}},"post":{"quote_reply":"Παράθεση","quote_share":"Κοινοποίηση","edit_reason":"Αιτία:","post_number":"ανάρτηση %{number}","ignored":"Περιεχόμενο που αγνοείται","reply_as_new_topic":"Απάντηση με διασυνδεδεμένο νήμα","reply_as_new_private_message":"Απάντηση ως νέο μήνυμα στον ίδιο παραλήπτη","continue_discussion":"Συνέχιση της συζήτησης από το %{postLink}:","follow_quote":"πήγαινε στην παρατεθειμένη ανάρτηση","show_full":"Δείξε Πλήρη Ανάρτηση ","show_hidden":"Προβολή περιεχομένου που αγνοείται.","collapse":"σύμπτυξη","expand_collapse":"επέκταση/σύμπτυξη","locked":"ένα μέλος του προσωπικού έχει κλειδώσει αυτήν την ανάρτηση από την επεξεργασία","gap":{"one":"δες %{count} κρυφή απάντηση","other":"δες %{count} κρυφές απαντήσεις"},"notice":{"new_user":"Αυτή είναι η πρώτη φορά που έκανε ανάρτηση ο/η %{user} - ας τον/την καλωσορίσουμε στην κοινότητά μας!","returning_user":"Έχει περάσει λίγος καιρός από τότε που είδαμε τον/την %{user} — η τελευταία ανάρτηση ήταν στις %{time}."},"unread":"Η ανάρτηση δεν έχει διαβαστεί","has_replies":{"one":"%{count} Απάντηση","other":"%{count} Απαντήσεις"},"unknown_user":"(άγνωστος/διαγραμμένος χρήστης)","has_likes_title":{"one":"%{count} άτομο πάτησε \"μου αρέσει\" στη δημοσίευση","other":"%{count} άτομα πάτησαν \"Μου αρέσει\" στην ανάρτηση"},"has_likes_title_only_you":"σου αρέσει αυτή η ανάρτηση","has_likes_title_you":{"one":"εσύ και %{count} άλλο άτομο πάτησε \"Μου αρέσει\" στη δημοσίευση","other":"εσύ και %{count} ακόμα άτομα πατήσατε \"Μου αρέσει\" στην ανάρτηση"},"errors":{"create":"Λυπούμαστε, παρουσιάστηκε σφάλμα κατά την δημιουργία της ανάρτησης. Προσπάθησε πάλι.","edit":"Λυπούμαστε, παρουσιάστηκε σφάλμα κατά την επεξεργασία της ανάρτησης. Προσπάθησε πάλι.","upload":"Λυπούμαστε, παρουσιάστηκε σφάλμα κατά το ανέβασμα του αρχείου. Προσπάθησε πάλι.","file_too_large":"Δυστυχώς, αυτό το αρχείο είναι πολύ μεγάλο (το μέγιστο μέγεθος είναι %{max_size_kb}kb). Γιατί δεν επιφορτώνετε το μεγάλο αρχείο σας σε μια cloud υπηρεσία διαμοιρασμού και, στη συνέχεια, να επικολλήσετε τον σύνδεσμο;","too_many_uploads":"Λυπούμαστε, μπορείς να ανεβάζεις μόνο ένα αρχείο τη φορά.","upload_not_authorized":"Λυπούμαστε, το αρχείο που προσπαθείς να ανεβάσεις δεν επιτρέπεται (επιτρεπόμενες επεκτάσεις:%{authorized_extensions})","image_upload_not_allowed_for_new_user":"Λυπούμαστε, οι νέοι χρήστες δεν μπορούν να ανεβάσουν εικόνες.","attachment_upload_not_allowed_for_new_user":"Λυπούμαστε, οι νέοι χρήστες δεν μπορούν να επισυνάψουν αρχεία.","attachment_download_requires_login":"Λυπούμαστε, για να κατεβάσεις συνημμένα αρχεία, πρέπει πρώτα να συνδεθείς."},"cancel_composer":{"discard":"Απόρριψη"},"via_email":"αυτή η ανάρτηση ήρθε μέσω email","via_auto_generated_email":"αυτή η ανάρτηση ήρθε μέσω ενός email που δημιουργήθηκε αυτόματα","whisper":"αυτή η ανάρτηση είναι εμπιστευτική προς τους συντονιστές","wiki":{"about":"αυτή η ανάρτηση είναι βίκι"},"few_likes_left":"Ευχαριστούμε που μοιράστηκες την αγάπη σου! Έχεις μόνο μερικά \"μου αρέσει\" ακόμα να χρησιμοποιήσεις σήμερα.","controls":{"reply":"απάντησε σε αυτή την ανάρτηση","like":"αυτή η ανάρτηση μου αρέσει","has_liked":"σου άρεσε αυτή η ανάρτηση","read_indicator":"μέλη που διαβάζουν αυτήν την ανάρτηση","undo_like":"δεν μου αρέσει πια","edit":"επεξεργασία ανάρτησης","edit_action":"Επεξεργασία","edit_anonymous":"Λυπούμαστε, αλλά για να επεξεργαστείς αυτή την ανάρτηση πρέπει πρώτα να συνδεθείς.","flag":"ανέφερε την ανάρτηση στους συντονιστές ή στείλε μια προσωπική ειδοποίηση σχετικά με αυτή","delete":"διαγραφή ανάρτησης","undelete":"επαναφορά ανάρτησης","share":"κοινοποίησε έναν σύνδεσμο προς αυτή την ανάρτηση ","more":"Περισσότερα","delete_replies":{"confirm":"Θέλετε επίσης να διαγράψετε τις απαντήσεις σε αυτήν την ανάρτηση;","direct_replies":{"one":"Ναι, και %{count} άμεση απάντηση","other":"Ναι, και %{count} άμεσες απαντήσεις"},"all_replies":{"one":"Ναι, και %{count} απάντηση","other":"Ναι, και όλες οι %{count} απαντήσεις"},"just_the_post":"Όχι, σβήσε μόνο την ανάρτηση"},"admin":"ενέργειες διαχειριστή ανάρτησης","wiki":"Δημιουργία Βίκι","unwiki":"Αφαίρεση Βίκι","convert_to_moderator":"Πρόσθεσε Χρώμα Συνεργάτη","revert_to_regular":"Αφαίρεσε Χρώμα Συνεργάτη","rebake":"Ανανέωση HTML","publish_page":"Δημοσίευση σελίδας","unhide":"Επανεμφάνιση","change_owner":"Αλλαγή Ιδιοκτησίας","grant_badge":"Απονομή Παράσημου","lock_post":"Κλείδωμα ανάρτησης","lock_post_description":"αποτρέψτε τον συντάκτη από την επεξεργασία αυτής της ανάρτησης","unlock_post":"Ξεκλείδωμα ανάρτησης","unlock_post_description":"επιτρέψτε στον συντάκτη να επεξεργαστεί αυτήν την ανάρτηση","delete_topic_disallowed_modal":"Δεν έχετε άδεια διαγραφής αυτού του θέματος. Εάν θέλετε πραγματικά να διαγραφεί, υποβάλετε μια επισήμανση για προσοχή από συντονιστή μαζί με το σκεπτικό.","delete_topic_disallowed":"δεν έχετε άδεια να διαγράψετε αυτό το θέμα","delete_topic":"διαγραφή νήματος","add_post_notice":"Προσθήκη ειδοποίησης προσωπικού","remove_timer":"αφαίρεση χρονοδιακόπτη"},"actions":{"people":{"like":{"one":"άρεσε","other":"άρεσαν"},"read":{"one":"διάβασε","other":"διάβασαν"},"like_capped":{"one":"και %{count} άλλος το άρεσε αυτό ","other":"και %{count} άλλοι το άρεσαν αυτό "},"read_capped":{"one":"και %{count} άλλοι το διάβασαν","other":"και %{count} άλλοι το διάβασαν"}},"by_you":{"off_topic":"Το επισήμανες σαν εκτός θέματος","spam":"Το επισήμανες σαν ανεπιθύμητο","inappropriate":"Το επισήμανες σαν ανάρμοστο","notify_moderators":"Το επισήμανες στους συντονιστές","notify_user":"Έστειλες ένα μήνυμα σε αυτόν τον χρήστη"}},"delete":{"confirm":{"one":"Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτήν την ανάρτηση;","other":"Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτές τις %{count} αναρτήσεις;"}},"merge":{"confirm":{"one":"Είσαι σίγουρος πως θέλεις να συγχωνεύσεις αυτές τις δημοσιεύσεις;","other":"Είσαι σίγουρος πως θέλεις να συγχωνεύσεις αυτές τις %{count} αναρτήσεις;"}},"revisions":{"controls":{"first":"Πρώτη αναθεώρηση","previous":"Προηγούμενη αναθεώρηση","next":"Επόμενη αναθεώρηση","last":"Τελευταία αναθεώρηση","hide":"Κρύψε την αναθεώρηση","show":"Εμφάνισε την αναθεώρηση","revert":"Επαναφορά στην αναθεώρηση %{revision}","edit_wiki":"Επεξεργασία του Βίκι","edit_post":"Επεξεργασία Ανάρτησης","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Δείξε το φορμαρισμένο κείμενο με τις αλλαγές και προσθηκες ενσωματωμένες σε αυτό","button":"HTML"},"side_by_side":{"title":"Δείξε τις αλλαγές στο φορμαρισμένο κείμενο δίπλα-δίπλα","button":"HTML"},"side_by_side_markdown":{"title":"Δείξε τις αλλαγές στο αρχικό κείμενο δίπλα-δίπλα","button":"Ακατέργαστο"}}},"raw_email":{"displays":{"raw":{"title":"Εμφάνιση ακατέργαστου email","button":"Ακατέργαστο"},"text_part":{"title":"Εμφάνιση του τμήματος κειμένου του email","button":"Κείμενο"},"html_part":{"title":"Εμφάνιση του τμήματος html του email","button":"HTML"}}},"bookmarks":{"create":"Δημιουργία σελιδοδείκτη","edit":"Επεξεργασία σελιδοδείκτη","created":"Δημιουργήθηκε","updated":"Ενημερώθηκε","name":"Όνομα","name_placeholder":"Σε τι χρησιμεύει αυτός ο σελιδοδείκτης;","set_reminder":"Υπενθύμισέ μου","options":"Επιλογές","actions":{"delete_bookmark":{"name":"Διαγραφή σελιδοδείκτη","description":"Αφαιρεί τον σελιδοδείκτη από το προφίλ σας και σταματά όλες τις υπενθυμίσεις για τον σελιδοδείκτη"},"edit_bookmark":{"name":"Επεξεργασία σελιδοδείκτη","description":"Επεξεργαστείτε το όνομα του σελιδοδείκτη ή αλλάξτε την ημερομηνία και την ώρα υπενθύμισης"}}}},"category":{"none":"(χωρίς κατηγορία)","all":"Όλες οι κατηγορίες","choose":"κατηγορία\u0026hellip;","edit":"Επεξεργασία","edit_dialog_title":"Επεξεργασία: %{categoryName}","view":"Προβολή Νημάτων στην Κατηγορία","general":"Γενικά","settings":"Ρυθμίσεις","topic_template":"Πρότυπο Νήματος","tags":"Ετικέτες","tags_allowed_tags":"Περιορίστε αυτές τις ετικέτες σε αυτήν την κατηγορία:","tags_allowed_tag_groups":"Περιορίστε αυτές τις ομάδες ετικετών σε αυτήν την κατηγορία:","tags_placeholder":"(Προαιρετική) λίστα επιτρεπόμενων ετικετών","tags_tab_description":"Οι ετικέτες και οι ομάδες ετικετών που καθορίζονται παραπάνω θα είναι διαθέσιμες μόνο σε αυτήν την κατηγορία και άλλες κατηγορίες που τις καθορίζουν επίσης. Δε θα είναι διαθέσιμες για χρήση σε άλλες κατηγορίες.","tag_groups_placeholder":"(Προαιρετική) λίστα επιτρεπόμενων ομάδων ετικετών","allow_global_tags_label":"Επιτρέψτε επίσης άλλες ετικέτες","tag_group_selector_placeholder":"(Προαιρετικό) Ομάδα ετικετών","required_tag_group_description":"Απαιτήστε τα νέα θέματα να έχουν ετικέτες από μια ομάδα ετικετών:","min_tags_from_required_group_label":"Αριθμός ετικετών:","required_tag_group_label":"Ομάδα ετικετών:","topic_featured_link_allowed":"Επίτρεψε προτεινόμενους συνδέσμους σε αυτή την κατηγορία","delete":"Διαγραφή Κατηγορίας","create":"Νέα Κατηγορία","create_long":"Δημιουργία νέας κατηγορίας","save":"Αποθήκευση Κατηγορίας","slug":"Φιλικό Όνομα Κατηγορίας","slug_placeholder":"(Προαιρετικά) λέξεις ενωμένες με παύλα για το URL","creation_error":"Παρουσιάστηκε κάποιο σφάλμα κατά την δημιουργία της κατηγορίας","save_error":"Παρουσιάστηκε κάποιο σφάλμα κατά την αποθήκευση της κατηγορίας.","name":"Όνομα Κατηγορίας","description":"Περιγραφή","logo":"Εικονίδιο Κατηγορίας","background_image":"Εικόνα Φόντου Κατηγορίας","badge_colors":"Χρώματα παρασήμων","background_color":"Χρώμα φόντου","foreground_color":"Χρώμα στο προσκήνιο","name_placeholder":"Μια ή δύο λέξεις το πολύ","color_placeholder":"Οποιοδήποτε χρώμα","delete_confirm":"Είσαι σίγουρος ότι θέλεις να διαγράψεις αυτή την κατηγορία;","delete_error":"Παρουσιάστηκε κάποιο σφάλμα κατά τη διαγραφή της κατηγορίας.","list":"Λίστα Κατηγοριών","no_description":"Παρακαλώ πρόσθεσε μια περιγραφή στην κατηγορία","change_in_category_topic":"Επεξεργασία Περιγραφής","already_used":"Αυτό το χρώμα έχει χρησιμοποιηθεί σε άλλη κατηγορία","security":"Ασφάλεια","permissions":{"group":"Ομάδα","see":"Δες","reply":"Απάντηση","create":"Δημιουργία"},"special_warning":"Προσοχή: Αυτή η κατηγορία είναι pre-seeded και οι ρυθμίσεις προστασίας δεν μπορούν να επεξεργαστούν. Εάν δεν επιθυμείτε να χρησιμοποιήσετε αυτήν την κατηγορία, διαγράψτε την αντί να την επαναχρησιμοποιήσετε.","uncategorized_security_warning":"Αυτή η κατηγορία είναι ξεχωριστή. Προορίζεται ως περιοχή διατήρησης για θέματα που δεν έχουν κατηγορία. Δε μπορεί να έχει ρυθμίσεις ασφαλείας.","uncategorized_general_warning":"Αυτή η κατηγορία είναι ξεχωριστή. Χρησιμοποιείται ως προεπιλεγμένη κατηγορία για νέα θέματα που δεν έχουν επιλεγμένη κατηγορία. Αν θέλετε να αποτρέψετε αυτήν τη συμπεριφορά και να επιβάλετε επιλογή κατηγορίας, \u003ca href=\"%{settingLink}\"\u003eπαρακαλώ απενεργοποιήστε τη ρύθμιση εδώ\u003c/a\u003e. Εάν θέλετε να αλλάξετε το όνομα ή την περιγραφή, μεταβείτε στο \u003ca href=\"%{customizeLink}\"\u003eΠροσαρμογή/Περιεχόμενο κειμένου\u003c/a\u003e.","pending_permission_change_alert":"Δεν έχετε προσθέσει %{group} σε αυτήν την κατηγορία· κάντε κλικ σε αυτό το κουμπί για να προσθέσετε.","images":"Εικόνες","email_in":"Προσαρμοσμένη διεύθυνση εισερχόμενων email:","email_in_allow_strangers":"Αποδοχή emails από ανώνυμους χρήστες χωρίς λογαριασμό","email_in_disabled":"Η δημιουργία νέων νημάτων μέσω email είναι απενεργοποιημένη στις ρυθμίσεις ιστοσελίδας. Για να επιτραπεί η δημιουργία νέων νημάτων μέσω email,","email_in_disabled_click":"ενεργοποίησε τη ρύθμιση «εισερχόμενα email».","mailinglist_mirror":"Η κατηγορία αντικατοπτρίζει μια λίστα αλληλογραφίας","show_subcategory_list":"Προβολή λίστας υποκατηγοριών πάνω απο τα νήματα αυτής της κατηγορίας ","read_only_banner":"Κείμενο banner όταν ένας χρήστης δε μπορεί να δημιουργήσει ένα θέμα σε αυτήν την κατηγορία:","num_featured_topics":"Αριθμός νημάτων που εμφανίζονται στην σελίδα κατηγοριών:","subcategory_num_featured_topics":"Αριθμός προτεινόμενων νημάτων στην σελίδα της γονικής κατηγορίας:","all_topics_wiki":"Κάντε τα νέα θέματα wikis από προεπιλογή","subcategory_list_style":"Μορφή Λίστας Υποκατηγορίων:","sort_order":"Ταξινόμηση Λίστας Νημάτων Κατά:","default_view":"Προκαθορισμένη Λίστα Νημάτων:","default_top_period":"Προκαθορισμένη Περίοδος Κορυφαίων:","default_list_filter":"Προεπιλεγμένο φίλτρο λίστας:","allow_badges_label":"Να επιτρέπεται η απονομή παράσημων σε αυτή την κατηγορία","edit_permissions":"Επεξεργασία Δικαιωμάτων","reviewable_by_group":"Εκτός από το προσωπικό, το περιεχόμενο αυτής της κατηγορίας μπορεί επίσης να αναθεωρηθεί από:","review_group_name":"όνομα ομάδας","require_topic_approval":"Απαιτήστε έγκριση συντονιστή για όλα τα νέα θέματα","require_reply_approval":"Απαιτήστε έγκριση συντονιστή για όλες τις νέες απαντήσεις","this_year":"φέτος","position":"Θέση στη σελίδα κατηγοριών:","default_position":"Προκαθορισμένη Θέση","position_disabled":"Οι κατηγορίες εμφανίζονται ανάλογα με το πόσο ενεργές είναι. Για να αλλάξει η σειρά εμφάνισης των κατηγοριών, ","position_disabled_click":"ενεργοποίησε τη ρύθμιση «σταθερές θεσεις κατηγοριών»","minimum_required_tags":"Ελάχιστος αριθμός ετικετών που απαιτούνται σε ένα θέμα:","parent":"Μητρική Κατηγορία","num_auto_bump_daily":"Αριθμός ανοιχτών θεμάτων για αυτόματη ώθηση καθημερινά:","navigate_to_first_post_after_read":"Μεταβείτε στην πρώτη ανάρτηση μετά την ανάγνωση των θεμάτων","notifications":{"watching":{"title":"Επιτηρείται"},"watching_first_post":{"title":"Επιτήρηση Πρώτης Ανάρτησης","description":"Θα ειδοποιηθείτε για νέα θέματα σε αυτήν την κατηγορία αλλά όχι για απαντήσεις στα θέματα."},"tracking":{"title":"Παρακολουθείται"},"regular":{"title":"Φυσιολογικά","description":"Θα ειδοποιείσαι εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε εσένα."},"muted":{"title":"Σε σιγή"}},"search_priority":{"label":"Προτεραιότητα αναζήτησης","options":{"normal":"Φυσιολογικά","ignore":"Αγνόηση","very_low":"Πολύ χαμηλή","low":"Χαμηλή","high":"Υψηλή","very_high":"Πολύ υψηλή"}},"sort_options":{"default":"προεπιλογή","likes":"Αρέσει","op_likes":"\"Μου αρέσει\" Αρχικής Ανάρτησης","views":"Προβολές","posts":"Αναρτήσεις","activity":"Δραστηριότητα","posters":"Συμμετέχοντες","category":"Κατηγορία","created":"Δημιουργήθηκε"},"sort_ascending":"Αύξουσα","sort_descending":"Φθίνουσα","subcategory_list_styles":{"rows":"Σειρές","rows_with_featured_topics":"Σειρές με προτεινόμενα νήματα","boxes":"Κουτιά","boxes_with_featured_topics":"Κουτιά με προτεινόμενα νήματα"},"settings_sections":{"general":"Γενικά","moderation":"Συντονισμός","appearance":"Εμφάνιση","email":"Διεύθυνση Email"},"list_filters":{"all":"όλα τα θέματα","none":"χωρίς υποκατηγορίες"}},"flagging":{"title":"Ευχαριστούμε για τη συνεισφορά σου!","action":"Επισήμανση Ανάρτησης","take_action_options":{"default":{"title":"Λάβε Δράση","details":"Να φτάσει αμέσως στο όριο των απαραίτητων ειδοποιήσεων, αντί να περιμένει και άλλες ειδοποιήσεις από την κοινότητα."},"suspend":{"title":"Αποβολή Χρήστη."},"silence":{"title":"Σίγαση Χρήστη"}},"notify_action":"Μήνυμα","official_warning":"Επίσημη Προειδοποίηση","delete_spammer":"Διαγραφή Ανεπιθύμητου","yes_delete_spammer":"Ναι, σβήσε τον ανεπιθύμητο χρήστη","ip_address_missing":"(μη διαθέσιμο)","hidden_email_address":"(κρυφό)","submit_tooltip":"Στείλε την κρυφή επισήμανση","take_action_tooltip":"Να φτάσει αμέσως στο όριο των απαραίτητων ειδοποιήσεων, αντί να περιμένει και άλλες ειδοποιήσεις από την κοινότητα.","cant":"Λυπούμαστε, αυτή τη στιγμή δεν γίνεται να επισημάνεις την ανάρτηση.","notify_staff":"Ιδιωτική ειδοποίηση συνεργατών","formatted_name":{"off_topic":"Είναι εκτός θέματος","inappropriate":"Είναι ανάρμοστο","spam":"Είναι ανεπιθύμητο"},"custom_placeholder_notify_user":"Να είσαι συγκεκριμένος, εποικοδομητικός και πάντα φιλικός.","custom_placeholder_notify_moderators":"Παρακαλούμε πες τι ακριβως είναι αυτό που σε ανησυχεί. Αν είναι δυνατό, παράπεμψε σε σχετικούς συνδέσμους και παραδείγματα.","custom_message":{"at_least":{"one":"βάλε τουλάχιστον %{count} χαρακτήρα","other":"γράψε τουλάχιστον %{count} χαρακτήρες"},"more":{"one":"%{count} να πας...","other":"%{count} ακόμα..."},"left":{"one":"%{count} απομένει","other":"%{count} απομένουν"}}},"flagging_topic":{"title":"Ευχαριστούμε για τη συνεισφρορά σου...","action":"Επισήμανση Νήματος","notify_action":"Μήνυμα"},"topic_map":{"title":"Περίληψη Νήματος","participants_title":"Συχνοί Συμμετέχοντες","links_title":"Δημοφιλείς Σύνδεσμοι","links_shown":"εμφάνισε περισσότερους συνδέσμους...","clicks":{"one":"%{count} κλικ","other":"%{count} κλικ"}},"post_links":{"about":"ανάπτυξε περισσότερους συνδέσμους για αυτή την ανάρτηση","title":{"one":"%{count} περισσότερο","other":"%{count} περισσότερα"}},"topic_statuses":{"warning":{"help":"Αυτή είναι μια επίσημη προειδοποίηση."},"bookmarked":{"help":"Τοποθέτησες σελιδοδείκτη σε αυτό το νήμα"},"locked":{"help":"Αυτό το νήμα είναι πια κλειστό. Οι απαντήσεις δεν είναι πλέον δυνατές"},"archived":{"help":"Αυτό το νήμα είναι αρχειοθετημένο. Έχει παγώσει και δεν μπορεί πλέον να τροποποιηθεί"},"locked_and_archived":{"help":"Αυτό το νήμα είναι κλειστό και αρχειοθετημένο. Δε δέχεται πια καινούριες απαντήσεις και δεν μπορεί να τροποποιηθεί"},"unpinned":{"title":"Ξεκαρφιτσωμένο","help":"Για σένα αυτό το νήμα είναι ξεκαρφιτσωμένο. Θα εμφανίζεται στην κανονική του σειρά."},"pinned_globally":{"title":"Καρφιτσωμένο Καθολικά","help":"Αυτό το νήμα είναι καρφιτσωμένο καθολικά. Θα εμφανίζεται στην κορυφή των τελευταίων και στην κατηγορία του"},"pinned":{"title":"Καρφιτσωμένο","help":"Αυτό το νήμα είναι καρφιτσωμένο για σένα. Θα εμφανίζεται πάντα στην κορυφή της κατηγορίας του "},"unlisted":{"help":"Αυτό το νήμα είναι αόρατο. Δε θα εμφανίζεται σε καμια λίστα νημάτων και μπορεί να εμφανιστεί μόνο αν ακολουθήσεις ένα άμεσο σύνδεσμο προς αυτό."},"personal_message":{"title":"Αυτό το θέμα είναι ένα προσωπικό μήνυμα","help":"Αυτό το θέμα είναι ένα προσωπικό μήνυμα"}},"posts":"Αναρτήσεις","original_post":"Αρχική Ανάρτηση","views":"Προβολές","views_lowercase":{"one":"προβολή","other":"προβολές"},"replies":"Απαντήσεις","views_long":{"one":"αυτό το νήμα έχει προβληθεί %{count} φορά","other":"αυτό το νήμα έχει προβληθεί %{number} φορές"},"activity":"Δραστηριότητα","likes":"«Μου αρέσει»","likes_lowercase":{"one":"μου αρέσει","other":"μου αρέσει"},"users":"Χρήστες","users_lowercase":{"one":"χρήστης","other":"χρήστες"},"category_title":"Κατηγορία","changed_by":"του/της %{author}","raw_email":{"title":"Εισερχόμενα email","not_available":"Μη διαθέσιμο!"},"categories_list":"Λίστα Κατηγοριών","filters":{"with_topics":"%{filter} νήματα","with_category":"%{filter} %{category} νήματα","latest":{"title":"Τελευταία","title_with_count":{"one":"Τελευταία (%{count})","other":"Τελευταία (%{count})"},"help":"νήματα με πρόσφατες αναρτήσεις"},"read":{"title":"Διαβασμένα","help":"νήματα που έχεις διαβάσει, με τη σειρά που τα έχεις διαβάσει"},"categories":{"title":"Κατηγορίες","title_in":"Κατηγορία - %{categoryName}","help":"όλα τα νήματα ομαδοποιημένα ανά κατηγορία"},"unread":{"title":"Αδιάβαστα","title_with_count":{"one":"Μη αναγνωσμένα (%{count})","other":"Αδιάβαστα (%{count})"},"help":"νήματα που επιτηρείς ή παρακολουθείς και που έχουν αδιάβαστες αναρτήσεις","lower_title_with_count":{"one":"%{count} μη αναγνωσμένο","other":"%{count} αδιάβαστα"}},"new":{"lower_title_with_count":{"one":"%{count} νέο","other":"%{count} νέα"},"lower_title":"νέα","title":"Νέα","title_with_count":{"one":"Νέα (%{count})","other":"Νέα (%{count})"},"help":"νήματα που δημιουργήθηκαν τις προηγούμενες μέρες"},"posted":{"title":"Οι αναρτήσεις μου","help":"νήματα στα οποία έχεις αναρτήσεις"},"bookmarks":{"title":"Σελιδοδείκτες","help":"νήματα στα οποία έχεις βάλει σελιδοδείκτη"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"τελευταία νήματα στην κατηγορία %{categoryName} "},"top":{"title":"Κορυφαία","help":"τα πιο ενεργά νήματα τον τελευταίο χρόνο, μήνα, εβδομάδα ή μέρα","all":{"title":"Από πάντα"},"yearly":{"title":"Ετήσια"},"quarterly":{"title":"Τριμηνιαία"},"monthly":{"title":"Μηνιαία"},"weekly":{"title":"Εβδομαδιαία"},"daily":{"title":"Ημερήσια"},"all_time":"Από πάντα","this_year":"Χρόνος","this_quarter":"Τέταρτο","this_month":"Μήνας","this_week":"Εβδομάδα","today":"Σήμερα","other_periods":"δείτε τα κορυφαία:"}},"permission_types":{"full":"Δημιούργησε / Απάντησε / Δες","create_post":"Απάντησε / Δες","readonly":"Δες"},"lightbox":{"download":"λήψη","previous":"Προηγούμενο (πλήκτρο αριστερού βέλους)","next":"Επόμενο (πλήκτρο δεξιού βέλους)","counter":"%curr% από %total%","close":"Κλείσιμο (Esc)","content_load_error":"Δεν ήταν δυνατή η φόρτωση \u003ca href=\"%url%\"\u003eτου περιεχομένου\u003c/a\u003e.","image_load_error":"Δεν ήταν δυνατή η φόρτωση \u003ca href=\"%url%\"\u003eτης εικόνας\u003c/a\u003e."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} ή %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Συντομεύσεις Πληκτρολογίου","jump_to":{"title":"Μετάβαση Προς","home":"%{shortcut} Αρχική","latest":"%{shortcut} Τελευταία","new":"%{shortcut} Νέα","unread":"%{shortcut} Αδιάβαστα","categories":"%{shortcut} Κατηγορίες","top":"%{shortcut} Κορυφαία","bookmarks":"%{shortcut} Σελιδοδείκτες","profile":"%{shortcut} Προφίλ","messages":"%{shortcut} Μηνύματα","drafts":"%{shortcut} Προσχέδια","next":"%{shortcut} Επόμενο θέμα","previous":"%{shortcut} Προηγούμενο θέμα"},"navigation":{"title":"Πλοήγηση","jump":"%{shortcut} Πήγαινε στην ανάρτηση #","back":"%{shortcut} Πίσω","up_down":"%{shortcut} Μετακίνηση επιλογής \u0026uarr; \u0026darr;","open":"%{shortcut} Άνοιξε το επιλεγμένο νήμα","next_prev":"%{shortcut} Επόμενη/Προηγούμενη ενότητα","go_to_unread_post":"%{shortcut} Μετάβαση στην πρώτη μη αναγνωσμένη ανάρτηση"},"application":{"title":"Εφαρμογή","create":"%{shortcut} Δημιουργία νέου νήματος","notifications":"%{shortcut} Άνοιγμα ειδοποιήσεων","hamburger_menu":"%{shortcut}'Ανοιξε μενού χάμπουρκερ","user_profile_menu":"%{shortcut} Άνοιγμα μενού χρήστη","show_incoming_updated_topics":"%{shortcut} Εμφάνιση ενημερωμένων νημάτων","search":"%{shortcut} Αναζήτηση","help":"%{shortcut} Εμφάνισε βοήθειας πληκτρολογίου","dismiss_topics":"%{shortcut} Απόρριψη Νημάτων","log_out":"%{shortcut} Αποσύνδεση"},"composing":{"title":"Σύνθεση","return":"%{shortcut} Επιστροφή στον επεξεργαστή κειμένου","fullscreen":"%{shortcut} Επεξεργαστής κειμένου πλήρους οθόνης"},"bookmarks":{"title":"Σελιδοδείκτες","enter":"%{shortcut} Αποθήκευση και κλείσιμο","later_today":"%{shortcut} Αργότερα σήμερα","later_this_week":"%{shortcut} Αργότερα αυτήν την εβδομάδα","tomorrow":"%{shortcut} Αύριο","next_week":"%{shortcut} Την επόμενη εβδομάδα","next_month":"%{shortcut} Τον επόμενο μήνα","next_business_week":"%{shortcut} Στην αρχή της επόμενης εβδομάδας","next_business_day":"%{shortcut} Την επόμενη εργάσιμη ημέρα","custom":"%{shortcut} Προσαρμοσμένη ημερομηνία και ώρα","none":"%{shortcut} Χωρίς υπενθύμιση","delete":"%{shortcut} Διαγραφή σελιδοδείκτη"},"actions":{"title":"Ενέργειες","bookmark_topic":"%{shortcut} Εναλλαγή σελιδοδείκτη νήματος","pin_unpin_topic":"%{shortcut} Καρφίτσωμα/Ξεκαρφίτσωμα νήματος","share_topic":"%{shortcut} Κοινοποίηση νήματος","share_post":"%{shortcut} Κοινοποίηση ανάρτησης","reply_as_new_topic":"%{shortcut} Απάντηση σαν συνδεδεμένο νήμα","reply_topic":"%{shortcut} Απάντηση στο νήμα","reply_post":"%{shortcut} Απάντηση στην ανάρτηση","quote_post":"%{shortcut} Παράθεση ανάρτησης","like":"%{shortcut} \"Μου αρέσει\" η ανάρτηση","flag":"%{shortcut} Επισήμανση ανάρτησης","bookmark":"%{shortcut} Τοποθέτηση σελιδοδείκτη στην ανάρτηση","edit":"%{shortcut} Επεξεργασία ανάρτησης","delete":"%{shortcut} Διαγραφή ανάρτησης","mark_muted":"%{shortcut} Σίγαση νήματος","mark_regular":"%{shortcut} Κανονικό (προεπιλογή) νήμα","mark_tracking":"%{shortcut} Παρακολούθηση νήματος","mark_watching":"%{shortcut} Επιτήρηση Νήματος","print":"%{shortcut} Εκτύπωση νήματος","defer":"%{shortcut} Αναβολή θέματος","topic_admin_actions":"%{shortcut} Άνοιγμα ενεργειών διαχείρισης θέματος"},"search_menu":{"title":"Μενού αναζήτησης","prev_next":"%{shortcut} Μετακίνηση επιλογής προς τα πάνω και προς τα κάτω","insert_url":"%{shortcut} Εισαγωγή επιλογής σε ανοιχτό επεξεργαστή κειμένου"}},"badges":{"earned_n_times":{"one":"Κέρδισε αυτό το παράσημο %{count} φορά","other":"Κέρδισε αυτό το παράσημο %{count} φορές"},"granted_on":"Χορηγήθηκε στις %{date}","others_count":"Άλλοι με αυτό το παράσημο (%{count})","title":"Παράσημα","allow_title":"Μπορείς να χρησιμοποιήσεις αυτό το παράσημο σαν τίτλο","multiple_grant":"Μπορείς να το κερδίσεις πολλές φορές","badge_count":{"one":"%{count} Παράσημο","other":"%{count} Παράσημα"},"more_badges":{"one":"+%{count} Περισσότερα","other":"+%{count} Περισσότερα"},"granted":{"one":"%{count} χορηγήθηκε","other":"%{count} χορηγήθηκε"},"select_badge_for_title":"Επίλεξε ένα παράσημο για να χρησιμοποιήσεις ως τίτλο","none":"(κανένα)","successfully_granted":"Επιτυχής χορήγηση %{badge} προς %{username}","badge_grouping":{"getting_started":{"name":"Ξεκινώντας"},"community":{"name":"Κοινότητα"},"trust_level":{"name":"Επίπεδο Εμπιστοσύνης"},"other":{"name":"Άλλο"},"posting":{"name":"Αναρτάται"}}},"tagging":{"all_tags":"Όλες οι Ετικέτες","other_tags":"Άλλες ετικέτες","selector_all_tags":"όλες οι ετικέτες","selector_no_tags":"καμία ετικέτα","changed":"αλλαγμένες ετικέτες:","tags":"Ετικέτες","choose_for_topic":"προαιρετικές ετικέτες","info":"Πληροφορίες","category_restricted":"Αυτή η ετικέτα περιορίζεται σε κατηγορίες στις οποίες δεν έχετε άδεια πρόσβασης.","synonyms":"Συνώνυμα","synonyms_description":"Όταν χρησιμοποιούνται οι ακόλουθες ετικέτες, θα αντικατασταθούν με \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Αυτή η ετικέτα ανήκει στην ομάδα \"%{tag_groups}\".","other":"Αυτή η ετικέτα ανήκει σε αυτές τις ομάδες: %{tag_groups}."},"category_restrictions":{"one":"Μπορεί να χρησιμοποιηθεί μόνο σε αυτήν την κατηγορία:","other":"Μπορεί να χρησιμοποιηθεί μόνο σε αυτές τις κατηγορίες:"},"edit_synonyms":"Διαχείριση συνωνύμων","add_synonyms_label":"Προσθήκη συνωνύμων:","add_synonyms":"Προσθήκη","add_synonyms_explanation":{"one":"Οποιοδήποτε σημείο χρησιμοποιεί επί του παρόντος αυτήν την ετικέτα θα αλλάξει για να χρησιμοποιεί το \u003cb\u003e%{tag_name}\u003c/b\u003e . Είστε βέβαιοι ότι θέλετε να κάνετε αυτήν την αλλαγή;","other":"Οποιοδήποτε σημείο χρησιμοποιεί επί του παρόντος αυτές τις ετικέτες θα αλλάξει για να χρησιμοποιεί το \u003cb\u003e%{tag_name}\u003c/b\u003e . Είστε βέβαιοι ότι θέλετε να κάνετε αυτήν την αλλαγή;"},"add_synonyms_failed":"Δεν ήταν δυνατή η προσθήκη των ακόλουθων ετικετών ως συνώνυμα: \u003cb\u003e%{tag_names}\u003c/b\u003e. Βεβαιωθείτε ότι δεν έχουν συνώνυμα και ότι δεν είναι συνώνυμα άλλης ετικέτας.","remove_synonym":"Αφαίρεση συνωνύμου","delete_synonym_confirm":"Είστε βέβαιοι πως θέλετε να διαγράψετε το συνώνυμο «%{tag_name}»;","delete_tag":"Αφαίρεση Ετικέτας","delete_confirm":{"one":"Είσαι βέβαιος πως θέλεις να διαγράψεις αυτήν την ετικέτα και να την αφαιρέσεις από το %{count} νήμα στο οποίο είναι προσαρτημένη;","other":"Είσαι βέβαιος πως θέλεις να διαγράψεις αυτήν την ετικέτα και να την αφαιρέσεις από τα %{count} νήματα στα οποία είναι προσαρτημένη;"},"delete_confirm_no_topics":"Είσαι βέβαιος πως θέλεις να διαγράψεις αυτήν την ετικέτα;","delete_confirm_synonyms":{"one":"Το συνώνυμό του θα διαγραφεί επίσης.","other":"Τα %{count} συνώνυμά του θα διαγραφούν επίσης."},"rename_tag":"Μετονομασία Ετικέτας","rename_instructions":"Επίλεξε ένα καινούριο όνομα για την ετικέτα:","sort_by":"Ταξινόμηση κατά:","sort_by_count":"άθροισμα","sort_by_name":"όνομα","manage_groups":"Διαχείριση Ομάδων Ετικέτας","manage_groups_description":"Καθορισμός ομάδων για την οργάνωση ετικετών","upload":"Επιφόρτωση ετικετών","upload_description":"Επιφορτώστε ένα αρχείο csv για να δημιουργήσετε ετικέτες μαζικά","upload_instructions":"Μία ανά γραμμή, προαιρετικά με μια ομάδα ετικετών με τη μορφή «tag_name, tag_group».","upload_successful":"Οι ετικέτες επιφορτώθηκαν με επιτυχία","delete_unused_confirmation":{"one":"%{count} ετικέτα θα διαγραφεί: %{tags}","other":"%{count} ετικέτες θα διαγραφούν: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} και %{count} ακόμη","other":"%{tags} και %{count} ακόμη"},"delete_no_unused_tags":"Δεν υπάρχουν αχρησιμοποίητες ετικέτες.","delete_unused":"Διαγραφή αχρησιμοποίητων ετικετών","delete_unused_description":"Διαγράψτε όλες τις ετικέτες που δεν επισυνάπτονται σε θέματα ή προσωπικά μηνύματα","cancel_delete_unused":"Άκυρο","filters":{"without_category":"%{filter} %{tag} νήματα","with_category":"%{filter} %{tag} νήματα στην %{category}","untagged_without_category":"%{filter} νήματα χωρίς ετικέτες","untagged_with_category":"%{filter} νήματα χωρίς ετικέτες σε %{category}"},"notifications":{"watching":{"title":"Επιτηρείται","description":"Θα παρακολουθείτε αυτόματα όλα τα θέματα με αυτήν την ετικέτα. Θα ειδοποιηθείτε για όλες τις νέες αναρτήσεις και θέματα, καθώς και ο αριθμός των μη αναγνωσμένων και νέων δημοσιεύσεων θα εμφανιστεί επίσης δίπλα στο θέμα."},"watching_first_post":{"title":"Επιτήρηση Πρώτης Ανάρτησης","description":"Θα ειδοποιηθείτε για νέα θέματα σε αυτήν την ετικέτα αλλά όχι για απαντήσεις στα θέματα."},"tracking":{"title":"Παρακολουθείται","description":"Θα παρακολουθείτε αυτόματα όλα τα θέματα με αυτήν την ετικέτα. Ένας αριθμός μη αναγνωσμένων και νέων αναρτήσεων θα εμφανιστεί δίπλα στο θέμα."},"regular":{"title":"Τακτικός","description":"Θα λαμβάνεις ειδοποίηση εάν κάποιος αναφέρει το @όνομά σου ή απαντήσει σε αυτή τη ανάρτηση."},"muted":{"title":"Σίγαση","description":"Δε θα ειδοποιηθείτε για τίποτα σχετικά με νέα θέματα με αυτήν την ετικέτα και δε θα εμφανίζονται στην καρτέλα μη αναγνωσμένων σας."}},"groups":{"title":"Ομάδες Ετικετών","new":"Νέα Ομάδα","tags_label":"Ετικέτες σε αυτή την ομάδα","parent_tag_label":"Μητρική ετικέτα","one_per_topic_label":"Περιορισμός μιας ετικέτας για κάθε νήμα από αυτή την ομάδα","new_name":"Νέα Ομάδα Ετικετών","name_placeholder":"Όνομα","save":"Αποθήκευση","delete":"Διαγραφή","confirm_delete":"Είσαι βέβαιος πως θέλεις να διαγράψεις αυτή την ομάδα ετικετών;","everyone_can_use":"Οι ετικέτες μπορούν να χρησιμοποιηθούν από όλους"},"topics":{"none":{"unread":"Δεν έχεις αδιάβαστα νήματα.","new":"Δεν έχεις νέα νήματα.","read":"Δεν έχεις διαβάσει κανένα νήμα ακόμα.","posted":"Δεν έχεις αναρτήσει σε κανένα νήμα ακόμα.","latest":"Δεν υπάρχουν τελευταία νήματα.","bookmarks":"Δεν υπάρχουν νήματα με σελιδοδείκτη ακόμα.","top":"Δεν υπάρχουν κορυφαία νήματα."}}},"invite":{"custom_message":"Κάντε την πρόσκλησή σας λίγο πιο προσωπική γράφοντας ένα \u003ca href\u003eπροσαρμοσμένο μήνυμα\u003c/a\u003e.","custom_message_placeholder":"Πρόσθεσε το προσαρμοσμένο μήνυμά σου","custom_message_template_forum":"Γεια, θα πρέπει να λάβεις μέρος σε αυτό το χώρο συζητήσεων!","custom_message_template_topic":"Γεια, νομίζω ότι θα απολαύσεις αυτό το νήμα!"},"forced_anonymous":"Λόγω υπερβολικού φόρτου, αυτό εμφανίζεται προσωρινά σε όλους όπως θα το έβλεπε ένας μη συνδεδεμένος χρήστης.","footer_nav":{"back":"Πίσω","forward":"Μπροστά","share":"Κοινοποίηση","dismiss":"Απόρριψη"},"safe_mode":{"enabled":"Η λειτουργία ασφαλείας είναι ενεργοποιημένη, για να εξέλθεις από τη λειτουργία ασφαλείας κλείσε το παράθυρο περιήγησης"},"image_removed":"(η εικόνα αφαιρέθηκε)","do_not_disturb":{"title":"Μην ενοχλείτε για ...","label":"Μην ενοχλείτε","remaining":"%{remaining} απομένει","options":{"half_hour":"30 λεπτά","one_hour":"1 ώρα","two_hours":"2 ώρες","tomorrow":"Μέχρι αύριο","custom":"Προσαρμοσμένο"}},"trust_levels":{"names":{"newuser":"νέος χρήστης","basic":"αρχάριος","member":"μέλος","regular":"τακτικός","leader":"αρχηγός"}},"chat_integration":{"settings":"Ρυθμίσεις","delete_channel":"Σβήσιμο","edit_channel":"Επεξεργασία","test_modal":{"topic":"Νήμα","close":"Κλείσιμο"},"type":{"normal":"Φυσιολογικά"},"filter":{"mute":"Σίγαση"},"rule_table":{"filter":"Φίλτρο","category":"Κατηγορία","tags":"Ετικέτες","edit_rule":"Επεξεργασία","delete_rule":"Σβήσιμο"},"edit_channel_modal":{"cancel":"Άκυρο"},"edit_rule_modal":{"cancel":"Άκυρο","type":"Τύπος","filter":"Φίλτρο","category":"Κατηγορία","group":"Ομάδα","tags":"Ετικέτες"},"provider":{"telegram":{"param":{"name":{"title":"Όνομα"}}},"discord":{"param":{"name":{"title":"Όνομα"}}},"matrix":{"param":{"name":{"title":"Όνομα"}}},"zulip":{"param":{"subject":{"title":"Αντικείμενο"}}},"gitter":{"param":{"name":{"title":"Όνομα"}}}}},"details":{"title":"Απόκρυψη λεπτομερειών"},"discourse_local_dates":{"relative_dates":{"today":"Σήμερα στις %{time}","tomorrow":"Αύριο στις %{time}","yesterday":"Χθες στις %{time}","countdown":{"passed":"η ημερομηνία έχει παρέλθει"}},"title":"Εισαγωγή ημερομηνίας / ώρας","create":{"form":{"insert":"Εισαγωγή","advanced_mode":"Λειτουργία για προχωρημένους","simple_mode":"Απλή λειτουργία","format_description":"Μορφή που χρησιμοποιείται για την εμφάνιση της ημερομηνίας στον χρήστη. Χρησιμοποιήστε το Z για να εμφανιστεί η μετατόπιση και το zz για το όνομα της ζώνης ώρας.","timezones_title":"Ζώνες ώρας για εμφάνιση","timezones_description":"Οι ζώνες ώρας θα χρησιμοποιηθούν για την εμφάνιση ημερομηνιών σε προεπισκόπηση και ως εφεδρικές.","recurring_title":"Επανάληψη","recurring_description":"Ορίστε την επανάληψη ενός συμβάντος. Μπορείτε επίσης να επεξεργαστείτε με μη αυτόματο τρόπο την επαναλαμβανόμενη επιλογή που δημιουργείται από τη φόρμα και να χρησιμοποιήσετε ένα από τα ακόλουθα κλειδιά: έτη, τρίμηνα, μήνες, εβδομάδες, ημέρες, ώρες, λεπτά, δευτερόλεπτα, χιλιοστά του δευτερολέπτου.","recurring_none":"Χωρίς επανάληψη","invalid_date":"Μη έγκυρη ημερομηνία, βεβαιωθείτε ότι η ημερομηνία και η ώρα είναι σωστές","date_title":"Ημερομηνία","time_title":"Ώρα","format_title":"Μορφή ημερομηνίας","timezone":"Ζώνη ώρας","until":"Μέχρι...","recurring":{"every_day":"Κάθε μέρα","every_week":"Κάθε εβδομάδα","every_two_weeks":"Κάθε δυο εβδομάδες","every_month":"Κάθε μήνα","every_two_months":"Κάθε δύο μήνες","every_three_months":"Κάθε τρεις μήνες","every_six_months":"Κάθε έξι μήνες","every_year":"Κάθε χρόνο"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Ξεκίνησε το φροντιστήριο νέου χρήστη για όλους τους νέους χρήστες","welcome_message":"Στείλε σε όλους τους νέους χρήστες ένα μήνυμα καλωσορίσματος μαζί με έναν οδηγό γρήγορης έναρξης"}},"presence":{"replying":{"one":"απαντά","other":"απαντά"},"editing":{"one":"επεξεργάζεται","other":"επεξεργάζεται"},"replying_to_topic":{"one":"απαντά","other":"απαντούν"}},"poll":{"voters":{"one":"ψηφοφόρος","other":"ψηφοφόροι"},"total_votes":{"one":"συνολική ψήφος","other":"συνολικές ψήφοι"},"average_rating":"Μέση βαθμολογία: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Οι ψήφοι είναι \u003cstrong\u003eδημόσιες\u003c/strong\u003e."},"results":{"groups":{"title":"Πρέπει να είστε μέλος του %{groups} για να ψηφίσετε σε αυτήν τη δημοσκόπηση."},"vote":{"title":"Τα αποτελέσματα θα εμφανιστούν με την\u003cstrong\u003eψήφο\u003c/strong\u003e."},"closed":{"title":"Τα αποτελέσματα θα εμφανιστούν μόλις \u003cstrong\u003eκλείσουν\u003c/strong\u003e."},"staff":{"title":"Τα αποτελέσματα εμφανίζονται μόνο σε μέλη του \u003cstrong\u003eπροσωπικού\u003c/strong\u003e."}},"multiple":{"help":{"at_least_min_options":{"one":"Επιλέξτε τουλάχιστον \u003cstrong\u003e%{count}\u003c/strong\u003e επιλογή.","other":"Επιλέξτε τουλάχιστον \u003cstrong\u003e%{count}\u003c/strong\u003e επιλογές."},"up_to_max_options":{"one":"Επιλέξτε μέχρι \u003cstrong\u003e%{count}\u003c/strong\u003e επιλογή.","other":"Επιλέξτε μέχρι \u003cstrong\u003e%{count}\u003c/strong\u003e επιλογές."},"x_options":{"one":"Επιλέξτε \u003cstrong\u003e%{count}\u003c/strong\u003e επιλογή.","other":"Επιλέξτε \u003cstrong\u003e%{count}\u003c/strong\u003e επιλογές."},"between_min_and_max_options":"Επιλέξτε μεταξύ \u003cstrong\u003e%{min}\u003c/strong\u003e και \u003cstrong\u003e%{max}\u003c/strong\u003e επιλογές."}},"cast-votes":{"title":"Δώστε τις ψήφους σας","label":"Ψηφίστε τώρα!"},"show-results":{"title":"Εμφάνισε τα αποτελέσματα της ψηφοφορίας","label":"Εμφάνισε τα αποτελέσματα"},"hide-results":{"title":"Πίσω στις ψήφους σας","label":"Εμφάνιση ψήφων"},"group-results":{"title":"Ομαδοποίηση ψήφων ανά πεδίο χρήστη","label":"Εμφάνιση ανάλυσης"},"export-results":{"title":"Εξαγάγετε τα αποτελέσματα της δημοσκόπησης","label":"Εξαγωγή"},"open":{"title":"Να ξεκινήσει η ψηφοφορία","label":"Ξεκίνημα","confirm":"Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτήν την ψηφοφορία;"},"close":{"title":"Να κλείσει η ψηφοφορία","label":"Κλείσιμο","confirm":"Είστε βέβαιοι ότι θέλετε να κλείσετε αυτήν την ψηφοφορία;"},"automatic_close":{"closes_in":"Κλείνει σε \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Κλειστό \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Αποτελέσματα ψηφοφορίας","votes":"%{count} ψήφοι","breakdown":"Ανάλυση","percentage":"Ποσοστό","count":"Άθροισμα"},"error_while_toggling_status":"Λυπάμαι, παρουσιάστηκε σφάλμα κατά την εναλλαγή της κατάστασης αυτής της δημοσκόπησης.","error_while_casting_votes":"Λυπάμαι, παρουσιάστηκε ένα σφάλμα κατά την ψηφοφορία.","error_while_fetching_voters":"Συγνώμη, παρουσιάστηκε ένα σφάλμα κατά τη διαδικασία εμφάνισης των ψηφοφόρων.","error_while_exporting_results":"Λυπάμαι, παρουσιάστηκε σφάλμα κατά την εξαγωγή αποτελεσμάτων δημοσκόπησης.","ui_builder":{"title":"Δημιουργία ψηφοφορίας","insert":"Εισαγωγή ψηφοφορίας","help":{"options_min_count":"Επιλέξτε τουλάχιστον 1 επιλογή.","invalid_values":"Η ελάχιστη τιμή θα πρέπει να είναι μικρότερη από τη μέγιστη τιμή.","min_step_value":"Η ελάχιστη τιμή για το βήμα είναι 1"},"poll_type":{"label":"Τύπος","regular":"Μία επιλογή","multiple":"Πολλαπλές επιλογές","number":"Αξιολόγηση αριθμoύ"},"poll_result":{"always":"Πάντα ορατό","staff":"Μόνο το προσωπικό"},"poll_chart_type":{"bar":"Μπάρες","pie":"Πίτα"},"poll_config":{"step":"Βήμα"},"poll_public":{"label":"Προβολή ψηφοφόρων."},"automatic_close":{"label":"Αυτόματο κλείσιμο ψηφοφορίας"}}},"styleguide":{"sections":{"typography":{"example":"Καλώς ήρθατε στο Discourse"},"colors":{"title":"Χρώματα"},"icons":{"title":"Εικονίδια"},"categories":{"title":"Κατηγορίες"},"navigation":{"title":"Πλοήγηση"},"categories_list":{"title":"Λίστα Κατηγοριών"},"topic_timer_info":{"title":"Χρονοδιακόπτες Νημάτων"},"post":{"title":"Ανάρτηση"},"suggested_topics":{"title":"Προτεινόμενα θέματα"}}}}},"en":{"js":{"dates":{"wrap_on":"on %{date}"},"software_update_prompt":{"message":"We've updated this site, \u003cspan\u003eplease refresh\u003c/span\u003e, or you may experience unexpected behavior."},"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined.","other":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} users have joined."},"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)"}},"clear_input":"Clear input","about":{"stat":{"last_day":"Last 24 hours","last_7_days":"Last 7 days","last_30_days":"Last 30 days"}},"bookmarked":{"edit_bookmark":"Edit Bookmark","help":{"edit_bookmark":"Click to edit the bookmark on this topic","unbookmark_with_reminder":"Click to remove all bookmarks and reminders in this topic."}},"drafts":{"label":"Drafts","label_with_count":"Drafts (%{count})","remove_confirmation":"Are you sure you want to delete this draft?","new_private_message":"New personal message draft","abandon":{"confirm":"You have a draft in progress for this topic. What would you like to do with it?","no_value":"Resume editing"}},"deleting":"Deleting...","processing_filename":"Processing: %{filename}...","review":{"stale_help":"This reviewable has been resolved by \u003cb\u003e%{username}\u003c/b\u003e.","user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"}},"reject_reason":{"title":"Why are you rejecting this user?","send_email":"Send rejection email"}},"relative_time_picker":{"minutes":{"one":"minute","other":"minutes"},"hours":{"one":"hour","other":"hours"},"months":{"one":"month","other":"months"},"years":{"one":"year","other":"years"},"relative":"Relative"},"time_shortcut":{"post_local_date":"Date in post","two_weeks":"Two weeks","six_months":"Six months","relative":"Relative time","none":"None needed","last_custom":"Last custom datetime"},"directory":{"edit_columns":{"title":"Edit Directory Columns"}},"groups":{"add_members":{"title":"Add Users to %{group_name}","description":"Enter a list of users you want to invite to the group or paste in a comma separated list:","usernames_placeholder":"usernames","set_owner":"Set users as owners of this group"},"manage":{"add_members":"Add Users","email":{"enable_smtp":"Enable SMTP","enable_imap":"Enable IMAP","test_settings":"Test Settings","save_settings":"Save Settings","last_updated":"Last updated:","settings_required":"All settings are required, please fill in all fields before validation.","smtp_settings_valid":"SMTP settings valid.","smtp_title":"SMTP","smtp_instructions":"When you enable SMTP for the group, all outbound emails sent from the group's inbox will be sent via the SMTP settings specified here instead of the mail server configured for other emails sent by your forum.","imap_title":"IMAP","imap_additional_settings":"Additional Settings","imap_instructions":"When you enable IMAP for the group, emails are synced between the group inbox and the provided IMAP server and mailbox. SMTP must be enabled with valid and tested credentials before IMAP can be enabled. The email username and password used for SMTP will be used for IMAP. For more information see \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Warning: This is an alpha-stage feature. Only Gmail is officially supported. Use at your own risk!","imap_settings_valid":"IMAP settings valid.","smtp_disable_confirm":"If you disable SMTP, all SMTP and IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_disable_confirm":"If you disable IMAP all IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_mailbox_not_selected":"You must select a Mailbox for this IMAP configuration or no mailboxes will be synced!","prefill":{"title":"Prefill with settings for:","gmail":"GMail"},"settings":{"allow_unknown_sender_topic_replies":"Allow unknown sender topic replies.","allow_unknown_sender_topic_replies_hint":"Allows unknown senders to reply to group topics. If this is not enabled, replies from email addresses not already invited to the topic will create a new topic."}}},"members":{"make_primary":"Make Primary","make_primary_description":"Make this the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Remove as Primary","remove_primary_description":"Remove this as the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Remove Members","remove_members_description":"Remove selected users from this group","make_owners":"Make Owners","make_owners_description":"Make selected users owners of this group","remove_owners":"Remove Owners","remove_owners_description":"Remove selected users as owners of this group","make_all_primary":"Make All Primary","make_all_primary_description":"Make this the primary group for all selected users","remove_all_primary":"Remove as Primary","remove_all_primary_description":"Remove this group as primary","primary":"Primary"},"default_notifications":{"modal_title":"User default notifications"}},"categories":{"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"n_more":"Categories (%{count} more)..."},"user":{"notification_schedule":{"title":"Notification Schedule","label":"Enable custom notification schedule","tip":"Outside of these hours you will be put in 'do not disturb' automatically.","midnight":"Midnight","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"read_help":"Recently read topics","desktop_notifications":{"each_browser_note":"Note: You have to change this setting on every browser you use. All notifications will be disabled when in \"do not disturb\", regardless of this setting."},"no_messages_title":"You don’t have any messages","no_messages_body":"Need to have a direct personal conversation with someone, outside the normal conversational flow? Message them by selecting their avatar and using the %{icon} message button.\u003cbr\u003e\u003cbr\u003e If you need help, you can \u003ca href='%{aboutUrl}'\u003emessage a staff member\u003c/a\u003e.\n","no_bookmarks_title":"You haven’t bookmarked anything yet","no_bookmarks_body":"Start bookmarking posts with the %{icon} button and they will be listed here for easy reference. You can schedule a reminder too!\n","no_notifications_title":"You don’t have any notifications yet","no_notifications_body":"You will be notified in this panel about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","skip_new_user_tips":{"read_later":"I'll read it later."},"color_schemes":{"default_description":"Theme default"},"messages":{"warnings":"Official Warnings"},"second_factor_backup":{"title":"Two-Factor Backup Codes","manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"enable_prerequisites":"You must enable a primary two-factor method before generating backup codes."},"second_factor":{"title":"Two-Factor Authentication","enable":"Manage Two-Factor Authentication","extended_description":"Two-factor authentication adds extra security to your account by requiring a one-time token in addition to your password. Tokens can be generated on \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e and \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e devices.\n","oauth_enabled_warning":"Please note that social logins will be disabled once two-factor authentication has been enabled on your account.","enforced_notice":"You are required to enable two-factor authentication before accessing this site.","disable_confirm":"Are you sure you want to disable all two-factor methods?","edit_title":"Edit Authenticator","edit_description":"Authenticator Name"},"change_email":{"success_via_admin":"We've sent an email to that address. The user will need to follow the confirmation instructions in the email."},"change_avatar":{"logo_small":"Site's small logo. Used by default."},"email":{"auth_override_instructions":"Email can be updated from authentication provider.","admin_note":"Note: An admin user changing another non-admin user's email indicates the user has lost access to their original email account, so a reset password email will be sent to their new address. The user's email will not change until they complete the reset password process.","invite_auth_email_invalid":"Your invitation email does not match the email authenticated by %{provider}","authenticated_by_invite":"Your email has been authenticated by the invitation"},"username":{"edit":"Edit username"},"auth_tokens":{"device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactive now\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"invited":{"expired_tab":"Expired","expired_tab_with_count":"Expired (%{count})","invited_via_link":"link %{key} (%{count} / %{max} redeemed)","sent":"Created/Last Sent","copy_link":"Get Link","reinvite":"Resend Email","removed":"Removed","reinvite_all":"Resend All Invites","reinvited_all":"All Invites Sent!","generate_link":"Create Invite Link","link_generated":"Here's your invite link!","single_user":"Invite by email","multiple_user":"Invite by link","invite":{"new_title":"Create Invite","edit_title":"Edit Invite","instructions":"Share this link to instantly grant access to this site","copy_link":"copy link","expires_in_time":"Expires in %{time}","expired_at_time":"Expired at %{time}","show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options","restrict_email":"Restrict to one email address","max_redemptions_allowed":"Max uses","add_to_groups":"Add to groups","invite_to_topic":"Arrive at this topic","expires_at":"Expire after","custom_message":"Optional personal message","send_invite_email":"Save and Send Email","save_invite":"Save Invite","invite_saved":"Invite saved.","invite_copied":"Invite link copied."},"bulk_invite":{"none":"No invitations to display on this page.","instructions":"\u003cp\u003eInvite a list of users to get your community going quickly. Prepare a \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV file\u003c/a\u003e containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEvery email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.\u003c/p\u003e\n","progress":"Uploaded %{progress}%...","success":"File uploaded successfully. You will be notified via message when the process is complete."}},"avatar":{"name_and_description":"%{name} - %{description}","edit":"Edit Profile Picture"},"title":{"instructions":"appears after your username"},"flair":{"title":"Flair","instructions":"icon displayed next to your profile picture"}},"assets_changed_confirm":"This site just received a software upgrade. Get the latest version now?","logs_error_rate_notice":{},"signup_cta":{"hidden_for_session":"OK, we'll ask you tomorrow. You can always use 'Log In' to create an account, too."},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply.","other":"There are \u003cb\u003e%{count}\u003c/b\u003e replies."}},"private_message_info":{"remove":"Remove..."},"create_account":{"subheader_title":"Let's create your account","title":"Create your account"},"email_login":{"login_link":"Skip the password; email me a login link"},"login":{"header_title":"Welcome back","title":"Log in","second_factor_title":"Two-Factor Authentication","second_factor_backup_title":"Two-Factor Backup","email_placeholder":"Email / Username","omniauth_disallow_totp":"Your account has two-factor authentication enabled. Please log in with your password."},"select_kit":{"filter_by":"Filter by: %{name}","select_to_filter":"Select a value to filter","components":{"tag_drop":{"filter_for_more":"Filter for more..."}}},"shared_drafts":{"notice":"This topic is only visible to those who can publish shared drafts."},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"error":{"title_too_short":{"one":"Title must be at least %{count} character","other":"Title must be at least %{count} characters"},"title_too_long":{"one":"Title can't be more than %{count} character","other":"Title can't be more than %{count} characters"},"post_length":{"one":"Post must be at least %{count} character","other":"Post must be at least %{count} characters"}},"show_preview":"show preview","hide_preview":"hide preview","show_toolbar":"show composer toolbar","hide_toolbar":"hide composer toolbar","slow_mode":{"error":"This topic is in slow mode. You already posted recently; you can post again in %{timeLeft}."},"composer_actions":{"reply_as_new_group_message":{"desc":"Create new message starting with same recipients"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"}}},"notifications":{"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"}},"upload_selector":{"processing":"Processing Upload"},"search":{"advanced":{"post":{"min":{"placeholder":"minimum"},"max":{"placeholder":"maximum"}},"min_views":{"placeholder":"minimum"},"max_views":{"placeholder":"maximum"}}},"view_all":"view all %{tab}","topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread","other":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…","other":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})","other":"Dismiss New (%{count})"},"change_notification_level":"Change Notification Level","remove_tags":"Remove All Tags","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from \u003cb\u003e%{count}\u003c/b\u003e topics. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic","other":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topics"}},"none":{"latest":"You're all caught up!","educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e","unread":"\u003cp\u003eYour unread topics appear here.\u003c/p\u003e\u003cp\u003eBy default, topics are considered unread and will show unread counts \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e if you:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreated the topic\u003c/li\u003e\u003cli\u003eReplied to the topic\u003c/li\u003e\u003cli\u003eRead the topic for more than 4 minutes\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOr if you have explicitly set the topic to Tracked or Watched via the 🔔 in each topic.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}}},"topic":{"collapse_details":"collapse topic details","expand_details":"expand topic details","suggest_create_topic":"Ready to \u003ca href\u003estart a new conversation?\u003c/a\u003e","slow_mode_update":{"title":"Slow Mode","select":"Users may only post in this topic once every:","description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","update":"Update","enabled_until":"Enabled until:","minutes":"Minutes:","seconds":"Seconds:","durations":{"custom":"Custom Duration"}},"slow_mode_notice":{"duration":"Please wait %{duration} between posts in this topic"},"topic_status_update":{"min_duration":"Duration must be greater than 0","max_duration":"Duration must be less than 20 years"},"auto_update_input":{"two_weeks":"Two weeks","two_months":"Two months","three_months":"Three months","four_months":"Four months","six_months":"Six months","one_year":"One year"},"auto_reopen":{"title":"Auto-Open Topic"},"auto_close":{"label":"Auto-close topic after:"},"auto_close_after_last_post":{"title":"Auto-Close Topic After Last Post"},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily.","other":"The last post in the topic is already %{count} hours old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"}},"notifications":{"reasons":{"3_10_stale":"You will receive notifications because you were watching a tag on this topic in the past.","3_6_stale":"You will receive notifications because you were watching this category in the past.","2_8_stale":"You will see a count of new replies because you were tracking this category in the past."}},"actions":{"slow_mode":"Set Slow Mode"},"feature":{"make_banner":"Make Banner Topic"},"share":{"instructions":"Share a link to this topic:","copied":"Topic link copied.","notify_users":{"title":"Notify","instructions":"Notify the following users about this topic:","success":{"one":"Successfully notified %{username} about this topic.","other":"Successfully notified all users about this topic."}}},"feature_topic":{"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"}},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link."},"deleted_by_author_simple":"(topic deleted by author)"},"post":{"wiki_last_edited_on":"wiki last edited on %{dateTime}","last_edited_on":"post last edited on %{dateTime}","deleted_by_author_simple":"(post deleted by author)","has_replies_count":"%{count}","filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","view_all_posts":"View all posts","errors":{"too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."}},"cancel_composer":{"confirm":"What would you like to do with your post?","save_draft":"Save draft for later","keep_editing":"Keep editing"},"controls":{"delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","other":"This topic currently has over %{count} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic","change_post_notice":"Change Staff Notice","delete_post_notice":"Delete Staff Notice","edit_timer":"edit timer"},"bookmarks":{"actions":{"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}},"filtered_replies":{"viewing_posts_by":"Viewing %{post_count} posts by","viewing_subset":"Some replies are collapsed","viewing_summary":"Viewing a summary of this topic","post_number":"%{username}, post #%{post_number}","show_all":"Show all"}},"category":{"back":"Back to category","manage_tag_groups_link":"Manage tag groups","security_add_group":"Add a group","permissions":{"no_groups_selected":"No groups have been granted access; this category will only be visible to staff.","everyone_has_access":"This category is public, everyone can see, reply and create posts. To restrict permissions, remove one or more of the permissions granted to the \"everyone\" group.","toggle_reply":"Toggle Reply permission","toggle_full":"Toggle Create permission","inherited":"This permission is inherited from \"everyone\""},"allow_unlimited_owner_edits_on_first_post":"Allow unlimited owner edits on first post","default_slow_mode":"Enable \"Slow Mode\" for new topics in this category.","notifications":{"watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"colors_disabled":"You can’t select colors because you have a category style of none."},"flagging":{"take_action":"Take Action...","take_action_options":{"suspend":{"details":"Reach the flag threshold, and suspend the user"},"silence":{"details":"Reach the flag threshold, and silence the user"}},"flag_for_review":"Queue For Review"},"history":"History, last 100 revisions","browser_update":"Unfortunately, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eyour browser is too old to work on this site\u003c/a\u003e. Please \u003ca href=\"https://browsehappy.com\"\u003eupgrade your browser\u003c/a\u003e to view rich content, log in and reply.","cannot_render_video":"This video cannot be rendered because your browser does not support the codec.","keyboard_shortcuts_help":{"application":{"dismiss_new":"%{shortcut} Dismiss New"}},"badges":{"favorite_max_reached":"You can’t favorite more badges.","favorite_max_not_reached":"Mark this badge as favorite","favorite_count":"%{count}/%{max} badges marked as favorite"},"tagging":{"default_info":"This tag isn't restricted to any categories, and has no synonyms. To add restrictions, put this tag in a \u003ca href=%{basePath}/tag_groups\u003etag group\u003c/a\u003e.","tag_list_joiner":", ","groups":{"about_heading":"Select a tag group or create a new one","about_heading_empty":"Create a new tag group to get started","about_description":"Tag groups help you manage permissions for many tags in one place.","new_title":"Create New Group","edit_title":"Edit Tag Group","parent_tag_description":"Tags from this group can only be used if the parent tag is present.","usable_only_by_groups":"Tags are visible to everyone, but only the following groups can use them","visible_only_to_groups":"Tags are visible only to the following groups","cannot_save":"Cannot save tag group. Make sure that there is at least one tag present, tag group name is not empty, and a group is selected for tags permission.","tags_placeholder":"Search or create tags","parent_tag_placeholder":"Optional","select_groups_placeholder":"Select groups...","disabled":"Tagging is disabled. "}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"forced_anonymous_login_required":"The site is under extreme load and cannot be loaded at this time, try again in a few minutes.","do_not_disturb":{"set_schedule":"Set a notification schedule"},"trust_levels":{"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"You have picked an unsupported file. Supported file types – %{types}."},"admin":{"site_settings":{"categories":{"chat_integration":"Chat Integrations"}}},"chat_integration":{"menu_title":"Chat Integrations","no_providers":"You need to enable some providers in the plugin settings","channels_with_errors":"Some channels for this provider failed last time messages were sent. Click the error icon(s) to learn more.","channel_exception":"An unknown error occured when a message was last sent to this channel.","group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","choose_group":"(choose a group)","all_categories":"(all categories)","all_tags":"(all tags)","create_rule":"Create Rule","create_channel":"Create Channel","test_channel":"Test","channel_delete_confirm":"Are you sure you want to delete this channel? All associated rules will be deleted.","test_modal":{"title":"Send a test message","send":"Send Test Message","error":"An unknown error occured while sending the message. Check the site logs for more information.","success":"Message sent successfully"},"type":{"group_message":"Group Message","group_mention":"Group Mention"},"filter":{"follow":"First post only","watch":"All posts and replies","thread":"All posts with threaded replies"},"edit_channel_modal":{"title":"Edit Channel","save":"Save Channel","provider":"Provider","channel_validation":{"ok":"Valid","fail":"Invalid format"}},"edit_rule_modal":{"title":"Edit Rule","save":"Save Rule","provider":"Provider","channel":"Channel","instructions":{"type":"Change the type to trigger notifications for group messages or mentions","filter":"Notification level. Mute overrides other matching rules","category":"This rule will only apply to topics in the specified category","group":"This rule will apply to posts referencing this group","tags":"If specified, this rule will only apply to topics which have at least one of these tags"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"action_prohibited":"The bot does not have permission to post to that channel","channel_not_found":"The specified channel does not exist on slack"}},"telegram":{"title":"Telegram","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Telegram."},"chat_id":{"title":"Chat ID","help":"A number given to you by the bot, or a broadcast channel identifier in the form @channelname"}},"errors":{"channel_not_found":"The specified channel does not exist on Telegram","forbidden":"The bot does not have permission to post to this channel"}},"discord":{"title":"Discord","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Discord."},"webhook_url":{"title":"Webhook URL","help":"The webhook URL created in your Discord server settings"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"channel_not_found":"The specified channel does not exist on Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Matrix."},"room_id":{"title":"Room ID","help":"The 'private identifier' for the room. It should look something like !abcdefg:matrix.org"}},"errors":{"unknown_token":"Access token is invalid","unknown_room":"Room ID is invalid"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"The name of the Zulip stream the message should be sent to. e.g. 'general'"},"subject":{"help":"The subject that these messages sent by the bot should be given"}},"errors":{"does_not_exist":"That stream does not exist on Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"invalid_channel":"That channel does not exist on Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"help":"A Gitter room's name e.g. gitterHQ/services."},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new integration in a Gitter room."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow Token","help":"The flow token provided after creating a source for a flow into which you want to send messages."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Name","help":"A name for the channel (only shown in the Discourse admin interface)"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new webhook"}}}}},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"poll":{"ui_builder":{"help":{"options_max_count":"Enter at most %{count} options.","invalid_min_value":"Minimum value must be at least 1.","invalid_max_value":"Maximum value must be at least 1, but less than or equal with the number of options."},"poll_result":{"label":"Show Results...","vote":"Only after voting","closed":"When the poll is closed"},"poll_groups":{"label":"Limit voting to these groups"},"poll_chart_type":{"label":"Result chart"},"poll_config":{"max":"Max Choices","min":"Min Choices"},"poll_title":{"label":"Title (optional)"},"poll_options":{"label":"Options (one per line)","add":"Add option"},"show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options"}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Date/Time inputs"},"font_scale":{"title":"Font System"},"icons":{"full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation_bar":{"title":"Navigation Bar"},"navigation_stacked":{"title":"Navigation Stacked"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_statuses":{"title":"Topic Statuses"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"post_menu":{"title":"Post Menu"},"modal":{"title":"Modal","header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}}}}};
I18n.locale = 'el';
I18n.pluralizationRules.el = MessageFormat.locale.el;
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
//! locale : Greek [el]
//! author : Aggelos Karalias : https://github.com/mehiel

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    function isFunction(input) {
        return (
            (typeof Function !== 'undefined' && input instanceof Function) ||
            Object.prototype.toString.call(input) === '[object Function]'
        );
    }

    var el = moment.defineLocale('el', {
        monthsNominativeEl: 'Ιανουάριος_Φεβρουάριος_Μάρτιος_Απρίλιος_Μάιος_Ιούνιος_Ιούλιος_Αύγουστος_Σεπτέμβριος_Οκτώβριος_Νοέμβριος_Δεκέμβριος'.split(
            '_'
        ),
        monthsGenitiveEl: 'Ιανουαρίου_Φεβρουαρίου_Μαρτίου_Απριλίου_Μαΐου_Ιουνίου_Ιουλίου_Αυγούστου_Σεπτεμβρίου_Οκτωβρίου_Νοεμβρίου_Δεκεμβρίου'.split(
            '_'
        ),
        months: function (momentToFormat, format) {
            if (!momentToFormat) {
                return this._monthsNominativeEl;
            } else if (
                typeof format === 'string' &&
                /D/.test(format.substring(0, format.indexOf('MMMM')))
            ) {
                // if there is a day number before 'MMMM'
                return this._monthsGenitiveEl[momentToFormat.month()];
            } else {
                return this._monthsNominativeEl[momentToFormat.month()];
            }
        },
        monthsShort: 'Ιαν_Φεβ_Μαρ_Απρ_Μαϊ_Ιουν_Ιουλ_Αυγ_Σεπ_Οκτ_Νοε_Δεκ'.split('_'),
        weekdays: 'Κυριακή_Δευτέρα_Τρίτη_Τετάρτη_Πέμπτη_Παρασκευή_Σάββατο'.split(
            '_'
        ),
        weekdaysShort: 'Κυρ_Δευ_Τρι_Τετ_Πεμ_Παρ_Σαβ'.split('_'),
        weekdaysMin: 'Κυ_Δε_Τρ_Τε_Πε_Πα_Σα'.split('_'),
        meridiem: function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'μμ' : 'ΜΜ';
            } else {
                return isLower ? 'πμ' : 'ΠΜ';
            }
        },
        isPM: function (input) {
            return (input + '').toLowerCase()[0] === 'μ';
        },
        meridiemParse: /[ΠΜ]\.?Μ?\.?/i,
        longDateFormat: {
            LT: 'h:mm A',
            LTS: 'h:mm:ss A',
            L: 'DD/MM/YYYY',
            LL: 'D MMMM YYYY',
            LLL: 'D MMMM YYYY h:mm A',
            LLLL: 'dddd, D MMMM YYYY h:mm A',
        },
        calendarEl: {
            sameDay: '[Σήμερα {}] LT',
            nextDay: '[Αύριο {}] LT',
            nextWeek: 'dddd [{}] LT',
            lastDay: '[Χθες {}] LT',
            lastWeek: function () {
                switch (this.day()) {
                    case 6:
                        return '[το προηγούμενο] dddd [{}] LT';
                    default:
                        return '[την προηγούμενη] dddd [{}] LT';
                }
            },
            sameElse: 'L',
        },
        calendar: function (key, mom) {
            var output = this._calendarEl[key],
                hours = mom && mom.hours();
            if (isFunction(output)) {
                output = output.apply(mom);
            }
            return output.replace('{}', hours % 12 === 1 ? 'στη' : 'στις');
        },
        relativeTime: {
            future: 'σε %s',
            past: '%s πριν',
            s: 'λίγα δευτερόλεπτα',
            ss: '%d δευτερόλεπτα',
            m: 'ένα λεπτό',
            mm: '%d λεπτά',
            h: 'μία ώρα',
            hh: '%d ώρες',
            d: 'μία μέρα',
            dd: '%d μέρες',
            M: 'ένας μήνας',
            MM: '%d μήνες',
            y: 'ένας χρόνος',
            yy: '%d χρόνια',
        },
        dayOfMonthOrdinalParse: /\d{1,2}η/,
        ordinal: '%dη',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4st is the first week of the year.
        },
    });

    return el;

})));

// moment-timezone-localization for lang code: el

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Αμπιτζάν","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Άκρα","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Αντίς Αμπέμπα","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Αλγέρι","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Ασμάρα","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Μπαμάκο","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Μπανγκί","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Μπανζούλ","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Μπισάου","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Μπλαντάιρ","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Μπραζαβίλ","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Μπουζουμπούρα","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Κάιρο","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Καζαμπλάνκα","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Θέουτα","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Κόνακρι","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Ντακάρ","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Νταρ Ες Σαλάμ","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Τζιμπουτί","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Ντουάλα","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"Ελ Αγιούν","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Φρίταουν","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Γκαμπορόνε","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Χαράρε","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Γιοχάνεσμπουργκ","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Τζούμπα","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Καμπάλα","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Χαρτούμ","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Κιγκάλι","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Κινσάσα","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Λάγκος","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Λιμπρεβίλ","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Λομέ","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Λουάντα","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Λουμπουμπάσι","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Λουζάκα","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Μαλάμπο","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Μαπούτο","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Μασέρου","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Μπαμπάνε","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Μογκαντίσου","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Μονρόβια","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Ναϊρόμπι","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"Ντζαμένα","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Νιαμέι","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Νουακσότ","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ουαγκαντούγκου","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Πόρτο-Νόβο","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"Σάο Τομέ","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Τρίπολη","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Τύνιδα","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Βίντχουκ","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Άντακ","id":"America/Adak"},{"value":"America/Anchorage","name":"Άνκορατζ","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Ανγκουίλα","id":"America/Anguilla"},{"value":"America/Antigua","name":"Αντίγκουα","id":"America/Antigua"},{"value":"America/Araguaina","name":"Αραγκουάινα","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"Λα Ριόχα","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Ρίο Γκαγιέγκος","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Σάλτα","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"Σαν Χουάν","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"Σαν Λούις","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Τουκουμάν","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ουσουάια","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Αρούμπα","id":"America/Aruba"},{"value":"America/Asuncion","name":"Ασουνσιόν","id":"America/Asuncion"},{"value":"America/Bahia","name":"Μπαΐα","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Μπαΐα ντε Μπαντέρας","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Μπαρμπέιντος","id":"America/Barbados"},{"value":"America/Belem","name":"Μπελέμ","id":"America/Belem"},{"value":"America/Belize","name":"Μπελίζ","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Μπλαν Σαμπλόν","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Μπόα Βίστα","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Μπογκοτά","id":"America/Bogota"},{"value":"America/Boise","name":"Μπόιζι","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Μπουένος Άιρες","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Κέμπριτζ Μπέι","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Κάμπο Γκράντε","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Κανκούν","id":"America/Cancun"},{"value":"America/Caracas","name":"Καράκας","id":"America/Caracas"},{"value":"America/Catamarca","name":"Καταμάρκα","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Καγιέν","id":"America/Cayenne"},{"value":"America/Cayman","name":"Κέιμαν","id":"America/Cayman"},{"value":"America/Chicago","name":"Σικάγο","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Τσιουάουα","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Ατικόκαν","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Κόρδοβα","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Κόστα Ρίκα","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Κρέστον","id":"America/Creston"},{"value":"America/Cuiaba","name":"Κουιαμπά","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Κουρασάο","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Ντανμαρκσάβν","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Ντόσον","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Ντόσον Κρικ","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Ντένβερ","id":"America/Denver"},{"value":"America/Detroit","name":"Ντιτρόιτ","id":"America/Detroit"},{"value":"America/Dominica","name":"Ντομίνικα","id":"America/Dominica"},{"value":"America/Edmonton","name":"Έντμοντον","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Εϊρουνεπέ","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"Ελ Σαλβαδόρ","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Φορτ Νέλσον","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Φορταλέζα","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Γκλέις Μπέι","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Νουούκ","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Γκους Μπέι","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Γκραντ Τουρκ","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Γρενάδα","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Γουαδελούπη","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Γουατεμάλα","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Γκουαγιακίλ","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Γουιάνα","id":"America/Guyana"},{"value":"America/Halifax","name":"Χάλιφαξ","id":"America/Halifax"},{"value":"America/Havana","name":"Αβάνα","id":"America/Havana"},{"value":"America/Hermosillo","name":"Ερμοσίγιο","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Νοξ, Ιντιάνα","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Μαρένγκο, Ιντιάνα","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Πίτερσμπεργκ, Ιντιάνα","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Τελ Σίτι, Ιντιάνα","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Βιβέι, Ιντιάνα","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Βανσέν, Ιντιάνα","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Γουίναμακ, Ιντιάνα","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Ιντιανάπολις","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Ινούβικ","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Ικαλούιτ","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Τζαμάικα","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Χουχούι","id":"America/Jujuy"},{"value":"America/Juneau","name":"Τζούνο","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Μοντιτσέλο, Κεντάκι","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Κράλεντικ","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"Λα Παζ","id":"America/La_Paz"},{"value":"America/Lima","name":"Λίμα","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Λος Άντζελες","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Λούιβιλ","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Μασεϊό","id":"America/Maceio"},{"value":"America/Managua","name":"Μανάγκουα","id":"America/Managua"},{"value":"America/Manaus","name":"Μανάους","id":"America/Manaus"},{"value":"America/Marigot","name":"Μαριγκό","id":"America/Marigot"},{"value":"America/Martinique","name":"Μαρτινίκα","id":"America/Martinique"},{"value":"America/Matamoros","name":"Ματαμόρος","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Μαζατλάν","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Μεντόζα","id":"America/Mendoza"},{"value":"America/Menominee","name":"Μενομίνε","id":"America/Menominee"},{"value":"America/Merida","name":"Μέριδα","id":"America/Merida"},{"value":"America/Metlakatla","name":"Μετλακάτλα","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Πόλη του Μεξικού","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Μικελόν","id":"America/Miquelon"},{"value":"America/Moncton","name":"Μόνκτον","id":"America/Moncton"},{"value":"America/Monterrey","name":"Μοντερέι","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Μοντεβιδέο","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Μονσεράτ","id":"America/Montserrat"},{"value":"America/Nassau","name":"Νασάου","id":"America/Nassau"},{"value":"America/New_York","name":"Νέα Υόρκη","id":"America/New_York"},{"value":"America/Nipigon","name":"Νιπιγκόν","id":"America/Nipigon"},{"value":"America/Nome","name":"Νόμε","id":"America/Nome"},{"value":"America/Noronha","name":"Νορόνια","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Μπέουλα, Βόρεια Ντακότα","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Σέντερ, Βόρεια Ντακότα","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"Νιου Σέιλεμ, Βόρεια Ντακότα","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Οχινάγκα","id":"America/Ojinaga"},{"value":"America/Panama","name":"Παναμάς","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Πανγκνίρτουνγκ","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Παραμαρίμπο","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Φοίνιξ","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Πορτ-ο-Πρενς","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Πορτ οφ Σπέιν","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Πόρτο Βέλιο","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Πουέρτο Ρίκο","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Πούντα Αρένας","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Ρέινι Ρίβερ","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Ράνκιν Ίνλετ","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Ρεσίφε","id":"America/Recife"},{"value":"America/Regina","name":"Ρετζίνα","id":"America/Regina"},{"value":"America/Resolute","name":"Ρέζολουτ","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Ρίο Μπράνκο","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Σάντα Ιζαμπέλ","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Σανταρέμ","id":"America/Santarem"},{"value":"America/Santiago","name":"Σαντιάγκο","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Άγιος Δομίνικος","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"Σάο Πάολο","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Σκορεσμπίσουντ","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Σίτκα","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"Άγιος Βαρθολομαίος","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"Σεν Τζονς","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"Σεν Κιτς","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"Αγία Λουκία","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"Άγιος Θωμάς","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"Άγιος Βικέντιος","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Σουίφτ Κάρεντ","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Τεγκουσιγκάλπα","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Θούλη","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Θάντερ Μπέι","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Τιχουάνα","id":"America/Tijuana"},{"value":"America/Toronto","name":"Τορόντο","id":"America/Toronto"},{"value":"America/Tortola","name":"Τορτόλα","id":"America/Tortola"},{"value":"America/Vancouver","name":"Βανκούβερ","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Γουάιτχορς","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Γουίνιπεγκ","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Γιακούτατ","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Γέλοουναϊφ","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Κάσεϊ","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Ντέιβις","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Ντιμόν ντ’ Ουρβίλ","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Μακουάρι","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Μόσον","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"Μακμέρντο","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Πάλμερ","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Ρόθερα","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Σίοβα","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Τρολ","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Βόστοκ","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Λόνγκιεαρμπιεν","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Άντεν","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Αλμάτι","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Αμμάν","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Αναντίρ","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Ακτάου","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Ακτόμπε","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Ασχαμπάτ","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Aτιράου","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Βαγδάτη","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Μπαχρέιν","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Μπακού","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Μπανγκόκ","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Μπαρναούλ","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Βυρητός","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Μπισκέκ","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Μπρουνέι","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Καλκούτα","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Τσιτά","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Τσοϊμπαλσάν","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Κολόμπο","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Δαμασκός","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Ντάκα","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Ντίλι","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Ντουμπάι","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Ντουσάνμπε","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Αμμόχωστος","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Γάζα","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Χεβρώνα","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Χονγκ Κονγκ","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Χοβντ","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Ιρκούτσκ","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Τζακάρτα","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Τζαγιαπούρα","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Ιερουσαλήμ","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Καμπούλ","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Καμτσάτκα","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Καράτσι","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Κατμαντού","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Χαντίγκα","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Κρασνογιάρσκ","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Κουάλα Λουμπούρ","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Κουτσίνγκ","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Κουβέιτ","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Μακάο","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Μαγκαντάν","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Μακασάρ","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Μανίλα","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Μασκάτ","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Λευκωσία","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Νοβοκουζνέτσκ","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Νοβοσιμπίρσκ","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Ομσκ","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Οράλ","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Πνομ Πενχ","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Πόντιανακ","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Πιονγκγιάνγκ","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Κατάρ","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Κιζιλορντά","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Ρανγκούν","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Ριάντ","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Πόλη Χο Τσι Μινχ","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Σαχαλίνη","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Σαμαρκάνδη","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Σεούλ","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Σανγκάη","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Σιγκαπούρη","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Σρεντνεκολίμσκ","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Ταϊπέι","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Τασκένδη","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Τιφλίδα","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Τεχεράνη","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Θίμφου","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Τόκιο","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Τομσκ","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ουλάν Μπατόρ","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Ουρούμτσι","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ουστ-Νερά","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Βιεντιάν","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Βλαδιβοστόκ","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Γιακούτσκ","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Αικατερινούπολη","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Ερεβάν","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Αζόρες","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Βερμούδες","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Κανάρια","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Πράσινο Ακρωτήριο","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Φερόες","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Μαδέρα","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Ρέυκιαβικ","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Νότια Γεωργία","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"Αγ. Ελένη","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Στάνλεϊ","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Αδελαΐδα","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Μπρισμπέιν","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Μπρόκεν Χιλ","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Κάρι","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Ντάργουιν","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Γιούκλα","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Χόμπαρτ","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Λίντεμαν","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Λορντ Χάου","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Μελβούρνη","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Περθ","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Σίδνεϊ","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Συντονισμένη Παγκόσμια Ώρα","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Άμστερνταμ","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Ανδόρα","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Αστραχάν","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Αθήνα","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Βελιγράδι","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Βερολίνο","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Μπρατισλάβα","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Βρυξέλλες","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Βουκουρέστι","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Βουδαπέστη","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Μπίσινγκεν","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Κισινάου","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Κοπεγχάγη","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Χειμερινή ώρα ΙρλανδίαςΔουβλίνο","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Γιβραλτάρ","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Γκέρνζι","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Ελσίνκι","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Νήσος του Μαν","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Κωνσταντινούπολη","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Τζέρσεϊ","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Καλίνινγκραντ","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Κίεβο","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Κίροφ","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Λισαβόνα","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Λιουμπλιάνα","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Θερινή ώρα ΒρετανίαςΛονδίνο","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Λουξεμβούργο","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Μαδρίτη","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Μάλτα","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Μάριεχαμν","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Μινσκ","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Μονακό","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Μόσχα","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Όσλο","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Παρίσι","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Ποντγκόριτσα","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Πράγα","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Ρίγα","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Ρώμη","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Σαμάρα","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"Άγιος Μαρίνος","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Σαράγεβο","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Σαράτοφ","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Συμφερόπολη","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Σκόπια","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Σόφια","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Στοκχόλμη","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Ταλίν","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Τίρανα","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Ουλιάνοφσκ","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Ούζχοροντ","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Βαντούζ","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Βατικανό","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Βιέννη","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Βίλνιους","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Βόλγκοκραντ","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Βαρσοβία","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Ζάγκρεμπ","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Ζαπορόζιε","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Ζυρίχη","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Ανταναναρίβο","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Τσάγκος","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Νήσος Χριστουγέννων","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Κόκος","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Κομόρο","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Κεργκελέν","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Μάχε","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Μαλδίβες","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Μαυρίκιος","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Μαγιότ","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Ρεϊνιόν","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Απία","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Όκλαντ","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Μπουγκενβίλ","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Τσάταμ","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Νήσος Πάσχα","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Εφάτε","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Έντερμπερι","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Φακαόφο","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Φίτζι","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Φουναφούτι","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Γκαλάπαγκος","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Γκάμπιερ","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Γκουανταλκανάλ","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Γκουάμ","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"Χονολουλού","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Τζόνστον","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Κιριτιμάτι","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Κόσραϊ","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Κουατζαλέιν","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Ματζούρο","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Μαρκέζας","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Μίντγουεϊ","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Ναούρου","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Νιούε","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Νόρφολκ","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Νουμέα","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Πάγκο Πάγκο","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Παλάου","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Πίτκερν","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Πονάπε","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Πορτ Μόρεσμπι","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Ραροτόνγκα","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Σαϊπάν","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Ταϊτή","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Ταράουα","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Τονγκατάπου","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Τσουκ","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Γουέικ","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Γουάλις","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

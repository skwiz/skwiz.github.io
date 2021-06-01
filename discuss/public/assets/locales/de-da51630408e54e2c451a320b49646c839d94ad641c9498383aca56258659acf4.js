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
I18n._compiledMFs = {"too_few_topics_and_posts_notice_MF" : function(d){
var r = "";
r += "Lass <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">die Diskussion beginnen!</a> Es ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "ist <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Thema";
return r;
},
"other" : function(d){
var r = "";
r += "sind <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Themen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " und ";
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
})() + "</strong> Beitrag";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Beiträge";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " vorhanden. Besucher brauchen mehr zum Lesen und Beantworten – wir empfehlen mindestens ";
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
})() + "</strong> Thema";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Themen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " und ";
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
})() + "</strong> Beitrag";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Beiträge";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Dieser Hinweis wird nur Teammitgliedern angezeigt.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Lass <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">die Diskussion beginnen!</a> Es ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "ist <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Thema";
return r;
},
"other" : function(d){
var r = "";
r += "sind <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Themen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " vorhanden. Besucher brauchen mehr zum Lesen und Beantworten – wir empfehlen mindestens ";
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
})() + "</strong> Thema";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Themen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Dieser Hinweis wird nur Teammitgliedern angezeigt.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "Lass <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">die Diskussion beginnen!</a> Es ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "ist <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Beitrag";
return r;
},
"other" : function(d){
var r = "";
r += "sind <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Beiträge";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " vorhanden. Besucher brauchen mehr zum Lesen und Beantworten – wir empfehlen mindestens ";
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
})() + "</strong> Beitrag";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> Beiträge";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Dieser Hinweis wird nur Teammitgliedern angezeigt.";
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
})() + " Fehler/Stunde";
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
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> hat die Grenze der Webseiten-Einstellung von ";
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
})() + " Fehler/Stunde";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Fehler/Stunde";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " erreicht.";
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
})() + " Fehler/Minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Fehler/Minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> hat die Grenze der Webseiten-Einstellung von ";
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
})() + " Fehler/Minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Fehler/Minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " erreicht.";
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
})() + " Fehler/Stunde";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Fehler/Stunde";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> hat die Grenze der Webseiten-Einstellung von ";
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
})() + " Fehler/Stunde";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Fehler/Stunde";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " überschritten.";
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
})() + " Fehler/Minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Fehler/Minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> hat die Grenze der Webseiten-Einstellung von ";
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
})() + " Fehler/Minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Fehler/Minute";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " überschritten.";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "Es gibt ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "replyCount";
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
})() + "</b> Antwort";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> Antworten";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " mit einer geschätzten Lesezeit von <b>";
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
})() + " Minute";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Minuten";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "Du ";
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
r += "hast <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>ein ungelesenes</a> Thema ";
return r;
},
"other" : function(d){
var r = "";
r += "hast <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " ungelesene</a> Themen ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "und ";
return r;
},
"false" : function(d){
var r = "";
r += "hast ";
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
r += "/new'>ein neues</a> Thema";
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
r += "und ";
return r;
},
"false" : function(d){
var r = "";
r += "hast ";
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
})() + " neue</a> Themen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Oder ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "entdecke andere Themen in ";
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
r += "Du wirst ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<b>einen</b> Beitrag";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> Beiträge";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " und ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<b>ein</b> Thema";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> Themen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " von diesem Benutzer löschen, sein Konto entfernen, seine IP-Adresse <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b> für Neuanmeldungen sperren und die E-Mail-Adresse <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> auf eine permanente Sperrliste setzen. Bist du dir sicher, dass dieser Benutzer wirklich ein Spammer ist?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "Dieses Thema hat ";
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
})() + " Antwort";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Antworten";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "mit einem hohen Verhältnis von Likes zu Beiträgen";
return r;
},
"med" : function(d){
var r = "";
r += "mit einem sehr hohen Verhältnis von Likes zu Beiträgen";
return r;
},
"high" : function(d){
var r = "";
r += "mit einem extrem hohen Verhältnis von Likes zu Beiträgen";
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
r += "Du wirst ";
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
})() + " Beitrag";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Beiträge";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " und ";
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
})() + " Thema";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " Themen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["de"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " löschen. Bist du dir sicher?";
return r;
}};
MessageFormat.locale.de = function ( n ) {
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

I18n.translations = {"de":{"js":{"number":{"format":{"separator":",","delimiter":"."},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Byte","other":"Bytes"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"HH:mm","time_with_zone":"HH:mm (z)","time_short_day":"dd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"D. MMM","full_no_year_no_time":"D. MMMM","long_with_year":"D. MMM YYYY [um] HH:mm","long_with_year_no_time":"D. MMM YYYY","full_with_year_no_time":"D. MMMM YYYY","long_date_with_year":"D. MMM YYYY [um] HH:mm","long_date_without_year":"D. MMM [um] HH:mm","long_date_with_year_without_time":"D. MMM YYYY","long_date_without_year_with_linebreak":"D. MMM\u003cbr/\u003eHH:mm","long_date_with_year_with_linebreak":"D. MMM YYYY\u003cbr/\u003eHH:mm","wrap_ago":"vor %{date}","tiny":{"half_a_minute":"\u003c 1min","less_than_x_seconds":{"one":"\u003c %{count}s","other":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s","other":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}min","other":"\u003c %{count}min"},"x_minutes":{"one":"%{count}min","other":"%{count}min"},"about_x_hours":{"one":"%{count}h","other":"%{count}h"},"x_days":{"one":"%{count}d","other":"%{count}d"},"x_months":{"one":"%{count}m","other":"%{count}m"},"about_x_years":{"one":"%{count}a","other":"%{count}a"},"over_x_years":{"one":"\u003e %{count}a","other":"\u003e %{count}a"},"almost_x_years":{"one":"%{count}a","other":"%{count}a"},"date_month":"D. MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} Minute","other":"%{count} Minuten"},"x_hours":{"one":"%{count} Stunde","other":"%{count} Stunden"},"x_days":{"one":"%{count} Tag","other":"%{count} Tage"},"date_year":"D. MMM 'YY"},"medium_with_ago":{"x_minutes":{"one":"vor %{count} Minute","other":"vor %{count} Minuten"},"x_hours":{"one":"vor %{count} Stunde","other":"vor %{count} Stunden"},"x_days":{"one":"vor %{count} Tag","other":"vor %{count} Tagen"},"x_months":{"one":"vor %{count} Monat","other":"vor %{count} Monaten"},"x_years":{"one":"vor %{count} Jahr","other":"vor %{count} Jahren"}},"later":{"x_days":{"one":"%{count} Tag später","other":"%{count} Tage später"},"x_months":{"one":"%{count} Monat später","other":"%{count} Monate später"},"x_years":{"one":"%{count} Jahr später","other":"%{count} Jahre später"}},"previous_month":"Vormonat","next_month":"Nächster Monat","placeholder":"Datum"},"share":{"topic_html":"Thema: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"Beitrag #%{postNumber}","close":"Schließen","twitter":"Auf Twitter teilen","facebook":"Auf Facebook teilen","email":"Per E-Mail senden","url":"URL kopieren und teilen"},"action_codes":{"public_topic":"hat dieses Thema öffentlich gemacht, %{when}","private_topic":"hat dieses Thema in eine Nachricht umgewandelt, %{when}","split_topic":"hat dieses Thema aufgeteilt, %{when}","invited_user":"hat %{who} eingeladen, %{when}","invited_group":"hat %{who} eingeladen, %{when}","user_left":"%{who} hat sich selbst von dieser Nachricht entfernt, %{when}","removed_user":"hat %{who} entfernt, %{when}","removed_group":"hat %{who} entfernt, %{when}","autobumped":"Thema wurde automatisch nach oben geschoben, %{when}","autoclosed":{"enabled":"geschlossen, %{when}","disabled":"geöffnet, %{when}"},"closed":{"enabled":"geschlossen, %{when}","disabled":"geöffnet, %{when}"},"archived":{"enabled":"archiviert, %{when}","disabled":"aus dem Archiv geholt, %{when}"},"pinned":{"enabled":"angeheftet, %{when}","disabled":"losgelöst, %{when}"},"pinned_globally":{"enabled":"global angeheftet, %{when}","disabled":"losgelöst, %{when}"},"visible":{"enabled":"sichtbar gemacht, %{when}","disabled":"unsichtbar gemacht, %{when}"},"banner":{"enabled":"hat dieses Banner erstellt, %{when}. Es wird oberhalb jeder Seite angezeigt, bis es vom Benutzer weggeklickt wird.","disabled":"hat dieses Banner entfernt, %{when}. Es wird nicht mehr oberhalb jeder Seite angezeigt."},"forwarded":"hat die obige E-Mail weitergeleitet"},"topic_admin_menu":"Themen-Administration","wizard_required":"Willkommen bei deinem neuen Discourse! Lass uns mit dem \u003ca href='%{url}' data-auto-route='true'\u003eSetup-Assistenten\u003c/a\u003e ✨ starten","emails_are_disabled":"Die ausgehende E-Mail-Kommunikation wurde von einem Administrator global deaktiviert. Es werden keinerlei Benachrichtigungen per E-Mail verschickt.","software_update_prompt":{"message":"Wir haben diese Seite aktualisiert, \u003cspan\u003ebitte aktualisiere\u003c/span\u003e, da es sonst zu unerwartetem Verhalten kommen kann.","dismiss":"Verwerfen"},"bootstrap_mode_enabled":{"one":"Damit du mit deiner Seite einfacher loslegen kannst, befindest du dich im Starthilfe-Modus. Alle neuen Benutzer erhalten die Vertrauensstufe 1 und bekommen eine tägliche E-Mail-Zusammenfassung. Der Modus wird automatisch deaktiviert, sobald sich mehr als %{count} Benutzer registriert hat.","other":"Damit du mit deiner Seite einfacher loslegen kannst, befindest du dich im Starthilfe-Modus. Alle neuen Benutzer erhalten die Vertrauensstufe 1 und bekommen eine tägliche E-Mail-Zusammenfassung. Der Modus wird automatisch deaktiviert, sobald sich mehr als %{count} Benutzer registriert haben."},"bootstrap_mode_disabled":"Der Starthilfe-Modus wird in den nächsten 24 Stunden deaktiviert.","themes":{"default_description":"Standard","broken_theme_alert":"Deine Seite funktioniert vielleicht nicht, weil Theme/Komponente %{theme} Fehler hat. Deaktiviere es in %{path}."},"s3":{"regions":{"ap_northeast_1":"Asien-Pazifik (Tokio)","ap_northeast_2":"Asien-Pazifik (Seoul)","ap_east_1":"Asien-Pazifik (Hong Kong)","ap_south_1":"Asien-Pazifik (Mumbai)","ap_southeast_1":"Asien-Pazifik (Singapur)","ap_southeast_2":"Asien-Pazifik (Sydney)","ca_central_1":"Kanada (Zentral)","cn_north_1":"China (Peking)","cn_northwest_1":"China (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"EU (Stockholm)","eu_west_1":"EU (Irland)","eu_west_2":"EU (London)","eu_west_3":"EU (Paris)","sa_east_1":"Südamerika (São Paulo)","us_east_1":"USA Ost (Nord-Virginia)","us_east_2":"USA Ost (Ohio)","us_gov_east_1":"AWS GovCloud (US-Ost)","us_gov_west_1":"AWS GovCloud (US-West)","us_west_1":"USA West (Nordkalifornien)","us_west_2":"USA West (Oregon)"}},"clear_input":"Eingabe löschen","edit":"Titel und Kategorie dieses Themas ändern","expand":"Aufklappen","not_implemented":"Entschuldige, diese Funktion wurde noch nicht implementiert!","no_value":"Nein","yes_value":"Ja","submit":"Absenden","generic_error":"Entschuldigung, ein Fehler ist aufgetreten.","generic_error_with_reason":"Ein Fehler ist aufgetreten: %{error}","go_ahead":"Fortfahren","sign_up":"Registrieren","log_in":"Anmelden","age":"Alter","joined":"Beigetreten","admin_title":"Administration","show_more":"mehr anzeigen","show_help":"Erweiterte Suche","links":"Links","links_lowercase":{"one":"Link","other":"Links"},"faq":"FAQ","guidelines":"Richtlinien","privacy_policy":"Datenschutzerklärung","privacy":"Datenschutz","tos":"Nutzungsbedingungen","rules":"Regeln","conduct":"Verhaltenskodex","mobile_view":"Mobile Ansicht","desktop_view":"Desktop Ansicht","you":"Du","or":"oder","now":"gerade eben","read_more":"weiterlesen","more":"Mehr","x_more":{"one":"%{count} weiterer","other":"%{count} weitere"},"less":"Weniger","never":"nie","every_30_minutes":"alle 30 Minuten","every_hour":"jede Stunde","daily":"täglich","weekly":"wöchentlich","every_month":"jeden Monat","every_six_months":"alle sechs Monate","max_of_count":"von max. %{count}","alternation":"oder","character_count":{"one":"%{count} Zeichen","other":"%{count} Zeichen"},"related_messages":{"title":"Verwandte Nachrichten","see_all":"Siehe \u003ca href=\"%{path}\"\u003ealle Nachrichten\u003c/a\u003e von @%{username}..."},"suggested_topics":{"title":"Vorgeschlagene Themen","pm_title":"Vorgeschlagene Nachrichten"},"about":{"simple_title":"Über uns","title":"Über %{title}","stats":"Website-Statistiken","our_admins":"Unsere Administratoren","our_moderators":"Unsere Moderatoren","moderators":"Moderatoren","stat":{"all_time":"Gesamt","last_day":"Letzte 24 Stunden","last_7_days":"Letzte 7 Tage","last_30_days":"Letzte 30 Tage"},"like_count":"Likes","topic_count":"Themen","post_count":"Beiträge","user_count":"Benutzer","active_user_count":"Aktive Benutzer","contact":"Kontaktiere uns","contact_info":"Im Falle eines kritischen Problems oder einer dringenden Sache, die diese Website betrifft, kontaktiere uns bitte unter %{contact_info}."},"bookmarked":{"title":"Lesezeichen setzen","clear_bookmarks":"Lesezeichen entfernen","help":{"bookmark":"Klicke hier, um den ersten Beitrag in diesem Thema mit einem Lesezeichen zu versehen.","unbookmark":"Klicke hier, um alle Lesezeichen in diesem Thema zu entfernen.","unbookmark_with_reminder":"Klicke hier, um alle Lesezeichen und Erinnerungen in diesem Thema zu löschen. Die nächste Erinnerung ist %{reminder_at} geplant."}},"bookmarks":{"created":"Du hast diesen Beitrag mit einem Lesezeichen versehen. %{name}","not_bookmarked":"diesen Beitrag mit Lesezeichen versehen","created_with_reminder":"Du wirst %{date} an dieses Lesezeichen erinnert. %{name}","remove":"Lesezeichen entfernen","delete":"Lesezeichen löschen","confirm_delete":"Möchtest du dieses Lesezeichen wirklich löschen? Die Erinnerung wird ebenfalls gelöscht.","confirm_clear":"Möchtest du wirklich alle deine Lesezeichen in diesem Thema löschen?","save":"Speichern","no_timezone":"Du hast noch keine Zeitzone ausgewählt und wirst deswegen keine Erinnerungen erstellen können. Wähle deine Zeitzone \u003ca href=\"%{basePath}/my/preferences/profile\"\u003ein deinem Profil\u003c/a\u003e aus.","invalid_custom_datetime":"Das angegebene Datum und die Uhrzeit sind ungültig. Bitte versuche es erneut.","list_permission_denied":"Du hast keine Berechtigung, die Lesezeichen dieses Benutzers anzuzeigen.","no_user_bookmarks":"Du hast noch keine Beiträge mit einem Lesezeichen versehen. Lesezeichen erlauben dir den schnellen Zugriff auf bestimmte Beiträge.","auto_delete_preference":{"label":"Automatisch löschen","never":"Nie","when_reminder_sent":"Sobald die Erinnerung gesendet wurde","on_owner_reply":"Nachdem ich auf dieses Thema geantwortet habe"},"search_placeholder":"Lesezeichen nach Namen, Thementitel oder Beitragsinhalt durchsuchen","search":"Suche","reminders":{"today_with_time":"heute um %{time}","tomorrow_with_time":"morgen um %{time}","at_time":"am %{date_time}","existing_reminder":"Du wirst %{at_date_time} an dieses Lesezeichen erinnert."}},"copy_codeblock":{"copied":"kopiert!"},"drafts":{"resume":"Fortsetzen","remove":"Entfernen","remove_confirmation":"Bist du sicher, dass du diese Vorlage löschen möchtest?","new_topic":"Neues Thema Entwurf","new_private_message":"Neuer Entwurf für private Nachrichten","topic_reply":"Antwort Entwurf","abandon":{"confirm":"Du hast einen Entwurf für dieses Thema in Arbeit. Was würdest du gerne damit machen?","yes_value":"Verwerfen","no_value":"Bearbeitung fortsetzen"}},"topic_count_latest":{"one":"Zeige %{count} neues oder aktualisiertes Thema","other":"Zeige %{count} neue oder aktualisierte Themen"},"topic_count_unread":{"one":"Zeige %{count} ungelesenes Thema","other":"Zeige %{count} ungelesene Themen"},"topic_count_new":{"one":"Zeige %{count} neues Thema","other":"Zeige %{count} neue Themen"},"preview":"Vorschau","cancel":"Abbrechen","deleting":"Löschen...","save":"Speichern","saving":"Speichere…","saved":"Gespeichert!","upload":"Hochladen","uploading":"Wird hochgeladen…","uploading_filename":"wird hochgeladen: %{filename}...","processing_filename":"wird verarbeitet: %{filename}...","clipboard":"Zwischenablage","uploaded":"Hochgeladen!","pasting":"Einfügen...","enable":"Aktivieren","disable":"Deaktivieren","continue":"Weiter","undo":"Rückgängig machen","revert":"Verwerfen","failed":"Fehlgeschlagen","switch_to_anon":"Anonymen Modus aktivieren","switch_from_anon":"Anonymen Modus deaktivieren","banner":{"close":"Dieses Banner ausblenden.","edit":"Diesen Ankündigungsbanner bearbeiten \u003e\u003e"},"pwa":{"install_banner":"Möchtest du \u003ca href\u003e%{title} auf diesem Gerät installieren?\u003c/a\u003e"},"choose_topic":{"none_found":"Keine Themen gefunden.","title":{"search":"Suche nach einem Thema","placeholder":"Gebe denn Thema Titel, URL oder id hier ein"}},"choose_message":{"none_found":"Keine Nachrichten gefunden.","title":{"search":"Suche nach einer Nachricht","placeholder":"Gebe denn Nachrichten Titel, URL oder id hier ein"}},"review":{"order_by":"Sortieren nach","in_reply_to":"Antwort auf","explain":{"why":"Erkläre, warum dieses Element in der Warteschlange gelandet ist","title":"Überprüfbares Scoring","formula":"Formel","subtotal":"Zwischensumme","total":"Insgesamt","min_score_visibility":"Minimaler Score für Sichtbarkeit","score_to_hide":"Score, um den Beitrag zu verbergen","take_action_bonus":{"name":"Maßnahme ergriffen","title":"Wenn ein Teammitglied entscheidet, eine Maßnahme zu ergreifen, bekommt das Kennzeichen einen Bonus."},"user_accuracy_bonus":{"name":"Benutzer-Genauigkeit","title":"Benutzer, deren Kennzeichen in Vergangenheit mit einem gewährten Bonus übereinstimmten"},"trust_level_bonus":{"name":"Vertrauensstufe","title":"Überprüfbare Elemente, die von Benutzern höherer Vertrauensstufen angelegt wurden, haben einen höheren Score."},"type_bonus":{"name":"Bonus Typ","title":"Bestimmte überprüfbare Typen können vom Team mit einem Bonus ausgestattet werden, damit sie höher priorisiert sind."}},"claim_help":{"optional":"Du kannst dieses Element reservieren, damit andere es nicht überprüfen.","required":"Du musst Elemente reservieren, bevor du sie überprüfen kannst.","claimed_by_you":"Du hast dieses Element reserviert und kannst es überprüfen.","claimed_by_other":"Dieses Element kann nur von \u003cb\u003e%{username}\u003c/b\u003e überprüft werden."},"claim":{"title":"Reserviere dieses Thema"},"unclaim":{"help":"Entferne diese Reservierung"},"awaiting_approval":"Wartet auf Genehmigung","delete":"Löschen","settings":{"saved":"Gespeichert","save_changes":"Speichern","title":"Einstellungen","priorities":{"title":"Überprüfbare Prioritäten"}},"moderation_history":"Moderationsverlauf","view_all":"Alle anzeigen","grouped_by_topic":"Gruppiert nach Thema","none":"Es sind keine Einträge zur Überprüfung vorhanden.","view_pending":"zeige verbleibende","topic_has_pending":{"one":"Dieses Thema hat \u003cb\u003e%{count}\u003c/b\u003e Beitrag, der auf Genehmigung wartet.","other":"Dieses Thema hat \u003cb\u003e%{count}\u003c/b\u003e Beiträge, die auf Genehmigung warten."},"title":"Überprüfen","topic":"Thema:","filtered_topic":"Du hast nach zu prüfenden Inhalten in einem einzelnen Thema gefiltert.","filtered_user":"Benutzer","filtered_reviewed_by":"Überprüft von","show_all_topics":"Zeige alle Themen","deleted_post":"(Beitrag gelöscht)","deleted_user":"(Benutzer gelöscht)","user":{"bio":"Bio","website":"Website","username":"Benutzername","email":"E-Mail","name":"Name","fields":"Felder","reject_reason":"Grund"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (des letzten Flags)","other":"%{agreed}, %{disagreed}, %{ignored} (der letzten %{count} Flags)"},"agreed":{"one":"%{count}% zugestimmt","other":"%{count}% zugestimmt"},"disagreed":{"one":"%{count}% abgelehnt","other":"%{count}% abgelehnt"},"ignored":{"one":"%{count}% ignoriert","other":"%{count}% ignoriert"}},"topics":{"topic":"Thema","reviewable_count":"Anzahl","reported_by":"Gemeldet von","deleted":"[Thema gelöscht]","original":"(ursprüngliches Thema)","details":"Details","unique_users":{"one":"%{count} Benutzer","other":"%{count} Benutzer"}},"replies":{"one":"%{count} Antwort","other":"%{count} Antworten"},"edit":"Bearbeiten","save":"Speichern","cancel":"Abbrechen","new_topic":"Das Bestätigen dieses Elements wird ein neues Thema erstellen","filters":{"all_categories":"(alle Kategorien)","type":{"title":"Typ","all":"(alle Arten)"},"minimum_score":"Minimale Bewertung:","refresh":"Aktualisieren","status":"Status","category":"Kategorie","orders":{"score":"Wertung","score_asc":"Punktzahl (umgekehrt)","created_at":"Erstellt am","created_at_asc":"Erstellt am (umgekehrt)"},"priority":{"title":"Minimale Priorität","any":"(irgendein)","low":"Niedrig","medium":"Mittel","high":"Hoch"}},"conversation":{"view_full":"zeige vollständige Unterhaltung"},"scores":{"about":"Dieser Wert wird basierend auf der Vertrauensstufe des Meldenden, der Richtigkeit der vorhergehenden Meldungen sowie der Priorität des gemeldeten Elements berechnet.","score":"Wertung","date":"Datum","type":"Typ","status":"Status","submitted_by":"Abgesendet von","reviewed_by":"Überprüft von"},"statuses":{"pending":{"title":"Ausstehend"},"approved":{"title":"Genehmigt"},"rejected":{"title":"Abgelehnt"},"ignored":{"title":"Ignoriert"},"deleted":{"title":"Gelöscht"},"reviewed":{"title":"(alle überprüft)"},"all":{"title":"(alles)"}},"types":{"reviewable_flagged_post":{"title":"Gemeldeter Beitrag","flagged_by":"Gemeldet von"},"reviewable_queued_topic":{"title":"Thema in der Warteschlange"},"reviewable_queued_post":{"title":"Beitrag in der Warteschlange"},"reviewable_user":{"title":"Benutzer"},"reviewable_post":{"title":"Beitrag"}},"approval":{"title":"Beitrag muss genehmigt werden","description":"Wir haben deinen neuen Beitrag erhalten. Dieser muss jedoch von einem Moderator genehmigt werden, bevor er angezeigt wird. Bitte habe etwas Geduld.","pending_posts":{"one":"Du hast \u003cstrong\u003e%{count}\u003c/strong\u003e verbleibenden Beitrag.","other":"Du hast \u003cstrong\u003e%{count}\u003c/strong\u003e verbleibende Beiträge."},"ok":"OK"},"example_username":"benutzername","reject_reason":{"title":"Warum lehnst du diesen Benutzer ab?","send_email":"Ablehnungs-E-Mail senden"}},"relative_time_picker":{"minutes":{"one":"Minute","other":"Minuten"},"hours":{"one":"Stunde","other":"Stunden"},"days":{"one":"Tag","other":"Tage"},"months":{"one":"Monat","other":"Monate"},"years":{"one":"Jahr","other":"Jahre"},"relative":"Relativ"},"time_shortcut":{"later_today":"Im Laufe des Tages","next_business_day":"Nächster Arbeitstag","tomorrow":"Morgen","next_week":"Nächste Woche","post_local_date":"Datum im Beitrag","later_this_week":"Später in dieser Woche","start_of_next_business_week":"Montag","start_of_next_business_week_alt":"Am kommenden Montag","next_month":"Nächsten Monat","custom":"Datum und Uhrzeit auswählen","relative":"Relative Zeit","none":"Nicht notwendig","last_custom":"Letztes benutzerdefiniertes Datum"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e hat \u003ca href='%{topicUrl}'\u003edas Thema\u003c/a\u003e verfasst","you_posted_topic":"\u003ca href=\"%{userUrl}\"\u003eDu\u003c/a\u003e hast \u003ca href=\"%{topicUrl}\"\u003edas Thema\u003c/a\u003e verfasst","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e hat auf \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e geantwortet","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e hast auf \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e geantwortet","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e hat auf \u003ca href='%{topicUrl}'\u003edas Thema\u003c/a\u003e geantwortet","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e hast auf \u003ca href='%{topicUrl}'\u003edas Thema\u003c/a\u003e geantwortet","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e hat \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e erwähnt","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e hat \u003ca href='%{user2Url}'\u003edich\u003c/a\u003e erwähnt","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eDu\u003c/a\u003e hast \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e erwähnt","posted_by_user":"Geschrieben von \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Von \u003ca href='%{userUrl}'\u003edir\u003c/a\u003e geschrieben","sent_by_user":"Von \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e gesendet","sent_by_you":"Von \u003ca href='%{userUrl}'\u003edir\u003c/a\u003e gesendet"},"directory":{"username":"Benutzername","filter_name":"nach Benutzername filtern","title":"Benutzer","likes_given":"Gegeben","likes_received":"Erhalten","topics_entered":"Betrachtet","topics_entered_long":"Betrachtete Themen","time_read":"Lesezeit","topic_count":"Themen","topic_count_long":"Erstellte Themen","post_count":"Beiträge","post_count_long":"Verfasste Beiträge","no_results":"Es wurden keine Ergebnisse gefunden.","days_visited":"Aufrufe","days_visited_long":"Besuchstage","posts_read":"Gelesen","posts_read_long":"Gelesene Beiträge","last_updated":"zuletzt aktualisiert","total_rows":{"one":"%{count} Benutzer","other":"%{count} Benutzer"}},"group_histories":{"actions":{"change_group_setting":"Gruppeneinstellung ändern","add_user_to_group":"Benutzer hinzufügen","remove_user_from_group":"Benutzer entfernen","make_user_group_owner":"Zum Eigentümer machen","remove_user_as_group_owner":"Eigentümerrechte entziehen"}},"groups":{"member_added":"Hinzugefügt","member_requested":"Angefragt am","add_members":{"title":"Mitglieder zu %{group_name} hinzufügen","description":"Du kannst auch eine durch Kommas getrennte Liste einfügen.","usernames_or_emails":{"title":"Benutzernamen oder E-Mail-Adressen eingeben","input_placeholder":"Benutzernamen oder E-Mails"},"usernames":{"title":"Benutzernamen eingeben","input_placeholder":"Benutzernamen"},"notify_users":"Benutzer benachrichtigen"},"requests":{"title":"Anfragen","reason":"Grund","accept":"Akzeptieren","accepted":"akzeptiert","deny":"ablehnen","denied":"abgelehnt","undone":"Anfrage zurückgenommen","handle":"Mitgliedschaftsanfrage bearbeiten"},"manage":{"title":"Verwalten","name":"Name","full_name":"Vollständiger Name","add_members":"Mitglieder hinzufügen","delete_member_confirm":"Entferne „%{username}“ aus der Gruppe „%{group}“?","profile":{"title":"Profi"},"interaction":{"title":"Interaktion","posting":"Beiträge","notification":"Benachrichtigung"},"email":{"title":"E-Mail","status":"Synchronisiert %{old_emails} / %{total_emails} E-Mails über IMAP.","credentials":{"title":"Zugangsdaten","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"SSL für SMTP verwenden","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"SSL für IMAP verwenden","username":"Benutzername","password":"Passwort"},"settings":{"title":"Einstellungen","allow_unknown_sender_topic_replies":"Unbekannte Absender Antworten auf ein Thema erlauben.","allow_unknown_sender_topic_replies_hint":"Erlaubt unbekannten Absendern auf Gruppenthemen zu antworten. Wenn dies nicht aktiviert ist, Antworten von E-Mail-Adressen, die nicht bereits im IMAP-E-Mail-Thread enthalten sind oder zum Thema eingeladen werden, werden ein neues Thema erstellen."},"mailboxes":{"synchronized":"Synchronisierte Mailbox","none_found":"In diesem E-Mail Konto wurden keine Postfächer gefunden."}},"membership":{"title":"Mitgliedschaft","access":"Zugriff"},"categories":{"title":"Kategorien","long_title":"Standardbenachrichtigungen für Kategorien","description":"Wenn Benutzer zu dieser Gruppe hinzugefügt werden, werden ihre Einstellungen für die Kategoriebenachrichtigung auf diese Standardeinstellungen festgelegt. Danach können sie sie ändern.","watched_categories_instructions":"Beobachte automatisch alle Themen in diesen Kategorien. Gruppenmitglieder werden über alle neuen Beiträge und Themen informiert, und neben dem Thema wird auch eine Anzahl neuer Beiträge angezeigt.","tracked_categories_instructions":"Verfolge automatisch alle Themen in diesen Kategorien. Neben dem Thema wird eine Anzahl neuer Beiträge angezeigt.","watching_first_post_categories_instructions":"Benutzer werden über den ersten Beitrag in jedem neuen Thema in diesen Kategorien informiert.","regular_categories_instructions":"Wenn diese Kategorien stummgeschaltet sind, werden sie für Gruppenmitglieder nicht stummgeschaltet. Benutzer werden benachrichtigt, wenn sie erwähnt werden oder jemand auf sie antwortet.","muted_categories_instructions":"Benutzer werden nicht über neue Themen in diesen Kategorien informiert und sie werden nicht auf den Kategorien oder den Seiten mit den neuesten Themen angezeigt."},"tags":{"title":"Schlagwörter","long_title":"Tags Standardbenachrichtigungen","description":"Wenn Benutzer zu dieser Gruppe hinzugefügt werden, werden ihre Einstellungen für die Tag-Benachrichtigung auf diese Standardeinstellungen festgelegt. Danach können sie sie ändern.","watched_tags_instructions":"Beobachte automatisch alle Themen mit diesen Tags. Gruppenmitglieder werden über alle neuen Beiträge und Themen informiert, und neben dem Thema wird auch eine Anzahl neuer Beiträge angezeigt.","tracked_tags_instructions":"Verfolge automatisch alle Themen mit diesen Tags. Neben dem Thema wird eine Anzahl neuer Beiträge angezeigt.","watching_first_post_tags_instructions":"Benutzer werden mit diesen Tags über den ersten Beitrag in jedem neuen Thema informiert.","regular_tags_instructions":"Wenn diese Tags stummgeschaltet sind, werden sie für Gruppenmitglieder nicht stummgeschaltet. Benutzer werden benachrichtigt, wenn sie erwähnt werden oder jemand auf sie antwortet.","muted_tags_instructions":"Benutzer werden mit diesen Tags nicht über neue Themen informiert, und sie werden nicht unter Aktuell angezeigt."},"logs":{"title":"Protokoll","when":"Wann","action":"Aktion","acting_user":"Ausführender Benutzer","target_user":"Betroffener Benutzer","subject":"Betreff","details":"Details","from":"Von","to":"An"}},"permissions":{"title":"Berechtigungen","none":"Dieser Gruppe sind keine Kategorien zugeordnet.","description":"Mitglieder dieser Gruppe können auf diese Kategorien zugreifen"},"public_admission":"Erlaube Benutzern, die Gruppe eigenständig zu betreten (Erfordert, dass die Gruppe öffentlich sichtbar ist)","public_exit":"Erlaube Benutzern, die Gruppe eigenständig zu verlassen","empty":{"posts":"Es gibt keine Beiträge von Mitgliedern dieser Gruppe.","members":"Es gibt keine Mitglieder in dieser Gruppe.","requests":"Keine Mitgliedschaftsanfragen für diese Gruppe.","mentions":"Es gibt keine Erwähnungen in dieser Gruppe.","messages":"Es gibt keine Nachrichten für diese Gruppe.","topics":"Es gibt keine Themen von Mitgliedern dieser Gruppe.","logs":"Es gibt keine Protokolleinträge für diese Gruppe."},"add":"Hinzufügen","join":"Beitreten","leave":"Verlassen","request":"Anfrage","message":"Nachricht","confirm_leave":"Willst du die Gruppe wirklich verlassen?","allow_membership_requests":"Erlaube Benutzern, Mitgliedschaftsanfragen an Gruppenbesitzer zu senden (erfordert, öffentlich sichtbare Gruppen)","membership_request_template":"Benutzerdefinierte Vorlage, das Benutzern angezeigt wird, die eine Mitgliedschaftsanfrage senden","membership_request":{"submit":"Anfrage abschicken","title":"Anfrage, um @%{group_name} beizutreten","reason":"Lass’ die Gruppenbesitzer wissen, warum du in diese Gruppe gehörst"},"membership":"Mitgliedschaft","name":"Name","group_name":"Gruppenname","user_count":"Benutzer","bio":"Über die Gruppe","selector_placeholder":"Benutzernamen eingeben","owner":"Eigentümer","index":{"title":"Gruppen","all":"Alle Gruppen","empty":"Es gibt keine sichtbaren Gruppen.","filter":"Filtern nach Art der Gruppe","owner_groups":"Gruppen, deren Eigentümer ich bin","close_groups":"Geschlossene Gruppe","automatic_groups":"Automatische Gruppen","automatic":"Automatisch","closed":"Geschlossen","public":"Öffentlich","private":"Geheim","public_groups":"Öffentliche Gruppen","automatic_group":"Automatische Gruppe","close_group":"Gruppe schließen","my_groups":"Meine Gruppen","group_type":"Art der Gruppe","is_group_user":"Mitglied","is_group_owner":"Eigentümer"},"title":{"one":"Gruppe","other":"Gruppen"},"activity":"Aktivität","members":{"title":"Mitglieder","filter_placeholder_admin":"Benutzername oder E-Mail-Adresse","filter_placeholder":"Benutzername","remove_member":"Mitglied entfernen","remove_member_description":"Entferne \u003cb\u003e%{username}\u003c/b\u003e aus dieser Gruppe","make_owner":"Als Eigentümer hinzufügen","make_owner_description":"Füge \u003cb\u003e%{username}\u003c/b\u003e als Eigentümer dieser Gruppe hinzu","remove_owner":"Als Eigentümer entfernen","remove_owner_description":"Entferne \u003cb\u003e%{username}\u003c/b\u003e als Eigentümer dieser Gruppe","make_primary":"als primär einstellen","make_primary_description":"Dies zur primären Gruppe für \u003cb\u003e%{username}\u003c/b\u003e machen","remove_primary":"Als Primär entfernen","remove_primary_description":"Entferne dies als primäre Gruppe für \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Mitglieder entfernen","remove_members_description":"Ausgewählte Benutzer aus dieser Gruppe entfernen","make_owners":"Als Eigentümer hinzufügen","make_owners_description":"Ausgewählte Benutzer Besitzer dieser Gruppe machen","remove_owners":"Besitzer entfernen","remove_owners_description":"Ausgewählte Benutzer als Besitzer dieser Gruppe entfernen","make_all_primary":"Alle als primär machen","make_all_primary_description":"Dies zur primären Gruppe für alle ausgewählten Benutzer machen","remove_all_primary":"Als Primär entfernen","remove_all_primary_description":"Diese Gruppe als primäre Gruppe entfernen","owner":"Eigentümer","primary":"Primär","forbidden":"Du hast nicht das Recht, die Mitglieder zu sehen."},"topics":"Themen","posts":"Beiträge","mentions":"Erwähnungen","messages":"Nachrichten","notification_level":"Standard-Benachrichtigungsstufe für Gruppen-Nachrichten","alias_levels":{"mentionable":"Wer kann diese Gruppe @erwähnen?","messageable":"Wer kann dieser Gruppe eine Nachricht schicken?","nobody":"Niemand","only_admins":"Nur Administratoren","mods_and_admins":"Nur Moderatoren und Administratoren","members_mods_and_admins":"Nur Gruppenmitglieder, Moderatoren und Administratoren","owners_mods_and_admins":"Nur Gruppeneigentümer, Moderatoren und Administratoren","everyone":"Jeder"},"notifications":{"watching":{"title":"Beobachten","description":"Du wirst über jeden neuen Beitrag in jeder Nachricht benachrichtigt und die Anzahl neuer Antworten wird angezeigt."},"watching_first_post":{"title":"Ersten Beitrag beobachten","description":"Du wirst über neue Nachrichten in dieser Gruppe informiert, aber nicht über Antworten auf diese Nachrichten."},"tracking":{"title":"Verfolgen","description":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet, und die Anzahl neuer Antworten wird angezeigt."},"regular":{"title":"Normal","description":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet."},"muted":{"title":"Stummgeschaltet","description":"Du erhältst keine Benachrichtigungen im Zusammenhang mit Nachrichten in dieser Gruppe."}},"flair_url":"Avatar-Flair Bild","flair_upload_description":"Verwende quadratische Bilder, die nicht kleiner als 20 x 20 Pixel sind.","flair_bg_color":"Avatar-Flair Hintergrundfarbe","flair_bg_color_placeholder":"(Optional) Hex-Farbwert","flair_color":"Avatar-Flair Farbe","flair_color_placeholder":"(Optoinal) Hex-Farbwert","flair_preview_icon":"Vorschau Symbol","flair_preview_image":"Vorschaubild","flair_type":{"icon":"Wähle ein Symbol","image":"Lade ein Bild hoch"}},"user_action_groups":{"1":"Abgegebene Likes","2":"Erhaltene Likes","3":"Lesezeichen","4":"Themen","5":"Beiträge","6":"Antworten","7":"Erwähnungen","9":"Zitate","11":"Änderungen","12":"Gesendete Objekte","13":"Posteingang","14":"Ausstehend","15":"Entwürfe"},"categories":{"all":"Alle Kategorien","all_subcategories":"alle","no_subcategory":"keine","category":"Kategorie","category_list":"Kategorieliste anzeigen","reorder":{"title":"Kategorien neu sortieren","title_long":"Neustrukturierung der Kategorieliste","save":"Reihenfolge speichern","apply_all":"Anwenden","position":"Position"},"posts":"Beiträge","topics":"Themen","latest":"Aktuelle Themen","toggle_ordering":"Reihenfolge ändern","subcategories":"Unterkategorien","muted":"Stummgeschaltete Kategorien","topic_sentence":{"one":"%{count} Thema","other":"%{count} Themen"},"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"Woche","month":"Monat"},"topic_stat_all_time":{"one":"%{number} gesamt","other":"%{number} gesamt"},"topic_stat_sentence_week":{"one":"%{count} neues Thema in der letzten Woche.","other":"%{count} neue Themen in der letzten Woche."},"topic_stat_sentence_month":{"one":"%{count} neues Thema im letzten Monat.","other":"%{count} neue Themen im letzten Monat."},"n_more":"Kategorien (%{count} weitere)..."},"ip_lookup":{"title":"IP-Adressen-Abfrage","hostname":"Hostname","location":"Standort","location_not_found":"(unbekannt)","organisation":"Organisation","phone":"Telefon","other_accounts":"Andere Konten mit dieser IP-Adresse:","delete_other_accounts":"%{count} löschen","username":"Benutzername","trust_level":"VS","read_time":"Lesezeit","topics_entered":"betrachtete Themen","post_count":"# Beiträge","confirm_delete_other_accounts":"Bist du sicher, dass du diese Konten löschen willst?","powered_by":"verwendet \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"kopiert"},"user_fields":{"none":"(wähle eine Option aus)","required":"Bitte gib einen Wert für \"%{name}\" ein"},"user":{"said":"%{username}:","profile":"Profil","mute":"Stummschalten","edit":"Einstellungen bearbeiten","download_archive":{"button_text":"Alle herunterladen","confirm":"Möchtest du wirklich deine Beiträge herunterladen?","success":"Der Export wurde gestartet. Du erhältst eine Nachricht, sobald der Vorgang abgeschlossen ist.","rate_limit_error":"Beiträge können pro Tag nur einmal heruntergeladen werden. Bitte versuch es morgen wieder."},"new_private_message":"Neue Nachricht","private_message":"Nachricht","private_messages":"Nachrichten","user_notifications":{"filters":{"filter_by":"Filtern nach","all":"Alle","read":"Gelesen","unread":"Ungelesen"},"ignore_duration_title":"Benutzer ignorieren","ignore_duration_username":"Benutzername","ignore_duration_when":"Dauer:","ignore_duration_save":"Ignorieren","ignore_duration_note":"Bitte beachte, dass alle Ignorierungen automatisch entfernt werden, wenn die Ignorierungsdauer verstreicht.","ignore_duration_time_frame_required":"Bitte wähle einen Zeitrahmen aus","ignore_no_users":"Du hast keine Benutzer ignoriert.","ignore_option":"Ignoriert","ignore_option_title":"Du wirst keine Benachrichtigungen zu dieser Person erhalten und ihre Themen und Antworten werden ausgeblendet.","add_ignored_user":"Hinzufügen...","mute_option":"Stummgeschaltet","mute_option_title":"Du wirst keine Benachrichtigungen zu dieser Person bekommen.","normal_option":"Normal","normal_option_title":"Du wirst benachrichtigt, wenn diese Person dir antwortet, dich zitiert oder erwähnt."},"notification_schedule":{"title":"Zeitplan für Benachrichtigungen","label":"Aktiviere den benutzerdefinierten Zeitplan für Benachrichtigungen","tip":"Außerhalb dieser Zeiten wird automatisch der \"Nicht stören\"-Modus aktiviert.","midnight":"Mitternacht","none":"keine","monday":"Montag","tuesday":"Dienstag","wednesday":"Mittwoch","thursday":"Donnerstag","friday":"Freitag","saturday":"Samstag","sunday":"Sonntag","to":"bis"},"activity_stream":"Aktivität","read":"Gelesen","read_help":"Kürzlich gelesene Themen","preferences":"Einstellungen","feature_topic_on_profile":{"open_search":"Wähle ein neues Thema","title":"Wähle ein Thema","search_label":"Suche nach einem Thema anhand der Überschrift","save":"Speichern","clear":{"title":"Filter zurücksetzen","warning":"Willst du wirklich dein Thema entfernen?"}},"use_current_timezone":"Aktuelle Zeitzone verwenden","profile_hidden":"Das öffentliche Profil des Benutzers ist ausgeblendet.","expand_profile":"Erweitern","collapse_profile":"Zuklappen","bookmarks":"Lesezeichen","bio":"Über mich","timezone":"Zeitzone","invited_by":"Eingeladen von","trust_level":"Vertrauensstufe","notifications":"Benachrichtigungen","statistics":"Statistiken","desktop_notifications":{"label":"Live-Benachrichtigungen","not_supported":"Dieser Browser unterstützt leider keine Benachrichtigungen.","perm_default":"Benachrichtigungen einschalten","perm_denied_btn":"Zugriff verweigert","perm_denied_expl":"Du hast das Anzeigen von Benachrichtigungen verboten. Aktiviere die Benachrichtigungen über deine Browser-Einstellungen.","disable":"Benachrichtigungen deaktivieren","enable":"Benachrichtigungen aktivieren","each_browser_note":"Hinweis: Du musst diese Einstellung in jedem von Dir verwendeten Browser ändern. Alle Benachrichtigungen werden deaktiviert, wenn \"Nicht stören\" angezeigt wird, unabhängig von dieser Einstellung.","consent_prompt":"Möchtest du Live-Benachrichtigungen erhalten, wenn jemand auf deine Beiträge antwortet?"},"dismiss":"Alles gelesen","dismiss_notifications":"Alles gelesen","dismiss_notifications_tooltip":"Alle ungelesenen Benachrichtigungen als gelesen markieren","no_messages_title":"Du hast keine Nachrichten","no_messages_body":"Benötigst Du ein direktes persönliches Gespräch mit jemandem außerhalb des normalen Gesprächsflusses? Sende ihnen eine Nachricht, indem Sie ihren Avatar auswählst und die %{icon} Nachrichtentaste verwendest.\u003cbr\u003e\u003cbr\u003e Wenn Du Hilfe benötigst, kannst Du \u003ca href='%{aboutUrl}'\u003eNachricht an einen Mitarbeiter senden\u003c/a\u003e.\n","no_bookmarks_title":"Du hast noch nichts mit einem Lesezeichen versehen","no_bookmarks_body":"Beginne Lesezeichen von Beiträgen mit der Schaltfläche %{icon} zu setzen und sie werden hier zum einfachen Nachschlagen aufgeführt. Du kannst auch eine Erinnerung vereinbaren!\n","no_notifications_title":"Du hast noch keine Benachrichtigungen","no_notifications_body":"Du wirst in diesem Panel über für Dich direkt relevante Aktivitäten benachrichtigt einschließlich Antworten auf Deine Themen, wenn jemand mit \u003cb\u003e@mentions\u003c/b\u003e Dich erwähnt oder auf Dich antwortet bei Themen, die Du beobachtest. Benachrichtigungen werden auch an Deine E-Mail gesendet, wenn Du dich eine Weile nicht eingeloggt hast. \u003cbr\u003e\u003cbr\u003e Suche nach der %{icon} -Taste, um zu entscheiden, bei welchen Themen, Kategorien und Schlagwörter Du neachrichtigt werden möchtest. Für weiteres schaue in die \u003ca href='%{preferencesUrl}'\u003eBenutzereinstellungen\u003c/a\u003e.\n","first_notification":"Deine erste Benachrichtigung! Wähle sie aus um fortzufahren.","dynamic_favicon":"Zeige Anzahl im Browser-Icon","skip_new_user_tips":{"description":"Keine Tipps für neue Benutzer anzeigen und nicht über den Erhalt von „Erste Schritte“-Abzeichen informieren","not_first_time":"Nicht dein erstes Mal?","skip_link":"Überspringe diese Tipps"},"theme_default_on_all_devices":"Mache dieses Theme zum Standard für alle meine Geräte","color_scheme_default_on_all_devices":"Standard-Farbschema(s) auf allen meinen Geräten festlegen","color_scheme":"Farbschema","color_schemes":{"default_description":"Theme Standard","disable_dark_scheme":"gleich wie regulär","dark_instructions":"Du kannst das dunkle Farbschema ausprobieren, indem du das dunkle Design auf deinem Gerät einschaltest.","undo":"Zurücksetzen","regular":"Regulär","dark":"Dunkler Modus","default_dark_scheme":"(Standard)"},"dark_mode":"Dunkler Modus","dark_mode_enable":"Dunkles Design automatisch aktivieren","text_size_default_on_all_devices":"Mache diese Schriftgröße zum Standard für alle meine Geräte","allow_private_messages":"Anderen Benutzern erlauben, mir persönliche Nachrichten zu schicken","external_links_in_new_tab":"Öffne alle externen Links in einem neuen Tab","enable_quoting":"Aktiviere Zitatantwort mit dem hervorgehobenen Text","enable_defer":"Aktiviere Verzögerung für das ungelesen Markieren von Themen","change":"ändern","featured_topic":"Hervorgehobenes Thema","moderator":"%{user} ist ein Moderator","admin":"%{user} ist ein Administrator","moderator_tooltip":"Dieser Benutzer ist ein Moderator","admin_tooltip":"Dieser Benutzer ist ein Administrator","silenced_tooltip":"Der Benutzer ist stummgeschaltet","suspended_notice":"Dieser Benutzer ist bis zum %{date} gesperrt.","suspended_permanently":"Der Benutzer ist gesperrt.","suspended_reason":"Grund: ","github_profile":"GitHub","email_activity_summary":"Aktivitäts-Übersicht","mailing_list_mode":{"label":"Mailinglisten-Modus","enabled":"Mailinglisten-Modus aktivieren","instructions":"Diese Einstellung überschreibt die Aktivitäts-Übersicht.\u003cbr /\u003e\nStummgeschaltete Themen und Kategorien werden in diese E-Mails nicht eingeschlossen.\n","individual":"Für jeden Beitrag eine E-Mail senden","individual_no_echo":"Sende für alle fremden Beträge eine E-Mail","many_per_day":"Sende mir für jeden neuen Beitrag eine E-Mail (etwa %{dailyEmailEstimate} pro Tag)","few_per_day":"Sende mir für jeden neuen Beitrag eine E-Mail (etwa 2 pro Tag)","warning":"Mailinglisten-Modus aktiviert. Einstellungen zur Benachrichtigung per E-Mail werden nicht berücksichtigt."},"tag_settings":"Schlagwörter","watched_tags":"Beobachtet","watched_tags_instructions":"Du wirst automatisch alle neuen Themen mit diesen Schlagwörtern beobachten. Du wirst über alle neuen Beiträge und Themen benachrichtigt und die Anzahl der neuen Antworten wird bei den betroffenen Themen angezeigt.","tracked_tags":"Verfolgt","tracked_tags_instructions":"Du wirst automatisch alle Themen mit diesen Schlagwörtern verfolgen. Die Anzahl der neuen Antworten wird bei den betroffenen Themen angezeigt.","muted_tags":"Stummgeschaltet","muted_tags_instructions":"Du erhältst keine Benachrichtigungen über neue Themen mit diesen Schlagwörtern und die Themen werden auch nicht in der Liste der aktuellen Themen erscheinen.","watched_categories":"Beobachtet","watched_categories_instructions":"Du wirst automatisch alle neuen Themen in diesen Kategorien beobachten. Du wirst über alle neuen Beiträge und Themen benachrichtigt und die Anzahl der neuen Antworten wird bei den betroffenen Themen angezeigt.","tracked_categories":"Verfolgt","tracked_categories_instructions":"Du wirst automatisch alle Themen in diesen Kategorien verfolgen. Die Anzahl der neuen Beiträge wird neben dem Thema erscheinen.","watched_first_post_categories":"Ersten Beitrag beobachten","watched_first_post_categories_instructions":"Du erhältst eine Benachrichtigung für den ersten Beitrag in jedem neuen Thema in diesen Kategorien.","watched_first_post_tags":"Ersten Beitrag beobachten","watched_first_post_tags_instructions":"Du erhältst eine Benachrichtigung für den ersten Beitrag in jedem neuen Thema mit diesen Schlagwörtern.","muted_categories":"Stummgeschaltet","muted_categories_instructions":"Du erhältst keine Benachrichtigungen über neue Themen in dieser Kategorie und die Themen werden auch nicht in der Liste der Kategorien oder der aktuellen Themen erscheinen.","muted_categories_instructions_dont_hide":"Du bekommst keine Benachrichtigung über irgendetwas an neuen Themen in diesen Kategorien.","regular_categories":"Stammgast","regular_categories_instructions":"Diese Kategorien werden in den Themenlisten „Neueste“ und „Top“ angezeigt.","no_category_access":"Moderaturen haben eingeschränkte Kategorien-Berechtigungen, Speichern ist nicht verfügbar.","delete_account":"Lösche mein Benutzerkonto","delete_account_confirm":"Möchtest du wirklich dein Benutzerkonto permanent löschen? Diese Aktion kann nicht rückgängig gemacht werden!","deleted_yourself":"Dein Benutzerkonto wurde erfolgreich gelöscht.","delete_yourself_not_allowed":"Bitte kontaktiere das Team, wenn du möchtest, dass dein Konto gelöscht wird.","unread_message_count":"Nachrichten","admin_delete":"Löschen","users":"Benutzer","muted_users":"Stummgeschaltet","muted_users_instructions":"Alle Benachrichtigungen und PMs von diesen Benutzern unterdrücken.","allowed_pm_users":"Erlaubt","allowed_pm_users_instructions":"Nur PMs von diesen Benutzern zulassen.","allow_private_messages_from_specific_users":"Nur bestimmten Benutzern erlauben, mir persönliche Nachrichten zu senden","ignored_users":"Ignoriert","ignored_users_instructions":"Alle Beiträge, Benachrichtigungen und persönlichen Nachrichten von diesen Benutzern unterdrücken.","tracked_topics_link":"Anzeigen","automatically_unpin_topics":"Angeheftete Themen automatisch loslösen, wenn ich deren letzten Beitrag gelesen habe.","apps":"Apps","revoke_access":"Entziehe Zugriffsrecht","undo_revoke_access":"Zugriffsrecht wiederherstellen","api_approved":"Genehmigt:","api_last_used_at":"Zuletzt benutzt am:","theme":"Design","save_to_change_theme":"Das Thema wird aktualisiert, wenn du auf \"%{save_text}“ geklickt hast.","home":"Standard-Startseite","staged":"Vorbereitet","staff_counters":{"flags_given":"hilfreiche Meldungen","flagged_posts":"gemeldete Beiträge","deleted_posts":"gelöschte Beiträge","suspensions":"Sperren","warnings_received":"Warnungen","rejected_posts":"abgelehnte Beiträge"},"messages":{"all":"Alle","inbox":"Posteingang","sent":"Gesendet","archive":"Archiv","groups":"Meine Gruppen","bulk_select":"Nachrichten auswählen","move_to_inbox":"In Posteingang verschieben","move_to_archive":"Archivieren","failed_to_move":"Die ausgewählten Nachrichten konnten nicht verschoben werden. Vielleicht gibt es ein Netzwerkproblem.","select_all":"Alle auswählen","tags":"Schlagwörter"},"preferences_nav":{"account":"Konto","security":"Sicherheit","profile":"Profil","emails":"E-Mails","notifications":"Benachrichtigungen","categories":"Kategorien","users":"Benutzer","tags":"Schlagwörter","interface":"Oberfläche","apps":"Apps"},"change_password":{"success":"(E-Mail gesendet)","in_progress":"(E-Mail wird gesendet)","error":"(Fehler)","emoji":"Emoji sperren","action":"Sende eine E-Mail zum Zurücksetzen des Passworts","set_password":"Passwort ändern","choose_new":"Wähle ein neues Passwort","choose":"Wähle ein Passwort"},"second_factor_backup":{"title":"Wiederherstellungscodes für Zwei-Faktor-Authentifizierung","regenerate":"Erneuern","disable":"Deaktivieren","enable":"Aktivieren","enable_long":"Wiederherstellungscodes aktivieren","manage":{"one":"Verwalte deine Wiederherstellungscodes. Du hast noch \u003cstrong\u003e%{count}\u003c/strong\u003e verbleibenden Wiederherstellungscode.","other":"Verwalte deine Wiederherstellungscodes. Du hast noch \u003cstrong\u003e%{count}\u003c/strong\u003e verbleibende Wiederherstellungscodes."},"copy_to_clipboard":"In Zwischenablage kopieren","copy_to_clipboard_error":"Beim Kopieren in die Zwischenablage trat ein Fehler auf","copied_to_clipboard":"Wurde in Zwischenablage kopiert","download_backup_codes":"Wiederherstellungscodes herunterladen","remaining_codes":{"one":"Du hast noch \u003cstrong\u003e%{count}\u003c/strong\u003e verbleibenden Wiederherstellungscode.","other":"Du hast noch \u003cstrong\u003e%{count}\u003c/strong\u003e verbleibende Wiederherstellungscodes."},"use":"Benutze einen Wiederherstellungscode","enable_prerequisites":"Du musst vor dem Generieren von Wiederherstellungscodes einen primären, zweiten Faktor aktivieren.","codes":{"title":"Wiederherstellungscodes generiert","description":"Jeder dieser Wiederherstellungscodes kann nur einmal benutzt werden. Bewahre diese an einem sicheren, für dich zugänglichen Ort auf."}},"second_factor":{"title":"Zwei-Faktor-Authentifizierung","enable":"Zwei-Faktor-Authentifizierung verwalten","disable_all":"Alle deaktivieren","forgot_password":"Passwort vergessen?","confirm_password_description":"Bitte bestätige dein Passwort um fortzufahren","name":"Name","label":"Code","rate_limit":"Bitte warte ein wenig, bevor du es mit einem anderen Authentifizierungscode versuchst.","enable_description":"Scanne diesen QR-Code mit einer unterstützten App (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) und gib deinen Authentifizierungscode ein.\n","disable_description":"Bitte gib den Authentifizierungscode aus deiner App ein.","show_key_description":"Manuell eingeben","short_description":"Schütze dein Konto mit Einweg-Sicherheitscodes.\n","extended_description":"Zwei-Faktor-Authentifizierung erhöht die Sicherheit deines Kontos, indem zusätzlich zum Passwort ein einmalig gültiger Code erforderlich ist. Codes können auf \u003ca href=\"https://www.google.de/search?q=authenticator+app+f%C3%BCr+android\" target='_blank'\u003eAndroid\u003c/a\u003e und \u003ca href=\"https://www.google.de/search?q=authenticator+app+f%C3%BCr+iOS\"\u003eiOS\u003c/a\u003e Geräten generiert werden.\n","oauth_enabled_warning":"Bitte beachte, dass soziale Anmeldemethoden deaktiviert werden, sobald die Zwei-Faktor-Authentifizierung für dein Konto aktiviert wurde.","use":"Benutze die Authentifizierungs-App","enforced_notice":"Du musst die Zwei-Faktor-Authentifizierung aktivieren, um auf die Website zugreifen zu können.","disable":"Deaktivieren","disable_confirm":"Sollen wirklich alle Methoden zur Zwei-Faktor-Authentifizierung deaktiviert werden?","save":"Speichern","edit":"Bearbeiten","edit_title":"Authenticator bearbeiten","edit_description":"Authentifikator-Name","enable_security_key_description":"Wenn du deinen \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003eHardware-Sicherheitsschlüssel\u003c/a\u003e vorbereitet hast, klicke unten auf Registrieren.\n","totp":{"title":"Token-basierte Authentifikatoren","add":"Authentifikator hinzufügen","default_name":"Mein Authentifikator","name_and_code_required_error":"Du musst einen Namen und den Code aus deiner Authentifizierungs-App angeben."},"security_key":{"register":"Registrieren","title":"Sicherheitsschlüssel","add":"Sicherheitsschlüssel hinzufügen","default_name":"Hauptsicherheitsschlüssel","not_allowed_error":"Der Registrierungsvorgang für den Sicherheitsschlüssel ist abgelaufen oder wurde abgebrochen.","already_added_error":"Du hast diesen Sicherheitsschlüssel bereits registriert. Du musst Ihn nicht erneut registrieren.","edit":"Bearbeite den Sicherheitsschlüssel","save":"Speichern","edit_description":"Name des Sicherheitsschlüssels","name_required_error":"Ein wird ein Name für den Sicherheitsschlüssel benötigt."}},"change_about":{"title":"„Über mich“ ändern","error":"Beim Ändern dieses Wertes ist ein Fehler aufgetreten."},"change_username":{"title":"Benutzernamen ändern","confirm":"Bist du dir ganz sicher, dass du deinen Benutzernamen ändern möchtest?","taken":"Der Benutzername ist bereits vergeben.","invalid":"Der Benutzernamen ist nicht zulässig. Er darf nur Zahlen und Buchstaben enthalten."},"add_email":{"title":"E-Mail hinzufügen","add":"Hinzufügen"},"change_email":{"title":"E-Mail-Adresse ändern","taken":"Entschuldige, diese E-Mail-Adresse ist nicht verfügbar.","error":"Beim Ändern der E-Mail-Adresse ist ein Fehler aufgetreten. Möglicherweise wird diese Adresse schon benutzt.","success":"Wir haben eine E-Mail an die angegebene E-Mail-Adresse gesendet. Folge zur Bestätigung der Adresse bitte den darin enthaltenen Anweisungen.","success_via_admin":"Wir haben eine E-Mail an diese Adresse gesendet. Der Benutzer muss den Bestätigungsanweisungen in der E-Mail folgen.","success_staff":"Wir haben eine E-Mail an deine aktuelle Adresse geschickt. Bitte folge den Bestätigungsanweisungen."},"change_avatar":{"title":"Ändere dein Profilbild","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, basierend auf","gravatar_title":"Ändere deinen Avatar auf der Website von %{gravatarName}","gravatar_failed":"%{gravatarName} zu dieser Email-Adresse nicht gefunden.","refresh_gravatar_title":"Aktualisiere deinen %{gravatarName}","letter_based":"ein vom System zugewiesenes Profilbild","uploaded_avatar":"Eigenes Bild","uploaded_avatar_empty":"Eigenes Bild hinzufügen","upload_title":"Lade dein Bild hoch","image_is_not_a_square":"Achtung: Wir haben dein Bild zugeschnitten, weil Höhe und Breite nicht übereingestimmt haben.","logo_small":"Das kleine Logo der Website. Es wird standardmäßig verwendet."},"change_profile_background":{"title":"Profil Kopfzeile","instructions":"Profil Kopfzeilen werden zentriert und haben eine Standardbreite von 1110px."},"change_card_background":{"title":"Benutzerkarten-Hintergrund","instructions":"Hintergrundbilder werden zentriert und haben eine Standardbreite von 590px."},"change_featured_topic":{"title":"Hervorgehobenes Thema","instructions":"Eine Verknüpfung zu diesem Thema wird auf deiner Benutzerkarte und deinem Profil sein."},"email":{"title":"E-Mail","primary":"Primäre E-Mail-Adresse","secondary":"Weitere E-Mail-Adressen","primary_label":"erste","unconfirmed_label":"unbestätigt","resend_label":"Bestätigungs E-Mail erneut senden","resending_label":"sende...","resent_label":"E-Mail gesendet","update_email":"E-Mail-Adresse ändern","set_primary":"Primäre E-Mail Adresse festlegen","destroy":"E-Mail entfernen","add_email":"Alternative E-Mail Adresse hinzufügen","auth_override_instructions":"E-Mails können vom Authentifizierungsanbieter aktualisiert werden.","no_secondary":"Keine weiteren E-Mail-Adressen","instructions":"Nie öffentlich gezeigt.","admin_note":"Hinweis: Ein Administrator, der die E-Mail-Adresse eines anderen Nicht-Administratorbenutzers ändert, zeigt an, dass der Benutzer den Zugriff auf sein ursprüngliches E-Mail-Konto verloren hat. Daher wird eine E-Mail zum Zurücksetzen des Kennworts an seine neue Adresse gesendet. Die E-Mail-Adresse des Benutzers ändert sich erst, wenn der Vorgang zum Zurücksetzen des Kennworts abgeschlossen ist.","ok":"Wir senden dir zur Bestätigung eine E-Mail","required":"Bitte gib eine E-Mail Adresse ein","invalid":"Bitte gib eine gültige E-Mail-Adresse ein","authenticated":"Deine E-Mail-Adresse wurde von %{provider} bestätigt","invite_auth_email_invalid":"Ihre Einladungs-E-Mail stimmt nicht mit der von %{provider} authentifizierten E-Mail überein","frequency_immediately":"Wir werden dir sofort eine E-Mail senden, wenn du die betroffenen Inhalte noch nicht gelesen hast.","frequency":{"one":"Wir werden dir nur dann eine E-Mail senden, wenn wir dich nicht innerhalb der letzten Minute gesehen haben.","other":"Wir werden dir nur dann eine E-Mail senden, wenn wir dich nicht innerhalb der letzten %{count} Minuten gesehen haben."}},"associated_accounts":{"title":"Zugehörige Konten","connect":"Verbinden","revoke":"Entziehen","cancel":"Abbrechen","not_connected":"(nicht verbunden)","confirm_modal_title":"Verbinde %{provider} Konto","confirm_description":{"account_specific":"Dein %{provider} Konto '%{account_description}' wird für die Authentifizierung genutzt werden.","generic":"Dein %{provider} Konto wird für die Authentifzierung genutzt werden."}},"name":{"title":"Name","instructions":"dein vollständiger Name (optional)","instructions_required":"Dein vollständiger Name","required":"Bitte gib einen Namen ein","too_short":"Dein Name ist zu kurz","ok":"Dein Name sieht in Ordnung aus"},"username":{"title":"Benutzername","instructions":"einzigartig, keine Leerzeichen, kurz","short_instructions":"Leute können dich mit @%{username} erwähnen","available":"Dein Benutzername ist verfügbar","not_available":"Nicht verfügbar. Wie wäre es mit %{suggestion}?","not_available_no_suggestion":"Nicht verfügbar","too_short":"Dein Benutzername ist zu kurz","too_long":"Dein Benutzername ist zu lang","checking":"Verfügbarkeit wird geprüft…","prefilled":"E-Mail-Adresse entspricht diesem registrierten Benutzernamen","required":"Bitte einen Benutzernamen eingeben","edit":"Benutzername bearbeiten"},"locale":{"title":"Oberflächensprache","instructions":"Die Sprache der Forumsoberfläche. Diese Änderung tritt nach dem Neuladen der Seite in Kraft.","default":"(Standard)","any":"(keine Einschränkung)"},"password_confirmation":{"title":"Wiederholung des Passworts"},"invite_code":{"title":"Einladungs-Code","instructions":"Zur Registrierung eines Benutzerkontos wird ein Einladungs-Code benötigt."},"auth_tokens":{"title":"Kürzlich benutzte Geräte","details":"Details","log_out_all":"Überall abmelden","not_you":"Das bist nicht du?","show_all":"Alle anzeigen (%{count})","show_few":"Weniger anzeigen","was_this_you":"Warst das du?","was_this_you_description":"Wenn du das gewesen bist, empfehlen wir dir, dein Passwort zu ändern und dich überall abzumelden.","browser_and_device":"%{browser} auf %{device}","secure_account":"Mein Konto absichern","latest_post":"Dein letzter Beitrag…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP-Adresse: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003egerade aktiv\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"Letzter Beitrag","last_emailed":"Letzte E-Mail","last_seen":"Zuletzt gesehen","created":"Mitglied seit","log_out":"Abmelden","location":"Wohnort","website":"Website","email_settings":"E-Mail","hide_profile_and_presence":"Blende mein öffentliches Profil und Anwesenheitsfunktionen aus","enable_physical_keyboard":"Unterstützung für physische Tastatur auf dem iPad aktivieren","text_size":{"title":"Schriftgröße","smallest":"Kleinster","smaller":"Kleiner","normal":"Normal","larger":"Größer","largest":"Am größten"},"title_count_mode":{"title":"Hintergrund-Seitentitel zeigt Anzahl von:","notifications":"Neue Benachrichtigungen","contextual":"Neuer Seiteninhalt"},"like_notification_frequency":{"title":"Benachrichtigung für erhaltene Likes anzeigen","always":"immer","first_time_and_daily":"für den ersten Like sowie maximal täglich","first_time":"nur für den ersten Like eines Beitrags","never":"nie"},"email_previous_replies":{"title":"Füge vorherige Beiträge ans Ende von E-Mails an","unless_emailed":"sofern noch nicht gesendet","always":"immer","never":"nie"},"email_digests":{"title":"Wenn ich nicht vorbeischaue, sende mir eine E-Mail-Zusammenfassung beliebter Themen und Antworten","every_30_minutes":"alle 30 Minuten","every_hour":"stündlich","daily":"täglich","weekly":"wöchentlich","every_month":"jeden Monat","every_six_months":"alle sechs Monate"},"email_level":{"title":"Sende mir eine E-Mail, wenn mich jemand zitiert, auf meine Beiträge antwortet, meinen @Namen erwähnt oder mich zu einem Thema einlädt.","always":"immer","only_when_away":"nur bei Abwesenheit","never":"nie"},"email_messages_level":"Sende mir eine E-Mail, wenn mir jemand eine Nachricht sendet.","include_tl0_in_digests":"Inhalte neuer Benutzer in E-Mail-Zusammenfassung einschließen","email_in_reply_to":"Einen Auszug aus dem beantworteten Beitrag in E-Mails einfügen.","other_settings":"Andere","categories_settings":"Kategorien","new_topic_duration":{"label":"Themen als neu anzeigen, wenn","not_viewed":"ich diese noch nicht betrachtet habe","last_here":"seit meinem letzten Besuch erstellt","after_1_day":"innerhalb des letzten Tages erstellt","after_2_days":"in den letzten 2 Tagen erstellt","after_1_week":"in der letzten Woche erstellt","after_2_weeks":"in den letzten 2 Wochen erstellt"},"auto_track_topics":"Betrachtete Themen automatisch folgen","auto_track_options":{"never":"nie","immediately":"sofort","after_30_seconds":"nach 30 Sekunden","after_1_minute":"nach 1 Minute","after_2_minutes":"nach 2 Minuten","after_3_minutes":"nach 3 Minuten","after_4_minutes":"nach 4 Minuten","after_5_minutes":"nach 5 Minuten","after_10_minutes":"nach 10 Minuten"},"notification_level_when_replying":"Wenn ich in einem Thema antworte, setze das Thema auf","invited":{"title":"Einladungen","pending_tab":"Ausstehend","pending_tab_with_count":"Ausstehend (%{count})","expired_tab":"Abgelaufen","expired_tab_with_count":"Abgelaufen (%{count})","redeemed_tab":"Angenommen","redeemed_tab_with_count":"Angenommen (%{count})","invited_via":"Einladung","invited_via_link":"Link %{key} (%{count} / %{max} eingelöst)","groups":"Gruppen","topic":"Thema","sent":"Erstellt/Zuletzt gesendet","expires_at":"Gültig bis","edit":"Bearbeiten","remove":"Entfernen","copy_link":"Link abrufen","reinvite":"E-Mail erneut senden","reinvited":"Einladung erneut gesendet","removed":"Entfernt","search":"zum Suchen nach Einladungen hier eingeben…","user":"Eingeladener Benutzer","none":"Keine Einladungen anzuzeigen.","truncated":{"one":"Zeige die erste Einladung.","other":"Zeige die ersten %{count} Einladungen."},"redeemed":"Angenommene Einladungen","redeemed_at":"Angenommen","pending":"Ausstehende Einladungen","topics_entered":"Betrachtete Themen","posts_read_count":"Gelesene Beiträge","expired":"Diese Einladung ist abgelaufen.","remove_all":"Abgelaufene Einladungen entfernen","removed_all":"Alle abgelaufenen Einladungen entfernt!","remove_all_confirm":"Sollen alle abgelaufenen Einladungen entfernt werden?","reinvite_all":"Alle Einladungen erneut senden","reinvite_all_confirm":"Bist Du dir sicher alle Einladungen nochmals zu senden?","reinvited_all":"Alle Einladungen gesendet!","time_read":"Lesezeit","days_visited":"Besuchstage","account_age_days":"Konto-Alter in Tagen","create":"Einladen","generate_link":"Einladungslink erstellen","link_generated":"Hier ist dein Einladungslink!","valid_for":"Der Einladungslink ist nur für die Adresse %{email} gültig","single_user":"Einladen per E-Mail","multiple_user":"Per Link einladen","invite_link":{"title":"Einladungslink","success":"Der Einladungslink wurde erfolgreich generiert!","error":"Beim Erstellen des Einladungslinks ist ein Fehler aufgetreten","max_redemptions_allowed_label":"Wie viele Personen dürfen sich über diesen Link registrieren?","expires_at":"Wann läuft dieser Einladungslink ab?"},"invite":{"new_title":"Einladung erstellen","edit_title":"Einladung bearbeiten","instructions":"Teile diesen Link, um sofort Zugriff auf folgende Seite zu gewähren:","copy_link":"Link kopieren","expires_in_time":"Läuft in %{time} ab.","expired_at_time":"Abgelaufen um %{time}.","show_advanced":"Erweiterte Optionen anzeigen","hide_advanced":"Erweiterte Optionen ausblenden","restrict_email":"Einladung auf eine E-Mail-Adresse beschränken","max_redemptions_allowed":"Maximale Anzahl an Verwendungen:","add_to_groups":"Zu Gruppen hinzufügen:","invite_to_topic":"Beim ersten Login zum Thema senden:","expires_at":"Verfällt nach:","custom_message":"Optionale persönliche Nachricht:","send_invite_email":"Speichern und E-Mail senden","save_invite":"Einladung speichern","invite_saved":"Einladung gespeichert.","invite_copied":"Einladungslink kopiert.","blank_email":"Einladungslink nicht kopiert. E-Mailadresse wird benötigt."},"bulk_invite":{"none":"Keine Einladungen, die auf dieser Seite angezeigt werden können.","text":"Massen-Einladung","instructions":"\u003cp\u003eLade eine Liste von Benutzern ein, um deine Community schnell in Gang zu bringen. Bereite eine \u003ca href=\"https://de.wikipedia.org/wiki/CSV_(Dateiformat)\" target=\"_blank\"\u003eCSV-Datei\u003c/a\u003e mit mindestens einer Zeile pro E-Mail-Adresse vor, die du einladen möchtest. Die folgenden kommaseparierten Informationen können zur Verfügung gestellt werden, wenn du Personen zu Gruppen hinzufügen oder sie bei der ersten Anmeldung an ein bestimmtes Thema senden möchtest.\u003c/p\u003e\n\u003cpre\u003emax@mustermann.de,erster_gruppenname;zweiter_gruppenname,topic_id\u003c/pre\u003e\n\u003cp\u003eAn jede E-Mail-Adresse in deiner hochgeladenen CSV-Datei wird eine Einladung gesendet. Du kannst diese später verwalten.\u003c/p\u003e\n","progress":"Hochgeladen %{progress}%...","success":"Die Datei wurde erfolgreich hochgeladen. Du erhältst eine Nachricht, sobald der Vorgang abgeschlossen ist.","error":"Die Datei sollte im CSV Format vorliegen."}},"password":{"title":"Passwort","too_short":"Dein Passwort ist zu kurz.","common":"Das Passwort wird zu häufig verwendet.","same_as_username":"Dein Passwort entspricht deinem Benutzernamen.","same_as_email":"Dein Passwort entspricht deiner E-Mail-Adresse.","ok":"Dein Passwort sieht in Ordnung aus.","instructions":"mindestens %{count} Zeichen","required":"Bitte Passwort eingeben"},"summary":{"title":"Übersicht","stats":"Statistiken","time_read":"Lesezeit","recent_time_read":"aktuelle Lesezeit","topic_count":{"one":"Thema erstellt","other":"Themen erstellt"},"post_count":{"one":"Beitrag erstellt","other":"Beiträge erstellt"},"likes_given":{"one":"gegeben","other":"gegeben"},"likes_received":{"one":"erhalten","other":"erhalten"},"days_visited":{"one":"Besuchstag","other":"Besuchstage"},"topics_entered":{"one":"betrachtetes Thema","other":"betrachtete Themen"},"posts_read":{"one":"Beitrag gelesen","other":"Beiträge gelesen"},"bookmark_count":{"one":"Lesezeichen","other":"Lesezeichen"},"top_replies":"Die besten Beiträge","no_replies":"Noch keine Antworten.","more_replies":"weitere Beiträge","top_topics":"Die besten Themen","no_topics":"Noch keine Themen.","more_topics":"weitere Themen","top_badges":"Die besten Abzeichen","no_badges":"Noch keine Abzeichen.","more_badges":"weitere Abzeichen","top_links":"Die besten Links","no_links":"Noch keine Links.","most_liked_by":"Häufigste Likes von","most_liked_users":"Häufigste Likes für","most_replied_to_users":"Häufigste Antworten an","no_likes":"Noch keine Likes.","top_categories":"Top-Kategorien","topics":"Themen","replies":"Antworten"},"ip_address":{"title":"Letzte IP-Adresse"},"registration_ip_address":{"title":"IP-Adresse bei Registrierung"},"avatar":{"title":"Profilbild","header_title":"Profil, Nachrichten, Lesezeichen und Einstellungen","name_and_description":"%{name} - %{description}","edit":"Profilbild bearbeiten"},"title":{"title":"Titel","none":"(keiner)"},"primary_group":{"title":"Hauptgruppe","none":"(keiner)"},"filters":{"all":"Alle"},"stream":{"posted_by":"Verfasst von","sent_by":"Gesendet von","private_message":"Senden","the_topic":"das Thema"},"date_of_birth":{"user_title":"Heute ist dein Geburtstag!","title":"Der Benutzer feiert heute Geburtstag","label":"Geburtstag"},"anniversary":{"user_title":"Heute ist der Jahrestag deiner Anmeldung!","title":"Der Benutzer feiert heute den Jahrestag seiner Anmeldung!"}},"loading":"Wird geladen…","errors":{"prev_page":"während des Ladens","reasons":{"network":"Netzwerkfehler","server":"Server-Fehler","forbidden":"Zugriff verweigert","unknown":"Fehler","not_found":"Seite nicht gefunden"},"desc":{"network":"Bitte überprüfe deine Netzwerkverbindung.","network_fixed":"Sieht aus, als wäre es wieder da.","server":"Fehlercode: %{status}","forbidden":"Du darfst das nicht ansehen.","not_found":"Hoppla! Die Anwendung hat versucht eine URL zu laden, die nicht existiert.","unknown":"Etwas ist schief gelaufen."},"buttons":{"back":"Zurück","again":"Erneut versuchen","fixed":"Seite laden"}},"modal":{"close":"Schließen","dismiss_error":"Fehler ignorieren"},"close":"Schließen","assets_changed_confirm":"Diese Seite hat gerade ein Software-Upgrade erhalten. Jetzt die neueste Version bekommen?","logout":"Du wurdest abgemeldet.","refresh":"Aktualisieren","home":"Startseite","read_only_mode":{"enabled":"Diese Website befindet sich im Nur-Lesen-Modus. Du kannst weiterhin Inhalte lesen, aber das Erstellen von Beiträgen, Vergeben von Likes und Durchführen einiger weiterer Aktionen ist derzeit nicht möglich.","login_disabled":"Die Anmeldung ist deaktiviert während sich die Website im Nur-Lesen-Modus befindet.","logout_disabled":"Die Abmeldung ist deaktiviert während sich die Website im Nur-Lesen-Modus befindet."},"logs_error_rate_notice":{},"learn_more":"mehr erfahren…","first_post":"Erster Beitrag","mute":"Stummschalten","unmute":"Stummschaltung aufheben","last_post":"Geschrieben","local_time":"Ortszeit","time_read":"Gelesen","time_read_recently":"%{time_read} aktuell","time_read_tooltip":"%{time_read} Lesezeit insgesamt","time_read_recently_tooltip":"%{time_read} Lesezeit insgesamt (%{recent_time_read} in den letzten 60 Tagen)","last_reply_lowercase":"letzte Antw.","replies_lowercase":{"one":"Antwort","other":"Antworten"},"signup_cta":{"sign_up":"Registrieren","hide_session":"Erinnere mich morgen","hide_forever":"Nein danke","hidden_for_session":"In Ordnung, wir fragen dich morgen wieder. Du kannst dir auch jederzeit unter „Anmelden“ ein Benutzerkonto erstellen.","intro":"Hallo! Es sieht so aus, als ob dir diese Diskussion gefällt, aber Du hast bislang noch kein Konto angelegt.","value_prop":"Wenn du ein Benutzerkonto anlegst, merken wir uns, was du gelesen hast, damit du immer dort fortsetzen kannst, wo du aufgehört hast. Du kannst auch Benachrichtigungen – hier oder per E-Mail – erhalten, wenn jemand auf deine Beiträge antwortet. Beiträge, die dir gefallen, kannst du mit einem Like versehen und diese Freude mit allen teilen. :heartpulse:"},"summary":{"enabled_description":"Du siehst gerade eine Zusammenfassung des Themas: die interessantesten Beiträge, die von der Community bestimmt wurden.","description":{"one":"Es gibt \u003cb\u003e%{count}\u003c/b\u003e Antwort.","other":"Es gibt \u003cb\u003e%{count}\u003c/b\u003e Antworten."},"enable":"Zusammenfassung vom Thema erstellen","disable":"Alle Beiträge anzeigen"},"deleted_filter":{"enabled_description":"Dieses Thema enthält gelöschte Beiträge, die derzeit versteckt sind.","disabled_description":"Gelöschte Beiträge werden in diesem Thema angezeigt.","enable":"Gelöschte Beiträge ausblenden","disable":"Gelöschte Beiträge anzeigen"},"private_message_info":{"title":"Nachricht","invite":"Lade andere ein ...","edit":"Hinzufügen oder Entfernen ...","remove":"Entfernen...","add":"Hinzufügen...","leave_message":"Möchtest du diese Nachricht wirklich verlassen?","remove_allowed_user":"Willst du %{name} wirklich aus dieser Unterhaltung entfernen?","remove_allowed_group":"Willst du %{name} wirklich aus dieser Unterhaltung entfernen?"},"email":"E-Mail-Adresse","username":"Benutzername","last_seen":"Zuletzt gesehen","created":"Erstellt","created_lowercase":"erstellt","trust_level":"Vertrauensstufe","search_hint":"Benutzername, E-Mail- oder IP-Adresse","create_account":{"header_title":"Willkommen!","subheader_title":"Lass uns dein Konto erstellen","disclaimer":"Mit der Registrierung stimmst du der \u003ca href='%{privacy_link}' target='blank'\u003eDatenschutzerklärung\u003c/a\u003e und den \u003ca href='%{tos_link}' target='blank'\u003eNutzungsbedingungen\u003c/a\u003e zu.","title":"Erstelle dein Konto","failed":"Etwas ist fehlgeschlagen. Vielleicht ist diese E-Mail-Adresse bereits registriert. Versuche den 'Passwort vergessen'-Link."},"forgot_password":{"title":"Passwort zurücksetzen","action":"Ich habe mein Passwort vergessen","invite":"Gib deinen Benutzernamen oder deine E-Mail-Adresse ein. Wir senden dir eine E-Mail zum Zurücksetzen des Passworts.","reset":"Passwort zurücksetzen","complete_username":"Wenn ein Benutzerkonto dem Benutzernamen \u003cb\u003e%{username}\u003c/b\u003e entspricht, solltest du in Kürze eine E-Mail mit Anweisungen zum Zurücksetzen deines Passwortes erhalten.","complete_email":"Wenn ein Benutzerkonto der E-Mail \u003cb\u003e%{email}\u003c/b\u003e entspricht, solltest du in Kürze eine E-Mail mit Anweisungen zum Zurücksetzen deines Passwortes erhalten.","complete_username_found":"Wir haben ein zum Benutzernamen \u003cb\u003e%{username}\u003c/b\u003e gehörendes Konto gefunden. Du solltest in Kürze eine E-Mail mit Anweisungen zum Zurücksetzen deines Passwortes erhalten.","complete_email_found":"Wir haben ein zu \u003cb\u003e%{email}\u003c/b\u003e gehörendes Benutzerkonto gefunden. Du solltest in Kürze eine E-Mail mit Anweisungen zum Zurücksetzen deines Passwortes erhalten.","complete_username_not_found":"Es gibt kein Konto mit dem Benutzernamen \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Es gibt kein Benutzerkonto für \u003cb\u003e%{email}\u003c/b\u003e","help":"E-Mail nicht angekommen? Bitte prüfe zuerst deinen Spam-Ordner. \u003cp\u003eNicht sicher, welche E-Mail-Adresse du verwendet hast? Gib eine E-Mail-Adresse ein und wir werden dir sagen, ob sie hier existiert.\u003c/p\u003e\u003cp\u003eFalls du keinen Zugriff mehr auf die hinterlegte E-Mail-Adresse deines Kontos hast, kontaktiere bitte \u003ca href='%{basePath}/about'\u003eunser hilfsbereites Team. \u003c/a\u003e\u003c/p\u003e","button_ok":"OK","button_help":"Hilfe"},"email_login":{"link_label":"Sende mir einen Anmeldelink","button_label":"über E-Mail","login_link":"Überspringe das Passwort; Schicke mir einen Login-Link per E-Mail","emoji":"Emoji sperren","complete_username":"Sofern ein Benutzerkonto mit dem Benutzername \u003cb\u003e%{username}\u003c/b\u003e existiert, solltest du in Kürze eine E-Mail mit einem Anmeldelink erhalten.","complete_email":"Sofern ein Benutzerkonto für \u003cb\u003e%{email}\u003c/b\u003e existiert, solltest du in Kürze eine E-Mail mit einem Anmeldelink erhalten.","complete_username_found":"Wir haben ein Benutzerkonto mit dem Benutzername \u003cb\u003e%{username}\u003c/b\u003e gefunden, du solltest in Kürze einen Anmeldelink erhalten.","complete_email_found":"Wir haben ein Benutzerkonto für \u003cb\u003e%{email}\u003c/b\u003e erhalten, du solltest in Kürze einen Anmeldelink erhalten.","complete_username_not_found":"Es existiert kein Benutzerkonto mit dem Benutzername \u003cb\u003e%{username}\u003c/b\u003e.","complete_email_not_found":"Es existiert kein Benutzerkonto für \u003cb\u003e%{email}\u003c/b\u003e.","confirm_title":"Weiter zu %{site_name}","logging_in_as":"Anmeldung als %{email}","confirm_button":"Anmeldung fertigstellen"},"login":{"header_title":"Willkommen zurück","subheader_title":"Bei deinem Konto anmelden","title":"Anmelden","username":"Benutzername","password":"Passwort","second_factor_title":"Zwei-Faktor-Authentifizierung","second_factor_description":"Bitte gib den Authentifizierungscode aus deiner App ein:","second_factor_backup":"Anmeldung mit einem Wiederherstellungscode","second_factor_backup_title":"Zwei-Faktor-Backup","second_factor_backup_description":"Bitte gib einen deiner Wiederherstellungscodes ein:","second_factor":"Anmeldung mit einer Authentifizierungs-App","security_key_description":"Wenn Du Deinen physischen Sicherheitsschlüssel vorbereitet hast, klicke unten auf die Schaltfläche \"Mit Sicherheitsschlüssel authentifizieren\".","security_key_alternative":"Versuche einen anderen Weg","security_key_authenticate":"Mit Sicherheitsschlüssel authentifizieren","security_key_not_allowed_error":"Der Authentifizierungsprozess für den Sicherheitsschlüssel ist abgelaufen oder wurde abgebrochen.","security_key_no_matching_credential_error":"Im angegebenen Sicherheitsschlüssel wurden keine übereinstimmenden Anmeldeinformationen gefunden.","security_key_support_missing_error":"Dein aktuelles Gerät oder Browser unterstützt die Verwendung von Sicherheitsschlüsseln nicht. Bitte verwende eine andere Methode.","email_placeholder":"E-Mail / Benutzername","caps_lock_warning":"Feststelltaste ist aktiviert","error":"Unbekannter Fehler","cookies_error":"Dein Browser scheint Cookies deaktiviert zu haben. Du kannst dich möglicherweise nicht anmelden, ohne diese zuerst zu aktivieren","rate_limit":"Warte bitte ein wenig, bevor du erneut versuchst dich anzumelden.","blank_username":"Bitte gib deine E-Mail-Adresse oder deinen Benutzernamen ein.","blank_username_or_password":"Bitte gib deine E-Mail-Adresse oder deinen Benutzernamen und dein Passwort ein.","reset_password":"Passwort zurücksetzen","logging_in":"Anmeldung läuft…","or":"Oder","authenticating":"Authentifiziere…","awaiting_activation":"Dein Konto ist noch nicht aktiviert. Verwende den 'Passwort vergessen'-Link, um eine weitere E-Mail mit Anweisungen zur Aktivierung zu erhalten.","awaiting_approval":"Dein Konto wurde noch nicht von einem Teammitglied genehmigt. Du bekommst eine E-Mail, sobald das geschehen ist.","requires_invite":"Entschuldige, der Zugriff auf dieses Forum ist nur mit einer Einladung möglich.","not_activated":"Du kannst dich noch nicht anmelden. Wir haben dir schon eine E-Mail zur Aktivierung an \u003cb\u003e%{sentTo}\u003c/b\u003e geschickt. Bitte folge den Anweisungen in dieser E-Mail, um dein Benutzerkonto zu aktivieren.","not_allowed_from_ip_address":"Von dieser IP-Adresse darfst du dich nicht anmelden.","admin_not_allowed_from_ip_address":"Von dieser IP-Adresse darfst du dich nicht als Administrator anmelden.","resend_activation_email":"Klicke hier, um eine neue Aktivierungsmail zu schicken.","omniauth_disallow_totp":"Für dein Benutzerkonto ist die Zwei-Faktor-Authentifizierung aktiviert. Bitte melde dich mit deinem Passwort an.","resend_title":"Aktivierungsmail erneut senden","change_email":"E-Mail-Adresse ändern","provide_new_email":"Gib’ eine neue Adresse an und wir senden deine Bestätigungsmail erneut.","submit_new_email":"E-Mail-Adresse aktualisieren","sent_activation_email_again":"Wir haben dir eine weitere E-Mail zur Aktivierung an \u003cb\u003e%{currentEmail}\u003c/b\u003e geschickt. Es könnte ein paar Minuten dauern, bis diese ankommt; sieh auch im Spam-Ordner nach.","sent_activation_email_again_generic":"Wir haben eine weitere Aktivierungsmail verschickt. Es könnte ein paar Minuten dauern, bis diese ankommt; schaue auch im Spam-Ordner nach.","to_continue":"Melde dich bitte an","preferences":"Du musst angemeldet sein, um deine Benutzereinstellungen bearbeiten zu können.","not_approved":"Dein Benutzerkonto wurde noch nicht genehmigt. Du wirst per E-Mail benachrichtigt, sobald du dich anmelden kannst.","google_oauth2":{"name":"Google","title":"mit Google"},"twitter":{"name":"Twitter","title":"mit Twitter"},"instagram":{"name":"Instagram","title":"mit Instagram"},"facebook":{"name":"Facebook","title":"mit Facebook"},"github":{"name":"GitHub","title":"mit GitHub"},"discord":{"name":"Discord","title":"mit Discord"},"second_factor_toggle":{"totp":"Benutze stattdessen eine Authentifizierungs-App","backup_code":"Benutze stattdessen einen Wiederherstellungscode"}},"invites":{"accept_title":"Einladung","emoji":"Umschlag Emoji","welcome_to":"Willkommen bei %{site_name}!","invited_by":"Du wurdest eingeladen von:","social_login_available":"Du wirst dich auch über andere sozialen Netzwerken mit dieser E-Mail-Adresse anmelden können.","your_email":"Die E-Mail-Adresse deines Benutzerkontos ist \u003cb\u003e%{email}\u003c/b\u003e","accept_invite":"Einladung annehmen","success":"Dein Konto wurde erstellt und du bist jetzt angemeldet.","name_label":"Name","password_label":"Passwort","optional_description":"(optional)"},"password_reset":{"continue":"Weiter zu %{site_name}"},"emoji_set":{"apple_international":"Apple","google":"Google","twitter":"Twitter","win10":"Windows 10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"nur Kategorien","categories_with_featured_topics":"Kategorien mit empfohlenen Themen","categories_and_latest_topics":"Kategorien und aktuelle Themen","categories_and_top_topics":"Kategorien und angesagte Themen","categories_boxes":"Boxen mit Unterkategorien","categories_boxes_with_topics":"Spalten mit hervorgehobenen Themen"},"shortcut_modifier_key":{"shift":"Umschalt","ctrl":"Strg","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"Wird geladen…"},"category_row":{"topic_count":{"one":"%{count} Thema in dieser Kategorie","other":"%{count} Themen in dieser Kategorie"},"plus_subcategories_title":{"one":"%{name} und eine Unterkategorie","other":"%{name} und %{count} Unterkategorien"},"plus_subcategories":{"one":"+ %{count} Unterkategorie","other":"+ %{count} Unterkategorien"}},"select_kit":{"filter_by":"Filtern nach: %{name}","select_to_filter":"Wählen Sie einen zu filternden Wert aus","default_header_text":"Auswählen…","no_content":"Keine Treffer gefunden","filter_placeholder":"Suchen…","filter_placeholder_with_any":"Suchen oder erzeugen","create":"Erstelle: '%{content}'","max_content_reached":{"one":"Du kannst nur %{count} Eintrag auswählen.","other":"Du kannst nur %{count} Einträge auswählen."},"min_content_not_reached":{"one":"Wähle mindestens %{count} Eintrag aus.","other":"Wähle mindestens %{count} Einträge aus."},"invalid_selection_length":{"one":"Die Auswahl muss mindestens %{count} Zeichen umfassen.","other":"Die Auswahl muss aus mindestens %{count} Zeichen bestehen."},"components":{"tag_drop":{"filter_for_more":"Filtern nach mehr..."},"categories_admin_dropdown":{"title":"Kategorien verwalten"}}},"date_time_picker":{"from":"Von","to":"An"},"emoji_picker":{"filter_placeholder":"Emoji suchen","smileys_\u0026_emotion":"Smileys und Emotion","people_\u0026_body":"Menschen und Körper","animals_\u0026_nature":"Tiere und Natur","food_\u0026_drink":"Essen und Getränke","travel_\u0026_places":"Verkehr und Orte","activities":"Tätigkeiten","objects":"Objekte","symbols":"Symbole","flags":"Flaggen","recent":"Zuletzt verwendet","default_tone":"Keine Hautfarbe","light_tone":"Helle Hautfarbe","medium_light_tone":"Mittel-helle Hautfarbe","medium_tone":"Mittlere Hautfarbe","medium_dark_tone":"Mittel-dunkle Hautfarbe","dark_tone":"Dunkle Hautfarbe","default":"Benutzerdefinierte Emojis"},"shared_drafts":{"title":"Gemeinsame Vorlagen","notice":"Dieses Thema ist nur für diejenigen sichtbar, die gemeinsame Entwürfe veröffentlichen können.","destination_category":"Ziel-Kategorie","publish":"Gemeinsame Vorlage veröffentlichen","confirm_publish":"Bist du sicher, dass du diese Vorlage veröffentlichten möchtest?","publishing":"Thema wird veröffentlicht…"},"composer":{"emoji":"Emoji :)","more_emoji":"mehr…","options":"Optionen","whisper":"flüstern","unlist":"unsichtbar","add_warning":"Dies ist eine offizielle Warnung.","toggle_whisper":"Flüstermodus umschalten","toggle_unlisted":"Sichtbarkeit umschalten","posting_not_on_topic":"Auf welches Thema möchtest du antworten?","saved_local_draft_tip":"lokal gespeichert","similar_topics":"Dein Thema hat Ähnlichkeit mit…","drafts_offline":"Entwürfe offline","edit_conflict":"Konflikt bearbeiten","group_mentioned_limit":{"one":"\u003cb\u003eWarnung!\u003c/b\u003e Du erwähnst \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, jedoch übersteigt die Mitgliederzahl der Gruppe das vom Administrator konfigurierte Erwähnungslimit von %{count} Benutzer. Deshalb wird niemand benachrichtigt.","other":"\u003cb\u003eWarnung!\u003c/b\u003e Du erwähnst \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, jedoch übersteigt die Mitgliederzahl der Gruppe das vom Administrator konfigurierte Erwähnungslimit von %{count} Benutzern. Deshalb wird niemand benachrichtigt."},"group_mentioned":{"one":"Indem du %{group} erwähnst, bist du dabei, \u003ca href='%{group_link}'\u003e%{count} Person\u003c/a\u003e zu benachrichtigen – bist du dir sicher?","other":"Indem du %{group} erwähnst, bist du dabei, \u003ca href='%{group_link}'\u003e%{count} Personen\u003c/a\u003e zu benachrichtigen – bist du dir sicher?"},"cannot_see_mention":{"category":"Du hast %{username} erwähnt, aber diese Person wird nicht benachrichtigt da sie keinen Zugriff auf diese Kategorie hat. Füge sie einer Gruppe hinzu die Zugriff auf diese Kategorie hat.","private":"Du hast %{username} erwähnt, aber diese Person wird nicht benachrichtigt da sie diese persönliche Nachricht nicht sehen kann. Lade sie zu dieser PM ein."},"duplicate_link":"Es sieht so aus als wäre dein Link auf \u003cb\u003e%{domain}\u003c/b\u003e in dem Thema bereits geschrieben worden von \u003cb\u003e@%{username}\u003c/b\u003e in \u003ca href='%{post_url}'\u003eeiner Antwort vor %{ago}\u003c/a\u003e – bist du sicher, dass du ihn noch einmal schreiben möchtest?","reference_topic_title":"AW: %{title}","error":{"title_missing":"Titel ist erforderlich","title_too_short":{"one":"Titel muss mindestens %{count} Zeichen lang sein","other":"Titel muss mindestens %{count} Zeichen lang sein"},"title_too_long":{"one":"Titel darf maximal %{count} Zeichen lang sein","other":"Titel darf maximal %{count} Zeichen lang sein"},"post_missing":"Beitrag darf nicht leer sein","post_length":{"one":"Beitrag muss mindestens %{count} Zeichen lang sein","other":"Beitrag muss mindestens %{count} Zeichen lang sein"},"try_like":"Hast du schon die %{heart}-Schaltfläche ausprobiert?","category_missing":"Du musst eine Kategorie auswählen","tags_missing":{"one":"Du musst mindestens %{count} Schlagwort wählen.","other":"Du musst mindestens %{count} Schlagwörter wählen."},"topic_template_not_modified":"Bitte füge Details und Spezifikationen zu deinem Thema hinzu, indem du die Themenvorlage anpasst."},"save_edit":"Speichern","overwrite_edit":"Bearbeitung überschreiben","reply_original":"Auf das ursprünglichen Thema antworten","reply_here":"Hier antworten","reply":"Antworten","cancel":"Abbrechen","create_topic":"Thema erstellen","create_pm":"Nachricht","create_whisper":"Flüstern","create_shared_draft":"Erstelle gemeinsame Vorlage","edit_shared_draft":"Gemeinsame Vorlage bearbeiten","title":"Oder drücke Strg+Eingabetaste","users_placeholder":"Benutzer hinzufügen","title_placeholder":"Um was geht es in dieser Diskussion? Schreib einen kurzen Satz.","title_or_link_placeholder":"Gib einen Titel ein oder füge einen Link ein","edit_reason_placeholder":"Warum bearbeitest du?","topic_featured_link_placeholder":"Gib einen Link, der mit dem Titel angezeigt wird.","remove_featured_link":"Link aus Thema entfernen.","reply_placeholder":"Schreib hier. Verwende Markdown, BBCode oder HTML zur Formatierung. Füge Bilder ein oder ziehe sie herein.","reply_placeholder_no_images":"Schreib hier. Verwende Markdown, BBCode oder HTML zur Formatierung.","reply_placeholder_choose_category":"Wähle vor dem Tippen eine Kategorie.","view_new_post":"Sieh deinen neuen Beitrag an.","saving":"Wird gespeichert","saved":"Gespeichert!","saved_draft":"Beitrags-Entwurf vorhanden. Tippen, um fortzusetzen.","uploading":"Wird hochgeladen…","show_preview":"Vorschau zeigen","hide_preview":"Vorschau ausblenden","quote_post_title":"Ganzen Beitrag zitieren","bold_label":"F","bold_title":"Fettgedruckt","bold_text":"Fettgedruckter Text","italic_label":"K","italic_title":"Betonung","italic_text":"Betonter Text","link_title":"Link","link_description":"gib hier eine Link-Beschreibung ein","link_dialog_title":"Link einfügen","link_optional_text":"Optionaler Titel","link_url_placeholder":"Füge eine URL ein oder tippe, um die Themen zu durchsuchen","blockquote_title":"Blockquote","blockquote_text":"Blockquote","code_title":"Vorformatierter Text","code_text":"vorformatierten Text mit 4 Leerzeichen einrücken","paste_code_text":"Tippe oder füge den Code hier ein","upload_title":"Upload","upload_description":"gib hier eine Beschreibung des Uploads ein","olist_title":"Nummerierte Liste","ulist_title":"Liste","list_item":"Listenelement","toggle_direction":"Schreibrichtung wechseln","help":"Hilfe zur Markdown-Formatierung","collapse":"Editor minimieren","open":"Editor öffnen","abandon":"Editor schließen und Entwurf verwerfen","enter_fullscreen":"Vollbild-Editor öffnen","exit_fullscreen":"Vollbild-Editor verlassen","show_toolbar":"Composer-Werkzeugleiste anzeigen","hide_toolbar":"Composer-Werkzeugleiste ausblenden","modal_ok":"OK","modal_cancel":"Abbrechen","cant_send_pm":"Entschuldige, aber du kannst keine Nachricht an %{username} senden.","yourself_confirm":{"title":"Hast du vergessen Empfänger hinzuzufügen?","body":"Im Augenblick wird diese Nachricht nur an dich selbst gesendet!"},"slow_mode":{"error":"Dieses Thema befindet sich im langsamen Modus. Du hast bereits kürzlich gepostet. Du kannst erneut in %{timeLeft}posten."},"admin_options_title":"Optionale Team-Einstellungen für dieses Thema","composer_actions":{"reply":"Antworten","draft":"Entwurf","edit":"Bearbeiten","reply_to_post":{"label":"Auf einen Beitrag von %{postUsername}antworten","desc":"Antworte auf einen bestimmten Beitrag"},"reply_as_new_topic":{"label":"Antworte als verknüpftes Thema","desc":"Erstelle ein neues Thema, das auf dieses Thema verweist","confirm":"Du hast einen neuen Themen-Entwurf gespeichert. Wenn du ein verlinktes Thema erstellst, wird er überschrieben."},"reply_as_new_group_message":{"label":"Als neue Gruppen-Nachricht antworten","desc":"Erstellen Sie eine neue private Nachricht mit denselben Empfängern"},"reply_as_private_message":{"label":"Neue Nachricht","desc":"Erstelle eine neue Nachricht"},"reply_to_topic":{"label":"Antworte auf Thema","desc":"Antworte auf das Thema, nicht auf einen bestimmten Beitrag"},"toggle_whisper":{"label":"Flüstermodus umschalten","desc":"Ein geflüsterter Beitrag ist nur für Teammitglieder sichtbar"},"create_topic":{"label":"Neues Thema"},"shared_draft":{"label":"Gemeinsame Vorlage","desc":"Entwurf eines Themas, das nur für erlaubte Benutzer sichtbar ist"},"toggle_topic_bump":{"label":"Bump des Themas umschalten","desc":"Antworten ohne das Datum der neuesten Antwort zu ändern"}},"reload":"Neu laden","ignore":"Ignorieren","details_title":"Zusammenfassung","details_text":"Dieser Text wird ausgeblendet"},"notifications":{"tooltip":{"regular":{"one":"%{count} nicht gesehene Benachrichtigung","other":"%{count} nicht gesehene Benachrichtigungen"},"message":{"one":"%{count} ungelesene Nachricht","other":"%{count} ungelesene Nachrichten"},"high_priority":{"one":"%{count} ungelesene Benachrichtigungen hoher Priorität","other":"%{count} ungelesene Benachrichtigungen mit hoher Priorität"}},"title":"Benachrichtigung über @Name-Erwähnungen, Antworten auf deine Beiträge und Themen, Nachrichten, usw.","none":"Die Benachrichtigungen können derzeit nicht geladen werden.","empty":"Keine Benachrichtigungen gefunden.","post_approved":"Dein Beitrag wurde genehmigt.","reviewable_items":"Elemente, die eine Überprüfung benötigen","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} und %{count} anderer\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} und %{count} andere\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"gefällt %{count} deiner Beiträge","other":"gefallen %{count} deiner Beiträge"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e hat deine Einladung angenommen","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e hat %{description} verschoben","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Du hast '%{description}' verliehen bekommen","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNew Topic\u003c/span\u003e %{description}","membership_request_accepted":"Mitgliedschaft akzeptiert in '%{group_name}' ","membership_request_consolidated":{"one":"%{count} offene Mitgliedschaftsanfrage für '%{group_name}'","other":"%{count} offene Mitgliedschaftsanfragen für '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - abgeschlossen","group_message_summary":{"one":"%{count} Nachricht in deinem %{group_name} Posteingang","other":"%{count} Nachrichten in deinem %{group_name} Posteingang"},"popup":{"mentioned":"%{username} hat dich in \"%{topic}\" - %{site_title} erwähnt","group_mentioned":"%{username} hat dich in \"%{topic}\" - %{site_title} erwähnt","quoted":"%{username} hat dich in \"%{topic}\" - %{site_title} zitiert","replied":"%{username} hat dir in \"%{topic}\" - %{site_title} geantwortet","posted":"%{username} hat in \"%{topic}\" - %{site_title} einen Beitrag verfasst","private_message":"%{username} hat dir eine Nachricht geschickt in „%{topic}“ – %{site_title}","linked":"%{username} hat in \"%{topic}\" - %{site_title} einen Beitrag von dir verlinkt","watching_first_post":"%{username} hat ein neues Thema \"%{topic}\" - %{site_title} erstellt","confirm_title":"Benachrichtigungen aktiviert – %{site_title}","confirm_body":"Erfolgreich! Benachrichtigungen wurden aktiviert.","custom":"Benachrichtigung von %{username} auf %{site_title}"},"titles":{"mentioned":"erwähnte","replied":"neue Antwort","quoted":"zitiert","edited":"bearbeitet","liked":"neue „Gefällt mir“-Angabe","private_message":"neue private Nachricht","invited_to_private_message":"zu einer privaten Nachricht eingeladen","invitee_accepted":"Einladung angenommen","posted":"neuer Beitrag","moved_post":"Beitrag verschoben","linked":"verknüpft","bookmark_reminder":"Erinnerung an Lesezeichen","bookmark_reminder_with_name":"Erinnerung an Lesezeichen — %{name}","granted_badge":"Abzeichen gewährt","invited_to_topic":"zum Thema eingeladen","group_mentioned":"Gruppe erwähnt","group_message_summary":"neue Gruppen-Nachrichten","watching_first_post":"neues Thema","topic_reminder":"Themen-Erinnerung","liked_consolidated":"neue „Gefällt mir“-Angaben","post_approved":"Beitrag genehmigt","membership_request_consolidated":"Neue Gruppenmitgliedschaftsanfragen","reaction":"neue Reaktion","votes_released":"Abstimmung wurde freigegeben"}},"upload_selector":{"title":"Ein Bild hinzufügen","title_with_attachments":"Ein Bild oder eine Datei hinzufügen","from_my_computer":"Von meinem Gerät","from_the_web":"Aus dem Web","remote_tip":"Link zu Bild","remote_tip_with_attachments":"Link zu Bild oder Datei","local_tip":"wähle auf deinem Gerät gespeicherte Bilder aus","local_tip_with_attachments":"wähle auf deinem Gerät gespeicherte Bilder oder Dateien aus","hint":"(du kannst Dateien auch in den Editor ziehen, um diese hochzuladen)","hint_for_supported_browsers":"du kannst Bilder auch in den Editor ziehen oder diese aus der Zwischenablage einfügen","uploading":"Wird hochgeladen","select_file":"Datei auswählen","default_image_alt_text":"Bild","supported_formats":"unterstützte Formate"},"search":{"sort_by":"Sortieren nach","relevance":"Relevanz","latest_post":"letzter Beitrag","latest_topic":"Neuestes Thema","most_viewed":"Anzahl der Aufrufe","most_liked":"Anzahl der Likes","select_all":"Alle auswählen","clear_all":"Auswahl aufheben","too_short":"Der Suchbegriff ist zu kurz.","result_count":{"one":"\u003cspan\u003e%{count} Ergebnis für \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} Ergebnisse für \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"suche nach Themen, Beiträgen, Benutzern oder Kategorien","full_page_title":"suche nach Themen oder Beiträgen","no_results":"Keine Ergebnisse gefunden.","no_more_results":"Es wurde keine weiteren Ergebnisse gefunden.","post_format":"#%{post_number} von %{username}","results_page":"Suchergebnisse für '%{term}'","more_results":"Es gibt mehr Ergebnisse. Bitte grenze deine Suchkriterien weiter ein.","cant_find":"Nicht gefunden, wonach du suchst?","start_new_topic":"Wie wär’s mit einem neuen Thema?","or_search_google":"Oder versuche stattdessen mit Google zu suchen:","search_google":"Versuche stattdessen mit Google zu suchen:","search_google_button":"Google","search_button":"Suche","context":{"user":"Beiträge von @%{username} durchsuchen","category":"Kategorie #%{category} durchsuchen","tag":"Den #%{tag} tag suchen","topic":"Dieses Thema durchsuchen","private_messages":"Nachrichten durchsuchen"},"advanced":{"title":"Erweiterte Suche","posted_by":{"label":"Beiträge von"},"in_category":{"label":"In der Kategorie"},"in_group":{"label":"In der Gruppe"},"with_badge":{"label":"Mit dem Abzeichen"},"with_tags":{"label":"Mit dem Schlagwort"},"filters":{"label":"Themen/Beiträge einschränken:","title":"mit Treffer im Titel","likes":"Themen/Beiträge, die mir gefallen","posted":"Themen mit Beiträgen von mir","created":"von mir erstellt","watching":"Themen, die ich beobachte","tracking":"Themen, denen ich folge","private":"Beiträge in meinen Unterhaltungen","bookmarks":"von mir mit Lesezeichen versehen","first":"Erste Beiträge in Themen","pinned":"Angeheftete Themen","seen":"Gelesene Themen/Beiträge","unseen":"Ungelesene Themen/Beiträge","wiki":"Wikis","images":"Mit Bild(ern)","all_tags":"Enthält alle Schlagwörter"},"statuses":{"label":"Themen einschränken:","open":"Offene Themen","closed":"Geschlossene Themen","public":"sind öffentlich","archived":"Archivierte Themen","noreplies":"Themen ohne Antwort","single_user":"Themen mit nur einem Benutzer"},"post":{"count":{"label":"Beiträge"},"min":{"placeholder":"Minimum"},"max":{"placeholder":"Maximum"},"time":{"label":"Zeitraum einschränken:","before":"Beiträge vor dem","after":"Beiträge nach dem"}},"views":{"label":"Aufrufe"},"min_views":{"placeholder":"Minimum"},"max_views":{"placeholder":"Maximum"}}},"hamburger_menu":"zu einer anderen Themenliste oder Kategorie wechseln","new_item":"neu","go_back":"zurückgehen","not_logged_in_user":"Benutzerseite mit einer Zusammenfassung der Benutzeraktivitäten und Einstellungen","current_user":"zu deiner Benutzerseite gehen","view_all":"Alle anzeigen %{tab}","topics":{"new_messages_marker":"letzter Besuch","bulk":{"select_all":"Wähle alle aus","clear_all":"Auswahl aufheben","unlist_topics":"Themen unsichtbar machen","relist_topics":"Themen neu auflisten","reset_read":"Gelesene zurücksetzen","delete":"Themen löschen","dismiss":"Ignorieren","dismiss_read":"Blende alle ungelesenen Beiträge aus","dismiss_button":"Ignorieren...","dismiss_tooltip":"Nur die neuen Beiträge ignorieren oder Themen nicht mehr verfolgen","also_dismiss_topics":"Diese Themen nicht mehr verfolgen, sodass mir diese nicht mehr als ungelesen angezeigt werden","dismiss_new":"Neue Themen ignorieren","toggle":"zu Massenoperationen auf Themen umschalten","actions":"Massenoperationen","change_category":"Kategorie auswählen","close_topics":"Themen schließen","archive_topics":"Themen archivieren","move_messages_to_inbox":"In Posteingang verschieben","notification_level":"Benachrichtigungen","change_notification_level":"Benachrichtigungsstufe ändern","choose_new_category":"Neue Kategorie für die gewählten Themen:","selected":{"one":"Du hast \u003cb\u003eein\u003c/b\u003e Thema ausgewählt.","other":"Du hast \u003cb\u003e%{count}\u003c/b\u003e Themen ausgewählt."},"change_tags":"Schlagwörter ersetzen","append_tags":"Schlagwörter hinzufügen","choose_new_tags":"Neue Schlagwörter für die gewählten Themen wählen:","choose_append_tags":"Wähle neue Schlagwörter, die diesen Themen hinzugefügt werden sollen:","changed_tags":"Die Schlagwörter der gewählten Themen wurden geändert.","remove_tags":"Alle Tags entfernen","confirm_remove_tags":{"one":"Alle Tags werden aus diesem Thema entfernt. Sind Sie sicher?","other":"Alle Tags werden aus \u003cb\u003e%{count}\u003c/b\u003e Themen entfernt. Sind Sie sicher?"},"progress":{"one":"Fortschritt: \u003cstrong\u003e%{count}\u003c/strong\u003e Thema","other":"Fortschritt: \u003cstrong\u003e%{count}\u003c/strong\u003e Themen"}},"none":{"unread":"Du hast alle Themen gelesen.","new":"Es gibt für dich keine neuen Themen.","read":"Du hast noch keine Themen gelesen.","posted":"Du hast noch keine Beiträge verfasst.","ready_to_create":"Bereit zu ","latest":"Ihr seid alle eingeholt!","bookmarks":"Du hast noch keine Themen mit einem Lesezeichen versehen.","category":"Es gibt keine Themen in %{category}.","top":"Es gibt keine Top-Themen.","educate":{"new":"\u003cp\u003eIhre neuen Themen werden hier angezeigt. Standardmäßig gelten Themen als neu und zeigen einen Indikator \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e an, wenn sie in den letzten 2 Tagen erstellt wurden.\u003c/p\u003e\u003cp\u003eBesuchen Sie Ihre \u003ca href=\"%{userPrefsUrl}\"\u003eEinstellungen\u003c/a\u003e , um dies zu ändern.\u003c/p\u003e","unread":"\u003cp\u003eHier werden deine ungelesenen Themen angezeigt.\u003c/p\u003e\u003cp\u003eDie Anzahl der ungelesenen Beiträge wird standardmäßig als \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e neben den Themen angezeigt, wenn du:\u003c/p\u003e\u003cul\u003e\u003cli\u003edas Thema erstellt hast\u003c/li\u003e\u003cli\u003eauf das Thema geantwortet hast\u003c/li\u003e\u003cli\u003edas Thema länger als 4 Minuten gelesen hast\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eAußerdem werden jene Themen berücksichtigt, die du in den Benachrichtigungseinstellungen eines jeden Themas mittels der 🔔 ausdrücklich auf Beobachten oder Verfolgen gesetzt hast.\u003c/p\u003e\u003cp\u003eDu kannst das in deinen \u003ca href=\"%{userPrefsUrl}\"\u003eEinstellungen\u003c/a\u003e ändern.\u003c/p\u003e"}},"bottom":{"latest":"Das waren die aktuellen Themen.","posted":"Das waren alle Themen.","read":"Das waren alle gelesenen Themen.","new":"Das waren alle neuen Themen.","unread":"Das waren alle ungelesen Themen.","category":"Das waren alle Themen in der Kategorie „%{category}“.","tag":"Das waren alle Themen in der Kategorie „%{tag}“.","top":"Das waren alle angesagten Themen.","bookmarks":"Das waren alle Themen, die du mit einem Lesezeichen versehen hast."}},"topic":{"filter_to":{"one":"%{count} Beitrag im Thema","other":"%{count} Beiträge im Thema"},"create":"Neues Thema","create_long":"Ein neues Thema erstellen","open_draft":"Entwurf öffnen","private_message":"Eine Unterhaltung beginnen","archive_message":{"help":"Nachricht ins Archiv verschieben","title":"Archivieren"},"move_to_inbox":{"title":"In Posteingang verschieben","help":"Nachricht in den Posteingang zurück verschieben"},"edit_message":{"help":"Bearbeite ersten Beitrag dieser Nachricht","title":"Bearbeiten"},"defer":{"help":"Als ungelesen markieren","title":"Ignorieren"},"feature_on_profile":{"help":"Füge eine Verknüpfung zu diesem Thema zu deiner Benutzerkarte und deinem Profil hinzu","title":"Auf Profil hervorheben"},"remove_from_profile":{"warning":"Dein Profil hat bereits ein hervorgehobenes Thema. Wenn du fortfährst, wird dieses das bestehende Thema ersetzen.","help":"Entferne diesen Link zum Thema aus deinem Profil","title":"Vom Profil entfernen"},"list":"Themen","new":"neues Thema","unread":"ungelesen","new_topics":{"one":"%{count} neues Thema","other":"%{count} neue Themen"},"unread_topics":{"one":"%{count} ungelesenes Thema","other":"%{count} ungelesene Themen"},"title":"Thema","invalid_access":{"title":"Thema ist nicht öffentlich","description":"Entschuldige, du hast keinen Zugriff auf dieses Thema!","login_required":"Du musst dich anmelden, damit du dieses Thema sehen kannst."},"server_error":{"title":"Thema konnte nicht geladen werden","description":"Entschuldige, wir konnten das Thema, wahrscheinlich wegen eines Verbindungsfehlers, nicht laden. Bitte versuche es erneut. Wenn das Problem bestehen bleibt, gib uns Bescheid."},"not_found":{"title":"Thema nicht gefunden","description":"Entschuldige, wir konnten dieses Thema nicht finden. Wurde es vielleicht von einem Moderator entfernt?"},"total_unread_posts":{"one":"du hast einen ungelesenen Beitrag in diesem Thema","other":"du hast %{count} ungelesene Beiträge in diesem Thema"},"unread_posts":{"one":"Du hast einen ungelesenen, alten Beitrag zu diesem Thema","other":"Du hast %{count} ungelesene, alte Beiträge zu diesem Thema"},"new_posts":{"one":"Es gibt einen neuen Beitrag zu diesem Thema seit du es das letzte Mal gelesen hast","other":"Es gibt %{count} neue Beiträge zu diesem Thema seit du es das letzte Mal gelesen hast"},"likes":{"one":"Es gibt ein Like in diesem Thema","other":"Es gibt %{count} Likes in diesem Thema"},"back_to_list":"Zurück zur Themenliste","options":"Themen-Optionen","show_links":"zeige Links innerhalb dieses Themas","toggle_information":"Details zum Thema ein- oder ausblenden","read_more_in_category":"Möchtest du mehr lesen? Entdecke andere Themen in %{catLink} oder %{latestLink}.","read_more":"Möchtest du mehr lesen? %{catLink} oder %{latestLink}.","unread_indicator":"Kein Mitglied hat den letzten Beitrag dieses Themas bisher gelesen.","browse_all_categories":"Alle Kategorien durchsehen","browse_all_tags":"Alle Tags durchsuchen","view_latest_topics":"aktuelle Themen anzeigen","suggest_create_topic":"eine neue Unterhaltung starten?","jump_reply_up":"zur vorherigen Antwort springen","jump_reply_down":"zur nachfolgenden Antwort springen","deleted":"Das Thema wurde gelöscht","slow_mode_update":{"title":"Langsamer Modus","select":"Benutzer dürfen nur einmal in diesem Thema schreiben:","description":"Um in schnellen oder umstrittenen Diskussionen eine durchdachte Diskussion zu fördern, müssen Benutzer warten, bevor sie in diesem Thema erneut einen Beitrag verfassen können.","enable":"Aktivieren","update":"Aktualisieren","enabled_until":"Aktiviert bis:","remove":"Deaktivieren","hours":"Stunden:","minutes":"Minuten:","seconds":"Sekunden:","durations":{"10_minutes":"10 Minuten","15_minutes":"15 Minuten","30_minutes":"30 Minuten","45_minutes":"45 Minuten","1_hour":"1 Stunde","2_hours":"2 Stunden","4_hours":"4 Stunden","8_hours":"8 Stunden","12_hours":"12 Stunden","24_hours":"24 Stunden","custom":"Benutzerdefinierte Dauer"}},"slow_mode_notice":{"duration":"Bitte zwischen dem Verfassen von Beiträgen %{duration} warten."},"topic_status_update":{"title":"Zeitschaltuhren","save":"Zeitschaltuhr aktivieren","num_of_hours":"Stunden:","num_of_days":"Anzahl der Tage:","remove":"Zeitschaltuhr deaktivieren","publish_to":"Veröffentlichen in:","when":"Wann:","time_frame_required":"Bitte wähle einen Zeitrahmen aus","min_duration":"Die Dauer muss größer als 0 sein","max_duration":"Dauer muss weniger als 20 Jahre betragen"},"auto_update_input":{"none":"Wähle einen Zeitbereich aus","now":"Jetzt","later_today":"Im Laufe des Tages","tomorrow":"Morgen","later_this_week":"Später in dieser Woche","this_weekend":"Dieses Wochenende","next_week":"Nächste Woche","two_weeks":"Zwei Wochen","next_month":"Nächster Monat","two_months":"Zwei Monate","three_months":"Drei Monate","four_months":"Vier Monate","six_months":"Sechs Monate","one_year":"Ein Jahr","forever":"Für immer","pick_date_and_time":"Datum und Zeit wählen","set_based_on_last_post":"Schließen basierend auf dem letzten Beitrag"},"publish_to_category":{"title":"Veröffentlichung planen"},"temp_open":{"title":"Vorübergehend öffnen"},"auto_reopen":{"title":"Thema automatisch öffnen"},"temp_close":{"title":"Vorübergehend schließen"},"auto_close":{"title":"Thema automatisch schließen","label":"Thema automatisch schließen nach:","error":"Bitte gib einen gültigen Wert ein.","based_on_last_post":"Nicht schließen, bevor der letzte Beitrag in dem Thema mindestens so alt ist."},"auto_close_after_last_post":{"title":"Thema nach dem letzten Beitrag automatisch schließen"},"auto_delete":{"title":"Thema automatisch löschen"},"auto_bump":{"title":"Thema automatisch nach oben verschieben"},"reminder":{"title":"Erinnere mich"},"auto_delete_replies":{"title":"Antworten automatisch löschen"},"status_update_notice":{"auto_open":"Dieses Thema wird automatisch geöffnet %{timeLeft}.","auto_close":"Dieses Thema wird automatisch geschlossen %{timeLeft}.","auto_publish_to_category":"Dieses Thema wird %{timeLeft} in \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e veröffentlicht.","auto_close_after_last_post":"Dieses Thema wird %{duration} nach der letzten Antwort schließen.","auto_delete":"Dieses Thema wird automatisch gelöscht %{timeLeft}.","auto_bump":"Dieses Thema wird automatisch nach oben verschoben %{timeLeft}.","auto_reminder":"Du wirst über dieses Thema erinnert %{timeLeft}.","auto_delete_replies":"Antworten zu diesem Thema werden nach %{duration} automatisch gelöscht."},"auto_close_title":"Automatisches Schließen","auto_close_immediate":{"one":"Der letzte Beitrag in diesem Thema ist bereits eine Stunde alt. Das Thema wird daher sofort geschlossen.","other":"Der letzte Beitrag in diesem Thema ist bereits %{count} Stunden alt. Das Thema wird daher sofort geschlossen."},"auto_close_momentarily":{"one":"Der letzte Beitrag im Thema ist bereits %{count} Stunden alt, daher wird das Thema vorübergehend geschlossen.","other":"Der letzte Beitrag im Thema ist bereits %{count} Stunden alt, daher wird das Thema kurzzeitig geschlossen."},"timeline":{"back":"Zurück","back_description":"Gehe zurück zum letzten ungelesenen Beitrag","replies_short":"%{current} / %{total}"},"progress":{"title":"Themen-Fortschritt","go_top":"Anfang","go_bottom":"Ende","go":"Los","jump_bottom":"springe zum letzten Beitrag","jump_prompt":"springe zu...","jump_prompt_of":{"one":"von %{count} Beitrag","other":"von %{count} Beiträgen"},"jump_prompt_long":"Zu ... springen","jump_bottom_with_number":"springe zu Beitrag %{post_number}","jump_prompt_to_date":"zu Datum","jump_prompt_or":"oder","total":"Beiträge insgesamt","current":"aktueller Beitrag"},"notifications":{"title":"Ändere wie häufig du zu diesem Thema benachrichtigt wirst","reasons":{"mailing_list_mode":"Du hast den Mailinglisten-Modus aktiviert, daher wirst du über Antworten zu diesem Thema per E-Mail benachrichtigt","3_10":"Du wirst Benachrichtigungen erhalten, weil du ein Schlagwort an diesem Thema beobachtest.","3_10_stale":"Du wirst Benachrichtigungen erhalten, weil du ein Schlagwort an diesem Thema beobachtet hast.","3_6":"Du wirst Benachrichtigungen erhalten, weil du diese Kategorie beobachtest.","3_6_stale":"Du wirst Benachrichtigungen erhalten, weil du diese Kategorie beobachtet hast.","3_5":"Du wirst Benachrichtigungen erhalten, weil dieses Thema automatisch von dir beobachtet wird.","3_2":"Du wirst Benachrichtigungen erhalten, weil du dieses Thema beobachtest.","3_1":"Du wirst Benachrichtigungen erhalten, weil du dieses Thema erstellt hast.","3":"Du wirst Benachrichtigungen erhalten, weil du dieses Thema beobachtest.","2_8":"Du wirst eine Anzahl neuer Antworten sehen, weil du diese Kategorie verfolgst.","2_8_stale":"Du wirst eine Anzahl neuer Antworten sehen, weil du diese Kategorie verfolgt hast.","2_4":"Du wirst eine Anzahl neuer Antworten sehen, weil du einen Beitrag in diesem Thema geschrieben hast.","2_2":"Du wirst eine Anzahl neuer Antworten sehen, weil du dieses Thema verfolgst.","2":"Du wirst eine Anzahl neuer Antworten sehen, weil du \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003edieses Thema gelesen\u003c/a\u003e hast.","1_2":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet.","1":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet.","0_7":"Du ignorierst alle Benachrichtigungen dieser Kategorie.","0_2":"Du ignorierst alle Benachrichtigungen dieses Themas.","0":"Du ignorierst alle Benachrichtigungen dieses Themas."},"watching_pm":{"title":"Beobachten","description":"Du wirst über jeden neuen Beitrag in dieser Unterhaltung benachrichtigt und die Anzahl der neuen Beiträge wird angezeigt."},"watching":{"title":"Beobachten","description":"Du wirst über jeden neuen Beitrag in diesem Thema benachrichtigt und die Anzahl der neuen Antworten wird angezeigt."},"tracking_pm":{"title":"Verfolgen","description":"Die Anzahl der neuen Antworten wird bei dieser Unterhaltung angezeigt. Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deine Nachricht antwortet."},"tracking":{"title":"Verfolgen","description":"Die Anzahl der neuen Antworten wird bei diesem Thema angezeigt. Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet."},"regular":{"title":"Normal","description":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet."},"regular_pm":{"title":"Normal","description":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deine Nachricht antwortet."},"muted_pm":{"title":"Stummgeschaltet","description":"Du erhältst keine Benachrichtigungen im Zusammenhang mit dieser Unterhaltung."},"muted":{"title":"Stummgeschaltet","description":"Du erhältst keine Benachrichtigungen über neue Aktivitäten in diesem Thema und es wird auch nicht mehr in der Liste der letzten Beiträge erscheinen."}},"actions":{"title":"Aktionen","recover":"Löschen rückgängig machen","delete":"Thema löschen","open":"Thema öffnen","close":"Thema schließen","multi_select":"Beiträge auswählen...","slow_mode":"Aktiviere langsamen Modus","timed_update":"Zeitschaltuhren…","pin":"Thema anheften...","unpin":"Thema loslösen...","unarchive":"Thema aus Archiv holen","archive":"Thema archivieren","invisible":"Unsichtbar machen","visible":"Sichtbar machen","reset_read":"„Gelesen“ zurücksetzen","make_public":"Umwandeln in öffentliches Thema","make_private":"in Nachricht umwandeln","reset_bump_date":"Bump-Datum zurücksetzen"},"feature":{"pin":"Thema anheften","unpin":"Thema loslösen","pin_globally":"Thema global anheften","make_banner":"Ankündigungsbanner","remove_banner":"Ankündigungsbanner entfernen"},"reply":{"title":"Antworten","help":"beginne damit eine Antwort auf dieses Thema zu verfassen"},"clear_pin":{"title":"Loslösen","help":"Dieses Thema von der Themenliste loslösen, sodass es nicht mehr am Anfang der Liste steht."},"share":{"title":"Teilen","extended_title":"Link teilen","help":"teile einen Link zu diesem Thema","instructions":"Link zu diesem Thema teilen:","copied":"Themen-Link kopiert.","notify_users":{"title":"Benachrichtige","instructions":"Folgende Benutzer über dieses Thema benachrichtigen:","success":{"one":"%{username} erfolgreich zu diesem Thema benachrichtigt.","other":"Alle Benutzer wurden erfolgreich über dieses Thema informiert."}},"invite_users":"Einladen"},"print":{"title":"Drucken","help":"Öffne eine Druckfreundliche Version dieses Themas"},"flag_topic":{"title":"Melden","help":"Dieses Thema den Moderatoren melden oder eine Nachricht senden.","success_message":"Du hast dieses Thema erfolgreich gemeldet."},"make_public":{"title":"Konvertiere zum öffentlichen Thema","choose_category":"Bitte wähle eine Kategorie für das öffentliche Thema:"},"feature_topic":{"title":"Thema hervorheben","pin":"Dieses Thema am Anfang der %{categoryLink} Kategorie anzeigen bis","unpin":"Dieses Thema vom Anfang der %{categoryLink} Kategorie loslösen.","unpin_until":"Dieses Thema vom Anfang der %{categoryLink} Kategorie loslösen oder bis \u003cstrong\u003e%{until}\u003c/strong\u003e warten.","pin_note":"Benutzer können das Thema für sich selbst loslösen.","pin_validation":"Ein Datum wird benötigt um diesen Beitrag anzuheften.","not_pinned":"Es sind in %{categoryLink} keine Themen angeheftet.","already_pinned":{"one":"Momentan in %{categoryLink} angeheftete Themen: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Momentan in %{categoryLink} angeheftete Themen: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Dieses Thema am Anfang aller Themenlisten anzeigen bis","confirm_pin_globally":{"one":"Es gibt bereits %{count} global angeheftetes Thema. Zu viele angeheftete Themen könnten neue und anonyme Benutzer leicht überwältigen. Willst du wirklich noch ein weiteres Thema global anheften?","other":"Es gibt bereits %{count} global angeheftete Themen. Zu viele angeheftete Themen könnten neue und anonyme Benutzer leicht überwältigen. Willst du wirklich noch ein weiteres Thema global anheften?"},"unpin_globally":"Dieses Thema vom Anfang aller Themenlisten loslösen.","unpin_globally_until":"Dieses Thema vom Anfang aller Themenlisten loslösen oder bis \u003cstrong\u003e%{until}\u003c/strong\u003e warten.","global_pin_note":"Benutzer können das Thema für sich selbst loslösen.","not_pinned_globally":"Es sind keine Themen global angeheftet.","already_pinned_globally":{"one":"Momentan global angeheftete Themen: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Momentan global angeheftete Themen: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Macht das Thema zu einem Ankündigungsbanner, welcher am Anfang aller Seiten angezeigt wird.","remove_banner":"Entfernt das Ankündigungsbanner vom Anfang aller Seiten.","banner_note":"Benutzer können das Ankündigungsbanner schließen und so für sich selbst dauerhaft ausblenden. Es kann zu jeder Zeit höchstens ein Thema ein Banner sein.","no_banner_exists":"Es gibt kein Ankündigungsbanner.","banner_exists":"Es \u003cstrong class='badge badge-notification unread'\u003egibt bereits\u003c/strong\u003e ein anderes Ankündigungsbanner."},"inviting":"Einladungen werden gesendet…","automatically_add_to_groups":"Diese Einladung beinhaltet auch Zugang zu den folgenden Gruppen:","invite_private":{"title":"Zu einer Unterhaltung einladen","email_or_username":"E-Mail-Adresse oder Benutzername des Eingeladenen","email_or_username_placeholder":"E-Mail-Adresse oder Benutzername","action":"Einladen","success":"Wir haben den Benutzer gebeten, sich an dieser Unterhaltung zu beteiligen.","success_group":"Wir haben die Gruppe eingeladen, an dieser Nachricht mitzuwirken.","error":"Entschuldige, es gab einen Fehler beim Einladen des Benutzers.","not_allowed":"Dieser Benutzer kann leider nicht eingeladen werden.","group_name":"Gruppenname"},"controls":"Weitere Aktionen","invite_reply":{"title":"Einladen","username_placeholder":"Benutzername","action":"Einladung versenden","help":"per E-Mail oder Benachrichtigung weitere Personen zu diesem Thema einladen","to_forum":"Wir senden eine kurze E-Mail, damit dein/e Freund/in sofort beitreten kann, indem die Person auf einen Link klickt.","discourse_connect_enabled":"Gib den Benutzernamen der Person ein, die du zu diesem Thema einladen möchtest.","to_topic_blank":"Gib den Benutzername oder die E-Mail-Adresse der Person ein, die du zu diesem Thema einladen willst.","to_topic_email":"Du hast eine E-Mail-Adresse eingegeben. Wir werden eine Einladung versenden, die ein direktes Antworten auf dieses Thema ermöglicht.","to_topic_username":"Du hast einen Benutzernamen eingegeben. Wir werden eine Benachrichtigung versenden und mit einem Link zur Teilnahme an diesem Thema einladen.","to_username":"Gib den Benutzername der Person ein, die du einladen möchtest. Wir werden eine Benachrichtigung versenden und mit einem Link zur Teilnahme an diesem Thema einladen.","email_placeholder":"name@example.com","success_email":"Wir haben eine Einladung an \u003cb\u003e%{invitee}\u003c/b\u003egesendet. Wir werden dich benachrichtigen, wenn die Einladung eingelöst wird. Überprüfe die Registerkarte Einladungen auf deiner Benutzerseite, um deine Einladungen zu verfolgen.","success_username":"Wir haben den Benutzer gebeten, sich an diesem Thema zu beteiligen.","error":"Es tut uns leid, wir konnten diese Person nicht einladen. Wurde diese Person vielleicht schon eingeladen? (Einladungen sind in ihrer Zahl beschränkt)","success_existing_email":"Ein Benutzer mit der E-Mail-Adresse \u003cb\u003e%{emailOrUsername}\u003c/b\u003e existiert bereits. Wir haben den Benutzer eingeladen, sich an diesem Thema zu beteiligen."},"login_reply":"Anmelden, um zu antworten","filters":{"n_posts":{"one":"%{count} Beitrag","other":"%{count} Beiträge"},"cancel":"Filter entfernen"},"move_to":{"title":"Verschieben","action":"verschieben","error":"Beim Verschieben der Beiträge ist ein Fehler aufgetreten."},"split_topic":{"title":"In neues Thema verschieben","action":"in ein neues Thema verschieben","topic_name":"Neue Überschrift des Themas","radio_label":"Neues Thema","error":"Beim Verschieben der Beiträge ins neue Thema ist ein Fehler aufgetreten.","instructions":{"one":"Du bist dabei, ein neues Thema zu erstellen und den ausgewählten Beitrag dorthin zu verschieben.","other":"Du bist dabei, ein neues Thema zu erstellen und die \u003cb\u003e%{count}\u003c/b\u003e ausgewählten Beiträge dorthin zu verschieben."}},"merge_topic":{"title":"In ein vorhandenes Thema verschieben","action":"in ein vorhandenes Thema verschieben","error":"Beim Verschieben der Beiträge in das Thema ist ein Fehler aufgetreten.","radio_label":"Vorhandenes Thema","instructions":{"one":"Bitte wähle das Thema, in welches du den Beitrag verschieben möchtest.","other":"Bitte wähle das Thema, in welches du die \u003cb\u003e%{count}\u003c/b\u003e Beiträge verschieben möchtest."}},"move_to_new_message":{"title":"Verschiebe in neue Nachricht","action":"verschiebe in neue Nachricht","message_title":"Neue Überschrift der Nachricht","radio_label":"Neue Nachricht","participants":"Teilnehmer","instructions":{"one":"Du bist dabei, eine neue Nachricht zu erstellen und sie mit dem ausgewählten Beitrag zu befüllen.","other":"Du bist dabei, eine neue Nachricht zu erstellen und sie mit den \u003cb\u003e%{count}\u003c/b\u003e ausgewählten Beiträgen zu befüllen."}},"move_to_existing_message":{"title":"Verschiebe in vorhandene Nachricht","action":"in eine vorhandene Nachricht verschieben","radio_label":"Vorhandene Nachricht","participants":"Teilnehmer","instructions":{"one":"Bitte wähle die Nachricht, in welche du den Beitrag versschieben möchtest.","other":"Bitte wähle die Nachricht, in welche du die \u003cb\u003e%{count}\u003c/b\u003e verschieben möchtest."}},"merge_posts":{"title":"Ausgewählte Beiträge zusammenführen","action":"ausgewählte Beiträge zusammenführen","error":"Es gab einen Fehler beim Zusammenführen der ausgewählten Beiträge."},"publish_page":{"title":"Als Seite veröffentlichen","publish":"Veröffentlichen","description":"Wenn ein Thema als Seite veröffentlicht wird, kann seine URL geteilt werden und es wird mit benutzerdefiniertem Styling angezeigt.","slug":"Sprechender Name für URL","public":"Öffentlich","public_description":"Benutzer können die Seite auch dann sehen, wenn das zugehörige Thema privat ist.","publish_url":"Die Seite wurde unter folgender URL veröffentlicht:","topic_published":"Das Thema wurde unter folgender URL veröffentlicht:","preview_url":"Die Seite wird unter folgender URL veröffentlicht:","invalid_slug":"Du kannst diese Seite leider nicht veröffentlichen.","unpublish":"Veröffentlichung aufheben","unpublished":"Die Veröffentlichung der Seite wurde aufgehoben.","publishing_settings":"Veröffentlichungseinstellungen"},"change_owner":{"title":"Eigentümer ändern","action":"Eigentümer ändern","error":"Beim Ändern des Eigentümers der Beiträge ist ein Fehler aufgetreten.","placeholder":"Benutzername des neuen Eigentümers","instructions":{"one":"Bitte wähle einen neuen Eigentümer für den Beitrag von \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Bitte wähle einen neuen Eigentümer für %{count} Beiträge von \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Bitte wählen Sie einen neuen Eigentümer für den Beitrag","other":"Bitte wähle einen neuen Eigentümer für %{count} Beiträge"}},"change_timestamp":{"title":"Zeitstempel ändern…","action":"Erstelldatum ändern","invalid_timestamp":"Das Erstelldatum kann nicht in der Zukunft liegen.","error":"Beim Ändern des Erstelldatums des Themas ist ein Fehler aufgetreten.","instructions":"Wähle bitte ein neues Erstelldatum für das Thema aus. Alle Beitrage im Thema werden unter Beibehaltung der Zeitdifferenz ebenfalls angepasst."},"multi_select":{"select":"auswählen","selected":"ausgewählt (%{count})","select_post":{"label":"auswählen","title":"Beitrag zu Auswahl hinzufügen"},"selected_post":{"label":"ausgewählt","title":"Klicke, um den Beitrag aus der Auswahl zu entfernen"},"select_replies":{"label":"auswählen inkl. Antworten","title":"Beitrag und alle Antworten zu Auswahl hinzufügen"},"select_below":{"label":"auswählen inkl. folgende","title":"Beitrag und alle folgende zu Auswahl hinzufügen"},"delete":"ausgewählte löschen","cancel":"Auswahlvorgang abbrechen","select_all":"alle auswählen","deselect_all":"keine auswählen","description":{"one":"Du hast \u003cb\u003e%{count}\u003c/b\u003e Beitrag ausgewählt.","other":"Du hast \u003cb\u003e%{count}\u003c/b\u003e Beiträge ausgewählt."}},"deleted_by_author_simple":"(Thema vom Autor gelöscht)"},"post":{"quote_reply":"Zitat","quote_share":"Teilen","edit_reason":"Grund: ","post_number":"Beitrag %{number}","ignored":"Ignorierter Inhalt","wiki_last_edited_on":"Wiki zuletzt bearbeitet am %{dateTime}","last_edited_on":"Beitrag zuletzt bearbeitet am %{dateTime}","reply_as_new_topic":"Mit verknüpftem Thema antworten","reply_as_new_private_message":"Antworte als neue Nachricht an die gleichen Empfänger","continue_discussion":"Fortsetzung der Diskussion von %{postLink}:","follow_quote":"springe zum zitierten Beitrag","show_full":"Zeige ganzen Beitrag","show_hidden":"Ignorierte Inhalte anzeigen.","deleted_by_author_simple":"(Beitrag vom Autor gelöscht)","collapse":"zuklappen","expand_collapse":"erweitern/minimieren","locked":"Ein Teammitglied hat diesen Beitrag für die weitere Bearbeitung gesperrt","gap":{"one":"einen versteckten Beitrag anzeigen","other":"%{count} versteckte Beiträge anzeigen"},"notice":{"new_user":"Dies ist der erste Beitrag von %{user} — lasst uns das neue Mitglied in unserer Community willkommen hei­ßen!","returning_user":"Es ist eine Weile her, dass wir %{user} gesehen haben. — Der letzter Beitrag war %{time}."},"unread":"Beitrag ist ungelesen","has_replies":{"one":"%{count} Antwort","other":"%{count} Antworten"},"has_replies_count":"%{count}","unknown_user":"(unbekannt/gelöschter Benutzer)","has_likes_title":{"one":"dieser Beitrag gefällt %{count} Person","other":"dieser Beitrag gefällt %{count} Personen"},"has_likes_title_only_you":"dir gefällt dieser Beitrag","has_likes_title_you":{"one":"dir und einer weiteren Person gefällt dieser Beitrag","other":"dir und %{count} weiteren Personen gefällt dieser Beitrag"},"filtered_replies_hint":{"one":"Diesen Beitrag und seine Antwort ansehen","other":"Diesen Beitrag und seine %{count} Antworten ansehen"},"filtered_replies_viewing":{"one":"Zeige %{count} Antwort an","other":"Zeige %{count} Antworten an"},"in_reply_to":"Übergeordneten Beitrag laden","view_all_posts":"Alle Beiträge anzeigen","errors":{"create":"Entschuldige, es gab einen Fehler beim Anlegen des Beitrags. Bitte versuche es noch einmal.","edit":"Entschuldige, es gab einen Fehler beim Bearbeiten des Beitrags. Bitte versuche es noch einmal.","upload":"Entschuldige, es gab einen Fehler beim Hochladen der Datei. Bitte versuche es noch einmal.","file_too_large":"Entschuldigung, die Datei ist zu groß (maximale Größe ist %{max_size_kb}kb). Wie wäre es, die Datei in einen Cloud Sharing Service hochzuladen und dann den Link einzufügen?","too_many_uploads":"Entschuldige, du darfst immer nur eine Datei hochladen.","too_many_dragged_and_dropped_files":{"one":"Es kann leider nur %{count} Datei gleichzeitig hochgeladen werden.","other":"Es können leider nur %{count} Dateien gleichzeitig hochgeladen werden."},"upload_not_authorized":"Entschuldigung, die Datei die du hochladen möchtest ist nicht erlaubt (erlaubte Dateiendungen sind: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Entschuldige, neue Benutzer dürfen keine Bilder hochladen.","attachment_upload_not_allowed_for_new_user":"Entschuldige, neue Benutzer dürfen keine Dateien hochladen.","attachment_download_requires_login":"Entschuldige, du musst angemeldet sein, um Dateien herunterladen zu können."},"cancel_composer":{"confirm":"Was würdest du gerne mit deinem Beitrag machen?","discard":"Verwerfen","save_draft":"Entwurf für später speichern","keep_editing":"Weiter bearbeiten"},"via_email":"dieser Beitrag ist per E-Mail eingetroffen","via_auto_generated_email":"dieser Beitrag ist als automatisch generierte E-Mail eingegangen","whisper":"Dieser Beitrag ist Privat für Moderatoren.","wiki":{"about":"dieser Beitrag ist ein Wiki"},"archetypes":{"save":"Speicheroptionen"},"few_likes_left":"Danke fürs Teilen der Liebe! Du hast für heute nur noch wenige Likes übrig.","controls":{"reply":"verfasse eine Antwort auf diesen Beitrag","like":"dieser Beitrag gefällt mir","has_liked":"dir gefällt dieser Beitrag","read_indicator":"Mitglieder, die diesen Beitrag gelesen haben","undo_like":"gefällt mir nicht mehr","edit":"diesen Beitrag bearbeiten","edit_action":"Bearbeiten","edit_anonymous":"Entschuldige, du musst angemeldet sein, um diesen Beitrag zu bearbeiten.","flag":"Diesen Beitrag den Moderatoren melden oder eine Nachricht senden.","delete":"diesen Beitrag löschen","undelete":"diesen Beitrag wiederherstellen","share":"Link zu diesem Beitrag teilen","more":"Mehr","delete_replies":{"confirm":"Möchtest du auch die Antworten auf diese Beiträge löschen?","direct_replies":{"one":"Ja, und eine direkte Antwort","other":"Ja, und %{count} direkte Antworten"},"all_replies":{"one":"Ja, und eine Antwort","other":"Ja, und %{count} Antworten"},"just_the_post":"Nein, nur diesen Beitrag"},"admin":"Administrative Aktionen","wiki":"Wiki erstellen","unwiki":"Wiki entfernen","convert_to_moderator":"Team-Einfärbung hinzufügen","revert_to_regular":"Team-Einfärbung entfernen","rebake":"HTML erneuern","publish_page":"Als Seite veröffentlichen…","unhide":"Einblenden","change_owner":"Eigentümer ändern","grant_badge":"Abzeichen verleihen","lock_post":"Beitrag sperren","lock_post_description":"verhindern, dass der Autor den Beitrag bearbeitet","unlock_post":"Beitrag entsperren","unlock_post_description":"erlaube, dass der Autor den Beitrag bearbeitet","delete_topic_disallowed_modal":"Du hast keine Berechtigung, dieses Thema zu löschen. Wenn du wirklich möchtest, dass es gelöscht wird, melde es mit einer Begründung, um einen Moderator darauf aufmerksam zu machen.","delete_topic_disallowed":"du hast keine Berechtigung, dieses Thema zu löschen","delete_topic_confirm_modal":{"one":"Dieses Thema hat derzeit mehr als %{count} Aufruf und kann ein beliebtes Suchziel sein. Sind Sie sicher, dass Sie dieses Thema vollständig löschen wollen, anstatt es zu bearbeiten, um es zu verbessern?","other":"Dieses Thema hat derzeit mehr als %{count} Aufrufe und kann ein beliebtes Suchziel sein. Sind Sie sicher, dass Sie dieses Thema vollständig löschen wollen, anstatt es zu bearbeiten, um es zu verbessern?"},"delete_topic_confirm_modal_yes":"Ja, dieses Thema löschen","delete_topic_confirm_modal_no":"Nein, dieses Thema behalten","delete_topic_error":"Beim Löschen dieses Themas ist ein Fehler aufgetreten","delete_topic":"Thema löschen","add_post_notice":"Team Notiz hinzufügen","change_post_notice":"Team Notiz ändern","delete_post_notice":"Team Notiz löschen","remove_timer":"Stoppuhr entfernen","edit_timer":"Timer bearbeiten"},"actions":{"people":{"like":{"one":"gefällt dies","other":"gefällt dies"},"read":{"one":"hat dies gelesen","other":"hat dies gelesen"},"like_capped":{"one":"und %{count} anderen gefällt das","other":"und %{count} anderen gefällt das"},"read_capped":{"one":"and %{count} anderer haben dies gelesen","other":"und %{count} andere haben dies gelesen"}},"by_you":{"off_topic":"Du hast das als „am Thema vorbei“ gemeldet","spam":"Du hast das als Spam gemeldet","inappropriate":"Du hast das als Unangemessen gemeldet","notify_moderators":"Du hast dies den Moderatoren gemeldet","notify_user":"Du hast diesem Benutzer eine Nachricht gesendet"}},"delete":{"confirm":{"one":"Möchtest du wirklich diesen Beitrag löschen?","other":"Möchtest du wirklich diese %{count} Beiträge löschen?"}},"merge":{"confirm":{"one":"Möchtest du diese Beiträge wirklich zusammenführen?","other":"Möchtest du diese %{count} Beiträge wirklich zusammenführen?"}},"revisions":{"controls":{"first":"Erste Überarbeitung","previous":"Vorherige Überarbeitung","next":"Nächste Überarbeitung","last":"Letzte Überarbeitung","hide":"Überarbeitung verstecken","show":"Überarbeitung anzeigen","revert":"Auf Revision %{revision} zurücksetzen","edit_wiki":"Bearbeite Wiki","edit_post":"Bearbeite Beitrag","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Zeige die Änderungen inline an","button":"HTML"},"side_by_side":{"title":"Zeige die Änderungen nebeneinander an","button":"HTML"},"side_by_side_markdown":{"title":"Zeige die Originaltexte zum Vergleich nebeneinander an","button":"Quelltext"}}},"raw_email":{"displays":{"raw":{"title":"Zeige den Quelltext der E-Mail","button":"Quelltext"},"text_part":{"title":"Zeige den Text-Teil der E-Mail","button":"Text"},"html_part":{"title":"Zeige den HTML-Teil der E-Mail","button":"HTML"}}},"bookmarks":{"create":"Lesezeichen erstellen","edit":"Lesezeichen bearbeiten","created":"Erstellt","updated":"Aktualisiert","name":"Name","name_placeholder":"Wofür dient dieses Lesezeichen?","set_reminder":"Erinnere mich","actions":{"delete_bookmark":{"name":"Lesezeichen löschen","description":"Entfernt das Lesezeichen aus deinem Profil und stoppt alle Erinnerungen für dieses Lesezeichen."},"edit_bookmark":{"name":"Lesezeichen bearbeiten","description":"Ändere den Namen des Lesezeichens oder den Erinnerungszeitpunkt."},"pin_bookmark":{"name":"Lesezeichen anheften","description":"Das Lesezeichen anheften, damit es oben auf der Liste der Lesezeichen erscheint."},"unpin_bookmark":{"name":"Lesezeichen lösen","description":"Löse das Lesezeichen. Es wird nicht mehr oben in Deiner Lesezeichenliste angezeigt."}}},"filtered_replies":{"viewing_posts_by":"Zeige %{post_count} Beiträge von","viewing_subset":"Einige Antworten sind reduziert","viewing_summary":"Eine Zusammenfassung dieses Themas anzeigen","post_number":"%{username}, Beitrag #%{post_number}","show_all":"Alle anzeigen"}},"category":{"can":"kann\u0026hellip; ","none":"(keine Kategorie)","all":"Alle Kategorien","choose":"Kategorie\u0026hellip;","edit":"Bearbeiten","edit_dialog_title":"Bearbeiten: %{categoryName}","view":"Zeige Themen dieser Kategorie","back":"Zurück zur Kategorie","general":"Allgemeines","settings":"Einstellungen","topic_template":"Themenvorlage","tags":"Schlagwörter","tags_allowed_tags":"Schlagwörter auf diese Kategorie einschränken:","tags_allowed_tag_groups":"Schlagwortgruppen auf diese Kategorie einschränken:","tags_placeholder":"(Optional) Liste erlaubter Schlagwörter","tags_tab_description":"Die oben spezifizierten Tags und Tag-Gruppen werden nur in dieser Kategorie und anderen Kategorien, für die sie ebenfalls spezifiziert sind, verfügbar sein. Darüber hinaus werden sie nicht in weiteren Kategorien verwendbar sein.","tag_groups_placeholder":"(Optional) Liste erlaubter Schlagwort-Gruppen","manage_tag_groups_link":"Schlagwort-Gruppen verwalten","allow_global_tags_label":"Erlaube auch andere Schlagwörter.","tag_group_selector_placeholder":"(Optional) Tag Gruppe","required_tag_group_description":"Neue Themen müssen Tags von einer Tag Gruppe haben:","min_tags_from_required_group_label":"Num Tags:","required_tag_group_label":"Tag Gruppe:","topic_featured_link_allowed":"Erlaube hervorgehobene Links in dieser Kategorie","delete":"Kategorie löschen","create":"Neue Kategorie","create_long":"Eine neue Kategorie erstellen","save":"Kategorie speichern","slug":"Sprechender Name für URL","slug_placeholder":"Bindestrich getrennte Wörter für URL","creation_error":"Beim Erstellen der Kategorie ist ein Fehler aufgetreten.","save_error":"Beim Speichern der Kategorie ist ein Fehler aufgetreten.","name":"Name der Kategorie","description":"Beschreibung","topic":"Themenkategorie","logo":"Logo für Kategorie","background_image":"Hintergrundbild für Kategorie","badge_colors":"Farben von Abzeichen","background_color":"Hintergrundfarbe","foreground_color":"Vordergrundfarbe","name_placeholder":"Ein oder maximal zwei Wörter","color_placeholder":"Irgendeine Web-Farbe","delete_confirm":"Möchtest du wirklich diese Kategorie löschen?","delete_error":"Beim Löschen der Kategorie ist ein Fehler aufgetreten.","list":"Kategorien auflisten","no_description":"Bitte füge eine Beschreibung für diese Kategorie hinzu.","change_in_category_topic":"Beschreibung bearbeiten","already_used":"Diese Farbe wird bereits für eine andere Kategorie verwendet.","security":"Sicherheit","security_add_group":"Eine Gruppe hinzufügen","permissions":{"group":"Gruppe","see":"Ansehen","reply":"Antworte","create":"Erstelle","no_groups_selected":"Es wurde keinen Gruppen Zugriff gewährt. Diese Kategorie ist nur für Mitarbeiter sichtbar.","everyone_has_access":"Diese Kategorie ist öffentlich, jeder kann Beiträge sehen, beantworten und erstellen. Entferne eine oder mehrere der Berechtigungen, die der Gruppe \"Jeder\" erteilt wurden, um die Berechtigungen einzuschränken.","toggle_reply":"Antwortberechtigung umschalten","toggle_full":"Erstellungsberechtigung umschalten","inherited":"Diese Berechtigung wird von \"jedem\" vererbt"},"special_warning":"Warnung: Diese Kategorie wurde bei der Installation angelegt. Die Sicherheitseinstellungen können daher nicht verändert werden. Wenn du diese Kategorie nicht benötigst, dann solltest du sie löschen anstatt sie für andere Zwecke zu verwenden.","uncategorized_security_warning":"Diese Kategorie ist etwas Spezielles. Sie dient als Bereich für Themen, die keine Kategorie haben und besitzt keine Sicherheitseinstellungen.","uncategorized_general_warning":"Diese Kategorie ist etwas Spezielles. Sie wird als Standard-Kategorie für neue Themen genutzt, für die keine Kategorie ausgewählt wurde. Deaktiviere \u003ca href=\"%{settingLink}\"\u003ediese Einstellung\u003c/a\u003e, wenn dieses Verhalten verhindert und eine Kategoriewahl erzwungen werden soll. Der Name und die Beschreibung können unter \u003ca href=\"%{customizeLink}\"\u003eAnpassen / Textinhalte\u003c/a\u003e geändert werden.","pending_permission_change_alert":"Du hast %{group} nicht zu dieser Kategorie hinzugefügt; klicke diese Schaltfläche, um sie zuzufügen.","images":"Bilder","email_in":"Benutzerdefinierte Adresse für eingehende E-Mails:","email_in_allow_strangers":"Akzeptiere E-Mails von anonymen Benutzern.","email_in_disabled":"Das Erstellen von neuen Themen per E-Mail ist in den Website-Einstellungen deaktiviert. Um das Erstellen von neuen Themen per E-Mail zu erlauben, ","email_in_disabled_click":"aktiviere die Einstellung „email in“.","mailinglist_mirror":"Kategorie spiegelt eine Mailingliste","show_subcategory_list":"Zeige Liste von Unterkategorien oberhalb von Themen in dieser Kategorie","read_only_banner":"Bannertext, wenn ein Benutzer kein Thema in dieser Kategorie erstellen kann:","num_featured_topics":"Anzahl der Themen, die auf der Kategorien-Seite angezeigt werden","subcategory_num_featured_topics":"Anzahl beworbener Themen, die auf der Seite der übergeordneten Kategorie angezeigt werden:","all_topics_wiki":"Mache neue Themen standardmäßig zu Wikis.","allow_unlimited_owner_edits_on_first_post":"Zulassen unbegrenzter Besitzerbearbeitungen beim ersten Beitrag","subcategory_list_style":"Listenstil für Unterkategorien","sort_order":"Themenliste sortieren nach:","default_view":"Standard-Themenliste","default_top_period":"Standard-Zeitraum für Top-Beiträge:","default_list_filter":"Standard-Listenfilter:","allow_badges_label":"Erlaube das Verleihen von Abzeichen in dieser Kategorie.","edit_permissions":"Berechtigungen bearbeiten","reviewable_by_group":"Zusätzlich zu den Mitarbeitern können Inhalte in dieser Kategorie auch überprüft werden von:","review_group_name":"Gruppenname","require_topic_approval":"Erfordere Moderator-Genehmigung für alle neuen Themen","require_reply_approval":"Erfordere Moderator-Genehmigung für alle neuen Antworten","this_year":"dieses Jahr","position":"Position auf der Kategorien-Seite:","default_position":"Standardposition","position_disabled":"Kategorien werden in der Reihenfolge der Aktivität angezeigt. Um die Reihenfolge von Kategorien in Listen zu steuern, ","position_disabled_click":"aktiviere die Einstellung „fixed category positions“.","minimum_required_tags":"Minimal Anzahl an Schlagwörtern, die ein Thema erfordert","parent":"Übergeordnete Kategorie","num_auto_bump_daily":"Anzahl der offenen Themen, die automatisch täglich nach oben verschoben werden","navigate_to_first_post_after_read":"Gehe zum ersten Beitrag, nachdem Themen gelesen wurden","notifications":{"watching":{"title":"Beobachten","description":"Du wirst automatisch alle Themen in dieser Kategorie beobachten. Du wirst über alle neuen Beiträge in allen Themen benachrichtigt und die Anzahl der neuen Antworten wird angezeigt."},"watching_first_post":{"title":"Ersten Beitrag beobachten","description":"Du wirst über neue Themen in dieser Kategorie benachrichtigt, aber nicht über Antworten auf diese Themen."},"tracking":{"title":"Verfolgen","description":"Du wirst automatisch alle Themen in dieser Kategorie verfolgen. Du wirst benachrichtigt, wenn jemand deinen @name erwähnt oder dir antwortet, und die Anzahl der neuen Antworten wird angezeigt."},"regular":{"title":"Normal","description":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet."},"muted":{"title":"Stummgeschaltet","description":"Du erhältst nie mehr Benachrichtigungen über neue Themen in dieser Kategorie und die Themen werden auch nicht in der Liste der letzten Themen erscheinen."}},"search_priority":{"label":"Suchpriorität","options":{"normal":"Normal","ignore":"Ignorieren","very_low":"Sehr niedrig","low":"Niedrig","high":"Hoch","very_high":"Sehr hoch"}},"sort_options":{"default":"Standard","likes":"Likes","op_likes":"Likes des Originalbeitrags","views":"Ansichten","posts":"Beiträge","activity":"Aktivität","posters":"Beitragende","category":"Kategorie","created":"Erstellt"},"sort_ascending":"Aufsteigend","sort_descending":"Absteigend","subcategory_list_styles":{"rows":"Zeilen","rows_with_featured_topics":"Zeilen mit hervorgehobenen Themen","boxes":"Spalten","boxes_with_featured_topics":"Spalten mit hervorgehobenen Themen"},"settings_sections":{"general":"Allgemein","moderation":"Moderation","appearance":"Erscheinungsbild","email":"E-Mail"},"list_filters":{"all":"alle Themen","none":"keine Unterkategorien"},"colors_disabled":"Sie können keine Farben auswählen, da Sie keinen Kategoriestil haben."},"flagging":{"title":"Danke für deine Mithilfe!","action":"Beitrag melden","take_action":"Reagieren...","take_action_options":{"default":{"title":"Reagieren","details":"Den Meldungsschwellenwert sofort erreichen, anstatt auf weitere Meldungen aus der Community zu warten."},"suspend":{"title":"Benutzer sperren","details":"Erreichen Sie den Kennzeichnungsschwellenwert und sperren Sie den Benutzer"},"silence":{"title":"Benutzer stummschalten","details":"Erreichen Sie den Kennzeichnungsschwellenwert und schalten Sie den Benutzer stumm"}},"notify_action":"Nachricht","official_warning":"Offizielle Warnung","delete_spammer":"Spammer löschen","flag_for_review":"Warteschlange zur Überprüfung","yes_delete_spammer":"Ja, lösche den Spammer","ip_address_missing":"(nicht verfügbar)","hidden_email_address":"(versteckt)","submit_tooltip":"Private Meldung abschicken","take_action_tooltip":"Den Meldungsschwellenwert sofort erreichen, anstatt auf weitere Meldungen aus der Community zu warten.","cant":"Entschuldige, du kannst diesen Beitrag derzeit nicht melden.","notify_staff":"Team nicht-öffentlich benachrichtigen","formatted_name":{"off_topic":"Es ist am Thema vorbei","inappropriate":"Es ist unangemessen","spam":"Es ist Spam"},"custom_placeholder_notify_user":"Sei konkret, konstruktiv und immer freundlich.","custom_placeholder_notify_moderators":"Bitte lass uns wissen, was genau dich beunruhigt. Verweise, wenn möglich, auf relevante Links und Beispiele.","custom_message":{"at_least":{"one":"gib mindestens ein Zeichen ein","other":"gib mindestens %{count} Zeichen ein"},"more":{"one":"eine weitere…","other":"%{count} weitere…"},"left":{"one":"eine übrig","other":"%{count} übrig"}}},"flagging_topic":{"title":"Danke für deine Mithilfe!","action":"Thema melden","notify_action":"Nachricht"},"topic_map":{"title":"Zusammenfassung des Themas","participants_title":"Autoren vieler Beiträge","links_title":"Beliebte Links","links_shown":"mehr Links anzeigen…","clicks":{"one":"%{count} Klick","other":"%{count} Klicks"}},"post_links":{"about":"weitere Links für diesen Beitrag aufklappen","title":{"one":"ein weiterer","other":"%{count} weitere"}},"topic_statuses":{"warning":{"help":"Dies ist eine offizielle Warnung."},"bookmarked":{"help":"Du hast dieses Thema mit einem Lesezeichen versehen."},"locked":{"help":"Dieses Thema ist geschlossen. Das Antworten ist nicht mehr möglich."},"archived":{"help":"Dieses Thema ist archiviert; es ist eingefroren und kann nicht mehr geändert werden"},"locked_and_archived":{"help":"Dieses Thema ist geschlossen. Das Antworten oder das Bearbeiten ist nicht mehr möglich."},"unpinned":{"title":"Losgelöst","help":"Dieses Thema ist für dich losgelöst; es wird in der normalen Reihenfolge angezeigt"},"pinned_globally":{"title":"Global angeheftet","help":"Dieses Thema ist global angeheftet; es wird immer am Anfang der Liste der letzten Beiträgen und in seiner Kategorie auftauchen"},"pinned":{"title":"Angeheftet","help":"Dieses Thema ist für dich angeheftet; es wird immer am Anfang seiner Kategorie auftauchen"},"unlisted":{"help":"Dieses Thema ist unsichtbar. Es wird in keiner Themenliste angezeigt und kann nur mit einem direkten Link betrachtet werden."},"personal_message":{"title":"Dieses Thema ist eine persönliche Nachricht","help":"Dieses Thema ist eine persönliche Nachricht"}},"posts":"Beiträge","original_post":"Original-Beitrag","views":"Aufrufe","views_lowercase":{"one":"Aufruf","other":"Aufrufe"},"replies":"Antworten","views_long":{"one":"dieses Thema wurde %{count}-mal betrachtet","other":"dieses Thema wurde %{number}-mal betrachtet"},"activity":"Aktivität","likes":"Likes","likes_lowercase":{"one":"Like","other":"Likes"},"users":"Benutzer","users_lowercase":{"one":"Benutzer","other":"Benutzer"},"category_title":"Kategorie","history":"Verlauf, letzte 100 Revisionen","changed_by":"von %{author}","raw_email":{"title":"Eingegangene E-Mail","not_available":"Nicht verfügbar!"},"categories_list":"Liste der Kategorien","filters":{"with_topics":"%{filter}","with_category":"%{filter} in %{category}","latest":{"title":"Aktuell","title_with_count":{"one":"Aktuell (%{count})","other":"Aktuell (%{count})"},"help":"Themen mit aktuellen Beiträgen"},"read":{"title":"Gelesen","help":"Themen, die du gelesen hast; werden in der Reihenfolge angezeigt, in der du diese gelesen hast"},"categories":{"title":"Kategorien","title_in":"Kategorie - %{categoryName}","help":"alle Themen, gruppiert nach Kategorie"},"unread":{"title":"Ungelesen","title_with_count":{"one":"Ungelesen (%{count})","other":"Ungelesen (%{count})"},"help":"Themen mit ungelesenen Beiträgen, die du derzeit beobachtest oder verfolgst","lower_title_with_count":{"one":"%{count} ungelesenes","other":"%{count} ungelesene"}},"new":{"lower_title_with_count":{"one":"%{count} neues","other":"%{count} neue"},"lower_title":"neu","title":"Neu","title_with_count":{"one":"Neu (%{count})","other":"Neu (%{count})"},"help":"Themen, die in den letzten paar Tagen erstellt wurden"},"posted":{"title":"Meine Beiträge","help":"Themen, zu denen du beigetragen hast"},"bookmarks":{"title":"Lesezeichen","help":"Themen, die du mit einem Lesezeichen versehen hast."},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"aktuelle Themen in der Kategorie %{categoryName}"},"top":{"title":"Angesagt","help":"die aktivsten Themen in diesem Jahr, in diesem Monat, in dieser Woche und heute","all":{"title":"Gesamt"},"yearly":{"title":"Jährlich"},"quarterly":{"title":"Vierteljährlich"},"monthly":{"title":"Monatlich"},"weekly":{"title":"Wöchentlich"},"daily":{"title":"Täglich"},"all_time":"Gesamt","this_year":"Jahr","this_quarter":"Quartal","this_month":"Monat","this_week":"Woche","today":"Heute","other_periods":"siehe oben:"}},"browser_update":"Leider ist \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eIhr Browser zu alt, um auf dieser Seite zu arbeiten\u003c/a\u003e. Bitte \u003ca href=\"https://browsehappy.com\"\u003eaktualisieren Sie Ihren Browser\u003c/a\u003e , um Inhalte korrekt anzuzeigen, einloggen und antworten zu können.","permission_types":{"full":"Erstellen / Antworten / Ansehen","create_post":"Antworten / Ansehen","readonly":"Ansehen"},"lightbox":{"download":"herunterladen","previous":"Vorhergehend (linke Pfeiltaste)","next":"Nächste (rechte Pfeiltaste)","counter":"%curr% von %total%","close":"Schließen (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eDer Inhalt\u003c/a\u003e konnte nicht geladen werden.","image_load_error":"\u003ca href=\"%url%\"\u003eDas Bild\u003c/a\u003e konnte nicht geladen werden."},"cannot_render_video":"Dieses Video kann nicht gerendert werden, da Dein Browser den Codec nicht unterstützt.","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} oder %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Tastenkombinationen","jump_to":{"title":"Springe zu","home":"%{shortcut} Startseite","latest":"%{shortcut} Neueste Beiträge","new":"%{shortcut} Neue Beiträge","unread":"%{shortcut} Ungelesene Beiträge","categories":"%{shortcut} Kategorien","top":"%{shortcut} Top-Beiträge","bookmarks":"%{shortcut} Lesezeichen","profile":"%{shortcut} Profil","messages":"%{shortcut} Nachrichten","drafts":"%{shortcut} Entwürfe","next":"%{shortcut} Nächstes Thema","previous":"%{shortcut} Vorheriges Thema"},"navigation":{"title":"Navigation","jump":"%{shortcut} Springe zu Beitrag #","back":"%{shortcut} Zurück","up_down":"%{shortcut} Auswahl bewegen \u0026uarr; \u0026darr;","open":"%{shortcut} Ausgewähltes Thema öffnen","next_prev":"%{shortcut} Nächster/vorheriger Abschnitt","go_to_unread_post":"%{shortcut} Zum ersten ungelesenen Beitrag springen"},"application":{"title":"Anwendung","create":"%{shortcut} Neues Thema erstellen","notifications":"%{shortcut} Benachrichtigungen öffnen","hamburger_menu":"%{shortcut} „Hamburger“-Menü öffnen","user_profile_menu":"%{shortcut} Benutzermenü öffnen","show_incoming_updated_topics":"%{shortcut} Aktualisierte Themen anzeigen","search":"%{shortcut} Suche","help":"%{shortcut} Tastenkombinationen anzeigen","dismiss_new_posts":"%{shortcut} Neue Themen oder Beiträge ignorieren","dismiss_topics":"%{shortcut} Themen ignorieren","log_out":"%{shortcut} Abmelden"},"composing":{"title":"Schreiben","return":"%{shortcut} Zurück zum Editor","fullscreen":"%{shortcut} Vollbild-Editor"},"bookmarks":{"title":"Lesezeichen setzen","enter":"%{shortcut} Speichern und schließen","later_today":"%{shortcut} Im Laufe des Tages","later_this_week":"%{shortcut} Später in dieser Woche","tomorrow":"%{shortcut} Morgen","next_week":"%{shortcut} Nächste Woche","next_month":"%{shortcut} Nächsten Monat","next_business_week":"%{shortcut} Anfang nächster Woche","next_business_day":"%{shortcut} Nächster Arbeitstag","custom":"%{shortcut} Datum und Uhrzeit auswählen","none":"%{shortcut} Keine Erinnerung","delete":"%{shortcut} Lesezeichen löschen"},"actions":{"title":"Aktionen","bookmark_topic":"%{shortcut} Lesezeichen hinzufügen/entfernen","pin_unpin_topic":"%{shortcut} Thema anheften/loslösen","share_topic":"%{shortcut} Thema teilen","share_post":"%{shortcut} Beitrag teilen","reply_as_new_topic":"%{shortcut} Mit verknüpftem Thema antworten","reply_topic":"%{shortcut} Auf Thema antworten","reply_post":"%{shortcut} Auf Beitrag antworten","quote_post":"%{shortcut} Beitrag zitieren","like":"%{shortcut} Beitrag mit „Gefällt mir“ markieren","flag":"%{shortcut} Beitrag melden","bookmark":"%{shortcut} Beitrag mit Lesezeichen versehen","edit":"%{shortcut} Beitrag bearbeiten","delete":"%{shortcut} Beitrag löschen","mark_muted":"%{shortcut} Thema stummschalten","mark_regular":"%{shortcut} Thema auf Normal setzen","mark_tracking":"%{shortcut} Thema verfolgen","mark_watching":"%{shortcut} Thema beobachten","print":"%{shortcut} Thema ausdrucken","defer":"%{shortcut} Thema ignorieren","topic_admin_actions":"%{shortcut} Themen-Administration öffnen"},"search_menu":{"title":"Suche","prev_next":"%{shortcut} Auswahl bewegen ↑ ↓","insert_url":"%{shortcut} Auswahl in geöffneten Editor einfügen"}},"badges":{"earned_n_times":{"one":"Abzeichen %{count}-mal erhalten","other":"Abzeichen %{count}-mal erhalten"},"granted_on":"Verliehen %{date}","others_count":"Andere mit diesem Abzeichen (%{count})","title":"Abzeichen","allow_title":"Du kannst dieses Abzeichen als Titel verwenden","multiple_grant":"Du kannst dieses Abzeichen mehrmals verliehen bekommen","badge_count":{"one":"%{count} Abzeichen","other":"%{count} Abzeichen"},"more_badges":{"one":"+%{count} weiteres","other":"+%{count} weitere"},"granted":{"one":"%{count}-mal verliehen","other":"%{count}-mal verliehen"},"select_badge_for_title":"Wähle ein Abzeichen als deinen Titel aus","none":"(keines)","successfully_granted":"%{badge} erfolgreich verliehen an %{username}","badge_grouping":{"getting_started":{"name":"Erste Schritte"},"community":{"name":"Community"},"trust_level":{"name":"Vertrauensstufe"},"other":{"name":"Andere"},"posting":{"name":"Schreiben"}}},"tagging":{"all_tags":"Alle Schlagwörter","other_tags":"Sonstige Schlagwörter","selector_all_tags":"Alle Schlagwörter","selector_no_tags":"keine Schlagwörter","changed":"Geänderte Schlagwörter:","tags":"Schlagwörter","choose_for_topic":"optionale Schlagwörter","info":"Info","default_info":"Dieses Schlagwort ist nicht auf Kategorien beschränkt und hat keine Synonyme.","category_restricted":"Dieser Tag ist auf Kategorien begrenzt, für die du keine Zugriffsberechtigung hast.","synonyms":"Synonyme","synonyms_description":"Wenn die folgenden Schlagwörter verwendet werden, werden sie durch \u003cb\u003e%{base_tag_name} \u003c/b\u003e ersetzt.","tag_groups_info":{"one":"Dieses Schlagwort gehört zur Gruppe „%{tag_groups}”.","other":"Dieses Schlagwort gehört zu diesen Gruppen: %{tag_groups}"},"category_restrictions":{"one":"Es kann nur in dieser Kategorie verwendet werden:","other":"Es kann nur in folgenden Kategorien verwendet werden:"},"edit_synonyms":"Synonyme Verwalten","add_synonyms_label":"Synonyme hinzufügen:","add_synonyms":"Hinzufügen","add_synonyms_explanation":{"one":"Jede Stelle, die dieses Schlagwort aktuell verwendet, wird auf die Verwendung von \u003cb\u003e%{tag_name}\u003c/b\u003e geändert. Bist du sicher, dass diese Änderung erfolgen soll?","other":"Jede Stelle, die dieses Schlagwort aktuell verwendet, wird auf die Verwendung von \u003cb\u003e%{tag_name}\u003c/b\u003e geändert. Bist du sicher, dass diese Änderung erfolgen soll?"},"add_synonyms_failed":"Die folgenden Schlagwörter konnten nicht als Synonyme hinzugefügt werden: \u003cb\u003e%{tag_names}\u003c/b\u003e . Stellen Sie sicher, dass sie keine Synonyme und keine Synonyme eines anderen Schlagwortes bereits haben.","remove_synonym":"Synonym entfernen","delete_synonym_confirm":"Bist du dir sicher das du das folgende Synonym entfernen möchtest \"%{tag_name}\" ?","delete_tag":"Schlagwört löschen","delete_confirm":{"one":"Bist du sicher, dass du dieses Schlagwort löschen und von einem zugeordneten Thema entfernen möchtest?","other":"Bist du sicher, dass du dieses Schlagwort löschen und von %{count} zugeordneten Themen entfernen möchtest?"},"delete_confirm_no_topics":"Bist du sicher, dass du dieses Schlagwort löschen möchtest?","delete_confirm_synonyms":{"one":"Das Synonym wird ebenfalls gelöscht.","other":"Es werden %{count} weitere Synonyme ebenfalls gelöscht."},"rename_tag":"Schlagwort umbenennen","rename_instructions":"Neuen Namen für das Schlagwort wählen:","sort_by":"Sortieren nach:","sort_by_count":"Anzahl","sort_by_name":"Name","manage_groups":"Schlagwort-Gruppen verwalten","manage_groups_description":"Gruppen definieren, um Schlagwörter zu organisieren","upload":"Schlagwörter hochladen","upload_description":"Lade eine CSV-Datei hoch, um mehrere Schlagwörter auf einmal zu erstellen","upload_instructions":"Eine pro Zeile, optional mit einer Schlagwortgruppe nach dem Schema 'schlagwort_name,schlagwort_gruppe'.","upload_successful":"Schlagwörter erfolgreich hochgeladen","delete_unused_confirmation":{"one":"%{count} Schlagwort wird gelöscht: %{tags}","other":"%{count} Schlagwörter werden gelöscht: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} und%{count} weiteres","other":"%{tags} und %{count} weitere"},"delete_no_unused_tags":"Es gibt keine ungenutzten Schlagwörter.","tag_list_joiner":", ","delete_unused":"Nicht verwendete Schlagwörter löschen","delete_unused_description":"Alle Schlagwörter löschen, die keinem Thema und keiner Nachricht zugewiesen sind.","cancel_delete_unused":"Abbrechen","filters":{"without_category":"%{filter} %{tag} Themen","with_category":"%{filter} %{tag} Themen in %{category}","untagged_without_category":"%{filter} Themen ohne Schlagwörter","untagged_with_category":"%{filter} ohne Schlagwörter in %{category}"},"notifications":{"watching":{"title":"Beobachten","description":"Du wirst automatisch alle Themen mit diesem Schlagwort beobachten. Du wirst über alle neuen Beiträge und Themen benachrichtigt werden. Außerdem wird die Anzahl der ungelesenen und neuen Beiträge neben dem Thema erscheinen."},"watching_first_post":{"title":"Ersten Beitrag beobachten","description":"Du wirst über neue Themen mit diesem Schlagwort benachrichtigt, aber nicht über Antworten auf diese Themen."},"tracking":{"title":"Verfolgen","description":"Du wirst automatisch allen Themen mit diesem Schlagwort folgen. Die Anzahl der ungelesenen und neuen Beiträge wird neben dem Thema erscheinen."},"regular":{"title":"Allgemein","description":"Du wirst benachrichtigt, wenn jemand deinen @Namen erwähnt oder auf deinen Beitrag antwortet."},"muted":{"title":"Stummgeschaltet","description":"Du wirst nicht über neue Themen mit diesem Schlagwort benachrichtigt und sie werden nicht in deinen ungelesenen Beiträgen auftauchen."}},"groups":{"title":"Schlagwort-Gruppen","about":"Schlagwörter zu Gruppen hinzufügen, um sie einfacher zu verwalten.","new":"Neue Gruppe","tags_label":"Schlagwörter in dieser Gruppe:","parent_tag_label":"Übergeordnetes Schlagwort","parent_tag_description":"Schlagwörter aus dieser Gruppe können nur verwendet werden, wenn das übergeordnete Schlagwort zugeordnet ist.","one_per_topic_label":"Beschränke diese Gruppe auf ein Schlagwort pro Thema","new_name":"Neue Schlagwort-Gruppe","name_placeholder":"Name der Tag Gruppe","save":"Speichern","delete":"Löschen","confirm_delete":"Möchtest du wirklich diese Schlagwort-Gruppe löschen?","everyone_can_use":"Schlagwörter können von jedem verwendet werden","usable_only_by_groups":"Schlagwörter sind für jeden sichtbar, aber nur die folgenden Gruppen können sie benutzen","visible_only_to_groups":"Tags sind nur für folgende Gruppen sichtbar","cannot_save":"Schlagwort-Gruppe kann nicht gespeichert werden. Stelle sicher, dass mindestens ein Schlagwort vorhanden ist, der Name der Schlagwort-Gruppe nicht leer ist und eine Gruppe für die Schlagwort-Berechtigung ausgewählt ist."},"topics":{"none":{"unread":"Du hast keine ungelesenen Themen.","new":"Du hast keine neuen Themen.","read":"Du hast noch keine Themen gelesen.","posted":"Du hast noch keine Beiträge verfasst.","latest":"Es gibt keine aktuellen Themen.","bookmarks":"Du hast noch keine Themen, die du mit einem Lesezeichen versehen hast.","top":"Es gibt keine Top-Themen."}}},"invite":{"custom_message":"Gestalte deine Einladung etwas persönlicher, indem du eine \u003ca href\u003eeigene Nachricht\u003c/a\u003e schreibst.","custom_message_placeholder":"Gib deine persönliche Nachricht ein","approval_not_required":"Benutzer werden beim Annehmen der Einladung sofort automatisch genehmigt.","custom_message_template_forum":"Hey, du solltest diesem Forum beitreten!","custom_message_template_topic":"Hey, ich dachte, dir könnte dieses Thema gefallen!"},"forced_anonymous":"Aufgrund einer außergewöhnlichen Last wird dies vorübergehend so angezeigt, wie es ein nicht angemeldeter Benutzer sehen würde.","forced_anonymous_login_required":"Die Website ist extrem belastet und kann derzeit nicht geladen werden. Versuchen Sie es in ein paar Minuten erneut.","footer_nav":{"back":"Zurück","forward":"Vorwärts","share":"Teilen","dismiss":"Alles gelesen"},"safe_mode":{"enabled":"Der geschützte Modus ist aktiviert. Schliesse das Browserfenster um ihn zu verlassen."},"image_removed":"(Bild entfernt)","do_not_disturb":{"title":"Nicht stören für...","label":"Nicht stören","remaining":"%{remaining} verbleibend","options":{"half_hour":"30 Minuten","one_hour":"1 Stunde","two_hours":"2 Stunden","tomorrow":"Bis morgen","custom":"Benutzerdefiniert"},"set_schedule":"Zeitplan für Benachrichtigungen festlegen"},"cakeday":{"title":"Cakeday","today":"Heute","tomorrow":"Morgen","upcoming":"Demnächst","all":"Alle"},"birthdays":{"title":"Geburtstage","month":{"title":"Geburtstage im Monat","empty":"Kein Benutzer feiert in diesen Monat seinen Geburtstag."},"upcoming":{"title":"Bevorstehende Geburtstage","empty":"Kein Benutzer feiert in den nächsten 7 Tagen seinen Geburtstag."},"today":{"title":"Heutige Geburtstage","empty":"Kein Benutzer feiert heute seinen Geburtstag."},"tomorrow":{"empty":"Kein Benutzer feiert morgen seinen Geburtstag."}},"anniversaries":{"title":"Jahrestage","month":{"title":"Jahrestage des Monats","empty":"Kein Benutzer feiert in diesem Monat seinen Jahrestag."},"upcoming":{"title":"Bevorstehende Jahrestage","empty":"Kein Benutzer feiert in den nächsten 7 Tagen seinen Jahrestag."},"today":{"title":"Heutige Jahrestage","empty":"Kein Benutzer feiert heute seinen Jahrestag."},"tomorrow":{"empty":"Kein Benutzer feiert heute seinen Jahrestag."}},"details":{"title":"Details ausblenden"},"discourse_local_dates":{"relative_dates":{"today":"Heute %{time}","tomorrow":"Morgen %{time}","yesterday":"Gestern %{time}","countdown":{"passed":"Datum liegt in der Vergangenheit"}},"title":"Datum / Uhrzeit einfügen","create":{"form":{"insert":"Einfügen","advanced_mode":"Erweiterter Modus","simple_mode":"Einfacher Modus","format_description":"Format, mit dem das Datum dem Benutzer angezeigt wird. Verwende „Z” zum Anzeigen der Differenz zu UTC und „zz” für den Zeitzonen-Namen.","timezones_title":"Anzuzeigende Zeitzonen","timezones_description":"Zeitzonen werden verwendet, um Datumsangaben in der Vorschau und als Ausweichlösung anzuzeigen.","recurring_title":"Wiederholung","recurring_description":"Definiere die Wiederholung eines Ereignisses. Du kannst die vom Formular generierte Wiederholung auch manuell ändern und einen der folgenden Schlüssel verwenden: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds","recurring_none":"Keine Wiederholung","invalid_date":"Ungültige Datumsangabe. Stelle sicher, dass Datum und Uhrzeit korrekt sind.","date_title":"Datum","time_title":"Uhrzeit","format_title":"Datumsformat","timezone":"Zeitzone","until":"Bis …","recurring":{"every_day":"Jeden Tag","every_week":"Jede Woche","every_two_weeks":"Alle 2 Wochen","every_month":"Jeden Monat","every_two_months":"Alle 2 Monate","every_three_months":"Alle 3 Monate","every_six_months":"Alle 6 Monate","every_year":"Jedes Jahr"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Starte bei allen neuen Benutzern das „Tutorial für neue Benutzer“","welcome_message":"Sende allen neuen Benutzern eine Begrüßungsnachricht mit einer Kurzanleitung"}},"presence":{"replying":{"one":"antwortet","other":"antworten"},"editing":{"one":"bearbeitet","other":"bearbeiten"},"replying_to_topic":{"one":"antwortet","other":"antworten"}},"poll":{"voters":{"one":"Teilnehmer","other":"Teilnehmer"},"total_votes":{"one":"abgegebene Stimme","other":"abgegebene Stimmen"},"average_rating":"Durchschnittliche Bewertung: \u003cstrong\u003e%{average}\u003c/strong\u003e","public":{"title":"Stimmen sind \u003cstrong\u003eöffentlich\u003c/strong\u003e."},"results":{"groups":{"title":"Du musst ein Mitglied von %{groups} sein, um an dieser Umfrage teilnehmen zu können."},"vote":{"title":"Ergebnisse werden \u003cstrong\u003enach Stimmabgabe\u003c/strong\u003e angezeigt."},"closed":{"title":"Ergebnisse werden angezeigt, sobald die Abstimmung \u003cstrong\u003ebeendet\u003c/strong\u003e ist."},"staff":{"title":"Ergebnisse werden nur \u003cstrong\u003eTeammitgliedern\u003c/strong\u003e angezeigt."}},"multiple":{"help":{"at_least_min_options":{"one":"Wähle mindestens \u003cstrong\u003e%{count}\u003c/strong\u003e Option.","other":"Wähle mindestens \u003cstrong\u003e%{count}\u003c/strong\u003e Optionen."},"up_to_max_options":{"one":"Wähle bis zu \u003cstrong\u003e%{count}\u003c/strong\u003e Option.","other":"Wähle bis zu \u003cstrong\u003e%{count}\u003c/strong\u003e Optionen."},"x_options":{"one":"Wähle \u003cstrong\u003e%{count}\u003c/strong\u003e Option.","other":"Wähle \u003cstrong\u003e%{count}\u003c/strong\u003e Optionen."},"between_min_and_max_options":"Wähle zwischen \u003cstrong\u003e%{min}\u003c/strong\u003e und \u003cstrong\u003e%{max}\u003c/strong\u003e Optionen."}},"cast-votes":{"title":"Gib deine Stimmen ab","label":"Jetzt abstimmen!"},"show-results":{"title":"Das Ergebnis der Umfrage anzeigen","label":"Ergebnisse anzeigen"},"hide-results":{"title":"Zurück zur Umfrage","label":"Umfrage anzeigen"},"group-results":{"title":"Stimmen anhand von Benutzerdaten gruppieren","label":"Aufschlüsselung anzeigen"},"export-results":{"title":"Ergebnisse der Umfrage exportieren","label":"Exportieren"},"open":{"title":"Umfrage starten","label":"Starten","confirm":"Möchtest du diese Umfrage wirklich starten?"},"close":{"title":"Umfrage beenden","label":"Beenden","confirm":"Möchtest du diese Umfrage wirklich beenden?"},"automatic_close":{"closes_in":"Wird in \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e beendet.","age":"Geschlossen \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Ergebnisse der Umfrage","votes":"%{count} Stimmen","breakdown":"Aufschlüsselung","percentage":"Prozentsatz","count":"Anzahl"},"error_while_toggling_status":"Leider ist beim Umschalten des Status dieser Umfrage ein Fehler aufgetreten.","error_while_casting_votes":"Leider ist beim Abgeben deiner Stimme ein Fehler aufgetreten.","error_while_fetching_voters":"Leider ist beim Anzeigen der Teilnehmer ein Fehler aufgetreten.","error_while_exporting_results":"Leider ist beim Exportieren der Umfrageergebnisse ein Fehler aufgetreten.","ui_builder":{"title":"Umfrage erstellen","insert":"Umfrage einfügen","help":{"options_min_count":"Geben Sie mindestens 1 Option ein.","options_max_count":"Geben Sie höchstens %{count} Optionen ein.","invalid_min_value":"Der Mindestwert muss mindestens 1 betragen.","invalid_max_value":"Der Maximalwert muss mindestens 1 betragen, aber kleiner oder gleich der Anzahl der Optionen sein.","invalid_values":"Der Mindestwert muss kleiner als der Höchstwert sein.","min_step_value":"Die minimale Schrittweite beträgt 1."},"poll_type":{"label":"Art","regular":"Einfachauswahl","multiple":"Mehrfachauswahl","number":"Bewertung"},"poll_result":{"label":"Ergebnisse anzeigen...","always":"Immer sichtbar","vote":"Nur nach Stimmabgabe","closed":"Wenn die Umfrage geschlossen ist","staff":"Nur Teammitglieder"},"poll_groups":{"label":"Abstimmung auf diese Gruppen beschränken"},"poll_chart_type":{"label":"Ergebnisübersicht","bar":"Balken","pie":"Torte"},"poll_config":{"max":"Max. Auswahl","min":"Min. Auswahl","step":"Schrittweite"},"poll_public":{"label":"Anzeigen, wer abgestimmt hat"},"poll_title":{"label":"Titel (optional)"},"poll_options":{"label":"Optionen (eine pro Zeile)","add":"Option hinzufügen"},"automatic_close":{"label":"Umfrage automatisch beenden"},"show_advanced":"Erweiterte Optionen anzeigen","hide_advanced":"Erweiterte Optionen ausblenden"}},"styleguide":{"title":"Styleguide","welcome":"Wähle einen Abschnitt aus dem linken Menü aus, um loszulegen.","categories":{"atoms":"Atome","molecules":"Moleküle","organisms":"Organismen"},"sections":{"typography":{"title":"Typografie","example":"Willkommen bei Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Datum / Uhrzeit"},"font_scale":{"title":"Schrift"},"colors":{"title":"Farben"},"icons":{"title":"Symbole","full_list":"siehe vollständige Liste der Font Awesome Symbole"},"input_fields":{"title":"Eingabefelder"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"categories":{"title":"Kategorien"},"bread_crumbs":{"title":"Breadcrumbs"},"navigation":{"title":"Navigation"},"navigation_bar":{"title":"Navigationsleiste"},"navigation_stacked":{"title":"Gestapelte Navigation"},"categories_list":{"title":"Kategorienliste"},"topic_link":{"title":"Link zu Thema"},"topic_list_item":{"title":"Element in Themenliste"},"topic_statuses":{"title":"Themenstatus"},"topic_list":{"title":"Themenliste"},"basic_topic_list":{"title":"Grundlegende Themenliste"},"footer_message":{"title":"Fußzeile"},"signup_cta":{"title":"Aufforderung zur Registrierung"},"topic_timer_info":{"title":"Zeitschaltuhren"},"topic_footer_buttons":{"title":"Buttons in Themen-Fußzeile"},"topic_notifications":{"title":"Themen-Benachrichtigungen"},"post":{"title":"Beitrag"},"topic_map":{"title":"Thema-Zusammenfassung"},"site_header":{"title":"Seitenkopf"},"suggested_topics":{"title":"Vorgeschlagene Themen"},"post_menu":{"title":"Beitrag-Aktionen"},"modal":{"title":"Dialogbox","header":"Dialogbox-Titel","footer":"Dialogbox-Fußzeile"},"user_about":{"title":"Benutzerprofil"},"header_icons":{"title":"Header-Symbole"},"spinners":{"title":"Spinner"}}}}},"en":{"js":{"review":{"stale_help":"This reviewable has been resolved by someone else."},"groups":{"manage":{"email":{"enable_smtp":"Enable SMTP","enable_imap":"Enable IMAP","test_settings":"Test Settings","save_settings":"Save Settings","settings_required":"All settings are required, please fill in all fields before validation.","smtp_settings_valid":"SMTP settings valid.","smtp_title":"SMTP","smtp_instructions":"When you enable SMTP for the group, all outbound emails sent from the group's inbox will be sent via the SMTP settings specified here instead of the mail server configured for other emails sent by your forum.","imap_title":"IMAP","imap_additional_settings":"Additional Settings","imap_instructions":"When you enable IMAP for the group, emails are synced between the group inbox and the provided IMAP server and mailbox. SMTP must be enabled with valid and tested credentials before IMAP can be enabled. The email username and password used for SMTP will be used for IMAP. For more information see \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Warning: This is an alpha-stage feature. Only Gmail is officially supported. Use at your own risk!","imap_settings_valid":"IMAP settings valid.","smtp_disable_confirm":"If you disable SMTP, all SMTP and IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_disable_confirm":"If you disable IMAP all IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_mailbox_not_selected":"You must select a Mailbox for this IMAP configuration or no mailboxes will be synced!","prefill":{"title":"Prefill with settings for:","gmail":"GMail"},"mailboxes":{"disabled":"Disabled"}}}},"user":{"skip_new_user_tips":{"read_later":"I'll read it later."},"email":{"authenticated_by_invite":"Your email has been authenticated by the invitation"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"topics":{"bulk":{"dismiss_read_with_selected":"Dismiss %{count} unread","dismiss_button_with_selected":"Dismiss (%{count})…","dismiss_new_with_selected":"Dismiss New (%{count})"}},"category":{"topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"badges":{"favorite_max_reached":"You can’t favorite more badges.","favorite_max_not_reached":"Mark this badge as favorite","favorite_count":"%{count}/%{max} badges marked as favorite"},"cakeday":{"none":" "},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"}}}};
I18n.locale = 'de';
I18n.pluralizationRules.de = MessageFormat.locale.de;
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
//! locale : German [de]
//! author : lluchs : https://github.com/lluchs
//! author: Menelion Elensúle: https://github.com/Oire
//! author : Mikolaj Dadela : https://github.com/mik01aj

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    function processRelativeTime(number, withoutSuffix, key, isFuture) {
        var format = {
            m: ['eine Minute', 'einer Minute'],
            h: ['eine Stunde', 'einer Stunde'],
            d: ['ein Tag', 'einem Tag'],
            dd: [number + ' Tage', number + ' Tagen'],
            w: ['eine Woche', 'einer Woche'],
            M: ['ein Monat', 'einem Monat'],
            MM: [number + ' Monate', number + ' Monaten'],
            y: ['ein Jahr', 'einem Jahr'],
            yy: [number + ' Jahre', number + ' Jahren'],
        };
        return withoutSuffix ? format[key][0] : format[key][1];
    }

    var de = moment.defineLocale('de', {
        months: 'Januar_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember'.split(
            '_'
        ),
        monthsShort: 'Jan._Feb._März_Apr._Mai_Juni_Juli_Aug._Sep._Okt._Nov._Dez.'.split(
            '_'
        ),
        monthsParseExact: true,
        weekdays: 'Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag'.split(
            '_'
        ),
        weekdaysShort: 'So._Mo._Di._Mi._Do._Fr._Sa.'.split('_'),
        weekdaysMin: 'So_Mo_Di_Mi_Do_Fr_Sa'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD.MM.YYYY',
            LL: 'D. MMMM YYYY',
            LLL: 'D. MMMM YYYY HH:mm',
            LLLL: 'dddd, D. MMMM YYYY HH:mm',
        },
        calendar: {
            sameDay: '[heute um] LT [Uhr]',
            sameElse: 'L',
            nextDay: '[morgen um] LT [Uhr]',
            nextWeek: 'dddd [um] LT [Uhr]',
            lastDay: '[gestern um] LT [Uhr]',
            lastWeek: '[letzten] dddd [um] LT [Uhr]',
        },
        relativeTime: {
            future: 'in %s',
            past: 'vor %s',
            s: 'ein paar Sekunden',
            ss: '%d Sekunden',
            m: processRelativeTime,
            mm: '%d Minuten',
            h: processRelativeTime,
            hh: '%d Stunden',
            d: processRelativeTime,
            dd: processRelativeTime,
            w: processRelativeTime,
            ww: '%d Wochen',
            M: processRelativeTime,
            MM: processRelativeTime,
            y: processRelativeTime,
            yy: processRelativeTime,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return de;

})));

// moment-timezone-localization for lang code: de

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidjan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Accra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Addis Abeba","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Algier","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamako","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Kairo","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Casablanca","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Ceuta","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Conakry","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Daressalam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Dschibuti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"El Aaiún","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Johannesburg","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Khartum","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lomé","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaka","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadischu","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monrovia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairobi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"N’Djamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nouakchott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ouagadougou","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"São Tomé","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Tripolis","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Tunis","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Anguilla","id":"America/Anguilla"},{"value":"America/Antigua","name":"Antigua","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaina","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"La Rioja","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Rio Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucuman","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Asunción","id":"America/Asuncion"},{"value":"America/Bahia","name":"Bahia","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahia Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belem","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogotá","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancún","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Cayenne","id":"America/Cayenne"},{"value":"America/Cayman","name":"Kaimaninseln","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Córdoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Costa Rica","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiaba","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Curaçao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominica","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepe","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"El Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Grenada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Guadeloupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Guatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guayaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Guyana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"Havanna","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianapolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Jamaika","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"La Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Los Angeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceio","id":"America/Maceio"},{"value":"America/Managua","name":"Managua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinique","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlan","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Merida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Mexiko-Stadt","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevideo","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"New York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, North Dakota","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, North Dakota","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salem, North Dakota","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panama","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Port-au-Prince","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Port of Spain","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Puerto Rico","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Rio Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarem","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"São Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"Saint-Barthélemy","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"St. John’s","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"St. Kitts","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"St. Lucia","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"St. Thomas","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"St. Vincent","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Thule","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tortola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Casey","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Davis","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Dumont d’Urville","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Macquarie","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Mawson","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"McMurdo","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Palmer","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Rothera","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Syowa","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Troll","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Wostok","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Longyearbyen","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Aden","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Almaty","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Amman","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Anadyr","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Aqtau","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Aktobe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Aşgabat","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Atyrau","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Bagdad","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrain","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Baku","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Bangkok","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Barnaul","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Beirut","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Bischkek","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Brunei Darussalam","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Kalkutta","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Tschita","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Tschoibalsan","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Colombo","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Damaskus","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Dhaka","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Dili","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Dubai","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Duschanbe","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Famagusta","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Gaza","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Hebron","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Hongkong","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Chowd","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Irkutsk","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Jakarta","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Jayapura","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Jerusalem","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Kabul","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Kamtschatka","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Karatschi","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Kathmandu","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Chandyga","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Krasnojarsk","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lumpur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Kuching","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Kuwait","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Macau","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Magadan","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Makassar","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Manila","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Maskat","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nikosia","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Nowokuznetsk","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Nowosibirsk","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Omsk","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Oral","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Phnom Penh","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Pontianak","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Pjöngjang","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Katar","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Qysylorda","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Rangun","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Riad","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Ho-Chi-Minh-Stadt","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Sachalin","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarkand","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Seoul","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Shanghai","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Singapur","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Srednekolymsk","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Taipeh","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Taschkent","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Tiflis","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Teheran","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Thimphu","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tokio","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Tomsk","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ulaanbaatar","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Ürümqi","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ust-Nera","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Vientiane","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Wladiwostok","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Jakutsk","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Jekaterinburg","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Eriwan","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Azoren","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermuda","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Kanaren","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Cabo Verde","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Färöer","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Reyk­ja­vík","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Südgeorgien","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"St. Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Adelaide","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Brisbane","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Broken Hill","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Currie","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Darwin","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Eucla","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Hobart","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Lindeman","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Lord Howe","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Melbourne","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Perth","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Sydney","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Koordinierte Weltzeit","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Amsterdam","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Andorra","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Astrachan","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Athen","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Belgrad","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlin","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Bratislava","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Brüssel","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Bukarest","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budapest","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Büsingen","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Kischinau","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Kopenhagen","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Irische SommerzeitDublin","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Gibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Guernsey","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsinki","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Isle of Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istanbul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kaliningrad","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kiew","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Kirow","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Lissabon","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Ljubljana","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Britische SommerzeitLondon","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Luxemburg","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madrid","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Mariehamn","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Minsk","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Monaco","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Moskau","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Paris","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Podgorica","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Prag","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Rom","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Samara","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"San Marino","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Sarajevo","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Saratow","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Simferopol","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Skopje","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Sofia","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Stockholm","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Tallinn","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Tirana","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Uljanowsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Uschgorod","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Vaduz","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Vatikan","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Wien","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Vilnius","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Wolgograd","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Warschau","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Zagreb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Saporischja","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Zürich","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Chagos","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Weihnachtsinsel","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Cocos","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Komoren","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Kerguelen","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Mahe","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Malediven","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Mauritius","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Réunion","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Apia","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Auckland","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Bougainville","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Chatham","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Osterinsel","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Efate","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Enderbury","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Fakaofo","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Fidschi","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Funafuti","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Galapagos","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Gambier","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Guadalcanal","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Guam","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"Honolulu","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Johnston","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Kiritimati","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Kosrae","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Kwajalein","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Majuro","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Marquesas","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Midway","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Nauru","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Niue","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Norfolk","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Noumea","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Pago Pago","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Palau","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Pitcairn","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Pohnpei","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Port Moresby","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Rarotonga","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Saipan","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Tahiti","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Tarawa","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Tongatapu","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Chuuk","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Wake","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Wallis","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

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
r += "Låt oss <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">inleda diskussionen!</a> Det ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "finns <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ämne";
return r;
},
"other" : function(d){
var r = "";
r += "finns <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ämnen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " och ";
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
})() + "</strong> inlägg";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> inlägg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Besökare behöver mer att läsa och svara på – vi rekommenderar åtminstone ";
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
})() + "</strong> ämne";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ämnen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " och ";
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
})() + "</strong> inlägg";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> inlägg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Enbart personal kan se detta meddelande.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Låt oss <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">inleda diskussionen!</a> Det ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "finns <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ämne";
return r;
},
"other" : function(d){
var r = "";
r += "finns <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ämnen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Besökare behöver mer att läsa och svara på  – vi rekommenderar åtminstone ";
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
})() + "</strong> ämne";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ämnen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Enbart personal kan se detta meddelande.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "Låt oss <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">inleda diskussionen!</a> Det ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "finns <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> inlägg";
return r;
},
"other" : function(d){
var r = "";
r += "finns <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> inlägg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Besökare behöver mer att läsa och svara på – vi rekommenderar minst ";
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
})() + "</strong> inlägg";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> inlägg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Enbart personal kan se detta meddelande.";
return r;
}, "logs_error_rate_notice.reached_hour_MF" : function(d){
var r = "";
r += "<b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["relativeAge"];
r += "</b> - <a href='";
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
})() + " fel/timma";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/timma";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> har uppnått webbplatsinställningarnas gräns som är ";
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
})() + " fel/timma";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/timma";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " fel/minut";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/minut";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> har uppnått webbplatsinställningarnas gräns som är ";
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
})() + " fel/minut";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/minut";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " fel/timma";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/timma";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> har överskridit webbplatsinställningarnas gräns som är ";
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
})() + " fel/timma";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/timma";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " fel/minut";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/minut";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> har överskridit webbplatsinställningarnas gräns som är ";
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
})() + " fel/minut";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " fel/minut";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "Det ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "replyCount";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "finns <b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> svar";
return r;
},
"other" : function(d){
var r = "";
r += "finns <b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> svar";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " med en uppskattad lästid på <b>";
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
})() + " minut";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " minuter";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "Det finns ";
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
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " oläst</a> ";
return r;
},
"other" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " olästa</a> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "och ";
return r;
},
"false" : function(d){
var r = "";
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
})() + " nytt</a> ämne";
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
r += "och ";
return r;
},
"false" : function(d){
var r = "";
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
})() + " nya</a> ämnen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " kvar, eller ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "bläddra bland andra ämnen i ";
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
r += "Du håller på att radera ";
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
})() + "</b> inlägg";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> inlägg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " och ";
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
})() + "</b> ämne";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> ämnen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " från den här användaren, ta bort användarens konto, blockera registreringar från användarens IP-adress <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b>, och lägga till användarens e-postadress <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> till en permanent blockeringslista. Är du säker på att den här användaren verkligen är en skräppostare?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "Detta ämne har ";
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
})() + " svar";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " svar";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "med ett högt förhållande mellan gillningar/inlägg";
return r;
},
"med" : function(d){
var r = "";
r += "med ett mycket högt förhållande mellan gillningar/inlägg";
return r;
},
"high" : function(d){
var r = "";
r += "med ett extremt högt förhållande mellan gillningar/inlägg";
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
r += "Du håller på att radera ";
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
})() + " inlägg";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " inlägg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " och ";
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
})() + " ämne";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " ämnen";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["sv"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Är du säker?";
return r;
}};
MessageFormat.locale.sv = function ( n ) {
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

I18n.translations = {"sv":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Byte","other":"Bytes"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"h:mm a","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"MMM D","full_no_year_no_time":"MMMM Do","long_with_year":"D MMM, YYYY h:mm","long_with_year_no_time":"D MMM, YYYY","full_with_year_no_time":"D MMMM YYYY","long_date_with_year":"D MMM, 'YY LT","long_date_without_year":"D MMM, LT","long_date_with_year_without_time":"D MMM, 'YY","long_date_without_year_with_linebreak":"D MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D MMM, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} sedan","tiny":{"half_a_minute":"\u003c 1 min","less_than_x_seconds":{"one":"\u003c %{count} s","other":"\u003c %{count} s"},"x_seconds":{"one":"%{count} s","other":"%{count} s"},"less_than_x_minutes":{"one":"\u003c %{count} min","other":"\u003c %{count} min"},"x_minutes":{"one":"%{count} min","other":"%{count} min"},"about_x_hours":{"one":"%{count} h","other":"%{count} h"},"x_days":{"one":"%{count} d","other":"%{count} d"},"x_months":{"one":"%{count} mån","other":"%{count} mån"},"about_x_years":{"one":"%{count} å","other":"%{count} å"},"over_x_years":{"one":"\u003e %{count} år","other":"\u003e %{count} år"},"almost_x_years":{"one":"%{count} år","other":"%{count} år"},"date_month":"D MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} min","other":"%{count} min"},"x_hours":{"one":"%{count} timme","other":"%{count} timmar"},"x_days":{"one":"%{count} dag","other":"%{count} dagar"},"date_year":"D MMM, 'YY"},"medium_with_ago":{"x_minutes":{"one":"%{count} min sedan","other":"%{count} minuter sedan"},"x_hours":{"one":"%{count} timme sedan","other":"%{count} timmar sedan"},"x_days":{"one":"%{count} dag sedan","other":"%{count} dagar sedan"},"x_months":{"one":"%{count} månad sedan","other":"%{count} månader sedan"},"x_years":{"one":"%{count} år sedan","other":"%{count} år sedan"}},"later":{"x_days":{"one":"%{count} dag senare","other":"%{count} dagar senare"},"x_months":{"one":"%{count} månad senare","other":"%{count} månader senare"},"x_years":{"one":"%{count} år senare","other":"%{count} år senare"}},"previous_month":"Föregående månad","next_month":"Nästkommande månad","placeholder":"datum"},"share":{"topic_html":"Ämne: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"inlägg #%{postNumber}","close":"stäng","twitter":"Dela på Twitter","facebook":"Dela på Facebook","email":"Skicka via e-post","url":"Kopiera och dela URL"},"action_codes":{"public_topic":"gjorde det här ämnet publikt %{when}","private_topic":"gjorde det här ämnet till ett personligt meddelande %{when}","split_topic":"splitta det här ämnet %{when}","invited_user":"bjöd in %{who} %{when}","invited_group":"bjöd in %{who} %{when}","user_left":"%{who} tog bort sig själva från detta meddelande %{when}","removed_user":"tog bort %{who} %{when}","removed_group":"tog bort %{who} %{when}","autobumped":"automatiskt positionerad %{when}","autoclosed":{"enabled":"stängdes %{when}","disabled":"öppnades %{when}"},"closed":{"enabled":"stängdes %{when}","disabled":"öppnades %{when}"},"archived":{"enabled":"arkiverades %{when}","disabled":"avarkiverades %{when}"},"pinned":{"enabled":"fästes %{when}","disabled":"togs ner %{when}"},"pinned_globally":{"enabled":"globalt fäst %{when}","disabled":"togs ner %{when}"},"visible":{"enabled":"listades %{when}","disabled":"avlistades %{when}"},"banner":{"enabled":"gjorde detta till en banderoll %{when}. Den kommer att visas högst upp på varje sida tills den blir avfärdad av användaren.","disabled":"tog bort denna banderoll %{when}. Den kommer inte längre att visas högst upp på varje sida."},"forwarded":"vidarebefordrade ovanstående e-post"},"topic_admin_menu":"ämnesåtgärder","wizard_required":"Välkommen till din nya Discourse! Låt oss komma igång med hjälp av \u003ca href='%{url}' data-auto-route='true'\u003ekonfigureringsguiden\u003c/a\u003e ✨","emails_are_disabled":"All utgående e-post har blivit globalt inaktiverad av en administratör. Inga e-postaviseringar av något slag kommer att skickas ut.","bootstrap_mode_enabled":{"one":"Du är i bootstrap-läge för att göra lanseringen av din nya webbplats enklare. Alla nya användare kommer att beviljas förtroendenivå 1 och få dagliga sammanfattningar skickade via e-post. Det här stängs automatiskt av när antalet användare når %{count}.","other":"Du är i bootstrap-läge för att göra lanseringen av din nya webbplats enklare. Alla nya användare kommer att beviljas förtroendenivå 1 och få dagliga sammanfattningar skickade via e-post. Det här stängs automatiskt av när antalet användare når %{count}."},"bootstrap_mode_disabled":"Bootstrap-läge stängs av om 24 timmar.","themes":{"default_description":"Standard","broken_theme_alert":"Din sida kanske inte fungerar på grund av att tema/komponent %{theme} innehåller fel. Avaktivera det/den från %{path}."},"s3":{"regions":{"ap_northeast_1":"Asien Stillahavsområdet (Tokyo)","ap_northeast_2":"Asien Stillahavsområdet (Seoul)","ap_south_1":"Asien Stillahavsområdet (Mumbai)","ap_southeast_1":"Asien Stillahavsområdet (Singapore)","ap_southeast_2":"Asien Stillahavsområdet (Sydney)","ca_central_1":"Kanada (Central)","cn_north_1":"Kina (Peking)","cn_northwest_1":"Kina (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"EU (Stockholm)","eu_west_1":"EU (Irland)","eu_west_2":"EU (London)","eu_west_3":"EU (Paris)","sa_east_1":"Sydamerika (São Paulo)","us_east_1":"Östra USA (N. Virginia)","us_east_2":"Östra USA (Ohio)","us_gov_east_1":"AWS GovCloud (Östra USA)","us_gov_west_1":"AWS GovCloud (Västra USA)","us_west_1":"Västra USA (N. Kalifornien)","us_west_2":"Västra USA (Oregon)"}},"clear_input":"Rensa inmatning","edit":"redigera rubrik och kategori för det här ämnet","expand":"Utvidga","not_implemented":"Denna funktion har tyvärr inte implementerats än!","no_value":"Nej","yes_value":"Ja","submit":"Skicka","generic_error":"Tyvärr, ett fel har inträffat.","generic_error_with_reason":"Ett fel inträffade: %{error}","go_ahead":"Gå vidare","sign_up":"Registrera","log_in":"Logga in","age":"Ålder","joined":"Gick med","admin_title":"Admin","show_more":"visa mer","show_help":"alternativ","links":"Länkar","links_lowercase":{"one":"länk","other":"länkar"},"faq":"FAQ","guidelines":"Riktlinjer","privacy_policy":"Integritetspolicy","privacy":"Integritet","tos":"Användarvillkor","rules":"Regler","conduct":"Uppförandekod","mobile_view":"Mobilvy","desktop_view":"Desktop-vy","you":"Du","or":"eller","now":"nyss","read_more":"läs mer","more":"Mer","x_more":{"one":"Ytterligare %{count}","other":"Ytterligare %{count}"},"less":"Mindre","never":"aldrig","every_30_minutes":"var 30:e minut","every_hour":"varje timme","daily":"dagligen","weekly":"veckovis","every_month":"varje månad","every_six_months":"var sjätte månad","max_of_count":"max av %{count}","alternation":"eller","character_count":{"one":"%{count} tecken","other":"%{count} tecken"},"related_messages":{"title":"Relaterade meddelanden","see_all":"Visa \u003ca href=\"%{path}\"\u003ealla meddelanden\u003c/a\u003e från @%{username}..."},"suggested_topics":{"title":"Föreslagna ämnen","pm_title":"Föreslagna meddelanden"},"about":{"simple_title":"Om","title":"Om %{title}","stats":"Statistik för webbplats","our_admins":"Våra administratörer","our_moderators":"Våra moderatorer","moderators":"Moderatorer","stat":{"all_time":"Alla dagar","last_7_days":"Senaste 7","last_30_days":"Senaste 30"},"like_count":"Gillningar","topic_count":"Ämnen","post_count":"Inlägg","user_count":"Användare","active_user_count":"Aktiva användare","contact":"Kontakta oss","contact_info":"Vid brådskande ärenden rörande webbplatsen, kontakta oss på %{contact_info}."},"bookmarked":{"title":"Bokmärke","clear_bookmarks":"Töm bokmärken","help":{"bookmark":"Klicka för att bokmärka första inlägget i ämnet","unbookmark":"Klicka för att radera alla bokmärken i ämnet","unbookmark_with_reminder":"Klicka för att ta bort alla bokmärken samt påminnelser för detta ämne. Du har en påminnelse inställd till %{reminder_at} för detta ämne."}},"bookmarks":{"created":"Du har bokmärkt detta inlägg. %{name}","not_bookmarked":"bokmärk detta inlägg","created_with_reminder":"Du har bokmärkt detta inlägg med en påminnelse %{date}. %{name}","remove":"Ta bort bokmärke","delete":"Radera bokmärke","confirm_delete":"Är du säker på att du vill radera det här bokmärket? Påminnelsen kommer också att raderas.","confirm_clear":"Är du säker på att du vill radera alla dina bokmärken från ämnet?","save":"Spara","no_timezone":"Du har ännu inte valt tidszon, så du kommer inte att kunna spara påminnelser. Ange en \u003ca href=\"%{basePath}/my/preferences/profile\"\u003ei din profil\u003c/a\u003e.","invalid_custom_datetime":"Datumet och tiden du har angivit är ogiltig(t), försök igen.","list_permission_denied":"Du har inte behörighet att visa bokmärken för denna användare.","no_user_bookmarks":"Du har inga bokmärkta inlägg; bokmärken tillåter dig att snabbt hänvisa till ett specifikt inlägg.","auto_delete_preference":{"label":"Radera automatiskt","never":"Aldrig","when_reminder_sent":"När påminnelsen har skickats","on_owner_reply":"Efter att jag svarat på detta ämne"},"search_placeholder":"Sök i bokmärken efter namn, ämnestitel eller postinnehåll","search":"Sök","reminders":{"later_today":"Senare idag","next_business_day":"Nästa vardag","tomorrow":"Imorgon","next_week":"Nästa vecka","post_local_date":"Datum i inlägget","later_this_week":"Senare denna vecka","start_of_next_business_week":"Måndag","start_of_next_business_week_alt":"Nästa måndag","next_month":"Nästa månad","custom":"Anpassa datum och tid","last_custom":"Senaste","none":"Ingen påminnelse nödvändig","today_with_time":"idag kl. %{time}","tomorrow_with_time":"imorgon kl. %{time}","at_time":"den %{date_time}","existing_reminder":"Du har en påminnelse inställd för detta bokmärke som kommer att skickas %{at_date_time}"}},"copy_codeblock":{"copied":"kopierad!"},"drafts":{"resume":"Återuppta","remove":"Ta bort","remove_confirmation":"Är du säker på att du vill ta bort detta utkast?","new_topic":"Nytt utkast för ämne","new_private_message":"Nytt utkast för privat meddelande","topic_reply":"Svar på utkast","abandon":{"confirm":"Du har redan öppnat ett annat utkast för detta ämne. Är du säker på att du vill överge detta?","yes_value":"Ja, överge","no_value":"Nej, behåll"}},"topic_count_latest":{"one":"Visa %{count} nytt eller uppdaterat ämne","other":"Visa %{count} nya eller uppdaterade ämnen"},"topic_count_unread":{"one":"Visa %{count} oläst ämne","other":"Visa %{count} olästa ämnen"},"topic_count_new":{"one":"Visa %{count} nytt ämne","other":"Visa %{count} nya ämnen"},"preview":"förhandsgranska","cancel":"avbryt","deleting":"Raderar...","save":"Spara ändringar","saving":"Sparar...","saved":"Sparat!","upload":"Ladda upp","uploading":"Laddar upp...","uploading_filename":"Laddar upp: %{filename}...","clipboard":"urklipp","uploaded":"Uppladdad!","pasting":"Klistrar in...","enable":"Aktivera","disable":"Inaktivera","continue":"Fortsätt","undo":"Ångra","revert":"Återställ","failed":"Misslyckades","switch_to_anon":"Starta anonymt läge","switch_from_anon":"Avsluta anonymt läge","banner":{"close":"Stäng denna banderoll","edit":"Redigera denna banderoll \u003e\u003e"},"pwa":{"install_banner":"Vill du \u003ca href\u003einstallera %{title} på denna enhet?\u003c/a\u003e"},"choose_topic":{"none_found":"Inga ämnen hittades.","title":{"search":"Sök efter ett ämne","placeholder":"skriv ämnets titel, url eller id här"}},"choose_message":{"none_found":"Inga meddelanden hittades.","title":{"search":"Sök efter ett meddelande","placeholder":"skriv meddelandets titel, url eller id här"}},"review":{"order_by":"Sortera efter","in_reply_to":"som svar till","explain":{"why":"förklara varför detta föremål hamnade i kön","title":"Granskningsvärdering","formula":"Formel","subtotal":"Delsumma","total":"Totalt","min_score_visibility":"Lägsta poäng för att synas","score_to_hide":"Poäng för att dölja inlägg","take_action_bonus":{"name":"agerade","title":"När personal väljer att agera får flaggning en ökad bonus."},"user_accuracy_bonus":{"name":"noggrannhet av användare","title":"Användare vars flaggor historiskt har fått medhåll ges en bonus."},"trust_level_bonus":{"name":"förtroendenivå","title":"Granskade objekt skapade av användare med högre förtroendenivå har en högre poäng."},"type_bonus":{"name":"typ bonus","title":"Vissa granskningsärenden kan tilldelas en bonus av personal för att ge dem en högre prioritet."}},"claim_help":{"optional":"Du kan göra anspråk på detta för att förhindra andra från att granska det.","required":"Du måste göra anspråk innan du kan granska dem.","claimed_by_you":"Du har gjort anspråk på detta och kan nu granska det.","claimed_by_other":"Detta föremål kan enbart granskas av \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"Gör anspråk på ämne"},"unclaim":{"help":"ta bort detta anspråk"},"awaiting_approval":"Inväntar godkännande","delete":"Radera","settings":{"saved":"Sparad","save_changes":"Spara ändringar","title":"Inställningar","priorities":{"title":"Granskningsprioriteter"}},"moderation_history":"Modereringshistorik","view_all":"Visa alla","grouped_by_topic":"Gruppera efter ämne","none":"Det finns inga föremål att granska.","view_pending":"visa avvaktande","topic_has_pending":{"one":"Detta ämne har \u003cb\u003e%{count}\u003c/b\u003e inlägg som inväntar godkännande","other":"Detta ämne har \u003cb\u003e%{count}\u003c/b\u003e inlägg som inväntar godkännande"},"title":"Granska","topic":"Ämne:","filtered_topic":"Du har filtrerat för granskning av innehåll i ett enskilt ämne.","filtered_user":"Användare","filtered_reviewed_by":"Granskade av","show_all_topics":"visa alla ämnen","deleted_post":"(inlägg raderat)","deleted_user":"(användare raderad)","user":{"bio":"Bio","website":"Webbplats","username":"Användarnamn","email":"E-post","name":"Namn","fields":"Fält","reject_reason":"Anledning"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (av den senaste flaggan)","other":"%{agreed}, %{disagreed}, %{ignored} (av de senaste %{count} flaggorna)"},"agreed":{"one":"%{count} % instämmer","other":"%{count} % instämmer"},"disagreed":{"one":"%{count} % bestrider","other":"%{count} % bestrider"},"ignored":{"one":"%{count} % ignorerar","other":"%{count} % ignorerar"}},"topics":{"topic":"Ämne","reviewable_count":"Räkna","reported_by":"Rapporterad av","deleted":"[Ämne raderat]","original":"(original ämne)","details":"detaljer","unique_users":{"one":"%{count} användare","other":"%{count} användare"}},"replies":{"one":"%{count} svar","other":"%{count} svar"},"edit":"Redigera","save":"Spara","cancel":"Avbryt","new_topic":"Godkännande av detta föremål skapar ett nytt ämne","filters":{"all_categories":"(alla kategorier)","type":{"title":"Typ","all":"(alla typer)"},"minimum_score":"Lägsta poäng:","refresh":"Uppdatera","status":"Status","category":"Kategori","orders":{"score":"Poäng","score_asc":"Poäng (omvänt)","created_at":"Skapad den","created_at_asc":"Skapad den (omvänt)"},"priority":{"title":"Lägsta prioritet","low":"(valfri)","medium":"Medium","high":"Hög"}},"conversation":{"view_full":"visa hela konversationen"},"scores":{"about":"Denna poäng beräknas på förtroendenivån för de som rapporterar, deras träffsäkerhet på deras tidigare flaggor, samt på prioriteringen av föremål som rapporteras.","score":"Poäng","date":"Datum","type":"Typ","status":"Status","submitted_by":"Inskickade av","reviewed_by":"Granskade av"},"statuses":{"pending":{"title":"Väntar"},"approved":{"title":"Godkända"},"rejected":{"title":"Avvisade"},"ignored":{"title":"Ignorerade"},"deleted":{"title":"Raderade"},"reviewed":{"title":"(alla granskade)"},"all":{"title":"(allting)"}},"types":{"reviewable_flagged_post":{"title":"Flaggat inlägg","flagged_by":"Flaggat av"},"reviewable_queued_topic":{"title":"Köat ämne"},"reviewable_queued_post":{"title":"Köat inlägg"},"reviewable_user":{"title":"Användare"}},"approval":{"title":"Inlägget behöver godkännande","description":"Vi har mottagit ditt nya inlägg men det måste godkännas av en moderator innan det kan visas. Ha tålamod.","pending_posts":{"one":"Du har \u003cstrong\u003e%{count}\u003c/strong\u003e inlägg som väntar.","other":"Du har \u003cstrong\u003e%{count}\u003c/strong\u003e inlägg som väntar."},"ok":"OK"},"example_username":"användarnamn","reject_reason":{"title":"Varför avvisar du den här användaren?","send_email":"Skicka avvisningsmeddelande"}},"relative_time_picker":{"minutes":{"one":"minut","other":"minuter"},"hours":{"one":"timme","other":"timmar"},"days":{"one":"dag","other":"dagar"},"months":{"one":"månad","other":"månader"},"years":{"one":"år","other":"år"},"relative":"Relativ"},"time_shortcut":{"later_today":"Senare idag","next_business_day":"Nästa vardag","tomorrow":"Imorgon","next_week":"Nästa vecka","post_local_date":"Datum i inlägget","later_this_week":"Senare denna vecka","start_of_next_business_week":"Måndag","start_of_next_business_week_alt":"Nästa måndag","next_month":"Nästa månad","custom":"Anpassa datum och tid","relative":"Relativ tid","none":"Ingen behövs","last_custom":"Senaste"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e skrev \u003ca href='%{topicUrl}'\u003eämnet\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e skrev \u003ca href='%{topicUrl}'\u003eämnet\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e svarade på \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e svarade på \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e svarade på \u003ca href='%{topicUrl}'\u003eämnet\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e svarade på \u003ca href='%{topicUrl}'\u003eämnet\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e nämnde \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e nämnde \u003ca href='%{user2Url}'\u003edig\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eDu\u003c/a\u003e nämnde \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Publicerat av \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Publicerat av \u003ca href='%{userUrl}'\u003edig\u003c/a\u003e","sent_by_user":"Skickat av \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Skickat av \u003ca href='%{userUrl}'\u003edig\u003c/a\u003e"},"directory":{"username":"Användarnamn","filter_name":"Filtrera efter användarnamn","title":"Användare","likes_given":"Givna","likes_received":"Mottagna","topics_entered":"Visade","topics_entered_long":"Visade ämnen","time_read":"Lästid","topic_count":"Ämnen","topic_count_long":"Ämnen skapade","post_count":"Svar","post_count_long":"Svar publicerade","no_results":"Inga resultat hittades.","days_visited":"Besök","days_visited_long":"Dagar besökta","posts_read":"Lästa","posts_read_long":"Lästa inlägg","last_updated":"Senast uppdaterad:","total_rows":{"one":"%{count} användare","other":"%{count} användare"}},"group_histories":{"actions":{"change_group_setting":"Ändra gruppinställningar","add_user_to_group":"Lägg till användare","remove_user_from_group":"Ta bort användare","make_user_group_owner":"Gör till ägare","remove_user_as_group_owner":"Återkalla ägare"}},"groups":{"member_added":"Tillagd","member_requested":"Begärd vid","add_members":{"title":"Lägg till medlemmar till %{group_name}","description":"Du kan även klistra in i en kommaseparerad lista.","usernames":"Ange användarnamn eller e-postadresser","input_placeholder":"Användarnamn eller e-post","notify_users":"Meddela användare"},"requests":{"title":"Ansökningar","reason":"Anledning","accept":"Godkänn","accepted":"godkänd","deny":"Neka","denied":"nekad","undone":"förfrågan återkallad","handle":"hantera begäran om medlemskap"},"manage":{"title":"Hantera","name":"Namn","full_name":"Fullständigt namn","add_members":"Lägg till medlemmar","delete_member_confirm":"Vill du ta bort '%{username}' från gruppen '%{group}'?","profile":{"title":"Profil"},"interaction":{"title":"Interaktion","posting":"Publicera inlägg","notification":"Notifikation"},"email":{"title":"E-post","status":"Synkroniserat %{old_emails}/ %{total_emails} e-post genom IMAP.","credentials":{"title":"Kontouppgifter","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"Använd SSL för SMTP","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"Använd SSL för IMAP","username":"Användarnamn","password":"Lösenord"},"settings":{"title":"Inställningar","allow_unknown_sender_topic_replies":"Tillåt okända avsändares ämnesvar.","allow_unknown_sender_topic_replies_hint":"Tillåter okända avsändare att svara på gruppämnen. Om detta inte är aktiverat kommer svar från e-postadresser som inte redan ingår i IMAP-e-posttråden eller inbjudna till ämnet att skapa ett nytt ämne."},"mailboxes":{"synchronized":"Synkroniserad brevlåda","none_found":"Inga brevlådor hittades för detta e-postkonto.","disabled":"avstängd"}},"membership":{"title":"Medlemskap","access":"Tillgång"},"categories":{"title":"Kategorier","long_title":"Standardaviseringar för kategori","description":"När användare läggs till i denna grupp kommer inställningarna för kategoriavisering att ställas in till dessa standardvärden. Efteråt kan de ändra dem.","watched_categories_instructions":"Bevaka automatiskt alla ämnen i dessa kategorier. Gruppmedlemmar kommer att meddelas om alla nya inlägg och ämnen, och antalet nya inlägg kommer också att visas bredvid ämnet.","tracked_categories_instructions":"Följ automatiskt alla ämnen i dessa kategorier. En räknare över nya inlägg kommer att visas bredvid ämnet.","watching_first_post_categories_instructions":"Användarna kommer att meddelas om det första inlägget i varje nytt ämne för dessa kategorier.","regular_categories_instructions":"Om dessa kategorier är tystade kommer de inte att tystas för gruppmedlemmar. Användare kommer att meddelas om de nämns eller någon svarar dem.","muted_categories_instructions":"Användare kommer inte att meddelas något om nya ämnen i dessa kategorier, och de kommer inte att visas under kategorier eller de senaste ämnessidorna."},"tags":{"title":"Taggar","long_title":"Standardaviseringar för taggar","description":"När användare läggs till i denna grupp kommer inställningarna för taggavisering att ställas in på dessa standardvärden. Efteråt kan de ändra dem.","watched_tags_instructions":"Bevaka automatiskt alla ämnen med dessa taggar. Gruppmedlemmar kommer att meddelas om alla nya inlägg och ämnen, och antalet nya inlägg kommer också att visas bredvid ämnet.","tracked_tags_instructions":"Följ automatiskt alla ämnen med dessa taggar. En räknare över nya inlägg kommer att visas bredvid ämnet.","watching_first_post_tags_instructions":"Användarna kommer att meddelas om det första inlägget i varje nytt ämne med dessa taggar.","regular_tags_instructions":"Om dessa taggar är tystade kommer de inte att tystas för gruppmedlemmar. Användare kommer att meddelas om de nämns eller någon svarar till dem.","muted_tags_instructions":"Användare kommer inte att meddelas något om nya ämnen med dessa taggar, och de kommer inte att visas i senaste."},"logs":{"title":"Loggar","when":"När","action":"Åtgärd","acting_user":"Agerande användare","target_user":"Specifik användare","subject":"Ämne","details":"Detaljer","from":"Från","to":"Till"}},"permissions":{"title":"Behörigheter","none":"Det finns inga kategorier kopplade till denna grupp.","description":"Medlemmar i denna grupp kan komma åt dessa kategorier"},"public_admission":"Tillåt användare att fritt gå med i grupp (Kräver offentligt synlig grupp)","public_exit":"Tillåt användare att fritt lämna grupp","empty":{"posts":"Det är inga kommentarer från medlemmar i denna grupp","members":"Det finns inga medlemmar i denna grupp","requests":"Det finns inga medlemsansökningar för denna grupp.","mentions":"Det finns inga omnämnanden av denna grupp","messages":"Det finns inga meddelanden för denna grupp.","topics":"Det finns inga trådar från medlemmar i denna grupp","logs":"Det finns inga loggar för denna grupp"},"add":"Lägg till","join":"Gå med","leave":"Lämna","request":"Förfrågning","message":"Nytt meddelande","confirm_leave":"Är du säker på att du vill lämna den här gruppen?","allow_membership_requests":"Tillåt användare att sända medlemskapsförfrågan till gruppägare (Kräver offentligt synlig grupp)","membership_request_template":"Anpassa mallen som visas när användare skickar en medlemsansökan","membership_request":{"submit":"Skicka ansökan","title":"Ansökan att gå med i @%{group_name}","reason":"Låt gruppägarna få veta varför du hör hemma i denna grupp"},"membership":"Medlemskap","name":"Namn","group_name":"Gruppnamn","user_count":"Användare","bio":"Om grupp","selector_placeholder":"ange användarnamn","owner":"ägare","index":{"title":"Grupper","all":"Alla grupper","empty":"Det finns inga synliga grupper","filter":"Filtrera efter grupptyp","owner_groups":"Grupper jag äger","close_groups":"Stängda grupper","automatic_groups":"Automatiska grupper","automatic":"Automatisk","closed":"Stängd","public":"Publikt","private":"Privat","public_groups":"Offentliga grupper","automatic_group":"Automatisk grupp","close_group":"Stäng grupp","my_groups":"Mina grupper","group_type":"Grupptyper","is_group_user":"Medlem","is_group_owner":"Ägare"},"title":{"one":"Grupp","other":"Grupper"},"activity":"Aktivitet","members":{"title":"Medlemmar","filter_placeholder_admin":"användarnamn eller lösenord","filter_placeholder":"användarnamn","remove_member":"Ta bort medlem","remove_member_description":"Ta bort \u003cb\u003e%{username}\u003c/b\u003e från denna grupp","make_owner":"Gör till ägare","make_owner_description":"Gör \u003cb\u003e%{username}\u003c/b\u003e till ägare av denna grupp","remove_owner":"Ta bort som ägare","remove_owner_description":"Ta bort \u003cb\u003e%{username}\u003c/b\u003e som ägare av denna grupp","make_primary":"Gör till primär","make_primary_description":"Gör denna till primär grupp för \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Ta bort som primär","remove_primary_description":"Ta bort denna som primär grupp för \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Ta bort medlemmar","remove_members_description":"Ta bort markerade användare från denna grupp","make_owners":"Gör till ägare","make_owners_description":"Gör markerade användare till ägare av denna grupp","remove_owners":"Ta bort ägare","remove_owners_description":"Ta bort markerade användare som ägare till denna grupp","make_all_primary":"Gör alla till primära","make_all_primary_description":"Gör denna till primär grupp för alla markerade användare","remove_all_primary":"Ta bort som primär","remove_all_primary_description":"Ta bort denna grupp som primär","owner":"Ägare","primary":"Primär","forbidden":"Du är inte tillåten att se medlemmarna."},"topics":"Ämnen","posts":"Inlägg","mentions":"Omnämnanden","messages":"Meddelanden","notification_level":"Standardaviseringsnivå för gruppmeddelanden","alias_levels":{"mentionable":"Vem kan @nämna denna grupp?","messageable":"Vem kan meddela denna grupp?","nobody":"Ingen","only_admins":"Bara administratörer","mods_and_admins":"Bara moderatorer och administratörer","members_mods_and_admins":"Bara gruppmedlemmar, moderatorer och administratörer","owners_mods_and_admins":"Bara gruppägare, moderatorer och administratörer","everyone":"Alla"},"notifications":{"watching":{"title":"Bevakar","description":"Du kommer att aviseras om varje nytt inlägg i varje meddelande, och en räknare med antalet nya svar kommer att visas."},"watching_first_post":{"title":"Bevakar första inlägget","description":"Du kommer att aviseras om samtliga nya meddelanden i denna grupp men inte svaren på dessa meddelanden."},"tracking":{"title":"Följer","description":"Du kommer att aviseras om någon nämner ditt @namn eller svarar på ditt inlägg, och en räknare med antalet nya svar kommer att visas."},"regular":{"title":"Normal","description":"Du kommer att aviseras om någon nämner ditt @namn eller svarar dig."},"muted":{"title":"Tystad","description":"Du kommer inte att aviseras om någonting för meddelanden i denna grupp. "}},"flair_url":"Avatar Flair Bild","flair_upload_description":"Använd fyrkantiga bilder som är minst 20px gånger 20px.","flair_bg_color":"Avatar Flair Bakgrundsfärg","flair_bg_color_placeholder":"(Valfritt) Hex-färgvärde","flair_color":"En Avatar som ändrar färg beroende på ljuset","flair_color_placeholder":"(Valfritt) Hex-färgvärde","flair_preview_icon":"Förhandsvisa ikon","flair_preview_image":"Förhandsvisa bild","flair_type":{"icon":"Välj en ikon","image":"Infoga bild"}},"user_action_groups":{"1":"Gillningar givna","2":"Gillningar mottagna","3":"Bokmärken","4":"Ämnen","5":"Svar","6":"Svar","7":"Omnämnanden","9":"Citat","11":"Redigeringar","12":"Skickade föremål","13":"Inkorg","14":"Väntar","15":"Utkast"},"categories":{"all":"alla kategorier","all_subcategories":"alla","no_subcategory":"ingen","category":"Kategori","category_list":"Visa kategori-lista","reorder":{"title":"Sortera kategorier","title_long":"Sortera kategorilistan","save":"Spara sorteringsordning","apply_all":"Tillämpa","position":"Position"},"posts":"Inlägg","topics":"Ämnen","latest":"Senaste","toggle_ordering":"slå av/på sorteringskontroll","subcategories":"Underkategorier","muted":"Tystade kategorier","topic_sentence":{"one":"%{count} ämne","other":"%{count} ämnen"},"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"vecka","month":"månad"},"topic_stat_all_time":{"one":"%{number} totalt","other":"%{number} totalt"},"topic_stat_sentence_week":{"one":"%{count} nytt ämne under senaste veckan.","other":"%{count} nya ämnen under senaste veckan."},"topic_stat_sentence_month":{"one":"%{count} nytt ämne under senaste månaden.","other":"%{count} nya ämnen under senaste månaden."},"n_more":"Kategorier (%{count} till)..."},"ip_lookup":{"title":"Kolla upp IP-adress","hostname":"Värdnamn","location":"Plats","location_not_found":"(okänd)","organisation":"Organisation","phone":"Telefon","other_accounts":"Andra konton med samma IP-adress","delete_other_accounts":"Ta bort %{count}","username":"användarnamn","trust_level":"TL","read_time":"lästid","topics_entered":"besökta ämnen","post_count":"# inlägg","confirm_delete_other_accounts":"Är du säker på att du vill ta bort dessa här konton?","powered_by":"använd \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"kopierad"},"user_fields":{"none":"(välj ett alternativ)","required":"Ange ett värde för \"%{name}\""},"user":{"said":"%{username}:","profile":"Profil","mute":"Tysta","edit":"Redigera inställningar","download_archive":{"button_text":"Ladda ner alla","confirm":"Är du säker på att du vill ladda ner dina inlägg?","success":"Nedladdning påbörjad, du kommer att aviseras via meddelande när processen är klar.","rate_limit_error":"Inlägg kan laddas ner en gång per dag, försök igen imorgon."},"new_private_message":"Nytt meddelande","private_message":"Meddelande","private_messages":"Meddelanden","user_notifications":{"filters":{"filter_by":"Filtrera efter","all":"Alla","read":"Lästa","unread":"Olästa"},"ignore_duration_title":"Ignorera användare","ignore_duration_username":"Användarnamn","ignore_duration_when":"Varaktighet:","ignore_duration_save":"Ignorera","ignore_duration_note":"Notera att alla ignoreringar automatiskt tas bort när ignoreringens varaktighet löper ut.","ignore_duration_time_frame_required":"Välj en tidsram","ignore_no_users":"Du har inga ignorerade användare.","ignore_option":"Ignorerade","ignore_option_title":"Du kommer inte att få aviseringar om denna användare och alla ämnen och svar kommer att döljas.","add_ignored_user":"Lägg till...","mute_option":"Tystad","mute_option_title":"Du kommer inte att få några aviseringar från denna användare.","normal_option":"Normal","normal_option_title":"Du kommer att aviseras om denna användare svarar dig, citerar dig eller nämner dig."},"notification_schedule":{"title":"Aviseringsschema","label":"Aktivera anpassat aviseringsschema","tip":"Utanför dessa timmar kommer du automatiskt att placeras i \"stör ej\".","midnight":"Midnatt","none":"Ingen","monday":"Måndag","tuesday":"Tisdag","wednesday":"Onsdag","thursday":"Torsdag","friday":"Fredag","saturday":"Lördag","sunday":"Söndag","to":"till"},"activity_stream":"Aktivitet","read":"Läs","read_help":"Nyligen lästa ämnen","preferences":"Inställningar","feature_topic_on_profile":{"open_search":"Välj ett nytt ämne","title":"Välj ett ämne","search_label":"Sök efter ämne genom titel","save":"Spara","clear":{"title":"Rensa","warning":"Är du säker på att du vill rensa ditt utvalda ämne?"}},"use_current_timezone":"Använd nuvarande tidszon","profile_hidden":"Den här användarens offentliga profil är dold.","expand_profile":"Utvidga","collapse_profile":"Förminska","bookmarks":"Bokmärken","bio":"Om mig","timezone":"Tidszon","invited_by":"Inbjuden av","trust_level":"Förtroendenivå","notifications":"Aviseringar","statistics":"Statistik","desktop_notifications":{"label":"Realtidsaviseringar","not_supported":"Aviseringar stöds tyvärr inte i den här webbläsaren.","perm_default":"Slå på aviseringar","perm_denied_btn":"Behörighet saknas","perm_denied_expl":"Du nekade tillåtelse för aviseringar. Tillåt aviseringar via din webbläsares inställningar.","disable":"Inaktivera aviseringar","enable":"Aktivera aviseringar","each_browser_note":"Obs! Du måste ändra den här inställningen i varje webbläsare du använder. Alla meddelanden kommer att inaktiveras när du är i ”stör ej”, oavsett denna inställning.","consent_prompt":"Vill du ha realtidsaviseringar när personer svarar på dina inlägg?"},"dismiss":"Avfärda","dismiss_notifications":"Avfärda alla","dismiss_notifications_tooltip":"Markera alla olästa aviseringar som lästa","first_notification":"Du har fått din första avisering! Markera den för att börja.","dynamic_favicon":"Visa räknare i webbläsarens ikon","skip_new_user_tips":{"description":"Hoppa över nybörjartips och utmärkelser för ny användare","not_first_time":"Är det inte din första gång?","skip_link":"Hoppa över dessa tips"},"theme_default_on_all_devices":"Gör detta till standardtema för alla mina enheter","color_scheme_default_on_all_devices":"Ange standardfärgschema(n) för alla mina enheter","color_scheme":"Färgschema","color_schemes":{"default_description":"Temat Standard","disable_dark_scheme":"Samma som vanlig","dark_instructions":"Du kan förhandsgranska färgschemat för mörkt läge genom att växla dina enheters mörka läge.","undo":"Återställ","regular":"Vanlig","dark":"Mörkt läge","default_dark_scheme":"(standard för webbplatsen)"},"dark_mode":"Mörkt läge","dark_mode_enable":"Aktivera automatiskt färgschema för mörkt läge","text_size_default_on_all_devices":"Gör detta till standardstorlek för text på alla mina enheter","allow_private_messages":"Tillåt andra användare att skicka mig personliga meddelanden","external_links_in_new_tab":"Öppna alla externa länkar i en ny flik","enable_quoting":"Aktivera citatsvar för markerad text","enable_defer":"Aktivera fördröjning för att markera ämnen som lästa","change":"ändra","featured_topic":"Utvalt ämne","moderator":"%{user} är en moderator","admin":"%{user} är en administrator","moderator_tooltip":"Den här användaren är moderator","admin_tooltip":"Den här användaren är administrator","silenced_tooltip":"Denna användare är tystad.","suspended_notice":"Den här användaren är avstängd till %{date}.","suspended_permanently":"Denna användare är avstängd.","suspended_reason":"Anledning: ","github_profile":"GitHub","email_activity_summary":"Aktivitetssammanfattning","mailing_list_mode":{"label":"Utskicksläge","enabled":"Aktivera mottagning av e-post för varje nytt inlägg","instructions":"Den här inställningen åsidosätter aktivitetssammanfattningen.\u003cbr /\u003eTystade ämnen och kategorier omfattas inte i dessa e-postmeddelanden.\n","individual":"Skicka ett e-postmeddelande för varje nytt inlägg.","individual_no_echo":"Jag vill få e-post när nya poster publiceras","many_per_day":"Skicka ett e-postmeddelande för varje nytt inlägg (ungefär %{dailyEmailEstimate} per dag)","few_per_day":"Skicka ett e-postmeddelande för varje nytt inlägg (ungefär 2 per dag)","warning":"Funktion för e-postlista aktiverad. Inställningar för e-post-avisering är åsidosatta."},"tag_settings":"Taggar","watched_tags":"Bevakade","watched_tags_instructions":"Du kommer automatiskt att bevaka alla ämnen med de här taggarna. Du blir aviserad om alla nya inlägg och ämnen, och en räknare över antalet nya inlägg visas bredvid ämnet.","tracked_tags":"Följda","tracked_tags_instructions":"Du kommer automatiskt följa alla ämnen med de här taggarna. Antalet nya inlägg visas bredvid ämnet.","muted_tags":"Tystad","muted_tags_instructions":"Du kommer inte att få aviseringar om nya ämnen som har de här taggarna, och de kommer inte att visas bland dina olästa ämnen.","watched_categories":"Bevakade","watched_categories_instructions":"Du kommer automatiskt att bevaka alla ämnen i de här kategorierna. Du blir aviserad om alla nya inlägg och ämnen, och en räknare över antalet nya inlägg visas bredvid ämnet.","tracked_categories":"Följd","tracked_categories_instructions":"Du kommer automatiskt följa alla ämnen i de här kategorierna. En räknare över nya inlägg kommer att visas bredvid ämnen.","watched_first_post_categories":"Bevakar första inlägget","watched_first_post_categories_instructions":"Du kommer att bli aviserad om första inlägget i varje nytt ämne i den här kategorin.","watched_first_post_tags":"Bevakar första inlägget","watched_first_post_tags_instructions":"Du kommer att bli aviserad om första inlägget i varje nytt ämne med dessa taggar.","muted_categories":"Tystad","muted_categories_instructions":"Du kommer inte att aviseras om någonting gällande nya ämnen i dessa kategorier, och de kommer inte dyka upp på kategorier eller senaste sidorna.","muted_categories_instructions_dont_hide":"Du kommer inte att aviseras om någonting gällande nya ämnen i dessa kategorier.","regular_categories":"Regelbundna","regular_categories_instructions":"Du kommer att se dessa kategorier i ämneslistorna “Senaste” och “Topp”.","no_category_access":"Som moderator har du begränsat tillträde till kategorier, spara är avstängt.","delete_account":"Radera mitt konto","delete_account_confirm":"Är du säker på att du vill ta bort ditt konto permanent? Denna åtgärd kan inte ångras!","deleted_yourself":"Ditt konto har tagits bort.","delete_yourself_not_allowed":"Kontakta någon ur personalen om du önskar att ditt konto ska raderas.","unread_message_count":"Meddelanden","admin_delete":"Radera","users":"Användare","muted_users":"Tystat","muted_users_instructions":"Undanta alla notiser och PM från dessa användare.","allowed_pm_users":"Tillåten","allowed_pm_users_instructions":"Tillåt endast PM från dessa användare.","allow_private_messages_from_specific_users":"Låt bara specifika användare skicka mig personliga meddelanden","ignored_users":"Ignorerade","ignored_users_instructions":"Undanta alla inlägg, notiser och PM från dessa användare.","tracked_topics_link":"Visa","automatically_unpin_topics":"Ta automatiskt ner ämnen när jag når botten.","apps":"Appar","revoke_access":"Återkalla åtkomst","undo_revoke_access":"Ångra återkallelse av åtkomst","api_approved":"Godkänd:","api_last_used_at":"Senast använd kl.:","theme":"Tema","save_to_change_theme":"Tema kommer att uppdateras efter att du klickat på \"%{save_text}\"","home":"Standardhemsida","staged":"Arrangerad","staff_counters":{"flags_given":"hjälpsamma flaggor","flagged_posts":"flaggade inlägg","deleted_posts":"raderade inlägg","suspensions":"avstängningar","warnings_received":"varningar","rejected_posts":"avvisade inlägg"},"messages":{"all":"Alla","inbox":"Inkorg","sent":"Skickat","archive":"Arkiv","groups":"Mina grupper","bulk_select":"Välj meddelanden","move_to_inbox":"Flytta till inkorg","move_to_archive":"Arkiv","failed_to_move":"Misslyckades med att flytta de markerade meddelandena (kanske ligger ditt nätverk nere)","select_all":"Markera alla","tags":"Taggar"},"preferences_nav":{"account":"Konto","security":"Säkerhet","profile":"Profil","emails":"E-post","notifications":"Aviseringar","categories":"Kategorier","users":"Användare","tags":"Taggar","interface":"Gränssnitt","apps":"Appar"},"change_password":{"success":"(e-post skickat)","in_progress":"(skickar e-post)","error":"(fel)","emoji":"lås emoji","action":"Skicka e-post för att återställa lösenord","set_password":"Ange lösenord","choose_new":"Välj ett nytt lösenord","choose":"Välj ett lösenord"},"second_factor_backup":{"title":"Tvåfaktorsreservkoder","regenerate":"Generera ny","disable":"Inaktivera","enable":"Aktivera","enable_long":"Aktivera reservkoder","manage":{"one":"Hantera reservkoder. Du har \u003cstrong\u003e%{count}\u003c/strong\u003e reservkod kvar.","other":"Hantera reservkoder. Du har \u003cstrong\u003e%{count}\u003c/strong\u003e reservkoder kvar."},"copy_to_clipboard":"Kopiera till urklipp","copy_to_clipboard_error":"Fel vid kopiering av data till urklipp","copied_to_clipboard":"Kopierad till urklipp","download_backup_codes":"Ladda ner reservkoder","remaining_codes":{"one":"Du har \u003cstrong\u003e%{count}\u003c/strong\u003e reservkod kvar.","other":"Du har \u003cstrong\u003e%{count}\u003c/strong\u003e reservkoder kvar."},"use":"Använd en reservkod","enable_prerequisites":"Du måste aktivera en primär tvåfaktorsmetod innan du skapar reservkoder.","codes":{"title":"Reservkoder skapade","description":"Var och en av dessa reservkoder kan enbart användas en gång. Förvara dem någonstans säkert men tillgängligt."}},"second_factor":{"title":"Tvåfaktorsautentisering","enable":"Hantera tvåfaktorsautentisering","disable_all":"Inaktivera alla","forgot_password":"Glömt lösenordet?","confirm_password_description":"Bekräfta lösenordet för att fortsätta","name":"Namn","label":"Kod","rate_limit":"Vänta innan du provar en annan autentiseringskod.","enable_description":"Skanna denna QR-kod i en app som stöds (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) och ange din autentiseringskod.\n","disable_description":"Ange din autentiseringskod från din app","show_key_description":"Ange manuellt","short_description":"Skydda ditt konto med engångssäkerhetskoder.\n","extended_description":"Tvåfaktorsautentisering lägger till extra säkerhet till ditt konto genom att begära ett engångsbevis utöver ditt lösenord.\nBevis kan skapas på \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e- och \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e-enheter.\n","oauth_enabled_warning":"Notera att inloggning genom sociala medier inaktiveras när tvåfaktorsautentisering har aktiverats för ditt konto.","use":"Använd autentiseringsappen","enforced_notice":"Du måste aktivera tvåfaktorsautentisering innan du kan besöka denna sida.","disable":"Inaktivera","disable_confirm":"Är du säker på att du vill inaktivera alla tvåfaktorsmetoder?","save":"Spara","edit":"Redigera","edit_title":"Redigera autentisering","edit_description":"Autentiseringsnamn","enable_security_key_description":"När du har din \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003esäkerhetsnyckel för hårdvara\u003c/a\u003e till hands, tryck på registrera-knappen nedan.\n","totp":{"title":"Bevisbaserad autentisering","add":"Lägg till autentisering","default_name":"Min autentisering","name_and_code_required_error":"Du måste ange ett namn samt koden från din app för autentisering."},"security_key":{"register":"Registrera","title":"Säkerhetsnycklar","add":"Lägg till säkerhetsnyckel","default_name":"Huvudsäkerhetsnyckel","not_allowed_error":"Registreringsprocessen för säkerhetsnyckel dröjde antingen för länge eller avbröts.","already_added_error":"Du har redan registrerat denna säkerhetsnyckel.\nDu behöver inte registrera den igen.","edit":"Ändra säkerhetsnyckel","save":"Spara","edit_description":"Namn på säkerhetsnyckel","name_required_error":"Du måste ge din säkerhetsnyckel ett namn."}},"change_about":{"title":"Ändra Om mig","error":"Ett fel inträffade vid ändringen av det här värdet."},"change_username":{"title":"Byt användarnamn","confirm":"Är du absolut säker på att du vill ändra ditt användarnamn?","taken":"Tyvärr, det användarnamnet är taget.","invalid":"Det användarnamnet är ogiltigt. Det får bara innehålla siffror och bokstäver"},"add_email":{"title":"Lägg till e-post","add":"lägg till"},"change_email":{"title":"Byt e-post","taken":"Tyvärr är den e-postadressen inte tillgänglig.","error":"Det uppstod ett problem under bytet av din e-postadress. Kanske används den redan?","success":"Vi har skickat e-post till den adressen. Var god följ bekräftelseinstruktionerna.","success_via_admin":"Vi har skickat e-post till den adressen. Var god följ bekräftelseinstruktionerna.","success_staff":"Vi har skickat e-post till din nuvarande adress. Vänligen följ instruktionerna för konfirmering."},"change_avatar":{"title":"Ändra din profilbild","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, baserat på","gravatar_title":"Ändra din avatar på %{gravatarName}s webbsida","gravatar_failed":"Vi kunde inte hitta en %{gravatarName} för den e-postadressen.","refresh_gravatar_title":"Förnya din %{gravatarName}","letter_based":"Profilbild tilldelad av systemet","uploaded_avatar":"Anpassad bild","uploaded_avatar_empty":"Lägg till en anpassad bild","upload_title":"Ladda upp din bild","image_is_not_a_square":"Varning: vi beskar din bild; bredden och höjden var inte lika stora."},"change_profile_background":{"title":"Profilrubrik","instructions":"Profilrubriken kommer att centreras, samt ha en standardbredd på 1110px."},"change_card_background":{"title":"Användarkortets bakgrund","instructions":"Bakgrundsbilder kommer att vara centrerade och ha en standardbredd på 590 px."},"change_featured_topic":{"title":"Utvalt ämne","instructions":"En länk till detta ämne kommer att finnas från ditt användarkort, samt profil."},"email":{"title":"E-post","primary":"Primär e-postadress","secondary":"Sekundär e-postadress","primary_label":"primär","unconfirmed_label":"obekräftad","resend_label":"skicka bekräftelse-e-post igen","resending_label":"skickar...","resent_label":"e-post skickat","update_email":"Byt e-postadress","set_primary":"Ange primär e-postadress","destroy":"Ta bort e-postadress","add_email":"Lägg till alternativ e-postadress","auth_override_instructions":"E-postadressen kan uppdateras från autentiseringsleverantören.","no_secondary":"Inga sekundära e-postadresser","instructions":"Visas aldrig offentligt.","admin_note":"Obs! En administratörsanvändare som ändrar annan icke-administratörsanvändares e-postadress anger att användaren har förlorat tillgången till sin ursprungliga adress, så ett återställnings-e-postmeddelande kommer att skickas till den nya adressen. Inget ändras förrän användaren har slutfört lösenordsåterställningsprocessen.","ok":"Vi skickar e-post till dig för bekräftelse","required":"Vi ber dig ange en e-postadress","invalid":"Vi ber dig ange en giltig e-postadress","authenticated":"Din e-postadress har blivit verifierad av %{provider}","invite_auth_email_invalid":"Ditt inbjudningsmeddelande matchar inte den e-postadress som autentiserats av %{provider}","frequency_immediately":"Vi kommer att skicka e-post till dig omedelbart om du inte har läst det som vi skickar e-post till dig om.","frequency":{"one":"Vi skickar bara e-post om du inte synts till den senaste minuten.","other":"Vi skickar bara e-post om du inte synts till de senaste %{count} minuterna."}},"associated_accounts":{"title":"Kopplade konton","connect":"Koppla","revoke":"Återkalla","cancel":"Avbryt","not_connected":"(inte kopplade)","confirm_modal_title":"Koppla %{provider}-konto","confirm_description":{"account_specific":"Ditt %{provider}-konto '%{account_description}' kommer att användas för autentisering.","generic":"Ditt %{provider}-konto kommer att användas för autentisering."}},"name":{"title":"Namn","instructions":"ditt fullständiga namn (valfritt)","instructions_required":"Ditt fullständiga namn","required":"Ange ett namn","too_short":"Ditt namn är för kort","ok":"Ditt namn ser bra ut"},"username":{"title":"Användarnamn","instructions":"unikt, inga mellanrum, kort","short_instructions":"Du kan omnämnas som @%{username}","available":"Ditt användarnamn är tillgängligt","not_available":"Inte tillgängligt. Prova %{suggestion}?","not_available_no_suggestion":"Inte tillgängligt","too_short":"Ditt användarnamn är för kort","too_long":"Ditt användarnamn är för långt","checking":"Kollar användarnamnets tillgänglighet...","prefilled":"E-postadressen matchar det här registrerade användarnamnet","required":"Ange ett användarnamn","edit":"Redigera användarnamn"},"locale":{"title":"Gränssnittsspråk","instructions":"Språket som används av forumsgränssnittet. Det kommer att ändras när du laddar om sidan.","default":"(förvalt värde)","any":"något"},"password_confirmation":{"title":"Lösenord igen"},"invite_code":{"title":"Inbjudningskod","instructions":"Kontoregistrering kräver en inbjudningskod"},"auth_tokens":{"title":"Senaste använda enheter","details":"Detaljer","log_out_all":"Logga ut alla","not_you":"Inte du?","show_all":"Visa alla (%{count})","show_few":"Visa färre","was_this_you":"Var detta du?","was_this_you_description":"Om det inte var du, rekommenderar vi att du ändrar ditt lösenord och loggar ut överallt.","browser_and_device":"%{browser} på %{device}","secure_account":"Säkra mitt konto","latest_post":"Ditt senaste postade...","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eaktiv nu\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"Senaste inlägg","last_emailed":"Senast mailad","last_seen":"Sedd","created":"Gick med","log_out":"Logga ut","location":"Plats","website":"Webbplats","email_settings":"E-post","hide_profile_and_presence":"Dölj min offentliga profil och närvarofunktioner","enable_physical_keyboard":"Aktivera stöd för fysiskt tangentbord på iPad","text_size":{"title":"Textstorlek","smallest":"Minsta","smaller":"Mindre","normal":"Normal","larger":"Större","largest":"Störst"},"title_count_mode":{"title":"Titel på bakgrundssidan visar antalet:","notifications":"Nya aviseringar","contextual":"Nytt sidinnehåll"},"like_notification_frequency":{"title":"Avisera vid gillning","always":"Alltid","first_time_and_daily":"Första gången ett inlägg gillas och dagligen","first_time":"Första gången ett inlägg gillas","never":"Aldrig"},"email_previous_replies":{"title":"Inkludera tidigare svar längst ner i e-postmeddelanden","unless_emailed":"Såvida inte tidigare skickat","always":"alltid","never":"aldrig"},"email_digests":{"title":"Skicka mig en e-postsammanfattning av populära ämnen och inlägg när jag inte besökt sidan","every_30_minutes":"varje halvtimma","every_hour":"varje timma","daily":"varje dag","weekly":"varje vecka","every_month":"varje månad","every_six_months":"varje halvår"},"email_level":{"title":"Sänd mig e-post när någon citerar mig, besvarar mitt inlägg, nämner mitt @användarnamn eller bjuder in mig till ett ämne.","always":"alltid","only_when_away":"bara när jag är borta","never":"aldrig"},"email_messages_level":"Sänd mig e-post när någon skickar mig ett meddelande","include_tl0_in_digests":"Inkludera innehåll från nya användare i sammanfattningen som skickas via e-post","email_in_reply_to":"Inkludera ett utdrag av inlägg som svarats på i e-postmeddelanden","other_settings":"Övrigt","categories_settings":"Kategorier","new_topic_duration":{"label":"Betrakta ämnen som nya när","not_viewed":"Jag har inte tittat på dem än","last_here":"skapade sedan mitt senaste besök","after_1_day":"skapad den senaste dagen","after_2_days":"skapade de senaste 2 dagarna","after_1_week":"skapad den senaste veckan","after_2_weeks":"skapad de senaste 2 veckorna"},"auto_track_topics":"Följ automatiskt nya ämnen jag går in i","auto_track_options":{"never":"aldrig","immediately":"genast","after_30_seconds":"efter 30 sekunder","after_1_minute":"efter 1 minut","after_2_minutes":"efter 2 minuter","after_3_minutes":"efter 3 minuter","after_4_minutes":"efter 4 minuter","after_5_minutes":"efter 5 minuter","after_10_minutes":"efter 10 minuter"},"notification_level_when_replying":"När jag publicerar i ett ämne, ställ in ämnet till","invited":{"title":"Inbjudningar","pending_tab":"Avvaktar","pending_tab_with_count":"Pågående (%{count})","expired_tab":"Utgången","expired_tab_with_count":"Utgången (%{count})","redeemed_tab":"Inlöst","redeemed_tab_with_count":"Inlöst (%{count})","invited_via":"Inbjudan","invited_via_link":"länk (%{count} / %{max} inlöst)","groups":"Grupper","sent":"Skapad/senast skickad","expires_at":"Utgår","edit":"Redigera","remove":"Ta bort","copy_link":"Hämta länk","reinvite":"Skicka e-post igen","reinvited":"Inbjudan skickad","removed":"Borttagen","search":"sök efter inbjudningar...","user":"Inbjuden användare","none":"Inga inbjudningar att visa.","truncated":{"one":"Visar den första inbjudningen.","other":"Visar de första %{count} inbjudningarna."},"redeemed":"Inlösta inbjudningar","redeemed_at":"Inlöst","pending":"Avvaktande inbjudningar","topics_entered":"Besökta ämnen","posts_read_count":"Inlägg lästa","expired":"Denna inbjudan har gått ut.","remove_all":"Ta bort utgångna inbjudningar","removed_all":"Alla utgångna inbjudningar har tagits bort!","remove_all_confirm":"Är du säker på att du vill ta bort alla utgångna inbjudningar?","reinvite_all":"Skicka alla inbjudningar igen","reinvite_all_confirm":"Är du säker på att du vill skicka om alla inbjudningar?","reinvited_all":"Alla inbjudningar har skickats!","time_read":"Lästid","days_visited":"Dagar besökta","account_age_days":"Kontoålder i dagar","create":"Inbjudan","generate_link":"Skapa inbjudningslänk","link_generated":"Här är din inbjudningslänk!","valid_for":"Länk för inbjudan är endast giltig för denna email adress: %{email}","single_user":"Bjud in via e-post","multiple_user":"Bjud in via länk","invite_link":{"title":"Inbjudningslänk","success":"Länk för inbjudan framgångsrikt skapad!","error":"Ett fel inträffade vid skapande av inbjudningslänk","max_redemptions_allowed_label":"Hur många personer är tillåtna att registrera sig via denna länk?","expires_at":"När ska denna inbjudningslänk upphöra?"},"invite":{"new_title":"Skapa inbjudan","edit_title":"Redigera inbjudan","instructions":"Dela denna länk för att omedelbart bevilja åtkomst till denna webbplats:","copy_link":"kopiera länk","expires_in_time":"Utgår om %{time}.","expired_at_time":"Utgick kl. %{time}.","show_advanced":"Visa avancerade alternativ","hide_advanced":"Dölj avancerade alternativ","type_email":"Bjud bara in en e-postadress","type_link":"Bjud in en eller flera personer med en länk","email":"Begränsa till e-postadress:","max_redemptions_allowed":"Max antal användningar:","add_to_groups":"Lägg till i grupper:","invite_to_topic":"Skicka till ämnet vid första inloggningen:","expires_at":"Utgår efter:","custom_message":"Valfritt personligt meddelande:","send_invite_email":"Spara och skicka e-post","save_invite":"Spara inbjudan","invite_saved":"Inbjudan sparades.","invite_copied":"Inbjudningslänken kopierades."},"bulk_invite":{"none":"Inga inbjudningar att visa på denna sida.","text":"Massinbjudan","instructions":"\u003cp\u003eBjud in en lista med användare för att få igång ditt forum snabbt. Förbered en \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV-fil\u003c/a\u003e som innehåller minst en rad per e-postadress för användare som du vill bjuda in. Följande kommaseparerad information kan anges om du vill lägga till personer till grupper eller skicka dem till ett visst ämne första gången de loggar in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eDet skickas en inbjudan till varje e-postadress i din uppladdade CSV-fil och du kommer att kunna hantera den senare.\u003c/p\u003e\n","progress":"%{progress} % uppladdat...","success":"Filen laddades upp. Du kommer att aviseras via meddelande när processen är klar.","error":"Tyvärr bör filen vara i CSV-format."}},"password":{"title":"Lösenord","too_short":"Ditt lösenord är för kort.","common":"Det lösenordet är för vanligt.","same_as_username":"Ditt lösenord är detsamma som ditt användarnamn.","same_as_email":"Ditt lösenord är detsamma som din e-postadress.","ok":"Ditt lösenord ser bra ut.","instructions":"minst %{count} tecken","required":"Ange ett lösenord"},"summary":{"title":"Sammanfattning","stats":"Statistik","time_read":"lästid","recent_time_read":"senaste lästid","topic_count":{"one":"ämne skapat","other":"ämnen skapade"},"post_count":{"one":"inlägg skapat","other":"inlägg skapade"},"likes_given":{"one":"given","other":"givna"},"likes_received":{"one":"mottagen","other":"mottagna"},"days_visited":{"one":"dag besökt","other":"dagar besökta"},"topics_entered":{"one":"ämne visat","other":"ämnen visade"},"posts_read":{"one":"inlägg läst","other":"inlägg lästa"},"bookmark_count":{"one":"bokmärke","other":"bokmärken"},"top_replies":"Toppinlägg","no_replies":"Inga svar ännu.","more_replies":"Fler svar","top_topics":"Toppämnen","no_topics":"Inga ämnen ännu.","more_topics":"Fler ämnen","top_badges":"Topputmärkelser","no_badges":"Inga utmärkelser ännu.","more_badges":"Fler utmärkelser","top_links":"Topplänkar","no_links":"Inga länkar ännu.","most_liked_by":"Mest gillad av","most_liked_users":"Gillar mest","most_replied_to_users":"Mest besvarade","no_likes":"Inga gillningar ännu.","top_categories":"Toppkategorier","topics":"Ämnen","replies":"Svar"},"ip_address":{"title":"Senaste IP-adress"},"registration_ip_address":{"title":"IP-adress vid registrering"},"avatar":{"title":"Profilbild","header_title":"profil, meddelanden, bokmärken och inställningar","name_and_description":"%{name} - %{description}","edit":"Redigera profilbild"},"title":{"title":"Titel","none":"(ingen)"},"primary_group":{"title":"Primär grupp","none":"(ingen)"},"filters":{"all":"Alla"},"stream":{"posted_by":"Skrivet av","sent_by":"Skickat av","private_message":"meddelande","the_topic":"ämnet"},"date_of_birth":{"user_title":"Idag är det din födelsedag!","title":"Idag är det min födelsedag!","label":"Födelsedatum"},"anniversary":{"user_title":"Idag är det årsdagen för när du gick med i vårt forum!","title":"Idag är det årsdagen för när jag gick med i det här forumet!"}},"loading":"Laddar...","errors":{"prev_page":"medan vi försökte ladda","reasons":{"network":"Nätverksfel","server":"Serverfel","forbidden":"Åtkomst nekad","unknown":"Fel","not_found":"Sidan hittades inte"},"desc":{"network":"Kontrollera din uppkoppling.","network_fixed":"Ser ut som att den är tillbaka.","server":"Felmeddelande: %{status}","forbidden":"Du har inte rättigheter att läsa det där.","not_found":"Hoppsan, applikationen ledde till en URL som inte existerar.","unknown":"Något gick fel."},"buttons":{"back":"Gå tillbaka","again":"Försök igen","fixed":"Ladda sida"}},"modal":{"close":"stäng","dismiss_error":"Avfärda fel"},"close":"Stäng","assets_changed_confirm":"Programvaran på denna webbplats uppgraderades precis. Vill du installera den senaste versionen nu?","logout":"Du loggades ut.","refresh":"Uppdatera","home":"Hem","read_only_mode":{"enabled":"Webbplatsen är i skrivskyddat läge. Du kan fortsätta bläddra på sidan, men att skriva inlägg, gilla och andra interaktioner är inaktiverat för tillfället.","login_disabled":"Det går inte att logga in medan webbplatsen är i skrivskyddat läge.","logout_disabled":"Det går inte att logga ut medan webbplatsen är i skrivskyddat läge."},"logs_error_rate_notice":{},"learn_more":"lär dig mer...","first_post":"Första inlägget","mute":"Tysta","unmute":"Avtysta","last_post":"Senaste","local_time":"Lokal tid","time_read":"Läst","time_read_recently":"%{time_read} nyligen","time_read_tooltip":"%{time_read} total lästid","time_read_recently_tooltip":"%{time_read} total lästid (%{recent_time_read} under de senaste 60 dagarna)","last_reply_lowercase":"senaste svar","replies_lowercase":{"one":"svar","other":"svar"},"signup_cta":{"sign_up":"Registrera","hide_session":"Påminn mig imorgon","hide_forever":"nej tack","hidden_for_session":"Ok, jag frågar dig imorgon. Du kan alltid använda 'Logga in' för att skapa ett konto, också.","intro":"Hejsan! Det verkar som du gillar diskussionen, men du har ännu inte registrerat dig för ett konto.","value_prop":"När du skapar ett konto så kommer vi ihåg precis vad du har läst, så att du alltid kan komma tillbaka precis där du lämnade oss. Du kan också få notifieringar, här och via e-post, närhelst någon svarar dig. Du kan också gilla inlägg för att sprida kärlek. :heartpulse: "},"summary":{"enabled_description":"Sammanfattning över de inlägg som användarna tycker är mest intressanta.","description":{"one":"Det finns \u003cb\u003e%{count}\u003c/b\u003e svar.","other":"Det finns \u003cb\u003e%{count}\u003c/b\u003e svar."},"enable":"Sammanfatta detta ämne","disable":"Visa alla inlägg"},"deleted_filter":{"enabled_description":"Det här ämnet innehåller borttagna inlägg som har dolts.","disabled_description":"Raderade inlägg i ämnet visas.","enable":"Dölj raderade inlägg","disable":"Visa raderade inlägg"},"private_message_info":{"title":"Meddelande","invite":"Bjud in andra...","edit":"Lägg till eller ta bort...","remove":"Ta bort...","add":"Lägg till...","leave_message":"Vill du verkligen lämna detta meddelande?","remove_allowed_user":"Vill du verkligen ta bort %{name} från det här meddelandet?","remove_allowed_group":"Vill du verkligen ta bort %{name} från det här meddelandet?"},"email":"E-post","username":"Användarnamn","last_seen":"Sedd","created":"Skapad","created_lowercase":"skapad","trust_level":"Förtroendenivå","search_hint":"användarnamn, e-post eller IP-adress","create_account":{"header_title":"Välkommen!","subheader_title":"Låt oss skapa ditt konto","disclaimer":"Genom att registrera dig godkänner du \u003ca href='%{privacy_link}' target='blank'\u003eintegritetspolicyn\u003c/a\u003e och \u003ca href='%{tos_link}' target='blank'\u003eanvändarvillkoren\u003c/a\u003e.","title":"Skapa ditt konto","failed":"Något gick fel, kanske är denna e-postadress redan registrerad, prova länken Glömt lösenord"},"forgot_password":{"title":"Beställ nytt lösenord","action":"Jag har glömt mitt lösenord","invite":"Skriv in ditt användarnamn eller din e-postadress, så skickar vi dig ett e-postmeddelande om lösenordsåterställning.","reset":"Återställ lösenord","complete_username":"Om ett konto matchar användarnamnet \u003cb\u003e%{username}\u003c/b\u003e bör du inom kort få ett e-postmeddelande med instruktioner för hur du återställer ditt lösenord.","complete_email":"Om ett konto matchar \u003cb\u003e%{email}\u003c/b\u003e bör du inom kort få ett e-postmeddelande med instruktioner för hur du återställer ditt lösenord.","complete_username_found":"Vi hittade ett konto som matchar användarnamnet \u003cb\u003e%{username}\u003c/b\u003e. Du kommer inom kort att få e-post med instruktioner om hur du återställer ditt lösenord.","complete_email_found":"Vi hittade ett konto som matchar \u003cb\u003e%{email}\u003c/b\u003e. Du kommer inom kort att få e-post med instruktioner om hur du återställer ditt lösenord.","complete_username_not_found":"Det finns inget konto som matchar användarnamnet \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Det finns inget konto som matchar \u003cb\u003e%{email}\u003c/b\u003e","help":"Får du ingen e-post? Kontrollera först din skräppostmapp. \u003cp\u003eÄr du inte säker på vilken e-postadress du använde? Ange en e-postadress så meddelar vi dig om den finns här.\u003c/p\u003e\u003cp\u003eOm du inte längre har tillgång till e-postadressen för ditt konto, ber vi dig kontakta \u003ca href='%{basePath}/about'\u003evår trevliga personal.\u003c/a\u003e\u003c/p\u003e","button_ok":"OK","button_help":"Hjälp"},"email_login":{"link_label":"E-posta mig en inloggningslänk","button_label":"per e-post","login_link":"Hoppa över lösenordet; skicka en inloggningslänk till mig per e-post","emoji":"lås emoji","complete_username":"Om ett konto matchar användarnamnet \u003cb\u003e%{username}\u003c/b\u003e, bör du snart få ett e-postmeddelande med en inloggningslänk.","complete_email":"Om ett konto matchar \u003cb\u003e%{email}\u003c/b\u003e, bör du snart få ett e-postmeddelande med en inloggningslänk.","complete_username_found":"Vi hittade ett konto som matchade användarnamnet \u003cb\u003e %{username} \u003c/b\u003e, du kommer snart att få ett e-postmeddelande med länk för inloggning.","complete_email_found":"Vi hittade ett konto som matchade \u003cb\u003e%{email}\u003c/b\u003e, du kommer snart att få ett e-postmeddelande med länk för inloggning.","complete_username_not_found":"Det finns inget konto som matchar användarnamnet \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Det finns inget konto som matchar \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Fortsätt till %{site_name}","logging_in_as":"Loggar in som %{email}","confirm_button":"Avsluta inloggning"},"login":{"header_title":"Välkommen tillbaka","subheader_title":"Logga in till ditt konto","title":"Logga in","username":"Användare","password":"Lösenord","second_factor_title":"Tvåfaktorsautentisering","second_factor_description":"Ange din autentiseringskod från din app:","second_factor_backup":"Logga in med reservkod","second_factor_backup_title":"Tvåfaktorsreserv","second_factor_backup_description":"Ange en av dina reservkoder:","second_factor":"Logga in via autentiseringsappen","security_key_description":"När du har din fysiska säkerhetsnyckel till hands, tryck på knappen Autentisera med säkerhetsnyckel här nedtill.","security_key_alternative":"Prova ett annat sätt","security_key_authenticate":"Autentisera med säkerhetsnyckel","security_key_not_allowed_error":"Processen för autentiseringssäkerhetsnyckel dröjde antingen för länge eller avbröts.","security_key_no_matching_credential_error":"Inga matchande referenser kunde hittas i den medföljande säkerhetsnyckeln.","security_key_support_missing_error":"Din nuvarande enhet eller webbläsare stöder inte användning av säkerhetsnycklar. Använd en annan metod.","email_placeholder":"E-postadress/användarnamn","caps_lock_warning":"Skiftlås är aktiverat","error":"Okänt fel","cookies_error":"Din webbläsare verkar ha cookies inaktiverade. Du kanske inte kan logga in utan att aktivera dem först.","rate_limit":"Var god vänta innan du försöker logga in igen.","blank_username":"Ange din e-postadress eller ditt användarnamn","blank_username_or_password":"Ange din e-postadress eller ditt användarnamn och lösenord.","reset_password":"Återställ lösenord","logging_in":"Loggar in...","or":"Eller","authenticating":"Autentiserar...","awaiting_activation":"Ditt konto väntar på aktivering, använd Glömt lösenord-länken för att skicka ett nytt aktiveringsmail.","awaiting_approval":"Ditt konto har inte godkänts av en moderator än. Du kommer att få ett e-postmeddelande när det är godkänt.","requires_invite":"Tyvärr, inbjudan krävs för tillgång till detta forum.","not_activated":"Du kan inte logga in än. Vi har tidigare skickat ett aktiveringsbrev till dig via \u003cb\u003e%{sentTo}\u003c/b\u003e. Var god följ instruktionerna i det e-postmeddelandet för att aktivera ditt konto.","not_allowed_from_ip_address":"Du kan inte logga in från den IP-adressen.","admin_not_allowed_from_ip_address":"Du kan inte logga in som administratör från den IP-adressen.","resend_activation_email":"Klicka här för att skicka aktiveringsbrevet igen.","omniauth_disallow_totp":"Ditt konto har tvåfaktorsautentisering aktiverad. Logga in med ditt lösenord.","resend_title":"Skicka aktiveringsmail igen","change_email":"Ändra e-postadress","provide_new_email":"Ange en ny adress så skickar vi ett nytt bekräftelsemail.","submit_new_email":"Ändra e-postadress","sent_activation_email_again":"Vi har skickat ännu ett aktiveringsmail till dig via \u003cb\u003e%{currentEmail}\u003c/b\u003e. Det kan ta ett par minuter för det att komma fram; var noga med att kolla din skräppost.","sent_activation_email_again_generic":"Vi skickade ett nytt aktiveringsmeddelande. Det kan ta några minuter innan det kommer; kontrollera din skräppostmapp.","to_continue":"Logga in","preferences":"Du måste logga in för att ändra dina användarinställningar.","not_approved":"Ditt konto har inte godkänts än. Du kommer att aviseras via e-post när det är klart att logga in.","google_oauth2":{"name":"Google","title":"med Google"},"twitter":{"name":"Twitter","title":"med Twitter"},"instagram":{"name":"Instagram","title":"med Instagram"},"facebook":{"name":"Facebook","title":"med Facebook"},"github":{"name":"GitHub","title":"med GitHub"},"discord":{"name":"Discord","title":"med Discord"},"second_factor_toggle":{"totp":"Använd en autentiseringsapp istället","backup_code":"Använd en reservkod istället"}},"invites":{"accept_title":"Inbjudan","emoji":"kuvert-emoji","welcome_to":"Välkommen till %{site_name}!","invited_by":"Du bjöds in av:","social_login_available":"Du kommer också att kunna logga in med sociala medier-inloggningar som använder denna e-postadress.","your_email":"E-postadressen för ditt konto är \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Acceptera inbjudan","success":"Ditt konto har skapats och du är nu inloggad.","name_label":"Namn","password_label":"Lösenord","optional_description":"(valfri)"},"password_reset":{"continue":"Fortsätt till %{site_name}"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Endast kategorier","categories_with_featured_topics":"Kategorier med utvalda ämnen","categories_and_latest_topics":"Kategorier med senaste ämnen","categories_and_top_topics":"Kategorier och toppämnen","categories_boxes":"Boxar med underkategorier","categories_boxes_with_topics":"Boxar med utvalda ämnen"},"shortcut_modifier_key":{"shift":"Skift","ctrl":"Ctrl","alt":"Alt","enter":"Ange"},"conditional_loading_section":{"loading":"Laddar..."},"category_row":{"topic_count":{"one":"%{count} ämne i den här kategorin","other":"%{count} ämnen i den här kategorin"},"plus_subcategories_title":{"one":"%{name} och en underkategori","other":"%{name} och %{count} underkategorier"},"plus_subcategories":{"one":"+ %{count} underkategori","other":"+ %{count} underkategorier"}},"select_kit":{"filter_by":"Filtrera efter: %{name}","select_to_filter":"Välj ett värde att filtrera","default_header_text":"Välj...","no_content":"Inga matchningar hittades","filter_placeholder":"Sök...","filter_placeholder_with_any":"Sök eller skapa...","create":"Skapa: '%{content}'","max_content_reached":{"one":"Du kan endast välja %{count} föremål.","other":"Du kan endast välja %{count} föremål."},"min_content_not_reached":{"one":"Välj minst %{count} föremål.","other":"Välj minst %{count} föremål."},"invalid_selection_length":{"one":"Valet måste innehålla minst %{count} tecken.","other":"Valet måste innehålla minst %{count} tecken."},"components":{"categories_admin_dropdown":{"title":"Hantera kategorier"}}},"date_time_picker":{"from":"Från","to":"Till"},"emoji_picker":{"filter_placeholder":"Sök efter emoji","smileys_\u0026_emotion":"Smileys och känslor","people_\u0026_body":"Människor och kropp","animals_\u0026_nature":"Djur och natur","food_\u0026_drink":"Mat och dryck","travel_\u0026_places":"Resor och platser","activities":"Aktiviteter","objects":"Objekt","symbols":"Symboler","flags":"Flaggor","recent":"Senast använda","default_tone":"Ingen hudton","light_tone":"Ljus hudton","medium_light_tone":"Mellanljus hudton","medium_tone":"Mellanhudton","medium_dark_tone":"Mellanmörk hudton","dark_tone":"Mörk hudton","default":"Anpassa emojis"},"shared_drafts":{"title":"Delade utkast","notice":"Detta ämne är endast synligt för de som kan publicera delade utkast.","destination_category":"Målkategori","publish":"Publicera delat utkast","confirm_publish":"Är du säker på att du vill publicera detta utkast?","publishing":"Publicerar ämne..."},"composer":{"emoji":"Emoji :)","more_emoji":"mer...","options":"Alternativ","whisper":"viska","unlist":"avlistad","add_warning":"Det här är en officiell varning.","toggle_whisper":"Växla viskning","toggle_unlisted":"Växla olistad","posting_not_on_topic":"Vilket ämne vill du svara på?","saved_local_draft_tip":"sparat lokalt","similar_topics":"Ditt ämne liknar...","drafts_offline":"utkast offline","edit_conflict":"redigera konflikt","group_mentioned_limit":{"one":"\u003cb\u003eVarning!\u003c/b\u003e Du nämnde \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e och denna grupp har fler medlemmar än vad administratorn tillåter för omnämningar. Begränsningsregeln för omnämnanden är satt till %{count} användare. Ingen kommer därför att aviseras.","other":"\u003cb\u003eVarning!\u003c/b\u003e Du nämnde \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e och denna grupp har fler medlemmar än vad administratorn tillåter för omnämningar. Begränsningsregeln för omnämnanden är satt till %{count} användare. Ingen kommer därför att aviseras."},"group_mentioned":{"one":"Genom att nämna %{group}, så kommer du att avisera \u003ca href='%{group_link}'\u003e%{count} person\u003c/a\u003e – är du säker?","other":"Genom att nämna %{group}, så kommer du att avisera \u003ca href='%{group_link}'\u003e%{count} medlemmar\u003c/a\u003e – är du säker?"},"cannot_see_mention":{"category":"Du nämnde %{username}, men hen kommer inte att få någon avisering för hen har inte tillgång till denna kategori. Du måste lägga till hen till en grupp som har tillgång till den här kategorin.","private":"Du nämnde %{username}, men hen kommer inte få någon avisering eftersom hen inte kan se detta personliga meddelande. Du måste bjuda in hen till detta PM."},"duplicate_link":"Det verkar som din länk till \u003cb\u003e%{domain}\u003c/b\u003e redan har lagts in i ämnet av \u003cb\u003e@%{username}\u003c/b\u003e i \u003ca href='%{post_url}'\u003e ett svar den %{ago}\u003c/a\u003e – är du säker på att du vill lägga upp den igen?","reference_topic_title":"SV: %{title}","error":{"title_missing":"Du måste ange en rubrik","title_too_short":{"one":"Rubriken måste innehålla minst %{count} tecken","other":"Rubriken måste innehålla minst %{count} tecken"},"title_too_long":{"one":"Rubriken får inte vara längre än %{count} tecken","other":"Rubriken får inte vara längre än %{count} tecken"},"post_missing":"Inlägg får inte vara tomt","post_length":{"one":"Inlägget måste innehålla minst %{count} tecken","other":"Inlägget måste innehålla minst %{count} tecken"},"try_like":"Har du provat %{heart}-knappen?","category_missing":"Du måste välja en kategori","tags_missing":{"one":"Du måste välja åtminstone %{count} tagg","other":"Du måste välja åtminstone %{count} taggar"},"topic_template_not_modified":"Lägg till detaljer och specifikationer till ditt ämne genom att redigera ämnesmallen."},"save_edit":"Spara ändring","overwrite_edit":"Överskriv redigering","reply_original":"Svara på ursprungsämnet","reply_here":"Svara här","reply":"Svara","cancel":"Avbryt","create_topic":"Skapa ämne","create_pm":"Nytt meddelande","create_whisper":"Viska","create_shared_draft":"Skapa delat utkast","edit_shared_draft":"Redigera delat utkast","title":"eller tryck på Ctrl+Enter","users_placeholder":"Lägg till en användare","title_placeholder":"Vad handlar ämnet om i en kort mening?","title_or_link_placeholder":"Skriv in en titel, eller klistra in en länk här","edit_reason_placeholder":"varför redigerar du?","topic_featured_link_placeholder":"Ange länken som visas med titeln.","remove_featured_link":"Ta bort länk från ämne.","reply_placeholder":"Skriv här. Använd Markdown, BBCode eller HTML för formatering. Släpp eller klistra in bilder.","reply_placeholder_no_images":"Skriv här. Använd Markdown, BBCode eller HTML för formatering.","reply_placeholder_choose_category":"Välj en kategori innan du skriver här.","view_new_post":"Visa ditt nya inlägg.","saving":"Sparar","saved":"Sparat!","saved_draft":"Utkast för inlägg pågår. Klicka för att fortsätta.","uploading":"Laddar upp...","show_preview":"visa förhandsgranskning \u0026raquo;","hide_preview":"\u0026laquo; dölj förhandsgranskning","quote_post_title":"Citera hela inlägget","bold_label":"B","bold_title":"Fet","bold_text":"fet text","italic_label":"I","italic_title":"Kursiv","italic_text":"kursiv text","link_title":"Hyperlänk","link_description":"skriv en länkbeskrivning här","link_dialog_title":"Infoga hyperlänk","link_optional_text":"valfri rubrik","link_url_placeholder":"Klistra in en URL eller skriv för att söka ämnen","blockquote_title":"Citat","blockquote_text":"Citat","code_title":"Förformatterad text","code_text":"indentera förformatterad text med 4 mellanslag","paste_code_text":"skriv eller klistra in din kod här","upload_title":"Bild","upload_description":"skriv en bildbeskrivning här","olist_title":"Numrerad lista","ulist_title":"Punktlista","list_item":"Listobjekt","toggle_direction":"Växla riktning","help":"Markdown-redigeringshjälp","collapse":"minimera skaparpanelen","open":"öppna skaparpanelen","abandon":"stäng skaparen och kasta utkast","enter_fullscreen":"skaparen i helskärm","exit_fullscreen":"avsluta helskärmsläge för skaparen","show_toolbar":"visa redigerarens verktygsfält","hide_toolbar":"dölj redigerarens verktygsfält","modal_ok":"OK","modal_cancel":"Avbryt","cant_send_pm":"Tyvärr, du kan inte skicka ett meddelande till %{username}.","yourself_confirm":{"title":"Glömde du lägga till mottagare?","body":"Just nu skickas det här meddelandet bara till dig själv!"},"slow_mode":{"error":"Detta ämne är i långsamt läge. För att främja eftertänksam, genomtänkt diskussion får du bara publicera en gång var %{duration}."},"admin_options_title":"Valfria personalinställningar för detta ämne","composer_actions":{"reply":"Svara","draft":"Utkast","edit":"Redigera","reply_to_post":{"label":"Svara på ett inlägg av %{postUsername}","desc":"Svara på ett specifikt inlägg"},"reply_as_new_topic":{"label":"Svara som länkat ämne","desc":"Skapa ett nytt ämne länkat till detta ämne","confirm":"Du har ett nytt ämnesutkast sparat, vilket kommer att skrivas över om du skapar ett länkat ämne."},"reply_as_new_group_message":{"label":"Svara som nytt gruppmeddelande","desc":"Skapa ett nytt privat meddelande till samma mottagare"},"reply_as_private_message":{"label":"Nytt meddelande","desc":"Skapa ett nytt personligt meddelande"},"reply_to_topic":{"label":"Svara på ämne","desc":"Svara på ämnet, inte ett specifikt inlägg"},"toggle_whisper":{"label":"Växla viskning","desc":"Viskningar är enbart synliga för personal"},"create_topic":{"label":"Nytt ämne"},"shared_draft":{"label":"Delat utkast","desc":"Skapa ett utkast av ett ämne vilket enbart kommer vara synligt för tillåtna användare"},"toggle_topic_bump":{"label":"Växla ämnesknuff","desc":"Svara utan att ändra senaste svarsdatum"}},"reload":"Ladda om","ignore":"Ignorera","details_title":"Sammanfattning","details_text":"Denna text kommer att döljas"},"notifications":{"tooltip":{"regular":{"one":"%{count} oläst avisering","other":"%{count} olästa aviseringar"},"message":{"one":"%{count} oläst meddelande","other":"%{count} olästa meddelanden"},"high_priority":{"one":"%{count} oläst avisering med hög prioritet","other":"%{count} olästa aviseringar med hög prioritet"}},"title":"aviseringar från @namn-omnämnanden, svar på dina inlägg och ämnen, meddelanden, etc","none":"Kan inte ladda aviseringar just nu.","empty":"Inga aviseringar hittades.","post_approved":"Ditt inlägg blev godkänt","reviewable_items":"föremål som kräver granskning","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username},%{username2}\u003c/span\u003e%{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username},%{username2} och %{count} annan\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username},%{username2} och %{count} andra\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"gillade %{count} av dina inlägg","other":"gillade %{count} av dina inlägg"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e%{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e tackade ja till din inbjudan","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e flyttade %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Förtjänade '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNytt ämne\u003c/span\u003e %{description}","membership_request_accepted":"Medlemskap i '%{group_name}' godkänt","membership_request_consolidated":{"one":"%{count} öppen medlemsansökan för '%{group_name}'","other":"%{count} öppna medlemsansökningar för '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e%{description}","votes_released":"%{description} - slutförd","group_message_summary":{"one":"%{count} meddelande i din %{group_name}-inkorg","other":"%{count} meddelanden i din %{group_name}-inkorg"},"popup":{"mentioned":"%{username} nämnde dig i \"%{topic}\" - %{site_title}","group_mentioned":"%{username} nämnde dig i \"%{topic}\" - %{site_title}","quoted":"%{username} citerade dig i \"%{topic}\" - %{site_title}","replied":"%{username} svarade dig i \"%{topic}\" - %{site_title}","posted":"%{username} skrev i \"%{topic}\" - %{site_title}","private_message":"%{username} skickade dig ett privat meddelande i \"%{topic}\" - %{site_title}","linked":"%{username} länkade till ett inlägg du gjort från \"%{topic}\" - %{site_title}","watching_first_post":"%{username} skapade ett nytt ämne \"%{topic}\" - %{site_title}","confirm_title":"Aviseringar aktiverade - %{site_title}","confirm_body":"Framgång! Meddelanden har aktiverats.","custom":"Aviseringar från %{username} hos %{site_title}"},"titles":{"mentioned":"omnämnd","replied":"nytt svar","quoted":"citerad","edited":"redigerad","liked":"ny gillning","private_message":"nytt privat meddelande","invited_to_private_message":"inbjuden till privat meddelande","invitee_accepted":"inbjudan accepterad","posted":"nytt inlägg","moved_post":"inlägg flyttat","linked":"länkat","bookmark_reminder":"påminnelse för bokmärke","bookmark_reminder_with_name":"påminnelse för bokmärke - %{name}","granted_badge":"utmärkelse tilldelad","invited_to_topic":"inbjuden till ämne","group_mentioned":"grupp som nämnts","group_message_summary":"nytt gruppmeddelande","watching_first_post":"nytt ämne","topic_reminder":"ämnespåminnelse","liked_consolidated":"nya gillningar","post_approved":"inlägg godkänt","membership_request_consolidated":"ny begäran om medlemskap","reaction":"ny reaktion","votes_released":"Röstningen släpptes"}},"upload_selector":{"title":"Lägg till en bild","title_with_attachments":"Lägg till en bild eller en fil","from_my_computer":"Från min enhet","from_the_web":"Från webben","remote_tip":"länk till bild","remote_tip_with_attachments":"länk till bild eller fil %{authorized_extensions}","local_tip":"välj bilder från din enhet","local_tip_with_attachments":"välj bilder eller filer från din enhet %{authorized_extensions}","hint":"(du kan också dra och släppa i redigeraren för att ladda upp dem)","hint_for_supported_browsers":"du kan också dra och släppa eller klistra in bilder i redigeraren","uploading":"Laddar upp","select_file":"Välj fil","default_image_alt_text":"bild"},"search":{"sort_by":"Sortera efter","relevance":"Relevans","latest_post":"Senaste inlägg","latest_topic":"Senaste ämnet","most_viewed":"Mest sedda","most_liked":"Mest gillade","select_all":"Markera alla","clear_all":"Rensa allt","too_short":"Din sökterm är för kort.","result_count":{"one":"\u003cspan\u003e%{count} resultat för\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} resultat för\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"sök efter ämnen, inlägg, användare eller kategorier","full_page_title":"sök ämnen eller inlägg","no_results":"Inga resultat hittades.","no_more_results":"Inga fler resultat hittades.","post_format":"Nr %{post_number} av %{username}","results_page":"Sökresultat för '%{term}'","more_results":"Det finns fler resultat. Förfina ditt sökkriterium.","cant_find":"Hittar du inte det du söker?","start_new_topic":"Kanske skapa ett nytt ämne?","or_search_google":"Eller försök söka med Google istället:","search_google":"Försök söka med Google istället:","search_google_button":"Google","search_button":"Sök","context":{"user":"Sök inlägg av @%{username}","category":"Sök kategorin #%{category}","tag":"Sök efter taggen #%{tag}","topic":"Sök i det här ämnet","private_messages":"Sök meddelanden"},"advanced":{"title":"Avancerad sökning","posted_by":{"label":"Publicerat av"},"in_category":{"label":"Kategoriserad"},"in_group":{"label":"I gruppen"},"with_badge":{"label":"Med utmärkelse"},"with_tags":{"label":"Taggad"},"filters":{"label":"Returnera enbart ämnen/inlägg....","title":"Matcha enbart i titeln","likes":"jag gillade","posted":"jag publicerade i","created":"jag skapade","watching":"jag bevakar","tracking":"jag följer","private":"Bland mina meddelanden","bookmarks":"jag har bokmärkt","first":"är den första posten","pinned":"är fästa","seen":"jag har läst","unseen":"jag inte har läst","wiki":"är wiki","images":"inkluderar bild(er)","all_tags":"Alla ovanstående taggar"},"statuses":{"label":"Där ämnen","open":"är öppna","closed":"är stängda","public":"är offentliga","archived":"är arkiverade","noreplies":"har noll svar","single_user":"innehåller en ensam användare"},"post":{"count":{"label":"Inlägg"},"min":{"placeholder":"minst"},"max":{"placeholder":"maximalt"},"time":{"label":"Publicerad","before":"innan","after":"efter"}},"views":{"label":"Visningar"},"min_views":{"placeholder":"minst"},"max_views":{"placeholder":"maximalt"}}},"hamburger_menu":"gå till en annan ämneslista eller kategori","new_item":"ny","go_back":"gå tillbaka","not_logged_in_user":"användarsida med sammanställning av aktuell aktivitet och inställningar","current_user":"gå till din användarsida","view_all":"visa alla %{tab}","topics":{"new_messages_marker":"senaste besök","bulk":{"select_all":"Välj alla","clear_all":"Rensa alla","unlist_topics":"Avlista ämnen","relist_topics":"Lista om ämnen","reset_read":"Återställ lästa","delete":"Ta bort ämnen","dismiss":"Avfärda","dismiss_read":"Avfärda alla olästa","dismiss_button":"Avfärda...","dismiss_tooltip":"Avfärda nya inlägg eller sluta följa ämnen","also_dismiss_topics":"Sluta följa de här ämnena så att de aldrig syns som olästa för mig igen","dismiss_new":"Avfärda nya","toggle":"växla val av flertalet ämnen","actions":"Massändringar","change_category":"Sätt kategori","close_topics":"Stäng ämnen","archive_topics":"Arkivera ämnen","move_messages_to_inbox":"Flytta till inkorgen","notification_level":"Aviseringar","change_notification_level":"Ändra aviseringsnivå","choose_new_category":"Välj den nya kategorin för ämnena:","selected":{"one":"Du har markerat \u003cb\u003e%{count}\u003c/b\u003e ämne.","other":"Du har markerat \u003cb\u003e%{count}\u003c/b\u003e ämnen."},"change_tags":"Ersätt taggar","append_tags":"Lägg till taggar","choose_new_tags":"Välj nya taggar för de här ämnena:","choose_append_tags":"Välj nya taggar att lägga till för dessa ämnen:","changed_tags":"Taggarna för de här ämnena ändrades.","remove_tags":"Ta bort alla taggar","confirm_remove_tags":{"one":"Alla taggar tas bort från det här ämnet. Är du säker?","other":"Alla taggar tas bort från \u003cb\u003e%{count}\u003c/b\u003e ämnen. Är du säker?"},"progress":{"one":"Förlopp: \u003cstrong\u003e%{count}\u003c/strong\u003e ämne","other":"Förlopp: \u003cstrong\u003e%{count}\u003c/strong\u003e ämnen"}},"none":{"unread":"Du har inga olästa ämnen.","new":"Du har inga nya ämnen.","read":"Du har inte läst några ämnen ännu.","posted":"Du har inte postat i några ämnen ännu.","ready_to_create":"Redo att ","latest":"Ni är alla ikapp!","bookmarks":"Du har inga bokmärkta ämnen ännu.","category":"Det finns inga ämnen i %{category}.","top":"Det finns inga toppämnen.","educate":{"new":"\u003cp\u003eDina nya ämnen hamnar här. Standard är att ämnen anses nya och kommer att visa en \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e-indikator om de skapades de senaste 2 dagarna.\u003c/p\u003e\u003cp\u003eGå till dina \u003ca href=\"%{userPrefsUrl}\"\u003eanvändarinställningar\u003c/a\u003e för att ändra detta.\u003c/p\u003e","unread":"\u003cp\u003eDina olästa ämnen visas här.\u003c/p\u003e\u003cp\u003eSom standard betraktas ämnen som olästa och visar olästa antal \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e om du:\u003c/p\u003e\u003cul\u003e\u003cli\u003eSkapade ämnet\u003c/li\u003e\u003cli\u003eSvarade på ämnet\u003c/li\u003e\u003cli\u003eLäste ämnet i mer än 4 minuter\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eEller om du uttryckligen har ställt in ämnet till Följer eller Bevakat via 🔔 i varje ämne.\u003c/p\u003e\u003cp\u003eGå till dina \u003ca href=\"%{userPrefsUrl}\"\u003epreferenser\u003c/a\u003e för att ändra detta.\u003c/p\u003e"}},"bottom":{"latest":"Det finns inga fler senaste ämnen.","posted":"Det finns inga fler postade ämnen.","read":"Det finns inga fler lästa ämnen.","new":"Det finns inga fler nya ämnen.","unread":"Det finns inga fler olästa ämnen.","category":"Det finns inga fler ämnen i %{category}.","tag":"Det finns inga fler %{tag}-ämnen.","top":"Det finns inga fler toppämnen.","bookmarks":"Inga fler bokmärkta ämnen hittades."}},"topic":{"filter_to":{"one":"%{count} inlägg i ämnet","other":"%{count} inlägg i ämnet"},"create":"Nytt ämne","create_long":"Skapa ett nytt ämne","open_draft":"Öppna utkast","private_message":"Skriv meddelande","archive_message":{"help":"Flytta meddelandet till ditt arkiv","title":"Arkiv"},"move_to_inbox":{"title":"Flytta till inkorgen","help":"Flytta tillbaka meddelandet till inkorgen"},"edit_message":{"help":"Redigera första inlägget av meddelandet","title":"Redigera"},"defer":{"help":"Märk som oläst","title":"Skjut upp"},"feature_on_profile":{"help":"Lägg till en länk till detta ämne från ditt användarkort samt profil","title":"Föredraget från profil"},"remove_from_profile":{"warning":"Din profil har redan ett föredraget ämne. Om du fortsätter kommer detta ämne att ersätta ditt tidigare ämne.","help":"Ta bort länken till detta ämne från din användarprofil","title":"Ta bort från profil"},"list":"Ämnen","new":"nytt ämne","unread":"oläst","new_topics":{"one":"%{count} nytt ämne","other":"%{count} nya ämnen"},"unread_topics":{"one":"%{count} oläst ämne","other":"%{count} olästa ämnen"},"title":"Ämne","invalid_access":{"title":"Ämnet är privat","description":"Tyvärr, du har inte behörighet till det ämnet!","login_required":"Du måste logga in för att se det här ämnet."},"server_error":{"title":"Ämnet misslyckades med att ladda","description":"Vi kunde tyvärr inte ladda det ämnet, möjligtvis på grund av ett anslutningsproblem. Var god och försök igen. Om problemet kvarstår, hör av dig till oss."},"not_found":{"title":"Ämnet hittades inte","description":"Vi kunde tyvärr inte hitta det ämnet. Kanske har den tagits bort av en moderator?"},"total_unread_posts":{"one":"du har %{count} oläst inlägg i det här ämnet","other":"du har %{count} olästa inlägg i det här ämnet"},"unread_posts":{"one":"du har %{count} oläst gammalt inlägg i det här ämnet","other":"du har %{count} olästa gamla inlägg i det här ämnet"},"new_posts":{"one":"det finns %{count} nytt inlägg i det här ämnet sedan du senast läste den","other":"det finns %{count} nya inlägg i det här ämnet sedan du senast läste det"},"likes":{"one":"det finns %{count} gillning i det här ämnet","other":"det finns %{count} gillningar i det här ämnet"},"back_to_list":"Tillbaka till ämneslistan","options":"Ämnesinställningar","show_links":"visa länkar som finns i det här ämnet","toggle_information":"slå av/på ämnesdetaljer","read_more_in_category":"Vill du läsa mer? Bläddra bland andra ämnen i %{catLink} eller %{latestLink}.","read_more":"Vill du läsa mer? %{catLink} eller %{latestLink}.","unread_indicator":"Ingen medlem har läst det senaste inlägget ännu.","browse_all_categories":"Bläddra bland alla kategorier","browse_all_tags":"Bläddra bland alla taggar","view_latest_topics":"visa senaste ämnen","suggest_create_topic":"starta en ny konversation?","jump_reply_up":"hoppa till tidigare svar","jump_reply_down":"hoppa till senare svar","deleted":"Ämnet har raderats","slow_mode_update":{"title":"Långsamt läge","select":"Användare får bara publicera i detta ämne en gång varje:","description":"För att främja tankeväckande diskussioner i snabba eller omtvistade diskussioner måste användarna vänta innan de publicerar i det här ämnet igen.","save":"Aktivera","enabled_until":"(Valfritt) Aktiverad till:","remove":"Inaktivera","hours":"Timmar:","minutes":"Minuter:","seconds":"Sekunder:","durations":{"15_minutes":"15 minuter","1_hour":"1 timme","4_hours":"4 timmar","1_day":"1 dag","1_week":"1 vecka","custom":"Anpassad varaktighet"}},"slow_mode_notice":{"duration":"Du måste vänta %{duration} mellan inläggen i det här ämnet"},"topic_status_update":{"title":"Ämnestidtagning","save":"Ställ in timer","num_of_hours":"Antal timmar:","num_of_days":"Antal dagar:","remove":"Ta bort timer:","publish_to":"Publicera till:","when":"När:","time_frame_required":"Välj en tidsram","min_duration":"Varaktigheten måste vara större än 0","max_duration":"Varaktigheten måste vara kortare än 20 år"},"auto_update_input":{"none":"Välj en tidsram","now":"Nu","later_today":"Senare idag","tomorrow":"Imorgon","later_this_week":"Senare denna vecka","this_weekend":"Detta veckoslut","next_week":"Nästa vecka","two_weeks":"Två veckor","next_month":"Nästa månad","two_months":"Två månader","three_months":"Tre månader","four_months":"Fyra månader","six_months":"Sex månader","one_year":"Ett år","forever":"För alltid","pick_date_and_time":"Välj datum och tid","set_based_on_last_post":"Stäng baserat på senaste inlägg"},"publish_to_category":{"title":"Schemalägg publicering"},"temp_open":{"title":"Öppna tillfälligt"},"auto_reopen":{"title":"Öppna ämne automatiskt"},"temp_close":{"title":"Stäng tillfälligt"},"auto_close":{"title":"Stäng ämne automatiskt","label":"Stäng automatiskt ämne efter:","error":"Ange ett giltigt värde.","based_on_last_post":"Stäng inte förrän det sista inlägget i ämnet är åtminstone så här gammalt."},"auto_close_after_last_post":{"title":"Stäng ämnet automatiskt efter sista inlägget"},"auto_delete":{"title":"Radera ämne automatiskt:"},"auto_bump":{"title":"Auto-knuffa ämne"},"reminder":{"title":"Påminn mig"},"auto_delete_replies":{"title":"Radera svar automatiskt"},"status_update_notice":{"auto_open":"Detta ämne kommer att öppnas automatiskt om %{timeLeft}.","auto_close":"Det här ämnet kommer att stängas automatiskt om %{timeLeft}.","auto_publish_to_category":"Detta ämne kommer att publiceras till \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_after_last_post":"Detta ämne stängs %{duration} efter sista svaret.","auto_delete":"Det här ämnet kommer att raderas automatiskt om %{timeLeft}.","auto_bump":"Det här ämnet kommer att knuffas automatiskt %{timeLeft}.","auto_reminder":"Du kommer att påminnas om detta ämne om %{timeLeft}.","auto_delete_replies":"Svar på detta ämne raderas automatiskt efter %{duration}."},"auto_close_title":"Inställningar för automatisk stängning","auto_close_immediate":{"one":"Senaste inlägget i det här ämnet är redan %{count} timme gammalt, så ämnet kommer att stängas omedelbart. ","other":"Senaste inlägget i det här ämnet är redan %{count} timmar gammal, så ämnet kommer att stängas omedelbart. "},"auto_close_momentarily":{"one":"Senaste inlägget i det här ämnet är redan %{count} timme gammalt, så ämnet kommer att stängas för tillfället.","other":"Senaste inlägget i det här ämnet är redan %{count} timmar gammalt, så ämnet kommer att stängas för tillfället."},"timeline":{"back":"Tillbaka","back_description":"Gå tillbaka till ditt senaste olästa inlägg","replies_short":"%{current} / %{total}"},"progress":{"title":"ämnesförlopp","go_top":"toppen","go_bottom":"botten","go":"gå","jump_bottom":"hoppa till sista inlägget","jump_prompt":"hoppa till...","jump_prompt_of":{"one":"av %{count} inlägg","other":"av %{count} inlägg"},"jump_prompt_long":"Hoppa till...","jump_bottom_with_number":"hoppa till inlägg %{post_number}","jump_prompt_to_date":"till datum","jump_prompt_or":"eller","total":"antal inlägg","current":"nuvarande inlägg"},"notifications":{"title":"ändra hur ofta du får aviseringar om det här ämnet","reasons":{"mailing_list_mode":"Du har utskicksläge aktiverat, så du kommer aviseras om inlägg till det här ämnet via e-post.","3_10":"Du kommer att ta emot aviseringar eftersom du bevakar en tagg i det här ämnet.","3_6":"Du kommer att få aviseringar eftersom du bevakar denna kategori.","3_5":"Du kommer att få aviseringar eftersom du automatiskt började följa det här ämnet.","3_2":"Du kommer att få aviseringar eftersom du bevakar detta ämne.","3_1":"Du kommer att få aviseringar eftersom du skapade detta ämne.","3":"Du kommer att få aviseringar eftersom du bevakar detta ämne.","2_8":"Du kommer att se en räknare för nya svar eftersom du följer denna kategorin.","2_4":"Du kommer att se en räknare för nya svar eftersom du postat ett svar i detta ämne.","2_2":"Du kommer att se en räknare för nya svar eftersom du följer detta ämne.","2":"Du kommer att se en räknare för nya svar eftersom du \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eläser detta ämne\u003c/a\u003e.","1_2":"Du aviseras om någon nämner ditt @namn eller svarar dig.","1":"Du aviseras om någon nämner ditt @namn eller svarar dig.","0_7":"Du ignorerar alla aviseringar i den här kategorin.","0_2":"Du ignorerar alla aviseringar för detta ämne.","0":"Du ignorerar alla aviseringar för detta ämne."},"watching_pm":{"title":"Bevakar","description":"Du aviseras om varje nytt svar i detta meddelande, samt det visas en räknare med antalet nya svar."},"watching":{"title":"Bevakar","description":"Du kommer att aviseras om varje nytt svar i detta ämne, och ett räknare över nya svar visas."},"tracking_pm":{"title":"Följer","description":"En räknare över antal nya svar visas för detta ämne. Du aviseras om någon nämner ditt @namn eller svarar dig."},"tracking":{"title":"Följer","description":"En räknare över antal nya svar visas för detta ämne. Du aviseras om någon nämner ditt @namn eller svarar dig."},"regular":{"title":"Normal","description":"Du aviseras om någon nämner ditt @namn eller svarar dig."},"regular_pm":{"title":"Normal","description":"Du kommer att aviseras om någon nämner ditt @namn eller svarar dig."},"muted_pm":{"title":"Tystat","description":"Du kommer aldrig att aviseras om något gällande detta ämne."},"muted":{"title":"Tystat","description":"Du kommer aldrig att aviseras om någonting som rör det här ämnet, och det kommer inte att visas i din flik med senaste."}},"actions":{"title":"Åtgärder","recover":"Återställ ämne","delete":"Radera ämne","open":"Öppna ämne","close":"Stäng ämne","multi_select":"Välj inlägg...","slow_mode":"Ställ in långsamt läge","timed_update":"Sätt tidtagning för ämne...","pin":"Fäst ämne...","unpin":"Ta ner ämne...","unarchive":"Dearkivera ämne","archive":"Arkivera ämne","invisible":"Markera som olistad","visible":"Markera som listad","reset_read":"Återställ läsdata","make_public":"Skapa allmänt ämne","make_private":"Skapa personligt meddelande","reset_bump_date":"Återställ knuffdatum"},"feature":{"pin":"Fäst ämne","unpin":"Ta ner ämne","pin_globally":"Fäst ämne globalt","make_banner":"Gör ämne till banderoll","remove_banner":"Ta bort banderollämne"},"reply":{"title":"Svara","help":"Börja komponera ett svar på detta ämne"},"clear_pin":{"title":"Ta bort nål","help":"Ta bort den fästa statusen från detta ämne så den inte längre hamnar i toppen av din ämneslista"},"share":{"title":"Dela","extended_title":"Dela en länk","help":"dela en länk till detta ämne"},"print":{"title":"Skriv ut","help":"Öppna en utskriftsvänlig version av det här ämnet"},"flag_topic":{"title":"Flagga","help":"flagga privat detta ämne för uppmärksamhet eller skicka en privat avisering om det","success_message":"Du flaggade framgångsrikt detta ämne."},"make_public":{"title":"Konvertera till offentligt ämne","choose_category":"Välj en kategori för det offentliga ämnet:"},"feature_topic":{"title":"Gör till utvalt ämne","pin":"Gör det här ämnet synligt i toppen av %{categoryLink} kategorin tills","unpin":"Ta bort detta ämne från toppen av kategorin %{categoryLink}.","unpin_until":"Radera det här ämnet från toppen av %{categoryLink} kategorin eller vänta tills \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Användare kan själva ta ner ämnet individuellt.","pin_validation":"Ett datum krävs för att fästa det här ämnet.","not_pinned":"Det finns inga fästa ämnen i %{categoryLink}.","already_pinned":{"one":"Nuvarande antal ämnen som har fästs i %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Nuvarande antal ämnen som har fästs i %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Gör det här ämnet synligt i toppen av alla ämneslistor tills","confirm_pin_globally":{"one":"Du har redan %{count} globalt fäst ämne. För många fästa ämnen kan vara störande för nya och anonyma användare. Är du säker på att du vill fästa ytterligare ett ämne globalt?","other":"Du har redan %{count} globalt fästa ämnen. För många fästa ämnen kan vara störande för nya och anonyma användare. Är du säker på att du vill fästa ytterligare ett ämne globalt?"},"unpin_globally":"Ta bort detta ämne från toppen av alla ämneslistor.","unpin_globally_until":"Ta bort det här ämnet från toppen av alla ämneslistor eller vänta tills \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Användare kan själva ta ner ämnet individuellt.","not_pinned_globally":"Det finns inga globalt fästa ämnen.","already_pinned_globally":{"one":"Nuvarande antal ämnen som har fästs globalt: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Nuvarande antal ämnen som har fästs globalt: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Gör detta ämne till en banderoll som dyker upp i toppen av alla sidor.","remove_banner":"Ta bort banderollen som dyker upp i toppen av alla sidor.","banner_note":"Användare kan avfärda banderollen genom att stänga den. Endast ett ämne kan agera banderoll åt gången.","no_banner_exists":"Det finns inget banderollämne.","banner_exists":"Det \u003cstrong class='badge badge-notification unread'\u003efinns\u003c/strong\u003e för närvarande ett banderollämne."},"inviting":"Bjuder in...","automatically_add_to_groups":"Den här inbjudan inkluderar också åtkomst till de här grupperna:","invite_private":{"title":"Inbjudan till meddelande","email_or_username":"Den inbjudnas e-postadress eller användarnamn","email_or_username_placeholder":"e-postadress eller användarnamn","action":"Bjud in","success":"Vi har bjudit in användaren till att delta i det här meddelandet.","success_group":"Vi har bjudit in gruppen till att delta i det här meddelandet.","error":"Tyvärr uppstod det ett fel under inbjudandet av den användaren.","not_allowed":"Tyvärr kan den användaren inte bjudas in.","group_name":"gruppnamn"},"controls":"Ämneskontroller","invite_reply":{"title":"Bjud in","username_placeholder":"användarnamn","action":"Skicka inbjudan","help":"bjud in andra till detta ämne via e-post eller aviseringar","to_forum":"Vi skickar ett kort e-postmeddelande så att din vän omedelbart kan delta genom att klicka på en länk.","discourse_connect_enabled":"Ange användarnamnet för personen som du vill bjuda in till detta ämne.","to_topic_blank":"Ange användarnamnet eller e-postadressen för personen som du vill bjuda in till detta ämne.","to_topic_email":"Du har angett en e-postadress. Vi skickar en inbjudan som ger din vän möjlighet att svara på detta ämne direkt.","to_topic_username":"Du har angett ett användarnamn. Vi skickar en avisering med en länk som bjuder in din vän till detta ämne.","to_username":"Ange användarnamnet för personen du vill bjuda in. Vi skickar en avisering med en länk som bjuder in din vän till detta ämne.","email_placeholder":"namn@exampel.se","success_email":"Vi skickade en inbjudan till \u003cb\u003e%{invitee}\u003c/b\u003e. Vi meddelar dig när inbjudan har lösts in. Kolla inbjudningsfliken på din användarsida för att hålla reda på dina inbjudningar.","success_username":"Vi har bjudit in användaren till att delta i detta ämne.","error":"Tyvärr kunde vi inte bjuda in den personen. Kanske har personen redan blivit inbjuden? (inbjudningar är begränsade)","success_existing_email":"Det finns redan en användare med e-postadressen \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. Vi kommer att bjuda in denna person till att delta i detta ämne."},"login_reply":"Logga in för att svara","filters":{"n_posts":{"one":"%{count} inlägg","other":"%{count} inlägg"},"cancel":"Ta bort filter"},"move_to":{"title":"Flytta till","action":"flytta till","error":"Det uppstod ett fel vid flyttning av inlägg."},"split_topic":{"title":"Flytta till nytt ämne","action":"flytta till nytt ämne","topic_name":"Ny ämnestitel","radio_label":"Nytt ämne","error":"Ett fel inträffade då inläggen skulle flyttas till det nya ämnet.","instructions":{"one":"Du är på väg att skapa ett nytt ämne och lägga inlägget som du har valt i det.","other":"Du är på väg att skapa en nytt ämne och lägga de \u003cb\u003e%{count}\u003c/b\u003e inlägg som du har valt i det."}},"merge_topic":{"title":"Flytta till befintligt ämne","action":"flytta till befintligt ämne","error":"Ett fel inträffade då inlägg skulle flyttas till det ämnet.","radio_label":"Befintligt ämne","instructions":{"one":"Välj vilket ämne du vill flytta det inlägget till.","other":"Välj vilket ämne du vill flytta de \u003cb\u003e%{count}\u003c/b\u003e inläggen till."}},"move_to_new_message":{"title":"Flytta till nytt meddelande","action":"flytta till nytt meddelande","message_title":"Titel på nytt meddelande","radio_label":"Nytt meddelande","participants":"Deltagare","instructions":{"one":"Du håller på att skapa ett nytt meddelande och tillföra det inlägget som du valt.","other":"Du håller på att skapa ett nytt meddelande och tillföra de \u003cb\u003e%{count}\u003c/b\u003e inlägg som du har valt."}},"move_to_existing_message":{"title":"Flytta till befintligt meddelande","action":"flytta till befintligt meddelande","radio_label":"Befintligt meddelande","participants":"Deltagare","instructions":{"one":"Välj det meddelande som du vill flytta detta inlägg till.","other":"Välj det meddelande som du vill flytta dessa \u003cb\u003e%{count}\u003c/b\u003e inlägg till."}},"merge_posts":{"title":"Sammanfoga markerade inlägg","action":"sammanfoga markerade inlägg","error":"Det uppstod ett fel vid sammanfogningen av de markerade inläggen."},"publish_page":{"title":"Sidpublicering","publish":"Publicera","description":"När ett ämne publiceras som en sida kan dess URL delas och det kommer att visas med anpassad utformning.","slug":"Slug","public":"Offentligt","public_description":"Folk kan se sidan även om kopplat ämne är privat.","publish_url":"Din sida har publicerats under:","topic_published":"Ditt ämne har publicerats under:","preview_url":"Din sida kommer att publiceras under:","invalid_slug":"Tyvärr kan du inte publicera denna sida.","unpublish":"Avpublicera","unpublished":"Din sida har blivit avpublicerad och är inte längre tillgänglig.","publishing_settings":"Inställningar för publicering"},"change_owner":{"title":"Byt ägare","action":"ändra ägare","error":"Ett fel uppstod vid ändringen av ämnets ägarskap.","placeholder":"användarnamn på den nya ägaren","instructions":{"one":"Välj en ny ägare för inlägget från \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Välj en ny ägare för %{count} inlägg från \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Välj en ny ägare för inlägget","other":"Välj en ny ägare för de %{count} inläggen"}},"change_timestamp":{"title":"Ändra tidsstämpel...","action":"ändra tidsstämpeln","invalid_timestamp":"Tidsstämpeln kan inte ställas in till ett framtida datum.","error":"Ett fel uppstod vid ändringen av ämnets tidsstämpel.","instructions":"Välj en ny tidsstämpel för ämnet. Inlägg i det här ämnet kommer att uppdateras för att ha samma tidsskillnad."},"multi_select":{"select":"markera","selected":"markerade (%{count})","select_post":{"label":"markera","title":"Lägg till inlägg för markerad"},"selected_post":{"label":"markerad","title":"Klicka för att ta bort inlägg från markering"},"select_replies":{"label":"välj +svar","title":"Lägg till inlägg samt alla tillhörande svar till markering"},"select_below":{"label":"välj +nedanför","title":"Lägg till inlägg, samt allting efter det, till markering"},"delete":"radera markerade","cancel":"avbryt markering","select_all":"markera alla","deselect_all":"avmarkera alla","description":{"one":"Du har markerat \u003cb\u003e%{count}\u003c/b\u003e inlägg.","other":"Du har markerat \u003cb\u003e%{count}\u003c/b\u003e inlägg."}},"deleted_by_author":{"one":"(ämne tillbakadraget av författaren, kommer att raderas automatiskt om %{count} timme om det inte flaggas)","other":"(ämne tillbakadraget av författaren, kommer att raderas automatiskt om %{count} timmar om det inte flaggas)"}},"post":{"quote_reply":"Citat","quote_share":"Dela","edit_reason":"Anledning: ","post_number":"inlägg %{number}","ignored":"Ignorerat innehåll","wiki_last_edited_on":"wiki redigerades senast den %{dateTime}","last_edited_on":"inlägget redigerades senast den %{dateTime}","reply_as_new_topic":"Svara som länkat ämne","reply_as_new_private_message":"Svara som nytt meddelande till samma mottagare","continue_discussion":"Fortsätter diskussionen från %{postLink}:","follow_quote":"gå till det citerade inlägget","show_full":"Visa hela inlägget","show_hidden":"Visa ignorerat innehåll","deleted_by_author":{"one":"(inlägg tillbakadraget av skaparen, kommer att raderas automatiskt om %{count} timme om det inte flaggas)","other":"(inlägg tillbakadraget av skaparen, kommer att raderas automatiskt om %{count} timmar om det inte flaggas)"},"collapse":"förminska","expand_collapse":"utvidga/förminska","locked":"en i personalen har låst detta inlägg från att redigeras","gap":{"one":"visa %{count} dolt svar","other":"visa %{count} dolda svar"},"notice":{"new_user":"Detta är första gången som användaren %{user} har skapat ett inlägg — låt oss välkomna hen till vår gemenskap!","returning_user":"Det var ett tag sedan vi såg %{user} — senaste inlägget gjordes %{time}."},"unread":"Inlägget är oläst","has_replies":{"one":"%{count} svar","other":"%{count} svar"},"has_replies_count":"%{count}","unknown_user":"(okänd/raderad användare)","has_likes_title":{"one":"%{count} person gillade detta inlägg","other":"%{count} personer gillade detta inlägg"},"has_likes_title_only_you":"du gillade det här inlägget","has_likes_title_you":{"one":"du och %{count} annan person gillade det här inlägget","other":"du och %{count} andra personer gillade det här inlägget"},"filtered_replies_hint":{"one":"Visa detta inlägg och dess svar","other":"Visa detta inlägg och dess %{count} svar"},"filtered_replies_viewing":{"one":"Visar %{count} svar på","other":"Visar %{count} svar på"},"in_reply_to":"Ladda överordnat inlägg","view_all_posts":"Visa alla inlägg","errors":{"create":"Tyvärr uppstod det ett fel under skapandet av ditt inlägg. Vi ber dig försöka igen.","edit":"Tyvärr uppstod det ett fel under ändringen av ditt inlägg. Vi ber dig försöka igen.","upload":"Tyvärr uppstod det ett fel under uppladdandet av den filen. Vi ber dig försöka igen.","file_too_large":"Tyvärr är den filen för stor (maximal filstorlek är %{max_size_kb}kb). Varför inte ladda upp din stora fil till en moln-delningstjänst och sedan dela länken?","too_many_uploads":"Tyvärr kan du bara ladda upp en bild i taget.","too_many_dragged_and_dropped_files":{"one":"Tyvärr kan du bara ladda upp %{count} fil åt gången.","other":"Tyvärr kan du bara ladda upp %{count} filer åt gången."},"upload_not_authorized":"Tyvärr tillåts inte filen som du försöker ladda upp (tillåtna filtyper: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Tyvärr kan nya användare inte ladda upp bilder.","attachment_upload_not_allowed_for_new_user":"Tyvärr kan nya användare inte bifoga filer.","attachment_download_requires_login":"Tyvärr måste du vara inloggad för att kunna ladda ned bifogade filer."},"abandon_edit":{"confirm":"Är du säker på att du vill ångra dina ändringar?","no_value":"Nej, behåll","no_save_draft":"Nej, spara utkast","yes_value":"Ja, kasta ändringar"},"abandon":{"title":"Överge utkast","confirm":"Är du säker på att du vill avbryta ditt inlägg?","no_value":"Nej, behåll","no_save_draft":"Nej, spara utkast","yes_value":"Ja, överge"},"via_email":"det här inlägget har gjorts via e-post","via_auto_generated_email":"det här inlägget kom i ett autogenererat e-postmeddelande","whisper":"det här inlägget är en privat viskning för moderatorer","wiki":{"about":"detta inlägg är en wiki"},"archetypes":{"save":"Spara inställningar"},"few_likes_left":"Tack för att du sprider kärleken! Du har bara några få gillningar kvar idag.","controls":{"reply":"börja skriva ett svar på detta inlägg","like":"gilla detta inlägg","has_liked":"du har gillat detta inlägg","read_indicator":"användare som läser detta inlägg","undo_like":"ångra gillning","edit":"ändra detta inlägg","edit_action":"Redigera","edit_anonymous":"Tyvärr måste du vara inloggad för att kunna redigera det här inlägget.","flag":"flagga detta inlägg privat för uppmärksamhet eller skicka en privat påminnelse om det","delete":"radera detta inlägg","undelete":"återställ detta inlägg","share":"dela en länk till detta inlägg","more":"Mer","delete_replies":{"confirm":"Vill du också radera svaren för detta inlägg?","direct_replies":{"one":"Ja, och %{count} direkt svar","other":"Ja, och %{count} direkta svar"},"all_replies":{"one":"Ja, och %{count} svar","other":"Ja, och alla %{count} svaren"},"just_the_post":"Nej, bara det här inlägget"},"admin":"administratörsåtgärder för inlägg","wiki":"Skapa wiki","unwiki":"Ta bort wiki","convert_to_moderator":"Lägg till personalfärg","revert_to_regular":"Ta bort personalfärg","rebake":"Generera HTML","publish_page":"Sidpublicering","unhide":"Visa","change_owner":"Ändra ägare","grant_badge":"Utfärda utmärkelse","lock_post":"Lås inlägg","lock_post_description":"förhindra att postaren redigerar inlägget","unlock_post":"Lås upp inlägg","unlock_post_description":"tillåt att postaren redigerar inlägget","delete_topic_disallowed_modal":"Du har inte behörighet att radera detta ämne. Om du verkligen vill radera det, skapa en flagga för att uppmärksamma moderatorn tillsammans med orsak.","delete_topic_disallowed":"du har inte behörighet att radera detta ämne","delete_topic_confirm_modal":{"one":"Detta ämne har för närvarande över %{count} visning och kan vara ett populärt sökmål. Är du säker på att du vill ta bort det här ämnet helt, istället för att redigera det för att förbättra det?","other":"Detta ämne har för närvarande över %{count} visningar och kan vara ett populärt sökmål. Är du säker på att du vill ta bort det här ämnet helt, istället för att redigera det för att förbättra det?"},"delete_topic_confirm_modal_yes":"Ja, ta bort det här ämnet","delete_topic_confirm_modal_no":"Nej, behåll detta ämne","delete_topic_error":"Ett fel inträffade när det här ämnet togs bort","delete_topic":"ta bort ämne","add_post_notice":"Lägg till personalnotering","change_post_notice":"Ändra personalnotering","delete_post_notice":"Radera personalnotering","remove_timer":"Ta bort tidtagning","edit_timer":"redigera timer"},"actions":{"people":{"like":{"one":"gillade det här","other":"gillade det här"},"read":{"one":"läste detta","other":"läste detta"},"like_capped":{"one":"och %{count} annan gillade detta","other":"och %{count} andra gillade detta"},"read_capped":{"one":"och %{count} annan läste detta","other":"och %{count} andra läste detta"}},"by_you":{"off_topic":"Du flaggade detta som irrelevant","spam":"Du flaggade detta som skräppost","inappropriate":"Du flaggade detta som olämpligt","notify_moderators":"Du flaggade det för moderation.","notify_user":"Du skickade ett meddelande till denna användare"}},"delete":{"confirm":{"one":"Är du säker på att du vill radera detta inlägg?","other":"Är du säker på att du vill radera dessa %{count} inlägg?"}},"merge":{"confirm":{"one":"Är du säker på att du vill slå ihop dessa inlägg?","other":"Är du säker på att du vill sammanfoga de %{count} inläggen?"}},"revisions":{"controls":{"first":"Första version","previous":"Föregående version","next":"Nästa version","last":"Senaste versionen","hide":"Göm version","show":"Visa version","revert":"Återgå till version %{revision}","edit_wiki":"Uppdatera Wiki","edit_post":"Ändra inlägg","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e%{icon}\u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Visa resultat med tillägg och borttagningar inbäddade","button":"HTML"},"side_by_side":{"title":"Visa skillnader i renderad utmatning sida vid sida","button":"HTML"},"side_by_side_markdown":{"title":"Visa skillnader i rådatan sida vid sida","button":"Rå"}}},"raw_email":{"displays":{"raw":{"title":"Visa e-post utan formatering","button":"Rå"},"text_part":{"title":"Visa e-postmeddelandets textdel","button":"Text"},"html_part":{"title":"Visa e-postmeddelandets html-del","button":"HTML"}}},"bookmarks":{"create":"Skapa bokmärke","edit":"Redigera bokmärke","created":"Skapade","updated":"Uppdaterade","name":"Namn","name_placeholder":"Vad används detta bokmärke till?","set_reminder":"Påminn mig","actions":{"delete_bookmark":{"name":"Radera bokmärke","description":"Tar bort bokmärket från din profil och stoppar alla påminnelser för bokmärket."},"edit_bookmark":{"name":"Redigera bokmärke","description":"Redigera bokmärkets namn eller ändra påminnelsens datum och tid."}}},"filtered_replies":{"viewing_posts_by":"Visar %{post_count} inlägg av","viewing_subset":"Vissa svar har förminskats","viewing_summary":"Visar en sammanfattning av detta ämne","post_number":"%{username}, inlägg nr %{post_number}","show_all":"Visa alla"}},"category":{"can":"can\u0026hellip; ","none":"(ingen kategori)","all":"Alla kategorier","choose":"kategori\u0026hellip;","edit":"Redigera","edit_dialog_title":"Ändra: %{categoryName}","view":"Visa ämnen i kategori","back":"Tillbaka till kategorin","general":"Allmänt","settings":"Inställningar","topic_template":"Ämnesmall","tags":"Taggar","tags_allowed_tags":"Begränsa dessa taggar till följande kategori:","tags_allowed_tag_groups":"Begränsa dessa tagg-grupper till denna kategori:","tags_placeholder":"(Valfri) lista över tillåtna taggar","tags_tab_description":"Taggar och tagg-grupper som specificerats ovan kommer enbart att vara tillgängliga för denna kategori samt andra kategorier som också har specificerat dem. De kommer inte att vara tillgängliga i övriga kategorier.","tag_groups_placeholder":"(Valfri) lista över tillåtna grupptaggar","manage_tag_groups_link":"Hantera tagg-grupper","allow_global_tags_label":"Tillåt även andra taggar","tag_group_selector_placeholder":"(Valfri) tagg-grupp","required_tag_group_description":"Kräv att nya ämnen har taggar från en tagg-grupp:","min_tags_from_required_group_label":"Nummer-taggar:","required_tag_group_label":"Tagg-grupp:","topic_featured_link_allowed":"Tillåt utvalda länkar i denna kategori","delete":"Radera kategori","create":"Ny kategori","create_long":"Skapa en ny kategori","save":"Spara kategori","slug":"Kategori-etikett","slug_placeholder":"(Valfritt) streckade ord för url","creation_error":"Det uppstod ett fel när kategorin skulle skapas.","save_error":"Ett fel inträffade då kategorin skulle sparas.","name":"Kategorinamn","description":"Beskrivning","topic":"kategoriämne","logo":"Kategori logotypbild","background_image":"Kategori bakgrundsbild","badge_colors":"Utmärkelsefärg","background_color":"Bakgrundsfärg","foreground_color":"Förgrundsfärg","name_placeholder":"Ett eller två ord max","color_placeholder":"Någon webbfärg","delete_confirm":"Är du säker på att du vill radera den kategorin?","delete_error":"Ett fel inträffade vid borttagning av kategorin.","list":"Lista kategorier","no_description":"Lägg till en beskrivning för den här kategorin.","change_in_category_topic":"Redigera beskrivning","already_used":"Den här färgen används redan av en annan kategori","security":"Säkerhet","security_add_group":"Lägg till en grupp","permissions":{"group":"Grupp","see":"Se","reply":"Svara","create":"Skapa","no_groups_selected":"Inga grupper har beviljats åtkomst; denna kategori kommer endast att vara synlig för personalen.","everyone_has_access":"Denna kategori är offentlig och alla kan se, besvara och skapa inlägg. Om du vill begränsa behörigheterna tar du bort en eller flera av de behörigheter som tilldelats till gruppen ”alla”.","toggle_reply":"Slå på/av behörighet att svara","toggle_full":"Slå på/av behörighet att skapa","inherited":"Denna behörighet ärvs från \"alla\""},"special_warning":"Varning: Den här kategorin är en förutbestämd kategori och säkerhetsinställningarna kan inte ändras. Om du inte vill använda kategorin tar du bort den istället för att återanvända den.","uncategorized_security_warning":"Denna kategori är speciell. Den är avsedd för att innehålla ämnen som saknar kategori. Den kan inte ha säkerhetsinställningar.","uncategorized_general_warning":"Denna kategori är speciell. Den används som standardkategori för nya ämnen som inte har en vald kategori. Om du vill förhindra detta beteende och tvinga val av kategori \u003ca href=\"%{settingLink}\"\u003einaktiverar du inställningen här\u003c/a\u003e. Om du vill ändra namn eller beskrivning går du till \u003ca href=\"%{customizeLink}\"\u003eAnpassa / Textinnehåll\u003c/a\u003e.","pending_permission_change_alert":"Du har inte lagt till %{group} för denna kategori. Klicka på följande knapp för att lägga till den.","images":"Bilder","email_in":"Egenvald inkommande e-postadress:","email_in_allow_strangers":"Ta emot e-post från anonyma användare utan konton","email_in_disabled":"Att skapa nya ämnen via e-post är inaktiverat i webbplatsinställningarna. För att aktivera ämnen skapade via e-post ","email_in_disabled_click":"aktiverar du inställningen \"inkommande e-post\".","mailinglist_mirror":"Kategorin speglar en e-postlista","show_subcategory_list":"Visa listan med underkategorier ovanför ämnen i denna kategori.","read_only_banner":"Banderolltext när en användare inte kan skapa ett ämne i denna kategori:","num_featured_topics":"Antal ämnen som visas på sidan kategorier:","subcategory_num_featured_topics":"Antalet föredragna ämnen på överordnad kategorisida:","all_topics_wiki":"Gör nya ämnen till wikis som standard","subcategory_list_style":"Liststil på underkategori:","sort_order":"Sortera ämneslista enligt:","default_view":"Förvald ämneslista","default_top_period":"Standardtopperiod:","default_list_filter":"Standardlistfilter:","allow_badges_label":"Tillåt utmärkelser i den här kategorin","edit_permissions":"Redigera behörigheter","reviewable_by_group":"Förutom av personal kan innehåll i denna kategori också granskas av:","review_group_name":"gruppnamn","require_topic_approval":"Kräv att en moderator godkänner alla nya ämnen","require_reply_approval":"Kräv att en moderator godkänner alla nya svar","this_year":"i år","position":"Position på kategorisidan:","default_position":"Standardposition","position_disabled":"Kategorier kommer att sorteras efter sin aktivitet. För att ställa in sorteringen av kategorier i den här listan ","position_disabled_click":"aktiverar du inställningen \"fasta kategoripositioner\".","minimum_required_tags":"Minsta antalet taggar som krävs för ett ämne:","parent":"Överordnad kategori","num_auto_bump_daily":"Antalet öppnade ämnen för att dagligen automatiskt knuffa ett ämne:","navigate_to_first_post_after_read":"Navigera till första inlägget efter att ämnen är lästa","notifications":{"watching":{"title":"Bevakar","description":"Du kommer automatiskt att bevaka alla ämnen i den här kategorin. Du aviseras om varje nytt inlägg i alla ämnen, och det visas en räknare över antalet nya svar."},"watching_first_post":{"title":"Bevakar första inlägget","description":"Du kommer att aviseras vid nya ämnen för denna kategori, men inte svar på ämnen."},"tracking":{"title":"Följer","description":"Du kommer automatiskt att följa alla ämnen i den här kategorin. Du aviseras om någon nämner ditt @namn eller svarar på ditt inlägg, och det visas en räknare över antalet nya svar."},"regular":{"title":"Normal","description":"Du aviseras om någon nämner ditt @namn eller svarar på ditt inlägg."},"muted":{"title":"Tystad","description":"Du kommer aldrig att aviseras om något som rör nya ämnen i den här kategorin och de kommer inte att dyka upp i senaste."}},"search_priority":{"label":"Sökprioritering","options":{"normal":"Normal","ignore":"Ignorera","very_low":"Väldigt låg","low":"Låg","high":"Hög","very_high":"Väldigt hög"}},"sort_options":{"default":"Standard","likes":"Gillar","op_likes":"Ursprungliga inläggets gillningar","views":"Visningar","posts":"Inlägg","activity":"Aktivitet","posters":"Inläggsförfattare","category":"Kategori","created":"Skapad"},"sort_ascending":"Stigande","sort_descending":"Fallande","subcategory_list_styles":{"rows":"Rader","rows_with_featured_topics":"Rader med utvalda ämnen","boxes":"Boxar","boxes_with_featured_topics":"Boxar med utvalda ämnen"},"settings_sections":{"general":"Allmänt","moderation":"Moderering","appearance":"Utseende","email":"E-post"},"list_filters":{"all":"alla ämnen","none":"inga underkategorier"},"colors_disabled":"Du kan inte välja färger eftersom du inte har någon kategoristil."},"flagging":{"title":"Tack för att du hjälper till att hålla forumet civiliserat!","action":"Flagga inlägg","take_action":"Åtgärda...","take_action_options":{"default":{"title":"Åtgärda","details":"Nå flaggtröskeln omedelbart, istället för att vänta på fler flaggor från forumets användare"},"suspend":{"title":"Stäng av användaren","details":"Nå flaggtröskeln och stäng av användaren"},"silence":{"title":"Tysta användaren","details":"Nå flaggtröskeln och tysta användaren"}},"notify_action":"Meddelande","official_warning":"Officiell varning","delete_spammer":"Radera skräppostare","flag_for_review":"Flagga inlägg","yes_delete_spammer":"Ja, radera skräppostare","ip_address_missing":"(---)","hidden_email_address":"(dold)","submit_tooltip":"Använd den privata flaggan","take_action_tooltip":"Nå flaggränsen omedelbart, snarare än att vänta på mer flaggor från användarna","cant":"Tyvärr, du kan inte flagga detta inlägg just nu.","notify_staff":"Avisera personal privat","formatted_name":{"off_topic":"Det är irrelevant","inappropriate":"Det är olämpligt","spam":"Det är skräppost"},"custom_placeholder_notify_user":"Var specifik, var konstruktiv och var alltid trevlig.","custom_placeholder_notify_moderators":"Låt oss veta i detalj vad du är bekymrad över, och skicka om möjligt med relevanta länkar och exempel.","custom_message":{"at_least":{"one":"skriv åtminstone %{count} tecken","other":"skriv åtminstone %{count} tecken"},"more":{"one":"%{count} till...","other":"%{count} till..."},"left":{"one":"%{count} kvar","other":"%{count} kvar"}}},"flagging_topic":{"title":"Tack för att du hjälper oss hålla forumet civiliserat!","action":"Flagga ämne","notify_action":"Meddelande"},"topic_map":{"title":"Sammanfattning av ämne","participants_title":"Flitiga skribenter","links_title":"Populära länkar","links_shown":"visa fler länkar...","clicks":{"one":"%{count} klick","other":"%{count} klick"}},"post_links":{"about":"utvidga fler länkar för det här inlägget","title":{"one":"%{count} mer","other":"%{count} mer"}},"topic_statuses":{"warning":{"help":"Det här är en officiell varning."},"bookmarked":{"help":"Du bokmärkte detta ämne"},"locked":{"help":"Det här ämnet är stängt; det går inte längre att svara på inlägg"},"archived":{"help":"Det här ämnet är arkiverat; det är fryst och kan inte ändras"},"locked_and_archived":{"help":"Det här ämnet är stängt och arkiverat; det går inte längre att svara eller ändra"},"unpinned":{"title":"Nedtaget","help":"Detta ämne är nedtaget för dig; det visas i vanlig ordning"},"pinned_globally":{"title":"Fäst globalt","help":"Det här ämnet är fäst globalt; det kommer att visas högst upp i senaste och i dess kategori"},"pinned":{"title":"Fäst","help":"Detta ämne är fäst för dig. Det visas i toppen av dess kategori"},"unlisted":{"help":"Det här ämnet är olistat; det kommer inte att visas i ämneslistorna och kan bara nås via en direktlänk"},"personal_message":{"title":"Detta ämne är ett personligt meddelande","help":"Detta ämne är ett personligt meddelande"}},"posts":"Inlägg","original_post":"Originalinlägg","views":"Visningar","views_lowercase":{"one":"visning","other":"visningar"},"replies":"Svar","views_long":{"one":"Detta ämnet har visats %{count} gång","other":"Detta ämne har visats %{number} gånger"},"activity":"Aktivitet","likes":"Gillningar","likes_lowercase":{"one":"gillar","other":"gillar"},"users":"Användare","users_lowercase":{"one":"användare","other":"användare"},"category_title":"Kategori","history":"Historik","changed_by":"av %{author}","raw_email":{"title":"Inkommande e-post","not_available":"Ej tillgänglig!"},"categories_list":"Kategorilista","filters":{"with_topics":"%{filter} ämnen","with_category":"%{filter} %{category} ämnen","latest":{"title":"Senaste","title_with_count":{"one":"Senaste (%{count})","other":"Senaste (%{count})"},"help":"ämnen med nya inlägg"},"read":{"title":"Lästa","help":"ämnen du har läst, i den ordningen du senast läste dem"},"categories":{"title":"Kategorier","title_in":"Kategori - %{categoryName}","help":"alla ämnen grupperade efter kategori"},"unread":{"title":"Olästa","title_with_count":{"one":"Oläst (%{count})","other":"Olästa (%{count})"},"help":"ämnen som du bevakar eller följer med olästa inlägg","lower_title_with_count":{"one":"%{count} oläst","other":"%{count} olästa"}},"new":{"lower_title_with_count":{"one":"%{count} ny","other":"%{count} nya"},"lower_title":"ny","title":"Nya","title_with_count":{"one":"Ny (%{count})","other":"Nya (%{count})"},"help":"ämnen skapade de senaste dagarna"},"posted":{"title":"Mina inlägg","help":"ämnen som du har gjort inlägg i"},"bookmarks":{"title":"Bokmärken","help":"Ämnen du har bokmärkt"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"senaste ämnena i kategorin %{categoryName}"},"top":{"title":"Topp","help":"de mest aktiva ämnena senaste året, månaden, veckan eller dagen","all":{"title":"All tid"},"yearly":{"title":"Årsvis"},"quarterly":{"title":"Kvartalsvis"},"monthly":{"title":"Månadsvis"},"weekly":{"title":"Veckovis"},"daily":{"title":"Dagligen"},"all_time":"All tid","this_year":"År","this_quarter":"Kvartal","this_month":"Månad","this_week":"Vecka","today":"Idag","other_periods":"se toppen för:"}},"browser_update":"Tyvärr \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eär din webbläsare för gammal för att fungera på den här sidan\u003c/a\u003e. Vi ber dig \u003ca href=\"https://browsehappy.com\"\u003euppgradera din webbläsare\u003c/a\u003e för att visa formaterat innehåll, logga in eller svara.","permission_types":{"full":"Skapa / svara / se","create_post":"Svara / se","readonly":"Se"},"lightbox":{"download":"ladda ned","previous":"Föregående (Vänster piltangent)","next":"Nästa (höger piltangent)","counter":"%curr% av %total%","close":"Stäng (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eInnehållet\u003c/a\u003e kunde inte laddas.","image_load_error":"\u003ca href=\"%url%\"\u003eBilden\u003c/a\u003e kunde inte laddas."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} eller %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Tangentbordsgenvägar","jump_to":{"title":"Hoppa till","home":"%{shortcut} Hem","latest":"%{shortcut} Senaste","new":"%{shortcut} Nya","unread":"%{shortcut} Olästa","categories":"%{shortcut} Kategorier","top":"%{shortcut} Upp till toppen","bookmarks":"%{shortcut} Bokmärken","profile":"%{shortcut} Profil","messages":"%{shortcut} Meddelanden","drafts":"%{shortcut} Utkast","next":"%{shortcut} Nästa ämne","previous":"%{shortcut} Föregående ämne"},"navigation":{"title":"Navigering","jump":"%{shortcut} Gå till inlägg nr","back":"%{shortcut} Tillbaka","up_down":"%{shortcut} Flytta markering \u0026uarr; \u0026darr;","open":"%{shortcut} Öppna valt ämne","next_prev":"%{shortcut} Nästa/föregående avsnitt","go_to_unread_post":"%{shortcut} Gå till det första olästa inlägget"},"application":{"title":"Applikation","create":"%{shortcut} Skapa ett nytt ämne","notifications":"%{shortcut} Öppna aviseringar","hamburger_menu":"%{shortcut} Öppna hamburgarmenyn","user_profile_menu":"%{shortcut} Öppna användarmeny","show_incoming_updated_topics":"%{shortcut} Visa uppdaterade ämnen","search":"%{shortcut} Sök","help":"%{shortcut} Öppna tangentbordshjälp","dismiss_new_posts":"%{shortcut} Avfärda nya/inlägg","dismiss_topics":"%{shortcut} Avfärda ämnen","log_out":"%{shortcut} Logga ut"},"composing":{"title":"Skapar","return":"%{shortcut} Återgå till skaparen","fullscreen":"%{shortcut} Helskärmsläge för skaparen"},"bookmarks":{"title":"Bokmärkning","enter":"%{shortcut} Spara och stäng","later_today":"%{shortcut} Senare idag","later_this_week":"%{shortcut} Senare denna vecka","tomorrow":"%{shortcut} Imorgon","next_week":"%{shortcut} Nästa vecka","next_month":"%{shortcut} Nästa månad","next_business_week":"%{shortcut} I början på nästa vecka","next_business_day":"%{shortcut} Nästa vardag","custom":"%{shortcut} Anpassa datum och tid","none":"%{shortcut} Ingen påminnelse","delete":"%{shortcut} Radera bokmärke"},"actions":{"title":"Åtgärder","bookmark_topic":"%{shortcut} Växla bokmärkning av ämne","pin_unpin_topic":"%{shortcut} Fäst/ta ner ämne","share_topic":"%{shortcut} Dela ämne","share_post":"%{shortcut} Dela inlägg","reply_as_new_topic":"%{shortcut} Svara med länkat ämne","reply_topic":"%{shortcut} Svara på ämne","reply_post":"%{shortcut} Svara på inlägg","quote_post":"%{shortcut} Citera inlägg","like":"%{shortcut} Gilla inlägg","flag":"%{shortcut} Flagga inlägg","bookmark":"%{shortcut} Bokmärk inlägg","edit":"%{shortcut} Redigera inlägg","delete":"%{shortcut} Radera inlägg","mark_muted":"%{shortcut} Tysta ämne","mark_regular":"%{shortcut} Vanligt (standard) ämne","mark_tracking":"%{shortcut} Följ ämne","mark_watching":"%{shortcut} Bevaka ämne","print":"%{shortcut} Skriv ut ämne","defer":"%{shortcut} Skjut upp ämne","topic_admin_actions":"%{shortcut} Öppna administratörsåtgärder för ämne"},"search_menu":{"title":"Sökmeny","prev_next":"%{shortcut} Flytta markering upp eller ner","insert_url":"%{shortcut} Infoga urval i öppen redigerare"}},"badges":{"earned_n_times":{"one":"Förtjänade den här utmärkelsen %{count} gång","other":"Förtjänade den här utmärkelsen %{count} gånger"},"granted_on":"Utfärdad %{date}","others_count":"Andra med den här utmärkelsen (%{count})","title":"Utmärkelser","allow_title":"Du kan använda denna utmärkelse som en titel","multiple_grant":"Du kan förtjäna denna flera gånger","badge_count":{"one":"%{count} utmärkelse","other":"%{count} utmärkelser"},"more_badges":{"one":"+%{count} till","other":"+%{count} till"},"granted":{"one":"%{count} utfärdad","other":"%{count} utfärdade"},"select_badge_for_title":"Välj en utmärkelse att använda som din titel","none":"(ingen)","successfully_granted":"Beviljade %{badge} till %{username}","badge_grouping":{"getting_started":{"name":"Komma igång"},"community":{"name":"Community"},"trust_level":{"name":"Förtroendenivå"},"other":{"name":"Övrigt"},"posting":{"name":"Publicera inlägg"}}},"tagging":{"all_tags":"Alla taggar","other_tags":"Övriga taggar","selector_all_tags":"alla taggar","selector_no_tags":"inga taggar","changed":"taggar ändrade:","tags":"Taggar","choose_for_topic":"alternativa taggar","info":"Info","default_info":"Denna tagg är inte begränsad till någon kategori, och har inga synonymer.","category_restricted":"Denna tagg är begränsad till kategorier som du inte har tillträde till.","synonyms":"Synonymer","synonyms_description":"När följande taggar används, kommer de att ersättas med \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Denna tagg tillhör gruppen \"%{tag_groups}\".","other":"Denna tagg tillhör dessa grupper: %{tag_groups}."},"category_restrictions":{"one":"Den kan enbart användas i denna kategori:","other":"Den kan enbart användas i dessa kategorier:"},"edit_synonyms":"Hantera synonymer","add_synonyms_label":"Lägg till synonymer:","add_synonyms":"Lägg till","add_synonyms_explanation":{"one":"Varje plats som för närvarande använder denna tagg kommer att ändras till att använda \u003cb\u003e%{tag_name}\u003c/b\u003e istället. Är du säker på att du vill göra denna ändring?","other":"Varje plats som för närvarande använder dessa taggar kommer att ändras till att använda \u003cb\u003e%{tag_name}\u003c/b\u003e istället. Är du säker på att du vill göra denna ändring?"},"add_synonyms_failed":"Följande tagg kunde inte läggas till som synonym: \u003cb\u003e%{tag_names}\u003c/b\u003e. Försäkra dig om att den inte har synonymer eller är synonym för andra taggar.","remove_synonym":"Ta bort synonym","delete_synonym_confirm":"Är du säker på att du vill ta bort synonymen \"%{tag_name}\"?","delete_tag":"Radera tagg","delete_confirm":{"one":"Är du säker på att du vill radera denna tagg och ta bort den från %{count} ämne som den har tilldelats?","other":"Är du säker på att du vill radera denna tagg och ta bort den från %{count} ämnen som den har tilldelats?"},"delete_confirm_no_topics":"Är du säker på att du vill ta bort denna tagg?","delete_confirm_synonyms":{"one":"Dess synonym kommer också att raderas.","other":"Dess %{count} synonymer kommer också att raderas."},"rename_tag":"Döp om taggen","rename_instructions":"Välj ett nytt namn för taggen:","sort_by":"Sortera efter:","sort_by_count":"summa","sort_by_name":"namn","manage_groups":"Hantera tagggrupper","manage_groups_description":"Definiera grupper för att organisera taggar","upload":"Ladda upp taggar","upload_description":"Ladda upp en csv-fil för att skapa taggar på bulk.","upload_instructions":"En per rad, alternativt med en tagg-grupp i formatet 'tag_name,tag_group'.","upload_successful":"Lyckad uppladdning av taggar","delete_unused_confirmation":{"one":"%{count} tagg kommer att raderas: %{tags}","other":"%{count} taggar kommer att raderas: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} och %{count} till","other":"%{tags} och %{count} till"},"delete_no_unused_tags":"Det finns inga oanvända taggar.","tag_list_joiner":", ","delete_unused":"Radera oanvända taggar","delete_unused_description":"Radera alla taggar som inte är kopplade till något ämne eller personliga meddelanden","cancel_delete_unused":"Avbryt","filters":{"without_category":"%{filter} %{tag} ämnen","with_category":"%{filter} %{tag} ämnen i %{category}","untagged_without_category":"%{filter} otaggade ämnen","untagged_with_category":"%{filter} otaggade ämnen i %{category}"},"notifications":{"watching":{"title":"Bevakar","description":"Du kommer automatiskt att bevaka alla ämnen med den här taggen. Du kommer att få aviseringar om alla nya inlägg och ämnen, och en räknare över olästa och nya inlägg kommer att visas bredvid ämnet."},"watching_first_post":{"title":"Bevakar första inlägget","description":"Du kommer att aviseras vid nya ämnen för denna tagg, men inte vid svar på ämnen."},"tracking":{"title":"Följer","description":"Du kommer automatiskt följa alla ämnen med den här taggen. En räknare över olästa och nya inlägg kommer att visas bredvid ämnet."},"regular":{"title":"Vanlig","description":"Du aviseras om någon nämner ditt @namn eller svarar på ditt inlägg."},"muted":{"title":"Tystad","description":"Du aviseras inte om nya ämnen med den här taggen, och de kommer inte att visas på din \"oläst\"-flik."}},"groups":{"title":"Taggrupper","about":"Lägg till taggar i grupper för att lättare hantera dem.","new":"Ny grupp","tags_label":"Taggar i den här gruppen:","parent_tag_label":"Överordnad tagg:","parent_tag_description":"Taggar från den här gruppen kan inte användas om inte den överordnade taggen är med.","one_per_topic_label":"Sätt gränsen till en tagg per ämne för den här gruppen","new_name":"Ny tagg-grupp","name_placeholder":"Namn på taggrupp","save":"Spara","delete":"Radera","confirm_delete":"Är du säker på att du vill ta bort den här taggruppen?","everyone_can_use":"Taggar kan användas av alla","usable_only_by_groups":"Taggar är synliga för alla, men endast följande grupper kan använda dem","visible_only_to_groups":"Taggar är endast synliga för följande grupper"},"topics":{"none":{"unread":"Du har inga olästa ämnen.","new":"Du har inga nya ämnen.","read":"Du har inte lästa några ämnen ännu.","posted":"Du har inte skrivit i några ämnen ännu.","latest":"Det finns inga senaste ämnen.","bookmarks":"Du har inga bokmärkta ämnen ännu.","top":"Det finns inga toppämnen."}}},"invite":{"custom_message":"Gör din inbjudan lite personligare genom att skriva ett \u003ca href\u003eanpassat meddelande\u003c/a\u003e.","custom_message_placeholder":"Skriv ditt personliga meddelande","approval_not_required":"Användaren kommer automatiskt att godkännas så snart hon/han tackar ja till denna inbjudan.","custom_message_template_forum":"Hej! Du borde gå med i det här forumet!","custom_message_template_topic":"Hej! Jag tror att du kanske skulle uppskatta det här ämnet!"},"forced_anonymous":"På grund av extrem belastning, visas detta för samtliga precis som en utloggad användare skulle se det.","forced_anonymous_login_required":"Webbplatsen är under extrem belastning och kan inte laddas just nu, försök igen om några minuter.","footer_nav":{"back":"Tillbaka","forward":"Framåt","share":"Dela","dismiss":"Avfärda"},"safe_mode":{"enabled":"Säkert läge är aktiverat och för att lämna säkert läge stänger du detta webbläsarfönster"},"image_removed":"(bild borttagen)","do_not_disturb":{"title":"Stör ej för...","label":"Stör ej","remaining":"%{remaining} kvar","options":{"half_hour":"30 minuter","one_hour":"1 timme","two_hours":"2 timmar","tomorrow":"Tills imorgon","custom":"Anpassad"},"set_schedule":"Ange ett aviseringsschema"},"presence":{"replying":{"one":"svarar","other":"svarar"},"editing":{"one":"skriver","other":"skriver"},"replying_to_topic":{"one":"svarar","other":"svarar"}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Starta välkomsthandledningen för alla nya användare","welcome_message":"Skicka ett välkomstmeddelande med en snabbhandledning till alla nya användare"}},"details":{"title":"Dölj detaljer"},"cakeday":{"title":"Tårtdag","today":"Idag","tomorrow":"Imorgon","upcoming":"Kommande","all":"Alla"},"birthdays":{"title":"Födelsedagar","month":{"title":"Födelsedagar under månaden","empty":"Inga användare har födelsedag den här månaden."},"upcoming":{"title":"Födelsedagar %{start_date} - %{end_date}","empty":"Inga användare har födelsedag under de kommande sju dagarna."},"today":{"title":"Födelsedagar den %{date}","empty":"Inga användare har födelsedag idag."},"tomorrow":{"empty":"Inga användare har födelsedag imorgon."}},"anniversaries":{"title":"Årsdagar","month":{"title":"Årsdagar under månaden","empty":"Inga användare har sin årsdag den här månaden."},"upcoming":{"title":"Årsdagar %{start_date} - %{end_date}","empty":"Inga användare har sin årsdag under de kommande sju dagarna."},"today":{"title":"Årsdagar den %{date}","empty":"Inga användare har sin årsdag idag."},"tomorrow":{"empty":"Inga användare har sin årsdag imorgon."}},"discourse_local_dates":{"relative_dates":{"today":"Idag %{time}","tomorrow":"Imorgon %{time}","yesterday":"Igår %{time}","countdown":{"passed":"datumet har passerats"}},"title":"Ange datum/tid","create":{"form":{"insert":"Ange","advanced_mode":"Avancerat läge","simple_mode":"Enkelt läge","format_description":"Format som används för att visa datumet för användaren. Använd Z för att visa förskjutningen och zz för tidszonens namn.","timezones_title":"Tidszon att visa","timezones_description":"Tidszon kommer att användas för att visa datum i förhandsgranskning och reserv.","recurring_title":"Upprepning","recurring_description":"Ange upprepningen av en händelse. Du kan också manuellt redigera det återkommande alternativet som skapas av formuläret och använda en av följande nycklar: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","recurring_none":"Ingen upprepning","invalid_date":"Ogiltigt datum, kontrollera att datum och tid stämmer","date_title":"Datum","time_title":"Tid","format_title":"Datumformat","timezone":"Tidszon","until":"Tills...","recurring":{"every_day":"Varje dag","every_week":"Varje vecka","every_two_weeks":"Varannan vecka","every_month":"Varje månad","every_two_months":"Varannan månad","every_three_months":"Var tredje månad","every_six_months":"Var sjätte månad","every_year":"Varje år"}}}},"styleguide":{"title":"Stilguide","welcome":"Kom igång genom att välja ett avsnitt i menyn till vänster.","categories":{"atoms":"Atomer","molecules":"Molekyler","organisms":"Organismer"},"sections":{"typography":{"title":"Typografi","example":"Välkommen till Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Inmatad datum/tid"},"font_scale":{"title":"Teckensnittssystem"},"colors":{"title":"Färger"},"icons":{"title":"Ikoner","full_list":"Se hela listan över Font Awesome-ikoner"},"input_fields":{"title":"Inmatningsfält"},"buttons":{"title":"Knappar"},"dropdowns":{"title":"Rullgardinsmenyer"},"categories":{"title":"Kategorier"},"bread_crumbs":{"title":"Brödsmulor"},"navigation":{"title":"Navigering"},"navigation_bar":{"title":"Navigeringsfält"},"navigation_stacked":{"title":"Staplad navigering"},"categories_list":{"title":"Kategorilista"},"topic_link":{"title":"Ämneslänk"},"topic_list_item":{"title":"Punkt i ämneslista"},"topic_statuses":{"title":"Ämnesstatus"},"topic_list":{"title":"Ämneslista"},"basic_topic_list":{"title":"Grundläggande ämneslista"},"footer_message":{"title":"Sidfotsmeddelande"},"signup_cta":{"title":"Registrera CTA"},"topic_timer_info":{"title":"Ämnestidtagningar"},"topic_footer_buttons":{"title":"Sidfotsknappar för ämne"},"topic_notifications":{"title":"Ämnesaviseringar"},"post":{"title":"Inlägg"},"topic_map":{"title":"Ämneskarta"},"site_header":{"title":"Sajtens sidhuvud"},"suggested_topics":{"title":"Föreslagna ämnen"},"post_menu":{"title":"Inläggsmeny"},"modal":{"title":"Modal","header":"Modal titel","footer":"Modal sidfot"},"user_about":{"title":"Användares Om-ruta"},"header_icons":{"title":"Rubrikikoner"},"spinners":{"title":"Spinnare"}}},"poll":{"voters":{"one":"röst","other":"röster"},"total_votes":{"one":"totalt antal röst","other":"totalt antal röster"},"average_rating":"Medelbetyg: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Röster är \u003cstrong\u003eoffentliga\u003c/strong\u003e."},"results":{"groups":{"title":"Du måste vara medlem i %{groups} för att rösta i denna omröstning."},"vote":{"title":"Resultat kommer att visas vid \u003cstrong\u003eröstning\u003c/strong\u003e."},"closed":{"title":"Resultat kommer att visas när den\u003cstrong\u003estängts\u003c/strong\u003e."},"staff":{"title":"Resultatet visas enbart för medlemmar i \u003cstrong\u003epersonalen\u003c/strong\u003e."}},"multiple":{"help":{"at_least_min_options":{"one":"Välj minst \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ.","other":"Välj minst \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ."},"up_to_max_options":{"one":"Välj upp till \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ.","other":"Välj upp till \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ."},"x_options":{"one":"Välj \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ.","other":"Välj \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ."},"between_min_and_max_options":"Välj mellan \u003cstrong\u003e%{min}\u003c/strong\u003e och \u003cstrong\u003e%{max}\u003c/strong\u003e alternativ."}},"cast-votes":{"title":"Lägg dina röster","label":"Rösta nu!"},"show-results":{"title":"Visa omröstningsresultatet","label":"Visa resultat"},"hide-results":{"title":"Tillbaka till dina röster","label":"Visa röst"},"group-results":{"title":"Gruppera röster baserat på användarfält","label":"Visa uppdelning"},"export-results":{"title":"Exportera omröstningsresultatet","label":"Exportera"},"open":{"title":"Öppna omröstningen","label":"Öppna","confirm":"Är du säker på att du vill öppna denna omröstning?"},"close":{"title":"Stäng omröstningen","label":"Stäng","confirm":"Är du säker på att du vill stänga denna omröstning?"},"automatic_close":{"closes_in":"Stänger om \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Stängd \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Resultat av omröstning","votes":"%{count} röster","breakdown":"Fördelning","percentage":"Procent","count":"Räkna"},"error_while_toggling_status":"Tyvärr uppstod det ett fel vid ändring av status för den här omröstningen.","error_while_casting_votes":"Tyvärr uppstod det ett fel vid röstningen.","error_while_fetching_voters":"Tyvärr uppstod det ett fel vid visningen av röster.","error_while_exporting_results":"Tyvärr uppstod det ett fel vid export av omröstningsresultatet.","ui_builder":{"title":"Skapa omröstning","insert":"Lägg till omröstning","help":{"options_count":"Ange minst 1 alternativ","invalid_values":"Minimivärde måste vara mindre än det maximala värdet.","min_step_value":"Minsta stegintervall är 1"},"poll_type":{"label":"Typ","regular":"Ett val","multiple":"Flera val","number":"Sifferbetyg"},"poll_result":{"label":"Resultat","always":"Alltid synlig","vote":"Vid röstning","closed":"När stängd","staff":"Endast personal"},"poll_groups":{"label":"Tillåtna grupper"},"poll_chart_type":{"label":"Diagramtyp","bar":"Stapel","pie":"Cirkel"},"poll_config":{"max":"Max","min":"Min","step":"Steg"},"poll_public":{"label":"Visa vem som röstat"},"poll_title":{"label":"Titel (valfritt)"},"poll_options":{"label":"Ange ett omröstningsalternativ per rad"},"automatic_close":{"label":"Stäng omröstning automatiskt"}}}}},"en":{"js":{"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)"}},"user":{"invited":{"topic":"Topic"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"post":{"cancel_composer":{"confirm":"What would you like to do with your post?","discard":"Discard","save_draft":"Save draft for later","keep_editing":"Keep editing"},"bookmarks":{"actions":{"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}}},"category":{"topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"cakeday":{"none":" "}}}};
I18n.locale = 'sv';
I18n.pluralizationRules.sv = MessageFormat.locale.sv;
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
//! locale : Swedish [sv]
//! author : Jens Alm : https://github.com/ulmus

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var sv = moment.defineLocale('sv', {
        months: 'januari_februari_mars_april_maj_juni_juli_augusti_september_oktober_november_december'.split(
            '_'
        ),
        monthsShort: 'jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec'.split('_'),
        weekdays: 'söndag_måndag_tisdag_onsdag_torsdag_fredag_lördag'.split('_'),
        weekdaysShort: 'sön_mån_tis_ons_tor_fre_lör'.split('_'),
        weekdaysMin: 'sö_må_ti_on_to_fr_lö'.split('_'),
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'YYYY-MM-DD',
            LL: 'D MMMM YYYY',
            LLL: 'D MMMM YYYY [kl.] HH:mm',
            LLLL: 'dddd D MMMM YYYY [kl.] HH:mm',
            lll: 'D MMM YYYY HH:mm',
            llll: 'ddd D MMM YYYY HH:mm',
        },
        calendar: {
            sameDay: '[Idag] LT',
            nextDay: '[Imorgon] LT',
            lastDay: '[Igår] LT',
            nextWeek: '[På] dddd LT',
            lastWeek: '[I] dddd[s] LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: 'om %s',
            past: 'för %s sedan',
            s: 'några sekunder',
            ss: '%d sekunder',
            m: 'en minut',
            mm: '%d minuter',
            h: 'en timme',
            hh: '%d timmar',
            d: 'en dag',
            dd: '%d dagar',
            M: 'en månad',
            MM: '%d månader',
            y: 'ett år',
            yy: '%d år',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(\:e|\:a)/,
        ordinal: function (number) {
            var b = number % 10,
                output =
                    ~~((number % 100) / 10) === 1
                        ? ':e'
                        : b === 1
                        ? ':a'
                        : b === 2
                        ? ':a'
                        : b === 3
                        ? ':e'
                        : ':e';
            return number + output;
        },
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return sv;

})));

// moment-timezone-localization for lang code: sv

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidjan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Accra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Addis Abeba","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Alger","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamako","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Kairo","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Casablanca","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Ceuta","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Conakry","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Dar es-Salaam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Djibouti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"El-Aaiún","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Johannesburg","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Khartoum","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lomé","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaka","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadishu","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monrovia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairobi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"N’Djamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nouakchott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ouagadougou","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto-Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"São Tomé","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Tripoli","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Tunis","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Anguilla","id":"America/Anguilla"},{"value":"America/Antigua","name":"Antigua","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaína","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"La Rioja","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Río Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucumán","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Asunción","id":"America/Asuncion"},{"value":"America/Bahia","name":"Bahia","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahía de Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belém","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogotá","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancún","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Cayenne","id":"America/Cayenne"},{"value":"America/Cayman","name":"Caymanöarna","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Córdoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Costa Rica","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiabá","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Curaçao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominica","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepé","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"El Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Grenada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Guadeloupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Guatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guayaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Guyana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"Havanna","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianapolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Jamaica","id":"America/Jamaica"},{"value":"America/Jujuy","name":"San Salvador de Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"La Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Los Angeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceió","id":"America/Maceio"},{"value":"America/Managua","name":"Managua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinique","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlán","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Mérida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Mexiko City","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevideo","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"New York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Fernando de Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, North Dakota","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, North Dakota","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salem, North Dakota","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panama","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Port-au-Prince","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Port of Spain","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Puerto Rico","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Rio Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarém","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"São Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"S:t Barthélemy","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"S:t Johns","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"S:t Kitts","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"S:t Lucia","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"S:t Thomas","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"S:t Vincent","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Qaanaaq","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tortola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Casey","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Davis","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Dumont d’Urville","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Macquarie","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Mawson","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"McMurdo","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Palmer","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Rothera","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Syowa","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Troll","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Vostok","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Longyearbyen","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Aden","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Almaty","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Amman","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Anadyr","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Aktau","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Aqtöbe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Asjchabad","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Atyrau","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Bagdad","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrain","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Baku","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Bangkok","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Barnaul","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Beirut","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Bisjkek","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Brunei","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Kolkata","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Tjita","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Tjojbalsan","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Colombo","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Damaskus","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Dhaka","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Dili","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Dubai","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Dusjanbe","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Famagusta","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Gaza","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Hebron","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Hongkong","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Chovd","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Irkutsk","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Jakarta","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Jayapura","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Jerusalem","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Kabul","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Kamtjatka","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Karachi","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Katmandu","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Chandyga","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Krasnojarsk","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lumpur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Kuching","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Kuwait","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Macao","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Magadan","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Makassar","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Manilla","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Muskat","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nicosia","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Novokuznetsk","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Novosibirsk","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Omsk","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Oral","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Phnom Penh","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Pontianak","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Pyongyang","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Qatar","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Qyzylorda","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Rangoon","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Riyadh","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Ho Chi Minh-staden","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Sachalin","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarkand","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Söul","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Shanghai","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Singapore","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Srednekolymsk","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Taipei","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Tasjkent","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Tbilisi","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Teheran","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Thimphu","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tokyo","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Tomsk","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ulaanbaatar","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Ürümqi","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ust-Nera","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Vientiane","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Vladivostok","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Jakutsk","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Jekaterinburg","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Jerevan","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Azorerna","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermuda","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Kanarieöarna","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Kap Verde","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Torshamn","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Reykjavik","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Sydgeorgien","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"S:t Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Adelaide","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Brisbane","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Broken Hill","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Currie","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Darwin","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Eucla","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Hobart","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Lindeman","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Lord Howe","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Melbourne","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Perth","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Sydney","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Koordinerad universell tidUTC","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Amsterdam","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Andorra","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Astrakhan","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Aten","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Belgrad","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlin","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Bratislava","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Bryssel","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Bukarest","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budapest","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Büsingen am Hochrhein","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Chișinău","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Köpenhamn","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"irländsk sommartidDublin","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Gibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Guernsey","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsingfors","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Isle of Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istanbul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kaliningrad","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kiev","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Kirov","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Lissabon","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Ljubljana","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"brittisk sommartidLondon","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Luxemburg","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madrid","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Mariehamn","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Minsk","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Monaco","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Moskva","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Paris","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Podgorica","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Prag","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Rom","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Samara","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"San Marino","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Sarajevo","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Saratov","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Simferopol","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Skopje","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Sofia","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Stockholm","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Tallinn","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Tirana","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Uljanovsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Uzjhorod","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Vaduz","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Vatikanen","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Wien","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Vilnius","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Volgograd","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Warszawa","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Zagreb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Zaporizjzja","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Zürich","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Chagosöarna","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Julön","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Kokosöarna","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Komorerna","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Kerguelenöarna","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Mahé","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Maldiverna","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Mauritius","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Réunion","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Apia","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Auckland","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Bougainville","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Chatham","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Påskön","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Efate","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Enderbury","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Fakaofo","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Fiji","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Funafuti","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Galápagos","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Gambieröarna","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Guadalcanal","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Guam","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"HonolulutidHonolulunormaltidHonolulusommartidHonolulu","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Johnstonatollen","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Kiritimati","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Kosrae","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Kwajalein","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Majuro","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Marquesasöarna","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Midwayöarna","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Nauru","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Niue","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Norfolk","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Nouméa","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Pago Pago","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Palau","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Pitcairnöarna","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Pohnpei","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Port Moresby","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Rarotonga","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Saipan","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Tahiti","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Tarawa","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Tongatapu","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Chuuk","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Wake","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Wallisön","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

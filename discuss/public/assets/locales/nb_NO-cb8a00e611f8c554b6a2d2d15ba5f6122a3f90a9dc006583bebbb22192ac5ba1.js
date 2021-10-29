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
r += "La oss <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">starte diskusjonen!</a> Der ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "er <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tema";
return r;
},
"other" : function(d){
var r = "";
r += "er <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> temaer";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " og ";
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
})() + "</strong> innlegg";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> innlegg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Besøkende trenger mer å lese og svare på - vi anbefaler i det minste ";
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
})() + "</strong> tema";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> emner";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " og ";
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
})() + "</strong> innlegg";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> innlegg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Bare ansatte kan se denne meldingen.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "La oss <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">starte diskusjonen!</a> Der ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "er <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tema";
return r;
},
"other" : function(d){
var r = "";
r += "er <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> emner";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Besøkende trenger mer å lese og svare på - vi anbefaler i det minste ";
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
})() + "</strong> tema";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> emner";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Bare ansatte kan se denne meldingen.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "La oss <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">starte diskusjonen!</a> Der ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "er <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> innlegg";
return r;
},
"other" : function(d){
var r = "";
r += "er <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> innlegg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Besøkende trenger mer å lese og svare på — vi anbefaler minst ";
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
})() + "</strong> innlegg";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> innlegg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Bare ansatte kan se denne meldingen.";
return r;
}, "logs_error_rate_notice.reached_hour_MF" : function(d){
var r = "";
r += "<b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["relativeAge"];
r += "</b> — <a href='";
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
})() + " feil/time";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " feil/time";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> nådd området innstillingen grense for ";
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
})() + " feil/time";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " feil/time";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "</b> — <a href='";
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
})() + " feil/minutt";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " feil/minutt";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> nådd området innstillingen grense for ";
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
})() + " feil/minutt";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " feil/minutt";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " feil/time";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " feil/time";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> overskrider sideinnstillingsgrensen på ";
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
})() + " error/time";
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
return r;
}, "logs_error_rate_notice.exceeded_minute_MF" : function(d){
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
})() + " feil / minutt";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " feil / minutt";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> overskredet nettstedsinnstillingsgrensen på ";
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
})() + " feil / minutt";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " feil / minutt";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "er <b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> svar";
return r;
},
"other" : function(d){
var r = "";
r += "er <b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> svarer";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " med en estimert lesetid på <b>";
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
})() + " minutt";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " minutter";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "Der ";
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
r += "er <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " ulest</a> ";
return r;
},
"other" : function(d){
var r = "";
r += "er <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " ulest</a> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "og ";
return r;
},
"false" : function(d){
var r = "";
r += "er ";
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
})() + " nye</a> emne";
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
r += "og ";
return r;
},
"false" : function(d){
var r = "";
r += "er ";
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
})() + " nye</a> emner";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " gjenstår, eller ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "bla gjennom andre emner i ";
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
r += "Du er i ferd med å slette ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<b>1</b> innlegg";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> innlegg";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " og ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "<b>1</b> emne";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> emner";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " opprettet av denne brukeren, fjerne kontoen, blokkere påmeldinger fra IP-adressen <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b>, og legge til e-postadressen <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> til en permanent blokkeringsliste. Er du sikker på at denne brukeren virkelig sender søppelpost?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "Dette emnet har ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "count";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "1 svar";
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "med mange likes i forhold til innlegg";
return r;
},
"med" : function(d){
var r = "";
r += "med veldig mange likes i forhold til innlegg";
return r;
},
"high" : function(d){
var r = "";
r += "med ekstremt mange likes i forhold til innlegg";
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
}, "user.messages.read_more_group_pm_MF" : function(d){
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/group/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["groupName"];
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/group/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["groupName"];
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/group/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["groupName"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> message";
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/group/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["groupName"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> messages";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " remaining, or browse other messages in ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["groupLink"];
return r;
}, "user.messages.read_more_personal_pm_MF" : function(d){
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/unread'>" + (function(){ var x = k_1 - off_0;
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/unread'>" + (function(){ var x = k_1 - off_0;
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> message";
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
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " new</a> messages";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " remaining, or browse other <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/u/";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["username"];
r += "/messages'>personal messages</a>";
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.en = function ( n ) {
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

I18n.translations = {"nb_NO":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n . %u","units":{"byte":{"one":"Byte","other":"Byte"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"LT","time_with_zone":"tt:mm a (z)","time_short_day":"ddd, t:mm a","timeline_date":"MMM YYYY","long_no_year":"MMM D, t:mm a","long_no_year_no_time":"D MMM","full_no_year_no_time":"D. MMMM","long_with_year":"D MMM YYYY LT","long_with_year_no_time":"D MMM YYYY","full_with_year_no_time":"D. MMMM YYYY","long_date_with_year":"D MMM 'YY LT","long_date_without_year":"D MMM, LT","long_date_with_year_without_time":"D MMM 'YY","long_date_without_year_with_linebreak":"D MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D. MMM 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} siden","wrap_on":"på %{date}","tiny":{"half_a_minute":"\u003c 1m","less_than_x_seconds":{"one":"\u003c %{count}s","other":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s","other":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m","other":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m","other":"%{count}m"},"about_x_hours":{"one":"%{count}t","other":"%{count}t"},"x_days":{"one":"%{count}d","other":"%{count}d"},"x_months":{"one":"%{count}mnd","other":"%{count}mnd"},"about_x_years":{"one":"%{count}år","other":"%{count}år"},"over_x_years":{"one":"\u003e %{count}år","other":"\u003e %{count}år"},"almost_x_years":{"one":"%{count}år","other":"%{count}år"},"date_month":"D MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} minutt","other":"%{count} minutter"},"x_hours":{"one":"%{count} time","other":"%{count} timer"},"x_days":{"one":"%{count} dag","other":"%{count} dager"},"date_year":"D. MMM, 'YY"},"medium_with_ago":{"x_minutes":{"one":"%{count} minutt siden","other":"%{count} minutter siden"},"x_hours":{"one":"%{count} time siden","other":"%{count} timer siden"},"x_days":{"one":"%{count} dag siden","other":"%{count} dager siden"},"x_months":{"one":"%{count} måned siden","other":"%{count} måneder siden"},"x_years":{"one":"%{count} år siden","other":"%{count} år siden"}},"later":{"x_days":{"one":"%{count} dag senere","other":"%{count} dager senere"},"x_months":{"one":"%{count} måned senere","other":"%{count} måneder senere"},"x_years":{"one":"%{count} år senere","other":"%{count} år senere"}},"previous_month":"Forrige måned","next_month":"Neste måned","placeholder":"dato","to_placeholder":"til dato"},"share":{"topic_html":"Emne: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"innlegg #%{postNumber}","close":"lukk","twitter":"Del på Twitter","facebook":"Del på Facebook","email":"Send via e-post","url":"Kopier og del URL"},"action_codes":{"public_topic":"gjorde dette emnet offentlig %{when}","private_topic":"gjorde dette emnet om til en personlig melding %{when}","split_topic":"del opp dette emnet %{when}","invited_user":"inviterte %{who} %{when}","invited_group":"inviterte %{who} %{when}","user_left":"%{who} fjernet seg selv fra denne meldingen %{when}","removed_user":"fjernet %{who} %{when}","removed_group":"fjernet %{who} %{when}","autobumped":"automatisk flyttet øverst %{when}","autoclosed":{"enabled":"lukket %{when}","disabled":"åpnet %{when}"},"closed":{"enabled":"lukket %{when}","disabled":"åpnet %{when}"},"archived":{"enabled":"arkivert %{when}","disabled":"arkivering opphevet %{when}"},"pinned":{"enabled":"festet %{when}","disabled":"feste fjernet %{when}"},"pinned_globally":{"enabled":"festet globalt %{when}","disabled":"feste fjernet %{when}"},"visible":{"enabled":"gjort synlig %{when}","disabled":"skjult %{when}"},"banner":{"enabled":"gjorde dette til et banner %{when}. Det vil vises på toppen av hver side inntil brukeren lukker det.","disabled":"fjernet dette banneret %{when}. Det vil ikke lenger vises på toppen av hver side."},"forwarded":"videresendte e-posten voer"},"topic_admin_menu":"handlinger for tråd","wizard_required":"Velkommen til ditt nye Discourse! Kom i gang med \u003ca href='%{url}' data-auto-route='true'\u003eoppstartsveiviseren\u003c/a\u003e ✨","emails_are_disabled":"All utgående e-post har blitt deaktivert globalt av en administrator. Ingen e-postvarslinger vil bli sendt.","software_update_prompt":{"message":"Vi har oppdatert dette nettstedet, \u003cspan\u003eOppdater\u003c/span\u003e, eller du kan oppleve uventet oppførsel.","dismiss":"Avslå"},"bootstrap_mode_disabled":"Oppstartsmodus vil bli deaktivert i løpet av 24 timer.","themes":{"default_description":"Forvalg","broken_theme_alert":"Du kan oppleve at siden din ikke fungerer fordi temaet eller komponenten %{theme} har feil. Deaktiver temaet eller komponenten her: %{path}."},"s3":{"regions":{"ap_northeast_1":"Asia/Stillehavsregionen (Tokyo)","ap_northeast_2":"Asia/Stillehavsregionen (Seoul)","ap_east_1":"Asia Stillehavet (Hong Kong)","ap_south_1":"Asia/Stillehavsregionen (Mumbai)","ap_southeast_1":"Asia/Stillehavsregionen (Singapore)","ap_southeast_2":"Asia/Stillehavsregionen (Sydney)","ca_central_1":"Kanada (sentralregion)","cn_north_1":"Kina (Beijing)","cn_northwest_1":"Kina (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"EU (Stockholm)","eu_west_1":"EU (Irland)","eu_west_2":"EU (London)","eu_west_3":"EU (Paris)","sa_east_1":"Sør-Amerika (søndag Paulo)","us_east_1":"USA øst (N. Virginia)","us_east_2":"USA øst (Ohio)","us_gov_east_1":"AWS GovCloud (US-øst)","us_gov_west_1":"AWS GovCloud (US-vest)","us_west_1":"USA vest (N. California)","us_west_2":"USA vest (Oregon)"}},"clear_input":"Tøm inndata","edit":"endre tittelen og kategorien til dette emnet","expand":"Utvid","not_implemented":"Beklager, den funksjonen er ikke blitt implementert enda.","no_value":"Nei","yes_value":"Ja","submit":"Utfør","generic_error":"Beklager, det har oppstått en feil.","generic_error_with_reason":"Det oppstod et problem: %{error}","sign_up":"Registrer deg","log_in":"Logg inn","age":"Alder","joined":"Ble medlem","admin_title":"Admin","show_more":"vis mer","show_help":"alternativer","links":"Lenker","links_lowercase":{"one":"link","other":"lenker"},"faq":"O-S-S","guidelines":"Retningslinjer","privacy_policy":"Personvernerklæring","privacy":"Personvern","tos":"Bruksvilkår","rules":"Regler","conduct":"Regler for god oppførsel","mobile_view":"Mobilvisning","desktop_view":"Skrivebordsvisning","or":"eller","now":"akkurat nå","read_more":"les mer","more":"Mer","x_more":{"one":"%{count} mer","other":"%{count} mer"},"never":"aldri","every_30_minutes":"hvert 30. minutt","every_hour":"hver time","daily":"daglig","weekly":"ukentlig","every_month":"hver måned","every_six_months":"hver sjette måned","max_of_count":"maksimum av %{count}","character_count":{"one":"%{count} tegn","other":"%{count} tegn"},"related_messages":{"title":"Relaterte meldinger","see_all":"se \u003ca href=\"%{path}\"\u003ealle meldinger\u003c/a\u003e fra @%{username} …"},"suggested_topics":{"title":"Anbefalte emner","pm_title":"Anbefalte meldinger"},"about":{"simple_title":"Om","title":"Om %{title}","stats":"Nettstedsstatistikk","our_admins":"Våre administratorer","our_moderators":"Våre moderatorer","moderators":"Moderatorer","stat":{"all_time":"Gjennom tidene","last_day":"Siste 24 timer","last_7_days":"Siste 7 dager","last_30_days":"Siste 30 dager"},"like_count":"Likes","topic_count":"Emner","post_count":"Innlegg","user_count":"Brukere","active_user_count":"Aktive brukere","contact":"Kontakt oss","contact_info":"I tilfelle en kritisk hendelse skulle inntreffe eller det er en hastesak som påvirker siden, ta kontakt på %{contact_info}."},"bookmarked":{"title":"Bokmerke","edit_bookmark":"Rediger bokmerke","clear_bookmarks":"Fjern bokmerker","help":{"bookmark":"Klikk for å bokmerke det første innlegget i dette emnet","edit_bookmark":"Klikk for å redigere bokmerket på dette emnet","unbookmark":"Klikk for å fjerne alle bokmerker i dette emnet","unbookmark_with_reminder":"Klikk for å fjerne alle bokmerkene og påminnelsene i dette emnet."}},"bookmarks":{"created":"Du har bokmerket dette innlegget. %{name}","not_bookmarked":"bokmerk dette innlegget","created_with_reminder":"Du har bokmerket dette innlegget med en påminnelse %{date} %{name}","remove":"Fjern bokmerke","delete":"Slett bokmerke","confirm_delete":"Er du sikker på at du vil slette denne bokmerket? Påminnelsen vil også bli slettet.","confirm_clear":"Er du sikker på at du vil fjerne alle favoritter fra dette emnet?","save":"Lagre","no_timezone":"Du har ikke ennå satt tidssone. Du vil ikke kunne sette påminnelser. Sett tidssone \u003ca href=\"%{basePath}/my/preferences/profile\"\u003ei profilen din\u003c/a\u003e.","invalid_custom_datetime":"Dato og klokkeslett du oppga er ugyldig, prøv igjen.","list_permission_denied":"Du har ikke tillatelse til å se brukerens bokmerker.","no_user_bookmarks":"Du har ingen bokmerkede innlegg; bokmerker lar deg raskt slå opp spesifike innlegg.","auto_delete_preference":{"label":"Slett automatisk","never":"Aldri","when_reminder_sent":"Når påminnelsen er sendt","on_owner_reply":"Etter at jeg har svart på dette emnet"},"search_placeholder":"Søk i bokmerker etter navn, emnetittel eller innleggsinnhold","search":"Søk","reminders":{"today_with_time":"I dag klokken %{time}","tomorrow_with_time":"i morgen kl. %{time}","at_time":"Den %{date_time}","existing_reminder":"Du har en påminnelse satt for dette bokmerket som vil bli sendt %{at_date_time}"}},"copy_codeblock":{"copied":"kopiert!"},"drafts":{"label":"Utkast","label_with_count":"Utkast (%{count})","resume":"Fortsett","remove":"Fjern","remove_confirmation":"Er du sikker på at du vil slette dette utkastet?","new_topic":"Nytt emneutkast","new_private_message":"Nytt personlig meldingsutkast","topic_reply":"Svarutkast","abandon":{"confirm":"Du har et pågående utkast for dette emnet. Hva vil du gjøre med det?","yes_value":"Forkast","no_value":"Gjenoppta redigering"}},"topic_count_categories":{"one":"Se %{count} nytt eller oppdatert emne","other":"Se %{count} nye eller oppdaterte emner"},"topic_count_latest":{"one":"Se %{count} nytt eller oppdatert emne","other":"Se %{count} nye eller oppdaterte emner"},"topic_count_unseen":{"one":"Se %{count} nytt eller oppdatert emne","other":"Se %{count} nye eller oppdaterte emner"},"topic_count_unread":{"one":"Se %{count} ulest emne","other":"Se %{count} uleste emner"},"topic_count_new":{"one":"Se %{count} nytt emne","other":"Se %{count} nye emner"},"preview":"forhåndsvisning","cancel":"avbryt","deleting":"Sletter...","save":"Lagre endringer","saving":"Lagrer…","saved":"Lagret!","upload":"Last opp","uploading":"Laster opp…","uploading_filename":"Laster opp %{filename}","processing_filename":"Behandler: %{filename}...","clipboard":"utklippstavle","uploaded":"Lastet opp!","pasting":"Limer inn…","enable":"Aktiver","disable":"Deaktiver","continue":"Fortsett","undo":"Angre","revert":"Reverser","failed":"Mislykket","switch_to_anon":"Start inkognitomodus","switch_from_anon":"Avslutt inkognitomodus","banner":{"close":"Fjern dette banneret.","edit":"Endre dette banneret \u003e\u003e"},"pwa":{"install_banner":"Ønsker du å \u003ca href\u003einstallere %{title} på denne enheten\u003c/a\u003e?"},"choose_topic":{"none_found":"Ingen emner funnet.","title":{"search":"Søk etter emne","placeholder":"skriv tittel, URL eller ID her"}},"choose_message":{"none_found":"Ingen meldinger funnet.","title":{"search":"Søk etter melding","placeholder":"Skriv tittel, URL eller ID her"}},"review":{"order_by":"Sorter etter","in_reply_to":"i svar til","explain":{"why":"forklar hvorfor dette elementet ble plassert i køen","title":"Trust factor","formula":"Formel","subtotal":"Delsum","total":"Total","min_score_visibility":"Minimal score for synlighet","score_to_hide":"Score for å skjule innlegg","take_action_bonus":{"name":"gjøre handling","title":"Når en administrator velger å gjøre en handling, får flagget en bonus."},"user_accuracy_bonus":{"name":"nøyaktighet for bruker","title":"Brukere som historisk gir gode flagg får bonus."},"trust_level_bonus":{"name":"tillitsnivå","title":"Elementer opprettet av brukere med høyere tillitsrangering har høyere score"},"type_bonus":{"name":"type bonus","title":"Visse typer som kan gjennomgås, kan tildeles en bonus av personalet for å gjøre dem til en høyere prioritet."}},"stale_help":"Denne vurderingen har blitt løst av \u003cb\u003e%{username}\u003c/b\u003e.","claim_help":{"optional":"Du kan gjøre krav på dette elementet for å hindre andre i å gjennomgå det.","required":"Du må gjøre krav på varer før du kan se gjennom dem.","claimed_by_you":"Du har gjort krav på dette elementet og kan se gjennom det.","claimed_by_other":"Dette elementet kan bare bli vurdert av \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"Gjør krav på dette emne"},"unclaim":{"help":"fjern dette kravet"},"awaiting_approval":"Venter på godkjenning","delete":"Slett","settings":{"saved":"Lagret","save_changes":"Lagre endringer","title":"Innstillinger","priorities":{"title":"Gjennomgåbare prioriteringer"}},"moderation_history":"Moderatorhistorikk","view_all":"Vis alle","grouped_by_topic":"Gruppert etter emne","none":"Det er ingen produkter å gjennomgå.","view_pending":"vis ventende","topic_has_pending":{"one":"Dette emnet har \u003cb\u003e%{count}\u003c/b\u003e post som venter på godkjenning","other":"Dette emnet har \u003cb\u003e%{count}\u003c/b\u003e poster som venter på godkjenning"},"title":"Gjennomgang","topic":"Emne:","filtered_topic":"Du har filtrert etter gjennomsyn i ett enkelt emne.","filtered_user":"Bruker","filtered_reviewed_by":"Gjennomgått av","show_all_topics":"vis alle emner","deleted_post":"(post slettet)","deleted_user":"(bruker slettet)","user":{"bio":"Biografi","website":"Nettside","username":"Brukernavn","email":"E-post","name":"Navn","fields":"Felter","reject_reason":"Begrunnelse"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (av siste flagg)","other":"%{agreed}, %{disagreed}, %{ignored} (av siste %{count} flagg)"},"agreed":{"one":"%{count}% er enig","other":"%{count}% er enig"},"disagreed":{"one":"%{count}% er uenig","other":"%{count}% er uenig"},"ignored":{"one":"%{count}% ignorer","other":"%{count}% ignorer"}},"topics":{"topic":"Emne","reviewable_count":"Antall","reported_by":"Rapporter av","deleted":"[Emne slettet]","original":"(opprinnelig emne)","details":"detaljer","unique_users":{"one":"%{count} bruker","other":"%{count} brukere"}},"replies":{"one":"%{count} svar","other":"%{count} svar"},"edit":"Rediger","save":"Lagre","cancel":"Avbryt","new_topic":"Godkjenning av dette elementet vil opprette et nytt emne","filters":{"all_categories":"(alle kategorier)","type":{"title":"Type","all":"(alle typer)"},"minimum_score":"Minste poengsum:","refresh":"Last inn på nytt","status":"Status","category":"Kategori","orders":{"score":"Poeng","score_asc":"Resultat (omvendt)","created_at":"Opprettet på","created_at_asc":"Opprettet i (bakover)"},"priority":{"title":"Minimum prioritet","any":"(alt)","low":"Lav","medium":"Middels","high":"Høy"}},"conversation":{"view_full":"se hele samtalen"},"scores":{"about":"Denne scoren beregnes ut fra tillitsnivået til eksportøren, nøyaktigheten til deres forrige flagg, og prioriteten til posten som skal rapporteres.","score":"Poeng","date":"Dato","type":"Type","status":"Status","submitted_by":"Innsendt av","reviewed_by":"Gjennomgått av"},"statuses":{"pending":{"title":"På vent"},"approved":{"title":"Godkjent"},"rejected":{"title":"Avvist"},"ignored":{"title":"Ignorert"},"deleted":{"title":"Slettet"},"reviewed":{"title":"(alle gjennomgått)"},"all":{"title":"(alt)"}},"types":{"reviewable_flagged_post":{"title":"Rapportert innlegg","flagged_by":"Rapportert av"},"reviewable_queued_topic":{"title":"Emne i kø"},"reviewable_queued_post":{"title":"Innlegg i kø"},"reviewable_user":{"title":"Bruker"},"reviewable_post":{"title":"Innlegg"}},"approval":{"title":"Innlegg trenger godkjenning","description":"Vi har mottatt ditt nye innlegg men det krever godkjenning av en moderator før det vises. Ha tålmod.","pending_posts":{"one":"Du har \u003cstrong\u003e%{count}\u003c/strong\u003e innlegg som venter.","other":"Du har \u003cstrong\u003e%{count}\u003c/strong\u003e innlegg som venter."},"ok":"OK"},"example_username":"brukernavn","reject_reason":{"title":"Hvorfor avviser du denne brukeren?","send_email":"Send avvisnings e-post"}},"relative_time_picker":{"minutes":{"one":"minutt","other":"minutter"},"hours":{"one":"time","other":"timer"},"days":{"one":"dag","other":"dager"},"months":{"one":"måned","other":"måneder"},"years":{"one":"år","other":"det siste året"},"relative":"Relativ"},"time_shortcut":{"later_today":"Senere i dag","next_business_day":"Neste virkedag","tomorrow":"I morgen","post_local_date":"Dato i innlegg","later_this_week":"Senere denne uken","this_weekend":"Denne uken","start_of_next_business_week":"Mandag","start_of_next_business_week_alt":"Neste mandag","two_weeks":"To uker","next_month":"Neste måned","six_months":"Seks måneder","custom":"Egendefinert dato og tid","relative":"Relativ tid","none":"Ingen behov","last_custom":"Siste egendefinerte datotid"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e opprettet \u003ca href='%{topicUrl}'\u003eemnet\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e opprettet \u003ca href='%{topicUrl}'\u003eemnet\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e besvarte \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e besvarte \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e svarte på \u003ca href='%{topicUrl}'\u003eemnet\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eDu\u003c/a\u003e svarte på \u003ca href='%{topicUrl}'\u003eemnet\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e nevnte \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e nevnte \u003ca href='%{user2Url}'\u003edeg\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eDu\u003c/a\u003e nevnte \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Postet av \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Postet av \u003ca href='%{userUrl}'\u003edeg\u003c/a\u003e","sent_by_user":"Sendt av \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Sendt av \u003ca href='%{userUrl}'\u003edeg\u003c/a\u003e"},"directory":{"username":"Brukernavn","filter_name":"filtrer etter brukernavn","title":"Brukere","likes_given":"Gitt","likes_received":"Mottatt","topics_entered":"Lest","topics_entered_long":"Emner vist","time_read":"Tid lest","topic_count":"Emner","topic_count_long":"Emner opprettet","post_count":"Svar","post_count_long":"Svar","no_results":"Ingen treff","days_visited":"Besøk","days_visited_long":"Dager besøkt","posts_read":"Lest","posts_read_long":"Innlegg lest","last_updated":"Sist oppdatert:","total_rows":{"one":"%{count} bruker","other":"%{count} brukere"},"edit_columns":{"title":"Rediger katalogkolonner","save":"Lagre","reset_to_default":"Tilbakestill til standard"},"group":{"all":"alle grupper"}},"group_histories":{"actions":{"change_group_setting":"Endre gruppeinnstillinger","add_user_to_group":"Legg til bruker","remove_user_from_group":"Slett bruker","make_user_group_owner":"Gjør til eier","remove_user_as_group_owner":"Trekk tilbake eierstatus"}},"groups":{"member_added":"La til","member_requested":"Forespurt på","add_members":{"title":"Legg brukere til %{group_name}","description":"Angi en liste over brukere du vil invitere til gruppen eller lime inn i en kommaseparert liste:","usernames_placeholder":"brukernavn","usernames_or_emails_placeholder":"brukernavn eller e-post","notify_users":"Varsle brukere","set_owner":"Angi brukere som eiere av denne gruppen"},"requests":{"title":"Forespørsler","reason":"Begrunnelse","accept":"Godta","accepted":"godtatt","deny":"Avslå","denied":"nektet","undone":"forespørsel, angret","handle":"Behandler forespørsel om medlemskap"},"manage":{"title":"Behandle","name":"Navn","full_name":"Fullt navn","add_members":"Legg til bruker","invite_members":"Inviter","delete_member_confirm":"Fjern '%{username}' fra gruppen '%{group}'?","profile":{"title":"Profil"},"interaction":{"title":"Interaksjon","posting":"Publisering","notification":"Varsling"},"email":{"title":"E-post","status":"Synkronisert %{old_emails} / %{total_emails} e-poster via IMAP.","enable_smtp":"Aktiver SMTP","enable_imap":"Aktiver IMAP","test_settings":"Test innstillinger","save_settings":"Lagre innstillinger","last_updated":"Sist oppdatert:","last_updated_by":"av","settings_required":"Alle innstillinger er påkrevd, fyll ut alle feltene før verifisering.","smtp_settings_valid":"SMTP-innstillingene er gyldige.","smtp_title":"SMTP","smtp_instructions":"Når du aktiverer SMTP for gruppen, alle e-poster som sendes fra gruppens innboks vil bli sendt via SMTP-innstillingene angitt her i stedet for e-posttjeneren som er konfigurert for andre e-poster som sendes av ditt forum.","imap_title":"IMAP","imap_additional_settings":"Flere innstillinger","imap_instructions":"Når du aktiverer IMAP for gruppen, så synkroniseres e-post mellom gruppen innboksen og medfølgende IMAP-tjener og postboks. SMTP må være aktivert med gyldig og testet innloggingsinformasjon før IMAP kan aktiveres. Brukernavn og passord for SMTP vil bli brukt i IMAP. For mer informasjon, se \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Advarsel: Dette er en alfa-scene-funksjon. Bare Gmail støttes offisielt. Bruk på egen risiko!","imap_settings_valid":"IMAP-innstillinger er gyldige.","smtp_disable_confirm":"Hvis du deaktiverer SMTP, vil alle SMTP og IMAP-innstillinger bli tilbakestilt, og den tilknyttede funksjonaliteten vil bli deaktivert. Er du sikker på at du vil fortsette?","imap_disable_confirm":"Hvis du deaktiverer IMAP vil alle IMAP-innstillinger bli tilbakestilt og den tilknyttede funksjonaliteten bli deaktivert. Er du sikker på at du vil fortsette?","imap_mailbox_not_selected":"Du må velge en Mailbox for denne IMAP-konfigurasjonen, eller ingen e-postbokser vil bli synkronisert!","prefill":{"title":"Forhåndsfyll med innstillinger for:","gmail":"GMail"},"credentials":{"title":"Legitimasjon","smtp_server":"SMTP Server","smtp_port":"SMTP port","smtp_ssl":"Bruk SSL for SMTP","imap_server":"IMAP Server","imap_port":"IMAP port","imap_ssl":"Bruk SSL for IMAP","username":"Brukernavn","password":"Passord"},"settings":{"title":"Innstillinger","allow_unknown_sender_topic_replies":"Tillat ukjente avsenderemnet svar.","allow_unknown_sender_topic_replies_hint":"Tillater ukjente avsendere å svare på gruppetemaer. Hvis dette ikke er aktivert vil svar på e-postadresser som ikke allerede er invitert til emnet lage et nytt emne."},"mailboxes":{"synchronized":"Synkronisert postkasse","none_found":"Ingen postkasser ble funnet i denne e-postkontoen.","disabled":"Deaktivert"}},"membership":{"title":"Medlemskap","access":"Tilgang"},"categories":{"title":"Kategorier","long_title":"Kategori standard varsler","description":"Når brukerne legges til denne gruppen, vil deres kategori varslingsinnstillinger bli satt til disse standardverdiene. Etterpå kan de endre dem.","watched_categories_instructions":"Du vil automatisk følge alle emnene med dette stikkordet. Du vil bli varslet om alle nye innlegg og emner; i tillegg vil antallet uleste og nye innlegg vises ved siden av emnet.","tracked_categories_instructions":"Spor automatisk alle emner i disse kategoriene. En rekke nye innlegg vises ved siden av emnet.","watching_first_post_categories_instructions":"Du vil bli varslet om det første innlegget i hvert nye emne med disse stikkordene.","regular_categories_instructions":"Hvis disse kategoriene er dempet, vil de bli dempet for gruppemedlemmer. Brukere vil bli varslet om de er nevnt eller noen svarer på dem.","muted_categories_instructions":"Brukerne vil ikke bli varslet om nye emner i disse kategoriene, og de vil ikke dukke opp på kategorier eller nyeste temasider."},"tags":{"title":"Stikkord","long_title":"Kategori standard varsler","description":"Når brukerne legges til denne gruppen, vil deres kategori varslingsinnstillinger bli satt til disse standardverdiene. Etterpå kan de endre dem.","watched_tags_instructions":"Du vil automatisk følge alle emnene med dette stikkordet. Du vil bli varslet om alle nye innlegg og emner; i tillegg vil antallet uleste og nye innlegg vises ved siden av emnet.","tracked_tags_instructions":"Du vil automatisk overvåke alle emner som har disse stikkordene. Antallet nye innlegg vil vises ved siden av emnet.","watching_first_post_tags_instructions":"Du vil bli varslet om det første innlegget i hvert nye emne med disse stikkordene.","regular_tags_instructions":"Hvis disse kategoriene er dempet, vil de bli dempet for gruppemedlemmer. Brukere vil bli varslet om de er nevnt eller noen svarer på dem.","muted_tags_instructions":"Du vil ikke bli varslet om noe vedrørende nye emner som har disse stikkordene, og de vil ikke vises i siste."},"logs":{"title":"Logger","when":"Når","action":"Handling","acting_user":"Utførende bruker","target_user":"Målbruker","subject":"Emne","details":"Detaljer","from":"Fra","to":"Til"}},"permissions":{"title":"Tillatelser","none":"Det er ingen kategorier tilknyttet denne gruppen.","description":"Medlemmer av denne gruppen har tilgang til disse kategoriene"},"public_admission":"Tillat brukere å ta del i gruppen fritt (krever offentlig synlig gruppe)","public_exit":"Tillat brukere å fritt forlate gruppen","empty":{"posts":"Det finnes ingen innlegg av medlemmer i denne gruppen.","members":"Det finnes ingen medlemmer av denne gruppen.","requests":"Det er ingen medlemsforespørsler for denne gruppen.","mentions":"Denne gruppen har aldri blitt nevnt.","messages":"Det finnes ingen meldinger til denne gruppen.","topics":"Det finnes ingen emner opprettet av medlemmer av denne gruppen.","logs":"Det finnes ingen logger for denne gruppen."},"add":"Legg til","join":"Bli medlem","leave":"Forlat","request":"Forespørsel","message":"Melding","confirm_leave":"Er du sikker på at du vil forlate denne gruppen?","allow_membership_requests":"Tillat brukere å sende medlemskap til gruppeeiere (krever offentlig synlig gruppe)","membership_request_template":"Egendefinert mal å vise brukere når du sender en medlemskapsforespørsel.","membership_request":{"submit":"Send inn forespørsel","title":"Spør om å ta del i @%{group_name}","reason":"La gruppeeierne vite hvorfor du ønsker å ta del i denne gruppen"},"membership":"Medlemskap","name":"Navn","group_name":"Gruppenavn","user_count":"Brukere","bio":"Om gruppe","selector_placeholder":"oppgi brukernavn","owner":"eier","index":{"title":"Grupper","all":"Alle grupper","empty":"Det finnes ingen synlige grupper","filter":"Filtrer etter gruppetype","owner_groups":"Grupper jeg eier","close_groups":"Lukkede grupper","automatic_groups":"Automatiske grupper","automatic":"Automatisk","closed":"Lukket","public":"Offentlig","private":"Privat","public_groups":"Offentlige grupper","my_groups":"Mine grupper","group_type":"Gruppetype","is_group_user":"Medlem","is_group_owner":"Eier"},"title":{"one":"Gruppe","other":"Grupper"},"activity":"Aktivitet","members":{"title":"Medlemmer","filter_placeholder_admin":"brukernavn eller e-post","filter_placeholder":"brukernavn","remove_member":"Fjern medlem","remove_member_description":"Fjern \u003cb\u003e%{username}\u003c/b\u003e fra denne gruppen","make_owner":"Gjør til eier","make_owner_description":"Gjør \u003cb\u003e%{username}\u003c/b\u003e til eier av denne gruppen","remove_owner":"Fjern som eier","remove_owner_description":"Fjern \u003cb\u003e%{username}\u003c/b\u003e som eier av denne gruppen","make_primary":"Gjør til primær","make_primary_description":"Gjør denne hovedgruppen til \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Fjern som primær","remove_primary_description":"Fjern denne som hovedgruppen for \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Fjern medlemmer","remove_members_description":"Fjern valgte brukere fra denne gruppen","make_owners":"Gjør eiere","make_owners_description":"Gjør markerte brukere eiere av denne gruppen","remove_owners":"Fjern eiere","remove_owners_description":"Fjern valgte brukere som eiere av denne gruppen","make_all_primary":"Gjør alle primære","make_all_primary_description":"Gjør denne hovedgruppen til alle valgte brukere","remove_all_primary":"Fjern som primær","remove_all_primary_description":"Fjern denne gruppen som primær","owner":"Eier","primary":"Primær","forbidden":"Du har ikke tillatelse til å vise medlemmene."},"topics":"Emner","posts":"Innlegg","mentions":"Omtalelser","messages":"Meldinger","notification_level":"Forvalgt merknadsnivå for gruppemeldinger","alias_levels":{"mentionable":"Hvem kan @nevne denne gruppen?","messageable":"Hvem kan sende meldinger til denne gruppen?","nobody":"Ingen","only_admins":"Kun administratorer","mods_and_admins":"Kun moderatorer og administratorer","members_mods_and_admins":"Kun gruppemedlemmer, moderatorer og administratorer","owners_mods_and_admins":"Bare gruppeeiere, moderatorer og administratorer","everyone":"Alle"},"notifications":{"watching":{"title":"Følger","description":"Du vil bli varslet om hvert nye innlegg i hver beskjed, og antallet nye svar vil bli vist."},"watching_first_post":{"title":"Følger første innlegg","description":"Du vil bli varslet om nye meldinger i denne gruppen, men ikke svarene på meldingene."},"tracking":{"title":"Overvåker","description":"Du vil få beskjeddersom nevner @navnet ditt eller svarer deg, og antallet nye svar vil bli vist."},"regular":{"title":"Normal","description":"Du vil bli varslet hvis noen nevner @navnet ditt eller svarer deg."},"muted":{"title":"Ignorert","description":"Du vil ikke bli varslet om meldinger i denne gruppen."}},"flair_url":"Bilde for gruppetilhørighet på avatar","flair_upload_description":"Bruk firkantede bilder ikke mindre enn 20 px med 20 piksler.","flair_bg_color":"Bakgrunnsfarge for gruppetilhørighetsbilde på avatar","flair_bg_color_placeholder":"(Valgfritt) Fargekode som hex-verdi","flair_color":"Farge på bilde for gruppetilhørighet på avatar","flair_color_placeholder":"(Valgfritt) Fargekode som hex-verdi","flair_preview_icon":"Forhåndsvis ikon","flair_preview_image":"Forhåndsvis bilde","flair_type":{"icon":"Velg et ikon","image":"Last opp et bilde"},"default_notifications":{"modal_title":"Standard varslinger for bruker","modal_description":"Ønsker du å bruke denne endringens historikk? Dette vil endre innstillinger for %{count} eksisterende brukere.","modal_yes":"Ja","modal_no":"Nei, bare gjelder endring fremover"}},"user_action_groups":{"1":"Likes tildelt","2":"Likes mottatt","3":"Bokmerker","4":"Emner","5":"Svar","6":"Svar","7":"Omtalelser","9":"Sitater","11":"Redigeringer","12":"Sendte elementer","13":"Innboks","14":"Venter","15":"Utkast"},"categories":{"all":"alle kategorier","all_subcategories":"alle","no_subcategory":"ingen","category":"Kategori","category_list":"Vis kategoriliste","reorder":{"title":"Endre rekkefølge på kategorier","title_long":"Reorganiser kategorilisten","save":"Lagre Rekkefølge","apply_all":"Bruk","position":"Posisjon"},"posts":"Innlegg","topics":"Emner","latest":"Siste","subcategories":"Underkategorier","muted":"Dempede kategorier","topic_sentence":{"one":"%{count} emne","other":"%{count} emner"},"topic_stat_unit":{"week":"uke","month":"måned"},"n_more":"Kategorier (ytterligere%{count})..."},"ip_lookup":{"title":"Slå opp IP-adresse","hostname":"Vertsnavn","location":"Sted","location_not_found":"(ukjent)","organisation":"Organisasjon","phone":"Telefon","other_accounts":"Andre kontoer med denne IP-adressen:","delete_other_accounts":"Slett %{count}","username":"brukernavn","trust_level":"TN","read_time":"lesetid","topics_entered":"emner åpnet","post_count":"# innlegg","confirm_delete_other_accounts":"Er du sikker på at du vil slette disse kontoene?","powered_by":"bruker \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"kopiert"},"user_fields":{"none":"(velg et alternativ)","required":"Skriv inn en verdi for \"%{name}"},"user":{"said":"%{username}:","profile":"Profil","mute":"Ignorer","edit":"Rediger innstillinger","download_archive":{"button_text":"Last ned alle","confirm":"Er du sikker på at du vil laste ned innleggene dine?","success":"Nedlasting iverksatt. Du vil bli varslet med en melding når prosessen er fullført.","rate_limit_error":"Innlegg kan lastes ned en gang om dagen, prøv igjen i morgen."},"new_private_message":"Ny Melding","private_message":"Melding","private_messages":"Meldinger","user_notifications":{"filters":{"filter_by":"Filtrer etter","all":"Alle","read":"Lest","unread":"Uleste"},"ignore_duration_title":"Ignorer bruker","ignore_duration_username":"Brukernavn","ignore_duration_when":"Varighet:","ignore_duration_save":"Ignorer","ignore_duration_note":"Vær oppmerksom på at alle ignoreringer automatisk fjernes etter at ignoreringstiden utløper.","ignore_duration_time_frame_required":"Vennligst velg et tidsrom","ignore_no_users":"Du har ingen ignorerte brukere.","ignore_option":"Ignorert","ignore_option_title":"Du vil ikke motta varsler om denne brukeren og alle deres emner og svar vil bli skjult.","add_ignored_user":"Legg til …","mute_option":"Ignorert","mute_option_title":"Du vil ikke motta noen varsler relatert til denne brukeren.","normal_option":"Normal","normal_option_title":"Du vil bli varslet hvis denne brukeren svarer på deg, siterer deg eller nevner deg."},"notification_schedule":{"title":"Tidsplan for varsling","label":"Aktiver egendefinert meldingsplan","tip":"Utenfor disse timene vil du bli satt i «ikke forstyrr» automatisk.","midnight":"Midnatt","none":"Ingen","monday":"Mandag","tuesday":"Tirsdag","wednesday":"Onsdag","thursday":"Torsdag","friday":"Fredag","saturday":"Lørdag","sunday":"Søndag","to":"til"},"activity_stream":"Aktivitet","read":"Lest","read_help":"Nylig leste emner","preferences":"Innstillinger","feature_topic_on_profile":{"open_search":"Velg et nytt emne","title":"Velg et emne","search_label":"Søk etter emne etter tittel","save":"Lagre","clear":{"title":"Tøm","warning":"Er du sikker på at du vil tømme utvalgt emnet ditt?"}},"use_current_timezone":"Bruk gjeldende tidssone","profile_hidden":"Denne brukerens offentlige profil er skjult.","expand_profile":"Utvid","collapse_profile":"Fold sammen","bookmarks":"Bokmerker","bio":"Om meg","timezone":"Tidssone","invited_by":"Invitert av","trust_level":"Tillitsnivå","notifications":"Varsler","statistics":"Statistikk","desktop_notifications":{"label":"Skrivebordsvarsler","not_supported":"Varsler er ikke støttet på denne nettleseren. Beklager.","perm_default":"Slå på varslinger","perm_denied_btn":"Tillatelse avslått","perm_denied_expl":"Du tillot ikke varsler. Tillat varsler via innstillingene i din nettleser.","disable":"Slå av varslinger","enable":"Slå på varslinger","each_browser_note":"Merk: Denne innstillingen må endres for hver nettleser som brukes. Alle varsler vil bli deaktivert når du er i \"ikke forstyrr\", uavhengig av denne innstillingen.","consent_prompt":"Ønsker du å motta skrivebordsvarsler når andre svarer på dine innlegg?"},"dismiss":"Avslå","dismiss_notifications":"Forkast alle","dismiss_notifications_tooltip":"Merk alle uleste varslinger som lest","no_messages_title":"Du har ingen meldinger","no_messages_body":"Trenger du å ha en direkte personlig samtale med noen, utenfor den normale samtalestrømmen? Send beskjed til dem ved å velge avatar og bruke %{icon} meldings-knappen.\u003cbr\u003e\u003cbr\u003e Hvis du trenger hjelp, kan du \u003ca href='%{aboutUrl}'\u003esende en melding til en ansatt\u003c/a\u003e.\n","no_bookmarks_title":"Du har ikke bokmerket noe enda","no_bookmarks_body":"Start bokmerkeinnlegg med %{icon} -knappen og de vil bli oppført her for enkel referanse. Du kan også planlegge en påminnelse!\n","no_notifications_title":"Du har ingen varsler enda","no_notifications_body":"Du vil bli varslet i dette panelet om aktivitet som er direkte relevant for deg, inkludert svar på dine emner og innlegg, når noen \u003cb\u003e@mentions\u003c/b\u003e du eller siterer deg, og svarer på emner du våker. Varsler vil også bli sendt til e-post når du ikke har logget inn en stund. \u003cbr\u003e\u003cbr\u003e Se etter %{icon} for å bestemme hvilke spesielle emner, kategorier og tagger du ønsker å få beskjed om. For mer, se dine \u003ca href='%{preferencesUrl}'\u003evarselpreferanser\u003c/a\u003e.\n","no_notifications_page_title":"Du har ingen varsler enda","first_notification":"Ditt første varsel! Velg det for å komme i gang.","dynamic_favicon":"Vis antall på nettleserikonet","skip_new_user_tips":{"description":"Hopp over nye brukeropplæringstips og merker","not_first_time":"Ikke din første gang?","skip_link":"Hopp over disse tipsene","read_later":"Jeg leser den senere."},"theme_default_on_all_devices":"Gjør dette standardtemaet til alle mine enheter","color_scheme_default_on_all_devices":"Angi standard fargemelding(er) på alle mine enheter","color_scheme":"Farge Tema","color_schemes":{"default_description":"Tema standard","disable_dark_scheme":"Samme som vanlig","dark_instructions":"Du kan forhåndsvise den mørke modusen ved å endre på enhetens mørke modus.","undo":"Tilbakestill","regular":"Aktivt medlem","dark":"Mørk modus","default_dark_scheme":"(nettstedsstandard)"},"dark_mode":"Mørk Modus","dark_mode_enable":"Aktivere automatisk fargevalg i mørk modus","text_size_default_on_all_devices":"Gjør denne standardtekststørrelsen på alle mine enheter","allow_private_messages":"Tillat andre brukere å sende meg personlige meldinger","external_links_in_new_tab":"Åpne alle eksterne lenker i ny fane","enable_quoting":"Aktiver svar med sitat for uthevet tekst","enable_defer":"Aktiver utsettelse for å merke emner ulest","change":"Endre","featured_topic":"Utvalgte emne","moderator":"%{user} er en moderator","admin":"%{user} er en admin","moderator_tooltip":"Denne brukeren er en moderator","admin_tooltip":"Denne brukeren er en administrator","silenced_tooltip":"Denne brukeren er dempet","suspended_notice":"Denne brukeren er utestengt til %{date}.","suspended_permanently":"Denne brukeren er utestengt.","suspended_reason":"Begrunnelse:","github_profile":"GitHub","email_activity_summary":"Oppsummering av aktivitet","mailing_list_mode":{"label":"E-postlistemodus","enabled":"Slå på e-postlistemodus","instructions":"Denne innstillingen overstyrer oppsummeringen av aktivitet.\u003cbr /\u003e\nIgnorerte emner og kategorier blir ikke inkludert i disse e-postene.\n","individual":"Send en e-post for hvert nye innlegg","individual_no_echo":"Send en e-post for hvert nye innlegg bortsett fra mine egne","many_per_day":"Send meg en e-post for hvert nye innlegg (rundt %{dailyEmailEstimate} per deg)","few_per_day":"Send meg en e-post for hvert nye innlegg (rundt to ganger om dagen)","warning":"E-postlistemodus er aktivert. Instillinger for e-postvarslinger blir overstyrt."},"tag_settings":"Stikkord","watched_tags":"Fulgt","watched_tags_instructions":"Du vil automatisk følge alle emner som har disse stikkordene. Du vil bli varslet om alle nye innlegg og emner, og antallet nye innlegg til også vises ved siden av emnet.","tracked_tags":"Overvåkes","tracked_tags_instructions":"Du vil automatisk overvåke alle emner som har disse stikkordene. Antallet nye innlegg vil vises ved siden av emnet.","muted_tags":"Ignorert","muted_tags_instructions":"Du vil ikke bli varslet om noe vedrørende nye emner som har disse stikkordene, og de vil ikke vises i siste.","watched_categories":"Fulgt","watched_categories_instructions":"Du vil automatisk følge alle emnene i disse kategoriene. Du vil bli varslet om alle nye innlegg og emner, og antallet nye innlegg vil vises ved siden av emnet.","tracked_categories":"Overvåkes","tracked_categories_instructions":"Du vil automatisk overvåke alle emner i disse kategoriene. Tallet på nye innlegg vil vises ved siden av emnet.","watched_first_post_categories":"Følger første innlegg","watched_first_post_categories_instructions":"Du vil bli varslet om det første innlegget i hvert nye emne i disse kategoriene.","watched_first_post_tags":"Følger første innlegg","watched_first_post_tags_instructions":"Du vil bli varslet om det første innlegget i hvert nye emne med disse stikkordene.","muted_categories":"Ignorert","muted_categories_instructions":"Brukerne vil ikke bli varslet om nye emner i disse kategoriene, og de vil ikke dukke opp på kategorier eller nyeste temasider.","muted_categories_instructions_dont_hide":"Du vil ikke bli varslet om nye emner i disse kategoriene.","regular_categories":"Aktivt medlem","regular_categories_instructions":"Du vil se disse kategoriene i temaene “Latest” og “Top”.","no_category_access":"Som moderator har du begrenset kategoritilgang, lagring er avskrudd.","delete_account":"Slett kontoen min","delete_account_confirm":"Er du sikker på at du vil slette kontoen din permanent? Denne handlingen kan ikke angres!","deleted_yourself":"Slettingen av din konto har vært vellykket.","delete_yourself_not_allowed":"Vennligst kontakt et medlem av staben hvis du ønsker at kontoen din skal slettes.","unread_message_count":"Meldinger","admin_delete":"Slett","users":"Brukere","muted_users":"Ignorert","muted_users_instructions":"Undertrykk alle varsler og PMs fra disse brukerne.","allowed_pm_users":"Tillatt","allowed_pm_users_instructions":"Godta kun PMs fra disse brukerne.","allow_private_messages_from_specific_users":"Tillat bare spesifikke brukere å sende meg personlige meldinger","ignored_users":"Ignorert","ignored_users_instructions":"Undertrykk alle innlegg, meldinger og meldinger fra disse brukerne.","tracked_topics_link":"Vis","automatically_unpin_topics":"Fjern feste for et emne automatisk når jeg når bunnen.","apps":"Programmer","revoke_access":"Trekk tilbake tilgang","undo_revoke_access":"Angre tilbaketrekking av tilgang","api_approved":"Godkjent:","api_last_used_at":"Sist brukt på:","theme":"Drakt","save_to_change_theme":"Temaet vil bli oppdatert etter at du klikker på \"%{save_text}»","home":"Forvalgt hjemmeside","staged":"Arrangert","staff_counters":{"flags_given":"nyttige rapporteringer","flagged_posts":"rapporterte innlegg","deleted_posts":"slettede innlegg","suspensions":"suspenderinger","warnings_received":"advarsler","rejected_posts":"avviste innlegg"},"messages":{"inbox":"Innboks","latest":"Siste","sent":"Sendt","unread":"Uleste","unread_with_count":{"one":"Ulest (%{count})","other":"Ulest (%{count})"},"new":"Nye","new_with_count":{"one":"Nye (%{count})","other":"Nye (%{count})"},"archive":"Arkiver","groups":"Mine grupper","move_to_inbox":"Flytt til innboks","move_to_archive":"Arkiver","failed_to_move":"Kunne ikke flytte valgte meldinger (kanskje nettforbindelsen din er nede)","tags":"Stikkord","warnings":"Offisielle advarsler"},"preferences_nav":{"account":"Konto","security":"Sikkerhet","profile":"Profil","emails":"E-poster","notifications":"Varsler","categories":"Kategorier","users":"Brukere","tags":"Stikkord","interface":"Grensesnitt","apps":"Programmer"},"change_password":{"success":"(e-post sendt)","in_progress":"(sender e-post)","error":"(feil)","emoji":"lås emoji","action":"Send e-post for nullstilling av passord","set_password":"Sett passord","choose_new":"Velg et nytt passord","choose":"Velg et passord"},"second_factor_backup":{"title":"To-faktor backup koder","regenerate":"Regenerer","disable":"Deaktiver","enable":"Aktiver","enable_long":"Aktiver reservekoder","manage":{"one":"Administrer sikkerhetskoder. Du har \u003cstrong\u003e%{count}\u003c/strong\u003e reservekode igjen.","other":"Administrer sikkerhetskoder. Du har igjen \u003cstrong\u003e%{count}\u003c/strong\u003e reservekoder."},"copy_to_clipboard":"Kopier til utklippstavle","copy_to_clipboard_error":"Feil ved kopiering til utklippstavlen","copied_to_clipboard":"Kopiert til utklippstavlen","download_backup_codes":"Last ned sikkerhetskoder","use":"Bruk en sikkerhetskode","enable_prerequisites":"Du må aktivere en primær tofaktormetode før du genererer sikkerhetskopieringskoder.","codes":{"title":"Reservekoder opprettet","description":"Hver av reservekodene kan kun brukes en gang. Oppbevar dem et trygt men tilgjengelig sted."}},"second_factor":{"title":"To-faktor autentisering","enable":"deaktiver totrinnsverifisering","disable_all":"Deaktiver Alle","forgot_password":"Glemt passord?","confirm_password_description":"Bekreft passordet ditt for å fortsette","name":"Navn","label":"Kode","rate_limit":"Vennligst vent før du prøver en annen autentiseringskode.","enable_description":"Skann denne QR-koden i en støttet app (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e - \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) og skriv inn autentiseringskoden.\n","disable_description":"Vennligst oppgi autentiseringskoden fra appen","show_key_description":"Skriv inn manuelt","short_description":"Beskytt kontoen din med engangs sikkerhetskoder.\n","extended_description":"To-faktor autentisering legger til ekstra sikkerhet på kontoen din ved å kreve en engangstoken i tillegg til passordet ditt. Tokens kan genereres på \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e og \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e enheter.\n","oauth_enabled_warning":"Vær oppmerksom på at sosiale login-metoder deaktiveres når tofaktor autentisering er aktivert på kontoen din.","use":"Bruk Autentisering-appen","enforced_notice":"Du er nødvendig for å aktivere to-faktor-autentisering før du går inn på dette nettstedet.","disable":"Deaktiver","disable_confirm":"Er du sikker på at du vil skru av alle to-faktor-metoder?","save":"Lagre","edit":"Rediger","edit_title":"Rediger autentisering","edit_description":"Autentiserings navn","enable_security_key_description":"Når du har din \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003emaskinvaresikkerhetsnøkkel\u003c/a\u003e klargjort, trykk på Registrer knappen nedenfor.\n","totp":{"title":"Token-baserte autentiseringer","add":"Legg til autentisering","default_name":"Min Autentisering","name_and_code_required_error":"Du må angi et navn og koden fra din autentiseringsapp."},"security_key":{"register":"Registrer","title":"Sikkerhetsnøkler","add":"Legg til sikkerhetsnøkkel","default_name":"Hoved sikkerhetsnøkkel","not_allowed_error":"Sikkerhetsnøkkelens prosess ble enten tidsavbrutt eller kansellert.","already_added_error":"Du har allerede registrert denne sikkerhetsnøkkelen. Du trenger ikke å registrere den igjen.","edit":"Rediger sikkerhetsnøkkel","save":"Lagre","edit_description":"Navn på sikkerhetsnøkkel","name_required_error":"Du må angi et navn for sikkerhetsnøkkelen."}},"change_about":{"title":"Rediger om meg","error":"Det oppstod en feil ved endring av denne verdien."},"change_username":{"title":"Endre brukernavn","confirm":"Er du helt sikker på at du ønsker å endre brukernavnet ditt?","taken":"Beklager, det brukernavnet er tatt.","invalid":"Det brukernavnet er ugyldig. Det kan bare inneholde nummer og bokstaver."},"add_email":{"title":"Send e-post","add":"legg til"},"change_email":{"title":"Endre e-postadresse","taken":"Beklager, den e-postadressen er ikke tilgjengelig.","error":"Det oppstod en feil ved endring av din e-postadresse. Kanskje den adressen allerede er i bruk?","success":"Vi har sendt en e-post til den adressen. Følg instruksjonene i meldingen.","success_via_admin":"Vi har sendt en e-post til den adressen. Følg instruksjonene i meldingen.","success_staff":"Vi har sendt en e-post til den gjeldende adressen. Følg bekreftelsesinstruksjonene."},"change_avatar":{"title":"Bytt profilbilde","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, basert på","gravatar_title":"Endre din avatar på %{gravatarName}sin nettside","gravatar_failed":"Vi kunne ikke finne en %{gravatarName} med den e-postadressen.","refresh_gravatar_title":"Oppdater din %{gravatarName}","letter_based":"Systemtildelt profilbilde","uploaded_avatar":"Egendefinert bilde","uploaded_avatar_empty":"Legg til egendefinert bilde","upload_title":"Last opp bilde","image_is_not_a_square":"Vi har beskåret bildet ditt, høyde og bredde er ikke lik","logo_small":"Nettstedets lille logo. Brukes som standard."},"change_profile_background":{"title":"bakgrunns bildet","instructions":"Profiloverskrifter vil være sentrert og har en standardbredde på 1110 piksler."},"change_card_background":{"title":"Brukerkort bakgrunn","instructions":"Bakgrunnsbilder vil bli sentrert og ha en forvalgt bredde på 590 piksler."},"change_featured_topic":{"title":"Håndplukket emne","instructions":"En lenke til dette emnet vil være på brukerkortet ditt, og profilen."},"email":{"title":"E-post","primary":"Primær e-post","secondary":"Sekundære e-poster","primary_label":"primær","unconfirmed_label":"ubekreftet","resend_label":"send bekreftelses-e-post på nytt","resending_label":"sender...","resent_label":"e-post sendt","update_email":"Endre e-postadresse","set_primary":"Angi primær e-post","destroy":"Remove Email","add_email":"Legg til alternativ e-post","auth_override_instructions":"E-post kan oppdateres fra autentiseringsleverandør.","no_secondary":"Ingen sekundære e-poster","instructions":"Vises aldri offentlig","admin_note":"Merk: En admin bruker å endre e-post fra ikke-administratorer indikerer at brukeren har mistet tilgang til sin opprinnelige e-postkonto, så en tilbakestilling av passord vil bli sendt til sin nye adresse. Brukerens e-post vil ikke endre før de fullfører tilbakestillingsprosessen.","ok":"Vi sender deg en e-post for å bekrefte","required":"Vennligst angi en e-postadresse","invalid":"Oppgi en gyldig e-postadresse","authenticated":"Din e-post har blitt autentisert av %{provider}","invite_auth_email_invalid":"Invitasjons-e-posten din samsvarer ikke med e-posten godkjent av %{provider}","authenticated_by_invite":"E-posten din er blitt godkjent av invitasjonen","frequency_immediately":"Vi sender deg umiddelbart en e-post hvis du ikke har lest det vi sender e-post om.","frequency":{"one":"Vi sender deg bare e-post hvis vi ikke har sett deg deg det siste minuttet.","other":"Vi sender deg bare e-post hvis vi ikke har sett deg de siste %{count} minuttene."}},"associated_accounts":{"title":"Tilknyttede kontoer","connect":"Koble til","revoke":"Trekk tilbake","cancel":"Avbryt","not_connected":"(ikke tilkoblet)","confirm_modal_title":"Koble til %{provider} -konto","confirm_description":{"account_specific":"Din %{provider} konto '%{account_description}' vil bli brukt til autentisering.","generic":"Kontoen din på %{provider} vil bli brukt i autentisering."}},"name":{"title":"Navn","instructions":"ditt fulle navn (valgfritt)","instructions_required":"Ditt fulle navn","required":"Vennligst skriv inn et navn","too_short":"Navnet ditt er for kort.","ok":"Navnet ditt ser bra ut."},"username":{"title":"Brukernavn","instructions":"unikt, ingen mellomrom, kort","short_instructions":"Folk kan nevne deg som @%{username}.","available":"Ditt brukernavn er tilgjengelig.","not_available":"Ikke tilgjengelig. Prøv %{suggestion}?","not_available_no_suggestion":"Ikke tilgjengelig","too_short":"Ditt brukernavn er for kort.","too_long":"Ditt brukernavn er for langt.","checking":"Sjekker brukernavnets tilgjengelighet…","prefilled":"E-post stemmer med dette registrerte brukernavnet","required":"Skriv inn et brukernavn","edit":"Rediger brukernavn"},"locale":{"title":"Språk for grensesnitt","instructions":"Språk for grensesnitt. Endringen vil tre i kraft når du oppdaterer siden.","default":"(forvalg)","any":"alle"},"password_confirmation":{"title":"Passord igjen"},"invite_code":{"title":"Invitasjonskode","instructions":"Registrering av konto krever en invitasjonskode"},"auth_tokens":{"title":"Nylig brukte enheter","details":"Detaljer","log_out_all":"Logg ut alle","not_you":"Ikke du?","show_all":"Vis alle (%{count})","show_few":"Vis færre","was_this_you":"Var dette deg?","was_this_you_description":"Hvis det ikke var deg, anbefaler vi at du bytter passord og logger ut overalt.","browser_and_device":"%{browser} på %{device}","secure_account":"Sikre kontoen min","latest_post":"Du postet sist…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} ∙ \u003cspan class=\"active\"\u003eaktiv nå\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"Siste innlegg","last_seen":"Sist sett","created":"Medlem fra","log_out":"Logg ut","location":"Sted","website":"Nettsted","email_settings":"E-post","hide_profile_and_presence":"Skjul min offentlige profil og tilstedeværelsesfunksjoner","enable_physical_keyboard":"Aktiver fysisk tastaturstøtte på iPad","text_size":{"title":"Tekststørrelse","smallest":"Minste","smaller":"Mindre","normal":"Normal","larger":"Større","largest":"Største"},"title_count_mode":{"title":"Tittel på bakgrunnssiden viser antall av:","notifications":"Nye varsler","contextual":"Nytt sideinnhold"},"like_notification_frequency":{"title":"Varsle når likt","always":"Alltid","first_time_and_daily":"Første gang et innlegg blir likt, og daglig","first_time":"Første gang et innlegg blir likt","never":"Aldri"},"email_previous_replies":{"title":"Inkluder tidligere svar nederst i e-poster","unless_emailed":"med mindre sendt tidligere","always":"alltid","never":"aldri"},"email_digests":{"title":"Når jeg ikke besøker her, send meg en oversikt over populære emner og svar på e-post","every_30_minutes":"hvert 30 minutt","every_hour":"hver time","daily":"daglig","weekly":"ukentlig","every_month":"hver måned","every_six_months":"hver sjette måned"},"email_level":{"title":"Send meg en e-post når noen siterer meg, svarer på innlegget mitt, nevner @brukernavnet mitt eller inviterer meg til et emne","always":"alltid","only_when_away":"bare når du er borte","never":"aldri"},"email_messages_level":"Motta en e-post når noen sender meg en melding","include_tl0_in_digests":"Inkluder innhold fra nye brukere i oppsummerings-eposter","email_in_reply_to":"Inkluder et utdrag i e-poster av innlegget man svarer på","other_settings":"Annet","categories_settings":"Kategorier","new_topic_duration":{"label":"Anse emner som nye når","not_viewed":"jeg ikke har sett dem ennå","last_here":"opprettet siden jeg var her sist","after_1_day":"opprettet i løpet av det siste døgnet","after_2_days":"opprettet i løpet av de siste 2 døgnene","after_1_week":"opprettet i løpet av sist uke","after_2_weeks":"opprettet i løpet av de siste 2 ukene"},"auto_track_topics":"Overvåk automatisk emner jeg åpner","auto_track_options":{"never":"aldri","immediately":"øyeblikkelig","after_30_seconds":"etter 30 sekunder","after_1_minute":"etter 1 minutt","after_2_minutes":"etter 2 minutt","after_3_minutes":"etter 3 minutt","after_4_minutes":"etter 4 minutt","after_5_minutes":"etter 5 minutt","after_10_minutes":"etter 10 minutt"},"notification_level_when_replying":"Når jeg skriver noe i et emne, sett emnet som","invited":{"title":"invitasjoner","pending_tab":"På vent","pending_tab_with_count":"Ventende (%{count})","expired_tab":"Utløpt","expired_tab_with_count":"Utløpt (%{count})","redeemed_tab":"Brukt","redeemed_tab_with_count":"Innløste (%{count})","invited_via":"Invitasjon","invited_via_link":"link %{key} (%{count} / %{max} innløst)","groups":"Grupper","topic":"Emne","sent":"Opprettet/sist sendt","expires_at":"Utløper","edit":"Rediger","remove":"Fjern","copy_link":"Få lenke","reinvite":"Send e-post på nytt","reinvited":"Invitasjon sendt igjen","removed":"Fjernet","search":"skriv for å søke etter invitasjoner…","user":"Invitert bruker","none":"Ingen invitasjoner å vise.","truncated":{"one":"Viser den første invitasjonen.","other":"Viser de %{count} første invitisajonene."},"redeemed":"Løs inn invitasjoner","redeemed_at":"Løst inn ved","pending":"Ventende invitasjoner","topics_entered":"Emner vist","posts_read_count":"Innlegg lest","expired":"Denne invitasjonen har utløpt","remove_all":"Fjern utløpte invitasjoner","removed_all":"Alle utløpte invitasjoner fjernet!","remove_all_confirm":"Er du sikker på at du vil fjerne alle utløpte invitasjoner?","reinvite_all":"Send alle invitasjoner på nytt","reinvite_all_confirm":"Er du sikker på at du vil sende ut alle invitasjoner igjen?","reinvited_all":"Alle invitasjoner sendt!","time_read":"Lesetid","days_visited":"Dager besøkt","account_age_days":"Kontoalder i dager","create":"Inviter","generate_link":"Opprett invitasjonslink","link_generated":"Her er din invitasjons link!","valid_for":"Invitasjonslenke er kun gyldig for denne e-postadressen: %{email}","single_user":"Inviter via e-post","multiple_user":"Inviter av lenke","invite_link":{"title":"Invitasjons link","success":"Invitasjonslenke har blitt generert!","error":"Det oppstod en feil under generering av invitasjonslenke","max_redemptions_allowed_label":"Hvor mange personer har lov til å registrere seg ved hjelp av denne lenken?","expires_at":"Når vil denne invitasjonslenken utløp?"},"invite":{"new_title":"Opprett invitasjon","edit_title":"Rediger invitasjon","instructions":"Del denne lenken for å gi tilgang til dette nettstedet umiddelbart","copy_link":"kopier link","expires_in_time":"Utløper om %{time}","expired_at_time":"Utløpt kl. %{time}","show_advanced":"Vis avanserte innstillinger","hide_advanced":"Skjul avanserte alternativer","restrict_email":"Begrens til en e-postadresse","max_redemptions_allowed":"Maks antall bruk","add_to_groups":"Legg til i grupper","invite_to_topic":"Kom til dette emnet","expires_at":"Utløper etter","custom_message":"Valgfri personlig melding","send_invite_email":"Lagre og send e-post","save_invite":"Lagre invitasjon","invite_saved":"Invitasjon lagret.","invite_copied":"Invitasjonslenken er kopiert."},"bulk_invite":{"none":"Ingen invitasjoner til å vise på denne siden.","text":"Bulk invitasjon","instructions":"\u003cp\u003eInviter en liste over brukere for å få fellesskapet til å gå raskt. Forbered en \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV-fil\u003c/a\u003e som inneholder minst en rad per e-postadresse til brukere som du vil invitere. Følgende kommaseparert informasjon kan gis hvis du vil legge til personer i grupper, eller sende dem til et bestemt emne første gang de logger inn.\u003c/p\u003e\n\u003cpre\u003ejohn@smith. om,first_group_name; econd_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eHver e-postadresse i din opplastede CSV-fil vil bli sendt en invitasjon, og du vil kunne administrere det senere.\u003c/p\u003e\n","progress":"Lastet opp %{progress}%...","success":"Filen ble lastet opp. Du vil bli varslet via melding når prosessen er fullført.","error":"Beklager, fila må være i CSV-format."}},"password":{"title":"Passord","too_short":"Passordet ditt er for kort","common":"Det passordet er for vanlig.","same_as_username":"Ditt passord er det samme som ditt brukernavn.","same_as_email":"Ditt passord er det samme som din e-post.","ok":"Passordet ditt ser bra ut","instructions":"minst %{count} tegn","required":"Skriv inn et passord"},"summary":{"title":"Oppsummering","stats":"Statistikk","time_read":"lesetid","recent_time_read":"nylig lesetid","topic_count":{"one":"emne opprettet","other":"emner opprettet"},"post_count":{"one":"innlegg skrevet","other":"innlegg skrevet"},"likes_given":{"one":"gitt","other":"gitt"},"likes_received":{"one":"mottatt","other":"mottatt"},"days_visited":{"one":"dag besøkt","other":"dager besøkt"},"topics_entered":{"one":"emne vist","other":"emner vist"},"posts_read":{"one":"innlegg lest","other":"innlegg lest"},"bookmark_count":{"one":"bokmerke","other":"bokmerker"},"top_replies":"Mest Populære Svar","no_replies":"Ingen svar ennå.","more_replies":"Flere svar","top_topics":"Mest populære emner","no_topics":"Ingen emner enda.","more_topics":"Flere emner","top_badges":"Toppmerker","no_badges":"Ingen merker ennå.","more_badges":"Flere merker","top_links":"Topplenker","no_links":"Ingen lenker enda","most_liked_by":"Mest likt av","most_liked_users":"Mest likt","most_replied_to_users":"Mest besvart","no_likes":"Ingen likes her ennå.","top_categories":"Toppkategorier","topics":"Emner","replies":"Svar"},"ip_address":{"title":"Siste IP-adresse"},"registration_ip_address":{"title":"Registreringens IP-adresse."},"avatar":{"title":"Profilbilde","header_title":"Profil, meldinger, bokmerker og innstillinger","name_and_description":"%{name} - %{description}","edit":"Rediger profilbilde"},"title":{"title":"Tittel","none":"(ingen)","instructions":"vises etter ditt brukernavn"},"flair":{"title":"Flair","none":"(ingen)","instructions":"ikonet som vises ved siden av profilbildet ditt"},"primary_group":{"title":"Primærgruppe","none":"(ingen)"},"filters":{"all":"Alle"},"stream":{"posted_by":"Skrevet av","sent_by":"Sendt av","private_message":"melding","the_topic":"emnet"},"date_of_birth":{"user_title":"I dag er det din geburtsdag!","title":"I dag er det min geburtsdag!","label":"Fødselsdato"},"anniversary":{"user_title":"I dag er det jubileum for når du tok del i gemenskapen!","title":"I dag er det jubileum for når du tok del i denne gemenskapen!"}},"loading":"Laster…","errors":{"prev_page":"ved lasting","reasons":{"network":"Nettverksfeil","server":"Serverfeil","forbidden":"Tilgang avslått","unknown":"Feil","not_found":"Side Ikke funnet"},"desc":{"network":"Sjekk nettverkstilkoblingen din","network_fixed":"Ser ut som om den er tilbake.","server":"Feilkode: %{status}","forbidden":"Du har ikke tilgang til å se det.","not_found":"Oisann, programmet forsøkte å laste inn en URL som ikke eksisterer.","unknown":"Noe gikk galt."},"buttons":{"back":"Gå tilbake","again":"Prøv igjen","fixed":"Last side"}},"modal":{"close":"lukk","dismiss_error":"Avvis feil"},"close":"Lukk","assets_changed_confirm":"Dette nettstedet har nettopp mottatt en programvareoppgradering. Hent nyeste versjon nå?","logout":"Du ble logget ut","refresh":"Refresh","home":"Hjem","read_only_mode":{"enabled":"Dette nettstedet er i lesemodus. Fortsett gjerne å lese, men du kan ikke svare, gi likes eller utføre andre handlinger som er slått av.","login_disabled":"Innlogging er deaktivert mens nettsiden er i skrivebeskyttet modus.","logout_disabled":"Du kan ikke logge ut når nettstedet er i lese-modus."},"logs_error_rate_notice":{},"learn_more":"lær mer…","first_post":"Første innlegg","mute":"Ignorer","unmute":"Fjern ignorering","last_post":"Postet","local_time":"Lokal tid","time_read":"Les","time_read_recently":"%{time_read} nylig","time_read_tooltip":"%{time_read} total tidsforbruk på lesning","time_read_recently_tooltip":"%{time_read} total tidsforbruk på lesning (%{recent_time_read} i løpet av de siste 60 dagene)","last_reply_lowercase":"siste svar","replies_lowercase":{"one":"svar","other":"svar"},"signup_cta":{"sign_up":"Registrer deg","hide_session":"Spør meg igjen i morgen","hide_forever":"nei takk","hidden_for_session":"OK, vi vil spørre deg i morgen. Du kan alltid bruke \"Logg Inn\" for å opprette en konto.","intro":"Hei! Ser ut som du liker diskusjonen, men du har ikke registrert deg for en konto ennå.","value_prop":"Når du oppretter en konto, husker vi nøyaktig det du har lest, så du kommer alltid tilbake der du slapp av. Du får også varslinger, her og via e-post, når noen svarer på deg. Du kan like innlegg for å dele kjærligheten. :heartpulse:"},"summary":{"enabled_description":"Du ser for øyeblikket en oppsummering av dette emnet: de mest interessante innleggene ifølge brukerne.","enable":"Oppsummer dette emnet","disable":"Vis alle innlegg"},"deleted_filter":{"enabled_description":"Dette emnet inneholder slettede innlegg, som er blitt skjult.","disabled_description":"Slettede innlegg i emnet vises.","enable":"Skjul slettede innlegg","disable":"Vis slettede innlegg"},"private_message_info":{"title":"Send","invite":"Inviter Andre...","edit":"Legg til eller slett...","remove":"Fjern...","add":"Legg til …","leave_message":"Ønsker du virkelig å legge igjen denne meldingen?","remove_allowed_user":"Er du sikker på at du vil fjerne %{name} fra denne meldingen?","remove_allowed_group":"Vil du virkelig fjerne %{name} fra denne meldingen?"},"email":"E-post","username":"Brukernavn","last_seen":"Sett","created":"Opprettet","created_lowercase":"opprettet","trust_level":"Tillitsnivå","search_hint":"brukernavn, e-post eller IP-adresse","create_account":{"header_title":"Velkommen!","subheader_title":"La oss opprette kontoen din","disclaimer":"Ved å registrere deg, godtar du \u003ca href='%{privacy_link}' target='blank'\u003eretningslinjer for personvern\u003c/a\u003e og \u003ca href='%{tos_link}' target='blank'\u003evilkår for bruk\u003c/a\u003e.","title":"Opprett konto","failed":"Noe gikk galt, kanskje denne e-postadressen allerede er registrert. Prøv lenke for glemt passord"},"forgot_password":{"title":"Nullstill Passord","action":"Glemt passord","invite":"Skriv inn ditt brukernavn eller din e-postadresse, så sender vi deg en e-post for å nullstille ditt passord.","reset":"Nullstill passord","complete_username":"Hvis en konto med brukernavn \u003cb\u003e%{username}\u003c/b\u003e finnes vil du motta en e-post om kort tid med instruksjoner om hvordan du kan nullstille passordet.","complete_email":"Hvis en konto med e-postadressen \u003cb\u003e%{email}\u003c/b\u003e eksisterer i systemet vil du om kort tid motta en e-post med instruksjoner om hvordan du kan nullstille passordet.","complete_username_found":"Vi fant en konto som samsvarer med brukernavnet \u003cb\u003e%{username}\u003c/b\u003e. Du vil motta en e-post med instruksjoner om hvordan du raskt tilbakestiller passordet.","complete_email_found":"Vi fant en konto som samsvarer med \u003cb\u003e%{email}\u003c/b\u003e. Du burde motta en e-post med instruksjoner om hvordan du raskt kan tilbakestille passordet ditt.","complete_username_not_found":"Ingen konto har med brukernavnet \u003cb\u003e%{username}\u003c/b\u003e er registrert","complete_email_not_found":"Ingen konto med e-postadressen \u003cb\u003e%{email}\u003c/b\u003e er registrert","help":"Fikk du ikke e-posten? Sjekk søppelposten din først.\u003cp\u003eEr du ikke sikker på hvilken e-postadresse du brukte. Skriv inn adressen her og vi vil fortelle deg om den finnes her.\u003c/p\u003e\u003cp\u003eHvis du ikke lenger har tilgang til e-postadressen på kontoen din, kontakt \u003ca href='%{basePath}/about'\u003evår hjelpfulle stab.\u003c/a\u003e\u003c/p\u003e","button_ok":"OK","button_help":"Hjelp"},"email_login":{"link_label":"Send meg lenke til innlogging via e-post","button_label":"med e-post","login_link":"Hopp over passordet; send meg en innloggingslenke","emoji":"lås emoji","complete_username":"Hvis en konto matcher brukernavnet \u003cb\u003e%{username}\u003c/b\u003e, vil du snart motta en e-post med en lenke som logger deg inn.","complete_email":"Hvis en konto matcher \u003cb\u003e%{email}\u003c/b\u003e, vil du snart motta en e-post med en lenke som logger deg inn.","complete_username_found":"Vi fant en konto som matcher brukernavnet \u003cb\u003e%{username}\u003c/b\u003e, du vil snart motta en e-post med lenke for innlogging.","complete_email_found":"Vi fant en konto som matcher \u003cb\u003e%{email}\u003c/b\u003e, du vil snart motta en e-post med lenke for innlogging.","complete_username_not_found":"Ingen konto har med brukernavnet \u003cb\u003e%{username}\u003c/b\u003e er registrert","complete_email_not_found":"Ingen konto med e-postadressen \u003cb\u003e%{email}\u003c/b\u003e er registrert","confirm_title":"Fortsett til %{site_name}","logging_in_as":"Logger inn som %{email}","confirm_button":"Fullfør innlogging"},"login":{"header_title":"Velkommen tilbake","subheader_title":"Logg inn på din konto","title":"Logg inn","username":"Bruker","password":"Passord","second_factor_title":"To-faktor autentisering","second_factor_description":"Skriv inn verifiseringskoden fra din app:","second_factor_backup":"Logg inn ved hjelp av en sikkerhetskode","second_factor_backup_title":"To-faktor sikkerhetskopiering","second_factor_backup_description":"Vennligst skriv en av reservekodene dine:","second_factor":"Logg inn med Authenticator-app","security_key_description":"Når du har din fysiske sikkerhetsnøkkel klargjort trykk på autentiseringen med sikkerhetsnøkkelknappen nedenfor.","security_key_alternative":"Prøv en annen måte","security_key_authenticate":"Autentiser med sikkerhetsnøkkel","security_key_not_allowed_error":"Autentiseringsprosessen for sikkerhetsnøkkelen ble enten tidsavbrutt eller kansellert.","security_key_no_matching_credential_error":"Ingen samsvarende opplysninger ble funnet på den angitte sikkerhetsnøkkelen.","security_key_support_missing_error":"Gjeldende enhet eller nettleser støtter ikke bruk av sikkerhetsnøkler. Vennligst bruk en annen metode.","email_placeholder":"E-post / Brukernavn","caps_lock_warning":"Caps Lock er på","error":"Ukjent feil","cookies_error":"Nettleseren ser ut til å ha deaktivert informasjonskapsler. Det kan hende at du ikke kan logge på uten at du aktiverer dem først.","rate_limit":"Vent litt før du logger inn igjen.","blank_username":"Vennligst oppgi din e-post eller brukernavn.","blank_username_or_password":"Oppgi din e-postadresse eller brukernavn og ditt passord.","reset_password":"Nullstill passord","logging_in":"Logger inn…","or":"Eller","authenticating":"Autentiserer…","awaiting_activation":"Din konto avventer aktivering. Bruk lenken for glemt passord for å sende en ny e-post for aktivering.","awaiting_approval":"Din konto har ikke blitt godkjent av en moderator ennå. Du vil motta en e-post når den er godkjent.","requires_invite":"Beklager, tilgang til dette forumet kun ved invitasjon.","not_activated":"Du kan ikke logge inn ennå. Vi sendte en e-post for aktivering til deg på \u003cb\u003e%{sentTo}\u003c/b\u003e. Følg instruksjonene i den e-posten for å aktivere din konto.","not_allowed_from_ip_address":"Du kan ikke logge inn fra den IP-adressen.","admin_not_allowed_from_ip_address":"Du kan ikke logge inn som administrator fra den IP-adressen.","resend_activation_email":"Klikk her for å sende e-posten for aktivering igjen.","omniauth_disallow_totp":"Kontoen din har to-faktor autentisering aktivert. Vennligst logg inn med passordet ditt.","resend_title":"Send aktivterings-e-post på nytt","change_email":"Endre e-postadresse","provide_new_email":"Oppgi en ny adresse og vi vil sende din aktiverings-e-post på nytt.","submit_new_email":"Oppdater e-postadresse","sent_activation_email_again":"Vi sendte deg en ny aktiverings-e-post på \u003cb\u003e%{currentEmail}\u003c/b\u003e. Det kan ta noen minutter før den kommer frem; ikke glem å sjekke søppelpostmappen.","sent_activation_email_again_generic":"Vi sendte en annen e-post med aktivering. Det kan ta noen minutter før den kommer frem; sørg for å sjekke søppelposten.","to_continue":"Logg inn","preferences":"Du må være innlogget for å endre brukerinnstillinger.","not_approved":"Kontoen din har ikke blitt godkjent ennå. Du vil få beskjed via e-post når du er klar til å logge inn.","google_oauth2":{"name":"Google","title":"med Google"},"twitter":{"name":"Twitter","title":"med Twitter"},"instagram":{"name":"Instagram","title":"med Instagram"},"facebook":{"name":"Facebook","title":"med Facebook"},"github":{"name":"GitHub","title":"med GitHub"},"discord":{"name":"Discord","title":"med Discord"},"second_factor_toggle":{"totp":"Bruk en autentiseringsapp i stedet","backup_code":"Bruk en sikkerhetskode i stedet"}},"invites":{"accept_title":"Invitasjon","emoji":"konvolutt emoji","welcome_to":"Velkommen til %{site_name}!","invited_by":"Du ble invitert av:","social_login_available":"Du vil også kunne logge inn med hvilken som helst annen sosial innloggingstjeneste ved bruk av den e-posten.","your_email":"E-postadressen tilknyttet din konto er \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Godta invitasjon","success":"Kontoen din har blitt opprettet og du er nå logget inn.","name_label":"Navn","password_label":"Passord","optional_description":"(valgfritt)"},"password_reset":{"continue":"Fortsett til %{site_name}"},"emoji_set":{"apple_international":"Apple/Internasjonalt","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Klassisk Google","facebook_messenger":"Facebook Meldingstjeneste"},"category_page_style":{"categories_only":"Kun kategorier","categories_with_featured_topics":"Kategorier med fremhevede emner","categories_and_latest_topics":"Kategorier og siste emner","categories_and_top_topics":"Kategorier og toppemner","categories_boxes":"Bokser med underkategorier","categories_boxes_with_topics":"Bokser med håndplukket emner"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Angi"},"conditional_loading_section":{"loading":"Laster…"},"category_row":{"topic_count":{"one":"%{count} emne i denne kategori","other":"%{count} emner i denne kategorien"},"plus_subcategories_title":{"one":"%{name} og en underkategori","other":"%{name} og %{count} underkategorier"},"plus_subcategories":{"one":"+ %{count} underkategori","other":"+ %{count} underkategorier"}},"select_kit":{"delete_item":"Slett %{name}","filter_by":"Filtrer etter %{name}","select_to_filter":"Velg en verdi å filtrere","default_header_text":"Velg…","no_content":"Ingen treff funnet","filter_placeholder":"Søk…","filter_placeholder_with_any":"Søk eller opprett...","create":"Opprett: %{content}","max_content_reached":{"one":"Du kan kun velge %{count} gjenstand.","other":"Du kan kun velge %{count} gjenstander."},"min_content_not_reached":{"one":"Velg minst %{count} element.","other":"Velg minst %{count} elementer."},"invalid_selection_length":{"one":"Utvalg må være minst %{count} tegn.","other":"Valg må være minst %{count} tegn."},"components":{"tag_drop":{"filter_for_more":"Filter for mer..."},"categories_admin_dropdown":{"title":"Administrere kategorier"}}},"date_time_picker":{"from":"Fra","to":"Til"},"emoji_picker":{"filter_placeholder":"Søk etter emoji","smileys_\u0026_emotion":"Smilefjes og følelser","people_\u0026_body":"Folk og kropp","animals_\u0026_nature":"Dyr og natur","food_\u0026_drink":"Mat og drikke","travel_\u0026_places":"Reise og steder","activities":"Aktiviteter","objects":"Objekter","symbols":"Symboler","flags":"Flagg","recent":"Nylig brukt","default_tone":"Ingen hudtone","light_tone":"Lys hudtone","medium_light_tone":"Middels lys hudtone","medium_tone":"Middels hudtone","medium_dark_tone":"Middels mørk hudtone","dark_tone":"Mørk hudtone","default":"Egendefinerte emoji-er"},"shared_drafts":{"title":"Delte kladder","notice":"Dette emnet er kun synlig for de som kan publisere felles utkast.","destination_category":"Målkategori","publish":"Publiser delt kladd","confirm_publish":"Er du sikker på at du vil publisere denne kladden?","publishing":"Publiserer emne…"},"composer":{"emoji":"Emoji :)","more_emoji":"mer…","options":"Alternativer","whisper":"hvisk","unlist":"skjult","add_warning":"Dette er en offisiell advarsel.","toggle_whisper":"Slå på/av hvisking","toggle_unlisted":"Skjul eller gjør synlig","posting_not_on_topic":"Du svarer på emnet \"%{title}\", men for øyeblikket ser du på et annet emne.","saved_local_draft_tip":"lagret lokalt","similar_topics":"Emnet ditt har likheter med…","drafts_offline":"utkast offline","edit_conflict":"rediger konflikt","group_mentioned":{"one":"Ved å nevne %{group}, er du i ferd med å henvende deg til \u003ca href='%{group_link}'\u003e%{count} én person\u003c/a\u003e – er du sikker?","other":"Ved å nevne %{group}, er du i ferd med å henvende deg til \u003ca href='%{group_link}'\u003e%{count} folk\u003c/a\u003e – er du sikker?"},"cannot_see_mention":{"category":"Du nevnte %{username}, men de vil ikke ikke bli varslet fordi de ikke har tilgang til denne kategorien. Du må legge dem til en gruppe som har tilgang til denne kategorien.","private":"Du nevnte %{username}, men de vil ikke bli varslet fordi de ikke kan se denne samtalen. Du må invitere dem til denne private samtalen."},"duplicate_link":"Det ser ut til at lenken din til \u003cb\u003e%{domain}\u003c/b\u003e allerede ble publisert i emnet av \u003cb\u003e@%{username}\u003c/b\u003e i \u003ca href='%{post_url}'\u003eet svar %{ago}\u003c/a\u003e. Er du sikker på at du vil publisere den igjen?","reference_topic_title":"RE: %{title}","error":{"title_missing":"Tittel er påkrevd","post_missing":"Innlegget kan ikke være tomt","try_like":"Har du prøvd %{heart}-knappen?","category_missing":"Du må velge en kategori","topic_template_not_modified":"Vennligst legg til detaljer og spesifikasjoner for emnet ditt ved å redigere emnemalen."},"save_edit":"Lagre endring","overwrite_edit":"Overskriv Rediger","reply_original":"Svar på det opprinnelige emnet","reply_here":"Svar her","reply":"Svar","cancel":"Avbryt","create_topic":"Opprett emne","create_pm":"Melding","create_whisper":"Hvisk","create_shared_draft":"Opprett delt kladd","edit_shared_draft":"Rediger delt utkast","users_placeholder":"Legg til en bruker","title_placeholder":"Oppsummert i en setning, hva handler denne diskusjonen om?","title_or_link_placeholder":"Skriv inn tittel eller lim inn en lenke her","edit_reason_placeholder":"hvorfor endrer du?","topic_featured_link_placeholder":"Skriv inn lenke vist med tittel.","remove_featured_link":"Fjern lenke fra emnet.","reply_placeholder":"Skriv her. Bruk Markdown, BBCode eller HTML for å formatere innholdet. Dra bilder hit eller lim dem inn.","reply_placeholder_no_images":"Skriv her. Bruk Markdown, BBkode, eller HTML for å formatere.","reply_placeholder_choose_category":"Velg en kategori før du skriver her","view_new_post":"Se ditt nye innlegg.","saving":"Lagrer","saved":"Lagret!","saved_draft":"Legg inn utkast pågår. Trykk for å gjenoppta.","uploading":"Laster opp…","show_preview":"vis forhåndsvisning","hide_preview":"skjul forhåndsvisning","quote_post_title":"Siter hele innlegget","bold_label":"F","bold_title":"Sterk","bold_text":"sterk tekst","italic_label":"K","italic_title":"Kursiv","italic_text":"kursiv tekst","link_title":"Hyperlenke","link_description":"beskriv lenken her","link_dialog_title":"Sett inn hyperlenke","link_optional_text":"valgfri tittel","link_url_placeholder":"Lim inn en URL eller skriv for å søke i emner","blockquote_title":"Sitatramme","blockquote_text":"Sitatramme","code_title":"Kodeutsnitt","code_text":"Skriv inn preformattert tekst med 4 mellomroms innrykk.","paste_code_text":"skriv inn eller kopier kode her","upload_title":"Bilde","upload_description":"beskriv bildet her","olist_title":"Nummerert liste","ulist_title":"Kulepunktliste","list_item":"Listeelement","toggle_direction":"Skift retning","help":"Hjelp for redigering i Markdown","collapse":"minimer redigeringspanelet","open":"minimer redigeringspanelet","abandon":"lukk redigeringspanel og forkast utkast","enter_fullscreen":"gå inn i fullskjerm komponist","exit_fullscreen":"avslutt fullskjerm komponist","show_toolbar":"vis verktøylinje for komponist","hide_toolbar":"skjul verktøylinje for komponist","modal_ok":"OK","modal_cancel":"Avbryt","cant_send_pm":"Beklager, du kan ikke sende privat melding til %{username}.","yourself_confirm":{"title":"Glemte du å legge til mottagere?","body":"Nå sender du denne meldingen bare til deg selv!"},"slow_mode":{"error":"Dette emnet er i sakte modus. Du har allerede postet nylig; du kan legge ut igjen om %{timeLeft}."},"admin_options_title":"Valgfrie emne-instillinger for stab","composer_actions":{"reply":"Svar","draft":"Utkast","edit":"Rediger","reply_to_post":{"label":"Svar på et innlegg av %{postUsername}","desc":"Svar på et spesifikt innlegg"},"reply_as_new_topic":{"label":"Svar med lenket emne","desc":"Opprette nytt emne lenket til dette emnet","confirm":"Du har et nytt emneutkast lagret, som vil bli overskrevet hvis du oppretter et koblet emne."},"reply_as_new_group_message":{"label":"Svar som ny gruppemelding","desc":"Opprett ny melding som starter med samme mottakere"},"reply_as_private_message":{"label":"Ny melding","desc":"Opprett en ny personlig melding"},"reply_to_topic":{"label":"Svar på emnet","desc":"Svar på emnet, ikke et spesifikt innlegg"},"toggle_whisper":{"label":"Veksle visking","desc":"Hvisking er kun synlig for stab"},"create_topic":{"label":"Nytt emne"},"shared_draft":{"label":"Delt kladd","desc":"Lag et emne som bare vil være synlig for tillatte brukere"},"toggle_topic_bump":{"label":"Slå på/av at emnet flyttes øverst","desc":"Svar uten å endre siste svardato"}},"reload":"Oppdater","ignore":"Ignorer","details_title":"Sammendrag","details_text":"Denne teksten vil skjules"},"notifications":{"tooltip":{"regular":{"one":"Én usett merknad","other":"%{count} usette merknader"},"message":{"one":"Én ulest melding","other":"%{count} uleste meldinger"},"high_priority":{"one":"%{count} uleste høyprioritets melding","other":"%{count} uleste høyprioritets varsler"}},"title":"varsler om at @navnet ditt blir nevnt, svar på dine innlegg og emner, meldinger, osv","none":"Notifikasjoner er ikke tilgjengelig for øyeblikket.","empty":"Ingen varsler funnet.","post_approved":"Ditt innlegg ble godkjent","reviewable_items":"elementer som krever gjennomgang","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} og én annen\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} og %{count} andre\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"likte %{count} av dine innlegg","other":"likte %{count} av dine innlegg"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e godtok din invitasjon","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e flyttet %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Gjorde seg fortjent til '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNytt emne\u003c/span\u003e %{description}","membership_request_accepted":"Medlemskap akseptert i '%{group_name}'","reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - fullført","group_message_summary":{"one":"%{count} melding i din %{group_name} innboks","other":"%{count} meldinger i din innboks for %{group_name}"},"popup":{"mentioned":"%{username} nevnte deg i \"%{topic}\" - %{site_title}","group_mentioned":"%{username} nevnte deg i \"%{topic}\" - %{site_title}","quoted":"%{username} siterte deg i \"%{topic}\" - %{site_title}","replied":"%{username} svarte deg i \"%{topic}\" - %{site_title}","posted":"%{username} skrev noe i \"%{topic}\" - %{site_title}","private_message":"%{username} sendte deg en personlig melding i \"%{topic}\" - %{site_title}","linked":"%{username} lenket til innlegget ditt i \"%{topic}\" - %{site_title}","watching_first_post":"%{username} opprettet et nytt emne \"%{topic}\" - %{site_title}","confirm_title":"Varslinger aktivert - %{site_title}","confirm_body":"Suksess! Varslinger er nå aktivert.","custom":"Varsling fra %{username} på %{site_title}"},"titles":{"mentioned":"nevnt","replied":"nytt svar","quoted":"sitert","edited":"redigert","liked":"ny som","private_message":"ny privat melding","invited_to_private_message":"invitert til privat melding","invitee_accepted":"invitasjonen akseptert","posted":"nytt innlegg","moved_post":"innlegg flyttet","linked":"knyttet","bookmark_reminder":"påminnelse for bokmerke","bookmark_reminder_with_name":"bokmerkepåminnelse - %{name}","granted_badge":"merket gitt","invited_to_topic":"invitert til emnet","group_mentioned":"gruppe nevnt","group_message_summary":"nye gruppe-meldinger","watching_first_post":"nytt emne","topic_reminder":"Emne påminnelse","liked_consolidated":"nye likes","post_approved":"innlegg godkjent","membership_request_consolidated":"ny forespørsel om medlemskap","reaction":"ny reaksjon","votes_released":"Stemmen ble utgitt"}},"upload_selector":{"uploading":"Laster opp bilde","processing":"Behandler opplasting","select_file":"Velg fil","default_image_alt_text":"bilde"},"search":{"sort_by":"Sorter etter","relevance":"Relevanse","latest_post":"Siste innlegg","latest_topic":"Siste emne","most_viewed":"Mest Lest","most_liked":"Mest Likt","select_all":"Velg alle","clear_all":"Fjern Alle","too_short":"Din søketekst er for kort.","result_count":{"one":"\u003cspan\u003e%{count} resultat for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} resultater for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"Søk","full_page_title":"Søk","no_results":"Ingen resultater funnet.","no_more_results":"Ingen flere resultater funnet.","post_format":"#%{post_number} av %{username}","results_page":"Søkeresultater for \"%{term}\"","more_results":"Det finnes flere resultater. Begrens søket ditt.","cant_find":"Finner du ikke det du leter etter?","start_new_topic":"Kanskje du kan starte et nytt emne?","or_search_google":"Eller prøv å søke på Google istedenfor:","search_google":"Prøv å søke på Google istedenfor:","search_google_button":"Google","search_button":"Søk","categories":"Kategorier","tags":"Stikkord","type":{"users":"Brukere","categories":"Kategorier"},"context":{"user":"Søk i innleggene av @%{username}","category":"Søk i kategorien #%{category}","tag":"Søk i #%{tag} taggen","topic":"Søk i dette emnet","private_messages":"Søk i meldinger"},"advanced":{"posted_by":{"label":"Skrevet av"},"in_category":{"label":"Kategorisert"},"in_group":{"label":"I gruppen"},"with_badge":{"label":"Med merke"},"with_tags":{"label":"Med stikkord"},"filters":{"label":"Vis bare emner/innlegg…","title":"Med treff i tittelen","likes":"Jeg likte","posted":"jeg skrev innlegg i","created":"Jeg opprettet","watching":"Jeg følger","tracking":"Jeg overvåker","private":"I mine meldinger","bookmarks":"Jeg bokmerket","first":"er det første innlegget","pinned":"er festet","seen":"Jeg leste","unseen":"Jeg har ikke lest","wiki":"er wiki","images":"inkluder bilde(r)","all_tags":"Alle stikkord nevnt ovenfor"},"statuses":{"label":"Hvor emner","open":"er åpne","closed":"er lukkede","public":"er offentlige","archived":"er arkiverte","noreplies":"har ingen svar","single_user":"inneholder bare én bruker"},"post":{"count":{"label":"Innlegg"},"min":{"placeholder":"minst"},"max":{"placeholder":"største"},"time":{"label":"Skrevet","before":"før","after":"etter"}},"views":{"label":"Visninger"},"min_views":{"placeholder":"minst"},"max_views":{"placeholder":"største"}}},"new_item":"ny","go_back":"gå tilbake","not_logged_in_user":"brukerside med oppsummering av nåværende aktivtet og preferanser.","current_user":"gå til din brukerside","view_all":"se alle %{tab}","topics":{"new_messages_marker":"siste besøk","bulk":{"select_all":"Velg alle","clear_all":"Fjern alle","unlist_topics":"Fjern emner fra lister","relist_topics":"Før opp igjen emner i lister","reset_read":"Nullstill lest","delete":"Slett emner","dismiss":"Avslå","dismiss_read":"Forkast alle uleste","dismiss_read_with_selected":{"one":"Avvis %{count} uleste","other":"Avvis %{count} uleste"},"dismiss_button":"Forkast…","dismiss_tooltip":"Forkast kun nye innlegg eller slutt å overvåke emner","also_dismiss_topics":"Slutt å overvåke disse emnene slik at de aldri igjen vises til meg som ulest","dismiss_new":"Forkast nye","toggle":"slå på/av massevelging av emner","actions":"Massehandlinger","close_topics":"Lukk emner","archive_topics":"Arkiver emner","move_messages_to_inbox":"Flytt til innboks","change_notification_level":"Endre varslingsnivå","choose_new_category":"Velg den nye kategorien for emnene:","selected":{"one":"Du har valgt \u003cb\u003e%{count}\u003c/b\u003e emne.","other":"Du har valgt \u003cb\u003e%{count}\u003c/b\u003e emner."},"change_tags":"Erstatt stikkord","append_tags":"Legg til stikkord","choose_new_tags":"Velg nye stikkord for følgende emner:","choose_append_tags":"Velg nye stikkord å legge til følgende emner:","changed_tags":"Stikkordene for de valgte emnene ble endret.","remove_tags":"Fjern alle tagger","progress":{"one":"Fremgang: \u003cstrong\u003e%{count}\u003c/strong\u003e emne","other":"Fremgang: \u003cstrong\u003e%{count}\u003c/strong\u003e emner"}},"none":{"unread":"Du har ingen uleste emner.","new":"Du har ingen nye emner å lese.","read":"Du har ikke lest noen emner enda.","posted":"Du har ikke skrevet innlegg i noen emner enda.","latest":"Du har fått med deg alt!","bookmarks":"Du har ingen bokmerkede emner enda.","category":"Det finnes ingen %{category}-emner.","top":"Det finnes ingen populære emner.","educate":{"new":"\u003cp\u003eDine nye emner vil vises her. Som standard betraktes emner som nye, og vil vise en \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indikator hvis de ble opprettet i de siste 2 dagene.\u003c/p\u003e\u003cp\u003eBesøk dine \u003ca href=\"%{userPrefsUrl}\"\u003epreferanser\u003c/a\u003e for å endre dette.\u003c/p\u003e","unread":"\u003cp\u003eDine uleste emner vil vises her.\u003c/p\u003e\u003cp\u003eSom forvalg anses emner som ulest og vil vise ulest-tall \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e dersom du:\u003c/p\u003e\u003cul\u003e\u003cli\u003eOpprettet emnet\u003c/li\u003e\u003cli\u003eSvarte på emnet\u003c/li\u003e\u003cli\u003eLeste emnet i mer enn 4 minutter\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eEller dersom du uttrykkelig har satt emnet som overvåkes eller følges via varselkontrollen nederst i hvert emne.\u003c/p\u003e\u003cp\u003eGå til\u003ca href=\"%{userPrefsUrl}\"\u003einnstillingene\u003c/a\u003e dine for å endre dette.\u003c/p\u003e"}},"bottom":{"latest":"Det finnes ingen flere siste emner.","posted":"Det finnes ingen flere emner med innlegg.","read":"Det finnes ingen flere leste emner.","new":"Det finnes ingen flere nye emner.","unread":"Det finnes ingen flere uleste emner.","category":"Det finnes ingen %{category}-emner igjen.","tag":"Det finnes ingen %{tag}-emner igjen.","top":"Det finnes ingen flere populære emner.","bookmarks":"Det finnes ingen flere bokmerkede emner."}},"topic":{"filter_to":{"one":"%{count} innlegg i emnet","other":"%{count} innlegg i emnet"},"create":"Nytt emne","create_long":"Opprett et nytt emne","open_draft":"Åpne utkast","private_message":"Begynn en melding","archive_message":{"help":"Flytt meldinger til arkivet ditt","title":"Arkiver"},"move_to_inbox":{"title":"Flytt til innboks","help":"Flytt melding tilbake til innboks"},"edit_message":{"help":"Rediger første innlegg i meldingen","title":"Rediger"},"defer":{"help":"Merk som ulest","title":"Utsett"},"list":"Emner","new":"nytt emne","unread":"ulest","new_topics":{"one":"Ett nytt emne","other":"%{count} nye emner"},"unread_topics":{"one":"Ett ulest emne","other":"%{count} uleste emner"},"title":"Emne","invalid_access":{"title":"Emnet er privat","description":"Beklager, du har ikke tilgang til det emnet!","login_required":"Du må være innlogget for å lese det emnet."},"server_error":{"title":"Emnet kunne ikke lastes inn.","description":"Beklager, vi kunne ikke laste inn det emnet, muligens på grunn av et tilkoblingsproblem. Prøv igjen. Dersom problemet vedvarer, gi beskjed til oss."},"not_found":{"title":"Fant ikke emnet","description":"Beklager, vi kunne ikke finne det emnet. Kanskje det ble fjernet av en moderator?"},"unread_posts":{"one":"du har %{count} ulest innlegg i dette emnet","other":"du har %{count} uleste innlegg i dette emnet"},"likes":{"one":"det er én like i dette emnet","other":"det er %{number} likes i dette emnet"},"back_to_list":"Tilbake til Listen over Emner","options":"Valg for emner","show_links":"vis lenker i dette emnet","collapse_details":"vis/skjul detaljer for emnet","expand_details":"utvid emnebeskrivelse","read_more_in_category":"Vil du lese mer? Les andre emner i %{catLink} eller %{latestLink}.","read_more":"Vil du lese mer? %{catLink} eller %{latestLink}.","unread_indicator":"Ingen medlem har lest den siste posten i dette emnet ennå.","browse_all_categories":"Se alle kategorier","browse_all_tags":"Bla gjennom alle tagger","view_latest_topics":"se siste emner","suggest_create_topic":"Klar til å \u003ca href\u003estarte en ny samtale?\u003c/a\u003e","jump_reply_up":"hopp til tidligere svar","jump_reply_down":"hopp til senere svar","deleted":"Emnet ble slettet","slow_mode_update":{"title":"Langsom Modus","select":"Brukere kan kun publisere i dette emnet én gang i hveren:","description":"For å fremme gjennomtenkte diskusjoner i rask bevegelse eller kontroversiell diskusjon, må brukerne vente før de posterer igjen på dette emnet.","enable":"Aktiver","update":"Oppdater","enabled_until":"Aktivert til:","remove":"Deaktiver","hours":"Timer:","minutes":"Minutter:","seconds":"Sekunder:","durations":{"10_minutes":"10 minutter","15_minutes":"15 minutter","30_minutes":"30 minutter","45_minutes":"45 minutter","1_hour":"1 time","2_hours":"2 Timer","4_hours":"4 timer","8_hours":"8 timer","12_hours":"12 timer","24_hours":"24 timer","custom":"Egendefinert varighet"}},"slow_mode_notice":{"duration":"Vennligst vent %{duration} mellom innlegg i dette emnet"},"topic_status_update":{"title":"Tidsbestemt handling for emne","save":"Sett opp tidsbestemt handling","num_of_hours":"Antall timer:","num_of_days":"Antall dager:","remove":"Fjern tidsbestemt handling","publish_to":"Publiser til:","when":"Når:","time_frame_required":"Vennligst velg et tidsrom","min_duration":"Varigheten må være større enn 0","max_duration":"Varigheten må være under 20 år","duration":"Varighet"},"auto_update_input":{"none":"Velg et tidsrom","now":"Nå","later_today":"Senere i dag","tomorrow":"I morgen","later_this_week":"Senere denne uken","this_weekend":"Denne uken","next_week":"Neste uke","two_weeks":"To uker","next_month":"Neste måned","two_months":"To måneder","three_months":"Tre måneder","four_months":"Fire måneder","six_months":"Seks måneder","one_year":"Ett år","forever":"For alltid","pick_date_and_time":"Velg dato og tid","set_based_on_last_post":"Lukk basert på siste post"},"publish_to_category":{"title":"Planlegg publisering"},"temp_open":{"title":"Åpne midlertidig"},"auto_reopen":{"title":"Automatisk åpne emne"},"temp_close":{"title":"Lukk midlertidig"},"auto_close":{"title":"Automatisk lukking av emne","label":"Auto-lukk emnet etter:","error":"Skriv inn en gyldig verdi.","based_on_last_post":"Ikke lukk før det siste innlegget i emnet er minst så gammelt."},"auto_close_after_last_post":{"title":"Auto-Lukk Emne Etter siste innlegg"},"auto_delete":{"title":"Automatisk sletting av emne"},"auto_bump":{"title":"Flytt emnet øverst automatisk"},"reminder":{"title":"Påminn meg"},"auto_delete_replies":{"title":"Automatisk slett svar"},"status_update_notice":{"auto_open":"Dette emnet vil åpnes automatisk %{timeLeft}.","auto_close":"Dette emnet vil lukkes automatisk %{timeLeft}.","auto_publish_to_category":"Dette emnet vil bli opprettet i \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_after_last_post":"Dette emnet vil bli lukket %{duration} etter det siste innlegget.","auto_delete":"Dette emnet vil bli automatisk slettet %{timeLeft}.","auto_bump":"Dette emnet vil automatisk bli flyttet øverst om %{timeLeft}.","auto_reminder":"Du vil bli påminnet om dette emnet %{timeLeft}.","auto_delete_replies":"Svar på dette emnet slettes automatisk etter %{duration}."},"auto_close_title":"Auto-lukk innstillinger","auto_close_immediate":{"one":"Det siste innlegget i emnet er allerede en time gammelt, så emnet vil stenges umiddelbart.","other":"Det siste innlegget i emnet er allerede %{count} timer gammelt, så emnet vil stenges umiddelbart."},"auto_close_momentarily":{"one":"Siste innlegg i emnet er allerede %{count} timer gammel, så emnet vil bli lukket om et øyeblikk.","other":"Siste innlegg i emnet er allerede %{count} timer gammelt, så emnet vil bli stengt om et øyeblikk."},"timeline":{"back":"Tilbake","back_description":"Gå tilbake til forrige uleste innlegg","replies_short":"%{current} / %{total}"},"progress":{"title":"fremgang i emne","go_top":"topp","go_bottom":"bunn","go":"gå","jump_bottom":"Hopp til nyeste innlegg","jump_prompt":"hopp til…","jump_prompt_long":"Hopp til…","jump_bottom_with_number":"hopp til innlegg %{post_number}","jump_prompt_to_date":"til dato","jump_prompt_or":"eller","total":"innlegg totalt","current":"gjeldende innlegg"},"notifications":{"title":"endre hvor ofte du blir varslet om dette emnet","reasons":{"mailing_list_mode":"Du har e-postlistemodus påslått, så du vil bli varslet på e-post om nye svar i dette emnet.","3_10":"Du vil motta varsler fordi du følger et stikkord for dette emnet.","3_10_stale":"Du vil motta notifikasjoner fordi du følger en tagg på dette emnet tidligere.","3_6":"Du vil motta varsler fordi du følger denne kategorien","3_6_stale":"Du vil motta notifikasjoner fordi du følger denne kategorien i fortiden.","3_5":"Du vil motta varsler fordi du startet å følge dette emnet automatisk.","3_2":"Du vil motta varsler fordi du følger dette emnet.","3_1":"Du vil motta varsler fordi du opprettet dette emnet.","3":"Du vil motta varsler fordi du følger dette emnet.","2_8":"Du vil se antall nye svar fordi du følger denne kategorien.","2_8_stale":"Du vil se en telling av nye svar fordi du har sporing av denne kategorien i fortiden.","2_4":"Du vil se antall nye svar fordi du skrev et svar i dette emnet.","2_2":"Du vil se antall nye svar fordi du overvåker dette emnet.","2":"Du vil se et antall nye svar fordi du \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eleser dette emnet\u003c/a\u003e.","1_2":"Du vil bli varslet om noen nevner @navnet ditt eller svarer på innlegget ditt.","1":"Du vil bli varslet om noen nevner @navnet ditt eller svarer på innlegget ditt.","0_7":"Du ignorerer alle varsler i denne kategorien.","0_2":"Du ignorerer alle varsler om dette emnet.","0":"Du ignorerer alle varsler om dette emnet."},"watching_pm":{"title":"Følger","description":"Du vil bli varslet om hvert nye innlegg i denne meldingen. Antall nye tilbakemeldinger vil også bli vist. "},"watching":{"title":"Følger","description":"Du vil bli varslet om hvert nytt innlegg i dette emnet, og antall nye svar vil også bli vist."},"tracking_pm":{"title":"Overvåker","description":"Antall nye tilbakemeldinger vil bli vist for denne meldingen. Du vil bli varslet om noen nevner ditt @name eller svarer på din melding. "},"tracking":{"title":"Overvåker","description":"Antall nye svar vil bli vist for dette emnet. Du vil bli varslet dersom noen nevner @navnet ditt eller svarer på innlegget ditt."},"regular":{"title":"Normal","description":"Du vil bli varslet om noen nevner @navnet ditt eller svarer på innlegget ditt."},"regular_pm":{"title":"Normal","description":"Du vil bli varslet om noen nevner @navnet ditt eller svarer på innlegget ditt."},"muted_pm":{"title":"Ignorert","description":"Du vil aldri bli varslet om noe vedrørende denne meldingnen. "},"muted":{"title":"Ignorert","description":"Du vil aldri bli varslet om noe vedrørende dette emnet, og det vil ikke vises i siste."}},"actions":{"title":"Handlinger","recover":"Gjenopprett emne","delete":"Slett emne","open":"Åpne emne","close":"Lukk emne","multi_select":"Velg innlegg…","timed_update":"Sett opp tidsbestemt handling for emne…","pin":"Fest emne…","unpin":"Løsne emne…","unarchive":"Opphev arkivering av emne","archive":"Arkiver emne","invisible":"Skjul","visible":"Gjør synlig","reset_read":"Tilbakestill lesedata","make_private":"Gjør om til personlig melding","reset_bump_date":"Tilbakestille dato emnet ble flyttet øverst"},"feature":{"pin":"Fest emne","unpin":"Løsne emne","pin_globally":"Fest emne globalt","make_banner":"Lag banneremne","remove_banner":"Fjern banneremne"},"reply":{"title":"Svar","help":"begynn å skrive et svar i dette emnet"},"share":{"title":"Del","extended_title":"Del en lenke","help":"del en lenke til dette emnet","instructions":"Del en lenke til dette emnet:","copied":"Emnelink kopiert.","notify_users":{"title":"Varsle","instructions":"Varsle følgende brukere om dette emnet:","success":{"one":"Vellykket varsling av %{username} om dette emnet.","other":"Vellykket varsling av alle brukere om dette emnet."}},"invite_users":"Inviter"},"print":{"title":"Skriv ut","help":"Åpne en utskriftsvennlig utgave av dette emnet"},"flag_topic":{"title":"Rapporter","help":"rapporter dette innlegget privat eller send et privat varsel om det","success_message":"Du har rapportert dette emnet."},"make_public":{"title":"Konverter til offentlig emne","choose_category":"Velg en kategori for offentlige emner:"},"feature_topic":{"title":"Fremhev denne emnet","pin":"La dette emnet vises øverst i %{categoryLink}-kategorien frem til","unpin":"Fjern dette emnet fra toppen av %{categoryLink}-kategorien.","unpin_until":"Fjern dette emnet fra toppen av %{categoryLink}-kategorien, eller vent til \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Brukere kan fjerne festet for emnet individuelt for seg selv.","pin_validation":"En dato kreves for å feste dette emnet.","not_pinned":"Det finnes ingen festede emner i %{categoryLink}.","already_pinned":{"one":"Emner som er festet i %{categoryLink} for øyeblikket: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Emner som er festet i %{categoryLink} for øyeblikket: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"La dette emnet vises øverst i alle listene over emner inntil","unpin_globally":"Fjern dette emnet fra toppen av alle lister over emner.","unpin_globally_until":"Fjern dette emnet fra toppen av alle lister over emner eller vent til \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Brukere kan fjerne festet for emnet individuelt for seg selv.","not_pinned_globally":"Det finnes ingen globalt festede emner.","already_pinned_globally":{"one":"Emner som er festet globalt for øyeblikket: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Emner som er festet globalt for øyeblikket: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Gjør dette emnet til et banner som vises øverst på alle sider.","remove_banner":"Fjern banneret som vises øverst alle sider. ","banner_note":"Brukere kan fjerne banneret ved å lukke det. Kun ett emne kan være valgt som banner av gangen.","no_banner_exists":"Det er ikke valgt et banneremne. ","banner_exists":"Det \u003cstrong class='badge badge-notification unread'\u003efinnes\u003c/strong\u003e et banneremne allerede."},"inviting":"Inviterer…","automatically_add_to_groups":"Denne invitasjonen inkluderer også tilgang til disse gruppene:","invite_private":{"title":"Inviter til samtale","email_or_username":"Invitertes e-post eller brukernavn.","email_or_username_placeholder":"e-postadresse eller brukernavn","action":"Inviter","success":"Vi har invitert den brukeren til å delta i denne meldingen.","success_group":"Vi har invitert den gruppen til å delta i denne meldingen.","error":"Beklager, det oppstod en feil ved å invitere den brukeren.","not_allowed":"Beklager, den brukeren kan ikke bli invitert.","group_name":"gruppenavn"},"controls":"Handlinger for emne","invite_reply":{"title":"Inviter","username_placeholder":"brukernavn","action":"Send Invitasjon","help":"Inviter andre til dette emnet via e-post eller varsler","to_forum":"Vi sender en kortfattet e-post som gjør det mulig for en venn å umiddelbart registreres ved å klikke på en lenke. Ingen innlogging er nødvendig.","discourse_connect_enabled":"Oppgi brukernavnet til personen du ønsker å invitere til dette emnet.","to_topic_blank":"Oppgi brukernavnet eller e-postadressen til personen du ønsker å invitere til dette emnet.","to_topic_email":"Du har oppgitt en e-postadresse. Vi vil sende en invitasjon som lar vennen din svare på dette emnet umiddelbart.","to_topic_username":"Du har oppgitt et brukernavn. Vi sender et varsel med en lenke som inviterer dem til dette emnet.","to_username":"Oppgi brukernavnet til personen du ønsker å invitere. Vi sender et varsel med en lenke som inviterer vedkommende til dette emnet.","email_placeholder":"navn@example.com","success_email":"Vi har sendt ut en invitasjon til \u003cb\u003e%{invitee}\u003c/b\u003e. Vi varsler deg når invitasjonen er godtatt. Sjekk invitiasjonsfanen på brukersiden din for å beholde oversikten over invitasjonene dine.","success_username":"Vi har invitert den valgte brukeren til å delta i dette emnet.","error":"Beklager, vi kunne ikke invitere den brukeren. Vedkommende har muligens allerede blitt invitert? (Antall invitasjoner er begrenset)","success_existing_email":"En bruker med e-postadressen \u003cb\u003e%{emailOrUsername}\u003c/b\u003e finnes allerede. Vi har invitert brukeren til å delta i dette emnet."},"login_reply":"Logg Inn for å svare","filters":{"n_posts":{"one":"%{count} innlegg","other":"%{count} innlegg"},"cancel":"Fjern filter"},"move_to":{"title":"Flytt til","action":"gå til","error":"Det oppstod en feil under flytting av innlegg."},"split_topic":{"title":"Flytt til nytt emne","action":"flytt til nytt emne","topic_name":"Ny emnetittel","radio_label":"Nytt emne","error":"Det oppstod en feil ved flytting av innlegg til det nye emnet.","instructions":{"one":"Du er i ferd med å opprette et nytt emne basert på innlegget du har valgt..","other":"Du er i ferd med å opprette et nytt emne og fylle det med de \u003cb\u003e%{count}\u003c/b\u003e innleggene du har valgt."}},"merge_topic":{"title":"Flytt til eksisterende emne","action":"flytt til eksisterende emne","error":"Det oppstod en feil ved flytting av innlegg til det valgte emnet.","radio_label":"Eksisterende emne","instructions":{"one":"Velg emnet du vil flytte dette innlegget til.","other":"Velg emnet du vil flytte de \u003cb\u003e%{count}\u003c/b\u003e innleggene til."}},"move_to_new_message":{"title":"Flytt til ny melding","action":"flytt til ny melding","message_title":"Ny meldingens tittel","radio_label":"Ny Melding","participants":"Deltakere","instructions":{"one":"Du er i ferd med å opprette en ny melding og fylle den med innlegget du har valgt.","other":"Du er i ferd med å lage en ny melding og fylle den med \u003cb\u003e%{count}\u003c/b\u003e innleggene du har valgt."}},"move_to_existing_message":{"title":"Flytt til eksisterende melding","action":"gå til eksisterende melding","radio_label":"Eksisterende melding","participants":"Deltakere","instructions":{"one":"Vennligst velg meldingen du vil flytte dette innlegget til.","other":"Vennligst velg meldingen du vil flytte disse \u003cb\u003e%{count}\u003c/b\u003e innleggene til."}},"merge_posts":{"title":"Slå sammen valgte innlegg","action":"slå sammen valgte innlegg","error":"Feil ved fletting av valgte innlegg."},"publish_page":{"title":"Publisering av siden","publish":"publisere","description":"Når et emne publiseres som side kan dets URL deles og det vises med egendefinert stil.","slug":"Slug","public":"Offentlig","public_description":"Folk kan se siden selv om det tilknyttede emnet er privat.","publish_url":"Din side er publisert på:","topic_published":"Ditt emne har blitt publisert på:","preview_url":"Din side vil bli publisert på:","invalid_slug":"Beklager, du kan ikke publisere denne siden.","unpublish":"Avpubliser","unpublished":"Siden din har blitt publisert og er ikke lenger tilgjengelig.","publishing_settings":"Publisering Innstillinger"},"change_owner":{"title":"Endre eier","action":"Endre eierskap","error":"Det oppstod en feil ved endring av eierskap til innleggene.","placeholder":"den nye eierens brukernavn","instructions":{"one":"Vennligst velg en ny eier for innlegget ved \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Velg en ny eier for %{count} innleggene av \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Vennligst velg en ny eier for innlegget","other":"Vennligst velg en ny eier for innlegget ved @%{count}"}},"change_timestamp":{"title":"Endre tidsstempel…","action":"endre tidsstempel","invalid_timestamp":"Tidsstempel kan ikke være i fremtiden.","error":"Det oppstod en feil ved endring av tidsstempel for emnet.","instructions":"Vennligst velg det nye tidsstempelet for emnet. Innlegg i emnet blir oppdatert med samme tidsforskjell."},"multi_select":{"select":"velg","selected":"valgte (%{count})","select_post":{"label":"velg","title":"Legg til innlegg i utvalg"},"selected_post":{"label":"valgt","title":"Klikk for å fjerne innlegg fra utvalg"},"select_replies":{"label":"velg + svar","title":"Legg til innlegg og alle dets svar i utvalg"},"select_below":{"label":"velg + under","title":"Legg til innlegg og alle etter det til utvalget"},"delete":"fjern valgte","cancel":"avbryt valg","select_all":"velg alle","deselect_all":"fjern alle","description":{"one":"Du har valgt \u003cb\u003e%{count}\u003c/b\u003e innlegg.","other":"Du har valgt \u003cb\u003e%{count}\u003c/b\u003e innlegg."}},"deleted_by_author_simple":"(emne slettet av forfatter)"},"post":{"quote_reply":"Sitat","quote_edit":"Rediger","quote_share":"Del","edit_reason":"Begrunnelse:","post_number":"innlegg %{number}","ignored":"Ignorert innhold","wiki_last_edited_on":"wikien ble sist redigert %{dateTime}","last_edited_on":"innlegg sist endret på %{dateTime}","reply_as_new_topic":"Svar med lenket mne","reply_as_new_private_message":"Svar som ny melding til de samme mottakerne","continue_discussion":"Fortsetter diskusjonen fra %{postLink}:","follow_quote":"gå til det siterte innlegget","show_full":"Vis hele innlegget","show_hidden":"Vis ignorert innhold.","deleted_by_author_simple":"(innlegg slettet av forfatter)","collapse":"fold sammen","expand_collapse":"utvid/vis","locked":"et stabsmedlem har låst dette innlegget fra å bli endret","gap":{"one":"vis %{count} skjult svar","other":"vis %{count} skjulte svar"},"notice":{"new_user":"Dette er første gang %{user} postet - la oss ønske dem velkommen til vårt fellesskap!","returning_user":"Det var en stund siden vi har sett %{user} — deres siste innlegg var %{time}."},"unread":"Innlegget er ulest","has_replies":{"one":"%{count} svar","other":"%{count} svar"},"has_replies_count":"%{count}","unknown_user":"(ukjent/slettet bruker)","has_likes_title":{"one":"%{count} bruker likte dette innlegget","other":"%{count} brukere likte dette innlegget"},"has_likes_title_only_you":"du likte dette innlegget","has_likes_title_you":{"one":"du og %{count} annen bruker likte dette innlegget","other":"du og %{count} andre likte dette innlegget"},"filtered_replies_hint":{"one":"Vis dette innlegget og svaret","other":"Vis dette innlegget og dets %{count} svar"},"filtered_replies_viewing":{"one":"Viser %{count} svar til","other":"Viser %{count} svar til"},"in_reply_to":"Last inn overordnet innlegg","view_all_posts":"Vis alle innlegg","errors":{"create":"Beklager, det oppstod en feil ved å publisere ditt innlegg. Prøv igjen.","edit":"Det oppstod en feil ved redigeringen av ditt innlegg. Prøv igjen.","upload":"Det skjedde en feil når filen ble lastet opp. Prøv igjen senere. ","file_too_large":"Beklager, den filen er for stor (maks størrelse er %{max_size_kb}kb). Hvorfor ikke laste opp din store fil til en sky-delingstjeneste, og lim så inn linken?","too_many_uploads":"Du kan bare laste opp ett bilde av gangen.","too_many_dragged_and_dropped_files":{"one":"Beklager, du kan bare laste opp %{count} fil om gangen.","other":"Beklager, du kan bare laste opp %{count} filer om gangen."},"upload_not_authorized":"Beklager, filen du forsøket å laste opp er ikke tillatt. Tillatte filendelser er %{authorized_extensions}.","image_upload_not_allowed_for_new_user":"Beklager, nye brukere kan ikke laste opp bilder","attachment_upload_not_allowed_for_new_user":"Beklager, nye brukere kan ikke laste opp vedlegg.","attachment_download_requires_login":"Beklager, du må være innlogget for å laste ned vedlegg."},"cancel_composer":{"confirm":"Hva vil du gjøre med innlegget ditt?","discard":"Forkast","save_draft":"Lagre utkast til senere","keep_editing":"Fortsett å redigere"},"via_email":"Dette innlegget ankom via e-post","via_auto_generated_email":"dette innlegget kommer fra en automatisk generert e-post","whisper":"dette innlegget er et privat hvisken for moderatorer","wiki":{"about":"dette innlegget er en wiki"},"few_likes_left":"Takk for at du gir likes! Du vil nå grensen for antall ting du kan like i dag ganske snart.","controls":{"reply":"begynn å skrive et svar til dette innlegget","like":"lik dette innlegget","has_liked":"du liker dette innlegget","read_indicator":"medlemmer som leser dette innlegget","undo_like":"angre liker","edit":"rediger dette innlegget","edit_action":"Rediger","edit_anonymous":"Beklager, du må være innlogget for å endre dette innlegget.","flag":"rapporter dette innlegget privat eller send et privat varsel om det","delete":"slett dette innlegget","undelete":"gjenopprett dette innlegget","share":"del en lenke til dette innlegget","more":"Mer","delete_replies":{"confirm":"Ønsker du å slette svarene på dette innlegget?","direct_replies":{"one":"Ja, og ett direkte svar","other":"Ja, og %{count} direkte svar"},"all_replies":{"one":"Ja, og ett svar","other":"Ja, og alle %{count} svar"},"just_the_post":"Nei, kun dette innlegget"},"admin":"Innleggsadministrasjon","wiki":"Opprett wiki","unwiki":"Fjern Wiki","convert_to_moderator":"Legg til stabsfarge","revert_to_regular":"Fjern stabsfarge","rebake":"Generer HTML på nytt","publish_page":"Side Publisering","unhide":"Vis","lock_post":"Lås innlegg","lock_post_description":"forhindre innleggsskriveren fra å redigere dette innlegget","unlock_post":"Lås opp innlegg","unlock_post_description":"tillat innleggsskriveren å redigere dette innlegget","delete_topic_disallowed_modal":"Du har ikke rettigheter til å slette dette emnet. Hvis du virkelig vil at det skal slettes, flagg emnet og skriv en begrunnelse slik at en moderator kan vurdere forespørselen din.","delete_topic_disallowed":"du har ikke rettigheter til å slette dette emnet","delete_topic_confirm_modal":{"one":"Dette emnet har for øyeblikket over %{count} visning, og kan være et populært søkemål. Er du sikker på at du vil slette dette emnet helt, i stedet for å redigere det for å forbedre det?","other":"Dette emnet har over %{count} visninger og kan være et populært søkemål. Er du sikker på at du vil slette dette emnet helt, i stedet for å redigere det for å forbedre det?"},"delete_topic_confirm_modal_yes":"Ja, slett dette emnet","delete_topic_confirm_modal_no":"Nei, behold dette emnet","delete_topic_error":"Det oppstod en feil under sletting av emnet","delete_topic":"slett emne","delete_post_notice":"Slett personalmerknad","remove_timer":"Fjern timer","edit_timer":"rediger timeren"},"actions":{"people":{"like":{"one":"likte dette","other":"likte dette"},"read":{"one":"les dette","other":"les dette"},"like_capped":{"one":"og %{count} annen likte dette","other":"og %{count} andre likte dette"},"read_capped":{"one":"og %{count} andre leste dette","other":"og %{count} andre leser dette"}},"by_you":{"off_topic":"Du rapporterte dette som utenfor temaet","spam":"Du rapporterte dette som spam","inappropriate":"Du rapporterte dette som upassende","notify_moderators":"Du rapporterte dette for moderering","notify_user":"Du sendte en melding til denne brukeren"}},"delete":{"confirm":{"one":"Er du sikker på at du ønsker å slette dette innlegget?","other":"Er du sikker på at du ønsker å slette de %{count} innleggene?"}},"merge":{"confirm":{"one":"Er du sikker på at du vil flette disse postene?","other":"Er du sikker på at du vil flette de %{count} innleggene?"}},"revisions":{"controls":{"first":"Første versjon","previous":"Forrige versjon","next":"Neste versjon","last":"Siste versjon","hide":"Skjul versjon","show":"Vis versjon","revert":"Gå tilbake til revisjon %{revision}","edit_wiki":"Rediger wiki","edit_post":"Rediger innlegg","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Vis endelig tekst med endringene der de er gjort","button":"HTML"},"side_by_side":{"title":"Vis endringer i endelig tekst side ved side","button":"HTML"},"side_by_side_markdown":{"title":"Vis diff for kilderåtekst side ved side","button":"Rå"}}},"raw_email":{"displays":{"raw":{"title":"Vis e-posten i råformat","button":"Rå"},"text_part":{"title":"Vis tekstdelen av e-posten","button":"Tekst"},"html_part":{"title":"Vis HTML-delen av e-posten","button":"HTML"}}},"bookmarks":{"create":"Opprett bokmerke","edit":"Rediger bokmerke","created":"Opprettet","updated":"Oppdatert","name":"Navn","name_placeholder":"Hva er bokmerket etter?","set_reminder":"Påminn meg","options":"Alternativer","actions":{"delete_bookmark":{"name":"Slett bokmerke","description":"Fjerner bokmerke fra din profil og stopper alle påminnelser for bokmerket"},"edit_bookmark":{"name":"Rediger bokmerke","description":"Rediger bokmerkenavnet eller endre påminnelsesdato og klokkeslett"},"pin_bookmark":{"name":"Fest bokmerke","description":"Fest bokmerket. Dette vil få det til å vises øverst i bokmerkelisten."},"unpin_bookmark":{"name":"Angre bokmerking","description":"Løsne bokmerket. Den vises ikke lenger øverst i bokmerkelisten din."}}},"filtered_replies":{"viewing_posts_by":"Viser %{post_count} innlegg av","viewing_subset":"Noen svar er kollapset","viewing_summary":"Vise et sammendrag av dette emnet","post_number":"%{username}, post #%{post_number}","show_all":"Vis alle"}},"category":{"none":"(no category)","all":"Alle kategorier","choose":"kategori\u0026hellip;","edit":"Rediger","edit_dialog_title":"Rediger: %{categoryName}","view":"Se emner i kategori","back":"Tilbake til kategori","general":"Generelt","settings":"Innstillinger","topic_template":"Mal for emne","tags":"Stikkord","tags_allowed_tags":"Begrens disse taggene til denne kategorien:","tags_allowed_tag_groups":"Begrens disse tagggruppene til denne kategorien:","tags_placeholder":"(Valgfritt) liste over tillatte stikkord","tags_tab_description":"Merker og tagg-grupper som er spesifisert ovenfor vil bare være tilgjengelig i denne kategorien og andre kategorier som også spesifiserer dem. De vil ikke være tilgjengelige for bruk i andre kategorier.","tag_groups_placeholder":"(Valgfritt) liste over tillatte stikkordgrupper","manage_tag_groups_link":"Administrere tagg-grupper","allow_global_tags_label":"Tillat også andre stikkord","tag_group_selector_placeholder":"(Valgfritt) stikkord gruppe","required_tag_group_description":"Krev nye emner for å ha tagger fra en stikkord-gruppe:","min_tags_from_required_group_label":"Antall stikkord:","required_tag_group_label":"Stikkordgrupper:","topic_featured_link_allowed":"Tillat fremhevede lenker i denne kategorien","delete":"Slett kategori","create":"Ny Kategori","create_long":"Opprett en ny kategori","save":"Lagre kategori","slug":"Kategorinavn i URL","slug_placeholder":"(valgfritt) Sammensatte ord for bruk i URL","creation_error":"Det oppstod en feil ved lagring av denne kategorien.","save_error":"Det oppstod en feil ved lagrinen av denne kategorien.","name":"Kategorinavn","description":"Beskrivelse","logo":"Kategoribilde","background_image":"Kategoriens bakgrunnsbilde","badge_colors":"Merkefarger","background_color":"Bakgrunnsfarge","foreground_color":"Forgrunnsfarge","name_placeholder":"Bør være kortfattet.","color_placeholder":"Vilkårlig vevfarge","delete_confirm":"Er du sikker på at du vil slette denne kategorien?","delete_error":"Det oppstod en feil ved å slette denne kategorien.","list":"List opp kategorier","no_description":"Legg til en beskrivelse for denne kategorien.","change_in_category_topic":"Rediger beskrivelse","already_used":"Denne fargen er i bruk av en annen kategori","security":"Sikkerhet","security_add_group":"Legg til gruppe","permissions":{"group":"Gruppe","see":"Se","reply":"Svar","create":"Opprett","no_groups_selected":"Ingen grupper har tilgang til denne kategorien vil bare være synlig for de ansatte.","everyone_has_access":"Denne kategorien er offentlig, alle kan se, svare og opprette innlegg. For å begrense tillatelser, fjern én eller flere av rettighetene som er gitt til gruppen \"alle\".","toggle_reply":"Bytt svarstillatelse","toggle_full":"Opprett tillatelse","inherited":"Denne tillatelsen arves fra \"alle\""},"special_warning":"Advarsel: Denne kategorien er en forhåndsbestemt kategori og dens sikkerhetsinnstillinger kan ikke endres. Hvis du ikke vil bruke denne kategorien, slett den i stedet for å bruke den til noe annet.","uncategorized_security_warning":"Denne kategorien er spesielt. Den er beregnet til å holde områder for emner som ikke har noen kategori; den kan ikke ha sikkerhetsinnstillinger.","uncategorized_general_warning":"Denne kategorien er spesielt. Den brukes som standardkategori for nye emner som ikke har valgt en kategori. Hvis du vil hindre denne oppførselen og valget av force kategori, \u003ca href=\"%{settingLink}\"\u003evennligst deaktiver innstillingen her\u003c/a\u003e. Hvis du vil endre navn eller beskrivelse, gå til \u003ca href=\"%{customizeLink}\"\u003eTilpass / tekstinnhold\u003c/a\u003e.","pending_permission_change_alert":"Du har ikke lagt til %{group} i denne kategorien; klikk denne knappen for å legge dem til.","images":"Bilder","email_in":"Egendefinert innkommende e-postadresse:","email_in_allow_strangers":"Godta e-post fra anonyme brukere uten brukerkonto","email_in_disabled":"Publisering av nye emner via e-post er deaktivert i innstillingene for nettstedet. For å aktivere publisering av nye emner via e-post,","email_in_disabled_click":"aktiver innstillingen \"e-post inn\".","mailinglist_mirror":"Kategorien gjenspeiler en e-postliste","show_subcategory_list":"Plasser listen over underkategorien i toppen av emner i denne kategorien.","read_only_banner":"Banner-tekst når en bruker ikke kan opprette et emne i denne kategorien:","num_featured_topics":"Antall emner som skal vises på kategori-siden:","subcategory_num_featured_topics":"Antall fremhevede emner på hovedkategoriens side:","all_topics_wiki":"Gjør nye emner til wikier som standard","allow_unlimited_owner_edits_on_first_post":"Tillat ubegrenset antall eiere i første innlegg","subcategory_list_style":"Listestil for underkategorier:","sort_order":"Emneliste sorteres etter:","default_view":"Forvalgt emneliste:","default_top_period":"Forvalgt topp-periode:","default_list_filter":"Standard listefilter:","allow_badges_label":"Tillat merker å bli tildelt i denne kategorien","edit_permissions":"Rediger tillatelser","reviewable_by_group":"I tillegg til de ansatte, kan innholdet i denne kategorien også gjennomgås ved å:","review_group_name":"gruppenavn","require_topic_approval":"Krev godkjennelse fra moderator for alle nye emner","require_reply_approval":"Krev godkjennelse fra moderator for alle nye svar","this_year":"dette året","position":"Posisjon på kategorisiden:","default_position":"Forvalgt posisjon","position_disabled":"Kategorier vil bli vist i henhold til aktivitet. For å styre rekkefølgen av kategorier i listen","position_disabled_click":"aktiver innstillingen \"faste kategoriposisjoner\".","minimum_required_tags":"Minste antall stikkord som kreves for et emne:","default_slow_mode":"Aktiver \"Sakte modus\" for nye emner i denne kategorien.","parent":"Foreldrekategori","num_auto_bump_daily":"Antall åpne emner som automatisk flyttes øverst per dag:","navigate_to_first_post_after_read":"Naviger til første innlegg etter at emner er lest","notifications":{"watching":{"title":"Følger","description":"Du vil automatisk følge alle emnene i disse kategoriene. Du vil bli varslet om alle nye innlegg i hvert emne, og antall nye svar vil bli vist."},"watching_first_post":{"title":"Følger første innlegg","description":"Du vil bli varslet om nye meldinger i denne gruppen, men ikke svarene på meldingene."},"tracking":{"title":"Overvåkning","description":"Du vil automatisk overvåke alle emner i disse kategoriene. Du vil bli varslet dersom noen nevner @navnet ditt eller svarer deg, og antallet nye svar vil bli vist."},"regular":{"title":"Normal","description":"Du vil bli varslet om noen nevner @navnet ditt eller svarer deg."},"muted":{"title":"Ignorert","description":"Du vil aldri bli varslet om noen nye emner i denne kategorien, og de vil ikke vises sistnevnte."}},"search_priority":{"label":"Søk prioritet","options":{"normal":"Normal","ignore":"Ignorer","very_low":"Svært lav","low":"Lav","high":"Høy","very_high":"Svært høy"}},"sort_options":{"default":"forvalg","likes":"Likes","op_likes":"Likes gitt orginalinnlegget","views":"Visninger","posts":"Innlegg","activity":"Aktivitet","posters":"Innleggsskrivere","category":"Kategori","created":"Opprettet"},"sort_ascending":"Stigende","sort_descending":"Synkende","subcategory_list_styles":{"rows":"Rader","rows_with_featured_topics":"Rader med fremhevede emner","boxes":"Bokser","boxes_with_featured_topics":"Bokser med fremhevede emner"},"settings_sections":{"general":"Generelt","moderation":"Moderering","appearance":"Utseende","email":"E-post"},"list_filters":{"all":"alle emner","none":"ingen underkategorier"},"colors_disabled":"Du kan ikke velge farger fordi du har en kategori stil fra ingen."},"flagging":{"title":"Takk for at du hjelper å holde forumet ryddig!","action":"Rapporter innlegg","take_action":"Ta handling...","take_action_options":{"default":{"title":"Ta handling","details":"Oppnå rapporteringsterskel umiddelbart, i stedet for å vente på flere rapporteringer."},"suspend":{"title":"Steng ute bruker","details":"Nå flaggterskelen, og suspendere brukeren"},"silence":{"title":"Demp bruker","details":"Nå flaggterskelen, og suspendere brukeren"}},"notify_action":"Melding","official_warning":"Offisiell advarsel","delete_spammer":"Slett spammer","flag_for_review":"Kø for gjennomgang","yes_delete_spammer":"Ja, slett spammer","ip_address_missing":"(N/A)","hidden_email_address":"(skjult)","submit_tooltip":"Rapporter privat","take_action_tooltip":"Oppnå rapporteringsterskel umiddelbart, i stedet for å vente på flere rapporteringer.","cant":"Beklager, du kan ikke rapportere dette innlegget nå.","notify_staff":"Gjør stab oppmerksom på dette privat","formatted_name":{"off_topic":"Det er utenfor temaet","inappropriate":"Det er upassende","spam":"Det er reklame"},"custom_placeholder_notify_user":"Vær spesifikk, vær konstruktiv og vær alltid snill.","custom_placeholder_notify_moderators":"La oss vite nøyaktig hva problemet er, og del relevante lenker og eksempler hvorvidt det er mulig.","custom_message":{"at_least":{"one":"skriv inn minst ett tegn","other":"skriv inn minst %{count} tegn"},"more":{"one":"Én igjen…","other":"%{count} igjen…"},"left":{"one":"ett gjenstående","other":"%{count} gjenstående"}}},"flagging_topic":{"title":"Takk for at du hjelper med å vedlikeholde god skikk i samfundet vårt!","action":"Rapporter mne","notify_action":"Melding"},"topic_map":{"title":"Oppsummering av emne","participants_title":"Hyppige innleggsskrivere","links_title":"Populære Lenker","links_shown":"vis flere lenker…","clicks":{"one":"%{count} klikk","other":"%{count} klikk"}},"post_links":{"about":"utvid flere lenker for dette innlegget","title":{"one":"Én til","other":"%{count} flere"}},"topic_statuses":{"warning":{"help":"Dette er en offisiell advarsel."},"bookmarked":{"help":"Du bokmerket dette emnet"},"locked":{"help":"Dette emnet er stengt; det er ikke mulig å skrive nye svar"},"archived":{"help":"Dette emnet er arkivert; det er frosset og kan ikke lenger endres"},"locked_and_archived":{"help":"Dette emnet er både lukket og arkivert; det er ikke mulig å skrive nye svar eller endre på det"},"unpinned":{"title":"Feste fjernet","help":"Denne ble løsnet for deg; den vil vises i vanlig rekkefølge"},"pinned_globally":{"title":"Globalt fastsatt","help":"Dette emnet er festet globalt; det vil vises øverst i siste og listen for emnets kategori"},"pinned":{"title":"Fastsatt","help":"Dette emnet er festet for deg; det vil vises øverst i sin kategori"},"unlisted":{"help":"Dette emnet er ikke synlig; det vil ikke vises i lister over emner, og er kun tilgjengelig via en direkte lenke"},"personal_message":{"title":"Dette emnet er en personlig melding","help":"Dette emnet er en personlig melding"}},"posts":"Innlegg","original_post":"Originalt innlegg","views":"Visninger","views_lowercase":{"one":"visninger","other":"visninger"},"replies":"Svar","views_long":{"one":"dette emnet er lest %{count} gang","other":"dette emnet er lest %{number} ganger"},"activity":"Aktivitet","likes":"Likes","likes_lowercase":{"one":"like","other":"likes"},"users":"Deltakere","users_lowercase":{"one":"bruker","other":"brukere"},"category_title":"Kategori","history_capped_revisions":"Historikk, siste 100 revisjoner","changed_by":"av %{author}","raw_email":{"title":"Innkommende e-post","not_available":"Ikke tilgjengelig!"},"categories_list":"Kategoriliste","filters":{"with_topics":"%{filter} emner","with_category":"%{filter} %{category} emner","latest":{"title":"Siste","title_with_count":{"one":"Siste (%{count})","other":"Siste (%{count})"},"help":"emner med nylige innlegg"},"read":{"title":"Lest","help":"emner du har lest, i den rekkefølgen du sist leste dem"},"categories":{"title":"Kategorier","title_in":"Kategori - %{categoryName}","help":"alle emner sortert etter kategori"},"unread":{"title":"Uleste","title_with_count":{"one":"Ulest (%{count})","other":"Ulest (%{count})"},"help":"emner du følger eller overvåker for øyeblikket, med uleste innlegg","lower_title_with_count":{"one":"%{count} ulest","other":"%{count} uleste"}},"new":{"lower_title_with_count":{"one":"%{count} ny","other":"%{count} nye"},"lower_title":"ny","title":"Nye","title_with_count":{"one":"Nye (%{count})","other":"Nye (%{count})"},"help":"emner opprettet de siste dagene"},"posted":{"title":"Mine innlegg","help":"emner du har bidratt med innlegg i"},"bookmarks":{"title":"Bokmerker","help":"emner du har bokmerket"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"siste emner i %{categoryName}-kategorien"},"top":{"title":"Aktive","help":"de mest aktive emnene det siste året, den siste måneden, uken eller dagen ","all":{"title":"Totalt"},"yearly":{"title":"Årlig"},"quarterly":{"title":"Kvartalsvis"},"monthly":{"title":"Månedlig"},"weekly":{"title":"Ukentlig"},"daily":{"title":"Daglig"},"all_time":"Totalt","this_year":"Det siste året","this_quarter":"Det siste kvartalet","this_month":"Den siste måneden","this_week":"Den siste uken","today":"I dag","other_periods":"se toppen:"}},"browser_update":"Dessverre er \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003enettleseren din for gammel for å fungere på denne siden\u003c/a\u003e. Vennligst \u003ca href=\"https://browsehappy.com\"\u003eoppgrader nettleseren din\u003c/a\u003e for å se rik innhold, logge inn og svar.","permission_types":{"full":"Opprett / Svar / Se","create_post":"Svar / Se","readonly":"Se"},"lightbox":{"download":"last ned","previous":"Forrige (Venstre pil-nøkkel)","next":"Neste (pil-nøkkel)","counter":"%curr% av %total%","close":"Lukk (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eInnholdet\u003c/a\u003e kunne ikke lastes.","image_load_error":"\u003ca href=\"%url%\"\u003eBildet\u003c/a\u003e kunne ikke lastes."},"cannot_render_video":"Denne videoen kan ikke lages fordi nettleseren din ikke støtter koden.","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} eller %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Tastatursnarveier","jump_to":{"title":"Hopp til","home":"%{shortcut} Hjem","latest":"%{shortcut} Siste","new":"%{shortcut} Nye","unread":"%{shortcut} Uleste","categories":"%{shortcut} Kategorier","top":"%{shortcut} Topp","bookmarks":"%{shortcut} Bokmerker","profile":"%{shortcut} Profil","messages":"%{shortcut} Meldinger","drafts":"%{shortcut} Utkast","next":"%{shortcut} neste emne","previous":"%{shortcut} forrige emne"},"navigation":{"title":"Navigasjon","jump":"%{shortcut} Gå til innlegg #","back":"%{shortcut} Tilbake","up_down":"%{shortcut} Flytt utvalg \u0026uarr; \u0026darr;","open":"%{shortcut} Åpne valgt emne","next_prev":"%{shortcut} Neste/forrige del","go_to_unread_post":"%{shortcut} Gå til første uleste innlegg"},"application":{"title":"Applikasjon","create":"%{shortcut} Opprett nytt emne","notifications":"%{shortcut} Åpne varsler","hamburger_menu":"%{shortcut} Åpne hamburgermeny","user_profile_menu":"%{shortcut} Åpne brukermenyen","show_incoming_updated_topics":"%{shortcut} Vis oppdaterte emner","search":"%{shortcut} Søk","help":"%{shortcut} Åpne tastaturhjelp","dismiss_new":"%{shortcut} Avvis Ny","dismiss_topics":"%{shortcut} Forkast Emner","log_out":"%{shortcut} Logg ut"},"composing":{"title":"Skriving","return":"%{shortcut} Gå tilbake til redigeringspanelet","fullscreen":"%{shortcut} fullskjerm komponist"},"bookmarks":{"title":"Bokmerking","enter":"%{shortcut} Lagre og lukk","later_today":"%{shortcut} Senere i dag","later_this_week":"%{shortcut} Senere denne uken","tomorrow":"%{shortcut} I morgen","next_week":"%{shortcut} Neste uke","next_month":"%{shortcut} Neste måned","next_business_week":"%{shortcut} Start på neste uke","next_business_day":"%{shortcut} Neste virkedag","custom":"%{shortcut} Egendefinert dato og klokkeslett","none":"%{shortcut} Ingen påminnelse","delete":"%{shortcut} Slett bokmerke"},"actions":{"title":"Handlinger","bookmark_topic":"%{shortcut} Legg til/fjern bokmerke for emne","pin_unpin_topic":"%{shortcut} Fest/fjern feste for emne","share_topic":"%{shortcut} Del emne","share_post":"%{shortcut} Del innlegg","reply_as_new_topic":"%{shortcut} Svar som lenket emne","reply_topic":"%{shortcut} Svar på emne","reply_post":"%{shortcut} Svar på innlegg","quote_post":"%{shortcut} Siter innlegg","like":"%{shortcut} Lik innlegg","flag":"%{shortcut} Rapporter innlegg","bookmark":"%{shortcut} Bokmerk innlegg","edit":"%{shortcut} Rediger innlegg","delete":"%{shortcut} Slett innlegg","mark_muted":"%{shortcut} Ignorer emne","mark_regular":"%{shortcut} Vanlig (forvalgt) emne","mark_tracking":"%{shortcut} Overvåk emne","mark_watching":"%{shortcut} Følg emne","print":"%{shortcut} Skriv ut emne","defer":"%{shortcut} Utsett emnet","topic_admin_actions":"%{shortcut} Åpne tema admin handlinger"},"search_menu":{"title":"Søk i menyen","prev_next":"%{shortcut} Flytt utvalg opp og ned","insert_url":"%{shortcut} Sett inn utvalg i åpen komponist"}},"badges":{"earned_n_times":{"one":"Har gjort seg fortjent til dette merket","other":"Har gjort seg fortjent til dette merket %{count} ganger"},"granted_on":"Tildelt %{date}","others_count":"(%{count}) andre har dette merket","title":"Merker","allow_title":"Du kan bruke dette merket som tittel","multiple_grant":"Du kan oppnå dette flere ganger","badge_count":{"one":"%{count} merke","other":"%{count} merker"},"more_badges":{"one":"+%{count} mer","other":"+%{count} Flere"},"granted":{"one":"ett tildelt","other":"%{count} tildelt"},"select_badge_for_title":"Velg et merke å bruke som din tittel","none":"(intet)","successfully_granted":"Tildelte %{badge} til %{username}","badge_grouping":{"getting_started":{"name":"Kom i gang"},"community":{"name":"Gemenskap"},"trust_level":{"name":"Tillitsnivå"},"other":{"name":"Annet"},"posting":{"name":"Publisering"}},"favorite_max_reached":"Du kan ikke favorisere flere distinksjoner.","favorite_max_not_reached":"Marker dette merket som favoritt","favorite_count":"%{count}/%{max} merker markert som favoritt"},"download_calendar":{"download":"Last ned"},"tagging":{"all_tags":"Alle stikkord","other_tags":"Andre stikkord","selector_all_tags":"alle stikkord","selector_no_tags":"ingen stikkord","changed":"stikkord endret:","tags":"Stikkord","choose_for_topic":"valgfrie stikkord","info":"Informasjon","default_info":"Denne taggen er ikke begrenset til noen kategorier, og har ingen synonymer. For å legge til restriksjoner, legg til denne taggen i en \u003ca href=%{basePath}/tag_groups\u003etagg gruppe\u003c/a\u003e.","category_restricted":"Denne taggen er begrenset til kategorier du ikke har tilgang til tilgang.","synonyms":"Synonymer","synonyms_description":"Når følgende merkelapper brukes, vil de bli erstattet med \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Denne taggen tilhører gruppen \"%{tag_groups}.","other":"Denne taggen tilhører disse gruppene: %{tag_groups}."},"category_restrictions":{"one":"Den kan bare brukes i denne kategorien:","other":"Den kan kun brukes i disse kategoriene:"},"edit_synonyms":"Administrer synonymer","add_synonyms_label":"Legg til synonymer:","add_synonyms":"Legg til","add_synonyms_explanation":{"one":"Ethvert sted som for øyeblikket bruker denne taggen vil bli endret til å bruke \u003cb\u003e%{tag_name}\u003c/b\u003e i stedet. Er du sikker på at du vil gjøre endringen?","other":"Ethvert sted som for øyeblikket bruker disse kodene blir endret til å bruke \u003cb\u003e%{tag_name}\u003c/b\u003e i stedet. Er du sikker på at du vil gjøre endringen?"},"add_synonyms_failed":"Følgende tagger kunne ikke legges til som synonymer: \u003cb\u003e%{tag_names}\u003c/b\u003e. Sørg for at de ikke har synonymer og ikke er synonymer hos en annen tagg.","remove_synonym":"Fjern synonym","delete_synonym_confirm":"Er du sikker på at du vil slette synonym \"%{tag_name}\"?","delete_tag":"Slett stikkord","delete_confirm":{"one":"Er du sikker på at du ønsker å slette dette stikkordet og fjerne det fra emnet det er tilknyttet?","other":"Er du sikker på at du ønsker å slette dette stikkordet og fjerne det fra %{count} emner som er tilknyttet det?"},"delete_confirm_no_topics":"Er du sikker på at du ønsker å slette dette stikkordet?","delete_confirm_synonyms":{"one":"Synonymen vil også bli slettet.","other":"Dets %{count} synonymer vil også bli slettet."},"rename_tag":"Gi stikkord nytt navn","rename_instructions":"Velg et nytt navn for dette stikkordet:","sort_by":"Sorter etter:","sort_by_count":"antall","sort_by_name":"navn","manage_groups":"Behandle stikkordgrupper","manage_groups_description":"Definer grupper for å organisere stikkord","upload":"Last opp stikkord","upload_description":"Last opp en csv-fil for å opprette flere stikkort på én gang","upload_instructions":"En per linje, eventuelt med en tagggruppe i formatet 'tag_name,tag_group'.","upload_successful":"Stikkordene ble lastet opp","delete_unused_confirmation":{"one":"%{count} taggen vil bli slettet: %{tags}","other":"%{count} merkene vil bli slettet: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} og %{count} til","other":"%{tags} og %{count} til"},"delete_no_unused_tags":"Det finnes ingen ubrukte tagger.","tag_list_joiner":", ","delete_unused":"Slett ubrukte stikkord","delete_unused_description":"Slett alle tagger som ikke er knyttet til noen emner eller personlige meldinger","cancel_delete_unused":"Avbryt","filters":{"without_category":"%{filter} %{tag} emner","with_category":"%{filter} %{tag} emner i %{category}","untagged_without_category":"%{filter} emner uten stikkord","untagged_with_category":"%{filter} emner uten stikkord i %{category}"},"notifications":{"watching":{"title":"Følger","description":"Du vil automatisk følge alle emnene med dette stikkordet. Du vil bli varslet om alle nye innlegg og emner; i tillegg vil antallet uleste og nye innlegg vises ved siden av emnet."},"watching_first_post":{"title":"Følger første innlegg","description":"Du vil bli varslet om nye emner i denne stikkord, men ikke svar på emner."},"tracking":{"title":"Overvåkning","description":"Du vil automatisk overvåke alle emner med dette stikkordet. Antallet uleste og nye innlegg vil vises ved siden av emnet."},"regular":{"title":"Aktivt medlem","description":"Du vil bli varslet hvis noen nevner @navnet ditt eller svarer på innlegget ditt."},"muted":{"title":"Ignorert","description":"Du vil ikke bli varslet om noe vedrørende nye emner med dette stikkordet, og de vil ikke vises i ulest-listen din."}},"groups":{"title":"Stikkordgrupper","about_heading":"Velg en stikkordgruppe eller opprett en ny","about_heading_empty":"Opprett en ny stikkord-gruppe for å komme i gang","about_description":"Med stikkord-grupper hjelper deg å endre tillatelser for mange stikkord på ett sted.","new":"Ny gruppe","new_title":"Opprett ny gruppe","edit_title":"Rediger Etikett-gruppe","tags_label":"Stikkord i denne gruppen","parent_tag_label":"Overordnet stikkord","parent_tag_description":"Merker fra denne gruppen kan kun brukes dersom overordnet tag er til stede.","one_per_topic_label":"Begrens til ett stikkord fra denne gruppen per emne ","new_name":"Ny stikkordgruppe","name_placeholder":"Navn","save":"Lagre","delete":"Slett","confirm_delete":"Er du sikker på at du vil slette denne stikkordgruppen?","everyone_can_use":"Stikkord kan benyttes av alle","usable_only_by_groups":"Stikkord er synlige for alle, men kun staben kan bruke dem","visible_only_to_groups":"Etiketter er kun synlig for følgende grupper","cannot_save":"Kan ikke lagre taggruppe. Forsikre deg om at det er minst én tag tilstede, at tagggruppenavnet ikke er tomt, og at en gruppe er valgt for taggetillatelse.","tags_placeholder":"Søk eller opprett...","parent_tag_placeholder":"Valgfritt","select_groups_placeholder":"Velg grupper...","disabled":"Merking er deaktivert. "},"topics":{"none":{"unread":"Du har ingen uleste emner.","new":"Du har ingen nye emner.","read":"Du har ikke lest noen emner enda.","posted":"Du har ikke skrevet noe innlegg i emner enda.","latest":"Det finnes ingen flere siste emner.","bookmarks":"Du har ikke bokmerket noen emner ennå.","top":"Det finnes ingen populære emner."}}},"invite":{"custom_message":"Få invitasjonen din litt mer personlig ved å skrive en \u003ca href\u003eegendefinert melding\u003c/a\u003e.","custom_message_placeholder":"Skriv inn din egendefinerte melding","approval_not_required":"Brukeren blir automatisk godkjent så snart de godtar denne invitasjonen.","custom_message_template_forum":"Hei, du burde ta del i dette forumet!","custom_message_template_topic":"Hei, jeg tenkte du ville like dette emnet!"},"forced_anonymous":"På grunn av ekstrem belastning vises denne siden midlertidig på samme måte som om du var logget ut.","forced_anonymous_login_required":"Nettstedet er under ekstrem belastning og kan ikke lastes inn på dette tidspunktet, prøv igjen om noen minutter.","footer_nav":{"back":"Forrige","forward":"Videresend","share":"Del","dismiss":"Avslå"},"safe_mode":{"enabled":"Sikkert modus er påskrudd, for å skru av sikkert modus, lukk dette nettleservinduet"},"image_removed":"(bilde fjernet)","do_not_disturb":{"title":"Ikke forstyrr for...","label":"Ikke forstyrr","remaining":"%{remaining} gjenstående","options":{"half_hour":"30 minutter","one_hour":"1 time","two_hours":"2 timer","tomorrow":"Frem til i morgen","custom":"Egendefinert"},"set_schedule":"Angi en varslingsplan"},"trust_levels":{"names":{"newuser":"ny bruker","basic":" bruker","member":"medlem","regular":"aktivt medlem","leader":"leder"},"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"Du har plukket en ustøttet fil. Filtyper som støttes – %{types}."},"user_activity":{"no_activity_others":"Ingen aktivitet.","no_replies_others":"Ingen svar.","no_likes_others":"Ingen likte innlegg. "},"fullscreen_table":{"expand_btn":"Utvid tabell"},"cakeday":{"title":"Kakedag","today":"I dag","tomorrow":"I morgen","upcoming":"Kommende","all":"Alle"},"birthdays":{"title":"Geburtsdager","month":{"title":"Geburtsdager som skjer i måneden","empty":"Ingen brukere har bursdag denne måneden."},"upcoming":{"title":"Geburtsdager for %{start_date} - %{end_date}","empty":"Ingen brukere har bursdag de neste 7 dagene."},"today":{"title":"Geburtsdager for %{date}","empty":"Ingen brukere har bursdag i dag."},"tomorrow":{"empty":"Ingen brukere har bursdag i morgen."}},"anniversaries":{"title":"Jubileum","month":{"title":"Jubileum som skjer i måneden","empty":"Ingen brukere feirer jubileum denne måneden."},"upcoming":{"title":"Jubileum for %{start_date} - %{end_date}","empty":"Ingen brukere har jubileum de neste 7 dagene."},"today":{"title":"Jubileum for %{date}","empty":"Ingen brukere feirer jubileum i dag."},"tomorrow":{"empty":"Ingen brukere feirer jubileum i morgen."}},"details":{"title":"Skjul Detaljer"},"discourse_local_dates":{"relative_dates":{"today":"I dag klokken %{time}","tomorrow":"I morgen kl. %{time}","yesterday":"Igår %{time}","countdown":{"passed":"datoen har passert"}},"title":"Sett inn dato / tid","create":{"form":{"insert":"Sett inn","advanced_mode":"Avansert modus","simple_mode":"Enkel modus","format_description":"Formatet som brukes for å vise datoen for brukeren. Bruk Z til å vise forskyvningen og zz for tidssonenavnet.","timezones_title":"Tidssoner som vises","timezones_description":"Tidssoner vil brukes for å vise datoer i forhåndsvisninger og fallback.","recurring_title":"Regelmessighet","recurring_description":"Definer regelmessigheten til en hendelse. Du kan også manuelt redigere regelmessigheten etter at den er opprettet ved å bruke de følgende nøklene: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","recurring_none":"Ingen regelmessighet","invalid_date":"Ugyldig dato, sjekk at dato og klokkeslett er korrekt","date_title":"Dato","time_title":"Tid","format_title":"Datoformat","timezone":"Tidssone","until":"Inntil...","recurring":{"every_day":"Hver dag","every_week":"Hver uke","every_two_weeks":"Annenhver uke","every_month":"Hver måned","every_two_months":"Annenhver måned","every_three_months":"Hver tredje måned","every_six_months":"Hver sjette måned","every_year":"Hvert år"}}},"default_title":"%{site_name} Hendelse"},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Start den nye brukerveiledningen for alle nye brukere","welcome_message":"Send alle nye brukere en velkomstmelding med en rask startguide for bruk av forumet."}},"presence":{"replying":{"one":"svarer","other":"svarer"},"editing":{"one":"redigerer","other":"redigerer"},"replying_to_topic":{"one":"svarer","other":"svarer"}},"poll":{"voters":{"one":"stemmegiver","other":"stemmegivere"},"total_votes":{"one":"antall stemmer","other":"antall stemmer"},"average_rating":"Gjennomsnitt: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Stemmene er \u003cstrong\u003eoffentlige\u003c/strong\u003e."},"results":{"groups":{"title":"Du må være medlem av %{groups} for å stemme i denne avstemningen."},"vote":{"title":"Resultatene vises med \u003cstrong\u003estemmer\u003c/strong\u003e."},"closed":{"title":"Resultatene vises når \u003cstrong\u003elukket\u003c/strong\u003e."},"staff":{"title":"Resultatene vises bare til \u003cstrong\u003eModeratorer\u003c/strong\u003e medlemmer."}},"multiple":{"help":{"at_least_min_options":{"one":"Velg minst \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ.","other":"Velg minst \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ"},"up_to_max_options":{"one":"Velg opptil \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ.","other":"Velg opptil \u003cstrong\u003e%{count}\u003c/strong\u003e alternativer."},"x_options":{"one":"Velg \u003cstrong\u003e%{count}\u003c/strong\u003e alternativ.","other":"Velg \u003cstrong\u003e%{count}\u003c/strong\u003e alternativer."},"between_min_and_max_options":"Velg mellom \u003cstrong\u003e%{min}\u003c/strong\u003e og \u003cstrong\u003e%{max}\u003c/strong\u003e alternativer."}},"cast-votes":{"title":"Stem nå","label":"Stem!"},"show-results":{"title":"Vis resultat","label":"Vis resultat"},"hide-results":{"title":"Tilbake til dine stemmer","label":"Vis stemme"},"group-results":{"title":"Gruppere stemmer etter brukerfelt","label":"Vis Fordeling"},"export-results":{"title":"Eksporter avstemmingsresultatene","label":"Eksporter"},"open":{"title":"Åpne avstemning","label":"Åpne","confirm":"Er du sikker på at du vil åpne denne avstemningen?"},"close":{"title":"Lukk avstemning","label":"Lukk","confirm":"Er du sikker på at du vil lukke avstemningen?"},"automatic_close":{"closes_in":"Stenger om \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Stengt \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Avstemnings resultater","votes":"%{count} stemmer","breakdown":"Fordeling","percentage":"Prosent","count":"Antall"},"error_while_toggling_status":"Beklager, det oppstod en feil ved endring av status på denne avstemningen.","error_while_casting_votes":"Beklager, det oppstod en feil da du ga din stemme.","error_while_fetching_voters":"Beklager, det oppstod en feil når stemmegivere skulle vises.","error_while_exporting_results":"Beklager, det oppstod en feil under eksport av avstemningsresultat.","ui_builder":{"title":"Lag avstemning.","insert":"Sett inn avstemning","help":{"options_min_count":"Angi minst 1 alternativ.","options_max_count":"Angi maksimalt %{count} alternativer.","invalid_min_value":"Minimumsverdien må være minst 1.","invalid_max_value":"Maksimumsverdien må være minst 1, men mindre enn eller lik med antall alternativer.","invalid_values":"Minimumsverdien må være mindre enn maksimumsverdien.","min_step_value":"Minimal stegverdi er 1"},"poll_type":{"label":"Type","regular":"Et valg","multiple":"Flere valg","number":"Nummervurdering"},"poll_result":{"label":"Vis resultater...","always":"Alltid synlig","vote":"Bare etter stemming","closed":"Når avstemningen er stengt","staff":"Bare ansatte"},"poll_groups":{"label":"Begrens stemmegivning til disse gruppene"},"poll_chart_type":{"label":"Resultat diagram","bar":"Bar","pie":"Pai"},"poll_config":{"max":"Maks valg","min":"Min. valg","step":"Steg"},"poll_public":{"label":"Vis hvem som har stemt"},"poll_title":{"label":"Tittel (valgfritt)"},"poll_options":{"label":"Alternativer (en per linje)","add":"Legg til alternativ"},"automatic_close":{"label":"Steng avstemningen automatisk"},"show_advanced":"Vis avanserte innstillinger","hide_advanced":"Skjul avanserte alternativer"}},"styleguide":{"title":"Styleguide","welcome":"For å komme i gang, velg en seksjon fra menyen til venstre.","categories":{"atoms":"Atomer","molecules":"Molekyler","organisms":"Organismer"},"sections":{"typography":{"title":"Typografi","example":"Velkommen til Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud trening ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Dato/tid inndata"},"font_scale":{"title":"Font System"},"colors":{"title":"Farger"},"icons":{"title":"Ikoner","full_list":"Se hele listen over Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Knapper"},"dropdowns":{"title":"Dropdowns"},"categories":{"title":"Kategorier"},"bread_crumbs":{"title":"Brødsmuler"},"navigation":{"title":"Navigasjon"},"navigation_bar":{"title":"Navigasjon"},"navigation_stacked":{"title":"Navigasjon Stablet"},"categories_list":{"title":"Liste over kategorier"},"topic_link":{"title":"Emne Link"},"topic_list_item":{"title":"Element for emne liste"},"topic_statuses":{"title":"Emne Statuser"},"topic_list":{"title":"Emne liste"},"basic_topic_list":{"title":"Enkel Emneliste"},"footer_message":{"title":"Bunntekst Melding"},"signup_cta":{"title":"Registrering av CTA"},"topic_timer_info":{"title":"Tidsbestemte handlinger for emne"},"topic_footer_buttons":{"title":"Emne bunntekstknapper"},"topic_notifications":{"title":"Emne Varsler"},"post":{"title":"Innlegg"},"topic_map":{"title":"Emne Kart"},"site_header":{"title":"Site Header"},"suggested_topics":{"title":"Anbefalte emner"},"post_menu":{"title":"Innlegg meny"},"modal":{"title":"Modell","header":"Modell tittel","footer":"Modal Footer"},"user_about":{"title":"Bruker om boks"},"header_icons":{"title":"Toppikoner"},"spinners":{"title":"Spinnere"}}}}},"en":{"js":{"dates":{"from_placeholder":"from date"},"skip_to_main_content":"Skip to main content","bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined.","other":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} users have joined."},"s3":{"regions":{"eu_south_1":"EU (Milan)"}},"period_chooser":{"aria_label":"Filter by period"},"bookmarked":{"help":{"edit_bookmark_for_topic":"Click to edit the bookmark for this topic"}},"bookmarks":{"remove_reminder_keep_bookmark":"Remove reminder and keep bookmark"},"review":{"date_filter":"Posted between"},"groups":{"members":{"no_filter_matches":"No members match that search."}},"categories":{"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week.","other":"%{count} new topics in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month.","other":"%{count} new topics in the past month."}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"sr_expand_profile":"Expand profile details","sr_collapse_profile":"Collapse profile details","no_bookmarks_search":"No bookmarks found with the provided search query.","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","messages":{"all":"all inboxes","personal":"Personal","read_more_in_group":"Want to read more? Browse other messages in %{groupLink}.","read_more":"Want to read more? Browse other messages in \u003ca href='%{basePath}/u/%{username}/messages'\u003epersonal messages\u003c/a\u003e."},"second_factor_backup":{"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."}},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply.","other":"There are \u003cb\u003e%{count}\u003c/b\u003e replies."},"short_label":"Summarize","short_title":"Show a summary of this topic: the most interesting posts as determined by the community"},"create_account":{"associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"login":{"google_oauth2":{"sr_title":"Login with Google"},"twitter":{"sr_title":"Login with Twitter"},"instagram":{"sr_title":"Login with Instagram"},"facebook":{"sr_title":"Login with Facebook"},"github":{"sr_title":"Login with GitHub"},"discord":{"sr_title":"Login with Discord"}},"select_kit":{"results_count":{"one":"%{count} result","other":"%{count} results"}},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"error":{"title_too_short":{"one":"Title must be at least %{count} character","other":"Title must be at least %{count} characters"},"title_too_long":{"one":"Title can't be more than %{count} character","other":"Title can't be more than %{count} characters"},"post_length":{"one":"Post must be at least %{count} character","other":"Post must be at least %{count} characters"},"tags_missing":{"one":"You must choose at least %{count} tag","other":"You must choose at least %{count} tags"}},"title":"Or press %{modifier}Enter"},"notifications":{"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"}},"search":{"open_advanced":"Open advanced search","clear_search":"Clear search","sort_or_bulk_actions":"Sort or bulk select results","search_term_label":"enter search keyword","in":"in","in_this_topic":"in this topic","in_this_topic_tooltip":"switch to searching all topics","in_topics_posts":"in all topics and posts","enter_hint":"or press Enter","in_posts_by":"in posts by %{username}","type":{"default":"Topics/posts","categories_and_tags":"Categories/tags"},"tips":{"category_tag":"filters by category or tag","author":"filters by post author","in":"filters by metadata (e.g. in:title, in:personal, in:pinned)","status":"filters by topic status","full_search":"launches full page search","full_search_key":"%{modifier} + Enter"},"advanced":{"title":"Advanced filters","posted_by":{"aria_label":"Filter by post author"},"with_tags":{"aria_label":"Filter using tags"},"post":{"min":{"aria_label":"filter by minimum number of posts"},"max":{"aria_label":"filter by maximum number of posts"},"time":{"aria_label":"Filter by posted date"}},"min_views":{"aria_label":"filter by minimum views"},"max_views":{"aria_label":"filter by maximum views"},"additional_options":{"label":"Filter by post count and topic views"}}},"hamburger_menu":"menu","topics":{"bulk":{"dismiss_button_with_selected":{"one":"Dismiss (%{count})…","other":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})","other":"Dismiss New (%{count})"},"change_category":"Set Category...","notification_level":"Notifications...","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from \u003cb\u003e%{count}\u003c/b\u003e topics. Are you sure?"}},"none":{"unseen":"You have no unseen topics."},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"}},"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."},"feature_topic":{"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"}}},"post":{"quote_reply_shortcut":"Or press q","quote_edit_shortcut":"Or press e","errors":{"file_too_large_humanized":"Sorry, that file is too big (maximum size is %{max_size}). Why not upload your large file to a cloud sharing service, then paste the link?"},"controls":{"permanently_delete":"Permanently Delete","permanently_delete_confirmation":"Are you sure you permanently want to delete this post? You will not be able to recover it.","change_owner":"Change Ownership...","grant_badge":"Grant Badge...","add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice..."},"bookmarks":{"create_for_topic":"Create bookmark for topic","edit_for_topic":"Edit bookmark for topic"}},"category":{"notifications":{"title":"change notification level for this category"},"topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"history":"History","filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"}},"download_calendar":{"title":"Download calendar","save_ics":"Download .ics file","save_google":"Add to Google calendar","remember":"Don’t ask me again","remember_explanation":"(you can change this preference in your user prefs)","default_calendar":"Default calendar","default_calendar_instruction":"Determine which calendar should be used when dates are saved","add_to_calendar":"Add to calendar","google":"Google Calendar","ics":"ICS"},"tagging":{"topics":{"none":{"unseen":"You have no unseen topics."}}},"user_activity":{"no_activity_title":"No activity yet","no_activity_body":"Welcome to our community! You are brand new here and have not yet contributed to discussions. As a first step, visit \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e and just start reading! Select %{heartIcon} on posts that you like or want to learn more about. If you have not already done so, help others get to know you by adding a picture and bio in your \u003ca href='%{preferencesUrl}'\u003euser preferences\u003c/a\u003e.","no_replies_title":"You have not replied to any topics yet","no_drafts_title":"You haven’t started any drafts","no_drafts_body":"Not quite ready to post? We’ll automatically save a new draft and list it here whenever you start composing a topic, reply, or personal message. Select the cancel button to discard or save your draft to continue later.","no_likes_title":"You haven’t liked any topics yet","no_likes_body":"A great way to jump in and start contributing is to start reading conversations that have already taken place, and select the %{heartIcon} on posts that you like!","no_topics_title":"You have not started any topics yet","no_read_topics_title":"You haven’t read any topics yet","no_read_topics_body":"Once you start reading discussions, you’ll see a list here. To start reading, look for topics that interest you in \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e or search by keyword %{searchIcon}"},"no_group_messages_title":"No group messages found","cakeday":{"none":" "},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"poll":{"remove-vote":{"title":"Remove your vote","label":"Remove vote"}}}}};
I18n.locale = 'nb_NO';
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
//! locale : Norwegian Bokmål [nb]
//! authors : Espen Hovlandsdal : https://github.com/rexxars
//!           Sigurd Gartmann : https://github.com/sigurdga
//!           Stephen Ramthun : https://github.com/stephenramthun

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var nb = moment.defineLocale('nb', {
        months: 'januar_februar_mars_april_mai_juni_juli_august_september_oktober_november_desember'.split(
            '_'
        ),
        monthsShort: 'jan._feb._mars_apr._mai_juni_juli_aug._sep._okt._nov._des.'.split(
            '_'
        ),
        monthsParseExact: true,
        weekdays: 'søndag_mandag_tirsdag_onsdag_torsdag_fredag_lørdag'.split('_'),
        weekdaysShort: 'sø._ma._ti._on._to._fr._lø.'.split('_'),
        weekdaysMin: 'sø_ma_ti_on_to_fr_lø'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD.MM.YYYY',
            LL: 'D. MMMM YYYY',
            LLL: 'D. MMMM YYYY [kl.] HH:mm',
            LLLL: 'dddd D. MMMM YYYY [kl.] HH:mm',
        },
        calendar: {
            sameDay: '[i dag kl.] LT',
            nextDay: '[i morgen kl.] LT',
            nextWeek: 'dddd [kl.] LT',
            lastDay: '[i går kl.] LT',
            lastWeek: '[forrige] dddd [kl.] LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: 'om %s',
            past: '%s siden',
            s: 'noen sekunder',
            ss: '%d sekunder',
            m: 'ett minutt',
            mm: '%d minutter',
            h: 'en time',
            hh: '%d timer',
            d: 'en dag',
            dd: '%d dager',
            w: 'en uke',
            ww: '%d uker',
            M: 'en måned',
            MM: '%d måneder',
            y: 'ett år',
            yy: '%d år',
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return nb;

})));

// moment-timezone-localization for lang code: nb

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidjan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Accra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Addis Abeba","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Alger","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamako","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Kairo","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Casablanca","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Ceuta","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Conakry","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Dar-es-Salaam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Djibouti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"El Aaiún","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Johannesburg","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Khartoum","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lomé","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaka","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadishu","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monrovia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairobi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"Ndjamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nouakchott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ouagadougou","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto-Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"São Tomé","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Tripoli","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Tunis","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Anguilla","id":"America/Anguilla"},{"value":"America/Antigua","name":"Antigua","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaína","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"La Rioja","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Rio Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucumán","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Asunción","id":"America/Asuncion"},{"value":"America/Bahia","name":"Bahia","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahía Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belém","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogotá","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancún","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Cayenne","id":"America/Cayenne"},{"value":"America/Cayman","name":"Caymanøyene","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Córdoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Costa Rica","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiabá","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Curaçao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominica","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepe","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"El Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Grenada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Guadeloupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Guatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guayaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Guyana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"Havana","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianapolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Jamaica","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"La Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Los Angeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceió","id":"America/Maceio"},{"value":"America/Managua","name":"Managua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinique","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlan","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Mérida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Mexico by","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevideo","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"New York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, Nord-Dakota","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, Nord-Dakota","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salem, Nord-Dakota","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panama","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Port-au-Prince","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Port of Spain","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Puerto Rico","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Rio Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarém","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"São Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"Saint-Barthélemy","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"St. John’s","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"St. Kitts","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"St. Lucia","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"St. Thomas","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"St. Vincent","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Thule","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tortola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Casey","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Davis","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Dumont d’Urville","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Macquarie","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Mawson","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"McMurdo","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Palmer","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Rothera","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Syowa","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Troll","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Vostok","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Longyearbyen","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Aden","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Almaty","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Amman","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Anadyr","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Aktau","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Aqtöbe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Asjkhabad","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Atyrau","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Bagdad","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrain","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Baku","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Bangkok","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Barnaul","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Beirut","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Bisjkek","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Brunei","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Kolkata","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Tsjita","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Choybalsan","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Colombo","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Damaskus","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Dhaka","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Dili","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Dubai","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Dusjanbe","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Famagusta","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Gaza","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Hebron","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Hongkong","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Hovd","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Irkutsk","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Jakarta","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Jajapura","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Jerusalem","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Kabul","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Kamtsjatka","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Karachi","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Katmandu","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Khandyga","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Krasnojarsk","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lumpur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Kuching","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Kuwait","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Macao","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Magadan","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Makassar","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Manila","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Muskat","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nikosia","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Novokuznetsk","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Novosibirsk","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Omsk","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Oral","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Phnom Penh","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Pontianak","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Pyongyang","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Qatar","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Kyzylorda","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Yangon","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Riyadh","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Ho Chi Minh-byen","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Sakhalin","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarkand","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Seoul","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Shanghai","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Singapore","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Srednekolymsk","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Taipei","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Tasjkent","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Tbilisi","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Teheran","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Thimpu","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tokyo","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Tomsk","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ulan Bator","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Ürümqi","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ust-Nera","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Vientiane","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Vladivostok","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Jakutsk","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Jekaterinburg","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Jerevan","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Asorene","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermuda","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Kanariøyene","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Kapp Verde","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Færøyene","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Reykjavík","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Sør-Georgia","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"St. Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Adelaide","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Brisbane","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Broken Hill","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Currie","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Darwin","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Eucla","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Hobart","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Lindeman","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Lord Howe","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Melbourne","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Perth","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Sydney","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"koordinert universaltid","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Amsterdam","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Andorra","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Astrakhan","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Athen","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Beograd","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlin","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Bratislava","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Brussel","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"București","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budapest","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Büsingen","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Chișinău","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"København","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"irsk sommertidDublin","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Gibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Guernsey","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsingfors","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istanbul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kaliningrad","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kiev","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Kirov","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Lisboa","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Ljubljana","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"britisk sommertidLondon","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Luxemburg","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madrid","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Mariehamn","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Minsk","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Monaco","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Moskva","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Paris","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Podgorica","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Praha","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Roma","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Samara","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"San Marino","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Sarajevo","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Saratov","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Simferopol","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Skopje","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Sofia","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Stockholm","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Tallinn","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Tirana","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Uljanovsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Uzjhorod","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Vaduz","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Vatikanstaten","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Wien","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Vilnius","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Volgograd","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Warszawa","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Zagreb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Zaporizjzja","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Zürich","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Chagos","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Christmasøya","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Kokosøyene","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Komorene","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Kerguelen","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Mahé","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Maldivene","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Mauritius","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Réunion","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Apia","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Auckland","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Bougainville","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Chatham","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Påskeøya","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Efate","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Enderbury","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Fakaofo","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Fiji","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Funafuti","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Galápagosøyene","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Gambier","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Guadalcanal","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Guam","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"Honolulu","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Johnston","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Kiritimati","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Kosrae","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Kwajalein","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Majuro","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Marquesas","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Midway","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Nauru","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Niue","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Norfolkøya","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Nouméa","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Pago Pago","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Palau","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Pitcairn","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Pohnpei","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Port Moresby","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Rarotonga","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Saipan","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Tahiti","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Tarawa","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Tongatapu","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Chuuk","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Wake","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Wallis","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};
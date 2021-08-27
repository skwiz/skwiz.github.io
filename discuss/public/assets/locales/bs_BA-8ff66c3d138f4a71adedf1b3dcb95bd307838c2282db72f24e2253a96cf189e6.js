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
r += "Počnimo <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">raspravu!</a> Tamo ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "je <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tema";
return r;
},
"few" : function(d){
var r = "";
r += "su <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tema";
return r;
},
"other" : function(d){
var r = "";
r += "su <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tema";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " i ";
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
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postova";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postova";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ", Posjetitelji trebaju više za čitanje i odgovaranje na njih - preporučujemo ih barem ";
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
"few" : function(d){
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
})() + "</strong> tema";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " i ";
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
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postova";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postova";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Samo osoblje može vidjeti ovu poruku.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Hajde da <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">započnemo diskusiju!</a> Tamo ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "je <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tema";
return r;
},
"few" : function(d){
var r = "";
r += "su <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> teme";
return r;
},
"other" : function(d){
var r = "";
r += "su <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> teme";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Posjetiteljima je potrebno više sadržaja za čitati i odgovoriti na — preporučujemo barem ";
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
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> teme";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> teme";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Samo osoblje može vidjeti ovu poruku.";
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["en"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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

I18n.translations = {"bs_BA":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Bajt","few":"Bajta","other":"Bajta"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number} miliona"}},"dates":{"time":"HH: mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"D MMM","full_no_year_no_time":"Do MMMM","long_with_year":"D MMM, YYYY HH:mm","long_with_year_no_time":"D MMM, YYYY","full_with_year_no_time":"Do MMMM, YYYY","long_date_with_year":"D MMM, 'YY LT","long_date_without_year":"D MMM, LT","long_date_with_year_without_time":"D MMM, 'YY","long_date_without_year_with_linebreak":"D MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D MMM, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} prije","tiny":{"half_a_minute":"\u003c 1m","less_than_x_seconds":{"one":"\u003c %{count}s","few":"\u003c %{count}s","other":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s","few":"%{count}s","other":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m","few":"\u003c %{count}m","other":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m","few":"%{count}m","other":"%{count}m"},"about_x_hours":{"one":"%{count}h","few":"%{count}h","other":"%{count}h"},"x_days":{"one":"%{count}d","few":"%{count}d","other":"%{count}d"},"x_months":{"one":"%{count} mjesec","few":"%{count} mjeseca","other":"%{count} mjeseci"},"about_x_years":{"one":"%{count} god.","few":"%{count} god.","other":"%{count} god."},"over_x_years":{"one":"\u003e %{count} god.","few":"\u003e %{count} god.","other":"\u003e %{count} god."},"almost_x_years":{"one":"%{count} god.","few":"%{count} god.","other":"%{count} god."},"date_month":"D MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} min","few":"%{count} min","other":"%{count} min"},"x_hours":{"one":"%{count} sat","few":"%{count} sata","other":"%{count} sati"},"x_days":{"one":"%{count} dan","few":"%{count} dana","other":"%{count} dana"},"date_year":"D MMM 'YY"},"medium_with_ago":{"x_minutes":{"one":"prije %{count} minutu","few":"prije %{count} minuta","other":"prije %{count} minuta"},"x_hours":{"one":"prije %{count} sat","few":"prije %{count} sata","other":"prije %{count} sati"},"x_days":{"one":"prije %{count} dan","few":"prije %{count} dana","other":"prije %{count} dana"},"x_months":{"one":"prije %{count} mjesec","few":"prije %{count} mjeseca","other":"prije %{count} mjeseci"},"x_years":{"one":"prije %{count} godine","few":"prije %{count} godine","other":"prije %{count} godina"}},"later":{"x_days":{"one":"%{count} dan kasnije","few":"%{count} dana kasnije","other":"%{count} dana kasnije"},"x_months":{"one":"%{count} mjesec kasnije","few":"%{count} mjeseca kasnije","other":"%{count} mjeseci kasnije"},"x_years":{"one":"%{count} godina kasnije","few":"%{count} godine kasnije","other":"%{count} godina kasnije"}},"previous_month":"Prošli mjesec","next_month":"Sljedeći mjesec","placeholder":"datum"},"share":{"topic_html":"Tema: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"dijeli post #%{postNumber}","close":"zatvori","twitter":"Podijeli na Twitter","facebook":"Podijeli na Facebooku","email":"Pošalji putem e-maila"},"action_codes":{"public_topic":"je učinio ovu temu javnom %{when}","private_topic":"je učinio ovu temu privatnom porukom %{when}","split_topic":"razdvoji ovu temu %{when}","invited_user":"pozvan %{who} %{when}","invited_group":"pozvan %{who} %{when}","user_left":"%{who} je izašao iz ovog razgovora u %{when}","removed_user":"uklonjen %{who} %{when}","removed_group":"ukloljen %{who} %{when}","autobumped":"automski drmnuli u %{when}","autoclosed":{"enabled":"zatvoren %{when}","disabled":"otvoren %{when}"},"closed":{"enabled":"zatvoren %{when}","disabled":"otvoren %{when}"},"archived":{"enabled":"arhiviran %{when}","disabled":"dearhiviran %{when}"},"pinned":{"enabled":"zakačen %{when}","disabled":"otkačen %{when}"},"pinned_globally":{"enabled":"zakačen globalno %{when}","disabled":"otkačen %{when}"},"visible":{"enabled":"izlistan %{when}","disabled":"sklonjen %{when}"},"banner":{"enabled":"pretvoreno u banner %{when}. Banner će biti prikazan na vrhu svake stranice dok ga korisnik ne isključi.","disabled":"maknuo banner %{when}. Banner se više neće prikazivati na vrhu svake stranice."},"forwarded":"gornji email proslijeđen"},"topic_admin_menu":"akcije u vezi teme","wizard_required":"Dobrodošli na vaš novi Discourse! Odpočnimo sa \u003ca href='%{url}' data-auto-route='true'\u003ečarobnjakom za postavke\u003c/a\u003e ✨","emails_are_disabled":"Sve odlazeće email poruke su globalno onemogućene od strane administratora. Ni jedna notifikacija bilo koje vrste neće biti poslana.","software_update_prompt":{"dismiss":"Odpusti"},"bootstrap_mode_disabled":"Bootstrap način rada će biti isključen u toku 24 sata.","themes":{"default_description":"Uobičajen","broken_theme_alert":"Vaša stranica možda neradi jer tema / komponeta ima %{theme} greške.\nUgasi ju kod %{path}"},"s3":{"regions":{"ap_northeast_1":"Azija Pacifik (Tokio)","ap_northeast_2":"Azija Pacifik (Seul)","ap_south_1":"Azija Pacifik (Mumai)","ap_southeast_1":"Azija Pacifik (Singapur)","ap_southeast_2":"Azija Pacifik (Sidnej)","ca_central_1":"Kanada (Centralna)","cn_north_1":"Kina (Peking)","cn_northwest_1":"Kina (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"Evropska unia (Stockholm)","eu_west_1":"EU (Irska)","eu_west_2":"EU (London)","eu_west_3":"EU (Pariz)","sa_east_1":"Južna Amerika (Sau Paulo)","us_east_1":"SAD Istok (Sjeverna Virdžinija)","us_east_2":"SAD Istok (Ohio)","us_gov_east_1":"AWS GovCloud (SAD-Istok)","us_gov_west_1":"AWS GovCloud (SAD-Zapad)","us_west_1":"SAD Zapad (Sjeverna Kalifornija)","us_west_2":"SAD Zapad (Oregon)"}},"edit":"izmjeni naslov i kategoriju ove teme","expand":"Proširi","not_implemented":"Nažalost ta funkcionalnost nije još implementirana!","no_value":"Ne","yes_value":"Da","submit":"Potvrdi","generic_error":"Uff, došlo je do greške.","generic_error_with_reason":"Došlo je do greške: %{error}","sign_up":"Učlani se","log_in":"Prijavi se","age":"Godište","joined":"Pridružio se","admin_title":"Admin","show_more":"prikaži još","show_help":"opcije","links":"Linkovi","links_lowercase":{"one":"link","few":"linka","other":"linkova"},"faq":"Česta pitanja","guidelines":"Smjernice","privacy_policy":"Izjava o privatnosti","privacy":"Privatnost","tos":"Uslovi korištenja","rules":"Pravila","conduct":"Kodeks ponašanja","mobile_view":"Mobilni prikaz","desktop_view":"Desktop prikaz","or":"ili","now":"upravo sada","read_more":"pročitaj više","more":"Više","x_more":{"one":"Još %{count}","few":"Još %{count}","other":"Još %{count}"},"never":"nikada","every_30_minutes":"svakih 30 minuta","every_hour":"svaki sat","daily":"dnevno","weekly":"sedmično","every_month":"svaki mjesec","every_six_months":"svakih šest mjeseci","max_of_count":"maksimalno %{count}","character_count":{"one":"%{count} karakter","few":"%{count} karaktera","other":"%{count} karaktera"},"related_messages":{"title":"Povezane Poruke","see_all":"Prikaži \u003ca href=\"%{path}\"\u003esve poruke\u003c/a\u003e od @ %{username} ..."},"suggested_topics":{"title":"Preporučene teme","pm_title":"Preporučene Poruke"},"about":{"simple_title":"O nama","title":"O Nama %{title}","stats":"Statistika sajta","our_admins":"Naši administratori","our_moderators":"Naši moderatori","moderators":"Moderators","stat":{"all_time":"Ukupno vrijeme"},"like_count":"Sviđanja","topic_count":"Tema","post_count":"Objave","user_count":"Korisnici","active_user_count":"Aktivnih korisnika","contact":"Kontaktirajte nas","contact_info":"U slučaju da forum ne radi, molimo kontaktirajte nas na %{contact_info}."},"bookmarked":{"title":"Zabilješka","clear_bookmarks":"Odstrani zabilješku","help":{"bookmark":"Klikni kako bi dodao zabilješku na prvu objavu u temi","unbookmark":"Klikni za uklanjanje svih zabilješki sa ove teme"}},"bookmarks":{"created":"Zabilježili ste ovu objavu. %{name}","not_bookmarked":"zabilježi objavu","remove":"Ukloni zabilješku","delete":"Izbriši zabilješku","confirm_delete":"Jeste li sigurni da želite izbrisati ovu zabilješku? Podsjetnik će takođe biti izbrisan.","confirm_clear":"Jeste li sigurni da želite ukloniti sve vaše zabilješke iz ove teme?","save":"Sačuvaj","no_timezone":"Još niste postavili vremensku zonu. Nećete moći postavljati podsjetnike. Postavi vremensku zonu \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eu svom profilu\u003c/a\u003e.","invalid_custom_datetime":"Datum i vrijeme koje ste naveli nisu valjani. Pokušajte ponovo.","list_permission_denied":"Nemate dozvolu za pregled zabilješki ovog korisnika.","no_user_bookmarks":"Nemate zabilježene postove; zabilješke omogućuju brzo pozivanje na određene postove.","auto_delete_preference":{"label":"Automatsko brisanje","never":"Nikad","when_reminder_sent":"Nakon slanja podsjetnika","on_owner_reply":"Nakon što odgovorim na ovu temu"},"search_placeholder":"Pretražite zabilješke po imenu, naslovu teme ili sadržaju objave","search":"Pretraži","reminders":{"today_with_time":"danas u %{time}","tomorrow_with_time":"sutra u %{time}","at_time":"na %{date_time}"}},"copy_codeblock":{"copied":"kopirano!"},"drafts":{"label":"Skice","resume":"Nastavi","remove":"Ukloni","new_topic":"Nacrt nove teme","topic_reply":"skica odgovora","abandon":{"yes_value":"Odbaci"}},"topic_count_latest":{"one":"Pogledajte %{count} novu ili ažuriranu temu","few":"Pogledajte %{count} nove ili ažurirane teme","other":"Pogledajte %{count} novih ili ažuriranih tema"},"topic_count_unseen":{"one":"Pogledajte %{count} novu ili ažuriranu temu","few":"Pogledajte %{count} nove ili ažurirane teme","other":"Pogledajte %{count} novih ili ažuriranih tema"},"topic_count_unread":{"one":"Pogledaj %{count} nepročitanu temu","few":"Pogledaj %{count} nepročitane teme","other":"Pogledaj %{count} nepročitanih tema"},"topic_count_new":{"one":"Pogledaj %{count} novu temu","few":"Pogledaj %{count} nove teme","other":"Pogledaj %{count} novih tema"},"preview":"predprikaz","cancel":"otkaži","save":"Spremiti promjene","saving":"Spremam...","saved":"Spremljeno!","upload":"Učitaj","uploading":"Učitava se...","uploading_filename":"Učitavanje %{filename}","clipboard":"clipboard","uploaded":"Učitano!","pasting":"Lijepim...","enable":"Omogući","disable":"Onemogući","continue":"Nastavi","undo":"Vrati nazad","revert":"Vrati nazad","failed":"Neuspješno","switch_to_anon":"Uđi u privatni način rada","switch_from_anon":"Izađi iz privatnog načina rada","banner":{"close":"Odkaži ovu zastavicu.","edit":"Uredite ovu zastavicu \u003e\u003e"},"pwa":{"install_banner":"Da li želite \u003ca href\u003einstalirati %{title} na ovaj uređaj?\u003c/a\u003e"},"choose_topic":{"none_found":"Nema tema.","title":{"search":"Traži Temu","placeholder":"ovdje ukucajte naslov teme, url ili id"}},"choose_message":{"none_found":"nisam našao nijednu poruku","title":{"search":"Traži poruku","placeholder":"ovdje ukucajte naslov poruke, url ili id"}},"review":{"order_by":"Pordeak po","in_reply_to":"odgovori na","explain":{"why":"objasnite zašto je ovaj objekat završio na listi za čekanje","title":"Ocjenjiv Skor","formula":"Formula","subtotal":"Podsuma","total":"Suma","min_score_visibility":"Minimalni skor za Vidljivost","score_to_hide":"Skor za skrivanje objave","take_action_bonus":{"name":"preduzeo akciju","title":"Kada član uprave odluči da poduzme akciju, zastavici je dodijeljen bonus."},"user_accuracy_bonus":{"name":"korisnička preciznost","title":"Korisnicima čije su zastave prethodno bivale usaglašene dobivaju bonus."},"trust_level_bonus":{"name":"nivo povjerenja","title":"Ocjenjivi objekti kreirani od strane korisnika sa višim nivoom povjerenja imaju viši skor."},"type_bonus":{"name":"bonus tip","title":"Neki ocjenjivi tipovi mogu zaprimiti bonus od strane osoblja foruma kako bi tim tipovima podigli prioritet"}},"claim_help":{"optional":"Možete tražiti ova da sprijećite ostale da ga pregledaju","required":"VI morate tvrditi stavari prije ih morate cijeniti","claimed_by_you":"Vi ste tvrdili ovu stvar i sad ju možete pregledati ","claimed_by_other":"Ovu stavku može revidirati samo korisnik\u003cb\u003e%{username}\u003c/b\u003e"},"claim":{"title":"tvrdite ovu temu?"},"unclaim":{"help":"maknite ovu tvrdnju?"},"awaiting_approval":"čekanje odobrenje","delete":"Delete","settings":{"saved":"Spašeno","save_changes":"Spremiti promjene","title":"Postavke","priorities":{"title":"Prioriteti za pregledavanje"}},"moderation_history":"Povijest moderiranja","view_all":"Pregledaj sve","grouped_by_topic":"Grupisano po temi","none":"Nema stvari za pregled","view_pending":"pogled na čekanju","topic_has_pending":{"one":"Ova tema ima \u003cb\u003e%{count}\u003c/b\u003e post čekanje odobrenja","few":"Ova tema ima \u003cb\u003e%{count}\u003c/b\u003e postove na čekanju za odobrenje","other":"Ova tema ima \u003cb\u003e%{count}\u003c/b\u003e postova na čekanju za odobrenje"},"title":"Pregled","topic":"Tema:","filtered_topic":"Filtrirali ste sadržaj koji se može pregledati u jednoj temi.","filtered_user":"User","filtered_reviewed_by":"Pregledao je","show_all_topics":"(pokaži sve teme)","deleted_post":"(post izbrisan)","deleted_user":"(korisnik izbrisan)","user":{"bio":"Biografija","website":"Web stranica","username":"Ime","email":"Email","name":"Ime","fields":"Polja","reject_reason":"Reason"},"user_percentage":{"agreed":{"one":"%{count}% slaže","few":"%{count}% slaže","other":"%{count}% se slaže"},"disagreed":{"one":"%{count}% se ne slažu","few":"%{count}% se ne slažu","other":"%{count}% se ne slažu"},"ignored":{"one":"%{count}% ignore","few":"%{count}% ignore","other":"%{count}% ignorišu"}},"topics":{"topic":"Topic","reviewable_count":"Broji","reported_by":"prijavio","deleted":"[Tema obrisana]","original":"(orginalna tema)","details":"detalji","unique_users":{"one":"%{count} user","few":"%{count} users","other":"%{count}korisnika "}},"replies":{"one":"%{count} reply","few":"%{count} replies","other":"%{count}odgovora "},"edit":"Izmijeni","save":"Sačuvaj","cancel":"Odustani","new_topic":"Odobravanje ove stvari će napraviti novu temu","filters":{"all_categories":"(sve kategorije)","type":{"title":"Tip","all":"(sve vrste)"},"minimum_score":"Minimalno bodova:","refresh":"Osvježi","status":"Status","category":"Kategorija","orders":{"score":"bodovi","score_asc":"Rezultat (obrnuto)","created_at":"Napravjeno kod","created_at_asc":"Napravijeno kod (preokrenuti)"},"priority":{"title":"Minimalni prioritet","any":"(bilo koji)","low":"Nisko","medium":"Srednije","high":"Visoko"}},"conversation":{"view_full":"vidi čitav razgovor"},"scores":{"about":"Ovaj rezultat se izračunava na osnovu nivoa pouzdanosti reportera, tačnosti njihovih prethodnih zastavica i prioriteta stavke koja se prijavljuje.","score":"bodovi","date":"Datum","type":"Tip","status":"Status","submitted_by":"Poslao je","reviewed_by":"Pregledao je"},"statuses":{"pending":{"title":"Na čekanju"},"approved":{"title":"Dozvojeno"},"rejected":{"title":"Odbijeni"},"ignored":{"title":"Ignorisano"},"deleted":{"title":"Isbrisano"},"reviewed":{"title":"(sve pregledano)"},"all":{"title":"(sve)"}},"types":{"reviewable_flagged_post":{"title":"Kažnjen post","flagged_by":"Kaznio je"},"reviewable_queued_topic":{"title":"Tema u redu čekanja"},"reviewable_queued_post":{"title":"Post na čekanju"},"reviewable_user":{"title":"User"},"reviewable_post":{"title":"Objava"}},"approval":{"title":"Post treba odobrenje","description":"Primili smo Vaš novi post ali on treba biti odobren od strane moderatora prije nego bude javno dostupan. Molimo za strpljenje.","pending_posts":{"one":"Imate \u003cstrong\u003e%{count}\u003c/strong\u003e poruku na čekanju.","few":"Imate \u003cstrong\u003e%{count}\u003c/strong\u003e na čekanju.","other":"Imate \u003cstrong\u003e%{count}\u003c/strong\u003e na čekanju."},"ok":"OK"},"example_username":"korisničko ime"},"relative_time_picker":{"days":{"one":"dan","few":"days","other":"days"}},"time_shortcut":{"later_today":"Na kraju dana","next_business_day":"Sljedeći radni dan","tomorrow":"Sutra","later_this_week":"Kasnije ove sedmice","this_weekend":"Ovog vikenda","start_of_next_business_week":"Ponedjeljak","start_of_next_business_week_alt":"Sljedeći ponedjeljak","next_month":"Sljedeći mjesec","custom":"Precizirano vrijeme i datum"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e je objavio/la \u003ca href='%{topicUrl}'\u003etemu\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eVi\u003c/a\u003e ste objavili \u003ca href='%{topicUrl}'\u003etemu\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e je odgovorio/la na objavu \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eVi\u003c/a\u003e ste odgovorili na objavu \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e je odgovorio/la na \u003ca href='%{topicUrl}'\u003etemu\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eYou\u003c/a\u003e replied to \u003ca href='%{topicUrl}'\u003ethe topic\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e je spomenuo/la \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"7\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e je spomenuo/la\u003ca href='%{user2Url}'\u003evas\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eVi\u003c/a\u003e ste spomenuli \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Objavio \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Objavili\u003ca href='%{userUrl}'\u003evi\u003c/a\u003e","sent_by_user":"Poslao \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Poslali \u003ca href='%{userUrl}'\u003evi\u003c/a\u003e"},"directory":{"username":"Ime","filter_name":"filtiraj korisnike","title":"Korisnici","likes_given":"Dato","likes_received":"Primljeno","topics_entered":"Pogledano","topics_entered_long":"Tema pogledano","time_read":"Pročitano puta","topic_count":"Teme","topic_count_long":"Kreirano temi","post_count":"Replike","post_count_long":"Odgovoreno","no_results":"Bez rezultata pretrage.","days_visited":"Posjete","days_visited_long":"Dani posjete","posts_read":"Čitaj","posts_read_long":"Pročitano postova","last_updated":"Zadnji put ažurirano:","total_rows":{"one":"%{count} korisnik","few":"%{count} korisnika","other":"%{count} korisnika"},"edit_columns":{"save":"Sačuvaj"},"group":{"all":"sve grupe"}},"group_histories":{"actions":{"change_group_setting":"Promijeni postavke grupe","add_user_to_group":"Dodaj korisnika","remove_user_from_group":"Ukloni korisnika","make_user_group_owner":"Napravi vlasnika","remove_user_as_group_owner":"Ukloni vlasnika"}},"groups":{"member_added":"Doodano","member_requested":"zatraženo na","add_members":{"usernames_placeholder":"korisnička imena","usernames_or_emails_placeholder":"korisnička imena ili e-adrese","notify_users":"Obavijesti korisnike"},"requests":{"title":"Zahtjevi","reason":"Reason","accept":"Prihvati","accepted":"prihvaćeno","deny":"odbiti","denied":"odbijeno","undone":"zahtjev izbrsan","handle":"obradi zahtjev za članstvo"},"manage":{"title":"Uredi","name":"Ime","full_name":"Puno ime","invite_members":"Invite","delete_member_confirm":"Ukloni '%{username}' iz grupe '%{group}'?","profile":{"title":"Profil"},"interaction":{"title":"Interakcija","posting":"Objavljivanje","notification":"Obavijest"},"email":{"title":"Email","status":"Sinkronizirano %{old_emails} / %{total_emails} e-pošte putem IMAP-a.","last_updated_by":"by","credentials":{"title":"Identifikacija","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"Koristi SSL za SMTP","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"Koristi SSL za IMAP","username":"Ime","password":"Lozinka"},"settings":{"title":"Postavke"},"mailboxes":{"synchronized":"Sinkronizirani poštanski sandučić","none_found":"Na ovom računu e-pošte nisu pronađeni poštanski sandučići.","disabled":"Neomogućen"}},"membership":{"title":"Članstvo","access":"Pristup"},"categories":{"title":"Kategorije","long_title":"Zadane obavijesti kategorije","description":"Kada se korisnici dodaju u ovu grupu, njihove postavke obavijesti o kategorijama bit će postavljene na ove zadane vrijednosti. Poslije ih mogu promijeniti.","watched_categories_instructions":"Automatski gledaj sve teme u ovim kategorijama. Članovi grupe će biti obaviješteni o svim novim postovima i temama, a pored teme će se pojaviti i broj novih postova.","tracked_categories_instructions":"Automatski prati sve teme u ovim kategorijama. Pored teme pojavit će se broj novih postova.","watching_first_post_categories_instructions":"Korisnici će biti obaviješteni o prvom postu u svakoj novoj temi iz ovih kategorija.","regular_categories_instructions":"Ako su ove kategorije utišane/muted, one će biti uključene/unmuted za članove grupe. Korisnici će biti obaviješteni ako su spomenuti ili im netko odgovori.","muted_categories_instructions":"Korisnici neće biti obaviješteni o novim temama u ovim kategorijama i neće se pojaviti na stranicama kategorija ili najnovijih tema."},"tags":{"title":"Oznake","long_title":"Označava standardne obavijesti","description":"Kada se korisnici dodaju u ovu grupu, postavke obaveštenja o oznakama biće podešene na ove zadane postavke. Kasnije ih mogu promijeniti.","watched_tags_instructions":"Automatski gledaj sve teme s ovim oznakama. Članovi grupe će biti obaviješteni o svim novim postovima i temama, a pored teme će se pojaviti i broj novih postova.","tracked_tags_instructions":"Automatski prati sve teme pomoću ovih oznaka. Pored teme pojavit će se broj novih postova.","watching_first_post_tags_instructions":"Korisnici će biti obaviješteni o prvom postu u svakoj novoj temi s ovim oznakama.","regular_tags_instructions":"Ako su ove oznake prigušene, one će biti neprigušene za članove grupe. Korisnici će biti obaviješteni ako su spomenuti ili im netko odgovori.","muted_tags_instructions":"Korisnici neće biti obaviješteni o novim temama s ovim oznakama i neće se pojaviti u Zadnje."},"logs":{"title":"Dnevnički zapisi","when":"Kad","action":"Djelo","acting_user":"Djelatni korisnik","target_user":"Ciljani korisnik","subject":"Naslov","details":"Detalji","from":"Od","to":"Ka"}},"permissions":{"title":"Permisije","none":"Ne postoje kategorije povezane s ovom grupom.","description":"Članovi ove grupe mogu pristupiti ovim kategorijama"},"public_admission":"Omogući korisnicima da se mogu slobodno učlaniti u grupu (zahtjeva da grupa bude javno otvorena)","public_exit":"Omogući korisnicima da mogu slobodno napustiti grupu","empty":{"posts":"Ne postoje postovi člana ove grupe.","members":"Nema članova u grupi.","requests":"Za ovu grupu nema zahtjeva za članstvo.","mentions":"Nema spominjanja u grupi.","messages":"Nema novih poruka za ovu grupu.","topics":"Nema novih tema od strane članova ove grupe.","logs":"Nema novih logova za ovu grupu."},"add":"Dodaj","join":"Učlani se","leave":"Napusti","request":"Zatraži","message":"Poruka","confirm_leave":"Jeste li sigurni da želite napustiti ovu grupu?","allow_membership_requests":"Dopusti korisnicima da smiju slati molbe za učlanjenje u grupu vlasnicima grupa (Potrebno je da je grupa javno vidljiva)","membership_request_template":"Prilagođeni memorandum kao priložak koji se prikazuje korisnicima prilikom slanja zahtjeva za učlanjenje","membership_request":{"submit":"Poslati zahtjev ","title":"Zahtjev za učlanjenje u @%{group_name}","reason":"Dadnite do znanja vlasnicima grupe zašto baš vi pripadate ovoj grupi"},"membership":"Članstvo","name":"Ime","group_name":"Ime grupe","user_count":"Korisnici","bio":"O grupi","selector_placeholder":"unesi korisničko ime","owner":"vlasnik","index":{"title":"Grupe","all":"Sve grupe","empty":"Vidljive grupe još ne postoje.","filter":"Filtriraj prema tipu grupe","owner_groups":"Grupe koje imam","close_groups":"Zatvorene grupe","automatic_groups":"Automatske grupe","automatic":"Automatsko","closed":"Zatvoreno","public":"Javno","private":"Privatno","public_groups":"Javne grupe","my_groups":"Moje grupe","group_type":"Tip grupe","is_group_user":"Član","is_group_owner":"Vlasnik"},"title":{"one":"Grupa","few":"Grupe","other":"Grupa"},"activity":"Aktivnost","members":{"title":"Članovi","filter_placeholder_admin":"korisničko ime ili email","filter_placeholder":"korisničko ime","remove_member":"Ukloni člana","remove_member_description":"Ukloni \u003cb\u003e%{username}\u003c/b\u003e iz ove grupe","make_owner":"Napravi vlasnikom","make_owner_description":"Napravi\u003cb\u003e%{username}\u003c/b\u003e vlasnikom ove grupe","remove_owner":"Ukloni kao vlasnika","remove_owner_description":"Ukloni \u003cb\u003e%{username}\u003c/b\u003e kao vlasnika ove grupe","owner":"Vlasnik","forbidden":"Nije vam dozvoljeno da vidite članove."},"topics":"Teme","posts":"Postovi","mentions":"Spomenuto","messages":"Poruke","notification_level":"Uobičajen nivo obavještenja za grupne poruke","alias_levels":{"mentionable":"Ko može @spomenuti ovu grupu?","messageable":"Ko može slati poruke ovoj grupi?","nobody":"Niko","only_admins":"Samo admini","mods_and_admins":"Samo moderatori i Admini","members_mods_and_admins":"Samo članovi grupe, moderatori i admini","owners_mods_and_admins":"Samo valsnici grupa,modoratori i administratori","everyone":"Svatko"},"notifications":{"watching":{"title":"Posmatram","description":"Dobit ćete obavijest za svaki naredni post u svakoj narednoj poruci, i broj novih odgovora će biti prikazan."},"watching_first_post":{"title":"Pratiti prve objave","description":"Bićete obaviješteni o novim porukama u ovoj grupi, ali ne i odgovorima na poruke."},"tracking":{"title":"Praćenje","description":"Bićete obaviješteni ako neko spominje vaše @korisničko-ime ili vam odgovori, a biće prikazan i broj novih odgovora."},"regular":{"title":"Normalno","description":"Bit ćete obaviješteni ako netko spominje vaše @korisničko-ime ili vam nešto odgovori."},"muted":{"title":"Utišano","description":"Nećete biti obaviješteni o bilo kojoj poruci u ovoj grupi."}},"flair_url":"Slika Avatara sposobnosti","flair_upload_description":"Koristite kvadratne slike ne manje od 20px sa 20px.","flair_bg_color":"Boja pozadine Slike Avatara sposobnosti","flair_bg_color_placeholder":"(Opciono) Hex broj boje","flair_color":"Boja Avatara sposobnosti","flair_color_placeholder":"(Opciono) Hex broj boje","flair_preview_icon":"Preview ikona","flair_preview_image":"Preview slika","flair_type":{"icon":"Odaberi ikonu","image":"Učitaj sliku"},"default_notifications":{"modal_yes":"Da"}},"user_action_groups":{"1":"Lajkovi","2":"Dobijeni Lajkovi","3":"Zabilješke","4":"Teme","5":"Postovi","6":"Odgovori","7":"Spemenute","9":"Citirane","11":"Izmjenjene","12":"Poslato","13":"Inbox","14":"Na čekanju.","15":"Skice"},"categories":{"all":"Sve kategorije","all_subcategories":"sve","no_subcategory":"nijedna","category":"Kategorija","category_list":"Prikaži listu kategorija","reorder":{"title":"Preuredi kategorije","title_long":"Reorganizuj listu kategorija","save":"Sačuvaj pozicije","apply_all":"Snimi","position":"Pozicija"},"posts":"Odgovori","topics":"Teme","latest":"Zadnje","subcategories":"Podkategorije","muted":"Prigušene kategorije","topic_sentence":{"one":"%{count} tema","few":"%{count} teme","other":"%{count} tema"},"topic_stat_unit":{"week":"sedmica","month":"mjesec"},"topic_stat_sentence_week":{"one":"%{count} nova tema u protekloj sedmici.","few":"%{count} nove teme u protekloj sedmici.","other":"%{count} nove teme u protekloj sedmici."},"topic_stat_sentence_month":{"one":"%{count} nova tema u posljednjih mjesec dana.","few":"%{count} nove teme u posljednjih mjesec dana.","other":"%{count} novih tema u zadnjih mjesec dana."},"n_more":"Kategorije (još %{count})..."},"ip_lookup":{"title":"forenzika IP adrese","hostname":"Hostname","location":"Lokacija","location_not_found":"(unknown)","organisation":"Organizacija","phone":"Telefon","other_accounts":"Ostali računi sa ovom IP adresom","delete_other_accounts":"Izbriši %{count}","username":"korisničko ime","trust_level":"NP","read_time":"vrijeme čitanja","topics_entered":"pogledano tema","post_count":"# postova","confirm_delete_other_accounts":"Jeste sigurni da želite da izbrišete ove račune?","powered_by":"koristeći \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"koprian"},"user_fields":{"none":"(odaberi opciju)","required":"Unesite vrijednost za \"%{name}”"},"user":{"said":"%{username}:","profile":"Profil","mute":"Mutiraj","edit":"Uredi Postavke","download_archive":{"button_text":"Preuzmi sve","confirm":"Da li ste sigurni da želite preuzeti svoju objavu?","success":"Preuzimanje je započeto, bit će te obavješteni porukom kada proces bude završen.","rate_limit_error":"Objava može biti preuzeta samo jedanput na dan, molimo vas da pokušate sutra ponovo."},"new_private_message":"Nova poruka","private_message":"Poruka","private_messages":"Poruke","user_notifications":{"filters":{"filter_by":"Filtriraj po","all":"Sve","read":"Čitao","unread":"Nepročitano"},"ignore_duration_title":"Ignoriraj korisnika","ignore_duration_username":"Ime","ignore_duration_when":"Trajanje:","ignore_duration_save":"Zanemari","ignore_duration_note":"Napominjemo da se sve ignoracije automatski uklanjaju nakon isteka trajanja ignoriranja.","ignore_duration_time_frame_required":"Odaberite vremenski okvir","ignore_no_users":"Nemate ignorisanih korisnika.","ignore_option":"Ignorisano","ignore_option_title":"Nećete primati obavijesti koje se odnose na ovog korisnika i sve njihove teme i odgovori će biti skriveni.","add_ignored_user":"Dodaj","mute_option":"Utišan","mute_option_title":"Nećete primati nikakve obavijesti koje se odnose na ovog korisnika.","normal_option":"Normalno","normal_option_title":"Bićete obaviješteni ako vam ovaj korisnik odgovori , citira vas ili vas spomene."},"notification_schedule":{"none":"Ništa","monday":"Ponedjeljak","to":"ka"},"activity_stream":"Aktivnost","read":"Čitaj","preferences":"Postavke","feature_topic_on_profile":{"open_search":"Odaberi Novu temu","title":"Odaberi temu","search_label":"Traži temu po naslovu","save":"Sačuvaj","clear":{"title":"Clear","warning":"Jeste li sigurni da želite vašu istaknutu temu očistiti?"}},"use_current_timezone":"Koristi trenutnu vremensku zonu","profile_hidden":"Javni profil ovog korisnika je skriven","expand_profile":"Proširi","collapse_profile":"Spusti","bookmarks":"Zabilješke","bio":"O Meni","timezone":"Vremenska zona","invited_by":"Pozvan od","trust_level":"Nivo povjerenja","notifications":"Obavijest","statistics":"Statistika","desktop_notifications":{"label":"Uživo obavjesti","not_supported":"Obavjesti nisu podržane na ovom web pregledniku.","perm_default":"Upali obavjesti","perm_denied_btn":"Zabranjen pristup","perm_denied_expl":"Odbili ste dozvolu za slanje notifikacija. Omogućite ih kroz postavke vašeg pretraživača.","disable":"Isključi obavjesti","enable":"Uključi obavijesti","consent_prompt":"Da li želite uživo obavjesti kada neko odgovori na vaše objave? "},"dismiss":"Odpusti","dismiss_notifications":"Odpusti sve","dismiss_notifications_tooltip":"Markiraj sve nepročitane obavijesti kao pročitane","first_notification":"Vaša prva obavijest! Selektirajte je kako bi započeli.","dynamic_favicon":"Prikaži brojeve na ikoni preglednika","skip_new_user_tips":{"description":"Isključi savjete i upute za novoregistrirane korisnike","not_first_time":"Nije ti prvi put?","skip_link":"Preskoči ove savjete"},"theme_default_on_all_devices":"Postavi ovu temu kao zadanu na svim mojim uređajima","color_schemes":{"undo":"Resetovati","regular":"Redovne"},"dark_mode":"Tamni način","dark_mode_enable":"Omogućite automatski tamnu šemu boja","text_size_default_on_all_devices":"Učinite ovo standardnom veličinom teksta na svim mojim uređajima","allow_private_messages":"Dozvoli drugim korisnicima da mi šalju privatne poruke","external_links_in_new_tab":"Otvori sve eksterne linkove u novom tab-u","enable_quoting":"Uključi \"citiran odgovor\" za označen tekst","enable_defer":"Uključi odgodu označavanja nepročitanih tema","change":"promjeni","featured_topic":"Istaknuta tema","moderator":"%{user} je moderator","admin":"%{user} je admin","moderator_tooltip":"Ovaj korisnik je moderator","admin_tooltip":"Ovaj korisnik je admin","silenced_tooltip":"Ovaj korisnik je ušutkan","suspended_notice":"Ovaj korisnike je suspendovan sve do %{date}.","suspended_permanently":"Ovaj korisnik je suspendovan.","suspended_reason":"Razlog: ","github_profile":"GitHub","email_activity_summary":"Sažetak aktivnosti","mailing_list_mode":{"label":"Mejling lista - način rada","enabled":"Uključite način rada Mejling lista","instructions":"Ova postavka nadjačava sažetak aktivnosti.\u003cbr /\u003e\nZanemarene teme i kategorije nisu uključene u ove poruke e-pošte.\n","individual":"Šalji e-mail za svaku novu objavu","individual_no_echo":"Šalji e-mail za svaki novu objavu izuzev vlastite","many_per_day":"Pošalji mi e-mail za svaku novu objavu (od prilike %{dailyEmailEstimate} puta po danu)","few_per_day":"Pošalji mi e-mail za svaku novu objavu (od prilike 2 puta po danu)","warning":"Mejling lista način rada je uključen. Postavke email obavjesti su prepravljene."},"tag_settings":"Tagovi","watched_tags":"Gledano","watched_tags_instructions":"Automatski će te gledati sve teme sa ovim tagom. Bit će te obavješteni o svim novim objavama i temama, i također broj novih objava će biti prikazan pored teme.","tracked_tags":"Praćeno","tracked_tags_instructions":"Automatski će te pratiti sve teme sa ovim tagovima. Broj novih objava će se pojaviti pored teme.","muted_tags":"Utišan","muted_tags_instructions":"Nećete biti obavješteni o novim temama sa ovim tagom, i neće biti prikazani u listi Zadnje.","watched_categories":"Motren","watched_categories_instructions":"Automatski će te gledati sve teme u ovim kategorijama. Bit će te obavješteni o svim novim objavama i temama, i također broj novih objava će biti prikazan pored teme.","tracked_categories":"Praćen","tracked_categories_instructions":"Automatski će te pratiti sve teme u ovim kategorijama. Broj novih objava će se pojaviti pored teme.","watched_first_post_categories":"Prva objava","watched_first_post_categories_instructions":"Bit će te obavješteni samo o prvim objavama u svakoj novoj temi u ovim kategorijama.","watched_first_post_tags":"Prva objava","watched_first_post_tags_instructions":"Bit će te obavješteni o prvoj objavi u svakoj novoj temi sa ovim tagovima.","muted_categories":"Utišan","muted_categories_instructions":"Nećete biti obavešteni ni o čemu o novim temama u ovim kategorijama, i neće se pojaviti u kategorijama ili najnovijim stranicama.","muted_categories_instructions_dont_hide":"Nećete biti obaviješteni o novim temama u ovim kategorijama.","regular_categories":"Redovne","no_category_access":"Kao moderator imate ograničen pristup kategoriji, sačuvati je isključeno.","delete_account":"Izbriši moj račun","delete_account_confirm":"Da li ste sigurni da želite zauvijek izbrisati vas račun? Ova radnja je kasnije nepovratna!","deleted_yourself":"Vaš račun je uspješno izbrisan.","delete_yourself_not_allowed":"Molimo da kontaktirate vlasnike web stranice ukoliko želite da izbrišete vaš račun.","unread_message_count":"Poruke","admin_delete":"Izbriši","users":"Korisnici","muted_users":"Utišani","muted_users_instructions":"Suzbijte sve obavijesti i PM-ove od tih korisnika.","allowed_pm_users":"Dopušteno","allowed_pm_users_instructions":"Dozvolite privatne poruke samo od ovih korisnika.","allow_private_messages_from_specific_users":"Dozvolite samo određenim korisnicima da mi šalju privatne poruke","ignored_users":"Ignorisano","ignored_users_instructions":"Suzbijte sve objave, obavijesti i PM-ove od tih korisnika.","tracked_topics_link":"Show","automatically_unpin_topics":"Automatski otkvači temu kada dođem do dna","apps":"Aplikacije","revoke_access":"Oduzmi pristup","undo_revoke_access":"Poništi oduzeti pristup","api_approved":"Odobreno:","api_last_used_at":"Zadnje korišteno kod","theme":"Izgled","save_to_change_theme":"Tema će biti ažurirana nakon što kliknete \"%{save_text}\"","home":"Uobičajena početna stranica","staged":"Priređen","staff_counters":{"flags_given":"pomoćne prijave","flagged_posts":"prijavljene objave","deleted_posts":"obrisane objave","suspensions":"suspenzije","warnings_received":"upozorenja","rejected_posts":"odbijeni postovi"},"messages":{"inbox":"Inbox","latest":"Zadnje","sent":"Poslano","unread":"Nepročitano","new":"Novo","archive":"Arhiva","groups":"Moje grupe","move_to_inbox":"Idi u inbox","move_to_archive":"Arhiva","failed_to_move":"Greška u pomjeranju označenih poruka (vjerovatni mrežni problemi)","tags":"Oznake"},"preferences_nav":{"account":"Račun","security":"Security","profile":"Profil","emails":"Email-i","notifications":"Obavijesti","categories":"Kategorije","users":"Korisnici","tags":"Oznake","interface":"Sučelje","apps":"Aplikacije"},"change_password":{"success":"(email poslat)","in_progress":"(šaljem email)","error":"(greška)","emoji":"zaključavanje emotikona","action":"Pošalji Email za resetovanje šifre","set_password":"Namjesti šifru","choose_new":"Izaberite novu šifru","choose":"Izaberite šifru"},"second_factor_backup":{"regenerate":"Regenerate","disable":"Onemogući","enable":"Omogući","enable_long":"Omogućite rezervne kodove","copy_to_clipboard":"Kopirati u clipboard","copy_to_clipboard_error":"Pogreška pri kopiranju podataka u međuspremnik","copied_to_clipboard":"Kopirano u međuspremnik","download_backup_codes":"Preuzmite kodove baze podataka","use":"Koristi backup kod","codes":{"title":"Generirani sigurnosni kodovi","description":"Svaki od ovih rezervnih kodova može se koristiti samo jednom. Držite ih na sigurnom, ali pristupačnom mjestu."}},"second_factor":{"forgot_password":"Zaboravili ste password?","confirm_password_description":"Molimo vas da potvrdite šifru kako bi nastavili","name":"Ime","label":"Šifra","rate_limit":"Pričekajte prije pokušaja drugog koda za provjeru autentičnosti.","enable_description":"Skenirajte ovaj QR kod u podržanoj aplikaciji ( \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e - \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e ) i unesite kod za provjeru autentičnosti.\n","disable_description":"Molimo da uneste kod za ovjeru autentičnosti sa vaše aplikacije","show_key_description":"Unesi manuelno","short_description":"Zaštitite svoj račun pomoću jednokratnih sigurnosnih kodova.\n","use":"Koristi Authenticator app?","disable":"Onemogući","save":"Sačuvaj","edit":"Izmijeni","enable_security_key_description":"Kada pripremite \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003ehardverski sigurnosni ključ\u003c/a\u003e , pritisnite tipku Registracija u nastavku.\n","totp":{"title":"Autentikatori zasnovani na tokenu","add":"Dodaj provjeru autentičnosti","default_name":"Moj Authenticator","name_and_code_required_error":"Morate navesti ime i kôd iz aplikacije za provjeru autentičnosti."},"security_key":{"register":"Registriraj","title":"Sigurnosni ključevi","add":"Dodaj sigurnosni ključ","default_name":"Glavni sigurnosni ključ","not_allowed_error":"Proces registracije sigurnosnog ključa je ili vremenski istekao ili je odkazan.","already_added_error":"Već ste registrirali ovaj sigurnosni ključ. Ne morate ga ponovno registrirati.","edit":"Izmijeni sigurnosni ključ","save":"Sačuvaj","edit_description":"Ime sigurnosnog ključa","name_required_error":"Morate navesti ime za svoj sigurnosni ključ."}},"change_about":{"title":"Promjeni O meni","error":"Desila se greška prilikom promjene."},"change_username":{"title":"Change Username","confirm":"Da li ste apsolutno sigurni da želite promijeniti svoje korisničko ime?","taken":"Nažalost, to korisničko ime je zauzeto.","invalid":"To korisničko ime nije validno. Mora sadržavati samo brojeve i slova"},"add_email":{"title":"Dodaj e-poštu","add":"Dodaj"},"change_email":{"title":"Promijeni Email","taken":"Nažalost, taj email nije dostupan.","error":"Desila se greška pri promjeni vašeg email-a. Možda se ta email adresa kod nas već koristi?","success":"Poslali smo email na datu email adresu. Molimo vas da tamo slijedite instrukcije za potvrdu aktivacije.","success_staff":"Poslali smo email na vašu trenutnu email adresu. Molimo vas da tamo slijedite instrukcije za potvrdu aktivacije."},"change_avatar":{"title":"Promjeni sliku","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, na temelju","gravatar_title":"Promijenite avatar na %{gravatarName} web stranici","gravatar_failed":"Nismo mogli pronaći %{gravatarName} s tom e-mail adresom.","refresh_gravatar_title":"Osvježite %{gravatarName}","letter_based":"Avatar dodjeljen od sistema","uploaded_avatar":"Vaša slika","uploaded_avatar_empty":"Dodajte vašu sliku","upload_title":"Učitajte vašu sliku sa uređaja","image_is_not_a_square":"Upozorenje: morali smo izrezat vašu sliku; nije bila kvadratnog oblika."},"change_profile_background":{"title":"Profil zaglavlja","instructions":"Profili zaglavlja će biti centrirani i imati standardno širinu od 1110 piksela."},"change_card_background":{"title":"Pozadina Korisničke kartice","instructions":"Pozadinske slike će biti centrirane i imati standard širinu od 590 pixela."},"change_featured_topic":{"title":"Istaknuta tema","instructions":"Link na ovu temu će biti prikazan na vašoj korisničkoj kartici i profilu."},"email":{"title":"Email","primary":"Primarni Email","secondary":"Sekundari Emailovi","primary_label":"primary","unconfirmed_label":"nepotvrđeno","resend_label":"ponovno pošaljite poruku e-pošte s potvrdom","resending_label":"slanje...","resent_label":"e-mail je poslan","update_email":"Promijeni Email","set_primary":"Postavi primarnu e-poštu","destroy":"Ukloni e-poštu","add_email":"Dodaj zamjensku e-poštu","no_secondary":"Nema sekundarnih emailova","instructions":"Nikada nije prikazan javnosti.","ok":"Izgleda dobro. Poslat ćemo email sa potvrdom.","required":"Unesite e-mail adresu","invalid":"Molimo vas da unesete validnu email adresu.","authenticated":"Vaš email je ovjeren od strane %{provider}.","frequency_immediately":"Slati ćemo vam e-mail obavijesti odmah na novo, ukoliko niste pročitali sadržaj koji smo vam prvobitno e-mailom poslali.","frequency":{"one":"Poslaćemo vam email samo u slučaju da vas nismo vidjeli u zadnjoj minuti.","few":"Poslaćemo vam email samo u slučaju da vas nismo vidjeli u zadnje%{count} minute.","other":"Poslaćemo vam email samo u slučaju da vas nismo vidjeli u zadnjih %{count} minuta."}},"associated_accounts":{"title":"Povezani računi","connect":"Poveži","revoke":"Revoke","cancel":"Odustani","not_connected":"(nije povezano)","confirm_modal_title":"Povezani %{provider} račun","confirm_description":{"account_specific":"Vaš %{provider} račun %{account_description} će biti korišten za autentifikaciju.","generic":"Vaš %{provider} račun će biti korišten za prijavu."}},"name":{"title":"Ime","instructions":"vaše puno ime (opciono)","instructions_required":"Vaše puno ime","required":"Unesite ime","too_short":"Vaše ime je prekratko.","ok":"Vaše ime izgleda ok."},"username":{"title":"Nadimak","instructions":"unikatno, bez tipke praznog prostora, kratko","short_instructions":"Ljudi vas mogu spomenuti preko @%{username}.","available":"Vaš nadimak je dostupan.","not_available":"Nije dostupan. Pokušaj %{suggestion}?","not_available_no_suggestion":"Nedostupno","too_short":"Vaše korisničko ime je prekratako.","too_long":"Vaše korisničko ime je predugačko.","checking":"Provjeravamo dostupnost...","prefilled":"Email je već u upotrebi kod ovog korisničkog imena","required":"Unesite korisničko ime"},"locale":{"title":"Jezik sučelja","instructions":"Jezik korisničkog sučelja. Promijenit će se kad ponovo učitate stranicu.","default":"(default)","any":"bilo koje"},"password_confirmation":{"title":"Ponovite šifru"},"invite_code":{"title":"Kod pozivnice","instructions":"Za registraciju računa potreban je Kod pozivnice"},"auth_tokens":{"title":"Nedavno korišteni uređaji","details":"Detalji","log_out_all":"Odjavite sve","not_you":"Ne vi?","show_all":"Prikaži sve (%{count})","show_few":"Prikaži manje","was_this_you":"Jesi li to bio ti?","was_this_you_description":"Ako niste bili vi, preporučujemo vam da promijenite lozinku i odjavite se svuda.","browser_and_device":"%{browser} na %{device}","secure_account":"zaštiti moj račun","latest_post":"Poslednji ste objavili ..."},"last_posted":"Posljednja objava","last_seen":"Viđen","created":"Registrovan","log_out":"Odjavi se","location":"Lokacija","website":"Sajt","email_settings":"Email","hide_profile_and_presence":"Sakrij moje javne profile i funkcije prisutnosti","enable_physical_keyboard":"Omogućite fizičku podršku za tastaturu na iPad-u","text_size":{"title":"Veličina teksta","smallest":"Najmanji","smaller":"Manji","normal":"Normalno","larger":"Veći","largest":"Najveći"},"title_count_mode":{"title":"Naslov pozadinske stranice prikazuje broj:","notifications":"Nove obavijesti","contextual":"Novi sadržaj stranice"},"like_notification_frequency":{"title":"Obavijesti ukoliko se nekome sviđa","always":"Uvijek","first_time_and_daily":"Prvi put kada je objava lajkana i svaki dan","first_time":"Prvi put kada je objava lajkana","never":"Nikad"},"email_previous_replies":{"title":"Uključi predhodne odgovore na objave u dnu e-maila","unless_emailed":"ukoliko nije već poslano","always":"uvijek","never":"nikad"},"email_digests":{"title":"Kada ne posjetim ovdje, pošaljite mi sažetak popularnih tema i odgovora na e-poštu","every_30_minutes":"svakih 30. min","every_hour":"po satu","daily":"dnevno","weekly":"nedeljno","every_month":"svaki mjesec","every_six_months":"svakih šest mjeseci"},"email_level":{"title":"Pošalji mi email kada me neko citira, odgovori na moju objavu, spomene moje korisničko @ime ili pozove me u neku temu","always":"uvijek","only_when_away":"samo kad je odsutan","never":"nikad"},"email_messages_level":"Pošalji mi email kada mi neko pošalje privatnu poruku","include_tl0_in_digests":"Uključi i sadržaj od strane novih korisnika u e-mail Sažetku","email_in_reply_to":"Uključi odlomake sa odgovorenih objava u e-mailovima","other_settings":"Ostalo","categories_settings":"Kategorije","new_topic_duration":{"label":"Posmatraj teme kao nove ukoliko","not_viewed":"nisam ih još pogledao","last_here":"otvoreno odkad sam zadnji put bio tu","after_1_day":"Jučer otvoreno","after_2_days":"otvoreno prije 2 dana","after_1_week":"otvoreno protekle sedmice","after_2_weeks":"otvoreno protekle 2 sedmice"},"auto_track_topics":"Automatski prati teme koje pogledam","auto_track_options":{"never":"nikad","immediately":"odmah","after_30_seconds":"svakih 30. sekundi","after_1_minute":"poslije 1 minute","after_2_minutes":"poslije 2 minute","after_3_minutes":"poslije 3 minute","after_4_minutes":"poslije 4 minute","after_5_minutes":"poslije 5 minuta","after_10_minutes":"poslije 10 minuta"},"notification_level_when_replying":"Kada objavim objavu u temi, postavi tu temu u","invited":{"title":"Pozivnice","pending_tab":"Na čekanju","pending_tab_with_count":"Na čekanju (%{count})","redeemed_tab":"Iskorišteno","redeemed_tab_with_count":"Iskorišteno (%{count})","invited_via":"Pozivnica","groups":"Grupe","topic":"Topic","expires_at":"Ističe","edit":"Izmijeni","remove":"Ukloni","reinvited":"Pozivnica ponovo poslata","search":"kucaj da potražiš pozivnice...","user":"Pozvan korisnik","none":"Nema pozivnica za prikazati","truncated":{"one":"Prikaz prve pozivnice.","few":"Prikaz prvih %{count} pozivnica.","other":"Prikaz prvih %{count} pozivnica."},"redeemed":"Iskorištene pozivnice","redeemed_at":"Iskorišteno","pending":"Pozivnice na čekanju","topics_entered":"Pogledane Teme","posts_read_count":"Pročitane objave","expired":"Ova pozivnica je istekla.","remove_all":"Ukloni istekle pozivnice","removed_all":"Uklonjeni su svi istekli pozivi!","remove_all_confirm":"Jeste li sigurni da želite ukloniti sve pozivnice koje su istekle?","reinvite_all_confirm":"Da li ste sigurni da želite poslati ponovno sve pozivnice?","time_read":"Vrijeme čitanja","days_visited":"Dani posjete","account_age_days":"Starost korisničkog računa u danima","create":"Invite","valid_for":"Link pozvinice je validan jedino za ovu e-mail adresu: %{email}","invite_link":{"title":"Link pozivnice","success":"Link pozivnice je uspješno generisan!","error":"Došlo je do pogreške prilikom generiranja linka za pozivnicu","max_redemptions_allowed_label":"Koliko se ljudi smije registrirati putem ovog linka?","expires_at":"Kada će ovaj link za pozivnicu isteći?"},"bulk_invite":{"text":"Skupna pozivnica","error":"Oprostite, vaš fajl bi trebao biti u CSV formatu."}},"password":{"title":"Lozinka","too_short":"Vaša lozinka je prekratka.","common":"Vaša lozinka je preobična i česta.","same_as_username":"Vaš pasword je isti kao vaše korisničko ime.","same_as_email":"Vaš pasword je isti kao vaš email.","ok":"Vaša lozinka dobro izgleda.","instructions":"minimalno %{count} karaktera","required":"Molimo unesite lozinku"},"summary":{"title":"Sumirano","stats":"Statistike","time_read":"vrijeme čitanja","recent_time_read":"nedavno vrijeme čitanja","topic_count":{"one":"tema otvorena","few":"teme otvorene","other":"tema otvoreno"},"post_count":{"one":"post objavljen","few":"posta objavljena","other":"postova objavljeno"},"likes_given":{"one":"dat","few":"date","other":"dato"},"likes_received":{"one":"primljen","few":"primljene","other":"primljeno"},"days_visited":{"one":"dan posjećeno","few":"dana posjećeno","other":"dana posjećeno"},"topics_entered":{"one":"tema pogledana","few":"teme pogledane","other":"tema pogledano"},"posts_read":{"one":"objava pročitana","few":"objave pročitane","other":"objava pročitano"},"bookmark_count":{"one":"zabilješka","few":"zabilješke","other":"zabilješke"},"top_replies":"Top odgovori","no_replies":"Bez odgovora.","more_replies":"Još odgovora","top_topics":"Top Teme","no_topics":"Nema temi još","more_topics":"Još tema","top_badges":"Top bedževi","no_badges":"Nema još bedževa.","more_badges":"Još bedževa","top_links":"Top linkovi","no_links":"Nema još linkova.","most_liked_by":"Primljen lajk","most_liked_users":"Podijeljen lajk","most_replied_to_users":"Najčešće odgovoreno ka","no_likes":"Još uvijek nema lajkova.","top_categories":"Top kategorije","topics":"Teme","replies":"Postovi"},"ip_address":{"title":"Zadnja IP Adresa"},"registration_ip_address":{"title":"IP Adresa prilikom registracije"},"avatar":{"title":"Profilna slika","header_title":"profil, poruke, zabilješke i postavke"},"title":{"title":"Naslov","none":"(ništa)"},"flair":{"none":"(ništa)"},"primary_group":{"title":"Primary Group","none":"(ništa)"},"filters":{"all":"Sve"},"stream":{"posted_by":"Objavljeno od","sent_by":"Poslato od","private_message":"poruka","the_topic":"tema"}},"loading":"Učitava se...","errors":{"prev_page":"dok pokušava da učita","reasons":{"network":"Network Greška","server":"Server Greška","forbidden":"Pristup Nedostupan","unknown":"Greška","not_found":"Stranica nije pronađena"},"desc":{"network":"Molimo vas da provjerite vašu konekciju.","network_fixed":"Izgleda da je konekcija uredu.","server":"Error code: %{status}","forbidden":"Niste ovlašteni da to pogledate.","not_found":"Ups, aplikacija je pokušala učitati URL koji ne postoji.","unknown":"Nešto je krenulo pogrešno."},"buttons":{"back":"Idi nazad","again":"Pokušaj ponovo","fixed":"Učitaj stranicu"}},"modal":{"close":"zatvori","dismiss_error":"Odbaci grešku"},"close":"Zatvori","logout":"Izlogovani ste.","refresh":"Osvježi","home":"Naslovnica","read_only_mode":{"enabled":"Ovaj sajt je u read only mod-u: Dozvoljeno je čitati. Možete nastaviti sa pregledom, ali odgovaranje na objave, lajkanje i ostale akcije su isključene za sada.","login_disabled":"Ulogovanje je isključeno jer je sajt u read only načinu rada.","logout_disabled":"Odjava je isključena sve dok je sajt u read only tj. samo čitanje je dozvoljeno načinu rada."},"learn_more":"saznaj više...","first_post":"Prva objava","mute":"Utišaj","unmute":"Normalno","last_post":"Zadnja objava","local_time":"Lokalno vrijeme","time_read":"Čitao","time_read_recently":"%{time_read} nedavno","time_read_tooltip":"%{time_read} ukupno vrijeme čitanja","time_read_recently_tooltip":"%{time_read} ukupno vrijeme čitanja (%{recent_time_read} u zadnjih 60 dana)","last_reply_lowercase":"zadnji odgovor","replies_lowercase":{"one":"odgovor","few":"odgovora","other":"odgovora"},"signup_cta":{"sign_up":"Učlani se","hide_session":"Podsjeti me sutra","hide_forever":"ne hvala","intro":"Zdravo! Čini se da uživate u raspravi, ali još se niste prijavili za račun.","value_prop":"Kada stvorite račun, sjećamo se točno onoga što ste pročitali, pa se uvijek vraćate na mjesto gdje ste stali. Također dobivate obavijesti, ovdje i putem e-pošte, kad god vam netko odgovara. I možete lajkati :heartpulse: tuđe postove i reagirati na iste reakcijama."},"summary":{"enabled_description":"Trenutno gledate sažetak ove teme: objave koje drugi članovi smatraju kao najinteresantnije.","enable":"Napravi sažetak ove teme","disable":"Prikaži sve objave"},"deleted_filter":{"enabled_description":"Ova tema sadrži obrisane objave, vidljive za administratore dok su za ostale korisnike skrivene.","disabled_description":"Obrisane objave u temi su prikazane.","enable":"Sakrij obrisane objave","disable":"Prikaži obrisane objave"},"private_message_info":{"title":"Privatna poruka","invite":"Pozovi Ostale...","edit":"Dodaj ili ukloni...","add":"Dodaj","leave_message":"Da li zaista želite da napustite ovu poruku?","remove_allowed_user":"Da li zaista želite da uklonite %{name} sa ove privatne poruke?","remove_allowed_group":"Da li zaista želite da uklonite %{name} sa ove poruke?"},"email":"Email","username":"Ime","last_seen":"Viđen","created":"Stvoreno","created_lowercase":"objavljeno","trust_level":"Nivo povjerenja","search_hint":"ime","create_account":{"header_title":"Dobrodošao!","disclaimer":"Registracijom pristajete na \u003ca href='%{privacy_link}' target='blank'\u003epolitiku privatnosti\u003c/a\u003e i \u003ca href='%{tos_link}' target='blank'\u003euvjete pružanja usluge\u003c/a\u003e .","failed":"Nešto je krenulo pogrešno, možda je ovaj email već iskorišten za registraciju, pokušajte sa Zaboravio šifru linkom"},"forgot_password":{"title":"Resetovanje lozinke","action":"Zaboravio/la šifru?","invite":"Upišite vaš email ili korisničko ime i mi ćemo vam poslati link za resetovanje šifre.","reset":"Resetuj lozinku","complete_username":"Ako se vaš nalog podudara sa korisnikom \u003cb\u003e%{username}\u003c/b\u003e, uskoro ćete primiti email koji će vam objasniti kako da resetujete vašu lozinku.","complete_email":"Ako se vaš nalog podudara sa \u003cb\u003e%{email}\u003c/b\u003e, uskoro ćete primiti email koji će vam objasniti kako da resetujete vašu lozinku.","complete_username_found":"Pronašli smo račun koji se podudara sa korisničkim imenom \u003cb\u003e%{username}\u003c/b\u003e. Trebali bi uskoro dobiti email sa instrukcijama kako da resetujete vaš password.","complete_email_found":"Pronašli smo račun koji se podudara sa \u003cb\u003e%{email}\u003c/b\u003e. Trebali bi uskoro dobiti email sa instrukcijama kako da resetujete vašu lozinku.","complete_username_not_found":"Nema naloga sa korisničkim imenom \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Nema naloga sa email-om \u003cb\u003e%{email}\u003c/b\u003e","help":"E-mail još uvijek ne stiže? Provjerite vaš spam folder u email pregledniku.\u003cp\u003eNiste sigurni koji e-mail ste koristili? Unesite email adresu i mi ćemo vas obavjestiti da li ista postoji ovdje.\u003c/p\u003e\u003cp\u003eUkoliko nemate više pristup ka vašem e-mail računu kojim ste registrovali korisnički nalog, molimo vas da se obratite \u003ca href='%{basePath}/about'\u003enašim administratorima za pomoć.\u003c/a\u003e\u003c/p\u003e","button_ok":"OK","button_help":"Pomoć"},"email_login":{"link_label":"Pošalji mi mejlom moj login link","button_label":"pomoću email-a","emoji":"zaključaj emoji","complete_username":"Ukoliko korisnički račun se podudara sa \u003cb\u003e%{username}\u003c/b\u003e, trebali bi uskoro dobiti email sa linkom za ulogovanje.","complete_email":"Ukoliko korisnički račun se podudara sa \u003cb\u003e%{email}\u003c/b\u003e, trebali bi uskoro dobiti email sa linkom za ulogovanje.","complete_username_found":"Pronašli smo korisnički račun koji se podudara sa \u003cb\u003e%{username}\u003c/b\u003e, trebali bi uskoro dobiti email sa linkom za ulogovanje.","complete_email_found":"Pronašli smo korisnički račun koji se podudara sa \u003cb\u003e%{email}\u003c/b\u003e, trebali bi uskoro dobiti email sa linkom za ulogovanje.","complete_username_not_found":"Ne postoji korisnički račun koji se podudara sa \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Ne postoji korisnički račun koji se podudara sa \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Nastavi ka %{site_name}","logging_in_as":"Prijavite se kao %{email}","confirm_button":"Završi prijavu"},"login":{"username":"Korisnik","password":"Lozinka","second_factor_description":"Molimo da unesete kod za ovjeru autentičnosti sa vaše aplikacije:","second_factor_backup":"Loguj se koristeći backup kod","second_factor_backup_description":"Molim ukucajte jedan od vaši rezevni kodova","second_factor":"Loguj se koristeći Authenticator app","security_key_description":"Kada ste pripremili vaš fizički sigurnosni ključ, pritisnite ispod dugme Autentifikacija pomoću sigurnosnog ključa.","security_key_alternative":"Pokušaj na drugi način","security_key_authenticate":"Autentifikacija sa sigurnosnim ključem","security_key_not_allowed_error":"Ovaj proces prijave pomoću sigurnosnog ključa je ili vremenski istekao ili je odkazan.","security_key_no_matching_credential_error":"Nisu pronađeni korisnički podatci koristeći navedeni sigurnosni ključ.","security_key_support_missing_error":"Vaš trenutni uređaj ili preglednik ne podržava korištenje sigurnosnih ključeva. Molimo koristite drugačiju metodu.","caps_lock_warning":"Uključena su vam velika slova","error":"Nepoznata greška","cookies_error":"Čini se da je vaš preglednik onemogućio cookies. Možda se nećete moći prijaviti bez da ih prvo omogućite.","rate_limit":"Molimo vas pričekajte prije ponovnog logovanja.","blank_username":"Molimo vas da unesete vaš email ili ime korisničkog računa.","blank_username_or_password":"Molimo vas da unesete vaš email ili ime korisničkog računa, i šifru.","reset_password":"Resetuj lozinku","logging_in":"Prijavljivanje...","or":"Or","authenticating":"Autorizacija...","awaiting_activation":"Vaš korisnički račun čeka aktivaciju, koristite Zaboravio šifru link kako bi dobili novi email sa aktivacijkim linkom.","awaiting_approval":"Vaš korisnički račun nije još uvijek odobren od strane administratora. Dobiti ćete email kada bude zvanično aktiviran.","requires_invite":"Žalimo, pristup ka forumu imaju samo članovi koji su primili pozivnicu.","not_activated":"Još uvijek se ne možete ulogovati. Prethodno smo vam poslali email za aktivaciju korisničkog računa na email \u003cb\u003e%{sentTo}\u003c/b\u003e. Molimo da tamo pratite instrukcije za aktivaciju vašeg računa.","admin_not_allowed_from_ip_address":"Ne možete se logirati kao admin sa te IP adrese.","resend_activation_email":"Kliknite ovdje kako bi poslali ponovo email za aktivaciju korisničkog računa.","resend_title":"Pošalji ponovo email aktivacije","change_email":"Promijeni email adresu","provide_new_email":"Unesite novu adresu i mi ćemo vam ponovo poslati email potvrde","submit_new_email":"Ažuriraj email adresu","sent_activation_email_again":"We sent another activation email to you at \u003cb\u003e%{currentEmail}\u003c/b\u003e. It might take a few minutes for it to arrive; be sure to check your spam folder.","sent_activation_email_again_generic":"Poslali smo još jean e-mail za aktivaciju. Može potrajati nekoliko minuta da stigne; obavezno proverite svoj spam folder.","to_continue":"Molimo prijavite se","preferences":"Morate biti ulogovani kako bi mjenjali vaše postavke","not_approved":"Vaš korisnički račun nije još uvijek odobren od strane administratora. Dobiti ćete email kada dobijete mogućnost da se ulogirate.","google_oauth2":{"name":"Google","title":"koristeći Google"},"twitter":{"name":"Twitter","title":"koristeći Twitter"},"instagram":{"name":"Instagram","title":"koristeći Instagram"},"facebook":{"name":"Facebook","title":"koristeći Facebook"},"github":{"name":"GitHub","title":"koristeći GitHub"},"discord":{"name":"Discord","title":"koristeći Discord"},"second_factor_toggle":{"totp":"Umjesto toga koristite aplikaciju za provjeru autentičnosti","backup_code":"Umjesto toga koristite sigurnosni kod"}},"invites":{"accept_title":"Pozivnica","welcome_to":"Dobrodošli na %{site_name}!","invited_by":"Pozvani ste od:","social_login_available":"Također ćete se moći prijaviti s bilo kojim društvenim profilom pomoću te e-pošte.","your_email":"Email vašeg korisničkog računa je \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Prihvati pozivnicu","success":"Vaš račun je napravljen i sada ste prijavljeni.","name_label":"Ime","password_label":"Lozinka","optional_description":"(opciono)"},"password_reset":{"continue":"Nastavi ka %{site_name}"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Samo kategorije","categories_with_featured_topics":"Kategorije s istaknutim temama","categories_and_latest_topics":"Kategorije i zadnje teme","categories_and_top_topics":"Kategorije i top teme","categories_boxes":"Kutije sa podkategorijama","categories_boxes_with_topics":"Kutije sa istaknutim temama"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Naprijed"},"conditional_loading_section":{"loading":"Obrađuje..."},"select_kit":{"delete_item":"Izbriši %{name}","default_header_text":"Označava...","no_content":"Nije pronađen traženi pojam","filter_placeholder":"Pretraga...","filter_placeholder_with_any":"Pretražite ili kreirajte ...","create":"Kreiraj: '%{content}'","max_content_reached":{"one":"Možete označiti samo %{count} predmet.","few":"Možete označiti samo %{count} predmeta.","other":"Možete označiti samo %{count} predmeta."},"min_content_not_reached":{"one":"Označi bar %{count} predmet.","few":"Označi bar %{count} predmeta.","other":"Označi bar %{count} predmeta."}},"date_time_picker":{"from":"Od","to":"Ka"},"emoji_picker":{"filter_placeholder":"Pretraži emotikone","smileys_\u0026_emotion":"Smeješci i osječaj","people_\u0026_body":"Ljudi i Tijelo","animals_\u0026_nature":"Životinje i Priroda","food_\u0026_drink":"Hrana i Piće","travel_\u0026_places":"Putovanje i Mijesta","activities":"Aktivnosti","objects":"Objekti","symbols":"Simboli","flags":"Prijave","recent":"Skoro korišteno","default_tone":"Bez tona","light_tone":"Svijetli ton","medium_light_tone":"Srednje svijetli ton","medium_tone":"Srednji ton","medium_dark_tone":"Srednje tamni ton","dark_tone":"Tamni ton","default":"Sopstveni emotikoni"},"shared_drafts":{"title":"Dijeljene skice","destination_category":"Kategorija destinacije","publish":"Objavi dijeljenu skicu","confirm_publish":"Da li ste sigurni da želite objaviti ovu skicu?","publishing":"Objavljujem temu..."},"composer":{"emoji":"Emotikoni :)","more_emoji":"više...","options":"Opcije","whisper":"šapat","unlist":"nelistan","add_warning":"Ovo je zvanično upozorenje.","toggle_whisper":" Prekidač za Šapat","toggle_unlisted":"Prekidač za Listan","posting_not_on_topic":"Na koju temu želite da odgovorite?","saved_local_draft_tip":"sačuvano lokalno","similar_topics":"Tvoja tema je slična...","drafts_offline":"skicirano lokalno","edit_conflict":"uredi sukob","group_mentioned":{"one":"Spominjući %{group}, obavijestiti će te %{count} korisnika – da li ste sigurni?","few":"Spominjući %{group}, obavijestiti će te \u003ca href='%{group_link}'\u003e%{count} korisnika\u003c/a\u003e – da li ste sigurni?","other":"Spominjući %{group}, obavijestiti će te \u003ca href='%{group_link}'\u003e%{count} korisnika\u003c/a\u003e – da li ste sigurni?"},"cannot_see_mention":{"category":"Spomenuli ste %{username} ali isti neće biti obavješteni zbog toga što nemaju pristup ovoj kategoriji. Morate ih dodati u Grupu koja ima pristup ka ovoj kategoriji.","private":"Spomenuli ste %{username}, no oni neće biti obaviješteni jer ne mogu vidjeti ovu osobnu poruku. Morat ćete ih pozvati da se pridruže ovoj privatnoj poruci."},"duplicate_link":"Izgleda da vaš link ka \u003cb\u003e%{domain}\u003c/b\u003e je već objavljen u temi od strane \u003cb\u003e@%{username}\u003c/b\u003e u\u003ca href='%{post_url}'\u003eodgovoru prije %{ago}\u003c/a\u003e – da li ste sigurni da želite ponovno objaviti link?","reference_topic_title":"RE:%{title}","error":{"title_missing":"Naslov je obavezan","post_missing":"Objava ne može biti prazna","try_like":"Dail ste pokušali%{heart}dugme?","category_missing":"Morate odabrati kategoriju","topic_template_not_modified":"Molimo da dodate detalje i specifikacije za vašu temu tako što ćete izmijeniti template teme."},"save_edit":"Sačuvaj izmjene","overwrite_edit":"Overwrite Edit","reply_original":"Odgovori na Originalnu temu","reply_here":"Odgovori Ovdje","reply":"Odgovori","cancel":"Odustani","create_topic":"Pokreni temu","create_pm":"Kreiraj Privatnu Poruku","create_whisper":"Šapat","create_shared_draft":"Kreiraj dijeljenu skicu","edit_shared_draft":"Izmijeni dijeljenu skicu","title":"Ili pritisni Ctrl+Enter","users_placeholder":"Dodaj člana","title_placeholder":"O čemu je ova diskusija u jednoj rečenici?","title_or_link_placeholder":"Ukucajte naziv, ili zalijepite link ovdje","edit_reason_placeholder":"zašto pravite izmjenu?","topic_featured_link_placeholder":"Unesite link prikazan sa nazivom","remove_featured_link":"Odstranite link sa teme.","reply_placeholder":"Ovdje unesite vaš tekst. Koristite Markdown, BBcode ili HTML kako bi formatirali vaš tekst. Za postavljanje slika, sliku prevucite ili zalijepite u ovo polje.","reply_placeholder_no_images":"Ovdje kucate tekst odgovor-a. Koristite Markdown, BBCode, ili HTML za formatiranje teksta.","reply_placeholder_choose_category":"Odlućite kategoriju prije nego ovdije pišete","view_new_post":"Pogledaj svoj novi post.","saving":"Spašavam","saved":"Sačuvano!","saved_draft":"Sastav je u toku. Tipkajte kako bi nastavili dalje.","uploading":"Uplodujem...","quote_post_title":"Citiraj cjeli post","bold_label":"B","bold_title":"Bold","bold_text":"bold tekst","italic_label":"I","italic_title":"Ukošen","italic_text":"ukošen tekst","link_title":"Link","link_description":"ubaci opis linka","link_dialog_title":"Unesi Link","link_optional_text":"naslov neobavezan","blockquote_title":"Citiranje","blockquote_text":"Citiranje","code_title":"Formatiran Tekst","code_text":"Unapred formatirani tekst za 4 razmaka","paste_code_text":"ukucaj ili zalijepi kod ovdje","upload_title":"Učitavanje","upload_description":"unesi opis učitanog","olist_title":"Numerisana lista","ulist_title":"Obična lista","list_item":"Listaj predmet","toggle_direction":"Prekidač smijera","help":"Pomoć za Markdown","collapse":"smanji panel za sastavljanje teksta","open":"otvorite panel za kompozitor","abandon":"zatvori panel za sastav teksta i odkaži skicu teksta","enter_fullscreen":"unesite fullscreen composer","exit_fullscreen":"izlaz iz fullscreen kompozitora","modal_ok":"OK","modal_cancel":"Odustani","cant_send_pm":"Neuspješno, ne možete slati poruke ka %{username}.","yourself_confirm":{"title":"Da li ste zaboravili da dodate primaoca?","body":"Trenutno ova poruka biješe poslana samo vama!"},"admin_options_title":"Opcione postavke za ovu temu","composer_actions":{"reply":"Odgovori","draft":"Nacrt","edit":"Izmijeni","reply_to_post":{"desc":"Odgovori na ciljani post"},"reply_as_new_topic":{"label":"Odgovori kao linkana tema","desc":"Kreiraj novu temu linkanu na ovu temu"},"reply_as_private_message":{"label":"Nova poruka","desc":"Kreiraj novu personalnu poruku"},"reply_to_topic":{"label":"Odgovori na temu","desc":"Odgovori na temu, ne ciljajući na neku posebnu objavu"},"toggle_whisper":{"label":"Uključi Šapat","desc":"Šapati su vidljivi samo administratorima"},"create_topic":{"label":"Nova tema"},"shared_draft":{"label":"Dijeljena skica"},"toggle_topic_bump":{"label":"Toggle topic bump","desc":"Odgovori bez izmjene zadnjeg datuma odgovora"}},"ignore":"Zanemari","details_title":"Sažetak","details_text":"Ovaj tekst će biti sakriven"},"notifications":{"tooltip":{"regular":{"one":"%{count} nepregledana obavijest","few":"%{count} nepregledane obavijesti","other":"%{count} neviđenih obavijesti"},"message":{"one":"%{count} nepročitana poruka","few":"%{count} nepročitane poruke","other":"%{count} nepročitanih poruka"}},"title":"obaviještenja na spominjanje @korisničkog-imena, odgovori na vaše teme i postove, privatne poruke, i sl.","none":"Nemate obavijesti trenutno.","empty":"Nema obavještenja.","post_approved":"Vaš post je odobren","reviewable_items":"stvari koje zahtijevaju pregled","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} ostali\u003c/span\u003e %{description}","few":"\u003cspan class='multi-user'\u003e%{username}, %{username2} i ostalih %{count}\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} i ostalih %{count} \u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"vam se svidio %{count} vaših postova","few":"vam se svidio %{count} vaših postova","other":"vam se svidio %{count} vaših postova"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e je prihvatio vašu pozivnicu","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e je pomjerio %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Zasluženo '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNova tema\u003c/span\u003e %{description}","reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","group_message_summary":{"one":"%{count} poruka u vašem %{group_name} sandučiću","few":"%{count} poruke u vašem %{group_name} sandučiću","other":"%{count} poruka u vašem %{group_name} sandučiću"},"popup":{"mentioned":"%{username} vas je spomenuo/la u \"%{topic}\" - %{site_title}","group_mentioned":"%{username} vas je spomenuo/la u \"%{topic}\" - %{site_title}","quoted":"%{username} vas je citirao/la u \"%{topic}\" - %{site_title}","replied":"%{username} vam je odgovorio/la u \"%{topic}\" - %{site_title}","posted":"%{username} je objavio/la \"%{topic}\" - %{site_title}","private_message":"%{username} vam je poslao/la poruku u \"%{topic}\" - %{site_title}","linked":"%{username} je linkao/la vašu objavu \"%{topic}\" - %{site_title}","watching_first_post":"%{username} je kreirao novu temu \"%{topic}\" - %{site_title}","confirm_title":"Obavijesti uključene - %{site_title}","confirm_body":"Uspješno! Obavijesti su sada uključene.","custom":"Obavijest od %{username} na %{site_title}"},"titles":{"mentioned":"spomenuto","replied":"novi odgovor","quoted":"citirano","edited":"promjenjeno","liked":"novi like","private_message":"nova privatna poruka","invited_to_private_message":"pozvan u privatnu poruku","invitee_accepted":"poziv prihvaćen","posted":"novi post","moved_post":"post maknut","linked":"linked","granted_badge":"dodijeljena značka","invited_to_topic":"pozvan na temu","group_mentioned":"grupa spomenula","group_message_summary":"nove grupne poruke","watching_first_post":"nova tema","topic_reminder":"podsjetnik na temu","liked_consolidated":"novi lajkovi","post_approved":"post odobreno"}},"upload_selector":{"uploading":"Učitavam","select_file":"Izaberi fajl","default_image_alt_text":"slika"},"search":{"sort_by":"Sortiraj po","relevance":"Bitnost","latest_post":"Zadnja objava","latest_topic":"Zadnja tema","most_viewed":"Najviše pogledano","most_liked":"Najviše sviđanja","select_all":"Izaberi sve","clear_all":"Očisti sve","too_short":"Vaš termin za pretragu je prekratak.","result_count":{"one":"\u003cspan\u003e%{count} rezultat za\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","few":"\u003cspan\u003e%{count}%{plus} resultata za\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} rezultata za\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"pretražite teme, objave, korisnike ili kategorije","full_page_title":"pretraži teme ili objave","no_results":"Nema rezultata.","no_more_results":"Nema rezultata pretrage.","post_format":"#%{post_number} od %{username}","results_page":"Pretraži za termin '%{term}'","more_results":"Postoji više rezultata pretrage. Molimo suzite kriterij pretrage.","cant_find":"Ne možete naći ono što tražite?","start_new_topic":"Možda da započnete novu temu?","or_search_google":"Ili umjesto toga probaj pretražiti pomoću Google-a:","search_google":"Probaj umjesto toga pretražiti pomoću Google-a:","search_google_button":"Google","search_button":"Pretraži","context":{"user":"Traži postove od @%{username}","category":"Traži #%{category} kategoriju","topic":"Pretraži ovu temu","private_messages":"Pretraži poruke"},"advanced":{"title":"Napredno pretraživanje","posted_by":{"label":"Objavljeno od"},"in_category":{"label":"Kategorizirano"},"in_group":{"label":"U grupi"},"with_badge":{"label":"Sa bedžom"},"with_tags":{"label":"Označen"},"filters":{"label":"Vrati samo teme/postove...","title":"Podudaranje samo u naslovu","likes":"Sviđalo mi se","posted":"Moje objave","created":"Lično pokrenute","watching":"Posmatrane","tracking":"Praćene","private":"U mojim porukama","bookmarks":"Zabilježio/la sam","first":"su friške prve objave","pinned":"su zakačene","seen":"Koje sam čitao/la","unseen":"Nepročitane","wiki":"su wiki","images":"uključujući slike","all_tags":"Sve gore navedene oznake"},"statuses":{"label":"Gdje teme","open":"su otvorene","closed":"su zatvorene","public":"su javne","archived":"su arhivirane","noreplies":"imaju nula odgovora","single_user":"sadrži jednog korisnika"},"post":{"count":{"label":"Objave"},"time":{"label":"Objavljeno","before":"prije","after":"poslije"}},"views":{"label":"Pogledano"}}},"hamburger_menu":"idi ka drugoj temi, listi ili kategoriji","new_item":"novo","go_back":"go back","not_logged_in_user":"user page with summary of current activity and preferences","current_user":"go to your user page","topics":{"new_messages_marker":"zadnja posjeta","bulk":{"select_all":"Označi sve","clear_all":"Očisti sve","unlist_topics":"Skini teme sa liste","relist_topics":"Listaj teme","reset_read":"Reset Read","delete":"Obriši teme","dismiss":"Odbaci","dismiss_read":"Odbaci sve nepročitane","dismiss_button":"Odbaci...","dismiss_tooltip":"Odbaci samo nove objave ili stopiraj praćenje tema","also_dismiss_topics":"Prestani pratiti ove teme tako da se ubuduće za mene nikad ne prikazuju kao nepročitane ","dismiss_new":"Odpusti Nove","toggle":"preklopi masovno označavanje tema","actions":"Masovno odrađene akcije","close_topics":"Zatvori teme","archive_topics":"Arhiviraj teme","move_messages_to_inbox":"Idi u inbox","choose_new_category":"Izaberi novu kategoriju za temu:","selected":{"one":"Označili ste \u003cb\u003e%{count}\u003c/b\u003e temu.","few":"Označili ste \u003cb\u003e%{count}\u003c/b\u003e teme.","other":"Označili ste \u003cb\u003e%{count}\u003c/b\u003e teme."},"change_tags":"Zamijeni oznake","append_tags":"Pripoji oznake","choose_new_tags":"Odaberi nove tagove za ove teme:","choose_append_tags":"Odaberi nove oznake kako bi pripojili ovim temama:","changed_tags":"Tagovi ovih tema su izmijenjeni."},"none":{"unread":"Nemate nepročitanih tema.","new":"Nemate novih tema.","read":"Niste pročitali nijednu temu.","posted":"Niste odgovorili ni na jednu temu.","bookmarks":"Još nemate zabilježenih tema.","category":"Nema tema u %{category}.","top":"Nema top tema."},"bottom":{"latest":"Nema više aktuelnih tema.","posted":"There are no more posted topics.","read":"Nema više pročitanih tema.","new":"Nema više novih tema.","unread":"Nema više nepročitanih tema.","category":"Nema više %{category} tema.","tag":"Nema više %{tag} tema.","top":"Nema više top tema.","bookmarks":"U zabilješkama više nema spremljenih tema."}},"topic":{"filter_to":{"one":"%{count} objava u temi","few":"%{count} objave u temi","other":"%{count} objava u temi"},"create":"Nova tema","create_long":"Otvori novu temu","open_draft":"Otvori skicu","private_message":"Piši poruku","archive_message":{"help":"Premjesti poruku u vašu arhivu","title":"Arhiva"},"move_to_inbox":{"title":"Premjesti u Sanduče","help":"Premjesti poruke nazad u Sanduče"},"edit_message":{"help":"Izmijeni prvu objavu ove poruke","title":"Izmijeni"},"defer":{"help":"Označi kao nepročitano","title":"Defer"},"list":"Teme","new":"nova tema","unread":"nepročitana","new_topics":{"one":"%{count} nova tema","few":"%{count} nove teme","other":"%{count} nove teme"},"unread_topics":{"one":"%{count} nepročitana tema","few":"%{count} nepročitane teme","other":"%{count} nepročitane teme"},"title":"Tema","invalid_access":{"title":"Tema je privatna","description":"Nažalost, trenutno nemate pristup toj temi!","login_required":"Morate se ulogovati kako bi vidjeli tu temu."},"server_error":{"title":"Učitavanje teme nije uspjelo","description":"Nažalost, nismo u mogućnosti učitati tu temu, moguće zbog problema sa konekcijom. Molimo da pokušate ponovo. Ako je problem i dalje prisutan, a nije do konekcije onda molimo vas da nam to prijavite."},"not_found":{"title":"Tema nije pronađena","description":"Nažalost, nismo pronašli tu temu. Možda je uklonjena od strane moderatora?"},"unread_posts":{"one":"imate %{count} nepročitanu objavu u ovoj temi","few":"imate %{count} nepročitane objave u ovoj temi","other":"imate %{count} nepročitanih objava u ovoj temi"},"likes":{"one":"postoji %{count} sviđanje u ovoj temi","few":"postoji %{count} sviđanja u ovoj temi","other":"postoji %{count} sviđanja u ovoj temi"},"back_to_list":"Vrati se na Listu Tema","options":"Opcije Teme","show_links":"pokaži linkove unutar ove teme","read_more_in_category":"Želite dalje čitati? Pregledajte druge teme u %{catLink} ili %{latestLink}.","read_more":"Želite li dalje čitati? %{catLink} Ili %{latestLink}.","browse_all_categories":"Pregledaj sve kategorije","view_latest_topics":"pogledaj najnovije teme","jump_reply_up":"jump to earlier reply","jump_reply_down":"jump to later reply","deleted":"Ova tema je obrisana","slow_mode_update":{"enable":"Omogući","remove":"Onemogući"},"topic_status_update":{"title":"Trajanje teme","save":"Podesi tajmer","num_of_hours":"Broj sati:","remove":"Ukloni tajmer","publish_to":"Objavi u:","when":"Kada:","time_frame_required":"Odaberite vremenski okvir"},"auto_update_input":{"none":"Označi vremenski period","later_today":"Na kraju dana","tomorrow":"Sutra","later_this_week":"Kasnije ove sedmice","this_weekend":"Ovog vikenda","next_week":"Sljedeće sedmice","next_month":"Sljedeći mjesec","forever":"Zauvijek","pick_date_and_time":"Odaberi datum i vrijeme","set_based_on_last_post":"Zatvori koristeći za bazu zadnju objavu"},"publish_to_category":{"title":"Vremenski organizuj objavljivanje"},"temp_open":{"title":"Privremeno otvori"},"temp_close":{"title":"Privremeno zatvori"},"auto_close":{"title":"Automatski zatvori temu","error":"Molim unesite ispravnu vrijednost.","based_on_last_post":"Ne zatvaraj temu sve dok zadnja objava u temi nije barem ovoliko stara."},"auto_delete":{"title":"Automatski izbriši temu"},"auto_bump":{"title":"Auto-Bump tema"},"reminder":{"title":"Podsjeti me"},"status_update_notice":{"auto_open":"Ova tema će biti automatski otvorena za %{timeLeft}","auto_close":"Ova tema će biti automatski zatvorena za %{timeLeft}","auto_publish_to_category":"Ova tema će biti objavljena u \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e za %{timeLeft}.","auto_close_after_last_post":"Ova tema će se biti zatvorena %{duration} nakon zadnjeg odgovora.","auto_delete":"Ova tema će biti automatski izbrisana za %{timeLeft}","auto_bump":"Ova tema će biti automatski bumped %{timeLeft}.","auto_reminder":"Bit će te obaviješteni o ovoj temi za %{timeLeft}"},"auto_close_title":"Auto-Close Settings","auto_close_immediate":{"one":"Zanja objava u ovoj temi je već %{count} sat stara, stoga će tema biti odmah zatvorena.","few":"Zanja objava u ovoj temi je već sati %{count} stara, stoga će tema biti odmah zatvorena.","other":"Zanja objava u ovoj temi je već %{count} sati stara, stoga će tema biti odmah zatvorena."},"timeline":{"back":"Nazad","back_description":"Vratite se nazad na vašu zadnju nepročitanu objavu","replies_short":"%{current} / %{total}"},"progress":{"title":"progres teme","go_top":"vrh","go_bottom":"dno","go":"idi","jump_bottom":"idi na posljednju objavu","jump_prompt":"skoči na...","jump_prompt_long":"Skoči na ...","jump_bottom_with_number":"skoči na post %{post_number}","jump_prompt_to_date":"do datuma","jump_prompt_or":"ili","total":"ukupan broj","current":"trenutni post"},"notifications":{"title":"izmijenite učestalost dobijanja obavještenja o ovoj temi","reasons":{"mailing_list_mode":"Imate uključenu mail listu, stoga će te biti obavještavani o odgovorima na ovu temu preko e-maila.","3_10":"Dobijat će te obavijesti jer pratite tag na ovoj temi.","3_6":"Dobijat ćete notifikacije zato što motrite ovu temu.","3_5":"Dobijat ćete notifikacije zato što motrite temu automatski.","3_2":"Dobijat ćete notifikacije zato što pratite ovu temu.","3_1":"Dobijat ćete notifikacije zato što ste kreirali ovu temu.","3":"Dobijat ćete notifikacije zato što motrite ovu temu.","2_8":"Vidjet ćete broj novih odgovora jer pratite ovu kategoriju.","2_4":"Vidjet ćete broj novih odgovora jer ste objavili odgovor na ovu temu.","2_2":"Vidjet ćete broj novih odgovora jer pratite ovu temu.","2":"You will see a count of new replies because you \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eread this topic\u003c/a\u003e.","1_2":"Dobiti ćete obavijest kada neko spomene tvoje @korisničko-ime ili odgovori na tvoj post.","1":"Dobiti ćete obavjest kada neko spomene tvoje @korisničko-ime ili odgovori na tvoj post.","0_7":"Ignorišete sve notifikacije u ovoj kategoriji.","0_2":"Ignorišete sve notifikacije u ovoj temi.","0":"Ignorišete sve notifikacije u ovoj temi."},"watching_pm":{"title":"Motrenje","description":"Bit ćete obavješteni o svakom novom odgovoru u ovoj poruci, te će biti prikazan broj novih odgovora."},"watching":{"title":"Motrenje","description":"Bit će te obavješteni o svakom novom odgovoru na ovu temu, te će biti prikazan broj novih odgovora."},"tracking_pm":{"title":"Praćenje","description":"Broj novih odgovora biti će prikazan za ovu poruku. Biti ćete objaviješteni ako vas netko spomene koristeći @korisničko-ime ili vam odgovori."},"tracking":{"title":"Praćenje","description":"Na ovu će temu biti prikazan broj novih odgovora. Bit ćete obaviješteni ako neko spomene vaše @korisničko-ime ili vam odgovori."},"regular":{"title":"Normalno","description":"Dobiti ćete obavjest kada neko spomene tvoje @korisničko-ime ili odgovori na tvoj post."},"regular_pm":{"title":"Normalno","description":"Dobiti ćete obavijest kada neko spomene tvoje @korisničko-ime ili odgovori na tvoj post."},"muted_pm":{"title":"Utišano","description":"You will never be notified of anything about this private message."},"muted":{"title":"Utišano","description":"Nećete biti nikad obavješteni o bilo čemu sa ove teme, i neće biti prikazana u Zadnje"}},"actions":{"title":"Akcije","recover":"Un-Delete Topic","delete":"Obriši temu","open":"Open Topic","close":"Zatvori temu","multi_select":"Odaberi postove...","timed_update":"Podesi tajmer teme...","pin":"Prikvači temu…","unpin":"Otkvači temu","unarchive":"Vrati temu iz arhiva","archive":"Arhiviraj temu","invisible":"Ukloni temu s popisa","visible":"Make Listed","reset_read":"Reset Read Data","make_private":"Pretvori u privatnu poruku","reset_bump_date":"Resetuj datum bumpa"},"feature":{"pin":"Zakvači temu","unpin":"Otkvači temu","pin_globally":"Zakvači temu globalno","remove_banner":"Odstrani Banner temu"},"reply":{"title":"Odgovori","help":"počni sastavljati odgovor za ovu temu"},"share":{"title":"Dijeli","extended_title":"Dijeli link","help":"podjeli link do ove teme","invite_users":"Invite"},"print":{"title":"Print","help":"Otvori printersku verziju ove teme"},"flag_topic":{"title":"Prijavi","help":"anonimno prijavi ovu temu ili pošalji privatnu notifikaciju","success_message":"Uspješno ste prijavili ovu temu."},"make_public":{"title":"Pretvori u javnu temu","choose_category":"Odaberite kategoriju za javnu temu:"},"feature_topic":{"title":"Istakni ovu temu.","pin":"Neka se ova tema pojavi na vrhu kategorije %{categoryLink} do","unpin":"Uklonite ovu temu s vrha kategorije %{categoryLink}.","unpin_until":"Uklonite ovu temu s vrha %{categoryLink} kategorije ili pričekajte \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Korisnici mogu otkvačiti temu pojedinačno za sebe.","pin_validation":"Za prikvačivanje ove teme potreban je datum.","not_pinned":"Nema zakvačenih tema u %{categoryLink}.","already_pinned":{"one":"Tema trenutno zakvačena u %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"Teme trenutno zakvačene u %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Tema trenutno zakačenih u %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Postavi ovu temu da se prikazuje na vrhu svih lista tema sve do","unpin_globally":"Uklonite ovu temu sa vrha svih lista tema.","unpin_globally_until":"Odklonite ovu temu sa vrha svih lista tema ili sačekajte do \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Korisnici mogu sami individualno za sebe ukloniti okačku sa teme.","not_pinned_globally":"Nema tema okačenih globalno.","already_pinned_globally":{"one":"Tema trenutno zakačena globalno: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"Teme trenutno zakačene globalno: \u003cstrong class='badge badge-notification unread'\u003e%{count} \u003c/strong\u003e","other":"Tema trenutno zakačeno globalno: \u003cstrong class='badge badge-notification unread'\u003e %{count} \u003c/strong\u003e"},"make_banner":"Postavi ovu temu kao banner koji se pojavljuje na vrhu svih stranica.","remove_banner":"Uklonite banner koji se pojavljuje u vrhu svih stranica.","banner_note":"Korisnici mogu odkloniti banner tako što će ga zatvoriti. U svakom momentu samo jedna tema može biti postavljena za banner.","no_banner_exists":"Nema banner tema.","banner_exists":"Trenutno \u003cstrong class='badge badge-notification unread'\u003epostoji\u003c/strong\u003e banner tema."},"inviting":"Inviting...","automatically_add_to_groups":"Ova pozivnica uključuje također i pristup ka sljedećim grupama:","invite_private":{"title":"Invite to Private Message","email_or_username":"Invitee's Email or Username","email_or_username_placeholder":"email address or username","action":"Invite","success":"We've invited that user to participate in this private message.","success_group":"Pozvali ste čitavu tu grupu da učestvuje u raspavi u ovoj poruci.","error":"Sorry, there was an error inviting that user.","group_name":"group name"},"controls":"Kontrole na temi","invite_reply":{"title":"Pozivnica","username_placeholder":"korisničko ime","action":"Email pozivnica","help":"pošalji pozivnicu svojim prijateljima tako da i oni mogu odgovoriti na ovu temu. Bey registracije.","discourse_connect_enabled":"Unesite korisničko ime osobe koju želite da pozovete u ovu temu.","to_topic_blank":"Unesite korisničko ime ili e-mail adresu osobe koju želite da pozovete u ovu temu.","to_topic_email":"Unijeli ste e-mail adresu. Poslat ćemo e-mailom pozivnicu koja će omogućiti vašem prijatelju da odmah odgovori na ovu temu.","to_topic_username":"Unijeli ste korisničko ime. Na isto ćemo poslati obavještenje sa linkom pozivnice na ovu temu.","to_username":"Unesite korisničko ime osobe koju želite pozvati. Poslati ćemo obavještenje sa linkom pozivnice na ovu temu.","email_placeholder":"name@example.com","success_email":"Poslali smo e-mailom pozivnicu ka \u003cb\u003e%{invitee}\u003c/b\u003e. Obavjestiti ćemo vas kada pozivnica bude iskorištena. Provjerite tab pozivnica na vašoj profilnoj stranici kako bi ste upratili sve vaše pozivnice.","success_username":"Pozvali smo tog korisnika da prisustvuje u ovoj temi.","error":"Sorry, we couldn't invite that person. Perhaps they are already a user?","success_existing_email":"Korisnik sa emailom \u003cb\u003e%{emailOrUsername}\u003c/b\u003e već postoji. Pozvali smo tog korisnika da se pridruži u raspravi na ovu temu."},"login_reply":"Prijavite se da biste odgovorili","filters":{"n_posts":{"one":"%{count} objava","few":"%{count} objave","other":"%{count} objava"},"cancel":"Show all posts in this topic again."},"move_to":{"title":"Idi kod","action":"idi kod","error":"Došlo je do greške prilikom premještanja postova."},"split_topic":{"title":"Move to New Topic","action":"move to new topic","topic_name":"Novi naslov teme","radio_label":"Nova tema","error":"There was an error moving posts to the new topic.","instructions":{"one":"Kreirati će te novu temu i popuniti je sa objavom koju ste označili.","few":"Kreirati će te novu temu i popuniti je sa \u003cb\u003e%{count}\u003c/b\u003e objave koje ste označili.","other":"Kreirati će te novu temu i popuniti je sa \u003cb\u003e%{count}\u003c/b\u003e objava koje ste označili."}},"merge_topic":{"title":"Move to Existing Topic","action":"move to existing topic","error":"There was an error moving posts into that topic.","radio_label":"Postojeća tema","instructions":{"one":"Molimo da odaberete temu u koju će te pomjeriti tu objavu.","few":"Molimo da odaberete temu u koju će te pomjeriti \u003cb\u003e%{count}\u003c/b\u003e objave.","other":"Molimo da odaberete temu u koju će te pomjeriti \u003cb\u003e%{count}\u003c/b\u003e objava."}},"move_to_new_message":{"title":"Premjesti u novu poruku","action":"pređite na novu poruku","message_title":"Novi Naslov Poruke","radio_label":"Nova poruka","participants":"Učesnici","instructions":{"one":"Namjeravate kreirati novu poruku i popuniti je odabranim postom.","few":"\u003cb\u003eNameravate\u003c/b\u003e da kreirate novu poruku i popunite je sa \u003cb\u003e%{count} postavkama\u003c/b\u003e koje ste izabrali.","other":"\u003cb\u003eNameravate\u003c/b\u003e da kreirate novu poruku i popunite je sa \u003cb\u003e%{count} postavkama\u003c/b\u003e koje ste izabrali."}},"move_to_existing_message":{"title":"Premjesti u postojeću poruku","action":"premjestite se na postojeću poruku","radio_label":"Existing Message","participants":"Učesnici","instructions":{"one":"Odaberite poruku u koju želite premjestiti taj post.","few":"Molimo odaberite poruku u koju želite premjestiti postove \u003cb\u003e%{count}\u003c/b\u003e .","other":"Molimo odaberite poruku u koju želite premjestiti postove \u003cb\u003e%{count}\u003c/b\u003e ."}},"merge_posts":{"title":"Spoji izabrane postove","action":"spoji izabrane postove","error":"Desila se greška prilikom spajanja označenih objava."},"publish_page":{"public":"Javno"},"change_owner":{"title":"Change Owner","action":"change ownership","error":"There was an error changing the ownership of the posts.","placeholder":"username of new owner","instructions":{"one":"Molimo odaberite novog vlasnika za post od \u003cb\u003e@ %{old_user}\u003c/b\u003e","few":"Molimo odaberite novog vlasnika za %{count} postove od \u003cb\u003e@ %{old_user}\u003c/b\u003e","other":"Molimo odaberite novog vlasnika za %{count} postove od \u003cb\u003e@ %{old_user}\u003c/b\u003e"}},"change_timestamp":{"title":"Promijeni vrijeme objave...","action":"izmijeni vrijeme","invalid_timestamp":"Vrijeme ne može biti u budućnosti.","error":"Došlo je do greške prilikom izmjene vremena teme.","instructions":"Odaberite novi datum i vrijeme otvaranja teme. Objave u temi će se jednako ažurirat prema istom vremenskom razmaku."},"multi_select":{"select":"select","selected":"selected (%{count})","select_post":{"label":"označi","title":"Dodaj objavu u označeno"},"selected_post":{"label":"označeno","title":"Klikni kako bi odstranio objavu iz označenog"},"select_replies":{"label":"označi +odgovore","title":"Odaberi objavu i sve njene odgovore"},"select_below":{"label":"označi +ispod","title":"Odaberi objavu i sve ispod nje"},"delete":"delete selected","cancel":"cancel selecting","select_all":"select all","deselect_all":"deselect all","description":{"one":"Označili ste \u003cb\u003e%{count}\u003c/b\u003e objavu.","few":"Označili ste \u003cb\u003e%{count}\u003c/b\u003eobjave.","other":"Označili ste \u003cb\u003e%{count}\u003c/b\u003e objava."}}},"post":{"quote_reply":"Citiraj","quote_share":"Dijeli","edit_reason":"Razlog: ","post_number":"post %{number}","ignored":"Ignorisani sadržaj","reply_as_new_topic":"Odgovori kroz novu povezanu Temu","reply_as_new_private_message":"Odgovori kao nova poruka istim primaocima","continue_discussion":"Nastavak diskusije od teme %{postLink}:","follow_quote":"idi na citiran post","show_full":"Prikaži cijelu objavu","show_hidden":"Prikaz zanemarenog sadržaja.","collapse":"spusti","expand_collapse":"digni/spusti","locked":"administrator je zaključao ovu objavu za nove izmjene","gap":{"one":"pogledaj %{count} skriven odgovor","few":"pogledaj %{count} skrivena odgovora","other":"pogledaj %{count} skrivenih odgovora"},"notice":{"new_user":"Ovo je prvi put da je %{user} objavio - pozdravimo ih u našoj zajednici!","returning_user":"Prošlo je dosta vremena od kada smo vidjeli %{user} - njihov zadnji post je bio %{time}."},"unread":"Post je nepročitan","has_replies":{"one":"%{count} Odgovor","few":"%{count} Odgovora","other":"%{count} Odgovora"},"has_likes_title":{"one":"Objava se sviđa %{count} osobi","few":"%{count} se sviđa objava","other":"%{count} se sviđa objava"},"has_likes_title_only_you":"sviđa vam se ova objava","has_likes_title_you":{"one":"tebi i još %{count} se sviđa objava","few":"tebi i još %{count} se sviđa objava","other":"tebi i još %{count} se sviđa objava"},"errors":{"create":"Sorry, there was an error creating your post. Please try again.","edit":"Sorry, there was an error editing your post. Please try again.","upload":"Sorry, there was an error uploading that file. Please try again.","file_too_large":"Nažalost, ta datoteka je prevelika (maksimalna veličina je %{max_size_kb}kb). Zašto ne biste prenijeli vašu veliku datoteku na uslugu dijeljenja u oblaku, a zatim zalijepili vezu?","too_many_uploads":"Sorry, you can only upload one file at a time.","upload_not_authorized":"Nažalost, fajl koji pokušavate da učitate nije dozvoljen za učitavanje (dozvoljene ekstenzije su: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Sorry, new users can not upload images.","attachment_upload_not_allowed_for_new_user":"Sorry, new users can not upload attachments.","attachment_download_requires_login":"Sorry, you need to be logged in to download attachments."},"cancel_composer":{"discard":"Odbaci"},"via_email":"this post arrived via email","via_auto_generated_email":"ova objava je došla preko automatski generisanog email-a","whisper":"ova objava je privatni šapat za moderatore ","wiki":{"about":"ova objava je wiki"},"few_likes_left":"Hvala za dijeljenje ljubavi! Za danas vam je ostalo samo nekoliko lajkova.","controls":{"reply":"počni da sastavljaš odgovor na ovaj post","like":"Lajkuj objavu","has_liked":"sviđa vam se ova objava","undo_like":"poništi sviđanje","edit":"izmjeni ovaj post","edit_action":"Izmijeni","edit_anonymous":"Sorry, but you need to be logged in to edit this post.","flag":"anonimno prijavi ovaj post ili pošalji privatnu notifikaciju","delete":"obriši ovaj post","undelete":"povrati obrisan post","share":"podijeli link do ovog posta","more":"Još","delete_replies":{"confirm":"Da li želite također da obrišete i odgovore na ovu objavu?","direct_replies":{"one":"Da, i %{count} direktni odgovor","few":"Da, i %{count} direktna odgovora","other":"Da, i %{count} direktnih odgovora"},"all_replies":{"one":"Da, i %{count} odgovor","few":"Da, i sva %{count} odgovora","other":"Da, i svih %{count} odgovora"},"just_the_post":"Ne, samo ovu objavu"},"admin":"post admin actions","wiki":"Učini zajedničkom, wiki objavom","unwiki":"Remove Wiki","convert_to_moderator":"Dodaj boje moderatora","revert_to_regular":"Ukloni boje osoblja","rebake":"Popravi HTML","unhide":"Unhide","lock_post":"Zaključaj objavu","lock_post_description":"spriječi objavljivača ove objave da izmijeni objavu","unlock_post":"Odključaj objavu","unlock_post_description":"dozvoli objavljivaču da izmijeni ovu objavu","delete_topic_disallowed_modal":"Nemate dozvolu za brisanje ove teme. Ako zaista želite da bude obrisan, pošaljite kaznu za pažnju moderatora zajedno s obrazloženjem.","delete_topic_disallowed":"nemate dozvolu za brisanje ove teme","delete_topic":"obriši temu","remove_timer":"ukloni tajmer"},"actions":{"people":{"like":{"one":"ovo se dopalo","few":"ovo se dopalo","other":"ovo se dopalo"},"like_capped":{"one":"i još %{count} drugoj osobi se ovo svidjelo","few":"i još %{count} drugim osobama se ovo svidjelo","other":"i još %{count} drugim osobama se ovo svidjelo"}},"by_you":{"off_topic":"Prijavili ste ovo kao iskakanje iz okvira teme (off-topic)","spam":"Prijavili ste ovo kao spam","inappropriate":"Prijavili ste ovo kao neprimjereno","notify_moderators":"Prijavili ste ovo za korigovanje od strane moderatora","notify_user":"You sent a private message to this user"}},"delete":{"confirm":{"one":"Jeste li sigurni da želite izbrisati taj post?","few":"Jeste li sigurni da želite izbrisati one postove %{count}?","other":"Jeste li sigurni da želite izbrisati one postove %{count}?"}},"merge":{"confirm":{"one":"Jeste li sigurni da želite spojiti te postove?","few":"Jeste li sigurni da želite spojiti te postove %{count}?","other":"Jeste li sigurni da želite spojiti te postove %{count}?"}},"revisions":{"controls":{"first":"First revision","previous":"Previous revision","next":"Next revision","last":"Last revision","hide":"Sakrij reviziju","show":"Show revision","revert":"Vrati se na reviziju %{revision}","edit_wiki":"Promjni Wiki","edit_post":"Izmjeni objavu","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Show the rendered output with additions and removals inline","button":"HTML"},"side_by_side":{"title":"Show the rendered output diffs side-by-side","button":"HTML"},"side_by_side_markdown":{"title":"Show the raw source diffs side-by-side","button":"Raw"}}},"raw_email":{"displays":{"raw":{"title":"Prikaži sirov e-mail","button":"Trulo"},"text_part":{"title":"Prikažite tekstualni dio e-pošte","button":"Poruka"},"html_part":{"title":"Prikažite html dio e-maila","button":"HTML"}}},"bookmarks":{"create":"Stvaranje zabilješke","edit":"Izmijeni zabilješku","created":"Stvoreno","updated":"Ažurirano","name":"Ime","name_placeholder":"Za što služi ova zabilješka?","set_reminder":"Podsjeti me","options":"Opcije","actions":{"delete_bookmark":{"name":"Obriši zabilješku","description":"Uklanja zabilješku sa vašeg profila i zaustavlja sve podsjetnike za zabilješku"},"edit_bookmark":{"name":"Izmijeni zabilješku","description":"Izmjena naziva zabilješke ili promjena datuma i vremena podsjetnika"}}}},"category":{"none":"(no category)","all":"Sve kategorije","choose":"kategorij i pomoć","edit":"Izmijeni","edit_dialog_title":"promjeni: %{categoryName}","view":"View Topics in Category","general":"General","settings":"Postavke","topic_template":"Tematski predložak","tags":"Oznake","tags_allowed_tags":"Ograničite ove oznake na ovu kategoriju:","tags_allowed_tag_groups":"Ograničite ove grupe oznaka na ovu kategoriju:","tags_placeholder":"(Opcionalno) lista dozvoljenih oznaka","tag_groups_placeholder":"(Opcionalno) lista dozvoljenih grupa oznaka","allow_global_tags_label":"Takođe dozvolite druge oznake","topic_featured_link_allowed":"Omogućite istaknute veze u ovoj kategoriji","delete":"Delete Category","create":"Nova kategorija","create_long":"Napravite novu kategoriju","save":"Save Category","slug":"Kategorija Slug","slug_placeholder":"(Opcionalno) isprekidane riječi za url","creation_error":"There has been an error during the creation of the category.","save_error":"There was an error saving the category.","name":"Category Name","description":"Description","logo":"Category Logo Image","background_image":"Category Background Image","badge_colors":"Badge colors","background_color":"Background color","foreground_color":"Foreground color","name_placeholder":"One or two words maximum","color_placeholder":"Any web color","delete_confirm":"Are you sure you want to delete this category?","delete_error":"There was an error deleting the category.","list":"List Categories","no_description":"Please add a description for this category.","change_in_category_topic":"Edit Description","already_used":"This color has been used by another category","security":"Security","permissions":{"group":"Grupa","see":"Vidi","reply":"Odgovori","create":"napravi"},"special_warning":"Upozorenje: Ova kategorija je pre-seeded kategorija i sigurnosne postavke se ne mogu uređivati. Ako ne želite koristiti ovu kategoriju, izbrišite je umjesto da je prenamijenite.","images":"Images","email_in":"Custom incoming email address:","email_in_allow_strangers":"Accept emails from anonymous users with no accounts","email_in_disabled":"Posting new topics via email is disabled in the Site Settings. To enable posting new topics via email, ","email_in_disabled_click":"enable the \"email in\" setting.","mailinglist_mirror":"Kategorija odražava mailing listu","show_subcategory_list":"Prikaži listu podkategorija iznad tema u ovoj kategoriji.","subcategory_num_featured_topics":"Broj istaknutih tema na stranici roditeljske kategorije:","all_topics_wiki":"Neka nove teme budu wikiji kao zadano","subcategory_list_style":"Stil podkategorije:","sort_order":"Lista tema Sortiraj po:","default_view":"Podrazumevana lista tema:","default_top_period":"Obićni Top Period:","allow_badges_label":"Allow badges to be awarded in this category","edit_permissions":"Edit Permissions","review_group_name":"group name","require_topic_approval":"Potrebno je odobrenje moderatora za sve nove teme","require_reply_approval":"Potrebno je odobrenje moderatora za sve nove odgovore","this_year":"this year","position":"Pozicija na stranici kategorije:","default_position":"Default Position","position_disabled":"Categories will be displayed in order of activity. To control the order of categories in lists, ","position_disabled_click":"enable the \"fixed category positions\" setting.","minimum_required_tags":"Minimalni broj oznaka potrebnih za temu:","parent":"Parent Category","num_auto_bump_daily":"Broj otvorenih tema koje se svakodnevno automatski izbijaju:","navigate_to_first_post_after_read":"Idite na prvi post nakon što se teme pročitaju","notifications":{"watching":{"title":"Motrenje"},"watching_first_post":{"title":"Pratiti prve objave","description":"Bićete obaviješteni o novim temama u ovoj kategoriji, ali ne i odgovorima na teme."},"tracking":{"title":"Praćenje"},"regular":{"title":"Normalno","description":"Dobiti ćete obavjest kada neko spomene tvoje @korisničko-ime ili odgovori na tvoj post."},"muted":{"title":"Utišano"}},"search_priority":{"label":"Prioritet pretraživanja","options":{"normal":"Normalno","ignore":"Zanemari","very_low":"Jako nisko","low":"Nisko","high":"Visoko","very_high":"Jako Visoko"}},"sort_options":{"default":"obićno","likes":"Sviđanja","op_likes":"Likovi Orginalnog Posta","views":"Pogledano","posts":"Objava","activity":"Aktivnosti","posters":"Posteri","category":"Kategorija","created":"Stvoreno"},"sort_ascending":"Diže se","sort_descending":"Spužđšta se","subcategory_list_styles":{"rows":"Redovi","rows_with_featured_topics":"Redovi sa istaknutim temama","boxes":"Kutije","boxes_with_featured_topics":"Kutije sa istaknutim temama"},"settings_sections":{"general":"General","moderation":"Moderacija","appearance":"Izgled","email":"Email"}},"flagging":{"title":"Zašto prijavljujete ovaj post?","action":"Prijavi objavu","take_action_options":{"default":{"title":"Poduzmi Akciju","details":"Dođite odmah do praga za oznake, umjesto da čekate još oznaka od zajednice."},"suspend":{"title":"Suspend User"},"silence":{"title":"Stišaj korisnika"}},"notify_action":"Privatna Poruka","official_warning":"Oficonalno upozorenje","delete_spammer":"Obriši Spamera","yes_delete_spammer":"Da, Obriši Spamera","ip_address_missing":"(N/A)","hidden_email_address":"(hidden)","submit_tooltip":"Predaj privatnu prijavu","take_action_tooltip":"Dođite odmah do praga za oznake, umjesto da čekate još oznaka od zajednice.","cant":"Nažalost, trenutno ne možete prijaviti ovu objavu","notify_staff":"Obavijesti privatno moderatora foruma","formatted_name":{"off_topic":"Van teme je","inappropriate":"Neprimjereno je","spam":"Ovo je Spam"},"custom_placeholder_notify_user":"Zašto ovaj post nalaže da kontaktirate korisnika privatno. Budite detaljni, pristojni i korektni.","custom_placeholder_notify_moderators":"Zašto ovaj post zaslužuje pažnju moderatora. Navedite vaš razlog po mogućnosti ostavite link ako je nužno.","custom_message":{"at_least":{"one":"unesite bar %{count} znak","few":"unesite najmanje %{count} znakova","other":"unesite najmanje %{count} znakova"},"more":{"one":"%{count} to go ...","few":"%{count} to go ... \\ t","other":"%{count}preostalo..."},"left":{"one":"%{count} preostalo","few":"%{count} preostalo","other":"%{count} preostalo"}}},"flagging_topic":{"title":"Hvala što pomažete održavati našu zajednicu pristojnom.","action":"Prijavi temu","notify_action":"Privatna poruka"},"topic_map":{"title":"Pregled Teme","participants_title":"Često objavljuju","links_title":"Popularni linkovi","links_shown":"prikaži više poveznica...","clicks":{"one":"%{count} click","few":"%{count} klika","other":"%{count} klika"}},"post_links":{"about":"prikaži više poveznica za ovu objavu","title":{"one":"još %{count}","few":"%{count} više","other":"%{count} više"}},"topic_statuses":{"warning":{"help":"Ovo je zvanično upozorenje."},"bookmarked":{"help":"Zabilježili ste ovu temu"},"locked":{"help":"Ova tema je zatvorena; zvanično ne prima nove postove"},"archived":{"help":"Ova je tema arhivirana; zamrznuta je i ne može se mijenjati."},"locked_and_archived":{"help":"Ova tema je zatvorena i arhivirana; više ne prihvaća nove odgovore i ne može se mijenjati"},"unpinned":{"title":"Unpinned","help":"Ova vam je tema odkvačena, prikazivati će se u standardnom redoslijedu."},"pinned_globally":{"title":"Zakačena Globalno","help":"Tema je postavljena globalo; bit će prikazana u vrhu za Zadnje i u vrhu za njenu kategoriju"},"pinned":{"title":"Zakačena","help":"Ova tema je zakačena; prikazivati će se na vrhu svoje kategorije"},"unlisted":{"help":"Ovu temu sajt ne lista među najnovijim temama. Neće biti prisutna ni među listama tema unutar kategorija. Jedini način da se dođe do ove teme je direktan link"},"personal_message":{"title":"Ova tema je lična poruka","help":"Ova tema je lična poruka"}},"posts":"Odgovori","original_post":"Originalni Odgovor","views":"Pregledi","views_lowercase":{"one":"pregled","few":"pregleda","other":"pregleda"},"replies":"Odgovori","views_long":{"one":"ova tema je pregledana %{count} put","few":"ova tema je %{number} puta pregledana","other":"ova tema je %{number} puta pogledana"},"activity":"Aktivnost","likes":"Lajkovi","likes_lowercase":{"one":"sviđanje","few":"sviđanja","other":"sviđanja"},"users":"Korisnici","users_lowercase":{"one":"korisnik","few":"korisnika","other":"korisnika"},"category_title":"Kategorija","changed_by":"od %{author}","raw_email":{"title":"Dolazna email","not_available":"Nije dostupno!"},"categories_list":"Lista Kategorija","filters":{"with_topics":"%{filter} teme","with_category":"%{filter} %{category} teme","latest":{"title":"Zadnje","title_with_count":{"one":"Zadnja (%{count})","few":"Zadnje (%{count})","other":"Zadnje (%{count})"},"help":"teme sa nedavnim postovima"},"read":{"title":"Čitam","help":"teme koje ste pročitali, zadnje pročitane na vrhu."},"categories":{"title":"Kategorije","title_in":"Kategorija - %{categoryName}","help":"sve teme grupisane po kategoriji"},"unread":{"title":"Nepročitano","title_with_count":{"one":"Nepročitano (%{count})","few":"Nepročitano (%{count})","other":"Nepročitano (%{count})"},"help":"teme koje trenutno pratite i motrite sa nepročitanim postovima","lower_title_with_count":{"one":"%{count} nepročitana","few":"%{count} nepročitane","other":"%{count} nepročitanih"}},"new":{"lower_title_with_count":{"one":"%{count} novi","few":"%{count} nova","other":"%{count} novih"},"lower_title":"nova","title":"Novo","title_with_count":{"one":"Novo (%{count})","few":"Novo (%{count})","other":"Novo (%{count})"},"help":"teme stvorene u zadnjih par dana"},"posted":{"title":"Moje objave","help":"teme u kojima imate postove"},"bookmarks":{"title":"Zabilješke","help":"teme koje ste zabilježili"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","few":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"zadnje teme u %{categoryName} kategoriji"},"top":{"title":"Top teme","help":"najaktivnije teme u zadnjih godinu, mjesec, sedmicu i dan","all":{"title":"Oduvijek"},"yearly":{"title":"Godišnje"},"quarterly":{"title":"Kvartalno"},"monthly":{"title":"Mjesečno"},"weekly":{"title":"Sedmično"},"daily":{"title":"Dnevno"},"all_time":"Oduvijek","this_year":"Godina","this_quarter":"Kvartal","this_month":"Mjesec","this_week":"Sedmica","today":"Danas"}},"permission_types":{"full":"Kreiraj / Odgovori / Vidi","create_post":"Odgovori / Vidi","readonly":"Vidi"},"lightbox":{"download":"skini","previous":"Prošlo (Tipka sa strelicom lijevo)","next":"Sljedeće (tipka sa strelicom udesno)","counter":"%curr% od %total%","close":"Zatvori (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eSadržaj\u003c/a\u003e nije moguće učitati.","image_load_error":"\u003ca href=\"%url%\"\u003eSlika\u003c/a\u003e se ne može učitati."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", \\ T","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} ili %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1} / %{shortcut2}","title":"Kratice tipkovnice","jump_to":{"title":"Skoči na","home":"%{shortcut} Početak","latest":"%{shortcut} Zadnje","new":"%{shortcut} Nove Teme","unread":"%{shortcut} Nepročitane","categories":"%{shortcut} Kategorije","top":"%{shortcut} Na vrh","bookmarks":"%{shortcut} Zabilješke","profile":"%{shortcut} Profil","messages":"%{shortcut} Porka","drafts":"%{shortcut}Skica","previous":"%{shortcut} Prethodna tema"},"navigation":{"title":"Navigacija","jump":"%{shortcut} Idi na post #","back":"%{shortcut} Nazad","up_down":"%{shortcut} Move selection \u0026uarr; \u0026darr;","open":"%{shortcut} Open selected topic","next_prev":"%{shortcut} Next/previous section","go_to_unread_post":"%{shortcut} Idi na prvu nepročitanu poruku"},"application":{"title":"Aplikacija","create":"%{shortcut} Otvori novu temu","notifications":"%{shortcut} Otvori notifikacije","hamburger_menu":"%{shortcut} Otvori padajući meni","user_profile_menu":"%{shortcut} Otvori meni korisnika","show_incoming_updated_topics":"%{shortcut} Pročitaj promjenje teme","search":"%{shortcut} Traži","help":"%{shortcut} Otvori pomoć za tastaturu","dismiss_topics":"%{shortcut} Dismiss Topics","log_out":"%{shortcut} Odjavi se"},"composing":{"title":"komppziranje","return":"%{shortcut} Povratak kompozitoru","fullscreen":"%{shortcut} Kompozitor preko cijelog ekrana"},"bookmarks":{"title":"Zabilježavanje","enter":"%{shortcut} Sačuvaj i zatvori","later_today":"%{shortcut} Danas","later_this_week":"%{shortcut} Ove sedmice","tomorrow":"%{shortcut} Sutra","next_week":"%{shortcut} Sledeće sedmice","next_month":"%{shortcut} Sledećeg meseca","next_business_week":"%{shortcut} Početak naredne sedmice","next_business_day":"%{shortcut} Sledeći radni dan","custom":"%{shortcut} Odabrani datum i vrijeme","none":"%{shortcut} Bez podsjetnika","delete":"%{shortcut} Izbriši zabilješku"},"actions":{"title":"Akcije","bookmark_topic":"%{shortcut} Stavi/Ukloni zabilješku","pin_unpin_topic":"%{shortcut} Zakvači/odkvači temu","share_topic":"%{shortcut} Podijeli temu","share_post":"%{shortcut} Podijeli post","reply_as_new_topic":"%{shortcut} Odgovori kroz novu temu","reply_topic":"%{shortcut} Odgovori na Temu","reply_post":"%{shortcut} Odgovori na post","quote_post":"%{shortcut} Citiraj odgovor","like":"%{shortcut} Lajkuj post","flag":"%{shortcut} Prijavi objavu","bookmark":"%{shortcut} Zabilježi objavu","edit":"%{shortcut} Izmjeni post","delete":"%{shortcut} Obriši post","mark_muted":"%{shortcut} Mutiraj temu","mark_regular":"%{shortcut} Regularna tema","mark_tracking":"%{shortcut} Prati temu","mark_watching":"%{shortcut} Motri temu","print":"%{shortcut} Odštampaj temu","defer":"%{shortcut} Defer temu","topic_admin_actions":"%{shortcut} Otvori opcije administriranja teme"},"search_menu":{"title":"Meni za pretragu","prev_next":"%{shortcut} Pomjeri odabir prema gore ili dolje","insert_url":"%{shortcut} Umetnite odabir u otvoreni skladatelj"}},"badges":{"earned_n_times":{"one":"Zaradio / la sam ovu oznaku %{count} time","few":"Zaradili ste ovu oznaku %{count} puta","other":"Zaradili ste ovu oznaku %{count} puta"},"granted_on":"Odobren %{date}","others_count":"Ostale sa ovom značkom (%{count}) \\ t","title":"Bedž","allow_title":"Ovu značku možete koristiti kao naslov","multiple_grant":"To možete zaraditi više puta","badge_count":{"one":"%{count} Badge","few":"%{count} Značke","other":"%{count} Značkih"},"more_badges":{"one":"+ Još %{count}","few":"+ Još %{count}","other":"+ Još %{count}"},"granted":{"one":"%{count} odobreno","few":"%{count} odobreno","other":"%{count} odobreno"},"select_badge_for_title":"Izaveri bedž za svoj naslov","none":"(ništa)","successfully_granted":"Uspješno dodijeljen %{badge} za %{username}","badge_grouping":{"getting_started":{"name":"Početak"},"community":{"name":"Zajednica"},"trust_level":{"name":"Nivo povjerenja"},"other":{"name":"Ostalo"},"posting":{"name":"Objavljivanje"}}},"tagging":{"all_tags":"Sve oznake","other_tags":"Druge oznake","selector_all_tags":"sve oznake","selector_no_tags":"bez oznaka","changed":"oznake  promijenjene:","tags":"Oznake","choose_for_topic":"neobavezne oznake","info":"Informacija","category_restricted":"Ova oznaka je predodređena za kategorije na koje nemate pravo pristupa.","synonyms":"Sinonimi","synonyms_description":"U slučaju da se sljedeće oznake koriste, iste će biti zamijenjene sa \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Ovaj tag pripada grupi \"%{tag_groups}\".","few":"Ovaj tag pripada sljedećim grupama: %{tag_groups}.","other":"Ova oznaka pripada sljedećim grupama: %{tag_groups}."},"category_restrictions":{"one":"Moguće je koristiti samo u sljedećoj kategoriji:","few":"Moguće je koristiti samo u sljedećim kategorijama:","other":"Moguće je koristiti samo u sljedećim kategorijama:"},"edit_synonyms":"Uredi sinonime","add_synonyms_label":"Dodaj sinonime:","add_synonyms":"Dodaj","add_synonyms_explanation":{"one":"Svaka lokacija koja trenutno koristi ovu oznaku bit će zamjenjena sa \u003cb\u003e%{tag_name}\u003c/b\u003e. Jeste li sigurni da želite izvršiti tu promjenu?","few":"Svaka lokacija koja trenutno koristi ove oznake bit će zamjenjena sa \u003cb\u003e%{tag_name}\u003c/b\u003e. Jeste li sigurni da želite izvršiti tu promjenu?","other":"Svaka lokacija koja trenutno koristi ove oznake bit će zamjenjena sa \u003cb\u003e%{tag_name}\u003c/b\u003e. Jeste li sigurni da želite izvršiti tu promjenu?"},"add_synonyms_failed":"Sljedeće oznake nije moguće dodati kao sinonime: \u003cb\u003e%{tag_names}\u003c/b\u003e. Osigurajte prvo da nemaju već postojeće sinonime i da nisu sinonimi neke druge oznake.","remove_synonym":"Odstrani sinonim","delete_synonym_confirm":"Jeste li sigurni da želite izbrisati sinonim \"%{tag_name}\"?","delete_tag":"Izbriši oznaku","delete_confirm":{"one":"Jeste li sigurni da želite izbrisati ovu oznaku i ukloniti je iz teme %{count} kojoj je dodijeljen?","few":"Jeste li sigurni da želite izbrisati ovu oznaku i ukloniti je iz tema %{count} kojima je dodijeljena?","other":"Jeste li sigurni da želite izbrisati ovu oznaku i ukloniti je iz tema %{count} kojima je dodijeljena?"},"delete_confirm_no_topics":"Jeste li sigurni da želite izbrisati ovu oznaku?","delete_confirm_synonyms":{"one":"Pripadajući sinonim će također biti obrisan.","few":"Pripadajućih %{count} sinonima će također biti obrisano.","other":"Pripadajućih %{count} sinonima će također biti obrisano."},"rename_tag":"Promjeni ime Oznake","rename_instructions":"Odaberite novo ime za oznaku:","sort_by":"Sortiraj po:","sort_by_count":"brojenje","sort_by_name":"ime","manage_groups":"Upravljanje grupama oznaka","manage_groups_description":"Definišite grupe za organizovanje oznaka","upload":"Prenesi oznake","upload_description":"Otpremite csv datoteku da biste grupisali oznake","upload_instructions":"Jedan po liniji, opciono sa oznakom grupe u formatu 'tag_name, tag_group'.","upload_successful":"Oznake koje su uspješno prenesene","delete_unused_confirmation":{"one":"%{count} tag će biti izbrisan: %{tags}","few":"Oznake %{count} će biti izbrisane: %{tags}","other":"%{count} oznaki će biti izbrisane: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} i još %{count}","few":"%{tags} i još %{count}","other":"%{tags} i još %{count}"},"delete_no_unused_tags":"Nema neiskorištenih oznaka.","delete_unused":"Brisanje neiskorištenih oznaka","delete_unused_description":"Izbrišite sve oznake koje nisu vezane za teme ili lične poruke","cancel_delete_unused":"Odustani","filters":{"without_category":"%{filter} %{tag} topics","with_category":"%{filter} %{tag} teme ove kategorije %{category}","untagged_without_category":"%{filter} ne oznaćene tema","untagged_with_category":"%{filter} neoznačene teme ove kategorije %{category}"},"notifications":{"watching":{"title":"Motrenje","description":"Automatski ćete gledati sve teme s ovom oznakom. Bićete obaviješteni o svim novim postovima i temama, plus broj nepročitanih i novih postova će se pojaviti pored teme."},"watching_first_post":{"title":"Pratiti prve objave","description":"Bićete obaviješteni o novim temama u ovoj oznaci, ali ne io odgovorima na teme."},"tracking":{"title":"Praćenje","description":"Automatski ćete pratiti sve teme s ovom oznakom. Broj nepročitanih i novih postova će se pojaviti pored teme."},"regular":{"title":"Normalno","description":"Bit ćete obaviješteni ako netko spominje vaše @korisničko-ime ili odgovori na vaš post."},"muted":{"title":"Utišan","description":"Nećete bit obavješteni bilo čime o ovoj temi sa ovom oznakom, i neće se pojavljivati na tabularu nepročitanih tema."}},"groups":{"title":"Označite grupe","new":"Nova grupa ","tags_label":"Oznake u ovoj grupi","parent_tag_label":"Roditeljska oznaka","one_per_topic_label":"Ograničite jednu oznaku po temi iz ove grupe","new_name":"Nova Grupa Oznaka","name_placeholder":"Ime","save":"Sačuvaj","delete":"Delete","confirm_delete":"Jeste li sigurni da želite izbrisati ovu grupu oznaka?","everyone_can_use":"Oznake mogu koristiti svi"},"topics":{"none":{"unread":"Nemate više nepročitanih tema.","new":"Nemate više novih tema.","read":"Niste pročitali nijednu temu.","posted":"Niste odgovorili ni na jednu temu.","latest":"Nema više aktuelnih tema.","bookmarks":"Još nemate zabiljženih tema.","top":"Nema više top tema."}}},"invite":{"custom_message":"Učinite vašu pozivnicu malo osobnijom tako što ćete napisati \u003ca href\u003eprilagođenu poruku\u003c/a\u003e .","custom_message_placeholder":"Unesite prilagođenu poruku","custom_message_template_forum":"Hej, trebalo bi da se pridružiš ovom forumu!","custom_message_template_topic":"Hej, mislio sam da ćete uživati u ovoj temi!"},"forced_anonymous":"Zbog ekstremnog opterećenja, ovo se privremeno prikazuje svima, jer bi ga odjavio korisnik.","footer_nav":{"back":"Prethodno","forward":"Naprijed","share":"Podijeli","dismiss":"Odpusti"},"safe_mode":{"enabled":"Bezbedan režim je omogućen, da biste izašli iz bezbednog režima, zatvorite ovaj prozor pregledača"},"image_removed":"(slika uklonjena)","do_not_disturb":{"remaining":"%{remaining} preostalo","options":{"custom":"Custom"}},"trust_levels":{"names":{"newuser":"novi korisnik","basic":"korisnik","member":"član","regular":"pokretač","leader":"vođa"}},"cakeday":{"today":"Today","tomorrow":"Sutra","all":"Sve"},"details":{"title":"Sakrij detalje"},"discourse_local_dates":{"relative_dates":{"today":"Danas %{time}","tomorrow":"Sutra %{time}","yesterday":"Jučer %{time}","countdown":{"passed":"datum je prošao"}},"title":"Unesi datum / vrijeme","create":{"form":{"insert":"Unesi","advanced_mode":"Napredni način","simple_mode":"Jednostavan način","timezones_title":"Vremenske zone za prikazati","timezones_description":"Vremenske zone će biti korištene kako bi prikazale datume u pregledu i u nazad.","recurring_title":"Vraćanje","recurring_description":"Definiši ponavljanje eventa. Možete također menuelno izmijeniti opcije ponavljanja generisanih od strane foruma i koristiti jedan od sljedećih ključeva: godine, kvartali, mjeseci, sedmice, dani, sati, minute, sekunde, milisekunde.","recurring_none":"Bez ponavljanja","invalid_date":"Neispravan datum, osigurajte da su datum i vrijeme tačni","date_title":"Datum","time_title":"Vrijeme","format_title":"Format datuma","timezone":"Vremenska zona","until":"Sve do...","recurring":{"every_day":"Svaki dan","every_week":"Svake sedmice","every_two_weeks":"Svake dvije sedmice","every_month":"Svaki mjesec","every_two_months":"Svaka dva mjeseca","every_three_months":"Svaka tri mjeseca","every_six_months":"Svakih šest mjeseci","every_year":"Svake godine"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Odpočni tutorial za nove korisnike za sve novoregistrovane korisnike","welcome_message":"Pošalji svim novim korisnicima poruku dobrodošlice sa smijernicama za korištenje"}},"presence":{"replying":{"one":"odgovara","few":"odgovara","other":"odgovara"},"editing":{"one":"ispravlja","few":"ispravlja","other":"ispravlja"},"replying_to_topic":{"one":"piše","few":"piše","other":"pišu"}},"poll":{"voters":{"one":"glasač","few":"glasača","other":"glasača"},"total_votes":{"one":"ukupan glas","few":"ukupno glasova","other":"ukupno glasova"},"average_rating":"Prosječna ocjena: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Glasanje je \u003cstrong\u003ejavno\u003c/strong\u003e."},"results":{"groups":{"title":"Morate biti pripadnik %{groups} kako bi ste mogli glasati u ovoj anketi."},"vote":{"title":"Rezultati će biti prikazani pritiskom na\u003cstrong\u003eglasaj\u003c/strong\u003e."},"closed":{"title":"Rezultati će biti prikazani onda kada glasanje bude \u003cstrong\u003ezavršeno\u003c/strong\u003e."},"staff":{"title":"Rezultati su prikazani samo \u003cstrong\u003euredništvu i admin\u003c/strong\u003e korisnicima."}},"multiple":{"help":{"at_least_min_options":{"one":"Odaberite najmanje \u003cstrong\u003e%{count}\u003c/strong\u003e opciju.","few":"Odaberite najmanje \u003cstrong\u003e%{count}\u003c/strong\u003e opcije.","other":"Odaberite najmanje \u003cstrong\u003e%{count}\u003c/strong\u003e opcija."},"up_to_max_options":{"one":"Odaberite najviše \u003cstrong\u003e%{count}\u003c/strong\u003e opciju.","few":"Odaberite najviše \u003cstrong\u003e%{count}\u003c/strong\u003e opcije.","other":"Odaberite najviše \u003cstrong\u003e%{count}\u003c/strong\u003e opcija."},"x_options":{"one":"Odaberite \u003cstrong\u003e%{count}\u003c/strong\u003e opciju.","few":"Odaberite \u003cstrong\u003e%{count}\u003c/strong\u003e opcije.","other":"Odaberite \u003cstrong\u003e%{count}\u003c/strong\u003e opcija."},"between_min_and_max_options":"Odaberite između \u003cstrong\u003e%{min}\u003c/strong\u003e i \u003cstrong\u003e%{max}\u003c/strong\u003e mogućnosti."}},"cast-votes":{"title":"ukupno glasova","label":"Glasaj"},"show-results":{"title":"Prikaži rezultate ankete","label":"Prikaži rezultate"},"hide-results":{"title":"Nazad na glasove","label":"Prikaži glasanje"},"group-results":{"title":"Grupiraj glasove po polju korisnika","label":"Prikaži raspodjelu"},"export-results":{"title":"Izvezi rezultate ankete (Export)","label":"Izvoz"},"open":{"title":"Otvori anketu","label":"Otvori","confirm":"Da li ste sigurni da želite da otvorite ovu anketu?"},"close":{"title":"Zatvori anketu","label":"Zatvori","confirm":"Da li ste sigurni da želite da zatvorite ovu anketu?"},"automatic_close":{"closes_in":"Završava za \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Završeno \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Rezultati ankete","votes":"%{count} glasova","breakdown":"Razloženo","percentage":"Procentualno","count":"Broj"},"error_while_toggling_status":"Izvinjavamo se, pojavio se problem u prebacivanju statutusa ove ankete","error_while_casting_votes":"Izvinjavamo se, pojavila se greška prikazivanja vaših glasova","error_while_fetching_voters":"Izvinjavamo se, pojavila se greška pri prikazivanju glasača","error_while_exporting_results":"Izvinjavamo se, došlo je do greške izvoza rezultata vaše ankete.","ui_builder":{"title":"Izgradi anketu","insert":"Umetni anketu","help":{"options_min_count":"Unesite barem jednu opciju.","invalid_values":"Minimalna vrijednost mora biti manja od maksimalne.","min_step_value":"Minimalna vrijednost razmaka je 1"},"poll_type":{"label":"Tip","regular":"Jedan izbor","multiple":"Višestruki izbor","number":"Rejting broja"},"poll_result":{"always":"Uvjek vidljivo","staff":"Samo za urednike i admine"},"poll_chart_type":{"bar":"Bar dijagram","pie":"Okrugli dijagram"},"poll_config":{"step":"Korak"},"poll_public":{"label":"Pokaži ko je glasao"},"automatic_close":{"label":"Automatski zatvori anketu"}}},"styleguide":{"sections":{"colors":{"title":"Colors"},"categories":{"title":"Kategorije"},"navigation":{"title":"Navigacija"},"categories_list":{"title":"Lista Kategorija"},"topic_timer_info":{"title":"Trajanje tema"},"post":{"title":"Objava"},"suggested_topics":{"title":"Preporučene teme"}}}}},"en":{"js":{"dates":{"wrap_on":"on %{date}"},"share":{"url":"Copy and share URL"},"software_update_prompt":{"message":"We've updated this site, \u003cspan\u003eplease refresh\u003c/span\u003e, or you may experience unexpected behavior."},"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined.","other":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} users have joined."},"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)"}},"clear_input":"Clear input","about":{"stat":{"last_day":"Last 24 hours","last_7_days":"Last 7 days","last_30_days":"Last 30 days"}},"bookmarked":{"edit_bookmark":"Edit Bookmark","help":{"edit_bookmark":"Click to edit the bookmark on this topic","unbookmark_with_reminder":"Click to remove all bookmarks and reminders in this topic."}},"bookmarks":{"created_with_reminder":"You've bookmarked this post with a reminder %{date}. %{name}","reminders":{"existing_reminder":"You have a reminder set for this bookmark which will be sent %{at_date_time}"}},"drafts":{"label_with_count":"Drafts (%{count})","remove_confirmation":"Are you sure you want to delete this draft?","new_private_message":"New personal message draft","abandon":{"confirm":"You have a draft in progress for this topic. What would you like to do with it?","no_value":"Resume editing"}},"deleting":"Deleting...","processing_filename":"Processing: %{filename}...","review":{"stale_help":"This reviewable has been resolved by \u003cb\u003e%{username}\u003c/b\u003e.","user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"}},"reject_reason":{"title":"Why are you rejecting this user?","send_email":"Send rejection email"}},"relative_time_picker":{"minutes":{"one":"minute","other":"minutes"},"hours":{"one":"hour","other":"hours"},"months":{"one":"month","other":"months"},"years":{"one":"year","other":"years"},"relative":"Relative"},"time_shortcut":{"post_local_date":"Date in post","two_weeks":"Two weeks","six_months":"Six months","relative":"Relative time","none":"None needed","last_custom":"Last custom datetime"},"directory":{"edit_columns":{"title":"Edit Directory Columns","reset_to_default":"Reset to default"}},"groups":{"add_members":{"title":"Add Users to %{group_name}","description":"Enter a list of users you want to invite to the group or paste in a comma separated list:","set_owner":"Set users as owners of this group"},"manage":{"add_members":"Add Users","email":{"enable_smtp":"Enable SMTP","enable_imap":"Enable IMAP","test_settings":"Test Settings","save_settings":"Save Settings","last_updated":"Last updated:","settings_required":"All settings are required, please fill in all fields before validation.","smtp_settings_valid":"SMTP settings valid.","smtp_title":"SMTP","smtp_instructions":"When you enable SMTP for the group, all outbound emails sent from the group's inbox will be sent via the SMTP settings specified here instead of the mail server configured for other emails sent by your forum.","imap_title":"IMAP","imap_additional_settings":"Additional Settings","imap_instructions":"When you enable IMAP for the group, emails are synced between the group inbox and the provided IMAP server and mailbox. SMTP must be enabled with valid and tested credentials before IMAP can be enabled. The email username and password used for SMTP will be used for IMAP. For more information see \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Warning: This is an alpha-stage feature. Only Gmail is officially supported. Use at your own risk!","imap_settings_valid":"IMAP settings valid.","smtp_disable_confirm":"If you disable SMTP, all SMTP and IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_disable_confirm":"If you disable IMAP all IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_mailbox_not_selected":"You must select a Mailbox for this IMAP configuration or no mailboxes will be synced!","prefill":{"title":"Prefill with settings for:","gmail":"GMail"},"settings":{"allow_unknown_sender_topic_replies":"Allow unknown sender topic replies.","allow_unknown_sender_topic_replies_hint":"Allows unknown senders to reply to group topics. If this is not enabled, replies from email addresses not already invited to the topic will create a new topic."}}},"members":{"make_primary":"Make Primary","make_primary_description":"Make this the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Remove as Primary","remove_primary_description":"Remove this as the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Remove Members","remove_members_description":"Remove selected users from this group","make_owners":"Make Owners","make_owners_description":"Make selected users owners of this group","remove_owners":"Remove Owners","remove_owners_description":"Remove selected users as owners of this group","make_all_primary":"Make All Primary","make_all_primary_description":"Make this the primary group for all selected users","remove_all_primary":"Remove as Primary","remove_all_primary_description":"Remove this group as primary","primary":"Primary","no_filter_matches":"No members match that search."},"default_notifications":{"modal_title":"User default notifications","modal_description":"Would you like to apply this change historically? This will change preferences for %{count} existing users.","modal_no":"No, only apply change going forward"}},"categories":{"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"notification_schedule":{"title":"Notification Schedule","label":"Enable custom notification schedule","tip":"Outside of these hours you will be put in 'do not disturb' automatically.","midnight":"Midnight","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"read_help":"Recently read topics","desktop_notifications":{"each_browser_note":"Note: You have to change this setting on every browser you use. All notifications will be disabled when in \"do not disturb\", regardless of this setting."},"no_messages_title":"You don’t have any messages","no_messages_body":"Need to have a direct personal conversation with someone, outside the normal conversational flow? Message them by selecting their avatar and using the %{icon} message button.\u003cbr\u003e\u003cbr\u003e If you need help, you can \u003ca href='%{aboutUrl}'\u003emessage a staff member\u003c/a\u003e.\n","no_bookmarks_title":"You haven’t bookmarked anything yet","no_bookmarks_body":"Start bookmarking posts with the %{icon} button and they will be listed here for easy reference. You can schedule a reminder too!\n","no_bookmarks_search":"No bookmarks found with the provided search query.","no_notifications_title":"You don’t have any notifications yet","no_notifications_body":"You will be notified in this panel about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","no_notifications_page_title":"You don’t have any notifications yet","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","skip_new_user_tips":{"read_later":"I'll read it later."},"color_scheme_default_on_all_devices":"Set default color scheme(s) on all my devices","color_scheme":"Color Scheme","color_schemes":{"default_description":"Theme default","disable_dark_scheme":"Same as regular","dark_instructions":"You can preview the dark mode color scheme by toggling your device's dark mode.","dark":"Dark mode","default_dark_scheme":"(site default)"},"regular_categories_instructions":"You will see these categories in the “Latest” and “Top” topic lists.","messages":{"all":"all inboxes","personal":"Personal","unread_with_count":{"one":"Unread (%{count})","other":"Unread (%{count})"},"new_with_count":{"one":"New (%{count})","other":"New (%{count})"},"warnings":"Official Warnings"},"second_factor_backup":{"title":"Two-Factor Backup Codes","manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"enable_prerequisites":"You must enable a primary two-factor method before generating backup codes."},"second_factor":{"title":"Two-Factor Authentication","enable":"Manage Two-Factor Authentication","disable_all":"Disable All","extended_description":"Two-factor authentication adds extra security to your account by requiring a one-time token in addition to your password. Tokens can be generated on \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e and \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e devices.\n","oauth_enabled_warning":"Please note that social logins will be disabled once two-factor authentication has been enabled on your account.","enforced_notice":"You are required to enable two-factor authentication before accessing this site.","disable_confirm":"Are you sure you want to disable all two-factor methods?","edit_title":"Edit Authenticator","edit_description":"Authenticator Name"},"change_email":{"success_via_admin":"We've sent an email to that address. The user will need to follow the confirmation instructions in the email."},"change_avatar":{"logo_small":"Site's small logo. Used by default."},"email":{"auth_override_instructions":"Email can be updated from authentication provider.","admin_note":"Note: An admin user changing another non-admin user's email indicates the user has lost access to their original email account, so a reset password email will be sent to their new address. The user's email will not change until they complete the reset password process.","invite_auth_email_invalid":"Your invitation email does not match the email authenticated by %{provider}","authenticated_by_invite":"Your email has been authenticated by the invitation"},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}},"username":{"edit":"Edit username"},"auth_tokens":{"device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactive now\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"invited":{"expired_tab":"Expired","expired_tab_with_count":"Expired (%{count})","invited_via_link":"link %{key} (%{count} / %{max} redeemed)","sent":"Created/Last Sent","copy_link":"Get Link","reinvite":"Resend Email","removed":"Removed","reinvite_all":"Resend All Invites","reinvited_all":"All Invites Sent!","generate_link":"Create Invite Link","link_generated":"Here's your invite link!","single_user":"Invite by email","multiple_user":"Invite by link","invite":{"new_title":"Create Invite","edit_title":"Edit Invite","instructions":"Share this link to instantly grant access to this site","copy_link":"copy link","expires_in_time":"Expires in %{time}","expired_at_time":"Expired at %{time}","show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options","restrict_email":"Restrict to one email address","max_redemptions_allowed":"Max uses","add_to_groups":"Add to groups","invite_to_topic":"Arrive at this topic","expires_at":"Expire after","custom_message":"Optional personal message","send_invite_email":"Save and Send Email","save_invite":"Save Invite","invite_saved":"Invite saved.","invite_copied":"Invite link copied."},"bulk_invite":{"none":"No invitations to display on this page.","instructions":"\u003cp\u003eInvite a list of users to get your community going quickly. Prepare a \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV file\u003c/a\u003e containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEvery email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.\u003c/p\u003e\n","progress":"Uploaded %{progress}%...","success":"File uploaded successfully. You will be notified via message when the process is complete."}},"avatar":{"name_and_description":"%{name} - %{description}","edit":"Edit Profile Picture"},"title":{"instructions":"appears after your username"},"flair":{"title":"Flair","instructions":"icon displayed next to your profile picture"},"date_of_birth":{"user_title":"Today is your birthday!","title":"Today is my birthday!","label":"Date of Birth"},"anniversary":{"user_title":"Today is the anniversary of the day you joined our community!","title":"Today is the anniversary of the day I joined this community!"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"assets_changed_confirm":"This site just received a software upgrade. Get the latest version now?","logs_error_rate_notice":{},"signup_cta":{"hidden_for_session":"OK, we'll ask you tomorrow. You can always use 'Log In' to create an account, too."},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply.","other":"There are \u003cb\u003e%{count}\u003c/b\u003e replies."}},"private_message_info":{"remove":"Remove..."},"create_account":{"subheader_title":"Let's create your account","title":"Create your account","associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"email_login":{"login_link":"Skip the password; email me a login link"},"login":{"header_title":"Welcome back","subheader_title":"Log in to your account","title":"Log in","second_factor_title":"Two-Factor Authentication","second_factor_backup_title":"Two-Factor Backup","email_placeholder":"Email / Username","not_allowed_from_ip_address":"You can't log in from that IP address.","omniauth_disallow_totp":"Your account has two-factor authentication enabled. Please log in with your password."},"invites":{"emoji":"envelope emoji"},"category_row":{"topic_count":{"one":"%{count} topic in this category","other":"%{count} topics in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory","other":"%{name} and %{count} subcategories"},"plus_subcategories":{"one":"+ %{count} subcategory","other":"+ %{count} subcategories"}},"select_kit":{"filter_by":"Filter by: %{name}","select_to_filter":"Select a value to filter","results_count":{"one":"%{count} result","other":"%{count} results"},"invalid_selection_length":{"one":"Selection must be at least %{count} character.","other":"Selection must be at least %{count} characters."},"components":{"tag_drop":{"filter_for_more":"Filter for more..."},"categories_admin_dropdown":{"title":"Manage categories"}}},"shared_drafts":{"notice":"This topic is only visible to those who can publish shared drafts."},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"error":{"title_too_short":{"one":"Title must be at least %{count} character","other":"Title must be at least %{count} characters"},"title_too_long":{"one":"Title can't be more than %{count} character","other":"Title can't be more than %{count} characters"},"post_length":{"one":"Post must be at least %{count} character","other":"Post must be at least %{count} characters"},"tags_missing":{"one":"You must choose at least %{count} tag","other":"You must choose at least %{count} tags"}},"show_preview":"show preview","hide_preview":"hide preview","link_url_placeholder":"Paste a URL or type to search topics","show_toolbar":"show composer toolbar","hide_toolbar":"hide composer toolbar","slow_mode":{"error":"This topic is in slow mode. You already posted recently; you can post again in %{timeLeft}."},"composer_actions":{"reply_to_post":{"label":"Reply to a post by %{postUsername}"},"reply_as_new_topic":{"confirm":"You have a new topic draft saved, which will be overwritten if you create a linked topic."},"reply_as_new_group_message":{"label":"Reply as new group message","desc":"Create new message starting with same recipients"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"}},"reload":"Reload"},"notifications":{"tooltip":{"high_priority":{"one":"%{count} unread high priority notification","other":"%{count} unread high priority notifications"}},"membership_request_accepted":"Membership accepted in '%{group_name}'","membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"},"votes_released":"%{description} - completed","titles":{"bookmark_reminder":"bookmark reminder","bookmark_reminder_with_name":"bookmark reminder - %{name}","membership_request_consolidated":"new membership requests","reaction":"new reaction","votes_released":"Vote was released"}},"upload_selector":{"processing":"Processing Upload"},"search":{"context":{"tag":"Search the #%{tag} tag"},"advanced":{"post":{"min":{"placeholder":"minimum"},"max":{"placeholder":"maximum"}},"min_views":{"placeholder":"minimum"},"max_views":{"placeholder":"maximum"}}},"view_all":"view all %{tab}","topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread","other":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…","other":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})","other":"Dismiss New (%{count})"},"change_category":"Set Category...","notification_level":"Notifications...","change_notification_level":"Change Notification Level","remove_tags":"Remove All Tags","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from \u003cb\u003e%{count}\u003c/b\u003e topics. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic","other":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topics"}},"none":{"unseen":"You have no unseen topics.","latest":"You're all caught up!","educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e","unread":"\u003cp\u003eYour unread topics appear here.\u003c/p\u003e\u003cp\u003eBy default, topics are considered unread and will show unread counts \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e if you:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreated the topic\u003c/li\u003e\u003cli\u003eReplied to the topic\u003c/li\u003e\u003cli\u003eRead the topic for more than 4 minutes\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOr if you have explicitly set the topic to Tracked or Watched via the 🔔 in each topic.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"collapse_details":"collapse topic details","expand_details":"expand topic details","unread_indicator":"No member has read the last post of this topic yet.","browse_all_tags":"Browse all tags","suggest_create_topic":"Ready to \u003ca href\u003estart a new conversation?\u003c/a\u003e","slow_mode_update":{"title":"Slow Mode","select":"Users may only post in this topic once every:","description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","update":"Update","enabled_until":"Enabled until:","hours":"Hours:","minutes":"Minutes:","seconds":"Seconds:","durations":{"10_minutes":"10 Minutes","15_minutes":"15 Minutes","30_minutes":"30 Minutes","45_minutes":"45 Minutes","1_hour":"1 Hour","2_hours":"2 Hours","4_hours":"4 Hours","8_hours":"8 Hours","12_hours":"12 Hours","24_hours":"24 Hours","custom":"Custom Duration"}},"slow_mode_notice":{"duration":"Please wait %{duration} between posts in this topic"},"topic_status_update":{"num_of_days":"Number of days:","min_duration":"Duration must be greater than 0","max_duration":"Duration must be less than 20 years"},"auto_update_input":{"now":"Now","two_weeks":"Two weeks","two_months":"Two months","three_months":"Three months","four_months":"Four months","six_months":"Six months","one_year":"One year"},"auto_reopen":{"title":"Auto-Open Topic"},"auto_close":{"label":"Auto-close topic after:"},"auto_close_after_last_post":{"title":"Auto-Close Topic After Last Post"},"auto_delete_replies":{"title":"Auto-Delete Replies"},"status_update_notice":{"auto_delete_replies":"Replies on this topic are automatically deleted after %{duration}."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily.","other":"The last post in the topic is already %{count} hours old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"}},"notifications":{"reasons":{"3_10_stale":"You will receive notifications because you were watching a tag on this topic in the past.","3_6_stale":"You will receive notifications because you were watching this category in the past.","2_8_stale":"You will see a count of new replies because you were tracking this category in the past."}},"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."},"feature":{"make_banner":"Make Banner Topic"},"share":{"instructions":"Share a link to this topic:","copied":"Topic link copied.","notify_users":{"title":"Notify","instructions":"Notify the following users about this topic:","success":{"one":"Successfully notified %{username} about this topic.","other":"Successfully notified all users about this topic."}}},"feature_topic":{"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"}},"invite_private":{"not_allowed":"Sorry, that user can't be invited."},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link."},"publish_page":{"title":"Page Publishing","publish":"Publish","description":"When a topic is published as a page, its URL can be shared and it will displayed with custom styling.","slug":"Slug","public_description":"People can see the page even if the associated topic is private.","publish_url":"Your page has been published at:","topic_published":"Your topic has been published at:","preview_url":"Your page will be published at:","invalid_slug":"Sorry, you can't publish this page.","unpublish":"Unpublish","unpublished":"Your page has been unpublished and is no longer accessible.","publishing_settings":"Publishing Settings"},"change_owner":{"instructions_without_old_user":{"one":"Please choose a new owner for the post","other":"Please choose a new owner for the %{count} posts"}},"deleted_by_author_simple":"(topic deleted by author)"},"post":{"wiki_last_edited_on":"wiki last edited on %{dateTime}","last_edited_on":"post last edited on %{dateTime}","deleted_by_author_simple":"(post deleted by author)","has_replies_count":"%{count}","unknown_user":"(unknown/deleted user)","filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","view_all_posts":"View all posts","errors":{"too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."}},"cancel_composer":{"confirm":"What would you like to do with your post?","save_draft":"Save draft for later","keep_editing":"Keep editing"},"controls":{"read_indicator":"members who read this post","publish_page":"Page Publishing","change_owner":"Change Ownership...","grant_badge":"Grant Badge...","delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","other":"This topic currently has over %{count} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic","add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice...","delete_post_notice":"Delete Staff Notice","edit_timer":"edit timer"},"actions":{"people":{"read":{"one":"read this","other":"read this"},"read_capped":{"one":"and %{count} other read this","other":"and %{count} others read this"}}},"bookmarks":{"actions":{"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}},"filtered_replies":{"viewing_posts_by":"Viewing %{post_count} posts by","viewing_subset":"Some replies are collapsed","viewing_summary":"Viewing a summary of this topic","post_number":"%{username}, post #%{post_number}","show_all":"Show all"}},"category":{"back":"Back to category","tags_tab_description":"Tags and tag groups specified above will only be available in this category and other categories that also specify them. They won't be available for use in other categories.","manage_tag_groups_link":"Manage tag groups","tag_group_selector_placeholder":"(Optional) Tag group","required_tag_group_description":"Require new topics to have tags from a tag group:","min_tags_from_required_group_label":"Num Tags:","required_tag_group_label":"Tag group:","security_add_group":"Add a group","permissions":{"no_groups_selected":"No groups have been granted access; this category will only be visible to staff.","everyone_has_access":"This category is public, everyone can see, reply and create posts. To restrict permissions, remove one or more of the permissions granted to the \"everyone\" group.","toggle_reply":"Toggle Reply permission","toggle_full":"Toggle Create permission","inherited":"This permission is inherited from \"everyone\""},"uncategorized_security_warning":"This category is special. It is intended as holding area for topics that have no category; it cannot have security settings.","uncategorized_general_warning":"This category is special. It is used as the default category for new topics that do not have a category selected. If you want to prevent this behavior and force category selection, \u003ca href=\"%{settingLink}\"\u003eplease disable the setting here\u003c/a\u003e. If you want to change the name or description, go to \u003ca href=\"%{customizeLink}\"\u003eCustomize / Text Content\u003c/a\u003e.","pending_permission_change_alert":"You haven't added %{group} to this category; click this button to add them.","read_only_banner":"Banner text when a user cannot create a topic in this category:","num_featured_topics":"Number of topics shown on the categories page:","allow_unlimited_owner_edits_on_first_post":"Allow unlimited owner edits on first post","default_list_filter":"Default List Filter:","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","default_slow_mode":"Enable \"Slow Mode\" for new topics in this category.","notifications":{"watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"list_filters":{"all":"all topics","none":"no subcategories"},"colors_disabled":"You can’t select colors because you have a category style of none.","topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"flagging":{"take_action":"Take Action...","take_action_options":{"suspend":{"details":"Reach the flag threshold, and suspend the user"},"silence":{"details":"Reach the flag threshold, and silence the user"}},"flag_for_review":"Queue For Review"},"history_capped_revisions":"History, last 100 revisions","history":"History","filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"},"top":{"other_periods":"see top:"}},"browser_update":"Unfortunately, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eyour browser is too old to work on this site\u003c/a\u003e. Please \u003ca href=\"https://browsehappy.com\"\u003eupgrade your browser\u003c/a\u003e to view rich content, log in and reply.","cannot_render_video":"This video cannot be rendered because your browser does not support the codec.","keyboard_shortcuts_help":{"shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","jump_to":{"next":"%{shortcut} Next Topic"},"application":{"dismiss_new":"%{shortcut} Dismiss New"}},"badges":{"favorite_max_reached":"You can’t favorite more badges.","favorite_max_not_reached":"Mark this badge as favorite","favorite_count":"%{count}/%{max} badges marked as favorite"},"tagging":{"default_info":"This tag isn't restricted to any categories, and has no synonyms. To add restrictions, put this tag in a \u003ca href=%{basePath}/tag_groups\u003etag group\u003c/a\u003e.","tag_list_joiner":", ","groups":{"about_heading":"Select a tag group or create a new one","about_heading_empty":"Create a new tag group to get started","about_description":"Tag groups help you manage permissions for many tags in one place.","new_title":"Create New Group","edit_title":"Edit Tag Group","parent_tag_description":"Tags from this group can only be used if the parent tag is present.","usable_only_by_groups":"Tags are visible to everyone, but only the following groups can use them","visible_only_to_groups":"Tags are visible only to the following groups","cannot_save":"Cannot save tag group. Make sure that there is at least one tag present, tag group name is not empty, and a group is selected for tags permission.","tags_placeholder":"Search or create tags","parent_tag_placeholder":"Optional","select_groups_placeholder":"Select groups...","disabled":"Tagging is disabled. "},"topics":{"none":{"unseen":"You have no unseen topics."}}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"forced_anonymous_login_required":"The site is under extreme load and cannot be loaded at this time, try again in a few minutes.","do_not_disturb":{"title":"Do not disturb for...","label":"Do not disturb","options":{"half_hour":"30 minutes","one_hour":"1 hour","two_hours":"2 hours","tomorrow":"Until tomorrow"},"set_schedule":"Set a notification schedule"},"trust_levels":{"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"You have picked an unsupported file. Supported file types – %{types}."},"cakeday":{"none":" ","title":"Cakeday","upcoming":"Upcoming"},"birthdays":{"title":"Birthdays","month":{"title":"Birthdays in the Month of","empty":"There are no users celebrating their birthdays this month."},"upcoming":{"title":"Birthdays for %{start_date} - %{end_date}","empty":"There are no users celebrating their birthdays in the next 7 days."},"today":{"title":"Birthdays for %{date}","empty":"There are no users celebrating their birthdays today."},"tomorrow":{"empty":"There are no users celebrating their birthdays tomorrow."}},"anniversaries":{"title":"Anniversaries","month":{"title":"Anniversaries in the Month of","empty":"There are no users celebrating their anniversaries this month."},"upcoming":{"title":"Anniversaries for %{start_date} - %{end_date}","empty":"There are no users celebrating their anniversaries in the next 7 days."},"today":{"title":"Anniversaries for %{date}","empty":"There are no users celebrating their anniversaries today."},"tomorrow":{"empty":"There are no users celebrating their anniversaries tomorrow."}},"discourse_local_dates":{"create":{"form":{"format_description":"Format used to display the date to the user. Use Z to show the offset and zz for the timezone name."}}},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"poll":{"ui_builder":{"help":{"options_max_count":"Enter at most %{count} options.","invalid_min_value":"Minimum value must be at least 1.","invalid_max_value":"Maximum value must be at least 1, but less than or equal with the number of options."},"poll_result":{"label":"Show Results...","vote":"Only after voting","closed":"When the poll is closed"},"poll_groups":{"label":"Limit voting to these groups"},"poll_chart_type":{"label":"Result chart"},"poll_config":{"max":"Max Choices","min":"Min Choices"},"poll_title":{"label":"Title (optional)"},"poll_options":{"label":"Options (one per line)","add":"Add option"},"show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options"}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","example":"Welcome to Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Date/Time inputs"},"font_scale":{"title":"Font System"},"icons":{"title":"Icons","full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation_bar":{"title":"Navigation Bar"},"navigation_stacked":{"title":"Navigation Stacked"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_statuses":{"title":"Topic Statuses"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"post_menu":{"title":"Post Menu"},"modal":{"title":"Modal","header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}}}}};
I18n.locale = 'bs_BA';
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
//! locale : Bosnian [bs]
//! author : Nedim Cholich : https://github.com/frontyard
//! based on (hr) translation by Bojan Marković

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    function translate(number, withoutSuffix, key) {
        var result = number + ' ';
        switch (key) {
            case 'ss':
                if (number === 1) {
                    result += 'sekunda';
                } else if (number === 2 || number === 3 || number === 4) {
                    result += 'sekunde';
                } else {
                    result += 'sekundi';
                }
                return result;
            case 'm':
                return withoutSuffix ? 'jedna minuta' : 'jedne minute';
            case 'mm':
                if (number === 1) {
                    result += 'minuta';
                } else if (number === 2 || number === 3 || number === 4) {
                    result += 'minute';
                } else {
                    result += 'minuta';
                }
                return result;
            case 'h':
                return withoutSuffix ? 'jedan sat' : 'jednog sata';
            case 'hh':
                if (number === 1) {
                    result += 'sat';
                } else if (number === 2 || number === 3 || number === 4) {
                    result += 'sata';
                } else {
                    result += 'sati';
                }
                return result;
            case 'dd':
                if (number === 1) {
                    result += 'dan';
                } else {
                    result += 'dana';
                }
                return result;
            case 'MM':
                if (number === 1) {
                    result += 'mjesec';
                } else if (number === 2 || number === 3 || number === 4) {
                    result += 'mjeseca';
                } else {
                    result += 'mjeseci';
                }
                return result;
            case 'yy':
                if (number === 1) {
                    result += 'godina';
                } else if (number === 2 || number === 3 || number === 4) {
                    result += 'godine';
                } else {
                    result += 'godina';
                }
                return result;
        }
    }

    var bs = moment.defineLocale('bs', {
        months: 'januar_februar_mart_april_maj_juni_juli_august_septembar_oktobar_novembar_decembar'.split(
            '_'
        ),
        monthsShort: 'jan._feb._mar._apr._maj._jun._jul._aug._sep._okt._nov._dec.'.split(
            '_'
        ),
        monthsParseExact: true,
        weekdays: 'nedjelja_ponedjeljak_utorak_srijeda_četvrtak_petak_subota'.split(
            '_'
        ),
        weekdaysShort: 'ned._pon._uto._sri._čet._pet._sub.'.split('_'),
        weekdaysMin: 'ne_po_ut_sr_če_pe_su'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'H:mm',
            LTS: 'H:mm:ss',
            L: 'DD.MM.YYYY',
            LL: 'D. MMMM YYYY',
            LLL: 'D. MMMM YYYY H:mm',
            LLLL: 'dddd, D. MMMM YYYY H:mm',
        },
        calendar: {
            sameDay: '[danas u] LT',
            nextDay: '[sutra u] LT',
            nextWeek: function () {
                switch (this.day()) {
                    case 0:
                        return '[u] [nedjelju] [u] LT';
                    case 3:
                        return '[u] [srijedu] [u] LT';
                    case 6:
                        return '[u] [subotu] [u] LT';
                    case 1:
                    case 2:
                    case 4:
                    case 5:
                        return '[u] dddd [u] LT';
                }
            },
            lastDay: '[jučer u] LT',
            lastWeek: function () {
                switch (this.day()) {
                    case 0:
                    case 3:
                        return '[prošlu] dddd [u] LT';
                    case 6:
                        return '[prošle] [subote] [u] LT';
                    case 1:
                    case 2:
                    case 4:
                    case 5:
                        return '[prošli] dddd [u] LT';
                }
            },
            sameElse: 'L',
        },
        relativeTime: {
            future: 'za %s',
            past: 'prije %s',
            s: 'par sekundi',
            ss: translate,
            m: translate,
            mm: translate,
            h: translate,
            hh: translate,
            d: 'dan',
            dd: translate,
            M: 'mjesec',
            MM: translate,
            y: 'godinu',
            yy: translate,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 7, // The week that contains Jan 7th is the first week of the year.
        },
    });

    return bs;

})));

// moment-timezone-localization for lang code: bs

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidjan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Accra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Addis Ababa","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Algiers","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamako","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Kairo","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Kazablanka","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Ceuta","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Conakry","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Dar es Salaam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Džibuti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"El Aaiun","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Johannesburg","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Kartum","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lome","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaka","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadiš","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monrovia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairobi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"Ndjamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nouakchott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ouagadougou","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto-Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"Sao Tome","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Tripoli","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Tunis","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Angvila","id":"America/Anguilla"},{"value":"America/Antigua","name":"Antigva","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaina","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"La Rioja","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Rio Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucuman","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Asuncion","id":"America/Asuncion"},{"value":"America/Bahia","name":"Bahia","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahia Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belem","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogota","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancun","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Cayenne","id":"America/Cayenne"},{"value":"America/Cayman","name":"Kajman","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Cordoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Kostarika","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiaba","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Kurasao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominika","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepe","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Grenada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Gvadalupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Gvatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guayaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Guyana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"Havana","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianapolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Jamajka","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"La Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Los Angeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceio","id":"America/Maceio"},{"value":"America/Managua","name":"Managua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinique","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlan","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Merida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Mexico City","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevideo","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"New York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, Sjeverna Dakota","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, Sjeverna Dakota","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salem, Sjeverna Dakota","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panama","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Port-au-Prince","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Port of Spain","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Portoriko","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Rio Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarem","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"Sao Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"St. Barthelemy","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"St. John’s","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"St. Kitts","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"St. Lucia","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"St. Thomas","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"St. Vincent","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Thule","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tortola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Casey","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Davis","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Dumont d’Urville","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Macquarie","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Mawson","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"McMurdo","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Palmer","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Rothera","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Syowa","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Troll","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Vostok","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Longyearbyen","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Aden","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Almati","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Aman","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Anadir","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Aktau","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Akutobe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Ašhabad","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Atyrau","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Bagdad","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrein","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Baku","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Bangkok","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Barnaul","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Bejrut","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Biškek","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Bruneji","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Kolkata","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Chita","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Čojbalsan","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Kolombo","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Damask","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Daka","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Dili","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Dubai","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Dušanbe","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Famagusta","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Gaza","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Hebron","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Hong Kong","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Hovd","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Irkutsk","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Džakarta","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Džajapura","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Jeruzalem","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Kabul","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Kamčatka","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Karači","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Katmandu","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Handiga","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Krasnojarsk","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lumpur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Kučing","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Kuvajt","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Makau","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Magadan","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Makasar","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Manila","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Muskat","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nikozija","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Novokuznjeck","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Novosibirsk","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Omsk","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Oral","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Pnom Pen","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Pontianak","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Pjongjang","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Katar","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Kizilorda","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Rangun","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Rijad","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Ho Ši Min","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Sahalin","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarkand","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Seul","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Šangaj","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Singapur","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Srednekolymsk","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Tajpej","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Taškent","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Tbilisi","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Teheran","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Thimphu","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tokio","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Tomsk","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ulan Bator","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Urumči","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ust-Nera","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Vijentijan","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Vladivostok","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Jakutsk","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Jekaterinburg","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Jerevan","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Azori","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermuda","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Kanari","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Kape Verde","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Faroe","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Rejkjavik","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"South Georgia","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"Sveta Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Adelaide","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Brisbane","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Broken Hill","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Currie","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Darwin","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Eucla","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Hobart","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Lindeman","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Lord Hau","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Melburn","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Pert","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Sidnej","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Koordinirano svjetsko vrijeme","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Amsterdam","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Andora","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Astrahan","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Atina","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Beograd","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlin","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Bratislava","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Brisel","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Bukurešt","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budimpešta","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Busingen","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Kišinjev","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Kopenhagen","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Irsko standardno vrijemeDablin","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Gibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Gernzi","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsinki","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Ostrvo Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istanbul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kalinjingrad","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kijev","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Kirov","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Lisabon","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Ljubljana","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Britansko ljetno vrijemeLondon","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Luksemburg","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madrid","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Mariehamn","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Minsk","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Monako","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Moskva","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Pariz","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Podgorica","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Prag","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Rim","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Samara","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"San Marino","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Sarajevo","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Saratov","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Simferopolj","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Skoplje","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Sofija","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Štokholm","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Talin","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Tirana","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Ulyanovsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Užgorod","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Vaduz","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Vatikan","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Beč","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Vilnius","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Volgograd","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Varšava","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Zagreb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Zaporožje","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Cirih","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Chagos","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Božićno ostrvo","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Kokosova ostrva","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Comoro","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Kerguelen","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Mahe","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Maldivi","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Mauricijus","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Reunion","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Apia","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Auckland","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Bougainville","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Chatham","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Easter","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Efate","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Enderbury","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Fakaofo","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Fidži","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Funafuti","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Galapagos","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Gambier","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Guadalcanal","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Guam","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"Honolulu","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Johnston","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Kiritimati","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Kosrae","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Kwajalein","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Majuro","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Marquesas","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Midway","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Nauru","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Niue","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Norfolk","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Noumea","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Pago Pago","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Palau","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Pitkern","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Pohnpei","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Port Moresby","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Rarotonga","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Saipan","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Tahiti","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Tarawa","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Tongatapu","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Chuuk","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Wake","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Valis","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

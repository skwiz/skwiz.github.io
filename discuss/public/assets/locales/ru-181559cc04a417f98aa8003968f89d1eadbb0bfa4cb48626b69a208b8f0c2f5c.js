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
r += "Давайте <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">приступим к обсуждению!</a> Есть ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
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
})() + "</strong> тема";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> темы";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> тем";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " и ";
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
})() + "</strong> сообщение";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщения";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщений";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Пользователи должны больше читать и отвечать – мы рекомендуем по крайней мере ";
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
})() + "</strong> тему";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> темы";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> тем";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " и ";
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
})() + "</strong> сообщение";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщения";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщений";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Только сотрудники могут видеть это сообщение.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Давайте <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">приступим к обсуждению!</a> Есть ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
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
})() + "</strong> тема";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> темы";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> тем";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Пользователи должны больше читать и отвечать – мы рекомендуем по крайней мере ";
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
})() + "</strong> тему";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> темы";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> тем";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Только сотрудники могут видеть это сообщение.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "Давайте <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">приступим к обсуждению!</a> Есть ";
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
})() + "</strong> сообщение";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщения";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщений";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Пользователи должны больше читать и отвечать – мы рекомендуем по крайней мере ";
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
})() + "</strong> сообщение";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщения";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> сообщений";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Только сотрудники могут видеть это сообщение.";
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> достигнут предел настройки сайта ";
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> достигнут предел настройки сайта ";
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> превышен лимит настроек сайта ";
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> превышен лимит настроек сайта ";
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
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "У вас ";
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
})() + " непрочитанная</a> ";
return r;
},
"few" : function(d){
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
})() + " непрочитанные</a> ";
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
})() + " непрочитанных</a> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "и ";
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
})() + " новая</a> тема";
return r;
},
"few" : function(d){
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
r += "и ";
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
})() + " новые</a> темы";
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
r += "и ";
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
})() + " новых</a> тем";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ", вы также можете ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "посмотреть другие темы в разделе ";
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
r += "Вы собираетесь удалить ";
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
})() + "</b> сообщение";
return r;
},
"few" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> сообщения";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> сообщений";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " и ";
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
})() + "</b> тему";
return r;
},
"few" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> темы";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> тем";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " этого пользователя, а так же удалить его учётную запись, добавить его IP-адрес <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b> и его почтовый адрес <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> в чёрный список. Вы действительно уверены, что этот пользователь - спамер?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "В этой теме ";
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
})() + " сообщение";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " сообщения";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " сообщений";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "с высоким рейтингом симпатий";
return r;
},
"med" : function(d){
var r = "";
r += "с очень высоким рейтингом симпатий";
return r;
},
"high" : function(d){
var r = "";
r += "с чрезвычайно высоким рейтингом симпатий";
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
r += "Вы собираетесь удалить ";
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
})() + " сообщение";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " сообщения";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " сообщений";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " и ";
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
})() + " тему";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " темы";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " тем";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ru"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Вы уверены?";
return r;
}};
MessageFormat.locale.ru = function (n) {
  var r10 = n % 10, r100 = n % 100;

  if (r10 == 1 && r100 != 11)
    return 'one';

  if (r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) && n == Math.floor(n))
    return 'few';

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

I18n.translations = {"ru":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Байт","few":"Байта","many":"Байт","other":"Байт"},"gb":"ГБ","kb":"КБ","mb":"МБ","tb":"ТБ"}}},"short":{"thousands":"%{number} тыс.","millions":"%{number} млн."}},"dates":{"time":"HH:mm","time_with_zone":"HH:mm (местное)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"D MMM","full_no_year_no_time":"D MMM","long_with_year":"D MMM YYYY, HH:mm","long_with_year_no_time":"D MMM, YYYY","full_with_year_no_time":"LL","long_date_with_year":"D MMM YY, LT","long_date_without_year":"D MMM, LT","long_date_with_year_without_time":"D MMM YYYY","long_date_without_year_with_linebreak":"D MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D MMM YYYY \u003cbr/\u003eLT","wrap_ago":"%{date} назад","tiny":{"half_a_minute":"\u003c 1мин","less_than_x_seconds":{"one":"\u003c %{count}сек","few":"\u003c %{count}сек","many":"\u003c %{count}сек","other":"\u003c %{count}с"},"x_seconds":{"one":"%{count}с","few":"%{count}с","many":"%{count}с","other":"%{count}с"},"less_than_x_minutes":{"one":"\u003c %{count}мин","few":"~ 1m","many":"\u003e 1m","other":"\u003c %{count}мин"},"x_minutes":{"one":"%{count}мин","few":"%{count}мин","many":"%{count}мин","other":"%{count}мин"},"about_x_hours":{"one":"%{count}ч","few":"%{count}ч","many":"%{count}ч","other":"%{count}ч"},"x_days":{"one":"%{count}д","few":"%{count}д","many":"%{count}д","other":"%{count}д"},"x_months":{"one":"%{count} мес","few":"%{count}мес","many":"%{count}мес","other":"%{count}мес"},"about_x_years":{"one":"%{count}год","few":"%{count}года","many":"%{count}лет","other":"%{count}лет"},"over_x_years":{"one":"\u003e %{count} года","few":"\u003e %{count} лет","many":"\u003e %{count} лет","other":"\u003e %{count} лет"},"almost_x_years":{"one":"%{count} год","few":"%{count} года","many":"%{count} лет","other":"%{count} лет"},"date_month":"D MMM","date_year":"MMM YYYY"},"medium":{"x_minutes":{"one":"%{count} мин","few":"%{count} мин","many":"%{count} мин","other":"%{count} мин"},"x_hours":{"one":"%{count} час","few":"%{count} часа","many":"%{count} часов","other":"%{count} часов"},"x_days":{"one":"%{count} день","few":"%{count} дня","many":"%{count} дней","other":"%{count} дней"},"date_year":"D MMM, YYYY"},"medium_with_ago":{"x_minutes":{"one":"%{count} мин. назад","few":"%{count} мин. назад","many":"%{count} мин. назад","other":"%{count} мин. назад"},"x_hours":{"one":"%{count} ч. назад","few":"%{count} ч. назад","many":"%{count} ч. назад","other":"%{count} ч. назад"},"x_days":{"one":"%{count} дн. назад","few":"%{count} дн. назад","many":"%{count} дн. назад","other":"%{count} дн. назад"},"x_months":{"one":"%{count} мес. назад","few":"%{count} мес. назад","many":"%{count} мес. назад","other":"%{count} мес. назад"},"x_years":{"one":"%{count} г. назад","few":"%{count} г. назад","many":"%{count} г. назад","other":"%{count} г. назад"}},"later":{"x_days":{"one":"%{count} день спустя","few":"%{count} дня спустя","many":"%{count} дней спустя","other":"%{count} дней спустя"},"x_months":{"one":"%{count} месяц спустя","few":"%{count} месяца спустя","many":"%{count} месяцев спустя","other":"%{count} месяцев спустя"},"x_years":{"one":"%{count} год спустя","few":"%{count} года спустя","many":"%{count} лет спустя","other":"%{count} лет спустя"}},"previous_month":"Предыдущий месяц","next_month":"Следующий месяц","placeholder":"дата"},"share":{"topic_html":"Тема: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"сообщение #%{postNumber}","close":"закрыть","twitter":"Поделиться в Твиттере","facebook":"Поделиться в Фейсбуке","email":"Отправить по электронной почте","url":"Копировать и поделиться ссылкой"},"action_codes":{"public_topic":"Сделал эту тему публичной %{when}","private_topic":"Сделал эту тему личным сообщением %{when}","split_topic":"Разделил эту тему %{when}","invited_user":"Пригласил %{who} %{when}","invited_group":"Пригласил %{who} %{when}","user_left":"%{who} удалил себя из этого сообщения %{when}","removed_user":"Исключил %{who} %{when}","removed_group":"Исключил %{who} %{when}","autobumped":"Автоматически поднято %{when}","autoclosed":{"enabled":"Закрыл тему %{when}","disabled":"Открыл тему %{when}"},"closed":{"enabled":"Закрыл тему %{when}","disabled":"Открыл тему %{when}"},"archived":{"enabled":"Заархивировал тему %{when}","disabled":"Разархивировал тему %{when}"},"pinned":{"enabled":"Закрепил тему %{when}","disabled":"Открепил тему %{when}"},"pinned_globally":{"enabled":"Закрепил тему глобально %{when}","disabled":"Открепил тему глобально %{when}"},"visible":{"enabled":"Включил отображение темы %{when}","disabled":"Выключил отображение темы %{when}"},"banner":{"enabled":"Создал объявление %{when}. Оно будет отображаться вверху каждой страницы пока пользователь не закроет его.","disabled":"Удалил объявление %{when}. Оно больше не будет отображаться в верхней части каждой страницы."},"forwarded":"Переадресовал вышеуказанное письмо"},"topic_admin_menu":"Действия администратора над темой","wizard_required":"Добро пожаловать в ваш новый Discourse! Начните с \u003ca href='%{url}' data-auto-route='true'\u003eмастера настройки\u003c/a\u003e ✨","emails_are_disabled":"Все исходящие письма были глобально отключены администратором. Уведомления любого вида не будут отправляться на почту.","bootstrap_mode_enabled":{"one":"Для скорейшего развития вашего нового сайта был включен специальный режим его работы. В этом режиме всем новым пользователям при регистрации автоматически присваивается 1-й уровень доверия и включается ежедневная почтовая рассылка сводки новостей. Этот режим будет автоматически выключен, как только количество зарегистрированных пользователей достигнет %{count}.","few":"Для скорейшего развития вашего нового сайта был включен специальный режим его работы. В этом режиме всем новым пользователям при регистрации автоматически присваивается 1-й уровень доверия и включается ежедневная почтовая рассылка сводки новостей. Этот режим будет автоматически выключен, как только количество зарегистрированных пользователей достигнет %{count}.","many":"Для скорейшего развития вашего нового сайта был включен специальный режим его работы. В этом режиме всем новым пользователям при регистрации автоматически присваивается 1-й уровень доверия и включается ежедневная почтовая рассылка сводки новостей. Этот режим будет автоматически выключен, как только количество зарегистрированных пользователей достигнет %{count}.","other":"Для скорейшего развития вашего нового сайта был включен специальный режим его работы. В этом режиме всем новым пользователям при регистрации автоматически присваивается 1-й уровень доверия и включается ежедневная почтовая рассылка сводки новостей. Этот режим будет автоматически выключен, как только количество зарегистрированных пользователей достигнет %{count}."},"bootstrap_mode_disabled":"Специальный режим будет отключён в течение 24 часов.","themes":{"default_description":"По умолчанию","broken_theme_alert":"Ваш сайт может не работать, потому что в теме / компоненте %{theme} есть ошибки. Отключить это в %{path}."},"s3":{"regions":{"ap_northeast_1":"Asia Pacific (Tokyo)","ap_northeast_2":"Asia Pacific (Seoul)","ap_south_1":"Asia Pacific (Mumbai)","ap_southeast_1":"Asia Pacific (Singapore)","ap_southeast_2":"Asia Pacific (Sydney)","ca_central_1":"Канада (Центральная)","cn_north_1":"China (Beijing)","cn_northwest_1":"China (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"ЕС (Стокгольм)","eu_west_1":"EU (Ирландия)","eu_west_2":"EU (Лондон)","eu_west_3":"EU (Париж)","sa_east_1":"Южная Америка (Сан-Паулу)","us_east_1":"US East (Сев. Вирджиния)","us_east_2":"US East (Огайо)","us_gov_east_1":"AWS GovCloud (США-Восток)","us_gov_west_1":"AWS GovCloud (США-Запад)","us_west_1":"US West (Сев. Калифорния)","us_west_2":"US West (Орегон)"}},"clear_input":"Очистить","edit":"Отредактировать название и раздел темы","expand":"Развернуть","not_implemented":"Извините, эта функция ещё не реализована!","no_value":"Нет","yes_value":"Да","submit":"Отправить","generic_error":"Извините, произошла ошибка.","generic_error_with_reason":"Произошла ошибка: %{error}","go_ahead":"Продолжить","sign_up":"Регистрация","log_in":"Вход","age":"Возраст","joined":"Зарегистрировался","admin_title":"Админка","show_more":"Показать ещё","show_help":"Расширенный поиск","links":"Ссылки","links_lowercase":{"one":"ссылка","few":"ссылки","many":"ссылок","other":"ссылок"},"faq":"Правила","guidelines":"Основные принципы сообщества","privacy_policy":"Политика конфиденциальности","privacy":"Конфиденциальность","tos":"Пользовательское соглашение","rules":"Правила","conduct":"Кодекс поведения","mobile_view":"Для мобильных устройств","desktop_view":"Для настольных устройств","you":"Вы","or":"или","now":"только что","read_more":"читать дальше","more":"Больше","less":"Меньше","never":"никогда","every_30_minutes":"каждые 30 минут","every_hour":"каждый час","daily":"ежедневно","weekly":"еженедельно","every_month":"каждый месяц","every_six_months":"каждые шесть месяцев","max_of_count":"%{count} макс.","alternation":"или","character_count":{"one":"%{count} буква","few":"%{count} буквы","many":"%{count} букв","other":"%{count} букв"},"related_messages":{"title":"Связанные сообщения","see_all":"Показать \u003ca href=\"%{path}\"\u003eвсе сообщения\u003c/a\u003e от @%{username}..."},"suggested_topics":{"title":"Похожие темы","pm_title":"Похожие сообщения"},"about":{"simple_title":"О форуме","title":"Информация о %{title}","stats":"Статистика сайта","our_admins":"Наши администраторы","our_moderators":"Наши модераторы","moderators":"Модераторы","stat":{"all_time":"За всё время","last_7_days":"7 дней","last_30_days":"30 дней"},"like_count":"Симпатии","topic_count":"Темы","post_count":"Сообщения","user_count":"Пользователи","active_user_count":"Активные пользователи","contact":"Контакты","contact_info":"В случае возникновения критической ошибки или срочного дела, касающегося этого сайта, свяжитесь с нами по адресу %{contact_info}."},"bookmarked":{"title":"Закладки","clear_bookmarks":"Очистить закладки","help":{"bookmark":"Добавить в закладки первое сообщение этой темы","unbookmark":"Удалить все закладки в этой теме","unbookmark_with_reminder":"Нажмите для удаления всех закладок и напоминаний в этой теме. У вас уже есть напоминание для этой темы, настроенное на %{reminder_at}."}},"bookmarks":{"created":"Вы добавили это сообщение в закладки под именем '%{name}'","not_bookmarked":"Добавить сообщение в закладки","created_with_reminder":"Вы добавили это сообщение в закладки под именем '%{name}' с последующим напоминанием %{date}","remove":"Удаление закладки","delete":"Удалить закладку","confirm_delete":"Вы действительно хотите удалить эту закладку? Напоминание также будет удалено.","confirm_clear":"Вы действительно хотите удалить все ваши закладки из этой темы?","save":"Сохранить","no_timezone":"Укажите ваш часовой пояс \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eв настройках своей учётной записи\u003c/a\u003e, чтобы активировать функцию напоминаний.","invalid_custom_datetime":"Неверно указаны дата и время, попробуйте ещё раз.","list_permission_denied":"У вас недостаточно прав для просмотра закладок этого пользователя.","no_user_bookmarks":"У вас нет сообщений, помеченных закладками; закладки позволяют быстро переходить к определённым сообщениям.","auto_delete_preference":{"label":"Автоматически удалить закладку","never":"Никогда","when_reminder_sent":"После отправки напоминания","on_owner_reply":"После моего ответа в этой теме"},"search_placeholder":"Поиск закладок по имени, названию темы или по содержанию сообщения","search":"Поиск","reminders":{"later_today":"Сегодня, но позже","next_business_day":"На следующий рабочий день","tomorrow":"Завтра","next_week":"Через неделю","post_local_date":"Дата сообщения","later_this_week":"Позже на этой неделе","start_of_next_business_week":"В понедельник","start_of_next_business_week_alt":"В следующий понедельник","next_month":"Через месяц","custom":"Установить дату и время напоминания","last_custom":"Использовать ранее установленные дату и время","none":"Не настраивать напоминание","today_with_time":"сегодня в %{time}","tomorrow_with_time":"завтра в %{time}","at_time":"%{date_time}","existing_reminder":"Для этой закладки уже настроено напоминание, которое будет отправлено %{at_date_time}"}},"copy_codeblock":{"copied":"Скопировано!"},"drafts":{"resume":"Продолжить","remove":"Удалить","remove_confirmation":"Вы действительно хотите удалить этот черновик?","new_topic":"Черновик новой темы","new_private_message":"Черновик нового личного сообщения","topic_reply":"Черновик ответа","abandon":{"confirm":"В этой теме найден ваш незавершённый черновик сообщения. Хотите от него отказаться?","yes_value":"Да, удалить","no_value":"Нет, сохранить"}},"topic_count_latest":{"one":"Есть %{count} новая или обновлённая тема","few":"Есть %{count} новых или обновлённых темы","many":"Есть %{count} новых или обновлённых тем","other":"Есть %{count} новых или обновлённых тем"},"topic_count_unread":{"one":"Посмотреть %{count} непрочитанную тему","few":"Посмотреть %{count} непрочитанные темы","many":"Посмотреть %{count} непрочитанных тем","other":"Посмотреть %{count} непрочитанных тем"},"topic_count_new":{"one":"Посмотреть %{count} новую тему","few":"Посмотреть %{count} новые темы","many":"Посмотреть %{count} новых тем","other":"Посмотреть %{count} новых тем"},"preview":"Предпросмотр","cancel":"Отмена","deleting":"Удаление...","save":"Сохранить","saving":"Сохранение...","saved":"Сохранено!","upload":"Загрузить","uploading":"Загрузка...","uploading_filename":"Загрузка %{filename}","clipboard":"буфер обмена","uploaded":"Загружено!","pasting":"Вставка...","enable":"Включить","disable":"Отключить","continue":"Продолжать","undo":"Отменить","revert":"Вернуть","failed":"Проблема","switch_to_anon":"Войти в анонимный режим","switch_from_anon":"Выйти из анонимного режима","banner":{"close":"Больше не показывать это объявление.","edit":"Редактировать это объявление \u003e\u003e"},"pwa":{"install_banner":"Хотите ли вы \u003ca href\u003e установить %{title} на это устройство?\u003c/a\u003e"},"choose_topic":{"none_found":"Не найдено ни одной темы.","title":{"search":"Поиск темы по названию, url или id:","placeholder":"Введите название темы"}},"choose_message":{"none_found":"Совпадений не найдено.","title":{"search":"Поиск в личных сообщениях","placeholder":"Введите заголовок сообщения, url или id"}},"review":{"order_by":"Сортировать по","in_reply_to":"Посмотреть обсуждение","explain":{"why":"Объяснить, почему этот элемент оказался в очереди","title":"Оценка содержимого","formula":"Формула","subtotal":"Промежуточный итог","total":"Всего","min_score_visibility":"Минимальная оценка для показа сообщения","score_to_hide":"Оценка, чтобы скрыть сообщение","take_action_bonus":{"name":"принята мера","title":"Когда сотрудник решает принять меры, жалоба получает бонус."},"user_accuracy_bonus":{"name":"точность пользователя","title":"Пользователи, чьи жалобы были удовлетворены, получают бонус."},"trust_level_bonus":{"name":"Уровень доверия","title":"Элементы, проверяемые пользователями с более высоким уровнем доверия, имеют более высокий балл."},"type_bonus":{"name":"тип бонуса","title":"Некоторые проверяемые типы могут быть назначены бонус сотрудниками, чтобы сделать их более приоритетными."}},"claim_help":{"optional":"Вы можете зарезервировать этот контент за собой, чтобы другие не могли заняться его модерацией.","required":"Вы должны зарезервировать контент за собой, прежде чем заняться его модерацией.","claimed_by_you":"Вы зарезервировали этот контент за собой и можете смело заняться его модерацией.","claimed_by_other":"Этот контент может быть отмодерирован только пользователем \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"Зарезервировать эту тему за собой"},"unclaim":{"help":"Снять резервирование"},"awaiting_approval":"В ожидании подтверждения","delete":"Удалить","settings":{"saved":"Сохранено","save_changes":"Сохранить изменения","title":"Настройки","priorities":{"title":"Приоритеты проверяемых элементов"}},"moderation_history":"История модерации","view_all":"Просмотреть всё","grouped_by_topic":"Группировать по темам","none":"Нет элементов для премодерации.","view_pending":"Просмотр сообщений, ожидающих проверки","topic_has_pending":{"one":"В этой теме \u003cb\u003e%{count}\u003c/b\u003e сообщение ожидает проверки","few":"В этой теме \u003cb\u003e%{count}\u003c/b\u003e сообщения ожидают проверки","many":"В этой теме \u003cb\u003e%{count}\u003c/b\u003e сообщений ожидают проверки","other":"В этой теме \u003cb\u003e%{count}\u003c/b\u003e сообщений ожидают проверки"},"title":"Премодерация","topic":"Тема:","filtered_topic":"Вы отфильтровали проверяемый контент в рамках одной темы.","filtered_user":"Пользователь","filtered_reviewed_by":"Проверено","show_all_topics":"показать все темы","deleted_post":"(сообщение удалено)","deleted_user":"(пользователь удалён)","user":{"bio":"О себе","website":"Веб-сайт","username":"Псевдоним","email":"Email","name":"Имя","fields":"Поля","reject_reason":"Причина"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored}","few":"%{agreed}, %{disagreed}, %{ignored} (из %{count} жалоб)","many":"%{agreed}, %{disagreed}, %{ignored} (из %{count} жалоб)","other":"%{agreed}, %{disagreed}, %{ignored} (из %{count} жалоб)"},"agreed":{"one":"%{count}% согласие","few":"%{count}% согласия","many":"%{count}% согласий","other":"%{count}% согласий"},"disagreed":{"one":"%{count}% несогласие","few":"%{count}% несогласия","many":"%{count}% несогласий","other":"%{count}% несогласий"},"ignored":{"one":"%{count}% игнорирование","few":"%{count}% игнорирования","many":"%{count}% игнорирований","other":"%{count}% игнорирований"}},"topics":{"topic":"Тема","reviewable_count":"Количество","reported_by":"Жалоба от","deleted":"[Тема удалена]","original":"(оригинальная тема)","details":"подробности","unique_users":{"one":"%{count} пользователь","few":"%{count} пользователя","many":"%{count} пользователей","other":"%{count} пользователей"}},"replies":{"one":"%{count} ответ","few":"%{count} ответа","many":"%{count} ответов","other":"%{count} ответов"},"edit":"Редактировать","save":"Сохранить","cancel":"Отмена","new_topic":"После утверждения этого сообщения появится новая тема","filters":{"all_categories":"(все разделы)","type":{"title":"Тип","all":"(все типы)"},"minimum_score":"Минимальная оценка:","refresh":"Обновить","status":"Статус","category":"Раздел","orders":{"score":"Оценка","score_asc":"Оценка (обратная сортировка)","created_at":"Дата создания","created_at_asc":"Дата создания (обратная сортировка)"},"priority":{"title":"Минимальный приоритет:","low":"(любой)","medium":"Средний","high":"Высокий"}},"conversation":{"view_full":"Просмотреть всё обсуждение"},"scores":{"about":"Оценка рассчитывается на основе уровня доверия сообщающего, точности его предыдущих жалоб и приоритета сообщения.","score":"Оценка","date":"Дата","type":"Тип","status":"Статус","submitted_by":"Отправлено","reviewed_by":"Рассмотрено"},"statuses":{"pending":{"title":"В ожидании"},"approved":{"title":"Одобренные"},"rejected":{"title":"Отклонённые"},"ignored":{"title":"Проигнорированные"},"deleted":{"title":"Удалённые"},"reviewed":{"title":"(все рассмотренные)"},"all":{"title":"(все)"}},"types":{"reviewable_flagged_post":{"title":"На это сообщение поступила жалоба","flagged_by":"Кто пожаловался"},"reviewable_queued_topic":{"title":"Тема в очереди"},"reviewable_queued_post":{"title":"Сообщение в очереди"},"reviewable_user":{"title":"Пользователь"}},"approval":{"title":"Модерируемые сообщения","description":"Ваше сообщение получено, но требует проверки и утверждения модератором перед публикацией. Пожалуйста, будьте терпеливы.","pending_posts":{"one":"У вас \u003cstrong\u003e%{count}\u003c/strong\u003e сообщение в ожидании модерации.","few":"У вас \u003cstrong\u003e%{count}\u003c/strong\u003e сообщения в ожидании модерации.","many":"У вас \u003cstrong\u003e%{count}\u003c/strong\u003e сообщений в ожидании модерации.","other":"У вас \u003cstrong\u003e%{count}\u003c/strong\u003e сообщений в ожидании модерации."},"ok":"OK"},"example_username":"имя пользователя","reject_reason":{"title":"Почему вы отклоняете регистрацию этого пользователя?","send_email":"Отправить сообщение об отказе в регистрации"}},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e создал \u003ca href='%{topicUrl}'\u003eтему\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eВы\u003c/a\u003e создали \u003ca href='%{topicUrl}'\u003eтему\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e ответил(а) на сообщение \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eВы\u003c/a\u003e ответили на сообщение \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e ответил(а) в \u003ca href='%{topicUrl}'\u003eтеме\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eВы\u003c/a\u003e ответили в \u003ca href='%{topicUrl}'\u003eтеме\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e упомянул \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e упомянул\u003ca href='%{user2Url}'\u003eВас\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eВы\u003c/a\u003e упомянули \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Размещено пользователем \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Размещено \u003ca href='%{userUrl}'\u003eВами\u003c/a\u003e","sent_by_user":"Отправлено пользователем \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Отправлено \u003ca href='%{userUrl}'\u003eВами\u003c/a\u003e"},"directory":{"username":"Псевдоним","filter_name":"Фильтр по имени пользователя","title":"Пользователи","likes_given":"Выражено","likes_received":"Получено","topics_entered":"Просмотрено","topics_entered_long":"Просмотрено тем","time_read":"Время чтения","topic_count":"Тем","topic_count_long":"Тем создано","post_count":"Ответов","post_count_long":"Ответов написано","no_results":"Ничего не найдено.","days_visited":"Посещений","days_visited_long":"Дней посещения","posts_read":"Прочитано","posts_read_long":"Прочитано сообщений","last_updated":"Последнее обновление:","total_rows":{"one":"%{count} пользователь","few":"%{count} пользователя","many":"%{count} пользователей","other":"%{count} пользователей"}},"group_histories":{"actions":{"change_group_setting":"Настроить группу","add_user_to_group":"Добавить пользователя","remove_user_from_group":"Удалить пользователя","make_user_group_owner":"Сделать владельцем","remove_user_as_group_owner":"Лишить прав владельца"}},"groups":{"member_added":"Добавлено","member_requested":"По запросу на","add_members":{"title":"Добавить участников в группу %{group_name}","description":"Вы также можете вставить список участников (значения, разделённые запятыми).","usernames":"Введите псевдонимы или адреса электронной почты","input_placeholder":"Псевдонимы или электронные адреса","notify_users":"Уведомить пользователей"},"requests":{"title":"Запросы","reason":"Причина","accept":"Принять","accepted":"принято","deny":"Отказать","denied":"отказано","undone":"запрос отменён","handle":"обрабатывать запрос на вступление"},"manage":{"title":"Управление группой","name":"Имя","full_name":"Полное имя","add_members":"Добавить участника","delete_member_confirm":"Удалить '%{username}' из группы '%{group}' ?","profile":{"title":"Профиль"},"interaction":{"title":"Взаимодействие","posting":"Сообщения","notification":"Уведомления"},"email":{"title":"Email","status":"Синхронизированные %{old_emails} / %{total_emails}   электронные письма через IMAP.","credentials":{"title":"Учётная запись","smtp_server":"SMTP-сервер","smtp_port":"SMTP-порт","smtp_ssl":"Использовать SSL для SMTP","imap_server":"IMAP-сервер","imap_port":"IMAP-порт","imap_ssl":"Использовать SSL для IMAP","username":"Имя пользователя","password":"Пароль"},"mailboxes":{"synchronized":"Синхронизированный почтовый ящик","none_found":"В этой учётной записи электронной почты не найдено ни одного почтового ящика.","disabled":"отключён"}},"membership":{"title":"Участник","access":"Доступ"},"categories":{"title":"Разделы","long_title":"Стандартные уведомления разделов","description":"При добавлении пользователей в эту группу, в настройках уведомлений разделов будут установлены эти стандартные значения . При необходимости пользователи могут их изменить.","watched_categories_instructions":"Автоматически наблюдать все темы в этих разделах. Участники группы будут уведомлены обо всех новых сообщениях и темах, рядом с темой будет отображаться счётчик новых сообщений.","tracked_categories_instructions":"Автоматически отслеживать все темы в этих разделах. Рядом с темой будет отображаться счётчик новых сообщений.","watching_first_post_categories_instructions":"Пользователи будут уведомлены о первом сообщении каждой новой темы в этих разделах.","regular_categories_instructions":"Если уведомления для этих разделов отключены, то для участников группы они останутся включёнными. Пользователи будут уведомлены, если они будут упомянуты или кто-то ответит на их сообщение.","muted_categories_instructions":"Пользователи не будут получать уведомления о новых темах в этих разделах, темы не будут отображаться на страницах разделов или в перечне последних тем."},"tags":{"title":"Теги","long_title":"Стандартные уведомления тегов","description":"При добавлении пользователей в эту группу, в настройках уведомлений тегов будут установлены эти стандартные значения . При необходимости пользователи могут их изменить.","watched_tags_instructions":"Автоматически наблюдать все темы с этими тегами. Участники группы будут уведомлены обо всех новых сообщениях и темах, ядом с темой будет отображаться счётчик новых сообщений.","tracked_tags_instructions":"Автоматически отслеживать все темы с этими тегами. Рядом с темой будет отображаться счётчик новых сообщений.","watching_first_post_tags_instructions":"Пользователи будут уведомлены о первом сообщении каждой новой темы с этими тегами.","regular_tags_instructions":"Если это теги, выключающие уведомления, то на участников группы выключение уведомлений распространяться не будет. Пользователи будут уведомлены, если они будут упомянуты или кто-то ответит на их сообщение.","muted_tags_instructions":"Пользователи не будут получать уведомления о новых темах с этими тегами, темы не будут отображаться в перечне последних тем."},"logs":{"title":"Логи","when":"Когда","action":"Действие","acting_user":"Инициатор","target_user":"Целевой пользователь","subject":"Тема","details":"Подробности","from":"От","to":"Кому"}},"permissions":{"title":"Права доступа","none":"Нет разделов, связанных с этой группой.","description":"Участники этой группы имеют доступ к этим разделам"},"public_admission":"Разрешать пользователям свободно присоединяться к группе (требуется общедоступная группа)","public_exit":"Разрешать пользователям свободно покидать группу","empty":{"posts":"Участниками этой группы не создано ни одной записи.","members":"Нет участников в этой группе.","requests":"Для этой группы нет запросов на участие.","mentions":"Нет упоминаний этой группы.","messages":"Нет сообщений для этой группы.","topics":"Нет тем от участников этой группы.","logs":"Нет логов для этой группы."},"add":"Добавить","join":"Присоединиться","leave":"Покинуть","request":"Запрос","message":"Сообщение","confirm_leave":"Вы действительно хотите выйти из группы?","allow_membership_requests":"Разрешать пользователям отправлять запросы на вступление в группу владельцев (группа должна быть публичной)","membership_request_template":"Настраиваемый шаблон, который отображается пользователю при отправке запроса на вступление в группу","membership_request":{"submit":"Подтвердить запрос","title":"Запрос на вступление в группу %{group_name}","reason":"Расскажите владельцам группы почему вас стоило бы в неё добавить"},"membership":"Участник","name":"Название","group_name":"Название группы","user_count":"Пользователи","bio":"О группе","selector_placeholder":"введите псевдоним","owner":"владелец","index":{"title":"Группы","all":"Все группы","empty":"Нет видимых групп.","filter":"Фильтр по типу группы","owner_groups":"Мои группы","close_groups":"Закрытые группы","automatic_groups":"Автоматические группы","automatic":"Автоматические","closed":"Закрытые","public":"Публичные","private":"Приватные","public_groups":"Публичные группы","automatic_group":"Автоматическая группа","close_group":"Закрытая группа","my_groups":"Мои группы","group_type":"Тип группы","is_group_user":"Участник","is_group_owner":"Владелец"},"title":{"one":"Группа","few":"Группы","many":"Групп","other":"Групп"},"activity":"Активность","members":{"title":"Участники","filter_placeholder_admin":"псевдоним или e-mail","filter_placeholder":"псевдоним","remove_member":"Удалить пользователя","remove_member_description":"Удалить \u003cb\u003e%{username}\u003c/b\u003e из группы","make_owner":"Сделать владельцем","make_owner_description":"Сделать \u003cb\u003e%{username}\u003c/b\u003e владельцем этой группы","remove_owner":"Удалить владельца","remove_owner_description":"Удалить \u003cb\u003e%{username}\u003c/b\u003e как владельца этой группы","owner":"Владелец","forbidden":"Вы не можете просматривать участников."},"topics":"Темы","posts":"Сообщения","mentions":"Упоминания","messages":"Сообщения","notification_level":"Уровень уведомлений по умолчанию для сообщений группы","alias_levels":{"mentionable":"Кто может @упоминать эту группу?","messageable":"Кто может отправить соощение в эту группу?","nobody":"Никто","only_admins":"Только администраторы","mods_and_admins":"Только модераторы и администраторы","members_mods_and_admins":"Только участники группы, модераторы и администраторы","owners_mods_and_admins":"Только владельцы групп, модераторы и администраторы","everyone":"Все"},"notifications":{"watching":{"title":"Наблюдать","description":"Уведомлять по каждому ответу на это сообщение и показывать счётчик новых непрочитанных ответов."},"watching_first_post":{"title":"Наблюдать за первым сообщением","description":"Вы будете получать уведомления о новых сообщениях в этой группе, но не ответы на сообщения."},"tracking":{"title":"Следить","description":"Вы будете уведомлены если кто-то упомянет ваше @name или ответит вам. А так же вам будет показано общее количество новых ответов"},"regular":{"title":"Уведомлять","description":"Вам придёт уведомление, если кто-нибудь упомянет ваш @псевдоним или ответит вам."},"muted":{"title":"Выключено","description":"Вы не будете получать уведомления о сообщениях в этой группе."}},"flair_url":"Иконка на аватаре","flair_upload_description":"Используйте квадратные картинки размером не менее чем 20х20 пикселей.","flair_bg_color":"Фоновый цвет аватара","flair_bg_color_placeholder":"(Необязательно) Hex-код цвета","flair_color":"Цвет аватара","flair_color_placeholder":"(Необязательно) Hex-код цвета","flair_preview_icon":"Иконка предпросмотра","flair_preview_image":"Изображение предпросмотра","flair_type":{"icon":"Выбрать иконку","image":"Загрузить картинку"}},"user_action_groups":{"1":"Симпатии","2":"Симпатии","3":"Закладки","4":"Темы","5":"Сообщения","6":"Ответы","7":"Упоминания","9":"Цитаты","11":"Изменения","12":"Отправленные","13":"Входящие","14":"Ожидают одобрения","15":"Черновики"},"categories":{"all":"Все разделы","all_subcategories":"Все","no_subcategory":"Нет подраздела","category":"Раздел","category_list":"Показать список разделов","reorder":{"title":"Упорядочивание разделов","title_long":"Реорганизация списка разделов","save":"Сохранить порядок","apply_all":"Применить","position":"Порядковый номер"},"posts":"Сообщения","topics":"Темы","latest":"Последние","latest_by":"последние от","toggle_ordering":"изменить сортировку","subcategories":"Подразделы","muted":"Разделы с отключёнными уведомлениями","topic_sentence":{"one":"%{count} тема","few":"%{count} темы","many":"%{count} тем","other":"%{count} тем"},"topic_stat_sentence_week":{"one":"%{count} новая тема на прошлой неделе.","few":"%{count} новых темы на прошлой неделе.","many":"%{count} новых тем на прошлой неделе.","other":"%{count}новых тем на прошлой неделе."},"topic_stat_sentence_month":{"one":"%{count} новая тема в прошлом месяце.","few":"%{count} новых темы в прошлом месяце.","many":"%{count} новых тем в прошлом месяце.","other":"%{count} новых тем в прошлом месяце."},"n_more":"Разделы (ещё %{count})..."},"ip_lookup":{"title":"Поиск IP-адреса","hostname":"Название хоста","location":"Расположение","location_not_found":"(расположение неизвестно)","organisation":"Организация","phone":"Телефон","other_accounts":"Другие учётные записи с этим IP-адресом:","delete_other_accounts":"Удалить %{count}","username":"псевдоним","trust_level":"Уровень доверия","read_time":"время чтения","topics_entered":"посещено тем","post_count":"сообщений","confirm_delete_other_accounts":"Вы действительно хотите удалить эти учётные записи?","powered_by":"Данные получены при помощи \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"скопировано"},"user_fields":{"none":"(выберите)","required":"Пожалуйста, введите значение для \"%{name}\""},"user":{"said":"%{username}:","profile":"Профиль","mute":"Отключить","edit":"Настройки","download_archive":{"button_text":"Скачать всё","confirm":"Вы действительно хотите скачать свои сообщения?","success":"Скачивание началось, вы будете уведомлены об окончании процесса.","rate_limit_error":"Сообщения могут быть скачаны лишь раз в день, попробуйте завтра."},"new_private_message":"Новое сообщение","private_message":"Личное сообщение","private_messages":"Личные сообщения","user_notifications":{"filters":{"filter_by":"Фильтр","all":"Все","read":"Прочитанные","unread":"Непрочитанные"},"ignore_duration_title":"Игнорировать пользователя","ignore_duration_username":"Псевдоним","ignore_duration_when":"Продолжительность:","ignore_duration_save":"Игнорировать","ignore_duration_note":"Обратите внимание, что все игнорирования автоматически удаляются по истечении времени игнорирования.","ignore_duration_time_frame_required":"Пожалуйста, выберите периоды времени","ignore_no_users":"У вас нет игнорируемых пользователей.","ignore_option":"Игнорировать","ignore_option_title":"Вы не будете получать уведомления, связанные с этим пользователем, и все его темы и ответы будут скрыты.","add_ignored_user":"Добавить...","mute_option":"Не уведомлять","mute_option_title":"Вы не будете получать никаких уведомлений, связанных с этим пользователем.","normal_option":"Нормальный","normal_option_title":"Вы будете уведомлены, если этот пользователь ответит вам, процитирует или упомянет вас."},"notification_schedule":{"title":"Расписание уведомлений","label":"Включить расписание уведомлений","tip":"Вне указанных здесь часов автоматически включается режим 'Не беспокоить'.","midnight":"Полночь","none":"Отсутствует","monday":"Понедельник","tuesday":"Вторник","wednesday":"Среда","thursday":"Четверг","friday":"Пятница","saturday":"Суббота","sunday":"Воскресенье","to":"-"},"activity_stream":"Активность","preferences":"Настройки","feature_topic_on_profile":{"open_search":"Выберите тему","title":"Выбор темы","search_label":"Поиск темы по её названию","save":"Сохранить","clear":{"title":"Очистить","warning":"Перестать считать эту тему избранной?"}},"use_current_timezone":"Использовать автоопределение часового пояса.","profile_hidden":"Публичный профиль пользователя скрыт","expand_profile":"Развернуть","collapse_profile":"Свернуть","bookmarks":"Закладки","bio":"Обо мне","timezone":"Часовой пояс","invited_by":"Приглашён","trust_level":"Уровень доверия","notifications":"Уведомления","statistics":"Статистика","desktop_notifications":{"label":"Уведомления","not_supported":"К сожалению, уведомления не поддерживаются этим браузером.","perm_default":"Включить уведомления","perm_denied_btn":"Доступ запрещён","perm_denied_expl":"Вы запретили уведомления в вашем браузере. Вначале разрешите уведомления в настройках браузера, а затем попробуйте ещё раз.","disable":"Отключить уведомления","enable":"Включить уведомления","each_browser_note":"Примечание: Вам необходимо изменить этот параметр в каждом используемом браузере. Во время действия режима 'Не беспокоить' все уведомления, касающиеся форума, будут отключены, вне зависимости от значения этого параметра.","consent_prompt":"Вы хотите получать уведомления в реальном времени, когда люди отвечают на ваши сообщения?"},"dismiss":"Пометить прочитанными","dismiss_notifications":"Отклонить всё","dismiss_notifications_tooltip":"Пометить все непрочитанные уведомления прочитанными","first_notification":"Ваше первое уведомление! Выберите его, чтобы начать.","dynamic_favicon":"Показывать количество на значке браузера","skip_new_user_tips":{"description":"Не выдавать награды и не показывать советы новым пользователям","not_first_time":"Не в первый раз?","skip_link":"Пропустить эти советы"},"theme_default_on_all_devices":"Сделать эту тему темой по умолчанию на всех моих устройствах","color_scheme_default_on_all_devices":"Установить цветовую схему по умолчанию на всех моих устройствах","color_scheme":"Цветовая схема","color_schemes":{"default_description":"Тема по умолчанию","disable_dark_scheme":"То же самое, что и обычный","dark_instructions":"Вы можете просмотреть цветовую схему тёмного режима, переключив тёмный режим вашего устройства.","undo":"Сбросить","regular":"Обычная","dark":"Тёмный режим","default_dark_scheme":"(цветовая схема по умолчанию)"},"dark_mode":"Тёмный режим","dark_mode_enable":"Включить тёмный режим","text_size_default_on_all_devices":"Сделать это размер текста размером по умолчанию на всех моих устройствах","allow_private_messages":"Разрешить другим пользователям отправлять мне личные сообщения","external_links_in_new_tab":"Открывать все внешние ссылки в новой вкладке","enable_quoting":"Разрешить отвечать с цитированием выделенного текста","enable_defer":"Включить кнопку 'Отложить', чтобы помечать темы как непрочитанные","change":"изменить","featured_topic":"Избранная тема:","moderator":"%{user} — модератор","admin":"%{user} — админ","moderator_tooltip":"Модератор","admin_tooltip":"Администратор","silenced_tooltip":"Этот пользователь заблокирован","suspended_notice":"Пользователь заморожен до %{date}.","suspended_permanently":"Этот пользователь заморожен.","suspended_reason":"Причина: ","github_profile":"GitHub","email_activity_summary":"Сводка активности","mailing_list_mode":{"label":"Режим почтовой рассылки","enabled":"Включить почтовую рассылку","instructions":"Настройки почтовой рассылки перекрывают настройки сводки активности.\u003cbr /\u003e\nТемы и разделы с выключенными уведомлениями не будут включены в письма рассылки.\n","individual":"Присылать письмо для каждого нового сообщения","individual_no_echo":"Присылать письмо по каждому новому сообщению, кроме моих собственных","many_per_day":"Присылать письмо для каждого нового сообщения (примерно %{dailyEmailEstimate} в день)","few_per_day":"Присылать письмо для каждого нового сообщения (примерно 2 в день)","warning":"Включён режим почтовой рассылки. Настройки email-уведомлений переопределены."},"tag_settings":"Теги","watched_tags":"Наблюдающие","watched_tags_instructions":"Вы будете автоматически наблюдать все темы, если тема помечена такими тегами. Вам будут приходить уведомления о новых сообщениях и темах, рядом с темой будет отображено количество новых сообщений.","tracked_tags":"Следящие","tracked_tags_instructions":"Вы будете автоматически отслеживать все темы, если тема помечена такими тегами. Рядом с темой будет отображено количество новых сообщений.","muted_tags":"Выключающие","muted_tags_instructions":"Вы не будете получать уведомления о новых темах, если тема помечена этими тегами. Также эти темы не будут показываться во вкладке 'Непрочитанные'.","watched_categories":"Наблюдаемые","watched_categories_instructions":"Вы будете автоматически наблюдать все темы в этих разделах. Вам будут приходить уведомления о новых сообщениях и темах, рядом со списком тем будет отображено количество новых сообщений.","tracked_categories":"Отслеживаемые","tracked_categories_instructions":"Вы будете автоматически отслеживать все темы в этих разделах. Рядом с темой будет отображено количество новых сообщений.","watched_first_post_categories":"Отслеживаемые по первому сообщению","watched_first_post_categories_instructions":"Уведомлять только о первом сообщении в каждой новой теме в этих разделах.","watched_first_post_tags":"Отслеживающие первое сообщение","watched_first_post_tags_instructions":"Вы будете получать уведомления о новых темах с одним сообщением, если тема помечена такими тегами.","muted_categories":"Выключенные","muted_categories_instructions":"Не уведомлять меня о новых темах в этих разделах и не показывать новые темы на странице 'Непрочитанные'.","muted_categories_instructions_dont_hide":"Вы не будете уведомлены о новых темах в этих разделах.","regular_categories":"Активный","regular_categories_instructions":"Вы будете видеть эти разделы в секциях 'Последние' и 'Обсуждаемые'.","no_category_access":"Как модератор Вы ограничены в доступе к разделу, сохранения отклонены.","delete_account":"Удалить мою учётную запись","delete_account_confirm":"Вы действительно хотите удалить свою учётную запись? Отменить удаление будет невозможно!","deleted_yourself":"Ваша учётная запись была успешно удалена.","delete_yourself_not_allowed":"Пожалуйста, свяжитесь с администрацией сайта, если хотите удалить свой аккаунт.","unread_message_count":"Сообщения","admin_delete":"Удалить","users":"Пользователи","muted_users":"Выключенные","muted_users_instructions":"Игнорировать все уведомления и личные сообщения от этих пользователей.","allowed_pm_users":"Разрешённые","allowed_pm_users_instructions":"Разрешать личные сообщения только от этих пользователей.","allow_private_messages_from_specific_users":"Разрешить отправлять мне личные сообщения только определённым пользователям","ignored_users":"Игнорируемые","ignored_users_instructions":"Игнорировать все сообщения, уведомления и личные сообщения от этих пользователей.","tracked_topics_link":"Показать","automatically_unpin_topics":"Автоматически откреплять темы после прочтения","apps":"Приложения","revoke_access":"Лишить прав доступа","undo_revoke_access":"Отменить лишение прав доступа","api_approved":"Подтверждено:","api_last_used_at":"Последнее использование:","theme":"Тема","save_to_change_theme":"Тема будет обновлена после нажатия на кнопку '%{save_text}'.","home":"Домашняя страница по умолчанию","staged":"Сымитированный","staff_counters":{"flags_given":"Полезные жалобы","flagged_posts":"Сообщения с жалобами","deleted_posts":"Удалённые сообщения","suspensions":"приостановки","warnings_received":"Предупреждения","rejected_posts":"Отклонённые сообщения"},"messages":{"all":"Все","inbox":"Входящие","sent":"Отправленные","archive":"Архив","groups":"Мои группы","bulk_select":"Выбрать сообщения","move_to_inbox":"Переместить во входящие","move_to_archive":"Архив","failed_to_move":"Невозможно переместить выделенные сообщения (возможно, у вас проблемы с сетевым подключением)","select_all":"Выбрать всё","tags":"Теги"},"preferences_nav":{"account":"Учётная запись","profile":"Профиль","emails":"Почта","notifications":"Уведомления","categories":"Разделы","users":"Пользователи","tags":"Теги","interface":"Интерфейс","apps":"Приложения"},"change_password":{"success":"(письмо отправлено)","in_progress":"(отправка письма)","error":"(ошибка)","emoji":"lock emoji","action":"Отправить письмо для сброса пароля","set_password":"Установить пароль","choose_new":"Выберите новый пароль","choose":"Выберите пароль"},"second_factor_backup":{"title":"Резервные коды двухфакторной аутентификации","regenerate":"Сгенерировать заново","disable":"Отключить","enable":"Включить","enable_long":"Включить резервные коды","manage":{"one":"Управление резервными кодами. У вас остался \u003cstrong\u003e%{count}\u003c/strong\u003e резервный код.","few":"Управление резервными кодами. У вас осталось \u003cstrong\u003e%{count}\u003c/strong\u003e резервных кода.","many":"Управление резервными кодами. У вас осталось \u003cstrong\u003e%{count}\u003c/strong\u003e резервных кодов.","other":"Управление резервными кодами. У вас осталось \u003cstrong\u003e%{count}\u003c/strong\u003e резервных кодов."},"copy_to_clipboard":"Скопировать в буфер","copy_to_clipboard_error":"Ошибка при копировании данных в буфер обмена","copied_to_clipboard":"Скопировано в буфер","download_backup_codes":"Скачать резервные коды","remaining_codes":{"one":"У вас остался \u003cstrong\u003e%{count}\u003c/strong\u003eрезервный код","few":"У вас осталось \u003cstrong\u003e%{count}\u003c/strong\u003eрезервных кода","many":"У вас осталось \u003cstrong\u003e%{count}\u003c/strong\u003eрезервных кодов","other":"У вас осталось \u003cstrong\u003e%{count}\u003c/strong\u003eрезервных кодов"},"use":"Используйте резервный код","enable_prerequisites":"Вы должны включить основной двухфакторный метод перед генерацией резервных кодов.","codes":{"title":"Резервные коды созданы","description":"Каждый из этих резервных кодов может быть использован только один раз. Храните их в безопасности."}},"second_factor":{"title":"Двухфакторная аутентификация","enable":"Управление двухфакторной аутентификацией","disable_all":"Отключить всё","forgot_password":"Забыли пароль?","confirm_password_description":"Подтвердите ваш пароль, чтобы продолжить","name":"Имя","label":"Код","rate_limit":"Пожалуйста, подождите, прежде чем попробовать другой код аутентификации.","enable_description":"Сканируйте этот QR-код в поддерживаемых приложениях (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) и введите свой код аутентификации.\n","disable_description":"Пожалуйста, введите код аутентификации из вашего приложения","show_key_description":"Введите вручную","short_description":"Защитите свой аккаунт одноразовыми кодами безопасности.\n","extended_description":"Двухфакторная аутентификация повышает безопасность вашей учётной записи, требуя одноразовый токен в дополнение к вашему паролю. Токены могут быть сгенерированы на устройствах \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e и \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e.\n","oauth_enabled_warning":"Обратите внимание, что социальные логины будут отключены после включения двухфакторной аутентификации в вашей учётной записи.","use":"Используйте приложение Authenticator","enforced_notice":"Вы должны включить двухфакторную аутентификацию перед тем как зайти на этот сайт.","disable":"Отключить","disable_confirm":"Вы действительно хотите отключить все двухфакторные методы?","save":"Сохранить","edit":"Редактировать","edit_title":"Изменить аутентификатор","edit_description":"Имя аутентификатора","enable_security_key_description":"Когда вы подготовите свой \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003eфизический ключ безопасности\u003c/a\u003e, нажмите на кнопку \"Регистрация\", расположенную  ниже.\n","totp":{"title":"Токен-аутентификация","add":"Добавить аутентификатор","default_name":"Мой аутентификатор","name_and_code_required_error":"Вы должны указать токен и его имя"},"security_key":{"register":"Зарегистрироваться","title":"Ключи безопасности","add":"Добавить ключ безопасности","default_name":"Главный ключ безопасности","not_allowed_error":"Время регистрации ключа безопасности истекло или регистрация была отменена.","already_added_error":"Вы уже зарегистрировали этот ключ безопасности. Вам не нужно регистрировать его снова.","edit":"Изменить ключ безопасности","save":"Сохранить","edit_description":"Имя ключа безопасности","name_required_error":"Вы должны указать имя ключа безопасности"}},"change_about":{"title":"Изменить информацию обо мне","error":"При изменении значения произошла ошибка."},"change_username":{"title":"Изменить псевдоним","confirm":"Вы действительно хотите изменить своё имя пользователя?","taken":"Этот псевдоним уже занят.","invalid":"Псевдоним должен состоять только из цифр и латинских букв"},"add_email":{"title":"Добавить E-mail","add":"Добавить"},"change_email":{"title":"Изменить E-mail","taken":"Этот E-mail недоступен.","error":"Произошла ошибка. Возможно, этот E-mail уже используется?","success":"На указанную почту отправлено письмо с инструкциями.","success_via_admin":"На новый электронный адрес отправлено письмо. Для его подтверждения пользователь должен следовать указанным в нём инструкциям.","success_staff":"Мы отправили письмо с инструкциями на ваш текущий адрес электронной почты."},"change_avatar":{"title":"Изменить аватар","gravatar":"На основе \u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e","gravatar_title":"Изменить аватар на граватар %{gravatarName}","gravatar_failed":"Мы не можем найти граватар %{gravatarName} по указанному адресу электронной почты.","refresh_gravatar_title":"Обновить граватар %{gravatarName}","letter_based":"Аватар по умолчанию","uploaded_avatar":"Собственный аватар","uploaded_avatar_empty":"Добавить собственный аватар","upload_title":"Загрузка собственного аватара","image_is_not_a_square":"Внимание: мы обрезали ваше изображение; ширина и высота не равны друг другу."},"change_profile_background":{"title":"Шапка профиля","instructions":"Шапка профиля будет отцентрирована и по умолчанию имеет ширину 1110 пикселей."},"change_card_background":{"title":"Фон карточки пользователя","instructions":"Картинка фона будет отцентрирована и по умолчанию имеет ширину 590 пикселей."},"change_featured_topic":{"title":"Избранная тема","instructions":"Ссылка на эту тему будет отображаться в карточке пользователя и в вашем профиле."},"email":{"title":"E-mail","primary":"Основной адрес электронной почты","secondary":"Дополнительный адрес электронной почты","primary_label":"основной","unconfirmed_label":"неподтверждённый","resend_label":"Отправить заново подтверждение по E-mail","resending_label":"отправка...","resent_label":"E-mail отправлен","update_email":"Изменить E-mail","set_primary":"Указать как основной E-mail","destroy":"Удалить E-mail","add_email":"Добавить дополнительный E-mail","sso_override_instructions":"E-mail может быть переопределён от поставщика SSO.","no_secondary":"Нет дополнительного адреса электронной почты","instructions":"Не будет отображаться.","admin_note":"Примечание: Администратор меняет адрес электронной почты другого пользователя, не являющегося администратором, что указывает на то, что пользователь потерял доступ к своему первоначальному электронному адресу. На новый адрес пользователя будет отправлено электронное письмо для сброса пароля. Адрес электронной почты не изменится, пока пользователь не завершит процесс сброса пароля.","ok":"Мы вышлем вам письмо для подтверждения","required":"Пожалуйста, введите E-mail","invalid":"Введите действующий адрес электронной почты","authenticated":"Ваш адрес электронной почты подтверждён через %{provider}","frequency_immediately":"Получать уведомления о новых непрочитанных сообщениях незамедлительно.","frequency":{"one":"Мы отправим вам письмо только в том случае, если вы более %{count} минуты находитесь офлайн.","few":"Мы отправим вам письмо только в том случае, если вы не были онлайн последние %{count} минуты.","many":"Мы отправим вам письмо только в том случае, если вы не были онлайн последние %{count} минут.","other":"Мы отправим вам письмо только в том случае, если вы не были онлайн последние %{count} минут."}},"associated_accounts":{"title":"Подключённые учётные записи","connect":"Подключить","revoke":"Отозвать","cancel":"Отменить","not_connected":"(не подключённый)","confirm_modal_title":"Подключить аккаунт %{provider}","confirm_description":{"account_specific":"Ваш аккаунт %{provider} '%{account_description}' будет использоваться для аутентификации.","generic":"Ваш аккаунт %{provider} будет использоваться для аутентификации."}},"name":{"title":"Имя","instructions":"Ваше полное имя (опционально)","instructions_required":"Ваше полное имя","required":"Пожалуйста, введите имя","too_short":"Ваше имя слишком короткое","ok":"Допустимое имя"},"username":{"title":"Псевдоним","instructions":"Псевдоним должен быть уникальным, не очень длинным и не должен содержать пробелов","short_instructions":"Пользователи могут упоминать вас по псевдониму @%{username}","available":"Псевдоним доступен","not_available":"Недоступно. Попробуйте %{suggestion}?","not_available_no_suggestion":"Не доступно","too_short":"Псевдоним слишком короткий","too_long":"Псевдоним слишком длинный","checking":"Проверяем доступность псевдонима...","prefilled":"Адрес электронной почты совпадает с зарегистрированным псевдонимом","required":"Пожалуйста, введите псевдоним"},"locale":{"title":"Язык интерфейса","instructions":"Язык интерфейса сайта. Необходимо перезагрузить страницу, чтобы изменения вступили в силу.","default":"(по умолчанию)","any":"Любая"},"password_confirmation":{"title":"Пароль ещё раз"},"invite_code":{"title":"Код приглашения","instructions":"Для регистрации учётной записи требуется код приглашения"},"auth_tokens":{"title":"Недавно использованные устройства","details":"Детали","log_out_all":"Выйти из всех устройств","not_you":"Не вы?","show_all":"Показать все (%{count})","show_few":"Показать меньше","was_this_you":"Это были вы?","was_this_you_description":"Если это были не вы, рекомендуем сменить пароль и выйти из всех устройств.","browser_and_device":"%{browser} на %{device}","secure_account":"Защита моей учётной записи","latest_post":"Ваша последняя активность...","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactive now\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"Последнее сообщение","last_emailed":"Последнее письмо","last_seen":"Был","created":"Вступил","log_out":"Выйти","location":"Местонахождение","website":"Веб-сайт","email_settings":"E-mail","hide_profile_and_presence":"Скрыть мой общедоступный профиль и присутствие","enable_physical_keyboard":"Включить поддержку физической клавиатуры на iPad","text_size":{"title":"Размер текста","smallest":"Наименьший","smaller":"Маленький","normal":"Нормальный","larger":"Большой","largest":"Самый большой"},"title_count_mode":{"title":"В заголовке фоновой страницы отображать:","notifications":"Количество новых уведомлений","contextual":"Содержание новой страницы"},"like_notification_frequency":{"title":"Уведомлять при получении симпатии","always":"Всегда","first_time_and_daily":"При первой симпатии в сообщении, и далее не чаще раза в день","first_time":"Только при первой симпатии","never":"Никогда"},"email_previous_replies":{"title":"Добавлять предыдущие ответы к концу электронных писем","unless_emailed":"Только при первой отправке","always":"Всегда","never":"Никогда"},"email_digests":{"title":"В случае моего отсутствия на форуме присылать мне сводку популярных новостей (дайджест)","every_30_minutes":"Каждые 30 минут","every_hour":"Каждый час","daily":"Ежедневно","weekly":"Еженедельно","every_month":"Каждый месяц","every_six_months":"Каждые шесть месяцев"},"email_level":{"title":"Присылать письмо когда кто-то меня цитирует, отвечает на моё сообщение, упоминает мой @псевдоним или приглашает меня в тему","always":"Всегда","only_when_away":"Если вы находитесь офлайн","never":"Никогда"},"email_messages_level":"Присылать почтовое уведомление, когда кто-то оставляет мне сообщение","include_tl0_in_digests":"Включать в сводку контент от новых пользователей","email_in_reply_to":"Включить в электронное письмо выдержку из ответов на сообщение","other_settings":"Прочее","categories_settings":"Разделы","new_topic_duration":{"label":"Считать темы новыми, если они","not_viewed":"Ещё не просмотрены","last_here":"Созданы после вашего последнего визита","after_1_day":"Созданы за прошедший день","after_2_days":"Созданы за последние 2 дня","after_1_week":"Созданы за последнюю неделю","after_2_weeks":"Созданы за последние 2 недели"},"auto_track_topics":"Автоматически отслеживать темы, которые я просматриваю","auto_track_options":{"never":"Никогда","immediately":"Немедленно","after_30_seconds":"Более 30 секунд","after_1_minute":"Более 1ой минуты","after_2_minutes":"Более 2х минут","after_3_minutes":"Более 3х минут","after_4_minutes":"Более 4х минут","after_5_minutes":"Более 5 минут","after_10_minutes":"Более 10 минут"},"notification_level_when_replying":"Когда я пишу в теме, установить для неё следующий уровень уведомлений","invited":{"search":"Введите текст для поиска по приглашениям...","title":"Приглашения","user":"Кто приглашён","sent":"Последнее отправленное приглашение","none":"Нет приглашений для отображения.","truncated":{"one":"Показ %{count} приглашения","few":"Показ первых %{count} приглашений","many":"Показ первых %{count} приглашений","other":"Показ первых %{count} приглашений"},"redeemed":"Принятые приглашения","redeemed_tab":"Принятые","redeemed_tab_with_count":"Принятые (%{count})","redeemed_at":"Принято","pending":"Ещё не принятые приглашения","pending_tab":"Ожидающие","pending_tab_with_count":"Ожидающие (%{count})","topics_entered":"Просмотрел тем","posts_read_count":"Прочитал сообщений","expired":"Это приглашение истекло.","rescind":"Отозвать","rescinded":"Приглашение отозвано","rescind_all":"Удалить просроченные приглашения","rescinded_all":"Все просроченные приглашения удалены!","rescind_all_confirm":"Вы действительно хотите удалить все просроченные приглашения?","reinvite":"Повторить приглашение","reinvite_all":"Повторить все приглашения","reinvite_all_confirm":"Вы действительно хотите отправить все приглашения повторно?","reinvited":"Приглашение выслано повторно","reinvited_all":"Все приглашения высланы повторно!","time_read":"Времени читал","days_visited":"Дней посещал","account_age_days":"Дней с момента регистрации","source":"Способ отправки приглашения","links_tab":"Ссылки","links_tab_with_count":"Ссылки (%{count})","link_url":"Ссылка","link_created_at":"Создано","link_redemption_stats":"Принятые приглашения","link_groups":"Группы","link_expires_at":"Истекает","create":"Пригласить","copy_link":"Показать ссылку","generate_link":"Создать ссылку для приглашения","link_generated":"Вот ссылка на приглашение:","valid_for":"Ссылка на приглашение действительна только для этого email: %{email}","single_user":"Пригласить по электронной почте","multiple_user":"Пригласить по ссылке","invite_link":{"title":"Ссылка на приглашение","success":"Ссылка на приглашение успешно создана!","error":"Произошла ошибка при создании ссылки на приглашение","max_redemptions_allowed_label":"Сколько человек могут зарегистрироваться по этой ссылке?","expires_at":"Когда истечёт срок действия этой ссылки?"},"bulk_invite":{"none":"Нет приглашений для отображения на этой странице.","text":"Массовое приглашение","success":"Файл успешно загружен, вы получите сообщение, когда процесс будет завершён.","error":"Извините, но файл должен быть в формате CSV.","confirmation_message":"Вы собираетесь отправить приглашения по электронной почте всем адресатам, указанным в загруженном файле."}},"password":{"title":"Пароль","too_short":"Пароль слишком короткий.","common":"Пароль слишком простой.","same_as_username":"Ваш пароль совпадает с вашим псевдонимом.","same_as_email":"Ваш пароль совпадает с вашим адресом электронной почты.","ok":"Допустимый пароль.","instructions":"не менее %{count} символов","required":"Пожалуйста, введите пароль"},"summary":{"title":"Сводка","stats":"Статистика","time_read":"время чтения","recent_time_read":"недавнее время чтения","topic_count":{"one":"тему создал","few":"темы создал","many":"тем создал","other":"тем создал"},"post_count":{"one":"сообщение написал","few":"сообщения написал","many":"сообщений написал","other":"сообщений написал"},"likes_given":{"one":"выразил","few":"выразил","many":"выразил","other":"выразил"},"likes_received":{"one":"получил","few":"получил","many":"получил","other":"получил"},"days_visited":{"one":"день посещения","few":"дня посещения","many":"дней посещения","other":"дней посещения"},"topics_entered":{"one":"тему посмотрел","few":"темы посмотрел","many":"тем просмотрено","other":"тем просмотрено"},"posts_read":{"one":"сообщение прочёл","few":"сообщения прочёл","many":"сообщений прочёл","other":"сообщений прочёл"},"bookmark_count":{"one":"закладка","few":"закладки","many":"закладок","other":"закладок"},"top_replies":"Лучшие сообщения","no_replies":"Пока не написано ни одного сообщения.","more_replies":"... другие сообщения","top_topics":"Лучшие темы","no_topics":"Пока не создано ни одной темы.","more_topics":"... другие темы","top_badges":"Самые престижные награды","no_badges":"Ещё не получено ни одной награды.","more_badges":"... другие награды","top_links":"Лучшие ссылки","no_links":"Пока нет ссылок.","most_liked_by":"Поклонники","most_liked_users":"Фавориты","most_replied_to_users":"Самые активные собеседники","no_likes":"Пока нет симпатий.","top_categories":"Лучшие разделы","topics":"Тем","replies":"Ответов"},"ip_address":{"title":"Последний IP-адрес"},"registration_ip_address":{"title":"IP-адрес регистрации"},"avatar":{"title":"Аватар","header_title":"профиль, сообщения, закладки и настройки"},"title":{"title":"Заголовок","none":"(нет)"},"primary_group":{"title":"Основная группа","none":"(нет)"},"filters":{"all":"Всего"},"stream":{"posted_by":"Опубликовано","sent_by":"Отправлено","private_message":"сообщение","the_topic":"тема"},"date_of_birth":{"user_title":"Сегодня ваш день рождения!","title":"Сегодня мой день рождения!","label":"День рождения"},"anniversary":{"user_title":"Сегодня годовщина вашей регистрации на форуме!","title":"Сегодня годовщина моей регистрации на форуме!"}},"loading":"Загрузка...","errors":{"prev_page":"при попытке загрузки","reasons":{"network":"Ошибка сети","server":"Ошибка сервера","forbidden":"Доступ закрыт","unknown":"Ошибка","not_found":"Страница не найдена"},"desc":{"network":"Пожалуйста, проверьте подключение к сети.","network_fixed":"Похоже, сеть появилась.","server":"Ошибка: %{status}","forbidden":"У вас нет доступа для просмотра.","not_found":"Ой, произошла попытка загрузить несуществующую ссылку.","unknown":"Что-то пошло не так."},"buttons":{"back":"Вернуться","again":"Попытаться ещё раз","fixed":"Загрузить страницу"}},"modal":{"close":"закрыть","dismiss_error":"Отклонить ошибку"},"close":"Закрыть","assets_changed_confirm":"Сайт только что был обновлён. Перезагрузить страницу для перехода к новой версии?","logout":"Необходимо заново войти в систему.","refresh":"Обновить","home":"Вернуться","read_only_mode":{"enabled":"Сайт работает в режиме \"только для чтения\". Сейчас вы можете продолжать просматривать сайт, но другие действия будут недоступны.","login_disabled":"Вход отключён, пока сайт находится в режиме «только для чтения»","logout_disabled":"Выход отключён, пока сайт находится в режиме «только для чтения»"},"logs_error_rate_notice":{},"learn_more":"подробнее...","all_time":"всего","all_time_desc":"всего создано тем","year":"год","year_desc":"темы, созданные за последние 365 дней","month":"месяц","month_desc":"темы, созданные за последние 30 дней","week":"неделя","week_desc":"темы, созданные за последние 7 дней","day":"день","first_post":"Первое сообщение","mute":"Отключить","unmute":"Включить","last_post":"Последнее сообщение","local_time":"Местное время","time_read":"Прочитанные","time_read_recently":"%{time_read} недавно","time_read_tooltip":"%{time_read} общее время чтения","time_read_recently_tooltip":"%{time_read} общее время чтения (%{recent_time_read}за последние 60 дней)","last_reply_lowercase":"последний ответ","replies_lowercase":{"one":"ответ","few":"ответа","many":"ответов","other":"ответов"},"signup_cta":{"sign_up":"Зарегистрироваться","hide_session":"Напомнить мне завтра","hide_forever":"Нет, спасибо","hidden_for_session":"Хорошо, напомню завтра. Кстати, зарегистрироваться можно также и с помощью кнопки \"Войти\".","intro":"Здравствуйте! Похоже, вам нравится обсуждение, но вы ещё не зарегистрировали аккаунт.","value_prop":"Когда вы создаёте учётную запись, мы точно помним, что вы прочитали, поэтому вы всегда возвращаетесь туда, где остановились. Вы также получаете уведомления, здесь и по электронной почте, когда кто-то отвечает вам. И вы можете в сообщениях поставить отметку 'Мне нравится'. :heartpulse:"},"summary":{"enabled_description":"Вы просматриваете выдержку из темы - только самые интересные сообщения по мнению сообщества.","description":"Всего \u003cb\u003e%{replyCount}ответов\u003c/b\u003e.","description_time":"\u003cb\u003e%{replyCount}\u003c/b\u003e ответов с предполагаемым временем прочтения около \u003cb\u003e%{readingTime} минут\u003c/b\u003e.","enable":"Сводка по теме","disable":"Показать все сообщения"},"deleted_filter":{"enabled_description":"Эта тема содержит удалённые сообщения, которые сейчас скрыты.","disabled_description":"Показаны удалённые сообщения темы.","enable":"Скрыть удалённые сообщения","disable":"Показать удалённые сообщения"},"private_message_info":{"title":"Сообщение","invite":"Пригласить других...","edit":"Добавить или удалить...","remove":"Удалить...","add":"Добавить...","leave_message":"Вы действительно хотите выйти из этого сообщения?","remove_allowed_user":"Вы действительно хотите удалить %{name} из этого сообщения?","remove_allowed_group":"Вы действительно хотите удалить %{name} из этого сообщения?"},"email":"Email","username":"Псевдоним","last_seen":"Был","created":"Создан","created_lowercase":"создано","trust_level":"Уровень доверия","search_hint":"Псевдоним, e-mail или IP-адрес","create_account":{"disclaimer":"Регистрируясь, вы соглашаетесь с \u003ca href='%{privacy_link}' target='blank'\u003eполитикой конфиденциальности\u003c/a\u003e и \u003ca href='%{tos_link}' target='blank'\u003e условиями предоставления услуг\u003c/a\u003e.","title":"Зарегистрироваться","failed":"Произошла ошибка. Возможно, этот Email уже используется. Попробуйте восстановить пароль"},"forgot_password":{"title":"Сброс пароля","action":"Я забыл свой пароль","invite":"Введите ваш псевдоним или адрес электронной почты, и мы отправим вам ссылку для сброса пароля.","reset":"Сброс пароля","complete_username":"Если учётная запись совпадает с псевдонимом \u003cb\u003e%{username}\u003c/b\u003e, вы скоро получите письмо с инструкциями о том, как сбросить пароль.","complete_email":"Если учётная запись совпадает с \u003cb\u003e%{email}\u003c/b\u003e, вы должны получить письмо с инструкциями о том, как сбросить ваш пароль.","complete_username_found":"Мы нашли учётную запись, которая соответствует псевдониму \u003cb\u003e%{username}\u003c/b\u003e. Вы должны получить письмо с инструкциями о том, как сбросить пароль.","complete_email_found":"Мы нашли аккаунт, который соответствует \u003cb\u003e%{email}\u003c/b\u003e. Вы должны получить письмо с инструкциями о том, как сбросить пароль.","complete_username_not_found":"Не найдено учётной записи с псевдонимом \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Не найдено учётной записи с адресом электронной почты \u003cb\u003e%{email}\u003c/b\u003e","help":"Электронное письмо не доходит? Для начала проверьте папку «Спам» вашего почтового ящика. \u003cp\u003eНе уверены в том, какой адрес использовали? Введите его и мы подскажем, есть ли он в нашей базе.\u003c/p\u003e\u003cp\u003eЕсли вы более не имеете доступа к связанному с вашей учётной записью адресу электронной почты, то, пожалуйста, свяжитесь с \u003ca href='%{basePath}/about'\u003eадминистрацией.\u003c/a\u003e\u003c/p\u003e","button_ok":"ОК","button_help":"Помощь"},"email_login":{"link_label":"Пришлите мне ссылку для входа","button_label":"E-mail","emoji":"lock emoji","complete_username":"Если учётная запись совпадает с именем пользователя \u003cb\u003e%{username}\u003c/b\u003e, вы должны в ближайшее время получить электронное письмо со ссылкой для входа в систему.","complete_email":"Если данные аккаунта совпадают с \u003cb\u003e%{email}\u003c/b\u003e, вы должны в ближайшее время получить электронное письмо со ссылкой для входа в систему.","complete_username_found":"Мы нашли учётную запись, которая соответствует имени пользователя \u003cb\u003e%{username}\u003c/b\u003e, в ближайшее время вы получите электронное письмо со ссылкой для входа.","complete_email_found":"Мы нашли учётную запись, которая соответствует \u003cb\u003e%{email}\u003c/b\u003e, в ближайшее время вы получите электронное письмо со ссылкой для входа.","complete_username_not_found":"Ни одна учётная запись не соответствует имени пользователя \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Нет совпадений аккаунта по адресу \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Перейти на %{site_name}","logging_in_as":"Войти как %{email}","confirm_button":"Завершить вход"},"login":{"title":"Войти","username":"Пользователь","password":"Пароль","second_factor_title":"Двухфакторная аутентификация","second_factor_description":"Введите код аутентификации из вашего приложения:","second_factor_backup":"Войти с помощью резервного кода","second_factor_backup_title":"Вход с использованием резервного кода","second_factor_backup_description":"Введите один из ваших резервных кодов:","second_factor":"Войти с помощью программы аутентификации","security_key_description":"Когда вы подготовите свой физический ключ безопасности, нажмите на кнопку 'Аутентификация' с ключом безопасности.","security_key_alternative":"Попробуйте другой способ","security_key_authenticate":"Аутентификация с ключом безопасности","security_key_not_allowed_error":"Время проверки подлинности ключа безопасности истекло или проверка была отменена.","security_key_no_matching_credential_error":"В указанном ключе безопасности не найдено подходящих учётных данных.","security_key_support_missing_error":"Ваше текущее устройство или браузер не поддерживает использование ключей безопасности. Пожалуйста, используйте другой метод.","email_placeholder":"Email или псевдоним","caps_lock_warning":"Caps Lock включён","error":"Неизвестная ошибка","cookies_error":"Похоже, что в вашем браузере выключены куки. Скорее всего вы не сможете войти на сайт, пока не включите куки.","rate_limit":"Сделайте перерыв перед очередной попыткой входа.","blank_username":"Введите ваш e-mail или псевдоним.","blank_username_or_password":"Введите ваш e-mail (или псевдоним) и пароль.","reset_password":"Сброс пароля","logging_in":"Вход...","or":"или","authenticating":"Проверка...","awaiting_activation":"Ваша учётная запись ожидает активации через ссылку, указанную в отправленном письме. Чтобы повторно выслать активационное письмо, используйте кнопку сброса пароля.","awaiting_approval":"Ваша учётная запись ещё не одобрена персоналом. Мы вышлем вам письмо, как только это произойдёт.","requires_invite":"Попасть в этот форум можно только по приглашениям.","not_activated":"Чтобы войти на форум, активируйте свою учётную запись. Мы отправили на почту \u003cb\u003e%{sentTo}\u003c/b\u003e подробные инструкции, как это сделать.","not_allowed_from_ip_address":"Вход с этого IP-адреса запрещён.","admin_not_allowed_from_ip_address":"Вход с этого IP-адреса в качестве администратора запрещён.","resend_activation_email":"Щёлкните здесь, чтобы повторно выслать письмо для активации учётной записи.","omniauth_disallow_totp":"В вашей учётной записи включена двухфакторная аутентификация. Пожалуйста, войдите под своим паролем.","resend_title":"Заново выслать активационное письмо","change_email":"Изменить электронную почту","provide_new_email":"Укажите новый адрес электронной почты, и мы повторно вышлем на него активационное письмо.","submit_new_email":"Обновить адрес электронной почты","sent_activation_email_again":"По адресу \u003cb\u003e%{currentEmail}\u003c/b\u003e повторно отправлено письмо с инструкциями по активации вашей учётной записи. Доставка сообщения может занять несколько минут. Имейте в виду, что иногда по ошибке письмо может попасть в папку \u003cb\u003eСпам\u003c/b\u003e.","sent_activation_email_again_generic":"Мы отправили ещё одно письмо для активации. Доставка сообщения может занять несколько минут.; не забудьте проверить папку со спамом.","to_continue":"Пожалуйста, войдите","preferences":"Необходимо войти на сайт для редактирования настроек профиля.","not_approved":"Ваша учётная запись ещё не прошла проверку. После успешной проверки мы отправим вам письмо с уведомлением, и вы сможете войти в свою учётную запись.","google_oauth2":{"name":"Google","title":"Google"},"twitter":{"name":"Twitter","title":"Twitter"},"instagram":{"name":"Instagram","title":"Instagram"},"facebook":{"name":"Facebook","title":"Facebook"},"github":{"name":"GitHub","title":"GitHub"},"discord":{"name":"Discord","title":"Discord"},"second_factor_toggle":{"totp":"Вместо этого используйте приложение для проверки подлинности","backup_code":"Вместо этого используйте резервный код"}},"invites":{"accept_title":"Приглашение","emoji":"envelope emoji","welcome_to":"Добро пожаловать на %{site_name}!","invited_by":"Вы были приглашены пользователем","social_login_available":"Вы также сможете входить через социальные сети, используя этот адрес электронной почты.","your_email":"Электронный адрес вашего аккаунта: \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Принять приглашение","success":"Ваш аккаунт создан и теперь вы можете войти.","name_label":"Имя","password_label":"Пароль","optional_description":"(опционально)"},"password_reset":{"continue":"Далее на %{site_name}"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","emoji_one":"JoyPixels (ранее EmojiOne)","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Только разделы","categories_with_featured_topics":"Разделы с избранными темами","categories_and_latest_topics":"Разделы и список последних тем форума","categories_and_top_topics":"Разделы и популярные темы","categories_boxes":"Блоки с подразделами","categories_boxes_with_topics":"Блоки с избранными темами"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"Загрузка..."},"category_row":{"topic_count":{"one":"%{count} тема в этом разделе","few":"%{count} темы в этом разделе","many":"%{count} тем в этом разделе","other":"%{count} тем в этом разделе"},"plus_subcategories_title":{"one":"%{name} и один подраздел","few":"%{name} и %{count} подраздела","many":"%{name} и %{count} подразделов","other":"%{name} и %{count} подразделов"},"plus_subcategories":{"one":"+ %{count} подраздел","few":"+ %{count} подраздела","many":"+ %{count} подразделов","other":"+ %{count} подразделов"}},"select_kit":{"default_header_text":"Выбрать...","no_content":"Совпадений не найдено","filter_placeholder":"Поиск...","filter_placeholder_with_any":"Найти или создать...","create":"Создать: '%{content}'","max_content_reached":{"one":"Можно выбрать только %{count} элемент.","few":"Можно выбрать только %{count} элемента.","many":"Можно выбрать только %{count} элементов.","other":"Можно выбрать только %{count} элементов."},"min_content_not_reached":{"one":"Выберите хотя бы %{count} элемент.","few":"Выберите хотя бы %{count} элемента.","many":"Выберите хотя бы %{count} элементов.","other":"Выберите хотя бы %{count} элементов."},"invalid_selection_length":{"one":"Необходимо выбрать не менее %{count} символа.","few":"Необходимо выбрать не менее %{count} символов.","many":"Необходимо выбрать не менее %{count} символов.","other":"Необходимо выбрать не менее %{count} символов."},"components":{"categories_admin_dropdown":{"title":"Управление разделами"}}},"date_time_picker":{"from":"От","to":"Кому"},"emoji_picker":{"filter_placeholder":"Поиск смайла","smileys_\u0026_emotion":"Смайлики и эмоции","people_\u0026_body":"Люди и части тел","animals_\u0026_nature":"Животные и природа","food_\u0026_drink":"Еда и напитки","travel_\u0026_places":"Путешествия и места","activities":"Деятельность","objects":"Объекты","symbols":"Символы","flags":"Флаги","recent":"Недавно использованные","default_tone":"Скин без тона","light_tone":"Светлый тон скина","medium_light_tone":"Средне-светлый тон скина","medium_tone":"Средний тон скина","medium_dark_tone":"Средне-тёмный тон скина","dark_tone":"Тёмный оттенок скина","default":"Пользовательские смайлы"},"shared_drafts":{"title":"Общие черновики","notice":"Эти темы видны только тем, кому доступен раздел \u003cb\u003e%{category}\u003c/b\u003e.","destination_category":"Раздел назначения","publish":"Публикация общего черновика","confirm_publish":"Вы действительно хотите опубликовать этот черновик?","publishing":"Публикация темы..."},"composer":{"emoji":"Смайлики :)","more_emoji":"ещё...","options":"Настройки","whisper":"скрытое сообщение","unlist":"исключена из списков тем","add_warning":"Это официальное предупреждение.","toggle_whisper":"Скрытое сообщение","toggle_unlisted":"Исключить из списка","posting_not_on_topic":"В какой теме вы хотите ответить?","saved_local_draft_tip":"Сохранено локально","similar_topics":"Ваша тема похожа на...","drafts_offline":"Черновики, сохранённые офлайн","edit_conflict":"редактировать конфликт","group_mentioned_limit":{"one":"\u003cb\u003eВнимание!\u003c/b\u003e Вы упомянули \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, в которой больше участников, чем установленный администратором лимит упоминаний на %{count} пользователя. Никто не получит уведомление.","few":"\u003cb\u003eВнимание!\u003c/b\u003e Вы упомянули \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, в которой больше участников, чем установленный администратором лимит упоминаний на %{count} пользователей. Никто не получит уведомление.","many":"\u003cb\u003eВнимание!\u003c/b\u003e Вы упомянули \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, в которой больше участников, чем установленный администратором лимит упоминаний на %{count} пользователей. Никто не получит уведомление.","other":"\u003cb\u003eВнимание!\u003c/b\u003e Вы упомянули \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, в которой больше участников, чем установленный администратором лимит упоминаний на %{count} пользователей. Никто не получит уведомление."},"group_mentioned":{"one":"Упоминая группу %{group}, вы тем самым отправляете уведомление \u003ca href='%{group_link}'\u003e%{count} пользователю\u003c/a\u003e – вы уверены?","few":"Упоминая группу %{group}, вы тем самым отправляете уведомление \u003ca href='%{group_link}'\u003e%{count} пользователям\u003c/a\u003e – вы уверены?","many":"Упоминая группу %{group}, вы тем самым отправляете уведомление \u003ca href='%{group_link}'\u003e%{count} пользователям\u003c/a\u003e – вы уверены?","other":"Упоминая группу %{group}, вы тем самым отправляете уведомление \u003ca href='%{group_link}'\u003e%{count} пользователям\u003c/a\u003e – вы уверены?"},"cannot_see_mention":{"category":"Вы упомянули %{username}, но они не будут уведомлены, потому что у них нет доступа к этому разделу. Вам нужно добавить их в группу, имеющую доступ к этому разделу.","private":"Вы упомянули %{username}, но они не будут уведомлены, потому что они не могут видеть это личное сообщение. Вам нужно пригласить их в это ЛС."},"duplicate_link":"Кажется, ваша ссылка на \u003cb\u003e%{domain}\u003c/b\u003e уже была ранее размещена пользователем \u003cb\u003e@%{username}\u003c/b\u003e в \u003ca href='%{post_url}'\u003eэтом ответе %{ago}\u003c/a\u003e. Вы точно хотите разместить её ещё раз?","reference_topic_title":"RE: %{title}","error":{"title_missing":"Требуется название темы","title_too_short":"Название темы должно быть не короче %{min} символов","title_too_long":"Название темы не может быть длиннее %{max} символов","post_missing":"Сообщение не может быть пустым","post_length":"Сообщение должно быть не короче %{min} символов","try_like":"Вы пробовали нажать на кнопку %{heart}?","category_missing":"Выберите раздел","tags_missing":{"one":"Необходимо выбрать по крайней мере %{count} тег","few":"Необходимо выбрать по крайней мере %{count} тега","many":"Необходимо выбрать по крайней мере %{count} тегов","other":"Необходимо выбрать по крайней мере %{count} тегов"},"topic_template_not_modified":"Впишите детали темы в шаблон"},"save_edit":"Сохранить","overwrite_edit":"Перезаписать","reply_original":"Ответ в первоначальной теме","reply_here":"Ответить в текущей теме","reply":"Ответить","cancel":"Отмена","create_topic":"Создать тему","create_pm":"Отправить личное сообщение","create_whisper":"Скрытое сообщение","create_shared_draft":"Создать общий черновик","edit_shared_draft":"Редактировать общий черновик","title":"Или нажмите Ctrl+Enter","users_placeholder":"Добавить пользователя","title_placeholder":"Название: суть темы коротким предложением","title_or_link_placeholder":"Введите название или вставьте здесь ссылку","edit_reason_placeholder":"Причина редактирования...","topic_featured_link_placeholder":"Введите ссылку с названием.","remove_featured_link":"Удалить ссылку из темы.","reply_placeholder":"Введите текст здесь. Поддерживаемые форматы: Markdown, BBCode и HTML. Чтобы вставить картинку, перетащите её сюда или вставьте с помощью Ctrl+V, Command-V, либо нажмите правой кнопкой мыши и выберите из меню пункт \"Вставить\".","reply_placeholder_no_images":"Введите текст здесь. Используйте Markdown, BBCode или HTML для форматирования.","reply_placeholder_choose_category":"Перед вводом текста выберите раздел.","view_new_post":"Посмотреть созданное сообщение.","saving":"Сохранение...","saved":"Сохранено!","saved_draft":"Черновик сохранён; нажмите сюда, чтобы его открыть.","uploading":"Загрузка...","show_preview":"показать предварительный просмотр \u0026raquo;","hide_preview":"\u0026laquo; скрыть предварительный просмотр","quote_post_title":"Процитировать сообщение целиком","bold_label":"Ж","bold_title":"Жирный","bold_text":"Жирный текст","italic_label":"К","italic_title":"Курсив","italic_text":"Текст, выделенный курсивом","link_title":"Ссылка","link_description":"Введите описание ссылки","link_dialog_title":"Вставить ссылку","link_optional_text":"Необязательный текст ссылки","link_url_placeholder":"Вставьте URL или введите текст для поиска темы","blockquote_title":"Цитата","blockquote_text":"Впишите сюда текст цитаты","code_title":"Текст \"как есть\" (без применения форматирования)","code_text":"Впишите сюда текст; также отключить форматирование текста можно, начав строку с 4х пробелов","paste_code_text":"Напечатайте или вставьте сюда код","upload_title":"Вставить картинку или прикрепить файл","upload_description":"Впишите сюда описание файла","olist_title":"Нумерованный список","ulist_title":"Ненумерованный список","list_item":"Элемент списка","toggle_direction":"Переключить направление","help":"Справка по форматированию (Markdown)","collapse":"Свернуть панель редактора","open":"Открыть панель редактора","abandon":"Закрыть редактор и отменить черновик","enter_fullscreen":"Включить полноэкранный режим редактора","exit_fullscreen":"Выключить полноэкранный  режима редактора","show_toolbar":"Отобразить панель инструментов редактора","hide_toolbar":"Скрыть панель инструментов редактора","modal_ok":"OK","modal_cancel":"Отмена","cant_send_pm":"К сожалению, вы не можете отправлять сообщения пользователю %{username}.","yourself_confirm":{"title":"Забыли указать получателей?","body":"В списке получателей сейчас только вы сами!"},"slow_mode":{"error":"Эта тема находится в замедленном режиме. Чтобы способствовать вдумчивому и взвешенному обсуждению, вы можете публиковать сообщения только раз в %{duration}."},"admin_options_title":"Дополнительные настройки темы для персонала","composer_actions":{"reply":"Ответить","draft":"Черновик","edit":"Редактировать","reply_to_post":{"label":"Ответить на сообщение пользователя %{postUsername}","desc":"Ответить на конкретное сообщение"},"reply_as_new_topic":{"label":"Ответить в новой связанной теме","desc":"Создать новую тему, связанную с этой темой","confirm":"У вас есть сохранённый черновик новой темы, который будет перезаписан, если вы создадите связанную тему."},"reply_as_new_group_message":{"label":"Ответить в виде нового группового сообщения","desc":"Создать новое личное сообщение с теми же получателями"},"reply_as_private_message":{"label":"Личное сообщение","desc":"Создать новое личное сообщение"},"reply_to_topic":{"label":"Ответить на тему","desc":"Ответить на тему в целом, а не на конкретное сообщение"},"toggle_whisper":{"label":"Скрытое сообщение","desc":"Скрытые сообщения доступны только персоналу"},"create_topic":{"label":"Новая тема"},"shared_draft":{"label":"Общий черновик","desc":"Черновик темы, который будет виден только пользователям с необходимыми правами доступа"},"toggle_topic_bump":{"label":"Не поднимать тему","desc":"Ответить без изменения даты последнего ответа"}},"reload":"Обновить","ignore":"Игнорировать","details_title":"Сводка","details_text":"Этот текст будет скрыт"},"notifications":{"tooltip":{"regular":{"one":"%{count} непрочитанное уведомление","few":"%{count} непрочитанных уведомления","many":"%{count} непрочитанных уведомлений","other":"%{count} непрочитанных уведомлений"},"message":{"one":"%{count} непрочитанное сообщение","few":"%{count} непрочитанных сообщения","many":"%{count} непрочитанных сообщений","other":"%{count} непрочитанных сообщений"},"high_priority":{"one":"%{count} непрочитанное уведомление с высоким приоритетом","few":"%{count} непрочитанных уведомления с высоким приоритетом","many":"%{count} непрочитанных уведомлений с высоким приоритетом","other":"%{count} непрочитанных уведомлений с высоким приоритетом"}},"title":"уведомления об упоминании @псевдонима, об ответах на ваши сообщения, темы и т.д.","none":"Уведомления в данный момент не могут быть загружены.","empty":"Уведомления не найдены.","post_approved":"Ваше сообщение было одобрено","reviewable_items":"Сообщения, требующие рассмотрения","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} и %{count} другой пользователь\u003c/span\u003e %{description}","few":"\u003cspan class='multi-user'\u003e%{username}, %{username2} и %{count} других пользователя\u003c/span\u003e %{description}","many":"\u003cspan class='multi-user'\u003e%{username}, %{username2} и %{count} других пользователей\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} и %{count} других пользователей\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"Понравилось %{count} ваше сообщение","few":"Понравилось %{count} ваших сообщения","many":"Понравилось %{count} ваших сообщений","other":"Понравилось %{count} ваших сообщений"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e принял ваше приглашение","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e переместил %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Заслужил(а) '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eНовая тема\u003c/span\u003e %{description}","membership_request_accepted":"Запрос на вступление принят группой '%{group_name}'","membership_request_consolidated":{"one":"%{count} открытый запрос на вступления в группу '%{group_name}'","few":"%{count} открытых запроса на вступления в группу '%{group_name}'","many":"%{count} открытых запросов на вступления в группу '%{group_name}'","other":"%{count} открытых запросов на вступления в группу '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - завершено","group_message_summary":{"one":"%{count} сообщение в вашей группе %{group_name}","few":"%{count} сообщения в вашей группе %{group_name}","many":"%{count} сообщений в вашей группе %{group_name}","other":"%{count} сообщений в вашей группе %{group_name}"},"popup":{"mentioned":"%{username} упомянул вас в теме \"%{topic}\" - %{site_title}","group_mentioned":"%{username} упомянул вас в теме \"%{topic}\" - %{site_title}","quoted":"%{username} процитировал Вас в теме \"%{topic}\" - %{site_title}","replied":"%{username} ответил вам в теме \"%{topic}\" - %{site_title}","posted":"%{username} написал в теме \"%{topic}\" - %{site_title}","private_message":"%{username} отправил вам личное сообщение в теме \"%{topic}\" - %{site_title}","linked":"%{username} сослался на ваше сообщение из темы \"%{topic}\" - %{site_title}","watching_first_post":"%{username} создал новую тему \"%{topic}\" - %{site_title}","confirm_title":"Уведомления включены - %{site_title}","confirm_body":"Уведомления были успешно включены.","custom":"Уведомления от пользователя %{username} на сайте %{site_title}"},"titles":{"mentioned":"Упомянутый","replied":"Новый ответ","quoted":"цитируемый","edited":"отредактированный","liked":"Новая симпатия","private_message":"Новое личное сообщение","invited_to_private_message":"Приглашён в личное сообщение","invitee_accepted":"Приглашение принято","posted":"Новое сообщение","moved_post":"Сообщение перемещено","linked":"связанный","bookmark_reminder":"Напоминание о закладке","bookmark_reminder_with_name":"Напоминание о закладке - %{name}","granted_badge":"награда получена","invited_to_topic":"приглашён в тему","group_mentioned":"упомянутая группа","group_message_summary":"новые групповые сообщения","watching_first_post":"Новая тема","topic_reminder":"Напоминание о теме","liked_consolidated":"новые симпатии","post_approved":"Сообщение утверждено","membership_request_consolidated":"новые запросы на вступление","reaction":"новая реакция","votes_released":"Голосование было опубликовано"}},"upload_selector":{"title":"Вставка изображения","title_with_attachments":"Добавить изображение или файл","from_my_computer":"С моего устройства","from_the_web":"Из интернета","remote_tip":"Ссылка на изображение","remote_tip_with_attachments":"Ссылка на изображение или файл %{authorized_extensions}","local_tip":"Выбор изображения с вашего устройства","local_tip_with_attachments":"Выбор изображения или файла с вашего устройства %{authorized_extensions}","hint":"(вы также можете перетащить объект в окно редактора для его загрузки)","hint_for_supported_browsers":"вы также можете перетащить или скопировать изображения в редактор","uploading":"Загрузка","select_file":"Выбрать файл","default_image_alt_text":"изображение"},"search":{"sort_by":"Сортировка","relevance":"По соответствию","latest_post":"По недавним сообщениям","latest_topic":"По недавним темам","most_viewed":"По количеству просмотров","most_liked":"По количеству симпатий","select_all":"Выбрать всё","clear_all":"Сбросить всё","too_short":"Слишком короткое слово для поиска.","result_count":{"one":"\u003cspan\u003e%{count} результат для \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","few":"\u003cspan\u003e%{count}%{plus} результата для \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","many":"\u003cspan\u003e%{count}%{plus} результатов для \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} результатов для \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"Поиск по темам, сообщениям, псевдонимам и разделам","full_page_title":"Поиск тем или сообщений","no_results":"Ничего не найдено.","no_more_results":"Больше ничего не найдено.","post_format":"#%{post_number} от %{username}","results_page":"Результаты поиска для '%{term}'","more_results":"Найдено множество результатов. Пожалуйста, уточните критерии поиска.","cant_find":"Не можете найти нужную информацию?","start_new_topic":"Создайте новую тему","or_search_google":"или попробуйте поискать в Google:","search_google":"Попробуйте поискать в Google:","search_google_button":"Google","search_button":"Найти","context":{"user":"Искать сообщения от @%{username}","category":"Искать в разделе #%{category}","tag":"Поиск по тегу #%{tag}","topic":"Искать в этой теме","private_messages":"Искать в личных сообщениях"},"advanced":{"title":"Расширенный поиск","posted_by":{"label":"Автор"},"in_category":{"label":"Разделы"},"in_group":{"label":"Группа"},"with_badge":{"label":"С наградами"},"with_tags":{"label":"Теги"},"filters":{"label":"Ограничить поиск по темам/сообщениям...","title":"С совпадениями в заголовке","likes":"Понравившиеся","posted":"В которых я отвечал","created":"Которые я создал","watching":"За которыми я наблюдаю","tracking":"За которыми я слежу","private":"В моих сообщениях","bookmarks":"В моих закладках","first":"Только в первом сообщении темы","pinned":"Закреплённые","seen":"Прочитанные","unseen":"Непрочитанные","wiki":"Являются вики","images":"Содержат изображения","all_tags":"Все вышеуказанные теги"},"statuses":{"label":"Где темы","open":"Открытые","closed":"Закрытые","public":"Публичные","archived":"Заархивированные","noreplies":"Без ответов","single_user":"С одним пользователем"},"post":{"count":{"label":"Сообщений"},"min":{"placeholder":"минимум"},"max":{"placeholder":"максимум"},"time":{"label":"Дата","before":"До (включая)","after":"Начиная с"}},"views":{"label":"Просмотров"},"min_views":{"placeholder":"минимум"},"max_views":{"placeholder":"максимум"}}},"hamburger_menu":"Перейти к другому списку тем или другому разделу","new_item":"новый","go_back":"вернуться","not_logged_in_user":"страница пользователя с историей его последней активности и настроек","current_user":"перейти на вашу страницу пользователя","view_all":"просмотреть всё","topics":{"new_messages_marker":"последний визит","bulk":{"select_all":"Выбрать всё","clear_all":"Отменить выбор","unlist_topics":"Исключить из всех списков тем","relist_topics":"Повторный Список Тем","reset_read":"Сбросить прочтённые","delete":"Удалить темы","dismiss":"Отложить","dismiss_read":"Отложить все непрочитанные","dismiss_button":"Отложить...","dismiss_tooltip":"Отложить новые сообщения или перестать следить за этими темами","also_dismiss_topics":"Перестать следить за этими темами, чтобы они никогда больше не высвечивались как непрочитанные","dismiss_new":"Отложить новые","toggle":"Вкл./выкл. выбор нескольких тем","actions":"Массовые действия","change_category":"Задать раздел","close_topics":"Закрыть темы","archive_topics":"Архивировать темы","notification_level":"Уведомления","choose_new_category":"Выберите новый раздел для этих тем:","selected":{"one":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e тему.","few":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e темы.","many":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e тем.","other":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e тем."},"change_tags":"Заменить теги","append_tags":"Добавить теги","choose_new_tags":"Выберите новые теги для этих тем:","choose_append_tags":"Выберите теги для добавления к этим темам:","changed_tags":"Теги этих тем изменены.","remove_tags":"Удалить теги","progress":{"one":"Выполнено: \u003cstrong\u003e%{count}\u003c/strong\u003e тема","few":"Выполнено: \u003cstrong\u003e%{count}\u003c/strong\u003e темы","many":"Выполнено: \u003cstrong\u003e%{count}\u003c/strong\u003e тем","other":"Выполнено: \u003cstrong\u003e%{count}\u003c/strong\u003e тем"}},"none":{"unread":"У вас нет непрочитанных тем.","new":"У вас нет новых тем.","read":"Вы ещё не прочитали ни одной темы.","posted":"Вы ещё не принимали участие в обсуждении.","ready_to_create":"Готовы ","latest":"Нет обновлённых или недавно созданных тем.","bookmarks":"У вас пока нет тем, добавленных в закладки.","category":"В разделе %{category} отсутствуют темы.","top":"Нет обсуждаемых тем.","educate":{"new":"\u003cp\u003eЗдесь появятся ваши новые темы. По умолчанию темы считаются новыми, и они обозначаются индикатором \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e, если темы были созданы за последние 2 дня.\u003c/p\u003e\u003cp\u003eПосетите раздел 'Уведомления' на странице\u003ca href=\"%{userPrefsUrl}\"\u003eнастроек\u003c/a\u003e, если вы хотите изменить этот период.\u003c/p\u003e","unread":"\u003cp\u003eВаши непрочитанные темы скоро появятся тут.\u003c/p\u003e\u003cp\u003eПо умолчанию темы получают счётчик \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e, если:\u003c/p\u003e\u003cul\u003e\u003cli\u003eСоздана тема\u003c/li\u003e\u003cli\u003eОтветили на сообщение в теме\u003c/li\u003e\u003cli\u003eВремя чтения темы пользователем превышает 4 минуты\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eВы можете изменить настройки уведомлений в нижней части каждой темы.\u003c/p\u003e\u003cp\u003eПри необходимости вы можете изменить стандартные параметры уведомлений в \u003ca href=\"%{userPrefsUrl}\"\u003eнастройках\u003c/a\u003e профиля пользователя.\u003c/p\u003e"}},"bottom":{"latest":"Обновлённых тем больше нет.","posted":"Новых тем больше нет.","read":"Прочитанных тем больше нет.","new":"Новых тем больше нет.","unread":"Непрочитанных тем больше нет.","category":"В разделе %{category} больше нет тем.","tag":"Нет больше тем, помеченных тегом %{tag}.","top":"Обсуждаемых тем больше нет.","bookmarks":"Тем, помеченных закладкам,. больше нет."}},"topic":{"filter_to":{"one":"%{count} сообщение в теме","few":"%{count} сообщения в теме","many":"%{count} сообщений в теме","other":"%{count} сообщений в теме"},"create":"Создать тему","create_long":"Создать новую тему","open_draft":"Открыть черновик","private_message":"Новое личное сообщение","archive_message":{"help":"Переместить сообщение в архив","title":"Архив"},"move_to_inbox":{"title":"Переместить во входящие","help":"Переместить сообщение во входящие"},"edit_message":{"help":"Изменить первое сообщение","title":"Редактировать"},"defer":{"help":"Отметить как непрочитанное","title":"Отложить"},"feature_on_profile":{"help":"Добавьте ссылку на эту тему в карточку пользователя и профиль","title":"Добавить в профиль"},"remove_from_profile":{"warning":"В вашем профиле уже есть избранная тема. Если вы продолжите, эта тема заменит существующую.","help":"Удалить ссылку на эту тему в вашем профиле ","title":"Убрать из профиля"},"list":"Темы","new":"новая тема","unread":"не прочитано","new_topics":{"one":"%{count} новая тема","few":"%{count} новых темы","many":"%{count} новых тем","other":"%{count} новых тем"},"unread_topics":{"one":"%{count} непрочитанная тема","few":"%{count} непрочитанные темы","many":"%{count} непрочитанных тем","other":"%{count} непрочитанных тем"},"title":"Тема","invalid_access":{"title":"Частная тема","description":"К сожалению, у вас нет прав доступа к теме!","login_required":"Вам необходимо войти на сайт, чтобы получить доступ к этой теме."},"server_error":{"title":"Не удалось загрузить тему","description":"К сожалению, мы не смогли загрузить тему, возможно, из-за проблемы подключения. Попробуйте ещё раз. Если проблема повторится, пожалуйста, сообщите нам об этом."},"not_found":{"title":"Тема не найдена","description":"К сожалению, запрошенная тема не найдена. Возможно, она была удалена модератором."},"total_unread_posts":{"one":"У вас %{count} непрочитанное сообщение в этой теме","few":"У вас %{count} непрочитанных сообщения в этой теме","many":"У вас %{count} непрочитанных сообщений в этой теме","other":"У вас %{count} непрочитанных сообщений в этой теме"},"unread_posts":{"one":"У вас %{count} непрочитанное старое сообщение в этой теме","few":"У вас %{count} непрочитанных старых сообщения в этой теме","many":"У вас %{count} непрочитанных старых сообщений в этой теме","other":"У вас %{count} непрочитанных старых сообщений в этой теме"},"new_posts":{"one":"В этой теме %{count} новое сообщение с вашего последнего просмотра","few":"В этой теме %{count} новых сообщения с вашего последнего просмотра","many":"В этой теме %{count} новых сообщений с вашего последнего просмотра","other":"В этой теме %{count} новых сообщений с вашего последнего просмотра"},"likes":{"one":"В теме %{count} лайк","few":"В теме %{count} лайка","many":"В теме %{count} лайков","other":"В теме %{count} лайков"},"back_to_list":"Вернуться к списку тем","options":"Параметры темы","show_links":"Показать ссылки в теме","toggle_information":"Показать/скрыть подробную информацию о теме","read_more_in_category":"Хотите почитать что-нибудь ещё? Можно посмотреть темы в %{catLink} или %{latestLink}.","read_more":"Хотите почитать что-нибудь ещё? %{catLink} или %{latestLink}.","unread_indicator":"Никто ещё не дочитал до конца этой темы.","browse_all_categories":"Просмотреть все разделы","browse_all_tags":"Просмотреть все теги","view_latest_topics":"Просмотреть последние темы","suggest_create_topic":"начать новое обсуждение?","jump_reply_up":"Перейти к более ранним ответам","jump_reply_down":"Перейти к более поздним ответам","deleted":"Тема удалена","slow_mode_update":{"title":"Замедленный режим","select":"Пользователи могут публиковать сообщения в этой теме не чаще чем раз в:","description":"Чтобы способствовать вдумчивому обсуждению в активных или спорных дискуссиях, пользователи должны подождать определённое время, прежде чем снова публиковать сообщения в этой теме.","save":"Включить","enabled_until":"(Необязательно) Включён до:","remove":"Отключить","hours":"Часы:","minutes":"Минуты:","seconds":"Секунды:","durations":{"15_minutes":"15 минут","1_hour":"1 час","4_hours":"4 часа","1_day":"1 день","1_week":"1 неделя","custom":"Настраиваемый интервал"}},"slow_mode_notice":{"duration":"Между публикациями сообщений в этой теме нужно подождать %{duration}"},"topic_status_update":{"title":"Таймер темы","save":"Установить таймер","num_of_hours":"Количество часов:","num_of_days":"Количество дней:","remove":"Удалить таймер","publish_to":"Опубликовать в:","when":"Когда:","time_frame_required":"Пожалуйста, выберите периоды времени"},"auto_update_input":{"none":"Выбор даты","now":"Сейчас","later_today":"Сегодня, но позже","tomorrow":"Завтра","later_this_week":"Позже на этой неделе","this_weekend":"В эти выходные","next_week":"Через неделю","two_weeks":"Через 2 недели","next_month":"Через месяц","two_months":"Через 2 месяца","three_months":"Через 3 месяца","four_months":"Через 4 месяца","six_months":"Через 6 месяцев","one_year":"Через год","forever":"Навсегда","pick_date_and_time":"Выбрать дату и время","set_based_on_last_post":"Закрыть после последнего сообщения"},"publish_to_category":{"title":"Опубликовать в разделе..."},"temp_open":{"title":"Открыть на время"},"auto_reopen":{"title":"Автоматическое открытие темы"},"temp_close":{"title":"Закрыть на время"},"auto_close":{"title":"Автоматическое закрытие темы","label":"Закрыть тему через указанное количество часов:","error":"Пожалуйста, введите корректное значение.","based_on_last_post":"Не закрывать, пока не пройдёт указанное количество часов с момента последнего сообщения в теме."},"auto_delete":{"title":"Автоматическое удаление темы"},"auto_bump":{"title":"Автоматическое поднятие темы"},"reminder":{"title":"Напомнить мне"},"auto_delete_replies":{"title":"Автоматическое удаление ответов"},"status_update_notice":{"auto_open":"Эта тема автоматически откроется %{timeLeft}.","auto_close":"Эта тема автоматически закроется %{timeLeft}.","auto_publish_to_category":"Эта тема будет опубликована в разделе \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e через %{timeLeft}.","auto_close_based_on_last_post":"Эта тема будет закрыта через %{duration} после последнего ответа.","auto_delete":"Эта тема будет автоматически удалена %{timeLeft}.","auto_bump":"Эта тема будет автоматически поднята %{timeLeft}.","auto_reminder":"Вам придёт напоминание об этой теме через %{timeLeft}.","auto_delete_replies":"Ответы в этой теме автоматически удаляются через %{duration}."},"auto_close_title":"Настройки закрытия темы","auto_close_immediate":{"one":"Последнее сообщение в этой теме отправлено %{count} час назад, поэтому данная тема будет закрыта незамедлительно.","few":"Последнее сообщение в этой теме отправлено %{count} часа назад, поэтому данная тема будет закрыта незамедлительно.","many":"Последнее сообщение в этой теме отправлено %{count} часов назад, поэтому данная тема будет закрыта незамедлительно.","other":"Последнее сообщение в этой теме отправлено %{count} часов назад, поэтому данная тема будет закрыта незамедлительно."},"timeline":{"back":"Вернуться","back_description":"Перейти к последнему непрочитанному сообщению","replies_short":"%{current} / %{total}"},"progress":{"title":"Текущее местоположение в теме","go_top":"Перейти в начало страницы","go_bottom":"Перейти в конец страницы","go":"=\u003e","jump_bottom":"Перейти к последнему сообщению","jump_prompt":"Перейти к...","jump_prompt_of":"из %{count} сообщений","jump_prompt_long":"Перейти к...","jump_bottom_with_number":"Перейти к сообщению %{post_number}","jump_prompt_to_date":"дате","jump_prompt_or":"или","total":"Всего сообщений","current":"Текущее сообщение"},"notifications":{"title":"Изменить частоту уведомлений об этой теме","reasons":{"mailing_list_mode":"Вы включили режим почтовой рассылки, поэтому Вы будете получать уведомления об ответах в этой теме через e-mail.","3_10":"Вы будете получать уведомления, поскольку наблюдаете за тегом этой темы.","3_6":"Вы будете получать уведомления, поскольку наблюдаете за этим разделом.","3_5":"Вы будете получать уведомления, поскольку наблюдение за темой началось автоматически.","3_2":"Вы будете получать уведомления, поскольку наблюдаете за этой темой.","3_1":"Вы будете получать уведомления, поскольку создали эту тему.","3":"Вы будете получать уведомления, поскольку наблюдаете за этой темой.","2_8":"Вы увидите количество новых ответов, поскольку следите за этим разделом.","2_4":"Вы увидите количество новых ответов, поскольку вы размещали ответ в этой теме.","2_2":"Вы увидите количество новых ответов, поскольку следите за этой темой.","2":"Вы увидите количество новых ответов, потому что \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eпрочитали эту тему\u003c/a\u003e.","1_2":"Вы будете получать уведомления, если кто-то упомянет ваш @псевдоним или ответит вам.","1":"Вы будете получать уведомления, если кто-то упомянет ваш @псевдоним или ответит вам.","0_7":"Не получать уведомлений из этого раздела.","0_2":"Не получать уведомлений по этой теме.","0":"Не получать уведомлений по этой теме."},"watching_pm":{"title":"Наблюдать","description":"Уведомлять по каждому ответу на это сообщение и показывать счётчик новых непрочитанных ответов."},"watching":{"title":"Наблюдать","description":"Уведомлять по каждому новому сообщению в этой теме и показывать счётчик новых непрочитанных ответов."},"tracking_pm":{"title":"Следить","description":"Количество непрочитанных сообщений появится рядом с этим сообщением. Вам придёт уведомление, только если кто-нибудь упомянет ваш @псевдоним или ответит на ваше сообщение."},"tracking":{"title":"Следить","description":"Количество непрочитанных сообщений появится рядом с названием этой темы. Вам придёт уведомление, только если кто-нибудь упомянет ваш @псевдоним или ответит на ваше сообщение."},"regular":{"title":"Уведомлять","description":"Вам придёт уведомление, только если кто-нибудь упомянет ваш @псевдоним или ответит на ваше сообщение."},"regular_pm":{"title":"Уведомлять","description":"Вам придёт уведомление, только если кто-нибудь упомянет ваш @псевдоним или ответит на ваше сообщение."},"muted_pm":{"title":"Без уведомлений","description":"Никогда не получать уведомлений по этой теме."},"muted":{"title":"Без уведомлений","description":"Не уведомлять об изменениях в этой теме и не отображать её в секции 'Последние'."}},"actions":{"title":"Действия","recover":"Отменить удаление темы","delete":"Удалить тему","open":"Открыть тему","close":"Закрыть тему","multi_select":"Выбрать сообщения...","slow_mode":"Установить замедленный режим","timed_update":"Действие по таймеру...","pin":"Закрепить тему...","unpin":"Открепить тему...","unarchive":"Разархивировать тему","archive":"Архивировать тему","invisible":"Скрыть тему","visible":"Показать тему","reset_read":"Сбросить счётчики","make_public":"Превратить в публичную тему","make_private":"Превратить в личное сообщение","reset_bump_date":"Сбросить дату поднятия"},"feature":{"pin":"Закрепить тему","unpin":"Открепить тему","pin_globally":"Закрепить тему глобально","make_banner":"Создать объявление","remove_banner":"Удалить объявление"},"reply":{"title":"Ответить","help":"Начать составление ответа в этой теме"},"clear_pin":{"title":"Открепить","help":"Открепить тему, чтобы она более не показывалась в самом начале списка тем"},"share":{"title":"Поделиться","extended_title":"Поделиться ссылкой","help":"Поделиться ссылкой на тему"},"print":{"title":"Печать","help":"Открыть версию для печати"},"flag_topic":{"title":"Пожаловаться","help":"Пожаловаться на сообщение","success_message":"Вы пожаловались на тему."},"make_public":{"title":"Преобразовать в публичную тему","choose_category":"Пожалуйста, выберите раздел для публичной темы:"},"feature_topic":{"title":"Закрепить эту тему","pin":"Закрепить эту тему вверху раздела %{categoryLink} до","unpin":"Отменить закрепление этой темы в верхней части раздела %{categoryLink}.","unpin_until":"Отменить закрепление этой темы в верхней части раздела %{categoryLink} (или открепление произойдёт автоматически \u003cstrong\u003e%{until}\u003c/strong\u003e).","pin_note":"Пользователи могут открепить тему, каждый сам для себя.","pin_validation":"Чтобы закрепить эту тему, требуется дата.","not_pinned":"В разделе %{categoryLink} нет закреплённых тем.","already_pinned":{"one":"Закреплённых тем в разделе %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"Закреплённых тем в разделе %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"Закреплённых тем в разделе %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Закреплённых тем в разделе %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Закрепить эту тему над всеми разделами до","confirm_pin_globally":{"one":"У вас уже есть %{count} глобально закреплённая тема. Большое количество закреплённых тем может быть неудобным для новичков и анонимных пользователей при навигации по форуму. Вы действительно хотите глобально закрепить ещё одну тему?","few":"У вас уже есть %{count} глобально закреплённых темы. Большое количество закреплённых тем может быть неудобным для новичков и анонимных пользователей при навигации по форуму. Вы действительно хотите глобально закрепить ещё одну тему?","many":"У вас уже есть %{count} глобально закреплённых тем. Большое количество закреплённых тем может быть неудобным для новичков и анонимных пользователей при навигации по форуму. Вы действительно хотите глобально закрепить ещё одну тему?","other":"У вас уже есть %{count} глобально закреплённых тем. Большое количество закреплённых тем может быть неудобным для новичков и анонимных пользователей при навигации по форуму. Вы действительно хотите глобально закрепить ещё одну тему?"},"unpin_globally":"Отменить прикрепление этой темы над всеми разделами.","unpin_globally_until":"Отменить прикрепление этой темы (или открепление произойдёт автоматически \u003cstrong\u003e%{until}\u003c/strong\u003e).","global_pin_note":"Пользователи могут открепить тему, каждый сам для себя.","not_pinned_globally":"Нет глобально закреплённых тем.","already_pinned_globally":{"one":"Глобально закреплённых тем: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"Глобально закреплённых тем: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"Глобально закреплённых тем: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Глобально закреплённых тем: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Превратить эту тему в объявление, которое будет отображаться в верхней части каждой страницы.","remove_banner":"Убрать объявление, которое отображается в верхней части каждой страницы.","banner_note":"Пользователи могут самостоятельно закрыть объявление, после чего оно больше не будет для них показываться. Только одна тема может быть преобразована в объявление.","no_banner_exists":"Нет текущих объявлений.","banner_exists":"На данный момент \u003cstrong class='badge badge-notification unread'\u003eуже есть\u003c/strong\u003e объявление."},"inviting":"Высылаю приглашение...","automatically_add_to_groups":"Это приглашение также предоставит доступ к следующим группам:","invite_private":{"title":"Пригласить в беседу","email_or_username":"Укажите адрес электронной почты или псевдоним того, кого вы хотите пригласить:","email_or_username_placeholder":"Email или псевдоним","action":"Пригласить","success":"Мы пригласили этого пользователя принять участие в беседе.","success_group":"Мы пригласили эту группу принять участие в беседе.","error":"К сожалению, в процессе приглашения пользователя произошла ошибка.","not_allowed":"Извините, этот пользователь не может быть приглашён.","group_name":"Название группы"},"controls":"Управление темой","invite_reply":{"title":"Пригласить","username_placeholder":"Псевдоним","action":"Отправить приглашение","help":"Пригласить других в эту тему с помощью Еmail или уведомлений","to_forum":"Будет отправлено короткое письмо, которое позволит вашему другу быстро присоединиться к обсуждению, просто кликнув по ссылке, без необходимости ввода учётных данных.","sso_enabled":"Введите псевдоним пользователя, которого вы хотите пригласить в эту тему.","to_topic_blank":"Введите псевдоним или Email пользователя, которого вы хотите пригласить в эту тему.","to_topic_email":"Вы указали адрес электронной почты. Мы отправим приглашение, которое позволит вашему другу немедленно ответить в этой теме.","to_topic_username":"Вы указали псевдоним пользователя. Мы отправим ему уведомление со ссылкой, чтобы пригласить его в эту тему.","to_username":"Введите псевдоним пользователя, которого вы хотите пригласить в эту тему. Мы отправим ему уведомление о том, что вы приглашаете его присоединиться к этой теме.","email_placeholder":"name@example.com","success_email":"Приглашение отправлено по адресу \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. Мы уведомим Вас, когда этим приглашением воспользуются. Проверьте вкладку \u003cb\u003eПриглашения\u003c/b\u003e на вашей странице пользователя, чтобы узнать состояние всех ваших приглашений.","success_username":"Мы пригласили этого пользователя принять участие в теме.","error":"К сожалению, мы не смогли пригласить этого человека. Возможно, он уже был приглашён? (Количество приглашений ограничено)","success_existing_email":"Пользователь с электронной почтой \u003cb\u003e%{emailOrUsername}\u003c/b\u003e уже существует. Мы пригласили этого пользователя принять участие в этой теме."},"login_reply":"Войти и ответить","filters":{"n_posts":{"one":"%{count} сообщение","few":"%{count} сообщения","many":"%{count} сообщений","other":"%{count} сообщений"},"cancel":"Отменить фильтр"},"move_to":{"title":"Перемещение сообщений","action":"Переместить","error":"При перемещении сообщений произошла ошибка."},"split_topic":{"title":"Переместить в новую тему","action":"Переместить в новую тему","topic_name":"Название новой темы","radio_label":"Новая тема","error":"При перемещении сообщений в новую тему произошла ошибка.","instructions":{"one":"Сейчас вы создадите новую тему и переместите в неё выбранное сообщение.","few":"Сейчас вы создадите новую тему и переместите в неё выбранные \u003cb\u003e%{count}\u003c/b\u003e сообщения.","many":"Сейчас вы создадите новую тему и переместите в неё выбранные \u003cb\u003e%{count}\u003c/b\u003e сообщений.","other":"Сейчас вы создадите новую тему и переместите в неё выбранные \u003cb\u003e%{count}\u003c/b\u003e сообщений."}},"merge_topic":{"title":"Переместить в существующую тему","action":"Переместить в существующую тему","error":"При перемещении сообщений в эту тему произошла ошибка.","radio_label":"При перемещении сообщений в эту тему произошла ошибка.","instructions":{"one":"Пожалуйста, выберите тему, в которую вы бы хотели переместить это сообщение.","few":"Пожалуйста, выберите тему, в которую вы бы хотели переместить эти \u003cb\u003e%{count}\u003c/b\u003e сообщения.","many":"Пожалуйста, выберите тему, в которую вы бы хотели переместить эти \u003cb\u003e%{count}\u003c/b\u003e сообщений.","other":"Пожалуйста, выберите тему, в которую вы бы хотели переместить эти \u003cb\u003e%{count}\u003c/b\u003e сообщений."}},"move_to_new_message":{"title":"Переместить в новое личное сообщение","action":"Переместить в новое личное сообщение","message_title":"Заголовок личного сообщения","radio_label":"Новое личное сообщение","participants":"Участники","instructions":{"one":"Вы собираетесь создать новое личное сообщение и заполнить его выбранным вами сообщением.","few":"Вы собираетесь создать новое личное сообщение и заполнить его\u003cb\u003e%{count}\u003c/b\u003e выбранным вами сообщениями.","many":"Вы собираетесь создать новое личное сообщение и заполнить его\u003cb\u003e%{count}\u003c/b\u003e выбранным вами сообщениями.","other":"Вы собираетесь создать новое личное сообщение и заполнить его\u003cb\u003e%{count}\u003c/b\u003e выбранным вами сообщениями."}},"move_to_existing_message":{"title":"Переместить в существующее личное сообщение","action":"Переместить в существующее личное сообщение","radio_label":"Существующее личное сообщение","participants":"Участники","instructions":{"one":"Пожалуйста, выберите личное сообщение, в которое вы хотите переместить это сообщение.","few":"Пожалуйста, выберите личное сообщение, в которое вы хотите переместить \u003cb\u003e%{count}\u003c/b\u003e сообщения.","many":"Пожалуйста, выберите личное сообщение, в которое вы хотите переместить \u003cb\u003e%{count}\u003c/b\u003e сообщений.","other":"Пожалуйста, выберите личное сообщение, в которое вы хотите переместить \u003cb\u003e%{count}\u003c/b\u003e сообщений."}},"merge_posts":{"title":"Объединить выделенные сообщения","action":"Объединить выделенные сообщения","error":"Произошла ошибка во время объединения выделенных сообщений."},"publish_page":{"title":"Публикация страниц","publish":"Опубликовать","description":"Когда тема публикуется в виде страницы, её URL-адрес может быть предоставлен для общего доступа, и она будет отображаться с пользовательским стилем.","slug":"Слаг (текстовый идентификатор)","public":"Опубликованная страница","public_description":"Пользователи могут видеть опубликованную страницу, даже если соответствующая тема является закрытой.","publish_url":"Ваша страница была опубликована по адресу:","topic_published":"Ваша тема была опубликована по адресу:","preview_url":"Ваша страница будет опубликована по адресу:","invalid_slug":"Извините, вы не можете опубликовать эту страницу.","unpublish":"Отменить публикацию","unpublished":"Публикация страницы была отменена и более недоступна по указанному ранее адресу.","publishing_settings":"Настройки публикации"},"change_owner":{"title":"Сменить владельца","action":"Сменить владельца","error":"При смене владельца сообщений произошла ошибка.","placeholder":"Псевдоним нового владельца","instructions":{"one":"Пожалуйста, выберите нового владельца для сообщения \u003cb\u003e@%{old_user}\u003c/b\u003e","few":"Пожалуйста, выберите нового владельца для %{count} сообщений \u003cb\u003e@%{old_user}\u003c/b\u003e","many":"Пожалуйста, выберите нового владельца для %{count} сообщений \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Пожалуйста, выберите нового владельца для %{count} сообщений \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Пожалуйста, выберите нового владельца сообщения","few":"Пожалуйста, выберите нового владельца %{count} сообщений","many":"Пожалуйста, выберите нового владельца %{count} сообщений","other":"Пожалуйста, выберите нового владельца %{count} сообщений"}},"change_timestamp":{"title":"Изменить метку времени...","action":"Изменить метку времени","invalid_timestamp":"Метка времени не может быть в будущем","error":"При изменении метки времени темы возникла ошибка","instructions":"Пожалуйста, выберите новую метку времени. Сообщения в теме будут обновлены, чтобы иметь одинаковую разницу во времени."},"multi_select":{"select":"Выбрать","selected":"Выбрано (%{count})","select_post":{"label":"Выбрать","title":"Добавить сообщение в подборку"},"selected_post":{"label":"Выбрано","title":"Нажмите, чтобы удалить сообщение из подборки"},"select_replies":{"label":"Выбрать + ответы","title":"Добавить сообщение и все ответы на него в подборку"},"select_below":{"label":"Выбрать + все ниже","title":"Добавить сообщение и все последующие сообщения в подборку"},"delete":"Удалить выбранные","cancel":"Отменить","select_all":"Выбрать всё","deselect_all":"Снять весь выбор","description":{"one":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e сообщение.","few":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e сообщения.","many":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e сообщений.","other":"Вы выбрали \u003cb\u003e%{count}\u003c/b\u003e сообщений."}},"deleted_by_author":{"one":"(тема отозвана автором и будет автоматически удалена через %{count} час, если только на неё не поступит жалоба)","few":"(тема отозвана автором и будет автоматически удалена через %{count} часа, если только на неё не поступит жалоба)","many":"(тема отозвана автором и будет автоматически удалена через %{count} часов, если только на неё не поступит жалоба)","other":"(тема отозвана автором и будет автоматически удалена через %{count} часов, если только на неё не поступит жалоба)"}},"post":{"quote_reply":"Ответить с цитированием","quote_share":"Поделиться","edit_reason":"Причина: ","post_number":"сообщение %{number}","ignored":"Игнорируемое содержимое","wiki_last_edited_on":"Вики редактировалась","last_edited_on":"Последний раз сообщение редактировалось","reply_as_new_topic":"Ответить в новой связанной теме","reply_as_new_private_message":"Ответить в новом сообщении тем же адресатам","continue_discussion":"Продолжая обсуждение из темы %{postLink}:","follow_quote":"Перейти к цитируемому сообщению","show_full":"Показать полный текст","show_hidden":"Просмотр игнорируемого содержимого.","deleted_by_author":{"one":"(сообщение отозвано автором и будет автоматически удалено в течение %{count} часа, если только на сообщение не поступит жалоба)","few":"(сообщение отозвано автором и будет автоматически удалено в течение %{count} часов, если только на сообщение не поступит жалоба)","many":"(сообщение отозвано автором и будет автоматически удалено в течение %{count} часов, если только на сообщение не поступит жалоба)","other":"(сообщение отозвано автором и будет автоматически удалено в течение %{count} часов, если только на сообщение не поступит жалоба)"},"collapse":"Свернуть","expand_collapse":"Развернуть/Свернуть","locked":"Модератор заблокировал это сообщение для редактирования","gap":{"one":"Просмотреть %{count} скрытый ответ","few":"Просмотреть %{count} скрытых ответа","many":"Просмотреть %{count} скрытых ответов","other":"Просмотреть %{count} скрытых ответов"},"notice":{"new_user":"Это первая публикация %{user} — поприветствуем его в нашем сообществе!","returning_user":"Пользователь %{user} давно не появлялся — его последнее сообщение было %{time}."},"unread":"Сообщение не прочитано","has_replies":{"one":"%{count} ответ","few":"%{count} ответа","many":"%{count} ответов","other":"%{count} ответов"},"has_replies_count":"%{count}","unknown_user":"(неизвестный/удалённый пользователь)","has_likes_title":{"one":"Это сообщение понравилось %{count} человеку","few":"Это сообщение понравилось %{count} людям","many":"Это сообщение понравилось %{count} людям","other":"Это сообщение понравилось %{count} людям"},"has_likes_title_only_you":"Вам понравилось это сообщение","has_likes_title_you":{"one":"Вам и ещё %{count} человеку понравилось это сообщение","few":"Вам и ещё %{count} людям понравилось это сообщение","many":"Вам и ещё %{count} людям понравилось это сообщение","other":"Вам и ещё %{count} людям понравилось это сообщение"},"filtered_replies_hint":{"one":"Посмотреть это сообщение и ответ на него","few":"Посмотреть это сообщение и %{count} ответа","many":"Посмотреть это сообщение и %{count} ответов","other":"Посмотреть это сообщение и %{count} ответов"},"filtered_replies_viewing":{"one":"Просмотр %{count} ответа на","few":"Просмотр %{count} ответов на","many":"Просмотр %{count} ответов на","other":"Просмотр %{count} ответов на"},"in_reply_to":"Загрузить родительское сообщение","errors":{"create":"К сожалению, не удалось создать сообщение из-за ошибки. Попробуйте ещё раз.","edit":"К сожалению, не удалось изменить сообщение. Попробуйте ещё раз.","upload":"К сожалению, не удалось загрузить файл. Попробуйте ещё раз.","file_too_large":"К сожалению, этот файл слишком большой (максимально допустимый размер %{max_size_kb} КБ). Почему бы не загрузить этот файл в облако, а затем поделиться ссылкой?","too_many_uploads":"К сожалению, за один раз можно загрузить только одно изображение.","too_many_dragged_and_dropped_files":{"one":"Извините, но вы можете загрузить одномоментно не более %{count} файла.","few":"Извините, но вы можете загрузить одномоментно не более %{count} файлов.","many":"Извините, но вы можете загрузить одномоментно не более %{count} файлов.","other":"Извините, но вы можете загрузить одномоментно не более %{count} файлов."},"upload_not_authorized":"К сожалению, вы не можете загрузить файл данного типа (список разрешённых типов файлов: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"К сожалению, загрузка изображений недоступна новым пользователям.","attachment_upload_not_allowed_for_new_user":"К сожалению, загрузка файлов недоступна новым пользователям.","attachment_download_requires_login":"Войдите, чтобы скачать прикреплённые файлы."},"abandon_edit":{"confirm":"Вы действительно хотите отменить внесённые изменения?","no_value":"Нет, оставить","no_save_draft":"Нет, сохранить черновик","yes_value":"Да, отменить редактирование"},"abandon":{"title":"Отказаться от черновика","confirm":"Вы действительно хотите отказаться от создания сообщения?","no_value":"Нет, оставить","no_save_draft":"Нет, сохранить черновик","yes_value":"Да, отказаться"},"via_email":"Это сообщение получено по электронной почте","via_auto_generated_email":"Это автоматическое сообщение получено по электронной почте","whisper":"Это скрытое сообщение и оно доступно только модераторам","wiki":{"about":"Это вики-сообщение"},"archetypes":{"save":"Параметры сохранения"},"few_likes_left":"Спасибо, что делитесь любовью. На сегодня у Вас осталось несколько лайков.","controls":{"reply":"Начать составление ответа на сообщение","like":"Мне нравится","has_liked":"Вам понравилось это сообщение","read_indicator":"Пользователи, которые читают это сообщение","undo_like":"Больше не нравится","edit":"Изменить сообщение","edit_action":"Изменить","edit_anonymous":"Войдите, чтобы отредактировать это сообщение.","flag":"Пожаловаться на сообщение","delete":"Удалить сообщение","undelete":"Отменить удаление","share":"Поделиться ссылкой на сообщение","more":"Ещё","delete_replies":{"confirm":"Хотите удалить также и ответы на это сообщение?","direct_replies":{"one":"Да, и %{count} прямой ответ","few":"Да, и %{count} прямых ответа","many":"Да, и %{count} прямых ответов","other":"Да, и %{count} прямых ответов"},"all_replies":{"one":"Да, и %{count} ответ","few":"Да, и все %{count} ответа","many":"Да, и все %{count} ответов","other":"Да, и все %{count} ответов"},"just_the_post":"Нет, только это сообщение"},"admin":"Действия администратора над сообщением","wiki":"Сделать вики-сообщением","unwiki":"Отменить вики-сообщение","convert_to_moderator":"Добавить цвет модератора","revert_to_regular":"Убрать цвет модератора","rebake":"Перестроить HTML","publish_page":"Публикация страниц","unhide":"Снова сделать видимым","change_owner":"Изменить владельца","grant_badge":"Выдать награду","lock_post":"Заморозить сообщение","lock_post_description":"Запретить автору редактировать это сообщение","unlock_post":"Разморозить сообщение","unlock_post_description":"Разрешить автору редактировать это сообщение","delete_topic_disallowed_modal":"У вас нет разрешения на удаление этой темы. Если вы действительно хотите, чтобы она была удалена, воспользуйтесь кнопкой \u003cb\u003eПожаловаться\u003c/b\u003e, указав причину, по которой тема должна быть удалена.","delete_topic_disallowed":"У вас нет разрешения на удаление этой темы","delete_topic_confirm_modal":"Эта тема в настоящее время имеет более %{minViews} просмотров и может быть популярна в выдаче результатов поиска. Вы действительно хотите удалить эту тему, а не отредактировать её для улучшения качества содержащейся в ней информации?","delete_topic_confirm_modal_yes":"Да, удалить эту тему","delete_topic_confirm_modal_no":"Нет, оставить эту тему","delete_topic_error":"Произошла ошибка при удалении темы","delete_topic":"Удалить тему","add_post_notice":"Сообщение от модератора","change_post_notice":"Изменить сообщение модератора","delete_post_notice":"Удалить сообщение модератора","remove_timer":"Отменить таймер"},"actions":{"people":{"like":{"one":"понравилось","few":"понравилось","many":"понравилось","other":"понравилось"},"read":{"one":"прочитал","few":"прочитали","many":"прочитали","other":"прочитали"},"like_capped":{"one":"и %{count} понравилось","few":"и %{count} другим понравилось","many":"и %{count} другим понравилось","other":"и %{count} другим понравилось"},"read_capped":{"one":"и ещё %{count} прочитал","few":"и ещё %{count} прочитали","many":"и ещё %{count} прочитали","other":"и ещё %{count} прочитали"}},"by_you":{"off_topic":"Помечено вами как оффтопик","spam":"Помечено вами как спам","inappropriate":"Помечено вами как неуместное","notify_moderators":"Вы отправили жалобу модератору","notify_user":"Вы отправили сообщение этому пользователю"}},"delete":{"confirm":{"one":"Вы действительно хотите удалить это сообщение?","few":"Вы действительно хотите удалить %{count} сообщения?","many":"Вы действительно хотите удалить %{count} сообщений?","other":"Вы действительно хотите удалить %{count} сообщений?"}},"merge":{"confirm":{"one":"Вы действительно хотите объединить эти сообщения?","few":"Вы действительно хотите объединить эти %{count} сообщения?","many":"Вы действительно хотите объединить эти %{count} сообщений?","other":"Вы действительно хотите объединить эти %{count} сообщений?"}},"revisions":{"controls":{"first":"Начальная версия","previous":"Предыдущая версия","next":"Следующая версия","last":"Последняя версия","hide":"Скрыть версию","show":"Показать версию","revert":"Откат до версии %{revision}","edit_wiki":"Редактировать Wiki","edit_post":"Редактировать запись","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Отобразить сообщение со всеми добавлениями и удалениями.","button":"HTML"},"side_by_side":{"title":"Показать отличия версий бок о бок","button":"HTML"},"side_by_side_markdown":{"title":"Показать отличия в исходном тексте бок о бок","button":"Исходный текст"}}},"raw_email":{"displays":{"raw":{"title":"Показать исходный текст письма","button":"Исходный текст"},"text_part":{"title":"Показать текстовую версию письма","button":"Текст"},"html_part":{"title":"Показать HTML-версию письма","button":"HTML"}}},"bookmarks":{"create":"Создать закладку","edit":"Изменить закладку","created":"Создано","updated":"Обновлено","name":"Имя","name_placeholder":"Присвоить имя закладке (необязательно)","set_reminder":"Настроить напоминание (необязательно)","actions":{"delete_bookmark":{"name":"Удалить закладку","description":"Удаление закладки, включая все настроенные о ней напоминания."},"edit_bookmark":{"name":"Изменить закладку","description":"Изменение названия закладки или даты/времени напоминания."}}},"filtered_replies":{"viewing_posts_by":"Просмотр %{post_count} сообщений от","viewing_subset":"Некоторые ответы свернуты","viewing_summary":"Просмотр сводки по этой теме","post_number":"%{username}, сообщение #%{post_number}","show_all":"Показать все"}},"category":{"can":"может\u0026hellip; ","none":"(РАЗНОЕ)","all":"Все разделы","choose":"Выберите раздел\u0026hellip;","edit":"Изменить","edit_dialog_title":"Редактировать: %{categoryName}","view":"Просмотр тем по разделам","back":"Вернуться в раздел","general":"Общие","settings":"Настройки","topic_template":"Шаблон темы","tags":"Теги","tags_allowed_tags":"Ограничить теги этим разделом:","tags_allowed_tag_groups":"Ограничить группы тегов этим разделом:","tags_placeholder":"(Необязат.) Доступные теги","tags_tab_description":"Теги и группы тегов, указанные здесь, будут доступны только в этом разделе и других разделах, в которых они были указаны. Они не будут доступны для использования в других разделах.","tag_groups_placeholder":"(Необязат.) Доступные группы тегов","manage_tag_groups_link":"Управление группами тегов","allow_global_tags_label":"Также разрешить другие теги","tag_group_selector_placeholder":"(Необязат.) Группа тегов","required_tag_group_description":"Требовать, чтобы новые темы имели теги из группы тегов:","min_tags_from_required_group_label":"Номер тега:","required_tag_group_label":"Группа тегов:","topic_featured_link_allowed":"Разрешить избранные ссылки в этом разделе","delete":"Удалить раздел","create":"Создать раздел","create_long":"Создать новый раздел","save":"Сохранить раздел","slug":"Ссылка на раздел","slug_placeholder":"(Необязат.) Слова для URL, разделённые дефисами","creation_error":"При создании нового раздела возникла ошибка.","save_error":"При сохранении раздела возникла ошибка.","name":"Название раздела","description":"Описание","topic":"Тема раздела","logo":"Логотип раздела","background_image":"Фоновое изображение раздела","badge_colors":"Цвета наград","background_color":"Цвет фона","foreground_color":"Цвет переднего плана","name_placeholder":"Не более одного-двух слов","color_placeholder":"Любой цвет из веб-палитры","delete_confirm":"Вы действительно хотите удалить раздел?","delete_error":"При удалении раздела произошла ошибка.","list":"Список разделов","no_description":"Пожалуйста, добавьте описание для этого раздела.","change_in_category_topic":"Изменить описание","already_used":"Цвет уже используется другим разделом","security":"Безопасность","security_add_group":"Добавить группу","permissions":{"group":"Группа","see":"Просмотр","reply":"Ответ","create":"Создание","no_groups_selected":"Доступ не предоставлен ни одной группе; этот раздел будет виден только персоналу.","everyone_has_access":"Эта общедоступный раздел; все пользователи могут просматривать, создавать сообщения, а также отвечать на них. Чтобы ограничить разрешения, удалите одно или несколько разрешений, предоставленных группе 'все'.","toggle_reply":"Переключить разрешение 'Ответ'","toggle_full":"Переключить разрешение 'Создание'","inherited":"Это разрешение унаследовано от группы 'все'"},"special_warning":"Внимание: данный раздел был предустановлен по умолчанию и его настройки безопасности не могут быть изменены. Если не хотите использовать этот раздел, удалите его вместо изменения.","uncategorized_security_warning":"Это специальный раздел, предназначенный для хранения тем, которые не относятся к какому-либо разделу; у него не может быть настроек безопасности.","uncategorized_general_warning":"Это специальный раздел, используемый в качестве раздела по умолчанию для новых тем, для которых не был выбран конкретный раздел. Если вы хотите предотвратить такое поведение и принудительно выбирать раздел, отключите соответствующую настройку \u003ca href=\"%{settingLink}\"\u003eздесь\u003c/a\u003e. Если вы хотите изменить название или описание раздела, сделайте это в настройке \u003ca href=\"%{customizeLink}\"\u003eОформление / Текст\u003c/a\u003e.","pending_permission_change_alert":"Вы не добавили %{group} в этот раздел; нажмите эту кнопку для добавления.","images":"Изображения","email_in":"Индивидуальный адрес входящей почты:","email_in_allow_strangers":"Принимать письма от анонимных пользователей, не имеющих учётных записей","email_in_disabled":"Создание новых тем через электронную почту отключено в настройках сайта. Чтобы разрешить создание новых тем через электронную почту,","email_in_disabled_click":"активируйте настройку \"email in\".","mailinglist_mirror":"Раздел отражает список рассылки","show_subcategory_list":"Показывать список подразделов над списком тем в этом разделе.","read_only_banner":"Текст баннера, когда пользователь не может создавать темы в этом разделе:","num_featured_topics":"Количество тем, отображаемых на странице раздела:","subcategory_num_featured_topics":"Количество избранных тем на странице родительского раздела:","all_topics_wiki":"Создавать новые темы в виде вики-сообщений","subcategory_list_style":"Стиль списка подразделов:","sort_order":"Порядок сортировки тем:","default_view":"Вид списка тем по умолчанию:","default_top_period":"По умолчанию отображать темы в секции 'Обсуждаемые' за этот период:","default_list_filter":"Фильтр по умолчанию:","allow_badges_label":"Разрешить вручение наград в этом разделе","edit_permissions":"Изменить права доступа","reviewable_by_group":"Кто ещё, помимо персонала, может модерировать содержимое этого раздела:","review_group_name":"Название группы","require_topic_approval":"Требовать одобрения модератором всех новых тем","require_reply_approval":"Требовать одобрения модератором всех новых ответов","this_year":"за год","position":"Позиция на странице раздела:","default_position":"Позиция по умолчанию","position_disabled":"Разделы будут показаны в порядке активности. Чтобы настроить порядок разделов,","position_disabled_click":"включите настройку \"fixed category positions\".","minimum_required_tags":"Минимальное количество тегов, требуемых в теме:","parent":"Родительский раздел","num_auto_bump_daily":"Число открытых тем для автоматического ежедневного поднятия:","navigate_to_first_post_after_read":"Перейти к первому сообщению после прочтения тем","notifications":{"watching":{"title":"Наблюдать","description":"Наблюдать за всеми темами этого раздела. Уведомлять о каждом новом сообщении в любой из тем и показывать счётчик новых ответов."},"watching_first_post":{"title":"Наблюдать за первым сообщением","description":"Вы будете уведомлены о новых темах в этом разделе, но не о новых ответах в них."},"tracking":{"title":"Следить","description":"Отслеживать все темы этого раздела. Уведомлять, если кто-то упомянет мой @псевдоним или ответит на моё сообщение. Показывать счётчик новых ответов."},"regular":{"title":"Уведомлять","description":"Уведомлять, если кто-нибудь упомянет мой @псевдоним или ответит на моё сообщение."},"muted":{"title":"Без уведомлений","description":"Не уведомлять о новых темах в этом разделе и не отображать их в секции 'Последние'."}},"search_priority":{"label":"Приоритет поиска","options":{"normal":"Нормальный","ignore":"Игнорировать","very_low":"Очень низкий","low":"Низкий","high":"Высокий","very_high":"Очень высокий"}},"sort_options":{"default":"По умолчанию","likes":"Количество симпатий","op_likes":"Количество симпатий у первого сообщения","views":"Количество просмотров","posts":"Количество сообщений","activity":"Последняя активность","posters":"Количество участников","category":"Раздел","created":"Дата создания"},"sort_ascending":"По возрастанию","sort_descending":"По убыванию","subcategory_list_styles":{"rows":"Строки","rows_with_featured_topics":"Строки с избранными темами","boxes":"Блоки","boxes_with_featured_topics":"Блоки с избранными темами"},"settings_sections":{"general":"Основные","moderation":"Модерация","appearance":"Внешний вид","email":"Email"},"list_filters":{"all":"Все темы","none":"Без подразделов"},"colors_disabled":"Вы не можете выбирать цвета, поскольку не указан стиль раздела."},"flagging":{"title":"Спасибо за вашу помощь в поддержании порядка!","action":"Пожаловаться на сообщение","take_action":"Принять меры...","take_action_options":{"default":{"title":"Принять меры","details":"Сымитировать пороговое количество жалоб, не дожидаясь их от сообщества"},"suspend":{"title":"Заморозить пользователя","details":"Сымитировать пороговое количество жалоб и заморозить пользователя"},"silence":{"title":"Заблокировать пользователя","details":"Сымитировать пороговое количество жалоб и заблокировать пользователя"}},"notify_action":"Сообщение","official_warning":"Официальное предупреждение","delete_spammer":"Удалить спамера","yes_delete_spammer":"Да, удалить спамера","ip_address_missing":"(не доступен)","hidden_email_address":"(скрыто)","submit_tooltip":"Отправить приватную жалобу","take_action_tooltip":"Сымитировать пороговое количество жалоб, не дожидаясь их от сообщества","cant":"Вы не можете сейчас отправить жалобу на это сообщение.","notify_staff":"Приватно сообщить персоналу","formatted_name":{"off_topic":"Это оффтопик","inappropriate":"Это неприемлемо","spam":"Это спам"},"custom_placeholder_notify_user":"Будьте точны, конструктивны и доброжелательны.","custom_placeholder_notify_moderators":"Поясните суть проблемы: на что нам следует обратить внимание. Предоставьте соответствующие ссылки и примеры, если это возможно.","custom_message":{"at_least":{"one":"Введите не менее %{count} символа","few":"Введите не менее %{count} символов","many":"Введите не менее %{count} символов","other":"Введите не менее %{count} символов"},"more":{"one":"Ещё %{count} символ...","few":"Ещё хотя бы %{count} символа...","many":"Ещё хотя бы %{count} символов...","other":"Ещё хотя бы %{count} символов..."},"left":{"one":"Осталось не более %{count} символа","few":"Осталось не более %{count} символов","many":"Осталось не более %{count} символов","other":"Осталось не более %{count} символов"}}},"flagging_topic":{"title":"Спасибо за помощь в поддержании порядка!","action":"Пожаловаться на тему","notify_action":"Сообщение"},"topic_map":{"title":"Сводка по теме","participants_title":"Частые авторы","links_title":"Популярные ссылки","links_shown":"показать больше ссылок...","clicks":{"one":"%{count} клик","few":"%{count} клика","many":"%{count} кликов","other":"%{count} кликов"}},"post_links":{"about":"развернуть больше ссылок для этого сообщения","title":{"one":"ещё %{count}","few":"ещё %{count}","many":"ещё %{count}","other":"ещё %{count}"}},"topic_statuses":{"warning":{"help":"Это официальное предупреждение."},"bookmarked":{"help":"Вы добавили тему в закладки"},"locked":{"help":"Тема закрыта; в ней больше нельзя отвечать"},"archived":{"help":"Тема заархивирована и не может быть изменена"},"locked_and_archived":{"help":"Тема закрыта и заархивирована; в ней больше нельзя отвечать она больше не может быть изменена"},"unpinned":{"title":"Откреплена","help":"Эта тема для вас откреплена; она будет отображаться в обычном порядке"},"pinned_globally":{"title":"Закреплена глобально","help":"Эта тема закреплена глобально; она будет отображаться вверху как на главной странице, так и в своём разделе"},"pinned":{"title":"Закреплена","help":"Эта тема для вас закреплена; она будет показана вверху своего раздела"},"unlisted":{"help":"Тема исключена из всех списков тем и доступна только по прямой ссылке"},"personal_message":{"title":"Эта тема является личным сообщением","help":"Эта тема является личным сообщением"}},"posts":"Сообщ.","original_post":"Начальное сообщение","views":"Просм.","views_lowercase":{"one":"просмотр","few":"просмотра","many":"просмотров","other":"просмотров"},"replies":"Ответов","views_long":{"one":"Тема просмотрена %{count} раз","few":"Тема просмотрена %{number} раза","many":"Тема просмотрена %{number} раз","other":"Тема просмотрена %{number} раз"},"activity":"Активность","likes":"Нрав.","likes_lowercase":{"one":"симпатия","few":"симпатии","many":"симпатий","other":"симпатий"},"users":"Пользователи","users_lowercase":{"one":"пользователь","few":"пользователя","many":"пользователей","other":"пользователей"},"category_title":"Раздел","history":"История","changed_by":"автором %{author}","raw_email":{"title":"Входящее сообщение","not_available":"Не доступно!"},"categories_list":"Список разделов","filters":{"with_topics":"%{filter} темы","with_category":"%{category} - %{filter} темы","latest":{"title":"Последние","title_with_count":{"one":"Последняя (%{count})","few":"Последние (%{count})","many":"Последние (%{count})","other":"Последние (%{count})"},"help":"Темы с недавно созданными сообщениями"},"read":{"title":"Прочитанные","help":"Темы, которые вас заинтересовали (в обратном хронологическом порядке)"},"categories":{"title":"Разделы","title_in":"Раздел - %{categoryName}","help":"Все темы, сгруппированные по разделам"},"unread":{"title":"Непрочитанные","title_with_count":{"one":"Непрочитанная (%{count})","few":"Непрочитанные (%{count})","many":"Непрочитанные (%{count})","other":"Непрочитанные (%{count})"},"help":"Наблюдаемые или отслеживаемые темы с непрочитанными сообщениями","lower_title_with_count":{"one":"%{count} непрочитанная","few":"%{count} непрочитанных","many":"%{count} непрочитанных","other":"%{count} непрочитанных"}},"new":{"lower_title_with_count":{"one":"%{count} новая","few":"%{count} новых","many":"%{count} новых","other":"%{count} новых"},"lower_title":"новые","title":"Новые","title_with_count":{"one":"Новая (%{count})","few":"Новые (%{count})","many":"Новые (%{count})","other":"Новые (%{count})"},"help":"Темы, созданные за последние несколько дней"},"posted":{"title":"Мои сообщения","help":"Темы, в которых вы принимали участие"},"bookmarks":{"title":"Закладки","help":"Темы, которые вы добавили в закладки"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","few":"%{categoryName} (%{count})","many":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"Последние темы в разделе %{categoryName}"},"top":{"title":"Обсуждаемые","help":"Самые активные темы за последний год, месяц, квартал, неделю или день","all":{"title":"За всё время"},"yearly":{"title":"За год"},"quarterly":{"title":"За квартал"},"monthly":{"title":"За месяц"},"weekly":{"title":"За неделю"},"daily":{"title":"За день"},"all_time":"За всё время","this_year":"За год","this_quarter":"За квартал","this_month":"За месяц","this_week":"За неделю","today":"За сегодня","other_periods":"Просмотреть самые обсуждаемые:"}},"browser_update":"К сожалению, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eваш браузер безнадёжно устарел\u003c/a\u003e . Пожалуйста, \u003ca href=\"https://browsehappy.com\"\u003eобновите его\u003c/a\u003e для полноценной работы с сайтом.","permission_types":{"full":"Создавать / Отвечать / Просматривать","create_post":"Отвечать / Просматривать","readonly":"Просматривать"},"lightbox":{"download":"скачать","previous":"Предыдущий (клавиша со стрелкой влево)","next":"Далее (клавиша со стрелкой вправо)","counter":"%curr% из %total%","close":"Закрыть (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eСодержимое\u003c/a\u003e не удалось загрузить.","image_load_error":"\u003ca href=\"%url%\"\u003eИзображение\u003c/a\u003e не удалось загрузить."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} или %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Сочетания клавиш","jump_to":{"title":"Быстрый переход","home":"%{shortcut} Главная","latest":"%{shortcut} Последние","new":"%{shortcut} Новые","unread":"%{shortcut} Непрочитанные","categories":"%{shortcut} Разделы","top":"%{shortcut} Обсуждаемые","bookmarks":"%{shortcut} Закладки","profile":"%{shortcut} Профиль","messages":"%{shortcut} Личные сообщения","drafts":"%{shortcut} Черновики","next":"%{shortcut} Следующая тема","previous":"%{shortcut} Предыдущая тема"},"navigation":{"title":"Навигация","jump":"%{shortcut} Перейти к сообщению №","back":"%{shortcut} Назад","up_down":"%{shortcut} Переместить выделение \u0026uarr; \u0026darr;","open":"%{shortcut} Открыть выделенную тему","next_prev":"%{shortcut} Следующая/предыдущая секция","go_to_unread_post":"%{shortcut} Перейти к первому непрочитанному сообщению"},"application":{"title":"Форум","create":"%{shortcut} Создать тему","notifications":"%{shortcut} Открыть уведомления","hamburger_menu":"%{shortcut} Открыть системное меню","user_profile_menu":"%{shortcut} Открыть меню профиля","show_incoming_updated_topics":"%{shortcut} Показать обновлённые темы","search":"%{shortcut} Поиск","help":"%{shortcut} Показать эту справку","dismiss_new_posts":"%{shortcut} Отложить новые сообщения","dismiss_topics":"%{shortcut} Отложить темы","log_out":"%{shortcut} Выйти"},"composing":{"title":"Редактирование","return":"%{shortcut} Вернуться в редактор","fullscreen":"%{shortcut} Полноэкранный редактор"},"bookmarks":{"title":"Создание закладки","enter":"%{shortcut} Сохранить и закрыть","later_today":"%{shortcut} Сегодня, но позже","later_this_week":"%{shortcut} Позже на этой неделе","tomorrow":"%{shortcut} Завтра","next_week":"%{shortcut} Через неделю","next_month":"%{shortcut} Через месяц","next_business_week":"%{shortcut} На следующей рабочей неделе","next_business_day":"%{shortcut} На следующий рабочий день","custom":"%{shortcut} Установить дату и время напоминания","none":"%{shortcut} Не настраивать напоминание","delete":"%{shortcut} Удалить закладку"},"actions":{"title":"Темы","bookmark_topic":"%{shortcut} Добавить / удалить из закладок","pin_unpin_topic":"%{shortcut} Закрепить / Открепить тему","share_topic":"%{shortcut} Поделиться темой","share_post":"%{shortcut} Поделиться сообщением","reply_as_new_topic":"%{shortcut} Ответить в новой связанной теме","reply_topic":"%{shortcut} Ответить в теме","reply_post":"%{shortcut} Ответить на сообщение","quote_post":"%{shortcut} Процитировать сообщение","like":"%{shortcut} Выразить симпатию за сообщение","flag":"%{shortcut} Пожаловаться на сообщение","bookmark":"%{shortcut} Добавить сообщение в закладки","edit":"%{shortcut} Редактировать сообщение","delete":"%{shortcut} Удалить сообщение","mark_muted":"%{shortcut} Откл. уведомления в теме","mark_regular":"%{shortcut} Стандартные уведомления в теме (по-умолчанию)","mark_tracking":"%{shortcut} Следить за темой","mark_watching":"%{shortcut} Наблюдать за темой","print":"%{shortcut} Печатать тему","defer":"%{shortcut} Отложить тему","topic_admin_actions":"%{shortcut} Открыть в теме меню действий администратора"},"search_menu":{"title":"Меню результатов поиска","prev_next":"%{shortcut} Перемещение по результатам поиска","insert_url":"%{shortcut} Вставить ссылку на найденное сообщение в окно открытого редактора"}},"badges":{"earned_n_times":{"one":"Заработал эту награду %{count} раз","few":"Заработали эту награду %{count} раза","many":"Заработали эту награду %{count} раз","other":"Заработали эту награду %{count} раз"},"granted_on":"Выдана %{date}","others_count":"Другие с этой наградой (%{count})","title":"Награды","allow_title":"Вы можете использовать эту награду в качестве титула.","multiple_grant":"Вы можете получить эту награду несколько раз","badge_count":{"one":"%{count} награда","few":"%{count} награды","many":"%{count} наград","other":"%{count} наград"},"more_badges":{"one":"ещё +%{count}","few":"+ ещё %{count}","many":"+ ещё %{count}","other":"+ ещё %{count}"},"granted":{"one":"выдано %{count}","few":"выдано %{count}","many":"выдано %{count}","other":"выдано %{count}"},"select_badge_for_title":"Использовать награду в качестве титула","none":"(нет)","successfully_granted":"Награда %{badge} успешно присвоена пользователю %{username}","badge_grouping":{"getting_started":{"name":"Начало работы"},"community":{"name":"Сообщество"},"trust_level":{"name":"Уровень доверия"},"other":{"name":"Прочее"},"posting":{"name":"Публикации"}}},"tagging":{"all_tags":"Все теги","other_tags":"Другие теги","selector_all_tags":"Все теги","selector_no_tags":"Без тегов","changed":"Теги изменены:","tags":"Теги","choose_for_topic":"Выберите теги...","info":"Информация","default_info":"Этот тег не ограничен никакими разделами и не имеет синонимов.","category_restricted":"Этот тег ограничен разделами, к которым у вас нет доступа.","synonyms":"Синонимы","synonyms_description":"При использовании следующих тегов они будут заменены на \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Этот тег принадлежит группе \"%{tag_groups}\".","few":"Этот тег принадлежит к этим группам: %{tag_groups}.","many":"Этот тег принадлежит к этим группам: %{tag_groups}.","other":"Этот тег принадлежит к этим группам: %{tag_groups}."},"category_restrictions":{"one":"Его можно использовать только в этом разделе:","few":"Их можно использовать только в этом разделе:","many":"Их можно использовать только в этом разделе:","other":"Их можно использовать только в этом разделе:"},"edit_synonyms":"Управление синонимами","add_synonyms_label":"Добавить синонимы:","add_synonyms":"Добавить","add_synonyms_explanation":{"one":"Везде, где используется этот тег, он будет заменён на тег \u003cb\u003e%{tag_name}\u003c/b\u003e. Вы действительно хотите внести эти изменения?","few":"Везде, где используются эти теги, они будут заменены на тег \u003cb\u003e%{tag_name}\u003c/b\u003e. Вы действительно хотите внести эти изменения?","many":"Везде, где используются эти теги, они будут заменены на тег \u003cb\u003e%{tag_name}\u003c/b\u003e. Вы действительно хотите внести эти изменения?","other":"Везде, где используются эти теги, они будут заменены на тег \u003cb\u003e%{tag_name}\u003c/b\u003e. Вы действительно хотите внести эти изменения?"},"add_synonyms_failed":"Следующие теги не могут быть добавлены в качестве синонимов: \u003cb\u003e%{tag_names}\u003c/b\u003e. Убедитесь, что они не имеют синонимов и не являются синонимами другого тега.","remove_synonym":"Удалить синоним","delete_synonym_confirm":"Вы действительно хотите удалить синоним \"%{tag_name}\"?","delete_tag":"Удалить тег","delete_confirm":{"one":"Вы действительно хотите удалить этот тег и удалить его из %{count} темы, которой он присвоен?","few":"Вы действительно хотите удалить этот тег и удалить его из %{count} тем, которым он присвоен?","many":"Вы действительно хотите удалить этот тег и удалить его из %{count} тем, которым он присвоен?","other":"Вы действительно хотите удалить этот тег и удалить его из %{count} тем, которым он присвоен?"},"delete_confirm_no_topics":"Вы действительно хотите удалить этот тег?","delete_confirm_synonyms":{"one":"Его синоним также будет удалён.","few":"Его %{count} синонима также будут удалены.","many":"Его %{count} синонимов также будут удалены.","other":"Его %{count} синонимов также будут удалены."},"rename_tag":"Редактировать тег","rename_instructions":"Выберите новое название тега:","sort_by":"Сортировка:","sort_by_count":"Количество","sort_by_name":"Название","manage_groups":"Управление группами тегов","manage_groups_description":"Организуйте теги в группы","upload":"Загрузить теги","upload_description":"Загрузить csv-файл для массового создания тегов","upload_instructions":"По одному в строке, с необязательным указанием группы тега в формате 'tag_name,tag_group'.","upload_successful":"Теги успешно загружены","delete_unused_confirmation":{"one":"%{count} тег будет удалён: %{tags}","few":"%{count} тега будут удалены: %{tags}","many":"%{count} тегов будут удалены:: %{tags}","other":"%{count} тегов будут удалены: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} и более %{count}","few":"%{tags} и более %{count}","many":"%{tags} и более %{count}","other":"%{tags} и более %{count}"},"delete_no_unused_tags":"Неиспользуемые теги не обнаружены.","delete_unused":"Удалить неиспользуемые теги","delete_unused_description":"Удалите все теги, которые не прикреплены к темам или личным сообщениям","cancel_delete_unused":"Отменить","filters":{"without_category":"%{filter} темы с тегом %{tag}","with_category":"%{filter} темы с тегом %{tag} в разделе %{category}","untagged_without_category":"%{filter} темы без тегов","untagged_with_category":"%{filter} темы в разделе %{category} без тегов"},"notifications":{"watching":{"title":"Наблюдать","description":"Автоматически наблюдать за всеми темами с этим тегом. Уведомлять о всех новых темах и сообщениях, а также показывать количество непрочитанных и новых сообщений рядом с названиями тем."},"watching_first_post":{"title":"Наблюдать создание тем","description":"Вы будете получать уведомления о новых темах, помеченных этим тегом, но не на ответы на них."},"tracking":{"title":"Следить","description":"Вы будете автоматически отслеживать все темы с этим тегом. Рядом с темой появится количество непрочитанных и новых сообщений."},"regular":{"title":"Стандартные уведомления","description":"Уведомлять, только если кто-то упомянет меня по @псевдониму, или ответит на моё сообщение."},"muted":{"title":"Без уведомлений","description":"Вы не будете получать уведомления о новых темах с этим тегом, и они не будут отображаться в секции 'Непрочитанные'."}},"groups":{"title":"Группы тегов","about":"Для простоты управления тегами распределите их по группам","new":"Новая группа","tags_label":"Теги в этой группе:","parent_tag_label":"Родительский тег:","parent_tag_description":"Теги из этой группы будут доступны только после добавления к теме родительского тега.","one_per_topic_label":"Разрешить не более одного тега из этой группы в одной теме","new_name":"Название новой группы","name_placeholder":"Имя группы тегов","save":"Сохранить","delete":"Удалить","confirm_delete":"Вы действительно хотите удалить эту группу тегов?","everyone_can_use":"Все могут использовать теги","usable_only_by_groups":"Теги видны всем, но использовать их могут только следующие группы","visible_only_to_groups":"Теги видны только следующим группам"},"topics":{"none":{"unread":"Нет непрочитанных тем.","new":"Нет новых тем.","read":"Вы ещё не прочитали ни одной темы.","posted":"Вы ещё не принимали участие ни в одной теме.","latest":"Нет последних тем.","bookmarks":"У вас пока нет тем в закладках.","top":"Нет обсуждаемых тем."}}},"invite":{"custom_message":"Сделать приглашение немного более личным, написав \u003ca href\u003eсообщение пользователю\u003c/a\u003e.","custom_message_placeholder":"Напишите здесь ваше личное сообщение","approval_not_required":"Пользователь будет автоматически одобрен, как только он примет это приглашение.","custom_message_template_forum":"Привет. Подумал, что тебе будет интересно зарегистрироваться на этом форуме!","custom_message_template_topic":"Привет! Подумал, что тебя может заинтересовать эта тема!"},"forced_anonymous":"Из-за чрезмерной нагрузки форум временно отображается в таком виде, как если бы пользователь вышел из системы.","footer_nav":{"back":"Назад","forward":"Вперёд","share":"Поделиться","dismiss":"Отложить"},"safe_mode":{"enabled":"Включён безопасный режим, чтобы выйти из безопасного режима, закройте текущее окно браузера"},"image_removed":"(изображение удалено)","do_not_disturb":{"title":"Не беспокоить...","label":"Не беспокоить","remaining":"Осталось %{remaining}","options":{"half_hour":"В течение 30 минут","one_hour":"В течение 1 часа","two_hours":"В течение 2 часов","tomorrow":"До завтра","custom":"Указать продолжительность"},"set_schedule":"Настроить расписание уведомлений"},"presence":{"replying":{"one":"отвечает","few":"отвечают","many":"отвечают","other":"отвечают"},"editing":{"one":"редактирует","few":"редактируют","many":"редактируют","other":"редактируют"},"replying_to_topic":{"one":"отвечает","few":"отвечают","many":"отвечают","other":"отвечают"}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Включить интерактивное обучение для всех новых пользователей","welcome_message":"Отправлять всем новым пользователям приветственное сообщение с кратким руководством"}},"details":{"title":"Скрыть под спойлер"},"cakeday":{"title":"Годовщины","today":"Сегодня","tomorrow":"Завтра","upcoming":"Скоро","all":"Все"},"birthdays":{"title":"Дни рождения","month":{"title":"Дни рождения за месяц","empty":"Никто не отмечает свой день рождения в этом месяце."},"upcoming":{"title":"Дни рождения за период %{start_date} - %{end_date}","empty":"Никто не отмечает свой день рождения в следующие 7 дней."},"today":{"title":"Дни рождения за %{date}","empty":"Никто не отмечает свой день рождения сегодня."},"tomorrow":{"empty":"Никто не отмечает свой день рождения завтра."}},"anniversaries":{"title":"Годовщины","month":{"title":"Годовщины за месяц","empty":"Никто не отмечает свою годовщину на форуме в этом месяце."},"upcoming":{"title":"Годовщины за период %{start_date} - %{end_date}","empty":"Никто не празднует свою годовщину на форуме в следующие 7 дней."},"today":{"title":"Годовщины за %{date}","empty":"Никто не отмечает свою годовщину на форуме сегодня."},"tomorrow":{"empty":"Никто не отмечает свою годовщину на форуме завтра."}},"discourse_local_dates":{"relative_dates":{"today":"Сегодня %{time}","tomorrow":"Завтра %{time}","yesterday":"Вчера %{time}","countdown":{"passed":"дата прошла"}},"title":"Дата / Время","create":{"form":{"insert":"Вставить","advanced_mode":"Расширенный режим","simple_mode":"Простой режим","format_description":"Формат, используемый для отображения даты пользователю. Используйте Z для отображения смещения и zz для названия часового пояса.","timezones_title":"Отображаемые часовые пояса","timezones_description":"Часовые пояса будут использоваться для отображения дат в режиме предварительного просмотра и в резервном режиме.","recurring_title":"Повторение","recurring_description":"Определение частоты повторения события. Кроме того, можно вручную изменить автоматически установленную частоту повтора, и использовать один из следующих ключей: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","recurring_none":"Без повторения","invalid_date":"Недействительная дата, убедитесь, что дата и время верны","date_title":"Дата","time_title":"Определение частоты повторения события. Кроме того, можно вручную изменить автоматически установленную частоту повтора, и использовать один из следующих ключей: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","format_title":"Формат даты","timezone":"Часовой пояс","until":"По...","recurring":{"every_day":"Каждый день","every_week":"Каждую неделю","every_two_weeks":"Каждые две недели","every_month":"Каждый месяц","every_two_months":"Каждые два месяца","every_three_months":"Каждые три месяца","every_six_months":"Каждые шесть месяцев","every_year":"Каждый год"}}}},"styleguide":{"title":"Styleguide","welcome":"Чтобы начать, выберите раздел в меню слева.","categories":{"atoms":"Атомы","molecules":"Молекулы","organisms":"Организмы"},"sections":{"typography":{"title":"Типографика","example":"Добро пожаловать в Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Поля ввода Даты/Времени"},"font_scale":{"title":"Шрифты"},"colors":{"title":"Цвета"},"icons":{"title":"Иконки","full_list":"См. полный список иконок Font Awesome"},"input_fields":{"title":"Поля ввода"},"buttons":{"title":"Кнопки"},"dropdowns":{"title":"Выпадающие списки"},"categories":{"title":"Разделы"},"bread_crumbs":{"title":"Хлебные крошки"},"navigation":{"title":"Навигация"},"navigation_bar":{"title":"Панель навигации"},"navigation_stacked":{"title":"Панель выбора настроек"},"categories_list":{"title":"Список разделов"},"topic_link":{"title":"Ссылка на тему"},"topic_list_item":{"title":"Тема в списке тем"},"topic_statuses":{"title":"Статусы темы"},"topic_list":{"title":"Список тем"},"basic_topic_list":{"title":"Список тем"},"footer_message":{"title":"Содержимое нижнего колонтитула"},"signup_cta":{"title":"CTA"},"topic_timer_info":{"title":"Таймеры темы"},"topic_footer_buttons":{"title":"Кнопки под последним сообщением темы"},"topic_notifications":{"title":"Уведомления темы"},"post":{"title":"Сообщение"},"topic_map":{"title":"Карта темы"},"site_header":{"title":"Заголовок сайта"},"suggested_topics":{"title":"Похожие темы"},"post_menu":{"title":"Меню сообщения"},"modal":{"title":"Модальный","header":"Модальный заголовок","footer":"Модальный нижний колонтитул"},"user_about":{"title":"Окно \"О пользователе\""},"header_icons":{"title":"Значки заголовков"},"spinners":{"title":"Спиннеры"}}},"poll":{"voters":{"one":"голос","few":"голоса","many":"голосов","other":"голосов"},"total_votes":{"one":"голос","few":"голоса","many":"голосов","other":"голосов"},"average_rating":"Средний рейтинг: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Голосов \u003cstrong\u003eпубличных\u003c/strong\u003e."},"results":{"groups":{"title":"Вы должны быть участником группы %{groups}, чтобы голосовать в этом опросе."},"vote":{"title":"Результаты будут показаны при \u003cstrong\u003eголосовании\u003c/strong\u003e."},"closed":{"title":"Результаты будут показаны после \u003cstrong\u003eзавершения опроса\u003c/strong\u003e."},"staff":{"title":"Результаты будут показаны только \u003cstrong\u003eперсоналу\u003c/strong\u003e."}},"multiple":{"help":{"at_least_min_options":{"one":"Выберите как минимум %{count} вариант ответа .","few":"Выберите как минимум %{count} варианта ответа .","many":"Выберите как минимум %{count} вариантов ответа .","other":"Выберите как минимум \u003cstrong\u003e%{count}\u003c/strong\u003e вариантов ответа."},"up_to_max_options":{"one":"Выберите не более \u003cstrong\u003e%{count}\u003c/strong\u003e варианта ответа.","few":"Выберите не более \u003cstrong\u003e%{count}\u003c/strong\u003e вариантов ответа.","many":"Выберите не более \u003cstrong\u003e%{count}\u003c/strong\u003e вариантов ответа.","other":"Выберите не более \u003cstrong\u003e%{count}\u003c/strong\u003e вариантов ответа."},"x_options":{"one":"Выберите \u003cstrong\u003e%{count}\u003c/strong\u003e вариант ответа.","few":"Выберите \u003cstrong\u003e%{count}\u003c/strong\u003e варианта ответа.","many":"Выберите \u003cstrong\u003e%{count}\u003c/strong\u003e вариантов ответа.","other":"Выберите \u003cstrong\u003e%{count}\u003c/strong\u003e вариантов ответа."},"between_min_and_max_options":"Выберите варианты ответов в диапазоне от \u003cstrong\u003e%{min}\u003c/strong\u003e до \u003cstrong\u003e%{max}\u003c/strong\u003e."}},"cast-votes":{"title":"Проголосуйте","label":"Проголосовать!"},"show-results":{"title":"Показать результаты опроса","label":"Показать результаты"},"hide-results":{"title":"Вернуться к опросу","label":"Показать голосование"},"group-results":{"title":"Группировать голоса по пользователям","label":"Показать распределение"},"export-results":{"title":"Экспорт результатов опроса","label":"Экспорт"},"open":{"title":"Снова открыть опрос","label":"Открыть","confirm":"Вы действительно хотите открыть этот опрос и принимать новые голоса?"},"close":{"title":"Завершить этот опрос, не принимать новые голоса","label":"Завершить","confirm":"Вы действительно хотите завершить этот опрос и больше не принимать голоса?"},"automatic_close":{"closes_in":"Закроется через \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Закрыто \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Результаты опроса","votes":"%{count} голосов","breakdown":"Распределение","percentage":"Процент","count":"Количество"},"error_while_toggling_status":"Произошла ошибка при смене статуса опроса.","error_while_casting_votes":"Произошла ошибка в процессе обработки вашего голоса.","error_while_fetching_voters":"Произошла ошибка в процессе получения списка проголосовавших.","error_while_exporting_results":"Произошла ошибка в процессе экспорта результатов опроса.","ui_builder":{"title":"Создать опрос","insert":"Вставить опрос в сообщение","help":{"options_count":"Введите хотя бы 1 вариант","invalid_values":"Минимальное значение должно быть меньше максимального значения.","min_step_value":"Минимальное значение шага = 1"},"poll_type":{"label":"Тип опроса","regular":"Выбор одного варианта из списка","multiple":"Выбор нескольких вариантов из списка","number":"Шкала из чисел"},"poll_result":{"label":"Результаты","always":"Показывать всегда","vote":"При голосовании","closed":"При закрытии","staff":"Только для персонала"},"poll_groups":{"label":"Разрешённые группы"},"poll_chart_type":{"label":"Тип диаграммы","bar":"Гистограмма","pie":"Круговая"},"poll_config":{"max":"Макс.","min":"Мин.","step":"Шаг"},"poll_public":{"label":"Показывать проголосовавших (не отмечайте, чтобы голосование было анонимным)"},"poll_title":{"label":"Заголовок (необязательно)"},"poll_options":{"label":"Введите варианты ответа, по одному в строке"},"automatic_close":{"label":"Автоматически закрыть опрос"}}}}},"en":{"js":{"user":{"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"category":{"topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"cakeday":{"none":" "}}}};
I18n.locale = 'ru';
I18n.pluralizationRules.ru = MessageFormat.locale.ru;
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
//! locale : Russian [ru]
//! author : Viktorminator : https://github.com/Viktorminator
//! author : Menelion Elensúle : https://github.com/Oire
//! author : Коренберг Марк : https://github.com/socketpair

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    function plural(word, num) {
        var forms = word.split('_');
        return num % 10 === 1 && num % 100 !== 11
            ? forms[0]
            : num % 10 >= 2 && num % 10 <= 4 && (num % 100 < 10 || num % 100 >= 20)
            ? forms[1]
            : forms[2];
    }
    function relativeTimeWithPlural(number, withoutSuffix, key) {
        var format = {
            ss: withoutSuffix ? 'секунда_секунды_секунд' : 'секунду_секунды_секунд',
            mm: withoutSuffix ? 'минута_минуты_минут' : 'минуту_минуты_минут',
            hh: 'час_часа_часов',
            dd: 'день_дня_дней',
            ww: 'неделя_недели_недель',
            MM: 'месяц_месяца_месяцев',
            yy: 'год_года_лет',
        };
        if (key === 'm') {
            return withoutSuffix ? 'минута' : 'минуту';
        } else {
            return number + ' ' + plural(format[key], +number);
        }
    }
    var monthsParse = [
        /^янв/i,
        /^фев/i,
        /^мар/i,
        /^апр/i,
        /^ма[йя]/i,
        /^июн/i,
        /^июл/i,
        /^авг/i,
        /^сен/i,
        /^окт/i,
        /^ноя/i,
        /^дек/i,
    ];

    // http://new.gramota.ru/spravka/rules/139-prop : § 103
    // Сокращения месяцев: http://new.gramota.ru/spravka/buro/search-answer?s=242637
    // CLDR data:          http://www.unicode.org/cldr/charts/28/summary/ru.html#1753
    var ru = moment.defineLocale('ru', {
        months: {
            format: 'января_февраля_марта_апреля_мая_июня_июля_августа_сентября_октября_ноября_декабря'.split(
                '_'
            ),
            standalone: 'январь_февраль_март_апрель_май_июнь_июль_август_сентябрь_октябрь_ноябрь_декабрь'.split(
                '_'
            ),
        },
        monthsShort: {
            // по CLDR именно "июл." и "июн.", но какой смысл менять букву на точку?
            format: 'янв._февр._мар._апр._мая_июня_июля_авг._сент._окт._нояб._дек.'.split(
                '_'
            ),
            standalone: 'янв._февр._март_апр._май_июнь_июль_авг._сент._окт._нояб._дек.'.split(
                '_'
            ),
        },
        weekdays: {
            standalone: 'воскресенье_понедельник_вторник_среда_четверг_пятница_суббота'.split(
                '_'
            ),
            format: 'воскресенье_понедельник_вторник_среду_четверг_пятницу_субботу'.split(
                '_'
            ),
            isFormat: /\[ ?[Вв] ?(?:прошлую|следующую|эту)? ?] ?dddd/,
        },
        weekdaysShort: 'вс_пн_вт_ср_чт_пт_сб'.split('_'),
        weekdaysMin: 'вс_пн_вт_ср_чт_пт_сб'.split('_'),
        monthsParse: monthsParse,
        longMonthsParse: monthsParse,
        shortMonthsParse: monthsParse,

        // полные названия с падежами, по три буквы, для некоторых, по 4 буквы, сокращения с точкой и без точки
        monthsRegex: /^(январ[ья]|янв\.?|феврал[ья]|февр?\.?|марта?|мар\.?|апрел[ья]|апр\.?|ма[йя]|июн[ья]|июн\.?|июл[ья]|июл\.?|августа?|авг\.?|сентябр[ья]|сент?\.?|октябр[ья]|окт\.?|ноябр[ья]|нояб?\.?|декабр[ья]|дек\.?)/i,

        // копия предыдущего
        monthsShortRegex: /^(январ[ья]|янв\.?|феврал[ья]|февр?\.?|марта?|мар\.?|апрел[ья]|апр\.?|ма[йя]|июн[ья]|июн\.?|июл[ья]|июл\.?|августа?|авг\.?|сентябр[ья]|сент?\.?|октябр[ья]|окт\.?|ноябр[ья]|нояб?\.?|декабр[ья]|дек\.?)/i,

        // полные названия с падежами
        monthsStrictRegex: /^(январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])/i,

        // Выражение, которое соответствует только сокращённым формам
        monthsShortStrictRegex: /^(янв\.|февр?\.|мар[т.]|апр\.|ма[яй]|июн[ья.]|июл[ья.]|авг\.|сент?\.|окт\.|нояб?\.|дек\.)/i,
        longDateFormat: {
            LT: 'H:mm',
            LTS: 'H:mm:ss',
            L: 'DD.MM.YYYY',
            LL: 'D MMMM YYYY г.',
            LLL: 'D MMMM YYYY г., H:mm',
            LLLL: 'dddd, D MMMM YYYY г., H:mm',
        },
        calendar: {
            sameDay: '[Сегодня, в] LT',
            nextDay: '[Завтра, в] LT',
            lastDay: '[Вчера, в] LT',
            nextWeek: function (now) {
                if (now.week() !== this.week()) {
                    switch (this.day()) {
                        case 0:
                            return '[В следующее] dddd, [в] LT';
                        case 1:
                        case 2:
                        case 4:
                            return '[В следующий] dddd, [в] LT';
                        case 3:
                        case 5:
                        case 6:
                            return '[В следующую] dddd, [в] LT';
                    }
                } else {
                    if (this.day() === 2) {
                        return '[Во] dddd, [в] LT';
                    } else {
                        return '[В] dddd, [в] LT';
                    }
                }
            },
            lastWeek: function (now) {
                if (now.week() !== this.week()) {
                    switch (this.day()) {
                        case 0:
                            return '[В прошлое] dddd, [в] LT';
                        case 1:
                        case 2:
                        case 4:
                            return '[В прошлый] dddd, [в] LT';
                        case 3:
                        case 5:
                        case 6:
                            return '[В прошлую] dddd, [в] LT';
                    }
                } else {
                    if (this.day() === 2) {
                        return '[Во] dddd, [в] LT';
                    } else {
                        return '[В] dddd, [в] LT';
                    }
                }
            },
            sameElse: 'L',
        },
        relativeTime: {
            future: 'через %s',
            past: '%s назад',
            s: 'несколько секунд',
            ss: relativeTimeWithPlural,
            m: relativeTimeWithPlural,
            mm: relativeTimeWithPlural,
            h: 'час',
            hh: relativeTimeWithPlural,
            d: 'день',
            dd: relativeTimeWithPlural,
            w: 'неделя',
            ww: relativeTimeWithPlural,
            M: 'месяц',
            MM: relativeTimeWithPlural,
            y: 'год',
            yy: relativeTimeWithPlural,
        },
        meridiemParse: /ночи|утра|дня|вечера/i,
        isPM: function (input) {
            return /^(дня|вечера)$/.test(input);
        },
        meridiem: function (hour, minute, isLower) {
            if (hour < 4) {
                return 'ночи';
            } else if (hour < 12) {
                return 'утра';
            } else if (hour < 17) {
                return 'дня';
            } else {
                return 'вечера';
            }
        },
        dayOfMonthOrdinalParse: /\d{1,2}-(й|го|я)/,
        ordinal: function (number, period) {
            switch (period) {
                case 'M':
                case 'd':
                case 'DDD':
                    return number + '-й';
                case 'D':
                    return number + '-го';
                case 'w':
                case 'W':
                    return number + '-я';
                default:
                    return number;
            }
        },
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return ru;

})));

// moment-timezone-localization for lang code: ru

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Абиджан","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Аккра","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Аддис-Абеба","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Алжир","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Асмэра","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Бамако","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Банги","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Банжул","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Бисау","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Блантайр","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Браззавиль","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Бужумбура","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Каир","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Касабланка","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Сеута","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Конакри","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Дакар","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Дар-эс-Салам","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Джибути","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Дуала","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"Эль-Аюн","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Фритаун","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Габороне","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Хараре","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Йоханнесбург","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Джуба","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Кампала","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Хартум","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Кигали","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Киншаса","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Лагос","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Либревиль","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Ломе","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Луанда","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Лубумбаши","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Лусака","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Малабо","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Мапуту","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Масеру","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Мбабане","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Могадишо","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Монровия","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Найроби","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"Нджамена","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Ниамей","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Нуакшот","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Уагадугу","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Порто-Ново","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"Сан-Томе","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Триполи","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Тунис","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Виндхук","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Адак","id":"America/Adak"},{"value":"America/Anchorage","name":"Анкоридж","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Ангилья","id":"America/Anguilla"},{"value":"America/Antigua","name":"Антигуа","id":"America/Antigua"},{"value":"America/Araguaina","name":"Арагуаина","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"Ла-Риоха","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Рио-Гальегос","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Сальта","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"Сан-Хуан","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"Сан-Луис","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Тукуман","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ушуая","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Аруба","id":"America/Aruba"},{"value":"America/Asuncion","name":"Асунсьон","id":"America/Asuncion"},{"value":"America/Bahia","name":"Баия","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Баия-де-Бандерас","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Барбадос","id":"America/Barbados"},{"value":"America/Belem","name":"Белен","id":"America/Belem"},{"value":"America/Belize","name":"Белиз","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Бланк-Саблон","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Боа-Виста","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Богота","id":"America/Bogota"},{"value":"America/Boise","name":"Бойсе","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Буэнос-Айрес","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Кеймбридж-Бей","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Кампу-Гранди","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Канкун","id":"America/Cancun"},{"value":"America/Caracas","name":"Каракас","id":"America/Caracas"},{"value":"America/Catamarca","name":"Катамарка","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Кайенна","id":"America/Cayenne"},{"value":"America/Cayman","name":"Острова Кайман","id":"America/Cayman"},{"value":"America/Chicago","name":"Чикаго","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Чиуауа","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Корал-Харбор","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Кордова","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Коста-Рика","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Крестон","id":"America/Creston"},{"value":"America/Cuiaba","name":"Куяба","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Кюрасао","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Денмарксхавн","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Доусон","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Доусон-Крик","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Денвер","id":"America/Denver"},{"value":"America/Detroit","name":"Детройт","id":"America/Detroit"},{"value":"America/Dominica","name":"Доминика","id":"America/Dominica"},{"value":"America/Edmonton","name":"Эдмонтон","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Эйрунепе","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"Сальвадор","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Форт Нельсон","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Форталеза","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Глейс-Бей","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Нуук","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Гус-Бей","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Гранд-Терк","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Гренада","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Гваделупа","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Гватемала","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Гуаякиль","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Гайана","id":"America/Guyana"},{"value":"America/Halifax","name":"Галифакс","id":"America/Halifax"},{"value":"America/Havana","name":"Гавана","id":"America/Havana"},{"value":"America/Hermosillo","name":"Эрмосильо","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Нокс, Индиана","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Маренго, Индиана","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Питерсберг, Индиана","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Телл-Сити","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Вевей, Индиана","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Винсеннес","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Уинамак","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Индианаполис","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Инувик","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Икалуит","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Ямайка","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Жужуй","id":"America/Jujuy"},{"value":"America/Juneau","name":"Джуно","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Монтиселло, Кентукки","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Кралендейк","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"Ла-Пас","id":"America/La_Paz"},{"value":"America/Lima","name":"Лима","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Лос-Анджелес","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Луисвилл","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Лоуэр-Принсес-Куортер","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Масейо","id":"America/Maceio"},{"value":"America/Managua","name":"Манагуа","id":"America/Managua"},{"value":"America/Manaus","name":"Манаус","id":"America/Manaus"},{"value":"America/Marigot","name":"Мариго","id":"America/Marigot"},{"value":"America/Martinique","name":"Мартиника","id":"America/Martinique"},{"value":"America/Matamoros","name":"Матаморос","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Масатлан","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Мендоса","id":"America/Mendoza"},{"value":"America/Menominee","name":"Меномини","id":"America/Menominee"},{"value":"America/Merida","name":"Мерида","id":"America/Merida"},{"value":"America/Metlakatla","name":"Метлакатла","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Мехико","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Микелон","id":"America/Miquelon"},{"value":"America/Moncton","name":"Монктон","id":"America/Moncton"},{"value":"America/Monterrey","name":"Монтеррей","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Монтевидео","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Монтсеррат","id":"America/Montserrat"},{"value":"America/Nassau","name":"Нассау","id":"America/Nassau"},{"value":"America/New_York","name":"Нью-Йорк","id":"America/New_York"},{"value":"America/Nipigon","name":"Нипигон","id":"America/Nipigon"},{"value":"America/Nome","name":"Ном","id":"America/Nome"},{"value":"America/Noronha","name":"Норонья","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Бойла, Северная Дакота","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Центр, Северная Дакота","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"Нью-Сейлем, Северная Дакота","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Охинага","id":"America/Ojinaga"},{"value":"America/Panama","name":"Панама","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Пангниртунг","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Парамарибо","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Финикс","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Порт-о-Пренс","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Порт-оф-Спейн","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Порту-Велью","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Пуэрто-Рико","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Пунта-Аренас","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Рейни-Ривер","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Ранкин-Инлет","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Ресифи","id":"America/Recife"},{"value":"America/Regina","name":"Реджайна","id":"America/Regina"},{"value":"America/Resolute","name":"Резольют","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Риу-Бранку","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Санта-Изабел","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Сантарен","id":"America/Santarem"},{"value":"America/Santiago","name":"Сантьяго","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Санто-Доминго","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"Сан-Паулу","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Скорсбисунн","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Ситка","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"Сен-Бартелеми","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"Сент-Джонс","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"Сент-Китс","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"Сент-Люсия","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"Сент-Томас","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"Сент-Винсент","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Свифт-Керрент","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Тегусигальпа","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Туле","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Тандер-Бей","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Тихуана","id":"America/Tijuana"},{"value":"America/Toronto","name":"Торонто","id":"America/Toronto"},{"value":"America/Tortola","name":"Тортола","id":"America/Tortola"},{"value":"America/Vancouver","name":"Ванкувер","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Уайтхорс","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Виннипег","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Якутат","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Йеллоунайф","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Кейси","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Дейвис","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Дюмон-д’Юрвиль","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Маккуори","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Моусон","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"Мак-Мердо","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Палмер","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Ротера","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Сёва","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Тролль","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Восток","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Лонгйир","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Аден","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Алматы","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Амман","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Анадырь","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Актау","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Актобе","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Ашхабад","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Атырау","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Багдад","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Бахрейн","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Баку","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Бангкок","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Барнаул","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Бейрут","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Бишкек","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Бруней","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Калькутта","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Чита","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Чойбалсан","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Коломбо","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Дамаск","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Дакка","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Дили","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Дубай","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Душанбе","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Фамагуста","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Газа","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Хеврон","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Гонконг","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Ховд","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Иркутск","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Джакарта","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Джаяпура","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Иерусалим","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Кабул","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Петропавловск-Камчатский","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Карачи","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Катманду","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Хандыга","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Красноярск","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Куала-Лумпур","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Кучинг","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Кувейт","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Макао","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Магадан","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Макасар","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Манила","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Маскат","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Никосия","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Новокузнецк","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Новосибирск","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Омск","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Уральск","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Пномпень","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Понтианак","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Пхеньян","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Катар","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Кызылорда","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Янгон","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Эр-Рияд","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Хошимин","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"о-в Сахалин","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Самарканд","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Сеул","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Шанхай","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Сингапур","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Среднеколымск","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Тайбэй","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Ташкент","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Тбилиси","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Тегеран","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Тхимпху","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Токио","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Томск","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Улан-Батор","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Урумчи","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Усть-Нера","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Вьентьян","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Владивосток","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Якутск","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Екатеринбург","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Ереван","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Азорские о-ва","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Бермудские о-ва","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Канарские о-ва","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Кабо-Верде","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Фарерские о-ва","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Мадейра","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Рейкьявик","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Южная Георгия","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"о-в Святой Елены","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Стэнли","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Аделаида","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Брисбен","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Брокен-Хилл","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Керри","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Дарвин","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Юкла","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Хобарт","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Линдеман","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Лорд-Хау","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Мельбурн","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Перт","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Сидней","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Всемирное координированное время","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Амстердам","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Андорра","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Астрахань","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Афины","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Белград","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Берлин","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Братислава","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Брюссель","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Бухарест","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Будапешт","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Бюзинген-на-Верхнем-Рейне","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Кишинев","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Копенгаген","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Ирландия, стандартное времяДублин","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Гибралтар","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Гернси","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Хельсинки","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"о-в Мэн","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Стамбул","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Джерси","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Калининград","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Киев","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Киров","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Лиссабон","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Любляна","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Великобритания, летнее времяЛондон","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Люксембург","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Мадрид","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Мальта","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Мариехамн","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Минск","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Монако","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Москва","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Осло","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Париж","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Подгорица","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Прага","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Рига","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Рим","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Самара","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"Сан-Марино","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Сараево","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Саратов","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Симферополь","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Скопье","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"София","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Стокгольм","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Таллин","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Тирана","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Ульяновск","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Ужгород","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Вадуц","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Ватикан","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Вена","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Вильнюс","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Волгоград","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Варшава","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Загреб","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Запорожье","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Цюрих","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Антананариву","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Чагос","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"о-в Рождества","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Кокосовые о-ва","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Коморы","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Кергелен","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Маэ","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Мальдивы","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Маврикий","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Майотта","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Реюньон","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Апиа","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Окленд","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Бугенвиль","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Чатем","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"о-в Пасхи","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Эфате","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"о-в Эндербери","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Факаофо","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Фиджи","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Фунафути","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Галапагосские о-ва","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"о-ва Гамбье","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Гуадалканал","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Гуам","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"Гонолулу","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Джонстон","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Киритимати","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Косрае","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Кваджалейн","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Маджуро","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Маркизские о-ва","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"о-ва Мидуэй","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Науру","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Ниуэ","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Норфолк","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Нумеа","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Паго-Паго","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Палау","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Питкэрн","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Понпеи","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Порт-Морсби","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Раротонга","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Сайпан","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Таити","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Тарава","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Тонгатапу","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Трук","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Уэйк","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Уоллис","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

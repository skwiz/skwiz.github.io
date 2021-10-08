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
r += "Comecemos <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\"> a discusión!</a> E ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "hai <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> temas";
return r;
},
"other" : function(d){
var r = "";
r += "hai <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> temas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + "</strong> publicación";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> publicacións";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Os visitantes necesitan máis para ler e responder – recomendamos que haxa cando menos ";
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
})() + "</strong> temas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + "</strong> publicación";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> publicacións";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Soamente o equipo pode ver esta mensaxe.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Comecemos <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">a discusión!</a> E ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "hai <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> temas";
return r;
},
"other" : function(d){
var r = "";
r += "hai <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> temas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Os visitantes necesitan máis para ler e responder – recomendamos que haxa cando menos ";
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
})() + "</strong> temas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Soamente o equipo pode ver esta mensaxe.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "Comecemos <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">a discusión!</a> E ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "hai <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> publicación";
return r;
},
"other" : function(d){
var r = "";
r += "hai <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> publicacións";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Os visitantes necesitan máis para ler e responder – recomendamos que haxa cando menos ";
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
})() + "</strong> publicación";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> publicacións";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Soamente o equipo pode ver esta mensaxe.";
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
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> acadou o límite configurado no sitio de ";
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
})() + " erro/hora";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/hora";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/minuto";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> acadou o límite configurado no sitio de ";
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/minuto";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " erro/hora";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/hora";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> excedeu o límite configurado do sitio de ";
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
})() + " erro/hora";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/hora";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/minuto";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> excedeu o límite configurado do sitio de ";
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/minuto";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "Hai ";
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
})() + "</b> resposta";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> respostas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " que supoñen un tempo estimado de lectura de <b>";
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
})() + " minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " minutos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "Hai ";
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
})() + " pendente de lectura</a> ";
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
})() + " pendentes de lectura</a> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " novo</a> tema";
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
})() + " novos</a> temas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " pendentes ou ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "ver outros temas en ";
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
r += "Vai eliminar ";
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
})() + "</b> publicación";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> publicacións";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + "</b> tema";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> temas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " deste usuario, retirar a súa conta, bloquear accesos desde o seu enderezo IP <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b>, e engadir o seu enderezo de correo <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> a unha listaxe de bloqueo permanente. Confirma que este usuario se dedica a enviar lixo?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "Este tema ten ";
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
})() + " resposta";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " respostas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "cun alto nivel de valoración da publicación";
return r;
},
"med" : function(d){
var r = "";
r += "cun moi alto nivel de valoración da publicación";
return r;
},
"high" : function(d){
var r = "";
r += "cun extremo nivel de valoración da publicación";
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
r += "Vai eliminar ";
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
})() + " publicación";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " publicacións";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + " tema";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " temas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Está seguro?";
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
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["gl"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "/message'>personal messages</a>";
return r;
}};
MessageFormat.locale.gl = function ( n ) {
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

I18n.translations = {"gl":{"js":{"number":{"format":{"separator":",","delimiter":"."},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Byte","other":"Bytes"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"HH:mm a","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm a","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm a","long_no_year_no_time":"D MMM","full_no_year_no_time":"D MMMM","long_with_year":"D MMM, YYYY h:mm a","long_with_year_no_time":"D MMM, YYYY","full_with_year_no_time":"Do, MMMM, YYYY","long_date_with_year":"D MMM, 'YY LT","long_date_without_year":"D MMM, LT","long_date_with_year_without_time":"D MMM, 'YY","long_date_without_year_with_linebreak":"D MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D MMM, 'YY \u003cbr/\u003eLT","wrap_ago":"fai %{date}","tiny":{"half_a_minute":"\u003c 1m","less_than_x_seconds":{"one":"\u003c %{count}s","other":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s","other":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m","other":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m","other":"%{count}m"},"about_x_hours":{"one":"%{count}h","other":"%{count}h"},"x_days":{"one":"%{count}d","other":"%{count}d"},"x_months":{"one":"%{count}mes","other":"%{count}meses"},"about_x_years":{"one":"%{count}ano","other":"%{count}anos"},"over_x_years":{"one":"\u003e %{count}ano","other":"\u003e %{count}anos"},"almost_x_years":{"one":"%{count}ano","other":"%{count}anos"},"date_month":"D MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} min.","other":"%{count} min."},"x_hours":{"one":"%{count} hora","other":"%{count} horas"},"x_days":{"one":"%{count} día","other":"%{count} días"},"date_year":"D MMM, 'YY"},"medium_with_ago":{"x_minutes":{"one":"Hai %{count} min.","other":"Hai %{count} min."},"x_hours":{"one":"Hai %{count} hora","other":"Hai %{count} horas"},"x_days":{"one":"Hai %{count} día","other":"Hai %{count} días"},"x_months":{"one":"Hai %{count} mes","other":"Hai %{count} meses"},"x_years":{"one":"Hai %{count} ano","other":"Hai %{count} anos"}},"later":{"x_days":{"one":"%{count} día despois","other":"%{count} días despois"},"x_months":{"one":"%{count} mes despois","other":"%{count} meses despois"},"x_years":{"one":"%{count} ano despois","other":"%{count} anos despois"}},"previous_month":"Mes anterior","next_month":"Mes seguinte","placeholder":"data","to_placeholder":"ata a data"},"share":{"topic_html":"Tema: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"publicación #%{postNumber}","close":"pechar","twitter":"Compartir no Twitter","facebook":"Compartir no Facebook","email":"Enviar por correo","url":"Copiar e compartir o URL"},"action_codes":{"public_topic":"faga este tema público o %{when}","private_topic":"faga deste tema unha mensaxe privada o %{when}","split_topic":"divida tema %{when}","invited_user":"convidou a %{who} %{when}","invited_group":"convidou ao %{who} o %{when}","user_left":"%{who} retiráronse por si mesmos desta mensaxe %{when}","removed_user":"retirou a %{who} %{when}","removed_group":"retirou ao %{who} o %{when}","autobumped":"promovido automaticamente %{when}","autoclosed":{"enabled":"pechado o %{when}","disabled":"aberto o %{when}"},"closed":{"enabled":"pechado o %{when}","disabled":"aberto o %{when}"},"archived":{"enabled":"arquivado o %{when}","disabled":"desarquivado o %{when}"},"pinned":{"enabled":"fixado o %{when}","disabled":"desprendido o %{when}"},"pinned_globally":{"enabled":"fixado globalmente o %{when}","disabled":"desprendido o %{when}"},"visible":{"enabled":"listado o %{when}","disabled":"retirado da lista o %{when}"},"banner":{"enabled":"faga disto un báner %{when}. Aparecerá na banda superior de todas as páxinas ata que sexa desbotado polo usuario.","disabled":"eliminou este báner %{when}. Xa non aparecerá máis na banda superior de todas as páxinas."},"forwarded":"reenviou a mensaxe de correo anterior"},"topic_admin_menu":"accións do tema","wizard_required":"Este é o novo Discourse! Pode comezar co \u003ca href='%{url}' data-auto-route='true'\u003easistente de configuración\u003c/a\u003e ✨","emails_are_disabled":"Todos as mensaxes de correo saíntes foron desactivadas globalmente por un administrador. Non se enviará ningún tipo de notificación por correo electrónico.","software_update_prompt":{"dismiss":"Desbotar"},"bootstrap_mode_enabled":{"one":"Para facilitar o lanzamento do seu novo sitio, está en modo de arranque. Todos os novos usuarios recibirán o nivel de confianza 1 e terán activadas as mensaxes de correo de resumo diario. Isto desactivarase automaticamente cando se una %{count} usuario.","other":"Para facilitar o lanzamento do seu novo sitio, está en modo de arranque. Todos os novos usuarios recibirán nivel de confianza 1 e terán activadas as mensaxes de correo de resumo diario. Isto desactivarase automaticamente cando se unan %{count} usuarios."},"bootstrap_mode_disabled":"O modo Bootstrap desactivarase nun prazo de 24 horas.","themes":{"default_description":"Predeterminado","broken_theme_alert":"Pode que o seu sitio non funcione porque o tema ou compoñente %{theme} contén erros. Desactíveo en %{path}."},"s3":{"regions":{"ap_northeast_1":"Asia Pacífico (Tokio)","ap_northeast_2":"Asia Pacífico (Seúl)","ap_east_1":"Asia Pacífico (Hong Kong)","ap_south_1":"Asia Pacífico (Mumbai)","ap_southeast_1":"Asia Pacífico (Singapur)","ap_southeast_2":"Asia Pacífico (Sidney)","ca_central_1":"O Canadá (Central)","cn_north_1":"A China (Beijing)","cn_northwest_1":"A China (Ningxia)","eu_central_1":"UE (Frankfurt)","eu_north_1":"UE (Estocolmo)","eu_west_1":"UE (Irlanda)","eu_west_2":"UE (Londres)","eu_west_3":"UE (París)","sa_east_1":"América do Sur (São Paulo)","us_east_1":"EUA Leste (Virxinia N.)","us_east_2":"EUA Leste (Ohio)","us_gov_east_1":"AWS GovCloud (EUA-Leste)","us_gov_west_1":"AWS GovCloud (EUA-Oeste)","us_west_1":"EUA Oeste (N. California)","us_west_2":"EUA Oeste (Oregón)"}},"clear_input":"Despexar entrada","edit":"editar o título e a categoría deste tema","expand":"Expandir","not_implemented":"Sentímolo pero esta funcionalidade non se implementou aínda!","no_value":"Non","yes_value":"Si","submit":"Enviar","generic_error":"Sentímolo pero produciuse un erro.","generic_error_with_reason":"Produciuse un erro: %{error}","sign_up":"Crear unha conta","log_in":"Iniciar sesión","age":"Idade","joined":"Inscrito","admin_title":"Admin","show_more":"amosar máis","show_help":"opcións","links":"Ligazóns","links_lowercase":{"one":"ligazón","other":"ligazóns"},"faq":"PMF","guidelines":"Directrices","privacy_policy":"Normas de privacidade","privacy":"Privacidade","tos":"Termos do servizo","rules":"Regras","conduct":"Código de conduta","mobile_view":"Visualización móbil","desktop_view":"Visualización en escritorio","or":"ou","now":"agora mesmiño","read_more":"ler máis","more":"Máis","x_more":{"one":"%{count} Máis","other":"%{count} Máis"},"never":"nunca","every_30_minutes":"cada 30 minutos","every_hour":"cada hora","daily":"diariamente","weekly":"semanalmente","every_month":"cada mes","every_six_months":"cada seis meses","max_of_count":"máx. de %{count}","character_count":{"one":"%{count} carácter","other":"%{count} caracteres"},"related_messages":{"title":"Mensaxes relacionadas","see_all":"Ver \u003ca href=\"%{path}\"\u003etodas as mensaxes\u003c/a\u003e de @%{username}..."},"suggested_topics":{"title":"Temas suxeridos","pm_title":"Mensaxes suxeridas"},"about":{"simple_title":"Verbo de","title":"Verbo de %{title}","stats":"Estatísticas do sitio","our_admins":"Os administradores","our_moderators":"Os moderadores","moderators":"Moderadores","stat":{"all_time":"Todos"},"like_count":"Gústames","topic_count":"Temas","post_count":"Publicacións","user_count":"Usuarios","active_user_count":"Usuarios activos","contact":"Contacte connosco","contact_info":"No caso dunha incidencia crítica ou asunto urxente que afecte este sitio, contacte connosco en %{contact_info}."},"bookmarked":{"title":"Marcador","clear_bookmarks":"Limpar marcadores","help":{"bookmark":"Prema para engadir aos marcadores a publicación inicial deste tema","unbookmark":"Prema para retirar todos os marcadores deste tema"}},"bookmarks":{"created":"Fixou como marcador esta publicación. %{name}","not_bookmarked":"marcar esta publicación","created_with_reminder":"Fixou como marcador esta publicación cun recordatorio %{date}. %{name}","remove":"Retirar marcador","delete":"Eliminar marcador","confirm_delete":"Confirma a eliminación deste marcador? O recordatorio tamén se eliminará.","confirm_clear":"Confirma o borrado de todos os marcadores deste tema?","save":"Gardar","no_timezone":"Aínda non configurous ningunha zona horaria. Non poderá estabelecer recordatorios. Configure un \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eno teu perfil\u003c/a\u003e.","invalid_custom_datetime":"A data e hora que escribiu non é correcta, ténteo de novo.","list_permission_denied":"Non ten permiso para ver os marcadores deste usuario.","no_user_bookmarks":"Non ten marcadores de publicacións; os marcadores permítenlle facer rapidamente referencia a publicacións específicas.","auto_delete_preference":{"label":"Eliminar automaticamente","never":"Nunca","when_reminder_sent":"Unha vez enviado o recordatorio","on_owner_reply":"Despois de responder eu a este tema"},"search_placeholder":"Buscar marcadores por nome, título do tema ou contido da publicación","search":"Buscar","reminders":{"today_with_time":"hoxe á(s) %{time}","tomorrow_with_time":"mañá á(s) %{time}","at_time":"á(s) %{date_time}","existing_reminder":"Configurou un recordatorio para este marcador que se enviará %{at_date_time}"}},"copy_codeblock":{"copied":"copiado!"},"drafts":{"label":"Borradores","resume":"Retomar","remove":"Retirar","remove_confirmation":"Confirma que quere retirar este borrador?","new_topic":"Borrador de novo tema","topic_reply":"Borrador de resposta","abandon":{"confirm":"Ten un borrador en curso neste tema. Que lle gustaría facer con iso?","yes_value":"Desbotar","no_value":"Retomar a edición"}},"topic_count_categories":{"one":"Ver %{count} tema novo ou actualizado","other":"Ver %{count} temas novos ou actualizados"},"topic_count_latest":{"one":"Ver %{count} tema novo ou actualizado","other":"Ver %{count} temas novos ou actualizados"},"topic_count_unseen":{"one":"Ver %{count} tema novo ou actualizado","other":"Ver %{count} temas novos ou actualizados"},"topic_count_unread":{"one":"Ver %{count} tema pendente","other":"Ver %{count} temas pendentes"},"topic_count_new":{"one":"Ver %{count} tema novo","other":"Ver %{count} temas novos"},"preview":"visualizar","cancel":"cancelar","deleting":"Eliminando ...","save":"Gardar cambios","saving":"Gardando....","saved":"Gardado!","upload":"Cargar","uploading":"Cargando...","uploading_filename":"Cargando: %{filename}...","clipboard":"portapapeis","uploaded":"Cargado!","pasting":"A pegar...","enable":"Activar","disable":"Desactivar","continue":"Continuar","undo":"Desfacer","revert":"Reverter","failed":"Fallou","switch_to_anon":"Entrar no modo anónimo","switch_from_anon":"Saír do modo anónimo","banner":{"close":"Desbotar este báner.","edit":"Editar este báner »"},"pwa":{"install_banner":"Quere \u003ca href\u003einstalar %{title} neste dispositivo?\u003c/a\u003e"},"choose_topic":{"none_found":"Non se atoparon temas.","title":{"search":"Buscar un tema","placeholder":"escriba o título do tema, url ou id aquí"}},"choose_message":{"none_found":"Non se atoparon mensaxes.","title":{"search":"Buscar unha mensaxe","placeholder":"escriba o título da mensaxe, url ou id aquí"}},"review":{"order_by":"Ordenar por","in_reply_to":"en resposta a","explain":{"why":"explica por que este elemento acabou na fila de espera","title":"Puntuación revisábel","formula":"Fórmula","subtotal":"Subtotal","total":"Total","min_score_visibility":"Puntuación mínima para visibilidade","score_to_hide":"Puntuación para agochar publicación","take_action_bonus":{"name":"tomou medidas","title":"Cando un membro do equipo escolle tomar medidas, a alerta recibe unha bonificación."},"user_accuracy_bonus":{"name":"precisión do usuario","title":"Os usuarios con alertas que fosen repetidamente aceptadas reciben unha bonificación."},"trust_level_bonus":{"name":"nivel de confianza","title":"Os elementos revisábeis creados por usuarios con maior nivel de confianza teñen unha puntuación superior."},"type_bonus":{"name":"tipo de bonificación","title":"O equipo pode asignar unha bonificación a certos tipos revisábeis para facelos de maior prioridade."}},"claim_help":{"optional":"Podes reclamar este elemento para evitar que outros o revisen.","required":"Debes reclamar os elementos antes de revisalos.","claimed_by_you":"Reclamaches este elemento e podes revisalo.","claimed_by_other":"Este elemento só pode revisalo \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"reclamar este tema"},"unclaim":{"help":"eliminar esta reclamación"},"awaiting_approval":"Agardando a aprobación","delete":"Eliminar","settings":{"saved":"Gardado","save_changes":"Gardar os cambios","title":"Configuración","priorities":{"title":"Prioridades revisábeis"}},"moderation_history":"Historial de moderación","view_all":"Ver todos","grouped_by_topic":"Agrupados por tema","none":"Non hai elementos para revisar.","view_pending":"ver pendentes","topic_has_pending":{"one":"Este tema ten \u003cb\u003e%{count}\u003c/b\u003e publicación agardando aprobación","other":"Este tema ten \u003cb\u003e%{count}\u003c/b\u003e publicacións agardando aprobación"},"title":"Revisar","topic":"Tema:","filtered_topic":"Filtrou o contido revisábel nun único tema.","filtered_user":"Usuario","filtered_reviewed_by":"Revisado por","show_all_topics":"buscar todos os temas","deleted_post":"(publicación eliminada)","deleted_user":"(usuario eliminado)","user":{"bio":"Biografía","website":"Sitio web","username":"Nome do usuario","email":"Correo electrónico","name":"Nome","fields":"Campos","reject_reason":"Razón"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (%{count} alertas en total)","other":"%{agreed}, %{disagreed}, %{ignored} (%{count} alertas en total)"},"agreed":{"one":"%{count}% concordou","other":"%{count}% concordaron"},"disagreed":{"one":"%{count}% non concordou","other":"%{count}% non concordaron"},"ignored":{"one":"%{count}% ignorou","other":"%{count}% ignoraron"}},"topics":{"topic":"Tema","reviewable_count":"Número","reported_by":"Recollido por","deleted":"[Tema eliminado]","original":"(tema orixinal)","details":"detalles","unique_users":{"one":"%{count} usuario","other":"%{count} usuarios"}},"replies":{"one":"%{count} resposta","other":"%{count} respostas"},"edit":"Editar","save":"Gardar","cancel":"Cancelar","new_topic":"A aprobación deste elemento creará un tema novo","filters":{"all_categories":"(todas as categorías)","type":{"title":"Tipo","all":"(todos os tipos)"},"minimum_score":"Puntuación mínima:","refresh":"Actualizar","status":"Estado","category":"Categoría","orders":{"score":"Puntuación","score_asc":"Puntuación (inversa)","created_at":"Creado o","created_at_asc":"Creado o (inverso)"},"priority":{"title":"Prioridade mínima","any":"(calquera)","low":"Baixa","medium":"Media","high":"Alta"}},"conversation":{"view_full":"ver conversa completa"},"scores":{"about":"A puntuación calcúlase con base no nivel de fiabilidade do informador, a precisión das súas alertas anteriores e a prioridade do elemento que se recolle.","score":"Puntuación","date":"Data","type":"Tipo","status":"Estado","submitted_by":"Enviado por","reviewed_by":"Revisado por"},"statuses":{"pending":{"title":"Pendente"},"approved":{"title":"Aprobado"},"rejected":{"title":"Rexeitado"},"ignored":{"title":"Ignorado"},"deleted":{"title":"Eliminado"},"reviewed":{"title":"(todas revisadas)"},"all":{"title":"(todo)"}},"types":{"reviewable_flagged_post":{"title":"Publicación sinalada","flagged_by":"Sinalado por"},"reviewable_queued_topic":{"title":"Tema na fila de espera"},"reviewable_queued_post":{"title":"Publicación na fila de espera"},"reviewable_user":{"title":"Usuario"},"reviewable_post":{"title":"Publicación"}},"approval":{"title":"A publicación necesita aprobación","description":"Recibimos a súa nova publicación pero cómpre que sexa aprobada por un moderador antes de aparecer. Teña paciencia.","pending_posts":{"one":"Ten \u003cstrong\u003e%{count}\u003c/strong\u003e publicación pendente.","other":"Ten \u003cstrong\u003e%{count}\u003c/strong\u003e publicacións pendentes."},"ok":"De acordo"},"example_username":"nome de usuario","reject_reason":{"title":"Por que rexeita a este usuario?","send_email":"Enviar correo de rexeitamento"}},"relative_time_picker":{"minutes":{"one":"minuto","other":"minutos"},"hours":{"one":"hora","other":"horas"},"days":{"one":"día","other":"días"},"months":{"one":"mes","other":"meses"},"years":{"one":"ano","other":"anos"},"relative":"Relativo"},"time_shortcut":{"later_today":"Hoxe, máis tarde","next_business_day":"O vindeiro día laborábel","tomorrow":"Mañá","post_local_date":"Data na publicación","later_this_week":"Máis tarde, esta semana","this_weekend":"Esta fin de semana","start_of_next_business_week":"Luns","start_of_next_business_week_alt":"O vindeiro luns","two_weeks":"Dúas semanas","next_month":"O vindeiro mes","six_months":"Seis meses","custom":"Personalizar data e hora","relative":"Tempo relativo","none":"Non se necesita"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e publicou \u003ca href='%{topicUrl}'\u003eo tema\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eVostede\u003c/a\u003e publicou \u003ca href='%{topicUrl}'\u003eo tema\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e respondeu a \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eVostede\u003c/a\u003e respondeu a \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e respondeu ao tema \u003ca href='%{topicUrl}'\u003e\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eVosted\u003c/a\u003e respondeu ao tema \u003ca href='%{topicUrl}'\u003e\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e citou a \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e citou a \u003ca href='%{user2Url}'\u003e, vaia, a ti.\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eVostede\u003c/a\u003e citou a \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Publicado por \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Publicado por \u003ca href='%{userUrl}'\u003eti\u003c/a\u003e","sent_by_user":"Enviado por \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Enviado por \u003ca href='%{userUrl}'\u003e, vaia, vostede mesmo.\u003c/a\u003e"},"directory":{"username":"Nome do usuario","filter_name":"filtrar por nome de usuario","title":"Usuarios","likes_given":"Dados","likes_received":"Recibidos","topics_entered":"Vistos","topics_entered_long":"Temas vistos","time_read":"Tempo de lectura","topic_count":"Temas","topic_count_long":"Temas creados","post_count":"Respostas","post_count_long":"Respostas publicadas","no_results":"Non se atoparon resultados.","days_visited":"Visitas","days_visited_long":"Días visitados","posts_read":"Lidos","posts_read_long":"Publicacións lidas","last_updated":"Última actualización:","total_rows":{"one":"%{count} usuario","other":"%{count} usuarios"},"edit_columns":{"save":"Gardar","reset_to_default":"Restabelecer cos valores predeterminados"},"group":{"all":"todos os grupos"}},"group_histories":{"actions":{"change_group_setting":"Cambiar axustes do grupo","add_user_to_group":"Engadir usuario","remove_user_from_group":"Retirar usuario","make_user_group_owner":"Facer propietario","remove_user_as_group_owner":"Revogar propietario"}},"groups":{"member_added":"Engadido","member_requested":"Solicitado o","add_members":{"usernames_placeholder":"nomes de usuario","usernames_or_emails_placeholder":"nomes de usuario ou enderezos de correo","notify_users":"Notificar os usuarios"},"requests":{"title":"Peticións","reason":"Razón","accept":"Aceptar","accepted":"aceptado","deny":"Rexeitar","denied":"rexeitado","undone":"petición retirada","handle":"xestionar a petición de incorporación"},"manage":{"title":"Xestionar","name":"Nome","full_name":"Nome completo","invite_members":"Convidar","delete_member_confirm":"Quere eliminar a «%{username}» do grupo «%{group}»?","profile":{"title":"Perfil"},"interaction":{"title":"Interacción","posting":"Publicación","notification":"Notificación"},"email":{"title":"Correo electrónico","status":"Sincronizados os correos %{old_emails} / %{total_emails} vía IMAP.","last_updated_by":"por","credentials":{"title":"Acreditacións","smtp_server":"Servidor SMTP","smtp_port":"Porto SMTP","smtp_ssl":"Use SSL para SMTP","imap_server":"Servidor SMTP","imap_port":"Porto IMAP","imap_ssl":"Use SSL para IMAP","username":"Nome do usuario","password":"Contrasinal"},"settings":{"title":"Configuración","allow_unknown_sender_topic_replies":"Permitir respostas ao tema de remitente descoñecido."},"mailboxes":{"synchronized":"Caixa de correo sincronizada","none_found":"Non se atoparon caixas de correo nesta conta de correo electrónico.","disabled":"Desactivado"}},"membership":{"title":"Incorporación","access":"Acceso"},"categories":{"title":"Categorías","long_title":"Notificacións predeterminadas de categoría","description":"Cando se engaden usuarios a este grupo, os axustes de notificacións da súa categoría configuraranse desta maneira predeterminada. Logo, pódense cambiar.","watched_categories_instructions":"Automaticamente observará todos os temas destas categorías. Os membros do grupo recibirán unha notificación de todas as novas publicacións e temas e tamén aparecerá un reconto de novas publicacións xunto ao tema.","tracked_categories_instructions":"Seguir automaticamente todos os temas destas categorías. Aparecerá un reconto de novas publicacións xunta o tema.","watching_first_post_categories_instructions":"Os usuarios recibirán unha notificación da primeira publicación en cada novo tema destas categorías.","regular_categories_instructions":"Se se silencian estas categorías, non o estarán para os membros do grupo. Notificaráselles aos usuarios se son mencionados ou alguén lles responde.","muted_categories_instructions":"Non se lles notificará aos usuarios nada sobre temas novos destas categorías e non aparecerán nas categorías nin nas páxinas dos últimos temas."},"tags":{"title":"Etiquetas","long_title":"Notificación predeterminadas de etiquetas","description":"Cando se engaden usuarios a este grupo, os axustes de notificacións da súa etiqueta configuraranse desta maneira predeterminada. Logo, pódense cambiar.","watched_tags_instructions":"Automaticamente observará todos os temas destas etiquetas. Os membros do grupo recibirán unha notificación de todas as novas publicacións e temas e tamén aparecerá un reconto de novas publicacións xunta o tema.","tracked_tags_instructions":"Seguir automaticamente todos os temas con estas etiquetas. O número de novas publicacións aparecerá á beira do tema.","watching_first_post_tags_instructions":"Os usuarios recibirán unha notificación da primeira publicación de cada novo tema con estas etiquetas.","regular_tags_instructions":"Se se silencian estas etiquetas, non estarán silenciadas para os membros do grupo. Notificaráselles aos usuarios se son mencionados ou alguén lles responde.","muted_tags_instructions":"Os usuarios non recibirán ningunha notificación sobre temas novos con estas etiquetas e estes temas non aparecerán en últimos."},"logs":{"title":"Rexistros","when":"Cando","action":"Acción","acting_user":"Usuario activo","target_user":"Usuario obxectivo","subject":"Asunto","details":"Detalles","from":"De","to":"A"}},"permissions":{"title":"Permisos","none":"Non hai categorías asociadas a este grupo.","description":"Os membros deste grupo poden acceder a estas categorías"},"public_admission":"Permitir que os usuarios se unan ao grupo libremente (require un grupo visíbel ao público)","public_exit":"Permitir que os usuarios abandonen o grupo libremente","empty":{"posts":"Non hai publicacións de membros deste grupo.","members":"Non hai membros neste grupo.","requests":"Non hai petición de incorporación a este grupo.","mentions":"Non hai mencións neste grupo.","messages":"Non hai mensaxes para este grupo.","topics":"Non hai temas de membros deste grupo.","logs":"Non hai rexistros deste grupo."},"add":"Engadir","join":"Participar","leave":"Abandonar","request":"Petición","message":"Mensaxe","confirm_leave":"Confirma o abandono deste grupo?","allow_membership_requests":"Permitirlles aos usuarios que envíen peticións de incorporación aos propietarios do grupo (require un grupo visíbel ao público)","membership_request_template":"Personalizar o modelo que se lles amosa aos usuarios cando se envía unha petición de incorporación","membership_request":{"submit":"Enviar petición","title":"Petición para participar en%{group_name}","reason":"Permitir que os propietarios do grupo saiban por que pertence a este grupo"},"membership":"Incorporación","name":"Nome","group_name":"Nome do grupo","user_count":"Usuarios","bio":"Verbo do grupo","selector_placeholder":"escriba o nome do usuario","owner":"propietario","index":{"title":"Grupos","all":"Todos os grupos","empty":"Non hai grupos visiíbeis.","filter":"Filtrar por tipo de grupo","owner_groups":"Grupos dos que son propietario","close_groups":"Grupos pechados","automatic_groups":"Grupos automáticos","automatic":"Automático","closed":"Pechado","public":"Público","private":"Privado","public_groups":"Grupos públicos","my_groups":"Os meus grupos","group_type":"Tipo de grupo","is_group_user":"Membro","is_group_owner":"Propietario"},"title":{"one":"Grupo","other":"Grupos"},"activity":"Actividade","members":{"title":"Membros","filter_placeholder_admin":"nome de usuario ou correo electrónico","filter_placeholder":"nome de usuario","remove_member":"Retirar membro","remove_member_description":"Retirar a \u003cb\u003e%{username}\u003c/b\u003e deste grupo","make_owner":"Facer propietario","make_owner_description":"Facer que \u003cb\u003e%{username}\u003c/b\u003e sexa un propietario deste grupo","remove_owner":"Retirar como propietario","remove_owner_description":"Retirar a \u003cb\u003e%{username}\u003c/b\u003e como propietario deste grupo","make_primary":"Facer primario","make_primary_description":"Faga deste o grupo primario para \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Retirar como primario","remove_primary_description":"Retirar este o grupo como primario para \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Retirar membros","remove_members_description":"Retirar os usuarios seleccionados deste grupo","make_owners":"Facer propietarios","make_owners_description":"Facer dos usuarios seleccionados os propietarios deste grupo","remove_owners":"Retirar propietarios","remove_owners_description":"Retirar os usuarios seleccionados como propietarios deste grupo","make_all_primary":"Facelos a todos primarios","make_all_primary_description":"Facer deste o grupo primario para todos os usuarios seleccionados","remove_all_primary":"Retirar como primario","remove_all_primary_description":"Retirar este grupo como primario","owner":"Propietario","primary":"Primario","forbidden":"Non ten permiso para ver os membros."},"topics":"Temas","posts":"Publicacións","mentions":"Mencións","messages":"Mensaxes","notification_level":"Nivel de notificación predeterminado para mensaxes do grupo","alias_levels":{"mentionable":"Quen pode @mencionar este grupo?","messageable":"Que pode enviar mensaxes a este grupo?","nobody":"Ninguén","only_admins":"Só administradores","mods_and_admins":"Só moderadores e administradores","members_mods_and_admins":"Só membros do grupo, moderadores e administradores","owners_mods_and_admins":"Só os propietarios, moderadores e administradores do grupo","everyone":"Todos"},"notifications":{"watching":{"title":"Observación","description":"Notificaráselle cada publicación nova en todas as mensaxes e tamén amosará o número de novas respostas."},"watching_first_post":{"title":"Observando a publicación inicial","description":"Recibirá notificacións das novas mensaxes deste grupo pero non das súas respostas."},"tracking":{"title":"Seguimento","description":"Notificaráseche se alguén menciona o teu @nome ou che responde e tamén aparecerá o número de novas respostas."},"regular":{"title":"Normal","description":"Notificaráseche se alguén menciona o teu @nome ou che responde."},"muted":{"title":"Silenciado","description":"Non recibirás notificación ningunha sobre as mensaxes deste grupo."}},"flair_url":"Imaxe de estilo avatar","flair_upload_description":"Usar imaxes cadradas cun tamaño mínimo de 20 x 20 px.","flair_bg_color":"Cor de fondo de estilo avatar","flair_bg_color_placeholder":"(Opcional) Valor de cor hexadecimal","flair_color":"Cor de estilo avatar","flair_color_placeholder":"(Opcional) Valor de cor hexadecimal","flair_preview_icon":"Visualizar icona","flair_preview_image":"Visualizar imaxe","flair_type":{"icon":"Seleccionar unha icona","image":"Cargar unha imaxe"},"default_notifications":{"modal_description":"Quere aplicar este cambio con efectos retroactivos? Isto afectará as preferencias de %{count} usuarios existentes.","modal_yes":"Si","modal_no":"Non, aplicar só o cambio a partir de agora"}},"user_action_groups":{"1":"Gústames","2":"Gústames","3":"Marcadores","4":"Temas","5":"Réplicas","6":"Respostas","7":"Mencións","9":"CItas","11":"Edicións","12":"Enviar elementos","13":"Caixa de entrada","14":"Pendente","15":"Borradores"},"categories":{"all":"todas as categorías","all_subcategories":"todo","no_subcategory":"ningunha","category":"Categoría","category_list":"Amosar a lista de categorías","reorder":{"title":"Reordenar as categorías","title_long":"Reorganizar a lista de categorías","save":"Gardar orde","apply_all":"Aplicar","position":"Posición"},"posts":"Publicacións","topics":"Temas","latest":"Últimos","subcategories":"Subcategorías","muted":"Categorías silenciadas","topic_sentence":{"one":"%{count} tema","other":"%{count} temas"},"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"semana","month":"mes"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} tema novo na última semana.","other":"%{count} temas novos na última semana."},"topic_stat_sentence_month":{"one":"%{count} tema novo no último mes.","other":"%{count} temas novos no último mes."},"n_more":"Categorías (%{count} máis)..."},"ip_lookup":{"title":"Busca do enderezo IP","hostname":"Nome do servidor","location":"Localización","location_not_found":"(descoñecido)","organisation":"Organización","phone":"Teléfono","other_accounts":"Outras contas co mesmo enderezo IP:","delete_other_accounts":"Eliminar %{count}","username":"nome de usuario","trust_level":"NdeC","read_time":"tempo de lectura","topics_entered":"temas introducidos","post_count":"# publicacións","confirm_delete_other_accounts":"Confirma que quere eliminar estas contas?","powered_by":"utitlízase \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"copiado"},"user_fields":{"none":"(seleccione unha opción)","required":"Escriba un valor para \"%{name}\""},"user":{"said":"%{username}:","profile":"Perfil","mute":"Silenciar","edit":"Editar preferencias","download_archive":{"button_text":"Descargar todo","confirm":"Confirma a descarga das súas publicacións?","success":"Iniciouse a descarga, notificarémoslle cunha mensaxe o remate do proceso.","rate_limit_error":"Só se poden descargar as publicacións unha vez por día. Ténteo de novo mañá."},"new_private_message":"Nova mensaxe","private_message":"Mensaxe","private_messages":"Mensaxes","user_notifications":{"filters":{"filter_by":"Filtrar por","all":"Todo","read":"Lidos","unread":"Sen ler"},"ignore_duration_title":"Ignorar usuario","ignore_duration_username":"Nome de usuario","ignore_duration_when":"Duración:","ignore_duration_save":"Ignorar","ignore_duration_note":"Teña en conta que todos os ignorados elimínanse automaticamente despois de expirar a duración de ignorado.","ignore_duration_time_frame_required":"Seleccione un marco temporal","ignore_no_users":"Non ten usuarios ignorados.","ignore_option":"Ignorado","ignore_option_title":"Non recibirá notificacións relacionadas con este usuario e todos os seus temas e respostas permanecerán agochados.","add_ignored_user":"Engadir...","mute_option":"Silenciado","mute_option_title":"Non recibirá notificación ningunha relacionada con este usuario.","normal_option":"Normal","normal_option_title":"Recibirá unha notificación se este usuario lle responde, cita a súa mensaxe ou menciona o seu nome."},"notification_schedule":{"title":"Calendario de notificacións","label":"Activar o calendario personalizado de notificacións","tip":"Fóra destas horas, vostede terá posto automaticamente en «non molestar»","midnight":"Medianoite","none":"Ningunha","monday":"Luns","tuesday":"Martes","wednesday":"Mércores","thursday":"Xoves","friday":"Venres","saturday":"Sábado","sunday":"Domingo","to":"para o"},"activity_stream":"Actividade","read":"Ler","read_help":"Temas lidos recentes","preferences":"Preferencias","feature_topic_on_profile":{"open_search":"Seleccionar un novo tema","title":"Seleccionar un tema","search_label":"Buscar tema polo título","save":"Gardar","clear":{"title":"Borrar","warning":"Confirma o borrado do seu tema de actualidade?"}},"use_current_timezone":"Utilizar zona horaria actual","profile_hidden":"O perfil público deste usuario está oculto.","expand_profile":"Despregar","collapse_profile":"Pregar","bookmarks":"Marcadores","bio":"Verbo de min","timezone":"Zona horaria","invited_by":"Convidado por","trust_level":"Nivel de confianza","notifications":"Notificacións","statistics":"Estatísticas","desktop_notifications":{"label":"Notificacións ao vivo","not_supported":"Este navegador non admite notificacións. Desculpe.","perm_default":"Acender notificacións","perm_denied_btn":"Permiso denegado","perm_denied_expl":"Denegou o permiso para recibir notificacións no navegador. Permita as notificacións na configuración do navegador.","disable":"Desactivar as notificacións","enable":"Activar as notificacións","each_browser_note":"Nota: Ten que cambiar este axuste en todos os navegadores que use. Desactivaranse todas as notificacións cando estea en «non molestar», independentemente deste axuste.","consent_prompt":"Quere recibir notificacións ao vivo cando a xente lea as súas publicacións?"},"dismiss":"Desbotar","dismiss_notifications":"Desbotar todo","dismiss_notifications_tooltip":"Marcar todas notificacións sen ler como lidas","no_bookmarks_search":"Non se atoparon marcadores coa busca fornecida.","first_notification":"Xa ten a súa primeira notificación! Selecciónea para comezar.","dynamic_favicon":"Amosar conta na icona do navegador","skip_new_user_tips":{"description":"Saltar consellos e insignias na entrada dos novos usuarios","not_first_time":"Non é a súa primeira vez?","skip_link":"Saltar estes consellos"},"theme_default_on_all_devices":"Facer que este sexa o tema predeterminado en todos os meus dispositivos","color_scheme_default_on_all_devices":"Estabelecer esquema(s) de cores predeterminados en todos os dispositivos","color_scheme":"Esquema de cor","color_schemes":{"default_description":"Predeterminado","disable_dark_scheme":"O mesmo que o normal","dark_instructions":"Pode visualizar o esquema do modo escuro trocando no seu dispositivo a modo escuro.","undo":"Restabelecer","regular":"Normal","dark":"Modo escuro","default_dark_scheme":"(predeterminado do sitio)"},"dark_mode":"Modo escuro","dark_mode_enable":"Activar o esquema de cores automático en modo escuro","text_size_default_on_all_devices":"Facer que este sexa o tamaño de texto predeterminado en todos os meus dispositivos","allow_private_messages":"Permitirlles a outros usuarios enviarme mensaxes privadas","external_links_in_new_tab":"Abrir todas as ligazóns externas nunha nova lapela","enable_quoting":"Activar as comiñas de resposta para o texto realzado","enable_defer":"Activar a opción de diferir para marcar os temas como non lidos","change":"cambiar","featured_topic":"Tema de actualidade","moderator":"%{user} é moderador","admin":"%{user} é administrador","moderator_tooltip":"Este usuario é un moderador","admin_tooltip":"Este usuario é un administrador","silenced_tooltip":"Este usuario está silenciado","suspended_notice":"Este usuario está suspendido ata o %{date}.","suspended_permanently":"Este usuario está suspendido.","suspended_reason":"Razón: ","github_profile":"Github","email_activity_summary":"Resumo da actividade","mailing_list_mode":{"label":"Modo de lista de correo","enabled":"Activar o modo de lista de correo","instructions":"Este axuste anula o resumo da actividade.\u003cbr /\u003e\nOs temas e categorías silenciados non están incluídos nestes correos electrónicos.\n","individual":"Enviarme un correo electrónico por cada nova publicación","individual_no_echo":"Enviarme un correo electrónico por cada nova publicación, agás as miñas","many_per_day":"Enviarme un correo electrónico por cada nova publicación (aproximadamente %{dailyEmailEstimate} por día)","few_per_day":"Enviarme un correo electrónico por cada nova publicación (aproximadamente 2 por día)","warning":"O modo de lista de correo está activado. Anularanse os axustes da notificación por correo electrónico."},"tag_settings":"Etiquetas","watched_tags":"Visto","watched_tags_instructions":"Verá automaticamente todos os temas novos con estas etiquetas. Recibirá notificacións de todas as novas publicacións e temas e aparecerá o número de novas publicacións preto do tema.","tracked_tags":"Seguido","tracked_tags_instructions":"Seguirá automaticamente todos os temas con estas etiquetas. O número de novas publicacións amosarase preto do tema.","muted_tags":"Silenciado","muted_tags_instructions":"Non recibirá notificacións de nada relacionado cos novos temas con estas etiquetas e non aparecerán entre os máis recentes.","watched_categories":"Visto","watched_categories_instructions":"Verá automaticamente todos os temas destas categorías. Recibirá notificacións de todas as novas publicacións e temas e aparecerá o número de novas publicacións preto do tema.","tracked_categories":"Seguido","tracked_categories_instructions":"Seguirás automaticamente todos os temas destas categorías. O número de novas publicacións aparecerá preto do tema.","watched_first_post_categories":"Vendo publicación inicial","watched_first_post_categories_instructions":"Recibirás notificacións da publicación inicial en cada novo tema destas categorías.","watched_first_post_tags":"Vendo a publicación inicial","watched_first_post_tags_instructions":"Recibirá notificacións da publicación inicial en cada novo tema con estas etiquetas.","muted_categories":"Silenciado","muted_categories_instructions":"Non recibirá notificacións de nada relacionado cos novos temas destas categorías e non aparecerán nas categorías nin nas páxinas máis recentes.","muted_categories_instructions_dont_hide":"Non recibirá notificacións de nada relacionado cos novos temas nestas categorías.","regular_categories":"Normal","regular_categories_instructions":"Verá estas categorías nas listas de temas «Últimos» e «Importantes».","no_category_access":"Como moderador, ten acceso limitado ás categorías e non pode gardar cambios.","delete_account":"Eliminar a miña conta","delete_account_confirm":"Confirma que quere eliminar definitivamente a súa conta? Esta acción non se pode desfacer!","deleted_yourself":"A súa conta acaba de ser eliminada completamente.","delete_yourself_not_allowed":"Póñase en contacto cun membro do equipo para eliminar a súa conta.","unread_message_count":"Mensaxes","admin_delete":"Eliminar","users":"Usuarios","muted_users":"Silenciado","muted_users_instructions":"Suprimir todas as notificacións e mensaxes privadas destes usuarios.","allowed_pm_users":"Permitidas","allowed_pm_users_instructions":"Permitir só MP destes usuarios.","allow_private_messages_from_specific_users":"Permitir só a usuarios específicos que me envíen mensaxes persoais","ignored_users":"Ignorado","ignored_users_instructions":"Suprimir todas as publicacións, notificacións e mensaxes privadas destes usuarios.","tracked_topics_link":"Amosar","automatically_unpin_topics":"Desprender os temas automaticamente cando acade o fondo.","apps":"Apps","revoke_access":"Revogar acceso","undo_revoke_access":"Desfacer a revogación de acceso","api_approved":"Aprobado:","api_last_used_at":"Último utilizado o:","theme":"Tema","save_to_change_theme":"Para actualizar o tema, prema \"%{save_text}\"","home":"Páxina de inicio predeterminada","staged":"Transitorio","staff_counters":{"flags_given":"alertas útiles","flagged_posts":"publicacións sinaladas","deleted_posts":"publicacións eliminadas","suspensions":"suspensións","warnings_received":"advertencias","rejected_posts":"publicacións rexeitadas"},"messages":{"inbox":"Caixa de entrada","latest":"Últimos","sent":"Enviadas","unread":"Sen ler","unread_with_count":{"one":"(%{count}) pendente de ler","other":"(%{count}) pendente de ler"},"new":"Novo","new_with_count":{"one":"(%{count}) novo","other":"(%{count}) novo"},"archive":"Arquivo","groups":"Os meus grupos","move_to_inbox":"Mover á caixa de entrada","move_to_archive":"Arquivo","failed_to_move":"Produciuse un fallo ao mover as mensaxes seleccionadas (quizais a rede está caída)","tags":"Etiquetas"},"preferences_nav":{"account":"Conta","security":"Seguranza","profile":"Perfil","emails":"Correos electrónicos","notifications":"Notificacións","categories":"Categorías","users":"Usuarios","tags":"Etiquetas","interface":"Interface","apps":"Apps"},"change_password":{"success":"(correo enviado)","in_progress":"(enviando o correo)","error":"(erro)","emoji":"bloquear emoji","action":"Enviar correo para restabelecer o contrasinal","set_password":"Estabelecer o contrasinal","choose_new":"Elixir un novo contrasinal","choose":"Elixir un contrasinal"},"second_factor_backup":{"title":"Códigos de copia de seguranza de dobre paso","regenerate":"Rexenerar","disable":"Desactivar","enable":"Activar","enable_long":"Activar códigos de copia de seguranza","manage":{"one":"Xestionar os códigos de copia de seguranza. Quédanlle \u003cstrong\u003e%{count}\u003c/strong\u003e de código de copia de seguranza.","other":"Xestionar os códigos de copia de seguranza. Quédanlle \u003cstrong\u003e%{count}\u003c/strong\u003e de códigos de copia de seguranza."},"copy_to_clipboard":"Copiar ao portapapeis","copy_to_clipboard_error":"Produciuse un erro ao copiar os datos ao portapapeis","copied_to_clipboard":"Copiado ao portapapeis","download_backup_codes":"Descargar códigos de copia de seguranza","remaining_codes":{"one":"Quédanlle \u003cstrong\u003e%{count}\u003c/strong\u003e de código de copia de seguranza.","other":"Quédanlle \u003cstrong\u003e%{count}\u003c/strong\u003e de códigos de copia de seguranza."},"use":"Usar un código de copia de seguranza","enable_prerequisites":"Debe activar un método primario de dobre paso antes de xerar os códigos de copia.","codes":{"title":"Códigos de copia de seguranza xerados","description":"Os códigos de copia de seguranza só poden usarse unha vez. Gárdeos nun lugar seguro pero accesíbel."}},"second_factor":{"title":"Autenticación de dobre paso","enable":"Xestionar autenticación de dobre paso","disable_all":"Desactivar todos","forgot_password":"Esqueceu o contrasinal?","confirm_password_description":"Confirme o seu contrasinal para continuar","name":"Nome","label":"Código","rate_limit":"Agarde antes de tentalo con outro código de autenticación.","enable_description":"Escanee este código QR nunha aplicación compatíbel (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e - \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) e escriba o código de autenticación.\n","disable_description":"Escriba o código de autenticación da súa aplicación","show_key_description":"Introducilo manualmente","short_description":"Protexa a súa conta con códigos de seguranza dun só uso.\n","extended_description":"A autenticación de dobre paso reforza a seguranza da sús conta, ao requirir un código dun só uso ademais do contrasinal. Os tokens pódense xear en dispositivos \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e e \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e.\n","oauth_enabled_warning":"Repare en que a activación na súa conta da autenticación de dobre paso implica a desactivación do inicio de sesión a través de redes sociais.","use":"Usar app de autenticador","enforced_notice":"Requírese activar a autenticación de dobre paso para acceder a este sitio.","disable":"Desactivar","disable_confirm":"Confirma que quere desactivar todos os métodos de dobre paso?","save":"Gardar","edit":"Editar","edit_title":"Editar autenticador","edit_description":"Nome do autenticador","enable_security_key_description":"Cando teña a súa \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003e clave de equipo seguro\u003c/a\u003e preparada, prema o botón Rexistrarse, a seguir.\n","totp":{"title":"Autenticadores que usan códigos","add":"Engadir autenticador","default_name":"O meu autenticador","name_and_code_required_error":"Debe escribir un nome e o código da app autenticadora."},"security_key":{"register":"Rexistrarse","title":"Clave de seguranza","add":"Engadir clave de seguranza","default_name":"Clave de seguranza principal","not_allowed_error":"O proceso de rexistro da clave de seguranza esgotou o tempo ou foi anulado.","already_added_error":"Xa rexistrou esta clave de seguranza. Non precisa volver rexistrala.","edit":"Editar clave de seguranza","save":"Gardar","edit_description":"Nome da clave de seguranza","name_required_error":"Debe escribir un nome para a clave de seguranza."}},"change_about":{"title":"Cambiar «Verbo de min»","error":"Produciuse un erro ao cambiar este valor."},"change_username":{"title":"Cambiar o nome de usuario","confirm":"Confirma o cambio do seu nome de usuario?","taken":"Sentímolo pero este nome xa está en uso.","invalid":"Este nome de usuario non é correcto. Só pode conter números e letras."},"add_email":{"title":"Engadir correo electrónico","add":"engadir"},"change_email":{"title":"Cambiar o correo electrónico","taken":"Sentímolo pero este correo non está dispoñíbel.","error":"Produciuse un erro ao cambiar o correo electrónico. Ese enderezo estará xa ocupado?","success":"Enviamos un correo electrónico a ese enderezo. Siga as instrucións de confirmación.","success_via_admin":"Enviouse unha mensaxe de correo a ese enderezo. O usuario deberá seguir as instrucións de confirmación expostas na mensaxe de correo.","success_staff":"Enviamos un correo electrónico ao teu enderezo actual. Siga as instrucións de confirmación."},"change_avatar":{"title":"Cambie a foto do perfil","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, baseado en","gravatar_title":"Cambie o seu avatar no sitio web de %{gravatarName}","gravatar_failed":"Non atopamos ningún %{gravatarName} con ese enderezo de correo electrónico.","refresh_gravatar_title":"Actualice o seu %{gravatarName}","letter_based":"Imaxe do perfil asignada polo sistema","uploaded_avatar":"Imaxe personalizada","uploaded_avatar_empty":"Engadir unha imaxe personalizada","upload_title":"Cargue a súa imaxe","image_is_not_a_square":"Aviso: recortamos a súa imaxe; a largura e a altura eran distintas."},"change_profile_background":{"title":"Cabeceira do perfil","instructions":"As cabeceiras dos perfís centraranse e terán unha largura predeterminada de 1110 px."},"change_card_background":{"title":"Fondo das fichas dos usuarios","instructions":"As imaxes dos fondos centraranse e terán unha largura predeterminada de 590 px."},"change_featured_topic":{"title":"Tema de actualidade","instructions":"Na súa tarxeta de usuario e no seu perfil atopará unha ligazón a este tema."},"email":{"title":"Correo electrónico","primary":"Correo electrónico principal","secondary":"Correos electrónicos secundarios","primary_label":"primario","unconfirmed_label":"sen confirmar","resend_label":"reenviar correo de confirmación","resending_label":"enviando...","resent_label":"correo electrónico enviado","update_email":"Cambiar o correo electrónico","set_primary":"Estabelecer correo electrónico principal","destroy":"Retirar correo electrónico","add_email":"Engadir correo electrónico alternativo","auth_override_instructions":"O enderezo decorreo pode actualizarse desde un fornecedor de autenticación.","no_secondary":"Sen correos electrónicos secundarios","instructions":"Non se verá nunca en público.","admin_note":"Nota: un usuario administrador que cambia o correo electrónico doutro usuario que non é administrador indica que o usuario perdeu o acceso á súa conta de correo orixinal, polo que se lle enviará un correo electrónico de restabelecemento do contrasinal ao seu novo enderezo. O correo electrónico do usuario non cambiará ata completar o proceso de restabelecemento do contrasinal.","ok":"Enviarémoslle un correo electrónico para confirmar","required":"Escriba un enderezo de correo electrónico","invalid":"Introduza un enderezo de correo electrónico correcto","authenticated":"O seu enderezo de correo electrónico foi autenticado por %{provider}","invite_auth_email_invalid":"A súa mensaxe de convite non casa co enderezo de correo autenticado en %{provider}","frequency_immediately":"Enviarémosllee unha mensaxe de correo axiña se non leu sobre o que lle estamos a enviar.","frequency":{"one":"Só lle eviaremos un correo se non o vimos a vostede no último minuto.","other":"Só lle eviaremos un correo se non o vimos a vostede nos últimos %{count} minutos."}},"associated_accounts":{"title":"Contas asociadas","connect":"Conectar","revoke":"Revogar","cancel":"Cancelar","not_connected":"(non conectado)","confirm_modal_title":"Conectar coa conta de %{provider}","confirm_description":{"account_specific":"Usarase a súa conta «%{account_description}» de %{provider} para a autenticación.","generic":"Usarase a súa conta de %{provider} para a autenticación."}},"name":{"title":"Nome","instructions":"o seu nome completo (opcional)","instructions_required":"Nome completo","required":"Escriba un nome","too_short":"O nome é curto de mais","ok":"O nome parece correcto"},"username":{"title":"Nome de usuario","instructions":"exclusivo, sen espazos, curto","short_instructions":"A xente pode mencionalo como @%{username}","available":"O nome de usuario está dispoñíbel","not_available":"Non dispoñíbel. Tentar %{suggestion}?","not_available_no_suggestion":"Non dispoñíbel","too_short":"O nome de usuario é curto de máis","too_long":"O nome de usuario é longo de máis","checking":"Comprobando a dispoñibilidade do nome de usuario...","prefilled":"O correo electrónico coincide co nome de usuario rexistrado","required":"Escriba un nome de usuario","edit":"Editar o nome de usuario"},"locale":{"title":"Idioma da interface","instructions":"Idioma da interface do usuario. Cambiará cando actualice a páxina.","default":"(predeterminado)","any":"calquera"},"password_confirmation":{"title":"O contrasinal outra vez"},"invite_code":{"title":"Código de convite","instructions":"O rexistro da conta require un código de convite"},"auth_tokens":{"title":"Dispositivos usados recentemente","details":"Detalles","log_out_all":"Rematar a sesión para todo","not_you":"Non es vostede?","show_all":"Amosar todos (%{count})","show_few":"Amosar menos","was_this_you":"Foi vostede?","was_this_you_description":"Se non foi voste, recomendámoslle que cambie o seu contrasinal e saia da sesión.","browser_and_device":"%{browser} en %{device}","secure_account":"Protexer a miña conta","latest_post":"O último que publicou…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactivo agora\u003c/span\u003e","browser_last_seen":"%{browser} o %{date}"},"last_posted":"Última publicación","last_seen":"Visto","created":"Inscrito","log_out":"Saír da sesión","location":"Localización","website":"Sitio web","email_settings":"Correo electrónico","hide_profile_and_presence":"Agochar o meu perfil público e as funcionalidades de presenza","enable_physical_keyboard":"Activar a compatibilidade do teclado físico no iPad","text_size":{"title":"Tamaño do texto","smallest":"O máis pequeno","smaller":"Máis pequeno","normal":"Normal","larger":"Máis grande","largest":"Enorme"},"title_count_mode":{"title":"O título da páxina de fondo presenta a conta de:","notifications":"Novas notificacións","contextual":"Contido novo da páxina"},"like_notification_frequency":{"title":"Notificar cando reciba gústames","always":"Sempre","first_time_and_daily":"A primeira vez que unha publicación reciba un gústame e diariamente","first_time":"A primeira vez que unha publicación lle gusta a alguén","never":"Nunca"},"email_previous_replies":{"title":"Incluír as respostas previas no final dos correos electrónicos","unless_emailed":"excepto os enviados anteriormente","always":"sempre","never":"nunca"},"email_digests":{"title":"Cando non veña por aquí, desexo recibir un correo electrónico cun resumo dos temas e respostas máis populares","every_30_minutes":"cada 30 minutos","every_hour":"cada hora","daily":"diariamente","weekly":"semanalmente","every_month":"cada mes","every_six_months":"cada seis meses"},"email_level":{"title":"Enviar un correo electrónico cando alguén me cite, responda a unha das miñas publicacións, mencione o meu @nomedeusuario ou me convide a un tema.","always":"sempre","only_when_away":"só cando ausente","never":"nunca"},"email_messages_level":"Enviar correo electrónico cando alguén me mande unha mensaxe","include_tl0_in_digests":"Incluír contido de novos usuarios nos correos electrónicos de resumo","email_in_reply_to":"Incluír nos correos un extracto das respostas á publicación","other_settings":"Outro","categories_settings":"Categorías","new_topic_duration":{"label":"Considerar novos temas cando","not_viewed":"Aínda non os vin","last_here":"creados desde a última vez que estiven aquí","after_1_day":"creados no último día","after_2_days":"creados nos últimos 2 días","after_1_week":"creados na última semana","after_2_weeks":"creados nas última 2 semanas"},"auto_track_topics":"Facer seguimento automático dos temas nos que entro","auto_track_options":{"never":"nunca","immediately":"inmediatamente","after_30_seconds":"despois de 30 segundos","after_1_minute":"despois de 1 minuto","after_2_minutes":"despois de 2 minutos","after_3_minutes":"despois de 3 minutos","after_4_minutes":"despois de 4 minutos","after_5_minutes":"despois de 5 minutos","after_10_minutes":"despois de 10 minutos"},"notification_level_when_replying":"Cando publico un tema, definilo como","invited":{"title":"Convites","pending_tab":"Pendente","pending_tab_with_count":"Pendentes (%{count})","expired_tab":"Caducou","expired_tab_with_count":"Caducou (%{count})","redeemed_tab":"Utilizado","redeemed_tab_with_count":"Utilizados (%{count})","invited_via":"Convite","invited_via_link":"ligazón %{key} (%{count} / %{max} rescatadas)","groups":"Grupos","topic":"Tema","sent":"Creado/Último envío","expires_at":"Caduca","edit":"Editar","remove":"Retirar","copy_link":"Obter ligazón","reinvite":"Reenviar por correo","reinvited":"Convite reenviado","removed":"Retirado","search":"escribir para buscar convites...","user":"Usuario convidado","none":"Non hai convites que amosar.","truncated":{"one":"Amosando o primeiro convite.","other":"Amosando os primeiros %{count} convites."},"redeemed":"Convites utilizados","redeemed_at":"Utilizado","pending":"Convites pendentes","topics_entered":"Temas vistos","posts_read_count":"Publicacións lidas","expired":"Este convite caducou.","remove_all":"Retirar os convites caducados","removed_all":"Todos os convites caducados foron retirados!","remove_all_confirm":"Confirma que quere retirar todos os convites caducados?","reinvite_all":"Reenviar todos os convites","reinvite_all_confirm":"Confirma o reenvío de todos os convites?","reinvited_all":"Enviados todos os convites!","time_read":"Tempo de lectura","days_visited":"Días desde visita","account_age_days":"Tempo da conta en días","create":"Convidar","generate_link":"Crear ligazón de convite","link_generated":"Aquí ten a ligazón de convite!","valid_for":"A ligazón do convite só é válida para este enderezo de correo electrónico: %{email}","single_user":"Convidar por correo electrónico","multiple_user":"Convidar por ligazón","invite_link":{"title":"Ligazón do convite","success":"A ligazón do convite xerouse correctamente!","error":"Produciuse un erro ao xerar esta ligazón de convite","max_redemptions_allowed_label":"Cantas persoas poden rexistrarse con esta ligazón?","expires_at":"Cando caduca a ligazón deste convite?"},"invite":{"new_title":"Crear convite","edit_title":"Editar convite","instructions":"Compartir esta ligazón para conceder acceso a este sitio","copy_link":"copiar a ligazón","show_advanced":"Amosar opcións avanzadas","hide_advanced":"Agochar opcións avanzadas","add_to_groups":"Engadir aos grupos","expires_at":"Caduca tras","custom_message":"Mensaxe persoal opcional","send_invite_email":"Gardar e enviar mensaxe de correo","save_invite":"Gardar convite"},"bulk_invite":{"none":"Non hai convites que amosar nesta páxina.","text":"Convite en grupo","instructions":"\u003cp\u003eConvide a unha listaxe de usuarios para que a súa comunidade medre rapidamente. Prepare un \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eficheiro CSV\u003c/a\u003e que conteña unha liña por enderezo de correo de usuario que desexe convidar. Pódese fornecer a seguinte información en campos separados por coma, se quere engadir xente a grupos ou enviarlos a un tema específico antes de eles iniciaren sesión.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEnviaráselle un convite a cada enderezo de correo que conteña o ficheiro CSV que suba e poderá xestionalo máis adiante.\u003c/p\u003e\n","progress":"Cargado %{progress}%...","success":"O ficheiro cargouse correctamente. Notificaráselle por mensaxe cando o proceso quede completado.","error":"O ficheiro ten que ter formato CSV."}},"password":{"title":"Contrasinal","too_short":"O seu contrasinal é demasiado curto.","common":"Ese contrasinal é demasiado habitual.","same_as_username":"O contrasinal é igual ao nome de usuario.","same_as_email":"O contrasinal é igual ao correo electrónico.","ok":"O contrasinal semella bo.","instructions":"como mínimo %{count} caracteres","required":"Escriba un contrasinal"},"summary":{"title":"Resumo","stats":"Estatísticas","time_read":"tempo de lectura","recent_time_read":"tempo de lectura recente","topic_count":{"one":"tema creado","other":"temas creados"},"post_count":{"one":"publicación creada","other":"publicacións creadas"},"likes_given":{"one":"dado","other":"dados"},"likes_received":{"one":"recibido","other":"recibidos"},"days_visited":{"one":"día de visitado","other":"días de visitado"},"topics_entered":{"one":"tema visto","other":"temas vistos"},"posts_read":{"one":"publicación lida","other":"publicacións lidas"},"bookmark_count":{"one":"marcador","other":"marcadores"},"top_replies":"Respostas destacadas","no_replies":"Aínda sen respostas.","more_replies":"Máis respostas","top_topics":"Temas destacados","no_topics":"Aínda sen temas.","more_topics":"Máis temas","top_badges":"Insignias destacadas","no_badges":"Aínda sen insignias.","more_badges":"Máis insignias","top_links":"Ligazóns destacadas","no_links":"Aínda sen ligazóns.","most_liked_by":"Con máis gústames de","most_liked_users":"Con máis gústames","most_replied_to_users":"Con máis respostas a","no_likes":"Aínda sen gústames.","top_categories":"Categorías destacadas","topics":"Temas","replies":"Respostas"},"ip_address":{"title":"Último enderezo IP"},"registration_ip_address":{"title":"Rexistro de enderezos IP"},"avatar":{"title":"Imaxe do perfil","header_title":"perfil, mensaxes, marcadores e preferencias","name_and_description":"%{name} %{description}","edit":"Editar a imaxe do perfil"},"title":{"title":"Título","none":"(ningún)"},"flair":{"none":"(ningún)"},"primary_group":{"title":"Grupo primario","none":"(ningunha)"},"filters":{"all":"Todo"},"stream":{"posted_by":"Publicada por","sent_by":"Enviada por","private_message":"mensaxe","the_topic":"o tema"}},"loading":"Cargando...","errors":{"prev_page":"ao tentar cargar","reasons":{"network":"Erro de rede","server":"Erro do servidor","forbidden":"Acceso denegado","unknown":"Erro","not_found":"Páxina non atopada"},"desc":{"network":"Por favor, comprobe a conexión.","network_fixed":"Parece que xa estamos de volta.","server":"Código do erro: %{status}","forbidden":"Non ten permiso para ver isto.","not_found":"Vaites, o aplicativo tentou cargar unha URL inexistente.","unknown":"Algo foi mal."},"buttons":{"back":"Volver","again":"Tentar de novo","fixed":"Cargar páxina"}},"modal":{"close":"pechar","dismiss_error":"Desbotar erro"},"close":"Pechar","assets_changed_confirm":"O sitio acaba de recibir unha anovación de software. Obter a última versión agora?","logout":"Pechouselle a sesión.","refresh":"Actualizar","home":"Inicio","read_only_mode":{"enabled":"Este sitio está en modo só-lectura. Continúe navegando pero responder, gustar e outras accións estarán desactivadas polo de agora.","login_disabled":"Cando o sitio está no modo de só-lectura, desactívase o inicio de sesión.","logout_disabled":"O peche de sesión desactívase mentres o sitio está en modo de só lectura."},"logs_error_rate_notice":{},"learn_more":"saber máis...","first_post":"Publicación inicial","mute":"Silenciar","unmute":"Non silenciar","last_post":"Publicado","local_time":"Hora local","time_read":"Lidas","time_read_recently":"Recentemente %{time_read}","time_read_tooltip":"Tempo de lectura total %{time_read}","time_read_recently_tooltip":"%{time_read} En tempo de lectura total (%{recent_time_read} nos últimos 60 días)","last_reply_lowercase":"última resposta","replies_lowercase":{"one":"resposta","other":"respostas"},"signup_cta":{"sign_up":"Rexistrarse","hide_session":"Lémbremo mañá","hide_forever":"non grazas","intro":"Ola! Todo indica que goza coa discusión pero aínda non solicitou inscrición dunha conta.","value_prop":"Cando crea unha conta, lembramos exactamente o que ten lido, polo que sempre volve onde o deixou. Tamén recibe notificacións, desde aquí e por correo electrónico cando alguén lle responde. E pode amosarlle aprecio ás publicacións para compartir o amor. :heartpulse:"},"summary":{"enabled_description":"Está vendo un resumo deste tema: as publicacións máis interesantes determinadas pola comunidade.","description":{"one":"Hai \u003cb\u003e%{count}\u003c/b\u003e resposta.","other":"Hai \u003cb\u003e%{count}\u003c/b\u003e respostas."},"enable":"Resumir este tema","disable":"Amosar todas as publicacións"},"deleted_filter":{"enabled_description":"Este tema contén publicacións eliminadas, que se ocultaron.","disabled_description":"Amósanse as publicacións eliminadas do tema.","enable":"Agochar as publicacións eliminadas","disable":"Amosar as publicacións eliminadas"},"private_message_info":{"title":"Mensaxe","invite":"Convidar a outros...","edit":"Engadir ou retirar...","remove":"Retirar...","add":"Engadir...","leave_message":"Confirma o abandono desta mensaxe?","remove_allowed_user":"Confirma que quere retirar a %{name} desta mensaxe?","remove_allowed_group":"Confirma que quere retirar a %{name} desta mensaxe?"},"email":"Correo electrónico","username":"Nome de usuario","last_seen":"Visto","created":"Creado","created_lowercase":"creado","trust_level":"Nivel de confianza","search_hint":"nome de usuario, enderezo de  correo ou enderezo IP","create_account":{"header_title":"Dámoslle a benvida!","subheader_title":"Déixenos crear a súa conta","disclaimer":"Ao rexistrarse, acepta a \u003ca href='%{privacy_link}' target='blank'\u003enorma de privacidade\u003c/a\u003e e os \u003ca href='%{tos_link}' target='blank'\u003etermos de servizo\u003c/a\u003e.","title":"Crear unha conta nova","failed":"Algo foi mal, quizais este correo electrónico xa está rexistrado, ténteo coa ligazón de «Esqueceume o contrasinal»"},"forgot_password":{"title":"Contrasinal restabelecido","action":"Esquecín o meu contrasinal","invite":"Escriba o nome de usuario ou enderezo de correo, e enviaráselle unha mensaxe de correo para restabelecer o contrasinal.","reset":"Restabelecer o contrasinal","complete_username":"Se unha conta corresponde ao nome de usuario \u003cb\u003e%{username}\u003c/b\u003e, deberá recibir en breve unha mensaxe de correo coas instrucións sobre como restabelecer o seu contrasinal.","complete_email":"Se unha conta coincide con \u003cb\u003e%{email}\u003c/b\u003e, deberá recibir en breve unha mensaxe de correo con instrucións sobre como restabelecer o seu contrasinal.","complete_username_found":"Áchase unha conta co mesmo nome de usuario \u003cb\u003e%{username}\u003c/b\u003e. Deberá recibir en breve un correo electrónico coas instrucións sobre como restabelecer o seu contrasinal.","complete_email_found":"Áchase unha conta que coincide con \u003cb\u003e%{email}\u003c/b\u003e. Deberá recibir en breve un correo electrónico coas instrucións sobre como restabelecer o seu contrasinal.","complete_username_not_found":"Non se acha ningunha conta coincidente co nome de usuario \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Ningunha conta coincide co \u003cb\u003e%{email}\u003c/b\u003e","help":"Non recibiu o correo electrónico? Comprobe primeiro a caixa de lixo do correo.\u003cp\u003eNon lembra o enderezo de correo electrónico que usou? Escriba un enderezo de correo electrónico e farémoslles saber se está rexistrado aquí.\u003c/p\u003e\u003cp\u003eNo caso de que xa non teña acceso ao enderezo de correo rexistrado na conta, póñase en contacto co noso \u003ca href='%{basePath}/about'\u003eatento equipo.\u003c/a\u003e\u003c/p\u003e","button_ok":"De acordo","button_help":"Axuda"},"email_login":{"link_label":"Envíeme ao correo unha ligazón de acceso","button_label":"con correo electrónico","login_link":"Saltar o contrasinal; envíeme por correo unha ligazón de inicio de sesión","emoji":"bloquear emoji","complete_username":"Se unha conta corresponde ao nome de usuario \u003cb\u003e%{username}\u003c/b\u003e, deberá recibir en breve un correo electrónico cunha ligazón de inicio de sesión.","complete_email":"Se unha conta corresponde a \u003cb\u003e%{email}\u003c/b\u003e, deberá recibir en breve unha ligazón de inicio de sesión.","complete_username_found":"Atopamos unha conta que co nome de usuario \u003cb\u003e%{username}\u003c/b\u003e, deberá recibir en breve un correo electrónico cunha ligazón de inicio de sesión.","complete_email_found":"Atopamos unha conta que corresponde a \u003cb\u003e%{email}\u003c/b\u003e, deberá recibir en breve un correo electrónico cunha ligazón de inicio de sesión.","complete_username_not_found":"Ningunha conta coincide co nome de usuario \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Ningunha conta coincide co \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Continuar a %{site_name}","logging_in_as":"Iniciar sesión como %{email}","confirm_button":"Finalizar inicio de sesión"},"login":{"subheader_title":"Iniciar sesión na súa conta","username":"Usuario","password":"Contrasinal","second_factor_title":"Autenticación de dobre paso","second_factor_description":"Escriba o código de autenticación da súa app:","second_factor_backup":"Iniciar sesión cun código de copia de seguranza","second_factor_backup_title":"Copia de seguranza de dobre paso","second_factor_backup_description":"Escriba un dos códigos de copia de seguranza:","second_factor":"Iniciar sesión cunha app autenticadora","security_key_description":"Cando teña a clave de seguranza preparada, prema no botón Autenticar con clave de seguranza que se amosa a continuación.","security_key_alternative":"Tentalo doutro xeito","security_key_authenticate":"Autenticar con clave de seguranza","security_key_not_allowed_error":"O proceso de autenticación da clave de seguranza esgotou o tempo ou foi cancelado.","security_key_no_matching_credential_error":"As credenciais non coinciden coa clave de seguranza introducida.","security_key_support_missing_error":"O  seu dispositivo ou navegador actual non admite a utilización de claves de seguranza. Utilice outro método.","email_placeholder":"correo electrónico ou nome de usuario","caps_lock_warning":"Bloqueo de maiúsculas activado","error":"Erro descoñecido","cookies_error":"Parece que o seu navegador ten os rastros desactivados. É posíbel que non poida iniciar sesión sen activalos primeiro.","rate_limit":"Por favor, agarde antes de tentalo outra vez.","blank_username":"Escriba o seu enderezo de correo ou nome de usuario.","blank_username_or_password":"Escriba o seu enderezo de correo ou nome de usuario e o contrasinal.","reset_password":"Restabelecer o contrasinal","logging_in":"Iniciando a sesión...","or":"Ou","authenticating":"Autenticando...","awaiting_activation":"A súa conta está pendente de se activar, empregue a ligazón de contrasinal esquecido para pedir outro correo de activación.","awaiting_approval":"A súa conta non foi aínda aprobada polos membros do equipo. Enviaráselle unha mensaxe cando así o for.","requires_invite":"Sentímolo pero o acceso a este foro é unicamente por convite.","not_activated":"Non pode acceder aínda. Antes debemos enviarlle unha mensaxe a \u003cb\u003e%{sentTo}\u003c/b\u003e. Por favor, siga as instrucións desta mensaxe para activar a súa conta.","not_allowed_from_ip_address":"Non pode iniciar sesión desde este enderezo IP.","admin_not_allowed_from_ip_address":"Non pode acceder como administrador desde ese enderezo IP.","resend_activation_email":"Prema aquí para enviar outro correo de activación.","omniauth_disallow_totp":"A súa conta ten activada a autenticación de dobre paso. Inicie sesión co seu contrasinal.","resend_title":"Reenviar correo electrónico de activación","change_email":"Cambiar enderezo de correo","provide_new_email":"Escriba un enderezo novo e reenviarémoslle o correo de confirmación.","submit_new_email":"Actualizar enderezo de correo electrónico","sent_activation_email_again":"Envióuselle outro correo de activación a \u003cb\u003e%{currentEmail}\u003c/b\u003e. Pode tardar uns minutos en chegar; asegúrese de revisar a caixa do lixo.","sent_activation_email_again_generic":"Enviamos outro correo electrónico de activación. Pode tardar uns minutos en chegar; asegúrese de revisar a caixa do lixo.","to_continue":"Por favor, inicie unha sesión","preferences":"Precisa iniciar sesión para cambiar as súas preferencias de usuario.","not_approved":"A súa conta non foi aínda aprobada. Notificaráselle por correo electrónico cando poida iniciar a sesión.","google_oauth2":{"name":"Google","title":"con Google"},"twitter":{"name":"Twitter","title":"co Twitter"},"instagram":{"name":"Instagram","title":"con Instagram"},"facebook":{"name":"Facebook","title":"co Facebook"},"github":{"name":"GitHub","title":"con GitHub"},"discord":{"name":"Discord","title":"con Discord"},"second_factor_toggle":{"totp":"Usar unha app autenticadora no seu lugar","backup_code":"Usar no seu lugar un código de copia de seguranza"}},"invites":{"accept_title":"Convite","emoji":"emoji de sobre","welcome_to":"Dámoslle a benvida a %{site_name}!","invited_by":"Recibiu o convite de:","social_login_available":"Con ese correo electrónico tamén poderá iniciar a sesión a través de calquera rede social.","your_email":"O enderezo de correo electrónico da súa conta é \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Aceptar convite","success":"A súa conta acaba de ser creada e ten a sesión iniciada.","name_label":"Nome","password_label":"Contrasinal","optional_description":"(opcional)"},"password_reset":{"continue":"Continuar en %{site_name}"},"emoji_set":{"apple_international":"Apple/Internacional","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Só categorías","categories_with_featured_topics":"Categorías con temas de actualidade","categories_and_latest_topics":"Categorías e últimos temas","categories_and_top_topics":"Categorías e temas destacados","categories_boxes":"Caixas con subcategorías","categories_boxes_with_topics":"Caixas con temas destacados"},"shortcut_modifier_key":{"shift":"Maiús","ctrl":"Ctrl","alt":"Alt","enter":"Intro"},"conditional_loading_section":{"loading":"Cargando..."},"category_row":{"topic_count":{"one":"%{count} tema nesta categoría","other":"%{count} temas nesta categoría"},"plus_subcategories_title":{"one":"%{name} e unha subcategoría","other":"%{name} e %{count} subcategorías"},"plus_subcategories":{"one":"+ %{count} subcategoría","other":"+ %{count} subcategorías"}},"select_kit":{"delete_item":"Eliminar %{name}","filter_by":"Filtrado por: %{name}","select_to_filter":"Seleccione un valor para filtrar","default_header_text":"Seleccionar...","no_content":"Non se atoparon coincidencias","filter_placeholder":"Buscar...","filter_placeholder_with_any":"Buscar ou crear...","create":"Crear: '%{content}'","max_content_reached":{"one":"Só pode seleccionar %{count} elemento.","other":"Só pode seleccionar %{count} elementos."},"min_content_not_reached":{"one":"Seleccione como mínimo %{count} elemento.","other":"Seleccione como mínimo %{count} elementos."},"invalid_selection_length":{"one":"A selección debe ter cando menos %{count} carácter.","other":"A selección debe ter cando menos %{count} caracteres."},"components":{"categories_admin_dropdown":{"title":"Xestionar categorías"}}},"date_time_picker":{"from":"De","to":"A"},"emoji_picker":{"filter_placeholder":"Buscar emoji","smileys_\u0026_emotion":"Emoticonas e emoción","people_\u0026_body":"Persoas e corpo","animals_\u0026_nature":"Animais e natureza","food_\u0026_drink":"Comida e bebida","travel_\u0026_places":"Viaxes e lugares","activities":"Actividades","objects":"Obxectos","symbols":"Símbolos","flags":"Alertas","recent":"Usados recentemente","default_tone":"Sen ton de pel","light_tone":"Ton de pel claro","medium_light_tone":"Tono de pel medio claro","medium_tone":"Tono de pel medio","medium_dark_tone":"Tono de pel medio escuro","dark_tone":"Ton de pel escuro","default":"Emojis personalizados"},"shared_drafts":{"title":"Borradores compartidos","notice":"Este tema só é visíbel para aqueles que poden ver a categoría \u003cb\u003e%{category}\u003c/b\u003e.","destination_category":"Categoría de destino","publish":"Publicar borrador compartido","confirm_publish":"Confirma a publicación deste borrador?","publishing":"Publicando o tema..."},"composer":{"emoji":"Emoji :)","more_emoji":"máis...","options":"Opcións","whisper":"rumor","unlist":"fóra da lista","add_warning":"Este é un aviso oficial.","toggle_whisper":"Trocar rumor","toggle_unlisted":"Trocar fóra da lista","posting_not_on_topic":"A que tema quere responder?","saved_local_draft_tip":"gardado localmente","similar_topics":"O seu tema é semellante a...","drafts_offline":"borradores sen conexión","edit_conflict":"conflito de edición","group_mentioned_limit":{"one":"\u003cb\u003eAviso!\u003c/b\u003e Mencionou a \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, con todo, este grupo ten máis membros có límite de mencións configurado polo administrador en %{count} usuario. Ninguén será avisado.","other":"\u003cb\u003eAviso!\u003c/b\u003e Mencionou a \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, con todo, este grupo ten máis membros có límite de mencións configurado polo administrador en %{count} usuarios. Ninguén será avisado."},"group_mentioned":{"one":"Ao mencionar %{group}, vai enviar a notificación a \u003ca href='%{group_link}'\u003e%{count} persoa\u003c/a\u003e. Está seguro de querelo facer?","other":"Ao mencionar %{group}, vai enviar a notificación a \u003ca href='%{group_link}'\u003e%{count} persoas\u003c/a\u003e. Está seguro de querelo facer?"},"cannot_see_mention":{"category":"Mencionou a %{username}, mais non poden recibir notificacións porque non teñen acceso a esta categoría. Debe engadilos a un grupo con acceso a esta categoría.","private":"Mencionou a %{username}, mais non recibirán notificacións porque non poden ver esta mensaxe privada. Debe convidalos a esta mensaxe privada."},"duplicate_link":"Parece que a súa ligazón a \u003cb\u003e%{domain}\u003c/b\u003e xa foi publicada no tema por \u003cb\u003e@%{username}\u003c/b\u003e e \u003ca href='%{post_url}'\u003enunha resposta sobre %{ago}\u003c/a\u003e Confirma que quere publicala de novo?","reference_topic_title":"RE: %{title}","error":{"title_missing":"O título é obrigatorio","title_too_short":{"one":"O título debe ter cando menos %{count} carácter","other":"O título debe ter cando menos %{count} caracteres"},"title_too_long":{"one":"O título non debe ter máis de %{count} carácter","other":"O título non debe ter máis de %{count} caracteres"},"post_missing":"A publicación non pode estar baleira","post_length":{"one":"A publicación debe ter cando menos %{count} carácter","other":"A publicación debe ter cando menos %{count} caracteres"},"try_like":"Probou o botón %{heart}?","category_missing":"Debe seleccionar unha categoría","tags_missing":{"one":"Debe seleccionar cando menos %{count} etiqueta","other":"Debe seleccionar cando menos %{count} etiquetas"},"topic_template_not_modified":"Engada detalles e aspectos específicos ao tema editando o modelo de tema."},"save_edit":"Gardar a edición","overwrite_edit":"Sobrescribir a edición","reply_original":"Responder no tema orixinal","reply_here":"Responder aquí","reply":"Responder","cancel":"Cancelar","create_topic":"Crear tema","create_pm":"Mensaxe","create_whisper":"Rumor","create_shared_draft":"Crear borrador compartido","edit_shared_draft":"Editar o borrador compartido","title":"Ou prema Ctrl+Intro","users_placeholder":"Engadir un usuario","title_placeholder":"Sobre que trata a discusión, nunha soa frase?","title_or_link_placeholder":"Escriba o título ou pegue unha ligazón aquí","edit_reason_placeholder":"por que o está editando?","topic_featured_link_placeholder":"Escriba a ligazón amosada co título.","remove_featured_link":"Retirar a ligazón do tema.","reply_placeholder":"Escriba aquí. Utilice Markdown, BBCode ou HTML para formatar. Arrastre ou pegue as imaxes.","reply_placeholder_no_images":"Escriba aquí. Utilice Markdown, BBCode, ou HTML para formatar.","reply_placeholder_choose_category":"Seleccione unha categoría antes de escribir aquí.","view_new_post":"Ver a nova publicación.","saving":"Gardando","saved":"Gardado!","saved_draft":"A publicación do borrador está en proceso. Dea toque para continuar.","uploading":"Cargando...","quote_post_title":"Citar a publicación enteira","bold_label":"G","bold_title":"Grosa","bold_text":"texto groso","italic_label":"C","italic_title":"Recalque","italic_text":"texto recalcado","link_title":"Hiperligazón","link_description":"introducir a descrición da ligazón aquí","link_dialog_title":"Inserir hiperligazón","link_optional_text":"título opcional","link_url_placeholder":"Pegue un URL ou escriba para buscar temas","blockquote_title":"Cita","blockquote_text":"Citación","code_title":"Texto preformatado","code_text":"texto preformatado cun sangrado de 4 espazos","paste_code_text":"escriba un título ou pégueo aquí","upload_title":"Cargar","upload_description":"introducir a descrición da carga aquí","olist_title":"Listaxe numerada","ulist_title":"Listaxe con símbolos","list_item":"Elemento da listaxe","toggle_direction":"Trocar dirección","help":"Axuda para a edición con Markdown","collapse":"minimizar o panel de composición","open":"abrir o panel de composición","abandon":"pechar o panel de composición e desbotar o borrador","enter_fullscreen":"abrir o panel de composición en pantalla completa","exit_fullscreen":"saír do panel de composición en pantalla completa","show_toolbar":"amosar a barra de ferramentas de composición","hide_toolbar":"agochar a barra de ferramentas de composición","modal_ok":"De acordo","modal_cancel":"Cancelar","cant_send_pm":"Sentímolo pero non pode enviar unha mensaxe a %{username}.","yourself_confirm":{"title":"Esqueceu engadir os destinatarios?","body":"Polo momento, esta mensaxe só a recibe vostede!"},"admin_options_title":"Configuración opcional do equipo para este tema","composer_actions":{"reply":"Responder","draft":"Borrador","edit":"Editar","reply_to_post":{"label":"Responder á publicación de %{postUsername}","desc":"Responder a unha publicación específica"},"reply_as_new_topic":{"label":"Responder como tema ligado","desc":"Crear un novo tema ligado a este tema","confirm":"Ten gardado un borrador do novo tema, que se sobrescribirá se crea un tema ligado a este."},"reply_as_new_group_message":{"label":"Responder como nova mensaxe de grupo"},"reply_as_private_message":{"label":"Nova mensaxe","desc":"Crear unha nova mensaxe privada"},"reply_to_topic":{"label":"Responder ao tema","desc":"Responder ao tema, non a ningunha publicación específica"},"toggle_whisper":{"label":"Trocar rumor","desc":"Os rumores son visíbeis unicamente para os membros do equipo"},"create_topic":{"label":"Novo tema"},"shared_draft":{"label":"Borrador compartido","desc":"Facer borrador dun tema que soamente será visíbel por usuarios admitidos"},"toggle_topic_bump":{"label":"Trocar a promoción do tema","desc":"Responder sen cambiar a data da última resposta"}},"reload":"Recargar","ignore":"Ignorar","details_title":"Resumo","details_text":"Este texto será agochado"},"notifications":{"tooltip":{"regular":{"one":"%{count} notificación pendente","other":"%{count} notificacións pendentes"},"message":{"one":"%{count} mensaxe pendente","other":"%{count} mensaxes pendentes"},"high_priority":{"one":"%{count} notificación de prioridade alta pendente","other":"%{count} notificacións de prioridade alta pendentes"}},"title":"notificacións das mencións ao seu @nome, respostas ás súas publicacións e temas, mensaxes, etc","none":"Non é posíbel cargar as notificacións neste intre.","empty":"Non se atoparon notificacións.","post_approved":"A súa publicación foi aprobada","reviewable_items":"elementos que requiren revisión","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} e %{count} outro\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} e %{count} outros\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"gustoulles %{count} das súas publicacións","other":"gustáronlles %{count} das súas publicacións"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e aceptou o seu convite","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e moveu %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Gañou «%{description}»","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNovo tema\u003c/span\u003e %{description}","membership_request_accepted":"Aceptouse a súa incorporación a «%{group_name}»","membership_request_consolidated":{"one":"%{count} solicitudes de adhesión abertas en «%{group_name}»","other":"%{count} solicitudes de adhesión abertas en «%{group_name}»"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - completado","group_message_summary":{"one":"%{count} mensaxe na caixa %{group_name}","other":"%{count} mensaxes na caixa %{group_name}"},"popup":{"mentioned":"%{username} mencionouno en \"%{topic}\" - %{site_title}","group_mentioned":"%{username} mencionouno en \"%{topic}\" - %{site_title}","quoted":"%{username} citouno en \"%{topic}\" - %{site_title}","replied":"%{username} respondeulle en \"%{topic}\" - %{site_title}","posted":"%{username} publicou en \"%{topic}\" - %{site_title}","private_message":"%{username} envioulle unha mensaxe privada sobre «%{topic}» - %{site_title}","linked":"%{username} ligou a súa publicación desde «%{topic}» - %{site_title}","watching_first_post":"%{username} creou un tema novo «%{topic}» - %{site_title}","confirm_title":"Notificacións activadas - %{site_title}","confirm_body":"Perfecto! As notificacións están activadas.","custom":"Notificación de %{username} en %{site_title}"},"titles":{"mentioned":"mencionado","replied":"nova resposta","quoted":"citado","edited":"editado","liked":"novo gústame","private_message":"nova mensaxe privada","invited_to_private_message":"convidado a unha mensaxe privada","invitee_accepted":"convite aceptado","posted":"nova publicación","moved_post":"publicación movida","linked":"ligado","bookmark_reminder":"recordatorio do marcador","bookmark_reminder_with_name":"recordatorio do marcador - %{name}","granted_badge":"insignia concedida","invited_to_topic":"convidado ao tema","group_mentioned":"grupo mencionado","group_message_summary":"novas mensaxes do grupo","watching_first_post":"novo tema","topic_reminder":"recordatorio do tema","liked_consolidated":"novos gústames","post_approved":"publicación aprobada","membership_request_consolidated":"novas solicitudes de incorporación","reaction":"nova reacción","votes_released":"O voto foi liberado"}},"upload_selector":{"uploading":"Cargando","select_file":"Seleccionar ficheiro","default_image_alt_text":"imaxe"},"search":{"sort_by":"Ordenar por","relevance":"Relevancia","latest_post":"Últimas publicacións","latest_topic":"Último tema","most_viewed":"Máis vistas","most_liked":"Con máis gústames","select_all":"Seleccionar todo","clear_all":"Borrar todo","too_short":"O seu termo de busca é curto de máis.","result_count":{"one":"\u003cspan\u003e%{count} resultado de\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} resultados de\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"buscar temas, publicacións, usuarios ou categorías","full_page_title":"Buscar","no_results":"Non se atoparon resultados.","no_more_results":"Non se atoparon máis resultados.","post_format":"#%{post_number} de %{username}","results_page":"Buscar resultados de «%{term}»","more_results":"Hai máis resultados. Restrinxa os criterios da busca.","cant_find":"Non atopa o que busca?","start_new_topic":"Se cadra quere comezar un novo tema?","or_search_google":"Ou probe a buscar con Google:","search_google":"Probe a buscar con Google:","search_google_button":"Google","search_button":"Buscar","categories":"Categorías","tags":"Etiquetas","type":{"users":"Usuarios","categories":"Categorías"},"context":{"user":"Buscar publicacións de @%{username}","category":"Buscar na categoría #%{category}","tag":"Buscar na etiqueta #%{tag}","topic":"Buscar neste tema","private_messages":"Buscar mensaxes"},"advanced":{"posted_by":{"label":"Publicado por"},"in_category":{"label":"Categorizado"},"in_group":{"label":"No grupo"},"with_badge":{"label":"Con insignia"},"with_tags":{"label":"Etiquetado"},"filters":{"label":"Devolver só temas/publicacións...","title":"Coincidencia só no título","likes":"Gustoume","posted":"Publiquei","created":"Creei","watching":"Estou observando","tracking":"Estou seguindo","private":"Nas miñas mensaxes","bookmarks":"Marquei","first":"son a primeirísima publicación","pinned":"están fixadas","seen":"Lin","unseen":"Non lin","wiki":"son wiki","images":"incluír imaxe(s)","all_tags":"Todas as etiquetas anteriores"},"statuses":{"label":"Onde os temas","open":"están abertos","closed":"están pechados","public":"son públicos","archived":"están arquivados","noreplies":"non teñen respostas","single_user":"contén un único usuario"},"post":{"count":{"label":"Publicacións"},"min":{"placeholder":"mínimo"},"max":{"placeholder":"máximo"},"time":{"label":"Publicado","before":"antes","after":"despois"}},"views":{"label":"Visualizacións"},"min_views":{"placeholder":"mínimo"},"max_views":{"placeholder":"máximo"}}},"new_item":"novo","go_back":"volver","not_logged_in_user":"páxina do usuario cun resumo das actividades e preferencias actuais","current_user":"ir á súa páxina do usuario","view_all":"ver todas %{tab}","topics":{"new_messages_marker":"última visita","bulk":{"select_all":"Seleccionar todo","clear_all":"Borrar todo","unlist_topics":"Retirar temas da listaxe","relist_topics":"Refacer a listaxe de temas","reset_read":"Restabelecer os lidos","delete":"Eliminar temas","dismiss":"Desbotar","dismiss_read":"Desbotar os non lidos","dismiss_button":"Desbotar…","dismiss_tooltip":"Desbotar só as publicacións novas ou deixar de seguir temas","also_dismiss_topics":"Deter o seguimento destes temas para que non se me amosen como non lidos","dismiss_new":"Desbotar novas","toggle":"cambiar a selección en bloque dos temas","actions":"Accións en bloque","close_topics":"Pechar temas","archive_topics":"Arquivar temas","move_messages_to_inbox":"Mover á caixa de entrada","change_notification_level":"Cambiar o nivel de notificacións","choose_new_category":"Seleccionar a nova categoría dos temas:","selected":{"one":"Seleccionou \u003cb\u003e%{count}\u003c/b\u003e tema.","other":"Seleccionou \u003cb\u003e%{count}\u003c/b\u003e temas."},"change_tags":"Substituír etiquetas","append_tags":"Anexar etiquetas","choose_new_tags":"Seleccione novas etiquetas para estes temas:","choose_append_tags":"Seleccione novas etiquetas para anexar a estes temas:","changed_tags":"As etiquetas deses temas cambiaron.","remove_tags":"Retirar etiquetas","confirm_remove_tags":{"one":"Retiraranse todas as etiquetas deste tema. Está seguro?","other":"Retiraranse todas as etiquetas destes \u003cb\u003e%{count}\u003c/b\u003e temas. Está seguro?"},"progress":{"one":"Progreso: \u003cstrong\u003e%{count}\u003c/strong\u003e tema","other":"Progreso: \u003cstrong\u003e%{count}\u003c/strong\u003e temas"}},"none":{"unread":"Non ten temas sen ler.","new":"Non ten novos temas.","read":"Aínda non leu ningún tema.","posted":"Aínda non publicou en ningún tema.","latest":"Están todos vostedes atrapados!","bookmarks":"Aínda non marcou este tema.","category":"Non hai temas en %{category}.","top":"Non hai temas destacados.","educate":{"new":"\u003cp\u003eAquí aparecen os seus temas novos. De xeito predeterminado, os temas considéranse novos e amosarán un indicador de \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003enovo\u003c/span\u003e se se crearon nos últimos dous días.\u003c/p\u003e\u003cp\u003eVexa as súas \u003ca href=\"%{userPrefsUrl}\"\u003epreferencias\u003c/a\u003e para cambiar este axuste.\u003c/p\u003e","unread":"\u003cp\u003eOs seus temas pendentes aparecen aquí.\u003c/p\u003e\u003cp\u003eDe xeito predeterminado, os temas considéranse pendentes e amosarase o número dos non lidos. \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e se vostede:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreou o tema\u003c/li\u003e\u003cli\u003eRespondeu ao tema\u003c/li\u003e\u003cli\u003eLeu o tema durante máis de catro minutos\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOu estabeleceu explicitamente o tema para ser observado ou seguido con 🔔 de cada tema.\u003c/p\u003e\u003cp\u003eVaia ás súas \u003ca href=\"%{userPrefsUrl}\"\u003epreferencias\u003c/a\u003e se quere cambiar isto.\u003c/p\u003e"}},"bottom":{"latest":"Non hai máis temas.","posted":"Non hai máis temas publicados.","read":"Non hai máis temas lidos.","new":"Non hai máis temas novos.","unread":"Non hai máis temas pendentes de lectura.","category":"Non hai máis temas en %{category}.","tag":"Non hai máis temas en %{tag}.","top":"Non hai máis temas destacados.","bookmarks":"Non hai máis temas marcados."}},"topic":{"filter_to":{"one":"%{count} publicación no tema","other":"%{count} publicacións no tema"},"create":"Novo tema","create_long":"Crear un novo tema","open_draft":"Abrir borrador","private_message":"Iniciar unha mensaxe","archive_message":{"help":"Mover mensaxes ao arquivo persoal","title":"Arquivo"},"move_to_inbox":{"title":"Mover á caixa de entrada","help":"Mover mensaxes á caixa de entrada"},"edit_message":{"help":"Editar a primeira publicación da mensaxe","title":"Editar"},"defer":{"help":"Marcar como non lido","title":"Adiar"},"list":"Temas","new":"novo tema","unread":"pendente","new_topics":{"one":"%{count} tema novo","other":"%{count} temas novos"},"unread_topics":{"one":"%{count} tema pendente","other":"%{count} temas pendentes"},"title":"Tema","invalid_access":{"title":"O tema é privado","description":"Desculpe pero non ten acceso a ese tema!","login_required":"Debe iniciar a sesión para ver este tema."},"server_error":{"title":"A carga do tema fallou","description":"Sentímolo pero non podemos cargar este tema, posibelmente debido a problemas de conexión. Ténteo de novo e se o problema continúa fáganolo saber."},"not_found":{"title":"Non foi posíbel atopar o tema","description":"Sentímolo pero non foi posíbel atopar este tema. Sería retirado por un moderador?"},"unread_posts":{"one":"ten %{count} publicación pendente de lectura neste tema","other":"ten %{count} publicacións pendentes de lectura neste tema"},"likes":{"one":"hai un gústame neste tema","other":"hai %{count} gústames neste tema"},"back_to_list":"Volver á listase de temas","options":"Opcións de temas","show_links":"amosar as ligazóns a este tema","read_more_in_category":"Quere ler máis? explore outros temas en %{catLink} ou %{latestLink}.","read_more":"Quere ler máis? %{catLink} ou %{latestLink}.","unread_indicator":"Ningún membro leu aínda a última publicación neste tema.","browse_all_categories":"Explorar todas as categorías","browse_all_tags":"Explorar todas as etiquetas","view_latest_topics":"ver os últimos temas","jump_reply_up":"ir a unha resposta anterior","jump_reply_down":"ir a unha resposta posterior","deleted":"Eliminouse o tema","slow_mode_update":{"title":"Modo lento","select":"Os usuarios só poden publicar neste tema unha vez cada:","description":"Para promover unha discusión reflexiva en discusións rápidas ou polémicas, os usuarios deben esperar antes de publicar de novo neste tema.","enable":"Activar","update":"Actualizar","remove":"Desactivar","hours":"Horas:","minutes":"Minutos:","seconds":"Segundos:","durations":{"10_minutes":"10 minutos","15_minutes":"15 minutos","30_minutes":"30 Minutos","45_minutes":"45 minutos","1_hour":"1 hora","2_hours":"2 Horas","4_hours":"4 horas","8_hours":"8 horas","12_hours":"12 horas","24_hours":"24 horas","custom":"Duración personalizada"}},"topic_status_update":{"title":"Temporizador do tema","save":"Estabelecer temporizador","num_of_hours":"Número de horas:","num_of_days":"Número de días:","remove":"Retirar temporizador","publish_to":"Publicar en:","when":"Cando:","time_frame_required":"Seleccione un marco temporal","min_duration":"A duración debe ser superior a 0","max_duration":"A duración debe de ser menor de 20 anos"},"auto_update_input":{"none":"Seleccione un marco temporal","now":"Agora","later_today":"Hoxe, máis tarde","tomorrow":"Mañá","later_this_week":"Máis tarde esta semana","this_weekend":"Esta fin de semana","next_week":"A vindeira semana","two_weeks":"Dúas semanas","next_month":"O vindeiro mes","two_months":"Dous meses","three_months":"Tres meses","four_months":"Catro meses","six_months":"Seis meses","one_year":"Un ano","forever":"Sempre","pick_date_and_time":"Escolla unha data e hora","set_based_on_last_post":"Peche baseado na última publicación"},"publish_to_category":{"title":"Programar publicación"},"temp_open":{"title":"Abrir temporalmente"},"temp_close":{"title":"Pechar temporalmente"},"auto_close":{"title":"Pechar automaticamente o tema","label":"Peche automático de tema tras:","error":"Introduza un valor correcto.","based_on_last_post":"Non pechar ata que a última publicación do tema teña cando menos esta antigüidade."},"auto_close_after_last_post":{"title":"Peche automático do tema despois da última publicación"},"auto_delete":{"title":"Eliminar automaticamente o tema"},"auto_bump":{"title":"Promover automaticamente o tema"},"reminder":{"title":"Lémbremo"},"auto_delete_replies":{"title":"Eliminar automaticamente respostas"},"status_update_notice":{"auto_open":"Este tema abrirase automaticamente en %{timeLeft}.","auto_close":"Este tema pechará automaticamente en %{timeLeft}.","auto_publish_to_category":"Este tema publicarase en \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e en %{timeLeft}.","auto_close_after_last_post":"Este tema pechará %{duration} despois da última resposta.","auto_delete":"Este tema eliminarase automaticamente en %{timeLeft}.","auto_bump":"Este tema promoverase automaticamente en %{timeLeft}.","auto_reminder":"Lembraráselle este tema en %{timeLeft}","auto_delete_replies":"As respostas a este tema eliminaranse automaticamente en %{duration}."},"auto_close_title":"Configuración do peche automático","auto_close_immediate":{"one":"A última publicación deste tema xa ten %{count} hora. O tema pecharase inmediatamente.","other":"A última publicación deste tema xa ten %{count} horas. O tema pecharase inmediatamente."},"auto_close_momentarily":{"one":"A última publicación deste tema xa ten %{count} hora. O tema pecharase axiña.","other":"A última publicación deste tema xa ten %{count} horas. O tema pecharase axiña."},"timeline":{"back":"Atrás","back_description":"Volver á última publicación pendente de lectura","replies_short":"%{current} / %{total}"},"progress":{"title":"progreso do tema","go_top":"principio","go_bottom":"final","go":"ir","jump_bottom":"saltar á última publicación","jump_prompt":"saltar a...","jump_prompt_of":{"one":"de %{count} publicación","other":"de %{count} publicacións"},"jump_prompt_long":"Saltar a...","jump_bottom_with_number":"ir á publicación %{post_number}","jump_prompt_to_date":"ata a data","jump_prompt_or":"ou","total":"publicacións totais","current":"publicación actual"},"notifications":{"title":"cambiar a frecuencia coa que recibe notificacións sobre este tema","reasons":{"mailing_list_mode":"Ten o modo de lista de correo electrónico activado, de modo que recibirá notificacións das respostas a este tema por correo.","3_10":"Recibirá notificacións porque ten en observación unha etiqueta neste tema.","3_6":"Recibirá notificacións porque ten en observación esta categoría.","3_5":"Recibirá notificacións porque comezou a ter en observación este tema automaticamente.","3_2":"Recibirá notificacións porque está vendo este tema.","3_1":"Recibirá notificacións por ser o creador deste tema.","3":"Recibirá notificacións porque está vendo este tema.","2_8":"Verá o número de novas respostas porque está a seguir esta categoría.","2_4":"Verá o número de novas respostas porque publicou unha resposta neste tema.","2_2":"Verá o número de novas respostas porque está a seguir este tema.","2":"Verá unha conta de novas respostas, porque ten axustado \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eler este tema\u003c/a\u003e.","1_2":"Notificarémosllo se alguén menciona o seu @nome ou lle responde.","1":"Notificarémosllo se alguén menciona o seu @nome ou lle responde.","0_7":"Está a ignorar todas as notificacións desta categoría.","0_2":"Está a ignorar todas as notificacións deste tema.","0":"Está a ignorar todas as notificacións deste tema."},"watching_pm":{"title":"En observación","description":"Recibirá notificacións de cada resposta a esta mensaxe e aparecerá o número de novas respostas."},"watching":{"title":"En observación","description":"Notificaránselle as respostas recibidas neste tema e amosaráselle o número de novas respostas."},"tracking_pm":{"title":"Seguimento","description":"Amosaráselle o número de novas respostas desta mensaxe. Notificaráselle as mencións ao seu @name ou cando alguén lle responda."},"tracking":{"title":"Seguimento","description":"Amosaráselle o número de novas respostas para este tema. Notificaráselle as mencións ao seu @name ou cando alguén lle responda."},"regular":{"title":"Normal","description":"Notificarémosllo se alguén menciona o seu @nome ou lle responde."},"regular_pm":{"title":"Normal","description":"Notificarémosllo se alguén menciona o seu @nome ou lle responde."},"muted_pm":{"title":"Silenciado","description":"Non recibirá ningunha notificación sobre esta mensaxe."},"muted":{"title":"Silenciado","description":"Non se lle notificará nada sobre este tema e non aparecerá no listado de últimos."}},"actions":{"title":"Accións","recover":"Recuperar tema","delete":"Eliminar tema","open":"Abrir tema","close":"Pechar tema","multi_select":"Seleccionar publicacións…","timed_update":"Estabelecer temporizador do tema...","pin":"Fixar tema…","unpin":"Desprender tema…","unarchive":"Desarquivar tema","archive":"Arquivar tema","invisible":"Retirar da listaxe","visible":"Engadir á listaxe","reset_read":"Restabelecer datos de lecturas","make_private":"Facer privada a mensaxe","reset_bump_date":"Restabelecer data de promoción"},"feature":{"pin":"Fixar o tema","unpin":"Desprender o tema","pin_globally":"Fixar o tema globalmente","remove_banner":"Retirar o tema do báner"},"reply":{"title":"Responder","help":"escribir unha resposta a este tema"},"share":{"title":"Compartir","extended_title":"Compartir unha ligazón","help":"compartir unha ligazón a este tema","invite_users":"Convidar"},"print":{"title":"Imprimir","help":"Abrir unha versión imprimíbel deste tema"},"flag_topic":{"title":"Sinalar","help":"sinalar privadamente este tema para revisalo ou enviar unha notificación privada sobre el","success_message":"Sinalou o tema correctamente."},"make_public":{"title":"Converter en tema público","choose_category":"Seleccione unha categoría para o tema público:"},"feature_topic":{"title":"Destacar este tema","pin":"Facer que este tema apareza primeiro da categoría %{categoryLink} ata","unpin":"Retirar este tema de primeiro da categoría %{categoryLink}.","unpin_until":"Retirar este tema de primeiro da %{categoryLink} ou agardar ata \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Os usuarios poden desprender o tema por si mesmos.","pin_validation":"Requírese unha data para fixar este tema.","not_pinned":"Non hai temas fixados en %{categoryLink}.","already_pinned":{"one":"Temas fixados en %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Temas fixados actualmente en %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Faga que este tema apareza no primeiro de todas as listaxes de temas ata","confirm_pin_globally":{"one":"Xa ten %{count} tema fixado globalmente. Demasiados temas fixados pode resultar abrumador para usuarios novos e anónimos. Confirma que quere fixar outro tema globalmente?","other":"Xa ten %{count} temas fixados globalmente. Demasiados temas fixados pode resultar abrumador para usuarios novos e anónimos. Confirma que quere fixar outro tema globalmente?"},"unpin_globally":"Eliminar este tema que está de primeiro de todas as listaxes de temas.","unpin_globally_until":"Eliminar este tema que está de primeiro de todas as listaxes de temas ou agardar ata \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Os usuarios poden desprender o tema por si mesmos.","not_pinned_globally":"Non hai temas fixados globalmente.","already_pinned_globally":{"one":"Temas fixados globalmente neste intre: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Temas fixados globalmente neste intre: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Facer deste tema un báner que apareza na banda superior de todas as páxinas.","remove_banner":"Retirar o báner que aparece na banda superior de todas as páxinas.","banner_note":"Os usuarios poden desbotar un báner se o pechan. Só pode haber un tema que sexa báner ao mesmo tempo.","no_banner_exists":"Non hai tema para o báner.","banner_exists":"Agora \u003cstrong class='badge badge-notification unread'\u003ehai\u003c/strong\u003e un tema para o báner."},"inviting":"Convidando...","automatically_add_to_groups":"Este convite tamén inclúe o acceso a estes grupos:","invite_private":{"title":"Mensaxe para convidar","email_or_username":"Nome do usuario ou correo-e do convidado","email_or_username_placeholder":"correo electrónico e nome de usuario","action":"Convidar","success":"Convidamos a ese usuario a participar con esta mensaxe.","success_group":"Convidamos a este grupo a participar con esta mensaxe.","error":"Sentímolo pero houbo un erro convidando ese usuario.","not_allowed":"Desculpe pero ese usuario non pode ser convidado.","group_name":"nome do grupo"},"controls":"Controis do tema","invite_reply":{"title":"Convidar","username_placeholder":"nome de usuario","action":"Enviar convite","help":"convidar a outros a este tema por correo electrónico ou notificacións","to_forum":"Enviaremos un correo electrónico permitindo ao seu amigo que se una inmediatamente ao premer nunha ligazón. Non require iniciar sesión.","discourse_connect_enabled":"Escriba o nome de usuario da persoa á que quere convidar neste tema.","to_topic_blank":"Introduza o nome do usuario ou o correo electrónico da persoa que desexa convidar a este tema.","to_topic_email":"Introduciu un enderezo de correo. Enviarémoslle un convite que lles permitirá aos seus amigos responder inmediatamente a este tema.","to_topic_username":"Introduciu un nome de usuario. Enviarémoslle unha notificación cunha ligazón convidándoo a este tema.","to_username":"Introduza o nome do usuario da persoa que desexa convidar. Enviarémoslle unha notificación cunha ligazón convidándoa a este tema.","email_placeholder":"name@example.com","success_email":"Enviamos un convite a \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. Notificarémoslle cando utilice a invitación. Mire a lapela de convites na súa páxina de usuario para facer un seguimento das súas invitacións.","success_username":"Convidamos este usuario a participar neste tema.","error":"Sentímolo, non foi posíbel convidar a esta persoa. Quizais xa foi convidada? (os convites teñen un límite)","success_existing_email":"Xa existe un usuario co correo electrónico \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. Convidamos este usuario a participar neste tema."},"login_reply":"Inicie sesión para responder","filters":{"n_posts":{"one":"Unha publicación","other":"%{count} publicacións"},"cancel":"Eliminar filtro"},"move_to":{"title":"Mover a","action":"mover a","error":"Produciuse un erro ao mover as publicacións."},"split_topic":{"title":"Mover ao tema novo","action":"mover ao tema novo","topic_name":"Título do tema novo","radio_label":"Novo tema","error":"Produciuse un erro movendo as publicacións ao novo tema.","instructions":{"one":"Vai crear un novo tema e enchelo coa publicación que seleccionou.","other":"Vai crear un novo tema e enchelo coas \u003cb\u003e%{count}\u003c/b\u003e publicacións que seleccionou."}},"merge_topic":{"title":"Mover a un tema existente","action":"mover a un tema existente","error":"Produciuse un erro movendo publicacións nese tema.","radio_label":"Tema existente","instructions":{"one":"Seleccione o tema ao que quere mover esta publicación.","other":"Seleccione o tema ao que quere mover estas \u003cb\u003e%{count}\u003c/b\u003e publicacións."}},"move_to_new_message":{"title":"Mover a Nova mensaxe","action":"mover a nova mensaxe","message_title":"Título da nova mensaxe","radio_label":"Nova mensaxe","participants":"Participantes","instructions":{"one":"Vai crear unha nova mensaxe e enchela coa publicación que seleccionou.","other":"Vai crear unha nova mensaxe e enchela coas \u003cb\u003e%{count}\u003c/b\u003e publicacións que seleccionou."}},"move_to_existing_message":{"title":"Mover a Mensaxe existente","action":"mover a mensaxe existente","radio_label":"Mensaxe existente","participants":"Participantes","instructions":{"one":"Seleccione a mensaxe á que quere mover esta publicación.","other":"Seleccione a mensaxe á que quere mover estas \u003cb\u003e%{count}\u003c/b\u003e publicacións."}},"merge_posts":{"title":"Combinar publicacións seleccionadas","action":"combinar publicacións seleccionadas","error":"Produciuse un erro ao combinar as publicacións seleccionadas."},"publish_page":{"title":"Publicación da páxina","publish":"Publicar","description":"Cando un tema se publica como páxina, pódese compartir o seu URL e será presentado cun estilo personalizado.","slug":"Localizador abreviado","public":"Público","public_description":"Os demais poden ver esta páxina aínda que o tema asociado sexa privado.","publish_url":"A súa páxina publicouse en:","topic_published":"O seu tema publicouse en:","preview_url":"A súa páxina publicarase en:","invalid_slug":"Sentímolo pero non pode publicar esta páxina.","unpublish":"Despublicar","unpublished":"Despublicouse a páxina e xa non se pode acceder a ela.","publishing_settings":"Axustes da publicación"},"change_owner":{"title":"Cambiar propietario","action":"cambiar propiedade","error":"Produciuse un erro cambiando a propiedade das publicacións.","placeholder":"nome do usuario do novo propietario","instructions":{"one":"Escolla un novo propietario para a publicación de \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Escolla un novo propietario para as %{count} publicacións de \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Seleccione un novo propietario para a publicación","other":"Seleccione un novo propietario para as %{count} publicacións"}},"change_timestamp":{"title":"Cambiar o selo de tempo...","action":"cambiar a marca data/hora","invalid_timestamp":"A marca data/hora non pode ser no futuro.","error":"Produciuse un erro cambiando a marca data/hora do tema.","instructions":"Seleccione a marca data/hora para o tema. As publicacións do tema actualizaranse para ter a mesma diferenza de tempo."},"multi_select":{"select":"seleccionar","selected":"seleccionados (%{count})","select_post":{"label":"seleccionar","title":"Engadir publicación á selección"},"selected_post":{"label":"seleccionado","title":"Prema para eliminar a publicación da selección"},"select_replies":{"label":"seleccionar +respostas","title":"Engadir a publicación e todas as respostas asociadas á selección"},"select_below":{"label":"seleccione +seguintes","title":"Engadir publicación e todas as posteriores á selección"},"delete":"eliminar seleccionados","cancel":"cancelar a selección","select_all":"seleccionar todo","deselect_all":"deseleccionar todo","description":{"one":"Seleccionou \u003cb\u003e%{count}\u003c/b\u003e publicación.","other":"Seleccionou \u003cb\u003e%{count}\u003c/b\u003e publicacións."}}},"post":{"quote_reply":"Cita","quote_edit":"Editar","quote_share":"Compartir","edit_reason":"Razón: ","post_number":"publicación %{number}","ignored":"Contido ignorado","wiki_last_edited_on":"a última edición do wiki foi o","last_edited_on":"última edición da publicación","reply_as_new_topic":"Responder como tema ligado","reply_as_new_private_message":"Responderlles como nova mensaxe aos mesmos destinatarios","continue_discussion":"Continuar a discusión de %{postLink}:","follow_quote":"ir á publicación citada","show_full":"Amosar a publicación completa","show_hidden":"Ver o contido ignorado.","collapse":"reducir","expand_collapse":"ampliar/reducir","locked":"un membro do equipo bloqueou a edición nesta publicación","gap":{"one":"ver unha resposta oculta","other":"ver %{count} respostas ocultas"},"notice":{"new_user":"É a primeira publicación de %{user}. Deámoslle a benvida á nosa comunidade!","returning_user":"Non viamos a %{user} por aquí desde hai un tempo. A súa última publicación foi %{time}."},"unread":"Publicación pendente de lectura","has_replies":{"one":"%{count} Resposta","other":"%{count} Respostas"},"has_replies_count":"%{count}","unknown_user":"(usuario descoñecido/eliminado)","has_likes_title":{"one":"A %{count} persoa gustoulle esta publicación","other":"A %{count} persoas gustoulles esta publicación"},"has_likes_title_only_you":"gustouche esta publicación","has_likes_title_you":{"one":"vostede e %{count} máis apreciaron esta publicación","other":"vostede %{count} máis apreciaron esta publicación"},"filtered_replies_hint":{"one":"Ver esta publicación e a súa resposta","other":"Ver esta publicación e as súas %{count} respostas"},"filtered_replies_viewing":{"one":"Vendo %{count} resposta a","other":"Vendo %{count} respostas a"},"in_reply_to":"Cargar a publicación pai","view_all_posts":"Ver todas as publicacións","errors":{"create":"Sentímolo pero produciuse un erro creando a publicación. Ténteo de novo.","edit":"Sentímolo pero produciuse un erro editando a publicación. Ténteo de novo.","upload":"Sentímolo pero produciuse un erro ao cargar ese ficheiro. Ténteo de novo.","file_too_large":"Sentímolo, pero o ficheiro é demasiado grande (o tamaño máximo é de %{max_size_kb}kb). Por que non proba a cargalo nun servizo da nube e pega aquí a ligazón?","too_many_uploads":"Sentímolo pero só pode cargar un ficheiro de cada vez.","too_many_dragged_and_dropped_files":{"one":"Soamente pode cargar %{count} ficheiro de cada vez.","other":"Soamente pode cargar %{count} ficheiros de cada vez."},"upload_not_authorized":"Sentímolo, o ficheiro que tenta cargar non está autorizado (extensións permitidas: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Sentímolo pero os novos usuarios non poden cargar imaxes.","attachment_upload_not_allowed_for_new_user":"Sentímolo pero os novos usuarios non poden cargar anexos.","attachment_download_requires_login":"Sentímolo pero debe iniciar sesión para descargar anexos."},"cancel_composer":{"confirm":"Que quere facer coa súa publicación?","discard":"Desbotar","save_draft":"Gardar borrador para máis tarde","keep_editing":"Seguir editando"},"via_email":"esta publicación chegou por correo","via_auto_generated_email":"esta publicación chegou dun correo electrónico xerado automaticamente","whisper":"este é un rumor privado para moderadores","wiki":{"about":"esta publicación é un wiki"},"few_likes_left":"Grazas por repartir cariño! Só lle quedan algúns gústame por hoxe.","controls":{"reply":"escribir unha resposta a esta publicación","like":"gústame esta publicación","has_liked":"gustoulle esta publicación","read_indicator":"membros que leron esta publicación","undo_like":"desfacer o gústame","edit":"editar a publicación","edit_action":"Editar","edit_anonymous":"Sentímolo pero debe iniciar sesión para editar esta publicación.","flag":"sinalar privadamente esta publicación ou enviar unha notificación privada sobre ela","delete":"eliminar esta publicación","undelete":"recuperar esta publicación","share":"compartir ligazón a esta publicación","more":"Máis","delete_replies":{"confirm":"Confirma a eliminación das respostas desta publicación?","direct_replies":{"one":"Si, e %{count} resposta directa","other":"Si, e %{count} respostas directas"},"all_replies":{"one":"Si, e %{count} resposta","other":"Si, e as %{count} respostas"},"just_the_post":"Non, só esta publicación"},"admin":"accións admin. nas publicacións","wiki":"Crear wiki","unwiki":"Eliminar wiki","convert_to_moderator":"Engadir cor do equipo","revert_to_regular":"Eliminar cor do equipo","rebake":"Reconstruír HTML","publish_page":"Publicación da páxina","unhide":"Non agochar","lock_post":"Bloquear publicación","lock_post_description":"evitar que o autor edite esta publicación","unlock_post":"Desbloquear a publicación","unlock_post_description":"permitir que o autor edite esta publicación","delete_topic_disallowed_modal":"Non ten permiso para eliminar este tema. Se desexa eliminalo, emita unha alerta para que o revise o moderador e xustifique a causa da alerta.","delete_topic_disallowed":"non ten permiso para eliminar este tema","delete_topic_confirm_modal":{"one":"Este tema ten agora máis de %{count} visualización e pode ser un destino de busca popular. Confirma que quere eliminar este tema por completo, en vez de editalo para melloralo?","other":"Este tema ten agora máis de %{count} visualizacións e pode ser un destino de busca popular. Confirma que quere eliminar este tema por completo, en vez de editalo para melloralo?"},"delete_topic_confirm_modal_yes":"Si, eliminar este tema","delete_topic_confirm_modal_no":"Non, manter este tema","delete_topic_error":"Produciuse un erro ao eliminar este tema","delete_topic":"eliminar tema","delete_post_notice":"Eliminar o aviso do equipo","remove_timer":"retirar o temporizador","edit_timer":"editar temporizador"},"actions":{"people":{"like":{"one":"gustoume isto","other":"gustáronme estes"},"read":{"one":"leu isto","other":"leron isto"},"like_capped":{"one":"e a %{count} máis gustoulle isto","other":"e a %{count} máis gustoulles isto"},"read_capped":{"one":"e %{count} máis leu isto","other":"e %{count} máis leron isto"}},"by_you":{"off_topic":"Informou disto como non relacionado","spam":"Sinalou isto como lixo","inappropriate":"Sinalou isto como inapropiado","notify_moderators":"Sinalou isto para moderación","notify_user":"Enviou unha mensaxe a este usuario"}},"delete":{"confirm":{"one":"Confirma a eliminación desta publicación?","other":"Confirma a eliminación destas %{count} publicacións?"}},"merge":{"confirm":{"one":"Confirma a combinación desas publicacións?","other":"Confirma a combinación destas %{count} publicacións?"}},"revisions":{"controls":{"first":"Primeira revisión","previous":"Revisión anterior","next":"Revisión seguinte","last":"Última revisión","hide":"Agochar a revisión","show":"Amosar revisión","revert":"Volver á revisión %{revision}","edit_wiki":"Editar wiki","edit_post":"Editar publicación","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Amosar o resultado coas adicións e eliminacións inseridas","button":"HTML"},"side_by_side":{"title":"Amosar o resultado coas diferenzas comparadas","button":"HTML"},"side_by_side_markdown":{"title":"Amosar a fonte crúa coas diferenzas comparadas","button":"En bruto"}}},"raw_email":{"displays":{"raw":{"title":"Amosar o correo electrónico en bruto","button":"En bruto"},"text_part":{"title":"Amosar a parte de texto do correo electrónico","button":"Texto"},"html_part":{"title":"Amosar a parte en HTML do correo electrónico","button":"HTML"}}},"bookmarks":{"create":"Crear marcador","edit":"Editar marcador","created":"Creado","updated":"Actualizado","name":"Nome","name_placeholder":"Para que serve este marcador?","set_reminder":"Lémbreme","options":"Opcións","actions":{"delete_bookmark":{"name":"Eliminar marcador","description":"Elimina o marcador do seu perfil e deteña todos os recordatorios asociados"},"edit_bookmark":{"name":"Editar marcador","description":"Editar o nome do marcador ou cambiar a data e hora do recordatorio"},"pin_bookmark":{"name":"Fixar o marcador","description":"Fixar o marcador. Isto fará que apareza na parte superior da lista de marcadores."},"unpin_bookmark":{"name":"Desprender o marcador","description":"Desprender o marcador. Isto fará que xa non apareza na parte superior da súa lista de marcadores."}}},"filtered_replies":{"viewing_posts_by":"Vendo %{post_count} publicacións de","viewing_subset":"Algunhas respostas están repregadas","viewing_summary":"Vendo un resumo deste tema","post_number":"%{username}, publicación #%{post_number}","show_all":"Amosar todas"}},"category":{"none":"(sen categoría)","all":"Todas as categorías","choose":"categoría\u0026hellip;","edit":"Editar","edit_dialog_title":"Editar: %{categoryName}","view":"Ver os temas na categoría","back":"Volver á categoría","general":"Xeral","settings":"Configuración","topic_template":"Modelo para o tema","tags":"Etiquetas","tags_allowed_tags":"Restrinxir estas etiquetas a esta categoría:","tags_allowed_tag_groups":"Restrinxir estes grupos de etiquetas a esta categoría:","tags_placeholder":"lista de etiquetas permitidas (opcional)","tags_tab_description":"As etiquetas e os grupos de etiquetas anteriores só estarán dispoñíbeis nesta categoría e outras que as inclúan. Non poderán usarse noutras categorías.","tag_groups_placeholder":"lista de grupos de etiquetas permitidos (opcional)","manage_tag_groups_link":"Xestionar grupos de etiquetas","allow_global_tags_label":"Permitir tamén outras etiquetas","tag_group_selector_placeholder":"Grupo de etiquetas (opcional)","required_tag_group_description":"Requirir que os novos temas teñan etiquetas dun grupo de etiquetas:","min_tags_from_required_group_label":"Número de etiquetas:","required_tag_group_label":"Grupo de etiquetas:","topic_featured_link_allowed":"Permitir ligazóns de actualidade nesta categoría","delete":"Eliminar categoría","create":"Nova categoría","create_long":"Crear unha nova categoría","save":"Gardar categoría","slug":"URL compacto da categoría","slug_placeholder":"Inserir guións entre palabras para o url (opcional)","creation_error":"Produciuse un erro durante a creación desta categoría.","save_error":"Produciuse un erro gardando a categoría.","name":"Nome da categoría","description":"Descrición","logo":"Logotipo da categoría","background_image":"Imaxe do fondo da categoría","badge_colors":"Cores das insignias","background_color":"Cor do fondo","foreground_color":"Cor do primeiro plano","name_placeholder":"Dúas palabras como máximo","color_placeholder":"Calquera cor web","delete_confirm":"Confirma a eliminación desta categoría?","delete_error":"Produciuse un erro elimando esta categoría.","list":"Listar categorías","no_description":"Engada unha descrición a esta categoría.","change_in_category_topic":"Editar a descrición","already_used":"Esta cor usouna outra categoría","security":"Seguranza","security_add_group":"Engadir grupo","permissions":{"group":"Grupo","see":"Ver","reply":"Responder","create":"Crear","no_groups_selected":"Non se lle concedeu acceso a ningún grupo; esta categoría só será visíbel para o equipo.","everyone_has_access":"Esta categoría é pública, todos poden ver, responder e crear publicacións. Para restrinxir os permisos, retire un ou máis dos permisos concedidos ao grupo «todos».","toggle_reply":"Trocar permiso de resposta","toggle_full":"Trocar permiso para crear","inherited":"Este permiso hérdase do de «todos»"},"special_warning":"Aviso: esta categoría ten axustes predeterminados e as opcións de seguranza non se poden modificar. Se non quere usala, elimínea no canto de reciclala.","uncategorized_security_warning":"Esta categoría é especial. Enténdese como unha área de espera para aqueles temas que non teñen categoría. Non pode ter axustes de seguranza.","uncategorized_general_warning":"Esta categoría é especial. Úsase como categoría predeterminada para os novos temas que non teñen unha categoría seleccionada. Se non quere isto e prefire forzar a selección de categorías, \u003ca href=\"%{settingLink}\"\u003edesactive aquí o axuste\u003c/a\u003e. Se quere cambiar o nome ou a descrición, vai a \u003ca href=\"%{customizeLink}\"\u003ePersonalizar / Contido de texto\u003c/a\u003e.","pending_permission_change_alert":"Non engadiu %{group} nesta categoría; prema neste botón para engadilos.","images":"Imaxes","email_in":"Personalizar enderezos de mensaxes de correo entrantes:","email_in_allow_strangers":"Aceptar correo de usuarios anónimos sen contas","email_in_disabled":"A publicación de novos temas vía correo está desactivada na configuración do sitio. Para activala, ","email_in_disabled_click":"activar o axuste «correo de entrada».","mailinglist_mirror":"A categoría replica unha lista de correo","show_subcategory_list":"Amosar a lista de subcategorías por riba dos temas desta categoría.","read_only_banner":"Texto do báner cando o usuario non poida crear un tema nesta categoría:","num_featured_topics":"Número de temas amosados na páxina de categorías:","subcategory_num_featured_topics":"Número de temas de actualidade na páxina da categoría primaria:","all_topics_wiki":"Fai novas publicacións de wiki de modo predeterminado","subcategory_list_style":"Estilo da listaxe de subcategorías:","sort_order":"Ordenar listaxe de temas por:","default_view":"Listaxe de temas predeterminada:","default_top_period":"Período predeterminado como importante:","default_list_filter":"Filtro de listaxe predeterminado:","allow_badges_label":"Permitir adxudicar insignias nesta categoría","edit_permissions":"Editar permisos","reviewable_by_group":"Ademais do equipo, o contido desta categoría tamén pode ser revisado por:","review_group_name":"nome do grupo","require_topic_approval":"Require a aprobación de todos os temas novos polo moderador","require_reply_approval":"Require a aprobación de todas as respostas novas polo moderador","this_year":"este ano","position":"Posición na páxina de categorías:","default_position":"Posición predeterminada","position_disabled":"As categorías presentaranse en orde de actividade. Para controlar a orde das categorías nas listaxes, ","position_disabled_click":"activar o axuste «posición das categorías fixadas».","minimum_required_tags":"Número mínimo de etiquetas requiridas nun tema:","parent":"Categoría primaria","num_auto_bump_daily":"Número de temas abertos que se promoven automaticamente cada día:","navigate_to_first_post_after_read":"Ir á primeira publicación despois de ler os temas","notifications":{"watching":{"title":"Ver","description":"Verá automaticamente todos os temas destas categorías. Recibirá notificacións de cada nova publicación en cada tema e aparecerá o número de novas respostas."},"watching_first_post":{"title":"Observando a publicación inicial","description":"Recibirá notificacións dos novos temas nesta categoría pero non das respostas."},"tracking":{"title":"Seguimento","description":"Seguirá automaticamente todos os temas destas categorías. Recibirá notificacións das mencións do seu @nome e das respostas que reciba e aparecerá o número de novas respostas."},"regular":{"title":"Normal","description":"Notificarémosllo se alguén menciona o seu @nome ou lle responde."},"muted":{"title":"Silenciado","description":"Non se lle notificarán novos temas nestas categorías e non aparecerán nos Últimos."}},"search_priority":{"label":"Prioridade da busca","options":{"normal":"Normal","ignore":"Ignorar","very_low":"Moi baixa","low":"Baixa","high":"Alta","very_high":"Moi alta"}},"sort_options":{"default":"predeterminado","likes":"Gústames","op_likes":"Gústames da publicación orixinal","views":"Vistas","posts":"Publicacións","activity":"Actividade","posters":"Autores","category":"Categoría","created":"Creado"},"sort_ascending":"Ascendente","sort_descending":"Descendente","subcategory_list_styles":{"rows":"Filas","rows_with_featured_topics":"Liñas con temas de actualidade","boxes":"Caixas","boxes_with_featured_topics":"Caixas con temas de actualidade"},"settings_sections":{"general":"Xeral","moderation":"Moderación","appearance":"Aparencia","email":"Correo electrónico"},"list_filters":{"all":"todos os temas","none":"sen subcategorías"},"colors_disabled":"Non pode seleccionar cores porque ten un estilo de categoría con ningún."},"flagging":{"title":"Grazas por axudar a manter cívica a nosa comunidade!","action":"Sinalar a publicación","take_action":"Intervir...","take_action_options":{"default":{"title":"Intervir","details":"Acadar o límite da alerta inmediatamente e non agardar por máis alertas da comunidade"},"suspend":{"title":"Suspender o usuario","details":"Acadar o límite da alerta e suspender o usuario"},"silence":{"title":"Silenciar o usuario","details":"Acadar o límite da alerta e silenciar o usuario"}},"notify_action":"Mensaxe","official_warning":"Aviso oficial","delete_spammer":"Eliminar remitente de lixo","flag_for_review":"Cola para revisión","yes_delete_spammer":"Si, eliminar o remitente de lixo","ip_address_missing":"(N/D)","hidden_email_address":"(agochado)","submit_tooltip":"Enviar a alerta privada","take_action_tooltip":"Acadar o limiar de alertas inmediatamente no canto de agardar por máis alertas da comunidade","cant":"Sentímolo pero non pode sinalar esta publicación neste intre.","notify_staff":"Notificarllo ao equipo privadamente","formatted_name":{"off_topic":"Non está relacionado","inappropriate":"É inapropiado","spam":"É lixo"},"custom_placeholder_notify_user":"Sexa específico, construtivo e sempre amábel.","custom_placeholder_notify_moderators":"Especifíquenos o que lle preocupa e proporciónenos ligazóns relevantes e exemplos cando sexa posíbel.","custom_message":{"at_least":{"one":"escriba como mínimo %{count} carácter","other":"escriba como mínimo %{count} caracteres"},"more":{"one":"Falta %{count} para...","other":"Falta %{count} para..."},"left":{"one":"Queda %{count}","other":"Quedan %{count}"}}},"flagging_topic":{"title":"Grazas por axudar a manter cívica a nosa comunidade!","action":"Sinalar o tema","notify_action":"Mensaxe"},"topic_map":{"title":"Resumo do tema","participants_title":"Autores frecuentes","links_title":"Ligazóns populares","links_shown":"amosar máis ligazóns...","clicks":{"one":"%{count} clic","other":"%{count} clics"}},"post_links":{"about":"despregar máis ligazóns para esta publicación","title":{"one":"%{count} máis","other":"%{count} máis"}},"topic_statuses":{"warning":{"help":"Este é un aviso oficial."},"bookmarked":{"help":"Marcou este tema"},"locked":{"help":"Este tema está pechado, xa non acepta respostas"},"archived":{"help":"Este tema está arquivado; está conxelado e non se pode cambiar"},"locked_and_archived":{"help":"Este tema está pechado e arquivado; xa non acepta novas respostas e non se pode cambiar"},"unpinned":{"title":"Desprendido","help":"Este tema está desprendido para vostede; presentarase na orde normal"},"pinned_globally":{"title":"Fixado globalmente","help":"Este tema está fixado globalmente; presentarase na banda superior dos máis recentes e na súa categoría"},"pinned":{"title":"Fixado","help":"Este tema está fixado globalmente; presentarase na banda superior da súa categoría"},"unlisted":{"help":"Este tema non está listado. Non se presentará nas listas de temas e só estará accesíbel vía ligazón directa"},"personal_message":{"title":"Este tema é unha mensaxe privada","help":"Este tema é unha mensaxe privada"}},"posts":"Publicacións","original_post":"Publicación orixinal","views":"Vistas","views_lowercase":{"one":"vista","other":"vistas"},"replies":"Respostas","views_long":{"one":"este tema visitouse %{count} vez","other":"este tema visitouse %{number} veces"},"activity":"Actividade","likes":"Gústames","likes_lowercase":{"one":"gústame","other":"gústames"},"users":"Usuarios","users_lowercase":{"one":"usuario","other":"usuarios"},"category_title":"Categoría","changed_by":"de %{author}","raw_email":{"title":"Correo entrante","not_available":"Non dispoñíbel!"},"categories_list":"Lista de categorías","filters":{"with_topics":"%{filter} temas","with_category":"Temas de %{filter} %{category}","latest":{"title":"Últimos","title_with_count":{"one":"Último (%{count})","other":"(%{count}) últimos"},"help":"temas con publicacións recentes"},"read":{"title":"Lidos","help":"temas que leu, partindo da última lectura"},"categories":{"title":"Categorías","title_in":"Categoría - %{categoryName}","help":"todos os temas agrupados por categoría"},"unread":{"title":"Pendentes de lectura","title_with_count":{"one":"(%{count}) pendente de ler","other":"(%{count}) pendentes de ler"},"help":"temas con publicacións pendente de lectura que está observando ou seguindo","lower_title_with_count":{"one":"%{count} pendente de lectura","other":"%{count} pendentes de lectura"}},"new":{"lower_title_with_count":{"one":"%{count} novo","other":"%{count} novos"},"lower_title":"novo","title":"Novo","title_with_count":{"one":"(%{count}) novo","other":"(%{count}) novos"},"help":"temas creados nos últimos días"},"posted":{"title":"As miñas publicacións","help":"temas nos que publicou"},"bookmarks":{"title":"Marcadores","help":"temas que marcou"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"últimos temas na categoría %{categoryName}"},"top":{"title":"Destacados","help":"os temas máis activos no último ano, mes, semana ou día","all":{"title":"Desde o principio"},"yearly":{"title":"Anual"},"quarterly":{"title":"Trimestral"},"monthly":{"title":"Mensual"},"weekly":{"title":"Semanal"},"daily":{"title":"Diario"},"all_time":"Desde o principio","this_year":"Ano","this_quarter":"Trimestre","this_month":"Mes","this_week":"Semana","today":"Hoxe","other_periods":"ver arriba:"}},"browser_update":"Desafortunadamente, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003e o seu navegador é demasiado vello para traballar neste sitio\u003c/a\u003e. Por favor, \u003ca href=\"https://browsehappy.com\"\u003eactualice o seu navegador\u003c/a\u003e para ver contido enriquecido, iniciar sesión e responder.","permission_types":{"full":"Crear / Responder / Ver","create_post":"Responder / Ver","readonly":"Ver"},"lightbox":{"download":"descargar","previous":"Anterior (tecla de frecha cara á esquerda)","next":"Seguinte (tecla de frecha cara á dereita)","counter":"%curr% de %total%","close":"Pechar (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eO contido\u003c/a\u003e non puido cargarse.","image_load_error":"\u003ca href=\"%url%\"\u003eA imaxe\u003c/a\u003e non puido cargarse."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} ou %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Atallos do teclado","jump_to":{"title":"Ir a","home":"%{shortcut} Inicio","latest":"%{shortcut} Último","new":"%{shortcut} Novo","unread":"%{shortcut} Pendentes de lectura","categories":"%{shortcut} Categorías","top":"%{shortcut} Arriba","bookmarks":"%{shortcut} Marcadores","profile":"%{shortcut} Perfil","messages":"%{shortcut} Mensaxes","drafts":"%{shortcut} Borradores","next":"%{shortcut} Seguinte tema","previous":"%{shortcut} Tema anterior"},"navigation":{"title":"Navegación","jump":"%{shortcut} Ir á publicación #","back":"%{shortcut} Volver","up_down":"%{shortcut} Mover selección \u0026uarr; \u0026darr;","open":"%{shortcut} Abrir tema seleccionado","next_prev":"%{shortcut} Sección seguinte/anterior","go_to_unread_post":"%{shortcut} Ir á primeira publicación pendente de lectura"},"application":{"title":"Aplicativo","create":"%{shortcut} Crear un novo tema","notifications":"%{shortcut} Abrir notificacións","hamburger_menu":"%{shortcut} Abrir o menú hamburguesa","user_profile_menu":"%{shortcut} Abrir o menú do usuario","show_incoming_updated_topics":"%{shortcut} Amosar temas actualizados","search":"%{shortcut} Buscar","help":"%{shortcut} Abrir a axuda do teclado","dismiss_topics":"%{shortcut} Desbotar temas","log_out":"%{shortcut} Saír da sesión"},"composing":{"title":"Escribindo","return":"%{shortcut} Volver ao panel de composición","fullscreen":"%{shortcut} Panel de composición en pantalla completa"},"bookmarks":{"title":"Marcadores","enter":"%{shortcut} Gardar e pechar","later_today":"%{shortcut} Hoxe pero despois","later_this_week":"%{shortcut} Esta semana pero despois","tomorrow":"%{shortcut} Mañá","next_week":"%{shortcut} A vindeira semana","next_month":"%{shortcut} O vindeiro mes","next_business_week":"%{shortcut} A principios da próxima semana","next_business_day":"%{shortcut} O vindeiro día laborábel","custom":"%{shortcut} Personalizar data e hora","none":"%{shortcut} Sen recordatorio","delete":"%{shortcut} Eliminar marcador"},"actions":{"title":"Accións","bookmark_topic":"%{shortcut} Trocar marcar tema","pin_unpin_topic":"%{shortcut} Fixar/Desprender tema","share_topic":"%{shortcut} Compartir tema","share_post":"%{shortcut} Compartir publicación","reply_as_new_topic":"%{shortcut} Responder como tema ligado","reply_topic":"%{shortcut} Responder no tema","reply_post":"%{shortcut} Responder na publicación","quote_post":"%{shortcut} Citar a publicación","like":"%{shortcut} Gústame a publicación","flag":"%{shortcut} Sinalar a publicación","bookmark":"%{shortcut} Marcar a publicación","edit":"%{shortcut} Editar a publicación","delete":"%{shortcut} Eliminar a publicación","mark_muted":"%{shortcut} Silenciar o tema","mark_regular":"%{shortcut} Tema normal (predeterminado)","mark_tracking":"%{shortcut} Seguir o tema","mark_watching":"%{shortcut} Ver o tema","print":"%{shortcut} Imprimir o tema","defer":"%{shortcut} Adiar o tema","topic_admin_actions":"%{shortcut} Abrir intervencións do admin no tema"},"search_menu":{"title":"Menú de busca","prev_next":"%{shortcut} Mover a selección arriba e abaixo","insert_url":"%{shortcut} Introducir selección no panel de composición"}},"badges":{"earned_n_times":{"one":"Gañou esta insignia %{count} vez","other":"Gañou esta insignia %{count} veces"},"granted_on":"Concedida %{date}","others_count":"Outros con esta insignia (%{count})","title":"Insignias","allow_title":"Pode usar esta insignia como título","multiple_grant":"Pode gañala múltiples veces","badge_count":{"one":"%{count} insignia","other":"%{count} insignias"},"more_badges":{"one":"+%{count} Máis","other":"+%{count} Máis"},"granted":{"one":"%{count} concedida","other":"%{count} concedidas"},"select_badge_for_title":"Seleccione unha insignia que usará como título","none":"(ningunha)","successfully_granted":"Concedeuse %{badge} a %{username} correctamente","badge_grouping":{"getting_started":{"name":"Comezar"},"community":{"name":"Comunidade"},"trust_level":{"name":"Nivel de confianza"},"other":{"name":"Outro"},"posting":{"name":"Publicación"}}},"tagging":{"all_tags":"Todas as etiquetas","other_tags":"Outras etiquetas","selector_all_tags":"todas as etiquetas","selector_no_tags":"sen etiquetas","changed":"etiquetas cambiadas:","tags":"Etiquetas","choose_for_topic":"etiquetas opcionais","info":"Información","category_restricted":"Esta etiqueta restrínxese ás categorías ás que non ten permiso para acceder.","synonyms":"Sinónimos","synonyms_description":"Cando se usen as seguintes etiquetas, substituílas por \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Esta etiqueta pertence ao grupo «%{tag_groups}».","other":"Esta etiqueta pertence a estes grupos: «%{tag_groups}»."},"category_restrictions":{"one":"Só pode usarse nesta categoría:","other":"Só pode usarse nestas categorías:"},"edit_synonyms":"Xestionar sinónimos","add_synonyms_label":"Engadir sinónimos:","add_synonyms":"Engadir","add_synonyms_explanation":{"one":"Calquera lugar que use esta etiqueta cambiarase para que use \u003cb\u003e%{tag_name}\u003c/b\u003e . Seguro que quere facer este cambio?","other":"Calquera lugar que use actualmente estas etiquetas cambiarase para que use \u003cb\u003e%{tag_name}\u003c/b\u003e . Seguro que quere facer este cambio?"},"add_synonyms_failed":"Non se puido engadir as seguintes etiquetas como sinónimos: \u003cb\u003e%{tag_names}\u003c/b\u003e. Comprobe que non teñan sinónimos asociados e non figuren como sinónimos doutra etiqueta.","remove_synonym":"Retirar o sinónimo","delete_synonym_confirm":"Confirma a eliminación do sinónimo «%{tag_name}»?","delete_tag":"Eliminar etiqueta","delete_confirm":{"one":"Está seguro de que quere eliminar esta etiqueta e retirala de %{count} tema ao que está asignada?","other":"Está seguro de que quere eliminar esta etiqueta e retirala de %{count} temas aos que está asignada?"},"delete_confirm_no_topics":"Confirma a eliminación desta etiqueta?","delete_confirm_synonyms":{"one":"Tamén se eliminará o seu sinónimo.","other":"Tamén se eliminarán os seus %{count} sinónimos."},"rename_tag":"Renomear etiqueta","rename_instructions":"Seleccione un novo nome para a etiqueta:","sort_by":"Ordenar por:","sort_by_count":"número","sort_by_name":"nome","manage_groups":"Xestionar grupos de etiquetas","manage_groups_description":"Estabelecer grupos para organizar etiquetas","upload":"Cargar etiquetas","upload_description":"Cargar un ficheiro csv para crear etiquetas en lote","upload_instructions":"Unha por liña, opcionalmente cun grupo de etiquetas co formato «etiqueta_nome, etiqueta_grupo».","upload_successful":"Etiquetas cargadas correctamente","delete_unused_confirmation":{"one":"Será(n) eliminada(s) %{count}etiqueta(s): %{tags}","other":"Eliminaranse %{count}etiquetas: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} e %{count} máis","other":"%{tags} e %{count} máis"},"delete_no_unused_tags":"Non hai etiquetas sen usar.","tag_list_joiner":", ","delete_unused":"Eliminar etiquetas sen usar","delete_unused_description":"Eliminar todas as etiquetas que non estean asociadas a ningún tema ou mensaxe privada","cancel_delete_unused":"Cancelar","filters":{"without_category":"%{filter} %{tag} temas","with_category":"%{filter}%{tag} temas en %{category}","untagged_without_category":"%{filter} temas sen etiquetar","untagged_with_category":"%{filter} temas sen etiquetar en %{category}"},"notifications":{"watching":{"title":"Observando","description":"Pasará a observar automaticamente todos os temas con esta etiquetas. Recibirá notificacións de todas as novas publicacións e temas e o número de publicacións novas e pendentes de ler aparecerá preto do tema."},"watching_first_post":{"title":"Observando a publicación inicial","description":"Recibirá notificacións dos novos temas nesta etiqueta pero non das respostas."},"tracking":{"title":"Seguimento","description":"Pasará a seguir automaticamente todos os temas con esta etiqueta. O número de publicacións novas e pendentes de ler aparecerá preto do tema."},"regular":{"title":"Normal","description":"Pasará a recibir notificacións se alguén menciona o seu @nome ou responde á súa publicación."},"muted":{"title":"Silenciado","description":"Non recibirá notificacións de nada relacionado cos novos temas con esta etiqueta e non aparecerán no separador de elementos pendentes de ler."}},"groups":{"title":"Etiquetar grupos","new":"Novo grupo","tags_label":"Etiquetas neste grupo","parent_tag_label":"Etiqueta primaria","one_per_topic_label":"Limitar a unha etiqueta por tema neste grupo","new_name":"Novo grupo de etiquetas","name_placeholder":"Nome","save":"Gardar","delete":"Eliminar","confirm_delete":"Confirma a eliminación deste grupo de etiquetas?","everyone_can_use":"Todos poden usar as etiquetas","usable_only_by_groups":"As etiquetas son visíbeis para todos, pero só os seguintes grupos poden usalas","visible_only_to_groups":"As etiquetas só son visíbeis para os seguintes grupos"},"topics":{"none":{"unread":"Non ten temas sen ler.","new":"Non ten novos temas.","read":"Aínda non leu ningún tema.","posted":"Aínda non publicou en ningún tema.","latest":"Non hai últimos temas.","bookmarks":"Aínda non marcou este tema.","top":"Non hai temas destacados."}}},"invite":{"custom_message":"Pode facer o convite un pouco máis persoal escribindo unha \u003ca href\u003emensaxe personalizada\u003c/a\u003e.","custom_message_placeholder":"Escriba a súa mensaxe personalizada","approval_not_required":"O usuario será aprobado axiña que acepte esta invitación.","custom_message_template_forum":"Mire, podería participar neste foro!","custom_message_template_topic":"Mire, vaille gustar este tema!"},"forced_anonymous":"Debido á carga extrema, amosaráselle isto temporalmente a calquera, de modo que ata un usuario sen sesión podería velo.","forced_anonymous_login_required":"O sitio está baixo carga extrema e non se pode cargar neste intre. Ténteo de novo nuns minutos.","footer_nav":{"back":"Atrás","forward":"Reenviar","share":"Compartir","dismiss":"Desbotar"},"safe_mode":{"enabled":"O modo seguro está activado; para saír do modo seguro peche esta xanela do navegador"},"image_removed":"(imaxe retirada)","do_not_disturb":{"title":"Non molestar durante...","label":"Non molestar","remaining":"queda %{remaining}","options":{"half_hour":"30 minutos","one_hour":"1 hora","two_hours":"2 horas","tomorrow":"Ata mañá","custom":"Personalizado"},"set_schedule":"Estabelecer un calendario de notificacións"},"trust_levels":{"names":{"newuser":"novo usuario","basic":"usuario básico","member":"membro","regular":"habitual","leader":"líder"}},"user_activity":{"no_activity_others":"Sen actividade.","no_replies_others":"Sen respostas.","no_likes_others":"Ningún Gústame en publicacións."},"admin":{"site_settings":{"categories":{"chat_integration":"Integracións de chat"}}},"chat_integration":{"menu_title":"Integracións de chat","settings":"Configuración","no_providers":"Cómpre activar algúns fornecedores na configuración do complemento","channels_with_errors":"Algunhas das canles deste fornecedor fallaron a última vez que se enviaron mensaxes. Prema na icona(s) de erro para saber máis.","channel_exception":"Produciuse un erro descoñecido a última vez que se enviou unha mensaxe por esta canle.","group_mention_template":"Mencións de: @%{name}","group_message_template":"Mensaxes a: @%{name}","choose_group":"(escolla un grupo)","all_categories":"(todas as categorías)","all_tags":"(todas as etiquetas)","create_rule":"Crear regra","create_channel":"Crear canle","delete_channel":"Eliminar","test_channel":"Proba","edit_channel":"Editar","channel_delete_confirm":"Confirma que quere eliminar esta canle? Todas as regras asociadas serán eliminadas.","test_modal":{"title":"Enviar unha mensaxe de proba","topic":"Tema","send":"Enviar mensaxe de proba","close":"Pechar","error":"Produciuse un erro descoñecido ao enviar a mensaxe. Consulte os rexistros do sitio para obter máis información.","success":"A mensaxe enviouse correctamente"},"type":{"normal":"Normal","group_message":"Mensaxe de grupo","group_mention":"Mención de grupo"},"filter":{"mute":"Silenciar","follow":"Só a primeira publicación","watch":"Todas as publicacións e respostas","thread":"Todas as publicacións cos fíos de resposta"},"rule_table":{"filter":"Filtro","category":"Categoría","tags":"Etiquetas","edit_rule":"Editar","delete_rule":"Eliminar"},"edit_channel_modal":{"title":"Editar canle","save":"Gardar canle","cancel":"Cancelar","provider":"Fornecedor","channel_validation":{"ok":"Correcto","fail":"Formato incorrecto"}},"edit_rule_modal":{"title":"Editar regra","save":"Gardar regra","cancel":"Cancelar","provider":"Fornecedor","type":"Tipo","channel":"Canle","filter":"Filtro","category":"Categoría","group":"Grupo","tags":"Etiquetas","instructions":{"type":"Cambiar o tipo que dispara avisos para mensaxes de grupos ou mencións","filter":"Nivel de aviso. O silenciamento sobrescribe outras regras que coincidan","category":"Esta regra soamente se aplicará a asunto na categoría especificada","group":"Esta regra aplicaráselles ás publicacións que teñan referenciado a este grupo","tags":"Se é así especificado, esta regra soamente se lle aplicará aos asuntos que teñan cando menos unha destas etiquetas"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"Canle","help":"i.e. #canle, @usuario."}},"errors":{"action_prohibited":"O bot non ten permisos para publicar nesta canle","channel_not_found":"A canle especificada non existe en Slack"}},"telegram":{"title":"Telegram","param":{"name":{"title":"Nome","help":"Un nome para describir a canle. Non se utiliza para conectar co Telegram."},"chat_id":{"title":"ID de chat","help":"Un número que lle ofreceu o bot, ou un identificador dunha canle de difusión na forma @nomedacanle"}},"errors":{"channel_not_found":"A canle especificada non existe no Telegram","forbidden":"O bot non ten permisos para publicar nesta canle"}},"discord":{"title":"Discord","param":{"name":{"title":"Nome","help":"Un nome para describir a canle. Non se utiliza para a conexión co Discord."},"webhook_url":{"title":"URL do gancho","help":"O URL do gancho creado na configuración do seu servidor Discord"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"Canle","help":"i.e. #canle, @usuario."}},"errors":{"channel_not_found":"A canle especificada non existe no Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"title":"Nome","help":"Un nome para describir a canle. Non se utiliza para a conexión con Matrix."},"room_id":{"title":"ID de sala","help":"O «identificador privado» da sala. Debería parecerse a algo como !abcdefg:matrix.org"}},"errors":{"unknown_token":"O token de acceso non é correcto","unknown_room":"O ID da sala non é correcto"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"O nome do fluxo Zulip ao que debería enviarse a mensaxe. i.e. «xeral»"},"subject":{"title":"Asunto","help":"O asunto que deben ter estas mensaxes enviadas polo bot"}},"errors":{"does_not_exist":"Ese fluxo non existe en Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"Canle","help":"i.e. #canle, @usuario."}},"errors":{"invalid_channel":"Esa canle non existe en Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"title":"Nome","help":"O nome dunha sala Gitter, i.e. gitterHQ/servizos."},"webhook_url":{"title":"URL do gancho","help":"O URL ofrecido cando vostede crea unha nova integración nunha sala do Gitter."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Token de fluxo","help":"O token de fluxo ofrecido despois de crear unha fonte para un fluxo ao que desexa enviar mensaxes."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"Nome da instancia do GroupMe","help":"nome da instancia do Groupme como aparece na configuración do sitio. Utilice «todos» para enviala a todas as instancias"}},"errors":{"not_found":"Non se atopou o camiño no que intentou publicar a súa mensaxe. Comprobe o ID do bot na configuración do sitio.","instance_names_issue":"nomes de instancias con formato incorrecto ou non proporcionados"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Nome","help":"Un nome de canle do Teams i.e. discourse"},"webhook_url":{"title":"URL do gancho","help":"O URL ofrecido cando vostede crea un novo gancho de entradas"}},"errors":{"invalid_channel":"Esa canle non existe en Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Nome","help":"Un nome de espazo Webex i.e. discourse"},"webhook_url":{"title":"URL do gancho","help":"O URL ofrecido cando vostede crea un novo gancho de entradas"}},"errors":{"invalid_channel":"Esa canle non existe en Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Nome","help":"Un nome para a canle (só se mostra na interface de administración do Discourse)"},"webhook_url":{"title":"URL do gancho","help":"O URL ofrecido cando vostede crea un novo gancho"}}}}},"details":{"title":"Agochar detalles"},"discourse_local_dates":{"relative_dates":{"today":"Hoxe %{time}","tomorrow":"Mañá %{time}","yesterday":"Onte %{time}","countdown":{"passed":"superouse a data"}},"title":"Inserir data e hora","create":{"form":{"insert":"Inserir","advanced_mode":"Modo avanzado","simple_mode":"Modo simple","format_description":"Formato usado para presentarlle a data ao usuario. Use Z para amosar o desprazamento e zz para o nome da zona horaria.","timezones_title":"Zonas horarias que presentar","timezones_description":"As zonas horarias utilizaranse para presentar datas na visualización previa e na alternativa.","recurring_title":"Periodicidade","recurring_description":"Define a recorrencia dun evento. Tamén pode editar manualmente a opción recorrente xerada polo formulario e usar unha das seguintes claves: anos, trimestres, meses, semanas, días, horas, minutos, segundos, milisegundos.","recurring_none":"Sen periodicidade","invalid_date":"Data incorrecta; asegúrese de que data e hora son correctas","date_title":"Data","time_title":"Hora","format_title":"Formato da data","timezone":"Zona horaria","until":"Ata...","recurring":{"every_day":"Todos os días","every_week":"Todas as semanas","every_two_weeks":"Cada dúas semanas","every_month":"Todos os meses","every_two_months":"Cada dous meses","every_three_months":"Cada tres meses","every_six_months":"Cada seis meses","every_year":"Todos os anos"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Comezar o novo titorial de usuario para todos os usuarios novos","welcome_message":"Enviar unha mensaxe de benvida a todos os usuarios novos xunta unha guía de inicio"}},"presence":{"replying":{"one":"respondendo","other":"respondendo"},"editing":{"one":"editando","other":"editando"},"replying_to_topic":{"one":"respondendo","other":"respondendo"}},"poll":{"voters":{"one":"votante","other":"votantes"},"total_votes":{"one":"votos totais","other":"votos totais"},"average_rating":"Valoración media: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Os votos son \u003cstrong\u003epúblicos\u003c/strong\u003e."},"results":{"groups":{"title":"Debe ser membro de %{groups} para votar nesta enquisa."},"vote":{"title":"Os resultados amosaranse en \u003cstrong\u003evoto\u003c/strong\u003e."},"closed":{"title":"Os resultados amosaranse logo de \u003cstrong\u003epechada\u003c/strong\u003e."},"staff":{"title":"Os resultados só se amosan a membros do \u003cstrong\u003eequipo\u003c/strong\u003e."}},"multiple":{"help":{"at_least_min_options":{"one":"Escolla polo menos a opción \u003cstrong\u003e%{count}\u003c/strong\u003e.","other":"Escolla polo menos as opcións \u003cstrong\u003e%{count}\u003c/strong\u003e."},"up_to_max_options":{"one":"Escolla ata \u003cstrong\u003e%{count}\u003c/strong\u003e opción.","other":"Escolla ata \u003cstrong\u003e%{count}\u003c/strong\u003e opcións."},"x_options":{"one":"Escolla \u003cstrong\u003e%{count}\u003c/strong\u003e opción.","other":"Escolla \u003cstrong\u003e%{count}\u003c/strong\u003e opcións."},"between_min_and_max_options":"Escolla entre as opcións \u003cstrong\u003e%{min}\u003c/strong\u003e e \u003cstrong\u003e%{max}\u003c/strong\u003e."}},"cast-votes":{"title":"Vote","label":"Vote agora!"},"show-results":{"title":"Amosar os resultados da enquisa","label":"Amosar os resultados"},"hide-results":{"title":"Volver aos seus votos","label":"Amosar o voto"},"group-results":{"title":"Agrupar votos por campo de usuario","label":"Amosar en detalle"},"export-results":{"title":"Exportar os resultados da enquisa","label":"Exportar"},"open":{"title":"Abrir a enquisa","label":"Abrir","confirm":"Confirma a apertura da enquisa?"},"close":{"title":"Pechar a enquisa","label":"Pechar","confirm":"Confirma o peche desta enquisa?"},"automatic_close":{"closes_in":"Pechará en \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Pechado desde \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Resultados da enquisa","votes":"%{count} votos","breakdown":"Detalle","percentage":"Porcentaxe","count":"Conta"},"error_while_toggling_status":"Desculpe, produciuse un erro ao trocar o status desta enquisa.","error_while_casting_votes":"Desculpe, produciuse un erro na emisión dos seus votos.","error_while_fetching_voters":"Desculpe, produciuse un erro ao presentar os votantes.","error_while_exporting_results":"Desculpe, produciuse un erro ao exportar os resultados da enquisa.","ui_builder":{"title":"Construír a enquisa","insert":"Inserir enquisa","help":{"options_min_count":"Introducir cando menos 1 opción.","invalid_values":"O valor mínimo ten de ser menor có valor máximo.","min_step_value":"O valor mínimo do paso é 1"},"poll_type":{"label":"Tipo","regular":"Escolla única","multiple":"Escolla múltipla","number":"Valoración numérica"},"poll_result":{"always":"Sempre visíbel","staff":"Soamente ao equipo"},"poll_chart_type":{"bar":"Barra","pie":"Torta"},"poll_config":{"step":"Paso"},"poll_public":{"label":"Amosar quen votou"},"poll_title":{"label":"Título (opcional)"},"automatic_close":{"label":"Pechar automaticamente a enquisa"},"show_advanced":"Amosar opcións avanzadas","hide_advanced":"Agochar opcións avanzadas"}},"styleguide":{"title":"Guía de estilo","welcome":"Para comezar, escolla unha sección do menú da esquerda.","categories":{"atoms":"Átomos","molecules":"Moléculas","organisms":"Organismos"},"sections":{"typography":{"title":"Tipografía","example":"A nosa benvida a Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, are in culpa qui officia deserunt mollit anim id is laborum."},"date_time_inputs":{"title":"Entradas de data/hora"},"font_scale":{"title":"Sistema de tipos de letra"},"colors":{"title":"Cores"},"icons":{"title":"Iconas","full_list":"Vexa a listaxe completa das iconas dos tipos de letra"},"input_fields":{"title":"Campos de entrada"},"buttons":{"title":"Botóns"},"dropdowns":{"title":"Despregabeis"},"categories":{"title":"Categorías"},"bread_crumbs":{"title":"Rastro de migas"},"navigation":{"title":"Navegación"},"navigation_bar":{"title":"Barra de navegación"},"navigation_stacked":{"title":"Navegación vertical"},"categories_list":{"title":"Lista de categorías"},"topic_link":{"title":"Ligazón do tema"},"topic_list_item":{"title":"Elemento da lista de temas"},"topic_statuses":{"title":"Status do tema"},"topic_list":{"title":"Listaxe de temas"},"basic_topic_list":{"title":"Listaxe de temas básicos"},"footer_message":{"title":"Mensaxe rodapé"},"signup_cta":{"title":"Subscrición CTA"},"topic_timer_info":{"title":"Temporizadores do tema"},"topic_footer_buttons":{"title":"Botóns de rodapé do tema"},"topic_notifications":{"title":"Notificacións de temas"},"post":{"title":"Publicación"},"topic_map":{"title":"Mapa de temas"},"site_header":{"title":"Cabeceira do sitio"},"suggested_topics":{"title":"Temas suxeridos"},"post_menu":{"title":"Menú de publicación"},"modal":{"title":"Modal","header":"Título da modal","footer":"Rodapé da modal"},"user_about":{"title":"Caixa Verbo do usuario"},"header_icons":{"title":"Iconas de cabeceira"},"spinners":{"title":"Indicador de carga"}}}}},"en":{"js":{"dates":{"wrap_on":"on %{date}","from_placeholder":"from date"},"skip_to_main_content":"Skip to main content","software_update_prompt":{"message":"We've updated this site, \u003cspan\u003eplease refresh\u003c/span\u003e, or you may experience unexpected behavior."},"s3":{"regions":{"eu_south_1":"EU (Milan)"}},"period_chooser":{"aria_label":"Filter by period"},"about":{"stat":{"last_day":"Last 24 hours","last_7_days":"Last 7 days","last_30_days":"Last 30 days"}},"bookmarked":{"edit_bookmark":"Edit Bookmark","help":{"edit_bookmark":"Click to edit the bookmark on this topic","edit_bookmark_for_topic":"Click to edit the bookmark for this topic","unbookmark_with_reminder":"Click to remove all bookmarks and reminders in this topic."}},"drafts":{"label_with_count":"Drafts (%{count})","new_private_message":"New personal message draft"},"processing_filename":"Processing: %{filename}...","review":{"date_filter":"Posted between","stale_help":"This reviewable has been resolved by \u003cb\u003e%{username}\u003c/b\u003e."},"time_shortcut":{"last_custom":"Last custom datetime"},"directory":{"edit_columns":{"title":"Edit Directory Columns"}},"groups":{"add_members":{"title":"Add Users to %{group_name}","description":"Enter a list of users you want to invite to the group or paste in a comma separated list:","set_owner":"Set users as owners of this group"},"manage":{"add_members":"Add Users","email":{"enable_smtp":"Enable SMTP","enable_imap":"Enable IMAP","test_settings":"Test Settings","save_settings":"Save Settings","last_updated":"Last updated:","settings_required":"All settings are required, please fill in all fields before validation.","smtp_settings_valid":"SMTP settings valid.","smtp_title":"SMTP","smtp_instructions":"When you enable SMTP for the group, all outbound emails sent from the group's inbox will be sent via the SMTP settings specified here instead of the mail server configured for other emails sent by your forum.","imap_title":"IMAP","imap_additional_settings":"Additional Settings","imap_instructions":"When you enable IMAP for the group, emails are synced between the group inbox and the provided IMAP server and mailbox. SMTP must be enabled with valid and tested credentials before IMAP can be enabled. The email username and password used for SMTP will be used for IMAP. For more information see \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Warning: This is an alpha-stage feature. Only Gmail is officially supported. Use at your own risk!","imap_settings_valid":"IMAP settings valid.","smtp_disable_confirm":"If you disable SMTP, all SMTP and IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_disable_confirm":"If you disable IMAP all IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_mailbox_not_selected":"You must select a Mailbox for this IMAP configuration or no mailboxes will be synced!","prefill":{"title":"Prefill with settings for:","gmail":"GMail"},"settings":{"allow_unknown_sender_topic_replies_hint":"Allows unknown senders to reply to group topics. If this is not enabled, replies from email addresses not already invited to the topic will create a new topic."}}},"members":{"no_filter_matches":"No members match that search."},"default_notifications":{"modal_title":"User default notifications"}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"sr_expand_profile":"Expand profile details","sr_collapse_profile":"Collapse profile details","no_messages_title":"You don’t have any messages","no_messages_body":"Need to have a direct personal conversation with someone, outside the normal conversational flow? Message them by selecting their avatar and using the %{icon} message button.\u003cbr\u003e\u003cbr\u003e If you need help, you can \u003ca href='%{aboutUrl}'\u003emessage a staff member\u003c/a\u003e.\n","no_bookmarks_title":"You haven’t bookmarked anything yet","no_bookmarks_body":"Start bookmarking posts with the %{icon} button and they will be listed here for easy reference. You can schedule a reminder too!\n","no_notifications_title":"You don’t have any notifications yet","no_notifications_body":"You will be notified in this panel about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","no_notifications_page_title":"You don’t have any notifications yet","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","skip_new_user_tips":{"read_later":"I'll read it later."},"messages":{"all":"all inboxes","personal":"Personal","warnings":"Official Warnings","read_more_in_group":"Want to read more? Browse other messages in %{groupLink}.","read_more":"Want to read more? Browse other messages in \u003ca href='%{basePath}/u/%{username}/message'\u003epersonal messages\u003c/a\u003e."},"change_avatar":{"logo_small":"Site's small logo. Used by default."},"email":{"authenticated_by_invite":"Your email has been authenticated by the invitation"},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}},"invited":{"invite":{"expires_in_time":"Expires in %{time}","expired_at_time":"Expired at %{time}","restrict_email":"Restrict to one email address","max_redemptions_allowed":"Max uses","invite_to_topic":"Arrive at this topic","invite_saved":"Invite saved.","invite_copied":"Invite link copied."}},"title":{"instructions":"appears after your username"},"flair":{"title":"Flair","instructions":"icon displayed next to your profile picture"}},"signup_cta":{"hidden_for_session":"OK, we'll ask you tomorrow. You can always use 'Log In' to create an account, too."},"summary":{"short_label":"Summarize","short_title":"Show a summary of this topic: the most interesting posts as determined by the community"},"create_account":{"associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"login":{"header_title":"Welcome back","title":"Log in","google_oauth2":{"sr_title":"Login with Google"},"twitter":{"sr_title":"Login with Twitter"},"instagram":{"sr_title":"Login with Instagram"},"facebook":{"sr_title":"Login with Facebook"},"github":{"sr_title":"Login with GitHub"},"discord":{"sr_title":"Login with Discord"}},"select_kit":{"results_count":{"one":"%{count} result","other":"%{count} results"},"components":{"tag_drop":{"filter_for_more":"Filter for more..."}}},"composer":{"show_preview":"show preview","hide_preview":"hide preview","slow_mode":{"error":"This topic is in slow mode. You already posted recently; you can post again in %{timeLeft}."},"composer_actions":{"reply_as_new_group_message":{"desc":"Create new message starting with same recipients"}}},"upload_selector":{"processing":"Processing Upload"},"search":{"open_advanced":"Open advanced search","clear_search":"Clear search","sort_or_bulk_actions":"Sort or bulk select results","search_term_label":"enter search keyword","in":"in","in_this_topic":"in this topic","in_topics_posts":"in all topics and posts","in_posts_by":"in posts by %{username}","type":{"default":"Topics/posts","categories_and_tags":"Categories/tags"},"tips":{"category_tag":"filters by category or tag","author":"filters by post author","in":"filters by metadata (e.g. in:title, in:personal, in:pinned)","status":"filters by topic status","full_search":"launches full page search","full_search_key":"%{modifier} + Enter"},"advanced":{"title":"Advanced filters","posted_by":{"aria_label":"Filter by post author"},"with_tags":{"aria_label":"Filter using tags"},"post":{"min":{"aria_label":"filter by minimum number of posts"},"max":{"aria_label":"filter by maximum number of posts"},"time":{"aria_label":"Filter by posted date"}},"min_views":{"aria_label":"filter by minimum views"},"max_views":{"aria_label":"filter by maximum views"},"additional_options":{"label":"Filter by post count and topic views"}}},"hamburger_menu":"menu","topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread","other":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…","other":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})","other":"Dismiss New (%{count})"},"change_category":"Set Category...","notification_level":"Notifications..."},"none":{"unseen":"You have no unseen topics."},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"collapse_details":"collapse topic details","expand_details":"expand topic details","suggest_create_topic":"Ready to \u003ca href\u003estart a new conversation?\u003c/a\u003e","slow_mode_update":{"enabled_until":"Enabled until:"},"slow_mode_notice":{"duration":"Please wait %{duration} between posts in this topic"},"auto_reopen":{"title":"Auto-Open Topic"},"notifications":{"reasons":{"3_10_stale":"You will receive notifications because you were watching a tag on this topic in the past.","3_6_stale":"You will receive notifications because you were watching this category in the past.","2_8_stale":"You will see a count of new replies because you were tracking this category in the past."}},"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."},"feature":{"make_banner":"Make Banner Topic"},"share":{"instructions":"Share a link to this topic:","copied":"Topic link copied.","notify_users":{"title":"Notify","instructions":"Notify the following users about this topic:","success":{"one":"Successfully notified %{username} about this topic.","other":"Successfully notified all users about this topic."}}},"deleted_by_author_simple":"(topic deleted by author)"},"post":{"deleted_by_author_simple":"(post deleted by author)","errors":{"file_too_large_humanized":"Sorry, that file is too big (maximum size is %{max_size}). Why not upload your large file to a cloud sharing service, then paste the link?"},"controls":{"change_owner":"Change Ownership...","grant_badge":"Grant Badge...","add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice..."},"bookmarks":{"create_for_topic":"Create bookmark for topic","edit_for_topic":"Edit bookmark for topic"}},"category":{"allow_unlimited_owner_edits_on_first_post":"Allow unlimited owner edits on first post","default_slow_mode":"Enable \"Slow Mode\" for new topics in this category.","notifications":{"title":"change notification level for this category"}},"history_capped_revisions":"History, last 100 revisions","history":"History","filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"}},"cannot_render_video":"This video cannot be rendered because your browser does not support the codec.","keyboard_shortcuts_help":{"application":{"dismiss_new":"%{shortcut} Dismiss New"}},"badges":{"favorite_max_reached":"You can’t favorite more badges.","favorite_max_not_reached":"Mark this badge as favorite","favorite_count":"%{count}/%{max} badges marked as favorite"},"download_calendar":{"title":"Download calendar","save_ics":"Download .ics file","save_google":"Add to Google calendar","remember":"Don’t ask me again","remember_explanation":"(you can change this preference in your user prefs)","download":"Download","default_calendar":"Default calendar","default_calendar_instruction":"Determine which calendar should be used when dates are saved","add_to_calendar":"Add to calendar","google":"Google Calendar","ics":"ICS"},"tagging":{"default_info":"This tag isn't restricted to any categories, and has no synonyms. To add restrictions, put this tag in a \u003ca href=%{basePath}/tag_groups\u003etag group\u003c/a\u003e.","groups":{"about_heading":"Select a tag group or create a new one","about_heading_empty":"Create a new tag group to get started","about_description":"Tag groups help you manage permissions for many tags in one place.","new_title":"Create New Group","edit_title":"Edit Tag Group","parent_tag_description":"Tags from this group can only be used if the parent tag is present.","cannot_save":"Cannot save tag group. Make sure that there is at least one tag present, tag group name is not empty, and a group is selected for tags permission.","tags_placeholder":"Search or create tags","parent_tag_placeholder":"Optional","select_groups_placeholder":"Select groups...","disabled":"Tagging is disabled. "},"topics":{"none":{"unseen":"You have no unseen topics."}}},"trust_levels":{"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"You have picked an unsupported file. Supported file types – %{types}."},"user_activity":{"no_activity_title":"No activity yet","no_activity_body":"Welcome to our community! You are brand new here and have not yet contributed to discussions. As a first step, visit \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e and just start reading! Select %{heartIcon} on posts that you like or want to learn more about. If you have not already done so, help others get to know you by adding a picture and bio in your \u003ca href='%{preferencesUrl}'\u003euser preferences\u003c/a\u003e.","no_replies_title":"You have not replied to any topics yet","no_drafts_title":"You haven’t started any drafts","no_drafts_body":"Not quite ready to post? We’ll automatically save a new draft and list it here whenever you start composing a topic, reply, or personal message. Select the cancel button to discard or save your draft to continue later.","no_likes_title":"You haven’t liked any topics yet","no_likes_body":"A great way to jump in and start contributing is to start reading conversations that have already taken place, and select the %{heartIcon} on posts that you like!","no_topics_title":"You have not started any topics yet","no_read_topics_title":"You haven’t read any topics yet","no_read_topics_body":"Once you start reading discussions, you’ll see a list here. To start reading, look for topics that interest you in \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e or search by keyword %{searchIcon}"},"no_group_messages_title":"No group messages found","whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"poll":{"remove-vote":{"title":"Remove your vote","label":"Remove vote"},"ui_builder":{"help":{"options_max_count":"Enter at most %{count} options.","invalid_min_value":"Minimum value must be at least 1.","invalid_max_value":"Maximum value must be at least 1, but less than or equal with the number of options."},"poll_result":{"label":"Show Results...","vote":"Only after voting","closed":"When the poll is closed"},"poll_groups":{"label":"Limit voting to these groups"},"poll_chart_type":{"label":"Result chart"},"poll_config":{"max":"Max Choices","min":"Min Choices"},"poll_options":{"label":"Options (one per line)","add":"Add option"}}}}}};
I18n.locale = 'gl';
I18n.pluralizationRules.gl = MessageFormat.locale.gl;
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
//! locale : Galician [gl]
//! author : Juan G. Hurtado : https://github.com/juanghurtado

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var gl = moment.defineLocale('gl', {
        months: 'xaneiro_febreiro_marzo_abril_maio_xuño_xullo_agosto_setembro_outubro_novembro_decembro'.split(
            '_'
        ),
        monthsShort: 'xan._feb._mar._abr._mai._xuñ._xul._ago._set._out._nov._dec.'.split(
            '_'
        ),
        monthsParseExact: true,
        weekdays: 'domingo_luns_martes_mércores_xoves_venres_sábado'.split('_'),
        weekdaysShort: 'dom._lun._mar._mér._xov._ven._sáb.'.split('_'),
        weekdaysMin: 'do_lu_ma_mé_xo_ve_sá'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'H:mm',
            LTS: 'H:mm:ss',
            L: 'DD/MM/YYYY',
            LL: 'D [de] MMMM [de] YYYY',
            LLL: 'D [de] MMMM [de] YYYY H:mm',
            LLLL: 'dddd, D [de] MMMM [de] YYYY H:mm',
        },
        calendar: {
            sameDay: function () {
                return '[hoxe ' + (this.hours() !== 1 ? 'ás' : 'á') + '] LT';
            },
            nextDay: function () {
                return '[mañá ' + (this.hours() !== 1 ? 'ás' : 'á') + '] LT';
            },
            nextWeek: function () {
                return 'dddd [' + (this.hours() !== 1 ? 'ás' : 'a') + '] LT';
            },
            lastDay: function () {
                return '[onte ' + (this.hours() !== 1 ? 'á' : 'a') + '] LT';
            },
            lastWeek: function () {
                return (
                    '[o] dddd [pasado ' + (this.hours() !== 1 ? 'ás' : 'a') + '] LT'
                );
            },
            sameElse: 'L',
        },
        relativeTime: {
            future: function (str) {
                if (str.indexOf('un') === 0) {
                    return 'n' + str;
                }
                return 'en ' + str;
            },
            past: 'hai %s',
            s: 'uns segundos',
            ss: '%d segundos',
            m: 'un minuto',
            mm: '%d minutos',
            h: 'unha hora',
            hh: '%d horas',
            d: 'un día',
            dd: '%d días',
            M: 'un mes',
            MM: '%d meses',
            y: 'un ano',
            yy: '%d anos',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%dº',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return gl;

})));

// moment-timezone-localization for lang code: gl

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidjan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Acra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Adís Abeba","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Alxer","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamaco","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"O Cairo","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Casablanca","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Ceuta","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Conakry","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Dar es Salaam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Djibuti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"O Aiún","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Xohanesburgo","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Khartún","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lomé","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaca","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadixo","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monrovia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairobi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"N’Djamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nouakchott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Uagadugu","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto-Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"San Tomé","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Trípoli","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Tunes","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Anguila","id":"America/Anguilla"},{"value":"America/Antigua","name":"Antiga","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaína","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"A Rioxa","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Río Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucumán","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Asunción","id":"America/Asuncion"},{"value":"America/Bahia","name":"Baía","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahía de Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belém","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogotá","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancún","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Caiena","id":"America/Cayenne"},{"value":"America/Cayman","name":"Caimán","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Córdoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Costa Rica","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiabá","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Curaçao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominica","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepé","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"O Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Granada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Guadalupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Guatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guayaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Güiana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"A Habana","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianápolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Xamaica","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"A Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Os Ánxeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceió","id":"America/Maceio"},{"value":"America/Managua","name":"Managua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinica","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlán","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Mérida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Cidade de México","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevideo","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"Nova York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, Dacota do Norte","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, Dacota do Norte","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salem, Dacota do Norte","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panamá","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Porto Príncipe","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Porto España","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Porto Rico","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Río Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarém","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"São Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"Saint Barthélemy","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"Saint John’s","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"Saint Kitts","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"Santa Lucía","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"Saint Thomas","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"San Vicente","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Thule","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tórtola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Casey","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Davis","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Dumont-d’Urville","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Macquarie","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Mawson","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"McMurdo","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Palmer","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Rothera","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Syowa","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Troll","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Vostok","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Longyearbyen","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Adén","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Almati","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Amán","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Anadyr","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Aktau","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Aktobe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Achkhabad","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Atyrau","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Bagdad","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrain","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Bacú","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Bangkok","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Barnaul","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Beirut","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Bishkek","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Brunei","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Calcuta","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Chitá","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Choibalsan","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Colombo","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Damasco","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Dhaka","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Dili","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Dubai","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Dushanbe","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Famagusta","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Gaza","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Hebrón","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Hong Kong","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Hovd","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Irkutsk","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Iacarta","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Jayapura","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Xerusalén","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Cabul","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Kamchatka","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Karachi","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Katmandú","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Chandyga","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Krasnoyarsk","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lumpur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Kuching","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Kuwait","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Macau","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Magadan","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Makassar","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Manila","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Mascate","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nicosia","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Novokuznetsk","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Novosibirsk","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Omsk","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Oral","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Phnom Penh","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Pontianak","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Pyongyang","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Qatar","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Kyzylorda","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Yangon","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Riad","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Ho Chi Minh","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Sakhalin","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarcanda","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Seúl","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Shanghai","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Singapur","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Srednekolimsk","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Taipei","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Tashkent","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Tbilisi","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Teherán","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Thimbu","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tokyo","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Tomsk","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ulaanbaatar","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Urumqi","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ust-Nera","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Vientiane","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Vladivostok","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Iakutsk","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Ekaterinburgo","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Iereván","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Azores","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermudas","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Illas Canarias","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Cabo Verde","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Feroe","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Reiquiavik","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Xeorxia do Sur","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"Santa Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Adelaida","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Brisbane","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Broken Hill","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Currie","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Darwin","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Eucla","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Hobart","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Lindeman","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Lord Howe","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Melbourne","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Perth","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Sidney","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Horario universal coordinado","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Ámsterdan","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Andorra","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Astrakán","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Atenas","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Belgrado","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlín","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Bratislava","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Bruxelas","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Bucarest","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budapest","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Busingen","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Chisinau","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Copenhague","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Horario estándar irlandésDublín","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Xibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Guernsey","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsinqui","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Illa de Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istanbul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kaliningrado","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kiev","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Kirov","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Lisboa","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Liubliana","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Horario de verán británicoLondres","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Luxemburgo","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madrid","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Mariehamn","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Minsk","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Mónaco","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Moscova","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"París","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Podgorica","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Praga","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Roma","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Samara","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"San Marino","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Saraxevo","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Saratov","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Simferópol","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Skopje","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Sofía","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Estocolmo","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Tallinn","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Tirana","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Ulianovsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Úzhgorod","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Vaduz","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Vaticano","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Viena","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Vilnius","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Volgogrado","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Varsovia","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Zagreb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Zaporizhia","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Zürich","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Chagos","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Illa de Nadal","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Cocos","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Illas Comores","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Kerguelen","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Mahé","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Maldivas","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Mauricio","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Reunión","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Apia","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Auckland","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Bougainville","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Chatham","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Illa de Pascua","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Efate","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Enderbury","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Fakaofo","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Fidxi","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Funafuti","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Illas Galápagos","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Gambier","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Guadalcanal","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Guam","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"Honolulú","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Johnston","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Kiritimati","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Kosrae","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Kwajalein","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Majuro","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Marquesas","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Midway","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Nauru","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Niue","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Norfolk","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Noumea","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Pago Pago","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Palau","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Pitcairn","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Pohnpei","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Port Moresby","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Rarotonga","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Saipan","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Tahití","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Tarawa","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Tongatapu","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Chuuk","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Wake","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Wallis","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

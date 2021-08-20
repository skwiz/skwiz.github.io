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
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">لنبدأ المناقشة!</a> هناك ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
},
"one" : function(d){
var r = "";
r += "موضوع واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعان (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " و";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
},
"one" : function(d){
var r = "";
r += "منشور واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "منشوران (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". يحتاج الزوار إلى المزيد ليقرؤوه ويردوا عليه. إننا نقترح ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
},
"one" : function(d){
var r = "";
r += "موضوع واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعان (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " و";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
},
"one" : function(d){
var r = "";
r += "منشور واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "منشوران (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " على الأقل. يمكن لفريق العمل فقط رؤية هذه الرسالة.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">لنبدأ المناقشة!</a> هناك ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
},
"one" : function(d){
var r = "";
r += "موضوع واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعان (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". يحتاج الزوار إلى المزيد ليقرؤوه ويردوا عليه. إننا نقترح ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
},
"one" : function(d){
var r = "";
r += "موضوع واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعان (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوع";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " على الأقل. يمكن لفريق العمل فقط رؤية هذه الرسالة.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">لنبدأ المناقشة!</a> هناك ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
},
"one" : function(d){
var r = "";
r += "منشور واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "منشوران (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". يحتاج الزوار إلى المزيد ليقرؤوه ويردوا عليه. إننا نقترح ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
},
"one" : function(d){
var r = "";
r += "منشور واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "منشوران (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشورًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> منشور";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " على الأقل. يمكن لفريق العمل فقط رؤية هذه الرسالة.";
return r;
}, "logs_error_rate_notice.reached_hour_MF" : function(d){
var r = "";
r += "<b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["relativeAge"];
r += "</b> – لقد بلغ معدل الخطأ <a href='";
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
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الساعة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> حد إعدادات الموقع البالغ ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الساعة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "</b> – لقد بلغ معدل الخطأ <a href='";
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
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الدقيقة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الدقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> حد إعدادات الموقع البالغ ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الدقيقة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الدقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "</b> – لقد تجاوز معدل الخطأ <a href='";
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
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الساعة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> حد إعدادات الموقع البالغ ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الساعة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الساعة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "</b> – لقد تجاوز معدل الخطأ <a href='";
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
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الدقيقة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الدقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> حد إعدادات الموقع البالغ ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> خطأ/الدقيقة";
return r;
},
"one" : function(d){
var r = "";
r += "خطأ واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "خطآن (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")/الدقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء/الدقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ/الدقيقة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "هناك ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "replyCount";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> رد";
return r;
},
"one" : function(d){
var r = "";
r += "رد واحد (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "ردَّان (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ردود";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ردًا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> رد";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " والوقت المقدَّر للقراءة هو <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "readingTime";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> دقيقة";
return r;
},
"one" : function(d){
var r = "";
r += "دقيقة واحدة (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"two" : function(d){
var r = "";
r += "دقيقتان (<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong>)";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> دقائق";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> دقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> دقيقة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "متبقٍ ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "UNREAD";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
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
})() + " موضوع غير مقروء</a>";
return r;
},
"one" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>موضوع واحد غير مقروء (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")</a>";
return r;
},
"two" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>موضوعان غير مقروءَين (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")</a>";
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
})() + " موضوعات غير مقروءة</a>";
return r;
},
"many" : function(d){
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
})() + " موضوعًا غير مقروء</a>";
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
})() + " موضوع غير مقروء</a>";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " و";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "NEW";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوع جديد</a>";
return r;
},
"one" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>موضوع واحد جديد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")</a>";
return r;
},
"two" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>موضوعان جديدان (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")</a>";
return r;
},
"few" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوعات جديدة</a>";
return r;
},
"many" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوعًا جديدًا</a>";
return r;
},
"other" : function(d){
var r = "";
r += "<a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/new'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوع جديد</a>";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "، أو ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "يمكنك تصفُّح الموضوعات الأخرى في ";
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
r += "أنت على وشك حذف ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> منشور";
return r;
},
"one" : function(d){
var r = "";
r += "منشور واحد (<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b>)";
return r;
},
"two" : function(d){
var r = "";
r += "منشوران (<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b>)";
return r;
},
"few" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> منشورات";
return r;
},
"many" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> منشورًا";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> منشور";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " و";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> موضوع";
return r;
},
"one" : function(d){
var r = "";
r += "موضوع واحد (<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b>)";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعان (<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b>)";
return r;
},
"few" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> موضوعات";
return r;
},
"many" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> موضوعًا";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> موضوع";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " من هذا المستخدم، وإزالة حسابه، وحظر عمليات الاشتراك من عنوان IP الخاص به <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b>، وإضافة عنوان بريده الإلكتروني <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> إلى قائمة الحظر الدائمة. هل أنت متأكد من أن هذا المستخدم هو بالفعل صاحب الأسلوب غير المرغوب فيه؟";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "يتضمَّن هذا الموضوع ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "count";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " رد";
return r;
},
"one" : function(d){
var r = "";
r += "ردًا واحدًا (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
},
"two" : function(d){
var r = "";
r += "ردَّين (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " ردود";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " ردًا";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " رد";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "بمعدل إعجابات مرتفع على المنشورات";
return r;
},
"med" : function(d){
var r = "";
r += "بمعدل إعجابات مرتفع جدًا على المنشورات";
return r;
},
"high" : function(d){
var r = "";
r += "بمعدل إعجابات مرتفع للغاية على المنشورات";
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
r += "أنت على وشك حذف ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " منشور";
return r;
},
"one" : function(d){
var r = "";
r += "منشور واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
},
"two" : function(d){
var r = "";
r += "منشوران (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " منشورات";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " منشورًا";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " منشور";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " و";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوع";
return r;
},
"one" : function(d){
var r = "";
r += "موضوع واحد (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعان (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوعات";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوعًا";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " موضوع";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". هل أنت متأكد؟";
return r;
}};
MessageFormat.locale.ar = function(n) {
  if (n === 0) {
    return 'zero';
  }
  if (n == 1) {
    return 'one';
  }
  if (n == 2) {
    return 'two';
  }
  if ((n % 100) >= 3 && (n % 100) <= 10 && n == Math.floor(n)) {
    return 'few';
  }
  if ((n % 100) >= 11 && (n % 100) <= 99 && n == Math.floor(n)) {
    return 'many';
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

I18n.translations = {"ar":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"‏%n ‏%u","units":{"byte":{"zero":"بايت","one":"بايت","two":"بايت","few":"بايت","many":"بايت","other":"بايت"},"gb":"غ.ب","kb":"ك.ب","mb":"م.ب","tb":"ت.ب"}}},"short":{"thousands":"%{number} ألف","millions":"%{number} مليون"}},"dates":{"time":"h:mm ‏a","time_with_zone":"hh:mm a (z)","time_short_day":"dddd، h:mm a","timeline_date":"MMMM ‏YYYY","long_no_year":"D ‏MMMM، ‏h:mm ‏a","long_no_year_no_time":"D ‏MMMM","full_no_year_no_time":"D ‏MMMM","long_with_year":"D ‏MMMM ‏YYYY، ‏h:mm ‏a","long_with_year_no_time":"D ‏MMMM ‏YYYY","full_with_year_no_time":"D ‏MMMM ‏YYYY","long_date_with_year":"D ‏MMMM ‏YYYY، ‏LT","long_date_without_year":"D ‏MMMM، LT","long_date_with_year_without_time":"D ‏MMMM ‏YYYY","long_date_without_year_with_linebreak":"D MMMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D ‏MMMM ‏YYYY \u003cbr/\u003eLT","wrap_ago":"منذ %{date}","wrap_on":"في %{date}","tiny":{"half_a_minute":"\u003c 1د","less_than_x_seconds":{"zero":"\u003c %{count} ث","one":"\u003c %{count} ث","two":"\u003c %{count} ث","few":"\u003c %{count} ث","many":"\u003c %{count} ث","other":"\u003c %{count} ث"},"x_seconds":{"zero":"%{count} ث","one":"%{count} ث","two":"%{count} ث","few":"%{count} ث","many":"%{count} ث","other":"%{count} ث"},"less_than_x_minutes":{"zero":"\u003c %{count} د","one":"\u003c %{count} د","two":"\u003c %{count} د","few":"\u003c %{count} د","many":"\u003c %{count} د","other":"\u003c %{count} د"},"x_minutes":{"zero":"%{count} د","one":"%{count} د","two":"%{count} د","few":"%{count} د","many":"%{count} د","other":"%{count} د"},"about_x_hours":{"zero":"%{count} س","one":"%{count} س","two":"%{count} س","few":"%{count} س","many":"%{count} س","other":"%{count} س"},"x_days":{"zero":"%{count} ي","one":"%{count} ي","two":"%{count} ي","few":"%{count} ي","many":"%{count} ي","other":"%{count} ي"},"x_months":{"zero":"%{count} ش","one":"%{count} ش","two":"%{count} ش","few":"%{count} ش","many":"%{count} ش","other":"%{count} ش"},"about_x_years":{"zero":"%{count} ع","one":"%{count} ع","two":"%{count} ع","few":"%{count} ع","many":"%{count} ع","other":"%{count} ع"},"over_x_years":{"zero":"\u003e %{count} ع","one":"\u003e %{count} ع","two":"\u003e %{count} ع","few":"\u003e %{count} ع","many":"\u003e %{count} ع","other":"\u003e %{count} ع"},"almost_x_years":{"zero":"%{count} ع","one":"%{count} ع","two":"%{count} ع","few":"%{count} ع","many":"%{count} ع","other":"%{count} ع"},"date_month":"D ‏MMMM","date_year":"MMMM ‏YYYY"},"medium":{"x_minutes":{"zero":"%{count} دقيقة","one":"دقيقة واحدة (%{count})","two":"دقيقتان (%{count})","few":"%{count} دقائق","many":"%{count} دقيقة","other":"%{count} دقيقة"},"x_hours":{"zero":"%{count} ساعة","one":"ساعة واحدة (%{count})","two":"ساعتان (%{count})","few":"%{count} ساعات","many":"%{count} ساعة","other":"%{count} ساعة"},"x_days":{"zero":"%{count} يوم","one":"يوم واحد (%{count})","two":"يومان (%{count})","few":"%{count} أيام","many":"%{count} يومًا","other":"%{count} يوم"},"date_year":"D ‏MMMM ‏YYYY"},"medium_with_ago":{"x_minutes":{"zero":"منذ %{count} دقيقة","one":"منذ دقيقة واحدة (%{count})","two":"منذ دقيقتين (%{count})","few":"منذ %{count} دقائق","many":"منذ %{count} دقيقة","other":"منذ %{count} دقيقة"},"x_hours":{"zero":"منذ %{count} ساعة","one":"منذ ساعة واحدة (%{count})","two":"منذ ساعتين (%{count})","few":"منذ %{count} ساعات","many":"منذ %{count} ساعة","other":"منذ %{count} ساعة"},"x_days":{"zero":"منذ %{count} يوم","one":"منذ يوم واحد (%{count})","two":"منذ يومين (%{count})","few":"منذ %{count} أيام","many":"منذ %{count} يومًا","other":"منذ %{count} يوم"},"x_months":{"zero":"منذ %{count} شهر","one":"منذ شهر واحد (%{count})","two":"منذ شهرين (%{count})","few":"منذ %{count} أشهر","many":"منذ %{count} شهرًا","other":"منذ %{count} شهر"},"x_years":{"zero":"منذ %{count} عام","one":"منذ عام واحد (%{count})","two":"منذ عامين (%{count})","few":"منذ %{count} أعوام","many":"منذ %{count} عامًا","other":"منذ %{count} عام"}},"later":{"x_days":{"zero":"بعد %{count} يوم","one":"بعد يوم واحد (%{count})","two":"بعد يومين (%{count})","few":"بعد %{count} أيام","many":"بعد %{count} يومًا","other":"بعد %{count} يوم"},"x_months":{"zero":"بعد %{count} شهر","one":"بعد شهر واحد (%{count})","two":"بعد شهرين (%{count})","few":"بعد %{count} أشهر","many":"بعد %{count} شهرًا","other":"بعد %{count} شهر"},"x_years":{"zero":"بعد %{count} عام","one":"بعد عام واحد (%{count})","two":"بعد عامين (%{count})","few":"بعد %{count} أعوام","many":"بعد %{count} عامًا","other":"بعد %{count} سنة"}},"previous_month":"الشهر الماضي","next_month":"الشهر القادم","placeholder":"التاريخ"},"share":{"topic_html":"الموضوع: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"المنشور #%{postNumber}","close":"إغلاق","twitter":"المشاركة على Twitter","facebook":"المشاركة على Facebook","email":"المشاركة عبر البريد الإلكتروني","url":"نسخ عنوان URL ومشاركته"},"action_codes":{"public_topic":"جعل هذا الموضوع عامًا في %{when}","private_topic":"حوَّل هذا الموضوع إلى رسالة خاصة في %{when}","split_topic":"قسَّم هذا الموضوع في %{when}","invited_user":"دعا %{who} في ‏%{when}","invited_group":"دعا %{who} في ‏%{when}","user_left":"أزال %{who} نفسه من هذه الرسالة في %{when}","removed_user":"أزال %{who} ‏في %{when}","removed_group":"أزال %{who} ‏في %{when}","autobumped":"رُفِع تلقائيًا في %{when}","autoclosed":{"enabled":"تم إغلاقه في %{when}","disabled":"تم فتحه في %{when}"},"closed":{"enabled":"تم إغلاقه في %{when}","disabled":"تم فتحه في %{when}"},"archived":{"enabled":"تمت أرشفته في %{when}","disabled":"تم إلغاء أرشفته في %{when}"},"pinned":{"enabled":"تم تثبيته في %{when}","disabled":"تم إلغاء تثبيته في %{when}"},"pinned_globally":{"enabled":"تم تثبيته بشكلٍ عام في %{when}","disabled":"تم إلغاء تثبيته في %{when}"},"visible":{"enabled":"تم الإدراج في %{when}","disabled":"تم إلغاء الإدراج في %{when}"},"banner":{"enabled":"حوَّل هذا الموضوع إلى بانر في %{when}. سيظهر أعلى كل صفحة حتى يُزيله المستخدم.","disabled":"أزال هذا البانر في %{when}. ولن يظهر بعد الآن في أعلى كل صفحة."},"forwarded":"أعاد توجيه الرسالة الإلكترونية أعلاه"},"topic_admin_menu":"إجراءات الموضوع","wizard_required":"مرحبًا بك في Discourse! لنبدأ من \u003ca href='%{url}' data-auto-route='true'\u003eمعالج الإعداد\u003c/a\u003e ✨","emails_are_disabled":"أوقف أحد المسؤولين البريد الصادر بشكلٍ عام. ولن يتم إرسال إشعارات عبر البريد الإلكتروني أيًا كان نوعها.","software_update_prompt":{"message":"لقد حدَّثنا هذا الموقع، \u003cspan\u003eيُرجى التحديث \u003c/span\u003e، أو قد تواجه سلوكًا غير متوقَّع.","dismiss":"تجاهل"},"bootstrap_mode_enabled":{"zero":"أنت في وضع تمهيد التشغيل لتسهيل إطلاق موقعك الجديد. سيتم منح جميع المستخدمين الجُدد مستوى الثقة 1 وتفعيل الرسائل الإلكترونية التلخيصية لهم. وسيتم إيقاف هذا الوضع تلقائيًا عند انضمام %{count} مستخدم.","one":"أنت في وضع تمهيد التشغيل لتسهيل إطلاق موقعك الجديد. سيتم منح جميع المستخدمين الجُدد مستوى الثقة 1 وتفعيل الرسائل الإلكترونية التلخيصية لهم. وسيتم إيقاف هذا الوضع تلقائيًا عند انضمام مستخدم واحد (%{count}).","two":"أنت في وضع تمهيد التشغيل لتسهيل إطلاق موقعك الجديد. سيتم منح جميع المستخدمين الجُدد مستوى الثقة 1 وتفعيل الرسائل الإلكترونية التلخيصية لهم. وسيتم إيقاف هذا الوضع تلقائيًا عند انضمام مستخدمَين (%{count}).","few":"أنت في وضع تمهيد التشغيل لتسهيل إطلاق موقعك الجديد. سيتم منح جميع المستخدمين الجُدد مستوى الثقة 1 وتفعيل الرسائل الإلكترونية التلخيصية لهم. وسيتم إيقاف هذا الوضع تلقائيًا عند انضمام %{count} مستخدمين.","many":"أنت في وضع تمهيد التشغيل لتسهيل إطلاق موقعك الجديد. سيتم منح جميع المستخدمين الجُدد مستوى الثقة 1 وتفعيل الرسائل الإلكترونية التلخيصية لهم. وسيتم إيقاف هذا الوضع تلقائيًا عند انضمام %{count} مستخدمًا.","other":"أنت في وضع تمهيد التشغيل لتسهيل إطلاق موقعك الجديد. سيتم منح جميع المستخدمين الجُدد مستوى الثقة 1 وتفعيل الرسائل الإلكترونية التلخيصية لهم. وسيتم إيقاف هذا الوضع تلقائيًا عند انضمام %{count} مستخدم."},"bootstrap_mode_disabled":"سيتم إيقاف وضع تمهيد التشغيل خلال 24 ساعة.","themes":{"default_description":"افتراضي","broken_theme_alert":"قد لا يعمل الموقع كما ينبغي بسبب وجود أخطاء في السمة/المكوِّن %{theme}. أوقفه من %{path}."},"s3":{"regions":{"ap_northeast_1":"آسيا والمحيط الهادئ (طوكيو)","ap_northeast_2":"آسيا والمحيط الهادئ (سول)","ap_east_1":"آسيا والمحيط الهادئ (هونغ كونغ)","ap_south_1":"آسيا والمحيط الهادئ (مومباي)","ap_southeast_1":"آسيا والمحيط الهادئ (سنغافورة)","ap_southeast_2":"آسيا والمحيط الهادئ (سيدني)","ca_central_1":"كندا (الوسطى)","cn_north_1":"الصين (بكّين)","cn_northwest_1":"الصين (نينغشيا)","eu_central_1":"الاتحاد الأوروبي (فرانكفورت)","eu_north_1":"الاتحاد الأوروبي (ستوكهولم)","eu_west_1":"الاتحاد الأوروبي (إيرلندا)","eu_west_2":"الاتحاد الأوروبي (لندن)","eu_west_3":"الاتحاد الأوروبي (باريس)","sa_east_1":"أمريكا الجنوبية (ساو باولو)","us_east_1":"شرق الولايات المتحدة (فيرجينيا الشمالية)","us_east_2":"غرب الولايات المتحدة (أوهايو)","us_gov_east_1":"AWS GovCloud ‏(شرق الولايات المتحدة)","us_gov_west_1":"AWS GovCloud ‏(غرب الولايات المتحدة)","us_west_1":"غرب الولايات المتحدة (كاليفورنيا الشمالية)","us_west_2":"غرب الولايات المتحدة (أوريغون)"}},"clear_input":"مسح الإدخال","edit":"عدَّل عنوان هذا الموضوع وفئته","expand":"وسّع","not_implemented":"عذرًا، لم يتم تنفيذ هذه الميزة بعد.","no_value":"لا","yes_value":"نعم","submit":"إرسال","generic_error":"عذرًا، حدث خطأ.","generic_error_with_reason":"حدث خطأ: %{error}","sign_up":"الاشتراك","log_in":"تسجيل الدخول","age":"العمر","joined":"تاريخ الانضمام","admin_title":"المسؤول","show_more":"عرض المزيد","show_help":"الخيارات","links":"الروابط","links_lowercase":{"zero":"رابط","one":"رابط واحد","two":"رابطان","few":"روابط","many":"روابط","other":"روابط"},"faq":"الأسئلة الشائعة","guidelines":"الإرشادات","privacy_policy":"سياسة الخصوصية","privacy":"الخصوصية","tos":"شروط الخدمة","rules":"القواعد","conduct":"قواعد السلوك","mobile_view":"العرض على الجوَّال","desktop_view":"العرض على كمبيوتر سطح المكتب","or":"أو","now":"الآن","read_more":"قراءة المزيد","more":"المزيد","x_more":{"zero":"%{count} أكثر","one":"%{count} أكثر","two":"%{count} أكثر","few":"%{count} أكثر","many":"%{count} أكثر","other":"%{count} أكثر"},"never":"أبدًا","every_30_minutes":"كل 30 دقيقة","every_hour":"كل ساعة","daily":"يوميًا","weekly":"أسبوعيًا","every_month":"كل شهر","every_six_months":"كل ستة أشهر","max_of_count":"%{count} كحدٍ أقصى","character_count":{"zero":"%{count} حرف","one":"حرف واحد (%{count})","two":"حرفان (%{count})","few":"%{count} أحرف","many":"%{count} حرفًا","other":"%{count} حرف"},"related_messages":{"title":"الرسائل ذات الصلة","see_all":"عرض \u003ca href=\"%{path}\"\u003eكل الرسائل\u003c/a\u003e من ⁨@%{username}⁩..."},"suggested_topics":{"title":"الموضوعات المقترحة","pm_title":"الرسائل المقترحة"},"about":{"simple_title":"نبذة","title":"نبذة عن %{title}","stats":"إحصاءات الموقع","our_admins":"مسؤولونا","our_moderators":"مشرفونا","moderators":"المشرفون","stat":{"all_time":"طوال الوقت","last_day":"آخر 24 ساعة","last_7_days":"آخر 7 أيام","last_30_days":"آخر 30 يومًا"},"like_count":"الإعجابات","topic_count":"الموضوعات","post_count":"المنشورات","user_count":"المستخدمون","active_user_count":"المستخدمون النشطون","contact":"تواصل معنا","contact_info":"في حال حدوث مشكلة خطيرة أو أمر عاجل يؤثر على الموقع، يُرجى مراسلتنا على %{contact_info}."},"bookmarked":{"title":"وضع إشارة مرجعية","edit_bookmark":"تعديل الإشارة المرجعية","clear_bookmarks":"مسح الإشارات المرجعية","help":{"bookmark":"انقر لإضافة إشارة مرجعية على المنشور الأول في هذا الموضوع","edit_bookmark":"انقر لتعديل الإشارة المرجعية في هذا الموضوع","unbookmark":"انقر لإزالة كل الإشارات المرجعية في هذا الموضوع","unbookmark_with_reminder":"انقر لإزالة جميع الإشارات المرجعية والتذكيرات في هذا الموضوع."}},"bookmarks":{"created":"لقد وضعت إشارة مرجعية على هذا المنشور. %{name}","not_bookmarked":"وضع إشارة مرجعية على هذا المنشور","created_with_reminder":"لقد وضعت إشارة مرجعية على هذا المنشور وضبطت تذكيرًا في %{date}. ‏%{name}","remove":"إزالة الإشارة المرجعية","delete":"حذف الإشارة المرجعية","confirm_delete":"هل تريد بالتأكيد حذف هذه الإشارة المرجعية؟ سيتم حذف التذكير أيضًا.","confirm_clear":"هل تريد بالتأكيد مسح كل إشاراتك المرجعية من هذا الموضوع؟","save":"حفظ","no_timezone":"لم تحدد منطقتك الزمنية بعد. ولن تتمكن من ضبط التذكيرات. حدِّد منطقة زمنية \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eفي ملفك الشخصي\u003c/a\u003e.","invalid_custom_datetime":"التاريخ والوقت الذين أدخلتهما غير صالحين، يُرجى إعادة المحاولة.","list_permission_denied":"ليس لديك إذن بعرض الإشارات المرجعية لهذا المستخدم.","no_user_bookmarks":"ليس لديك منشورات موضوع عليها إشارة مرجعية. تتيح لك الإشارات المرجعية الرجوع إلى المنشورات التي تريدها بسرعة.","auto_delete_preference":{"label":"الحذف التلقائي","never":"أبدًا","when_reminder_sent":"بعد إرسال التذكير","on_owner_reply":"بعد أن أردَّ على هذا الموضوع"},"search_placeholder":"البحث عن الإشارات المرجعية بالاسم أو عنوان الموضوع أو محتوى المنشور","search":"البحث","reminders":{"today_with_time":"اليوم في الساعة %{time}","tomorrow_with_time":"غدًا في الساعة %{time}","at_time":"بتاريخ %{date_time}","existing_reminder":"لقد ضبطت تذكيرًا لهذه الإشارة المرجعية، وسيتم إرساله إليك في %{at_date_time}"}},"copy_codeblock":{"copied":"تم النسخ!"},"drafts":{"label":"المسودات","label_with_count":"المسودات (%{count})","resume":"استئناف","remove":"إزالة","remove_confirmation":"هل تريد بالتأكيد حذف هذه المسودة؟","new_topic":"مسودة موضوع جديد","new_private_message":"مسودة رسالة خاصة جديدة","topic_reply":"مسودة الرد","abandon":{"confirm":"لديك مسودة محفوظة لهذا الموضوع. ماذا تريد أن تفعل بها؟","yes_value":"تجاهل","no_value":"استئناف التعديل"}},"topic_count_latest":{"zero":"عرض %{count} موضوع جديد أو محدَّث","one":"عرض موضوع واحد (%{count}) جديد أو محدَّث","two":"عرض موضوعين (%{count}) جديدين أو محدَّثين","few":"عرض %{count} موضوعات جديدة أو محدَّثة","many":"عرض %{count} موضوعًا جديدًا أو محدَّثًا","other":"عرض %{count} موضوع جديد أو محدَّث"},"topic_count_unread":{"zero":"عرض %{count} موضوع غير مقروء","one":"عرض موضوع واحد (%{count}) غير مقروء","two":"عرض موضوعين (%{count}) غير مقروءين","few":"عرض %{count} موضوعات غير مقروءة","many":"عرض %{count} موضوعًا غير مقروء","other":"عرض %{count} موضوع غير مقروء"},"topic_count_new":{"zero":"عرض %{count} موضوع جديد","one":"عرض موضوع واحد (%{count}) جديد","two":"عرض موضوعين (%{count}) جديدين","few":"عرض %{count} موضوعات جديدة","many":"عرض %{count} موضوعًا جديدًا","other":"عرض %{count} موضوع جديد"},"preview":"معاينة","cancel":"إلغاء","deleting":"جارٍ الحذف...","save":"حفظ التغييرات","saving":"جارٍ الحفظ...","saved":"تم الحفظ!","upload":"تحميل","uploading":"جارٍ التحميل...","uploading_filename":"جارٍ تحميل: %{filename}...","processing_filename":"قيد المعالجة: %{filename}...","clipboard":"الحافظة","uploaded":"تم التحميل!","pasting":"جارٍ اللصق...","enable":"تفعيل","disable":"إيقاف","continue":"متابعة","undo":"تراجع","revert":"تراجع","failed":"فشل","switch_to_anon":"دخول وضع التخفي","switch_from_anon":"الخروج من وضع التخفي","banner":{"close":"إزالة هذا البانر","edit":"تعديل هذا البانر \u003e\u003e"},"pwa":{"install_banner":"هل تريد \u003ca href\u003eتثبيت %{title} على هذا الجهاز؟\u003c/a\u003e"},"choose_topic":{"none_found":"لم يتم العثور على أي موضوع.","title":{"search":"البحث عن موضوع","placeholder":"اكتب هنا عنوان الموضوع أو عنوان URL له أو مُعرِّفه"}},"choose_message":{"none_found":"لم يتم العثور على أي رسالة.","title":{"search":"البحث عن رسالة","placeholder":"اكتب عنوان الرسالة أو عنوان URL أو المُعرِّف هنا"}},"review":{"order_by":"الترتيب حسب","in_reply_to":"ردًا على","explain":{"why":"اشرح سبب دخول هذا العنصر في قائمة الانتظار","title":"التقييم القابل للمراجعة","formula":"المعادلة","subtotal":"الإجمالي الفرعي","total":"الإجمالي","min_score_visibility":"الحد الأدنى من النقاط للرؤية","score_to_hide":"النقاط اللازمة لإخفاء المنشور","take_action_bonus":{"name":"اتخذ إجراءً","title":"عندما يقرر أحد أعضاء فريق العمل اتخاذ إجراء، يتم منح مكافأة على البلاغ."},"user_accuracy_bonus":{"name":"دقة المستخدم","title":"يحصل المستخدمون الذين تم التحقُّق من صحة بلاغاتهم بشكلٍ متكرر على مكافأة."},"trust_level_bonus":{"name":"مستوى الثقة","title":"تحظى العناصر القابلة للمراجعة التي أنشأها مستخدمون من مستوى ثقة أعلى بنقاط أعلى."},"type_bonus":{"name":"مكافأة النوع","title":"يمكن لفريق العمل تخصيص مكافأة لبعض الأنواع القابلة للمراجعة لمنحها أولوية أعلى."}},"stale_help":"تم إجراء هذه المراجعة بواسطة \u003cb\u003e%{username}\u003c/b\u003e.","claim_help":{"optional":"يمكنك المطالبة بهذا العنصر لمنع الآخرين من مراجعته.","required":"يجب عليك المطالبة بالعناصر قبل أن تتمكن من مراجعتها.","claimed_by_you":"لقد طالبت بهذا العنصر ويمكنك مراجعته.","claimed_by_other":"لا يمكن مراجعة هذا العنصر إلا بواسطة \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"المطالبة بهذا الموضوع"},"unclaim":{"help":"إزالة هذه المطالبة"},"awaiting_approval":"في انتظار الموافقة","delete":"حذف","settings":{"saved":"تم الحفظ","save_changes":"حفظ التغييرات","title":"الإعدادات","priorities":{"title":"الأولويات القابلة للمراجعة"}},"moderation_history":"تاريخ الإشراف","view_all":"عرض الكل","grouped_by_topic":"مجمَّعة حسب الموضوع","none":"لا توجد عناصر لمراجعتها.","view_pending":"عرض قائمة الانتظار","topic_has_pending":{"zero":"يتضمَّن هذا الموضوع \u003cb\u003e%{count}\u003c/b\u003e منشور في انتظار الموافقة","one":"يتضمَّن هذا الموضوع منشورًا واحدًا (\u003cb\u003e%{count}\u003c/b\u003e) في انتظار الموافقة","two":"يتضمَّن هذا الموضوع منشورَين (\u003cb\u003e%{count}\u003c/b\u003e) في انتظار الموافقة","few":"يتضمَّن هذا الموضوع \u003cb\u003e%{count}\u003c/b\u003e منشورات في انتظار الموافقة","many":"يتضمَّن هذا الموضوع \u003cb\u003e%{count}\u003c/b\u003e منشورًا في انتظار الموافقة","other":"يتضمَّن هذا الموضوع \u003cb\u003e%{count}\u003c/b\u003e منشور في انتظار الموافقة"},"title":"المراجعة","topic":"الموضوع:","filtered_topic":"لقد قمت بالتصفية لعرض المحتوى القابل للمراجعة في موضوع واحد.","filtered_user":"المستخدم","filtered_reviewed_by":"تمت المراجعة بواسطة","show_all_topics":"عرض جميع الموضوعات","deleted_post":"(تم حذف المنشور)","deleted_user":"(تم حذف المستخدم)","user":{"bio":"النبذة التعريفية","website":"الموقع الإلكتروني","username":"اسم المستخدم","email":"البريد الإلكتروني","name":"الاسم","fields":"الحقول","reject_reason":"السبب"},"user_percentage":{"summary":{"zero":"%{agreed}، %{disagreed}، %{ignored} (من آخر %{count} بلاغ)","one":"%{agreed}، %{disagreed}، %{ignored} (من آخر بلاغ)","two":"%{agreed}، %{disagreed}، %{ignored} (من آخر بلاغين (%{count}))","few":"%{agreed}، %{disagreed}، %{ignored} (من آخر %{count} بلاغات)","many":"%{agreed}، %{disagreed}، %{ignored} (من آخر %{count} بلاغًا)","other":"%{agreed}، %{disagreed}، %{ignored} (من آخر %{count} بلاغ)"},"agreed":{"zero":"%{count}% اتفقوا","one":"%{count}% اتفقوا","two":"%{count}% اتفقوا","few":"%{count}% اتفقوا","many":"%{count}% اتفقوا","other":"%{count}% اتفقوا"},"disagreed":{"zero":"%{count}% لم يتفقوا","one":"%{count}% لم يتفقوا","two":"%{count}% لم يتفقوا","few":"%{count}% لم يتفقوا","many":"%{count}% لم يتفقوا","other":"%{count}% لم يتفقوا"},"ignored":{"zero":"%{count}% تجاهلوا","one":"%{count}% تجاهلوا","two":"%{count}% تجاهلوا","few":"%{count}% تجاهلوا","many":"%{count}% تجاهلوا","other":"%{count}% تجاهلوا"}},"topics":{"topic":"الموضوع","reviewable_count":"العدد","reported_by":"تم الإبلاغ بواسطة","deleted":"[تم حذف الموضوع]","original":"(الموضوع الأصلي)","details":"التفاصيل","unique_users":{"zero":"%{count} مستخدم","one":"مستخدم واحد (%{count})","two":"مستخدمان (%{count})","few":"%{count} مستخدمين","many":"%{count} مستخدمًا","other":"%{count} مستخدم"}},"replies":{"zero":"%{count} رد","one":"رد واحد (%{count})","two":"ردَّان (%{count})","few":"%{count} ردود","many":"%{count} ردًا","other":"%{count} رد"},"edit":"تعديل","save":"حفظ","cancel":"إلغاء","new_topic":"ستؤدي الموافقة على هذا العنصر إلى إنشاء موضوع جديد","filters":{"all_categories":"(كل الفئات)","type":{"title":"النوع","all":"(كل الأنواع)"},"minimum_score":"الحد الأدنى من النقاط:","refresh":"تحديث","status":"الحالة","category":"الفئة","orders":{"score":"النقاط","score_asc":"النقاط (عكسية)","created_at":"تاريخ الإنشاء","created_at_asc":"تاريخ الإنشاء (عكسي)"},"priority":{"title":"الحد الأدنى للأولوية","any":"(أي)","low":"منخفضة","medium":"متوسطة","high":"عالية"}},"conversation":{"view_full":"عرض المحادثة الكاملة"},"scores":{"about":"يتم احتساب هذه النقاط بناءً على مستوى الثقة للمُبلِغ، وصحة بلاغاته السابقة، وأولوية العنصر الذي يتم الإبلاغ عنه.","score":"النقاط","date":"التاريخ","type":"النوع","status":"الحالة","submitted_by":"تم الإرسال بواسطة","reviewed_by":"تمت المراجعة بواسطة"},"statuses":{"pending":{"title":"قيد الانتظار"},"approved":{"title":"تمت الموافقة"},"rejected":{"title":"تم الرفض"},"ignored":{"title":"تم التجاهل"},"deleted":{"title":"تم الحذف"},"reviewed":{"title":"(تمت مراجعة الكل)"},"all":{"title":"(كل شيء)"}},"types":{"reviewable_flagged_post":{"title":"المنشورات المُبلَغ عنها","flagged_by":"تم الإبلاغ بواسطة"},"reviewable_queued_topic":{"title":"موضوع في قائمة الانتظار"},"reviewable_queued_post":{"title":"منشور في قائمة الانتظار"},"reviewable_user":{"title":"المستخدم"},"reviewable_post":{"title":"المنشور"}},"approval":{"title":"المنشور بحاجة للموافقة","description":"لقد استلمنا منشورك الجديد، لكنه بحاجة إلى موافقة أحد المشرفين عليه قبل ظهوره. يُرجى الانتظار.","pending_posts":{"zero":"لديك \u003cstrong\u003e%{count}\u003c/strong\u003e منشور قيد الانتظار.","one":"لديك منشور واحد (\u003cstrong\u003e%{count}\u003c/strong\u003e) قيد الانتظار.","two":"لديك منشوران (\u003cstrong\u003e%{count}\u003c/strong\u003e) قيد الانتظار.","few":"لديك \u003cstrong\u003e%{count}\u003c/strong\u003e منشورات قيد الانتظار.","many":"لديك \u003cstrong\u003e%{count}\u003c/strong\u003e منشورًا قيد الانتظار.","other":"لديك \u003cstrong\u003e%{count}\u003c/strong\u003e منشور قيد الانتظار."},"ok":"حسنًا"},"example_username":"اسم المستخدم","reject_reason":{"title":"لماذا ترفض هذا المستخدم؟","send_email":"إرسال رسالة إلكترونية بالرفض"}},"relative_time_picker":{"minutes":{"zero":"الدقائق","one":"دقيقة واحدة","two":"الدقائق","few":"الدقائق","many":"الدقائق","other":"الدقائق"},"hours":{"zero":"الساعات","one":"ساعة واحدة","two":"الساعات","few":"الساعات","many":"الساعات","other":"الساعات"},"days":{"zero":"يوم","one":"يوم واحد","two":"يومان","few":"أيام","many":"يومًا","other":"يوم"},"months":{"zero":"شهر","one":"شهر","two":"شهران","few":"أشهر","many":"شهرًا","other":"شهر"},"years":{"zero":"عام","one":"عام","two":"عامان","few":"أعوام","many":"عامًا","other":"عام"},"relative":"نسبي"},"time_shortcut":{"later_today":"لاحقًا اليوم","next_business_day":"يوم العمل التالي","tomorrow":"غدًا","post_local_date":"التاريخ في المنشور","later_this_week":"لاحقًا هذا الأسبوع","this_weekend":"عطلة هذا الأسبوع","start_of_next_business_week":"الاثنين","start_of_next_business_week_alt":"الاثنين القادم","two_weeks":"أسبوعان","next_month":"الشهر القادم","six_months":"ستة أشهر","custom":"تاريخ ووقت مخصَّصان","relative":"وقت نسبي","none":"لا حاجة إليه","last_custom":"آخر تاريخ ووقت مخصَّصين"},"user_action":{"user_posted_topic":"نشر \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e ‏\u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eأنت\u003c/a\u003e نشرت ‏\u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","user_replied_to_post":"ردَّ \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e على \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eأنت\u003c/a\u003e رددت على \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"ردَّ \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e على \u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eأنت\u003c/a\u003e رددت على \u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","user_mentioned_user":"أشار \u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e إلى \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"أشار \u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e‏ \u003ca href='%{user2Url}'\u003eإليك\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eأنت\u003c/a\u003e أشرت إلى \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"نشره \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"نشرته \u003ca href='%{userUrl}'\u003eأنت\u003c/a\u003e","sent_by_user":"أرسلها \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"أرسلتها \u003ca href='%{userUrl}'\u003eأنت\u003c/a\u003e"},"directory":{"username":"اسم المستخدم","filter_name":"التصفية حسب اسم المستخدم","title":"المستخدمون","likes_given":"الممنوحة","likes_received":"المتلقاة","topics_entered":"المعروضة","topics_entered_long":"الموضوعات المعروضة","time_read":"وقت القراءة","topic_count":"الموضوعات","topic_count_long":"الموضوعات المنشأة","post_count":"الردود","post_count_long":"الردود المنشورة","no_results":"لم يتم العثور على أي نتيجة.","days_visited":"الزيارات","days_visited_long":"أيام الزيارة","posts_read":"المقروءة","posts_read_long":"المنشورات المقروءة","last_updated":"آخر تحديث:","total_rows":{"zero":"%{count} مستخدم","one":"مستخدم واحد (%{count})","two":"مستخدمان (%{count})","few":"%{count} مستخدمين","many":"%{count} مستخدمًا","other":"%{count} مستخدم"},"edit_columns":{"title":"تعديل أعمدة الدليل","save":"حفظ","reset_to_default":"إعادة الضبط على الافتراضي"},"group":{"all":"كل المجموعات"}},"group_histories":{"actions":{"change_group_setting":"تغيير إعدادات المجموعة","add_user_to_group":"إضافة مستخدم","remove_user_from_group":"إزالة مستخدم","make_user_group_owner":"التعيين كمالك","remove_user_as_group_owner":"إلغاء التعيين كمالك"}},"groups":{"member_added":"تمت الإضافة","member_requested":"تاريخ الطلب","add_members":{"title":"إضافة مستخدمين إلى %{group_name}","description":"أدخل قائمة المستخدمين الذين تريد دعوتهم إلى المجموعة أو الصقها في قائمة مفصولة بفاصلات:","usernames_placeholder":"اسم المستخدمين","usernames_or_emails_placeholder":"أسماء المستخدمين أو عناوين البريد الإلكتروني","notify_users":"إشعار المستخدمين","set_owner":"تعيين المستخدمين كمالكين لهذه المجموعة"},"requests":{"title":"الطلبات","reason":"السبب","accept":"قبول","accepted":"تم القبول","deny":"رفض","denied":"تم الرفض","undone":"تم التراجع عن الطلب","handle":"التعامل مع طلب العضوية"},"manage":{"title":"إدارة","name":"الاسم","full_name":"الاسم بالكامل","add_members":"إضافة مستخدمين","invite_members":"دعوة","delete_member_confirm":"هل تريد إزالة \"%{username}\" من المجموعة \"%{group}\"؟","profile":{"title":"الملف الشخصي"},"interaction":{"title":"التفاعل","posting":"النشر","notification":"الإشعارات"},"email":{"title":"البريد الإلكتروني","status":"تمت مزامنة %{old_emails}/%{total_emails} من الرسائل الإلكترونية عبر IMAP.","enable_smtp":"تفعيل SMTP","enable_imap":"تفعيل IMAP","test_settings":"إعدادات الاختبار","save_settings":"إعدادات الحفظ","last_updated":"آخر تحديث:","last_updated_by":"بواسطة","settings_required":"جميع الإعدادات مطلوبة، يُرجى ملء جميع الحقول قبل التحقُّق.","smtp_settings_valid":"إعدادات SMTP صالحة.","smtp_title":"SMTP","smtp_instructions":"عند تمكين SMTP للمجموعة، سيتم إرسال جميع الرسائل الإلكترونية الصادرة المُرسَلة من صندوق الوارد الخاص بالمجموعة عبر إعدادات SMTP المحدَّدة هنا بدلًا من خادم البريد الذي تم إعداده للرسائل الإلكترونية الأخرى التي يرسلها منتداك.","imap_title":"IMAP","imap_additional_settings":"إعدادات إضافية","imap_instructions":"عند تمكين IMAP للمجموعة، تتم مزامنة الرسائل الإلكترونية بين صندوق الوارد للمجموعة وخادم IMAP وصندوق البريد المقدَّمين. يجب تفعيل SMTP باستخدام بيانات اعتماد صالحة ومُختبَرة قبل تفعيل IMAP. سيتم استخدام اسم مستخدم البريد الإلكتروني وكلمة المرور المستخدمين لخادم SMTP في خادم IMAP. لمزيد من المعلومات، راجع \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003eإعلان الميزة في Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"تحذير: هذه الميزة في مرحلة الإصدار الأولي. ويتم دعم Gmail فقط بشكلٍ رسمي. استخدمها على مسؤوليتك الخاصة!","imap_settings_valid":"إعدادات IMAP صالحة.","smtp_disable_confirm":"إذا أوقفت SMTP، فستتم إعادة ضبط جميع إعدادات SMTP وIMAP وإيقاف الوظائف المرتبطة. هل تريد بالتأكيد الاستمرار؟","imap_disable_confirm":"إذا أوقفت IMAP، فستتم إعادة ضبط جميع إعدادات IMAP وإيقاف الوظائف المرتبطة. هل تريد بالتأكيد الاستمرار؟","imap_mailbox_not_selected":"يجب تحديد صندوق بريد لإعداد خادم IMAP وإلا فلن تتم مزامنة أي صناديق بريد!","prefill":{"title":"الملء المسبق بإعدادات:","gmail":"GMail"},"credentials":{"title":"بيانات الاعتماد","smtp_server":"خادم SMTP","smtp_port":"منفذ SMTP","smtp_ssl":"استخدام SSL لخادم SMTP","imap_server":"خادم IMAP","imap_port":"منفذ IMAP","imap_ssl":"استخدام SSL لخادم IMAP","username":"اسم المستخدم","password":"كلمة المرور"},"settings":{"title":"الإعدادات","allow_unknown_sender_topic_replies":"السماح بالرد على الموضوعات من مُرسِلين غير معروفين.","allow_unknown_sender_topic_replies_hint":"يسمح لمُرسِلين غير معروفين بالرد على موضوعات المجموعة. إذا لم يتم تفعيل هذا الإعداد، فستؤدي الردود الواردة من عناوين البريد الإلكتروني التي لم تتم دعوتها بالفعل إلى الموضوع إلى إنشاء موضوع جديد."},"mailboxes":{"synchronized":"صندوق البريد المتزامن","none_found":"لم يتم العثور على صناديق بريد في حساب البريد الإلكتروني هذا.","disabled":"متوقفة"}},"membership":{"title":"العضوية","access":"الوصول"},"categories":{"title":"الفئات","long_title":"الإشعارات الافتراضية للفئة","description":"عند إضافة مستخدمين إلى هذه المجموعة، سيتم ضبط إعدادات إشعارات الفئة لديهم على تلك القيم. ويمكنهم تغييرها بعد ذلك.","watched_categories_instructions":"يمكنك مراقبة جميع الموضوعات في هذه الفئات تلقائيًا. سيتلقى أعضاء المجموعة إشعارات بالمنشورات والموضوعات الجديدة، وسيظهر أيضًا عدد المنشورات الجديدة بجانب الموضوع.","tracked_categories_instructions":"يمكنك تتبُّع جميع الموضوعات في هذه الفئات تلقائيًا. وسيظهر عدد المنشورات الجديدة بجانب الموضوع.","watching_first_post_categories_instructions":"سيتلقى المستخدمون إشعارًا بأول منشور في كل موضوع جديد في هذه الفئات.","regular_categories_instructions":"إذا تم كتم هذه الفئات، فلن يتم كتمها لأعضاء المجموعة. سيتم إرسال إشعار إلى المستخدمين إذا تمت الإشارة إليهم أو رد شخص ما عليهم.","muted_categories_instructions":"لن يتلقى المستخدمون أي إشعارات أبدًا بخصوص الموضوعات الجديدة في هذه الفئات، ولن تظهر في الفئات أو صفحات أحدث الموضوعات."},"tags":{"title":"الوسوم","long_title":"الإشعارات الافتراضية للوسوم","description":"عند إضافة مستخدمين إلى هذه المجموعة، سيتم تعيين الإعدادات المتعلقة بإشعارات الوسوم لديهم على الإعدادات الافتراضية. ويمكنهم تغييرها بعد ذلك.","watched_tags_instructions":"يمكنك مراقبة جميع الموضوعات التي تحمل هذه الوسوم تلقائيًا. سيتلقى أعضاء المجموعة إشعارات بالمنشورات والموضوعات الجديدة، وسيظهر أيضًا عدد المنشورات الجديدة بجانب الموضوع.","tracked_tags_instructions":"يمكنك تتبُّع جميع الموضوعات التي تحمل هذه الوسوم تلقائيًا. وسيظهر عدد المنشورات الجديدة بجانب الموضوع.","watching_first_post_tags_instructions":"سيتم إرسال إشعار للمستخدمين بأول منشور في كل موضوع يحمل هذه الوسوم.","regular_tags_instructions":"إذا تم كتم هذه الوسوم، فلن يتم كتمها لأعضاء المجموعة. سيتم إرسال إشعارات إلى المستخدمين إذا تمت الإشارة إليهم أو رد شخص ما عليهم.","muted_tags_instructions":"لن يتلقى المستخدمون أي إشعارات أبدًا بخصوص الموضوعات الجديدة التي تحمل هذه الوسوم، ولن تظهر في أحدث الموضوعات."},"logs":{"title":"السجلات","when":"التوقيت","action":"الإجراء","acting_user":"المستخدم المتخذ للإجراء","target_user":"المستخدم المستهدف","subject":"الموضوع","details":"التفاصيل","from":"من","to":"إلى"}},"permissions":{"title":"الأذونات","none":"لا توجد فئات مرتبطة بهذه المجموعة.","description":"يمكن لأعضاء هذه المجموعة الوصول إلى هذه الفئات"},"public_admission":"السماح للمستخدمين بالانضمام إلى المجموعة بحرية (يلزم أن تكون المجموعة عامة)","public_exit":"السماح للمستخدمين بمغادرة المجموعة بحرية","empty":{"posts":"لا توجد منشورات من أعضاء هذه المجموعة.","members":"لا يوجد أعضاء في هذه المجموعة.","requests":"لا توجد طلبات عضوية لهذه المجموعة.","mentions":"لا توجد إشارات إلى هذه المجموعة.","messages":"لا توجد رسائل لهذه المجموعة.","topics":"لا توجد موضوعات من أعضاء هذه المجموعة.","logs":"لا توجد سجلات لهذه المجموعة."},"add":"إضافة","join":"انضمام","leave":"مغادرة","request":"طلب","message":"رسالة","confirm_leave":"هل تريد بالتأكيد مغادرة هذه المجموعة؟","allow_membership_requests":"السماح للمستخدمين بإرسال طلبات العضوية إلى مالكي المجموعة (يلزم أن تكون المجموعة عامة)","membership_request_template":"نموذج مخصَّص يتم عرضه للمستخدمين عند إرسال طلب عضوية","membership_request":{"submit":"إرسال طلب","title":"طلب الانضمام إلى @%{group_name}","reason":"أخبر مديري المجموعة بسبب انتمائك إلى هذه المجموعة"},"membership":"العضوية","name":"الاسم","group_name":"اسم المجموعة","user_count":"المستخدمون","bio":"نبذة عن المجموعة","selector_placeholder":"أدخِل اسم المستخدم","owner":"المالك","index":{"title":"المجموعات","all":"كل المجموعات","empty":"لا توجد مجموعات مرئية.","filter":"التصفية حسب نوع المجموعة","owner_groups":"المجموعات التي أملكها","close_groups":"المجموعات المُغلقة","automatic_groups":"المجموعات التلقائية","automatic":"تلقائية","closed":"مغلقة","public":"عامة","private":"خاصة","public_groups":"المجموعات العامة","my_groups":"مجموعاتي","group_type":"نوع المجموعة","is_group_user":"عضو","is_group_owner":"المالك"},"title":{"zero":"المجموعات","one":"المجموعة","two":"المجموعتان","few":"المجموعات","many":"المجموعات","other":"المجموعات"},"activity":"النشاط","members":{"title":"الأعضاء","filter_placeholder_admin":"اسم المستخدم أو البريد الإلكتروني","filter_placeholder":"اسم المستخدم","remove_member":"إزالة العضو","remove_member_description":"إزالة \u003cb\u003e%{username}\u003c/b\u003e من هذه المجموعة","make_owner":"التعيين كمالك","make_owner_description":"جعل \u003cb\u003e%{username}\u003c/b\u003e أحد مالكي هذه المجموعة","remove_owner":"إزالة كمالك","remove_owner_description":"إزالة \u003cb\u003e%{username}\u003c/b\u003e كمالك هذه المجموعة","make_primary":"الضبط كمجموعة أساسية","make_primary_description":"جعل هذه المجموعة هي المجموعة الأساسية للمستخدم \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"الإزالة كمجموعة أساسية","remove_primary_description":"إزالة هذه المجموعة كمجموعة أساسية للمستخدم \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"إزالة الأعضاء","remove_members_description":"إزالة المستخدمين المحدَّدين من هذه المجموعة","make_owners":"التعيين كمالكين","make_owners_description":"تعيين المستخدمين المحدَّدين كمالكين لهذه المجموعة","remove_owners":"إزالة المالكين","remove_owners_description":"إزالة المستخدمين المحدَّدين كمالكين لهذه المجموعة","make_all_primary":"الضبط كمجموعة أساسية للجميع","make_all_primary_description":"جعل هذه المجموعة هي المجموعة الأساسية للمستخدمين المحدَّدين","remove_all_primary":"الإزالة كمجموعة أساسية","remove_all_primary_description":"إزالة هذه المجموعة كمجموعة أساسية","owner":"المالك","primary":"أساسي","forbidden":"غير مسموح لك بعرض الأعضاء."},"topics":"الموضوعات","posts":"المنشورات","mentions":"الإشارات","messages":"الرسائل","notification_level":"مستوى الإشعارات الافتراضي لرسائل المجموعات","alias_levels":{"mentionable":"من يمكنه الإشارة إلى هذه المجموعة باستخدام الرمز @؟","messageable":"من يمكنه إرسال الرسائل إلى هذه المجموعة؟","nobody":"لا أحد","only_admins":"المسؤولون فقط","mods_and_admins":"المسؤولون والمشرفون فقط","members_mods_and_admins":"أعضاء المجموعة والمسؤولون والمشرفون فقط","owners_mods_and_admins":"مالكو المجموعات، والمشرفون، والمسؤولون فقط","everyone":"الجميع"},"notifications":{"watching":{"title":"المراقبة","description":"سنُرسل إليك إشعارًا بكل منشور جديد في كل رسالة، وسترى عدد الردود الجديدة."},"watching_first_post":{"title":"مراقبة أول منشور","description":"ستتقلى إشعارات بالرسائل الجديدة في هذه المجموعة ولكن ليس الردود على الرسائل."},"tracking":{"title":"التتبُّع","description":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك، وسترى عدد الردود الجديدة."},"regular":{"title":"عادية","description":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك."},"muted":{"title":"الكتم","description":"لن تتلقى أي إشعارات أبدًا بخصوص الرسائل من هذه المجموعة."}},"flair_url":"صورة الطابع للصورة الرمزية المميزة","flair_upload_description":"استخدم صورًا مربعة الشكل لا يقل حجمها عن 20 بكسل × 20 بكسل.","flair_bg_color":"لون خلفية الطابع للصورة الرمزية المميزة","flair_bg_color_placeholder":"(اختياري) القيمة السداسية للون","flair_color":"لون الطابع للصورة الرمزية المميزة","flair_color_placeholder":"(اختياري) القيمة السداسية للون","flair_preview_icon":"معاينة الأيقونة","flair_preview_image":"معاينة الصورة","flair_type":{"icon":"تحديد أيقونة","image":"تحميل صورة"},"default_notifications":{"modal_title":"الإشعارات الافتراضية للمستخدم","modal_description":"هل ترغب في تطبيق هذا التغيير بأثر رجعي؟ سيؤدي ذلك إلى تغيير التفضيلات لعدد %{count} مستخدم حالي.","modal_yes":"نعم","modal_no":"لا، تطبيق التغيير من الآن فصاعدًا فقط"}},"user_action_groups":{"1":"الإعجابات","2":"الإعجابات","3":"الإشارات المرجعية","4":"الموضوعات","5":"الردود","6":"الردود","7":"الإشارات","9":"الاقتباسات","11":"التعديلات","12":"العناصر المرسلة","13":"صندوق الوارد","14":"قيد الانتظار","15":"المسودات"},"categories":{"all":"كل الفئات","all_subcategories":"الكل","no_subcategory":"لا يوجد","category":"الفئة","category_list":"عرض قائمة الفئات","reorder":{"title":"إعادة ترتيب الفئات","title_long":"إعادة تنظيم قائمة الفئات","save":"احفظ الترتيب","apply_all":"طبّق","position":"الترتيب"},"posts":"المنشورات","topics":"الموضوعات","latest":"الحديثة","subcategories":"الفئات الفرعية","muted":"الفئات المكتومة","topic_sentence":{"zero":"%{count} موضوع","one":"موضوع واحد","two":"موضوعان","few":"%{count} موضوعات","many":"%{count} موضوعًا","other":"%{count} موضوع"},"topic_stat":{"zero":"%{number}/%{unit}","one":"%{number}/%{unit}","two":"%{number}/%{unit}","few":"%{number}/%{unit}","many":"%{number}/%{unit}","other":"%{number}/%{unit}"},"topic_stat_unit":{"week":"أسبوع","month":"شهر"},"topic_stat_all_time":{"zero":"الإجمالي: %{number}","one":"الإجمالي: %{number}","two":"الإجمالي: %{number}","few":"الإجمالي: %{number}","many":"الإجمالي: %{number}","other":"الإجمالي: %{number}"},"topic_stat_sentence_week":{"zero":"%{count} موضوع جديد خلال الأسبوع الماضي.","one":"موضوع واحد (%{count}) جديد خلال الأسبوع الماضي.","two":"موضوعان جديدان (%{count}) خلال الأسبوع الماضي.","few":"%{count} موضوعات جديدة خلال الأسبوع الماضي.","many":"%{count} موضوعًا جديدًا خلال الأسبوع الماضي.","other":"%{count} موضوع جديد خلال الأسبوع الماضي."},"topic_stat_sentence_month":{"zero":"%{count} موضوع جديد خلال الشهر الماضي.","one":"موضوع واحد (%{count}) جديد خلال الشهر الماضي.","two":"موضوعان (%{count}) جديدان خلال الشهر الماضي.","few":"%{count} موضوعات جديدة خلال الشهر الماضي.","many":"%{count} موضوعًا جديدًا خلال الشهر الماضي.","other":"%{count} موضوع جديد خلال الشهر الماضي."},"n_more":"الفئات (%{count} أكثر)..."},"ip_lookup":{"title":"البحث عن عناوين IP","hostname":"اسم المضيف","location":"الموقع الجغرافي","location_not_found":"(غير معروف)","organisation":"المؤسسة","phone":"الهاتف","other_accounts":"الحسابات الأخرى بعنوان IP هذا:","delete_other_accounts":"حذف %{count}","username":"اسم المستخدم","trust_level":"مستوى الثقة","read_time":"وقت القراءة","topics_entered":"الموضوعات المدخلة","post_count":"# منشور","confirm_delete_other_accounts":"هل تريد بالتأكيد حذف هذه الحسابات؟","powered_by":"باستخدام \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"تم النسخ"},"user_fields":{"none":"(تحديد خيار)","required":"يُرجى إدخال قيمة لـ \"%{name}\""},"user":{"said":"%{username}:","profile":"الملف الشخصي","mute":"كتم","edit":"تعديل التفضيلات","download_archive":{"button_text":"تنزيل الكل","confirm":"هل تريد بالتأكيد تنزيل منشوراتك؟","success":"لقد بدأ التنزيل، وسنُرسل إليك رسالة إشعار عند اكتمال العملية.","rate_limit_error":"يمكن تنزيل المنشورات مرة واحدة يوميًا. يُرجى إعادة المحاولة غدًا."},"new_private_message":"رسالة جديدة","private_message":"رسالة","private_messages":"الرسائل","user_notifications":{"filters":{"filter_by":"التصفية حسب","all":"الكل","read":"المقروءة","unread":"غير المقروءة"},"ignore_duration_title":"تجاهل المستخدم","ignore_duration_username":"اسم المستخدم","ignore_duration_when":"المدة:","ignore_duration_save":"تجاهل","ignore_duration_note":"يُرجى العلم بأن جميع عمليات التجاهل يتم إزالتها تلقائيًا بعد انتهاء مدة التجاهل.","ignore_duration_time_frame_required":"يُرجى تحديد إطار زمني","ignore_no_users":"ليس لديك أي مستخدمين تم تجاهلهم.","ignore_option":"التجاهل","ignore_option_title":"لن تتلقى إشعارات ذات صلة بهذا المستخدم وسيتم إخفاء جميع موضوعاته وردوده.","add_ignored_user":"إضافة...","mute_option":"الكتم","mute_option_title":"لن تتلقى أي إشعارات ذات صلة بهذا المستخدم.","normal_option":"عادية","normal_option_title":"سنُرسل إليك إشعارًا في حال ردَّ هذا المستخدم عليك أو اقتبس كلامك أو أشار إليك."},"notification_schedule":{"title":"جدول الإشعارات","label":"تفعيل جدول الإشعارات المخصَّص","tip":"سيتم وضعك في وضع \"عدم الإزعاج\" تلقائيًا خارج هذه الساعات.","midnight":"منتصف الليل","none":"لا يوجد","monday":"الاثنين","tuesday":"الثلاثاء","wednesday":"الأربعاء","thursday":"الخميس","friday":"الجمعة","saturday":"السبت","sunday":"الأحد","to":"إلى"},"activity_stream":"النشاط","read":"المقروءة","read_help":"الموضوعات المقروءة مؤخرًا","preferences":"التفضيلات","feature_topic_on_profile":{"open_search":"تحديد موضوع جديد","title":"تحديد موضوع","search_label":"البحث عن موضوع بالعنوان","save":"حفظ","clear":{"title":"مسح","warning":"هل تريد بالتأكيد مسح موضوعك المميز؟"}},"use_current_timezone":"استخدام المنطقة الزمنية الحالية","profile_hidden":"الملف الشخصي العام لهذا المستخدم مخفي.","expand_profile":"وسّع","collapse_profile":"طي","bookmarks":"الإشارات المرجعية","bio":"نبذة عني","timezone":"المنطقة الزمنية","invited_by":"تمت الدعوة بواسطة","trust_level":"مستوى الثقة","notifications":"الإشعارات","statistics":"الإحصاءات","desktop_notifications":{"label":"الإشعارات الفورية","not_supported":"عذرًا، لا يدعم هذا المتصفح الإشعارات.","perm_default":"تفعيل الإشعارات","perm_denied_btn":"‏‏تم رفض الإذن","perm_denied_expl":"لقد رفضت منح الإذن بإرسال الإشعارات. يمكنك السماح بالإشعارات في إعدادات المتصفح.","disable":"إيقاف الإشعارات","enable":"تفعيل الإشعارات","each_browser_note":"ملاحظة: عليك تغيير هذا الإعداد في كل متصفح تستخدمه. سيتم إيقاف جميع الإشعارات في وضع \"عدم الإزعاج\"، بغض النظر عن هذا الإعداد.","consent_prompt":"هل تريد تلقي إشعارات فورية عند رد الأشخاص على منشوراتك؟"},"dismiss":"تجاهل","dismiss_notifications":"تجاهل الكل","dismiss_notifications_tooltip":"وضع علامة مقروءة على كل الإشعارات غير المقروءة","no_messages_title":"ليس لديك أي رسائل","no_messages_body":"هل تحتاج إلى إجراء محادثة شخصية مباشرة مع شخص ما خارج مسار إجراء المحادثات التقليدي؟ راسله عن طريق تحديد صورته الرمزية واستخدام زر الرسالة %{icon}.\u003cbr\u003e\u003cbr\u003e إذا كنت بحاجة إلى مساعدة، يمكنك \u003ca href='%{aboutUrl}'\u003eمراسلة عضو في فريق العمل\u003c/a\u003e.\n","no_bookmarks_title":"لم تضع إشارة مرجعية على أي شيء بعد","no_bookmarks_body":"ابدأ في وضع إشارة مرجعية على المنشورات باستخدام الزر %{icon} وسيتم إدراجها هنا للرجوع إليها بسهولة. يمكنك جدولة تذكير أيضًا!\n","no_notifications_title":"ليس لديك أي إشعارات بعد","no_notifications_body":"سيتم إعلامك في هذه اللوحة بالنشاط ذي الصلة المباشرة بك، بما في ذلك الردود على موضوعاتك ومنشوراتك، وعندما يشير إليك شخص ما \u003cb\u003e@mentions\u003c/b\u003e أو يقتبس منك، وعندما يرد على الموضوعات التي تراقبها. سيتم أيضًا إرسال الإشعارات إلى بريدك الإلكتروني في حال عدم قيامك بتسجيل الدخول لفترة من الوقت. \u003cbr\u003e\u003cbr\u003e ابحث عن %{icon} لتحديد الموضوعات والفئات والوسوم المحدَّدة التي تريد أن يتم إرسال إشعار إليك بشأنها. لمزيد من المعلومات، راجع \u003ca href='%{preferencesUrl}'\u003eتفضيلات الإشعارات\u003c/a\u003e.\n","first_notification":"أول إشعار تستلمه! اضغط عليه للبدء.","dynamic_favicon":"عرض الأعداد على أيقونة المتصفح","skip_new_user_tips":{"description":"تخطي نصائح وشارات تهيئة المستخدم الجديد","not_first_time":"ليست المرة الأولى لك؟","skip_link":"تخطي هذه النصائح","read_later":"سأقرأها لاحقًا."},"theme_default_on_all_devices":"جعل هذه السمة الافتراضية على كل أجهزتي","color_scheme_default_on_all_devices":"ضبط نظام (أنظمة) الألوان الافتراضي على جميع أجهزتي","color_scheme":"نظام الألوان","color_schemes":{"default_description":"السمة الافتراضية","disable_dark_scheme":"مثل العادي","dark_instructions":"يمكنك معاينة نظام ألوان الوضع الداكن عن طريق تفعيل الوضع الداكن لجهازك.","undo":"إعادة الضبط","regular":"العادي","dark":"الوضع الداكن","default_dark_scheme":"(الوضع الافتراضي للموقع)"},"dark_mode":"الوضع الداكن","dark_mode_enable":"تفعيل نظام الألوان في الوضع الداكن تلقائيًا","text_size_default_on_all_devices":"جعل هذا الحجم الافتراضي للنص على جميع أجهزتي","allow_private_messages":"السماح للمستخدمين الآخرين بإرسال رسائل خاصة إليَّ","external_links_in_new_tab":"فتح كل الروابط الخارجية في علامة تبويب جديدة","enable_quoting":"تفعيل الرد باقتباس للنص المميز","enable_defer":"تفعيل التأجيل لوضع علامة على الموضوعات كغير مقروءة","change":"تغيير","featured_topic":"الموضوع المميز","moderator":"‏%{user} مشرف في الموقع","admin":"‏%{user} مسؤول في الموقع","moderator_tooltip":"هذا المستخدم مشرف في الموقع","admin_tooltip":"هذا المستخدم مسؤول في الموقع","silenced_tooltip":"تم إسكات هذا المستخدم","suspended_notice":"هذا المستخدم معلَّق حتى تاريخ %{date}.","suspended_permanently":"هذا المستخدم معلَّق.","suspended_reason":"السبب: ","github_profile":"Github","email_activity_summary":"خلاصة النشاط","mailing_list_mode":{"label":"وضع القائمة البريدية","enabled":"تفعيل وضع القائمة البريدية","instructions":"يتجاوز هذا الإعداد \"ملخص النشاط\".\u003cbr /\u003e\nلا تشمل هذه الرسائل الإلكترونية الموضوعات والفئات المكتومة.\n","individual":"المراسلة عبر البريد الإلكتروني لكل منشور جديد","individual_no_echo":"المراسلة عبر البريد الإلكتروني لكل منشور جديد عدا منشوراتي","many_per_day":"مراسلتي عبر البريد الإلكتروني لكل منشور جديد (%{dailyEmailEstimate} في اليوم تقريبًا)","few_per_day":"مراسلتي عبر البريد الإلكتروني لكل منشور جديد (اثنان في اليوم تقريبًا)","warning":"تم تفعيل وضع القائمة البريدية. تم تجاوز الإعدادات المتعلقة بإشعارات البريد الإلكتروني."},"tag_settings":"الوسوم","watched_tags":"المُراقَبة","watched_tags_instructions":"ستراقب تلقائيًا جميع الموضوعات التي تحمل هذه الوسوم. وستتلقى إشعارات بكل المنشورات والموضوعات الجديدة، وسيظهر أيضا عدد المنشورات الجديدة بجانب الموضوع.","tracked_tags":"المتتبَّعة","tracked_tags_instructions":"ستتتبَّع تلقائيًا جميع الموضوعات التي تحمل هذه الوسوم. وسيظهر أيضًا عدد المنشورات الجديدة بجانب الموضوع.","muted_tags":"المكتومة","muted_tags_instructions":"لن تتلقى أي إشعارات أبدًا بخصوص الموضوعات الجديدة التي تحمل هذه الوسوم، ولن تظهر في قائمة أحدث الموضوعات.","watched_categories":"المُراقَبة","watched_categories_instructions":"ستراقب تلقائيًا جميع الموضوعات في هذه الفئات. وستتلقى إشعارات بكل المنشورات والموضوعات الجديدة، وسيظهر أيضا عدد المنشورات الجديدة بجانب الموضوع.","tracked_categories":"المتتبَّعة","tracked_categories_instructions":"ستتتبَّع تلقائيًا جميع الموضوعات في هذه الفئات. وسيظهر أيضًا عدد المنشورات الجديدة بجانب الموضوع.","watched_first_post_categories":"مراقبة أول منشور","watched_first_post_categories_instructions":"ستتلقى إشعارًا بأول منشور في كل موضوع جديد في هذه الفئات.","watched_first_post_tags":"مراقبة أول منشور","watched_first_post_tags_instructions":"ستتلقى إشعارًا بأول منشور في كل موضوع جديد يحمل هذه الوسوم.","muted_categories":"المكتومة","muted_categories_instructions":"لن تتلقى أي إشعارات أبدًا بخصوص الموضوعات الجديدة في هذه الفئات، ولن تظهر في الفئات أو صفحات أحدث الموضوعات.","muted_categories_instructions_dont_hide":"لن تتلقى أي إشعارات أبدًا بشأن الموضوعات الجديدة في هذه الفئات.","regular_categories":"العادية","regular_categories_instructions":"سترى هذه الفئات في قوائم الموضوعات \"الحديثة\" و\"الأكثر عرضًا\".","no_category_access":"كمشرف لديك صلاحيات وصول محدودة للفئات، فالحفظ متوقف.","delete_account":"حذف حسابي","delete_account_confirm":"هل تريد بالتأكيد حذف حسابك للأبد؟ لا يمكن التراجع عن هذا الإجراء!","deleted_yourself":"تم حذف حسابك بنجاح.","delete_yourself_not_allowed":"يُرجى التواصل مع أحد أعضاء الفريق إذا أردت حذف حسابك.","unread_message_count":"الرسائل","admin_delete":"حذف","users":"المستخدمون","muted_users":"المكتومون","muted_users_instructions":"منع جميع الإشعارات والرسائل الخاصة من هؤلاء المستخدمين","allowed_pm_users":"السماح","allowed_pm_users_instructions":"السماح بالرسائل الخاصة من هؤلاء المستخدمين فقط","allow_private_messages_from_specific_users":"السماح لمستخدمين محدَّدين فقط بإرسال الرسائل الخاصة إليَّ","ignored_users":"التجاهل","ignored_users_instructions":"منع جميع المنشورات والإشعارات والرسائل الخاصة من هؤلاء المستخدمين","tracked_topics_link":"إظهار","automatically_unpin_topics":"إلغاء تثبيت الموضوعات تلقائيًا عند وصولي إلى نهايتها.","apps":"التطبيقات","revoke_access":"إلغاء الوصول","undo_revoke_access":"التراجع عن إلغاء الوصول","api_approved":"تمت الموافقة عليها:","api_last_used_at":"آخر استخدام في:","theme":"السمة","save_to_change_theme":"سيتم تحديث السمة بعد النقر على \"%{save_text}\"","home":"الصفحة الرئيسية المبدئية","staged":"مؤقت","staff_counters":{"flags_given":"بلاغ مفيد","flagged_posts":"منشور مُبلَغ عنه","deleted_posts":"منشور محذوف","suspensions":"حالة تعليق","warnings_received":"تحذير","rejected_posts":"منشور مرفوض"},"messages":{"inbox":"صندوق الوارد","sent":"المُرسَلة","archive":"الأرشيف","groups":"مجموعاتي","move_to_inbox":"النقل إلى صندوق الوارد","move_to_archive":"أرشفة","failed_to_move":"فشل نقل الرسائل المحدَّدة (قد تكون شبكتك متوقفة)","tags":"الوسوم","warnings":"تحذيرات رسمية"},"preferences_nav":{"account":"الحساب","security":"الأمان","profile":"الملف الشخصي","emails":"الرسائل الإلكترونية","notifications":"الإشعارات","categories":"الفئات","users":"المستخدمون","tags":"الوسوم","interface":"الواجهة","apps":"التطبيقات"},"change_password":{"success":"(تم إرسال رسالة البريد الإلكتروني)","in_progress":"(جارٍ إرسال رسالة البريد الإلكتروني)","error":"(خطأ)","emoji":"رمز قفل","action":"إرسال رسالة إلكترونية لإعادة ضبط كلمة المرور","set_password":"ضبط كلمة المرور","choose_new":"اختيار كلمة مرور جديدة","choose":"اختيار كلمة مرور"},"second_factor_backup":{"title":"الرموز الاحياطية للمصادقة الثنائية","regenerate":"أعِد التوليد","disable":"إيقاف","enable":"تفعيل","enable_long":"تفعيل الرموز الاحتياطية","manage":{"zero":"يمكنك إدارة الرموز الاحتياطية. متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رمز احتياطي.","one":"يمكنك إدارة الرموز الاحتياطية. متبقٍ لديك رمز احتياطي واحد (\u003cstrong\u003e%{count}\u003c/strong\u003e).","two":"يمكنك إدارة الرموز الاحتياطية. متبقٍ لديك رمزان احتياطيان (\u003cstrong\u003e%{count}\u003c/strong\u003e).","few":"يمكنك إدارة الرموز الاحتياطية. متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رموز احتياطية.","many":"يمكنك إدارة الرموز الاحتياطية. متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رمزًا احتياطيًا.","other":"يمكنك إدارة الرموز الاحتياطية. متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رمز احتياطي."},"copy_to_clipboard":"انسخ إلى الحافظة","copy_to_clipboard_error":"حدث خطأ في نسخ البيانات إلى الحافظة","copied_to_clipboard":"تم النسخ إلى الحافظة","download_backup_codes":"تنزيل الرموز الاحتياطية","remaining_codes":{"zero":"متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رمز احتياطي.","one":"متبقٍ لديك رمز احتياطي واحد (\u003cstrong\u003e%{count}\u003c/strong\u003e).","two":"متبقٍ لديك رمزان احتياطيان (\u003cstrong\u003e%{count}\u003c/strong\u003e).","few":"متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رموز احتياطية.","many":"متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رمزًا احتياطيًا.","other":"متبقٍ لديك \u003cstrong\u003e%{count}\u003c/strong\u003e رمز احتياطي."},"use":"استخدام رمز احتياطي","enable_prerequisites":"يجب عليك تفعيل طريقة أساسية للمصادقة الثنائية قبل إنشاء الرموز الاحتياطية.","codes":{"title":"تم إنشاء الرموز الاحتياطية","description":"يمكن استخدام كل واحد من هذه الرموز الاحتياطية مرة واحدة فقط. احتفظ بها في مكان آمن وتستطيع الوصول إليه."}},"second_factor":{"title":"المصادقة الثنائية","enable":"إدارة المصادقة الثنائية","disable_all":"إيقاف الكل","forgot_password":"هل نسيت كلمة المرور؟","confirm_password_description":"يُرجى تأكيد كلمة المرور للمتابعة","name":"الاسم","label":"الرمز","rate_limit":"يُرجى الانتظار قبل تجربة رمز مصادقة آخر.","enable_description":"امسح رمز QR ضوئيًا في أحد التطبيقات المدعومة (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e و\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) وأدخِل رمز المصادقة.\n","disable_description":"يُرجى إدخال رمز المصادقة من تطبيقك","show_key_description":"الإدخال يدويًا","short_description":"احمِ حسابك برموز أمان تُستخدَم لمرة واحدة.\n","extended_description":"تضيف المصادقة الثنائية أمانًا إضافيًا إلى حسابك من خلال طلب رمز مميز لمرة واحدة بالإضافة إلى كلمة مرورك. يمكن إنشاء الرموز المميزة على الأجهزة التي تعمل بنظام التشغيل \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e و\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e.\n","oauth_enabled_warning":"يُرجى العلم بأنه سيتم إيقاف تسجيل الدخول بحسابات التواصل الاجتماعي بعد تفعيل المصادقة الثنائية على حسابك.","use":"استخدام تطبيق المصادقة","enforced_notice":"يلزم تفعيل المصادقة الثنائية قبل الوصول إلى هذا الموقع.","disable":"إيقاف","disable_confirm":"هل تريد بالتأكيد إيقاف جميع وسائل المصادقة الثنائية؟","save":"حفظ","edit":"تعديل","edit_title":"تعديل تطبيق المصادقة","edit_description":"اسم تطبيق المصادقة","enable_security_key_description":"عندما يكون \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003eمفتاح الأمان المحمول\u003c/a\u003e لديك جاهزًا، اضغط على الزر \"تسجيل\" أدناه.\n","totp":{"title":"تطبيقات المصادقة المعتمدة على الرموز المميزة","add":"إضافة تطبيق مصادقة","default_name":"تطبيق المصادقة الخاص بي","name_and_code_required_error":"يجب عليك إدخال اسم، والرمز من تطبيق المصادقة."},"security_key":{"register":"التسجيل","title":"مفاتيح الأمان","add":"إضافة مفتاح أمان","default_name":"مفتاح الأمان الرئيسي","not_allowed_error":"انتهت مهلة عملية تسجيل مفتاح الأمان أو تم إلغاؤها.","already_added_error":"لقد سجَّلت مفتاح الأمان هذا بالفعل. ليس عليك تسجيله مرة أخرى.","edit":"تعديل مفتاح الأمان","save":"حفظ","edit_description":"اسم مفتاح الأمان","name_required_error":"يجب عليك إدخال اسم لمفتاح الأمان."}},"change_about":{"title":"تغيير \"نبذة عني\"","error":"حدث خطأ في أثناء تغيير هذه القيمة."},"change_username":{"title":"تغيير اسم المستخدم","confirm":"هل تريد بالتأكيد تغيير اسم المستخدم؟","taken":"عذرًا، اسم المستخدم هذا مسجَّل بالفعل.","invalid":"اسم المستخدم غير صالح. يجب أن يتضمَّن أرقامًا وحروفًا فقط"},"add_email":{"title":"إضافة بريد إلكتروني","add":"إضافة"},"change_email":{"title":"تغيير البريد الإلكتروني","taken":"عذرًا، هذا البريد الإلكتروني غير متوفر.","error":"حدث خطأ في أثناء تغيير البريد الإلكتروني. ربما يكون هذا العنوان مستخدمًا بالفعل؟","success":"لقد أرسلنا رسالة إلكترونية إلى هذا العنوان. يُرجى اتباع تعليمات التأكيد.","success_via_admin":"لقد أرسلنا رسالة إلكترونية إلى هذا العنوان. سيحتاج المستخدم إلى اتباع تعليمات التأكيد الواردة في رسالة البريد الإلكتروني.","success_staff":"لقد أرسلنا رسالة إلكترونية إلى عنوانك الحالي. يُرجى اتباع تعليمات التأكيد."},"change_avatar":{"title":"تغيير صورة ملفك الشخصي","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e، بناءً على","gravatar_title":"تغيير صورتك الرمزية على موقع %{gravatarName} الإلكتروني","gravatar_failed":"لم نتمكن من العثور على %{gravatarName} بعنوان البريد الإلكتروني هذا.","refresh_gravatar_title":"تحديث %{gravatarName}","letter_based":"صورة الملف الشخصي الافتراضية","uploaded_avatar":"صورة مخصَّصة","uploaded_avatar_empty":"إضافة صورة مخصَّصة","upload_title":"تحميل صورتك","image_is_not_a_square":"تحذير: لقد قصصنا صورتك؛ لأن عرضها وارتفاعها لم يكونا متساويين.","logo_small":"شعار الموقع الصغير. يتم استخدامه بشكلٍ افتراضي."},"change_profile_background":{"title":"رأس الملف الشخصي","instructions":"سيتم توسيط رؤوس الملفات الشخصية وسيكون عرضها الافتراضي 1110 بكسل."},"change_card_background":{"title":"خلفية بطاقة المستخدم","instructions":"سيتم توسيط صور الخلفية وسيكون عرضها الافتراضي 590 بكسل."},"change_featured_topic":{"title":"الموضوع المميز","instructions":"سيتم وضع رابط إلى هذا الموضوع على بطاقة المستخدم والملف الشخصي الخاصين بك."},"email":{"title":"البريد الإلكتروني","primary":"عنوان البريد الإلكتروني الرئيسي","secondary":"عناوين البريد الإلكتروني الثانوية","primary_label":"الأساسي","unconfirmed_label":"غير مؤكَّد","resend_label":"إعادة إرسال رسالة التأكيد","resending_label":"جارٍ الإرسال...","resent_label":"تم إرسال الرسالة الإلكترونية","update_email":"تغيير البريد الإلكتروني","set_primary":"ضبط عنوان البريد الإلكتروني الرئيسي","destroy":"إزالة عنوان البريد الإلكتروني","add_email":"إضافة بريد إلكتروني بديل","auth_override_instructions":"يمكن تحديث البريد الإلكتروني من موفِّر المصادقة.","no_secondary":"لا توجد عناوين بريد إلكتروني ثانوية","instructions":"لا يظهر للعامة أبدًا.","admin_note":"ملاحظة: يشير تغيير المستخدم المسؤول لعنوان البريد الإلكتروني لمستخدم آخر غير مسؤول إلى أن المستخدم قد فقد الوصول إلى حساب البريد الإلكتروني الأصلي؛ لذلك ستتم مراسلته عبر البريد الإلكتروني لإعادة ضبط كلمة المرور إلى عنوانه الجديد. ولن يتغير عنوان البريد الإلكتروني للمستخدم حتى يكمل عملية إعادة ضبط كلمة المرور.","ok":"سنُرسل إليك رسالة إلكترونية للتأكيد","required":"يُرجى إدخال عنوان بريد إلكتروني","invalid":"يُرجى إدخال عنوان بريد إلكتروني صالح","authenticated":"تمت مصادقة عنوان بريدك الإلكتروني بواسطة %{provider}","invite_auth_email_invalid":"لا يتطابق البريد الإلكتروني للدعوة مع البريد الإلكتروني المُصادَق عليه بواسطة %{provider}","authenticated_by_invite":"تمت المصادقة على بريدك الإلكتروني من خلال الدعوة","frequency_immediately":"سنُرسل إليك رسالة إلكترونية فورًا إذا كنت لم تقرأ الشيء الذي نُرسل إليك بشأنه.","frequency":{"zero":"لن نراسلك عبر البريد الإلكتروني إلا في حال مُضي %{count} دقيقة على آخر زيارة لك للموقع.","one":"لن نراسلك عبر البريد الإلكتروني إلا في حال مُضي دقيقة واحدة (%{count}) على آخر زيارة لك للموقع.","two":"لن نراسلك عبر البريد الإلكتروني إلا في حال مُضي دقيقتين (%{count}) على آخر زيارة لك للموقع.","few":"لن نراسلك عبر البريد الإلكتروني إلا في حال مُضي %{count} دقائق على آخر زيارة لك للموقع.","many":"لن نراسلك عبر البريد الإلكتروني إلا في حال مُضي %{count} دقيقة على آخر زيارة لك للموقع.","other":"لن نراسلك عبر البريد الإلكتروني إلا في حال مُضي %{count} دقيقة على آخر زيارة لك للموقع."}},"associated_accounts":{"title":"الحسابات المرتبطة","connect":"ربط","revoke":"إلغاء","cancel":"إلغاء","not_connected":"(غير مرتبط)","confirm_modal_title":"ربط حساب %{provider}","confirm_description":{"account_specific":"سيتم استخدام حسابك على %{provider} \"%{account_description}\" للمصادقة.","generic":"سيتم استخدام حسابك على %{provider} للمصادقة."}},"name":{"title":"الاسم","instructions":"اسمك بالكامل (اختياري)","instructions_required":"اسمك بالكامل","required":"يُرجى إدخال اسم","too_short":"اسمك قصير جدًا","ok":"اسمك يبدو جيدًا"},"username":{"title":"اسم المستخدم","instructions":"مميز، وبلا مسافات، وقصير","short_instructions":"يمكن للأشخاص الإشارة إليك هكذا: ⁨@%{username}⁩","available":"اسم المستخدم متوفر","not_available":"غير متاح. هل تريد تجربة %{suggestion}؟","not_available_no_suggestion":"غير متاح","too_short":"اسم المستخدم قصير جدًا","too_long":"اسم المستخدم طويل جدًا","checking":"جارٍ التحقُّق من توفُّر اسم المستخدم...","prefilled":"هذا البريد الالكتروني مطابق لاسم المستخدم المسجَّل هذا","required":"يُرجى إدخال اسم مستخدم","edit":"تعديل اسم المستخدم"},"locale":{"title":"لغة الواجهة","instructions":"لغة واجهة المستخدم. ستتغير عند تحديث الصفحة.","default":"(الافتراضية)","any":"أي"},"password_confirmation":{"title":"تكرار كلمة المرور"},"invite_code":{"title":"رمز الدعوة","instructions":"يتطلب تسجيل الحساب رمز دعوة"},"auth_tokens":{"title":"الأجهزة المستخدمة حديثًا","details":"التفاصيل","log_out_all":"تسجيل الخروج من كل الأجهزة","not_you":"ليس أنت؟","show_all":"عرض الكل (%{count})","show_few":"عرض أقل","was_this_you":"هل كان هذا أنت؟","was_this_you_description":"إذا لم يكن ذلك أنت، فإننا ننصحك بتغيير كلمة المرور وتسجيل الخروج على جميع الأجهزة.","browser_and_device":"‏%{browser} على %{device}","secure_account":"تأمين حسابي","latest_post":"المرة الأخيرة التي نشرت فيها…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e ‏\u0026ndash;‏ \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"‏%{browser} | \u003cspan class=\"active\"\u003eنشط الآن\u003c/span\u003e","browser_last_seen":"‏%{browser} |‏ %{date}"},"last_posted":"آخر مشاركة","last_seen":"آخر ظهور","created":"تاريخ الانضمام","log_out":"تسجيل الخروج","location":"الموقع الجغرافي","website":"الموقع الإلكتروني","email_settings":"البريد الإلكتروني","hide_profile_and_presence":"ميزتا إخفاء ملفي الشخصي العام وإخفاء الظهور","enable_physical_keyboard":"تفعيل دعم لوحة المفاتيح الفعلية على iPad","text_size":{"title":"حجم النص","smallest":"الأصغر","smaller":"أصغر","normal":"عادي","larger":"أكبر","largest":"الأكبر"},"title_count_mode":{"title":"يعرض عنوان صفحة الخلفية عدد:","notifications":"الإشعارات الجديدة","contextual":"محتوى الصفحة الجديد"},"like_notification_frequency":{"title":"إرسال إشعار عند تسجيل الإعجاب","always":"دائمًا","first_time_and_daily":"أول مرة إعجاب بالمنشور ويوميًا","first_time":"أول مرة إعجاب بالمنشور","never":"أبدًا"},"email_previous_replies":{"title":"تضمين الردود السابقة في أسفل الرسائل الإلكترونية","unless_emailed":"ما لم يتم إرسالها مسبقًا","always":"دائمًا","never":"أبدًا"},"email_digests":{"title":"إرسال ملخص إليَّ عبر البريد الإلكتروني بالموضوعات والردود الشائعة عندما لا أزور الموقع","every_30_minutes":"كل 30 دقيقة","every_hour":"كل ساعة","daily":"يوميًا","weekly":"أسبوعيًا","every_month":"كل شهر","every_six_months":"كل ستة أشهر"},"email_level":{"title":"مراسلتي عبر البريد الإلكتروني عندما يقتبس مني شخص ما، أو يرد على منشوري، أو يشير إلى اسم المستخدم الخاص بي باستخدام الرمز @، أو يدعوني إلى موضوع","always":"دائمًا","only_when_away":"عندما أكون بعيدًا فقط","never":"أبدًا"},"email_messages_level":"مراسلتي عبر البريد الإلكتروني عند إرسال رسالة إليَّ","include_tl0_in_digests":"تضمين المحتوى من المستخدمين الجُدد في الرسائل الإلكترونية التلخيصية","email_in_reply_to":"تضمين مقتطف من الرد على المنشور في الرسائل الإلكترونية","other_settings":"أخرى","categories_settings":"الفئات","new_topic_duration":{"label":"اعتبار الموضوعات جديدة في حال","not_viewed":"لم أعرضها بعد","last_here":"تم إنشاؤها منذ أن كنت هنا آخر مرة","after_1_day":"تم إنشاؤها في اليوم الماضي","after_2_days":"تم إنشاؤها في اليومين الماضيين","after_1_week":"تم إنشاؤها في الأسبوع الماضي","after_2_weeks":"تم إنشاؤها في الأسبوعين الماضيين"},"auto_track_topics":"تتبُّع الموضوعات التي أدخلها تلقائيًا","auto_track_options":{"never":"أبدًا","immediately":"فورًا","after_30_seconds":"بعد 30 ثانية","after_1_minute":"بعد دقيقة واحدة","after_2_minutes":"بعد دقيقتين","after_3_minutes":"بعد 3 دقائق","after_4_minutes":"بعد 4 دقائق","after_5_minutes":"بعد 5 دقائق","after_10_minutes":"بعد 10 دقائق"},"notification_level_when_replying":"عندما أنشر في موضوع، ضبط ذلك الموضوع على","invited":{"title":"الدعوات","pending_tab":"قيد الانتظار","pending_tab_with_count":"قيد الانتظار (%{count})","expired_tab":"منتهية","expired_tab_with_count":"المنتهية (%{count})","redeemed_tab":"تم استردادها","redeemed_tab_with_count":"تم استردادها (%{count})","invited_via":"دعوة","invited_via_link":"رابط %{key} (تم استرداد %{count}/%{max})","groups":"المجموعات","topic":"الموضوع","sent":"تاريخ الإنشاء/آخر إرسال","expires_at":"وقت الانتهاء","edit":"تعديل","remove":"إزالة","copy_link":"إنشاء رابط","reinvite":"إعادة إرسال الرسالة الإلكترونية","reinvited":"تمت إعادة إرسال الدعوة","removed":"تمت إزالتها","search":"اكتب للبحث في الدعوات...","user":"المستخدم المدعو","none":"لا توجد دعوات لعرضها.","truncated":{"zero":"يتم عرض أول %{count} دعوة.","one":"يتم عرض أول دعوة (%{count}).","two":"يتم عرض أول دعوتين (%{count}).","few":"يتم عرض أول %{count} دعوات.","many":"يتم عرض أول %{count} دعوة.","other":"يتم عرض أول %{count} دعوة."},"redeemed":"الدعوات المستردة","redeemed_at":"وقت الاسترداد","pending":"الدعوات قيد الانتظار","topics_entered":"الموضوعات المعروضة","posts_read_count":"المنشورات المقروءة","expired":"لقد انتهت مدة هذه الدعوة.","remove_all":"إزالة الدعوات المنتهية","removed_all":"تمت إزالة جميع الدعوات المنتهية!","remove_all_confirm":"هل تريد بالتأكيد إزالة جميع الدعوات المنتهية؟","reinvite_all":"إعادة إرسال جميع الدعوات","reinvite_all_confirm":"هل تريد بالتأكيد إعادة إرسال كل الدعوات؟","reinvited_all":"تم إرسال جميع الدعوات!","time_read":"وقت القراءة","days_visited":"أيام الزيارة","account_age_days":"عمر الحساب بالأيام","create":"دعوة","generate_link":"إنشاء رابط دعوة","link_generated":"إليك رابط الدعوة!","valid_for":"رابط الدعوة صالح لعنوان البريد الإلكتروني هذا فقط: %{email}","single_user":"الدعوة بالبريد الإلكتروني","multiple_user":"الدعوة برابط","invite_link":{"title":"رابط الدعوة","success":"تم إنشاء رابط الدعوة بنجاح!","error":"حدث خطأ في أثناء إنشاء رابط الدعوة","max_redemptions_allowed_label":"كم شخصًا يمكنه التسجيل باستخدام هذا الرابط؟","expires_at":"متى تنتهي صلاحية رابط الدعوة هذا؟"},"invite":{"new_title":"إنشاء دعوة","edit_title":"تعديل الدعوة","instructions":"شارك هذا الرابط لمنح حق الوصول إلى هذا الموقع على الفور","copy_link":"نسخ الرابط","expires_in_time":"تنتهي صلاحيتها في %{time}","expired_at_time":"تنتهي صلاحيتها في %{time}","show_advanced":"إظهار الخيارات المتقدمة","hide_advanced":"إخفاء الخيارات المتقدمة","restrict_email":"التقييد على عنوان بريد إلكتروني واحد","max_redemptions_allowed":"الحد الأقصى لمرات الاستخدام","add_to_groups":"إضافة إلى المجموعات","invite_to_topic":"الوصول إلى هذا الموضوع","expires_at":"تنتهي بعد","custom_message":"رسالة خاصة اختيارية","send_invite_email":"حفظ الرسالة الإلكترونية وإرسالها","save_invite":"حفظ الدعوة","invite_saved":"تم حفظ الدعوة.","invite_copied":"تم نسخ رابط الدعوة."},"bulk_invite":{"none":"لا توجد دعوات لعرضها على هذه الصفحة.","text":"دعوة جماعية","instructions":"\u003cp\u003eأرسل دعوة إلى قائمة من المستخدمين لإنشاء مجتمعك بسرعة. يمكنك إعداد \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eملف CSV\u003c/a\u003e يتضمَّن صفًا واحدًا على الأقل لكل عنوان بريد إلكتروني للمستخدمين الذين تريد دعوتهم. يمكنك إدخال المعلومات التالية المفصولة بفاصلات إذا كنت تريد إضافة أشخاص إلى مجموعات أو إرسالهم إلى موضوع معيَّن في المرة الأولى التي يسجِّلون فيها الدخول.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eسيتم إرسال دعوة إلى كل عنوان بريد إلكتروني في ملف CSV الذي تم تحميله، وستتمكن من إدارته لاحقًا.\u003c/p\u003e\n","progress":"تم تحميل %{progress}%...","success":"تم تحميل الملف بنجاح. سيتم إرسال إشعار إليك عبر رسالة عند اكتمال العملية.","error":"عذرًا، يجب أن يكون الملف بتنسيق CSV."}},"password":{"title":"كلمة المرور","too_short":"كلمة مرورك قصيرة جدًا.","common":"كلمة المرور شائعة جدًا.","same_as_username":"كلمة المرور تُطابق اسم المستخدم.","same_as_email":"كلمة المرور تُطابق عنوان البريد الإلكتروني.","ok":"تبدو كلمة مرورك جيدة.","instructions":"يجب ألا يقل عن %{count} حرف","required":"يُرجى إدخال كلمة المرور"},"summary":{"title":"الملخص","stats":"الإحصاءات","time_read":"وقت القراءة","recent_time_read":"وقت آخر قراءة","topic_count":{"zero":"موضوع تم إنشاؤه","one":"موضوع واحد تم إنشاؤه","two":"موضوعان تم إنشاؤهما","few":"موضوعات تم إنشاؤها","many":"موضوعات تم إنشاؤها","other":"موضوعات تم إنشاؤها"},"post_count":{"zero":"منشور تم إنشاؤه","one":"منشور واحد تم إنشاؤه","two":"منشوران تم إنشاؤهما","few":"منشورات تم إنشاؤها","many":"منشورًا تم إنشاؤه","other":"منشور تم إنشاؤه"},"likes_given":{"zero":"ممنوح","one":"ممنوح","two":"ممنوحان","few":"ممنوحة","many":"ممنوحًا","other":"ممنوح"},"likes_received":{"zero":"المتلقاة","one":"المتلقاة","two":"المتلقاة","few":"المتلقاة","many":"المتلقاة","other":"المتلقاة"},"days_visited":{"zero":"أيام الزيارة","one":"أيام الزيارة","two":"أيام الزيارة","few":"أيام الزيارة","many":"أيام الزيارة","other":"أيام الزيارة"},"topics_entered":{"zero":"المواضيع المعروضة","one":"المواضيع المعروضة","two":"المواضيع المعروضة","few":"المواضيع المعروضة","many":"المواضيع المعروضة","other":"المواضيع المعروضة"},"posts_read":{"zero":"منشور مقروء","one":"منشور واحد مقروء","two":"منشوران مقروآن","few":"منشورات مقروءة","many":"منشورًا مقروءًا","other":"منشور مقروء"},"bookmark_count":{"zero":"إشارة مرجعية","one":"إشارة مرجعية واحدة","two":"إشارتان مرجعيتان","few":"إشارات مرجعية","many":"إشارات مرجعية","other":"إشارات مرجعية"},"top_replies":"أهم الردود","no_replies":"لا توجد ردود بعد.","more_replies":"المزيد من الردود","top_topics":"الموضوعات الأكثر عرضًا","no_topics":"لا توجد موضوعات بعد.","more_topics":"المزيد من الموضوعات","top_badges":"أهم الشارات","no_badges":"لا توجد شارات بعد.","more_badges":"المزيد من الشارات","top_links":"أهم الروابط","no_links":"لا توجد روابط بعد.","most_liked_by":"الأكثر تسجيلًا للإعجاب","most_liked_users":"الأكثر تلقيًا للإعجاب","most_replied_to_users":"الأكثر تلقيًا للردود","no_likes":"لا توجد مرات إعجاب بعد.","top_categories":"أهم الفئات","topics":"الموضوعات","replies":"الردود"},"ip_address":{"title":"آخر عنوان IP"},"registration_ip_address":{"title":"عنوان IP للتسجيل"},"avatar":{"title":"صورة الملف الشخصي","header_title":"الملف الشخصي والرسائل والإشارات المرجعية والتفضيلات","name_and_description":"%{name} - %{description}","edit":"تعديل صورة الملف الشخصي"},"title":{"title":"اللقب","none":"(لا يوجد)","instructions":"يظهر بعد اسم المستخدم"},"flair":{"title":"الطابع","none":"(لا يوجد)","instructions":"يتم عرض الرمز بجوار صورة ملفك الشخصي"},"primary_group":{"title":"المجموعة الأساسية","none":"(لا يوجد)"},"filters":{"all":"الكل"},"stream":{"posted_by":"تم النشر بواسطة","sent_by":"تم الإرسال بواسطة","private_message":"رسالة","the_topic":"الموضوع"}},"loading":"جارٍ التحميل...","errors":{"prev_page":"في أثناء محاولة التحميل","reasons":{"network":"خطأ في الشبكة","server":"خطأ في الخادم","forbidden":"تم رفض الوصول","unknown":"خطأ","not_found":"الصفحة غير موجودة"},"desc":{"network":"يُرجى التحقُّق من اتصالك.","network_fixed":"تمت استعادة الاتصال.","server":"رمز الخطأ: %{status}","forbidden":"غير مسموح لك بعرض هذا.","not_found":"عذرًا، حاول التطبيق تحميل عنوان URL غير موجود.","unknown":"حدث خطأ ما."},"buttons":{"back":"الرجوع","again":"إعادة المحاولة","fixed":"تحميل الصفحة"}},"modal":{"close":"إغلاق","dismiss_error":"تجاهل الخطأ"},"close":"إغلاق","assets_changed_confirm":"لقد تلقى هذا الموقع ترقية برمجية للتو. هل تريد الحصول على أحدث نسخة الآن؟","logout":"تم تسجيل خروجك.","refresh":"تحديث","home":"الصفحة الرئيسية","read_only_mode":{"enabled":"هذا الموقع في وضع القراءة فقط. نأمل أن تواصل تصفُّحه، لكن الرد وتسجيل الإعجاب وغيرهما من الإجراءات ستكون متوقفة حاليًا.","login_disabled":"يكون تسجيل الدخول متوقفًا في حال كان الموقع في وضع القراءة فقط.","logout_disabled":"يتم إيقاف تسجيل الخروج عندما يكون الموقع في وضع القراءة فقط."},"logs_error_rate_notice":{},"learn_more":"معرفة المزيد...","first_post":"أول منشور","mute":"كتم","unmute":"إلغاء الكتم","last_post":"آخر منشور","local_time":"التوقيت المحلي","time_read":"وقت القراءة","time_read_recently":"%{time_read} حديثًا","time_read_tooltip":"إجمالي وقت القراءة هو %{time_read}","time_read_recently_tooltip":"إجمالي وقت القراءة هو %{time_read} (%{recent_time_read} خلال 60 يومًا الماضية)","last_reply_lowercase":"آخر رد","replies_lowercase":{"zero":"رد","one":"رد واحد","two":"ردَّان","few":"ردود","many":"ردود","other":"ردود"},"signup_cta":{"sign_up":"الاشتراك","hide_session":"تذكيري غدًا","hide_forever":"لا، شكرًا","hidden_for_session":"حسنًا، سنسألك غدًا. يمكنك دائمًا استخدام \"تسجيل الدخول\" لإنشاء حساب أيضًا.","intro":"مرحبًا! يبدو أنك تستمتع بالمناقشة، لكنك لم تشترك للحصول على حساب حتى الآن.","value_prop":"عند إنشاء حساب، فإننا نتذكَّر ما قرأته بالضبط؛ حتى تتمكن دائمًا من العودة والمتابعة من حيث توقفت. ستتلقى أيضًا الإشعارات هنا وعبر البريد الإلكتروني كلما ردَّ أحد عليك. ويمكنك تسجيل إعجابك بالمنشورات لمشاركة مشاعر الود. :heartpulse:"},"summary":{"enabled_description":"أنت تعرض ملخصًا لهذا الموضوع: المنشورات الأكثر إثارة للاهتمام وفقًا للمجتمع.","description":{"zero":"هناك \u003cb\u003e%{count}\u003c/b\u003e من الردود.","one":"هناك رد واحد (\u003cb\u003e%{count}\u003c/b\u003e).","two":"هناك \u003cb\u003e%{count}\u003c/b\u003e من الردود.","few":"هناك \u003cb\u003e%{count}\u003c/b\u003e من الردود.","many":"هناك \u003cb\u003e%{count}\u003c/b\u003e من الردود.","other":"هناك \u003cb\u003e%{count}\u003c/b\u003e من الردود."},"enable":"تلخيص هذا الموضوع","disable":"عرض كل المنشورات"},"deleted_filter":{"enabled_description":"يتتضمَّن هذا الموضوع منشورات محذوفة، والتي تم إخفاؤها.","disabled_description":"يتم عرض المنشورات المحذوفة في الموضوع.","enable":"إخفاء المنشورات المحذوفة","disable":"عرض المنشورات المحذوفة"},"private_message_info":{"title":"رسالة","invite":"دعوة الآخرين...","edit":"إضافة أو إزالة...","remove":"إزالة...","add":"إضافة...","leave_message":"هل تريد حقًا مغادرة هذه الرسالة؟","remove_allowed_user":"هل تريد حقًا إزالة %{name} من هذه الرسالة؟","remove_allowed_group":"هل تريد حقًا إزالة %{name} من هذه الرسالة؟"},"email":"البريد الإلكتروني","username":"اسم المستخدم","last_seen":"آخر ظهور","created":"تاريخ الإنشاء","created_lowercase":"تاريخ الإنشاء","trust_level":"مستوى الثقة","search_hint":"اسم المستخدم أو البريد إلكتروني أو عنوان IP","create_account":{"header_title":"مرحبًا!","subheader_title":"لننشئ حسابك","disclaimer":"يشير التسجيل إلى موافقتك على \u003ca href='%{privacy_link}' target='blank'\u003eسياسة الخصوصية\u003c/a\u003e و\u003ca href='%{tos_link}' target='blank'\u003eشروط الخدمة\u003c/a\u003e.","title":"إنشاء حسابك","failed":"حدث خطأ ما. قد يكون هذا البريد الإلكتروني مسجلًا بالفعل. جرِّب رابط نسيان كلمة المرور"},"forgot_password":{"title":"إعادة ضبط كلمة المرور","action":"نسيت كلمة مروري","invite":"أدخِل اسم المستخدم أو عنوان البريد الإلكتروني، وسنُرسل إليك رسالة إلكترونية لإعادة ضبط كلمة المرور.","reset":"إعادة ضبط كلمة المرور","complete_username":"إذا تطابق أحد الحسابات مع اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e، فستتلقى سريعًا رسالة إلكترونية تتضمَّن تعليمات عن كيفية إعادة ضبط كلمة المرور.","complete_email":"إذا تطابق أحد الحسابات مع \u003cb\u003e%{email}\u003c/b\u003e، فستتلقى سريعًا رسالة إلكترونية تتضمَّن تعليمات عن كيفية إعادة ضبط كلمة المرور.","complete_username_found":"لقد عثرنا على حساب مطابق لاسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e. ومن المفترض أن تتلقى رسالة إلكترونية بإرشادات إعادة ضبط كلمة المرور قريبًا.","complete_email_found":"لقد عثرنا على حساب مطابق لعنوان البريد الإلكتروني \u003cb\u003e%{email}\u003c/b\u003e. ومن المفترض أن تتلقى رسالة إلكترونية بإرشادات إعادة ضبط كلمة المرور قريبًا.","complete_username_not_found":"لا يوجد حساب مطابق لاسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"لا يوجد حساب مطابق لعنوان البريد الإلكتروني \u003cb\u003e%{email}\u003c/b\u003e","help":"لم تصلك الرسالة الإلكترونية بعد؟ احرص على التحقُّق من مجلد البريد غير المرغوب فيه أولًا.\u003cp\u003eلست متأكدًا من عنوان البريد الإلكتروني الذي استخدمته؟ أدخِل عنوان البريد الإلكتروني وسنخبرك إذا كان موجودًا هنا.\u003c/p\u003e\u003cp\u003eإذا فقدت الوصول إلى عنوان البريد الإلكتروني المرتبط بحسابك، يُرجى التواصل مع \u003ca href='%{basePath}/about'\u003eفريق عملنا لمساعدتك.\u003c/a\u003e\u003c/p\u003e","button_ok":"حسنًا","button_help":"المساعدة"},"email_login":{"link_label":"مراسلتي عبر البريد الإلكتروني برابط تسجيل الدخول","button_label":"عبر البريد الإلكتروني","login_link":"تخطي كلمة المرور؛ مراسلتي عبر البريد الإلكتروني برابط تسجيل الدخول","emoji":"رمز قفل","complete_username":"إذا تطابق أحد الحسابات مع اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e، فمن المفترض أن تتلقى رسالة إلكترونية برابط تسجيل الدخول قريبًا.","complete_email":"إذا تطابق أحد الحسابات مع عنوان البريد الإلكتروني \u003cb\u003e%{email}\u003c/b\u003e، فمن المفترض أن تتلقى رسالة إلكترونية برابط تسجيل الدخول قريبًا.","complete_username_found":"لقد عثرنا على حساب مطابق لاسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e. ومن المفترض أن تتلقى رسالة إلكتروني برابط تسجيل الدخول قريبًا.","complete_email_found":"لقد عثرنا على حساب مطابق لعنوان البريد الإلكتروني \u003cb\u003e%{email}\u003c/b\u003e. ومن المفترض أن تتلقى رسالة إلكترونية برابط تسجيل الدخول قريبًا.","complete_username_not_found":"لا يوجد حساب مطابق لاسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"لا يوجد حساب مطابق لعنوان البريد الإلكتروني \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"المتابعة إلى %{site_name}","logging_in_as":"تسجيل الدخول بعنوان البريد الإلكتروني %{email}","confirm_button":"إنهاء تسجيل الدخول"},"login":{"header_title":"مرحبًا بعودتك","subheader_title":"تسجيل الدخول إلى حسابك","title":"تسجيل الدخول","username":"المستخدم","password":"كلمة المرور","second_factor_title":"المصادقة الثنائية","second_factor_description":"يُرجى إدخال رمز المصادقة الثنائية من تطبيقك:","second_factor_backup":"تسجيل الدخول باستخدام رمز احتياطي","second_factor_backup_title":"الرمز الاحتياطي للمصادقة الثنائية","second_factor_backup_description":"يُرجى إدخال أحد الرموز الاحتياطية:","second_factor":"تسجيل الدخول باستخدام تطبيق المصادقة","security_key_description":"عندما يكون مفتاح الأمان المادي جاهزًا، اضغط على زر \"المصادقة باستخدام مفتاح الأمان\" أدناه.","security_key_alternative":"جرِّب طريقة أخرى","security_key_authenticate":"المصادقة باستخدام مفتاح الأمان","security_key_not_allowed_error":"انتهت مهلة عملية المصادقة باستخدام مفتاح الأمان أو تم إلغاؤها.","security_key_no_matching_credential_error":"تعذَّر العثور على بيانات اعتماد مطابقة في مفتاح الأمان المقدَّم.","security_key_support_missing_error":"لا يدعم جهازك أو متصفحك الحالي استخدام مفاتيح الأمان. يُرجى استخدام طريقة مختلفة.","email_placeholder":"البريد الإلكتروني/اسم المستخدم","caps_lock_warning":"مفتاح Caps Lock مفعَّل","error":"خطأ غير معروف","cookies_error":"يبدو أن ملفات تعريف الارتباط في متصفحك متوقفة. قد لا تتمكن من تسجيل الدخول قبل تفعيلها أولًا.","rate_limit":"يُرجى الانتظار قبل محاولة تسجيل الدخول مرة أخرى.","blank_username":"يُرجى إدخال بريدك الإلكتروني أو اسم المستخدم.","blank_username_or_password":"يُرجى إدخال بريدك الإلكتروني أو اسم المستخدم، وكلمة المرور.","reset_password":"إعادة ضبط كلمة المرور","logging_in":"جارٍ تسجيل الدخول...","or":"أو","authenticating":"جارٍ المصادقة...","awaiting_activation":"ما زال حسابك بانتظار التفعيل، استخدم رابط \"نسيت كلمة المرور\" لإرسال رسالة إلكترونية أخرى للتفعيل.","awaiting_approval":"لم يوافق أي من أعضاء فريق العمل على حسابك بعد. سنُرسل إليك رسالة إلكترونية عند الموافقة عليه.","requires_invite":"عذرًا، الوصول إلى هذا المنتدى مقصور على أصحاب الدعوات فقط.","not_activated":"لا يمكنك تسجيل الدخول بعد. لقد أرسلنا سابقًا رسالة إلكترونية للتفعيل إلى \u003cb\u003e%{sentTo}\u003c/b\u003e. يُرجى اتباع الإرشادات الواردة في هذه الرسالة لتفعيل حسابك.","not_allowed_from_ip_address":"لا يمكنك تسجيل الدخول من عنوان IP هذا.","admin_not_allowed_from_ip_address":"لا يمكنك تسجيل الدخول كمسؤول من عنوان IP هذا.","resend_activation_email":"انقر هنا لإرسال الرسالة الإلكترونية للتفعيل مرة أخرى.","omniauth_disallow_totp":"لقد فعَّلت المصادقة الثنائية على حسابك. يُرجى تسجيل الدخول بكلمة المرور.","resend_title":"إعادة إرسال الرسالة الإلكترونية للتفعيل","change_email":"تغيير عنوان البريد الإلكتروني","provide_new_email":"أدخِل عنوانًا جديدًا وسنعيد إرسال الرسالة الإلكترونية للتأكيد إليك.","submit_new_email":"تحديث عنوان البريد الإلكتروني","sent_activation_email_again":"لقد أرسلنا رسالة إلكترونية أخرى للتفعيل إلى \u003cb\u003e%{currentEmail}\u003c/b\u003e. قد يستغرق وصولها بضع دقائق؛ لذا احرص على التحقُّق من مجلد البريد غير المرغوب فيه.","sent_activation_email_again_generic":"لقد أرسلنا رسالة إلكترونية أخرى للتفعيل. قد يستغرق وصولها بضع دقائق؛ لذا احرص على التحقُّق من مجلد البريد غير المرغوب فيه.","to_continue":"يُرجى تسجيل الدخول","preferences":"عليك تسجل الدخول لتغيير تفضيلات المستخدم.","not_approved":"لم تتم الموافقة على حسابك حتى الآن. سيتم إعلامك عبر البريد الإلكتروني عندما تكون مستعدًا لتسجيل الدخول.","google_oauth2":{"name":"Google","title":"باستخدام Google"},"twitter":{"name":"Twitter","title":"باستخدام Twitter"},"instagram":{"name":"Instagram","title":"باستخدام Instagram"},"facebook":{"name":"Facebook","title":"باستخدام Facebook"},"github":{"name":"GitHub","title":"باستخدام GitHub"},"discord":{"name":"Discord","title":"باستخدام Discord"},"second_factor_toggle":{"totp":"استخدام تطبيق مصادقة بدلًا من ذلك","backup_code":"استخدام رمز احتياطي بدلًا من ذلك"}},"invites":{"accept_title":"الدعوة","emoji":"رمز مظروف","welcome_to":"مرحبًا بك في %{site_name}!","invited_by":"دعاك:","social_login_available":"يمكنك أيضًا تسجيل الدخول بأي حساب تواصل اجتماعي باستخدام هذا البريد الإلكتروني.","your_email":"عنوان البريد الإلكتروني لحسابك هو \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"قبول الدعوة","success":"تم إنشاء حسابك وتسجيل دخولك.","name_label":"الاسم","password_label":"كلمة المرور","optional_description":"(اختياري)"},"password_reset":{"continue":"المتابعة إلى %{site_name}"},"emoji_set":{"apple_international":"Apple/دولي","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"الفئات فقط","categories_with_featured_topics":"الفئات ذات الموضوعات المميزة","categories_and_latest_topics":"الفئات وأحدث الموضوعات","categories_and_top_topics":"الفئات والموضوعات الأكثر عرضًا","categories_boxes":"المربعات ذات الفئات الفرعية","categories_boxes_with_topics":"مربعات بالموضوعات المميزة"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"جارٍ التحميل..."},"category_row":{"topic_count":{"zero":"%{count} موضوع في هذه الفئة","one":"موضوع واحد (%{count}) في هذه الفئة","two":"موضوعان (%{count}) في هذه الفئة","few":"%{count} موضوعات في هذه الفئة","many":"%{count} موضوعًا في هذه الفئة","other":"%{count} موضوع في هذه الفئة"},"plus_subcategories_title":{"zero":"%{name} و%{count} فئة فرعية","one":"%{name} وفئة فرعية واحدة (%{count})","two":"%{name} وفئتان فرعيتان (%{count})","few":"%{name} و%{count} فئات فرعية","many":"%{name} و%{count} فئة فرعية","other":"%{name} و%{count} فئة فرعية"},"plus_subcategories":{"zero":"تصنيف فرعي + %{count} و تصنيفات فرعية","one":"+ %{count} تصنيفات فرعية","two":"+ %{count} تصنيف فرعي واحد و تصنيفات فرعية","few":"+ %{count} فئات فرعية","many":"+ %{count} فئة فرعية","other":"+ %{count} فئة فرعية"}},"select_kit":{"filter_by":"التصفية حسب: %{name}","select_to_filter":"تحديد قيمة للتصفية","default_header_text":"تحديد...","no_content":"لم يتم العثور على نتائج مطابقة","filter_placeholder":"بحث...","filter_placeholder_with_any":"بحث أو إنشاء...","create":"إنشاء: \"%{content}\"","max_content_reached":{"zero":"يمكنك تحديد %{count} عنصر فقط.","one":"يمكنك تحديد عنصر واحد (%{count}).","two":"يمكنك تحديد عنصرين (%{count}) فقط.","few":"يمكنك تحديد %{count} عناصر فقط.","many":"يمكنك تحديد %{count} عنصرًا فقط.","other":"يمكنك تحديد %{count} عنصر فقط."},"min_content_not_reached":{"zero":"حدِّد %{count} عنصر على الأقل.","one":"حدِّد عنصرًا واحدًا (%{count}) على الأقل.","two":"حدِّد عنصرين (%{count}) على الأقل.","few":"حدِّد %{count} عناصر على الأقل.","many":"حدِّد %{count} عنصرًا على الأقل.","other":"حدِّد %{count} عنصر على الأقل."},"invalid_selection_length":{"zero":"يجب ألا يقل التحديد عن %{count} حرف على الأقل.","one":"يجب ألا يقل التحديد عن حرف واحد (%{count}) على الأقل.","two":"يجب ألا يقل التحديد عن حرفين (%{count}) على الأقل.","few":"يجب ألا يقل التحديد عن %{count} أحرف على الأقل.","many":"يجب ألا يقل التحديد عن %{count} حرفًا على الأقل.","other":"يجب ألا يقل التحديد عن %{count} حرف على الأقل."},"components":{"tag_drop":{"filter_for_more":"المزيد من عوامل التصفية..."},"categories_admin_dropdown":{"title":"إدارة الفئات"}}},"date_time_picker":{"from":"من","to":"إلى"},"emoji_picker":{"filter_placeholder":"البحث عن رمز تعبيري","smileys_\u0026_emotion":"الوجوه المبتسمة ورموز المشاعر","people_\u0026_body":"الأشخاص وأعضاء الجسم","animals_\u0026_nature":"الحيوانات والطبيعة","food_\u0026_drink":"الأطعمة والمشروبات","travel_\u0026_places":"السفر والأماكن","activities":"الأنشطة","objects":"الأشياء","symbols":"الرموز","flags":"البلاغات","recent":"المستخدمة حديثًا","default_tone":"بلا لون بشرة","light_tone":"لون البشرة الفاتح","medium_light_tone":"لون البشرة الفاتح المتوسط","medium_tone":"لون البشرة المتوسط","medium_dark_tone":"لون البشرة الداكن المتوسط","dark_tone":"لون البشرة الداكن","default":"الرموز التعبيرية المخصَّصة"},"shared_drafts":{"title":"المسودات المشتركة","notice":"هذا الموضوع مرئي فقط لمن يمكنهم نشر المسودات المشتركة.","destination_category":"فئة الوجهة","publish":"نشر المسودة المشتركة","confirm_publish":"هل تريد بالتأكيد نشر هذه المسودة؟","publishing":"جارٍ نشر الموضوع..."},"composer":{"emoji":"الرمز التعبيري :)","more_emoji":"المزيد...","options":"الخيارات","whisper":"همس","unlist":"تم إلغاء إدراجه","add_warning":"هذا تحذير رسمي.","toggle_whisper":"تفعيل الهمس","toggle_unlisted":"تفعيل إلغاء الإدراج","posting_not_on_topic":"أي موضوع تريد الرد عليه؟","saved_local_draft_tip":"تم الحفظ محليًا","similar_topics":"موضوعك يشابه...","drafts_offline":"مسودات بلا اتصال","edit_conflict":"تعارض في التعديل","group_mentioned_limit":{"zero":"\u003cb\u003eتحذير!\u003c/b\u003eلقد أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، لكن هذه المجموعة تتضمَّن عدد أعضاء أكثر من حد الإشارة الذي عيَّنه المسؤول وهو %{count} مستخدم. لن يتم إرسال إشعار إلى أي أحد.","one":"\u003cb\u003eتحذير!\u003c/b\u003eلقد أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، لكن هذه المجموعة تتضمَّن عدد أعضاء أكثر من حد الإشارة الذي عيَّنه المسؤول وهو مستخدم واحد (%{count}). لن يتم إرسال إشعار إلى أي أحد.","two":"\u003cb\u003eتحذير!\u003c/b\u003eلقد أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، لكن هذه المجموعة تتضمَّن عدد أعضاء أكثر من حد الإشارة الذي عيَّنه المسؤول وهو مستخدمان (%{count}). لن يتم إرسال إشعار إلى أي أحد.","few":"\u003cb\u003eتحذير!\u003c/b\u003eلقد أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، لكن هذه المجموعة تتضمَّن عدد أعضاء أكثر من حد الإشارة الذي عيَّنه المسؤول وهو %{count} مستخدمين. لن يتم إرسال إشعار إلى أي أحد.","many":"\u003cb\u003eتحذير!\u003c/b\u003eلقد أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، لكن هذه المجموعة تتضمَّن عدد أعضاء أكثر من حد الإشارة الذي عيَّنه المسؤول وهو %{count} مستخدمًا. لن يتم إرسال إشعار إلى أي أحد.","other":"\u003cb\u003eتحذير!\u003c/b\u003eلقد أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، لكن هذه المجموعة تتضمَّن عدد أعضاء أكثر من حد الإشارة الذي عيَّنه المسؤول وهو %{count} مستخدم. لن يتم إرسال إشعار إلى أي أحد."},"group_mentioned":{"zero":"تشير الإشارة إلى %{group} أنك على وشك إرسال إشعار إلى \u003ca href='%{group_link}'\u003e%{count} شخص\u003c/a\u003e. هل أنت متأكد؟","one":"تشير الإشارة إلى %{group} أنك على وشك إرسال إشعار إلى \u003ca href='%{group_link}'\u003eشخص واحد (%{count})\u003c/a\u003e. هل أنت متأكد؟","two":"تشير الإشارة إلى %{group} أنك على وشك إرسال إشعار إلى \u003ca href='%{group_link}'\u003eشخصين (%{count})\u003c/a\u003e. هل أنت متأكد؟","few":"تشير الإشارة إلى %{group} أنك على وشك إرسال إشعار إلى \u003ca href='%{group_link}'\u003e%{count} أشخاص)\u003c/a\u003e. هل أنت متأكد؟","many":"تشير الإشارة إلى %{group} أنك على وشك إرسال إشعار إلى \u003ca href='%{group_link}'\u003e%{count} شخصًا)\u003c/a\u003e. هل أنت متأكد؟","other":"تشير الإشارة إلى %{group} أنك على وشك إرسال إشعار إلى \u003ca href='%{group_link}'\u003e%{count} شخص)\u003c/a\u003e. هل أنت متأكد؟"},"cannot_see_mention":{"category":"لقد أشرت إلى %{username}، لكنه لن يتلقي إشعارًا لأنه ليس لديه إذن بالوصول إلى هذه الفئة. عليك إضافته إلى إحدى المجموعات التي لديها إذن بالوصول إلى هذه الفئة.","private":"لقد أشرت إلى %{username}، ولكن لن يتم إشعاره لأنه لا يمكنه رؤية هذه الرسالة الخاصة. عليك دعوته إلى هذه الرسالة الخاصة."},"duplicate_link":"يبدو أن رابطك إلى \u003cb\u003e%{domain}\u003c/b\u003e قدم تم نشره في الموضوع بواسطة \u003cb\u003e@%{username}\u003c/b\u003e في \u003ca href='%{post_url}'\u003eرد بتاريخ %{ago}\u003c/a\u003e. هل تريد بالتأكيد نشره مرة أخرى؟","reference_topic_title":"بخصوص: %{title}","error":{"title_missing":"العنوان مطلوب","title_too_short":{"zero":"العنوان يجب أن يكون علي الاقل %{count} حرف","one":"يجب ألا يقل العنوان عن حرف واحد (%{count})","two":"العنوان يجب أن يكون علي الاقل %{count} حرف","few":"العنوان يجب أن يكون علي الاقل %{count} حرف","many":"العنوان يجب أن يكون علي الاقل %{count} حرف","other":"العنوان يجب أن يكون علي الاقل %{count} حرف"},"title_too_long":{"zero":"العنوان يجب أن لا يزيد عن %{count} حرف","one":"يجب ألا يزيد العنوان عن حرف واحد (%{count})","two":"العنوان يجب أن لا يزيد عن %{count} حرف","few":"العنوان يجب أن لا يزيد عن %{count} حرف","many":"العنوان يجب أن لا يزيد عن %{count} حرف","other":"العنوان يجب أن لا يزيد عن %{count} حرف"},"post_missing":"لا يمكن ترك المنشور فارغًا","post_length":{"zero":"المنشور يجب أن يكون علي الاقل %{count} حرف","one":"يجب ألا يقل المنشور عن حرف واحد (%{count})","two":"المنشور يجب أن يكون علي الاقل %{count} حرف","few":"المنشور يجب أن يكون علي الاقل %{count} حرف","many":"المنشور يجب أن يكون علي الاقل %{count} حرف","other":"المنشور يجب أن يكون علي الاقل %{count} حرف"},"try_like":"هل جرَّبت زر %{heart}؟","category_missing":"عليك اختيار فئة","tags_missing":{"zero":"عليك اختيار %{count} وسم على الأقل","one":"عليك اختيار وسم واحد (%{count}) على الأقل","two":"عليك اختيار وسمين (%{count}) على الأقل","few":"عليك اختيار %{count} وسوم على الأقل","many":"عليك اختيار %{count} وسمًا على الأقل","other":"عليك اختيار %{count} وسم على الأقل"},"topic_template_not_modified":"يُرجى إضافة التفاصيل والمواصفات المحدَّدة إلى موضوعك من خلال تعديل نموذج الموضوع."},"save_edit":"حفظ التعديل","overwrite_edit":"استبدال التعديل","reply_original":"كتابة رد على الموضوع الأصلي","reply_here":"الرد هنا","reply":"الرد","cancel":"إلغاء","create_topic":"إنشاء موضوع","create_pm":"رسالة","create_whisper":"همس","create_shared_draft":"إنشاء مسودة مشتركة","edit_shared_draft":"تعديل المسودة المشتركة","title":"أو اضغط على Ctrl+Enter","users_placeholder":"إضافة مستخدم","title_placeholder":"ما موضوع هذه المناقشة في جملة واحدة مختصرة؟","title_or_link_placeholder":"اكتب عنوانًا أو الصق رابطًا هنا","edit_reason_placeholder":"ما سبب التعديل؟","topic_featured_link_placeholder":"أدخِل الرابط الموضَّح مع العنوان.","remove_featured_link":"أزِل الرابط من الموضوع.","reply_placeholder":"اكتب هنا. استخدم Markdown أو BBCode أو HTML للتنسيق. اسحب الصور أو الصقها.","reply_placeholder_no_images":"اكتب هنا. استخدم Markdown أو BBCode أو HTML للتنسيق.","reply_placeholder_choose_category":"حدِّد فئةً قبل الكتابة هنا.","view_new_post":"اعرض منشورك الجديد.","saving":"جارٍ الحفظ","saved":"تم الحفظ!","saved_draft":"لديك مسودة منشور محفوظة. اضغط لاستئنافها.","uploading":"جارٍ التحميل...","show_preview":"إظهار المعاينة","hide_preview":"إخفاء المعاينة","quote_post_title":"اقتباس المنشور بأكمله","bold_label":"B","bold_title":"غامق","bold_text":"نص غامق","italic_label":"I","italic_title":"مائل","italic_text":"نص مائل","link_title":"رابط تشعُّبي","link_description":"أدخِل وصف الرابط هنا","link_dialog_title":"إدراج رابط تشعُّبي","link_optional_text":"عنوان اختياري","link_url_placeholder":"الصق عنوانًا أو اكتب للبحث في الموضوعات","blockquote_title":"اقتباس فقرة","blockquote_text":"اقتباس فقرة","code_title":"نص منسَّق سابقًا","code_text":"أضِف 4 مسافات أول السطر قبل النص مسبق التنسيق","paste_code_text":"اكتب الرمز أو الصقه هنا","upload_title":"تحميل","upload_description":"أدخِل وصف التحميل هنا","olist_title":"قائمة مرقَّمة","ulist_title":"قائمة منقَّطة","list_item":"إدراج عنصر","toggle_direction":"تبديل الاتجاه","help":"مساعدة تحرير Markdown","collapse":"تصغير لوحة الكتابة","open":"فتح لوحة الكتابة","abandon":"إغلاق أداة الإنشاء وتجاهل المسودة","enter_fullscreen":"فتح أداة الإنشاء في وضع ملء الشاشة","exit_fullscreen":"الخروج من أداة الإنشاء في وضع ملء الشاشة","show_toolbar":"عرض شريط أداة الإنشاء","hide_toolbar":"إخفاء شريط أداة الإنشاء","modal_ok":"حسنًا","modal_cancel":"إلغاء","cant_send_pm":"عذرًا، لا يمكنك إرسال رسالة إلى %{username}.","yourself_confirm":{"title":"هل نسيت إضافة المستلمين؟","body":"هذه الرسالة يتم إرسالها إليك فقط في الوقت الحالي!"},"slow_mode":{"error":"هذا الموضوع في الوضع البطيء. لقد نشرت بالفعل مؤخرًا؛ يمكنك النشر مرة أخرى بعد %{timeLeft}."},"admin_options_title":"إعدادات فريق العمل الاختيارية لهذا الموضوع","composer_actions":{"reply":"الرد","draft":"مسودة","edit":"تعديل","reply_to_post":{"label":"الرد على منشور بواسطة %{postUsername}","desc":"الرد على منشور محدَّد"},"reply_as_new_topic":{"label":"الرد كموضوع مرتبط","desc":"إنشاء موضوع جديد مرتبط بهذا الموضوع","confirm":"لديك مسودة موضوع جديد تم حفظها، وسيتم استبدالها إذا أنشأت موضوعًا مرتبطًا."},"reply_as_new_group_message":{"label":"الرد كرسالة جديدة للمجموعة","desc":"إنشاء رسالة جديدة بدءًا بالمستلمين الجُدد"},"reply_as_private_message":{"label":"رسالة جديدة","desc":"إنشاء رسالة خاصة جديدة"},"reply_to_topic":{"label":"الرد على الموضوع","desc":"الرد على الموضوع، وليس أي منشور محدَّد"},"toggle_whisper":{"label":"تفعيل الهمس","desc":"تكون الهمسات مرئية لأعضاء فريق العمل فقط"},"create_topic":{"label":"موضوع جديد"},"shared_draft":{"label":"مسودة مشتركة","desc":"إنشاء مسودة الموضوع ستكون مرئية للمستخدمين المسموح لهم فقط"},"toggle_topic_bump":{"label":"تفعيل رفع الموضوع","desc":"الرد دون تغيير تاريخ آخر رد"}},"reload":"إعادة التحميل","ignore":"تجاهل","details_title":"الملخص","details_text":"سيُخفى هذا النص"},"notifications":{"tooltip":{"regular":{"zero":"%{count} إشعار غير مقروء","one":"إشعار واحد (%{count}) غير مقروء","two":"إشعاران (%{count}) غير مقروءين","few":"%{count} إشعارات غير مقروءة","many":"%{count} إشعارًا غير مقروء","other":"%{count} إشعار غير مقروء"},"message":{"zero":"%{count} رسالة غير مقروءة","one":"رسالة واحدة (%{count}) غير مقروءة","two":"رسالتان (%{count}) غير مقروءتين","few":"%{count} رسائل غير مقروءة","many":"%{count} رسالة غير مقروءة","other":"%{count} رسالة غير مقروءة"},"high_priority":{"zero":"%{count} إشعار عالي الأولوية غير مقروء","one":"إشعار واحد (%{count}) عالي الأولوية غير مقروء","two":"إشعاران (%{count}) عاليا الأولوية غير مقروءين","few":"%{count} إشعارات عالية الأولوية غير مقروءة","many":"%{count} إشعارًا عالي الأولوية غير مقروء","other":"%{count} إشعار عالي الأولوية غير مقروء"}},"title":"إشعارات الإشارة إلى اسمك باستخدام الرمز @، والردود على منشوراتك وموضوعاتك ورسائلك، وغيرها","none":"يتعذَّر تحميل الإشعارات في الوقت الحالي.","empty":"لم يتم العثور على إشعارات.","post_approved":"تمت الموافقة على منشورك","reviewable_items":"عناصر تتطلب المراجعة","mentioned":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","group_mentioned":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","quoted":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","bookmark_reminder":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","replied":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","posted":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","edited":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","liked":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}، و%{username2}\u003c/span\u003e %{description}","liked_many":{"zero":"\u003cspan class='multi-user'\u003e%{username} و%{username2} و%{count} مستخدم آخر\u003c/span\u003e %{description}","one":"\u003cspan class='multi-user'\u003e%{username} و%{username2} ومستخدم واحد (%{count}) آخر\u003c/span\u003e %{description}","two":"\u003cspan class='multi-user'\u003e%{username} و%{username2} ومستخدمان (%{count}) آخران\u003c/span\u003e %{description}","few":"\u003cspan class='multi-user'\u003e%{username} و%{username2} و%{count} مستخدمين آخرين\u003c/span\u003e %{description}","many":"\u003cspan class='multi-user'\u003e‏%{username} و%{username2} و%{count} مستخدمًا آخر\u003c/span\u003e ‏%{description}","other":"\u003cspan class='multi-user'\u003e‏%{username} و%{username2} و%{count} مستخدم آخر\u003c/span\u003e ‏%{description}"},"liked_consolidated_description":{"zero":"سجَّل إعجابه على %{count} من منشوراتك","one":"سجَّل إعجابه على واحد (%{count}) من منشوراتك","two":"سجَّل إعجابه على اثنين (%{count}) من منشوراتك","few":"سجَّل إعجابه على %{count} من منشوراتك","many":"سجَّل إعجابه على %{count} من منشوراتك","other":"سجَّل إعجابه على %{count} من منشوراتك"},"liked_consolidated":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","private_message":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","invited_to_private_message":"‏\u003cp\u003e\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","invited_to_topic":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","invitee_accepted":"قَبِل ‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e دعوتك","moved_post":"‏نَقَل \u003cspan\u003e⁨%{username}⁩\u003c/span\u003e المنشور %{description}","linked":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","granted_badge":"تم منحك شارة \"%{description}\"","topic_reminder":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","watching_first_post":"\u003cspan\u003eموضوع جديد\u003c/span\u003e: ‏%{description}","membership_request_accepted":"تم قبول العضوية في \"%{group_name}\"","membership_request_consolidated":{"zero":"%{count} طلب عضوية مفتوح للمجموعة \"%{group_name}\"","one":"طلب عضوية واحد (%{count}) مفتوح للمجموعة \"%{group_name}\"","two":"طلبا عضوية (%{count}) مفتوحان للمجموعة \"%{group_name}\"","few":"%{count} طلبات عضوية مفتوحة للمجموعة \"%{group_name}\"","many":"%{count} طلب عضوية مفتوح للمجموعة \"%{group_name}\"","other":"%{count} طلب عضوية مفتوح للمجموعة \"%{group_name}\""},"reaction":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","reaction_2":"\u003cspan\u003e%{username} و%{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - اكتمل","group_message_summary":{"zero":"%{count} رسالة في صندوق البريد الوارد للمجموعة %{group_name}","one":"رسالة واحدة (%{count}) في صندوق البريد الوارد للمجموعة %{group_name}","two":"رسالتنان (%{count}) في صندوق البريد الوارد للمجموعة %{group_name}","few":"%{count} رسائل في صندوق البريد الوارد للمجموعة %{group_name}","many":"%{count} رسالة في صندوق البريد الوارد للمجموعة %{group_name}","other":"%{count} رسالة في صندوق البريد الوارد للمجموعة %{group_name}"},"popup":{"mentioned":"أشار %{username} إليك في \"%{topic}\" - ‏%{site_title}","group_mentioned":"أشار %{username} إليك في \"%{topic}\" - ‏%{site_title}","quoted":"اقتبس %{username} منك في \"%{topic}\" - %{site_title}","replied":"ردَّ %{username} عليك في \"%{topic}\" - %{site_title}","posted":"نشر %{username} في \"%{topic}\" - ‏%{site_title}","private_message":"أرسل %{username} إليك رسالة خاصة في \"%{topic}\" -‏ %{site_title}","linked":"وضع %{username} رابطًا إلى منشورك في \"%{topic}\" - %{site_title}","watching_first_post":"أنشأ %{username} موضوعًا جديدًا: \"%{topic}\" -‏ %{site_title}","confirm_title":"تم تفعيل الإشعارات - %{site_title}","confirm_body":"تم بنجاح! تم تفعيل الإشعارات.","custom":"إشعار من %{username} على %{site_title}"},"titles":{"mentioned":"تمت الإشارة إليك","replied":"رد جديد","quoted":"تم اقتباس لكلامك","edited":"تم التعديل","liked":"مرة إعجاب جديدة","private_message":"رسالة خاصة جديدة","invited_to_private_message":"تمت دعوتك إلى رسالة خاصة","invitee_accepted":"تم قبول الدعوة","posted":"منشور جديد","moved_post":"تم نقل المنشور","linked":"تم ربطه","bookmark_reminder":"تذكير الإشارة المرجعية","bookmark_reminder_with_name":"تذكير الإشارة المرجعية - %{name}","granted_badge":"تم منحك شارة","invited_to_topic":"تمت دعوتك إلى موضوع","group_mentioned":"تمت الإشارة إلى المجموعة","group_message_summary":"رسائل جديدة للمجموعة","watching_first_post":"موضوع جديد","topic_reminder":"تذكير الموضوع","liked_consolidated":"إعجابات جديدة","post_approved":"تمت الموافقة على المنشور","membership_request_consolidated":"طلبات العضوية الجديدة","reaction":"تفاعل جديد","votes_released":"تم تحرير التصويت"}},"upload_selector":{"uploading":"جارٍ التحميل","processing":"التحميل قيد المعالجة","select_file":"تحديد الملف","default_image_alt_text":"صورة"},"search":{"sort_by":"الترتيب حسب","relevance":"مدى الصلة بالموضوع","latest_post":"آخر منشور","latest_topic":"أحدث موضوع","most_viewed":"الأكثر عرضًا","most_liked":"الأكثر تلقيًا للإعجاب","select_all":"تحديد الكل","clear_all":"مسح الكل","too_short":"عبارة البحث قصيرة جدًا.","result_count":{"zero":"\u003cspan\u003e%{count}%{plus} نتيجة بحث عن العبارة \u003cspan class='term'\u003e%{term}\u003c/span\u003e","one":"\u003cspan\u003eنتيجة بحث واحدة (%{count}) عن العبارة \u003cspan class='term'\u003e%{term}\u003c/span\u003e","two":"\u003cspan\u003eنتيجتا بحث (%{count}%{plus}) عن العبارة \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","few":"\u003cspan\u003e%{plus}%{count} نتائج بحث عن العبارة \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","many":"\u003cspan\u003e%{plus}%{count} نتيجة بحث عن العبارة \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{plus}%{count} نتيجة بحث عن العبارة \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"البحث في الموضوعات أو المنشورات أو المستخدمين أو الفئات","full_page_title":"البحث في الموضوعات أو المنشورات","no_results":"لم يتم العثور على نتائج.","no_more_results":"لم يتم العثور على نتائج أخرى.","post_format":"#%{post_number} بواسطة %{username}","results_page":"نتائج البحث عن \"%{term}\"","more_results":"يتوفَّر عدد كبير من النتائج، يُرجى تضييق نطاق البحث.","cant_find":"لا يمكنك العثور على ما تبحث عنه؟","start_new_topic":"ما رأيك في إنشاء موضوع جديد؟","or_search_google":"أو جرِّب البحث باستخدام Google بدلًا من ذلك:","search_google":"جرِّب البحث باستخدام Google بدلًا من ذلك:","search_google_button":"Google","search_button":"البحث","context":{"user":"البحث عن المنشورات باسم المستخدم @%{username}","category":"البحث في الفئة #%{category}","tag":"البحث عن الوسم #%{tag}","topic":"البحث في هذا الموضوع","private_messages":"البحث في الرسائل"},"advanced":{"title":"البحث المتقدم","posted_by":{"label":"تم النشر بواسطة"},"in_category":{"label":"في الفئة"},"in_group":{"label":"في المجموعة"},"with_badge":{"label":"باستخدام الشارة"},"with_tags":{"label":"بالوسوم"},"filters":{"label":"تقييد نتائج البحث على الموضوعات/المنشورات التي...","title":"مطابقة العنوان فقط","likes":"أعجبتني","posted":"نشرت فيها","created":"أنشأتها","watching":"أراقبها","tracking":"أتتبعها","private":"في رسائلي","bookmarks":"وضعت عليها إشارة مرجعية","first":"تكون أول منشور","pinned":"تكون مثبَّتة","seen":"قرأتها","unseen":"لم أقرأها","wiki":"تكون من النوع Wiki","images":"يتضمَّن صورًا","all_tags":"كل الوسوم أعلاه"},"statuses":{"label":"حيث تكون الموضوعات","open":"مفتوحة","closed":"مُغلقة","public":"عامة","archived":"مُؤرشفة","noreplies":"ليس عليها ردود","single_user":"تتضمَّن عضوًا واحدًا"},"post":{"count":{"label":"المنشورات"},"min":{"placeholder":"الحد الأدنى"},"max":{"placeholder":"الحد الأقصى"},"time":{"label":"تاريخ النشر","before":"قبل","after":"بعد"}},"views":{"label":"مرات العرض"},"min_views":{"placeholder":"الحد الأدنى"},"max_views":{"placeholder":"الحد الأقصى"}}},"hamburger_menu":"الانتقال إلى قائمة موضوعات أو فئة أخرى","new_item":"جديد","go_back":"الرجوع","not_logged_in_user":"صفحة المستخدم مع ملخص عن نشاطه الحالي وتفضيلاته","current_user":"الانتقال إلى صفحة المستخدم","view_all":"عرض الكل %{tab}","topics":{"new_messages_marker":"آخر زيارة","bulk":{"select_all":"تحديد الكل","clear_all":"مسح الكل","unlist_topics":"إلغاء إدراج الموضوعات","relist_topics":"إعادة إدراج الموضوعات","reset_read":"إعادة ضبط القراءة","delete":"حذف الموضوعات","dismiss":"تجاهل","dismiss_read":"تجاهل جميع الموضوعات غير المقروءة","dismiss_read_with_selected":{"zero":"تجاهل %{count} غير مقروءة","one":"تجاهل %{count} غير مقروءة","two":"تجاهل %{count}غير مقروءين","few":"تجاهل %{count} غير مقروءة","many":"تجاهل %{count} غير مقروءة","other":"تجاهل %{count} غير مقروءة"},"dismiss_button":"تجاهل...","dismiss_button_with_selected":{"zero":"تجاهل (%{count})…","one":"تجاهل (%{count})…","two":"تجاهل (%{count})…","few":"تجاهل (%{count})…","many":"تجاهل (%{count})…","other":"تجاهل (%{count})…"},"dismiss_tooltip":"تجاهل المنشورات الجديدة فقط أو التوقف عن تتبُّع الموضوعات","also_dismiss_topics":"التوقف عن تتبُّع هذه الموضوعات حتي لا تظهر لي كغير مقروءة مرة أخرى","dismiss_new":"تجاهل الجديدة","dismiss_new_with_selected":{"zero":"تجاهل الجديدة (%{count})","one":"تجاهل الجديدة (%{count})","two":"تجاهل الجديدة (%{count})","few":"تجاهل الجديدة (%{count})","many":"تجاهل الجديدة (%{count})","other":"تجاهل الجديدة (%{count})"},"toggle":"تفعيل التحديد الجماعي للموضوعات","actions":"الإجراءات الجماعية","close_topics":"إغلاق الموضوعات","archive_topics":"أرشفة الموضوعات","move_messages_to_inbox":"النقل إلى صندوق الوارد","change_notification_level":"تغيير مستوى الإشعارات","choose_new_category":"اختر الفئة الجديدة للموضوعات:","selected":{"zero":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e موضوع.","one":"لقد حدَّدت موضوعًا واحدًا (\u003cb\u003e%{count}\u003c/b\u003e).","two":"لقد حدَّدت موضوعين (\u003cb\u003e%{count}\u003c/b\u003e).","few":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e موضوعات.","many":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e موضوعًا.","other":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e موضوع."},"change_tags":"استبدال الوسوم","append_tags":"إضافة الوسوم","choose_new_tags":"اختيار الوسوم الجديدة لهذه الموضوعات:","choose_append_tags":"اختيار الوسوم الجديدة لإضافتها إلى هذه الموضوعات:","changed_tags":"تم تغيير وسومات هذه الموضوعات.","remove_tags":"إزالة كل الوسوم","confirm_remove_tags":{"zero":"ستتم إزالة كل الوسوم من \u003cb\u003e%{count}\u003c/b\u003e موضوع. هل أنت متأكد؟","one":"ستتم إزالة كل الوسوم من هذا الموضوع. هل أنت متأكد؟","two":"ستتم إزالة كل الوسوم من موضوعَين (\u003cb\u003e%{count}\u003c/b\u003e). هل أنت متأكد؟","few":"ستتم إزالة كل الوسوم من \u003cb\u003e%{count}\u003c/b\u003e موضوعات. هل أنت متأكد؟","many":"ستتم إزالة كل الوسوم من \u003cb\u003e%{count}\u003c/b\u003e موضوعًا. هل أنت متأكد؟","other":"ستتم إزالة كل الوسوم من \u003cb\u003e%{count}\u003c/b\u003e موضوع. هل أنت متأكد؟"},"progress":{"zero":"التقدُّم: \u003cstrong\u003e%{count}\u003c/strong\u003e موضوع","one":"التقدُّم: موضوع واحد (\u003cstrong\u003e%{count}\u003c/strong\u003e)","two":"التقدُّم: موضوعان (\u003cstrong\u003e%{count}\u003c/strong\u003e)","few":"التقدُّم: \u003cstrong\u003e%{count}\u003c/strong\u003e موضوعات","many":"التقدُّم: \u003cstrong\u003e%{count}\u003c/strong\u003e موضوعًا","other":"التقدُّم: \u003cstrong\u003e%{count}\u003c/strong\u003e موضوع"}},"none":{"unread":"ليس لديك أي موضوع غير مقروء.","new":"ليس لديك أي موضوع جديد.","read":"لم تقرأ أي موضوع بعد.","posted":"لم تنشر في أي موضوع بعد.","latest":"لا توجد موضوعات أخرى!","bookmarks":"لم تضع إشارة مرجعية على أي موضوع بعد.","category":"لا توجد موضوعات في الفئة %{category}.","top":"لا توجد موضوعات في الأكثر نشاطًا.","educate":{"new":"\u003cp\u003eستظهر موضوعاتك الجديدة هنا. تُعتبَر الموضوعات جديدة بشكلٍ افتراضي وستعرض مؤشر \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e إذا كان قد تم إنشاؤها في آخر يومين.\u003c/p\u003e\u003cp\u003eيمكنك الانتقال إلى \u003ca href=\"%{userPrefsUrl}\"\u003eتفضيلاتك\u003c/a\u003e لتغيير ذلك.\u003c/p\u003e","unread":"\u003cp\u003eستظهر موضوعاتك غير المقروءة هنا.\u003c/p\u003e\u003cp\u003eتُعتبَر الموضوعات غير مقروءة بشكلٍ افتراضي وستعرض الأعداد غير المقروءة \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e إذا كنت قد:\u003c/p\u003e\u003cul\u003e\u003cli\u003eأنشأت الموضوع\u003c/li\u003e\u003cli\u003eرددت على الموضوع\u003c/li\u003e\u003cli\u003eقرأت الموضوع لأكثر من 4 دقائق\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eأو إذا وضعت الموضوع صراحةً تحت \"المراقبة\" أو \"التتبُّع\" عبر 🔔 في كل موضوع.\u003c/p\u003e\u003cp\u003eيمكنك الانتقال إلى \u003ca href=\"%{userPrefsUrl}\"\u003eالتفضيلات\u003c/a\u003e لتغيير ذلك.\u003c/p\u003e"}},"bottom":{"latest":"لا يوجد المزيد من الموضوعات الحديثة.","posted":"لا يوجد المزيد من الموضوعات المنشورة.","read":"لا يوجد المزيد من الموضوعات المقروءة.","new":"لا يوجد المزيد من الموضوعات الجديدة.","unread":"لا يوجد المزيد من الموضوعات غير المقروءة.","category":"لا يوجد المزيد من الموضوعات في الفئة %{category}.","tag":"لا يوجد المزيد من الوضوعات التي تحمل الوسم %{tag}.","top":"لا يوجد المزيد من الموضوعات الأكثر نشاطًا.","bookmarks":"لا يوجد المزيد من الموضوعات ذات الإشارات المرجعية."}},"topic":{"filter_to":{"zero":"%{count} منشور في الموضوع","one":"منشور واحد (%{count}) في الموضوع","two":"منشوران (%{count}) في الموضوع","few":"%{count} منشورات في الموضوع","many":"%{count} منشورًا في الموضوع","other":"%{count} منشور في الموضوع"},"create":"موضوع جديد","create_long":"إنشاء موضوع جديد","open_draft":"فتح المسودة","private_message":"إنشاء رسالة","archive_message":{"help":"نقل الرسالة إلى الأرشيف","title":"الأرشيف"},"move_to_inbox":{"title":"النقل إلى صندوق الوارد","help":"نقل الرسالة مرة أخرى إلى صندوق الوارد"},"edit_message":{"help":"تعديل أول منشور في الرسالة","title":"تعديل"},"defer":{"help":"وضع علامة كغير مقروءة","title":"تأجيل"},"list":"الموضوعات","new":"موضوع جديد","unread":"غير مقروء","new_topics":{"zero":"%{count} موضوع جديد","one":"موضوع واحد (%{count}) جديد","two":"موضوعان (%{count}) جديدان","few":"%{count} موضوعات جديدة","many":"%{count} موضوعًا جديدًا","other":"%{count} موضوع جديد"},"unread_topics":{"zero":"%{count} موضوع غير مقروء","one":"موضوع واحد (%{count}) غير مقروء","two":"موضوعان (%{count}) غير مقروءين","few":"%{count} مواضيع غير مقروءة","many":"%{count} موضوعًا غير مقروء","other":"%{count} موضوع غير مقروء"},"title":"الموضوع","invalid_access":{"title":"الموضوع خاص","description":"عذرًا، ليس لديك إذن بالوصول إلى هذا الموضوع!","login_required":"عليك تسجيل الدخول لرؤية هذا الموضوع."},"server_error":{"title":"فشل تحميل الموضوع","description":"عذرًا، لم نتمكن من تحميل هذا الموضوع، قد يرجع ذلك إلى مشكلة بالاتصال. يُرجى إعادة المحاولة وإخبارنا إذا استمرت المشكلة."},"not_found":{"title":"الموضوع غير موجود","description":"عذرًا، لم نتمكن من العثور على هذا الموضوع. قد يرجع ذلك إلى إزالة أحد المشرفين له."},"unread_posts":{"zero":"لديك %{count} منشور غير مقروء في هذا الموضوع","one":"لديك منشور واحد (%{count}) غير مقروء في هذا الموضوع","two":"لديك منشوران (%{count}) غير مقروءين في هذا الموضوع","few":"لديك %{count} منشورات غير مقروءة في هذا الموضوع","many":"لديك %{count} منشورًا غير مقروء في هذا الموضوع","other":"لديك %{count} منشور غير مقروء في هذا الموضوع"},"likes":{"zero":"هناك %{count} مرة إعجاب في هذا الموضوع","one":"هناك مرة إعجاب واحدة (%{count}) في هذا الموضوع","two":"هناك مرتا إعجاب (%{count}) في هذا الموضوع","few":"هناك %{count} مرات إعجاب في هذا الموضوع","many":"هناك %{count} مرة إعجاب في هذا الموضوع","other":"هناك %{count} مرة إعجاب في هذا الموضوع"},"back_to_list":"العودة إلى قائمة الموضوعات","options":"خيارات الموضوعات","show_links":"إظهار الروابط في هذا الموضوع","collapse_details":"طي تفاصيل الموضوع","expand_details":"توسيع تفاصيل الموضوع","read_more_in_category":"هل تريد قراءة المزيد؟ تصفَّح الموضوعات الأخرى في %{catLink} أو %{latestLink}.","read_more":"هل تريد قراءة المزيد؟ %{catLink} أو %{latestLink}.","unread_indicator":"لم يقرأ أي عضو آخر منشور في هذا الموضوع بعد.","browse_all_categories":"تصفُّح كل الفئات","browse_all_tags":"تصفُّح كل الوسوم","view_latest_topics":"عرض أحدث الموضوعات","suggest_create_topic":"هل أنت مستعد \u003ca href\u003eلبدء محادثة جديدة؟\u003c/a\u003e","jump_reply_up":"الانتقال إلى الرد السابق","jump_reply_down":"الانتقال إلى الرد التالي","deleted":"لقد تم حذف الموضوع","slow_mode_update":{"title":"الوضع البطيء","select":"لا يمكن للمستخدمين النشر في هذا الموضوع إلا مرة كل:","description":"لتعزيز المناقشة عميقة الفكر في المناقشات سريعة التطور أو المثيرة للجدل، يجب على المستخدمين الانتظار قبل النشر مرة أخرى في هذا الموضوع.","enable":"تفعيل","update":"تحديث","enabled_until":"مفعَّل حتى:","remove":"إيقاف","hours":"الساعات:","minutes":"الدقائق:","seconds":"الثواني:","durations":{"10_minutes":"10 دقائق","15_minutes":"15 دقيقة","30_minutes":"30 دقيقة","45_minutes":"45 دقيقة","1_hour":"ساعة واحدة","2_hours":"ساعتان","4_hours":"4 ساعات","8_hours":"8 ساعات","12_hours":"12 ساعة","24_hours":"24 ساعة","custom":"المدة المخصَّصة"}},"slow_mode_notice":{"duration":"يُرجى الانتظار لمدة %{duration} بين المنشورات في هذا الموضوع"},"topic_status_update":{"title":"مؤقِّت الموضوع","save":"ضبط المؤقِّت","num_of_hours":"عدد الساعات:","num_of_days":"عدد الأيام:","remove":"إزالة المؤقِّت","publish_to":"النشر على:","when":"التوقيت:","time_frame_required":"يُرجى تحديد إطار زمني","min_duration":"يجب أن تكون المدة أكبر من 0","max_duration":"يجب أن تكون المدة أقل من 20 عامًا"},"auto_update_input":{"none":"تحديد إطار زمني","now":"الآن","later_today":"لاحقًا اليوم","tomorrow":"غدًا","later_this_week":"لاحقًا هذا الأسبوع","this_weekend":"عطلة هذا الأسبوع","next_week":"الأسبوع القادم","two_weeks":"أسبوعان","next_month":"الشهر القادم","two_months":"شهران","three_months":"ثلاثة أشهر","four_months":"أربعة أشهر","six_months":"ستة أشهر","one_year":"عام واحد","forever":"للأبد","pick_date_and_time":"اختيار التاريخ والوقت","set_based_on_last_post":"الإغلاق حسب آخر منشور"},"publish_to_category":{"title":"جدولة النشر"},"temp_open":{"title":"الفتح مؤقتًا"},"auto_reopen":{"title":"فتح الموضوع تلقائيًا"},"temp_close":{"title":"غلق الموضوع مؤقتًا"},"auto_close":{"title":"غلق الموضوع تلقائيًا","label":"إغلاق الموضوع تلقائيًا بعد:","error":"يُرجى إدخال قيمة صالحة.","based_on_last_post":"لا تُغلقه إلى أن يمضي على آخر منشور في الموضوع هذه الفترة على الأقل."},"auto_close_after_last_post":{"title":"إغلاق الموضوع تلقائيًا بعد المنشور الأخير"},"auto_delete":{"title":"حذف الموضوع تلقائيًا"},"auto_bump":{"title":"رفع الموضوع تلقائيًا"},"reminder":{"title":"تذكيري"},"auto_delete_replies":{"title":"حذف الردود تلقائيًا"},"status_update_notice":{"auto_open":"سيتم فتح هذا الموضوع تلقائيًا بعد %{timeLeft}.","auto_close":"سيتم غلق هذا الموضوع تلقائيًا بعد %{timeLeft}.","auto_publish_to_category":"سيتم نشر هذا الموضوع في \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003eبعد %{timeLeft}.","auto_close_after_last_post":"سيتم إغلاق هذا الموضوع بعد مرور %{duration} على آخر رد فيه.","auto_delete":"سيتم حذف هذا الموضوع تلقائيًا بعد %{timeLeft}.","auto_bump":"سيتم رفع هذا الموضوع تلقائيًا بعد %{timeLeft}.","auto_reminder":"سيتم تذكيرك بهذا الموضوع بعد %{timeLeft}.","auto_delete_replies":"سيتم حذف الردود على هذا الموضوع تلقائيًا بعد %{duration}."},"auto_close_title":"إعدادات الإغلاق التلقائي","auto_close_immediate":{"zero":"مضت %{count} ساعة بالفعل على آخر منشور في الموضوع؛ لذا فسيتم إغلاق الموضوع على الفور.","one":"مضت ساعة واحدة (%{count}) بالفعل على آخر منشور في الموضوع؛ لذا فسيتم إغلاقه على الفور.","two":"مضت ساعتان (%{count}) بالفعل على آخر منشور في الموضوع؛ لذا فسيتم إغلاقه على الفور.","few":"مضت %{count} ساعات بالفعل على آخر منشور في الموضوع؛ لذا فسيتم إغلاق الموضوع على الفور.","many":"مضت %{count} ساعة بالفعل على آخر منشور في الموضوع؛ لذا فسيتم إغلاق الموضوع على الفور.","other":"مضت %{count} ساعة بالفعل على آخر منشور في الموضوع؛ لذا فسيتم إغلاق الموضوع على الفور."},"auto_close_momentarily":{"zero":" مضت %{count} ساعة بالفعل على آخر منشور في الموضوع؛ لذلك سيتم إغلاق الموضوع مؤقتًا.","one":" مضت ساعة واحدة (%{count}) بالفعل على آخر منشور في الموضوع؛ لذلك سيتم إغلاق الموضوع مؤقتًا.","two":" مضت ساعتان (%{count}) بالفعل على آخر منشور في الموضوع؛ لذلك سيتم إغلاق الموضوع مؤقتًا.","few":" مضت %{count} ساعات بالفعل على آخر منشور في الموضوع؛ لذلك سيتم إغلاق الموضوع مؤقتًا.","many":" مضت %{count} ساعة بالفعل على آخر منشور في الموضوع؛ لذلك سيتم إغلاق الموضوع مؤقتًا.","other":" مضت %{count} ساعة بالفعل على آخر منشور في الموضوع؛ لذلك سيتم إغلاق الموضوع مؤقتًا."},"timeline":{"back":"الرجوع","back_description":"الرجوع إلى آخر منشور غير مقروء","replies_short":"%{current}/%{total}"},"progress":{"title":"تقدُّم الموضوع","go_top":"لأعلى","go_bottom":"لأسفل","go":"الانتقال","jump_bottom":"الانتقال إلى آخر منشور","jump_prompt":"الانتقال إلى...","jump_prompt_of":{"zero":"من %{count} منشورات","one":"من منشور واحد (%{count})","two":"من %{count} منشورات","few":"من %{count} منشورات","many":"من %{count} منشورات","other":"من %{count} منشورات"},"jump_prompt_long":"الانتقال إلى...","jump_bottom_with_number":"انتقل إلى المشاركة رقم %{post_number}","jump_prompt_to_date":"إلى التاريخ","jump_prompt_or":"أو","total":"إجمالي عدد المنشورات","current":"المنشور الحالي"},"notifications":{"title":"تغيير معدل الإشعارات التي تصلك بشأن هذا الموضوع","reasons":{"mailing_list_mode":"وضع القائمة البريدية مفعَّل لديك؛ لذا فتتلقى إشعارات بالردود على هذا الموضوع عبر البريد الإلكتروني.","3_10":"ستتلقى إشعارات لأنك تراقب وسمًا في هذا الموضوع.","3_10_stale":"ستتلقى إشعارات لأنك كنت تراقب وسمًا في هذا الموضوع في الماضي.","3_6":"ستتلقى إشعارات لأنك تراقب هذه الفئة.","3_6_stale":"ستتلقى إشعارات لأنك كنت تراقب هذه الفئة في الماضي.","3_5":"ستتلقى إشعارات لأنك بدأت في مراقبة هذا الموضوع تلقائيًا.","3_2":"ستتلقى إشعارات لأنك تراقب هذا الموضوع.","3_1":"ستتلقى إشعارات لأنك أنشأت هذا الموضوع.","3":"ستتلقى إشعارات لأنك تراقب هذا الموضوع.","2_8":"سترى عدد الردود الجديدة لأنك تتتبَّع هذه الفئة.","2_8_stale":"سترى عدد الردود الجديدة لأنك كنت تتتبَّع هذه الفئة في الماضي.","2_4":"سترى عدد الردود الجديدة لأنك نشرت ردًا في هذا الموضوع.","2_2":"سترى عدد الردود الجديدة لأنك تتتبَّع هذا الموضوع.","2":"سترى عدد الردود الجديدة لأنك \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eقرأت هذا الموضوع\u003c/a\u003e.","1_2":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك.","1":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك.","0_7":"أنت تتجاهل جميع الإشعارات في هذه الفئة.","0_2":"أنت تتجاهل جميع الإشعارات التي تخص هذا الموضوع.","0":"أنت تتجاهل جميع الإشعارات التي تخص هذا الموضوع."},"watching_pm":{"title":"المراقبة","description":"سنُرسل إليك إشعارًا بكل ردٍ جديد في هذه الرسالة، وسترى عدد الردود الجديدة."},"watching":{"title":"المراقبة","description":"سنُرسل إليك إشعارًا بكل ردٍ جديد في هذا الموضوع، وسترى عدد الردود الجديدة."},"tracking_pm":{"title":"التتبُّع","description":"سيظهر عدد الردود الجديدة في هذه الرسالة. وسنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك."},"tracking":{"title":"التتبُّع","description":"سيظهر عدد الردود الجديدة في هذا الموضوع. وسنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك."},"regular":{"title":"عادية","description":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك."},"regular_pm":{"title":"عادية","description":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك."},"muted_pm":{"title":"الكتم","description":"لن نُرسل إليك أي إشعارات أبدًا بخصوص هذه الرسالة."},"muted":{"title":"الكتم","description":"لن نُرسل أي إشعارات أبدًا بخصوص هذا الموضوع، ولن يظهر في الموضوعات الحديثة."}},"actions":{"title":"الإجراءات","recover":"إلغاء حذف الموضوع","delete":"حذف الموضوع","open":"فتح الموضوع","close":"إغلاق الموضوع","multi_select":"تحديد المنشورات...","timed_update":"ضبط مؤقِّت للموضوع...","pin":"تثبيت الموضوع...","unpin":"إلغاء تثبيت الموضوع","unarchive":"إلغاء أرشفة الموضوع","archive":"أرشفة الموضوع","invisible":"إلغاء الإدراج","visible":"إدراج","reset_read":"إعادة ضبط بيانات القراءة","make_private":"التحويل إلى رسالة خاصة","reset_bump_date":"إعادة ضبط تاريخ الرفع"},"feature":{"pin":"تثبيت الموضوع","unpin":"إلغاء تثبيت الموضوع","pin_globally":"تثبيت الموضوع بشكلٍ عام","make_banner":"تحويل الموضوع إلى بانر","remove_banner":"إزالة الموضوع البانر"},"reply":{"title":"الرد","help":"ابدأ في كتابة رد على هذه الموضوع"},"share":{"title":"مشاركة","extended_title":"مشاركة رابط","help":"شارِك رابطًا إلى هذا الموضوع","instructions":"مشاركة رابط إلى هذا الموضوع:","copied":"تم نسخ رابط الدعوة.","notify_users":{"title":"إرسال إشعار","instructions":"إرسال إشعار بشأن هذا الموضوع إلى المستخدمين التاليين:","success":{"zero":"تم إرسال إشعار بشأن هذا الموضوع إلى جميع المستخدمين بنجاح.","one":"تم إرسال إشعار بشأن هذا الموضوع إلى %{username} بنجاح.","two":"تم إرسال إشعار بشأن هذا الموضوع إلى جميع المستخدمين بنجاح.","few":"تم إرسال إشعار بشأن هذا الموضوع إلى جميع المستخدمين بنجاح.","many":"تم إرسال إشعار بشأن هذا الموضوع إلى جميع المستخدمين بنجاح.","other":"تم إرسال إشعار بشأن هذا الموضوع إلى جميع المستخدمين بنجاح."}},"invite_users":"دعوة"},"print":{"title":"الطباعة","help":"فتح نسخة ملائمة للطباعة من هذا الموضوع"},"flag_topic":{"title":"إبلاغ","help":"الإبلاغ عن هذا الموضوع بشكلٍ خاص للفت الانتباه إليه، أو إرسال إشعار خاص بشأنه.","success_message":"لقد أبلغت عن هذا الموضوع بنجاح."},"make_public":{"title":"التحويل إلى موضوع عام","choose_category":"يُرجى اختيار فئة للموضوع العام:"},"feature_topic":{"title":"تمييز هذا الموضوع","pin":"جعل هذا الموضوع يظهر أعلى الفئة %{categoryLink} حتى","unpin":"إزالة هذا الموضوع من أعلى الفئة \"%{categoryLink}\"","unpin_until":"إزالة هذا الموضوع من أعلى الفئة \"%{categoryLink}\" أو الانتظار حتى \u003cstrong\u003e%{until}\u003c/strong\u003e","pin_note":"يمكن للمستخدمين إلغاء تثبيت الموضوع بشكلٍ فردي لأنفسهم.","pin_validation":"يلزم إدخال تاريخ لتثبيت هذا الموضوع.","not_pinned":"لا توجد موضوعات مثبَّتة في %{categoryLink}.","already_pinned":{"zero":"الموضوعات المثبَّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","one":"الموضوعات المثبَّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"الموضوعات المثبَّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"الموضوعات المثبَّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"الموضوعات المثبَّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"الموضوعات المثبَّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"جعل هذا الموضوع يظهر أعلى قوائم الموضوعات حتى","confirm_pin_globally":{"zero":"لديك بالفعل %{count} موضوع مثبَّت بشكلٍ عام. قد تصبح كثرة الموضوعات المثبَّتة مصدر إزعاج للمستخدمين الجُدد والمجهولين. هل تريد بالتأكيد تثبيت موضوع آخر بشكلٍ عام؟","one":"لديك بالفعل موضوع واحد (%{count}) مثبَّت بشكلٍ عام. قد تصبح كثرة الموضوعات المثبَّتة مصدر إزعاج للمستخدمين الجُدد والمجهولين. هل تريد بالتأكيد تثبيت موضوع آخر بشكلٍ عام؟","two":"لديك بالفعل موضوعان (%{count}) مثبَّتان بشكلٍ عام. قد تصبح كثرة الموضوعات المثبَّتة مصدر إزعاج للمستخدمين الجُدد والمجهولين. هل تريد بالتأكيد تثبيت موضوع آخر بشكلٍ عام؟","few":"لديك بالفعل %{count} موضوعات مثبَّتة بشكلٍ عام. قد تصبح كثرة الموضوعات المثبَّتة مصدر إزعاج للمستخدمين الجُدد والمجهولين. هل تريد بالتأكيد تثبيت موضوع آخر بشكلٍ عام؟","many":"لديك بالفعل %{count} موضوعًا مثبَّتًا بشكلٍ عام. قد تصبح كثرة الموضوعات المثبَّتة مصدر إزعاج للمستخدمين الجُدد والمجهولين. هل تريد بالتأكيد تثبيت موضوع آخر بشكلٍ عام؟","other":"لديك بالفعل %{count} موضوع مثبَّت بشكلٍ عام. قد تصبح كثرة الموضوعات المثبَّتة مصدر إزعاج للمستخدمين الجُدد والمجهولين. هل تريد بالتأكيد تثبيت موضوع آخر بشكلٍ عام؟"},"unpin_globally":"إزالة هذا الموضوع من أعلى جميع قوائم الموضوعات","unpin_globally_until":"إزالة هذا الموضوع من أعلى جميع قوائم الموضوعات أو الانتظار حتى \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"يمكن للمستخدمين إلغاء تثبيت الموضوع بشكلٍ فردي لأنفسهم.","not_pinned_globally":"لا توجد موضوعات مثبَّتة بشكلٍ عام.","already_pinned_globally":{"zero":"الموضوعات المثبَّتة حاليًا بشكلٍ عام: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","one":"الموضوعات المثبَّتة حاليًا بشكلٍ عام: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"الموضوعات المثبَّتة حاليًا بشكلٍ عام: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"الموضوعات المثبَّتة حاليًا بشكلٍ عام: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"الموضوعات المثبَّتة حاليًا بشكلٍ عام: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"الموضوعات المثبَّتة حاليًا بشكلٍ عام: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"تحويل هذا الموضوع إلى إعلان يظهر في أعلى جميع الصفحات.","remove_banner":"إزالة البانر الذي يظهر في أعلى جميع الصفحات","banner_note":"يمكن للمستخدمين تجاهل البانر بإغلاقه. ولا يمكن تحويل أكثر من موضوع واحد إلى بانر في الوقت نفسه.","no_banner_exists":"لا يوجد موضوع بانر.","banner_exists":"\u003cstrong class='badge badge-notification unread'\u003eيوجد\u003c/strong\u003e موضوع بانر حاليًا."},"inviting":"جارٍ إرسال الدعوة...","automatically_add_to_groups":"تتضمَّن هذه الدعوة أيضًا الوصول الى هذه المجموعات:","invite_private":{"title":"الدعوة إلى رسالة","email_or_username":"عنوان البريد الإلكتروني أو اسم المستخدم للمدعو","email_or_username_placeholder":"عنوان البريد الإلكتروني أو اسم المستخدم","action":"دعوة","success":"لقد دعونا ذلك المستخدم للمشاركة في هذه الرسالة.","success_group":"لقد دعونا تلك المجموعة للمشاركة في هذه الرسالة.","error":"عذرًا، حدث خطأ في أثناء دعوة هذا المستخدم.","not_allowed":"عذرًا، لا يمكن دعوة هذا المستخدم.","group_name":"اسم المجموعة"},"controls":"عناصر التحكم في الموضوع","invite_reply":{"title":"دعوة","username_placeholder":"اسم المستخدم","action":"إرسال دعوة","help":"دعوة الآخرين إلى هذا الموضوع عبر البريد الإلكتروني أو الإشعارات","to_forum":"سنُرسل رسالة إلكترونية مختصرة تسمح لصديقك بالانضمام فورًا بالنقر على رابط.","discourse_connect_enabled":"أدخِل اسم المستخدم للشخص الذي تريد دعوته إلى هذا الموضوع.","to_topic_blank":"أدخِل اسم المستخدم أو عنوان البريد الإلكتروني للشخص الذي تريد دعوته إلى هذا الموضوع.","to_topic_email":"لقد أدخلت عنوان بريد إلكتروني. سنُرسل دعوة عبر البريد الإلكتروني تتيح لصديقك الرد فورًا على هذا الموضوع.","to_topic_username":"لقد أدخلت اسم مستخدم. سنُرسل إشعارًا يتضمَّن رابطًا يدعوه إلى هذا الموضوع.","to_username":"أدخِل اسم المستخدم للشخص الذي تريد دعوته. سنُرسل إليه إشعارًا برابط الدعوة إلى هذا الموضوع.","email_placeholder":"name@example.com","success_email":"لقد أرسلنا دعوة بالبريد إلى \u003cb\u003e%{invitee}\u003c/b\u003e. سنُرسل إليك إشعارًا عند قبول الدعوة. راجع علامة تبويب الدعوات في صفحة المستخدم لديك لتتبُّع دعواتك.","success_username":"لقد دعونا هذا المستخدم للمشاركة في هذا الموضوع.","error":"عذرًا، لم نتمكن من دعوة هذا الشخص. ربما تمت دعوته من قبل؟ (معدل إرسال الدعوات محدود)","success_existing_email":"هناك مستخدم مسجَّل بالفعل بعنوان البريد الإلكتروني \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. لقد دعونا ذلك المستخدم للمشاركة في هذا الموضوع."},"login_reply":"تسجيل الدخول للرد","filters":{"n_posts":{"zero":"%{count} منشور","one":"منشور واحد (%{count})","two":"منشوران (%{count})","few":"%{count} منشورات","many":"%{count} منشورًا","other":"%{count} منشور"},"cancel":"إزالة التصفية"},"move_to":{"title":"النقل إلى","action":"النقل إلى","error":"حدث خطأ في أثناء نقل المنشورات"},"split_topic":{"title":"النقل إلى موضوع جديد","action":"النقل إلى موضوع جديد","topic_name":"عنوان الموضوع الجديد","radio_label":"موضوع جديد","error":"حدث خطأ في أثناء نقل المنشورات إلى الموضوع الجديد.","instructions":{"zero":"أنت على وشك إنشاء موضوع جديد، وتعبئته باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشور الذي حدَّدته.","one":"أنت على وشك إنشاء موضوع جديد، وتعبئته باستخدام المنشور الذي حدَّدته.","two":"أنت على وشك إنشاء موضوع جديد، وتعبئته باستخدام المنشورين (\u003cb\u003e%{count}\u003c/b\u003e) الذين حدَّدتهما.","few":"أنت على وشك إنشاء موضوع جديد، وتعبئته باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشورات التي حدَّدتها.","many":"أنت على وشك إنشاء موضوع جديد، وتعبئته باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشورًا الذي حدَّدته.","other":"أنت على وشك إنشاء موضوع جديد، وتعبئته باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشور الذي حدَّدته."}},"merge_topic":{"title":"النقل إلى الموضوع الحالي","action":"النقل إلى الموضوع الحالي","error":"حدث عطل في أثناء نقل المنشورات إلى ذلك الموضوع.","radio_label":"الموضوع الحالي","instructions":{"zero":"يُرجى اختيار الموضوع الذي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشور إليه.","one":"يُرجى اختيار الموضوع الذي ترغب في نقل ذلك المنشور إليه.","two":"يُرجى اختيار الموضوع الذي ترغب في نقل هاتين المنشورين (\u003cb\u003e%{count}\u003c/b\u003e) إليه.","few":"يُرجى اختيار الموضوع الذي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشورات إليه.","many":"يُرجى اختيار الموضوع الذي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشورًا إليه.","other":"يُرجى اختيار الموضوع الذي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشور إليه."}},"move_to_new_message":{"title":"النقل إلى رسالة جديدة","action":"النقل إلى رسالة جديدة","message_title":"عنوان الرسالة الجديدة","radio_label":"رسالة جديدة","participants":"المشاركون","instructions":{"zero":"أنت على وشك إنشاء رسالة جديدة، وتعبئتها باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشور الذي حدَّدته.","one":"أنت على وشك إنشاء رسالة جديدة، وتعبئتها باستخدام المنشور الذي حدَّدته.","two":"أنت على وشك إنشاء رسالة جديدة، وتعبئتها باستخدام المنشورين (\u003cb\u003e%{count}\u003c/b\u003e) الذين حدَّدتهما.","few":"أنت على وشك إنشاء رسالة جديدة، وتعبئتها باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشورات التي حدَّدتها.","many":"أنت على وشك إنشاء رسالة جديدة، وتعبئتها باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشورًا الذي حدَّدته.","other":"أنت على وشك إنشاء رسالة جديدة، وتعبئتها باستخدام \u003cb\u003e%{count}\u003c/b\u003e منشور الذي حدَّدته."}},"move_to_existing_message":{"title":"النقل إلى الرسالة الحالية","action":"النقل إلى الرسالة الحالية","radio_label":"الرسالة الحالية","participants":"المشاركون","instructions":{"zero":"يُرجى اختيار الرسالة الي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشور إليها.","one":"يُرجى اختيار الرسالة الي ترغب في نقل المنشور إليها.","two":"يُرجى اختيار الرسالة الي ترغب في نقل المنشورين (\u003cb\u003e%{count}\u003c/b\u003e) إليها.","few":"يُرجى اختيار الرسالة الي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشورات إليها.","many":"يُرجى اختيار الرسالة الي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشورًا إليها.","other":"يُرجى اختيار الرسالة الي ترغب في نقل \u003cb\u003e%{count}\u003c/b\u003e منشور إليها."}},"merge_posts":{"title":"دمج المنشورات المحدَّدة","action":"دمج المنشورات المحدَّدة","error":"حدث خطأ في أثناء دمج المنشورات المحدَّدة."},"publish_page":{"title":"نشر الصفحة","publish":"نشر","description":"عند نشر موضوع كصفحة، يمكن مشاركة عنوان URL له وسيتم عرضه بنمط مخصَّص.","slug":"المسار","public":"عامة","public_description":"يمكن للأشخاص رؤية هذه الصفحة حتى لو كان الموضوع المرتبط بها خاصًا.","publish_url":"لقد تم نشر صفحتك في:","topic_published":"تم نشر موضوعك في:","preview_url":"سيتم نشر صفحتك في:","invalid_slug":"عذرًا، لا يمكنك نشر هذه الصفحة.","unpublish":"إلغاء النشر","unpublished":"لقد تم إلغاء نشر صفحتك ولم يعد الوصول إليها ممكنًا.","publishing_settings":"إعدادات النشر"},"change_owner":{"title":"تغيير المالك","action":"تغيير الملكية","error":"حدث خطأ في أثناء تغيير ملكية المنشورات.","placeholder":"اسم المستخدم للمالك الجديد","instructions":{"zero":"يُرجى اختيار مالك جديد لمنشورات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e البالغ عددها %{count}","one":"يُرجى اختيار مالك جديد لمنشور \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e","two":"يُرجى اختيار مالك جديد لمنشورَي (%{count}) \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e","few":"يُرجى اختيار مالك جديد لمنشورات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e البالغ عددها %{count}","many":"يُرجى اختيار مالك جديد لمنشورات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e البالغ عددها %{count}","other":"يُرجى اختيار مالك جديد لمنشورات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e البالغ عددها %{count}"},"instructions_without_old_user":{"zero":"يُرجى اختيار مالك جديد للمنشورات البالغ عددها %{count}","one":"يُرجى اختيار مالك جديد للمنشور","two":"يُرجى اختيار مالك جديد للمنشورين (%{count})","few":"يُرجى اختيار مالك جديد للمنشورات البالغ عددها %{count}","many":"يُرجى اختيار مالك جديد للمنشورات البالغ عددها %{count}","other":"يُرجى اختيار مالك جديد للمنشورات البالغ عددها %{count}"}},"change_timestamp":{"title":"تغيير الطابع الزمني...","action":"تغيير الطابع الزمني","invalid_timestamp":"لا يمكن أن يكون الطابع الزمني في المستقبل.","error":"حدث خطأ في أثناء تغيير الطابع الزمني للموضوع.","instructions":"يُرجى تحديد الطابع الزمني الجديد للموضوع. سيتم تحديث المنشورات في الموضوع للحفاظ على الفارق الزمني نفسه."},"multi_select":{"select":"تحديد","selected":"المحدَّدة (%{count})","select_post":{"label":"تحديد","title":"إضافة المنشور إلى التحديد"},"selected_post":{"label":"محدَّد","title":"انقر لإزالة المنشور من التحديد"},"select_replies":{"label":"تحديد المنشور +الردود","title":"إضافة المنشور وجميع الردود عليه إلى التحديد"},"select_below":{"label":"تحديد المنشور +ما يليه","title":"إضافة المنشور وكل ما يليه إلى التحديد"},"delete":"حذف المحدَّد","cancel":"إلغاء التحديد","select_all":"تحديد الكل","deselect_all":"إلغاء تحديد الكل","description":{"zero":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e منشور.","one":"لقد حدَّدت منشورًا واحدًا (\u003cb\u003e%{count}\u003c/b\u003e).","two":"لقد حدَّدت منشورين (\u003cb\u003e%{count}\u003c/b\u003e).","few":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e منشورات.","many":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e منشورًا.","other":"لقد حدَّدت \u003cb\u003e%{count}\u003c/b\u003e منشور."}},"deleted_by_author_simple":"(تم حذف الموضوع بواسطة الكاتب)"},"post":{"quote_reply":"اقتباس","quote_share":"مشاركة","edit_reason":"السبب: ","post_number":"المنشور %{number}","ignored":"محتوى تم تجاهله","wiki_last_edited_on":"تم تعديل Wiki آخر مرة في %{dateTime}","last_edited_on":"تم تعديل المنشور آخر مرة في %{dateTime}","reply_as_new_topic":"الرد كموضوع مرتبط","reply_as_new_private_message":"الرد في رسالة جديدة إلى المستلمين أنفسهم","continue_discussion":"متابعة المناقشة من %{postLink}:","follow_quote":"انتقل إلى المنشور الذي تم اقتباسه","show_full":"عرض المنشور الكامل","show_hidden":"عرض المحتوى الذي تم تجاهله","deleted_by_author_simple":"(تم حذف المنشور بواسطة الكاتب)","collapse":"طي","expand_collapse":"توسيع/طي","locked":"قفل أحد أعضاء فريق العمل تعديل هذه المشاركة","gap":{"zero":"عرض %{count} رد مخفي","one":"عرض رد مخفي واحد (%{count})","two":"عرض ردَّين مخفيَّين (%{count})","few":"عرض %{count} ردود مخفية","many":"عرض %{count} ردًا مخفيًا","other":"عرض %{count} رد مخفي"},"notice":{"new_user":"هذه أول مرة ينشر فيها %{user} شيئًا؛ فلنرحِّب به في مجتمعنا!","returning_user":"مرَّ وقت طويل منذ أن قرأنا شيئًا من %{user}؛ إذ كان آخر منشور له في %{time}."},"unread":"المنشور غير مقروء","has_replies":{"zero":"%{count} رد","one":"رد واحد (%{count})","two":"ردَّان (%{count})","few":"%{count} ردود","many":"%{count} ردًا","other":"%{count} ردّ"},"has_replies_count":"%{count}","unknown_user":"(مستخدم مجهول أو محذوف)","has_likes_title":{"zero":"%{count} شخص أعجبه هذا المنشور","one":"شخص واحد (%{count}) أعجبه هذا المنشور","two":"شخصان (%{count}) أعجبهما هذا المنشور","few":"%{count} أشخاص أعجبهم هذا المنشور","many":"%{count} شخصًا أعجبه هذا المنشور","other":"%{count} شخص أعجبه هذا المنشور"},"has_likes_title_only_you":"لقد سجَّلت إعجابك بهذا المنشور","has_likes_title_you":{"zero":"لقد سجَّلت إعجابك أنت و%{count} شخص آخر بهذا المنشور","one":"لقد سجَّلت إعجابك أنت وشخص واحد (%{count}) آخر بهذا المنشور","two":"لقد سجَّلت إعجابك أنت وشخصان (%{count}) آخران بهذا المنشور","few":"لقد سجَّلت إعجابك أنت و%{count} أشخاص آخرين بهذا المنشور","many":"لقد سجَّلت إعجابك أنت و%{count} شخصًا آخر بهذا المنشور","other":"لقد سجَّلت إعجابك أنت و%{count} شخص آخر بهذا المنشور"},"filtered_replies_hint":{"zero":"عرض هذا المنشور وردوده %{count}","one":"عرض هذا المنشور والرد عليه","two":"عرض هذا المنشور وردَّين (%{count}) عليه","few":"عرض هذا المنشور و%{count} ردود عليه","many":"عرض هذا المنشور و%{count} ردًا عليه","other":"عرض هذا المنشور و%{count} رد عليه"},"filtered_replies_viewing":{"zero":"عرض رد %{count} على","one":"يتم عرض رد واحد (%{count}) على","two":"يتم عرض ردَّين (%{count}) رد على","few":"يتم عرض %{count} ردود على","many":"يتم عرض %{count} ردًا على","other":"يتم عرض %{count} رد على"},"in_reply_to":"تحميل المنشور الرئيسي","view_all_posts":"عرض جميع المنشورات","errors":{"create":"عذرًا، حدث خطأ في أثناء إنشاء منشورك. يُرجى إعادة المحاولة.","edit":"عذرا، حدث خطأ في أثناء تعديل منشورك. يُرجى إعادة المحاولة.","upload":"عذرًا، حدث خطأ في أثناء تحميل هذا الملف. يُرجى إعادة المحاولة.","file_too_large":"عذرًا، لكن الملف كبير جدًا (أقصى حجم هو %{max_size_kb} ك.ب). لماذا لا تحمِّل ملفك الكبير إلى خدمة مشاركة سحابية، ثم تلصق الرابط؟","too_many_uploads":"عذرًا، يمكنك تحميل ملف واحد فقط في الوقت نفسه.","too_many_dragged_and_dropped_files":{"zero":"عذرًا، يمكنك تحميل %{count} ملف فقط في الوقت نفسه.","one":"عذرًا، يمكنك تحميل ملف واحد (%{count}) فقط في الوقت نفسه.","two":"عذرًا، يمكنك تحميل ملفين (%{count}) فقط في الوقت نفسه.","few":"عذرًا، يمكنك تحميل %{count} ملفات فقط في الوقت نفسه.","many":"عذرًا، يمكنك تحميل %{count} ملفًا فقط في الوقت نفسه.","other":"عذرًا، يمكنك تحميل %{count} ملف فقط في الوقت نفسه."},"upload_not_authorized":"عذرًا، الملف الذي تحاول تحميله غير مسموح به (الامتدادات المسموح بها: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"عذرًا، لا يمكن للمستخدمين الجُدد تحميل الصور.","attachment_upload_not_allowed_for_new_user":"عذرًا، لا يمكن للمستخدمين الجُدد تحميل المرفقات.","attachment_download_requires_login":"عذرًا، عليك تسجيل الدخول لتنزيل المرفقات."},"cancel_composer":{"confirm":"ماذا تريد أن تفعل بمنشورك؟","discard":"تجاهل","save_draft":"حفظ المسودة لوقتٍ لاحق","keep_editing":"الاستمرار في التعديل"},"via_email":"لقد وصل هذا المنشور عبر البريد الإلكتروني","via_auto_generated_email":"لقد وصل هذا المنشور عبر رسالة إلكترونية تم إنشاؤها تلقائيًا","whisper":"هذا المنشور عبارة عن همسة خاصة للمشرفين","wiki":{"about":"هذا المنشور عبارة عن Wiki"},"few_likes_left":"نشكرك على نشر المحبة في المجتمع! و لكن للأسف لقد اقتربت من الحد اليومي المسموح به لمرات تسجيل الإعجاب.","controls":{"reply":"ابدأ في كتابة رد على هذا المنشور","like":"سجِّل إعجابك بهذا المنشور","has_liked":"لقد سجَّلت إعجابك بهذا المنشور","read_indicator":"الأعضاء الذين قرأوا هذا المنشور","undo_like":"إلغاء الإعجاب","edit":"تعديل هذا المنشور","edit_action":"تعديل","edit_anonymous":"عذرًا، لكنك بحاجة إلى تسجيل الدخول لتعديل هذا المنشور.","flag":"الإبلاغ عن هذا المنشور بشكلٍ خاص للفت الانتباه إليه، أو إرسال إشعار خاص بشأنه.","delete":"حذف هذا المنشور","undelete":"إلغاء حذف هذا المنشور","share":"شارِك رابطًا إلى هذا المنشور","more":"المزيد","delete_replies":{"confirm":"هل تريد أيضًا حذف الردود على هذا المنشور؟","direct_replies":{"zero":"نعم، و%{count} رد مباشر","one":"نعم، ورد مباشر واحد (%{count})","two":"نعم، وردَّان (%{count}) مباشران","few":"نعم، و%{count} ردود مباشرة","many":"نعم، و%{count} ردًا مباشرًا","other":"نعم، و%{count} رد مباشر"},"all_replies":{"zero":"نعم، و%{count} رد","one":"نعم، ورد واحد (%{count})","two":"نعم، وردَّان (%{count})","few":"نعم، و%{count} ردود","many":"نعم، و%{count} ردًا","other":"نعم، و%{count} رد"},"just_the_post":"لا، هذا المنشور فقط"},"admin":"إجراءات المسؤول على المنشور","wiki":"التحويل إلى Wiki","unwiki":"إزالة Wiki","convert_to_moderator":"لون إضافة فريق العمل","revert_to_regular":"لون إزالة فريق العمل","rebake":"إعادة صياغة HTML","publish_page":"نشر الصفحة","unhide":"إظهار","lock_post":"قفل المنشور","lock_post_description":"امنع كاتب المنشور من تعديله","unlock_post":"إلغاء قفل المنشور","unlock_post_description":"اسمح لكاتب المشاركة تعديلها","delete_topic_disallowed_modal":"ليس لديك إذن بحذف هذا الموضوع. إذا كنت تريد حقًا حذفه، فأبلِغ عنه مع ذكر السبب للفت انتباه أحد المشرفين إليه.","delete_topic_disallowed":"ليس لديك الإذن بحذف هذا الموضوع","delete_topic_confirm_modal":{"zero":"هذا الموضوع يحتوي حاليا على أكثر من %{count} مشاهدة، وقد يكون مشهورًا في نتائج البحث. هل متأكد من حذف هذا الموضوع بالكامل، بدلاً من تعديله لتحسينه؟","one":"يحتوي هذا الموضوع حاليًا على أكثر من مرة عرض واحدة (%{count})، وقد يصبح رائجًا في نتائج البحث. هل تريد بالتأكيد حذف هذا الموضوع بالكامل بدلًا من تعديله لتحسينه؟","two":"هذا الموضوع يحتوي حاليا على أكثر من %{count} مشاهدة، وقد يكون مشهورًا في نتائج البحث. هل متأكد من حذف هذا الموضوع بالكامل، بدلاً من تعديله لتحسينه؟","few":"هذا الموضوع يحتوي حاليا على أكثر من %{count} مشاهدة، وقد يكون مشهورًا في نتائج البحث. هل متأكد من حذف هذا الموضوع بالكامل، بدلاً من تعديله لتحسينه؟","many":"هذا الموضوع يحتوي حاليا على أكثر من %{count} مشاهدة، وقد يكون مشهورًا في نتائج البحث. هل متأكد من حذف هذا الموضوع بالكامل، بدلاً من تعديله لتحسينه؟","other":"هذا الموضوع يحتوي حاليا على أكثر من %{count} مشاهدة، وقد يكون مشهورًا في نتائج البحث. هل متأكد من حذف هذا الموضوع بالكامل، بدلاً من تعديله لتحسينه؟"},"delete_topic_confirm_modal_yes":"نعم، حذف هذا الموضوع","delete_topic_confirm_modal_no":"لا، الاحتفاظ بهذا الموضوع","delete_topic_error":"حدث خطأ في أثناء حذف هذا الموضوع","delete_topic":"حذف الموضوع","delete_post_notice":"حذف إشعار فريق العمل","remove_timer":"إزالة المؤقِّت","edit_timer":"تعديل المؤقِّت"},"actions":{"people":{"like":{"zero":"أعجبهم ذلك","one":"أعجبه ذلك","two":"أعجبهما ذلك","few":"أعجبهم ذلك","many":"أعجبهم ذلك","other":"أعجبهم ذلك"},"read":{"zero":"قرأ ذلك","one":"قرأ ذلك","two":"قرآ ذلك","few":"قرؤوا ذلك","many":"قرؤوا ذلك","other":"قرؤوا ذلك"},"like_capped":{"zero":"و%{count} آخر أعجبه ذلك","one":"وآخر (%{count}) أعجبه ذلك","two":"وآخران (%{count}) أعجبهما ذلك","few":"و%{count} آخرين أعجبهم ذلك","many":"و%{count} آخرين أعجبهم ذلك","other":"و%{count} آخرين أعجبهم ذلك"},"read_capped":{"zero":"و%{count} آخر قرأ ذلك","one":"وآخر (%{count}) قرأ ذلك","two":"وآخران (%{count}) قرآ ذلك","few":"و%{count} آخرين قرؤوا ذلك","many":"و%{count} آخرين قرؤوا ذلك","other":"و%{count} آخرين قرؤوا ذلك"}},"by_you":{"off_topic":"لقد أبلغت عن هذا المنشور على أنه خارج الموضوع","spam":"لقد أبلغت عن هذا المنشور على أنه غير مرغوب فيه","inappropriate":"لقد أبلغت عن هذا المنشور على أنه غير لائق","notify_moderators":"لقد أبلغت عن هذا المنشور للخضوع للإشراف","notify_user":"لقد أرسلت رسالة إلى هذا المستخدم"}},"delete":{"confirm":{"zero":"هل تريد بالتأكيد حذف %{count} منشور؟","one":"هل تريد بالتأكيد حذف هذا المنشور؟","two":"هل تريد بالتأكيد حذف هذين المنشورين (%{count})؟","few":"هل تريد بالتأكيد حذف %{count} منشورات؟","many":"هل تريد بالتأكيد حذف %{count} منشورًا؟","other":"هل تريد بالتأكيد حذف %{count} منشور؟"}},"merge":{"confirm":{"zero":"هل تريد بالتأكيد دمج %{count} منشور؟","one":"هل تريد بالتأكيد دمج هذا المنشور؟","two":"هل تريد بالتأكيد دمج هذين المنشورين (%{count})؟","few":"هل تريد بالتأكيد دمج %{count} منشورات؟","many":"هل تريد بالتأكيد دمج %{count} منشورًا؟","other":"هل تريد بالتأكيد دمج %{count} منشور؟"}},"revisions":{"controls":{"first":"أول مراجعة","previous":"المراجعة السابقة","next":"المراجعة التالية","last":"آخر مراجعة","hide":"إخفاء المراجعة","show":"إظهار المراجعة","revert":"العودة إلى المراجعة %{revision}","edit_wiki":"تعديل Wiki","edit_post":"تعديل المنشور","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e/%{total}"},"displays":{"inline":{"title":"إظهار النتيجة المعروضة مع وضع الإضافات والإزالات في سطر واحد","button":"HTML"},"side_by_side":{"title":"إظهار الفروقات في النتيجة المعروضة جنبًا إلي جنب","button":"HTML"},"side_by_side_markdown":{"title":"إظهار الفروقات في المصدر الأولي جنبًا إلي جنب","button":"النسخة الأولية"}}},"raw_email":{"displays":{"raw":{"title":"عرض النسخة الأولية من الرسالة الإلكترونية","button":"النسخة الأولية"},"text_part":{"title":"إظهار الجزء النصي من الرسالة الإلكترونية","button":"النص"},"html_part":{"title":"إظهار جزء HTML من الرسالة الإلكترونية","button":"HTML"}}},"bookmarks":{"create":"إنشاء إشارة مرجعية","edit":"تعديل الإشارة المرجعية","created":"تاريخ الإنشاء","updated":"تاريخ التحديث","name":"الاسم","name_placeholder":"ما استخدام هذه الإشارة المرجعية؟","set_reminder":"تذكيري","options":"الخيارات","actions":{"delete_bookmark":{"name":"حذف الإشارة المرجعية","description":"يزيل هذا الإجراء الإشارة المرجعية من ملفك الشخصي ويوقف كل التذكيرات المرتبطة بها"},"edit_bookmark":{"name":"تعديل الإشارة المرجعية","description":"تعديل اسم الإشارة المرجعية أو تغيير تاريخ التذكير ووقته"},"pin_bookmark":{"name":"تثبيت الإشارة المرجعية","description":"ثبِّت هذه الإشارة المرجعية. سيؤدي ذلك إلى ظهورها في أعلى قائمة الإشارات المرجعية لديك."},"unpin_bookmark":{"name":"إلغاء تثبيت الإشارة المرجعية","description":"قم بإلغاء تثبيت هذه الإشارة المرجعية. ولن تظهر في أعلى قائمة الإشارات المرجعية لديك بعد الآن."}}},"filtered_replies":{"viewing_posts_by":"يتم الآن عرض %{post_count} منشور بواسطة","viewing_subset":"بعض الردود مطوية","viewing_summary":"يتم الآن عرض ملخص لهذا الموضوع","post_number":"%{username}، المنشور #%{post_number}","show_all":"إظهار الكل"}},"category":{"none":"(بلا فئة)","all":"كل الفئات","choose":"الفئة\u0026hellip;","edit":"تعديل","edit_dialog_title":"تعديل: %{categoryName}","view":"عرض الموضوعات في الفئة","back":"الرجوع إلى الفئة","general":"عام","settings":"الإعدادات","topic_template":"نموذج الموضوع","tags":"الوسوم","tags_allowed_tags":"حصر هذه الوسوم على هذه الفئة:","tags_allowed_tag_groups":"حصر مجموعات الوسوم هذه على هذه الفئة:","tags_placeholder":"(اختياري) قائمة الوسوم المسموح بها","tags_tab_description":"ستكون الوسوم ومجموعات الوسوم المحدَّدة أعلاه متاحة في هذه الفئة والفئات الأخرى التي تحدِّدها فقط. ولن تكون متاحة للاستخدام في فئات أخرى.","tag_groups_placeholder":"(اختياري) قائمة مجموعات الوسوم المسموح بها","manage_tag_groups_link":"إدارة مجموعات الوسوم","allow_global_tags_label":"السماح بالوسوم الأخرى أيضًا","tag_group_selector_placeholder":"(اختياري) مجموعة وسوم","required_tag_group_description":"طلب أن تحمل الموضوعات الجديدة وسومًا من مجموعة وسوم:","min_tags_from_required_group_label":"عدد الوسوم:","required_tag_group_label":"مجموعة الوسوم:","topic_featured_link_allowed":"السماح بالروابط المميزة في هذه الفئة.","delete":"حذف الفئة","create":"فئة جديدة","create_long":"إنشاء فئة جديدة","save":"حفظ الفئة","slug":"مسار الفئة","slug_placeholder":"(اختياري) كلمات مفصولة بشرطة لعنوان URL","creation_error":"حدث خطأ في أثناء إنشاء الفئة.","save_error":"حدث خطأ في أثناء حفظ الفئة.","name":"اسم الفئة","description":"الوصف","logo":"صورة شعار الفئة","background_image":"صورة خلفية الفئة","badge_colors":"ألوان الشارات","background_color":"لون الخلفية","foreground_color":"لون المقدمة","name_placeholder":"كلمة أو كلمتان بحد أقصى","color_placeholder":"لون الويب","delete_confirm":"هل تريد بالتأكيد حذف هذه الفئة؟","delete_error":"حدث خطأ في أثناء حذف هذه الفئة","list":"إدراج الفئات","no_description":"يُرجى إضافة وصف لهذه الفئة.","change_in_category_topic":"تعديل الوصف","already_used":"هذا اللون مستخدم بالفعل في فئة أخرى","security":"الأمان","security_add_group":"إضافة مجموعة","permissions":{"group":"المجموعة","see":"العرض","reply":"الرد","create":"إنشاء","no_groups_selected":"لم يتم منح إذن الوصول لأي مجموعة؛ لذا فإن هذه الفئة ستكون مرئية لفريق العمل فقط.","everyone_has_access":"هذه الفئة عامة، ويمكن للجميع رؤية المنشورات والرد عليها وإنشائها. لتقييد الأذونات، عليك إزالة واحد أو أكثر من الأذونات الممنوحة لمجموعة \"الجميع\".","toggle_reply":"إذن تفعيل الرد","toggle_full":"إذن تفعيل الإنشاء","inherited":"هذا الإذن مكتسب من \"الجميع\""},"special_warning":"تحذير: هذه الفئة مصنَّفة مسبقًا ولا يمكن تعديل إعدادات الأمان لها. إذا كنت لا ترغب في استخدام هذه الفئة، فعليك حذفها بدلًا من إعادة توظيفها.","uncategorized_security_warning":"هذه الفئة خاصة. وتهدف إلى جمع الموضوعات التي لا تنتمي إلى أي فئة، ولا يمكنك ضبط إعدادات حماية لها.","uncategorized_general_warning":"هذه الفئة خاصة. ويتم استخدامها كفئة افتراضية للموضوعات الجديدة التي لا تنتمي إلى أي فئة. إذا أردت منع هذا السلوك وفرض تحديد الفئة، \u003ca href=\"%{settingLink}\"\u003eيُرجى إيقاف هذا الإعداد من هنا\u003c/a\u003e. إذا أردت تغيير اسم الفئة أو وصفها، فانتقل إلى \u003ca href=\"%{customizeLink}\"\u003eالتخصيص/المحتوى النصي\u003c/a\u003e.","pending_permission_change_alert":"لم تُضف المجموعة %{group} إلى هذه الفئة، انقر على هذا الزر لإضافتها.","images":"الصور","email_in":"العنوان المخصَّص للبريد الوارد:","email_in_allow_strangers":"قبول الرسائل الإلكترونية من المستخدمين المجهولين الذين لا يملكون حسابات","email_in_disabled":"تم إيقاف نشر الموضوعات الجديدة عبر البريد الإلكتروني في إعدادات الموقع. لتفعيل نشر الموضوعات الجديدة عبر البريد الإلكتروني، ","email_in_disabled_click":"فعليك تفعيل خيار \"email in\" في الإعدادات.","mailinglist_mirror":"الفئة تعكس قائمة بريدية","show_subcategory_list":"اعرض قائمة الفئات الفرعية أعلى الموضوعات في هذه الفئة.","read_only_banner":"نص البانر عندما لا يستطيع المستخدم إنشاء موضوع في هذه الفئة:","num_featured_topics":"عدد الموضوعات المعروضة في صفحة الفئات:","subcategory_num_featured_topics":"عدد الموضوعات المميزة في صفحة الفئة الرئيسية.","all_topics_wiki":"تحويل الموضوعات الجديدة إلى Wiki بشكلٍ افتراضي","allow_unlimited_owner_edits_on_first_post":"السماح للمالك بعدد غير محدود من التعديلات على أول منشور","subcategory_list_style":"نمط قائمة الفئات الفرعية:","sort_order":"ترتيب قائمة الموضوعات حسب:","default_view":"قائمة الموضوعات الافتراضية:","default_top_period":"الفترة الافتراضية للأكثر عرضًا:","default_list_filter":"تصفية القائمة الافتراضية:","allow_badges_label":"السماح بمنح الشارات في هذه الفئة","edit_permissions":"تعديل الأذونات","reviewable_by_group":"بالإضافة إلى فريق العمل، يمكن أيضًا مراجعة المحتوى في هذه الفئة بواسطة:","review_group_name":"اسم المجموعة","require_topic_approval":"طلب موافقة المشرف على جميع الموضوعات الجديدة","require_reply_approval":"طلب موافقة المشرف على جميع الردود الجديدة","this_year":"هذا العام","position":"الترتيب في صفحة الفئات:","default_position":"الترتيب الافتراضي","position_disabled":"سيتم عرض الفئات بترتيب نشاطها. للتحكُّم في ترتيب الفئات في القائمة، ","position_disabled_click":"عليك تفعيل إعداد \"تثبيت ترتيب الفئات\".","minimum_required_tags":"الحد الأدنى من عدد الوسوم المطلوبة في الموضوع:","default_slow_mode":"تفعيل \"الوضع البطيء\" للموضوعات الجديدة في هذه الفئة.","parent":"الفئة الرئيسية","num_auto_bump_daily":"عدد الموضوعات المفتوحة التي سيتم رفعها تلقائيًا بشكل يومي:","navigate_to_first_post_after_read":"الانتقال إلى أول منشور بعد قراءة الموضوعات","notifications":{"watching":{"title":"المراقبة","description":"ستراقب تلقائيًا جميع الموضوعات في هذه الفئة. وسيتم إرسال إشعار إليك بكل منشور جديد في كل موضوع، وسيتم عرض عدد الردود الجديدة."},"watching_first_post":{"title":"مراقبة أول منشور","description":"سنُرسل إليك إشعارًا بالموضوعات الجديدة في هذه الفئة، ولكن ليس الردود على الموضوعات."},"tracking":{"title":"التتبُّع","description":"ستتتبَّع تلقائيًا جميع الموضوعات في هذه الفئة. وسيتم إرسال إشعار إليك إذا أشار إليك شخص ما @name أو ردَّ عليك، وسيتم عرض عدد الردود الجديدة."},"regular":{"title":"عادية","description":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ عليك."},"muted":{"title":"الكتم","description":"لن يتم إرسال إشعار إليك أبدًا بأي شيء يتعلَّق بالموضوعات الجديدة في هذه الفئة، ولن تظهر في الموضوعات الحديثة."}},"search_priority":{"label":"أولوية البحث","options":{"normal":"عادية","ignore":"تجاهل","very_low":"منخفضة جدًا","low":"منخفضة","high":"عالية","very_high":"مرتفعة جدًا"}},"sort_options":{"default":"افتراضية","likes":"الإعجابات","op_likes":"الإعجابات على المنشور الأصلي","views":"مرات العرض","posts":"المنشورات","activity":"النشاط","posters":"الناشرون","category":"الفئة","created":"تاريخ الإنشاء"},"sort_ascending":"تصاعدي","sort_descending":"تنازلي","subcategory_list_styles":{"rows":"صفوف","rows_with_featured_topics":"صفوف بالموضوعات المميزة","boxes":"مربعات","boxes_with_featured_topics":"مربعات بالموضوعات المميزة"},"settings_sections":{"general":"عام","moderation":"الإشراف","appearance":"الظهور","email":"البريد الإلكتروني"},"list_filters":{"all":"جميع الموضوعات","none":"لا توجد فئات فرعية"},"colors_disabled":"لا يمكنك تحديد الألوان لأنه ليس لديك نمط فئة."},"flagging":{"title":"نشكرك على مساعدتك في الحفاظ على مجتمعنا متحضرًا.","action":"الإبلاغ عن المنشور","take_action":"اتخاذ إجراء...","take_action_options":{"default":{"title":"اتخاذ إجراء","details":"الوصول إلى الحد الأقصى للبلاغات على الفور بدلًا من انتظار المزيد من البلاغات من أعضاء المجتمع."},"suspend":{"title":"تعليق المستخدم","details":"الوصول إلى الحد الأقصى للبلاغات وتعليق المستخدم"},"silence":{"title":"كتم المستخدم","details":"الوصول إلى الحد الأقصى للبلاغات، وكتم المستخدم"}},"notify_action":"رسالة","official_warning":"تحذير رسمي","delete_spammer":"حذف صاحب الأسلوب غير المرغوب فيه","flag_for_review":"قائمة انتظار المراجعة","yes_delete_spammer":"نعم، حذف صاحب الأسلوب غير المرغوب فيه","ip_address_missing":"(لا يوجد)","hidden_email_address":"(مخفي)","submit_tooltip":"إرسال البلاغ الخاص","take_action_tooltip":"الوصول إلى الحد الأقصى للبلاغات على الفور بدلًا من انتظار المزيد من البلاغات من أعضاء المجتمع.","cant":"عذرًا، لا يمكنك الإبلاغ عن هذا المنشور في الوقت الحالي.","notify_staff":"إرسال إشعار إلى فريق العمل بشكلٍ خاص","formatted_name":{"off_topic":"خارج عن الموضوع","inappropriate":"غير لائق","spam":"غير مرغوب فيه"},"custom_placeholder_notify_user":"كُن محددًا وبنَّاءً ولطيفًا دائمًا.","custom_placeholder_notify_moderators":"أخبرنا بالتحديد عن سبب استيائك هذا المنشور، وقدِّم لنا بعض الروابط والأمثلة ذات الصلة قدر الإمكان.","custom_message":{"at_least":{"zero":"أدخِل %{count} حرف على الأقل","one":"أدخِل حرفًا واحدًا (%{count}) على الأقل","two":"أدخِل حرفين (%{count}) على الأقل","few":"أدخِل %{count} حروف على الأقل","many":"أدخِل %{count} حرفًا على الأقل","other":"أدخِل %{count} حرف على الأقل"},"more":{"zero":"بقي %{count}...","one":"بقي %{count}...","two":"بقي %{count}...","few":"بقي %{count}...","many":"بقي %{count}...","other":"بقي %{count}..."},"left":{"zero":"بقي %{count}...","one":"بقي %{count}...","two":"بقي %{count}...","few":"بقي %{count}...","many":"بقي %{count}...","other":"بقي %{count}..."}}},"flagging_topic":{"title":"نشكرك على مساعدتك في الحفاظ على مجتمعنا متحضرًا.","action":"الإبلاغ عن الموضوع","notify_action":"رسالة"},"topic_map":{"title":"ملخص الموضوع","participants_title":"الناشرون المتكررون","links_title":"الروابط الرائجة","links_shown":"عرض المزيد من الروابط...","clicks":{"zero":"%{count} نقرة","one":"نقرة واحدة (%{count})","two":"نقرتان (%{count})","few":"%{count} نقرات","many":"%{count} نقرة","other":"%{count} نقرة"}},"post_links":{"about":"توسيع المزيد من الروابط لهذا المنشور","title":{"zero":"%{count} رابط آخر","one":"رابط واحد (%{count}) آخر","two":"رابطان (%{count}) آخران","few":"%{count} روابط أخرى","many":"%{count} رابطًا آخر","other":"%{count} رابط آخر"}},"topic_statuses":{"warning":{"help":"هذا تحذير رسمي."},"bookmarked":{"help":"لقد وضعت إشارة مرجعية على هذا الموضوع"},"locked":{"help":"هذا الموضوع مغلق؛ لذا فإنه لم يعد يستقبل ردودًا جديدة"},"archived":{"help":"هذا الموضوع مؤرشف؛ لذا فإنه مجمَّد ولا يمكن تعديله"},"locked_and_archived":{"help":"هذا الموضوع مغلق ومؤرشف؛ لذا فإنه لم يعد يستقبل ردودًا جديدة ولا يمكن تغييره"},"unpinned":{"title":"غير مثبَّت","help":"هذا الموضوع غير مثبّت لك، وسيتم عرضه بالترتيب العادي"},"pinned_globally":{"title":"مثبَّت بشكلٍ عام","help":"هذا الموضوع مثبَّت بشكلٍ عام؛ لذا فإنه سيظهر في أعلى صفحة أحدث الموضوعات وفي أعلى فئته."},"pinned":{"title":"مثبَّت","help":"هذا الموضوع مثبَّت لك وسيتم عرضه في أعلى فئته"},"unlisted":{"help":"هذا الموضوع غير مدرج؛ لذا فإنه لن يظهر في قوائم الموضوعات، ولا يمكن الوصول إليه إلا برابط مباشر"},"personal_message":{"title":"هذا الموضوع عبارة عن رسالة خاصة","help":"هذا الموضوع عبارة عن رسالة خاصة"}},"posts":"المنشورات","original_post":"المنشور الأصلي","views":"مرات العرض","views_lowercase":{"zero":"مرة عرض","one":"مرة عرض واحدة","two":"مرتا عرض","few":"مرات عرض","many":"مرة عرض","other":"مرة عرض"},"replies":"الردود","views_long":{"zero":"لقد تم عرض هذا الموضوع %{number} مرة","one":"لقد تم عرض هذا الموضوع مرة واحدة (%{count})","two":"لقد تم عرض هذا الموضوع مرتين (%{number})","few":"لقد تم عرض هذا الموضوع %{number} مرات","many":"لقد تم عرض هذا الموضوع %{number} مرة","other":"لقد تم عرض هذا الموضوع %{number} مرة"},"activity":"النشاط","likes":"الإعجابات","likes_lowercase":{"zero":"مرة إعجاب","one":"مرة إعجاب واحدة","two":"مرتا إعجاب","few":"مرات إعجاب","many":"مرة إعجاب","other":"مرة إعجاب"},"users":"المستخدمون","users_lowercase":{"zero":"مستخدم","one":"مستخدم واحد","two":"مستخدمان","few":"مستخدمين","many":"مستخدمًا","other":"مستخدم"},"category_title":"الفئة","history":"السجل، آخر 100 مراجعة","changed_by":"بواسطة %{author}","raw_email":{"title":"البريد الوارد","not_available":"غير متوفرة!"},"categories_list":"قائمة الفئات","filters":{"with_topics":"موضوعات %{filter}","with_category":"موضوعات %{filter} في %{category}","latest":{"title":"الحديثة","title_with_count":{"zero":"الحديثة (%{count})","one":"الحديثة (%{count})","two":"الحديثة (%{count})","few":"الحديثة (%{count})","many":"الحديثة (%{count})","other":"الحديثة (%{count})"},"help":"الموضوعات ذات المنشورات الحديثة"},"read":{"title":"المقروءة","help":"الموضوعات التي قرأتها بالترتيب حسب آخر موضوع قرأته"},"categories":{"title":"الفئات","title_in":"الفئة - %{categoryName}","help":"جميع الموضوعات مجمَّعة حسب الفئة"},"unread":{"title":"غير المقروءة","title_with_count":{"zero":"غير المقروءة (%{count})","one":"غير المقروءة (%{count})","two":"غير المقروءة (%{count})","few":"غير المقروءة (%{count})","many":"غير المقروءة (%{count})","other":"غير المقروءة (%{count})"},"help":"الموضوعات التي تراقبها أو تتتبَّعها وتتضمَّن منشورات غير مقروءة","lower_title_with_count":{"zero":"%{count} غير مقروء","one":"%{count} غير مقروء","two":"%{count} غير مقروءين","few":"%{count} غير مقروءة","many":"%{count} غير مقروءة","other":"%{count} غير مقروءة"}},"new":{"lower_title_with_count":{"zero":"%{count} جديد","one":"%{count} جديد","two":"%{count} جديدان","few":"%{count} جديدة","many":"%{count} جديدًا","other":"%{count} جديد"},"lower_title":"الجديدة","title":"الجديدة","title_with_count":{"zero":"الجديدة (%{count})","one":"الجديدة (%{count})","two":"الجديدة (%{count})","few":"الجديدة (%{count})","many":"الجديدة (%{count})","other":"الجديدة (%{count})"},"help":"الموضوعات التي تم إنشاؤها في الأيام القليلة الماضية"},"posted":{"title":"منشوراتي","help":"الموضوعات التي نشرت فيها"},"bookmarks":{"title":"الإشارات المرجعية","help":"الموضوعات التي وضعت عليها إشارة مرجعية"},"category":{"title":"%{categoryName}","title_with_count":{"zero":"‏%{categoryName} ‏(%{count})","one":"‏%{categoryName} ‏(%{count})","two":"‏%{categoryName} ‏(%{count})","few":"‏%{categoryName} ‏(%{count})","many":"‏%{categoryName} ‏(%{count})","other":"‏%{categoryName} ‏(%{count})"},"help":"الموضوعات الحديثة في الفئة %{categoryName}"},"top":{"title":"الأكثر عرضًا","help":"أكثر الموضوعات نشاطًا في آخر عام أو شهر أو أسبوع أو يوم","all":{"title":"طوال الوقت"},"yearly":{"title":"سنويًا"},"quarterly":{"title":"ربع سنوي"},"monthly":{"title":"شهريًا"},"weekly":{"title":"أسبوعيًا"},"daily":{"title":"يوميًا"},"all_time":"طوال الوقت","this_year":"العام","this_quarter":"ربع السنة","this_month":"الشهر","this_week":"الأسبوع","today":"اليوم","other_periods":"رؤية الأكثر عرضًا:"}},"browser_update":"للأسف، \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eمتصفحك قديم جدًا على أن يعمل عليه هذا الموقع\u003c/a\u003e. يُرجى \u003ca href=\"https://browsehappy.com\"\u003eتحديث متصفحك\u003c/a\u003e لعرض المحتوى الغني وتسجيل الدخول والرد.","permission_types":{"full":"الإنشاء/الرد/العرض","create_post":"الرد/العرض","readonly":"العرض"},"lightbox":{"download":"تنزيل","previous":"السابق (مفتاح السهم الأيسر)","next":"التالي (مفتاح السهم الأيمن)","counter":"%curr% من %total%","close":"إغلاق (Esc)","content_load_error":"تعذَّر تحميل \u003ca href=\"%url%\"\u003eالمحتوى\u003c/a\u003e.","image_load_error":"تعذَّر تحميل \u003ca href=\"%url%\"\u003eالصورة\u003c/a\u003e."},"cannot_render_video":"لا يمكن عرض هذا الفيديو لأن متصفحك لا يدعم برنامج الترميز.","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} أو %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"اختصارات لوحة المفاتيح","jump_to":{"title":"الانتقال إلى","home":"%{shortcut} الصفحة الرئيسية","latest":"%{shortcut} الحديثة","new":"%{shortcut} الجديدة","unread":"%{shortcut} غير المقروءة","categories":"%{shortcut} الفئات","top":"%{shortcut} الأكثر عرضًا","bookmarks":"%{shortcut} الإشارات المرجعية","profile":"%{shortcut} الملف الشخصي","messages":"%{shortcut} الرسائل","drafts":"%{shortcut} المسودات","next":"%{shortcut} الموضوع التالي","previous":"%{shortcut} الموضوع السابق"},"navigation":{"title":"التنقل","jump":"%{shortcut} الانتقال إلى المنشور #","back":"%{shortcut} الرجوع","up_down":"%{shortcut} نقل التحديد \u0026uarr; \u0026darr;","open":"%{shortcut} فتح الموضوع المحدَّد","next_prev":"%{shortcut} القسم التالي/السابق","go_to_unread_post":"%{shortcut} الانتقال إلى أول منشور غير مقروء"},"application":{"title":"التطبيق","create":"%{shortcut} إنشاء موضوع جديد","notifications":"%{shortcut} فتح الإخطارات","hamburger_menu":"%{shortcut} فتح قائمة الخطوط الثلاثة","user_profile_menu":"%{shortcut} فتح قائمة المستخدم","show_incoming_updated_topics":"%{shortcut} عرض الموضوعات المحدَّثة","search":"%{shortcut} البحث","help":"%{shortcut} فتح مساعدة لوحة المفاتيح","dismiss_new":"%{shortcut} تجاهل الجديد","dismiss_topics":"%{shortcut} تجاهل الموضوعات","log_out":"%{shortcut} تسجيل الخروج"},"composing":{"title":"الإنشاء","return":"%{shortcut} العودة إلى أداة الإنشاء","fullscreen":"%{shortcut} أداة الإنشاء في وضع ملء الشاشة"},"bookmarks":{"title":"وضع إشارة مرجعية","enter":"%{shortcut} الحفظ والإغلاق","later_today":"%{shortcut} لاحقًا اليوم","later_this_week":"%{shortcut} لاحقًا هذا الأسبوع","tomorrow":"%{shortcut} غدًا","next_week":"%{shortcut} الأسبوع القادم","next_month":"%{shortcut} الشهر القادم","next_business_week":"%{shortcut} بداية الأسبوع القادم","next_business_day":"%{shortcut} يوم العمل التالي","custom":"%{shortcut} تاريخ ووقت مخصَّصان","none":"%{shortcut} إلغاء التذكير","delete":"%{shortcut} حذف الإشارة المرجعية"},"actions":{"title":"الإجراءات","bookmark_topic":"%{shortcut} تفعيل/إيقاف الإشارة المرجعية علي الموضوع","pin_unpin_topic":"%{shortcut} تثبيت/إلغاء تثبيت الموضوع","share_topic":"%{shortcut} مشاركة الموضوع","share_post":"%{shortcut} مشاركة المنشور","reply_as_new_topic":"%{shortcut} الرد كموضوع مرتبط","reply_topic":"%{shortcut} الرد على الموضوع","reply_post":"%{shortcut} الرد على المنشور","quote_post":"%{shortcut} اقتباس المنشور","like":"%{shortcut} تسجيل الإعجاب بالمنشور","flag":"%{shortcut} الإبلاغ عن المنشور","bookmark":"%{shortcut} وضع إشارة مرجعية علي المنشور","edit":"%{shortcut} تعديل المنشور","delete":"%{shortcut} حذف المنشور","mark_muted":"%{shortcut} كتم الموضوع","mark_regular":"%{shortcut} موضوع عادي (افتراضي)","mark_tracking":"%{shortcut} تتبُّع الموضوع","mark_watching":"%{shortcut} مراقبة الموضوع","print":"%{shortcut} طباعة الموضوع","defer":"%{shortcut} تأجيل الموضوع","topic_admin_actions":"%{shortcut} فتح إجراءات المشرف على الموضوع"},"search_menu":{"title":"قائمة البحث","prev_next":"%{shortcut} نقل التحديد لأعلى ولأسفل","insert_url":"%{shortcut} إدخال التحديد في أداة الإنشاء المفتوحة"}},"badges":{"earned_n_times":{"zero":"تم منحك هذه الشارة %{count} مرة","one":"تم منحك هذه الشارة مرة واحدة (%{count})","two":"تم منحك هذه الشارة مرتين (%{count})","few":"تم منحك هذه الشارة %{count} مرات","many":"تم منحك هذه الشارة %{count} مرة","other":"تم منحك هذه الشارة %{count} مرة"},"granted_on":"تم منحه بتاريخ %{date}","others_count":"الآخرون الذين تم منحهم هذه الشارة (%{count})","title":"الشارات","allow_title":"يمكنك استخدام هذة الشارة كلقب","multiple_grant":"يمكن أن يتم منحك هذه الشارة أكثر من مرة","badge_count":{"zero":"%{count} شارة","one":"شارة واحدة (%{count})","two":"شارتان (%{count})","few":"%{count} شارات","many":"%{count} شارة","other":"%{count} شارة"},"more_badges":{"zero":"+%{count} شارة أخرى","one":"+شارة واحدة (%{count}) أخرى","two":"+شارتان أخرتان (%{count})","few":"+%{count} شارات أخرى","many":"+%{count} شارة أخرى","other":"+%{count} شارة أخرى"},"granted":{"zero":"%{count} شارة تم منحها","one":"شارة واحدة (%{count}) تم منحها","two":"شارتان (%{count}) تم منحهما","few":"%{count} شارات تم منحها","many":"%{count} شارة تم منحها","other":"%{count} شارة تم منحها"},"select_badge_for_title":"حدِّد شارة لاستخدامها كلقب لك","none":"(لا يوجد)","successfully_granted":"تم منح %{username} الشارة %{badge} بنجاح","badge_grouping":{"getting_started":{"name":"خطوات البدء"},"community":{"name":"المجتمع"},"trust_level":{"name":"مستوى الثقة"},"other":{"name":"أخرى"},"posting":{"name":"النشر"}},"favorite_max_reached":"لا يمكنك تفضيل المزيد من الشارات.","favorite_max_not_reached":"وضع علامة على هذه الشارة كمفضَّلة","favorite_count":"تم وضع علامة على %{count}/%{max} شارة كمفضَّلة"},"tagging":{"all_tags":"كل الوسوم","other_tags":"وسوم أخرى","selector_all_tags":"كل الوسوم","selector_no_tags":"لا توجد وسوم","changed":"الوسوم التي تم تغييرها:","tags":"الوسوم","choose_for_topic":"الوسوم الاختيارية","info":"المعلومات","default_info":"هذا الوسم ليس مقصورًا على أي فئات وليس له أي مرادفات. لإضافة قيود، ضع هذا الوسم في \u003ca href=%{basePath}/tag_groups\u003e مجموعة وسوم\u003c/a\u003e.","category_restricted":"هذا الوسم مقيَّد بالفئات التي ليس لديك إذن بالوصول إليها.","synonyms":"المرادفات","synonyms_description":"عند استخدام الوسوم التالية، سيتم استبدالها بالوسم \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"zero":"هذا الوسم ينتمي إلى المجموعة: %{tag_groups}.","one":"هذا الوسم ينتمي إلى المجموعة: %{tag_groups}.","two":"هذا الوسم ينتمي إلى المجموعتين: %{tag_groups}.","few":"هذا الوسم ينتمي إلى المجموعات: %{tag_groups}.","many":"هذا الوسم ينتمي إلى المجموعات: %{tag_groups}.","other":"هذا الوسم ينتمي إلى المجموعات: %{tag_groups}."},"category_restrictions":{"zero":"لا يمكن استخدامه إلا في هذه الفئة:","one":"لا يمكن استخدامه إلا في هذه الفئة:","two":"لا يمكن استخدامه إلا في هاتين الفئتين:","few":"لا يمكن استخدامه إلا في هذه الفئات:","many":"لا يمكن استخدامه إلا في هذه الفئات:","other":"لا يمكن استخدامه إلا في هذه الفئات:"},"edit_synonyms":"إدارة المرادفات","add_synonyms_label":"إضافة المرادفات:","add_synonyms":"إضافة","add_synonyms_explanation":{"zero":"سيتحوَّل أي مكان يستخدم هذا الوسم إلى استخدام \u003cb\u003e%{tag_name}\u003c/b\u003e بدلًا منه. هل تريد بالتأكيد إجراء هذا التغيير؟","one":"سيتحوَّل أي مكان يستخدم هذا الوسم إلى استخدام \u003cb\u003e%{tag_name}\u003c/b\u003e بدلًا منه. هل تريد بالتأكيد إجراء هذا التغيير؟","two":"سيتحوَّل أي مكان يستخدم هذين الوسمين إلى استخدام \u003cb\u003e%{tag_name}\u003c/b\u003e بدلًا منه. هل تريد بالتأكيد إجراء هذا التغيير؟","few":"سيتحوَّل أي مكان يستخدم هذه الوسوم إلى استخدام \u003cb\u003e%{tag_name}\u003c/b\u003e بدلًا منه. هل تريد بالتأكيد إجراء هذا التغيير؟","many":"سيتحوَّل أي مكان يستخدم هذه الوسوم إلى استخدام \u003cb\u003e%{tag_name}\u003c/b\u003e بدلًا منه. هل تريد بالتأكيد إجراء هذا التغيير؟","other":"سيتحوَّل أي مكان يستخدم هذه الوسوم إلى استخدام \u003cb\u003e%{tag_name}\u003c/b\u003e بدلًا منه. هل تريد بالتأكيد إجراء هذا التغيير؟"},"add_synonyms_failed":"تعذَّرت إضافة الوسوم التالية كمرادفات: \u003cb\u003e%{tag_names}\u003c/b\u003e. تأكَّد من عدم وجود مرادفات لها وأنها ليست مرادفات لوسوم أخرى.","remove_synonym":"إزالة المرادف","delete_synonym_confirm":"هل تريد بالتأكيد حذف المرادف \"%{tag_name}\"؟","delete_tag":"حذف الوسم","delete_confirm":{"zero":"هل تريد بالتأكيد حذف هذا الوسم وإزالته من الموضوع (%{count}) المخصَّص له؟","one":"هل تريد بالتأكيد حذف هذا الوسم وإزالته من الموضوع (%{count}) المخصَّص له؟","two":"هل تريد بالتأكيد حذف هذا الوسم وإزالته من الموضوعين (%{count}) المخصَّص لهما؟","few":"هل تريد بالتأكيد حذف هذا الوسم وإزالته من الموضوعات (%{count}) المخصَّص لها؟","many":"هل تريد بالتأكيد حذف هذا الوسم وإزالته من الموضوعات (%{count}) المخصَّص لها؟","other":"هل تريد بالتأكيد حذف هذا الوسم وإزالته من الموضوعات (%{count}) المخصَّص لها؟"},"delete_confirm_no_topics":"هل تريد بالتأكيد حذف هذا الوسم؟","delete_confirm_synonyms":{"zero":"سيتم حذف مرادفه (%{count}).","one":"سيتم حذف مرادفه (%{count}).","two":"سيتم حذف مرادفيه (%{count}) أيضًا.","few":"سيتم حذف مرادفاته (%{count}) أيضًا.","many":"سيتم حذف مرادفاته (%{count}) أيضًا.","other":"سيتم حذف مرادفاته (%{count}) أيضًا."},"rename_tag":"إعادة تسمية الوسم","rename_instructions":"اختر اسمًا جديدًا للوسم:","sort_by":"الترتيب حسب:","sort_by_count":"العدد","sort_by_name":"الاسم","manage_groups":"إدارة مجموعات الوسوم","manage_groups_description":"تحديد المجموعات لتنظيم الوسوم","upload":"تحميل الوسوم","upload_description":"تحميل ملف CSV لإنشاء الوسوم بشكلٍ جماعي","upload_instructions":"واحد في كل سطر، مع مجموعة وسوم بالتنسيق 'tag_name,tag_group' بشكلٍ اختياري.","upload_successful":"تم تحميل الوسوم بنجاح","delete_unused_confirmation":{"zero":"سيتم حذف %{count} وسم: %{tags}","one":"سيتم حذف وسم واحد (%{count}): %{tags}","two":"سيتم حذف وسمين (%{count}): %{tags}","few":"سيتم حذف %{count} وسوم: %{tags}","many":"سيتم حذف %{count} وسمًا: %{tags}","other":"سيتم حذف %{count} وسم: %{tags}"},"delete_unused_confirmation_more_tags":{"zero":"%{tags} و%{count} وسم آخر","one":"%{tags} ووسم واحد (%{count}) آخر","two":"%{tags} ووسمان (%{count}) آخران","few":"%{tags} و%{count} وسوم أخرى","many":"%{tags} و%{count} وسمًا آخر","other":"%{tags} و%{count} وسم آخر"},"delete_no_unused_tags":"لا توجد وسوم غير مستخدمة:","tag_list_joiner":"، ","delete_unused":"حذف الوسوم غير المستخدمة","delete_unused_description":"حذف جميع الوسوم غير المرتبطة بأي موضوعات أو رسائل خاصة","cancel_delete_unused":"إلغاء","filters":{"without_category":"%{filter} موضوعات %{tag}","with_category":"موضوعات ‏%{filter} التي تحمل الوسم %{tag} في الفئة %{category}","untagged_without_category":"%{filter} موضوعات بلا وسوم","untagged_with_category":"موضوعات %{filter} غير الموسومة في الفئة %{category}"},"notifications":{"watching":{"title":"المراقبة","description":"ستراقب تلقائيًا جميع الموضوعات التي تحمل هذا الوسم. وسنُرسل إليك إشعارات بالمنشورات والموضوعات الجديدة، وسيظهر أيضًا عدد المنشورات الجديدة بجانب الموضوع."},"watching_first_post":{"title":"مراقبة أول منشور","description":"سنُرسل إليك إشعارًا بالموضوعات الجديدة التي تحمل هذا الوسم، ولكن ليس الردود على الموضوعات."},"tracking":{"title":"التتبُّع","description":"ستتتبَّع تلقائيًا جميع الموضوعات التي تحمل هذا الوسم. وسيظهر أيضًا عدد المنشورات غير المقروءة والجديدة بجانب الموضوع."},"regular":{"title":"منتظمة","description":"سنُرسل إليك إشعارًا إذا أشار أحد إلى اسمك باستخدام الرمز @ أو ردَّ على منشورك."},"muted":{"title":"الكتم","description":"لن تتلقى أي إشعارات أبدًا بخصوص الموضوعات الجديدة التي تحمل هذا الوسم، ولن تظهر في علامة تبويب الموضوعات غير المقروءة."}},"groups":{"title":"مجموعات الوسوم","about_heading":"حدِّد مجموعة وسوم أو أنشئ مجموعة جديدة","about_heading_empty":"أنشئ مجموعة وسوم جديدة للبدء","about_description":"تساعدك مجموعات الوسوم في إدارة الأذونات للعديد من الوسوم في مكانٍ واحد.","new":"مجموعة جديدة","new_title":"إنشاء مجموعة جديدة","edit_title":"تعديل مجموعة الوسوم","tags_label":"الوسوم في هذه المجموعة","parent_tag_label":"الوسم الرئيسي","parent_tag_description":"لا يمكن استخدام الوسوم من هذه المجموعة إلا في حال وجود الوسم الرئيسي.","one_per_topic_label":"تحديد وسم واحد فقط لكل موضوع من هذه المجموعة","new_name":"مجموعة وسوم جديدة","name_placeholder":"الاسم","save":"حفظ","delete":"حذف","confirm_delete":"هل تريد بالتأكيد حذف مجموعة الوسوم هذه؟","everyone_can_use":"يمكن للجميع استخدام الوسوم","usable_only_by_groups":"تكون الوسوم مرئية للجميع، ولكن يمكن للمجموعات التالية فقط استخدامها","visible_only_to_groups":"تكون الوسوم مرئية للمجموعات التالية فقط","cannot_save":"لا يمكن حفظ مجموعة الوسوم. تأكَّد من وجود وسم واحد على الأقل، وأن اسم مجموعة الوسوم ليس فارغًا، وأن هناك مجموعة محدَّدة لمنحها إذن الوسوم.","tags_placeholder":"البحث أو إنشاء الوسوم","parent_tag_placeholder":"اختياري","select_groups_placeholder":"تحديد المجموعات...","disabled":"وضع الوسوم متوقف. "},"topics":{"none":{"unread":"ليس لديك أي موضوع غير مقروء.","new":"ليس لديك أي موضوع جديد.","read":"لم تقرأ أي موضوع بعد.","posted":"لم تنشر في أي موضوع بعد.","latest":"لا توجد موضوعات حديثة.","bookmarks":"لم تضع إشارة مرجعية على أي موضوع بعد.","top":"لا توجد موضوعات في الأكثر نشاطًا."}}},"invite":{"custom_message":"جعل دعوتك أكثر اتسامًا بالطابع الشخصي عن طريق كتابة \u003ca href\u003eرسالة مخصَّصة\u003c/a\u003e.","custom_message_placeholder":"أدخِل رسالتك المخصَّصة","approval_not_required":"ستتم الموافقة تلقائيًا على المستخدم بمجرد قبوله لهذه الدعوة.","custom_message_template_forum":"مرحبًا. يجب عليك الانضمام إلى هذا المنتدى!","custom_message_template_topic":"مرحبًا. أظن أنك ستستمتع بهذا الموضوع!"},"forced_anonymous":"بسبب الضغط الشديد، يتم عرض هذا الموضوع للجميع مؤقتًا كما يراه مستخدم سجَّل الخروج.","forced_anonymous_login_required":"الموقع تحت ضغط شديد ولا يمكن تحميله في الوقت الحالي، حاول مرة أخرى في غضون بضع دقائق.","footer_nav":{"back":"الرجوع","forward":"للأمام","share":"مشاركة","dismiss":"تجاهل"},"safe_mode":{"enabled":"تم تفعيل الوضع الآمن، أغلق نافذة المتصفح هذه للخروج منه"},"image_removed":"(تمت إزالة الصورة)","do_not_disturb":{"title":"عدم الإزعاج لمدة...","label":"عدم الإزعاج","remaining":"بقي %{remaining}...","options":{"half_hour":"30 دقيقة","one_hour":"ساعة واحدة","two_hours":"ساعتان","tomorrow":"حتى الغد","custom":"مخصَّصة"},"set_schedule":"ضبط جدول الإشعارات"},"trust_levels":{"names":{"newuser":"مستخدم جديد","basic":"مستخدم أساسي","member":"عضو","regular":"عادية","leader":"قائد"},"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"لقد اخترت ملفًا غير مدعوم. أنواع الملفات المدعومة - %{types}."},"admin":{"site_settings":{"categories":{"chat_integration":"إعدادات الدردشة"}}},"chat_integration":{"menu_title":"إعدادات الدرشة","settings":"إعدادات","no_providers":"تحتاج إلى تفعيل بعض المزودين في إعدادات الإضافة","channels_with_errors":"فشلت بعض قنوات هذا المزود مؤخراً حينما تم إرسال رسائل. انقر على أيقونة (أيقونات) الخطأ لمعرفة المزيد.","choose_group":"(اختر مجموعة)","all_categories":"(جميع الأقسام)","all_tags":"(جميع الوسوم)","delete_channel":"حذف","test_channel":"اختبار","edit_channel":"تعديل","test_modal":{"title":"أرسل رسالة اختبار","topic":"موضوع","close":"إغلاق","success":"الرسالة أُرسلت بنجاح"},"type":{"normal":"طبيعي"},"filter":{"mute":"صامت","follow":"أوّل منشور فقط"},"rule_table":{"filter":"رشّح","category":"قسم","tags":"وسوم","edit_rule":"تعديل","delete_rule":"حذف"},"edit_channel_modal":{"title":"تعديل القناة","save":"حفظ القناة","cancel":"إلغاء"},"edit_rule_modal":{"cancel":"إلغاء","type":"نوع","channel":"قناة","filter":"رشّح","category":"قسم","group":"مجموعة","tags":"وسوم"},"provider":{"slack":{"param":{"identifier":{"title":"قناة"}}},"telegram":{"param":{"name":{"title":"الاسم"}}},"discord":{"param":{"name":{"title":"الاسم"}}},"mattermost":{"param":{"identifier":{"title":"قناة"}}},"matrix":{"param":{"name":{"title":"الاسم"}}},"zulip":{"param":{"subject":{"title":"الموضوع"}}},"rocketchat":{"param":{"identifier":{"title":"قناة"}}},"gitter":{"param":{"name":{"title":"الاسم"}}}}},"details":{"title":"إخفاء التفاصيل"},"discourse_local_dates":{"relative_dates":{"today":"اليوم %{time}","tomorrow":"غدًا %{time}","yesterday":"أمس %{time}","countdown":{"passed":"لقد انقضى التاريخ"}},"title":"إدخال التاريخ/الوقت","create":{"form":{"insert":"إدراج","advanced_mode":"الوضع المتقدّم","simple_mode":"الوضع البسيط","format_description":"التنسيق المستخدم لعرض التاريخ للمستخدم. استخدم Z لعرض الإزاحة وzz لاسم المنطقة الزمنية.","timezones_title":"المناطق الزمنية لعرضها","timezones_description":"سيتم استخدام المناطق الزمنية لعرض التواريخ في المعاينة والنسخة الاحتياطية.","recurring_title":"التكرار","recurring_description":"حدِّد مدى تكرار الحدث. يمكنك أيضًا تعديل خيار التكرار الذي أنشأه النموذج يدويًا واستخدام أحد المفاتيح التالية: years، ‏quarters، ‏months، ‏days، ‏hours، ‏minutes، ‏seconds، ‏milliseconds.","recurring_none":"بلا تكرار","invalid_date":"التاريخ غير صالح، تأكَّد من صحة التاريخ والوقت","date_title":"التاريخ","time_title":"الوقت","format_title":"تنسيق التاريخ","timezone":"المنطقة الزمنية","until":"حتّى...","recurring":{"every_day":"كل يوم","every_week":"كل أسبوع","every_two_weeks":"كل أسبوعين","every_month":"كل شهر","every_two_months":"كل شهرين","every_three_months":"كل ثلاثة أشهر","every_six_months":"كل ستة أشهر","every_year":"كل سنة"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"بدء الدرس التعليمي لجميع المستخدمين الجُدد","welcome_message":"إرسال رسالة ترحيبية لجميع المستخدمين الجُدد مع دليل البدء السريع"}},"presence":{"replying":{"zero":"يكتب ردًا","one":"يكتب ردًا","two":"يكتبان ردًا","few":"يكتبون ردًا","many":"يكتبون ردًا","other":"يكتبون ردًا"},"editing":{"zero":"يعدّل المشاركة","one":"يعدّل المشاركة","two":"يعدّلان المشاركة","few":"يعدّلون المشاركة","many":"يعدّلون المشاركة","other":"يعدّلون المشاركة"},"replying_to_topic":{"zero":"يكتب ردًا","one":"يكتب ردًا","two":"يكتبان ردًا","few":"يكتبون ردًا","many":"يكتبون ردًا","other":"يكتبون ردًا"}},"poll":{"voters":{"zero":"ناخب","one":"ناخب واحد","two":"ناخبان","few":"ناخبين","many":"ناخبًا","other":"ناخب"},"total_votes":{"zero":"صوت إجمالي","one":"صوت واحد إجمالي","two":"صوتان إجماليان","few":"أصوات إجمالية","many":"صوتًا إجماليًا","other":"صوت إجمالي"},"average_rating":"متوسط التقييمات: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"تكون الأصوات \u003cstrong\u003eمرئية للعامة\u003c/strong\u003e."},"results":{"groups":{"title":"عليك أن تكون عضوًا في %{groups} للتصويت على استطلاع الرأي هذا."},"vote":{"title":"ستظهر النتائج بعد \u003cstrong\u003eالتصويت\u003c/strong\u003e."},"closed":{"title":"ستظهر النتائج بعد \u003cstrong\u003eإغلاق الاستطلاع\u003c/strong\u003e."},"staff":{"title":"تظهر النتائج لأعضاء \u003cstrong\u003eفريق العمل\u003c/strong\u003e فقط."}},"multiple":{"help":{"at_least_min_options":{"zero":"حدِّد \u003cstrong\u003e%{count} \u003c/strong\u003e خيار على الأقل.","one":"حدِّد خيارًا واحدًا (\u003cstrong\u003e%{count} \u003c/strong\u003e) على الأقل.","two":"حدِّد خيارَين (\u003cstrong\u003e%{count} \u003c/strong\u003e) على الأقل.","few":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيارات على الأقل.","many":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيارًا على الأقل.","other":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيار على الأقل."},"up_to_max_options":{"zero":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيار كحد أقصى.","one":"حدِّد خيارًا واحدًا (\u003cstrong\u003e%{count}\u003c/strong\u003e) كحد أقصى.","two":"حدِّد خيارَين (\u003cstrong\u003e%{count}\u003c/strong\u003e) كحد أقصى.","few":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيارات كحد أقصى.","many":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيارًا كحد أقصى.","other":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيار كحد أقصى."},"x_options":{"zero":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيار.","one":"حدِّد خيارًا واحدًا (\u003cstrong\u003e%{count}\u003c/strong\u003e).","two":"حدِّد خيارَين (\u003cstrong\u003e%{count}\u003c/strong\u003e).","few":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيارات.","many":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيارًا.","other":"حدِّد \u003cstrong\u003e%{count}\u003c/strong\u003e خيار."},"between_min_and_max_options":"حدِّد من بين \u003cstrong\u003e%{min} \u003c/strong\u003e إلى \u003cstrong\u003e%{max} \u003c/strong\u003e خيار."}},"cast-votes":{"title":"الإدلاء بصوتك","label":"صوِّت اﻵن!"},"show-results":{"title":"عرض نتائج استطلاع الرأي","label":"عرض النتائج"},"hide-results":{"title":"العودة إلى تصويتاتك","label":"إظهار التصويت"},"group-results":{"title":"تجميع الأصوات حسب حقل المستخدم","label":"عرض التفاصيل"},"export-results":{"title":"تصدير نتائج الاستطلاع","label":"تصدير"},"open":{"title":"فتح استطلاع الرأي","label":"فتح","confirm":"هل تريد بالتأكيد فتح استطلاع الرأي هذا؟"},"close":{"title":"إغلاق الاستطلاع","label":"إغلاق","confirm":"هل تريد بالتأكيد إغلاق استطلاع الرأي هذا؟"},"automatic_close":{"closes_in":"سيتم الإغلاق بعد \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"تم الإغلاق منذ \u003cstrong\u003e%{age}\u003c/strong\u003e."},"breakdown":{"title":"نتائج استطلاع الرأي","votes":"%{count} صوت","breakdown":"التفاصيل","percentage":"النسبة المئوية","count":"العدد"},"error_while_toggling_status":"عذرًا، حدث خطأ أدى إلى تبديل حالة استطلاع الرأي هذا.","error_while_casting_votes":"عذرًا، حدث خطأ في الإدلاء بأصواتك.","error_while_fetching_voters":"عذرًا، حدث خطأ في عرض الناخبين.","error_while_exporting_results":"عذرًا، حدث خطأ في أثناء تصدير نتائج استطلاع الرأي هذا.","ui_builder":{"title":"إنشاء استطلاع رأي","insert":"إدراج استطلاع رأي","help":{"options_min_count":"يُرجى إدخال {1} خيار على الأقل.","options_max_count":"أدخِل %{count} خيار على الأكثر.","invalid_min_value":"يجب أن تكون أدنى قيمة هي 1 على الأقل.","invalid_max_value":"يجب أن تكون أقصى قيمة هي 1 على الأقل، لكنها أقل من أو تساوي عدد الخيارات.","invalid_values":"يجب أن يكون الحد الأدنى للقيمة أصغر من الحد الأقصى للقيمة.","min_step_value":"الحد الأدنى لقيمة المسافة هو 1"},"poll_type":{"label":"النوع","regular":"اختيار فردي","multiple":"اختيارات متعددة","number":"التقييم بالأرقام"},"poll_result":{"label":"عرض النتائج...","always":"مرئية دائمًا","vote":"بعد التصويت فقط","closed":"عند إغلاق الاستطلاع","staff":"لفريق العمل فقط"},"poll_groups":{"label":"تقييد التصويت على هذه المجموعات"},"poll_chart_type":{"label":"مخطط النتيجة","bar":"شريط","pie":"دائرة"},"poll_config":{"max":"الحد الأقصى للخيارات","min":"الحد الأدنى للخيارات","step":"المسافة"},"poll_public":{"label":"عرض أسماء المصوِّتين"},"poll_title":{"label":"العنوان (اختياري)"},"poll_options":{"label":"الخيارات (واحد لكل سطر)","add":"إضافة خيار"},"automatic_close":{"label":"إغلاق الاستطلاع تلقائيًا"},"show_advanced":"إظهار الخيارات المتقدمة","hide_advanced":"إخفاء الخيارات المتقدمة"}},"styleguide":{"title":"دليل الأنماط","welcome":"اختر قسمًا من القائمة على اليمين لتبدأ.","categories":{"atoms":"الذرّات (Atoms)","molecules":"الجزئيات (Molecules)","organisms":"المخلوقات الحية (Organisms)"},"sections":{"typography":{"title":"أسلوب الطباعة","example":"مرحبًا بك في Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"حقول إدخال التاريخ/الوقت"},"font_scale":{"title":"نظام الخطوط"},"colors":{"title":"الألوان"},"icons":{"title":"الأيقونات","full_list":"طالِع قائمة أيقونات Font Awesome كاملةً"},"input_fields":{"title":"حقول الإدخال"},"buttons":{"title":"الأزرار"},"dropdowns":{"title":"القوائم المنسدلة"},"categories":{"title":"الفئات"},"bread_crumbs":{"title":"عناصر التنقّل التفصيلي"},"navigation":{"title":"التنقل"},"navigation_bar":{"title":"شريط التنقّل"},"navigation_stacked":{"title":"التنقّل الرأسي"},"categories_list":{"title":"قائمة الفئات"},"topic_link":{"title":"رابط الموضوع"},"topic_list_item":{"title":"العنصر في قائمة المواضيع"},"topic_statuses":{"title":"حالات المواضيع"},"topic_list":{"title":"قائمة المواضيع"},"basic_topic_list":{"title":"قائمة الموضوعات الأساسية"},"footer_message":{"title":"رسالة التذييل"},"signup_cta":{"title":"عبارة الحث على الاشتراك"},"topic_timer_info":{"title":"مؤقّتات المواضيع"},"topic_footer_buttons":{"title":"أزرار تذييل الموضوع"},"topic_notifications":{"title":"إشعارات الموضوعات"},"post":{"title":"المنشور"},"topic_map":{"title":"خريطة الموضوع"},"site_header":{"title":"رأس الموقع"},"suggested_topics":{"title":"الموضوعات المقترحة"},"post_menu":{"title":"قائمة المشاركة"},"modal":{"title":"النافذة المشروطة","header":"العنوان المشروط","footer":"التذييل المشروط"},"user_about":{"title":"مربع \"نبذة عن المستخدم\""},"header_icons":{"title":"أيقونات الترويسة"},"spinners":{"title":"المُنزلقات"}}}}},"en":{"js":{"topic_count_unseen":{"one":"See %{count} new or updated topic","other":"See %{count} new or updated topics"},"groups":{"members":{"no_filter_matches":"No members match that search."}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"no_bookmarks_search":"No bookmarks found with the provided search query.","messages":{"all":"all inboxes","personal":"Personal","latest":"Latest","unread":"Unread","new":"New"},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}}},"create_account":{"associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"topics":{"bulk":{"change_category":"Set Category...","notification_level":"Notifications..."},"none":{"unseen":"You have no unseen topics."},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."}},"post":{"controls":{"change_owner":"Change Ownership...","grant_badge":"Grant Badge...","add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice..."}},"history_capped_revisions":"History, last 100 revisions","filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"}},"tagging":{"topics":{"none":{"unseen":"You have no unseen topics."}}},"chat_integration":{"channel_exception":"An unknown error occured when a message was last sent to this channel.","group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","create_rule":"Create Rule","create_channel":"Create Channel","channel_delete_confirm":"Are you sure you want to delete this channel? All associated rules will be deleted.","test_modal":{"send":"Send Test Message","error":"An unknown error occured while sending the message. Check the site logs for more information."},"type":{"group_message":"Group Message","group_mention":"Group Mention"},"filter":{"watch":"All posts and replies","thread":"All posts with threaded replies"},"edit_channel_modal":{"provider":"Provider","channel_validation":{"ok":"Valid","fail":"Invalid format"}},"edit_rule_modal":{"title":"Edit Rule","save":"Save Rule","provider":"Provider","instructions":{"type":"Change the type to trigger notifications for group messages or mentions","filter":"Notification level. Mute overrides other matching rules","category":"This rule will only apply to topics in the specified category","group":"This rule will apply to posts referencing this group","tags":"If specified, this rule will only apply to topics which have at least one of these tags"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"help":"e.g. #channel, @username."}},"errors":{"action_prohibited":"The bot does not have permission to post to that channel","channel_not_found":"The specified channel does not exist on slack"}},"telegram":{"title":"Telegram","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Telegram."},"chat_id":{"title":"Chat ID","help":"A number given to you by the bot, or a broadcast channel identifier in the form @channelname"}},"errors":{"channel_not_found":"The specified channel does not exist on Telegram","forbidden":"The bot does not have permission to post to this channel"}},"discord":{"title":"Discord","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Discord."},"webhook_url":{"title":"Webhook URL","help":"The webhook URL created in your Discord server settings"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"help":"e.g. #channel, @username."}},"errors":{"channel_not_found":"The specified channel does not exist on Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Matrix."},"room_id":{"title":"Room ID","help":"The 'private identifier' for the room. It should look something like !abcdefg:matrix.org"}},"errors":{"unknown_token":"Access token is invalid","unknown_room":"Room ID is invalid"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"The name of the Zulip stream the message should be sent to. e.g. 'general'"},"subject":{"help":"The subject that these messages sent by the bot should be given"}},"errors":{"does_not_exist":"That stream does not exist on Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"help":"e.g. #channel, @username."}},"errors":{"invalid_channel":"That channel does not exist on Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"help":"A Gitter room's name e.g. gitterHQ/services."},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new integration in a Gitter room."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow Token","help":"The flow token provided after creating a source for a flow into which you want to send messages."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Name","help":"A name for the channel (only shown in the Discourse admin interface)"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new webhook"}}}}},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"}}}};
I18n.locale = 'ar';
I18n.pluralizationRules.ar = MessageFormat.locale.ar;
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
//! locale : Arabic [ar]
//! author : Abdel Said: https://github.com/abdelsaid
//! author : Ahmed Elkhatib
//! author : forabi https://github.com/forabi

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var symbolMap = {
            1: '١',
            2: '٢',
            3: '٣',
            4: '٤',
            5: '٥',
            6: '٦',
            7: '٧',
            8: '٨',
            9: '٩',
            0: '٠',
        },
        numberMap = {
            '١': '1',
            '٢': '2',
            '٣': '3',
            '٤': '4',
            '٥': '5',
            '٦': '6',
            '٧': '7',
            '٨': '8',
            '٩': '9',
            '٠': '0',
        },
        pluralForm = function (n) {
            return n === 0
                ? 0
                : n === 1
                ? 1
                : n === 2
                ? 2
                : n % 100 >= 3 && n % 100 <= 10
                ? 3
                : n % 100 >= 11
                ? 4
                : 5;
        },
        plurals = {
            s: [
                'أقل من ثانية',
                'ثانية واحدة',
                ['ثانيتان', 'ثانيتين'],
                '%d ثوان',
                '%d ثانية',
                '%d ثانية',
            ],
            m: [
                'أقل من دقيقة',
                'دقيقة واحدة',
                ['دقيقتان', 'دقيقتين'],
                '%d دقائق',
                '%d دقيقة',
                '%d دقيقة',
            ],
            h: [
                'أقل من ساعة',
                'ساعة واحدة',
                ['ساعتان', 'ساعتين'],
                '%d ساعات',
                '%d ساعة',
                '%d ساعة',
            ],
            d: [
                'أقل من يوم',
                'يوم واحد',
                ['يومان', 'يومين'],
                '%d أيام',
                '%d يومًا',
                '%d يوم',
            ],
            M: [
                'أقل من شهر',
                'شهر واحد',
                ['شهران', 'شهرين'],
                '%d أشهر',
                '%d شهرا',
                '%d شهر',
            ],
            y: [
                'أقل من عام',
                'عام واحد',
                ['عامان', 'عامين'],
                '%d أعوام',
                '%d عامًا',
                '%d عام',
            ],
        },
        pluralize = function (u) {
            return function (number, withoutSuffix, string, isFuture) {
                var f = pluralForm(number),
                    str = plurals[u][pluralForm(number)];
                if (f === 2) {
                    str = str[withoutSuffix ? 0 : 1];
                }
                return str.replace(/%d/i, number);
            };
        },
        months = [
            'يناير',
            'فبراير',
            'مارس',
            'أبريل',
            'مايو',
            'يونيو',
            'يوليو',
            'أغسطس',
            'سبتمبر',
            'أكتوبر',
            'نوفمبر',
            'ديسمبر',
        ];

    var ar = moment.defineLocale('ar', {
        months: months,
        monthsShort: months,
        weekdays: 'الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت'.split('_'),
        weekdaysShort: 'أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت'.split('_'),
        weekdaysMin: 'ح_ن_ث_ر_خ_ج_س'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'D/\u200FM/\u200FYYYY',
            LL: 'D MMMM YYYY',
            LLL: 'D MMMM YYYY HH:mm',
            LLLL: 'dddd D MMMM YYYY HH:mm',
        },
        meridiemParse: /ص|م/,
        isPM: function (input) {
            return 'م' === input;
        },
        meridiem: function (hour, minute, isLower) {
            if (hour < 12) {
                return 'ص';
            } else {
                return 'م';
            }
        },
        calendar: {
            sameDay: '[اليوم عند الساعة] LT',
            nextDay: '[غدًا عند الساعة] LT',
            nextWeek: 'dddd [عند الساعة] LT',
            lastDay: '[أمس عند الساعة] LT',
            lastWeek: 'dddd [عند الساعة] LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: 'بعد %s',
            past: 'منذ %s',
            s: pluralize('s'),
            ss: pluralize('s'),
            m: pluralize('m'),
            mm: pluralize('m'),
            h: pluralize('h'),
            hh: pluralize('h'),
            d: pluralize('d'),
            dd: pluralize('d'),
            M: pluralize('M'),
            MM: pluralize('M'),
            y: pluralize('y'),
            yy: pluralize('y'),
        },
        preparse: function (string) {
            return string
                .replace(/[١٢٣٤٥٦٧٨٩٠]/g, function (match) {
                    return numberMap[match];
                })
                .replace(/،/g, ',');
        },
        postformat: function (string) {
            return string
                .replace(/\d/g, function (match) {
                    return symbolMap[match];
                })
                .replace(/,/g, '،');
        },
        week: {
            dow: 6, // Saturday is the first day of the week.
            doy: 12, // The week that contains Jan 12th is the first week of the year.
        },
    });

    return ar;

})));

// moment-timezone-localization for lang code: ar

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"أبيدجان","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"أكرا","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"أديس أبابا","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"الجزائر","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"أسمرة","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"باماكو","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"بانغوي","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"بانجول","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"بيساو","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"بلانتاير","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"برازافيل","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"بوجومبورا","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"القاهرة","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"الدار البيضاء","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"سيتا","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"كوناكري","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"داكار","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"دار السلام","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"جيبوتي","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"دوالا","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"العيون","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"فري تاون","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"غابورون","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"هراري","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"جوهانسبرغ","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"جوبا","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"كامبالا","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"الخرطوم","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"كيغالي","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"كينشاسا","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"لاغوس","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"ليبرفيل","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"لومي","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"لواندا","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"لومبباشا","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"لوساكا","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"مالابو","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"مابوتو","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"ماسيرو","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"مباباني","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"مقديشيو","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"مونروفيا","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"نيروبي","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"نجامينا","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"نيامي","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"نواكشوط","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"واغادوغو","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"بورتو نوفو","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"ساو تومي","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"طرابلس","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"تونس","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"ويندهوك","id":"Africa/Windhoek"},{"value":"America/Adak","name":"أداك","id":"America/Adak"},{"value":"America/Anchorage","name":"أنشوراج","id":"America/Anchorage"},{"value":"America/Anguilla","name":"أنغويلا","id":"America/Anguilla"},{"value":"America/Antigua","name":"أنتيغوا","id":"America/Antigua"},{"value":"America/Araguaina","name":"أروجوانيا","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"لا ريوجا","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"ريو جالييوس","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"سالطا","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"سان خوان","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"سان لويس","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"تاكمان","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"أشوا","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"أروبا","id":"America/Aruba"},{"value":"America/Asuncion","name":"أسونسيون","id":"America/Asuncion"},{"value":"America/Bahia","name":"باهيا","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"باهيا بانديراس","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"بربادوس","id":"America/Barbados"},{"value":"America/Belem","name":"بلم","id":"America/Belem"},{"value":"America/Belize","name":"بليز","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"بلانك-سابلون","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"باو فيستا","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"بوغوتا","id":"America/Bogota"},{"value":"America/Boise","name":"بويس","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"بوينوس أيرس","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"كامبرديج باي","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"كومبو جراند","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"كانكون","id":"America/Cancun"},{"value":"America/Caracas","name":"كاراكاس","id":"America/Caracas"},{"value":"America/Catamarca","name":"كاتاماركا","id":"America/Catamarca"},{"value":"America/Cayenne","name":"كايين","id":"America/Cayenne"},{"value":"America/Cayman","name":"كايمان","id":"America/Cayman"},{"value":"America/Chicago","name":"شيكاغو","id":"America/Chicago"},{"value":"America/Chihuahua","name":"تشيواوا","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"كورال هاربر","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"كوردوبا","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"كوستاريكا","id":"America/Costa_Rica"},{"value":"America/Creston","name":"كريستون","id":"America/Creston"},{"value":"America/Cuiaba","name":"كيابا","id":"America/Cuiaba"},{"value":"America/Curacao","name":"كوراساو","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"دانمرك شافن","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"داوسان","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"داوسن كريك","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"دنفر","id":"America/Denver"},{"value":"America/Detroit","name":"ديترويت","id":"America/Detroit"},{"value":"America/Dominica","name":"دومينيكا","id":"America/Dominica"},{"value":"America/Edmonton","name":"ايدمونتون","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"ايرونبي","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"السلفادور","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"فورت نيلسون","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"فورتاليزا","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"جلاس باي","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"غودثاب","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"جوس باي","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"غراند ترك","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"غرينادا","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"غوادلوب","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"غواتيمالا","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"غواياكويل","id":"America/Guayaquil"},{"value":"America/Guyana","name":"غيانا","id":"America/Guyana"},{"value":"America/Halifax","name":"هاليفاكس","id":"America/Halifax"},{"value":"America/Havana","name":"هافانا","id":"America/Havana"},{"value":"America/Hermosillo","name":"هيرموسيلو","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"كونكس","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"مارنجو","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"بيترسبرغ","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"مدينة تل، إنديانا","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"فيفاي","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"فينسينس","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"ويناماك","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"إنديانابوليس","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"اينوفيك","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"اكويلت","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"جامايكا","id":"America/Jamaica"},{"value":"America/Jujuy","name":"جوجو","id":"America/Jujuy"},{"value":"America/Juneau","name":"جوني","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"مونتيسيلو","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"كرالنديك","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"لا باز","id":"America/La_Paz"},{"value":"America/Lima","name":"ليما","id":"America/Lima"},{"value":"America/Los_Angeles","name":"لوس انجلوس","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"لويس فيل","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"حي الأمير السفلي","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"ماشيو","id":"America/Maceio"},{"value":"America/Managua","name":"ماناغوا","id":"America/Managua"},{"value":"America/Manaus","name":"ماناوس","id":"America/Manaus"},{"value":"America/Marigot","name":"ماريغوت","id":"America/Marigot"},{"value":"America/Martinique","name":"المارتينيك","id":"America/Martinique"},{"value":"America/Matamoros","name":"ماتاموروس","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"مازاتلان","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"ميندوزا","id":"America/Mendoza"},{"value":"America/Menominee","name":"مينوميني","id":"America/Menominee"},{"value":"America/Merida","name":"ميريدا","id":"America/Merida"},{"value":"America/Metlakatla","name":"ميتلاكاتلا","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"مكسيكو سيتي","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"مكويلون","id":"America/Miquelon"},{"value":"America/Moncton","name":"وينكتون","id":"America/Moncton"},{"value":"America/Monterrey","name":"مونتيري","id":"America/Monterrey"},{"value":"America/Montevideo","name":"مونتفيديو","id":"America/Montevideo"},{"value":"America/Montserrat","name":"مونتسيرات","id":"America/Montserrat"},{"value":"America/Nassau","name":"ناسو","id":"America/Nassau"},{"value":"America/New_York","name":"نيويورك","id":"America/New_York"},{"value":"America/Nipigon","name":"نيبيجون","id":"America/Nipigon"},{"value":"America/Nome","name":"نوم","id":"America/Nome"},{"value":"America/Noronha","name":"نوروناه","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"بيولا، داكوتا الشمالية","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"سنتر","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"نيو ساليم","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"أوجيناجا","id":"America/Ojinaga"},{"value":"America/Panama","name":"بنما","id":"America/Panama"},{"value":"America/Pangnirtung","name":"بانجينتينج","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"باراماريبو","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"فينكس","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"بورت أو برنس","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"بورت أوف سبين","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"بورتو فيلو","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"بورتوريكو","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"بونتا أريناز","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"راني ريفر","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"رانكن انلت","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"ريسيف","id":"America/Recife"},{"value":"America/Regina","name":"ريجينا","id":"America/Regina"},{"value":"America/Resolute","name":"ريزولوت","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"ريوبرانكو","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"سانتا إيزابيل","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"سانتاريم","id":"America/Santarem"},{"value":"America/Santiago","name":"سانتياغو","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"سانتو دومينغو","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"ساو باولو","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"سكورسبيسند","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"سيتكا","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"سانت بارتيليمي","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"سانت جونس","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"سانت كيتس","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"سانت لوشيا","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"سانت توماس","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"سانت فنسنت","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"سوفت كارنت","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"تيغوسيغالبا","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"ثيل","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"ثندر باي","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"تيخوانا","id":"America/Tijuana"},{"value":"America/Toronto","name":"تورونتو","id":"America/Toronto"},{"value":"America/Tortola","name":"تورتولا","id":"America/Tortola"},{"value":"America/Vancouver","name":"فانكوفر","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"وايت هورس","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"وينيبيج","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"ياكوتات","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"يلونيف","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"كاساي","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"دافيز","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"دي مونت دو روفيل","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"ماكواري","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"ماوسون","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"ماك موردو","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"بالمير","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"روثيرا","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"سايووا","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"ترول","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"فوستوك","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"لونجيربين","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"عدن","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"ألماتي","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"عمان","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"أندير","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"أكتاو","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"أكتوب","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"عشق آباد","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"أتيراو","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"بغداد","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"البحرين","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"باكو","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"بانكوك","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"بارناول","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"بيروت","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"بشكيك","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"بروناي","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"كالكتا","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"تشيتا","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"تشوبالسان","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"كولومبو","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"دمشق","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"دكا","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"ديلي","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"دبي","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"دوشانبي","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"فاماغوستا","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"غزة","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"هيبرون (مدينة الخليل)","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"هونغ كونغ","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"هوفد","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"ايركيتسك","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"جاكرتا","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"جايابيورا","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"القدس","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"كابول","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"كامتشاتكا","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"كراتشي","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"كاتماندو","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"خانديجا","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"كراسنويارسك","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"كوالا لامبور","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"كيشينج","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"الكويت","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"ماكاو","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"مجادن","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"ماكسار","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"مانيلا","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"مسقط","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"نيقوسيا","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"نوفوكوزنتسك","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"نوفوسبيرسك","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"أومسك","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"أورال","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"بنوم بنه","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"بونتيانك","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"بيونغ يانغ","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"قطر","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"كيزيلوردا","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"رانغون","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"الرياض","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"مدينة هو تشي منة","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"سكالين","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"سمرقند","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"سول","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"شنغهاي","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"سنغافورة","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"سريدنكوليمسك","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"تايبيه","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"طشقند","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"تبليسي","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"طهران","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"تيمفو","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"طوكيو","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"تومسك","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"آلانباتار","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"أرومكي","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"أوست نيرا","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"فيانتيان","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"فلاديفوستك","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"ياكتسك","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"يكاترنبيرج","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"يريفان","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"أزورس","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"برمودا","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"كناري","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"الرأس الأخضر","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"فارو","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"ماديرا","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"ريكيافيك","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"جورجيا الجنوبية","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"سانت هيلينا","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"استانلي","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"أديليد","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"برسيبان","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"بروكن هيل","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"كوري","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"دارون","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"أوكلا","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"هوبارت","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"ليندمان","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"لورد هاو","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"ميلبورن","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"برثا","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"سيدني","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"التوقيت العالمي المنسق","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"أمستردام","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"أندورا","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"أستراخان","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"أثينا","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"بلغراد","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"برلين","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"براتيسلافا","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"بروكسل","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"بوخارست","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"بودابست","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"بوسنغن","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"تشيسيناو","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"كوبنهاغن","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"توقيت أيرلندا الرسميدبلن","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"جبل طارق","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"غيرنزي","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"هلسنكي","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"جزيرة مان","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"إسطنبول","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"جيرسي","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"كالينجراد","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"كييف","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"كيروف","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"لشبونة","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"ليوبليانا","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"توقيت بريطانيا الصيفيلندن","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"لوكسمبورغ","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"مدريد","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"مالطة","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"ماريهامن","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"مينسك","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"موناكو","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"موسكو","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"أوسلو","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"باريس","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"بودغوريكا","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"براغ","id":"Europe/Prague"},{"value":"Europe/Riga","name":"ريغا","id":"Europe/Riga"},{"value":"Europe/Rome","name":"روما","id":"Europe/Rome"},{"value":"Europe/Samara","name":"سمراء","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"سان مارينو","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"سراييفو","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"ساراتوف","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"سيمفروبول","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"سكوبي","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"صوفيا","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"ستوكهولم","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"تالين","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"تيرانا","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"أوليانوفسك","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"أوزجرود","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"فادوز","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"الفاتيكان","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"فيينا","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"فيلنيوس","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"فولوجراد","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"وارسو","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"زغرب","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"زابوروزي","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"زيورخ","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"أنتاناناريفو","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"تشاغوس","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"كريسماس","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"كوكوس","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"جزر القمر","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"كيرغويلين","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"ماهي","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"المالديف","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"موريشيوس","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"مايوت","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"ريونيون","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"أبيا","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"أوكلاند","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"بوغانفيل","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"تشاثام","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"استر","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"إيفات","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"اندربيرج","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"فاكاوفو","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"فيجي","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"فونافوتي","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"جلاباجوس","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"جامبير","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"غوادالكانال","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"غوام","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"هونولولو","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"جونستون","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"كيريتي ماتي","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"كوسرا","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"كواجالين","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"ماجورو","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"ماركيساس","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"ميدواي","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"ناورو","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"نيوي","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"نورفولك","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"نوميا","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"باغو باغو","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"بالاو","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"بيتكيرن","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"باناب","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"بور مورسبي","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"راروتونغا","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"سايبان","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"تاهيتي","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"تاراوا","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"تونغاتابو","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"ترك","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"واك","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"واليس","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

// original moment.js implementation can be found here:
// https://github.com/moment/moment/blob/b7ec8e2ec068e03de4f832f28362675bb9e02261/locale/ar.js#L185-L191
moment.updateLocale("ar", {
  postformat(string) {
    return string;
  }
});

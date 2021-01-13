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
r += "لنبدأ المناقشة <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">!</a> هناك ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "هو <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> الموضوع";
return r;
},
"two" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " و ";
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
})() + "</strong> آخر";
return r;
},
"two" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". يحتاج الزوار إلى المزيد من القراءة والرد عليها - نوصي على الأقل ";
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
})() + "</strong> الموضوع";
return r;
},
"two" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> موضوعا";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " و ";
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
})() + "</strong> آخر";
return r;
},
"two" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> وظيفة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". فقط الموظفين يمكنهم رؤية هذه الرسالة.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "هيًا بنا <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">لنبدأ نقاشًا!</a> هناك حاليًا ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "موضوع <strong>واحد</strong>";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعين <strong>اثنين</strong>";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مواضيع";
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
r += ". يحتاج الزوّار إلى أكثر لقراءته والردّ عليه، ولذلك ننصح بوجود ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "موضوع <strong>واحد</strong>";
return r;
},
"two" : function(d){
var r = "";
r += "موضوعين <strong>اثنين</strong>";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مواضيع";
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
r += " على الأقل. يرى طاقم الموقع فقط هذه الرسالة.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "هيًا بنا <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">لنبدأ نقاشًا!</a> هناك حاليًا ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"zero" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "مشاركة <strong>واحدة</strong>";
return r;
},
"two" : function(d){
var r = "";
r += "مشاركتين <strong>اثنتين</strong>";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مشاركات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مشاركةً";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مشاركة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". يحتاج الزوّار إلى أكثر لقراءتها والردّ عليها، ولذلك ننصح بوجود ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "مشاركة <strong>واحدة</strong>";
return r;
},
"two" : function(d){
var r = "";
r += "مشاركتين <strong>اثنتين</strong>";
return r;
},
"few" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مشاركات";
return r;
},
"many" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مشاركةً";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> مشاركة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " على الأقل. يرى طاقم الموقع فقط هذه الرسالة.";
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
"zero" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ / ساعة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> وصلت إلى حد إعداد الموقع ";
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
})() + " خطأ / ساعة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
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
"zero" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ / دقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> وصلت إلى حد إعداد الموقع ";
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
})() + " خطأ / دقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
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
"zero" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ / ساعة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> تجاوز حد إعداد الموقع ";
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
})() + " خطأ / ساعة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / ساعة";
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
"zero" : function(d){
var r = "";
return r;
},
"one" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " خطأ / دقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> تجاوز حد إعداد الموقع ";
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
})() + " خطأ / دقيقة";
return r;
},
"two" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"few" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " أخطاء / دقيقة";
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
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ar"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
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

I18n.translations = {"ar":{"js":{"number":{"format":{"separator":"٫","delimiter":"٬"},"human":{"storage_units":{"format":"‏%n ‏%u","units":{"byte":{"zero":"بايت","one":"بايت","two":"بايت","few":"بايت","many":"بايت","other":"بايت"},"gb":"غ.بايت","kb":"ك.بايت","mb":"م.بايت","tb":"ت.بايت"}}},"short":{"thousands":"%{number} ألف","millions":"%{number} مليون"}},"dates":{"time":"h:mm ‏a","time_with_zone":"h:mm ‏a ‏(z)","time_short_day":"dddd، ‏h:mm ‏a","timeline_date":"MMMM ‏YYYY","long_no_year":"D ‏MMMM، ‏h:mm ‏a","long_no_year_no_time":"D ‏MMMM","full_no_year_no_time":"D ‏MMMM","long_with_year":"D ‏MMMM ‏YYYY ‏h:mm ‏a","long_with_year_no_time":"D ‏MMMM ‏YYYY","full_with_year_no_time":"D ‏MMMM ‏YYYY","long_date_with_year":"D ‏MMMM ‏YYYY ‏h:mm ‏a","long_date_without_year":"D ‏MMMM ‏h:mm ‏a","long_date_with_year_without_time":"D ‏MMMM ‏YYYY","long_date_without_year_with_linebreak":"D ‏MMMM\u003cbr/\u003e‏h:mm ‏a","long_date_with_year_with_linebreak":"D ‏MMMM ‏YYYY\u003cbr/\u003e‏h:mm ‏a","wrap_ago":"منذ %{date}","tiny":{"half_a_minute":"\u003c 1دق","less_than_x_seconds":{"zero":"\u003c %{count}ثا","one":"\u003c %{count}ثا","two":"\u003c %{count}ثا","few":"\u003c %{count}ثا","many":"\u003c %{count}ثا","other":"\u003c %{count}ثا"},"x_seconds":{"zero":"%{count}ثا","one":"%{count}ثا","two":"%{count}ثا","few":"%{count}ثا","many":"%{count}ثا","other":"%{count}ثا"},"less_than_x_minutes":{"zero":"\u003c %{count}دق","one":"\u003c %{count}دق","two":"\u003c %{count}دق","few":"\u003c %{count}دق","many":"\u003c %{count}دق","other":"\u003c %{count}دق"},"x_minutes":{"zero":"%{count}دق","one":"%{count}دق","two":"%{count}دق","few":"%{count}دق","many":"%{count}دق","other":"%{count}دق"},"about_x_hours":{"zero":"%{count}سا","one":"%{count}سا","two":"%{count}سا","few":"%{count}سا","many":"%{count}سا","other":"%{count}سا"},"x_days":{"zero":"%{count}يوم","one":"%{count}يوم","two":"%{count}يوم","few":"%{count}يوم","many":"%{count}يوم","other":"%{count}يوم"},"x_months":{"zero":"%{count}شهر","one":"%{count}شهر","two":"%{count}شهر","few":"%{count}شهر","many":"%{count}شهر","other":"%{count}شهر"},"about_x_years":{"zero":"%{count}سنة","one":"%{count}سنة","two":"%{count}سنة","few":"%{count}سنة","many":"%{count}سنة","other":"%{count}سنة"},"over_x_years":{"zero":"\u003e %{count}سنة","one":"\u003e %{count}سنة","two":"\u003e %{count}سنة","few":"\u003e %{count}سنة","many":"\u003e %{count}سنة","other":"\u003e %{count}سنة"},"almost_x_years":{"zero":"%{count}سنة","one":"%{count}سنة","two":"%{count}سنة","few":"%{count}سنة","many":"%{count}سنة","other":"%{count}سنة"},"date_month":"D ‏MMMM","date_year":"MMMM ‏YYYY"},"medium":{"x_minutes":{"zero":"أقلّ من دقيقة","one":"دقيقة واحدة","two":"دقيقتان","few":"%{count} دقائق","many":"%{count} دقيقة","other":"%{count} دقيقة"},"x_hours":{"zero":"أقلّ من ساعة","one":"ساعة واحدة","two":"ساعتان","few":"%{count} ساعات","many":"%{count} ساعة","other":"%{count} ساعة"},"x_days":{"zero":"أقلّ من يوم","one":"يوم واحد","two":"يومان","few":"%{count} أيام","many":"%{count} يومًا","other":"%{count} يوم"},"date_year":"D ‏MMMM ‏YYYY"},"medium_with_ago":{"x_minutes":{"zero":"قبل أقلّ من دقيقة","one":"قبل دقيقة واحدة","two":"قبل دقيقتين","few":"قبل %{count} دقائق","many":"قبل %{count} دقيقة","other":"قبل %{count} دقيقة"},"x_hours":{"zero":"قبل أقلّ من ساعة","one":"قبل ساعة واحدة","two":"قبل ساعتين","few":"قبل %{count} ساعات","many":"قبل %{count} ساعة","other":"قبل %{count} ساعة"},"x_days":{"zero":"قبل أقلّ من يوم","one":"قبل يوم واحد","two":"قبل يومين","few":"قبل %{count} أيام","many":"قبل %{count} يومًا","other":"قبل %{count} يوم"},"x_months":{"zero":"قبل أقلّ من شهر","one":"قبل شهر واحد","two":"قبل شهرين","few":"قبل %{count} أشهر","many":"قبل %{count} شهرًا","other":"قبل %{count} شهر"},"x_years":{"zero":"قبل أقلّ من سنة","one":"قبل سنة واحدة","two":"قبل سنتين","few":"قبل %{count} سنوات","many":"قبل %{count} سنة","other":"قبل %{count} سنة"}},"later":{"x_days":{"zero":"بعد أقلّ من يوم","one":"بعد يوم واحد","two":"بعد يومين","few":"بعد %{count} أيام","many":"بعد %{count} يومًا","other":"بعد %{count} يوم"},"x_months":{"zero":"بعد أقلّ من شهر","one":"بعد شهر واحد","two":"بعد شهرين","few":"بعد %{count} أشهر","many":"بعد %{count} شهرًا","other":"بعد %{count} شهر"},"x_years":{"zero":"بعد أقلّ من سنة","one":"بعد سنة واحدة","two":"بعد سنتين","few":"بعد %{count} سنوات","many":"بعد %{count} سنة","other":"بعد %{count} سنة"}},"previous_month":"الشهر الماضي","next_month":"الشهر القادم","placeholder":"التاريخ"},"share":{"topic_html":"الموضوع: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"المشاركة رقم %{postNumber}","close":"أغلِق","twitter":"شارِك على تويتر","facebook":"شارِك على فيسبوك","email":"شارِك عبر البريد الإلكتروني","url":"انسخ العنوان وشارِكه"},"action_codes":{"public_topic":"ضبطَ الموضوع ليراه العموم %{when}","private_topic":"حوّل هذا الموضوع إلى رسالة شخصية %{when}","split_topic":"قسمَ هذا الموضوع %{when}","invited_user":"دعا %{who} ‏%{when}","invited_group":"دعا %{who} ‏%{when}","user_left":"أزال %{who} نفسه من هذه الرسالة %{when}","removed_user":"أزال %{who} ‏%{when}","removed_group":"أزال %{who} ‏%{when}","autobumped":"رُفع تلقائيًا %{when}","autoclosed":{"enabled":"أُغلق %{when}","disabled":"فُتح %{when}"},"closed":{"enabled":"أُغلق %{when}","disabled":"فُتح %{when}"},"archived":{"enabled":"أُرشف %{when}","disabled":"أُلغيت أرشفته %{when}"},"pinned":{"enabled":"ثُبّت %{when}","disabled":"ألغى تثبيته %{when}"},"pinned_globally":{"enabled":"ثبّته عموميًا %{when}","disabled":"ألغى تثبيته %{when}"},"visible":{"enabled":"أُدرج %{when}","disabled":"أُزال إدراجه %{when}"},"banner":{"enabled":"حوّل هذا الموضوع إلى إعلان %{when}. سيظهر أعلى كلّ صفحة حتّى يُزيله المستخدم.","disabled":"أزال هذا الإعلان %{when}. لن يظهر بعد الآن في أعلى كلّ صفحة."},"forwarded":"مرّر الرسالة الإلكترونية أعلاه"},"topic_admin_menu":"الإجراءات على الموضوع","wizard_required":"مرحبًا بك في دِسكورس! هيا بنا نبدأ من \u003ca href='%{url}' data-auto-route='true'\u003eمُرشد الإعداد\u003c/a\u003e ✨","emails_are_disabled":"عطّل أحد المدراء البريد الصادر على عموم الموقع. لن تُرسل أيّة إخطارات بريد أيًا كان نوعها.","bootstrap_mode_enabled":{"zero":"ضُبط الموقع على الوضع التمهيدي لتسهيل إطلاق موقعك الجديد. سيُمنح كلّ المستخدمين الجدد مستوى الثقة 1 كما وستُفعّل لهم رسائل الخُلاصة عبر البريد تلقائيًا. سيُلغى هذا الوضع تلقائيًا ما إن لا ينضمّ أيّ مستخدم.","one":"ضُبط الموقع على الوضع التمهيدي لتسهيل إطلاق موقعك الجديد. سيُمنح كلّ المستخدمين الجدد مستوى الثقة 1 كما وستُفعّل لهم رسائل الخُلاصة عبر البريد تلقائيًا. سيُلغى هذا الوضع تلقائيًا ما إن ينضمّ مستخدم واحد.","two":"ضُبط الموقع على الوضع التمهيدي لتسهيل إطلاق موقعك الجديد. سيُمنح كلّ المستخدمين الجدد مستوى الثقة 1 كما وستُفعّل لهم رسائل الخُلاصة عبر البريد تلقائيًا. سيُلغى هذا الوضع تلقائيًا ما إن ينضمّ مستخدمين.","few":"ضُبط الموقع على الوضع التمهيدي لتسهيل إطلاق موقعك الجديد. سيُمنح كلّ المستخدمين الجدد مستوى الثقة 1 كما وستُفعّل لهم رسائل الخُلاصة عبر البريد تلقائيًا. سيُلغى هذا الوضع تلقائيًا ما إن ينضمّ %{count} مستخدمين.","many":"ضُبط الموقع على الوضع التمهيدي لتسهيل إطلاق موقعك الجديد. سيُمنح كلّ المستخدمين الجدد مستوى الثقة 1 كما وستُفعّل لهم رسائل الخُلاصة عبر البريد تلقائيًا. سيُلغى هذا الوضع تلقائيًا ما إن ينضمّ %{count} مستخدمًا.","other":"ضُبط الموقع على الوضع التمهيدي لتسهيل إطلاق موقعك الجديد. سيُمنح كلّ المستخدمين الجدد مستوى الثقة 1 كما وستُفعّل لهم رسائل الخُلاصة عبر البريد تلقائيًا. سيُلغى هذا الوضع تلقائيًا ما إن ينضمّ %{count} مستخدم."},"bootstrap_mode_disabled":"سيتوقف الوضع التمهيدي خلال 24 ساعة.","themes":{"default_description":"المبدئي","broken_theme_alert":"قد لا يعمل الموقع كما ينبغي له إذ أنّ في السمة/المكوّن %{theme} أعطال. عطّله/عطّلها من %{path}."},"s3":{"regions":{"ap_northeast_1":"آسيا والمحيط الهادئ (طوكيو)","ap_northeast_2":"آسيا والمحيط الهادئ (سول)","ap_south_1":"آسيا والمحيط الهادئ (مومباي)","ap_southeast_1":"آسيا والمحيط الهادئ (سنغافورة)","ap_southeast_2":"آسيا والمحيط الهادئ (سِدني)","ca_central_1":"كندا (الوسطى)","cn_north_1":"الصين (بكّين)","cn_northwest_1":"الصين (نينغشيا)","eu_central_1":"الاتحاد الأوروبي (فرانكفورت)","eu_north_1":"الاتحاد الأوروبي (ستوكهولم)","eu_west_1":"الاتحاد الأوروبي (إيرلندا)","eu_west_2":"الاتحاد الأوروبي (لندن)","eu_west_3":"الاتحاد الأوروبي (باريس)","sa_east_1":"أمريكا الجنوبية (ساو باولو)","us_east_1":"شرق الولايات المتحدة (فرجينيا الشمالية)","us_east_2":"غرب الولايات المتحدة (أوهايو)","us_gov_east_1":"السحابة الحكومية من AWS ‏(US-East)","us_gov_west_1":"السحابة الحكومية من AWS ‏(US-West)","us_west_1":"غرب الولايات المتحدة (كاليفورنيا الشمالية)","us_west_2":"غرب الولايات المتحدة (أوريغون)"}},"edit":"عدّل عنوان هذا الموضوع وفئته","expand":"وسّع","not_implemented":"معذرةً، لم نُنجز هذه الميزة بعد.","no_value":"لا","yes_value":"نعم","submit":"أرسِل","generic_error":"معذرةً، حدث عُطل.","generic_error_with_reason":"حدث عُطل: %{error}","go_ahead":"انطلق","sign_up":"سجّل حسابًا","log_in":"لِج","age":"العمر","joined":"انضمّ","admin_title":"المدير","show_more":"اعرض المزيد","show_help":"خيارات","links":"روابط","links_lowercase":{"zero":"الروابط","one":"الروابط","two":"الروابط","few":"الروابط","many":"الروابط","other":"روابط"},"faq":"الأسئلة الشائعة","guidelines":"القواعد العامة","privacy_policy":"سياسة الخصوصية","privacy":"الخصوصية","tos":"شروط الخدمة","rules":"الشروط","conduct":"قواعد السلوك","mobile_view":"نسخة الهواتف","desktop_view":"نسخة الحواسيب","you":"انت","or":"أو","now":"منذ لحظات","read_more":"اطّلع على المزيد","more":"أكثر","less":"أقل","never":"أبدا","every_30_minutes":"كلّ 30 دقيقة","every_hour":"كلّ ساعة","daily":"يوميًا","weekly":"أسبوعيًا","every_month":"كلّ شهر","every_six_months":"كلّ ستة أشهر","max_of_count":"%{count} كحدّ أقصى","alternation":"أو","character_count":{"zero":"لا محارف","one":"محرف واحد","two":"محرفان","few":"%{count} محارف","many":"%{count} محرفًا","other":"%{count} محرف"},"related_messages":{"title":"الرسائل ذات الصلة","see_all":"طالِع \u003ca href=\"%{path}\"\u003eكلّ رسائل\u003c/a\u003e ⁨@%{username}⁩..."},"suggested_topics":{"title":"المواضيع المقترحة","pm_title":"الرسائل المقترحة"},"about":{"simple_title":"عنّا","title":"عن %{title}","stats":"إحصاءات الموقع","our_admins":"مُدراؤنا","our_moderators":"مُشرفونا","moderators":"المشرفون","stat":{"all_time":"منذ التأسيس","last_7_days":"آخر 7 أيام","last_30_days":"آخر 30 يومًا"},"like_count":"الإعجابات","topic_count":"المواضيع","post_count":"المشاركات","user_count":"المستخدمون","active_user_count":"المستخدمون النشطون","contact":"راسِلنا","contact_info":"في حال حدوث مشكلة حرجة أو أمر عاجل يؤثّر على الموقع، من فضلك راسلنا على %{contact_info}."},"bookmarked":{"title":"ضَع علامة","clear_bookmarks":"امسح العلامات","help":{"bookmark":"انقر لوضع علامة على أوّل مشاركة في هذا الموضوع","unbookmark":"انقر لإزالة كلّ العلامات في هذا الموضوع","unbookmark_with_reminder":"انقر لإزالة كلّ العلامات والتذكيرات في هذا الموضوع. ضبطت تذكيرًا %{reminder_at} لهذا الموضوع."}},"bookmarks":{"created":"وضعت علامة على هذه المشاركة. %{name}","not_bookmarked":"علّم هذه المشاركة","created_with_reminder":"وضعت علامة على هذه المشاركة وضبطت تذكيرًا %{date}. ‏%{name}","remove":"أزِل العلامة","delete":"احذف العلامة","confirm_delete":"أمتأكّد من حذف هذه العلامة؟ سيُحذف التذكير أيضًا.","confirm_clear":"أمتأكّد من مسح كلّ العلامات التي وضعتها في هذا الموضوع؟","save":"احفظ","no_timezone":"لم تُحدّد منطقتك الزمنية بعد. لن تقدر هكذا على ضبط التذكيرات. حدّد المنطقة \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eمن ملفك الشخصي\u003c/a\u003e.","invalid_custom_datetime":"التاريخ والوقت الذين كتبتهما غير صالحين، من فضلك أعِد المحاولة.","list_permission_denied":"لا تملك التصريح لعرض علامات هذا المستخدم.","no_user_bookmarks":"ما من مشاركات عليها علامة. تُتيح لك العلامات الرجوع إلى المشاركات التي تريد بسرعة.","auto_delete_preference":{"label":"احذفها تلقائيًا","never":"(لا تحذفها)","when_reminder_sent":"ما إن أضبط التذكير","on_owner_reply":"بعد أن أردّ على هذا الموضوع"},"search_placeholder":"ابحث في العلامات حسب الاسم أو عنوان الموضوع أو محتوى المشاركة","search":"البحث","reminders":{"later_today":"خلال هذا اليوم","next_business_day":"يوم العمل التالي","tomorrow":"غدًا","next_week":"الأسبوع القادم","post_local_date":"تاريخ المشاركة","later_this_week":"خلال هذا الأسبوع","start_of_next_business_week":"الاثنين","start_of_next_business_week_alt":"الاثنين القادم","next_month":"الشهر القادم","custom":"تاريخ ووقت مخصّصين","last_custom":"اخر","none":"لا حاجة للتذكير","today_with_time":"اليوم الساعة %{time}","tomorrow_with_time":"غدًا الساعة %{time}","at_time":"بتاريخ %{date_time}","existing_reminder":"ضبطت تذكيرًا لهذه العلامة يُرسل إليك %{at_date_time}"}},"copy_codeblock":{"copied":"نُسخ!"},"drafts":{"resume":"أكمل","remove":"أزِل","remove_confirmation":"أمتأكّد من حذف هذه المسودّة؟","new_topic":"مسودة موضوع جديد","new_private_message":"مسودّة رسالة خاصّة جديدة","topic_reply":"مسودة الرد","abandon":{"confirm":"فتحت مسودّة أخرى في هذا الموضوع فعلًا. أمتأكّد من رميها؟","yes_value":"نعم، لا أريدها","no_value":"لا، أبقِها"}},"topic_count_latest":{"zero":"ما من مواضيع جديدة أو محدّثة لمطالعتها","one":"طالِع الموضوع الجديد أو المحدّث","two":"طالِع الموضوعين الجديدين أو المحدّثين","few":"طالِع %{count} مواضيع جديدة أو محدّثة","many":"طالِع %{count} موضوعًا جديدًا أو محدّثًا","other":"طالِع %{count} موضوع جديد أو محدّث"},"topic_count_unread":{"zero":"ما من مواضيع غير مقروءة لمطالعتها","one":"طالِع الموضوع غير المقروء","two":"طالِع الموضوعين غير المقروءين","few":"طالِع %{count} مواضيع غير مقروءة","many":"طالِع %{count} موضوعًا غير مقروء","other":"طالِع %{count} موضوع غير مقروء"},"topic_count_new":{"zero":"ما من مواضيع جديدة لمطالعتها","one":"طالِع الموضوع الجديد","two":"طالِع الموضوعين الجديدين","few":"طالِع %{count} مواضيع جديدة","many":"طالِع %{count} موضوعًا جديدًا","other":"طالِع %{count} موضوع جديد"},"preview":"معاينة","cancel":"ألغِ","deleting":"يحذف...","save":"احفظ التعديلات","saving":"يحفظ...","saved":"حُفظت!","upload":"ارفع","uploading":"يرفع...","uploading_filename":"يرفع: %{filename}...","clipboard":"الحافظة","uploaded":"رُفع!","pasting":"يلصق...","enable":"فعّل","disable":"عطّل","continue":"واصِل","undo":"تراجَع","revert":"اعكس","failed":"فشل","switch_to_anon":"ادخل وضع التّخفي","switch_from_anon":"اخرج من وضع التّخفي","banner":{"close":"أزِل هذا الإعلان.","edit":"عدّل هذا الإعلان \u003e\u003e"},"pwa":{"install_banner":"أتريد \u003ca href\u003eتثبيت %{title} على هذا الجهاز؟\u003c/a\u003e"},"choose_topic":{"none_found":"لم نجد أيّ موضوع.","title":{"search":"ابحث عن موضوع","placeholder":"اكتب هنا اسم الموضوع أو عنوانه أو معرّفه"}},"choose_message":{"none_found":"لم نجد أيّ رسالة.","title":{"search":"ابحث عن رسالة","placeholder":"اكتب عنوان الرسالة أو عنوان URL أو المعرف هنا"}},"review":{"order_by":"افرز حسب","in_reply_to":"ردًا على","explain":{"why":"شرح سبب انتهاء هذا العنصر في قائمة الانتظار","title":"نقاط قابلة للمراجعة","formula":"صيغة","subtotal":"المجموع الفرعي","total":"مجموع","min_score_visibility":"الحد الأدنى من نقاط الرؤية","score_to_hide":"النتيجة لإخفاء المنشور","take_action_bonus":{"name":"اتخذ إجراء","title":"وعندما يختار الموظف اتخاذ إجراء ما، تمنح العَلَم مكافأة."},"user_accuracy_bonus":{"name":"دقة المستخدم","title":"ويحصل المستخدمون الذين تم الاتفاق على أعلامهم تاريخيا على مكافأة."},"trust_level_bonus":{"name":"مستوى الثقة","title":"العناصر القابلة للمراجعة التي تم إنشاؤها من قبل مستخدمي مستوى ثقة أعلى لديهم نتيجة أعلى."},"type_bonus":{"name":"نوع المكافأة","title":"يمكن تعيين مكافأة معينة من الأنواع القابلة للمراجعة من قبل الموظفين لجعلها أولوية أعلى."}},"claim_help":{"optional":"يمكنك المطالبة بهذا العنصر لمنع الآخرين من مراجعته.","required":"يجب عليك المطالبة بالعناصر قبل أن تتمكن من مراجعتها.","claimed_by_you":"لقد طالبت بهذا العنصر ويمكنك مراجعته.","claimed_by_other":"فقط \u003cb\u003e%{username}\u003c/b\u003e من يمكنه مراجعة هذا العنصر."},"claim":{"title":"المطالبة بهذا الموضوع"},"unclaim":{"help":"إزالة هذه المطالبة"},"awaiting_approval":"بأنتضار موافقة","delete":"أحذف","settings":{"saved":"تم حفظهُ","save_changes":"احفظ التعديلات","title":"إعدادات","priorities":{"title":"الأولويات القابلة للمراجعة"}},"moderation_history":"تاريخ الادارة","view_all":"اظهار الكل","grouped_by_topic":"مجمعة حسب الموضوع","none":"ما من عناصر لمراجعتها.","view_pending":"اعرض المُرجأ","topic_has_pending":{"zero":"ما من مشاركات تنتظر الموافقة في هذا الموضوع","one":"في هذا الموضوع مشاركة واحدة تنتظر الموافقة","two":"في هذا الموضوع مشاركتين تنتظرين الموافقة","few":"في هذا الموضوع \u003cb\u003e%{count}\u003c/b\u003e مشاركات تنتظر الموافقة","many":"في هذا الموضوع \u003cb\u003e%{count}\u003c/b\u003e مشاركة تنتظر الموافقة","other":"في هذا الموضوع \u003cb\u003e%{count}\u003c/b\u003e مشاركة تنتظر الموافقة"},"title":"مراجعة","topic":"الموضوع:","filtered_topic":"لقد تمت تصفيتها إلى محتوى قابل للمراجعة في موضوع واحد.","filtered_user":"مستخدم","filtered_reviewed_by":"راجَعها","show_all_topics":"اعرض كلّ المواضيع","deleted_post":"(حُذفت المشاركة)","deleted_user":"(حُذف المستخدم)","user":{"bio":"النبذة التعريفية","website":"موقع الوِب","username":"اسم المستخدم","email":"البريد الإلكتروني","name":"الاسم","fields":"الحقول"},"user_percentage":{"agreed":{"zero":"%{count}% مُوافق عليها","one":"%{count}% مُوافق عليها","two":"%{count}% مُوافق عليها","few":"%{count}% مُوافق عليها","many":"%{count}% مُوافق عليها","other":"%{count}% مُوافق عليها"},"disagreed":{"zero":"%{count}% مرفوضة","one":"%{count}% مرفوضة","two":"%{count}% مرفوضة","few":"%{count}% مرفوضة","many":"%{count}% مرفوضة","other":"%{count}% مرفوضة"},"ignored":{"zero":"%{count}% مُتجاهلة","one":"%{count}% مُتجاهلة","two":"%{count}% مُتجاهلة","few":"%{count}% مُتجاهلة","many":"%{count}% مُتجاهلة","other":"%{count}% مُتجاهلة"}},"topics":{"topic":"موضوع","reviewable_count":"العد","reported_by":"تم عمل تقرير بواسطة","deleted":"[حُذف الموضوع]","original":"(الموضوع الأصلي)","details":"التفاصيل","unique_users":{"zero":"ما من مستخدمين","one":"مستخدم واحد","two":"مستخدمان","few":"%{count} مستخدمين","many":"%{count} مستخدمًا","other":"%{count} مستخدم"}},"replies":{"zero":"ما من ردود","one":"ردّ واحد","two":"ردّان","few":"%{count} ردود","many":"%{count} ردًا","other":"%{count} ردّ"},"edit":"عدّل","save":"احفظ","cancel":"ألغِ","new_topic":"بالموافقة على هذا العنصر سيُنشأ موضوع جديد","filters":{"all_categories":"(كلّ الفئات)","type":{"title":"النوع","all":"(كلّ الأنواع)"},"minimum_score":"الحد الأدنى من النقاط:","refresh":"تحديث","status":"الحالة","category":"تصنيف","orders":{"score":"نقاط","score_asc":"النتيجة (عكسي)","created_at":"تاريخ الإنشاء","created_at_asc":"تاريخ الإنشاء (بالعكس)"},"priority":{"title":"الحد الأدنى من الأولوية","low":"(أي)","medium":"متوسّطة","high":"عالية"}},"conversation":{"view_full":"اعرض المحادثة كاملةً"},"scores":{"about":"يتم احتساب هذه الدرجة بناءً على مستوى ثقة المراسل، ودقة علاماته السابقة، وأولوية العنصر الذي يتم الإبلاغ عنه.","score":"نقاط","date":"التاريخ","type":"النوع","status":"الحالة","submitted_by":"مقدّم من","reviewed_by":"راجَعها"},"statuses":{"pending":{"title":"قيد الانتظار"},"approved":{"title":"موافق عليه"},"rejected":{"title":"مرفوض"},"ignored":{"title":"تم تجاهله"},"deleted":{"title":"محذوف"},"reviewed":{"title":"(جميعها مراجعة)"},"all":{"title":"(كل شيء)"}},"types":{"reviewable_flagged_post":{"title":"المشاركات المبلغ عنها","flagged_by":"تم وضع علامة بواسطة"},"reviewable_queued_topic":{"title":"موضوع في قائمة الانتظار"},"reviewable_queued_post":{"title":"في قائمة الانتظار"},"reviewable_user":{"title":"المستخدم"}},"approval":{"title":"المنشور يحتاج موافقة","description":"استلمنا مشاركتك ولكن يجب على أحد المشرفين الموافقة عليها قبل ظهورها. نرجو منك الصبر.","pending_posts":{"zero":"ما من مشاركات تنتظر الموافقة منك.","one":"مشاركة واحدة تنتظر الموافقة منك.","two":"مشاركتان تنتظران الموافقة منك.","few":"\u003cstrong\u003e%{count}\u003c/strong\u003e مشاركات تنتظر الموافقة منك.","many":"\u003cstrong\u003e%{count}\u003c/strong\u003e مشاركة تنتظر الموافقة منك.","other":"\u003cstrong\u003e%{count}\u003c/strong\u003e مشاركة تنتظر الموافقة منك."},"ok":"حسنًا"},"example_username":"اسم المستخدم"},"user_action":{"user_posted_topic":"نشر \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e ‏\u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eنشرت\u003c/a\u003e ‏\u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","user_replied_to_post":"ردّ \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e على \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eرددت\u003c/a\u003e على \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"ردّ \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e على \u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eرددت\u003c/a\u003e على \u003ca href='%{topicUrl}'\u003eالموضوع\u003c/a\u003e","user_mentioned_user":"أشار \u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e إلى \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"أشار \u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e‏ \u003ca href='%{user2Url}'\u003eإليك\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eأشرت\u003c/a\u003e إلى \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"نشرها \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"\u003ca href='%{userUrl}'\u003eنشرتَها\u003c/a\u003e","sent_by_user":"أرسلها \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"\u003ca href='%{userUrl}'\u003eأرسلتَها\u003c/a\u003e"},"directory":{"username":"اسم المستخدم","filter_name":"رشّح حسب اسم المستخدم","title":"المستخدمون","likes_given":"المعطاة","likes_received":"المتلقاة","topics_entered":"المُشاهدة","topics_entered_long":"المواضيع التي تمت مشاهدتها","time_read":"وقت القراءة","topic_count":"المواضيع","topic_count_long":"المواضيع المنشورة","post_count":"الردود","post_count_long":"الردود المنشورة","no_results":"لم نجد أيّ نتيجة.","days_visited":"الزيارات","days_visited_long":"أيام الزيارة","posts_read":"المقروءة","posts_read_long":"المنشورات المقروءة","last_updated":"اخر تحديث","total_rows":{"zero":"ما من أعضاء","one":"عضو واحد","two":"عضوان","few":"%{count} أعضاء","many":"%{count} عضوًا","other":"%{count} عضو"}},"group_histories":{"actions":{"change_group_setting":"تغيير إعدادات المجموعة","add_user_to_group":"إضافة عضو","remove_user_from_group":"حذف العضو","make_user_group_owner":"تعيين كمالك","remove_user_as_group_owner":"سحب صلاحية المالك"}},"groups":{"member_added":"تم الإضافة","member_requested":"تاريخ الطلب","add_members":{"title":"أضِف الأعضاء إلى %{group_name}","description":"يمكنك أيضًا لصق قائمة مفصولة بفواصل إنكليزية.","usernames":"أدخِل أسماء المستخدمين أو عناوين البريد","input_placeholder":"أسماء المستخدمين أو عناوين البريد","notify_users":"إخطار المستخدمين"},"requests":{"title":"الطلبات","reason":"سبب","accept":"قبول","accepted":"مقبول","deny":"رفض","denied":"مرفوض","undone":"طلب التراجع","handle":"التعامل مع طلب العضوية"},"manage":{"title":"إدارة","name":"الإسم","full_name":"الاسم الكامل","add_members":"أضِف أعضاء","delete_member_confirm":"أنُزيل ”%{username}“ من مجموعة ”%{group}“؟","profile":{"title":"الملف الشخصي"},"interaction":{"title":"تفاعل","posting":"نشر","notification":"اشعار"},"email":{"title":"البريد الإلكتروني","status":"مزامنة %{old_emails} / %{total_emails} رسائل البريد الإلكتروني عبر IMAP.","credentials":{"title":"بيانات الولوج","smtp_server":"خادوم SMTP","smtp_port":"منفذ SMTP","smtp_ssl":"استعمل SSL لِ‍ SMTP","imap_server":"خادوم IMAP","imap_port":"منفذ IMAP","imap_ssl":"استعمل SSL لِ‍ IMAP","username":"اسم المستخدم","password":"كلمة السر"},"mailboxes":{"synchronized":"صندوق البريد المتزامن","none_found":"لم توجد صناديق بريد في حساب البريد الإلكتروني هذا.","disabled":"معطّل"}},"membership":{"title":"العضوية","access":"صلاحية"},"categories":{"title":"الفئات","long_title":"الإخطارات المبدئية للفئة","description":"حين يُضاف المستخدمون إلى هذه المجموعة، ستُضبط إعدادات إخطارات الفئة لديهم على الآتي. يمكنهم بعدها تغييرها.","watched_categories_instructions":"ستراقب آليا كل المواضيع في هذه التصنيفات. ستصل لمجموعة الأعضاء إشعارات بالمنشورات والمشاركات الجديدة، وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","tracked_categories_instructions":"ستتابع آليا كل موضوعات هذا القسم. وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","watching_first_post_categories_instructions":"سيتم إخطار المستخدمين بأول مشاركة في كل موضوع جديد في هذه التصنيفات.","regular_categories_instructions":"إذا تم كتم هذه الفئات، فلن يتم كتمها عن أعضاء المجموعة. سيتم إخطار المستخدمين إذا تم ذكرهم أو رد شخص ما عليهم.","muted_categories_instructions":"لن يتم إخطار المستخدمين بأي شيء يتعلق بالمواضيع الجديدة في هذه التصنيفات، ولن يظهروا في التصنيفات أو صفحات الموضوعات الأخيرة."},"tags":{"title":"الوسوم","long_title":"الإخطارات المبدئية للوسوم","description":"عند إضافة مستخدمين إلى هذه المجموعة، سيتم تعيين إعدادات أوسمة الإشعار الخاصة بهم على الإعدادات الافتراضية. بعد ذلك، يمكنهم تغييرها.","watched_tags_instructions":"ستراقب آليا كل المواضيع في هذه الأوسمة. ستصل إشعارات لمجموعة الأعضاء بالمنشورات والمشاركات الجديدة، وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","tracked_tags_instructions":"ستتابع آليا كل موضوعات هذه الأوسمة. وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","watching_first_post_tags_instructions":"سيُرسل إخطار للمستخدمين بأولّ مشاركة في كلّ موضوع يحمل هذه الوسوم.","regular_tags_instructions":"إذا تم كتم كتم هذه العلامات، فسيتم إلغاء الكتم عن مستخدمين المجموعة. سيتم إخطار المستخدمين إذا تم ذكرهم أو رد شخص ما عليهم.","muted_tags_instructions":"لن يتم إخطار المستخدمين بأي شيء يتعلق بالمواضيع الجديدة لهذه الأوسمة، ولن تظهر في الأحدث."},"logs":{"title":"السّجلّات","when":"متى","action":"إجراء","acting_user":"العضو المسؤول","target_user":"العضو المستهدف","subject":"الموضوع","details":"تفاصيل","from":"من","to":"إلى"}},"permissions":{"title":"التصاريح","none":"ما من فئات مرتبطة بهذه المجموعة.","description":"يمكن لأعضاء هذه المجموعة الوصول إلى هذه الفئات"},"public_admission":"السماح للاعضاء بالانضمام إلى المجموعة بحرية (يتطلب أن تكون المجموعة مرئية للجميع )","public_exit":"السماح للأعضاء بمغادرة المجموعة بحرية","empty":{"posts":"لا منشورات من أعضاء هذه المجموعة.","members":"لا أعضاء في هذه المجموعة.","requests":"ما من طلبات اشتراك لهذه المجموعة.","mentions":"لم يُشِر أحد إلى هذه المجموعة.","messages":"لا رسائل لهذه المجموعة.","topics":"لا موضوعات من أعضاء هذه المجموعة.","logs":"لا سجلّات لهذه المجموعة."},"add":"أضِف","join":"انضم","leave":"غادِر","request":"اطلب الانضمام","message":"رسالة","confirm_leave":"أمتأكّد من ترك هذه المجموعة؟","allow_membership_requests":"اسمح للمستخدمين بإرسال طلبات الاشتراك إلى مالكي المجموعة (يطلب أن تكون المجموعة ظاهرة للعموم)","membership_request_template":"قالب مخصّص يُعرض للمستخدمين حين يُرسلون طلب عضوية","membership_request":{"submit":"أرسِل الطلب","title":"اطلب الانضمام للمجموعة @%{group_name}","reason":"دع مدراء المجموعة يعرفون لماذا انت تنتمي لهذه المجموعة"},"membership":"العضوية","name":"الاسم","group_name":"اسم المجموعة","user_count":"الأعضاء","bio":"عن المجموعة","selector_placeholder":"أدخِل اسم المستخدم","owner":"المالك","index":{"title":"المجموعات","all":"كلّ المجموعات","empty":"ما من مجموعات ظاهرة.","filter":"رشّح حسب اسم المجموعة","owner_groups":"مجموعاتي","close_groups":"المجموعات المُغلقة","automatic_groups":"مجموعات تلقائية","automatic":"تلقائي","closed":"مغلق","public":"عامة","private":"خاص","public_groups":"المجموعات العامة","automatic_group":"مجموعة تلقائية","close_group":"المجموعات المُغلقة","my_groups":"مجموعاتي","group_type":"نوع المجموعة","is_group_user":"عضو","is_group_owner":"المالك"},"title":{"zero":"المجموعات","one":"المجموعة","two":"المجموعتان","few":"المجموعات","many":"المجموعات","other":"المجموعات"},"activity":"النشاط","members":{"title":"الأعضاء","filter_placeholder_admin":"اسم المستخدم أو البريد الإلكتروني","filter_placeholder":"اسم المستخدم","remove_member":"حذف عضو","remove_member_description":"أزِل \u003cb\u003e%{username}\u003c/b\u003e من هذه المجموعة","make_owner":"تعيين كمالك","make_owner_description":"أعطِ ملكية هذه المجموعة إلى \u003cb\u003e%{username}\u003c/b\u003e","remove_owner":"حذف كمالك","remove_owner_description":"أزّل ملكية هذه المجموعة من \u003cb\u003e%{username}\u003c/b\u003e","owner":"المالك","forbidden":"ليس مسموحًا لك عرض الأعضاء."},"topics":"المواضيع","posts":"المشاركات","mentions":"الإشارات","messages":"الرسائل","notification_level":"مستوى الإخطارات المبدئي لرسائل المجموعات","alias_levels":{"mentionable":"من يمكنه @الإشارة إلى هذه المجموعة؟","messageable":"من يمكنه إرسال الرسائل إلى هذه المجموعة؟","nobody":"لا أحد","only_admins":"المدراء فقط","mods_and_admins":"المدراء والمشرفون فقط","members_mods_and_admins":"أعضاء المجموعة والمدراء والمشرفون فقط","owners_mods_and_admins":"مالكو المجموعات، الإداريون والمشرفون فقط","everyone":"الكلّ"},"notifications":{"watching":{"title":"مُراقبة","description":"سنُرسل إليك إخطارًا بكلّ مشاركة جديدة في كلّ رسالة، وسترى عدّادًا للردود الجديدة."},"watching_first_post":{"title":"مراقبة اول منشور","description":"سيتم إعلامك برسائل جديدة في هذه المجموعة ولكن ليس الردود على الرسائل."},"tracking":{"title":"مُتابع","description":"سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك، وسترى عدّادًا للردود الجديدة."},"regular":{"title":"عادي","description":"سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك."},"muted":{"title":"مكتوم","description":"لن يتم إخطارك بأي شيء بخصوص الرسائل من هذه المجموعة."}},"flair_url":"الصورة الرمزية المميزة","flair_upload_description":"استعمل صورًا مربّعة الشكل مقاسها الأدنى هو 20 بكسل × 20 بكسل.","flair_bg_color":"لون خلفية الصورة الرمزية","flair_bg_color_placeholder":"(إختياري) اللون بترميز Hexadecimal","flair_color":"لون الصورة الرمزية","flair_color_placeholder":"(إختياري) اللون بترميز Hexadecimal","flair_preview_icon":"معاينة الأيقونة","flair_preview_image":"معاينة الصورة","flair_type":{"icon":"اختر أيقونةً","image":"ارفع صورةً"}},"user_action_groups":{"1":"الإعجابات المعطاة","2":"الإعجابات المتلقاة","3":"العلامات","4":"المواضيع","5":"الردود","6":"الردود","7":"الإشارات","9":"الاقتباسات","11":"التعديلات","12":"العناصر المرسلة","13":"الوارد","14":"قيد الانتظار","15":"المسودّات"},"categories":{"all":"كلّ الفئات","all_subcategories":"الكل","no_subcategory":"لا شيء","category":"الفئة","category_list":"اعرض قائمة الفئات","reorder":{"title":"أعِد ترتيب الفئات","title_long":"أعِد تنظيم قائمة الفئات","save":"احفظ الترتيب","apply_all":"طبّق","position":"مكان"},"posts":"المشاركات","topics":"المواضيع","latest":"آخر المواضيع","latest_by":"الاحدث بـ","toggle_ordering":"تبديل التحكم في الترتيب","subcategories":"أقسام فرعية","muted":"الفئات المكتومة","topic_sentence":{"zero":"ما من مواضيع","one":"موضوع واحد","two":"موضوعان","few":"%{count} مواضيع","many":"%{count} موضوعًا","other":"%{count} موضوع"},"topic_stat_sentence_week":{"zero":"ما من مواضيع جديدة خلال الأسبوع الماضي.","one":"فُتح موضوع واحد جديد خلال الأسبوع الماضي.","two":"فُتح موضوعين جديدين خلال الأسبوع الماضي.","few":"فُتحت %{count} مواضيع جديدة خلال الأسبوع الماضي.","many":"فُتح %{count} موضوعًا جديدًا خلال الأسبوع الماضي.","other":"فُتح %{count} موضوع جديد خلال الأسبوع الماضي."},"topic_stat_sentence_month":{"zero":"ما من مواضيع جديدة خلال الشهر الماضي.","one":"فُتح موضوع واحد جديد خلال الشهر الماضي.","two":"فُتح موضوعين جديدين خلال الشهر الماضي.","few":"فُتحت %{count} مواضيع جديدة خلال الشهر الماضي.","many":"فُتح %{count} موضوعًا جديدًا خلال الشهر الماضي.","other":"فُتح %{count} موضوع جديد خلال الشهر الماضي."},"n_more":"الفئات (%{count} أكثر)..."},"ip_lookup":{"title":"جدول عناوين الIP","hostname":"اسم المضيف","location":"الموقع الجغرافي","location_not_found":"(غير معرف)","organisation":"المنظمات","phone":"الهاتف","other_accounts":"الحسابات الأخرى بعنوان IP هذا:","delete_other_accounts":"احذف %{count}","username":"اسم المستخدم","trust_level":"مستوى الثقة","read_time":"وقت القراءة","topics_entered":" مواضيع فُتحت","post_count":"# المنشورات","confirm_delete_other_accounts":"أمتأكّد من حذف هذه الحسابات؟","powered_by":"باستخدام \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"تم النسخ"},"user_fields":{"none":"(اختر خيارًا)","required":"من فضلك أدخِل قيمة ”%{name}“"},"user":{"said":"%{username}:","profile":"الملف الشخصي","mute":"كتم","edit":"تعديل التفضيلات","download_archive":{"button_text":"نزّل الكلّ","confirm":"أمتأكّد من تنزيل مشاركاتك؟","success":"بدأ التنزيل وسنُرسل إليك إخطارًا بالبريد متى اكتملت العملية.","rate_limit_error":"يمكنك تنزيل المشاركات مرة واحدة يوميًا فقط. من فضلك أعِد المحاولة غدًا."},"new_private_message":"رسالة جديدة","private_message":"رسالة خاصة","private_messages":"الرسائل","user_notifications":{"filters":{"filter_by":"رشّح حسب","all":"الكلّ","read":"المقروءة","unread":"غير المقروءة"},"ignore_duration_title":"تجاهَل المستخدم","ignore_duration_username":"اسم المستخدم","ignore_duration_when":"المدة:","ignore_duration_save":"تجاهل","ignore_duration_note":"يرجى ملاحظة أن جميع عمليات التجاهل يتم إزالتها تلقائياً بعد انتهاء مدة التجاهل","ignore_duration_time_frame_required":"الرجاء تحديد إطار زمني","ignore_no_users":"ليس لديك أي مستخدمين متجاهلين.","ignore_option":"تم تجاهله","ignore_option_title":"لن تتلقى إشعارات ذات صلة بهذا المستخدم وسيتم إخفاء جميع مواضيعه وردوده.","add_ignored_user":"أضِف...","mute_option":"مكتومة","mute_option_title":"لن تتلقى أي إشعارات ذات صلة بهذا المستخدم.","normal_option":"عادي","normal_option_title":"سنُرسل إليك إخطارًا إن ردّ هذا المستخدم عليك أو اقتبس كلامك أو أشار إليك."},"activity_stream":"النشاط","preferences":"التفضيلات","feature_topic_on_profile":{"open_search":"اختر موضوعًا جديدًا","title":"اختر موضوعًا","search_label":"ابحث في المواضيع حسب العنوان","save":"احفظ","clear":{"title":"امسح","warning":"أمتأكّد من مسح الموضوع المميّز على صفحتك؟"}},"use_current_timezone":"استعمل المنطقة الزمنية الحالية","profile_hidden":"الملف الشخصي لهذا المستخدم مخفي.","expand_profile":"وسّع","collapse_profile":"اطوِ","bookmarks":"العلامات","bio":"معلومات عنّي","timezone":"المنطقة الزمنية","invited_by":"مدعو من قبل","trust_level":"مستوى الثقة","notifications":"الإخطارات","statistics":"الأحصائيات","desktop_notifications":{"label":"الإشعارات الحية","not_supported":"معذرةً، لا يدعم هذا المتصفّح الإخطارات.","perm_default":"فعّل الإخطارات","perm_denied_btn":"رُفض التصريح","perm_denied_expl":"رفضت تصريح عرض الإخطارات. اسمح بالإخطارات من إعدادات المتصفّح.","disable":"عطّل الإخطارات","enable":"فعّل الإخطارات","each_browser_note":"ملاحظة: يجب عليك تغيير هذا الإعداد في كل متصفح تستخدمه. سيتم تعطيل جميع الإشعارات في \"الرجاء عدم الإزعاج\" ، بغض النظر عن هذا الإعداد.","consent_prompt":"هل تريد إشعارات مباشرة عندما يرد الأشخاص على مشاركاتك؟"},"dismiss":"تجاهل","dismiss_notifications":"تجاهل الكل","dismiss_notifications_tooltip":"علّم كلّ الإخطارات غير المقروءة على أنّها مقروءة","first_notification":"أوّل إخطار تستلمه! انقره لتبدأ.","dynamic_favicon":"اعرض الأعداد في أيقونة المتصفّح","skip_new_user_tips":{"description":"تخطي نصائح وتهيئة المستخدم الجديد والشارات","not_first_time":"ليست المرة الأولى لك؟","skip_link":"تخطي هذه النصائح"},"theme_default_on_all_devices":"اضبط هذه السمة لتكون المبدئية على كلّ أجهزتي","color_scheme_default_on_all_devices":"تعيين مخطط (أنظمة) الألوان الافتراضية على جميع أجهزتي","color_scheme":"المخطط اللوني","color_schemes":{"disable_dark_scheme":"نفس العادية","dark_instructions":"يمكنك معاينة مخطّط الوضع الداكن اللوني بتفعيل الوضع الداكن من جهازك.","undo":"صفّر","regular":"العادي","dark":"الوضع الداكن","default_dark_scheme":"(مبدئيّات الموقع)"},"dark_mode":"الوضع الداكن","dark_mode_enable":"تمكين نظام الألوان في الوضع المظلم تلقائيًا","text_size_default_on_all_devices":"اجعل هذا الحجم الافتراضي للنص على جميع أجهزتي","allow_private_messages":"السماح للمستخدمين الآخرين بإرسال رسائل خاصة لي","external_links_in_new_tab":"افتح كلّ الروابط الخارجي في لسان جديد","enable_quoting":"فعل خاصية إقتباس النصوص المظللة","enable_defer":"تمكين التأجيل لوضع علامة على المواضيع الغير مقروءة","change":"غيّر","featured_topic":"الموضوع المميّز","moderator":"‏%{user} مشرف في الموقع","admin":"‏%{user} مدير في الموقع","moderator_tooltip":"هذا المستخدم مشرف في الموقع","admin_tooltip":"هذا المستخدم مدير في الموقع","silenced_tooltip":"أُسكت هذا العضو","suspended_notice":"هذا المستخدم موقوف حتى تاريخ %{date}","suspended_permanently":"هذا العضو موقوف.","suspended_reason":"السبب:","github_profile":"Github","email_activity_summary":"خلاصة النشاط","mailing_list_mode":{"label":"وضع القائمة البريدية","enabled":"فعّل وضع القائمة البريدية","instructions":"يُلغي هذا الإعداد إعدادات ”خلاصة النشاط“.\u003cbr /\u003e\nلا تشمل هذه الرسائل المواضيع والفئات المكتومة.\n","individual":"أرسل لي رسالة لكل منشور جديد","individual_no_echo":"أرسل رسالة لكل منشور جديد عدا منشوراتي","many_per_day":"أرسل لي رسالة لكل منشور جديد (تقريبا %{dailyEmailEstimate} يوميا)","few_per_day":"أرسل لي رسالة لكل منشور جديد (تقريبا إثنتان يوميا)","warning":"تم تمكين وضع القائمة البريدية. تم تجاوز إعدادات إشعار البريد الإلكتروني."},"tag_settings":"الوسوم","watched_tags":"مراقب","watched_tags_instructions":"ستراقب آليا كل المواضيع التي تستخدم هذه الأوسمة. ستصلك إشعارات بالمنشورات و الموضوعات الجديدة، وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","tracked_tags":"متابع","tracked_tags_instructions":"ستتابع آليا كل الموضوعات التي تستخدم هذه الأوسمة. وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","muted_tags":"مكتوم","muted_tags_instructions":"لن يتم إشعارك بأي جديد بالموضوعات التي تستخدم هذه الأوسمة، ولن تظهر موضوعات هذه الوسوم في قائمة الموضوعات المنشورة مؤخراً.","watched_categories":"مراقب","watched_categories_instructions":"ستراقب آليا كل موضوعات هذا القسم. ستصلك إشعارات بالمنشورات و الموضوعات الجديدة، وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","tracked_categories":"متابع","tracked_categories_instructions":"ستتابع آليا كل موضوعات هذا القسم. وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع.","watched_first_post_categories":"مراقبة أول منشور","watched_first_post_categories_instructions":"سيصلك إشعار بأول منشور في كل موضوع بهذا القسم.","watched_first_post_tags":"مراقبة أول منشور","watched_first_post_tags_instructions":"سيصلك إشعار بأول منشور في كل موضوع يستخدم هذة الأوسمة.","muted_categories":"مكتوم","muted_categories_instructions":"لن يتم إخطار بأي شيء يتعلق بالمواضيع الجديدة في هذه التصنيفات، ولن تظهر في التصيفات أو صفحة الأحدث.","muted_categories_instructions_dont_hide":"لن يتم إخطارك بأي شيء حول المواضيع الجديدة في هذه التصنيفات.","regular_categories":"عادي","regular_categories_instructions":"سترى هذه الفئات في قوائم المواضيع ”الحديثة“ و”النشطة“.","no_category_access":"كمشرف لديك صلاحيات وصول محدودة للأقسام, الحفظ معطل","delete_account":"أحذف الحسابي","delete_account_confirm":"أمتأكّد من حذف حسابك للأبد؟ هذا إجراء لا عودة فيه!","deleted_yourself":"حُذف حسابك بنجاح.","delete_yourself_not_allowed":"من فضلك راسِل أحد أعضاء الطاقم إن أردت حذف حسابك.","unread_message_count":"الرسائل","admin_delete":"احذف","users":"المستخدمون","muted_users":"المكتومون","muted_users_instructions":"منع جميع الإشعارات والرسائل الخاصة من هؤلاء المستخدمين.","allowed_pm_users":"سماح","allowed_pm_users_instructions":"السماح فقط بالرسائل الخاصة لهؤلاء المستخدمين.","allow_private_messages_from_specific_users":"السماح لمستخدمين محددين فقط بإرسال رسائل خاصة لي","ignored_users":"تم تجاهله","ignored_users_instructions":"منع جميع المشاركات، الإشعارات والرسائل الخاصة من هؤلاء المستخدمين.","tracked_topics_link":"إظهار","automatically_unpin_topics":"ألغِ تثبيت الموضوعات تلقائيًا متى وصلت آخرها.","apps":"التطبيقات","revoke_access":"اسحب التصريح","undo_revoke_access":"تراجَع عن سحب التصريح","api_approved":"موافق عليه:","api_last_used_at":"آخر استخدام في:","theme":"الواجهة","save_to_change_theme":"سيتم تحديث المظهر بعد النقر على \"%{save_text}\"","home":"الصفحة الرئيسية المبدئية","staged":"مهيأ","staff_counters":{"flags_given":"البلاغات المفيدة","flagged_posts":"المنشورات المبلغ عنها ","deleted_posts":"المنشورات المحذوفة","suspensions":"موقوفون","warnings_received":"تحذيرات","rejected_posts":"المشاركات المرفوضة"},"messages":{"all":"الكلّ","inbox":"الوارد","sent":"الصادر","archive":"الأرشيف","groups":"مجموعاتي","bulk_select":"حدّد الرسائل","move_to_inbox":"انقلها إلى الوارد","move_to_archive":"أرشِفها","failed_to_move":"فشل نقل الرسائل المحدّدة (قد لا تكون متّصلًا بالشبكة)","select_all":"حدّد الكلّ","tags":"الوسوم"},"preferences_nav":{"account":"الحساب","profile":"الملف الشخصي","emails":"البريد الإلكتروني","notifications":"التنبيهات","categories":"الفئات","users":"الأعضاء","tags":"الوسوم","interface":"واجهة المستخدم","apps":"التطبيقات"},"change_password":{"success":"(تم إرسال الرسالة)","in_progress":"(يتم إرسال الرسالة)","error":"(خطأ)","emoji":"قفل الرموز التعبيرية","action":"أرسِل بريد تصفير كلمة السر","set_password":"اضبط كلمة السر","choose_new":"اختر كلمة سر جديدة","choose":"اختر كلمة سر"},"second_factor_backup":{"title":"رموز النسخ الاحتياطي لـ الاستيثاق بعوامل عدة","regenerate":"أعِد التوليد","disable":"عطّل","enable":"فعّل","enable_long":"فعّل الرموز الاحتياطية","manage":{"zero":"أدِر الرموز الاحتياطية. لم تبقَ أيّ رموز احتياطية.","one":"أدِر الرموز الاحتياطية. بقيَ رمز احتياطي واحد.","two":"أدِر الرموز الاحتياطية. بقيَ رمزين احتياطيين.","few":"أدِر الرموز الاحتياطية. بقيت \u003cstrong\u003e%{count}\u003c/strong\u003e رموز احتياطية.","many":"أدِر الرموز الاحتياطية. بقيَ \u003cstrong\u003e%{count}\u003c/strong\u003e رمزًا احتياطيًا.","other":"أدِر الرموز الاحتياطية. بقيَ \u003cstrong\u003e%{count}\u003c/strong\u003e رمز احتياطي."},"copy_to_clipboard":"انسخ إلى الحافظة","copy_to_clipboard_error":"عُطل أثناء نسخ البيانات إلى الحافظة","copied_to_clipboard":"نُسخ إلى الحافظة","download_backup_codes":"نزّل الرموز الاحتياطية","remaining_codes":{"zero":"لم تبقَ أيّ رموز احتياطية.","one":"بقيَ رمز احتياطي واحد.","two":"بقيَ رمزين احتياطيين.","few":"بقيت \u003cstrong\u003e%{count}\u003c/strong\u003e رموز احتياطية.","many":"بقيَ \u003cstrong\u003e%{count}\u003c/strong\u003e رمزًا احتياطيًا.","other":"بقيَ \u003cstrong\u003e%{count}\u003c/strong\u003e رمز احتياطي."},"use":"استخدم رمزًا احتياطيًا","enable_prerequisites":"يجب عليك تمكين طريقة أساسية لـ (الاستيثاق بعوامل عدة) قبل إنشاء الرموز الاحتياطية.","codes":{"title":"تم إنشاء رموز النسخ الاحتياطي","description":"يمكن استخدام كل من هذه الرموز الاحتياطية مرة واحدة فقط. احتفظ بها في مكان آمن وتستطيع الوصول إليها."}},"second_factor":{"title":"الاستيثاق بخطوتين","enable":"أدِر الاستيثاق بخطوتين","disable_all":"عطّل الكلّ","forgot_password":"أنسيت كلمة السر؟","confirm_password_description":"من فضلك أكّد كلمة السر للمواصلة","name":"الاسم","label":"الرمز","rate_limit":"من فضلك انتظر قبل تجربة رمز استيثاق آخر.","enable_description":"امسح رمز QR ضوئيًا في أحد التطبيقات المدعومة (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eأندرويد\u003c/a\u003e و\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eآي‌أو‌إس\u003c/a\u003e) وأدخِل رمز الاستيثاق.\n","disable_description":"يرجى ادخال رمز التوثيق من التطبيق الخاص بك","show_key_description":"أدخِل يدويًا","short_description":"احمِ حسابك برموز أمان تُستعمل لمرة واحدة فقط.\n","extended_description":"تضيف المصادقة ثنائية العوامل أمانًا إضافيًا إلى حسابك من خلال طلب رمز مميز لمرة واحدة بالإضافة إلى كلمة المرور الخاصة بك. الرموز يمكن إنشاؤها على \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eالروبوت\u003c/a\u003e و \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eدائرة الرقابة الداخلية\u003c/a\u003e الأجهزة.\n","oauth_enabled_warning":"من فضلك خُذ بعين الاعتبار أنّ الولوج الاجتماعي سيُعطّل ما إن تفعّل الاستيثاق بخطوتين على حسابك.","use":"استخدم تطبيق Authenticator","enforced_notice":"أنت مطالب بتمكين المصادقة ذات العاملين قبل الوصول إلى هذا الموقع.","disable":"عطّل","disable_confirm":"أمتأكّد من تعطيل كلّ طرائق الاستيثاق بخطوتين؟","save":"احفظ","edit":"عدّل","edit_title":"تحرير المصادقة","edit_description":"اسم الموثق","enable_security_key_description":"عندما يكون لديك \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003eمفتاح أمان الأجهزة\u003c/a\u003e ، اضغط على زر التسجيل أدناه.\n","totp":{"title":"المصادقة المعتمدة على الرموز","add":"أضِف وسيلة استيثاق","default_name":"مصادقتي","name_and_code_required_error":"يجب عليك تقديم اسم ورمز من تطبيق المصادقة."},"security_key":{"register":"تسجيل","title":"مفاتيح الأمان","add":"أضِف مفتاح أمان","default_name":"مفتاح الأمان الأساس","not_allowed_error":"انتهت مهلة عملية تسجيل مفتاح الأمان أو تم إلغاؤها.","already_added_error":"لقد سجلت بالفعل مفتاح الأمان هذا. ليس عليك تسجيله مرة أخرى.","edit":"تحرير مفتاح الأمان","save":"احفظ","edit_description":"اسم مفتاح الأمان","name_required_error":"يجب عليك تقديم اسم لمفتاح الأمان."}},"change_about":{"title":"تعديل عني","error":"حدث عطل أثناء تغيير هذه القيمة."},"change_username":{"title":"تغيير اسم المستخدم","confirm":"أمتأكّد كلّ التأكيد من تغيير اسم المستخدم؟","taken":"معذرةً، اسم المستخدم الذي اخترته محجوز.","invalid":"اسم المستخدم غير صالح. يمكنه احتواء احرف و ارقام انجليزية فحسب"},"add_email":{"title":"أضف بريد إلكتروني","add":"أضف"},"change_email":{"title":"غيّر البريد الإلكتروني","taken":"معذرةً، عنوان البريد غير متاح.","error":"حدث عطل أثناء تغيير البريد الإلكتروني. ربما هناك من يستخدم هذا العنوان بالفعل؟","success":"لقد أرسلنا بريد إلكتروني إلى هذا العنوان. من فضلك اتّبع تعليمات التأكيد.","success_via_admin":"لقد أرسلنا بريدًا إلكترونيًا إلى هذا العنوان. سيحتاج المستخدم إلى اتباع تعليمات التأكيد الواردة في البريد الإلكتروني.","success_staff":"لقد قمنا بأرسال بريدا إلكتروني الى عنوانك الحالي, رجاء اتبع تعليمات التأكيد."},"change_avatar":{"title":"غيّر صورة الملفك الشخصي","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e، استناداً إلى","gravatar_title":"تغيير الصورة الرمزية الخاصة بك على موقع %{gravatarName}","gravatar_failed":"لم نتمكن من العثور على %{gravatarName} بعنوان البريد الإلكتروني هذا.","refresh_gravatar_title":"قم بتحديث %{gravatarName}","letter_based":"صورة الملف الشخصي الافتراضية","uploaded_avatar":"صورة مخصصة","uploaded_avatar_empty":"اضافة صورة مخصصة","upload_title":"ارفع صورتك ","image_is_not_a_square":"تحذير: لقد قصصنا صورتك، لأن عرضها وارتفاعها غير متساويان."},"change_profile_background":{"title":"رأس الملف الشخصي","instructions":"سيتم وضع صورة الخلفية في المنتصف بعرض 590px"},"change_card_background":{"title":"خلفية بطاقة العضو","instructions":"سيتم وضع صورة الخلفية في المنتصف بعرض 590px"},"change_featured_topic":{"title":"الموضوع المميّز","instructions":"سيكون رابط هذا الموضوع على بطاقة المستخدم والملف الشخصي الخاصين بك."},"email":{"title":"البريد الإلكتروني","primary":"البريد الإلكتروني الأساسي","secondary":"البريد الإلكتروني الثانوي","primary_label":"الأساسي","unconfirmed_label":"غير مؤكد","resend_label":"أعِد إرسال رسالة التأكيد","resending_label":"يُرسل...","resent_label":"أُرسل البريد","update_email":"غيّر البريد الإلكتروني","set_primary":"تعيين البريد الإلكتروني الأساسي","destroy":"إزالة البريد الإلكتروني","add_email":"أضِف بريدًا بديلًا","sso_override_instructions":"يمكن تحديث البريد الإلكتروني من مزود SSO.","no_secondary":"لا توجد رسائل في البريد الإلكتروني الثانوي","instructions":"لا يظهر للعموم أبدًا.","admin_note":"ملاحظة: يشير تغيير المستخدم الإداري للبريد الإلكتروني لمستخدم آخر غير إداري إلى أن المستخدم قد فقد الوصول إلى حساب البريد الإلكتروني الأصلي، لذلك سيتم إرسال بريد إلكتروني لإعادة تعيين كلمة المرور إلى عنوانه الجديد. لن يتغير البريد الإلكتروني للمستخدم حتى يكمل عملية إعادة تعيين كلمة المرور.","ok":"سنرسل لك بريدا للتأكيد","required":"من فضلك أدخِل بريدًا إلكترونيًا","invalid":"من فضلك أدخل بريدا إلكترونيا صالحا","authenticated":"تم توثيق بريدك الإلكتروني بواسطة %{provider}","frequency_immediately":"سيتم ارسال رسالة الكترونية فورا في حال أنك لم تقرأ الرسائل السابقة التي كنا نرسلها لك.","frequency":{"zero":"سنُراسلك على بريدك فقط في حال مضت أقلّ من دقيقة على آخر زيارة لك للموقع.","one":"سنُراسلك على بريدك فقط في حال مضت دقيقة واحدة على آخر زيارة لك للموقع.","two":"سنُراسلك على بريدك فقط في حال مضت دقيقتين على آخر زيارة لك للموقع.","few":"سسنُراسلك على بريدك فقط في حال مضت %{count} دقائق على آخر زيارة لك للموقع.","many":"سسنُراسلك على بريدك فقط في حال مضت %{count} دقيقة على آخر زيارة لك للموقع.","other":"سسنُراسلك على بريدك فقط في حال مضت %{count} دقيقة على آخر زيارة لك للموقع."}},"associated_accounts":{"title":"الحسابات المرتبطة","connect":"الاتصال","revoke":"تعطيل","cancel":"ألغِ","not_connected":"(غير متصل)","confirm_modal_title":"قم بتوصيل حساب %{provider}","confirm_description":{"account_specific":"سيتم استخدام حسابك %{provider} '%{account_description}' للمصادقة.","generic":"سيتم استخدام حساب %{provider} الخاص بك للمصادقة."}},"name":{"title":"الاسم","instructions":"اسمك الكامل (اختياري)","instructions_required":"اسمك الكامل","required":"من فضلك أدخِل اسمًا","too_short":"اسمك قصير جدا","ok":"يبدو اسمك جيدا"},"username":{"title":"اسم المستخدم","instructions":"باللغة الإنجليزية و دون مسافات و قصير و غير مكرر","short_instructions":"يمكن للناس الإشارة إليك هكذا: ⁨@%{username}⁩","available":"اسم المستخدم متاح","not_available":"غير متاح. جرّب %{suggestion} ؟","not_available_no_suggestion":"غير متاح","too_short":"اسم المستخدم قصير جدًّا","too_long":"اسم المستخدم طويل جدًّا","checking":"يتم التاكد من توفر اسم المستخدم...","prefilled":"البريد الالكتروني مطابق لـ اسم المستخدم المسّجل.","required":"من فضلك أدخِل اسم المستخدم"},"locale":{"title":"لغة الواجهة","instructions":"لغة واجهة المستخدم. ستتغيّر عندما تحدث الصفحة.","default":"(الافتراضية)","any":"أي"},"password_confirmation":{"title":"أعِد كتابة كلمة السر"},"invite_code":{"title":"رمز الدعوة","instructions":"تسجيل الحساب يتطلب رمز الدعوة"},"auth_tokens":{"title":"الأجهزة المستعملة حديثًا","details":"تفاصيل","log_out_all":"اخرج من كلّ الأجهزة","not_you":"ليس أنت؟","show_all":"اعرض الكلّ (%{count})","show_few":"اعرض أقلّ","was_this_you":"أكان هذا أنت؟","was_this_you_description":"إذا لم تكن أنت، ننصحك بتغيير كلمة المرور وتسجيل الخروج في كل مكان.","browser_and_device":"‏%{browser} على %{device}","secure_account":"أمّن حسابي","latest_post":"آخر مرة قمت بنشر…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e ‏\u0026ndash;‏ \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"‏%{browser} | \u003cspan class=\"active\"\u003eنشط الآن\u003c/span\u003e","browser_last_seen":"‏%{browser} |‏ %{date}"},"last_posted":"آخر مشاركة","last_emailed":"اخر ما تم ارساله","last_seen":"كان هنا","created":"انضمّ","log_out":"اخرج","location":"الموقع الجغرافي","website":"الموقع الكتروني","email_settings":"البريد الإلكتروني","hide_profile_and_presence":"أخفِ ملفي الشخصي عن العموم وميزة ”آخر ظهور“","enable_physical_keyboard":"فعّل دعم لوحة المفاتيح الفيزيائية على آي‌باد","text_size":{"title":"مقاس النصوص","smallest":"أصغر","smaller":"أصغر","normal":"عادي","larger":"أكبر","largest":"الأكبر"},"title_count_mode":{"title":"يعرض عنوان صفحة الخلفية عدد من:","notifications":"الإخطارات الجديدة","contextual":"محتوى الصفحة الجديد"},"like_notification_frequency":{"title":"أرسل إشعارا عند الإعجاب","always":"دوما","first_time_and_daily":"أول إعجاب بالمنشور يوميا","first_time":"أول إعجاب بالمنشور","never":"أبدا"},"email_previous_replies":{"title":"ضَع الردود السابقة في نهاية رسائل البريد","unless_emailed":"في حال لم تُرسل","always":"دائمًا","never":"أبدًا"},"email_digests":{"title":"أرسِل إليّ بريدًا يلخّص المواضيع والردود الشائعة حين لا أزور الموقع","every_30_minutes":"كلّ 30 دقيقة","every_hour":"كلّ ساعة","daily":"كلّ يوم","weekly":"كلّ أسبوع","every_month":"كلّ شهر","every_six_months":"كلّ ستة أشهر"},"email_level":{"title":"أبرِدني متى اقتبس أحد كلامي أو ردّ على مشاركاتي أو أشار إلى @اسمي أو دعاني إلى موضوع ما","always":"دائمًا","only_when_away":"حين أكون بعيدًا فقط","never":"أبدًا"},"email_messages_level":"أرسل إلي رسالة إلكترونية عندما يبعث أحدهم رسالة إلي","include_tl0_in_digests":"ارفق محتوى الاعضاء الجدد في رسائل الملخص","email_in_reply_to":"ارفق مقتطف من الرد على الموضوع في رسائل البريد الالكتروني","other_settings":"أخرى","categories_settings":"الفئات","new_topic_duration":{"label":"اعتبِر المواضيع جديدة إن","not_viewed":"لم أطالعها بعد","last_here":"فُتحت منذ آخر زيارة لي","after_1_day":"فُتحت اليوم الماضي","after_2_days":"فُتحت اليومين الماضيين","after_1_week":"فُتحت الأسبوع الماضي","after_2_weeks":"فُتحت الأسبوعين الماضيين"},"auto_track_topics":"تابع آليا الموضوعات التي افتحها","auto_track_options":{"never":"أبدًا","immediately":"حالًا","after_30_seconds":"بعد 30 ثانية","after_1_minute":"بعد دقيقة واحدة","after_2_minutes":"بعد دقيقتين","after_3_minutes":"بعد ثلاث دقائق","after_4_minutes":"بعد اربع دقائق","after_5_minutes":"بعد خمس دقائق","after_10_minutes":"بعد 10 دقائق"},"notification_level_when_replying":"إذا نشرت في موضوع ما، اجعله","invited":{"search":"اكتب للبحث في الدعوات...","title":"الدعوات","user":"المستخدمين المدعويين","sent":"آخر إرسال","none":"ما من دعوات لعرضها.","truncated":{"zero":"ما من دعوات لعرضها.","one":"ترى الآن أوّل دعوة فقط.","two":"ترى الآن أوّل دعوتين فقط.","few":"ترى الآن أوّل {count} دعوات فقط.","many":"ترى الآن أوّل {count} دعوة فقط.","other":"ترى الآن أوّل {count} دعوة فقط."},"redeemed":"دعوات محررة","redeemed_tab":"محررة","redeemed_tab_with_count":"(%{count}) محررة","redeemed_at":"محررة","pending":"دعوات قيد الإنتضار","pending_tab":"قيد الانتظار","pending_tab_with_count":"معلق (%{count})","topics_entered":" موضوعات شُوهِدت","posts_read_count":"منشورات قرات","expired":"الدعوة انتهت صلاحيتها ","rescind":"حذف","rescinded":"الدعوة حذفت","rescind_all":"أزِل الدعوات المنقضية","rescinded_all":"أُزيلت كلّ الدعوات المنقضية!","rescind_all_confirm":"أمتأكّد من إزالة كلّ الدعوات المنقضية؟","reinvite":"اعادة ارسال الدعوة","reinvite_all":"أعِد إرسال كلّ الدعوات","reinvite_all_confirm":"أمتأكّد من إعادة إرسال كلّ الدعوات؟","reinvited":"اعادة ارسال الدعوة","reinvited_all":"أُعيد إرسال كلّ الدعوات!","time_read":"وقت القراءة","days_visited":"أيام الزيارة","account_age_days":"عمر الحساب بالأيام","source":"مدعو من قبل","links_tab":"روابط","links_tab_with_count":"روابط (%{count})","link_url":"رابط","link_created_at":"أُنشئ في","link_redemption_stats":"الاسترداد","link_groups":"المجموعات","link_expires_at":"تنتهي","create":"دعوة","copy_link":"إظهار الرابط","generate_link":"إنشاء رابط دعوة","link_generated":"إليك رابط الدعوة!","valid_for":"رابط الدعوة صالح للبريد الإلكترونيّ هذا فقط: %{email}","single_user":"دعوة عن طريق البريد الإلكتروني","multiple_user":"دعوة عن طريق الرابط","invite_link":{"title":"رابط الدعوة","success":"وُلّد رابط الدعوة بنجاح!","error":"حدث عُطل أثناء توليد رابط الدعوة","max_redemptions_allowed_label":"كم شخصًا يمكنه التسجيل باستعمال هذا الرابط؟","expires_at":"متى ينقضي رابط الدعوة هذا؟"},"bulk_invite":{"none":"لا توجد دعوات لعرضها على هذه الصفحة.","text":"دعوة مجمعة","success":"رُفع الملف بنجاح. سيصلك إشعارا عبر رسالة عند اكتمال العملية.","error":"معذرةً، يجب أن يكون الملف بنسق CSV.","confirmation_message":"أنت على وشك إرسال دعوات بالبريد الإلكتروني إلى كل شخص في الملف الذي تم رفعه."}},"password":{"title":"كلمة السر","too_short":"كلمة السر قصيرة جدًا.","common":"كلمة السر شائعة جدًا.","same_as_username":"كلمة السر تُطابق اسم المستخدم.","same_as_email":"كلمة السر تُطابق البريد الإلكتروني.","ok":"كلمة السر هذه جيدة.","instructions":"علي الأقل %{count} حرفا","required":"من فضلك أدخِل كلمة سر"},"summary":{"title":"الخلاصة","stats":"إحصائيات","time_read":"وقت القراءة","recent_time_read":"وقت القراءة الحديث","topic_count":{"zero":"المواضيع المفتوحة","one":"المواضيع المفتوحة","two":"المواضيع المفتوحة","few":"المواضيع المفتوحة","many":"المواضيع المفتوحة","other":"المواضيع المفتوحة"},"post_count":{"zero":"المشاركات المنشورة","one":"المشاركات المنشورة","two":"المشاركات المنشورة","few":"المشاركات المنشورة","many":"المشاركات المنشورة","other":"المشاركات المنشورة"},"likes_given":{"zero":"المُهداة","one":"المُهداة","two":"المُهداة","few":"المُهداة","many":"المُهداة","other":"المُهداة"},"likes_received":{"zero":"المُستلمة","one":"المُستلمة","two":"المُستلمة","few":"المُستلمة","many":"المُستلمة","other":"المُستلمة"},"days_visited":{"zero":"أيام الزيارة","one":"أيام الزيارة","two":"أيام الزيارة","few":"أيام الزيارة","many":"أيام الزيارة","other":"أيام الزيارة"},"topics_entered":{"zero":"المواضيع المعروضة","one":"المواضيع المعروضة","two":"المواضيع المعروضة","few":"المواضيع المعروضة","many":"المواضيع المعروضة","other":"المواضيع المعروضة"},"posts_read":{"zero":"المشاركات المقروءة","one":"المشاركات المقروءة","two":"المشاركات المقروءة","few":"المشاركات المقروءة","many":"المشاركات المقروءة","other":"المشاركات المقروءة"},"bookmark_count":{"zero":"العلامات","one":"العلامات","two":"العلامات","few":"العلامات","many":"العلامات","other":"العلامات"},"top_replies":"أفضل الردود","no_replies":"ما من ردود بعد.","more_replies":"ردود أخرى","top_topics":"أفضل المواضيع","no_topics":"ما من مواضيع بعد.","more_topics":"مواضيع أخرى","top_badges":"أفضل الشارات","no_badges":"ما من شارات بعد.","more_badges":"شارات أخرى","top_links":"أفضل الروابط","no_links":"ما من روابط بعد.","most_liked_by":"أكثر المعجبين به","most_liked_users":"أكثر من أعجبه","most_replied_to_users":"أكثر من رد عليه","no_likes":"ما من إعجابات بعد.","top_categories":"أفضل الفئات","topics":"المواضيع","replies":"الردود"},"ip_address":{"title":"عنوان IP الأخير"},"registration_ip_address":{"title":"عنوان IP التسجيل"},"avatar":{"title":"صورة الملف الشخصي","header_title":"الملف الشخصي والرسائل والعلامات والتفضيلات"},"title":{"title":"عنوان","none":"(لا شيء)"},"primary_group":{"title":"المجموعة الأساسية","none":"(لا شيء)"},"filters":{"all":"الكل"},"stream":{"posted_by":"نُشرت بواسطة","sent_by":" أرسلت بواسطة","private_message":"رسالة","the_topic":"الموضوع"}},"loading":"يُحمّل...","errors":{"prev_page":"اثناء محاولة التحميل","reasons":{"network":"خطأ في الشبكة","server":"خطأ في الخادم","forbidden":"الوصول غير مصرح","unknown":"خطأ","not_found":"الصفحة غير متوفرة"},"desc":{"network":"من فضلك تحقق من اتصالك.","network_fixed":"أنت الآن متصل بالانترنت","server":"رمز الخطأ: %{status}","forbidden":"ليس مسموحًا لك عرض هذا.","not_found":"آخ، حاول التطبيق تحميل عنوان غير موجود.","unknown":"حدث خطب ما."},"buttons":{"back":"الرجوع","again":"أعد المحاولة","fixed":"حمل الصفحة"}},"modal":{"close":"أغلق","dismiss_error":"تجاهل الخطأ"},"close":"اغلق","assets_changed_confirm":"حُدث الموقع لتوّه. أتريد إنعاش الصفحة ورؤية أحدث إصدارة؟","logout":"خرجت بنجاح.","refresh":"تحديث","home":"الصفحة الرئيسية","read_only_mode":{"enabled":"هذا الموقع في وضع القراءة فقط. نأمل أن تواصل تصفّحه إلّا أن الردّ والإعجابات وغيرها من إعجابات ستكون معطّلة حاليًا.","login_disabled":"تسجيل الدخول معطل في حال كان الموقع في وضع القراءة فقط.","logout_disabled":"الخروج معطّل طالما الموقع بوضع القراءة فقط."},"logs_error_rate_notice":{},"learn_more":"اطّلع على المزيد...","all_time":"المجموع","all_time_desc":"عدد المواضيع المنشأة","year":"عام","year_desc":"المواضيع المكتوبة خلال 365 يوم الماضية","month":"شهر","month_desc":"المواضيع المكتوبة خلال 30 يوم الماضية","week":"أسبوع","week_desc":" المواضيع التي كتبت خلال 7 أيام الماضية","day":"يوم","first_post":"أوّل مشاركة","mute":"كتم","unmute":"إلغاء الكتم","last_post":"آخر مشاركة","local_time":"التوقيت المحلي","time_read":"المقروءة","time_read_recently":"حديثًا %{time_read}","time_read_tooltip":"إجمالي وقت القراءة هو %{time_read}","time_read_recently_tooltip":"إجمالي وقت القراءة هو %{time_read} (منها %{recent_time_read} خلال الستّين يومًا الماضية)","last_reply_lowercase":"آخر رد","replies_lowercase":{"zero":"الردود","one":"الردود","two":"الردود","few":"الردود","many":"الردود","other":"الردود"},"signup_cta":{"sign_up":"إنشاء حساب","hide_session":"ذكرني غدا","hide_forever":"لا شكرا","hidden_for_session":"لا بأس، سأسلك غدًا. يمكنك دوما استخدام 'تسجيل الدخول' لإنشاء حساب ايضا.","intro":"مرحبا! يبدو أنك تستمتع بالمناقشة، لكنك لم تسجل للحصول على حساب جديد حتى الآن.","value_prop":"حين تسجّل حسابًا نتذكّر بالضبط ما كنت تقرأه، فلا تخشَ من أن تعود ولا ترى ما كان أمامك البتّة. كما وستستلم الإخطارات (هنا وعبر البريد) متى ما ردّ أحدهم عليك. وطبعًا، يمكنك إبداء إعجابك بالمشاركات ومشاركة الجميع الشعور بالرفق. :heartpulse:"},"summary":{"enabled_description":"أنت تطالع ملخّصًا لهذا الموضوع، أي أكثر المنشورات الجديرة بالاهتمام حسب نظرة المجتمع.","description":"هناك \u003cb\u003e%{replyCount}\u003c/b\u003e من الردود.","description_time":"هناك \u003cb\u003e%{replyCount}\u003c/b\u003e من الردود، ووقت القراءة المتوقّع هو \u003cb\u003e%{readingTime} من الدّقائق\u003c/b\u003e.","enable":"لخّص هذا الموضوع","disable":"اعرض كلّ المشاركات"},"deleted_filter":{"enabled_description":"في هذا الموضوع مشاركات محذوفة قد أُخفيت.","disabled_description":"المشاركات المحذوفة في الموضوع معروضة.","enable":"أخفِ المشاركات المحذوفة","disable":"اعرض المشاركات المحذوفة"},"private_message_info":{"title":"رسالة","invite":"دعوة الآخرين...","edit":"أضِف أو أزِل...","remove":"أزِل...","add":"أضِف...","leave_message":"أمتأكّد من ترك هذه الرسالة؟","remove_allowed_user":"أمتأكّد من إزالة %{name} من هذه الرّسالة؟","remove_allowed_group":"أمتأكّد من إزالة %{name} من هذه الرّسالة؟"},"email":"البريد الإلكتروني","username":"اسم المستخدم","last_seen":"كان هنا","created":"انشات","created_lowercase":"انشات","trust_level":"مستوى الثقة","search_hint":"اسم المستخدم أو البريد إلكتروني أو عنوان الـ IP","create_account":{"disclaimer":"بالتسجيل، أنت توافق على \u003ca href='%{privacy_link}' target='blank'\u003eسياسة الخصوصية\u003c/a\u003e و \u003ca href='%{tos_link}' target='blank'\u003eشروط الخدمة\u003c/a\u003e.","title":"إنشاء حساب جديد","failed":"حدث خطب ما. قد يكون البريد الإلكتروني مسجّلًا بالفعل. جرّب رابط نسيان كلمة السر"},"forgot_password":{"title":"صفّر كلمة السر","action":"نسيتُ كلمة السر","invite":"أدخِل اسم المستخدم أو عنوان البريد وسنُرسل إليك بريدًا لتصفير كلمة السر.","reset":"صفّر كلمة السر","complete_username":"إن تطابق أحد الحسابات مع اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e فستستلم قريبًا بريدًا بإرشادات آلية تصفير كلمة السر.","complete_email":"إن تطابق أحد الحسابات مع \u003cb\u003e%{email}\u003c/b\u003e فستستلم قريبًا بريدًا بإرشادات آلية تصفير كلمة السر.","complete_username_found":"وجدنا حسابًا يُطابق اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e. ستستلم قريبًا بريدًا بإرشادات آلية تصفير كلمة السر.","complete_email_found":"وجدنا حسابًا يُطابق \u003cb\u003e%{email}\u003c/b\u003e. ستستلم قريبًا بريدًا بإرشادات آلية تصفير كلمة السر.","complete_username_not_found":"لا يوجد حساب يطابق اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"لا حساب يطابق \u003cb\u003e%{email}\u003c/b\u003e","help":"ألم يصل البريد بعد؟ تفحّص مجلد السخام أولًا.\u003cp\u003eألست متأكّدًا من العنوان الذي استعملته؟ أدخِل عنوان البريد الإلكتروني وسنُعلمك لو كان موجودًا هنا.\u003c/p\u003e\u003cp\u003eإن فقدت إمكانية الدخول على عنوان البريد المرتبط بحسابك، فمن فضلك راسِل \u003ca href='%{basePath}/about'\u003eطاقمنا الجاهز دومًا لمساعدتك.\u003c/a\u003e\u003c/p\u003e","button_ok":"حسنا","button_help":"مساعدة"},"email_login":{"link_label":"أبرِدني رابط ولوج","button_label":"مع البريد الإلكتروني","emoji":"قفل الرموز التعبيرية","complete_username":"إن تطابق أحد الحسابات مع اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e فسوف تستلم بريدًا قريبًا بإرشادات آلية تسجيل الدخول.","complete_email":"إذا تطابق أحد الحسابات مع \u003cb\u003e%{email}\u003c/b\u003e، فمن المفترض أن تتلقى بريدًا إلكترونيًا برابط تسجيل الدخول قريبًا.","complete_username_found":"وجدنا حسابًا يُطابق اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e. ستستلم قريبًا بريدًا بإرشادات آلية تسجيل الدخول.","complete_email_found":"وجدنا حسابًا يستخدم نفس البريد الإلكتروني \u003cb\u003e%{email}\u003c/b\u003e. ستستلم قريبًا بريدًا بإرشادات آلية تسجيل الدخول.","complete_username_not_found":"لا يوجد حساب يطابق اسم المستخدم \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"لا حساب يطابق \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"تابع إلى %{site_name}","logging_in_as":"تسجيل الدخول باسم %{email}","confirm_button":"إنهاء تسجيل الدخول"},"login":{"title":"تسجيل دخول","username":"اسم المستخدم","password":"كلمة السر","second_factor_title":"الاستيثاق بخطوتين","second_factor_description":"من فضلك أدخِل رمز الاستيثاق من التطبيق:","second_factor_backup":"لِج باستعمال رمز احتياطي","second_factor_backup_title":"النسخ الاحتياطي لـ الاستيثاق بعوامل عدة","second_factor_backup_description":"الرجاء إدخال أحد الرموز الاحتياطية الخاصة بك:","second_factor":"تسجيل الدخول باستخدام تطبيق Authenticator","security_key_description":"عند تجهيز مفتاح الأمان المادي، اضغط على زر المصادقة باستخدام مفتاح الأمان أدناه.","security_key_alternative":"جرب طريقة أخرى","security_key_authenticate":"المصادقة باستخدام مفتاح الأمان","security_key_not_allowed_error":"انتهت مهلة عملية تسجيل مفتاح الأمان أو تم إلغاؤها.","security_key_no_matching_credential_error":"لا يمكن العثور على بيانات اعتماد مطابقة في مفتاح الأمان المقدم.","security_key_support_missing_error":"جهازك الحالي أو متصفحك لا يدعم استخدام مفاتيح الأمان. يرجى استخدام طريقة مختلفة.","email_placeholder":"البريد الإلكتروني أو اسم المستخدم","caps_lock_warning":"مفتاح Caps Lock مفعّل","error":"خطأ مجهول","cookies_error":"يبدو أن ملفات تعريف الارتباط في متصفّحك معطلة. قد لا تكون قادراً على تسجيل الدخول دون تمكينهم أولاً.","rate_limit":"رجاء انتظر قبل تسجيل دخول مرة أخرى.","blank_username":"من فضلك أدخِل بريدك الإلكتروني أو اسم المستخدم.","blank_username_or_password":"من فضلك أدخِل بريدك الإلكتروني أو اسم المستخدم، وكلمة السر.","reset_password":"صفّر كلمة السر","logging_in":"تسجيل دخول...","or":"أو ","authenticating":"يوثق...","awaiting_activation":"ما زال حسابك غير مفعّل، استخدم رابط نسيان كلمة المرور لإرسال بريد إلكتروني تفعيلي آخر.","awaiting_approval":"لم يوافق أي من أعضاء طاقم العمل على حسابك بعد. سيُرسل إليك بريد إلكتروني حالما يتمّ ذلك.","requires_invite":"معذرةً، دخول هذا المنتدى بالدعوات فقط.","not_activated":"لا يمكنك تسجيل دخول بعد. لقد أرسلنا سابقًا بريدًا إلى \u003cb\u003e%{sentTo}\u003c/b\u003e. رجاء اتّبع الإرشادات فيه لتفعيل حسابك.","not_allowed_from_ip_address":"لا يمكنك الولوج من عنوان IP هذا.","admin_not_allowed_from_ip_address":"لا يمكنك تسجيل دخول كمدير من عنوان IP هذا.","resend_activation_email":"انقر هنا لإرسال رسالة التفعيل مرّة أخرى.","omniauth_disallow_totp":"تم تمكين المصادقة ذات العاملين في حسابك. يرجى تسجيل الدخول باستخدام كلمة المرور الخاصة بك.","resend_title":"اعد ارسال رسالة التفعيل","change_email":"غير عنوان البريد الالكتروني","provide_new_email":"ادخل عنوان بريد الكتروني جديد و سنقوم بأرسال لك بريد التأكيد.","submit_new_email":"حدث عنوان البريد الإلكتروني","sent_activation_email_again":"لقد أرسلنا بريد تفعيل آخر إلى \u003cb\u003e%{currentEmail}\u003c/b\u003e. قد يستغرق وصوله بضعة دقائق. تحقّق من مجلّد السبام.","sent_activation_email_again_generic":"لقد أرسلنا بريد تفعيل آخر إلى. قد يستغرق وصوله بضعة دقائق. تأكد من مراجعة مجلّد السبام.","to_continue":"رجاء سجل دخول","preferences":"عليك تسجل الدخول لتغيير تفضيلاتك الشخصية.","not_approved":"لم تتمّ الموافقة على حسابك بعد. سيصلك إشعار عبر البريد عندما تكون مستعدا لتسجيل الدخول.","google_oauth2":{"name":"غوغل","title":"عبر Google "},"twitter":{"name":"Twitter","title":"عبر Twitter"},"instagram":{"name":"إنستغرام","title":"عبر Instagram"},"facebook":{"name":"فيسبوك","title":"عبر Facebook"},"github":{"name":"غِت‌هَب","title":"عبر GitHub"},"discord":{"name":"دِسكورد","title":"مع ديسكورد"},"second_factor_toggle":{"totp":"استخدام تطبيق مصادقة بدلاً من ذلك","backup_code":"استخدام رمز النسخ الاحتياطي بدلاً من ذلك"}},"invites":{"accept_title":"دعوة","emoji":"رمز تعبيري مغلف","welcome_to":"مرحبًا بك في %{site_name}!","invited_by":"دعاك:","social_login_available":"يمكنك أيضًا الولوج عبر الشبكات الاجتماعية بهذا البريد.","your_email":"عنوان البريد لحسابك هو \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"اقبل الدعوة","success":"أُنشأ حسابك وولجت إليه.","name_label":"الاسم","password_label":"كلمة السر","optional_description":"(اختياري)"},"password_reset":{"continue":"تابع نحو %{site_name}"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","emoji_one":"JoyPixels (EmojiOne سابقًا)","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"الفئات فقط","categories_with_featured_topics":"أقسام ذات مواضيع مُميزة","categories_and_latest_topics":"الفئات والمواضيع الحديثة","categories_and_top_topics":"التصنيفات و أفضل المواضيع","categories_boxes":"صناديق مع التصنيفات الفرعية","categories_boxes_with_topics":"مربعات مع الموضوعات المميزة"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"أدخل"},"conditional_loading_section":{"loading":"يُحمّل..."},"category_row":{"topic_count":{"zero":"ما من مواضيع في هذه الفئة","one":"في هذه الفئة موضوع واحد","two":"في هذه الفئة موضوعين","few":"في هذه الفئة %{count} مواضيع","many":"في هذه الفئة %{count} موضوعًا","other":"في هذه الفئة %{count} موضوع"}},"select_kit":{"default_header_text":"اختر...","no_content":"لا يوجد نتائج مطابقة","filter_placeholder":"ابحث...","filter_placeholder_with_any":"ابحث أو أنشئً ...","create":"أنشِئ: ”%{content}“","max_content_reached":{"zero":"لا يمكنك تحديد أيّ عنصر.","one":"يمكنك تحديد عنصر واحد فقط كحدّ أقصى.","two":"يمكنك تحديد عنصرين فقط كحدّ أقصى.","few":"يمكنك تحديد %{count} عناصر فقط كحدّ أقصى.","many":"يمكنك تحديد %{count} عنصرًا فقط كحدّ أقصى.","other":"يمكنك تحديد %{count} عنصر فقط كحدّ أقصى."},"min_content_not_reached":{"zero":"لا تُحدّد أيّ شيء.","one":"حدّد عنصرًا واحدًا على الأقلّ.","two":"حدّد عنصرين على الأقلّ.","few":"حدّد %{count} عناصر على الأقلّ.","many":"حدّد %{count} عنصرًا على الأقلّ.","other":"حدّد %{count} عنصر على الأقلّ."},"invalid_selection_length":{"zero":"يجب ألّا تُحدّد شيئًا.","one":"يجب ألّا يقلّ التحديد عن محرف واحد.","two":"يجب ألّا يقلّ التحديد عن محرفين.","few":"يجب ألّا يقلّ التحديد عن %{count} محارف.","many":"يجب ألّا يقلّ التحديد عن %{count} محرفًا.","other":"يجب ألّا يقلّ التحديد عن %{count} محرف."},"components":{"categories_admin_dropdown":{"title":"أدِر الفئات"}}},"date_time_picker":{"from":"من","to":"إلى","errors":{"to_before_from":"يجب أن يكون تاريخ الانتهاء متأخراً عن التاريخ."}},"emoji_picker":{"filter_placeholder":"ابحث عن إيموجي","smileys_\u0026_emotion":"الابتسامات والعواطف","people_\u0026_body":"الأشخاص وأعضاء الجسم","animals_\u0026_nature":"الحيوانات والطبيعة","food_\u0026_drink":"الطعام والشراب","travel_\u0026_places":"السفر والأماكن","activities":"الأنشطة","objects":"الأشياء","symbols":"الرموز","flags":"الأعلام","recent":"المستعملة حديثًا","default_tone":"بلا لون بشرة","light_tone":"لون البشرة الفاتح","medium_light_tone":"لون البشرة القمحي","medium_tone":"لون بشرة الأسمر","medium_dark_tone":"لون البشرة الأسمر القاتم","dark_tone":"لون البشرة الداكن","default":"الإيموجي المخصّصة"},"shared_drafts":{"title":"المسودّات المشتركة","notice":"لا يظهر هذا الموضوع إلّا لمن يرى فئة \u003cb\u003e%{category}\u003c/b\u003e.","destination_category":"وجهة التصنيف","publish":"نشر المسودة المشتركة","confirm_publish":"أمتأكّد من نشر هذه المسودّة؟","publishing":"ينشر الموضوع..."},"composer":{"emoji":"الإيموجي :)","more_emoji":"أكثر...","options":"خيارات","whisper":"همس","unlist":"غير مدرج","add_warning":"هذا تحذير رسمي.","toggle_whisper":"تبديل الهمس","toggle_unlisted":"تبديل الغير مدرج","posting_not_on_topic":"أيّ موضوع تريد الردّ عليه؟","saved_local_draft_tip":"حُفظ محليا","similar_topics":"موضوعك يشابه...","drafts_offline":"مسودات محفوظة ","edit_conflict":"تعديل التعارض","group_mentioned_limit":{"zero":"\u003cb\u003eتحذير!\u003c/b\u003e أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، ولكن في هذه المجموعة أعضاء أكثر من حدّ الإشارة الأقصى الذي ضبطته الإدارة، وهو لا مستخدمين. لن يُرسل أيّ إخطار لأحد.","one":"\u003cb\u003eتحذير!\u003c/b\u003e أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، ولكن في هذه المجموعة أعضاء أكثر من حدّ الإشارة الأقصى الذي ضبطته الإدارة، وهو مستخدم واحد. لن يُرسل أيّ إخطار لأحد.","two":"\u003cb\u003eتحذير!\u003c/b\u003e أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، ولكن في هذه المجموعة أعضاء أكثر من حدّ الإشارة الأقصى الذي ضبطته الإدارة، وهو مستخدمين. لن يُرسل أيّ إخطار لأحد.","few":"\u003cb\u003eتحذير!\u003c/b\u003e أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، ولكن في هذه المجموعة أعضاء أكثر من حدّ الإشارة الأقصى الذي ضبطته الإدارة، وهو %{count} مستخدمين. لن يُرسل أيّ إخطار لأحد.","many":"\u003cb\u003eتحذير!\u003c/b\u003e أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، ولكن في هذه المجموعة أعضاء أكثر من حدّ الإشارة الأقصى الذي ضبطته الإدارة، وهو %{count} مستخدمًا. لن يُرسل أيّ إخطار لأحد.","other":"\u003cb\u003eتحذير!\u003c/b\u003e أشرت إلى \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e، ولكن في هذه المجموعة أعضاء أكثر من حدّ الإشارة الأقصى الذي ضبطته الإدارة، وهو %{count} مستخدم. لن يُرسل أيّ إخطار لأحد."},"group_mentioned":{"zero":"تعني بالإشارة إلى %{group} \u003ca href='%{group_link}'\u003eعدم إخطار أحد\u003c/a\u003e. أمتأكّد؟","one":"تعني بالإشارة إلى %{group} إخطار \u003ca href='%{group_link}'\u003eشخص واحد\u003c/a\u003e. أمتأكّد؟","two":"تعني بالإشارة إلى %{group} إخطار \u003ca href='%{group_link}'\u003eشخصين\u003c/a\u003e. أمتأكّد؟","few":"تعني بالإشارة إلى %{group} إخطار \u003ca href='%{group_link}'\u003e%{count} أشخاص\u003c/a\u003e. أمتأكّد؟","many":"تعني بالإشارة إلى %{group} إخطار \u003ca href='%{group_link}'\u003e%{count} شخصًا\u003c/a\u003e. أمتأكّد؟","other":"تعني بالإشارة إلى %{group} إخطار \u003ca href='%{group_link}'\u003e%{count} شخص\u003c/a\u003e– أمتأكّد؟"},"cannot_see_mention":{"category":"لقد أشرت إلى %{username} ولكن لن يصله الإخطار إذ لا يملك تصريح الوصول إلى هذه الفئة. عليك إضافته إلى إحدى المجموعات التي لها تصريح الوصول إلى الفئة المطلوبة.","private":"لقد أشرت إلى %{username} ولكن لن يصله الإخطار إذ لا يمكنه رؤية هذه الرسالة الشخصية. عليك دعوته إلى هذه الرسالة الخاصة."},"duplicate_link":"يظهر بأن الرابط الذي يُشير إلى \u003cb\u003e%{domain}\u003c/b\u003e نشره \u003cb\u003e@%{username}\u003c/b\u003e في الموضوع فعلًا في \u003ca href='%{post_url}'\u003eردّ بتاريخ %{ago}\u003c/a\u003e. أمتأكّد من نشره ثانيةً؟","reference_topic_title":"ردّ: %{title}","error":{"title_missing":"العنوان مطلوب","title_too_short":"العنوان يجب أن يكون علي الاقل %{min} حرف","title_too_long":"العنوان يجب أن لا يزيد عن %{max} حرف","post_missing":"لا يمكن أن تكون المشاركة فارغة","post_length":"المنشور يجب أن يكون علي الاقل %{min} حرف","try_like":"هل جرّبت نقر زر %{heart}؟","category_missing":"عليك اختيار فئة","tags_missing":{"zero":"عليك ألّا تختار أيّ وسم","one":"عليك اختيار وسم واحد على الأقلّ","two":"عليك اختيار وسمين على الأقلّ","few":"عليك اختيار %{count} وسوم على الأقلّ","many":"عليك اختيار %{count} وسمًا على الأقلّ","other":"عليك اختيار %{count} وسم على الأقلّ"},"topic_template_not_modified":"الرجاء إضافة التفاصيل وتفاصيل محددّة إلى موضوعك عن طريق تحرير قالب الموضوع."},"save_edit":"احفظ التعديل","overwrite_edit":"الكتابة فوق التعديل","reply_original":"التعليق على الموضوع الأصلي","reply_here":"الرد هنا","reply":"الرد","cancel":"ألغِ","create_topic":"إنشاء موضوع","create_pm":"أرسِل","create_whisper":"همس","create_shared_draft":"أنشِئ مسودّة مشتركة","edit_shared_draft":"عدّل المسودّة المشتركة","title":"أو اضغط Ctrl+Enter","users_placeholder":"أضف عضوا","title_placeholder":"بجملة واحدة، صف ما الذي تود المناقشة فية؟","title_or_link_placeholder":"اكتب عنوانًا أو ألصِق رابطًا هنا","edit_reason_placeholder":"ما سبب التعديل؟","topic_featured_link_placeholder":"ضع رابطاً يظهر مع العنوان","remove_featured_link":"أزِل الرابط من الموضوع","reply_placeholder":"اكتب ما تريد هنا. استعمل مارك‌داون أو BBCode أو HTML للتنسيق. اسحب الصور أو ألصِقها.","reply_placeholder_no_images":"اكتب ما تريد هنا. استعمل مارك‌داون أو BBCode أو HTML للتنسيق.","reply_placeholder_choose_category":"اختر فئةً قبل الكتابة هنا.","view_new_post":"اعرض مشاركتك الجديدة.","saving":"يحفظ","saved":"حُفظ!","saved_draft":"كنتَ تكتب مسودّة لمشاركة. انقر لمواصلتها.","uploading":"يرفع...","show_preview":"اعرض المعاينة \u0026raquo;","hide_preview":"\u0026laquo; أخفِ المعاينة","quote_post_title":"اقتبِس المشاركة كاملةً","bold_label":"B","bold_title":"عريض","bold_text":"نص عريض","italic_label":"I","italic_title":"مائل","italic_text":"نص مائل","link_title":"رابط","link_description":"أدخِل هنا وصف الرابط","link_dialog_title":"أضِف الرابط","link_optional_text":"عنوان اختياري","link_url_placeholder":"ألصِق عنوانًا أو اكتب للبحث في المواضيع","blockquote_title":"اقتبس الفقرة","blockquote_text":"اقتبس الفقرة","code_title":"نصّ مُنسّق سابقًا","code_text":"اضف 4 مسافات اول السطر قبل النص المنسق","paste_code_text":"اكتب أو ألصِق الكود هنا","upload_title":"ارفع","upload_description":"اكتب هنا وصف ما رفعته","olist_title":"قائمة مرقّمة","ulist_title":"قائمة منقّطة","list_item":"قائمة العناصر","toggle_direction":"بدّل الاتجاه","help":"مساعدة التعديل بنُسق مارك‌داون","collapse":"صغّر لوحة الكتابة","open":"افتح لوحة الكتابة","abandon":"أغلِق لوحة الكتابة وأهمِل المسودّة","enter_fullscreen":"لوحة الكتابة تملأ الشاشة","exit_fullscreen":"الخروج من ملء الشاشة","show_toolbar":"عرض شريط أدوات الكتابة","hide_toolbar":"إخفاء شريط أدوات الكتابة","modal_ok":"حسنا","modal_cancel":"ألغِ","cant_send_pm":"معذرةً، لا يمكنك الإرسال إلى %{username}.","yourself_confirm":{"title":"أنسيت إضافة المستلمين؟","body":"حاليًا، فهذه الرسالة لن تُرسل إلا إليك فقط!"},"slow_mode":{"error":"هذا الموضوع في الوضع البطيء. من أجل تعزيز مناقشة مدروسة، يمكنك النشر مرة واحدة فقط كل %{duration}."},"admin_options_title":"إعدادات طاقم العمل الاختيارية لهذا الموضوع","composer_actions":{"reply":"رد","draft":"مسودة","edit":"عدّل","reply_to_post":{"label":"الرد على منشور من %{postUsername}","desc":"الرد على مشاركة محددة"},"reply_as_new_topic":{"label":"الرد كموضوع مرتبط","desc":"إنشاء موضوع جديد مرتبط بهذا الموضوع","confirm":"لديك مسودة موضوع جديد تم حفظها، وسيتم استبدالها إذا أنشئت موضوع مرتبط."},"reply_as_new_group_message":{"label":"الرد برسالة في مجموعة جديدة","desc":"إنشاء رسالة خاصة جديدة مع نفس المستلمين"},"reply_as_private_message":{"label":"رسالة جديدة","desc":"اكتب رسالة شخصية جديدة"},"reply_to_topic":{"label":"الرد على الموضوع","desc":"الرد على الموضوع، ليس أي مشاركة محددة"},"toggle_whisper":{"label":"تبديل الهمس","desc":"تظهر النتائج لأعضاء طاقم الموقع فقط"},"create_topic":{"label":"موضوع جديد"},"shared_draft":{"label":"المسودّات المشتركة","desc":"مسودة الموضوع سيكون مرئيًا فقط للمستخدمين المسموح لهم"},"toggle_topic_bump":{"label":"تبديل الموضوع","desc":"الرد دون تغيير تاريخ الرد الأخير"}},"reload":"إعادة تحميل","ignore":"تجاهل","details_title":"الملخّص","details_text":"سيُخفى هذا النص"},"notifications":{"tooltip":{"regular":{"zero":"ما من إخطارات لم تُشاهدها","one":"ثمّة إخطار واحد لم تُشاهده","two":"ثمّة إخطاران لم تُشاهدهما","few":"ثمّة %{count} إخطارات لم تُشاهدها","many":"ثمّة %{count} إخطارًا لم تُشاهدها","other":"ثمّة %{count} إخطار لم تُشاهدها"},"message":{"zero":"ما من رسائل لم تقرأها","one":"ثمّة رسالة واحدة لم تقرأها","two":"ثمّة رسالتان لم تقرأهما","few":"ثمّة %{count} رسائل لم تقرأها","many":"ثمّة %{count} رسالة لم تقرأها","other":"ثمّة %{count} رسالة لم تقرأها"},"high_priority":{"zero":"ما من إخطارات بأولوية عالية لم تقرأها","one":"ثمّة إخطار واحد بأولوية عالية لم تقرأه","two":"ثمّة إخطاران بأولوية عالية لم تقرأهما","few":"ثمّة %{count} إخطارات بأولوية عالية لم تقرأها","many":"ثمّة %{count} إخطارًا بأولوية عالية لم تقرأها","other":"ثمّة %{count} إخطار بأولوية عالية لم تقرأها"}},"title":"إشعارات الإشارة إلى @اسمك، والردود على موضوعاتك و منشوراتك ، والرسائل، وغيرها","none":"تعذّر تحميل الإخطارات الآن.","empty":"ما من إخطارات.","post_approved":"حصلت مشاركتك على الموافقة","reviewable_items":"البنود التي تحتاج إلى مراجعة","mentioned":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","group_mentioned":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","quoted":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","bookmark_reminder":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","replied":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","posted":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","edited":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","liked":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_consolidated_description":{"zero":"لم تُعجبه أيّ مشاركة من مشاركاتك","one":"أعجبته مشاركة واحدة من مشاركاتك","two":"أعجبته مشاركتين من مشاركاتك","few":"أعجبته %{count} مشاركات من مشاركاتك","many":"أعجبته %{count} مشاركة من مشاركاتك","other":"أعجبته %{count} مشاركة من مشاركاتك"},"liked_consolidated":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","private_message":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","invited_to_private_message":"‏\u003cp\u003e\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","invited_to_topic":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","invitee_accepted":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e قَبِل دعوتك","moved_post":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e نقل %{description}","linked":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","granted_badge":"مُنحت شارة ”%{description}“","topic_reminder":"‏\u003cspan\u003e⁨%{username}⁩\u003c/span\u003e ‏%{description}","watching_first_post":"\u003cspan\u003eموضوع جديد\u003c/span\u003e: ‏%{description}","membership_request_consolidated":{"zero":"ما من طلبات عضوية إلى ”%{group_name}“","one":"ثمّة طلب عضوية واحد إلى ”%{group_name}“","two":"ثمّة طلبا عضوية إلى ”%{group_name}“","few":"ثمّة %{count} طلبات عضوية إلى ”%{group_name}“","many":"ثمّة %{count} طلب عضوية إلى ”%{group_name}“","other":"ثمّة %{count} طلب عضوية إلى ”%{group_name}“"},"group_message_summary":{"zero":"ما من رسائل في بريد %{group_name} الوارد","one":"في بريد %{group_name} الوارد رسالة واحدة","two":"في بريد %{group_name} الوارد رسالتان","few":"في بريد %{group_name} الوارد %{count} رسائل","many":"في بريد %{group_name} الوارد %{count} رسالة","other":"في بريد %{group_name} الوارد %{count} رسالة"},"popup":{"mentioned":"أشار %{username} إليك في ”%{topic}“ - ‏%{site_title}","group_mentioned":"أشار %{username} إليك في ”%{topic}“ - ‏%{site_title}","quoted":"اقتبس %{username} كلامك في ”%{topic}“ - ‏%{site_title}","replied":"ردّ %{username} عليك في ”%{topic}“ - ‏%{site_title}","posted":"نشر %{username} مشاركة في ”%{topic}“ - ‏%{site_title}","private_message":"أرسل %{username} إليك رسالة شخصية في ”%{topic}“ -‏ %{site_title}","linked":"%{username} وضع رابطا لمنشورك في \"%{topic}\" - %{site_title}","watching_first_post":"فتح %{username} موضوعًا جديدًا: ”%{topic}“ -‏ %{site_title}","confirm_title":"فُعّلت الإخطارات - %{site_title}"},"titles":{"mentioned":"أشار إليك","replied":"ردّ جديد","quoted":"اقتبس كلامك","liked":"إعجاب جديد","private_message":"رسالة خاصّة جديدة","invited_to_private_message":"دعاك إلى رسالة خاصة","invitee_accepted":"قَبِل الدعوة","posted":"مشاركة جديدة","granted_badge":"مُنحت شارة","invited_to_topic":"دُعيت إلى موضوع","watching_first_post":"موضوع جديد","reaction":"ردّ فعل جديد"}},"upload_selector":{"title":"أضف صورة","title_with_attachments":"أضف صورة أو ملفّ","from_my_computer":"من جهازي","from_the_web":"من الوبّ","remote_tip":"رابط لصورة","remote_tip_with_attachments":"رابط لصورة أو ملف %{authorized_extensions}","local_tip":"إختر صور من جهازك .","local_tip_with_attachments":"حدّد صورا أو ملفات من جهازك %{authorized_extensions}","hint":"(يمكنك أيضا السحب والإفلات في المحرر لرفعها)","hint_for_supported_browsers":"يمكنك أيضا سحب وإفلات الصور أو لصقها في المحرر","uploading":"يرفع","select_file":"اختر ملفا","default_image_alt_text":"صورة"},"search":{"sort_by":"رتب حسب","relevance":"الملاءمة","latest_post":"آخر المنشورات","latest_topic":"آخر الموضوعات","most_viewed":"الأكثر مشاهدة","most_liked":"الأكثر إعجابا","select_all":"أختر الكل","clear_all":"إلغ إختيار الكل","too_short":"عبارة البحث قصيرة جدًّا.","result_count":{"zero":"\u003cspan\u003eما من نتائج لِ‍\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","one":"\u003cspan\u003eنتيجة واحدة لِ‍\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","two":"\u003cspan\u003eنتيجتين لِ‍\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","few":"\u003cspan\u003e%{count} نتائج لِ‍\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","many":"\u003cspan\u003e%{count} نتيجة لِ‍\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count} نتيجة لِ‍\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"ابحث في المواضيع والمشاركات والمستخدمين والفئات","full_page_title":"ابحث في المواضيع أو المشاركات","no_results":"لا يوجد نتائج.","no_more_results":"لا يوجد نتائج أخرى.","post_format":"#%{post_number} كتبها %{username}","results_page":"نتائج البحث عن ”%{term}“","more_results":"يوجد عدد كبير من النتائج, يرجى تضييق نطاق البحث.","cant_find":"لا تستطيع ايجاد ما تبحث عنة؟","start_new_topic":"افتح موضوع جديد.","or_search_google":"او حاول البحث باستخدام google:","search_google":"حاول البحث باستخدام google:","search_google_button":"جوجل","context":{"user":"ابحث في منشورات @%{username}","category":"أبحث في قسم #%{category}","topic":"ابحث في هذا الموضوع","private_messages":"البحث في الرسائل الخاصة"},"advanced":{"title":"البحث المتقدّم","posted_by":{"label":"نشرها"},"in_category":{"label":"في الفئات"},"in_group":{"label":"في المجموعة"},"with_badge":{"label":"عليها شارة"},"with_tags":{"label":"بالوسوم"},"filters":{"label":"أعِد المواضيع/المشاركات التي...","title":"تتطابق في العنوان فقط","likes":"أعجبتني","posted":"شاركتُ فيها","created":"فتحتها","watching":"أراقبها","tracking":"أتابعها","bookmarks":"وضعت عليها علامة","first":"اول منشور في الموضوعات","pinned":"مثبتة","seen":"قراءته","unseen":"لم أقرأها","wiki":"من النوع wiki","all_tags":"كلّ الوسوم أعلاه"},"statuses":{"label":"بشرط أن تكون المواضيع","open":"مفتوحة","closed":"مُغلقة","public":"معروضة للعموم","archived":"مُؤرشفة","noreplies":"ليس فيها أيّ ردّ","single_user":"تحتوي عضوا واحدا"},"post":{"count":{"label":"عدد المشاركات"},"min":{"placeholder":"الأدنى"},"max":{"placeholder":"الأقصى"},"time":{"label":"نُشرت","before":"قبل","after":"بعد"}},"min_views":{"placeholder":"الأدنى"},"max_views":{"placeholder":"الأقصى"}}},"hamburger_menu":"إنتقل إلى قائمة موضوعات أو قسم أخر.","new_item":"جديد","go_back":"الرجوع","not_logged_in_user":"صفحة المستخدم مع ملخص عن نشاطه و إعداداته","current_user":"الذهاب إلى صفحتك الشخصية","topics":{"new_messages_marker":"منذ آخر زيارة","bulk":{"select_all":"حدّد الكلّ","clear_all":"مسح الكل","unlist_topics":"ازل الموضوعات من القائمة","relist_topics":"ادرج الموضوعات بالقائمة","reset_read":"عين كغير مقروءة","delete":"أحذف الموضوعات","dismiss":"تجاهل","dismiss_read":"تجاهل المنشورات غير المقروءة","dismiss_button":"تجاهل...","dismiss_tooltip":"تجاهل فقط المنشورات الجديدة او توقف عن تتبع الموضوعات","also_dismiss_topics":"التوقف عن متابعه الموضوعات حتي لا تظهر كغير مقروءة مره اخرى ","dismiss_new":"تجاهل الجديد","toggle":"إيقاف/تشغيل التحديد الكمي للموضوعات","actions":"عمليات تنفذ دفعة واحدة","change_category":"حدد القسم","close_topics":"إغلاق الموضوعات","archive_topics":"أرشفة الموضوعات","notification_level":"الاشعارات","choose_new_category":"اختر القسم الجديد للموضوعات:","selected":{"zero":"لم تحدّد أيّ موضوع.","one":"حدّدت موضوعًا \u003cb\u003eواحدًا\u003c/b\u003e.","two":"حدّدت \u003cb\u003eموضوعين\u003c/b\u003e.","few":"حدّدت \u003cb\u003e%{count}\u003c/b\u003e مواضيع.","many":"حدّدت \u003cb\u003e%{count}\u003c/b\u003e موضوعًا.","other":"حدّدت \u003cb\u003e%{count}\u003c/b\u003e موضوع."},"change_tags":"غيّر الأوسمة","append_tags":"اضف الأوسمة","choose_new_tags":"اختر الوسوم الجديدة لهذه المواضيع:","choose_append_tags":"اختر الوسوم الجديدة لإضافتها إلى هذه المواضيع:","changed_tags":"تغيّرت وسوم هذه المواضيع."},"none":{"unread":"ليست هناك مواضيع غير مقروءة.","new":"ليست هناك مواضيع جديدة.","read":"لم تقرأ أيّ موضوع بعد.","posted":"لم تشارك في أيّ موضوع بعد.","bookmarks":"لا مواضيع معلّمة بعد.","category":"ما من مواضيع في فئة ”%{category}“.","top":"ما من مواضيع نشطة.","educate":{"unread":"\u003cp\u003eتظهر المواضيع غير المقروءة هنا.\u003c/p\u003e\u003cp\u003eتكون المواضيع (مبدئيًا) غير مقروءة وتعرض أعداد \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e غير مقروءة إن:\u003c/p\u003e\u003cul\u003e\u003cli\u003eكتبت الموضوع\u003c/li\u003e\u003cli\u003eرددت على موضوع\u003c/li\u003e\u003cli\u003eقرأت الموضوع لمدّة أربع دقائق فأكثر\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eأو أنّك ضبطت الموضوع ليُراقب أو يُتابع عبر زرّ التحكّم بالإخطارات أسفل كلّ موضوع.\u003c/p\u003e\u003cp\u003eإن أردت تعديل هذا السلوك، فزُر \u003ca href=\"%{userPrefsUrl}\"\u003eتفضيلاتك\u003c/a\u003e.\u003c/p\u003e"}},"bottom":{"latest":"ما من مواضيع أخرى حديثة.","posted":"ما من مواضيع أخرى منشورة.","read":"ما من مواضيع أخرى مقروءة.","new":"ما من مواضيع أخرى جديدة.","unread":"ما من مواضيع أخرى غير مقروءة.","category":"ما من مواضيع أخرى في فئة ”%{category}“.","top":"ما من مواضيع أخرى نشطة.","bookmarks":"ما من مواضيع أخرى عليها علامة."}},"topic":{"filter_to":{"zero":"ما من مشاركات في الموضوع","one":"في الموضوع مشاركة واحدة","two":"في الموضوع مشاركتين","few":"في الموضوع %{count} مشاركات","many":"في الموضوع %{count} مشاركة","other":"في الموضوع %{count} مشاركة"},"create":"موضوع جديد","create_long":"كتابة موضوع جديد","open_draft":"افتح المسودّة","private_message":"أرسل رسالة خاصة","archive_message":{"help":"انقل الرسالة للأرشيف لديك","title":"إلى الأرشيف"},"move_to_inbox":{"title":"انقل إلى البريد الوارد","help":"انقل الرسالة للبريد الوارد"},"edit_message":{"title":"عدّل"},"defer":{"help":"علّمها بِ‍”غير مقروءة“","title":"تأجيل"},"list":"الموضوعات","new":"موضوع جديد","unread":"غير مقروء","new_topics":{"zero":"ما من مواضيع جديدة","one":"موضوع واحد جديد","two":"موضوعان جديدان","few":"%{count} مواضيع جديدة","many":"%{count} موضوعًا جديدًا","other":"%{count} موضوع جديد"},"unread_topics":{"zero":"ما من مواضيع غير مقروءة","one":"موضوع واحد غير مقروء","two":"موضوعان غير مقروءان","few":"%{count} مواضيع غير مقروءة","many":"%{count} موضوعًا غير مقروء","other":"%{count} موضوع غير مقروء"},"title":"الموضوع","invalid_access":{"title":"الموضوع خاص","description":"معذرةً، لا تملك التصريح الكافي لهذا الموضوع!","login_required":"عليك تسجيل الدخول لرؤية هذا الموضوع."},"server_error":{"title":"فشل تحميل الموضوع","description":"عذرا، تعذر علينا تحميل هذا الموضوع، قد يرجع ذلك إلى مشكلة بالاتصال. من فضلك حاول مجددا. أخبرنا بالمشكلة إن استمر حدوثها."},"not_found":{"title":"لم يُعثر على الموضوع","description":"معذرةً، لم نجد هذا الموضوع. لربّما أزاله أحد المشرفين؟"},"total_unread_posts":{"zero":"ما من مشاركات غير مقروءة في هذا الموضوع","one":"لديك مشاركة واحدة غير مقروءة في هذا الموضوع","two":"لديك مشاركتين غير مقروءتين في هذا الموضوع","few":"لديك %{count} مشاركات غير مقروءة في هذا الموضوع","many":"لديك %{count} مشاركة غير مقروءة في هذا الموضوع","other":"لديك %{count} مشاركة غير مقروءة في هذا الموضوع"},"unread_posts":{"zero":"ما من مشاركات قديمة غير مقروءة في هذا الموضوع","one":"لديك مشاركة واحدة قديمة غير مقروءة في هذا الموضوع","two":"لديك مشاركتين قديمتين غير مقروءتين في هذا الموضوع","few":"لديك %{count} مشاركات قديمة غير مقروءة في هذا الموضوع","many":"لديك %{count} مشاركة قديمة غير مقروءة في هذا الموضوع","other":"لديك %{count} مشاركة قديمة غير مقروءة في هذا الموضوع"},"new_posts":{"zero":"ما من مشاركات جديدة في هذا الموضوع مذ قرأته آخر مرة","one":"في هذا الموضوع مشاركة واحدة جديدة مذ قرأته آخر مرة","two":"في هذا الموضوع مشاركتين جديدتين مذ قرأته آخر مرة","few":"في هذا الموضوع %{count} مشاركات جديدة مذ قرأته آخر مرة","many":"في هذا الموضوع %{count} مشاركة جديدة مذ قرأته آخر مرة","other":"في هذا الموضوع %{count} مشاركة جديدة مذ قرأته آخر مرة"},"likes":{"zero":"ما من إعجابات في هذا الموضوع","one":"في هذا الموضوع إعجاب واحد","two":"في هذا الموضوع إعجابين","few":"في هذا الموضوع %{count} إعجابات","many":"في هذا الموضوع %{count} إعجابًا","other":"في هذا الموضوع %{count} إعجاب"},"back_to_list":"عد إلى قائمة الموضوعات","options":"خيارات الموضوعات","show_links":"اظهر الروابط في هذا الموضوع","toggle_information":"أظهر/أخف تفاصيل الموضوع","read_more_in_category":"أتريد قراءة المزيد؟ تصفح المواضيع الأخرى في %{catLink} أو %{latestLink}.","read_more":"أتريد قراءة المزيد؟ %{catLink} أو %{latestLink}.","unread_indicator":"لم يقرأ أيّ عضو بعد آخر مشاركة في هذا الموضوع.","browse_all_categories":"تصفّح كلّ الفئات","browse_all_tags":"تصفّح كلّ الوسوم","view_latest_topics":"اعرض أحدث المواضيع","jump_reply_up":"انتقل إلى هذا الردّ بالأعلى","jump_reply_down":"انتقل إلى هذا الردّ بالأسفل","deleted":"الموضوع محذوف","slow_mode_update":{"title":"الوضع البطيء","select":"لا يمكن للمستخدمين نشر المشاركات في هذا الموضوع إلا مرّة كلّ:","remove":"عطّل","durations":{"15_minutes":"15 دقيقة","1_hour":"ساعة واحدة","4_hours":"4 ساعات","1_day":"يوم واحد","1_week":"أسبوع واحد"}},"slow_mode_notice":{"duration":"عليك الانتظار %{duration} قبل المشاركة في هذا الموضوع"},"topic_status_update":{"save":"ضع مؤقت","num_of_hours":"عدد الساعات:","remove":"ازل المؤقت","publish_to":"انشر في:","when":"متى:"},"auto_update_input":{"none":"تحديد إطار زمني","now":"الآن","later_today":"في وقت لاحق اليوم","tomorrow":"غداً","later_this_week":"في وقت لاحق هذا الاسبوع","this_weekend":"هذا الأسبوع","next_week":"الاسبوع القادم","two_weeks":"أسبوعان","next_month":"الشهر القادم","two_months":"شهرين","three_months":"ثلاثة أشهر","four_months":"أربعة أشهر","six_months":"ستة أشهر","one_year":"سنة واحدة","forever":"للأبد","pick_date_and_time":"اختر التاريخ والوقت","set_based_on_last_post":"أغلِقه حسب آخر مشاركة"},"publish_to_category":{"title":"جدولة النشر"},"temp_open":{"title":"افتح الموضوع مؤقتا"},"auto_reopen":{"title":"افتح الموضوع بشكل تلقائي"},"temp_close":{"title":"اغلق الموضوع مؤقتا"},"auto_close":{"title":"اغلق الموضوع بشكل تلقائي","label":"اغلق الموضوع بشكل تلقائي بعد:","error":"من فضلك ادخل قيمة صالحة.","based_on_last_post":"لا تُغلقه إلى أن تمضي هذه الفترة على آخر مشاركة في الموضوع."},"auto_delete":{"title":"احذف الموضوع بشكل تلقائي"},"auto_bump":{"title":"تقطيع تلقائي لموضوع"},"reminder":{"title":"ذكرني"},"auto_delete_replies":{"title":"حذف الردود تلقائياً"},"status_update_notice":{"auto_open":"سيُفتح هذا الموضوع آليًّا %{timeLeft}.","auto_close":"سيُغلق هذا الموضوع آليًّا %{timeLeft}.","auto_publish_to_category":"سيُنشر هذا الموضوع في\u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_based_on_last_post":"سيُغلق هذا الموضوع %{duration} بعد آخر ردّ فيه.","auto_delete":"هذا الموضوع سوف يحذف تلقائيا %{timeLeft}.","auto_bump":"هذا الموضوع سوف يقطّع تلقائيا %{timeLeft}.","auto_reminder":"سوف يتم تذكيرك بهذا الموضوع %{timeLeft}.","auto_delete_replies":"تُحذف الردود على هذا الموضوع تلقائيًا بعد %{duration}."},"auto_close_title":"إعدادات الإغلاق الآلي","auto_close_immediate":{"zero":"مضت أقلّ من ساعة فعلًا على آخر مشاركة في الموضوع، ولذا فسيُغلق الموضوع حالًا.","one":"مضت ساعة واحدة فعلًا على آخر مشاركة في الموضوع، ولذا فسيُغلق الموضوع حالًا.","two":"مضت ساعتين فعلًا على آخر مشاركة في الموضوع، ولذا فسيُغلق الموضوع حالًا.","few":"مضت %{count} ساعات فعلًا على آخر مشاركة في الموضوع، ولذا فسيُغلق الموضوع حالًا.","many":"مضت %{count} ساعة فعلًا على آخر مشاركة في الموضوع، ولذا فسيُغلق الموضوع حالًا.","other":"مضت %{count} ساعة فعلًا على آخر مشاركة في الموضوع، ولذا فسيُغلق الموضوع حالًا."},"timeline":{"back":"عُد إلى هنا","back_description":"عد إلى آخر منشور غير مقروء","replies_short":"%{current} / %{total}"},"progress":{"title":"حالة الموضوع","go_top":"أعلى","go_bottom":"أسفل","go":"اذهب","jump_bottom":"انتقل لآخر منشور","jump_prompt":"انتقل إلى...","jump_prompt_of":"من %{count} منشورات","jump_prompt_long":"انتقل إلى...","jump_bottom_with_number":"انتقل إلى المشاركة رقم %{post_number}","jump_prompt_to_date":"إلى التاريخ","jump_prompt_or":"أو","total":"مجموع المنشورات","current":"المنشورات الحالية"},"notifications":{"title":"غير معدل الاشعارات التي تصلك من هذا الموضوع","reasons":{"mailing_list_mode":"وضع القائمة البريدية لديك مفعّل، لذلك ستصلك إشعارات بالردود على هذا الموضوع عبر البريد الإلكتروني.","3_10":"ستصلك إشعارات لأنك تراقب وسما يحملة هذا الموضوع.","3_6":"ستصلك إشعارات لأنك تراقب هذا القسم.","3_5":"ستصلك إشعارات لأنك تحولت لمراقبة هذا الموضوع آليا.","3_2":"ستصلك إشعارات لأنك تراقب هذا الموضوع.","3_1":"ستصلك إشعارات لأنك أنشأت هذا الموضوع.","3":"ستصلك إشعارات لأنك تراقب هذا الموضوع.","2_8":"سوف تشاهد عداد للردود الجديدة لانك تتابع هذا القسم.","2_4":"سترى عدّادًا بالردود الجديدة لأنّك نشرت ردًا في هذا الموضوع.","2_2":"سوف تشاهد عداد للردود الجديدة لانك تتابع هذا الموضوع.","2":"سترى عدّادًا بالردود الجديدة لأنّك \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eقرأت هذا الموضوع\u003c/a\u003e.","1_2":"سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك.","1":"سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك.","0_7":"لن يصلك أي إشعار يخص هذا القسم.","0_2":"لن يصلك أي إشعار يخص هذا الموضوع بناء على طلبك.","0":"لن يصلك أي إشعار يخص هذا الموضوع بناء على طلبك."},"watching_pm":{"title":"مُراقب","description":"سنُرسل إليك إخطارًا بكلّ ردّ جديد في هذه الرسالة، وسترى عدّادًا للردود الجديدة."},"watching":{"title":"مراقَب","description":"سنُرسل إليك إخطارًا بكلّ ردّ جديد في هذا الموضوع، وسترى عدّادًا للردود الجديدة."},"tracking_pm":{"title":"مُتابع","description":"سيظهر عدّاد للردود الجديدة في هذه الرسالة. سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك."},"tracking":{"title":"متابَع","description":"سيظهر عدّاد للردود الجديدة في هذا الموضوع. سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك."},"regular":{"title":"عادي","description":"سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك."},"regular_pm":{"title":"عادي","description":"سنُرسل إليك إخطارًا إن أشار أحد إلى @اسمك أو ردّ عليك."},"muted_pm":{"title":"مكتوم","description":"لن نُرسل أيّ إخطارات عن ما يخصّ هذه الرسالة."},"muted":{"title":"مكتوم","description":"لن نُرسل أيّ إخطارات عن ما يخصّ هذا الموضوع، كما ولن يظهر في المواضيع الحديثة."}},"actions":{"title":"الإجراءات","recover":"إلغاء حذف الموضوع","delete":"احذف الموضوع","open":"افتح الموضوع","close":"أغلق الموضوع","multi_select":"حدد المنشورات...","slow_mode":"فعّل الوضع البطيء","timed_update":"ضع مؤقت للموضوع...","pin":"ثبّت الموضوع...","unpin":"ألغِ تثبيت الموضوع","unarchive":"أخرج الموضوع من الأرشيف","archive":"أرشف الموضوع","invisible":"إزل من القائمة","visible":"إضاف إلي القائمة","reset_read":"تصفير بيانات القراءة","make_public":"اجعل الموضوع للعموم","make_private":"أنشئ رسالة خاصة","reset_bump_date":"إعادة تعيين تاريخ التقطيع"},"feature":{"pin":"تثبيت الموضوع","unpin":"إلغاء تثبيت الموضوع","pin_globally":"تثبيت الموضوع على عموم الموقع","make_banner":"اجعلة إعلان","remove_banner":"ازل الإعلان"},"reply":{"title":"رُدّ","help":"اكتب ردًا على هذه الموضوع"},"clear_pin":{"title":"إلغاء التثبيت","help":"إلغاء تثبيت الموضوع حتى لا يظهر في أعلى القائمة"},"share":{"title":"مشاركة","extended_title":"شارِك رابطًا","help":"شارِك رابط هذا الموضوع"},"print":{"title":"اطبع","help":"افتح نسخة متوافقة مع الطابعة من هذا الموضوع"},"flag_topic":{"title":"أبلغ","help":"بلَغ عن هذا الموضوع او ارسل تنبيه خاص لأدارة الموقع.","success_message":"لقد أبلغت عن هذا الموضوع بنجاح."},"make_public":{"title":"حوّله إلى موضوع عمومي","choose_category":"من فضلك اختر فئة الموضوع العمومي:"},"feature_topic":{"title":"مميز هذا الموضوع","pin":"اجعل هذا الموضوع يظهر أعلى قسم %{categoryLink} حتى","unpin":"أزل هذا الموضوع من أعلى قسم \"%{categoryLink}\".","unpin_until":"أزل هذا الموضوع من أعلى قسم \"%{categoryLink}\" أو انتظر حتى \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"الاعضاء يستطعون إزالة تثبيت الموضوع لأنفسهم.","pin_validation":"التاريخ مطلوب لتثبيت هذا الموضوع.","not_pinned":"ما من مواضيع مثبّتة في %{categoryLink}.","already_pinned":{"zero":"المواضيع المثبّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","one":"المواضيع المثبّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"المواضيع المثبّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"المواضيع المثبّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"المواضيع المثبّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"المواضيع المثبّتة حاليًا في %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"اعرض هذا الموضوع أعلى كل قوائم الموضوعات حتى","confirm_pin_globally":{"zero":"لم تُثبّت أيّ موضوع عموميًا. قد تشكّل كثرة المواضيع المثبّتة مصدر إزعاج للمستخدمين الجدد والمجهولين. أمتأكّد من تثبيت موضوع آخر عموميًا؟","one":"ثبّتّ موضوعًا واحدًا عموميًا فعلًا. قد تشكّل كثرة المواضيع المثبّتة مصدر إزعاج للمستخدمين الجدد والمجهولين. أمتأكّد من تثبيت موضوع آخر عموميًا؟","two":"ثبّتّ موضوعين عموميين فعلًا. قد تشكّل كثرة المواضيع المثبّتة مصدر إزعاج للمستخدمين الجدد والمجهولين. أمتأكّد من تثبيت موضوع آخر عموميًا؟","few":"ثبّتّ %{count} مواضيع عمومية فعلًا. قد تشكّل كثرة المواضيع المثبّتة مصدر إزعاج للمستخدمين الجدد والمجهولين. أمتأكّد من تثبيت موضوع آخر عموميًا؟","many":"ثبّتّ %{count} موضوعًا عموميًا فعلًا. قد تشكّل كثرة المواضيع المثبّتة مصدر إزعاج للمستخدمين الجدد والمجهولين. أمتأكّد من تثبيت موضوع آخر عموميًا؟","other":"ثبّتّ %{count} موضوع عموميًا فعلًا. قد تشكّل كثرة المواضيع المثبّتة مصدر إزعاج للمستخدمين الجدد والمجهولين. أمتأكّد من تثبيت موضوع آخر عموميًا؟"},"unpin_globally":"أزل هذا الموضوع من أعلى كل قوائم الموضوعات.","unpin_globally_until":"أزل هذا الموضوع من أعلى قوائم الموضوعات أو انتظر حتى \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"يمكن للاعضاء إذالة تثبيت الموضوع لأنفسهم. ","not_pinned_globally":"ما من مواضيع مثبّتة للعموم.","already_pinned_globally":{"zero":"المواضيع المثبّتة حاليًا عموميًا: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","one":"المواضيع المثبّتة حاليًا عموميًا: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"المواضيع المثبّتة حاليًا عموميًا: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"المواضيع المثبّتة حاليًا عموميًا: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"المواضيع المثبّتة حاليًا عموميًا: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"المواضيع المثبّتة حاليًا عموميًا: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"اجعل هذا الموضوع إعلانا يظهر أعلى كل الصفحات.","remove_banner":"أزل الإعلان الذي يظهر أعلى كل الصفحات.","banner_note":"الأعضاء يستطيعون تجاهل الموضوع المثبت كإعلان بإغلاقه. لا تمكن تعيين اكثر من موضوع في نفس الوقت كإعلان.","no_banner_exists":"لا يوجد اعلانات","banner_exists":"\u003cstrong class='badge badge-notification unread'\u003eيوجد\u003c/strong\u003e حاليا إعلان"},"inviting":"دعوة...","automatically_add_to_groups":"هذه الدعوة تشتمل ايضا الوصول الى هذه المجموعات:","invite_private":{"title":"رسالة دعوة","email_or_username":"دعوات عن طريق البريد الإلكتروني او اسم المستخدم","email_or_username_placeholder":"البريد الإلكتروني أو إسم المستخدم","action":"دعوة","success":"لقد دعونا ذلك العضو للمشاركة في هذه الرسالة.","success_group":"لقد دعونا تلك المجموعة للمشاركة في هذه الرسالة.","error":"معذرةً، حدث عُطل أثناء دعوة هذا المستخدم.","not_allowed":"معذرةً، لا يمكنك دعوة هذا المستخدم.","group_name":"اسم المجموعة"},"controls":"لوحة تحكم الموضوع","invite_reply":{"title":"دعوة","username_placeholder":"اسم المستخدم","action":"أرسل دعوة","help":"دعوة الآخرين إلى هذا الموضوع عبر البريد الإلكتروني أو الإشعارات","to_forum":"سنُرسل بريد إلكترني يتيح لصديقك الانضمام مباشرةً بنقر رابط فيه، تسجيل الدخول غير مطلوب.","sso_enabled":"أدخِل اسم المستخدم لمَن تريد دعوته إلى هذا الموضوع.","to_topic_blank":"أدخِل اسم المستخدم (أو عنوان بريده) لمَن تريد دعوته إلى هذا الموضوع.","to_topic_email":"لقد أدخلت عنوان بريد إلكترونيّ. سنرسل بريدً إلكترونياً يحتوي دعوة تتيح لصديقك الرّد مباشرة على هذا الموضوع.","to_topic_username":"لقد أدخلت اسم مستخدم. سنرسل إشعارًا يحتوي رابطًا يدعوهم إلى هذا الموضوع.","to_username":"أدخِل اسم المستخدم لمَن تريد دعوته. سنُرسل إليه إخطارًا بالرابط الذي يدعوه إلى هذا الموضوع.","email_placeholder":"name@example.com","success_email":"أرسلنا دعوة إلى \u003cb\u003e%{emailOrUsername}\u003c/b\u003e بالبريد. سنُرسل إليك إخطارًا متى قَبِل الدعوة. طالِع لسان الدعوات في صفحة المستخدم عندك لتتابع دعواتك المُرسلة.","success_username":"دعونا هذا العضو للمشاركة في هذا الموضوع.","error":"معذرةً، لم نستطع دعوة هذا الشخص. لربّما دعيته من قبل؟ (معدّل إرسال الدعوات محدود)","success_existing_email":"العضو ذو عنوان البريد الإلكتروني \u003cb\u003e%{emailOrUsername}\u003c/b\u003e مسجل بالفعل. لقد قمنا بدعوتة للمشاركة بهذا الموضوع."},"login_reply":"عليك تسجيل الدخول للرد","filters":{"n_posts":{"zero":"ما من مشاركات منشورات","one":"مشاركة واحدة","two":"مشاركتان","few":"%{count} مشاركات","many":"%{count} مشاركة","other":"%{count} مشاركة"},"cancel":"ألغِ الترشيح"},"move_to":{"title":"نقل إلى","action":"نقل إلى","error":"حدث عُطل أثناء نقل المشاركات."},"split_topic":{"title":"نقل الى موضوع جديد","action":"نقل الى موضوع جديد","topic_name":"عنوان موضوع جديد","radio_label":"موضوع جديد","error":"حدث عطل أثناء نقل المنشورات إلى موضوع جديد.","instructions":{"zero":"تُوشك على فتح موضوع جديد ولكنّك لم تحدّد أيّ مشاركة لضخّه بها.","one":"تُوشك على فتح موضوع جديد وضخّه بالمشاركة التي حدّدتها.","two":"تُوشك على فتح موضوع جديد وضخّه بالمشاركتين اللتين حدّدتهما.","few":"تُوشك على فتح موضوع جديد وضخّه ب‍ \u003cb\u003e%{count}\u003c/b\u003e مشاركات حدّدتها.","many":"تُوشك على فتح موضوع جديد وضخّه ب‍ \u003cb\u003e%{count}\u003c/b\u003e مشاركة حدّدتها.","other":"تُوشك على فتح موضوع جديد وضخّه ب‍ \u003cb\u003e%{count}\u003c/b\u003e مشاركة حدّدتها."}},"merge_topic":{"title":"نقل الى موضوع موجود","action":"نقل الى موضوع موجود","error":"حدث عطل أثناء نقل المنشورات إلى الموضوع ذاك.","radio_label":"الموضوع الحالي","instructions":{"zero":"لم تحدّد أيّ مشاركات لنقلها إلى موضوع آخر.","one":"من فضلك اختر الموضوع لنقل المشاركة هذه إليه.","two":"من فضلك اختر الموضوع لنقل المشاركتين هتين إليه.","few":"من فضلك اختر الموضوع لنقل المشاركات ال‍ \u003cb\u003e%{count}\u003c/b\u003e إليه.","many":"من فضلك اختر الموضوع لنقل المشاركات ال‍ \u003cb\u003e%{count}\u003c/b\u003e إليه.","other":"من فضلك اختر الموضوع لنقل المشاركات ال‍ \u003cb\u003e%{count}\u003c/b\u003e إليه."}},"move_to_new_message":{"title":"نقل إلى رسالة جديدة","action":"نقل إلى رسالة جديدة","message_title":"عنوان الرسالة الجديدة","radio_label":"رسالة جديدة","participants":"المشاركين","instructions":{"zero":"تُوشك على كتابة رسالة جديدة ولكنّك لم تحدّد أيّ مشاركة لضخّها بها.","one":"تُوشك على كتابة رسالة جديدة وضخّها بالمشاركة التي حدّدتها.","two":"تُوشك على كتابة رسالة جديدة وضخّها بالمشاركتين اللتين حدّدتهما.","few":"تُوشك على كتابة رسالة جديدة وضخّها ب‍ \u003cb\u003e%{count}\u003c/b\u003e مشاركات حدّدتها.","many":"تُوشك على كتابة رسالة جديدة وضخّها ب‍ \u003cb\u003e%{count}\u003c/b\u003e مشاركة حدّدتها.","other":"تُوشك على كتابة رسالة جديدة وضخّها ب‍ \u003cb\u003e%{count}\u003c/b\u003e مشاركة حدّدتها."}},"move_to_existing_message":{"title":"الانتقال إلى الرسالة الموجودة","action":"الانتقال إلى الرسالة الموجودة","radio_label":"الرسالة الحالية","participants":"المشاركين","instructions":{"zero":"لم تحدّد أيّ مشاركات لنقلها إلى رسالة أخرى.","one":"من فضلك اختر الرسالة لنقل المشاركة هذه إليها.","two":"من فضلك اختر الرسالة لنقل المشاركتين هتين إليها.","few":"من فضلك اختر الرسالة لنقل المشاركات ال‍ \u003cb\u003e%{count}\u003c/b\u003e إليها.","many":"من فضلك اختر الرسالة لنقل المشاركات ال‍ \u003cb\u003e%{count}\u003c/b\u003e إليها.","other":"من فضلك اختر الرسالة لنقل المشاركات ال‍ \u003cb\u003e%{count}\u003c/b\u003e إليها."}},"merge_posts":{"title":"ادمج المنشورات المحدّدة","action":"ادمج المنشورات المحددة","error":"حدث عطل أثناء دمج المنشورات المحدّدة."},"publish_page":{"title":"الصفحة المنشورة","publish":"نشر","description":"عندما يتم نشر موضوع كصفحة، يمكن مشاركة عنوان URL الرابط الخاص به وسيتم عرضه بتصميم مخصص.","slug":"عنوان الرابط","public":"عامة","public_description":"يمكن للناس رؤية هذه الصفحة حتّى لو كان الموضوع المرتبط خاصًا.","publish_url":"نُشرت صفحتك بتاريخ:","topic_published":"نُشر موضوعك بتاريخ:","preview_url":"ستُنشر صفحتك بتاريخ:","invalid_slug":"معذرةً، لا يمكنك نشر هذه الصفحة.","unpublish":"إلغاء النشر","unpublished":"تم إلغاء نشر صفحتك ولم يعد الوصول إليها ممكنًا.","publishing_settings":"إعدادات النشر"},"change_owner":{"title":"غيّر المالك","action":"تغيير الكاتب","error":"حدث عطل أثناء تغيير كاتب هذة المنشورات.","placeholder":"اسم مستخدم الكاتب الجديد","instructions":{"zero":"من فضلك اختر المالك الجديد لمشاركات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e","one":"من فضلك اختر المالك الجديد لمشاركة \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e الواحدة","two":"من فضلك اختر المالك الجديد لمشاركات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e ال‍ %{count}","few":"من فضلك اختر المالك الجديد لمشاركات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e ال‍ %{count}","many":"من فضلك اختر المالك الجديد لمشاركات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e ال‍ %{count}","other":"من فضلك اختر المالك الجديد لمشاركات \u003cb\u003e⁨@%{old_user}⁩\u003c/b\u003e ال‍ %{count}"},"instructions_without_old_user":{"zero":"من فضلك اختر المالك الجديد للمشاركات","one":"من فضلك اختر المالك الجديد للمشاركة","two":"من فضلك اختر المالك الجديد للمشاركتين","few":"من فضلك اختر المالك الجديد للمشاركات ال‍ %{count}","many":"من فضلك اختر المالك الجديد للمشاركات ال‍ %{count}","other":"من فضلك اختر المالك الجديد للمشاركات ال‍ %{count}"}},"change_timestamp":{"title":"غير تاريخ النشر...","action":"غير تاريخ النشر...","invalid_timestamp":"لا يمكن أن يكون تاريخ النشر في المستقبل.","error":"حدث عطل أثناء تغيير تاريخ النشر.","instructions":"من فضلك اختر تاريخ النشر الجديد للموضوع. سيتم تحديث تاريخ نشر منشورات الموضوع حتي يتم الحفاظ علي نفس الفارق الزمني."},"multi_select":{"select":"حدد","selected":"محددة (%{count})","select_post":{"label":"إختيار","title":"أضِف المشاركة إلى التحديد"},"selected_post":{"label":"تم الإختيار","title":"انقر لإزالة المشاركة من التحديد"},"select_replies":{"label":"حددها مع الردود عليها","title":"أضِف المشاركة وكلّ الردود عليها إلى التحديد"},"select_below":{"label":"حدد +أسفل","title":"أضِف المشاركة وكلّ ما يليها إلى التحديد"},"delete":"احذف المحدد","cancel":"ألغِ التحديد","select_all":"حدد الكل","deselect_all":"أزل تحديد الكل","description":{"zero":"لم تحدّد أي مشاركات.","one":"حدّدت مشاركة واحدة.","two":"حدّدت مشاركتين.","few":"حدّدت \u003cb\u003e%{count}\u003c/b\u003e مشاركات.","many":"حدّدت \u003cb\u003e%{count}\u003c/b\u003e مشاركة.","other":"حدّدت \u003cb\u003e%{count}\u003c/b\u003e مشاركة."}},"deleted_by_author":{"zero":"(سحب الكاتب موضوعه، وسيُحذف خلال أقلّ من ساعة ما لم يُوضع عليه إشارة)","one":"(سحب الكاتب موضوعه، وسيُحذف خلال ساعة واحدة ما لم يُوضع عليه إشارة)","two":"(سحب الكاتب موضوعه، وسيُحذف خلال ساعتين ما لم يُوضع عليه إشارة)","few":"(سحب الكاتب موضوعه، وسيُحذف خلال %{count} ساعات ما لم يُوضع عليه إشارة)","many":"(سحب الكاتب موضوعه، وسيُحذف خلال %{count} ساعة ما لم يُوضع عليه إشارة)","other":"(سحب الكاتب موضوعه، وسيُحذف خلال %{count} ساعة ما لم يُوضع عليه إشارة)"}},"post":{"quote_reply":"اقتبس","quote_share":"شارِك","edit_reason":"السبب:","post_number":"المنشور %{number}","ignored":"محتوى تم تجاهله","wiki_last_edited_on":"آخر تعديل على الـ wiki في ","last_edited_on":"آخر تعديل على المنشور في ","reply_as_new_topic":"التعليق على الموضوع الاصلي","reply_as_new_private_message":"الرد في رسالة جديدة علي نفس المستلم","continue_discussion":"تكملة النقاش من %{postLink}:","follow_quote":"انتقل إلى المشاركة المقتبسة هنا","show_full":"عرض كامل المنشور","show_hidden":"اعرض المحتوى الذي تم تجاهله.","deleted_by_author":{"zero":"(سحب الكاتب مشاركته، وستُحذف خلال أقلّ من ساعة ما لم يُوضع عليها إشارة)","one":"(سحب الكاتب مشاركته، وستُحذف خلال ساعة واحدة ما لم يُوضع عليها إشارة)","two":"(سحب الكاتب مشاركته، وستُحذف خلال ساعتان ما لم يُوضع عليها إشارة)","few":"(سحب الكاتب مشاركته، وستُحذف خلال %{count} ساعات ما لم يُوضع عليها إشارة)","many":"(سحب الكاتب مشاركته، وستُحذف خلال %{count} ساعة ما لم يُوضع عليها إشارة)","other":"(سحب الكاتب مشاركته، وستُحذف خلال %{count} ساعة ما لم يُوضع عليها إشارة)"},"collapse":"اطوِ","expand_collapse":"وسّع/اطوِ","locked":"قفل أحد أعضاء طاقم العمل تعديل هذه المشاركة","gap":{"zero":"ما من ردود مخفية","one":"اعرض الردّ المخفي","two":"اعرض الردّين المخفيين","few":"اعرض %{count} ردود مخفية","many":"اعرض %{count} ردًا مخفيًا","other":"اعرض %{count} رد مخفي"},"notice":{"new_user":"هذه أوّل مرة ينشر فيها %{user} شيئًا، فلنرحّب به في مجتمعنا المتحضّر!","returning_user":"مرّت فترة طويلة مذ قرأنا شيئًا من %{user}، إذ كانت آخر مشاركة له %{time}."},"unread":"هذه المشاركة غير مقروءة","has_replies":{"zero":"ما من ردود","one":"ردّ واحد","two":"ردّان","few":"%{count} ردود","many":"%{count} ردًا","other":"%{count} ردّ"},"has_replies_count":"%{count}","unknown_user":"(مستخدم مجهول أو محذوف)","has_likes_title":{"zero":"لم تُعجب هذه المشاركة أحد","one":"أعجبت هذه المشاركة شخصًا واحدًا","two":"أعجبت هذه المشاركة شخصين","few":"أعجبت هذه المشاركة %{count} أشخاص","many":"أعجبت هذه المشاركة %{count} شخصًا","other":"أعجبت هذه المشاركة %{count} شخص"},"has_likes_title_only_you":"اعجبك هذا المنشور","has_likes_title_you":{"zero":"أعجبتك هذه المشاركة أنت فقط","one":"أعجبتك أنت وشخص آخر هذه المشاركة","two":"أعجبتك أنت وشخصين آخرين هذه المشاركة","few":"أعجبتك أنت و%{count} أشخاص هذه المشاركة","many":"أعجبتك أنت و%{count} شخصًا هذه المشاركة","other":"أعجبتك أنت و%{count} شخص هذه المشاركة"},"in_reply_to":"تحميل المنشور الرئيسي","errors":{"create":"معذرةً، حدث عُطل أثناء إنشاء المشاركة. من فضلك أعِد المحاولة.","edit":"عذرا، حدثت مشكلة اثناء تعديل منشورك. من فضلك حاول مجددا.","upload":"عذرا، حدثت مشكلة اثناء رفع الملف. من فضلك حاول مجددا.","file_too_large":"معذرةً ولكن الملف كبير جدًا (أقصى حجم هو %{max_size_kb} ك.بايت). لماذا لا ترفع الملف الكبير هذا إلى خدمة مشاركة سحابية وتلصق الرابط؟","too_many_uploads":"عذرا، يمكنك فقط رفع ملف واحد كل مرة.","too_many_dragged_and_dropped_files":{"zero":"معذرةً إذ لا يمكنك رفع أيّ ملف في وقت واحد.","one":"معذرةً إذ لا يمكنك رفع ملف واحد في وقت واحد.","two":"معذرةً إذ لا يمكنك رفع ملفين في وقت واحد.","few":"معذرةً إذ لا يمكنك رفع %{count} ملفات في وقت واحد.","many":"معذرةً إذ لا يمكنك رفع %{count} ملفًا في وقت واحد.","other":"معذرةً إذ لا يمكنك رفع %{count} ملف في وقت واحد."},"upload_not_authorized":"عذرا, نوع الملف الذي تحاول رفعة محذور ( الانواع المسموح بها: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"عذرا، لا يمكن للأعضاء الجدد رفع الصور.","attachment_upload_not_allowed_for_new_user":"عذرا، لا يمكن للأعضاء الجدد رفع المرفقات.","attachment_download_requires_login":"معذرةً، عليك الولوج لتنزيل المرفقات."},"abandon_edit":{"confirm":"أمتأكّد من إهمال تعديلاتك؟","no_value":"لا, إبقاء","no_save_draft":"لا، احفظ المسودّة","yes_value":"نعم، أهمِل التعديل"},"abandon":{"title":"أهمِل المسودّة","confirm":"أمتأكّد من التخلي عن المسودّة التي كنت تكتبها؟","no_value":"لا، أبقِها","no_save_draft":"لا، احفظ المسودّة","yes_value":"نعم، لا أريدها"},"via_email":"وصل هذا المنشور عبر البريد","via_auto_generated_email":"وصل هذا المنشور عبر بريد مولّد آلياً","whisper":"هذا المنشور سري خاص بالمشرفين","wiki":{"about":"هذا المنشور نوعة wiki"},"archetypes":{"save":"احفظ الخيارات"},"few_likes_left":"نشكرك على نشر المحبة في المجتمع! و لكن للأسف لقد اقتربت من حد الاعجابات اليومي المسموح بة.","controls":{"reply":"اكتب ردًا على هذه المشاركة","like":"أعجبتني هذه المشاركة","has_liked":"أعجبتك هذه المشاركة","read_indicator":"الأعضاء ممّن قرأ هذه المشاركة","undo_like":"إلغاء الإعجاب","edit":"عدّل المنشور","edit_action":"عدّل","edit_anonymous":"عذرا، عليك تسجيل الدخول لتعديل المنشور.","flag":"ابلَغ عن هذا الموضوع او ارسل تنبيه خاص لأدارة الموقع.","delete":"احذف المنشور","undelete":"تراجع عن حذف المنشور","share":"شارِك رابط هذه المشاركة","more":"المزيد","delete_replies":{"confirm":"أتريد أيضًا حذف الردود على هذه المشاركة؟","direct_replies":{"zero":"نعم","one":"نعم، مع الردّ المباشر الوحيد","two":"نعم، مع الردّين المباشرين","few":"نعم، مع ال‍ %{count} ردود المباشرة","many":"نعم، مع ال‍ %{count} ردًا المباشرة","other":"نعم، مع ال‍ %{count} ردّ المباشرة"},"all_replies":{"zero":"نعم","one":"نعم، مع الردّ الوحيد","two":"نعم، مع الردّين","few":"نعم، مع ال‍ %{count} ردود كلّها","many":"نعم، مع ال‍ %{count} ردًا كلّها","other":"نعم، مع ال‍ %{count} ردّ كلّها"},"just_the_post":"لا، المشاركة فحسب"},"admin":"صلاحيات المدير","wiki":"اجعل المنشور wiki","unwiki":"اجعل المنشور عادي","convert_to_moderator":"اجعل لون المنشور مميز","revert_to_regular":"اجعل لون المنشور عادي","rebake":"أعد بناء HTML","publish_page":"الصفحة المنشورة","unhide":"إظهار","change_owner":"غير الكاتب","grant_badge":"منح شارة","lock_post":"اقفل المشاركة","lock_post_description":"امنع كاتب المشاركة من تعديلها","unlock_post":"افتح المشاركة","unlock_post_description":"اسمح لكاتب المشاركة تعديلها","delete_topic_disallowed_modal":"لا تملك التصريح لحذف هذا الموضوع. إن أردت حذفه حقًا فأرسِل إشارة إلى أحد المشرفين مع سبب الحذف المنطقي.","delete_topic_disallowed":"لا تملك التصريح لحذف هذا الموضوع","delete_topic_confirm_modal":"هذا الموضوع يحتوي حاليا على أكثر من %{minViews} مشاهدة، وقد يكون مشهورًا في نتائج البحث. هل متأكد من حذف هذا الموضوع بالكامل، بدلاً من تعديله لتحسينه؟","delete_topic_confirm_modal_yes":"نعم، احذف الموضوع","delete_topic_confirm_modal_no":"لا، أبقِ الموضوع","delete_topic_error":"حدث عُطل أثناء حذف هذا الموضوع","delete_topic":"احذف الموضوع","add_post_notice":"إضافة إشعار الموظفين","change_post_notice":"تغيير إشعار الموظفين","delete_post_notice":"حذف إشعار الموظفين","remove_timer":"إزالة الموقت"},"actions":{"people":{"like":{"zero":"أعجبهم هذا","one":"أعجبه هذا","two":"أعجبهما هذا","few":"أعجبهم هذا","many":"أعجبهم هذا","other":"أعجبهم هذا"},"read":{"zero":"قرأ هذا","one":"قرأوا هذا","two":"قرأ هذا","few":"قرآ هذا","many":"قرأوا هذا","other":"قرأوا هذا"},"like_capped":{"zero":"مَن أعجبه هذا","one":"وشخص آخر أعجبه هذا","two":"وشخصان أعجبهما هذا","few":"و%{count} أشخاص أعجبهم هذا","many":"و%{count} شخًا أعجبهم هذا","other":"و%{count} شخص أعجبهم هذا"},"read_capped":{"zero":"مَن قرأ هذا","one":"وشخص آخر قرأ هذا","two":"وشخصان قرآ هذا","few":"و%{count} قرأوا هذا","many":"و%{count} قرأوا هذا","other":"و%{count} قرأوا هذا"}},"by_you":{"off_topic":"وضعت إشارة بأنّها خارج الموضوع","spam":"وضعت إشارة بأنّها سخام","inappropriate":"وضعت إشارة بأنّها غير ملائمة","notify_moderators":"وضعت إشارة بأنّها تحتاج المراجعة","notify_user":"أرسلت رسالة إلى هذا المستخدم"}},"delete":{"confirm":{"zero":"ما من مشاركات لحذفها.","one":"أمتأكّد من حذف هذه المشاركة؟","two":"أمتأكّد من حذف هتين المشاركتين؟","few":"أمتأكّد من حذف %{count} مشاركات؟","many":"أمتأكّد من حذف %{count} مشاركة؟","other":"أمتأكّد من حذف %{count} مشاركة؟"}},"merge":{"confirm":{"zero":"ما من مشاركات لتُدمج","one":"أمتأكّد من دمج هذه المشاركات؟","two":"أمتأكّد من دمج هتين المشاركتين؟","few":"أمتأكّد من دمج هذه المشاركات ال‍ %{count}؟","many":"أمتأكّد من دمج هذه المشاركات ال‍ %{count}؟","other":"أمتأكّد من دمج هذه المشاركات ال‍ %{count}؟"}},"revisions":{"controls":{"first":"أول مراجعة","previous":"المراجعة السابقة","next":"المراجعة التالية","last":"آخر مراجعة","hide":"أخفِ المراجعة","show":"أظهر المراجعة","revert":"ارجع إلى المراجعة %{revision}","edit_wiki":"عدّل هذا الويكي","edit_post":"عدّل هذه المشاركة","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"اعرض النسخة المنسقة في عمود واحد مع تمييز الاسطر المضافة و المحذوفة","button":"عمود واحد"},"side_by_side":{"title":"اعرض الفروقات في النسخة المنسقة جنبا إلي جنب","button":"عمودين"},"side_by_side_markdown":{"title":"اعرض الفروقات في النسخة الخام جنبا إلي جنب","button":"عمودين خام"}}},"raw_email":{"displays":{"raw":{"title":"اعرض نص الرساله الخام","button":"خام"},"text_part":{"title":"اظهر الجزء النصي من رسالة البريد الالكتروني","button":"نص"},"html_part":{"title":"اظهر جزء الـ HTML من رسالة البريد الالكتروني","button":"HTML"}}},"bookmarks":{"create":"أنشِئ علامة","edit":"حرّر العلامة","created":"أُنشئ في","updated":"تاريخ التحديث","name":"الإسم","name_placeholder":"لمَ هذه العلامة؟","set_reminder":"ذكّرني","actions":{"delete_bookmark":{"name":"احذف العلامة","description":"أزِل العلامة من ملفك الشخصي وأوقِف كلّ التذكيرات المرتبطة بها"},"edit_bookmark":{"name":"حرّر العلامة","description":"حرّر اسم العلامة أو غيّر تاريخ التذكير ووقته"}}},"filtered_replies":{"viewing_posts_by":"عرض %{post_count} مشاركات بواسطة","viewing_subset":"بعض الردود مطوية","viewing_summary":"عرض موجز لهذا الموضوع","post_number":"%{username}، نشر #%{post_number}","show_all":"إظهار الكل"}},"category":{"can":"قادر علي\u0026hellip;","none":"(غير مصنف)","all":"كلّ الفئات","choose":"التصنيف\u0026hellip;","edit":"عدّل","edit_dialog_title":"حرّر: %{categoryName}","view":"أظهار المواضيع في القسم","back":"عُد إلى الفئة","general":"عام","settings":"اعدادات","topic_template":"إطار الموضوع","tags":"الوسوم","tags_allowed_tags":"احصر هذه الوسوم على هذه الفئة:","tags_allowed_tag_groups":"احصر مجموعات الوسوم هذه على هذه الفئة:","tags_placeholder":"(اختياري) قائمة الوسوم المسموحة","tags_tab_description":"الأوسمة ومجموعات الوسوم المحددة أعلاه ستكون متاحة فقط في هذا التصنيف والتصنيفات الأخرى التي تحددها. ولن تكون متاحة للاستخدام في تصنيفات أخرى.","tag_groups_placeholder":"(اختياري) قائمة مجموعات الوسوم المسموحة","manage_tag_groups_link":"أدِر مجموعات الوسوم","allow_global_tags_label":"أيضًا السماح بوسوم أخرى","tag_group_selector_placeholder":"(اختياري) مجموعة الوسوم","required_tag_group_description":"يتطلب مواضيع جديدة للحصول على وسوم من مجموعة الوسوم:","min_tags_from_required_group_label":"رقم الوسوم:","required_tag_group_label":"مجموعة الوسوم:","topic_featured_link_allowed":"اسمح بالروابط المُميزة بهذا القسم.","delete":"احذف التصنيف","create":"تصنيف جديد","create_long":"أنشئ تصنيف جديد","save":"احفظ القسم","slug":"عنوان القسم في الURL","slug_placeholder":"(اختياريّ) كلمات مفصولة-بشرطة للعنوان","creation_error":"حدثت مشكلة أثناء إنشاء القسم.","save_error":"حدث خطأ في حفظ القسم.","name":"اسم القسم","description":"الوصف","topic":"موضوع القسم","logo":"صورة القسم","background_image":"خلفية القسم","badge_colors":"ألوان الشارات","background_color":"لون الخلفية","foreground_color":"لون المقدمة","name_placeholder":"كلمة أو كلمتين على الأكثر","color_placeholder":"أيّ لون متوافق مع الانترنت","delete_confirm":"هل تريد فعلاً حذف هذا تصنيف؟","delete_error":"حدث خطأ أثناء حذف هذا التصنيف","list":"عرض الأقسام","no_description":"من فضلك أضف وصفا لهذا القسم.","change_in_category_topic":"عدّل الوصف","already_used":"هذا اللون تم استخدامه سابقا في قسم آخر","security":"الأمن","security_add_group":"إضافة مجموعة","permissions":{"group":"مجموعة","see":"شاهد","reply":"الرد","create":"إنشاء","no_groups_selected":"لم تُمنح أي مجموعات إمكانية الوصول؛ وسيكون هذا التصنيف مرئي فقط للمشرفين.","everyone_has_access":"هذه التصنيف عام، يمكن للجميع أن مشاهدة، الردود، وإنشاء المشاركات. لتقييد الأذونات، قم بإزالة واحد أو أكثر من الأذونات الممنوحة \"الجميع\" للمجموعة.","toggle_reply":"تبديل أذونات الرد","toggle_full":"تبديل اذونات الإنشاء","inherited":"هذا الإذن موروث من \"الجميع\""},"special_warning":"تحذير: هذا القسم هو قسم اصلي إعدادات الحماية له لا يمكن تعديلها. إذا لم تكن تريد استخدام هذا القسم، قم بحذفة بدلا من تطويعة لأغراض اخري.","uncategorized_security_warning":"هذه فئة خاصة إذ تهدف لجمع المواضيع التي ليس لها فئات فيها، ولا يمكنك ضبط إعدادات الحماية عليها.","uncategorized_general_warning":"هذه فئة خاصة إذ تُستعمل كفئة مبدئية للمواضيع الجديدة التي لم يُحدّد لها فئة. إن أردت منع هذا السلوك وإجبار المستخدم على اختيار فئة، \u003ca href=\"%{settingLink}\"\u003eفمن فضلك عطّل الإعداد هنا\u003c/a\u003e. إن أردت تغيير اسم الفئة أو وصفها، فانتقل إلى \u003ca href=\"%{customizeLink}\"\u003eالتخصيص والمحتوى النصي\u003c/a\u003e.","pending_permission_change_alert":"لم تُضف %{group} إلى هذه الفئة، انقر هذا الزر لإضافتها.","images":"الصور","email_in":"تعيين بريد إلكتروني خاص:","email_in_allow_strangers":"قبول بريد إلكتروني من زوار لا يملكون حسابات","email_in_disabled":"عُطّل إرسال المشاركات عبر البريد الإلكترونيّ من إعدادات الموقع. لتفعيل نشر المشاركات الجديدة عبر البريد،","email_in_disabled_click":"قم بتفعيل خيار \"email in\" في الإعدادات","mailinglist_mirror":"التصنيف يحيل لقائمة بريدية","show_subcategory_list":"اعرض قائمة الفئات الفرعية أعلى المواضيع في هذه الفئة.","read_only_banner":"نص البانر عندما لا يستطيع المستخدم إنشاء موضوع في هذا التصنيف:","num_featured_topics":"عدد الموضوعات المعروضة في صفحة الأقسام:","subcategory_num_featured_topics":"عدد الموضوعات المُميزة في صفحة القسم الرئيسي.","all_topics_wiki":"إنشاء مواضيع جديدة wikis بشكل إفتراضي","subcategory_list_style":"أسلوب عرض قائمة الأقسام الفرعية:","sort_order":"رتب قائمة الموضوعات حسب:","default_view":"قائمة الموضوعات الإفتراضية","default_top_period":"فترة الاكثر مشاهدة الافتراضية","default_list_filter":"تصفية القائمة الافتراضية:","allow_badges_label":"السماح بالحصول على الأوسمة في هذا القسم","edit_permissions":"عدل التصاريح","reviewable_by_group":"وبالإضافة إلى المشرفين، يمكن أيضا مراجعة محتوى هذا التصنيف عن طريق ما يلي:","review_group_name":"اسم المجموعة","require_topic_approval":"يتطلب موافقة المشرف على جميع المواضيع الجديدة","require_reply_approval":"يتطلب موافقة المشرف على جميع الردود الجديدة","this_year":"هذه السنة","position":"الموضع في صفحة التصنيفات:","default_position":"المكان الافتراضي","position_disabled":"سوف تُعرض الاقسام بترتيب نشاطها. للتّحكّم بترتيب الأقسام في القائمة،","position_disabled_click":"فعّل خاصية \"تثبيت ترتيب الأقسام\".","minimum_required_tags":"العدد الأدنى من الوسوم المطلوب في كلّ موضوع:","parent":"القسم الرئيسي","num_auto_bump_daily":"عدد الموضوعات المفتوحة التي ستقتطع تلقائياً يومياً:","navigate_to_first_post_after_read":"انتقل إلى أول مشاركة بعد قراءة المواضيع","notifications":{"watching":{"title":"مُراقبة","description":"ستراقب آليا كل الموضوعات بهذا القسم. ستصلك إشعارات لكل منشور أو موضوع جديد، وسيظهر أيضا عدّاد الردود الجديدة."},"watching_first_post":{"title":"يُراقب فيها أول مشاركة","description":"سيتم إعلامك بمواضيع جديدة في هذا الوسم ولكن ليس الرد على الموضوعات."},"tracking":{"title":"مُتابعة","description":"ستتابع آليا كل موضوعات هذا القسم. ستصلك إشعارات إن أشار أحدهم إلى @اسمك أو رد عليك، وسيظهر عدّاد الردود الجديدة."},"regular":{"title":"منتظم","description":"ستستقبل إشعارًا إن أشار أحد إلى @اسمك أو ردّ عليك."},"muted":{"title":"مكتومة","description":"لن يتم إشعارك بأي موضوعات جديدة في هذه الأقسام ولن يتم عرضها في قائمة الموضوعات المنشورة مؤخراً."}},"search_priority":{"label":"أولوية البحث","options":{"normal":"عادي","ignore":"تجاهل","very_low":"منخفض جداً","low":"منخفض","high":"مرتفع","very_high":"عالي جدا"}},"sort_options":{"default":"افترضى","likes":"الاعجابات","op_likes":"الاعجابات علي المنشور الاساسي","views":"المشاهدات","posts":"المنشورات","activity":"النشاط","posters":"الإعلانات","category":"القسم","created":"تاريخ الإنشاء"},"sort_ascending":"تصاعدي","sort_descending":"تنازلي","subcategory_list_styles":{"rows":"صفوف","rows_with_featured_topics":"صفوف مع الموضوعات المميزة","boxes":"مربعات","boxes_with_featured_topics":"مربعات مع الموضوعات المميزة"},"settings_sections":{"general":"عام","moderation":"مشرف","appearance":"الظهور","email":"البريد الإلكتروني"},"list_filters":{"all":"جميع المواضيع","none":"لا توجد تصنيفات فرعية"}},"flagging":{"title":"شكرا لمساعدتك في إبقاء مجتمعنا متحضرا.","action":"ابلغ عن المنشور","take_action":"اتخذ اجراء...","take_action_options":{"default":{"title":"اتخذ اجراء","details":"الوصول إلى الحد الأقصى للبلاغات دون انتظار بلاغات أكثر من أعضاء الموقع."},"suspend":{"title":"عضو موقوف","details":"الوصول إلى الحد الأعلى للبلاغات، و إيقاف حساب المستخدم"},"silence":{"title":"كتم المستخدم","details":"الوصول إلى الحد الأعلى للبلاغات، وكتم المستخدم"}},"notify_action":"رسالة","official_warning":"تحذير رسمي","delete_spammer":"احذف ناشر السبام","yes_delete_spammer":"نعم، احذف ناشر السخام","ip_address_missing":"(N/A)","hidden_email_address":"(مخفي)","submit_tooltip":"إرسال البلاغ","take_action_tooltip":"الوصول إلى الحد الأعلى للبلاغات دون انتظار بلاغات أكثر من أعضاء الموقع.","cant":"عذرا، لا يمكنك الابلاغ عن هذا المنشور في هذه اللحظة.","notify_staff":"ابلغ طاقم العمل بسرية","formatted_name":{"off_topic":"خارج عن الموضوع","inappropriate":"غير لائق","spam":"هذا سبام"},"custom_placeholder_notify_user":"كن محدد و كن بناء و دائما كن حسن الخلق","custom_placeholder_notify_moderators":"يمكنك تزودنا بمعلومات أكثر عن سبب عدم ارتياحك إلي هذا المنشور؟ زودنا ببعض الروابط و الأمثلة قدر الإمكان.","custom_message":{"at_least":{"zero":"لا تُدخل أيّ محرف","one":"أدخِل محرفًا واحدًا على الأقلّ","two":"أدخِل محرفين على الأقلّ","few":"أدخِل %{count} محارف على الأقلّ","many":"أدخِل %{count} محرفًا على الأقلّ","other":"أدخِل %{count} محرف على الأقلّ"},"more":{"zero":"بقي %{count} كحدّ أدنى...","one":"بقي %{count} كحدّ أدنى...","two":"بقي %{count} كحدّ أدنى...","few":"بقيت %{count} كحدّ أدنى...","many":"بقي %{count} كحدّ أدنى...","other":"بقي %{count} كحدّ أدنى..."},"left":{"zero":"بقي %{count} كحدّ أقصى...","one":"بقي %{count} كحدّ أقصى...","two":"بقي %{count} كحدّ أقصى...","few":"بقيت %{count} كحدّ أقصى...","many":"بقي %{count} كحدّ أقصى...","other":"بقي %{count} كحدّ أقصى..."}}},"flagging_topic":{"title":"شكرا لمساعدتنا في ابقاء المجمتع متحضر","action":"التبليغ عن الموضوع","notify_action":"رسالة"},"topic_map":{"title":"ملخص الموضوع","participants_title":"الناشرون المترددون","links_title":"روابط مشهورة","links_shown":"أظهر روابط أخرى...","clicks":{"zero":"ما من نقرات","one":"نقرة واحدة","two":"نقرتان","few":"%{count} نقرات","many":"%{count} نقرة","other":"%{count} نقرة"}},"post_links":{"about":"وسّع المزيد من الروابط في هذه المشاركة","title":{"zero":"فقط","one":"ورابط واحد آخر","two":"ورابطان آخران","few":"و%{count} روابط أخرى","many":"و%{count} رابطًا آخر","other":"و%{count} رابط آخر"}},"topic_statuses":{"warning":{"help":"هذا تحذير رسمي."},"bookmarked":{"help":"لقد وضعت علامة مرجعية علي هذا الموضوع"},"locked":{"help":"هذا الموضوع مغلق, لذا فهو لم يعد يستقبل ردودا"},"archived":{"help":"هذا الموضوع مؤرشف، لذا فهو مجمد ولا يمكن تعديله"},"locked_and_archived":{"help":"هذا الموضوع مغلق ومؤرشف، لذا فهو لم يعد يستقبل ردودًا ولا يمكن تغييره"},"unpinned":{"title":"غير مثبّت","help":"هذا الموضوع غير مثبّت لك، وسيُعرض بالترتيب العادي"},"pinned_globally":{"title":"مثبّت للعموم","help":"هذا الموضوع مثبت بشكل عام, سوف يظهر في مقدمة قائمة اخر الموضوعات وفي القسم الخاصة به."},"pinned":{"title":"مثبّت","help":"هذا الموضوع مثبّت لك وسيُعرض في أعلى فئته"},"unlisted":{"help":"هذا الموضوع غير مدرج, لن يظهر في قائمة الموضوعات ولا يمكن الوصول إلية إلا برابط مباشر"},"personal_message":{"title":"هذا الموضوع رسالة شخصية","help":"هذا الموضوع رسالة شخصية"}},"posts":"منشورات","original_post":"المنشور الاصلي","views":"المشاهدات","views_lowercase":{"zero":"المشاهدات","one":"المشاهدات","two":"المشاهدات","few":"المشاهدات","many":"المشاهدات","other":"المشاهدات"},"replies":"الردود","views_long":{"zero":"لم يُعرض هذا الموضوع أيّ مرة","one":"عُرض هذا الموضوع مرة واحدة","two":"عُرض هذا الموضوع مرتين","few":"عُرض هذا الموضوع %{number} مرات","many":"عُرض هذا الموضوع %{number} مرة","other":"عُرض هذا الموضوع %{number} مرة"},"activity":"النشاط","likes":"اعجابات","likes_lowercase":{"zero":"اﻹعجابات","one":"اﻹعجابات","two":"اﻹعجابات","few":"اﻹعجابات","many":"اﻹعجابات","other":"اﻹعجابات"},"users":"الأعضاء","users_lowercase":{"zero":"المستخدمون","one":"المستخدمون","two":"المستخدمون","few":"المستخدمون","many":"المستخدمون","other":"المستخدمون"},"category_title":"قسم","history":"تاريخ","changed_by":"الكاتب %{author}","raw_email":{"title":"البريد الإلكتروني الوارد","not_available":"غير متوفر!"},"categories_list":"قائمة الفئات","filters":{"with_topics":"المواضيع %{filter}","with_category":"المواضيع %{filter} في %{category}","latest":{"title":"الحديثة","title_with_count":{"zero":"الحديثة (%{count})","one":"الحديثة (%{count})","two":"الحديثة (%{count})","few":"الحديثة (%{count})","many":"الحديثة (%{count})","other":"الحديثة (%{count})"},"help":"المواضيع التي فيها مشاركات حديثة"},"read":{"title":"المقروءة","help":"المواضيع التي قرأتها بترتيب آخر قراءتك لها"},"categories":{"title":"الفئات","title_in":"الفئة - %{categoryName}","help":"كلّ المواضيع مجمّعة حسب الفئة"},"unread":{"title":"غير المقروءة","title_with_count":{"zero":"غير المقروءة (%{count})","one":"غير المقروءة (%{count})","two":"غير المقروءة (%{count})","few":"غير المقروءة (%{count})","many":"غير المقروءة (%{count})","other":"غير المقروءة (%{count})"},"help":"الموضوعات التي تتابعها (أو تراقبها) والتي فيها منشورات غير مقروءة","lower_title_with_count":{"zero":"ما من شيء غير مقروء","one":"%{count} غير مقروء","two":"%{count} غير مقروءان","few":"%{count} غير مقروءة","many":"%{count} غير مقروءة","other":"%{count} غير مقروءة"}},"new":{"lower_title_with_count":{"zero":"ما من شيء جديد","one":"%{count} جديد","two":"%{count} جديدان","few":"%{count} جديدة","many":"%{count} جديدًا","other":"%{count} جديد"},"lower_title":"الجديدة","title":"الجديدة","title_with_count":{"zero":"الجديدة (%{count})","one":"الجديدة (%{count})","two":"الجديدة (%{count})","few":"الجديدة (%{count})","many":"الجديدة (%{count})","other":"الجديدة (%{count})"},"help":"المواضيع المنشأة في الأيّام القليلة الماضية"},"posted":{"title":"منشوراتي","help":"المواضيع التي نشرت فيها"},"bookmarks":{"title":"العلامات","help":"المواضيع التي وضعت عليها لامة"},"category":{"title":"%{categoryName}","title_with_count":{"zero":"‏%{categoryName} ‏(%{count})","one":"‏%{categoryName} ‏(%{count})","two":"‏%{categoryName} ‏(%{count})","few":"‏%{categoryName} ‏(%{count})","many":"‏%{categoryName} ‏(%{count})","other":"‏%{categoryName} ‏(%{count})"},"help":"المواضيع الحديثة في فئة %{categoryName}"},"top":{"title":"النشطة","help":"أكثر المواضيع نشاطًا في آخر سنة أو شهر أو أسبوع أو يوم","all":{"title":"كلها"},"yearly":{"title":"السنوية"},"quarterly":{"title":"الربع سنوية"},"monthly":{"title":"الشهرية"},"weekly":{"title":"الأسبوعية"},"daily":{"title":"اليومية"},"all_time":"كلّ الأوقات","this_year":"خلال السنة","this_quarter":"خلال ربع السنة","this_month":"خلال الشهر","this_week":"خلال الأسبوع","today":"خلال اليوم","other_periods":"انظر أعلى:"}},"browser_update":"للأسف \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eفمتصفّح الإنترنت الذي تستعمل قديم جدًا ليعمل عليه هذا الموقع\u003c/a\u003e. من فضلك \u003ca href=\"https://browsehappy.com\"\u003eحدّث متصفّحك\u003c/a\u003e لترى المحتوى الغني والولوج والردّ.","permission_types":{"full":"انشاء / رد / مشاهدة","create_post":"رد / مشاهدة","readonly":"مشاهدة"},"lightbox":{"download":"تحميل","previous":"السابق (مفتاح السهم الأيسر)","next":"التالي (مفتاح السهم الأيمن)","counter":"%curr% من %total%","close":"إغلاق (Esc)","content_load_error":"تعذّر تحميل \u003ca href=\"%url%\"\u003eالمحتوى\u003c/a\u003e.","image_load_error":"تعذّر تحميل \u003ca href=\"%url%\"\u003eالصورة\u003c/a\u003e."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":"، ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} أو %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"اختصارات لوحة المفاتيح","jump_to":{"title":"الانتقال إلى","home":"%{shortcut} الرّئيسيّة","latest":"%{shortcut} الحديثة","new":"%{shortcut} الجديدة","unread":"%{shortcut} غير المقروء","categories":"%{shortcut} الفئات","top":"%{shortcut} الاكثر مشاهدة","bookmarks":"%{shortcut} العلامات","profile":"%{shortcut} الملف الشخصي","messages":"%{shortcut} الرّسائل","drafts":"%{shortcut} المسودّات","next":"%{shortcut} الموضوع التالي","previous":"%{shortcut} الموضوع السابق"},"navigation":{"title":"التنقّل","jump":"%{shortcut} الانتقال إلى المشاركة رقم كذا","back":"%{shortcut} العودة","up_down":"%{shortcut} نقل المحدد \u0026uarr; \u0026darr;","open":"%{shortcut} فتح الموضوع المحدد","next_prev":"%{shortcut} القسم التالي/السابق","go_to_unread_post":"%{shortcut} الانتقال إلى أوّل مشاركة غير مقروءة"},"application":{"title":"التطبيق","create":"%{shortcut} كتابة موضوع جديد","notifications":"%{shortcut} فتح الإخطارات","hamburger_menu":"%{shortcut} فتح القائمة الرّئيسيّة","user_profile_menu":"%{shortcut}فتح قائمة المستخدم","show_incoming_updated_topics":"%{shortcut} عرض الموضوعات المحدثة","search":"%{shortcut} البحث","help":"%{shortcut} فتح مساعدة لوحة المفاتيح","dismiss_new_posts":"%{shortcut} تجاهل المنشورات الجديدة","dismiss_topics":"%{shortcut} تجاهل الموضوعات","log_out":"%{shortcut} الخروج"},"composing":{"title":"كتابة","return":"%{shortcut} العودة إلى لوحة الكتابة","fullscreen":"%{shortcut} لوحة الكتابة تملأ الشاشة"},"bookmarks":{"title":"العلامات","enter":"%{shortcut} الحفظ والإغلاق","later_today":"%{shortcut} لاحقاً اليوم","later_this_week":"%{shortcut} في وقت لاحق هذا الأسبوع","tomorrow":"%{shortcut} غدا","next_week":"%{shortcut} الأسبوع المقبل","next_month":"%{shortcut} الشهر القادم","next_business_week":"%{shortcut} بداية من الأسبوع القادم","next_business_day":"%{shortcut} يوم العمل التالي","custom":"%{shortcut} تخصيص التاريخ والوقت","none":"%{shortcut} لا يوجد تذكير","delete":"%{shortcut} حذف العلامة"},"actions":{"title":"إجراءات","bookmark_topic":"%{shortcut} وضع/ازالة علامة مرجعية علي الموضوع","pin_unpin_topic":"%{shortcut} تثبيت/إلغاء تثبيت الموضوع","share_topic":"%{shortcut} مشاركة الموضوع","share_post":"%{shortcut} مشاركة المنشور","reply_as_new_topic":"%{shortcut} الرد كموضوع مرتبط","reply_topic":"%{shortcut} الرد على الموضوع","reply_post":"%{shortcut} الرد على المنشور","quote_post":"%{shortcut} اقتباس المنشور","like":"%{shortcut} الإعجاب بالمنشور","flag":"%{shortcut} الإبلاغ عن المنشور","bookmark":"%{shortcut} وضع علامة مرجعية علي المنشور","edit":"%{shortcut} تعديل المنشور","delete":"%{shortcut} حذف المنشور","mark_muted":"%{shortcut} كتم الموضوع","mark_regular":"%{shortcut} موضوع منظم (الإفتراضي)","mark_tracking":"%{shortcut} متابعة الموضوع","mark_watching":"%{shortcut} مراقبة الموضوع","print":"%{shortcut} طباعة الموضوع","defer":"%{shortcut} تأجيل الموضوع","topic_admin_actions":"%{shortcut} فتح إجراءات المشرف على الموضوع"},"search_menu":{"title":"قائمة البحث","prev_next":"%{shortcut} نقل التحديد لأعلى ولأسفل","insert_url":"%{shortcut} إدراج المحدّد في المؤلف المفتوح"}},"badges":{"earned_n_times":{"zero":"لم تُمنح هذه الشارة أيّ مرة","one":"مُنحت هذة الشارة مرة واحدة","two":"مُنحت هذة الشارة مرتان","few":"مُنحت هذه الشارة %{count} مرة","many":"مُنحت هذه الشارة %{count} مرة","other":"مُنحت هذه الشارة %{count} مرة"},"granted_on":"ممنوح منذ %{date}","others_count":"عدد من حصل علي نفس الشارة (%{count})","title":"الشارات","allow_title":"يمكنك استخدام هذة الشارة كلقب","multiple_grant":"يُمكن ان تُمنح هذة الشارة اكثر من مرة","badge_count":{"zero":"ما من شارات","one":"شارة واحدة","two":"شارتان","few":"%{count} شارات","many":"%{count} شارة","other":"%{count} شارة"},"more_badges":{"zero":"فقط","one":"+%{count} أخرى","two":"+%{count} أخرى","few":"+%{count} أخرى","many":"+%{count} أخرى","other":"+%{count} أخرى"},"granted":{"zero":"لم تُمنح لأحد","one":"مُنحت واحد","two":"مُنحت لاثنين","few":"مُنحت لِ‍ %{count}.","many":"مُنحت لِ‍ %{count}.","other":"مُنحت لِ‍ %{count}."},"select_badge_for_title":"اختر شارة لتستخدمها كلقب لك.","none":"(لا شيء)","successfully_granted":"تم منح %{badge} بنجاح لـ %{username}","badge_grouping":{"getting_started":{"name":"الأساسيات"},"community":{"name":"المجتمعية"},"trust_level":{"name":"مستويات الثقة"},"other":{"name":"أخرى"},"posting":{"name":"النشر"}}},"tagging":{"all_tags":"كلّ الوسوم","other_tags":"وسوم أخرى","selector_all_tags":"كلّ الوسوم","selector_no_tags":"ما من وسوم","changed":"الأوسمة المعدلة:","tags":"الوسوم","choose_for_topic":"الوسوم الاختيارية","info":"معلومات","default_info":"هذ الوسم ليس مقصورًا على أي تصنيف، وليس له مرادفات.","category_restricted":"هذه الوسم مقيد بالتصنيفات التي ليس لديك الصلاحية للوصول إليها.","synonyms":"مرادفات","synonyms_description":"عند استخدام الأوسمة التالية، سيتم استبدالها بـ \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"zero":"ينتمي هذا الوسم إلى المجموعة: %{tag_groups}.","one":"ينتمي هذا الوسم إلى المجموعة: %{tag_groups}.","two":"ينتمي هذا الوسم إلى المجموعات: %{tag_groups}.","few":"ينتمي هذا الوسم إلى المجموعات: %{tag_groups}.","many":"ينتمي هذا الوسم إلى المجموعات: %{tag_groups}.","other":"ينتمي هذا الوسم إلى المجموعات: %{tag_groups}."},"category_restrictions":{"zero":"لا يمكن استعماله إلّا في هذه الفئة:","one":"لا يمكن استعماله إلّا في هذه الفئة:","two":"لا يمكن استعماله إلّا في هذه الفئات:","few":"لا يمكن استعماله إلّا في هذه الفئات:","many":"لا يمكن استعماله إلّا في هذه الفئات:","other":"لا يمكن استعماله إلّا في هذه الفئات:"},"edit_synonyms":"أدِر المترادفات","add_synonyms_label":"أضِف مترادفات:","add_synonyms":"اضافة","add_synonyms_explanation":{"zero":"ستتغيّر الأماكن التي تستعمل هذا الوسم فتستعمل الوسم \u003cb\u003e%{tag_name}\u003c/b\u003e بدله. أمتأكّد من إجراء هذا التغيير؟","one":"ستتغيّر الأماكن التي تستعمل هذا الوسم فتستعمل الوسم \u003cb\u003e%{tag_name}\u003c/b\u003e بدله. أمتأكّد من إجراء هذا التغيير؟","two":"ستتغيّر الأماكن التي تستعمل هذين الوسمين فتستعمل الوسم \u003cb\u003e%{tag_name}\u003c/b\u003e بدلهما. أمتأكّد من إجراء هذا التغيير؟","few":"ستتغيّر الأماكن التي تستعمل هذه الوسوم فتستعمل الوسم \u003cb\u003e%{tag_name}\u003c/b\u003e بدلها. أمتأكّد من إجراء هذا التغيير؟","many":"ستتغيّر الأماكن التي تستعمل هذه الوسوم فتستعمل الوسم \u003cb\u003e%{tag_name}\u003c/b\u003e بدلها. أمتأكّد من إجراء هذا التغيير؟","other":"ستتغيّر الأماكن التي تستعمل هذه الوسوم فتستعمل الوسم \u003cb\u003e%{tag_name}\u003c/b\u003e بدلها. أمتأكّد من إجراء هذا التغيير؟"},"add_synonyms_failed":"تعذر إضافة الأوسمة التالية كمرادفات: \u003cb\u003e%{tag_names}\u003c/b\u003e. تأكد من عدم وجود مرادفات لديهم وليست مرادفات لأوسمة أخرى.","remove_synonym":"أزِل المترادف","delete_synonym_confirm":"أمتأكّد من حذف المترادف ”%{tag_name}“؟","delete_tag":"احذف الوسم","delete_confirm":{"zero":"أمتأكّد من حذف هذا الوسم؟ لم يُوسم أيّ موضوع به.","one":"أمتأكّد من حذف هذا الوسم وإزالته من موضوع واحد وُسم به؟","two":"أمتأكّد من حذف هذا الوسم وإزالته من موضوعين وُسما به؟","few":"أمتأكّد من حذف هذا الوسم وإزالته من %{count} مواضيع وُسمت به؟","many":"أمتأكّد من حذف هذا الوسم وإزالته من %{count} موضوعًا وُسم به؟","other":"أمتأكّد من حذف هذا الوسم وإزالته من %{count} موضوع وُسم به؟"},"delete_confirm_no_topics":"هل أنت متاكد انك تريد حذف هذا الوسم؟","delete_confirm_synonyms":{"zero":"ما من مترادفات للوسم لحذفها.","one":"وسيُحذف المترادف الوحيد للوسم أيضًا.","two":"وسيُحذف المترادفان للوسم أيضًا.","few":"وستُحذف ال‍ %{count} مترادفات للوسم أيضًا.","many":"وسيُحذف ال‍ %{count} مترادفًا للوسم أيضًا.","other":"وسيُحذف ال‍ %{count} مترادف للوسم أيضًا."},"rename_tag":"أعد تسمية الوسم","rename_instructions":"اختر اسما جديدا للوسم:","sort_by":"افرز ب‍:","sort_by_count":"العدد","sort_by_name":"الاسم","manage_groups":"أدِر مجموعات الوسوم","manage_groups_description":"أنشئ مجموعات لتنظيم الأوسمة","upload":"رفع الأوسمة","upload_description":"قم بتحميل ملف csv لإنشاء أوسمة مجمعة","upload_instructions":"واحد لكل سطر، اختياريًا مع مجموعة الأوسمة بهذا التنسيق 'tag_name,tag_group'.","upload_successful":"نجح رفع الوسوم","delete_unused_confirmation":{"zero":"لن يُحذف أيّ وسم.","one":"سيُحذف وسم واحد: %{tags}","two":"سيُحذف وسمين: %{tags}","few":"ستُحذف %{count} وسوم: %{tags}","many":"سيُحذف %{count} وسمًا: %{tags}","other":"سيُحذف %{count} وسم: %{tags}"},"delete_unused_confirmation_more_tags":{"zero":"%{tags}","one":"%{tags} ووسم آخر","two":"%{tags} ووسمين آخرين","few":"%{tags} و%{count} وسوم أخرى","many":"%{tags} و%{count} وسمًا آخر","other":"%{tags} و%{count} وسم آخر"},"delete_no_unused_tags":"ما من وسوم غير مستعملة.","delete_unused":"احذف الوسوم غير المستعملة","delete_unused_description":"احذف جميع الأوسمة غير المرتبطة بأي مواضيع أو رسائل خاصة","cancel_delete_unused":"ألغِ","filters":{"without_category":"مواضيع %{tag} %{filter}","with_category":"مواضيع %{tag} ‏%{filter} في %{category}","untagged_without_category":"مواضيع %{filter} غير الموسومة","untagged_with_category":"المواضيع %{filter} غير الموسومة في %{category}"},"notifications":{"watching":{"title":"مُراقب","description":"ستراقب آليا كل المواضيع التي تستخدم هذه الأوسمة. ستصلك إشعارات بالمنشورات و الموضوعات الجديدة، وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع."},"watching_first_post":{"title":"يُراقب فيه أول مشاركة","description":"سيتم إعلامك بمواضيع جديدة في هذا الوسم ولكن ليس الرد على الموضوعات."},"tracking":{"title":"مُتابع","description":"ستتابع آليا كل الموضوعات التي تستخدم هذه الأوسمة. وسيظهر أيضا عدّاد للمنشورات الجديدة بجانب كل موضوع."},"regular":{"title":"موضوع عادي","description":"ستستقبل إشعارًا إن أشار أحد إلى @اسمك أو ردّ على مشاركتك."},"muted":{"title":"مكتوم","description":"لن يتم إخطارك بأي شيء يتعلق بالمواضيع الجديدة بهذ الوسم، ولن تظهر في علامة التبويب \"غير المقروءة\"."}},"groups":{"title":"مجموعات الوسوم","about":"ضَع الوسوم في مجموعات ليسهُل عليك إدارتها.","new":"مجموعة جديدة","tags_label":"الوسوم في هذه المجموعة:","parent_tag_label":"التصنيف الأب","parent_tag_description":"لا يمكنك استعمال الوسوم في هذه المجموعة ما لم يوجد الوسم الأب.","one_per_topic_label":"السماح بوسم واحد فقط من هذة المجموعة لكل موضوع","new_name":"مجموعة وسوم جديدة","name_placeholder":"اسم مجموعة الوسوم","save":"حفظ","delete":"حذف","confirm_delete":"أمتأكد من حذف مجموعة الوسوم هذه؟","everyone_can_use":"يمكن للجميع استخدام الأوسمة","usable_only_by_groups":"يمكن للعموم رؤية الوسوم ولكن فقط المجموعات الآتية يمكنها استعمالها","visible_only_to_groups":"لا تظهر الوسوم إلا للمجموعات الآتية"},"topics":{"none":{"unread":"ليست هناك مواضيع غير مقروءة.","new":"ليست هناك مواضيع جديدة.","read":"لم تقرأ أيّ موضوع بعد.","posted":"لم تنشر في أيّ موضوع بعد..","latest":"ما من مواضيع حديثة.","bookmarks":"لم تقم بوضع علامات مرجعية علي اي موضوع بعد.","top":"ما من مواضيع نشطة."}}},"invite":{"custom_message":"اجعل دعوتك شخصية أكثر قليلاً عن طريق كتابة \u003ca href\u003eرسالة مخصصة\u003c/a\u003e.","custom_message_placeholder":"ادخل رسالتك المخصصة","custom_message_template_forum":"مرحبا. عليك الانضمام إلى هذا المجتمع!","custom_message_template_topic":"مرحبا. أظن أن هذا الموضوع سيسعدك!"},"forced_anonymous":"بسبب التحميل الشديد، يتم عرض هذا بشكل مؤقت للجميع كما يراه مستخدم سجّل الخروج.","footer_nav":{"back":"الى الخلف","forward":"إعادة","share":"شاركها","dismiss":"تجاهل"},"safe_mode":{"enabled":"الوضع الآمن مفعّل، لتخرج منه أغلق نافذة المتصفّح هذه"},"image_removed":"(تمت إزالة الصورة)","do_not_disturb":{"title":"عدم الإزعاج من أجل...","save":"حفظ","label":"عدم الإزعاج","remaining":"%{remaining} متبقي","options":{"half_hour":"30 دقيقة","one_hour":"1 ساعة","two_hours":"2 ساعة","tomorrow":"حتى الغد","custom":"مخصص"}},"presence":{"replying":{"zero":"يكتب ردًا","one":"يكتب ردًا","two":"يكتبان ردًا","few":"يكتبون ردًا","many":"يكتبون ردًا","other":"يكتبون ردًا"},"editing":{"zero":"يعدّل المشاركة","one":"يعدّل المشاركة","two":"يعدّلان المشاركة","few":"يعدّلون المشاركة","many":"يعدّلون المشاركة","other":"يعدّلون المشاركة"},"replying_to_topic":{"zero":"يكتب ردًا","one":"يكتب ردًا","two":"يكتبان ردًا","few":"يكتبون ردًا","many":"يكتبون ردًا","other":"يكتبون ردًا"}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"ابدأ البرنامج التعليمي للمستخدمين الجدد، لكلّ المستخدمين الجدد","welcome_message":"أرسِل رسالة ترحيبيّة فيها دليل بدء سريع إلى كلّ المستخدمين الجدد"}},"details":{"title":"أخفِ التفاصيل"},"discourse_local_dates":{"relative_dates":{"today":"اليوم %{time}","tomorrow":"غدًا %{time}","yesterday":"أمس %{time}"},"title":"أدخِل التاريخ / الوقت","create":{"form":{"insert":"أدخِل","advanced_mode":"الوضع المتقدّم","simple_mode":"الوضع البسيط","format_description":"النُسق المستعمل لعرض التاريخ على المستخدم. استعمل Z لإزاحة الأرقام بالصفر و zz لاسم المنطقة الزمنية.","timezones_title":"المناطق الزمنية لعرضها","recurring_title":"التكرار","recurring_description":"حدّد تكرار الحدث. يمكنك أيضًا تعديل خيار التكرار الذي ولّدته الاستمارة تلقائيًا - تعديله يدويًا وثمّ استعمال أحد المفاتيح الآتية: years، ‏quarters، ‏months، ‏days، ‏hours، ‏minutes، ‏seconds، ‏milliseconds.","recurring_none":"بلا تكرار","invalid_date":"التاريخ غير صالح، تأكّد من صحّة التاريخ والوقت","date_title":"التاريخ","time_title":"الوقت","format_title":"نُسق التاريخ","timezone":"المنطقة الزمنية","until":"حتّى...","recurring":{"every_day":"كلّ يوم","every_week":"كلّ أسبوع","every_two_weeks":"كلّ أسبوعين","every_month":"كلّ شهر","every_two_months":"كلّ شهرين","every_three_months":"كلّ ثلاثة أشهر","every_six_months":"كلّ ستة أشهر","every_year":"كلّ سنة"}}}},"styleguide":{"title":"دليل الأنماط","welcome":"اختر قسمًا من القائمة على اليمين لتبدأ.","categories":{"atoms":"الذرّات (Atoms)","molecules":"الجزئيات (Molecules)","organisms":"المخلوقات الحية (Organisms)"},"sections":{"typography":{"title":"أسلوب الطباعة","example":"مرحبًا بك في دِسكورس","paragraph":"لوريم إيبسوم(Lorem Ipsum) هو ببساطة نص شكلي (بمعنى أن الغاية هي الشكل وليس المحتوى) ويُستخدم في صناعات المطابع ودور النشر. كان لوريم إيبسوم ولايزال المعيار للنص الشكلي منذ القرن الخامس عشر عندما قامت مطبعة مجهولة برص مجموعة من الأحرف بشكل عشوائي أخذتها من نص، لتكوّن كتيّب بمثابة دليل أو مرجع شكلي لهذه الأحرف. خمسة قرون من الزمن لم تقضي على هذا النص، بل انه حتى صار مستخدماً وبشكله الأصلي في الطباعة والتنضيد الإلكتروني. انتشر بشكل كبير في ستينيّات هذا القرن مع إصدار رقائق \"ليتراسيت\" (Letraset) البلاستيكية تحوي مقاطع من هذا النص، وعاد لينتشر مرة أخرى مؤخراَ مع ظهور برامج النشر الإلكتروني مثل \"ألدوس بايج مايكر\" (Aldus PageMaker) والتي حوت أيضاً على نسخ من نص لوريم إيبسوم."},"date_time_inputs":{"title":"حقول إدخال التاريخ/الوقت"},"font_scale":{"title":"نظام الخطوط"},"colors":{"title":"الألوان"},"icons":{"title":"الأيقونات","full_list":"طالِع قائمة أيقونات Font Awesome كاملةً"},"input_fields":{"title":"حقول الإدخال"},"buttons":{"title":"الأزرار"},"dropdowns":{"title":"المُنسدلات"},"categories":{"title":"الفئات"},"bread_crumbs":{"title":"عناصر التنقّل التفصيلي"},"navigation":{"title":"التنقّل"},"navigation_bar":{"title":"شريط التنقّل"},"navigation_stacked":{"title":"التنقّل الرأسي"},"categories_list":{"title":"قائمة الفئات"},"topic_link":{"title":"رابط الموضوع"},"topic_list_item":{"title":"العنصر في قائمة المواضيع"},"topic_statuses":{"title":"حالات المواضيع"},"topic_list":{"title":"قائمة المواضيع"},"basic_topic_list":{"title":"عد إلى قائمة الموضوعات"},"footer_message":{"title":"رسالة التذييل"},"signup_cta":{"title":"الدعوة إلى التسجيل"},"topic_timer_info":{"title":"مؤقّتات المواضيع"},"topic_footer_buttons":{"title":"أزرار تذييل الموضوع"},"topic_notifications":{"title":"إخطارات المواضيع"},"post":{"title":"المشاركة"},"topic_map":{"title":"خريطة الموضوع"},"site_header":{"title":"رأس الموقع"},"suggested_topics":{"title":"المواضيع المقترحة"},"post_menu":{"title":"قائمة المشاركة"},"modal":{"title":"نموذج","header":"عنوان دالة","footer":"تذييل مشروط"},"user_about":{"title":"مربّع ”عن المستخدم“"},"header_icons":{"title":"أيقونات الترويسة"},"spinners":{"title":"المُنزلقات"}}},"poll":{"voters":{"zero":"لا أحد صوّت","one":"واحد صوّت","two":"إثنان صوّتا","few":"صوّتوا","many":"صوّتوا","other":"الناخبين"},"total_votes":{"zero":"لم يصوت أحد","one":"صوت واحد","two":"صوتان","few":"مجموعة من الأصوات","many":"العديد من الأصوات","other":"مجموع الأصوات"},"average_rating":"متوسّط التقييمات: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"تظهر الأصوات \u003cstrong\u003eللعموم\u003c/strong\u003e."},"results":{"groups":{"title":"عليك أن تكون عضوًا في %{groups} لتُصوّت على هذا الاستطلاع."},"vote":{"title":"تظهر النتائج بعد \u003cstrong\u003eالتصويت\u003c/strong\u003e."},"closed":{"title":"تظهر النتائج ما إن \u003cstrong\u003eيُغلق الاستطلاع\u003c/strong\u003e."},"staff":{"title":"تظهر النتائج لأعضاء \u003cstrong\u003eطاقم الموقع\u003c/strong\u003e فقط."}},"cast-votes":{"title":"أدلِ بصوتك","label":"صوّت اﻵن!"},"show-results":{"title":"اعرض نتائج الاستطلاع","label":"اعرض النتائج"},"hide-results":{"title":"ارجع إلى أصواتك"},"group-results":{"title":"جمّع الأصوات حسب حقل المستخدم"},"export-results":{"label":"تصدير"},"open":{"title":"افتح الاستطلاع","label":"افتح","confirm":"أمتأكد من فتح هذا الاستطلاع؟"},"close":{"title":"أغلِق الاستطلاع","label":"أغلِق","confirm":"أمتأكد من إغلاق هذا الاستطلاع؟"},"automatic_close":{"closes_in":"يُغلق الاستطلاع \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"أُغلق الاستطلاع \u003cstrong\u003e%{age}\u003c/strong\u003e."},"breakdown":{"title":"نتائج الاستطلاع"},"error_while_toggling_status":"معذرةً، حدث عُطل أثناء تبديل حالة هذا الاستطلاع.","error_while_casting_votes":"عذرا، حدث خطأ عند الإدلاء بأصواتكم.","error_while_fetching_voters":"عذرا، حدث خطأ في عرض الناخبين.","error_while_exporting_results":"معذرةً، حدث عُطل أثناء تصدير نتائج الاستطلاع","ui_builder":{"title":"افتح استطلاعًا","insert":"أدرِج استطلاعًا","help":{"options_count":"أدخِل خيارًا واحدًا على الأقلّ","invalid_values":"يجب أن تكون القيمة الدّنيا أصغر من القيمة العليا.","min_step_value":"قيمة الخطوة الدنيا هي 1"},"poll_type":{"label":"النوع","regular":"اختيار من متعدّد","multiple":"اختيارات من متعدّد","number":"تقييم عددي"},"poll_result":{"label":"النتائج"},"poll_config":{"max":"الحد الأقصى","min":"الحد الأدنى","step":"الخطوة"},"poll_public":{"label":"اعرض أسماء المصوّتين"},"poll_options":{"label":"أدخِل خيارًا واحدًا في كلّ سطر"}}},"chat_integration":{"settings":"إعدادات","choose_group":"(اختر مجموعة)","all_categories":"(جميع الأقسام)","all_tags":"(جميع الوسوم)","delete_channel":"حذف","test_channel":"اختبار","edit_channel":"تعديل","test_modal":{"title":"أرسل رسالة اختبار","topic":"موضوع","close":"إغلاق","success":"الرسالة أُرسلت بنجاح"},"type":{"normal":"طبيعي"},"filter":{"mute":"صامت","follow":"أوّل منشور فقط"},"rule_table":{"filter":"رشّح","category":"قسم","tags":"وسوم","edit_rule":"تعديل","delete_rule":"حذف"},"edit_channel_modal":{"title":"تعديل القناة","save":"حفظ القناة","cancel":"إلغاء"},"edit_rule_modal":{"cancel":"إلغاء","type":"نوع","channel":"قناة","filter":"رشّح","category":"قسم","group":"مجموعة","tags":"وسوم"},"provider":{"slack":{"param":{"identifier":{"title":"قناة"}}},"telegram":{"param":{"name":{"title":"الاسم"}}},"discord":{"param":{"name":{"title":"الاسم"}}},"mattermost":{"param":{"identifier":{"title":"قناة"}}},"matrix":{"param":{"name":{"title":"الاسم"}}},"zulip":{"param":{"subject":{"title":"الموضوع"}}},"rocketchat":{"param":{"identifier":{"title":"قناة"}}},"gitter":{"param":{"name":{"title":"الاسم"}}}}}}},"en":{"js":{"review":{"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"}}},"directory":{"map":{"title":"Users Map"},"list":{"title":"Users List"}},"user":{"color_schemes":{"default_description":"Theme default"},"map_location":{"title":"Map Location","warning":"Your location will be displayed publicly."}},"category_row":{"plus_subcategories_title":{"one":"%{name} and one subcategory","other":"%{name} and %{count} subcategories"},"plus_subcategories":{"one":"+ %{count} subcategory","other":"+ %{count} subcategories"}},"composer":{"location":{"btn":"Add Location","title":"Add a Location"}},"notifications":{"liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} others\u003c/span\u003e %{description}"},"membership_request_accepted":"Membership accepted in '%{group_name}'","reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - completed","popup":{"confirm_body":"Success! Notifications have been enabled.","custom":"Notification from %{username} on %{site_title}"},"titles":{"edited":"edited","moved_post":"post moved","linked":"linked","bookmark_reminder":"bookmark reminder","bookmark_reminder_with_name":"bookmark reminder - %{name}","group_mentioned":"group mentioned","group_message_summary":"new group messages","topic_reminder":"topic reminder","liked_consolidated":"new likes","post_approved":"post approved","membership_request_consolidated":"new membership requests","votes_released":"Vote was released"}},"search":{"context":{"tag":"Search the #%{tag} tag"},"advanced":{"filters":{"private":"In my messages","images":"include image(s)"},"views":{"label":"Views"}}},"view_all":"view all","topics":{"bulk":{"remove_tags":"Remove Tags","progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic","other":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topics"}},"none":{"ready_to_create":"Ready to ","latest":"You're all caught up!","educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}},"bottom":{"tag":"There are no more %{tag} topics."}},"topic":{"edit_message":{"help":"Edit first post of the message"},"feature_on_profile":{"help":"Add a link to this topic on your user card and profile","title":"Feature On Profile"},"remove_from_profile":{"warning":"Your profile already has a featured topic. If you continue, this topic will replace the existing topic.","help":"Remove the link to this topic on your user profile","title":"Remove From Profile"},"suggest_create_topic":"start a new conversation?","slow_mode_update":{"description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","save":"Enable","enabled_until":"(Optional) Enabled until:","hours":"Hours:","minutes":"Minutes:","seconds":"Seconds:","durations":{"custom":"Custom Duration"}},"topic_status_update":{"title":"Topic Timer","num_of_days":"Number of days:","time_frame_required":"Please select a time frame"}},"post":{"filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"}},"category":{"location_settings_label":"Locations","location_enabled":"Allow locations to be added to topics in this category","location_topic_status":"Enable location topic status icons for topic lists in this category.","location_map_filter_closed":"Filter closed topics from the map topic list in this category."},"flagging":{},"topic_statuses":{"location":{"help":"This topic has a location."}},"filters":{"map":{"title":"Map","help":"Mark topics with locations in this category on a map."}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"discourse_local_dates":{"relative_dates":{"countdown":{"passed":"date has passed"}},"create":{"form":{"timezones_description":"Timezones will be used to display dates in preview and fallback."}}},"location":{"address":"Address","name":{"title":"Name (optional)","desc":"e.g. P. Sherman Dentist"},"street":{"title":"Number and Street","desc":"e.g. 42 Wallaby Way"},"postalcode":{"title":"Postal Code (Zip)","desc":"e.g. 2548"},"neighbourhood":{"title":"Neighbourhood","desc":"e.g. Cremorne Point"},"city":{"title":"City, Town or Village","desc":"e.g. Sydney"},"state":{"title":"State or Province","desc":"e.g. New South Wales"},"country_code":{"title":"Country","placeholder":"Select a Country"},"coordinates":"Coordinates","lat":{"title":"Latitude","desc":"e.g. -31.9456702"},"lon":{"title":"Longitude","desc":"e.g. 115.8626477"},"query":{"title":"Address","desc":"e.g. 42 Wallaby Way, Sydney."},"geo":{"desc":"Locations provided by {{provider}}","btn":{"label":"Find Address"},"results":"Addresses","no_results":"No results.","show_map":"Show Map","hide_map":"Hide Map"},"label":{"add":"Add a Location","title":"Show Location Details"},"clear":"Clear","done":"Done","errors":{"search":"There was a problem looking up that address. Please wait 5 seconds and try again."}},"map":{"search_placeholder":"Search"},"discourse_calendar":{"invite_user_notification":"%{username} invited you to: %{description}","on_holiday":"On Holiday","holiday":"Holiday","add_to_calendar":"Add to Google Calendar","region":{"title":"Region","none":"Select a region...","use_current_region":"Use Current Region","names":{"ar":"Argentina","at":"Austria","au_act":"Australia (au_act)","au_nsw":"Australia (au_nsw)","au_nt":"Australia (au_nt)","au_qld_brisbane":"Australia (au_qld_brisbane)","au_qld_cairns":"Australia (au_qld_cairns)","au_qld":"Australia (au_qld)","au_sa":"Australia (au_sa)","au_tas_north":"Australia (au_tas_north)","au_tas_south":"Australia (au_tas_south)","au_tas":"Australia (au_tas)","au_vic_melbourne":"Australia (au_vic_melbourne)","au_vic":"Australia (au_vic)","au_wa":"Australia (au_wa)","au":"Australia","be_fr":"Belgium (be_fr)","be_nl":"Belgium (be_nl)","bg_bg":"Bulgaria (bg_bg)","bg_en":"Bulgaria (bg_en)","br":"Brazil","ca_ab":"Canada (ca_ab)","ca_bc":"Canada (ca_bc)","ca_mb":"Canada (ca_mb)","ca_nb":"Canada (ca_nb)","ca_nl":"Canada (ca_nl)","ca_ns":"Canada (ca_ns)","ca_nt":"Canada (ca_nt)","ca_nu":"Canada (ca_nu)","ca_on":"Canada (ca_on)","ca_pe":"Canada (ca_pe)","ca_qc":"Canada (ca_qc)","ca_sk":"Canada (ca_sk)","ca_yt":"Canada (ca_yt)","ca":"Canada","ch_ag":"Switzerland (ch_ag)","ch_ai":"Switzerland (ch_ai)","ch_ar":"Switzerland (ch_ar)","ch_be":"Switzerland (ch_be)","ch_bl":"Switzerland (ch_bl)","ch_bs":"Switzerland (ch_bs)","ch_fr":"Switzerland (ch_fr)","ch_ge":"Switzerland (ch_ge)","ch_gl":"Switzerland (ch_gl)","ch_gr":"Switzerland (ch_gr)","ch_ju":"Switzerland (ch_ju)","ch_lu":"Switzerland (ch_lu)","ch_ne":"Switzerland (ch_ne)","ch_nw":"Switzerland (ch_nw)","ch_ow":"Switzerland (ch_ow)","ch_sg":"Switzerland (ch_sg)","ch_sh":"Switzerland (ch_sh)","ch_so":"Switzerland (ch_so)","ch_sz":"Switzerland (ch_sz)","ch_tg":"Switzerland (ch_tg)","ch_ti":"Switzerland (ch_ti)","ch_ur":"Switzerland (ch_ur)","ch_vd":"Switzerland (ch_vd)","ch_vs":"Switzerland (ch_vs)","ch_zg":"Switzerland (ch_zg)","ch_zh":"Switzerland (ch_zh)","ch":"Switzerland","cl":"Chile","co":"Colombia","cr":"Costa Rica","cz":"Czech Republic","de_bb":"Germany (de_bb)","de_be":"Germany (de_be)","de_bw":"Germany (de_bw)","de_by_augsburg":"Germany (de_by_augsburg)","de_by_cath":"Germany (de_by_cath)","de_by":"Germany (de_by)","de_hb":"Germany (de_hb)","de_he":"Germany (de_he)","de_hh":"Germany (de_hh)","de_mv":"Germany (de_mv)","de_ni":"Germany (de_ni)","de_nw":"Germany (de_nw)","de_rp":"Germany (de_rp)","de_sh":"Germany (de_sh)","de_sl":"Germany (de_sl)","de_sn_sorbian":"Germany (de_sn_sorbian)","de_sn":"Germany (de_sn)","de_st":"Germany (de_st)","de_th_cath":"Germany (de_th_cath)","de_th":"Germany (de_th)","de":"Germany","dk":"Denmark","ee":"Estonia","el":"Greece","es_an":"Spain (es_an)","es_ar":"Spain (es_ar)","es_ce":"Spain (es_ce)","es_cl":"Spain (es_cl)","es_cm":"Spain (es_cm)","es_cn":"Spain (es_cn)","es_ct":"Spain (es_ct)","es_ex":"Spain (es_ex)","es_ga":"Spain (es_ga)","es_ib":"Spain (es_ib)","es_lo":"Spain (es_lo)","es_m":"Spain (es_m)","es_mu":"Spain (es_mu)","es_na":"Spain (es_na)","es_o":"Spain (es_o)","es_pv":"Spain (es_pv)","es_v":"Spain (es_v)","es_vc":"Spain (es_vc)","es":"Spain","fi":"Finland","fr_a":"France (fr_a)","fr_m":"France (fr_m)","fr":"France","gb_con":"United Kingdom (gb_con)","gb_eaw":"United Kingdom (gb_eaw)","gb_eng":"United Kingdom (gb_eng)","gb_gsy":"United Kingdom (gb_gsy)","gb_iom":"United Kingdom (gb_iom)","gb_jsy":"United Kingdom (gb_jsy)","gb_nir":"United Kingdom (gb_nir)","gb_sct":"United Kingdom (gb_sct)","gb_wls":"United Kingdom (gb_wls)","gb":"United Kingdom","ge":"Georgia","gg":"Guernsey","hk":"Hong Kong","hr":"Croatia","hu":"Hungary","ie":"Ireland","im":"Isle of Man","is":"Iceland","it_bl":"Italy (it_bl)","it_fi":"Italy (it_fi)","it_ge":"Italy (it_ge)","it_pd":"Italy (it_pd)","it_rm":"Italy (it_rm)","it_ro":"Italy (it_ro)","it_to":"Italy (it_to)","it_tv":"Italy (it_tv)","it_ve":"Italy (it_ve)","it_vi":"Italy (it_vi)","it_vr":"Italy (it_vr)","it":"Italy","je":"Jersey","jp":"Japan","kr":"Korea (Republic of)","li":"Liechtenstein","lt":"Lithuania","lu":"Luxembourg","lv":"Latvia","ma":"Morocco","mt_en":"Malta (mt_en)","mt_mt":"Malta (mt_mt)","mx_pue":"Mexico (mx_pue)","mx":"Mexico","my":"Malaysia","ng":"Nigeria","nl":"Netherlands","no":"Norway","nz_ak":"New Zealand (nz_ak)","nz_ca":"New Zealand (nz_ca)","nz_ch":"New Zealand (nz_ch)","nz_hb":"New Zealand (nz_hb)","nz_mb":"New Zealand (nz_mb)","nz_ne":"New Zealand (nz_ne)","nz_nl":"New Zealand (nz_nl)","nz_ot":"New Zealand (nz_ot)","nz_sc":"New Zealand (nz_sc)","nz_sl":"New Zealand (nz_sl)","nz_ta":"New Zealand (nz_ta)","nz_we":"New Zealand (nz_we)","nz_wl":"New Zealand (nz_wl)","nz":"New Zealand","pe":"Peru","ph":"Philippines","pl":"Poland","pt_li":"Portugal (pt_li)","pt_po":"Portugal (pt_po)","pt":"Portugal","ro":"Romania","rs_cyrl":"Serbia (rs_cyrl)","rs_la":"Serbia (rs_la)","ru":"Russian Federation","se":"Sweden","sg":"Singapore","si":"Slovenia","sk":"Slovakia","th":"Thailand","tn":"Tunisia","tr":"Turkey","ua":"Ukraine","unitednations":" (unitednations)","ups":" (ups)","us_ak":"United States (us_ak)","us_al":"United States (us_al)","us_ar":"United States (us_ar)","us_az":"United States (us_az)","us_ca":"United States (us_ca)","us_co":"United States (us_co)","us_ct":"United States (us_ct)","us_dc":"United States (us_dc)","us_de":"United States (us_de)","us_fl":"United States (us_fl)","us_ga":"United States (us_ga)","us_gu":"United States (us_gu)","us_hi":"United States (us_hi)","us_ia":"United States (us_ia)","us_id":"United States (us_id)","us_il":"United States (us_il)","us_in":"United States (us_in)","us_ks":"United States (us_ks)","us_ky":"United States (us_ky)","us_la":"United States (us_la)","us_ma":"United States (us_ma)","us_md":"United States (us_md)","us_me":"United States (us_me)","us_mi":"United States (us_mi)","us_mn":"United States (us_mn)","us_mo":"United States (us_mo)","us_ms":"United States (us_ms)","us_mt":"United States (us_mt)","us_nc":"United States (us_nc)","us_nd":"United States (us_nd)","us_ne":"United States (us_ne)","us_nh":"United States (us_nh)","us_nj":"United States (us_nj)","us_nm":"United States (us_nm)","us_nv":"United States (us_nv)","us_ny":"United States (us_ny)","us_oh":"United States (us_oh)","us_ok":"United States (us_ok)","us_or":"United States (us_or)","us_pa":"United States (us_pa)","us_pr":"United States (us_pr)","us_ri":"United States (us_ri)","us_sc":"United States (us_sc)","us_sd":"United States (us_sd)","us_tn":"United States (us_tn)","us_tx":"United States (us_tx)","us_ut":"United States (us_ut)","us_va":"United States (us_va)","us_vi":"United States (us_vi)","us_vt":"United States (us_vt)","us_wa":"United States (us_wa)","us_wi":"United States (us_wi)","us_wv":"United States (us_wv)","us_wy":"United States (us_wy)","us":"United States","ve":"Venezuela","vi":"Virgin Islands (U.S.)","za":"South Africa"}}},"group_timezones":{"search":"Search...","group_availability":"%{group} availability"},"discourse_post_event":{"notifications":{"invite_user_notification":"%{username} has invited you to %{description}","invite_user_predefined_attendance_notification":"%{username} has automatically set your attendance and invited you to %{description}","before_event_reminder":"An event is about to start %{description}","after_event_reminder":"An event has ended %{description}","ongoing_event_reminder":"An event is ongoing  %{description}"},"preview":{"more_than_one_event":"You can’t have more than one event."},"edit_reason":"Event updated","topic_title":{"starts_at":"Event will start: %{date}","ended_at":"Event ended: %{date}","ends_in_duration":"Ends %{duration}"},"models":{"invitee":{"status":{"unknown":"Not interested","going":"Going","not_going":"Not Going","interested":"Interested"}},"event":{"expired":"Expired","status":{"standalone":{"title":"Standalone","description":"A standalone event can't be joined."},"public":{"title":"Public","description":"A public event can be joined by anyone."},"private":{"title":"Private","description":"A private event can only be joined by invited users."}}}},"event_ui":{"show_all":"Show all","participants":{"one":"%{count} user participated.","other":"%{count} users participated."},"invite":"Notify user","add_to_calendar":"Add to calendar","send_pm_to_creator":"Send PM to %{username}","edit_event":"Edit event","export_event":"Export event","created_by":"Created by","bulk_invite":"Bulk Invite","close_event":"Close event"},"invitees_modal":{"title_invited":"List of RSVPed users","title_participated":"List of users who participated","filter_placeholder":"Filter users"},"bulk_invite_modal":{"text":"Upload CSV file","title":"Bulk Invite","success":"File uploaded successfully, you will be notified via message when the process is complete.","error":"Sorry, file should be CSV format.","confirmation_message":"You’re about to notify everyone in the uploaded file.","description_public":"Public events only accept usernames for bulk invites.","description_private":"Private events only accept group names for bulk invites.","download_sample_csv":"Download a sample CSV file","send_bulk_invites":"Send invites","group_selector_placeholder":"Choose a group...","user_selector_placeholder":"Choose user...","inline_title":"Inline bulk invite","csv_title":"CSV bulk invite"},"builder_modal":{"custom_fields":{"label":"Custom Fields","placeholder":"Optional","description":"Allowed custom fields are defined in site settings. Custom fields are used to transmit data to other plugins."},"create_event_title":"Create Event","update_event_title":"Edit Event","confirm_delete":"Are you sure you want to delete this event?","confirm_close":"Are you sure you want to close this event?","create":"Create","update":"Save","attach":"Create event","add_reminder":"Add reminder","reminders":{"label":"Reminders"},"recurrence":{"label":"Recurrence","none":"No recurrence","every_day":"Every day","every_month":"Every month at this weekday","every_weekday":"Every weekday","every_week":"Every week at this weekday"},"url":{"label":"URL","placeholder":"Optional"},"name":{"label":"Event name","placeholder":"Optional, defaults to topic title"},"invitees":{"label":"Invited groups"},"status":{"label":"Status"}},"invite_user_or_group":{"title":"Notify user(s) or group(s)","invite":"Send"},"upcoming_events":{"title":"Upcoming events","creator":"Creator","status":"Status","starts_at":"Starts at"}},"poll":{"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"between_min_and_max_options":"Choose between \u003cstrong\u003e%{min}\u003c/strong\u003e and \u003cstrong\u003e%{max}\u003c/strong\u003e options."}},"hide-results":{"label":"Show vote"},"group-results":{"label":"Show breakdown"},"export-results":{"title":"Export the poll results"},"breakdown":{"votes":"%{count} votes","breakdown":"Breakdown","percentage":"Percentage","count":"Count"},"ui_builder":{"poll_result":{"always":"Always visible","vote":"On vote","closed":"When closed","staff":"Staff only"},"poll_groups":{"label":"Allowed groups"},"poll_chart_type":{"label":"Chart type","bar":"Bar","pie":"Pie"},"poll_title":{"label":"Title (optional)"},"automatic_close":{"label":"Automatically close poll"}}},"admin":{"site_settings":{"categories":{"chat_integration":"Chat Integrations"}}},"chat_integration":{"menu_title":"Chat Integrations","no_providers":"You need to enable some providers in the plugin settings","channels_with_errors":"Some channels for this provider failed last time messages were sent. Click the error icon(s) to learn more.","channel_exception":"An unknown error occured when a message was last sent to this channel.","group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","create_rule":"Create Rule","create_channel":"Create Channel","channel_delete_confirm":"Are you sure you want to delete this channel? All associated rules will be deleted.","test_modal":{"send":"Send Test Message","error":"An unknown error occured while sending the message. Check the site logs for more information."},"type":{"group_message":"Group Message","group_mention":"Group Mention"},"filter":{"watch":"All posts and replies","thread":"All posts with threaded replies"},"edit_channel_modal":{"provider":"Provider","channel_validation":{"ok":"Valid","fail":"Invalid format"}},"edit_rule_modal":{"title":"Edit Rule","save":"Save Rule","provider":"Provider","instructions":{"type":"Change the type to trigger notifications for group messages or mentions","filter":"Notification level. Mute overrides other matching rules","category":"This rule will only apply to topics in the specified category","group":"This rule will apply to posts referencing this group","tags":"If specified, this rule will only apply to topics which have at least one of these tags"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"help":"e.g. #channel, @username."}},"errors":{"action_prohibited":"The bot does not have permission to post to that channel","channel_not_found":"The specified channel does not exist on slack"}},"telegram":{"title":"Telegram","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Telegram."},"chat_id":{"title":"Chat ID","help":"A number given to you by the bot, or a broadcast channel identifier in the form @channelname"}},"errors":{"channel_not_found":"The specified channel does not exist on Telegram","forbidden":"The bot does not have permission to post to this channel"}},"discord":{"title":"Discord","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Discord."},"webhook_url":{"title":"Webhook URL","help":"The webhook URL created in your Discord server settings"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"help":"e.g. #channel, @username."}},"errors":{"channel_not_found":"The specified channel does not exist on Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Matrix."},"room_id":{"title":"Room ID","help":"The 'private identifier' for the room. It should look something like !abcdefg:matrix.org"}},"errors":{"unknown_token":"Access token is invalid","unknown_room":"Room ID is invalid"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"The name of the Zulip stream the message should be sent to. e.g. 'general'"},"subject":{"help":"The subject that these messages sent by the bot should be given"}},"errors":{"does_not_exist":"That stream does not exist on Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"help":"e.g. #channel, @username."}},"errors":{"invalid_channel":"That channel does not exist on Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"help":"A Gitter room's name e.g. gitterHQ/services."},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new integration in a Gitter room."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow Token","help":"The flow token provided after creating a source for a flow into which you want to send messages."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}}}}}}};
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
moment.fn.shortDate = function(){ return this.format('D MMM YYYY'); };
moment.fn.longDate = function(){ return this.format('D MMMM YYYY LT'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

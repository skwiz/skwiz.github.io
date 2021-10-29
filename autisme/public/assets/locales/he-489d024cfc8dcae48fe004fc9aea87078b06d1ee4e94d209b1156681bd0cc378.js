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
r += "הבה <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">נתחיל להתדיין!</a> כרגע יש ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "נושא <strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> נושאים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " ו";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "פוסט <strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "־<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> פוסטים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". המבקרים זקוקים ליותר מכך כדי לקרוא ולהיות מעורבים – אנו ממליצים על ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "נושא<strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> נושאים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " ו";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "פוסט <strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "־<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> פוסטים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " לפחות. רק חברי הסגל יכולים לראות את ההודעה הזאת.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "הבה <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">נתחיל להתדיין!</a> כרגע יש ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "נושא <strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> נושאים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". המבקרים זקוקים ליותר מכך כדי לקרוא ולהיות מעורבים – אנו ממליצים על ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "נושא<strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> נושאים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " לפחות. רק חברי הסגל יכולים לראות את ההודעה הזאת.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "הבה <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">נתחיל להתדיין!</a> כרגע יש ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "פוסט <strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> פוסטים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". המבקרים זקוקים ליותר מכך כדי לקרוא ולהיות מעורבים – אנו ממליצים על ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "פוסט <strong>אחד</strong>";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> פוסטים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " לפחות. רק חברי הסגל יכולים לראות את ההודעה הזאת.";
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
r += "שגיאה אחת בשעה הגיעה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בשעה הגיעו";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> למגבלת האתר שהיא ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "שגיאה אחת בשעה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בשעה";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "שגיאה אחת בדקה הגיעה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בדקה הגיעו";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> למגבלת האתר שהיא ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "שגיאה אחת בדקה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בדקה";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "שגיאה אחת בשעה חרגה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בשעה חרגו";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> ממגבלת האתר שהיא ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "שגיאה אחת בשעה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בשעה";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "שגיאה אחת בדקה חרגה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בדקה חרגו";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> ממגבלת האתר שהיא ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "שגיאה אחת בדקה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " שגיאות בדקה";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "יש ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "replyCount";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "תגובה <b>אחת</b>";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> תגובות";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " עם זמן קריאה משוערך של <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "readingTime";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "דקה";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " דקות";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
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
r += "פעולה זו תסיר ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "פוסט <b>אחד</b>";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> פוסטים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " ו";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "נושא <b>אחד</b>";
return r;
},
"other" : function(d){
var r = "";
r += "־<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> נושאים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " שנכתבו על ידי משתמש זה, תסיר את החשבון שלו, תחסום הרשמה מכתובת ה־IP‏ <b> ‏";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b> ותוסיף את כתובת הדוא״ל שלו <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> לרשימת חסימה קבועה. האם משתמש זה הוא בוודאות מפיץ זבל (ספאמר)?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "לנושא זה יש ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "count";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "תגובה אחת";
return r;
},
"two" : function(d){
var r = "";
r += "שתי תגובות";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " תגובות";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " תגובות";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "עם יחס גבוה של לייקים לפוסט";
return r;
},
"med" : function(d){
var r = "";
r += "עם יחס גבוה מאוד של לייקים לפוסט";
return r;
},
"high" : function(d){
var r = "";
r += "עם יחס גבוה במיוחד של לייקים לפוסט";
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
r += "פעולה זו תמחק ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "פוסט אחד";
return r;
},
"two" : function(d){
var r = "";
r += "שני פוסטים";
return r;
},
"many" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " פוסטים";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " פוסטים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " ו";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "נושא אחד";
return r;
},
"two" : function(d){
var r = "";
r += "שני נושאים";
return r;
},
"many" : function(d){
var r = "";
r += "־" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " נושאים";
return r;
},
"other" : function(d){
var r = "";
r += "־" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " נושאים";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". להמשיך?";
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
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["he"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
}};
MessageFormat.locale.he = function ( n ) {
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

I18n.translations = {"he":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"בית","two":"בתים","many":"בתים","other":"בתים"},"gb":"ג״ב","kb":"ק״ב","mb":"מ״ב","tb":"ט״ב"}}},"short":{"thousands":"%{number} אלף","millions":"%{number} מיליון"}},"dates":{"time":"h:mm a","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"D בMMM","full_no_year_no_time":"Do בMMMM","long_with_year":"D בMMM ‏YYYY ‏HH:mm","long_with_year_no_time":"D בMMM ‏YYYY","full_with_year_no_time":"D בMMMM ‏YYYY","long_date_with_year":"D בMMM‏ YY‏ LT","long_date_without_year":"D בMMM‏ LT","long_date_with_year_without_time":"D בMMM ‏YY","long_date_without_year_with_linebreak":"D בMMM‏ \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D בMMM‏ YY‏ \u003cbr/\u003eLT","wrap_ago":"לפני %{date}","wrap_on":"ב־%{date}","tiny":{"half_a_minute":"פחות מדקה","less_than_x_seconds":{"one":"פחות משנייה","two":"פחות מ־%{count} שניות","many":"פחות מ־%{count} שניות","other":"פחות מ־%{count} שניות"},"x_seconds":{"one":"שנייה אחת","two":"%{count} שניות","many":"%{count} שניות","other":"%{count} שניות"},"less_than_x_minutes":{"one":"פחות מדקה","two":"פחות מ־%{count} דקות","many":"פחות מ־%{count} דקות","other":"פחות מ־%{count} דקות"},"x_minutes":{"one":"דקה אחת","two":"%{count} דקות","many":"%{count} דקות","other":"%{count} דקות"},"about_x_hours":{"one":"שעה אחת","two":"שעתיים","many":"%{count} שעות","other":"%{count} שעות"},"x_days":{"one":"יום","two":"יומיים","many":"%{count} ימים","other":"%{count} ימים"},"x_months":{"one":"חודש","two":"חודשיים","many":"%{count} חודשים","other":"%{count} חודשים"},"about_x_years":{"one":"שנה","two":"שנתיים","many":"%{count} שנים","other":"%{count} שנים"},"over_x_years":{"one":"יותר משנה","two":"יותר משנתיים","many":"יותר מ־%{count} שנים","other":"יותר מ־%{count} שנים"},"almost_x_years":{"one":"שנה","two":"שנתיים","many":"%{count} שנים","other":"%{count} שנים"},"date_month":"D בMMM","date_year":"MMM YY"},"medium":{"x_minutes":{"one":"דקה","two":"%{count} דקות","many":"%{count} דקות","other":"%{count} דקות"},"x_hours":{"one":"שעה","two":"שעתיים","many":"%{count} שעות","other":"%{count} שעות"},"x_days":{"one":"יום","two":"יומיים","many":"%{count} ימים","other":"%{count} ימים"},"date_year":"D בMMM‏ YY"},"medium_with_ago":{"x_minutes":{"one":"לפני דקה","two":"לפני %{count} דקות","many":"לפני %{count} דקות","other":"לפני %{count} דקות"},"x_hours":{"one":"לפני שעה","two":"לפני שעתיים","many":"לפני %{count} שעות","other":"לפני %{count} שעות"},"x_days":{"one":"אתמול","two":"שלשום","many":"לפני %{count} ימים","other":"לפני %{count} ימים"},"x_months":{"one":"לפני חודש","two":"לפני חודשיים","many":"לפני %{count} חודשים","other":"לפני %{count} חודשים"},"x_years":{"one":"לפני שנה","two":"לפני שנתיים","many":"לפני %{count} שנים","other":"לפני %{count} שנים"}},"later":{"x_days":{"one":"יום לאחר מכן","two":"כעבור יומיים","many":"כעבור %{count} ימים","other":"כעבור %{count} ימים"},"x_months":{"one":"חודש לאחר מכן","two":"כעבור חודשיים","many":"כעבור %{count} חודשים","other":"כעבור %{count} חודשים"},"x_years":{"one":"שנה לאחר מכן","two":"כעבור שנתיים","many":"כעבור %{count} שנים","other":"כעבור %{count} שנים"}},"previous_month":"חודש קודם","next_month":"חודש הבא","placeholder":"תאריך","from_placeholder":"מתאריך","to_placeholder":"עד תאריך"},"share":{"topic_html":"נושא: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"פוסט מס׳ %{postNumber}","close":"סגירה","twitter":"שיתוף בטוויטר","facebook":"שיתוף בפייסבוק","email":"שליחה בדוא״ל","url":"העתקה ושיתוף של כתובת"},"action_codes":{"public_topic":"נושא זה הפך לציבורי ב־%{when}","private_topic":"נושא זה הפך להודעה פרטית ב־%{when}","split_topic":"נושא זה פוצל ב־%{when}","invited_user":"נשלחה הזמנה אל %{who} ב־%{when}","invited_group":"נשלחה הזמנה אל %{who} ב־%{when}","user_left":"%{who} הסירו עצמם מהודעה זו %{when}","removed_user":"התבצעה הסרה של %{who} ב־%{when}","removed_group":"%{who} הוסר ב־%{when}","autobumped":"הוקפץ אוטומטית ב־%{when}","autoclosed":{"enabled":"נסגר ב־%{when}","disabled":"נפתח ב־%{when}"},"closed":{"enabled":"נסגר ב־%{when}","disabled":"נפתח ב־%{when}"},"archived":{"enabled":"עבר לארכיון ב־%{when}","disabled":"יצא מהארכיון ב־%{when}"},"pinned":{"enabled":"ננעץ ב־%{when}","disabled":"נעיצה בוטלה ב־%{when}"},"pinned_globally":{"enabled":"ננעץ גלובלית ב־%{when}","disabled":"נעיצה בוטלה ב־%{when}"},"visible":{"enabled":"נכנס לרשימה ב־%{when}","disabled":"הוצא מהרשימה ב־%{when}"},"banner":{"enabled":"באנר זה נוצר ב־%{when}. הוא יופיע בראש כל דף עד שישוחרר על ידי המשתמש/ת.","disabled":"באנר זה הוסר ב־%{when}. הוא לא יופיע יותר בראש כל דף."},"forwarded":"העברת ההודעה שלעיל"},"topic_admin_menu":"פעולות על נושא","skip_to_main_content":"דילוג לתוכן הראשי","wizard_required":"ברוך בואך ל־Discourse החדש שלך! נתחיל עם \u003ca href='%{url}' data-auto-route='true'\u003eאשף ההתקנה\u003c/a\u003e ✨","emails_are_disabled":"כל הדוא״ל היוצא נוטרל באופן גורף על ידי מנהל אתר. שום הודעת דוא״ל, מכל סוג שהוא, לא תשלח.","software_update_prompt":{"message":"עדכנו את האתר הזה, \u003cspan\u003eנא לרענן\u003c/span\u003e או שיתכן שתופענה כל מיני תופעות בלתי מוסברות.","dismiss":"התעלמות"},"bootstrap_mode_enabled":{"one":"כדי להקל על הקמת האתר החדש שלך, כרגע המערכת במצב אתחול ראשוני. לכל המשתמשים החדשים תוענק דרגת האמון 1 ויישלח אליהם תמצות יומי בדוא״ל. אפשרות זו תכבה אוטומטית לאחר שהצטרף משתמש %{count}.","two":"כדי להקל על הקמת האתר החדש שלך, כרגע המערכת במצב אתחול ראשוני. לכל המשתמשים החדשים תוענק דרגת האמון 1 ויישלח אליהם תמצות יומי בדוא״ל. אפשרות זו תכבה אוטומטית לאחר שהצטרפו %{count} משתמשים.","many":"כדי להקל על הקמת האתר החדש שלך, כרגע המערכת במצב אתחול ראשוני. לכל המשתמשים החדשים תוענק דרגת האמון 1 ויישלח אליהם תמצות יומי בדוא״ל. אפשרות זו תכבה אוטומטית לאחר שהצטרפו %{count} משתמשים.","other":"כדי להקל על הקמת האתר החדש שלך, כרגע המערכת במצב אתחול ראשוני. לכל המשתמשים החדשים תוענק דרגת האמון 1 ויישלח אליהם תמצות יומי בדוא״ל. אפשרות זו תכבה אוטומטית לאחר שהצטרפו %{count} משתמשים."},"bootstrap_mode_disabled":"מצב Bootstrap יבוטל תוך 24 שעות.","themes":{"default_description":"בררת מחדל","broken_theme_alert":"יתכן שהאתר שלך לא יתפקד כיוון שבערכת העיצוב / הרכיב %{theme} יש שגיאות. יש להשבית את אלה תחת %{path}."},"s3":{"regions":{"ap_northeast_1":"אסיה ומדינות האוקיינוס השקט (טוקיו)","ap_northeast_2":"אסיה ומדינות האוקיינוס השקט (סיאול)","ap_east_1":"אסיה ומדינות האוקיינוס השקט (הונג קונג)","ap_south_1":"אסיה ומדינות האוקיינוס השקט (מומבאי)","ap_southeast_1":"אסיה ומדינות האוקיינוס השקט (סינגפור)","ap_southeast_2":"אסיה ומדינות האוקיינוס השקט (סידני)","ca_central_1":"קנדה (מרכז)","cn_north_1":"סין (בייג׳ינג)","cn_northwest_1":"סין (נינגשיה)","eu_central_1":"האיחוד האירופי (פרנקפורט)","eu_north_1":"אירופה (שטוקהולם)","eu_south_1":"אירופה (מילאנו)","eu_west_1":"אירופה (אירלנד)","eu_west_2":"אירופה (לונדון)","eu_west_3":"אירופה (פריז)","sa_east_1":"אמריקה הדרומית (סאו פאולו)","us_east_1":"מזרח ארה״ב (צפון וירג׳יניה)","us_east_2":"מזרח ארה״ב (אוהיו)","us_gov_east_1":"הענן הממשלתי של AWS (ארה״ב-מערב)","us_gov_west_1":"הענן הממשלתי של AWS (מערב ארה״ב)","us_west_1":"מערב ארה״ב (צפון קליפורניה)","us_west_2":"מערב ארה״ב (אורגון)"}},"clear_input":"פינוי הקלט","edit":"עריכת הכותרת והקטגוריה של נושא זה","expand":"הרחב","not_implemented":"תכונה זו עדיין לא מומשה, עמך הסליחה!","no_value":"לא","yes_value":"כן","submit":"שליחה","generic_error":"ארעה שגיאה, עמך הסליחה.","generic_error_with_reason":"ארעה שגיאה: %{error}","sign_up":"הרשמה","log_in":"כניסה","age":"גיל","joined":"הצטרפות","admin_title":"ניהול","show_more":"להציג עוד","show_help":"אפשרויות","links":"קישורים","links_lowercase":{"one":"קישור","two":"קישורים","many":"קישורים","other":"קישורים"},"faq":"שאלות נפוצות","guidelines":"הנחיות","privacy_policy":"מדיניות פרטיות","privacy":"פרטיות","tos":"תנאי השירות","rules":"חוקים","conduct":"נהלי התנהגות","mobile_view":"תצוגת נייד","desktop_view":"תצוגת מחשב","or":"או","now":"ממש עכשיו","read_more":"המשך קריאה","more":"להרחבה","x_more":{"one":"עוד %{count}","two":"עוד %{count}","many":"עוד %{count}","other":"עוד %{count}"},"never":"אף פעם","every_30_minutes":"כל 30 דקות","every_hour":"כל שעה","daily":"יומית","weekly":"שבועית","every_month":"כל חודש","every_six_months":"כל שישה חודשים","max_of_count":"%{count} לכל היותר","character_count":{"one":"תו אחד","two":"%{count} תווים","many":"%{count} תווים","other":"%{count} תווים"},"period_chooser":{"aria_label":"סינון לפי תקופה"},"related_messages":{"title":"הודעות קשורות","see_all":"להציג את \u003ca href=\"%{path}\"\u003eכל ההודעות\u003c/a\u003e מאת ‎@%{username}‎…"},"suggested_topics":{"title":"נושאים מוצעים","pm_title":"הודעות מוצעות"},"about":{"simple_title":"על אודות","title":"על אודות %{title}","stats":"סטטיסטיקות אתר","our_admins":"המנהלים שלנו","our_moderators":"המפקחים שלנו","moderators":"מפקחים","stat":{"all_time":"כל הזמנים","last_day":"24 השעות האחרונות","last_7_days":"7 הימים האחרונים","last_30_days":"30 הימים האחרונים"},"like_count":"לייקים","topic_count":"נושאים","post_count":"פוסטים","user_count":"משתמשים","active_user_count":"משתמשים פעילים","contact":"יצירת קשר","contact_info":"במקרה של בעיה קריטית או דחופה המשפיעה על אתר זה, נא ליצור אתנו קשר דרך: %{contact_info}."},"bookmarked":{"title":"סימנייה","edit_bookmark":"עריכת סימנייה","clear_bookmarks":"מחיקת סימניות","help":{"bookmark":"יש ללחוץ כדי ליצור סימנייה לפוסט הראשון בנושא זה","edit_bookmark":"יש ללחוץ כדי לערוך את הסימניה בנושא זה","edit_bookmark_for_topic":"יש ללחוץ כדי לערוך את הסימניה לנושא זה","unbookmark":"יש ללחוץ כדי להסיר את כל הסימניות בנושא זה","unbookmark_with_reminder":"יש ללחוץ כדי להסיר את כל הסימניות והתזכורות בנושא זה."}},"bookmarks":{"created":"הוספת את הפוסט הזה לסימניות. %{name}","not_bookmarked":"סמנו פוסט זה עם סימנייה","remove_reminder_keep_bookmark":"הסרת תזכורת ושמירת הסימנייה","created_with_reminder":"סימנת את הפוסט הזה עם תזכורת %{date}. %{name}","remove":"הסרה מהסימניות","delete":"מחיקת סימנייה","confirm_delete":"למחוק את הסימנייה הזאת? גם התזכורת תימחק.","confirm_clear":"לנקות את כל הסימניות מנושא זה?","save":"שמירה","no_timezone":"עדיין לא הגדרת אזור זמן. לא תהיה לך אפשרות להגדיר תזכורות. ניתן להגדיר אותו \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eבפרופיל שלך\u003c/a\u003e.","invalid_custom_datetime":"התאריך והשעה שסיפקת שגויים, נא לנסות שוב.","list_permission_denied":"אין לך הרשאה לצפות בסימניות של המשתמש הזה.","no_user_bookmarks":"לא הוספת פוסטים לסימניות, סימניות מאפשרות לך לפנות במהירות לפוסטים מסוימים.","auto_delete_preference":{"label":"למחוק אוטומטית","never":"לעולם לא","when_reminder_sent":"לאחר שליחת התזכורת","on_owner_reply":"לאחר שהגבתי לנושא הזה"},"search_placeholder":"חיפוש סימניות לפי שם, כותרת הנושא או תוכן הפוסט","search":"חיפוש","reminders":{"today_with_time":"היום ב־%{time}","tomorrow_with_time":"מחר ב־%{time}","at_time":"ב־%{date_time}","existing_reminder":"הגדרת תזכורת עבור הסימנייה הזאת שתישלח ב־%{at_date_time}"}},"copy_codeblock":{"copied":"הועתק!"},"drafts":{"label":"טיוטות","label_with_count":"טיוטות (%{count})","resume":"המשך","remove":"הסרה","remove_confirmation":"למחוק את הטיוטה הזאת?","new_topic":"טיוטת נושא חדשה","new_private_message":"טיוטת הודעה אישית חדשה","topic_reply":"טיוטת תשובה","abandon":{"confirm":"יש טיוטה שהתחלת לערוך לנושא הזה. מה לעשות אתה?","yes_value":"להשליך","no_value":"לחזור לעריכה"}},"topic_count_categories":{"one":"הצגת נושא %{count} חדש או עדכני","two":"הצגת %{count} נושאים חדשים או עדכניים","many":"הצגת %{count} נושאים חדשים או עדכניים","other":"הצגת %{count} נושאים חדשים או עדכניים"},"topic_count_latest":{"one":"הצגת נושא %{count} חדש או עדכני","two":"הצגת %{count} נושאים חדשים או עדכניים","many":"הצגת %{count} נושאים חדשים או עדכניים","other":"הצגת %{count} נושאים חדשים או עדכניים"},"topic_count_unseen":{"one":"הצגת נושא %{count} חדש או עדכני","two":"הצגת %{count} נושאים חדשים או עדכניים","many":"הצגת %{count} נושאים חדשים או עדכניים","other":"הצגת %{count} נושאים חדשים או עדכניים"},"topic_count_unread":{"one":"הצגת נושא %{count} שלא נקרא","two":"הצגת %{count} נושאים שלא נקראו","many":"הצגת %{count} נושאים שלא נקראו","other":"הצגת %{count} נושאים שלא נקראו"},"topic_count_new":{"one":"הצגת נושא %{count} חדש","two":"הצגת %{count} נושאים חדשים","many":"הצגת %{count} נושאים חדשים","other":"הצגת %{count} נושאים חדשים"},"preview":"תצוגה מקדימה","cancel":"ביטול","deleting":"מתבצעת מחיקה…","save":"שמירת השינויים","saving":"בהליכי שמירה...","saved":"נשמר!","upload":"העלאה","uploading":"בהליכי העלאה...","uploading_filename":"מעלה: %{filename}...","processing_filename":"מתבצע עיבוד: %{filename}…","clipboard":"לוח","uploaded":"הועלה!","pasting":"מדביק...","enable":"לאפשר","disable":"לנטרל","continue":"המשך","undo":"לבטל פעולה","revert":"להחזיר","failed":"נכשל","switch_to_anon":"כניסה למצב אלמוני","switch_from_anon":"יציאה ממצב אלמוני","banner":{"close":"שחרור באנר זה.","edit":"עריכת הבאנר הזה \u003e\u003e"},"pwa":{"install_banner":"\u003ca href\u003eלהתקין את %{title} על המכשיר הזה?\u003c/a\u003e"},"choose_topic":{"none_found":"לא נמצאו נושאים.","title":{"search":"חיפוש אחר נושא","placeholder":"נא להקליד כאן את כותרת הנושא, הכתובת או את המזהה"}},"choose_message":{"none_found":"לא נמצאו הודעות.","title":{"search":"חיפוש אחר הודעה","placeholder":"נא להקליד כאן את כותרת ההודעה, הכתובת או את המזהה"}},"review":{"order_by":"סידור לפי","date_filter":"פורסם בין","in_reply_to":"בתגובה ל","explain":{"why":"נא להסביר למה הפריט הזה הגיע לתור","title":"ניקוד שניתן לסקירה","formula":"נוסחה","subtotal":"סכום ביניים","total":"סה״כ","min_score_visibility":"ניקוד מזערי כדי שיופיע","score_to_hide":"ניקוד להסתרת הפוסט","take_action_bonus":{"name":"ננקטה פעולה","title":"כאשר חבר סגל בוחר לנקוט בפעולה הדגל מקבל בונוס."},"user_accuracy_bonus":{"name":"דיוק משתמש","title":"משתמשים שסימון הדגל שלהם קיבל הסכמה בעבר מקבלים בונוס."},"trust_level_bonus":{"name":"דרגת אמון","title":"לפריטים לסקירה שנוצרו על ידי משתמשים בדרגות אמון גבוהות יותר יש ניקוד גבוה יותר."},"type_bonus":{"name":"בונוס סוג","title":"לסוגים מסוימים של פריטים לסקירה ניתן להקצות בונוס על ידי הסגל כדי שהעדיפות שלהם תעלה."}},"stale_help":"הפריט לסקירה נפתר על ידי \u003cb\u003e%{username}\u003c/b\u003e.","claim_help":{"optional":"באפשרותך לדרוש את הפריט כדי למנוע מאחרים לסקור אותו.","required":"עליך לדרוש פריטים לפני שיתאפשר לך לסקור אותם.","claimed_by_you":"דרשת את הפריט הזה ועכשיו יתאפשר לך לסקור אותו.","claimed_by_other":"הפריט הזה זמין לסריקה רק על ידי \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"דרישת פריט זה"},"unclaim":{"help":"הסרת דרישה זו"},"awaiting_approval":"בהמתנה לאישור","delete":"הסרה","settings":{"saved":"נשמר","save_changes":"שמירת השינויים","title":"הגדרות","priorities":{"title":"עדיפויות ניתנות לסקירה"}},"moderation_history":"היסטוריית פעילות פיקוח","view_all":"להציג הכול","grouped_by_topic":"קיבוץ לפי נושא","none":"אין פריטים לסקירה.","view_pending":"הצגת ממתינים","topic_has_pending":{"one":"לנושא זה יש פוסט \u003cb\u003eאחד\u003c/b\u003e שממתין לאישור","two":"לנושא זה יש \u003cb\u003e%{count}\u003c/b\u003e פוסטים שממתינים לאישור","many":"לנושא זה יש \u003cb\u003e%{count}\u003c/b\u003e פוסטים שממתינים לאישור","other":"לנושא זה יש \u003cb\u003e%{count}\u003c/b\u003e פוסטים שממתינים לאישור"},"title":"סקירה","topic":"נושא:","filtered_topic":"סיננת לתוכן שממתין לסקירה בנושא מסוים.","filtered_user":"משתמש","filtered_reviewed_by":"נסקר על ידי","show_all_topics":"להציג את כל הנושאים","deleted_post":"(פוסט נמחק)","deleted_user":"(משתמש נמחק)","user":{"bio":"קורות חיים","website":"אתר","username":"שם משתמש","email":"דוא״ל","name":"שם","fields":"שדות","reject_reason":"סיבה"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (של הסימון האחרון)","two":"%{agreed}, %{disagreed}, %{ignored} (של %{count} הסימונים האחרונים)","many":"%{agreed}, %{disagreed}, %{ignored} (של %{count} הסימונים האחרונים)","other":"%{agreed}, %{disagreed}, %{ignored} (של %{count} הסימונים האחרונים)"},"agreed":{"one":"%{count}% מסכים","two":"%{count}% מסכימים","many":"%{count}% מסכימים","other":"%{count}% מסכימים"},"disagreed":{"one":"%{count}% חולק","two":"%{count}% חולקים","many":"%{count}% חולקים","other":"%{count}% חולקים"},"ignored":{"one":"%{count}% מתעלם","two":"%{count}% מתעלמים","many":"%{count}% מתעלמים","other":"%{count}% מתעלמים"}},"topics":{"topic":"נושא","reviewable_count":"ספירה","reported_by":"דווח ע״י","deleted":"[נושא נמחק]","original":"(נושא מקורי)","details":"פרטים","unique_users":{"one":"משתמש אחד","two":"%{count} משתמשים","many":"%{count} משתמשים","other":"%{count} משתמשים"}},"replies":{"one":"תגובה אחת","two":"%{count} תגובות","many":"%{count} תגובות","other":"%{count} תגובות"},"edit":"עריכה","save":"שמירה","cancel":"ביטול","new_topic":"אישור הפריט הזה ייצור נושא חדש","filters":{"all_categories":"(כל הקטגוריות)","type":{"title":"סוג","all":"(כל הסוגים)"},"minimum_score":"ניקוד מזערי","refresh":"רענון","status":"מצב","category":"קטגוריה","orders":{"score":"ניקוד","score_asc":"ניקוד (הפוך)","created_at":"מועד יצירה","created_at_asc":"מועד יצירה (הפוך)"},"priority":{"title":"עדיפות מזערית","any":"(כלשהו)","low":"נמוכה","medium":"בינונית","high":"גבוהה"}},"conversation":{"view_full":"הצגת הדיון המלא"},"scores":{"about":"ניקוד זה מחושב בהתאם לדרגת האמון של המדווח, הדיוק בסימונים הקודמים ועדיפות הפריט המדווח.","score":"ניקוד","date":"תאריך","type":"סוג","status":"מצב","submitted_by":"הוגש על ידי","reviewed_by":"נסקר על ידי"},"statuses":{"pending":{"title":"בהמתנה"},"approved":{"title":"אושר"},"rejected":{"title":"נדחה"},"ignored":{"title":"זכה להתעלמות"},"deleted":{"title":"נמחק"},"reviewed":{"title":"(כל אלו שנסקרו)"},"all":{"title":"(הכול)"}},"types":{"reviewable_flagged_post":{"title":"פוסט שדוגל","flagged_by":"דוגל על ידי"},"reviewable_queued_topic":{"title":"נושא בתור"},"reviewable_queued_post":{"title":"הוספת פוסט לתור"},"reviewable_user":{"title":"משתמש"},"reviewable_post":{"title":"פוסט"}},"approval":{"title":"הפוסט זקוק לאישור","description":"הפוסט התקבל אך הוא נתון לאישור מפקח בטרם הצגתו. נא להתאזר בסבלנות.","pending_posts":{"one":"יש לך פוסט \u003cstrong\u003eאחד\u003c/strong\u003e ממתין.","two":"יש לך \u003cstrong\u003e%{count}\u003c/strong\u003e פוסטים ממתינים.","many":"יש לך \u003cstrong\u003e%{count}\u003c/strong\u003e פוסטים ממתינים.","other":"יש לך \u003cstrong\u003e%{count}\u003c/strong\u003e פוסטים ממתינים."},"ok":"אישור"},"example_username":"שם משתמש","reject_reason":{"title":"למה בחרת לדחות את המשתמש הזה?","send_email":"שליחת הודעה דחייה בדוא״ל"}},"relative_time_picker":{"minutes":{"one":"דקה","two":"דקות","many":"דקות","other":"דקות"},"hours":{"one":"שעה","two":"שעתיים","many":"שעות","other":"שעות"},"days":{"one":"יום","two":"יומיים","many":"ימים","other":"ימים"},"months":{"one":"חודש","two":"חודשיים","many":"חודשים","other":"חודשים"},"years":{"one":"שנה","two":"שנתיים","many":"שנים","other":"שנים"},"relative":"יחסי"},"time_shortcut":{"later_today":"בהמשך היום","next_business_day":"יום העסקים הבא","tomorrow":"מחר","post_local_date":"תאריך בפוסט","later_this_week":"בהמשך השבוע","this_weekend":"בסוף שבוע זה","start_of_next_business_week":"יום שני","start_of_next_business_week_alt":"יום שני הבא","two_weeks":"שבועיים","next_month":"חודש הבא","six_months":"שישה חודשים","custom":"תאריך ושעה מותאמים אישית","relative":"זמן יחסי","none":"אין צורך","last_custom":"התאריך והשעה האחרונים שהותאמו אישית"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e פרסם \u003ca href='%{topicUrl}'\u003eאת הנושא\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eאת/ה\u003c/a\u003e פרסמת \u003ca href='%{topicUrl}'\u003eאת הנושא\u003c/a\u003e","user_replied_to_post":"התקבלה תגובה מאת \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e על: \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eהגבת\u003c/a\u003e על: \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e הגיב \u003ca href='%{topicUrl}'\u003eלנושא הזה\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eהגבת\u003c/a\u003e \u003ca href='%{topicUrl}'\u003eלנושא הזה\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e הזכיר/ה את \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e הזכיר/ה \u003ca href='%{user2Url}'\u003eאותך\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eאת/ה\u003c/a\u003e הזכרת את \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"פורסם על ידי \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"פורסם על \u003ca href='%{userUrl}'\u003eידך\u003c/a\u003e","sent_by_user":"נשלח על ידי \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"נשלח \u003ca href='%{userUrl}'\u003eעל ידך\u003c/a\u003e"},"directory":{"username":"שם משתמש","filter_name":"סינון לפי שם משתמש","title":"משתמשים","likes_given":"הוענקו","likes_received":"התקבלו","topics_entered":"נצפה","topics_entered_long":"נושאים שנצפו","time_read":"זמן קריאה","topic_count":"נושאים","topic_count_long":"נושאים שנוצרו","post_count":"תגובות","post_count_long":"תגובות שפורסמו","no_results":"לא נמצאו תוצאות","days_visited":"ביקורים","days_visited_long":"ימים לביקור","posts_read":"נקראו","posts_read_long":"פוסטים שנקראו","last_updated":"עדכון אחרון:","total_rows":{"one":"משתמש/ת %{count}","two":"%{count} משתמשים","many":"%{count} משתמשים","other":"%{count} משתמשים"},"edit_columns":{"title":"עריכת עמודות ספרייה","save":"שמירה","reset_to_default":"איפוס לבררת מחדל"},"group":{"all":"כל הקבוצות"}},"group_histories":{"actions":{"change_group_setting":"שינוי הגדרות קבוצה","add_user_to_group":"הוספת משתמש/ת","remove_user_from_group":"הסרת משתמש/ת","make_user_group_owner":"הפיכה לבעלים","remove_user_as_group_owner":"שלילת בעלות"}},"groups":{"member_added":"הוסיף","member_requested":"בקשה התקבלה ב־","add_members":{"title":"הוספת משתמשים אל %{group_name}","description":"נא למלא רשימת משתמשים אותם ברצונך להזמין לקבוצה או להדביק רשימה מופרדת בפסיקים:","usernames_placeholder":"שמות משתמשים","usernames_or_emails_placeholder":"שמות משתמשים או כתובות דוא״ל","notify_users":"להודיע למשתמשים","set_owner":"הגדרת משתמשים כבעלי הקבוצה הזו"},"requests":{"title":"בקשות","reason":"סיבה","accept":"אישור","accepted":"התקבל","deny":"דחייה","denied":"נדחה","undone":"הבקשה נמשכה","handle":"טיפול בבקשות חברות"},"manage":{"title":"ניהול","name":"שם","full_name":"שם מלא","add_members":"הוספת משתמשים","invite_members":"הזמנה","delete_member_confirm":"להסיר את ‚%{username}’ מהקבוצה ‚%{group}’?","profile":{"title":"פרופיל"},"interaction":{"title":"אינטראקציה","posting":"מפרסם","notification":"התראה"},"email":{"title":"כתובת דוא״ל","status":"סונכרנו %{old_emails} / %{total_emails} הודעות דוא״ל דרך IMAP.","enable_smtp":"הפעלת SMTP","enable_imap":"הפעלת IMAP","test_settings":"בדיקת ההגדרות","save_settings":"שמירת ההגדרות","last_updated":"עדכון אחרון:","last_updated_by":"על ידי","settings_required":"כל ההגדרות נחוצות, נא למלא את כל השדות בטרם האימות.","smtp_settings_valid":"הגדרות ה־SMTP תקינות.","smtp_title":"SMTP","smtp_instructions":"הפעלת SMTP לקבוצה תגרום לכך שכל הודעות הדוא״ל היוצאות נשלחות מהתיבה של הקבוצה יישלחו באמצעות הגדרות ה־SMTP שמוגדרות כאן במקום בשרת הדוא״ל שמוגדר להודעות דוא״ל אחרות שנשלחות על ידי הפורום שלך.","imap_title":"IMAP","imap_additional_settings":"הגדרות נוספות","imap_instructions":"הפעלת IMAP לקבוצה תגרום לכך שההודעות תסונכרנה בין התיבה של הקבוצה ושרת ה־IMAP ותיבת הדואר שסופקו. יש להפעיל SMTP עם פרטי גישה תקפים ומאומתים לפני שניתן יהיה להפעיל IMAP. שם המשתמש והססמה של תיבת הדוא״ל שתשמש ל־SMTP ישמשו גם ל־IMAP. למידע נוסף ניתן \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003eלקרוא את ההכרזה על התכונה בפורום Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"אזהרה: יכולת זו היא בחיתולים. יש תמיכה רשמית רק ב־GMail. השימוש על אחריותך בלבד!","imap_settings_valid":"הגדרות ה־IMAP תקינות.","smtp_disable_confirm":"השבתת ה־SMTP תוביל לאיפוס הגדרות ה־SMTP וה־IMAP והשבתת כל יכולותיהן. להמשיך?","imap_disable_confirm":"השבתת ה־IMAP תוביל לאיפוס הגדרות ה־IMAP והשבתת כל יכולותיהן. להמשיך?","imap_mailbox_not_selected":"עליך לבחור תיבת דואר עבור תצורת IMAP זו, אחרת לא יסונכרנו תיבות דואר כלל!","prefill":{"title":"מילוי הגדרות מראש עבור:","gmail":"GMail"},"credentials":{"title":"פרטי גישה","smtp_server":"שרת SMTP","smtp_port":"פתחת SMTP","smtp_ssl":"להשתמש ב־SSL ל־SMTP","imap_server":"שרת IMAP","imap_port":"פתחת IMAP","imap_ssl":"להשתמש ב־SSL ל־IMAP","username":"שם משתמש","password":"סיסמה"},"settings":{"title":"הגדרות","allow_unknown_sender_topic_replies":"לאפשר תגובות לנושאים משולחים בלתי־ידועים.","allow_unknown_sender_topic_replies_hint":"מאפשר לשולחים בלתי־ידועים להגיב לנושאים קבוצתיים. אם האפשרות מבוטלת, תגובות מכתובות דוא״ל שטרם הוזמנו לנושא תיצורנה נושא חדש."},"mailboxes":{"synchronized":"תיבת דוא״ל מסונכרנת","none_found":"לא נמצאו תיבות דוא״ל בחשבון הדוא״ל הזה.","disabled":"מושבתת"}},"membership":{"title":"חברות","access":"גישה"},"categories":{"title":"קטגוריות","long_title":"הודעות בררת המחדל של הקטגוריה","description":"כאשר משתמשים מתווספים לקבוצה זו, הגדרות ההתראה של הקטגוריות שלהם לבררות מחדל אלו. יש להם אפשרות לשנות זאת בהמשך.","watched_categories_instructions":"לעקוב אוטומטית אחר כל הנושאים בקטגוריות הללו. חברי הקבוצה יקבלו התראה על כל הפוסטים והנושאים החדשים. מספר הפוסטים יופיע לצד כותרת הנושא.","tracked_categories_instructions":"לעקוב אוטומטית אחר כל הנושאים עם קטגוריות אלו. מס׳ פוסטים חדשים יופיע ליד הנושא.","watching_first_post_categories_instructions":"המשתמשים יקבלו הודעה לגבי הפוסט הראשון בכל נושא חדש בקטגוריות אלו.","regular_categories_instructions":"אם הקטגוריות האלו הושתקו, השתקתן תיפסק לחברי הקבוצה. המשתמשים יקבלו התראות אם מאזכרים אותם או כשהם מקבלים תגובה.","muted_categories_instructions":"משתמשים לא יקבלו הודעה על נושאים חדשים בקטגוריות אלה והם לא יופיעו בקטגוריות או בדפים האחרונים."},"tags":{"title":"תגיות","long_title":"התראות בררת המחדל של התגיות","description":"כאשר משתמשים מתווספים לקבוצה זו, הגדרות ההתראה של התגיות שלהם יוגדרו לבררות מחדל אלו. יש להם אפשרות לשנות זאת בהמשך.","watched_tags_instructions":"לעקוב אוטומטית אחר כל הנושאים עם התגיות הללו. חברי הקבוצה יקבלו התראה על כל הפוסטים והנושאים החדשים. מספר הפוסטים יופיע לצד כותרת הנושא.","tracked_tags_instructions":"לעקוב אוטומטית אחר כל הנושאים עם תגיות אלו. ספירה של פוסטים חדשים תופיע ליד הנושא.","watching_first_post_tags_instructions":"המשתמשים יקבלו הודעות על פוסט ראשון בכל נושא חדש עם התגיות האלו.","regular_tags_instructions":"אם התגיות האלו הושתקו, השתקתן תיפסק לחברי הקבוצה. המשתמשים יקבלו התראות אם מאזכרים אותם או כשהם מקבלים תגובה.","muted_tags_instructions":"המשתמשים לא יקבלו הודעות על נושאים חדשים עם תגיות אלו והם לא יופיעו ברשימת האחרונים."},"logs":{"title":"יומנים","when":"מתי","action":"פעולה","acting_user":"משתמש פועל","target_user":"משתמש מטרה","subject":"נושא","details":"פרטים","from":"מאת","to":"אל"}},"permissions":{"title":"הרשאות","none":"אין קטגוריות המשויכות לקבוצה זו.","description":"החברים בקבוצה זו יכולים לגשת לקטגוריות האלו"},"public_admission":"אפשרו למשתמשים להצטרף לקבוצה בחופשיות (דורש קבוצה פומבית)","public_exit":"אפשרו למשתמשים לעזוב את הקבוצה בחופשיות","empty":{"posts":"אין פוסטים של חברי קבוצה זו.","members":"אין חברים בקבוצה זו.","requests":"אין בקשות חברות בקבוצה זו.","mentions":"אין איזכורים של קבוצה זו.","messages":"אין הודעות לקבוצה זו.","topics":"אין נושאים שנוצרו על ידי חברים של קבוצה זו.","logs":"אין יומנים עבור קבוצה זו."},"add":"הוספה","join":"הצטרף","leave":"עזוב","request":"בקשה","message":"הודעה","confirm_leave":"לעזוב את הקבוצה הזאת?","allow_membership_requests":" לאפשר למשתמשים לשלוח בקשות חברות לבעלי הקבוצה (נדרשת קבוצה גלויה לכלל)","membership_request_template":"תבנית מותאמת אישית שתוצג למשתמשים בעת שליחת בקשת חברות","membership_request":{"submit":"הגשת בקשה","title":"בקש להצטרף ל%{group_name}","reason":"תן לבעלי הקבוצה לדעת למה אתה שייך לקבוצה זו"},"membership":"חברות","name":"שם","group_name":"שם הקבוצה","user_count":"משתמשים","bio":"על הקבוצה","selector_placeholder":"נא להקליד שם משתמש","owner":"בעלים","index":{"title":"קבוצות","all":"כל הקבוצות","empty":"אין קבוצות נראות.","filter":"סינון לפי סוג קבוצה","owner_groups":"קבוצות שבבעלותי","close_groups":"קבוצות סגורות","automatic_groups":"קבוצות אוטומטיות","automatic":"אוטומטי","closed":"סגורה","public":"ציבורי","private":"פרטי","public_groups":"קבוצות ציבוריות","my_groups":"הקבוצות שלי","group_type":"סוג קבוצה","is_group_user":"חבר","is_group_owner":"בעלים"},"title":{"one":"קבוצה","two":"קבוצות","many":"קבוצות","other":"קבוצות"},"activity":"פעילות","members":{"title":"חברים","filter_placeholder_admin":"שם משתמש או כתובת דוא״ל","filter_placeholder":"שם משתמש","remove_member":"הסרת חבר","remove_member_description":"להסיר את \u003cb\u003e%{username}\u003c/b\u003e מקבוצה זו","make_owner":"הסבה לבעלים","make_owner_description":"הסבה של \u003cb\u003e%{username}\u003c/b\u003e לבעלים של קבוצה זו","remove_owner":"הסרת בעלות","remove_owner_description":"הסרת הבעלות של \u003cb\u003e%{username}\u003c/b\u003e על קבוצה זו","make_primary":"להפוך לראשית","make_primary_description":"להפוך אותה לקבוצה הראשית של \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"הסרה כראשית","remove_primary_description":"להסיר אותה כקבוצה הראשית של \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"הסרת חברים","remove_members_description":"הסרת המשתמשים הנבחרים מהקבוצה הזאת","make_owners":"הסבה לבעלים","make_owners_description":"להפוך את המשתמשים הנבחרים לבעלי הקבוצה הזאת","remove_owners":"הסרת בעלים","remove_owners_description":"להסיר את המשתמשים הנבחרים מהנהלת הקבוצה הזאת","make_all_primary":"להפוך לראשית אצל כולם","make_all_primary_description":"להפוך את הקבוצה הזאת לראשית עבור כל המשתמשים הנבחרים","remove_all_primary":"הסרה כראשית","remove_all_primary_description":"הסרת הקבוצה הזאת כראשית","owner":"בעלות","primary":"ראשית","forbidden":"אין לך הרשאות לצפות ברשימת החברים.","no_filter_matches":"אין חברים שעונים לחיפוש הזה."},"topics":"נושאים","posts":"פוסטים","mentions":"אזכורים","messages":"הודעות","notification_level":"ברירת מחדל של רמת התראות להודעות קבוצה","alias_levels":{"mentionable":"מי יכול @להזכיר קבוצה זו","messageable":"מי יכול לשלוח הודעות בקבוצה זו","nobody":"אף אחד","only_admins":"רק מנהלים","mods_and_admins":"רק מפקחים ומנהלים","members_mods_and_admins":"רק חברי הקבוצה, מפקחים ומנהלים","owners_mods_and_admins":"בעלי קבוצות, המפקחים והמנהלים","everyone":"כולם"},"notifications":{"watching":{"title":"במעקב","description":"תקבלו התראה על כל פוסט חדש במסגרת כל הודעה, וסך התשובות יוצג."},"watching_first_post":{"title":"צפייה בפוסט הראשון","description":"תקבל התראה עבור הודעות חדשות בקבוצה זו אבל לא לתגובות עליהן."},"tracking":{"title":"במעקב","description":"תקבלו התראה אם מישהו מזכיר את @שמכם או עונה לכם, ותופיע ספירה של תגובות חדשות."},"regular":{"title":"רגיל","description":"תקבלו התראה אם מישהו מזכיר את @שמכם או עונה לכם."},"muted":{"title":"מושתק","description":"לא תקבלו הודעה על כל הקשור להודעות בקבוצה זו."}},"flair_url":"תמונת תג לדמות","flair_upload_description":"יש להשתמש בתמונות ריבועיות שגודלן חורג מ־20 על 20 פיקסלים.","flair_bg_color":"צבע רקע של תג לדמות","flair_bg_color_placeholder":"(רשות) ערך הקסדצימלי של הצבע","flair_color":"צבע תג לדמות","flair_color_placeholder":"(רשות) ערך הקסדצימלי של הצבע","flair_preview_icon":"תצוגה מקדימה של סמל","flair_preview_image":"תצוגה מקדימה של תמונה","flair_type":{"icon":"נא לבחור סמל","image":"העלאת תמונה"},"default_notifications":{"modal_title":"התראות בררת המחדל של המשתמש","modal_description":"מעניין אותך להחיל את השינוי הזה רטרואקטיבית? פעולה זו תשנה את העדפותיהם של %{count} משתמשים קיימים.","modal_yes":"כן","modal_no":"לא, להחיל את השינוי מעתה ואילך"}},"user_action_groups":{"1":"לייקים שהוענקו","2":"לייקים שהתקבלו","3":"סימניות","4":"נושאים","5":"תשובות","6":"תגובות","7":"אזכורים","9":"ציטוטים","11":"עריכות","12":"פריטים שנשלחו","13":"דואר נכנס","14":"ממתין","15":"טיוטות"},"categories":{"all":"כל הקטגוריות","all_subcategories":"הכול","no_subcategory":"ללא","category":"קטגוריה","category_list":"הצגת רשימת קטגוריות","reorder":{"title":"שינוי סדר קטגוריות","title_long":"סידור רשימת הקטגוריות מחדש","save":"שמירת הסדר","apply_all":"החלה","position":"מיקום"},"posts":"פוסטים","topics":"נושאים","latest":"לאחרונה","subcategories":"תתי קטגוריות","muted":"קטגוריות מושתקות","topic_sentence":{"one":"נושא אחד","two":"%{count} נושאים","many":"%{count} נושאים","other":"%{count} נושאים"},"topic_stat":{"one":"%{number} / %{unit}","two":"%{number} / %{unit}","many":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"שבוע","month":"חודש"},"topic_stat_all_time":{"one":"%{number} סה״כ","two":"%{number} סה״כ","many":"%{number} סה״כ","other":"%{number} סה״כ"},"topic_stat_sentence_week":{"one":"נושא חדש %{count} בשבוע האחרון","two":"%{count} נושאים חדשים בשבוע האחרון","many":"%{count} נושאים חדשים בשבוע האחרון","other":"%{count} נושאים חדשים בשבוע האחרון"},"topic_stat_sentence_month":{"one":"נושא חדש %{count} בחודש האחרון","two":"%{count} נושאים חדשים בחודש האחרון","many":"%{count} נושאים חדשים בחודש האחרון","other":"%{count} נושאים חדשים בחודש האחרון"},"n_more":"קטגוריות (%{count} נוספות)…"},"ip_lookup":{"title":"חיפוש כתובת IP","hostname":"שם שרת","location":"מיקום","location_not_found":"(לא ידוע)","organisation":"ארגון","phone":"טלפון","other_accounts":"חשבונות נוספים עם כתובת IP זו:","delete_other_accounts":"מחיקה %{count}","username":"שם משתמש","trust_level":"דרגת-אמון","read_time":"זמן צפייה","topics_entered":"כניסות לנושאים","post_count":"# פוסטים","confirm_delete_other_accounts":"להסיר חשבונות אלו?","powered_by":"משתמש \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"הועתק"},"user_fields":{"none":"(בחרו אפשרות)","required":"נא למלא ערך עבור „%{name}”"},"user":{"said":"%{username}:","profile":"פרופיל","mute":"השתקה","edit":"עריכת העדפות","download_archive":{"button_text":"להוריד הכל","confirm":"להוריד את הפוסטים שלך?","success":"ההורדה החלה, תישלח אליך הודעה עם סיום התהליך.","rate_limit_error":"ניתן להוריד פוסטים פעם אחת ביום, נא לנסות שוב מחר."},"new_private_message":"הודעה חדשה","private_message":"הודעה","private_messages":"הודעות","user_notifications":{"filters":{"filter_by":"סינון לפי","all":"הכל","read":"נקרא","unread":"לא-נקראו"},"ignore_duration_title":"התעלמות ממשתמש","ignore_duration_username":"שם משתמש","ignore_duration_when":"משך:","ignore_duration_save":"התעלמות","ignore_duration_note":"נא לשים לב שכל ההתעלמויות נמחקות אוטומטית לאחר שמשך ההתעלמות פג.","ignore_duration_time_frame_required":"נא לבחור מסגרת זמנים","ignore_no_users":"אין לך משתמשים ברשימת ההתעלמות.","ignore_option":"זכה להתעלמות","ignore_option_title":"לא יגיעו אליך התראות שקשורות למשתמש הזה וכל הנושאים שנכתבו על ידיו לרבות התגובות יוסתרו.","add_ignored_user":"הוספה…","mute_option":"מושתק","mute_option_title":"לא תגענה אליך התראות בנוגע למשתמש זה.","normal_option":"רגיל","normal_option_title":"תגיע אליך התראה אם המשתמש הזה יגיב לך, יצטט אותך או יאזכר אותך."},"notification_schedule":{"title":"תזמון התראות","label":"הפעלת תזמון התראות מותאם אישית","tip":"מחוץ לשעות אלו המצב שלך יוגדר לכדי ‚לא להפריע’ אוטומטית.","midnight":"חצות","none":"ללא","monday":"יום שני","tuesday":"יום שלישי","wednesday":"יום רביעי","thursday":"יום חמישי","friday":"יום שישי","saturday":"שבת","sunday":"יום ראשון","to":"עד"},"activity_stream":"פעילות","read":"נקרא","read_help":"נושאים שנקראו לאחרונה","preferences":"העדפות","feature_topic_on_profile":{"open_search":"נא לבחור נושא חדש","title":"נא לבחור נושא","search_label":"חיפוש אחר נושא לפי כותרת","save":"שמירה","clear":{"title":"ניקוי","warning":"למחוק את הנושאים המומלצים שלך?"}},"use_current_timezone":"להשתמש באזור הזמן הנוכחי","profile_hidden":"הפרופיל הציבורי של משתמש זה מוסתר","expand_profile":"הרחב","sr_expand_profile":"הרחבת פרטי הפרופיל","collapse_profile":"הקטן","sr_collapse_profile":"צמצום פרטי הפרופיל","bookmarks":"סימניות","bio":"אודותיי","timezone":"אזור זמן","invited_by":"הוזמנו על ידי","trust_level":"דרגת אמון","notifications":"התראות","statistics":"סטטיסטיקות","desktop_notifications":{"label":"התראות חיות","not_supported":"התראות לא נתמכות בדפדפן זה. עמך הסליחה.","perm_default":"הפעלת התראות","perm_denied_btn":"הרשאות נדחו","perm_denied_expl":"דחית הרשאה לקבלת התראות. יש לאפשר התראות בהגדרות הדפדפן שלך.","disable":"השבתת התראות","enable":"הפעלת התראות","each_browser_note":"הערה: עליך לשנות הגדרה זו בכל דפדפן שבו אתה משתמש. כל ההודעות יושבתו במצב \"אל תפריע\", ללא קשר להגדרה זו.","consent_prompt":"לקבל התראות חיות כשמתקבלות תגובות לפוסטים שלך?"},"dismiss":"דחה","dismiss_notifications":"בטלו הכל","dismiss_notifications_tooltip":"סימון כל ההתראות שלא נקראו כהתראות שנקראו","no_messages_title":"אין לך הודעות כלל","no_messages_body":"עליך לנהל שיחה אישית עם מישהו או מישהי מחוץ לרצף הדיון?\u003cbr\u003e\u003cbr\u003e ניתן לשלוח אליו או אליה הודעה על ידי בחירת תמונת המשתמש המתאימה ואיתור הכפתור הודעה %{icon}. לקבלת עזרה, ניתן \u003ca href='%{aboutUrl}'\u003eלשלוח הודעה לאחד מחברי הסגל\u003c/a\u003e.\n","no_bookmarks_title":"עדיין לא הוספת שום דבר לסימניות","no_bookmarks_body":"ניתן להתחיל להוסיף פוסטים לסימניות עם הכפתור %{icon} והן תופענה כאן לפנייה בקלות. ניתן גם לתזמן תזכורת!\n","no_bookmarks_search":"לא נמצאו סימניות עם שאילתת החיפוש שסופקה.","no_notifications_title":"אין לך התראות עדיין","no_notifications_page_title":"אין לך התראות עדיין","first_notification":"התראה ראשונה! בחרו אותה כדי להתחיל.","dynamic_favicon":"הצגת ספירה בסמל הדפדפן","skip_new_user_tips":{"description":"דילוג על עצות ועיטורים של קבלת משתמשים חדשים","not_first_time":"לא הפעם הראשונה שלך?","skip_link":"דילוג על העצות האלו","read_later":"אקרא את זה אחר כך."},"theme_default_on_all_devices":"הגדרת ערכת עיצוב זו כבררת המחדל לכל המכשירים שלי","color_scheme_default_on_all_devices":"הגדרת ערכות צבעים כבררת מחדל לכל המכשירים שלי","color_scheme":"ערכת צבעים","color_schemes":{"default_description":"בררת המחדל לערכת העיצוב","disable_dark_scheme":"כמו הרגילה","dark_instructions":"ניתן להדגים את ערכת צבעי הערכה הכהה על ידי החלפת מצב התצוגה הכהה במכשיר שלך.","undo":"איפוס","regular":"רגילה","dark":"מצב כהה","default_dark_scheme":"(בררת המחדל של האתר)"},"dark_mode":"מצב כהה","dark_mode_enable":"הפעלת ערכת צבעים כהה אוטומטית","text_size_default_on_all_devices":"הפוך את גודל הטקסט הזה לברירת המחדל בכל המכשירים שלי","allow_private_messages":"אפשר למשתמשים אחרים לשלוח לי הודעות פרטיות","external_links_in_new_tab":"פתיחת כל הקישורים החיצוניים בלשונית חדשה","enable_quoting":"הפעלת תגובת ציטוט לטקסט מסומן","enable_defer":"הפעלת דחייה לאחר כך כדי לסמן נושאים כלא נקראו","change":"שנה","featured_topic":"נושא מומלץ","moderator":"ל־%{user} יש תפקיד פיקוח","admin":"%{user} הוא מנהל מערכת","moderator_tooltip":"משתמש זה הוא מפקח","admin_tooltip":"משתמש זה חבר הנהלה","silenced_tooltip":"משתמש זה מושתק","suspended_notice":"המשתמש הזה מושעה עד לתאריך: %{date}.","suspended_permanently":"משתמש זה מושעה.","suspended_reason":"הסיבה: ","github_profile":"GitHub","email_activity_summary":"סיכום פעילות","mailing_list_mode":{"label":"מצב רשימת תפוצה","enabled":"אפשר מצב רשימת תפוצה","instructions":"הגדרה זו דורסת את הגדרת „סיכום פעילות”.\u003cbr /\u003e\nנושאים וקטגוריות שהושתקו לא יופיעו בהודעות דוא״ל אלו.\n","individual":"לשלוח לי דוא״ל על כל פוסט חדש","individual_no_echo":"לשלוח לי דוא״ל על כל פוסט חדש מלבד שלי","many_per_day":"לשלוח לי דוא״ל על כל פוסט חדש (בערך %{dailyEmailEstimate} ביום)","few_per_day":"לשלוח לי דוא״ל על כל פוסט חדש (בערך 2 ביום)","warning":"מצב רשימת תפוצה מופעל. מצב זה משבית את הגדרות ההתראות בדוא״ל."},"tag_settings":"תגיות","watched_tags":"נצפה","watched_tags_instructions":"תעקבו באופן אוטומטי אחרי כל הנושאים עם התגיות הללו. תקבלו התראה על כל הפרסומים והנושאים החדשים. מספר הפרסומים יופיע לצד כותרת הנושא.","tracked_tags":"במעקב","tracked_tags_instructions":"אתם תעקבו אוטומטית אחר כל הנושאים עם תגיות אלו. ספירה של פוסטים חדשים תופיע ליד הנושא.","muted_tags":"מושתק","muted_tags_instructions":"אתם לא תיודעו לגבי דבר בנוגע לנושאים חדשים עם תגיות אלו, והם לא יופיעו ברשימת האחרונים.","watched_categories":"נצפה","watched_categories_instructions":"תעקבו באופן אוטומטי אחרי כל הנושאים בקטגוריות אלו. תקבלו התראה על כל הפוסטים והנושאים החדשים. מספר הפוסטים יופיע לצד כותרת הנושא.","tracked_categories":"במעקב","tracked_categories_instructions":"אתם תעקבו אוטומטית אחר כל הנושאים עם קטגוריות אלו. ספירה של פוסטים חדשים תופיע ליד הנושא.","watched_first_post_categories":"צפייה בפוטס הראשון","watched_first_post_categories_instructions":"אתם תיודעו לגבי הפוסט הראשון בכל נושא חדש בקטגוריות אלו.","watched_first_post_tags":"צפייה בפוסט ראשון","watched_first_post_tags_instructions":"אתם תיודעו לגבי הפוסט הראשון בכל נושא חדש בתגיות אלו.","muted_categories":"מושתק","muted_categories_instructions":"לא תקבל הודעה בנוגע לנושאים חדשים בקטגוריות אלה, והם לא יופיעו בקטגוריות או בדפים האחרונים.","muted_categories_instructions_dont_hide":"לא תישלחנה אליך התראות על שום דבר שנוגע לנושאים בקטגוריות האלו.","regular_categories":"רגילות","regular_categories_instructions":"הקטגוריות האלו תופענה תחת רשימות הנושאים „אחרונים” ו־„מובילים”.","no_category_access":"בתור פיקוח יש לך גישה מוגבלת לקטגוריות, שמירה מושבתת.","delete_account":"מחיקת החשבון שלי","delete_account_confirm":"להסיר את החשבון? לא ניתן לבטל פעולה זו!","deleted_yourself":"החשבון שלך נמחק בהצלחה.","delete_yourself_not_allowed":"נא לפנות לחבר סגל אם ברצונך למחוק את החשבון שלך.","unread_message_count":"הודעות","admin_delete":"מחיקה","users":"משתמשים","muted_users":"מושתק","muted_users_instructions":"הדחקת כל ההתראות וההודעות הפרטיות מהמשתמשים האלה.","allowed_pm_users":"מותר","allowed_pm_users_instructions":"לאפשר הודעות מידיות ממשתמשים אלו בלבד.","allow_private_messages_from_specific_users":"לאפשר רק למשתמשים מסוימים לשלוח לי הודעות","ignored_users":"זכה להתעלמות","ignored_users_instructions":"הדחקת כל הפוסטים, ההתראות וההודעות הפרטיות מהמשתמשים האלה.","tracked_topics_link":"הצגה","automatically_unpin_topics":"ביטול נעיצה אוטומטית של נושאים עם הגעה לתחתית.","apps":"אפליקציות","revoke_access":"שלילת גישה","undo_revoke_access":"ביטול שלילת גישה","api_approved":"אושרו:","api_last_used_at":"שימוש אחרון:","theme":"ערכת עיצוב","save_to_change_theme":"ערכת העיצוב תעודכן לאחר הלחיצה על „%{save_text}”","home":"דף בית ברירת מחדל","staged":"מבוים","staff_counters":{"flags_given":"דגלים שעוזרים","flagged_posts":"פסטים מדוגלים","deleted_posts":"פוסטים שנמחקו","suspensions":"השעיות","warnings_received":"אזהרות","rejected_posts":"פוסטים שנדחו"},"messages":{"all":"כל תיבות הדואר הנכנס","inbox":"דואר נכנס","personal":"אישיות","latest":"אחרונות","sent":"נשלח","unread":"טרם נקראו","unread_with_count":{"one":"לא נקראה (%{count})","two":"לא נקראה (%{count})","many":"לא נקראה (%{count})","other":"לא נקראה (%{count})"},"new":"חדשות","new_with_count":{"one":"חדש (%{count})","two":"חדש (%{count})","many":"חדש (%{count})","other":"חדש (%{count})"},"archive":"ארכיון","groups":"הקבוצות שלי","move_to_inbox":"העברה לדואר נכנס","move_to_archive":"ארכיון","failed_to_move":"בעיה בהעברת ההודעות שנבחרו (אולי יש תקלה בהתחברות?)","tags":"תגיות","warnings":"אזהרות רשמיות","read_more_in_group":"מעניין אותך לקרוא עוד? אפשר לעיין בהודעות אחרות ב־%{groupLink}.","read_more":"מעניין אותך לקרוא עוד? אפשר לעיין בהודעות אחרות ב\u003ca href='%{basePath}/u/%{username}/messages'\u003eהודעות הפרטיות\u003c/a\u003e."},"preferences_nav":{"account":"חשבון","security":"אבטחה","profile":"פרופיל","emails":"כתובות דוא״ל","notifications":"התראות","categories":"קטגוריות","users":"משתמשים","tags":"תגיות","interface":"מנשק","apps":"יישומים"},"change_password":{"success":"(דוא״ל נשלח)","in_progress":"(דוא״ל בשליחה)","error":"(שגיאה)","emoji":"אמוג׳י של מנעול","action":"שליחת דוא״ל לאיפוס סיסמה","set_password":"הזן סיסמה","choose_new":"בחרו סיסמה חדשה","choose":"בחרו סיסמה"},"second_factor_backup":{"title":"קודים כגיבוי לאימות דו־שלבי","regenerate":"חדש","disable":"בטל","enable":"הפעל","enable_long":"הפעל קודי גיבוי","manage":{"one":"ניהול קודים כגיבוי. נותר לרשותך קוד \u003cstrong\u003e%{count}\u003c/strong\u003e כגיבוי.","two":"ניהול קודים כגיבוי. נותרו לרשותך \u003cstrong\u003e%{count}\u003c/strong\u003e קודים כגיבוי.","many":"ניהול קודים כגיבוי. נותרו לרשותך \u003cstrong\u003e%{count}\u003c/strong\u003e קודים כגיבוי.","other":"ניהול קודים כגיבוי. נותרו לרשותך \u003cstrong\u003e%{count}\u003c/strong\u003e קודים כגיבוי."},"copy_to_clipboard":"העתקה ללוח","copy_to_clipboard_error":"שגיאה בהעתקת מידע ללוח","copied_to_clipboard":"הועתק ללוח","download_backup_codes":"הורדת קודים לגיבוי","remaining_codes":{"one":"נותר לרשותך קוד \u003cstrong\u003e%{count}\u003c/strong\u003e כגיבוי.","two":"נותרו לרשותך \u003cstrong\u003e%{count}\u003c/strong\u003e קודים כגיבוי.","many":"נותרו לרשותך \u003cstrong\u003e%{count}\u003c/strong\u003e קודים כגיבוי.","other":"נותרו לרשותך \u003cstrong\u003e%{count}\u003c/strong\u003e קודים כגיבוי."},"use":"להשתמש בקוד גיבוי","enable_prerequisites":"עליך להפעיל שיטת אימות דו־שלבי עיקרית בטרם יצירת קודים כגיבוי.","codes":{"title":"קודי גיבוי נוצרו","description":"בכל אחד מהקודים האלו המיועדים לשחזור ניתן להשתמש רק פעם אחת. מוטב לשמור עליהם במקום בטוח אך נגיש."}},"second_factor":{"title":"אימות דו־שלבי","enable":"ניהול אימות דו־שלבי","disable_all":"להשבית הכול","forgot_password":"שכחת את הססמה?","confirm_password_description":"אנא אשר את סיסמתך בכדי להמשיך","name":"שם","label":"קוד","rate_limit":"אנא המתינו לפני שתנסו קוד אישור אחר.","enable_description":"יש לסרוק את קוד ה־QR הזה ביישומון נתמך (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) ולהקליד את קוד האימות שלך.\n","disable_description":"נא למלא את קוד האישור מהיישומון שלך","show_key_description":"הכנס ידנית","short_description":"הגנה על החשבון שלך עם קודים חד־פעמיים לאבטחה.\n","extended_description":"אימות דו־שלבי מחזק את אבטחת המשתמש שלך באסימון אבטחה חד־פעמי בנוסף לססמה שלך. ניתן ליצור אסימונים על מכשירי \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e ו־\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e.\n","oauth_enabled_warning":"לידיעתך, כניסות מרשתות חברתיות יושבתו לאחר הפעלת אימות דו־שלבי בחשבונך.","use":"להשתמש ביישומון אימות","enforced_notice":"עליך להפעיל אימות דו־שלבי בטרם הגישה לאתר הזה.","disable":"בטל","disable_confirm":"להשבית את כל שיטות האימות הדו־שלבי?","save":"שמירה","edit":"עריכה","edit_title":"עריכת מאמת","edit_description":"שם המאמת","enable_security_key_description":"כאשר \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003eמפתח האבטחה החומרתי\u003c/a\u003e שלך מוכן, יש ללחוץ על כפתור הרישום שלהלן.\n","totp":{"title":"מאמתים מבוססי אסימונים","add":"הוספת מאמת","default_name":"המאמת שלי","name_and_code_required_error":"עליך לספק שם וקוד מיישומון האימות שלך."},"security_key":{"register":"הרשמה","title":"מפתחות אבטחה","add":"הוספת מפתח אבטחה","default_name":"מפתח אבטחה עיקרי","not_allowed_error":"זמן תהליך רישום מפתח האבטחה פג או שבוטל.","already_added_error":"כבר רשמת את מפתח האבטחה הזה. אין צורך לרשום אותו שוב.","edit":"עריכת מפתח אבטחה","save":"שמירה","edit_description":"שם מפתח אבטחה","name_required_error":"עליך לציין שם למפתח האבטחה שלך."}},"change_about":{"title":"שינוי בנוגע אליי","error":"ארעה שגיאה בשינוי ערך זה."},"change_username":{"title":"שנה שם משתמש","confirm":"האם את/ה בטוח/ה שברצונך לשנות את שם המשתמש/ת שלך?","taken":"סליחה, שם המשתמש הזה תפוס.","invalid":"שם המשתמש אינו תקין. עליו לכלול רק אותיות באנגלית ומספרים."},"add_email":{"title":"הוספת דוא״ל","add":"הוספה"},"change_email":{"title":"החלפת כתובת דוא״ל","taken":"סליחה, הכתובת הזו אינה זמינה.","error":"הייתה שגיאה בשינוי כתובת הדואר האלקטרוני שלך. אולי היא תפוסה?","success":"שלחנו דואר אלקטרוני לכתובת הדואר הזו. בבקשה עיקבו אחרי הוראות האישור שם.","success_via_admin":"שלחנו הודעה לכתובת הדוא״ל הזו. על המשתמש יהיה לעקוב אחר הוראות האישור שבהודעה.","success_staff":"שלחנו דואר אלקטרוני לכתובת הדואר הזו. אנא עיקבו אחרי הוראות האישור."},"change_avatar":{"title":"שינוי תמונת הפרופיל","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, מבוסס על","gravatar_title":"החלפת הדמות שלך באתר %{gravatarName}","gravatar_failed":"לא הצלחנו למצוא %{gravatarName} עם כתובת הדוא״ל הזו.","refresh_gravatar_title":"רענון ה־%{gravatarName} שלך","letter_based":"תמונת פרופיל משובצת מהמערכת","uploaded_avatar":"תמונה אישית","uploaded_avatar_empty":"הוסיפו תמונה אישית","upload_title":"העלאת התמונה שלך","image_is_not_a_square":"אזהרה: קיצצנו את התמונה שלך; האורך והרוחב לא היו שווים.","logo_small":"הלוגו הקטן של האתר. משמש כבררת מחדל."},"change_profile_background":{"title":"כותרת פרופיל","instructions":"כותרות הפרופילים ימורכזו ורוחבן ייקבע ל־1110 פיקסלים כבררת מחדל."},"change_card_background":{"title":"כרטיס הרקע של המשתמש/ת","instructions":"תמונות רקע ימורכזו ויוצגו ברוחב ברירת מחדל של 590px."},"change_featured_topic":{"title":"נושא מומלץ","instructions":"קישור לנושא הזה יופיע בכרטיס המשתמש ובפרופיל שלך."},"email":{"title":"דואר אלקטרוני","primary":"כתובת דוא״ל ראשית","secondary":"כתובות דוא״ל משניות","primary_label":"ראשי","unconfirmed_label":"לא מאושר","resend_label":"שליחת הודעת אימות בדוא״ל מחדש","resending_label":"שולח...","resent_label":"הודעת דוא״ל נשלחה","update_email":"שנה דואר אלקטרוני","set_primary":"הגדרת כתובת דוא״ל ראשית","destroy":"הסרת דוא״ל","add_email":"הוספת כתובת דוא״ל חלופית","auth_override_instructions":"ניתן לעדכן את כתובת הדוא״ל דרך ספק האימות.","no_secondary":"אין כתובות דוא״ל משניות","instructions":"לעולם לא מוצג לציבור.","admin_note":"הערה: משתמש ניהולי שמשנה כתובת דוא״ל למשתמש שאינו ניהולי מציינת שהגישה של המשתמש לכתובת הדוא״ל המקורית אבדה, לכן תישלח הודעת איפוס ססמה לכתובת החדשה בדוא״ל. כתובת הדוא״ל של המשתמש לא תוחלף עד לביצוע תהליך איפוס הססמה.","ok":"נשלח אליכם דואר אלקטרוני לאישור","required":"נא למלא כתובת דוא״ל","invalid":"בבקשה הכניסו כתובת דואר אלקטרוני תקינה","authenticated":"כתובת הדואר האלקטרוני שלך אושרה על ידי %{provider}","invite_auth_email_invalid":"הודעת ההזמנה שלך בדוא״ל אינה תואמת להודעה שאומתה על ידי %{provider}","authenticated_by_invite":"כתובת הדוא״ל שלך אושרה על ידי ההזמנה","frequency_immediately":"נשלח לך הודעה בדוא״ל מיידית אם טרם קראת את מה ששלחנו לך קודם.","frequency":{"one":"נשלח לך הודעה בדוא״ל רק אם לא הופעת בדקה האחרונה.","two":"נשלח לך הודעה בדוא״ל רק אם לא הופעת ב־%{count} הדקות האחרונות.","many":"נשלח לך הודעה בדוא״ל רק אם לא הופעת ב־%{count} הדקות האחרונות.","other":"נשלח לך הודעה בדוא״ל רק אם לא הופעת ב־%{count} הדקות האחרונות."}},"associated_accounts":{"title":"חשבונות מקושרים","connect":"התחבר","revoke":"בטל","cancel":"ביטול","not_connected":"(לא מחובר)","confirm_modal_title":"חיבור חשבון %{provider}","confirm_description":{"disconnect":"חשבון %{provider} הקיים שלך ‚%{account_description}’ ינותק.","account_specific":"החשבון שלך ‚%{account_description}’ ב־%{provider} ישמש לאימות.","generic":"החשבון של אצל %{provider} ישמש לאימות."}},"name":{"title":"שם","instructions":"שמך המלא (רשות)","instructions_required":"שמך המלא","required":"נא למלא שם","too_short":"השם שלך קצר מידי","ok":"השם נראה טוב"},"username":{"title":"שם משתמש/ת","instructions":"ייחודי, ללא רווחים, קצר","short_instructions":"אנשים יכולים לאזכר אותך כ @%{username}","available":"שם המשתמש שלך פנוי","not_available":"לא זמין. נסו %{suggestion}?","not_available_no_suggestion":"לא זמין","too_short":"שם המשתמש שלך קצר מידי","too_long":"שם המשתמש שלך ארוך מידי","checking":"בודק זמינות שם משתמש...","prefilled":"הדואר האלקטרוני תואם לשם משתמש זה","required":"נא למלא שם משתמש","edit":"עריכת שם משתמש"},"locale":{"title":"שפת מנשק","instructions":"שפת מנשק המשתמש. היא תתחלף עם רענון העמוד.","default":"(ברירת מחדל)","any":"כלשהו"},"password_confirmation":{"title":"סיסמה שוב"},"invite_code":{"title":"קוד הזמנה","instructions":"רישום חשבון דורש קוד הזמנה"},"auth_tokens":{"title":"מכשירים שהיו בשימוש לאחרונה","details":"פרטים","log_out_all":"להוציא את כולם","not_you":"לא אתה?","show_all":"הצג הכל (%{count})","show_few":"הצג פחות","was_this_you":"האם זה היית אתה?","was_this_you_description":"אם לא נכנסת למערכת, אנו ממליצים לך לשנות את ססמתך ולהוציא את המשתמש בכל מקום שניתן.","browser_and_device":"%{browser} ב%{device}","secure_account":"אבטח את החשבון שלי","latest_post":"פרסמת לאחרונה...","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eפעיל כעת\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"פוסט אחרון","last_seen":"נראה","created":"הצטרפו","log_out":"יציאה","location":"מיקום","website":"אתר","email_settings":"דואר אלקטרוני","hide_profile_and_presence":"הסתר את מאפייני הפרופיל והנוכחות שלי","enable_physical_keyboard":"הפעלת תמיכה במקלדת פיזית ב־iPad","text_size":{"title":"גודל טקסט","smallest":"הקטן ביותר","smaller":"קטן יותר","normal":"רגיל","larger":"גדול יותר","largest":"גדול ביותר"},"title_count_mode":{"title":"כותרת החלון כשהוא ברקע מייצגת את הספירה של:","notifications":"התראות חדשות","contextual":"תוכן חדש בדף"},"like_notification_frequency":{"title":"התראה כשנאהב","always":"תמיד","first_time_and_daily":"בפעם הראשונה שמישהו אוהב פוסט ומידי יום","first_time":"בפעם הראשונה שמישהו אוהב פוסט","never":"אף פעם"},"email_previous_replies":{"title":"לכלול תגובות קודמות בתחתית הודעות הדוא״ל","unless_emailed":"אלא אם נשלח לפני כן","always":"תמיד","never":"אף פעם"},"email_digests":{"title":"כשלא ביקרתי כאן תקופה, נא לשלוח לי סיכום בדוא״ל של נושאים ותגובות נפוצים","every_30_minutes":"מידי 30 דקות","every_hour":"שעתי","daily":"יומית","weekly":"שבועית","every_month":"כל חודש","every_six_months":"כל שישה חודשים"},"email_level":{"title":"נא לשלוח לי דוא״ל כשמצטטים אותי, מגיבים לפוסט שלי, מזכירים את @שם-המשתמש שלי, או מזמינים אותי לנושא","always":"תמיד","only_when_away":"רק בזמן העדרות","never":"אף פעם"},"email_messages_level":"נא לשלוח לי דוא״ל כשכשנשלחות אלי הודעות","include_tl0_in_digests":"לכלול תכנים ממשתמשים חדשים בהודעות סיכום בדוא״ל","email_in_reply_to":"לכלול ציטוטים מתגובות לפוסטים בתוכן הדוא״ל","other_settings":"אחר","categories_settings":"קטגוריות","new_topic_duration":{"label":"נושא יחשב כנושא חדש כאשר","not_viewed":"עוד לא ראיתי אותם","last_here":"נוצרו מאז הביקור האחרון שלי כאן","after_1_day":"נוצר ביום האחרון","after_2_days":"נוצר במהלך היומיים האחרונים","after_1_week":"נוצר במהלך השבוע האחרון","after_2_weeks":"נוצר בשבועיים האחרונים"},"auto_track_topics":"מעקב אוטומטי אחר נושאים אליהם נכנסתי","auto_track_options":{"never":"אף פעם","immediately":"מיידי","after_30_seconds":"אחרי 30 שניות","after_1_minute":"אחרי דקה","after_2_minutes":"אחרי שתי דקות","after_3_minutes":"אחרי 3 דקות","after_4_minutes":"אחרי 4 דקות","after_5_minutes":"אחרי 5 דקות","after_10_minutes":"אחרי 10 דקות"},"notification_level_when_replying":"כאשר אני מפרסם נושא, קבע נושא זה ל","invited":{"title":"הזמנות","pending_tab":"ממתין","pending_tab_with_count":"ממתינות (%{count})","expired_tab":"לא בתוקף","expired_tab_with_count":"לא בתוקף (%{count})","redeemed_tab":"נוצלו","redeemed_tab_with_count":"נוצלו (%{count})","invited_via":"הזמנה","invited_via_link":"קישור %{key}‏ (%{count} / %{max} נוצלו)","groups":"קבוצות","topic":"נושא","sent":"נוצרו/נשלחו לאחרונה","expires_at":"תפוג","edit":"עריכה","remove":"הסרה","copy_link":"קבלת קישור","reinvite":"לשלוח דוא״ל מחדש","reinvited":"ההזמנה נשלחה שוב","removed":"הוסרה","search":"הקלידו כדי לחפש הזמנות...","user":"משתמשים שהוזמנו","none":"אין הזמנות להצגה","truncated":{"one":"מראה את ההזמנה הראשונה.","two":"מראה את %{count} ההזמנות הראשונות.","many":"מראה את %{count} ההזמנות הראשונות.","other":"מראה את %{count} ההזמנות הראשונות."},"redeemed":"הזמנות נוצלו","redeemed_at":"נוצלו","pending":"הזמנות ממתינות","topics_entered":"נושאים שנצפו","posts_read_count":"פוסטים נקראו","expired":"פג תוקף ההזמנה.","remove_all":"הסרת הזמנות שתוקפן פג","removed_all":"כל ההזמנות שתוקפן פג הוסרו!","remove_all_confirm":"להסיר את כל ההזמנות שתוקפן פג?","reinvite_all":"לשלוח את כל ההזמנות מחדש","reinvite_all_confirm":"לשלוח מחדש את כל ההזמנות?","reinvited_all":"כל ההזמנות נשלחו!","time_read":"זמן קריאה","days_visited":"מספר ימי ביקור","account_age_days":"גיל החשבון בימים","create":"הזמנה","generate_link":"יצירת קישור הזמנה","link_generated":"הנה קישור ההזמנה שלך!","valid_for":"קישור ההזמנה תקף רק לכתובת דוא״ל זו: %{email}","single_user":"הזמנה בדוא״ל","multiple_user":"הזמנה באמצעות קישור","invite_link":{"title":"קישור הזמנה","success":"קישור הזמנה יוצר בהצלחה!","error":"אירעה שגיאה ביצירת קישור הזמנה.","max_redemptions_allowed_label":"לכמה אנשים מותר להירשם באמצעות הקישור הזה?","expires_at":"מתי תוקף קישור ההזמנה יפוג?"},"invite":{"new_title":"יצירת הזמנה","edit_title":"עריכת הזמנה","instructions":"ניתן לשתף את הקישור הזה באופן מיידי כדי להעניק גישה לאתר","copy_link":"העתקת קישור","expires_in_time":"תפוג בעוד %{time}","expired_at_time":"פגה ב־%{time}","show_advanced":"הצגת אפשרויות מתקדמות","hide_advanced":"הסתרת אפשרויות מתקדמות","restrict_email":"להגביל לכתובת דוא״ל אחת","max_redemptions_allowed":"כמות שימושים מרבית","add_to_groups":"הוספה לקבוצות","invite_to_topic":"נחיתה בנושא הזה","expires_at":"תפוג לאחר","custom_message":"הודעה אישית כרשות","send_invite_email":"לשמור ולשלח דוא״ל","save_invite":"שמירת הזמנה","invite_saved":"ההזמנה נשמרה.","invite_copied":"קישור ההזמנה הועתק."},"bulk_invite":{"none":"אין הזמנות להצגה בעמוד הזה.","text":"הזמנה כמותית","progress":"מתבצעת העלאה %{progress}%…","success":"הקובץ נשלח בהצלחה. תישלח אליך הודעה כשהתהליך יושלם.","error":"הקובץ אמור להיות בתצורת CSV, עמך הסליחה."}},"password":{"title":"סיסמה","too_short":"הסיסמה שלך קצרה מידי.","common":"הסיסמה הזו נפוצה מידי.","same_as_username":"הסיסמה שלך זהה לשם המשתמש/ת שלך.","same_as_email":"הססמה שלך זהה לכתובת הדוא״ל שלך.","ok":"הסיסמה שלך נראית טוב.","instructions":"לפחות %{count} תווים","required":"נא למלא ססמה"},"summary":{"title":"סיכום","stats":"סטטיסטיקות","time_read":"זמן קריאה","recent_time_read":"זמן קריאה אחרון","topic_count":{"one":"נושא נוצר","two":"נושאים נוצרו","many":"נושאים נוצרו","other":"נושאים נוצרו"},"post_count":{"one":"פוסט נוצר","two":"פוסטים נוצרו","many":"פוסטים נוצרו","other":"פוסטים נוצרו"},"likes_given":{"one":"ניתן","two":"ניתנו","many":"ניתנו","other":"ניתנו"},"likes_received":{"one":"התקבל","two":"התקבלו","many":"התקבלו","other":"התקבלו"},"days_visited":{"one":"יום שבוקר","two":"ימים שבוקרו","many":"ימים שבוקרו","other":"ימים שבוקרו"},"topics_entered":{"one":"נושא נצפה","two":"נושאים נצפו","many":"נושאים נצפו","other":"נושאים נצפו"},"posts_read":{"one":"פוסט נקרא","two":"פוסטים נקראו","many":"פוסטים נקראו","other":"פוסטים נקראו"},"bookmark_count":{"one":"סימנייה","two":"סימניות","many":"סימניות","other":"סימניות"},"top_replies":"תגובות מובילות","no_replies":"עדיין אין תגובות.","more_replies":"תגובות נוספות","top_topics":"נושאים מובילים","no_topics":"אין נושאים עדיין.","more_topics":"נושאים נוספים","top_badges":"עיטורים מובילים","no_badges":"עדיין בלי עיטורים.","more_badges":"עיטורים נוספים","top_links":"קישורים מובילים","no_links":"עדיין ללא קישורים.","most_liked_by":"נאהב ביותר על-ידי","most_liked_users":"נאהב ביותר","most_replied_to_users":"הכי הרבה נענו","no_likes":"עדיין אין לייקים.","top_categories":"קטגוריות מובילות","topics":"נושאים","replies":"תגובות"},"ip_address":{"title":"כתובת IP אחרונה"},"registration_ip_address":{"title":"כתובת IP בהרשמה"},"avatar":{"title":"תמונת פרופיל","header_title":"פרופיל, הודעות, סימניות והעדפות","name_and_description":"%{name} - %{description}","edit":"עריכת תמונת פרופיל"},"title":{"title":"כותרת","none":"(ללא)","instructions":"מופיע לאחר שם המשתמש שלך"},"flair":{"none":"(ללא)","instructions":"סמל המוצג לצד תמונת הפרופיל שלך"},"primary_group":{"title":"קבוצה ראשית","none":"(ללא)"},"filters":{"all":"הכל"},"stream":{"posted_by":"פורסם על ידי","sent_by":"נשלח על ידי","private_message":"הודעה","the_topic":"הנושא"}},"loading":"טוען...","errors":{"prev_page":"בזמן הניסיון לטעון","reasons":{"network":"שגיאת רשת","server":"שגיאת שרת","forbidden":"גישה נדחתה","unknown":"תקלה","not_found":"העמוד לא נמצא"},"desc":{"network":"נא לבדוק את החיבור שלך.","network_fixed":"נראה שזה חזר לעבוד.","server":"קוד שגיאה: %{status}","forbidden":"אין לך הרשאה לצפות בזה.","not_found":"אופס, ניסינו לטעון עמוד שאיננו קיים.","unknown":"משהו השתבש."},"buttons":{"back":"חזרה","again":"ניסיון נוסף","fixed":"טעינת עמוד"}},"modal":{"close":"סגירה","dismiss_error":"התעלמות מהשגיאה"},"close":"סגור","assets_changed_confirm":"האתר זכה לשדרוג תכנה. למשוך את הגרסה העדכנית?","logout":"יצאת מהמערכת.","refresh":"רענן","home":"בית","read_only_mode":{"enabled":"אתר זה נמצא במצב קריאה בלבד. אנא המשיכו לשוטט, אך תגובות, לייקים, ופעולות נוספות כרגע אינם מאופשרים.","login_disabled":"הכניסה מושבתת בזמן שהאתר במצב קריאה בלבד.","logout_disabled":"היציאה מושבתת בזמן שהאתר במצב של קריאה בלבד."},"logs_error_rate_notice":{},"learn_more":"למד עוד...","first_post":"פוסט ראשון","mute":"השתק","unmute":"ביטול השתקה","last_post":"פורסמו","local_time":"זמן מקומי","time_read":"נקרא","time_read_recently":"%{time_read} לאחרונה","time_read_tooltip":"%{time_read} זמן צפייה כולל","time_read_recently_tooltip":"%{time_read} זמן צפייה כולל (%{recent_time_read} ב60 הימים האחרונים)","last_reply_lowercase":"תגובה אחרונה","replies_lowercase":{"one":"תגובה","two":"תגובות","many":"תגובות","other":"תגובות"},"signup_cta":{"sign_up":"הרשמה","hide_session":"הזכר לי מחר","hide_forever":"לא תודה","hidden_for_session":"סבבה, השאלה תופיע מחר. תמיד ניתן להשתמש ב‚כניסה’ גם כדי ליצור חשבון.","intro":"שלום! נראה שאתם נהנים מהדיון, אבל לא נרשמתם לחשבון עדיין.","value_prop":"בעת יצירת החשבון, אנו זוכרים במדויק מה קראת, לכן תמיד יתאפשר לך לחזור להיכן שהפסקת. נוסף על כך, יישלחו אליך התראות, כאן ודרך דוא״ל כשמתקבלת תגובה על משהו שכתבת. יש לך גם אפשרות לסמן לייק פוסטים שאהבת כדי להוסיף ולהפיץ אהבה. :heartpulse:"},"summary":{"enabled_description":"אתם צופים בסיכום נושא זה: הפוסטים המעניינים ביותר כפי שסומנו על ידי הקהילה.","description":{"one":"יש תגובה \u003cb\u003e%{count}\u003c/b\u003e.","two":"יש \u003cb\u003e%{count}\u003c/b\u003e תגובות.","many":"יש \u003cb\u003e%{count}\u003c/b\u003e תגובות.","other":"יש \u003cb\u003e%{count}\u003c/b\u003e תגובות."},"enable":"סכם נושא זה","disable":"הצג את כל הפוסטים","short_label":"סיכום","short_title":"הצגת סיכום לנושא זה: הפוסטים המעניינים ביותר כפי שסומנו על ידי הקהילה"},"deleted_filter":{"enabled_description":"נושא זה מכיל פוסטים שנמחקו ולכן אינם מוצגים.","disabled_description":"פוסטים שנמחקו בנושא זה מוצגים כעת.","enable":"הסתרת פוסטים שנמחקו","disable":"הצגת פוסטים שנמחקו"},"private_message_info":{"title":"הודעה","invite":"להזמין אחרים…","edit":"הוספה או הסרה…","remove":"הסרה…","add":"הוספה…","leave_message":"האם אתה באמת רוצה לעזוב את ההודעה הזו?","remove_allowed_user":"להסיר את %{name} מהודעה זו?","remove_allowed_group":"להסיר את %{name} מהודעה זו?"},"email":"דוא״ל","username":"שם משתמש","last_seen":"נצפה","created":"נוצר","created_lowercase":"נוצר/ו","trust_level":"דרגת אמון","search_hint":"שם משתמש, דוא״ל או כתובת IP","create_account":{"header_title":"ברוך בואך!","subheader_title":"הבה ניצור לך חשבון","disclaimer":"עצם הרשמתך מביעה את הסכמתך ל\u003ca href='%{privacy_link}' target='blank'\u003eמדיניות הפרטיות\u003c/a\u003e ול\u003ca href='%{tos_link}' target='blank'\u003eתנאי השירות\u003c/a\u003e.","title":"יצירת חשבון משלך","failed":"משהו לא בסדר, אולי כבר קיימת כתובת דואר אלקטרוני כזו. נסו את קישור שכחתי סיסמה.","associate":"כבר יש לך חשבון? ניתן \u003ca href='%{associate_link}'\u003eלהיכנס\u003c/a\u003e כדי לקשר את חשבון ה־%{provider} שלך."},"forgot_password":{"title":"אתחול סיסמה","action":"שכחתי את ססמתי","invite":"נא להקליד את שם המשתמש וכתובת הדוא״ל שלך ואנו נשלח לך הודעה בדוא״ל לאיפוס ססמה.","reset":"איפוס ססמה","complete_username":"אם קיים חשבון שמתאים לשם המשתמש \u003cb\u003e%{username}\u003c/b\u003e, תוך זמן קצר אמורה להגיע אליך הודעה בדוא״ל עם הנחיות לאיפוס הססמה שלך.","complete_email":"אם החשבון מתאים לכתובת \u003cb\u003e%{email}\u003c/b\u003e, תוך זמן קצר אמורה להגיע אליך הודעה בדוא״ל עם הנחיות לאיפוס הססמה שלך.","complete_username_found":"מצאנו חשבון שתואם לשם המשתמש \u003cb\u003e%{username}\u003c/b\u003e. תוך זמן קצר אמורה להגיע לדוא״ל שלך הודעה עם הנחיות כיצד לאפס את הססמה שלך.","complete_email_found":"מצאנו חשבון שתואם לכתובת \u003cb\u003e%{email}\u003c/b\u003e. תוך זמן קצר אמורה להגיע לדוא״ל שלך הודעה עם הנחיות כיצד לאפס את הססמה שלך.","complete_username_not_found":"שום חשבון אינו תואם לשם המשתמש \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"שום חשבון אינו תואם ל \u003cb\u003e%{email}\u003c/b\u003e","help":"ההודעה אינה מגיעה אליך לתיבת הדוא״ל? נא לבדוק את תיקיית הזבל/ספאם קודם.\u003cp\u003eלא ברור לך באיזו כתובת דוא״ל השתמשת? נא להקליד כתובת דוא״ל ואנו ניידע אותך אם היא קיימת כאן.\u003c/p\u003e\u003cp\u003eאם כבר אין לך גישה לכתובת הדוא״ל של החשבון שלך, נא ליצור קשר עם \u003ca href='%{basePath}/about'\u003eהסגל המועיל שלנו.\u003c/a\u003e\u003c/p\u003e","button_ok":"או קיי","button_help":"עזרה"},"email_login":{"link_label":"נא לשלוח לי קישור לכניסה בדוא״ל","button_label":"עם דוא״ל","login_link":"לדלג על הססמה, פשוט לשלוח לי קישור כניסה בדוא״ל","emoji":"אמוג׳י של מנעול","complete_username":"אם קיים חשבון שמתאים לשם המשתמש \u003cb\u003e%{username}\u003c/b\u003e, בקרוב אמורה להגיע אליך הודעה בדוא״ל עם קישור כניסה למערכת.","complete_email":"אם קיים חשבון שמתאים ל־\u003cb\u003e%{email}\u003c/b\u003e, בקרוב אמורה להגיע אליך הודעה בדוא״ל עם קישור כניסה למערכת.","complete_username_found":"נמצא חשבון תואם לשם המשתמש \u003cb\u003e%{username}\u003c/b\u003e, בקרוב תגיע אליך הודעה בדוא״ל עם קישור לכניסה.","complete_email_found":"נמצא חשבון תואם לשם \u003cb\u003e%{username}\u003c/b\u003e, בקרוב תגיע אליך הודעה בדוא״ל עם קישור לכניסה.","complete_username_not_found":"שום חשבון אינו תואם לשם המשתמש \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"שום חשבון אינו תואם ל \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"להמשיך אל %{site_name}","logging_in_as":"מתבצעת כניסה בתור %{email}","confirm_button":"סיום הכניסה"},"login":{"header_title":"ברוך שובך","subheader_title":"כניסה לחשבון שלך","title":"כניסה","username":"משתמש","password":"סיסמה","second_factor_title":"אימות דו־שלבי","second_factor_description":"נא למלא את קוד האישור מהיישומון שלך:","second_factor_backup":"כניסה עם קוד גיבוי","second_factor_backup_title":"גיבוי אימות דו־שלבי","second_factor_backup_description":"נא להקליד אחד מהקודים לגיבוי שלך:","second_factor":"כניסה עם יישומון אימות","security_key_description":"כשמפתח האבטחה הפיזי שלך מוכן יש ללחוץ על כפתור האימות עם מפתח האבטחה שלהלן.","security_key_alternative":"לנסות דרך אחרת","security_key_authenticate":"אימות עם מפתח אבטחה","security_key_not_allowed_error":"זמן תהליך אימות מפתח האבטחה פג או שבוטל.","security_key_no_matching_credential_error":"לא ניתן למצוא פרטי גישה במפתח האבטחה שסופק.","security_key_support_missing_error":"המכשיר או הדפדפן הנוכחי שלך לא תומך בשימוש במפתחות אבטחה, נא להשתמש בשיטה אחרת.","email_placeholder":"דוא״ל / שם משתמש","caps_lock_warning":"מקש Caps Lock לחוץ","error":"שגיאה לא ידועה","cookies_error":"כנראה שהעוגיות בדפדפן שלך מושבתות. אין אפשרות להיכנס מבלי להפעיל אותן.","rate_limit":"נא להמתין בטרם ביצוע ניסיון כניסה חוזר.","blank_username":"נא למלא כתובת דוא״ל או שם משתמש.","blank_username_or_password":"נא למלא את כתובת הדוא״ל או את שם המשתמש שלך וססמה.","reset_password":"אפס סיסמה","logging_in":"מתחבר....","or":"או","authenticating":"מאשר...","awaiting_activation":"החשבון שלך ממתין להפעלה, נא להשתמש בקישור „שכחתי ססמה” כדי לשלוח הודעת הפעלה נוספת.","awaiting_approval":"החשבון שלך טרם אושר על ידי חבר סגל. תישלח אליך הודעה בדוא״ל כשהוא יאושר.","requires_invite":"סליחה, גישה לפורום הזה היא בהזמנה בלבד.","not_activated":"אינך יכול להתחבר עדיין. שלחנו לך דואר אלקטרוני להפעלת החשבון לכתובת: \u003cb\u003e%{sentTo}\u003c/b\u003e. יש לעקוב אחר ההוראות בדואר כדי להפעיל את החשבון.","not_allowed_from_ip_address":"הכניסה מכתובת IP זו אסורה.","admin_not_allowed_from_ip_address":"הכניסה לניהול מכתובת IP זו אסורה.","resend_activation_email":"יש ללחוץ כאן לשליחת דואר אלקטרוני חוזר להפעלת החשבון.","omniauth_disallow_totp":"בחשבון שלך מופעל אימות דו־שלבי. נא להיכנס עם הססמה שלך.","resend_title":"שליחה מחדש של הודעת הפעלה בדוא״ל","change_email":"שינוי כתובת דוא״ל","provide_new_email":"נא לספק כתובת חדשה ואנו נשלח מחדש בדוא״ל את הודעת האישור שלך.","submit_new_email":"עדכון כתובת דוא״ל","sent_activation_email_again":"שלחנו לך הודעת דואר אלקטרוני נוספת להפעלת החשבון לכתובת \u003cb\u003e%{currentEmail}\u003c/b\u003e. זה יכול לקחת כמה דקות עד שיגיע, לא לשכוח לבדוק את תיבת דואר הזבל.","sent_activation_email_again_generic":"שלחנו הודעת הפעלה נוספת בדוא״ל. ייתכן שיהיה עליך להמתין מספר דקות להגעתה. מוטב לבדוק גם את תיקיית הספאם שלך.","to_continue":"נא להיכנס","preferences":"כדי לשנות את העדפות המשתמש ראשית יש להיכנס למערכת.","not_approved":"החשבון שלך עדיין לא אושר. תישלח אליך הודעה בדוא״ל כשיתאפשר לך להיכנס למערכת.","google_oauth2":{"name":"Google","title":"עם Google","sr_title":"כניסה עם Google"},"twitter":{"name":"Twitter","title":"עם Twitter","sr_title":"כניסה עם טוויטר"},"instagram":{"name":"Instagram","title":"עם אינסטגרם","sr_title":"כניסה עם אינסטגרם"},"facebook":{"name":"Facebook","title":"עם Facebook","sr_title":"כניסה עם פייסבוק"},"github":{"name":"GitHub","title":"עם GitHub","sr_title":"כניסה עם GitHub"},"discord":{"name":"Discord","title":"עם Discord","sr_title":"כניסה עם Discord"},"second_factor_toggle":{"totp":"להשתמש ביישומון אימות במקום","backup_code":"להשתמש בקוד גיבוי במקום"}},"invites":{"accept_title":"הזמנה","emoji":"אמוג׳י של מעטפה","welcome_to":"ברוך בואך אל %{site_name}!","invited_by":"הוזמנתם על ידי:","social_login_available":"מעתה יתאפשר לך להיכנס עם כל כניסה מרשת חברתית בעזרת כתובת הדוא״ל הזאת.","your_email":"כתובת הדוא״ל של החשבון שלך היא \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"קבלת הזמנה","success":"החשבון נוצר ונכנסת אליו.","name_label":"שם","password_label":"ססמה","optional_description":"(רשות)"},"password_reset":{"continue":"המשיכו ל-%{site_name}"},"emoji_set":{"apple_international":"אפל/בינלאומי","google":"גוגל","twitter":"טוויטר","win10":"חלונות 10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"קטגוריות בלבד","categories_with_featured_topics":"קטגוריות עם נושאים מומלצים","categories_and_latest_topics":"קטגוריות ונושאים אחרונים","categories_and_top_topics":"קטגוריות ונושאים מובילים","categories_boxes":"תיבות עם תתי קטגוריות","categories_boxes_with_topics":"תיבות עם נושאים מומלצים"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"בטעינה…"},"category_row":{"topic_count":{"one":"נושא %{count} בקטגוריה הזו","two":"%{count} נושאים בקטגוריה הזו","many":"%{count} נושאים בקטגוריה הזו","other":"%{count} נושאים בקטגוריה הזו"},"plus_subcategories_title":{"one":"%{name} ותת־קטגוריה נוספת","two":"%{name} ו־%{count} תת־קטגוריות","many":"%{name} ו־%{count} תת־קטגוריות","other":"%{name} ו־%{count} תת־קטגוריות"},"plus_subcategories":{"one":"+ תת־קטגוריה %{count}","two":"+ %{count} תת־קטגוריות","many":"+ %{count} תת־קטגוריות","other":"+ %{count} תת־קטגוריות"}},"select_kit":{"delete_item":"למחוק את %{name}","filter_by":"סינון לפי: %{name}","select_to_filter":"נא לבחור ערך לסינון","default_header_text":"בחירה…","no_content":"לא נמצאו התאמות","results_count":{"one":"תוצאה %{count}","two":"%{count} תוצאות","many":"%{count} תוצאות","other":"%{count} תוצאות"},"filter_placeholder":"חיפוש...","filter_placeholder_with_any":"חיפוש או יצירה…","create":"יצירה: ‚%{content}’","max_content_reached":{"one":"ניתן לבחור פריט אחד.","two":"ניתן לבחור %{count} פריטים.","many":"ניתן לבחור %{count} פריטים.","other":"ניתן לבחור %{count} פריטים."},"min_content_not_reached":{"one":"נא לבחור בפריט אחד לפחות.","two":"נא לבחור ב־%{count} פריטים לפחות.","many":"נא לבחור ב־%{count} פריטים לפחות.","other":"נא לבחור ב־%{count} פריטים לפחות."},"invalid_selection_length":{"one":"אורך הבחירה חייב להיות תו %{count} לפחות.","two":"אורך הבחירה חייב להיות %{count} תווים לפחות.","many":"אורך הבחירה חייב להיות %{count} תווים לפחות.","other":"אורך הבחירה חייב להיות %{count} תווים לפחות."},"components":{"tag_drop":{"filter_for_more":"לסנן לעוד…"},"categories_admin_dropdown":{"title":"ניהול קטגוריות"}}},"date_time_picker":{"from":"מאת","to":"אל"},"emoji_picker":{"filter_placeholder":"חיפוש אחר אמוג׳י","smileys_\u0026_emotion":"חייכנים ורגש","people_\u0026_body":"אנשים וגוף","animals_\u0026_nature":"חיות וטבע","food_\u0026_drink":"מזון ומשקאות","travel_\u0026_places":"טיול ומקומות","activities":"פעילויות","objects":"עצמים","symbols":"סמלים","flags":"דגלים","recent":"בשימוש לאחרונה","default_tone":"ללא גוון עור","light_tone":"גוון עור בהיר","medium_light_tone":"גוון עור בהיר בינוני","medium_tone":"גוון עור בינוני","medium_dark_tone":"גוון עור כהה בינוני","dark_tone":"גוון עור כהה","default":"אמוג׳ים מותאמים"},"shared_drafts":{"title":"טיוטות משותפות","notice":"הנושא הזה זמין לצפייה לאלו שיכולים לפרסם טיוטות שיתופיות.","destination_category":"קטגוריית יעד","publish":"פרסום טיוטה משותפת","confirm_publish":"לפרסם את הטיוטה הזו?","publishing":"נושא מתפרסם…"},"composer":{"emoji":"אמוג׳י :)","more_emoji":"עוד...","options":"אפשרויות","whisper":"לחישה","unlist":"לא-רשום","add_warning":"זוהי אזהרה רשמית.","toggle_whisper":"הפעלת לחישה","toggle_unlisted":"סימון/אי-סימון כלא-ברשימות","posting_not_on_topic":"לאיזה נושא רצית להגיב?","saved_local_draft_tip":"נשמר מקומית","similar_topics":"הנושא שלך דומה ל...","drafts_offline":"טיוטות מנותקות","edit_conflict":"עריכת סתירה","group_mentioned_limit":{"one":"\u003cb\u003eזהירות!\u003c/b\u003e ציינת את \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, אך בקבוצה זו יש יותר חברים מההגבלה שהוגדרה על ידי הנהלת המערכת של עד משתמש %{count}. אף אחד לא יקבל הודעה.","two":"\u003cb\u003eזהירות!\u003c/b\u003e ציינת את \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, אך בקבוצה זו יש יותר חברים מההגבלה שהוגדרה על ידי הנהלת המערכת של עד %{count} משתמשים. אף אחד לא יקבל הודעה.","many":"\u003cb\u003eזהירות!\u003c/b\u003e ציינת את \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, אך בקבוצה זו יש יותר חברים מההגבלה שהוגדרה על ידי הנהלת המערכת של עד %{count} משתמשים. אף אחד לא יקבל הודעה.","other":"\u003cb\u003eזהירות!\u003c/b\u003e ציינת את \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, אך בקבוצה זו יש יותר חברים מההגבלה שהוגדרה על ידי הנהלת המערכת של עד %{count} משתמשים. אף אחד לא יקבל הודעה."},"group_mentioned":{"one":"על ידי אזכור %{group}, אתם עומדים ליידע \u003ca href='%{group_link}'\u003eאדם אחד\u003c/a\u003e – אתם בטוחים?","two":"על ידי אזכור %{group}, אתם עומדים ליידע \u003ca href='%{group_link}'\u003e%{count} אנשים\u003c/a\u003e – אתם בטוחים?","many":"על ידי אזכור %{group}, אתם עומדים ליידע \u003ca href='%{group_link}'\u003e%{count} אנשים\u003c/a\u003e – אתם בטוחים?","other":"על ידי אזכור %{group}, אתם עומדים ליידע \u003ca href='%{group_link}'\u003e%{count} אנשים\u003c/a\u003e – אתם בטוחים?"},"cannot_see_mention":{"category":"הזכרת את %{username} אבל לא תישלח אליו/ה התרעה עקב העדר גישה לקטגוריה זו. יהיה עליך להוסיף אותו/ה לקבוצה שיש לה גישה לקטגוריה הזו.","private":"הזכרתם את %{username} אבל הוא/היא לא יקבלו התראה כיוון שהם לא יכולים לראות את ההודעה הפרטית הזו. תצטרכו להזמין אותם להודעה פרטית זו."},"duplicate_link":"נראה שהקישור שלך אל \u003cb\u003e%{domain}\u003c/b\u003e כבר פורסם בנושא הזה על ידי \u003cb\u003e‎@%{username}‎\u003c/b\u003e כ\u003ca href='%{post_url}'\u003eתגובה ב%{ago}\u003c/a\u003e - לפרסם אותו שוב?","reference_topic_title":"תגובה: %{title}","error":{"title_missing":"יש להזין כותרת.","title_too_short":{"one":"על הכותרת להיות באורך תו %{count} לפחות.","two":"על הכותרת להיות באורך %{count} תווים לפחות.","many":"על הכותרת להיות באורך %{count} תווים לפחות.","other":"על הכותרת להיות באורך %{count} תווים לפחות."},"title_too_long":{"one":"על הכותרת להיות עד תו %{count}.","two":"על הכותרת להיות עד %{count} תווים.","many":"על הכותרת להיות עד %{count} תווים.","other":"על הכותרת להיות עד %{count} תווים."},"post_missing":"הפוסט לא יכול להיות ריק","post_length":{"one":"על הפוסט להיות באורך תו %{count} לפחות","two":"על הפוסט להיות באורך %{count} תווים לפחות","many":"על הפוסט להיות באורך %{count} תווים לפחות","other":"על הפוסט להיות באורך %{count} תווים לפחות"},"try_like":"האם ניסית את כפתור ה-%{heart}?","category_missing":"עליך לבחור קטגוריה.","tags_missing":{"one":"עליך לבחור בתגית %{count} לפחות","two":"עליך לבחור ב־%{count} תגיות לפחות","many":"עליך לבחור ב־%{count} תגיות לפחות","other":"עליך לבחור ב־%{count} תגיות לפחות"},"topic_template_not_modified":"נא להוסיף פרטים ותיאורים מדויקים לנושא שלך על ידי עריכת תבנית הנושא."},"save_edit":"שמירת עריכה","overwrite_edit":"שכתוב על עריכה","reply_original":"תגובה לנושא המקורי","reply_here":"תגובה כאן","reply":"תגובה","cancel":"ביטול","create_topic":"יצירת נושא","create_pm":"הודעה","create_whisper":"לחישה","create_shared_draft":"צור טיוטה משותפת","edit_shared_draft":"עריכת טיוטה משותפת","title":"או ללחוץ %{modifier}Enter","users_placeholder":"הוספת משתמש","title_placeholder":" במשפט אחד, במה עוסק הדיון הזה?","title_or_link_placeholder":"הקלידו כותרת, או הדביקו קישור כאן","edit_reason_placeholder":"מדוע ערכת?","topic_featured_link_placeholder":"הזינו קישור שיוצג עם הכותרת.","remove_featured_link":"הסר קישור מנושא","reply_placeholder":"הקלידו כאן. השתמשו ב Markdown, BBCode או HTML כדי לערוך. גררו או הדביקו תמונות.","reply_placeholder_no_images":"הקלידו כאן. השתמשו בMarkdown, BBCode או HTML כדי לערוך.","reply_placeholder_choose_category":"נא לבחור בקטגוריה בטרם תחילת ההקלדה כאן.","view_new_post":"הצגת הפוסט החדש שלך.","saving":"שומר","saved":"נשמר!","saved_draft":"טיוטה לפוסט בעריכה. נא לגעת כדי להמשיך.","uploading":"מעלה...","show_preview":"להציג תצוגה מקדימה","hide_preview":"להסתיר תצוגה מקדימה","quote_post_title":"ציטוט פוסט בשלמותו","bold_label":"B","bold_title":"מודגש","bold_text":"טקסט מודגש","italic_label":"I","italic_title":"נטוי","italic_text":"טקסט נטוי","link_title":"קישור","link_description":"הזן תיאור קישור כאן","link_dialog_title":"הזן קישור","link_optional_text":"כותרת כרשות","link_url_placeholder":"יש להדביק כתובת כדי לחפש נושאים","blockquote_title":"מקטע ציטוט","blockquote_text":"בלוק ציטוט","code_title":"טקסט מעוצב","code_text":"הזחה של הטקסט ב-4 רווחים","paste_code_text":"הקלידו או הדביקו קוד כאן","upload_title":"העלאה","upload_description":"הזן תיאור העלאה כאן","olist_title":"רשימה ממוספרת","ulist_title":"רשימת נקודות","list_item":"פריט ברשימה","toggle_direction":"הפיכת כיוון","help":"עזרה על כתיבה ב-Markdown","collapse":"מזער את לוח העריכה","open":"פתח את לוח העריכה","abandon":"סגור את העורך והשלך את הטיוטה","enter_fullscreen":"היכנס לעריכה במסך מלא","exit_fullscreen":"צא מעריכה במסך מלא","show_toolbar":"הצגת סרגל כתיבת הודעות","hide_toolbar":"הסתרת סרגל כתיבת הודעות","modal_ok":"אישור","modal_cancel":"ביטול","cant_send_pm":"אין לך אפשרות לשלוח הודעה אל %{username}, עמך הסליחה.","yourself_confirm":{"title":"שחכתם להוסיף נמענים?","body":"כרגע ההודעה הזו נשלחת רק אליכם!"},"slow_mode":{"error":"נושא זה נמצא במצב אטי. כבר פרסמת לאחרונה; אפשר לפרסם שוב בעוד %{timeLeft}."},"admin_options_title":"אפשרויות סגל כרשות לנושא זה","composer_actions":{"reply":"השב","draft":"טיוטה","edit":"עריכה","reply_to_post":{"label":"תגובה לפוסט מאת %{postUsername}","desc":"תגובה לפוסט ספיציפי"},"reply_as_new_topic":{"label":"תגובה כנושא מקושר","desc":"צור נושא חדש מקושר לנושא זה","confirm":"יש לך טיוטה של נושא חדש שתשוכתב בעת יציאת נושא מקושר."},"reply_as_new_group_message":{"label":"להגיב בהודעה קבוצתית חדשה","desc":"יצירת הודעה חדשה שתיפתח עם אותם נמענים"},"reply_as_private_message":{"label":"הודעה חדשה","desc":"צור הודעה פרטית חדשה"},"reply_to_topic":{"label":"הגב לנושא","desc":"הגב לנושא, לא פוסט ספציפי"},"toggle_whisper":{"label":"החלפת מצב לחישה","desc":"לחישות גלויות לחברי סגל בלבד"},"create_topic":{"label":"נושא חדש"},"shared_draft":{"label":"טיוטה משותפת","desc":"יצירת טיוטה לנושא שרק משתמשים מורשים יוכלו לראות"},"toggle_topic_bump":{"label":"החלפת מצב הקפצת נושא","desc":"הגב מבלי לשנות את תאריך התגובה האחרונה"}},"reload":"רענון","ignore":"התעלמות","details_title":"תקציר","details_text":"טקסט זה יוסתר"},"notifications":{"tooltip":{"regular":{"one":"התראה אחת שלא נצפתה","two":"%{count} התראות שלא נצפו","many":"%{count} התראות שלא נצפו","other":"%{count} התראות שלא נצפו"},"message":{"one":"הודעה אחת שלא נקראה","two":"%{count} הודעות שלא נקראו","many":"%{count} הודעות שלא נקראו","other":"%{count} הודעות שלא קראו"},"high_priority":{"one":"הודעה %{count} בדחיפות גבוהה שלא נקראה","two":"%{count} הודעות בדחיפות גבוהה שלא נקראו","many":"%{count} הודעות בדחיפות גבוהה שלא נקראו","other":"%{count} הודעות בדחיפות גבוהה שלא נקראו"}},"title":"התראות אזכור @שם, תגובות לפוסטים ולנושאים שלך, הודעות, וכו׳","none":"לא ניתן לטעון כעת התראות.","empty":"לא נמצאו התראות.","post_approved":"הפוסט שלך אושר","reviewable_items":"פריטים שדורשים סקירה","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} ועוד %{count} \u003c/span\u003e %{description}","two":"\u003cspan class='multi-user'\u003e%{username}, %{username2} ועוד %{count} \u003c/span\u003e %{description}","many":"\u003cspan class='multi-user'\u003e%{username}, %{username2} ועוד %{count} \u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} ועוד %{count} \u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"אהבו פוסט %{count} שלך","two":"אהבו %{count} מהפוסטים שלך","many":"אהבו %{count} מהפוסטים שלך","other":"אהבו %{count} מהפוסטים שלך"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e אישר/ה את ההזמנה שלך","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e עבר %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"הרווחת '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eנושא חדש\u003c/span\u003e %{description}","membership_request_accepted":"התקבלת לחברות בקבוצה ‚%{group_name}’","membership_request_consolidated":{"one":"בקשת חברות %{count} לקבוצה ‚%{group_name}’ ממתינה","two":"%{count} בקשות חברות לקבוצה ‚%{group_name}’ ממתינות","many":"%{count} בקשות חברות לקבוצה ‚%{group_name}’ ממתינות","other":"%{count} בקשות חברות לקבוצה ‚%{group_name}’ ממתינות"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - הסתיים","group_message_summary":{"one":"הודעה %{count} בתיבת ה%{group_name} שלך","two":"%{count} הודעות בתיבת ה%{group_name} שלך","many":"%{count} הודעות בתיבת ה%{group_name} שלך","other":"%{count} הודעות בתיבת ה%{group_name} שלך"},"popup":{"mentioned":"%{username} הזכיר/ה אותך ב%{topic}\" - %{site_title}\"","group_mentioned":"הוזכרת על ידי %{username} בנושא „%{topic}” - %{site_title}","quoted":"%{username} ציטט/ה אותך ב\"%{topic}\" - %{site_title}","replied":"%{username} הגיב/ה לך ב\"%{topic}\" - %{site_title}","posted":"%{username} הגיב/ה ב\"%{topic}\" - %{site_title}","private_message":"%{username} שלח לך הודעה פרטית ב\"%{topic}\" - %{site_title}","linked":"הפוסט שלך קושר על ידי %{username} מתוך „%{topic}” - %{site_title}","watching_first_post":"%{username} יצר נושא חדש \"%{topic}\" - %{site_title}","confirm_title":"התראות הופעלו - %{site_title}","confirm_body":"הצלחה! התראות הופעלו","custom":"התראה מ־%{username} באתר %{site_title}"},"titles":{"mentioned":"אוזכר","replied":"תגובה חדשה","quoted":"צוטט","edited":"נערך","liked":"לייק חדש","private_message":"הודעה פרטית חדשה","invited_to_private_message":"הוזמנת להודעה פרטית","invitee_accepted":"ההזמנה התקבלה","posted":"פוסט חדש","moved_post":"פוסט הועבר","linked":"מקושר","bookmark_reminder":"תזכורת סימון","bookmark_reminder_with_name":"תזכורת סימון - %{name}","granted_badge":"הוענק עיטור","invited_to_topic":"הוזמן לנושא","group_mentioned":"קבוצה אוזכרה","group_message_summary":"הודעות קבוצתיות חדשות","watching_first_post":"נושא חדש","topic_reminder":"תזכורת נושא","liked_consolidated":"לייקים חדשים","post_approved":"פוסט אושר","membership_request_consolidated":"בקשות חברות חדשות","reaction":"תגובת אמוג׳י חדשה","votes_released":"ההצבעה שוחררה"}},"upload_selector":{"uploading":"מעלה","processing":"ההעלאה עוברת עיבוד","select_file":"בחירת קובץ","default_image_alt_text":"תמונה"},"search":{"sort_by":"מיון על פי","relevance":"רלוונטיות","latest_post":"הפוסטים האחרונים","latest_topic":"נושא אחרון","most_viewed":"הנצפה ביותר","most_liked":"האהובים ביותר","select_all":"בחירה של הכל","clear_all":"נקוי של הכל","too_short":"ביטוי החיפוש שלך קצר מידי.","open_advanced":"פתיחת חיפוש מתקדם","clear_search":"פינוי החיפוש","sort_or_bulk_actions":"מיון או בחירת תוצאות במרוכז","result_count":{"one":"\u003cspan\u003eתוצאה אחת עבור\u003c/span\u003e\u003cspan class='term'\u003e %{term}\u003c/span\u003e","two":"\u003cspan\u003e%{count}%{plus} תוצאות עבור\u003c/span\u003e\u003cspan class='term'\u003e %{term}\u003c/span\u003e","many":"\u003cspan\u003e%{count}%{plus} תוצאות עבור\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} תוצאות עבור \u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"חיפוש","full_page_title":"חיפוש","no_results":"אין תוצאות.","no_more_results":"לא נמצאו עוד תוצאות.","post_format":"#%{post_number} מאת %{username}","results_page":"חפש תוצאות עבור '%{term}'","more_results":"יש עוד תוצאות. אנא צמצם את קריטריוני החיפוש.","cant_find":"לא מצליחים למצוא את מה שחיפשתם?","start_new_topic":"אולי תפתחו נושא חדש?","or_search_google":"או שתנסו חיפוש בעזרת גוגל במקום.","search_google":"נסה לחפש באמצעות גוגל במקום:","search_google_button":"גוגל","search_button":"חיפוש","search_term_label":"נא למלא מילת מפתח לחיפוש","categories":"קטגוריות","tags":"תגיות","in":"בתוך","in_this_topic":"בנושא הזה","in_this_topic_tooltip":"מעבר לחיפוש בכל הנושאים","in_topics_posts":"בכל הנושאים והפוסטים","enter_hint":"או ללחוץ על Enter","in_posts_by":"בפוסטים מאת %{username}","type":{"default":"נושאים/פוסטים","users":"משתמשים","categories":"קטגוריות","categories_and_tags":"קטגוריה/תגיות"},"context":{"user":"חיפוש פוסטים לפי @%{username}","category":"חפשו את הקטגוריה #%{category}","tag":"חיפוש אחר התגית #%{tag}","topic":"חפשו בנושא זה","private_messages":"חיפוש הודעות"},"tips":{"category_tag":"מסנן לפי קטגוריה או תגית","author":"מסנן לפי יוצר הפוסט","in":"מסנן לפי נתוני על (למשל: in:title,‏ in:personal,‏ in:pinned)","status":"מסנן לפי מצב נושא","full_search":"מפעיל חיפוש מלא בעמוד","full_search_key":"‎%{modifier} + Enter"},"advanced":{"title":"מסננים מתקדמים","posted_by":{"label":"פורסם על ידי","aria_label":"סינון לפי מחבר ההודעה"},"in_category":{"label":"\\"},"in_group":{"label":"בקבוצה"},"with_badge":{"label":"עם עיטור"},"with_tags":{"label":"מתוייג","aria_label":"סינון באמצעות תגיות"},"filters":{"label":"החזר רק נושאים/פוסטים...","title":"מתאימים רק בכותרת","likes":"אהבתי","posted":"פרסמתי בהם","created":"יצרתי","watching":"אני צופה בהם","tracking":"במעקב שלי","private":"בהודעות שלי","bookmarks":"סימנתי","first":"הפוסטים הראשונים","pinned":"נעוצים","seen":"קראתי","unseen":"לא קראתי","wiki":"הם ויקי","images":"לרבות תמונות","all_tags":"כל התגיות הנ\"ל"},"statuses":{"label":"כאשר נושאים","open":"פתוחים","closed":"סגורים","public":"הם ציבוריים","archived":"מאורכבים","noreplies":"אין להם תגובות","single_user":"מכילים משתמש/ת יחידים"},"post":{"count":{"label":"פוסטים"},"min":{"placeholder":"מזערי","aria_label":"סינון לפי מספר הפוסטים המזערי"},"max":{"placeholder":"מרבי","aria_label":"סינון לפי מספר הפוסטים המרבי"},"time":{"label":"פורסמו","aria_label":"סינון לפי מועד הפרסום","before":"לפני","after":"אחרי"}},"views":{"label":"צפיות"},"min_views":{"placeholder":"מזערי","aria_label":"סינון לפי כמות הצפיות המזערית"},"max_views":{"placeholder":"מרבי","aria_label":"סינון לפי כמות הצפיות המרבית"},"additional_options":{"label":"סינון לפי כמות פוסטים וצפיות בנושאים"}}},"hamburger_menu":"תפריט","new_item":"חדש","go_back":"חזור אחורה","not_logged_in_user":"עמוד משתמש עם סיכום פעילות נוכחית והעדפות","current_user":"לך לעמוד המשתמש שלך","view_all":"להציג את כל %{tab}","topics":{"new_messages_marker":"ביקור אחרון","bulk":{"select_all":"בחרו הכל","clear_all":"נקו הכל","unlist_topics":"הסרת נושאים","relist_topics":"רשימה מחדש של נושאים","reset_read":"איפוס נקראו","delete":"מחיקת נושאים","dismiss":"ביטול","dismiss_read":"התעלמות מאלו שלא נקראו","dismiss_button":"ביטול...","dismiss_tooltip":"ביטול הצגת פוסטים חדשים או מעקב אחר נושאים","also_dismiss_topics":"הפסיקו לעקוב אחרי נושאים אלו כדי שהם לא יופיעו שוב בתור לא-נקראו","dismiss_new":"ביטול חדשים","toggle":"החלף קבוצה מסומנת של נושאים","actions":"מקבץ פעולות","change_category":"הגדרת קטגוריה…","close_topics":"סגירת נושאים","archive_topics":"ארכוב נושאים","move_messages_to_inbox":"העברה לדואר נכנס","notification_level":"התראות…","change_notification_level":"שינוי רמת ההתראות","choose_new_category":"נא לבחור קטגוריה לנושאים:","selected":{"one":"בחרת בנושא \u003cb\u003eאחד\u003c/b\u003e.","two":"בחרת ב־\u003cb\u003e%{count}\u003c/b\u003e נושאים.","many":"בחרת ב־\u003cb\u003e%{count}\u003c/b\u003e נושאים.","other":"בחרת ב־\u003cb\u003e%{count}\u003c/b\u003e נושאים."},"change_tags":"החלפת תגיות","append_tags":"הוספת תגיות","choose_new_tags":"בחירה בתגיות חדשות לנושאים אלו:","choose_append_tags":"בחירה בתגיות חדשות שיתווספו לנושאים אלו:","changed_tags":"התגיות של נושאים אלו השתנו.","remove_tags":"הסרת כל התגיות","confirm_remove_tags":{"one":"כל התגיות יוסרו מהנושא הזה. להמשיך?","two":"כל התגיות יוסרו מ־\u003cb\u003e%{count}\u003c/b\u003e הנושאים האלה. להמשיך?","many":"כל התגיות יוסרו מ־\u003cb\u003e%{count}\u003c/b\u003e הנושאים האלה. להמשיך?","other":"כל התגיות יוסרו מ־\u003cb\u003e%{count}\u003c/b\u003e הנושאים האלה. להמשיך?"},"progress":{"one":"התקדמות: נושא \u003cstrong\u003e%{count}\u003c/strong\u003e","two":"התקדמות: \u003cstrong\u003e%{count}\u003c/strong\u003e נושאים","many":"התקדמות: \u003cstrong\u003e%{count}\u003c/strong\u003e נושאים","other":"התקדמות: \u003cstrong\u003e%{count}\u003c/strong\u003e נושאים"}},"none":{"unread":"אין לך נושאים שלא נקראו.","unseen":"אין לך נושאים שלא ראית.","new":"אין לך נושאים חדשים.","read":"עדיין לא קראת אף נושא.","posted":"עדיין לא פרסמתם באף נושא.","latest":"התעדכנת בהכול!","bookmarks":"אין לך עדיין סימניות לנושאים.","category":"אין נושאים בקטגוריה %{category}.","top":"אין נושאים מובילים.","educate":{"new":"\u003cp\u003eהנושאים החדשים שלך יופיעו כאן. כבררת מחדל, נושאים נחשבים חדשים ויופיעו עם המחוון \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e אם הם נוצרו ביומיים האחרונים. \u003c/p\u003e\u003cp\u003eניתן לבקר בעמוד ה\u003ca href=\"%{userPrefsUrl}\"\u003eהעדפות\u003c/a\u003e שלך כדי לשנות זאת.\u003c/p\u003e","unread":"\u003cp\u003eהנושאים שלא קראת יופיעו כאן.\u003c/p\u003e\u003cp\u003eכבררת מחדל, נושאים ייחשבו שטרם קראת אותם ויוצג עליהם מונה \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e בספירה של הפריטים שלא נקראו אם: \u003c/p\u003e \u003cul\u003e\u003cli\u003eיצרת את הנושא\u003c/li\u003e\u003cli\u003eהגבת לנושא\u003c/li\u003e\u003cli\u003eקראת את הנושא במשך יותר מ־4 דקות\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eאו אם בחרת לעקוב או לצפות בנושא דרך 🔔 המופיע בכל נושא.\u003c/p\u003e\u003cp\u003eניתן לבקר ב בעמוד ה\u003ca href=\"%{userPrefsUrl}\"\u003eהעדפות\u003c/a\u003e שלך כדי לשנות זאת.\u003c/p\u003e"}},"bottom":{"latest":"אין עוד נושאים אחרונים.","posted":"אין עוד נושאים שפורסמו.","read":"אין עוד נושאים שנקראו.","new":"אין עוד נושאים חדשים.","unread":"אין עוד נושאים שלא נקראו.","unseen":"אין יותר נושאים שלא נראו.","category":"אין עוד נושאים בקטגוריה %{category}.","tag":"אין יותר נושאי %{tag}.","top":"אין עוד נושאים מובילים.","bookmarks":"אין עוד סימניות לנושאים."}},"topic":{"filter_to":{"one":"פוסט אחד בנושא","two":"%{count} פוסטים בנושא","many":"%{count} פוסטים בנושא","other":"%{count} פוסטים בנושא"},"create":"נושא חדש","create_long":"יצירת נושא חדש","open_draft":"פתח טיוטה","private_message":"תחילת הודעה","archive_message":{"help":"העברת הודעה לארכיון","title":"ארכב"},"move_to_inbox":{"title":"העברה לדואר נכנס","help":"החזרת הודעה לדואר נכנס"},"edit_message":{"help":"ערוך פוסט ראשון של ההודעה","title":"עריכה"},"defer":{"help":"סימון כלא נקראו","title":"אחר כך"},"list":"נושאים","new":"נושא חדש","unread":"לא נקראו","new_topics":{"one":"נושא חדש אחד","two":"%{count} נושאים חדשים","many":"%{count} נושאים חדשים","other":"%{count} נושאים חדשים"},"unread_topics":{"one":"%{count} שלא נקרא","two":"%{count} נושאים שלא נקראו","many":"%{count} נושאים שלא נקראו","other":"%{count} נושאים שלא נקראו"},"title":"נושא","invalid_access":{"title":"הנושא פרטי","description":"סליחה, איך אין לך גישה לנושא הזה!","login_required":"יש להיכנס כדי לצפות בנושא זה."},"server_error":{"title":"שגיאה בטעינת הנושא","description":"סליחה, לא יכולנו לטעון את הנושא הזה, ייתכן שבשל תקלת תקשורת. אנא נסו שוב. אם הבעיה נמשכת, הודיעו לנו."},"not_found":{"title":"הנושא לא נמצא","description":"לא הצלחנו למצוא את הנושא הזה. אולי הוא הוסר על ידי הפיקוח?"},"unread_posts":{"one":"יש לכם פוסט אחד שלא נקרא בנושא זה","two":"יש לכם %{count} פוסטים שלא נקראו בנושא זה","many":"יש לכם %{count} פוסטים שלא נקראו בנושא זה","other":"יש לכם %{count} פוסטים שלא נקראו בנושא זה"},"likes":{"one":"יש לייק אחד בנושא הזה","two":"יש %{count} לייקים בנושא זה","many":"יש %{count} לייקים בנושא זה","other":"יש %{count} לייקים בנושא זה"},"back_to_list":"חזרה לרשימת הנושאים","options":"אפשרויות נושא","show_links":"הצג קישורים בתוך הנושא הזה","collapse_details":"צמצום פרטי הנושא","expand_details":"הרחבת פרטי הנושא","read_more_in_category":"רוצים לקרוא עוד? עיינו בנושאים אחרים ב %{catLink} או %{latestLink}.","read_more":"רוצה לקרוא עוד? %{catLink} or %{latestLink}.","unread_indicator":"אף אחד מהחברים לא קרא את הפוסט האחרון של הנושא הזה עדיין.","browse_all_categories":"עיינו בכל הקטגוריות","browse_all_tags":"עיון בכל התגיות","view_latest_topics":"הצגת נושאים אחרונים","suggest_create_topic":"מעניין אותך \u003ca href\u003eלפתוח בדיון חדש?\u003c/a\u003e","jump_reply_up":"קפיצה לתגובה קודמת","jump_reply_down":"קפיצה לתגובה מאוחרת","deleted":"הנושא הזה נמחק","slow_mode_update":{"title":"מצב אטי","select":"משתמשים יכולים לפרסם לנושא הזה רק פעם אחת בכל:","description":"כדי לקדם דיון מתחשב במהלך דיונים מהירים או וכחניים, משתמשים חייבים להמתין בטרם פרסום פעם נוספת לנושא הזה.","enable":"הפעלה","update":"עדכון","enabled_until":"מופעל עד:","remove":"השבתה","hours":"שעות:","minutes":"דקות:","seconds":"שניות:","durations":{"10_minutes":"10 דקות","15_minutes":"רבע שעה","30_minutes":"חצי שעה","45_minutes":"45 דקות","1_hour":"שעה","2_hours":"שעתיים","4_hours":"4 שעות","8_hours":"8 שעות","12_hours":"12 שעות","24_hours":"24 שעות","custom":"משך מותאם אישית"}},"slow_mode_notice":{"duration":"נא להמתין %{duration} בין פוסטים בנושא הזה"},"topic_status_update":{"title":"שעון עצר לנושא","save":"קביעת שעון עצר","num_of_hours":"מספר שעות:","num_of_days":"מספר הימים:","remove":"הסרת שעון עצר","publish_to":"פרסום ל:","when":"מתי:","time_frame_required":"נא לבחור מסגרת זמנים","min_duration":"משך הזמן חייב להיות גדול מ־0","max_duration":"משך הזמן חייב להיות פחות מ־20 שנה","duration":"משך"},"auto_update_input":{"none":"נא לבחור טווח זמן","now":"כעת","later_today":"בהמשך היום","tomorrow":"מחר","later_this_week":"בהמשך השבוע","this_weekend":"בסוף שבוע זה","next_week":"בשבוע הבא","two_weeks":"שבועיים","next_month":"חודש הבא","two_months":"חודשיים","three_months":"שלושה חודשים","four_months":"ארבעה חודשים","six_months":"שישה חודשים","one_year":"שנה","forever":"לנצח","pick_date_and_time":"בחרו תאריך ושעה","set_based_on_last_post":"סגירה מבוססת על הפוסט האחרון"},"publish_to_category":{"title":"תזמון פרסום"},"temp_open":{"title":"פתיחה זמנית"},"auto_reopen":{"title":"פתיחה אוטומטית של נושא"},"temp_close":{"title":"סגירה זמנית"},"auto_close":{"title":"סגירה אוטומטית של נושא","label":"לסגור נושאים אוטומטית לאחר:","error":"אנא הכניסו ערך תקין.","based_on_last_post":"אל תסגרו עד שהפוסט האחרון בנושא הוא לפחות בגיל זה."},"auto_close_after_last_post":{"title":"לסגור את הנושא אוטומטית לאחר הפוסט האחרון"},"auto_delete":{"title":"מחיקה-אוטומטית של נושא"},"auto_bump":{"title":"נושא מוקפץ אוטומטית"},"reminder":{"title":"תזכורת"},"auto_delete_replies":{"title":"למחוק תגובות אוטומטית"},"status_update_notice":{"auto_open":"נושא זה ייפתח אוטומטית %{timeLeft}.","auto_close":"נושא זו ייסגר אוטומטית %{timeLeft}.","auto_publish_to_category":"נושא זה יפורסם ל-\u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_after_last_post":"נושא זה ייסגר %{duration} אחרי התגובה האחרונה.","auto_delete":"נושא זה יימחק אוטומטית %{timeLeft}.","auto_bump":"נושא זה יוקפץ אוטומטית %{timeLeft}.","auto_reminder":"תישלח אליך תזכורת בנוגע לנושא זה %{timeLeft}.","auto_delete_replies":"תגובות על נושא זה נמחקות אוטומטית לאחר %{duration}."},"auto_close_title":"הגדרות סגירה אוטומטית","auto_close_immediate":{"one":"הפוסט האחרון בנושא הוא כבר בן שעה (%{count}), אז הנושא ייסגר מיידית.","two":"הפוסט האחרון בנושא הוא כבר בן שעתיים (%{count}), אז הנושא ייסגר אוטומטית.","many":"הפוסט האחרון בנושא הוא כבר בן %{count} שעות, אז הנושא ייסגר אוטומטית.","other":"הפוסט האחרון בנושא הוא כבר בן %{count} שעות, אז הנושא ייסגר אוטומטית."},"auto_close_momentarily":{"one":"הפוסט האחרון בנושא הוא כבר בן שעה (%{count}), לכן הנושא ייסגר מיידית.","two":"הפוסט האחרון בנושא הוא כבר בן שעתיים (%{count}), לכן הנושא ייסגר מיידית.","many":"הפוסט האחרון בנושא הוא כבר בן %{count} שעות, לכן הנושא ייסגר מיידית.","other":"הפוסט האחרון בנושא הוא כבר בן %{count} שעות, לכן הנושא ייסגר מיידית."},"timeline":{"back":"חזרה","back_description":"חיזרו לפוסט האחרון שלא-נקרא על-ידיכם","replies_short":"%{current} / %{total}"},"progress":{"title":"התקדמות נושא","go_top":"למעלה","go_bottom":"למטה","go":"קדימה","jump_bottom":"מעבר לפוסט האחרון","jump_prompt":"קפצו אל...","jump_prompt_of":{"one":"מתוך פוסט %{count}","two":"מתוך %{count} פוסטים","many":"מתוך %{count} פוסטים","other":"מתוך %{count} פוסטים"},"jump_prompt_long":"מעבר אל…","jump_bottom_with_number":"קפיצה לפוסט %{post_number}","jump_prompt_to_date":"עד לתאריך","jump_prompt_or":"או","total":"סך הכל הפוסטים","current":"פוסט נוכחי"},"notifications":{"title":"שנו את תדירות ההתראות על הנושא הזה","reasons":{"mailing_list_mode":"מצב רשימת תפוצה פעיל, לכן תישלח אליך התראה בדוא״ל על תגובות לנושא זה.","3_10":"תקבלו התראות כיוון שאתם צופים בתג שקשור לנושא זה.","3_10_stale":"תישלחנה אליך הודעות כיוון שבחרת לעקוב אחר תגית בנושא הזה בעבר.","3_6":"תקבלו התראות כיוון שאתם עוקבים אחרי קטגוריה זו.","3_6_stale":"תישלחנה אליך הודעות כיוון שבחרת לעקוב אחר הקטגוריה הזאת בעבר.","3_5":"תקבלו התראות כיוון שהתחלתם לעקוב אחרי הנושא הזה אוטומטית.","3_2":"תקבלו התראות כיוון שאתם עוקבים אחרי הנושא הזה.","3_1":"תקבלו התראות כיוון שאתם יצרתם את הנושא הזה.","3":"תקבלו התראות כיוון שאתם עוקבים אחרי הנושא זה.","2_8":"תראו ספירה של תגובות חדשות כיוון שאתם עוקבים אחר קטגוריה זו.","2_8_stale":"יופיע מניין תגובות חדשות כיוון שבחרת לעקוב אחר קטגוריה זו בעבר.","2_4":"תראו ספירה של תגובות חדשות כיוון שפרסמתם תגובה לנושא זה.","2_2":"תראו ספירה של תגובות חדשות כיוון שאתם עוקבים אחר נושא זה:","2":"יופיע עיטור עם מספר התגובות החדשות מכיוון ש\u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eקראת את הנושא הזה\u003c/a\u003e.","1_2":"תישלח התראה אם מישהו יזכיר את @שם_המשתמש שלך או ישיב לך.","1":"תישלח התראה אם מישהו יזכיר את @שם_המשתמש שלך או ישיב לך.","0_7":"אתם מתעלמים מכל ההתראות בקטגוריה זו.","0_2":"אתם מתעלמים מכל ההתראות בנושא זה.","0":"אתם מתעלמים מכל ההתראות בנושא זה."},"watching_pm":{"title":"עוקב","description":"תקבלו התראה על כל תגובה חדשה בהודעה זו. בנוסף מספר התגובות שלא נקראו יופיעו ליד ההודעה."},"watching":{"title":"עוקב","description":"תקבלו התראה על כל תגובה חדשה בנושא זה ומספר התגובות החדשות יוצג. "},"tracking_pm":{"title":"במעקב","description":"ספירה של תגובות חדשות תופיע עבור הודעה זו. תקבלו התראה אם מישהו מזכיר את @שמכם או מגיב על הודעה שלכם."},"tracking":{"title":"במעקב","description":"כמו רגיל, בנוסף מספר התגובות שלא נקראו יוצג לנושא זה."},"regular":{"title":"רגיל","description":"תישלח התראה אם מישהו יזכיר את @שם_המשתמש שלך או יגיב להודעה שלך."},"regular_pm":{"title":"רגיל","description":"תישלח התראה אם מישהו יזכיר את @שם_המשתמש שלך או יגיב להודעה שלך."},"muted_pm":{"title":"מושתק","description":"לעולם לא תקבלו התראה בנוגע להודעה זו."},"muted":{"title":"מושתק","description":"לעולם לא תקבלו התראות על נושא זה, והוא לא יופיע ב״אחרונים״."}},"actions":{"title":"פעולות","recover":"שחזר נושא","delete":"מחק נושא","open":"פתח נושא","close":"סגור נושא","multi_select":"בחרו פוסטים...","slow_mode":"הגדרת מצב אטי…","timed_update":"קביעת שעון עצר לנושא...","pin":"נעץ נושא...","unpin":"שחרר נעיצת נושא...","unarchive":"הוצא נושא מארכיון","archive":"העבר נושא לארכיון","invisible":"הסתרה","visible":"גילוי","reset_read":"אפס מידע שנקרא","make_public":"הפיכת הנושא לפומבי…","make_private":"צור הודעה פרטית","reset_bump_date":"אפס תאריך הקפצה"},"feature":{"pin":"נעץ נושא","unpin":"שחרר נעיצת נושא","pin_globally":"נעיצת נושא גלובלית","make_banner":"המרה לכרזת נושא","remove_banner":"הסרת נושא באנר"},"reply":{"title":"תגובה","help":"התחל לערוך תגובה לנושא זה"},"share":{"title":"שיתוף","extended_title":"שתף קישור","help":"שתפו קישור לנושא זה","instructions":"שיתוף קישור לנושא זה:","copied":"קישור הנושא הועתק.","notify_users":{"title":"להודיע","instructions":"להודיע למשתמשים הבאים על הנושא הזה:","success":{"one":"נשלחה הודעה אל %{username} על הנושא הזה.","two":"נשלחה הודעה לכולם על הנושא הזה.","many":"נשלחה הודעה לכולם על הנושא הזה.","other":"נשלחה הודעה לכולם על הנושא הזה."}},"invite_users":"להזמין"},"print":{"title":"הדפסה","help":"פתיחת גרסה ידידותית להדפסה של נושא זה"},"flag_topic":{"title":"דגל","help":"דגלו נושא זה באופן פרטי לתשומת לב או שלחו התראה פרטית בנוגע אליו","success_message":"דיגלתם נושא זה בהצלחה."},"make_public":{"title":"המרה לנושא ציבורי","choose_category":"נא לבחור קטגוריה לנושא הציבורי:"},"feature_topic":{"title":"המליצו על נושא זה","pin":"גרמו לנושא זה להופיע בראש קטגוריה %{categoryLink} עד","unpin":"הסרת נושא זה מראש הקטגוריה %{categoryLink}.","unpin_until":"גרמו לנושא זה להופיע בראש הקטגוריה %{categoryLink} או המתינו עד \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"משתמשים יכולים לבטל עצמאית את נעיצת הנושא עבורם בלבד.","pin_validation":"דרוש תאריך על מנת לנעוץ את הנושא.","not_pinned":"אין נושאים שננעצו בקטגוריה %{categoryLink}.","already_pinned":{"one":"נושא שנעוץ כרגע בקטגוריה %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"נושאים שנעוצים כרגע בקטגוריה %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"נושאים שנעוצים כרגע בקטגוריה %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"נושאים שנעוצים כרגע בקטגוריה %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"להציב את הנושא הזה בראש כל רשימות הנושאים עד","confirm_pin_globally":{"one":"כבר נעצת נושא %{count} באופן גלובלי. עודף נושאים נעוצים עשוי להכביד על משתמשים חדשים או אלמוניים. לנעוץ נושא גלובלי נוסף?","two":"כבר נעצת %{count} נושאים באופן גלובלי. עודף נושאים נעוצים עשוי להכביד על משתמשים חדשים או אלמוניים. לנעוץ נושא גלובלי נוסף?","many":"כבר נעצת %{count} נושאים באופן גלובלי. עודף נושאים נעוצים עשוי להכביד על משתמשים חדשים או אלמוניים. לנעוץ נושא גלובלי נוסף?","other":"כבר נעצת %{count} נושאים באופן גלובלי. עודף נושאים נעוצים עשוי להכביד על משתמשים חדשים או אלמוניים. לנעוץ נושא גלובלי נוסף?"},"unpin_globally":"הסרת נושא זה מראש כל רשימות הנושאים.","unpin_globally_until":"להסיר נושא זה מראש כל רשימות הנושאים או להמתין עד \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"משתמשים יכולים לבטל עצמאית את נעיצת הנושא באופן פרטני.","not_pinned_globally":"אין נושאים נעוצים גלובלית.","already_pinned_globally":{"one":"נושא שכרגע נעוץ גלובלית: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","two":"נושאים שכרגע נעוצים גלובלית: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"נושאים שכרגע נעוצים גלובלית: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"נושאים שכרגע נעוצים גלובלית: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"הפכו נושא זה לבאנר אשר מופיע בראש כל העמודים.","remove_banner":"הסרת הבאנר שמופיע בראש כל העמודים.","banner_note":"משתמשים יכולים לבטל את הבאנר על ידי סגירתו. רק פוסט אחד יכול לשמש כבאנר בזמן נתון.","no_banner_exists":"אין נושא באנר","banner_exists":"\u003cstrong class='badge badge-notification unread'\u003eיש\u003c/strong\u003e כרגע נושא באנר."},"inviting":"מזמין...","automatically_add_to_groups":"הזמנה זו כוללת גם גישה לקבוצות הבאות:","invite_private":{"title":"הזמינו להודעה","email_or_username":"כתובת דואר אלקטרוני או שם משתמש של המוזמן","email_or_username_placeholder":"כתובת דואר אלקטרוני או שם משתמש","action":"הזמנה","success":"הזמנו את המשתמש להשתתף בשיחה.","success_group":"הזמנו את הקבוצה הזו להשתתף בהודעה זו.","error":"סליחה, הייתה שגיאה בהזמנת משתמש זה.","not_allowed":"אי אפשר להזמין משתמש זה, עמך הסליחה.","group_name":"שם הקבוצה"},"controls":"מכווני נושא","invite_reply":{"title":"הזמנה","username_placeholder":"שם משתמש","action":"שליחת הזמנה","help":"הזמינו אנשים אחרים לנושא זה דרך דואר אלקטרוני או התראות","to_forum":"אנו נשלח הודעה קצרה בדוא״ל שתאפשר לחברים שלך להצטרף באופן מיידי בלחיצה על קישור.","discourse_connect_enabled":"נא למלא את שם המשתמש של מי שברצונך להזמין לנושא זה.","to_topic_blank":"הכניסו את שם המשתמש או כתובת הדואר האלקטרוני של האדם שברצונכם להזמין לנושא זה.","to_topic_email":"מילאת כתובת דוא״ל. אנחנו נשלח לך הזמנה בדוא״ל שתאפשר לחבריך להשיב לנושא הזה מיידית.","to_topic_username":"הזנת שם משתמש/ת. נשלח התראה עם לינק הזמנה לנושא הזה. ","to_username":"הכנסתם את שם המשתמש של האדם שברצונכם להזמין. אנו נשלח התראה למשתמש זה עם קישור המזמין אותו לנושא זה.","email_placeholder":"name@example.com","success_email":"שלחנו הזמנה אל \u003cb\u003e%{invitee}\u003c/b\u003e. נודיע לך כשההזמנה תנוצל. כדאי לבדוק את לשונית ההזמנות בעמוד המשתמש שלך כדי לעקוב אחר ההזמנות ששלחת.","success_username":"הזמנו את המשתמש להשתתף בנושא.","error":"מצטערים, לא יכלנו להזמין משתמש/ת אלו. אולי הם כבר הוזמנו בעבר? (תדירות שליחת ההזמנות מוגבלת)","success_existing_email":" כבר קיים משתמש עם כתובת הדוא״ל \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. נשלחה הזמנה למשתמש להשתתף בנושא."},"login_reply":"יש להיכנס כדי להשיב","filters":{"n_posts":{"one":"פוסט אחד","two":"%{count} פוסטים","many":"%{count} פוסטים","other":"%{count} פוסטים"},"cancel":"הסרת הסינון"},"move_to":{"title":"העבר ל","action":"העבר ל","error":"אראה שגיאה בהעברת הפוסט."},"split_topic":{"title":"העבר לנושא חדש","action":"העבר לנושא חדש","topic_name":"כותרת נושא חדש","radio_label":"נושא חדש","error":"הייתה שגיאה בהעברת הפוסטים לנושא החדש.","instructions":{"one":"אתם עומדים ליצור נושא חדש ולמלא אותו עם הפוסטים שבחרתם.","two":"אתם עומדים ליצור נושא חדש ולמלא אותו עם \u003cb\u003e%{count}\u003c/b\u003e הפוסטים שבחרתם.","many":"אתם עומדים ליצור נושא חדש ולמלא אותו עם \u003cb\u003e%{count}\u003c/b\u003e הפוסטים שבחרתם.","other":"אתם עומדים ליצור נושא חדש ולמלא אותו עם \u003cb\u003e%{count}\u003c/b\u003e הפוסטים שבחרתם."}},"merge_topic":{"title":"העבר לנושא קיים","action":"העבר לנושא קיים","error":"התרחשה שגיאה בהעברת הפוסטים לנושא הזה.","radio_label":"נושא קיים","instructions":{"one":"בבקשה בחרו נושא אליו הייתם רוצים להעביר את הפוסט.","two":"בבקשה בחרו את הנושא אליו תרצה להעביר את \u003cb\u003e%{count}\u003c/b\u003e הפוסטים.","many":"בבקשה בחרו את הנושא אליו תרצה להעביר את \u003cb\u003e%{count}\u003c/b\u003e הפוסטים.","other":"בבקשה בחרו את הנושא אליו תרצה להעביר את \u003cb\u003e%{count}\u003c/b\u003e הפוסטים."}},"move_to_new_message":{"title":"העבר להודעה חדשה","action":"העבר להודעה חדשה","message_title":"כותרת הודעה חדשה","radio_label":"הודעה חדשה","participants":"משתתפים","instructions":{"one":"אתם עומדים ליצור נושא חדש ולמלא אותו עם הפוסט שבחרתם.","two":"אתם עומדים ליצור נושא חדש ולמלא אותו עם \u003cb\u003e%{count}\u003c/b\u003e הפוסטים שבחרתם.","many":"אתם עומדים ליצור נושא חדש ולמלא אותו עם \u003cb\u003e%{count}\u003c/b\u003e הפוסטים שבחרתם.","other":"אתם עומדים ליצור נושא חדש ולמלא אותו עם \u003cb\u003e%{count}\u003c/b\u003e הפוסטים שבחרתם."}},"move_to_existing_message":{"title":"העבר להודעה קיימת","action":"העבר להודעה קיימת","radio_label":"הודעה קיימת","participants":"משתתפים","instructions":{"one":"בבקשה בחרו את ההודעה אליה תרצו להעביר את הפוסט.","two":"בבקשה בחרו את ההודעה אליה תרצו להעביר את \u003cb\u003e%{count}\u003c/b\u003e הפוסטים.","many":"בבקשה בחרו את ההודעה אליה תרצו להעביר את \u003cb\u003e%{count}\u003c/b\u003e הפוסטים.","other":"בבקשה בחרו את ההודעה אליה תרצו להעביר את \u003cb\u003e%{count}\u003c/b\u003e הפוסטים."}},"merge_posts":{"title":"ניזוג פוסטים שנבחרו","action":"מיזוג פוסטים שנבחרו","error":"ארעה שגיאה במיזוג הפוסטים שנבחרו."},"publish_page":{"title":"פרסום עמוד","publish":"פרסום","description":"כאשר נושא מפורסם כעמוד, ניתן לשתף את הכתובת שלו והיא תוצג בסגנון עצמאי.","slug":"מזהה ייצוגי","public":"ציבורי","public_description":"אנשים יכולים לראות את העמוד אפילו אם הנושא המשויך הוא פרטי.","publish_url":"העמוד שלך פורסם ב־:","topic_published":"הנושא שלך פורסם ב־:","preview_url":"העמוד שלך יפורסם ב־:","invalid_slug":"אין לך אפשרות לפרסם את העמוד הזה, עמך הסליחה.","unpublish":"משיכת הפרסום","unpublished":"פרסום העמוד שלך נמשך ואין זמין עוד.","publishing_settings":"הגדרות פרסום"},"change_owner":{"title":"שנה בעלים","action":"שנה בעלות","error":"התרחשה שגיאה בשינוי הבעלות של ההדעות.","placeholder":"שם המשתמש של הבעלים החדש","instructions":{"one":"אנא בחרו את הבעלים החדש של הפוסט מאת \u003cb\u003e%{old_user}\u003c/b\u003e.","two":"אנא בחרו את הבעלים החדש של %{count} הפוסטים מאת \u003cb\u003e@%{old_user}\u003c/b\u003e.","many":"אנא בחרו את הבעלים החדש של %{count} הפוסטים מאת \u003cb\u003e@%{old_user}\u003c/b\u003e.","other":"אנא בחרו את הבעלים החדש של %{count} הפוסטים מאת \u003cb\u003e@%{old_user}\u003c/b\u003e."},"instructions_without_old_user":{"one":"נא לבחור בעלים חדש לפוסט","two":"נא לבחור בעלים חדש ל־%{count} הפוסטים","many":"נא לבחור בעלים חדש ל־%{count} הפוסטים","other":"נא לבחור בעלים חדש ל־%{count} הפוסטים"}},"change_timestamp":{"title":"שינוי חותמת זמן...","action":"שינוי חותמת זמן","invalid_timestamp":"חותמת זמן לא יכולה להיות בעתיד.","error":"היתה שגיאה בשינוי חותמת הזמן של הנושא.","instructions":"אנא בחרו את חותמת הזמן החדשה של הנושא. פוסטים בנושא יועדכנו לאותם הפרשי זמנים."},"multi_select":{"select":"בחירה","selected":"נבחרו (%{count})","select_post":{"label":"בחירה","title":"הוספת פוסט לבחירה"},"selected_post":{"label":"נבחרים","title":"הקליקו לביטול בחירת הפוסט"},"select_replies":{"label":"נבחרו +תגובות","title":"הוספת פוסט ואת כל התגובות שלו לבחירה"},"select_below":{"label":"יש לבחור +להלן","title":"הוספת פוסט וכל מה שאחריו לבחירה"},"delete":"מחק נבחרים","cancel":"בטל בחירה","select_all":"בחר הכל","deselect_all":"בחר כלום","description":{"one":"בחרתם פוסט אחד.","two":"בחרתם \u003cb\u003e%{count}\u003c/b\u003e פוסטים.","many":"בחרתם \u003cb\u003e%{count}\u003c/b\u003e פוסטים.","other":"בחרתם \u003cb\u003e%{count}\u003c/b\u003e פוסטים."}},"deleted_by_author_simple":"(הנושא נמחק על ידי הכותב)"},"post":{"quote_reply":"ציטוט","quote_reply_shortcut":"או ללחוץ על q","quote_edit":"עריכה","quote_edit_shortcut":"או ללחוץ על e","quote_share":"שיתוף","edit_reason":"סיבה: ","post_number":"פוסט %{number}","ignored":"תוכן בהתעלמות","wiki_last_edited_on":"הוויקי נערך לאחרונה ב־%{dateTime}","last_edited_on":"הפוסט נערך לאחרונה ב־%{dateTime}","reply_as_new_topic":"תגובה כנושא מקושר","reply_as_new_private_message":"תגובה כהודעה חדשה לאותם נמענים","continue_discussion":"ממשיך את הדיון מ %{postLink}:","follow_quote":"מעבר לפוסט המצוטט","show_full":"הצגת פוסט מלא","show_hidden":"צפייה בתוכן שמיועד להתעלמות.","deleted_by_author_simple":"(הפוסט נמחק על ידי הכותב)","collapse":"צמצום","expand_collapse":"הרחב/צמצם","locked":"חבר סגל נעל את האפשרות לערוך את הפוסט הזה","gap":{"one":"הצג תגובה אחת שהוסתרה","two":"הצגת %{count} תגובות שהוסתרו","many":"הצגת %{count} תגובות שהוסתרו","other":"הצגת %{count} תגובות שהוסתרו"},"notice":{"new_user":"זהו הפרסום הראשון מאת %{user} - הבה נקבל את פניו/ה לקהילה שלנו!","returning_user":"עבר זמן מה מאז שראינו במחוזותינו את %{user} - הפרסום האחרון שלו/ה היה ב־%{time}."},"unread":"הפוסט טרם נקרא","has_replies":{"one":"תגובה אחת","two":"%{count} תגובות","many":"%{count} תגובות","other":"%{count} תגובות"},"has_replies_count":"%{count}","unknown_user":"(משתמש לא ידוע/נמחק)","has_likes_title":{"one":"מישהו אחד אהב את התגובה הזו","two":"%{count} אנשים אהבו את התגובה הזו","many":"%{count} אנשים אהבו את התגובה הזו","other":"%{count} אנשים אהבו את התגובה הזו"},"has_likes_title_only_you":"אהבת את התגובה הזו","has_likes_title_you":{"one":"אתם ועוד מישהו אהבתם את הפוסט הזה","two":"אתם ו %{count} אנשים אחרים אהבתם את הפוסט הזה","many":"אתם ו %{count} אנשים אחרים אהבתם את הפוסט הזה","other":"אתם ו %{count} אנשים אחרים אהבתם את הפוסט הזה"},"filtered_replies_hint":{"one":"הצגת הפוסט הזה ואת התגובה עליו","two":"הצגת הפוסט הזה ואת %{count} התגובות עליו","many":"הצגת הפוסט הזה ואת %{count} התגובות עליו","other":"הצגת הפוסט הזה ואת %{count} התגובות עליו"},"filtered_replies_viewing":{"one":"מוצגת תגובה %{count} אל","two":"מוצגות %{count} תגובות אל","many":"מוצגות %{count} תגובות אל","other":"מוצגות %{count} תגובות אל"},"in_reply_to":"טעינת הפוסט ההורה","view_all_posts":"הצגת כל הפוסטים","errors":{"create":"אירעה שגיאה ביצירת הפוסט שלך. נא לנסות שוב, עמך הסליחה.","edit":"אירעה שגיאה בעריכת הפוסט שלך. נא לנסות שוב, עמך הסליחה.","upload":"סליחה, הייתה שגיאה בהעלאת הקובץ שלך. אנא נסו שנית","file_too_large":"הקובץ הזה גדול מדי (הגודל המרבי הוא %{max_size_kb} ק״ב), עמך הסליחה. למה שלא להעלות את הקובץ שלך לשירות שיתוף בענן ואז להדביק את הקישור?","file_too_large_humanized":"הקובץ הזה גדול מדי (הגודל המרבי הוא %{max_size}), עמך הסליחה. למה שלא להעלות את הקובץ שלך לשירות שיתוף בענן ואז להדביק את הקישור?","too_many_uploads":"סליחה, אך ניתן להעלות רק קובץ אחת כל פעם.","too_many_dragged_and_dropped_files":{"one":"אפשר להעלות עד קובץ %{count} בכל פעם, עמך הסליחה.","two":"אפשר להעלות עד %{count} קבצים בכל פעם, עמך הסליחה.","many":"אפשר להעלות עד %{count} קבצים בכל פעם, עמך הסליחה.","other":"אפשר להעלות עד %{count} קבצים בכל פעם, עמך הסליחה."},"upload_not_authorized":"הקובץ שמועמד להעלאה אינו מורשה (סיומות מורשות: %{authorized_extensions}), עמך הסליחה.","image_upload_not_allowed_for_new_user":"סליחה, משתמשים חדשים לא יכולים להעלות תמונות.","attachment_upload_not_allowed_for_new_user":"סליחה, משתמשים חדשים לא יכולים להעלות קבצים.","attachment_download_requires_login":"מצטערים, עליכם להיות מחוברים כדי להוריד את הקבצים המצורפים."},"cancel_composer":{"confirm":"מה לעשות עם הפוסט שלך?","discard":"להשליך","save_draft":"לשמור טיוטה להמשך","keep_editing":"להמשיך לערוך"},"via_email":"פוסט זה הגיע בדוא״ל","via_auto_generated_email":"פוסט זה הגיע דרך הודעת דוא״ל שנוצרה אוטומטית","whisper":"פוסט זה הוא לחישה פרטית למפקחים","wiki":{"about":"הפוסט הוא ויקי"},"few_likes_left":"תודה על כל האהבה! נותרו לך סימוני לייק מועטים להיום.","controls":{"reply":"התחילו לכתוב תגובה לפוסט זה","like":"תנו לייק לפוסט זה","has_liked":"אהבת פוסט זה","read_indicator":"חברים שקוראים את הפוסט הזה","undo_like":"בטל 'אהוב'","edit":"עירכו פוסט זה","edit_action":"עריכה","edit_anonymous":"מצטערים, אך עליכם להיות מחוברים בכדי לערוך פוסט זה.","flag":"דגלו פוסט זה באופן פרטי לתשומת לב או שלחו התראה פרטית עליו","delete":"מחק פוסט זה","undelete":"שחזר פוסט זה","share":"שיתוף קישור לפוסט זה","more":"עוד","delete_replies":{"confirm":"למחוק את התגובות לפוסט הזה?","direct_replies":{"one":"כן, ותגובה אחת ישירה","two":"כן, ושתי תגובות ישירות","many":"כן, ו־%{count} תגובות ישירות","other":"כן, ו־%{count} תגובות ישירות"},"all_replies":{"one":"כן, ותגובה אחת","two":"כן, ושתי תגובות.","many":"כן, וכל %{count}התגובות.","other":"כן, וכל %{count}התגובות."},"just_the_post":"לא, רק את הפוסט"},"admin":"פעולות ניהול של הפוסט","permanently_delete":"למחוק לצמיתות","permanently_delete_confirmation":"למחוק את הפוסט הזה לצמיתות? לא תהיה אפשרות לשחזר אותו.","wiki":"יצירת wiki","unwiki":"הסרת ה-Wiki","convert_to_moderator":"הוספת צבע סגל","revert_to_regular":"הסרת צבע סגל","rebake":"בנייה מחודשת של HTML","publish_page":"פרסום עמוד","unhide":"הסרת הסתרה","change_owner":"החלפת בעלות…","grant_badge":"הענקת עיטור…","lock_post":"נעילת פוסט","lock_post_description":"למנוע מהמפרסם לערוך את הפוסט הזה","unlock_post":"שחרור פוסט","unlock_post_description":"לאפשר למפרסם לערוך את הפוסט הזה","delete_topic_disallowed_modal":"אין לך הרשאות למחוק את הנושא הזה. כדי למחוק אותו לצמיתות, יש לסמן אותו בדגל כדי שיקבל את תשומת לב הפיקוח לרבות סיבת הסימון.","delete_topic_disallowed":"אין לך הרשאה למחוק את הנושא הזה","delete_topic_confirm_modal":{"one":"לנושא זה יש למעלה מצפייה %{count} ועשוי להיות יעד חיפוש נפוץ. למחוק את הנושא הזה לחלוטין במקום לערוך ולשפר אותו?","two":"לנושא זה יש למעלה מ־%{count} צפיות ועשוי להיות יעד חיפוש נפוץ. למחוק את הנושא הזה לחלוטין במקום לערוך ולשפר אותו?","many":"לנושא זה יש למעלה מ־%{count} צפיות ועשוי להיות יעד חיפוש נפוץ. למחוק את הנושא הזה לחלוטין במקום לערוך ולשפר אותו?","other":"לנושא זה יש למעלה מ־%{count} צפיות ועשוי להיות יעד חיפוש נפוץ. למחוק את הנושא הזה לחלוטין במקום לערוך ולשפר אותו?"},"delete_topic_confirm_modal_yes":"כן, למחוק את הנושא הזה","delete_topic_confirm_modal_no":"לא, להשאיר את הנושא הזה","delete_topic_error":"אירעה שגיאה בעת מחיקת הנושא","delete_topic":"מחיקת נושא","add_post_notice":"הוספת התראת סגל…","change_post_notice":"עריכת התראת סגל…","delete_post_notice":"מחיקת התראת סגל","remove_timer":"הסרת שעון עצר","edit_timer":"עריכת מתזמן"},"actions":{"people":{"like":{"one":"אהב/ה את זה","two":"אהבו את זה","many":"אהבו את זה","other":"אהבו את זה"},"read":{"one":"קרא/ה את זה","two":"קראו את זה","many":"קראו את זה","other":"קראו את זה"},"like_capped":{"one":"ועוד מישהו אהב את זה","two":"ועוד 2 נוספים אהבו את זה","many":"ועוד %{count} נוספים אהבו את זה","other":"ועוד %{count} נוספים אהבו את זה"},"read_capped":{"one":"ועוד מישהו/י (%{count}) קרא/ה את זה","two":"ו־%{count} נוספים קראו את זה","many":"ו־%{count} נוספים קראו את זה","other":"ו־%{count} נוספים קראו את זה"}},"by_you":{"off_topic":"דיגלתם פרסום זה כאוף-טופיק","spam":"דיגלתם את זה כספאם","inappropriate":"דיגלתם את זה כלא ראוי","notify_moderators":"סימנת זאת בדגל לפיקוח","notify_user":"שלחתם הודעה למשתמש זה"}},"delete":{"confirm":{"one":"למחוק את הפוסט הזה?","two":"למחוק את %{count} הפוסטים האלה?","many":"למחוק את %{count} הפוסטים האלה?","other":"למחוק את %{count} הפוסטים האלה?"}},"merge":{"confirm":{"one":"האם אתם בטוחים שאתם מעוניינים למזג פוסטים אלו?","two":"האם אתם בטוחים שאתם מעוניינים למזג %{count} פוסטים אלו?","many":"האם אתם בטוחים שאתם מעוניינים למזג %{count} פוסטים אלו?","other":"האם אתם בטוחים שאתם מעוניינים למזג %{count} פוסטים אלו?"}},"revisions":{"controls":{"first":"מהדורה ראשונה","previous":"מהדורה קודמת","next":"מהדורה באה","last":"מהדורה אחרונה","hide":"הסתרת שינויים","show":"הצגת שינויים","revert":"החזרה לגרסה %{revision}","edit_wiki":"עריכת וויקי","edit_post":"עריכת פוסט","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"הצג את הפלט עם תוספות והסרות בתוכו","button":"HTML"},"side_by_side":{"title":"הצג את הפרשי הפלט אחד ליד השני","button":"HTML"},"side_by_side_markdown":{"title":"הצגת הבדלי המקור הגולמיים זה לצד זה","button":"גולמי"}}},"raw_email":{"displays":{"raw":{"title":"הצגת הודעת הדוא״ל הגולמית","button":"גולמי"},"text_part":{"title":"הצגת חלק הטקסט בהודעת הדוא״ל","button":"טקסט"},"html_part":{"title":"הצגת חלק ה־HTML בהודעת הדוא״ל","button":"HTML"}}},"bookmarks":{"create":"יצירת סימנייה","create_for_topic":"יצירת סימנייה לנושא","edit":"עריכת סימנייה","edit_for_topic":"עריכת סימנייה לנושא","created":"נוצר","updated":"עודכן","name":"שם","name_placeholder":"עבור מה הסימנייה?","set_reminder":"להזכיר לי","options":"אפשרויות","actions":{"delete_bookmark":{"name":"מחיקת סימנייה","description":"הסרת הסימנייה מהפרופיל שלך והפסקת התזכורות לסימנייה"},"edit_bookmark":{"name":"עריכת סימנייה","description":"עריכת שם הסימנייה או החלפת מועד התזכורת"},"pin_bookmark":{"name":"הצמדת הסימנייה","description":"הצמדת הסימנייה. פעולה זו תגרום לה להופיע בראש רשימת הסימניות שלך."},"unpin_bookmark":{"name":"ביטול הצמדת הסימנייה","description":"ביטול הצמדת הסימנייה. היא לא תופיע עוד בראש רשימת המועדפים שלך."}}},"filtered_replies":{"viewing_posts_by":"מוצגים %{post_count} פוסטים מאת","viewing_subset":"חלק מהתגובות מצומצמות","viewing_summary":"מוצג סיכום של הפוסט הזה","post_number":"%{username}, פוסט מס׳ %{post_number}","show_all":"להציג הכול"}},"category":{"none":"(ללא קטגוריה)","all":"כל הקטגוריות","choose":"קטגוריה\u0026hellip;","edit":"עריכה","edit_dialog_title":"עריכה: %{categoryName}","view":"הצגת נושאים בקטגוריה","back":"חזרה לקטגוריה","general":"כללי","settings":"הגדרות","topic_template":"תבנית נושא","tags":"תגיות","tags_allowed_tags":"הגבלת התגיות האלו לקטגוריה הזו:","tags_allowed_tag_groups":"הגבלת קבוצות תגיות אלו לקטגוריה זו:","tags_placeholder":"(רשות) רשימת תגיות מותרות","tags_tab_description":"תגיות וקבוצות תגיות שצוינו להלן תהיינה זמינות בקטגוריה זו ובקטגוריות נוספות שמציינות אותן. הן לא תהיינה זמינות בקטגוריות אחרות.","tag_groups_placeholder":"(רשות) רשימת קבוצות תגיות","manage_tag_groups_link":"ניהול קבוצות תגיות","allow_global_tags_label":"לאפשר גם תגיות אחרות","tag_group_selector_placeholder":"(רשות) קבוצת תגיות","required_tag_group_description":"לדרוש שלנושאים חדשים יהיו תגיות מקבוצת תגיות:","min_tags_from_required_group_label":"מס׳ תגיות:","required_tag_group_label":"קבוצת תגיות:","topic_featured_link_allowed":"אפשרו קישורים מומלצים בקטגוריה זו","delete":"מחיקת קטגוריה","create":"קטגוריה חדשה","create_long":"יצירת קטגוריה חדשה","save":"שמירת קטגוריה","slug":"כתובת חלזונית לקטגוריה","slug_placeholder":"(רשות) מילים-מחוברות-במקפים-ככתובת","creation_error":"ארעה שגיאה במהלך יצירת הקטגוריה הזו.","save_error":"ארעה שגיאה בשמירת הקטגוריה הזו","name":"שם הקטגוריה","description":"תיאור","logo":"תמונת לוגו לקטגוריה","background_image":"תמונת רקע לקטגוריה","badge_colors":"צבעי העיטורים","background_color":"צבע רקע","foreground_color":"צבע קדמי","name_placeholder":"מילה או שתיים לכל היותר","color_placeholder":"כל צבע אינטרנטי","delete_confirm":"האם שברצונך להסיר את הקטגוריה הזו?","delete_error":"ארעה שגיאה במחיקת הקטגוריה.","list":"הצג קטגוריות","no_description":"אנא הוסיפו תיאור לקטגוריה זו.","change_in_category_topic":"עריכת תיאור","already_used":"הצבע הזה בשימוש על ידי קטגוריה אחרת","security":"אבטחה","security_add_group":"הוספת קבוצה","permissions":{"group":"קבוצה","see":"לראות","reply":"להגיב","create":"ליצור","no_groups_selected":"אף קבוצה לא קיבלה גישה; קטגוריה זו תהיה גלויה רק לסגל.","everyone_has_access":"קטגוריה זו היא ציבורית, כולם יכולים לצפות, להגיב וליצור פוסטים. די להגביל את ההרשאות, יש להסיר הרשאה אחת או יותר מאלו שהוענקו לקבוצה „כולם”.","toggle_reply":"החלפת הרשאות תגובה","toggle_full":"החלפת הרשאות יצירה","inherited":"הרשאה זו התקבלה בירושה מתוך „כולם”"},"special_warning":"אזהרה: קטגוריה זו הגיעה מראש והגדרות האבטחה שלה אינן ניתנות לשינוי. אם אתם מעוניינים להשתמש בקטגוריה זו, מחקו אותה במקום להשתמש בה מחדש.","uncategorized_security_warning":"קטגוריה זו היא מיוחדת. היא מיועדת להחזקת מגוון של נושאים שאין להם קטגוריה, לא יכולות להיות לקבוצה זו הגדרות אבטחה.","uncategorized_general_warning":"קטגוריה זו היא מיוחדת. היא משמשת כקטגוריית בררת המחדל לנושאים חדשים שלא נבחרה עבורם קטגוריה. אם ברצונך למנוע את ההתנהגות הזאת ולאלץ בחירת קטגוריה, \u003ca href=\"%{settingLink}\"\u003eנא לנטרל את ההגדרה הזאת כאן\u003c/a\u003e. אם מעניין אותך לשנות את השם או את התיאור, עליך לגשת אל \u003ca href=\"%{customizeLink}\"\u003eהתאמה אישית / תוכן טקסט\u003c/a\u003e.","pending_permission_change_alert":"לא הוספת %{group} לקטגוריה הזאת, יש ללחוץ על הכפתור הזה כדי להוסיף אותן.","images":"תמונות","email_in":"כתובת דואר נכנס מותאמת אישית:","email_in_allow_strangers":"קבלת דוא״ל ממשתמשים אלמוניים ללא חשבונות במערכת הפורומים","email_in_disabled":"האפשרות לשליחת נושאים חדשים בדוא״ל הושבתה בהגדרות האתר. כדי להפעיל פרסום של נושאים חדשים דרך דוא״ל,","email_in_disabled_click":"הפעלת ההגדרה „דוא״ל נכנס”.","mailinglist_mirror":"קטגוריה שמשקפת רשימת תפוצה","show_subcategory_list":"הצגת רשימת קטגוריות משנה מעל נושאים בקטגוריה זו.","read_only_banner":"טקסט כרזה כאשר משתמש לא יכול ליצור נושא בקטגוריה הזו:","num_featured_topics":"מספר הנושאים המוצגים בדף הקטגוריות:","subcategory_num_featured_topics":"מספר הנושאים המומלצים בדף קטגוריית ההורה:","all_topics_wiki":"להפוך נושאים חדשים לעמודי ויקי כבררת מחדל","allow_unlimited_owner_edits_on_first_post":"לבטל את מגבלת העריכות על ידי הבעלים לפוסט הראשון","subcategory_list_style":"סגנון רשימות קטגוריות משנה:","sort_order":"סידור ברירת מחדל לנושאים:","default_view":"תצוגת ברירת מחדל לנושאים:","default_top_period":"פרק זמן דיפולטיבי להובלה","default_list_filter":"מסנן רשימה כבררת מחדל:","allow_badges_label":"לאפשר הענקת עיטורים בקטגוריה זו","edit_permissions":"עריכת הרשאות","reviewable_by_group":"בנוסף לסגל, את התוכן של הקטגוריה הזו יכולים לסקור גם:","review_group_name":"שם הקבוצה","require_topic_approval":"לדרוש אישור מפקח לכל הנושאים החדשים","require_reply_approval":"לדרוש אישור מפקח לכל התגובות החדשות","this_year":"השנה","position":"מיקום בעמוד הקטגוריות:","default_position":"מיקום ברירת מחדל","position_disabled":"קטגוריות יוצגו על פס סדר הפעילות. כדי לשלוט בסדר הקטגורייות ברשימה,","position_disabled_click":"אפשרו את ההגדרה \"סדר קטגוריות קבוע\".","minimum_required_tags":"מספר התגיות המזערי הנדרש לנושא:","default_slow_mode":"להפעיל „מצב אטי” לנושאים חדשים בקטגוריה הזאת.","parent":"קטגורית אם","num_auto_bump_daily":"מספר הנושאים הפתוחים להקפצה מדי יום:","navigate_to_first_post_after_read":"ניווט לפוסט הראשוני לאחר שהנושאים נקראו","notifications":{"title":"שינוי רמת ההתראות לקטגוריה הזו","watching":{"title":"עוקב","description":"כל הנושאים שבקטגוריה הזאת יצטרפו למעקב הצמוד שלך. תישלח אליך התראה על כל פוסט חדש בכל נושא ויופיע מספור של התגובות החדשות."},"watching_first_post":{"title":"צפייה בפוסט הראשון","description":"תופענה אצלך התראות על נושאים חדשים בקטגוריה הזו אך לא על תגובות על הנושאים."},"tracking":{"title":"במעקב","description":"כל הנושאים שבקטגוריה הזאת יצטרפו לרשימת המעקב שלך. תישלח אליך התראה עם כל אזכור של @שמך או תגובות על דברים שכתבת וגם יופיע מספור של התגובות החדשות."},"regular":{"title":"נורמלי","description":"תישלח אליך התראה אם מישהו יזכיר את @שם_המשתמש שלך או ישיב לך."},"muted":{"title":"מושתק","description":"לא תישלחנה אליך התראות על נושאים חדשים בקטגוריה הזאת והם לא יופיעו בעמוד האחרונים שלך."}},"search_priority":{"label":"עדיפות חיפוש","options":{"normal":"רגיל","ignore":"התעלמות","very_low":"נמוכה מאוד","low":"נמוכה","high":"גבוהה","very_high":"גבוהה מאוד"}},"sort_options":{"default":"ברירת מחדל","likes":"לייקים","op_likes":"לייקים של הפוסט המקורי","views":"מבטים","posts":"פוסטים","activity":"פעילות","posters":"מפרסמים","category":"קטגוריה","created":"נוצרו"},"sort_ascending":"בסדר עולה","sort_descending":"בסדר יורד","subcategory_list_styles":{"rows":"שורות","rows_with_featured_topics":"שורות עם נושאים מומלצים","boxes":"תיבות","boxes_with_featured_topics":"תיבות עם נושאים מומלצים"},"settings_sections":{"general":"כללי","moderation":"פיקוח","appearance":"מראה","email":"דוא״ל"},"list_filters":{"all":"כל הנושאים","none":"אין תת־קטגוריות"},"colors_disabled":"אי אפשר לבחור צבעים כיוון שסגנון הקטגוריה הוא כלום."},"flagging":{"title":"תודה על עזרתך לשמירה על תרבות הקהילה שלנו!","action":"דגלו פוסט","take_action":"נקיטת פעולה…","take_action_options":{"default":{"title":"נקיטת פעולה","details":"להגיע באופן מיידי למספר הדגלים הדרוש, במקום להמתין לדגלים נוספים מן הקהילה"},"suspend":{"title":"השעיית משתמש","details":"להגיע למספר הדגלים הדרוש ולהשעות את המשתמש"},"silence":{"title":"השתקת משתמש","details":"להגיע למספר הדגלים הדרוש להשתיק את המשתמש"}},"notify_action":"הודעה","official_warning":"אזהרה רשמית","delete_spammer":"מחק ספאמר","flag_for_review":"תור לסקירה","yes_delete_spammer":"כן, מחק ספאמר","ip_address_missing":"(N/A)","hidden_email_address":"(מוסתר)","submit_tooltip":"שלחו את הדגל הפרטי","take_action_tooltip":"הגעה באופן מיידי למספר הדגלים האפשרי, במקום להמתין לדגלים נוספים מן הקהילה","cant":"סליחה, לא ניתן לדגל פוסט זה כרגע.","notify_staff":"להודיע לסגל באופן פרטי","formatted_name":{"off_topic":"אוף-טופיק","inappropriate":"לא ראוי","spam":"זהו ספאם"},"custom_placeholder_notify_user":"היו ממוקדים, חיובים ותמיד אדיבים.","custom_placeholder_notify_moderators":"נשמח לשמוע בדיוק מה מטריד אותך ולספק קישורים מתאימים ודוגמאות היכן שניתן.","custom_message":{"at_least":{"one":"הכניסו לפחות תו אחד","two":"הכניסו לפחות %{count} תווים","many":"הכניסו לפחות %{count} תווים","other":"הכניסו לפחות %{count} תווים"},"more":{"one":"נשאר אחד","two":"%{count} נשארו...","many":"%{count} נשארו...","other":"%{count} נשארו..."},"left":{"one":"נותר אחד","two":"%{count} נותרו","many":"%{count} נותרו","other":"%{count} נותרו"}}},"flagging_topic":{"title":"תודה על עזרתך לשמירה על תרבות הקהילה שלנו!","action":"דגלו נושא","notify_action":"הודעה"},"topic_map":{"title":"סיכום נושא","participants_title":"מפרסמים מתמידים","links_title":"לינקים פופלארים","links_shown":"הצגת קישורים נוספים...","clicks":{"one":"לחיצה אחת","two":"%{count} לחיצות","many":"%{count} לחיצות","other":"%{count} לחיצות"}},"post_links":{"about":"הרחיבו לינקים נוספים לפוסט זה","title":{"one":"עוד %{count}","two":"עוד %{count}","many":"עוד %{count}","other":"עוד %{count}"}},"topic_statuses":{"warning":{"help":"זוהי אזהרה רשמית."},"bookmarked":{"help":"יצרתם סימניה לנושא זה"},"locked":{"help":"הנושא הזה סגור, הוא לא מקבל יותר תגובות חדשות"},"archived":{"help":"הנושא הזה אוכסן בארכיון; הוא הוקפא ולא ניתן לשנותו"},"locked_and_archived":{"help":"הנושא הזה סגור ומאורכב. לא ניתן להגיב בו יותר או לשנות אותו. "},"unpinned":{"title":"הורד מנעיצה","help":"נושא זה אינו מקובע עבורכם; הוא יופיע בסדר הרגיל"},"pinned_globally":{"title":"נעוץ גלובאלית","help":"הנושא הזה נעוץ בכל האתר; הוא יוצג בראש הקטגוריה שלו כחדש ביותר"},"pinned":{"title":"נעוץ","help":"נושא זה ננעץ עבורכם, הוא יופיע בראש הקטגוריה"},"unlisted":{"help":"נושא זה מוסתר; הוא לא יוצג ברשימות הנושאים, וזמין רק באמצעות קישור ישיר."},"personal_message":{"title":"הנושא הזה הוא הודעה אישית","help":"הנושא הזה הוא הודעה אישית"}},"posts":"פוסטים","original_post":"פוסט מקורי","views":"צפיות","views_lowercase":{"one":"צפיה","two":"צפיות","many":"צפיות","other":"צפיות"},"replies":"תגובות","views_long":{"one":"נושא זה נצפה פעם %{count}","two":"נושא זה נצפה %{number} פעמים","many":"נושא זה נצפה %{number} פעמים","other":"נושא זה נצפה %{number} פעמים"},"activity":"פעילות","likes":"לייקים","likes_lowercase":{"one":"לייק","two":"לייקים","many":"לייקים","other":"לייקים"},"users":"משתמשים","users_lowercase":{"one":"משתמש","two":"משתמשים","many":"משתמשים","other":"משתמשים"},"category_title":"קטגוריה","history_capped_revisions":"היסטוריה, 100 התיקונים האחרונים","history":"היסטוריה","changed_by":"מאת %{author}","raw_email":{"title":"דוא״ל נכנס","not_available":"לא זמין!"},"categories_list":"רשימת קטגוריות","filters":{"with_topics":"%{filter} נושאים","with_category":"%{filter} %{category} נושאים","latest":{"title":"העדכני ביותר","title_with_count":{"one":"(%{count}) העדכני ביותר","two":"(%{count}) העדכניים ביותר","many":"(%{count}) העדכניים ביותר","other":"(%{count}) העדכניים ביותר"},"help":"נושאים עם תגובות לאחרונה"},"read":{"title":"נקרא","help":"נושאים שקראת, לפי סדר קריאתם"},"categories":{"title":"קטגוריות","title_in":"קטגוריה - %{categoryName}","help":"כל הנושאים תחת הקטגוריה הזו"},"unread":{"title":"לא-נקראו","title_with_count":{"one":"לא נקראה (%{count})","two":"לא-נקראו (%{count})","many":"לא-נקראו (%{count})","other":"לא נקראו (%{count})"},"help":"נושאים שאתם כרגע צופים או עוקבים אחריהם עם פוסטים שלא נקראו","lower_title_with_count":{"one":"לא נקרא (%{count})","two":"לא-נקראו %{count} ","many":"לא-נקראו %{count} ","other":"לא-נקראו %{count} "}},"unseen":{"help":"נושאים חדשים ונושאים שאתם כרגע צופים או עוקבים אחריהם עם פוסטים שלא נקראו"},"new":{"lower_title_with_count":{"one":"חדש (%{count})","two":"%{count} חדשים","many":"%{count} חדשים","other":"%{count} חדשים"},"lower_title":"חדש","title":"חדש","title_with_count":{"one":"חדש (%{count})","two":"חדשים (%{count})","many":"חדשים (%{count})","other":"חדשים (%{count})"},"help":"נושאים שנוצרו בימים האחרונים"},"posted":{"title":"הפוסטים שלי","help":"נושאים בהם פרסמת"},"bookmarks":{"title":"סימניות","help":"נושאים עבורם יצרתם סימניות"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","two":"%{categoryName} (%{count})","many":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"נושאים מדוברים בקטגוריה %{categoryName}"},"top":{"title":"מובילים","help":"הנושאים הפעילים ביותר בשנה, חודש, שבוע או יום האחרונים","all":{"title":"תמיד"},"yearly":{"title":"שנתי"},"quarterly":{"title":"רבעוני"},"monthly":{"title":"חודשי"},"weekly":{"title":"שבועי"},"daily":{"title":"יומי"},"all_time":"כל הזמנים","this_year":"שנה","this_quarter":"רבעוני","this_month":"חודש","this_week":"שבוע","today":"היום","other_periods":"להציג את המובילים:"}},"browser_update":"אתרע מזלך וכי \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eדפדפנך מיושן מכדי להפעיל אתר זה\u003c/a\u003e. נא \u003ca href=\"https://browsehappy.com\"\u003eלשדרג את דפדפנך\u003c/a\u003e כדי לצפות בתוכן עשיר, להיכנס למערכת ולהגיב.","permission_types":{"full":"יצירה / תגובה / צפייה","create_post":"תגובה / צפייה","readonly":"צפה"},"lightbox":{"download":"הורדה","previous":"הקודם (מקש שמאלה)","next":"הבא (מקש ימינה)","counter":"%curr% מתוך %total%","close":"סגירה (Esc)","content_load_error":"אין אפשרות לטעון את ה\u003ca href=\"%url%\"\u003eתוכן הזה\u003c/a\u003e.","image_load_error":"אין אפשרות לטעון את ה\u003ca href=\"%url%\"\u003eתמונה הזו\u003c/a\u003e."},"cannot_render_video":"לא ניתן לעבד את הסרטון הזה מכיוון שהדפדפן שלך אינו תומך במקודד.","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} או %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"קיצורי מקלדת","jump_to":{"title":"קפצו אל","home":"%{shortcut} בית","latest":"%{shortcut} אחרונים","new":"%{shortcut} חדשים","unread":"%{shortcut} לא-נקראו","categories":"%{shortcut} קטגוריות","top":"%{shortcut} מובילים","bookmarks":"%{shortcut} סימניות","profile":"%{shortcut} פרופיל","messages":"%{shortcut} הודעות","drafts":"%{shortcut} טיוטות","next":"%{shortcut} הנושא הבא","previous":"%{shortcut} הנושא הקודם"},"navigation":{"title":"ניווט","jump":"%{shortcut} מעבר לפוסט #","back":"%{shortcut} חזרה","up_down":"%{shortcut} הזיזו בחירה \u0026uarr; \u0026darr;","open":"%{shortcut} פתחו נושא נבחר","next_prev":"%{shortcut} תחום הבא/קודם","go_to_unread_post":"%{shortcut} מעבר לפוסט הראשון שלא נקרא"},"application":{"title":"אפליקציה","create":"%{shortcut} יצירת נושא חדש","notifications":"%{shortcut} פתיחת התראות","hamburger_menu":"%{shortcut} פתיחת תפריט המבורגר","user_profile_menu":"%{shortcut} פתיחת תפריט משתמש","show_incoming_updated_topics":"%{shortcut} הצגת נושאים שהתעדכנו","search":"%{shortcut} חיפוש","help":"%{shortcut} פתיחת קיצורי מקשים","dismiss_topics":"%{shortcut} התעלמות מנושאים","log_out":"%{shortcut} התנתקות"},"composing":{"title":"חיבור","return":"%{shortcut} חזרה לכתיבת פוסט","fullscreen":"%{shortcut} כתיבת פוסט במסך מלא"},"bookmarks":{"title":"ניהול סימניות","enter":"%{shortcut} שמירה וסגירה","later_today":"%{shortcut} בהמשך היום","later_this_week":"%{shortcut} בהמשך השבוע","tomorrow":"%{shortcut} מחר","next_week":"%{shortcut} שבוע הבא","next_month":"%{shortcut} חודש הבא","next_business_week":"%{shortcut} תחילת שבוע הבא","next_business_day":"%{shortcut} יום העסקים הבא","custom":"%{shortcut} בחירת שעה ותאריך","none":"%{shortcut} ללא תזכורת","delete":"%{shortcut} מחיקת סימנייה"},"actions":{"title":"פעולות","bookmark_topic":"%{shortcut} סמנו/בטלו-סימנייה של נושא","pin_unpin_topic":"%{shortcut} נעצו/בטלו נעיצה בנושא","share_topic":"%{shortcut} שיתוף נושא","share_post":"%{shortcut} שיתוף פוסט","reply_as_new_topic":"%{shortcut} מענה כנושא קשור","reply_topic":"%{shortcut} ענו לנושא","reply_post":"%{shortcut} תגובה לפוסט","quote_post":"%{shortcut} ציטוט פוסט","like":"%{shortcut} אהבו פוסט","flag":"%{shortcut} דגלו פוסט","bookmark":"%{shortcut} סימון פוסט","edit":"%{shortcut} עריכת פוסט","delete":"%{shortcut} מחיקת פוסט","mark_muted":"%{shortcut} השתקת נושא","mark_regular":"%{shortcut} נושא רגיל","mark_tracking":"%{shortcut} עקבו אחר נושא","mark_watching":"%{shortcut} צפו בנושא","print":"%{shortcut} הדפסת נושא","defer":"%{shortcut} לדחות נושא לאחר כך","topic_admin_actions":"%{shortcut} פתיחת פעולות ניהול לנושא"},"search_menu":{"title":"תפריט חיפוש","prev_next":"%{shortcut} העברת הבחירה למעלה ולמטה","insert_url":"%{shortcut} הוספת הבחירה לחלון כתיבת ההודעה הפתוח"}},"badges":{"earned_n_times":{"one":"עיטור זה הוענק פעם אחת (%{count})","two":"עיטור זה הוענק %{count} פעמים","many":"עיטור זה הוענק %{count} פעמים","other":"עיטור זה הוענק %{count} פעמים"},"granted_on":"הוענק לפני %{date}","others_count":"אחרים עם עיטור זה (%{count})","title":"עיטורים","allow_title":"ניתן להשתמש בעיטור זה ככותרת","multiple_grant":"ניתן לזכות בו מספר פעמים","badge_count":{"one":"%{count} עיטורים","two":"%{count} עיטורים","many":"%{count} עיטורים","other":"%{count} עיטורים"},"more_badges":{"one":"+%{count} נוסף","two":"+%{count} נוספים","many":"+%{count} נוספים","other":"+%{count} נוספים"},"granted":{"one":"הוענק","two":"%{count} הוענקו","many":"%{count} הוענקו","other":"%{count} הוענקו"},"select_badge_for_title":"נא לבחור עיטור לשימוש בכותרת שלך","none":"(ללא)","successfully_granted":"העיטור %{badge} הוענק בהצלחה למשתמש %{username}","badge_grouping":{"getting_started":{"name":"מתחילים"},"community":{"name":"קהילה"},"trust_level":{"name":"דרגת אמון"},"other":{"name":"אחר"},"posting":{"name":"מפרסמים"}},"favorite_max_reached":"לא ניתן להוסיף עיטורים נוספים למועדפים.","favorite_max_not_reached":"סימון העיטור הזה כמועדף","favorite_count":"%{count}/%{max} עיטורים סומנו כמועדפים"},"download_calendar":{"title":"הורדת לוח שנה","save_ics":"הורדת קובץ ‎.ics","save_google":"הוספה ללוח השנה של Google","remember":"לא לשאול אותי שוב","remember_explanation":"(ניתן לשנות העדפה זו בהעדפות המשתמש שלך)","download":"הורדה","default_calendar":"לוח שנה כבררת מחדל","default_calendar_instruction":"הגדרה באיזה לוח שנה יש להשתמש כשנשמרים תאריכים","add_to_calendar":"הוספה ללוח השנה","google":"לוח שנה של Google","ics":"ICS"},"tagging":{"all_tags":"כל התגיות","other_tags":"תגיות אחרות","selector_all_tags":"כל התגיות","selector_no_tags":"ללא תגיות","changed":"תגיות ששונו:","tags":"תגיות","choose_for_topic":"תגיות רשות","info":"פרטים","default_info":"תגית זו אינה מוגבלת לאף קטגוריה ואין לה תגיות נרדפות. כדי להוסיף הגבלות, יש להציב את התגית הזאת ב\u003ca href=%{basePath}/tag_groups\u003eקבוצת תגיות\u003c/a\u003e.","category_restricted":"תגית זו מוגבלת לקטגוריות שאין לך גישה אליהן.","synonyms":"מילים נרדפות","synonyms_description":"תגיות אלו תוחלפנה בתגית \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"תגית זו שייכת לקבוצה הזאת: %{tag_groups}","two":"תגית זו שייכת לקבוצות האלו: %{tag_groups}","many":"תגית זו שייכת לקבוצות האלו: %{tag_groups}","other":"תגית זו שייכת לקבוצות האלו: %{tag_groups}"},"category_restrictions":{"one":"ניתן להשתמש בה בקטגוריה זו בלבד:","two":"ניתן להשתמש בה בקטגוריות אלו בלבד:","many":"ניתן להשתמש בה בקטגוריות אלו בלבד:","other":"ניתן להשתמש בה בקטגוריות אלו בלבד:"},"edit_synonyms":"ניהול מילים נרדפות","add_synonyms_label":"הוספת מילים נרדפות:","add_synonyms":"הוספה","add_synonyms_explanation":{"one":"כל מקום שמשתמש כרגע בתגית זו יעבור להשתמש ב־\u003cb\u003e%{tag_name}\u003c/b\u003e במקום. להמשיך בשינוי הזה?","two":"כל מקום שמשתמש כרגע בתגיות אלו יעבור להשתמש ב־\u003cb\u003e%{tag_name}\u003c/b\u003e במקום. להמשיך בשינוי הזה?","many":"כל מקום שמשתמש כרגע בתגיות אלו יעבור להשתמש ב־\u003cb\u003e%{tag_name}\u003c/b\u003e במקום. להמשיך בשינוי הזה?","other":"כל מקום שמשתמש כרגע בתגיות אלו יעבור להשתמש ב־\u003cb\u003e%{tag_name}\u003c/b\u003e במקום. להמשיך בשינוי הזה?"},"add_synonyms_failed":"לא ניתן להוסיף את התגיות הבאות בתור מילים נרדפות: \u003cb\u003e%{tag_names}\u003c/b\u003e. נא לוודא שאין להן מילים נרדפות ושאינן כבר מילים נרדפות של תגית אחרת.","remove_synonym":"הסרת מילה נרדפת","delete_synonym_confirm":"למחוק את המילה הנרדפת „%{tag_name}”?","delete_tag":"מחיקת תגית","delete_confirm":{"one":"למחוק את התגית הזו ולהסיר אותה מהנושא אליו היא מוקצית?","two":"למחוק את התגית הזו ולהסיר אותה משני הנושאים אליהן היא מוקצית?","many":"למחוק את התגית הזו ולהסיר אותה מכל %{count} הנושאים אליהן היא מוקצית?","other":"למחוק את התגית הזו ולהסיר אותה מכל %{count} הנושאים אליהן היא מוקצית?"},"delete_confirm_no_topics":"למחוק את התגית הזו?","delete_confirm_synonyms":{"one":"המילה הנרדפת שקשורה אליה תימחקנה גם כן.","two":"%{count} המילים הנרדפות שקשורות אליה תימחקנה גם כן.","many":"%{count} המילים הנרדפות שקשורות אליה תימחקנה גם כן.","other":"%{count} המילים הנרדפות שקשורות אליה תימחקנה גם כן."},"rename_tag":"שינוי שם לתגית","rename_instructions":"בחרו שם חדש לתגית:","sort_by":"סידור לפי:","sort_by_count":"ספירה","sort_by_name":"שם","manage_groups":"ניהול קבוצות תגיות","manage_groups_description":"הגדרת קבוצות לארגון תגיות","upload":"העלאת תגיות","upload_description":"ניתן להעלות קובץ csv כדי ליצור כמות גדולה של תגיות בבת אחת","upload_instructions":"אחת בשורה, אפשר עם קבוצת תגיות בתצורה ‚שם_תגית,קבוצת_תגיות’.","upload_successful":"התגיות הועלו בהצלחה","delete_unused_confirmation":{"one":"תגית אחת תימחק: %{tags}","two":"%{count} תגיות תימחקנה: %{tags}","many":"%{count} תגיות תימחקנה: %{tags}","other":"%{count} תגיות תימחקנה: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} ואחת נוספת ","two":"%{tags} ו־%{count} נוספות","many":"%{tags} ו־%{count} נוספות","other":"%{tags} ו־%{count} נוספות"},"delete_no_unused_tags":"אין תגיות שאינן בשימוש.","tag_list_joiner":", ","delete_unused":"מחיקת תגיות שאינן בשימוש","delete_unused_description":"למחוק את כל התגיות שאינן מקושרות לנושאים או להודעות פרטיות כלל","cancel_delete_unused":"ביטול","filters":{"without_category":"%{filter} %{tag} נושאים","with_category":"%{filter} %{tag} נושאים ב%{category}","untagged_without_category":"%{filter} נושאים לא מתוייגים","untagged_with_category":"%{filter} נושאים ללא תגיות ב %{category}"},"notifications":{"watching":{"title":"צופים","description":"כל הנושאים עם התגית הזו אוטומטית יתווספו למעקב שלך. אצלך תופענה התרעות של כל הפוסטים והנושאים החדשים, לרבות תוכן של פוסטים חדשים וכאלו שלא נקראו גם כן יופיעו ליד הנושא."},"watching_first_post":{"title":"צפייה בפוסט הראשון","description":"תופענה אצלך התראות על נושאים חדשים בתגית זו אך לא על תגובות לנושאים."},"tracking":{"title":"במעקב","description":"יתווספו למעקב שלך אוטומטית כל הנושאים עם התגית הזאת. הספירה של הפריטים שלא נקראו ושל הפוסטים החדשים תופיע ליד הנושא."},"regular":{"title":"רגיל","description":"תישלח אליך התראה אם @שמך מוזכר או שמתקבלת תגובה לפוסט שלך."},"muted":{"title":"בהשתקה","description":"לא תופענה אצלך אף התראות בנוגע לנושאים חדשים עם התגית הזאת והן לא תופענה בלשונית הפריטים שלא נקראו."}},"groups":{"title":"תיוג קבוצות","about_heading":"נא לבחור קבוצת תגיות או ליצור אחת חדשה","about_heading_empty":"יש ליצור קבוצת תגיות חדשה כדי להתחיל","about_description":"קבוצות תגיות מסייעות לך לנהל הרשאות למגוון תגיות במקום אחד.","new":"קבוצה חדשה","new_title":"יצירת קבוצה חדשה","edit_title":"עריכת קבוצת תגיות","tags_label":"תגיות בקבוצה זו","parent_tag_label":"תגית הורה","parent_tag_description":"ניתן להשתמש בתגיות מקבוצה זו רק אם תגית ההורה נמצאת.","one_per_topic_label":"הגבלה של תג אחד לכל נושא מקבוצה זו","new_name":"קבוצת תגיות חדשה","name_placeholder":"שם","save":"שמירה","delete":"מחיקה","confirm_delete":"להסיר את קבוצת התגיות הזו?","everyone_can_use":"ניתן להשתמש בתגיות בכל מקום","usable_only_by_groups":"התגיות גלויות לכולם אך רק הקבוצות הבאות יכולות להשתמש בהן","visible_only_to_groups":"התגיות גלויות לקבוצות הבאות בלבד","cannot_save":"לא ניתן לשמור את קבוצת התגיות. נא לוודא שיש לפחות תגית אחד, ששם קבוצת התגיות אינו ריק ושנבחרה קבוצה לצורך הרשאת תגיות.","tags_placeholder":"חיפוש או יצירת תגיות","parent_tag_placeholder":"רשות","select_groups_placeholder":"בחירת קבוצות…","disabled":"תיוג מושבת. "},"topics":{"none":{"unread":"אין לך נושאים שלא נקראו.","unseen":"אין לך נושאים שלא ראית.","new":"אין לך נושאים חדשים.","read":"טרם קראת נושאים.","posted":"עדיין לא פרסמתם באף נושא.","latest":"אין נושאים אחרונים.","bookmarks":"עדיין אין לך נושאים מסומנים.","top":"אין נושאים מובילים."}}},"invite":{"custom_message":"ניתן להעניק להזמנה שלך מגע אישי יותר על ידי כתיבת \u003ca href\u003eהודעה אישית\u003c/a\u003e.","custom_message_placeholder":"הכניסו את הודעתכם האישית","approval_not_required":"המשתמש יאושר אוטומטית עם קבלת ההזמנה הזאת.","custom_message_template_forum":"היי, זה פורום מומלץ, כדאי להצטרף אליו!","custom_message_template_topic":"היי, חשבתי שהנושא הזה יעניין אותך!"},"forced_anonymous":"עקב עומס חריג, הודעה זו מוצגת באופן זמני לכולם כפי שתופיע בפני משתמשים שלא נכנסו למערכת.","forced_anonymous_login_required":"האתר חווה עומס קיצוני ולא ניתן לפנות אליו, נא לנסות שוב בעוד מספר דקות.","footer_nav":{"back":"חזרה","forward":"העברה","share":"לשתף","dismiss":"דחייה"},"safe_mode":{"enabled":"מצב בטוח מאופשר, כדי לצאת ממנו סיגרו את חלון הדפדפן הזה"},"image_removed":"(התמונה הוסרה)","do_not_disturb":{"title":"לא להפריע למשך…","label":"לא להפריע","remaining":"%{remaining} נותרו","options":{"half_hour":"חצי שעה","one_hour":"שעה","two_hours":"שעתיים","tomorrow":"עד מחר","custom":"מותאם"},"set_schedule":"הגדרת תזמון התראות"},"trust_levels":{"names":{"newuser":"משתמש חדש","basic":"משתמש בסיסי","member":"חבר","regular":"רגיל","leader":"מוביל"},"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"בחרת קובץ שאינו נתמך. סוגי קבצים נתמכים - %{types}."},"user_activity":{"no_activity_title":"אין פעילות עדיין","no_activity_others":"אין פעילות.","no_replies_title":"עדיין לא הגבת לאף נושא","no_replies_others":"אין תגובות.","no_drafts_title":"לא התחלת טיוטות","no_drafts_body":"לא סיימת לכתוב את הפוסט? אנו נשמור טיוטה חדשה אוטומטית ונציג אותה כאן עם כל כתיבה של נושא, תגובה או הודעה פרטית חדשים. יש לבחור בכפתור הביטול כדי להתעלם או לשמור את הטיוטה שלך ולהמשיך אחר כך.","no_likes_title":"עדיין לא סימנת אף נושא בלייק","no_likes_others":"אין פוסטים שנעשה להם לייק.","no_topics_title":"עדיין לא פתחת אף נושא","no_read_topics_title":"טרם קראת נושאים"},"no_group_messages_title":"לא נמצאו הודעות קבוצתיות","fullscreen_table":{"expand_btn":"הרחבת טבלה"},"admin":{"site_settings":{"categories":{"chat_integration":"שילובי צ׳אט"}}},"chat_integration":{"menu_title":"שילובי צ׳אט","settings":"הגדרות","no_providers":"עליך לאפשר מספר ספקים בהגדרות התוסף","channels_with_errors":"בפעם האחרונה שנשלחו מסרים כמה ערוצים נכשלו עבור הספר הזה. לחץ על סמליל(י) השגיאה כדי לקבל עוד מידע","channel_exception":"אירעה שגיאה בלתי מזוהה בפעם האחרונה שנשלחה הודעה בערוץ זה.","group_mention_template":"אזכורים של: ‎@%{name}‎","group_message_template":"הודעות אל: ‎@%{name}‎","choose_group":"(נא לבחור קבוצה)","all_categories":"(כל הקטגוריות)","all_tags":"(כל התגיות)","create_rule":"יצירת כלל","create_channel":"יצירת ערוץ","delete_channel":"הסרה","test_channel":"נסיון","edit_channel":"עריכה","channel_delete_confirm":"למחוק את הערוץ הזה? כל הכללים המקושרים אליו ימחקו.","test_modal":{"title":"שליחת הודעת ניסיון","topic":"נושא","send":"שליחת הודעת ניסיון","close":"סגירה","error":"שגיאה לא מזוהה התרחשה בעת שליחת ההודעה. יש לבדוק את הלוגים של האתר עבור מידע נוסף.","success":"ההודעה נשלחה בהצלחה"},"type":{"normal":"רגיל","group_message":"הודעה קבוצתית","group_mention":"איזכור קבוצה"},"filter":{"mute":"השתק","follow":"הודעה ראשונה בלבד","watch":"כל הפוסטים והתגובות","thread":"כל הפוסטים עם תגובות בשרשרת"},"rule_table":{"filter":"סינון","category":"קטגוריה","tags":"תגיות","edit_rule":"עריכה","delete_rule":"הסרה"},"edit_channel_modal":{"title":"עריכת ערוץ","save":"שמירת ערוץ","cancel":"ביטול","provider":"ספק","channel_validation":{"ok":"מאומת","fail":"פורמט לא חוקי"}},"edit_rule_modal":{"title":"שינוי כלל","save":"שמירת כלל","cancel":"ביטול","provider":"ספק","type":"סוג","channel":"ערוץ","filter":"סינון","category":"קטגוריה","group":"קבוצה","tags":"תגיות","instructions":{"type":"יש לשנות את הסוג כדי להפעיל התראות עבור הודעות קבוצתיות או איזכורים","filter":"רמת התראה. השתקה דורסת כללים תואמים נוספים","category":"כלל זה יחול על נושאים בקטגוריה המצוינת","group":"כלל זה חל על פוסטים שמפנים לקבוצה זו","tags":"אם צוין, כלל זה יחול רק כל נושאים שיש להם לפחות אחת מהתגיות האלה."}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"ערוץ","help":"למשל #ערוץ, @שם_משתמש."}},"errors":{"action_prohibited":"לבוט אין הרשה לפרסם לערוץ הזה","channel_not_found":"הערוץ שצוין לא קיים ב־Slack"}},"telegram":{"title":"טלגרם","param":{"name":{"title":"שם","help":"שם לתיאור הערוץ. לא בשימוש בחיבור לטלגרם."},"chat_id":{"title":"מזהה שיחה","help":"מספר שהעניק לך הבוט או מזהה פרסום ערוצים בתצורה @שם_ערוץ"}},"errors":{"channel_not_found":"הערוץ שצוין לא קיים בטלגרם","forbidden":"לבוט אין הרשאה לפרסם לערוץ הזה"}},"discord":{"title":"Discord","param":{"name":{"title":"שם","help":"שם לתיאור הערוץ. הוא לא משמש לחיבור אל Discord."},"webhook_url":{"title":"כתובת התלייה","help":"כתובת ההתלייה נוצרה בהגדרות שרת ה־Discord שלך"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"ערוץ","help":"למשל #ערוץ, @שם_משתמש."}},"errors":{"channel_not_found":"הערוץ שצוין לא קיים ב־Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"title":"שם","help":"שם לתיאור הערוץ. הוא לא משמש לחיבור אל Matrix."},"room_id":{"title":"מזהה חדר","help":"ה‚מזהה הפרטי’ של החדר. הוא אמור להיראות בערך ככה: ‎!abcdefg:matrix.org"}},"errors":{"unknown_token":"אסימון הגישה שגוי","unknown_room":"מזהה החדר שגוי"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"תזרים","help":"שם תזרים ה־Zulip שאליו אמורה להישלח ההודעה, למשל: ‚general’"},"subject":{"title":"נושא","help":"הנושא שיינתן להודעות אלו שנשלחות על ידי הבוט"}},"errors":{"does_not_exist":"תזרים זה לא קיים ב־Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"ערוץ","help":"למשל #ערוץ, @שם_משתמש."}},"errors":{"invalid_channel":"ערוץ זה לא קיים ב־‏Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"title":"שם","help":"שם חדר ב־Gitter למשל gitterHQ/services."},"webhook_url":{"title":"כתובת התלייה","help":"הכתובת שסופקה בעת יצירת שילוב בחדר Gitter."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"אסימון Flow","help":"אסימון ה־flow לאחר יצירת המשאב ל־flow אליו ברצונך לשלוח הודעות."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"שם עותק ה־GroupMe","help":"שם עותק ה־Groupme כפי שמופיע בהגדרות האתר. יש להשתמש ב־‚all’ (הכול) כדי לשלוח לכל העותקים"}},"errors":{"not_found":"הנתיב אליו ניסית לפרסם את ההודעה שלך לא נמצא. נא לבדוק את מזהה הבוט בהגדרות האתר.","instance_names_issue":"שם העותק אינו בתצורה הנכונה או שלא סופק"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"שם","help":"שם ערוץ ב־Teams, למשל: discourse"},"webhook_url":{"title":"כתובת התלייה","help":"הכתובת שתסופק ביצירת התליית רשת נכנסת"}},"errors":{"invalid_channel":"ערוץ זה לא קיים ב־Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"שם","help":"שם מתחם ב־WebEx, למשל: discourse"},"webhook_url":{"title":"כתובת התלייה","help":"הכתובת שתסופק ביצירת התליית רשת נכנסת"}},"errors":{"invalid_channel":"ערוץ זה לא קיים ב־WebEx"}},"google":{"title":"Google Chat","param":{"name":{"title":"שם","help":"שם לערוץ (מופיע רק במנשק הניהול של Discourse)"},"webhook_url":{"title":"כתובת התלייה","help":"הכתובת שתסופק ביצירת התליית רשת חדשה"}}}}},"details":{"title":"הסתרת פרטים"},"discourse_local_dates":{"relative_dates":{"today":"היום ב־%{time}","tomorrow":"מחר ב־%{time}","yesterday":"אתמול ב־%{time}","countdown":{"passed":"התאריך חלף"}},"title":"הוספת תאריך / שעה","create":{"form":{"insert":"כתיבה","advanced_mode":"מצב מורחב","simple_mode":"מצב פשוט","format_description":"תבנית המשמשת להצגת התאריך למשתמש. Z משמש להצגת ההפרש ו־zz לשם אזור הזמן.","timezones_title":"אזורי זמן","timezones_description":"באזורי זמן נעשה שימוש לטובת הצגת תאריך בתצוגה מקדימה וכבררת מחדל.","recurring_title":"חזרה","recurring_description":"הגדרת תדירות חזרת האירוע. ניתן גם לערוך ידנית את אפשרות החזרה שנוצרה על ידי הטופס ולהשתמש במפתחות הבאים: years,‏ quarters,‏ months,‏ weeks,‏ days,‏ hours,‏ minutes,‏ seconds,‏ milliseconds.","recurring_none":"ללא חזרה","invalid_date":"תאריך שגוי, נא לוודא שהתאריך והשעה נכונים","date_title":"תאריך","time_title":"זמן","format_title":"מבנה תאריך","timezone":"אזור זמן","until":"עד…","recurring":{"every_day":"כל יום","every_week":"כל שבוע","every_two_weeks":"כל שבועיים","every_month":"כל חודש","every_two_months":"כל חודשיים","every_three_months":"כל שלושה חודשים","every_six_months":"כל חצי שנה","every_year":"כל שנה"}}},"default_title":"אירוע %{site_name}"},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"התחילו את המדריך למתחילים לכל המשתמשים החדשים","welcome_message":"לשלוח לכל המשתמשים החדשים הודעה עם מדריך להתחלה מהירה"}},"presence":{"replying":{"one":"תגובה מוקלדת","two":"תגובות מוקלדות","many":"תגובות מוקלדות","other":"תגובות מוקלדות"},"editing":{"one":"מתבצעת עריכה","two":"מתבצעות עריכות","many":"מתבצעות עריכות","other":"מתבצעות עריכות"},"replying_to_topic":{"one":"תגובה מוקלדת","two":"תגובות מוקלדות","many":"תגובה מוקלדת","other":"תגובות מוקלדות"}},"whos_online":{"title":"מקוונים (%{count}):","tooltip":"משתמשים שנראו ב־5 הדקות האחרונות","no_users":"אין משתמשים מקוונים כרגע"},"poll":{"voters":{"one":"מצביע","two":"מצביעים","many":"מצביעים","other":"מצביעים"},"total_votes":{"one":"מספר הצבעות כולל","two":"מספר הצבעות כולל","many":"מספר הצבעות כולל","other":"מספר הצבעות"},"average_rating":"דירוג ממוצע: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"ההצבעות הן \u003cstrong\u003eציבוריות\u003c/strong\u003e."},"results":{"groups":{"title":"עליך להיות חבר בקבוצה %{groups} כדי להצביע לסקר הזה."},"vote":{"title":"התוצאות יופיעו לאחר \u003cstrong\u003eההצבעה\u003c/strong\u003e."},"closed":{"title":"התוצאות יופיעו לאחר \u003cstrong\u003eהסגירה\u003c/strong\u003e."},"staff":{"title":"התוצאות זמינות לחברי \u003cstrong\u003eסגל\u003c/strong\u003e בלבד."}},"multiple":{"help":{"at_least_min_options":{"one":"יש לבחור באפשרות \u003cstrong\u003e%{count}\u003c/strong\u003e לפחות.","two":"יש לבחור \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות לפחות.","many":"יש לבחור \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות לפחות.","other":"יש לבחור \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות לפחות."},"up_to_max_options":{"one":"יש לבחור אפשרות \u003cstrong\u003e%{count}\u003c/strong\u003e לכל היותר.","two":"יש לבחור עד \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות.","many":"יש לבחור עד \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות.","other":"יש לבחור עד \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות."},"x_options":{"one":"יש לבחור באפשרות \u003cstrong\u003e%{count}\u003c/strong\u003e.","two":"יש לבחור \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות.","many":"יש לבחור \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות.","other":"יש לבחור \u003cstrong\u003e%{count}\u003c/strong\u003e אפשרויות."},"between_min_and_max_options":"נא לבחור בין \u003cstrong\u003e%{min}\u003c/strong\u003e ל־\u003cstrong\u003e%{max}\u003c/strong\u003e אפשרויות."}},"cast-votes":{"title":"להצביע","label":"להצביע עכשיו!"},"show-results":{"title":"הצגת תוצאות הסקר","label":"הצגת תוצאות"},"remove-vote":{"title":"הסרת הצבעתך","label":"הסרת הצבעה"},"hide-results":{"title":"חזרה להצבעות שלך","label":"הצגת הצבעה"},"group-results":{"title":"קיבוץ הצבעות לפי משתמש","label":"הצגת פילוח"},"export-results":{"title":"ייצוא תוצאות הסקר","label":"ייצוא"},"open":{"title":"פתיחת הסקר","label":"פתיחה","confirm":"לפתוח את הסקר הזה?"},"close":{"title":"סגירת הסקר","label":"סגירה","confirm":"לסגור סקר זה?"},"automatic_close":{"closes_in":"נסגר בעוד \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"נסגר ב־\u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"תוצאות הסקר","votes":"%{count} הצבעות","breakdown":"פילוח","percentage":"אחוזים","count":"ספירה"},"error_while_toggling_status":" חלה שגיאה בשינוי המצב של סקר זה, עמך הסליחה.","error_while_casting_votes":"חלה שגיאה בהצבעתך, עמך הסליחה.","error_while_fetching_voters":"חלה שגיאה בהצגת המצביעים, עמך הסליחה.","error_while_exporting_results":"אירעה שגיאה בייצוא תוצאות הסקר.","ui_builder":{"title":"בניית סקר","insert":"הכנסת סקר","help":{"options_min_count":"יש למלא אפשרות אחת לפחות.","options_max_count":"יש למלא עד %{count} אפשרויות.","invalid_min_value":"הערך המזערי חייב להיות 1 לפחות.","invalid_max_value":"הערך המרבי חייב להיות 1 לפחות אך פחות מאשר או שווה למספר האפשרויות.","invalid_values":"הערך המזערי חייב להיות קטן מהערך המרבי.","min_step_value":"ערך הצעד המזערי הוא 1"},"poll_type":{"label":"סוג","regular":"בחירה בודדת","multiple":"בחירה מרובה","number":"ציון מספרי"},"poll_result":{"label":"להציג תוצאות...","always":"גלוי תמיד","vote":"רק לאחר הצבעה","closed":"כשהסקר סגור","staff":"סגל בלבד"},"poll_groups":{"label":"להגביל את ההצבעה לקבוצות אלה"},"poll_chart_type":{"label":"תרשים תוצאות","bar":"עמודות","pie":"עוגה"},"poll_config":{"max":"כמות האפשרויות המרבית","min":"כמות האפשרויות המזערית","step":"צעד"},"poll_public":{"label":"להציג מי המצביעים"},"poll_title":{"label":"כותרת (רשות)"},"poll_options":{"label":"אפשרויות (אחת בכל שורה)","add":"הוספת אפשרות"},"automatic_close":{"label":"לסגור את הסקר אוטומטית"},"show_advanced":"הצגת אפשרויות מתקדמות","hide_advanced":"הסתרת אפשרויות מתקדמות"}},"styleguide":{"title":"מדריך סגנון","welcome":"כדי להתחיל, יש לבחור בסעיף מהתפריט שמימין.","categories":{"atoms":"אטומים","molecules":"מולקולות","organisms":"אורגניזמים"},"sections":{"typography":{"title":"טיפוגרפיה","example":"ברוך בואך ל־Discourse","paragraph":"לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית קולורס מונפרד אדנדום סילקוף, מרגשי ומרגשח. עמחליף לפרומי בלוף קינץ תתיח לרעח. לת צשחמי צש בליא, מנסוטו צמלח לביקו ננבי, צמוקו בלוקריה שיצמה ברורק. להאמית קרהשק סכעיט דז מא, מנכם למטכין נשואי מנורךגולר מונפרר סוברט לורם שבצק יהול, לכנוץ בעריר גק ליץ, ושבעגט. ושבעגט לבם סולגק. בראיט ולחת צורק מונחף, בגורמי מגמש. תרבנך וסתעד לכנו סתשם השמה - לתכי מורגם בורק? לתיג ישבעס."},"date_time_inputs":{"title":"קלטי תאריך/שעה"},"font_scale":{"title":"מערכת גופנים"},"colors":{"title":"צבעים"},"icons":{"title":"סמלים","full_list":"הצגת רשימת הסמלים המלאה של Font Awesome"},"input_fields":{"title":"שדות קלט"},"buttons":{"title":"כפתורים"},"dropdowns":{"title":"נגללים"},"categories":{"title":"קטגוריות"},"bread_crumbs":{"title":"מחווני ניווט"},"navigation":{"title":"ניווט"},"navigation_bar":{"title":"סרגל ניווט"},"navigation_stacked":{"title":"ניווט מוערם"},"categories_list":{"title":"רשימת קטגוריות"},"topic_link":{"title":"קישור נושא"},"topic_list_item":{"title":"פריט ברשימת נושאים"},"topic_statuses":{"title":"מצבי נושא"},"topic_list":{"title":"רשימת נושאים"},"basic_topic_list":{"title":"רשימת נושאים בסיסית"},"footer_message":{"title":"הודעת כותרת תחתונה"},"signup_cta":{"title":"קריאה להרשמה"},"topic_timer_info":{"title":"שעוני עצר לנושא"},"topic_footer_buttons":{"title":"כפתורי כותרת תחתונה של נושא"},"topic_notifications":{"title":"התראות על נושאים"},"post":{"title":"פוסט"},"topic_map":{"title":"מפת נושאים"},"site_header":{"title":"כותרת האתר"},"suggested_topics":{"title":"נושאים מוצעים"},"post_menu":{"title":"תפריט פוסט"},"modal":{"title":"מודאלי","header":"כותרת מודאלי","footer":"כותרת תחתונה של מודאלי"},"user_about":{"title":"תיבת על אודות משתמש"},"header_icons":{"title":"סמלי כותרת עליונה"},"spinners":{"title":"שבשבות"}}}}},"en":{"js":{"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"no_notifications_body":"You will be notified in this panel about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","messages":{},"invited":{"bulk_invite":{"instructions":"\u003cp\u003eInvite a list of users to get your community going quickly. Prepare a \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV file\u003c/a\u003e containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEvery email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.\u003c/p\u003e\n"}},"flair":{"title":"Flair"}},"topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread","other":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…","other":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})","other":"Dismiss New (%{count})"}}},"topic":{},"filters":{"unseen":{"title":"Unseen","lower_title":"unseen"}},"keyboard_shortcuts_help":{"application":{"dismiss_new":"%{shortcut} Dismiss New"}},"user_activity":{"no_activity_body":"Welcome to our community! You are brand new here and have not yet contributed to discussions. As a first step, visit \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e and just start reading! Select %{heartIcon} on posts that you like or want to learn more about. If you have not already done so, help others get to know you by adding a picture and bio in your \u003ca href='%{preferencesUrl}'\u003euser preferences\u003c/a\u003e.","no_likes_body":"A great way to jump in and start contributing is to start reading conversations that have already taken place, and select the %{heartIcon} on posts that you like!","no_read_topics_body":"Once you start reading discussions, you’ll see a list here. To start reading, look for topics that interest you in \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e or search by keyword %{searchIcon}"}}}};
I18n.locale = 'he';
I18n.pluralizationRules.he = MessageFormat.locale.he;
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
//! locale : Hebrew [he]
//! author : Tomer Cohen : https://github.com/tomer
//! author : Moshe Simantov : https://github.com/DevelopmentIL
//! author : Tal Ater : https://github.com/TalAter

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var he = moment.defineLocale('he', {
        months: 'ינואר_פברואר_מרץ_אפריל_מאי_יוני_יולי_אוגוסט_ספטמבר_אוקטובר_נובמבר_דצמבר'.split(
            '_'
        ),
        monthsShort: 'ינו׳_פבר׳_מרץ_אפר׳_מאי_יוני_יולי_אוג׳_ספט׳_אוק׳_נוב׳_דצמ׳'.split(
            '_'
        ),
        weekdays: 'ראשון_שני_שלישי_רביעי_חמישי_שישי_שבת'.split('_'),
        weekdaysShort: 'א׳_ב׳_ג׳_ד׳_ה׳_ו׳_ש׳'.split('_'),
        weekdaysMin: 'א_ב_ג_ד_ה_ו_ש'.split('_'),
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD/MM/YYYY',
            LL: 'D [ב]MMMM YYYY',
            LLL: 'D [ב]MMMM YYYY HH:mm',
            LLLL: 'dddd, D [ב]MMMM YYYY HH:mm',
            l: 'D/M/YYYY',
            ll: 'D MMM YYYY',
            lll: 'D MMM YYYY HH:mm',
            llll: 'ddd, D MMM YYYY HH:mm',
        },
        calendar: {
            sameDay: '[היום ב־]LT',
            nextDay: '[מחר ב־]LT',
            nextWeek: 'dddd [בשעה] LT',
            lastDay: '[אתמול ב־]LT',
            lastWeek: '[ביום] dddd [האחרון בשעה] LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: 'בעוד %s',
            past: 'לפני %s',
            s: 'מספר שניות',
            ss: '%d שניות',
            m: 'דקה',
            mm: '%d דקות',
            h: 'שעה',
            hh: function (number) {
                if (number === 2) {
                    return 'שעתיים';
                }
                return number + ' שעות';
            },
            d: 'יום',
            dd: function (number) {
                if (number === 2) {
                    return 'יומיים';
                }
                return number + ' ימים';
            },
            M: 'חודש',
            MM: function (number) {
                if (number === 2) {
                    return 'חודשיים';
                }
                return number + ' חודשים';
            },
            y: 'שנה',
            yy: function (number) {
                if (number === 2) {
                    return 'שנתיים';
                } else if (number % 10 === 0 && number !== 10) {
                    return number + ' שנה';
                }
                return number + ' שנים';
            },
        },
        meridiemParse: /אחה"צ|לפנה"צ|אחרי הצהריים|לפני הצהריים|לפנות בוקר|בבוקר|בערב/i,
        isPM: function (input) {
            return /^(אחה"צ|אחרי הצהריים|בערב)$/.test(input);
        },
        meridiem: function (hour, minute, isLower) {
            if (hour < 5) {
                return 'לפנות בוקר';
            } else if (hour < 10) {
                return 'בבוקר';
            } else if (hour < 12) {
                return isLower ? 'לפנה"צ' : 'לפני הצהריים';
            } else if (hour < 18) {
                return isLower ? 'אחה"צ' : 'אחרי הצהריים';
            } else {
                return 'בערב';
            }
        },
    });

    return he;

})));

// moment-timezone-localization for lang code: he

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"אביג׳אן","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"אקרה","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"אדיס אבבה","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"אלג׳יר","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"אסמרה","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"במאקו","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"בנגואי","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"בנג׳ול","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"ביסאו","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"בלנטיר","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"ברזוויל","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"בוג׳ומבורה","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"קהיר","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"קזבלנקה","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"סאוטה","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"קונאקרי","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"דקאר","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"דאר א-סלאם","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"ג׳יבוטי","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"דואלה","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"אל עיון","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"פריטאון","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"גבורונה","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"הרארה","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"יוהנסבורג","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"ג׳ובה","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"קמפאלה","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"חרטום","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"קיגלי","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"קינשסה","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"לגוס","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"ליברוויל","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"לומה","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"לואנדה","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"לובומבאשי","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"לוסקה","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"מלבו","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"מאפוטו","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"מסרו","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"מבבנה","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"מוגדישו","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"מונרוביה","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"ניירובי","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"נג׳מנה","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"ניאמיי","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"נואקצ׳וט","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"וואגאדוגו","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"פורטו נובו","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"סאו טומה","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"טריפולי","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"תוניס","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"וינדהוק","id":"Africa/Windhoek"},{"value":"America/Adak","name":"אדאק","id":"America/Adak"},{"value":"America/Anchorage","name":"אנקורג׳","id":"America/Anchorage"},{"value":"America/Anguilla","name":"אנגווילה","id":"America/Anguilla"},{"value":"America/Antigua","name":"אנטיגואה","id":"America/Antigua"},{"value":"America/Araguaina","name":"אראגואינה","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"לה ריוחה","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"ריו גאייגוס","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"סלטה","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"סן חואן","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"סן לואיס","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"טוקומן","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"אושוואיה","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"ארובה","id":"America/Aruba"},{"value":"America/Asuncion","name":"אסונסיון","id":"America/Asuncion"},{"value":"America/Bahia","name":"באהיה","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"באהיה בנדרס","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"ברבדוס","id":"America/Barbados"},{"value":"America/Belem","name":"בלם","id":"America/Belem"},{"value":"America/Belize","name":"בליז","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"בלאן-סבלון","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"בואה ויסטה","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"בוגוטה","id":"America/Bogota"},{"value":"America/Boise","name":"בויסי","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"בואנוס איירס","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"קיימברידג׳ ביי","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"קמפו גרנדה","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"קנקון","id":"America/Cancun"},{"value":"America/Caracas","name":"קראקס","id":"America/Caracas"},{"value":"America/Catamarca","name":"קטמרקה","id":"America/Catamarca"},{"value":"America/Cayenne","name":"קאיין","id":"America/Cayenne"},{"value":"America/Cayman","name":"קיימן","id":"America/Cayman"},{"value":"America/Chicago","name":"שיקגו","id":"America/Chicago"},{"value":"America/Chihuahua","name":"צ׳יוואווה","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"אטיקוקן","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"קורדובה","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"קוסטה ריקה","id":"America/Costa_Rica"},{"value":"America/Creston","name":"קרסטון","id":"America/Creston"},{"value":"America/Cuiaba","name":"קויאבה","id":"America/Cuiaba"},{"value":"America/Curacao","name":"קוראסאו","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"דנמרקסהוון","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"דוסון","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"דוסון קריק","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"דנוור","id":"America/Denver"},{"value":"America/Detroit","name":"דטרויט","id":"America/Detroit"},{"value":"America/Dominica","name":"דומיניקה","id":"America/Dominica"},{"value":"America/Edmonton","name":"אדמונטון","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"אירונפי","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"אל סלבדור","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"פורט נלסון","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"פורטאלזה","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"גלייס ביי","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"נואוק","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"גוס ביי","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"גרנד טורק","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"גרנדה","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"גואדלופ","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"גואטמלה","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"גואיאקיל","id":"America/Guayaquil"},{"value":"America/Guyana","name":"גיאנה","id":"America/Guyana"},{"value":"America/Halifax","name":"הליפקס","id":"America/Halifax"},{"value":"America/Havana","name":"הוואנה","id":"America/Havana"},{"value":"America/Hermosillo","name":"הרמוסיו","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"נוקס, אינדיאנה","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"מרנגו, אינדיאנה","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"פיטרסבורג, אינדיאנה","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"טל סיטי, אינדיאנה","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"ויוואיי, אינדיאנה","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"וינסנס, אינדיאנה","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"וינמאק, אינדיאנה","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"אינדיאנפוליס","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"אינוויק","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"איקלואיט","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"ג׳מייקה","id":"America/Jamaica"},{"value":"America/Jujuy","name":"חוחוי","id":"America/Jujuy"},{"value":"America/Juneau","name":"ג׳ונו","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"מונטיצ׳לו, קנטאקי","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"קרלנדייק","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"לה פאס","id":"America/La_Paz"},{"value":"America/Lima","name":"לימה","id":"America/Lima"},{"value":"America/Los_Angeles","name":"לוס אנג׳לס","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"לואיוויל","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"לואוור פרינסס קוורטר","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"מסייאו","id":"America/Maceio"},{"value":"America/Managua","name":"מנגואה","id":"America/Managua"},{"value":"America/Manaus","name":"מנאוס","id":"America/Manaus"},{"value":"America/Marigot","name":"מריגו","id":"America/Marigot"},{"value":"America/Martinique","name":"מרטיניק","id":"America/Martinique"},{"value":"America/Matamoros","name":"מטמורוס","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"מזטלן","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"מנדוזה","id":"America/Mendoza"},{"value":"America/Menominee","name":"מנומיני","id":"America/Menominee"},{"value":"America/Merida","name":"מרידה","id":"America/Merida"},{"value":"America/Metlakatla","name":"מטלקטלה","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"מקסיקו סיטי","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"מיקלון","id":"America/Miquelon"},{"value":"America/Moncton","name":"מונקטון","id":"America/Moncton"},{"value":"America/Monterrey","name":"מונטריי","id":"America/Monterrey"},{"value":"America/Montevideo","name":"מונטווידאו","id":"America/Montevideo"},{"value":"America/Montserrat","name":"מונסראט","id":"America/Montserrat"},{"value":"America/Nassau","name":"נסאו","id":"America/Nassau"},{"value":"America/New_York","name":"ניו יורק","id":"America/New_York"},{"value":"America/Nipigon","name":"ניפיגון","id":"America/Nipigon"},{"value":"America/Nome","name":"נום","id":"America/Nome"},{"value":"America/Noronha","name":"נורוניה","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"ביולה, צפון דקוטה","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"סנטר, צפון דקוטה","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"ניו סיילם, צפון דקוטה","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"אוג׳ינאגה","id":"America/Ojinaga"},{"value":"America/Panama","name":"פנמה","id":"America/Panama"},{"value":"America/Pangnirtung","name":"פנגנירטונג","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"פרמריבו","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"פיניקס","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"פורט או פראנס","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"פורט אוף ספיין","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"פורטו וליו","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"פוארטו ריקו","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"פונטה ארנס","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"רייני ריבר","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"רנקין אינלט","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"רסיפה","id":"America/Recife"},{"value":"America/Regina","name":"רג׳ינה","id":"America/Regina"},{"value":"America/Resolute","name":"רזולוט","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"ריו ברנקו","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"סנטה איזבל","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"סנטרם","id":"America/Santarem"},{"value":"America/Santiago","name":"סנטיאגו","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"סנטו דומינגו","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"סאו פאולו","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"סקורסביסונד","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"סיטקה","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"סנט ברתלמי","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"סנט ג׳ונס","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"סנט קיטס","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"סנט לוסיה","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"סנט תומאס","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"סנט וינסנט","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"סוויפט קרנט","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"טגוסיגלפה","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"תולה","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"ת׳אנדר ביי","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"טיחואנה","id":"America/Tijuana"},{"value":"America/Toronto","name":"טורונטו","id":"America/Toronto"},{"value":"America/Tortola","name":"טורטולה","id":"America/Tortola"},{"value":"America/Vancouver","name":"ונקובר","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"ווייטהורס","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"וויניפג","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"יקוטאט","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"ילונייף","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"קאסיי","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"דיוויס","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"דומון ד׳אורוויל","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"מקרי","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"מוסון","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"מק-מרדו","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"פאלמר","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"רות׳רה","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"סיוואה","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"טרול","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"ווסטוק","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"לונגיירבין","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"עדן","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"אלמאטי","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"עמאן","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"אנדיר","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"אקטאו","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"אקטובה","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"אשגבט","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"אטיראו","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"בגדד","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"בחריין","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"באקו","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"בנגקוק","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"ברנאול","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"ביירות","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"בישקק","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"ברוניי","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"קולקטה","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"צ׳יטה","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"צ׳ויבלסן","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"קולומבו","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"דמשק","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"דאקה","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"דילי","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"דובאי","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"דושנבה","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"פמגוסטה","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"עזה","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"חברון","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"הונג קונג","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"חובד","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"אירקוטסק","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"ג׳קרטה","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"ג׳איאפורה","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"ירושלים","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"קאבול","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"קמצ׳טקה","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"קראצ׳י","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"קטמנדו","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"חנדיגה","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"קרסנויארסק","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"קואלה לומפור","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"קוצ׳ינג","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"כווית","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"מקאו","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"מגדן","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"מאקאסאר","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"מנילה","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"מוסקט","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"ניקוסיה","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"נובוקוזנטסק","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"נובוסיבירסק","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"אומסק","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"אורל","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"פנום פן","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"פונטיאנק","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"פיונגיאנג","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"קטאר","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"קיזילורדה","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"רנגון","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"ריאד","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"הו צ׳י מין סיטי","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"סחלין","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"סמרקנד","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"סיאול","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"שנחאי","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"סינגפור","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"סרדנייקולימסק","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"טאיפיי","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"טשקנט","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"טביליסי","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"טהרן","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"טהימפהו","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"טוקיו","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"טומסק","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"אולאאנבטאר","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"אורומקי","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"אוסט-נרה","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"האנוי","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"ולדיווסטוק","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"יקוטסק","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"יקטרינבורג","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"ירוואן","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"האיים האזוריים","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"ברמודה","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"האיים הקנריים","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"כף ורדה","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"פארו","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"מדיירה","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"רייקיאוויק","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"דרום ג׳ורג׳יה","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"סנט הלנה","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"סטנלי","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"אדלייד","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"בריסביין","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"ברוקן היל","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"קרי","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"דרווין","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"יוקלה","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"הוברט","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"לינדמן","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"אי הלורד האו","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"מלבורן","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"פרת׳","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"סידני","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"זמן אוניברסלי מתואם","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"אמסטרדם","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"אנדורה","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"אסטרחן","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"אתונה","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"בלגרד","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"ברלין","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"ברטיסלבה","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"בריסל","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"בוקרשט","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"בודפשט","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"ביזינגן","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"קישינב","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"קופנהגן","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"שעון קיץ אירלנדדבלין","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"גיברלטר","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"גרנזי","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"הלסינקי","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"האי מאן","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"איסטנבול","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"ג׳רזי","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"קלינינגרד","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"קייב","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"קירוב","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"ליסבון","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"לובליאנה","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"שעון קיץ בריטניהלונדון","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"לוקסמבורג","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"מדריד","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"מלטה","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"מרייהאמן","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"מינסק","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"מונקו","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"מוסקבה","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"אוסלו","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"פריז","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"פודגוריצה","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"פראג","id":"Europe/Prague"},{"value":"Europe/Riga","name":"ריגה","id":"Europe/Riga"},{"value":"Europe/Rome","name":"רומא","id":"Europe/Rome"},{"value":"Europe/Samara","name":"סמרה","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"סן מרינו","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"סרייבו","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"סראטוב","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"סימפרופול","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"סקופיה","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"סופיה","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"שטוקהולם","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"טאלין","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"טירנה","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"אוליאנובסק","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"אוז׳הורוד","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"ואדוץ","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"הוותיקן","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"וינה","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"וילנה","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"וולגוגרד","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"ורשה","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"זאגרב","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"זפורוז׳יה","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"ציריך","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"אנטננריבו","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"צ׳אגוס","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"האי כריסטמס","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"קוקוס","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"קומורו","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"קרגוולן","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"מהא","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"האיים המלדיביים","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"מאוריציוס","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"מאיוט","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"ראוניון","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"אפיה","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"אוקלנד","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"בוגנוויל","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"צ׳אטהאם","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"אי הפסחא","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"אפטה","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"אנדרבורי","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"פקאופו","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"פיג׳י","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"פונפוטי","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"גלפאגוס","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"איי גמבייה","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"גוודלקנאל","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"גואם","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"הונולולו","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"ג׳ונסטון","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"קיריטימאטי","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"קוסרה","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"קוואג׳ליין","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"מאג׳ורו","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"איי מרקיז","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"מידוויי","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"נאורו","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"ניואה","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"נורפוק","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"נומאה","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"פאגו פאגו","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"פלאו","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"פיטקרן","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"פונפיי","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"פורט מורסבי","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"רארוטונגה","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"סאיפאן","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"טהיטי","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"טאראווה","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"טונגטאפו","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"צ׳וק","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"וייק","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"ווליס","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

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
I18n._compiledMFs = {"user.messages.read_more_group_pm_MF" : function(d){
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["cs"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.cs = function (n) {
  if (n == 1) {
    return 'one';
  }
  if (n == 2 || n == 3 || n == 4) {
    return 'few';
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

I18n.translations = {"cs":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"bajt","few":"bajty","many":"bajtů","other":"bajtů"},"gb":"GB","kb":"kB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"H:mm","time_with_zone":"kk:mm (z)","time_short_day":"ddd, kk:mm","timeline_date":"MMM YYYY","long_no_year":"D. MMM, k:mm","long_no_year_no_time":"D. MMMM","full_no_year_no_time":"D. MMMM","long_with_year":"D. M. YYYY, H:mm","long_with_year_no_time":"D. M. YYYY","full_with_year_no_time":"D. MMMM YYYY","long_date_with_year":"D. M. YYYY, H:mm","long_date_without_year":"D. MMMM, H:mm","long_date_with_year_without_time":"D. M. YYYY","long_date_without_year_with_linebreak":"D. MMMM \u003cbr/\u003eH:mm","long_date_with_year_with_linebreak":"D. M. YYYY \u003cbr/\u003eH:mm","wrap_ago":"před %{date}","tiny":{"half_a_minute":"\u003c 1m","less_than_x_seconds":{"one":"\u003c %{count}s","few":"\u003c %{count}s","many":"\u003c %{count}s","other":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s","few":"%{count}s","many":"%{count}s","other":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m","few":"\u003c %{count}m","many":"\u003c %{count}m","other":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m","few":"%{count}m","many":"%{count}m","other":"%{count}m"},"about_x_hours":{"one":"%{count}h","few":"%{count}h","many":"%{count}h","other":"%{count}h"},"x_days":{"one":"%{count}d","few":"%{count}d","many":"%{count}d","other":"%{count}d"},"x_months":{"one":"%{count} měsíc","few":"%{count} měsíce","many":"%{count} měsíců","other":"%{count} měsíců"},"about_x_years":{"one":"%{count}r","few":"%{count}r","many":"%{count}let","other":"%{count}let"},"over_x_years":{"one":"\u003e %{count}r","few":"\u003e %{count}r","many":"\u003e %{count}let","other":"\u003e %{count}let"},"almost_x_years":{"one":"%{count}r","few":"%{count}r","many":"%{count}let","other":"%{count}let"},"date_month":"D. MMMM","date_year":"MMMM YYYY"},"medium":{"x_minutes":{"one":"%{count} minuta","few":"%{count} minuty","many":"%{count} minut","other":"%{count} minut"},"x_hours":{"one":"%{count} hodina","few":"%{count} hodiny","many":"%{count} hodin","other":"%{count} hodin"},"x_days":{"one":"%{count} den","few":"%{count} dny","many":"%{count} dní","other":"%{count} dní"},"date_year":"D. M. YYYY"},"medium_with_ago":{"x_minutes":{"one":"před %{count} minutou","few":"před %{count} minutami","many":"před %{count} minutami","other":"před %{count} minutami"},"x_hours":{"one":"před %{count} hodinou","few":"před %{count} hodinami","many":"před %{count} hodinami","other":"před %{count} hodinami"},"x_days":{"one":"před %{count} dnem","few":"před %{count} dny","many":"před %{count} dny","other":"před %{count} dny"},"x_months":{"one":"před %{count} měsícem","few":"před %{count} měsíci","many":"před %{count} měsíci","other":"před %{count} měsíci"}},"later":{"x_days":{"one":"za %{count} den","few":"za %{count} dny","many":"o %{count} dní později","other":"o %{count} dní později"},"x_months":{"one":"za %{count} měsíc","few":"za %{count} měsíce","many":"o %{count} měsíců později","other":"o %{count} měsíců později"},"x_years":{"one":"za %{count} rok","few":"za %{count} roků","many":"o %{count} let později","other":"o %{count} let později"}},"previous_month":"Předchozí měsíc","next_month":"Další měsíc","placeholder":"datum","to_placeholder":"do data"},"share":{"topic_html":"Téma: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"příspěvek #%{postNumber}","close":"zavřít","twitter":"Sdílet na Twitteru","facebook":"Sdílet na Facebooku","email":"Odeslat e-mailem","url":"Zkopírujte a sdílejte URL adresu."},"action_codes":{"public_topic":"Téma zveřejněno %{when}","private_topic":"Téma změněno na osobní zprávu %{when}","split_topic":"rozdělil toto téma %{when}","invited_user":"%{who} pozván %{when}","invited_group":"%{who} pozvána %{when}","user_left":"%{who} se odstranil z této zpráy %{when}","removed_user":"%{who} smazán %{when}","removed_group":"%{who} smazána %{when}","autobumped":"automaticky bumped %{when}","autoclosed":{"enabled":"uzavřeno %{when}","disabled":"otevřeno %{when}"},"closed":{"enabled":"uzavřeno %{when}","disabled":"otevřeno %{when}"},"archived":{"enabled":"archivováno %{when}","disabled":"odarchivováno %{when}"},"pinned":{"enabled":"připnuto %{when}","disabled":"odepnuto %{when}"},"pinned_globally":{"enabled":"globálně připnuto %{when}","disabled":"odepnuto %{when}"},"visible":{"enabled":"uvedeno %{when}","disabled":"neuvedeno %{when}"},"banner":{"enabled":"vytvořil(a) tento banner %{when}. Bude se zobrazovat nahoře na každé stránce, dokud nebude uživatelem odmítnut.","disabled":"odstranil(a) tento banner %{when}. Už se nebude zobrazovat na každé stránce nahoře."},"forwarded":"přeposlat výše uvedený e-mail"},"topic_admin_menu":"Akce tématu.","wizard_required":"Vítejte ve vašem novém Discourse! Začněte s \u003ca href='%{url}' data-auto-route='true'\u003enastavením pomocí průvodce\u003c/a\u003e ✨","emails_are_disabled":"Všechny odchozí emaily byly administrátorem vypnuty. Žádné odchozí emaily nebudou odeslány.","software_update_prompt":{"dismiss":"Označit jako přečtené"},"bootstrap_mode_enabled":{"one":"Aby spuštění vaší webové stránky bylo jednodušší, tak se nachází v bootstrap režimu. Všichni noví uživatelé dostanou vernostní úroveň 1 a mohou mít zapnuté denní emailové shrnutí. Toto se automaticky vypne, když %{count} uživatelů se připojí.","few":"Aby se váš web jednodušeji rozjel, nachází se v režimu bootstrap. Všichni noví uživatelé začínají s důveryhodností 1 a mají povolené denní odesílání souhrnných emailů. Tento režim se automaticky vypne, jakmile se zaregistruje alespoň %{count} uživatelů.","many":"Aby se váš web jednodušeji rozjel, nachází se v režimu bootstrap. Všichni noví uživatelé začínají s důveryhodností 1 a mají povolené denní odesílání souhrnných emailů. Tento režim se automaticky vypne, jakmile se zaregistruje alespoň %{count} uživatelů.","other":"Aby se váš web jednodušeji rozjel, nachází se v režimu bootstrap. Všichni noví uživatelé začínají s důveryhodností 1 a mají povolené denní odesílání souhrnných emailů. Tento režim se automaticky vypne, jakmile se zaregistruje alespoň %{count} uživatelů."},"bootstrap_mode_disabled":"Režim bootstrap bude deaktivován v následujících 24 hodinách.","themes":{"default_description":"Výchozí","broken_theme_alert":"Vaše stránka nemusí fungovat, protože šablona / komponenta %{theme} má chyby. Vypněte ji na %{path}."},"s3":{"regions":{"ap_northeast_1":"Asia Pacific (Tokyo)","ap_northeast_2":"Asia Pacific (Soul)","ap_south_1":"Asia Pacific (Bombaj)","ap_southeast_1":"Asia Pacific (Singapur)","ap_southeast_2":"Asia Pacific (Sydney)","ca_central_1":"Kanada (střední)","cn_north_1":"Čína (Peking)","cn_northwest_1":"Čína (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"EU (Stockholm)","eu_west_1":"EU (Irsko)","eu_west_2":"EU (Londýn)","eu_west_3":"EU (Paříž)","sa_east_1":"Jižní Amerika (São Paulo)","us_east_1":"Východ USA (S. Virginie)","us_east_2":"Východ USA (Ohio)","us_gov_east_1":"AWS GovCloud (US-East)","us_gov_west_1":"AWS GovCloud (US-West)","us_west_1":"Západ USA (S. Kalifornie)","us_west_2":"Západ USA (Oregon)"}},"clear_input":"Vymazat vstup","edit":"upravit název a kategorii příspěvku","expand":"Rozšířit","not_implemented":"Tato funkce ještě nebyla naprogramována, omlouváme se.","no_value":"Ne","yes_value":"Ano","submit":"Odeslat","generic_error":"Bohužel nastala chyba.","generic_error_with_reason":"Nastala chyba: %{error}","sign_up":"Registrace","log_in":"Přihlásit se","age":"Věk","joined":"Účet vytvořen","admin_title":"Administrace","show_more":"zobrazit více","show_help":"možnosti","links":"Odkazy","links_lowercase":{"one":"odkaz","few":"odkazy","many":"odkazů","other":"odkazů"},"faq":"FAQ","guidelines":"Pokyny","privacy_policy":"Ochrana soukromí","privacy":"Soukromí","tos":"Podmínky používání","rules":"Pravidla","conduct":"Kodex chování","mobile_view":"Mobilní verze","desktop_view":"Plná verze","or":"nebo","now":"právě teď","read_more":"číst dále","more":"Více","x_more":{"one":"%{count} Více","few":"%{count} další","many":"%{count} Více","other":"%{count} Více"},"never":"nikdy","every_30_minutes":"každých 30 minut","every_hour":"každou hodinu","daily":"denně","weekly":"týdně","every_month":"každý měsíc","every_six_months":"každých šest měsíců","max_of_count":"max z","character_count":{"one":"%{count} znak","few":"%{count} znaky","many":"%{count} znaků","other":"%{count} znaků"},"related_messages":{"title":"Související zprávy","see_all":"Zobrazit \u003ca href=\"%{path}\"\u003evšechny zprávy\u003c/a\u003eod @%{username}"},"suggested_topics":{"title":"Doporučená témata","pm_title":"Doporučené zprávy"},"about":{"simple_title":"O fóru","title":"O %{title}","stats":"Statistiky webu","our_admins":"Naši Admini","our_moderators":"Naši Moderátoři","moderators":"Moderátoři","stat":{"all_time":"Za celou dobu"},"like_count":"Líbí se","topic_count":"Témata","post_count":"Příspěvky","user_count":"Uživatelé","active_user_count":"Aktivní uživatelé","contact":"Kontaktujte nás","contact_info":"V případě kritické chyby nebo urgentní záležitosti ovlivňující tuto stránku nás prosím kontaktujte na %{contact_info}."},"bookmarked":{"title":"Záložka","clear_bookmarks":"Odstranit záložky","help":{"bookmark":"Kliknutím vložíte záložku na první příspěvek tohoto tématu","unbookmark":"Kliknutím odstraníte všechny záložky v tématu"}},"bookmarks":{"created":"Tento příspěvek jste přidali do záložek. %{name}","not_bookmarked":"přidat záložku k příspěvku","created_with_reminder":"Tento příspěvek jste označili záložkou s připomenutím %{date}. %{name}","remove":"Odstranit záložku","delete":"Smazat záložku","confirm_delete":"Opravdu chcete tuto záložku smazat? Připomenutí bude také smazáno.","confirm_clear":"Opravdu chcete odstranit všechny své záložky z tohoto tématu?","save":"Uložit","no_timezone":"Zatím jste nenastavili časové pásmo. Nebudete moci nastavit připomenutí. Nastavte si ho \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eve svém profilu\u003c/a\u003e.","invalid_custom_datetime":"Zadané datum a čas jsou neplatné, zkuste to prosím znovu.","list_permission_denied":"Nemáte oprávnění k zobrazení záložek tohoto uživatele.","no_user_bookmarks":"Nemáte žádné záložky; záložky vám umožňují rychle odkazovat na konkrétní příspěvky.","auto_delete_preference":{"label":"Automaticky smazat","never":"Nikdy","when_reminder_sent":"Jakmile je připomenutí odesláno","on_owner_reply":"Po odpovědi na toto téma"},"search_placeholder":"Hledat záložky podle názvu, názvu tématu nebo obsahu příspěvku","search":"Vyhledat","reminders":{"today_with_time":"dnes v %{time}","tomorrow_with_time":"zítra v %{time}","at_time":"v %{date_time}","existing_reminder":"Máte nastavenou připomínku pro tuto záložku, která bude odeslána %{at_date_time}"}},"copy_codeblock":{"copied":"zkopírováno!"},"drafts":{"label":"Koncepty","resume":"Pokračovat","remove":"Odstranit","remove_confirmation":"Opravdu chcete tento koncept smazat?","new_topic":"Nový koncept tématu","topic_reply":"Koncept odpovědi","abandon":{"yes_value":"Zahodit"}},"topic_count_categories":{"one":"Zobrazit %{count} nové nebo upravené téma","few":"Zobrazit %{count} nová nebo upravená témata","many":"Zobrazit %{count} nových nebo upravených témat","other":"Zobrazit %{count} nových nebo upravených témat"},"topic_count_latest":{"one":"Zobrazit %{count} nové nebo upravené téma","few":"Zobrazit %{count} nová nebo upravená témata","many":"Zobrazit %{count} nových nebo upravených témat","other":"Zobrazit %{count} nových nebo upravených témat"},"topic_count_unseen":{"one":"Zobrazit %{count} nové nebo upravené téma","few":"Zobrazit %{count} nová nebo upravená témata","many":"Zobrazit %{count} nových nebo upravených témat","other":"Zobrazit %{count} nových nebo upravených témat"},"topic_count_unread":{"one":"Zobrazit %{count} nepřečtené téma","few":"Zobrazit %{count} nepřečtená témata","many":"Zobrazit %{count} nepřečtených témat","other":"Zobrazit %{count} nepřečtených témat"},"topic_count_new":{"one":"Zobrazit %{count} nové téma","few":"Zobrazit %{count} nová témata","many":"Zobrazit %{count} nových témat","other":"Zobrazit %{count} nových témat"},"preview":"ukázka","cancel":"zrušit","deleting":"Mazání ...","save":"Uložit změny","saving":"Ukládám...","saved":"Uloženo!","upload":"Obrázek","uploading":"Nahrávám...","uploading_filename":"Nahrává se %{filename}...","clipboard":"schránka","uploaded":"Nahráno!","pasting":"Vkládám...","enable":"Zapnout","disable":"Vypnout","continue":"Pokračovat","undo":"Zpět","revert":"Vrátit","failed":"Selhání","switch_to_anon":"Vstoupit do anonymního módu","switch_from_anon":"Opustit anonymní mód","banner":{"close":"Odmítnout tento banner.","edit":"Editujte tento banner \u003e\u003e"},"pwa":{"install_banner":"Chcete \u003ca href\u003enainstalovat %{title} na toto zařízení?\u003c/a\u003e"},"choose_topic":{"none_found":"Žádná témata nenalezena."},"review":{"in_reply_to":"v odpovědi na","explain":{"total":"Celkem"},"delete":"Smazat","settings":{"saved":"Uloženo","save_changes":"Uložit změny","title":"Nastavení"},"moderation_history":"Historie moderování","topic":"Téma:","filtered_user":"Uživatel","filtered_reviewed_by":"Zkontroloval","user":{"username":"Uživatelské jméno","email":"Email","name":"Jméno","reject_reason":"Reason"},"topics":{"topic":"Témata","deleted":"[Téma smazáno]","original":"(původní téma)","details":"podrobnosti","unique_users":{"one":"%{count} uživatel","few":"%{count} uživatelé","many":"%{count} uživatelů","other":"%{count} uživatelů"}},"replies":{"one":"%{count} odpověď","few":"%{count} odpovědi","many":"%{count} odpovědí","other":"%{count} odpovědí"},"edit":"Upravit","save":"Uložit","cancel":"Zrušit","new_topic":"Schválení této položky vytvoří nové téma","filters":{"all_categories":"(všechny kategorie)","type":{"title":"Typ","all":"(všechny typy)"},"minimum_score":"Minimální skóre:","refresh":"Obnovit","status":"Stav","category":"Kategorie","orders":{"score":"Skóre","score_asc":"Skóre (obráceně)","created_at":"Vytvořeno v","created_at_asc":"Vytvořeno v (obráceně)"},"priority":{"title":"Minimální priorita","any":"(libovolný)","medium":"Střední","high":"Vysoká"}},"conversation":{"view_full":"zobrazit celou konverzaci"},"scores":{"about":"Toto skóre je vypočítáno na základě důvěryhodnosti oznamovatele, přesnost jeho předchozích označení a prioritu oznamované položky.","score":"Skóre","date":"Datum","type":"Typ","status":"Stav","submitted_by":"Odeslal","reviewed_by":"Zkontroloval"},"statuses":{"pending":{"title":"Čeká na schválení"},"approved":{"title":"Schváleno"},"rejected":{"title":"Odmítnutých"},"ignored":{"title":"Ignorováno"},"deleted":{"title":"Smazáno"},"reviewed":{"title":"(vše zkontrolováno)"},"all":{"title":"(vše)"}},"types":{"reviewable_flagged_post":{"title":"Nahlášený příspěvek","flagged_by":"Nahlásil"},"reviewable_queued_topic":{"title":"Téma ve frontě"},"reviewable_queued_post":{"title":"Příspěvek ve frontě"},"reviewable_user":{"title":"Uživatel"},"reviewable_post":{"title":"Příspěvek"}},"approval":{"title":"Příspěvek potřebuje schválení","description":"Obdrželi jsme váš příspěvek, ale musí být před zveřejněním schválen moderátorem. Buďte trpěliví.","ok":"OK"},"example_username":"uživatelské jméno","reject_reason":{"title":"Proč odmítáte tohoto uživatele?","send_email":"Odeslat e-mail o odmítnutí"}},"relative_time_picker":{"days":{"one":"den","few":"dní","many":"dní","other":"dnů"},"relative":"Relativní"},"time_shortcut":{"later_today":"Později dnes","next_business_day":"Následující pracovní den","tomorrow":"Zítra","post_local_date":"Datum v příspěvku","later_this_week":"Později tento týden","this_weekend":"Tento týden","start_of_next_business_week":"Pondělí","start_of_next_business_week_alt":"Příští pondělí","next_month":"Další měsíc","custom":"Vlastní datum a čas"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e zaslal \u003ca href='%{topicUrl}'\u003etéma\u003c/a\u003e","you_posted_topic":"Zaslal jste \u003ca href='%{topicUrl}'\u003etéma\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e odpověděl na příspěvek \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"Odpověděl jste na příspěvek \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e přispěl do \u003ca href='%{topicUrl}'\u003etématu\u003c/a\u003e","you_replied_to_topic":"Přispěl jste do \u003ca href='%{topicUrl}'\u003etématu\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e zmínil uživatele \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e \u003ca href='%{user2Url}'\u003evás\u003c/a\u003e zmínil","you_mentioned_user":"Zmínil jste uživatele \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Příspěvěk od \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Odesláno \u003ca href='%{userUrl}'\u003evámi\u003c/a\u003e","sent_by_user":"Posláno uživatelem \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Posláno \u003ca href='%{userUrl}'\u003evámi\u003c/a\u003e"},"directory":{"username":"Uživatelské jméno","filter_name":"Filtrovat podle uživatelského jména","title":"Uživatelé","likes_given":"Rozdáno","likes_received":"Obdrženo","topics_entered":"Zobrazeno","topics_entered_long":"Zobrazeno témat","time_read":"Čas strávený čtením","topic_count":"Témata","topic_count_long":"Témat vytvořeno","post_count":"Odpovědi","post_count_long":"Odpovědí","no_results":"Žádné výsledky","days_visited":"Návštěv","days_visited_long":"Dní navštíveno","posts_read":"Přečteno","posts_read_long":"Příspěvků přečteno","total_rows":{"one":"%{count} uživatel","few":"%{count} uživatelé","many":"%{count} uživatelů","other":"%{count} uživatelů"},"edit_columns":{"save":"Uložit"},"group":{"all":"všechny skupiny"}},"group_histories":{"actions":{"change_group_setting":"Změnit nastavení skupiny","add_user_to_group":"Přidat uživatele","remove_user_from_group":"Odebrat uživatele","make_user_group_owner":"Udělej vlastníkem","remove_user_as_group_owner":"Odstraň vlastníka"}},"groups":{"member_added":"Přidáno","add_members":{"usernames_placeholder":"uživatelská jména"},"requests":{"reason":"Reason","accepted":"přijato"},"manage":{"title":"Spravovat","name":"Název","full_name":"Celé název","invite_members":"Pozvat","delete_member_confirm":"Odstranit '%{username}' ze '%{group}' skupiny?","profile":{"title":"Profil"},"interaction":{"title":"Interakce","posting":"Přispívání","notification":"Notifikace"},"email":{"title":"Email","last_updated_by":"od","credentials":{"username":"Uživatelské jméno","password":"Heslo"},"settings":{"title":"Nastavení"}},"membership":{"title":"Členství","access":"Přístup"},"categories":{"title":"Kategorie"},"tags":{"title":"Štítky"},"logs":{"title":"Logy","when":"Když","action":"Akce","acting_user":"Vystupující uživatel","target_user":"Cílový uživatel","subject":"Předmět","details":"Podrobnosti","from":"Od","to":"Komu"}},"permissions":{"title":"Oprávnění","none":"K této skupině nejsou přiřazeny žádné kategorie.","description":"Členové této skupiny mají přístup k těmto kategoriím"},"public_admission":"Povolit uživatelům volný přístup do skupiny (skupina musí být veřejně viditelná)","public_exit":"Povolit uživatelům volně opustit skupinu","empty":{"posts":"V této skupině není od žádného člena ani jeden příspěvek.","members":"V této skupině není žádny uživatel.","requests":"Nebyly nalezeny žádné žádosti o členství pro tuto skupinu.","mentions":"O této skupině nepadla žádná zmínka.","messages":"Pro tuto skupinu není žádná zpráva.","topics":"V této skupině není od žádného člena ani jedno téma.","logs":"Pro tuto skupinu neexistují žádné logy."},"add":"Přidat","join":"Přidat se ke skupině","leave":"Opustit skupinu","request":"Požádat o členství ve skupině","message":"Zpráva","confirm_leave":"Opravdu chcete opustit tuto skupinu?","allow_membership_requests":"Povolit uživatelům odesílat žádosti o členství vlastníkům skupiny (vyžaduje veřejně viditelnou skupinu)","membership_request_template":"Šablona, která se uživatelům zobrazí při odesílání žádosti o členství","membership_request":{"submit":"Odeslat požadavek","title":"Žádost o členství v @%{group_name}","reason":"Informovat vlastníky skupiny proč patříte do této skupiny"},"membership":"Členství","name":"Název","group_name":"Název skupiny","user_count":"Uživatelé","bio":"O skupině","selector_placeholder":"zadejte uživatelské jméno","owner":"Vlastník","index":{"title":"Skupiny","all":"Všechny skupiny","empty":"Žádné viditelné skupiny.","filter":"Filtrovat podle typu skupiny","owner_groups":"Moje skupiny","close_groups":"Uzavřené skupiny","automatic_groups":"Automatické skupiny","automatic":"Automatické","closed":"Uzavřeno","public":"Veřejné","private":"Soukromé","public_groups":"Veřejné skupiny","my_groups":"Moje skupiny","group_type":"Typ skupiny","is_group_user":"Člen","is_group_owner":"Vlastník"},"title":{"one":"Skupina","few":"Skupiny","many":"Skupin","other":"Skupin"},"activity":"Aktivita","members":{"title":"Členové","filter_placeholder_admin":"uživatelské jméno nebo email","filter_placeholder":"uživatelské jméno","remove_member":"Odstranit člena","remove_member_description":"Odstranit \u003cb\u003e%{username}\u003c/b\u003e z této skupiny","make_owner":"Udělej vlastníkem","make_owner_description":"Udělat z \u003cb\u003e%{username}\u003c/b\u003e vlastníka této skupiny","remove_owner":"Odstranit vlastníka","remove_owner_description":"Odstranit \u003cb\u003e%{username}\u003c/b\u003e z role vlastníka této skupiny","make_primary":"Nastavit jako primární","make_primary_description":"Nastavit jako primární skupinu pro \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Odebrat jako primární","remove_primary_description":"Odeberte to jako primární skupinu pro \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Odebrat členy","remove_members_description":"Odebrat vybrané uživatele z této skupiny","make_owners":"Nastavit jako vlastníky","make_owners_description":"Nastavit vybrané uživatele jako vlastníky této skupiny","remove_owners":"Odebrat vlastníky","remove_owners_description":"Odebrat vybrané uživatele jako vlastníky této skupiny","make_all_primary":"Nastavit všechny jako primární","make_all_primary_description":"Nastavit jako primární skupinu pro všechny vybrané uživatele","remove_all_primary":"Odebrat jako primární","remove_all_primary_description":"Odebrat tuto skupinu jako primární","owner":"Vlastník","primary":"Primární","forbidden":"Nejste oprávněni prohlížet členy."},"topics":"Témata","posts":"Odpovědi","mentions":"Zmínění","messages":"Zprávy","notification_level":"Výchozí úroveň upozornění pro zprávy ze skupiny","alias_levels":{"mentionable":"Kdo může @zmiňovat tuto skupinu?","messageable":"Kdo může psát zprávy do této skupinu?","nobody":"Nikdo","only_admins":"Pouze správci","mods_and_admins":"Pouze moderátoři a správci","members_mods_and_admins":"Pouze členové skupiny, moderátoři a správci","owners_mods_and_admins":"Pouze vlastníci skupiny, moderátoři a správci","everyone":"Kdokoliv"},"notifications":{"watching":{"title":"Hlídané","description":"Budete informováni o každém novém příspěvku v každné zprávě a také se vám zobrazí počet nepřečtených příspěvků."},"watching_first_post":{"title":"Hlídané první příspěvky","description":"Budete upozorněni na nové zprávy v této skupině, ale ne odpovědi na zprávy."},"tracking":{"title":"Sledování","description":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek a zobrazí se vám počet nových odpovědí."},"regular":{"title":"Normální","description":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek."},"muted":{"title":"Ztišený","description":"Nebudete upozorněni na žádné zprávy v této skupině."}},"flair_url":"Avatar Flair obrázek","flair_upload_description":"Používejte čtvercové obrázky ne menší než 20px do 20px.","flair_bg_color":"Avatar Flair barva pozadí","flair_bg_color_placeholder":"(Volitelné) Hex kód barvy","flair_color":"Avatar Flair barva","flair_color_placeholder":"(Volitelné) Hex kód barvy","flair_preview_icon":"Náhled ikony","flair_preview_image":"Náhled obrázku","flair_type":{"icon":"Vyberte ikonu","image":"Nahrát obrázek"},"default_notifications":{"modal_yes":"Ano"}},"user_action_groups":{"1":"Rozdaných 'líbí se'","2":"Obdržených 'líbí se'","3":"Záložky","4":"Témata","5":"Odpovědi","6":"Odezva","7":"Zmínění","9":"Citace","11":"Editace","12":"Odeslané zprávy","13":"Přijaté zprávy","14":"Čeká na schválení","15":"Koncepty"},"categories":{"all":"všechny kategorie","all_subcategories":"vše","no_subcategory":"žádné","category":"Kategorie","category_list":"Zobrazit seznam kategorií","reorder":{"title":"Přeřadit kategorie","title_long":"Přeorganizovat seznam kategorií","save":"Uložit pořadí","apply_all":"Použít","position":"Umístění"},"posts":"Příspěvky","topics":"Témata","latest":"Aktuální","subcategories":"Podkategorie","muted":"Ztlumené kategorie","topic_sentence":{"one":"%{count} téma","few":"%{count} témata","many":"%{count} témat","other":"%{count} témat"},"topic_stat_unit":{"week":"týden","month":"měsíc"},"n_more":"Kategorie (%{count} dalších)..."},"ip_lookup":{"title":"Vyhledávání podle IP adresy","hostname":"Hostname","location":"Lokace","location_not_found":"(neznámá)","organisation":"Organizace","phone":"Telefon","other_accounts":"Další účty s touto IP adresou:","delete_other_accounts":"Smazat %{count}","username":"uživatelské jméno","trust_level":"Důvěra","read_time":"čas k přečtení","topics_entered":"témat zadáno","post_count":"počet příspěvků","confirm_delete_other_accounts":"Určitě chcete smazat tyto účty?","powered_by":"používá \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"zkopírováno"},"user_fields":{"none":"(zvolit možnost)","required":"Zadejte hodnotu pro \"%{name}\""},"user":{"said":"%{username}:","profile":"Profil","mute":"Ignorovat","edit":"Upravit nastavení","download_archive":{"button_text":"Stáhnout vše","confirm":"Jste si jistí, že chcete stáhnout všechny své příspěvky?","success":"Stahování zahájeno, až bude dokončeno, přijde ti zpráva.","rate_limit_error":"Příspěvky mohou být staženy jen jednou za den. Zkus to, prosím, zítra."},"new_private_message":"Nová zpráva","private_message":"Zpráva","private_messages":"Zprávy","user_notifications":{"filters":{"filter_by":"Filtrovat podle","all":"Všechny","read":"Přečtená","unread":"Nepřečtená"},"ignore_duration_title":"Ignorovat uživatele","ignore_duration_username":"Uživatelské jméno","ignore_duration_when":"Doba trvání:","ignore_duration_save":"ignorovat","ignore_duration_note":"Vezměte prosím na vědomí, že všechny ignorování se automaticky odstraní po uplynutí doby trvání ignorování.","ignore_duration_time_frame_required":"Vyberte prosím časové období","ignore_no_users":"Nemáte žádné ignorované uživatele.","ignore_option":"Ignorováno","ignore_option_title":"Nebudete dostávat oznámení týkající se tohoto uživatele a všechna jejich témata a odpovědi budou skryty.","add_ignored_user":"Přidat...","mute_option":"Ztišené","mute_option_title":"Nebudete dostávat žádná oznámení týkající se tohoto uživatele.","normal_option":"Normální","normal_option_title":"Budete upozorněni, pokud vám tento uživatel odpoví, cituje vás nebo vás zmiňuje."},"notification_schedule":{"title":"Harmonogram oznámení","label":"Povolit vlastní harmonogram oznámení","none":"Žádná","monday":"Pondělí","to":"komu"},"activity_stream":"Aktivita","read":"Přečteno","preferences":"Nastavení","feature_topic_on_profile":{"save":"Uložit","clear":{"title":"Zrušit"}},"profile_hidden":"Tento uživatelský profil je skrytý.","expand_profile":"Rozšířit","collapse_profile":"Sbalit","bookmarks":"Záložky","bio":"O mně","invited_by":"Pozvánka od","trust_level":"Důvěryhodnost","notifications":"Oznámení","statistics":"Statistiky","desktop_notifications":{"label":"Upozornění v reálném čase","not_supported":"Tento prohlížeč nepodporuje upozornění. Omlouváme se.","perm_default":"Vypnout upozornění.","perm_denied_btn":"Povolení zamítnuto","perm_denied_expl":"Máte zakázané upozornění. Povolte upozornění v nastavení vašeho prohlížeče.","disable":"Vypnout upozornění","enable":"Povolit upozornění","consent_prompt":"Chcete dostávat upozornění v reálném čase, když někdo odpoví na vaše příspěvky?"},"dismiss":"Označit jako přečtené","dismiss_notifications":"Označit vše jako přečtené","dismiss_notifications_tooltip":"Označit všechny nepřečtené notifikace jako přečtené","first_notification":"Vaše první notifikace! Klikněte zde a začněte.","color_schemes":{"undo":"obnovit výchozí","regular":"Běžný"},"allow_private_messages":"Povolit ostatním uživatelům, aby mi mohli zasílat osobní zprávy","external_links_in_new_tab":"Otevírat všechny externí odkazy do nové záložky","enable_quoting":"Povolit odpověď s citací z označeného textu","change":"změnit","featured_topic":"Doporučené téma","moderator":"%{user} je moderátor","admin":"%{user} je administrátor","moderator_tooltip":"Tento uživatel je moderátor","admin_tooltip":"Tento uživatel je admi","silenced_tooltip":"Tento uživatel je ztišen.","suspended_notice":"Uživatel je suspendován do %{date}.","suspended_permanently":"Tento uživatel je suspendován.","suspended_reason":"Důvod: ","github_profile":"GitHub","email_activity_summary":"Souhrn aktivit","mailing_list_mode":{"label":"Režim elektronická pošta","enabled":"Zapnout režim elektronická pošta","instructions":"Toto nastavení deaktivuje souhrn aktivit.\u003cbr/\u003e\nZtlumená témata a kategorie nejsou zahrnuté v těchto emailech.\n","individual":"Upozornit emailem na každý nový příspěvek","individual_no_echo":"Upozornit emailem na každý nový příspěvek kromě mých vlastních","many_per_day":"Upozornit emailem na každý nový příspěvek (asi %{dailyEmailEstimate} každý den)","few_per_day":"Upozornit emailem na každý nový příspěvek (asi 2 každý den)","warning":"Režim emailové konference povolen. Nastavení emailových notifikací neplatí."},"tag_settings":"Štítky","watched_tags":"Hlídané","watched_tags_instructions":"Budete automaticky hlídat všechna nová témata s těmito štítky. Na všechny nové příspěvky a témata budete upozorněni. Počet nových příspěvků se zobrazí vedle tématu.","tracked_tags":"Sledované","tracked_tags_instructions":"Budete automaticky sledovat všechna témata s těmito štítky. Počet nových příspěvků se zobrazí vedle tématu.","muted_tags":"Ztišené","muted_tags_instructions":"Nikdy nebudete dostávat upozornění na nová témata s těmito štítky a neobjeví se v aktuálních.","watched_categories":"Hlídané","watched_categories_instructions":"Budete automaticky sledovat všechna nová témata v těchto kategoriích. Na všechny nové příspěvky budete upozorněni. Počet nových příspěvků se zobrazí vedle tématu.","tracked_categories":"Sledované","tracked_categories_instructions":"Všechna témata v této kategorii budou automaticky hlídaná. Počet nepřečtených a nových příspěvků se zobrazí vedle tématu.","watched_first_post_categories":"Hlídané první příspěvky","watched_first_post_categories_instructions":"Budete informováni o prvním novém příspěvku v každém novém tématu vytvořeném v těchto kategoriích.","watched_first_post_tags":"Hlídané první příspěvky","watched_first_post_tags_instructions":"Budete informováni o prvním novém příspěvku v každém novém tématu s těmito štítky.","muted_categories":"Ztišené","muted_categories_instructions":"Nebudete upozorněni na nic o nových tématech v těchto kategoriích ty se neobjeví v přehledu kategorií či v aktuálních,","regular_categories":"Běžný","no_category_access":"Jako moderátor máte omezený přístup ke kategorii bez možnosti ukládat změny.","delete_account":"Smazat můj účet","delete_account_confirm":"Jste si jisti, že chcete trvale odstranit svůj účet? Tuto akci nelze vrátit zpět!","deleted_yourself":"Váš účet byl úspěšně odstraněn.","delete_yourself_not_allowed":"Prosíme kontaktujte správce, pokud chcete smazat svůj účet.","unread_message_count":"Zprávy","admin_delete":"Smazat","users":"Uživatelé","muted_users":"Ztišení","ignored_users":"Ignorováno","tracked_topics_link":"Zobrazit","automatically_unpin_topics":"Atomaticky odepni téma jakmile se dostanu na konec.","apps":"Aplikace","revoke_access":"Odebrat přístup","undo_revoke_access":"Zrušit odebrání přístupu","api_approved":"Schváleno:","api_last_used_at":"Poslední použití:","theme":"Motiv","home":"Výchozí domovská stránka","staged":"Staged","staff_counters":{"flags_given":"užitečná nahlášení","flagged_posts":"nahlášených příspěvků","deleted_posts":"smazaných příspěvků","suspensions":"vyloučení","warnings_received":"varování","rejected_posts":"zamítnuté příspěvky"},"messages":{"inbox":"Doručené","latest":"Aktuální","sent":"Odeslané","unread":"Nepřečtená","unread_with_count":{"one":"Nepřečtená (%{count})","few":"Nepřečtená (%{count})","many":"Nepřečtená (%{count})","other":"Nepřečtená (%{count})"},"new":"Nová","archive":"Archív","groups":"Moje skupiny","move_to_inbox":"Přesunout do doručených","move_to_archive":"Archivovat","failed_to_move":"Nepodařilo se přesunout vybrané zprávy (možná vám spadlo připojení)","tags":"Štítek"},"preferences_nav":{"account":"Účet","security":"Zabezpečení","profile":"Profil","emails":"Emaily","notifications":"Upozornění","categories":"Kategorie","users":"Uživatelé","tags":"Tagy","interface":"Rozhraní","apps":"Aplikace"},"change_password":{"success":"(email odeslán)","in_progress":"(odesílám)","error":"(chyba)","emoji":"uzamknout emoji","action":"Odeslat email na obnovu hesla","set_password":"Nastavit heslo","choose_new":"Zvolte si nové heslo","choose":"Vyber si heslo"},"second_factor_backup":{"title":"Dvoufaktorové záložní kódy","regenerate":"Vytvořit znovu","disable":"Vypnout","enable":"Zapnout","enable_long":"Povolit záložní kódy","copy_to_clipboard":"Kopírovat do schránky","copy_to_clipboard_error":"Chyba při kopírování dat do schránky","copied_to_clipboard":"Zkopírováno do schránky","download_backup_codes":"Stáhnout záložní kódy","use":"Použít záložní kód","enable_prerequisites":"Před vytvořením záložních kódů musíte povolit primární dvoufaktorovou metodu.","codes":{"title":"Záložní kódy vytvořeny","description":"Každý z těchto kódů může být použit jen jednou. Uložte si je někde v bezpečí, ale dostupné."}},"second_factor":{"title":"Dvoufaktorové ověření","enable":"Správa dvoufaktorového ověřování","disable_all":"Zakázat vše","forgot_password":"Zapomněli jste heslo?","confirm_password_description":"Prosíme před dalším krokem potvrďte své heslo","name":"Jméno","label":"Kód","rate_limit":"Prosím počkejete před tím, než vyskoušíte další ověřovací kód.","enable_description":"Naskenujte tento QR kód v podporované aplikaci (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) a zadejte ověřovací kód.\n","disable_description":"Zadejte prosím ověřovací kód z vaší aplikace","show_key_description":"Vložit ručně","short_description":"Chraňte svůj účet jednorázovými bezpečnostními kódy.\n","extended_description":"Dvoufaktorové ověření zvyšuje zabezpečení vašeho účtu tím, že vyžaduje jednorázový kód navíc k vašemu heslu. Kódy mohou být generovány na \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e a \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e zařízeních.\n","oauth_enabled_warning":"Vezměte prosím na vědomí, že přihlášení pomocí sociálních sítí bude zakázáno, jakmile bude dvoufaktorové ověřování na vašem účtu povoleno.","use":"Použijte ověřovací aplikaci","enforced_notice":"Před přístupem na tento web musíte povolit dvoufaktorové ověřování.","disable":"Vypnout","disable_confirm":"Opravdu chcete zakázat všechny dvoufaktorové metody?","save":"Uložit","edit":"Upravit","edit_title":"Upravit autentifikátor","edit_description":"Jméno autentifikátoru","enable_security_key_description":"Když máte připravený \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003ehardwarový bezpečnostní klíč\u003c/a\u003e , stiskněte tlačítko Registrace níže.\n","totp":{"title":"Ověření založené na tokenech","add":"Přidat autentifikátor","default_name":"Můj autentifikátor","name_and_code_required_error":"Musíte zadat jméno a kód z vaší ověřovací aplikace."},"security_key":{"register":"Registrovat","title":"Bezpečnostní klíče","add":"Přidat bezpečnostní klíč","default_name":"Hlavní bezpečnostní klíč","not_allowed_error":"Proces registrace bezpečnostního klíče buď vypršel, nebo byl zrušen.","already_added_error":"Tento bezpečnostní klíč jste již zaregistrovali. Není nutné jej znovu zaregistrovat.","edit":"Upravit bezpečnostní klíč","save":"Uložit","edit_description":"Název bezpečnostního klíče","name_required_error":"Musíte zadat název bezpečnostního klíče."}},"change_about":{"title":"Změna o mně","error":"Došlo k chybě při pokusu změnit tuto hodnotu."},"change_username":{"title":"Změnit uživatelské jméno","confirm":"Jste si naprosto jisti, že chcete změnit své uživatelské jméno?","taken":"Toto uživatelské jméno je již zabrané.","invalid":"Uživatelské jméno je neplatné. Musí obsahovat pouze písmena a číslice."},"add_email":{"title":"Přidat e-mail","add":"přidat"},"change_email":{"title":"Změnit emailovou adresu","taken":"Tato emailová adresa není k dispozici.","error":"Nastala chyba při změně emailové adresy. Není tato adresa již používaná?","success":"Na zadanou adresu jsme zaslali email. Následujte, prosím, instrukce v tomto emailu.","success_via_admin":"Na tuto adresu jsme odeslali e-mail. Uživatel bude muset postupovat podle instrukcí v e-mailu.","success_staff":"Na vaši aktuální adresu jsme zaslali email. Následujte prosím instrukce v tomto emailu."},"change_avatar":{"title":"Změňte si svůj profilový obrázek","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e na základě","gravatar_title":"Změňte si svůj avatar na webové stránce %{gravatarName}","gravatar_failed":"Nemohli jsme najít %{gravatarName} s touto e-mailovou adresou.","refresh_gravatar_title":"Aktualizovat %{gravatarName}","letter_based":"Systémem přidělený profilový obrázek","uploaded_avatar":"Vlastní obrázek","uploaded_avatar_empty":"Přidat vlastní obrázek","upload_title":"Nahrát obrázek","image_is_not_a_square":"Varování: Ořízli jsme váš obrázek; šířka a délka nebyla stejná."},"change_profile_background":{"title":"Záhlaví profilu","instructions":"Záhlaví profilu bude vycentrována a má výchozí šířku 1110px."},"change_card_background":{"title":"Pozadí uživatelské karty","instructions":"Obrázky pozadí jsou zarovnány a mají výchozí šířku 590px. "},"change_featured_topic":{"title":"Doporučené téma","instructions":"Odkaz na toto téma bude na vaší uživatelské kartě a profilu."},"email":{"title":"Emailová adresa","primary":"Hlavní email","secondary":"Záložní emailové adresy","primary_label":"primární","unconfirmed_label":"nepotvrzený","resend_label":"znovu odeslat potvrzovací e-mail","resending_label":"odesílání...","resent_label":"e-mail odeslán","update_email":"Změnit emailovou adresu","no_secondary":"Žádné záložní emailové adresy","instructions":"Nikdy nebude zveřejněno.","ok":"Pro potvrzení vám pošleme email.","invalid":"Zadejte prosím správnou emailovou adresu","authenticated":"Vaše emailová adresa byla autorizována přes službu %{provider}.","frequency_immediately":"Pokud jste obsah dosud nečetli, pošleme vám ho ihned emailem.","frequency":{"one":"Email vám zašleme pouze pokud jste se neukázali během poslední minuty.","few":"Email vám zašleme pouze pokud jste se neukázali během posledních %{count} minut.","many":"Email vám zašleme pouze pokud jste se neukázali během posledních %{count} minut.","other":"Email vám zašleme pouze pokud jste se neukázali během posledních %{count} minut."}},"associated_accounts":{"title":"Propojené účty","connect":"Připojit","revoke":"Odpojit","cancel":"Zrušit","not_connected":"(nepřipojeno)"},"name":{"title":"Jméno","instructions":"vaše celé jméno (nepovinné)","instructions_required":"Vaše celé jméno","too_short":"Máte moc krátké jméno","ok":"Parádní jméno"},"username":{"title":"Uživatelské jméno","instructions":"jedinečné, bez mezer, krátké","short_instructions":"Lidé vás mohou zmínit pomocí @%{username}","available":"Vaše uživatelské jméno je volné","not_available":"Není k dispozici. Co třeba %{suggestion}?","not_available_no_suggestion":"Není k dispozici","too_short":"Uživatelské jméno je moc krátké","too_long":"Uživatelské jméno je moc dlouhé","checking":"Zjišťuji, zda je uživatelské jméno volné...","prefilled":"Email je propojen s tímto uživatelským jménem"},"locale":{"title":"Jazyk rozhraní","instructions":"Jazyk uživatelského prostředí. Změna obnoví stránku.","default":"(výchozí)","any":"jakýkoliv"},"password_confirmation":{"title":"Heslo znovu"},"auth_tokens":{"title":"Nedávno použitá zařízení","details":"Podrobnosti","log_out_all":"Odhlásit všechny","not_you":"Nejste to vy?","show_all":"Ukázat vše (%{count})","show_few":"Ukázat méně","was_this_you":"Byla to vaše návštěva?","browser_and_device":"%{browser} na %{device}"},"last_posted":"Poslední příspěvek","last_seen":"Naposledy viděn","created":"Účet vytvořen","log_out":"Odhlásit se","location":"Lokace","website":"Webová stránka","email_settings":"Emailová upozornění","hide_profile_and_presence":"Skrýt můj veřejný profil a informace o mé přítomnosti","text_size":{"normal":"Normální"},"like_notification_frequency":{"title":"Upozornit mě na \"to se mi líbí\"","always":"Vždy","first_time_and_daily":"Po prvé a pak každý den","first_time":"Po prvé","never":"Nikdy"},"email_previous_replies":{"title":"Zahrnout předchozí reakce na konci emailů","unless_emailed":"pokud nebyli dříve odeslány","always":"vždy","never":"nikdy"},"email_digests":{"every_30_minutes":"každých 30 minut","every_hour":"každou hodinu","daily":"denně","weekly":"týdně","every_month":"každý měsíc","every_six_months":"každých šest měsíců"},"email_level":{"title":"Zašli mi email, pokud mě někde cituje, odpoví na můj příspěvek, zmíní mé @jméno nebo mě pozve do tématu.","always":"vždy","never":"nikdy"},"email_messages_level":"Zašli mi email, pokud mi někdo pošle zprávu.","include_tl0_in_digests":"Zahrnout obsah nových uživatelů v souhrnných emailech","email_in_reply_to":"Zahrnout v emailech úryvek příspěvku, na který je reagováno","other_settings":"Ostatní","categories_settings":"Kategorie","new_topic_duration":{"label":"Považovat témata za nová, pokud","not_viewed":"jsem je dosud neviděl.","last_here":"byla vytvořena od mé poslední návštěvy.","after_1_day":"vytvořeno během posledního dne","after_2_days":"vytvořeno během posledních 2 dnů","after_1_week":"vytvořeno během posledního týdne","after_2_weeks":"vytvořeno během posledních 2 týdnů"},"auto_track_topics":"Automaticky sledovat témata, která navštívím","auto_track_options":{"never":"nikdy","immediately":"ihned","after_30_seconds":"po 30 sekundách","after_1_minute":"po 1 minutě","after_2_minutes":"po 2 minutách","after_3_minutes":"po 3 minutách","after_4_minutes":"po 4 minutách","after_5_minutes":"po 5 minutách","after_10_minutes":"po 10 minutách"},"notification_level_when_replying":"Když přidám příspěvek k tématu, nastav toto téma na:","invited":{"title":"Pozvánky","pending_tab":"Čeká na schválení","pending_tab_with_count":"Nevyřízeno (%{count})","redeemed_tab":"Uplatněno","redeemed_tab_with_count":"Vyřízeno (%{count})","invited_via":"Pozvání","groups":"Skupiny","topic":"Témata","edit":"Upravit","remove":"Odstranit","reinvited":"Pozvánka byla opětovně odeslána.","search":"pište pro hledání v pozvánkách...","user":"Pozvaný uživatel","none":"Nejsou žádné pozvánky k zobrazení.","truncated":{"one":"Zobrazena první pozvánka.","few":"Zobrazeno prvních %{count} pozvánek.","many":"Zobrazeno prvních %{count} pozvánek.","other":"Zobrazeno prvních %{count} pozvánek."},"redeemed":"Uplatněné pozvánky","redeemed_at":"Uplatněno","pending":"Nevyřízené pozvánky","topics_entered":"Zobrazil témat","posts_read_count":"Přečteno příspěvků","expired":"Poznávka je už prošlá.","reinvite_all_confirm":"Opravdu chcete znovu poslat všechny pozvánky?","time_read":"Čas čtení","days_visited":"Přítomen dnů","account_age_days":"Stáří účtu ve dnech","create":"Pozvat","valid_for":"Odkaz pozvánky je platný pouze pro tuto emailovou adresu: %{email}","invite_link":{"success":"Odkaz pozvánky byl úspěšně vygenerován!"},"bulk_invite":{"error":"Omlouváme se, soubor by měl být ve formátu CSV."}},"password":{"title":"Heslo","too_short":"Vaše heslo je příliš krátké.","common":"Toto heslo je používané moc často.","same_as_username":"Vaše heslo je stejné jako Vaše uživatelské jméno.","same_as_email":"Vaše heslo je stejné jako váš e-mail.","ok":"Vaše heslo je v pořádku.","instructions":"alespoň %{count} znaků"},"summary":{"title":"Souhrn","stats":"Statistiky","time_read":"načteno","recent_time_read":"poslední čas čtení","topic_count":{"one":"téma vytvořeno","few":"témata vytvořena","many":"témat vytvořeno","other":"témat vytvořeno"},"post_count":{"one":"příspěvek vytvořen","few":"příspěvky vytvořeny","many":"příspěvků vytvořeno","other":"příspěvků vytvořeno"},"likes_given":{"one":"dán","few":"dány","many":"dáno","other":"dáno"},"likes_received":{"one":"obdržen","few":"obdrženy","many":"obdrženo","other":"obdrženo"},"days_visited":{"one":"den navštíven","few":"dny navštíveno","many":"dní navštíveno","other":"dní navštíveno"},"topics_entered":{"one":"zobrazeno téma","few":"zobrazeny témata","many":"zobrazeno témat","other":"zobrazeno témat"},"posts_read":{"one":"přečten příspěvek","few":"přečteny příspěvky","many":"přečteno příspěvků","other":"přečteno příspěvků"},"bookmark_count":{"one":"záložka","few":"záložky","many":"záložek","other":"záložek"},"top_replies":"Nejnovější příspěvky","no_replies":"Zatím žádné odpovědi.","more_replies":"Více odpovědí","top_topics":"Nejnovější témata","no_topics":"Zatím žádné témata.","more_topics":"Více témat","top_badges":"Nejnovější odznaky","no_badges":"Zatím žádné odznaky.","more_badges":"Více odznaků","top_links":"Nejnovější odkazy","no_links":"Zatím žádné odkazy.","most_liked_by":"Nejvíce \"to se mi líbí\" od uživatele","most_liked_users":"Nejvíce \"to se mi líbí\"","most_replied_to_users":"Nejvíce odpovědí","no_likes":"Zatím žádné \"to se mi líbí\"","top_categories":"Nej kategorie","topics":"Témata","replies":"Odpovědi"},"ip_address":{"title":"Poslední IP adresa"},"registration_ip_address":{"title":"Registrační IP adresa"},"avatar":{"title":"Profilový obrázek","header_title":"profil, zprávy, záložky a nastavení"},"title":{"title":"Titul","none":"(žádný)"},"flair":{"none":"(žádný)"},"primary_group":{"title":"Hlavní skupina","none":"(žádný)"},"filters":{"all":"Všechno"},"stream":{"posted_by":"Zaslal","sent_by":"Odeslal","private_message":"zpráva","the_topic":"téma"},"date_of_birth":{"user_title":"Dnes máte narozeniny!","title":"Dnes jsou moje narozeniny!","label":"Datum narození"},"anniversary":{"user_title":"Dnes je výročí dne, kdy jste se připojili k naší komunitě!","title":"Dnes je výročí dne, kdy jsem se připojil(a) k této komunitě!"}},"loading":"Načítám...","errors":{"prev_page":"při nahrávání stránky","reasons":{"network":"Chyba sítě","server":"Chyba serveru","forbidden":"Přístup zamítnut","unknown":"Chyba","not_found":"Stránka nenalezena"},"desc":{"network":"Prosím zkontrolujte své připojení.","network_fixed":"Looks like it's back.","server":"Kód chyby: %{status}","forbidden":"Nemáte povolení to spatřit.","not_found":"Jejda, aplikace zkusila načíst neexistující URL.","unknown":"Něco se pokazilo."},"buttons":{"back":"Zpět","again":"Zkusit znovu","fixed":"Nahrávám"}},"modal":{"close":"zavřít"},"close":"Zavřít","logout":"Byli jste odhlášeni.","refresh":"Obnovit","home":"Domů","read_only_mode":{"enabled":"Tato stránka je v režimu jen pro čtení. Prosim pokračujte v prohlížení, ale odpovídání a ostatní operace jsou momentálně vypnuté.","login_disabled":"Přihlášení je zakázáno jelikož je stránka v režimu jen pro čtení.","logout_disabled":"Odhlášení je zakázáno zatímco je stránka v režimu jen pro čtení."},"learn_more":"více informací...","first_post":"První příspěvek","mute":"Ignorovat","unmute":"Zrušit ignorování","last_post":"Přispěl","time_read":"Přečteno","time_read_recently":"%{time_read}nedávno","time_read_tooltip":"%{time_read}celkový čas čtení","time_read_recently_tooltip":"%{time_read}celkový čas čtení (%{recent_time_read}za posledních 60 dnů)","last_reply_lowercase":"poslední odpověď","replies_lowercase":{"one":"odpověď","few":"odpovědi","many":"odpovědí","other":"odpovědí"},"signup_cta":{"sign_up":"Registrovat se","hide_session":"Připomenout mi zítra","hide_forever":"děkuji, ne","intro":"Zdravíčko! Vypadá to, že si užíváte naše diskuze, ale ještě nemáte vlastní účet.","value_prop":"Pokud si založíš účet, budeme si přesně pamatovat, co jsi četl, takže se vždycky vrátíš do bodu, odkud jsi odešel. Také budeš dostávat upozornění zde a přes e-mail, kdykoli ti někdo odpoví. A můžeš přidávat 'to se mi líbí' a šířit tak lásku. :heartpulse:"},"summary":{"enabled_description":"Čtete shrnutí tohoto tématu: nejzajímavější příspěvky podle komunity.","enable":"Přepnout na \"nejlepší příspěvky\"","disable":"Přepnout na normální zobrazení"},"deleted_filter":{"enabled_description":"Toto téma obsahuje schované smazané příspěvky.","disabled_description":"Smazané příspěvky v tomto tématu jsou zobrazeny.","enable":"Schovat smazané příspěvky","disable":"Zobrazit smazané příspěvky"},"private_message_info":{"title":"Zpráva","add":"Přidat...","leave_message":"Opravdu chcete opustit tuto zprávu?","remove_allowed_user":"Určitě chcete odstranit %{name} z této zprávy?","remove_allowed_group":"Opravdu chcete odstranit %{name} z této zprávy?"},"email":"Email","username":"Uživatelské jméno","last_seen":"Naposledy viděn","created":"Vytvořeno","created_lowercase":"vytvořeno","trust_level":"Důvěryhodnost","search_hint":"uživatelské jméno, email nebo IP adresa","create_account":{"header_title":"Vítejte!","failed":"Něco se nepovedlo, možná je tato e-mailová adresa již použita. Zkuste použít formulář pro obnovení hesla."},"forgot_password":{"title":"Obnovení hesla","action":"Zapomněl jsem své heslo","invite":"Vložte svoje uživatelské jméno nebo e-mailovou adresu a my vám zašleme postup pro obnovení hesla.","reset":"Resetovat heslo","complete_username":"Pokud nějaký účet odpovídá uživatelskému jménu \u003cb\u003e%{username}\u003c/b\u003e, obdržíte záhy email s instrukcemi jak dál postupovat v resetování hesla.","complete_email":"Pokud nějaký účet odpovídá emailu \u003cb\u003e%{email}\u003c/b\u003e, obdržíte záhy email s instrukcemi jak dál postupovat v resetování hesla.","complete_username_not_found":"Nebyl nalezen účet s uživatelským jménem \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Nebyl nalezen účet s odpovídající emailu \u003cb\u003e%{email}\u003c/b\u003e","help":"Nepříšel email? Nezapomeňte nejprve zkontrolovat složku spam. \u003cp\u003eNevíte, kterou e-mailovou adresu jste použili? Zadejte e-mailovou adresu a my vás budeme informovat, pokud zde existuje.\u003c/p\u003e \u003cp\u003ePokud již nemáte přístup k e-mailové adrese ve vašem účtu, kontaktujte prosím \u003ca href='%{basePath}/about'\u003enaši ochotnou redakci\u003c/a\u003e\u003c/p\u003e.","button_ok":"OK","button_help":"Nápověda"},"email_login":{"link_label":"Chci odkaz na login do emailu","button_label":"přes email","emoji":"uzamknout emoji","complete_username":"Pokud je tu účet, který používá uživatelské jméno \u003cb\u003e%{username}\u003c/b\u003e, měl by vám za chvilku přijít email s přihlašovacím odkazem.","complete_email":"Pokud je tu účet s emailovou adresou \u003cb\u003e%{email}\u003c/b\u003e, měl by vám za chvilku přijít email s přihlašovacím odkazem.","complete_username_found":"Našli jsme účet s uživatelským jménem \u003cb\u003e%{username}\u003c/b\u003e, za chvilku by měl přijít email s přihlašovacím odkazem.","complete_email_found":"Našli jsme účet s emailovou adresou \u003cb\u003e%{email}\u003c/b\u003e, za chvilku by měl přijít email s přihlašovacím odkazem.","complete_username_not_found":"Nebyl nalezen účet s uživatelským jménem \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Nebyl nalezen účet s emailem \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Pokračovat na %{site_name}"},"login":{"username":"Uživatel","password":"Heslo","second_factor_title":"Dvoufaktorové ověření","second_factor_description":"Prosím zadejte autentikační kód z vaší aplikace:","second_factor_backup_description":"Prosíme zadejte jeden ze svých záložních kódů:","caps_lock_warning":"zapnutý Caps Lock","error":"Neznámá chyba","rate_limit":"Počkejte před dalším pokusem se přihlásit.","blank_username":"Zadejte vaši emailovou adresu a uživatelské jméno.","blank_username_or_password":"Vyplňte prosím email nebo uživatelské jméno, a heslo.","reset_password":"Resetovat heslo","logging_in":"Přihlašuji...","or":"Nebo","authenticating":"Autorizuji...","awaiting_activation":"Váš účet nyní čeká na aktivaci, použijte odkaz pro zapomenuté heslo, jestli chcete, abychom vám zaslali další aktivační email.","awaiting_approval":"Váš účet zatím nebyl schválen členem redakce. Až se tak stane, budeme vás informovat emailem.","requires_invite":"Promiňte, toto fórum je pouze pro zvané.","not_activated":"Ještě se nemůžete přihlásit. Zaslali jsme vám aktivační email v \u003cb\u003e%{sentTo}\u003c/b\u003e. Prosím následujte instrukce v tomto emailu, abychom mohli váš účet aktivovat.","admin_not_allowed_from_ip_address":"Z této IP adresy se nemůžete přihlásit jako administrátor.","resend_activation_email":"Klikněte sem pro zaslání aktivačního emailu.","resend_title":"Znovu odeslat aktivační email","change_email":"Změnit emailovou adresu","provide_new_email":"Zadejte novou adresu na kterou chcete zaslat potvrzovací email.","submit_new_email":"Aktualizovat emailovou adresu","sent_activation_email_again":"Zaslali jsme vám další aktivační email na \u003cb\u003e%{currentEmail}\u003c/b\u003e. Může trvat několik minut, než vám dorazí. Zkontrolujte také vaši složku s nevyžádanou pošlou.","to_continue":"Přihlaš se, prosím","preferences":"Pro to, aby jsi mohl měnit své uživatelské nastavení, se musíš přihlásit.","not_approved":"Váš účet zatím nebyl schválen. Až se tak stane, obdržíte oznámení emailem a budete se moci přihlásit.","google_oauth2":{"name":"Google","title":"přes Google"},"twitter":{"name":"Twitter","title":"přes Twitter"},"instagram":{"name":"Instagram","title":"s Instagramem"},"facebook":{"name":"Facebook","title":"přes Facebook"},"github":{"name":"GitHub","title":"přes GitHub"},"discord":{"name":"Discord"}},"invites":{"accept_title":"Pozvání","welcome_to":"Vítejte na %{site_name}!","invited_by":"Pozvání od:","social_login_available":"Budete se moci také přihlásit pomocí libovolné sociální sítě používající tento email.","your_email":"Emailová adresa vašeho účtu je \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Přijmout pozvání","success":"Váš účet byl vytvořen a nyní jste přihlášeni.","name_label":"Jméno","password_label":"Heslo","optional_description":"(volitelné)"},"password_reset":{"continue":"Pokračovat na %{site_name}"},"emoji_set":{"apple_international":"Apple/Mezinárodní","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Pouze kategorie","categories_with_featured_topics":"Kategorie a vybrané příspěvky","categories_and_latest_topics":"Kategorie a nejnovější témata","categories_and_top_topics":"Kategorie a populární témata","categories_boxes":"Boxy s podkategoriemi","categories_boxes_with_topics":"Boxy s vybranými tématy"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt"},"conditional_loading_section":{"loading":"Načítá se..."},"select_kit":{"delete_item":"Smazat %{name}","default_header_text":"Vybrat…","no_content":"Nebyly nalezeny žádné výsledky","filter_placeholder":"Hledat...","filter_placeholder_with_any":"Vyhledat nebo vytvořit...","create":"Vytvořit: '%{content}'","max_content_reached":{"one":"Můžete vybrat jen %{count} položku.","few":"Můžete vybrat jen %{count} položky.","many":"Můžete vybrat pouze %{count} položek.","other":"Můžete vybrat jen %{count} položek."},"min_content_not_reached":{"one":"Vyberte nejméně %{count} položku.","few":"Vyberte nejméně %{count} položky.","many":"Vyberte nejméně %{count} položek.","other":"Vyberte nejméně %{count} položek."}},"date_time_picker":{"from":"Od koho","to":"Komu"},"emoji_picker":{"filter_placeholder":"Hledat emoji","objects":"Objekty","flags":"Nahlášení","recent":"Nedávno použité","default_tone":"Bez barvy pleti","light_tone":"Světlá pleť","medium_light_tone":"Krémově světlá pleť","medium_tone":"Mírně hnědá pleť","medium_dark_tone":"Hnědá pleť","dark_tone":"Černá pleť","default":"Vlastní emoji"},"shared_drafts":{"title":"Sdílené koncepty","destination_category":"Cílová kategorie","publish":"Zveřejnit sdílený koncept","confirm_publish":"Určitě chceš zveřejnit tento koncept?","publishing":"Zveřejňuji téma..."},"composer":{"emoji":"Smajlíky :)","more_emoji":"více...","options":"Možnosti","whisper":"šeptat","unlist":"neviditelné","add_warning":"Toto je oficiální varování.","toggle_whisper":"Přepnout šeptání","toggle_unlisted":"Přepnout neviditelné","posting_not_on_topic":"Rozepsali jste odpověď na téma \"%{title}\", ale nyní máte otevřené jiné téma.","saved_local_draft_tip":"uloženo lokálně","similar_topics":"Podobná témata","drafts_offline":"koncepty offline","group_mentioned":{"one":"Zmíněním %{group}, upozorníš \u003ca href='%{group_link}'\u003e%{count} člověka\u003c/a\u003e – jste si jistý/á?","few":"Zmíněním %{group}, upozorníš \u003ca href='%{group_link}'\u003e%{count} lidi\u003c/a\u003e – jste si jistý/á?","many":"Zmíněním %{group}, upozorníš \u003ca href='%{group_link}'\u003e%{count} lidí\u003c/a\u003e – jste si jistý/á?","other":"Zmíněním %{group}, upozorníš \u003ca href='%{group_link}'\u003e%{count} lidí\u003c/a\u003e – jste si jistý/á?"},"cannot_see_mention":{"category":"Zmínili jste uživatele %{username}, ale oznámení se mu nepošle, protože nemá přístup do této kategorie. Budete jej muset přidat do skupiny, která má přístup do této kategorie.","private":"Zmínili jste uživatele %{username}, ale oznámení se mu nepošle, protože tuto osobní zprávu nevidí. Musíte ho pozvat do této osobní konverzace."},"duplicate_link":"Zdá se, že odkaz na \u003cb\u003e%{domain}\u003c/b\u003e už uvedl v tomto tématu \u003cb\u003e@ %{username}\u003c/b\u003e v \u003ca href='%{post_url}'\u003eodpovědi %{ago}\u003c/a\u003e - opravdu chcete odkaz poslat znovu?","error":{"title_missing":"Název musí být vyplněn","category_missing":"Musíte vybrat kategorii"},"save_edit":"Uložit změnu","overwrite_edit":"Přepsat úpravu","reply_original":"Odpovědět na původní téma","reply_here":"Odpovědět sem","reply":"Odpovědět","cancel":"Zrušit","create_topic":"Vytvořit téma","create_pm":"Zpráva","create_whisper":"Šeptat","create_shared_draft":"Vytvořit sdílený koncept","edit_shared_draft":"Upravit sdílený koncept","users_placeholder":"Přidat uživatele","title_placeholder":"O čem je ve zkratce tato diskuze?","title_or_link_placeholder":"Sem vložte název téma","edit_reason_placeholder":"proč byla nutná úprava?","topic_featured_link_placeholder":"Zadej odkaz ukázaný názvem","remove_featured_link":"Odstranit odkaz z tématu.","reply_placeholder":"Pište sem. Můžete použít Markdown, BBCode nebo HTML. Obrázky nahrajte přetáhnutím nebo vložením ze schránky.","reply_placeholder_no_images":"Pište sem. Můžete použít Markdown, BBCode nebo HTML.","view_new_post":"Zobrazit váš nový příspěvek.","saving":"Ukládám","saved":"Uloženo!","uploading":"Nahrávám...","quote_post_title":"Citovat celý příspěvek","bold_label":"B","bold_title":"Tučně","bold_text":"tučný text","italic_label":"I","italic_title":"Kurzíva","italic_text":"text kurzívou","link_title":"Odkazy","link_description":"sem vložte popis odkazu","link_dialog_title":"Vložit odkaz","link_optional_text":"volitelný popis","blockquote_title":"Bloková citace","blockquote_text":"Bloková citace","code_title":"Ukázka kódu","code_text":"odsadit předformátovaný text o 4 mezery","paste_code_text":"napište nebo vložte kód tady","upload_title":"Obrázek","upload_description":"sem vložek popis obrázku","olist_title":"Číslovaný seznam","ulist_title":"Odrážkový seznam","list_item":"Položka seznam","toggle_direction":"Přepnout směr","help":"Nápověda pro Markdown","collapse":"minimalizovat panel editoru","abandon":"zavřít editor a zahodit koncept","enter_fullscreen":"otevřít editor na celou obrazovku","exit_fullscreen":"opustit editor na celou obrazovku","modal_ok":"OK","modal_cancel":"Zrušit","cant_send_pm":"Bohužel, nemůžete poslat zprávu uživateli %{username}.","yourself_confirm":{"title":"Zapomněl/a jste přidat přijemce?","body":"Nyní tuto zprávu posíláte pouze sám/sama sobě!"},"admin_options_title":"Volitelné redakční nastavení tématu","composer_actions":{"reply":"Odpověď","draft":"Koncept","edit":"Upravit","reply_to_post":{"desc":"Odpovědět na konkrétní příspěvek"},"reply_as_new_topic":{"label":"Odpovědět v propojeném tématu","desc":"Vytvořit nové téma propojené s tímto tématem"},"reply_as_private_message":{"label":"Nová zpráva","desc":"Vytvořit novou osobní zprávu"},"reply_to_topic":{"label":"Odpovědět na téma","desc":"Odpovědět na téma, ale ne na konkrétní příspěvek"},"toggle_whisper":{"label":"Přepnout šeptání","desc":"Šeptání vidí pouze redaktoři"},"create_topic":{"label":"Nové téma"},"shared_draft":{"label":"Sdílený koncept"},"toggle_topic_bump":{"label":"Přepnout zvýraznění tématu","desc":"Odpovědět bez ovlivnění data poslední odpovědi"}},"ignore":"ignorovat","details_title":"Souhrn","details_text":"Tento text bude skrytý"},"notifications":{"tooltip":{"regular":{"one":"%{count} nepřečtene upozornění","few":"%{count} nepřečtená upozornění","many":"%{count} nepřečtených upozornění","other":"%{count} nepřečtených upozornění"},"message":{"one":"%{count} nepřečtená zpráva","few":"%{count} nepřečtené zprávy","many":"%{count} nepřečtených zpráv","other":"%{count} nepřečtených zpráv"}},"title":"oznámení o zmínkách pomocí @name, odpovědi na vaše příspěvky a témata, zprávy, atd.","none":"Notifikace nebylo možné načíst.","empty":"Žádné upozornění nenalezeny.","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} a %{count} další\u003c/span\u003e %{description}","few":"\u003cspan class='multi-user'\u003e%{username}, %{username2} a %{count} další\u003c/span\u003e %{description}","many":"\u003cspan class='multi-user'\u003e%{username}, %{username2} a %{count} dalších\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} a %{count} dalších\u003c/span\u003e %{description}"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e přijal vaše pozvání","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e přesunul %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Získáno '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNové téma\u003c/span\u003e %{description}","reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","group_message_summary":{"one":"%{count} zpráva ve schránce skupiny %{group_name}","few":"%{count} zprávy ve schránce skupiny %{group_name}","many":"%{count} zpráv ve schránce skupiny %{group_name}","other":"%{count} zpráv ve schránce skupiny %{group_name}"},"popup":{"mentioned":"%{username} vás zmínil v \"%{topic}\" - %{site_title}","group_mentioned":"Uživatel %{username} vás zmínil v \"%{topic}\" - %{site_title}","quoted":"%{username} vás citoval v \"%{topic}\" - %{site_title}","replied":"%{username} vám odpověděl v \"%{topic}\" - %{site_title}","posted":"%{username} přispěl do \"%{topic}\" - %{site_title}","private_message":"%{username} vám poslal soukromou zprávu v \"%{topic}\" - %{site_title}","linked":"%{username} odkázal na vás příspěvek v \"%{topic}\" - %{site_title}","confirm_title":"Upozornění zapnuta - %{site_title}","confirm_body":"Upozornění úspěšně zapnuta."},"titles":{"watching_first_post":"nové téma"}},"upload_selector":{"uploading":"Nahrávám","select_file":"Vyberte soubor","default_image_alt_text":"obrázek"},"search":{"sort_by":"Seřadil","relevance":"Relevance","latest_post":"Poslední příspěvek","latest_topic":"Nejnovější téma","most_viewed":"Nejzobrazovanější","most_liked":"Nejoblíbenější","select_all":"Vybrat vše","clear_all":"Vymazat vše","too_short":"Hledaný výraz je příliš krátký.","result_count":{"one":"\u003cspan\u003e%{count} výsledek pro\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","few":"\u003cspan\u003e%{count}%{plus} výsledky pro\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","many":"\u003cspan\u003e%{count}%{plus} výsledků pro\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} výsledků pro\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"Vyhledat","full_page_title":"Vyhledat","no_results":"Nenalezeny žádné výsledky.","no_more_results":"Nenalezeny žádné další výsledky.","post_format":"#%{post_number} od %{username}","results_page":"Výsledky hledání pro '%{term}'","more_results":"Existuje více výsledků. Prosím zpřesněte kritéria vyhledávání.","cant_find":"Nemůžete najít, co hledáte?","start_new_topic":"Možná vytvořte nové téma?","or_search_google":"Nebo zkuste vyhledávat pomocí Google:","search_google":"Zkuste vyhledávat pomocí Google:","search_google_button":"Google","search_button":"Vyhledat","categories":"Kategorie","tags":"Štítky","type":{"users":"Uživatelé","categories":"Kategorie"},"context":{"user":"Vyhledat příspěvky od @%{username}","category":"Hledat v kategorii #%{category}","topic":"Vyhledat v tomto tématu","private_messages":"Hledat ve zprávách"},"advanced":{"posted_by":{"label":"Od uživatele"},"in_category":{"label":"V kategorii"},"in_group":{"label":"Ve skupině"},"with_badge":{"label":"S odznakem"},"with_tags":{"label":"Se štítkem"},"filters":{"label":"Pouze v tématech/příspěvcích, které","title":"Hledat jen v nadpisu","likes":"se mi líbí","posted":"Přidal jsem příspěvek","watching":"Sleduji","tracking":"Sleduji.","private":"v mých zprávách","bookmarks":"Mám v záložkách","first":"jsou první příspěvek v tématu","pinned":"jsou připnuty","seen":"která jsem četl","unseen":"jsem nečetl","wiki":"jsou wiki","images":"včetně obrázků","all_tags":"Všechny uvedené štítky"},"statuses":{"label":"Kde příspěvky","open":"jsou otevřeny","closed":"jsou zavřeny","archived":"jsou archivovány","noreplies":"jsou bez odpovědi","single_user":"obsahují jen jednoho uživatele"},"post":{"count":{"label":"Příspěvky"},"time":{"label":"Přidáno","before":"před","after":"po"}},"views":{"label":"Zobrazení"}}},"new_item":"nové","go_back":"jít zpět","not_logged_in_user":"stránka uživatele s přehledem o aktuální činnosti a nastavení","current_user":"jít na vaši uživatelskou stránku","topics":{"new_messages_marker":"poslední návštěva","bulk":{"select_all":"Vybrat vše","clear_all":"Zrušit vše","unlist_topics":"Odebrat témata ze seznamu","relist_topics":"Znovunačíst seznam témat","reset_read":"reset přečteného","delete":"Smazat témata","dismiss":"Označit jako přečtené","dismiss_read":"Označit všechno nepřečtené jako přečtené","dismiss_button":"Označit jako přečtené...","dismiss_tooltip":"Označit jako přečtené jen nové příspěvky nebo přestat sledovat témata","also_dismiss_topics":"Přestat sledovat tyto témata, takže se mi znovu nezobrazí jako nepřečtená","dismiss_new":"Označit jako přečtené vše nové","toggle":"hromadný výběr témat","actions":"Hromadné akce","close_topics":"Zavřít téma","archive_topics":"Archivovat témata","move_messages_to_inbox":"Přesunout do doručených","choose_new_category":"Zvolte novou kategorii pro témata:","selected":{"one":"Vybrali jste \u003cb\u003e%{count}\u003c/b\u003e téma.","few":"Vybrali jste \u003cb\u003e%{count}\u003c/b\u003e témata.","many":"Vybrali jste \u003cb\u003e%{count}\u003c/b\u003e témat.","other":"Vybrali jste \u003cb\u003e%{count}\u003c/b\u003e témat."},"change_tags":"Zaměnit štítky","append_tags":"Přidat štítky","choose_new_tags":"Zvolte nové tagy pro témata:","choose_append_tags":"Zvolte nové tagy, které se mají přiřadit k těmto tématům:","changed_tags":"Tagy témat byly změněny."},"none":{"unread":"Nemáte žádná nepřečtená témata.","new":"Nemáte žádná nová témata ke čtení.","read":"Zatím jste nečetli žádná témata.","posted":"Zatím jste nepřispěli do žádného tématu.","bookmarks":"V tématech nemáte žádné záložky.","category":"V kategorii %{category} nejsou žádná témata.","top":"Nejsou tu žádná populární témata."},"bottom":{"latest":"Nejsou tu žádná další témata z poslední doby.","posted":"Nejsou tu žádná další zaslaná témata k přečtení.","read":"Nejsou tu žádná další přečtená témata.","new":"Nejsou tu žádná další nová témata k přečtení.","unread":"Nejsou tu žádná další nepřečtená témata.","category":"V kategorii %{category} nejsou žádná další témata.","tag":"V kategorii %{tag} nejsou žádná další témata.","top":"Nejsou tu žádná další populární témata.","bookmarks":"Žádná další oblíbená témata nejsou k dispozici."}},"topic":{"filter_to":{"one":"%{count} příspěvek v tématu","few":"%{count} příspěvky v tématu","many":"%{count} příspěvků v tématu","other":"%{count} příspěvků v tématu"},"create":"Nové téma","create_long":"Vytvořit nové téma","open_draft":"Otevřít koncept","private_message":"Vytvořit zprávu","archive_message":{"help":"Přesunout zprávy do archívu","title":"Archív"},"move_to_inbox":{"title":"Přesunout do Přijaté","help":"Přesunout zprávu zpět do Přijaté"},"edit_message":{"help":"Upravit první příspěvek zprávy","title":"Upravit"},"defer":{"title":"Odložit"},"list":"Témata","new":"nové téma","unread":"nepřečtený","new_topics":{"one":"%{count} nové téma","few":"%{count} nová témata","many":"%{count} nových témat","other":"%{count} nových témat"},"unread_topics":{"one":"%{count} nepřečtené téma","few":"%{count} nepřečtená témata","many":"%{count} nepřečtených témat","other":"%{count} nepřečtených témat"},"title":"Téma","invalid_access":{"title":"Téma je soukromé","description":"Bohužel nemáte přístup k tomuto tématu.","login_required":"Musíte se přihlásit, abyste viděli toto téma."},"server_error":{"title":"Téma se nepodařilo načíst","description":"Bohužel není možné načíst toto téma, může to být způsobeno problémem s vaším připojením. Prosím, zkuste stránku načíst znovu. Pokud bude problém přetrvávat, dejte nám vědět."},"not_found":{"title":"Téma nenalezeno","description":"Bohužel se nám nepovedlo najít toto téma. Nebylo odstraněno moderátorem?"},"unread_posts":{"one":"máte %{count} nepřečtený příspěvek v tomto tématu","few":"máte %{count} nepřečtené příspěvky v tomto tématu.","many":"máte %{count} nepřečtených příspěvků v tomto tématu.","other":"máte %{count} nepřečtených příspěvků v tomto tématu."},"likes":{"one":"v tomto tématu je jedno 'líbí se'","few":"v tomto tématu tématu je %{count} 'líbí se'","many":"v tomto tématu tématu je %{count} 'líbí se'","other":"v tomto tématu tématu je %{count} 'líbí se'"},"back_to_list":"Zpátky na seznam témat","options":"Možnosti","show_links":"zobrazit odkazy v tomto tématu","read_more_in_category":"Chcete si toho přečíst víc? Projděte si témata v %{catLink} nebo %{latestLink}.","read_more":"Chcete si přečíst další informace? %{catLink} nebo %{latestLink}.","browse_all_categories":"Projděte všechny kategorie","view_latest_topics":"zobrazte si populární témata","jump_reply_up":"přejít na předchozí odpověď","jump_reply_down":"přejít na následující odpověď","deleted":"Téma bylo smazáno","slow_mode_update":{"enable":"Zapnout","remove":"Vypnout"},"topic_status_update":{"title":"Časovač tématu","save":"Nastavit časovač ","num_of_hours":"Počet hodin:","remove":"Odstranit časovač","publish_to":"Publikovat v:","when":"Když:","time_frame_required":"Vyberte prosím časové období","duration":"Doba trvání"},"auto_update_input":{"none":"Vyberte časové období","later_today":"Později během dnešního dne","tomorrow":"Zítra","later_this_week":"Později během tohoto týdne","this_weekend":"Tento týden","next_week":"Další týden","next_month":"Další měsíc","forever":"Navždy","pick_date_and_time":"Vyberte datum a čas","set_based_on_last_post":"Zavřít na základě posledního příspěvku"},"publish_to_category":{"title":"Naplánovat publikování"},"temp_open":{"title":"Otevřít dočasně"},"temp_close":{"title":"Zavřít dočasně"},"auto_close":{"title":"Automaticky zavřít téma","error":"Prosím zadejte platnou hodnotu.","based_on_last_post":"Neuzavírejte téma dokud poslední příspěvek v tomto tématu není alespoň takto starý."},"auto_delete":{"title":"automaticky smazat téma"},"reminder":{"title":"Připomeň mi"},"status_update_notice":{"auto_open":"Toto téma se automaticky otevře %{timeLeft}.","auto_close":"Toto téma se automaticky zavře %{timeLeft}.","auto_publish_to_category":"Toto téma bude zveřejněno v \u003ca href=%{categoryUrl}\u003e%{categoryName}\u003c/a\u003e%{timeLeft}# .","auto_close_after_last_post":"Toto téma se zavře %{duration} po poslední odpovědi.","auto_delete":"Toto téma bude automaticky smazáno %{timeLeft}.","auto_reminder":"Toto téma ti připomeneme %{timeLeft}."},"auto_close_title":"Nastavení automatického zavření","auto_close_immediate":{"one":"Poslední příspěvek v témetu je již %{count} hodinu starý, takže toto téma bude okamžitě uzavřeno.","few":"Poslední příspěvek v témetu je již %{count} hodiny starý, takže toto téma bude okamžitě uzavřeno.","many":"Poslední příspěvek v témetu je již %{count} hodin starý, takže toto téma bude okamžitě uzavřeno.","other":"Poslední příspěvek v témetu je již %{count} hodin starý, takže toto téma bude okamžitě uzavřeno."},"timeline":{"back":"Zpět","back_description":"Přejít na poslední nepřečtený příspěvek","replies_short":"%{current} / %{total}"},"progress":{"title":"pozice v tématu","go_top":"nahoru","go_bottom":"dolů","go":"go","jump_bottom":"na poslední příspěvek","jump_prompt":"přejít na...","jump_prompt_long":"Přejít na...","jump_bottom_with_number":"Skočit na příspěvěk %{post_number}","jump_prompt_to_date":"do data","jump_prompt_or":"nebo","total":"celkem příspěvků","current":"aktuální příspěvek"},"notifications":{"title":"změňte, jak často budete upozornění na toto téma","reasons":{"mailing_list_mode":"Máš povolený mailový seznam, takže budeš upozorňován na odpovědi k tomuto tématu přes e.mail.","3_10":"Budete dostávat oznámení, protože hlídáte štítek na tomto tématu.","3_6":"Budete dostávat oznámení, protože hlídáte tuhle kategorii.","3_5":"Budete dostávat oznámení, protože jste tohle téma automaticky začali hlídat.","3_2":"Budete dostávat oznámení, protože hlídáte toto téma.","3_1":"Budete dostávat oznámení, protože jste autorem totoho tématu.","3":"Budete dostávat oznámení, protože hlídáte toto téma.","2_8":"Uvidíte počet nových odpovědí, jelikož sledujete tuto kategorii.","2_4":"Uvidíte počet nových odpovědí, jelikož jste přispěli do tohoto tématu.","2_2":"Uvidíte počet nových odpovědí, jelikož sledujete toto téma.","2":"You will see a count of new replies because you \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eread this topic\u003c/a\u003e.","1_2":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek.","1":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek.","0_7":"Ignorujete všechna oznámení v této kategorii.","0_2":"Ignorujete všechna oznámení z tohoto tématu.","0":"Ignorujete všechna oznámení z tohoto tématu."},"watching_pm":{"title":"Hlídání","description":"Budete informováni o každém novém příspěvku v této zprávě. Vedle názvu tématu se objeví počet nepřečtených příspěvků."},"watching":{"title":"Hlídané","description":"Budete informováni o každém novém příspěvku v tomto tématu. Vedle názvu tématu se objeví počet nepřečtených příspěvků."},"tracking_pm":{"title":"Sledování","description":"U této zprávy se zobrazí počet nových příspěvků. Budete upozorněni, pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek."},"tracking":{"title":"Sledované","description":"U tohoto tématu se zobrazí počet nových příspěvků. Budete upozorněni, pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek."},"regular":{"title":"Normální","description":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek."},"regular_pm":{"title":"Normální","description":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek."},"muted_pm":{"title":"Ztišení","description":"Nikdy nedostanete oznámení týkající se čehokoliv v této zprávě."},"muted":{"title":"Ztišené","description":"Nikdy nedostanete nic ohledně tohoto tématu a nezobrazí se v aktuálních."}},"actions":{"title":"Akce","recover":"Vrátit téma","delete":"Odstranit téma","open":"Otevřít téma","close":"Zavřít téma","multi_select":"Vybrat příspěvky…","timed_update":"Nastavit časovač tématu...","pin":"Připevnit téma","unpin":"Odstranit připevnění","unarchive":"Navrátit z archivu","archive":"Archivovat téma","invisible":"Zneviditelnit","visible":"Zviditelnit","reset_read":"Vynulovat počet čtení","make_private":"Vytvořit soukromou zprávu ","reset_bump_date":"Resetovat datum zvýraznění"},"feature":{"pin":"Připevnit téma","unpin":"Odstranit připevnění","pin_globally":"Připnout téma globálně","remove_banner":"Remove Banner Topic"},"reply":{"title":"Odpovědět","help":"Začít psát odpověď na toto téma"},"share":{"title":"Sdílet","help":"sdílet odkaz na toto téma","invite_users":"Pozvat"},"print":{"title":"Tisk","help":"Otevři verzi tématu určenou k tisku"},"flag_topic":{"title":"Nahlásit","help":"Soukromě nahlásit tento příspěvek moderátorům","success_message":"Téma úspěšně nahlášeno."},"feature_topic":{"title":"Povýšit téma","pin":"Zobrazit toto téma na vrcholu kategorie %{categoryLink} dokud","unpin":"Odstranit toto téma z vrcholu %{categoryLink} kategorie.","unpin_until":"Odstranit toto téma z vrcholu kategorie %{categoryLink}, nebo počkat dokud \u003cstrong\u003e%{until}\u003c/strong\u003e","pin_note":"Uživatelé mohou odepnout téma sami pro sebe.","pin_validation":"Pro připíchnutí tohoto tématu je třeba datum.","not_pinned":"V kategorii %{categoryLink} nejsou žádná připnutá témata.","already_pinned":{"one":"Připevněné téma v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"Připevněná témata v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"Připevněná témata v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Připevněná témata v %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Zobrazit toto téma na vrcholu seznamu všech témat dokud","unpin_globally":"Odstranit toto téma z vrcholu všech seznamů s tématy.","unpin_globally_until":"Odstranit toto téma z vrcholu seznamu všech témat nebo počat dokud \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Uživatelé mohou odepnout téma sami pro sebe.","not_pinned_globally":"Nemáte žádná globálně připevněná témata.","already_pinned_globally":{"one":"V současnosti globálně připevněná témata: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","few":"V současnosti globálně připevněná témata: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","many":"V současnosti globálně připevněná témata: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"V současnosti globálně připevněná témata: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Udělat z tohoto tématu banner, který se zobrazí na vrcholu všech stránek.","remove_banner":"Odstranit banner, který se zobrazuje na vrcholu všech stránek.","banner_note":"Uživatelé mohou odmítnout banner jeho zavřením. V jeden moment může být pouze jedno téma jako banner.","no_banner_exists":"Žádné téma není jako banner.","banner_exists":"V současnosti \u003cstrong class='badge badge-notification unread'\u003eje\u003c/strong\u003e zde téma jako banner."},"inviting":"Odesílám pozvánku...","automatically_add_to_groups":"Tato pozvánka obsahuje také přístup do těchto skupin:","invite_private":{"title":"Pozvat do konverzace","email_or_username":"Email nebo uživatelské jméno pozvaného","email_or_username_placeholder":"emailová adresa nebo uživatelské jméno","action":"Pozvat","success":"Pozvali jsme tohoto uživatele, aby se připojil do této zprávy.","success_group":"Pozvali jsme tuto skupinu, aby se připojila do této zprávy.","error":"Bohužel nastala chyba při odesílání pozvánky.","group_name":"název skupiny"},"controls":"Správa témat","invite_reply":{"title":"Pozvat k diskuzi","username_placeholder":"uživatelské jméno","action":"Poslat pozvánku","help":"pozval ostatní do tohoto tématu pomocí emailu nebo notifikací","discourse_connect_enabled":"Zadej uživatelské jméno člověka, kterého chceš pozvat do tohoto tématu.","to_topic_blank":"Zadej uživatelské jméno a email člověka, kterého chceš pozvat do tohoto tématu.","to_topic_email":"Zadal jste emailovou adresu. Pošleme na ni pozvánku, s jejíž pomocí bude moci váš kamarád ihned odpovědět do tohoto tématu.","to_topic_username":"Zadali jste uživatelské jméno. Zašleme pozvánku s odkazem do tohoto tématu.","to_username":"Zadejte uživatelské jméno člověka, kterého chcete pozvat. Zašleme pozvánku s odkazem do tohoto tématu.","email_placeholder":"jmeno@priklad.cz","success_email":"Zaslali jsme pozvánku na \u003cb\u003e%{invitee}\u003c/b\u003e. Upozorníme vás až bude pozvánka použita. Své pozvánky můžete sledovat v tabulce pozvánek na svém uživatelském profilu.","success_username":"Pozvali jsme zadaného uživatele, aby se zúčastnil tématu.","error":"Bohužel se nepodařilo pozvat tuto osobu. Možná už byla pozvána? (Počet opakovaných pozvánek je omezen).","success_existing_email":"Uživatel s e-mailem\u003cb\u003e%{emailOrUsername}\u003c/b\u003e již existuje. Pozvali jsme ho, aby se zúčastnil tohoto tématu."},"login_reply":"Přihlaste se, chcete-li odpovědět","filters":{"n_posts":{"one":"Je zobrazen pouze %{count} příspěvek","few":"Jsou zobrazeny pouze %{count} příspěvky","many":"Je zobrazeno pouze %{count} příspěvků","other":"Je zobrazeno pouze %{count} příspěvků"},"cancel":"Zrušit filtr"},"split_topic":{"title":"Rozdělit téma","action":"do nového tématu","radio_label":"Nové téma","error":"Bohužel nastala chyba při rozdělování tématu.","instructions":{"one":"Chystáte se vytvořit nové téma a naplnit ho příspěvkem, který jste označili.","few":"Chystate se vytvořit noté téma a naplnit ho \u003cb\u003e%{count}\u003c/b\u003e příspěvky, které jste označili.","many":"Chystate se vytvořit noté téma a naplnit ho \u003cb\u003e%{count}\u003c/b\u003e příspěvky, které jste označili.","other":"Chystate se vytvořit noté téma a naplnit ho \u003cb\u003e%{count}\u003c/b\u003e příspěvky, které jste označili."}},"merge_topic":{"title":"Sloučit téma","action":"do jiného tématu","error":"Bohužel nastala chyba při slučování tématu.","instructions":{"one":"Prosím, vyberte téma, do kterého chcete příspěvek přesunout.","few":"Prosím, vyberte téma, do kterého chcete tyto \u003cb\u003e%{count}\u003c/b\u003e příspěvky přesunout.","many":"Prosím, vyberte téma, do kterého chcete těchto \u003cb\u003e%{count}\u003c/b\u003e příspěvků přesunout.","other":"Prosím, vyberte téma, do kterého chcete těchto \u003cb\u003e%{count}\u003c/b\u003e příspěvků přesunout."}},"move_to_new_message":{"radio_label":"Nová zpráva"},"merge_posts":{"title":"Sluč vybrané příspěvky","action":"sluč vybrané příspěvky","error":"Během slučování vybraných příspěvků došlo k chybě."},"publish_page":{"public":"Veřejné"},"change_owner":{"title":"Změnit vlastníka","action":"změnit autora","error":"Chyba při měnění autora u příspevků.","placeholder":"uživatelské jméno nového autora","instructions":{"one":"Prosíme vyberte nového vlastníka pro příspěvek od \u003cb\u003e@%{old_user}\u003c/b\u003e","few":"Prosíme vyberte nového vlastníka pro %{count} příspěvky od \u003cb\u003e@%{old_user}\u003c/b\u003e","many":"Prosíme vyberte nového vlastníka pro %{count} příspěvků od \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Prosíme vyberte nového vlastníka pro %{count} příspěvků od \u003cb\u003e@%{old_user}\u003c/b\u003e"}},"change_timestamp":{"title":"Změnit časové razítko...","action":"změnit časovou značku","invalid_timestamp":"Časová značka nemůže být v budoucnosti.","error":"Nastala chyba při změně časové značky tématu.","instructions":"Zvol novou časovou značku tématu, prosím. Příspěvky v tématu se aktualizují tak aby měly stejný rozdíl v čase."},"multi_select":{"select":"vybrat","selected":"vybráno (%{count})","select_post":{"label":"vybrat","title":"Přidat příspěvek do výběru"},"selected_post":{"label":"vybrané","title":"Kliknutím odstraníte příspěvek z výběru"},"select_replies":{"label":"vybrat +odpovědi","title":"Přidej příspěvek a všechny jeho odpovědi do výběru"},"select_below":{"label":"vybrat +níže","title":"Přidat příspěvek a vše po něm do výběru"},"delete":"smazat označené","cancel":"zrušit označování","select_all":"vybrat všechny","deselect_all":"zrušit výběr","description":{"one":"Máte označen \u003cb\u003e%{count}\u003c/b\u003e příspěvek.","few":"Máte označeny \u003cb\u003e%{count}\u003c/b\u003e příspěvky.","many":"Máte označeno \u003cb\u003e%{count}\u003c/b\u003e příspěvků.","other":"Máte označeno \u003cb\u003e%{count}\u003c/b\u003e příspěvků."}}},"post":{"quote_reply":"Cituj","quote_edit":"Upravit","quote_share":"Sdílet","edit_reason":"Důvod: ","post_number":"příspěvek č. %{number}","reply_as_new_topic":"Odpovědět v propojeném tématu","reply_as_new_private_message":"Odpověď poslat jako zprávu stejným příjemcům. ","continue_discussion":"Pokračování diskuze z %{postLink}:","follow_quote":"přejít na citovaný příspěvek","show_full":"Zobrazit celý příspěvek","collapse":"kolaps","expand_collapse":"rozbalit/sbalit","locked":"Personál znemožnil upravování na tomto příspěvku","gap":{"one":"zobrazit %{count} skrytou odpověď","few":"zobrazit %{count} skryté odpovědi","many":"zobrazit %{count} skrytých odpovědí","other":"zobrazit %{count} skrytých odpovědí"},"unread":"Příspěvek je nepřečtený.","has_replies":{"one":"%{count} odpověď","few":"%{count} odpovědi","many":"%{count} odpovědí","other":"%{count} odpovědí"},"has_likes_title":{"one":"%{count} člověku se líbí tento příspěvek","few":"%{count} lidem se líbí tento příspěvek","many":"%{count} lidem se líbí tento příspěvek","other":"%{count} lidem se líbí tento příspěvek"},"has_likes_title_only_you":"tento příspěvek se mi líbí","has_likes_title_you":{"one":"vám a %{count} dalšímu člověku se tento příspěvek líbí","few":"vám a %{count} dalším lidem se tento příspěvek líbí","many":"vám a %{count} dalším lidem se tento příspěvek líbí","other":"vám a %{count} dalším lidem se tento příspěvek líbí"},"errors":{"create":"Bohužel nastala chyba při vytváření příspěvku. Prosím zkuste to znovu.","edit":"Bohužel nastala chyba při editaci příspěvku. Prosím zkuste to znovu.","upload":"Bohužel nastala chyba při nahrávání příspěvku. Prosím zkuste to znovu.","too_many_uploads":"Bohužel, najednou smíte nahrát jen jeden soubor.","upload_not_authorized":"Bohužel, soubor, který se snažíš nahrát, není povolený (povolená rozšíření: %{authorized_extensions}). ","image_upload_not_allowed_for_new_user":"Bohužel, noví uživatelé nemohou nahrávat obrázky.","attachment_upload_not_allowed_for_new_user":"Bohužel, noví uživatelé nemohou nahrávat přílohy.","attachment_download_requires_login":"Omlouváme se, ale pro stáhnutí přílohy musíte být přihlášen."},"cancel_composer":{"discard":"Zahodit"},"via_email":"tento příspěvek byl přijat přes email","via_auto_generated_email":"tento příspěvek byl přijat přes automaticky generovaný email","whisper":"tento příspěvek je soukromé šeptání pro moderátory","wiki":{"about":"toto je wiki příspěvek"},"few_likes_left":"Díky za šíření lásky! Zbývá ti pro dnešek už jen několik málo lajků.","controls":{"reply":"otevře okno pro sepsání odpovědi na tento příspěvek","like":"to se mi líbí","has_liked":"tento příspěvek se mi líbí","undo_like":"už se mi to nelíbí","edit":"upravit příspěvek","edit_action":"Upravit","edit_anonymous":"Omlouváme se, ale pro editaci tohoto příspěvku musíte být přihlášení.","flag":"nahlásit příspěvek moderátorovi","delete":"smazat příspěvek","undelete":"obnovit příspěvek","share":"sdílet odkaz na tento příspěvek","more":"Více","delete_replies":{"confirm":"Chceš také smazat odpovědi k tomuto příspěvku? ","direct_replies":{"one":"Ano a %{count} přímá odpověď","few":"Ano a další přímé odpovědi","many":"Ano a další %{count} odpovědi","other":"Ano a další %{count} odpovědi"},"all_replies":{"one":"Ano a další %{count} odpověď","few":"Ano a dalších %{count} odpovědí","many":"Ano a dalších %{count} odpovědí","other":"Ano a dalších %{count} odpovědí"},"just_the_post":"Ne, pouze tento příspěvek"},"admin":"post admin actions","wiki":"Převést na wiki","unwiki":"Odstranit Wiki","convert_to_moderator":"Zvýraznit barevně","revert_to_regular":"Zrušit zvýraznění","rebake":"Obnovit HTML","unhide":"Odkrýt","lock_post":"Uzamknout příspěvek ","lock_post_description":"Zabránit přispěvatelům v úpravách tohoto příspěvku","unlock_post":"Odemknout příspěvek","unlock_post_description":"Dovolit přispěvatelům úpravy tohoto příspěvku","delete_topic_disallowed_modal":"Nemáte práva smazat toto téma. Pokud opravdu má být smazáno, označte ho pro moderátory a popište důvody.","delete_topic_disallowed":"nemáte práva smazat toto téma","delete_topic":"smazat téma"},"actions":{"people":{"like":{"one":"se líbí","few":"se líbí","many":"se líbí","other":"se líbí"},"like_capped":{"one":"a jednomu dalšímu se to líbí","few":"a %{count} dalším se to líbí","many":"a %{count} dalším se to líbí","other":"a %{count} dalším se to líbí"}},"by_you":{"off_topic":"Označili jste tento příspěvek jako off-topic","spam":"Označili jste tento příspěvek jako spam","inappropriate":"Označili jste tento příspěvek jako nevhodný","notify_moderators":"Nahlásili jste tento příspěvek","notify_user":"Tomuto uživateli jste zaslali zprávu"}},"delete":{"confirm":{"one":"Jsi si jistý, že chceš smazat tento příspěvek?","few":"Jsi si jistý, že chceš smazat tyto všechny %{count} příspěvky? ","many":"Jsi si jistý, že chceš smazat tyto všechny %{count} příspěvky? ","other":"Jsi si jistý, že chceš smazat tyto všechny %{count} příspěvky? "}},"merge":{"confirm":{"one":"Opravdu chceš sloučit tyto příspěvky?","few":"Opravdu chceš sloučit %{count} příspěvky?","many":"Opravdu chceš sloučit %{count} příspěvků?","other":"Opravdu chceš sloučit %{count} příspěvků?"}},"revisions":{"controls":{"first":"První revize","previous":"Předchozí revize","next":"Další revize","last":"Poslední revize","hide":"Schovejte revizi","show":"Zobrazte revizi","edit_wiki":"Upravit Wiki","edit_post":"upravit příspěvek"},"displays":{"inline":{"title":"Vykreslený příspěvek se změnami zobrazenými v textu","button":"HTML"},"side_by_side":{"title":"Rozdíli mezi vykreslenými příspěveky vedle sebe","button":"HTML"},"side_by_side_markdown":{"title":"Show the raw source diffs side-by-side","button":"původní"}}},"raw_email":{"displays":{"raw":{"title":"Ukázat původní email","button":"původní"},"text_part":{"title":"Ukázat textovou část emailu","button":"Text"},"html_part":{"title":"Zobrazit html část emailu","button":"HTML"}}},"bookmarks":{"created":"Vytvořený","name":"Jméno","options":"Možnosti"}},"category":{"none":"(bez kategorie)","all":"Všechny kategorie","choose":"kategorie\u0026hellip;","edit":"Upravit","view":"Zobrazit témata v kategorii","general":"Základní","settings":"Nastavení","topic_template":"Šablona tématu","tags":"Štítky","tags_placeholder":"(Volitelné) seznam dovolených štítků","tag_groups_placeholder":"(Volitelné) seznam dovolených skupin štítků","topic_featured_link_allowed":"Povolit zobrazené odkazy v této kategorii","delete":"Smazat kategorii","create":"Nová kategorie","create_long":"Vytvořit novou kategorii","save":"Uložit kategorii","slug":"Odkaz kategorie","slug_placeholder":"(Dobrovolné) podtržená URL","creation_error":"Během vytváření nové kategorie nastala chyba.","save_error":"Během ukládání kategorie nastala chyba.","name":"Název kategorie","description":"Popis","logo":"Logo kategorie","background_image":"Obrázek na pozadí této kategorie","badge_colors":"Barvy štítku","background_color":"Barva pozadí","foreground_color":"Barva textu","name_placeholder":"Měl by být krátký a výstižný.","color_placeholder":"Jakákoliv webová barva","delete_confirm":"Opravdu chcete odstranit tuto kategorii?","delete_error":"Nastala chyba při odstraňování kategorie.","list":"Seznam kategorií","no_description":"Doplňte prosím popis této kategorie.","change_in_category_topic":"navštivte téma kategorie pro editaci jejího popisu","already_used":"Tato barva je již použita jinou kategorií","security":"Zabezpečení","permissions":{"group":"Skupina","see":"Prohlížet","reply":"Odpovědět","create":"Vytvořit"},"special_warning":"Varování: Tato kategorie je přednastavená a její nastavení bezpečnosti nelze změnit. Pokud tuto kategorii nechcete používat, tak ji smažte a nesnažte se ji měnit.","images":"Obrázky","email_in":"Vlastní příchozí emailová adresa:","email_in_allow_strangers":"Přijímat emaily i od neregistrovaných uživatelů","email_in_disabled":"Přidávání nových témat před email je zakázáno v Nastavení fóra. K povolení nových témat přes email,","email_in_disabled_click":"povolit nastavení \"email in\"","mailinglist_mirror":"Kategorie kopíruje mailing list","show_subcategory_list":"Ukázat seznam podkategorií nad tématy v této kategorii.","num_featured_topics":"Počet témat, která se zobrazují na stránce kategorie ","subcategory_num_featured_topics":"Počet zobrazených témat na stránce nadřazené kategorie:","all_topics_wiki":"Automaticky zakládat nová témata jako wiki","subcategory_list_style":"Styl seznamu podkategorií: ","sort_order":"Seznam témat seřazený podle: ","default_view":"Výchozí seznam témat: ","default_top_period":"Výchozí hlavní doba:","allow_badges_label":"Povolit používání odznaků v této kategorii","edit_permissions":"Upravit oprávnění","review_group_name":"název skupiny","require_topic_approval":"Požadovat schválení moderátorů pro všechna nová témata","require_reply_approval":"Požadovat schválení moderátorů pro všechny nové odpovědi","this_year":"letos","default_position":"Výchozí umístění","position_disabled":"Kategorie jsou zobrazovány podle pořadí aktivity. Pro kontrolu pořadí kategorií v seznamech,","position_disabled_click":"povolte nastavení \"neměnné pozice kategorií\" (fixed category positions).","minimum_required_tags":"Nejmenší počet tagů požadovaných pro téma:","parent":"Nadřazená kategorie","num_auto_bump_daily":"Počet otevřených témat, která mají být denně automaticky zvýrazněna:","navigate_to_first_post_after_read":"Přesunout na první příspěvek, jakmile jsou přečtena témata","notifications":{"watching":{"title":"Hlídání"},"watching_first_post":{"title":"Hlídání prvního příspěvku"},"tracking":{"title":"Sledování"},"regular":{"title":"Normální","description":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek."},"muted":{"title":"Ztišený"}},"search_priority":{"options":{"normal":"Normální","ignore":"ignorovat","high":"Vysoká"}},"sort_options":{"default":"výchozí","likes":"Líbí se","op_likes":"Původní \"Líbí se\" u příspěvků","views":"Zobrazení","posts":"Příspěvky","activity":"Aktivita","posters":"Přispěvatelé","category":"Kategorie","created":"Vytvořena"},"sort_ascending":"Vzestupně","sort_descending":"Sestupně","subcategory_list_styles":{"rows":"Řady","rows_with_featured_topics":"Řádky s vybranými tématy","boxes":"Boxy ","boxes_with_featured_topics":"Boxy s vybranými tématy"},"settings_sections":{"general":"Základní","email":"Email"}},"flagging":{"title":"Děkujeme, že pomáháte udržovat komunitu zdvořilou!","action":"Nahlásit příspěvek","take_action_options":{"default":{"title":"Zakročit","details":"Ihned dosáhni vlaječky prahu, než aby jsi čekal na více komunitních vlaječek"},"suspend":{"title":"Suspend User"},"silence":{"title":"ztišit uživatele"}},"notify_action":"Zpráva","official_warning":"Oficiální varování","delete_spammer":"Odstranit spamera","yes_delete_spammer":"Ano, odstranit spamera","ip_address_missing":"(N/A)","hidden_email_address":"(skrytý)","submit_tooltip":"Podat soukromé nahlášení","take_action_tooltip":"Ihned dosáhni vlaječky prahu, než aby jsi čekal na více komunitních vlaječek","cant":"Bohužel nyní nemůžete tento příspěvek nahlásit.","notify_staff":"Napište členům redakce soukromě","formatted_name":{"off_topic":"Je to mimo téma.","inappropriate":"Je to nevhodné","spam":"Je to spam"},"custom_placeholder_notify_user":"Buďte věcný, konstruktivní a vždy zdvořilý.","custom_placeholder_notify_moderators":"Sdělte nám, co vás přesně trápí a kde to bude možné, tak nám poskytněte související odkazy a příklady.","custom_message":{"at_least":{"one":"zadejte alespoň %{count} znak","few":"zadejte alespoň %{count} znaky","many":"zadejte alespoň %{count} znaků","other":"zadejte alespoň %{count} znaků"},"more":{"one":"ještě %{count}...","few":"ještě %{count}...","many":"ještě %{count}...","other":"ještě %{count}..."},"left":{"one":"%{count} zbývá","few":"%{count} zbývají","many":"%{count} zbývá","other":"%{count} zbývá"}}},"flagging_topic":{"title":"Děkujeme, že pomáháte udržovat komunitu zdvořilou!","action":"Nahlásit téma","notify_action":"Zpráva"},"topic_map":{"title":"Souhrn tématu","participants_title":"Častí přispěvatelé","links_title":"Populární odkazy","links_shown":"zobrazit více odkazů...","clicks":{"one":"%{count} kliknutí","few":"%{count} kliknutí","many":"%{count} kliknutí","other":"%{count} kliknutí"}},"post_links":{"about":"expandovat více odkazů v tomto příspěvku","title":{"one":"%{count} více","few":"%{count} více","many":"%{count} více","other":"%{count} více"}},"topic_statuses":{"warning":{"help":"Toto je oficiální varování."},"bookmarked":{"help":"V tématu je vložena záložka"},"locked":{"help":"toto téma je uzavřené; další odpovědi nejsou přijímány"},"archived":{"help":"toto téma je archivováno; je zmraženo a nelze ho již měnit"},"locked_and_archived":{"help":"Toto téma je uzavřené a archivované; další odpovědi nejsou přijímány a změny nejsou možné"},"unpinned":{"title":"Nepřipnuté","help":"Pro vás toto téma není připnuté; bude se zobrazovat v běžném pořadí"},"pinned_globally":{"title":"Připnuté globálně","help":"Toto téma je připnuté; bude se zobrazovat na vrcholu aktuálních a ve své kategorii"},"pinned":{"title":"Připnuto","help":"Pro vás je toto téma připnuté; bude se zobrazovat na vrcholu seznamu ve své kategorii"},"unlisted":{"help":"Toto téma je neviditelné; nebude se zobrazovat v seznamu témat a lze ho navštívit pouze přes přímý odkaz"}},"posts":"Příspěvků","original_post":"Původní příspěvek","views":"Zobrazení","views_lowercase":{"one":"zobrazení","few":"zobrazení","many":"zobrazení","other":"zobrazení"},"replies":"Odpovědi","views_long":{"one":"Toto téma bylo zobrazeno %{count} krát","few":"Toto téma bylo zobrazeno %{number} krát","many":"Toto téma bylo zobrazeno %{number} krát","other":"Toto téma bylo zobrazeno %{number} krát"},"activity":"Aktivita","likes":"Líbí se","likes_lowercase":{"one":"líbí se","few":"líbí se","many":"líbí se","other":"líbí se"},"users":"Účastníci","users_lowercase":{"one":"uživatel","few":"uživatelé","many":"uživatelů","other":"uživatelů"},"category_title":"Kategorie","changed_by":"od uživatele %{author}","raw_email":{"title":"Příchozí email","not_available":"Není k dispozici!"},"categories_list":"Seznam kategorií","filters":{"with_topics":"%{filter} témata","with_category":"%{filter} %{category} témata","latest":{"title":"Aktuální","title_with_count":{"one":"Nedávné (%{count})","few":"Nedávná (%{count})","many":"Nedávná (%{count})","other":"Nedávná (%{count})"},"help":"aktuální témata"},"read":{"title":"Přečtená","help":"témata, která jste si přečetli"},"categories":{"title":"Kategorie","title_in":"Kategorie - %{categoryName}","help":"všechna témata seskupená podle kategorie"},"unread":{"title":"Nepřečtená","title_with_count":{"one":"Nepřečtená (%{count})","few":"Nepřečtená (%{count})","many":"Nepřečtená (%{count})","other":"Nepřečtená (%{count})"},"help":"témata, která sledujete nebo hlídáte, s nepřečtenými příspěvky","lower_title_with_count":{"one":"%{count} nepřečtené","few":"%{count} nepřečtených","many":"%{count} nepřečtených","other":"%{count} nepřečtených"}},"new":{"lower_title_with_count":{"one":"%{count} nové","few":"%{count} nová","many":"%{count} nových","other":"%{count} nových"},"lower_title":"nové","title":"Nová","title_with_count":{"one":"Nové","few":"Nová (%{count})","many":"Nová (%{count})","other":"Nová (%{count})"},"help":"témata vytvořená za posledních několik dní"},"posted":{"title":"Mé příspěvky","help":"témata, do kterých jste přispěli"},"bookmarks":{"title":"Záložky","help":"témata, do kterých jste si vložili záložku"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","few":"%{categoryName} (%{count})","many":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"populární témata v kategorii %{categoryName}"},"top":{"title":"Nejlepší","help":"výběr nejlepších témat za rok, měsíc, týden nebo den","all":{"title":"Za celou dobu"},"yearly":{"title":"Ročně"},"quarterly":{"title":"Čtvrtletně"},"monthly":{"title":"Měsíčně"},"weekly":{"title":"Týdně"},"daily":{"title":"Denně"},"all_time":"Za celou dobu","this_year":"Rok","this_quarter":"Čtvrtletí","this_month":"Měsíc","this_week":"Týden","today":"Dnes"}},"permission_types":{"full":"Vytvářet / Odpovídat / Prohlížet","create_post":"Odpovídat / Prohlížet","readonly":"Prohlížet"},"lightbox":{"download":"stáhnout","counter":"%curr% z %total%"},"keyboard_shortcuts_help":{"title":"Klávesové zkratky","jump_to":{"title":"Přejít na","home":"%{shortcut} Domů","latest":"%{shortcut} Poslední","new":"%{shortcut} Nový","unread":"%{shortcut} Nepřečtěné","categories":"%{shortcut} Kategorie","top":"%{shortcut} Nahoru","bookmarks":"%{shortcut} Záložky","profile":"%{shortcut} Profil","messages":"%{shortcut} Zprávy","drafts":"%{shortcut} Koncepty"},"navigation":{"title":"Navigace","jump":"%{shortcut} Přejdi na příspěvek #","back":"%{shortcut} Zpět","up_down":"%{shortcut} Posunout označení \u0026uarr; \u0026darr;","open":"%{shortcut} Otevři vybrané téma","next_prev":"%{shortcut} Následující/předchozí výběr"},"application":{"title":"Aplikace","create":"%{shortcut} Vytvořit nové téma","notifications":"%{shortcut} Otevře upozornění","hamburger_menu":"%{shortcut} Otevře hamburgerové menu","user_profile_menu":"%{shortcut} Otevře uživatelské menu","show_incoming_updated_topics":"%{shortcut} Ukáže aktualizovaná témata","search":"%{shortcut}Vyhledávání","help":"%{shortcut} Otevře seznam klávesových zkratek","dismiss_topics":"%{shortcut} Označit témata jako přečtená","log_out":"%{shortcut} Odhlásit se"},"composing":{"title":"Skládání","return":"%{shortcut}návrat ke skládání","fullscreen":"%{shortcut} Editor na celou obrazovku"},"actions":{"title":"Akce","bookmark_topic":"Přidat záložku na téma","pin_unpin_topic":"%{shortcut} Připnout/Odepnout téma","share_topic":"%{shortcut} Sdílet téma","share_post":"%{shortcut} Sdílet příspěvek","reply_as_new_topic":"%{shortcut} Odpovědět v propojeném tématu","reply_topic":"%{shortcut} Odpovědět na téma","reply_post":"%{shortcut} Odpovědět na příspěvek","quote_post":"%{shortcut} Citovat příspěvek","like":"%{shortcut} Dát \"líbí se\" k příspěvku","flag":"%{shortcut} Nahlásit příspěvek","bookmark":"%{shortcut} Přidat záložku na příspěvek","edit":"%{shortcut} Upravit příspěvek","delete":"%{shortcut} Smazat příspěvek","mark_muted":"%{shortcut} Ztišit téma","mark_regular":"%{shortcut}Obvyklé (výchozí) téma","mark_tracking":"%{shortcut} Sledovat téma","mark_watching":"%{shortcut} Hlídat téma","print":"%{shortcut} Vytiskni téma"}},"badges":{"earned_n_times":{"one":"Získal tento odznak krát","few":"Získal tento odznak krát","many":"Získal tento odznak %{count} krát","other":"Získal tento odznak %{count} krát"},"granted_on":"Získán %{date}","others_count":"Ostatní s tímto odznakem (%{count})","title":"Odznaky","allow_title":"Tento odznak můžeš použít jako titul","multiple_grant":"Toto si můžeš zasloužit několikrát","badge_count":{"one":"%{count} odznak","few":"%{count} odznaky","many":"%{count} odznaků","other":"%{count} odznaků"},"more_badges":{"one":"+%{count} další","few":"+%{count} další","many":"+%{count} dalších","other":"+%{count} dalších"},"granted":{"one":"%{count} přidělen","few":"%{count} přidělen","many":"%{count} přidělen","other":"%{count} přidělen"},"select_badge_for_title":"Vyberte odznak, který chcete použít jako svůj titul","none":"(žádný)","successfully_granted":"Úspěšně přidělený %{badge}uživateli%{username}","badge_grouping":{"getting_started":{"name":"Jak začít?"},"community":{"name":"Komunita"},"trust_level":{"name":"Věrohodnost"},"other":{"name":"Ostatní"},"posting":{"name":"Přispívání"}}},"download_calendar":{"download":"Stáhnout"},"tagging":{"all_tags":"Všechny štítky","other_tags":"Ostatní štítky ","selector_all_tags":"všechny štítky","selector_no_tags":"bez štítků","changed":"změněné štítky:","tags":"Štítky","choose_for_topic":"volitelné štítky","add_synonyms":"Přidat","delete_tag":"Smaž štítek","delete_confirm":{"one":"Jsi si jist, že chceš smazat tento štítek a odstranit ho z tématu, kterému je přiřazen?","few":"Jsi si jist, že chceš smazat tento štítek a odstranit ho z %{count} témat, kterým je přiřazen?","many":"Jsi si jist, že chceš smazat tento štítek a odstranit ho z %{count} témat, kterým je přiřazen?","other":"Jsi si jist, že chceš smazat tento štítek a odstranit ho z %{count} témat, kterým je přiřazen?"},"delete_confirm_no_topics":"Opravdu chceš smazat tento štítek? ","rename_tag":"Přejmenovat štítek","rename_instructions":"Vyber název nového štítku:","sort_by":"Seřadit dle:","sort_by_count":"počtu","sort_by_name":"jména","manage_groups":"Spravovat skupiny štítků","manage_groups_description":"Definice skupin pro organizaci štítků","upload":"Nahrát tagy","upload_instructions":"Jeden na řádek, případně se skupinou tagů ve formátu 'jméno_tagu,skupina_tagu'.","upload_successful":"Tagy úspěšně nahrány","cancel_delete_unused":"Zrušit","filters":{"without_category":"%{filter} %{tag} témata","with_category":"%{filter} %{tag} témata v %{category}","untagged_without_category":"%{filter} témata bez štítků","untagged_with_category":"%{filter} témata bez štítků v %{category}"},"notifications":{"watching":{"title":"Hlídání","description":"Budete automaticky sledovat všechna nová témata s těmito štítky. Na všechny nové příspěvky a témata budete upozorněni. Počet nových příspěvků se zobrazí vedle tématu."},"watching_first_post":{"title":"Hlídané první příspěvky"},"tracking":{"title":"Sledování","description":"Budete automaticky sledovat všechna témata s tímto tagem. Počet nepřečtených a nových příspěvků bude vidět vedle tématu."},"regular":{"title":"Běžný","description":"Budete informováni pokud někdo zmíní vaše @jméno nebo odpoví na váš příspěvek."},"muted":{"title":"Ztišené","description":"Nebudete upozorněni na žádná nová témata s tímto tagem, a nebudou se objevovat na vaší záložce s nepřečtenými."}},"groups":{"title":"Skupiny štítků","new":"Nová skupina","tags_label":"Štítky v této skupině","parent_tag_label":"Nadřazený štítek","one_per_topic_label":"Omezit na jeden štítek k tématu z této skupiny","new_name":"Nová skupina štítků","name_placeholder":"Jméno","save":"Uložit","delete":"Smazat","confirm_delete":"Jste si jistí, že chcete smazat tuto skupinu štítků?","everyone_can_use":"Tagy mohou být použity kýmkoliv"},"topics":{"none":{"unread":"Nemáte žádná nepřečtená témata.","new":"Nemáte žádná nová témata ke čtení.","read":"Zatím jste nečetli žádná témata.","posted":"Zatím jste nepřispěli do žádného tématu.","latest":"Nejsou tu žádná další témata z poslední doby k přečtení.","bookmarks":"V tématech nemáte žádné záložky.","top":"Nejsou tu žádná populární témata."}}},"invite":{"custom_message":"Aby byla pozvánka osobnější, napište \u003ca href\u003evlastní zprávu\u003c/a\u003e","custom_message_placeholder":"Vložte vlastní zprávu","custom_message_template_forum":"Ahoj! Měl by se připojit na toto fórum!","custom_message_template_topic":"Ahoj, myslím si, že by se ti mohlo tohle téma líbit!"},"forced_anonymous":"Kvůli vysoké zátěži dočasně všichni vidí stránku tak, jak by ji viděli nepřihlášení uživatelé.","footer_nav":{"back":"Zpět","share":"Sdílet","dismiss":"Označit jako přečtené"},"safe_mode":{"enabled":"Bezpečný režim je povolený, k jeho zakázání zavři toto okno prohlížeče"},"do_not_disturb":{"remaining":"%{remaining} zbývá","options":{"custom":"Přizpůsobené"}},"trust_levels":{"names":{"newuser":"nový uživatel","basic":"základní uživatel","member":"člen","regular":"pravidelný uživatel","leader":"vůdce"}},"user_activity":{"no_replies_others":"Žádné odpovědi."},"cakeday":{"today":"Dnes","tomorrow":"Zítra","upcoming":"Nadcházející","all":"Vše"},"birthdays":{"title":"Narozeniny","month":{"title":"Narozeniny v měsíci ","empty":"Nejsou zde žádní uživatelé oslavující tento měsíc narozeniny."},"upcoming":{"title":"Narozeniny pro %{start_date} - %{end_date}","empty":"Nejsou zde žádní uživatelé oslavující narozeniny v následujících 7 dnech."},"today":{"title":"Narozenin pro %{date}","empty":"Nejsou dnes žádní uživatelé oslavující své narozeniny."},"tomorrow":{"empty":"Zítra nejsou žádní uživatelé oslavující své narozeniny."}},"anniversaries":{"title":"Výročí","month":{"title":"Výročí v měsíci ","empty":"Nejsou zde žádní uživatelé oslavující svá výročí tento měsíc."},"upcoming":{"title":"Výročí pro %{start_date} - %{end_date}","empty":"Nejsou žádní uživatelé oslavující svá výročí během následujících 7 dní."},"today":{"title":"Výročí pro %{date}"}},"details":{"title":"Skrýt detaily"},"discourse_local_dates":{"create":{"form":{"date_title":"Datum","time_title":"Čas"}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Spustit návod pro všechny nové uživatele","welcome_message":"Poslat všem novým uživatelům uvítací zprávu s rychlým návodem jak začít"}},"presence":{"replying":{"one":"odpovídá","few":"odpovídá","many":"odpovídá","other":"odpovídá"},"editing":{"one":"upravuje","few":"upravuje","many":"upravuje","other":"upravuje"},"replying_to_topic":{"one":"odpovídá","few":"odpovídá","many":"odpovídá","other":"odpovídá"}},"poll":{"voters":{"one":"hlasující","few":"hlasujících","many":"hlasující","other":"hlasující"},"total_votes":{"one":"hlas celkem","few":"hlasy celkem","many":"hlasů celkem","other":"hlasů celkem"},"average_rating":"Průměrné hodnocení: \u003cstrong\u003e%{average}\u003c/strong\u003e.","cast-votes":{"title":"Hlasujte","label":"Hlasovat nyní!"},"show-results":{"title":"Zobrazit výsledky hlasování","label":"Ukaž výsledky"},"hide-results":{"title":"Zpět k hlasování"},"export-results":{"label":"Export"},"open":{"title":"Otevřít hlasování","label":"Otevřít","confirm":"Opravdu chcete otevřít toto hlasování?"},"close":{"title":"Zavřít hlasování","label":"Zavřít","confirm":"Opravdu chcete uzavřít toto hlasování?"},"error_while_toggling_status":"Došlo k chybě při změně statusu hlasování","error_while_casting_votes":"Došlo k chybě při odesílání vašeho hlasu.","error_while_fetching_voters":"Došlo k chybě při zobrazování hlasujících.","ui_builder":{"title":"Vytvořit hlasování","insert":"Vložit hlasování","help":{"invalid_values":"Minimální hodnota musí být menší než maximální hodnota.","min_step_value":"Minimální hodnota kroku je 1"},"poll_type":{"label":"Typ","regular":"Jedna možnost","multiple":"Více možností","number":"Číselné hodnocení"},"poll_config":{"step":"Krok"},"poll_public":{"label":"Zobrazit kdo hlasoval"}}},"styleguide":{"sections":{"typography":{"example":"Vítejte v Discourse"},"colors":{"title":"Barvy"},"icons":{"title":"Ikony"},"categories":{"title":"Kategorie"},"navigation":{"title":"Navigace"},"categories_list":{"title":"Seznam kategorií"},"topic_timer_info":{"title":"Časovače tématu "},"post":{"title":"Příspěvek"},"suggested_topics":{"title":"Doporučená témata"}}}}},"en":{"js":{"dates":{"wrap_on":"on %{date}","medium_with_ago":{"x_years":{"one":"%{count} year ago","other":"%{count} years ago"}},"from_placeholder":"from date"},"skip_to_main_content":"Skip to main content","software_update_prompt":{"message":"We've updated this site, \u003cspan\u003eplease refresh\u003c/span\u003e, or you may experience unexpected behavior."},"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)","eu_south_1":"EU (Milan)"}},"period_chooser":{"aria_label":"Filter by period"},"about":{"stat":{"last_day":"Last 24 hours","last_7_days":"Last 7 days","last_30_days":"Last 30 days"}},"bookmarked":{"edit_bookmark":"Edit Bookmark","help":{"edit_bookmark":"Click to edit the bookmark on this topic","edit_bookmark_for_topic":"Click to edit the bookmark for this topic","unbookmark_with_reminder":"Click to remove all bookmarks and reminders in this topic."}},"bookmarks":{"remove_reminder_keep_bookmark":"Remove reminder and keep bookmark"},"drafts":{"label_with_count":"Drafts (%{count})","new_private_message":"New personal message draft","abandon":{"confirm":"You have a draft in progress for this topic. What would you like to do with it?","no_value":"Resume editing"}},"processing_filename":"Processing: %{filename}...","choose_topic":{"title":{"search":"Search for a Topic","placeholder":"type the topic title, url or id here"}},"choose_message":{"none_found":"No messages found.","title":{"search":"Search for a Message","placeholder":"type the message title, url or id here"}},"review":{"order_by":"Order by","date_filter":"Posted between","explain":{"why":"explain why this item ended up in the queue","title":"Reviewable Scoring","formula":"Formula","subtotal":"Subtotal","min_score_visibility":"Minimum Score for Visibility","score_to_hide":"Score to Hide Post","take_action_bonus":{"name":"took action","title":"When a staff member chooses to take action the flag is given a bonus."},"user_accuracy_bonus":{"name":"user accuracy","title":"Users whose flags have been historically agreed with are given a bonus."},"trust_level_bonus":{"name":"trust level","title":"Reviewable items created by higher trust level users have a higher score."},"type_bonus":{"name":"type bonus","title":"Certain reviewable types can be assigned a bonus by staff to make them a higher priority."}},"stale_help":"This reviewable has been resolved by \u003cb\u003e%{username}\u003c/b\u003e.","claim_help":{"optional":"You can claim this item to prevent others from reviewing it.","required":"You must claim items before you can review them.","claimed_by_you":"You've claimed this item and can review it.","claimed_by_other":"This item can only be reviewed by \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"claim this topic"},"unclaim":{"help":"remove this claim"},"awaiting_approval":"Awaiting Approval","settings":{"priorities":{"title":"Reviewable Priorities"}},"view_all":"View All","grouped_by_topic":"Grouped by Topic","none":"There are no items to review.","view_pending":"view pending","topic_has_pending":{"one":"This topic has \u003cb\u003e%{count}\u003c/b\u003e post pending approval","other":"This topic has \u003cb\u003e%{count}\u003c/b\u003e posts pending approval"},"title":"Review","filtered_topic":"You have filtered to reviewable content in a single topic.","show_all_topics":"show all topics","deleted_post":"(post deleted)","deleted_user":"(user deleted)","user":{"bio":"Bio","website":"Website","fields":"Fields"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"},"agreed":{"one":"%{count}% agree","other":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree","other":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore","other":"%{count}% ignore"}},"topics":{"reviewable_count":"Count","reported_by":"Reported by"},"filters":{"priority":{"low":"Low"}},"approval":{"pending_posts":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e post pending.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e posts pending."}}},"relative_time_picker":{"minutes":{"one":"minute","other":"minutes"},"hours":{"one":"hour","other":"hours"},"months":{"one":"month","other":"months"},"years":{"one":"year","other":"years"}},"time_shortcut":{"two_weeks":"Two weeks","six_months":"Six months","relative":"Relative time","none":"None needed","last_custom":"Last custom datetime"},"directory":{"last_updated":"Last Updated:","edit_columns":{"title":"Edit Directory Columns","reset_to_default":"Reset to default"}},"groups":{"member_requested":"Requested at","add_members":{"title":"Add Users to %{group_name}","description":"Enter a list of users you want to invite to the group or paste in a comma separated list:","usernames_or_emails_placeholder":"usernames or emails","notify_users":"Notify users","set_owner":"Set users as owners of this group"},"requests":{"title":"Requests","accept":"Accept","deny":"Deny","denied":"denied","undone":"request undone","handle":"handle membership request"},"manage":{"add_members":"Add Users","email":{"status":"Synchronized %{old_emails} / %{total_emails} emails via IMAP.","enable_smtp":"Enable SMTP","enable_imap":"Enable IMAP","test_settings":"Test Settings","save_settings":"Save Settings","last_updated":"Last updated:","settings_required":"All settings are required, please fill in all fields before validation.","smtp_settings_valid":"SMTP settings valid.","smtp_title":"SMTP","smtp_instructions":"When you enable SMTP for the group, all outbound emails sent from the group's inbox will be sent via the SMTP settings specified here instead of the mail server configured for other emails sent by your forum.","imap_title":"IMAP","imap_additional_settings":"Additional Settings","imap_instructions":"When you enable IMAP for the group, emails are synced between the group inbox and the provided IMAP server and mailbox. SMTP must be enabled with valid and tested credentials before IMAP can be enabled. The email username and password used for SMTP will be used for IMAP. For more information see \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Warning: This is an alpha-stage feature. Only Gmail is officially supported. Use at your own risk!","imap_settings_valid":"IMAP settings valid.","smtp_disable_confirm":"If you disable SMTP, all SMTP and IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_disable_confirm":"If you disable IMAP all IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_mailbox_not_selected":"You must select a Mailbox for this IMAP configuration or no mailboxes will be synced!","prefill":{"title":"Prefill with settings for:","gmail":"GMail"},"credentials":{"title":"Credentials","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"Use SSL for SMTP","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"Use SSL for IMAP"},"settings":{"allow_unknown_sender_topic_replies":"Allow unknown sender topic replies.","allow_unknown_sender_topic_replies_hint":"Allows unknown senders to reply to group topics. If this is not enabled, replies from email addresses not already invited to the topic will create a new topic."},"mailboxes":{"synchronized":"Synchronized Mailbox","none_found":"No mailboxes were found in this email account.","disabled":"Disabled"}},"categories":{"long_title":"Category default notifications","description":"When users are added to this group, their category notification settings will be set to these defaults. Afterwards, they can change them.","watched_categories_instructions":"Automatically watch all topics in these categories. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_categories_instructions":"Automatically track all topics in these categories. A count of new posts will appear next to the topic.","watching_first_post_categories_instructions":"Users will be notified of the first post in each new topic in these categories.","regular_categories_instructions":"If these categories are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_categories_instructions":"Users will not be notified of anything about new topics in these categories, and they will not appear on the categories or latest topics pages."},"tags":{"long_title":"Tags default notifications","description":"When users are added to this group, their tag notification settings will be set to these defaults. Afterwards, they can change them.","watched_tags_instructions":"Automatically watch all topics with these tags. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_tags_instructions":"Automatically track all topics with these tags. A count of new posts will appear next to the topic.","watching_first_post_tags_instructions":"Users will be notified of the first post in each new topic with these tags.","regular_tags_instructions":"If these tags are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_tags_instructions":"Users will not be notified of anything about new topics with these tags, and they will not appear in latest."}},"members":{"no_filter_matches":"No members match that search."},"default_notifications":{"modal_title":"User default notifications","modal_description":"Would you like to apply this change historically? This will change preferences for %{count} existing users.","modal_no":"No, only apply change going forward"}},"categories":{"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week.","other":"%{count} new topics in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month.","other":"%{count} new topics in the past month."}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"notification_schedule":{"tip":"Outside of these hours you will be put in 'do not disturb' automatically.","midnight":"Midnight","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"read_help":"Recently read topics","feature_topic_on_profile":{"open_search":"Select a New Topic","title":"Select a Topic","search_label":"Search for Topic by title","clear":{"warning":"Are you sure you want to clear your featured topic?"}},"use_current_timezone":"Use Current Timezone","sr_expand_profile":"Expand profile details","sr_collapse_profile":"Collapse profile details","timezone":"Timezone","desktop_notifications":{"each_browser_note":"Note: You have to change this setting on every browser you use. All notifications will be disabled when in \"do not disturb\", regardless of this setting."},"no_messages_title":"You don’t have any messages","no_messages_body":"Need to have a direct personal conversation with someone, outside the normal conversational flow? Message them by selecting their avatar and using the %{icon} message button.\u003cbr\u003e\u003cbr\u003e If you need help, you can \u003ca href='%{aboutUrl}'\u003emessage a staff member\u003c/a\u003e.\n","no_bookmarks_title":"You haven’t bookmarked anything yet","no_bookmarks_body":"Start bookmarking posts with the %{icon} button and they will be listed here for easy reference. You can schedule a reminder too!\n","no_bookmarks_search":"No bookmarks found with the provided search query.","no_notifications_title":"You don’t have any notifications yet","no_notifications_body":"You will be notified in this panel about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","no_notifications_page_title":"You don’t have any notifications yet","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","dynamic_favicon":"Show counts on browser icon","skip_new_user_tips":{"description":"Skip new user onboarding tips and badges","not_first_time":"Not your first time?","skip_link":"Skip these tips","read_later":"I'll read it later."},"theme_default_on_all_devices":"Make this the default theme on all my devices","color_scheme_default_on_all_devices":"Set default color scheme(s) on all my devices","color_scheme":"Color Scheme","color_schemes":{"default_description":"Theme default","disable_dark_scheme":"Same as regular","dark_instructions":"You can preview the dark mode color scheme by toggling your device's dark mode.","dark":"Dark mode","default_dark_scheme":"(site default)"},"dark_mode":"Dark Mode","dark_mode_enable":"Enable automatic dark mode color scheme","text_size_default_on_all_devices":"Make this the default text size on all my devices","enable_defer":"Enable defer to mark topics unread","muted_categories_instructions_dont_hide":"You will not be notified of anything about new topics in these categories.","regular_categories_instructions":"You will see these categories in the “Latest” and “Top” topic lists.","muted_users_instructions":"Suppress all notifications and PMs from these users.","allowed_pm_users":"Allowed","allowed_pm_users_instructions":"Only allow PMs from these users.","allow_private_messages_from_specific_users":"Only allow specific users to send me personal messages","ignored_users_instructions":"Suppress all posts, notifications, and PMs from these users.","save_to_change_theme":"Theme will be updated after you click \"%{save_text}\"","messages":{"all":"all inboxes","personal":"Personal","new_with_count":{"one":"New (%{count})","other":"New (%{count})"},"warnings":"Official Warnings","read_more_in_group":"Want to read more? Browse other messages in %{groupLink}.","read_more":"Want to read more? Browse other messages in \u003ca href='%{basePath}/u/%{username}/messages'\u003epersonal messages\u003c/a\u003e."},"second_factor_backup":{"manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."}},"change_avatar":{"logo_small":"Site's small logo. Used by default."},"email":{"set_primary":"Set Primary Email","destroy":"Remove Email","add_email":"Add Alternate Email","auth_override_instructions":"Email can be updated from authentication provider.","admin_note":"Note: An admin user changing another non-admin user's email indicates the user has lost access to their original email account, so a reset password email will be sent to their new address. The user's email will not change until they complete the reset password process.","required":"Please enter an email address","invite_auth_email_invalid":"Your invitation email does not match the email authenticated by %{provider}","authenticated_by_invite":"Your email has been authenticated by the invitation"},"associated_accounts":{"confirm_modal_title":"Connect %{provider} Account","confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected.","account_specific":"Your %{provider} account '%{account_description}' will be used for authentication.","generic":"Your %{provider} account will be used for authentication."}},"name":{"required":"Please enter a name"},"username":{"required":"Please enter a username","edit":"Edit username"},"invite_code":{"title":"Invite Code","instructions":"Account registration requires an invite code"},"auth_tokens":{"was_this_you_description":"If it wasn’t you, we recommend you change your password and log out everywhere.","secure_account":"Secure my Account","latest_post":"You last posted…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactive now\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"enable_physical_keyboard":"Enable physical keyboard support on iPad","text_size":{"title":"Text Size","smallest":"Smallest","smaller":"Smaller","larger":"Larger","largest":"Largest"},"title_count_mode":{"title":"Background page title displays count of:","notifications":"New notifications","contextual":"New page content"},"email_digests":{"title":"When I don’t visit here, send me an email summary of popular topics and replies"},"email_level":{"only_when_away":"only when away"},"invited":{"expired_tab":"Expired","expired_tab_with_count":"Expired (%{count})","invited_via_link":"link %{key} (%{count} / %{max} redeemed)","sent":"Created/Last Sent","expires_at":"Expires","copy_link":"Get Link","reinvite":"Resend Email","removed":"Removed","remove_all":"Remove Expired Invites","removed_all":"All Expired Invites removed!","remove_all_confirm":"Are you sure you want to remove all expired invites?","reinvite_all":"Resend All Invites","reinvited_all":"All Invites Sent!","generate_link":"Create Invite Link","link_generated":"Here's your invite link!","single_user":"Invite by email","multiple_user":"Invite by link","invite_link":{"title":"Invite Link","error":"There was an error generating Invite link","max_redemptions_allowed_label":"How many people are allowed to register using this link?","expires_at":"When will this invite link expire?"},"invite":{"new_title":"Create Invite","edit_title":"Edit Invite","instructions":"Share this link to instantly grant access to this site","copy_link":"copy link","expires_in_time":"Expires in %{time}","expired_at_time":"Expired at %{time}","show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options","restrict_email":"Restrict to one email address","max_redemptions_allowed":"Max uses","add_to_groups":"Add to groups","invite_to_topic":"Arrive at this topic","expires_at":"Expire after","custom_message":"Optional personal message","send_invite_email":"Save and Send Email","save_invite":"Save Invite","invite_saved":"Invite saved.","invite_copied":"Invite link copied."},"bulk_invite":{"none":"No invitations to display on this page.","text":"Bulk Invite","instructions":"\u003cp\u003eInvite a list of users to get your community going quickly. Prepare a \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV file\u003c/a\u003e containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEvery email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.\u003c/p\u003e\n","progress":"Uploaded %{progress}%...","success":"File uploaded successfully. You will be notified via message when the process is complete."}},"password":{"required":"Please enter a password"},"avatar":{"name_and_description":"%{name} - %{description}","edit":"Edit Profile Picture"},"title":{"instructions":"appears after your username"},"flair":{"title":"Flair","instructions":"icon displayed next to your profile picture"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"modal":{"dismiss_error":"Dismiss error"},"assets_changed_confirm":"This site just received a software upgrade. Get the latest version now?","logs_error_rate_notice":{},"local_time":"Local Time","signup_cta":{"hidden_for_session":"OK, we'll ask you tomorrow. You can always use 'Log In' to create an account, too."},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply.","other":"There are \u003cb\u003e%{count}\u003c/b\u003e replies."},"short_label":"Summarize","short_title":"Show a summary of this topic: the most interesting posts as determined by the community"},"private_message_info":{"invite":"Invite Others...","edit":"Add or Remove...","remove":"Remove..."},"create_account":{"subheader_title":"Let's create your account","disclaimer":"By registering, you agree to the \u003ca href='%{privacy_link}' target='blank'\u003eprivacy policy\u003c/a\u003e and \u003ca href='%{tos_link}' target='blank'\u003eterms of service\u003c/a\u003e.","title":"Create your account","associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"forgot_password":{"complete_username_found":"We found an account that matches the username \u003cb\u003e%{username}\u003c/b\u003e. You should receive an email with instructions on how to reset your password shortly.","complete_email_found":"We found an account that matches \u003cb\u003e%{email}\u003c/b\u003e. You should receive an email with instructions on how to reset your password shortly."},"email_login":{"login_link":"Skip the password; email me a login link","logging_in_as":"Logging in as %{email}","confirm_button":"Finish Login"},"login":{"header_title":"Welcome back","subheader_title":"Log in to your account","title":"Log in","second_factor_backup":"Log in using a backup code","second_factor_backup_title":"Two-Factor Backup","second_factor":"Log in using Authenticator app","security_key_description":"When you have your physical security key prepared press the Authenticate with Security Key button below.","security_key_alternative":"Try another way","security_key_authenticate":"Authenticate with Security Key","security_key_not_allowed_error":"The security key authentication process either timed out or was cancelled.","security_key_no_matching_credential_error":"No matching credentials could be found in the provided security key.","security_key_support_missing_error":"Your current device or browser does not support the use of security keys. Please use a different method.","email_placeholder":"Email / Username","cookies_error":"Your browser seems to have cookies disabled. You might not be able to log in without enabling them first.","not_allowed_from_ip_address":"You can't log in from that IP address.","omniauth_disallow_totp":"Your account has two-factor authentication enabled. Please log in with your password.","sent_activation_email_again_generic":"We sent another activation email. It might take a few minutes for it to arrive; be sure to check your spam folder.","google_oauth2":{"sr_title":"Login with Google"},"twitter":{"sr_title":"Login with Twitter"},"instagram":{"sr_title":"Login with Instagram"},"facebook":{"sr_title":"Login with Facebook"},"github":{"sr_title":"Login with GitHub"},"discord":{"title":"with Discord","sr_title":"Login with Discord"},"second_factor_toggle":{"totp":"Use an authenticator app instead","backup_code":"Use a backup code instead"}},"invites":{"emoji":"envelope emoji"},"shortcut_modifier_key":{"enter":"Enter"},"category_row":{"topic_count":{"one":"%{count} topic in this category","other":"%{count} topics in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory","other":"%{name} and %{count} subcategories"},"plus_subcategories":{"one":"+ %{count} subcategory","other":"+ %{count} subcategories"}},"select_kit":{"filter_by":"Filter by: %{name}","select_to_filter":"Select a value to filter","results_count":{"one":"%{count} result","other":"%{count} results"},"invalid_selection_length":{"one":"Selection must be at least %{count} character.","other":"Selection must be at least %{count} characters."},"components":{"tag_drop":{"filter_for_more":"Filter for more..."},"categories_admin_dropdown":{"title":"Manage categories"}}},"emoji_picker":{"smileys_\u0026_emotion":"Smileys and Emotion","people_\u0026_body":"People and Body","animals_\u0026_nature":"Animals and Nature","food_\u0026_drink":"Food and Drink","travel_\u0026_places":"Travel and Places","activities":"Activities","symbols":"Symbols"},"shared_drafts":{"notice":"This topic is only visible to those who can publish shared drafts."},"composer":{"edit_conflict":"edit conflict","group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"reference_topic_title":"RE: %{title}","error":{"title_too_short":{"one":"Title must be at least %{count} character","other":"Title must be at least %{count} characters"},"title_too_long":{"one":"Title can't be more than %{count} character","other":"Title can't be more than %{count} characters"},"post_missing":"Post can’t be empty","post_length":{"one":"Post must be at least %{count} character","other":"Post must be at least %{count} characters"},"try_like":"Have you tried the %{heart} button?","tags_missing":{"one":"You must choose at least %{count} tag","other":"You must choose at least %{count} tags"},"topic_template_not_modified":"Please add details and specifics to your topic by editing the topic template."},"title":"Or press %{modifier}Enter","reply_placeholder_choose_category":"Select a category before typing here.","saved_draft":"Post draft in progress. Tap to resume.","show_preview":"show preview","hide_preview":"hide preview","link_url_placeholder":"Paste a URL or type to search topics","open":"open the composer panel","show_toolbar":"show composer toolbar","hide_toolbar":"hide composer toolbar","slow_mode":{"error":"This topic is in slow mode. You already posted recently; you can post again in %{timeLeft}."},"composer_actions":{"reply_to_post":{"label":"Reply to a post by %{postUsername}"},"reply_as_new_topic":{"confirm":"You have a new topic draft saved, which will be overwritten if you create a linked topic."},"reply_as_new_group_message":{"label":"Reply as new group message","desc":"Create new message starting with same recipients"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"}},"reload":"Reload"},"notifications":{"tooltip":{"high_priority":{"one":"%{count} unread high priority notification","other":"%{count} unread high priority notifications"}},"post_approved":"Your post was approved","reviewable_items":"items requiring review","liked_consolidated_description":{"one":"liked %{count} of your posts","other":"liked %{count} of your posts"},"membership_request_accepted":"Membership accepted in '%{group_name}'","membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"},"votes_released":"%{description} - completed","popup":{"watching_first_post":"%{username} created a new topic \"%{topic}\" - %{site_title}","custom":"Notification from %{username} on %{site_title}"},"titles":{"mentioned":"mentioned","replied":"new reply","quoted":"quoted","edited":"edited","liked":"new like","private_message":"new private message","invited_to_private_message":"invited to private message","invitee_accepted":"invite accepted","posted":"new post","moved_post":"post moved","linked":"linked","bookmark_reminder":"bookmark reminder","bookmark_reminder_with_name":"bookmark reminder - %{name}","granted_badge":"badge granted","invited_to_topic":"invited to topic","group_mentioned":"group mentioned","group_message_summary":"new group messages","topic_reminder":"topic reminder","liked_consolidated":"new likes","post_approved":"post approved","membership_request_consolidated":"new membership requests","reaction":"new reaction","votes_released":"Vote was released"}},"upload_selector":{"processing":"Processing Upload"},"search":{"open_advanced":"Open advanced search","clear_search":"Clear search","sort_or_bulk_actions":"Sort or bulk select results","search_term_label":"enter search keyword","in":"in","in_this_topic":"in this topic","in_this_topic_tooltip":"switch to searching all topics","in_topics_posts":"in all topics and posts","enter_hint":"or press Enter","in_posts_by":"in posts by %{username}","type":{"default":"Topics/posts","categories_and_tags":"Categories/tags"},"context":{"tag":"Search the #%{tag} tag"},"tips":{"category_tag":"filters by category or tag","author":"filters by post author","in":"filters by metadata (e.g. in:title, in:personal, in:pinned)","status":"filters by topic status","full_search":"launches full page search","full_search_key":"%{modifier} + Enter"},"advanced":{"title":"Advanced filters","posted_by":{"aria_label":"Filter by post author"},"with_tags":{"aria_label":"Filter using tags"},"filters":{"created":"I created"},"statuses":{"public":"are public"},"post":{"min":{"placeholder":"minimum","aria_label":"filter by minimum number of posts"},"max":{"placeholder":"maximum","aria_label":"filter by maximum number of posts"},"time":{"aria_label":"Filter by posted date"}},"min_views":{"placeholder":"minimum","aria_label":"filter by minimum views"},"max_views":{"placeholder":"maximum","aria_label":"filter by maximum views"},"additional_options":{"label":"Filter by post count and topic views"}}},"hamburger_menu":"menu","view_all":"view all %{tab}","topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread","other":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…","other":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})","other":"Dismiss New (%{count})"},"change_category":"Set Category...","notification_level":"Notifications...","change_notification_level":"Change Notification Level","remove_tags":"Remove All Tags","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from \u003cb\u003e%{count}\u003c/b\u003e topics. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic","other":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topics"}},"none":{"unseen":"You have no unseen topics.","latest":"You're all caught up!","educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e","unread":"\u003cp\u003eYour unread topics appear here.\u003c/p\u003e\u003cp\u003eBy default, topics are considered unread and will show unread counts \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e if you:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreated the topic\u003c/li\u003e\u003cli\u003eReplied to the topic\u003c/li\u003e\u003cli\u003eRead the topic for more than 4 minutes\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOr if you have explicitly set the topic to Tracked or Watched via the 🔔 in each topic.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"defer":{"help":"Mark as unread"},"collapse_details":"collapse topic details","expand_details":"expand topic details","unread_indicator":"No member has read the last post of this topic yet.","browse_all_tags":"Browse all tags","suggest_create_topic":"Ready to \u003ca href\u003estart a new conversation?\u003c/a\u003e","slow_mode_update":{"title":"Slow Mode","select":"Users may only post in this topic once every:","description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","update":"Update","enabled_until":"Enabled until:","hours":"Hours:","minutes":"Minutes:","seconds":"Seconds:","durations":{"10_minutes":"10 Minutes","15_minutes":"15 Minutes","30_minutes":"30 Minutes","45_minutes":"45 Minutes","1_hour":"1 Hour","2_hours":"2 Hours","4_hours":"4 Hours","8_hours":"8 Hours","12_hours":"12 Hours","24_hours":"24 Hours","custom":"Custom Duration"}},"slow_mode_notice":{"duration":"Please wait %{duration} between posts in this topic"},"topic_status_update":{"num_of_days":"Number of days:","min_duration":"Duration must be greater than 0","max_duration":"Duration must be less than 20 years"},"auto_update_input":{"now":"Now","two_weeks":"Two weeks","two_months":"Two months","three_months":"Three months","four_months":"Four months","six_months":"Six months","one_year":"One year"},"auto_reopen":{"title":"Auto-Open Topic"},"auto_close":{"label":"Auto-close topic after:"},"auto_close_after_last_post":{"title":"Auto-Close Topic After Last Post"},"auto_bump":{"title":"Auto-Bump Topic"},"auto_delete_replies":{"title":"Auto-Delete Replies"},"status_update_notice":{"auto_bump":"This topic will be automatically bumped %{timeLeft}.","auto_delete_replies":"Replies on this topic are automatically deleted after %{duration}."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily.","other":"The last post in the topic is already %{count} hours old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"}},"notifications":{"reasons":{"3_10_stale":"You will receive notifications because you were watching a tag on this topic in the past.","3_6_stale":"You will receive notifications because you were watching this category in the past.","2_8_stale":"You will see a count of new replies because you were tracking this category in the past."}},"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."},"feature":{"make_banner":"Make Banner Topic"},"share":{"extended_title":"Share a link","instructions":"Share a link to this topic:","copied":"Topic link copied.","notify_users":{"title":"Notify","instructions":"Notify the following users about this topic:","success":{"one":"Successfully notified %{username} about this topic.","other":"Successfully notified all users about this topic."}}},"make_public":{"title":"Convert to Public Topic","choose_category":"Please choose a category for the public topic:"},"feature_topic":{"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"}},"invite_private":{"not_allowed":"Sorry, that user can't be invited."},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link."},"move_to":{"title":"Move to","action":"move to","error":"There was an error moving posts."},"split_topic":{"topic_name":"New Topic Title"},"merge_topic":{"radio_label":"Existing Topic"},"move_to_new_message":{"title":"Move to New Message","action":"move to new message","message_title":"New Message Title","participants":"Participants","instructions":{"one":"You are about to create a new message and populate it with the post you've selected.","other":"You are about to create a new message and populate it with the \u003cb\u003e%{count}\u003c/b\u003e posts you've selected."}},"move_to_existing_message":{"title":"Move to Existing Message","action":"move to existing message","radio_label":"Existing Message","participants":"Participants","instructions":{"one":"Please choose the message you'd like to move that post to.","other":"Please choose the message you'd like to move those \u003cb\u003e%{count}\u003c/b\u003e posts to."}},"publish_page":{"title":"Page Publishing","publish":"Publish","description":"When a topic is published as a page, its URL can be shared and it will displayed with custom styling.","slug":"Slug","public_description":"People can see the page even if the associated topic is private.","publish_url":"Your page has been published at:","topic_published":"Your topic has been published at:","preview_url":"Your page will be published at:","invalid_slug":"Sorry, you can't publish this page.","unpublish":"Unpublish","unpublished":"Your page has been unpublished and is no longer accessible.","publishing_settings":"Publishing Settings"},"change_owner":{"instructions_without_old_user":{"one":"Please choose a new owner for the post","other":"Please choose a new owner for the %{count} posts"}},"deleted_by_author_simple":"(topic deleted by author)"},"post":{"quote_reply_shortcut":"Or press q","quote_edit_shortcut":"Or press e","ignored":"Ignored content","wiki_last_edited_on":"wiki last edited on %{dateTime}","last_edited_on":"post last edited on %{dateTime}","show_hidden":"View ignored content.","deleted_by_author_simple":"(post deleted by author)","notice":{"new_user":"This is the first time %{user} has posted — let’s welcome them to our community!","returning_user":"It’s been a while since we’ve seen %{user} — their last post was %{time}."},"has_replies_count":"%{count}","unknown_user":"(unknown/deleted user)","filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","view_all_posts":"View all posts","errors":{"file_too_large":"Sorry, that file is too big (maximum size is %{max_size_kb}kb). Why not upload your large file to a cloud sharing service, then paste the link?","file_too_large_humanized":"Sorry, that file is too big (maximum size is %{max_size}). Why not upload your large file to a cloud sharing service, then paste the link?","too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."}},"cancel_composer":{"confirm":"What would you like to do with your post?","save_draft":"Save draft for later","keep_editing":"Keep editing"},"controls":{"read_indicator":"members who read this post","permanently_delete":"Permanently Delete","permanently_delete_confirmation":"Are you sure you permanently want to delete this post? You will not be able to recover it.","publish_page":"Page Publishing","change_owner":"Change Ownership...","grant_badge":"Grant Badge...","delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","other":"This topic currently has over %{count} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic","add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice...","delete_post_notice":"Delete Staff Notice","remove_timer":"remove timer","edit_timer":"edit timer"},"actions":{"people":{"read":{"one":"read this","other":"read this"},"read_capped":{"one":"and %{count} other read this","other":"and %{count} others read this"}}},"revisions":{"controls":{"revert":"Revert to revision %{revision}","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"}},"bookmarks":{"create":"Create bookmark","create_for_topic":"Create bookmark for topic","edit":"Edit bookmark","edit_for_topic":"Edit bookmark for topic","updated":"Updated","name_placeholder":"What is this bookmark for?","set_reminder":"Remind me","actions":{"delete_bookmark":{"name":"Delete bookmark","description":"Removes the bookmark from your profile and stops all reminders for the bookmark"},"edit_bookmark":{"name":"Edit bookmark","description":"Edit the bookmark name or change the reminder date and time"},"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}},"filtered_replies":{"viewing_posts_by":"Viewing %{post_count} posts by","viewing_subset":"Some replies are collapsed","viewing_summary":"Viewing a summary of this topic","post_number":"%{username}, post #%{post_number}","show_all":"Show all"}},"category":{"edit_dialog_title":"Edit: %{categoryName}","back":"Back to category","tags_allowed_tags":"Restrict these tags to this category:","tags_allowed_tag_groups":"Restrict these tag groups to this category:","tags_tab_description":"Tags and tag groups specified above will only be available in this category and other categories that also specify them. They won't be available for use in other categories.","manage_tag_groups_link":"Manage tag groups","allow_global_tags_label":"Also allow other tags","tag_group_selector_placeholder":"(Optional) Tag group","required_tag_group_description":"Require new topics to have tags from a tag group:","min_tags_from_required_group_label":"Num Tags:","required_tag_group_label":"Tag group:","security_add_group":"Add a group","permissions":{"no_groups_selected":"No groups have been granted access; this category will only be visible to staff.","everyone_has_access":"This category is public, everyone can see, reply and create posts. To restrict permissions, remove one or more of the permissions granted to the \"everyone\" group.","toggle_reply":"Toggle Reply permission","toggle_full":"Toggle Create permission","inherited":"This permission is inherited from \"everyone\""},"uncategorized_security_warning":"This category is special. It is intended as holding area for topics that have no category; it cannot have security settings.","uncategorized_general_warning":"This category is special. It is used as the default category for new topics that do not have a category selected. If you want to prevent this behavior and force category selection, \u003ca href=\"%{settingLink}\"\u003eplease disable the setting here\u003c/a\u003e. If you want to change the name or description, go to \u003ca href=\"%{customizeLink}\"\u003eCustomize / Text Content\u003c/a\u003e.","pending_permission_change_alert":"You haven't added %{group} to this category; click this button to add them.","read_only_banner":"Banner text when a user cannot create a topic in this category:","allow_unlimited_owner_edits_on_first_post":"Allow unlimited owner edits on first post","default_list_filter":"Default List Filter:","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","position":"Position on the categories page:","default_slow_mode":"Enable \"Slow Mode\" for new topics in this category.","notifications":{"title":"change notification level for this category","watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"watching_first_post":{"description":"You will be notified of new topics in this category but not replies to the topics."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"search_priority":{"label":"Search Priority","options":{"very_low":"Very Low","low":"Low","very_high":"Very High"}},"settings_sections":{"moderation":"Moderation","appearance":"Appearance"},"list_filters":{"all":"all topics","none":"no subcategories"},"colors_disabled":"You can’t select colors because you have a category style of none.","topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"flagging":{"take_action":"Take Action...","take_action_options":{"suspend":{"details":"Reach the flag threshold, and suspend the user"},"silence":{"details":"Reach the flag threshold, and silence the user"}},"flag_for_review":"Queue For Review"},"topic_statuses":{"personal_message":{"title":"This topic is a personal message","help":"This topic is a personal message"}},"history_capped_revisions":"History, last 100 revisions","history":"History","filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"},"top":{"other_periods":"see top:"}},"browser_update":"Unfortunately, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eyour browser is too old to work on this site\u003c/a\u003e. Please \u003ca href=\"https://browsehappy.com\"\u003eupgrade your browser\u003c/a\u003e to view rich content, log in and reply.","lightbox":{"previous":"Previous (Left arrow key)","next":"Next (Right arrow key)","close":"Close (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eThe content\u003c/a\u003e could not be loaded.","image_load_error":"\u003ca href=\"%url%\"\u003eThe image\u003c/a\u003e could not be loaded."},"cannot_render_video":"This video cannot be rendered because your browser does not support the codec.","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} or %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","jump_to":{"next":"%{shortcut} Next Topic","previous":"%{shortcut} Previous Topic"},"navigation":{"go_to_unread_post":"%{shortcut} Go to the first unread post"},"application":{"dismiss_new":"%{shortcut} Dismiss New"},"bookmarks":{"title":"Bookmarking","enter":"%{shortcut} Save and close","later_today":"%{shortcut} Later today","later_this_week":"%{shortcut} Later this week","tomorrow":"%{shortcut} Tomorrow","next_week":"%{shortcut} Next week","next_month":"%{shortcut} Next month","next_business_week":"%{shortcut} Start of next week","next_business_day":"%{shortcut} Next business day","custom":"%{shortcut} Custom date and time","none":"%{shortcut} No reminder","delete":"%{shortcut} Delete bookmark"},"actions":{"defer":"%{shortcut} Defer topic","topic_admin_actions":"%{shortcut} Open topic admin actions"},"search_menu":{"title":"Search Menu","prev_next":"%{shortcut} Move selection up and down","insert_url":"%{shortcut} Insert selection into open composer"}},"badges":{"favorite_max_reached":"You can’t favorite more badges.","favorite_max_not_reached":"Mark this badge as favorite","favorite_count":"%{count}/%{max} badges marked as favorite"},"download_calendar":{"title":"Download calendar","save_ics":"Download .ics file","save_google":"Add to Google calendar","remember":"Don’t ask me again","remember_explanation":"(you can change this preference in your user prefs)","default_calendar":"Default calendar","default_calendar_instruction":"Determine which calendar should be used when dates are saved","add_to_calendar":"Add to calendar","google":"Google Calendar","ics":"ICS"},"tagging":{"info":"Info","default_info":"This tag isn't restricted to any categories, and has no synonyms. To add restrictions, put this tag in a \u003ca href=%{basePath}/tag_groups\u003etag group\u003c/a\u003e.","category_restricted":"This tag is restricted to categories you don't have permission to access.","synonyms":"Synonyms","synonyms_description":"When the following tags are used, they will be replaced with \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\".","other":"This tag belongs to these groups: %{tag_groups}."},"category_restrictions":{"one":"It can only be used in this category:","other":"It can only be used in these categories:"},"edit_synonyms":"Manage Synonyms","add_synonyms_label":"Add synonyms:","add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?","other":"Any place that currently uses these tags will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"add_synonyms_failed":"The following tags couldn't be added as synonyms: \u003cb\u003e%{tag_names}\u003c/b\u003e. Ensure they don't have synonyms and aren't synonyms of another tag.","remove_synonym":"Remove Synonym","delete_synonym_confirm":"Are you sure you want to delete the synonym \"%{tag_name}\"?","delete_confirm_synonyms":{"one":"Its synonym will also be deleted.","other":"Its %{count} synonyms will also be deleted."},"upload_description":"Upload a csv file to create tags in bulk","delete_unused_confirmation":{"one":"%{count} tag will be deleted: %{tags}","other":"%{count} tags will be deleted: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} and %{count} more","other":"%{tags} and %{count} more"},"delete_no_unused_tags":"There are no unused tags.","tag_list_joiner":", ","delete_unused":"Delete Unused Tags","delete_unused_description":"Delete all tags which are not attached to any topics or personal messages","notifications":{"watching_first_post":{"description":"You will be notified of new topics in this tag but not replies to the topics."}},"groups":{"about_heading":"Select a tag group or create a new one","about_heading_empty":"Create a new tag group to get started","about_description":"Tag groups help you manage permissions for many tags in one place.","new_title":"Create New Group","edit_title":"Edit Tag Group","parent_tag_description":"Tags from this group can only be used if the parent tag is present.","usable_only_by_groups":"Tags are visible to everyone, but only the following groups can use them","visible_only_to_groups":"Tags are visible only to the following groups","cannot_save":"Cannot save tag group. Make sure that there is at least one tag present, tag group name is not empty, and a group is selected for tags permission.","tags_placeholder":"Search or create tags","parent_tag_placeholder":"Optional","select_groups_placeholder":"Select groups...","disabled":"Tagging is disabled. "},"topics":{"none":{"unseen":"You have no unseen topics."}}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"forced_anonymous_login_required":"The site is under extreme load and cannot be loaded at this time, try again in a few minutes.","footer_nav":{"forward":"Forward"},"image_removed":"(image removed)","do_not_disturb":{"title":"Do not disturb for...","label":"Do not disturb","options":{"half_hour":"30 minutes","one_hour":"1 hour","two_hours":"2 hours","tomorrow":"Until tomorrow"},"set_schedule":"Set a notification schedule"},"trust_levels":{"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"You have picked an unsupported file. Supported file types – %{types}."},"user_activity":{"no_activity_title":"No activity yet","no_activity_body":"Welcome to our community! You are brand new here and have not yet contributed to discussions. As a first step, visit \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e and just start reading! Select %{heartIcon} on posts that you like or want to learn more about. If you have not already done so, help others get to know you by adding a picture and bio in your \u003ca href='%{preferencesUrl}'\u003euser preferences\u003c/a\u003e.","no_activity_others":"No activity.","no_replies_title":"You have not replied to any topics yet","no_drafts_title":"You haven’t started any drafts","no_drafts_body":"Not quite ready to post? We’ll automatically save a new draft and list it here whenever you start composing a topic, reply, or personal message. Select the cancel button to discard or save your draft to continue later.","no_likes_title":"You haven’t liked any topics yet","no_likes_body":"A great way to jump in and start contributing is to start reading conversations that have already taken place, and select the %{heartIcon} on posts that you like!","no_likes_others":"No liked posts.","no_topics_title":"You have not started any topics yet","no_read_topics_title":"You haven’t read any topics yet","no_read_topics_body":"Once you start reading discussions, you’ll see a list here. To start reading, look for topics that interest you in \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e or search by keyword %{searchIcon}"},"no_group_messages_title":"No group messages found","fullscreen_table":{"expand_btn":"Expand Table"},"cakeday":{"none":" ","title":"Cakeday"},"anniversaries":{"today":{"empty":"There are no users celebrating their anniversaries today."},"tomorrow":{"empty":"There are no users celebrating their anniversaries tomorrow."}},"discourse_local_dates":{"relative_dates":{"today":"Today %{time}","tomorrow":"Tomorrow %{time}","yesterday":"Yesterday %{time}","countdown":{"passed":"date has passed"}},"title":"Insert date / time","create":{"form":{"insert":"Insert","advanced_mode":"Advanced mode","simple_mode":"Simple mode","format_description":"Format used to display the date to the user. Use Z to show the offset and zz for the timezone name.","timezones_title":"Timezones to display","timezones_description":"Timezones will be used to display dates in preview and fallback.","recurring_title":"Recurrence","recurring_description":"Define the recurrence of an event. You can also manually edit the recurring option generated by the form and use one of the following keys: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","recurring_none":"No recurrence","invalid_date":"Invalid date, make sure date and time are correct","format_title":"Date format","timezone":"Timezone","until":"Until...","recurring":{"every_day":"Every day","every_week":"Every week","every_two_weeks":"Every two weeks","every_month":"Every month","every_two_months":"Every two months","every_three_months":"Every three months","every_six_months":"Every six months","every_year":"Every year"}}},"default_title":"%{site_name} Event"},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"poll":{"public":{"title":"Votes are \u003cstrong\u003epublic\u003c/strong\u003e."},"results":{"groups":{"title":"You need to be a member of %{groups} to vote in this poll."},"vote":{"title":"Results will be shown on \u003cstrong\u003evote\u003c/strong\u003e."},"closed":{"title":"Results will be shown once \u003cstrong\u003eclosed\u003c/strong\u003e."},"staff":{"title":"Results are only shown to \u003cstrong\u003estaff\u003c/strong\u003e members."}},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"between_min_and_max_options":"Choose between \u003cstrong\u003e%{min}\u003c/strong\u003e and \u003cstrong\u003e%{max}\u003c/strong\u003e options."}},"remove-vote":{"title":"Remove your vote","label":"Remove vote"},"hide-results":{"label":"Show vote"},"group-results":{"title":"Group votes by user field","label":"Show breakdown"},"export-results":{"title":"Export the poll results"},"automatic_close":{"closes_in":"Closes in \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Closed \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Poll results","votes":"%{count} votes","breakdown":"Breakdown","percentage":"Percentage","count":"Count"},"error_while_exporting_results":"Sorry, there was an error exporting poll results.","ui_builder":{"help":{"options_min_count":"Enter at least 1 option.","options_max_count":"Enter at most %{count} options.","invalid_min_value":"Minimum value must be at least 1.","invalid_max_value":"Maximum value must be at least 1, but less than or equal with the number of options."},"poll_result":{"label":"Show Results...","always":"Always visible","vote":"Only after voting","closed":"When the poll is closed","staff":"Staff only"},"poll_groups":{"label":"Limit voting to these groups"},"poll_chart_type":{"label":"Result chart","bar":"Bar","pie":"Pie"},"poll_config":{"max":"Max Choices","min":"Min Choices"},"poll_title":{"label":"Title (optional)"},"poll_options":{"label":"Options (one per line)","add":"Add option"},"automatic_close":{"label":"Automatically close poll"},"show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options"}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Date/Time inputs"},"font_scale":{"title":"Font System"},"icons":{"full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation_bar":{"title":"Navigation Bar"},"navigation_stacked":{"title":"Navigation Stacked"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_statuses":{"title":"Topic Statuses"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"post_menu":{"title":"Post Menu"},"modal":{"title":"Modal","header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}}}}};
I18n.locale = 'cs';
I18n.pluralizationRules.cs = MessageFormat.locale.cs;
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
//! locale : Czech [cs]
//! author : petrbela : https://github.com/petrbela

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var months = 'leden_únor_březen_duben_květen_červen_červenec_srpen_září_říjen_listopad_prosinec'.split(
            '_'
        ),
        monthsShort = 'led_úno_bře_dub_kvě_čvn_čvc_srp_zář_říj_lis_pro'.split('_'),
        monthsParse = [
            /^led/i,
            /^úno/i,
            /^bře/i,
            /^dub/i,
            /^kvě/i,
            /^(čvn|červen$|června)/i,
            /^(čvc|červenec|července)/i,
            /^srp/i,
            /^zář/i,
            /^říj/i,
            /^lis/i,
            /^pro/i,
        ],
        // NOTE: 'červen' is substring of 'červenec'; therefore 'červenec' must precede 'červen' in the regex to be fully matched.
        // Otherwise parser matches '1. červenec' as '1. červen' + 'ec'.
        monthsRegex = /^(leden|únor|březen|duben|květen|červenec|července|červen|června|srpen|září|říjen|listopad|prosinec|led|úno|bře|dub|kvě|čvn|čvc|srp|zář|říj|lis|pro)/i;

    function plural(n) {
        return n > 1 && n < 5 && ~~(n / 10) !== 1;
    }
    function translate(number, withoutSuffix, key, isFuture) {
        var result = number + ' ';
        switch (key) {
            case 's': // a few seconds / in a few seconds / a few seconds ago
                return withoutSuffix || isFuture ? 'pár sekund' : 'pár sekundami';
            case 'ss': // 9 seconds / in 9 seconds / 9 seconds ago
                if (withoutSuffix || isFuture) {
                    return result + (plural(number) ? 'sekundy' : 'sekund');
                } else {
                    return result + 'sekundami';
                }
            case 'm': // a minute / in a minute / a minute ago
                return withoutSuffix ? 'minuta' : isFuture ? 'minutu' : 'minutou';
            case 'mm': // 9 minutes / in 9 minutes / 9 minutes ago
                if (withoutSuffix || isFuture) {
                    return result + (plural(number) ? 'minuty' : 'minut');
                } else {
                    return result + 'minutami';
                }
            case 'h': // an hour / in an hour / an hour ago
                return withoutSuffix ? 'hodina' : isFuture ? 'hodinu' : 'hodinou';
            case 'hh': // 9 hours / in 9 hours / 9 hours ago
                if (withoutSuffix || isFuture) {
                    return result + (plural(number) ? 'hodiny' : 'hodin');
                } else {
                    return result + 'hodinami';
                }
            case 'd': // a day / in a day / a day ago
                return withoutSuffix || isFuture ? 'den' : 'dnem';
            case 'dd': // 9 days / in 9 days / 9 days ago
                if (withoutSuffix || isFuture) {
                    return result + (plural(number) ? 'dny' : 'dní');
                } else {
                    return result + 'dny';
                }
            case 'M': // a month / in a month / a month ago
                return withoutSuffix || isFuture ? 'měsíc' : 'měsícem';
            case 'MM': // 9 months / in 9 months / 9 months ago
                if (withoutSuffix || isFuture) {
                    return result + (plural(number) ? 'měsíce' : 'měsíců');
                } else {
                    return result + 'měsíci';
                }
            case 'y': // a year / in a year / a year ago
                return withoutSuffix || isFuture ? 'rok' : 'rokem';
            case 'yy': // 9 years / in 9 years / 9 years ago
                if (withoutSuffix || isFuture) {
                    return result + (plural(number) ? 'roky' : 'let');
                } else {
                    return result + 'lety';
                }
        }
    }

    var cs = moment.defineLocale('cs', {
        months: months,
        monthsShort: monthsShort,
        monthsRegex: monthsRegex,
        monthsShortRegex: monthsRegex,
        // NOTE: 'červen' is substring of 'červenec'; therefore 'červenec' must precede 'červen' in the regex to be fully matched.
        // Otherwise parser matches '1. červenec' as '1. červen' + 'ec'.
        monthsStrictRegex: /^(leden|ledna|února|únor|březen|března|duben|dubna|květen|května|červenec|července|červen|června|srpen|srpna|září|říjen|října|listopadu|listopad|prosinec|prosince)/i,
        monthsShortStrictRegex: /^(led|úno|bře|dub|kvě|čvn|čvc|srp|zář|říj|lis|pro)/i,
        monthsParse: monthsParse,
        longMonthsParse: monthsParse,
        shortMonthsParse: monthsParse,
        weekdays: 'neděle_pondělí_úterý_středa_čtvrtek_pátek_sobota'.split('_'),
        weekdaysShort: 'ne_po_út_st_čt_pá_so'.split('_'),
        weekdaysMin: 'ne_po_út_st_čt_pá_so'.split('_'),
        longDateFormat: {
            LT: 'H:mm',
            LTS: 'H:mm:ss',
            L: 'DD.MM.YYYY',
            LL: 'D. MMMM YYYY',
            LLL: 'D. MMMM YYYY H:mm',
            LLLL: 'dddd D. MMMM YYYY H:mm',
            l: 'D. M. YYYY',
        },
        calendar: {
            sameDay: '[dnes v] LT',
            nextDay: '[zítra v] LT',
            nextWeek: function () {
                switch (this.day()) {
                    case 0:
                        return '[v neděli v] LT';
                    case 1:
                    case 2:
                        return '[v] dddd [v] LT';
                    case 3:
                        return '[ve středu v] LT';
                    case 4:
                        return '[ve čtvrtek v] LT';
                    case 5:
                        return '[v pátek v] LT';
                    case 6:
                        return '[v sobotu v] LT';
                }
            },
            lastDay: '[včera v] LT',
            lastWeek: function () {
                switch (this.day()) {
                    case 0:
                        return '[minulou neděli v] LT';
                    case 1:
                    case 2:
                        return '[minulé] dddd [v] LT';
                    case 3:
                        return '[minulou středu v] LT';
                    case 4:
                    case 5:
                        return '[minulý] dddd [v] LT';
                    case 6:
                        return '[minulou sobotu v] LT';
                }
            },
            sameElse: 'L',
        },
        relativeTime: {
            future: 'za %s',
            past: 'před %s',
            s: translate,
            ss: translate,
            m: translate,
            mm: translate,
            h: translate,
            hh: translate,
            d: translate,
            dd: translate,
            M: translate,
            MM: translate,
            y: translate,
            yy: translate,
        },
        dayOfMonthOrdinalParse: /\d{1,2}\./,
        ordinal: '%d.',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return cs;

})));

// moment-timezone-localization for lang code: cs

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidžan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Accra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Addis Abeba","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Alžír","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamako","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Káhira","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Casablanca","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Ceuta","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Conakry","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Dar es Salaam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Džibuti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"El Aaiun","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Johannesburg","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Chartúm","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lomé","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaka","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadišu","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monrovia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairobi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"Ndžamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nuakšott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ouagadougou","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto-Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"Svatý Tomáš","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Tripolis","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Tunis","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Anguilla","id":"America/Anguilla"},{"value":"America/Antigua","name":"Antigua","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaina","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"La Rioja","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Rio Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucuman","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Asunción","id":"America/Asuncion"},{"value":"America/Bahia","name":"Bahía","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahia Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belém","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogotá","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancún","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Cayenne","id":"America/Cayenne"},{"value":"America/Cayman","name":"Kajmanské ostrovy","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Córdoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Kostarika","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiaba","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Curaçao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominika","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepe","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Grenada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Guadeloupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Guatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guayaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Guyana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"Havana","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianapolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Jamajka","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"La Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Los Angeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceio","id":"America/Maceio"},{"value":"America/Managua","name":"Managua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinik","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlán","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Merida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Ciudad de México","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevideo","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"New York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, Severní Dakota","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, Severní Dakota","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salem, Severní Dakota","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panama","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Port-au-Prince","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Port of Spain","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Portoriko","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Rio Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarém","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"São Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"Svatý Bartoloměj","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"St. John’s","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"Svatý Kryštof","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"Svatá Lucie","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"Svatý Tomáš (Karibik)","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"Svatý Vincenc","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Thule","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tortola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Casey","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Davis","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Dumont d’Urville","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Macquarie","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Mawson","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"McMurdo","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Palmer","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Rothera","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Syowa","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Troll","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Vostok","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Longyearbyen","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Aden","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Almaty","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Ammán","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Anadyr","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Aktau","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Aktobe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Ašchabad","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Atyrau","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Bagdád","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrajn","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Baku","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Bangkok","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Barnaul","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Bejrút","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Biškek","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Brunej","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Kalkata","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Čita","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Čojbalsan","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Kolombo","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Damašek","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Dháka","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Dili","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Dubaj","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Dušanbe","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Famagusta","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Gaza","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Hebron","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Hongkong","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Hovd","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Irkutsk","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Jakarta","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Jayapura","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Jeruzalém","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Kábul","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Kamčatka","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Karáčí","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Káthmándú","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Chandyga","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Krasnojarsk","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lumpur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Kučing","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Kuvajt","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Macao","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Magadan","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Makassar","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Manila","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Maskat","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nikósie","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Novokuzněck","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Novosibirsk","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Omsk","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Uralsk","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Phnompenh","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Pontianak","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Pchjongjang","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Katar","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Kyzylorda","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Rangún","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Rijád","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"Ho Či Minovo město","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Sachalin","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarkand","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Soul","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Šanghaj","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Singapur","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Sredněkolymsk","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Tchaj-pej","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Taškent","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Tbilisi","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Teherán","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Thimbú","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tokio","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Tomsk","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ulánbátar","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Urumči","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ust-Nera","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Vientiane","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Vladivostok","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Jakutsk","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Jekatěrinburg","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Jerevan","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Azorské ostrovy","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermudy","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Kanárské ostrovy","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Kapverdy","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Faerské ostrovy","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Reykjavík","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Jižní Georgie","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"Svatá Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Adelaide","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Brisbane","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Broken Hill","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Currie","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Darwin","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Eucla","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Hobart","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Lindeman","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Lord Howe","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Melbourne","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Perth","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Sydney","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Koordinovaný světový čas","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Amsterdam","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Andorra","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Astrachaň","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Athény","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Bělehrad","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlín","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Bratislava","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Brusel","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Bukurešť","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budapešť","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Busingen","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Kišiněv","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Kodaň","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Irský letní časDublin","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Gibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Guernsey","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsinky","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Ostrov Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istanbul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kaliningrad","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kyjev","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Kirov","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Lisabon","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Lublaň","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Britský letní časLondýn","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Lucemburk","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madrid","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Mariehamn","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Minsk","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Monako","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Moskva","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Paříž","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Podgorica","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Praha","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Řím","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Samara","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"San Marino","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Sarajevo","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Saratov","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Simferopol","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Skopje","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Sofie","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Stockholm","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Tallinn","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Tirana","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Uljanovsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Užhorod","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Vaduz","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Vatikán","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Vídeň","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Vilnius","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Volgograd","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Varšava","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Záhřeb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Záporoží","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Curych","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Chagos","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Vánoční ostrov","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Kokosové ostrovy","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Komory","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Kerguelenovy ostrovy","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Mahé","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Maledivy","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Mauricius","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Réunion","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Apia","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Auckland","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Bougainville","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Chathamské ostrovy","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Velikonoční ostrov","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Éfaté","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Enderbury","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Fakaofo","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Fidži","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Funafuti","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Galapágy","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Gambierovy ostrovy","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Guadalcanal","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Guam","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"HSTHSTHDTHonolulu","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Johnston","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Kiritimati","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Kosrae","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Kwajalein","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Majuro","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Markézy","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Midway","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Nauru","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Niue","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Norfolk","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Nouméa","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Pago Pago","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Palau","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Pitcairnovy ostrovy","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Pohnpei","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Port Moresby","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Rarotonga","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Saipan","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Tahiti","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Tarawa","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Tongatapu","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Chuukské ostrovy","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Wake","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Wallis","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

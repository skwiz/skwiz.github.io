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
I18n._compiledMFs = {"topic.bumped_at_title_MF" : function(d){
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["hy"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.hy = function ( n ) {
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

I18n.translations = {"hy":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Բայթ","other":"Բայթ"},"gb":"ԳԲ","kb":"ԿԲ","mb":"ՄԲ","tb":"ՏԲ"}}},"short":{"thousands":"%{number}հզ","millions":"%{number}մլն"}},"dates":{"time":"h:mm","time_with_zone":"HH:mm (տեղական)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"MMM D","full_no_year_no_time":"MMMM Do","long_with_year":"MMM D, YYYY h:mm a","long_with_year_no_time":"MMM D, YYYY","full_with_year_no_time":"MMMM Do, YYYY","long_date_with_year":"MMM D, 'YY LT","long_date_without_year":"MMM D, LT","long_date_with_year_without_time":"MMM D, 'YY","long_date_without_year_with_linebreak":"MMM D \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"MMM D, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} առաջ","tiny":{"half_a_minute":"\u003c 1ր","less_than_x_seconds":{"one":"\u003c %{count}վրկ","other":"\u003c %{count}վ"},"x_seconds":{"one":"%{count}վրկ","other":"%{count}վ"},"less_than_x_minutes":{"one":"\u003c %{count}ր","other":"\u003c %{count}ր"},"x_minutes":{"one":"%{count}ր","other":"%{count}ր"},"about_x_hours":{"one":"%{count}ժ","other":"%{count}ժ"},"x_days":{"one":"%{count}օր","other":"%{count}օր"},"x_months":{"one":"%{count}ամիս","other":"%{count}ամիս"},"about_x_years":{"one":"%{count}տարի","other":"%{count}տ"},"over_x_years":{"one":"\u003e %{count}տարի","other":"\u003e %{count}տ"},"almost_x_years":{"one":"%{count}տարի","other":"%{count}տ"},"date_month":"MMM D","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} րոպե","other":"%{count} րոպե"},"x_hours":{"one":"%{count} ժամ","other":"%{count} ժամ"},"x_days":{"one":"%{count} օր","other":"%{count} օր"},"date_year":"MMM D, 'YY"},"medium_with_ago":{"x_minutes":{"one":"%{count} րոպե առաջ","other":"%{count} րոպե առաջ"},"x_hours":{"one":"%{count} ժամ առաջ","other":"%{count} ժամ առաջ"},"x_days":{"one":"%{count} օր առաջ","other":"%{count} օր առաջ"},"x_months":{"one":"%{count} ամիս առաջ","other":"%{count} ամիս առաջ"},"x_years":{"one":"%{count} տարի առաջ","other":"%{count} տարի առաջ"}},"later":{"x_days":{"one":"%{count} օր հետո","other":"%{count} օր անց"},"x_months":{"one":"%{count} ամիս հետո","other":"%{count} ամիս անց"},"x_years":{"one":"%{count} տարի հետո","other":"%{count} տարի անց"}},"previous_month":"Նախորդ Ամիս","next_month":"Հաջորդ Ամիս","placeholder":"ամսաթիվ","to_placeholder":"դեպի ամսաթիվ"},"share":{"topic_html":"Թեմա՝ \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"գրառում #%{postNumber}","close":"փակել"},"action_codes":{"public_topic":"այս թեման դարձրել է հրապարակային %{when}","private_topic":"այս թեման դարձրել է անձնական նամակ %{when}","split_topic":"բաժանել է այս թեման %{when}","invited_user":"հրավիրված է %{who}-ին %{when}","invited_group":"հրավիրված %{who}-ին %{when}","user_left":"%{who}-ը հեռացրել է իրեն այս հաղորդագրությունից %{when}","removed_user":"հեռացրել է %{who}-ին %{when}","removed_group":"հեռացրել է %{who}-ին %{when}","autobumped":"ավտոմատ կերպով բարձրացված է %{when}","autoclosed":{"enabled":"փակվել է %{when}","disabled":"բացվել է %{when}"},"closed":{"enabled":"փակվել է %{when}","disabled":"բացվել է %{when}"},"archived":{"enabled":"արխիվացվել է %{when}","disabled":"ապարխիվացվել է %{when}"},"pinned":{"enabled":"ամրակցվել է %{when}","disabled":"ապակցվել է %{when}"},"pinned_globally":{"enabled":"գլոբալ ամրակցվել է %{when}","disabled":"ապակցվել է %{when}"},"visible":{"enabled":"ցուցակագրվել է %{when}","disabled":"չցուցակագրված %{when}"},"banner":{"enabled":"սա դարձրել է բաններ %{when}: Այն կհայտնվի յուրաքանչյուր էջի վերևում, մինչև չհեռացվի օգտատիրոջ կողմից:","disabled":"հեռացրել է այս բանները %{when}: Այն այլևս չի հայտնվի յուրաքանչյուր էջի վերևում:"},"forwarded":"վերահասցեագրել նշված նամակը"},"topic_admin_menu":"թեմայի ադմինի գործողություններ","wizard_required":"Բարի գալուստ Ձեր նոր Discourse! Սկսենք \u003ca href='%{url}' data-auto-route='true'\u003eտեղակայման մասնագետ\u003c/a\u003e-ի հետ ✨","emails_are_disabled":"Բոլոր ելքային էլ. նամակները անջատվել են ադմինիստրատորի կողմից: Էլ. փոստով ոչ մի տեսակի ծանուցում չի ուղարկվի:","software_update_prompt":{"dismiss":"Չեղարկել"},"bootstrap_mode_disabled":"Սկզբնաբեռնման(Bootstrap) ռեժիմը կանջատվի 24 ժամվա ընթացքում:","themes":{"default_description":"Լռելյայն","broken_theme_alert":"Դուք չեք կարող աշխատել, որովհետև թեմայի կամ կոպոնենտի մեջ %{theme} սխալ կա: Անջահել այն %{path}."},"s3":{"regions":{"ap_northeast_1":"Asia Pacific (Tokyo)","ap_northeast_2":"Asia Pacific (Seoul)","ap_south_1":"Asia Pacific (Mumbai)","ap_southeast_1":"Asia Pacific (Singapore)","ap_southeast_2":"Asia Pacific (Sydney)","ca_central_1":"Canada (Central)","cn_north_1":"China (Beijing)","cn_northwest_1":"China (Ningxia)","eu_central_1":"EU (Frankfurt)","eu_north_1":"EU (Stockholm)","eu_west_1":"EU (Ireland)","eu_west_2":"EU (London)","eu_west_3":"EU (Paris)","sa_east_1":"South America (São Paulo)","us_east_1":"US East (N. Virginia)","us_east_2":"US East (Ohio)","us_gov_east_1":"AWS GovCloud (US-East)","us_gov_west_1":"AWS GovCloud (ԱՄՆ-Արևմուտք)","us_west_1":"US West (N. California)","us_west_2":"US West (Oregon)"}},"edit":"խմբագրել այս թեմայի վերնագիրը և կատեգորիան","expand":"Ընդլայնել","not_implemented":"Այդ հատկանիշը դեռևս չի իրագործվել, ներողություն!","no_value":"Ոչ","yes_value":"Այո","submit":"Հաստատել","generic_error":"Տեղի է ունեցել սխալ, ներողություն:","generic_error_with_reason":"Տեղի է ունեցել սխալ՝ %{error}","sign_up":"Գրանցվել","log_in":"Մուտք","age":"Տարիք","joined":"Միացել է ","admin_title":"Ադմին","show_more":"ցույց տալ ավելին","show_help":"տարբերակներ","links":"Հղումներ","links_lowercase":{"one":"հղում","other":"հղումներ"},"faq":"ՀՏՀ","guidelines":"Ուղեցույց","privacy_policy":"Գաղտնիության Քաղաքականություն","privacy":"Գաղտնիություն","tos":"Պայմանները","rules":"Կանոններ","conduct":"Վարքագծի Կանոններ","mobile_view":"Տեսքը Հեռախոսով","desktop_view":"Տեսքը Համակարգչով","or":"կամ","now":"հենց նոր","read_more":"կարդալ ավելին","more":"Ավելին","x_more":{"one":"ևս %{count}","other":"ևս %{count}"},"never":"երբեք","every_30_minutes":"30 րոպեն մեկ","every_hour":"ժամը մեկ","daily":"ամեն օր","weekly":"շաբաթական","every_month":"ամիսը մեկ","every_six_months":"վեց ամիսը մեկ","max_of_count":"առավելագույնը %{count}","character_count":{"one":"%{count} սիմվոլ","other":"%{count} սիմվոլ"},"related_messages":{"title":" Առնչվող Հաղորդագրություններ","see_all":"Տեսնել %{username}-ի @\u003ca href=\"%{path}\"\u003eբոլոր նամակները\u003c/a\u003e"},"suggested_topics":{"title":"Առաջարկվող Թեմաներ","pm_title":"Առաջարկվող Հաղորդագրություններ"},"about":{"simple_title":"Մեր Մասին","title":" %{title}-ի մասին","stats":"Կայքի Վիճակագրություն","our_admins":"Մեր Ադմինները","our_moderators":"Մեր Մոդերատորները","moderators":"Մոդերատորներ","stat":{"all_time":"Ամբողջ Ժամանակ"},"like_count":"Հավանումներ","topic_count":"Թեմաներ","post_count":"Գրառում","user_count":"Օգտատերեր","active_user_count":"Ակտիվ Օգտատերեր","contact":"Հետադարձ Կապ","contact_info":"Այս կայքի հետ կապված կրիտիկական խնդիրների կամ հրատապ հարցերի դեպքում խնդրում ենք կապվել մեզ հետ %{contact_info} էլ. հասցեով:"},"bookmarked":{"title":"Էջանշել","clear_bookmarks":"Ջնջել Էջանշանները","help":{"bookmark":"Սեղմեք՝ այս թեմայի առաջին գրառումն էջանշելու համար","unbookmark":"Սեղմեք՝ այս թեմայի բոլոր էջանշանները ջնջելու համար"}},"bookmarks":{"not_bookmarked":"Էջանշել այս գրառումը","remove":"Հեռացնել էջանշանը","delete":"Ջնջել Էջանշանը","confirm_delete":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս էջանշանը: Բոլոր կապակցված   հիշեցումները կջնջվեն: ","confirm_clear":"Դուք համոզվա՞ծ եք, որ ցանկանում եք հեռացնել այս թեմայի բոլոր էջանշանները:","save":"Պահպանել","no_timezone":"Դուք դեռ չեք նշել ձեր ժամային գոտին: Դուք չեք կարողանա հիշեցումներ անել: Տեղադրեք \u003ca href=\"%{basePath}/my/preferences/profile\"\u003e ձեր պրոֆիլում:","invalid_custom_datetime":"Ամսաթիվը և ժամանակը ճիշտ չէ նշված, կրկին փորձեք:","list_permission_denied":"Դուք իրավունք չունեք դիտելու այս օգտատիրոջ էջանշանները: ","no_user_bookmarks":"Դուք էջանշած գրառումներ չունեք; էջանշումները թույլ են տալիս Ձեզ արագորեն տեղափոխվել դեպի որոշակի գրառում:","auto_delete_preference":{"never":"Երբեք"},"search":"Որոնում","reminders":{"today_with_time":"այսօր %{time}","tomorrow_with_time":"Վաղը %{time}","at_time":" %{date_time} -ում"}},"drafts":{"label":"Սևագրեր","resume":"Վերսկսել","remove":"Ջնջել","new_topic":"Նոր թեմայի սևագիր","topic_reply":"Պատասխանի սևագիր","abandon":{"yes_value":"Չեղարկել"}},"topic_count_categories":{"one":"Տեսնել %{count} նոր կամ թարմացված թեման","other":"Դիտել %{count} նոր կամ թարմացված թեմաները"},"topic_count_latest":{"one":"Տեսնել %{count} նոր կամ թարմացված թեման","other":"Դիտել %{count} նոր կամ թարմացված թեմաները"},"topic_count_unseen":{"one":"Տեսնել %{count} նոր կամ թարմացված թեման","other":"Դիտել %{count} նոր կամ թարմացված թեմաները"},"topic_count_unread":{"one":"Տեսնել %{count} չկարդացած թեման","other":"Դիտել %{count} չկարդացած թեմաները"},"topic_count_new":{"one":"Տեսնել %{count} նոր թեման","other":"Դիտել %{count} նոր թեմաները"},"preview":"նախադիտում","cancel":"չեղարկել","save":"Պահպանել Փոփոխությունները","saving":"Պահպանվում է...","saved":"Պահված է!","upload":"Վերբեռնել","uploading":"Վերբեռնվում է...","uploading_filename":"Վերբեռնվում է՝ %{filename}...","clipboard":"փոխանակման հարթակ","uploaded":"Վերբեռնված է !","pasting":"Տեղադրվում է...","enable":"Միացնել","disable":"Անջատել","continue":"Շարունակել","undo":"Ետարկել","revert":"Հետադարձել","failed":"Ձախողում","switch_to_anon":"Սկսել Անանուն Ռեժիմը","switch_from_anon":"Ավարտել Անանուն Ռեժիմը","banner":{"close":"Փակել այս բանները","edit":"Խմբագրել այս բանները \u003e\u003e"},"pwa":{"install_banner":"Դուք ցանկանու՞մ եք \u003ca href\u003eտեղադրել %{title}-ը այս սարքի վրա?\u003c/a\u003e"},"choose_topic":{"none_found":"Թեմաներ չեն գտնվել","title":{"search":"Թեմայի որոնում հետևյալ անվանումով url или id:","placeholder":"Մուտքագրեք թեմայի անվանումը այստեղ url կամ id "}},"choose_message":{"none_found":"Հաղորդագրություններ չեն գտնվել:","title":{"search":"Որոնում անձնական Հաղորդագրություններում","placeholder":"Մուտքագրեք հաղորդագրությունների վերնագրերը url կամ id"}},"review":{"order_by":"Դասավորել ըստ","in_reply_to":"ի պատասխան","explain":{"why":"Բացատրել, թե ինչու՞ է այդ էլեմենտը հայտնվել հերթի մեջ: ","title":"Ամփոփիչ Գնահատական","formula":"Բանաձև","subtotal":"Միջանկյալ հանրագումար ","total":"Ամբողջը","min_score_visibility":"Տեսանելիության համար մինիմալ գնահատական ","score_to_hide":"Գնահատում, որպեսզի Թաքցնել Հաղորդագրությունը","take_action_bonus":{"name":"Գործողություն է ձեռնարկվել","title":"Երբ աշխատակիցը գործողություն է ձեռնարկում, գրավոր բողոքին բոնուս է տրվում:"},"user_accuracy_bonus":{"name":"օգտատիրոջ ճշգրտությունը","title":"Օգտատերերը, ում գրավոր բողոքները համաձայնեցված են՝ կստանան բոնուս: "},"trust_level_bonus":{"name":"վստահության մակարդակ","title":"Օգտատրիրոջ վստահության առավել մեծ մակարդակ ունենալու դեպքում, ստուգվող էլեմենտները ստանում են ավելի բարձր բալ: "},"type_bonus":{"name":"բոնուսի տեսակը","title":"Որոշ ստուգվող տեսակների դեպքում, աշխատակիցներին կարող են բոնուս նշանակվել, որպեսզի նրանք գերակայության հասնեն: "}},"claim_help":{"optional":"Դուք կարող եք պահանջել այդ էլեմենտը, որպեսզի ուրիշները չկարողանան այն դիտել:  ","required":"Դուք պետք է նախ՝ հայտ ներկայացնեք, որպեսզի կարողանաք այն դիտեք: ","claimed_by_you":"Դուք վերցրել եք այդ էլեմենտը և կարող եք այն դիտել: ","claimed_by_other":"Այս կետը կարելի է դիտել միայն \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"հայտարարել այս թեման"},"unclaim":{"help":"Ջնջել այս պահանջը"},"awaiting_approval":"Հաստատմումը սպասման մեջ է","delete":"Ջնջել","settings":{"saved":"Պահված է","save_changes":"Պահպանել Փոփոխությունները","title":"Կարգավորումներ","priorities":{"title":"Ամփոփիչ Գերակայություններ "}},"moderation_history":"Մոդերացիայի Պատմությունը","view_all":"Դիտել Բոլոը","grouped_by_topic":"Խմբավորել ըստ Թեմաների","none":"Վերանայման՝ արդիականացման էլեմենտներ չկան ","view_pending":"դիտումը սպասման մեջ է ","title":"Վերանայում","topic":"Թեմա՝","filtered_topic":"Դուք ֆիլտրել եք դիտման համար՝ միայն մեկ թեմայի բովանդակությունը ","filtered_user":"Օգտատեր","filtered_reviewed_by":"Վերանայվել է","show_all_topics":"ցուցադրել բոլոր թեմաները","deleted_post":"(գրառումը ջնջված է)","deleted_user":"(օգտատերը ջնջված է)","user":{"bio":"Ձեր մասին","website":"Վեբ կայք","username":"Օգտանուն","email":"Էլ. հասցե","name":"Անուն","fields":"Դաշտեր","reject_reason":"Պատճառ"},"topics":{"topic":"Թեմա","reviewable_count":"Քանակ","reported_by":"Հաղորդվում է","deleted":"[Թեման Ջնջված է]","original":"(օրիգինալ թեմա)","details":"մանրամասները","unique_users":{"one":"%{count} օգտատեր","other":"%{count} օգտատեր"}},"replies":{"one":"%{count} պատասխան","other":"%{count} պատասխան"},"edit":"Խմբագրել","save":"Պահպանել","cancel":"Չեղարկել","new_topic":"Այս կետի հաստատումը նոր թեմա կստեղծի","filters":{"all_categories":"(Բոլոր կատեգորիաները)","type":{"title":"Տիպ","all":"(բոլոր տեսակները)"},"minimum_score":" Մինիմալ Գնահատական.","refresh":"Թարմացնել","status":"Ստատուս","category":"Կատեգորիա","orders":{"score":"Միավոր","created_at":"Ստեղծվել է At","created_at_asc":"Ստեղծվել է At (հետադարձ տեսակավորում)"},"priority":{"title":"Մինիմալ Գերակայություն","any":"(ցանկացած)","low":"Բարձր","medium":"Միջին","high":"Կարևոր"}},"conversation":{"view_full":"դիտել ամբողջ զրույցը"},"scores":{"about":"Այս գնահատականը հաշվարկվում է՝ ելնելով զեկուցողի վստահության մակարդակից, նրանց նախորդ բողքների ճշգրտությունից և հաղորդվող գրառումի գերակայությունից:","score":"Միավոր","date":"Ամսաթիվ","type":"Տիպ","status":"Ստատուս","submitted_by":"Ներկայացվել է","reviewed_by":"Վերանայվել է"},"statuses":{"pending":{"title":"Սպասող"},"approved":{"title":"Հաստատված է"},"rejected":{"title":"Մերժված"},"ignored":{"title":"Անտեսված"},"deleted":{"title":"Ջնջված է"},"reviewed":{"title":"(բոլորը վերանայված են)"},"all":{"title":"(բոլորը)"}},"types":{"reviewable_flagged_post":{"title":"Դրոշակավորված Գրառումներ","flagged_by":"Դրոշակավորել է"},"reviewable_queued_topic":{"title":"Թեման Հերթագրված է "},"reviewable_queued_post":{"title":"Հաղորդագրությունը Հերթագրված է "},"reviewable_user":{"title":"Օգտատեր"},"reviewable_post":{"title":"Գրառում"}},"approval":{"title":"Գրառումը Հաստատման Կարիք Ունի","description":"Մենք ստացել ենք Ձեր նոր գրառումը, սակայն այն պետք է հաստատվի մոդերատորի կողմից մինչև ցուցադրվելը: Խնդրում ենք սպասել:","ok":"ՕԿ"},"example_username":"օգտանուն"},"relative_time_picker":{"days":{"one":"օր","other":"օր"}},"time_shortcut":{"later_today":"Այսօր, մի փոքր ուշ","next_business_day":"Հաջորդ աշխատանքային օրը: ","tomorrow":"Վաղը","later_this_week":"Այս շաբաթ, մի փոքր ավելի ուշ","this_weekend":"Այս շաբաթ-կիրակի","start_of_next_business_week_alt":"Հաջորդ Երկուշաբթի: ","next_month":"Հաջորդ ամիս","custom":"Սահմանել հիշեցումների ամսաթիվն ու ժամանակը:"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e-ը հրապարակել է \u003ca href='%{topicUrl}'\u003eայս թեման\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eԴուք\u003c/a\u003e հրապարակել եք \u003ca href='%{topicUrl}'\u003eայս թեման\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e-ը պատասխանել է \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e գրառմանը","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eԴուք\u003c/a\u003e պատասխանել եք \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e գրառմանը","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e-ը պատասխանել է \u003ca href='%{topicUrl}'\u003eայս թեմային\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eԴուք\u003c/a\u003e պատասխանել եք \u003ca href='%{topicUrl}'\u003eայս թեմային\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e-ը հիշատակել է \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e-ին","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e-ը հիշատակել է \u003ca href='%{user2Url}'\u003eՁեզ\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eԴուք\u003c/a\u003e հիշատակել եք \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e-ին","posted_by_user":"Հրապարակվել է \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e-ի կողմից","posted_by_you":"Հրապարակվել է \u003ca href='%{userUrl}'\u003eՁեր\u003c/a\u003e կողմից","sent_by_user":"Ուղարկվել է\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e-ի կողմից","sent_by_you":"Ուղարկվել է \u003ca href='%{userUrl}'\u003eՁեր\u003c/a\u003eկողմից"},"directory":{"username":"Օգտանուն","filter_name":"ֆիլտրել ըստ օգտանվան","title":"Օգտատերեր","likes_given":"Տրված","likes_received":"Ստացած","topics_entered":"Դիտված","topics_entered_long":"Դիտված Թեմաները","time_read":"Կարդացած Ժամանակը","topic_count":"Թեմա","topic_count_long":"Ստեղծված Թեմա","post_count":"Պատասխան","post_count_long":"Հրապարակված Պատասխան","no_results":"Արդյունքներ չեն գտնվել:","days_visited":"Այցելություն","days_visited_long":"Այցելության Օր","posts_read":"Կարդացած","posts_read_long":"Կարդացած Գրառում","last_updated":"Վերջին թարմացումը. ","total_rows":{"one":"%{count} օգտատեր","other":"%{count} օգտատեր"},"edit_columns":{"save":"Պահպանել","reset_to_default":"Վերականգնել լռելյայն"},"group":{"all":"բոլոր խմբերը"}},"group_histories":{"actions":{"change_group_setting":"Փոխել խմբի կարգավորումը","add_user_to_group":"Ավելացնել օգտատեր","remove_user_from_group":"Հեռացնել օգտատիրոջը","make_user_group_owner":"Դարձնել սեփականատեր","remove_user_as_group_owner":"Հետ կանչել սեփականատիրոջ թույլտվությունը"}},"groups":{"member_added":"Ավելացված","member_requested":"Հարցով ","add_members":{"usernames_placeholder":"օգտանուններ"},"requests":{"title":"Հարցումներ ","reason":"Պատճառ","accept":"Ընդունել","accepted":"ընդունված","deny":"Մերժել","denied":"Մերժվել","undone":"հայցը չեղարկել","handle":"Մշակել հարցումը "},"manage":{"title":"Կառավարել","name":"Անուն","full_name":"Անուն Ազգանուն","invite_members":"Հրավիրել","delete_member_confirm":"Հեռացնե՞լ '%{username}' օգտանունը '%{group}' խմբից:","profile":{"title":"Պրոֆիլ"},"interaction":{"title":"Փոխազդեցություն","posting":"Հրապարակում","notification":"Ծանուցում"},"email":{"title":"Էլ. հասցե","last_updated_by":"կողմից","credentials":{"username":"Օգտանուն","password":"Գաղտնաբառ"},"settings":{"title":"Կարգավորումներ"},"mailboxes":{"disabled":"Անջատված"}},"membership":{"title":"Անդամակցություն","access":"Թույլտվություն"},"categories":{"title":"Կատեգորիաներ"},"tags":{"title":"Թեգեր"},"logs":{"title":"Գրառումներ","when":"Երբ","action":"Գործողություն","acting_user":"Կատարող օգտատեր","target_user":"Նպատակային օգտատեր","subject":"Թեմա","details":"Մանրամասներ","from":"Ումից","to":"Ում"}},"permissions":{"title":"Թույլտվություններ"},"public_admission":"Թույլ տալ օգտատերերին ազատ կերպով միանալ խմբին (Խումբը պետք է լինի հրապարակային)","public_exit":"Թույլ տալ օգտատերերին ազատ կերպով լքել խումբը","empty":{"posts":"Այս խմբի անդամների կողմից գրառումներ չկան:","members":"Այս խմբում անդամներ չկան:","requests":"Այս խմբի համար՝ մասնակցության վերաբերյալ հարցումներ չկան: ","mentions":"Այս խմբի հիշատակումներ չկան:","messages":"Այս խմբի համար հաղորդագրություններ չկան:","topics":"Այս խմբի անդամների կողմից թեմաներ չկան:","logs":"Այս խմբի համար գրառումներ չկան:"},"add":"Ավելացնել","join":"Միանալ","leave":"Լքել","request":"Հարցում","message":"Հաղորդագրություն","confirm_leave":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս թեգի խումբը:","allow_membership_requests":"Թույլատրել օգտատերերին՝ անդամակցության հարցումներ ուղարկել խմբի սեփականատերերին (Պահանջում է հրապարակայնորեն տեսանելի խումբ)","membership_request_template":"Մասնավոր ձևանմուշ, որը կցուցադրվի օգտատերերին՝ անդամակցության հարցում ուղարկելիս","membership_request":{"submit":"Ուղարկել Հարցում","title":" @%{group_name}-ին միանալու հարցում","reason":"Տեղեկացրեք խմբի սեփականատերերին, թե ինչու եք ցանկանում միանալ այս խմբին"},"membership":"Անդամակցություն","name":"Անուն","group_name":"Խմբի անուն","user_count":"Օգտատեր","bio":"Խմբի Մասին ","selector_placeholder":"մուտքագրեք օգտանունը","owner":"սեփականատեր","index":{"title":"Խմբեր","all":"Բոլոր Խմբերը","empty":"Տեսանելի խմբեր չկան:","filter":"Ֆիլտրել ըստ խմբի տիպի","owner_groups":"Խմբերը, որտեղ ես սեփականատեր եմ","close_groups":"Փակված Խմբեր","automatic_groups":"Ավտոմատ Խմբեր","automatic":"Ավտոմատ","closed":"Փակված","public":"Հրապարակային","private":"Գաղտնի","public_groups":"Հրապարակային Խմբեր","my_groups":"Իմ Խմբերը","group_type":"Խմբի տիպը","is_group_user":"Անդամ","is_group_owner":"Սեփականատեր"},"title":{"one":"Խումբ","other":"Խմբեր"},"activity":"Ակտիվություն","members":{"title":"Անդամներ","filter_placeholder_admin":"օգտանուն կամ էլ. փոստի հասցե","filter_placeholder":"օգտանուն","remove_member":"Հեռացնել Խմբից","remove_member_description":"Հեռացնել \u003cb\u003e%{username}\u003c/b\u003e-ին այս խմբից","make_owner":"Դարձնել Սեփականատեր","make_owner_description":"Դարձնել \u003cb\u003e%{username}\u003c/b\u003e-ին այս խմբի սեփականատեր","remove_owner":"Զրկել սեփականատիրոջ իրավունքից","remove_owner_description":"Զրկել \u003cb\u003e%{username}\u003c/b\u003e-ին այս խմբի սեփականատիրոջ իրավունքից","owner":"Սեփականատեր","forbidden":"Ձեզ թույլատրված չէ դիտել դա:"},"topics":"Թեմաներ","posts":"Գրառումներ","mentions":"Հիշատակումներ","messages":"Հաղորդագրություններ","notification_level":"Խմբակային հաղորդագրությունների համար լռելյայն ծանուցումների կարգավիճակը","alias_levels":{"mentionable":"Ո՞վ կարող է @հիշատակել այս խումբը:","messageable":"Ո՞վ կարող է հաղորդագրություն ուղարկել այս խմբին:","nobody":"Ոչ ոք","only_admins":"Միայն ադմինները","mods_and_admins":"Միայն մոդերատորները և ադմինները","members_mods_and_admins":"Միայն խմբի անդամները, մոդերատորները և ադմինները","owners_mods_and_admins":"Միայն խմբի անդամները, մոդերատորները և ադմինները","everyone":"Բոլորը"},"notifications":{"watching":{"title":"Դիտում Եմ","description":"Դուք ծանուցում կստանաք յուրաքանչյուր հաղորդագրության յուրաքանչյուր գրառման մասին, և կցուցադրվի նոր պատասխանների քանակը:"},"watching_first_post":{"title":"Դիտում Եմ Առաջին Գրառումը","description":"Դուք ծանուցում կստանաք այս խմբի նոր հաղորդագրությունների մասին, բայց ոչ հաղորդագրությունների պատասխանների:"},"tracking":{"title":"Հետևում Եմ","description":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ, և կցուցադրվի նոր պատասխանների քանակը:"},"regular":{"title":"Սովորական","description":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:"},"muted":{"title":"Խլացված","description":"Այս խմբի նոր հաղորդագրությունների հետ կապված Դուք երբեք որևէ ծանուցում չեք ստանա:"}},"flair_url":"Avatar Flair Նկար","flair_bg_color":"Avatar Flair Ֆոնի Գույն","flair_bg_color_placeholder":"(Ընտրովի) Գույնի Hex արժեք","flair_color":"Avatar Flair Գույն","flair_color_placeholder":"(Ընտրովի) Գույնի Hex արժեք","flair_preview_icon":"Նախադիտման Պատկերակ","flair_preview_image":"Նախադիտման Նկար","default_notifications":{"modal_description":"Ցանկանաու՞մ եք այս փոփոխությունը կիրառել պատմականորեն: Սա կփոխի կարգավորումը %{count} համար՝ առկա օգտատերերի:","modal_yes":"Այո","modal_no":"Ոչ, կիրառել փոփոխություններ միայն՝ ապագայում "}},"user_action_groups":{"1":"Տրված Հավանումներ","2":"Ստացած Հավանումներ","3":"Էջանշաններ","4":"Թեմաներ","5":"Պատասխաններ","6":"Արձագանքներ","7":"Հիշատակումներ","9":"Մեջբերումներ","11":"Խմբագրումներ","12":"Ուղարկված","13":"Մուտքի արկղ","14":"Սպասող","15":"Սևագրեր"},"categories":{"all":"բոլոր կատեգորիաները","all_subcategories":"բոլորը","no_subcategory":"ոչ մեկը","category":"Կատեգորիա","category_list":"Ցուցադրել կատեգորիաների ցանկը","reorder":{"title":"Վերադասավորել Կատեգորիաները","title_long":"Վերակազմավորել կատեգորիաների ցանկը","save":"Պահպանել Դասավորությունը","apply_all":"Կիրառել","position":"Դիրքը"},"posts":"Գրառումներ","topics":"Թեմաներ","latest":"Վերջինները","subcategories":"Ենթակատեգորիաներ","topic_sentence":{"one":"%{count} թեմա","other":"%{count} թեմա"},"topic_stat_unit":{"week":"շաբաթ","month":"ամիս"},"topic_stat_sentence_week":{"one":"%{count} նոր թեմա անցյալ շաբաթվա ընթացքում","other":"%{count} նոր թեմա անցյալ շաբաթվա ընթացքում:"},"topic_stat_sentence_month":{"one":"%{count} նոր թեմա անցյալ ամսվա ընթացքում","other":"%{count} նոր թեմա անցյալ ամսվա ընթացքում:"},"n_more":"Կատեգորիաներ (ևս %{count})..."},"ip_lookup":{"title":"IP Հասցեի Որոնում","hostname":"Հոսթի անունը","location":"Վայրը","location_not_found":"(անհայտ)","organisation":"Կազմակերպություն","phone":"Հեռախոս","other_accounts":"Այլ հաշիվներ այս IP հասցեով՝","delete_other_accounts":"Ջնջել %{count}","username":"օգտանուն","trust_level":"ՎՄ","read_time":"կարդացած ժամանակը","topics_entered":"մուտքագրված թեմաներ","post_count":"# գրառում","confirm_delete_other_accounts":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս հաշիվները:","powered_by":"օգտագործվում է՝ \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"կրկօրինակված"},"user_fields":{"none":"(ընտրել)"},"user":{"said":"%{username} ՝","profile":"Պրոֆիլ","mute":"Խլացնել","edit":"Խմբագրել Նախընտրությունները","download_archive":{"button_text":"Ներբեռնել Բոլորը","confirm":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ներբեռնել Ձեր գրառումները:","success":"Ներբեռնումը սկսված է, Դուք կստանաք ծանուցում հաղորդագրության միջոցով, երբ գործընթացն ավարտվի:","rate_limit_error":"Գրառումները կարելի է ներբեռնել միայն օրը մեկ անգամ, խնդրում ենք կրկին փորձել վաղը:"},"new_private_message":"Նոր Հաղորդագրություն","private_message":"Հաղորդագրություն","private_messages":"Հաղորդագրություններ","user_notifications":{"filters":{"all":"Ամբողջը","read":"Կարդացած","unread":"Չկարդացած"},"ignore_duration_username":"Օգտանուն","ignore_duration_when":"Տևողությունը.","ignore_duration_save":"Անտեսել","ignore_duration_note":"Ուշադրություն դարձրեք, որ բոլոր անտեսումները ավտոմատ կերպով հանվում են անտեսման տևողության ավարտից հետո:","ignore_duration_time_frame_required":"Խնդրում ենք ընտրել ժամանակահատված","ignore_no_users":"Դուք անտեսված օգտատերեր չունեք","ignore_option":"Անտեսված","ignore_option_title":"Դուք չեք ստանա այս օգտատիրոջ ծանուցումները, և նրա բոլոր թեմաներն ու պատասխանները կթաքցվեն:","add_ignored_user":"Ավելացնել","mute_option":"Խլացված","mute_option_title":"Դուք այս օգտատիրոջից որևէ ծանուցում չեք ստանա:","normal_option":"Նորմալ","normal_option_title":"Դուք ծանուցում կստանաք, եթե այդ օգտատերը պատասխանի ձեր հրապարակմանը, մեջբերում անի կամ հիշատակի ձեր անունը:"},"notification_schedule":{"none":"Ոչ մի","to":"ում"},"activity_stream":"Ակտիվություն","read":"Կարդացած","preferences":"Նախընտրություններ","feature_topic_on_profile":{"open_search":"Ընտրեք Նոր Թեմա","title":"Ընտրել Թեմա","search_label":"Որոնել Թեմա ըստ վերնագրի","save":"Պահպանել","clear":{"title":"Ջնջել","warning":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս թեմայի բոլոր էջանշանները:"}},"use_current_timezone":"Օգտագործեք՝ ավտոմատ կերպով Ներկայիս Ժամային գոտին որոշելը","profile_hidden":"Այս օգտատիրոջ հրապարակային պրոֆիլը թաքցրած է:","expand_profile":"Ընդլայնել","collapse_profile":"Կրճատել","bookmarks":"Էջանշաններ","bio":"Իմ մասին","timezone":"Ժամային գոտի","invited_by":"Ում կողմից է հրավիրված","trust_level":"Վստահության Մակարդակ","notifications":"Ծանուցումներ","statistics":"Վիճակագրություն","desktop_notifications":{"label":"Այժմեական(Live) Ծանուցումներ","not_supported":"Այս բրաուզերը չի ապահովում ծանուցումներ, ներողություն:","perm_default":"Միացնել Ծանուցումները","perm_denied_btn":"Թույլտվությունը Մերժված է","perm_denied_expl":"Դուք մերժել եք ծանուցումների թույլտվությունը: Թույլատրեք ծանուցումները Ձեր բրաուզերի կարգավորումներից:","disable":"Անջատել Ծանուցումները","enable":"Միացնել Ծանուցումները","consent_prompt":"Դուք ցանկանո՞ւմ եք ստանալ այժմեական ծանուցումներ, երբ մարդիկ պատասխանեն Ձեր գրառումներին:"},"dismiss":"Չեղարկել","dismiss_notifications":"Չեղարկել Բոլորը","dismiss_notifications_tooltip":"Նշել բոլոր չկարդացած ծանուցումները որպես կարդացած:","first_notification":"Ձեր առաջին ծանուցումն է! Ընտրեք այն՝ սկսելու համար:","dynamic_favicon":"Ցուցադրել քանակը բրաուզերի պատկերակի վրա","theme_default_on_all_devices":"Դարձնել սա լռելյայն թեմա իմ բոլոր սարքավորումների համար","color_schemes":{"undo":"Զրոյացնել","regular":"Սովորական"},"text_size_default_on_all_devices":"Դարձնել սա լռելյայն տեքստի չափ իմ բոլոր սարքավորում համար","allow_private_messages":"Թույլ տալ այլ օգտատերերին ուղարկել ինձ անձնական հաղորդագրություններ","external_links_in_new_tab":"Բացել բոլոր արտաքին հղումները նոր ներդիրում(tab)","enable_quoting":"Միացնել մեջբերմամբ պատասխանելը ընդգծված տեքստի համար","enable_defer":"Սեղմել \u003c\u003cՀետաձգում\u003e\u003e կոճակը, նշելով որպես չընթերցված թեմաներ ","change":"փոխել","featured_topic":"Հանրահայտ թեմա","moderator":"%{user}-ը մոդերատոր է","admin":"%{user}-ը ադմին է","moderator_tooltip":"Այս օգտատերը մոդերատոր է","admin_tooltip":"Այս օգտատերն ադմին է","silenced_tooltip":"Այս օգտատերը լռեցված է","suspended_notice":"Այս օգտատերը սառեցված է մինչև %{date}:","suspended_permanently":"Այս օգտատերը սառեցված է","suspended_reason":"Պատճառը՝ ","github_profile":"GitHub","email_activity_summary":"Ակտիվության Ամփոփում","mailing_list_mode":{"label":"Փոստային ցուցակի ռեժիմ","enabled":"Միացնել փոստային ցուցակի ռեժիմը","instructions":"Այս կարգավորումը վերասահմանում է ակտիվության ամփոփումը:\u003cbr /\u003e\nԽլացված թեմաները և կատեգորիաները ներառված չեն լինի այս էլ. նամակներում:\n","individual":"Ուղարկել էլ. նամակ յուրաքանչյուր նոր գրառման համար","individual_no_echo":"Ուղարկել էլ. նամակ յուրաքանչյուր նոր գրառման համար, բացառությամբ իմ սեփականների","many_per_day":"Ստանալ էլ. նամակ յուրաքանչյուր նոր գրառման համար (օրը մոտ %{dailyEmailEstimate} հատ)","few_per_day":"Ստանալ էլ. նամակ յուրաքանչյուր նոր գրառման համար (օրը մոտ 2 հատ)","warning":"Փոստային ցուցակի ռեժիմը միացված է: Էլ. փոստով ծանուցումների կարգավորումները վերասահմանված են: "},"tag_settings":"Թեգեր","watched_tags":"Դիտված","watched_tags_instructions":"Դուք ավտոմատ կերպով կդիտեք այս թեգերով բոլոր թեմաները: Դուք կստանաք ծանուցում բոլոր նոր գրառումների և թեմաների մասին, և նոր գրառումների քանակը նաև կհայտնվի թեմայի կողքին:","tracked_tags":"Հետևած","tracked_tags_instructions":"Դուք ավտոմատ կերպով կհետևեք այս թեգերով բոլոր թեմաներին: Նոր գրառումների քանակը կհայտնվի թեմայի կողքին:","muted_tags":"Խլացված","muted_tags_instructions":"Այս թեգերով ոչ մի նոր հրապարակման մասին դուք ծանուցում չեք ստանա, և դրանք ցույց չեն տրվի վերջինների մեջ:","watched_categories":"Դիտված","watched_categories_instructions":"Դուք ավտոմատ կերպով կդիտեք այս կատեգորիաների բոլոր թեմաները: Դուք կստանաք ծանուցում բոլոր նոր գրառումների և թեմաների մասին, և նոր գրառումների քանակը նաև կհայտնվի թեմայի կողքին:","tracked_categories":"Հետևած","tracked_categories_instructions":"Դուք ավտոմատ կերպով կհետևեք այս կատեգորիաների բոլոր թեմաներին: Նոր գրառումների քանակը կհայտնվի թեմայի կողքին:","watched_first_post_categories":"Դիտում Եմ Առաջին Գրառումը","watched_first_post_categories_instructions":"Դուք կստանաք ծանուցում այս կատեգորիաների յուրաքանչյուր նոր թեմայի առաջին գրառման մասին:","watched_first_post_tags":"Դիտում Եմ Առաջին Գրառումը","watched_first_post_tags_instructions":"Դուք կստանաք ծանուցում այս թեգերով յուրաքանչյուր նոր թեմայում առաջին գրառման մասին:","muted_categories":"Խլացված","muted_categories_instructions":"Դուք չեք ստանա որևէ ծանուցում այս կատեգորիաների նոր թեմաների մասին, և դրանք չեն հայտնվի կատեգորիաներում կամ վերջին էջերում:","muted_categories_instructions_dont_hide":"Դուք որևէ ծանուցում չեք ստանա այս կատեգորիայի նոր թեմաների վերաբերյալ:","regular_categories":"Սովորական","no_category_access":"Որպես մոդերատոր՝ Դուք ունեք կատեգորիաների սահմանափակ թույլտվություն, պահպանելն անջատված է:","delete_account":"Ջնջել Իմ Հաշիվը","delete_account_confirm":"Դուք համոզվա՞ծ եք, որ ցանկանում եք մշտապես ջնջել Ձեր հաշիվը: Այս գործողությունը չի կարող ետարկվել!","deleted_yourself":"Ձեր հաշիվը հաջողությամբ ջնջված է:","delete_yourself_not_allowed":"Եթե ցանկանում եք ջնջել Ձեր հաշիվը, խնդրում ենք կապ հաստատել անձնակազմի հետ:","unread_message_count":"Հաղորդագրություն","admin_delete":"Ջնջել","users":"Օգտատերեր","muted_users":"Խլացված","ignored_users":"Անտեսված","tracked_topics_link":"Ցուցադրել","automatically_unpin_topics":"Ավտոմատ կերպով ապակցել թեմաները, երբ ես հասնեմ ներքև:","apps":"Հավելվածներ","revoke_access":"Հետ Կանչել Թույլտվությունը","undo_revoke_access":"Ետարկել Թույլտվության Հետկանչումը (Undo Revoke Access)","api_approved":"Հաստատված է՝","api_last_used_at":"Վերջին անգամ օգտագործվել է՝","theme":"Թեմա","home":"Լռելյայն Գլխավոր Էջ","staged":"Աստիճանավորված (Staged)","staff_counters":{"flags_given":"օգտակար դրոշակավորում","flagged_posts":"դրոշակավորված գրառում","deleted_posts":"ջնջված գրառում","suspensions":"սառեցում","warnings_received":"զգուշացում","rejected_posts":"մերժված հաղորդագրություներ"},"messages":{"inbox":"Մուտքերի արկղ","latest":"Վերջինները","sent":"Ուղարկված","unread":"Չկարդացած","unread_with_count":{"one":"Չկարդացած (%{count})","other":"Չկարդացած (%{count})"},"new":"Նոր","new_with_count":{"one":"Նոր (%{count})","other":"Նոր (%{count})"},"archive":"Արխիվ","groups":"Իմ Խմբերը","move_to_inbox":"Տեղափոխել Մուտքերի արկղ","move_to_archive":"Արխիվացնել","failed_to_move":"Չհաջողվեց տեղափոխել ընտրված հաղորդագրությունները (հնարավոր է՝ համացանցի հետ կապված խնդիր կա)","tags":"Թեգեր"},"preferences_nav":{"account":"Հաշիվ","security":"Անվտանգություն","profile":"Պրոֆիլ","emails":"Էլ. հասցեներ","notifications":"Ծանուցումներ","categories":"Կատեգորիաներ","users":"Օգտատերեր","tags":"Թեգեր","interface":"Ինտերֆեյս","apps":"Հավելվածներ"},"change_password":{"success":"(էլ. նամակն ուղարկված է)","in_progress":"(էլ. նամակն ուղարկվում է)","error":"(սխալ)","emoji":"կողպեք էմոջի","action":"Ուղարկել Գաղտնաբառի Վերականգման Էլ. Նամակ","set_password":"Առաջադրել Գաղտնաբառ","choose_new":"Ընտրել նոր գաղտնաբառ","choose":"Ընտրել գաղտնաբառ"},"second_factor_backup":{"regenerate":"Վերագեներացնել","disable":"Անջատել","enable":"Միացնել","enable_long":"Միացնել պահուստային կոդերը","copy_to_clipboard":"Կրկնօրինակել Փոխանակման Հարթակում","copy_to_clipboard_error":"Փոխանակման հարթակում տվյալների կրկնօրինակման սխալ","copied_to_clipboard":"Կրնօրինակված է Փոխանակման հարթակում","download_backup_codes":"Ներբեռնել պահուստային կոդերը","use":"Օգտագործել պահուստային կոդը","codes":{"title":"Պահուստային Կոդերը Գեներացվել են","description":"Այս պահուստային կոդերից յուրաքանչյուրը կարող է օգտագործվել միայն մեկ անգամ: Պահեք դրանք ապահով, բայց հասանելի վայրում:"}},"second_factor":{"forgot_password":"Մոռացե՞լ եք Գաղտնաբառը:","confirm_password_description":"Շարունակելու համար խնդրում ենք հաստատել Ձեր գաղտնաբառը","name":"Անուն","label":"Կոդ","rate_limit":"Խնդրում ենք սպասել՝ նախքան մեկ այլ վավերացման կոդ փորձելը:","enable_description":"Սկանավորեք այս QR կոդը համապատասխան հավելվածում (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) և մուտքագրեք Ձեր նույնականացման կոդը:\n","disable_description":"Խնդրում ենք Ձեր հավելվածից մուտքագրել վավերացման կոդը:","show_key_description":"Մուտքագրել ձեռքով","short_description":"Ձեր ակաունտը պաշտպանեք մեկանգամյա օգտագործման անվտանգության կոդերով:\n","use":"Օգտագործեք Նույնականացման հավելվածը՝ ստուգման համար  ","disable":"Անջատել","save":"Պահպանել","edit":"Խմբագրել","totp":{"title":"Token- Նույնականացումներ","add":"Ավելացնել Նույնականացում","default_name":"Իմ Վավերացումը ","name_and_code_required_error":"Դուք պետք է նշեք նույնականացման հավելվածի կոդը և անվանումը:"},"security_key":{"register":"Գրանցվել","title":"Անվտանգության Բանալիներ","add":"Ավելացնել Անվտանգության Բանալին","default_name":"Անվտանգության Գլխավոր Բանալին","not_allowed_error":"Անվտանգության բանալու գրանցման ժամանակը վերջացել է կամ չեղյալ է հայտարարվել:","already_added_error":"Դուք արդեն գրանցել եք այս անվտանգության բանալին: Պետք չէ այն նորից գրանցել:","edit":"Խմբագրել Անվտանգության Բանալին","save":"Պահպանել","edit_description":"Անվտանգության Բանալիների անվանումը","name_required_error":"Դուք պետք է նշեք անվտանգության բանալու անվանումը "}},"change_about":{"title":"Փոփոխել Իմ Մասին բաժինը","error":"Այս արժեքը փոփոխելիս տեղի է ունեցել սխալ:"},"change_username":{"title":"Փոփոխել Օգտանունը","confirm":"Դուք միանշանակ համոզվա՞ծ եք, որ ցանկանում եք փոփոխել Ձեր օգտանունը:","taken":"Ներողություն, այդ օգտանունը զբաղված է:","invalid":"Այդ օգտանունն անվավեր է: Այն պետք է պարունակի միայն թվեր և տառեր:"},"add_email":{"add":"ավելացնել"},"change_email":{"title":"Փոփոխել Էլ. Հասցեն","taken":"Ներողություն, այդ էլ. հասցեն հասանելի չէ:","error":"Ձեր էլ. հասցեն փոփոխելիս տեղի է ունեցել սխալ: Միգուցե այդ հասցեն արդեն օգտագործվո՞ւմ է:","success":"Մենք ուղարկել ենք էլ. նամակ այդ հասցեին: Խնդրում ենք հետևել հաստատման հրահանգներին:","success_staff":"Մենք ուղարկել ենք էլ. նամակ Ձեր ընթացիկ հասցեին: Խնդրում ենք հետևել հաստատման հրահանգներին:"},"change_avatar":{"title":"Փոխել Ձեր պրոֆիլի նկարը","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e , հիմնված","gravatar_title":"Փոխեք Ձեր անձնապատրկեը Gravatar-ի կայքում %{gravatarName} ","gravatar_failed":"Մենք չկարողացանք գտնել Gravatar %{gravatarName} այդ էլ. հասցեով:","refresh_gravatar_title":"Թարմացնել Ձեր Gravatar-ը %{gravatarName}","letter_based":"Համակարգի կողմից դրված պրոֆիլի նկար","uploaded_avatar":"Անհատական նկար","uploaded_avatar_empty":"Ավելացնել անհատական նկար","upload_title":"Վերբեռնեք Ձեր նկարը","image_is_not_a_square":"Ուշադրություն. մենք կտրել ենք Ձեր նկարը; լայնությունն ու երկարությունը հավասար չէին:"},"change_profile_background":{"title":"Պրոֆիլի Վերնագիրը","instructions":"Պրոֆիլի վերնագիրը կկենտրոնանա և կունենա 1110 պքս լռելյայն լայնություն:"},"change_card_background":{"title":"Օգտատիրոջ Քարտի Ֆոն","instructions":"Ֆոնի նկարները կբերվեն կենտրոն և կունենան 590 պքս լռելյայն լայնություն:"},"change_featured_topic":{"title":"Հանրահայտ թեմա","instructions":"Այս թեմայի հղումը կպատկերվի օգտատիրոջ քարտում և ձեր պրոֆիլում:"},"email":{"title":"Էլ. հասցե","primary":"Հիմնական Էլ. հասցե","secondary":"Երկրորդական Էլ. հասցեներ","primary_label":"հիմնական","update_email":"Փոփոխել Էլ. Հասցեն","no_secondary":"Երկրորդական էլ. հասցեներ չկան","instructions":"Երբեք չի ցուցադրվում հանրությանը","ok":"Հաստատման համար մենք Ձեզ կուղարկենք էլ. նամակ","invalid":"Խնդրում ենք մուտքագրել վավեր էլ. հասցե","authenticated":"Ձեր էլ. հասցեն վավերացվել է %{provider}-ի կողմից","frequency_immediately":"Մենք անհապաղ Ձեզ էլ. նամակ կուղարկենք, եթե դեռևս Դուք դա չեք կարդացել կայքում:","frequency":{"one":"Մենք էլ. նամակ կուղարկենք Ձեզ միայն այն դեպքում, եթե մենք չենք տեսել Ձեզ վերջին րոպեի ընթացքում:","other":"Մենք Ձեզ էլ. նամակ կուղարկենք միայն այն դեպքում, եթե մենք չենք տեսել Ձեզ վերջին %{count} րոպեի ընթացքում:"}},"associated_accounts":{"title":"Կապակցված Հաշիվներ","connect":"Կապել","revoke":"Հետ կանչել","cancel":"Չեղարկել","not_connected":"(չկապակցված)","confirm_modal_title":"Միացնել %{provider} Հաշիվը","confirm_description":{"account_specific":"Ձեր %{provider} հաշիվը '%{account_description}' կօգտագործվի վավերացման համար:","generic":"Ձեր %{provider} հաշիվը կօգտագործվի վավերացման համար:"}},"name":{"title":"Անուն","instructions":"Ձեր անուն ազգանունը (ընտրովի)","instructions_required":"Ձեր անուն ազգանունը","too_short":"Ձեր անունը շատ կարճ է","ok":"Ձեր անունն ընդունված է"},"username":{"title":"Օգտանուն","instructions":"եզակի, առանց բացատների, կարճ","short_instructions":"Մարդիկ կարող են հիշատակել Ձեզ որպես @%{username}","available":"Ձեր օգտանունը հասանելի է","not_available":"Հասանելի չէ: Փորձե՞լ %{suggestion}-ը:","not_available_no_suggestion":"Հասանելի չէ","too_short":"Ձեր օգտանունը շատ կարճ է","too_long":"Ձեր օգտանունը շատ երկար է","checking":"Ստուգվում է օգտանվան հասանելիությունը...","prefilled":"Էլ. հասցեն համընկնում է գրանցված օգտանվան հետ"},"locale":{"title":"Ինտերֆեյսի լեզուն","instructions":"Օգտատիրոջ ինտերֆեյսի լեզուն: Այն կփոխվի, երբ Դուք թարմացնեք էջը:","default":"(լռելյայն)","any":"ցանկացած"},"password_confirmation":{"title":"Կրկնել Գաղտաբառը "},"invite_code":{"title":"Հրավերի Կոդ","instructions":"Հաշվի գրանցման համար պահանջվում է հրավերների կոդ"},"auth_tokens":{"title":"Վերջերս Օգտագործված Սարքերը","details":"Մանրամասներ","log_out_all":"Դուրս գրվել բոլոր սարքերից","not_you":"Դուք չե՞ք:","show_all":"Ցուցադրել բոլորը (%{count})","show_few":"Ցուցադրել ավելի քիչ","was_this_you":"Սա Դո՞ւք էիք:","was_this_you_description":"Եթե դա Դուք չէիք, մենք խորհուրդ ենք տալիս փոխել Ձեր գաղտնաբառը և դուրս գրվել բոլոր սարքերից: ","browser_and_device":"%{browser} %{device}-ի վրա","secure_account":"Ապահովագրել իմ Հաշիվը","latest_post":"Դուք վերջին անգամ հրապարակում կատարել եք..."},"last_posted":"Վերջին Գրառումը","last_seen":"Ակտիվ էր","created":"Միացել է","log_out":"Դուրս գրվել","location":"Վայրը","website":"Վեբ Կայք","email_settings":"Էլ. հասցե","hide_profile_and_presence":"Թաքցնել իմ հրապարակային պրոֆիլը և ներկայության հատկանիշները","enable_physical_keyboard":"Միացնել ֆիզիկական ստեղնաշարի ապահովումը iPad -ի վրա","text_size":{"title":"Տեքստի Չափը","smaller":"Ավելի փոքր","normal":"Նորմալ","larger":"Ավելի մեծ","largest":"Ամենամեծը"},"title_count_mode":{"title":"Ֆոնային էջի վերնագրում պատկերվում է քանակը. ","notifications":"Նոր Ծանուցումներ","contextual":"Նոր էջի բովանդակությունը"},"like_notification_frequency":{"title":"Ծանուցել հավանելու դեպքում","always":"Միշտ","first_time_and_daily":"Առաջին անգամ, երբ գրառումը հավանում են, և օրական","first_time":"Առաջին անգամ, երբ գրառումը հավանում են","never":"Երբեք"},"email_previous_replies":{"title":"Ներառել բոլոր նախորդ պատասխանները էլ. նամակների ներքևում","unless_emailed":"եթե նախկինում ուղարկված չէ","always":"միշտ","never":"երբեք"},"email_digests":{"title":"Երբ ես չեմ այցելում այստեղ, ուղարկեք ինձ ամփոփիչ էլ. նամակ տարածված թեմաների և պատասխանների մասին","every_30_minutes":"30 րոպեն մեկ","every_hour":"ժամը մեկ","daily":"օրը մեկ","weekly":"շաբաթական","every_month":"ամիսը մեկ","every_six_months":"վեց ամիսը մեկ"},"email_level":{"title":"Ուղարկել ինձ էլ, նամակ, երբ որևէ մեկը մեջբերում է ինձ, պատասխանում է իմ գրառմանը, նշում է իմ @օգտանունը կամ հրավիրում է ինձ թեմայի:","always":"միշտ","only_when_away":"միայն երբ հեռու եմ","never":"երբեք"},"email_messages_level":"Ուղարկել ինձ էլ. նամակ, երբ որևէ մեկը հաղորդագրություն է գրում ինձ:","include_tl0_in_digests":"Ներառել նոր օգտատերերի կողմից ավելացվածը ամփոփիչ էլ. նամակներում","email_in_reply_to":"Ներառել գրառումների պատասխանների քաղվածք էլ. նամակներում","other_settings":"Այլ","categories_settings":"Կատեգորիաներ","new_topic_duration":{"label":"Համարել թեմաները նոր, երբ","not_viewed":"Ես դեռևս դրանք չեմ դիտել","last_here":"ստեղծվել են իմ վերջին անգամ այնտեղ լինելուց հետո","after_1_day":"ստեղծվել են նախորդ օրվա ընթացքում","after_2_days":"ստեղծվել են վերջին 2 օրվա ընթացքում","after_1_week":"ստեղծվել են վերջին շաբաթվա ընթացքում","after_2_weeks":"ստեղծվել են վերջին 2 շաբաթվա ընթացքում"},"auto_track_topics":"Ավտոմատ կերպով հետևել իմ բացած թեմաներին","auto_track_options":{"never":"երբեք","immediately":"անմիջապես","after_30_seconds":"30 վայրկյան հետո","after_1_minute":"1 րոպե հետո","after_2_minutes":"2 րոպե հետո","after_3_minutes":"3 րոպե հետո","after_4_minutes":"4 րոպե հետո","after_5_minutes":"5 րոպե հետո","after_10_minutes":"10 րոպե հետո"},"notification_level_when_replying":"Երբ ես գրառում եմ կատարում թեմայում, նշանակել այդ թեման որպես","invited":{"title":"Հրավերներ","pending_tab":"Սպասող","pending_tab_with_count":"Սպասող (%{count})","redeemed_tab":"Ընդունված","redeemed_tab_with_count":"Ընդունված (%{count})","invited_via":"Հրավեր","groups":"Խմբեր","topic":"Թեմա","edit":"Խմբագրել","remove":"Ջնջել","reinvited":"Հրավերը կրկին է ուղարկված","search":"փնտրել հրավերներ...","user":"Հրավիրված Օգտատեր","none":"Հրավերներ չկան:","truncated":{"one":"Առաջին հրավերի ցուցադրում","other":"Ցույց են տրված առաջին %{count} հրավերները:"},"redeemed":"Ընդունված Հրավերները","redeemed_at":"Ընդունվել է","pending":"Սպասող Հրավերներ","topics_entered":"Դիտված Թեմաները","posts_read_count":"Կարդացած Գրառում","expired":"Այս հրավերի ժամկետն անցել է:","removed_all":"Բոլոր Ժամկետանց Հրավերները հեռացված են!","remove_all_confirm":"Դուք համոզվա՞ծ եք, որ ցանկանում եք հեռացնել բոլոր ժամկետանց հրավերները:","reinvite_all_confirm":"Դուք համոզվա՞ծ եք, որ ցանկանում եք կրկին ուղարկել բոլոր հրավերները:","time_read":"Կարդացած Ժամանակը","days_visited":"Այցելության Օր","account_age_days":"Հաշվի տարիքը օրերով","create":"Հրավիրել","valid_for":"Հրավերի հղումը վավեր է միայն հետևյալ էլ. հասցեի համար՝ %{email}","invite_link":{"success":"Հրավերի հղումը հաջողությամբ գեներացված է!"},"bulk_invite":{"error":"Ներողություն, ֆայլը պետք է լինի CSV ձևաչափով:"}},"password":{"title":"Գաղտնաբառ","too_short":"Ձեր գաղտնաբառը շատ կարճ է:","common":"Այդ գաղտնաբառը շատ է տարածված:","same_as_username":"Ձեր գաղտնաբառը համընկնում է Ձեր օգտանվան հետ:","same_as_email":"Ձեր գաղտնաբառը համընկնում է Ձեր էլ. հասցեի հետ:","ok":"Ձեր գաղտնաբառն ընդունված է:","instructions":"առնվազն %{count} սիմվոլ"},"summary":{"title":"Ամփոփում","stats":"Վիճակագրություն","time_read":"կարդացած ժամանակը","recent_time_read":"վերջին կարդալու ժամանակը","topic_count":{"one":"ստեղծված թեմա","other":"ստեղծված թեմա"},"post_count":{"one":"տրված","other":"ստեղծված գրառում"},"likes_given":{"one":"տրված","other":"տրված"},"likes_received":{"one":"ստացած","other":"ստացած"},"days_visited":{"one":"դիտված թեմաներ","other":"այցելության օր"},"topics_entered":{"one":"դիտված թեմա","other":"դիտված թեմաները"},"posts_read":{"one":"կարդացած հրապարակում","other":"կարդացած գրառում"},"bookmark_count":{"one":"նշում","other":"էջանշան"},"top_replies":"Թոփ Պատասխանները","no_replies":"Պատասխաններ դեռևս չկան:","more_replies":"Ավելի Շատ Պատասխաններ","top_topics":"Թոփ Թեմաներ","no_topics":"Թեմաներ դեռևս չկան:","more_topics":"Ավելի Շատ Թեմաներ","top_badges":"Թոփ Կրծքանշաններ","no_badges":"Կրծքանշաններ դեռևս չկան","more_badges":"Ավելի Շատ Կրծքանշաններ","top_links":"Թոփ Հղումներ","no_links":"Հղումներ դեռևս չկան:","most_liked_by":"Առավել Շատ Հավանել են","most_liked_users":"Առավել Շատ Հավանել է","most_replied_to_users":"Առավել Շատ Պատասխանել է","no_likes":"Հավանումներ դեռևս չկան:","top_categories":"Թոփ Կատեգորիաներ","topics":"Թեմաներ","replies":"Պատասխաններ"},"ip_address":{"title":"Վերջին IP Հասցեն"},"registration_ip_address":{"title":"Գրանցման IP Հասցեն"},"avatar":{"title":"Պրոֆիլի Նկար","header_title":"պրոֆիլ, հաղորդագրություններ, էջանշաններ և նախընտրություններ"},"title":{"title":"Վերնագիր","none":"(ոչ մի)"},"flair":{"none":"(ոչ մի)"},"primary_group":{"title":"Հիմնական Խումբ","none":"(ոչ մի)"},"filters":{"all":"Բոլորը"},"stream":{"posted_by":"Հրապարակվել է՝","sent_by":"Ուղարկվել է՝","private_message":"հաղորդագրություն","the_topic":"թեման"},"date_of_birth":{"user_title":"Այսօր Ձեր ծննդյան օրն է!","title":"Այսօր իմ ծննդյան օրն է!","label":"Ծննդյան ամսաթիվ"},"anniversary":{"user_title":"Այսօր մեր համայնքին Ձեր միանալու տարեդարձն է!","title":"Այսօր լրանում է այս համայնքին իմ միանալու տարեդարձը!"}},"loading":"Բեռնվում է...","errors":{"prev_page":"բեռնման ընթացքում","reasons":{"network":"Ցանցային Սխալ","server":"Սերվերի Սխալ","forbidden":"Թույլտվությունը Մերժված է","unknown":"Սխալ","not_found":"Էջը Չի Գտնվել"},"desc":{"network":"Խնդրում ենք ստուգել Ձեր ինտերնետը:","network_fixed":"Կապը համացանցին վերականգնվեց:","server":"Սխալի կոդը՝ %{status}","forbidden":"Ձեզ թույլատրված չէ դիտել դա:","not_found":"Վա՜յ, հավելվածը փորձել է բեռնել գոյություն չունեցող URL:","unknown":"Ինչ-որ բան այն չէ:"},"buttons":{"back":"Վերադառնալ","again":"Կրկին Փորձել","fixed":"Բեռնել էջը"}},"modal":{"close":"փակել","dismiss_error":"Չեղարկել սխալը"},"close":"Փակել","logout":"Դուք դուրս եք գրվել:","refresh":"Թարմացնել","home":"Գլխավոր էջ","read_only_mode":{"enabled":"Այս կայքը «միայն կարդալու համար» ռեժիմում է: Խնդրում ենք շարունակել, սակայն պատասխանելը, հավանելը և այլ գործողությունները հիմա անջատված են:","login_disabled":"Մուտք գործելն անջատված է, քանի դեռ կայքը գտնվում է «միայն կարդալու համար» ռեժիմում:","logout_disabled":"Դուրս գրվելը անջատված է, երբ կայքը գտնվում է միայն կարդալու համար ռեժիմում:"},"learn_more":"իմանալ ավելին...","first_post":"Առաջին գրառումը","mute":"Խլացնել","unmute":"Միացնել","last_post":"Հրապարակված","local_time":"Տեղական Ժամանակը","time_read":"Կարդացված","time_read_recently":"%{time_read} վերջերս","time_read_tooltip":"%{time_read} կարդալու ընդհանուր ժամանակը","time_read_recently_tooltip":"%{time_read} կարդալու ընդհանուր ժամանակը (%{recent_time_read} վերջին 60 օրվա ընթացքում)","last_reply_lowercase":"վերջին պատասխանը","replies_lowercase":{"one":"պատասխան","other":"պատասխան"},"signup_cta":{"sign_up":"Գրանցվել","hide_session":"Հիշեցնել ինձ վաղը","hide_forever":"ոչ, շնորհակալություն","intro":"Ողջույն! Կարծես թե Դուք վայելում եք քննարկումը, սակայն դեռևս հաշիվ չեք գրանցել:","value_prop":"Երբ Դուք ստեղծում եք հաշիվ, մենք հստակ հիշում ենք, թե Դուք ինչ եք կադացել, այսպիսով՝ Դուք միշտ վերադառնում եք ճիշտ այնտեղ, որտեղ կանգնել էիք: Դուք նաև ստանում եք ծանուցումներ այստեղ և էլ. փոստով, երբ որևէ մեկը պատասխանում է Ձեզ: Եվ Դուք կարող եք հավանել գրառումներ՝ կիսվելով սիրով: :heartpulse:"},"summary":{"enabled_description":"Դուք դիտում եք այս թեմայի ամփոփումը՝ համայնքի կողմից որոշված ամենահետաքրքիր գրառումները:","enable":"Ամփոփել Այս Թեման","disable":"Ցուցադրել Բոլոր Գրառումները"},"deleted_filter":{"enabled_description":"Այս թեման պարունակում է հեռացված գրառումներ, որոնք թաքցվել են:","disabled_description":"Այս թեմայի հեռացված գրառումները ցուցադրվում են:","enable":"Թաքցնել Հեռացված Գրառումները","disable":"Ցուցադրել Հեռացված Գրառումները"},"private_message_info":{"title":"Հաղորդագրություն","invite":"Հրավիրել այլ Մարդկանց...","edit":"Ավելացնել կամ Հեռացնել...","add":"Ավելացնել","leave_message":"Դուք իսկապե՞ս ցանկանում եք թողնել այս հաղորդագրությունը:","remove_allowed_user":"Դուք իսկապե՞ս ցանկանում եք հեռացնել %{name}-ը այս հաղորդագրությունից:","remove_allowed_group":"Դուք իսկապե՞ս ցանկանում եք հեռացնել %{name}-ը այս հաղորդագրությունից:"},"email":"Էլ. հասցե","username":"Օգտանուն","last_seen":"Ակտիվ էր","created":"Ստեղծվել է","created_lowercase":"ստեղծվել է","trust_level":"Վստահության Մակարդակ","search_hint":"օգտանուն, էլ. հասցե կամ IP հասցե","create_account":{"header_title":"Բարի գալուստ!","disclaimer":"Գրանցվելով դուք ընդունում եք \u003ca href='%{privacy_link}' target='blank'\u003e գաղտնիության քաղաքականությունը \u003c/a\u003e և \u003ca href='%{tos_link}' target='blank'\u003e պայմանները \u003c/a\u003e:","failed":"Ինչ-որ սխալ է տեղի ունեցել, հնարավոր է՝ այս էլ. հասցեն արդեն գրանցված է, փորձեք կատարել գաղտնաբառի վերականգնում:"},"forgot_password":{"title":"Գաղտնաբառի Վերականգնում","action":"Ես մոռացել եմ իմ գաղտնաբառը","invite":"Մուտքագրեք Ձեր օգտանունը կամ էլ. հասցեն, և մենք Ձեզ կուղարկենք գաղտնաբառի վերականգման էլ. նամակ:","reset":"Վերականգնել Գաղտնաբառը","complete_username":"Եթե որևէ հաշիվ համընկնում է \u003cb\u003e%{username}\u003c/b\u003e օգտանվանը, ապա Դուք շուտով կստանաք Ձեր գաղտնաբառի վերականգման հրահանգներով էլ. նամակ:","complete_email":"Եթե որևէ հաշիվ համընկնում է \u003cb\u003e%{email}\u003c/b\u003e էլ. հասցեին, ապա Դուք շուտով կստանաք Ձեր գաղտնաբառի վերականգման հրահանգներով էլ. նամակ:","complete_username_found":"Մենք գտել ենք \u003cb\u003e%{username}\u003c/b\u003e օգտանվանը համապատասխանող հաշիվ: Դուք շուտով կստանաք ձեր գաղտնաբառի վերականգման հրահանգներով էլ. նամակ:","complete_email_found":"Մենք գտել ենք \u003cb\u003e%{email}\u003c/b\u003e էլ. հասցեին համապատասխանող հաշիվ: Դուք շուտով կստանաք Ձեր գաղտնաբառի վերականգման հրահանգներով էլ. նամակ:","complete_username_not_found":"Ոչ մի հաշիվ չի համընկնում \u003cb\u003e%{username}\u003c/b\u003e օգտանվանը","complete_email_not_found":"Ոչ մի հաշիվ չի համընկնում \u003cb\u003e%{email}\u003c/b\u003e էլ. հասցեին","help":"Էլ. նամակը չի՞ եկել: Համոզվեք՝ առաջին հերթին ստուգելով Սպամ թղթապանակը: \u003cp\u003eՀամոզված չեք, թե ո՞ր էլ. հասցեն եք օգտագործել. խնդրում ենք մուտքագրել այն այստեղ և մենք կստուգենք, թե արդյոք այն առկա է համակարգում:\u003c/p\u003e\u003cp\u003eԵթե Ձեր հաշվի էլ. հասցեն այլևս հասանելի չէ Ձեզ, խնդրում ենք կապ հաստատել \u003ca href='%{basePath}/about'\u003eմեր օգնության անձնակազմի հետ:\u003c/a\u003e\u003c/p\u003e","button_ok":"ՕԿ","button_help":"Օգնություն"},"email_login":{"link_label":"Ուղարկեք ինձ մուտքի հղում","button_label":"էլ. նամակով","emoji":"կողպեք էմոջի","complete_username":"Եթե \u003cb\u003e%{username}\u003c/b\u003e օգտանվանը համապատասխանող հաշիվ գոյություն ունի, ապա Դուք շուտով կստանաք էլ-նամակ մուտքի հղումով:","complete_email":"Եթե \u003cb\u003e%{email}\u003c/b\u003e էլ. հասցեին համապատասխանող հաշիվ գոյություն ունի, ապա Դուք շուտով կստանաք էլ. նամակ մուտքի հղումով:","complete_username_found":"Մենք գտել ենք \u003cb\u003e%{username}\u003c/b\u003e օգտանվանը համապատասխանող հաշիվ, Դուք շուտով կստանաք մուտքի հղումով էլ. նամակ:","complete_email_found":"Մենք գտել ենք հաշիվ, որը համընկնում է \u003cb\u003e%{email}\u003c/b\u003e էլ. հասցեի հետ, Դուք շուտով կստանաք էլ. նամակ մուտքի հղումով:","complete_username_not_found":"\u003cb\u003e%{username}\u003c/b\u003e օգտանվանը համապատասխանող հաշիվ չի գտնվել:","complete_email_not_found":"Ոչ մի հաշիվ չի համընկնում \u003cb\u003e%{email}\u003c/b\u003e էլ. հասցեին","confirm_title":"Շարունակել դեպի %{site_name}","logging_in_as":"Մուտք գործել որպես %{email}","confirm_button":"Ավարտել Մուտքը"},"login":{"username":"Օգտատեր","password":"Գաղտնաբառ","second_factor_description":"Խնդրում ենք Ձեր հավելվածից մուտքագրել վավերացման կոդը՝","second_factor_backup":"Մուտք գործել օգտագործելով պահուստային կոդը","second_factor_backup_description":"Խնդրում ենք մուտքագրել ձեր պահուստային կոդերից որևէ մեկը՝","second_factor":"Մուտք գործել օգտագործելով Authenticator հավելվածը","security_key_alternative":"Փորձեք ուրիշ տարբերակ","security_key_authenticate":"Վավերացնել Անվտանգության Բանալիով ","security_key_not_allowed_error":"Անվտանգության բանալու գրանցման ժամանակը վերջացել է կամ չեղյալ է հայտարարվել:","security_key_no_matching_credential_error":"Նշված անվտանգության բանալիի մեջ չեն գտնվել համապատասխան հավատարմագրերը: ","security_key_support_missing_error":"Ձեր ընթացիկ սարքը կամ բրաուզերը չի պահպանում անվտանգության բանալիների  օգտագործումը: Խնդրում ենք օգտագործել ուրիշ մեթոդ:","caps_lock_warning":"Caps Lock-ը միացված է","error":"Անհայտ սխալ","cookies_error":"Կարծես թե Ձեր բրաուզերի քուքիները անջատված են: Դուք չեք կարող մուտք գործել առանց դրանք միացնելու:","rate_limit":"Խնդրում ենք սպասել՝ մինչ կրկին մուտք գործել փորձելը:","blank_username":"Խնդրում ենք մուտքագրել Ձեր էլ. հասցեն կամ օգտանունը:","blank_username_or_password":"Խնդրում ենք մուտքագրել Ձեր էլ. հասցեն կամ օգտանունը, և գաղտնաբառը:","reset_password":"Վերականգնել Գաղտնաբառը","logging_in":"Մուտք...","or":"Կամ","authenticating":"Վավերացվում է...","awaiting_activation":"Ձեր հաշիվն ակտիվացված չէ, օգտագործեք մոռացել եմ գաղտնաբառը հղումը՝ ակտիվացման մեկ այլ էլ. նամակ ստանալու համար:","awaiting_approval":"Ձեր հաշիվը դեռևս չի հաստատվել անձնակազմի կողմից: Երբ այն հաստատվի, Դուք կստանաք էլ. նամակ:","requires_invite":"Ներողություն, այս ֆորումին թույլտվությունը միայն հրավերով է:","not_activated":"Դուք դեռևս չեք կարող մուտք գործել: Մենք որոշ ժամանակ առաջ Ձեզ ուղարկել ենք ակտիվացման նամակ \u003cb\u003e%{sentTo}\u003c/b\u003e էլ. հասցեին: Խնդրում ենք հետևել այդ նամակի հրահանգներին՝ Ձեր հաշիվը ակտիվացնելու համար:","admin_not_allowed_from_ip_address":"Դուք չեք կարող մուտք գործել որպես ադմին այդ IP հասցեից:","resend_activation_email":"Սեղմեք այստեղ՝ ակտիվացման նամակը կրկին ուղարկելու համար: ","resend_title":"Կրկին Ուղարկել Ակտիվացման Նամակը","change_email":"Փոփոխել Էլ. Հասցեն","provide_new_email":"Տրամադրեք նոր էլ. հասցե, և մենք կրկին կուղարկենք հաստատման էլ. նամակը:","submit_new_email":"Փոխել Էլ. Հասցեն","sent_activation_email_again":"Մենք ուղարկել ենք ակտիվացման մեկ այլ նամակ \u003cb\u003e%{currentEmail}\u003c/b\u003e էլ. հասցեին: Այն կհասնի մի քանի րոպեի ընթացքում; խնդրում ենք անպայման ստուգել նաև Ձեր Սպամ թղթապանակը:","sent_activation_email_again_generic":"Մենք ուղարկել ենք ակտիվացիայի մեկ այլ նամակ: Այն կժամանի մի քանի րոպեի ընթացքում. ստուգեք նաև սպամի արկղը:","to_continue":"Խնդրում ենք Մուտք Գործել","preferences":"Ձեր նախընտրությունները փոփոխելու համար անհրաժեշտ է մուտք գործել:","not_approved":"Ձեր հաշիվը դեռևս չի հաստատվել: Դուք կստանաք ծանուցում էլ. նամակի միջոցով, երբ այն հաստատվի:","google_oauth2":{"name":"Google","title":"Google-ով"},"twitter":{"name":"Twitter","title":"Twitter-ով"},"instagram":{"name":"Instagram","title":"Instagram-ով"},"facebook":{"name":"Facebook","title":"Facebook-ով"},"github":{"name":"GitHub","title":"GitHub-ով"},"discord":{"name":"Discord","title":"Discord-ով"},"second_factor_toggle":{"totp":"Փոխարենը օգտագործել նույնականացման հավելվածը","backup_code":"Փոխարենը օգտագործել պահուստային կոդը"}},"invites":{"accept_title":"Հրավեր","emoji":"ծրար էմոջի","welcome_to":"Բարի Գալուստ %{site_name}!","invited_by":"Ձեզ հրավիրել է՝","social_login_available":"Դուք նաև կկարողանաք մուտք գործել ցանկացած սոցիալական կայքով՝ օգտագործելով այդ էլ. հասցեն:","your_email":"Ձեր հաշվի էլ. հասցեն է՝ \u003cb\u003e%{email}\u003c/b\u003e:","accept_invite":"Ընդունել Հրավերը","success":"Ձեր հաշիվը ստեղծված է, և այժմ Դուք մուտք եք գործել:","name_label":"Անուն","password_label":"Գաղտնաբառ","optional_description":"(ընտրովի)"},"password_reset":{"continue":"Շարունակել դեպի %{site_name}"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Միայն Կատեգորիաները","categories_with_featured_topics":"Հանրահայտ Թեմաներով Կատեգորիաները","categories_and_latest_topics":"Կատեգորիաները և Վերջին Թեմաները","categories_and_top_topics":"Կատեգորիաները և Թոփ Թեմաները","categories_boxes":"Ենթակատեգորիաներ Պարունակող Արկղերը","categories_boxes_with_topics":"Հանրահայտ Թեմաներ Պարունակող Արկղերը"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Մուտք"},"conditional_loading_section":{"loading":"Բեռնվում է..."},"select_kit":{"delete_item":"Ջնջել %{name}","default_header_text":"Ընտրել...","no_content":"Համընկնումներ չեն գտնվել","filter_placeholder":"Որոնում...","filter_placeholder_with_any":"Որոնել կամ ստեղծել...","create":"Ստեղծել '%{content}'","max_content_reached":{"one":"Դուք կարող եք ընտրել միայն %{count} տարր:","other":"Դուք կարող եք ընտրել միայն %{count} տարր:"},"min_content_not_reached":{"one":"Ընտրեք առնվազն%{count} տարր:","other":"Ընտրեք առնվազն %{count} տարր:"}},"date_time_picker":{"from":"Ում կողմից","to":"Ում"},"emoji_picker":{"filter_placeholder":"Փնտրել էմոջի","smileys_\u0026_emotion":"Սմայլիկներ և Էմոցինաեր","people_\u0026_body":"Մարդիկ և Մարմնի մասեր","animals_\u0026_nature":"Կենդանիներ և Բնություն","food_\u0026_drink":"Սնունդ և Ըմպելիք","travel_\u0026_places":"ճամփորդություն և Վայրեր","activities":"Ակտիվություն","objects":"Օբյեկտներ","symbols":"Նշաններ","flags":"Դրոշներ","recent":"Վերջերս օգտագործված","default_tone":"Առանց շերտի գույնի","light_tone":"Շերտի բաց գույնով","medium_light_tone":"Շերտի միջինից բաց գույն","medium_tone":"Շերտի միջին գույն","medium_dark_tone":"Շերտի միջինից մուգ գույն","dark_tone":"Շերտի մուգ գույն","default":"Մասնավոր էմոջիներ"},"shared_drafts":{"title":"Կիսված Սևագրեր","destination_category":"Նպատակային Կատեգորիա","publish":"Հրատարակել կիսված սևագիրը","confirm_publish":"Դուք համոզվա՞ծ եք, որ ցանկանում եք հրատարակել այս սևագիրը:","publishing":"Թեման Հրատարակվում է..."},"composer":{"emoji":"Էմոջի :)","more_emoji":"ավելին...","options":"Տարբերակներ","whisper":"շշուկ","unlist":"չցուցակագրված","add_warning":"Սա պաշտոնական զգուշացում է:","toggle_whisper":"Փոխանջատել Շշնջումը","toggle_unlisted":"Փոխանջատել Չցուցակագրվածները","posting_not_on_topic":"Ո՞ր թեմային եք Դուք ցանկանում պատասխանել:","saved_local_draft_tip":"պահված է տեղում","similar_topics":"Ձեր թեման նման է...","drafts_offline":"Օֆլայն սևագրեր","edit_conflict":"խմբագրել հակասությունը","group_mentioned":{"one":"Նշելով %{group} ՝ Դուք ծանուցում եք \u003ca href='%{group_link}'\u003e%{count} person\u003c/a\u003e . Դուք համոզվա՞ծ եք:","other":"Հիշատակելով %{group}-ը՝ Դուք ծանուցում կուղարկեք \u003ca href='%{group_link}'\u003e%{count} օգտագիրոջ\u003c/a\u003e: Համոզվա՞ծ եք:"},"cannot_see_mention":{"category":"Դուք հիշատակել եք %{username}-ին, բայց նա ծանուցում չի ստանա, քանի որ այս կատեգորիան նրան հասանելի չէ: Դուք պետք է ավելացնեք նրան որևէ խմբում, որը թուլտվություն ունի այս կատեգորիային:","private":"Դուք հիշատակել եք %{username}-ին, բայց նա ծանուցում չի ստանա, քանի որ չի կարող տեսնել այս անձնական նամակը: Դուք պետք է հրավիրեք նրան այս անձնական նամակագրությանը:"},"duplicate_link":"Կարծես թե դեպի \u003cb\u003e%{domain}\u003c/b\u003e Ձեր հղումն արդեն իսկ հրապարակված է թեմայում \u003cb\u003e@%{username}\u003c/b\u003e-ի \u003ca href='%{post_url}'\u003eպատասխանում %{ago}\u003c/a\u003e: Դուք համոզվա՞ծ եք, որ ցանկանում եք այն կրկին հրապարակել:","reference_topic_title":"RE: %{title}","error":{"title_missing":"Վերնագիրը պարտադիր է:","post_missing":"Գրառումը չի կարող դատարկ լինել:","try_like":"Դուք փորձե՞լ եք %{heart} կոճակը:","category_missing":"Դուք պետք է ընտրեք կատեգորիա:","topic_template_not_modified":"Դետալները գրանցել թեմայի մեջ և խմբագրել ձևանմուշը: "},"save_edit":"Պահել Խմբագրումը","overwrite_edit":"Վերասահմանել Խմբագրումը","reply_original":"Պատասխանել Սկզբնական Թեմային","reply_here":"Պատասխանել Այստեղ","reply":"Պատասխանել","cancel":"Չեղարկել","create_topic":"Ստեղծել Թեմա","create_pm":"Նոր Հաղորդագրություն","create_whisper":"Շշնջալ","create_shared_draft":"Ստեղծել Կիսված Սևագիր","edit_shared_draft":"Խմբագրել Կիսված Սևագիրը","users_placeholder":"Ավելացնել օգտատեր","title_placeholder":"Համառոտ մեկ նախադասությամբ ներկայացրեք թե ինչի՞ մասին է քննարկումը:","title_or_link_placeholder":"Գրեք վերնագիրը կամ տեղադրեք հղումն այստեղ","edit_reason_placeholder":"Ո՞րն է խմբագրման պատճառը:","topic_featured_link_placeholder":"Մուտքագրել վերնագրի հետ ցուցադրվող հղում","remove_featured_link":"Հեռացնել հղումը թեմայից:","reply_placeholder":"Գրեք այստեղ: Օգտագործեք Markdown, BBCode, կամ HTML ֆորմատավորման համար: Քաշեք կամ տեղադրեք նկարներ:","reply_placeholder_no_images":"Գրեք այստեղ: Օգտագործեք Markdown, BBCode, կամ HTML ֆորմատավորման համար:","reply_placeholder_choose_category":"Մինչ այստեղ գրերը՝ ընտրեք կատեգորիա:","view_new_post":"Դիտել Ձեր նոր գրառումը:","saving":"Պահպանվում է","saved":"Պահված է!","saved_draft":"Գրառման սևագիրն ընթացքի մեջ է: Սեղմեք՝ վերսկսելու համար:","uploading":"Վերբեռնվում է...","quote_post_title":"Մեջբերել ամբողջ գրառումը","bold_label":"B","bold_title":"Թավ","bold_text":"թավ տեքստ","italic_label":"I","italic_title":"Շեղ","italic_text":"շեղ տեքստ","link_title":"Հիպերհղում","link_description":"մուտքագրեք հղման նկարագրությունն այստեղ","link_dialog_title":"Տեղադրել Հիպերհղումը","link_optional_text":"ընտրովի վերնագիր","link_url_placeholder":"Տեղադրեք URL կամ տեքստը մուտքագրեք՝ թեմաները որոնելու համար","blockquote_title":"Մեջբերել բաժինը","blockquote_text":"Մեջբերել բաժինը","code_title":"Ձևաչափված տեքստ","code_text":"Անջատել ձևաչափված տեքստը 4 բացատով","paste_code_text":"գրեք կամ տեղադրեք կոդն այստեղ","upload_title":"Վերբեռնել","upload_description":"գրեք վերբեռնման նկարագրությունն այստեղ","olist_title":"Համարակալված Ցուցակ","ulist_title":"Կետանշված Ցուցակ","list_item":"Ցանկի տարր","toggle_direction":"Փոխանջատել Ուղղությունը","help":"Markdown-ի խմբագրման օգնություն","collapse":"փակել կոմպոզերի կառավարման հարթակը","open":"բացել կոմպոզերի կառավարման հարթակը","abandon":"փակել կոմպոզերը և չեղարկել սևագիրը","enter_fullscreen":"մուտք գործել ամբողջական էկրանով կոմպոզեր","exit_fullscreen":"դուրս գալ ամբողջական էկրանով կոմպոզերից","modal_ok":"ՕԿ","modal_cancel":"Չեղարկել","cant_send_pm":"Ներողություն, Դուք չեք կարող ուղարկել հաղորդագրություն %{username}-ին:","yourself_confirm":{"title":"Մոռացե՞լ եք ավելացնել ստացողներին:","body":"Այս պահին հաղորդագրությունն ուղարկվում է միայն Ձեզ!"},"admin_options_title":"Անձնակազմի ընտրովի կարգավորումները այս թեմայի համար","composer_actions":{"reply":"Պատասխանել","draft":"Սևագրել","edit":"Խմբագրել","reply_to_post":{"desc":"Պատասխանել որոշակի գրառման"},"reply_as_new_topic":{"label":"Պատասխանել որպես կապված թեմա","desc":"Ստեղծել այս թեմային հղված նոր թեմա","confirm":"Ձեզ մոտ պահպանված է նոր թեմայի սևագիրը, որը կվերագրվի, եթե դրա հետ կապված թեմա ստեղծեք: "},"reply_as_private_message":{"label":"Նոր հաղորդագրություն","desc":"Գրել նոր անձնական նամակ"},"reply_to_topic":{"label":"Պատասխանել թեմային","desc":"Պատասխանել թեմային, այլ ոչ թե որոշակի գրառման"},"toggle_whisper":{"label":"Փոխանջատել շշնջումը","desc":"Շշուկները տեսանելի են միայն անձնակազմին"},"create_topic":{"label":"Նոր Թեմա"},"shared_draft":{"label":"Ստեղծել Կիսված Սևագիր"},"toggle_topic_bump":{"label":"Փոխանջատել թեմայի բարձրացումը ","desc":"Պատասխանել՝ առանց պատասխանի վերջին ամսաթիվը փոխելու"}},"ignore":"Անտեսել","details_title":"Ամփոփումը","details_text":"Այս տեքստը կթաքցվի"},"notifications":{"tooltip":{"regular":{"one":"%{count} չդիտված ծանուցում","other":"%{count} չդիտված ծանուցում"},"message":{"one":"%{count} չկարդացած հաղորդագրություն","other":"%{count} չկարդացած հաղորդագրություն"}},"title":"@անունի հիշատակումների, Ձեր գրառումների և թեմաների պատասխանների, հաղորդագրությունների և այլնի մասին ծանուցումներ ","none":"Սյս պահին հնարավոր չէ բեռնել ծանուցումները","empty":"Ծանուցումներ չեն գտնվել:","post_approved":"Ձեր գրառումը հաստատված է","reviewable_items":"վերանայում պահանջող կետեր","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} և ևս %{count}-ը\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"հավանել է Ձեր %{count} գրառում","other":"հավանել է Ձեր %{count} գրառումը"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e-ը ընդունել է Ձեր հրավերը","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e-ը տեղափոխել է %{description}-ը","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Վասատկել է '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eՆոր Թեմա\u003c/span\u003e %{description}","membership_request_accepted":"Անդամակցության հարցումը ընդունվել է՝ '%{group_name}'","reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","group_message_summary":{"one":"%{count} հաղորդագրություն Ձեր %{group_name} մուտքային արկղում","other":"%{count} հաղորդագրություն Ձեր %{group_name}-ի մուտքային արկղում"},"popup":{"mentioned":"%{username}-ը հիշատակել է Ձեզ այստեղ՝ \"%{topic}\" - %{site_title}","group_mentioned":"%{username}-ը հիշատակել է Ձեզ այստեղ՝ \"%{topic}\" - %{site_title}","quoted":"%{username}-ը մեջբերել է Ձեզ այստեղ՝ \"%{topic}\" - %{site_title}","replied":"%{username}-ը պատասխանել է Ձեզ այստեղ՝ \"%{topic}\" - %{site_title}","posted":"%{username}-ը գրառում է կատարել այստեղ՝ \"%{topic}\" - %{site_title}","private_message":"%{username}-ը ուղարկել է Ձեզ անձնական հաղորդագրություն այստեղ՝ \"%{topic}\" - %{site_title}","linked":"%{username}-ը \"%{topic}\" - %{site_title}\"-ից հղում է կատարել Ձեր գրառմանը:","watching_first_post":"%{username} -ը ստեղծել է նոր թեմա՝ \"%{topic}\" - %{site_title}","confirm_title":"Ծանուցումները միացված են. %{site_title}","confirm_body":"Հաջողվեց! Ծանուցումները միացված են:","custom":"Ծանուցում %{username} -ից մինչև %{site_title}"},"titles":{"mentioned":"Հիշատակված ","replied":"նոր պատասխան","quoted":"մեջբերված","edited":"խմբագրվել է","liked":"նոր հավանում","private_message":"նոր անձնական հաղորդագրություն","invited_to_private_message":"Հրավիրված է անձնական հաղորդագրության ","invitee_accepted":"հրավերը ընդունված է","posted":"Նոր Գրառում","moved_post":"գրառումը տեղափոխված է","linked":"հղված է ","bookmark_reminder":"էջանշանի հիշեցում","bookmark_reminder_with_name":"էջանշանի հիշեցում %{name}","granted_badge":"կրծքանշանը հանձնված է","invited_to_topic":"հրավիրված է թեմային","group_mentioned":"հիշատակված խումբը","group_message_summary":"նոր խմբային հաղորդագրություններ ","watching_first_post":"նոր թեմա","topic_reminder":"թեմայի հիշեցում","liked_consolidated":"նոր հավանումներ","post_approved":"գրառումը հաստատված է","membership_request_consolidated":"Մշակել անդամակցության նոր հարցումները"}},"upload_selector":{"uploading":"Վերբեռնվում է","select_file":"Ընտրել Ֆայլ","default_image_alt_text":"նկար"},"search":{"sort_by":"Դասավորել ըստ","relevance":"Համապատասխանության","latest_post":"Վերջին Գրառումը ","latest_topic":"Վերջին Թեման","most_viewed":"Ամենաշատ Դիտված","most_liked":"Ամենաշատ Հավանած","select_all":"Ընտրել Բոլորը","clear_all":"Մաքրել Բոլորը","too_short":"Ձեր որոնման տեքստը շատ կարճ է:","result_count":{"one":"\u003cspan\u003e%{count} result for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} արդյունք\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e-ի համար"},"title":"Որոնում","full_page_title":"Որոնում","no_results":"Արդյունքներ չեն գտնվել:","no_more_results":"Արդյունքներ այլևս չեն գտնվել:","post_format":"#%{post_number} %{username}-ի կողմից","results_page":"Որոնել արդյունքները '%{term}'-ի համար","more_results":"Գտնվել են բազմաթիվ արդյունքներ: Խնդրում ենք հստակեցնել Ձեր որոնման չափանիշները:","cant_find":"Չե՞ք կարողանում գտնել այն, ինչ փնտրում էիք:","start_new_topic":"Միգուցե՞ սկսեք նոր թեմա:","or_search_google":"Կամ փորձեք որոնել Google-ում:","search_google":"Փորձեք որոնել Google-ում:","search_google_button":"Google","search_button":"Որոնում","categories":"Կատեգորիաներ","tags":"Թեգեր","type":{"users":"Օգտատերեր","categories":"Կատեգորիաներ"},"context":{"user":"Որոնել @%{username}-ի գրառումները","category":"Որոնել #%{category} կատեգորիայում","tag":"Որոնում #%{tag} թեգով","topic":"Որոնել այս թեմայում","private_messages":"Որոնել հաղորդագրություններում"},"advanced":{"posted_by":{"label":"Հրապարակել է՝"},"in_category":{"label":"Դասակարգված"},"in_group":{"label":"Խմբում"},"with_badge":{"label":"Կրծքանշանով"},"with_tags":{"label":"Թեգերով"},"filters":{"label":"Վերադարձնել միայն թեմաներ/գրառումներ...","title":"Միայն վերնագրի համընկնումով","likes":"Ես հավանել եմ","posted":"Ես գրառում եմ կատարել","created":"որոնք Ես ստեղծեցի","watching":"Ես դիտում եմ","tracking":"Ես հետևում եմ","private":"Իմ հաղորդագրություններում","bookmarks":"Ես էջանշել եմ","first":"ամենաառաջին գրառումներն են","pinned":"ամրակցված են","seen":"Ես կարդացել եմ","unseen":"Ես չեմ կարդացել","wiki":"wiki են","images":"ներառում են նկար(ներ)","all_tags":"Բոլոր վերոնշյալ թեգերը"},"statuses":{"label":"Որտեղ թեմաները","open":"բաց են","closed":"փակ են","public":"հանրային","archived":"արխիվացված են","noreplies":"պատասխաններ չունեն","single_user":"պարունակում են մեկ օգտատեր"},"post":{"count":{"label":"Գրառում"},"time":{"label":"Հրապարակվել է","before":"մինչև","after":"հետո"}},"views":{"label":"Դիտումների"}}},"new_item":"նոր","go_back":"ետ գնալ","not_logged_in_user":"օգտատիրոջ էջը՝ ընթացիկ ակտիվության և նախընտրությունների ամփոփումով","current_user":"գնալ իմ էջը","topics":{"new_messages_marker":"վերջին այցելությունը","bulk":{"select_all":"Ընտրել Բոլորը","clear_all":"Ջնջել Բոլորը","unlist_topics":"Թեմաները Ցանկից Հանել","relist_topics":"Վերացանկավորել Թեմաները","reset_read":"Զրոյացնել Կարդացածները (Reset Read)","delete":"Ջնջել Թեմաները","dismiss":"Չեղարկել","dismiss_read":"Չեղարկել բոլոր չկարդացածները","dismiss_button":"Չեղարկել...","dismiss_tooltip":"Չեղարկել միայն նոր գրառումները կամ դադարել հետևել թեմաներին","also_dismiss_topics":"Դադարել հետևել այս թեմաներին, որ այլևս երբեք չցուցադրվեն ինձ համար որպես չկարդացած","dismiss_new":"Չեղարկել Նորերը","toggle":"փոխանջատել թեմաների զանգվածային ընտրությունը","actions":"Զանգվածային Գործողությունները","close_topics":"Փակել Թեմաները","archive_topics":"Արխիվացնել Թեմաները","move_messages_to_inbox":"Տեղափոխել Մուտքերի արկղ","choose_new_category":"Ընտրել նոր կատեգորիա թեմաների համար՝","selected":{"one":"Դուք ընտրել եք \u003cb\u003e%{count}\u003c/b\u003e թեմա:","other":"Դուք ընտրել եք \u003cb\u003e%{count}\u003c/b\u003e թեմա:"},"change_tags":"Փոխարինել Թեգերը","append_tags":"Ավելացնել Թեգեր","choose_new_tags":"Ընտրել նոր թեգեր այս թեմաների համար՝","choose_append_tags":"Ընտրել նոր թեգեր այս թեմաներին ավելացնելու համար՝","changed_tags":"Այդ թեմաների թեգերը փոփոխվել են:"},"none":{"unread":"Դուք չունեք չկարդացած թեմաներ:","new":"Դուք չունեք նոր թեմաներ:","read":"Դուք դեռևս չեք կարդացել ոչ մի թեմա:","posted":"Դուք դեռևս գրառում չեք կատարել ոչ մի թեմայում:","bookmarks":"Դուք դեռևս չունեք էջանշված թեմաներ:","category":" %{category}-ում թեմաներ չկան:","top":"Թոփ թեմաներ չկան:"},"bottom":{"latest":"Վերջին թեմաներ այլևս չկան:","posted":"Հրապարակված թեմաներ այլևս չկան:","read":"Կարդացած թեմաներ այլևս չկան:","new":"Նոր թեմաներ այլևս չկան:","unread":"Չկարդացած թեմաներ այլևս չկան:","category":"%{category}-ում թեմաներ այլևս չկան:","tag":"%{tag}-ում թեմաներ այլևս չկան:","top":"Թոփ թեմաներ այլևս չկան:","bookmarks":"Էջանշված թեմաներ այլևս չկան:"}},"topic":{"filter_to":{"one":"%{count} հրապարակում թեմայում","other":"%{count} գրառում թեմայում"},"create":"Նոր Թեմա","create_long":"Ստեղծել Նոր Թեմա","open_draft":"Բացել Սևագիրը","private_message":"Սկսել հաղորդագրություն","archive_message":{"help":"Տեղափոխել հաղորդագրությունը Ձեր արխիվ","title":"Արխիվ"},"move_to_inbox":{"title":"Տեղափոխել Մուտքային արկղ","help":"Տեղափոխել հաղորդագրությունը ետ դեպի Մուտքային արկղ"},"edit_message":{"help":"Խմբագրել հաղորդագրության առաջին գրառումը","title":"Խմբագրել"},"defer":{"help":"նշել որպես չընթերցված ","title":"Հետաձգել"},"list":"Թեմաներ","new":"նոր թեմա","unread":"չկարդացած","new_topics":{"one":"%{count} նոր թեմա","other":"%{count} նոր թեմա"},"unread_topics":{"one":"%{count} չկարդացած թեմա","other":"%{count} չկարդացած թեմա"},"title":"Թեմա","invalid_access":{"title":"Թեման անձնական է","description":"Ներողություն, այդ թեման Ձեզ հասանելի չէ!","login_required":"Դուք պետք է մուտք գործեք՝ այդ թեման տեսնելու համար:"},"server_error":{"title":"Թեմայի բեռնումը ձախողվեց","description":"Ներողություն, մենք չկարողացանք բեռնել այդ թեման, հնարավոր է՝ միացման խնդրի պատճառով: Խնդրում ենք կրկին փորձել: Եթե խնդիրը շարունակվում է, տեղեկացրեք մեզ:"},"not_found":{"title":"Թեման չի գտնվել","description":"Ներողություն, մենք չկարողացանք գտնել այդ թեման: Միգուցե՞ այն հեռացվել է մոդերատորի կողմից:"},"unread_posts":{"one":"Դուք ունեք %{count} չկարդացած հրապարակում այս թեմայում","other":"Այս թեմայում Դուք ունեք %{count} չկարդացած գրառում"},"likes":{"one":"Այս թեմայում կա %{count} հավանում:","other":"Այս թեմայում կա %{count} հավանում"},"back_to_list":"Վերադառնալ Թեմաների Ցանկին","options":"Թեմաների Տարբերակները","show_links":"ցուցադրել այս թեմայի հղումները","read_more_in_category":"Ցանկանո՞ւմ եք կարդալ ավելին: Դիտեք այլ թեմաներ՝ %{catLink}-ում կամ %{latestLink}.","read_more":"Ցանկանո՞ւմ եք կարդալ ավելին: %{catLink} կամ %{latestLink}.","unread_indicator":"Ոչ մի անդամ դեռ չի կարդացել այս թեմայի մինչև վերջին գրառումը: ","browse_all_categories":"Դիտել բոլոր կատեգորիաները","view_latest_topics":"դիտեք վերջին թեմաները","jump_reply_up":"ցատկել դեպի ավելի վաղ պատասխան","jump_reply_down":"ցատկել դեպի ավելի հին պատասխան","deleted":"Թեման ջնջվել է","slow_mode_update":{"enable":"Միացնել","remove":"Անջատել"},"topic_status_update":{"title":"Թեմայի Ժամաչափիչ","save":"Ժամաչափիչ Դնել","num_of_hours":"Ժամերի քանակը.","num_of_days":"Օրերի քանակը","remove":"Հեռացնել Ժամաչափիչը","publish_to":"Հրատարակել.","when":"Երբ.","time_frame_required":"Խնդրում ենք ընտրել ժամանակահատված"},"auto_update_input":{"none":"Ընտրել ժամանակահատված","later_today":"Այսօր, մի փոքր ուշ","tomorrow":"Վաղը","later_this_week":"Այս շաբաթ, մի փոքր ավելի ուշ","this_weekend":"Այս շաբաթ-կիրակի","next_week":"Հաջորդ շաբաթ","next_month":"Հաջորդ ամիս","forever":"Ընդմիշտ","pick_date_and_time":"Ընտրել ամսաթիվ և ժամ","set_based_on_last_post":"Փակել՝ կախված վերջին գրառումից"},"publish_to_category":{"title":"Պլանավորել Հրատարակումը"},"temp_open":{"title":"Ժամանակավորապես Բացել"},"temp_close":{"title":"Ժամանակավորապես Փակել"},"auto_close":{"title":"Ավտոմատ փակել Թեման","error":"Խնդրում ենք մուտքագրել վավեր արժեք:","based_on_last_post":"Չփակել, մինչև թեմայի վերջին գրառումը չունենա այսքան վաղեմություն:"},"auto_delete":{"title":"Ավտոմատ Ջնջել Թեման"},"auto_bump":{"title":"Ավտոմատ Բարձրացնել Թեման"},"reminder":{"title":"Հիշեցնել Ինձ"},"auto_delete_replies":{"title":"Ավտոմատ Ջնջել Պատասխանները"},"status_update_notice":{"auto_open":"Այս թեման ավտոմատ կբացվի %{timeLeft}:","auto_close":"Այս թեման ավտոմատ կփակվի %{timeLeft}:","auto_publish_to_category":"Այս թեման կհրատարակվի \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e-ում %{timeLeft}:","auto_close_after_last_post":"Այս թեման կփակվի վերջին պատասխանից %{duration} հետո:","auto_delete":"Այս թեման ավտոմատ կերպով կջնջվի %{timeLeft}:","auto_bump":"Այս թեման ավտոմատ կբարձրացվի %{timeLeft}:","auto_reminder":"Ձեզ կհիշեցվի այս թեմայի մասին %{timeLeft}:","auto_delete_replies":"Այս թեմային վերաբերող պատասխանները հետո ավտոմատ ջնջվում են %{duration}."},"auto_close_title":"Ավտոմատ Փակման Կարգավորումները","auto_close_immediate":{"one":"Այս թեմայի վերջին հրապարակումը արդեն %{count} ժամ վաղեմութոյւն ունի, հետևաբար՝ թեման անմիջապես կփակվի:","other":"Այս թեմայի վերջին գրառումն արդեն %{count} ժամվա վաղեմություն ունի, հետևաբար՝ թեման անմիջապես կփակվի:"},"timeline":{"back":"Վերադառնալ","back_description":"Վերադառնալ Ձեր վերջին չկարդացած գրառմանը","replies_short":"%{current} / %{total}"},"progress":{"title":"թեմայի ընթացքը","go_top":"վերև","go_bottom":"ներքև","go":"գնալ","jump_bottom":"ցատկել դեպի վերջին գրառում","jump_prompt":"ցատկել դեպի...","jump_prompt_long":"Ցատկել դեպի..","jump_bottom_with_number":"ցատկել դեպի %{post_number}գրառումը","jump_prompt_to_date":"դեպի ամսաթիվ","jump_prompt_or":"կամ","total":"ընդհանուր գրառումներ","current":"ընթացիկ գրառումը"},"notifications":{"title":"Փոխել, թե որքան հաճախ եք Դուք ծանուցում ստանում այս թեմայի մասին","reasons":{"mailing_list_mode":"Ձեզ մոտ միացված է փոստային ցուցակի ռեժիմը, ուստի էլ. փոստի միջոցով Դուք ծանուցում կստանաք այս թեմայի պատասխանների մասին:","3_10":"Դուք ծանուցումներ կստանաք, քանի որ դիտում եք այս թեմայի թեգի:","3_6":"Դուք ծանուցումներ կստանաք, քանի որ դիտում եք այս կատեգորիան:","3_5":"Դուք ծանուցումներ կստանաք, քանի որ ավտոմատ կերպով սկսել եք դիտել այս թեման:","3_2":"Դուք ծանուցումներ կստանաք, քանի որ դիտում եք այս թեման:","3_1":"Դուք ծանուցումներ կստանաք, քանի որ ստեղծել եք այս թեման:","3":"Դուք ծանուցումներ կստանաք, քանի որ դիտում եք այս թեման:","2_8":"Դուք կտեսնեք նոր պատասխանների քանակը, քանի որ հետևում եք այս կատեգորիային:","2_4":"Դուք կտեսնեք նոր պատասխանների քանակը, քանի որ հրապարակել եք պատասխան այս թեմայում:","2_2":"Դուք կտեսնեք նոր պատասխանների քանակը, քանի որ հետևում եք այս թեմային:","2":"You will see a count of new replies because you \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eread this topic\u003c/a\u003e.","1_2":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:","1":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:","0_7":"Դուք անտեսում եք այս կատեգորիայի բոլոր ծանուցումները:","0_2":"Դուք անտեսում եք այս թեմայի բոլոր ծանուցումները:","0":"Դուք անտեսում եք այս թեմայի բոլոր ծանուցումները:"},"watching_pm":{"title":"Դիտում Եմ","description":"Դուք ծանուցում կստանաք այս հաղորդագրության յուրաքանչյուր նոր պատասխանի մասին, և կցուցադրվի նոր պատասխանների քանակը:"},"watching":{"title":"Դիտում Եմ","description":"Դուք ծանուցում կստանաք այս թեմայի յուրաքանչյուր նոր պատասխանի մասին, և կցուցադրվի նոր պատասխանների քանակը:"},"tracking_pm":{"title":"Հետևում Եմ","description":"Այս հաղորդագրության համար կցուցադրվի նոր պատասխանների քանակը: Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:"},"tracking":{"title":"Հետևում Եմ","description":"Այս թեմայի համար կցուցադրվի նոր պատասխանների քանակը: Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:"},"regular":{"title":"Սովորական","description":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:"},"regular_pm":{"title":"Սովորական","description":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:"},"muted_pm":{"title":"Խլացված","description":"Դուք երբեք որևէ ծանուցում չեք ստանա այս հաղորդագրության վերաբերյալ:"},"muted":{"title":"Խլացված","description":"Դուք երբեք որևէ ծանուցում չեք ստանա այս թեմայի վերաբերյալ, և այն չի հայտնվի վերջիններում:"}},"actions":{"title":"Գործողություններ","recover":"Վերականգնել Թեման","delete":"Ջնջել Թեման","open":"Բացել Թեման","close":"Փակել Թեման","multi_select":"Ընտրել Գրառումներ...","timed_update":"Դնել Թեմայի Ժամաչափիչ","pin":"Ամրակցել Թեման...","unpin":"Ապակցել Թեման...","unarchive":"Ապարխիվացնել Թեման","archive":"Արխիվացնել Թեման","invisible":"Դարձնել Չցուցակագրված","visible":"Դարձնել Ցուցակագրված","reset_read":"Զրոյացնել Կարդացած Տվյալները","make_private":"Ստեղծել Անձնական Նամակ","reset_bump_date":"Վերահաստատել Բարձրացման Ամսաթիվը"},"feature":{"pin":"Ամրակցել Թեման","unpin":"Ապակցել Թեման","pin_globally":"Ամրակցել Թեման Գլոբալ կերպով","remove_banner":"Հեռացնել Բաններ Թեման"},"reply":{"title":"Պատասխանել","help":"այս թեմային պատասխան գրել"},"share":{"title":"Կիսվել","extended_title":"Կիսվել հղումով","help":"կիսվել այս թեմայի հղումով","invite_users":"Հրավիրել"},"print":{"title":"Տպել","help":"Բացել այս թեմայի տպման հարմար նախատեսված տարբերակը"},"flag_topic":{"title":"Դրոշակավորել","help":"թեմային ուշադրություն գրավել՝ գաղտնի կերպով դրոշակավորելով կամ ուղարկելով գաղտնի ծանուցում այդ մասին","success_message":"Դուք հաջողությամբ դրոշակավորեցիք այս թեման:"},"make_public":{"title":"Փոխարկել Հրապարակային Թեմայի","choose_category":"Խնդրում ենք ընտրել կատեգորիա՝ հրապարակային թեմայի համար"},"feature_topic":{"title":"Ամրացնել այս թեման","pin":"Այս թեման տեղադրել %{categoryLink} կատեգորիայի վերևում մինչև","unpin":"Հանել այս թեման %{categoryLink} կատեգորիայի վերևից:","unpin_until":"Հանել այս թեման%{categoryLink} կատեգորիայի վերևից կամ սպասել մինչև \u003cstrong\u003e%{until}\u003c/strong\u003e:","pin_note":"Օգտատերերը կարող են ապակցել թեման անհատապես իրենց համար:","pin_validation":"Ամսաթիվը պարտադիր է այս թեման ամրակցելու համար:","not_pinned":"%{categoryLink} կատեգորիայում ոչ մի թեմա ամրակցված չէ:","already_pinned":{"one":"Ներկայումս %{categoryLink}կատեգորիայում ամրակցված Թեմաներ՝ \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Ներկայումս %{categoryLink} կատեգորիայում ամրակցված թեմաները՝ \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Այս թեման տեղադրել բոլոր թեմաների ցանկերի վերում, մինչև","unpin_globally":"Հանել այս թեման բոլոր թեմաների ցանկերի վերևից","unpin_globally_until":"Հանել այս թեման բոլոր թեմաների ցանկերի վերևից կամ սպասել մինչև \u003cstrong\u003e%{until}\u003c/strong\u003e:","global_pin_note":"Օգտատերերը կարող են ապակցել թեման անհատապես իրենց համար:","not_pinned_globally":"Գլոբալ կերպով ամրակցված թեմաներ չկան:","already_pinned_globally":{"one":"Ներկայումս գլոբալ կերպով ամրակցված թեմաներ՝ \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Ներկայումս գլոբալ կերպով ամրակցված թեմաները՝\u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Այս թեման դարձնել բաններ, որը հայտնվում է բոլոր էջերի վերևում:","remove_banner":"Հանել բանները, որը հայտնվում է բոլոր էջերի վերևում:","banner_note":"Օգտատերերը կարող են չեղարկել բանները՝ փակելով այն: Ցանկացած պահի միայն մեկ թեմա կարող է լինել որպես բաններ:","no_banner_exists":"Բաններ թեմա չկա:","banner_exists":"Այս պահին բաններ թեմա \u003cstrong class='badge badge-notification unread'\u003eկա\u003c/strong\u003e:"},"inviting":"Հրավիրվում է...","automatically_add_to_groups":"Այս հրավերը ներառում է նաև հետևյալ խմբերի թույլտվություն՝","invite_private":{"title":"Հրավիրել Հաղորդագրության","email_or_username":"Հրավիրվողի Էլ. հասցեն կամ Օգտանունը","email_or_username_placeholder":"էլ. հասցե կամ օգտանուն","action":"Հրավիրել","success":"Մենք հրավիրել ենք այդ օգտատիրոջը՝ մասնակցելու այս հաղորդագրությանը:","success_group":"Մենք հրավիրել ենք այդ խմբին՝ մասնակցելու այս հաղորդագրությանը:","error":"Այդ օգտատիրոջը հրավիրելիս տեղի է ունեցել սխալ, ներողություն:","group_name":"խմբի անունը"},"controls":"Թեմայի Կառավարման Հարթակ","invite_reply":{"title":"Հրավիրել","username_placeholder":"օգտանուն","action":"Ուղարկել Հրավեր","help":"Հրավիրել մյուսներին այս թեմային էլ. հասցեի կամ ծանուցումների միջոցով","discourse_connect_enabled":"Մուտքագրեք այն անձի օգտանունը, ում ցանկանում եք հրավիրել այս թեմային:","to_topic_blank":"Մուտքագրեք այն անձի օգտանունը կամ էլ. հասցեն, ում ցանկանում եք հրավիրել այս թեմային:","to_topic_email":"Դուք մուտքագրել եք էլ. հասցե: Մենք կուղարկենք հրավեր, որը թույլ կտա Ձեր ընկերոջը անմիջապես պատասխանել այս թեմային:","to_topic_username":"Դուք մուտքագրել եք օգտանուն: Մենք կուղարկենք ծանուցում՝ այս թեմային հրավերի հղումով:","to_username":"Մուտքագրեք այն անձի օգտանունը, ում ցանկանում եք հրավիրել: Մենք կուղարկենք ծանուցում՝ այս թեմային հրավերի հղումով:","email_placeholder":"name@example.com","success_email":"Մենք ուղարկել ենք հրավերի էլ. նամակ \u003cb\u003e%{invitee}\u003c/b\u003e-ին: Մենք ծանուցում կուղարկենք Ձեզ, երբ հրավերն ընդունվի: Ստուգեք Ձեր էջի հրավերների ներդիրը՝ Ձեր հրավերներին հետևելու համար:","success_username":"Մենք հրավիրել ենք այդ օգտատիրոջը մասնակցելու այս թեմային:","error":"Ներողություն, մենք չկարողացանք հրավիրել այդ մարդուն: Միգուցե նա արդեն հրավիրվա՞ծ է: (Հրավերները սահմանափակ են)","success_existing_email":" \u003cb\u003e%{emailOrUsername}\u003c/b\u003e էլ. հասցեով օգատեր արդեն գոյություն ունի: Մենք հրավիրել ենք նրան մասնակցելու այս թեմային:"},"login_reply":"Պատասխանելու համար Մուտք Գործեք","filters":{"n_posts":{"one":"%{count} հրապարակում","other":"%{count} գրառում"},"cancel":"Հանել ֆիլտրը"},"move_to":{"title":"Տեղափոխել դեպի","action":"տեղափոխել դեպի","error":"Գրառումները տեղափոխելիս տեղի է ունեցել սխալ:"},"split_topic":{"title":"Տեղափոխվել դեպի Նոր Թեմա","action":"տեղափոխվել դեպի նոր թեմա","topic_name":"Նոր Թեմայի Վերնագիրը","radio_label":"Նոր Թեմա","error":"Գրառումները նոր թեմա տեղափոխելիս տեղի է ունեցել սխալ:","instructions":{"one":"Դուք պատրաստվում եք ստեղծել նոր թեմա և մուտքագրել Ձեր ընտրած հրապարակումով:","other":"Դուք պատրաստվում եք ստեղծել նոր թեմա և մուտքագրել Ձեր ընտրած \u003cb\u003e%{count}\u003c/b\u003e գրառումը:"}},"merge_topic":{"title":"Տեղափոխել դեպի Գոյություն Ունեցող Թեմա","action":"տեղափոխել դեպի գոյություն ունեցող թեմա","error":"Գրառումներն այդ թեմա տեղափոխելիս տեղի է ունեցել սխալ:","radio_label":"Գոյություն Ունեցող Թեմա","instructions":{"one":"Խնդրում ենք ընտրել թեմա, ուր ցանկանում եք տեղափոխել այդ հրապարակումը: ","other":"Խնդրում ենք ընտրել թեմա, ուր ցանկանում եք տեղափոխել այդ \u003cb\u003e%{count}\u003c/b\u003e գրառումը:"}},"move_to_new_message":{"title":"Տեղափոխել դեպի Նոր Հաղորդագրություն","action":"տեղափոխել դեպի նոր հաղորդագրություն","message_title":"Նոր Հաղորդագրության Վերնագիրը","radio_label":"Նոր Հաղորդագրություն","participants":"Մասնակիցներ","instructions":{"one":"Դուք պատրաստվում եք ստեղծել նոր հաղորդագրություն և մասսայականացնել այն Ձեր ընտրած գրառումով:","other":"Դուք պատրաստվում եք ստեղծել նոր հաղորդագրություն և լցնել այն Ձեր ընտրած \u003cb\u003e%{count}\u003c/b\u003e գրառումով:"}},"move_to_existing_message":{"title":"Տեղափոխել դեպի Գոյություն Ունեցող Հաղորդագրություն","action":"տեղափոխել դեպի գոյություն ունեցող հաղորդագրություն","radio_label":"Գոյություն Ունեցող Հաղորդագրություն","participants":"Մասնակիցներ","instructions":{"one":"Խնդրում ենք ընտրել հաղորդագրությունը, ուր ցանկանում եք տեղափոխել այդ գրառումը:","other":"Խնդրում ենք ընտրել հաղորդագրությունը, ուր ցանկանում եք տեղափոխել այդ \u003cb\u003e%{count}\u003c/b\u003e գրառումները:"}},"merge_posts":{"title":"Միավորել Ընտրված Գրառումները","action":"միավորել ընտրված գրառումները","error":"Ընտրված գրառումները միավորելիս տեղի է ունեցել սխալ:"},"publish_page":{"title":"Էջի Հրատարակում","publish":"Հրատարակել","description":"Երբ թեման հրապարակվում է որպես էջ, դրա URL- ն կարող է համընդհանուր տարածվել և պատկերվել օգտատերերի խմբագրմամբ: ","public":"Հանրային","publish_url":"Ձեր էջը հրապարակվել է այս հասցեով՝ ","topic_published":"Ձեր թեման հրապարակվել է՝","preview_url":"Ձեր էջը կհրապարակվի այս հասցեով՝","invalid_slug":"Ներողություն, Դուք չեք կարող հրապարակել այս էջը:","unpublish":"Հրապարակումը չեղարկել","unpublished":"Էջի հրապարակումը չեղարկվել է և այն անհասանելի է նախկինում նշված հասցեում:","publishing_settings":"Հրապարակման Կարգավորումներ"},"change_owner":{"title":"Փոխել Սեփականատիրոջը","action":"փոխել սեփականությունը","error":"Գրառումների սեփականատիրոջը փոփոխելիս տեղի է ունեցել սխալ:","placeholder":"նոր սեփականատիրոջ օգտանունը","instructions":{"one":"Խնդրում ենք ընտրել նոր սեփականատեր \u003cb\u003e@%{old_user}\u003c/b\u003e կողմից կատարված հրապարակման համար","other":"Խնդրում ենք ընտրել նոր սեփականատեր \u003cb\u003e@%{old_user}\u003c/b\u003e-ի %{count} գրառման համար:"}},"change_timestamp":{"title":"Փոփոխել Ժամանակակետը","action":"փոփոխել ժամանակակետը","invalid_timestamp":"Ժամանակակետը չի կարող լինել ապագայում:","error":"Թեմայի ժամանակակետը փոփոխելիս տեղի է ունեցել սխալ:","instructions":"Խնդրում ենք ընտրել թեմայի նոր ժամանակակետը: Թեմայի գրառումները կթարմացվեն՝ նույն ժամային տարբերությունն ունենալու համար:"},"multi_select":{"select":"ընտրել","selected":"ընտրված (%{count})","select_post":{"label":"ընտրել","title":"Ընտրվածին ավելացնել գրառում"},"selected_post":{"label":"ընտրված","title":"Սեղմեք՝ գրառումն ընտրվածից հեռացնելու համար "},"select_replies":{"label":"ընտրել+պատասխաններ","title":"Ավելացնել գրառումը և դրա բոլոր պատասխանները ընտրվածին"},"select_below":{"label":"ընտրել+ներքև","title":"Ավելացնել գրառումը և դրանից հետո բոլորը ընտրվածին"},"delete":"ջնջել ընտրվածը","cancel":"չեղարկել ընտրվածը","select_all":"ընտրել բոլորը","deselect_all":"հետընտրել բոլորը","description":{"one":"Դուք ընտրել եք \u003cb\u003e%{count}\u003c/b\u003e հրապարակում:","other":"Դուք ընտրել եք \u003cb\u003e%{count}\u003c/b\u003e գրառում:"}}},"post":{"quote_reply":"Մեջբերել","quote_edit":"Խմբագրել","quote_share":"Կիսվել","edit_reason":"Պատճառը՝ ","post_number":"գրառում %{number}","ignored":"Անտեսված բովանդակություն","reply_as_new_topic":"Պատասխանել որպես հղված թեմա","reply_as_new_private_message":"Պատասխանել որպես հաղորդագրություն նույն ստացողներին","continue_discussion":"Շարունակելով %{postLink} քննարկումը՝ ","follow_quote":"գնալ դեպի մեջբերված գրառումը","show_full":"Ցուցադրել Գրառումն Ամբողջությամբ","show_hidden":"Դիտել անտեսված բովանդակությունը ","collapse":"կրճատել","expand_collapse":"ընդլայնել/կրճատել","locked":"անձնակազմի որևէ ներկայացուցիչ արգելափակել է այս գրառման խմբագրումը","gap":{"one":"դիտել %{count} թաքցրած պատասխան","other":"դիտել %{count} թաքցրած պատասխանները"},"notice":{"new_user":"Առաջին անգամն է, որ %{user} -ը գրառում է կատարել — եկեք ողջունենք նրան մեր համայնքում!","returning_user":"Բավական ժամանակ է անցել %{user} -ին տեսնելուց հետո — նրա վերջին գրառումը եղել է %{time}:"},"unread":"Գրառումը կարդացած չէ","has_replies":{"one":"%{count} պատասխան","other":"%{count} Պատասխան"},"has_likes_title":{"one":"%{count} անձ հավանել է այս հրապարակումը","other":"%{count} մարդ հավանել է այս գրառումը"},"has_likes_title_only_you":"Դուք հավանել եք այս գրառումը","has_likes_title_you":{"one":"Դուք և %{count} այլ անձ հավանել եք այս հրապարակումը","other":"Դուք և %{count} հոգի հավանել են այս գրառումը"},"errors":{"create":"Ներողություն, Ձեր գրառումը ստեղծելիս տեղի է ունեցել սխալ: Խնդրում ենք կրկին փորձել:","edit":"Ներողություն, Ձեր գրառումը խմբագրելիս տեղի է ունեցել սխալ: Խնդրում ենք կրկին փորձել:","upload":"Ներողություն, այդ ֆայլը վերբեռնելիս տեղի է ունեցել սխալ: Խնդրում ենք կրկին փորձել:","file_too_large":"Ներողություն, այդ ֆայլը շատ մեծ է (առավելագույն չափը %{max_size_kb}ԿԲ է): Առաջարկվում ենք վերբեռնել Ձեր մեծ ֆայլը որևէ ամպային ծառայություն(cloud service) և կիսվել հղումով:","too_many_uploads":"Ներողություն, Դուք կարող եք վերբեռնել միաժամանակ միայն մեկ ֆայլ:","upload_not_authorized":"Ներողություն, ֆայլը, որ Դուք փորձում եք վերբեռնել թուլատրելի չէ (թույլատրվում են միայն՝ %{authorized_extensions}):","image_upload_not_allowed_for_new_user":"Ներողություն, նոր օգտատերերը չեն կարող վերբեռնել նկարներ:","attachment_upload_not_allowed_for_new_user":"Ներողություն, նոր օգտատերերը չեն կարող ֆայլեր կցել:","attachment_download_requires_login":"Ներողություն, Դուք պետք է մուտք գործեք՝ կցված ֆայլերը ներբեռնելու համար:"},"cancel_composer":{"discard":"Չեղարկել"},"via_email":"այս գրառումը եկել է էլ. նամակով","via_auto_generated_email":"այս գրառումը եկել է ավտոմատ գեներացված էլ. նամակով","whisper":"այս գրառումը գաղտնի շշուկ է մոդերատորների համար","wiki":{"about":"այս գրառումը wiki է"},"few_likes_left":"Շնորհակալ ենք տրված հավանումների համար: Այսօր Ձեզ մնացել է միայն մի քանի հավանում:","controls":{"reply":"պատասխանել այս գրառմանը","like":"հավանել այս գրառումը","has_liked":"Դուք հավանել եք այս գրառումը","read_indicator":"անդամներ, ովքեր կարդում են այս գրառումը","undo_like":"Ետարկել հավանումը","edit":"խմբագրել այս գրառումը","edit_action":"Խմբագրել","edit_anonymous":"Ներողություն, Դուք պետք է մուտք գործեք՝ այս գրառումը խմբագրելու համար:","flag":"գրառմանը ուշադրություն գրավել՝ գաղտնի կերպով դրոշակավորելով կամ ուղարկելով գաղտնի ծանուցում այդ մասին","delete":"ջնջել այս գրառումը","undelete":"վերականգնել այս գրառումը","share":"կիսվել այս գրառման հղումով","more":"Ավելին","delete_replies":{"confirm":"Դուք ցանկանո՞ւմ եք ջնջել նաև այս գրառման պատասխանները:","direct_replies":{"one":"Այո, և %{count} ուղղակի պատասխան","other":"Այո, և %{count} ուղղակի պատասխանները"},"all_replies":{"one":"Այո, և %{count} պատասխանը","other":"Այո, և բոլոր %{count} պատասխանները"},"just_the_post":"Ոչ, միայն այս գրառումը"},"admin":"գրառման ադմինի գործողություններ","wiki":"Դարձնել Wiki","unwiki":"Հանել Wiki-ից","convert_to_moderator":"Ավելացնել Անձնակազմի Գույն","revert_to_regular":"Հեռացնել Անձնակազմի Գույնը","rebake":"Վերակառուցել HTML-ը","publish_page":"Էջի Հրատարակում","unhide":"Դարձնել Տեսանելի","lock_post":"Արգելափակել Գրառումը","lock_post_description":"արգելել հրապարակողին խմբագրել այս գրառումը","unlock_post":"Արգելաբացել Գրառումը","unlock_post_description":"թույլ տալ հրապարակողին խմբագրելու այս գրառումը","delete_topic_disallowed_modal":"Դուք թույլտվություն չունեք ջնջելու այս թեման: Եթե Դուք իսկապես ցանկանում եք, որ այն ջնջվի, դրոշակավորեք այն պատճառաբանության հետ միասին՝ մոդերատորի ուշադրությանը գրավելու համար:","delete_topic_disallowed":"Դուք թույլտվություն չունեք ջնջելու այս թեման","delete_topic":"ջնջել թեման","remove_timer":"հեռացնել ժամաչափիչը"},"actions":{"people":{"like":{"one":"հավանել է սա","other":"հավանել է սա"},"like_capped":{"one":"և %{count} այլ անձ հավանել է սա","other":"և %{count} հոգի հավանել են սա"}},"by_you":{"off_topic":"Դուք դրոշակավորել եք սա որպես թեմայից դուրս","spam":"Դուք դրոշակավորել եք սա որպես սպամ","inappropriate":"Դուք դրոշակավորել եք սա որպես անհամապատասխան","notify_moderators":"Դուք դրոշակավորել եք սա մոդերացիայի համար","notify_user":"Դուք ուղարկել եք հաղորդագրություն այս օգտատիրոջը"}},"delete":{"confirm":{"one":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այդ հրապարակումը:","other":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այդ%{count} գրառումները:"}},"merge":{"confirm":{"one":"Դուք համոզվա՞ծ եք, որ ցանկանում եք միավորել այդ հրապարակումները:","other":"Դուք համոզվա՞ծ եք, որ ցանկանում եք միավորել այդ %{count} գրառումները:"}},"revisions":{"controls":{"first":"Առաջին խմբագրությունը","previous":"Նախորդ խմբագրությունը","next":"Հաջորդ խմբագրությունը","last":"Վերջին խմբագրությունը","hide":"Թաքցնել խմբագրությունը","show":"Ցուցադրել խմբագրությունը","edit_wiki":"Խմբագրել Wiki-ն","edit_post":"Խմբագրել Գրառումը","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Ցուցադրել ստացված արդյունքը` հավելումներն ու հեռացումները մեկ տեղում","button":"HTML"},"side_by_side":{"title":"Ցուցադրել ստացված արդյունքի տարբերությունները կողք կողքի ","button":"HTML"},"side_by_side_markdown":{"title":"Ցուցադրել սկբնաղբյուրի տարբերությունները կողք կողքի","button":"Չֆորմատավորված"}}},"raw_email":{"displays":{"raw":{"title":"Ցուցադրել չֆորմատավորված էլ. նամակը","button":"Չֆորմատավորված"},"text_part":{"title":"Ցուցադրել էլ. նամակի տեքստային մասը","button":"Տեքստ"},"html_part":{"title":"Ցուցադրել էլ. նամակի html մասը","button":"HTML"}}},"bookmarks":{"create":"Ստեղծել էջանշան","edit":"Խմբագրել էջանշանը","created":"Ստեղծված","updated":"Թարմացված","name":"Անուն","name_placeholder":"Ինչի՞ համար է այս էջանշանը: ","set_reminder":"Հիշեցնել ինձ","options":"Տարբերակներ","actions":{"delete_bookmark":{"name":"Ջնջել էջանշանը","description":"Էջանշանի հեռացում՝ ներառելով կարգավորված բոլոր հիշեցումները "},"edit_bookmark":{"name":"Խմբագրել էջանշանը","description":"Խմբագրել էջանշանի անվանումը կամ փոխել հիշեցման ամսաթիվը / ժամանակը"}}}},"category":{"none":"(կատեգորիա չկա)","all":"Բոլոր կատեգորիաները","choose":"կատեգորիա\u0026hellip;","edit":"Խմբագրել","edit_dialog_title":"Խմբագրել՝ %{categoryName}","view":"Դիտել Կատեգորիայի Թեմաները","general":"Ընդհանուր","settings":"Կարգավորումներ","topic_template":"Թեմայի Ձևանմուշ","tags":"Թեգեր","tags_allowed_tags":"Սահմանափակել այս թեգերը՝ այս կատեգորիայում. ","tags_allowed_tag_groups":"Սահմանափակել այս թեգերը՝ այս կատեգորիայում.","tags_placeholder":"(Ընտրովի) թույլատրված թեգերի ցանկը","tags_tab_description":"Այստեղ սահմանված թեգերը և թեգերի խմբերը հասանելի կլինեն միայն այս կատեգորիայում և այլ կատեգորիաներում, որոնք նույնպես սահմանում են դրանք: Դրանք հասանելի չեն լինի օգտագործման համար այլ կատեգորիաներում:","tag_groups_placeholder":"(Ընտրովի) թույլատրված թեգերի խմբերի ցանկը","allow_global_tags_label":"Նաև թույլ տալ այլ տեգեր ","tag_group_selector_placeholder":"(Ընտրովի) Թեգերի խումբ","required_tag_group_description":"Պահանջել, որ նոր թեմաների տեգերը լինեն տեգերի խմբից:","min_tags_from_required_group_label":"Թեգի Համարը.","required_tag_group_label":"Թեգերի խումբ.","topic_featured_link_allowed":"Թույլատրել հանրահայտ հղումները այս կատեգորիայում","delete":"Ջնջել Կատեգորիան","create":"Նոր Կատեգորիա","create_long":"Ստեղծել նոր Կատեգորիա","save":"Պահել Կատեգորիան","slug":"Կատեգորիայի Սլագը","slug_placeholder":"(Ընտրովի) գծիկավոր-բառեր url-ի համար","creation_error":"Կատեգորիայի ստեղծման ժամանակ տեղի է ունեցել սխալ:","save_error":"Կատեգորիան պահելիս տեղի է ունեցել սխալ:","name":"Կատեգորիայի Անունը","description":"Նկարագրույթուն","logo":"Կատեգորիայի Լոգոյի Նկարը","background_image":"Կատեգորիայի Ֆոնի Նկարը","badge_colors":"Կրծքանշանի գույները","background_color":"Ֆոնի գույնը","foreground_color":"Առաջին պլանի գույնը","name_placeholder":"Առավելագույնը մեկ կամ երկու բառ","color_placeholder":"Ցանկացած վեբ-գույն","delete_confirm":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս կատեգորիան:","delete_error":"Այս կատեգորիան ջնջելիս սխալ է տեղի ունեցել:","list":"Ցուցադրել Կատեգորիաները","no_description":"Խնդրում ենք այս կատեգորիայի համար ավելացնել նկարագրություն:","change_in_category_topic":"Խմբագրել Նկարագրությունը","already_used":"Այս գույնը օգտագործվել է մեկ այլ կատեգորիայի կողմից","security":"Անվտանգություն","permissions":{"group":"Խումբ","see":"Դիտել","reply":"Պատասխանել","create":"Ստեղծել"},"special_warning":"Ուշադրություն. Այս կատեգորիան նախապես ստեղծված կատեգորիա է, և անվտանգության կարգավորումները չեն կարող փոփոխվել: Եթե Դուք չեք ցանկանում օգտագործել այս կատեգորիան, ջնջեք այն՝ փոփոխելու փոխարեն:","uncategorized_security_warning":"Այս կատեգորիան հատուկ է: Այն նախատեսված է որպես կատեգորիա չունեցող թեմաների պահման տարածք; այն չի կարող ունենալ անվտանգության կարգավորումներ:","uncategorized_general_warning":"Այս կատեգորիան հատուկ է: Այն օգտագործվում է որպես լռելյայն կատեգորիա նոր թեմաների համար, որոնք չունեն ընտրված կատեգորիա: Եթե Դուք ցանկանում եք կանխել սա և պարտադրել կատեգորիայի ընտրությունը, \u003ca href=\"%{settingLink}\"\u003eխնդրում ենք անջատել կարգավորումը այստեղ\u003c/a\u003e: Եթե ցանկանում եք փոփոխել անունը կամ նկարագրությունը, այցելեք \u003ca href=\"%{customizeLink}\"\u003eCustomize / Text Content\u003c/a\u003e:","pending_permission_change_alert":"Դուք չեք ավելացրել %{group} այդ կատեգորիայի մեջ, սեղմեք այս կոճակը՝ դրանք ավելացնելու համար: ","images":"Նկարներ","email_in":"Անհատական մուտքային էլ. հասցե՝","email_in_allow_strangers":"Ընդունել էլ. նամակներ հաշիվ չունեցող անանուն օգտատերերից","email_in_disabled":"Էլ. փոստի միջոցով նոր թեմաների հրապարակումը անջատված է Կայքի Կարգավորումներում: Էլ. փոստի միջոցով նոր թեմաների հրապարակումը միացնելու համար, ","email_in_disabled_click":"միացրեք \"email in\" կարգավորումը:","mailinglist_mirror":"Կատեգորիան արտապատճենում է փոստային ցուցակ","show_subcategory_list":"Այս կատեգորիայում ցուցադրել ենթակատեգորիաների ցանկը թեմաների վերևում:","read_only_banner":"Բանների տեքստը, երբ օգտատերը չի կարող այս կատեգորիայում թեմա ստեղծել. ","num_featured_topics":"Կատեգորիաների էջում ցուցադրվող թեմաների քանակը՝","subcategory_num_featured_topics":"Մայր կատեգորիայի էջում հանրահայտ թեմաների քանակը","all_topics_wiki":"Դարձնել նոր թեմաները wiki լռելյայն","subcategory_list_style":"Ենթակատեգորիաների Ցանկի Ոճը՝","sort_order":"Թեմաների Ցանկը Դասավորել Ըստ՝","default_view":"Լռելյայն Թեմաների Ցանկը՝","default_top_period":"Լռելյայն թոփ ժամանակահատվածը՝","allow_badges_label":"Այս կատեգորիայում թույլ տալ կրծքանշանների շնորհումը","edit_permissions":"Խմբագրել Թույլտվությունները","review_group_name":"խմբի անունը","require_topic_approval":"Բոլոր նոր թեմաների համար պահանջել մոդերատորի հաստատումը","require_reply_approval":"Բոլոր նոր պատասխանների համար պահանջել մոդերատորի հաստատումը ","this_year":"այս տարի","position":"Դիրքը կատեգորիայի էջում.","default_position":"Լռելյայն Դիրքը","position_disabled":"Կատեգորիաները կցուցադրվեն ըստ ակտիվության: Ցանկերում կատեգորիաների դասավորությունը վերահսկելու համար,","position_disabled_click":"միացրեք \"fixed category positions\" կարգավորումը:","minimum_required_tags":"Թեմայում պահանջվող թեգերի նվազագույն քանակը՝","parent":"Մայր Կատեգորիա","num_auto_bump_daily":"Օրեկան ավտոմատ բարձրացվող բաց թեմաների քանակը՝","navigate_to_first_post_after_read":"Բոլոր թեմաները կարդալուց հետո տեղափոխվել դեպի առաջին գրառում","notifications":{"watching":{"title":"Դիտում Եմ"},"watching_first_post":{"title":"Դիտում Եմ Առաջին Գրառումը","description":"Դուք ծանուցում կստանաք այս կատեգորիայում նոր թեմաների, բայց ոչ այս թեմայի պատասխանների մասին:"},"tracking":{"title":"Հետևում Եմ"},"regular":{"title":"Նորմալ","description":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեզ:"},"muted":{"title":"Խլացված"}},"search_priority":{"label":"Որոնման Առաջնահերթություն","options":{"normal":"Նորմալ","ignore":"Անտեսել","very_low":"Շատ Ցածր","low":"Բարձր","high":"Բարձր","very_high":"Շատ Բարձր"}},"sort_options":{"default":"լռելյայն","likes":"Հավանումների","op_likes":"Սկզբնական Գրառման Հավանումների","views":"Դիտումների","posts":"Գրառումների","activity":"Ակտիվության","posters":"Հրապարակողների","category":"Կատեգորիաների","created":"Ստեղծման"},"sort_ascending":"Ըստ աճման","sort_descending":"Ըստ նվազման","subcategory_list_styles":{"rows":"Տողերը","rows_with_featured_topics":"Հանրահայտ թեմաներ պարունակող տողերը","boxes":"Արկղերը","boxes_with_featured_topics":"Հանրահայտ թեմաներ պարունակող արկղերը"},"settings_sections":{"general":"Ընդհանուր","moderation":"Մոդերացիա","appearance":"Արտաքին տեսք","email":"Էլ. հասցե"}},"flagging":{"title":"Շնորհակալ ենք, որ օգնում եք պահել մեր համայնքը քաղաքակիրթ:","action":"Դրոշակավորել Գրառումը","take_action_options":{"default":{"title":"Ձեռնարկել Գործողություն","details":"Անմիջապես հասնել դրոշակների քանակի սահմանին՝ առանց սպասելու համայնքային ավելի շատ դրոշակների"},"suspend":{"title":"Սառեցնել Օգտատիրոջը"},"silence":{"title":"Լռեցնել Օգտատիրոջը"}},"notify_action":"Հաղորդագրություն","official_warning":"Պաշտոնական Զգուշացում","delete_spammer":"Ջնջել Սպամ տարածողին","yes_delete_spammer":"Այո, Ջնջել Սպամ տարածողին","ip_address_missing":"(անհասանելի)","hidden_email_address":"(թաքցված)","submit_tooltip":"Կիրառել գաղտնի դրոշակ","take_action_tooltip":"Անմիջապես հասնել դրոշակների քանակի սահմանին՝ առանց սպասելու համայնքային ավելի շատ դրոշակների","cant":"Ներողություն, Դուք չեք կարող դրոշակավորել այս գրառումը այս պահին:","notify_staff":"Գաղտնի ծանուցում ուղարկել անձնակազմին","formatted_name":{"off_topic":"Դա Թեմայից Դուրս է","inappropriate":"Դա Անհամապատասխան է","spam":"Դա Սպամ է"},"custom_placeholder_notify_user":"Եղեք բնորոշ, կառուցողական և միշտ հարգալից:","custom_placeholder_notify_moderators":"Տեղեկացրեք մեզ հատկապես, թե ինչի մասին եք Դուք մտահոգված, և տրամադրեք համապատասխան հղումներ և օրինակներ, եթե հնարավոր է:","custom_message":{"at_least":{"one":"մուտքագրեք առնվազն %{count} սիմվոլ","other":"մուտքագրեք առնվազն %{count} սիմվոլ"},"more":{"one":"%{count} ևս...","other":"ևս %{count} շարունակելու համար..."},"left":{"one":"%{count}-ը մնում է","other":"%{count} հատ է մնացել"}}},"flagging_topic":{"title":"Շնորհակալ ենք, որ օգնում եք պահել մեր համայնքը քաղաքակիրթ:","action":"Դրոշակավորել Թեման","notify_action":"Հաղորդագրություն"},"topic_map":{"title":"Թեմայի Ամփոփումը","participants_title":"Հաճախակի Հրապարակողներ","links_title":"Տարածված Հղումներ","links_shown":"ցուցադրել ավելի շատ հղումներ...","clicks":{"one":"%{count} սեղմում","other":"%{count} սեղմում"}},"post_links":{"about":"Ցուցադրել ավելի շատ հղումներ այս գրառման համար","title":{"one":"ևս %{count}","other":"ևս %{count}"}},"topic_statuses":{"warning":{"help":"Սա պաշտոնական զգուշացում է:"},"bookmarked":{"help":"Դուք էջանշել եք այս թեման"},"locked":{"help":"Այս թեման փակված է; այն այլևս չի կարող ընդունել նոր պատասխաններ"},"archived":{"help":"Այս թեման արխիվացված է; այն սառեցված է և չի կարող փոփոխվել:"},"locked_and_archived":{"help":"Այս թեման փակված և արխիվացված է; այն այլևս չի կարող ընդունել նոր պատասխաններ և չի կարող փոփոխվել:"},"unpinned":{"title":"Ապակցված","help":"Այս թեման ապակցված է Ձեզ համար; այն կցուցադրվի սովորական հերթականությամբ:"},"pinned_globally":{"title":"Ամրակցված Գլոբալ Կերպով","help":"Այս թեման ամրակցված է գլոբալ կերպով; այն կցուցադրվի վերջինների և իր կատեգորիայի վերևում"},"pinned":{"title":"Ամրակցված","help":"Այս թեման ամրակցված է Ձեզ համար; այն կցուցադրվի իր կատեգորիայի վերևում"},"unlisted":{"help":"Այս թեման հանված է ցանկից; այն չի ցուցադրվի թեմաների ցանկերում, և կարող է հասանելի լինել միայն ուղղակի հղումով"},"personal_message":{"title":"Այս թեման անձնական հաղորդագրություն է","help":"Այս թեման անձնական հաղորդագրություն է"}},"posts":"Գրառումներ","original_post":"Սկզբնական Գրառումը","views":"Դիտում","views_lowercase":{"one":"դիտում","other":"դիտում"},"replies":"Պատասխան","views_long":{"one":"այս թեման դիտվել է %{count} անգամ","other":"այս թեման դիտվել է %{number} անգամ"},"activity":"Ակտիվություն","likes":"Հավանում","likes_lowercase":{"one":"հավանում","other":"հավանում"},"users":"Օգտատեր","users_lowercase":{"one":"օգտատեր","other":"օգտատերեր"},"category_title":"Կատեգորիա","changed_by":"%{author}-ի կողմից","raw_email":{"title":"Մուտքային Էլ. նամակ","not_available":"Հասանելի չէ!"},"categories_list":"Կատեգորիաների Ցանկ","filters":{"with_topics":"%{filter} թեմա","with_category":"%{filter} %{category} թեմա","latest":{"title":"Վերջինները","title_with_count":{"one":"Վերջին (%{count})","other":"Վերջինները (%{count})"},"help":"վերջերս կատարված գրառումներով թեմաները"},"read":{"title":"Կարդացած","help":"Ձեր կարդացած թեմաները այն հերթականությամբ, որով Դուք վերջին անգամ կարդացել եք դրանք"},"categories":{"title":"Կատեգորիաներ","title_in":"Կատեգորիա - %{categoryName}","help":"ըստ կատեգորիայի խմբավորված բոլոր թեմաները"},"unread":{"title":"Չկարդացած","title_with_count":{"one":"Չկարդացած (%{count})","other":"Չկարդացած (%{count})"},"help":"չկարդացած գրառումներով թեմաները, որոնց Դուք այժմ դիտում եք կամ հետևում եք","lower_title_with_count":{"one":"%{count} չկարդացած","other":"%{count} չկարդացած"}},"new":{"lower_title_with_count":{"one":"%{count} նոր","other":"%{count} նոր"},"lower_title":"նոր","title":"Նոր","title_with_count":{"one":"Նոր (%{count})","other":"Նոր (%{count})"},"help":"վերջին մի քանի օրվա ընթացքում ստեղծված թեմաներ"},"posted":{"title":"Իմ Գրառումները","help":"թեմաները, որտեղ Դուք գրառում եք կատարել"},"bookmarks":{"title":"Էջանշաններ","help":"թեմաները, որոնք Դուք էջանշել եք"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"%{categoryName} կատեգորիայի վերջին թեմաները"},"top":{"title":"Թոփ","help":"վերջին տարվա, ամսվա, շաբաթվա կամ օրվա ընթացքում ամենաակտիվ թեմաները","all":{"title":"Ամբողջ Ժամանակ"},"yearly":{"title":"Տարվա Ընթացքում"},"quarterly":{"title":"Եռամսյակի Ընթացքում"},"monthly":{"title":"Ամսվա Ընթացքում"},"weekly":{"title":"Շաբաթվա Ընթացքում"},"daily":{"title":"Օրվա Ընթացքում"},"all_time":"Ամբողջ ժամանակ","this_year":"Տարի","this_quarter":"Եռամսյակ","this_month":"Ամիս","this_week":"Շաբաթ","today":"Այսօր","other_periods":"տեսնել թոփը՝ "}},"permission_types":{"full":"Ստեղծել/Պատասխանել/Դիտել","create_post":"Պատասխանել/Դիտել","readonly":"Դիտել"},"lightbox":{"download":"ներբեռնել","previous":"Նախորդ (սլաքի Ձախ ստեղնը)","next":"Հաջորդ (սլաքի Աջ ստեղնը)","counter":"%curr% %total% -ից","close":"Փակել (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003e Բովանդակությունը \u003c/a\u003e հնարավոր չէ բեռնել:","image_load_error":"\u003ca href=\"%url%\"\u003e Պատկերը \u003c/a\u003e հնարավոր չէ բեռնել:"},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":",","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} կամ %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Ստեղնաշարի Համադրություններ","jump_to":{"title":"Ցատկել Դեպի","home":"%{shortcut} Գլխավոր էջ","latest":"%{shortcut} Վերջինները","new":"%{shortcut} Նոր","unread":"%{shortcut} Չկարդացած","categories":"%{shortcut} Կատեգորիաներ","top":"%{shortcut} Թոփ","bookmarks":"%{shortcut} Էջանշաններ","profile":"%{shortcut} Պրոֆիլ","messages":"%{shortcut} Հաղորդագրություններ","drafts":"%{shortcut} Սևագրեր"},"navigation":{"title":"Նավիգացիա","jump":"%{shortcut} Գնալ դեպի գրառում # ","back":"%{shortcut} Ետ","up_down":"%{shortcut} Տեղաշարժել նշվածը \u0026uarr; \u0026darr;","open":"%{shortcut} Բացել ընտրված թեման","next_prev":"%{shortcut} Հաջորդ/նախորդ բաժին","go_to_unread_post":"%{shortcut} Գնալ դեպի առաջին չընթերցված գրառումը"},"application":{"title":"Հավելված","create":"%{shortcut} Ստեղծել նոր թեմա","notifications":"%{shortcut} Բացել ծանուցումները","hamburger_menu":"%{shortcut} Բացել համբուրգեր մենյուն","user_profile_menu":"%{shortcut} Բացել օգտատիրոջ մենյուն","show_incoming_updated_topics":"%{shortcut} Ցուցադրել թարմացված թեմաները","search":"%{shortcut} Որոնել","help":"%{shortcut} Բացել ստեղնաշարի օգնականը","dismiss_topics":"%{shortcut} Չեղարկել Թեմաները","log_out":"%{shortcut} Ելք"},"composing":{"title":"Կազմում","return":"%{shortcut} Վերադառնալ կոմպոզերին","fullscreen":"%{shortcut} Ամբողջական էկրանով կոմպոզեր"},"bookmarks":{"title":"Էջանշում","enter":"%{shortcut} Պահել և փակել","later_today":"%{shortcut} Այսօր, բայց ավելի ուշ","later_this_week":"%{shortcut} Այս շաբաթ, մի փոքր ավելի ուշ","tomorrow":"%{shortcut} Վաղը","next_week":"%{shortcut} Հաջորդ շաբաթ","next_month":"%{shortcut} Հաջորդ ամիս","next_business_week":"%{shortcut} Հաջորդ աշխատանքային շաբաթում ","next_business_day":"%{shortcut} Հաջորդ աշխատանքային օրը","custom":"%{shortcut} Սահմանել հիշեցումների ամսաթիվն ու ժամանակը:","none":"%{shortcut} Հիշեցում չսահմանել ","delete":"%{shortcut} Ջնջել էջանշանը"},"actions":{"title":"Գործողություններ","bookmark_topic":"%{shortcut} Փոխանջատել թեմայի էջանշանը","pin_unpin_topic":"%{shortcut} Ամրակցել/Ապակցել թեման","share_topic":"%{shortcut} Կիսվել թեմայով","share_post":"%{shortcut} Կիսվել գրառմամբ","reply_as_new_topic":"%{shortcut} Պատասխանել որպես կապված թեմա","reply_topic":"%{shortcut} Պատասխանել թեմային","reply_post":"%{shortcut} Պատասխանել գրառմանը","quote_post":"%{shortcut} Մեջբերել գրառումը","like":"%{shortcut} Հավանել գրառումը","flag":"%{shortcut} Դրոշակավորել գրառումը","bookmark":"%{shortcut} Էջանշել գրառումը","edit":"%{shortcut} Խմբագրել գրառումը","delete":"%{shortcut} Ջնջել գրառումը","mark_muted":"%{shortcut} Խլացնել թեման","mark_regular":"%{shortcut} Սովորական (լռելյայն) թեմա","mark_tracking":"%{shortcut} Հետևել թեմային","mark_watching":"%{shortcut} Դիտել թեման","print":"%{shortcut} Տպել թեման","defer":"%{shortcut} Հետաձգել թեման","topic_admin_actions":"%{shortcut} Բացել թեմայի ադմինի գործողությունները "},"search_menu":{"title":"Որոնման արդյունքների Մենյու ","prev_next":"%{shortcut} Տեղաշարժել նշվածը վեր և վար","insert_url":"%{shortcut} Ընտրված հղումը տեղադրել բաց կոմպոզերի մեջ"}},"badges":{"earned_n_times":{"one":"Վաստակել է այս կրծքանշանը %{count} անգամ","other":"Վաստակել է այս կրծքանշանը %{count} անգամ"},"granted_on":"Շնորհված է %{date}","others_count":"Այս կրծքանշանով այլոք (%{count})","title":"Կրծքանշաններ","allow_title":"Դուք կարող եք օգտագործել այս կրծքանշանը որպես վերնագիր","multiple_grant":"Դուք կարող եք վաստակել սա բազմակի անգամ","badge_count":{"one":"%{count} Կրծքանշան","other":"%{count} Կրծքանշան"},"more_badges":{"one":"+%{count} Ավելի","other":"+ևս %{count}"},"granted":{"one":"%{count} շնորհված","other":"%{count} շնորհված"},"select_badge_for_title":"Ընտրեք կրծքանշան՝ որպես Ձեր վերնագիր օգտագործելու համար","none":"(ոչ մի)","successfully_granted":"%{badge}-ը հաջողությամբ շնորհված է %{username}-ին","badge_grouping":{"getting_started":{"name":"Սկսել"},"community":{"name":"Համայնք"},"trust_level":{"name":"Վստահության Մակարդակ"},"other":{"name":"Այլ"},"posting":{"name":"Հրապարակում"}}},"download_calendar":{"download":"Ներբեռնել"},"tagging":{"all_tags":"Բոլոր Թեգերը","other_tags":"Այլ Թեգեր","selector_all_tags":"բոլոր թեգերը","selector_no_tags":"առանց թեգերի","changed":"փոփոխված թեգերը՝ ","tags":"Թեգեր","choose_for_topic":"ընտրովի թեգեր","info":"Ինֆորմացիա","category_restricted":"Այս տեգը սահմանափակված է այն կատեգորիաներով, որոնցում մուտքի թույլտվություն չունեք:","synonyms":"Հոմանիշներ","synonyms_description":"Հետևյալ տեգերի օգտագործման դեպքում, դրանք կփոխարինվեն \u003cb\u003e%{base_tag_name}\u003c/b\u003e -ով:","tag_groups_info":{"one":"Այս պիտակը պատկանում է «%{tag_groups}» խմբին:","other":"Այս թեգը պատկանում է այս խմբերին՝ %{tag_groups}"},"edit_synonyms":"Կարգավորել Հոմանիշները","add_synonyms_label":"Ավելացնել հոմանիշներ.","add_synonyms":"Ավելացնել","add_synonyms_failed":"Այս տեգերը չեն կարող ավելացվել որպես հոմանիշներ՝ \u003cb\u003e%{tag_names}\u003c/b\u003e : Համոզվեք, որ դրանք հոմանիշներ չունեն և մեկ այլ տեգի հոմանիշներ չեն:","remove_synonym":"Հեռացնել Հոմանիշը","delete_synonym_confirm":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել հոմանիշ \u003c\u003c%{tag_name}\u003e\u003e :","delete_tag":"Ջնջել Թեգը","delete_confirm":{"one":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս թեգը և հեռացնել այն %{count} թեմայից, որին այն վերագրված է:","other":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս թեգը և հեռացնել այն %{count} թեմայից, որոնց այն վերագրված է:"},"delete_confirm_no_topics":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս թեգը:","rename_tag":"Վերանվանել Թեգը","rename_instructions":"Ընտրեք նոր անուն թեգի համար՝ ","sort_by":"Դասավորել ըստ՝ ","sort_by_count":"քանակի","sort_by_name":"անվան","manage_groups":"Կառավարել Թեգերի Խմբերը","manage_groups_description":"Սահմանեք խմբեր՝ թեգերը համակարգելու համար","upload":"Վերբեռնել Թեգեր","upload_description":"Վերբեռնեք csv ֆայլ՝ զանգվածային կերպով թեգեր ստեղծելու համար","upload_instructions":"Յուրաքանչյուր տեղում մեկ հատ, ըստ ցանկության՝ նաև թեգերի խմբով, 'tag_name,tag_group' ֆորմատով:","upload_successful":"Թեգերը հաջողությամբ վերբեռնված են","delete_unused_confirmation":{"one":"%{count} թեգ կջնջվի՝%{tags}","other":"%{count} թեգ կջնջվի՝ %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} և ևս %{count} ","other":"%{tags} և ևս %{count}"},"delete_unused":"Ջնջել Չօգտագործված Թեգերը","delete_unused_description":"Ջնջել բոլոր թեգերը, որոնք կցված չեն որևէ թեմայի կամ անձնական հաղորդագրության","cancel_delete_unused":"Չեղարկել","filters":{"without_category":"%{filter} %{tag} թեմա","with_category":"%{filter} %{tag} թեմա %{category}-ում","untagged_without_category":"%{filter} առանց թեգի թեմա","untagged_with_category":"%{filter}առանց թեգի թեմա %{category}-ում"},"notifications":{"watching":{"title":"Դիտում Եմ","description":"Դուք ավտոմատ կերպով կդիտեք այս թեգով բոլոր թեմաները: Դուք ծանուցում կստանաք բոլոր գրառումների և թեմաների մասին, ավելին՝ չկարդացած և նոր գրառումների քանակը նույնպես կհայտնվի թեմայի կողքին: "},"watching_first_post":{"title":"Դիտում Եմ Առաջին Գրառումը","description":"Դուք ծանուցում կստանաք այս թեգով նոր թեմաների, բայց ոչ թեմաների պատասխանների մասին:"},"tracking":{"title":"Հետևում Եմ","description":"Դուք ավտոմատ կերպով կհետևեք այս թեգով բոլոր թեմաներին: Չկարդացած և նոր գրառումների քանակը կհայտնվի թեմայի կողքին:"},"regular":{"title":"Սովորական","description":"Դուք ծանուցում կստանաք, եթե որևէ մեկը հիշատակի Ձեր @անունը կամ պատասխանի Ձեր հրապարակմանը:"},"muted":{"title":"Խլացված","description":"Դուք ծանուցում չեք ստանա այս թեգով որևէ նոր թեմայի մասին, և դրանք չեն հայտնվի Ձեր չկարդացածների ցանկում:"}},"groups":{"title":"Թեգավորել Խմբերը","new":"Նոր Խումբ","one_per_topic_label":"Սահմանափակել այս խմբի յուրաքանչյուր թեման մեկ թեգով:","new_name":"Նոր Թեգի Խումբ","name_placeholder":"Անուն","save":"Պահպանել","delete":"Ջնջել","confirm_delete":"Դուք համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս թեգի խումբը:","everyone_can_use":"Թեգերը կարող են օգտագործվել բոլորի կողմից:"},"topics":{"none":{"unread":"Դուք չունեք չկարդացած թեմաներ:","new":"Դուք չունեք նոր թեմաներ:","read":"Դուք դեռևս չեք կարդացել որևէ թեմա:","posted":"Դուք դեռևս գրառում չեք կատարել որևէ թեմայում:","latest":"Վերջերս հրապարակված թեմաներ չկան:","bookmarks":"Դուք դեռևս չունեք էջանշած թեմաներ:","top":"Թոփ թեմաներ չկան:"}}},"invite":{"custom_message":"Դարձրեք Ձեր հրավերը ավելի անձնական՝ գրելով \u003ca href\u003eանհատական հաղորդագրություն\u003c/a\u003e:","custom_message_placeholder":"Մուտքագրեք Ձեր անհատական հաղորդագրությունը","custom_message_template_forum":"Հեյ, Դուք պետք է միանաք այս ֆորումին!","custom_message_template_topic":"Հեյ, ես կարծում եմ, որ Ձեզ դուր կգա այս թեման!"},"forced_anonymous":"Չափազանց մեծ բեռնման շնորհիվ սա ժամանակավորապես ցուցադրվում է բոլորին այնպես, ինչպես այն կտեսներ դուրս գրված օգտատերը:","footer_nav":{"back":"Ետ","forward":"Փոխանցել","share":"Կիսվել","dismiss":"Չեղարկել"},"safe_mode":{"enabled":"Անվտանգ ռեժիմը միացված է, փակեք բրաուզերի այս պատուհանը՝ անվտանգ ռեժիմից դուրս գալու համար:"},"do_not_disturb":{"remaining":"%{remaining}-ը մնում է","options":{"custom":"Մասնավոր"}},"trust_levels":{"names":{"newuser":"նոր օգտատեր","basic":"հիմնական օգտատեր","member":"անդամ","regular":"սովորական","leader":"առաջնորդ"}},"user_activity":{"no_activity_others":"Ակտիվություն չկա:","no_replies_others":"Պատասխան չկա:","no_likes_others":"Հավանած գրառումներ չկան:"},"cakeday":{"title":"Տարթի օր","today":"Այսօր","tomorrow":"Վաղը","upcoming":"Առաջիկա","all":"Բոլոր"},"birthdays":{"title":"Ծննդյան օրեր","month":{"title":"Հետևյալ Ամսվա Ծննդյան օրեր","empty":"Այս ամիս ծննդյան օր նշող օգտատերեր չկան:"},"upcoming":{"title":"%{start_date} - %{end_date} -ի ծննդյան օրեր","empty":"Հաջորդ 7 օրերին ծննդյան օր նշող օգտատերեր չկան:"},"today":{"title":"%{date} -ի ծննդյան օրեր","empty":"Այսօր ծննդյան օր նշող օգտատերեր չկան:"},"tomorrow":{"empty":"Վաղը ծննդյան օր նշող օգտատերեր չկան:"}},"anniversaries":{"title":"Տարեդարձներ","month":{"title":"Հետևյալ Ամսվա Տարեդարձեր՝","empty":"Այս ամիս տարեդարձ նշող օգտատերեր չկան:"},"upcoming":{"title":" %{start_date} - %{end_date} -ի տարեդարձներ","empty":" Հաջորդ 7 օրվա ընթացքում տարեդարձ նշող օգտատերեր չկան:"},"today":{"title":"%{date}-ի տարեդարձներ","empty":"Այսօր տարեդարձ նշող օգտատերեր չկան:"},"tomorrow":{"empty":"Վաղը տարեդարձ նշող օգտատերեր չկան:"}},"details":{"title":"Թաքցնել Մանրամասները"},"discourse_local_dates":{"relative_dates":{"today":"Այսօր %{time}","tomorrow":"Վաղը %{time}","yesterday":"Երեկ %{time}"},"create":{"form":{"insert":"Մուտքագրել","advanced_mode":"Ընդլայնված ռեժիմ","simple_mode":"Հասարակ ռեժիմ","timezones_title":"Ցուցադրվող ժամային գոտիներ","timezones_description":"Ժամային գոտիները կօգտագործվեն նախադիտման և վերադարձի ժամանակ ամսաթվի ցուցադրման համար:","recurring_title":"Կրկնություն","recurring_description":"Սահմանեք իրադարձության կրկնությունը: Դուք կարող եք նաև ձեռքով խմբագրել էջի կողմից գեներացված կրկնության տարբերակը և օգտագործեք հետևյալ key-երից որևէ մեկը՝ տարիներ, եռամսյակներ, շաբաթներ, օրեր, ժամեր, րոպեներ, վայրկյաններ, միլիվայրկյաններ:","recurring_none":"Կրկնություն չկա","invalid_date":"Անվավեր ամսաթիվ, համոզվեք, որ ամսաթիվը և ժամը ճիշտ են","date_title":"Ամսաթիվ","time_title":"Ժամ","format_title":"Ամսաթվի ֆորմատ","timezone":"Ժամային գոտի"}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Մեկնարկել նոր օգտատիրոջ ձեռնարկը բոլոր նոր օգտատերերի համար","welcome_message":"Բոլոր նոր օգտատերերին ուղարկել ողջույնի նամակ՝ արագ մեկնարկի հրահանգներով"}},"presence":{"replying":{"one":"պատասխանում է","other":"պատասխանում է"},"editing":{"one":"խմբագրում է","other":"խմբագրում է"},"replying_to_topic":{"one":"պատասխանում է","other":"պատասխանում են"}},"poll":{"voters":{"one":"քվեարկող","other":"քվեարկող"},"total_votes":{"one":"ընդհանուր քվեարկող","other":"ընդհանուր քվեները"},"average_rating":"Միջին գնահատականը՝ \u003cstrong\u003e%{average}\u003c/strong\u003e:","public":{"title":"Քվեները \u003cstrong\u003eհանրային\u003c/strong\u003e են:"},"results":{"vote":{"title":"Արդյունքները կցուցադրվեն ըստ \u003cstrong\u003eքվեի\u003c/strong\u003e:"},"closed":{"title":"Արդյունքները կցուցադրվեն \u003cstrong\u003eփակվելուց\u003c/strong\u003e անմիջապես հետո:"}},"cast-votes":{"title":"Քվեարկեք","label":"Քվեարկեք հիմա !"},"show-results":{"title":"Ցուցադրել հարցման արդյունքները","label":"Ցուցադրել արդյունքները"},"hide-results":{"title":"Վերադառնալ դեպի Ձեր քվեները"},"export-results":{"label":"Արտահանել"},"open":{"title":"Բացել հարցումը","label":"Բացել","confirm":"Դուք համոզվա՞ծ եք, որ ցանկանում եք բացել այս հարցումը:"},"close":{"title":"Փակել հարցումը","label":"Փակել","confirm":" Դուք համոզվա՞ծ եք, որ ցանկանում եք փակել այս հարցումը:"},"automatic_close":{"closes_in":"Փակվում է \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e անց:","age":"Փակված է՝ \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"count":"Քանակ"},"error_while_toggling_status":"Ներողություն, այս հարցման կարգավիճակը փոխելիս տեղի է ունեցել սխալ:","error_while_casting_votes":"Ներողություն, Ձեր քվեարկելիս տեղի է ունեցել սխալ:","error_while_fetching_voters":"Ներողություն, քվեարկողներին ցուցադրելիս տեղի է ունեցել սխալ:","ui_builder":{"title":"Ստեղծել Հարցում","insert":"Ներմուծել Հարցում","help":{"invalid_values":"Նվազագույն արժեքը պետք է լինի առավելագույն արժեքից փոքր:","min_step_value":"Քայլի նվազագույն արժեքն է 1"},"poll_type":{"label":"Տիպը","regular":"Մեկ Ընտրությամբ","multiple":"Բազմակի Ընտրությամբ","number":"Թվային Գնահատում"},"poll_result":{"always":"Միշտ տեսանելի"},"poll_config":{"step":"Քայլը"},"poll_public":{"label":"Ցուցադրել քվեարկողներին"},"automatic_close":{"label":"Ավտոմատ կերպով փակել հարցումը"}}},"styleguide":{"sections":{"typography":{"example":"Բարի գալուստ Discourse"},"colors":{"title":"Գույներ"},"icons":{"title":"Պատկերակներ"},"categories":{"title":"Կատեգորիաներ"},"navigation":{"title":"Նավիգացիա"},"categories_list":{"title":"Կատեգորիաների Ցանկ"},"topic_timer_info":{"title":"Թեմաների Ժամաչափիչներ"},"post":{"title":"Գրառում"},"suggested_topics":{"title":"Առաջարկվող Թեմաներ"}}}}},"en":{"js":{"dates":{"wrap_on":"on %{date}","from_placeholder":"from date"},"share":{"twitter":"Share on Twitter","facebook":"Share on Facebook","email":"Send via email","url":"Copy and share URL"},"skip_to_main_content":"Skip to main content","software_update_prompt":{"message":"We've updated this site, \u003cspan\u003eplease refresh\u003c/span\u003e, or you may experience unexpected behavior."},"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined.","other":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} users have joined."},"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)","eu_south_1":"EU (Milan)"}},"clear_input":"Clear input","period_chooser":{"aria_label":"Filter by period"},"about":{"stat":{"last_day":"Last 24 hours","last_7_days":"Last 7 days","last_30_days":"Last 30 days"}},"bookmarked":{"edit_bookmark":"Edit Bookmark","help":{"edit_bookmark":"Click to edit the bookmark on this topic","edit_bookmark_for_topic":"Click to edit the bookmark for this topic","unbookmark_with_reminder":"Click to remove all bookmarks and reminders in this topic."}},"bookmarks":{"created":"You've bookmarked this post. %{name}","remove_reminder_keep_bookmark":"Remove reminder and keep bookmark","created_with_reminder":"You've bookmarked this post with a reminder %{date}. %{name}","auto_delete_preference":{"label":"Automatically delete","when_reminder_sent":"Once the reminder is sent","on_owner_reply":"After I reply to this topic"},"search_placeholder":"Search bookmarks by name, topic title, or post content","reminders":{"existing_reminder":"You have a reminder set for this bookmark which will be sent %{at_date_time}"}},"copy_codeblock":{"copied":"copied!"},"drafts":{"label_with_count":"Drafts (%{count})","remove_confirmation":"Are you sure you want to delete this draft?","new_private_message":"New personal message draft","abandon":{"confirm":"You have a draft in progress for this topic. What would you like to do with it?","no_value":"Resume editing"}},"deleting":"Deleting...","processing_filename":"Processing: %{filename}...","review":{"date_filter":"Posted between","stale_help":"This reviewable has been resolved by \u003cb\u003e%{username}\u003c/b\u003e.","topic_has_pending":{"one":"This topic has \u003cb\u003e%{count}\u003c/b\u003e post pending approval","other":"This topic has \u003cb\u003e%{count}\u003c/b\u003e posts pending approval"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"},"agreed":{"one":"%{count}% agree","other":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree","other":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore","other":"%{count}% ignore"}},"filters":{"orders":{"score_asc":"Score (reverse)"}},"approval":{"pending_posts":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e post pending.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e posts pending."}},"reject_reason":{"title":"Why are you rejecting this user?","send_email":"Send rejection email"}},"relative_time_picker":{"minutes":{"one":"minute","other":"minutes"},"hours":{"one":"hour","other":"hours"},"months":{"one":"month","other":"months"},"years":{"one":"year","other":"years"},"relative":"Relative"},"time_shortcut":{"post_local_date":"Date in post","start_of_next_business_week":"Monday","two_weeks":"Two weeks","six_months":"Six months","relative":"Relative time","none":"None needed","last_custom":"Last custom datetime"},"directory":{"edit_columns":{"title":"Edit Directory Columns"}},"groups":{"add_members":{"title":"Add Users to %{group_name}","description":"Enter a list of users you want to invite to the group or paste in a comma separated list:","usernames_or_emails_placeholder":"usernames or emails","notify_users":"Notify users","set_owner":"Set users as owners of this group"},"manage":{"add_members":"Add Users","email":{"status":"Synchronized %{old_emails} / %{total_emails} emails via IMAP.","enable_smtp":"Enable SMTP","enable_imap":"Enable IMAP","test_settings":"Test Settings","save_settings":"Save Settings","last_updated":"Last updated:","settings_required":"All settings are required, please fill in all fields before validation.","smtp_settings_valid":"SMTP settings valid.","smtp_title":"SMTP","smtp_instructions":"When you enable SMTP for the group, all outbound emails sent from the group's inbox will be sent via the SMTP settings specified here instead of the mail server configured for other emails sent by your forum.","imap_title":"IMAP","imap_additional_settings":"Additional Settings","imap_instructions":"When you enable IMAP for the group, emails are synced between the group inbox and the provided IMAP server and mailbox. SMTP must be enabled with valid and tested credentials before IMAP can be enabled. The email username and password used for SMTP will be used for IMAP. For more information see \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Warning: This is an alpha-stage feature. Only Gmail is officially supported. Use at your own risk!","imap_settings_valid":"IMAP settings valid.","smtp_disable_confirm":"If you disable SMTP, all SMTP and IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_disable_confirm":"If you disable IMAP all IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_mailbox_not_selected":"You must select a Mailbox for this IMAP configuration or no mailboxes will be synced!","prefill":{"title":"Prefill with settings for:","gmail":"GMail"},"credentials":{"title":"Credentials","smtp_server":"SMTP Server","smtp_port":"SMTP Port","smtp_ssl":"Use SSL for SMTP","imap_server":"IMAP Server","imap_port":"IMAP Port","imap_ssl":"Use SSL for IMAP"},"settings":{"allow_unknown_sender_topic_replies":"Allow unknown sender topic replies.","allow_unknown_sender_topic_replies_hint":"Allows unknown senders to reply to group topics. If this is not enabled, replies from email addresses not already invited to the topic will create a new topic."},"mailboxes":{"synchronized":"Synchronized Mailbox","none_found":"No mailboxes were found in this email account."}},"categories":{"long_title":"Category default notifications","description":"When users are added to this group, their category notification settings will be set to these defaults. Afterwards, they can change them.","watched_categories_instructions":"Automatically watch all topics in these categories. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_categories_instructions":"Automatically track all topics in these categories. A count of new posts will appear next to the topic.","watching_first_post_categories_instructions":"Users will be notified of the first post in each new topic in these categories.","regular_categories_instructions":"If these categories are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_categories_instructions":"Users will not be notified of anything about new topics in these categories, and they will not appear on the categories or latest topics pages."},"tags":{"long_title":"Tags default notifications","description":"When users are added to this group, their tag notification settings will be set to these defaults. Afterwards, they can change them.","watched_tags_instructions":"Automatically watch all topics with these tags. Group members will be notified of all new posts and topics, and a count of new posts will also appear next to the topic.","tracked_tags_instructions":"Automatically track all topics with these tags. A count of new posts will appear next to the topic.","watching_first_post_tags_instructions":"Users will be notified of the first post in each new topic with these tags.","regular_tags_instructions":"If these tags are muted, they will be unmuted for group members. Users will be notified if they are mentioned or someone replies to them.","muted_tags_instructions":"Users will not be notified of anything about new topics with these tags, and they will not appear in latest."}},"permissions":{"none":"There are no categories associated with this group.","description":"Members of this group can access these categories"},"members":{"make_primary":"Make Primary","make_primary_description":"Make this the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Remove as Primary","remove_primary_description":"Remove this as the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Remove Members","remove_members_description":"Remove selected users from this group","make_owners":"Make Owners","make_owners_description":"Make selected users owners of this group","remove_owners":"Remove Owners","remove_owners_description":"Remove selected users as owners of this group","make_all_primary":"Make All Primary","make_all_primary_description":"Make this the primary group for all selected users","remove_all_primary":"Remove as Primary","remove_all_primary_description":"Remove this group as primary","primary":"Primary","no_filter_matches":"No members match that search."},"flair_upload_description":"Use square images no smaller than 20px by 20px.","flair_type":{"icon":"Select an icon","image":"Upload an image"},"default_notifications":{"modal_title":"User default notifications"}},"categories":{"muted":"Muted categories","topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"}},"user_fields":{"required":"Please enter a value for \"%{name}\""},"user":{"user_notifications":{"filters":{"filter_by":"Filter By","unseen":"Unseen"},"ignore_duration_title":"Ignore User"},"notification_schedule":{"title":"Notification Schedule","label":"Enable custom notification schedule","tip":"Outside of these hours you will be put in 'do not disturb' automatically.","midnight":"Midnight","monday":"Monday","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"read_help":"Recently read topics","sr_expand_profile":"Expand profile details","sr_collapse_profile":"Collapse profile details","desktop_notifications":{"each_browser_note":"Note: You have to change this setting on every browser you use. All notifications will be disabled when in \"do not disturb\", regardless of this setting."},"no_messages_title":"You don’t have any messages","no_messages_body":"Need to have a direct personal conversation with someone, outside the normal conversational flow? Message them by selecting their avatar and using the %{icon} message button.\u003cbr\u003e\u003cbr\u003e If you need help, you can \u003ca href='%{aboutUrl}'\u003emessage a staff member\u003c/a\u003e.\n","no_bookmarks_title":"You haven’t bookmarked anything yet","no_bookmarks_body":"Start bookmarking posts with the %{icon} button and they will be listed here for easy reference. You can schedule a reminder too!\n","no_bookmarks_search":"No bookmarks found with the provided search query.","no_notifications_title":"You don’t have any notifications yet","no_notifications_body":"You will be notified in this panel about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","no_notifications_page_title":"You don’t have any notifications yet","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","skip_new_user_tips":{"description":"Skip new user onboarding tips and badges","not_first_time":"Not your first time?","skip_link":"Skip these tips","read_later":"I'll read it later."},"color_scheme_default_on_all_devices":"Set default color scheme(s) on all my devices","color_scheme":"Color Scheme","color_schemes":{"default_description":"Theme default","disable_dark_scheme":"Same as regular","dark_instructions":"You can preview the dark mode color scheme by toggling your device's dark mode.","dark":"Dark mode","default_dark_scheme":"(site default)"},"dark_mode":"Dark Mode","dark_mode_enable":"Enable automatic dark mode color scheme","regular_categories_instructions":"You will see these categories in the “Latest” and “Top” topic lists.","muted_users_instructions":"Suppress all notifications and PMs from these users.","allowed_pm_users":"Allowed","allowed_pm_users_instructions":"Only allow PMs from these users.","allow_private_messages_from_specific_users":"Only allow specific users to send me personal messages","ignored_users_instructions":"Suppress all posts, notifications, and PMs from these users.","save_to_change_theme":"Theme will be updated after you click \"%{save_text}\"","messages":{"all":"all inboxes","personal":"Personal","warnings":"Official Warnings","read_more_in_group":"Want to read more? Browse other messages in %{groupLink}.","read_more":"Want to read more? Browse other messages in \u003ca href='%{basePath}/u/%{username}/messages'\u003epersonal messages\u003c/a\u003e."},"second_factor_backup":{"title":"Two-Factor Backup Codes","manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining.","other":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup codes remaining."},"enable_prerequisites":"You must enable a primary two-factor method before generating backup codes."},"second_factor":{"title":"Two-Factor Authentication","enable":"Manage Two-Factor Authentication","disable_all":"Disable All","extended_description":"Two-factor authentication adds extra security to your account by requiring a one-time token in addition to your password. Tokens can be generated on \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e and \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e devices.\n","oauth_enabled_warning":"Please note that social logins will be disabled once two-factor authentication has been enabled on your account.","enforced_notice":"You are required to enable two-factor authentication before accessing this site.","disable_confirm":"Are you sure you want to disable all two-factor methods?","edit_title":"Edit Authenticator","edit_description":"Authenticator Name","enable_security_key_description":"When you have your \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003ehardware security key\u003c/a\u003e prepared, press the Register button below.\n"},"add_email":{"title":"Add Email"},"change_email":{"success_via_admin":"We've sent an email to that address. The user will need to follow the confirmation instructions in the email."},"change_avatar":{"logo_small":"Site's small logo. Used by default."},"email":{"unconfirmed_label":"unconfirmed","resend_label":"resend confirmation email","resending_label":"sending...","resent_label":"email sent","set_primary":"Set Primary Email","destroy":"Remove Email","add_email":"Add Alternate Email","auth_override_instructions":"Email can be updated from authentication provider.","admin_note":"Note: An admin user changing another non-admin user's email indicates the user has lost access to their original email account, so a reset password email will be sent to their new address. The user's email will not change until they complete the reset password process.","required":"Please enter an email address","invite_auth_email_invalid":"Your invitation email does not match the email authenticated by %{provider}","authenticated_by_invite":"Your email has been authenticated by the invitation"},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}},"name":{"required":"Please enter a name"},"username":{"required":"Please enter a username","edit":"Edit username"},"auth_tokens":{"device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eactive now\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"text_size":{"smallest":"Smallest"},"invited":{"expired_tab":"Expired","expired_tab_with_count":"Expired (%{count})","invited_via_link":"link %{key} (%{count} / %{max} redeemed)","sent":"Created/Last Sent","expires_at":"Expires","copy_link":"Get Link","reinvite":"Resend Email","removed":"Removed","remove_all":"Remove Expired Invites","reinvite_all":"Resend All Invites","reinvited_all":"All Invites Sent!","generate_link":"Create Invite Link","link_generated":"Here's your invite link!","single_user":"Invite by email","multiple_user":"Invite by link","invite_link":{"title":"Invite Link","error":"There was an error generating Invite link","max_redemptions_allowed_label":"How many people are allowed to register using this link?","expires_at":"When will this invite link expire?"},"invite":{"new_title":"Create Invite","edit_title":"Edit Invite","instructions":"Share this link to instantly grant access to this site","copy_link":"copy link","expires_in_time":"Expires in %{time}","expired_at_time":"Expired at %{time}","show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options","restrict_email":"Restrict to one email address","max_redemptions_allowed":"Max uses","add_to_groups":"Add to groups","invite_to_topic":"Arrive at this topic","expires_at":"Expire after","custom_message":"Optional personal message","send_invite_email":"Save and Send Email","save_invite":"Save Invite","invite_saved":"Invite saved.","invite_copied":"Invite link copied."},"bulk_invite":{"none":"No invitations to display on this page.","text":"Bulk Invite","instructions":"\u003cp\u003eInvite a list of users to get your community going quickly. Prepare a \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV file\u003c/a\u003e containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEvery email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.\u003c/p\u003e\n","progress":"Uploaded %{progress}%...","success":"File uploaded successfully. You will be notified via message when the process is complete."}},"password":{"required":"Please enter a password"},"avatar":{"name_and_description":"%{name} - %{description}","edit":"Edit Profile Picture"},"title":{"instructions":"appears after your username"},"flair":{"title":"Flair","instructions":"icon displayed next to your profile picture"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"assets_changed_confirm":"This site just received a software upgrade. Get the latest version now?","logs_error_rate_notice":{},"signup_cta":{"hidden_for_session":"OK, we'll ask you tomorrow. You can always use 'Log In' to create an account, too."},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply.","other":"There are \u003cb\u003e%{count}\u003c/b\u003e replies."},"short_label":"Summarize","short_title":"Show a summary of this topic: the most interesting posts as determined by the community"},"private_message_info":{"remove":"Remove..."},"create_account":{"subheader_title":"Let's create your account","title":"Create your account","associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"email_login":{"login_link":"Skip the password; email me a login link"},"login":{"header_title":"Welcome back","subheader_title":"Log in to your account","title":"Log in","second_factor_title":"Two-Factor Authentication","second_factor_backup_title":"Two-Factor Backup","security_key_description":"When you have your physical security key prepared press the Authenticate with Security Key button below.","email_placeholder":"Email / Username","not_allowed_from_ip_address":"You can't log in from that IP address.","omniauth_disallow_totp":"Your account has two-factor authentication enabled. Please log in with your password.","google_oauth2":{"sr_title":"Login with Google"},"twitter":{"sr_title":"Login with Twitter"},"instagram":{"sr_title":"Login with Instagram"},"facebook":{"sr_title":"Login with Facebook"},"github":{"sr_title":"Login with GitHub"},"discord":{"sr_title":"Login with Discord"}},"category_row":{"topic_count":{"one":"%{count} topic in this category","other":"%{count} topics in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory","other":"%{name} and %{count} subcategories"},"plus_subcategories":{"one":"+ %{count} subcategory","other":"+ %{count} subcategories"}},"select_kit":{"filter_by":"Filter by: %{name}","select_to_filter":"Select a value to filter","results_count":{"one":"%{count} result","other":"%{count} results"},"invalid_selection_length":{"one":"Selection must be at least %{count} character.","other":"Selection must be at least %{count} characters."},"components":{"tag_drop":{"filter_for_more":"Filter for more..."},"categories_admin_dropdown":{"title":"Manage categories"}}},"shared_drafts":{"notice":"This topic is only visible to those who can publish shared drafts."},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"error":{"title_too_short":{"one":"Title must be at least %{count} character","other":"Title must be at least %{count} characters"},"title_too_long":{"one":"Title can't be more than %{count} character","other":"Title can't be more than %{count} characters"},"post_length":{"one":"Post must be at least %{count} character","other":"Post must be at least %{count} characters"},"tags_missing":{"one":"You must choose at least %{count} tag","other":"You must choose at least %{count} tags"}},"title":"Or press %{modifier}Enter","show_preview":"show preview","hide_preview":"hide preview","show_toolbar":"show composer toolbar","hide_toolbar":"hide composer toolbar","slow_mode":{"error":"This topic is in slow mode. You already posted recently; you can post again in %{timeLeft}."},"composer_actions":{"reply_to_post":{"label":"Reply to a post by %{postUsername}"},"reply_as_new_group_message":{"label":"Reply as new group message","desc":"Create new message starting with same recipients"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"}},"reload":"Reload"},"notifications":{"tooltip":{"high_priority":{"one":"%{count} unread high priority notification","other":"%{count} unread high priority notifications"}},"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"},"votes_released":"%{description} - completed","titles":{"reaction":"new reaction","votes_released":"Vote was released"}},"upload_selector":{"processing":"Processing Upload"},"search":{"open_advanced":"Open advanced search","clear_search":"Clear search","sort_or_bulk_actions":"Sort or bulk select results","search_term_label":"enter search keyword","in":"in","in_this_topic":"in this topic","in_this_topic_tooltip":"switch to searching all topics","in_topics_posts":"in all topics and posts","enter_hint":"or press Enter","in_posts_by":"in posts by %{username}","type":{"default":"Topics/posts","categories_and_tags":"Categories/tags"},"tips":{"category_tag":"filters by category or tag","author":"filters by post author","in":"filters by metadata (e.g. in:title, in:personal, in:pinned)","status":"filters by topic status","full_search":"launches full page search","full_search_key":"%{modifier} + Enter"},"advanced":{"title":"Advanced filters","posted_by":{"aria_label":"Filter by post author"},"with_tags":{"aria_label":"Filter using tags"},"post":{"min":{"placeholder":"minimum","aria_label":"filter by minimum number of posts"},"max":{"placeholder":"maximum","aria_label":"filter by maximum number of posts"},"time":{"aria_label":"Filter by posted date"}},"min_views":{"placeholder":"minimum","aria_label":"filter by minimum views"},"max_views":{"placeholder":"maximum","aria_label":"filter by maximum views"},"additional_options":{"label":"Filter by post count and topic views"}}},"hamburger_menu":"menu","view_all":"view all %{tab}","topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread","other":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…","other":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})","other":"Dismiss New (%{count})"},"change_category":"Set Category...","notification_level":"Notifications...","change_notification_level":"Change Notification Level","remove_tags":"Remove All Tags","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from \u003cb\u003e%{count}\u003c/b\u003e topics. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic","other":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topics"}},"none":{"unseen":"You have no unseen topics.","latest":"You're all caught up!","educate":{"new":"\u003cp\u003eYour new topics will appear here. By default, topics are considered new and will show a \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicator if they were created in the last 2 days.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e","unread":"\u003cp\u003eYour unread topics appear here.\u003c/p\u003e\u003cp\u003eBy default, topics are considered unread and will show unread counts \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e if you:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreated the topic\u003c/li\u003e\u003cli\u003eReplied to the topic\u003c/li\u003e\u003cli\u003eRead the topic for more than 4 minutes\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOr if you have explicitly set the topic to Tracked or Watched via the 🔔 in each topic.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"collapse_details":"collapse topic details","expand_details":"expand topic details","browse_all_tags":"Browse all tags","suggest_create_topic":"Ready to \u003ca href\u003estart a new conversation?\u003c/a\u003e","slow_mode_update":{"title":"Slow Mode","select":"Users may only post in this topic once every:","description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","update":"Update","enabled_until":"Enabled until:","hours":"Hours:","minutes":"Minutes:","seconds":"Seconds:","durations":{"10_minutes":"10 Minutes","15_minutes":"15 Minutes","30_minutes":"30 Minutes","45_minutes":"45 Minutes","1_hour":"1 Hour","2_hours":"2 Hours","4_hours":"4 Hours","8_hours":"8 Hours","12_hours":"12 Hours","24_hours":"24 Hours","custom":"Custom Duration"}},"slow_mode_notice":{"duration":"Please wait %{duration} between posts in this topic"},"topic_status_update":{"min_duration":"Duration must be greater than 0","max_duration":"Duration must be less than 20 years","duration":"Duration"},"auto_update_input":{"now":"Now","two_weeks":"Two weeks","two_months":"Two months","three_months":"Three months","four_months":"Four months","six_months":"Six months","one_year":"One year"},"auto_reopen":{"title":"Auto-Open Topic"},"auto_close":{"label":"Auto-close topic after:"},"auto_close_after_last_post":{"title":"Auto-Close Topic After Last Post"},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily.","other":"The last post in the topic is already %{count} hours old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"}},"notifications":{"reasons":{"3_10_stale":"You will receive notifications because you were watching a tag on this topic in the past.","3_6_stale":"You will receive notifications because you were watching this category in the past.","2_8_stale":"You will see a count of new replies because you were tracking this category in the past."}},"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."},"feature":{"make_banner":"Make Banner Topic"},"share":{"instructions":"Share a link to this topic:","copied":"Topic link copied.","notify_users":{"title":"Notify","instructions":"Notify the following users about this topic:","success":{"one":"Successfully notified %{username} about this topic.","other":"Successfully notified all users about this topic."}}},"feature_topic":{"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"}},"invite_private":{"not_allowed":"Sorry, that user can't be invited."},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link."},"publish_page":{"slug":"Slug","public_description":"People can see the page even if the associated topic is private."},"change_owner":{"instructions_without_old_user":{"one":"Please choose a new owner for the post","other":"Please choose a new owner for the %{count} posts"}},"deleted_by_author_simple":"(topic deleted by author)"},"post":{"quote_reply_shortcut":"Or press q","quote_edit_shortcut":"Or press e","wiki_last_edited_on":"wiki last edited on %{dateTime}","last_edited_on":"post last edited on %{dateTime}","deleted_by_author_simple":"(post deleted by author)","has_replies_count":"%{count}","unknown_user":"(unknown/deleted user)","filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","view_all_posts":"View all posts","errors":{"file_too_large_humanized":"Sorry, that file is too big (maximum size is %{max_size}). Why not upload your large file to a cloud sharing service, then paste the link?","too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."}},"cancel_composer":{"confirm":"What would you like to do with your post?","save_draft":"Save draft for later","keep_editing":"Keep editing"},"controls":{"permanently_delete":"Permanently Delete","permanently_delete_confirmation":"Are you sure you permanently want to delete this post? You will not be able to recover it.","change_owner":"Change Ownership...","grant_badge":"Grant Badge...","delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","other":"This topic currently has over %{count} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic","add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice...","delete_post_notice":"Delete Staff Notice","edit_timer":"edit timer"},"actions":{"people":{"read":{"one":"read this","other":"read this"},"read_capped":{"one":"and %{count} other read this","other":"and %{count} others read this"}}},"revisions":{"controls":{"revert":"Revert to revision %{revision}"}},"bookmarks":{"create_for_topic":"Create bookmark for topic","edit_for_topic":"Edit bookmark for topic","actions":{"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}},"filtered_replies":{"viewing_posts_by":"Viewing %{post_count} posts by","viewing_subset":"Some replies are collapsed","viewing_summary":"Viewing a summary of this topic","post_number":"%{username}, post #%{post_number}","show_all":"Show all"}},"category":{"back":"Back to category","manage_tag_groups_link":"Manage tag groups","security_add_group":"Add a group","permissions":{"no_groups_selected":"No groups have been granted access; this category will only be visible to staff.","everyone_has_access":"This category is public, everyone can see, reply and create posts. To restrict permissions, remove one or more of the permissions granted to the \"everyone\" group.","toggle_reply":"Toggle Reply permission","toggle_full":"Toggle Create permission","inherited":"This permission is inherited from \"everyone\""},"allow_unlimited_owner_edits_on_first_post":"Allow unlimited owner edits on first post","default_list_filter":"Default List Filter:","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","default_slow_mode":"Enable \"Slow Mode\" for new topics in this category.","notifications":{"title":"change notification level for this category","watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"list_filters":{"all":"all topics","none":"no subcategories"},"colors_disabled":"You can’t select colors because you have a category style of none.","topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"flagging":{"take_action":"Take Action...","take_action_options":{"suspend":{"details":"Reach the flag threshold, and suspend the user"},"silence":{"details":"Reach the flag threshold, and silence the user"}},"flag_for_review":"Queue For Review"},"history_capped_revisions":"History, last 100 revisions","history":"History","filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"}},"browser_update":"Unfortunately, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eyour browser is too old to work on this site\u003c/a\u003e. Please \u003ca href=\"https://browsehappy.com\"\u003eupgrade your browser\u003c/a\u003e to view rich content, log in and reply.","cannot_render_video":"This video cannot be rendered because your browser does not support the codec.","keyboard_shortcuts_help":{"jump_to":{"next":"%{shortcut} Next Topic","previous":"%{shortcut} Previous Topic"},"application":{"dismiss_new":"%{shortcut} Dismiss New"}},"badges":{"favorite_max_reached":"You can’t favorite more badges.","favorite_max_not_reached":"Mark this badge as favorite","favorite_count":"%{count}/%{max} badges marked as favorite"},"download_calendar":{"title":"Download calendar","save_ics":"Download .ics file","save_google":"Add to Google calendar","remember":"Don’t ask me again","remember_explanation":"(you can change this preference in your user prefs)","default_calendar":"Default calendar","default_calendar_instruction":"Determine which calendar should be used when dates are saved","add_to_calendar":"Add to calendar","google":"Google Calendar","ics":"ICS"},"tagging":{"default_info":"This tag isn't restricted to any categories, and has no synonyms. To add restrictions, put this tag in a \u003ca href=%{basePath}/tag_groups\u003etag group\u003c/a\u003e.","category_restrictions":{"one":"It can only be used in this category:","other":"It can only be used in these categories:"},"add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?","other":"Any place that currently uses these tags will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"delete_confirm_synonyms":{"one":"Its synonym will also be deleted.","other":"Its %{count} synonyms will also be deleted."},"delete_no_unused_tags":"There are no unused tags.","tag_list_joiner":", ","groups":{"about_heading":"Select a tag group or create a new one","about_heading_empty":"Create a new tag group to get started","about_description":"Tag groups help you manage permissions for many tags in one place.","new_title":"Create New Group","edit_title":"Edit Tag Group","tags_label":"Tags in this group","parent_tag_label":"Parent tag","parent_tag_description":"Tags from this group can only be used if the parent tag is present.","usable_only_by_groups":"Tags are visible to everyone, but only the following groups can use them","visible_only_to_groups":"Tags are visible only to the following groups","cannot_save":"Cannot save tag group. Make sure that there is at least one tag present, tag group name is not empty, and a group is selected for tags permission.","tags_placeholder":"Search or create tags","parent_tag_placeholder":"Optional","select_groups_placeholder":"Select groups...","disabled":"Tagging is disabled. "},"topics":{"none":{"unseen":"You have no unseen topics."}}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"forced_anonymous_login_required":"The site is under extreme load and cannot be loaded at this time, try again in a few minutes.","image_removed":"(image removed)","do_not_disturb":{"title":"Do not disturb for...","label":"Do not disturb","options":{"half_hour":"30 minutes","one_hour":"1 hour","two_hours":"2 hours","tomorrow":"Until tomorrow"},"set_schedule":"Set a notification schedule"},"trust_levels":{"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"You have picked an unsupported file. Supported file types – %{types}."},"user_activity":{"no_activity_title":"No activity yet","no_activity_body":"Welcome to our community! You are brand new here and have not yet contributed to discussions. As a first step, visit \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e and just start reading! Select %{heartIcon} on posts that you like or want to learn more about. If you have not already done so, help others get to know you by adding a picture and bio in your \u003ca href='%{preferencesUrl}'\u003euser preferences\u003c/a\u003e.","no_replies_title":"You have not replied to any topics yet","no_drafts_title":"You haven’t started any drafts","no_drafts_body":"Not quite ready to post? We’ll automatically save a new draft and list it here whenever you start composing a topic, reply, or personal message. Select the cancel button to discard or save your draft to continue later.","no_likes_title":"You haven’t liked any topics yet","no_likes_body":"A great way to jump in and start contributing is to start reading conversations that have already taken place, and select the %{heartIcon} on posts that you like!","no_topics_title":"You have not started any topics yet","no_read_topics_title":"You haven’t read any topics yet","no_read_topics_body":"Once you start reading discussions, you’ll see a list here. To start reading, look for topics that interest you in \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e or search by keyword %{searchIcon}"},"no_group_messages_title":"No group messages found","fullscreen_table":{"expand_btn":"Expand Table"},"cakeday":{"none":" "},"discourse_local_dates":{"relative_dates":{"countdown":{"passed":"date has passed"}},"title":"Insert date / time","create":{"form":{"format_description":"Format used to display the date to the user. Use Z to show the offset and zz for the timezone name.","until":"Until...","recurring":{"every_day":"Every day","every_week":"Every week","every_two_weeks":"Every two weeks","every_month":"Every month","every_two_months":"Every two months","every_three_months":"Every three months","every_six_months":"Every six months","every_year":"Every year"}}},"default_title":"%{site_name} Event"},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"poll":{"results":{"groups":{"title":"You need to be a member of %{groups} to vote in this poll."},"staff":{"title":"Results are only shown to \u003cstrong\u003estaff\u003c/strong\u003e members."}},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option.","other":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e options."},"between_min_and_max_options":"Choose between \u003cstrong\u003e%{min}\u003c/strong\u003e and \u003cstrong\u003e%{max}\u003c/strong\u003e options."}},"remove-vote":{"title":"Remove your vote","label":"Remove vote"},"hide-results":{"label":"Show vote"},"group-results":{"title":"Group votes by user field","label":"Show breakdown"},"export-results":{"title":"Export the poll results"},"breakdown":{"title":"Poll results","votes":"%{count} votes","breakdown":"Breakdown","percentage":"Percentage"},"error_while_exporting_results":"Sorry, there was an error exporting poll results.","ui_builder":{"help":{"options_min_count":"Enter at least 1 option.","options_max_count":"Enter at most %{count} options.","invalid_min_value":"Minimum value must be at least 1.","invalid_max_value":"Maximum value must be at least 1, but less than or equal with the number of options."},"poll_result":{"label":"Show Results...","vote":"Only after voting","closed":"When the poll is closed","staff":"Staff only"},"poll_groups":{"label":"Limit voting to these groups"},"poll_chart_type":{"label":"Result chart","bar":"Bar","pie":"Pie"},"poll_config":{"max":"Max Choices","min":"Min Choices"},"poll_title":{"label":"Title (optional)"},"poll_options":{"label":"Options (one per line)","add":"Add option"},"show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options"}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Date/Time inputs"},"font_scale":{"title":"Font System"},"icons":{"full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation_bar":{"title":"Navigation Bar"},"navigation_stacked":{"title":"Navigation Stacked"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_statuses":{"title":"Topic Statuses"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"post_menu":{"title":"Post Menu"},"modal":{"title":"Modal","header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}}}}};
I18n.locale = 'hy';
I18n.pluralizationRules.hy = MessageFormat.locale.hy;
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
//! locale : Armenian [hy-am]
//! author : Armendarabyan : https://github.com/armendarabyan

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var hyAm = moment.defineLocale('hy-am', {
        months: {
            format: 'հունվարի_փետրվարի_մարտի_ապրիլի_մայիսի_հունիսի_հուլիսի_օգոստոսի_սեպտեմբերի_հոկտեմբերի_նոյեմբերի_դեկտեմբերի'.split(
                '_'
            ),
            standalone: 'հունվար_փետրվար_մարտ_ապրիլ_մայիս_հունիս_հուլիս_օգոստոս_սեպտեմբեր_հոկտեմբեր_նոյեմբեր_դեկտեմբեր'.split(
                '_'
            ),
        },
        monthsShort: 'հնվ_փտր_մրտ_ապր_մյս_հնս_հլս_օգս_սպտ_հկտ_նմբ_դկտ'.split('_'),
        weekdays: 'կիրակի_երկուշաբթի_երեքշաբթի_չորեքշաբթի_հինգշաբթի_ուրբաթ_շաբաթ'.split(
            '_'
        ),
        weekdaysShort: 'կրկ_երկ_երք_չրք_հնգ_ուրբ_շբթ'.split('_'),
        weekdaysMin: 'կրկ_երկ_երք_չրք_հնգ_ուրբ_շբթ'.split('_'),
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD.MM.YYYY',
            LL: 'D MMMM YYYY թ.',
            LLL: 'D MMMM YYYY թ., HH:mm',
            LLLL: 'dddd, D MMMM YYYY թ., HH:mm',
        },
        calendar: {
            sameDay: '[այսօր] LT',
            nextDay: '[վաղը] LT',
            lastDay: '[երեկ] LT',
            nextWeek: function () {
                return 'dddd [օրը ժամը] LT';
            },
            lastWeek: function () {
                return '[անցած] dddd [օրը ժամը] LT';
            },
            sameElse: 'L',
        },
        relativeTime: {
            future: '%s հետո',
            past: '%s առաջ',
            s: 'մի քանի վայրկյան',
            ss: '%d վայրկյան',
            m: 'րոպե',
            mm: '%d րոպե',
            h: 'ժամ',
            hh: '%d ժամ',
            d: 'օր',
            dd: '%d օր',
            M: 'ամիս',
            MM: '%d ամիս',
            y: 'տարի',
            yy: '%d տարի',
        },
        meridiemParse: /գիշերվա|առավոտվա|ցերեկվա|երեկոյան/,
        isPM: function (input) {
            return /^(ցերեկվա|երեկոյան)$/.test(input);
        },
        meridiem: function (hour) {
            if (hour < 4) {
                return 'գիշերվա';
            } else if (hour < 12) {
                return 'առավոտվա';
            } else if (hour < 17) {
                return 'ցերեկվա';
            } else {
                return 'երեկոյան';
            }
        },
        dayOfMonthOrdinalParse: /\d{1,2}|\d{1,2}-(ին|րդ)/,
        ordinal: function (number, period) {
            switch (period) {
                case 'DDD':
                case 'w':
                case 'W':
                case 'DDDo':
                    if (number === 1) {
                        return number + '-ին';
                    }
                    return number + '-րդ';
                default:
                    return number;
            }
        },
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 7, // The week that contains Jan 7th is the first week of the year.
        },
    });

    return hyAm;

})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

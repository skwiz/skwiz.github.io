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
I18n._compiledMFs = {"topic.read_more_MF" : function(d){
var r = "";
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
r += "Existe <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>1 não lido </a> ";
return r;
},
"other" : function(d){
var r = "";
r += "Existem <a href='";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["basePath"];
r += "/unread'>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " não lidos</a> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "e ";
return r;
},
"false" : function(d){
var r = "";
r += "existe ";
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
r += "/new'>1 novo</a> tópico";
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
r += "e ";
return r;
},
"false" : function(d){
var r = "";
r += "existem ";
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
})() + " novos</a> tópicos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " restantes, ou ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "navegue por outros tópicos em ";
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["pt"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.pt = function ( n ) {
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

I18n.translations = {"pt":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"one":"Byte","other":"Bytes"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"hh:mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"DD MMM","full_no_year_no_time":"Do MMMM","long_with_year":"DD MMM YYYY hh:mm","long_with_year_no_time":"DD MMM YYYY","full_with_year_no_time":"Do MMMM, YYYY","long_date_with_year":"DD MMM, 'YY LT","long_date_without_year":"DD MMM, LT","long_date_with_year_without_time":"DD MMM, 'YY","long_date_without_year_with_linebreak":"DD MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"DD MMM, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} atrás","tiny":{"half_a_minute":"\u003c 1m","less_than_x_seconds":{"one":"\u003c %{count}s","other":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s","other":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m","other":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m","other":"%{count}m"},"about_x_hours":{"one":"%{count}h","other":"%{count}h"},"x_days":{"one":"%{count}d","other":"%{count}d"},"x_months":{"one":"%{count} mês","other":"%{count}meses"},"about_x_years":{"one":"%{count}a","other":"%{count}a"},"over_x_years":{"one":"\u003e %{count}a","other":"\u003e %{count}a"},"almost_x_years":{"one":"%{count}a","other":"%{count}a"},"date_month":"DD MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} minuto","other":"%{count} minutos"},"x_hours":{"one":"%{count} hora","other":"%{count} horas"},"x_days":{"one":"%{count} dia","other":"%{count} dias"},"date_year":"DD MMM, 'YY"},"medium_with_ago":{"x_minutes":{"one":"%{count} minuto atrás","other":"%{count} minutos atrás"},"x_hours":{"one":"%{count} hora atrás","other":"%{count} horas atrás"},"x_days":{"one":"%{count} dia atrás","other":"%{count} dias atrás"},"x_months":{"one":"%{count} mês atrás","other":"%{count} meses atrás"},"x_years":{"one":"%{count} ano atrás","other":"%{count} anos atrás"}},"later":{"x_days":{"one":"%{count} dia mais tarde","other":"%{count} dias mais tarde"},"x_months":{"one":"%{count} mês mais tarde","other":"%{count} meses mais tarde"},"x_years":{"one":"%{count} ano mais tarde","other":"%{count} anos mais tarde"}},"previous_month":"Mês Anterior","next_month":"Próximo Mês","placeholder":"data"},"share":{"topic_html":"Tópico: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"publicação #%{postNumber}","close":"fechar","twitter":"Partilhar no Twitter","facebook":"Partilhar no Facebook","email":"Enviar por e-mail","url":"Copiar e partilhar URL"},"action_codes":{"public_topic":"tornei este tópico publico %{when}","private_topic":"tornou este tópico numa mensagem privada %{when}","split_topic":"dividir este tópico %{when}","invited_user":"convidou %{who} %{when}","invited_group":"convidou %{who} %{when}","user_left":"%{who} removeram-se desta mensagem %{when}","removed_user":"removeu %{who} %{when}","removed_group":"removeu %{who} %{when}","autobumped":"automaticamente colidido %{when}","autoclosed":{"enabled":"fechado %{when}","disabled":"aberto %{when}"},"closed":{"enabled":"fechado %{when}","disabled":"aberto %{when}"},"archived":{"enabled":"arquivado %{when}","disabled":"removido do arquivo %{when}"},"pinned":{"enabled":"afixado %{when}","disabled":"desafixado %{when}"},"pinned_globally":{"enabled":"afixado globalmente %{when}","disabled":"desafixado %{when}"},"visible":{"enabled":"listado %{when}","disabled":"removido da lista %{when}"},"banner":{"enabled":"tornou isto numa faixa %{when}. Esta irá aparecer no topo de cada página até que seja rejeitada pelo utilizador.","disabled":"removeu esta faixa %{when}. Esta não irá aparecer no topo de cada página."},"forwarded":"encaminhou o e-mail acima"},"topic_admin_menu":"ações do tópico","wizard_required":"Bem-vindo ao seu novo Discourse! Vamos começar com \u003ca href='%{url}' data-auto-route='true'\u003eo assistente de configuração\u003c/a\u003e ✨","emails_are_disabled":"Todos os envios de e-mail foram globalmente desativados por um administrador. Nenhum e-mail de notificação será enviado.","software_update_prompt":{"message":"Atualizámos este site, \u003cspan\u003epor favor recarregue a página\u003c/span\u003e ou poderá experienciar um comportamento inesperado.","dismiss":"Marcar como visto"},"bootstrap_mode_enabled":{"one":"Para que o início do teu Site seja o mais simples possível, estás agora em modo de inicialização simples. A todos os novos utilizadores será concedido o Nível de Confiança 1 e o resumo por e-mail enviado diariamente estará ativado. Isto será automaticamente desligado quando %{count} utilizador se tiver juntado ao fórum.","other":"Para que o início do teu Site seja o mais simples possível, estás agora em modo de inicialização simples. A todos os novos utilizadores será concedido o Nível de Confiança 1 e o resumo por e-mail enviado diariamente estará ativado. Isto será automaticamente desligado quando %{count} utilizadores se tiverem juntado ao fórum."},"bootstrap_mode_disabled":"O modo de inicialização simples será desactivado em 24 horas.","themes":{"default_description":"Predefinição","broken_theme_alert":"O seu site pode não funcionar porque o tema / componente %{theme} contém erros. Desative-o em %{path}."},"s3":{"regions":{"ap_northeast_1":"Ásia-Pacífico (Tóquio)","ap_northeast_2":"Ásia-Pacífico (Seoul)","ap_east_1":"Ásia-Pacífico (Hong Kong)","ap_south_1":"Ásia Pacifico (Bombaim)","ap_southeast_1":"Ásia-Pacífico (Singapura)","ap_southeast_2":"Ásia-Pacífico (Sydney)","ca_central_1":"Canadá (Central)","cn_north_1":"China (Beijing)","cn_northwest_1":"China (Ningxia)","eu_central_1":"U.E. (Francoforte)","eu_north_1":"UE (Estocolmo)","eu_west_1":"U.E. (Irlanda)","eu_west_2":"UE (Londres)","eu_west_3":"UE (Paris)","sa_east_1":"América do Sul (São Paulo)","us_east_1":"Este dos E.U.A. (Virgínia do Norte)","us_east_2":"Este dos E.U.A. (Ohio)","us_gov_east_1":"AWS GovCloud (EUA-Este)","us_gov_west_1":"AWS GovCloud (Oeste dos EUA)","us_west_1":"Oeste dos E.U.A. (California do Norte)","us_west_2":"Oeste dos E.U.A. (Óregon)"}},"clear_input":"Limpar entrada","edit":"editar o título e a categoria deste tópico","expand":"Expandir","not_implemented":"Essa funcionalidade ainda não foi implementada, pedimos desculpa!","no_value":"Não","yes_value":"Sim","submit":"Submeter","generic_error":"Pedimos desculpa, ocorreu um erro.","generic_error_with_reason":"Ocorreu um erro: %{error}","sign_up":"Inscrever-se","log_in":"Entrar","age":"Idade","joined":"Juntou-se","admin_title":"Administração","show_more":"mostrar mais","show_help":"opções","links":"Hiperligações","links_lowercase":{"one":"ligação","other":"hiperligações"},"faq":"FAQ","guidelines":"Orientações","privacy_policy":"Política de Privacidade","privacy":"Privacidade","tos":"Termos de Serviço","rules":"Regras","conduct":"Código de Conduta","mobile_view":"Visualização Mobile","desktop_view":"Visualização Desktop","or":"ou","now":"ainda agora","read_more":"ler mais","more":"Mais","x_more":{"one":"%{count} Mais","other":"%{count} Mais"},"never":"nunca","every_30_minutes":"a cada 30 minutos","every_hour":"a cada hora","daily":"diário","weekly":"semanal","every_month":"cada mês","every_six_months":"a cada seis meses","max_of_count":"máximo de %{count}","character_count":{"one":"%{count} caracter","other":"%{count} caracteres"},"related_messages":{"title":"Mensagens Relacionadas","see_all":"Ver \u003ca href=\"%{path}\"\u003etodas as mensagens\u003c/a\u003e de @%{username}..."},"suggested_topics":{"title":"Tópicos Sugeridos","pm_title":"Mensagens Sugeridas"},"about":{"simple_title":"Acerca","title":"Acerca de %{title}","stats":"Estatísticas do sítio","our_admins":"Os Nossos Administradores","our_moderators":"Os Nossos Moderadores","moderators":"Moderadores","stat":{"all_time":"Sempre","last_day":"Últimas 24 horas","last_7_days":"Últimos 7 Dias","last_30_days":"Últimos 30 Dias"},"like_count":"Gostos","topic_count":"Tópicos","post_count":"Publicações","user_count":"Utilizadores","active_user_count":"Utilizadores Activos","contact":"Contacte-nos","contact_info":"No caso de um problema crítico ou de algum assunto urgente que afecte este sítio, por favor contacte-nos em %{contact_info}."},"bookmarked":{"title":"Adicionar Marcador","edit_bookmark":"Editar Favorito","clear_bookmarks":"Remover Marcadores","help":{"bookmark":"Clique para adicionar um marcador à primeira publicação neste tópico","edit_bookmark":"Clique para editar o favorito neste tópico","unbookmark":"Clique para remover todos os marcadores deste tópico","unbookmark_with_reminder":"Clique para remover todos os favoritos e lembretes neste tópico."}},"bookmarks":{"created":"Adicionou este post aos favoritos. %{name}","not_bookmarked":"adicionar esta mensagem aos marcadores","created_with_reminder":"Você marcou este post com um lembrete %{date}. %{name}","remove":"Remover Marcador","delete":"Remover Marcador","confirm_delete":"Tem certeza de que deseja remover este marcador? O lembrete também será excluído.","confirm_clear":"De certeza que pretende remover todos os marcadores deste tópico?","save":"Guardar","no_timezone":"Você ainda não definiu um fuso horário. Você não poderá definir lembretes. Configure um \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eno seu perfil\u003c/a\u003e.","invalid_custom_datetime":"A data e a hora fornecidas são inválidas, tente novamente.","list_permission_denied":"Você não tem permissão para ver os favoritos deste utilizador.","no_user_bookmarks":"Você não tem posts marcados; os favoritos permitem-lhe consultar rapidamente posts específicos.","auto_delete_preference":{"label":"Remover automaticamente","never":"Nunca","when_reminder_sent":"Assim que o lembrete for enviado","on_owner_reply":"Depois de responder a este tópico"},"search_placeholder":"Pesquise favoritos por nome, título do tópico ou conteúdo do post","search":"Pesquisar","reminders":{"today_with_time":"hoje às %{time}","tomorrow_with_time":"amanhã às %{time}","at_time":"às %{date_time}","existing_reminder":"Você tem um lembrete definido para este favorito que será enviado %{at_date_time}"}},"copy_codeblock":{"copied":"copiado!"},"drafts":{"label":"Rascunhos","resume":"Continuar","remove":"Remover","remove_confirmation":"Tem a certeza que pretende eliminar este rascunho?","new_topic":"Novo rascunho de tópico","topic_reply":"Rascunho da resposta","abandon":{"confirm":"Tem um rascunho em andamento neste tópico. O que gostaria de fazer com ele?","yes_value":"Descartar","no_value":"Retomar a edição"}},"topic_count_latest":{"one":"Ver %{count} tópico novo ou atualizado","other":"Ver %{count} tópicos novos ou atualizados"},"topic_count_unseen":{"one":"Ver %{count} tópico novo ou atualizado","other":"Ver %{count} tópicos novos ou atualizados"},"topic_count_unread":{"one":"Ver %{count} tópico não lido","other":"Ver %{count} tópicos não lidos"},"topic_count_new":{"one":"Ver %{count} tópico novo","other":"Ver %{count} tópicos novos"},"preview":"pré-visualizar","cancel":"cancelar","deleting":"Apagando...","save":"Guardar alterações","saving":"A guardar...","saved":"Guardado!","upload":"Carregar","uploading":"A carregar…","uploading_filename":"A enviar: %{filename}...","processing_filename":"A processar: %{filename}...","clipboard":"área de transferência","uploaded":"Carregado!","pasting":"Colando...","enable":"Ativar ","disable":"Desativar","continue":"Continuar","undo":"Desfazer","revert":"Reverter","failed":"Falhou","switch_to_anon":"Entrar em modo Anónimo","switch_from_anon":"Sair de modo Anónimo","banner":{"close":"Marcar esta faixa como vista.","edit":"Editar esta faixa \u003e\u003e"},"pwa":{"install_banner":"Você deseja \u003ca href\u003einstalar o %{title} neste dispositivo?\u003c/a\u003e"},"choose_topic":{"none_found":"Nenhum tópico encontrado.","title":{"search":"Pesquisar por um tópico","placeholder":"digite aqui o título do tópico, url ou id"}},"choose_message":{"none_found":"Nenhuma mensagem encontrada.","title":{"search":"Pesquisar por uma Mensagem","placeholder":"digite aqui o título da mensagem, url ou id"}},"review":{"order_by":"Ordenar por","in_reply_to":"Em resposta a","explain":{"why":"explique por que este item acabou na fila","title":"Pontuação passível de revisão","formula":"Fórmula","subtotal":"Subtotal","total":"Total","min_score_visibility":"Pontuação Mínima para Visibilidade","score_to_hide":"Pontuação para Ocultar Post","take_action_bonus":{"name":"tomou medidas","title":"Quando um membro da equipa decide atuar, a sinalização recebe um bónus."},"user_accuracy_bonus":{"name":"precisão do utilizador","title":"Os utilizadores com um histórico de sinalizações concordantes obtêm um bónus."},"trust_level_bonus":{"name":"nível de confiança","title":"Os itens para revisão criados por utilizadores de nível de confiança superior têm uma pontuação mais elevada."},"type_bonus":{"name":"tipo de bónus","title":"Determinado tipo de revisões podem receber um bónus por parte da equipa para terem uma prioridade mais elevada."}},"claim_help":{"optional":"Pode reivindicar este item para prevenir que outras pessoas o revejam.","required":"Deve reivindicar items antes de as poder rever.","claimed_by_you":"Você reivindicou este item e pode efectuar a sua revisão.","claimed_by_other":"Este item só pode ser revisto por \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"reivindicar este tópico"},"unclaim":{"help":"remover esta reivindicação"},"awaiting_approval":"Aguarda Aprovação","delete":"Eliminar","settings":{"saved":"Guardado","save_changes":"Guardar alterações","title":"Configurações","priorities":{"title":"Prioridades de Revisão"}},"moderation_history":"Histórico de Moderação","view_all":"Ver tudo","grouped_by_topic":"Agrupado por Tópico","none":"Não existem itens para rever.","view_pending":"ver pendentes","topic_has_pending":{"one":"Este tópico tem \u003cb\u003e%{count}\u003c/b\u003e posts com aprovação pendente","other":"Este tópico tem \u003cb\u003e%{count}\u003c/b\u003e posts com aprovação pendente"},"title":"Revisão","topic":"Tópico:","filtered_topic":"Filtrou para conteúdo revisável num único tópico.","filtered_user":"Utilizador","filtered_reviewed_by":"Revisto por","show_all_topics":"mostrar todos os tópicos","deleted_post":"(publicação eliminada)","deleted_user":"(usuário eliminado)","user":{"bio":"Biografia","website":"site","username":"Nome de utilizador","email":"E-mail","name":"Nome","fields":"campos","reject_reason":"Motivo"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (da última sinalização)","other":"%{agreed}, %{disagreed}, %{ignored} (das últimas %{count} sinalizações)"},"agreed":{"one":"%{count}% concorda","other":"%{count}% concordam"},"disagreed":{"one":"%{count}% discorda","other":"%{count}% discordam"},"ignored":{"one":"%{count}% ignora","other":"%{count}% ignoram"}},"topics":{"topic":"Tópico","reviewable_count":"Contagem","reported_by":"Reportado por","deleted":"[Tópico eliminado]","original":"(publicação Original)","details":"detalhes","unique_users":{"one":"%{count} usuário","other":"%{count} usuários"}},"replies":{"one":"%{count} resposta","other":"%{count} respostas"},"edit":"Editar","save":"Guardar","cancel":"Cancelar","new_topic":"A aprovação deste item criará um novo tópico","filters":{"all_categories":"(todas as categorias)","type":{"title":"Tipo","all":"(todos os tipos)"},"minimum_score":"Pontuação Mínima:","refresh":"Atualizar","status":"Estado","category":"Categoria","orders":{"score":"Pontuação","score_asc":"Pontuação (reverso)","created_at":"Criado a","created_at_asc":"Criado em (reverso)"},"priority":{"title":"Prioridade Mínima","any":"(qualquer)","low":"Baixa","medium":"Médio","high":"Elevado"}},"conversation":{"view_full":"ver conversa completa"},"scores":{"about":"Esta pontuação é calculada com base no nível de confiança do utilizador que sinaliza, a precisão das suas anteriores denúncias e a prioridade do item sinalizado.","score":"Pontuação","date":"Data","type":"Tipo","status":"Estado","submitted_by":"Enviado por","reviewed_by":"Revisto por"},"statuses":{"pending":{"title":"Pendente"},"approved":{"title":"Aprovado"},"rejected":{"title":"Rejeitado"},"ignored":{"title":"Ignorados"},"deleted":{"title":"Eliminado"},"reviewed":{"title":"(todos revistos)"},"all":{"title":"(tudo)"}},"types":{"reviewable_flagged_post":{"title":"Publicação Sinalizada","flagged_by":"Sinalizado por"},"reviewable_queued_topic":{"title":"Tópico na fila"},"reviewable_queued_post":{"title":"Post na fila"},"reviewable_user":{"title":"Utilizador"},"reviewable_post":{"title":"Mensagem"}},"approval":{"title":"A Publicação Necessita de Aprovação","description":"Recebemos a sua nova publicação mas necessita de ser aprovada pelo moderador antes de aparecer. Por favor seja paciente.","pending_posts":{"one":"Resta \u003cstrong\u003e%{count}\u003c/strong\u003e post pendente.","other":"Restam \u003cstrong\u003e%{count}\u003c/strong\u003e posts pendentes."},"ok":"CONFIRMAR"},"example_username":"nome de utilizador","reject_reason":{"title":"Por que está a rejeitar este usuário?","send_email":"Enviar e-mail de rejeição"}},"relative_time_picker":{"minutes":{"one":"minuto","other":"minutos"},"hours":{"one":"hora","other":"horas"},"days":{"one":"dia","other":"dias"},"months":{"one":"mês","other":"meses"},"years":{"one":"ano","other":"anos"},"relative":"Relativo"},"time_shortcut":{"later_today":"Hoje, mais tarde","next_business_day":"Próximo dia útil","tomorrow":"Amanhã","post_local_date":"Data no post","later_this_week":"No final desta semana","this_weekend":"Este fim de semana","start_of_next_business_week":"Segunda-feira","start_of_next_business_week_alt":"Próxima Segunda-feira","two_weeks":"Duas semanas","next_month":"Próximo mês","six_months":"Seis meses","custom":"Data e hora personalizadas","relative":"Tempo relativo","none":"Não é necessário","last_custom":"Data e hora do último personalizado"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e publicou \u003ca href='%{topicUrl}'\u003eo tópico\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003e\u003c/a\u003e publicou \u003ca href='%{topicUrl}'\u003eo tópico\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e respondeu a \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eVocê\u003c/a\u003e respondeu a \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e respondeu ao \u003ca href='%{topicUrl}'\u003etópico\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003e\u003c/a\u003e respondeu ao \u003ca href='%{topicUrl}'\u003etópico\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e mencionou \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e\u003ca href='%{user2Url}'\u003e mencionou-o\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003e\u003c/a\u003e mencionou \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Publicado por \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Publicado por \u003ca href='%{userUrl}'\u003esi\u003c/a\u003e","sent_by_user":"Enviado por \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Enviado por \u003ca href='%{userUrl}'\u003esi\u003c/a\u003e"},"directory":{"username":"Nome de Utilizador","filter_name":"filtrar por nome de utilizador","title":"Utilizadores","likes_given":"Dado","likes_received":"Recebido","topics_entered":"Visto","topics_entered_long":"Tópicos Visualizados","time_read":"Tempo Lido","topic_count":"Tópicos","topic_count_long":"Tópicos Criados","post_count":"Respostas","post_count_long":"Respostas Publicadas","no_results":"Não foram encontrados resultados.","days_visited":"Visitas","days_visited_long":"Dias Visitados","posts_read":"Ler","posts_read_long":"Mensagens Lidas","last_updated":"Última Atualização:","total_rows":{"one":"%{count} utilizador","other":"%{count} utilizadores"},"edit_columns":{"title":"Editar Colunas do Diretório","save":"Guardar","reset_to_default":"Restaurar ao padrão"},"group":{"all":"todos os grupos"}},"group_histories":{"actions":{"change_group_setting":"Mudar configuração do grupo","add_user_to_group":"Adicionar utilizador","remove_user_from_group":"Remover utilizador","make_user_group_owner":"Tornar dono","remove_user_as_group_owner":"Remover dono"}},"groups":{"member_added":"Adicionado(a)","member_requested":"Solicitado em","add_members":{"title":"Adicionar Usuários a %{group_name}","description":"Insira uma lista de usuários que deseja convidar para o grupo ou cole em uma lista separada por vírgulas:","usernames_placeholder":"nomes de Utilizador","usernames_or_emails_placeholder":"nomes de utilizador ou e-mails","notify_users":"Notificar utilizadores","set_owner":"Definir usuários como proprietários deste grupo"},"requests":{"title":"Pedidos","reason":"Motivo","accept":"Aceitar","accepted":"aceite","deny":"Rejeitar","denied":"rejeitado","undone":"pedido desfeito","handle":"gerir o pedido de adesão"},"manage":{"title":"Gerir","name":"Nome","full_name":"Nome Completo","add_members":"Adicionar Usuários","invite_members":"Convidar","delete_member_confirm":"Remover '%{username}' do grupo '%{group}'?","profile":{"title":"Perfil"},"interaction":{"title":"Interação","posting":"Contribuição","notification":"Notificação"},"email":{"title":"E-mail","status":"%{old_emails} / %{total_emails} e-mails sincronizados via IMAP.","enable_smtp":"Ativar SMTP","enable_imap":"Ativar IMAP","test_settings":"Testar Configurações","save_settings":"Guardar Configurações","last_updated":"Última atualização:","last_updated_by":"por","settings_required":"Todas as configurações são necessárias, por favor preencha todos os campos antes da validação.","smtp_settings_valid":"Configurações SMTP válidas.","smtp_title":"SMTP","smtp_instructions":"Quando ativar o SMTP para o grupo, todos os e-mails de saída enviados a partir da caixa de entrada do grupo serão enviados através das configurações de SMTP aqui especificadas ao invés do servidor de email configurado para outros e-mails enviados pelo seu fórum.","imap_title":"IMAP","imap_additional_settings":"Configurações Adicionais","imap_instructions":"Quando você ativa o IMAP para o grupo, os e-mails são sincronizados entre a caixa de entrada do grupo e o servidor e caixa de correio IMAP fornecidos. O SMTP tem de ser ativado com credenciais válidas e testadas antes do IMAP poder ser ativado. O nome de usuário e senha do e-mail utilizados para o SMTP serão usados no IMAP. Para obter mais informações, consulte a \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efuncionalidade de anúncio no Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Aviso: Esta é uma funcionalidade em fase alfa. Apenas o Gmail é oficialmente suportado. Use por sua conta e risco!","imap_settings_valid":"Configurações IMAP válidas.","smtp_disable_confirm":"Se desativar o SMTP, todas as configurações de SMTP e IMAP serão restauradas e a funcionalidade associada será desativada. Tem a certeza que deseja continuar?","imap_disable_confirm":"Se desativar o IMAP, todas as configurações de IMAP serão restauradas e a funcionalidade associada será desativada. Tem a certeza que deseja continuar?","imap_mailbox_not_selected":"Tem de selecionar uma caixa de correio para esta configuração IMAP ou nenhuma caixa de correio será sincronizada!","prefill":{"title":"Preencher com configurações para:","gmail":"GMail"},"credentials":{"title":"Credenciais","smtp_server":"Servidor SMTP","smtp_port":"Porta SMTP","smtp_ssl":"Utilizar SSL para SMTP","imap_server":"Servidor IMAP","imap_port":"Porta IMAP","imap_ssl":"Utilizar SSL para IMAP","username":"Nome de utilizador","password":"Palavra-passe"},"settings":{"title":"Configurações","allow_unknown_sender_topic_replies":"Permitir respostas a tópicos por remetentes desconhecidos.","allow_unknown_sender_topic_replies_hint":"Permite que remetentes desconhecidos respondam aos tópicos do grupo. Se não estiver ativado, as respostas de endereços de e-mail ainda não convidados para o tópico criarão um novo tópico."},"mailboxes":{"synchronized":"Caixa de Correio Sincronizada","none_found":"Não foram encontradas caixas de correio nesta conta de e-mail.","disabled":"Desativado"}},"membership":{"title":"Filiação","access":"Acesso"},"categories":{"title":"Categorias","long_title":"Notificações padrão da categoria","description":"Ao serem adicionados utilizadores a este grupo, as suas configurações de notificação da categoria são definidas para esses padrões. Depois, eles podem mudá-los.","watched_categories_instructions":"Vigiar automaticamente todos os novos tópicos nestas categorias. Os membros do grupo serão notificados de todas as novas respostas e tópicos, e uma contagem de novas respostas irá aparecer junto ao tópico.","tracked_categories_instructions":"Seguir automaticamente todos os tópicos nestas categorias. Uma contagem de novas respostas irá aparecer junto ao tópico.","watching_first_post_categories_instructions":"Os utilizadores serão notificados acerca da primeira resposta em cada novo tópico nestas categorias.","regular_categories_instructions":"Se estas categorias estiverem silenciadas, elas serão ativadas para membros do grupo. Os utilizadores serão notificados se forem mencionados ou alguém lhes responder.","muted_categories_instructions":"Não vai ser notificado(a) sobre novos tópicos nestas categorias, e eles não vão aparecer na página dos tópicos recentes nem na página de categorias."},"tags":{"title":"Etiquetas","long_title":"Notificações padrão da categoria","description":"Ao serem adicionados utilizadores a este grupo, as suas configurações de notificação da categoria são definidas para estes padrões. Depois, eles podem mudá-las.","watched_tags_instructions":"Vigiar automaticamente todos os tópicos com estas etiquetas. Os membros do grupo serão notificados de todas as novas respostas e tópicos, e uma contagem de novas respostas irá aparecer junto ao tópico.","tracked_tags_instructions":"Seguir automaticamente todos os tópicos com estas etiquetas. Uma contagem de novas respostas irá aparecer junto ao tópico.","watching_first_post_tags_instructions":"Será notificado acerca da primeira resposta em cada novo tópico nestas categorias.","regular_tags_instructions":"Se estas etiquetas estiverem silenciadas, elas serão ativadas para membros do grupo. Os utilizadores serão notificados se forem mencionados ou alguém lhes responder.","muted_tags_instructions":"Os usuários não serão notificados de nada acerca de novos tópicos com estas etiquetas, nem estes irão aparecer nos recentes."},"logs":{"title":"Registos","when":"Quando","action":"Ação","acting_user":"Utilizador","target_user":"Utilizador alvo","subject":"Assunto","details":"Detalhes","from":"De","to":"Para"}},"permissions":{"title":"Permissões","none":"Não existem categorias associadas a este grupo.","description":"Os membros deste grupo podem ter acesso a estas categorias"},"public_admission":"Permitir entrada livre no grupo (Requer grupo publicamente visível)","public_exit":"Permitir que os utilizadores deixem o grupo livremente","empty":{"posts":"Não existem publicações por membros deste grupo.","members":"Não existem membros neste grupo.","requests":"Não existem pedidos de adesão para este grupo.","mentions":"Não existem menções deste grupo.","messages":"Não existem mensagens para este grupo.","topics":"Não existem tópicos por membros deste grupo.","logs":"Não existem registos para este grupo."},"add":"Adicionar","join":"Entrar","leave":"Sair","request":"Pedir","message":"Mensagem","confirm_leave":"Tem a certeza que pretende sair deste grupo?","allow_membership_requests":"Permitir que os usuários enviem solicitações de adesão aos proprietários do grupo (requer grupo publicamente visível)","membership_request_template":"Template personalizado para mostrar aos utilizadores quando for enviado um pedido de adesão","membership_request":{"submit":"Submeter Pedido","title":"Peça para aderir ao @%{group_name}","reason":"Permita que os donos de grupo saibam porque é que pertence a este grupo"},"membership":"Adesão","name":"Nome","group_name":"Nome do grupo","user_count":"Utilizadores","bio":"Sobre o Grupo","selector_placeholder":"introduzir nome de utilizador","owner":"proprietário","index":{"title":"Grupos","all":"Todos os Grupos","empty":"Não existem grupos visíveis.","filter":"Filtrar por tipo de grupo","owner_groups":"Grupos dos quais sou dono(a)","close_groups":"Grupos Fechados","automatic_groups":"Grupos Automáticos","automatic":"Automático","closed":"Fechado","public":"Público","private":"Privado","public_groups":"Grupos Públicos","my_groups":"Os Meus Grupos","group_type":"Tipo de grupo","is_group_user":"Membro","is_group_owner":"Dono"},"title":{"one":"Grupo","other":"Grupos"},"activity":"Atividade","members":{"title":"Membros","filter_placeholder_admin":"nome de utilizador ou email","filter_placeholder":"nome de utilizador","remove_member":"Remover Membro","remove_member_description":"Remover \u003cb\u003e%{username}\u003c/b\u003e deste grupo","make_owner":"Atribuir Privilégios de Dono","make_owner_description":"Fazer com que \u003cb\u003e%{username}\u003c/b\u003e seja dono(a) deste grupo","remove_owner":"Remover Privilégios de Dono","remove_owner_description":"Remover \u003cb\u003e%{username}\u003c/b\u003e como dono(a) deste grupo","make_primary":"Tornar Principal","make_primary_description":"Tornar este o grupo principal para \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Remover como Principal","remove_primary_description":"Remover este como o grupo principal para \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Remover Membros","remove_members_description":"Remover usuários selecionados deste grupo","make_owners":"Criar Proprietários","make_owners_description":"Tornar os usuários selecionados proprietários deste grupo","remove_owners":"Remover Proprietários","remove_owners_description":"Remover os usuários selecionados de proprietários deste grupo","make_all_primary":"Tornar tudo Principal","make_all_primary_description":"Tornar este o grupo principal para todos os usuários selecionados","remove_all_primary":"Remover como Principal","remove_all_primary_description":"Remover este grupo como principal","owner":"Dono(a)","primary":"Principal","forbidden":"Não tem permissão para visualizar os membros."},"topics":"Tópicos","posts":"Publicações","mentions":"Menções","messages":"Mensagens","notification_level":"Nível de notificação predefinido para mensagens de grupo","alias_levels":{"mentionable":"Quem pode @mencionar este grupo?","messageable":"Quem pode enviar uma mensagem a este grupo?","nobody":"Ninguém","only_admins":"Apenas administradores","mods_and_admins":"Apenas moderadores e Administradores","members_mods_and_admins":"Apenas membros do grupo, moderadores e administradores","owners_mods_and_admins":"Apenas proprietários do grupo, moderadores e administradores","everyone":"Todos"},"notifications":{"watching":{"title":"A vigiar","description":"Será notificado de cada nova publicação em cada mensagem, e uma contagem de novas respostas será exibida."},"watching_first_post":{"title":"A Vigiar a Primeira Publicação","description":"Será notificado(a) quando houver novas mensagens neste grupo mas não quando houver respostas às mensagens."},"tracking":{"title":"A Seguir","description":"Será notificado se alguém mencionar o seu @nome ou lhe responder, e uma contagem de novas respostas será exibida."},"regular":{"title":"Habitual","description":"Será notificado se alguém mencionar o seu @nome ou responder-lhe."},"muted":{"title":"Silenciado","description":"Não vai ser notificado(a) de nenhuma mensagem neste grupo."}},"flair_url":"Imagem da Marca de Avatar","flair_upload_description":"Use imagens quadradas de, no mínimo, 20 x 20 px.","flair_bg_color":"Cor de Fundo da Marca de Avatar","flair_bg_color_placeholder":"(Opcional) Valor hexadecimal da cor","flair_color":"Cor da Marca de Avatar","flair_color_placeholder":"(Opcional) Valor hexadecimal da cor","flair_preview_icon":"Pré-visualizar Ícone","flair_preview_image":"Pré-visualizar Imagem","flair_type":{"icon":"Selecione um ícone","image":"Enviar uma imagem"},"default_notifications":{"modal_yes":"Sim"}},"user_action_groups":{"1":"Gostos Dados","2":"Gostos Recebidos","3":"Marcadores","4":"Tópicos","5":"Respostas","6":"Respostas","7":"Menções","9":"Citações","11":"Edições","12":"Itens Enviados","13":"Caixa de Entrada","14":"Pendente","15":"Rascunhos"},"categories":{"all":"todas as categorias","all_subcategories":"todos","no_subcategory":"nenhuma","category":"Categoria","category_list":"Exibir lista de categorias","reorder":{"title":"Re-organizar Categorias","title_long":"Re-organizar a lista de categorias","save":"Guardar Ordem","apply_all":"Aplicar","position":"Posição"},"posts":"Publicações","topics":"Tópicos","latest":"Recentes","subcategories":"Subcategorias","muted":"Categorias silenciadas","topic_sentence":{"one":"%{count} tópico","other":"%{count} tópicos"},"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"semana","month":"mês"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} tópico novo na semana passada.","other":"%{count} tópicos novos na semana passada."},"topic_stat_sentence_month":{"one":"%{count} tópico novo no mês passado.","other":"%{count} tópicos novos no mês passado."},"n_more":"Categorias (mais %{count})..."},"ip_lookup":{"title":"Pesquisa de Endereço IP","hostname":"Nome do Servidor","location":"Localização","location_not_found":"(desconhecido)","organisation":"Organização","phone":"Telefone","other_accounts":"Outras contas com este endereço IP:","delete_other_accounts":"Apagar %{count}","username":"nome de utilizador","trust_level":"TL","read_time":"tempo de leitura","topics_entered":"tópicos inseridos","post_count":"# publicações","confirm_delete_other_accounts":"Tem a certeza que quer apagar estas contas?","powered_by":"usando \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"copiado"},"user_fields":{"none":"(selecione uma opção)","required":"Por favor, insira um valor para \"%{name}”"},"user":{"said":"%{username}:","profile":"Perfil","mute":"Silenciar","edit":"Editar Preferências","download_archive":{"button_text":"Transferir Tudo","confirm":"Tem a certeza que deseja transferir as suas mensagens?","success":"Transferência iniciada, será notificado via mensagem assim que o processo estiver concluído.","rate_limit_error":"As mensagens podem ser transferidas uma vez por dia, por favor, tente novamente amanhã."},"new_private_message":"Nova Mensagem","private_message":"Mensagem","private_messages":"Mensagens","user_notifications":{"filters":{"filter_by":"Filtrar por","all":"Todos","read":"Lido","unread":"Não Lido"},"ignore_duration_title":"Ignorar Utilizador","ignore_duration_username":"Nome de utilizador","ignore_duration_when":"Duração:","ignore_duration_save":"Ignorar","ignore_duration_note":"Por favor, tome note que todos os itens ignorados são removidos automaticamente após o fim da duração para ignorar.","ignore_duration_time_frame_required":"Por favor selecione um intervalo de tempo","ignore_no_users":"Não tem utilizadores ignorados.","ignore_option":"Ignorados","ignore_option_title":"Não irá receber notificações relacionadas com este utilizador e todas as publicações deste serão escondidas.","add_ignored_user":"Adicionar...","mute_option":"Silenciado","mute_option_title":"Não irá receber quaisquer notificações relacionadas com este utilizador.","normal_option":"Normal","normal_option_title":"Será notificado se este usuário lhe responder, citar ou mencionar."},"notification_schedule":{"title":"Agendamento de Notificações","label":"Activar agendamento de notificações personalizado","tip":"Fora destas horas será automaticamente colocado no modo 'não incomodar'.","midnight":"Meia-noite","none":"Nenhuma","monday":"Segunda-feira","tuesday":"Terça-feira","wednesday":"Quarta-feira","thursday":"Quinta-feira","friday":"Sexta-feira","saturday":"Sábado","sunday":"Domingo","to":"para"},"activity_stream":"Atividade","read":"Lidos","read_help":"Tópicos lidos recentemente","preferences":"Preferências","feature_topic_on_profile":{"open_search":"Selecione um Novo Tópico","title":"Selecione um Tópico","search_label":"Pesquisar Tópico por título","save":"Guardar","clear":{"title":"Remover","warning":"Tem a certeza que pretende limpar o tópico em destaque?"}},"use_current_timezone":"Usar fuso horário atual","profile_hidden":"O perfil público deste utilizador está oculto.","expand_profile":"Expandir","collapse_profile":"Colapsar","bookmarks":"Marcadores","bio":"Sobre mim","timezone":"Zona Horária","invited_by":"Convidado Por","trust_level":"Nível de Confiança","notifications":"Notificações","statistics":"Estatísticas","desktop_notifications":{"label":"Notificações Instantâneas","not_supported":"Não são suportadas notificações neste navegador. Desculpe.","perm_default":"Ligar Notificações","perm_denied_btn":"Permissão Negada","perm_denied_expl":"Negou a permissão para as notificações. Autorize as notificações através das configurações do seu navegador.","disable":"Desativar Notificações","enable":"Ativar Notificações","each_browser_note":"Nota: Terá de alterar esta configuração em cada navegador que usar. Todas as notificações serão desativadas quando estiver em \"Não perturbar\", independentemente desta configuração.","consent_prompt":"Quer receber notificações instantâneas quando outras pessoas responderem às suas publicações?"},"dismiss":"Marcar como visto","dismiss_notifications":"Marcar Visto Tudo","dismiss_notifications_tooltip":"Marcar como lidas todas as notificações por ler","no_messages_title":"Não tem quaisquer mensagens","no_messages_body":"Precisa ter uma conversa pessoal direta com alguém, fora do fluxo normal de conversação? Envie uma mensagem selecionando seu avatar e usando o botão %{icon} mensagem.\u003cbr\u003e\u003cbr\u003e Se precisar de ajuda, você pode \u003ca href='%{aboutUrl}'\u003eenviar uma mensagem para um membro da equipe\u003c/a\u003e.\n","no_bookmarks_title":"Você ainda não favoritou nada","no_bookmarks_body":"Comece a marcar postagens com o botão %{icon} e elas serão listadas aqui para referência fácil. Você também pode agendar um lembrete!\n","no_notifications_title":"Você ainda não possui quaisquer notificações","no_notifications_body":"Você será notificado neste painel sobre atividades diretamente relevantes para você, incluindo respostas aos seus tópicos e postagens, quando alguém \u003cb\u003e@menciona\u003c/b\u003e você ou cita você, e responde aos tópicos que você está observando. As notificações também serão enviadas para o seu e-mail quando você não estiver logado por um tempo. \u003cbr\u003e\u003cbr\u003e Procure o %{icon} para decidir sobre quais tópicos, categorias e marcas específicas você deseja ser notificado. Para obter mais informações, consulte suas \u003ca href='%{preferencesUrl}'\u003epreferências de notificação\u003c/a\u003e.\n","no_notifications_page_title":"Você ainda não possui quaisquer notificações","first_notification":"A sua primeira notificação! Seleccione-a para começar.","dynamic_favicon":"Mostrar contagens no ícone do navegador","skip_new_user_tips":{"description":"Ignorar dicas e emblemas de integração de novos usuários","not_first_time":"Não é a sua primeira vez?","skip_link":"Ignorar estas dicas","read_later":"Vou ler mais tarde."},"theme_default_on_all_devices":"Usar este tema por defeito em todos os meus dispositivos","color_scheme_default_on_all_devices":"Definir esquema(s) de cor padrão em todos os meus dispositivos","color_scheme":"Esquema de Cores","color_schemes":{"default_description":"Tema padrão","disable_dark_scheme":"Igual ao normal","dark_instructions":"Pode pré-visualizar o esquema de cores do modo escuro ativando o modo escuro do seu dispositivo.","undo":"Repor","regular":"Habitual","dark":"Modo escuro","default_dark_scheme":"(padrão do site)"},"dark_mode":"Modo Escuro","dark_mode_enable":"Ativar automaticamente o esquema de cores do modo escuro","text_size_default_on_all_devices":"Usar este tamanho de texto por defeito em todos os meus dispositivos","allow_private_messages":"Permitir que outros utilizadores me enviem mensagens diretamente","external_links_in_new_tab":"Abrir todas as hiperligações externas num novo separador","enable_quoting":"Ativar resposta usando citação de texto destacado","enable_defer":"Ativar adiamento para marcar tópicos não lidos","change":"alterar","featured_topic":"Tópico em Destaque","moderator":"%{user} é um moderador","admin":"%{user} é um administrador","moderator_tooltip":"Este utilizador é um moderador","admin_tooltip":"Este utilizador é um administrador","silenced_tooltip":"Este utilizador está silenciado","suspended_notice":"Este utilizador está suspenso até %{date}.","suspended_permanently":"Este utilizador está suspenso","suspended_reason":"Motivo: ","github_profile":"GitHub","email_activity_summary":"Sumário de actividade","mailing_list_mode":{"label":"Modo de lista de distribuição","enabled":"Ativar modo de lista de distribuição","instructions":"\nEsta configuração sobrepõe o sumário de actividade.\u003cbr /\u003e\n\nTópicos e categorias silenciados não são incluídos nestes correios electrónicos.\n","individual":"Enviar um email por cada nova publicação","individual_no_echo":"Enviar um email por cada nova publicação excepto as minhas","many_per_day":"Mandar-me um email por cada nova publicação (cerca de %{dailyEmailEstimate} por dia)","few_per_day":"Mandar-me um email por cada nova publicação (cerca de 2 por dia)","warning":"Modo de mailing list ativo. As definições de notificação por email vão ser ignoradas."},"tag_settings":"Etiquetas","watched_tags":"A vigiar","watched_tags_instructions":"Irá vigiar automaticamente todos os novos tópicos nestas categorias. Será notificado de todas as novas respostas e tópicos, e uma contagem de novas respostas irá aparecer junto ao tópico.","tracked_tags":"Seguido","tracked_tags_instructions":"Irá seguir automaticamente todos os tópicos com estas etiquetas. Uma contagem de novas respostas irá aparecer junto ao tópico.","muted_tags":"Silenciado","muted_tags_instructions":"Não será notificado de nada acerca de novos tópicos nestas categorias, e estes não irão aparecer nos recentes.","watched_categories":"Vigiado","watched_categories_instructions":"Irá vigiar automaticamente todos os novos tópicos nestas categorias. Será notificado de todas as novas respostas e tópicos, e uma contagem de novas respostas irá aparecer junto ao tópico.","tracked_categories":"Seguido","tracked_categories_instructions":"Irá seguir automaticamente todos os novos tópicos nestas categorias. Uma contagem de novas respostas irá aparecer junto ao tópico.","watched_first_post_categories":"A Vigiar a Primeira Mensagem","watched_first_post_categories_instructions":"Será notificado acerca da primeira resposta em cada novo tópico nestas categorias.","watched_first_post_tags":"A Vigiar a Primeira Publicação","watched_first_post_tags_instructions":"Será notificado acerca da primeira resposta em cada novo tópico nestas categorias.","muted_categories":"Silenciado","muted_categories_instructions":"Não vai ser notificado(a) sobre novos tópicos nestas categorias, e eles não vão aparecer na página dos tópicos recentes nem na página de categorias.","muted_categories_instructions_dont_hide":"Não irá ser notificado(a) sobre novos tópicos nestas categorias.","regular_categories":"Habitual","regular_categories_instructions":"Você verá estas categorias nas listas de tópicos “Recentes” e “Melhores”.","no_category_access":"Como moderador(a), tem acesso limitado às categorias, e não é permitido gravar alterações.","delete_account":"Eliminar A Minha Conta","delete_account_confirm":"Tem a certeza que pretende eliminar a sua conta de forma permanente? Esta ação não pode ser desfeita!","deleted_yourself":"A sua conta foi eliminada com sucesso.","delete_yourself_not_allowed":"Por favor contacte um membro da equipa se desejar que a sua conta seja eliminada.","unread_message_count":"Mensagens","admin_delete":"Apagar","users":"Utilizadores","muted_users":"Silenciado","muted_users_instructions":"Suprimir todas as notificações e mensagens privadas destes utilizadores.","allowed_pm_users":"Permitido","allowed_pm_users_instructions":"Permitir Mensagens Pessoais destes utilizadores apenas.","allow_private_messages_from_specific_users":"Permitir que apenas utilizadores específicos me enviem mensagens pessoais diretamente","ignored_users":"Ignorados","ignored_users_instructions":"Suprimir todos os posts, notificações e mensagens pessoais destes utilizadores.","tracked_topics_link":"Exibir","automatically_unpin_topics":"Desafixar tópicos automaticamente quando eu chegar ao final.","apps":"Aplicações","revoke_access":"Rescindir Acesso","undo_revoke_access":"Cancelar Rescissão de Acesso","api_approved":"Aprovado:","api_last_used_at":"Usado pela última vez em:","theme":"Tema","save_to_change_theme":"O tema será atualizado após clicar em \"%{save_text}\"","home":"Página Principal Por Defeito","staged":"Não Confirmado","staff_counters":{"flags_given":"denúncias úteis","flagged_posts":"publicações sinalizadas","deleted_posts":"mensagens eliminadas","suspensions":"suspensões","warnings_received":"avisos","rejected_posts":"mensagens rejeitadas"},"messages":{"inbox":"Caixa de Entrada","latest":"Recentes","sent":"Enviado","unread":"Não Lido","unread_with_count":{"one":"Não Lido (%{count})","other":"Não Lido (%{count})"},"new":"Novo","new_with_count":{"one":"Novo (%{count})","other":"Novo (%{count})"},"archive":"Arquivo","groups":"Os Meus Grupos","move_to_inbox":"Mover para Caixa de Entrada","move_to_archive":"Arquivo","failed_to_move":"Falha ao mover as mensagens selecionadas (talvez a sua rede esteja em baixo)","tags":"Etiquetas","warnings":"Avisos Oficiais"},"preferences_nav":{"account":"Conta","security":"Segurança","profile":"Perfil","emails":"E-mails","notifications":"Notificações","categories":"Categorias","users":"Utilizadores","tags":"Etiquetas","interface":"Interface","apps":"Aplicações"},"change_password":{"success":"(email enviado)","in_progress":"(a enviar email)","error":"(erro)","emoji":"emoji de bloqueio","action":"Enviar email de recuperação de palavra-passe","set_password":"Definir Palavra-passe","choose_new":"Escolha uma nova palavra-passe","choose":"Escolha uma palavra-passe"},"second_factor_backup":{"title":"Códigos de Reserva para Autenticação em Dois Passos","regenerate":"Regenerar","disable":"Desativar","enable":"Ativar","enable_long":"Ativar códigos de reserva","manage":{"one":"Gerir códigos de reserva. Resta \u003cstrong\u003e%{count}\u003c/strong\u003e código de reserva.","other":"Gerir códigos de reserva. Restam \u003cstrong\u003e%{count}\u003c/strong\u003e códigos de reserva."},"copy_to_clipboard":"Copiar para a Área de Transferência","copy_to_clipboard_error":"Erro a copiar dados para a Área de Transferência","copied_to_clipboard":"Copiado para a Área de Transferência","download_backup_codes":"Transferir códigos de cópia de segurança","remaining_codes":{"one":"Resta \u003cstrong\u003e%{count}\u003c/strong\u003e código de reserva.","other":"Restam \u003cstrong\u003e%{count}\u003c/strong\u003e códigos de reserva."},"use":"Utilize um código de reserva","enable_prerequisites":"Tem de activar um método primário de dois passos antes de gerar códigos de reserva.","codes":{"title":"Códigos de Reserva Gerados","description":"Cada um dos códigos de reserva só pode ser usado uma vez. Guarde-os num sítio seguro mas acessível."}},"second_factor":{"title":"Autenticação em Dois Passos","enable":"Gerir Autenticação em Dois Passos","disable_all":"Desativar Tudo","forgot_password":"Esqueceu a palavra-passe?","confirm_password_description":"Por favor confirme a sua palavra-passe para continuar","name":"Nome","label":"Código","rate_limit":"Por favor espere antes de voltar a tentar um código de autenticação.","enable_description":"Leia este código QR numa aplicação compatível (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e — \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) e insira o seu código de autenticação.\n","disable_description":"Por favor introduza o código de autenticação a partir da sua aplicação","show_key_description":"Inserir manualmente","short_description":"Proteja a sua conta com códigos de segurança de utilização única.\n","extended_description":"A autenticação em dois passos adiciona segurança à sua conta ao pedir um código de utilização única além da sua palavra-passe. Os códigos podem ser gerados em dispositivos \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e e \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e.\n","oauth_enabled_warning":"Tenha em consideração que os logins sociais serão desativados assim que a autenticação em dois passos for ativada na sua conta.","use":"Utilizar a aplicação Authenticator","enforced_notice":"É necessário ativar a autenticação em dois passos para aceder a este site.","disable":"Desativar","disable_confirm":"Tem a certeza que deseja desativar todos os métodos de dois passos?","save":"Guardar","edit":"Editar","edit_title":"Editar Autenticador","edit_description":"Nome do Autenticador","enable_security_key_description":"Quando tiver a sua \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003echave de segurança de hardware\u003c/a\u003e preparada, pressione o botão abaixo de Registar.\n","totp":{"title":"Autenticadores Baseados em Tokens","add":"Adicionar Autenticador","default_name":"O Meu Autenticador","name_and_code_required_error":"Tem de fornecer um nome e o código da sua aplicação de autenticação."},"security_key":{"register":"Registar","title":"Chaves de Segurança","add":"Adicionar Chave de Segurança","default_name":"Chave de Segurança Principal","not_allowed_error":"O processo de registo da chave de segurança atingiu o tempo limite ou foi cancelado.","already_added_error":"Já registou esta chave de segurança. Não precisa de a registar novamente.","edit":"Editar Chave de Segurança","save":"Guardar","edit_description":"Nome da Chave de Segurança","name_required_error":"Tem de fornecer um nome para a sua chave de segurança."}},"change_about":{"title":"Modificar Sobre Mim","error":"Ocorreu um erro ao modificar este valor."},"change_username":{"title":"Alterar Nome de Utilizador","confirm":"Tem a certeza absoluta que pretende alterar o seu nome de utilizador?","taken":"Pedimos desculpa, esse nome de utilizador já está a ser utilizado.","invalid":"Esse nome de utilizador é inválido. Deve conter apenas números e letras."},"add_email":{"title":"Adicionar E-mail","add":"adicionar"},"change_email":{"title":"Alterar Email","taken":"Pedimos desculpa, esse email não está disponível.","error":"Ocorreu um erro ao alterar o email. Talvez esse endereço já esteja a ser utilizado neste fórum?","success":"Enviámos um email para esse endereço. Por favor siga as instruções de confirmação.","success_via_admin":"Enviámos um e-mail para esse endereço. O utilizador terá de seguir as instruções de confirmação no e-mail..","success_staff":"Nós enviámos uma mensagem para o seu endereço atual. Por favor, siga as instruções de confirmação."},"change_avatar":{"title":"Alterar a sua imagem de perfil","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, com base em","gravatar_title":"Alterar o seu avatar no site %{gravatarName}","gravatar_failed":"Não foi possível encontrar um %{gravatarName} com esse endereço de e-mail.","refresh_gravatar_title":"Atualize o seu %{gravatarName}","letter_based":"Imagem de perfil atribuída pelo sistema","uploaded_avatar":"Foto personalizada","uploaded_avatar_empty":"Adicionar foto personalizada","upload_title":"Carregar a sua foto","image_is_not_a_square":"Alerta: cortámos a sua imagem; o comprimento e a altura não eram iguais.","logo_small":"Logotipo pequeno do site. Usado por padrão."},"change_profile_background":{"title":"Cabeçalho do Perfil","instructions":"Os cabeçalhos do perfil serão centrados e com uma largura padrão de 1110px."},"change_card_background":{"title":"Fundo do cartão de utilizador","instructions":"As imagens de fundo serão centradas e terão por defeito uma largura de 590px."},"change_featured_topic":{"title":"Tópico em Destaque","instructions":"Um link para este tópico estará visível no seu cartão de usuário e perfil."},"email":{"title":"Email","primary":"Email Principal","secondary":"Emails Secundários","primary_label":"primária","unconfirmed_label":"não confirmado","resend_label":"reenviar e-mail de confirmação","resending_label":"a enviar...","resent_label":"e-mail enviado","update_email":"Alterar Email","set_primary":"Definir E-mail Principal","destroy":"Remover E-mail","add_email":"Adicionar E-mail Alternativo","auth_override_instructions":"O e-mail pode ser atualizado a partir do provedor de autenticação.","no_secondary":"Não existem emails secundários","instructions":"Nunca mostrado ao público.","admin_note":"Nota: Um administrador que alterou um e-mail de outro usuário não-administrador indica que o usuário perdeu o acesso a sua conta de e-mail original. então um e-mail de redefinição de senha será enviado para o novo endereço deles. O e-mail do usuário não será alterado até que ele complete o processo de redefinição de senha.","ok":"Enviar-lhe-emos um email para confirmar","required":"Por favor introduza um endereço de e-mail","invalid":"Por favor introduza um endereço de email válido","authenticated":"O seu email foi autenticado por %{provider}","invite_auth_email_invalid":"O seu email de convite não coincide com o email autenticado por %{provider}","authenticated_by_invite":"Seu e-mail foi autenticado pelo convite","frequency_immediately":"Enviar-lhe-emos um email imediatamente caso não leia o que lhe estamos a enviar.","frequency":{"one":"Só iremos enviar-lhe um email se não o tivermos visto no último minuto.","other":"Só iremos enviar-lhe um email se não o tivermos visto nos últimos %{count} minutos."}},"associated_accounts":{"title":"Contas Associadas","connect":"Associar","revoke":"Remover","cancel":"Cancelar","not_connected":"(não associado)","confirm_modal_title":"Conectar Conta de %{provider}","confirm_description":{"account_specific":"Sua conta de %{provider} '%{account_description}' será usada para autenticação.","generic":"Sua conta de %{provider} '' será usada para autenticação."}},"name":{"title":"Nome","instructions":"o seu nome completo (opcional)","instructions_required":"O seu nome completo","required":"Por favor introduza um nome","too_short":"O seu nome é demasiado curto","ok":"O seu nome parece adequado"},"username":{"title":"Nome de Utilizador","instructions":"único, sem espaços, curto","short_instructions":"As pessoas podem mencioná-lo como %{username}","available":"O seu nome de utilizador está disponível","not_available":"Não está disponível. Tente %{suggestion}?","not_available_no_suggestion":"Indisponível","too_short":"O seu nome de utilizador é muito curto","too_long":"O seu nome de utilizador é muito longo","checking":"A verificar a disponibilidade do nome de utilizador...","prefilled":"O e-mail corresponde com este nome de utilizador registado","required":"Por favor introduza um nome de utilizador","edit":"Editar nome de usuário"},"locale":{"title":"Idioma da Interface","instructions":"O idioma da interface do utilizador. Este será alterado quando recarregar a página.","default":"(predefinição)","any":"qualquer"},"password_confirmation":{"title":"Palavra-passe Novamente"},"invite_code":{"title":"Código de Convite","instructions":"O registo da conta requer um código de convite"},"auth_tokens":{"title":"Dispositivos Recentemente Utilizados","details":"Detalhes","log_out_all":"Sair de todas as contas","not_you":"Não é a sua conta?","show_all":"Mostrar todas (%{count})","show_few":"Mostrar menos","was_this_you":"Foi uma ação sua?","was_this_you_description":"Se não foi uma ação sua, recomendamos que altere a sua palavra-passe e saia de todas as contas.","browser_and_device":"%{browser} no %{device}","secure_account":"Proteger a minha Conta","latest_post":"A sua última publicação...","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eativo agora\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"Última Publicação","last_seen":"Visto","created":"Juntou-se","log_out":"Terminar Sessão","location":"Localização","website":"Site da Web","email_settings":"E-mail","hide_profile_and_presence":"Esconder o meu perfil público e a funcionalidade de presença","enable_physical_keyboard":"Ativar suporte para teclado físico no iPad","text_size":{"title":"Tamanho do Texto","smallest":"O menor","smaller":"Mais Pequeno","normal":"Normal","larger":"Maior","largest":"O Maior Possível"},"title_count_mode":{"title":"O título da página em segundo plano exibe a contagem de:","notifications":"Novas notificações","contextual":"Conteúdo da nova página"},"like_notification_frequency":{"title":"Notificar quando alguém gostar","always":"Sempre","first_time_and_daily":"Na primeira vez que alguém gostar de uma mensagem e diariamente","first_time":"Na primeira vez que alguém gostar de uma publicação","never":"Nunca"},"email_previous_replies":{"title":"Incluir as respostas anteriores no fundo das mensagens","unless_emailed":"a não ser que já tenha sido enviado anteriormente","always":"sempre","never":"nunca"},"email_digests":{"title":"Quando eu não visitar o site, enviem-me um sumário das publicações mais populares por email","every_30_minutes":"a cada 30 minutos","every_hour":"de hora em hora","daily":"diariamente","weekly":"semanalmente","every_month":"cada mês","every_six_months":"a cada seis meses"},"email_level":{"title":"Enviem-me um email quando alguém me citar, responder a uma publicação minha, mencionar o meu @nome_de_utilizador ou me convidar para um tópico","always":"sempre","only_when_away":"só quando não estiver online","never":"nunca"},"email_messages_level":"Enviem-me um email cada vez que alguém me enviar uma mensagem","include_tl0_in_digests":"Incluir o conteúdo dos novos utilizadores nas mensagens de resumo","email_in_reply_to":"Incluir um excerto de resposta para publicar nas mensgaens","other_settings":"Outros","categories_settings":"Categorias","new_topic_duration":{"label":"Considerar tópicos como novos quando","not_viewed":"Eu ainda não os vi","last_here":"criado desde a última vez que eu estive aqui","after_1_day":"criado no último dia","after_2_days":"criado nos últimos 2 dias","after_1_week":"criado na última semana","after_2_weeks":"criado nas últimas 2 semanas"},"auto_track_topics":"Seguir automaticamente os tópicos em que eu participo","auto_track_options":{"never":"nunca","immediately":"imediatamente","after_30_seconds":"depois de 30 segundos","after_1_minute":"depois de 1 minuto","after_2_minutes":"depois de 2 minutos","after_3_minutes":"depois de 3 minutos","after_4_minutes":"depois de 4 minutos","after_5_minutes":"depois de 5 minutos","after_10_minutes":"depois de 10 minutos"},"notification_level_when_replying":"Quando eu publico num tópico, coloque esse tópico como","invited":{"title":"Convites","pending_tab":"Pendente","pending_tab_with_count":"Pendentes (%{count})","expired_tab":"Expirado","expired_tab_with_count":"Expirado (%{count})","redeemed_tab":"Resgatado","redeemed_tab_with_count":"Resgatados (%{count})","invited_via":"Convite","invited_via_link":"link %{key} (%{count} / %{max} resgatado)","groups":"Grupos","topic":"Tópico","sent":"Criado/Último Enviado","expires_at":"Expira","edit":"Editar","remove":"Remover","copy_link":"Obter Link","reinvite":"Reenviar Email","reinvited":"Convite reenviado","removed":"Removido","search":"digite para pesquisar por convites...","user":"Utilizador Convidado","none":"Sem convites para exibir.","truncated":{"one":"A exibir o primeiro convite.","other":"A exibir os primeiros %{count} convites."},"redeemed":"Convites Resgatados","redeemed_at":"Resgatado","pending":"Convites Pendentes","topics_entered":"Tópicos Visualizados","posts_read_count":"Publicações Lidas","expired":"Este convite expirou.","remove_all":"Remover Convites Expirados","removed_all":"Todos os Convites Expirados foram removidos!","remove_all_confirm":"Tem certeza que pretende remover todos os convites expirados?","reinvite_all":"Reenviar todos os Convites","reinvite_all_confirm":"Tem a certeza que deseja reenviar todos os convites?","reinvited_all":"Todos os Convites enviados!","time_read":"Tempo de Leitura","days_visited":"Dias Visitados","account_age_days":"Idade da conta, em dias","create":"Convidar","generate_link":"Criar Link de Convite","link_generated":"Aqui está o seu link de convite!","valid_for":"A hiperligação do convite é válida apenas para este endereço de e-mail: %{email}","single_user":"Convidar por email","multiple_user":"Convidar por link","invite_link":{"title":"Link de Convite","success":"Hiperligação do convite gerada com sucesso!","error":"Ocorreu um erro ao gerar o Link de Convite","max_redemptions_allowed_label":"Quantas pessoas têm permissão para se registar usando este link?","expires_at":"Quando irá este link de convite expirar?"},"invite":{"new_title":"Criar Convite","edit_title":"Editar Convite","instructions":"Compartilhe este link para conceder acesso instantâneo a este site","copy_link":"copiar link","expires_in_time":"Expira em %{time}","expired_at_time":"Expirou em %{time}","show_advanced":"Mostrar Opções Avançadas","hide_advanced":"Ocultar Opções Avançadas","restrict_email":"Restringir a um endereço de e-mail","max_redemptions_allowed":"Máximo de utilizações","add_to_groups":"Adicionar aos grupos","invite_to_topic":"Chegue neste tópico","expires_at":"Expira após","custom_message":"Mensagem pessoal opcional","send_invite_email":"Guardar e Enviar E-mail","save_invite":"Salvar Convite","invite_saved":"Convite salvo.","invite_copied":"Link de convite copiado."},"bulk_invite":{"none":"Sem convites para exibir nesta página.","text":"Convite em massa","instructions":"\u003cp\u003eConvide uma lista de usuários para fazer sua comunidade funcionar rapidamente. Prepare um \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003earquivo CSV\u003c/a\u003e contendo pelo menos uma linha por endereço de e-mail dos usuários que você deseja convidar. As seguintes informações separadas por vírgulas podem ser fornecidas se você quiser adicionar pessoas a grupos ou enviá-las para um tópico específico na primeira vez que elas entrarem.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eA cada endereço de e-mail em seu arquivo CSV carregado será enviado um convite e você poderá administrar depois.\u003c/p\u003e\n","progress":"Enviado %{progress}%...","success":"Arquivo enviado com sucesso. Você será notificado via mensagem quando o processo estiver completo.","error":"Desculpe, o ficheiro deverá estar no formato CSV."}},"password":{"title":"Palavra-passe","too_short":"A sua palavra-passe é muito curta.","common":"Essa palavra-passe é muito comum.","same_as_username":"A sua palavra-passe é a mesma que o seu nome de utilizador.","same_as_email":"A sua palavra-passe é a mesma que o seu e-mail.","ok":"A sua palavra-passe parece estar bem.","instructions":"pelo menos %{count} carateres","required":"Por favor, digite uma senha"},"summary":{"title":"Resumo","stats":"Estatísticas","time_read":"tempo de leitura","recent_time_read":"tempo de leitura recente","topic_count":{"one":"Tópico criado","other":"tópicos criados"},"post_count":{"one":"mensagem criada","other":"mensagens criadas"},"likes_given":{"one":"dado","other":"dados"},"likes_received":{"one":"recebido","other":"recebidos"},"days_visited":{"one":"dia visitado","other":"dias visitados"},"topics_entered":{"one":"tópico visualizado","other":"tópicos visualizados"},"posts_read":{"one":"publicação lida","other":"publicações lidas"},"bookmark_count":{"one":"marcador","other":"marcadores"},"top_replies":"Melhores Respostas","no_replies":"Ainda sem respostas.","more_replies":"Mais Respostas","top_topics":"Melhores Tópicos","no_topics":"Ainda sem tópicos.","more_topics":"Mais Tópicos","top_badges":"Melhores Crachás","no_badges":"Ainda não existem crachás.","more_badges":"Mais Crachás","top_links":"Melhores Hiperligações","no_links":"Ainda sem hiperligações.","most_liked_by":"Por mais gostados","most_liked_users":"Mais Gostados","most_replied_to_users":"Mais Respondidos","no_likes":"Ainda sem gostos.","top_categories":"Categorias Populares","topics":"Tópicos","replies":"Respostas"},"ip_address":{"title":"Último Endereço de IP"},"registration_ip_address":{"title":"Endereço de IP de Registo"},"avatar":{"title":"Imagem de Perfil","header_title":"perfil, mensagens, marcadores e preferências","name_and_description":"%{name} - %{description}","edit":"Editar Imagem de Perfil"},"title":{"title":"Título","none":"(nenhum)"},"flair":{"none":"(nenhum)"},"primary_group":{"title":"Grupo Primário","none":"(nenhum)"},"filters":{"all":"Todos"},"stream":{"posted_by":"Publicado por","sent_by":"Enviado por","private_message":"mensagem","the_topic":"o tópico"},"date_of_birth":{"user_title":"Hoje é o seu aniversário!","title":"Hoje é o meu aniversário!","label":"Data de Nascimento"},"anniversary":{"user_title":"Hoje é o aniversário do dia em que me juntei à nossa comunidade!","title":"Hoje é o aniversário do dia em que me juntei a esta comunidade!"}},"loading":"A carregar...","errors":{"prev_page":"enquanto tenta carregar","reasons":{"network":"Erro de Rede","server":"Erro de Servidor","forbidden":"Acesso Negado","unknown":"Erro","not_found":"Página Não Encontrada"},"desc":{"network":"Por favor, verifique a sua ligação.","network_fixed":"Parece que está de volta.","server":"Código de erro: %{status}","forbidden":"Não está autorizado para ver isso.","not_found":"Ups, a aplicação tentou carregar um URL que não existe.","unknown":"Correu algo de errado."},"buttons":{"back":"Voltar Atrás","again":"Tentar Novamente","fixed":"Carregar Página"}},"modal":{"close":"fechar","dismiss_error":"Dispensar erro"},"close":"Fechar","assets_changed_confirm":"Este site acabou de receber uma atualização de software. Obter a versão mais recente agora?","logout":"A sua sessão foi encerrada.","refresh":"Atualizar","home":"Início","read_only_mode":{"enabled":"Este site está no modo só de leitura. Por favor, continue a navegar, mas responder, gostar e outras ações estão de momento desativadas.","login_disabled":"Enquanto o site se encontrar no modo só de leitura, a opção de iniciar a sessão está desativada.","logout_disabled":"Enquanto o site se encontrar no modo só de leitura, a opção de terminar a sessão está desativada."},"learn_more":"saber mais...","first_post":"Primeira publicação","mute":"Silenciar","unmute":"Desativar silêncio","last_post":"Publicado","local_time":"Hora Local","time_read":"Lido","time_read_recently":"%{time_read} recentemente","time_read_tooltip":"%{time_read} tempo total lido","time_read_recently_tooltip":"%{time_read} tempo total lido (%{recent_time_read} nos últimos 60 dias)","last_reply_lowercase":"última resposta","replies_lowercase":{"one":"resposta","other":"respostas"},"signup_cta":{"sign_up":"Inscrever-se","hide_session":"Lembrar-me amanhã","hide_forever":"não, obrigado","hidden_for_session":"OK, perguntaremos a você amanhã. Você sempre pode usar 'Efetuar Login' para criar uma conta, também.","intro":"Olá! Parece que está a gostar da conversa, mas ainda não tem uma conta.","value_prop":"Quando cria uma conta, nós lembramo-nos exatamente o que já leu, por isso volta sempre ao sítio onde parou. Também recebe notificações, aqui e por email, cada vez que alguém lhe responde. E pode gostar das publicações para interagir com outros utilizadores. :heartpulse:"},"summary":{"enabled_description":"Está a ver um resumo deste tópico: as respostas mais interessantes são determinadas pela comunidade.","enable":"Resumir Este Tópico","disable":"Mostrar Todas As Publicações"},"deleted_filter":{"enabled_description":"Este tópico contém respostas eliminadas, que foram ocultadas.","disabled_description":"As publicações eliminadas no tópico são exibidas.","enable":"Ocultar Publicações Eliminadas","disable":"Mostrar Publicações Eliminadas"},"private_message_info":{"title":"Mensagem","invite":"Convidar Outros...","edit":"Adicionar ou Remover...","remove":"Remover...","add":"Adicionar...","leave_message":"Quer mesmo deixar esta mensagem?","remove_allowed_user":"Deseja mesmo remover %{name} desta mensagem?","remove_allowed_group":"Deseja mesmo remover %{name} desta mensagem?"},"email":"E-mail","username":"Nome de utilizador","last_seen":"Visto","created":"Criado","created_lowercase":"criado","trust_level":"Nível de Confiança","search_hint":"nome de utilizador, e-mail ou endereço de IP","create_account":{"header_title":"Bem-vindo!","subheader_title":"Vamos criar a sua conta","disclaimer":"Ao registar-se, concorda com a \u003ca href='%{privacy_link}' target='blank'\u003epolítica de privacidade\u003c/a\u003e e os \u003ca href='%{tos_link}' target='blank'\u003etermos do serviço\u003c/a\u003e.","title":"Crie sua conta","failed":"Ocorreu algo de errado, este e-mail já pode estar registado. Tente utilizar a hiperligação \"Esqueci-me da Palavra-passe\"."},"forgot_password":{"title":"Repor Palavra-Passe","action":"Eu esqueci-me da minha palavra-passe","invite":"Insira o seu nome de utilizador ou o endereço de e-mail, e nós iremos enviar-lhe uma mensagem para repor a sua palavra-passe.","reset":"Repor Palavra-passe","complete_username":"Se uma conta corresponder ao nome de utilizador \u003cb\u003e%{username}\u003c/b\u003e, deverá receber em pouco tempo uma mensagem com as instruções para repor a sua palavra-passe.","complete_email":"Se uma conta corresponder com\u003cb\u003e%{email}\u003c/b\u003e, deverá receber em pouco tempo uma mensagem com as instruções para repor a sua palavra-passe.","complete_username_found":"Encontramos uma conta que corresponde ao nome de usuário \u003cb\u003e%{username}\u003c/b\u003e. Você receberá um e-mail com instruções sobre como redefinir sua senha em breve.","complete_email_found":"Encontramos uma conta que corresponde a \u003cb\u003e%{email}\u003c/b\u003e. Você receberá um e-mail com instruções sobre como redefinir sua senha em breve.","complete_username_not_found":"Nenhuma conta correspondente com o nome de utilizador \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Nenhuma conta correspondente com \u003cb\u003e%{email}\u003c/b\u003e","help":"A mensagem não chega? Certifique-se de que verifica primeiro a sua pasta de spam.\u003cp\u003eNão tem a certeza de qual o endereço de e-mail que utilizou? Digite um endereço de e-mail e nós iremos dizer-lhe se ele existe aqui.\u003c/p\u003e\u003cp\u003eSe já não tiver acesso ao endereço de e-mail da sua conta, por favor, contacte \u003ca href='%{basePath}/about'\u003ea nossa equipa de apoio.\u003c/a\u003e\u003c/p\u003e","button_ok":"CONFIRMAR","button_help":"Ajuda"},"email_login":{"link_label":"Enviem-me uma ligação para entrar","button_label":"com e-mail","login_link":"Ignorar a senha; enviar-me um link de login","emoji":"emoji de bloqueio","complete_username":"Se houver uma conta com o nome de utilizador \u003cb\u003e%{username}\u003c/b\u003e, deverá receber um email com uma ligação para ligar dentro de poucos instantes.","complete_email":"Se houver uma conta com o endereço \u003cb\u003e%{email}\u003c/b\u003e, irá receber um email com uma ligação para entrar dentro de poucos instantes.","complete_username_found":"Encontrámos uma conta que usa o nome de utilizador \u003cb\u003e%{username}\u003c/b\u003e, deverá receber um email com uma ligação para entrar dentro de poucos instantes.","complete_email_found":"Encontrámos uma conta com o endereço \u003cb\u003e%{email}\u003c/b\u003e, deverá receber um email com uma ligação para entrar dentro de poucos instantes.","complete_username_not_found":"Nenhuma conta correspondente com o nome de utilizador \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Nenhuma conta correspondente com \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Continuar para %{site_name}","logging_in_as":"Fazendo login como %{email}","confirm_button":"Concluir o Login"},"login":{"header_title":"Bem-vindo de volta","subheader_title":"Faça login na sua conta","title":"Efetuar login","username":"Utilizador","password":"Palavra-passe","second_factor_title":"Autenticação em Dois Passos","second_factor_description":"Por favor introduza um código de autenticação a partir da sua aplicação:","second_factor_backup":"Faça login usando um código de backup","second_factor_backup_title":"Backup de Dois Fatores","second_factor_backup_description":"Por favor introduza um dos seus códigos de reserva:","second_factor":"Efetue login usando o aplicativo Authenticator","security_key_description":"Quando você tiver sua chave de segurança física preparada, pressione o botão Autenticar com Chave de Segurança abaixo.","security_key_alternative":"Tente de outra forma","security_key_authenticate":"Autenticar com Chave de Segurança","security_key_not_allowed_error":"O processo de autenticação da chave de segurança atingiu o tempo limite ou foi cancelado.","security_key_no_matching_credential_error":"Nenhuma credencial correspondente foi encontrada na chave de segurança fornecida.","security_key_support_missing_error":"Seu dispositivo ou navegador atual não suporta o uso de chaves de segurança. Use um método diferente.","email_placeholder":"Email / Nome de Usuário","caps_lock_warning":"Caps Lock está ligada","error":"Erro desconhecido","cookies_error":"Seu navegador parece ter cookies desativados. Talvez você não consiga fazer login sem ativá-los primeiro.","rate_limit":"Por favor, aguarde antes de tentar iniciar a sessão novamente.","blank_username":"Por favor, insira o seu e-mail ou nome de utilizador.","blank_username_or_password":"Por favor, insira o seu e-mail ou nome de utilizador, e a palavra-passe.","reset_password":"Repor Palavra-passe","logging_in":"A iniciar a sessão...","or":"Ou","authenticating":"A autenticar...","awaiting_activation":"A sua conta está a aguardar ativação. Utilize a hiperligação \"Esqueci-me da Palavra-passe\" para pedir uma nova mensagem de ativação.","awaiting_approval":"A sua conta ainda não foi aprovada por um membro da equipa. Nós Iremos enviar uma mensagem quando esta for aprovada.","requires_invite":"Desculpe, o acesso a este fórum é apenas através de convite.","not_activated":"Ainda não pode iniciar a sessão. Nós enviámos anteriormente uma mensagem de ativação para o seu endereço \u003cb\u003e%{sentTo}\u003c/b\u003e. Por favor, siga as instruções contidas nessa mensagem para ativar a sua conta.","not_allowed_from_ip_address":"Você não pode efetuar login a partir desse endereço IP.","admin_not_allowed_from_ip_address":"Não pode iniciar a sessão como administrador a partir desse endereço de IP.","resend_activation_email":"Clique aqui para enviar novamente a mensagem de ativação.","omniauth_disallow_totp":"A sua conta tem a autenticação em dois passos ativa. Por favor entre com a sua senha.","resend_title":"Reenviar Mensagem de Ativação","change_email":"Alterar Endereço de E-mail","provide_new_email":"Forneça um novo endereço e nós iremos reenviar a sua mensagem de confirmação.","submit_new_email":"Atualizar Endereço de E-mail","sent_activation_email_again":"Nós enviámos outra mensagem de ativação para o seu endereço \u003cb\u003e%{currentEmail}\u003c/b\u003e. Esta pode demorar alguns minutos para a receber; certifique-se que verifica a sua pasta de spam.","sent_activation_email_again_generic":"Enviámos outro email de ativação. Pode demorar alguns minutos até que chegue; certifique-se de que verifica a sua pasta de spam.","to_continue":"Por favor, inicie a sessão","preferences":"Necessita de ter a sessão iniciada para alterar as suas preferências de utilizador.","not_approved":"A sua conta ainda não foi aprovada. Será notificado por mensagem quando estiver pronto para iniciar a sessão.","google_oauth2":{"name":"Google","title":"com Google"},"twitter":{"name":"Twitter","title":"com Twitter"},"instagram":{"name":"Instagram","title":"com Instagram"},"facebook":{"name":"Facebook","title":"com Facebook"},"github":{"name":"GitHub","title":"com GitHub"},"discord":{"name":"Discord","title":"com Discord"},"second_factor_toggle":{"totp":"Use um aplicativo de autenticação","backup_code":"Use um código de backup"}},"invites":{"accept_title":"Convite","emoji":"emoji de envelope","welcome_to":"Bem-vindo a %{site_name}!","invited_by":"Foi convidado por:","social_login_available":"Também irá poder iniciar a sessão com qualquer credencial das redes sociais, utilizando esse e-mail.","your_email":"O seu endereço de e-mail da conta é \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Aceitar Convite","success":"A sua conta foi criada e está agora com a sessão iniciada.","name_label":"Nome","password_label":"Palavra-passe","optional_description":"(opcional)"},"password_reset":{"continue":"Continuar para %{site_name}"},"emoji_set":{"apple_international":"Apple/Internacional","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Apenas Categorias","categories_with_featured_topics":"Categorias com Tópicos Destacados","categories_and_latest_topics":"Categorias e Tópicos Recentes","categories_and_top_topics":"Categorias e Melhores Tópicos","categories_boxes":"Caixas com Subcategorias","categories_boxes_with_topics":"Caixas com Tópicos em Destaque"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Entrar"},"conditional_loading_section":{"loading":"A carregar..."},"category_row":{"topic_count":{"one":"%{count} tópico nesta categoria","other":"%{count} tópicos nesta categoria"},"plus_subcategories_title":{"one":"%{name} e uma subcategoria","other":"%{name} e %{count} subcategorias"},"plus_subcategories":{"one":"+ %{count} subcategoria","other":"+ %{count} subcategorias"}},"select_kit":{"delete_item":"Apagar %{name}","filter_by":"Filtrar por: %{name}","select_to_filter":"Selecione um valor para filtrar","default_header_text":"Selecionar...","no_content":"Não foram encontradas correspondências","filter_placeholder":"Pesquisar...","filter_placeholder_with_any":"Pesquisar ou criar...","create":"Criar: '%{content}'","max_content_reached":{"one":"Só consegue selecionar %{count} item.","other":"Só consegue selecionar %{count} itens."},"min_content_not_reached":{"one":"Selecione pelo menos %{count} item.","other":"Selecione pelo menos %{count} itens."},"invalid_selection_length":{"one":"A seleção deve ter pelo menos %{count} caracter.","other":"A seleção deve ter pelo menos %{count} caracteres."},"components":{"tag_drop":{"filter_for_more":"Filtrar por mais..."},"categories_admin_dropdown":{"title":"Gerir categorias"}}},"date_time_picker":{"from":"De","to":"Para"},"emoji_picker":{"filter_placeholder":"Pesquisar por emoji","smileys_\u0026_emotion":"Smileys e Emojis","people_\u0026_body":"Pessoas e Corpo","animals_\u0026_nature":"Animais e Natureza","food_\u0026_drink":"Comida e Bebida","travel_\u0026_places":"Viagem e Sítios","activities":"Atividades","objects":"Objetos","symbols":"Símbolos","flags":"Bandeiras","recent":"Utilizado recentemente","default_tone":"Sem tom de pele","light_tone":"Tom de pele claro","medium_light_tone":"Tom de pele meio claro","medium_tone":"Tom de pele médio","medium_dark_tone":"Tom de pele meio escuro","dark_tone":"Tom de pele escuro","default":"Emojis Personalizados"},"shared_drafts":{"title":"Rascunhos Partilhados","notice":"Este tópico é visível apenas para quem pode publicar rascunhos partilhados.","destination_category":"Categoria Destino","publish":"Publicar Rascunho Partilhado","confirm_publish":"Tem a certeza que quer publicar este rascunho?","publishing":"Publicando Tópico..."},"composer":{"emoji":"Emoji :)","more_emoji":"mais...","options":"Opções","whisper":"susurro","unlist":"não listado","add_warning":"Este é um aviso oficial.","toggle_whisper":"Alternar Sussuro","toggle_unlisted":"Alternar Não Listado","posting_not_on_topic":"A que tópico quer responder?","saved_local_draft_tip":"guardado localmente","similar_topics":"O seu tópico é similar a...","drafts_offline":"rascunhos off-line","edit_conflict":"editar conflito","group_mentioned":{"one":"Ao usar %{group}, estará a notificar \u003ca href='%{group_link}'\u003e%{count} pessoa\u003c/a\u003e – tem a certeza?","other":"Ao mencionar %{group}, estará a notificar \u003ca href='%{group_link}'\u003e%{count} pessoas\u003c/a\u003e – tem a certeza?"},"cannot_see_mention":{"category":"Mencionou %{username} , mas este não será notificado porque não têm acesso a esta categoria. Terá de os adicionar a um grupo que tenha acesso a esta categoria.","private":"Mencionou %{username}, mas este não será notificado porque não consegue ver esta mensagem privada. Terá de o convidar para esta MP."},"duplicate_link":"Parce que a sua hiperligação para \u003cb\u003e%{domain}\u003c/b\u003e já foi publicada neste tópico por \u003cb\u003e@%{username}\u003c/b\u003e numa \u003ca href='%{post_url}'\u003eresposta %{ago}\u003c/a\u003e – tem a certeza que a quer publicar novamente?","reference_topic_title":"RE: %{title}","error":{"title_missing":"O título é obrigatório","post_missing":"A mensagem não pode estar vazia","try_like":"Já experimentou o botão %{heart}?","category_missing":"Tem de escolher uma categoria","topic_template_not_modified":"Adicione detalhes e especificações ao tópico, editando o modelo de tópico."},"save_edit":"Guardar Edição","overwrite_edit":"Guardar Edição","reply_original":"Responder no Tópico Original","reply_here":"Responda Aqui","reply":"Responder","cancel":"Cancelar","create_topic":"Criar Tópico","create_pm":"Mensagem","create_whisper":"Sussurro","create_shared_draft":"Criar Rascunho Partilhado","edit_shared_draft":"Editrar Rascunho Partilhado","title":"Ou prima Ctrl+Enter","users_placeholder":"Adicionar um utilizador","title_placeholder":"Numa breve frase, de que se trata esta discussão?","title_or_link_placeholder":"Digite o título, ou cole aqui uma hiperligação","edit_reason_placeholder":"Porque está a editar?","topic_featured_link_placeholder":"Inserir hiperligação mostrada com o título.","remove_featured_link":"Remover hiperligação do tópico.","reply_placeholder":"Digite aqui. Utilize Markdown, BBCode, ou HTML para formatar. Arraste ou cole imagens.","reply_placeholder_no_images":"Digite aqui. Utilize Markdown, BBCode, ou HTML para formatar.","reply_placeholder_choose_category":"Selecione uma categoria antes de digitar aqui.","view_new_post":"Ver a sua nova publicação.","saving":"A Guardar","saved":"Guardado!","saved_draft":"Publicar rascunho em andamento. Toque para retomar.","uploading":"A enviar…","show_preview":"mostrar pré-visualização","hide_preview":"ocultar pré-visualização","quote_post_title":"Citar toda a publicação","bold_label":"B","bold_title":"Negrito","bold_text":"texto em negrito","italic_label":"I","italic_title":"Itálico","italic_text":"texto em itálico","link_title":"Hiperligação","link_description":"insira aqui a descrição da hiperligação","link_dialog_title":"Inserir Hiperligação","link_optional_text":"título opcional","link_url_placeholder":"Cole um URL ou digite para pesquisar tópicos","blockquote_title":"Bloco de Citação","blockquote_text":"Bloco de Citação","code_title":"Texto pré-formatado","code_text":"Indentar texto pré-formatado até 4 espaços","paste_code_text":"digite ou cole aqui o código","upload_title":"Enviar","upload_description":"digite aqui a descrição do ficheiro a enviar","olist_title":"Lista numerada","ulist_title":"Lista de items","list_item":"Item da Lista","toggle_direction":"Alternar Direção","help":"Ajuda de Edição Markdown","collapse":"minimizar o painel de composição","open":"abrir o painel compositor","abandon":"fechar painel de composição e rejeitar rascunho","enter_fullscreen":"entrar no compositor de ecrã inteiro","exit_fullscreen":"sair do compositor de ecrã inteiro","show_toolbar":"mostrar barra de compositor","hide_toolbar":"esconder barra de compositor","modal_ok":"CONFIRMAR","modal_cancel":"Cancelar","cant_send_pm":"Desculpe, não pode enviar uma mensagem para %{username}.","yourself_confirm":{"title":"Esqueceu-se de adicionar os destinatários?","body":"De momento esta mensagem está a ser enviada apenas para si!"},"slow_mode":{"error":"Este tópico está em modo lento. Você já publicou recentemente; pode publicar novamente em %{timeLeft}."},"admin_options_title":"Configurações opcionais da equipa para este tópico","composer_actions":{"reply":"Responder","draft":"Rascunho","edit":"Editar","reply_to_post":{"label":"Responder a uma publicação de %{postUsername}","desc":"Responder a uma publicação específica"},"reply_as_new_topic":{"label":"Responder como tópico relacionado","desc":"Crie um novo tópico relacionado com este tópico","confirm":"Você tem um novo rascunho de tópico guardado que será substituído se criar um tópico ligado."},"reply_as_new_group_message":{"label":"Responder como uma nova mensagem de grupo"},"reply_as_private_message":{"label":"Nova mensagem","desc":"Crie uma nova mensagem privada"},"reply_to_topic":{"label":"Responder ao tópico","desc":"Responder ao tópico, não a uma publicação especifica"},"toggle_whisper":{"label":"Alternar sussurro","desc":"Os sussurros são apenas visíveis para os membros da equipa"},"create_topic":{"label":"Novo Tópico"},"shared_draft":{"label":"Rascunho Partilhado","desc":"Escrever um rascunho de tópico que só pode ser visível para usuários permitidos"},"toggle_topic_bump":{"label":"Alterar possibilidade de bump de tópico","desc":"Responder sem alterar a data de última resposta"}},"reload":"Recarregar","ignore":"Ignorar","details_title":"Resumo","details_text":"Este texto será ocultado"},"notifications":{"tooltip":{"regular":{"one":"Uma notificação não visualizada","other":"%{count} notificações não visualizadas"},"message":{"one":"Uma mensagem não lida","other":"%{count} mensagens não lidas"},"high_priority":{"one":"%{count} notificação de alta prioridade não lida","other":"%{count} notificações de alta prioridade não lidas"}},"title":"notificações de menções de @name, respostas às suas publicações e tópicos, mensagens, etc","none":"De momento, não é possível carregar as notificações.","empty":"Não foram encontradas notificações.","post_approved":"A sua publicação foi aprovada","reviewable_items":"itens que requerem revisão","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} e %{count} outro\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} e %{count} outros\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"gostou de %{count} das suas publicações","other":"gostou de %{count} das suas publicações"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e%{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e aceitou o seu convite","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e movido %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Ganhou '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNovo Tópico\u003c/span\u003e %{description}","membership_request_accepted":"Adesão aceite em '%{group_name}'","membership_request_consolidated":{"one":"%{count} solicitação de adesão aberta para '%{group_name}'","other":"%{count} solicitações de adesão abertas para '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - concluído","group_message_summary":{"one":"%{count} mensagem no seu grupo %{group_name}","other":"%{count} mensagens no seu grupo %{group_name}"},"popup":{"mentioned":"%{username} mencionou-o em \"%{topic}\" - %{site_title}","group_mentioned":"%{username} mencionou-o em \"%{topic}\" - %{site_title}","quoted":"%{username} citou-o em \"%{topic}\" - %{site_title}","replied":"%{username} respondeu-lhe em \"%{topic}\" - %{site_title}","posted":"%{username} publicou em \"%{topic}\" - %{site_title}","private_message":"%{username} enviou-lhe uma mensagem privada em \"%{topic}\" - %{site_title}","linked":"%{username} ligou à sua publicação de \"%{topic}\" - %{site_title}","watching_first_post":"%{username} criou um novo tópico \"%{topic}\" - %{site_title}","confirm_title":"Notificações ativas - %{site_title}","confirm_body":"Sucesso! As notificações foram ativadas.","custom":"Notificação de %{username} em %{site_title}"},"titles":{"mentioned":"mencionado","replied":"nova resposta","quoted":"citado","edited":"editado","liked":"novo like","private_message":"nova mensagem particular","invited_to_private_message":"convidado para mensagem particular","invitee_accepted":"convite aceito","posted":"nova postagem","moved_post":"post movido","linked":"linkado","bookmark_reminder":"lembrete de favorito","bookmark_reminder_with_name":"lembrete de favorito - %{name}","granted_badge":"emblema concedido","invited_to_topic":"convidado ao tópico","group_mentioned":"grupo mencionado","group_message_summary":"novas mensagens de grupo","watching_first_post":"novo tópico","topic_reminder":"lembrete do tópico","liked_consolidated":"novas curtidas","post_approved":"mensagem aprovada","membership_request_consolidated":"novas solicitações de participação","reaction":"nova reação","votes_released":"O voto foi liberado"}},"upload_selector":{"uploading":"A enviar","processing":"Processando Upload","select_file":"Selecionar Ficheiro","default_image_alt_text":"imagem"},"search":{"sort_by":"Ordenar por","relevance":"Relevância","latest_post":"Publicação Mais Recente","latest_topic":"Tópico Mais Recente","most_viewed":"Mais Visualizado","most_liked":"Mais Gostos","select_all":"Selecionar Tudo","clear_all":"Limpar Tudo","too_short":"O seu termo de pesquisa é muito curto.","result_count":{"one":"\u003cspan\u003e%{count} resultado para\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} resultados para\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"pesquisar por tópicos, publicações, utilizadores, ou categorias","full_page_title":"pesquisar tópicos e publicações","no_results":"Não foram encontrados resultados.","no_more_results":"Não foram encontrados mais resultados.","post_format":"#%{post_number} por %{username}","results_page":"Resultados da pesquisa por '%{term}'","more_results":"Existem mais resultados. Por favor adicione mais critérios de pesquisa.","cant_find":"Não encontra o que procura?","start_new_topic":"Talvez criar um novo tópico?","or_search_google":"Ou experimente pesquisar com o Google:","search_google":"Experimente pesquisar com o Google:","search_google_button":"Google","search_button":"Pesquisar","context":{"user":"Procurar publicações por @%{username}","category":"Pesquise na categoria #%{category}","tag":"Pesquisar a tag #%{tag}","topic":"Pesquisar este tópico","private_messages":"Pesquisar mensagens"},"advanced":{"title":"Pesquisa Avançada","posted_by":{"label":"Publicado por"},"in_category":{"label":"Categorizado"},"in_group":{"label":"No Grupo"},"with_badge":{"label":"Com Crachá"},"with_tags":{"label":"Com etiqueta"},"filters":{"label":"Mostrar apenas tópicos/publicações...","title":"Pesquisar apenas no título","likes":"eu gostei","posted":"Eu publiquei em","created":"Eu criei","watching":"estou a vigiar","tracking":"estou a seguir","private":"Nas minhas mensagens","bookmarks":"Adicionei aos marcadores","first":"são a primeira publicação","pinned":"estão afixados","seen":"Eu li","unseen":"Eu não li","wiki":"são wiki","images":"incluir imagens","all_tags":"Todas as etiquetas acima"},"statuses":{"label":"Aonde tópicos","open":"estão abertos","closed":"estão fechados","public":"são públicos","archived":"estão arquivados","noreplies":"têm zero respostas","single_user":"contêm um único utilizador"},"post":{"count":{"label":"Publicações"},"min":{"placeholder":"mínimo"},"max":{"placeholder":"máximo"},"time":{"label":"Publicada","before":"antes","after":"depois"}},"views":{"label":"Vistas"},"min_views":{"placeholder":"mínimo"},"max_views":{"placeholder":"máximo"}}},"hamburger_menu":"ir para outra lista de tópicos ou categorias","new_item":"novo","go_back":"voltar atrás","not_logged_in_user":"página de utilizador com resumo da atividade atual e preferências ","current_user":"ir para a sua página de utilizador","view_all":"ver todos %{tab}","topics":{"new_messages_marker":"última visita","bulk":{"select_all":"Selecionar Tudo","clear_all":"Remover Tudo","unlist_topics":"Remover Tópicos da Lista","relist_topics":"Voltar a Listar Tópicos","reset_read":"Repor Leitura","delete":"Eliminar Tópicos","dismiss":"Marcar Visto","dismiss_read":"Marcar todos os não lidos como vistos","dismiss_read_with_selected":{"one":"Dispensar %{count} não lido(s)","other":"Descartar %{count} não lidos"},"dismiss_button":"Marcar visto...","dismiss_button_with_selected":{"one":"Descartar (%{count})…","other":"Descartar (%{count})…"},"dismiss_tooltip":"rejeitar apenas as novas mensagens ou deixar de seguir os tópicos","also_dismiss_topics":"Parar de seguir estes tópicos para que estes nunca me apareçam como não lidos novamente","dismiss_new":"Marcar Visto Novos","dismiss_new_with_selected":{"one":"Descartar Novo (%{count})","other":"Descartar Novos (%{count})"},"toggle":"ativar seleção em massa de tópicos","actions":"Ações em Massa","close_topics":"Fechar Tópicos","archive_topics":"Arquivar tópicos","move_messages_to_inbox":"Mover para a Caixa de Entrada","change_notification_level":"Alterar Nível de Notificação","choose_new_category":"Escolha a nova categoria para os tópicos:","selected":{"one":"Selecionou \u003cb\u003e%{count}\u003c/b\u003e tópico.","other":"Selecionou \u003cb\u003e%{count}\u003c/b\u003e tópicos."},"change_tags":"Substituir Etiquetas","append_tags":"Anexar Etiquetas","choose_new_tags":"Escolha novas etiquetas para estes tópicos:","choose_append_tags":"Escolha novas etiquetas para acrescentar a estes tópicos:","changed_tags":"As etiquetas para esses tópicos foram mudadas.","remove_tags":"Remover Todas as Etiquetas","confirm_remove_tags":{"one":"Todas as etiquetas serão removidas deste tópico. Tem a certeza?","other":"Todas as etiquetas serão removidas de \u003cb\u003e%{count}\u003c/b\u003e tópicos. Tem a certeza?"},"progress":{"one":"Progresso: \u003cstrong\u003e%{count}\u003c/strong\u003e tópico","other":"Progresso: \u003cstrong\u003e%{count}\u003c/strong\u003e tópicos"}},"none":{"unread":"Tem tópicos não lidos.","new":"Não tem novos tópicos.","read":"Ainda não leu nenhum tópico.","posted":"Ainda não publicou em nenhum tópico.","latest":"Está tudo atualizado!","bookmarks":"Ainda não marcou nenhum tópico.","category":"Não há tópicos na categoria %{category}.","top":"Não existem tópicos recentes.","educate":{"new":"\u003cp\u003eOs seus novos tópicos irão aparecer aqui. Por defeito, os tópicos são considerados novos e mostrarão o indicador \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e caso tenham sido criados nos últimos 2 dias.\u003c/p\u003e\u003cp\u003ePode alterar isto nas suas \u003ca href=\"%{userPrefsUrl}\"\u003e preferências\u003c/a\u003e.\u003c/p\u003e","unread":"\u003cp\u003eAs suas publicações não lidas aparecem aqui.\u003c/p\u003e\u003cp\u003ePor defeito, tópicos são considerados não lidos e mostrarão contadores de não lidos \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e se você:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCriou o tópico\u003c/li\u003e\u003cli\u003eRespondeu ao tópico\u003c/li\u003e\u003cli\u003eLeu o tópico durante mais de 4 minutos\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOu marcou explicitamente o tópico como Seguido ou Vigiado através do 🔔 em cada tópico.\u003c/p\u003e\u003cp\u003eVisite as suas \u003ca href=\"%{userPrefsUrl}\"\u003epreferências\u003c/a\u003e para alterar isto.\u003c/p\u003e"}},"bottom":{"latest":"Não existem mais tópicos recentes.","posted":"Não existem mais tópicos publicados.","read":"Não existem mais tópicos lidos.","new":"Não existem mais tópicos novos.","unread":"Não existem mais tópicos não lidos.","category":"Não existem mais tópicos na categoria %{category}.","tag":"Não existem mais tópicos em %{tag}.","top":"Não existem mais tópicos recentes.","bookmarks":"Não há mais tópicos marcados."}},"topic":{"filter_to":{"one":"%{count} publicação no tópico","other":"%{count} publicações no tópico"},"create":"Novo Tópico","create_long":"Criar um novo Tópico","open_draft":"Abrir Rascunho","private_message":"Iniciar uma mensagem","archive_message":{"help":"Mover mensagem para o seu arquivo","title":"Arquivo"},"move_to_inbox":{"title":"Mover para Caixa de Entrada","help":"Mover mensagem de volta para a Caixa de Entrada"},"edit_message":{"help":"Editar primeira publicação da mensagem","title":"Editar"},"defer":{"help":"Marcar como não lida","title":"Diferir"},"list":"Tópicos","new":"novo tópico","unread":"não lido","new_topics":{"one":"%{count} novo tópico","other":"%{count} novos tópicos."},"unread_topics":{"one":"%{count} tópico não lido","other":"%{count} tópicos não lidos"},"title":"Tópico","invalid_access":{"title":"O tópico é privado","description":"Pedimos desculpa, mas não tem acesso a esse tópico!","login_required":"Necessita de iniciar sessão para ver este tópico."},"server_error":{"title":"Falha ao carregar tópico","description":"Pedimos desculpa, não conseguimos carregar esse tópico, possivelmente devido a um problema na conexão. Por favor teste novamente. Se o problema persistir, avise-nos."},"not_found":{"title":"Tópico não encontrado","description":"Pedimos desculpa, não foi possível encontrar esse tópico. Talvez tenha sido removido por um moderador?"},"unread_posts":{"one":"tem %{count} mensagem não lida neste tópico","other":"tem %{count} mensagens não lidas neste tópico"},"likes":{"one":"existe %{count} gosto neste tópico","other":"existem %{count} gostos neste tópico"},"back_to_list":"Voltar à lista de Tópicos","options":"Opções do Tópico","show_links":"mostrar hiperligações dentro deste tópico","collapse_details":"ocultar detalhes do tópico","expand_details":"expandir detalhes do tópico","read_more_in_category":"Pretende ler mais? Navegue por outros tópicos em %{catLink} ou %{latestLink}.","read_more":"Pretende ler mais? %{catLink} ou %{latestLink}.","unread_indicator":"Nenhum membro leu o último post deste tópico ainda.","browse_all_categories":"Pesquisar em todas as categorias","browse_all_tags":"Procurar todas as tags","view_latest_topics":"ver os tópicos mais recentes","suggest_create_topic":"Pronto para \u003ca href\u003einiciar uma nova conversa?\u003c/a\u003e","jump_reply_up":"avançar para resposta mais recente","jump_reply_down":"avançar para resposta mais antiga","deleted":"Este tópico foi eliminado","slow_mode_update":{"title":"Modo lento","select":"Os usuários só podem postar neste tópico uma vez a cada:","description":"Para promover um debate ponderado em debates rápidos ou controversos, os usuários devem esperar antes de postar de novo neste tópico.","enable":"Ativar ","update":"Atualização","enabled_until":"Ativado até:","remove":"Desativar","hours":"Horas:","minutes":"Minutos:","seconds":"Segundos:","durations":{"10_minutes":"10 Minutos","15_minutes":"15 Minutos","30_minutes":"30 Minutos","45_minutes":"45 Minutos","1_hour":"1 Hora","2_hours":"2 Horas","4_hours":"4 Horas","8_hours":"8 Horas","12_hours":"12 Horas","24_hours":"24 Horas","custom":"Duração Personalizada"}},"slow_mode_notice":{"duration":"Por favor, aguarde %{duration} entre as publicações neste tópico"},"topic_status_update":{"title":"Temporizador do Tópico","save":"Definir Temporizador","num_of_hours":"Número de horas:","num_of_days":"Número de dias:","remove":"Remover Temporizador","publish_to":"Publicar para:","when":"Quando:","time_frame_required":"Por favor selecione um intervalo de tempo","min_duration":"A duração tem de ser maior que 0","max_duration":"A duração tem de ser inferior a 20 anos"},"auto_update_input":{"none":"Selecione um intervalo de tempo","now":"Agora","later_today":"Hoje, mais tarde","tomorrow":"Amanhã","later_this_week":"No final desta semana","this_weekend":"Este fim de semana","next_week":"Próxima semana","two_weeks":"Duas semanas","next_month":"Próximo mês","two_months":"Dois meses","three_months":"Três meses","four_months":"Quatro meses","six_months":"Seis meses","one_year":"Um ano","forever":"Para Sempre","pick_date_and_time":"Escolha uma data e hora","set_based_on_last_post":"Fechar baseado na última publicação"},"publish_to_category":{"title":"Agendar Publicação"},"temp_open":{"title":"Abrir Temporariamente"},"auto_reopen":{"title":"Abrir Tópico Automaticamente"},"temp_close":{"title":"Fechar Temporariamente"},"auto_close":{"title":"Fechar Tópico Automaticamente","label":"Fechar automaticamente o tópico após:","error":"Por favor introduza um valor válido.","based_on_last_post":"Não fechar até que a última mensagem no tópico tenha este tempo."},"auto_close_after_last_post":{"title":"Fechar automaticamente o tópico após a última publicação"},"auto_delete":{"title":"Remover Tópico Automaticamente"},"auto_bump":{"title":"Fazer Bump ao Tópico Automaticamente"},"reminder":{"title":"Lembrar-me"},"auto_delete_replies":{"title":"Remover automaticamente as respostas"},"status_update_notice":{"auto_open":"Este tópico vai abrir automaticamente %{timeLeft}.","auto_close":"Este tópico vai fechar automaticamente %{timeLeft}.","auto_publish_to_category":"Este tópico vai ser publicado em \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_after_last_post":"Este tópico vai fechar %{duration} depois da última resposta.","auto_delete":"Este tópico vai ser automaticamente eliminado %{timeLeft}.","auto_bump":"Este tópico vai ser automaticamente bumped %{timeLeft}.","auto_reminder":"Irá ser relembrado acerca deste tópico %{timeLeft}.","auto_delete_replies":"As respostas neste tópico são excluídas automaticamente após %{duration}."},"auto_close_title":"Configurações para Fechar Automaticamente","auto_close_immediate":{"one":"A última publicação neste tópico já tem %{count} hora, por isso o tópico será fechado imediatamente.","other":"A última publicação neste tópico já tem %{count} horas, por isso o tópico será fechado imediatamente."},"auto_close_momentarily":{"one":"A última publicação neste tópico já tem %{count} hora, por isso o tópico será fechado imediatamente.","other":"A última publicação neste tópico já tem %{count} horas, por isso o tópico será fechado imediatamente."},"timeline":{"back":"Retroceder","back_description":"Voltar à última publicação não lida","replies_short":"%{current} / %{total}"},"progress":{"title":"progresso do tópico","go_top":"topo","go_bottom":"fim","go":"ir","jump_bottom":"ir para a última publicação","jump_prompt":"ir para...","jump_prompt_long":"Ir para...","jump_bottom_with_number":"ir para a mensagem %{post_number}","jump_prompt_to_date":"ir para data","jump_prompt_or":"ou","total":"total de publicações","current":"publicação atual"},"notifications":{"title":"mudar quão frequentemente é notificado sobre este tópico","reasons":{"mailing_list_mode":"Tem o modo de lista de distribuição activado, por isso será notificado de respostas a este tópico por email.","3_10":"Receberá notificações porque está a vigiar uma etiqueta neste tópico.","3_10_stale":"Você receberá notificações porque estava observando uma tag neste tópico no passado.","3_6":"Receberá notificações porque está a vigiar esta categoria.","3_6_stale":"Você receberá notificações porque estava observando esta categoria no passado.","3_5":"Receberá notificações porque começou a vigiar automaticamente este tópico.","3_2":"Receberá notificações porque está a vigiar este tópico.","3_1":"Receberá notificações porque criou este tópico.","3":"Receberá notificações porque está a vigiar este tópico.","2_8":"Irá ver uma contagem de novas respostas porque está a seguir esta categoria.","2_8_stale":"Você verá uma contagem de novas respostas porque estava rastreando esta categoria no passado.","2_4":"Irá ver uma contagem de novas respostas porque publicou uma resposta a este tópico.","2_2":"Irá ver uma contagem de novas respostas porque está a seguir este tópico.","2":"Irá ver uma contagem de novas respostas, porque \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eleu este tópico\u003c/a\u003e.","1_2":"Será notificado se alguém mencionar o seu @nome ou responder-lhe.","1":"Será notificado se alguém mencionar o seu @nome ou responder-lhe.","0_7":"Está a ignorar todas as notificações nesta categoria.","0_2":"Está a ignorar todas as notificações para este tópico.","0":"Está a ignorar todas as notificações para este tópico."},"watching_pm":{"title":"A vigiar","description":"Será notificado de cada nova resposta nesta mensagem, e uma contagem de novas respostas será exibida."},"watching":{"title":"A vigiar","description":"Será notificado de cada nova resposta neste tópico, e uma contagem de novas respostas será exibida."},"tracking_pm":{"title":"A Seguir","description":"Uma contagem de novas respostas será exibida para esta mensagem. Será notificado se alguém mencionar o seu @nome ou responder-lhe."},"tracking":{"title":"A Seguir","description":"Uma contagem de novas respostas será exibida para este tópico. Será notificado se alguém mencionar o seu @nome ou responder-lhe."},"regular":{"title":"Habitual","description":"Será notificado se alguém mencionar o seu @nome ou responder-lhe."},"regular_pm":{"title":"Habitual","description":"Será notificado se alguém mencionar o seu @nome ou responder-lhe."},"muted_pm":{"title":"Silenciado","description":"Não será notificado de nada relacionado com esta mensagem."},"muted":{"title":"Silenciado","description":"Nunca será notificado de nada acerca deste tópico, e este não irá aparecer nos recentes."}},"actions":{"title":"Ações","recover":"Recuperar Tópico","delete":"Eliminar Tópico","open":"Abrir Tópico","close":"Fechar Tópico","multi_select":"Selecionar Publicações...","timed_update":"Definir Temporizador de Tópico...","pin":"Fixar Tópico...","unpin":"Desafixar Tópico...","unarchive":"Desarquivar Tópico","archive":"Arquivar Tópico","invisible":"Tornar Não Listado","visible":"Tornar Listado","reset_read":"Repor Data de Leitura","make_private":"Tornar Mensagem Pessoal","reset_bump_date":"Reset à Data do Bump"},"feature":{"pin":"Fixar Tópico","unpin":"Desafixar Tópico","pin_globally":"Fixar Tópico Globalmente","remove_banner":"Remover Tópico de Faixa"},"reply":{"title":"Responder","help":"comece a escrever uma resposta a este tópico"},"share":{"title":"Partilhar","extended_title":"Partilhar uma ligação","help":"Partilhar uma ligação para este tópico","instructions":"Compartilhe um link para este tópico:","copied":"Link do tópico copiado.","notify_users":{"title":"Notificar","instructions":"Notifique os seguintes usuários sobre este tópico:","success":{"one":"%{username} notificado com sucesso sobre este tópico.","other":"Todos os usuários foram notificados sobre este tópico."}},"invite_users":"Convidar"},"print":{"title":"Imprimir","help":"Abrir uma versão para impressão deste tópico"},"flag_topic":{"title":"Denunciar","help":"denunciar privadamente este tópico para consideração ou enviar uma notificação privada sobre o mesmo","success_message":"Denunciou este tópico com sucesso."},"make_public":{"title":"Converter para Tópico Público","choose_category":"Escolha uma categoria para o tópico público:"},"feature_topic":{"title":"Destacar este tópico","pin":"Fazer este tópico aparecer no topo da categoria %{categoryLink} até","unpin":"Remover este tópico do topo da categoria %{categoryLink}.","unpin_until":"Remover este tópico do topo da categoria %{categoryLink} ou espere até \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Os utilizadores podem desafixar individualmente o tópico por si próprios.","pin_validation":"É necessária uma data para fixar este tópico.","not_pinned":"Não há tópicos fixados em %{categoryLink}.","already_pinned":{"one":"Tópicos atualmente afixados em %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Tópicos atualmente afixados em %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Fazer com que este tópico apareça no topo da lista de todos os tópicos até","unpin_globally":"Remover este tópico do topo de todas as listas de tópicos.","unpin_globally_until":"Remover este tópico do topo da lista de todos os tópicos ou espere até \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Os utilizadores podem desafixar individualmente o tópico por si próprios.","not_pinned_globally":"Não existem tópicos fixados globalmente.","already_pinned_globally":{"one":"Tópicos atualmente afixados globalmente: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Tópicos atualmente afixados globalmente: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Tornar este tópico numa faixa que apareça no topo de todas as páginas.","remove_banner":"Remover a faixa que aparece no topo de todas as páginas.","banner_note":"Os utilizadores podem marcar vista a faixa por fecharem-na. Apenas um tópico pode ser posto como faixa em qualquer momento.","no_banner_exists":"Não existe tópico de faixa.","banner_exists":"\u003cstrong class='badge badge-notification unread'\u003eExiste\u003c/strong\u003e atualmente um tópico de faixa."},"inviting":"A Convidar...","automatically_add_to_groups":"Este convite também inclui acesso a estes grupos:","invite_private":{"title":"Convidar para Mensagem","email_or_username":"Email ou Nome de Utilizador do Convidado","email_or_username_placeholder":"endereço de email ou nome de utilizador","action":"Convidar","success":"Convidámos esse utilizador para participar nesta mensagem.","success_group":"Convidámos esse grupo para participar nesta mensagem.","error":"Pedimos desculpa, ocorreu um erro ao convidar esse utilizador.","not_allowed":"Desculpe, esse usuário não pode ser convidado.","group_name":"nome do grupo"},"controls":"Controlos de Tópico","invite_reply":{"title":"Convidar","username_placeholder":"nome de utilizador","action":"Enviar Convite","help":"convidar outros para este tópico via email ou notificações","discourse_connect_enabled":"Informe o nome de usuário da pessoa que gostaria de convidar para este tópico.","to_topic_blank":"Introduza o nome de utilizador ou endereço de email da pessoa que gostaria de convidar para este tópico.","to_topic_email":"Introduziu um endereço de email. Iremos enviar um email com um convite que permite aos seus amigos responderem a este tópico imediatamente.","to_topic_username":"Você informou um nome de usuário. Enviaremos uma notificação com um link convidando-o para este tópico.","to_username":"Introduza o nome de utilizador da pessoa que deseja convidar. Iremos enviar-lhe uma notificação com uma ligação convidando-o para este tópico.","email_placeholder":"nome@exemplo.com","success_email":"Enviámos por email um convite para \u003cb\u003e%{invitee}\u003c/b\u003e. Iremos notificá-lo quando o convite for utilizado. Verifique o separador de convites na sua página de utilizador para acompanhar os seus convites.","success_username":"Convidámos esse utilizador para participar neste tópico.","error":"Pedimos desculpa, não conseguimos convidar essa pessoa. Talvez já tenha sido convidado? (Os convites são limitados)","success_existing_email":"Já existe um utilizador com o email \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. Convidámos esse utilizador a participar neste tópico."},"login_reply":"Iniciar sessão para Responder","filters":{"n_posts":{"one":"%{count} publicação","other":"%{count} publicações"},"cancel":"Remover filtro"},"move_to":{"title":"Mover para","action":"mover para","error":"Ocorreu um erro a mover publicações."},"split_topic":{"title":"Mover para um Novo Tópico","action":"mover para um novo tópico","topic_name":"Título do Novo Tópico","radio_label":"Novo Tópico","error":"Ocorreu um erro ao mover as publicações para um novo tópico.","instructions":{"one":"Está prestes a criar um novo tópico e a incorporar a mensagem que selecionou.","other":"Está prestes a criar um novo tópico e a incorporar \u003cb\u003e%{count}\u003c/b\u003emensagens que selecionou."}},"merge_topic":{"title":"Mover para Tópico Existente","action":"mover para tópico existente","error":"Ocorreu um erro ao mover as publicações para esse tópico.","radio_label":"Tópico Existente","instructions":{"one":"Por favor, escolha o tópico para o qual gostaria de mover esta mensagem.","other":"Por favor, escolha o tópico para o qual gostaria de mover estas \u003cb\u003e%{count}\u003c/b\u003e mensagens."}},"move_to_new_message":{"title":"Mover para Nova Mensagem","action":"mover para nova mensagem","message_title":"Título da Nova Mensagem","radio_label":"Nova Mensagem","participants":"Participantes"},"move_to_existing_message":{"title":"Mover para Mensagem Existente","action":"mover para mensagem existente","radio_label":"Mensagem Existente","participants":"Participantes","instructions":{"one":"Por favor, escolha a mensagem para a qual gostaria de mover essa postagem.","other":"Por favor, escolha a mensagem para a qual você gostaria de mover essas \u003cb\u003e%{count}\u003c/b\u003e  postagens."}},"merge_posts":{"title":"Juntar Mensagens Selecionadas","action":"juntar publicações selecionadas","error":"Ocorreu um erro ao juntar as mensagens selecionadas."},"publish_page":{"title":"Publicação de Página","publish":"Publicar","description":"Quando um tópico é publicado como uma página, sua URL pode ser compartilhada e ela será exibida com um estilo personalizado.","slug":"Slug","public":"Público","public_description":"As pessoas podem ver a página mesmo se o tópico associado for particular.","publish_url":"Sua página foi publicada em:","topic_published":"Seu tópico foi publicado em:","preview_url":"Sua página será publicada em:","invalid_slug":"Desculpe, você não pode publicar esta página.","unpublish":"Anular a publicação","unpublished":"Sua página foi despublicada e não está mais acessível.","publishing_settings":"Configurações de Publicação"},"change_owner":{"title":"Alterar Proprietário","action":"mudar titularidade","error":"Ocorreu um erro ao alterar e dono das mensagens.","placeholder":"nome de utilizador do novo proprietário","instructions":{"one":"Escolha um novo dono para o post de \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Escolha um novo dono para os %{count} posts de \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Escolha um novo dono para o post","other":"Escolha um novo dono para os %{count} posts"}},"change_timestamp":{"title":"Alterar Timestamp...","action":"alterar selo temporal","invalid_timestamp":"O selo temporal não pode ser no futuro.","error":"Ocorreu um erro ao alterar o selo temporal do tópico.","instructions":"Por favor, selecione a nova data / hora do tópico. As mensagens no tópico serão atualizadas para terem a mesma diferença da data / hora."},"multi_select":{"select":"selecionar","selected":"(%{count}) selecionados","select_post":{"label":"selecionar","title":"Adicionar postagem à seleção"},"selected_post":{"label":"selecionado","title":"Clique para desseleccionar a mensagem"},"select_replies":{"label":"selecione +respostas","title":"Adicionar postagem e todas as suas respostas à seleção"},"select_below":{"label":"Selecione +abaixo","title":"Adicionar a postagem e tudo após ela à seleção"},"delete":"eliminar selecionados","cancel":"cancelar seleção","select_all":"selecionar tudo","deselect_all":"desmarcar tudo","description":{"one":"Selecionou \u003cb\u003e%{count}\u003c/b\u003e publicação.","other":"Selecionou \u003cb\u003e%{count}\u003c/b\u003e publicações."}},"deleted_by_author_simple":"(tópico excluído pelo autor)"},"post":{"quote_reply":"Citar","quote_share":"Partilhar","edit_reason":"Motivo:","post_number":"publicação %{number}","ignored":"Conteúdo ignorado","wiki_last_edited_on":"wiki editado pela última vez em %{dateTime}","last_edited_on":"postagem editada pela última vez em %{dateTime}","reply_as_new_topic":"Responder com novo Tópico","reply_as_new_private_message":"Responda como uma nova mensagem aos mesmos destinatários","continue_discussion":"Continuar a discussão de %{postLink}:","follow_quote":"ir para a publicação citada","show_full":"Mostrar Mensagem Completa","show_hidden":"Veja o conteúdo ignorado.","deleted_by_author_simple":"(postagem excluída pelo autor)","collapse":"colapsar","expand_collapse":"expandir/colapsar","locked":"um membro da equipa bloqueou a edição desta publicação","gap":{"one":"ver %{count} resposta oculta","other":"ver %{count} respostas ocultas"},"notice":{"new_user":"Esta é a primeira vez que %{user} postou — vamos dar-lhe as boas-vindas à nossa comunidade!","returning_user":"Já faz algum tempo que não víamos %{user} por aqui — a última publicação foi a %{time}."},"unread":"Publicação não lida","has_replies":{"one":"%{count} Resposta","other":"%{count} Respostas"},"has_replies_count":"%{count}","unknown_user":"(usuário desconhecido/excluído)","has_likes_title":{"one":"%{count} pessoa gostou desta mensagem","other":"%{count} pessoas gostaram desta mensagem"},"has_likes_title_only_you":"você gostou desta mensagem","has_likes_title_you":{"one":"você e %{count} outra pessoa gostaram desta publicação","other":"você e %{count} outras pessoas gostaram desta publicação"},"filtered_replies_hint":{"one":"Ver este post e a sua resposta","other":"Ver este post e as suas %{count} respostas"},"filtered_replies_viewing":{"one":"Visualizando %{count} resposta para","other":"Visualizando %{count} respostas para"},"in_reply_to":"Carregar post principal","view_all_posts":"Ver todos os posts","errors":{"create":"Desculpe, ocorreu um erro ao criar a sua mensagem. Por favor, tente novamente.","edit":"Desculpe, ocorreu um erro ao editar a sua mensagem. Por favor, tente novamente.","upload":"Pedimos desculpa, ocorreu um erro ao carregar esse ficheiro. Por favor, tente novamente.","file_too_large":"Desculpe, esse ficheiro é demasiado grande (o tamanho máximo é %{max_size_kb}kb). Por que não enviar o seu grande ficheiro para um serviço de partilha na nuvem e, de seguida, colar o link?","too_many_uploads":"Pedimos desculpa, só pode carregar um ficheiro de cada vez.","too_many_dragged_and_dropped_files":{"one":"Desculpe, só pode enviar %{count} ficheiro de cada vez.","other":"Desculpe, só pode enviar %{count} ficheiros de cada vez."},"upload_not_authorized":"Pedimos desculpa, o ficheiro que está a tentar carregar não está autorizado (extensões autorizadas: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Pedimos desculpa, os novos utilizadores não podem carregar imagens.","attachment_upload_not_allowed_for_new_user":"Pedimos desculpa, os novos utilizadores não podem carregar anexos.","attachment_download_requires_login":"Desculpe, deve estar autenticado para transferir os anexos."},"cancel_composer":{"confirm":"O que gostaria de fazer com a sua publicação?","discard":"Descartar","save_draft":"Salvar rascunho para mais tarde","keep_editing":"Prosseguir a edição"},"via_email":"esta mensagem chegou por ''e-mail''","via_auto_generated_email":"esta publicação chegou via um email gerado automaticamente","whisper":"esta publicação é um susurro privado para os moderadores","wiki":{"about":"esta publicação é uma wiki"},"few_likes_left":"Obrigado por partilhar o amor! Restam-lhe apenas um gostos para hoje.","controls":{"reply":"começar a compor uma resposta a este tópico","like":"gostar desta mensagem","has_liked":"gostou desta mensagem","read_indicator":"membros que leram esta publicação","undo_like":"desfazer gosto","edit":"editar esta publicação","edit_action":"Editar","edit_anonymous":"Pedimos desculpa, mas necessita de ter sessão iniciada para editar esta publicação.","flag":"sinalizar privadamente esta mensagem para moderação ou enviar uma notificação privada sobre a mesma","delete":"eliminar esta publicação","undelete":"restaurar esta mensagem","share":"partilhar uma ligação a esta publicação","more":"Mais","delete_replies":{"confirm":"Deseja também eliminar as respostas a esta publicação?","direct_replies":{"one":"Sim, e %{count} resposta direta","other":"Sim, e %{count} respostas diretas"},"all_replies":{"one":"Sim, e %{count} resposta","other":"Sim, e todas as %{count} respostas"},"just_the_post":"Não, apenas esta mensagem"},"admin":"ações administrativas de publicação","wiki":"Fazer Wiki","unwiki":"Remover Wiki","convert_to_moderator":"Adicionar Cor do Pessoal","revert_to_regular":"Remover Cor do Pessoal","rebake":"Reconstruir HTML","publish_page":"Publicação de Página","unhide":"Mostrar","lock_post":"Bloquear Post","lock_post_description":"impedir o autor de editar esta publicação","unlock_post":"Desbloquear Post","unlock_post_description":"permitir ao autor editar esta publicação","delete_topic_disallowed_modal":"Você não tem permissão para excluir este tópico. Se deseja realmente que ele seja excluído, sinalize-o para o moderador, juntamente com uma explicação.","delete_topic_disallowed":"não tem permissão para excluir este tópico","delete_topic_confirm_modal_yes":"Sim, exclua este tópico","delete_topic_confirm_modal_no":"Não, mantenha este tópico","delete_topic_error":"Ocorreu um erro ao excluir este tópico","delete_topic":"eliminar tópico","delete_post_notice":"Apagar Aviso da Equipa","remove_timer":"remover timer","edit_timer":"editar temporizador"},"actions":{"people":{"like":{"one":"gostou disto","other":"gostou disto"},"read":{"one":"leia isso","other":"leia isso"},"like_capped":{"one":"e %{count} outro curtiram isso","other":"e %{count} outros curtiram isso"},"read_capped":{"one":"e %{count} outro leram isso","other":"e %{count} outros leram isso"}},"by_you":{"off_topic":"Denunciou isto como fora de contexto","spam":"Denunciou isto como spam","inappropriate":"Denunciou isto como inapropriado","notify_moderators":"Denunciou isto para moderação","notify_user":"Enviou uma mensagem a este utilizador"}},"revisions":{"controls":{"first":"Primeira revisão","previous":"Revisão anterior","next":"Próxima revisão","last":"Última revisão","hide":"Esconder revisão","show":"Mostrar revisão","edit_wiki":"Editar Wiki","edit_post":"Editar Mensagem"},"displays":{"inline":{"title":"Mostrar o resultado renderizado com inserções e remoções em-linha.","button":"HTML"},"side_by_side":{"title":"Mostrar o resultado renderizado das diferenças lado-a-lado","button":"HTML"},"side_by_side_markdown":{"title":"Mostrar em bruto a fonte das diferenças lado-a-lado","button":"Em bruto"}}},"raw_email":{"displays":{"raw":{"title":"Mostre o e-mail bruto","button":"Em bruto"},"text_part":{"title":"Mostra a parte do texto do e-mail","button":"Texto"},"html_part":{"title":"Mostra a parte html do e-mail","button":"HTML"}}},"bookmarks":{"create":"Criar favorito","edit":"Editar favorito","created":"Criado","updated":"Atualização","name":"Nome","name_placeholder":"Para que serve este favorito?","set_reminder":"Me lembrar","options":"Opções","actions":{"delete_bookmark":{"name":"Excluir favorito","description":"Exclui o favorito do seu perfil e para todos os lembretes do favorito"},"edit_bookmark":{"name":"Editar favorito","description":"Edite o nome do favorito ou altere a data e hora do lembrete"},"pin_bookmark":{"name":"Fixar favorito","description":"Fixar o favorito. Isto o fará aparecer no topo da sua lista de favoritos."},"unpin_bookmark":{"name":"Desafixar favorito","description":"Desafixar o favorito. Ele não aparecerá mais no topo da sua lista de favoritos."}}},"filtered_replies":{"viewing_posts_by":"Visualizando %{post_count} posts por","viewing_subset":"Algumas respostas estão recolhidas","viewing_summary":"Vendo um resumo deste tópico","post_number":"%{username}, post #%{post_number}","show_all":"Mostrar tudo"}},"category":{"none":"(sem categoria)","all":"Todas as categorias","choose":"categoria\u0026hellip;","edit":"Editar","edit_dialog_title":"Editar: %{categoryName}","view":"Visualizar Tópicos na Categoria","back":"Voltar para a categoria","general":"Geral","settings":"Configurações","topic_template":"Modelo do Tópico","tags":"Etiquetas","tags_allowed_tags":"Restringir essas tags a esta categoria:","tags_allowed_tag_groups":"Restringir esses grupos de tags a esta categoria:","tags_placeholder":"(Opcional) lista de etiquetas perimitidas","tags_tab_description":"Tags e grupos de tags especificados acima só estarão disponíveis nesta categoria e em outras categorias que também os especificam. Eles não estarão disponíveis para uso em outras categorias.","tag_groups_placeholder":"(Opcional) lista de grupos de etiquetas permitidos","manage_tag_groups_link":"Gerenciar grupos de tags","allow_global_tags_label":"Permita também outras tags","tag_group_selector_placeholder":"(Opcional) Grupo de tags","required_tag_group_description":"Exigir que novos tópicos tenham tags de um grupo de tags:","min_tags_from_required_group_label":"Número de Tags:","required_tag_group_label":"Grupo de tags:","topic_featured_link_allowed":"Permitir links em destaque nesta categoria","delete":"Eliminar Categoria","create":"Nova Categoria","create_long":"Criar uma nova categoria","save":"Guardar Categoria","slug":"Título da Categoria","slug_placeholder":"(Opcional) palavras com travessão no URL","creation_error":"Ocorreu um erro durante a criação da categoria.","save_error":"Ocorreu um erro ao guardar a categoria.","name":"Nome da Categoria","description":"Descrição","logo":"Logótipo da Categoria","background_image":"Imagem de Fundo da Categoria","badge_colors":"Cores do crachá","background_color":"Cor de fundo","foreground_color":"Cor frontal","name_placeholder":"Máximo de uma ou duas palavras","color_placeholder":"Qualquer cor da internet","delete_confirm":"Tem a certeza que deseja eliminar esta categoria?","delete_error":"Ocorreu um erro ao eliminar a categoria.","list":"Lista de Categorias","no_description":"Por favor adicione uma descrição para esta categoria.","change_in_category_topic":"Editar Descrição","already_used":"Esta cor já foi usada para outra categoria","security":"Segurança","security_add_group":"Adicionar um grupo","permissions":{"group":"Grupo","see":"Ver","reply":"Responder","create":"Criar","no_groups_selected":"Nenhum grupo recebeu acesso; essa categoria só ficará visível para a equipe.","everyone_has_access":"Esta categoria é pública, todos podem ver, responder e criar posts. Para restringir as permissões, remova uma ou mais das permissões concedidas ao grupo \"todos\".","toggle_reply":"Alternar permissão Responder","toggle_full":"Alternar permissão Criar","inherited":"Esta permissão é herdada de \"todos\""},"special_warning":"Aviso: Esta categoria é uma categoria pré-preenchida e as configurações de segurança não podem ser editadas. Se não deseja utilizar esta categoria, elimine-a em vez de lhe dar um novo propósito.","uncategorized_security_warning":"Essa categoria é especial. Destina-se como área de retenção para tópicos que não têm categoria; ela não pode ter configurações de segurança.","uncategorized_general_warning":"Esta categoria é especial. É usada como categoria padrão para novos tópicos que não possuem uma categoria selecionada. Se você quiser evitar esse comportamento e forçar a seleção da categoria, \u003ca href=\"%{settingLink}\"\u003epor gentileza, desative a configuração aqui\u003c/a\u003e. Se você quiser alterar o nome ou a descrição, vá para \u003ca href=\"%{customizeLink}\"\u003ePersonalizar / Conteúdo do Texto\u003c/a\u003e.","pending_permission_change_alert":"Você não adicionou %{group} a esta categoria; clique neste botão para adicioná-los.","images":"Imagens","email_in":"Endereço de email personalizado para emails recebidos:","email_in_allow_strangers":"Aceitar emails de utilizadores anónimos sem conta","email_in_disabled":"Publicar novos tópicos através do email está desactivado nas Configurações do Sítio. Para permitir a publicação de novos tópicos através do email,","email_in_disabled_click":"ative a definição \"email em\".","mailinglist_mirror":"Categoria espelha uma lista de e-mails","show_subcategory_list":"Mostrar lista de subcategorias acima dos tópicos desta categoria.","read_only_banner":"Texto do banner para quando um usuário não pode criar um tópico nesta categoria:","num_featured_topics":"Número de tópicos mostrados na página de categorias:","subcategory_num_featured_topics":"Número de tópicos em destaque na página da categoria superior:","all_topics_wiki":"Tornar novos tópicos wikis por padrão","allow_unlimited_owner_edits_on_first_post":"Permitir edições ilimitadas do proprietário na primeira postagem","subcategory_list_style":"Estilo da Lista de Subcategorias:","sort_order":"Lista de Tópicos Ordenada Por:","default_view":"Lista de Tópicos Padrão:","allow_badges_label":"Permitir a atribuição de crachás nesta categoria","edit_permissions":"Editar Permissões","review_group_name":"nome do grupo","this_year":"este ano","default_position":"Posição Padrão","position_disabled":"As categorias serão exibidas por ordem de actividade. Para controlar a ordenação das categorias nas listas,","position_disabled_click":"ative a definição \"categoria em posição fixa\".","parent":"Categoria Principal","notifications":{"watching":{"title":"A vigiar"},"watching_first_post":{"title":"A Vigiar a Primeira Mensagem"},"tracking":{"title":"A Seguir"},"regular":{"title":"Normal","description":"Será notificado se alguém mencionar o seu @nome ou responder-lhe."},"muted":{"title":"Silenciado"}},"search_priority":{"label":"Prioridade da Pesquisa","options":{"normal":"Normal","ignore":"Ignorar","very_low":"Muito Baixa","low":"Baixa","high":"Elevado","very_high":"Muito Alta"}},"sort_options":{"default":"predefinida","likes":"Gostos","op_likes":"Gostos à Publicação Original","views":"Vistas","posts":"Publicações","activity":"Actividade","posters":"Autores","category":"Categoria","created":"Criado"},"sort_ascending":"Ascendente","sort_descending":"Descendente","subcategory_list_styles":{"rows":"Linhas","rows_with_featured_topics":"Linhas com tópicos em destaque","boxes":"Caixas","boxes_with_featured_topics":"Caixas com tópicos em destaque"},"settings_sections":{"general":"Geral","moderation":"Moderação","appearance":"Aparência","email":"E-mail"},"list_filters":{"all":"todos os tópicos","none":"sem subcategorias"}},"flagging":{"title":"Obrigado por ajudar a manter a nossa comunidade cívica!","action":"Denunciar Publicação","take_action":"Tomar Ação...","take_action_options":{"default":{"title":"Acionar","details":"Atingir imediatamente o limite de denúncias, em vez de esperar por mais denúncias da comunidade"},"suspend":{"title":"Utilizador Suspenso","details":"Chegar ao limite de sinalizações e suspender o usuário"},"silence":{"title":"Silenciar Usuário","details":"Chegar ao limite de sinalizações e silenciar o usuário"}},"notify_action":"Mensagem","official_warning":"Aviso Oficial","delete_spammer":"Eliminar Spammer","flag_for_review":"Enfileirar Para Revisão","yes_delete_spammer":"Sim, Eliminar Spammer","ip_address_missing":"(N/A)","hidden_email_address":"(escondido)","submit_tooltip":"Submeter a denúncia privada","take_action_tooltip":"Atingir imediatamente o limite de denúncias, em vez de esperar por mais denúncias da comunidade","cant":"Pedimos desculpa, não é possível colocar uma denúncia nesta publicação neste momento.","notify_staff":"Notificar o pessoal privadamente","formatted_name":{"off_topic":"Está fora do contexto","inappropriate":"É inapropriado","spam":"É Spam"},"custom_placeholder_notify_user":"Seja específico, seja construtivo e seja sempre amável.","custom_placeholder_notify_moderators":"Diga-nos especificamente quais são as suas preocupações, e forneça-nos hiperligações relevantes e exemplo se possível.","custom_message":{"at_least":{"one":"insira pelo menos %{count} caráter","other":"insira pelo menos %{count} carateres"},"more":{"one":"%{count} a seguir...","other":"%{count} a seguir..."},"left":{"one":"%{count} restante","other":"%{count} restantes"}}},"flagging_topic":{"title":"Obrigado por ajudar a manter a nossa comunidade cívica!","action":"Denunciar Tópico","notify_action":"Mensagem"},"topic_map":{"title":"Sumário do Tópico","participants_title":"Autores Frequentes","links_title":"Hiperligações Populares","links_shown":"mostrar mais ligações...","clicks":{"one":"%{count} clique","other":"%{count} cliques"}},"post_links":{"about":"expandir mais ligações para esta publicação","title":{"one":"%{count} mais","other":"%{count} mais"}},"topic_statuses":{"warning":{"help":"Este é um aviso oficial."},"bookmarked":{"help":"Adicionou este tópico aos marcadores"},"locked":{"help":"Este tópico está fechado; já não são aceites novas respostas"},"archived":{"help":"Este tópico está arquivado; está congelado e não pode ser alterado"},"locked_and_archived":{"help":"Este tópico está fechado e arquivado; já não aceita novas respostas e não pode ser modificado"},"unpinned":{"title":"Desafixado","help":"Este tópico foi desafixado por si; será mostrado na ordem habitual"},"pinned_globally":{"title":"Fixado Globalmente","help":"Este tópico está fixado globalmente; será exibido no topo dos recentes e da sua categoria"},"pinned":{"title":"Fixado","help":"Este tópico foi fixado por si; será mostrado no topo da sua categoria"},"unlisted":{"help":"Este tópico não está listado; não será apresentado na lista de tópicos e poderá ser acedido apenas através de uma ligação direta"},"personal_message":{"title":"Este tópico é uma mensagem pessoal","help":"Este tópico é uma mensagem pessoal"}},"posts":"Publicações","original_post":"Publicação Original","views":"Vistas","views_lowercase":{"one":"vista","other":"vistas"},"replies":"Respostas","activity":"Atividade","likes":"Gostos","likes_lowercase":{"one":"gosto","other":"gostos"},"users":"Utilizadores","users_lowercase":{"one":"utilizador","other":"utilizadores"},"category_title":"Categoria","changed_by":"por %{author}","raw_email":{"not_available":"Indisponível!"},"categories_list":"Lista de Categorias","filters":{"with_topics":"%{filter} tópicos","with_category":"%{filter} %{category} tópicos","latest":{"title":"Recente","title_with_count":{"one":"Recente (%{count})","other":"Recentes (%{count})"},"help":"tópicos com publicações recentes"},"read":{"title":"Lido","help":"tópicos que leu, na ordem que os leu"},"categories":{"title":"Categorias","title_in":"Categoria - %{categoryName}","help":"todos os tópicos agrupados por categoria"},"unread":{"title":"Não Lido","title_with_count":{"one":"Não Lido (%{count})","other":"Não Lidos (%{count})"},"help":"tópicos que está atualmente a vigiar ou a seguir com mensagens não lidas","lower_title_with_count":{"one":"%{count} não lido","other":"%{count} não lidos"}},"new":{"lower_title_with_count":{"one":"%{count} novo","other":"%{count} novos"},"lower_title":"novo","title":"Novo","title_with_count":{"one":"Novo (%{count})","other":"Novos (%{count})"},"help":"tópicos criados nos últimos dias"},"posted":{"title":"As Minhas publicações","help":"tópicos em que publicou"},"bookmarks":{"title":"Marcadores","help":"tópicos que marcou"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"tópicos recentes na categoria %{categoryName}"},"top":{"title":"Os Melhores","help":"os tópicos mais ativos no último ano, mês, semana ou dia","all":{"title":"Em Qualquer Altura"},"yearly":{"title":"Anual"},"quarterly":{"title":"Trimestral"},"monthly":{"title":"Mensal"},"weekly":{"title":"Semanal"},"daily":{"title":"Diário"},"all_time":"Em Qualquer Altura","this_year":"Ano","this_quarter":"Trimestre","this_month":"Mês","this_week":"Semana","today":"Hoje"}},"permission_types":{"full":"Criar / Responder / Ver","create_post":"Responder / Ver","readonly":"Ver"},"lightbox":{"download":"transferir","counter":"%curr% de %total%","close":"Fechar (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eO conteúdo\u003c/a\u003e não pôde ser carregado.","image_load_error":"\u003ca href=\"%url%\"\u003eA imagem\u003c/a\u003e não pôde ser carregada."},"cannot_render_video":"Este vídeo não pode ser renderizado porque seu navegador não suporta o codec.","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Atalhos de Teclado","jump_to":{"title":"Ir Para","home":"%{shortcut} Início","latest":"%{shortcut} Recentes","new":"%{shortcut} Novo","unread":"%{shortcut} Não lido","categories":"%{shortcut} Categorias","top":"%{shortcut} Topo","bookmarks":"%{shortcut} Marcadores","profile":"%{shortcut} Perfil","messages":"%{shortcut} Mensagens","drafts":"%{shortcut} Esboços","next":"%{shortcut} Próximo Tópico","previous":"%{shortcut} Tópico Anterior"},"navigation":{"title":"Navegação","jump":"%{shortcut} Ir para a mensagem #","back":"%{shortcut} Retroceder","up_down":"%{shortcut} Mover seleção \u0026uarr; \u0026darr;","open":"%{shortcut} Abrir tópico selecionado","next_prev":"%{shortcut} Secção seguinte/anterior","go_to_unread_post":"%{shortcut} Ir para a primeira postagem não lida"},"application":{"title":"Aplicação","create":"%{shortcut} Criar um novo tópico","notifications":"%{shortcut} Abrir notificações","hamburger_menu":"%{shortcut} Abrir menu hamburger","user_profile_menu":"%{shortcut} Abrir menu de utilizador","show_incoming_updated_topics":"%{shortcut} Mostrar tópicos atualizados","search":"%{shortcut} Pesquisar","help":"%{shortcut} Abrir ajuda do teclado","dismiss_new":"%{shortcut} Dispensar Novo","dismiss_topics":"%{shortcut} Marcar Visto Tópicos","log_out":"%{shortcut} Sair"},"composing":{"title":"Composição","return":"%{shortcut} Retornar ao compositor","fullscreen":"%{shortcut} Compositor em tela cheia"},"bookmarks":{"title":"Favoritos","enter":"%{shortcut} Salvar e fechar","later_today":"%{shortcut} Hoje mais tarde","later_this_week":"%{shortcut} Nesta semana mais tarde","tomorrow":"%{shortcut} Amanhã","next_week":"%{shortcut} Semana que vem","next_month":"%{shortcut} Próximo mês","next_business_week":"%{shortcut} Início da próxima semana","next_business_day":"%{shortcut} Próximo dia útil","custom":"%{shortcut} Data e hora personalizadas","none":"%{shortcut} Sem lembrete","delete":"%{shortcut} Excluir favorito"},"actions":{"title":"Ações","bookmark_topic":"%{shortcut} Alternar marcador de tópico","pin_unpin_topic":"%{shortcut} Afixar/Desafixar tópico","share_topic":"%{shortcut} Partilhar tópico","share_post":"%{shortcut} Partilhar publicação","reply_as_new_topic":"%{shortcut} Responder como tópico ligado","reply_topic":"%{shortcut} Responder ao tópico","reply_post":"%{shortcut} Responder à publicação","quote_post":"%{shortcut} Citar publicação","like":"%{shortcut} Gostar da publicação","flag":"%{shortcut} Denunciar publicação","bookmark":"%{shortcut} Adicionar mensagem aos marcadores","edit":"%{shortcut} Editar publicação","delete":"%{shortcut} Eliminar publicação","mark_muted":"%{shortcut} Silenciar tópico","mark_regular":"%{shortcut} Tópico Habitual (por defeito)","mark_tracking":"%{shortcut} Seguir tópico","mark_watching":"%{shortcut} Vigiar tópico","print":"%{shortcut} Imprimir tópico","defer":"%{shortcut} Tópico adiado"},"search_menu":{"title":"Menu de Busca","prev_next":"%{shortcut} Mover seleção para cima e para baixo","insert_url":"%{shortcut} Inserir seleção no compositor aberto"}},"badges":{"earned_n_times":{"one":"Ganhou este distintivo %{count} vez","other":"Ganhou este crachá %{count} vezes"},"granted_on":"Concedido %{date}","others_count":"Outros com este crachá (%{count})","title":"Crachás","allow_title":"Pode usar este crachá como título","multiple_grant":"Você pode ganhar isto várias vezes","badge_count":{"one":"%{count} Distintivo","other":"%{count} Distintivos"},"more_badges":{"one":"+%{count} Mais","other":"+%{count} Mais"},"granted":{"one":"%{count} concedido","other":"%{count} concedidos"},"select_badge_for_title":"Selecione um crachá para usar como seu título","none":"(nenhum)","successfully_granted":"%{badge} atribuído a %{username} com sucesso","badge_grouping":{"getting_started":{"name":"Começar"},"community":{"name":"Comunidade"},"trust_level":{"name":"Nível de Confiança"},"other":{"name":"Outros"},"posting":{"name":"A publicar"}},"favorite_max_reached":"Você não pode adicionar mais emblemas aos favoritos.","favorite_max_not_reached":"Marque este emblema como favorito","favorite_count":"%{count}/%{max} emblemas marcado como favorito"},"tagging":{"all_tags":"Todas as Etiquetas","other_tags":"Outras Tags","selector_all_tags":"todas as etiquetas","selector_no_tags":"sem etiquetas","changed":"etiquetas modificadas:","tags":"Etiquetas","choose_for_topic":"tags opcionais","info":"Informações","default_info":"Esta tag não está restrita a nenhuma categoria e não possui sinônimos. Para adicionar restrições, coloque esta tag em um \u003ca href=%{basePath}/tag_groups\u003egrupo de tags\u003c/a\u003e.","category_restricted":"Esta tag é restrita a categorias que você não tem permissão para acessar.","synonyms":"Sinônimos","synonyms_description":"Quando as tags seguintes forem usadas, elas serão substituídas por \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Esta tag pertence ao grupo \"%{tag_groups}\".","other":"Esta tag pertence a estes grupos: %{tag_groups}."},"category_restrictions":{"one":"Só pode ser usado nesta categoria:","other":"Só pode ser usado nessas categorias:"},"edit_synonyms":"Gerenciar Sinônimos","add_synonyms_label":"Adicionar sinônimos:","add_synonyms":"Adicionar","delete_tag":"Remover Etiqueta","delete_confirm":{"one":"Tem certeza que deseja excluir esta tag e removê-la de %{count} tópico ao qual ela está atribuída?","other":"Tem certeza de que deseja excluir esta tag e removê-la de %{count} tópicos aos quais ela está atribuída?"},"delete_confirm_no_topics":"Tem certeza de que deseja excluir esta tag?","delete_confirm_synonyms":{"one":"Seu sinônimo também será excluído.","other":"Seus %{count} sinônimos também serão excluídos."},"rename_tag":"Renomear Etiqueta","rename_instructions":"Escolha o novo nome para a etiqueta:","sort_by":"Ordenar por:","sort_by_count":"contagem","sort_by_name":"nome","manage_groups":"Gerir Grupos de Etiquetas","manage_groups_description":"Definir grupos para organizar etiquetas","upload":"Fazer Upload de Tags","upload_description":"Faça upload de um arquivo csv para criar tags em massa","upload_instructions":"Um por linha, opcionalmente com um grupo de tags no formato 'tag_name,tag_group'.","upload_successful":"Tags carregadas com sucesso","delete_unused_confirmation":{"one":"%{count} tag será excluída: %{tags}","other":"%{count} tags serão excluídas: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} e mais %{count}","other":"%{tags} e mais %{count}"},"delete_no_unused_tags":"Não há tags não utilizadas.","tag_list_joiner":", ","delete_unused":"Excluir tags não utilizadas","delete_unused_description":"Exclua todas as tags que não estão anexadas a algum tópico ou mensagem pessoal","cancel_delete_unused":"Cancelar","filters":{"without_category":"%{filter} %{tag} tópicos","with_category":"%{filter} %{tag} tópicos em %{category}","untagged_without_category":"%{filter} tópicos sem etiquetas","untagged_with_category":"%{filter} tópicos sem etiquetas em %{category}"},"notifications":{"watching":{"title":"A vigiar","description":"Irá vigiar automaticamente todos os tópicos com esta etiqueta. Será notificado acerca de todas as novas mensagens e tópicos, e ser-lhe-á apresentado a contagem das mensagens novas e não lidas ao lado do tópico."},"watching_first_post":{"title":"A Vigiar a Primeira Publicação","description":"Você será notificado de novos tópicos nesta tag mas não de respostas aos tópicos."},"tracking":{"title":"A Seguir"},"regular":{"title":"Regular","description":"Será notificado se alguém mencionar o seu @nome ou responder à sua publicação."},"muted":{"title":"Silenciado"}},"groups":{"title":"Grupos de Etiquetas","about_heading":"Selecione um grupo de etiquetas ou crie um novo","about_heading_empty":"Crie um novo grupo de etiquetas para começar","about_description":"Os grupos de etiquetas ajudam a gerir permissões para muitas etiquetas de uma só vez.","new":"Novo Grupo","new_title":"Criar Novo Grupo","edit_title":"Editar Grupo de Etiquetas","tags_label":"Etiquetas neste grupo","parent_tag_label":"Tag superior","one_per_topic_label":"Limitar a uma etiqueta por tópico deste grupo","new_name":"Novo Grupo de Etiquetas","name_placeholder":"Nome","save":"Guardar","delete":"Apagar","confirm_delete":"Tem a certeza que quer apagar este grupo de etiquetas?","everyone_can_use":"Tags podem ser usadas por todos","usable_only_by_groups":"As tags são visíveis para todos, mas apenas os grupos a seguir podem usá-las","visible_only_to_groups":"As tags são visíveis apenas para os seguintes grupos","cannot_save":"Não é possível salvar o grupo de tags. Verifique se há pelo menos uma tag presente, o nome do grupo de tags não está vazio e um grupo está selecionado para permissão de tags.","tags_placeholder":"Pesquisar ou criar etiquetas","parent_tag_placeholder":"Opcional","select_groups_placeholder":"Selecionar grupos...","disabled":"A etiquetagem está desativada. "},"topics":{"none":{"unread":"Não tem tópicos por ler.","new":"Não tem novos tópicos.","read":"Ainda não leu nenhum tópico.","posted":"Ainda não publicou em qualquer tópico.","latest":"Não há tópicos recentes.","bookmarks":"Ainda não marcou nenhum tópico.","top":"Não há melhores tópicos."}}},"invite":{"custom_message":"Torne seu convite um pouco mais pessoal escrevendo uma \u003ca href\u003emensagem personalizada\u003c/a\u003e.","custom_message_placeholder":"Insira a sua mensagem personalizada","approval_not_required":"O usuário será aprovado automaticamente assim que aceitar este convite.","custom_message_template_forum":"Olá, devia juntar-se a este fórum!","custom_message_template_topic":"Olá, achei que poderia gostar deste tópico!"},"forced_anonymous":"Devido a sobrecarga extrema, isso está sendo mostrado temporariamente para todos como a um usuário desconectado.","forced_anonymous_login_required":"O site está sobrecarregado pelo que não pode ser visualizado neste momento, tente novamente daqui a alguns minutos.","footer_nav":{"back":"Retroceder","forward":"Avançar","share":"Partilhar","dismiss":"Marcar como visto"},"safe_mode":{"enabled":"O modo de segurança está activado, para sair do modo de segurança feche esta janela do navegador"},"image_removed":"(imagem removida)","do_not_disturb":{"title":"Não perturbe por...","label":"Não perturbe","remaining":"%{remaining} restante","options":{"half_hour":"30 minutos","one_hour":"1 hora","two_hours":"2 horas","tomorrow":"Até amanhã","custom":"Personalizar"},"set_schedule":"Definir um horário de notificação"},"trust_levels":{"names":{"newuser":"novo utilizador","basic":"utilizador básico","member":"membro","regular":"habitual","leader":"líder"},"detailed_name":"%{level}: %{name}"},"cakeday":{"title":"Dia de Bolo","today":"Hoje","tomorrow":"Amanhã","upcoming":"Próximos","all":"Todos"},"birthdays":{"title":"Aniversários","month":{"title":"Aniversários no mês de","empty":"Não há utilizadores a celebrar os seus aniversários este mês."},"upcoming":{"title":"Aniversários para %{start_date} - %{end_date}","empty":"Não há utilizadores a celebrar os seus aniversários nos próximos 7 dias."},"today":{"title":"Aniversários para %{date}","empty":"Não há utilizadores a celebrar os seus aniversários hoje."},"tomorrow":{"empty":"Não há utilizadores a celebrar os seus aniversários amanhã."}},"anniversaries":{"title":"Aniversários","month":{"title":"Aniversários no mês de","empty":"Não há utilizadores a celebrar os seus aniversários este mês."},"upcoming":{"title":"Aniversários para %{start_date} - %{end_date}","empty":"Não há utilizadores a celebrar os seus aniversários nos próximos 7 dias."},"today":{"title":"Aniversários para %{date}","empty":"Não há utilizadores a celebrar os seus aniversários hoje."},"tomorrow":{"empty":"Não há utilizadores a celebrar os seus aniversários amanhã."}},"details":{"title":"Ocultar detalhes"},"discourse_local_dates":{"relative_dates":{"today":"Hoje %{time}","tomorrow":"Amanha %{time}","yesterday":"Ontem %{time}","countdown":{"passed":"a data já passou"}},"title":"Inserir data / hora","create":{"form":{"insert":"Inserir","advanced_mode":"Modo Avançado","simple_mode":"Modo Simples","format_description":"Formato usado para mostrar a data ao utilizador. Use Z para mostrar a diferença e zz para o nome do fuso horário.","timezones_title":"Fuso horário a exibir","timezones_description":"O fuso horário será utilizado para exibir as datas na pré-visualização e \"fallback\".","recurring_title":"Recorrência","recurring_description":"Defina a recorrência de um evento. Também pode editar manualmente a opção recorrente gerada pelo formulário e utilizar uma das seguintes chaves: anos, trimestres, meses, semanas, dias, horas, minutos, segundos, milissegundos.","recurring_none":"Nenhuma recorrência","invalid_date":"Data inválida. Certifique-se que a data e a hora estão corretos.","date_title":"Data","time_title":"Hora","format_title":"Formato da data","timezone":"Zona Horária","until":"Até...","recurring":{"every_day":"Diariamente","every_week":"Semanalmente","every_two_weeks":"Quinzenalmente","every_month":"Mensalmente","every_two_months":"Bimestral","every_three_months":"Trimestral","every_six_months":"Semestral","every_year":"Anualmente"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Iniciar o tutorial de novo utilizador para todos os novos utilizadores","welcome_message":"Enviar a todos os novos utilizadores uma mensagem de boas-vindas com um guia de início rápido."}},"presence":{"replying":{"one":"a responder","other":"a responder"},"editing":{"one":"a editar","other":"a editar"},"replying_to_topic":{"one":"a responder","other":"a responder"}},"poll":{"voters":{"one":"votante","other":"votantes"},"total_votes":{"one":"total da votação","other":"total de votos"},"average_rating":"Classificação média: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Os votos são \u003cstrong\u003epúblicos\u003c/strong\u003e."},"results":{"groups":{"title":"Precisa de ser um membro de %{groups} para votar nesta sondagem."},"vote":{"title":"Os resultados serão mostrados após o \u003cstrong\u003evoto\u003c/strong\u003e."},"closed":{"title":"Os resultados serão mostrados após o \u003cstrong\u003efecho\u003c/strong\u003e."},"staff":{"title":"Os resultados serão apenas mostrados aos membros do \u003cstrong\u003epessoal\u003c/strong\u003e."}},"multiple":{"help":{"at_least_min_options":{"one":"Escolha pelo menos \u003cstrong\u003e%{count}\u003c/strong\u003e opção.","other":"Escolha pelo menos \u003cstrong\u003e%{count}\u003c/strong\u003e opções."},"up_to_max_options":{"one":"Escolha até \u003cstrong\u003e%{count}\u003c/strong\u003e opção.","other":"Escolha até \u003cstrong\u003e%{count}\u003c/strong\u003e opções."},"x_options":{"one":"Escolha \u003cstrong\u003e%{count}\u003c/strong\u003e opção","other":"Escolha \u003cstrong\u003e%{count}\u003c/strong\u003e opções"},"between_min_and_max_options":"Escolha entre as opções \u003cstrong\u003e%{min}\u003c/strong\u003e e \u003cstrong\u003e%{max}\u003c/strong\u003e."}},"cast-votes":{"title":"Vote","label":"Vote agora!"},"show-results":{"title":"Exibir os resultados da sondagem","label":"Mostrar resultados"},"hide-results":{"title":"Voltar para os seus votos","label":"Mostrar voto"},"group-results":{"title":"Agrupar votos por campo de utilizador","label":"Mostrar detalhes"},"export-results":{"title":"Exportar os resultados da sondagem","label":"Exportar"},"open":{"title":"Abrir a sondagem","label":"Abrir","confirm":"Tem a certeza que deseja abrir esta sondagem?"},"close":{"title":"Fechar a sondagem","label":"Fechar","confirm":"Tem a certeza que deseja encerrar esta sondagem?"},"automatic_close":{"closes_in":"Fecha em \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Fechou \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Resultados da sondagem","votes":"%{count} votos","breakdown":"Detalhe","percentage":"Percentagem","count":"Soma"},"error_while_toggling_status":"Lamentamos, mas ocorreu um erro ao alternar o estado desta sondagem.","error_while_casting_votes":"Lamentamos, mas ocorreu um erro ao submeter os seus votos.","error_while_fetching_voters":"Lamentamos, mas ocorreu um erro ao exibir os votantes.","error_while_exporting_results":"Lamentamos, mas ocorreu um erro ao exportar os resultados da sondagem.","ui_builder":{"title":"Criar Sondagem","insert":"Inserir Sondagem","help":{"options_min_count":"Insira pelo menos uma opção.","options_max_count":"Insira no máximo %{count} opções.","invalid_min_value":"O valor mínimo deve ser pelo menos 1.","invalid_max_value":"O valor máximo deve ser pelo menos 1, mas menor ou igual ao número de opções.","invalid_values":"O valor mínimo deve ser menor que o valor máximo.","min_step_value":"O valor mínimo é 1"},"poll_type":{"label":"Tipo","regular":"Escolha Única","multiple":"Escolha Múltipla","number":"Classificação Numérica"},"poll_result":{"label":"Mostrar Resultados...","always":"Sempre visível","vote":"Somente após a votação","closed":"Quando a enquete for fechada","staff":"Apenas Pessoal"},"poll_groups":{"label":"Limitar a votação a estes grupos"},"poll_chart_type":{"label":"Gráfico de resultados","bar":"Barras","pie":"Circular"},"poll_config":{"max":"Máximo de Escolhas","min":"Mínimo de Escolhas","step":"Passo"},"poll_public":{"label":"Mostrar quem votou"},"poll_title":{"label":"Título (opcional)"},"poll_options":{"label":"Opções (uma por linha)","add":"Adicionar alternativa"},"automatic_close":{"label":"Fechar sondagem automaticamente"},"show_advanced":"Mostrar Opções Avançadas","hide_advanced":"Ocultar Opções Avançadas"}},"styleguide":{"title":"Styleguide","welcome":"Para começar, escolha uma seção no menu à esquerda.","categories":{"atoms":"Átomos","molecules":"Moléculas","organisms":"Organismos"},"sections":{"typography":{"title":"Tipografia","example":"Bem-vindo ao Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Entradas de Data/Hora"},"font_scale":{"title":"Sistema de Fontes"},"colors":{"title":"Cores"},"icons":{"title":"Ícones","full_list":"Veja a lista completa dos Ícones do Font Awesome"},"input_fields":{"title":"Campos de Entrada"},"buttons":{"title":"Botões"},"dropdowns":{"title":"Dropdowns"},"categories":{"title":"Categorias"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation":{"title":"Navegação"},"navigation_bar":{"title":"Barra de Navegação"},"navigation_stacked":{"title":"Navegação Empilhada"},"categories_list":{"title":"Lista de Categorias"},"topic_link":{"title":"Link de Tópico"},"topic_list_item":{"title":"Item da Lista de Tópicos"},"topic_statuses":{"title":"Status do Tópico"},"topic_list":{"title":"Lista de Tópicos"},"basic_topic_list":{"title":"Lista Básica de Tópicos"},"footer_message":{"title":"Mensagem do Rodapé"},"signup_cta":{"title":"Inscrição de Chamada à Ação."},"topic_timer_info":{"title":"Temporizadores de Tópico"},"topic_footer_buttons":{"title":"Botões do Rodapé"},"topic_notifications":{"title":"Notificações do Tópico"},"post":{"title":"Mensagem"},"topic_map":{"title":"Mapa de Tópicos"},"site_header":{"title":"Cabeçalho do Site"},"suggested_topics":{"title":"Tópicos Sugeridos"},"post_menu":{"title":"Menu de Postagem"},"modal":{"title":"Modal","header":"Título Modal","footer":"Rodapé Modal"},"user_about":{"title":"Caixa Sobre Usuário"},"header_icons":{"title":"Ícones de Cabeçalho"},"spinners":{"title":"Spinners"}}}}},"en":{"js":{"dates":{"wrap_on":"on %{date}"},"skip_to_main_content":"Skip to main content","drafts":{"label_with_count":"Drafts (%{count})","new_private_message":"New personal message draft"},"review":{"stale_help":"This reviewable has been resolved by \u003cb\u003e%{username}\u003c/b\u003e."},"groups":{"members":{"no_filter_matches":"No members match that search."},"default_notifications":{"modal_title":"User default notifications","modal_description":"Would you like to apply this change historically? This will change preferences for %{count} existing users.","modal_no":"No, only apply change going forward"}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"no_bookmarks_search":"No bookmarks found with the provided search query.","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","messages":{"all":"all inboxes","personal":"Personal"},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}},"title":{"instructions":"appears after your username"},"flair":{"title":"Flair","instructions":"icon displayed next to your profile picture"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"logs_error_rate_notice":{},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply.","other":"There are \u003cb\u003e%{count}\u003c/b\u003e replies."}},"create_account":{"associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"login":{"google_oauth2":{"sr_title":"Login with Google"},"twitter":{"sr_title":"Login with Twitter"},"instagram":{"sr_title":"Login with Instagram"},"facebook":{"sr_title":"Login with Facebook"},"github":{"sr_title":"Login with GitHub"},"discord":{"sr_title":"Login with Discord"}},"select_kit":{"results_count":{"one":"%{count} result","other":"%{count} results"}},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified.","other":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} users. Nobody will be notified."},"error":{"title_too_short":{"one":"Title must be at least %{count} character","other":"Title must be at least %{count} characters"},"title_too_long":{"one":"Title can't be more than %{count} character","other":"Title can't be more than %{count} characters"},"post_length":{"one":"Post must be at least %{count} character","other":"Post must be at least %{count} characters"},"tags_missing":{"one":"You must choose at least %{count} tag","other":"You must choose at least %{count} tags"}},"composer_actions":{"reply_as_new_group_message":{"desc":"Create new message starting with same recipients"}}},"topics":{"bulk":{"change_category":"Set Category...","notification_level":"Notifications..."},"none":{"unseen":"You have no unseen topics."},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"}},"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."},"feature":{"make_banner":"Make Banner Topic"},"feature_topic":{"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"}},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link."},"move_to_new_message":{"instructions":{"one":"You are about to create a new message and populate it with the post you've selected.","other":"You are about to create a new message and populate it with the \u003cb\u003e%{count}\u003c/b\u003e posts you've selected."}}},"post":{"controls":{"change_owner":"Change Ownership...","grant_badge":"Grant Badge...","delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","other":"This topic currently has over %{count} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice..."},"delete":{"confirm":{"one":"Are you sure you want to delete that post?","other":"Are you sure you want to delete those %{count} posts?"}},"merge":{"confirm":{"one":"Are you sure you want to merge those posts?","other":"Are you sure you want to merge those %{count} posts?"}},"revisions":{"controls":{"revert":"Revert to revision %{revision}","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"}}},"category":{"default_top_period":"Default Top Period:","default_list_filter":"Default List Filter:","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","require_topic_approval":"Require moderator approval of all new topics","require_reply_approval":"Require moderator approval of all new replies","position":"Position on the categories page:","minimum_required_tags":"Minimum number of tags required in a topic:","default_slow_mode":"Enable \"Slow Mode\" for new topics in this category.","num_auto_bump_daily":"Number of open topics to automatically bump daily:","navigate_to_first_post_after_read":"Navigate to first post after topics are read","notifications":{"watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"watching_first_post":{"description":"You will be notified of new topics in this category but not replies to the topics."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"colors_disabled":"You can’t select colors because you have a category style of none.","topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"flagging":{},"views_long":{"one":"this topic has been viewed %{count} time","other":"this topic has been viewed %{number} times"},"history_capped_revisions":"History, last 100 revisions","history":"History","raw_email":{"title":"Incoming Email"},"filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"},"top":{"other_periods":"see top:"}},"browser_update":"Unfortunately, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eyour browser is too old to work on this site\u003c/a\u003e. Please \u003ca href=\"https://browsehappy.com\"\u003eupgrade your browser\u003c/a\u003e to view rich content, log in and reply.","lightbox":{"previous":"Previous (Left arrow key)","next":"Next (Right arrow key)"},"keyboard_shortcuts_help":{"shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} or %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","actions":{"topic_admin_actions":"%{shortcut} Open topic admin actions"}},"tagging":{"add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?","other":"Any place that currently uses these tags will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"add_synonyms_failed":"The following tags couldn't be added as synonyms: \u003cb\u003e%{tag_names}\u003c/b\u003e. Ensure they don't have synonyms and aren't synonyms of another tag.","remove_synonym":"Remove Synonym","delete_synonym_confirm":"Are you sure you want to delete the synonym \"%{tag_name}\"?","notifications":{"tracking":{"description":"You will automatically track all topics with this tag. A count of unread and new posts will appear next to the topic."},"muted":{"description":"You will not be notified of anything about new topics with this tag, and they will not appear on your unread tab."}},"groups":{"parent_tag_description":"Tags from this group can only be used if the parent tag is present."},"topics":{"none":{"unseen":"You have no unseen topics."}}},"pick_files_button":{"unsupported_file_picked":"You have picked an unsupported file. Supported file types – %{types}."},"cakeday":{"none":" "},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"}}}};
I18n.locale = 'pt';
I18n.pluralizationRules.pt = MessageFormat.locale.pt;
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
//! locale : Portuguese [pt]
//! author : Jefferson : https://github.com/jalex79

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var pt = moment.defineLocale('pt', {
        months: 'janeiro_fevereiro_março_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro'.split(
            '_'
        ),
        monthsShort: 'jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez'.split('_'),
        weekdays: 'Domingo_Segunda-feira_Terça-feira_Quarta-feira_Quinta-feira_Sexta-feira_Sábado'.split(
            '_'
        ),
        weekdaysShort: 'Dom_Seg_Ter_Qua_Qui_Sex_Sáb'.split('_'),
        weekdaysMin: 'Do_2ª_3ª_4ª_5ª_6ª_Sá'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD/MM/YYYY',
            LL: 'D [de] MMMM [de] YYYY',
            LLL: 'D [de] MMMM [de] YYYY HH:mm',
            LLLL: 'dddd, D [de] MMMM [de] YYYY HH:mm',
        },
        calendar: {
            sameDay: '[Hoje às] LT',
            nextDay: '[Amanhã às] LT',
            nextWeek: 'dddd [às] LT',
            lastDay: '[Ontem às] LT',
            lastWeek: function () {
                return this.day() === 0 || this.day() === 6
                    ? '[Último] dddd [às] LT' // Saturday + Sunday
                    : '[Última] dddd [às] LT'; // Monday - Friday
            },
            sameElse: 'L',
        },
        relativeTime: {
            future: 'em %s',
            past: 'há %s',
            s: 'segundos',
            ss: '%d segundos',
            m: 'um minuto',
            mm: '%d minutos',
            h: 'uma hora',
            hh: '%d horas',
            d: 'um dia',
            dd: '%d dias',
            w: 'uma semana',
            ww: '%d semanas',
            M: 'um mês',
            MM: '%d meses',
            y: 'um ano',
            yy: '%d anos',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%dº',
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return pt;

})));

// moment-timezone-localization for lang code: pt

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidjan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Acra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Adis Abeba","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Argel","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamako","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Cairo","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Casablanca","id":"Africa/Casablanca"},{"value":"Africa/Conakry","name":"Conacri","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Dar es Salaam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Djibuti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"El Aaiún","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Joanesburgo","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Cartum","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lomé","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaka","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadíscio","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monróvia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairóbi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"N’Djamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nouakchott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ouagadougou","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"São Tomé","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Trípoli","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Túnis","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Antigua","name":"Antígua","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaína","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"La Rioja","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Rio Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucumã","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Assunção","id":"America/Asuncion"},{"value":"America/Bahia","name":"Bahia","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahia de Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belém","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogotá","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancún","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Caiena","id":"America/Cayenne"},{"value":"America/Cayman","name":"Cayman","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Córdoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Costa Rica","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiabá","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Curaçao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominica","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepé","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"El Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Granada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Guadalupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Guatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guaiaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Guiana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"Havana","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianápolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Jamaica","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"La Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Los Angeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceió","id":"America/Maceio"},{"value":"America/Managua","name":"Manágua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinica","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlan","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Mérida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Cidade do México","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevidéu","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"Nova York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Fernando de Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, Dakota do Norte","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, Dakota do Norte","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salen, Dakota do Norte","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panamá","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Porto Príncipe","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Port of Spain","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Porto Rico","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Rio Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarém","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"São Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"São Bartolomeu","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"Saint John’s","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"São Cristóvão","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"Santa Lúcia","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"Saint Thomas","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"São Vicente","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Thule","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tortola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Syowa","name":"Showa","id":"Antarctica/Syowa"},{"value":"Asia/Aden","name":"Adem","id":"Asia/Aden"},{"value":"Asia/Amman","name":"Amã","id":"Asia/Amman"},{"value":"Asia/Aqtobe","name":"Aqtöbe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Asgabate","id":"Asia/Ashgabat"},{"value":"Asia/Baghdad","name":"Bagdá","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrein","id":"Asia/Bahrain"},{"value":"Asia/Beirut","name":"Beirute","id":"Asia/Beirut"},{"value":"Asia/Damascus","name":"Damasco","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Dacca","id":"Asia/Dhaka"},{"value":"Asia/Dushanbe","name":"Duchambe","id":"Asia/Dushanbe"},{"value":"Asia/Hebron","name":"Hebrom","id":"Asia/Hebron"},{"value":"Asia/Jakarta","name":"Jacarta","id":"Asia/Jakarta"},{"value":"Asia/Jerusalem","name":"Jerusalém","id":"Asia/Jerusalem"},{"value":"Asia/Karachi","name":"Carachi","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Catmandu","id":"Asia/Katmandu"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lampur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Macau","name":"Macau","id":"Asia/Macau"},{"value":"Asia/Makassar","name":"Macáçar","id":"Asia/Makassar"},{"value":"Asia/Muscat","name":"Mascate","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nicósia","id":"Asia/Nicosia"},{"value":"Asia/Riyadh","name":"Riade","id":"Asia/Riyadh"},{"value":"Asia/Sakhalin","name":"Sacalina","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarcanda","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Seul","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Xangai","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Cingapura","id":"Asia/Singapore"},{"value":"Asia/Tehran","name":"Teerã","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Timphu","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tóquio","id":"Asia/Tokyo"},{"value":"Asia/Ulaanbaatar","name":"Ulan Bator","id":"Asia/Ulaanbaatar"},{"value":"Asia/Yekaterinburg","name":"Ecaterimburgo","id":"Asia/Yekaterinburg"},{"value":"Atlantic/Azores","name":"Açores","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermudas","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Canárias","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Cabo Verde","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Ilhas Faroe","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Reykjavík","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Geórgia do Sul","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"Santa Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Etc/UTC","name":"Horário Universal Coordenado","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Amsterdã","id":"Europe/Amsterdam"},{"value":"Europe/Astrakhan","name":"Astracã","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Atenas","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Belgrado","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlim","id":"Europe/Berlin"},{"value":"Europe/Brussels","name":"Bruxelas","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Bucareste","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budapeste","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Büsingen","id":"Europe/Busingen"},{"value":"Europe/Copenhagen","name":"Copenhague","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Horário Padrão da IrlandaDublin","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Gibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Guernsey","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsinque","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Ilha de Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istambul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kaliningrado","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kiev","id":"Europe/Kiev"},{"value":"Europe/Lisbon","name":"Lisboa","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Liubliana","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Horário de Verão BritânicoLondres","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Luxemburgo","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madri","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Monaco","name":"Mônaco","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Moscou","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Paris","id":"Europe/Paris"},{"value":"Europe/Prague","name":"Praga","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Roma","id":"Europe/Rome"},{"value":"Europe/Sarajevo","name":"Sarajevo","id":"Europe/Sarajevo"},{"value":"Europe/Sofia","name":"Sófia","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Estocolmo","id":"Europe/Stockholm"},{"value":"Europe/Tirane","name":"Tirana","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Ulianovsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Vatican","name":"Vaticano","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Viena","id":"Europe/Vienna"},{"value":"Europe/Volgograd","name":"Volgogrado","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Varsóvia","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Zagreb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Zaporizhia","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Zurique","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Comoro","name":"Comores","id":"Indian/Comoro"},{"value":"Indian/Mahe","name":"Mahé","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Maldivas","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Maurício","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Reunião","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Ápia","id":"Pacific/Apia"},{"value":"Pacific/Easter","name":"Ilha de Páscoa","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Éfaté","id":"Pacific/Efate"},{"value":"Pacific/Galapagos","name":"Galápagos","id":"Pacific/Galapagos"},{"value":"Pacific/Honolulu","name":"Honolulu","id":"Pacific/Honolulu"},{"value":"Pacific/Noumea","name":"Nouméa","id":"Pacific/Noumea"},{"value":"Pacific/Tahiti","name":"Taiti","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Taraua","id":"Pacific/Tarawa"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

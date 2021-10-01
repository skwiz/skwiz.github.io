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
r += "让我们<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">开始讨论</a>吧！现在有 ";
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
})() + "</strong> 个话题";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个话题";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "和 ";
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
})() + "</strong> 个帖子";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个帖子";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "。访客需要阅读和回复更多 - 我们建议至少 ";
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
})() + "</strong> 个话题";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个话题";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "和 ";
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
})() + "</strong> 个帖子";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个帖子";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "。只有管理人员可以看到此消息。";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "让我们<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">开始讨论</a>吧！现在有 ";
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
})() + "</strong> 个话题";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个话题";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "。访客需要阅读和回复更多 - 我们建议至少 ";
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
})() + "</strong> 个话题";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个话题";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "。只有管理人员可以看到此消息。";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "让我们<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">开始讨论</a>吧！现在有 ";
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
})() + "</strong> 个帖子";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个帖子";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "。访客需要阅读和回复更多 - 我们建议至少 ";
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
})() + "</strong> 个帖子";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 个帖子";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "。只有管理人员可以看到此消息。";
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
})() + " 个错误/小时";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/小时";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a>达到了站点设置中 ";
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
})() + " 个错误/小时";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/小时";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "的限制。";
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
})() + " 个错误/分钟";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/分钟";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a>达到了站点设置中 ";
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
})() + " 个错误/分钟";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/分钟";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "的限制。";
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
})() + " 个错误/小时";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/小时";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a>超过了站点设置中 ";
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
})() + " 个错误/小时";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/小时";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "的限制。";
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
})() + " 个错误/分钟";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/分钟";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a>超过了站点设置中 ";
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
})() + " 个错误/分钟";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个错误/分钟";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "的限制。";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "有 ";
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
})() + "</b> 个回复";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> 个回复";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "，预计阅读时间为 <b>";
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
})() + " 分钟";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 分钟";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>。";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "还有";
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
})() + " 个未读</a>";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
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
r += "和";
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
})() + " 个新</a>话题";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "，或者";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "浏览";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["catLink"];
r += "中的其他话题";
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
r += "：";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["CREATED_AT"];
r += "\n";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["LAST_POST"];
r += "：";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["BUMPED_AT"];
return r;
}, "flagging.delete_confirm_MF" : function(d){
var r = "";
r += "您将删除此用户的 ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> 个帖子";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "和 ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> 个话题";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "，移除他们的帐户，禁止其 IP 地址 <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b> 再次注册，同时将其电子邮件地址 <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> 加入永久屏蔽名单。确定此用户是垃圾信息发布者吗？";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "此话题有 ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "count";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个回复";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "ratio";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"low" : function(d){
var r = "";
r += "，并且点赞发帖比例比较高";
return r;
},
"med" : function(d){
var r = "";
r += "，并且点赞发帖比例非常高";
return r;
},
"high" : function(d){
var r = "";
r += "，并且点赞发帖比例极高";
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
r += "您将删除 ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "POSTS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个帖子";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "和 ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "TOPICS";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 个话题";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "。确定吗？";
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
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["zh_CN"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
MessageFormat.locale.zh_CN = function ( n ) {
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

I18n.translations = {"zh_CN":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"other":"字节"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"HH:mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"YYYY 年 M 月","long_no_year":"M 月 D 日 HH:mm","long_no_year_no_time":"M 月 D 日","full_no_year_no_time":"M 月 D 日","long_with_year":"YYYY 年 M 月 D 日 HH:mm","long_with_year_no_time":"YYYY 年 M 月 D 日","full_with_year_no_time":"YYYY 年 M 月 D 日","long_date_with_year":"YY 年 M 月 D 日 LT","long_date_without_year":"M 月 D 日 LT","long_date_with_year_without_time":"YY 年 M 月 D 日","long_date_without_year_with_linebreak":"M 月 D 日\u003cbr/\u003eLT","long_date_with_year_with_linebreak":"YY 年 M 月 D 日\u003cbr/\u003eLT","wrap_ago":"%{date} 前","wrap_on":"%{date}","tiny":{"half_a_minute":"\u003c 1 分钟","less_than_x_seconds":{"other":"\u003c %{count} 秒"},"x_seconds":{"other":"%{count} 秒"},"less_than_x_minutes":{"other":"\u003c %{count} 分钟"},"x_minutes":{"other":"%{count} 分钟"},"about_x_hours":{"other":"%{count} 小时"},"x_days":{"other":"%{count} 天"},"x_months":{"other":"%{count} 个月"},"about_x_years":{"other":"%{count} 年"},"over_x_years":{"other":"\u003e %{count} 年"},"almost_x_years":{"other":"%{count} 年"},"date_month":"M 月 D 日","date_year":"YY 年 M 月"},"medium":{"x_minutes":{"other":"%{count} 分钟"},"x_hours":{"other":"%{count} 小时"},"x_days":{"other":"%{count} 天"},"date_year":"YY 年 M 月 D 日"},"medium_with_ago":{"x_minutes":{"other":"%{count} 分钟前"},"x_hours":{"other":"%{count} 小时前"},"x_days":{"other":"%{count} 天前"},"x_months":{"other":"%{count} 个月前"},"x_years":{"other":"%{count} 年前"}},"later":{"x_days":{"other":"%{count} 天后"},"x_months":{"other":"%{count} 个月后"},"x_years":{"other":"%{count} 年后"}},"previous_month":"上个月","next_month":"下个月","placeholder":"日期","from_placeholder":"起始日期","to_placeholder":"截至日期"},"share":{"topic_html":"话题：\u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"帖子 #%{postNumber}","close":"关闭","twitter":"分享到 Twitter","facebook":"分享到 Facebook","email":"通过电子邮件发送","url":"复制并分享 URL"},"action_codes":{"public_topic":"%{when}将此话题设为公开","private_topic":"%{when}将此话题转换为个人消息","split_topic":"%{when}拆分了此话题","invited_user":"%{when}邀请了 %{who}","invited_group":"%{when}邀请了 %{who}","user_left":"%{who} 在 %{when}将自己从此消息中移除","removed_user":"%{when}移除了 %{who}","removed_group":"%{when}移除了 %{who}","autobumped":"%{when}自动提升","autoclosed":{"enabled":"%{when}关闭","disabled":"%{when}打开"},"closed":{"enabled":"%{when}关闭","disabled":"%{when}打开"},"archived":{"enabled":"%{when}归档","disabled":"%{when}取消归档"},"pinned":{"enabled":"%{when}置顶","disabled":"%{when}取消置顶"},"pinned_globally":{"enabled":"%{when}全站置顶","disabled":"%{when}取消置顶"},"visible":{"enabled":"%{when}公开","disabled":"%{when}取消公开"},"banner":{"enabled":"%{when}将此设置为横幅。在用户关闭前，它将显示在每个页面的顶部。","disabled":"%{when}移除了此横幅。它将不再显示在每个页面的顶部。"},"forwarded":"转发了上述电子邮件"},"topic_admin_menu":"话题操作","skip_to_main_content":"跳转到主要内容","wizard_required":"欢迎来到全新的 Discourse！让我们跟随\u003ca href='%{url}' data-auto-route='true'\u003e设置向导\u003c/a\u003e开始吧 ✨","emails_are_disabled":"所有外发电子邮件已被管理员全局禁用。任何类型的电子邮件通知都不会发出。","software_update_prompt":{"message":"我们已经更新此站点，请 \u003cspan\u003e刷新页面\u003c/span\u003e，否则可能会遇到意外行为。","dismiss":"关闭"},"bootstrap_mode_enabled":{"other":"为了更轻松地启动您的新站点，您现在处于引导模式。所有新用户都将被授予信任级别 1，并且已启用每日摘要电子邮件。引导模式会在达到 %{count} 个用户时自动关闭。"},"bootstrap_mode_disabled":"引导模式将在 24 小时内禁用。","themes":{"default_description":"默认","broken_theme_alert":"因为主题/组件 %{theme} 有错误，您的站点可能无法正常运行，在%{path}下将其禁用。"},"s3":{"regions":{"ap_northeast_1":"亚太地区（东京）","ap_northeast_2":"亚太地区（首尔）","ap_east_1":"亚太地区（香港）","ap_south_1":"亚太地区（孟买）","ap_southeast_1":"亚太地区（新加坡）","ap_southeast_2":"亚太地区（悉尼）","ca_central_1":"加拿大（中部）","cn_north_1":"中国（北京）","cn_northwest_1":"中国（宁夏）","eu_central_1":"欧洲（法兰克福）","eu_north_1":"欧洲（斯德哥尔摩）","eu_south_1":"欧盟(米兰)","eu_west_1":"欧洲（爱尔兰）","eu_west_2":"欧洲（伦敦）","eu_west_3":"欧洲（巴黎）","sa_east_1":"南美洲（圣保罗）","us_east_1":"美国东部（北弗吉尼亚）","us_east_2":"美国东部（俄亥俄州）","us_gov_east_1":"AWS GovCloud（美国东部）","us_gov_west_1":"AWS GovCloud（美国西部）","us_west_1":"美国西部（北加利福尼亚州）","us_west_2":"美国西部（俄勒冈州）"}},"clear_input":"清除输入","edit":"编辑此话题的标题和类别","expand":"展开","not_implemented":"抱歉，该功能尚未实现！","no_value":"否","yes_value":"是","submit":"提交","generic_error":"抱歉，出错了。","generic_error_with_reason":"出错了：%{error}","sign_up":"注册","log_in":"登录","age":"年龄","joined":"加入日期：","admin_title":"管理员","show_more":"显示更多","show_help":"选项","links":"链接","links_lowercase":{"other":"链接"},"faq":"常见问题解答","guidelines":"准则","privacy_policy":"隐私政策","privacy":"隐私","tos":"服务条款","rules":"规则","conduct":"行为准则","mobile_view":"移动版视图","desktop_view":"桌面版视图","or":"或者","now":"刚刚","read_more":"阅读更多","more":"更多","x_more":{"other":"其他 %{count} 人"},"never":"从不","every_30_minutes":"每 30 分钟","every_hour":"每小时","daily":"每天","weekly":"每周","every_month":"每月","every_six_months":"每六个月","max_of_count":"最多 %{count} 个","character_count":{"other":"%{count} 个字符"},"related_messages":{"title":"相关消息","see_all":"查看来自 @%{username} 的\u003ca href=\"%{path}\"\u003e所有消息\u003c/a\u003e…"},"suggested_topics":{"title":"建议的话题","pm_title":"建议的消息"},"about":{"simple_title":"关于","title":"关于%{title}","stats":"站点统计信息","our_admins":"我们的管理员","our_moderators":"我们的版主","moderators":"版主","stat":{"all_time":"所有时间","last_day":"过去 24 小时","last_7_days":"过去 7 天","last_30_days":"过去 30 天"},"like_count":"赞","topic_count":"话题","post_count":"帖子","user_count":"用户","active_user_count":"活跃用户","contact":"联系我们","contact_info":"如果出现影响此站点的关键问题或紧急事项，请联系我们：%{contact_info}。"},"bookmarked":{"title":"加入书签","edit_bookmark":"编辑书签","clear_bookmarks":"清除书签","help":{"bookmark":"点击以将此话题的第一个帖子加入书签","edit_bookmark":"点击以编辑有关此话题的书签","edit_bookmark_for_topic":"单击来为本主题编辑书签","unbookmark":"点击以移除此话题中的所有书签","unbookmark_with_reminder":"点击以移除此话题中的所有书签和提醒。"}},"bookmarks":{"created":"您已将此帖子加入书签。%{name}","not_bookmarked":"将此帖子加入书签","created_with_reminder":"您已将此帖子加入书签，并于 %{date}设置了一个提醒。%{name}","remove":"移除书签","delete":"删除书签","confirm_delete":"确定要删除此书签吗？提醒也将一并删除。","confirm_clear":"确定要清除此话题中的所有书签吗？","save":"保存","no_timezone":"您尚未设置时区，将无法设置提醒，在\u003ca href=\"%{basePath}/my/preferences/profile\"\u003e您的个人资料中\u003c/a\u003e进行设置。","invalid_custom_datetime":"您提供的日期和时间无效，请重试。","list_permission_denied":"您没有权限查看此用户的书签。","no_user_bookmarks":"您没有已加入书签的帖子；书签让您可以快速定位特定帖子。","auto_delete_preference":{"label":"自动删除","never":"从不","when_reminder_sent":"发送提醒后","on_owner_reply":"在我回复此话题后"},"search_placeholder":"按名称、话题标题或帖子内容搜索书签","search":"搜索","reminders":{"today_with_time":"今天 %{time}","tomorrow_with_time":"明天 %{time}","at_time":"%{date_time}","existing_reminder":"您为此书签设置的提醒将在%{at_date_time}发送"}},"copy_codeblock":{"copied":"已复制！"},"drafts":{"label":"草稿","label_with_count":"草稿 (%{count})","resume":"恢复","remove":"移除","remove_confirmation":"确定要删除此草稿吗？","new_topic":"新话题草稿","new_private_message":"新个人消息草稿","topic_reply":"草稿回复","abandon":{"confirm":"您在此话题下有一个进行中的草稿。您想对它做什么？","yes_value":"舍弃","no_value":"恢复编辑"}},"topic_count_categories":{"other":"查看 %{count} 个新或更新过的主题"},"topic_count_latest":{"other":"查看 %{count} 个新的或更新的话题"},"topic_count_unseen":{"other":"查看 %{count} 个新的或更新的话题"},"topic_count_unread":{"other":"查看 %{count} 个未读话题"},"topic_count_new":{"other":"查看 %{count} 个新话题"},"preview":"预览","cancel":"取消","deleting":"正在删除…","save":"保存变更","saving":"正在保存…","saved":"已保存！","upload":"上传","uploading":"正在上传…","uploading_filename":"正在上传：%{filename}…","processing_filename":"正在处理：%{filename}…","clipboard":"剪贴板","uploaded":"已上传！","pasting":"正在粘贴…","enable":"启用","disable":"禁用","continue":"继续","undo":"撤消","revert":"还原","failed":"失败","switch_to_anon":"进入匿名模式","switch_from_anon":"退出匿名模式","banner":{"close":"关闭此横幅。","edit":"编辑此横幅 \u003e\u003e"},"pwa":{"install_banner":"要\u003ca href\u003e在此设备上安装%{title}\u003c/a\u003e 吗？"},"choose_topic":{"none_found":"未找到话题。","title":{"search":"搜索话题","placeholder":"在此处输入话题标题、URL 或 ID"}},"choose_message":{"none_found":"未找到消息。","title":{"search":"搜索消息","placeholder":"在此处输入消息标题、URL 或 ID"}},"review":{"order_by":"排序依据","date_filter":"发布时间介于","in_reply_to":"回复给","explain":{"why":"解释为什么此条目最终进入队列","title":"可审核话题的评分","formula":"公式","subtotal":"小计","total":"总计","min_score_visibility":"公开的最低分数","score_to_hide":"隐藏帖子的触发分数","take_action_bonus":{"name":"采取行动","title":"当管理人员选择采取行动时，举报会获得加分。"},"user_accuracy_bonus":{"name":"用户准确性","title":"所提交的举报一直都获得同意的用户将获得加分。"},"trust_level_bonus":{"name":"信任级别","title":"由较高信任级别的用户创建的可审核条目具有较高的分数。"},"type_bonus":{"name":"奖励加分","title":"某些可审核类型可以由管理人员分配加分，以使其具有更高的优先级。"}},"stale_help":"此可审核条目已被 \u003cb\u003e%{username}\u003c/b\u003e 解决。","claim_help":{"optional":"您可以认领此条目以避免被他人审核。","required":"您必须先认领条目才能进行审核。","claimed_by_you":"您已认领此条目，可以进行审核。","claimed_by_other":"此条目仅可以由 \u003cb\u003e%{username}\u003c/b\u003e 审核。"},"claim":{"title":"认领此话题"},"unclaim":{"help":"移除此认领"},"awaiting_approval":"需要审批","delete":"删除","settings":{"saved":"已保存","save_changes":"保存变更","title":"设置","priorities":{"title":"可审核条目优先级"}},"moderation_history":"审核历史记录","view_all":"查看全部","grouped_by_topic":"按话题分组","none":"没有要审核的条目","view_pending":"查看待审核条目","topic_has_pending":{"other":"此话题有 \u003cb\u003e%{count}\u003c/b\u003e 个帖子等待审批"},"title":"审核","topic":"话题：","filtered_topic":"您已筛选到一个话题下的可审核内容。","filtered_user":"用户","filtered_reviewed_by":"审核人","show_all_topics":"显示所有话题","deleted_post":"（帖子已删除）","deleted_user":"（用户已删除）","user":{"bio":"个人简介","website":"网站","username":"用户名","email":"电子邮件","name":"姓名","fields":"字段","reject_reason":"原因"},"user_percentage":{"summary":{"other":"%{agreed}，%{disagreed}，%{ignored}（共 %{count} 个举报）"},"agreed":{"other":"%{count}% 同意"},"disagreed":{"other":"%{count}% 不同意"},"ignored":{"other":"%{count}% 忽略"}},"topics":{"topic":"话题","reviewable_count":"计数","reported_by":"举报人","deleted":"[话题已删除]","original":"（原话题）","details":"详细信息","unique_users":{"other":"%{count} 位用户"}},"replies":{"other":"%{count} 个回复"},"edit":"编辑","save":"保存","cancel":"取消","new_topic":"批准此条目将创建一个新话题","filters":{"all_categories":"（所有类别）","type":{"title":"类型","all":"（所有类型）"},"minimum_score":"最低分：","refresh":"刷新","status":"状态","category":"类别","orders":{"score":"分数","score_asc":"分数（倒序）","created_at":"创建时间","created_at_asc":"创建时间（倒序）"},"priority":{"title":"最低优先级","any":"（任何）","low":"低","medium":"中","high":"高"}},"conversation":{"view_full":"查看完整对话"},"scores":{"about":"此分数是根据举报人的信任级别、该用户以往举报的准确性以及被举报条目的优先级计算得出的。","score":"分数","date":"日期","type":"类型","status":"状态","submitted_by":"提交人","reviewed_by":"审核人"},"statuses":{"pending":{"title":"待处理"},"approved":{"title":"已批准"},"rejected":{"title":"已拒绝"},"ignored":{"title":"已忽略"},"deleted":{"title":"已删除"},"reviewed":{"title":"（所有已审核）"},"all":{"title":"（全部）"}},"types":{"reviewable_flagged_post":{"title":"被举报的帖子","flagged_by":"举报人"},"reviewable_queued_topic":{"title":"已加入队列的话题"},"reviewable_queued_post":{"title":"已加入队列的帖子"},"reviewable_user":{"title":"用户"},"reviewable_post":{"title":"帖子"}},"approval":{"title":"帖子需要审批","description":"我们已收到您的帖子，不过需要由版主批准才能显示。请耐心等待。","pending_posts":{"other":"您有 \u003cstrong\u003e%{count}\u003c/strong\u003e 个帖子等待处理。"},"ok":"确定"},"example_username":"用户名","reject_reason":{"title":"您为什么拒绝此用户？","send_email":"发送拒绝电子邮件"}},"relative_time_picker":{"minutes":{"other":"分钟"},"hours":{"other":"小时"},"days":{"other":"天"},"months":{"other":"个月"},"years":{"other":"年"},"relative":"相对"},"time_shortcut":{"later_today":"今天晚些时候","next_business_day":"下一个工作日","tomorrow":"明天","post_local_date":"帖子中的日期","later_this_week":"本周晚些时候","this_weekend":"本周末","start_of_next_business_week":"星期一","start_of_next_business_week_alt":"下周一","two_weeks":"两周","next_month":"下个月","six_months":"六个月","custom":"自定义日期和时间","relative":"相对时间","none":"不需要时间/日期","last_custom":"上次自定义日期时间"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e 发布了\u003ca href='%{topicUrl}'\u003e该话题\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003e您\u003c/a\u003e 发布了\u003ca href='%{topicUrl}'\u003e该话题\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e 回复了 \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003e您\u003c/a\u003e 回复了 \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e 回复了\u003ca href='%{topicUrl}'\u003e该话题\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003e您\u003c/a\u003e 回复了\u003ca href='%{topicUrl}'\u003e该话题\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e 提到了 \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e 提到了\u003ca href='%{user2Url}'\u003e您\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003e您\u003c/a\u003e提到了 \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"由 \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e 发布","posted_by_you":"由\u003ca href='%{userUrl}'\u003e您\u003c/a\u003e发布","sent_by_user":"由 \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e 发送","sent_by_you":"由\u003ca href='%{userUrl}'\u003e您\u003c/a\u003e发送"},"directory":{"username":"用户名","filter_name":"按用户名筛选","title":"用户","likes_given":"已送出","likes_received":"已收到","topics_entered":"已浏览","topics_entered_long":"浏览的话题","time_read":"阅读时长","topic_count":"话题","topic_count_long":"创建的话题","post_count":"回复","post_count_long":"回帖","no_results":"没有找到结果。","days_visited":"访问天数","days_visited_long":"访问天数","posts_read":"已读","posts_read_long":"已读帖子","last_updated":"最近更新：","total_rows":{"other":"%{count} 位用户"},"edit_columns":{"title":"编辑目录列","save":"保存","reset_to_default":"重置为默认值"},"group":{"all":"所有群组"}},"group_histories":{"actions":{"change_group_setting":"更改群组设置","add_user_to_group":"添加用户","remove_user_from_group":"移除用户","make_user_group_owner":"设为所有者","remove_user_as_group_owner":"撤消所有者"}},"groups":{"member_added":"已添加","member_requested":"请求日期","add_members":{"title":"将用户添加到 %{group_name}","description":"输入您要邀请加入群组中的用户列表或粘贴到逗号分隔的列表中：","usernames_placeholder":"用户名","usernames_or_emails_placeholder":"用户名或电子邮件","notify_users":"通知用户","set_owner":"设置用户为此群组的所有者"},"requests":{"title":"请求","reason":"原因","accept":"接受","accepted":"已接受","deny":"拒绝","denied":"已拒绝","undone":"请求已撤消","handle":"处理成员资格请求"},"manage":{"title":"管理","name":"名称","full_name":"全名","add_members":"添加用户","invite_members":"邀请","delete_member_confirm":"要从群组 '%{group}' 中移除用户 '%{username}' 吗？","profile":{"title":"个人资料"},"interaction":{"title":"互动","posting":"发帖","notification":"通知"},"email":{"title":"电子邮件","status":"已通过 IMAP 同步了 %{old_emails}/%{total_emails} 封邮件。","enable_smtp":"启用 SMTP","enable_imap":"启用 IMAP","test_settings":"测试设置","save_settings":"保存设置","last_updated":"最近更新：","last_updated_by":"更新者","settings_required":"所有设置均为必填项，请先填写所有字段，然后再进行验证。","smtp_settings_valid":"SMTP 设置有效。","smtp_title":"SMTP","smtp_instructions":"当您为群组启用 SMTP 时，从群组收件箱发送的所有出站电子邮件都将通过此处指定的 SMTP 设置，而不是为您的论坛发送的其他电子邮件配置的邮件服务器发送。","imap_title":"IMAP","imap_additional_settings":"附加设置","imap_instructions":"当您为群组启用 IMAP 时，电子邮件将在群组收件箱和提供的 IMAP 服务器与邮箱之间同步。在启用 IMAP 之前，必须启用 SMTP 并验证和测试凭据。SMTP 使用的电子邮件用户名和密码将用于 IMAP。有关详情，请参阅 \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003eDiscourse Meta 功能公告\u003c/a\u003e。","imap_alpha_warning":"警告：此功能仍处于 Alpha 版阶段。只官方支持 Gmail。风险自负！","imap_settings_valid":"IMAP 设置有效。","smtp_disable_confirm":"如果您禁用 SMTP，所有 SMTP 和 IMAP 设置都将被重置，关联功能将被禁用。确定要继续吗？","imap_disable_confirm":"如果您禁用 IMAP，所有 IMAP 设置都将被重置，关联功能将被禁用。确定要继续吗？","imap_mailbox_not_selected":"您必须为此 IMAP 配置选择一个邮箱，否则将不会同步任何邮箱！","prefill":{"title":"使用设置预填充：","gmail":"Gmail"},"credentials":{"title":"凭据","smtp_server":"SMTP 服务器","smtp_port":"SMTP 端口","smtp_ssl":"为 SMTP 使用 SSL","imap_server":"IMAP 服务器","imap_port":"IMAP 端口","imap_ssl":"为 IMAP 使用 SSL","username":"用户名","password":"密码"},"settings":{"title":"设置","allow_unknown_sender_topic_replies":"允许未知发件人回复话题。","allow_unknown_sender_topic_replies_hint":"允许未知发件人回复群组话题。如果未启用此功能，且从未被邀请至该话题的电子邮件地址回复，将创建一个新话题。"},"mailboxes":{"synchronized":"已同步的邮箱","none_found":"未在此电子邮件帐户中找到任何邮箱。","disabled":"已禁用"}},"membership":{"title":"成员资格","access":"访问"},"categories":{"title":"类别","long_title":"类别默认通知","description":"将用户添加到此群组时，其类别通知设置将被设置为这些默认值。之后，他们可以进行更改。","watched_categories_instructions":"自动关注这些类别中的所有话题。组成员将收到所有新帖子和话题的通知，话题旁还会显示新帖子的数量。","tracked_categories_instructions":"自动跟踪这些类别中的所有话题。新帖子的数量将显示在话题旁边。","watching_first_post_categories_instructions":"用户将收到这些类别中每个新话题的第一个帖子的通知。","regular_categories_instructions":"如果已被设为免打扰，这些类别将对群组成员取消免打扰。当用户被提及或其他人回复他们时，他们将收到通知。","muted_categories_instructions":"用户不会收到有关这些类别中新话题的任何通知，它们也不会出现在类别或最新话题页面上。"},"tags":{"title":"标签","long_title":"标签默认通知","description":"将用户添加到此群组时，其标签通知设置将被设置为这些默认值。之后，他们可以进行更改。","watched_tags_instructions":"自动关注带有这些标签的所有话题。组成员将收到所有新帖子和话题的通知，话题旁还会显示新帖子的数量。","tracked_tags_instructions":"自动跟踪带有这些标签的所有话题。新帖子的数量将显示在话题旁边。","watching_first_post_tags_instructions":"用户将收到带有这些标签的每个新话题的第一个帖子的通知。","regular_tags_instructions":"如果已被设为免打扰，这些标签将对群组成员取消免打扰。当用户被提及或其他人回复他们时，他们将收到通知。","muted_tags_instructions":"用户不会收到有关带有这些标签的新话题的任何通知，它们也不会出现在最新话题页面上。"},"logs":{"title":"日志","when":"时间","action":"操作","acting_user":"操作用户","target_user":"目标用户","subject":"主题","details":"详细信息","from":"从","to":"至"}},"permissions":{"title":"权限","none":"没有类别与此群组关联。","description":"此群组的成员可以访问这些类别"},"public_admission":"允许用户自由加入群组（要求群组公开可见）","public_exit":"允许用户自由离开群组","empty":{"posts":"此群组的成员没有发布帖子。","members":"此群组没有成员。","requests":"没有加入此群组的成员资格请求。","mentions":"此群组从未被提及。","messages":"此群组没有消息。","topics":"此群组的成员从未发表话题。","logs":"此群组没有日志。"},"add":"添加","join":"加入","leave":"离开","request":"请求","message":"消息","confirm_leave":"确定要离开此群组吗？","allow_membership_requests":"允许用户向群组所有者发送成员资格请求（要求群组公开可见）","membership_request_template":"在用户发送成员资格请求时向其显示的自定义模板","membership_request":{"submit":"提交请求","title":"请求加入 %{group_name}","reason":"告诉群组所有者您为什么要加入此群组"},"membership":"成员资格","name":"名称","group_name":"群组名称","user_count":"用户","bio":"群组简介","selector_placeholder":"输入用户名","owner":"所有者","index":{"title":"群组","all":"所有群组","empty":"没有可见的群组。","filter":"根据群组类型筛选","owner_groups":"我拥有的群组","close_groups":"已关闭的群组","automatic_groups":"自动生成的群组","automatic":"自动","closed":"已关闭","public":"公开","private":"不公开","public_groups":"公开群组","my_groups":"我的群组","group_type":"群组类型","is_group_user":"成员","is_group_owner":"所有者"},"title":{"other":"群组"},"activity":"活动","members":{"title":"成员","filter_placeholder_admin":"用户名或电子邮件","filter_placeholder":"用户名","remove_member":"移除成员","remove_member_description":"从此群组中移除 \u003cb\u003e%{username}\u003c/b\u003e","make_owner":"设为所有者","make_owner_description":"将 \u003cb\u003e%{username}\u003c/b\u003e 设为此群组的所有者","remove_owner":"移除所有者身份","remove_owner_description":"将 \u003cb\u003e%{username}\u003c/b\u003e 从此群组的所有者中移除","make_primary":"设为主要群组","make_primary_description":"将此群组设为 \u003cb\u003e%{username}\u003c/b\u003e 的主要群组","remove_primary":"移除主要群组状态","remove_primary_description":"移除此群组作为 \u003cb\u003e%{username}\u003c/b\u003e 的主要群组的状态","remove_members":"移除成员","remove_members_description":"从此群组中移除所选用户","make_owners":"设为所有者","make_owners_description":"将所选用户设为此群组的所有者","remove_owners":"移除所有者","remove_owners_description":"将所选用户从此群组的所有者中移除","make_all_primary":"设为所有用户的主要群组","make_all_primary_description":"将此群组设为全部所选用户的主要群组","remove_all_primary":"移除主要群组状态","remove_all_primary_description":"将此群组从主要群组中移除","owner":"所有者","primary":"主要","forbidden":"您无权查看成员列表。","no_filter_matches":"没有匹配该搜索的成员。"},"topics":"话题","posts":"帖子","mentions":"提及","messages":"消息","notification_level":"群组消息的默认通知级别","alias_levels":{"mentionable":"谁能提及 (@) 此群组","messageable":"谁能向此群组发送消息？","nobody":"没有人","only_admins":"仅管理员","mods_and_admins":"仅版主和管理员","members_mods_and_admins":"仅组员、版主和管理员","owners_mods_and_admins":"仅所有者、版主和管理员","everyone":"所有人"},"notifications":{"watching":{"title":"关注","description":"您将在每条消息有新帖子时收到通知，并且会显示新回复数量。"},"watching_first_post":{"title":"关注第一个帖子","description":"您将收到此群组中新消息的通知，但不会收到消息回复。"},"tracking":{"title":"跟踪","description":"您会在别人 @ 您或回复您时收到通知，并且会显示新回复数量。"},"regular":{"title":"常规","description":"您会在别人 @ 您或回复您时收到通知。"},"muted":{"title":"已设为免打扰","description":"您不会收到有关此组中消息的任何通知。"}},"flair_url":"头像图片","flair_upload_description":"使用边长不小于 20px 的正方形图片。","flair_bg_color":"头像背景颜色","flair_bg_color_placeholder":"（可选）十六进制颜色值","flair_color":"头像颜色","flair_color_placeholder":"（可选）十六进制颜色值","flair_preview_icon":"预览图标","flair_preview_image":"预览图片","flair_type":{"icon":"选择一个图标","image":"上传图片"},"default_notifications":{"modal_title":"用户默认通知","modal_description":"要回溯应用此变更吗？这将更改 %{count} 个现有用户的偏好设置。","modal_yes":"是","modal_no":"不，仅对以后应用变更"}},"user_action_groups":{"1":"赞","2":"赞","3":"书签","4":"话题","5":"回复","6":"回应","7":"提及","9":"引用","11":"编辑","12":"发送的条目","13":"收件箱","14":"待处理","15":"草稿"},"categories":{"all":"所有类别","all_subcategories":"所有","no_subcategory":"无","category":"类别","category_list":"显示类别列表","reorder":{"title":"对类别重新排序","title_long":"重新组织类别列表","save":"保存顺序","apply_all":"应用","position":"位置"},"posts":"帖子","topics":"话题","latest":"最新","subcategories":"子类别","muted":"已设为免打扰的类别","topic_sentence":{"other":"%{count} 个话题"},"topic_stat":{"other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"周","month":"月"},"topic_stat_all_time":{"other":"总计 %{number}"},"topic_stat_sentence_week":{"other":"过去一周有 %{count} 个新话题。"},"topic_stat_sentence_month":{"other":"过去一个月有 %{count} 个新话题。"},"n_more":"类别 （其他 %{count} 个）…"},"ip_lookup":{"title":"IP 地址查询","hostname":"主机名","location":"地点","location_not_found":"（未知）","organisation":"组织","phone":"电话","other_accounts":"使用此 IP 地址的其他帐户：","delete_other_accounts":"删除 %{count} 个","username":"用户名","trust_level":"信任级别","read_time":"阅读时间","topics_entered":"参与的话题","post_count":"帖子数量","confirm_delete_other_accounts":"确定要删除这些帐户吗？","powered_by":"使用 \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"已复制"},"user_fields":{"none":"（选择一个选项）","required":"请为“%{name}”输入一个值。"},"user":{"said":"%{username}：","profile":"个人资料","mute":"免打扰","edit":"编辑偏好设置","download_archive":{"button_text":"全部下载","confirm":"确定要下载您的帖子吗？","success":"下载已开始，完成后将通过消息通知您。","rate_limit_error":"帖子每天只能下载一次，请明天再试。"},"new_private_message":"新消息","private_message":"消息","private_messages":"消息","user_notifications":{"filters":{"filter_by":"筛选依据","all":"所有","read":"已读","unread":"未读","unseen":"未读"},"ignore_duration_title":"忽略用户","ignore_duration_username":"用户名","ignore_duration_when":"持续时间：","ignore_duration_save":"忽略","ignore_duration_note":"请注意，所有忽略都会在持续时间到期后自动移除。","ignore_duration_time_frame_required":"请选择时间范围","ignore_no_users":"您没有忽略任何用户。","ignore_option":"已忽略","ignore_option_title":"您将不会收到与此用户相关的通知，并且他们的所有话题和回复都将被隐藏。","add_ignored_user":"添加…","mute_option":"已设为免打扰","mute_option_title":"您不会收到与此用户相关的任何通知。","normal_option":"常规","normal_option_title":"如果此用户回复、引用或提到您，您将收到通知。"},"notification_schedule":{"title":"通知时间表","label":"启用自定义通知时间表","tip":"在这些时间之外，您将自动进入“勿扰”模式。","midnight":"午夜","none":"无","monday":"星期一","tuesday":"星期二","wednesday":"星期三","thursday":"星期四","friday":"星期五","saturday":"星期六","sunday":"星期日","to":"至"},"activity_stream":"活动","read":"已读","read_help":"最近阅读的话题","preferences":"偏好设置","feature_topic_on_profile":{"open_search":"选择一个新话题","title":"选择一个话题","search_label":"通过标题搜索话题","save":"保存","clear":{"title":"清除","warning":"确定要清除精选话题吗？"}},"use_current_timezone":"使用当前时区","profile_hidden":"此用户的公开个人资料已被隐藏。","expand_profile":"展开","sr_expand_profile":"展开个人资料详情","collapse_profile":"收起","sr_collapse_profile":"收起个人资料详情","bookmarks":"书签","bio":"自我介绍","timezone":"时区","invited_by":"邀请人","trust_level":"信任级别","notifications":"通知","statistics":"统计信息","desktop_notifications":{"label":"实时通知","not_supported":"抱歉，此浏览器不支持通知。","perm_default":"启用通知","perm_denied_btn":"权限被拒绝","perm_denied_expl":"您拒绝了通知的权限。通过您的浏览器设置允许通知。","disable":"禁用通知","enable":"启用通知","each_browser_note":"注意：您必须在您使用的每个浏览器上更改此设置。在“勿扰”模式下，所有通知都将被禁用，无论此设置如何。","consent_prompt":"当其他人回复您的帖子时是否接收实时通知？"},"dismiss":"关闭","dismiss_notifications":"全部关闭","dismiss_notifications_tooltip":"将所有未读通知标记为已读","no_messages_title":"您没有任何消息","no_messages_body":"需要直接与某人对话而不是公开讨论？选择他的头像并点击 %{icon} 消息按钮，向他们发送消息。\u003cbr\u003e\u003cbr\u003e 如果您需要帮助，可以\u003ca href='%{aboutUrl}'\u003e向管理人员发送消息\u003c/a\u003e。\n","no_bookmarks_title":"您还没有将任何内容加入书签","no_bookmarks_body":"使用 %{icon} 按钮开始将帖子加入书签，它们将出现在这里，便于参考。您也可以安排提醒！\n","no_bookmarks_search":"使用提供的搜索查询未找到书签。","no_notifications_title":"您还没有任何通知","no_notifications_body":"您将直接在此面板上收到与您相关的活动通知，包括对您的话题和帖子的回复，以及当有人\u003cb\u003e提及 (@)\u003c/b\u003e 您或引用您以及回复您关注的话题时。当您有一段时间没有登录时，通知还将发送到您的电子邮件。\u003cbr\u003e\u003cbr\u003e查找 %{icon} 以决定您想收到通知的具体话题、类别和标签。有关详情，请参阅您的\u003ca href='%{preferencesUrl}'\u003e通知偏好设置\u003c/a\u003e。\n","no_notifications_page_title":"您还没有任何通知","no_notifications_page_body":"您将收到有关与您直接相关的活动的通知，其中包括对您的主题和帖子的回复、有人 \u003cb\u003e@提及\u003c/b\u003e 您、引用您的帖子时，或者对您正在浏览的主题发出回复。当您有一段时间没有登录时，通知也会发送到您的邮箱。 \u003cbr\u003e\u003cbr\u003e 寻找 %{icon} 来决定您希望通知哪些特定主题、类别和标签。有关更多信息，请参阅您的 \u003ca href='%{preferencesUrl}'\u003e通知选项\u003c/a\u003e。\n","first_notification":"您的第一个通知！选中它以开始。","dynamic_favicon":"在浏览器图标上显示数量","skip_new_user_tips":{"description":"跳过新用户入门提示和徽章","not_first_time":"不是第一次？","skip_link":"跳过这些提示","read_later":"稍后再读。"},"theme_default_on_all_devices":"将其设为我所有设备上的默认主题","color_scheme_default_on_all_devices":"在我的所有设备上设置默认配色方案","color_scheme":"配色方案","color_schemes":{"default_description":"默认主题","disable_dark_scheme":"与常规相同","dark_instructions":"您可以通过切换设备的深色模式来预览深色模式配色方案。","undo":"重置","regular":"常规","dark":"深色模式","default_dark_scheme":"（站点默认）"},"dark_mode":"深色模式","dark_mode_enable":"启用自动深色模式配色方案","text_size_default_on_all_devices":"将其设为我所有设备上的默认文本大小","allow_private_messages":"允许其他用户向我发送个人消息","external_links_in_new_tab":"在新标签页中打开所有外部链接","enable_quoting":"为突出显示的文字启用引用回复","enable_defer":"启用延迟以将话题标记为未读","change":"更改","featured_topic":"精选话题","moderator":"%{user} 是版主","admin":"%{user} 是管理员","moderator_tooltip":"此用户是版主","admin_tooltip":"此用户是管理员","silenced_tooltip":"此用户已被禁言","suspended_notice":"此用户已被封禁至 %{date}。","suspended_permanently":"此用户已被封禁。","suspended_reason":"原因：","github_profile":"GitHub","email_activity_summary":"活动摘要","mailing_list_mode":{"label":"邮寄名单模式","enabled":"启用邮寄名单模式","instructions":"此设置将替换活动摘要。\u003cbr /\u003e\n已设为免打扰的话题和类别将不会被包含在这些电子邮件中。\n","individual":"为每个新帖子发送一封电子邮件","individual_no_echo":"为除了我发表的新帖子之外的每个新帖子发送一封电子邮件","many_per_day":"每当有新帖子时都向我发送电子邮件（每天大约 %{dailyEmailEstimate} 封）","few_per_day":"每当有新帖子时都向我发送电子邮件（每天大约 2 封）","warning":"邮寄名单模式已启用。电子邮件通知设置被覆盖。"},"tag_settings":"标签","watched_tags":"已关注","watched_tags_instructions":"您将自动关注带有这些标签的所有话题。您会收到所有新帖子和话题的通知，话题旁还会显示新帖子的数量。","tracked_tags":"已跟踪","tracked_tags_instructions":"您将自动跟踪带有这些标签的所有话题。新帖子的数量将显示在话题旁边。","muted_tags":"已设为免打扰","muted_tags_instructions":"您不会收到有关带有这些标签的新话题的任何通知，它们也不会出现在最新话题页面上。","watched_categories":"已关注","watched_categories_instructions":"您将自动关注这些类别中的所有话题。您会收到所有新帖子和话题的通知，话题旁还会显示新帖子的数量。","tracked_categories":"已跟踪","tracked_categories_instructions":"您将自动跟踪这些类别中的所有话题。新帖子的数量将显示在话题旁边。","watched_first_post_categories":"关注第一个帖子","watched_first_post_categories_instructions":"您将收到这些类别中每个新话题的第一个帖子的通知。","watched_first_post_tags":"关注第一个帖子","watched_first_post_tags_instructions":"您将收到带有这些标签的每个新话题的第一个帖子的通知。","muted_categories":"已设为免打扰","muted_categories_instructions":"您不会收到有关这些类别中新话题的任何通知，它们也不会出现在类别或最新话题页面上。","muted_categories_instructions_dont_hide":"您不会收到有关这些类别中新话题的任何通知。","regular_categories":"常规","regular_categories_instructions":"您将在“最新”和“热门”话题列表中看到这些类别。","no_category_access":"作为版主，您具有有限的类别访问权限，保存已被禁用。","delete_account":"删除我的帐户","delete_account_confirm":"确定要永久删除您的帐户吗？此操作无法撤消！","deleted_yourself":"您的帐户已被成功删除。","delete_yourself_not_allowed":"如果您希望删除您的帐户，请联系管理人员。","unread_message_count":"消息","admin_delete":"删除","users":"用户","muted_users":"已设为免打扰","muted_users_instructions":"屏蔽来自这些用户的所有通知和 PM。","allowed_pm_users":"已允许","allowed_pm_users_instructions":"仅允许来自这些用户的 PM。","allow_private_messages_from_specific_users":"仅允许特定用户向我发送个人消息","ignored_users":"已忽略","ignored_users_instructions":"屏蔽来自这些用户的所有帖子、通知和 PM。","tracked_topics_link":"显示","automatically_unpin_topics":"当我到达底部时自动取消置顶话题。","apps":"应用","revoke_access":"撤消访问权限","undo_revoke_access":"撤消访问权限撤消操作","api_approved":"已批准：","api_last_used_at":"最后使用时间：","theme":"主题","save_to_change_theme":"主题会在您点击“%{save_text}”后更新。","home":"默认首页","staged":"暂存","staff_counters":{"flags_given":"有用的举报","flagged_posts":"被举报的帖子","deleted_posts":"已删除的帖子","suspensions":"封禁","warnings_received":"警告","rejected_posts":"被拒绝的帖子"},"messages":{"all":"所有收到的信息","inbox":"收件箱","personal":"个人","latest":"最新","sent":"已发送","unread":"未读","unread_with_count":{"other":"未读 (%{count})"},"new":"新","new_with_count":{"other":"新 (%{count})"},"archive":"归档","groups":"我的群组","move_to_inbox":"移至收件箱","move_to_archive":"归档","failed_to_move":"无法移动所选消息（可能您的网络已掉线）","tags":"标签","warnings":"官方警告","read_more_in_group":"想阅读更多？浏览%{groupLink}或中的其他话题。"},"preferences_nav":{"account":"帐户","security":"安全性","profile":"个人资料","emails":"电子邮件","notifications":"通知","categories":"类别","users":"用户","tags":"标签","interface":"界面","apps":"应用"},"change_password":{"success":"（电子邮件已发送）","in_progress":"（正在发送电子邮件）","error":"（错误）","emoji":"挂锁表情符号","action":"发送密码重置电子邮件","set_password":"设置密码","choose_new":"选择一个新密码","choose":"选择一个密码"},"second_factor_backup":{"title":"双重备份代码","regenerate":"重新生成","disable":"禁用","enable":"启用","enable_long":"启用备份代码","manage":{"other":"管理备份代码。您还有 \u003cstrong\u003e%{count}\u003c/strong\u003e 个备份代码。"},"copy_to_clipboard":"复制到剪贴板","copy_to_clipboard_error":"复制到剪贴板时出错","copied_to_clipboard":"已复制到剪贴板","download_backup_codes":"下载备份代码","remaining_codes":{"other":"您还有 \u003cstrong\u003e%{count}\u003c/strong\u003e 个备份代码。"},"use":"使用备份代码","enable_prerequisites":"您必须先启用一个主要双重方法，然后才能生成备份代码。","codes":{"title":"已生成备份代码","description":"每个备份代码只能使用一次。请将其存放于安全但易于存取的地方。"}},"second_factor":{"title":"双重身份验证","enable":"管理双重身份验证","disable_all":"全部禁用","forgot_password":"忘记密码了？","confirm_password_description":"请确认您的密码以继续","name":"名称","label":"代码","rate_limit":"请稍候，然后再尝试其他身份验证代码。","enable_description":"在支持的应用 (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) 中扫描此 QR 码并输入您的身份验证代码。\n","disable_description":"请输入应用中的身份验证代码","show_key_description":"手动输入","short_description":"使用一次性安全码保护您的帐户。\n","extended_description":"双重身份验证会要求您提供除密码之外的一次性令牌，从而为您的帐户增加额外的安全性。可以在 \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e 和 \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e 设备上生成令牌。\n","oauth_enabled_warning":"请注意，一旦您为帐户启用双重身份验证，社交登录将被禁用。","use":"使用身份验证器应用","enforced_notice":"在访问此站点之前，您需要启用双重身份验证。","disable":"禁用","disable_confirm":"确定要禁用所有的双重方法吗？","save":"保存","edit":"编辑","edit_title":"编辑身份验证器","edit_description":"身份验证器名称","enable_security_key_description":"准备好\u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003e硬件安全密钥\u003c/a\u003e后，请按下面的“注册”按钮。\n","totp":{"title":"基于令牌的身份验证器","add":"添加身份验证器","default_name":"我的身份验证器","name_and_code_required_error":"您必须提供名称和身份验证器应用中的代码。"},"security_key":{"register":"注册","title":"安全密钥","add":"添加安全密钥","default_name":"主要安全密钥","not_allowed_error":"安全密钥注册过程已超时或被取消。","already_added_error":"您已注册此安全密钥，无需再次注册。","edit":"编辑安全密钥","save":"保存","edit_description":"安全密钥名称","name_required_error":"您必须为您的安全密钥提供一个名称。"}},"change_about":{"title":"更改自我介绍","error":"更改此值时出错。"},"change_username":{"title":"更改用户名","confirm":"确定要更改您的用户名吗？","taken":"抱歉，该用户名已被使用。","invalid":"该用户名无效，用户名只能包含字母和数字"},"add_email":{"title":"添加电子邮件","add":"添加"},"change_email":{"title":"更改电子邮件","taken":"抱歉，该电子邮件不可用。","error":"更改您的电子邮件时出错。也许该地址已被使用？","success":"我们已向该地址发送一封电子邮件。请按照确认说明进行操作。","success_via_admin":"我们已向该地址发送一封电子邮件。用户需要按照电子邮件中的确认说明进行操作。","success_staff":"我们已向您当前的地址发送一封电子邮件。请按照确认说明进行操作。"},"change_avatar":{"title":"更改个人资料照片","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e，基于","gravatar_title":"在 %{gravatarName} 的网站上更改您的头像","gravatar_failed":"我们无法找到使用该电子邮件地址的 %{gravatarName}。","refresh_gravatar_title":"刷新您的 %{gravatarName}","letter_based":"系统分配的个人资料照片","uploaded_avatar":"自定义图片","uploaded_avatar_empty":"上传自定义图片","upload_title":"上传图片","image_is_not_a_square":"警告：我们已经裁剪了您的图片；宽度和高度不相等。","logo_small":"站点的小徽标。默认情况下使用。"},"change_profile_background":{"title":"个人资料标题","instructions":"个人资料标题将居中且默认宽度为 1110px。"},"change_card_background":{"title":"用户卡片背景","instructions":"背景图片将居中且默认宽度为 590px。"},"change_featured_topic":{"title":"精选话题","instructions":"此话题的链接将显示在您的用户卡片和个人资料中。"},"email":{"title":"电子邮件","primary":"常用电子邮件","secondary":"辅助电子邮件","primary_label":"常用","unconfirmed_label":"未确认","resend_label":"重新发送确认电子邮件","resending_label":"正在发送…","resent_label":"电子邮件已发送","update_email":"更改电子邮件","set_primary":"设置常用电子邮件","destroy":"移除电子邮件","add_email":"添加备用电子邮件","auth_override_instructions":"可以通过身份验证服务提供商更新电子邮件。","no_secondary":"没有辅助电子邮件","instructions":"绝不会向公众显示。","admin_note":"注意：管理员用户更改非管理员用户的电子邮件，则说明后者无法访问其原始电子邮件帐户，因此将向后者的新地址发送一封重置密码的电子邮件。在用户完成密码重置流程之前，他们的电子邮件不会更改。","ok":"我们将向您发送电子邮件以确认","required":"请输入一个电子邮件地址","invalid":"请输入有效的电子邮件地址","authenticated":"您的电子邮件已被 %{provider} 验证","invite_auth_email_invalid":"您的邀请电子邮件与 %{provider} 验证的电子邮件不匹配","authenticated_by_invite":"您的电子邮件已被此邀请验证","frequency_immediately":"如果您还没有阅读我们通过电子邮件发送给您的内容，我们会立即给您发送电子邮件。","frequency":{"other":"只有在过去 %{count} 分钟内没有见到您，我们才会向您发送电子邮件。"}},"associated_accounts":{"title":"关联帐户","connect":"连接","revoke":"撤消","cancel":"取消","not_connected":"（未连接）","confirm_modal_title":"连接 %{provider} 帐户","confirm_description":{"disconnect":"您现有的 %{provider} 帐户 '%{account_description}' 将被断开连接。","account_specific":"您的 %{provider} 帐户 '%{account_description}' 将被用于身份验证。","generic":"您的 %{provider} 帐户将被用于身份验证。"}},"name":{"title":"姓名","instructions":"您的全名（可选）","instructions_required":"您的全名","required":"请输入姓名","too_short":"您的姓名过短","ok":"您的姓名没有问题"},"username":{"title":"用户名","instructions":"独一无二，没有空格，简短","short_instructions":"其他人可以使用 @%{username} 来提及您","available":"您的用户名可用","not_available":"不可用，试试 %{suggestion}？","not_available_no_suggestion":"不可用","too_short":"您的用户名过短","too_long":"您的用户名过长","checking":"正在检查用户名是否可用…","prefilled":"电子邮件与此注册用户名匹配","required":"请输入一个用户名","edit":"编辑用户名"},"locale":{"title":"界面语言","instructions":"用户界面语言，将在您刷新页面后更改。","default":"（默认）","any":"任意"},"password_confirmation":{"title":"再次输入密码"},"invite_code":{"title":"邀请码","instructions":"注册帐户需要邀请码"},"auth_tokens":{"title":"最近使用的设备","details":"详细信息","log_out_all":"全部退出","not_you":"不是您？","show_all":"显示全部 (%{count})","show_few":"显示部分","was_this_you":"这是您吗？","was_this_you_description":"如果不是您，我们建议您更改密码并退出所有登录。","browser_and_device":"%{browser}，在 %{device} 上","secure_account":"保护我的帐户","latest_post":"您上次发帖…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003e正在使用\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"最后一个帖子","last_seen":"最后活动","created":"加入日期：","log_out":"退出","location":"地点","website":"网站","email_settings":"电子邮件","hide_profile_and_presence":"隐藏我的公开个人资料和状态功能","enable_physical_keyboard":"在 iPad 上启用物理键盘支持","text_size":{"title":"文本大小","smallest":"最小","smaller":"更小","normal":"正常","larger":"更大","largest":"最大"},"title_count_mode":{"title":"背景页面标题显示数量：","notifications":"新通知","contextual":"新页面内容"},"like_notification_frequency":{"title":"被赞时通知","always":"始终","first_time_and_daily":"每日帖子第一次被赞","first_time":"帖子第一次被赞","never":"从不"},"email_previous_replies":{"title":"在电子邮件底部包含以前的回复","unless_emailed":"除非之前发送过","always":"始终","never":"从不"},"email_digests":{"title":"当我不访问这里时，向我发送热门话题和回复的电子邮件摘要","every_30_minutes":"每 30 分钟","every_hour":"每小时","daily":"每天","weekly":"每周","every_month":"每月","every_six_months":"每六个月"},"email_level":{"title":"当有人引用我的话、回复我的帖子、提及我的用户名或邀请我加入某个话题时，给我发送电子邮件","always":"始终","only_when_away":"只在离开时","never":"从不"},"email_messages_level":"当有人给我发消息时给我发送电子邮件","include_tl0_in_digests":"在摘要电子邮件中包含来自新用户的内容","email_in_reply_to":"在电子邮件中包含帖子回复节选","other_settings":"其他","categories_settings":"类别","new_topic_duration":{"label":"何时视为新话题","not_viewed":"我还没看过","last_here":"在我上次访问后创建","after_1_day":"在过去一天内创建","after_2_days":"在过去 2 天内创建","after_1_week":"在过去一周内创建","after_2_weeks":"在过去 2 周内创建"},"auto_track_topics":"自动跟踪我进入的话题","auto_track_options":{"never":"从不","immediately":"立即","after_30_seconds":"30 秒后","after_1_minute":"1 分钟后","after_2_minutes":"2 分钟后","after_3_minutes":"3 分钟后","after_4_minutes":"4 分钟后","after_5_minutes":"5 分钟后","after_10_minutes":"10 分钟后"},"notification_level_when_replying":"当我在话题中发帖后，将该话题设置为","invited":{"title":"邀请","pending_tab":"待处理","pending_tab_with_count":"待处理 (%{count})","expired_tab":"已过期","expired_tab_with_count":"已过期 (%{count})","redeemed_tab":"已确认","redeemed_tab_with_count":"已确认 (%{count})","invited_via":"邀请","invited_via_link":"链接 %{key}（已确认 %{count}/%{max}）","groups":"群组","topic":"话题","sent":"创建/上次发送日期","expires_at":"过期时间","edit":"编辑","remove":"移除","copy_link":"获取链接","reinvite":"重新发送电子邮件","reinvited":"已重新发送邀请","removed":"已移除","search":"输入以搜索邀请…","user":"邀请用户","none":"没有要显示的邀请。","truncated":{"other":"正在显示前 %{count} 个邀请。"},"redeemed":"已确认的邀请","redeemed_at":"已确认","pending":"待处理邀请","topics_entered":"浏览的话题","posts_read_count":"已读帖子","expired":"此邀请已过期。","remove_all":"移除过期的邀请","removed_all":"已移除所有已过期的邀请！","remove_all_confirm":"确定要移除所有已过期的邀请吗？","reinvite_all":"重新发送所有邀请","reinvite_all_confirm":"确定要重新发送所有邀请吗？","reinvited_all":"已发送所有邀请！","time_read":"阅读时间","days_visited":"访问天数","account_age_days":"帐户启用时长（天）","create":"邀请","generate_link":"创建邀请链接","link_generated":"这是您的邀请链接！","valid_for":"邀请链接只对此电子邮件地址有效：%{email}","single_user":"通过电子邮件邀请","multiple_user":"通过链接邀请","invite_link":{"title":"邀请链接","success":"邀请链接已成功生成！","error":"生成邀请链接时出错","max_redemptions_allowed_label":"允许多少人通过此链接注册？","expires_at":"此邀请链接何时到期？"},"invite":{"new_title":"创建邀请","edit_title":"编辑邀请","instructions":"分享此链接可立即授予访问此站点的权限","copy_link":"复制链接","expires_in_time":"于 %{time}过期","expired_at_time":"过期时间为 %{time}","show_advanced":"显示高级选项","hide_advanced":"隐藏高级选项","restrict_email":"限制为一个电子邮件地址","max_redemptions_allowed":"最大使用次数","add_to_groups":"添加到群组","invite_to_topic":"到达此话题","expires_at":"过期时间","custom_message":"可选个人信息","send_invite_email":"保存并发送电子邮件","save_invite":"保存邀请","invite_saved":"邀请已保存。","invite_copied":"邀请链接已复制。"},"bulk_invite":{"none":"此页面没有要显示的邀请。","text":"批量邀请","instructions":"\u003cp\u003e邀请用户以快速壮大您的社区。准备一个 \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003e CSV 文件\u003c/a\u003e，每行至少包含一个您想要邀请的电子邮件地址。如果您想要将他们添加到群组或者在他们首次登录时将其引导至特定话题，可以提供由逗号分隔的信息，如下所示。\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003e将向您上传的 CSV 文件中的每一个电子邮件地址发送邀请，您可以稍后进行管理。\u003c/p\u003e\n","progress":"已上传 %{progress}%…","success":"文件上传成功。该过程完成后，您将收到消息通知。","error":"抱歉，文件应为 CSV 格式。"}},"password":{"title":"密码","too_short":"您的密码过短。","common":"该密码过于常见。","same_as_username":"您的密码与您的用户名相同。","same_as_email":"您的密码与您的电子邮件相同。","ok":"您的密码没有问题。","instructions":"至少 %{count} 个字符","required":"请输入密码"},"summary":{"title":"摘要","stats":"统计信息","time_read":"阅读时间","recent_time_read":"最近阅读时间","topic_count":{"other":"创建的话题"},"post_count":{"other":"创建的帖子"},"likes_given":{"other":"已送出"},"likes_received":{"other":"已收到"},"days_visited":{"other":"访问天数"},"topics_entered":{"other":"浏览的话题"},"posts_read":{"other":"已读帖子"},"bookmark_count":{"other":"书签"},"top_replies":"热门回复","no_replies":"暂无回复。","more_replies":"更多回复","top_topics":"热门话题","no_topics":"暂无话题。","more_topics":"更多话题","top_badges":"热门徽章","no_badges":"暂无徽章。","more_badges":"更多徽章","top_links":"热门链接","no_links":"暂无链接。","most_liked_by":"被谁赞得最多","most_liked_users":"赞最多","most_replied_to_users":"最多回复至","no_likes":"暂无赞。","top_categories":"热门类别","topics":"话题","replies":"回复"},"ip_address":{"title":"最后使用的 IP 地址"},"registration_ip_address":{"title":"注册 IP 地址"},"avatar":{"title":"个人资料照片","header_title":"个人资料、消息、书签和偏好设置","name_and_description":"%{name} - %{description}","edit":"编辑个人资料照片"},"title":{"title":"头衔","none":"（无）","instructions":"出现在您的用户名之后"},"flair":{"title":"资质","none":"（无）","instructions":"图标显示在您的个人资料照片旁边"},"primary_group":{"title":"主要群组","none":"（无）"},"filters":{"all":"所有"},"stream":{"posted_by":"发帖人","sent_by":"发送人","private_message":"消息","the_topic":"话题"}},"loading":"正在加载…","errors":{"prev_page":"无法加载","reasons":{"network":"网络错误","server":"服务器错误","forbidden":"访问被拒绝","unknown":"错误","not_found":"找不到页面"},"desc":{"network":"请检查您的连接。","network_fixed":"网络似乎已恢复正常","server":"错误代码：%{status}","forbidden":"您无权查看。","not_found":"糟糕，应用程序试图加载一个不存在的 URL。","unknown":"出了点问题。"},"buttons":{"back":"返回","again":"重试","fixed":"加载页面"}},"modal":{"close":"关闭","dismiss_error":"忽略错误"},"close":"关闭","assets_changed_confirm":"此站点刚才收到了一个软件更新。是否立即获取最新版本？","logout":"您已退出。","refresh":"刷新","home":"首页","read_only_mode":{"enabled":"此站点处于只读模式。您可以继续浏览，但是回复、点赞和其他操作暂时被禁用。","login_disabled":"当站点处于只读模式时，登录被禁用。","logout_disabled":"当站点处于只读模式时，退出被禁用。"},"logs_error_rate_notice":{},"learn_more":"了解更多…","first_post":"第一个帖子","mute":"免打扰","unmute":"取消免打扰","last_post":"发布时间","local_time":"当地时间","time_read":"阅读","time_read_recently":"最近 %{time_read}","time_read_tooltip":"总阅读时间 %{time_read}","time_read_recently_tooltip":"总阅读时间 %{time_read}（最近60天 %{recent_time_read}）","last_reply_lowercase":"最后回复","replies_lowercase":{"other":"回复"},"signup_cta":{"sign_up":"注册","hide_session":"明天提醒我","hide_forever":"不，谢谢","hidden_for_session":"好的，我们会在明天问您。您也可以随时使用“登录”来创建帐户。","intro":"您好！看起来您很喜欢讨论，但您还没有注册帐户。","value_prop":"当您创建帐户时，我们会准确记住您阅读过的内容，因此您总可以从上次停止的地方返回。每当有人回复您时，您还会在此处和通过电子邮件收到通知。您可以为帖子点赞来分享爱。:heartpulse:"},"summary":{"enabled_description":"您正在查看此话题的摘要：社区确定的最有趣的帖子。","description":{"other":"有 \u003cb\u003e%{count}\u003c/b\u003e 个回复。"},"enable":"总结此话题","disable":"显示所有帖子","short_label":"总结","short_title":"显示此主题的摘要：社区确定的最有趣的帖子"},"deleted_filter":{"enabled_description":"此话题包含已删除的帖子，它们已被隐藏。","disabled_description":"已显示话题中已删除的帖子。","enable":"隐藏已删除的帖子","disable":"显示已删除的帖子"},"private_message_info":{"title":"消息","invite":"邀请其他人…","edit":"添加或移除…","remove":"移除…","add":"添加…","leave_message":"真的要离开此消息吗？","remove_allowed_user":"真的要将 %{name} 从此消息中移除吗？","remove_allowed_group":"真的要将 %{name} 从此消息中移除吗？"},"email":"电子邮件","username":"用户名","last_seen":"最后活动","created":"创建","created_lowercase":"创建","trust_level":"信任级别","search_hint":"用户名、电子邮件或 IP 地址","create_account":{"header_title":"欢迎！","subheader_title":"让我们创建您的帐户","disclaimer":"注册，即表示您同意\u003ca href='%{privacy_link}' target='blank'\u003e隐私政策\u003c/a\u003e和\u003ca href='%{tos_link}' target='blank'\u003e服务条款\u003c/a\u003e。","title":"创建您的帐户","failed":"出了点问题，可能此电子邮件已被注册，试试点击忘记密码链接","associate":"已经有账户？ \u003ca href='%{associate_link}'\u003e登录\u003c/a\u003e 以关联你的 %{provider} 账户。"},"forgot_password":{"title":"密码重置","action":"我忘记密码了","invite":"输入您的用户名或电子邮件地址，我们将向您发送密码重置电子邮件。","reset":"重置密码","complete_username":"如果存在与用户名 \u003cb\u003e%{username}\u003c/b\u003e 相匹配的帐户，您应该会收到一封电子邮件，其中包含有关如何尽快重置密码的说明。","complete_email":"如果存在与 \u003cb\u003e%{email}\u003c/b\u003e 相匹配的帐户，您应该会收到一封电子邮件，其中包含有关如何尽快重置密码的说明。","complete_username_found":"我们找到一个与用户名 \u003cb\u003e%{username}\u003c/b\u003e 匹配的帐户。您应该会收到一封电子邮件，其中包含有关如何尽快重置密码的说明。","complete_email_found":"我们找到一个与 \u003cb\u003e%{email}\u003c/b\u003e 匹配的帐户。您应该会收到一封电子邮件，其中包含有关如何尽快重置密码的说明。","complete_username_not_found":"没有与用户名 \u003cb\u003e%{username}\u003c/b\u003e 相匹配的帐户","complete_email_not_found":"没有与 \u003cb\u003e%{email}\u003c/b\u003e 相匹配的帐户","help":"没收到电子邮件？务必查看您的垃圾邮件文件夹。\u003cp\u003e不确定使用了哪个电子邮件地址？输入电子邮件地址来查看是否存在。\u003c/p\u003e\u003cp\u003e如果您无法再访问您的帐户使用的电子邮件地址，请联系\u003ca href='%{basePath}/about'\u003e我们的管理人员\u003c/a\u003e。\u003c/p\u003e","button_ok":"确定","button_help":"帮助"},"email_login":{"link_label":"通过电子邮件向我发送登录链接","button_label":"通过电子邮件","login_link":"跳过密码；通过电子邮件向我发送登录链接","emoji":"挂锁表情符号","complete_username":"如果存在与用户名 \u003cb\u003e%{username}\u003c/b\u003e 相匹配的帐户，您应该很快就会收到一封包含登录链接的电子邮件。","complete_email":"如果存在与 \u003cb\u003e%{email}\u003c/b\u003e 相匹配的帐户，您应该很快就会收到一封包含登录链接的电子邮件。","complete_username_found":"我们找到一个与用户名 \u003cb\u003e%{username}\u003c/b\u003e 相匹配的帐户，您应该很快就会收到一封包含登录链接的电子邮件。","complete_email_found":"我们找到一个与 \u003cb\u003e%{email}\u003c/b\u003e 相匹配的帐户，您应该很快就会收到一封包含登录链接的电子邮件。","complete_username_not_found":"没有与用户名 \u003cb\u003e%{username}\u003c/b\u003e 相匹配的帐户","complete_email_not_found":"没有与 \u003cb\u003e%{email}\u003c/b\u003e 相匹配的帐户","confirm_title":"继续访问 %{site_name}","logging_in_as":"以 %{email} 登录","confirm_button":"完成登录"},"login":{"header_title":"欢迎回来","subheader_title":"登录您的帐户","title":"登录","username":"用户","password":"密码","second_factor_title":"双重身份验证","second_factor_description":"请输入应用中的身份验证代码：","second_factor_backup":"使用备份代码登录","second_factor_backup_title":"双重备份","second_factor_backup_description":"请输入您的备份代码之一：","second_factor":"使用身份验证器应用登录","security_key_description":"当您准备好物理安全密钥后，请按下面的“使用安全密钥进行身份验证”按钮。","security_key_alternative":"尝试另一种方式","security_key_authenticate":"使用安全密钥进行身份验证","security_key_not_allowed_error":"安全密钥身份验证过程超时或被取消。","security_key_no_matching_credential_error":"在提供的安全密钥中找不到匹配的凭据。","security_key_support_missing_error":"您当前的设备或浏览器不支持使用安全密钥。请使用其他方法。","email_placeholder":"电子邮件/用户名","caps_lock_warning":"大写锁定已开启","error":"未知错误","cookies_error":"您的浏览器似乎禁用了 Cookie。如果不先启用它们，您可能无法登录。","rate_limit":"请稍后再尝试登录。","blank_username":"请输入您的电子邮件或用户名。","blank_username_or_password":"请输入您的电子邮件或用户名和密码。","reset_password":"重置密码","logging_in":"正在登录…","or":"或者","authenticating":"正在进行身份验证…","awaiting_activation":"您的帐户正在等待激活，请使用忘记密码链接发出另一封激活电子邮件。","awaiting_approval":"您的帐户尚未得到管理人员的批准。批准后，您将收到一封电子邮件。","requires_invite":"抱歉，本论坛仅接受邀请注册。","not_activated":"您还无法登录。我们之前向 \u003cb\u003e%{sentTo}\u003c/b\u003e 发送了一封激活电子邮件。请按照电子邮件中的说明操作来激活您的帐户。","not_allowed_from_ip_address":"您无法从该 IP 地址登录。","admin_not_allowed_from_ip_address":"您无法从该 IP 地址以管理员身份登录。","resend_activation_email":"点击此处重新发送激活电子邮件。","omniauth_disallow_totp":"您的帐户已启用双重身份验证。请使用您的密码登录。","resend_title":"重新发送激活电子邮件","change_email":"更改电子邮件地址","provide_new_email":"提供一个新地址，我们将重新发送您的确认电子邮件。","submit_new_email":"更新电子邮件地址","sent_activation_email_again":"我们向 \u003cb\u003e%{currentEmail}\u003c/b\u003e 发送了另一封激活电子邮件。电子邮件可能需要几分钟才能送达；务必检查您的垃圾邮件文件夹。","sent_activation_email_again_generic":"我们发送了另一封激活电子邮件。电子邮件可能需要几分钟才能送达；务必检查您的垃圾邮件文件夹。","to_continue":"请登录","preferences":"您需要登录才能更改用户偏好设置。","not_approved":"您的帐户尚未获得批准。一旦可以登录，您会收到电子邮件通知。","google_oauth2":{"name":"Google","title":"通过 Google","sr_title":"使用谷歌登录"},"twitter":{"name":"Twitter","title":"通过 Twitter","sr_title":"使用推特登录"},"instagram":{"name":"Instagram","title":"通过 Instagram","sr_title":"使用 Instagram 登录"},"facebook":{"name":"Facebook","title":"通过 Facebook","sr_title":"用脸书登入"},"github":{"name":"GitHub","title":"通过 GitHub","sr_title":"使用 GitHub 登录"},"discord":{"name":"Discord","title":"通过 Discord","sr_title":"使用 Discord 登录"},"second_factor_toggle":{"totp":"改用身份验证器应用","backup_code":"改用备份代码"}},"invites":{"accept_title":"邀请","emoji":"信封表情符号","welcome_to":"欢迎来到 %{site_name}！","invited_by":"邀请您的是：","social_login_available":"您还可以通过使用该电子邮件的任何社交登录信息登录。","your_email":"您的帐户电子邮件地址为 \u003cb\u003e%{email}\u003c/b\u003e。","accept_invite":"接受邀请","success":"您的帐户已创建，您现在已登录。","name_label":"姓名","password_label":"密码","optional_description":"（可选）"},"password_reset":{"continue":"继续访问 %{site_name}"},"emoji_set":{"apple_international":"Apple/国际","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"仅类别","categories_with_featured_topics":"包含精选话题的类别","categories_and_latest_topics":"类别和最新话题","categories_and_top_topics":"类别和热门话题","categories_boxes":"带子类别的框","categories_boxes_with_topics":"带精选话题的框"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"正在加载…"},"category_row":{"topic_count":{"other":"此类别下有 %{count} 个话题"},"plus_subcategories_title":{"other":"%{name} 和 %{count} 个子类别"},"plus_subcategories":{"other":"+ %{count} 个子类别"}},"select_kit":{"delete_item":"删除 %{name} 个","filter_by":"筛选条件：%{name}","select_to_filter":"选择要筛选的值","default_header_text":"选择…","no_content":"未找到匹配项","results_count":{"other":"%{count} 结果"},"filter_placeholder":"搜索…","filter_placeholder_with_any":"搜索或创建…","create":"创建：'%{content}'","max_content_reached":{"other":"您只能选择 %{count} 个条目。"},"min_content_not_reached":{"other":"至少选择 %{count} 个条目。"},"invalid_selection_length":{"other":"至少选择 %{count} 个字符。"},"components":{"tag_drop":{"filter_for_more":"筛选更多…"},"categories_admin_dropdown":{"title":"管理类别"}}},"date_time_picker":{"from":"从","to":"至"},"emoji_picker":{"filter_placeholder":"搜索表情符号","smileys_\u0026_emotion":"笑脸与情感","people_\u0026_body":"人与身体","animals_\u0026_nature":"动物与自然","food_\u0026_drink":"食物和饮料","travel_\u0026_places":"旅行与地点","activities":"活动","objects":"对象","symbols":"符号","flags":"旗帜","recent":"近期使用","default_tone":"无肤色","light_tone":"浅肤色","medium_light_tone":"中等浅肤色","medium_tone":"中等肤色","medium_dark_tone":"中等深肤色","dark_tone":"深肤色","default":"自定义表情符号"},"shared_drafts":{"title":"共享草稿","notice":"此话题只对可以发布共享草稿的用户可见。","destination_category":"目标类别","publish":"发布共享草稿","confirm_publish":"确定要发布此草稿吗？","publishing":"正在发布话题…"},"composer":{"emoji":"表情符号 :)","more_emoji":"更多…","options":"选项","whisper":"密语","unlist":"取消公开","add_warning":"这是一个官方警告。","toggle_whisper":"切换密语","toggle_unlisted":"切换取消公开","posting_not_on_topic":"您想回复哪个话题？","saved_local_draft_tip":"已保存到本地","similar_topics":"您的话题类似于…","drafts_offline":"离线草稿","edit_conflict":"编辑冲突","group_mentioned_limit":{"other":"\u003cb\u003e警告\u003c/b\u003e！您提及了 \u003ca href='%{group_link}'\u003e %{group} \u003c/a\u003e，但是此群组的成员数量超过了管理员配置的 %{count} 个用户的最大可提及数量限制。没有人会收到通知。"},"group_mentioned":{"other":"提及 %{group} 时，您将通知 \u003ca href='%{group_link}'\u003e%{count} 人\u003c/a\u003e － 确定吗？"},"cannot_see_mention":{"category":"您提及了 %{username}，但由于他们无法访问此类别，他们将不会收到通知。您需要将其添加到可以访问此类别的群组中。","private":"您提及了 %{username}，但由于他们无法访问此个人消息，他们将不会收到通知。您需要邀请他们加入此个人消息。"},"duplicate_link":"好像 \u003cb\u003e@%{username}\u003c/b\u003e 在话题 \u003ca href='%{post_url}'\u003e%{ago}的回复\u003c/a\u003e中已经发布 \u003cb\u003e%{domain}\u003c/b\u003e 的链接 - 确定要再次发布吗？","reference_topic_title":"回复：%{title}","error":{"title_missing":"标题为必填项","title_too_short":{"other":"标题必须至少为 %{count} 个字符"},"title_too_long":{"other":"标题不能多于 %{count} 个字符"},"post_missing":"帖子不能为空","post_length":{"other":"帖子必须至少为 %{count} 个字符"},"try_like":"您尝试过 %{heart} 按钮了吗？","category_missing":"您必须选择一个类别","tags_missing":{"other":"您必须至少选择 %{count} 个标签"},"topic_template_not_modified":"请通过编辑话题模板为您的话题添加详细信息和细节。"},"save_edit":"保存编辑","overwrite_edit":"覆盖编辑","reply_original":"回复原始话题","reply_here":"在此回复","reply":"回复","cancel":"取消","create_topic":"创建话题","create_pm":"消息","create_whisper":"密语","create_shared_draft":"创建共享草稿","edit_shared_draft":"编辑共享草稿","title":"或按 Ctrl+Enter","users_placeholder":"添加用户","title_placeholder":"用一句话概括讨论内容…","title_or_link_placeholder":"输入标题，或在此处粘贴链接","edit_reason_placeholder":"编辑原因","topic_featured_link_placeholder":"输入标题中显示的链接。","remove_featured_link":"从话题中移除链接。","reply_placeholder":"在此处输入。使用 Markdown、BBCode 或 HTML 进行格式化。拖动或粘贴图片。","reply_placeholder_no_images":"在此处输入。使用 Markdown、BBCode 或 HTML 进行格式化。","reply_placeholder_choose_category":"先选择一个类别，然后在此处输入。","view_new_post":"查看您的新帖子。","saving":"正在保存","saved":"已保存！","saved_draft":"正在发布草稿。点按即可恢复。","uploading":"正在上传…","show_preview":"显示预览","hide_preview":"隐藏预览","quote_post_title":"引用整个帖子","bold_label":"B","bold_title":"粗体","bold_text":"粗体文本","italic_label":"I","italic_title":"强调","italic_text":"强调文本","link_title":"超链接","link_description":"在此处输入链接描述","link_dialog_title":"插入超链接","link_optional_text":"可选标题","link_url_placeholder":"粘贴 URL 或键入以搜索话题","blockquote_title":"块引用","blockquote_text":"块引用","code_title":"预先格式化的文本","code_text":"将预先格式化的文本缩进 4 个空格","paste_code_text":"在此处键入或粘贴代码","upload_title":"上传","upload_description":"在此处输入上传描述","olist_title":"编号列表","ulist_title":"项目符号列表","list_item":"列表条目","toggle_direction":"切换方向","help":"Markdown 编辑帮助","collapse":"最小化编辑器面板","open":"打开编辑器面板","abandon":"关闭编辑器并舍弃草稿","enter_fullscreen":"进入全屏编辑器","exit_fullscreen":"退出全屏编辑器","show_toolbar":"显示编辑器工具栏","hide_toolbar":"隐藏编辑器工具栏","modal_ok":"确定","modal_cancel":"取消","cant_send_pm":"抱歉，您无法向 %{username} 发送消息。","yourself_confirm":{"title":"您是否忘记添加收件人？","body":"目前，此消息只发给您自己！"},"slow_mode":{"error":"本话题处于慢速模式。您最近已经发帖；您可以在 %{timeLeft}后再次发帖。"},"admin_options_title":"此话题的可选管理人员设置","composer_actions":{"reply":"回复","draft":"草稿","edit":"编辑","reply_to_post":{"label":"回复 %{postUsername} 的帖子","desc":"回复特定帖子"},"reply_as_new_topic":{"label":"作为链接话题回复","desc":"创建链接到此话题的新话题","confirm":"您保存了一个新的话题草稿，如果您创建链接话题，它将被覆盖。"},"reply_as_new_group_message":{"label":"作为新群组消息回复","desc":"创建以相同收件人开头的新消息"},"reply_as_private_message":{"label":"新建消息","desc":"创建新的个人消息"},"reply_to_topic":{"label":"回复话题","desc":"回复话题，不是任何特定的帖子"},"toggle_whisper":{"label":"切换密语","desc":"密语仅对管理人员可见"},"create_topic":{"label":"新建话题"},"shared_draft":{"label":"共享草稿","desc":"起草一个仅对允许的用户可见的话题"},"toggle_topic_bump":{"label":"切换话题提升","desc":"回复但不更改最新回复日期"}},"reload":"重新加载","ignore":"忽略","details_title":"摘要","details_text":"此文本将被隐藏"},"notifications":{"tooltip":{"regular":{"other":"%{count} 个未读通知"},"message":{"other":"%{count} 条未读消息"},"high_priority":{"other":"%{count} 个未读的高优先级通知"}},"title":"提及 (@) 您的用户名、回复您的帖子和话题、消息等的通知","none":"目前无法加载通知。","empty":"找不到通知。","post_approved":"您的帖子已被批准","reviewable_items":"需要审核的条目","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}、%{username2}\u003c/span\u003e %{description}","liked_many":{"other":"\u003cspan class='multi-user'\u003e%{username}、%{username2} 和其他 %{count} 人\u003c/span\u003e %{description}"},"liked_consolidated_description":{"other":"点赞了您的 %{count} 个帖子"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e 已接受您的邀请","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e 移动了%{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"获得了 '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003e新话题\u003c/span\u003e %{description}","membership_request_accepted":"加入 '%{group_name}' 的成员资格请求已被接受","membership_request_consolidated":{"other":"%{count} 个未处理的加入 '%{group_name}' 的成员资格请求"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}、%{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - 已完成","group_message_summary":{"other":"您的 %{group_name} 收件箱中有 %{count} 条消息"},"popup":{"mentioned":"%{username} 在“%{topic}”中提及了您 - %{site_title}","group_mentioned":"%{username} 在“%{topic}”中提及了您 - %{site_title}","quoted":"%{username} 在“%{topic}”中引用了您的帖子 - %{site_title}","replied":"%{username} 在“%{topic}”中回复了您 - %{site_title}","posted":"%{username} 在“%{topic}”中发布了帖子 - %{site_title}","private_message":"%{username} 在“%{topic}”中向您发送了个人消息 - %{site_title}","linked":"%{username} 链接到您在“%{topic}”中的帖子 - %{site_title}","watching_first_post":"%{username} 创建了新话题“%{topic}”- %{site_title}","confirm_title":"已启用通知 - %{site_title}","confirm_body":"成功！已启用通知。","custom":"来自%{site_title}上 %{username} 的通知"},"titles":{"mentioned":"被提及","replied":"新回复","quoted":"被引用","edited":"被编辑","liked":"新赞","private_message":"新私信","invited_to_private_message":"被邀请加入私信","invitee_accepted":"邀请已被接受","posted":"新帖子","moved_post":"帖子已被移动","linked":"被链接","bookmark_reminder":"书签提醒","bookmark_reminder_with_name":"书签提醒 - %{name}","granted_badge":"已授予徽章","invited_to_topic":"被邀请加入话题","group_mentioned":"群组提及","group_message_summary":"新群组消息","watching_first_post":"新话题","topic_reminder":"话题提醒","liked_consolidated":"新赞","post_approved":"已批准帖子","membership_request_consolidated":"新成员资格请求","reaction":"新回应","votes_released":"投票额度已释放"}},"upload_selector":{"uploading":"正在上传","processing":"正在处理上传","select_file":"选择文件","default_image_alt_text":"图片"},"search":{"sort_by":"排序依据","relevance":"相关性","latest_post":"最新帖子","latest_topic":"最新话题","most_viewed":"浏览最多","most_liked":"赞最多","select_all":"全选","clear_all":"全部清除","too_short":"您的搜索词过短。","sort_or_bulk_actions":"分类或者从结果中批量选择","result_count":{"other":"\u003cspan\u003e%{count}%{plus} 条与 \u003c/span\u003e“\u003cspan class='term'\u003e%{term}\u003c/span\u003e”有关的结果"},"title":"搜索话题、帖子、用户或类别","full_page_title":"搜索","no_results":"找不到结果。","no_more_results":"没有找到更多结果。","post_format":"#%{post_number}，来自 %{username}","results_page":"'%{term}' 的搜索结果","more_results":"还有更多结果。请缩小您的搜索范围。","cant_find":"找不到您要找的内容？","start_new_topic":"或许创建一个新话题？","or_search_google":"或者尝试使用 Google 进行搜索：","search_google":"尝试使用 Google 进行搜索：","search_google_button":"Google","search_button":"搜索","search_term_label":"输入搜索关键字","categories":"类别","tags":"标签","type":{"users":"用户","categories_and_tags":"分类/标签"},"context":{"user":"搜索 @%{username} 的帖子","category":"搜索 #%{category} 类别","tag":"搜索 #%{tag} 标签","topic":"搜索此话题","private_messages":"搜索消息"},"advanced":{"title":"高级过滤器","posted_by":{"label":"发帖人","aria_label":"按作者过滤"},"in_category":{"label":"分类"},"in_group":{"label":"在该群组中"},"with_badge":{"label":"有该徽章"},"with_tags":{"label":"拥有该标签","aria_label":"按标签过滤"},"filters":{"label":"只返回话题/帖子…","title":"仅在标题中匹配","likes":"我赞过","posted":"我发过帖","created":"我创建","watching":"我正在关注","tracking":"我正在跟踪","private":"在我的消息中","bookmarks":"我已加入书签","first":"是第一个帖子","pinned":"被置顶","seen":"我读过","unseen":"我还没读过","wiki":"Wiki","images":"包含图片","all_tags":"上述所有标签"},"statuses":{"label":"话题","open":"开放","closed":"已关闭","public":"公开","archived":"已归档","noreplies":"没有回复","single_user":"包含一个用户"},"post":{"count":{"label":"帖子"},"min":{"placeholder":"最小值"},"max":{"placeholder":"最大值"},"time":{"label":"发布时间","aria_label":"按发布日期过滤","before":"早于","after":"晚于"}},"views":{"label":"浏览量"},"min_views":{"placeholder":"最小值"},"max_views":{"placeholder":"最大值"}}},"new_item":"新","go_back":"返回","not_logged_in_user":"包含当前活动和偏好设置摘要的用户页面","current_user":"转到您的用户页面","view_all":"查看所有%{tab}","topics":{"new_messages_marker":"上次访问","bulk":{"select_all":"全选","clear_all":"全部清除","unlist_topics":"取消公开话题","relist_topics":"重新公开话题","reset_read":"重置已读话题","delete":"删除话题","dismiss":"关闭","dismiss_read":"关闭所有未读话题","dismiss_read_with_selected":{"other":"关闭 %{count} 个未读"},"dismiss_button":"关闭…","dismiss_button_with_selected":{"other":"关闭（%{count} 个）…"},"dismiss_tooltip":"仅关闭新帖子或停止跟踪话题","also_dismiss_topics":"停止跟踪这些话题，以便它们不再显示为我的未读话题","dismiss_new":"关闭新话题","dismiss_new_with_selected":{"other":"关闭新话题（%{count} 个）…"},"toggle":"切换话题批量选择","actions":"批量操作","change_category":"设置分类","close_topics":"关闭话题","archive_topics":"归档话题","move_messages_to_inbox":"移至收件箱","notification_level":"通知...","change_notification_level":"更改通知级别","choose_new_category":"为话题选择新类别：","selected":{"other":"您已选择 \u003cb\u003e%{count}\u003c/b\u003e 个话题。"},"change_tags":"替换标签","append_tags":"附加标签","choose_new_tags":"为这些话题选择新标签：","choose_append_tags":"为这些话题选择要附加的新标签：","changed_tags":"这些话题的标签已更改。","remove_tags":"移除所有标签","confirm_remove_tags":{"other":"所有标签将从 \u003cb\u003e%{count}\u003c/b\u003e 个话题中移除。确定吗？"},"progress":{"other":"进度：\u003cstrong\u003e%{count}\u003c/strong\u003e 个话题"}},"none":{"unread":"您没有未读话题。","unseen":"您没有未读话题。","new":"您没有新话题。","read":"您还没有阅读任何话题。","posted":"您尚未在任何话题中发帖。","latest":"您全都看过了！","bookmarks":"您还没有将任何话题加入书签。","category":"没有%{category}话题。","top":"没有热门话题。","educate":{"new":"\u003cp\u003e您的新话题将显示在这里。默认情况下，如果是在过去 2 天内创建的，话题会被视为新话题，还会显示 \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e 指示器。\u003c/p\u003e\u003cp\u003e访问您的\u003ca href=\"%{userPrefsUrl}\"\u003e偏好设置\u003c/a\u003e可以更改此设置。\u003c/p\u003e","unread":"\u003cp\u003e您的未读话题显示在这里。\u003c/p\u003e\u003cp\u003e默认情况下，如果符合以下条件，话题会被视为未读并且还将显示未读计数 \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e：\u003c/p\u003e\u003cul\u003e\u003cli\u003e您创建了该话题\u003c/li\u003e\u003cli\u003e您回复了该话题\u003c/li\u003e\u003cli\u003e您阅读该话题超过 4 分钟\u003c/li\u003e\u003c/ul\u003e\u003cp\u003e或者如果您在每个话题中通过 🔔 将话题显式设为“已跟踪”或“已关注”。\u003c/p\u003e\u003cp\u003e访问您的\u003ca href=\"%{userPrefsUrl}\"\u003e偏好设置\u003c/a\u003e可以更改此设置。\u003c/p\u003e"}},"bottom":{"latest":"没有更多最新话题了。","posted":"没有更多已发布话题了。","read":"没有更多已读话题了。","new":"没有更多新话题了。","unread":"没有更多未读话题了。","unseen":"没有更多未读主题了。","category":"没有更多%{category}话题了。","tag":"没有更多%{tag}话题了。","top":"没有更多热门话题了。","bookmarks":"没有更多已加入书签的话题了。"}},"topic":{"filter_to":{"other":"话题中的 %{count} 个帖子"},"create":"新建话题","create_long":"创建新话题","open_draft":"打开草稿","private_message":"开始消息","archive_message":{"help":"将消息移至您的归档","title":"归档"},"move_to_inbox":{"title":"移至收件箱","help":"将消息移回收件箱"},"edit_message":{"help":"编辑消息的第一个帖子","title":"编辑"},"defer":{"help":"标记为未读","title":"推迟"},"list":"话题","new":"新话题","unread":"未读","new_topics":{"other":"%{count} 个新话题"},"unread_topics":{"other":"%{count} 个未读话题"},"title":"话题","invalid_access":{"title":"不公开话题","description":"抱歉，您无权访问该话题！","login_required":"您需要登录才能查看该话题。"},"server_error":{"title":"话题加载失败","description":"抱歉，我们无法加载该话题，可能是由于连接问题。请重试。如果问题仍然存在，请告诉我们。"},"not_found":{"title":"找不到话题","description":"抱歉，我们找不到该话题。也许它被版主移除了？"},"unread_posts":{"other":"您在此话题中有 %{count} 个未读帖子"},"likes":{"other":"此话题有 %{count} 个赞"},"back_to_list":"返回话题列表","options":"话题选项","show_links":"显示此话题中的链接","collapse_details":"收起话题详细信息","expand_details":"展开话题详细信息","read_more_in_category":"想阅读更多？浏览%{catLink}或%{latestLink}中的其他话题。","read_more":"想阅读更多？%{catLink}或%{latestLink}。","unread_indicator":"还没有成员读过此话题的最新帖子。","browse_all_categories":"浏览所有类别","browse_all_tags":"浏览所有标签","view_latest_topics":"查看最新话题","suggest_create_topic":"准备好\u003ca href\u003e开始新对话\u003c/a\u003e了吗？","jump_reply_up":"跳转到较早的回复","jump_reply_down":"跳转到较晚的回复","deleted":"该话题已被删除","slow_mode_update":{"title":"慢速模式","select":"用户在此话题中的发帖间隔：","description":"为了在快节奏或有争议的讨论中促进深思熟虑的讨论，用户必须等待一段时间才能在此话题中再次发帖。","enable":"启用","update":"更新","enabled_until":"启用至：","remove":"禁用","hours":"小时：","minutes":"分钟：","seconds":"秒：","durations":{"10_minutes":"10 分钟","15_minutes":"15 分钟","30_minutes":"30 分钟","45_minutes":"45 分钟","1_hour":"1 小时","2_hours":"2 小时","4_hours":"4 小时","8_hours":"8 小时","12_hours":"12 小时","24_hours":"24 小时","custom":"自定义持续时间"}},"slow_mode_notice":{"duration":"在此话题下，请在两次发帖之间等待%{duration}"},"topic_status_update":{"title":"话题计时器","save":"设置计时器","num_of_hours":"小时数：","num_of_days":"天数：","remove":"移除计时器","publish_to":"发布至：","when":"时间：","time_frame_required":"请选择时间范围","min_duration":"持续时间必须大于 0","max_duration":"持续时间必须小于 20 年"},"auto_update_input":{"none":"选择时间范围","now":"现在","later_today":"今天晚些时候","tomorrow":"明天","later_this_week":"本周晚些时候","this_weekend":"本周末","next_week":"下周","two_weeks":"两周","next_month":"下个月","two_months":"两个月","three_months":"三个月","four_months":"四个月","six_months":"六个月","one_year":"一年","forever":"永远","pick_date_and_time":"选择日期和时间","set_based_on_last_post":"根据最后一个帖子关闭"},"publish_to_category":{"title":"排定发布时间表"},"temp_open":{"title":"临时开启"},"auto_reopen":{"title":"自动打开话题"},"temp_close":{"title":"临时关闭"},"auto_close":{"title":"自动关闭话题","label":"自动关闭话题前等待：","error":"请输入一个有效值。","based_on_last_post":"在话题中最后一个帖子的存在时间至少达到此时长之前不关闭。"},"auto_close_after_last_post":{"title":"在最后一个帖子后自动关闭话题"},"auto_delete":{"title":"自动删除话题"},"auto_bump":{"title":"自动提升话题"},"reminder":{"title":"提醒我"},"auto_delete_replies":{"title":"自动删除回复"},"status_update_notice":{"auto_open":"此话题将在 %{timeLeft}后自动开启。","auto_close":"此话题将在 %{timeLeft}后自动关闭。","auto_publish_to_category":"此话题将在 %{timeLeft}后发布到\u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e。","auto_close_after_last_post":"此话题将在最后一个回复的%{duration}后关闭。","auto_delete":"此话题将在 %{timeLeft}后自动删除。","auto_bump":"此话题将在 %{timeLeft}后自动提升。","auto_reminder":"您将在 %{timeLeft}后收到此话题的提醒。","auto_delete_replies":"此话题的回复会在%{duration}后自动删除。"},"auto_close_title":"自动关闭设置","auto_close_immediate":{"other":"该话题中的最后一个帖子已经存在 %{count} 小时，因此该话题将被立即关闭。"},"auto_close_momentarily":{"other":"该话题中的最后一个帖子已经存在 %{count} 小时，因此该话题将被暂时关闭。"},"timeline":{"back":"返回","back_description":"返回上一个未读帖子","replies_short":"%{current} / %{total}"},"progress":{"title":"话题进度","go_top":"顶部","go_bottom":"底部","go":"前往","jump_bottom":"跳转到最后一个帖子","jump_prompt":"跳转到…","jump_prompt_of":{"other":"/%{count} 个帖子"},"jump_prompt_long":"跳转到…","jump_bottom_with_number":"跳转到帖子 %{post_number}","jump_prompt_to_date":"截至日期","jump_prompt_or":"或者","total":"帖子总数","current":"当前帖子"},"notifications":{"title":"更改您接收有关此话题的通知的频率","reasons":{"mailing_list_mode":"您已启用邮寄名单模式，因此您将通过电子邮件收到对此话题回复的通知。","3_10":"由于您正在关注此话题的一个标签，您将收到通知。","3_10_stale":"由于您过去关注过此话题的一个标签，您将收到通知。","3_6":"由于您正在关注此类别，您将收到通知。","3_6_stale":"由于您过去关注过此类别，您将收到通知。","3_5":"由于您已开始自动关注此话题，您将收到通知。","3_2":"由于您正在关注此话题，您将收到通知。","3_1":"由于您创建了此话题，您将收到通知。","3":"由于您正在关注此话题，您将收到通知。","2_8":"由于您正在跟踪此类别，您将看到新回复的数量。","2_8_stale":"由于您过去跟踪过此类别，您将看到新回复的数量。","2_4":"由于您发表过对此话题的回复，您将看到新回复的数量。","2_2":"由于您正在跟踪此话题，您将看到新回复的数量。","2":"由于您\u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003e阅读过此话题\u003c/a\u003e，您将看到新回复的数量。","1_2":"您会在别人 @ 您或回复您时收到通知。","1":"您会在别人 @ 您或回复您时收到通知。","0_7":"您将忽略此类别中的所有通知。","0_2":"您将忽略有关此话题的所有通知。","0":"您将忽略有关此话题的所有通知。"},"watching_pm":{"title":"关注","description":"您将在此消息有新回复时收到通知，并且会显示新回复数量。"},"watching":{"title":"关注","description":"您将在此话题有新回复时收到通知，并且会显示新回复数量。"},"tracking_pm":{"title":"跟踪","description":"将显示此消息的新回复数量。您会在别人 @ 您或回复您时收到通知。"},"tracking":{"title":"跟踪","description":"将显示此话题的新回复数量。您会在别人 @ 您或回复您时收到通知。"},"regular":{"title":"常规","description":"您会在别人 @ 您或回复您时收到通知。"},"regular_pm":{"title":"常规","description":"您会在别人 @ 您或回复您时收到通知。"},"muted_pm":{"title":"已设为免打扰","description":"您永远不会收到有关此消息的任何通知。"},"muted":{"title":"已设为免打扰","description":"您永远不会收到有关此话题的任何通知，它也不会出现在最新话题中。"}},"actions":{"title":"操作","recover":"取消删除话题","delete":"删除话题","open":"打开话题","close":"关闭话题","multi_select":"选择帖子…","slow_mode":"设置慢速模式...","timed_update":"设置话题计时器…","pin":"置顶话题…","unpin":"取消置顶话题…","unarchive":"取消归档话题","archive":"归档话题","invisible":"设为取消公开","visible":"设为公开","reset_read":"重置阅读数据","make_public":"设为公开话题...","make_private":"设为个人消息","reset_bump_date":"重置提升日期"},"feature":{"pin":"置顶话题","unpin":"取消置顶话题","pin_globally":"全站置顶话题","make_banner":"设为横幅话题","remove_banner":"移除横幅话题"},"reply":{"title":"回复","help":"开始撰写此话题的回复"},"share":{"title":"分享","extended_title":"分享链接","help":"分享此话题的链接","instructions":"分享此话题的链接：","copied":"话题链接已复制。","notify_users":{"title":"通知","instructions":"通知以下用户有关此话题的信息：","success":{"other":"已成功通知所有用户有关此话题的信息。"}},"invite_users":"邀请"},"print":{"title":"打印","help":"打开此话题易于打印的版本"},"flag_topic":{"title":"举报","help":"以私密方式举报此话题以引起注意，或发送一个关于它的不公开通知","success_message":"您已成功举报此话题。"},"make_public":{"title":"转换为公开话题","choose_category":"请为公开话题选择类别："},"feature_topic":{"title":"将此话题设为精选","pin":"将此话题置于%{categoryLink}类别顶部至","unpin":"将此话题从%{categoryLink}类别顶部移除。","unpin_until":"将此话题从%{categoryLink}类别顶部移除，或等到\u003cstrong\u003e%{until}\u003c/strong\u003e。","pin_note":"用户可以为自己单独取消置顶话题。","pin_validation":"置顶此话题需要一个日期。","not_pinned":"%{categoryLink}没有置顶话题。","already_pinned":{"other":"%{categoryLink}中的当前置顶话题数：\u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"将此话题置于所有话题列表顶部至","confirm_pin_globally":{"other":"您已经有 %{count} 个全站置顶的话题。置顶话题过多可能会困扰新用户和匿名用户。确定要全站置顶另一个话题吗？"},"unpin_globally":"将此话题从所有话题列表顶部移除。","unpin_globally_until":"将此话题从所有话题列表顶部移除，或等到\u003cstrong\u003e%{until}\u003c/strong\u003e。","global_pin_note":"用户可以为自己单独取消置顶话题。","not_pinned_globally":"没有全站置顶话题。","already_pinned_globally":{"other":"当前全站置顶的话题数：\u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"将此话题设为在所有页面顶部显示的横幅。","remove_banner":"移除在所有页面顶部显示的横幅。","banner_note":"用户可以通过关闭话题来关闭横幅。任何时候都只能将一个话题设为横幅。","no_banner_exists":"没有横幅话题。","banner_exists":"当前设置了\u003cstrong class='badge badge-notification unread'\u003e一个\u003c/strong\u003e横幅话题。"},"inviting":"正在邀请…","automatically_add_to_groups":"此邀请还包括以下群组的访问权限：","invite_private":{"title":"邀请加入消息","email_or_username":"受邀者的电子邮件或用户名","email_or_username_placeholder":"电子邮件地址或者用户名","action":"邀请","success":"我们已邀请该用户加入此消息。","success_group":"我们已邀请该群组加入此消息。","error":"抱歉，邀请该用户时出错。","not_allowed":"抱歉，无法邀请该用户。","group_name":"群组名称"},"controls":"话题控件","invite_reply":{"title":"邀请","username_placeholder":"用户名","action":"发送邀请","help":"通过电子邮件或通知邀请其他人加入此话题","to_forum":"我们将发送一封简短的电子邮件，让您的朋友可以通过点击链接立即加入。","discourse_connect_enabled":"输入您要邀请加入此话题的人员的用户名。","to_topic_blank":"输入您要邀请加入此话题的人员的用户名或者电子邮件地址。","to_topic_email":"您输入了一个电子邮件地址。我们将通过电子邮件发送邀请，让您的朋友可以直接回复此话题。","to_topic_username":"您输入了一个用户名。我们将向其发送通知，其中包含邀请他们加入此话题的链接。","to_username":"输入您想邀请的人的用户名。我们将向其发送通知，其中包含邀请他们加入此话题的链接。","email_placeholder":"name@example.com","success_email":"我们已向 \u003cb\u003e%{invitee}\u003c/b\u003e 发送邀请。在邀请被确认后，我们将通知您。查看您的用户页面上的邀请标签页以跟踪邀请进度。","success_username":"我们已邀请该用户加入此话题。","error":"抱歉，我们无法邀请此人。也许他们已经被邀请了？（邀请次数受限）","success_existing_email":"电子邮件为 \u003cb\u003e%{emailOrUsername}\u003c/b\u003e 的用户已存在。我们已邀请该用户加入此话题。"},"login_reply":"登录以回复","filters":{"n_posts":{"other":"%{count} 个帖子"},"cancel":"移除筛选器"},"move_to":{"title":"移至","action":"移至","error":"移动帖子时出错。"},"split_topic":{"title":"移至新话题","action":"移至新话题","topic_name":"新话题标题","radio_label":"新话题","error":"将帖子移至新话题时出错。","instructions":{"other":"您将创建一个新话题，并使用您选择的 \u003cb\u003e%{count}\u003c/b\u003e 个帖子填充。"}},"merge_topic":{"title":"移至现有话题","action":"移至现有话题","error":"将帖子移至该话题时出错。","radio_label":"现有话题","instructions":{"other":"请选择您要将这 \u003cb\u003e%{count}\u003c/b\u003e 个帖子移至的话题。"}},"move_to_new_message":{"title":"移至新消息","action":"移至新消息","message_title":"新消息标题","radio_label":"新消息","participants":"参与者","instructions":{"other":"您将创建一条新消息，并使用您选择的 \u003cb\u003e%{count}\u003c/b\u003e 个帖子填充。"}},"move_to_existing_message":{"title":"移至现有消息","action":"移至现有消息","radio_label":"现有消息","participants":"参与者","instructions":{"other":"请选择您要将这 \u003cb\u003e%{count}\u003c/b\u003e 个帖子移至的消息。"}},"merge_posts":{"title":"合并所选帖子","action":"合并所选帖子","error":"合并所选帖子时出错。"},"publish_page":{"title":"页面发布","publish":"发布","description":"当一个话题作为一个页面发布时，可以分享它的 URL，并且它将以自定义样式显示。","slug":"缩略名","public":"公开","public_description":"即使关联的话题是不公开话题，用户也可以看到该页面。","publish_url":"您的页面已发布到：","topic_published":"您的话题已发布到：","preview_url":"您的页面将发布到：","invalid_slug":"抱歉，您无法发布此页面。","unpublish":"取消发布","unpublished":"您的页面已取消发布，无法再访问。","publishing_settings":"发布设置"},"change_owner":{"title":"更改所有者","action":"更改所有权","error":"更改帖子的所有权时出错。","placeholder":"新所有者的用户名","instructions":{"other":"请为 \u003cb\u003e@%{old_user}\u003c/b\u003e 创建的 %{count} 个帖子选择新所有者。"},"instructions_without_old_user":{"other":"请为 %{count} 个帖子选择新所有者。"}},"change_timestamp":{"title":"更改时间戳…","action":"更改时间戳","invalid_timestamp":"时间戳不能为未来。","error":"更改话题的时间戳时出错。","instructions":"请选择话题的新时间戳。话题中的帖子将更新为具有相同时差。"},"multi_select":{"select":"选择","selected":"已选择 (%{count})","select_post":{"label":"选择","title":"将帖子加入选择"},"selected_post":{"label":"已选择","title":"点击以将帖子从选择中移除"},"select_replies":{"label":"选择 +回复","title":"将帖子及其所有回复添加到选择中"},"select_below":{"label":"选择 +之后","title":"将帖子和之后的所有内容添加到选择中"},"delete":"删除所选项","cancel":"取消选择","select_all":"全选","deselect_all":"取消全选","description":{"other":"您已选择 \u003cb\u003e%{count}\u003c/b\u003e 个帖子。"}},"deleted_by_author_simple":"（话题已被作者删除）"},"post":{"quote_reply":"引用","quote_edit":"编辑","quote_share":"分享","edit_reason":"原因：","post_number":"帖子 %{number}","ignored":"忽略的内容","wiki_last_edited_on":"Wiki 最后编辑于 %{dateTime}","last_edited_on":"帖子最后编辑于 %{dateTime}","reply_as_new_topic":"作为链接话题回复","reply_as_new_private_message":"作为新消息回复给相同的收件人","continue_discussion":"从%{postLink}继续讨论：","follow_quote":"转到引用的帖子","show_full":"显示完整帖子","show_hidden":"查看已忽略的内容。","deleted_by_author_simple":"（帖子已被作者删除）","collapse":"收起","expand_collapse":"展开/收起","locked":"一名管理人员已将此帖子锁定为无法编辑","gap":{"other":"查看 %{count} 个隐藏回复"},"notice":{"new_user":"这是 %{user} 首次发帖 - 让我们欢迎他/她加入社区吧！","returning_user":"我们已经有一段时间没有看到 %{user} 了 — 他/他上次发帖是 %{time}。"},"unread":"帖子未读","has_replies":{"other":"%{count} 个回复"},"has_replies_count":"%{count}","unknown_user":"（未知或已删除的用户）","has_likes_title":{"other":"%{count} 人赞了此帖子"},"has_likes_title_only_you":"您赞了此帖子","has_likes_title_you":{"other":"您和其他 %{count} 人赞了此帖子"},"filtered_replies_hint":{"other":"查看此帖子及其 %{count} 个回复"},"filtered_replies_viewing":{"other":"正在查看对此用户的 %{count} 个回复："},"in_reply_to":"加载父帖子","view_all_posts":"查看所有帖子","errors":{"create":"抱歉，创建您的帖子时出错。请重试。","edit":"抱歉，编辑您的帖子时出错。请重试。","upload":"抱歉，上传该文件时出错。请重试。","file_too_large":"抱歉，该文件太大（最大大小为 %{max_size_kb}KB）。为什么不将您的大文件上传到云共享服务，然后粘贴链接呢？","too_many_uploads":"抱歉，一次只能上传一个文件。","too_many_dragged_and_dropped_files":{"other":"抱歉，一次只能上传 %{count} 个文件。"},"upload_not_authorized":"抱歉，您尝试上传的文件不被允许（允许的扩展名：%{authorized_extensions}）。","image_upload_not_allowed_for_new_user":"抱歉，新用户无法上传图片。","attachment_upload_not_allowed_for_new_user":"抱歉，新用户无法上传附件。","attachment_download_requires_login":"抱歉，您需要登录才能下载附件。"},"cancel_composer":{"confirm":"您想对您的帖子做什么？","discard":"舍弃","save_draft":"保存草稿供以后使用","keep_editing":"继续编辑"},"via_email":"此帖子通过电子邮件送达","via_auto_generated_email":"此帖子通过自动生成的电子邮件送达","whisper":"此帖子是对版主的密语","wiki":{"about":"此帖子是一个 Wiki"},"few_likes_left":"谢谢您分享爱！您今天只剩下几个赞了。","controls":{"reply":"开始撰写对此帖子的回复","like":"点赞此帖子","has_liked":"您已点赞此帖子","read_indicator":"读过此帖子的成员","undo_like":"取消赞","edit":"编辑此帖子","edit_action":"编辑","edit_anonymous":"抱歉，您需要登录才能编辑此帖子。","flag":"以私密方式举报此帖子以引起注意，或发送一个关于它的不公开通知","delete":"删除此帖子","undelete":"取消删除此帖子","share":"分享此帖子的链接","more":"更多","delete_replies":{"confirm":"您是否还想删除对此帖子的回复？","direct_replies":{"other":"是，%{count} 个直接回复"},"all_replies":{"other":"是，%{count} 个回复"},"just_the_post":"否，仅删除此帖子"},"admin":"帖子管理员操作","wiki":"设为 Wiki","unwiki":"移除 Wiki","convert_to_moderator":"添加管理人员颜色","revert_to_regular":"移除管理人员颜色","rebake":"重新构建 HTML","publish_page":"页面发布","unhide":"取消隐藏","change_owner":"更改所有者...","grant_badge":"授予徽章...","lock_post":"锁定帖子","lock_post_description":"阻止发帖人编辑此帖子","unlock_post":"解锁帖子","unlock_post_description":"允许发帖人编辑此帖子","delete_topic_disallowed_modal":"您无权删除此话题。如果您确实希望将其删除，请提交举报并说明原因，以便引起版主注意。","delete_topic_disallowed":"您无权删除此话题","delete_topic_confirm_modal":{"other":"此话题目前有超过 %{count} 次浏览，可能是热门搜索目标。确定要完全删除此话题，而不是对其进行编辑以改进它吗？"},"delete_topic_confirm_modal_yes":"是，删除此话题","delete_topic_confirm_modal_no":"否，保留此话题","delete_topic_error":"删除此话题时出错","delete_topic":"删除话题","add_post_notice":"添加管理人员通知...","change_post_notice":"更改管理人员通知...","delete_post_notice":"删除管理人员通知","remove_timer":"移除计时器","edit_timer":"编辑计时器"},"actions":{"people":{"like":{"other":"赞了此帖子"},"read":{"other":"阅读了此帖子"},"like_capped":{"other":"还有其他 %{count} 人赞了此帖子"},"read_capped":{"other":"还有其他 %{count} 人阅读了此帖子"}},"by_you":{"off_topic":"您将此帖子举报为偏离话题","spam":"您将此帖子举报为垃圾信息","inappropriate":"您将此帖子举报为不当言论","notify_moderators":"您将此帖子举报为需要由版主审核","notify_user":"您向此用户发送了一条消息"}},"delete":{"confirm":{"other":"确定要删除这 %{count} 个帖子吗？"}},"merge":{"confirm":{"other":"确定要合并这 %{count} 个帖子吗？"}},"revisions":{"controls":{"first":"第一个修订","previous":"上一个修订","next":"下一个修订","last":"上次修订","hide":"隐藏修订","show":"显示修订","revert":"还原到修订 %{revision}","edit_wiki":"编辑 Wiki","edit_post":"编辑帖子","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"内联显示带有添加和删除的呈现输出","button":"HTML"},"side_by_side":{"title":"并排显示呈现的输出差异","button":"HTML"},"side_by_side_markdown":{"title":"并排显示原始源代码差异","button":"原始"}}},"raw_email":{"displays":{"raw":{"title":"显示原始电子邮件","button":"原始"},"text_part":{"title":"显示电子邮件的文本部分","button":"文本"},"html_part":{"title":"显示电子邮件的 HTML 部分","button":"HTML"}}},"bookmarks":{"create":"创建书签","create_for_topic":"为主题创建一个书签","edit":"编辑书签","edit_for_topic":"为主题创建的书签进行编辑","created":"已创建","updated":"更新","name":"名称","name_placeholder":"此书签有什么用？","set_reminder":"提醒我","options":"选项","actions":{"delete_bookmark":{"name":"删除书签","description":"将该书签从您的个人资料中移除并停止该书签的所有提醒"},"edit_bookmark":{"name":"编辑书签","description":"编辑书签名称或更改提醒的日期和时间"},"pin_bookmark":{"name":"置顶书签","description":"置顶该书签。这会将使其显示在您的书签列表的顶部。"},"unpin_bookmark":{"name":"取消置顶书签","description":"取消置顶该书签。它将不再显示在您的书签列表的顶部。"}}},"filtered_replies":{"viewing_posts_by":"正在查看此用户的 %{post_count} 个帖子：","viewing_subset":"某些回复已被收起","viewing_summary":"正在查看此话题的摘要","post_number":"%{username}，帖子 #%{post_number}","show_all":"全部显示"}},"category":{"none":"（无类别）","all":"所有类别","choose":"类别\u0026hellip;","edit":"编辑","edit_dialog_title":"编辑: %{categoryName}","view":"查看类别中的话题","back":"返回类别","general":"常规","settings":"设置","topic_template":"话题模板","tags":"标签","tags_allowed_tags":"将这些标签限制在此类别：","tags_allowed_tag_groups":"将这些标签组限制在此类别：","tags_placeholder":"（可选）允许的标签列表","tags_tab_description":"上面指定的标签和标签组将仅在此类别和也指定它们的其他类别中可用。它们将无法用于其他类别。","tag_groups_placeholder":"（可选）允许的标签组列表","manage_tag_groups_link":"管理标签组","allow_global_tags_label":"也允许其他标签","tag_group_selector_placeholder":"（可选）标签组","required_tag_group_description":"要求新话题包含标签组中的标签：","min_tags_from_required_group_label":"标签数量：","required_tag_group_label":"标签组：","topic_featured_link_allowed":"在此类别中允许精选链接","delete":"删除类别","create":"新建类别","create_long":"创建新类别","save":"保存类别","slug":"类别缩略名","slug_placeholder":"（可选）用于 URL 以“-”分隔的字词","creation_error":"创建类别时出错。","save_error":"保存类别时出错。","name":"类别名称","description":"描述","logo":"类别徽标图片","background_image":"类别背景图片","badge_colors":"徽章颜色","background_color":"背景色","foreground_color":"前景色","name_placeholder":"应该简明扼要","color_placeholder":"任意网页颜色","delete_confirm":"确定要删除此类别吗？","delete_error":"删除类别时出错。","list":"列出类别","no_description":"请为此类别添加描述。","change_in_category_topic":"编辑描述","already_used":"此颜色已被其他类别使用","security":"安全性","security_add_group":"添加群组","permissions":{"group":"群组","see":"查看","reply":"回复","create":"创建","no_groups_selected":"没有群组被授予访问权限；此类别仅对管理人员可见。","everyone_has_access":"此类别是公开的，任何人都可以查看、回复和创建帖子。要限制权限，请移除授予“所有人”组的一个或多个权限。","toggle_reply":"切换回复权限","toggle_full":"切换创建权限","inherited":"此权限继承自“所有人”"},"special_warning":"警告：此类别是一个预设类别，无法编辑安全性设置。如果您不想使用此类别，请将其删除，而不是重新调整用途。","uncategorized_security_warning":"此类别比较特殊。它旨在作为没有类别的话题的存放区域；不能有安全性设置。","uncategorized_general_warning":"此类别比较特殊。它用作未选择类别的新话题的默认类别。如果您想要避免此行为并强制选择类别，\u003ca href=\"%{settingLink}\"\u003e请在此处禁用该设置\u003c/a\u003e。如果您想要更改其名称或描述，请转到\u003ca href=\"%{customizeLink}\"\u003e自定义/文本内容\u003c/a\u003e。","pending_permission_change_alert":"您还没有将 %{group} 添加到此类别；点击此按钮添加它们。","images":"图片","email_in":"自定义传入电子邮件地址：","email_in_allow_strangers":"接受来自没有帐户的匿名用户的电子邮件","email_in_disabled":"通过电子邮件发布新话题的功能在站点设置中禁用。要启用通过电子邮件发布新话题，","email_in_disabled_click":"请启用“email in”设置。","mailinglist_mirror":"类别镜像一个邮寄名单","show_subcategory_list":"在此类别中的话题上方显示子类别列表。","read_only_banner":"用户无法在此类别中创建话题时的横幅文本：","num_featured_topics":"类别页面上显示的话题数：","subcategory_num_featured_topics":"父类别页面上的精选话题数量：","all_topics_wiki":"默认将新话题设为 Wiki","allow_unlimited_owner_edits_on_first_post":"允许所有者不受限制地编辑第一个帖子","subcategory_list_style":"子类别列表样式：","sort_order":"话题列表排序依据：","default_view":"默认话题列表：","default_top_period":"默认热门时长：","default_list_filter":"默认列表筛选器：","allow_badges_label":"允许在此类别中授予徽章","edit_permissions":"编辑权限","reviewable_by_group":"除管理人员外，此类别中的内容还可以由以下群组审核：","review_group_name":"群组名称","require_topic_approval":"所有新话题都需要版主审批","require_reply_approval":"所有新回复都需要版主审批","this_year":"今年","position":"类别页面上的位置：","default_position":"默认位置","position_disabled":"类别将按照活动顺序显示。要控制类别在列表中的顺序，","position_disabled_click":"请启用“fixed category positions”设置。","minimum_required_tags":"话题中所需的最少标签数：","default_slow_mode":"为该分类中的新主题启用“慢速模式”。","parent":"父类别","num_auto_bump_daily":"每天自动顶贴的开放话题的数量：","navigate_to_first_post_after_read":"阅读话题后导航到第一个帖子","notifications":{"watching":{"title":"关注","description":"您将自动关注此类别中的所有话题。您会收到每个话题中每个新帖子的通知，并且会显示新回复数量。"},"watching_first_post":{"title":"关注第一个帖子","description":"您将收到此类别中新话题的通知，但不会收到话题回复。"},"tracking":{"title":"跟踪","description":"您将自动跟踪此类别中的所有话题。您会在别人 @ 您或回复您时收到通知，并且会显示新回复数量。"},"regular":{"title":"常规","description":"您会在别人 @ 您或回复您时收到通知。"},"muted":{"title":"已设为免打扰","description":"您不会收到有关此类别中新话题的任何通知，它们也不会出现在最新话题页面上。"}},"search_priority":{"label":"搜索优先级","options":{"normal":"常规","ignore":"忽略","very_low":"非常低","low":"低","high":"高","very_high":"非常高"}},"sort_options":{"default":"默认","likes":"赞","op_likes":"原始帖子的赞","views":"浏览量","posts":"帖子","activity":"活动","posters":"发帖人","category":"类别","created":"创建日期"},"sort_ascending":"升序","sort_descending":"降序","subcategory_list_styles":{"rows":"行","rows_with_featured_topics":"有精选话题的行","boxes":"框","boxes_with_featured_topics":"带精选话题的框"},"settings_sections":{"general":"常规","moderation":"审核","appearance":"外观","email":"电子邮件"},"list_filters":{"all":"所有话题","none":"无子类别"},"colors_disabled":"您无法选择颜色，因为您的“category style”为“none”。"},"flagging":{"title":"感谢您帮助我们建设文明社区！","action":"举报帖子","take_action":"采取行动…","take_action_options":{"default":{"title":"采取行动","details":"立即达到举报阈值，而不是等待更多社区举报"},"suspend":{"title":"封禁用户","details":"立即达到举报阈值，并封禁用户"},"silence":{"title":"禁言用户","details":"立即达到举报阈值，并禁言用户"}},"notify_action":"消息","official_warning":"官方警告","delete_spammer":"删除垃圾信息发布者","flag_for_review":"加入审核队列","yes_delete_spammer":"是，删除垃圾信息发布者","ip_address_missing":"（不适用）","hidden_email_address":"（已隐藏）","submit_tooltip":"提交不公开举报","take_action_tooltip":"立即达到举报阈值，而不是等待更多社区举报","cant":"抱歉，您目前无法举报此帖子。","notify_staff":"私下通知管理人员","formatted_name":{"off_topic":"偏离话题","inappropriate":"不当言论","spam":"垃圾信息"},"custom_placeholder_notify_user":"具体，有建设性，并始终保持友善。","custom_placeholder_notify_moderators":"让我们具体了解您关心的问题，并尽可能提供相关的链接和示例。","custom_message":{"at_least":{"other":"至少输入 %{count} 个字符"},"more":{"other":"还差 %{count} 条…"},"left":{"other":"剩余 %{count} 条"}}},"flagging_topic":{"title":"感谢您帮助我们建设文明社区！","action":"举报话题","notify_action":"消息"},"topic_map":{"title":"话题摘要","participants_title":"频繁发帖人","links_title":"热门链接","links_shown":"显示更多链接…","clicks":{"other":"%{count} 次点击"}},"post_links":{"about":"展开此帖子的更多链接","title":{"other":"其他 %{count} 个"}},"topic_statuses":{"warning":{"help":"这是一个官方警告。"},"bookmarked":{"help":"您已将此话题加入书签"},"locked":{"help":"此话题已被关闭；不再接受新回复"},"archived":{"help":"此话题已被归档；已被冻结，无法更改"},"locked_and_archived":{"help":"此话题已被关闭并存档；不再接受新回复且无法更改"},"unpinned":{"title":"已取消置顶","help":"此话题已对您取消置顶；它将以常规顺序显示"},"pinned_globally":{"title":"已全站置顶","help":"此话题已被全站置顶；它将显示在最新话题列表及其所属类别的顶部"},"pinned":{"title":"已置顶","help":"此话题已对您置顶；它将显示在所属类别的顶部"},"unlisted":{"help":"此话题已被取消公开；它不会显示在话题列表中，只能通过直接链接访问"},"personal_message":{"title":"此话题是一条个人消息","help":"此话题是一条个人消息"}},"posts":"帖子","original_post":"原始帖子","views":"浏览量","views_lowercase":{"other":"浏览量"},"replies":"回复","views_long":{"other":"此话题已被浏览 %{number} 次"},"activity":"活动","likes":"赞","likes_lowercase":{"other":"赞"},"users":"用户","users_lowercase":{"other":"用户"},"category_title":"类别","history_capped_revisions":"历史记录，最近 100 次修订","history":"历史","changed_by":"作者 %{author}","raw_email":{"title":"传入电子邮件","not_available":"不可用！"},"categories_list":"类别列表","filters":{"with_topics":"%{filter}话题","with_category":"%{filter}%{category}话题","latest":{"title":"最新","title_with_count":{"other":"最新 (%{count})"},"help":"有新帖子的话题"},"read":{"title":"已读","help":"您已读过的话题，按您上次阅读它们的顺序排序"},"categories":{"title":"类别","title_in":"类别 - %{categoryName}","help":"按类别分组的所有话题"},"unread":{"title":"未读","title_with_count":{"other":"未读 (%{count})"},"help":"您当前正在关注或跟踪，具有未读帖子的话题","lower_title_with_count":{"other":"%{count} 未读"}},"unseen":{"title":"未读","lower_title":"未读","help":"您当前正在关注或跟踪，具有未读帖子的话题"},"new":{"lower_title_with_count":{"other":"%{count} 新"},"lower_title":"新","title":"新","title_with_count":{"other":"新 (%{count})"},"help":"最近几天创建的话题"},"posted":{"title":"我的帖子","help":"您发过帖子的话题"},"bookmarks":{"title":"书签","help":"您已添加书签的话题"},"category":{"title":"%{categoryName}","title_with_count":{"other":"%{categoryName} (%{count})"},"help":"%{categoryName}类别中的最新话题"},"top":{"title":"热门","help":"过去一年、一个月、一周或一天中最活跃的话题","all":{"title":"所有时间"},"yearly":{"title":"每年"},"quarterly":{"title":"每季度"},"monthly":{"title":"每月"},"weekly":{"title":"每周"},"daily":{"title":"每天"},"all_time":"所有时间","this_year":"年","this_quarter":"季度","this_month":"月","this_week":"周","today":"今天","other_periods":"查看热门："}},"browser_update":"很抱歉，\u003ca href=\"https://www.discourse.org/faq/#browser\"\u003e您的浏览器太旧了，无法在本站点上运行\u003c/a\u003e。请\u003ca href=\"https://browsehappy.com\"\u003e升级您的浏览器\u003c/a\u003e以浏览丰富的内容，登录和回复。","permission_types":{"full":"创建/回复/查看","create_post":"回复/查看","readonly":"查看"},"lightbox":{"download":"下载","previous":"上一个（左方向键）","next":"下一个（右方向键）","counter":"%curr%/%total%","close":"关闭 (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003e内容\u003c/a\u003e无法加载。","image_load_error":"\u003ca href=\"%url%\"\u003e图片\u003c/a\u003e无法加载。"},"cannot_render_video":"无法呈现此视频，因为您的浏览器不支持编解码器。","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":"，","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} 或 %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"键盘快捷键","jump_to":{"title":"跳转到","home":"%{shortcut} 首页","latest":"%{shortcut} 最新","new":"%{shortcut} 新","unread":"%{shortcut} 未读","categories":"%{shortcut} 类别","top":"%{shortcut} 热门","bookmarks":"%{shortcut} 书签","profile":"%{shortcut} 个人资料","messages":"%{shortcut} 消息","drafts":"%{shortcut} 草稿","next":"%{shortcut} 下一个话题","previous":"%{shortcut} 上一个话题"},"navigation":{"title":"导航","jump":"%{shortcut} 转到帖子 #","back":"%{shortcut} 返回","up_down":"%{shortcut} 移动选择 \u0026uarr; \u0026darr;","open":"%{shortcut} 打开所选话题","next_prev":"%{shortcut} 下一个/上一个部分","go_to_unread_post":"%{shortcut} 转到第一个未读帖子"},"application":{"title":"应用程序","create":"%{shortcut} 创建新话题","notifications":"%{shortcut} 打开通知","hamburger_menu":"%{shortcut} 打开汉堡菜单","user_profile_menu":"%{shortcut} 打开用户菜单","show_incoming_updated_topics":"%{shortcut} 显示更新的话题","search":"%{shortcut} 搜索","help":"%{shortcut} 打开键盘帮助","dismiss_new":"%{shortcut} 关闭新话题","dismiss_topics":"%{shortcut} 关闭话题","log_out":"%{shortcut} 退出"},"composing":{"title":"撰写","return":"%{shortcut} 返回编辑器","fullscreen":"%{shortcut} 全屏编辑器"},"bookmarks":{"title":"书签","enter":"%{shortcut} 保存并关闭","later_today":"%{shortcut} 今天晚些时候","later_this_week":"%{shortcut} 本周晚些时候","tomorrow":"%{shortcut} 明天","next_week":"%{shortcut} 下周","next_month":"%{shortcut} 下个月","next_business_week":"%{shortcut} 下周开始","next_business_day":"%{shortcut} 下一个工作日","custom":"%{shortcut} 自定义日期和时间","none":"%{shortcut} 无提醒","delete":"%{shortcut} 删除书签"},"actions":{"title":"操作","bookmark_topic":"%{shortcut} 切换书签话题","pin_unpin_topic":"%{shortcut} 置顶/取消置顶话题","share_topic":"%{shortcut} 分享话题","share_post":"%{shortcut} 分享帖子","reply_as_new_topic":"%{shortcut} 作为链接话题回复","reply_topic":"%{shortcut} 回复话题","reply_post":"%{shortcut} 回复帖子","quote_post":"%{shortcut} 引用帖子","like":"%{shortcut} 点赞帖子","flag":"%{shortcut} 举报帖子","bookmark":"%{shortcut} 将帖子加入书签","edit":"%{shortcut} 编辑帖子","delete":"%{shortcut} 删除帖子","mark_muted":"%{shortcut} 将话题设为免打扰","mark_regular":"%{shortcut} 常规（默认）话题","mark_tracking":"%{shortcut} 跟踪话题","mark_watching":"%{shortcut} 关注话题","print":"%{shortcut} 打印话题","defer":"%{shortcut} 延迟话题","topic_admin_actions":"%{shortcut} 打开话题管理员操作"},"search_menu":{"title":"搜索菜单","prev_next":"%{shortcut} 上下移动所选内容","insert_url":"%{shortcut} 将所选内容插入到打开的编辑器"}},"badges":{"earned_n_times":{"other":"已获得此徽章 %{count} 次"},"granted_on":"%{date}授予","others_count":"其他拥有此徽章的人 (%{count})","title":"徽章","allow_title":"您可以将此徽章用作头衔","multiple_grant":"您可以多次获得","badge_count":{"other":"%{count} 个徽章"},"more_badges":{"other":"其他 (+%{count})"},"granted":{"other":"已被授予 %{count} 个"},"select_badge_for_title":"选择一个徽章作为您的头衔使用","none":"（无）","successfully_granted":"已成功将“%{badge}”授予 %{username}","badge_grouping":{"getting_started":{"name":"入门"},"community":{"name":"社区"},"trust_level":{"name":"信任级别"},"other":{"name":"其他"},"posting":{"name":"发帖"}},"favorite_max_reached":"您无法将更多徽章加入书签。","favorite_max_not_reached":"将此徽章标记为收藏","favorite_count":"%{count}/%{max} 个徽章已被标记为收藏"},"tagging":{"all_tags":"所有标签","other_tags":"其他标签","selector_all_tags":"所有标签","selector_no_tags":"无标签","changed":"标签更改：","tags":"标签","choose_for_topic":"可选标签","info":"信息","default_info":"此标签不限于任何类别，也没有同义词。要添加限制，请将此标签置于\u003ca href=%{basePath}/tag_groups\u003e标签组\u003c/a\u003e中。","category_restricted":"此标签仅限于您无权访问的类别。","synonyms":"同义词","synonyms_description":"使用以下标签时，它们将被替换为 \u003cb\u003e%{base_tag_name}\u003c/b\u003e。","tag_groups_info":{"other":"此标签属于以下组：%{tag_groups}。"},"category_restrictions":{"other":"它只能用于以下类别："},"edit_synonyms":"管理同义词","add_synonyms_label":"添加同义词：","add_synonyms":"添加","add_synonyms_explanation":{"other":"当前使用这些标签的任何地方都将被改为使用 \u003cb\u003e%{tag_name}\u003c/b\u003e。确定要应用此更改吗？"},"add_synonyms_failed":"无法将以下标签添加为同义词：\u003cb\u003e%{tag_names}\u003c/b\u003e。确保它们没有同义词并且不是其他标签的同义词。","remove_synonym":"移除同义词","delete_synonym_confirm":"确定要删除同义词“%{tag_name}”吗？","delete_tag":"删除标签","delete_confirm":{"other":"确定要删除此标签并将其从分配到的 %{count} 个话题移除吗？"},"delete_confirm_no_topics":"确定要删除此标签吗？","delete_confirm_synonyms":{"other":"其 %{count} 个同义词也将被删除。"},"rename_tag":"重命名标签","rename_instructions":"为标签选择一个新名称：","sort_by":"排序依据：","sort_by_count":"计数","sort_by_name":"名称","manage_groups":"管理标签组","manage_groups_description":"定义组以组织标签","upload":"上传标签","upload_description":"上传 csv 文件以批量创建标签","upload_instructions":"每行一个，可以使用 ‘tag_name，tag_group’ 格式附带标签组。","upload_successful":"标签上传成功","delete_unused_confirmation":{"other":"%{count} 个标签将被删除：%{tags}"},"delete_unused_confirmation_more_tags":{"other":"“%{tags}”和其他 %{count} 个"},"delete_no_unused_tags":"没有未使用的标签。","tag_list_joiner":"，","delete_unused":"删除未使用的标签","delete_unused_description":"删除所有未与话题或个人消息关联的标签","cancel_delete_unused":"取消","filters":{"without_category":"%{filter}%{tag}话题","with_category":"%{category}中的%{filter}%{tag}话题","untagged_without_category":"无标签的%{filter}话题","untagged_with_category":"%{category}中无标签的%{filter}话题"},"notifications":{"watching":{"title":"关注","description":"您将自动关注带有此标签的所有话题。您会收到所有新帖子和话题的通知，话题旁还会显示未读和新帖子的数量。"},"watching_first_post":{"title":"关注第一个帖子","description":"您将收到此标签中新话题的通知，但不会收到话题回复。"},"tracking":{"title":"跟踪","description":"您将自动跟踪带有此标签的所有话题。未读和新帖子的数量将显示在话题旁边。"},"regular":{"title":"常规","description":"您会在别人 @ 您或回复您的帖子时收到通知。"},"muted":{"title":"已设为免打扰","description":"您不会收到有关带有此标签的新话题的任何通知，它们也不会出现在您的未读标签页上。"}},"groups":{"title":"标签组","about_heading":"选择一个标签组或创建一个新的标签组","about_heading_empty":"创建一个新的标签组以开始","about_description":"标签组可帮助您在一个地方管理多个标签的权限。","new":"新标签组","new_title":"创建新组","edit_title":"编辑标签组","tags_label":"此组中的标签","parent_tag_label":"上级标签","parent_tag_description":"只有存在上级标签时，才能使用来自此组的标签。","one_per_topic_label":"此组中每个话题限制一个标签","new_name":"新标签组","name_placeholder":"名称","save":"保存","delete":"删除","confirm_delete":"确定要删除此标签组吗？","everyone_can_use":"每个人都可以使用标签","usable_only_by_groups":"标签对所有人可见，但只有以下群组可以使用它们","visible_only_to_groups":"标签仅对以下群组可见","cannot_save":"无法保存标签组。确保至少存在一个标签，标签组名称不为空，并为标签权限选择一个组。","tags_placeholder":"搜索或创建标签","parent_tag_placeholder":"可选","select_groups_placeholder":"选择组…","disabled":"标签已被禁用。"},"topics":{"none":{"unread":"您没有未读话题。","unseen":"您没有未读话题。","new":"您没有新话题。","read":"您还没有阅读任何话题。","posted":"您尚未在任何话题中发帖。","latest":"没有最新话题。","bookmarks":"您还没有将任何话题加入书签。","top":"没有热门话题。"}}},"invite":{"custom_message":"通过撰写\u003ca href\u003e自定义消息\u003c/a\u003e，使您的邀请更个性化。","custom_message_placeholder":"输入您的自定义消息","approval_not_required":"一旦用户接受此邀请，他们将被自动批准。","custom_message_template_forum":"嘿，您应该加入此论坛！","custom_message_template_topic":"嘿，我想您可能会喜欢此话题！"},"forced_anonymous":"由于负载过大，这会暂时向所有人显示，因此退出登录的用户会看到它。","forced_anonymous_login_required":"该站点正处于极端负载状态，当前无法加载，请在几分钟后再试。","footer_nav":{"back":"返回","forward":"前进","share":"分享","dismiss":"关闭"},"safe_mode":{"enabled":"安全模式已启用，要退出安全模式，请关闭此浏览器窗口"},"image_removed":"（图片被移除）","do_not_disturb":{"title":"勿扰时长…","label":"勿扰","remaining":"剩余 %{remaining}","options":{"half_hour":"30 分钟","one_hour":"1 小时","two_hours":"2 小时","tomorrow":"直到明天","custom":"自定义"},"set_schedule":"设置通知时间表"},"trust_levels":{"names":{"newuser":"新用户","basic":"基本用户","member":"成员","regular":"活跃用户","leader":"领导者"},"detailed_name":"%{level}：%{name}"},"pick_files_button":{"unsupported_file_picked":"您选择了不受支持的文件。支持的文件类型 – %{types}。"},"user_activity":{"no_activity_title":"尚无活动","no_activity_body":"欢迎来到我们的社区！您是新来的，还没有参与讨论。作为第一步，请访问 \u003ca href='%{topUrl}'\u003e置顶内容\u003c/a\u003e 或 \u003ca href='%{categoriesUrl}'\u003e类别\u003c/a\u003e 并开始阅读！在您喜欢或想了解更多信息的帖子上选择 %{heartIcon} \u003ca href='%{preferencesUrl}'\u003e用户选项\u003c/a\u003e添加图片和个人简介，以帮助其他人了解您。","no_activity_others":"无活动。","no_replies_title":"您还没有回复任何话题","no_replies_others":"无回复。","no_drafts_title":"您还没有写过任何草稿","no_drafts_body":"还没准备好发布？每当您开始撰写主题、回复或个人消息时，我们都会自动保存新草稿并在此处列出。选择取消按钮放弃或保存您的草稿以供稍后继续。","no_likes_title":"您还没有赞任何话题","no_likes_body":"加入并开始贡献的一个好方法是阅读已有的对话，并在您喜欢的帖子上点击 %{heartIcon}","no_likes_others":"没有赞过的帖子。","no_topics_title":"您还没有开始任何话题","no_read_topics_title":"您还没有阅读任何话题。","no_read_topics_body":"开始阅读讨论后，您将在此处看到一个列表。要开始阅读，请在 \u003ca href='%{topUrl}'\u003e置顶\u003c/a\u003e 或 \u003ca href='%{categoriesUrl}'\u003e类别\u003c/a\u003e 或按关键字搜索 %{searchIcon}"},"no_group_messages_title":"未找到群组消息","admin":{"site_settings":{"categories":{"chat_integration":"聊天功能整合"}}},"chat_integration":{"menu_title":"聊天功能整合","settings":"设置","no_providers":"你需要在插件设置中启用某些提供商","channels_with_errors":"最近此提供商的一些频道发送消息失败。点击错误图标了解更多。","channel_exception":"最近发送消息到此频道时出现未知错误。","group_mention_template":"提及：@%{name}","group_message_template":"发送消息给：@%{name}","choose_group":"（选择一个群组）","all_categories":"(所有分类)","all_tags":"(所有标签)","create_rule":"创建规则","create_channel":"创建频道","delete_channel":"删除","test_channel":"测试","edit_channel":"编辑","channel_delete_confirm":"你确定要删除此频道吗？所有相关的规则会被一并删除。","test_modal":{"title":"发送一个测试信息","topic":"主题","send":"发送测试信息","close":"关闭","error":"发送消息时遇到未知错误。检查站点日志了解详情。","success":"消息发送成功"},"type":{"normal":"正常","group_message":"群组信息","group_mention":"群组提及"},"filter":{"mute":"禁言","follow":"第一帖","watch":"所有帖子和回复","thread":"全部有回复串的帖子"},"rule_table":{"filter":"过滤器","category":"分类","tags":"标签","edit_rule":"编辑","delete_rule":"删除"},"edit_channel_modal":{"title":"编辑频道","save":"保存频道","cancel":"取消","provider":"提供者","channel_validation":{"ok":"有效","fail":"格式无效"}},"edit_rule_modal":{"title":"编辑规则","save":"保存规则","cancel":"取消","provider":"提供者","type":"类型","channel":"频道","filter":"筛选","category":"分类","group":"群组","tags":"标签","instructions":{"type":"更改类型以将提醒切换到群组消息或提及","filter":"提醒等级。静音会覆盖其它匹配规则","category":"此规则仅会作用于指定分类中的主题。","group":"此规则会作用于引用此群组的帖子","tags":"如指定，此规则将仅作用于含有这些标签的主题"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"频道","help":"例如：#频道， @用户名。"}},"errors":{"action_prohibited":"机器人没有权限发布到该频道","channel_not_found":"指定的频道在slack上不存在"}},"telegram":{"title":"Telegram","param":{"name":{"title":"名称","help":"一个描述该频道的名称。它不用于连接到Telegram。"},"chat_id":{"title":"聊天ID","help":"一个由机器人提供的号码，或一个@channelname格式的广播频道"}},"errors":{"channel_not_found":"指定的频道在Telegram上不存在","forbidden":"机器人没有权限发布到此频道"}},"discord":{"title":"Discord","param":{"name":{"title":"名称","help":"一个描述该频道的名称。它不用于连接到Discord。"},"webhook_url":{"title":"Webhook URL","help":"你在Discord服务器设置中创建的webhook URL"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"频道","help":"例如：#频道， @用户名。"}},"errors":{"channel_not_found":"指定的频道在Mattermost上不存在"}},"matrix":{"title":"矩阵","param":{"name":{"title":"名称","help":"一个描述该频道的名称。它不用于连接到Matrix。"},"room_id":{"title":"房间号","help":"房间的“私有标识符”。它看起来应该像!abcdefg:matrix.org"}},"errors":{"unknown_token":"访问令牌无效","unknown_room":"房间ID无效"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"流串","help":"消息应发送到的Zulip流的名称。例如：“general”"},"subject":{"title":"主题","help":"应该提供机器人发送消息的主题"}},"errors":{"does_not_exist":"Zulip流不存在"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"频道","help":"例如：#频道， @用户名。"}},"errors":{"invalid_channel":"这个频道在 Rocket Chat 上不存在"}},"gitter":{"title":"Gitter","param":{"name":{"title":"名字","help":"一个Gitter房间名称如gitterHQ/services."},"webhook_url":{"title":"Webhook 地址","help":"在Gitter房间中创建新集成时提供的链接。"}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow令牌","help":"在创建流消息后所提供的流式凭证。"}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe实例名称","help":"在站点设置中所列出的Groupme实例名称。使用“all”以发送给所有实例"}},"errors":{"not_found":"你所要发布信息的路径不存在。检查站点设置中的Bot ID。","instance_names_issue":"实例名称错误或未提供"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"名称","help":"Teams 频道名称，例如 discourse"},"webhook_url":{"title":"Webhook 地址","help":"创建入站 Webhook 时提供的 URL 链接。"}},"errors":{"invalid_channel":"Microsoft Teams 上不存在此频道"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"名称","help":"Webex 空间名称，例如 discourse"},"webhook_url":{"title":"Webhook 地址","help":"创建入站 Webhook 时提供的 URL 链接。"}},"errors":{"invalid_channel":"Webex 上不存在此频道"}},"google":{"title":"Google Chat","param":{"name":{"title":"名称","help":"频道名称（仅在 Discourse 管理界面中显示）"},"webhook_url":{"title":"Webhook 地址","help":"创建新 Webhook 时提供的 URL 链接。"}}}}},"details":{"title":"隐藏详细信息"},"discourse_local_dates":{"relative_dates":{"today":"今天 %{time}","tomorrow":"明天 %{time}","yesterday":"昨天 %{time}","countdown":{"passed":"日期已过"}},"title":"插入日期/时间","create":{"form":{"insert":"插入","advanced_mode":"高级模式","simple_mode":"简单模式","format_description":"用于向用户显示日期的格式。使用 Z 显示偏移，使用 zz 显示时区名称。","timezones_title":"要显示的时区","timezones_description":"时区将用于在预览和回退中显示日期。","recurring_title":"重复","recurring_description":"定义事件的重复发生。您还可以手动编辑表单生成的重复选项并使用以下键之一：年、季度、月、周、日、小时、分钟、秒、毫秒。","recurring_none":"不重复","invalid_date":"日期无效，请确保日期和时间正确","date_title":"日期","time_title":"时间","format_title":"日期格式","timezone":"时区","until":"直到…","recurring":{"every_day":"每天","every_week":"每周","every_two_weeks":"每两周","every_month":"每月","every_two_months":"每两个月","every_three_months":"每三个月","every_six_months":"每六个月","every_year":"每年"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"为所有新用户启动新用户教程","welcome_message":"向所有新用户发送带有快速入门指南的欢迎消息。"}},"presence":{"replying":{"other":"正在回复"},"editing":{"other":"正在编辑"},"replying_to_topic":{"other":"正在回复"}},"poll":{"voters":{"other":"投票人"},"total_votes":{"other":"总票数"},"average_rating":"平均评分：\u003cstrong\u003e%{average}\u003c/strong\u003e。","public":{"title":"投票为\u003cstrong\u003e公开\u003c/strong\u003e。"},"results":{"groups":{"title":"您需要成为 %{groups} 的成员才能在此投票中投票。"},"vote":{"title":"结果将在\u003cstrong\u003e投票\u003c/strong\u003e上显示。"},"closed":{"title":"结果将在\u003cstrong\u003e关闭\u003c/strong\u003e后显示。"},"staff":{"title":"结果仅向\u003cstrong\u003e管理人员\u003c/strong\u003e成员显示。"}},"multiple":{"help":{"at_least_min_options":{"other":"至少选择 \u003cstrong\u003e%{count}\u003c/strong\u003e 个选项。"},"up_to_max_options":{"other":"最多选择 \u003cstrong\u003e%{count}\u003c/strong\u003e 个选项。"},"x_options":{"other":"选择 \u003cstrong\u003e%{count}\u003c/strong\u003e 个选项。"},"between_min_and_max_options":"选择 \u003cstrong\u003e%{min}\u003c/strong\u003e 到 \u003cstrong\u003e%{max}\u003c/strong\u003e 个选项。"}},"cast-votes":{"title":"投票","label":"立即投票！"},"show-results":{"title":"显示投票结果","label":"显示结果"},"hide-results":{"title":"回到您的投票","label":"显示投票"},"group-results":{"title":"按用户字段将投票分组","label":"显示细分"},"export-results":{"title":"导出投票结果","label":"导出"},"open":{"title":"打开投票","label":"打开","confirm":"确定要打开此投票吗？"},"close":{"title":"关闭投票","label":"关闭","confirm":"确定要关闭此投票吗？"},"automatic_close":{"closes_in":"在 \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e后关闭。","age":"已关闭 \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"投票结果","votes":"%{count} 票","breakdown":"细分","percentage":"百分比","count":"计数"},"error_while_toggling_status":"抱歉，切换此投票的状态时出错。","error_while_casting_votes":"抱歉，投票时出错。","error_while_fetching_voters":"抱歉，显示投票人时出错。","error_while_exporting_results":"抱歉，导出投票结果时出错。","ui_builder":{"title":"构建投票","insert":"插入投票","help":{"options_min_count":"至少输入 1 个选项。","options_max_count":"最多输入 %{count} 个选项。","invalid_min_value":"最小值必须至少为 1。","invalid_max_value":"最大值必须至少为 1，但小于或等于选项数。","invalid_values":"最小值必须小于最大值。","min_step_value":"最小步长值为 1"},"poll_type":{"label":"类型","regular":"单选","multiple":"多选","number":"分数"},"poll_result":{"label":"显示结果…","always":"始终可见","vote":"只在投票后","closed":"当投票被关闭后","staff":"仅管理人员"},"poll_groups":{"label":"将投票限制为这些群组"},"poll_chart_type":{"label":"结果图表","bar":"条形图","pie":"饼图"},"poll_config":{"max":"最大选择","min":"最小选择","step":"步骤"},"poll_public":{"label":"显示投票人"},"poll_title":{"label":"标题（可选）"},"poll_options":{"label":"选项（每行一个）","add":"添加选项"},"automatic_close":{"label":"自动关闭投票"},"show_advanced":"显示高级选项","hide_advanced":"隐藏高级选项"}},"styleguide":{"title":"样式指南","welcome":"首先，从左侧菜单中选择一个部分。","categories":{"atoms":"原子","molecules":"分子","organisms":"生物"},"sections":{"typography":{"title":"排版","example":"欢迎来到 Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"日期/时间输入"},"font_scale":{"title":"字体系统"},"colors":{"title":"颜色"},"icons":{"title":"图标","full_list":"查看 Font Awesome 图标的完整列表"},"input_fields":{"title":"输入字段"},"buttons":{"title":"按钮"},"dropdowns":{"title":"下拉菜单"},"categories":{"title":"类别"},"bread_crumbs":{"title":"路径"},"navigation":{"title":"导航"},"navigation_bar":{"title":"导航栏"},"navigation_stacked":{"title":"堆叠式导航"},"categories_list":{"title":"类别列表"},"topic_link":{"title":"话题链接"},"topic_list_item":{"title":"话题列表项"},"topic_statuses":{"title":"话题状态"},"topic_list":{"title":"话题列表"},"basic_topic_list":{"title":"基本话题列表"},"footer_message":{"title":"页脚消息"},"signup_cta":{"title":"注册号召性用语"},"topic_timer_info":{"title":"话题计时器"},"topic_footer_buttons":{"title":"话题页脚按钮"},"topic_notifications":{"title":"话题通知"},"post":{"title":"帖子"},"topic_map":{"title":"话题图"},"site_header":{"title":"站点标头"},"suggested_topics":{"title":"建议的话题"},"post_menu":{"title":"帖子菜单"},"modal":{"title":"模式窗口","header":"模式窗口标题","footer":"模式窗口页脚"},"user_about":{"title":"用户信息框"},"header_icons":{"title":"标头图标"},"spinners":{"title":"旋转的图标"}}}}},"en":{"js":{"number":{"human":{"storage_units":{"units":{"byte":{"one":"Byte"}}}}},"dates":{"tiny":{"less_than_x_seconds":{"one":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m"},"about_x_hours":{"one":"%{count}h"},"x_days":{"one":"%{count}d"},"x_months":{"one":"%{count}mon"},"about_x_years":{"one":"%{count}y"},"over_x_years":{"one":"\u003e %{count}y"},"almost_x_years":{"one":"%{count}y"}},"medium":{"x_minutes":{"one":"%{count} min"},"x_hours":{"one":"%{count} hour"},"x_days":{"one":"%{count} day"}},"medium_with_ago":{"x_minutes":{"one":"%{count} min ago"},"x_hours":{"one":"%{count} hour ago"},"x_days":{"one":"%{count} day ago"},"x_months":{"one":"%{count} month ago"},"x_years":{"one":"%{count} year ago"}},"later":{"x_days":{"one":"%{count} day later"},"x_months":{"one":"%{count} month later"},"x_years":{"one":"%{count} year later"}}},"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined."},"links_lowercase":{"one":"link"},"x_more":{"one":"%{count} More"},"character_count":{"one":"%{count} character"},"period_chooser":{"aria_label":"Filter by period"},"topic_count_categories":{"one":"See %{count} new or updated topic"},"topic_count_latest":{"one":"See %{count} new or updated topic"},"topic_count_unseen":{"one":"See %{count} new or updated topic"},"topic_count_unread":{"one":"See %{count} unread topic"},"topic_count_new":{"one":"See %{count} new topic"},"review":{"topic_has_pending":{"one":"This topic has \u003cb\u003e%{count}\u003c/b\u003e post pending approval"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)"},"agreed":{"one":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore"}},"topics":{"unique_users":{"one":"%{count} user"}},"replies":{"one":"%{count} reply"},"approval":{"pending_posts":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e post pending."}}},"relative_time_picker":{"minutes":{"one":"minute"},"hours":{"one":"hour"},"days":{"one":"day"},"months":{"one":"month"},"years":{"one":"year"}},"directory":{"total_rows":{"one":"%{count} user"}},"groups":{"title":{"one":"Group"}},"categories":{"topic_sentence":{"one":"%{count} topic"},"topic_stat":{"one":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month."}},"user":{"messages":{"unread_with_count":{"one":"Unread (%{count})"},"new_with_count":{"one":"New (%{count})"},"read_more":"Want to read more? Browse other messages in \u003ca href='%{basePath}/u/%{username}/message'\u003epersonal messages\u003c/a\u003e."},"second_factor_backup":{"manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."}},"email":{"frequency":{"one":"We'll only email you if we haven't seen you in the last minute."}},"invited":{"truncated":{"one":"Showing the first invite."}},"summary":{"topic_count":{"one":"topic created"},"post_count":{"one":"post created"},"likes_given":{"one":"given"},"likes_received":{"one":"received"},"days_visited":{"one":"day visited"},"topics_entered":{"one":"topic viewed"},"posts_read":{"one":"post read"},"bookmark_count":{"one":"bookmark"}}},"replies_lowercase":{"one":"reply"},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply."}},"category_row":{"topic_count":{"one":"%{count} topic in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory"},"plus_subcategories":{"one":"+ %{count} subcategory"}},"select_kit":{"results_count":{"one":"%{count} result"},"max_content_reached":{"one":"You can only select %{count} item."},"min_content_not_reached":{"one":"Select at least %{count} item."},"invalid_selection_length":{"one":"Selection must be at least %{count} character."}},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified."},"group_mentioned":{"one":"By mentioning %{group}, you are about to notify \u003ca href='%{group_link}'\u003e%{count} person\u003c/a\u003e – are you sure?"},"error":{"title_too_short":{"one":"Title must be at least %{count} character"},"title_too_long":{"one":"Title can't be more than %{count} character"},"post_length":{"one":"Post must be at least %{count} character"},"tags_missing":{"one":"You must choose at least %{count} tag"}}},"notifications":{"tooltip":{"regular":{"one":"%{count} unseen notification"},"message":{"one":"%{count} unread message"},"high_priority":{"one":"%{count} unread high priority notification"}},"liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"liked %{count} of your posts"},"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'"},"group_message_summary":{"one":"%{count} message in your %{group_name} inbox"}},"search":{"result_count":{"one":"\u003cspan\u003e%{count} result for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"type":{"default":"Topics/posts"},"advanced":{"post":{"min":{"aria_label":"filter by minimum number of posts"},"max":{"aria_label":"filter by maximum number of posts"}},"min_views":{"aria_label":"filter by minimum views"},"max_views":{"aria_label":"filter by maximum views"},"additional_options":{"label":"Filter by post count and topic views"}}},"hamburger_menu":"menu","topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})"},"selected":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e topic."},"confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic"}}},"topic":{"filter_to":{"one":"%{count} post in topic"},"new_topics":{"one":"%{count} new topic"},"unread_topics":{"one":"%{count} unread topic"},"unread_posts":{"one":"you have %{count} unread post in this topic"},"likes":{"one":"there is %{count} like in this topic"},"auto_close_immediate":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed immediately."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post"}},"share":{"notify_users":{"success":{"one":"Successfully notified %{username} about this topic."}}},"feature_topic":{"already_pinned":{"one":"Topics currently pinned in %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"},"already_pinned_globally":{"one":"Topics currently pinned globally: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"}},"filters":{"n_posts":{"one":"%{count} post"}},"split_topic":{"instructions":{"one":"You are about to create a new topic and populate it with the post you've selected."}},"merge_topic":{"instructions":{"one":"Please choose the topic you'd like to move that post to."}},"move_to_new_message":{"instructions":{"one":"You are about to create a new message and populate it with the post you've selected."}},"move_to_existing_message":{"instructions":{"one":"Please choose the message you'd like to move that post to."}},"change_owner":{"instructions":{"one":"Please choose a new owner for the post by \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Please choose a new owner for the post"}},"multi_select":{"description":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e post."}}},"post":{"gap":{"one":"view %{count} hidden reply"},"has_replies":{"one":"%{count} Reply"},"has_likes_title":{"one":"%{count} person liked this post"},"has_likes_title_you":{"one":"you and %{count} other person liked this post"},"filtered_replies_hint":{"one":"View this post and its reply"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to"},"errors":{"file_too_large_humanized":"Sorry, that file is too big (maximum size is %{max_size}). Why not upload your large file to a cloud sharing service, then paste the link?","too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time."}},"controls":{"delete_replies":{"direct_replies":{"one":"Yes, and %{count} direct reply"},"all_replies":{"one":"Yes, and %{count} reply"}},"delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"}},"actions":{"people":{"like":{"one":"liked this"},"read":{"one":"read this"},"like_capped":{"one":"and %{count} other liked this"},"read_capped":{"one":"and %{count} other read this"}}},"delete":{"confirm":{"one":"Are you sure you want to delete that post?"}},"merge":{"confirm":{"one":"Are you sure you want to merge those posts?"}}},"category":{"notifications":{"title":"change notification level for this category"}},"flagging":{"custom_message":{"at_least":{"one":"enter at least %{count} character"},"more":{"one":"%{count} to go..."},"left":{"one":"%{count} remaining"}}},"topic_map":{"clicks":{"one":"%{count} click"}},"post_links":{"title":{"one":"%{count} more"}},"views_lowercase":{"one":"view"},"views_long":{"one":"this topic has been viewed %{count} time"},"likes_lowercase":{"one":"like"},"users_lowercase":{"one":"user"},"filters":{"latest":{"title_with_count":{"one":"Latest (%{count})"}},"unread":{"title_with_count":{"one":"Unread (%{count})"},"lower_title_with_count":{"one":"%{count} unread"}},"new":{"lower_title_with_count":{"one":"%{count} new"},"title_with_count":{"one":"New (%{count})"}},"category":{"title_with_count":{"one":"%{categoryName} (%{count})"}}},"badges":{"earned_n_times":{"one":"Earned this badge %{count} time"},"badge_count":{"one":"%{count} Badge"},"more_badges":{"one":"+%{count} More"},"granted":{"one":"%{count} granted"}},"tagging":{"tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\"."},"category_restrictions":{"one":"It can only be used in this category:"},"add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"delete_confirm":{"one":"Are you sure you want to delete this tag and remove it from %{count} topic it is assigned to?"},"delete_confirm_synonyms":{"one":"Its synonym will also be deleted."},"delete_unused_confirmation":{"one":"%{count} tag will be deleted: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} and %{count} more"}},"presence":{"replying":{"one":"replying"},"editing":{"one":"editing"},"replying_to_topic":{"one":"replying"}},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"poll":{"voters":{"one":"voter"},"total_votes":{"one":"total vote"},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option."}}}}}}};
I18n.locale = 'zh_CN';
I18n.pluralizationRules.zh_CN = MessageFormat.locale.zh_CN;
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
//! locale : Chinese (China) [zh-cn]
//! author : suupic : https://github.com/suupic
//! author : Zeno Zeng : https://github.com/zenozeng
//! author : uu109 : https://github.com/uu109

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var zhCn = moment.defineLocale('zh-cn', {
        months: '一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月'.split(
            '_'
        ),
        monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split(
            '_'
        ),
        weekdays: '星期日_星期一_星期二_星期三_星期四_星期五_星期六'.split('_'),
        weekdaysShort: '周日_周一_周二_周三_周四_周五_周六'.split('_'),
        weekdaysMin: '日_一_二_三_四_五_六'.split('_'),
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'YYYY/MM/DD',
            LL: 'YYYY年M月D日',
            LLL: 'YYYY年M月D日Ah点mm分',
            LLLL: 'YYYY年M月D日ddddAh点mm分',
            l: 'YYYY/M/D',
            ll: 'YYYY年M月D日',
            lll: 'YYYY年M月D日 HH:mm',
            llll: 'YYYY年M月D日dddd HH:mm',
        },
        meridiemParse: /凌晨|早上|上午|中午|下午|晚上/,
        meridiemHour: function (hour, meridiem) {
            if (hour === 12) {
                hour = 0;
            }
            if (meridiem === '凌晨' || meridiem === '早上' || meridiem === '上午') {
                return hour;
            } else if (meridiem === '下午' || meridiem === '晚上') {
                return hour + 12;
            } else {
                // '中午'
                return hour >= 11 ? hour : hour + 12;
            }
        },
        meridiem: function (hour, minute, isLower) {
            var hm = hour * 100 + minute;
            if (hm < 600) {
                return '凌晨';
            } else if (hm < 900) {
                return '早上';
            } else if (hm < 1130) {
                return '上午';
            } else if (hm < 1230) {
                return '中午';
            } else if (hm < 1800) {
                return '下午';
            } else {
                return '晚上';
            }
        },
        calendar: {
            sameDay: '[今天]LT',
            nextDay: '[明天]LT',
            nextWeek: function (now) {
                if (now.week() !== this.week()) {
                    return '[下]dddLT';
                } else {
                    return '[本]dddLT';
                }
            },
            lastDay: '[昨天]LT',
            lastWeek: function (now) {
                if (this.week() !== now.week()) {
                    return '[上]dddLT';
                } else {
                    return '[本]dddLT';
                }
            },
            sameElse: 'L',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(日|月|周)/,
        ordinal: function (number, period) {
            switch (period) {
                case 'd':
                case 'D':
                case 'DDD':
                    return number + '日';
                case 'M':
                    return number + '月';
                case 'w':
                case 'W':
                    return number + '周';
                default:
                    return number;
            }
        },
        relativeTime: {
            future: '%s后',
            past: '%s前',
            s: '几秒',
            ss: '%d 秒',
            m: '1 分钟',
            mm: '%d 分钟',
            h: '1 小时',
            hh: '%d 小时',
            d: '1 天',
            dd: '%d 天',
            w: '1 周',
            ww: '%d 周',
            M: '1 个月',
            MM: '%d 个月',
            y: '1 年',
            yy: '%d 年',
        },
        week: {
            // GB/T 7408-1994《数据元和交换格式·信息交换·日期和时间表示法》与ISO 8601:1988等效
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return zhCn;

})));

// moment-timezone-localization for lang code: zh

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"阿比让","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"阿克拉","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"亚的斯亚贝巴","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"阿尔及尔","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"阿斯马拉","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"巴马科","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"班吉","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"班珠尔","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"比绍","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"布兰太尔","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"布拉柴维尔","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"布琼布拉","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"开罗","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"卡萨布兰卡","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"休达","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"科纳克里","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"达喀尔","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"达累斯萨拉姆","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"吉布提","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"杜阿拉","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"阿尤恩","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"弗里敦","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"哈博罗内","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"哈拉雷","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"约翰内斯堡","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"朱巴","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"坎帕拉","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"喀土穆","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"基加利","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"金沙萨","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"拉各斯","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"利伯维尔","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"洛美","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"罗安达","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"卢本巴希","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"卢萨卡","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"马拉博","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"马普托","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"马塞卢","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"姆巴巴纳","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"摩加迪沙","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"蒙罗维亚","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"内罗毕","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"恩贾梅纳","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"尼亚美","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"努瓦克肖特","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"瓦加杜古","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"波多诺伏","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"圣多美","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"的黎波里","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"突尼斯","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"温得和克","id":"Africa/Windhoek"},{"value":"America/Adak","name":"埃达克","id":"America/Adak"},{"value":"America/Anchorage","name":"安克雷奇","id":"America/Anchorage"},{"value":"America/Anguilla","name":"安圭拉","id":"America/Anguilla"},{"value":"America/Antigua","name":"安提瓜","id":"America/Antigua"},{"value":"America/Araguaina","name":"阿拉瓜伊纳","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"拉里奥哈","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"里奥加耶戈斯","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"萨尔塔","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"圣胡安","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"圣路易斯","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"图库曼","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"乌斯怀亚","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"阿鲁巴","id":"America/Aruba"},{"value":"America/Asuncion","name":"亚松森","id":"America/Asuncion"},{"value":"America/Bahia","name":"巴伊亚","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"巴伊亚班德拉斯","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"巴巴多斯","id":"America/Barbados"},{"value":"America/Belem","name":"贝伦","id":"America/Belem"},{"value":"America/Belize","name":"伯利兹","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"布兰克萨布隆","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"博阿维斯塔","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"波哥大","id":"America/Bogota"},{"value":"America/Boise","name":"博伊西","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"布宜诺斯艾利斯","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"剑桥湾","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"大坎普","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"坎昆","id":"America/Cancun"},{"value":"America/Caracas","name":"加拉加斯","id":"America/Caracas"},{"value":"America/Catamarca","name":"卡塔马卡","id":"America/Catamarca"},{"value":"America/Cayenne","name":"卡宴","id":"America/Cayenne"},{"value":"America/Cayman","name":"开曼","id":"America/Cayman"},{"value":"America/Chicago","name":"芝加哥","id":"America/Chicago"},{"value":"America/Chihuahua","name":"奇瓦瓦","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"阿蒂科肯","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"科尔多瓦","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"哥斯达黎加","id":"America/Costa_Rica"},{"value":"America/Creston","name":"克雷斯顿","id":"America/Creston"},{"value":"America/Cuiaba","name":"库亚巴","id":"America/Cuiaba"},{"value":"America/Curacao","name":"库拉索","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"丹马沙文","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"道森","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"道森克里克","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"丹佛","id":"America/Denver"},{"value":"America/Detroit","name":"底特律","id":"America/Detroit"},{"value":"America/Dominica","name":"多米尼加","id":"America/Dominica"},{"value":"America/Edmonton","name":"埃德蒙顿","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"依伦尼贝","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"萨尔瓦多","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"纳尔逊堡","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"福塔雷萨","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"格莱斯贝","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"努克","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"古斯湾","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"大特克","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"格林纳达","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"瓜德罗普","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"危地马拉","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"瓜亚基尔","id":"America/Guayaquil"},{"value":"America/Guyana","name":"圭亚那","id":"America/Guyana"},{"value":"America/Halifax","name":"哈利法克斯","id":"America/Halifax"},{"value":"America/Havana","name":"哈瓦那","id":"America/Havana"},{"value":"America/Hermosillo","name":"埃莫西约","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"印第安纳州诺克斯","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"印第安纳州马伦戈","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"印第安纳州彼得斯堡","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"印第安纳州特尔城","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"印第安纳州维维市","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"印第安纳州温森斯","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"印第安纳州威纳马克","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"印第安纳波利斯","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"伊努维克","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"伊魁特","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"牙买加","id":"America/Jamaica"},{"value":"America/Jujuy","name":"胡胡伊","id":"America/Jujuy"},{"value":"America/Juneau","name":"朱诺","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"肯塔基州蒙蒂塞洛","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"克拉伦代克","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"拉巴斯","id":"America/La_Paz"},{"value":"America/Lima","name":"利马","id":"America/Lima"},{"value":"America/Los_Angeles","name":"洛杉矶","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"路易斯维尔","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"下太子区","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"马塞约","id":"America/Maceio"},{"value":"America/Managua","name":"马那瓜","id":"America/Managua"},{"value":"America/Manaus","name":"马瑙斯","id":"America/Manaus"},{"value":"America/Marigot","name":"马里戈特","id":"America/Marigot"},{"value":"America/Martinique","name":"马提尼克","id":"America/Martinique"},{"value":"America/Matamoros","name":"马塔莫罗斯","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"马萨特兰","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"门多萨","id":"America/Mendoza"},{"value":"America/Menominee","name":"梅诺米尼","id":"America/Menominee"},{"value":"America/Merida","name":"梅里达","id":"America/Merida"},{"value":"America/Metlakatla","name":"梅特拉卡特拉","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"墨西哥城","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"密克隆","id":"America/Miquelon"},{"value":"America/Moncton","name":"蒙克顿","id":"America/Moncton"},{"value":"America/Monterrey","name":"蒙特雷","id":"America/Monterrey"},{"value":"America/Montevideo","name":"蒙得维的亚","id":"America/Montevideo"},{"value":"America/Montserrat","name":"蒙特塞拉特","id":"America/Montserrat"},{"value":"America/Nassau","name":"拿骚","id":"America/Nassau"},{"value":"America/New_York","name":"纽约","id":"America/New_York"},{"value":"America/Nipigon","name":"尼皮贡","id":"America/Nipigon"},{"value":"America/Nome","name":"诺姆","id":"America/Nome"},{"value":"America/Noronha","name":"洛罗尼亚","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"北达科他州比尤拉","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"北达科他州申特","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"北达科他州新塞勒姆","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"奥希纳加","id":"America/Ojinaga"},{"value":"America/Panama","name":"巴拿马","id":"America/Panama"},{"value":"America/Pangnirtung","name":"旁涅唐","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"帕拉马里博","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"凤凰城","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"太子港","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"西班牙港","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"波多韦柳","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"波多黎各","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"蓬塔阿雷纳斯","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"雷尼河","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"兰今湾","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"累西腓","id":"America/Recife"},{"value":"America/Regina","name":"里贾纳","id":"America/Regina"},{"value":"America/Resolute","name":"雷索卢特","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"里奥布郎库","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"圣伊萨贝尔","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"圣塔伦","id":"America/Santarem"},{"value":"America/Santiago","name":"圣地亚哥","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"圣多明各","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"圣保罗","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"斯科列斯比桑德","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"锡特卡","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"圣巴泰勒米岛","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"圣约翰斯","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"圣基茨","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"圣卢西亚","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"圣托马斯","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"圣文森特","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"斯威夫特卡伦特","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"特古西加尔巴","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"图勒","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"桑德贝","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"蒂华纳","id":"America/Tijuana"},{"value":"America/Toronto","name":"多伦多","id":"America/Toronto"},{"value":"America/Tortola","name":"托尔托拉","id":"America/Tortola"},{"value":"America/Vancouver","name":"温哥华","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"怀特霍斯","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"温尼伯","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"亚库塔特","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"耶洛奈夫","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"卡塞","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"戴维斯","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"迪蒙迪尔维尔","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"麦格理","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"莫森","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"麦克默多","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"帕默尔","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"罗瑟拉","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"昭和","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"特罗尔","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"沃斯托克","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"朗伊尔城","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"亚丁","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"阿拉木图","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"安曼","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"阿纳德尔","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"阿克套","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"阿克托别","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"阿什哈巴德","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"阿特劳","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"巴格达","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"巴林","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"巴库","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"曼谷","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"巴尔瑙尔","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"贝鲁特","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"比什凯克","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"文莱","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"加尔各答","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"赤塔","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"乔巴山","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"科伦坡","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"大马士革","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"达卡","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"帝力","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"迪拜","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"杜尚别","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"法马古斯塔","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"加沙","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"希伯伦","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"香港","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"科布多","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"伊尔库茨克","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"雅加达","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"查亚普拉","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"耶路撒冷","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"喀布尔","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"堪察加","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"卡拉奇","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"加德满都","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"汉德加","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"克拉斯诺亚尔斯克","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"吉隆坡","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"古晋","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"科威特","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"澳门","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"马加丹","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"望加锡","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"马尼拉","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"马斯喀特","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"尼科西亚","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"新库兹涅茨克","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"诺沃西比尔斯克","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"鄂木斯克","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"乌拉尔","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"金边","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"坤甸","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"平壤","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"卡塔尔","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"克孜洛尔达","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"仰光","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"利雅得","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"胡志明市","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"萨哈林","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"撒马尔罕","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"首尔","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"上海","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"新加坡","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"中科雷姆斯克","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"台北","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"塔什干","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"第比利斯","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"德黑兰","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"廷布","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"东京","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"托木斯克","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"乌兰巴托","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"乌鲁木齐","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"乌斯内拉","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"万象","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"符拉迪沃斯托克","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"雅库茨克","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"叶卡捷琳堡","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"埃里温","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"亚速尔群岛","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"百慕大","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"加那利","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"佛得角","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"法罗","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"马德拉","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"雷克雅未克","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"南乔治亚","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"圣赫勒拿","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"斯坦利","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"阿德莱德","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"布里斯班","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"布罗肯希尔","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"库利","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"达尔文","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"尤克拉","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"霍巴特","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"林德曼","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"豪勋爵","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"墨尔本","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"珀斯","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"悉尼","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"协调世界时UTC","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"阿姆斯特丹","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"安道尔","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"阿斯特拉罕","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"雅典","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"贝尔格莱德","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"柏林","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"布拉迪斯拉发","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"布鲁塞尔","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"布加勒斯特","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"布达佩斯","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"布辛根","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"基希讷乌","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"哥本哈根","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"爱尔兰标准时间都柏林","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"直布罗陀","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"根西岛","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"赫尔辛基","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"曼岛","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"伊斯坦布尔","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"泽西岛","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"加里宁格勒","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"基辅","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"基洛夫","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"里斯本","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"卢布尔雅那","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"英国夏令时间伦敦","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"卢森堡","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"马德里","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"马耳他","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"玛丽港","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"明斯克","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"摩纳哥","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"莫斯科","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"奥斯陆","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"巴黎","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"波德戈里察","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"布拉格","id":"Europe/Prague"},{"value":"Europe/Riga","name":"里加","id":"Europe/Riga"},{"value":"Europe/Rome","name":"罗马","id":"Europe/Rome"},{"value":"Europe/Samara","name":"萨马拉","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"圣马力诺","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"萨拉热窝","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"萨拉托夫","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"辛菲罗波尔","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"斯科普里","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"索非亚","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"斯德哥尔摩","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"塔林","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"地拉那","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"乌里扬诺夫斯克","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"乌日哥罗德","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"瓦杜兹","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"梵蒂冈","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"维也纳","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"维尔纽斯","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"伏尔加格勒","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"华沙","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"萨格勒布","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"扎波罗热","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"苏黎世","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"安塔那那利佛","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"查戈斯","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"圣诞岛","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"可可斯","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"科摩罗","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"凯尔盖朗","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"马埃岛","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"马尔代夫","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"毛里求斯","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"马约特","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"留尼汪","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"阿皮亚","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"奥克兰","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"布干维尔","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"查塔姆","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"复活节岛","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"埃法特","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"恩德伯里","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"法考福","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"斐济","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"富纳富提","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"加拉帕戈斯","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"甘比尔","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"瓜达尔卡纳尔","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"关岛","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"檀香山","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"约翰斯顿","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"基里地马地岛","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"库赛埃","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"夸贾林","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"马朱罗","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"马克萨斯","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"中途岛","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"瑙鲁","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"纽埃","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"诺福克","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"努美阿","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"帕果帕果","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"帕劳","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"皮特凯恩","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"波纳佩岛","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"莫尔兹比港","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"拉罗汤加","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"塞班","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"塔希提","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"塔拉瓦","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"东加塔布","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"特鲁克群岛","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"威克","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"瓦利斯","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

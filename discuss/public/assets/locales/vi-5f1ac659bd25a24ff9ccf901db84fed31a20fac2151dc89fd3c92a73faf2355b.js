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
r += "Hãy cùng <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">bắt đầu thảo luận nhé!</a> Đây ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "là <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> chủ đề";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " và ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> bài viết";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Khách truy cập cần nhiều hơn để đọc và trả lời - chúng tôi khuyên bạn nên ít nhất ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> chủ đề";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " và ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> bài viết";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Chỉ nhân viên mới có thể nhìn thấy thông báo này.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Hãy cùng <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">bắt đầu thảo luận!</a> Đó ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "là <strong>chủ đề " + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Khách truy cập cần nhiều hơn để đọc và trả lời - chúng tôi khuyên bạn nên ít nhất ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> chủ đề";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Chỉ nhân viên mới có thể nhìn thấy thông báo này.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "Hãy cùng <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">bắt đầu thảo luận!</a> Đó ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "là <strong>bài " + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Khách truy cập cần nhiều hơn để đọc và trả lời - chúng tôi khuyên bạn nên ít nhất ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "requiredPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> bài viết";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Chỉ nhân viên mới có thể nhìn thấy thông báo này.";
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
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " lỗi / giờ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> trang web đạt đến giới hạn thiết lập của ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
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
})() + " lỗi / giờ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " lỗi / phút";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> trang web đạt đến giới hạn thiết lập của ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
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
})() + " lỗi / phút";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " lỗi / giờ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> vượt quá giới hạn thiết lập trang web của ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
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
})() + " lỗi / giờ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " lỗi / phút";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> vượt quá giới hạn thiết lập trang web của ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
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
})() + " lỗi / phút";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
}, "posts_likes_MF" : function(d){
var r = "";
r += "Chủ đề này có ";
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
})() + " trả lời";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " trả lời";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "với tỷ lệ like trên post cao";
return r;
},
"med" : function(d){
var r = "";
r += "với tỷ lệ like trên post rất cao";
return r;
},
"high" : function(d){
var r = "";
r += "với tỷ lệ like trên post cực cao";
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["vi"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.vi = function ( n ) {
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

I18n.translations = {"vi":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"other":"Bytes"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"HH:mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"D MMM","full_no_year_no_time":"Do MMMM","long_with_year":"D MMM YYYY HH:mm","long_with_year_no_time":"D MMM YYYY","full_with_year_no_time":"D MMMM YYYY","long_date_with_year":"D MMM 'YY LT","long_date_without_year":"D MMM LT","long_date_with_year_without_time":"D MMM 'YY","long_date_without_year_with_linebreak":"D MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D MMM 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} trước","tiny":{"half_a_minute":"\u003c 1 phút","less_than_x_seconds":{"other":"\u003c %{count} giây"},"x_seconds":{"other":"%{count} giây"},"less_than_x_minutes":{"other":"\u003c %{count} phút"},"x_minutes":{"other":"%{count} phút"},"about_x_hours":{"other":"%{count} giờ"},"x_days":{"other":"%{count} ngày"},"x_months":{"other":"%{count} tháng"},"about_x_years":{"other":"%{count}năm"},"over_x_years":{"other":"\u003e %{count}năm"},"almost_x_years":{"other":"%{count}năm"},"date_month":"D MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"other":"%{count} phút"},"x_hours":{"other":"%{count} giờ"},"x_days":{"other":"%{count} ngày"},"date_year":"D MMM 'YY"},"medium_with_ago":{"x_minutes":{"other":" %{count} phút trước"},"x_hours":{"other":"%{count} giờ trước"},"x_days":{"other":"%{count} ngày trước"},"x_months":{"other":"%{count} tháng trước"},"x_years":{"other":"%{count}năm trước"}},"later":{"x_days":{"other":"còn %{count} ngày"},"x_months":{"other":"còn %{count} tháng"},"x_years":{"other":"còn %{count} năm"}},"previous_month":"Tháng trước","next_month":"Tháng sau","placeholder":"ngày"},"share":{"topic_html":"Chủ đề:\u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"đăng #%{postNumber}","close":"đóng","twitter":"Chia sẻ trên Twitter","facebook":"Chia sẻ trên Facebook","email":"Gửi qua email","url":"Sao chép và chia sẻ URL"},"action_codes":{"public_topic":"hiển thị chủ đề này công khai lúc %{when}","private_topic":"tạo một tin nhắn từ chủ đề này %{when}","split_topic":"tách chủ đề này lúc %{when}","invited_user":"đã mời %{who} lúc %{when}","invited_group":"đã mời %{who} lúc %{when}","user_left":"%{who}đã tự xóa mình khỏi tin nhắn này lúc %{when}","removed_user":"đã xoá %{who} lúc %{when}","removed_group":"đã xoá %{who} lúc %{when}","autobumped":"tự động đẩy lúc%{when}","autoclosed":{"enabled":"bị đóng lúc %{when}","disabled":"được mở lúc %{when}"},"closed":{"enabled":"bị đóng lúc %{when}","disabled":"được mở lúc %{when}"},"archived":{"enabled":"được đưa vào lưu trữ lúc %{when}","disabled":"được đưa ra khỏi lưu trữ lúc %{when}"},"pinned":{"enabled":"được ghim lúc %{when}","disabled":"được bỏ ghim lúc %{when}"},"pinned_globally":{"enabled":"được ghim lên toàn trang lúc %{when}","disabled":"được bỏ ghim lúc %{when}"},"visible":{"enabled":"được liệt kê lúc %{when}","disabled":"được bỏ liệt kê lúc %{when}"},"banner":{"enabled":"chọn đây làm banner lúc %{when}. Nó sẽ xuất hiện ở đầu mỗi trang cho đến khi bị ẩn đi bởi người dùng.","disabled":"xoá banner này lúc %{when}. Nó sẽ không còn xuất hiện ở đầu mỗi trang."},"forwarded":"Chuyển tiếp email phía trên"},"topic_admin_menu":"hành động cho chủ đề","wizard_required":"Chào mừng bạn đến với Discourse! Hãy bắt đầu với \u003ca href='%{url}' data-auto-route='true'\u003ehướng dẫn cài đặt\u003c/a\u003e ✨","emails_are_disabled":"Ban quản trị đã tắt mọi email gửi đi. Sẽ không có bất kỳ thông báo nào qua email được gửi đi.","software_update_prompt":{"dismiss":"Hủy bỏ"},"bootstrap_mode_enabled":{"other":"Để đơn giản hoá quá trình triển khai trang web, bạn đang ở trong chế độ bootstrap. Mọi người dùng mới đều có mức độ tin cậy 1 và sẽ nhận được email cập nhật thông tin mỗi ngày. Chế độ này sẽ tự động tắt khi số người dùng vượt qua %{count}"},"bootstrap_mode_disabled":"Chế độ bootstrap sẽ bị vô hiệu trong 24 giờ tới.","themes":{"default_description":"Mặc định","broken_theme_alert":"Site của bạn có thể không hoạt động vì theme / component %{theme} bị lỗi. Tắt nó ở %{path}"},"s3":{"regions":{"ap_northeast_1":"Châu Á Thái Bình Dương (Tokyo)","ap_northeast_2":"Châu Á Thái Bình Dương (Seoul)","ap_south_1":"Châu Á Thái Bình Dương (Mumbai)","ap_southeast_1":"Châu Á Thái Bình Dương (Singapore)","ap_southeast_2":"Châu Á Thái Bình Dương (Sydney)","ca_central_1":"Canada (Central)","cn_north_1":"Trung Quốc (Bắc Kinh)","cn_northwest_1":"China (Ningxia)","eu_central_1":"Châu Âu (Frankfurt)","eu_north_1":"EU (Stockholm)","eu_west_1":"Châu Âu (Ireland)","eu_west_2":"Châu Âu (London)","eu_west_3":"EU (Paris)","sa_east_1":"South America (São Paulo)","us_east_1":"US East (N. Virginia)","us_east_2":"US East (Ohio)","us_gov_east_1":"AWS GovCloud (US-East)","us_gov_west_1":"AWS GovCloud (Hoa Kỳ-Tây)","us_west_1":"US West (N. California)","us_west_2":"US West (Oregon)"}},"edit":"sửa tiêu đề và chuyên mục của chủ đề","expand":"Mở rộng","not_implemented":"Tính năng này chưa được hoàn thiện, xin lỗi!","no_value":"Không","yes_value":"Có","submit":"Gửi đi","generic_error":"Rất tiếc, đã có lỗi xảy ra.","generic_error_with_reason":"Đã xảy ra lỗi: %{error}","go_ahead":"Lên đầu","sign_up":"Đăng ký","log_in":"Đăng nhập","age":"Tuổi","joined":"Đã tham gia","admin_title":"Quản trị","show_more":"hiện thêm","show_help":"lựa chọn","links":"Liên kết","links_lowercase":{"other":"liên kết"},"faq":"FAQ","guidelines":"Hướng dẫn","privacy_policy":"Chính sách về quyền riêng tư","privacy":"Sự riêng tư","tos":"Điều khoản dịch vụ","rules":"Các quy tắc","conduct":"Quy tắc ứng xử","mobile_view":"Xem ở chế độ di động","desktop_view":"Xem ở chế độ máy tính","you":"Bạn","or":"hoặc","now":"ngay lúc này","read_more":"đọc thêm","more":"Nhiều hơn","x_more":{"other":"%{count} Thêm"},"less":"Ít hơn","never":"không bao giờ","every_30_minutes":"mỗi 30 phút","every_hour":"mỗi giờ","daily":"hàng ngày","weekly":"hàng tuần","every_month":"hàng tháng","every_six_months":"mỗi sáu tháng","max_of_count":"tối đa trong %{count}","alternation":"hoặc","character_count":{"other":"%{count} ký tự"},"related_messages":{"title":"Tin nhắn liên quan","see_all":"Xem \u003ca href=\"%{path}\"\u003e toàn bộ tin nhắn \u003c/a\u003e từ %{username}..."},"suggested_topics":{"title":"Chủ đề tương tự","pm_title":"Tin nhắn gợi ý"},"about":{"simple_title":"Giới thiệu","title":"Giới thiệu về %{title}","stats":"Thống kê trang","our_admins":"Các quản trị viên","our_moderators":"Các điều hành viên","moderators":"Điều hành viên","stat":{"all_time":"Từ trước tới nay"},"like_count":"Lượt thích","topic_count":"Các chủ đề","post_count":"Các bài viết","user_count":"Người dùng","active_user_count":"Thành viên tích cực","contact":"Liên hệ chúng tôi","contact_info":"Trong trường hợp có bất kỳ sự cố nào ảnh hưởng tới trang này, xin vui lòng liên hệ với chúng tôi theo địa chỉ %{contact_info}."},"bookmarked":{"title":"Dấu trang","clear_bookmarks":"Xoá dấu trang","help":{"bookmark":"Chọn bài viết đầu tiên của chủ đề cho vào dấu trang","unbookmark":"Chọn để xoá toàn bộ dấu trang trong chủ đề này","unbookmark_with_reminder":"Nhấp để xóa tất cả dấu trang và lời nhắc trong chủ đề này. Bạn có lời nhắc đặt %{reminder_at} cho chủ đề này."}},"bookmarks":{"created":"Bạn đã đánh dấu bài đăng này. %{name}","not_bookmarked":"đánh dấu bài viết này","created_with_reminder":"Bạn đã đánh dấu bài đăng này với lời nhắc %{date}. %{name}","remove":"Xóa dấu trang","delete":"Xóa chỉ mục","confirm_delete":"Bạn có chắc chắn muốn xóa dấu trang này không? Lời nhắc cũng sẽ bị xóa.","confirm_clear":"Bạn có chắc muốn xóa toàn bộ đánh dấu trong chủ đề này?","save":"Lưu","no_timezone":"Bạn chưa đặt múi giờ. Bạn sẽ không thể đặt lời nhắc. Thiết lập một \u003ca href=\"%{basePath}/my/preferences/profile\"\u003etrong hồ sơ của bạn\u003c/a\u003e .","invalid_custom_datetime":"Ngày và giờ bạn cung cấp không hợp lệ, vui lòng thử lại.","list_permission_denied":"Bạn không có quyền xem chỉ mục của người dùng này","no_user_bookmarks":"Bạn không có bài viết nào được đánh dấu; dấu trang cho phép bạn nhanh chóng tham khảo các bài viết cụ thể.","auto_delete_preference":{"label":"Tự động xóa","never":"Không bao giờ","when_reminder_sent":"Sau khi lời nhắc được gửi đi","on_owner_reply":"Sau khi tôi trả lời chủ đề này"},"search_placeholder":"Tìm kiếm dấu trang theo tên, tiêu đề chủ đề hoặc nội dung bài đăng","search":"Tìm kiếm","reminders":{"today_with_time":"hôm nay lúc %{time}","tomorrow_with_time":"ngày mai lúc %{time}","at_time":"lúc %{date_time}","existing_reminder":"Bạn đã đặt lời nhắc cho dấu trang này sẽ được gửi vào lúc %{at_date_time}"}},"copy_codeblock":{"copied":"đã sao chép!"},"drafts":{"resume":"Làm lại","remove":"Xoá","remove_confirmation":"Bạn có chắc chắn muốn xóa bản nháp này không?","new_topic":"Chủ đề nháp mới","new_private_message":"Tin nhắn nháp mới","topic_reply":"Trả lời nháp","abandon":{"yes_value":"Hủy bỏ"}},"topic_count_latest":{"other":"Xem %{count} chủ đề mới hoặc được cập nhật"},"topic_count_unread":{"other":"Xem %{count} chủ đề chưa đọc"},"topic_count_new":{"other":"Xem %{count} chủ đề mới"},"preview":"xem trước","cancel":"hủy","deleting":"Đang xóa ...","save":"Lưu thay đổi","saving":"Đang lưu ...","saved":"Đã lưu!","upload":"Tải lên","uploading":"Đang tải lên...","uploading_filename":"Tải lên: %{filename}...","clipboard":"clipboard","uploaded":"Đã tải lên!","pasting":"Đang gõ","enable":"Kích hoạt","disable":"Vô hiệu hóa","continue":"Tiếp tục","undo":"Hoàn tác","revert":"Phục hồi","failed":"Thất bại","switch_to_anon":"Vào chế độ Ẩn danh","switch_from_anon":"Thoát chế độ Ẩn danh","banner":{"close":"Ẩn banner này.","edit":"Sửa banner này \u003e\u003e"},"pwa":{"install_banner":"Bạn có muốn \u003ca href\u003ecài đặt %{title} trên thiết bị này?\u003c/a\u003e "},"choose_topic":{"none_found":"Không tìm thấy chủ đề nào","title":{"search":"Tìm kiếm một chủ đề","placeholder":"nhập tiêu đề chủ đề, url hoặc id ở đây"}},"choose_message":{"none_found":"Không tìm thấy tin nhắn nào.","title":{"search":"Tìm kiếm một tin nhắn","placeholder":"nhập tiêu đề tin nhắn, url hoặc id ở đây"}},"review":{"order_by":"Lọc bởi","in_reply_to":"trong trả lời tới","explain":{"why":"giải thích lý do tại sao mặt hàng này kết thúc trong hàng đợi","title":"Chấm điểm","formula":"Công thức","subtotal":"Tổng phụ","total":"Tổng số","min_score_visibility":"Điểm tối thiểu cho khả năng hiển thị","score_to_hide":"Điểm để ẩn bài","take_action_bonus":{"name":"hanh động","title":"Khi một nhân viên chọn hành động, cờ sẽ được thưởng."},"user_accuracy_bonus":{"name":"độ chính xác của người dùng","title":"Người dùng có cờ đã được đồng ý trong lịch sử được tặng tiền thưởng."},"trust_level_bonus":{"name":"mức độ tin cậy","title":"Các mục có thể xem lại được tạo bởi người dùng có mức độ tin cậy cao hơn có điểm cao hơn."},"type_bonus":{"name":"loại tiền thưởng","title":"Một số loại có thể xem lại có thể được nhân viên chỉ định một phần thưởng để làm cho chúng có mức độ ưu tiên cao hơn."}},"claim_help":{"optional":"Bạn có thể phàn nàn mục này để tránh những người khác đánh giá nó.","required":"Bạn phải yêu cầu các mục trước khi bạn có thể xem xét chúng.","claimed_by_you":"Bạn đã yêu cầu mặt hàng này và có thể xem xét nó.","claimed_by_other":"Mục này chỉ có thể được xem xét bởi \u003cb\u003e%{username}\u003c/b\u003e ."},"claim":{"title":"yêu cầu chủ đề này"},"unclaim":{"help":"xóa yêu cầu này"},"awaiting_approval":"Đang đợi Phê duyệt","delete":"Xóa","settings":{"saved":"Lưu trữ","save_changes":"Lưu thay đổi","title":"Cài đặt","priorities":{"title":"Ưu tiên xem lại"}},"moderation_history":"Lịch sử kiểm duyệt","view_all":"Xem tất cả","grouped_by_topic":"Được nhóm theo chủ đề","none":"Không có mục nào cần đánh giá.","view_pending":"xem hàng đợi","topic_has_pending":{"other":"Chủ đề này có \u003cb\u003e%{count}\u003c/b\u003e bài viết đang cần phê duyệt"},"title":"Review","topic":"Chủ đề:","filtered_topic":"Bạn đã lọc đến nội dung có thể xem lại trong một chủ đề.","filtered_user":"Người dùng","filtered_reviewed_by":"Xét bởi","show_all_topics":"hiển thị toàn bộ chủ đề","deleted_post":"(bài viết đã bị xóa)","deleted_user":"(người dùng đã bị xóa)","user":{"bio":"Tiểu sử","website":"Trang web","username":"Tên đăng nhập","email":"Email","name":"Tên","fields":"Trường tùy biến","reject_reason":"Lý do"},"user_percentage":{"agreed":{"other":"%{count}đồng ý"},"disagreed":{"other":"%{count} không đồng ý"},"ignored":{"other":"%{count} bỏ qua"}},"topics":{"topic":"Chủ đề","reviewable_count":"Đếm","reported_by":"Báo cáo bởi","deleted":"[Chủ đề bị xóa]","original":"(chủ đề gốc)","details":"chi tiết","unique_users":{"other":"%{count} người dùng"}},"replies":{"other":"%{count} trả lời"},"edit":"Sửa","save":"Lưu","cancel":"Hủy","new_topic":"Phê duyệt mục này sẽ tạo một chủ đề mới","filters":{"all_categories":"(tất cả danh mục)","type":{"title":"Loại","all":"(tất cả các loại)"},"minimum_score":"Điểm tối thiểu:","refresh":"Tải lại","status":"Trạng thái","category":"Danh mục","orders":{"score":"Điểm số","score_asc":"Điểm (ngược lại)","created_at":"Được tạo tại","created_at_asc":"Tạo tại (đảo ngược)"},"priority":{"title":"Ưu tiên tối thiểu","any":"(bất kỳ)","low":"Thấp","medium":"Trung bình","high":"Cao"}},"conversation":{"view_full":"xem toàn bộ hội thoại"},"scores":{"about":"Điểm số này được tính toán dựa trên mức độ tin cậy của người báo cáo, độ chính xác của những gắn cờ trước đó, và mức độ ưu tiên của mục được báo cáo.","score":"Điểm số","date":"Ngày","type":"Loại","status":"Trạng thái","submitted_by":"Được gửi bởi","reviewed_by":"Được đánh giá bởi"},"statuses":{"pending":{"title":"Đang treo"},"approved":{"title":"Đã phê duyệt"},"rejected":{"title":"Từ chối"},"ignored":{"title":"Đã bỏ qua"},"deleted":{"title":"Đã xóa"},"reviewed":{"title":"(tất cả đã đánh giá)"},"all":{"title":"(mọi thứ)"}},"types":{"reviewable_flagged_post":{"title":"Bài viết bị gắn cờ","flagged_by":"Gắn cờ bởi"},"reviewable_queued_topic":{"title":"Chủ đề được lên lịch"},"reviewable_queued_post":{"title":"Bài viết được xếp lịch"},"reviewable_user":{"title":"Người dùng"},"reviewable_post":{"title":"Bài viết"}},"approval":{"title":"Bài viết cần phê duyệt","description":"Chúng tôi đã nhận được bài viết mới của bạn, nhưng nó cần phải được phê duyệt bởi admin trước khi được hiện. Xin hãy kiên nhẫn.","pending_posts":{"other":"Bạn có \u003cstrong\u003e%{count}\u003c/strong\u003e bài viết đang chờ."},"ok":"OK"},"example_username":"tên người dùng"},"relative_time_picker":{"minutes":{"other":"phút"},"hours":{"other":"giờ"},"days":{"other":"ngày"}},"time_shortcut":{"later_today":"Sau ngày hôm nay","next_business_day":"Ngày làm việc tiếp theo","tomorrow":"Ngày mai","next_week":"Tuần tới","post_local_date":"Ngày trong bài","later_this_week":"Cuối tuần này","start_of_next_business_week":"Thứ hai","start_of_next_business_week_alt":"Thứ hai tới","next_month":"Tháng t","custom":"Ngày giờ tùy chỉnh"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e đã đăng \u003ca href='%{topicUrl}'\u003echủ đề\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eBạn\u003c/a\u003e đã đăng \u003ca href='%{topicUrl}'\u003echủ đề\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e đã trả lời tới \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eBạn\u003c/a\u003e đã trả lời \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e đã trả lời \u003ca href='%{topicUrl}'\u003echủ đề\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eBạn\u003c/a\u003e đã trả lời \u003ca href='%{topicUrl}'\u003echủ đề\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e đã nhắc đến \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e đã nhắc tới \u003ca href='%{user2Url}'\u003ebạn\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eBạn\u003c/a\u003e đã nhắc đến \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Được đăng bởi \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Được đăng bởi \u003ca href='%{userUrl}'\u003ebạn\u003c/a\u003e","sent_by_user":"Đã gửi bởi \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Đã gửi bởi \u003ca href='%{userUrl}'\u003ebạn\u003c/a\u003e"},"directory":{"username":"Tên tài khoản","filter_name":"lọc theo tên đăng nhập","title":"Người dùng","likes_given":"Đưa ra","likes_received":"Đã nhận","topics_entered":"Đã xem","topics_entered_long":"Chủ đề đã xem","time_read":"Thời gian đọc","topic_count":"Chủ đề","topic_count_long":"Chủ đề đã được tạo","post_count":"Trả lời","post_count_long":"Trả lời đã đăng","no_results":"Không tìm thấy kết quả.","days_visited":"Ghé thăm","days_visited_long":"Ngày đã ghé thăm","posts_read":"Đã đọc","posts_read_long":"Bài đăng đã đọc","last_updated":"Cập nhật lần cuối:","total_rows":{"other":"%{count} người dùng"},"edit_columns":{"save":"Lưu","reset_to_default":"Đặt lại về mặc định"}},"group_histories":{"actions":{"change_group_setting":"Đổi cài đặt nhóm","add_user_to_group":"Thêm người dùng","remove_user_from_group":"Xoá người dùng","make_user_group_owner":"Đặt làm người sở hữu","remove_user_as_group_owner":"Huỷ quyền sở hữu"}},"groups":{"member_added":"Đã thêm","member_requested":"Yêu cầu tại","add_members":{"title":"Thêm thành viên vào %{group_name}","description":"Bạn cũng có thể dán vào danh sách được phân tách bằng dấu phẩy.","usernames_or_emails":{"title":"Nhập tên người dùng hoặc địa chỉ email","input_placeholder":"Tên người dùng hoặc email"},"usernames":{"input_placeholder":"Tên người dùng"},"notify_users":"Thông báo cho người dùng"},"requests":{"title":"Những yêu cầu","reason":"Lý do","accept":"Chấp nhận","accepted":"đã chấp nhận","deny":"Từ chối","denied":"Đã từ chối","undone":"yêu cầu bị hủy","handle":"xử lý yêu cầu thành viên"},"manage":{"title":"Quản lý","name":"Tên","full_name":"Tên đầy đủ","add_members":"Thêm thành viên","delete_member_confirm":"Xóa %{username}ra khỏi nhóm %{group}?","profile":{"title":"Hồ sơ"},"interaction":{"title":"Tương tác","posting":"Gửi bài","notification":"Thông báo"},"email":{"title":"Email","status":"Đồng bộ %{old_emails} / %{total_emails} email qua IMAP.","save_settings":"Lưu các cài đặt","credentials":{"title":"Thông tin đăng nhập","smtp_server":"Máy chủ SMTP","smtp_port":"Cổng SMTP","smtp_ssl":"Sử dụng SSL cho SMTP","imap_server":"Máy chủ IMAP","imap_port":"Cổng IMAP","imap_ssl":"Sử dụng SSL cho IMAP","username":"Tên đăng nhập","password":"Mật khẩu"},"settings":{"title":"Cài đặt"},"mailboxes":{"synchronized":"Hộp thư được đồng bộ hóa","none_found":"Không tìm thấy hộp thư nào trong tài khoản email này."}},"membership":{"title":"Thành viên","access":"Truy cập"},"categories":{"title":"Danh mục","long_title":"Thông báo mặc định của danh mục","description":"Khi người dùng được thêm vào nhóm này, cài đặt thông báo danh mục của họ sẽ được đặt thành các giá trị mặc định này. Sau đó, họ có thể thay đổi chúng.","watched_categories_instructions":"Tự động xem tất cả các chủ đề trong các danh mục này. Các thành viên trong nhóm sẽ được thông báo về tất cả các bài đăng và chủ đề mới, và một số bài đăng mới cũng sẽ xuất hiện bên cạnh chủ đề.","tracked_categories_instructions":"Tự động theo dõi tất cả các chủ đề trong các danh mục này. Một số bài viết mới sẽ xuất hiện bên cạnh chủ đề.","watching_first_post_categories_instructions":"Người dùng sẽ được thông báo về bài đăng đầu tiên trong mỗi chủ đề mới trong các danh mục này.","regular_categories_instructions":"Nếu các danh mục này bị ẩn, chúng sẽ được hiển thị đối với các thành viên trong nhóm. Người dùng sẽ được thông báo nếu họ được đề cập hoặc ai đó trả lời họ.","muted_categories_instructions":"Người dùng sẽ không được thông báo về bất kỳ điều gì về các chủ đề mới trong các danh mục này và chúng sẽ không xuất hiện trên các trang danh mục hoặc chủ đề mới nhất."},"tags":{"title":"Thẻ","long_title":"Thẻ thông báo mặc định","description":"Khi người dùng được thêm vào nhóm này, cài đặt thông báo thẻ của họ sẽ được đặt thành các giá trị mặc định này. Sau đó, họ có thể thay đổi chúng.","watched_tags_instructions":"Tự động xem tất cả các chủ đề có các thẻ này. Các thành viên trong nhóm sẽ được thông báo về tất cả các bài đăng và chủ đề mới, và một số bài đăng mới cũng sẽ xuất hiện bên cạnh chủ đề.","tracked_tags_instructions":"Tự động theo dõi tất cả các chủ đề với các thẻ này. Một số bài viết mới sẽ xuất hiện bên cạnh chủ đề.","watching_first_post_tags_instructions":"Người dùng sẽ được thông báo về bài đăng đầu tiên trong mỗi chủ đề mới với các thẻ này.","regular_tags_instructions":"Nếu các thẻ này bị tắt tiếng, chúng sẽ được hiển thị đối với các thành viên trong nhóm. Người dùng sẽ được thông báo nếu họ được đề cập hoặc ai đó trả lời họ.","muted_tags_instructions":"Người dùng sẽ không được thông báo bất kỳ điều gì về các chủ đề mới với các thẻ này và chúng sẽ không xuất hiện trong thời gian gần nhất."},"logs":{"title":"Log","when":"Khi","action":"Hành động","acting_user":"Người dùng đang hoạt động","target_user":"Người dùng mục tiêu","subject":"Tiêu đề","details":"Chi tiết","from":"Từ","to":"Tới"}},"permissions":{"title":"Quyền","none":"Không có danh mục nào được liên kết với nhóm này.","description":"Các thành viên của nhóm này có thể truy cập các danh mục này"},"public_admission":"Cho phép Thành viên tham gia nhóm một cách tự do (nhóm hiển thị công khai)","public_exit":"Cho phép Thành viên thoát khỏi nhóm một cách tự do","empty":{"posts":"Không có bài viết nào của các thành viên trong nhóm này","members":"Không có thành viên nào trong nhóm này","requests":"Không có yêu cầu gia nhập nào cho nhóm này.","mentions":"Group này chưa được nhắc tới lần nào.","messages":"Không có tin nhắn nào của nhóm này","topics":"Không có chủ đề nào được gửi bởi thành viên của nhóm này.","logs":"Không có bản ghi nào dành cho nhóm này"},"add":"Thêm","join":"Tham gia","leave":"Rời nhóm","request":"Yêu cầu","message":"Tin nh","confirm_leave":"Bạn có chắc muốn rời khỏi nhóm này?","allow_membership_requests":"Cho phép người dùng gửi yêu cầu thành viên đến chủ sở hữu nhóm (Yêu cầu nhóm hiển thị công khai)","membership_request_template":"đã tùy chỉnh để hiển thị cho người dùng khi gửi yêu cầu thành viên","membership_request":{"submit":"Gửi yêu c","title":"Yêu cầu tham gia @%{group_name}","reason":"Cho phép chủ sở hữu nhóm biết lý do bạn thuộc nhóm này"},"membership":"Thành viên","name":"Tên","group_name":"Tên nhóm","user_count":"Người dùng","bio":"Thông tin về nhóm","selector_placeholder":"nhập tên tài khoản","owner":"chủ","index":{"title":"Nhóm","all":"Tất cả các nhóm","empty":"Không có nhóm công khai nào.","filter":"Lọc bởi loại nhóm","owner_groups":"Nhóm của tôi","close_groups":"Nhóm đóng","automatic_groups":"Các nhóm tự động","automatic":"Tự động","closed":"Đã ","public":"Công khai","private":"Riêng tư","public_groups":"Nhóm công khai","automatic_group":"Nhóm tự động","close_group":"Nhóm riêng tư","my_groups":"Nhóm của tôi","group_type":"Loại nhóm","is_group_user":"Thành viên","is_group_owner":"Chủ sở hữu"},"title":{"other":"Nhóm"},"activity":"Hoạt động","members":{"title":"Các thành viên","filter_placeholder_admin":"username hoặc email","filter_placeholder":"tên người dùng","remove_member":"Xóa thành viên","remove_member_description":"Xóa \u003cb\u003e%{username}\u003c/b\u003e khỏi group này","make_owner":"Thêm chủ sở hữu","make_owner_description":"Thêm \u003cb\u003e%{username}\u003c/b\u003e là một chủ sở hữu của nhóm này","remove_owner":"Xóa chủ sở hữu","remove_owner_description":"Xóa quyền sở hữu nhóm này của \u003cb\u003e%{username}\u003c/b\u003e ","owner":"Chủ sở hữu","forbidden":"Bạn không được phép xem thành viên."},"topics":"Chủ đề","posts":"Các bài viết","mentions":"Được nhắc đến","messages":"Tin nhắn","notification_level":"Mức độ thông báo mặc định cho các tin nhắn trong nhóm","alias_levels":{"mentionable":"Ai có thể @mention nhóm này?","messageable":"Ai có thể gửi tin nhắn cho nhóm này?","nobody":"Không ai cả","only_admins":"Chỉ các quản trị viên","mods_and_admins":"Chỉ có người điều hành và ban quản trị","members_mods_and_admins":"Chỉ có thành viên trong nhóm, ban điều hành, và ban quản trị","owners_mods_and_admins":"Chỉ chủ sở hữu, điều hành viên và quản trị viên.","everyone":"Mọi người"},"notifications":{"watching":{"title":"Đang theo dõi","description":"Bạn sẽ được thông báo khi có bài viết mới trong mỗi tin nhắn, và số lượng trả lời mới sẽ được hiển thị"},"watching_first_post":{"title":"Theo dõi chủ đề đầu tiên","description":"Bạn sẽ được thông báo về tin nhắn mới trong nhóm này nhưng không trả lời tin nhắn."},"tracking":{"title":"Đang theo dõi","description":"Bạn sẽ được thông báo nếu ai đó đề cập đến @tên bạn hoặc trả lời bạn, và số lượng trả lời mới sẽ được hiển thị"},"regular":{"title":"Bình thường","description":"Bạn sẽ được thông báo nếu ai đó đề cập đến @tên bạn hoặc trả lời bạn"},"muted":{"title":"Im lặng","description":"Bạn sẽ không được thông báo về bất kì tin nhắn nào trong nhóm này nữa."}},"flair_url":"Ảnh đại diện","flair_upload_description":"Sử dụng hình ảnh vuông không nhỏ hơn 20px x 20px.","flair_bg_color":"Màu nền ảnh đại diện","flair_bg_color_placeholder":"(Tuỳ chọn) Giá trị mã màu Hexa","flair_color":"Màu ảnh đại diện","flair_color_placeholder":"(Tuỳ chọn) Giá trị mã màu Hexa","flair_preview_icon":"Biểu tượng xem trước","flair_preview_image":"Ảnh xem trước","flair_type":{"icon":"Chọn một biểu tượng","image":"Tải lên một hình ảnh"}},"user_action_groups":{"1":"Lượt thích","2":"Lần được thích","3":"Chỉ mục","4":"Các chủ đề","5":"Trả lời","6":"Phản hồi","7":"Được nhắc đến","9":"Lời trích dẫn","11":"Biên tập","12":"Bài đã gửi","13":"Hộp thư","14":"Đang chờ xử lý","15":"Nháp"},"categories":{"all":"tất cả chuyên mục","all_subcategories":"Tất cả","no_subcategory":"không có gì","category":"Chuyên mục","category_list":"Hiễn thị danh sách chuyên mục","reorder":{"title":"Sắp xếp lại danh mục","title_long":"Tổ chức lại danh sách danh mục","save":"Lưu thứ tự","apply_all":"Áp dụng","position":"Vị trí"},"posts":"Bài viết","topics":"Chủ đề","latest":"Mới nhất","toggle_ordering":"chuyển lệnh kiểm soát","subcategories":"Phân loại phụ","muted":"Các danh mục bị ẩn","topic_sentence":{"other":"%{count} chủ đề"},"topic_stat_unit":{"week":"tuần","month":"tháng"},"topic_stat_sentence_week":{"other":"%{count}chủ đề mới trong tuần qua."},"topic_stat_sentence_month":{"other":"%{count}chủ đề mới trong tháng qua."},"n_more":"Chuyên mục (thêm %{count} ) ..."},"ip_lookup":{"title":"Tìm kiếm địa chỉ IP","hostname":"Hostname","location":"Vị trí","location_not_found":"(không biết)","organisation":"Công ty","phone":"Điện thoại","other_accounts":"Tài khoản khác với địa chỉ IP này","delete_other_accounts":"Xoá %{count}","username":"tên đăng nhập","trust_level":"TL","read_time":"thời gian đọc","topics_entered":"chủ để đã xem","post_count":"# bài viết","confirm_delete_other_accounts":"Bạn có muốn xóa những tài khoản này không?","powered_by":"sử dụng \u003ca href='https://maxmind.com'\u003e MaxMindDB \u003c/a\u003e","copied":"đã sao chép"},"user_fields":{"none":"(chọn một tùy chọn)","required":"Vui lòng nhập giá trị cho \"%{name}\""},"user":{"said":"%{username}:","profile":"Tiểu sử","mute":"Im lặng","edit":"Tùy chỉnh","download_archive":{"button_text":"Tải tất c","confirm":"Bạn có chắc chắn muốn download các bài viết của mình?","success":"Quá trình tải về đã bắt đầu, bạn sẽ được thông báo qua tin nhắn khi quá trình hoàn tất.","rate_limit_error":"Bài viết chỉ được tải về một lần mỗi người, hãy thử lại vào ngày mai."},"new_private_message":"Tin nhắn mới","private_message":"Tin nhắn","private_messages":"Tin nhắn","user_notifications":{"filters":{"filter_by":"Lọc theo","all":"Tất cả","read":"Đã đọc","unread":"Chưa đọc"},"ignore_duration_title":"Bỏ qua người dùng","ignore_duration_username":"Tên đăng nhập","ignore_duration_when":"Thời lượng:","ignore_duration_save":"Bỏ qua","ignore_duration_note":"Xin lưu ý rằng tất cả các lượt bỏ qua sẽ tự động bị xóa sau khi hết thời hạn bỏ qua.","ignore_duration_time_frame_required":"Vui lòng chọn khung thời gian","ignore_no_users":"Bạn không có thành viên bị chặn nào.","ignore_option":"Đã bỏ qua","ignore_option_title":"Bạn sẽ không nhận được thông báo liên quan đến người dùng này và tất cả các chủ đề và câu trả lời của họ sẽ bị ẩn.","add_ignored_user":"Thêm...","mute_option":"Im lặng","mute_option_title":"Bạn sẽ không nhận được bất kỳ thông báo nào liên quan đến người dùng này.","normal_option":"Bình thường","normal_option_title":"Bạn sẽ được thông báo nếu người dùng này trả lời bạn, trích dẫn bạn hoặc đề cập đến bạn."},"notification_schedule":{"none":"Không có gì","monday":"Thứ hai","to":"tới"},"activity_stream":"Hoạt động","read":"Đã đọc","preferences":"Tùy chỉnh","feature_topic_on_profile":{"open_search":"Chọn chủ đề mới","title":"Chọn chủ đề","search_label":"Tìm kiếm chủ đề theo tiêu đề","save":"Lưu","clear":{"title":"Xóa","warning":"Bạn có chắc chắn muốn xóa chủ đề nổi bật của mình không?"}},"use_current_timezone":"Sử dụng múi giờ hiện tại","profile_hidden":"Hồ sơ công khai của người dùng này bị ẩn.","expand_profile":"Mở","collapse_profile":"Thu gọn","bookmarks":"Theo dõi","bio":"Về tôi","timezone":"Múi giờ","invited_by":"Được mời bởi","trust_level":"Độ tin tưởng","notifications":"Thông báo","statistics":"Thống kê","desktop_notifications":{"label":"Thông báo Trực tiếp","not_supported":"Xin lỗi. Trình duyệt của bạn không hỗ trợ Notification.","perm_default":"Mở thông báo","perm_denied_btn":"Không có quyền","perm_denied_expl":"Bạn đã từ chối nhận thông báo, để nhận lại bạn cần thiết lập trình duyệt.","disable":"Khóa Notification","enable":"Cho phép Notification","each_browser_note":"Lưu ý: Bạn phải thay đổi cài đặt này trên mọi trình duyệt bạn sử dụng. Tất cả thông báo sẽ bị tắt khi ở chế độ \"không làm phiền\", bất kể cài đặt này là gì.","consent_prompt":"Bạn có muốn thông báo trực tiếp khi mọi người trả lời bài đăng của bạn không?"},"dismiss":"Hủy bỏ","dismiss_notifications":"Bỏ qua tất cả","dismiss_notifications_tooltip":"Đánh dấu đã đọc cho tất cả các thông báo chưa đọc","first_notification":"Thông báo đầu tiên của bạn! Chọn để bắt đầu","dynamic_favicon":"Hiển thị đếm  trên icon trình duyệt","skip_new_user_tips":{"description":"Bỏ qua các mẹo và huy hiệu giới thiệu người dùng mới","not_first_time":"Không phải lần đầu tiên sao?","skip_link":"Bỏ qua những mẹo này"},"theme_default_on_all_devices":"Đặt giao diện này là mặc định trên tất cả các thiết bị của tôi","color_scheme_default_on_all_devices":"Đặt (các) bảng màu mặc định trên tất cả các thiết bị của tôi","color_scheme":"Sơ đồ màu","color_schemes":{"disable_dark_scheme":"Giống như thông thường","dark_instructions":"Bạn có thể xem trước bảng màu ở chế độ tối bằng cách chuyển sang chế độ tối của thiết bị.","undo":"Cài lại","regular":"Thường xuyên","dark":"Chế độ tối","default_dark_scheme":"(trang web mặc định)"},"dark_mode":"Chế độ tối","dark_mode_enable":"Bật bảng màu chế độ tối tự động","text_size_default_on_all_devices":"Đặt đây làm kích thước văn bản mặc định trên tất cả các thiết bị của tôi","allow_private_messages":"Cho phép người dùng khác gửi tin nhắn cá nhân cho tôi","external_links_in_new_tab":"Mở tất cả liên kết bên ngoài trong thẻ mới","enable_quoting":"Bật chế độ làm nổi bật chữ trong đoạn trích dẫn trả lời","enable_defer":"Cho phép trì hoãn để đánh dấu các chủ đề chưa đọc","change":"thay đổi","featured_topic":"Chủ đề nổi bật","moderator":"%{user} trong ban quản trị","admin":"%{user} là người điều hành","moderator_tooltip":"Thành viên này là MOD","admin_tooltip":"Thành viên này là admin","silenced_tooltip":"Thành viên này đã bị cấm","suspended_notice":"Thành viên này bị đình chỉ cho đến ngày %{date}. ","suspended_permanently":"Người dùng này đã bị tạm ngưng.","suspended_reason":"Lý do: ","github_profile":"GitHub","email_activity_summary":"Tóm tắt hoạt động","mailing_list_mode":{"label":"Chế độ mailing list","enabled":"Bật chế độ mailing list","instructions":"\nCài đặt này ghi đè tổng quan về hoạt động\u003cbr /\u003e\n\nTopic bị đánh dấu im lặng và chuyên mục sẽ không bao gồm trong thư\n","individual":"Gửi email cho mỗi bài viết mới.","individual_no_echo":"Gửi email cho mỗi bài viết mới trừ bài viết của tôi","many_per_day":"Gửi email cho tôi về mỗi bài viết mới (khoảng %{dailyEmailEstimate} thư một ngày)","few_per_day":"Gửi email cho tôi về mỗi bài viết mới (khoảng 2 thư một ngày)","warning":"Chế độ danh sách gửi thư được bật. Cài đặt thông báo qua email bị ghi đè."},"tag_settings":"Thẻ","watched_tags":"Theo dõi","watched_tags_instructions":"Chế độ theo dõi sẽ tự động bật với những chủ đề được gắn thẻ này. Bạn sẽ được thông báo về tất cả các bài viết, chủ đề mới và số lượng bài viết mới sẽ hiển thị bên cạnh chủ đề kế tiếp.","tracked_tags":"Theo dõi","tracked_tags_instructions":"Chế độ theo dõi sẽ tự động bật với những chủ đề được gắn thẻ này. Số lượng bài viết mới sẽ xuất hiện bên cạnh chủ đề.","muted_tags":"Im lặng","muted_tags_instructions":"Bạn sẽ không được thông báo về bất kì hoạt động nào ở những chủ đề có thẻ này, chúng cũng sẽ không xuất hiện như là những chủ đề mới nhất.","watched_categories":"Đã theo dõi","watched_categories_instructions":"Bạn sẽ tự động theo dõi tất cả các chủ đề trong những chuyên mục này. Bạn sẽ nhận được tin báo về những bài viết và chủ đề mới, cùng với số lượng bài viết mới cũng sẽ xuất hiện kế bên chủ đề đó.","tracked_categories":"Theo dõi","tracked_categories_instructions":"Bạn sẽ tự động theo dõi tất cả các chủ đề trong các danh mục này. Một số bài viết mới sẽ xuất hiện bên cạnh chủ đề.","watched_first_post_categories":"Xem bài viết đầu tiên","watched_first_post_categories_instructions":"Bạn sẽ nhận được thông báo khi có ai đó đăng chủ đề mới trong thư mục này.","watched_first_post_tags":"Xem bài viết đầu tiên","watched_first_post_tags_instructions":"Bạn sẽ nhận được thông báo khi có ai đó đăng chủ đề mới có chứa thẻ này.","muted_categories":"Im lặng","muted_categories_instructions":"Bạn sẽ không được thông báo về bất cứ điều gì về các chủ đề mới trong các danh mục này và chúng sẽ không xuất hiện trên các danh mục hoặc các trang mới nhất.","muted_categories_instructions_dont_hide":"Bạn sẽ không được thông báo về bất cứ điều gì về các chủ đề mới trong các danh mục này.","regular_categories":"Đều đặn","regular_categories_instructions":"Bạn sẽ thấy các danh mục này trong danh sách chủ đề \"Mới nhất\" và \"Hàng đầu\".","no_category_access":"Với tư cách là người kiểm duyệt, bạn có quyền truy cập danh mục hạn chế, tính năng lưu bị tắt.","delete_account":"Xoá Tài khoản của tôi","delete_account_confirm":"Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của bạn? Hành động này không thể được hoàn tác!","deleted_yourself":"Tài khoản của bạn đã được xóa thành công.","delete_yourself_not_allowed":"Vui lòng liên hệ với nhân viên nếu bạn muốn tài khoản của mình được xóa.","unread_message_count":"Tin nhắn","admin_delete":"Xoá","users":"Thành viên","muted_users":"Im lặng","muted_users_instructions":"Chặn tất cả các thông báo và tin nhắn từ những người dùng này.","allowed_pm_users":"Được phép","allowed_pm_users_instructions":"Chỉ cho phép tin nhắn từ những người dùng này.","allow_private_messages_from_specific_users":"Chỉ cho phép những người dùng cụ thể gửi cho tôi tin nhắn cá nhân","ignored_users":"Đã bỏ qua","ignored_users_instructions":"Chặn tất cả các bài đăng, thông báo và tin nhắn từ những người dùng này.","tracked_topics_link":"Hiển thị","automatically_unpin_topics":"Tự động bỏ ghim chủ đề khi tôi xuống cuối trang.","apps":"Ứng dụng","revoke_access":"Lấy lại quyền","undo_revoke_access":"Cấp lại quyền","api_approved":"Chấp thuận:","api_last_used_at":"Sử dụng lần cuối lúc:","theme":"Giao diện","save_to_change_theme":"Chủ đề sẽ được cập nhật sau khi bạn nhấp vào \"%{save_text}\"","home":"Trang chủ mặc định","staged":"Theo giai đoạn","staff_counters":{"flags_given":"cờ hữu ích","flagged_posts":"bài viết gắn cờ","deleted_posts":"bài viết bị xoá","suspensions":"đình chỉ","warnings_received":"cảnh báo","rejected_posts":"bài viết bị từ chối"},"messages":{"all":"Tất cả","inbox":"Hộp thư","sent":"Đã gửi","archive":"Lưu Trữ","groups":"Nhóm của tôi","bulk_select":"Chọn tin nhắn","move_to_inbox":"Chuyển sang hộp thư","move_to_archive":"Lưu trữ","failed_to_move":"Lỗi khi chuyển các tin nhắn đã chọn (có thể do lỗi mạng)","select_all":"Chọn tất cả","tags":"Thẻ"},"preferences_nav":{"account":"Tài khoản","security":"Bảo mật","profile":"Hồ sơ","emails":"Email","notifications":"Thông báo","categories":"Chuyên mục","users":"Người dùng","tags":"Thẻ","interface":"Giao diện","apps":"Ứng dụng"},"change_password":{"success":"(email đã gửi)","in_progress":"(đang gửi email)","error":"(lỗi)","emoji":"khóa biểu tượng cảm xúc","action":"Gửi lại mật khẩu tới email","set_password":"Nhập Mật khẩu","choose_new":"Chọn một mật khẩu mới","choose":"Chọn một mật khẩu"},"second_factor_backup":{"title":"Mã dự phòng đăng nhập hai yếu tố","regenerate":"Khởi tạo lại","disable":"Vô hiệu hóa","enable":"Kích hoạt","enable_long":"Bật backup codes","manage":{"other":"Quản lý mã dự phòng. Bạn còn lại \u003cstrong\u003e%{count}\u003c/strong\u003e mã dự phòng."},"copy_to_clipboard":"Sao chép vào clipboard","copy_to_clipboard_error":"Lỗi sao chép dữ liệu vào Clipboard","copied_to_clipboard":"Sao chép vào Clipboard","download_backup_codes":"Tải xuống mã dự phòng","remaining_codes":{"other":"Bạn còn lại \u003cstrong\u003e%{count}\u003c/strong\u003e mã dự phòng."},"use":"Sử dụng mã dự phòng","enable_prerequisites":"Bạn phải bật phương pháp hai yếu tố chính trước khi tạo mã dự phòng.","codes":{"title":"Đã tạo mã dự phòng","description":"Mỗi mã dự phòng này chỉ có thể được sử dụng một lần. Giữ chúng ở nơi an toàn nhưng dễ tiếp cận."}},"second_factor":{"title":"Xác thực hai yếu tố","enable":"Quản lý xác thực hai yếu tố","disable_all":"Vô hiệu hóa tất cả","forgot_password":"Quên mật khẩu?","confirm_password_description":"Làm ơn xác nhận mật khẩu để tiếp tục","name":"Tên","label":"Mã","rate_limit":"Vui lòng đợi trước khi thử mã xác thực khác.","enable_description":"Quét mã QR này trong một ứng dụng được hỗ trợ (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e - \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) và nhập mã xác thực của bạn.\n","disable_description":"Vui lòng nhập mã xác thực từ ứng dụng của bạn","show_key_description":"Nhập thủ công","short_description":"Bảo vệ tài khoản của bạn bằng mã bảo mật sử dụng một lần.\n","extended_description":"Xác thực hai yếu tố bổ sung thêm bảo mật cho tài khoản của bạn bằng cách yêu cầu mã thông báo một lần ngoài mật khẩu của bạn. Có thể tạo mã thông báo trên \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003ethiết bị Android\u003c/a\u003e và \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e.\n","oauth_enabled_warning":"Xin lưu ý rằng thông tin đăng nhập xã hội sẽ bị vô hiệu hóa sau khi xác thực hai yếu tố được bật trên tài khoản của bạn.","use":"Sử dụng ứng dụng Authenticator","enforced_notice":"Bạn được yêu cầu bật xác thực hai yếu tố trước khi truy cập trang web này.","disable":"Vô hiệu hóa","disable_confirm":"Bạn có chắc chắn muốn tắt tất cả các phương pháp hai yếu tố không?","save":"Lưu","edit":"Sửa","edit_title":"Chỉnh sửa Authenticator","edit_description":"Tên người xác thực","enable_security_key_description":"Khi bạn đã có bạn \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003ephần cứng chủ chốt an ninh\u003c/a\u003e chuẩn bị, nhấn nút Đăng ký dưới đây.\n","totp":{"title":"Trình xác thực dựa trên mã thông báo","add":"Thêm Authenticator","default_name":"Authenticator của bạn","name_and_code_required_error":"Bạn phải cung cấp tên và mã từ ứng dụng xác thực của mình."},"security_key":{"register":"Đăng ký","title":"Khóa bảo mật","add":"Thêm khóa bảo mật","default_name":"Khóa bảo mật chính","not_allowed_error":"Quá trình đăng ký khóa bảo mật đã hết thời gian chờ hoặc đã bị hủy.","already_added_error":"Bạn đã đăng ký khóa bảo mật này. Bạn không cần phải đăng ký lại.","edit":"Chỉnh sửa khóa bảo mật","save":"Lưu","edit_description":"Tên khóa bảo mật","name_required_error":"Bạn phải cung cấp tên cho khóa bảo mật của mình."}},"change_about":{"title":"Thay đổi thông tin về tôi","error":"Có lỗi xảy ra khi thay đổi giá trị này."},"change_username":{"title":"Thay Username","confirm":"Bạn có chắc chắn muốn thay đổi tên người dùng của mình không?","taken":"Xin lỗi, đã có username này.","invalid":"Username này không thích hợp. Nó chỉ chứa các ký tự là chữ cái và chữ số. "},"add_email":{"title":"Thêm Email","add":"thêm vào"},"change_email":{"title":"Thay đổi Email","taken":"Xin lỗi, email này không dùng được. ","error":"Có lỗi xảy ra khi thay đổi email của bạn. Có thể địa chỉ email đã được sử dụng ?","success":"Chúng tôi đã gửi email tới địa chỉ đó. Vui lòng làm theo chỉ dẫn để xác nhận lại.","success_via_admin":"Chúng tôi đã gửi một email đến địa chỉ đó. Người dùng sẽ cần làm theo hướng dẫn xác nhận trong email.","success_staff":"Chúng tôi đã gửi một email đến địa chỉ hiện tại của bạn. Vui lòng làm theo hướng dẫn xác nhận."},"change_avatar":{"title":"Đổi ảnh đại diện","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, dựa trên","gravatar_title":"Thay đổi hình đại diện của bạn trên trang web của %{gravatarName}","gravatar_failed":"Chúng tôi không thể tìm thấy số %{gravatarName} với địa chỉ email đó.","refresh_gravatar_title":"Làm mới %{gravatarName}của bạn","letter_based":"Hệ thống xác định ảnh đại diện","uploaded_avatar":"Chính sửa hình ảnh","uploaded_avatar_empty":"Thêm một ảnh chỉnh sửa","upload_title":"Upload hình ảnh của bạn","image_is_not_a_square":"Cảnh báo: chúng tôi đã cắt hình ảnh của bạn; chiều rộng và chiều cao không bằng nhau."},"change_profile_background":{"title":"Tiêu đề hồ sơ","instructions":"Tiêu đề hồ sơ sẽ được căn giữa và có chiều rộng mặc định là 1110px."},"change_card_background":{"title":"Hình nền Card","instructions":"Hình nền sẽ ở giữa và có chiều rộng mặc định là 590px."},"change_featured_topic":{"title":"Chủ đề nổi bật","instructions":"Một liên kết đến chủ đề này sẽ có trên thẻ người dùng và hồ sơ của bạn."},"email":{"title":"Email","primary":"Email chính","secondary":"Email thứ hai","primary_label":"chính","unconfirmed_label":"chưa được xác nhận","resend_label":"Gửi lại email xác nhận","resending_label":"đang gửi...","resent_label":"email đã gửi","update_email":"Thay đổi Email","set_primary":"Đặt email chính","destroy":"Xóa email","add_email":"Thêm email thay thế","no_secondary":"Không có email thứ hai","instructions":"Không hiển thị công cộng","admin_note":"Lưu ý: Quản trị viên thay đổi email của người không phải là quản trị viên tức là người dùng đã mất quyền truy cập vào tài khoản email ban đầu của họ, do đó, email đặt lại mật khẩu sẽ được gửi đến địa chỉ mới của họ. Email của người dùng sẽ không thay đổi cho đến khi họ hoàn tất quá trình đặt lại mật khẩu.","ok":"Chúng tôi sẽ gửi thư điện tử xác nhận đến cho bạn","required":"Vui lòng nhập một địa chỉ email","invalid":"Vùi lòng nhập một thư điện tử hợp lệ","authenticated":"Thư điện tử của bạn đã được xác nhận bởi %{provider}","frequency_immediately":"Chúng tôi sẽ gửi email cho bạn ngay lập tức nếu bạn đã chưa đọc những điều chúng tôi đã gửi cho bạn qua email.","frequency":{"other":"Chúng tôi sẽ chỉ gửi email cho bạn nếu chúng tôi đã không nhìn thấy bạn trong %{count} phút cuối."}},"associated_accounts":{"title":"Tài khoản liên kết","connect":"Kết nối","revoke":"Thu hồi","cancel":"Hủy","not_connected":"(không được kết nối)","confirm_modal_title":"Kết nối tài khoản %{provider}","confirm_description":{"account_specific":"%{provider} tài khoản '%{account_description}' của bạn sẽ được sử dụng để xác thực.","generic":"Tài khoản %{provider} của bạn sẽ được sử dụng để xác thực."}},"name":{"title":"Tên","instructions":"Tên đầy đủ của bạn (tuỳ chọn)","instructions_required":"Tên đầy đủ của bạn","required":"Vui lòng nhập tên","too_short":"Tên của bạn quá ngắn","ok":"Tên của bạn có vẻ ổn"},"username":{"title":"Username","instructions":"Duy nhất, không có khoảng trống, ngắn","short_instructions":"Mọi người có thể nhắc tới bạn bằng @%{username}","available":"Tên đăng nhập của bạn có sẵn","not_available":"Chưa có sẵn. Thử %{suggestion}?","not_available_no_suggestion":"Không sẵn có","too_short":"Tên đăng nhập của bạn quá ngắn","too_long":"Tên đăng nhập của bạn quá dài","checking":"Đang kiểm tra username sẵn sàng để sử dụng....","prefilled":"Thư điện tử trủng với tên đăng nhập này.","required":"Vui lòng nhập tên người dùng"},"locale":{"title":"Ngôn ngữ hiển thị","instructions":"Ngôn ngữ hiển thị sẽ thay đổi khi bạn tải lại trang","default":"(mặc định)","any":"bất kì"},"password_confirmation":{"title":"Nhập lại Password"},"invite_code":{"title":"Mã mời","instructions":"Đăng ký tài khoản yêu cầu mã mời"},"auth_tokens":{"title":"Thiết bị được sử dụng gần đây","details":"Chi tiết","log_out_all":"Đăng xuất khỏi tất cả","not_you":"Không phải bạn?","show_all":"Hiển thị tất cả %{count}","show_few":"Hiển thị ít hơn","was_this_you":"Đây có phải là bạn không?","was_this_you_description":"Nếu đó không phải là bạn, chúng tôi khuyên bạn nên thay đổi mật khẩu của mình và đăng xuất ở mọi nơi.","browser_and_device":"%{browser} trên %{device}","secure_account":"Bảo mật Tài khoản của tôi","latest_post":"Bài đăng cuối cùng của bạn...","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003ekích hoạt\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"Bài viết cuối cùng","last_emailed":"Đã email lần cuối","last_seen":"được thấy","created":"Đã tham gia","log_out":"Log Out","location":"Vị trí","website":"Web Site","email_settings":"Email","hide_profile_and_presence":"Ẩn hồ sơ công khai và các tính năng hiện diện của tôi","enable_physical_keyboard":"Bật hỗ trợ bàn phím vật lý trên iPad","text_size":{"title":"Cở chữ","smallest":"Nhỏ nhất","smaller":"Nhỏ","normal":"Bình thường","larger":"Lớn","largest":"Lớn nhất"},"title_count_mode":{"title":"Tiêu đề trang nền hiển thị số lượng:","notifications":"Thông báo mới","contextual":"Trang nội dung mới"},"like_notification_frequency":{"title":"Thông báo khi tôi like","always":"Luôn luôn","first_time_and_daily":"Lần đầu tiên bài viết được like và hàng ngày","first_time":"Lần đầu tiên bài viết được like","never":"Không"},"email_previous_replies":{"title":"Kèm theo các trả lời trước ở dưới cùng email","unless_emailed":"trừ khi đã gửi trước đó","always":"luôn luôn","never":"không"},"email_digests":{"title":"Khi tôi không truy cập vào đây, hãy gửi cho tôi email tóm tắt về các chủ đề phổ biến và câu trả lời","every_30_minutes":"mỗi 30 phút","every_hour":"hàng giờ","daily":"hàng ngày","weekly":"hàng tuần","every_month":"mỗi tháng","every_six_months":"mỗi sáu tháng"},"email_level":{"title":"Gửi cho tôi một email khi có người trích dẫn, trả lời cho bài viết của tôi, đề cập đến @username của tôi, hoặc mời tôi đến một chủ đề","always":"luôn luôn","only_when_away":"chỉ khi rời xa","never":"không bao giờ"},"email_messages_level":"Gửi cho tôi email khi có ai đó nhắn tin cho tôi","include_tl0_in_digests":"Bao gồm nội dung của những thành viên mới trong email tóm tắt.","email_in_reply_to":"Kèm theo đoạn dẫn trích trả lời bài viết trong email","other_settings":"Khác","categories_settings":"Chuyên mục","new_topic_duration":{"label":"Để ý tới chủ đề mới khi","not_viewed":"Tôi chưa từng xem họ","last_here":"tạo ra kể từ lần cuối tôi ở đây","after_1_day":"được tạo ngày hôm qua","after_2_days":"được tạo 2 ngày trước","after_1_week":"được tạo tuần trước","after_2_weeks":"được tạo 2 tuần trước"},"auto_track_topics":"Tự động theo dõi các chủ đề tôi tạo","auto_track_options":{"never":"không bao giờ","immediately":"ngay lập tức","after_30_seconds":"sau 30 giây","after_1_minute":"sau 1 phút","after_2_minutes":"sau 2 phút","after_3_minutes":"sau 3 phút","after_4_minutes":"sau 4 phút","after_5_minutes":"sau 5 phút","after_10_minutes":"sau 10 phút"},"notification_level_when_replying":"Khi tôi đăng một chủ đề, hãy đặt chủ đề đó thành","invited":{"title":"Lời mời","pending_tab":"Đang treo","pending_tab_with_count":"Đang xử lý (%{count})","redeemed_tab":"Làm lại","redeemed_tab_with_count":"Làm lại (%{count})","invited_via":"Lời mời","groups":"Nhóm","topic":"Chủ đề","expires_at":"Hết hạn","edit":"Sửa","remove":"Xoá","reinvited":"Gửi lại lời mời","search":"gõ để tìm kiếm thư mời ","user":"User được mời","none":"Không tìm thấy lời mời nào.","truncated":{"other":"Hiện %{count} thư mời đầu tiên"},"redeemed":"Lời mời bù lại","redeemed_at":"Nhận giải","pending":"Lời mời tạm hoãn","topics_entered":"Bài viết được xem ","posts_read_count":"Đọc bài viết","expired":"Thư mời này đã hết hạn.","remove_all":"Xóa lời mời đã hết hạn","removed_all":"Tất cả lời mời đã hết hạn đã bị xóa!","remove_all_confirm":"Bạn có chắc chắn muốn xóa tất cả các lời mời đã hết hạn không?","reinvite_all_confirm":"Bạn có chắc chắn gửi lại tất cả các lời mời?","time_read":"Đọc thời gian","days_visited":"Số ngày đã thăm","account_age_days":"Thời gian của tài khoản theo ngày","create":"Mời","generate_link":"Tạo liên kết mời","link_generated":"Đây là liên kết mời của bạn!","valid_for":"Link mời chỉ có hiệu lực với địa chỉ email: %{email}","single_user":"Mời qua email","multiple_user":"Mời bằng liên kết","invite_link":{"title":"Liên kết mời","success":"Link mời đã được tạo thành công !","error":"Đã xảy ra lỗi khi tạo liên kết Mời","max_redemptions_allowed_label":"Có bao nhiêu người được phép đăng ký bằng cách sử dụng liên kết này?","expires_at":"Khi nào thì liên kết mời này hết hạn?"},"invite":{"send_invite_email":"Lưu và Gửi Email","save_invite":"Lưu lời mời","invite_saved":"Đã lưu lời mời."},"bulk_invite":{"none":"Không có lời mời để hiển thị trên trang này.","text":"Mời hàng loạt","error":"Xin lỗi, file phải ở định dạng CSV."}},"password":{"title":"Mật khẩu","too_short":"Mật khẩu của bạn quá ngắn.","common":"Mật khẩu quá đơn giản, rất dễ bị đoán ra","same_as_username":"Mật khẩu của bạn trùng với tên đăng nhập.","same_as_email":"Mật khẩu của bạn trùng với email của bạn.","ok":"Mật khẩu của bạn có vẻ ổn.","instructions":"ít nhất %{count} kí tự","required":"Vui lòng nhập mật khẩu"},"summary":{"title":"Tóm tắt","stats":"Thống kê","time_read":"thời gian đọc","recent_time_read":"đã đọc gần đây","topic_count":{"other":"Chủ đề đã được tạo"},"post_count":{"other":"Bài viết đã được tạo"},"likes_given":{"other":"nhận"},"likes_received":{"other":"Đã nhận"},"days_visited":{"other":"Ngày đã ghé thăm"},"topics_entered":{"other":"chủ đề đã xem"},"posts_read":{"other":"Bài viết đã đọc"},"bookmark_count":{"other":"Dấu trang"},"top_replies":"Top trả lời","no_replies":"Chưa có trả lời.","more_replies":"Thêm trả lời","top_topics":"Top chủ đề","no_topics":"Chưa có chủ đề nào.","more_topics":"Thêm chủ đề","top_badges":"Top huy hiệu","no_badges":"Chưa có huy hiệu nào.","more_badges":"Thêm huy hiệu","top_links":"Liên kết đầu","no_links":"Không có liên kết","most_liked_by":"Được thích nhiều nhất bởi","most_liked_users":"Like nhiều nhất","most_replied_to_users":"Trả lời nhiều nhất","no_likes":"Chưa có lượt thích.","top_categories":"Danh mục hàng đầu","topics":"Chủ đề","replies":"Trả lời"},"ip_address":{"title":"Địa chỉ IP cuối cùng"},"registration_ip_address":{"title":"Địa chỉ IP đăng ký"},"avatar":{"title":"Ảnh đại diện","header_title":"hồ sơ cá nhân, tin nhắn, đánh dấu và sở thích"},"title":{"title":"Tiêu đề","none":"(không có gì)"},"primary_group":{"title":"Nhóm Chính","none":"(không có gì)"},"filters":{"all":"All"},"stream":{"posted_by":"Đăng bởi","sent_by":"Gửi bởi","private_message":"tin nhắn","the_topic":"chủ đề"},"date_of_birth":{"user_title":"Hôm nay là sinh nhật của bạn! ","title":"Hôm nay là sinh nhật của tôi!","label":"Ngày sinh nhật"},"anniversary":{"user_title":"Hôm nay là ngày kỷ niệm bạn gia nhập cộng đồng của chúng tôi!","title":"Hôm nay là ngày kỷ niệm tôi gia nhập cộng đồng này!"}},"loading":"Đang tải...","errors":{"prev_page":"trong khi cố gắng để tải","reasons":{"network":"Mạng Internet bị lỗi","server":"Máy chủ đang có vấn đề","forbidden":"Bạn không thể xem được","unknown":"Lỗi","not_found":"Không Tìm Thấy Trang"},"desc":{"network":"Hãy kiểm tra kết nối của bạn","network_fixed":"Hình như nó trở lại.","server":"Mã lỗi : %{status}","forbidden":"Bạn không được cho phép để xem mục này","not_found":"Oops, ứng dụng đang tải đường dẫn không tồn tại","unknown":"Có một lỗi gì đó đang xảy ra"},"buttons":{"back":"Quay trở lại","again":"Thử lại","fixed":"Load lại trang"}},"modal":{"close":"đóng","dismiss_error":"Loại bỏ lỗi"},"close":"Đóng lại","logout":"Bạn đã đăng xuất","refresh":"Tải lại","home":"Trang chủ","read_only_mode":{"enabled":"Website đang ở chế độ chỉ đọc, bạn có thể duyệt xem nhưng không thể trả lời, likes, hay thực hiện các hành động khác.","login_disabled":"Chức năng Đăng nhập đã bị tắt khi website trong trạng thái chỉ đọc","logout_disabled":"Chức năng đăng xuất đã bị tắt khi website đang trong trạng thái chỉ đọc."},"logs_error_rate_notice":{},"learn_more":"tìm hiểu thêm...","first_post":"Bài viết đầu tiên","mute":"Im lặng","unmute":"Bỏ im lặng","last_post":"Được gửi","local_time":"Giờ địa phương","time_read":"Đã đọc","time_read_recently":"%{time_read} gần đây","time_read_tooltip":"Tổng thời gian đọc là %{time_read}","time_read_recently_tooltip":"Tổng thời gian đọc là %{time_read} (%{recent_time_read} trong 60 ngày qua)","last_reply_lowercase":"trả lời cuối cùng","replies_lowercase":{"other":"trả lời"},"signup_cta":{"sign_up":"Đăng ký","hide_session":"Nhắc vào ngày mai","hide_forever":"không, cảm ơn","intro":"Xin chào! Có vẻ như bạn đang thích cuộc thảo luận, nhưng bạn chưa đăng ký tài khoản.","value_prop":"Khi bạn tạo tài khoản, chúng tôi nhớ chính xác những gì bạn đã đọc, vì vậy bạn luôn quay lại ngay nơi bạn đã dừng lại. Bạn cũng nhận được thông báo, tại đây và qua email, bất cứ khi nào ai đó trả lời bạn. Và bạn có thể thích bài viết để chia sẻ. :heartpulse:"},"summary":{"enabled_description":"Bạn đang xem một bản tóm tắt của chủ đề này: các bài viết thú vị nhất được xác định bởi cộng đồng.","description":{"other":"Có \u003cb\u003e%{count}\u003c/b\u003e trả lời."},"enable":"Tóm tắt lại chủ đề","disable":"HIển thị tất cả các bài viết"},"deleted_filter":{"enabled_description":"Chủ để này có chứa các bài viết bị xoá, chúng đã bị ẩn đi","disabled_description":"Xoá các bài viết trong các chủ để được hiển thị","enable":"Ẩn các bài viết bị xoá","disable":"Xem các bài viết bị xoá"},"private_message_info":{"title":"Tin nhắn","invite":"Mời những người khác ...","edit":"Thêm hoặc loại bỏ...","remove":"Xóa...","add":"Thêm...","leave_message":"Bạn có thực sự muốn để lại tin nhắn này không?","remove_allowed_user":"Bạn thực sự muốn xóa %{name} từ tin nhắn này?","remove_allowed_group":"Bạn thực sự muốn xóa %{name} từ tin nhắn này?"},"email":"Email","username":"Username","last_seen":"Đã xem","created":"Tạo bởi","created_lowercase":"ngày tạo","trust_level":"Độ tin tưởng","search_hint":"username, email or IP address","create_account":{"header_title":"Chào mừng!","disclaimer":"Bằng cách đăng ký, bạn đồng ý với \u003ca href='%{privacy_link}' target='blank'\u003echính sách bảo mật\u003c/a\u003e và \u003ca href='%{tos_link}' target='blank'\u003eđiều khoản dịch vụ\u003c/a\u003e.","failed":"Có gì đó không đúng, có thể email này đã được đăng ký, thử liên kết quên mật khẩu"},"forgot_password":{"title":"Đặt lại mật khẩu","action":"Tôi đã quên mật khẩu của tôi","invite":"Điền vào username của bạn hoặc địa chỉ email và chúng tôi sẽ gửi bạn email để khởi tạo lại mật khẩu","reset":"Tạo lại mật khẩu","complete_username":"Nếu một tài khoản phù hợp với tên thành viên \u003cb\u003e%{username} \u003c/b\u003e, bạn sẽ nhận được một email với hướng dẫn về cách đặt lại mật khẩu của bạn trong thời gian ngắn.","complete_email":"Nếu một trận đấu tài khoản \u003cb\u003e%{email} \u003c/b\u003e, bạn sẽ nhận được một email với hướng dẫn về cách đặt lại mật khẩu của bạn trong thời gian ngắn.","complete_username_found":"Chúng tôi đã tìm thấy một tài khoản khớp với tên người dùng \u003cb\u003e%{username}\u003c/b\u003e. Bạn sẽ sớm nhận được email hướng dẫn về cách đặt lại mật khẩu của mình.","complete_email_found":"Chúng tôi đã tìm thấy một tài khoản khớp với \u003cb\u003e%{email}\u003c/b\u003e. Bạn sẽ sớm nhận được email hướng dẫn về cách đặt lại mật khẩu của mình.","complete_username_not_found":"Không có tài khoản phù hợp với tên thành viên \u003cb\u003e%{username} \u003c/b\u003e","complete_email_not_found":"Không tìm thấy tài khoản nào tương ứng với \u003cb\u003e%{email}\u003c/b\u003e","help":"Email không đến? Hãy chắc chắn kiểm tra thư mục thư rác của bạn trước.\u003cp\u003eKhông chắc bạn đã sử dụng địa chỉ email nào? Nhập địa chỉ email và chúng tôi sẽ cho bạn biết nếu địa chỉ đó tồn tại ở đây.\u003c/p\u003e\u003cp\u003eNếu bạn không còn quyền truy cập vào địa chỉ email trên tài khoản của mình, vui lòng liên hệ với \u003ca href='%{basePath}/about'\u003enhân viên hữu ích của chúng tôi.\u003c/a\u003e\u003c/p\u003e","button_ok":"OK","button_help":"Giúp "},"email_login":{"link_label":"Gửi liên kết đăng nhập qua email","button_label":"với email","emoji":"khóa biểu tượng cảm xúc","complete_username":"Nếu một tài khoản khớp với tên người dùng \u003cb\u003e%{username}\u003c/b\u003e, bạn sẽ sớm nhận được email có liên kết đăng nhập.","complete_email":"Nếu một tài khoản phù hợp với \u003cb\u003e%{email}\u003c/b\u003e, bạn sẽ sớm nhận được email có liên kết đăng nhập.","complete_username_found":"Chúng tôi đã tìm thấy một tài khoản phù hợp với tên người dùng \u003cb\u003e%{username}\u003c/b\u003e, bạn sẽ sớm nhận được email có liên kết đăng nhập.","complete_email_found":"Chúng tôi đã tìm thấy một tài khoản phù hợp với \u003cb\u003e%{email}\u003c/b\u003e, bạn sẽ sớm nhận được email có liên kết đăng nhập.","complete_username_not_found":"Không có tài khoản phù hợp với tên thành viên \u003cb\u003e%{username} \u003c/b\u003e","complete_email_not_found":"Không tìm thấy tài khoản nào tương ứng với \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Tiếp tục tới %{site_name}","logging_in_as":"Đăng nhập bằng %{email}","confirm_button":"Kết thúc đăng nhập"},"login":{"username":"Thành viên","password":"Mật khẩu","second_factor_title":"Xác thực hai yếu tố","second_factor_description":"Vui lòng nhập mã xác minh từ ứng dụng của bạn:","second_factor_backup":"Đăng nhập bằng mã dự phòng","second_factor_backup_title":"Sao lưu hai yếu tố","second_factor_backup_description":"Vui lòng nhập một trong các mã dự phòng của bạn:","second_factor":"Đăng nhập bằng ứng dụng Authenticator","security_key_description":"Khi bạn đã chuẩn bị khóa bảo mật vật lý, hãy nhấn nút Xác thực bằng Khóa bảo mật bên dưới.","security_key_alternative":"Thử lại cách khác","security_key_authenticate":"Xác thực bằng Khóa bảo mật","security_key_not_allowed_error":"Quá trình xác thực khóa bảo mật đã hết thời gian chờ hoặc đã bị hủy.","security_key_no_matching_credential_error":"Không thể tìm thấy thông tin xác thực phù hợp trong khóa bảo mật được cung cấp.","security_key_support_missing_error":"Thiết bị hoặc trình duyệt hiện tại của bạn không hỗ trợ việc sử dụng khóa bảo mật. Vui lòng sử dụng một phương pháp khác.","caps_lock_warning":"Phím Caps Lock đang được bật","error":"Không xác định được lỗi","cookies_error":"Trình duyệt của bạn dường như đã tắt cookie. Bạn có thể không đăng nhập được nếu không bật chúng trước.","rate_limit":"Xin đợi trước khi đăng nhập lại lần nữa.","blank_username":"Nhập địa chỉ email và tên người dùng của bạn.","blank_username_or_password":"Bạn phải nhập email hoặc username, và mật khẩu","reset_password":"Khởi tạo mật khẩu","logging_in":"Đăng nhập...","or":"Hoặc","authenticating":"Đang xác thực...","awaiting_activation":"Tài khoản của bạn đang đợi kích hoạt, sử dụng liên kết quên mật khẩu trong trường hợp kích hoạt ở 1 email khác.","awaiting_approval":"Tài khoản của bạn chưa được chấp nhận bới thành viên. Bạn sẽ được gửi một email khi được chấp thuận ","requires_invite":"Xin lỗi, bạn phải được mời để tham gia diễn đàn","not_activated":"Bạn không thể đăng nhập. Chúng tôi đã gửi trước email kích hoạt cho bạn tại \u003cb\u003e%{sentTo}\u003c/b\u003e. Vui lòng làm theo hướng dẫn trong email để kích hoạt tài khoản của bạn.","not_allowed_from_ip_address":"Bạn không thể đăng nhập từ địa chỉ IP này.","admin_not_allowed_from_ip_address":"Bạn không thể đăng nhập với quyền quản trị từ địa chỉ IP đó.","resend_activation_email":"Bấm đây để gửi lại email kích hoạt","omniauth_disallow_totp":"Tài khoản của bạn đã bật xác thực hai yếu tố. Vui lòng đăng nhập bằng mật khẩu của bạn.","resend_title":"Gửi lại email kích hoạt","change_email":"Đổi địa chỉ email","provide_new_email":"Cung cấp địa chỉ mới của bạn và chúng tôi sẽ gửi lại email xác nhận.","submit_new_email":"Cập nhật địa chỉ email","sent_activation_email_again":"Chúng tôi gửi email kích hoạt tới cho bạn ở \u003cb\u003e%{currentEmail}\u003c/b\u003e. Nó sẽ mất vài phút để đến; bạn nhớ check cả hồm thư spam nhe. ","sent_activation_email_again_generic":"Chúng tôi đã gửi một email kích hoạt khác. Có thể mất vài phút để nó đến nơi; hãy chắc chắn để kiểm tra thư mục thư rác của bạn.","to_continue":"Vui lòng đăng nhập","preferences":"Bạn cần phải đăng nhập để thay đổi cài đặt tài khoản.","not_approved":"Tài khoản của bạn chưa được kiểm duyệt. Bạn sẽ nhận được email thông báo khi bạn được phép đăng nhập.","google_oauth2":{"name":"Goole","title":"với Google"},"twitter":{"name":"Twitter","title":"với Twitter"},"instagram":{"name":"Instagram","title":"với Instagram"},"facebook":{"name":"Facebook","title":"với Facebook"},"github":{"name":"GitHub","title":"với GitHub"},"discord":{"name":"Discord","title":"với Discord"},"second_factor_toggle":{"totp":"Sử dụng ứng dụng xác thực thay thế","backup_code":"Sử dụng mã dự phòng để thay thế"}},"invites":{"accept_title":"Lời mời","emoji":"biểu tượng cảm xúc phong bì","welcome_to":"Chào mừng bạn đến với %{site_name}!","invited_by":"Bạn đã được mời bởi:","social_login_available":"Bạn cũng có thể đăng nhập bằng bất kỳ thông tin đăng nhập xã hội nào bằng email đó.","your_email":"Địa chỉ email của bạn là \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Chấp nhận lời mời","success":"Tài khoản của bạn đã được tạo và bây giờ bạn đã đăng nhập.","name_label":"T","password_label":"Mật khẩu","optional_description":"(tùy chọn)"},"password_reset":{"continue":"Tiếp tục truy cập %{site_name}"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Chỉ chuyên mục","categories_with_featured_topics":"Các chuyên mục và chủ đề nổi bật","categories_and_latest_topics":"Các chuyên mục và chủ đề mới","categories_and_top_topics":"Chuyên mục và Chủ đề nổi bật","categories_boxes":"Hộp có Danh mục con","categories_boxes_with_topics":"Hộp có Chủ đề Nổi bật"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Nhập"},"conditional_loading_section":{"loading":"Đang tải..."},"category_row":{"topic_count":{"other":"%{count} chủ đề trong danh mục này"},"plus_subcategories_title":{"other":"%{name} và %{count} danh mục phụ"},"plus_subcategories":{"other":"+ %{count} danh mục phụ"}},"select_kit":{"default_header_text":"Chọn...","no_content":"Không tìm thấy","filter_placeholder":"Tìm kiến...","filter_placeholder_with_any":"Tìm kiếm hoặc tạo mới...","create":"Tạo mới: '%{content}'","max_content_reached":{"other":"Bạn chỉ có thể chọn %{count} mục."},"min_content_not_reached":{"other":"Chọn ít nhất %{count} mục."},"invalid_selection_length":{"other":"Lựa chọn phải có ít nhất %{count} ký tự."},"components":{"categories_admin_dropdown":{"title":"Quản lý Danh mục"}}},"date_time_picker":{"from":"Từ","to":"Tới"},"emoji_picker":{"filter_placeholder":"Tìm kiếm emoji","smileys_\u0026_emotion":"Biểu tượng mặt cười và cảm xúc","people_\u0026_body":"Con người và Cơ thể","animals_\u0026_nature":"Động vật và thiên nhiên","food_\u0026_drink":"Đồ ăn thức uống","travel_\u0026_places":"Du lịch và Địa điểm","activities":"Hoạt động","objects":"Vật th","symbols":"Ký hiệu","flags":"Dấu cờ - Flags","recent":"Được sử dụng gần đây","default_tone":"Không có màu da","light_tone":"Màu da sáng","medium_light_tone":"Màu da sáng trung bình","medium_tone":"Màu da trung bình","medium_dark_tone":"Màu da tối trung bình","dark_tone":"Màu da tối","default":"Biểu tượng cảm xúc tùy chỉnh"},"shared_drafts":{"title":"Thư nháp được Chia sẻ","destination_category":"Loại điểm đến","publish":"Xuất bản bản nháp","confirm_publish":"Bạn có chắc chắn muốn xuất bản bản nháp này không?","publishing":"Đang xuất bản Chủ đề..."},"composer":{"emoji":"Emoji :)","more_emoji":"thêm...","options":"Lựa chọn","whisper":"nói chuyện","unlist":"chưa được liệt kê","add_warning":"Đây là một cảnh báo chính thức","toggle_whisper":"Chuyển chế độ Nói chuyện","toggle_unlisted":"Chuyển sang chế độ Không công khai","posting_not_on_topic":"Bài viết nào bạn muốn trả lời ","saved_local_draft_tip":"Đã lưu locally","similar_topics":"Bài viết của bạn tương tự với ","drafts_offline":"Nháp offline","edit_conflict":"chỉnh sửa xung đột","group_mentioned_limit":{"other":"\u003cb\u003eCảnh báo!\u003c/b\u003e Bạn đã đề cập \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, tuy nhiên nhóm này có nhiều thành viên hơn giới hạn đề cập của quản trị viên là %{count} người dùng. Không ai sẽ được thông báo."},"group_mentioned":{"other":"Bằng cách đề cập đến số %{group}, bạn sắp thông báo cho \u003ca href='%{group_link}'\u003e%{count} người\u003c/a\u003e - bạn có chắc không?"},"cannot_see_mention":{"category":"Bạn đã đề cập đến %{username} nhưng họ sẽ không được thông báo vì họ không có quyền truy cập vào danh mục này. Bạn sẽ cần thêm họ vào một nhóm có quyền truy cập vào danh mục này.","private":"Bạn đã đề cập đến %{username} nhưng họ sẽ không được thông báo vì họ không thể xem tin nhắn cá nhân này. Bạn sẽ cần phải mời họ đến tin nhắn này."},"duplicate_link":"Có vẻ như liên kết của bạn đến \u003cb\u003e%{domain}\u003c/b\u003e đã được đăng trong chủ đề bởi \u003cb\u003e@%{username}\u003c/b\u003e in \u003ca href='%{post_url}'\u003emột câu trả lời trên %{ago}\u003c/a\u003e - bạn có chắc chắn muốn đăng lại không?","reference_topic_title":"Trả lời đến: %{title}","error":{"title_missing":"Tiêu đề là bắt buộc","title_too_short":{"other":"Tiêu để phải có ít nhất %{count} ký tự"},"title_too_long":{"other":"Tiêu đề có tối đa %{count} ký tự"},"post_missing":"Bài đăng không được để trống","post_length":{"other":"Bài viết phải có ít nhất %{count} ký tự"},"try_like":"Bạn đã thử nút %{heart} chưa?","category_missing":"Bạn phải chọn một phân loại","tags_missing":{"other":"Bạn phải chọn ít nhất %{count} thẻ"},"topic_template_not_modified":"Vui lòng thêm chi tiết và cụ thể cho chủ đề của bạn bằng cách chỉnh sửa mẫu chủ đề."},"save_edit":"Lưu chỉnh sửa","overwrite_edit":"Ghi đè Chỉnh sửa","reply_original":"Trả lời cho bài viết gốc","reply_here":"Trả lời đây ","reply":"Trả lời ","cancel":"Huỷ","create_topic":"Tạo chủ đề","create_pm":"Tin nhắn","create_whisper":"Thì thầm","create_shared_draft":"Tạo bản nháp được chia sẻ","edit_shared_draft":"Chỉnh sửa Bản nháp","title":"Hoặc nhất Ctrl+Enter","users_placeholder":"Thêm thành viên ","title_placeholder":"Tóm tắt lại thảo luận này trong một câu ngắn gọn","title_or_link_placeholder":"Nhập tiêu đề, hoặc dán đường dẫn vào đây","edit_reason_placeholder":"Tại sao bạn sửa","topic_featured_link_placeholder":"Nhập liên kết hiển thị với tiêu đề.","remove_featured_link":"Xóa liên kết khỏi chủ đề.","reply_placeholder":"Gõ ở đây. Sử dụng Markdown, BBCode, hoặc HTML để định dạng. Kéo hoặc dán ảnh.","reply_placeholder_no_images":"Nhập ở đây. Sử dụng Markdown, BBCode hoặc HTML để định dạng.","reply_placeholder_choose_category":"Chọn một danh mục trước khi nhập vào đây.","view_new_post":"Xem bài đăng mới của bạn. ","saving":"Đang lưu","saved":"Đã lưu","saved_draft":"Đang đăng bản nháp. Nhấn để tiếp tục.","uploading":"Đang đăng ","quote_post_title":"Trích dẫn cả bài viết","bold_label":"B","bold_title":"In đậm","bold_text":"chữ in đậm","italic_label":"I","italic_title":"Nhấn mạnh","italic_text":"văn bản nhấn mạnh","link_title":"Liên kết","link_description":"Nhập mô tả liên kết ở đây","link_dialog_title":"Chèn liên kết","link_optional_text":"tiêu đề tùy chọn","link_url_placeholder":"Dán URL hoặc nhập vào chủ đề tìm kiếm","blockquote_title":"Blockquote","blockquote_text":"Trích dẫn","code_title":"Văn bản định dạng trước","code_text":"lùi đầu dòng bằng 4 dấu cách","paste_code_text":"gõ hoặc dẫn code vào đây","upload_title":"Tải lên","upload_description":"Nhập mô tả tải lên ở đây","olist_title":"Danh sách kiểu số","ulist_title":"Danh sách kiểu ký hiệu","list_item":"Danh sách các mục","toggle_direction":"Chuyển đổi hướng","help":"Trợ giúp soạn thảo bằng Markdown","collapse":"thu nhỏ bảng điều khiển chỉnh sửa nội dung","open":"mở bảng chỉnh sửa nội dung","abandon":"đóng nội dung chỉnh sửa và hủy bản nháp","enter_fullscreen":"Soạn nôi dung toàn màn hình","exit_fullscreen":"thoát khỏi trình soạn nội dung toàn màn hình","show_toolbar":"hiển thị thanh công cụ của trình soạn nội dung","hide_toolbar":"ẩn thanh công cụ của trình soạn nội dung","modal_ok":"OK","modal_cancel":"Hủy","cant_send_pm":"Xin lỗi, bạn không thể gởi tin nhắn đến %{username}.","yourself_confirm":{"title":"Bạn có quên chưa thêm người nhận?","body":"Ngay bây giờ tin nhắn này chỉ được gửi cho chính bạn!"},"admin_options_title":"Tùy chọn quản trị viên cho chủ đề này","composer_actions":{"reply":"Trả lời","draft":"Bản nháp","edit":"Sửa","reply_to_post":{"label":"Trả lời bài đăng của %{postUsername}","desc":"Trả lời một bài đăng cụ thể"},"reply_as_new_topic":{"label":"Trả lời dưới dạng chủ đề được liên kết","desc":"Tạo một chủ đề mới được liên kết với chủ đề này","confirm":"Bạn đã lưu một bản nháp chủ đề mới, bản nháp này sẽ bị ghi đè nếu bạn tạo một chủ đề được liên kết."},"reply_as_new_group_message":{"label":"Trả lời dưới dạng tin nhắn nhóm mới","desc":"Tạo một tin nhắn riêng mới với cùng những người nhận"},"reply_as_private_message":{"label":"Tin nhắn mới","desc":"Tạo một tin nhắn cá nhân mới"},"reply_to_topic":{"label":"Trả lời chủ đề","desc":"Trả lời chủ đề, không ảnh hưởng bất kỳ bài đăng nào"},"toggle_whisper":{"label":"Chuyển đổi nói thầm","desc":"Những lời thì thầm chỉ hiển thị với MOD"},"create_topic":{"label":"Chủ đề Mới"},"shared_draft":{"label":"Bản nháp được Chia sẻ","desc":"Nháp một chủ đề sẽ chỉ hiển thị cho người dùng được phép"},"toggle_topic_bump":{"label":"Chuyển đổi phần mở rộng chủ đề","desc":"Trả lời mà không thay đổi ngày trả lời gần nhất"}},"reload":"Nạp lại","ignore":"Bỏ qua","details_title":"Tóm tắt","details_text":"Văn bản này sẽ bị ẩn"},"notifications":{"tooltip":{"regular":{"other":"%{count} thông báo chưa xem"},"message":{"other":"%{count} tin nhắn chưa đọc"},"high_priority":{"other":"%{count} thông báo ưu tiên cao chưa đọc"}},"title":"thông báo của @name nhắc đến, trả lời bài của bạn và chủ đề, tin nhắn, vv","none":"Không thể tải các thông báo tại thời điểm này.","empty":"Không có thông báo","post_approved":"Bài đăng của bạn đã được phê duyệt","reviewable_items":"các mục yêu cầu kiểm duyệt","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} và %{count} người khác\u003c/span\u003e %{description}"},"liked_consolidated_description":{"other":"đã thích %{count} bài viết của bạn"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e%{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e đã chấp nhận lời mời của bạn","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e đã chuyển %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Đã nhận được '%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eChủ đề mới\u003c/span\u003e %{description}","membership_request_accepted":"Thành viên được chấp nhận vào '%{group_name}'","membership_request_consolidated":{"other":"%{count} yêu cầu làm thành viên cho '%{group_name}'"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - hoàn thành","group_message_summary":{"other":"%{count} thư trong %{group_name} hộp thư đến của bạn"},"popup":{"mentioned":"%{username} nhắc đến bạn trong \"%{topic}\" - %{site_title}","group_mentioned":"%{username} nhắc đến bạn trong \"%{topic}\" - %{site_title}","quoted":"%{username} trích lời bạn trong \"%{topic}\" - %{site_title}","replied":"%{username} trả lời cho bạn trong \"%{topic}\" - %{site_title}","posted":"%{username} gửi bài trong \"%{topic}\" - %{site_title}","private_message":"%{username} đã gửi cho bạn một tin nhắn cá nhân trong \"%{topic}\" - %{site_title}","linked":"%{username} liên quan đến bài viết của bạn từ \"%{topic}\" - %{site_title}","watching_first_post":"%{username} đã tạo một chủ đề mới \"%{topic}\" - %{site_title}","confirm_title":"Đã bật thông báo - %{site_title}","confirm_body":"Sự thành công! Thông báo đã được kích hoạt.","custom":"Thông báo từ %{username} trên %{site_title}"},"titles":{"mentioned":"đề cập","replied":"câu trả lời mới","quoted":"trích dẫn","edited":"đã chỉnh sửa","liked":"lượt thích mới","private_message":"tin nhắn riêng mới","invited_to_private_message":"được mời vào tin nhắn riêng tư","invitee_accepted":"lời mời được chấp nhận","posted":"bài viết mới","moved_post":"bài đã chuyển","linked":"liên kết","bookmark_reminder":"dấu trang nhắc nhở","bookmark_reminder_with_name":"nhắc nhở đánh dấu - %{name}","granted_badge":"cấp huy hiệu","invited_to_topic":"được mời vào chủ đề","group_mentioned":"nhóm đã đề cập","group_message_summary":"tin nhắn nhóm mới","watching_first_post":"chủ đề mới","topic_reminder":"nhắc nhở chủ đề","liked_consolidated":"lượt thích mới","post_approved":"bài đăng được chấp thuận","membership_request_consolidated":"yêu cầu thành viên mới","reaction":"phản ứng mới","votes_released":"Phiếu bầu đã được phát hành"}},"upload_selector":{"title":"Thêm một ảnh","title_with_attachments":"Thêm một ảnh hoặc tệp tin","from_my_computer":"Từ thiết bị của tôi","from_the_web":"Từ Web","remote_tip":"đường dẫn tới hình ảnh","local_tip":"chọn hình từ thiết bị của bạn","hint_for_supported_browsers":"bạn có thể kéo và thả ảnh vào trình soan thảo này","uploading":"Đang tải lên","select_file":"Chọn Tài liệu","default_image_alt_text":"hình ảnh"},"search":{"sort_by":"Sắp xếp theo","relevance":"Độ phù hợp","latest_post":"Bài viết mới nhất","latest_topic":"Chủ đề mới","most_viewed":"Xem nhiều nhất","most_liked":"Thích nhiều nhất","select_all":"Chọn tất cả","clear_all":"Xóa tất cả","too_short":"Từ khoá tìm kiếm của bạn quá ngắn.","result_count":{"other":"Hơn \u003cspan\u003e%{count}%{plus} kết quả cho\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"tìm kiếm chủ đề, bài viết, tài khoản hoặc các danh mục","full_page_title":"tìm kiếm chủ đề hoặc bài đăng","no_results":"Không tìm thấy kết quả.","no_more_results":"Không tìm thấy kết quả","post_format":"#%{post_number} bởi %{username}","results_page":"Kết quả tìm kiếm cho '%{term}'","more_results":"Có nhiều kết quả hơn. Vui lòng thu hẹp tiêu chí tìm kiếm của bạn.","cant_find":"Không thể tìm thấy những gì bạn đang tìm kiếm?","start_new_topic":"Có lẽ bắt đầu một chủ đề mới?","or_search_google":"Hoặc thử tìm kiếm bằng Google thay thế:","search_google":"Hãy thử tìm kiếm bằng Google để thay thế:","search_google_button":"G","search_button":"Tìm kiếm","context":{"user":"Tìm bài viết của @%{username}","category":"Tìm kiếm danh mục #%{category}","tag":"Tìm kiếm thẻ #%{tag}","topic":"Tìm trong chủ đề này","private_messages":"Tìm tin nhắn"},"advanced":{"title":"Tìm kiếm nâng cao","posted_by":{"label":"Gửi bởi"},"in_category":{"label":"Đã phân loại"},"in_group":{"label":"Trong nhóm"},"with_badge":{"label":"Với huy hiệu"},"with_tags":{"label":"Được gắn thẻ"},"filters":{"label":"Chỉ trả lại chủ đề/bài đăng ...","title":"Chỉ khớp với tiêu đề","likes":"Tôi đã thích","posted":"Tôi đã gửi trong","created":"Tôi đã tạo ra","watching":"tôi đang xem","tracking":"Tôi đang theo dõi","private":"Trong tin nhắn của tôi","bookmarks":"Tôi đã đánh dấu","first":"là bài đầu tiên","pinned":"được gim","seen":"tôi đọc","unseen":"Tôi chưa đọc","wiki":"là wiki","images":"bao gồm (các) hình ảnh","all_tags":"Tất cả các thẻ trên"},"statuses":{"label":"Nơi chủ đề","open":"mở","closed":"bị đóng","public":"là công khai","archived":"được lưu trữ","noreplies":"không có phản hồi","single_user":"chứa một người dùng"},"post":{"count":{"label":"Bài viết"},"min":{"placeholder":"tối thiểu"},"max":{"placeholder":"tối đa"},"time":{"label":"Được gửi","before":"trước","after":"sau"}},"views":{"label":"Lượt xem"},"min_views":{"placeholder":"tối thiểu"},"max_views":{"placeholder":"tối đa"}}},"hamburger_menu":"đi đến danh sách chủ đề hoặc danh mục khác","new_item":"mới","go_back":"quay trở lại","not_logged_in_user":"Trang cá nhân với tóm tắt các hoạt động và cấu hình","current_user":"đi đến trang cá nhân của bạn","topics":{"new_messages_marker":"lần thăm cuối","bulk":{"select_all":"Chọn hết","clear_all":"Xoá hết","unlist_topics":"Chủ đề không công khai","relist_topics":"Chủ đề liên quan","reset_read":"Đặt lại lượt đọc","delete":"Xóa chủ đề","dismiss":"Bỏ qua","dismiss_read":"Bỏ qua tất cả thư chưa đọc","dismiss_button":"Bỏ qua...","dismiss_tooltip":"Bỏ qua chỉ bài viết mới hoặc ngừng theo dõi chủ đề","also_dismiss_topics":"Ngừng theo dõi các chủ đề này để không hiển thị lại là chủ đề chưa đọc","dismiss_new":"Bỏ ","toggle":"chuyển sang chọn chủ đề theo lô","actions":"Hành động theo lô","change_category":"Đặt danh mục","close_topics":"Đóng các chủ đề","archive_topics":"Chủ đề Lưu trữ","move_messages_to_inbox":"Chuyển sang hộp thư","notification_level":"Thông báo","choose_new_category":"Chọn chuyên mục mới cho chủ đề này:","selected":{"other":"Bạn đã chọn \u003cb\u003e%{count}\u003c/b\u003e chủ đề"},"change_tags":"Thay thế thẻ","append_tags":"Thêm thẻ","choose_new_tags":"Chọn thẻ mới cho các chuyên mục sau:","choose_append_tags":"Chọn các thẻ mới để thêm vào cho các chủ đề này:","changed_tags":"Các thẻ của các chủ đề đó đã được thay đổi.","progress":{"other":"Tiến độ: \u003cstrong\u003e%{count}\u003c/strong\u003e chủ đề"}},"none":{"unread":"Bạn không có chủ đề nào chưa đọc.","new":"Bạn không có chủ đề mới nào.","read":"Bạn vẫn chưa đọc bất kì chủ đề nào.","posted":"Bạn vẫn chưa đăng bài trong bất kì một chủ đề nào","ready_to_create":"Sẵn sàng để ","latest":"Bạn đã xem tất cả!","bookmarks":"Bạn chưa chủ đề nào được đánh dấu.","category":"Không có chủ đề nào trong %{category} .","top":"Không có chủ đề top.","educate":{"new":"\u003cp\u003eCác chủ đề mới của bạn sẽ xuất hiện ở đây. Theo mặc định, các chủ đề được coi là mới và sẽ hiển thị chỉ báo \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e nếu chúng được tạo trong 2 ngày qua.\u003c/p\u003e\u003cp\u003eTruy cập \u003ca href=\"%{userPrefsUrl}\"\u003etùy chọn\u003c/a\u003e của bạn để thay đổi.\u003c/p\u003e"}},"bottom":{"latest":"Không còn thêm chủ đề nào nữa.","posted":"Ở đây không có thêm chủ đề nào được đăng.","read":"Không còn thêm chủ đề chưa đọc nào nữa.","new":"Không còn thêm chủ đề mới nào nữa.","unread":"Không còn thêm chủ đề chưa đọc nào nữa.","category":"Không còn thêm chủ đề nào trong %{category} .","tag":"Không có thêm %{tag} chủ đề.","top":"Không còn của đề top nào nữa.","bookmarks":"Không còn thêm chủ đề được đánh dấu nào nữa."}},"topic":{"filter_to":{"other":"%{count} bài viết trong chủ đề"},"create":"Chủ đề Mới","create_long":"Tạo một Chủ đề mới","open_draft":"Đăng bài","private_message":"Bắt đầu một thông điệp","archive_message":{"help":"Chuyển tin nhắn sang lưu trữ","title":"Lưu trữ"},"move_to_inbox":{"title":"Chuyển sang hộp thư","help":"Chuyển tin nhắn trở lại hộp thư"},"edit_message":{"help":"Chỉnh sửa bài đăng đầu tiên của tin nhắn","title":"Sửa"},"defer":{"help":"đánh dấu là chưa đọc","title":"Hoãn"},"feature_on_profile":{"help":"Thêm liên kết đến chủ đề này trên thẻ người dùng và hồ sơ của bạn","title":"Tính năng trên hồ sơ"},"remove_from_profile":{"warning":"Hồ sơ của bạn đã có một chủ đề nổi bật. Nếu bạn tiếp tục, chủ đề này sẽ thay thế chủ đề hiện có.","help":"Xóa liên kết đến chủ đề này trên hồ sơ người dùng của bạn","title":"Xóa khỏi hồ sơ"},"list":"Chủ đề","new":"chủ đề mới","unread":"chưa đọc","new_topics":{"other":"%{count} chủ đề mới."},"unread_topics":{"other":"%{count} chủ đề chưa đọc."},"title":"Chủ đề","invalid_access":{"title":"Chủ đề này là riêng tư","description":"Xin lỗi, bạn không có quyền truy cập vào chủ đề đó!","login_required":"Bạn cần phải đăng nhập để xem chủ đề đó"},"server_error":{"title":"Tải chủ đề thất bại","description":"Xin lỗi, chúng tôi không thể tải chủ đề, có thể do kết nối có vấn đề. Xin hãy thử lại. Nếu vấn đề còn xuất hiện, hãy cho chúng tôi biết"},"not_found":{"title":"Không tìm thấy chủ đề","description":"Xin lỗi, chúng tôi không thể tìm thấy chủ đề đó. Có lẽ nó đã bị loại bởi mod?"},"total_unread_posts":{"other":"Bạn có %{number} bài đăng chưa đọc trong chủ đề này"},"unread_posts":{"other":"bạn có %{number} bài đăng củ chưa đọc trong chủ đề này"},"new_posts":{"other":"có %{count} bài đăng mới trong chủ đề này từ lần đọc cuối"},"likes":{"other":"có %{count} thích trong chủ để này"},"back_to_list":"Quay lại danh sách chủ đề","options":"Các lựa chọn chủ đề","show_links":"Hiển thị liên kết trong chủ đề này","read_more_in_category":"Muốn đọc nữa? Xem qua các chủ đề khác trong %{catLink} hoặc %{latestLink}","read_more":"Muốn đọc nữa? %{catLink} hoặc %{latestLink}","unread_indicator":"Chưa có thành viên nào đọc bài cuối cùng của chủ đề này.","browse_all_categories":"Duyệt tất cả các hạng mục","browse_all_tags":"Duyệt qua tất cả các thẻ","view_latest_topics":"xem các chủ đề mới nhất","suggest_create_topic":"bắt đầu một cuộc trò chuyện mới?","jump_reply_up":"nhảy đến những trả lời trước đó","jump_reply_down":"nhảy tới những trả lời sau đó","deleted":"Chủ đề này đã bị xóa","slow_mode_update":{"title":"Chế độ chậm","select":"Người dùng chỉ có thể đăng trong chủ đề này một lần mỗi lần:","description":"Người dùng phải đợi trước khi đăng lại chủ đề này để người khác có thời gian trả lời","enable":"Kích hoạt","remove":"Tắt","hours":"Giờ:","minutes":"Phút:","seconds":"Giây:","durations":{"10_minutes":"10 phút","15_minutes":"15 phút","30_minutes":"30 Phút","45_minutes":"45 phút","1_hour":"1 giờ","2_hours":"2 Tiếng","4_hours":"4 giờ","8_hours":"8 giờ","12_hours":"12 giờ","24_hours":"24 giờ","custom":"Thời lượng tùy chỉnh"}},"topic_status_update":{"title":"Bộ hẹn giờ chủ đề","save":"Đặt hẹn giờ","num_of_hours":"Số giờ:","num_of_days":"Số ngày:","remove":"Xoá bộ đếm","publish_to":"Xuất bản tới:","when":"Khi:","time_frame_required":"Vui lòng chọn một khung thời gian"},"auto_update_input":{"none":"Chọn khung thời gian","now":"Bây giờ","later_today":"Sau ngày hôm nay","tomorrow":"Ngày mai","later_this_week":"Cuối tuần này","this_weekend":"Cuối tuần này","next_week":"Tuần tới","next_month":"Tháng t","forever":"Mãi mãi","pick_date_and_time":"Chọn ngày và giờ","set_based_on_last_post":"Đóng dựa trên bài viết cuối cùng"},"publish_to_category":{"title":"Lên lịch xuất bản"},"temp_open":{"title":"Mở tạm thời"},"auto_reopen":{"title":"Chủ đề tự động mở"},"temp_close":{"title":"Tạm đóng"},"auto_close":{"title":"Tự động đóng chủ đề","error":"Hãy nhập giá trị hợp lệ.","based_on_last_post":"Không đóng cho đến khi bài viết cuối cùng trong chủ đề này trở thành bài cũ"},"auto_delete":{"title":"Tự động xóa chủ đề"},"auto_bump":{"title":"Chủ đề Auto-Bump"},"reminder":{"title":"Nhắc t"},"auto_delete_replies":{"title":"Tự động xóa câu trả lời"},"status_update_notice":{"auto_open":"Chủ đề này sẽ tự động mở trong %{timeLeft}.","auto_close":"Chủ đề này sẽ tự đóng trong %{timeLeft}.","auto_publish_to_category":"Chủ đề này sẽ được xuất bản lên \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_after_last_post":"Chủ đề này sẽ đóng %{duration} sau trả lời cuối cùng.","auto_delete":"Chủ đề này sẽ tự động bị xóa %{timeLeft}.","auto_bump":"Chủ đề này sẽ tự động được đưa vào %{timeLeft}.","auto_reminder":"Bạn sẽ được nhắc nhở về chủ đề này %{timeLeft}.","auto_delete_replies":"Các câu trả lời về chủ đề này sẽ tự động bị xóa sau %{duration}."},"auto_close_title":"Tự động-Đóng các Cài đặt","auto_close_immediate":{"other":"Các bài mới nhất trong chủ đề này là đã %{count} giờ cũ, vì vậy đề tài sẽ đóng cửa ngay lập tức."},"timeline":{"back":"Quay lại","back_description":"Quay lại bài viết chưa đọc cuối cùng của bạn","replies_short":"%{current} / %{total}"},"progress":{"title":"tiến trình của chủ đề","go_top":"trên cùng","go_bottom":"dưới cùng","go":"đi tới","jump_bottom":"nhảy tới bài viết cuối cùng","jump_prompt":"Nhảy đến...","jump_prompt_of":{"other":"của %{count} bài viết"},"jump_prompt_long":"Chuyển đến ...","jump_bottom_with_number":"nhảy tới bài viết %{post_number}","jump_prompt_to_date":"đến nay","jump_prompt_or":"hoặc","total":"tổng số bài viết","current":"bài viết hiện tại"},"notifications":{"title":"thay đổi tần suất bạn nhận được thông báo về chủ đề này","reasons":{"mailing_list_mode":"Bạn đã bật chế độ danh sách gửi thư, vì vậy bạn sẽ được thông báo về các câu trả lời cho chủ đề này qua email.","3_10":"Bạn sẽ nhận được thông báo vì bạn đang xem một thẻ về chủ đề này.","3_6":"Bạn sẽ nhận được các tin báo bởi vì bạn đang theo dõi chuyên mục này.","3_5":"Bạn sẽ nhận được tin báo bởi vì bạn đã bắt đầu theo dõi chủ đề này một cách tự động.","3_2":"Bạn sẽ nhận được các tin báo bởi vì bạn đang theo dõi chủ đề này.","3_1":"Bạn sẽ được nhận các tin báo bởi bạn đã tạo chủ để này.","3":"Bạn sẽ nhận được các tin báo bởi vì bạn đang theo dõi chủ đề này.","2_8":"Bạn sẽ thấy được 1 số lượng bài viết mới bởi vì bạn đang theo dấu chuyên mục này.","2_4":"Bạn sẽ thấy một số câu trả lời mới vì bạn đã đăng câu trả lời cho chủ đề này.","2_2":"Bạn sẽ thấy nhiều câu trả lời mới vì bạn đang theo dõi chủ đề này.","2":"Bạn sẽ thấy nhiều câu trả lời mới vì bạn \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eđã đọc chủ đề này\u003c/a\u003e.","1_2":"Bạn sẽ được tin báo nếu ai đó đề cập đến @tên bạn hoặc trả lời bạn.","1":"Bạn sẽ được tin báo nếu ai đó đề cập đến @tên bạn hoặc trả lời bạn.","0_7":"Bạn đang bỏ qua tất cả các tin báo trong chuyên mục này.","0_2":"Bạn đang bỏ qua tất cả các thông báo trong chủ đề này","0":"Bạn đang bỏ qua tất cả các thông báo trong chủ đề này"},"watching_pm":{"title":"Đang theo dõi","description":"Bạn sẽ được thông báo về từng trả lời mới trong tin nhắn này, và một số trả lời mới sẽ được hiển thị"},"watching":{"title":"Đang theo dõi","description":"Bạn sẽ được thông báo về từng trả lời mới trong tin nhắn này, và một số trả lời mới sẽ được hiển thị"},"tracking_pm":{"title":"Đang theo dõi","description":"Một số trả lời mới sẽ được hiển thị trong tin nhắn này. Bạn sẽ được thông báo nếu ai đó đề cập đến @tên của bạn hoặc trả lời bạn"},"tracking":{"title":"Đang theo dõi","description":"Một số trả lời mới sẽ được hiển thị trong chủ đề này. Bạn sẽ được thông báo nếu ai đó đề cập đến @tên của bạn hoặc trả lời bạn"},"regular":{"title":"Bình thường","description":"Bạn sẽ được thông báo nếu ai đó đề cập đến @tên bạn hoặc trả lời bạn"},"regular_pm":{"title":"Bình thường","description":"Bạn sẽ được thông báo nếu ai đó đề cập đến @tên bạn hoặc trả lời bạn"},"muted_pm":{"title":"Im lặng","description":"Bạn sẽ không bao giờ được thông báo về bất cứ điều gì về tin nhắn này. "},"muted":{"title":"Im lặng","description":"Bạn sẽ không nhận được bất kỳ thông báo nào trong chủ đề này, và chúng sẽ không hiển thị là mới nhất."}},"actions":{"title":"Hành động","recover":"Không-Xóa Chủ Đề Này","delete":"Xóa-Chủ Đề Này","open":"Mở Chủ Đề","close":"Đóng Chủ Đề","multi_select":"Chọn Bài Viết...","slow_mode":"Đặt chế độ chậm","timed_update":"Đặt bộ hẹn giờ chủ đề ...","pin":"Ghim Chủ Đề...","unpin":"Bỏ-Ghim Chủ Đề...","unarchive":"Chủ đề Không Lưu Trữ","archive":"Chủ Đề Lưu Trữ","invisible":"Make Unlisted","visible":"Make Listed","reset_read":"Đặt lại dữ liệu đọc","make_public":"Công khai chủ đề này","make_private":"Gửi tin nhắn cá nhân","reset_bump_date":"Đặt lại ngày Bump"},"feature":{"pin":"Ghim Chủ Đề","unpin":"Bỏ-Ghim Chủ Đề","pin_globally":"Ghim Chủ Đề Tổng Thể","make_banner":"Banner chủ đề","remove_banner":"Bỏ banner chủ đề"},"reply":{"title":"Trả lời","help":"bắt đầu soạn phản hồi cho chủ đề này"},"clear_pin":{"title":"Xóa ghim","help":"Xóa trạng thái ghim của chủ đề này để nó không còn xuất hiện trên cùng danh sách chủ đề của bạn"},"share":{"title":"Chia sẻ","extended_title":"Chia sẻ một liên kết","help":"Chia sẻ một liên kết đến chủ đề này","invite_users":"Mời"},"print":{"title":"In","help":"Mở phiên bản thân thiện với máy in của chủ đề này"},"flag_topic":{"title":"Gắn cờ","help":"đánh dấu riêng tư chủ đề này cho sự chú ý hoặc gửi một thông báo riêng về nó","success_message":"Bạn đã đánh dấu thành công chủ đề này"},"make_public":{"title":"Chuyển đổi sang chủ đề công khai","choose_category":"Vui lòng chọn một danh mục cho chủ đề công khai:"},"feature_topic":{"title":"Đề cao chủ đề này","pin":"Làm cho chủ đề này xuất hiện trên top của chuyên mục %{categoryLink}","unpin":"Xóa chủ đề này từ phần trên cùng của chủ đề %{categoryLink}","unpin_until":"Gỡ bỏ chủ đề này khỏi top của chuyên mục %{categoryLink} và đợi cho đến \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Người dùng có thể bỏ ghim chủ đề riêng cho mình","pin_validation":"Ngày được yêu câu để gắn chủ đề này","not_pinned":"Không có chủ đề được ghim trong %{categoryLink}.","already_pinned":{"other":"Chủ đề gần đây được ghim trong %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Làm cho chủ đề này xuất hiện trên top của tất cả các chủ đề","confirm_pin_globally":{"other":"Bạn đã có %{count} chủ đề được ghim trên toàn cầu. Quá nhiều chủ đề được ghim có thể là gánh nặng cho người dùng mới và ẩn danh. Bạn có chắc chắn muốn ghim một chủ đề khác trên toàn cầu không?"},"unpin_globally":"Bỏ chủ đề này khỏi phần trên cùng của danh sách tất cả các chủ đề","unpin_globally_until":"Gỡ bỏ chủ đề này khỏi top của danh sách tất cả các chủ đề và đợi cho đến \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Người dùng có thể bỏ ghim chủ đề riêng cho mình","not_pinned_globally":"Không có chủ đề nào được ghim.","already_pinned_globally":{"other":"Chủ đề gần đây được ghim trong: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Đặt chủ đề này là một banner xuất hiện trên top của tất cả các trang.","remove_banner":"Gỡ bỏ banner xuất hiện trên top của tất cả các trang.","banner_note":"Người dùng có thể bỏ qua banner này bằng cách đóng nó. Chỉ một chủ đề có thể được đặt là banner tại một thời điểm.","no_banner_exists":"Không có chủ đề banner nào.","banner_exists":"Có \u003cstrong class='badge badge-notification unread'\u003eis\u003c/strong\u003e đang là chủ đề banner."},"inviting":"Đang mời...","automatically_add_to_groups":"Lời mời này cũng bao gồm quyền truy cập vào các nhóm sau:","invite_private":{"title":"Mời thảo luận","email_or_username":"Email hoặc username người được mời","email_or_username_placeholder":"địa chỉ thư điện tử hoặc tên người dùng","action":"Mời","success":"Chúng tôi đã mời người đó tham gia thảo luận này.","success_group":"Chúng tôi đã mời nhóm đó tham gia vào tin nhắn này.","error":"Xin lỗi, có lỗi khi mời người dùng này.","not_allowed":"Xin lỗi, không thể mời người dùng đó.","group_name":"Nhóm tên"},"controls":"Topic Controls","invite_reply":{"title":"Mời","username_placeholder":"tên người dùng","action":"Gửi Lời Mời","help":"mời người khác tham gia chủ đề thông qua email hoặc thông báo","discourse_connect_enabled":"Nhập tên đăng nhập hoặc địa chỉ email của người mà bạn muốn mời vào chủ đề này.","to_topic_blank":"Nhập tên đăng nhập hoặc địa chỉ email của người bạn muốn mời đến chủ đề này.","to_topic_email":"Bạn vừa điền địa chỉ email, website sẽ gửi lời mời cho phép bạn bè của bạn có thể trả lời chủ đề này.","to_topic_username":"Bạn vừa điền tên thành viên, website sẽ gửi thông báo kèm theo lời mời họ tham gia chủ đề này.","to_username":"Điền tên thành viên bạn muốn mời, website sẽ gửi thông báo kèm theo lời mời họ tham gia chủ đề này.","email_placeholder":"name@example.com","success_email":"Website vừa gửi lời mời tới \u003cb\u003e%{invitee}\u003c/b\u003e và sẽ thông báo cho bạn khi lời mời đó được chấp nhận. Kiểm tra tab lời mời trên trang tài khoản để theo dõi lời mời của bạn.","success_username":"Website đã mời người đó tham gia thảo luận này.","error":"Xin lỗi, chúng tôi không thể mời người đó. Có lẽ họ đã được mời? (giới hạn lời mời)","success_existing_email":"Người dùng có email \u003cb\u003e%{emailOrUsername}\u003c/b\u003e đã tồn tại. Chúng tôi đã mời người dùng đó tham gia vào chủ đề này."},"login_reply":"Đăng nhập để trả lời","filters":{"n_posts":{"other":"%{count} bài viết"},"cancel":"Bỏ đièu kiện lọc"},"move_to":{"title":"Chuyển tới","action":"chuyển tới","error":"Đã xảy ra lỗi khi chuyển bài đăng."},"split_topic":{"title":"Di chuyển tới Chủ đề mới","action":"di chuyển tới chủ đề mới","topic_name":"Tiêu đề chủ đề mới","radio_label":"Chủ đề Mới","error":"Có lỗi khi di chuyển bài viết tới chủ đề mới.","instructions":{"other":"Bạn muốn tạo chủ đề mới và phổ biến nó với \u003cb\u003e%{count}\u003c/b\u003e bài viết đã chọn."}},"merge_topic":{"title":"Di chuyển tới chủ đề đang tồn tại","action":"di chuyển tới chủ đề đang tồn tại","error":"Có lỗi khi di chuyển bài viết đến chủ đề này.","radio_label":"Chủ đề hiện có","instructions":{"other":"Hãy chọn chủ đề bạn muốn di chuyển \u003cb\u003e%{count}\u003c/b\u003e bài viết này tới."}},"move_to_new_message":{"title":"Chuyển đến tin nhắn mới","action":"chuyển đến tin nhắn mới","message_title":"Tiêu đề tin nhắn mới","radio_label":"Tin nhắn mới","participants":"Những người tham gia","instructions":{"other":"Bạn sắp tạo một tin nhắn mới và đăng nó với \u003cb\u003e%{count}\u003c/b\u003e bài đăng mà bạn đã chọn."}},"move_to_existing_message":{"title":"Di chuyển đến thư hiện có","action":"chuyển đến tin nhắn hiện có","radio_label":"Tin nhắn hiện có","participants":"Những người tham gia","instructions":{"other":"Vui lòng chọn thông báo bạn muốn chuyển \u003cb\u003e%{count}\u003c/b\u003e bài đăng đó đến."}},"merge_posts":{"title":"Hợp nhất các bài đã chọn","action":"hợp nhất các bài đăng đã chọn","error":"Đã xảy ra lỗi khi hợp nhất các bài đăng đã chọn."},"publish_page":{"title":"Xuất bản trang","publish":"Xuất bản","description":"Khi một chủ đề được xuất bản dưới dạng một trang, URL của nó có thể được chia sẻ và nó sẽ được hiển thị với kiểu tùy chỉnh.","slug":"tên đường dẫn","public":"Công khai","public_description":"Mọi người có thể xem trang ngay cả khi chủ đề liên quan là riêng tư.","publish_url":"Trang của bạn đã được xuất bản tại:","topic_published":"Chủ đề của bạn đã được xuất bản tại:","preview_url":"Trang của bạn sẽ được xuất bản tại:","invalid_slug":"Xin lỗi, bạn không thể xuất bản trang này.","unpublish":"Hủy xuất bản","unpublished":"Trang của bạn đã không được xuất bản và không thể truy cập được nữa.","publishing_settings":"Cài đặt xuất bản"},"change_owner":{"title":"Chủ sở hữu thay đổi","action":"chuyển chủ sở hữu","error":"Có lỗi xảy ra khi thay đổi quyền sở hữu của các bài viết.","placeholder":"tên đăng nhập của chủ sở hữu mới","instructions":{"other":"Vui lòng chọn chủ sở hữu mới cho %{count} bài viết của \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"other":"Vui lòng chọn chủ sở hữu mới cho %{count} bài viết"}},"change_timestamp":{"title":"Thay đổi Dấu thời gian ...","action":"đổi timestamp","invalid_timestamp":"Timestamp không thể trong tương lai.","error":"Có lỗi khi thay đổi timestamp của chủ đề.","instructions":"Hãy chọn dòng thời gian mới cho chủ đề, các bài viết trong chủ đề sẽ được cập nhật để có sự khác biệt cùng một lúc."},"multi_select":{"select":"chọn","selected":"đã chọn (%{count})","select_post":{"label":"chọn","title":"Thêm bài đăng vào lựa chọn"},"selected_post":{"label":"đã chọn","title":"Nhấp để xóa bài đăng khỏi lựa chọn"},"select_replies":{"label":"chọn + trả lời","title":"Thêm bài đăng và tất cả các câu trả lời của nó cho lựa chọn"},"select_below":{"label":"chọn + bên dưới","title":"Thêm bài đăng và tất cả sau bài đăng đó để lựa chọn"},"delete":"xóa lựa chọn","cancel":"hủy lựa chọn","select_all":"chọn tất cả","deselect_all":"bỏ chọn tất cả","description":{"other":"Bạn đã chọn \u003cb\u003e%{count}\u003c/b\u003e bài viết."}}},"post":{"quote_reply":"Trích dẫn","quote_share":"Chia sẻ","edit_reason":"Lý do: ","post_number":"bài viết %{number}","ignored":"Nội dung bị bỏ qua","reply_as_new_topic":"Trả lời như là liên kết đến Chủ đề","reply_as_new_private_message":"Trả lời dưới dạng tin nhắn mới cho cùng người nhận","continue_discussion":"Tiếp tục thảo luận từ %{postLink}:","follow_quote":"đến bài viết trích dẫn","show_full":"Hiển thị đầy đủ bài viết","show_hidden":"Xem nội dung bị bỏ qua.","collapse":"Thu nhỏ","expand_collapse":"mở/đóng","locked":"MOD đã khóa bài đăng này không được chỉnh sửa","gap":{"other":"xem %{count} trả lời bị ẩn"},"notice":{"new_user":"Đây là lần đầu tiên %{user} được đăng - hãy chào mừng họ đến với cộng đồng của chúng ta!","returning_user":"Đã lâu rồi chúng ta chưa thấy %{user} - bài đăng cuối cùng của họ là %{time}."},"unread":"Bài viết chưa đọc","has_replies":{"other":"%{count} Trả lời"},"has_replies_count":"%{count}","unknown_user":"(người dùng không xác định / đã xóa)","has_likes_title":{"other":"%{count} người thích bài viết này"},"has_likes_title_only_you":"bạn đã like bài viết này","has_likes_title_you":{"other":"bạn và %{count} người khác đã like bài viết này"},"filtered_replies_hint":{"other":"Xem bài đăng này và %{count} câu trả lời của nó"},"filtered_replies_viewing":{"other":"Xem %{count} câu trả lời cho"},"in_reply_to":"Tải bài đăng gốc","errors":{"create":"Xin lỗi, có lỗi xảy ra khi tạo bài viết của bạn. Vui lòng thử lại.","edit":"Xin lỗi, có lỗi xảy ra khi sửa bài viết của bạn. Vui lòng thử lại.","upload":"Xin lỗi, có lỗi xảy ra khi tải lên tập tin này. Vui lòng thử lại.","file_too_large":"Xin lỗi, tệp đó quá lớn (kích thước tối đa là %{max_size_kb}kb). Bạn có thể tải dữ liệu lớn của bạn lên dịch vụ chia sẻ đám mây, sau đó dán liên kết tại đây","too_many_uploads":"Xin lỗi, bạn chỉ có thể tải lên 1 file cùng 1 lúc.","too_many_dragged_and_dropped_files":{"other":"Xin lỗi, bạn chỉ có thể tải lên %{count} tệp cùng một lúc."},"upload_not_authorized":"Xin lỗi, tập tin của bạn tải lên không được cho phép (định dạng cho phép: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Xin lỗi, tài khoản mới không thể tải lên ảnh.","attachment_upload_not_allowed_for_new_user":"Xin lỗi, tài khoản mới không thể tải lên đính kèm.","attachment_download_requires_login":"Xin lỗi, bạn cần đăng nhập để tải về đính kèm."},"cancel_composer":{"confirm":"Bạn muốn làm gì với bài đăng của mình?","discard":"Hủy bỏ","save_draft":"Lưu bản nháp để sử dụng sau","keep_editing":"Tiếp tục chỉnh sửa"},"via_email":"bài viết này đăng qua email","via_auto_generated_email":"bài đăng này đến qua một email được tạo tự động","whisper":"bài viết này là lời nhắn từ điều hành viên","wiki":{"about":"Bài viết này là một wiki"},"archetypes":{"save":"Lưu lựa chọn"},"few_likes_left":"Cám ơn bạn đã chia sẻ cảm nhận! Bạn chỉ còn lại vài lượt like cho ngày hôm nay.","controls":{"reply":"bắt đầu soản trả lời cho bài viết này","like":"like bài viết này","has_liked":"bạn đã thích bài viết này","read_indicator":"thành viên đã đọc bài đăng này","undo_like":"hủy like","edit":"sửa bài viết này","edit_action":"Sửa","edit_anonymous":"Xin lỗi, nhưng bạn cần đăng nhập để sửa bài viết này.","flag":"đánh dấu bài viết này để tạo chú ý hoặc gửi một thông báo riêng về nó","delete":"xóa bài viết này","undelete":"hủy xóa bài viết này","share":"chia sẻ liên kết đến bài viết này","more":"Thêm","delete_replies":{"confirm":"Bạn cũng muốn xóa các câu trả lời cho bài đăng này?","direct_replies":{"other":"Có, và %{count} câu trả lời trực tiếp"},"all_replies":{"other":"Có, và tất cả %{count} câu trả lời"},"just_the_post":"Không, chỉ xóa chủ đề"},"admin":"quản lý bài viết","wiki":"Tạo Wiki","unwiki":"Xóa Wiki","convert_to_moderator":"Thêm màu Nhân viên","revert_to_regular":"Xóa màu Nhân viên","rebake":"Tạo lại HTML","publish_page":"Xuất bản trang","unhide":"Bỏ ẩn","change_owner":"Đổi chủ sở hữu","grant_badge":"Cấp huy hiệu","lock_post":"Khóa bài đăng","lock_post_description":"ngăn người đăng chỉnh sửa bài đăng này","unlock_post":"Mở khóa bài đăng","unlock_post_description":"cho phép người đăng chỉnh sửa bài đăng này","delete_topic_disallowed_modal":"Bạn không có quyền xóa chủ đề này. Nếu bạn thực sự muốn xóa nó, hãy gửi cờ để người kiểm duyệt chú ý cùng với lý do.","delete_topic_disallowed":"bạn không có quyền xóa chủ đề này","delete_topic_confirm_modal":{"other":"Chủ đề này hiện có hơn %{count} lượt xem và có thể là điểm đến tìm kiếm phổ biến. Bạn có chắc chắn muốn xóa hoàn toàn chủ đề này thay vì chỉnh sửa để cải thiện chủ đề không?"},"delete_topic_confirm_modal_yes":"Có, xóa chủ đề này","delete_topic_confirm_modal_no":"Không, giữ chủ đề này","delete_topic_error":"Đã xảy ra lỗi khi xóa chủ đề này","delete_topic":"xóa chủ đề","add_post_notice":"Thêm thông báo cho nhân viên","change_post_notice":"Thông báo thay đổi từ nhân viên","delete_post_notice":"Xóa thông báo từ nhân viên","remove_timer":"gỡ bỏ bộ đếm thời gian"},"actions":{"people":{"like":{"other":"thích này"},"read":{"other":"đọc bài này"},"like_capped":{"other":"và %{count} người khác thích nầy"},"read_capped":{"other":"và %{count} người khác đọc bài này"}},"by_you":{"off_topic":"Bạn đã đánh dấu cái nfay là chủ đề đóng","spam":"Bạn đã đánh dấu cái này là rác","inappropriate":"Bạn đã đánh dấu cái này là không phù hợp","notify_moderators":"Bạn đã đánh dấu cái này cho người kiểm duyệt","notify_user":"Bạn đã gửi một tin nhắn đến người dùng này"}},"delete":{"confirm":{"other":"Bạn có chắc chắn muốn xóa %{count} bài viết đó không?"}},"merge":{"confirm":{"other":"Bạn có chắc chắn muốn hợp nhất %{count} bài viết đó không?"}},"revisions":{"controls":{"first":"Sửa đổi đầu tiên","previous":"Sửa đổi trước","next":"Sửa đổi tiếp theo","last":"Sửa đổi gần nhất","hide":"Ẩn sửa đổi","show":"Hiện sửa đổi","revert":"Khôi phục về bản sửa đổi %{revision}","edit_wiki":"Sửa wiki","edit_post":"Sửa bài đăng","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Hiển thị dạng xuất kèm theo các bổ sung và loại bỏ nội tuyến","button":"HTML"},"side_by_side":{"title":"Hiển thị dạng xuất với các điểm khác biệt cạnh nhau","button":"HTML"},"side_by_side_markdown":{"title":"Hiển thị nguyên bản với các điểm khác biệt cạnh nhau","button":"Thô"}}},"raw_email":{"displays":{"raw":{"title":"Hiển thị email","button":"Thô"},"text_part":{"title":"Hiển thị phần văn bản của email","button":"Văn bản"},"html_part":{"title":"Hiển thị phần html của email","button":"HTML"}}},"bookmarks":{"create":"Tạo dấu trang","edit":"Chỉnh sửa dấu trang","created":"Tạo bởi","updated":"Đã cập nhật","name":"Tên","name_placeholder":"Đánh dấu này là gì?","set_reminder":"Nhắc nhở tôi","actions":{"delete_bookmark":{"name":"Xóa dấu trang","description":"Xóa dấu trang khỏi hồ sơ của bạn và dừng tất cả lời nhắc cho dấu trang"},"edit_bookmark":{"name":"Chỉnh sửa dấu trang","description":"Chỉnh sửa tên dấu trang hoặc thay đổi ngày giờ lời nhắc"}}},"filtered_replies":{"viewing_posts_by":"Đang xem %{post_count} bài viết của","viewing_subset":"Một số câu trả lời bị thu gọn","viewing_summary":"Xem tóm tắt về chủ đề này","post_number":"%{username}, bài số #%{post_number}","show_all":"Hiển thị tất cả"}},"category":{"can":"can\u0026hellip;","none":"(không danh mục)","all":"Tất cả danh mục","choose":"danh mục\u0026hellip;","edit":"Sửa","edit_dialog_title":"Chỉnh sửa: %{categoryName}","view":"Xem Chủ đề trong Danh mục","back":"Quay lại danh mục","general":"Chung","settings":"Cấu hình","topic_template":"Mẫu Chủ đề","tags":"Thẻ","tags_allowed_tags":"Hạn chế các thẻ này trong danh mục này:","tags_allowed_tag_groups":"Hạn chế các nhóm thẻ này trong danh mục này:","tags_placeholder":"(Tuỳ chọn) danh sách thẻ cho phép","tags_tab_description":"Các thẻ và nhóm thẻ được chỉ định ở trên sẽ chỉ có trong danh mục này và các danh mục khác cũng chỉ định chúng. Chúng sẽ không có để sử dụng trong các danh mục khác.","tag_groups_placeholder":"(Tùy chọn) danh sách các nhóm thẻ được phép","manage_tag_groups_link":"Quản lý nhóm thẻ","allow_global_tags_label":"Đồng thời cho phép các thẻ khác","tag_group_selector_placeholder":"(Tùy chọn) Nhóm thẻ","required_tag_group_description":"Yêu cầu các chủ đề mới có thẻ từ nhóm thẻ:","min_tags_from_required_group_label":"Số thẻ:","required_tag_group_label":"Nhóm thẻ:","topic_featured_link_allowed":"Cho phép các liên kết nổi bật trong danh mục này","delete":"Xóa chuyên mục","create":"Chuyên mục mới","create_long":"Tạo Chủ đề mới","save":"Lưu chuyên mục","slug":"Đường dẫn chuyên mục","slug_placeholder":"(Tùy chọn) các từ sử dụng trong url","creation_error":"Có lỗi xảy ra khi tạo chuyên mục","save_error":"Có lỗi xảy ra khi lưu chuyên mục","name":"Tên chuyên mục","description":"Mô tả","topic":"chủ đề chuyên mục","logo":"Logo của chuyên mục","background_image":"Ảnh nền của chuyên mục","badge_colors":"Màu huy hiệu","background_color":"Màu nền","foreground_color":"Màu mặt trước","name_placeholder":"Tối đa một hoặc hai từ","color_placeholder":"Bất cứ màu nào","delete_confirm":"Bạn có chắc sẽ xóa chuyên mục này chứ?","delete_error":"Có lỗi xảy ra khi xóa chuyên mục này","list":"Danh sách chuyên mục","no_description":"Hãy thêm mô tả cho chuyên mục này","change_in_category_topic":"Sửa mô tả","already_used":"Màu này đã được dùng bởi chuyên mục khác","security":"Bảo mật","security_add_group":"Thêm một nhóm","permissions":{"group":"Nhóm","see":"Xem","reply":"Trả lời","create":"Tạo","no_groups_selected":"Không có nhóm nào được cấp quyền truy cập; danh mục này sẽ chỉ hiển thị cho nhân viên.","everyone_has_access":"Danh mục này là công khai, mọi người đều có thể xem, trả lời và tạo bài viết. Để hạn chế quyền, hãy xóa một hoặc nhiều quyền được cấp cho nhóm \"mọi người\".","toggle_reply":"Chuyển đổi quyền Trả lời","toggle_full":"Chuyển đổi quyền Tạo","inherited":"Sự cho phép này được thừa hưởng từ “tất cả mọi người”"},"special_warning":"Cảnh báo: Đây là chuyên mục có sẵn nên bạn không thể chỉnh sửa các thiết lập bảo mật. Nếu bạn muốn sử dụng chuyên mục này, hãy xóa nó thay vì tái sử dụng.","uncategorized_security_warning":"Danh mục này là đặc biệt. Nó được thiết kế như một khu vực tổ chức cho các chủ đề không có danh mục; nó không thể có cài đặt bảo mật.","uncategorized_general_warning":"Danh mục này là đặc biệt. Nó được sử dụng làm danh mục mặc định cho các chủ đề mới chưa chọn danh mục. Nếu bạn muốn ngăn hành vi này và buộc lựa chọn danh mục, \u003ca href=\"%{settingLink}\"\u003evui lòng tắt cài đặt tại đây\u003c/a\u003e. Nếu bạn muốn thay đổi tên hoặc mô tả, hãy chuyển đến \u003ca href=\"%{customizeLink}\"\u003eTùy chỉnh / Nội dung Văn bản\u003c/a\u003e.","pending_permission_change_alert":"Bạn chưa thêm %{group} vào danh mục này; bấm vào nút này để thêm chúng.","images":"Hình ảnh","email_in":"Tùy chỉnh địa chỉ nhận thư điện tử ","email_in_allow_strangers":"Nhận thư điện tử từ người gửi vô danh không tài khoản","email_in_disabled":"Tạo chủ đề mới thông qua email đã được tắt trong thiết lập. Để bật tính năng này, ","email_in_disabled_click":"kích hoạt thiết lập thư điện tử","mailinglist_mirror":"Danh mục phản ánh một danh sách gửi thư","show_subcategory_list":"Hiển thị danh sách danh mục phụ ở trên các chủ đề trong danh mục này.","read_only_banner":"Văn bản biểu ngữ khi người dùng không thể tạo chủ đề trong danh mục này:","num_featured_topics":"Số lượng chủ đề được hiển thị trên trang danh mục:","subcategory_num_featured_topics":"Số lượng các chủ đề nổi bật trên trang của danh mục chính:","all_topics_wiki":"Đặt wiki chủ đề mới theo mặc định","subcategory_list_style":"Kiểu danh sách danh mục con:","sort_order":"Danh sách chủ đề Sắp xếp theo:","default_view":"Danh sách chủ đề mặc định:","default_top_period":"Khoảng thời gian Top mặc định:","default_list_filter":"Bộ lọc danh sách mặc định:","allow_badges_label":"Cho phép thưởng huy hiệu trong chuyên mục này","edit_permissions":"Sửa quyền","reviewable_by_group":"Ngoài nhân viên, nội dung trong danh mục này cũng có thể được kiểm duyệt bởi:","review_group_name":"Nhóm tên","require_topic_approval":"Yêu cầu người kiểm duyệt phê duyệt tất cả các chủ đề mới","require_reply_approval":"Yêu cầu người kiểm duyệt phê duyệt tất cả các câu trả lời mới","this_year":"năm nay","position":"Vị trí trên trang danh mục:","default_position":"vị trí mặc định","position_disabled":"Chuyên mục sẽ được hiển thị theo thứ tự hoạt động. Để kiểm soát thứ tự chuyên mục trong danh sách, ","position_disabled_click":"bật thiết lập \"cố định vị trí chuyên mục\".","minimum_required_tags":"Số lượng thẻ tối thiểu được yêu cầu trong một chủ đề:","parent":"Danh mục cha","num_auto_bump_daily":"Số lượng chủ đề mở tự động tăng hàng ngày:","navigate_to_first_post_after_read":"Chuyển đến bài đăng đầu tiên sau khi chủ đề được đọc","notifications":{"watching":{"title":"Theo dõi"},"watching_first_post":{"title":"Xem bài viết đầu tiên","description":"Bạn sẽ được thông báo về các chủ đề mới trong danh mục này nhưng không phải trả lời các chủ đề."},"tracking":{"title":"Đang theo dõi"},"regular":{"title":"Bình thường","description":"Bạn sẽ được thông báo nếu ai đó đề cập đến @tên bạn hoặc trả lời bạn"},"muted":{"title":"Im lặng"}},"search_priority":{"label":"Ưu tiên tìm kiếm","options":{"normal":"Bình thường","ignore":"Bỏ qua","very_low":"Rất thấp","low":"Thấp","high":"Cao","very_high":"Rất cao"}},"sort_options":{"default":"mặc định","likes":"Thích","op_likes":"Lượt thích bài viết gốc","views":"Lượt xem","posts":"Bài viết","activity":"Hoạt động","posters":"Người gửi","category":"Chuyên mục","created":"Được tạo"},"sort_ascending":"Tăng dần","sort_descending":"Giảm dần","subcategory_list_styles":{"rows":"Hàng","rows_with_featured_topics":"Hàng với các chủ đề nổi bật","boxes":"Hộp","boxes_with_featured_topics":"Hộp có các chủ đề nổi bật"},"settings_sections":{"general":"Chung","moderation":"Người kiểm duyệt","appearance":"Ngoại hình","email":"Email"},"list_filters":{"all":"tất cả các chủ đề","none":"không có danh mục phụ"}},"flagging":{"title":"Cám ơn bạn đã giúp phát triển cộng đồng!","action":"Đánh dấu Bài viết","take_action":"Thực hiện hành động...","take_action_options":{"default":{"title":"Hành động","details":"Đạt đến ngưỡng gắn cờ ngay lập tức, thay vì chờ thêm cờ cộng đồng"},"suspend":{"title":"Tạm ngưng người dùng","details":"Đạt đến ngưỡng gắn cờ và tạm ngưng người dùng"},"silence":{"title":"Người dùng im lặng","details":"Đạt đến ngưỡng gắn cờ và tắt tiếng người dùng"}},"notify_action":"Tin nhắn","official_warning":"Cảnh báo chính thức","delete_spammer":"Xóa người Spam","yes_delete_spammer":"Có, xóa người spam","ip_address_missing":"(N/A)","hidden_email_address":"(ẩn)","submit_tooltip":"Đánh dấu riêng tư","take_action_tooltip":"Tiếp cận ngưỡng đánh dấu ngay lập tức, thay vì đợi cộng đồng","cant":"Xin lỗi, bạn không thể đánh dấu bài viết lúc này.","notify_staff":"Thông báo riêng cho BQT","formatted_name":{"off_topic":"Nó là sai chủ đề","inappropriate":"Không phù hợp","spam":"Nó là rác"},"custom_placeholder_notify_user":"Phải hảo tâm và mang tính xây dựng.","custom_placeholder_notify_moderators":"Hãy cho chúng tôi biết cụ thể những gì bạn quan tâm, và cung cấp các liên kết hoặc ví dụ liên quan nếu có thể.","custom_message":{"at_least":{"other":"nhập ít nhất %{count} kí tự"},"more":{"other":"vẫn còn %{count} ..."},"left":{"other":"%{count} còn lại"}}},"flagging_topic":{"title":"Cám ơn bạn đã giúp phát triển cộng đồng!","action":"Gắn cờ Chủ đề","notify_action":"Tin nhắn"},"topic_map":{"title":"Tóm tắt Chủ đề","participants_title":"Poster thường xuyên","links_title":"Liên kết phổ biến","links_shown":"hiển thị thêm liên kết...","clicks":{"other":"%{count} nhấp chuột"}},"post_links":{"about":"mở rộng nhiều liên kết hơn cho bài đăng này","title":{"other":"%{count} thêm"}},"topic_statuses":{"warning":{"help":"Đây là một cảnh báo chính thức."},"bookmarked":{"help":"Bạn đã đánh dấu chủ đề này"},"locked":{"help":"Chủ đề đã đóng; không cho phép trả lời mới"},"archived":{"help":"Chủ đề này đã được lưu trữ, bạn không thể sửa đổi nữa"},"locked_and_archived":{"help":"Chủ đề này đã đóng và lưu trữ, không cho phép trả lời mới và sửa đổi nữa"},"unpinned":{"title":"Hủy gắn","help":"Chủ đề này không còn được ghim nữa, nó sẽ hiển thị theo thứ tự thông thường"},"pinned_globally":{"title":"Ghim toàn trang","help":"Chủ đề này được ghim toàn trang, nó sẽ hiển thị ở trên cùng các chủ đề mới và trong chuyên mục"},"pinned":{"title":"Gắn","help":"Chủ đề này đã được ghim, nó sẽ hiển thị ở trên cùng chuyên mục"},"unlisted":{"help":"Chủ đề này ẩn, nó sẽ không hiển thị trong danh sách chủ đề, và chỉ có thể truy cập thông qua liên kết trực tiếp"},"personal_message":{"title":"Chủ đề này là một tin nhắn cá nhân","help":"Chủ đề này là một tin nhắn cá nhân"}},"posts":"Bài viết","original_post":"Bài viết gốc","views":"Lượt xem","views_lowercase":{"other":"lượt xem"},"replies":"Trả lời","views_long":{"other":"chủ đề này đã được xem %{number} lần"},"activity":"Hoạt động","likes":"Lượt thích","likes_lowercase":{"other":"lượt thích"},"users":"Người dùng","users_lowercase":{"other":"người dùng"},"category_title":"Danh mục","changed_by":"bởi %{author}","raw_email":{"title":"Email đến","not_available":"Không sẵn sàng!"},"categories_list":"Danh sách Danh mục","filters":{"with_topics":"%{filter} chủ đề","with_category":"%{filter} %{category} chủ đề","latest":{"title":"Mới nhất","title_with_count":{"other":"Mới nhất (%{count})"},"help":"chủ đề với bài viết gần nhất"},"read":{"title":"Đọc","help":"chủ đề bạn đã đọc, theo thứ tự bạn đọc lần cuối cùng"},"categories":{"title":"Danh mục","title_in":"Danh mục - %{categoryName}","help":"tất cả các chủ đề được nhóm theo chuyên mục"},"unread":{"title":"Chưa đọc","title_with_count":{"other":"Chưa đọc (%{count})"},"help":"chủ đề bạn đang xem hoặc theo dõi có bài viết chưa đọc","lower_title_with_count":{"other":"%{count} chưa đọc"}},"new":{"lower_title_with_count":{"other":"%{count} mới"},"lower_title":"mới","title":"Mới","title_with_count":{"other":"Mới (%{count})"},"help":"chủ đề đã tạo cách đây vài ngày"},"posted":{"title":"Bài viết của tôi","help":"chủ đề của bạn đã được đăng trong"},"bookmarks":{"title":"Đánh dấu","help":"chủ để của bạn đã được đánh dấu"},"category":{"title":"%{categoryName}","title_with_count":{"other":"%{categoryName} (%{count})"},"help":"Những chủ đề mới nhất trong chuyên mục%{categoryName} "},"top":{"title":"Top","help":"Các chủ đề tích cực nhất trong năm, tháng, tuần, hoặc ngày trước","all":{"title":"Từ trước tới nay"},"yearly":{"title":"Hàng năm"},"quarterly":{"title":"Hàng quý"},"monthly":{"title":"Hàng tháng"},"weekly":{"title":"Hàng tuần"},"daily":{"title":"Hàng ngày"},"all_time":"Từ trước tới nay","this_year":"Năm","this_quarter":"Quý","this_month":"Tháng","this_week":"Tuần","today":"Ngày","other_periods":"xem đầu trang:"}},"browser_update":"Rất tiếc, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003etrình duyệt của bạn quá cũ để hoạt động trên trang web này\u003c/a\u003e. Vui lòng \u003ca href=\"https://browsehappy.com\"\u003enâng cấp trình duyệt của bạn\u003c/a\u003e để xem nội dung phong phú, đăng nhập và trả lời.","permission_types":{"full":"Tạo / Trả lời / Xem","create_post":"Trả lời / Xem","readonly":"Xem"},"lightbox":{"download":"tải về","previous":"Trước (Phím mũi tên trái)","next":"Tiếp theo (Phím mũi tên phải)","counter":"%curr% trên %total%","close":"Đóng (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eKhông thể tải nội dung\u003c/a\u003e.","image_load_error":"\u003ca href=\"%url%\"\u003eKhông thể tải hình ảnh\u003c/a\u003e."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} hoặc %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Phím tắt","jump_to":{"title":"Nhảy đến","home":"%{shortcut} Nhà","latest":"%{shortcut} Cuối cùng","new":"%{shortcut} Mới","unread":"%{shortcut} Chưa đọc","categories":"%{shortcut} Danh mục","top":"%{shortcut} Trên","bookmarks":"%{shortcut} Đánh dấu","profile":"%{shortcut} Hồ sơ","messages":"%{shortcut} Tin nhắn","drafts":"%{shortcut} bản nháp","next":"%{shortcut} Chủ đề Tiếp theo","previous":"%{shortcut} Chủ đề trước"},"navigation":{"title":"Điều hướng","jump":"%{shortcut} Đến bài viết #","back":"%{shortcut} Quay lại","up_down":"%{shortcut} Move selection \u0026uarr; \u0026darr;","open":"%{shortcut} Mở chủ để đã chọn","next_prev":"%{shortcut} Next/previous section","go_to_unread_post":"%{shortcut} Đi đến bài viết chưa đọc đầu tiên"},"application":{"title":"Ứng dụng","create":"%{shortcut} Tạo mới chủ đề","notifications":"%{shortcut} Mở thông báo","hamburger_menu":"%{shortcut} Mở menu mobile","user_profile_menu":"%{shortcut} Mở trình đơn thành viên","show_incoming_updated_topics":"%{shortcut} Show updated topics","search":"%{shortcut} Tìm kiếm","help":"%{shortcut} Mở trợ giúp bàn phím","dismiss_new_posts":"%{shortcut} Dismiss New/Posts","dismiss_topics":"%{shortcut} Bỏ qua bài viết","log_out":"%{shortcut} Đăng xuất"},"composing":{"title":"Viết bài","return":"%{shortcut} Quay lại trình soạn thảo","fullscreen":"%{shortcut} soạn bài viết toàn màn hình"},"bookmarks":{"title":"Đánh dấu trang","enter":"%{shortcut} Lưu và đóng","later_today":"%{shortcut} Sau hôm nay","later_this_week":"%{shortcut} Cuối tuần này","tomorrow":"%{shortcut} Ngày mai","next_week":"%{shortcut} Tuần sau","next_month":"%{shortcut} Tháng tới","next_business_week":"%{shortcut} Bắt đầu vào tuần tới","next_business_day":"%{shortcut} Ngày làm việc tiếp theo","custom":"%{shortcut} Ngày và giờ tùy chỉnh","none":"%{shortcut} Không có lời nhắc","delete":"%{shortcut} Xóa dấu trang"},"actions":{"title":"Hành động","bookmark_topic":"%{shortcut} Chuyển chủ đề đánh dấu","pin_unpin_topic":"%{shortcut} Pin/Unpin bài viết","share_topic":"%{shortcut} Chia sẻ bài viết","share_post":"%{shortcut} Chia sẻ bài viết","reply_as_new_topic":"%{shortcut} Trả lời như là một liên kết đến bài viết","reply_topic":"%{shortcut} Trả lời bài viết","reply_post":"%{shortcut} Trả lời bài viết","quote_post":"%{shortcut} Trích dẫn bài viết","like":"%{shortcut} Thích bài viết","flag":"%{shortcut} Đánh dấu bài viết","bookmark":"%{shortcut} Đánh dấu bài viết","edit":"%{shortcut} Sửa bài viết","delete":"%{shortcut} Xóa bài viết","mark_muted":"%{shortcut} Mute topic","mark_regular":"%{shortcut} Chủ đề thông thường (mặc định)","mark_tracking":"%{shortcut} Theo dõi chủ đề","mark_watching":"%{shortcut} theo dõi chủ đề","print":"%{shortcut} In chủ đề","defer":"%{shortcut} Trì hoãn chủ đề","topic_admin_actions":"%{shortcut} Hành động quản trị chủ đề mở"},"search_menu":{"title":"Menu Tìm kiếm","prev_next":"%{shortcut} Di chuyển lựa chọn lên và xuống","insert_url":"%{shortcut} Chèn lựa chọn vào trình chỉnh sửa nội dung"}},"badges":{"earned_n_times":{"other":"Đã giành được huy hiệu này %{count} lần"},"granted_on":"Cấp ngày %{date}","others_count":"Người có huy hiệu này (%{count})","title":"Huy hiệu","allow_title":"Bạn có thể sử dụng huy hiệu này làm tiêu đề","multiple_grant":"Bạn có thể có được nhiều lần","badge_count":{"other":"%{count} huy hiệu"},"more_badges":{"other":"+%{count} Khác"},"granted":{"other":"%{count} được cấp"},"select_badge_for_title":"Chọn huy hiệu để sử dụng như là tên","none":"(không có gì)","successfully_granted":"Đã cấp %{badge} cho %{username}","badge_grouping":{"getting_started":{"name":"Bắt đầu"},"community":{"name":"Cộng đồng"},"trust_level":{"name":"Cấp độ tin tưởng"},"other":{"name":"Khác"},"posting":{"name":"Gửi bài"}}},"tagging":{"all_tags":"Tất cả thẻ","other_tags":"Các thẻ khác","selector_all_tags":"tất cả thẻ","selector_no_tags":"không có thẻ","changed":"thẻ đã đổi:","tags":"Thẻ","choose_for_topic":"thẻ không bắt buộc","info":"Thông tin","default_info":"Thẻ này không bị giới hạn đối với bất kỳ danh mục nào và không có từ đồng nghĩa.","category_restricted":"Thẻ này bị hạn chế đối với các danh mục bạn không có quyền truy cập.","synonyms":"Từ đồng nghĩa","synonyms_description":"Khi các thẻ sau được sử dụng, chúng sẽ được thay thế bằng \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"other":"Thẻ này thuộc các nhóm sau: %{tag_groups}."},"category_restrictions":{"other":"Nó chỉ có thể được sử dụng trong các danh mục sau:"},"edit_synonyms":"Quản lý từ đồng nghĩa","add_synonyms_label":"Thêm từ đồng nghĩa:","add_synonyms":"Thêm","add_synonyms_explanation":{"other":"Bất kỳ nơi nào hiện đang sử dụng các thẻ này sẽ được chuyển thành sử dụng \u003cb\u003e%{tag_name}\u003c/b\u003e. Bạn có chắc chắn muốn thực hiện thay đổi này không?"},"add_synonyms_failed":"Không thể thêm các thẻ sau dưới dạng từ đồng nghĩa: \u003cb\u003e%{tag_names}\u003c/b\u003e. Đảm bảo chúng không có từ đồng nghĩa và không phải từ đồng nghĩa của thẻ khác.","remove_synonym":"Xóa từ đồng nghĩa","delete_synonym_confirm":"Bạn có chắc chắn muốn xóa từ đồng nghĩa \"%{tag_name}\" không?","delete_tag":"Xoá thẻ","delete_confirm":{"other":"Bạn có chắc chắn muốn xóa thẻ này và xóa thẻ khỏi %{count} chủ đề mà thẻ được chỉ định không?"},"delete_confirm_no_topics":"Bạn có chắc chắn muốn xóa thẻ này không?","delete_confirm_synonyms":{"other":"%{count} từ đồng nghĩa của nó cũng sẽ bị xóa."},"rename_tag":"Đổi tên thẻ","rename_instructions":"Chọn tên mới cho thẻ:","sort_by":"Xếp theo:","sort_by_count":"đếm","sort_by_name":"tên","manage_groups":"Quản lý nhóm thẻ","manage_groups_description":"Xác định các nhóm để sắp xếp các thẻ","upload":"Tải lên thẻ","upload_description":"Tải lên tệp csv để tạo hàng loạt thẻ","upload_instructions":"Một trên mỗi dòng, tùy chọn với một nhóm thẻ ở định dạng 'tag_name, tag_group'.","upload_successful":"Các thẻ đã được tải lên thành công","delete_unused_confirmation":{"other":"%{count} thẻ sẽ bị xóa: %{tags}"},"delete_unused_confirmation_more_tags":{"other":"%{tags} và %{count} nữa"},"delete_no_unused_tags":"Không có thẻ không sử dụng.","delete_unused":"Xóa thẻ không sử dụng","delete_unused_description":"Xóa tất cả các thẻ không được đính kèm với bất kỳ chủ đề hoặc tin nhắn cá nhân nào","cancel_delete_unused":"Hủy","filters":{"without_category":"%{filter} %{tag} chủ đề","with_category":"%{filter} %{tag} chủ đề trong %{category}","untagged_without_category":"%{filter} chủ đề chưa được gắn thẻ","untagged_with_category":"%{filter} chủ đề chưa được gắn thẻ trong %{category}"},"notifications":{"watching":{"title":"Đang theo dõi","description":"Bạn sẽ tự động xem tất cả các chủ đề có thẻ này. Bạn sẽ được thông báo về tất cả các bài đăng và chủ đề mới, với bài viết chưa đọc và các bài đăng mới cũng sẽ xuất hiện bên cạnh chủ đề."},"watching_first_post":{"title":"Xem bài viết đầu tiên","description":"Bạn sẽ được thông báo về các chủ đề mới trong thẻ này nhưng không có câu trả lời cho các chủ đề."},"tracking":{"title":"Đang theo dõi","description":"Bạn sẽ tự động theo dõi tất cả các chủ đề với thẻ này. Một số bài viết chưa đọc và bài viết mới sẽ xuất hiện bên cạnh chủ đề."},"regular":{"title":"Thường xuyên","description":"Bạn sẽ được thông báo nếu ai đó đề cập đến @name của bạn hoặc trả lời bài đăng của bạn."},"muted":{"title":"Im lặng","description":"Bạn sẽ không được thông báo về bất cứ điều gì về các chủ đề mới với thẻ này và chúng sẽ không xuất hiện trên tab chưa đọc của bạn."}},"groups":{"title":"Nhóm thẻ","new":"Nhóm mới","one_per_topic_label":"Giới hạn một thẻ cho mỗi chủ đề từ nhóm này","new_name":"Nhóm thẻ mới","save":"Lưu","delete":"Xoá","confirm_delete":"Bạn có chắc chắn muốn xóa nhóm thẻ này không?","everyone_can_use":"Mọi người đều có thể sử dụng thẻ","usable_only_by_groups":"Tất cả mọi người đều có thể nhìn thấy thẻ, nhưng chỉ những nhóm sau mới có thể sử dụng chúng","visible_only_to_groups":"Thẻ chỉ hiển thị cho các nhóm sau","cannot_save":"Không thể lưu nhóm thẻ. Đảm bảo rằng có ít nhất một thẻ hiện diện, tên nhóm thẻ không trống và một nhóm được chọn cho quyền đối với thẻ."},"topics":{"none":{"unread":"Bạn không có chủ đề chưa đọc này","new":"Bạn không có chủ đề mới","read":"Bạn chưa đọc chủ đề nào","posted":"Bạn chưa gửi bài trong bất kì chủ đề nào","latest":"Không có chủ đề mới nhất","bookmarks":"Bạn chưa chủ đề nào được đánh dấu.","top":"Không có chủ đề top."}}},"invite":{"custom_message":"Làm cho lời mời của bạn trở nên cá nhân hơn một chút bằng cách viết \u003ca href\u003etin nhắn tùy chỉnh\u003c/a\u003e.","custom_message_placeholder":"Nhập thông điệp tùy chỉnh của bạn","custom_message_template_forum":"Hey, bạn nên tham gia diễn đàn này!","custom_message_template_topic":"Hey, tôi nghĩ bạn có thể thích chủ đề này!"},"forced_anonymous":"Do quá tải, thông báo này tạm thời được hiển thị cho mọi người.","footer_nav":{"back":"Quay lại","forward":"Chuyển tiếp","share":"Chia sẻ","dismiss":"Hủy bỏ"},"safe_mode":{"enabled":"Chế độ an toàn được bật, để thoát khỏi chế độ an toàn, hãy đóng cửa sổ trình duyệt này"},"image_removed":"(hình ảnh đã bị xóa)","do_not_disturb":{"title":"Không làm phiền...","label":"Không làm phiền","remaining":"còn lại %{remaining}","options":{"half_hour":"30 phút","one_hour":"1 tiếng","two_hours":"2 tiếng","tomorrow":"Cho tới ngày mai","custom":"Tùy biến"}},"trust_levels":{"names":{"newuser":"thành viên mới","basic":"thành viên cơ bản","member":"thành viên","regular":"thường xuyên","leader":"người khởi xướng"}},"cakeday":{"today":"Hôm nay","tomorrow":"Ngày mai","upcoming":"Sắp tới","all":"Tất cả"},"birthdays":{"title":"Sinh nhật","month":{"title":"Sinh nhật trong tháng của","empty":"Không có thành viên nào có sinh nhật tháng này."}},"details":{"title":"Ẩn thông tin"},"discourse_local_dates":{"relative_dates":{"today":"%{time} hôm nay","tomorrow":"%{time} ngày mai","yesterday":"%{time} hôm qua","countdown":{"passed":"ngày qua"}},"title":"Chèn ngày / giờ","create":{"form":{"insert":"Chèn","advanced_mode":"Chế độ nâng cao","simple_mode":"Chế độ đơn giản","format_description":"Định dạng được sử dụng để hiển thị ngày cho người dùng. Sử dụng Z để hiển thị độ lệch và zz cho tên múi giờ.","timezones_title":"Múi giờ hiển thị","timezones_description":"Múi giờ sẽ được sử dụng để hiển thị ngày trong bản xem trước và dự phòng.","recurring_title":"Tái diễn","recurring_description":"Xác định sự lặp lại của một sự kiện. Bạn cũng có thể chỉnh sửa thủ công tùy chọn định kỳ do biểu mẫu tạo và sử dụng một trong các khóa sau: năm, quý, tháng, tuần, ngày, giờ, phút, giây, mili giây.","recurring_none":"Không tái diễn","invalid_date":"Ngày không hợp lệ, hãy đảm bảo ngày và giờ chính xác","date_title":"Ngày","time_title":"Thời gian","format_title":"Định dạng ngày","timezone":"Múi giờ","until":"Cho đến khi...","recurring":{"every_day":"Mỗi ngày","every_week":"Mỗi tuần","every_two_weeks":"Mỗi hai tuần","every_month":"Mỗi tháng","every_two_months":"Mỗi hai tháng","every_three_months":"Mỗi ba tháng","every_six_months":"Mỗi sáu tháng","every_year":"Mỗi năm"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Bật hướng dẫn cho tất cả người dùng mới","welcome_message":"Gửi tin nhắn chào mừng cho tất cả thành viên mới kèm theo hướng dẫn bắt đầu."}},"presence":{"replying":{"other":"Đang trả lời"},"editing":{"other":"Đang chỉnh sửa"},"replying_to_topic":{"other":"đang trả lời"}},"poll":{"voters":{"other":"người bình chọn"},"total_votes":{"other":"tổng số bình chọn"},"average_rating":"Trung bình: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Bình chọn \u003cstrong\u003ecông khai\u003c/strong\u003e"},"multiple":{"help":{"at_least_min_options":{"other":"Chọn ít nhất \u003cstrong\u003e%{count}\u003c/strong\u003e tùy chọn."},"up_to_max_options":{"other":"Chọn tối đa \u003cstrong\u003e%{count}\u003c/strong\u003e tùy chọn."},"x_options":{"other":"Chọn \u003cstrong\u003e%{count}\u003c/strong\u003e tùy chọn."}}},"cast-votes":{"title":"Thay đổi bình chọn của bạn","label":"Bình chọn ngay!"},"show-results":{"title":"Hiển thị kết quả thăm dò","label":"Hiện kết quả"},"hide-results":{"title":"Trở lại bình chọn của bạn"},"export-results":{"label":"Xuất"},"open":{"title":"Mở thăm dò","label":"Mở","confirm":"Bạn có muốn mở thăm dò này?"},"close":{"title":"Đóng thăm dò","label":"Đóng","confirm":"Bạn có muốn đóng thăm dò này ?"},"breakdown":{"count":"Đếm"},"error_while_toggling_status":"Đã có lỗi xảy ra khi chuyển trạng thái của thăm dò.","error_while_casting_votes":"Đã có lỗi xảy ra làm ảnh hưởng đến bình chọn của bạn.","error_while_fetching_voters":"Đã có lỗi xảy ra khi hiển thị những người tham gia bình chọn.","ui_builder":{"title":"Tạo thăm dò","insert":"Chèn thăm dò","help":{"invalid_values":"Giá trị nhỏ nhất phải nhỏ hơn giá trị lớn nhất.","min_step_value":"Khoảng cách tối thiểu là 1"},"poll_type":{"label":"Loại","regular":"Một lựa chọn","multiple":"Nhiều lựa chọn","number":"Xếp hạng"},"poll_config":{"step":"Bước"},"poll_public":{"label":"Hiển thị người đã bình chọn"}}},"styleguide":{"sections":{"typography":{"example":"Chào mừng đến với Discourse"},"date_time_inputs":{"title":"Ngày/giờ nhập"},"colors":{"title":"Màu sắc"},"categories":{"title":"Chuyên mục"},"navigation":{"title":"Điều hướng"},"navigation_stacked":{"title":"Điều hướng xếp chồng lên nhau"},"categories_list":{"title":"Danh sách Danh mục"},"topic_statuses":{"title":"Trạng thái chủ đề"},"post":{"title":"Bài đăng"},"suggested_topics":{"title":"Chủ đề tương tự"},"modal":{"title":"Phương thức"}}}}},"en":{"js":{"number":{"human":{"storage_units":{"units":{"byte":{"one":"Byte"}}}}},"dates":{"tiny":{"less_than_x_seconds":{"one":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m"},"about_x_hours":{"one":"%{count}h"},"x_days":{"one":"%{count}d"},"x_months":{"one":"%{count}mon"},"about_x_years":{"one":"%{count}y"},"over_x_years":{"one":"\u003e %{count}y"},"almost_x_years":{"one":"%{count}y"}},"medium":{"x_minutes":{"one":"%{count} min"},"x_hours":{"one":"%{count} hour"},"x_days":{"one":"%{count} day"}},"medium_with_ago":{"x_minutes":{"one":"%{count} min ago"},"x_hours":{"one":"%{count} hour ago"},"x_days":{"one":"%{count} day ago"},"x_months":{"one":"%{count} month ago"},"x_years":{"one":"%{count} year ago"}},"later":{"x_days":{"one":"%{count} day later"},"x_months":{"one":"%{count} month later"},"x_years":{"one":"%{count} year later"}}},"software_update_prompt":{"message":"We've updated this site, \u003cspan\u003eplease refresh\u003c/span\u003e, or you may experience unexpected behavior."},"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined."},"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)"}},"clear_input":"Clear input","links_lowercase":{"one":"link"},"x_more":{"one":"%{count} More"},"character_count":{"one":"%{count} character"},"about":{"stat":{"last_day":"Last 24 hours","last_7_days":"Last 7 days","last_30_days":"Last 30 days"}},"drafts":{"abandon":{"confirm":"You have a draft in progress for this topic. What would you like to do with it?","no_value":"Resume editing"}},"topic_count_latest":{"one":"See %{count} new or updated topic"},"topic_count_unread":{"one":"See %{count} unread topic"},"topic_count_new":{"one":"See %{count} new topic"},"processing_filename":"Processing: %{filename}...","review":{"stale_help":"This reviewable has been resolved by someone else.","topic_has_pending":{"one":"This topic has \u003cb\u003e%{count}\u003c/b\u003e post pending approval"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"},"agreed":{"one":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore"}},"topics":{"unique_users":{"one":"%{count} user"}},"replies":{"one":"%{count} reply"},"approval":{"pending_posts":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e post pending."}},"reject_reason":{"title":"Why are you rejecting this user?","send_email":"Send rejection email"}},"relative_time_picker":{"minutes":{"one":"minute"},"hours":{"one":"hour"},"days":{"one":"day"},"months":{"one":"month","other":"months"},"years":{"one":"year","other":"years"},"relative":"Relative"},"time_shortcut":{"relative":"Relative time","none":"None needed","last_custom":"Last custom datetime"},"directory":{"total_rows":{"one":"%{count} user"},"edit_columns":{"title":"Edit Directory Columns"}},"groups":{"add_members":{"usernames":{"title":"Enter usernames"}},"manage":{"email":{"enable_smtp":"Enable SMTP","enable_imap":"Enable IMAP","test_settings":"Test Settings","settings_required":"All settings are required, please fill in all fields before validation.","smtp_settings_valid":"SMTP settings valid.","smtp_title":"SMTP","smtp_instructions":"When you enable SMTP for the group, all outbound emails sent from the group's inbox will be sent via the SMTP settings specified here instead of the mail server configured for other emails sent by your forum.","imap_title":"IMAP","imap_additional_settings":"Additional Settings","imap_instructions":"When you enable IMAP for the group, emails are synced between the group inbox and the provided IMAP server and mailbox. SMTP must be enabled with valid and tested credentials before IMAP can be enabled. The email username and password used for SMTP will be used for IMAP. For more information see \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003efeature announcement on Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Warning: This is an alpha-stage feature. Only Gmail is officially supported. Use at your own risk!","imap_settings_valid":"IMAP settings valid.","smtp_disable_confirm":"If you disable SMTP, all SMTP and IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_disable_confirm":"If you disable IMAP all IMAP settings will be reset and the associated functionality will be disabled. Are you sure you want to continue?","imap_mailbox_not_selected":"You must select a Mailbox for this IMAP configuration or no mailboxes will be synced!","prefill":{"title":"Prefill with settings for:","gmail":"GMail"},"settings":{"allow_unknown_sender_topic_replies":"Allow unknown sender topic replies.","allow_unknown_sender_topic_replies_hint":"Allows unknown senders to reply to group topics. If this is not enabled, replies from email addresses not already included on the IMAP email thread or invited to the topic will create a new topic."},"mailboxes":{"disabled":"Disabled"}}},"title":{"one":"Group"},"members":{"make_primary":"Make Primary","make_primary_description":"Make this the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Remove as Primary","remove_primary_description":"Remove this as the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Remove Members","remove_members_description":"Remove selected users from this group","make_owners":"Make Owners","make_owners_description":"Make selected users owners of this group","remove_owners":"Remove Owners","remove_owners_description":"Remove selected users as owners of this group","make_all_primary":"Make All Primary","make_all_primary_description":"Make this the primary group for all selected users","remove_all_primary":"Remove as Primary","remove_all_primary_description":"Remove this group as primary","primary":"Primary"}},"categories":{"topic_sentence":{"one":"%{count} topic"},"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month."}},"user":{"notification_schedule":{"title":"Notification Schedule","label":"Enable custom notification schedule","tip":"Outside of these hours you will be put in 'do not disturb' automatically.","midnight":"Midnight","tuesday":"Tuesday","wednesday":"Wednesday","thursday":"Thursday","friday":"Friday","saturday":"Saturday","sunday":"Sunday"},"read_help":"Recently read topics","no_messages_title":"You don’t have any messages","no_messages_body":"Need to have a direct personal conversation with someone, outside the normal conversational flow? Message them by selecting their avatar and using the %{icon} message button.\u003cbr\u003e\u003cbr\u003e If you need help, you can \u003ca href='%{aboutUrl}'\u003emessage a staff member\u003c/a\u003e.\n","no_bookmarks_title":"You haven’t bookmarked anything yet","no_bookmarks_body":"Start bookmarking posts with the %{icon} button and they will be listed here for easy reference. You can schedule a reminder too!\n","no_notifications_title":"You don’t have any notifications yet","no_notifications_body":"You will be notified in this panel about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","skip_new_user_tips":{"read_later":"I'll read it later."},"color_schemes":{"default_description":"Theme default"},"second_factor_backup":{"manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."}},"change_avatar":{"logo_small":"Site's small logo. Used by default."},"email":{"auth_override_instructions":"Email can be updated from authentication provider.","invite_auth_email_invalid":"Your invitation email does not match the email authenticated by %{provider}","authenticated_by_invite":"Your email has been authenticated by the invitation","frequency":{"one":"We'll only email you if we haven't seen you in the last minute."}},"username":{"edit":"Edit username"},"invited":{"expired_tab":"Expired","expired_tab_with_count":"Expired (%{count})","invited_via_link":"link %{key} (%{count} / %{max} redeemed)","sent":"Created/Last Sent","copy_link":"Get Link","reinvite":"Resend Email","removed":"Removed","truncated":{"one":"Showing the first invite."},"reinvite_all":"Resend All Invites","reinvited_all":"All Invites Sent!","invite":{"new_title":"Create Invite","edit_title":"Edit Invite","instructions":"Share this link to instantly grant access to this site","copy_link":"copy link","expires_in_time":"Expires in %{time}","expired_at_time":"Expired at %{time}","show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options","restrict_email":"Restrict to one email address","max_redemptions_allowed":"Max uses","add_to_groups":"Add to groups","invite_to_topic":"Arrive at this topic","expires_at":"Expire after","custom_message":"Optional personal message","invite_copied":"Invite link copied."},"bulk_invite":{"instructions":"\u003cp\u003eInvite a list of users to get your community going quickly. Prepare a \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV file\u003c/a\u003e containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eEvery email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.\u003c/p\u003e\n","progress":"Uploaded %{progress}%...","success":"File uploaded successfully. You will be notified via message when the process is complete."}},"summary":{"topic_count":{"one":"topic created"},"post_count":{"one":"post created"},"likes_given":{"one":"given"},"likes_received":{"one":"received"},"days_visited":{"one":"day visited"},"topics_entered":{"one":"topic viewed"},"posts_read":{"one":"post read"},"bookmark_count":{"one":"bookmark"}},"avatar":{"name_and_description":"%{name} - %{description}","edit":"Edit Profile Picture"},"storage_token":{"title":"Storage server access key","instructions":"Secret key used for the authentication on storage.confais.org."}},"assets_changed_confirm":"This site just received a software upgrade. Get the latest version now?","replies_lowercase":{"one":"reply"},"signup_cta":{"hidden_for_session":"OK, we'll ask you tomorrow. You can always use 'Log In' to create an account, too."},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply."}},"create_account":{"subheader_title":"Let's create your account","title":"Create your account"},"email_login":{"login_link":"Skip the password; email me a login link"},"login":{"header_title":"Welcome back","subheader_title":"Log in to your account","title":"Log in","email_placeholder":"Email / Username"},"category_row":{"topic_count":{"one":"%{count} topic in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory"},"plus_subcategories":{"one":"+ %{count} subcategory"}},"select_kit":{"filter_by":"Filter by: %{name}","select_to_filter":"Select a value to filter","max_content_reached":{"one":"You can only select %{count} item."},"min_content_not_reached":{"one":"Select at least %{count} item."},"invalid_selection_length":{"one":"Selection must be at least %{count} character."},"components":{"tag_drop":{"filter_for_more":"Filter for more..."}}},"shared_drafts":{"notice":"This topic is only visible to those who can publish shared drafts."},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified."},"group_mentioned":{"one":"By mentioning %{group}, you are about to notify \u003ca href='%{group_link}'\u003e%{count} person\u003c/a\u003e – are you sure?"},"error":{"title_too_short":{"one":"Title must be at least %{count} character"},"title_too_long":{"one":"Title can't be more than %{count} character"},"post_length":{"one":"Post must be at least %{count} character"},"tags_missing":{"one":"You must choose at least %{count} tag"}},"show_preview":"show preview","hide_preview":"hide preview","slow_mode":{"error":"This topic is in slow mode. You already posted recently; you can post again in %{timeLeft}."}},"notifications":{"tooltip":{"regular":{"one":"%{count} unseen notification"},"message":{"one":"%{count} unread message"},"high_priority":{"one":"%{count} unread high priority notification"}},"liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"liked %{count} of your posts"},"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'"},"group_message_summary":{"one":"%{count} message in your %{group_name} inbox"}},"upload_selector":{"remote_tip_with_attachments":"link to image or file","local_tip_with_attachments":"select images or files from your device","hint":"(you can also drag \u0026 drop into the editor to upload)","supported_formats":"supported formats"},"search":{"result_count":{"one":"\u003cspan\u003e%{count} result for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"}},"view_all":"view all %{tab}","topics":{"bulk":{"dismiss_read_with_selected":"Dismiss %{count} unread","dismiss_button_with_selected":"Dismiss (%{count})…","dismiss_new_with_selected":"Dismiss New (%{count})","change_notification_level":"Change Notification Level","selected":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e topic."},"remove_tags":"Remove All Tags","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from \u003cb\u003e%{count}\u003c/b\u003e topics. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic"}},"none":{"educate":{"unread":"\u003cp\u003eYour unread topics appear here.\u003c/p\u003e\u003cp\u003eBy default, topics are considered unread and will show unread counts \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e if you:\u003c/p\u003e\u003cul\u003e\u003cli\u003eCreated the topic\u003c/li\u003e\u003cli\u003eReplied to the topic\u003c/li\u003e\u003cli\u003eRead the topic for more than 4 minutes\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eOr if you have explicitly set the topic to Tracked or Watched via the 🔔 in each topic.\u003c/p\u003e\u003cp\u003eVisit your \u003ca href=\"%{userPrefsUrl}\"\u003epreferences\u003c/a\u003e to change this.\u003c/p\u003e"}}},"topic":{"filter_to":{"one":"%{count} post in topic"},"new_topics":{"one":"%{count} new topic"},"unread_topics":{"one":"%{count} unread topic"},"total_unread_posts":{"one":"you have %{count} unread post in this topic"},"unread_posts":{"one":"you have %{count} unread old post in this topic"},"new_posts":{"one":"there is %{count} new post in this topic since you last read it"},"likes":{"one":"there is %{count} like in this topic"},"collapse_details":"collapse topic details","expand_details":"expand topic details","slow_mode_update":{"update":"Update","enabled_until":"Enabled until:"},"slow_mode_notice":{"duration":"Please wait %{duration} between posts in this topic"},"topic_status_update":{"min_duration":"Duration must be greater than 0","max_duration":"Duration must be less than 20 years"},"auto_update_input":{"two_weeks":"Two weeks","two_months":"Two months","three_months":"Three months","four_months":"Four months","six_months":"Six months","one_year":"One year"},"auto_close":{"label":"Auto-close topic after:"},"auto_close_after_last_post":{"title":"Auto-Close Topic After Last Post"},"auto_close_immediate":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed immediately."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily.","other":"The last post in the topic is already %{count} hours old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post"}},"notifications":{"reasons":{"3_10_stale":"You will receive notifications because you were watching a tag on this topic in the past.","3_6_stale":"You will receive notifications because you were watching this category in the past.","2_8_stale":"You will see a count of new replies because you were tracking this category in the past."}},"share":{"instructions":"Share a link to this topic:","copied":"Topic link copied.","notify_users":{"title":"Notify","instructions":"Notify the following users about this topic:","success":{"one":"Successfully notified %{username} about this topic.","other":"Successfully notified all users about this topic."}}},"feature_topic":{"already_pinned":{"one":"Topics currently pinned in %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"},"already_pinned_globally":{"one":"Topics currently pinned globally: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"}},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link."},"filters":{"n_posts":{"one":"%{count} post"}},"split_topic":{"instructions":{"one":"You are about to create a new topic and populate it with the post you've selected."}},"merge_topic":{"instructions":{"one":"Please choose the topic you'd like to move that post to."}},"move_to_new_message":{"instructions":{"one":"You are about to create a new message and populate it with the post you've selected."}},"move_to_existing_message":{"instructions":{"one":"Please choose the message you'd like to move that post to."}},"change_owner":{"instructions":{"one":"Please choose a new owner for the post by \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Please choose a new owner for the post"}},"multi_select":{"description":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e post."}},"deleted_by_author_simple":"(topic deleted by author)"},"post":{"wiki_last_edited_on":"wiki last edited on %{dateTime}","last_edited_on":"post last edited on %{dateTime}","deleted_by_author_simple":"(post deleted by author)","gap":{"one":"view %{count} hidden reply"},"has_replies":{"one":"%{count} Reply"},"has_likes_title":{"one":"%{count} person liked this post"},"has_likes_title_you":{"one":"you and %{count} other person liked this post"},"filtered_replies_hint":{"one":"View this post and its reply"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to"},"view_all_posts":"View all posts","errors":{"too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time."}},"controls":{"delete_replies":{"direct_replies":{"one":"Yes, and %{count} direct reply"},"all_replies":{"one":"Yes, and %{count} reply"}},"delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"edit_timer":"edit timer"},"actions":{"people":{"like":{"one":"liked this"},"read":{"one":"read this"},"like_capped":{"one":"and %{count} other liked this"},"read_capped":{"one":"and %{count} other read this"}}},"delete":{"confirm":{"one":"Are you sure you want to delete that post?"}},"merge":{"confirm":{"one":"Are you sure you want to merge those posts?"}},"bookmarks":{"actions":{"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}}},"category":{"allow_unlimited_owner_edits_on_first_post":"Allow unlimited owner edits on first post","notifications":{"watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"colors_disabled":"You can’t select colors because you have a category style of none.","topic_list_previews_settings_heading":"Topic List Previews","topic_list_tiles":"Apply tiles arrangement to selected lists in this category.","topic_list_thumbnail":"Show topic preview thumbnails in selected lists in this category.","topic_list_excerpt":"Show topic excerpts in selected lists in this category.","topic_list_action":"Show like and bookmark buttons in selected lists in this category.","topic_list_default_thumbnail":"Image URL for thumbnail shown if topic in this category has no preview thumbnail set.","topic_list_default_thumbnail_placeholder":"Default thumbnail URL","topic_list_thumbnail_width":"Width of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_height":"Height of thumbnails in this category (rebake your posts if you change this).","topic_list_thumbnail_width_placeholder":"px","topic_list_thumbnail_height_placeholder":"px","topic_list_featured_images":"Enable featured images in this category."},"flagging":{"flag_for_review":"Queue For Review","custom_message":{"at_least":{"one":"enter at least %{count} character"},"more":{"one":"%{count} to go..."},"left":{"one":"%{count} remaining"}}},"topic_map":{"clicks":{"one":"%{count} click"}},"post_links":{"title":{"one":"%{count} more"}},"views_lowercase":{"one":"view"},"views_long":{"one":"this topic has been viewed %{count} time"},"likes_lowercase":{"one":"like"},"users_lowercase":{"one":"user"},"history":"History, last 100 revisions","filters":{"latest":{"title_with_count":{"one":"Latest (%{count})"}},"unread":{"title_with_count":{"one":"Unread (%{count})"},"lower_title_with_count":{"one":"%{count} unread"}},"new":{"lower_title_with_count":{"one":"%{count} new"},"title_with_count":{"one":"New (%{count})"}},"category":{"title_with_count":{"one":"%{categoryName} (%{count})"}}},"cannot_render_video":"This video cannot be rendered because your browser does not support the codec.","badges":{"earned_n_times":{"one":"Earned this badge %{count} time"},"badge_count":{"one":"%{count} Badge"},"more_badges":{"one":"+%{count} More"},"granted":{"one":"%{count} granted"},"favorite_max_reached":"You can’t favorite more badges.","favorite_max_not_reached":"Mark this badge as favorite","favorite_count":"%{count}/%{max} badges marked as favorite"},"tagging":{"tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\"."},"category_restrictions":{"one":"It can only be used in this category:"},"add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"delete_confirm":{"one":"Are you sure you want to delete this tag and remove it from %{count} topic it is assigned to?"},"delete_confirm_synonyms":{"one":"Its synonym will also be deleted."},"delete_unused_confirmation":{"one":"%{count} tag will be deleted: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} and %{count} more"},"tag_list_joiner":", ","groups":{"about_heading":"Select a tag group or create a new one","about_heading_empty":"Create a new tag group to get started","about_description":"Tag groups help you manage permissions for many tags in one place.","new_title":"Create New Group","edit_title":"Edit Tag Group","tags_label":"Tags in this group","parent_tag_label":"Parent tag","parent_tag_description":"Tags from this group can only be used if the parent tag is present.","name_placeholder":"Name","tags_placeholder":"Search or create tags","parent_tag_placeholder":"Optional","select_groups_placeholder":"Select groups...","disabled":"Tagging is disabled. "}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite."},"forced_anonymous_login_required":"The site is under extreme load and cannot be loaded at this time, try again in a few minutes.","do_not_disturb":{"set_schedule":"Set a notification schedule"},"trust_levels":{"detailed_name":"%{level}: %{name}"},"cakeday":{"none":" ","title":"Cakeday"},"birthdays":{"upcoming":{"title":"Birthdays for %{start_date} - %{end_date}","empty":"There are no users celebrating their birthdays in the next 7 days."},"today":{"title":"Birthdays for %{date}","empty":"There are no users celebrating their birthdays today."},"tomorrow":{"empty":"There are no users celebrating their birthdays tomorrow."}},"anniversaries":{"title":"Anniversaries","month":{"title":"Anniversaries in the Month of","empty":"There are no users celebrating their anniversaries this month."},"upcoming":{"title":"Anniversaries for %{start_date} - %{end_date}","empty":"There are no users celebrating their anniversaries in the next 7 days."},"today":{"title":"Anniversaries for %{date}","empty":"There are no users celebrating their anniversaries today."},"tomorrow":{"empty":"There are no users celebrating their anniversaries tomorrow."}},"presence":{"replying":{"one":"replying"},"editing":{"one":"editing"},"replying_to_topic":{"one":"replying"}},"tlp":{"user_prefs":{"title":"Topic List Previews User Preferences","prefer_low_res_thumbnail":"Prefer low res thumbnails in Topic Lists and Featured Images (can be overruled by admin)"}},"user_activity_portfolio":{"title":"Portfolio"},"thumbnail_selector":{"select_preview_button":"Select thumbnail","title":"Select the desired preview thumbnail","topic_title_prefix":"... for Topic:"},"poll":{"voters":{"one":"voter"},"total_votes":{"one":"total vote"},"results":{"groups":{"title":"You need to be a member of %{groups} to vote in this poll."},"vote":{"title":"Results will be shown on \u003cstrong\u003evote\u003c/strong\u003e."},"closed":{"title":"Results will be shown once \u003cstrong\u003eclosed\u003c/strong\u003e."},"staff":{"title":"Results are only shown to \u003cstrong\u003estaff\u003c/strong\u003e members."}},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"between_min_and_max_options":"Choose between \u003cstrong\u003e%{min}\u003c/strong\u003e and \u003cstrong\u003e%{max}\u003c/strong\u003e options."}},"hide-results":{"label":"Show vote"},"group-results":{"title":"Group votes by user field","label":"Show breakdown"},"export-results":{"title":"Export the poll results"},"automatic_close":{"closes_in":"Closes in \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Closed \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Poll results","votes":"%{count} votes","breakdown":"Breakdown","percentage":"Percentage"},"error_while_exporting_results":"Sorry, there was an error exporting poll results.","ui_builder":{"help":{"options_min_count":"Enter at least 1 option.","options_max_count":"Enter at most %{count} options.","invalid_min_value":"Minimum value must be at least 1.","invalid_max_value":"Maximum value must be at least 1, but less than or equal with the number of options."},"poll_result":{"label":"Show Results...","always":"Always visible","vote":"Only after voting","closed":"When the poll is closed","staff":"Staff only"},"poll_groups":{"label":"Limit voting to these groups"},"poll_chart_type":{"label":"Result chart","bar":"Bar","pie":"Pie"},"poll_config":{"max":"Max Choices","min":"Min Choices"},"poll_title":{"label":"Title (optional)"},"poll_options":{"label":"Options (one per line)","add":"Add option"},"automatic_close":{"label":"Automatically close poll"},"show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options"}},"styleguide":{"title":"Styleguide","welcome":"To get started, choose a section from the menu on the left.","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"font_scale":{"title":"Font System"},"icons":{"title":"Icons","full_list":"See the full list of Font Awesome Icons"},"input_fields":{"title":"Input Fields"},"buttons":{"title":"Buttons"},"dropdowns":{"title":"Dropdowns"},"bread_crumbs":{"title":"Bread Crumbs"},"navigation_bar":{"title":"Navigation Bar"},"topic_link":{"title":"Topic Link"},"topic_list_item":{"title":"Topic List Item"},"topic_list":{"title":"Topic List"},"basic_topic_list":{"title":"Basic Topic List"},"footer_message":{"title":"Footer Message"},"signup_cta":{"title":"Signup CTA"},"topic_timer_info":{"title":"Topic Timers"},"topic_footer_buttons":{"title":"Topic Footer Buttons"},"topic_notifications":{"title":"Topic Notifications"},"topic_map":{"title":"Topic Map"},"site_header":{"title":"Site Header"},"post_menu":{"title":"Post Menu"},"modal":{"header":"Modal Title","footer":"Modal Footer"},"user_about":{"title":"User About Box"},"header_icons":{"title":"Header Icons"},"spinners":{"title":"Spinners"}}}}}};
I18n.locale = 'vi';
I18n.pluralizationRules.vi = MessageFormat.locale.vi;
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
//! locale : Vietnamese [vi]
//! author : Bang Nguyen : https://github.com/bangnk
//! author : Chien Kira : https://github.com/chienkira

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var vi = moment.defineLocale('vi', {
        months: 'tháng 1_tháng 2_tháng 3_tháng 4_tháng 5_tháng 6_tháng 7_tháng 8_tháng 9_tháng 10_tháng 11_tháng 12'.split(
            '_'
        ),
        monthsShort: 'Thg 01_Thg 02_Thg 03_Thg 04_Thg 05_Thg 06_Thg 07_Thg 08_Thg 09_Thg 10_Thg 11_Thg 12'.split(
            '_'
        ),
        monthsParseExact: true,
        weekdays: 'chủ nhật_thứ hai_thứ ba_thứ tư_thứ năm_thứ sáu_thứ bảy'.split(
            '_'
        ),
        weekdaysShort: 'CN_T2_T3_T4_T5_T6_T7'.split('_'),
        weekdaysMin: 'CN_T2_T3_T4_T5_T6_T7'.split('_'),
        weekdaysParseExact: true,
        meridiemParse: /sa|ch/i,
        isPM: function (input) {
            return /^ch$/i.test(input);
        },
        meridiem: function (hours, minutes, isLower) {
            if (hours < 12) {
                return isLower ? 'sa' : 'SA';
            } else {
                return isLower ? 'ch' : 'CH';
            }
        },
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD/MM/YYYY',
            LL: 'D MMMM [năm] YYYY',
            LLL: 'D MMMM [năm] YYYY HH:mm',
            LLLL: 'dddd, D MMMM [năm] YYYY HH:mm',
            l: 'DD/M/YYYY',
            ll: 'D MMM YYYY',
            lll: 'D MMM YYYY HH:mm',
            llll: 'ddd, D MMM YYYY HH:mm',
        },
        calendar: {
            sameDay: '[Hôm nay lúc] LT',
            nextDay: '[Ngày mai lúc] LT',
            nextWeek: 'dddd [tuần tới lúc] LT',
            lastDay: '[Hôm qua lúc] LT',
            lastWeek: 'dddd [tuần trước lúc] LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: '%s tới',
            past: '%s trước',
            s: 'vài giây',
            ss: '%d giây',
            m: 'một phút',
            mm: '%d phút',
            h: 'một giờ',
            hh: '%d giờ',
            d: 'một ngày',
            dd: '%d ngày',
            w: 'một tuần',
            ww: '%d tuần',
            M: 'một tháng',
            MM: '%d tháng',
            y: 'một năm',
            yy: '%d năm',
        },
        dayOfMonthOrdinalParse: /\d{1,2}/,
        ordinal: function (number) {
            return number;
        },
        week: {
            dow: 1, // Monday is the first day of the week.
            doy: 4, // The week that contains Jan 4th is the first week of the year.
        },
    });

    return vi;

})));

// moment-timezone-localization for lang code: vi

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';


moment.tz.localizedNames = function() {
  return [{"value":"Africa/Abidjan","name":"Abidjan","id":"Africa/Abidjan"},{"value":"Africa/Accra","name":"Accra","id":"Africa/Accra"},{"value":"Africa/Addis_Ababa","name":"Addis Ababa","id":"Africa/Addis_Ababa"},{"value":"Africa/Algiers","name":"Algiers","id":"Africa/Algiers"},{"value":"Africa/Asmera","name":"Asmara","id":"Africa/Asmera"},{"value":"Africa/Bamako","name":"Bamako","id":"Africa/Bamako"},{"value":"Africa/Bangui","name":"Bangui","id":"Africa/Bangui"},{"value":"Africa/Banjul","name":"Banjul","id":"Africa/Banjul"},{"value":"Africa/Bissau","name":"Bissau","id":"Africa/Bissau"},{"value":"Africa/Blantyre","name":"Blantyre","id":"Africa/Blantyre"},{"value":"Africa/Brazzaville","name":"Brazzaville","id":"Africa/Brazzaville"},{"value":"Africa/Bujumbura","name":"Bujumbura","id":"Africa/Bujumbura"},{"value":"Africa/Cairo","name":"Cairo","id":"Africa/Cairo"},{"value":"Africa/Casablanca","name":"Casablanca","id":"Africa/Casablanca"},{"value":"Africa/Ceuta","name":"Ceuta","id":"Africa/Ceuta"},{"value":"Africa/Conakry","name":"Conakry","id":"Africa/Conakry"},{"value":"Africa/Dakar","name":"Dakar","id":"Africa/Dakar"},{"value":"Africa/Dar_es_Salaam","name":"Dar es Salaam","id":"Africa/Dar_es_Salaam"},{"value":"Africa/Djibouti","name":"Djibouti","id":"Africa/Djibouti"},{"value":"Africa/Douala","name":"Douala","id":"Africa/Douala"},{"value":"Africa/El_Aaiun","name":"El Aaiun","id":"Africa/El_Aaiun"},{"value":"Africa/Freetown","name":"Freetown","id":"Africa/Freetown"},{"value":"Africa/Gaborone","name":"Gaborone","id":"Africa/Gaborone"},{"value":"Africa/Harare","name":"Harare","id":"Africa/Harare"},{"value":"Africa/Johannesburg","name":"Johannesburg","id":"Africa/Johannesburg"},{"value":"Africa/Juba","name":"Juba","id":"Africa/Juba"},{"value":"Africa/Kampala","name":"Kampala","id":"Africa/Kampala"},{"value":"Africa/Khartoum","name":"Khartoum","id":"Africa/Khartoum"},{"value":"Africa/Kigali","name":"Kigali","id":"Africa/Kigali"},{"value":"Africa/Kinshasa","name":"Kinshasa","id":"Africa/Kinshasa"},{"value":"Africa/Lagos","name":"Lagos","id":"Africa/Lagos"},{"value":"Africa/Libreville","name":"Libreville","id":"Africa/Libreville"},{"value":"Africa/Lome","name":"Lome","id":"Africa/Lome"},{"value":"Africa/Luanda","name":"Luanda","id":"Africa/Luanda"},{"value":"Africa/Lubumbashi","name":"Lubumbashi","id":"Africa/Lubumbashi"},{"value":"Africa/Lusaka","name":"Lusaka","id":"Africa/Lusaka"},{"value":"Africa/Malabo","name":"Malabo","id":"Africa/Malabo"},{"value":"Africa/Maputo","name":"Maputo","id":"Africa/Maputo"},{"value":"Africa/Maseru","name":"Maseru","id":"Africa/Maseru"},{"value":"Africa/Mbabane","name":"Mbabane","id":"Africa/Mbabane"},{"value":"Africa/Mogadishu","name":"Mogadishu","id":"Africa/Mogadishu"},{"value":"Africa/Monrovia","name":"Monrovia","id":"Africa/Monrovia"},{"value":"Africa/Nairobi","name":"Nairobi","id":"Africa/Nairobi"},{"value":"Africa/Ndjamena","name":"Ndjamena","id":"Africa/Ndjamena"},{"value":"Africa/Niamey","name":"Niamey","id":"Africa/Niamey"},{"value":"Africa/Nouakchott","name":"Nouakchott","id":"Africa/Nouakchott"},{"value":"Africa/Ouagadougou","name":"Ouagadougou","id":"Africa/Ouagadougou"},{"value":"Africa/Porto-Novo","name":"Porto-Novo","id":"Africa/Porto-Novo"},{"value":"Africa/Sao_Tome","name":"São Tomé","id":"Africa/Sao_Tome"},{"value":"Africa/Tripoli","name":"Tripoli","id":"Africa/Tripoli"},{"value":"Africa/Tunis","name":"Tunis","id":"Africa/Tunis"},{"value":"Africa/Windhoek","name":"Windhoek","id":"Africa/Windhoek"},{"value":"America/Adak","name":"Adak","id":"America/Adak"},{"value":"America/Anchorage","name":"Anchorage","id":"America/Anchorage"},{"value":"America/Anguilla","name":"Anguilla","id":"America/Anguilla"},{"value":"America/Antigua","name":"Antigua","id":"America/Antigua"},{"value":"America/Araguaina","name":"Araguaina","id":"America/Araguaina"},{"value":"America/Argentina/La_Rioja","name":"La Rioja","id":"America/Argentina/La_Rioja"},{"value":"America/Argentina/Rio_Gallegos","name":"Rio Gallegos","id":"America/Argentina/Rio_Gallegos"},{"value":"America/Argentina/Salta","name":"Salta","id":"America/Argentina/Salta"},{"value":"America/Argentina/San_Juan","name":"San Juan","id":"America/Argentina/San_Juan"},{"value":"America/Argentina/San_Luis","name":"San Luis","id":"America/Argentina/San_Luis"},{"value":"America/Argentina/Tucuman","name":"Tucuman","id":"America/Argentina/Tucuman"},{"value":"America/Argentina/Ushuaia","name":"Ushuaia","id":"America/Argentina/Ushuaia"},{"value":"America/Aruba","name":"Aruba","id":"America/Aruba"},{"value":"America/Asuncion","name":"Asunción","id":"America/Asuncion"},{"value":"America/Bahia","name":"Bahia","id":"America/Bahia"},{"value":"America/Bahia_Banderas","name":"Bahia Banderas","id":"America/Bahia_Banderas"},{"value":"America/Barbados","name":"Barbados","id":"America/Barbados"},{"value":"America/Belem","name":"Belem","id":"America/Belem"},{"value":"America/Belize","name":"Belize","id":"America/Belize"},{"value":"America/Blanc-Sablon","name":"Blanc-Sablon","id":"America/Blanc-Sablon"},{"value":"America/Boa_Vista","name":"Boa Vista","id":"America/Boa_Vista"},{"value":"America/Bogota","name":"Bogota","id":"America/Bogota"},{"value":"America/Boise","name":"Boise","id":"America/Boise"},{"value":"America/Buenos_Aires","name":"Buenos Aires","id":"America/Buenos_Aires"},{"value":"America/Cambridge_Bay","name":"Cambridge Bay","id":"America/Cambridge_Bay"},{"value":"America/Campo_Grande","name":"Campo Grande","id":"America/Campo_Grande"},{"value":"America/Cancun","name":"Cancun","id":"America/Cancun"},{"value":"America/Caracas","name":"Caracas","id":"America/Caracas"},{"value":"America/Catamarca","name":"Catamarca","id":"America/Catamarca"},{"value":"America/Cayenne","name":"Cayenne","id":"America/Cayenne"},{"value":"America/Cayman","name":"Cayman","id":"America/Cayman"},{"value":"America/Chicago","name":"Chicago","id":"America/Chicago"},{"value":"America/Chihuahua","name":"Chihuahua","id":"America/Chihuahua"},{"value":"America/Coral_Harbour","name":"Atikokan","id":"America/Coral_Harbour"},{"value":"America/Cordoba","name":"Cordoba","id":"America/Cordoba"},{"value":"America/Costa_Rica","name":"Costa Rica","id":"America/Costa_Rica"},{"value":"America/Creston","name":"Creston","id":"America/Creston"},{"value":"America/Cuiaba","name":"Cuiaba","id":"America/Cuiaba"},{"value":"America/Curacao","name":"Curaçao","id":"America/Curacao"},{"value":"America/Danmarkshavn","name":"Danmarkshavn","id":"America/Danmarkshavn"},{"value":"America/Dawson","name":"Dawson","id":"America/Dawson"},{"value":"America/Dawson_Creek","name":"Dawson Creek","id":"America/Dawson_Creek"},{"value":"America/Denver","name":"Denver","id":"America/Denver"},{"value":"America/Detroit","name":"Detroit","id":"America/Detroit"},{"value":"America/Dominica","name":"Dominica","id":"America/Dominica"},{"value":"America/Edmonton","name":"Edmonton","id":"America/Edmonton"},{"value":"America/Eirunepe","name":"Eirunepe","id":"America/Eirunepe"},{"value":"America/El_Salvador","name":"El Salvador","id":"America/El_Salvador"},{"value":"America/Fort_Nelson","name":"Fort Nelson","id":"America/Fort_Nelson"},{"value":"America/Fortaleza","name":"Fortaleza","id":"America/Fortaleza"},{"value":"America/Glace_Bay","name":"Glace Bay","id":"America/Glace_Bay"},{"value":"America/Godthab","name":"Nuuk","id":"America/Godthab"},{"value":"America/Goose_Bay","name":"Goose Bay","id":"America/Goose_Bay"},{"value":"America/Grand_Turk","name":"Grand Turk","id":"America/Grand_Turk"},{"value":"America/Grenada","name":"Grenada","id":"America/Grenada"},{"value":"America/Guadeloupe","name":"Guadeloupe","id":"America/Guadeloupe"},{"value":"America/Guatemala","name":"Guatemala","id":"America/Guatemala"},{"value":"America/Guayaquil","name":"Guayaquil","id":"America/Guayaquil"},{"value":"America/Guyana","name":"Guyana","id":"America/Guyana"},{"value":"America/Halifax","name":"Halifax","id":"America/Halifax"},{"value":"America/Havana","name":"Havana","id":"America/Havana"},{"value":"America/Hermosillo","name":"Hermosillo","id":"America/Hermosillo"},{"value":"America/Indiana/Knox","name":"Knox, Indiana","id":"America/Indiana/Knox"},{"value":"America/Indiana/Marengo","name":"Marengo, Indiana","id":"America/Indiana/Marengo"},{"value":"America/Indiana/Petersburg","name":"Petersburg, Indiana","id":"America/Indiana/Petersburg"},{"value":"America/Indiana/Tell_City","name":"Tell City, Indiana","id":"America/Indiana/Tell_City"},{"value":"America/Indiana/Vevay","name":"Vevay, Indiana","id":"America/Indiana/Vevay"},{"value":"America/Indiana/Vincennes","name":"Vincennes, Indiana","id":"America/Indiana/Vincennes"},{"value":"America/Indiana/Winamac","name":"Winamac, Indiana","id":"America/Indiana/Winamac"},{"value":"America/Indianapolis","name":"Indianapolis","id":"America/Indianapolis"},{"value":"America/Inuvik","name":"Inuvik","id":"America/Inuvik"},{"value":"America/Iqaluit","name":"Iqaluit","id":"America/Iqaluit"},{"value":"America/Jamaica","name":"Jamaica","id":"America/Jamaica"},{"value":"America/Jujuy","name":"Jujuy","id":"America/Jujuy"},{"value":"America/Juneau","name":"Juneau","id":"America/Juneau"},{"value":"America/Kentucky/Monticello","name":"Monticello, Kentucky","id":"America/Kentucky/Monticello"},{"value":"America/Kralendijk","name":"Kralendijk","id":"America/Kralendijk"},{"value":"America/La_Paz","name":"La Paz","id":"America/La_Paz"},{"value":"America/Lima","name":"Lima","id":"America/Lima"},{"value":"America/Los_Angeles","name":"Los Angeles","id":"America/Los_Angeles"},{"value":"America/Louisville","name":"Louisville","id":"America/Louisville"},{"value":"America/Lower_Princes","name":"Lower Prince’s Quarter","id":"America/Lower_Princes"},{"value":"America/Maceio","name":"Maceio","id":"America/Maceio"},{"value":"America/Managua","name":"Managua","id":"America/Managua"},{"value":"America/Manaus","name":"Manaus","id":"America/Manaus"},{"value":"America/Marigot","name":"Marigot","id":"America/Marigot"},{"value":"America/Martinique","name":"Martinique","id":"America/Martinique"},{"value":"America/Matamoros","name":"Matamoros","id":"America/Matamoros"},{"value":"America/Mazatlan","name":"Mazatlan","id":"America/Mazatlan"},{"value":"America/Mendoza","name":"Mendoza","id":"America/Mendoza"},{"value":"America/Menominee","name":"Menominee","id":"America/Menominee"},{"value":"America/Merida","name":"Merida","id":"America/Merida"},{"value":"America/Metlakatla","name":"Metlakatla","id":"America/Metlakatla"},{"value":"America/Mexico_City","name":"Mexico City","id":"America/Mexico_City"},{"value":"America/Miquelon","name":"Miquelon","id":"America/Miquelon"},{"value":"America/Moncton","name":"Moncton","id":"America/Moncton"},{"value":"America/Monterrey","name":"Monterrey","id":"America/Monterrey"},{"value":"America/Montevideo","name":"Montevideo","id":"America/Montevideo"},{"value":"America/Montserrat","name":"Montserrat","id":"America/Montserrat"},{"value":"America/Nassau","name":"Nassau","id":"America/Nassau"},{"value":"America/New_York","name":"New York","id":"America/New_York"},{"value":"America/Nipigon","name":"Nipigon","id":"America/Nipigon"},{"value":"America/Nome","name":"Nome","id":"America/Nome"},{"value":"America/Noronha","name":"Noronha","id":"America/Noronha"},{"value":"America/North_Dakota/Beulah","name":"Beulah, Bắc Dakota","id":"America/North_Dakota/Beulah"},{"value":"America/North_Dakota/Center","name":"Center, Bắc Dakota","id":"America/North_Dakota/Center"},{"value":"America/North_Dakota/New_Salem","name":"New Salem, Bắc Dakota","id":"America/North_Dakota/New_Salem"},{"value":"America/Ojinaga","name":"Ojinaga","id":"America/Ojinaga"},{"value":"America/Panama","name":"Panama","id":"America/Panama"},{"value":"America/Pangnirtung","name":"Pangnirtung","id":"America/Pangnirtung"},{"value":"America/Paramaribo","name":"Paramaribo","id":"America/Paramaribo"},{"value":"America/Phoenix","name":"Phoenix","id":"America/Phoenix"},{"value":"America/Port-au-Prince","name":"Port-au-Prince","id":"America/Port-au-Prince"},{"value":"America/Port_of_Spain","name":"Port of Spain","id":"America/Port_of_Spain"},{"value":"America/Porto_Velho","name":"Porto Velho","id":"America/Porto_Velho"},{"value":"America/Puerto_Rico","name":"Puerto Rico","id":"America/Puerto_Rico"},{"value":"America/Punta_Arenas","name":"Punta Arenas","id":"America/Punta_Arenas"},{"value":"America/Rainy_River","name":"Rainy River","id":"America/Rainy_River"},{"value":"America/Rankin_Inlet","name":"Rankin Inlet","id":"America/Rankin_Inlet"},{"value":"America/Recife","name":"Recife","id":"America/Recife"},{"value":"America/Regina","name":"Regina","id":"America/Regina"},{"value":"America/Resolute","name":"Resolute","id":"America/Resolute"},{"value":"America/Rio_Branco","name":"Rio Branco","id":"America/Rio_Branco"},{"value":"America/Santa_Isabel","name":"Santa Isabel","id":"America/Santa_Isabel"},{"value":"America/Santarem","name":"Santarem","id":"America/Santarem"},{"value":"America/Santiago","name":"Santiago","id":"America/Santiago"},{"value":"America/Santo_Domingo","name":"Santo Domingo","id":"America/Santo_Domingo"},{"value":"America/Sao_Paulo","name":"Sao Paulo","id":"America/Sao_Paulo"},{"value":"America/Scoresbysund","name":"Ittoqqortoormiit","id":"America/Scoresbysund"},{"value":"America/Sitka","name":"Sitka","id":"America/Sitka"},{"value":"America/St_Barthelemy","name":"St. Barthélemy","id":"America/St_Barthelemy"},{"value":"America/St_Johns","name":"St. John’s","id":"America/St_Johns"},{"value":"America/St_Kitts","name":"St. Kitts","id":"America/St_Kitts"},{"value":"America/St_Lucia","name":"St. Lucia","id":"America/St_Lucia"},{"value":"America/St_Thomas","name":"St. Thomas","id":"America/St_Thomas"},{"value":"America/St_Vincent","name":"St. Vincent","id":"America/St_Vincent"},{"value":"America/Swift_Current","name":"Swift Current","id":"America/Swift_Current"},{"value":"America/Tegucigalpa","name":"Tegucigalpa","id":"America/Tegucigalpa"},{"value":"America/Thule","name":"Thule","id":"America/Thule"},{"value":"America/Thunder_Bay","name":"Thunder Bay","id":"America/Thunder_Bay"},{"value":"America/Tijuana","name":"Tijuana","id":"America/Tijuana"},{"value":"America/Toronto","name":"Toronto","id":"America/Toronto"},{"value":"America/Tortola","name":"Tortola","id":"America/Tortola"},{"value":"America/Vancouver","name":"Vancouver","id":"America/Vancouver"},{"value":"America/Whitehorse","name":"Whitehorse","id":"America/Whitehorse"},{"value":"America/Winnipeg","name":"Winnipeg","id":"America/Winnipeg"},{"value":"America/Yakutat","name":"Yakutat","id":"America/Yakutat"},{"value":"America/Yellowknife","name":"Yellowknife","id":"America/Yellowknife"},{"value":"Antarctica/Casey","name":"Casey","id":"Antarctica/Casey"},{"value":"Antarctica/Davis","name":"Davis","id":"Antarctica/Davis"},{"value":"Antarctica/DumontDUrville","name":"Dumont d’Urville","id":"Antarctica/DumontDUrville"},{"value":"Antarctica/Macquarie","name":"Macquarie","id":"Antarctica/Macquarie"},{"value":"Antarctica/Mawson","name":"Mawson","id":"Antarctica/Mawson"},{"value":"Antarctica/McMurdo","name":"McMurdo","id":"Antarctica/McMurdo"},{"value":"Antarctica/Palmer","name":"Palmer","id":"Antarctica/Palmer"},{"value":"Antarctica/Rothera","name":"Rothera","id":"Antarctica/Rothera"},{"value":"Antarctica/Syowa","name":"Syowa","id":"Antarctica/Syowa"},{"value":"Antarctica/Troll","name":"Troll","id":"Antarctica/Troll"},{"value":"Antarctica/Vostok","name":"Vostok","id":"Antarctica/Vostok"},{"value":"Arctic/Longyearbyen","name":"Longyearbyen","id":"Arctic/Longyearbyen"},{"value":"Asia/Aden","name":"Aden","id":"Asia/Aden"},{"value":"Asia/Almaty","name":"Almaty","id":"Asia/Almaty"},{"value":"Asia/Amman","name":"Amman","id":"Asia/Amman"},{"value":"Asia/Anadyr","name":"Anadyr","id":"Asia/Anadyr"},{"value":"Asia/Aqtau","name":"Aqtau","id":"Asia/Aqtau"},{"value":"Asia/Aqtobe","name":"Aqtobe","id":"Asia/Aqtobe"},{"value":"Asia/Ashgabat","name":"Ashgabat","id":"Asia/Ashgabat"},{"value":"Asia/Atyrau","name":"Atyrau","id":"Asia/Atyrau"},{"value":"Asia/Baghdad","name":"Baghdad","id":"Asia/Baghdad"},{"value":"Asia/Bahrain","name":"Bahrain","id":"Asia/Bahrain"},{"value":"Asia/Baku","name":"Baku","id":"Asia/Baku"},{"value":"Asia/Bangkok","name":"Bangkok","id":"Asia/Bangkok"},{"value":"Asia/Barnaul","name":"Barnaul","id":"Asia/Barnaul"},{"value":"Asia/Beirut","name":"Beirut","id":"Asia/Beirut"},{"value":"Asia/Bishkek","name":"Bishkek","id":"Asia/Bishkek"},{"value":"Asia/Brunei","name":"Brunei","id":"Asia/Brunei"},{"value":"Asia/Calcutta","name":"Kolkata","id":"Asia/Calcutta"},{"value":"Asia/Chita","name":"Chita","id":"Asia/Chita"},{"value":"Asia/Choibalsan","name":"Choibalsan","id":"Asia/Choibalsan"},{"value":"Asia/Colombo","name":"Colombo","id":"Asia/Colombo"},{"value":"Asia/Damascus","name":"Damascus","id":"Asia/Damascus"},{"value":"Asia/Dhaka","name":"Dhaka","id":"Asia/Dhaka"},{"value":"Asia/Dili","name":"Dili","id":"Asia/Dili"},{"value":"Asia/Dubai","name":"Dubai","id":"Asia/Dubai"},{"value":"Asia/Dushanbe","name":"Dushanbe","id":"Asia/Dushanbe"},{"value":"Asia/Famagusta","name":"Famagusta","id":"Asia/Famagusta"},{"value":"Asia/Gaza","name":"Gaza","id":"Asia/Gaza"},{"value":"Asia/Hebron","name":"Hebron","id":"Asia/Hebron"},{"value":"Asia/Hong_Kong","name":"Hồng Kông","id":"Asia/Hong_Kong"},{"value":"Asia/Hovd","name":"Hovd","id":"Asia/Hovd"},{"value":"Asia/Irkutsk","name":"Irkutsk","id":"Asia/Irkutsk"},{"value":"Asia/Jakarta","name":"Jakarta","id":"Asia/Jakarta"},{"value":"Asia/Jayapura","name":"Jayapura","id":"Asia/Jayapura"},{"value":"Asia/Jerusalem","name":"Jerusalem","id":"Asia/Jerusalem"},{"value":"Asia/Kabul","name":"Kabul","id":"Asia/Kabul"},{"value":"Asia/Kamchatka","name":"Kamchatka","id":"Asia/Kamchatka"},{"value":"Asia/Karachi","name":"Karachi","id":"Asia/Karachi"},{"value":"Asia/Katmandu","name":"Kathmandu","id":"Asia/Katmandu"},{"value":"Asia/Khandyga","name":"Khandyga","id":"Asia/Khandyga"},{"value":"Asia/Krasnoyarsk","name":"Krasnoyarsk","id":"Asia/Krasnoyarsk"},{"value":"Asia/Kuala_Lumpur","name":"Kuala Lumpur","id":"Asia/Kuala_Lumpur"},{"value":"Asia/Kuching","name":"Kuching","id":"Asia/Kuching"},{"value":"Asia/Kuwait","name":"Kuwait","id":"Asia/Kuwait"},{"value":"Asia/Macau","name":"Ma Cao","id":"Asia/Macau"},{"value":"Asia/Magadan","name":"Magadan","id":"Asia/Magadan"},{"value":"Asia/Makassar","name":"Makassar","id":"Asia/Makassar"},{"value":"Asia/Manila","name":"Manila","id":"Asia/Manila"},{"value":"Asia/Muscat","name":"Muscat","id":"Asia/Muscat"},{"value":"Asia/Nicosia","name":"Nicosia","id":"Asia/Nicosia"},{"value":"Asia/Novokuznetsk","name":"Novokuznetsk","id":"Asia/Novokuznetsk"},{"value":"Asia/Novosibirsk","name":"Novosibirsk","id":"Asia/Novosibirsk"},{"value":"Asia/Omsk","name":"Omsk","id":"Asia/Omsk"},{"value":"Asia/Oral","name":"Oral","id":"Asia/Oral"},{"value":"Asia/Phnom_Penh","name":"Phnom Penh","id":"Asia/Phnom_Penh"},{"value":"Asia/Pontianak","name":"Pontianak","id":"Asia/Pontianak"},{"value":"Asia/Pyongyang","name":"Bình Nhưỡng","id":"Asia/Pyongyang"},{"value":"Asia/Qatar","name":"Qatar","id":"Asia/Qatar"},{"value":"Asia/Qyzylorda","name":"Qyzylorda","id":"Asia/Qyzylorda"},{"value":"Asia/Rangoon","name":"Rangoon","id":"Asia/Rangoon"},{"value":"Asia/Riyadh","name":"Riyadh","id":"Asia/Riyadh"},{"value":"Asia/Saigon","name":"TP Hồ Chí Minh","id":"Asia/Saigon"},{"value":"Asia/Sakhalin","name":"Sakhalin","id":"Asia/Sakhalin"},{"value":"Asia/Samarkand","name":"Samarkand","id":"Asia/Samarkand"},{"value":"Asia/Seoul","name":"Seoul","id":"Asia/Seoul"},{"value":"Asia/Shanghai","name":"Thượng Hải","id":"Asia/Shanghai"},{"value":"Asia/Singapore","name":"Singapore","id":"Asia/Singapore"},{"value":"Asia/Srednekolymsk","name":"Srednekolymsk","id":"Asia/Srednekolymsk"},{"value":"Asia/Taipei","name":"Đài Bắc","id":"Asia/Taipei"},{"value":"Asia/Tashkent","name":"Tashkent","id":"Asia/Tashkent"},{"value":"Asia/Tbilisi","name":"Tbilisi","id":"Asia/Tbilisi"},{"value":"Asia/Tehran","name":"Tehran","id":"Asia/Tehran"},{"value":"Asia/Thimphu","name":"Thimphu","id":"Asia/Thimphu"},{"value":"Asia/Tokyo","name":"Tokyo","id":"Asia/Tokyo"},{"value":"Asia/Tomsk","name":"Tomsk","id":"Asia/Tomsk"},{"value":"Asia/Ulaanbaatar","name":"Ulaanbaatar","id":"Asia/Ulaanbaatar"},{"value":"Asia/Urumqi","name":"Urumqi","id":"Asia/Urumqi"},{"value":"Asia/Ust-Nera","name":"Ust-Nera","id":"Asia/Ust-Nera"},{"value":"Asia/Vientiane","name":"Viêng Chăn","id":"Asia/Vientiane"},{"value":"Asia/Vladivostok","name":"Vladivostok","id":"Asia/Vladivostok"},{"value":"Asia/Yakutsk","name":"Yakutsk","id":"Asia/Yakutsk"},{"value":"Asia/Yekaterinburg","name":"Yekaterinburg","id":"Asia/Yekaterinburg"},{"value":"Asia/Yerevan","name":"Yerevan","id":"Asia/Yerevan"},{"value":"Atlantic/Azores","name":"Azores","id":"Atlantic/Azores"},{"value":"Atlantic/Bermuda","name":"Bermuda","id":"Atlantic/Bermuda"},{"value":"Atlantic/Canary","name":"Canary","id":"Atlantic/Canary"},{"value":"Atlantic/Cape_Verde","name":"Cape Verde","id":"Atlantic/Cape_Verde"},{"value":"Atlantic/Faeroe","name":"Faroe","id":"Atlantic/Faeroe"},{"value":"Atlantic/Madeira","name":"Madeira","id":"Atlantic/Madeira"},{"value":"Atlantic/Reykjavik","name":"Reykjavik","id":"Atlantic/Reykjavik"},{"value":"Atlantic/South_Georgia","name":"Nam Georgia","id":"Atlantic/South_Georgia"},{"value":"Atlantic/St_Helena","name":"St. Helena","id":"Atlantic/St_Helena"},{"value":"Atlantic/Stanley","name":"Stanley","id":"Atlantic/Stanley"},{"value":"Australia/Adelaide","name":"Adelaide","id":"Australia/Adelaide"},{"value":"Australia/Brisbane","name":"Brisbane","id":"Australia/Brisbane"},{"value":"Australia/Broken_Hill","name":"Broken Hill","id":"Australia/Broken_Hill"},{"value":"Australia/Currie","name":"Currie","id":"Australia/Currie"},{"value":"Australia/Darwin","name":"Darwin","id":"Australia/Darwin"},{"value":"Australia/Eucla","name":"Eucla","id":"Australia/Eucla"},{"value":"Australia/Hobart","name":"Hobart","id":"Australia/Hobart"},{"value":"Australia/Lindeman","name":"Lindeman","id":"Australia/Lindeman"},{"value":"Australia/Lord_Howe","name":"Lord Howe","id":"Australia/Lord_Howe"},{"value":"Australia/Melbourne","name":"Melbourne","id":"Australia/Melbourne"},{"value":"Australia/Perth","name":"Perth","id":"Australia/Perth"},{"value":"Australia/Sydney","name":"Sydney","id":"Australia/Sydney"},{"value":"Etc/UTC","name":"Giờ Phối hợp Quốc tếUTC","id":"Etc/UTC"},{"value":"Europe/Amsterdam","name":"Amsterdam","id":"Europe/Amsterdam"},{"value":"Europe/Andorra","name":"Andorra","id":"Europe/Andorra"},{"value":"Europe/Astrakhan","name":"Astrakhan","id":"Europe/Astrakhan"},{"value":"Europe/Athens","name":"Athens","id":"Europe/Athens"},{"value":"Europe/Belgrade","name":"Belgrade","id":"Europe/Belgrade"},{"value":"Europe/Berlin","name":"Berlin","id":"Europe/Berlin"},{"value":"Europe/Bratislava","name":"Bratislava","id":"Europe/Bratislava"},{"value":"Europe/Brussels","name":"Brussels","id":"Europe/Brussels"},{"value":"Europe/Bucharest","name":"Bucharest","id":"Europe/Bucharest"},{"value":"Europe/Budapest","name":"Budapest","id":"Europe/Budapest"},{"value":"Europe/Busingen","name":"Busingen","id":"Europe/Busingen"},{"value":"Europe/Chisinau","name":"Chisinau","id":"Europe/Chisinau"},{"value":"Europe/Copenhagen","name":"Copenhagen","id":"Europe/Copenhagen"},{"value":"Europe/Dublin","name":"Giờ chuẩn Ai-lenDublin","id":"Europe/Dublin"},{"value":"Europe/Gibraltar","name":"Gibraltar","id":"Europe/Gibraltar"},{"value":"Europe/Guernsey","name":"Guernsey","id":"Europe/Guernsey"},{"value":"Europe/Helsinki","name":"Helsinki","id":"Europe/Helsinki"},{"value":"Europe/Isle_of_Man","name":"Đảo Man","id":"Europe/Isle_of_Man"},{"value":"Europe/Istanbul","name":"Istanbul","id":"Europe/Istanbul"},{"value":"Europe/Jersey","name":"Jersey","id":"Europe/Jersey"},{"value":"Europe/Kaliningrad","name":"Kaliningrad","id":"Europe/Kaliningrad"},{"value":"Europe/Kiev","name":"Kiev","id":"Europe/Kiev"},{"value":"Europe/Kirov","name":"Kirov","id":"Europe/Kirov"},{"value":"Europe/Lisbon","name":"Lisbon","id":"Europe/Lisbon"},{"value":"Europe/Ljubljana","name":"Ljubljana","id":"Europe/Ljubljana"},{"value":"Europe/London","name":"Giờ Mùa Hè AnhLondon","id":"Europe/London"},{"value":"Europe/Luxembourg","name":"Luxembourg","id":"Europe/Luxembourg"},{"value":"Europe/Madrid","name":"Madrid","id":"Europe/Madrid"},{"value":"Europe/Malta","name":"Malta","id":"Europe/Malta"},{"value":"Europe/Mariehamn","name":"Mariehamn","id":"Europe/Mariehamn"},{"value":"Europe/Minsk","name":"Minsk","id":"Europe/Minsk"},{"value":"Europe/Monaco","name":"Monaco","id":"Europe/Monaco"},{"value":"Europe/Moscow","name":"Mát-xcơ-va","id":"Europe/Moscow"},{"value":"Europe/Oslo","name":"Oslo","id":"Europe/Oslo"},{"value":"Europe/Paris","name":"Paris","id":"Europe/Paris"},{"value":"Europe/Podgorica","name":"Podgorica","id":"Europe/Podgorica"},{"value":"Europe/Prague","name":"Praha","id":"Europe/Prague"},{"value":"Europe/Riga","name":"Riga","id":"Europe/Riga"},{"value":"Europe/Rome","name":"Rome","id":"Europe/Rome"},{"value":"Europe/Samara","name":"Samara","id":"Europe/Samara"},{"value":"Europe/San_Marino","name":"San Marino","id":"Europe/San_Marino"},{"value":"Europe/Sarajevo","name":"Sarajevo","id":"Europe/Sarajevo"},{"value":"Europe/Saratov","name":"Saratov","id":"Europe/Saratov"},{"value":"Europe/Simferopol","name":"Simferopol","id":"Europe/Simferopol"},{"value":"Europe/Skopje","name":"Skopje","id":"Europe/Skopje"},{"value":"Europe/Sofia","name":"Sofia","id":"Europe/Sofia"},{"value":"Europe/Stockholm","name":"Stockholm","id":"Europe/Stockholm"},{"value":"Europe/Tallinn","name":"Tallinn","id":"Europe/Tallinn"},{"value":"Europe/Tirane","name":"Tirane","id":"Europe/Tirane"},{"value":"Europe/Ulyanovsk","name":"Ulyanovsk","id":"Europe/Ulyanovsk"},{"value":"Europe/Uzhgorod","name":"Uzhhorod","id":"Europe/Uzhgorod"},{"value":"Europe/Vaduz","name":"Vaduz","id":"Europe/Vaduz"},{"value":"Europe/Vatican","name":"Vatican","id":"Europe/Vatican"},{"value":"Europe/Vienna","name":"Vienna","id":"Europe/Vienna"},{"value":"Europe/Vilnius","name":"Vilnius","id":"Europe/Vilnius"},{"value":"Europe/Volgograd","name":"Volgograd","id":"Europe/Volgograd"},{"value":"Europe/Warsaw","name":"Warsaw","id":"Europe/Warsaw"},{"value":"Europe/Zagreb","name":"Zagreb","id":"Europe/Zagreb"},{"value":"Europe/Zaporozhye","name":"Zaporozhye","id":"Europe/Zaporozhye"},{"value":"Europe/Zurich","name":"Zurich","id":"Europe/Zurich"},{"value":"Indian/Antananarivo","name":"Antananarivo","id":"Indian/Antananarivo"},{"value":"Indian/Chagos","name":"Chagos","id":"Indian/Chagos"},{"value":"Indian/Christmas","name":"Christmas","id":"Indian/Christmas"},{"value":"Indian/Cocos","name":"Cocos","id":"Indian/Cocos"},{"value":"Indian/Comoro","name":"Comoro","id":"Indian/Comoro"},{"value":"Indian/Kerguelen","name":"Kerguelen","id":"Indian/Kerguelen"},{"value":"Indian/Mahe","name":"Mahe","id":"Indian/Mahe"},{"value":"Indian/Maldives","name":"Maldives","id":"Indian/Maldives"},{"value":"Indian/Mauritius","name":"Mauritius","id":"Indian/Mauritius"},{"value":"Indian/Mayotte","name":"Mayotte","id":"Indian/Mayotte"},{"value":"Indian/Reunion","name":"Réunion","id":"Indian/Reunion"},{"value":"Pacific/Apia","name":"Apia","id":"Pacific/Apia"},{"value":"Pacific/Auckland","name":"Auckland","id":"Pacific/Auckland"},{"value":"Pacific/Bougainville","name":"Bougainville","id":"Pacific/Bougainville"},{"value":"Pacific/Chatham","name":"Chatham","id":"Pacific/Chatham"},{"value":"Pacific/Easter","name":"Easter","id":"Pacific/Easter"},{"value":"Pacific/Efate","name":"Efate","id":"Pacific/Efate"},{"value":"Pacific/Enderbury","name":"Enderbury","id":"Pacific/Enderbury"},{"value":"Pacific/Fakaofo","name":"Fakaofo","id":"Pacific/Fakaofo"},{"value":"Pacific/Fiji","name":"Fiji","id":"Pacific/Fiji"},{"value":"Pacific/Funafuti","name":"Funafuti","id":"Pacific/Funafuti"},{"value":"Pacific/Galapagos","name":"Galapagos","id":"Pacific/Galapagos"},{"value":"Pacific/Gambier","name":"Gambier","id":"Pacific/Gambier"},{"value":"Pacific/Guadalcanal","name":"Guadalcanal","id":"Pacific/Guadalcanal"},{"value":"Pacific/Guam","name":"Guam","id":"Pacific/Guam"},{"value":"Pacific/Honolulu","name":"Giờ HSTHSTHDTHonolulu","id":"Pacific/Honolulu"},{"value":"Pacific/Johnston","name":"Johnston","id":"Pacific/Johnston"},{"value":"Pacific/Kiritimati","name":"Kiritimati","id":"Pacific/Kiritimati"},{"value":"Pacific/Kosrae","name":"Kosrae","id":"Pacific/Kosrae"},{"value":"Pacific/Kwajalein","name":"Kwajalein","id":"Pacific/Kwajalein"},{"value":"Pacific/Majuro","name":"Majuro","id":"Pacific/Majuro"},{"value":"Pacific/Marquesas","name":"Marquesas","id":"Pacific/Marquesas"},{"value":"Pacific/Midway","name":"Midway","id":"Pacific/Midway"},{"value":"Pacific/Nauru","name":"Nauru","id":"Pacific/Nauru"},{"value":"Pacific/Niue","name":"Niue","id":"Pacific/Niue"},{"value":"Pacific/Norfolk","name":"Norfolk","id":"Pacific/Norfolk"},{"value":"Pacific/Noumea","name":"Noumea","id":"Pacific/Noumea"},{"value":"Pacific/Pago_Pago","name":"Pago Pago","id":"Pacific/Pago_Pago"},{"value":"Pacific/Palau","name":"Palau","id":"Pacific/Palau"},{"value":"Pacific/Pitcairn","name":"Pitcairn","id":"Pacific/Pitcairn"},{"value":"Pacific/Ponape","name":"Pohnpei","id":"Pacific/Ponape"},{"value":"Pacific/Port_Moresby","name":"Port Moresby","id":"Pacific/Port_Moresby"},{"value":"Pacific/Rarotonga","name":"Rarotonga","id":"Pacific/Rarotonga"},{"value":"Pacific/Saipan","name":"Saipan","id":"Pacific/Saipan"},{"value":"Pacific/Tahiti","name":"Tahiti","id":"Pacific/Tahiti"},{"value":"Pacific/Tarawa","name":"Tarawa","id":"Pacific/Tarawa"},{"value":"Pacific/Tongatapu","name":"Tongatapu","id":"Pacific/Tongatapu"},{"value":"Pacific/Truk","name":"Chuuk","id":"Pacific/Truk"},{"value":"Pacific/Wake","name":"Wake","id":"Pacific/Wake"},{"value":"Pacific/Wallis","name":"Wallis","id":"Pacific/Wallis"}];
};

return moment;
})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

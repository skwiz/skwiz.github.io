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
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">議論を開始しましょう！</a> そこには ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
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
})() + "</strong> トピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " と ";
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
})() + "</strong> 投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " があります。訪問者はよく読んで返信する必要があります。最低でも ";
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
})() + "</strong> トピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " と ";
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
})() + "</strong> 投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " をおすすめします。このメッセージを見ることができるのはスタッフだけです。";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">議論を開始しましょう！</a> そこには ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
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
})() + "</strong> トピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " があります。訪問者はよく読んで返信する必要があります。少なくとも ";
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
})() + "</strong> トピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "をおすすめします。このメッセージを見ることができるのはスタッフだけです。";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">議論を始めましょう！</a> そこには ";
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
})() + "</strong> 投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "があります。訪問者はよく読んで返信する必要があります。少なくとも ";
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
})() + "</strong> 投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "をおすすめします。このメッセージを見ることができるのはスタッフだけです。";
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
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " エラー/時間";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> がサイト設定制限の ";
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
})() + " エラー/時間";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " に達しました。";
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
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " エラー/分";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> がサイト設定制限の ";
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
})() + "エラー/分";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " に達しました 。";
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
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " エラー/時間";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a>サイト設定制限の ";
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
})() + " エラー/時間";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " を超えました 。";
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
"other" : function(d){
var r = "";
r += "＃エラー/分";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> サイト設定制限の ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "＃エラー/分";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " 超えました。";
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Are you sure?";
return r;
}};
MessageFormat.locale.ja = function ( n ) {
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

I18n.translations = {"ja":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"other":"バイト"},"gb":"ギガバイト","kb":"キロバイト","mb":"メガバイト","tb":"テラバイト"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"H:mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"YYYY年M月","long_no_year":"M/D, HH:mm","long_no_year_no_time":"M月D日","full_no_year_no_time":"M月D日","long_with_year":"YYYY年M月D日 H:mm","long_with_year_no_time":"YYYY年M月D日","full_with_year_no_time":"YYYY年M月D日","long_date_with_year":"'YY/MM/DD LT","long_date_without_year":"M月D日 LT","long_date_with_year_without_time":"'YY/MM/DD","long_date_without_year_with_linebreak":"M月D日 <br/>LT","long_date_with_year_with_linebreak":"'YY/MM/DD <br/>LT","wrap_ago":"%{date}前","tiny":{"half_a_minute":"1分未満","less_than_x_seconds":{"other":"%{count}秒未満"},"x_seconds":{"other":"%{count}秒"},"less_than_x_minutes":{"other":"%{count}分未満"},"x_minutes":{"other":"%{count}分"},"about_x_hours":{"other":"%{count}時間"},"x_days":{"other":"%{count}日"},"x_months":{"other":"%{count}ヶ月"},"about_x_years":{"other":"%{count}年"},"over_x_years":{"other":"%{count}年以上"},"almost_x_years":{"other":"約%{count}年"},"date_month":"M月D日","date_year":"'YY年M月"},"medium":{"x_minutes":{"other":"%{count}分"},"x_hours":{"other":"%{count}時間"},"x_days":{"other":"%{count}日"},"date_year":"'YY年M月D日"},"medium_with_ago":{"x_minutes":{"other":"%{count}分前"},"x_hours":{"other":"%{count}時間前"},"x_days":{"other":"%{count}日前"},"x_months":{"other":"%{count}ヶ月前"},"x_years":{"other":"%{count}年前"}},"later":{"x_days":{"other":"%{count}日後"},"x_months":{"other":"%{count}か月後"},"x_years":{"other":"%{count}年後"}},"previous_month":"前月","next_month":"翌月","placeholder":"日付"},"share":{"topic_html":"トピック: <span class=\"topic-title\">%{topicTitle}</span>","post":"投稿 #%{postNumber}","close":"閉じる","twitter":"Twitterで共有","facebook":"Facebookで共有","email":"メールで送信","url":"URLをコピーして共有"},"action_codes":{"public_topic":"トピックを公開しました: %{when} ","private_topic":"このトピックを %{when} にダイレクトメッセージとして送る","split_topic":"%{when} このトピックは分割されました","invited_user":"%{who} から招待されました: %{when}","invited_group":"%{when} %{who}に招待されました","user_left":"%{who}は%{when}にこのメッセージから自身を削除しました","removed_user":"%{who}が %{when}に削除しました","removed_group":"%{when} %{who}に取り除かれました","autobumped":"自動的にトップに上げられました: %{when}","autoclosed":{"enabled":"クローズされました: %{when}","disabled":"%{when}にオープンしました"},"closed":{"enabled":"クローズされました: %{when}","disabled":"%{when}にオープンしました"},"archived":{"enabled":"%{when}にアーカイブしました","disabled":"%{when}にアーカイブを解除しました"},"pinned":{"enabled":"固定表示しました: %{when}","disabled":"%{when}に固定表示を解除しました"},"pinned_globally":{"enabled":"%{when}に全体での固定表示をしました","disabled":"%{when}に全体での固定表示を解除しました"},"visible":{"enabled":"リストに表示: %{when}","disabled":"リストから非表示: %{when}"},"banner":{"enabled":"この広告%{when}を作成して下さい。ユーザーが拒否するまで各ページの上部に表示されます。","disabled":"このバナー%{when}を削除すると、各ページの最上部に表示しません。"},"forwarded":"上記のメールを転送しました"},"topic_admin_menu":"トピックアクション","wizard_required":"Discourseへようこそ！ さあ<a href='%{url}' data-auto-route='true'>セットアップウィザード</a>から始めましょう","emails_are_disabled":"メールアドレスの送信は管理者によって無効化されています。全てのメール通知は行われません","bootstrap_mode_enabled":{"other":"簡単にサイトを立ち上げられるように、ブートストラップモードにしました。\nすべての新規ユーザーはトラストレベル1となり、毎日のサマリーメールが有効な状態です。この設定は%{count}名のユーザーが参加した時に自動的に無効になります。"},"bootstrap_mode_disabled":"ブートストラップモードは24時間以内に無効になります。","themes":{"default_description":"デフォルト","broken_theme_alert":"あなたのサイトはテーマかコンポーネント%{theme}の影響で動いていません。%{path}で無効にしてください。"},"s3":{"regions":{"ap_northeast_1":"アジア(東京)","ap_northeast_2":"アジア(ソウル)","ap_south_1":"アジア(ムンバイ)","ap_southeast_1":"アジア(シンガポール)","ap_southeast_2":"アジア(シドニー)","ca_central_1":"カナダ(中央)","cn_north_1":"中国(北京)","cn_northwest_1":"中国(寧夏)","eu_central_1":"EU (フランクフルト)","eu_north_1":"EU(ストックホルム)","eu_west_1":"EU (アイルランド)","eu_west_2":"EU(ロンドン)","eu_west_3":"EU(パリ)","sa_east_1":"米北部(サンパウロ)","us_east_1":"米東部(バージニア北部)","us_east_2":"米東部(オハイオ)","us_gov_east_1":"AWS GovCloud (米国東部)","us_gov_west_1":"AWS GovCloud (US-West)","us_west_1":"米西部(カリフォルニア北部)","us_west_2":"米西部(オレゴン)"}},"clear_input":"入力をクリア","edit":"このトピックのタイトル/カテゴリを編集","expand":"拡張","not_implemented":"この機能はまだ実装されていません！","no_value":"いいえ","yes_value":"はい","submit":"送信","generic_error":"申し訳ありません、エラーが発生しました。","generic_error_with_reason":"エラーが発生しました: %{error}","go_ahead":"どうぞ","sign_up":"アカウントを作成","log_in":"ログイン","age":"経過","joined":"参加時刻","admin_title":"管理設定","show_more":"もっと見る","show_help":"オプション","links":"リンク","links_lowercase":{"other":"リンク"},"faq":"FAQ","guidelines":"ガイドライン","privacy_policy":"プライバシーポリシー","privacy":"プライバシー","tos":"利用規約","rules":"ルール","conduct":"行動範囲","mobile_view":"モバイル表示","desktop_view":"デスクトップ表示","you":"あなた","or":"あるいは","now":"たった今","read_more":"もっと読む","more":"もっと読む","less":"減らす","never":"決して","every_30_minutes":"30分毎","every_hour":"毎時","daily":"毎日","weekly":"毎週","every_month":"毎月","every_six_months":"6ヶ月毎","max_of_count":"最大 %{count}","alternation":"または","character_count":{"other":"%{count}文字"},"related_messages":{"title":"関連メッセージ","see_all":"@%{username}からの<a href=\"%{path}\">全てのメッセージ</a>を見る"},"suggested_topics":{"title":"関連トピック","pm_title":"他のメッセージ"},"about":{"simple_title":"このサイトについて","title":"%{title}について","stats":" サイトの統計","our_admins":"管理者","our_moderators":"モデレータ","moderators":"モデレータ","stat":{"all_time":"すべて"},"like_count":"いいね！","topic_count":"トピック","post_count":"投稿","user_count":"ユーザー","active_user_count":"アクティブユーザー","contact":"お問い合わせ","contact_info":"このサイトに影響を与える重要な問題や緊急の問題が発生した場合は、 %{contact_info}までご連絡ください"},"bookmarked":{"title":"ブックマーク","clear_bookmarks":"ブックマークを削除","help":{"bookmark":"クリックするとトピックの最初の投稿をブックマークします","unbookmark":"クリックするとトピック内の全てのブックマークを削除します","unbookmark_with_reminder":"クリックして、このトピックのすべてのブックマークとリマインダーを削除します。このトピックのリマインダーは %{reminder_at} です。"}},"bookmarks":{"created":"%{name} の投稿をブックマークしました。","not_bookmarked":"この投稿をブックマークする","created_with_reminder":"%{name} の投稿を %{date} のリマインダー付きでブックマークしました。","remove":"ブックマークを削除","delete":"ブックマークを削除","confirm_delete":"このブックマークを削除してもよろしいですか？リマインダーも削除されます。","confirm_clear":"このトピックのすべてのブックマークをクリアしますか?","save":"保存","no_timezone":"まだタイムゾーンを設定していないためリマインダーを設定することはできません。<a href=\"%{basePath}/my/preferences/profile\">プロフィール</a>にて設定してください。","invalid_custom_datetime":"入力された日時が無効です。もう一度やり直してください。","list_permission_denied":"このユーザーのブックマークを表示する権限がありません。","no_user_bookmarks":"ブックマークした投稿はありません。ブックマークを使用すると、特定の投稿を素早く参照できます。","auto_delete_preference":{"label":"自動的に削除","never":"一切なし","when_reminder_sent":"リマインダーが送信されたとき","on_owner_reply":"このトピックに返信した後"},"search_placeholder":"名前、トピックタイトル、または投稿コンテンツでブックマークを検索する","search":"検索","reminders":{"later_today":"今日中","next_business_day":"翌営業日","tomorrow":"明日","next_week":"来週","post_local_date":"投稿日時","later_this_week":"今週中","start_of_next_business_week":"月曜日","start_of_next_business_week_alt":"来週の月曜日","next_month":"来月","custom":"カスタムの日付と時刻","last_custom":"過去日間","none":"リマインダーは必要ありません","today_with_time":"今日は %{time}","tomorrow_with_time":"明日は %{time}","at_time":"%{date_time} に","existing_reminder":"このブックマークに %{at_date_time} に送信されるリマインダーが設定されています"}},"copy_codeblock":{"copied":"コピーしました！"},"drafts":{"resume":"続ける","remove":"削除","remove_confirmation":"この下書きを削除してもよろしいですか？","new_topic":"新しいトピックの下書き","new_private_message":"プライベートメッセージの下書き","topic_reply":"返信の下書き"},"topic_count_latest":{"other":"%{count}件の新規/更新トピックがあります。"},"topic_count_unread":{"other":"%{count} 件の未読トピックがあります。"},"topic_count_new":{"other":"%{count} 件の新規トピックがあります。"},"preview":"プレビュー","cancel":"キャンセル","deleting":"削除中...","save":"変更を保存","saving":"保存中...","saved":"保存しました","upload":"アップロード","uploading":"アップロード中...","uploading_filename":"%{filename}をアップロードしています…","clipboard":"クリップボード","uploaded":"アップロードしました","pasting":"貼り付け","enable":"有効にする","disable":"無効にする","continue":"続く","undo":"取り消す","revert":"戻す","failed":"失敗","switch_to_anon":"匿名モードにする","switch_from_anon":"匿名モードから抜ける","banner":{"close":"バナーを閉じる。","edit":"このバナーを編集 >>"},"pwa":{"install_banner":"<a href>このデバイスに%{title}をインストール</a>しますか？"},"choose_topic":{"none_found":"トピックが見つかりませんでした。","title":{"search":"トピックの検索","placeholder":"ここにトピックのタイトル、URL、IDを入力してください"}},"choose_message":{"none_found":"メッセージは見つかりませんでした。","title":{"search":"メッセージの検索","placeholder":"ここにメッセージのタイトル、URL、IDを入力してください"}},"review":{"order_by":"順","in_reply_to":"こちらへの回答","explain":{"why":"このアイテムが、キューに入れられた理由を教えて下さい","title":"レビュー可能な得点","formula":"式","subtotal":"小計","total":"合計","min_score_visibility":"表示の最小スコア","score_to_hide":"投稿を非表示にするスコア","take_action_bonus":{"name":"とった行動","title":"スタッフが行動を選択した場合、フラグにはボーナスが付与されます。"},"user_accuracy_bonus":{"name":"ユーザーの精度","title":"過去の履歴にフラグが一致しているユーザーにはボーナスが付与されます。"},"trust_level_bonus":{"name":"トラストレベル","title":"信頼度の高いユーザーが作成したレビュー可能な項目は、スコアが高くなります。"},"type_bonus":{"name":"タイプボーナス","title":"特定のレビューは、スタッフがボーナスを付与して優先順位を上げることができます。"}},"claim_help":{"optional":"他の人のレビューを防ぐために、この項目を強調することができます。","claimed_by_you":"このアイテムは申し立て済みで、レビューできます。","claimed_by_other":"この項目は <b>%{username}</b> のみがレビューできます。"},"claim":{"title":"トピックを要請する"},"unclaim":{"help":"この要請を削除する"},"awaiting_approval":"承認待ち","delete":"削除する","settings":{"saved":"保存しました","save_changes":"変更を保存","title":"設定","priorities":{"title":"レビュー可能な優先順位"}},"moderation_history":"ヒストリーを操作する","view_all":"すべて見る","grouped_by_topic":"トピックによってグループ分けされた","none":"レビューするアイテムがありません","view_pending":"保留のものを見る","topic_has_pending":{"other":"このトピックは<b>%{count}</b>件の承認待ちのポストがあります"},"title":"レビュー","topic":"トピック:","filtered_topic":"1 つのトピックでレビュー可能なコンテンツにフィルターを適用しました。","filtered_user":"ユーザー","filtered_reviewed_by":"レビューアー：","show_all_topics":"すべてのトピックを表示","deleted_post":"(削除されたポスト)","deleted_user":"(削除されたユーザー)","user":{"bio":"略歴","website":"ウェブサイト","username":"ユーザー名","email":"Eメール","name":"名前","fields":"広場","reject_reason":"理由"},"user_percentage":{"agreed":{"other":"%{count}%同意"},"disagreed":{"other":"%{count}%同意しない"},"ignored":{"other":"%{count}%無投票"}},"topics":{"topic":"トピック","reviewable_count":"カウント","reported_by":"報告者：","deleted":"[デリートされたトピック]","original":"(もとのトピック)","details":"詳細","unique_users":{"other":"%{count}ユーザー"}},"replies":{"other":"%{count}件の返信"},"edit":"編集","save":"保存","cancel":"キャンセル","new_topic":"このアイテムを承認すると新しいトピックが作成されます","filters":{"all_categories":"(すべてのカテゴリ)","type":{"title":"タイプ","all":"(すべてのタイプ)"},"minimum_score":"最小スコア:","refresh":"更新","status":"ステータス","category":"カテゴリ","orders":{"score":"スコア","score_asc":"スコア (昇順)","created_at":"作られた","created_at_asc":"作成日時 (昇順)"},"priority":{"title":"最小の優先度","low":"(任意)","medium":"普通","high":"高い"}},"conversation":{"view_full":"すべての会話を見る"},"scores":{"about":"このスコアは、レポーターの信頼レベル、以前のフラグの精度、およびレポートされるアイテムの優先度に基づいて計算されます。","score":"スコア","date":"日付","type":"タイプ","status":"ステータス","submitted_by":"投稿者：","reviewed_by":"レビューアー："},"statuses":{"pending":{"title":"保留中"},"approved":{"title":"承認済み"},"rejected":{"title":"拒否されたメール"},"ignored":{"title":"無視する"},"deleted":{"title":"削除済み"},"reviewed":{"title":"(すべてレビュー済み)"},"all":{"title":"(すべて)"}},"types":{"reviewable_flagged_post":{"title":"通報された投稿","flagged_by":"通報者："},"reviewable_queued_topic":{"title":"キューに入れられたトピック"},"reviewable_queued_post":{"title":"キューに登録された投稿"},"reviewable_user":{"title":"ユーザー"}},"approval":{"title":"この投稿は承認が必要です","description":"新しい投稿はモデレータによる承認が必要です。しばらくお待ち下さい。","pending_posts":{"other":"<strong>%{count}</strong> 個の投稿が保留中です。"},"ok":"OK"},"example_username":"ユーザ名","reject_reason":{"title":"このユーザーを拒否する理由は何ですか？","send_email":"拒否メールを送信"}},"relative_time_picker":{"minutes":{"other":"分"},"hours":{"other":"時間"},"days":{"other":"日"},"months":{"other":"月"}},"time_shortcut":{"later_today":"今日中","next_business_day":"翌営業日","tomorrow":"明日","next_week":"来週","post_local_date":"投稿日時","later_this_week":"今週中","start_of_next_business_week":"月曜日","start_of_next_business_week_alt":"来週の月曜日","next_month":"来月","custom":"日時を選択","relative":"相対時間","none":"必要ありません","last_custom":"最終"},"user_action":{"user_posted_topic":"<a href='%{userUrl}'>%{user}</a> が <a href='%{topicUrl}'>トピック</a> を作成","you_posted_topic":"<a href='%{userUrl}'>あなた</a> が <a href='%{topicUrl}'>トピック</a> を作成","user_replied_to_post":"<a href='%{userUrl}'>%{user}</a> が <a href='%{postUrl}'>%{post_number}</a> に返信","you_replied_to_post":"<a href='%{userUrl}'>あなた</a> が <a href='%{postUrl}'>%{post_number}</a> に返信","user_replied_to_topic":"<a href='%{userUrl}'>%{user}</a> が <a href='%{topicUrl}'>トピック</a> に返信","you_replied_to_topic":"<a href='%{userUrl}'>あなた</a> が <a href='%{topicUrl}'>トピック</a> に返信","user_mentioned_user":"<a href='%{user1Url}'>%{user}</a> が <a href='%{user2Url}'>%{another_user}</a> をタグ付けしました","user_mentioned_you":"<a href='%{user1Url}'>%{user}</a> が <a href='%{user2Url}'>あなた</a> を をタグ付けしました","you_mentioned_user":"<a href='%{user1Url}'>あなた</a> が <a href='%{user2Url}'>%{another_user}</a> をタグ付けしました","posted_by_user":"<a href='%{userUrl}'>%{user}</a> が投稿","posted_by_you":"<a href='%{userUrl}'>あなた</a> が投稿","sent_by_user":"<a href='%{userUrl}'>%{user}</a> が送信","sent_by_you":"<a href='%{userUrl}'>あなた</a> が送信"},"directory":{"username":"ユーザ名","filter_name":"ユーザー名でフィルタ","title":"ユーザー","likes_given":"与えた","likes_received":"もらった","topics_entered":"閲覧数","topics_entered_long":"トピックの閲覧数","time_read":"読んだ時間","topic_count":"トピック","topic_count_long":"作成されたトピックの数","post_count":"返信","post_count_long":"投稿の返信数","no_results":"結果はありませんでした","days_visited":"閲覧数","days_visited_long":"閲覧された日数","posts_read":"既読","posts_read_long":"投稿の閲覧数","last_updated":"最終更新：","total_rows":{"other":"%{count}人のユーザー"}},"group_histories":{"actions":{"change_group_setting":"グループの設定を変更","add_user_to_group":"ユーザーを追加","remove_user_from_group":"ユーザーを削除","make_user_group_owner":"オーナーにする","remove_user_as_group_owner":"オーナーから削除する"}},"groups":{"member_added":"追加済み","member_requested":"リクエスト日時：","add_members":{"title":"メンバーを %{group_name}に追加","description":"カンマ区切りのリストに貼り付けることもできます。","usernames":"ユーザー名またはメールアドレスを入力してください","input_placeholder":"ユーザー名またはメール","notify_users":"ユーザーに通知"},"requests":{"title":"リクエスト","reason":"理由","accept":"受け入れ","accepted":"受け入れられました","deny":"拒否","denied":"拒否されました","undone":"リクエストの取り消し","handle":"メンバーシップリクエストを処理する"},"manage":{"title":"管理","name":"名前","full_name":"フルネーム","add_members":"メンバーを加える","delete_member_confirm":"%{username}をグループ %{group} から削除しますか?","profile":{"title":"プロフィール"},"interaction":{"title":"交流","posting":"投稿","notification":"通知"},"email":{"title":"Eメール","status":"IMAP経由で %{old_emails} / %{total_emails} のメールを同期しました。","credentials":{"title":"資格情報","smtp_server":"SMTPサーバー","smtp_port":"SMTPポート","smtp_ssl":"SMTP に SSL を使用する","imap_server":"IMAP サーバ","imap_port":"IMAP ポート","imap_ssl":"IMAPにSSLを使用する","username":"ユーザー名","password":"パスワード"},"settings":{"title":"設定","allow_unknown_sender_topic_replies":"送信者不明のトピックの返信を許可。","allow_unknown_sender_topic_replies_hint":"不明な送信者がグループトピックに返信できるようにします。これが有効になっていない場合、IMAP電子メールスレッドにまだ含まれていない、またはトピックに招待されていない電子メールアドレスからの返信があった場合は、新しいトピックを作成します。"},"mailboxes":{"synchronized":"同期されたメールボックス","none_found":"このメールアカウントにはメールボックスが見つかりませんでした。","disabled":"無効"}},"membership":{"title":"メンバーシップ","access":"アクセス"},"categories":{"title":"カテゴリ","long_title":"カテゴリのデフォルト通知","description":"ユーザーがこのグループに追加されると、ユーザーのカテゴリ通知設定はこれらのデフォルトに設定されます。その後、彼らはそれらを変更することができます。","watched_categories_instructions":"自動的にカテゴリー内の全てのトピックをウォッチします。グループのメンバーに全ての新規投稿と新規トピックが通知されまた、新規投稿数がトピックの隣に表示されます。","tracked_categories_instructions":"自動的にカテゴリー内の全てのトピックを追跡します。新規投稿数がトピックの隣に表示されます。","watching_first_post_categories_instructions":"ユーザーにカテゴリー内の新規トピックに対する最初の投稿が通知されます。","regular_categories_instructions":"これらのカテゴリがミュートされている場合、グループメンバーのミュートは解除されます。ユーザーがメンションされたり、誰かが返信したりすると、ユーザーに通知されます。","muted_categories_instructions":"これらのカテゴリの新しいトピックについては通知されず、カテゴリや最新のページにも表示されません。"},"tags":{"title":"タグ","long_title":"タグのデフォルト通知","description":"ユーザーがこのグループに追加されると、そのユーザーのカテゴリ通知設定はこのグループのデフォルトに設定されます。この設定は、各自で変更することができます。","watched_tags_instructions":"自動的にカテゴリー内の全てのトピックをウォッチします。グループのメンバーに全ての新規投稿と新規トピックが通知され、新規投稿数がトピックの隣に表示されます。","tracked_tags_instructions":"これらのタグのすべてのトピックを自動的に追跡します。 新しい投稿の数がトピックの横に表示されます。","watching_first_post_tags_instructions":"これらのタグが付加された新規トピック内の初めての投稿は通知されます。","regular_tags_instructions":"これらのタグがミュートされている場合、グループメンバーにはミュートが解除されます。ユーザーが言及されたり、誰かがそれに返信したりすると、ユーザーに通知されます。","muted_tags_instructions":"このタグが付いている新しいトピックについては、ユーザーには何も通知されず、最新のものには表示されません。"},"logs":{"title":"ログ","when":"いつ","action":"アクション","acting_user":"活動中のユーザー","target_user":"ターゲットユーザー","subject":"件名","details":"詳細","from":"発信元","to":"宛先"}},"permissions":{"title":"権限","none":"このグループに関連付けられているカテゴリはありません。","description":"このグループのメンバはこれらのカテゴリにアクセスできます"},"public_admission":"ユーザーがグループへ自由に参加できるようにする (一般公開グループである必要があります)","public_exit":"ユーザーがグループから自由に離脱できるようにする","empty":{"posts":"このグループのメンバーによる投稿はありません。","members":"このグループにはメンバーがいません。","requests":"このグループへのメンバーシップリクエストはありません","mentions":"このグループに対するメンションはありません。","messages":"このグループへのメッセージはありません。","topics":"このグループのメンバーによるトピックはありません。","logs":"このグループに関するログはありません。"},"add":"追加","join":"参加","leave":"脱退","request":"リクエスト","message":"メッセージ","confirm_leave":"このグループから脱退してもよろしいですか？","allow_membership_requests":"ユーザーがグループの所有者にメンバーシップリクエストを送信できるようにする (公開されているグループが必要)","membership_request_template":"メンバーシップリクエスト送信時に表示するカスタムテンプレート","membership_request":{"submit":"リクエストを送信","title":"参加をリクエスト @%{group_name}","reason":"グループに参加したい旨をグループオーナーに伝える"},"membership":"メンバーシップ","name":"名前","group_name":"グループ名","user_count":"ユーザー","bio":"グループについて","selector_placeholder":"ユーザー名を入力","owner":"オーナー","index":{"title":"グループ","all":"すべてのグループ","empty":"表示するグループはありません。","filter":"グループの種類でフィルタ","owner_groups":"自分が所有するグループ","close_groups":"クローズされたグループ","automatic_groups":"自動で作成されたグループ","automatic":"自動","closed":"閉鎖","public":"公開","private":"非公開","public_groups":"公開グループ","automatic_group":"自動作成されたグループ","close_group":"クローズされたグループ","my_groups":"自分のグループ","group_type":"グループ種類","is_group_user":"メンバー","is_group_owner":"オーナー"},"title":{"other":"グループ"},"activity":"アクティビティ","members":{"title":"メンバー","filter_placeholder_admin":"ユーザー名かメール","filter_placeholder":"ユーザー名","remove_member":"メンバーを削除する","remove_member_description":"グループから <b>%{username}</b> を削除する","make_owner":"オーナーを作成する","make_owner_description":"<b>%{username}</b> をこのグループのオーナーにする","remove_owner":"オーナーから削除","remove_owner_description":"<b>%{username}</b> をこのグループから削除します","make_primary":"優先にする","make_primary_description":"これを <b>%{username}</b>のプライマリグループにします","remove_primary_description":"<b>%{username}</b>のプライマリグループとしてこれを削除","remove_members":"メンバーを削除する","remove_members_description":"このグループから選択したユーザーを削除する","make_owners":"オーナーにする","make_owners_description":"選択したユーザーをこのグループのオーナーにする","remove_owners":"オーナーから削除","remove_owners_description":"このグループのオーナーとして、選択したユーザーを削除","make_all_primary":"すべてをプライマリにする","make_all_primary_description":"これを選択したすべてのユーザーのプライマリグループにします","remove_all_primary":"プライマリとして削除","remove_all_primary_description":"このグループをプライマリとして削除します","owner":"オーナー","forbidden":"メンバーの閲覧は許可されていません"},"topics":"トピック","posts":"投稿","mentions":"メンション","messages":"メッセージ","notification_level":"グループメッセージのデフォルト通知レベル","alias_levels":{"mentionable":"誰がこのグループに@メンションを送れますか?","messageable":"誰がこのグループにメッセージを送れますか?","nobody":"無し","only_admins":"管理者のみ","mods_and_admins":"管理者とモデレータのみ","members_mods_and_admins":"管理者、モデレータ、グループメンバーのみ","owners_mods_and_admins":"管理者、モデレータ、グループメンバーのみ","everyone":"だれでも"},"notifications":{"watching":{"title":"ウォッチ中","description":"全てのメッセージについて通知があり、新規返信数が表示されます。"},"watching_first_post":{"title":"最初の投稿をウォッチする","description":"このグループの新しいメッセージは通知されますが、返信されたメッセージは通知されません。"},"tracking":{"title":"追跡中","description":"誰かがあなた宛に返信をすると通知があり、新規返信数が表示されます。"},"regular":{"title":"デフォルト","description":"他のユーザからメンションされた場合か、メッセージ内の投稿に返信された場合に通知されます。"},"muted":{"title":"ミュート","description":"このグループのすべてのメッセージを通知しません。"}},"flair_url":"アバター画像","flair_upload_description":"20px x 20px以上の正方形の画像を使用してください。","flair_bg_color":"アバターの背景色","flair_bg_color_placeholder":"(オプション) HEXカラー値","flair_color":"アバター色","flair_color_placeholder":"(オプション) HEXカラー値","flair_preview_icon":"アイコンプレビュー","flair_preview_image":"画像プレビュー","flair_type":{"icon":"アイコンを選択してください","image":"画像のアップロード"}},"user_action_groups":{"1":"「いいね！」 ","2":"「いいね！」 された","3":"ブックマーク","4":"トピック","5":"返信","6":"反応","7":"タグ付け","9":"引用","11":"編集","12":"アイテム送信","13":"受信ボックス","14":"保留","15":"下書き"},"categories":{"all":"すべてのカテゴリ","all_subcategories":"すべて","no_subcategory":"サブカテゴリなし","category":"カテゴリ","category_list":"カテゴリリストを表示","reorder":{"title":"カテゴリの並び替え","title_long":"カテゴリリストを並べ直します","save":"順番を保存","apply_all":"適用","position":"位置"},"posts":"投稿","topics":"トピック","latest":"最近の投稿","toggle_ordering":"カテゴリの並び替えモードを切り替え","subcategories":"サブカテゴリ:","muted":"ミュートされたカテゴリ","topic_sentence":{"other":"%{count}トピック群"},"topic_stat_unit":{"week":"週","month":"月"},"topic_stat_sentence_week":{"other":"先週 %{count} の新しいトピックが投稿されました。"},"topic_stat_sentence_month":{"other":"先月 %{count} 個の新しいトピックが投稿されました。"},"n_more":"カテゴリ (%{count} 個以上)..."},"ip_lookup":{"title":"IPアドレスを検索","hostname":"ホスト名","location":"現在地","location_not_found":"（不明）","organisation":"組織","phone":"電話","other_accounts":"同じIPアドレスを持つアカウント:","delete_other_accounts":"%{count}件削除","username":"ユーザー名","trust_level":"トラストレベル","read_time":"読んだ時間","topics_entered":"入力したトピック","post_count":"# 投稿","confirm_delete_other_accounts":"これらのアカウントを削除してもよろしいですか?","powered_by":"<a href='https://maxmind.com'>MaxMindDB</a>を使用する","copied":"コピーしました"},"user_fields":{"none":"(オプションを選択)","required":"\"%{name}\" の値を入力してください"},"user":{"said":"%{username}:","profile":"プロフィール","mute":"ミュート","edit":"プロフィールを編集","download_archive":{"button_text":"すべてダウンロード","confirm":"本当にご自身の投稿をダウンロードしたいですか。","success":"ダウンロードが始まると、処理完了時に通知されます。","rate_limit_error":"投稿者は1日1回ダウンロードすることが可能です、明日再度お試しください。"},"new_private_message":"メッセージを作成","private_message":"メッセージ","private_messages":"メッセージ","user_notifications":{"filters":{"filter_by":"フィルタで絞り込む","all":"すべて","read":"既読","unread":"未読"},"ignore_duration_title":"ユーザを無視","ignore_duration_username":"ユーザー名","ignore_duration_when":"期間：","ignore_duration_save":"無視する","ignore_duration_note":"無視の期間が過ぎると自動的に削除されますので、ご注意ください。","ignore_duration_time_frame_required":"時間枠を選択してください","ignore_no_users":"無視するユーザーはいません。","ignore_option":"無視する","ignore_option_title":"このユーザーに関連する通知は受信されず、それらのすべてのトピックと返信が非表示になります。","add_ignored_user":"追加...","mute_option":"通知しない","mute_option_title":"このユーザーに関連する通知は届きません。","normal_option":"通常","normal_option_title":"このユーザーがあなたに返信したり、引用したり、メンションすると通知されます。"},"notification_schedule":{"title":"通知スケジュール","label":"カスタム通知スケジュールを有効にする","tip":"これらの時間外は、自動的に「おやすみモード」に設定されます。","midnight":"深夜","none":"なし","monday":"月曜日","tuesday":"火曜日","wednesday":"水曜日","thursday":"木曜日","friday":"金曜日","saturday":"土曜日","sunday":"日曜日"},"activity_stream":"アクティビティ","read":"既読","read_help":"最近読んだトピック","preferences":"設定","feature_topic_on_profile":{"open_search":"新規トピックを選択","title":"トピックを選択","search_label":"タイトルでトピックを検索","save":"保存","clear":{"title":"クリア","warning":"おすすめのトピックをクリアしてもよろしいですか？"}},"use_current_timezone":"現在のタイムゾーンを使用","profile_hidden":"このユーザーの公開プロフィールは非公開です","expand_profile":"開く","collapse_profile":"折りたたむ","bookmarks":"ブックマーク","bio":"自己紹介","timezone":"タイムゾーン","invited_by":"招待した人: ","trust_level":"トラストレベル","notifications":"お知らせ","statistics":"統計","desktop_notifications":{"label":"ライブ通知","not_supported":"申し訳ありません。そのブラウザは通知をサポートしていません。","perm_default":"通知を有効にする","perm_denied_btn":"アクセス拒否","perm_denied_expl":"通知へのアクセスが拒否されました。ブラウザの設定から通知を許可してください。","disable":"通知を無効にする","enable":"通知を有効にする","each_browser_note":"注:この設定は、使用するすべてのブラウザーで変更する必要があります。この設定に関係なく、「おやすみモード」では、すべての通知が無効になります。","consent_prompt":"あなたの投稿に返信があったときライブ通知しますか？"},"dismiss":"閉じる","dismiss_notifications":"すべて既読にする","dismiss_notifications_tooltip":"全ての未読の通知を既読にします","first_notification":"最初の通知です! 始めるために選択してください。","dynamic_favicon":"ブラウザのアイコンに件数を表示する","skip_new_user_tips":{"description":"新規ユーザーのヒントとバッジをスキップする","not_first_time":"初めてではありませんか？","skip_link":"これらのヒントをスキップ"},"theme_default_on_all_devices":"これをすべてのデバイスのデフォルトテーマにする","color_scheme_default_on_all_devices":"すべてのデバイスでデフォルトの配色を設定する","color_scheme":"配色","color_schemes":{"default_description":"既定のテーマ","disable_dark_scheme":"通常と同じ","dark_instructions":"デバイスをダークモードに切り替えることで、ダークモードの配色をプレビューできます。","undo":"リセット","regular":"通常","dark":"ダークモード","default_dark_scheme":"(サイトのデフォルト)"},"dark_mode":"ダークモード","dark_mode_enable":"自動ダークモード配色を有効にする","text_size_default_on_all_devices":"これをすべての端末のデフォルトのテキストサイズにする","allow_private_messages":"他のユーザーが私にパーソナルメッセージを送信できるようにする","external_links_in_new_tab":"外部リンクをすべて別のタブで開く","enable_quoting":"選択したテキストを引用して返信する","enable_defer":"トピックを未読としてマークするために延期を有効にする","change":"変更","featured_topic":"注目のトピック","moderator":"%{user} はモデレータです","admin":"%{user} は管理者です","moderator_tooltip":"このユーザーはモデレータです","admin_tooltip":"このユーザーは管理者です","silenced_tooltip":"このユーザーは消音状態です","suspended_notice":"このユーザーは %{date} まで凍結状態です。","suspended_permanently":"このユーザーは凍結されています","suspended_reason":"理由: ","github_profile":"GitHub","email_activity_summary":"アクティビティの情報","mailing_list_mode":{"label":"メーリングリストモード","enabled":"メーリングリストモードを有効にする","instructions":"この設定は、アクティビティの情報機能を無効化します。<br />\nミュートしているトピックやカテゴリはこれらのメールには含まれません。\n","individual":"新しい投稿がある場合にメールで送る","individual_no_echo":"自分以外の新しい投稿がある場合にメールで送る","many_per_day":"投稿される度にメールで通知を受け取る (日に %{dailyEmailEstimate} 回程度)","few_per_day":"投稿される度にメールで通知を受け取る (日に2回程度)","warning":"メーリングリストモードです。メール通知設定が上書きされます。"},"tag_settings":"タグ","watched_tags":"ウォッチ中","watched_tags_instructions":"自動的にこれらのタグが付いた全てのトピックをウォッチします。全ての新規投稿と新規トピックが通知されまた、新規投稿数がトピックの隣に表示されます。","tracked_tags":"追跡","tracked_tags_instructions":"これらのタグのすべてのトピックを自動的に追跡します。 新しい投稿の数がトピックの横に表示されます。","muted_tags":"通知しない","muted_tags_instructions":"これらのタグが付いたトピックについて何も通知されず、また新着にも表示されません。","watched_categories":"ウォッチ中","watched_categories_instructions":"自動的にカテゴリー内の全てのトピックをウォッチします。全ての新規投稿と新規トピックが通知されまた、新規投稿数がトピックの隣に表示されます。","tracked_categories":"追跡中","tracked_categories_instructions":"自動的にカテゴリー内の全てのトピックを追跡します。新規投稿数がトピックの隣に表示されます。","watched_first_post_categories":"最初の投稿をウォッチする","watched_first_post_categories_instructions":"カテゴリー内の新規トピックに対する最初の投稿が通知されます。","watched_first_post_tags":"最初の投稿をウォッチする","watched_first_post_tags_instructions":"これらのタグの新規トピック内の新規投稿は通知されます。","muted_categories":"通知しない","muted_categories_instructions":"これらのカテゴリの新しいトピックについては通知されず、カテゴリや最新のページにも表示されません。","muted_categories_instructions_dont_hide":"グループ内の新規トピックについては何も通知されません。","regular_categories":"通常","regular_categories_instructions":"これらのカテゴリは「最新」と「トップ」のトピックリストに表示されます。","no_category_access":"モデレータとしてカテゴリーへのアクセスが制限されたので、保存できませんでした。","delete_account":"アカウントを削除する","delete_account_confirm":"アカウントを削除してもよろしいですか？削除されたアカウントは復元できません。","deleted_yourself":"あなたのアカウントは削除されました。","delete_yourself_not_allowed":"もしアカウントを削除したい場合はスタッフに連絡をしてください","unread_message_count":"メッセージ","admin_delete":"削除","users":"ユーザー","muted_users":"ミュート","muted_users_instructions":"これらのユーザーからのすべての通知とPMを抑えます。","allowed_pm_users":"許可","allowed_pm_users_instructions":"これらのユーザーからのPMのみを許可します。","allow_private_messages_from_specific_users":"特定のユーザーにのみ私へのパーソナルメッセージの送信を許可する","ignored_users":"無視する","ignored_users_instructions":"これらのユーザーからのすべての投稿、通知、およびPMを抑えます。","tracked_topics_link":"詳しく見る","automatically_unpin_topics":"最後まで読んだら自動的に固定表示を解除する。","apps":"アプリ連携","revoke_access":"アクセス解除","undo_revoke_access":"アクセス解除をやめる","api_approved":"承認されました:","api_last_used_at":"最終利用:","theme":"テーマ","save_to_change_theme":"\"%{save_text}\" をクリックするとテーマが更新されます","home":"デフォルトホームページ","staged":"段階","staff_counters":{"flags_given":"役に立った通報","flagged_posts":"通報された投稿","deleted_posts":"削除された投稿","suspensions":"凍結","warnings_received":"警告","rejected_posts":"拒否された投稿"},"messages":{"all":"すべて","inbox":"受信ボックス","sent":"送信済み","archive":"アーカイブ","groups":"自分のグループ","bulk_select":"メッセージを選択","move_to_inbox":"受信ボックスへ移動","move_to_archive":"アーカイブ","failed_to_move":"選択したメッセージを移動できませんでした(ネットワークがダウンしている可能性があります)","select_all":"すべて選択する","tags":"タグ"},"preferences_nav":{"account":"アカウント","profile":"プロフィール","emails":"メール","notifications":"お知らせ","categories":"カテゴリ","users":"ユーザー","tags":"タグ","interface":"表示設定","apps":"アプリ連携"},"change_password":{"success":"(メールを送信しました)","in_progress":"(メールを送信中)","error":"(エラー)","emoji":"絵文字をロックする","action":"パスワードリセット用メールを送信する","set_password":"パスワードを設定する","choose_new":"新規パスワードを決定","choose":"パスワードを決定"},"second_factor_backup":{"title":"2要素バックアップコード","regenerate":"API キーを再生成","disable":"利用できません","enable":"利用できます","enable_long":"バックアップコードを有効にします","manage":{"other":"バックアップコードを管理してください。 <strong>%{count}</strong> 個のバックアップコードが残っています。"},"copy_to_clipboard":"クリップボードにコピー","copy_to_clipboard_error":"クリップボードにコピーする際にエラーが発生しました","copied_to_clipboard":"クリップボードにコピーしました","download_backup_codes":"バックアップコードのダウンロード","remaining_codes":{"other":"<strong>%{count}</strong> 個のバックアップコードが残っています。"},"use":"バックアップコードを使用","enable_prerequisites":"バックアップコードを生成する前に、最初の2 要素方式を有効にする必要があります。","codes":{"title":"バックアップコードが作られました","description":"これらのバックアップコードはそれぞれ1回しか使用できません。それらを安全でアクセス可能な場所に保管してください。"}},"second_factor":{"title":"2段階認証","enable":"2要素認証の管理","disable_all":"すべて無効","forgot_password":"パスワードを忘れましたか？","confirm_password_description":"続行するにはパスワードを入力してください","name":"名前","label":"コード","rate_limit":"別の認証コードを試す前に、しばらくお待ちください。","enable_description":"サポートされているアプリ (<a href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\">Android</a> – <a href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\">iOS</a>) でこのQRコードをスキャンし、認証コードを入力します。\n","disable_description":"アプリから認証コードを入力してください","show_key_description":"手動入力","short_description":"1回限りのセキュリティコードでアカウントを保護します。\n","extended_description":"2要素認証は、パスワードに加えてワンタイムトークンを必要とすることで、アカウントに追加のセキュリティを追加します。 トークンは <a href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'>Android</a> および <a href=\"https://www.google.com/search?q=authenticator+apps+for+ios\">iOS</a> で生成できます。\n","oauth_enabled_warning":"アカウントで2段階認証が有効になると、ソーシャルログインは無効になります。","use":"認証アプリを使用","enforced_notice":"このサイトにアクセスするには2段階認証を有効にする必要があります。","disable":"利用できません","disable_confirm":"すべての2要素認証を無効にしてもよろしいですか？","save":"保存","edit":"編集","edit_title":"認証器の編集","edit_description":"認証器名","enable_security_key_description":"<a href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\">ハードウェアセキュリティキー</a> 準備したら、下の[登録]ボタンを押します。\n","totp":{"title":"トークンベースの認証","add":"認証器の追加","default_name":"自分の認証器","name_and_code_required_error":"認証アプリから名前とコードを入力する必要があります。"},"security_key":{"register":"登録","title":"セキュリティキー","add":"セキュリティキーの追加","default_name":"メインセキュリティキー","not_allowed_error":"セキュリティキーの登録プロセスがタイムアウトしたか、キャンセルされました。","already_added_error":"このセキュリティキーはすでに登録されています。再度登録する必要はありません。","edit":"セキュリティキーの編集","save":"保存","edit_description":"セキュリティキー名","name_required_error":"セキュリティキーの名前を指定する必要があります。"}},"change_about":{"title":"プロフィールを変更","error":"変更中にエラーが発生しました。"},"change_username":{"title":"ユーザー名を変更","confirm":"ユーザー名を変更してもよろしいですか？","taken":"このユーザー名は既に使われています。","invalid":"このユーザー名は無効です。英数字のみ利用可能です。"},"add_email":{"title":"メールアドレスを追加","add":"追加"},"change_email":{"title":"メールアドレスを変更","taken":"このメールアドレスは既に使われています。","error":"メールアドレス変更中にエラーが発生しました。既にこのアドレスが使われているのかもしれません。","success":"このアドレスにメールを送信しました。メールの指示に従って確認処理を行ってください。","success_via_admin":"そのアドレスにメールを送信しました。ユーザーはメールの確認手順に従う必要があります。","success_staff":"現在のメールアドレスにメールを送信しました。メールに従い手続きをおこなってください。"},"change_avatar":{"title":"プロフィール画像を変更","gravatar":"<a href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'>%{gravatarName}</a> に基づいて","gravatar_title":"%{gravatarName} のウェブサイトでアバターを変更する","gravatar_failed":"そのメールアドレスで %{gravatarName} が見つかりませんでした。","refresh_gravatar_title":"%{gravatarName} を更新","letter_based":"システムプロフィール画像","uploaded_avatar":"カスタム画像","uploaded_avatar_empty":"カスタム画像を追加","upload_title":"画像をアップロード","image_is_not_a_square":"警告: アップロードされた画像は高さと幅が違うため切り落されました。"},"change_profile_background":{"title":"プロフィールヘッダー","instructions":"プロフィールヘッダーは中央に配置され、デフォルトの幅は1110pxになります。"},"change_card_background":{"title":"ユーザーカードの背景画像","instructions":"背景画像は、幅590pxで中央揃えになります"},"change_featured_topic":{"title":"注目のトピック","instructions":"このトピックへのリンクは、あなたのユーザーカードとプロフィールにあります。"},"email":{"title":"メールアドレス","primary":"主要なメールアドレス","secondary":"その他のメールアドレス","primary_label":"プライマリー","unconfirmed_label":"未確認","resend_label":"確認メールを再送信","resending_label":"送信中...","resent_label":"メールを送信しました","update_email":"メールアドレスを変更","set_primary":"プライマリメールアドレスの設定","destroy":"メールアドレスを削除","add_email":"代替メールアドレスを追加","auth_override_instructions":"メールは、外部認証サービスから更新できます。","no_secondary":"その他のメールアドレスはありません","instructions":"他人に公開はされません","admin_note":"注：管理者ユーザーが別の非管理者ユーザーの電子メールを変更すると、そのユーザーは元の電子メールアカウントでアクセスできなくなるため、パスワードのリセットメールが新しいアドレスに送信されます。ユーザーのメールアドレスは、パスワードのリセットプロセスが完了するまで変更されません。","ok":"確認用メールを送信します","required":"メールアドレスを入力してください","invalid":"正しいメールアドレスを入力してください","authenticated":"あなたのメールアドレスは %{provider} によって認証されています","frequency_immediately":"あなたがまだ読んでいない未送信分の内容について今すぐメールを送ります。","frequency":{"other":"最後に利用されてから%{count}分以上経過した場合にメールを送ります。"}},"associated_accounts":{"title":"関連アカウント","connect":"接続","revoke":"解除","cancel":"キャンセル","not_connected":"(接続されていない)","confirm_modal_title":"%{provider} アカウントに接続","confirm_description":{"account_specific":"あなたの %{provider} アカウント '%{account_description}' は認証に使用されます。","generic":"あなたの %{provider} アカウントは認証に使用されます。"}},"name":{"title":"名前","instructions":"氏名(任意)","instructions_required":"氏名","required":"名前を入力してください","too_short":"名前が短いです","ok":"問題ありません"},"username":{"title":"ユーザー名","instructions":"他人と被らず、空白を含まず、短い名前を入力してください。","short_instructions":"@%{username} であなたにメンションを送ることができます","available":"ユーザー名は利用可能です","not_available":"利用できない名前です。 %{suggestion} などはどうでしょうか？","not_available_no_suggestion":"そのユーザー名は利用できません","too_short":"ユーザー名が短すぎます","too_long":"ユーザー名が長すぎます","checking":"ユーザー名が利用可能か確認しています...","prefilled":"この登録ユーザー名にマッチするメールアドレスが見つかりました","required":"ユーザー名を入力してください","edit":"ユーザー名を編集"},"locale":{"title":"表示する言語","instructions":"ユーザインターフェイスの言語です。ページを再読み込みした際に変更されます。","default":"(デフォルト)","any":"任意"},"password_confirmation":{"title":"もう一度パスワードを入力してください。"},"invite_code":{"title":"招待コード","instructions":"アカウント登録には招待コードが必要です"},"auth_tokens":{"title":"最近使用した端末","details":"詳細","log_out_all":"すべてログアウトする","not_you":"あなたではない？","show_all":"すべてを見る(%{count})","show_few":"表示件数を少なくする","was_this_you":"これはあなたですか？","was_this_you_description":"あなたではない場合は、パスワードを変更しログアウトすることをお勧めします。","browser_and_device":"%{browser} on %{device}","secure_account":"アカウントの保護","latest_post":"最後の投稿…","device_location":"<span class=\"auth-token-device\">%{device}</span> &ndash; <span title=\"IP: %{ip}\">%{location}</span>","browser_active":"%{browser} | <span class=\"active\">現在アクティブ</span>","browser_last_seen":"%{browser} | %{date}"},"last_posted":"最後の投稿","last_emailed":"最終メール","last_seen":"最後のアクティビティ","created":"参加日","log_out":"ログアウト","location":"場所","website":"ウェブサイト","email_settings":"メール","hide_profile_and_presence":"公開プロフィールとプレゼンス機能を非表示にする","enable_physical_keyboard":"iPadで物理キーボードのサポートを有効にする","text_size":{"title":"テキストサイズ","smallest":"最小","smaller":"小","normal":"デフォルト","larger":"大","largest":"最大"},"title_count_mode":{"notifications":"新しい通知","contextual":"新しいページのコンテンツ"},"like_notification_frequency":{"title":"いいねされた時に通知","always":"常時","first_time_and_daily":"その日の最初の「いいね！」","first_time":"最初の「いいね！」","never":"通知しない"},"email_previous_replies":{"title":"メールの文章の下部に以前の返信を含める","unless_emailed":"最初だけ","always":"常に含める","never":"含めない"},"email_digests":{"title":"ここを訪れていないとき、人気のトピックと返信のサマリーをメールで送信する","every_30_minutes":"30分毎","every_hour":"1時間毎","daily":"毎日","weekly":"毎週","every_month":"毎月","every_six_months":"6ヶ月毎"},"email_level":{"title":"誰かが投稿を引用した時、投稿に返信があった時、私のユーザ名にメンションがあった時、またはトピックへの招待があった時にメールで通知を受け取る。","always":"常に含める","only_when_away":"離れている時のみ","never":"追跡しない"},"email_messages_level":"メッセージを受け取ったときにメールで通知を受け取る。","include_tl0_in_digests":"サマリーをメールする際、新しいユーザーのコンテンツを含める","email_in_reply_to":"メールに投稿への返信の抜粋を含める","other_settings":"その他","categories_settings":"カテゴリの設定","new_topic_duration":{"label":"以下の条件でトピックを新規と見なす","not_viewed":"未読","last_here":"ログアウトした後に投稿されたもの","after_1_day":"昨日投稿されたもの","after_2_days":"2日前に投稿されたもの","after_1_week":"先週投稿されたもの","after_2_weeks":"2週間前に投稿されたもの"},"auto_track_topics":"自動でトピックを追跡する","auto_track_options":{"never":"追跡しない","immediately":"今すぐ","after_30_seconds":"30秒後","after_1_minute":"1分後","after_2_minutes":"2分後","after_3_minutes":"3分後","after_4_minutes":"4分後","after_5_minutes":"5分後","after_10_minutes":"10分後"},"notification_level_when_replying":"トピックに投稿するときは、トピックを","invited":{"title":"招待","pending_tab":"保留中","pending_tab_with_count":"保留中 (%{count})","redeemed_tab":"確認済み","redeemed_tab_with_count":"確認済み (%{count})","reinvited":"再度招待しました","search":"招待履歴を検索","user":"招待したユーザ","none":"表示する招待はありません。","truncated":{"other":"%{count} 件の招待を表示しています。"},"redeemed":"招待を確認する","redeemed_at":"確認済み","pending":"保留中の招待","topics_entered":"閲覧したトピックの数","posts_read_count":"読んだ投稿","expired":"この招待の有効期限が切れました。","reinvite_all_confirm":"本当に全ての招待を再送したいですか?","time_read":"読んだ時間","days_visited":"閲覧された日数","account_age_days":"アカウント有効日数","create":"招待","generate_link":"招待リンクの作成","link_generated":"これがあなたの招待リンクです！","valid_for":"招待リンクはこのメールアドレスにだけ有効です。%{email}","single_user":"メールで招待","multiple_user":"リンクで招待","invite_link":{"title":"招待リンク","success":"招待リンクが生成されました！","error":"招待リンクの生成中にエラーが発生しました","max_redemptions_allowed_label":"このリンクを使用して登録できる人数は何人ですか？","expires_at":"この招待リンクの有効期限はいつまでですか？"},"bulk_invite":{"none":"このページに表示する招待はありません。","text":"一括招待","error":"申し訳ありません、ファイルはCSV形式である必要があります。"}},"password":{"title":"パスワード","too_short":"パスワードが短すぎます。","common":"このパスワードは他のユーザが使用している可能性があります。","same_as_username":"パスワードがユーザ名と一致しています","same_as_email":"パスワードとメールアドレスが一致しています","ok":"最適なパスワードです。","instructions":"最低 %{count} 文字以上","required":"パスワードを入力してください"},"summary":{"title":"サマリー","stats":"統計","time_read":"読んだ時間","recent_time_read":"現在の読んだ時間","topic_count":{"other":"つのトピックを作成"},"post_count":{"other":"つの投稿"},"likes_given":{"other":"与えた"},"likes_received":{"other":"もらった"},"days_visited":{"other":"訪問日数"},"topics_entered":{"other":"トピックの閲覧"},"posts_read":{"other":"読んだ投稿"},"bookmark_count":{"other":"つのブックマーク"},"top_replies":"返信上位","no_replies":"まだ返信はありません。","more_replies":"その他の返信","top_topics":"トピック上位","no_topics":"まだトピックはありません。","more_topics":"その他のトピック","top_badges":"最近ゲットしたバッジ","no_badges":"まだバッジはありません。","more_badges":"バッジをもっと見る","top_links":"リンク上位","no_links":"まだリンクはありません。","most_liked_by":"最も「いいね！」してくれた","most_liked_users":"最も「いいね！」した","most_replied_to_users":"最も返信した","no_likes":"「いいね！」はまだありません。","top_categories":"トップカテゴリ","topics":"トピック","replies":"返信"},"ip_address":{"title":"最後のIPアドレス"},"registration_ip_address":{"title":"登録時のIPアドレス"},"avatar":{"title":"プロフィール画像","header_title":"プロフィール、メッセージ、ブックマーク、設定","edit":"プロフィール画像の編集"},"title":{"title":"肩書き","none":"（なし）"},"primary_group":{"title":"プライマリーグループ","none":"（なし）"},"filters":{"all":"すべて"},"stream":{"posted_by":"投稿者","sent_by":"送信者","private_message":"メッセージ","the_topic":"トピック"}},"loading":"読み込み中...","errors":{"prev_page":"右記の項目をロード中に発生: ","reasons":{"network":"ネットワークエラー","server":"サーバーエラー","forbidden":"アクセス拒否","unknown":"エラー","not_found":"ページが見つかりません"},"desc":{"network":"インターネット接続を確認してください。","network_fixed":"ネットワーク接続が回復しました。","server":"エラーコード : %{status}","forbidden":"閲覧する権限がありません","not_found":"アプリケーションが存在しないURLを読み込もうとしました。","unknown":"エラーが発生しました。"},"buttons":{"back":"戻る","again":"やり直す","fixed":"ページロード"}},"modal":{"close":"閉じる","dismiss_error":"エラーを閉じる"},"close":"閉じる","logout":"ログアウトしました","refresh":"更新","home":"ホーム","read_only_mode":{"enabled":"このサイトは閲覧専用モードになっています。閲覧し続けられますが、返信したりいいねを付けるなどのアクションは現在出来ません。","login_disabled":"閲覧専用モードのため、ログインできません。","logout_disabled":"閲覧専用モードのため、ログアウトできません。"},"logs_error_rate_notice":{},"learn_more":"より詳しく...","first_post":"最初の投稿","mute":"ミュート","unmute":"ミュート解除","last_post":"最終投稿","local_time":"現地時間","time_read":"既読","time_read_recently":"最近の読んだ時間 %{time_read}","time_read_tooltip":"合計読んだ時間 %{time_read}","time_read_recently_tooltip":"合計読んだ時間 %{time_read} (過去 60 日間で%{recent_time_read})","last_reply_lowercase":"最後の返信","replies_lowercase":{"other":"返信"},"signup_cta":{"sign_up":"新しいアカウントを作成","hide_session":"明日私に思い出させてください。","hide_forever":"いいえ、結構です","hidden_for_session":"わかりました、明日お尋ねします。あなたは「ログイン」からいつでもアカウントを作成できます。","intro":"こんにちは！ :heart_eyes: エンジョイしていますね。 ですが、サインアップしていないようです。","value_prop":"アカウントを作成した後、いま読んでいるページへ戻ります。また、新しい投稿があった場合はこことメールにてお知らせします。 いいね！を使って好きな投稿をみんなに教えましょう。 :heartbeat:"},"summary":{"enabled_description":"トピックのまとめを表示されています。","enable":"このトピックを要約する","disable":"すべての投稿を表示する"},"deleted_filter":{"enabled_description":"削除された投稿は非表示になっています。","disabled_description":"削除された投稿は表示しています。","enable":"削除された投稿を非表示にする","disable":"削除された投稿を表示する"},"private_message_info":{"title":"メッセージ","invite":"他の人を招待する...","edit":"追加、削除","remove":"削除...","add":"追加...","leave_message":"本当にメッセージから離れますか？","remove_allowed_user":"このメッセージから %{name} を削除してもよろしいですか？","remove_allowed_group":"このメッセージから %{name} を削除してもよろしいですか？"},"email":"メール","username":"ユーザ名","last_seen":"最終アクティビティ","created":"作成","created_lowercase":"投稿者","trust_level":"トラストレベル","search_hint":"ユーザ名、メールアドレスまたはIPアドレス","create_account":{"header_title":"ようこそ！","subheader_title":"アカウントを作成しましょう","disclaimer":"登録すると<a href='%{privacy_link}' target='blank'>プライバシーポリシー</a>と<a href='%{tos_link}' target='blank'>利用規約</a>に同意することになります。","title":"アカウントの作成","failed":"エラーが発生しました。既にこのメールアドレスは使用中かもしれません。「パスワードを忘れました」リンクを試してみてください"},"forgot_password":{"title":"パスワードをリセット","action":"パスワードを忘れました","invite":"ユーザ名かメールアドレスを入力してください。パスワードリセット用のメールを送信します。","reset":"パスワードをリセット","complete_username":"<b>%{username}</b>,アカウントにパスワード再設定メールを送りました。","complete_email":"<b>%{email}</b>宛にパスワード再設定メールを送信しました。","complete_username_found":"<b>%{username}</b> に一致するアカウントが見つかりました。まもなく、パスワードのリセット方法が記載されたメールが届きます。","complete_email_found":"<b>%{email}</b> に一致するアカウントが見つかりました。まもなく、パスワードのリセット方法が記載されたメールが届きます。","complete_username_not_found":" <b>%{username}</b>は見つかりませんでした","complete_email_not_found":"<b>%{email}</b>で登録したアカウントがありません。","help":"メールが届かない？最初に迷惑メールフォルダを確認してください。<p>使用したメールアドレスがわかりませんか？メールアドレスを入力すると、存在するかどうかをお知らせします。</p><p>アカウントのメールアドレスにアクセスできなくなった場合は、スタッフにご連絡ください。<a href='%{basePath}/about'> </a></p>","button_ok":"OK","button_help":"ヘルプ"},"email_login":{"link_label":"ログインリンクをメールする","button_label":"メール","emoji":"絵文字をロックする","complete_username":"アカウントがユーザー名 <b>%{username}</b>と一致する場合、まもなくログインリンクが記載されたメールが届きます。","complete_email":"アカウントが <b>%{email}</b>と一致する場合、まもなくログインリンクが記載されたメールが届きます。","complete_username_found":"<b>%{username}</b> に一致するアカウントが見つかりました。まもなく、ログインリンクが記載されたメールが届きます。","complete_email_found":"<b>%{email}</b> に一致するアカウントが見つかりました。まもなく、ログインリンクが記載されたメールが届きます。","complete_username_not_found":" <b>%{username}</b>は見つかりませんでした","complete_email_not_found":"<b>%{email}</b> にアカウントはありません","confirm_title":"%{site_name}へ","logging_in_as":"%{email} としてログイン","confirm_button":"ログイン完了"},"login":{"subheader_title":"アカウントにログインする","username":"ユーザ名","password":"パスワード","second_factor_title":"2要素認証","second_factor_description":"アプリから認証コードを入力してください:","second_factor_backup":"バックアップ コードを使用してログイン","second_factor_backup_title":"2段階バックアップ","second_factor_backup_description":"バックアップコードを入力: ","second_factor":"認証アプリを使用してログイン","security_key_description":"物理的なセキュリティキーを用意している場合は、以下のセキュリティキーで認証ボタンを押します。","security_key_alternative":"別の方法を試してください","security_key_authenticate":"セキュリティキーで認証","security_key_not_allowed_error":"セキュリティキー認証プロセスがタイムアウトしたか、キャンセルされました。","security_key_no_matching_credential_error":"提供されたセキュリティキーに一致する資格情報が見つかりませんでした。","security_key_support_missing_error":"現在のデバイスまたはブラウザは、セキュリティキーの使用をサポートしていません。別の方法を使用してください。","email_placeholder":"メールアドレス / ユーザ名","caps_lock_warning":"Caps Lockがオンになっています。","error":"不明なエラー","cookies_error":"お使いのブラウザでCookieが無効になっているようです。最初に有効にしないとログインできない場合があります。","rate_limit":"しばらく待ってから再度ログインをお試しください。","blank_username":"あなたのメールアドレスかユーザー名を入力してください。","blank_username_or_password":"あなたのメールアドレスかユーザ名、そしてパスワードを入力して下さい。","reset_password":"パスワードをリセット","logging_in":"ログイン中...","or":"または","authenticating":"認証中...","awaiting_activation":"あなたのアカウントはアクティベーション待ちの状態です。もう一度アクティベーションメールを送信するには「パスワードを忘れました」リンクをクリックしてください。","awaiting_approval":"アカウントはまだスタッフに承認されていません。承認され次第メールにてお知らせいたします。","requires_invite":"申し訳ありませんが、このフォーラムは招待制です。","not_activated":"まだログインできません。<b>%{sentTo}</b> にアクティベーションメールを送信しております。メールの指示に従ってアカウントのアクティベーションを行ってください。","not_allowed_from_ip_address":"このIPアドレスでログインできません","admin_not_allowed_from_ip_address":"そのIPアドレスからは管理者としてログインできません","resend_activation_email":"再度アクティベーションメールを送信するにはここをクリックしてください。","omniauth_disallow_totp":"あなたのアカウントは２段階認証が有効になっています。ログインにはパスワードが必要です。","resend_title":"アクティベーションメールの再送","change_email":"メールアドレスの変更","provide_new_email":"新しいメールアドレスを設定します。このあと、確認のメールを送信します。","submit_new_email":"メールアドレスの更新","sent_activation_email_again":"<b>%{currentEmail}</b> にアクティベーションメールを再送信しました。メールが届くまで数分掛かることがあります。 (メールが届かない場合は、迷惑メールフォルダの中をご確認ください)。","sent_activation_email_again_generic":"アクティベーションメールを送りました。届くのに少し時間がかかるかもしれません。スパムフォルダーも確認してください。","to_continue":"ログインしてください","preferences":"ユーザ設定を変更するには、ログインする必要があります。","not_approved":"あなたのアカウントはまだ承認されていません。ログイン可能になった際にメールで通知いたします。","google_oauth2":{"name":"Google","title":"Google"},"twitter":{"name":"Twitter","title":"Twitter"},"instagram":{"name":"Instagram","title":"Instagram"},"facebook":{"name":"Facebook","title":"Facebook"},"github":{"name":"GitHub","title":"GitHub"},"discord":{"name":"Discord","title":"Discord"},"second_factor_toggle":{"totp":"代わりに認証アプリを使用する","backup_code":"代わりにバックアップコードを使用する"}},"invites":{"accept_title":"招待","emoji":"封筒の絵文字","welcome_to":"%{site_name}へようこそ!","invited_by":"あなたは招待されました:","social_login_available":"このメールアドレスを使ってソーシャルログインすることも可能です。","your_email":"あなたのアカウントのメールアドレスは <b>%{email}</b> です。","accept_invite":"招待に応じる","success":"あなたのアカウントは作成されて、ログインされました。","name_label":"氏名","password_label":"パスワード","optional_description":"(任意)"},"password_reset":{"continue":"%{site_name} に進む"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebookメッセンジャー"},"category_page_style":{"categories_only":"カテゴリのみ","categories_with_featured_topics":"おすすめのトピックのカテゴリ","categories_and_latest_topics":"カテゴリと最新トピック","categories_and_top_topics":"カテゴリーと人気トピック","categories_boxes":"サブカテゴリのあるボックス","categories_boxes_with_topics":"注目のトピックのあるボックス"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"読み込み中..."},"category_row":{"topic_count":{"other":"このカテゴリ内の %{count} 件のトピック"},"plus_subcategories_title":{"other":"%{name} および %{count} 個のサブカテゴリ"},"plus_subcategories":{"other":"+ %{count} 個のサブカテゴリ"}},"select_kit":{"filter_by":"%{name} でフィルター","select_to_filter":"フィルタする値を選択","default_header_text":"選択...","no_content":"一致する項目が見つかりませんでした","filter_placeholder":"検索...","filter_placeholder_with_any":"検索 または 新規作成","create":"作成:'%{content}'","max_content_reached":{"other":"%{count}アイテムまで選択できます。"},"min_content_not_reached":{"other":"少なくとも%{count}アイテムを選択してください。"},"invalid_selection_length":{"other":"選択は%{count}文字以上必要です。"},"components":{"categories_admin_dropdown":{"title":"カテゴリの管理"}}},"date_time_picker":{"from":"発信元","to":"宛先"},"emoji_picker":{"filter_placeholder":"絵文字を探す","smileys_&_emotion":"スマイリーと感情","people_&_body":"人と体","animals_&_nature":"動物と自然","food_&_drink":"食べ物と飲み物","travel_&_places":"旅行と場所","activities":"活動","objects":"オブジェクト","symbols":"シンボル","flags":"旗","recent":"最近使ったもの","default_tone":"スキントーンなし","light_tone":"ライトスキントーン","medium_light_tone":"ミディアムライトスキントーン","medium_tone":"ミディアムスキントーン","medium_dark_tone":"ミディアムダークスキントーン","dark_tone":"ダークスキントーン","default":"カスタム絵文字"},"shared_drafts":{"title":"共有ドラフト","notice":"このトピックは、共有の下書きを公開できるユーザーのみに表示されます。","destination_category":"宛先カテゴリ","publish":"共有ドラフトの公開","confirm_publish":"この下書きを公開してもよろしいですか？","publishing":"トピック公開中..."},"composer":{"emoji":"絵文字 :)","more_emoji":"もっと...","options":"オプション","whisper":"ささやき","unlist":"リストから非表示","add_warning":"これは運営スタッフからの警告です。","toggle_whisper":"ささやき機能の切り替え","toggle_unlisted":"表示非表示を切り替える","posting_not_on_topic":"どのトピックに返信しますか?","saved_local_draft_tip":"ローカルに保存しました","similar_topics":"このトピックに似ているものは...","drafts_offline":"オフラインの下書き","edit_conflict":"競合の編集","group_mentioned_limit":{"other":"<b>警告！</b> <a href='%{group_link}'>%{group}</a>にメンションしましたが、このグループには、管理者が設定したメンション制限の %{count} 人のユーザーよりも多くのメンバーがいます。そのため誰にも通知されません。"},"group_mentioned":{"other":"%{group}へのメンションで、 約<a href='%{group_link}'>%{count} 人</a> へ通知されます。よろしいですか？"},"cannot_see_mention":{"category":"%{username}にメンションしましたが、このカテゴリへのアクセス権がないため通知されません。このカテゴリへのアクセス権があるグループにメンバー追加してください。","private":"%{username}にメンションしましたが、このパーソナルメッセージを見ることができないため通知されません。このパーソナルメッセージに招待してください。"},"duplicate_link":"<b>%{domain}</b> については、すでに<b>@%{username}</b> が <a href='%{post_url}'>%{ago}</a> 前に投稿しています。再び投稿してよろしいですか？","reference_topic_title":"RE: %{title}","error":{"title_missing":"タイトルを入力してください。","title_too_short":{"other":"タイトルは%{count}文字以上必要です。"},"title_too_long":{"other":"タイトルは %{count} 文字以上にすることはできません"},"post_missing":"空白の投稿はできません","post_length":{"other":"投稿は%{count}文字以上必要です。"},"try_like":" %{heart} ボタンは試しましたか？","category_missing":"カテゴリを選択してください。","tags_missing":{"other":"少なくとも %{count} つのタグが必要です。"},"topic_template_not_modified":"トピックテンプレートを編集して、トピックに詳細を追加してください。"},"save_edit":"編集内容を保存","overwrite_edit":"上書き編集","reply_original":"オリジナルトピックへ返信","reply_here":"ここに返信","reply":"返信","cancel":"キャンセル","create_topic":"トピックを作る","create_pm":"メッセージ","create_whisper":"ささやき","create_shared_draft":"共有ドラフトを作成","edit_shared_draft":"共有ドラフトの編集","title":"Ctrl+Enterでも投稿できます","users_placeholder":"追加するユーザ","title_placeholder":"トピックのタイトルを入力してください。","title_or_link_placeholder":"タイトルを記入するか、リンクを貼ってください","edit_reason_placeholder":"編集する理由は何ですか?","topic_featured_link_placeholder":"タイトルにリンクを入力してください。","remove_featured_link":"トピックからリンクを削除する。","reply_placeholder":"文章を入力してください。 Markdown, BBコード, HTMLが使用出来ます。 画像はドラッグアンドドロップで貼り付けられます。","reply_placeholder_no_images":"文章を入力してください。 Markdown, BBコード, HTMLが使用出来ます。","reply_placeholder_choose_category":"ここで入力する前にカテゴリを選んでください。","view_new_post":"新しい投稿を見る。","saving":"保存中","saved":"保存しました!","saved_draft":"下書きを投稿中です。タップして再開します。","uploading":"アップロード中...","quote_post_title":"投稿全体を引用","bold_label":"B","bold_title":"太字","bold_text":"太字にしたテキスト","italic_label":"斜体","italic_title":"斜体","italic_text":"斜体のテキスト","link_title":"ハイパーリンク","link_description":"リンクの説明をここに入力","link_dialog_title":"ハイパーリンクの挿入","link_optional_text":"タイトル(オプション)","link_url_placeholder":"トピックを検索するためにURLを貼り付けるか入力してください","blockquote_title":"引用","blockquote_text":"引用","code_title":"整形済みテキスト","code_text":"4文字スペースでインデント","paste_code_text":"コードをここに入力","upload_title":"アップロード","upload_description":"アップロード内容の説明文をここに入力","olist_title":"番号付きリスト","ulist_title":"箇条書き","list_item":"リストアイテム","help":"Markdown 編集のヘルプ","modal_ok":"OK","modal_cancel":"キャンセル","cant_send_pm":"%{username}へメッセージを送ることはできません。","yourself_confirm":{"title":"受信者の追加を忘れましたか？","body":"たった今このメッセージはあなただけに送られました。"},"admin_options_title":"このトピックの詳細設定","composer_actions":{"reply":"返信","draft":"下書き","edit":"編集","reply_to_post":{"desc":"特定の投稿に返信する"},"reply_as_new_topic":{"label":"トピックのリンクを付けて返信","desc":"このトピックにリンクしている新しいトピックを作成する","confirm":"新しいトピックの下書きが保存されていますが、リンクされたトピックを作成すると上書きされます。"},"reply_as_private_message":{"label":"メッセージを作成","desc":"新しいパーソナルメッセージを作成する"},"reply_to_topic":{"label":"トピックへ返信","desc":"特定の投稿ではなく、トピックに返信する"},"create_topic":{"label":"新規トピック"},"shared_draft":{"label":"共有ドラフト"}},"reload":"再読み込み","ignore":"無視する","details_title":"サマリー","details_text":"この文字は表示されません。"},"notifications":{"tooltip":{"regular":{"other":"%{count}件の未読通知"},"message":{"other":"%{count}件の未読メッセージ"},"high_priority":{"other":"%{count}件の未読の優先度の高い通知"}},"title":"@ユーザ名 のメンション、投稿やトピックへの返信、メッセージなどの通知","none":"通知を読み込むことができませんでした。","empty":"通知はありません。","post_approved":"あなたの投稿は承認されました","reviewable_items":"レビューが必要なアイテム","mentioned":"<span>%{username}</span> %{description}","group_mentioned":"<span>%{username}</span> %{description}","quoted":"<span>%{username}</span> %{description}","bookmark_reminder":"<span>%{username}</span> %{description}","replied":"<span>%{username}</span> %{description}","posted":"<span>%{username}</span> %{description}","edited":"<span>%{username}</span> %{description}","liked":"<span>%{username}</span> %{description}","liked_consolidated":"<span>%{username}</span> %{description}","private_message":"<span>%{username}</span> %{description}","invited_to_private_message":"<p><span>%{username}</span> %{description}","invited_to_topic":"<span>%{username}</span> %{description}","invitee_accepted":"<span>%{username}</span> があなたの招待を受理しました","moved_post":"<span>%{username}</span> は %{description} を移動しました","linked":"<span>%{username}</span> %{description}","granted_badge":"'%{description}'バッジをゲット！","topic_reminder":"<span>%{username}</span> %{description}","watching_first_post":"<span>新しいトピック</span> %{description}","votes_released":"%{description} - 完了","group_message_summary":{"other":"%{group_name} 宛のメッセージが %{count} 通あります"},"popup":{"mentioned":"\"%{topic}\"で%{username} にメンションされました - %{site_title}","group_mentioned":"\"%{topic}\"で%{username} にメンションされました - %{site_title}","quoted":"\"%{topic}\"で%{username}が引用しました - %{site_title}","replied":"%{username}が\"%{topic}\"へ返信しました - %{site_title}","posted":"%{username} が投稿しました \"%{topic}\" - %{site_title}","private_message":"%{username} が \"%{topic}\" - %{site_title} であなたに個人的なメッセージを送信しました","linked":"\"%{topic}\"にあるあなたの投稿に%{username}がリンクしました - %{site_title}","watching_first_post":"%{username} が \"%{topic}\" - %{site_title}を投稿しました","confirm_title":"通知を有効にしました - %{site_title}","confirm_body":"成功！通知を可能にしました！"},"titles":{"mentioned":"メンション済み","replied":"新しい返信","quoted":"引用された","edited":"編集済み","private_message":"新しいプライベートメッセージ","invited_to_private_message":"プライベートメッセージに招待","invitee_accepted":"招待が承認されました","posted":"新しい投稿","moved_post":"投稿が移動されました","granted_badge":"バッジが付与されました","invited_to_topic":"トピックに招待済み","group_mentioned":"グループがメンションされました","group_message_summary":"新しいグループメッセージ","watching_first_post":"新着トピック","topic_reminder":"トピックのリマインダー"}},"upload_selector":{"title":"画像のアップロード","title_with_attachments":"画像/ファイルをアップロード","from_my_computer":"このデバイスから","from_the_web":"Web から","remote_tip":"画像へのリンク","remote_tip_with_attachments":"画像かファイルへのリンク %{authorized_extensions}","local_tip":"ローカルからアップロードする画像を選択","local_tip_with_attachments":"デバイスから画像/ファイルを選択する %{authorized_extensions}","hint":"(アップロードする画像をエディタにドラッグ&ドロップすることもできます)","hint_for_supported_browsers":"ドラッグ＆ドロップあるいはエディター内に画像を貼り付けてください。","uploading":"アップロード中","select_file":"ファイル選択","default_image_alt_text":"画像"},"search":{"sort_by":"並べ替え","relevance":"一番関連しているもの","latest_post":"最近の投稿","latest_topic":"最近のトピック","most_viewed":"最も閲覧されている順","most_liked":"「いいね！」されている順","select_all":"すべて選択する","clear_all":"すべてクリア","too_short":"検索文字が短すぎます。","title":"トピック、投稿、ユーザ、カテゴリを探す","no_results":"何も見つかりませんでした。","no_more_results":"検索結果は以上です。","post_format":"#%{post_number} %{username}から","more_results":"検索結果が多数あります。検索条件を絞ってください。","cant_find":"探しているものが見つかりませんか？","start_new_topic":"新しいトピックを始めてみては？","or_search_google":"あるいは、Google検索で試してみてください:","search_google":"Google検索で試してみてください:","search_google_button":"Google","context":{"user":"@%{username}の投稿を検索","category":"#%{category} から検索する","topic":"このトピックを探す","private_messages":"メッセージ検索"},"advanced":{"title":"高度な検索","posted_by":{"label":"投稿者"},"in_category":{"label":"カテゴリ"},"in_group":{"label":"グループ内"},"with_badge":{"label":"バッヂ指定"},"with_tags":{"label":"タグ"},"filters":{"title":"タイトルが一致するもの","likes":"「いいね！」したもの","posted":"投稿済","watching":"ウォッチ中","tracking":"追跡中","private":"メッセージにあるもの","bookmarks":"ブックマーク中","first":"最初の投稿","pinned":"固定表示されている","seen":"既読","unseen":"未読","wiki":"wiki","images":"画像を含む","all_tags":"上記のタグを全て含む"},"statuses":{"label":"トピックのうち","open":"オープンされている","closed":"クローズされている","archived":"アーカイブされている","noreplies":"返信がまったくない","single_user":"一人しか参加者がいない"},"post":{"time":{"label":"投稿されたタイミング","before":"より前","after":"より後"}}}},"hamburger_menu":"他のトピック一覧やカテゴリを見る","new_item":"新しい","go_back":"戻る","not_logged_in_user":"ユーザアクティビティと設定ページ","current_user":"ユーザページに移動","topics":{"new_messages_marker":"最後の訪問","bulk":{"select_all":"すべて選択する","clear_all":"すべてクリア","unlist_topics":"トピックをリストから非表示にする","relist_topics":"トピックをリストに再表示する","reset_read":"未読に設定","delete":"トピックを削除","dismiss":"既読","dismiss_read":"未読をすべて既読にする","dismiss_button":"既読...","dismiss_tooltip":"新規投稿を既読にしてトピックの追跡を停止","also_dismiss_topics":"トピックの追跡を停止して、未読として表示されないようにする","dismiss_new":"既読にする","toggle":"選択したトピックを切り替え","actions":"操作","change_category":"カテゴリを設定する","close_topics":"トピックをクローズする","archive_topics":"アーカイブトピック","notification_level":"通知","choose_new_category":"このトピックの新しいカテゴリを選択してください","selected":{"other":"あなたは <b>%{count}</b> トピックを選択しました。"},"change_tags":"タグを付け替える","append_tags":"タグを追加する","choose_new_tags":"これらのトピックの新しいタグを選択してください","choose_append_tags":"これらのトピックに新しいタグを追加してください","changed_tags":"トピックのタグが変更されました。"},"none":{"unread":"未読のトピックはありません。","new":"新しいトピックはありません。","read":"まだトピックを一つも読んでいません。","posted":"トピックは一つもありません。","latest":"コンテンツは以上です!","bookmarks":"ブックマークしたトピックはありません。","category":"%{category} トピックはありません。","top":"トップトピックはありません。","educate":{"new":"<p>新しいトピックがここに表示されます。</p><p>デフォルトでは新しいトピックがある場合に2日間、<span class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\">new</span>が表示されます。</p><p>設定は<a href=\"%{userPrefsUrl}\">プロフィール設定</a>から変更できます。</p>"}},"bottom":{"latest":"最新のトピックは以上です。","posted":"投稿のあるトピックは以上です。","read":"既読のトピックは以上です。","new":"新着トピックは以上です。","unread":"未読のトピックは以上です。","category":"%{category}トピックは以上です。","tag":"%{tag}が付加されたトピックは以上です。","top":"トップトピックはこれ以上ありません。","bookmarks":"ブックマーク済みのトピックはこれ以上ありません。"}},"topic":{"filter_to":{"other":"トピック内の %{count} 件を表示"},"create":"新規トピック","create_long":"新しいトピックの作成","open_draft":"下書きを開く","private_message":"メッセージを書く","archive_message":{"help":"アーカイブにメセージを移しました","title":"アーカイブ"},"move_to_inbox":{"title":"受信ボックスへ移動","help":"受信ボックスへメッセージを戻しました"},"edit_message":{"help":"メッセージの最初の投稿を編集","title":"編集"},"defer":{"help":"未読にする","title":"取り下げる"},"feature_on_profile":{"help":"このトピックへのリンクをユーザーカードとプロフィールに追加する","title":"プロフィールの機能"},"remove_from_profile":{"warning":"あなたのプロフィールにはすでに注目のトピックがあります。続行すると、このトピックが既存のトピックに置き換わります。","help":"ユーザープロファイルでこのトピックへのリンクを削除します","title":"プロファイルから削除"},"list":"トピック","new":"新着トピック","unread":"未読","new_topics":{"other":"%{count}個の新着トピック"},"unread_topics":{"other":"%{count}個の未読トピック"},"title":"トピック","invalid_access":{"title":"トピックはプライベートです","description":"申し訳ありませんが、このトピックへのアクセスは許可されていません。","login_required":"ポストを閲覧するには、ログインする必要があります"},"server_error":{"title":"トピックの読み込みに失敗しました","description":"申し訳ありませんが、トピックの読み込みに失敗しました。もう一度試してください。もし問題が継続する場合はお知らせください。"},"not_found":{"title":"トピックが見つかりませんでした","description":"申し訳ありませんがトピックが見つかりませんでした。モデレータによって削除された可能性があります。"},"total_unread_posts":{"other":"このトピックに未読のポストが%{count}つあります。"},"unread_posts":{"other":"このトピックに未読のポストが%{count}つあります。"},"new_posts":{"other":"前回閲覧時より、このトピックに新しいポストが%{count}個投稿されています"},"likes":{"other":"このトピックには%{count}個「いいね！」がついています"},"back_to_list":"トピックリストに戻る","options":"トピックオプション","show_links":"このトピック内のリンクを表示","toggle_information":"トピックの詳細を切り替え","read_more_in_category":"もっと読みたいですか？%{catLink}あるいは%{latestLink}の他のトピックを見てみてください。","read_more":"もっと見たいですか？%{catLink}あるいは%{latestLink}があります。","unread_indicator":"このトピックの最後の投稿を読んだメンバーはまだいません。","browse_all_categories":"全てのカテゴリを閲覧する","browse_all_tags":"すべてのタグを参照","view_latest_topics":"最新のトピックを見る","suggest_create_topic":"新しい会話を始めますか？","jump_reply_up":"以前の返信へジャンプ","jump_reply_down":"以後の返信へジャンプ","deleted":"トピックは削除されました","slow_mode_update":{"select":"ユーザーは、このトピックに一度だけ投稿できます。","save":"有効"},"topic_status_update":{"save":"タイマーをセットする","num_of_hours":"時間数","remove":"タイマーをはずす","publish_to":"公開先:","when":"公開時間:"},"auto_update_input":{"later_today":"今日中","tomorrow":"明日","later_this_week":"今週中","this_weekend":"今週末","next_week":"来週","next_month":"来月","pick_date_and_time":"日時を選択","set_based_on_last_post":"最後の投稿でクローズ"},"publish_to_category":{"title":"公開スケジュール"},"temp_open":{"title":"一時的にオープン"},"auto_reopen":{"title":"自動的にオープン"},"temp_close":{"title":"一時的にクローズ"},"auto_close":{"title":"自動的にクローズ","error":"正しい値を入力してください。","based_on_last_post":"最終投稿時間より前でクローズしない"},"auto_delete":{"title":"自動的にトピックを削除"},"reminder":{"title":"リマインド"},"status_update_notice":{"auto_open":"このトピックはあと%{timeLeft}で自動的にオープンします。","auto_close":"このトピックはあと%{timeLeft}で自動的にクローズします。","auto_publish_to_category":"このトピックはあと %{timeLeft} で、<a href=%{categoryUrl}>#%{categoryName}</a> にて公開されます。","auto_delete":"このトピックはあと%{timeLeft}で自動的に削除されます。","auto_reminder":"このトピックについて、%{timeLeft} 後にリマインドします。"},"auto_close_title":"オートクローズの設定","auto_close_immediate":{"other":"このトピックは最終投稿からすでに%{count}時間経過しているため、すぐにクローズされます。"},"timeline":{"back":"戻る","back_description":"未読の最終投稿へ戻る","replies_short":"%{current} / %{total}"},"progress":{"title":"トピック進捗","go_top":"上","go_bottom":"下","go":"へ","jump_bottom":"最後の投稿へ","jump_prompt":"ジャンプする...","jump_bottom_with_number":"%{post_number}番へジャンプ","jump_prompt_or":"または","total":"投稿の合計","current":"現在の投稿"},"notifications":{"title":"このトピックに関する通知頻度を変更","reasons":{"mailing_list_mode":"メーリングリストモードになっているため、このトピックへの返信はメールで送られます。","3_10":"このトピックのタグをウォッチしているため通知されます。","3_6":"このカテゴリをウォッチしているため通知されます。","3_5":"このトピックをウォッチし始めたため通知されます。","3_2":"このトピックをウォッチしているため通知されます。","3_1":"このトピックを作成したため通知されます。","3":"このトピックをウォッチしているため通知されます。","2_8":"このカテゴリを追跡しているので、新たな返信のカウント数が表示されます。","2_4":"このトピックに返信したので、新たな返信のカウント数が表示されます。","2_2":"このトピックを追跡しているので、新たな返信のカウント数が表示されます。","2":"You will see a count of new replies because you <a href=\"%{basePath}/u/%{username}/preferences/notifications\">read this topic</a>.","1_2":"他のユーザからメンションされた場合か、メッセージ内の投稿に返信された場合に通知されます。","1":"他のユーザからメンションされた場合か、メッセージ内の投稿に返信された場合に通知されます。","0_7":"このカテゴリに関して一切通知を受け取りません。","0_2":"このトピックに関して一切通知を受け取りません。","0":"このトピックに関して一切通知を受け取りません。"},"watching_pm":{"title":"ウォッチ中","description":"未読件数と新しい投稿がトピックの横に表示されます。このトピックに対して新しい投稿があった場合に通知されます。"},"watching":{"title":"ウォッチ中","description":"未読件数と新しい投稿がトピックの横に表示されます。このトピックに対して新しい投稿があった場合に通知されます。"},"tracking_pm":{"title":"追跡中","description":"新しい返信の数がこのメッセージに表示されます。他のユーザから@ユーザ名でメンションされた場合や、投稿へ返信された場合に通知されます。"},"tracking":{"title":"追跡中","description":"新しい返信の数がこのトピックに表示されます。他のユーザから@ユーザ名でメンションされた場合や、投稿へ返信された場合に通知されます。"},"regular":{"title":"デフォルト","description":"他のユーザからメンションされた場合か、投稿に返信された場合に通知されます。"},"regular_pm":{"title":"デフォルト","description":"他のユーザからメンションされた場合か、メッセージ内の投稿に返信された場合に通知されます。"},"muted_pm":{"title":"ミュートされました","description":"このメッセージについての通知を受け取りません。"},"muted":{"title":"ミュート","description":"このトピックに関するお知らせをすべて受け取りません。また、未読のタブにも通知されません。"}},"actions":{"title":"アクション","recover":"トピックの削除を取り消す","delete":"トピックを削除","open":"トピックをオープン","close":"トピックをクローズする","multi_select":"投稿を選択","timed_update":"トピックにタイマーをセット...","pin":"トピックを固定表示","unpin":"トピックの固定表示を解除","unarchive":"トピックのアーカイブ解除","archive":"トピックのアーカイブ","invisible":"リストから非表示にする","visible":"リストに表示","reset_read":"読み込みデータをリセット","make_public":"公開トピックへ変更","make_private":"ダイレクトメッセージを作成"},"feature":{"pin":"トピックを固定表示","unpin":"トピックの固定表示を解除","pin_globally":"トピックを全体で固定表示する","make_banner":"バナートピック","remove_banner":"バナートピックを削除"},"reply":{"title":"返信する","help":"このトピックに返信する"},"clear_pin":{"title":"固定表示を解除する","help":"このトピックの固定表示を解除し、トピックリストの先頭に表示されないようにする"},"share":{"title":"シェア","help":"このトピックのリンクをシェアする"},"print":{"title":"印刷","help":"印刷用の表示にする"},"flag_topic":{"title":"通報","help":"このトピックを通報するか、またはプライベート通知を送る","success_message":"このトピックを通報しました。"},"feature_topic":{"title":"トピックを特集","pin":"%{categoryLink} カテゴリのトップに表示する","unpin":"%{categoryLink} カテゴリのトップからトピックを削除","unpin_until":"%{categoryLink} カテゴリのトップからこのトピックを削除するか、<strong>%{until}</strong> まで待つ。","pin_note":"ユーザはトピックを個別に固定表示解除することができます。","pin_validation":"このトピックを固定表示するためには日付を指定してください。","not_pinned":"%{categoryLink}で固定表示されているトピックはありません。","already_pinned":{"other":"%{categoryLink}で固定表示されているトピック: <strong class='badge badge-notification unread'>%{count}</strong>"},"pin_globally":"このトピックをすべてのトピックリストのトップに表示する","unpin_globally":"トピック一覧のトップからこのトピックを削除します","unpin_globally_until":"このトピックをすべてのトピックリストのトップから削除するか、<strong>%{until}</strong> まで待つ。","global_pin_note":"ユーザはトピックを個別に固定表示解除することができます。","not_pinned_globally":"全体で固定表示されているトピックはありません。","already_pinned_globally":{"other":"全体で固定表示されているトピック: <strong class='badge badge-notification unread'>%{count}</strong>"},"make_banner":"このトピックを全てのページのバナーに表示します","remove_banner":"全てのページのバナーを削除します","banner_note":"ユーザはバナーを閉じることができます。常に１つのトピックだけがバナー表示されます","no_banner_exists":"バナートピックはありません。","banner_exists":"これら<strong class='badge badge-notification unread'>が</strong>現在のバナートピックです。"},"inviting":"招待中...","automatically_add_to_groups":"この招待によって、リストされたグループに参加することができます。","invite_private":{"title":"プライベートメッセージへ招待する","email_or_username":"招待するユーザのメールアドレスまたはユーザ名","email_or_username_placeholder":"メールアドレスまたはユーザ名","action":"招待","success":"ユーザをこのメッセージへ招待しました。","success_group":"グループをこのメッセージへ招待しました。","error":"申し訳ありません、ユーザ招待中にエラーが発生しました。","group_name":"グループ名"},"controls":"オプション","invite_reply":{"title":"招待","username_placeholder":"ユーザ名","action":"招待を送る","help":"このトピックに他のユーザをメールまたは通知で招待する。","to_topic_blank":"このトピックに招待したい人のユーザ名かメールアドレスを入れてください","to_topic_email":"あなたはメールアドレスを入力しました。フレンドがすぐにこのトピックへ返信できるようにメールで招待します。","to_topic_username":"ユーザ名を入力しました。このトピックへの招待リンクの通知を送信します。","to_username":"招待したい人のユーザ名を入れてください。このトピックへの招待リンクの通知を送信します。","email_placeholder":"name@example.com","success_email":"<b>%{invitee}</b>に招待を送信しました。招待が受理されたらお知らせします。招待の状態は、ユーザページの招待タブにて確認できます。","success_username":"ユーザをこのトピックへ招待しました。","error":"申し訳ありません。その人を招待できませんでした。すでに招待を送信していませんか？ (招待できる数には限りがあります)","success_existing_email":"<b>%{emailOrUsername}</b>はすでにこのトピックへ招待済みです。"},"login_reply":"ログインして返信","filters":{"n_posts":{"other":"%{count} 件"},"cancel":"フィルター削除"},"split_topic":{"title":"新規トピックに移動","action":"新規トピックに移動","radio_label":"新規トピック","error":"投稿の新規トピックへの移動中にエラーが発生しました。","instructions":{"other":"新たにトピックを作成し、選択した<b>%{count}</b>個の投稿をこのトピックに移動しようとしています。"}},"merge_topic":{"title":"既存トピックに移動","action":"既存トピックに移動","error":"指定されたトピックへの投稿移動中にエラーが発生しました。","instructions":{"other":"<b>%{count}</b>個の投稿をどのトピックに移動するか選択してください。"}},"move_to_new_message":{"title":"新しいメッセージに移動","action":"新しいメッセージに移動","message_title":"新規メッセージタイトル","radio_label":"新規メッセージ","participants":"参加者"},"move_to_existing_message":{"title":"既存のメッセージに移動","action":"既存のメッセージに移動","radio_label":"既存のメッセージ","participants":"参加者"},"merge_posts":{"title":"選択した投稿を統合","action":"選択した投稿を統合","error":"選択した投稿の統合に失敗しました。"},"publish_page":{"public":"公開"},"change_owner":{"action":"オーナーシップを変更","error":"オーナーの変更ができませんでした。","placeholder":"新しいオーナーのユーザー名"},"change_timestamp":{"title":"タイムスタンプを変更してください。","action":"タイムスタンプを変更","invalid_timestamp":"タイムスタンプは未来時刻にすることが出来ません。","error":"トピックのタイムスタンプ変更にエラーがありました。","instructions":"トピックの新たなタイムスタンプを設定してください。トピック内の各投稿時間はその時間を起点に再計算されます。"},"multi_select":{"select":"選択","selected":"選択中 (%{count})","select_post":{"label":"選択"},"select_replies":{"label":"返信と選択"},"delete":"選択中のものを削除","cancel":"選択を外す","select_all":"すべて選択する","deselect_all":"すべて選択を外す","description":{"other":"<b>%{count}</b>個の投稿を選択中。"}}},"post":{"quote_reply":"引用","edit_reason":"理由: ","post_number":"投稿%{number}","ignored":"無視したコンテンツ","reply_as_new_topic":"トピックのリンクを付けて返信","reply_as_new_private_message":"同じ受信者へ新しいメッセージとして返信","continue_discussion":"%{postLink} から:","follow_quote":"引用した投稿に移動","show_full":"全て表示","show_hidden":"無視したコンテンツを見る","deleted_by_author":{"other":"(投稿は投稿者により削除されました。何らかの通報がされていない限り、%{count}時間後に自動的に削除されます)"},"expand_collapse":"開く/折りたたむ","gap":{"other":"%{count}個の返信をすべて表示する"},"notice":{"new_user":"%{user} が投稿するのはこれが初めてです—私たちのコミュニティに彼らを歓迎しましょう！"},"unread":"未読の投稿","has_replies":{"other":"%{count} 件の返信"},"has_likes_title":{"other":"%{count}人のユーザがこの返信に「いいね！」しました"},"has_likes_title_only_you":"あなたがいいねした投稿","has_likes_title_you":{"other":"あなたと%{count} 人の人がこの投稿に「いいね！」しました。"},"errors":{"create":"申し訳ありませんが、投稿中にエラーが発生しました。もう一度やり直してください。","edit":"申し訳ありませんが、投稿の編集中にエラーが発生しました。もう一度やり直してください。","upload":"申し訳ありません、ファイルのアップロード中にエラーが発生しました。再度お試しください。","too_many_uploads":"申し訳ありませんが、複数のファイルは同時にアップロードできません。","upload_not_authorized":"すみません、アップロードしようとしているファイルは許可されていません。 (許可された拡張子は: %{authorized_extensions}です。)","image_upload_not_allowed_for_new_user":"申し訳ありませんが、新規ユーザは画像のアップロードができません。","attachment_upload_not_allowed_for_new_user":"申し訳ありませんが、新規ユーザはファイルの添付ができません。","attachment_download_requires_login":"ファイルをダウンロードするには、ログインする必要があります"},"via_email":"メールで投稿されました。","whisper":"この投稿はモデレーターへのプライベートメッセージです","wiki":{"about":"この投稿はWiki形式です"},"archetypes":{"save":"保存オプション"},"controls":{"reply":"この投稿の返信を編集","like":"この投稿に「いいね！」する","has_liked":"この投稿に「いいね！」しました。","undo_like":"「いいね！」を取り消す","edit":"この投稿を編集","edit_action":"編集","edit_anonymous":"投稿を編集するには、ログインする必要があります","flag":"この投稿を通報する、またはプライベート通知を送る","delete":"投稿を削除する","undelete":"投稿を元に戻す","share":"投稿のリンクを共有する","more":"もっと読む","delete_replies":{"just_the_post":"投稿のみを削除する"},"admin":"投稿の管理","wiki":"wiki投稿にする","unwiki":"wiki投稿から外す","convert_to_moderator":"スタッフカラーを追加","revert_to_regular":"スタッフカラーを外す","rebake":"HTMLを再構成","unhide":"表示する","change_owner":"オーナーシップを変更","grant_badge":"バッジを付与","delete_topic":"トピック削除"},"actions":{"by_you":{"off_topic":"関係のない話題として通報しました","spam":"スパム報告として通報しました","inappropriate":"不適切であると報告されています","notify_moderators":"スタッフによる確認が必要として通報しました","notify_user":"このユーザにメッセージを送信しました"}},"merge":{"confirm":{"other":"これらの%{count}の投稿を統合したいですか?"}},"revisions":{"controls":{"first":"最初のリビジョン","previous":"一つ前のリビジョン","next":"次のリビジョン","last":"最後のリビジョン","hide":"リビジョンを隠す","show":"リビジョンを表示","edit_wiki":"Wikiを編集","edit_post":"投稿を編集"},"displays":{"inline":{"title":"追加・削除箇所をインラインで表示","button":"HTML"},"side_by_side":{"title":"差分を横に並べて表示","button":"HTML"},"side_by_side_markdown":{"title":"ソースの差分を横に並べて表示","button":"Raw"}}},"raw_email":{"displays":{"raw":{"title":"メールをソース表示","button":"Raw"},"text_part":{"title":"メールのテキスト部分を表示","button":"Text"},"html_part":{"title":"メールのHTML部分を表示","button":"HTML"}}},"bookmarks":{"created":"作成者","name":"名前"}},"category":{"can":"can&hellip; ","none":"(カテゴリなし)","all":"全てのカテゴリ","choose":"カテゴリを選択&hellip;","edit":"編集","edit_dialog_title":"%{categoryName}を編集","view":"カテゴリ内のトピックを見る","general":"一般","settings":"設定","topic_template":"トピックテンプレート","tags":"タグ","tags_placeholder":"(オプション) 許可されたタグのリスト","tag_groups_placeholder":"(オプション) 許可されたタググループのリスト","delete":"カテゴリを削除する","create":"新規カテゴリ","create_long":"新しくカテゴリを作ります","save":"カテゴリを保存する","slug":"カテゴリのスラッグ","slug_placeholder":"(任意) URLで使用されます","creation_error":"カテゴリの作成に失敗しました。","save_error":"カテゴリの保存に失敗しました。","name":"カテゴリ名","description":"カテゴリ内容","topic":"カテゴリトピック","logo":"カテゴリロゴ画像","background_image":"カテゴリの背景画像","badge_colors":"バッジの色","background_color":"背景色","foreground_color":"文字表示色","name_placeholder":"簡単な名前にしてください。","color_placeholder":"任意の Web カラー","delete_confirm":"このカテゴリを削除してもよろしいですか？","delete_error":"カテゴリ削除に失敗しました。","list":"カテゴリをリストする","no_description":"このカテゴリの説明はありません。","change_in_category_topic":"カテゴリ内容を編集","already_used":"この色は他のカテゴリで利用しています","security":"セキュリティ","images":"画像","email_in":"カスタムメールアドレス:","email_in_allow_strangers":"登録されていないユーザからメールを受け取ります","email_in_disabled":"メールでの新規投稿は、サイトの設定で無効になっています。メールでの新規投稿を有効にするには","email_in_disabled_click":"\"email in\"設定を有効にしてください","allow_badges_label":"このカテゴリでバッジが付与されることを許可","edit_permissions":"パーミッションを編集","review_group_name":"グループ名","this_year":"今年","default_position":"デフォルトポジション","position_disabled":"カテゴリはアクティビティで並び替えられます。カテゴリ一覧の順番を制御するには","position_disabled_click":"「固定されたカテゴリーの位置付け」の設定を有効にしてください。","parent":"親カテゴリ","notifications":{"watching":{"title":"ウォッチ中"},"watching_first_post":{"title":"最初の投稿をウォッチする"},"tracking":{"title":"追跡中"},"regular":{"title":"デフォルト","description":"他のユーザからメンションされた場合や、投稿に返信された場合に通知されます。"},"muted":{"title":"ミュート中"}},"search_priority":{"options":{"normal":"通常","ignore":"無視する","high":"高い"}},"sort_options":{"likes":"いいね！","views":"表示","posts":"投稿","activity":"アクティビティ","posters":"投稿者","category":"カテゴリ","created":"作成者"},"settings_sections":{"general":"一般","email":"Eメール"}},"flagging":{"title":"報告していただきありがとうございます。","action":"投稿を通報","notify_action":"メッセージ","official_warning":"運営スタッフからの警告","delete_spammer":"スパムの削除","yes_delete_spammer":"はい、スパムを削除する","ip_address_missing":"(N/A)","hidden_email_address":"(hidden)","submit_tooltip":"プライベートの通報を送信する","take_action_tooltip":"誰かが通報するのを待つのではなく、通報しましょう。","cant":"現在、この投稿を通報することはできません。","notify_staff":"スタッフに通報","formatted_name":{"off_topic":"オフトピック","inappropriate":"不適切","spam":"スパム"},"custom_placeholder_notify_user":"具体的に、建設的に、そして常に親切にしましょう。","custom_placeholder_notify_moderators":"特にどのような問題が発生しているか記入して下さい。可能なら、関連するリンクなどを教えて下さい。","custom_message":{"at_least":{"other":"少なくとも%{count}文字入力してください"},"more":{"other":"あと%{count}文字..."},"left":{"other":"残り%{count}文字"}}},"flagging_topic":{"title":"報告していただきありがとうございます。","action":"トピックを通報","notify_action":"メッセージ"},"topic_map":{"title":"トピックの情報","participants_title":"よく投稿する人","links_title":"人気のリンク","links_shown":"さらにリンクを表示する","clicks":{"other":"%{count} クリック"}},"post_links":{"about":"この投稿のリンクをもっと見る","title":{"other":"%{count} リンク"}},"topic_statuses":{"warning":{"help":"これは運営スタッフからの警告です。"},"bookmarked":{"help":"このトピックをブックマークしました"},"locked":{"help":"このトピックはクローズしています。新たに返信することはできません。"},"archived":{"help":"このトピックはアーカイブされています。凍結状態のため一切の変更ができません"},"locked_and_archived":{"help":"このトピックは閉じられ、アーカイブされます。新しい返信を受け入れず、変更することはできません"},"unpinned":{"title":"固定表示されていません","help":"このトピックは固定表示されていません。 既定の順番で表示されます"},"pinned_globally":{"title":"全体で固定表示されました","help":"このトピックは全体で固定表示されています。常に新着とカテゴリのトップに表示されます"},"pinned":{"title":"固定表示","help":"このトピックは固定表示されています。常にカテゴリのトップに表示されます"},"unlisted":{"help":"このトピックはリストされていません。トピックリストには表示されません。直接リンクでのみアクセス可能です"}},"posts":"投稿","original_post":"オリジナルの投稿","views":"閲覧","views_lowercase":{"other":" 閲覧"},"replies":"返信","views_long":{"other":"このトピックは%{number}回閲覧されました"},"activity":"アクティビティ","likes":"いいね！","likes_lowercase":{"other":"いいね！"},"users":"ユーザ","users_lowercase":{"other":"ユーザ"},"category_title":"カテゴリ","history":"履歴","changed_by":"by %{author}","raw_email":{"title":"受信メール","not_available":"利用不可"},"categories_list":"カテゴリ一覧","filters":{"with_topics":"%{filter} トピック","with_category":"%{filter} %{category} トピック","latest":{"title":"最新","title_with_count":{"other":"最新の投稿 (%{count})"},"help":"最新のトピック"},"read":{"title":"既読","help":"既読のトピックを、最後に読んだ順に表示"},"categories":{"title":"カテゴリ","title_in":"カテゴリ - %{categoryName}","help":"カテゴリ毎に整理されたトピックを表示"},"unread":{"title":"未読","title_with_count":{"other":"未読 (%{count})"},"help":"未読投稿のあるトピック","lower_title_with_count":{"other":"%{count} 未読"}},"new":{"lower_title_with_count":{"other":"%{count}件"},"lower_title":"NEW","title":"新着","title_with_count":{"other":"新着 (%{count})"},"help":"最近投稿されたトピック"},"posted":{"title":"自分の投稿","help":"投稿したトピック"},"bookmarks":{"title":"ブックマーク","help":"ブックマークしたトピック"},"category":{"title":"%{categoryName}","title_with_count":{"other":"%{categoryName} (%{count})"},"help":"%{categoryName} カテゴリの最新トピック"},"top":{"title":"トップ","help":"過去年間、月間、週間及び日間のアクティブトピック","all":{"title":"すべて"},"yearly":{"title":"年ごと"},"quarterly":{"title":"3ヶ月おき"},"monthly":{"title":"月ごと"},"weekly":{"title":"毎週"},"daily":{"title":"日ごと"},"all_time":"すべて","this_year":"年","this_quarter":"今季","this_month":"月","this_week":"週","today":"今日"}},"permission_types":{"full":"作成 / 返信 / 閲覧","create_post":"返信 / 閲覧","readonly":"閲覧できる"},"lightbox":{"download":"ダウンロード"},"keyboard_shortcuts_help":{"title":"ショートカットキー","jump_to":{"title":"ページ移動","home":"%{shortcut} ホーム","latest":"%{shortcut} 最新","new":"%{shortcut} 新着","unread":"%{shortcut} 未読","categories":"%{shortcut} カテゴリ","top":"%{shortcut} トップ","bookmarks":"%{shortcut} ブックマーク","profile":"%{shortcut} プロフィール","messages":"%{shortcut} メッセージ"},"navigation":{"title":"ナビゲーション","jump":"%{shortcut} # 投稿へ","back":"%{shortcut} 戻る","up_down":"%{shortcut} 選択を移動 &uarr; &darr;","open":"%{shortcut} トピックへ","next_prev":"%{shortcut} 選択を次/前へ移動"},"application":{"title":"アプリケーション","create":"%{shortcut} 新しいトピックを作成","notifications":"%{shortcut} お知らせを開く","hamburger_menu":"%{shortcut} メニューを開く","user_profile_menu":"%{shortcut} ユーザーメニューを開く","show_incoming_updated_topics":"%{shortcut} 更新されたトピックを表示する","search":"%{shortcut} 検索","help":"%{shortcut} キーボードヘルプを表示する","dismiss_new_posts":"%{shortcut} 新規投稿を非表示にする","dismiss_topics":"%{shortcut} トピックを既読にする","log_out":"%{shortcut} 次のセクション/前のセクション"},"actions":{"title":"アクション","bookmark_topic":"%{shortcut} トピックのブックマークを切り替え","pin_unpin_topic":"%{shortcut}トピックを 固定表示/解除","share_topic":"%{shortcut} トピックをシェア","share_post":"%{shortcut} 投稿をシェアする","reply_as_new_topic":"%{shortcut} トピックへリンクして返信","reply_topic":"%{shortcut} トピックに返信","reply_post":"%{shortcut} 投稿に返信","quote_post":"%{shortcut} 投稿を引用する","like":"%{shortcut} 投稿を「いいね！」する","flag":"%{shortcut} 投稿を通報","bookmark":"%{shortcut} 投稿をブックマークする","edit":"%{shortcut} 投稿を編集","delete":"%{shortcut} 投稿を削除する","mark_muted":"%{shortcut} トピックをミュートする","mark_regular":"%{shortcut} レギュラー(デフォルト)トピックにする","mark_tracking":"%{shortcut} トピックを追跡する","mark_watching":"%{shortcut} トピックをウォッチする","print":"%{shortcut} トピックを印刷"}},"badges":{"granted_on":"%{date}にゲット!","others_count":"その他のバッジ所有者(%{count})","title":"バッジ","badge_count":{"other":"%{count}個のバッジ"},"select_badge_for_title":"プロフィールの肩書きに付けるバッジを選んでください","none":"（なし）","badge_grouping":{"getting_started":{"name":"はじめの一歩"},"community":{"name":"コミュニティ"},"trust_level":{"name":"トラストレベル"},"other":{"name":"その他"},"posting":{"name":"投稿"}}},"tagging":{"all_tags":"すべてのタグ","other_tags":"他のタグ","selector_all_tags":"すべてのタグ","selector_no_tags":"タグなし","changed":"タグを変更しました:","tags":"タグ","choose_for_topic":"タグ(オプション)","add_synonyms":"追加","delete_tag":"タグを削除","rename_tag":"タグの名前を変更","rename_instructions":"このタグの新しい名前を選択:","sort_by":"並べ替え:","sort_by_name":"名前","manage_groups":"タグのグループを管理","upload_successful":"タグのアップロードに成功しました","delete_unused":"使われていないタグを削除","cancel_delete_unused":"キャンセル","notifications":{"watching":{"title":"ウォッチ中"},"watching_first_post":{"title":"最初の投稿をウォッチする","description":"このタグが付けられた新しいトピックは通知されますが、トピックへの返信は通知されません。"},"tracking":{"title":"追跡中"},"regular":{"title":"通常","description":"他ユーザからメンションをされた場合、またはあなたのポストに回答が付いた場合に通知されます。"},"muted":{"title":"通知しない"}},"groups":{"title":"タグのグループ","new":"新しいグループ","parent_tag_label":"親タグ:","new_name":"新しいタグのグループ","save":"保存する","delete":"削除する","confirm_delete":"このタググループを削除してもよろしいですか？","everyone_can_use":"全員がタグを使用できます。"},"topics":{"none":{"unread":"未読のトピックはありません。","new":"新着トピックはありません。","read":"あなたはまだ、どのトピックも読んでいません。","posted":"あなたはまだ、どのトピックにも投稿していません。","latest":"最新のトピックはありません。","bookmarks":"ブックマークしたトピックはありません。","top":"トップトピックはありません。"}}},"invite":{"custom_message":"<a href>カスタムメッセージ</a>を作成して、あなたの招待状をもう少し個人的なものにします。","custom_message_placeholder":"メッセージを入力"},"footer_nav":{"back":"戻る","share":"共有","dismiss":"閉じる"},"do_not_disturb":{"title":"おやすみモード...","label":"おやすみモード","remaining":"残り%{remaining}","options":{"half_hour":"30分","one_hour":"１時間","two_hours":"２時間","tomorrow":"明日まで","custom":"カスタム"},"set_schedule":"通知スケジュールを設定する"},"chat_integration":{"settings":"設定","all_categories":"(すべてのカテゴリ)","delete_channel":"削除する","edit_channel":"編集","test_modal":{"topic":"トピック","close":"投票をクローズする"},"type":{"normal":"デフォルト"},"filter":{"mute":"ミュート"},"rule_table":{"filter":"フィルター","category":"カテゴリ","tags":"タグ","edit_rule":"編集","delete_rule":"削除する"},"edit_channel_modal":{"cancel":"キャンセル"},"edit_rule_modal":{"cancel":"キャンセル","type":"タイプ","filter":"フィルター","category":"カテゴリ","group":"グループ","tags":"タグ"},"provider":{"telegram":{"param":{"name":{"title":"名前"}}},"discord":{"param":{"name":{"title":"名前"}}},"matrix":{"param":{"name":{"title":"名前"}}},"zulip":{"param":{"subject":{"title":"件名"}}},"gitter":{"param":{"name":{"title":"名前"}}}}},"details":{"title":"詳細を隠す"},"discourse_local_dates":{"relative_dates":{"today":"今日","tomorrow":"明日 %{time}","yesterday":"昨日 %{time}","countdown":{"passed":"日付が過ぎた"}},"title":"日付/時刻を挿入","create":{"form":{"insert":"挿入","advanced_mode":"アドバンスドモード","simple_mode":"シンプルモード","format_description":"ユーザーに日付を表示するために使用されるフォーマット。タイムゾーン名を表示するにはzz、オフセットを表示するにはZを使用します。","timezones_title":"表示するタイムゾーン","timezones_description":"タイムゾーンは、プレビューとフォールバックで日付を表示するために使用されます。","recurring_title":"レジューム","recurring_description":"イベントの繰り返しを設定します。 フォームによって生成された繰り返しオプションを手動で編集して、年、四半期、月、週、日、時間、分、秒、ミリ秒のいずれかのキーを使用することもできます。","recurring_none":"レジュームしない","invalid_date":"日付が無効です。日付と時刻が正しいことを確認してください。","date_title":"日付","time_title":"時刻","format_title":"日付のフォーマット","timezone":"タイムゾーン","until":"まで...","recurring":{"every_day":"毎日","every_week":"毎週","every_two_weeks":"二週間に一度","every_month":"毎月","every_two_months":"二カ月に一度","every_three_months":"三カ月に一度","every_six_months":"半年に一度","every_year":"毎年"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"全ての新規ユーザーのためにチュートリアルを開始します","welcome_message":"全ての新規ユーザーにクイックスタートガイド付きのウェルカムメッセージを送信します"}},"presence":{"replying":{"other":"返信中"},"editing":{"other":"編集中"},"replying_to_topic":{"other":"返信中"}},"poll":{"voters":{"other":"投票者数"},"total_votes":{"other":"合計得票数"},"average_rating":"平均評価: <strong>%{average}</strong>.","public":{"title":"投票は<strong>公開</strong>されています。"},"results":{"groups":{"title":"このアンケートに投票するには %{groups} のメンバーである必要があります。"},"vote":{"title":"結果は<strong>投票</strong>したとき表示されます。"},"closed":{"title":"結果は<strong>クローズ</strong>したとき表示されます。"},"staff":{"title":"結果は <strong>スタッフ</strong> メンバーにのみ表示されます。"}},"multiple":{"help":{"at_least_min_options":{"other":"少なくとも <strong>%{count}</strong> オプションを選択してください。"},"up_to_max_options":{"other":"オプションを <strong>%{count}</strong> まで選択します。"},"x_options":{"other":"<strong>%{count}</strong> オプションを選択します。"},"between_min_and_max_options":"<strong>%{min}</strong> と <strong>%{max}</strong> のオプションを選択します。"}},"cast-votes":{"title":"投票する","label":"投票する"},"show-results":{"title":"投票結果を表示","label":"結果を表示"},"hide-results":{"title":"投票に戻る","label":"投票を表示"},"group-results":{"title":"ユーザーフィールドごとに投票をグループ化","label":"内訳を表示"},"export-results":{"title":"投票結果をエクスポートする","label":"エクスポート"},"open":{"title":"投票をオープンする","label":"オープン","confirm":"この投票をオープンにしてもよろしいですか？"},"close":{"title":"投票をクローズする","label":"投票をクローズする","confirm":"この投票をクローズしてもよろしいですか？"},"automatic_close":{"closes_in":"<strong>%{timeLeft}</strong>でクローズ","age":"クローズ<strong>%{age}</strong>"},"breakdown":{"title":"投票結果","breakdown":"内訳","percentage":"割合","count":"カウント"},"error_while_toggling_status":"申し訳ありませんが、この投票のステータスを切り替える際にエラーが発生しました。","error_while_casting_votes":"申し訳ありませんが、投票の際にエラーが発生しました。","error_while_fetching_voters":"申し訳ありませんが、有権者を表示する際にエラーが発生しました。","error_while_exporting_results":"申し訳ありませんが、投票結果のエクスポート中にエラーが発生しました。","ui_builder":{"title":"投票を作成","insert":"投票の挿入","help":{"options_count":"少なくとも1つのオプションを入力してください","invalid_values":"最小値は最大値より小さくなければなりません。","min_step_value":"最小ステップ単位は 1 です"},"poll_type":{"label":"タイプ","regular":"一つだけ選択","multiple":"複数選択","number":"数字で評価"},"poll_result":{"always":"常に表示する","staff":"スタッフのみ"},"poll_chart_type":{"bar":"バー","pie":"パイ"},"poll_config":{"max":"最大","min":"最小","step":"間隔"},"poll_public":{"label":"誰が投票したか表示する"},"poll_title":{"label":"タイトル (オプション)"},"automatic_close":{"label":"投票を自動的に終了する"}}},"styleguide":{"title":"スタイルガイド","welcome":"開始するには、左側のメニューからセクションを選択します。","categories":{"atoms":"Atoms","molecules":"Molecules","organisms":"Organisms"},"sections":{"typography":{"title":"Typography","example":"Discourseへようこそ","paragraph":"山路を登りながら、こう考えた。知に働けば角が立つ。情に棹させば流される。意地を通せば窮屈だ。とかくに人の世は住みにくい。住みにくさが高じると、安いところへ引き越したくなる。どこへ越しても住みにくいと悟った時、詩が生まれて、画ができる。"},"date_time_inputs":{"title":"日付/時刻の入力"},"font_scale":{"title":"フォントシステム"},"colors":{"title":"色"},"icons":{"title":"アイコン","full_list":"Font Awesome Icons の全リストを見る"},"input_fields":{"title":"入力フィールド"},"buttons":{"title":"ボタン"},"dropdowns":{"title":"ドロップダウン"},"categories":{"title":"カテゴリ"},"bread_crumbs":{"title":"パンくずリスト"},"navigation":{"title":"ナビゲーション"},"navigation_bar":{"title":"ナビゲーションバー"},"navigation_stacked":{"title":"スタックされたナビゲーション"},"categories_list":{"title":"カテゴリ一覧"},"topic_link":{"title":"トピックリンク"},"topic_list_item":{"title":"トピックリスト項目"},"topic_statuses":{"title":"トピックのステータス"},"topic_list":{"title":"トピックリスト"},"basic_topic_list":{"title":"基本トピックリスト"},"footer_message":{"title":"フッターメッセージ"},"signup_cta":{"title":"サインアップCTA"},"topic_timer_info":{"title":"トピックタイマー"},"topic_footer_buttons":{"title":"トピックフッターボタン"},"topic_notifications":{"title":"トピック通知"},"post":{"title":"投稿"},"topic_map":{"title":"トピックマップ"},"site_header":{"title":"サイトヘッダー"},"suggested_topics":{"title":"関連トピック"},"post_menu":{"title":"投稿メニュー"},"modal":{"title":"モーダル","header":"モーダルタイトル","footer":"モーダルフッター"},"user_about":{"title":"ユーザーについてのボックス"},"header_icons":{"title":"ヘッダーアイコン"},"spinners":{"title":"スピナー"}}}}},"en":{"js":{"number":{"human":{"storage_units":{"units":{"byte":{"one":"Byte"}}}}},"dates":{"tiny":{"less_than_x_seconds":{"one":"< %{count}s"},"x_seconds":{"one":"%{count}s"},"less_than_x_minutes":{"one":"< %{count}m"},"x_minutes":{"one":"%{count}m"},"about_x_hours":{"one":"%{count}h"},"x_days":{"one":"%{count}d"},"x_months":{"one":"%{count}mon"},"about_x_years":{"one":"%{count}y"},"over_x_years":{"one":"> %{count}y"},"almost_x_years":{"one":"%{count}y"}},"medium":{"x_minutes":{"one":"%{count} min"},"x_hours":{"one":"%{count} hour"},"x_days":{"one":"%{count} day"}},"medium_with_ago":{"x_minutes":{"one":"%{count} min ago"},"x_hours":{"one":"%{count} hour ago"},"x_days":{"one":"%{count} day ago"},"x_months":{"one":"%{count} month ago"},"x_years":{"one":"%{count} year ago"}},"later":{"x_days":{"one":"%{count} day later"},"x_months":{"one":"%{count} month later"},"x_years":{"one":"%{count} year later"}}},"software_update_prompt":{"message":"We've updated this site, <span>please refresh</span>, or you may experience unexpected behavior.","dismiss":"Dismiss"},"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined."},"s3":{"regions":{"ap_east_1":"Asia Pacific (Hong Kong)"}},"links_lowercase":{"one":"link"},"x_more":{"one":"%{count} More","other":"%{count} More"},"character_count":{"one":"%{count} character"},"about":{"stat":{"last_day":"Last 24 hours","last_7_days":"Last 7 days","last_30_days":"Last 30 days"}},"drafts":{"abandon":{"confirm":"You have a draft in progress for this topic. What would you like to do with it?","yes_value":"Discard","no_value":"Resume editing"}},"topic_count_latest":{"one":"See %{count} new or updated topic"},"topic_count_unread":{"one":"See %{count} unread topic"},"topic_count_new":{"one":"See %{count} new topic"},"review":{"claim_help":{"required":"You must claim items before you can review them."},"topic_has_pending":{"one":"This topic has <b>%{count}</b> post pending approval"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)","other":"%{agreed}, %{disagreed}, %{ignored} (of last %{count} flags)"},"agreed":{"one":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore"}},"topics":{"unique_users":{"one":"%{count} user"}},"replies":{"one":"%{count} reply"},"approval":{"pending_posts":{"one":"You have <strong>%{count}</strong> post pending."}}},"relative_time_picker":{"minutes":{"one":"minute"},"hours":{"one":"hour"},"days":{"one":"day"},"months":{"one":"month"},"years":{"one":"year","other":"years"},"relative":"Relative"},"directory":{"total_rows":{"one":"%{count} user"}},"groups":{"title":{"one":"Group"},"members":{"remove_primary":"Remove as Primary","primary":"Primary"}},"categories":{"topic_sentence":{"one":"%{count} topic"},"topic_stat":{"one":"%{number} / %{unit}","other":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total","other":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month."}},"user":{"notification_schedule":{"to":"to"},"no_messages_title":"You don’t have any messages","no_messages_body":"Need to have a direct personal conversation with someone, outside the normal conversational flow? Message them by selecting their avatar and using the %{icon} message button.<br><br> If you need help, you can <a href='%{aboutUrl}'>message a staff member</a>.\n","preferences_nav":{"security":"Security"},"second_factor_backup":{"manage":{"one":"Manage backup codes. You have <strong>%{count}</strong> backup code remaining."},"remaining_codes":{"one":"You have <strong>%{count}</strong> backup code remaining."}},"email":{"invite_auth_email_invalid":"Your invitation email does not match the email authenticated by %{provider}","frequency":{"one":"We'll only email you if we haven't seen you in the last minute."}},"title_count_mode":{"title":"Background page title displays count of:"},"invited":{"expired_tab":"Expired","expired_tab_with_count":"Expired (%{count})","invited_via":"Invitation","invited_via_link":"link %{key} (%{count} / %{max} redeemed)","groups":"Groups","topic":"Topic","sent":"Created/Last Sent","expires_at":"Expires","edit":"Edit","remove":"Remove","copy_link":"Get Link","reinvite":"Resend Email","removed":"Removed","truncated":{"one":"Showing the first invite."},"remove_all":"Remove Expired Invites","removed_all":"All Expired Invites removed!","remove_all_confirm":"Are you sure you want to remove all expired invites?","reinvite_all":"Resend All Invites","reinvited_all":"All Invites Sent!","invite":{"new_title":"Create Invite","edit_title":"Edit Invite","instructions":"Share this link to instantly grant access to this site:","copy_link":"copy link","expires_in_time":"Expires in %{time}.","expired_at_time":"Expired at %{time}.","show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options","type_link":"Invite one or more people with a link","type_email":"Invite just one email address","email":"Limit to email address:","max_redemptions_allowed":"Max number of uses:","add_to_groups":"Add to groups:","invite_to_topic":"Send to topic on first login:","expires_at":"Expire after:","custom_message":"Optional personal message:","send_invite_email":"Save and Send Email","save_invite":"Save Invite","invite_saved":"Invite saved.","invite_copied":"Invite link copied.","blank_email":"Invite link not copied. Email address is required."},"bulk_invite":{"instructions":"<p>Invite a list of users to get your community going quickly. Prepare a <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\">CSV file</a> containing at least one row per email address of users you want to invite. The following comma separated information can be provided if you want to add people to groups or send them to a specific topic the first time they sign in.</p>\n<pre>john@smith.com,first_group_name;second_group_name,topic_id</pre>\n<p>Every email address in your uploaded CSV file will be sent an invitation, and you will be able to manage it later.</p>\n","progress":"Uploaded %{progress}%...","success":"File uploaded successfully. You will be notified via message when the process is complete."}},"summary":{"topic_count":{"one":"topic created"},"post_count":{"one":"post created"},"likes_given":{"one":"given"},"likes_received":{"one":"received"},"days_visited":{"one":"day visited"},"topics_entered":{"one":"topic viewed"},"posts_read":{"one":"post read"},"bookmark_count":{"one":"bookmark"}},"avatar":{"name_and_description":"%{name} - %{description}"}},"assets_changed_confirm":"This site just received a software upgrade. Get the latest version now?","replies_lowercase":{"one":"reply"},"summary":{"description":{"one":"There is <b>%{count}</b> reply.","other":"There are <b>%{count}</b> replies."}},"email_login":{"login_link":"Skip the password; email me a login link"},"login":{"header_title":"Welcome back","title":"Log in"},"category_row":{"topic_count":{"one":"%{count} topic in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory"},"plus_subcategories":{"one":"+ %{count} subcategory"}},"select_kit":{"max_content_reached":{"one":"You can only select %{count} item."},"min_content_not_reached":{"one":"Select at least %{count} item."},"invalid_selection_length":{"one":"Selection must be at least %{count} character."},"components":{"tag_drop":{"filter_for_more":"Filter for more..."}}},"composer":{"group_mentioned_limit":{"one":"<b>Warning!</b> You mentioned <a href='%{group_link}'>%{group}</a>, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified."},"group_mentioned":{"one":"By mentioning %{group}, you are about to notify <a href='%{group_link}'>%{count} person</a> – are you sure?"},"error":{"title_too_short":{"one":"Title must be at least %{count} character"},"title_too_long":{"one":"Title can't be more than %{count} character"},"post_length":{"one":"Post must be at least %{count} character"},"tags_missing":{"one":"You must choose at least %{count} tag"}},"show_preview":"show preview","hide_preview":"hide preview","toggle_direction":"Toggle Direction","collapse":"minimize the composer panel","open":"open the composer panel","abandon":"close composer and discard draft","enter_fullscreen":"enter fullscreen composer","exit_fullscreen":"exit fullscreen composer","show_toolbar":"show composer toolbar","hide_toolbar":"hide composer toolbar","slow_mode":{"error":"This topic is in slow mode. You already posted recently; you can post again in %{timeLeft}."},"composer_actions":{"reply_to_post":{"label":"Reply to a post by %{postUsername}"},"reply_as_new_group_message":{"label":"Reply as new group message","desc":"Create a new private message with the same recipients"},"toggle_whisper":{"label":"Toggle whisper","desc":"Whispers are only visible to staff members"},"shared_draft":{"desc":"Draft a topic that will only be visible to allowed users"},"toggle_topic_bump":{"label":"Toggle topic bump","desc":"Reply without changing latest reply date"}}},"notifications":{"tooltip":{"regular":{"one":"%{count} unseen notification"},"message":{"one":"%{count} unread message"},"high_priority":{"one":"%{count} unread high priority notification"}},"liked_2":"<span class='double-user'>%{username}, %{username2}</span> %{description}","liked_many":{"one":"<span class='multi-user'>%{username}, %{username2} and %{count} other</span> %{description}","other":"<span class='multi-user'>%{username}, %{username2} and %{count} others</span> %{description}"},"liked_consolidated_description":{"one":"liked %{count} of your posts","other":"liked %{count} of your posts"},"membership_request_accepted":"Membership accepted in '%{group_name}'","membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'","other":"%{count} open membership requests for '%{group_name}'"},"reaction":"<span>%{username}</span> %{description}","reaction_2":"<span>%{username}, %{username2}</span> %{description}","group_message_summary":{"one":"%{count} message in your %{group_name} inbox"},"popup":{"custom":"Notification from %{username} on %{site_title}"},"titles":{"liked":"new like","linked":"linked","bookmark_reminder":"bookmark reminder","bookmark_reminder_with_name":"bookmark reminder - %{name}","liked_consolidated":"new likes","post_approved":"post approved","membership_request_consolidated":"new membership requests","reaction":"new reaction","votes_released":"Vote was released"}},"search":{"result_count":{"one":"<span>%{count} result for</span><span class='term'>%{term}</span>","other":"<span>%{count}%{plus} results for</span><span class='term'>%{term}</span>"},"full_page_title":"search topics or posts","results_page":"Search results for '%{term}'","search_button":"Search","context":{"tag":"Search the #%{tag} tag"},"advanced":{"filters":{"label":"Only return topics/posts...","created":"I created"},"statuses":{"public":"are public"},"post":{"count":{"label":"Posts"},"min":{"placeholder":"minimum"},"max":{"placeholder":"maximum"}},"views":{"label":"Views"},"min_views":{"placeholder":"minimum"},"max_views":{"placeholder":"maximum"}}},"view_all":"view all %{tab}","topics":{"bulk":{"move_messages_to_inbox":"Move to Inbox","change_notification_level":"Change Notification Level","selected":{"one":"You have selected <b>%{count}</b> topic."},"remove_tags":"Remove All Tags","confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?","other":"All tags will be removed from <b>%{count}</b> topics. Are you sure?"},"progress":{"one":"Progress: <strong>%{count}</strong> topic","other":"Progress: <strong>%{count}</strong> topics"}},"none":{"ready_to_create":"Ready to ","educate":{"unread":"<p>Your unread topics appear here.</p><p>By default, topics are considered unread and will show unread counts <span class=\"badge new-posts badge-notification\">1</span> if you:</p><ul><li>Created the topic</li><li>Replied to the topic</li><li>Read the topic for more than 4 minutes</li></ul><p>Or if you have explicitly set the topic to Tracked or Watched via the 🔔 in each topic.</p><p>Visit your <a href=\"%{userPrefsUrl}\">preferences</a> to change this.</p>"}}},"topic":{"filter_to":{"one":"%{count} post in topic"},"new_topics":{"one":"%{count} new topic"},"unread_topics":{"one":"%{count} unread topic"},"total_unread_posts":{"one":"you have %{count} unread post in this topic"},"unread_posts":{"one":"you have %{count} unread old post in this topic"},"new_posts":{"one":"there is %{count} new post in this topic since you last read it"},"likes":{"one":"there is %{count} like in this topic"},"slow_mode_update":{"title":"Slow Mode","description":"To promote thoughtful discussion in fast moving or contentious discussions, users must wait before posting again in this topic.","enabled_until":"Enabled until:","remove":"Disable","hours":"Hours:","minutes":"Minutes:","seconds":"Seconds:","durations":{"10_minutes":"10 Minutes","15_minutes":"15 Minutes","30_minutes":"30 Minutes","45_minutes":"45 Minutes","1_hour":"1 Hour","2_hours":"2 Hours","4_hours":"4 Hours","8_hours":"8 Hours","12_hours":"12 Hours","24_hours":"24 Hours","custom":"Custom Duration"}},"slow_mode_notice":{"duration":"Please wait %{duration} between posts in this topic"},"topic_status_update":{"title":"Topic Timer","num_of_days":"Number of days:","time_frame_required":"Please select a time frame","min_duration":"Duration must be greater than 0","max_duration":"Duration must be less than 20 years"},"auto_update_input":{"none":"Select a timeframe","now":"Now","two_weeks":"Two weeks","two_months":"Two months","three_months":"Three months","four_months":"Four months","six_months":"Six months","one_year":"One year","forever":"Forever"},"auto_close":{"label":"Auto-close topic after:"},"auto_close_after_last_post":{"title":"Auto-Close Topic After Last Post"},"auto_bump":{"title":"Auto-Bump Topic"},"auto_delete_replies":{"title":"Auto-Delete Replies"},"status_update_notice":{"auto_close_after_last_post":"This topic will close %{duration} after the last reply.","auto_bump":"This topic will be automatically bumped %{timeLeft}.","auto_delete_replies":"Replies on this topic are automatically deleted after %{duration}."},"auto_close_immediate":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed immediately."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily.","other":"The last post in the topic is already %{count} hours old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post","other":"of %{count} posts"},"jump_prompt_long":"Jump to...","jump_prompt_to_date":"to date"},"actions":{"slow_mode":"Set Slow Mode","reset_bump_date":"Reset Bump Date"},"share":{"extended_title":"Share a link"},"make_public":{"title":"Convert to Public Topic","choose_category":"Please choose a category for the public topic:"},"feature_topic":{"already_pinned":{"one":"Topics currently pinned in %{categoryLink}: <strong class='badge badge-notification unread'>%{count}</strong>"},"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?","other":"You already have %{count} globally pinned topics. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"},"already_pinned_globally":{"one":"Topics currently pinned globally: <strong class='badge badge-notification unread'>%{count}</strong>"}},"invite_private":{"not_allowed":"Sorry, that user can't be invited."},"invite_reply":{"to_forum":"We'll send a brief email allowing your friend to immediately join by clicking a link.","discourse_connect_enabled":"Enter the username of the person you'd like to invite to this topic."},"filters":{"n_posts":{"one":"%{count} post"}},"move_to":{"title":"Move to","action":"move to","error":"There was an error moving posts."},"split_topic":{"topic_name":"New Topic Title","instructions":{"one":"You are about to create a new topic and populate it with the post you've selected."}},"merge_topic":{"radio_label":"Existing Topic","instructions":{"one":"Please choose the topic you'd like to move that post to."}},"move_to_new_message":{"instructions":{"one":"You are about to create a new message and populate it with the post you've selected.","other":"You are about to create a new message and populate it with the <b>%{count}</b> posts you've selected."}},"move_to_existing_message":{"instructions":{"one":"Please choose the message you'd like to move that post to.","other":"Please choose the message you'd like to move those <b>%{count}</b> posts to."}},"publish_page":{"title":"Page Publishing","publish":"Publish","description":"When a topic is published as a page, its URL can be shared and it will displayed with custom styling.","slug":"Slug","public_description":"People can see the page even if the associated topic is private.","publish_url":"Your page has been published at:","topic_published":"Your topic has been published at:","preview_url":"Your page will be published at:","invalid_slug":"Sorry, you can't publish this page.","unpublish":"Unpublish","unpublished":"Your page has been unpublished and is no longer accessible.","publishing_settings":"Publishing Settings"},"change_owner":{"title":"Change Owner","instructions":{"one":"Please choose a new owner for the post by <b>@%{old_user}</b>","other":"Please choose a new owner for the %{count} posts by <b>@%{old_user}</b>"},"instructions_without_old_user":{"one":"Please choose a new owner for the post","other":"Please choose a new owner for the %{count} posts"}},"multi_select":{"select_post":{"title":"Add post to selection"},"selected_post":{"label":"selected","title":"Click to remove post from selection"},"select_replies":{"title":"Add post and all its replies to selection"},"select_below":{"label":"select +below","title":"Add post and all after it to selection"},"description":{"one":"You have selected <b>%{count}</b> post."}},"deleted_by_author":{"one":"(topic withdrawn by author, will be automatically deleted in %{count} hour unless flagged)","other":"(topic withdrawn by author, will be automatically deleted in %{count} hours unless flagged)"}},"post":{"quote_share":"Share","wiki_last_edited_on":"wiki last edited on %{dateTime}","last_edited_on":"post last edited on %{dateTime}","deleted_by_author":{"one":"(post withdrawn by author, will be automatically deleted in %{count} hour unless flagged)"},"collapse":"collapse","locked":"a staff member has locked this post from being edited","gap":{"one":"view %{count} hidden reply"},"notice":{"returning_user":"It’s been a while since we’ve seen %{user} — their last post was %{time}."},"has_replies":{"one":"%{count} Reply"},"has_replies_count":"%{count}","unknown_user":"(unknown/deleted user)","has_likes_title":{"one":"%{count} person liked this post"},"has_likes_title_you":{"one":"you and %{count} other person liked this post"},"filtered_replies_hint":{"one":"View this post and its reply","other":"View this post and its %{count} replies"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to","other":"Viewing %{count} replies to"},"in_reply_to":"Load parent post","view_all_posts":"View all posts","errors":{"file_too_large":"Sorry, that file is too big (maximum size is %{max_size_kb}kb). Why not upload your large file to a cloud sharing service, then paste the link?","too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time.","other":"Sorry, you can only upload %{count} files at a time."}},"cancel_composer":{"confirm":"What would you like to do with your post?","discard":"Discard","save_draft":"Save draft for later","keep_editing":"Keep editing"},"via_auto_generated_email":"this post arrived via an auto generated email","few_likes_left":"Thanks for sharing the love! You only have a few likes left for today.","controls":{"read_indicator":"members who read this post","delete_replies":{"confirm":"Do you also want to delete the replies to this post?","direct_replies":{"one":"Yes, and %{count} direct reply","other":"Yes, and %{count} direct replies"},"all_replies":{"one":"Yes, and %{count} reply","other":"Yes, and all %{count} replies"}},"publish_page":"Page Publishing","lock_post":"Lock Post","lock_post_description":"prevent the poster from editing this post","unlock_post":"Unlock Post","unlock_post_description":"allow the poster to edit this post","delete_topic_disallowed_modal":"You don't have permission to delete this topic. If you really want it to be deleted, submit a flag for moderator attention together with reasoning.","delete_topic_disallowed":"you don't have permission to delete this topic","delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?","other":"This topic currently has over %{count} views and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"delete_topic_confirm_modal_yes":"Yes, delete this topic","delete_topic_confirm_modal_no":"No, keep this topic","delete_topic_error":"An error occurred while deleting this topic","add_post_notice":"Add Staff Notice","change_post_notice":"Change Staff Notice","delete_post_notice":"Delete Staff Notice","remove_timer":"remove timer","edit_timer":"edit timer"},"actions":{"people":{"like":{"one":"liked this","other":"liked this"},"read":{"one":"read this","other":"read this"},"like_capped":{"one":"and %{count} other liked this","other":"and %{count} others liked this"},"read_capped":{"one":"and %{count} other read this","other":"and %{count} others read this"}}},"delete":{"confirm":{"one":"Are you sure you want to delete that post?","other":"Are you sure you want to delete those %{count} posts?"}},"merge":{"confirm":{"one":"Are you sure you want to merge those posts?"}},"revisions":{"controls":{"revert":"Revert to revision %{revision}","comparing_previous_to_current_out_of_total":"<strong>%{previous}</strong> %{icon} <strong>%{current}</strong> / %{total}"}},"bookmarks":{"create":"Create bookmark","edit":"Edit bookmark","updated":"Updated","name_placeholder":"What is this bookmark for?","set_reminder":"Remind me","actions":{"delete_bookmark":{"name":"Delete bookmark","description":"Removes the bookmark from your profile and stops all reminders for the bookmark"},"edit_bookmark":{"name":"Edit bookmark","description":"Edit the bookmark name or change the reminder date and time"},"pin_bookmark":{"name":"Pin bookmark","description":"Pin the bookmark. This will make it appear at the top of your bookmarks list."},"unpin_bookmark":{"name":"Unpin bookmark","description":"Unpin the bookmark. It will no longer appear at the top of your bookmarks list."}}},"filtered_replies":{"viewing_posts_by":"Viewing %{post_count} posts by","viewing_subset":"Some replies are collapsed","viewing_summary":"Viewing a summary of this topic","post_number":"%{username}, post #%{post_number}","show_all":"Show all"}},"category":{"back":"Back to category","tags_allowed_tags":"Restrict these tags to this category:","tags_allowed_tag_groups":"Restrict these tag groups to this category:","tags_tab_description":"Tags and tag groups specified above will only be available in this category and other categories that also specify them. They won't be available for use in other categories.","manage_tag_groups_link":"Manage tag groups","allow_global_tags_label":"Also allow other tags","tag_group_selector_placeholder":"(Optional) Tag group","required_tag_group_description":"Require new topics to have tags from a tag group:","min_tags_from_required_group_label":"Num Tags:","required_tag_group_label":"Tag group:","topic_featured_link_allowed":"Allow featured links in this category","security_add_group":"Add a group","permissions":{"group":"Group","see":"See","reply":"Reply","create":"Create","no_groups_selected":"No groups have been granted access; this category will only be visible to staff.","everyone_has_access":"This category is public, everyone can see, reply and create posts. To restrict permissions, remove one or more of the permissions granted to the \"everyone\" group.","toggle_reply":"Toggle Reply permission","toggle_full":"Toggle Create permission","inherited":"This permission is inherited from \"everyone\""},"special_warning":"Warning: This category is a pre-seeded category and the security settings cannot be edited. If you do not wish to use this category, delete it instead of repurposing it.","uncategorized_security_warning":"This category is special. It is intended as holding area for topics that have no category; it cannot have security settings.","uncategorized_general_warning":"This category is special. It is used as the default category for new topics that do not have a category selected. If you want to prevent this behavior and force category selection, <a href=\"%{settingLink}\">please disable the setting here</a>. If you want to change the name or description, go to <a href=\"%{customizeLink}\">Customize / Text Content</a>.","pending_permission_change_alert":"You haven't added %{group} to this category; click this button to add them.","mailinglist_mirror":"Category mirrors a mailing list","show_subcategory_list":"Show subcategory list above topics in this category.","read_only_banner":"Banner text when a user cannot create a topic in this category:","num_featured_topics":"Number of topics shown on the categories page:","subcategory_num_featured_topics":"Number of featured topics on parent category's page:","all_topics_wiki":"Make new topics wikis by default","allow_unlimited_owner_edits_on_first_post":"Allow unlimited owner edits on first post","subcategory_list_style":"Subcategory List Style:","sort_order":"Topic List Sort By:","default_view":"Default Topic List:","default_top_period":"Default Top Period:","default_list_filter":"Default List Filter:","reviewable_by_group":"In addition to staff, content in this category can be also be reviewed by:","require_topic_approval":"Require moderator approval of all new topics","require_reply_approval":"Require moderator approval of all new replies","position":"Position on the categories page:","minimum_required_tags":"Minimum number of tags required in a topic:","num_auto_bump_daily":"Number of open topics to automatically bump daily:","navigate_to_first_post_after_read":"Navigate to first post after topics are read","notifications":{"watching":{"description":"You will automatically watch all topics in this category. You will be notified of every new post in every topic, and a count of new replies will be shown."},"watching_first_post":{"description":"You will be notified of new topics in this category but not replies to the topics."},"tracking":{"description":"You will automatically track all topics in this category. You will be notified if someone mentions your @name or replies to you, and a count of new replies will be shown."},"muted":{"description":"You will never be notified of anything about new topics in this category, and they will not appear in latest."}},"search_priority":{"label":"Search Priority","options":{"very_low":"Very Low","low":"Low","very_high":"Very High"}},"sort_options":{"default":"default","op_likes":"Original Post Likes"},"sort_ascending":"Ascending","sort_descending":"Descending","subcategory_list_styles":{"rows":"Rows","rows_with_featured_topics":"Rows with featured topics","boxes":"Boxes","boxes_with_featured_topics":"Boxes with featured topics"},"settings_sections":{"moderation":"Moderation","appearance":"Appearance"},"list_filters":{"all":"all topics","none":"no subcategories"},"colors_disabled":"You can’t select colors because you have a category style of none."},"flagging":{"take_action":"Take Action...","take_action_options":{"default":{"title":"Take Action","details":"Reach the flag threshold immediately, rather than waiting for more community flags"},"suspend":{"title":"Suspend User","details":"Reach the flag threshold, and suspend the user"},"silence":{"title":"Silence User","details":"Reach the flag threshold, and silence the user"}},"flag_for_review":"Queue For Review","custom_message":{"at_least":{"one":"enter at least %{count} character"},"more":{"one":"%{count} to go..."},"left":{"one":"%{count} remaining"}}},"topic_map":{"clicks":{"one":"%{count} click"}},"post_links":{"title":{"one":"%{count} more"}},"topic_statuses":{"personal_message":{"title":"This topic is a personal message","help":"This topic is a personal message"}},"views_lowercase":{"one":"view"},"views_long":{"one":"this topic has been viewed %{count} time"},"likes_lowercase":{"one":"like"},"users_lowercase":{"one":"user"},"filters":{"latest":{"title_with_count":{"one":"Latest (%{count})"}},"unread":{"title_with_count":{"one":"Unread (%{count})"},"lower_title_with_count":{"one":"%{count} unread"}},"new":{"lower_title_with_count":{"one":"%{count} new"},"title_with_count":{"one":"New (%{count})"}},"category":{"title_with_count":{"one":"%{categoryName} (%{count})"}},"top":{"other_periods":"see top:"}},"browser_update":"Unfortunately, <a href=\"https://www.discourse.org/faq/#browser\">your browser is too old to work on this site</a>. Please <a href=\"https://browsehappy.com\">upgrade your browser</a> to view rich content, log in and reply.","lightbox":{"previous":"Previous (Left arrow key)","next":"Next (Right arrow key)","counter":"%curr% of %total%","close":"Close (Esc)","content_load_error":"<a href=\"%url%\">The content</a> could not be loaded.","image_load_error":"<a href=\"%url%\">The image</a> could not be loaded."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":", ","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} or %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","jump_to":{"drafts":"%{shortcut} Drafts","next":"%{shortcut} Next Topic","previous":"%{shortcut} Previous Topic"},"navigation":{"go_to_unread_post":"%{shortcut} Go to the first unread post"},"composing":{"title":"Composing","return":"%{shortcut} Return to composer","fullscreen":"%{shortcut} Fullscreen composer"},"bookmarks":{"title":"Bookmarking","enter":"%{shortcut} Save and close","later_today":"%{shortcut} Later today","later_this_week":"%{shortcut} Later this week","tomorrow":"%{shortcut} Tomorrow","next_week":"%{shortcut} Next week","next_month":"%{shortcut} Next month","next_business_week":"%{shortcut} Start of next week","next_business_day":"%{shortcut} Next business day","custom":"%{shortcut} Custom date and time","none":"%{shortcut} No reminder","delete":"%{shortcut} Delete bookmark"},"actions":{"defer":"%{shortcut} Defer topic","topic_admin_actions":"%{shortcut} Open topic admin actions"},"search_menu":{"title":"Search Menu","prev_next":"%{shortcut} Move selection up and down","insert_url":"%{shortcut} Insert selection into open composer"}},"badges":{"earned_n_times":{"one":"Earned this badge %{count} time","other":"Earned this badge %{count} times"},"allow_title":"You can use this badge as a title","multiple_grant":"You can earn this multiple times","badge_count":{"one":"%{count} Badge"},"more_badges":{"one":"+%{count} More","other":"+%{count} More"},"granted":{"one":"%{count} granted","other":"%{count} granted"},"successfully_granted":"Successfully granted %{badge} to %{username}"},"tagging":{"info":"Info","default_info":"This tag isn't restricted to any categories, and has no synonyms.","category_restricted":"This tag is restricted to categories you don't have permission to access.","synonyms":"Synonyms","synonyms_description":"When the following tags are used, they will be replaced with <b>%{base_tag_name}</b>.","tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\".","other":"This tag belongs to these groups: %{tag_groups}."},"category_restrictions":{"one":"It can only be used in this category:","other":"It can only be used in these categories:"},"edit_synonyms":"Manage Synonyms","add_synonyms_label":"Add synonyms:","add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use <b>%{tag_name}</b> instead. Are you sure you want to make this change?","other":"Any place that currently uses these tags will be changed to use <b>%{tag_name}</b> instead. Are you sure you want to make this change?"},"add_synonyms_failed":"The following tags couldn't be added as synonyms: <b>%{tag_names}</b>. Ensure they don't have synonyms and aren't synonyms of another tag.","remove_synonym":"Remove Synonym","delete_synonym_confirm":"Are you sure you want to delete the synonym \"%{tag_name}\"?","delete_confirm":{"one":"Are you sure you want to delete this tag and remove it from %{count} topic it is assigned to?","other":"Are you sure you want to delete this tag and remove it from %{count} topics it is assigned to?"},"delete_confirm_no_topics":"Are you sure you want to delete this tag?","delete_confirm_synonyms":{"one":"Its synonym will also be deleted.","other":"Its %{count} synonyms will also be deleted."},"sort_by_count":"count","manage_groups_description":"Define groups to organize tags","upload":"Upload Tags","upload_description":"Upload a csv file to create tags in bulk","upload_instructions":"One per line, optionally with a tag group in the format 'tag_name,tag_group'.","delete_unused_confirmation":{"one":"%{count} tag will be deleted: %{tags}","other":"%{count} tags will be deleted: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} and %{count} more","other":"%{tags} and %{count} more"},"delete_no_unused_tags":"There are no unused tags.","tag_list_joiner":", ","delete_unused_description":"Delete all tags which are not attached to any topics or personal messages","filters":{"without_category":"%{filter} %{tag} topics","with_category":"%{filter} %{tag} topics in %{category}","untagged_without_category":"%{filter} untagged topics","untagged_with_category":"%{filter} untagged topics in %{category}"},"notifications":{"watching":{"description":"You will automatically watch all topics with this tag. You will be notified of all new posts and topics, plus the count of unread and new posts will also appear next to the topic."},"tracking":{"description":"You will automatically track all topics with this tag. A count of unread and new posts will appear next to the topic."},"muted":{"description":"You will not be notified of anything about new topics with this tag, and they will not appear on your unread tab."}},"groups":{"about":"Add tags to groups to manage them more easily.","tags_label":"Tags in this group:","parent_tag_description":"Tags from this group can't be used unless the parent tag is present.","one_per_topic_label":"Limit one tag per topic from this group","name_placeholder":"Tag Group Name","usable_only_by_groups":"Tags are visible to everyone, but only the following groups can use them","visible_only_to_groups":"Tags are visible only to the following groups","cannot_save":"Cannot save tag group. Make sure that there is at least one tag present, tag group name is not empty, and a group is selected for tags permission."}},"invite":{"approval_not_required":"User will be auto-approved as soon as they accept this invite.","custom_message_template_forum":"Hey, you should join this forum!","custom_message_template_topic":"Hey, I thought you might enjoy this topic!"},"forced_anonymous":"Due to extreme load, this is temporarily being shown to everyone as a logged out user would see it.","forced_anonymous_login_required":"The site is under extreme load and cannot be loaded at this time, try again in a few minutes.","footer_nav":{"forward":"Forward"},"safe_mode":{"enabled":"Safe mode is enabled, to exit safe mode close this browser window"},"image_removed":"(image removed)","admin":{"site_settings":{"categories":{"chat_integration":"Chat Integrations"}}},"chat_integration":{"menu_title":"Chat Integrations","no_providers":"You need to enable some providers in the plugin settings","channels_with_errors":"Some channels for this provider failed last time messages were sent. Click the error icon(s) to learn more.","channel_exception":"An unknown error occured when a message was last sent to this channel.","group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","choose_group":"(choose a group)","all_tags":"(all tags)","create_rule":"Create Rule","create_channel":"Create Channel","test_channel":"Test","channel_delete_confirm":"Are you sure you want to delete this channel? All associated rules will be deleted.","test_modal":{"title":"Send a test message","send":"Send Test Message","error":"An unknown error occured while sending the message. Check the site logs for more information.","success":"Message sent successfully"},"type":{"group_message":"Group Message","group_mention":"Group Mention"},"filter":{"follow":"First post only","watch":"All posts and replies","thread":"All posts with threaded replies"},"edit_channel_modal":{"title":"Edit Channel","save":"Save Channel","provider":"Provider","channel_validation":{"ok":"Valid","fail":"Invalid format"}},"edit_rule_modal":{"title":"Edit Rule","save":"Save Rule","provider":"Provider","channel":"Channel","instructions":{"type":"Change the type to trigger notifications for group messages or mentions","filter":"Notification level. Mute overrides other matching rules","category":"This rule will only apply to topics in the specified category","group":"This rule will apply to posts referencing this group","tags":"If specified, this rule will only apply to topics which have at least one of these tags"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"action_prohibited":"The bot does not have permission to post to that channel","channel_not_found":"The specified channel does not exist on slack"}},"telegram":{"title":"Telegram","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Telegram."},"chat_id":{"title":"Chat ID","help":"A number given to you by the bot, or a broadcast channel identifier in the form @channelname"}},"errors":{"channel_not_found":"The specified channel does not exist on Telegram","forbidden":"The bot does not have permission to post to this channel"}},"discord":{"title":"Discord","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Discord."},"webhook_url":{"title":"Webhook URL","help":"The webhook URL created in your Discord server settings"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"channel_not_found":"The specified channel does not exist on Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Matrix."},"room_id":{"title":"Room ID","help":"The 'private identifier' for the room. It should look something like !abcdefg:matrix.org"}},"errors":{"unknown_token":"Access token is invalid","unknown_room":"Room ID is invalid"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"The name of the Zulip stream the message should be sent to. e.g. 'general'"},"subject":{"help":"The subject that these messages sent by the bot should be given"}},"errors":{"does_not_exist":"That stream does not exist on Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"invalid_channel":"That channel does not exist on Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"help":"A Gitter room's name e.g. gitterHQ/services."},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new integration in a Gitter room."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow Token","help":"The flow token provided after creating a source for a flow into which you want to send messages."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Name","help":"A name for the channel (only shown in the Discourse admin interface)"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new webhook"}}}}},"presence":{"replying":{"one":"replying"},"editing":{"one":"editing"},"replying_to_topic":{"one":"replying"}},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"poll":{"voters":{"one":"voter"},"total_votes":{"one":"total vote"},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least <strong>%{count}</strong> option."},"up_to_max_options":{"one":"Choose up to <strong>%{count}</strong> option."},"x_options":{"one":"Choose <strong>%{count}</strong> option."}}},"breakdown":{"votes":"%{count} votes"},"ui_builder":{"poll_result":{"label":"Show Results...","vote":"Only after voting","closed":"When the poll is closed"},"poll_groups":{"label":"Limit voting to these groups"},"poll_chart_type":{"label":"Result chart"},"poll_options":{"label":"Options","add":"Add option"},"show_advanced":"Show Advanced Options","hide_advanced":"Hide Advanced Options"}}}}};
I18n.locale = 'ja';
I18n.pluralizationRules.ja = MessageFormat.locale.ja;
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
//! locale : Japanese [ja]
//! author : LI Long : https://github.com/baryon

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var ja = moment.defineLocale('ja', {
        eras: [
            {
                since: '2019-05-01',
                offset: 1,
                name: '令和',
                narrow: '㋿',
                abbr: 'R',
            },
            {
                since: '1989-01-08',
                until: '2019-04-30',
                offset: 1,
                name: '平成',
                narrow: '㍻',
                abbr: 'H',
            },
            {
                since: '1926-12-25',
                until: '1989-01-07',
                offset: 1,
                name: '昭和',
                narrow: '㍼',
                abbr: 'S',
            },
            {
                since: '1912-07-30',
                until: '1926-12-24',
                offset: 1,
                name: '大正',
                narrow: '㍽',
                abbr: 'T',
            },
            {
                since: '1873-01-01',
                until: '1912-07-29',
                offset: 6,
                name: '明治',
                narrow: '㍾',
                abbr: 'M',
            },
            {
                since: '0001-01-01',
                until: '1873-12-31',
                offset: 1,
                name: '西暦',
                narrow: 'AD',
                abbr: 'AD',
            },
            {
                since: '0000-12-31',
                until: -Infinity,
                offset: 1,
                name: '紀元前',
                narrow: 'BC',
                abbr: 'BC',
            },
        ],
        eraYearOrdinalRegex: /(元|\d+)年/,
        eraYearOrdinalParse: function (input, match) {
            return match[1] === '元' ? 1 : parseInt(match[1] || input, 10);
        },
        months: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
        monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split(
            '_'
        ),
        weekdays: '日曜日_月曜日_火曜日_水曜日_木曜日_金曜日_土曜日'.split('_'),
        weekdaysShort: '日_月_火_水_木_金_土'.split('_'),
        weekdaysMin: '日_月_火_水_木_金_土'.split('_'),
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'YYYY/MM/DD',
            LL: 'YYYY年M月D日',
            LLL: 'YYYY年M月D日 HH:mm',
            LLLL: 'YYYY年M月D日 dddd HH:mm',
            l: 'YYYY/MM/DD',
            ll: 'YYYY年M月D日',
            lll: 'YYYY年M月D日 HH:mm',
            llll: 'YYYY年M月D日(ddd) HH:mm',
        },
        meridiemParse: /午前|午後/i,
        isPM: function (input) {
            return input === '午後';
        },
        meridiem: function (hour, minute, isLower) {
            if (hour < 12) {
                return '午前';
            } else {
                return '午後';
            }
        },
        calendar: {
            sameDay: '[今日] LT',
            nextDay: '[明日] LT',
            nextWeek: function (now) {
                if (now.week() !== this.week()) {
                    return '[来週]dddd LT';
                } else {
                    return 'dddd LT';
                }
            },
            lastDay: '[昨日] LT',
            lastWeek: function (now) {
                if (this.week() !== now.week()) {
                    return '[先週]dddd LT';
                } else {
                    return 'dddd LT';
                }
            },
            sameElse: 'L',
        },
        dayOfMonthOrdinalParse: /\d{1,2}日/,
        ordinal: function (number, period) {
            switch (period) {
                case 'y':
                    return number === 1 ? '元年' : number + '年';
                case 'd':
                case 'D':
                case 'DDD':
                    return number + '日';
                default:
                    return number;
            }
        },
        relativeTime: {
            future: '%s後',
            past: '%s前',
            s: '数秒',
            ss: '%d秒',
            m: '1分',
            mm: '%d分',
            h: '1時間',
            hh: '%d時間',
            d: '1日',
            dd: '%d日',
            M: '1ヶ月',
            MM: '%dヶ月',
            y: '1年',
            yy: '%d年',
        },
    });

    return ja;

})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

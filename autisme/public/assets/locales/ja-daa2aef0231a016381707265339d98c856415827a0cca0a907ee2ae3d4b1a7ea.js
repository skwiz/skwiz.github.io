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
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">ディスカッションを開始しましょう！</a> 現在、";
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
})() + "</strong> 件のトピック";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件のトピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "と";
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
})() + "</strong> 件の投稿";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件の投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "があります。訪問者が読んで返信できる項目がもっと必要です。少なくとも ";
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
})() + "</strong> 件のトピック";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件のトピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "と";
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
})() + "</strong> 件の投稿";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件の投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "を作成することをお勧めします。このメッセージはスタッフのみに表示されます。";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">ディスカッションを開始しましょう！</a> 現在、";
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
})() + "</strong> 件のトピック";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件のトピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "があります。訪問者が読んで返信できる項目がもっと必要です。少なくとも ";
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
})() + "</strong> 件のトピック";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件のトピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "を作成することをお勧めします。このメッセージはスタッフのみに表示されます。";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">ディスカッションを開始しましょう！</a> 現在、";
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
})() + "</strong> 件の投稿";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件の投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "があります。訪問者が読んで返信できる項目がもっと必要です。少なくとも ";
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
})() + "</strong> 件の投稿";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 件の投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "を作成することをお勧めします。このメッセージはスタッフのみに表示されます。";
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
r += "1 時間当たりのエラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> がサイトで設定されている";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "エラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " の制限に達しました。";
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
r += "1 分当たりのエラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> がサイトで設定されている";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "エラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " の制限に達しました。";
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
r += "1 時間当たりのエラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> がサイトで設定されている";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "エラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " の制限を超えました。";
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
r += "1 分当たりのエラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> がサイトで設定されている";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "limit";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "エラー件数 (" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + ")";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " の制限を超えました。";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "replyCount";
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
})() + "</b> 件の返信";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "があります。読了目安時間は <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "readingTime";
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
})() + " 分";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>です。";
return r;
}, "topic.read_more_MF" : function(d){
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
})() + " 件の未読</a>";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "と";
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
})() + " 件の新しい</a>トピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " が残っています。または ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["catLink"];
r += " のほかのトピックを閲覧してください";
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
r += "このユーザーの ";
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
})() + "</b> 件の投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "と";
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
})() + "</b> 件のトピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "を削除し、アカウントを削除し、IP アドレス <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b> からの登録をブロックし、メールアドレス <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> を永久ブロックリストに追加しようとしています。このユーザーは本当に迷惑行為者ですか？";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "このトピックには";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "ratio";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"low" : function(d){
var r = "";
r += "「いいね！」率が高い";
return r;
},
"med" : function(d){
var r = "";
r += "「いいね！」率がとても高い";
return r;
},
"high" : function(d){
var r = "";
r += "「いいね！」率が非常に高い";
return r;
},
"other" : function(d){
var r = "";
return r;
}
};
r += (pf_0[ k_1 ] || pf_0[ "other" ])( d );
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "count";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"other" : function(d){
var r = "";
r += "返信が " + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 件";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "あります\n";
return r;
}, "admin.user.delete_all_posts_confirm_MF" : function(d){
var r = "";
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
})() + " 件の投稿";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "と";
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
})() + " 件のトピック";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "を削除しようとしています。よろしいですか？";
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ja"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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

I18n.translations = {"ja":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"other":"バイト"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"a h:mm","time_with_zone":"a hh:mm (z)","time_short_day":"ddd a h:mm","timeline_date":"YYYY 年 MMM","long_no_year":"MMM D 日 a h:mm","long_no_year_no_time":"MMM D 日","full_no_year_no_time":"MMMM D 日","long_with_year":"YYYY 年 MMM D 日 a h:mm","long_with_year_no_time":"YYYY 年 MMM D 日","full_with_year_no_time":"YYYY 年 MMMM D 日","long_date_with_year":"'YY 年 MMM D 日 LT","long_date_without_year":"MMM D 日 LT","long_date_with_year_without_time":"'YY 年 MMM D 日","long_date_without_year_with_linebreak":"MMM D 日 \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"'YY 年 MMM D 日 \u003cbr/\u003eLT","wrap_ago":"%{date}前","wrap_on":"%{date}","tiny":{"half_a_minute":"1 分未満","less_than_x_seconds":{"other":"%{count} 秒未満"},"x_seconds":{"other":"%{count} 秒"},"less_than_x_minutes":{"other":"%{count} 分未満"},"x_minutes":{"other":"%{count} 分"},"about_x_hours":{"other":"%{count} 時間"},"x_days":{"other":"%{count} 日"},"x_months":{"other":"%{count} か月"},"about_x_years":{"other":"%{count} 年"},"over_x_years":{"other":"%{count} 年以上"},"almost_x_years":{"other":"%{count} 年"},"date_month":"MMM D 日","date_year":"'YY 年 MMM"},"medium":{"x_minutes":{"other":"%{count} 分"},"x_hours":{"other":"%{count} 時間"},"x_days":{"other":"%{count} 日"},"date_year":"'YY 年 MMM D 日"},"medium_with_ago":{"x_minutes":{"other":"%{count} 分前"},"x_hours":{"other":"%{count} 時間前"},"x_days":{"other":"%{count} 日前"},"x_months":{"other":"%{count} か月前"},"x_years":{"other":"%{count} 年前"}},"later":{"x_days":{"other":"%{count} 日後"},"x_months":{"other":"%{count} か月後"},"x_years":{"other":"%{count} 年後"}},"previous_month":"前月","next_month":"翌月","placeholder":"日付","to_placeholder":"日付"},"share":{"topic_html":"トピック: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"投稿 #%{postNumber}","close":"閉じる","twitter":"Twitter で共有","facebook":"Facebook で共有","email":"メールで送信","url":"URL をコピーして共有"},"action_codes":{"public_topic":"トピックを公開しました: %{when}","private_topic":"このトピックを個人メッセージにしました: %{when}","split_topic":"このトピックを分割しました: %{when}","invited_user":"%{who} を招待しました: %{when}","invited_group":"%{who} を招待しました: %{when}","user_left":"%{who} は %{when} にこのメッセージから退出しました","removed_user":"%{who} を削除しました: %{when}","removed_group":"%{who} を削除しました: %{when}","autobumped":"自動的にトップに上げられました: %{when}","autoclosed":{"enabled":"クローズされました: %{when}","disabled":"オープンされました: %{when}"},"closed":{"enabled":"クローズされました: %{when}","disabled":"オープンされました: %{when}"},"archived":{"enabled":"アーカイブされました: %{when}","disabled":"アーカイブを解除されました: %{when}"},"pinned":{"enabled":"固定しました: %{when}","disabled":"固定解除しました: %{when}"},"pinned_globally":{"enabled":"全体に固定しました: %{when}","disabled":"固定解除しました: %{when}"},"visible":{"enabled":"表示: %{when}","disabled":"非表示: %{when}"},"banner":{"enabled":"%{when}にこれをバナーにしました。ユーザーが閉じるまで各ページの上部に表示されます。","disabled":"%{when}にこのバナーを削除しました。今後ページの上部に表示されることはありません。"},"forwarded":"上記のメールを転送しました"},"topic_admin_menu":"トピックの操作","wizard_required":"Discourse へようこそ！ \u003ca href='%{url}' data-auto-route='true'\u003eセットアップウィザード\u003c/a\u003eから始めましょう","emails_are_disabled":"メールの送信は管理者によって無効化されています。メール通知は一切送信されません。","software_update_prompt":{"message":"このサイトを更新したので、\u003cspan\u003e再読み込みしてください\u003c/span\u003e。再読み込みしない場合、予期しない動作が発生する可能性があります。","dismiss":"閉じる"},"bootstrap_mode_enabled":{"other":"新しいサイトを簡単に立ち上げられるように、ブートストラップモードになっています。すべての新規ユーザーの信頼レベルは 1 となり、要約メールを毎日受け取るように設定されています。この設定は %{count} 名のユーザーが参加すると自動的に無効になります。"},"bootstrap_mode_disabled":"ブートストラップモードは 24 時間以内に無効になります。","themes":{"default_description":"デフォルト","broken_theme_alert":"テーマ/コンポーネントの %{theme} にエラーがあるため、サイトが動作しない可能性があります。%{path} で無効にしてください。"},"s3":{"regions":{"ap_northeast_1":"アジア・太平洋 (東京)","ap_northeast_2":"アジア・太平洋 (ソウル)","ap_east_1":"アジア・太平洋 (香港)","ap_south_1":"アジア・太平洋 (ムンバイ)","ap_southeast_1":"アジア・太平洋 (シンガポール)","ap_southeast_2":"アジア・太平洋 (シドニー)","ca_central_1":"カナダ (中部)","cn_north_1":"中国 (北京)","cn_northwest_1":"中国 (寧夏)","eu_central_1":"EU (フランクフルト)","eu_north_1":"EU (ストックホルム)","eu_west_1":"EU (アイルランド)","eu_west_2":"EU (ロンドン)","eu_west_3":"EU (パリ)","sa_east_1":"南アメリカ (サンパウロ)","us_east_1":"米国東部 (バージニア北部)","us_east_2":"米国東部 (オハイオ)","us_gov_east_1":"AWS GovCloud (米国東部)","us_gov_west_1":"AWS GovCloud (米国西部)","us_west_1":"米国西部 (北カリフォルニア)","us_west_2":"米国西部 (オレゴン)"}},"clear_input":"入力をクリア","edit":"このトピックのタイトルとカテゴリを編集","expand":"展開","not_implemented":"その機能はまだ実装されていません！","no_value":"いいえ","yes_value":"はい","submit":"送信","generic_error":"申し訳ありません。エラーが発生しました。","generic_error_with_reason":"エラーが発生しました: %{error}","sign_up":"アカウントを登録","log_in":"ログイン","age":"年齢","joined":"参加","admin_title":"管理","show_more":"もっと表示","show_help":"オプション","links":"リンク","links_lowercase":{"other":"リンク"},"faq":"FAQ","guidelines":"ガイドライン","privacy_policy":"プライバシーポリシー","privacy":"プライバシー","tos":"利用規約","rules":"ルール","conduct":"行動規範","mobile_view":"モバイルビュー","desktop_view":"デスクトップビュー","or":"または","now":"たった今","read_more":"もっと読む","more":"もっと","x_more":{"other":"他 %{count}"},"never":"なし","every_30_minutes":"30 分毎","every_hour":"1 時間毎","daily":"毎日","weekly":"毎週","every_month":"毎月","every_six_months":"6 か月毎","max_of_count":"最大 %{count}","character_count":{"other":"%{count} 文字"},"related_messages":{"title":"関連メッセージ","see_all":"@%{username} からの\u003ca href=\"%{path}\"\u003eすべてのメッセージ\u003c/a\u003eを表示..."},"suggested_topics":{"title":"推奨トピック","pm_title":"推奨メッセージ"},"about":{"simple_title":"サイト情報","title":"%{title}について","stats":"サイトの統計","our_admins":"管理者","our_moderators":"モデレーター","moderators":"モデレーター","stat":{"all_time":"全期間","last_day":"過去 24 時間","last_7_days":"過去 7 日間","last_30_days":"過去 30 日間"},"like_count":"「いいね！」数","topic_count":"トピック","post_count":"投稿","user_count":"ユーザー","active_user_count":"アクティブユーザー","contact":"お問い合わせ","contact_info":"このサイトに影響を与える重要な問題や緊急の問題が発生した場合は、%{contact_info} までご連絡ください。"},"bookmarked":{"title":"ブックマーク","edit_bookmark":"ブックマークを編集","clear_bookmarks":"ブックマークをクリア","help":{"bookmark":"クリックしてこのトピックの最初の投稿をブックマークします","edit_bookmark":"クリックしてこのトピックのブックマークを編集します","unbookmark":"クリックしてこのトピック内のすべてのブックマークを削除します","unbookmark_with_reminder":"クリックしてこのトピック内のすべてのブックマークとリマインダーを削除します。"}},"bookmarks":{"created":"この投稿をブックマークしました。%{name}","not_bookmarked":"この投稿をブックマークする","created_with_reminder":"%{date} のリマインダー付きでこの投稿をブックマークしました。%{name}","remove":"ブックマークを削除","delete":"ブックマークを削除","confirm_delete":"このブックマークを削除してもよろしいですか？リマインダーも削除されます。","confirm_clear":"このトピックのすべてのブックマークをクリアしてもよろしいですか?","save":"保存","no_timezone":"まだタイムゾーンを設定していないためリマインダーを設定することはできません。\u003ca href=\"%{basePath}/my/preferences/profile\"\u003eプロフィール\u003c/a\u003eで設定してください。","invalid_custom_datetime":"入力された日時が無効です。もう一度お試しください。","list_permission_denied":"このユーザーのブックマークを表示する権限がありません。","no_user_bookmarks":"ブックマークした投稿はありません。ブックマークを使用すると、特定の投稿を素早く参照できます。","auto_delete_preference":{"label":"自動的に削除","never":"削除しない","when_reminder_sent":"リマインダーが送信されたとき","on_owner_reply":"このトピックに返信した後"},"search_placeholder":"名前、トピックタイトル、または投稿コンテンツでブックマークを検索する","search":"検索","reminders":{"today_with_time":"今日 %{time}","tomorrow_with_time":"明日 %{time}","at_time":"%{date_time}","existing_reminder":"このブックマークに %{at_date_time} に送信されるリマインダーが設定されています"}},"copy_codeblock":{"copied":"コピーしました！"},"drafts":{"label":"下書き","resume":"再開","remove":"削除","remove_confirmation":"この下書きを削除してもよろしいですか？","new_topic":"新しいトピックの下書き","new_private_message":"新しい個人メッセージの下書き","topic_reply":"返信の下書き","abandon":{"confirm":"このトピックの作成中の下書きがあります。どうしますか？","yes_value":"破棄","no_value":"編集を再開"}},"topic_count_categories":{"other":"%{count} 件の新規/更新トピックを見る"},"topic_count_latest":{"other":"%{count} 件の新規/更新トピックを見る"},"topic_count_unseen":{"other":"%{count} 件の新規/更新トピックを見る"},"topic_count_unread":{"other":"%{count} 件の未読トピックを見る"},"topic_count_new":{"other":"%{count} 件の新規トピックを見る"},"preview":"プレビュー","cancel":"キャンセル","deleting":"削除中...","save":"変更を保存","saving":"保存中...","saved":"保存しました！","upload":"アップロード","uploading":"アップロード中...","uploading_filename":"アップロード中: %{filename}…","processing_filename":"処理中: %{filename}...","clipboard":"クリップボード","uploaded":"アップロードしました！","pasting":"貼り付け中...","enable":"有効化","disable":"無効化","continue":"続行","undo":"元に戻す","revert":"戻す","failed":"失敗しました","switch_to_anon":"匿名モードを開始","switch_from_anon":"匿名モードを終了","banner":{"close":"バナーを閉じる。","edit":"このバナーを編集 \u003e\u003e"},"pwa":{"install_banner":"\u003ca href\u003eこのデバイスに %{title} をインストール\u003c/a\u003eしますか？"},"choose_topic":{"none_found":"トピックが見つかりませんでした。","title":{"search":"トピックの検索","placeholder":"ここにトピックのタイトル、URL、または ID を入力してください"}},"choose_message":{"none_found":"メッセージが見つかりません。","title":{"search":"メッセージの検索","placeholder":"ここにメッセージのタイトル、URL、または ID を入力してください"}},"review":{"order_by":"並べ替え順","in_reply_to":"返信","explain":{"why":"この項目が、キューに追加された理由を説明してください","title":"レビュー待ち項目スコア","formula":"式","subtotal":"小計","total":"合計","min_score_visibility":"表示する最低スコア","score_to_hide":"投稿を非表示にするスコア","take_action_bonus":{"name":"対応済み","title":"スタッフが対応すると、フラグにボーナスが与えられます。"},"user_accuracy_bonus":{"name":"ユーザーの正確性","title":"過去に同意を得たフラグを報告したユーザーにはボーナスが与えられます。"},"trust_level_bonus":{"name":"信頼レベル","title":"レビュー待ち項目を作成したユーザーの信頼レベルが高いほど、その項目のスコアが高くなります。"},"type_bonus":{"name":"タイプボーナス","title":"特定のレビュー待ち項目タイプには、スタッフがボーナスを割り当てて優先順位を上げられます。"}},"stale_help":"このレビュー待ち項目は \u003cb\u003e%{username}\u003c/b\u003e によって解決されました。","claim_help":{"optional":"この項目を自分に割り当ててほかのユーザーがレビューしないようにできます。","required":"レビューする前に項目を自分に割り当てる必要があります。","claimed_by_you":"この項目を自分に割り当てたため、レビューできます。","claimed_by_other":"この項目は \u003cb\u003e%{username}\u003c/b\u003e のみがレビューできます。"},"claim":{"title":"トピックを自分に割り当てる"},"unclaim":{"help":"この割り当てを削除する"},"awaiting_approval":"承認待ち","delete":"削除","settings":{"saved":"保存しました","save_changes":"変更を保存","title":"設定","priorities":{"title":"レビュー待ち項目の優先順位"}},"moderation_history":"モデレーション履歴","view_all":"すべて表示","grouped_by_topic":"トピック別","none":"レビューする項目がありません","view_pending":"保留中を表示","topic_has_pending":{"other":"このトピックには承認待ちの投稿が \u003cb\u003e%{count}\u003c/b\u003e 件あります"},"title":"レビュー","topic":"トピック:","filtered_topic":"1 つのトピックのレビュー待ちコンテンツにフィルターを適用しました。","filtered_user":"ユーザー","filtered_reviewed_by":"レビュー者:","show_all_topics":"すべてのトピックを表示","deleted_post":"(削除された投稿)","deleted_user":"(削除されたユーザー)","user":{"bio":"略歴","website":"ウェブサイト","username":"ユーザー名","email":"メール","name":"名前","fields":"フィールド","reject_reason":"理由"},"user_percentage":{"summary":{"other":"%{agreed}、%{disagreed}、%{ignored} (最後の %{count} 件の通報の内)"},"agreed":{"other":"同意 %{count}%"},"disagreed":{"other":"同意しない %{count}%"},"ignored":{"other":"無視 %{count}%"}},"topics":{"topic":"トピック","reviewable_count":"件数","reported_by":"報告者:","deleted":"[削除されたトピック]","original":"(元のトピック)","details":"詳細","unique_users":{"other":"ユーザー: %{count} 人"}},"replies":{"other":"返信: %{count} 件"},"edit":"編集","save":"保存","cancel":"キャンセル","new_topic":"この項目を承認すると新しいトピックが作成されます","filters":{"all_categories":"(すべてのカテゴリ)","type":{"title":"タイプ","all":"(全タイプ)"},"minimum_score":"最低スコア:","refresh":"更新","status":"ステータス","category":"カテゴリ","orders":{"score":"スコア","score_asc":"スコア (昇順)","created_at":"作成日","created_at_asc":"作成日 (昇順)"},"priority":{"title":"最低優先度","any":"(すべて)","low":"低","medium":"普通","high":"高"}},"conversation":{"view_full":"会話をすべて表示"},"scores":{"about":"このスコアは、報告者の信頼レベル、以前のフラグの正確性、および報告されている項目の優先度に基づいて計算されます。","score":"スコア","date":"日付","type":"タイプ","status":"ステータス","submitted_by":"送信者:","reviewed_by":"レビュー者:"},"statuses":{"pending":{"title":"保留中"},"approved":{"title":"承認済み"},"rejected":{"title":"却下"},"ignored":{"title":"無視"},"deleted":{"title":"削除済み"},"reviewed":{"title":"(すべてレビュー済み)"},"all":{"title":"(全ステータス)"}},"types":{"reviewable_flagged_post":{"title":"通報された投稿","flagged_by":"通報者:"},"reviewable_queued_topic":{"title":"待機中のトピック"},"reviewable_queued_post":{"title":"待機中の投稿"},"reviewable_user":{"title":"ユーザー"},"reviewable_post":{"title":"投稿"}},"approval":{"title":"承認待ちの投稿","description":"あなたの新しい投稿を受領しましたが、表示するにはモデレーターの承認が必要です。しばらくお待ちください。","pending_posts":{"other":"保留中の投稿が \u003cstrong\u003e%{count}\u003c/strong\u003e 件あります。"},"ok":"OK"},"example_username":"ユーザー名","reject_reason":{"title":"なぜこのユーザーを拒否しますか？","send_email":"拒否メールを送信"}},"relative_time_picker":{"minutes":{"other":"分"},"hours":{"other":"時間"},"days":{"other":"日"},"months":{"other":"か月"},"years":{"other":"年"},"relative":"相対"},"time_shortcut":{"later_today":"今日の後程","next_business_day":"翌営業日","tomorrow":"明日","post_local_date":"投稿の日付","later_this_week":"今週の後半","this_weekend":"今週末","start_of_next_business_week":"月曜日","start_of_next_business_week_alt":"来週の月曜日","two_weeks":"2 週間","next_month":"来月","six_months":"6 か月","custom":"カスタムの日付と時刻","relative":"相対時間","none":"不要","last_custom":"最後のカスタム日時"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e が\u003ca href='%{topicUrl}'\u003eトピック\u003c/a\u003eを作成しました","you_posted_topic":"\u003ca href='%{userUrl}'\u003eあなた\u003c/a\u003eが\u003ca href='%{topicUrl}'\u003eトピック\u003c/a\u003eを作成しました","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e が \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e に返信しました","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eあなた\u003c/a\u003e が \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e に返信しました","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e が\u003ca href='%{topicUrl}'\u003eトピック\u003c/a\u003eに返信しました","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eあなた\u003c/a\u003e が\u003ca href='%{topicUrl}'\u003eトピック\u003c/a\u003eに返信しました","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e が \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e をメンションしました","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e が\u003ca href='%{user2Url}'\u003eあなた\u003c/a\u003eをメンションしました","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eあなた\u003c/a\u003eが \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e をメンションしました","posted_by_user":"投稿者: \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"投稿者: \u003ca href='%{userUrl}'\u003eあなた\u003c/a\u003e","sent_by_user":"送信者: \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"送信者: \u003ca href='%{userUrl}'\u003eあなた\u003c/a\u003e"},"directory":{"username":"ユーザー名","filter_name":"ユーザー名でフィルタ","title":"ユーザー","likes_given":"与えた","likes_received":"受け取った","topics_entered":"閲覧数","topics_entered_long":"閲覧したトピック数","time_read":"読んだ時間","topic_count":"トピック","topic_count_long":"作成したトピック数","post_count":"返信","post_count_long":"投稿の返信数","no_results":"結果はありませんでした。","days_visited":"アクセス","days_visited_long":"アクセス日数","posts_read":"既読","posts_read_long":"既読の投稿数","last_updated":"最終更新:","total_rows":{"other":"ユーザー: %{count} 人"},"edit_columns":{"title":"ディレクトリ列の編集","save":"保存","reset_to_default":"デフォルトにリセット"},"group":{"all":"すべてのグループ"}},"group_histories":{"actions":{"change_group_setting":"グループの設定を変更","add_user_to_group":"ユーザーを追加","remove_user_from_group":"ユーザーを削除","make_user_group_owner":"オーナーにする","remove_user_as_group_owner":"オーナーを取り消す"}},"groups":{"member_added":"追加済み","member_requested":"リクエスト日:","add_members":{"title":"ユーザーを %{group_name} に追加","description":"グループに招待するユーザーのリストを入力するか、カンマ区切りのリストを貼り付けます:","usernames_placeholder":"ユーザー名","usernames_or_emails_placeholder":"ユーザー名またはメール","notify_users":"ユーザーに通知","set_owner":"ユーザーをこのグループのオーナーに設定する"},"requests":{"title":"リクエスト","reason":"理由","accept":"承諾","accepted":"承諾","deny":"拒否","denied":"拒否","undone":"リクエストの取り消し","handle":"メンバーシップリクエストを処理する"},"manage":{"title":"管理","name":"名前","full_name":"フルネーム","add_members":"ユーザーを追加","invite_members":"招待","delete_member_confirm":"%{username} を %{group} グループから削除しますか？","profile":{"title":"プロフィール"},"interaction":{"title":"交流","posting":"投稿","notification":"通知"},"email":{"title":"メール","status":"IMAP 経由で %{old_emails} / %{total_emails} のメールを同期しました。","enable_smtp":"SMTP を有効化","enable_imap":"IMAP を有効化","test_settings":"設定をテスト","save_settings":"設定を保存","last_updated":"最終更新:","last_updated_by":"更新者:","settings_required":"すべての設定は必須です。すべてのフィールドに入力してから検証してください。","smtp_settings_valid":"SMTP 設定は有効です。","smtp_title":"SMTP","smtp_instructions":"このグループで SMTP を有効化すると、グループの受信トレイから送信されるすべての送信メールは、フォーラムが送信するほかのメール用に構成されているメールサーバーではなく、ここで指定される SMTP 設定を介して送信されます。","imap_title":"IMAP","imap_additional_settings":"追加設定","imap_instructions":"このグループで IMAP を有効化すると、グループの受信トレイと指定された IMAP サーバーとメールボックスの間でメールが同期されます。IMAP を有効にする前に、テスト済みの有効な資格情報で SMTP を有効にする必要があります。SMTP に使用されるメールのユーザー名とパスワードが IMAP にも使用されます。詳細は、「\u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003eDiscourse Meta の機能に関するお知らせ\u003c/a\u003e」をご覧ください。","imap_alpha_warning":"警告: これはアルファステージの機能です。Gmail のみが公式にサポートされています。自己責任でご利用ください！","imap_settings_valid":"IMAP の設定は有効です。","smtp_disable_confirm":"SMTP を無効にすると、すべての SMTP と IMAP の設定がリセットされ、関連付けられている機能が無効になります。続行してもよろしいですか？","imap_disable_confirm":"IMAP を無効にすると、すべての IMAP 設定がリセットされ、関連付けられている機能が無効になります。続行してもよろしいですか？","imap_mailbox_not_selected":"この IMAP 構成のメールボックスを選択する必要があります。選択しない場合、メールボックスは同期されません！","prefill":{"title":"次の設定で事前入力:","gmail":"GMail"},"credentials":{"title":"資格情報","smtp_server":"SMTP サーバー","smtp_port":"SMTP ポート","smtp_ssl":"SMTP に SSL を使用する","imap_server":"IMAP サーバー","imap_port":"IMAP ポート","imap_ssl":"IMAP に SSL を使用する","username":"ユーザー名","password":"パスワード"},"settings":{"title":"設定","allow_unknown_sender_topic_replies":"不明な送信者によるトピックの返信を許可します。","allow_unknown_sender_topic_replies_hint":"不明な送信者がグループトピックに返信できるようにします。これが有効になっていない場合、トピックに招待されていないメールアドレスからの返信があった場合は、新しいトピックを作成します。"},"mailboxes":{"synchronized":"同期メールボックス","none_found":"このメールアカウントにはメールボックスが見つかりませんでした。","disabled":"無効"}},"membership":{"title":"メンバーシップ","access":"アクセス"},"categories":{"title":"カテゴリ","long_title":"カテゴリのデフォルト通知","description":"ユーザーがこのグループに追加されると、ユーザーのカテゴリ通知設定はこれらのデフォルトに設定されます。ユーザーは後でその設定を変更することができます。","watched_categories_instructions":"カテゴリ内のすべてのトピックを自動的にウォッチします。グループのメンバーにすべての新しい投稿とトピックが通知され、トピックの隣に新しい投稿の件数が表示されます。","tracked_categories_instructions":"カテゴリ内のすべてのトピックを自動的に追跡します。トピックの隣に新しい投稿の件数が表示されます。","watching_first_post_categories_instructions":"これらのカテゴリの新規トピックに最初の投稿があった場合、それがユーザーに通知されます。","regular_categories_instructions":"これらのカテゴリがミュートされている場合、グループメンバーのミュートは解除されます。ユーザーがメンションされたり、誰かが返信したりすると、ユーザーに通知されます。","muted_categories_instructions":"これらのカテゴリの新しいトピックに関する通知はユーザーに送信されません。また、カテゴリや最新のトピックページにも表示されません。"},"tags":{"title":"タグ","long_title":"タグのデフォルト通知","description":"ユーザーがこのグループに追加されると、そのユーザーのタグ通知設定はこれらのデフォルトに設定されます。ユーザーは後でその設定を変更することができます。","watched_tags_instructions":"これらのタグが付いたすべてのトピックを自動的にウォッチします。グループのメンバーにすべての新しい投稿とトピックが通知され、トピックの隣に新しい投稿の件数が表示されます。","tracked_tags_instructions":"これらのタグが付いたすべてのトピックを自動的に追跡します。トピックの横に新しい投稿の件数が表示されます。","watching_first_post_tags_instructions":"これらのタグが付いた新しいトピック内の最初の投稿が通知されます。","regular_tags_instructions":"これらのタグがミュートされている場合、グループメンバーにはミュートが解除されます。ユーザーがメンションされたり、誰かが返信したりすると、ユーザーに通知されます。","muted_tags_instructions":"これらのタグが付いている新規トピックについては、ユーザーには何も通知されず、最新情報には表示されません。"},"logs":{"title":"ログ","when":"日時","action":"操作","acting_user":"代理ユーザー","target_user":"対象ユーザー","subject":"件名","details":"詳細","from":"開始","to":"終了"}},"permissions":{"title":"権限","none":"このグループに関連付けられているカテゴリはありません。","description":"このグループのメンバーはこれらのカテゴリにアクセスできます"},"public_admission":"ユーザーがグループに自由に参加することを許可する (一般公開グループである必要があります)","public_exit":"ユーザーがグループから自由に退出することを許可する","empty":{"posts":"このグループのメンバーによる投稿はありません。","members":"このグループにはメンバーがいません。","requests":"このグループへのメンバーシップリクエストはありません。","mentions":"このグループのメンションはありません。","messages":"このグループのメッセージはありません。","topics":"このグループのメンバーによるトピックはありません。","logs":"このグループに関するログはありません。"},"add":"追加","join":"参加","leave":"退出","request":"リクエスト","message":"メッセージ","confirm_leave":"このグループから退出してもよろしいですか？","allow_membership_requests":"ユーザーがグループのオーナーにメンバーシップリクエストを送信することを許可する (一般公開グループである必要があります)","membership_request_template":"メンバーシップリクエスト送信時にユーザーに表示するカスタムテンプレート","membership_request":{"submit":"リクエストを送信","title":"@%{group_name} への参加をリクエストする","reason":"グループに属する理由をグループオーナーに知らせる"},"membership":"メンバーシップ","name":"名前","group_name":"グループ名","user_count":"ユーザー","bio":"グループについて","selector_placeholder":"ユーザー名を入力","owner":"オーナー","index":{"title":"グループ","all":"すべてのグループ","empty":"公開グループはありません。","filter":"グループのタイプでフィルタ","owner_groups":"自分が所有するグループ","close_groups":"クローズされたグループ","automatic_groups":"自動作成グループ","automatic":"自動","closed":"クローズ","public":"公開","private":"非公開","public_groups":"公開グループ","my_groups":"自分のグループ","group_type":"グループのタイプ","is_group_user":"メンバー","is_group_owner":"オーナー"},"title":{"other":"グループ"},"activity":"アクティビティ","members":{"title":"メンバー","filter_placeholder_admin":"ユーザー名またはメール","filter_placeholder":"ユーザー名","remove_member":"メンバーを削除","remove_member_description":"このグループから \u003cb\u003e%{username}\u003c/b\u003e を削除する","make_owner":"オーナーにする","make_owner_description":"\u003cb\u003e%{username}\u003c/b\u003e をこのグループのオーナーにする","remove_owner":"オーナーから削除","remove_owner_description":"\u003cb\u003e%{username}\u003c/b\u003e をこのグループのオーナーから削除する","make_primary":"プライマリーにする","make_primary_description":"これを \u003cb\u003e%{username}\u003c/b\u003e のプライマリーグループにします","remove_primary":"プライマリーとして削除","remove_primary_description":"これを \u003cb\u003e%{username}\u003c/b\u003e のプライマリーグループとして削除します","remove_members":"メンバーを削除","remove_members_description":"選択したユーザーをこのグループから削除する","make_owners":"オーナーにする","make_owners_description":"選択したユーザーをこのグループのオーナーにする","remove_owners":"オーナーを削除","remove_owners_description":"このグループのオーナーとして、選択したユーザーを削除する","make_all_primary":"すべてをプライマリーにする","make_all_primary_description":"これを選択したすべてのユーザーのプライマリーグループにします","remove_all_primary":"プライマリーとして削除","remove_all_primary_description":"このグループをプライマリーとして削除します","owner":"オーナー","primary":"プライマリー","forbidden":"メンバーの表示は許可されていません。"},"topics":"トピック","posts":"投稿","mentions":"メンション","messages":"メッセージ","notification_level":"グループメッセージのデフォルト通知レベル","alias_levels":{"mentionable":"誰がこのグループに @メンションを送れますか?","messageable":"誰がこのグループにメッセージを送れますか?","nobody":"なし","only_admins":"管理者のみ","mods_and_admins":"モデレーターと管理者のみ","members_mods_and_admins":"グループメンバー、モデレーター、管理者のみ","owners_mods_and_admins":"グループオーナー、モデレーター、管理者のみ","everyone":"全員"},"notifications":{"watching":{"title":"ウォッチ中","description":"すべてのメッセージの新規投稿について通知があり、新しい返信の件数が表示されます。"},"watching_first_post":{"title":"最初の投稿をウォッチ中","description":"このグループの新規メッセージは通知されますが、メッセージへの返信は通知されません。"},"tracking":{"title":"追跡中","description":"誰かが @ユーザー名であなたをメンションするか返信すると通知され、新しい返信の件数が表示されます。"},"regular":{"title":"通常","description":"誰かが @ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。"},"muted":{"title":"ミュート","description":"このグループのすべてのメッセージは通知されません。"}},"flair_url":"アバター画像","flair_upload_description":"20 px x 20 px 以上の正方形の画像を使用してください。","flair_bg_color":"アバターの背景色","flair_bg_color_placeholder":"(オプション) 16 進カラー値","flair_color":"アバターの色","flair_color_placeholder":"(オプション) 16 進カラー値","flair_preview_icon":"アイコンのプレビュー","flair_preview_image":"画像のプレビュー","flair_type":{"icon":"アイコンを選択する","image":"画像をアップロードする"},"default_notifications":{"modal_title":"ユーザーのデフォルト通知","modal_description":"この変更を過去に適用しますか？これにより、既存の %{count} 人のユーザーの設定が変更されます。","modal_yes":"はい","modal_no":"いいえ。今後のみに変更を適用する"}},"user_action_groups":{"1":"「いいね！」した数","2":"「いいね！」された数","3":"ブックマーク","4":"トピック","5":"返信","6":"回答","7":"メンション","9":"引用","11":"編集","12":"送信済み項目","13":"受信トレイ","14":"保留中","15":"下書き"},"categories":{"all":"すべてのカテゴリ","all_subcategories":"すべて","no_subcategory":"なし","category":"カテゴリ","category_list":"カテゴリリストを表示","reorder":{"title":"カテゴリの並べ替え","title_long":"カテゴリリストを並べ変える","save":"順番を保存","apply_all":"適用","position":"位置"},"posts":"投稿","topics":"トピック","latest":"最新","subcategories":"サブカテゴリ","muted":"ミュートされたカテゴリ","topic_sentence":{"other":"%{count}トピック"},"topic_stat":{"other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"週","month":"月"},"topic_stat_all_time":{"other":"全 %{number} 件"},"topic_stat_sentence_week":{"other":"先週、新しいトピックが %{count} 件投稿されました。"},"topic_stat_sentence_month":{"other":"先月、新しいトピックが %{count} 件投稿されました。"},"n_more":"カテゴリ (その他 %{count} 個)..."},"ip_lookup":{"title":"IP アドレスを検索","hostname":"ホスト名","location":"場所","location_not_found":"(不明)","organisation":"組織","phone":"電話","other_accounts":"同じ IP アドレスを持つほかのアカウント:","delete_other_accounts":"%{count} 件削除","username":"ユーザー名","trust_level":"信頼レベル","read_time":"閲覧時間","topics_entered":"閲覧したトピック","post_count":"投稿数","confirm_delete_other_accounts":"これらのアカウントを削除してもよろしいですか?","powered_by":"\u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e を使用する","copied":"コピーしました"},"user_fields":{"none":"(オプションを選択)","required":"\"%{name}\" の値を入力してください"},"user":{"said":"%{username}:","profile":"プロフィール","mute":"ミュート","edit":"プロフィールを編集","download_archive":{"button_text":"すべてダウンロード","confirm":"投稿をダウンロードしてもよろしいですか？","success":"ダウンロードが始まりました。処理が完了するとメッセージで通知されます。","rate_limit_error":"投稿のダウンロードは 1 日に 1 回のみ可能です。明日再度お試しください。"},"new_private_message":"新規メッセージ","private_message":"メッセージ","private_messages":"メッセージ","user_notifications":{"filters":{"filter_by":"フィルタ基準:","all":"すべて","read":"既読","unread":"未読"},"ignore_duration_title":"ユーザーを無視","ignore_duration_username":"ユーザー名","ignore_duration_when":"期間:","ignore_duration_save":"無視する","ignore_duration_note":"無視の期間が過ぎると、無視したすべての項目は自動的に削除されることに注意してください。","ignore_duration_time_frame_required":"時間枠を選択してください","ignore_no_users":"無視されたユーザーはいません。","ignore_option":"無視","ignore_option_title":"このユーザーに関連する通知は送信されません。またこのユーザーのすべてのトピックと返信は非表示になります。","add_ignored_user":"追加...","mute_option":"ミュート","mute_option_title":"このユーザーに関連する通知は送信されません。","normal_option":"通常","normal_option_title":"このユーザーがあなたに返信したり、引用したり、メンションすると通知されます。"},"notification_schedule":{"title":"通知スケジュール","label":"カスタム通知スケジュールを有効にする","tip":"これらの時間外は、自動的に「おやすみモード」に設定されます。","midnight":"深夜","none":"なし","monday":"月曜日","tuesday":"火曜日","wednesday":"水曜日","thursday":"木曜日","friday":"金曜日","saturday":"土曜日","sunday":"日曜日","to":"終了:"},"activity_stream":"アクティビティ","read":"既読","read_help":"最近読んだトピック","preferences":"設定","feature_topic_on_profile":{"open_search":"新規トピックを選択","title":"トピックを選択","search_label":"タイトルでトピックを検索","save":"保存","clear":{"title":"クリア","warning":"注目のトピックをクリアしてもよろしいですか？"}},"use_current_timezone":"現在のタイムゾーンを使用","profile_hidden":"このユーザーの公開プロフィールは非公開です。","expand_profile":"展開","collapse_profile":"折りたたむ","bookmarks":"ブックマーク","bio":"自己紹介","timezone":"タイムゾーン","invited_by":"招待した人:","trust_level":"信頼レベル","notifications":"通知","statistics":"統計","desktop_notifications":{"label":"ライブ通知","not_supported":"このブラウザでは通知がサポートされていません。","perm_default":"通知を有効にする","perm_denied_btn":"アクセス拒否","perm_denied_expl":"通知へのアクセスが拒否されました。ブラウザの設定から通知を許可してください。","disable":"通知を無効にする","enable":"通知を有効にする","each_browser_note":"注意: 使用するすべてのブラウザでこの設定を変更する必要があります。「おやすみモード」では、この設定に関係なくすべての通知が無効になります。","consent_prompt":"あなたの投稿に返信があったときライブ通知しますか？"},"dismiss":"閉じる","dismiss_notifications":"すべて閉じる","dismiss_notifications_tooltip":"すべての未読の通知を既読にします","no_messages_title":"メッセージはありません","no_messages_body":"通常の会話の外で、誰かと直接個人的に話す必要がありますか？相手のアバターを選択して、%{icon} メッセージボタンを使うと、その人にメッセージを送信できます。\u003cbr\u003e\u003cbr\u003e ヘルプが必要な場合は、\u003ca href='%{aboutUrl}'\u003eスタッフメンバーにメッセージを送信\u003c/a\u003eしてください。\n","no_bookmarks_title":"まだ何もブックマークしていません","no_bookmarks_body":"%{icon} ボタンを使って投稿をブックマークしましょう。すぐに参照できるように、ここに一覧表示されます。リマインダーもスケジュール設定可能です！\n","no_bookmarks_search":"指定された検索クエリでブックマークは見つかりませんでした。","no_notifications_title":"まだ通知はありません","no_notifications_body":"あなたのトピックや投稿に対する返信があったとき、誰かがあなたを \u003cb\u003e@メンション\u003c/b\u003eまたは引用したとき、あなたがウォッチ中のトピックに返信があったときなど、あなたに直接関連するアクティビティはこのパネルで通知されます。あなたがしばらくログインしていない場合は、メールにも通知が送信されます。\u003cbr\u003e\u003cbr\u003e%{icon} を探して、どの特定のトピック、カテゴリ、およびタグについて通知するかを決めましょう。詳細については、\u003ca href='%{preferencesUrl}'\u003e通知の設定\u003c/a\u003eをご覧ください。\n","no_notifications_page_title":"まだ通知はありません","first_notification":"最初の通知です！選択して開始してください。","dynamic_favicon":"ブラウザのアイコンに件数を表示する","skip_new_user_tips":{"description":"新規ユーザー向けオンボーディングのヒントとバッジをスキップする","not_first_time":"初めてのご利用ではありませんか？","skip_link":"これらのヒントをスキップ","read_later":"後で読む。"},"theme_default_on_all_devices":"これをすべてのデバイスのデフォルトのテーマにする","color_scheme_default_on_all_devices":"デフォルトの色スキームをすべてのデバイスに設定する","color_scheme":"色スキーム","color_schemes":{"default_description":"デフォルトのテーマ","disable_dark_scheme":"通常と同じ","dark_instructions":"デバイスをダークモードに切り替えると、ダークモードの色スキームをプレビューできます。","undo":"リセット","regular":"通常","dark":"ダークモード","default_dark_scheme":"(サイトのデフォルト)"},"dark_mode":"ダークモード","dark_mode_enable":"ダークモードの色スキームを自動的に有効にする","text_size_default_on_all_devices":"これをすべてのデバイスのデフォルトのテキストサイズにする","allow_private_messages":"ほかのユーザーが私に個人メッセージを送信することを許可する","external_links_in_new_tab":"すべての外部リンクを新しいタブで開く","enable_quoting":"選択したテキストを引用して返信する","enable_defer":"トピックを未読にマークして延期を有効にする","change":"変更","featured_topic":"注目のトピック","moderator":"%{user} はモデレーターです","admin":"%{user} は管理者です","moderator_tooltip":"このユーザーはモデレーターです","admin_tooltip":"このユーザーは管理者です","silenced_tooltip":"このユーザーは投稿を禁止されています","suspended_notice":"このユーザーは %{date} まで凍結されています。","suspended_permanently":"このユーザーは凍結されています。","suspended_reason":"理由: ","github_profile":"GitHub","email_activity_summary":"アクティビティの概要","mailing_list_mode":{"label":"メーリングリストモード","enabled":"メーリングリストモードを有効にする","instructions":"この設定は、アクティビティの概要を無効化します。\u003cbr /\u003e\nミュートしているトピックやカテゴリはこれらのメールには含まれません。\n","individual":"新しい投稿があるたびにメールで送る","individual_no_echo":"自分以外の新しい投稿があるたびにメールで送る","many_per_day":"新しい投稿があるたびにメールを受け取る (1 日 %{dailyEmailEstimate} 回程度)","few_per_day":"新しい投稿があるたびにメールを受け取る (1 日 2 回程度)","warning":"メーリングリストモードです。メール通知設定が無効になります。"},"tag_settings":"タグ","watched_tags":"ウォッチ中","watched_tags_instructions":"これらのタグが付いたすべてのトピックを自動的にウォッチします。すべての新しい投稿とトピックが通知され、トピックの隣に新しい投稿の件数が表示されます。","tracked_tags":"追跡中","tracked_tags_instructions":"これらのタグが付いたすべてのトピックを自動的に追跡します。トピックの横に新しい投稿の件数が表示されます。","muted_tags":"ミュート","muted_tags_instructions":"これらのカテゴリの新規トピックについては通知されず、最新にも表示されません。","watched_categories":"ウォッチ中","watched_categories_instructions":"これらのカテゴリ内のすべてのトピックを自動的にウォッチします。すべての新しい投稿とトピックが通知され、トピックの隣に新しい投稿の件数が表示されます。","tracked_categories":"追跡中","tracked_categories_instructions":"これらのカテゴリ内のすべてのトピックを自動的に追跡します。トピックの隣に新しい投稿の件数が表示されます。","watched_first_post_categories":"最初の投稿をウォッチ中","watched_first_post_categories_instructions":"これらのカテゴリの新規トピックに最初の投稿があった場合、通知されます。","watched_first_post_tags":"最初の投稿をウォッチ中","watched_first_post_tags_instructions":"これらのタグが付いた新しいトピック内の最初の投稿が通知されます。","muted_categories":"ミュート","muted_categories_instructions":"これらのカテゴリの新しいトピックに関する通知はユーザーに送信されません。また、カテゴリや最新のページにも表示されません。","muted_categories_instructions_dont_hide":"これらのカテゴリの新しいトピックに関する通知は送信されません。","regular_categories":"レギュラー","regular_categories_instructions":"これらのカテゴリは「最新」と「人気」のトピックリストに表示されます。","no_category_access":"カテゴリへのアクセスはモデレーターとして制限されているため、保存できません。","delete_account":"アカウントを削除","delete_account_confirm":"アカウントを永久に削除してもよろしいですか？この操作は元に戻せません！","deleted_yourself":"あなたのアカウントは正常に削除されました。","delete_yourself_not_allowed":"アカウントの削除を希望する場合は、スタッフメンバーに連絡をしてください。","unread_message_count":"メッセージ","admin_delete":"削除","users":"ユーザー","muted_users":"ミュート","muted_users_instructions":"これらのユーザーからのすべての通知と PM を抑制します。","allowed_pm_users":"許可","allowed_pm_users_instructions":"これらのユーザーからの PM のみを許可します。","allow_private_messages_from_specific_users":"特定のユーザーのみが私に個人メッセージを送信することを許可する","ignored_users":"無視","ignored_users_instructions":"これらのユーザーからのすべての投稿、通知、および PM を抑制します。","tracked_topics_link":"表示","automatically_unpin_topics":"最後に到達したら、自動的にトピックの固定表示を解除する。","apps":"アプリ連携","revoke_access":"アクセスを取り消す","undo_revoke_access":"アクセスの取り消しを元に戻す","api_approved":"承認:","api_last_used_at":"最終使用時間:","theme":"テーマ","save_to_change_theme":"「%{save_text}」をクリックするとテーマが更新されます","home":"デフォルトのホームページ","staged":"ステージング","staff_counters":{"flags_given":"役に立った通報","flagged_posts":"通報された投稿","deleted_posts":"削除された投稿","suspensions":"凍結","warnings_received":"警告","rejected_posts":"拒否された投稿"},"messages":{"inbox":"受信トレイ","latest":"最新","sent":"送信済み","unread":"未読","unread_with_count":{"other":"未読 (%{count})"},"new":"新規","new_with_count":{"other":"新規 (%{count})"},"archive":"アーカイブ","groups":"自分のグループ","move_to_inbox":"受信トレイに移動","move_to_archive":"アーカイブ","failed_to_move":"選択されたメッセージを移動できませんでした (ネットワークがダウンしている可能性があります)","tags":"タグ","warnings":"運営スタッフからの警告"},"preferences_nav":{"account":"アカウント","security":"セキュリティ","profile":"プロフィール","emails":"メール","notifications":"通知","categories":"カテゴリ","users":"ユーザー","tags":"タグ","interface":"表示設定","apps":"アプリ連携"},"change_password":{"success":"(メール送信済み)","in_progress":"(メール送信中)","error":"(エラー)","emoji":"絵文字をロックする","action":"パスワードのリセットメールを送信","set_password":"パスワードを設定","choose_new":"新しいパスワードを選択する","choose":"パスワードを選択する"},"second_factor_backup":{"title":"二要素認証のバックアップコード","regenerate":"再生成","disable":"無効化","enable":"有効化","enable_long":"バックアップコードを有効にする","manage":{"other":"バックアップコードを管理してください。 \u003cstrong\u003e%{count}\u003c/strong\u003e 個のバックアップコードが残っています。"},"copy_to_clipboard":"クリップボードにコピー","copy_to_clipboard_error":"データをクリップボードにコピーする際にエラーが発生しました","copied_to_clipboard":"クリップボードにコピーしました","download_backup_codes":"バックアップコードをダウンロードする","remaining_codes":{"other":"\u003cstrong\u003e%{count}\u003c/strong\u003e 個のバックアップコードが残っています。"},"use":"バックアップコードを使用する","enable_prerequisites":"バックアップコードを生成する前に、最初の二要素認証を有効にする必要があります。","codes":{"title":"バックアップコードが生成されました","description":"これらのバックアップコードはそれぞれ 1 回しか使用できません。アクセス可能な安全な場所に保管してください。"}},"second_factor":{"title":"二要素認証","enable":"二要素認証を管理","disable_all":"すべて無効化","forgot_password":"パスワードを忘れましたか？","confirm_password_description":"続行するにはパスワードを確認してください","name":"名前","label":"コード","rate_limit":"別の認証コードを試す前に、しばらくお待ちください。","enable_description":"サポートされているアプリ (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) でこの QR コードをスキャンし、認証コードを入力します。\n","disable_description":"アプリから認証コードを入力してください","show_key_description":"手動で入力する","short_description":"1 回限りのセキュリティコードでアカウントを保護します。\n","extended_description":"二要素認証は、パスワードに加えてワンタイムトークンを必要とすることで、アカウントにさらにセキュリティを追加します。トークンは \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e および \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e デバイスで生成できます。\n","oauth_enabled_warning":"アカウントで二要素認証が有効になると、ソーシャルログインは無効になります。","use":"認証アプリを使用する","enforced_notice":"このサイトにアクセスするには二要素認証を有効にする必要があります。","disable":"無効化","disable_confirm":"すべての二要素認証を無効にしてもよろしいですか？","save":"保存","edit":"編集","edit_title":"認証アプリの編集","edit_description":"認証アプリ名","enable_security_key_description":"\u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003eハードウェアセキュリティキー\u003c/a\u003eを準備したら、下の [登録] ボタンを押します。\n","totp":{"title":"トークンベースの認証アプリ","add":"認証アプリを追加","default_name":"自分の認証アプリ","name_and_code_required_error":"認証アプリから名前とコードを入力する必要があります。"},"security_key":{"register":"登録","title":"セキュリティキー","add":"セキュリティキーを追加","default_name":"メインセキュリティキー","not_allowed_error":"セキュリティキーの登録プロセスがタイムアウトしたかキャンセルされました。","already_added_error":"このセキュリティキーはすでに登録されています。再度登録する必要はありません。","edit":"セキュリティキーを編集","save":"保存","edit_description":"セキュリティキー名","name_required_error":"セキュリティキーの名前を入力する必要があります。"}},"change_about":{"title":"自己紹介を変更","error":"この値を変更中にエラーが発生しました。"},"change_username":{"title":"ユーザー名を変更","confirm":"ユーザー名を変更してもよろしいですか？","taken":"このユーザー名は既に使われています。","invalid":"このユーザー名は無効です。英数字のみを使用できます"},"add_email":{"title":"メールアドレスを追加","add":"追加"},"change_email":{"title":"メールアドレスを変更","taken":"このメールアドレスを使用できません。","error":"メールアドレスを変更中にエラーが発生しました。このアドレスは既に使用されている可能性があります。","success":"このアドレスにメールを送信しました。確認手順に従ってください。","success_via_admin":"このアドレスにメールを送信しました。ユーザーはメールに記載の確認手順に従う必要があります。","success_staff":"現在のメールアドレスにメールを送信しました。確認手順に従ってください。"},"change_avatar":{"title":"プロフィール画像を変更する","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e 取得場所:","gravatar_title":"%{gravatarName} のウェブサイトでアバターを変更する","gravatar_failed":"このメールアドレスの %{gravatarName} は見つかりませんでした。","refresh_gravatar_title":"%{gravatarName} を更新","letter_based":"システムプロフィール画像","uploaded_avatar":"カスタム画像","uploaded_avatar_empty":"カスタム画像を追加する","upload_title":"写真をアップロードする","image_is_not_a_square":"警告: 幅と高さが等しくないため、画像をトリミングしました。","logo_small":"サイトの小さなロゴ。デフォルトで使用されます。"},"change_profile_background":{"title":"プロフィールヘッダー","instructions":"プロフィールヘッダーは中央揃えで、デフォルトの幅は 1110 px です。"},"change_card_background":{"title":"ユーザーカードの背景","instructions":"背景画像は中央揃えで、デフォルトの幅は 590 px です。"},"change_featured_topic":{"title":"注目のトピック","instructions":"このトピックへのリンクは、あなたのユーザーカードとプロフィールに表示されます。"},"email":{"title":"メールアドレス","primary":"プライマリーメールアドレス","secondary":"セカンダリメールアドレス","primary_label":"プライマリー","unconfirmed_label":"未確認","resend_label":"確認メールを再送信する","resending_label":"送信中...","resent_label":"メールを送信しました","update_email":"メールアドレスを変更","set_primary":"プライマリーメールアドレスを設定","destroy":"メールアドレスを削除","add_email":"代替メールアドレスを追加","auth_override_instructions":"メールアドレスは認証プロバイダーから更新できます。","no_secondary":"セカンダリメールアドレスはありません","instructions":"絶対に公開されません。","admin_note":"注意: 管理者ユーザーが別の非管理者ユーザーのメールを変更すると、そのユーザーは元のメールアカウントにアクセスできなくなるため、パスワードのリセットメールが新しいアドレスに送信されます。ユーザーのメールアドレスは、パスワードのリセットプロセスが完了するまで変更されません。","ok":"確認のためにメールを送信します","required":"メールアドレスを入力してください","invalid":"正しいメールアドレスを入力してください","authenticated":"あなたのメールアドレスは %{provider} によって認証されました","invite_auth_email_invalid":"あなたの招待メールは %{provider} が認証したメールと一致しません","authenticated_by_invite":"あなたのメールは招待によって認証されました","frequency_immediately":"メールの内容をまだ読んでいない場合は、今すぐメールを送信します。","frequency":{"other":"最後のアクセスから %{count} 分以上アクセスがない場合にのみメールを送信します。"}},"associated_accounts":{"title":"リンクされているアカウント","connect":"接続","revoke":"取り消す","cancel":"キャンセル","not_connected":"(未接続)","confirm_modal_title":"%{provider} アカウントを接続","confirm_description":{"account_specific":"あなたの %{provider} アカウント '%{account_description}' が認証に使用されます。","generic":"あなたの %{provider} アカウントが認証に使用されます。"}},"name":{"title":"名前","instructions":"氏名 (オプション)","instructions_required":"氏名","required":"名前を入力してください","too_short":"名前が短かすぎます","ok":"その名前で良さそうです"},"username":{"title":"ユーザー名","instructions":"一意の短い名前、スペースの使用不可","short_instructions":"@%{username} であなたをメンションできます","available":"ユーザー名を使用できます","not_available":"利用できません。%{suggestion}を試しますか？","not_available_no_suggestion":"使用できません","too_short":"ユーザー名が短すぎます","too_long":"ユーザー名が長すぎます","checking":"ユーザー名を使用できるか確認しています...","prefilled":"メールアドレスはこの登録ユーザー名に一致しています","required":"ユーザー名を入力してください","edit":"ユーザー名を編集"},"locale":{"title":"インターフェースの言語","instructions":"ユーザーインターフェースの言語です。ページを更新すると変更されます。","default":"(デフォルト)","any":"すべて"},"password_confirmation":{"title":"パスワードを再入力"},"invite_code":{"title":"招待コード","instructions":"アカウント登録には招待コードが必要です"},"auth_tokens":{"title":"最近使用したデバイス","details":"詳細","log_out_all":"すべてログアウトする","not_you":"あなたではありませんか？","show_all":"すべて表示 (%{count})","show_few":"表示を減らす","was_this_you":"これはあなたですか？","was_this_you_description":"あなたではない場合は、パスワードを変更しログアウトすることをお勧めします。","browser_and_device":"%{device} の %{browser}","secure_account":"アカウントの保護","latest_post":"最後の投稿…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003e現在アクティブ\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"最後の投稿","last_seen":"アクセス","created":"参加日","log_out":"ログアウト","location":"場所","website":"ウェブサイト","email_settings":"メール","hide_profile_and_presence":"公開プロフィールとプレゼンス機能を非表示にする","enable_physical_keyboard":"iPad で物理キーボードのサポートを有効にする","text_size":{"title":"テキストサイズ","smallest":"最小","smaller":"小","normal":"標準","larger":"大","largest":"最大"},"title_count_mode":{"title":"バックグラウンドのページのタイトルに表示する件数:","notifications":"新しい通知","contextual":"新しいページのコンテンツ"},"like_notification_frequency":{"title":"「いいね！」された時に通知する","always":"常時","first_time_and_daily":"投稿の最初の「いいね！」と毎日","first_time":"投稿の最初の「いいね！」","never":"通知しない"},"email_previous_replies":{"title":"メールの下部に前の返信を含める","unless_emailed":"最初だけ","always":"常に含める","never":"含めない"},"email_digests":{"title":"ここを訪れない場合、人気のトピックと返信の要約をメールで送信する","every_30_minutes":"30 分毎","every_hour":"1 時間毎","daily":"毎日","weekly":"毎週","every_month":"毎月","every_six_months":"6 か月毎"},"email_level":{"title":"誰かが自分の投稿を引用またはそれに返信したとき、@ユーザー名で自分をメンションしたとき、または自分をトピックに招待したときにメールでその通知を受け取る","always":"常時","only_when_away":"離れている時のみ","never":"通知しない"},"email_messages_level":"メッセージを受け取ったときにメールで通知を受け取る","include_tl0_in_digests":"要約メールに新規ユーザーのコンテンツを含める","email_in_reply_to":"メールに投稿への返信の抜粋を含める","other_settings":"その他","categories_settings":"カテゴリ","new_topic_duration":{"label":"以下の場合、トピックを新規と見なす","not_viewed":"未読のもの","last_here":"ログアウトした後に投稿されたもの","after_1_day":"前日以降に投稿されたもの","after_2_days":"2 日以内に投稿されたもの","after_1_week":"先週以内に投稿されたもの","after_2_weeks":"2 週間以内に投稿されたもの"},"auto_track_topics":"閲覧したトピックを自動的に追跡する","auto_track_options":{"never":"追跡しない","immediately":"すぐに","after_30_seconds":"30 秒後","after_1_minute":"1 分後","after_2_minutes":"2 分後","after_3_minutes":"3 分後","after_4_minutes":"4 分後","after_5_minutes":"5 分後","after_10_minutes":"10 分後"},"notification_level_when_replying":"トピックに投稿するときは、トピックを次に設定する","invited":{"title":"招待","pending_tab":"保留中","pending_tab_with_count":"保留中 (%{count})","expired_tab":"期限切れ","expired_tab_with_count":"期限切れ (%{count})","redeemed_tab":"承諾済み","redeemed_tab_with_count":"承諾済み (%{count})","invited_via":"招待","invited_via_link":"リンク %{key} (%{count}/%{max} 引き換え済み)","groups":"グループ","topic":"トピック","sent":"作成日/最終送信日","expires_at":"有効期限","edit":"編集","remove":"削除","copy_link":"リンクを取得","reinvite":"メールを再送信","reinvited":"再度招待しました","removed":"削除","search":"招待履歴を検索","user":"招待したユーザー","none":"表示する招待はありません。","truncated":{"other":"最初の %{count} 件の招待を表示しています。"},"redeemed":"承諾済みの招待","redeemed_at":"承諾済み","pending":"保留中の招待","topics_entered":"閲覧したトピック数","posts_read_count":"既読の投稿数","expired":"この招待は期限切れになりました。","remove_all":"期限切れの招待を削除","removed_all":"期限切れの招待はすべて削除されました！","remove_all_confirm":"期限切れの招待をすべて削除してもよろしいですか？","reinvite_all":"すべての招待を再送信","reinvite_all_confirm":"すべての招待を再送してもよろしいですか？","reinvited_all":"すべての招待が送信されました！","time_read":"閲覧時間","days_visited":"アクセス日数","account_age_days":"アカウント有効日数","create":"招待","generate_link":"招待リンクを作成","link_generated":"こちらが招待リンクです！","valid_for":"招待リンクは次のメールアドレスのみで有効です: %{email}","single_user":"メールで招待","multiple_user":"リンクで招待","invite_link":{"title":"招待リンク","success":"招待リンクが生成されました！","error":"招待リンクの生成中にエラーが発生しました","max_redemptions_allowed_label":"このリンクを使用して登録できるのは何人ですか？","expires_at":"この招待リンクはいつまで有効ですか？"},"invite":{"new_title":"招待の作成","edit_title":"招待の編集","instructions":"このサイトへのアクセスと即時に許可するにはこのリンクを共有します","copy_link":"リンクをコピー","expires_in_time":"%{time} で期限切れ","expired_at_time":"%{time} に期限切れ","show_advanced":"高度なオプションを表示","hide_advanced":"高度なオプションを非表示","restrict_email":"1 つのメールアドレスに制限","max_redemptions_allowed":"最大使用回数","add_to_groups":"グループに追加","invite_to_topic":"このトピックに到着","expires_at":"有効期限","custom_message":"オプションの個人メッセージ","send_invite_email":"保存してメールを送信","save_invite":"招待を保存","invite_saved":"招待は保存されました。","invite_copied":"招待リンクがコピーされました。"},"bulk_invite":{"none":"このページに表示する招待はありません。","text":"一括招待","instructions":"\u003cp\u003eコミュニティをすばやく拡大するには、ユーザーのリストを招待します。招待するユーザーのメールアドレスごとに少なくとも 1 行を含む \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003eCSV ファイル\u003c/a\u003eを準備してください。カンマ区切りの情報は、グループに人を追加したい場合、またはそれらのユーザーが初めてサインインしたときに特定のトピックに移動させる場合に利用できます。\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eアップロードされる CSV ファイルに含まれるメールアドレスに招待が送られ、後で管理することができます。\u003c/p\u003e\n","progress":"%{progress}% アップロード済み...","success":"ファイルは正常にアップロードされました。処理が完了すると、メッセージで通知されます。","error":"ファイルは CSV 形式である必要があります。"}},"password":{"title":"パスワード","too_short":"パスワードが短すぎます。","common":"このパスワードは非常に一般的です。","same_as_username":"パスワードとユーザー名が同じです。","same_as_email":"パスワードとメールアドレスが同じです。","ok":"そのパスワードで良さそうです。","instructions":"%{count} 文字以上","required":"パスワードを入力してください"},"summary":{"title":"要約","stats":"統計","time_read":"閲覧時間","recent_time_read":"最近の閲覧時間","topic_count":{"other":"作成したトピック数"},"post_count":{"other":"作成した投稿数"},"likes_given":{"other":"「いいね！」した数"},"likes_received":{"other":"「いいね！」された数"},"days_visited":{"other":"アクセス日数"},"topics_entered":{"other":"閲覧したトピック数"},"posts_read":{"other":"既読の投稿数"},"bookmark_count":{"other":"ブックマーク数"},"top_replies":"人気の返信","no_replies":"まだ返信はありません。","more_replies":"その他の返信","top_topics":"人気のトピック","no_topics":"まだトピックはありません。","more_topics":"その他のトピック","top_badges":"人気のバッジ","no_badges":"まだバッジはありません。","more_badges":"その他のバッジ","top_links":"人気のリンク","no_links":"まだリンクはありません。","most_liked_by":"最も「いいね！」したユーザー","most_liked_users":"最も「いいね！」されたユーザー","most_replied_to_users":"最も多く返信したユーザー","no_likes":"まだ「いいね！」はありません。","top_categories":"人気のカテゴリ","topics":"トピック","replies":"返信"},"ip_address":{"title":"最後の IP アドレス"},"registration_ip_address":{"title":"登録時の IP アドレス"},"avatar":{"title":"プロフィール画像","header_title":"プロフィール、メッセージ、ブックマーク、設定","name_and_description":"%{name} - %{description}","edit":"プロフィール画像を編集"},"title":{"title":"タグライン","none":"(なし)","instructions":"ユーザー名の後に表示されます"},"flair":{"title":"フレア","none":"(なし)","instructions":"プロフィール写真の横に表示されるアイコン"},"primary_group":{"title":"プライマリーグループ","none":"(なし)"},"filters":{"all":"すべて"},"stream":{"posted_by":"投稿者","sent_by":"送信者","private_message":"メッセージ","the_topic":"トピック"}},"loading":"読み込み中...","errors":{"prev_page":"次の項目を読み込み中に発生しました:","reasons":{"network":"ネットワークエラー","server":"サーバーエラー","forbidden":"アクセス拒否","unknown":"エラー","not_found":"ページが見つかりません"},"desc":{"network":"インターネット接続を確認してください。","network_fixed":"ネットワーク接続が回復したようです。","server":"エラーコード : %{status}","forbidden":"閲覧する権限がありません。","not_found":"アプリケーションは存在しない URL を読み込もうとしました。","unknown":"エラーが発生しました。"},"buttons":{"back":"戻る","again":"やり直す","fixed":"ページを読み込む"}},"modal":{"close":"閉じる","dismiss_error":"エラーを閉じる"},"close":"閉じる","assets_changed_confirm":"このサイトのソフトウェアはたった今アップグレードされました。今すぐ最新バージョンを入手しますか？","logout":"ログアウトしました。","refresh":"更新","home":"ホーム","read_only_mode":{"enabled":"このサイトは閲覧専用モードになっています。閲覧し続けられますが、返信したり「いいね！」を付けるなどの操作は現在できません。","login_disabled":"閲覧専用モードのため、ログインできません。","logout_disabled":"閲覧専用モードのため、ログアウトできません。"},"logs_error_rate_notice":{},"learn_more":"もっと詳しく...","first_post":"最初の投稿","mute":"ミュート","unmute":"ミュート解除","last_post":"最終投稿","local_time":"現地時間","time_read":"既読","time_read_recently":"最近の閲覧時間 %{time_read}","time_read_tooltip":"合計閲覧時間 %{time_read}","time_read_recently_tooltip":"合計閲覧時間 %{time_read} (過去 60 日間: %{recent_time_read})","last_reply_lowercase":"最後の返信","replies_lowercase":{"other":"返信"},"signup_cta":{"sign_up":"アカウントを登録","hide_session":"明日リマインダーを通知する","hide_forever":"いいえ、結構です","hidden_for_session":"了解です。明日お尋ねします。'ログイン' からでもアカウントを作成できます。","intro":"こんにちは！ ディスカッションを楽しんでいるようですね。ですが、アカウント登録はまだのようです。","value_prop":"アカウントを作成した後、今読んでいるページへ戻ります。また、新しい投稿があった場合はそのことをメールでお知らせします。 「いいね！」を使って気に入った投稿をみんなに教えましょう。:heartpulse:"},"summary":{"enabled_description":"このトピックの要約を閲覧しています。コミュニティが最も面白いとした投稿のまとめです。","description":{"other":"\u003cb\u003e%{count}\u003c/b\u003e 件の返信があります。"},"enable":"このトピックを要約する","disable":"すべての投稿を表示"},"deleted_filter":{"enabled_description":"削除された投稿は非表示になっています。","disabled_description":"削除された投稿は表示されています。","enable":"削除された投稿を非表示","disable":"削除された投稿を表示"},"private_message_info":{"title":"メッセージ","invite":"他の人を招待...","edit":"追加または削除...","remove":"削除...","add":"追加...","leave_message":"このメッセージを閉じてもよろしいですか？","remove_allowed_user":"このメッセージから %{name} を削除してもよろしいですか？","remove_allowed_group":"このメッセージから %{name} を削除してもよろしいですか？"},"email":"メール","username":"ユーザー名","last_seen":"アクセス","created":"作成","created_lowercase":"作成","trust_level":"信頼レベル","search_hint":"ユーザー名、メールアドレス、または IPアドレス","create_account":{"header_title":"ようこそ！","subheader_title":"アカウントを作成しましょう","disclaimer":"登録すると、\u003ca href='%{privacy_link}' target='blank'\u003eプライバシーポリシー\u003c/a\u003eと\u003ca href='%{tos_link}' target='blank'\u003e利用規約\u003c/a\u003eに同意することになります。","title":"アカウントの作成","failed":"エラーが発生しました。このメールアドレスは使用中かもしれません。「パスワードを忘れました」リンクを試してみてください"},"forgot_password":{"title":"パスワードをリセット","action":"パスワードを忘れました","invite":"ユーザー名またはメールアドレスを入力してください。パスワードのリセットメールを送信します。","reset":"パスワードをリセット","complete_username":"アカウントがユーザー名 \u003cb\u003e%{username}\u003c/b\u003e に一致する場合、まもなく、パスワードのリセット方法が記載されたメールが届きます。","complete_email":"アカウントと \u003cb\u003e%{email}\u003c/b\u003e が一致する場合、まもなく、パスワードのリセット方法が記載されたメールが届きます。","complete_username_found":"ユーザー名 \u003cb\u003e%{username}\u003c/b\u003e に一致するアカウントが見つかりました。まもなく、パスワードのリセット方法が記載されたメールが届きます。","complete_email_found":"\u003cb\u003e%{email}\u003c/b\u003e に一致するアカウントが見つかりました。まもなく、パスワードのリセット方法が記載されたメールが届きます。","complete_username_not_found":"ユーザー名 \u003cb\u003e%{username}\u003c/b\u003e に一致するアカウントはありません","complete_email_not_found":"\u003cb\u003e%{email}\u003c/b\u003e に一致するアカウントはありません","help":"メールが届きませんか？まずは迷惑メールフォルダを確認してください。\u003cp\u003e使用したメールアドレスがわかりませんか？メールアドレスを入力すると、存在するかどうかをお知らせします。\u003c/p\u003e\u003cp\u003eアカウントのメールアドレスにアクセスできなくなった場合は、\u003ca href='%{basePath}/about'\u003eスタッフ\u003c/a\u003eにご連絡ください。\u003c/p\u003e","button_ok":"OK","button_help":"ヘルプ"},"email_login":{"link_label":"ログインリンクをメールする","button_label":"メール","login_link":"パスワードをスキップします。ログインリンクを送信してください","emoji":"絵文字をロックする","complete_username":"アカウントがユーザー名 \u003cb\u003e%{username}\u003c/b\u003e と一致する場合、まもなくログインリンクが記載されたメールが届きます。","complete_email":"アカウントが \u003cb\u003e%{email}\u003c/b\u003e と一致する場合、まもなくログインリンクが記載されたメールが届きます。","complete_username_found":"\u003cb\u003e%{username}\u003c/b\u003e に一致するアカウントが見つかりました。まもなく、ログインリンクが記載されたメールが届きます。","complete_email_found":"\u003cb\u003e%{email}\u003c/b\u003e に一致するアカウントが見つかりました。まもなく、ログインリンクが記載されたメールが届きます。","complete_username_not_found":"ユーザー名 \u003cb\u003e%{username}\u003c/b\u003e に一致するアカウントはありません","complete_email_not_found":"\u003cb\u003e%{email}\u003c/b\u003e に一致するアカウントはありません","confirm_title":"%{site_name} に進む","logging_in_as":"%{email} としてログイン","confirm_button":"ログイン完了"},"login":{"header_title":"おかえりなさい","subheader_title":"アカウントにログインする","title":"ログイン","username":"ユーザー","password":"パスワード","second_factor_title":"二要素認証","second_factor_description":"アプリから認証コードを入力してください:","second_factor_backup":"バックアップ コードを使用してログインする","second_factor_backup_title":"二要素バックアップ","second_factor_backup_description":"バックアップコードの 1 つを入力してください。","second_factor":"認証アプリを使用してログインする","security_key_description":"物理的なセキュリティキーの準備ができたら、[セキュリティキーで認証] ボタンを押します。","security_key_alternative":"別の方法を試してください","security_key_authenticate":"セキュリティキーで認証","security_key_not_allowed_error":"セキュリティキーの認証プロセスがタイムアウトしたかキャンセルされました。","security_key_no_matching_credential_error":"提供されたセキュリティキーに一致する資格情報が見つかりませんでした。","security_key_support_missing_error":"現在のデバイスまたはブラウザではセキュリティキーの使用がサポートされていません。別の方法を使用してください。","email_placeholder":"メール / ユーザー名","caps_lock_warning":"Caps Lock がオンになっています","error":"不明なエラー","cookies_error":"お使いのブラウザで Cookie が無効になっているようです。有効でない場合、ログインできないことがあります。","rate_limit":"しばらく待ってから再度ログインをお試しください。","blank_username":"あなたのメールまたはユーザー名を入力してください。","blank_username_or_password":"あなたのメールまたはユーザー名、およびパスワードを入力してください。","reset_password":"パスワードをリセット","logging_in":"サインイン中...","or":"または","authenticating":"認証中...","awaiting_activation":"あなたのアカウントはアクティベーション待ちの状態です。もう一度アクティベーションメールを送信するには「パスワードを忘れました」リンクをクリックしてください。","awaiting_approval":"アカウントはまだスタッフメンバーに承認されていません。承認され次第メールでお知らせします。","requires_invite":"このフォーラムは招待制です。","not_activated":"まだログインできません。\u003cb\u003e%{sentTo}\u003c/b\u003e にアクティベーションメールを送信済みです。メールの指示に従ってアカウントのアクティベーションを行ってください。","not_allowed_from_ip_address":"この IP アドレスでログインできません。","admin_not_allowed_from_ip_address":"その IP アドレスからは管理者としてログインできません。","resend_activation_email":"ここをクリックすると、再度アクティベーションメールを送信します。","omniauth_disallow_totp":"あなたのアカウントは二要素認証が有効になっています。ログインにはパスワードが必要です。","resend_title":"アクティベーションメールの再送","change_email":"メールアドレスを変更","provide_new_email":"新しいメールアドレスを入力すると、確認メールを再送します。","submit_new_email":"メールアドレスを更新","sent_activation_email_again":"\u003cb\u003e%{currentEmail}\u003c/b\u003e にアクティベーションメールを再送しました。メールが届くまで数分掛かることがあります。迷惑メールフォルダも確認してください。","sent_activation_email_again_generic":"アクティベーションメールを再送しました。メールが届くまで数分掛かることがあります。迷惑メールフォルダも確認してください。","to_continue":"ログインしてください","preferences":"ユーザー設定を変更するには、ログインする必要があります。","not_approved":"あなたのアカウントはまだ承認されていません。ログインできるようになったら、メールで通知します。","google_oauth2":{"name":"Google","title":"Google"},"twitter":{"name":"Twitter","title":"Twitter"},"instagram":{"name":"Instagram","title":"Instagram"},"facebook":{"name":"Facebook","title":"Facebook"},"github":{"name":"GitHub","title":"GitHub"},"discord":{"name":"Discord","title":"Discord"},"second_factor_toggle":{"totp":"代わりに認証アプリを使用する","backup_code":"代わりにバックアップコードを使用する"}},"invites":{"accept_title":"招待","emoji":"絵文字をエンベロープ","welcome_to":"%{site_name} へようこそ！","invited_by":"あなたは次の人から招待されました:","social_login_available":"このメールアドレスを使ってソーシャルログインすることも可能です。","your_email":"あなたのアカウントのメールアドレスは \u003cb\u003e%{email}\u003c/b\u003e です。","accept_invite":"招待を承諾","success":"あなたのアカウントが作成され、ログインしました。","name_label":"名前","password_label":"パスワード","optional_description":"(オプション)"},"password_reset":{"continue":"%{site_name} に進む"},"emoji_set":{"apple_international":"Apple/International","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook メッセンジャー"},"category_page_style":{"categories_only":"カテゴリのみ","categories_with_featured_topics":"注目のトピックのカテゴリ","categories_and_latest_topics":"カテゴリと最新トピック","categories_and_top_topics":"カテゴリと人気トピック","categories_boxes":"サブカテゴリのあるボックス","categories_boxes_with_topics":"注目のトピックのあるボックス"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"読み込み中..."},"category_row":{"topic_count":{"other":"このカテゴリの %{count} 件のトピック"},"plus_subcategories_title":{"other":"%{name} および %{count} 個のサブカテゴリ"},"plus_subcategories":{"other":"+ %{count} 個のサブカテゴリ"}},"select_kit":{"delete_item":"%{name} 件削除","filter_by":"フィルタ: %{name}","select_to_filter":"フィルタする値を選択する","default_header_text":"選択...","no_content":"一致する項目が見つかりませんでした","filter_placeholder":"検索...","filter_placeholder_with_any":"検索または作成...","create":"作成: '%{content}'","max_content_reached":{"other":"%{count} 項目まで選択できます。"},"min_content_not_reached":{"other":"少なくとも %{count} 項目を選択してください。"},"invalid_selection_length":{"other":"選択は %{count} 文字以上である必要があります。"},"components":{"tag_drop":{"filter_for_more":"もっとフィルタ…"},"categories_admin_dropdown":{"title":"カテゴリの管理"}}},"date_time_picker":{"from":"開始","to":"終了"},"emoji_picker":{"filter_placeholder":"絵文字を探す","smileys_\u0026_emotion":"スマイルと感情","people_\u0026_body":"人と体","animals_\u0026_nature":"動物と自然","food_\u0026_drink":"食べ物とドリンク","travel_\u0026_places":"旅行と場所","activities":"アクティビティ","objects":"オブジェクト","symbols":"シンボル","flags":"通報","recent":"最近使ったもの","default_tone":"スキントーンなし","light_tone":"ライトスキントーン","medium_light_tone":"ミディアムライトスキントーン","medium_tone":"ミディアムスキントーン","medium_dark_tone":"ミディアムダークスキントーン","dark_tone":"ダークスキントーン","default":"カスタム絵文字"},"shared_drafts":{"title":"共有の下書き","notice":"このトピックは、共有の下書きを公開できるユーザーのみに表示されます。","destination_category":"宛先カテゴリ","publish":"共有の下書きを公開","confirm_publish":"この下書きを公開してもよろしいですか？","publishing":"トピック公開中..."},"composer":{"emoji":"絵文字 :)","more_emoji":"もっと...","options":"オプション","whisper":"ささやき","unlist":"非表示","add_warning":"これは運営スタッフからの警告です。","toggle_whisper":"ささやきを切り替える","toggle_unlisted":"非表示を切り替える","posting_not_on_topic":"どのトピックに返信しますか？","saved_local_draft_tip":"ローカルに保存しました","similar_topics":"これに似たトピックは...","drafts_offline":"オフラインの下書き","edit_conflict":"競合を編集する","group_mentioned_limit":{"other":"\u003cb\u003e警告！\u003c/b\u003e \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e をメンションしましたが、このグループのメンバー数は、管理者がメンション数制限として設定した %{count} 人を超えています。そのため誰にも通知されません。"},"group_mentioned":{"other":"%{group} をメンションすると、\u003ca href='%{group_link}'\u003e%{count} 人\u003c/a\u003e へ通知されます。よろしいですか？"},"cannot_see_mention":{"category":"%{username} をメンションしましたが、このカテゴリへのアクセス権がないため通知されません。このカテゴリにアクセスできるグループに追加してください。","private":"%{username} をメンションしましたが、この個人メッセージを見ることができないため通知されません。この個人メッセージに招待してください。"},"duplicate_link":"\u003cb\u003e%{domain}\u003c/b\u003e へのリンクは、すでに \u003cb\u003e@%{username}\u003c/b\u003e が \u003ca href='%{post_url}'\u003e%{ago}\u003c/a\u003e 前に投稿しています。もう一度投稿してもよろしいですか？","reference_topic_title":"RE: %{title}","error":{"title_missing":"タイトルを入力してください。","title_too_short":{"other":"タイトルは %{count} 文字以上である必要があります"},"title_too_long":{"other":"タイトルは %{count} 文字以上にすることはできません"},"post_missing":"空白の投稿はできません","post_length":{"other":"投稿は %{count} 文字以上である必要があります"},"try_like":"%{heart} ボタンは試しましたか？","category_missing":"カテゴリを選択してください","tags_missing":{"other":"少なくとも %{count} 個のタグが必要です"},"topic_template_not_modified":"トピックテンプレートを編集して、トピックに詳細を追加してください。"},"save_edit":"編集内容を保存","overwrite_edit":"上書き編集","reply_original":"オリジナルトピックへ返信","reply_here":"ここに返信","reply":"返信","cancel":"キャンセル","create_topic":"トピックを作成","create_pm":"メッセージ","create_whisper":"ささやき","create_shared_draft":"共有の下書きを作成","edit_shared_draft":"共有の下書きを編集","users_placeholder":"ユーザーを追加","title_placeholder":"トピックのタイトルを入力してください","title_or_link_placeholder":"タイトルを入力するか、リンクを貼り付けてください","edit_reason_placeholder":"編集する理由は？","topic_featured_link_placeholder":"タイトルに表示されるリンクを入力してください。","remove_featured_link":"トピックからリンクを削除してください。","reply_placeholder":"ここに入力してください。 Markdown、BBCode、HTML を使用できます。画像はドラッグか貼り付けできます。","reply_placeholder_no_images":"ここに入力してください。 Markdown、BBCode、HTML を使用できます。","reply_placeholder_choose_category":"カテゴリを選択してから、ここに入力してください。","view_new_post":"新しい投稿を表示します。","saving":"保存中","saved":"保存しました！","saved_draft":"下書きを投稿中です。タップして再開します。","uploading":"アップロード中...","show_preview":"プレビューを表示","hide_preview":"プレビューを非表示","quote_post_title":"投稿全体を引用","bold_label":"B","bold_title":"太字","bold_text":"太字テキスト","italic_label":"I","italic_title":"斜体","italic_text":"斜体テキスト","link_title":"ハイパーリンク","link_description":"リンクの説明をここに入力","link_dialog_title":"ハイパーリンクを挿入","link_optional_text":"オプションのタイトル","link_url_placeholder":"URL を貼り付けるか入力してトピックを検索します","blockquote_title":"ブロック引用","blockquote_text":"ブロック引用","code_title":"整形済みテキスト","code_text":"4 文字スペースでインデント","paste_code_text":"コードをここに入力または貼り付け","upload_title":"アップロード","upload_description":"アップロードの説明をここに入力","olist_title":"番号付きリスト","ulist_title":"箇条書き","list_item":"リスト項目","toggle_direction":"方向の切り替え","help":"Markdown 編集のヘルプ","collapse":"コンポーザーパネルを最小化","open":"コンポーザーパネルを開く","abandon":"コンポーザーを閉じて下書きを破棄","enter_fullscreen":"コンポーザーの全画面表示を開始","exit_fullscreen":"コンポーザーの全画面表示を終了","show_toolbar":"コンポーザーツールバーを表示","hide_toolbar":"コンポーザーツールバーを非表示","modal_ok":"OK","modal_cancel":"キャンセル","cant_send_pm":"%{username} にメッセージを送ることはできません。","yourself_confirm":{"title":"受信者を追加し忘れましたか？","body":"現時点では、このメッセージは自分にしか送信されません！"},"slow_mode":{"error":"このトピックは低速モードです。最近投稿したばかりです。%{timeLeft} してから投稿してください。"},"admin_options_title":"このトピックのオプションのスタッフ設定","composer_actions":{"reply":"返信","draft":"下書き","edit":"編集","reply_to_post":{"label":"%{postUsername} の投稿に返信","desc":"特定の投稿に返信する"},"reply_as_new_topic":{"label":"リンクトピックとして返信","desc":"このトピックにリンクしている新しいトピックを作成する","confirm":"新しいトピックの下書きが保存されていますが、リンクトピックを作成すると上書きされます。"},"reply_as_new_group_message":{"label":"新しいグループメッセージとして返信","desc":"同じ受信者で始まる新しいメッセージを作成します"},"reply_as_private_message":{"label":"新規メッセージ","desc":"新しい個人メッセージを作成する"},"reply_to_topic":{"label":"トピックへ返信","desc":"特定の投稿ではなく、トピックに返信する"},"toggle_whisper":{"label":"ささやきを切り替える","desc":"ささやきはスタッフメンバーにのみ表示されます"},"create_topic":{"label":"新規トピック"},"shared_draft":{"label":"共有の下書き","desc":"許可されたユーザーにのみ表示されるトピックの下書きを作成します"},"toggle_topic_bump":{"label":"トピックのバンプを切り替える","desc":"最新の返信日を変更せずに返信します"}},"reload":"再読み込み","ignore":"無視する","details_title":"要約","details_text":"このテキストは表示されません"},"notifications":{"tooltip":{"regular":{"other":"%{count} 件の未読通知"},"message":{"other":"%{count} 件の未読メッセージ"},"high_priority":{"other":"%{count} 件の優先度の高い未読通知"}},"title":"@ユーザー名のメンション、投稿やトピックへの返信、メッセージなどの通知","none":"現在、通知を読み込めません。","empty":"通知はありません。","post_approved":"あなたの投稿が承認されました","reviewable_items":"レビューが必要な項目","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}、%{username2}\u003c/span\u003e %{description}","liked_many":{"other":"\u003cspan class='multi-user'\u003e%{username}、%{username2}、他 %{count} 人\u003c/span\u003e %{description}"},"liked_consolidated_description":{"other":"はあなたの %{count} 件の投稿に「いいね！」しました"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e があなたの招待を承諾しました","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e が %{description} を移動しました","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"「%{description}」をゲット！","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003e新規トピック\u003c/span\u003e %{description}","membership_request_accepted":"'%{group_name}' のメンバーシップが承認されました","membership_request_consolidated":{"other":"'%{group_name}' の %{count} 件のオープンメンバーシップリクエスト"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}、%{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - 完了","group_message_summary":{"other":"%{group_name} の受信トレイに %{count} 件のメッセージがあります"},"popup":{"mentioned":"%{username} が「%{topic}」であなたをメンションしました - %{site_title}","group_mentioned":"%{username} が「%{topic}」であなたをメンションしました - %{site_title}","quoted":"%{username} が「%{topic}」であなたを引用しました - %{site_title}","replied":"%{username} が「%{topic}」であなたに返信しました - %{site_title}","posted":"%{username} が「%{topic}」に投稿しました - %{site_title}","private_message":"「%{topic}」で %{username} があなたに個人メッセージを送信しました - %{site_title}","linked":"%{username} が「%{topic}」のあなたの投稿にリンクしました - %{site_title}","watching_first_post":"%{username} が新規トピック「%{topic}」を作成しました - %{site_title}","confirm_title":"通知を有効にしました - %{site_title}","confirm_body":"成功！通知を有効にしました！","custom":"%{username} からの通知（%{site_title}）"},"titles":{"mentioned":"メンション","replied":"新しい返信","quoted":"引用","edited":"編集","liked":"新しい「いいね！」","private_message":"新しい個人メッセージ","invited_to_private_message":"個人メッセージに招待","invitee_accepted":"招待が承諾されました","posted":"新しい投稿","moved_post":"投稿が移動されました","linked":"リンクされました","bookmark_reminder":"ブックマークのリマインダー","bookmark_reminder_with_name":"ブックマークのリマインダー - %{name}","granted_badge":"バッジを獲得しました","invited_to_topic":"トピックに招待されました","group_mentioned":"グループがメンションされました","group_message_summary":"新規グループメッセージ","watching_first_post":"新規トピック","topic_reminder":"トピックのリマインダー","liked_consolidated":"新しい「いいね！」","post_approved":"投稿が承認されました","membership_request_consolidated":"新しいメンバーシップリクエスト","reaction":"新しいリアクション","votes_released":"投票がリリースされました"}},"upload_selector":{"uploading":"アップロード中","processing":"アップロードを処理中","select_file":"ファイル選択","default_image_alt_text":"画像"},"search":{"sort_by":"並べ替え","relevance":"関連性の高い項目","latest_post":"最新の投稿","latest_topic":"最新のトピック","most_viewed":"最も閲覧されている項目","most_liked":"「いいね！」の多い項目","select_all":"すべて選択","clear_all":"すべてクリア","too_short":"検索文字が短すぎます。","result_count":{"other":"\u003cspan class='term'\u003e%{term}\u003c/span\u003e の \u003cspan\u003e%{count}%{plus} 件の結果\u003c/span\u003e"},"title":"検索","full_page_title":"検索","no_results":"何も見つかりませんでした。","no_more_results":"検索結果は以上です。","post_format":"%{username} の #%{post_number}","results_page":"'%{term}' の検索結果","more_results":"検索結果が多数あります。検索条件を絞ってください。","cant_find":"探しているものが見つかりませんか？","start_new_topic":"新しいトピックを始めてみては？","or_search_google":"または Google で検索してみてください:","search_google":"Google で検索してみてください:","search_google_button":"Google","search_button":"検索","categories":"カテゴリ","tags":"タグ","type":{"users":"ユーザー","categories":"カテゴリ"},"context":{"user":"@%{username} の投稿を検索","category":"#%{category} カテゴリを検索","tag":"#%{tag} タグを検索","topic":"このトピックを検索","private_messages":"メッセージを検索"},"advanced":{"posted_by":{"label":"投稿者"},"in_category":{"label":"カテゴリ"},"in_group":{"label":"グループ内"},"with_badge":{"label":"バッジ"},"with_tags":{"label":"タグ"},"filters":{"label":"トピック/投稿のみを返す...","title":"タイトルが一致するもの","likes":"「いいね！」した項目","posted":"投稿したもの","created":"自分が作成したもの","watching":"ウォッチ中","tracking":"追跡中","private":"メッセージ内","bookmarks":"ブックマーク済み","first":"最初の投稿","pinned":"固定表示","seen":"既読","unseen":"未読","wiki":"ウィキ","images":"画像を含む","all_tags":"上記のすべてのタグ"},"statuses":{"label":"トピック","open":"オープン","closed":"クローズ","public":"公開のもの","archived":"アーカイブ済み","noreplies":"返信がない","single_user":"ユーザーが 1 人"},"post":{"count":{"label":"投稿"},"min":{"placeholder":"最小"},"max":{"placeholder":"最大"},"time":{"label":"投稿時期","before":"以前","after":"以降"}},"views":{"label":"表示回数"},"min_views":{"placeholder":"最小"},"max_views":{"placeholder":"最大"}}},"new_item":"新規","go_back":"戻る","not_logged_in_user":"現在のアクティビティと設定に関するユーザーの概要ページ","current_user":"ユーザーページに移動","view_all":"すべての%{tab}を表示","topics":{"new_messages_marker":"最後の訪問","bulk":{"select_all":"すべて選択","clear_all":"すべてクリア","unlist_topics":"トピックを非表示","relist_topics":"トピックを表示","reset_read":"未読に設定","delete":"トピックを削除","dismiss":"閉じる","dismiss_read":"未読をすべて閉じる","dismiss_read_with_selected":{"other":"未読の %{count} 件を閉じる"},"dismiss_button":"閉じる...","dismiss_button_with_selected":{"other":"閉じる (%{count})…"},"dismiss_tooltip":"新規投稿のみを閉じるかトピックの追跡を停止します","also_dismiss_topics":"これらのトピックの追跡を停止して、未読として表示されないようにする","dismiss_new":"新規を閉じる","dismiss_new_with_selected":{"other":"新規を閉じる (%{count})"},"toggle":"トピックの一括選択を切り替える","actions":"一括操作","close_topics":"トピックをクローズ","archive_topics":"トピックをアーカイブ","move_messages_to_inbox":"受信トレイに移動","change_notification_level":"通知レベルを変更","choose_new_category":"このトピックの新しいカテゴリを選択:","selected":{"other":"\u003cb\u003e%{count}\u003c/b\u003e 件のトピックを選択しました。"},"change_tags":"タグを置換","append_tags":"タグを追加","choose_new_tags":"これらのトピックに新しいタグを選択:","choose_append_tags":"これらのトピックに追加する新しいタグを選択:","changed_tags":"トピックのタグが変更されました。","remove_tags":"すべてのタグを削除","confirm_remove_tags":{"other":"\u003cb\u003e%{count}\u003c/b\u003e 件のトピックからすべてのタグが削除されます。よろしいですか？"},"progress":{"other":"進捗状況: \u003cstrong\u003e%{count}\u003c/strong\u003e 件のトピック"}},"none":{"unread":"未読のトピックはありません。","new":"新しいトピックはありません。","read":"まだトピックを一つも読んでいません。","posted":"まだトピックを一つも投稿していません。","latest":"すべて既読です！","bookmarks":"ブックマークしたトピックはありません。","category":"%{category} のトピックはありません。","top":"人気のトピックはありません。","educate":{"new":"\u003cp\u003e新しいトピックがここに表示されます。デフォルトでは、2 日以内に作成されたトピックは新しいトピックとみなされ、\u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e が表示されます。\u003c/p\u003e\u003cp\u003eこの設定はユーザー\u003ca href=\"%{userPrefsUrl}\"\u003e設定\u003c/a\u003eで変更できます。\u003c/p\u003e","unread":"\u003cp\u003e新しいトピックがここに表示されます。\u003c/p\u003e\u003cp\u003eデフォルトでは次の場合にトピックは未読とされ未読数 \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e が表示されます。\u003c/p\u003e\u003cul\u003e\u003cli\u003eトピックを作成した場合\u003c/li\u003e\u003cli\u003eトピックに返信した場合\u003c/li\u003e\u003cli\u003eトピックを 4 分以上閲覧した場合\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eまたは各トピックの 🔔 を通じて明示的にトピックを「追跡」または「ウォッチ中」に設定した場合\u003c/p\u003e\u003cp\u003eこれを変更するには、\u003ca href=\"%{userPrefsUrl}\"\u003e設定\u003c/a\u003eにアクセスしてください。\u003c/p\u003e"}},"bottom":{"latest":"最新のトピックは以上です。","posted":"投稿のあるトピックは以上です。","read":"既読のトピックは以上です。","new":"新規トピックは以上です。","unread":"未読のトピックは以上です。","category":"%{category} のトピックは以上です。","tag":"%{tag} のトピックは以上です。","top":"人気のトピックは以上です。","bookmarks":"ブックマーク済みのトピックは以上です。"}},"topic":{"filter_to":{"other":"トピックの %{count} 件の投稿"},"create":"新規トピック","create_long":"新しいトピックの作成","open_draft":"下書きを開く","private_message":"メッセージを書く","archive_message":{"help":"アーカイブにメセージを移動する","title":"アーカイブ"},"move_to_inbox":{"title":"受信トレイに移動","help":"受信トレイにメッセージを戻す"},"edit_message":{"help":"メッセージの最初の投稿を編集する","title":"編集"},"defer":{"help":"未読にする","title":"取り下げる"},"list":"トピック","new":"新規トピック","unread":"未読","new_topics":{"other":"%{count} 件の新規トピック"},"unread_topics":{"other":"%{count} 件の未読トピック"},"title":"トピック","invalid_access":{"title":"トピックはプライベートです","description":"このトピックへのアクセスは許可されていません！","login_required":"トピックを閲覧するには、ログインする必要があります"},"server_error":{"title":"トピックの読み込みに失敗しました","description":"トピックを読み込めませんでした。接続に問題があるようです。もう一度試してください。もし問題が継続する場合はお知らせください。"},"not_found":{"title":"トピックが見つかりませんでした","description":"トピックが見つかりませんでした。モデレーターによって削除された可能性があります。"},"unread_posts":{"other":"このトピックに %{count} 件の未読の投稿があります"},"likes":{"other":"このトピックには %{count} 個の「いいね！」があります"},"back_to_list":"トピックリストに戻る","options":"トピックのオプション","show_links":"このトピック内のリンクを表示する","collapse_details":"トピックの詳細を折りたたむ","expand_details":"トピックの詳細を展開する","read_more_in_category":"もっと読みますか？%{catLink} または %{latestLink} での他のトピックを閲覧できます。","read_more":"もっと読みますか？%{catLink} または %{latestLink}。","unread_indicator":"このトピックの最後の投稿を読んだメンバーはまだいません。","browse_all_categories":"すべてのカテゴリを閲覧する","browse_all_tags":"すべてのタグを閲覧する","view_latest_topics":"最新のトピックを表示する","suggest_create_topic":"\u003ca href\u003e新しい会話を開始しますか？\u003c/a\u003e","jump_reply_up":"以前の返信へジャンプ","jump_reply_down":"以後の返信へジャンプ","deleted":"トピックは削除されました","slow_mode_update":{"title":"低速モード","select":"ユーザーはこのトピックに次の頻度でのみ投稿できます。","description":"流れの速いディスカッションや論争になりがちなディスカッションで建設的な対話を奨励するため、このトピックへの投稿はしばらく待ってから行う必要があります。","enable":"有効化","update":"更新","enabled_until":"有効期限:","remove":"無効化","hours":"時間:","minutes":"分:","seconds":"秒:","durations":{"10_minutes":"10 分間","15_minutes":"15分","30_minutes":"30 分","45_minutes":"45分","1_hour":"１時間","2_hours":"２時間","4_hours":"4 時間","8_hours":"8 時間","12_hours":"12 時間","24_hours":"24 時間","custom":"カスタム期間"}},"slow_mode_notice":{"duration":"このトピックでは次の投稿まで %{duration}お待ちください"},"topic_status_update":{"title":"トピックタイマー","save":"タイマーをセット","num_of_hours":"時間:","num_of_days":"日数:","remove":"タイマーを削除","publish_to":"公開先:","when":"公開時間:","time_frame_required":"時間枠を選択してください","min_duration":"期間は 0 より大きくする必要があります","max_duration":"期間は 20 年未満である必要があります"},"auto_update_input":{"none":"時間枠を選択してください","now":"今","later_today":"今日の後程","tomorrow":"明日","later_this_week":"今週の後半","this_weekend":"今週末","next_week":"来週","two_weeks":"2 週間","next_month":"来月","two_months":"2 か月","three_months":"3 か月","four_months":"4 か月","six_months":"6 か月","one_year":"1 年","forever":"永遠","pick_date_and_time":"日時を選択","set_based_on_last_post":"最後の投稿でクローズ"},"publish_to_category":{"title":"公開スケジュール"},"temp_open":{"title":"一時的にオープン"},"auto_reopen":{"title":"トピックを自動オープン"},"temp_close":{"title":"一時的にクローズ"},"auto_close":{"title":"トピックを自動的にクローズ","label":"次の後トピックを自動的にクローズ:","error":"有効な値を入力してください。","based_on_last_post":"トピックの最後の投稿が古くなるまでクローズしない。"},"auto_close_after_last_post":{"title":"最後の投稿の後トピックを自動的にクローズ"},"auto_delete":{"title":"トピックを自動的に削除"},"auto_bump":{"title":"トピックの自動バンプ"},"reminder":{"title":"リマインダー"},"auto_delete_replies":{"title":"返信の自動削除"},"status_update_notice":{"auto_open":"このトピックは後 %{timeLeft}で自動的にオープンします。","auto_close":"このトピックは後 %{timeLeft}で自動的にクローズします。","auto_publish_to_category":"このトピックは後 %{timeLeft}で \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e に公開されます。","auto_close_after_last_post":"このトピックは最後の返信から%{duration}後にクローズされます。","auto_delete":"このトピックは後 %{timeLeft}で自動的に削除されます。","auto_bump":"このトピックは後 %{timeLeft}で自動的にバンプされます。","auto_reminder":"このトピックについて %{timeLeft}後にリマインダーを通知します。","auto_delete_replies":"このトピックへの返信は、%{duration}後に自動的に削除されます。"},"auto_close_title":"自動クローズの設定","auto_close_immediate":{"other":"このトピックは最終投稿からすでに %{count} 時間経過しているため、すぐにクローズされます。"},"auto_close_momentarily":{"other":"このトピックは最終投稿からすでに %{count} 時間経過しているため、すぐにクローズされます。"},"timeline":{"back":"戻る","back_description":"最後の未読の投稿に戻る","replies_short":"%{current} / %{total}"},"progress":{"title":"トピックの進捗","go_top":"上","go_bottom":"下","go":"移動","jump_bottom":"最後の投稿へジャンプ","jump_prompt":"ジャンプ...","jump_prompt_of":{"other":"/ %{count} の投稿"},"jump_prompt_long":"ジャンプ...","jump_bottom_with_number":"%{post_number} 番へジャンプ","jump_prompt_to_date":"日付","jump_prompt_or":"または","total":"全投稿","current":"現在の投稿"},"notifications":{"title":"このトピックに関する通知頻度の変更","reasons":{"mailing_list_mode":"メーリングリストモードになっているため、このトピックへの返信はメールで通知されます。","3_10":"このトピックのタグをウォッチしているため通知されます。","3_10_stale":"このトピックのタグを過去にウォッチしていたため通知されます。","3_6":"このカテゴリをウォッチしているため通知されます。","3_6_stale":"このカテゴリを過去にウォッチしていたため通知されます。","3_5":"このトピックを自動的にウォッチし始めたため通知されます。","3_2":"このトピックをウォッチしているため通知されます。","3_1":"このトピックを作成したため通知されます。","3":"このトピックをウォッチしているため通知されます。","2_8":"このカテゴリを追跡しているため、新しい返信の件数が表示されます。","2_8_stale":"このカテゴリを過去に追跡していたため、新しい返信の件数が表示されます。","2_4":"このトピックに返信したので、新しい返信の件数が表示されます。","2_2":"このトピックを追跡しているので、新しい返信の件数が表示されます。","2":"\u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eこのトピックを読んでいる\u003c/a\u003eため、新しい返信の件数が表示されます。","1_2":"誰かが @ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。","1":"誰かが @ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。","0_7":"このカテゴリのすべての通知を無視しています。","0_2":"このトピックのすべての通知を無視しています。","0":"このトピックのすべての通知を無視しています。"},"watching_pm":{"title":"ウォッチ中","description":"このメッセージに返信があるたびに通知され、新しい返信の件数が表示されます。"},"watching":{"title":"ウォッチ中","description":"このトピックに返信があるたびに通知され、新しい返信の件数が表示されます。"},"tracking_pm":{"title":"追跡中","description":"このメッセージの新しい返信の件数が表示されます。誰かが@ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。"},"tracking":{"title":"追跡中","description":"このトピックの新しい返信の件数が表示されます。誰かが@ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。"},"regular":{"title":"通常","description":"誰かが @ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。"},"regular_pm":{"title":"通常","description":"誰かが @ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。"},"muted_pm":{"title":"ミュート","description":"このメッセージに関する通知を受け取りません。"},"muted":{"title":"ミュート","description":"このトピックについて何も通知されず、最新にも表示されません。"}},"actions":{"title":"操作","recover":"トピックの削除を取り消す","delete":"トピックを削除","open":"トピックをオープン","close":"トピックをクローズ","multi_select":"投稿を選択...","timed_update":"トピックにタイマーをセット...","pin":"トピックを固定...","unpin":"トピックを固定解除...","unarchive":"トピックをアーカイブ解除","archive":"トピックをアーカイブ","invisible":"非表示にする","visible":"リストに表示","reset_read":"閲覧データをリセット","make_private":"個人メッセージにする","reset_bump_date":"バンプ日をリセット"},"feature":{"pin":"トピックを固定","unpin":"トピックを固定解除","pin_globally":"トピックを全体に固定","make_banner":"バナートピックにする","remove_banner":"バナートピックを削除"},"reply":{"title":"返信","help":"このトピックへの返信を作成する"},"share":{"title":"共有","extended_title":"リンクの共有","help":"このトピックのリンクを共有する","instructions":"このトピックへのリンクを共有します:","copied":"トピックのリンクをコピーしました。","notify_users":{"title":"通知","instructions":"このトピックについて次のユーザーに通知します:","success":{"other":"このトピックについてすべてのユーザーに正常に通知しました。"}},"invite_users":"招待"},"print":{"title":"印刷","help":"このトピックの印刷バージョンを開く"},"flag_topic":{"title":"通報","help":"このトピックを非公開に通報するか、または非公開の通知を送信する","success_message":"このトピックを通報しました。"},"make_public":{"title":"公開トピックに変換","choose_category":"公開トピックのカテゴリを選択してください:"},"feature_topic":{"title":"これを注目のトピックにする","pin":"このトピックを %{categoryLink} カテゴリのトップに次の期間表示する:","unpin":"このトピックを %{categoryLink} カテゴリのトップから削除する","unpin_until":"このトピックを %{categoryLink} カテゴリのトップから削除するか、\u003cstrong\u003e%{until}\u003c/strong\u003e まで待つ。","pin_note":"ユーザーはトピックごとに固定表示を解除できます。","pin_validation":"このトピックを固定するには日付が必要です。","not_pinned":"%{categoryLink} で固定されているトピックはありません。","already_pinned":{"other":"%{categoryLink}で固定されているトピック: \u003cstrong class='badge badge-notification unread'\u003e%{count} 件\u003c/strong\u003e"},"pin_globally":"このトピックをすべてのトピックリストのトップに表示する","confirm_pin_globally":{"other":"すでに %{count} 個のトピックをサイト全体に固定表示しています。固定されたトピックが多すぎると、新規ユーザーや匿名ユーザーの負担になる可能性があります。別のトピックをさらに固定してもよいですか？"},"unpin_globally":"このトピックをトピックリストのトップから削除します。","unpin_globally_until":"このトピックをすべてのトピックリストのトップから削除するか、\u003cstrong\u003e%{until}\u003c/strong\u003e まで待つ。","global_pin_note":"ユーザーはトピックごとに固定表示を解除できます。","not_pinned_globally":"全体に固定されているトピックはありません。","already_pinned_globally":{"other":"全体に固定されているトピック: \u003cstrong class='badge badge-notification unread'\u003e%{count} 件\u003c/strong\u003e"},"make_banner":"このトピックをすべてのページの上部に表示されるバナーにします。","remove_banner":"すべてのページの上部に表示されるバナーを削除します。","banner_note":"ユーザーはバナーを閉じることができます。任意のタイミングでバナー表示できるのは 1 つのトピックだけです。","no_banner_exists":"バナートピックはありません。","banner_exists":"現在、バナートピックが\u003cstrong class='badge badge-notification unread'\u003eあります\u003c/strong\u003e。"},"inviting":"招待中...","automatically_add_to_groups":"この招待によって、次のグループにもアクセスできます。","invite_private":{"title":"メッセージに招待","email_or_username":"招待者のメールまたはユーザー名","email_or_username_placeholder":"メールアドレスまたはユーザー名","action":"招待","success":"ユーザーをこのメッセージへ招待しました。","success_group":"グループをこのメッセージへ招待しました。","error":"ユーザーを招待中にエラーが発生しました。","not_allowed":"そのユーザーを招待できません。","group_name":"グループ名"},"controls":"トピックの管理","invite_reply":{"title":"招待","username_placeholder":"ユーザー名","action":"招待を送信","help":"メールまたは通知で、ほかのユーザーをこのトピックに招待する","to_forum":"あなたの友人がリンクをクリックしてすぐに参加できるように、簡単なメールを送信します。","discourse_connect_enabled":"このトピックに招待する人のユーザー名を入力してください。","to_topic_blank":"このトピックに招待する人のユーザー名またはメールアドレスを入力してください。","to_topic_email":"あなたはメールアドレスを入力しました。フレンドがすぐにこのトピックへ返信できるようにメールで招待します。","to_topic_username":"ユーザー名を入力しました。このトピックへの招待リンクを記載した通知を送信します。","to_username":"招待する人のユーザ名を入れてください。このトピックへの招待リンクを記載した通知を送信します。","email_placeholder":"name@example.com","success_email":"\u003cb\u003e%{invitee}\u003c/b\u003e に招待を送信しました。招待が承諾されたらお知らせします。招待のステータスは、ユーザーページの招待タブで確認できます。","success_username":"ユーザーをこのトピックへ招待しました。","error":"その人を招待できませんでした。すでに招待を送信していませんか？ (招待できる数には限りがあります)","success_existing_email":"\u003cb\u003e%{emailOrUsername}\u003c/b\u003e のユーザーはすでに存在します。このトピックに参加するように、このユーザーを招待しました。"},"login_reply":"ログインして返信","filters":{"n_posts":{"other":"%{count} 件の投稿"},"cancel":"フィルタを削除"},"move_to":{"title":"移動先","action":"移動先","error":"投稿を移動中にエラーが発生しました。"},"split_topic":{"title":"新規トピックに移動","action":"新規トピックに移動","topic_name":"新しいトピックのタイトル","radio_label":"新規トピック","error":"投稿を新規トピックに移動する際にエラーが発生しました。","instructions":{"other":"新しいトピックを作成し、それに選択した \u003cb\u003e%{count}\u003c/b\u003e 件の投稿を移動しようとしています。"}},"merge_topic":{"title":"既存のトピックに移動","action":"既存のトピックに移動","error":"指定されたトピックへの投稿移動中にエラーが発生しました。","radio_label":"既存のトピック","instructions":{"other":"\u003cb\u003e%{count}\u003c/b\u003e 件の投稿を移動するトピックを選択してください。"}},"move_to_new_message":{"title":"新しいメッセージに移動","action":"新しいメッセージに移動","message_title":"新規メッセージタイトル","radio_label":"新規メッセージ","participants":"参加者","instructions":{"other":"新しいメッセージを作成し、選択した \u003cb\u003e%{count}\u003c/b\u003e 件の投稿をそれに挿入しようとしています。"}},"move_to_existing_message":{"title":"既存のメッセージに移動","action":"既存のメッセージに移動","radio_label":"既存のメッセージ","participants":"参加者","instructions":{"other":"\u003cb\u003e%{count}\u003c/b\u003e 件の投稿を移動するメッセージを選択してください。"}},"merge_posts":{"title":"選択した投稿をマージ","action":"選択した投稿をマージ","error":"選択した投稿をマージ中にエラーが発生しました。"},"publish_page":{"title":"ページの公開","publish":"公開","description":"トピックがページとして公開されると、その URL を共有できるようになり、カスタムスタイルで表示されるようになります。","slug":"スラッグ","public":"公開","public_description":"関連するトピックが非公開である場合でも、ページを閲覧できます。","publish_url":"ページは次の場所に公開されました:","topic_published":"トピックは次の場所に公開されました:","preview_url":"ページは次の場所に公開されます:","invalid_slug":"このページを公開できません。","unpublish":"公開を取り消す","unpublished":"ページの公開は取り消され、アクセスできなくなりました。","publishing_settings":"公開設定"},"change_owner":{"title":"オーナーを変更","action":"オーナーシップを変更","error":"投稿のオーナーシップを変更中にエラーが発生しました。","placeholder":"新しいオーナーのユーザー名","instructions":{"other":"\u003cb\u003e@%{old_user}\u003c/b\u003e の %{count} 件の投稿に新しいオーナーを選択してください"},"instructions_without_old_user":{"other":"%{count} 件の投稿に新しいオーナーを選択してください"}},"change_timestamp":{"title":"タイムスタンプを変更...","action":"タイムスタンプを変更","invalid_timestamp":"タイムスタンプを未来の時刻にすることはできません。","error":"トピックのタイムスタンプを変更中にエラーが発生しました。","instructions":"トピックに新しいタイムスタンプを設定してください。トピックの各投稿の時間はそのタイムスタンプを起点に再計算されます。"},"multi_select":{"select":"選択","selected":"選択済み (%{count})","select_post":{"label":"選択","title":"選択に投稿を追加する"},"selected_post":{"label":"選択済み","title":"クリックして選択から投稿を削除する"},"select_replies":{"label":"複数の返信を選択","title":"投稿とすべての返信を選択に追加する"},"select_below":{"label":"+下を選択","title":"投稿とその後のすべてを選択に追加する"},"delete":"選択済みを削除","cancel":"選択をキャンセル","select_all":"すべて選択","deselect_all":"すべて選択解除","description":{"other":"\u003cb\u003e%{count}\u003c/b\u003e 件の投稿を選択しました。"}},"deleted_by_author_simple":"(作成者が削除したトピック)"},"post":{"quote_reply":"引用","quote_edit":"編集","quote_share":"共有","edit_reason":"理由: ","post_number":"投稿 %{number}","ignored":"無視したコンテンツ","wiki_last_edited_on":"%{dateTime}に最終編集されたウィキ","last_edited_on":"%{dateTime}に最終編集された投稿","reply_as_new_topic":"リンクトピックとして返信","reply_as_new_private_message":"同じ受信者に新規メッセージとして返信する","continue_discussion":"%{postLink} からディスカッションを続行:","follow_quote":"引用した投稿に移動","show_full":"投稿全文を表示","show_hidden":"無視したコンテンツを表示します。","deleted_by_author_simple":"(作成者が削除した投稿)","collapse":"折りたたむ","expand_collapse":"展開/折りたたむ","locked":"スタッフメンバーは、この投稿を編集できないようにロックしました","gap":{"other":"%{count} 件の非表示の返信を表示する"},"notice":{"new_user":"%{user} が投稿するのはこれが初めてです。コミュニティで歓迎しましょう！","returning_user":"%{user} を見かけてからしばらく経ちました。最後の投稿は %{time} でした。"},"unread":"投稿は未読です","has_replies":{"other":"%{count} 件の返信"},"has_replies_count":"%{count} 件","unknown_user":"(不明/削除されたユーザー)","has_likes_title":{"other":"%{count} 人がこの投稿に「いいね！」しました"},"has_likes_title_only_you":"この投稿に「いいね！」しました","has_likes_title_you":{"other":"あなたと他 %{count} 人がこの投稿に「いいね！」しました"},"filtered_replies_hint":{"other":"この投稿との %{count} 件の返信を表示します"},"filtered_replies_viewing":{"other":"%{count} 件の返信を表示中:"},"in_reply_to":"親投稿を読み込む","view_all_posts":"すべての投稿を表示","errors":{"create":"投稿を作成中にエラーが発生しました。もう一度お試しください。","edit":"投稿を編集中にエラーが発生しました。もう一度お試しください。","upload":"ファイルのアップロード中にエラーが発生しました。もう一度お試しください。","file_too_large":"ファイルが大きすぎます (最大サイズは %{max_size_kb} kb です)。クラウド共有サービスにアップロードしてから、そのリンクを貼り付けてはどうですか？","too_many_uploads":"複数のファイルを同時にアップロードすることはできません。","too_many_dragged_and_dropped_files":{"other":"一度にアップロードできるファイルは %{count} 個までです。"},"upload_not_authorized":"アップロードしようとしているファイルは許可されていません (許可されている拡張子: %{authorized_extensions})。","image_upload_not_allowed_for_new_user":"新規ユーザーは画像をアップロードできません。","attachment_upload_not_allowed_for_new_user":"新規ユーザーはファイルを添付できません。","attachment_download_requires_login":"添付ファイルをダウンロードするには、ログインする必要があります。"},"cancel_composer":{"confirm":"投稿をどうしますか？","discard":"破棄","save_draft":"後で使用するために下書きとして保存","keep_editing":"編集を続ける"},"via_email":"これはメールで投稿されました","via_auto_generated_email":"この投稿は自動生成メール経由で届きました","whisper":"この投稿はモデレーターの非公開のささやきです","wiki":{"about":"この投稿はウィキです"},"few_likes_left":"愛を共有してくれてありがとう！今日は後数個しか「いいね！」できません。","controls":{"reply":"この投稿の返信を作成する","like":"この投稿に「いいね！」する","has_liked":"この投稿に「いいね！」しました","read_indicator":"この投稿を読んだメンバー","undo_like":"「いいね！」を取り消す","edit":"この投稿を編集","edit_action":"編集","edit_anonymous":"この投稿を編集するには、ログインする必要があります。","flag":"この投稿を非公開に通報するか、または非公開の通知を送信する","delete":"この投稿を削除する","undelete":"この投稿の削除を取り消す","share":"この投稿へのリンクを共有する","more":"もっと","delete_replies":{"confirm":"この投稿への返信も削除しますか？","direct_replies":{"other":"はい。%{count} 件のダイレクト返信も削除"},"all_replies":{"other":"はい。全 %{count} 件の返信も削除"},"just_the_post":"いいえ、この投稿のみ"},"admin":"投稿の管理者操作","wiki":"ウィキにする","unwiki":"ウィキから削除","convert_to_moderator":"スタッフの色を追加","revert_to_regular":"スタッフの色を削除","rebake":"HTML を再作成","publish_page":"ページの公開","unhide":"表示","lock_post":"投稿をロック","lock_post_description":"投稿者がこの投稿を編集できないようにします","unlock_post":"投稿のロックを解除","unlock_post_description":"投稿者がこの投稿を編集できるようにします","delete_topic_disallowed_modal":"このトピックを削除する権限がありません。本当に削除したい場合は、モデレーターの注意要として、理由と共に通報してください。","delete_topic_disallowed":"このトピックを削除する権限がありません。","delete_topic_confirm_modal":{"other":"このトピックの閲覧数は現在 %{count} 回を超えており、人気の検索先となっているようです。トピックの編集や改善を行わずに、このトピック全体を削除してもよろしいですか？"},"delete_topic_confirm_modal_yes":"はい。このトピックを削除する","delete_topic_confirm_modal_no":"いいえ。このトピックを維持する","delete_topic_error":"このトピックを削除中にエラーが発生しました","delete_topic":"トピックを削除","delete_post_notice":"スタッフ通知を削除","remove_timer":"タイマーを削除","edit_timer":"タイマーを編集"},"actions":{"people":{"like":{"other":"「いいね！」しました"},"read":{"other":"これを読む"},"like_capped":{"other":"および他 %{count} 人がこれに「いいね！」と言いました"},"read_capped":{"other":"および他 %{count} 人がこれを読みました"}},"by_you":{"off_topic":"関係のない話題として通報しました","spam":"迷惑として通報しました","inappropriate":"不適切として通報しました","notify_moderators":"スタッフによる確認が必要として通報しました","notify_user":"このユーザーにメッセージを送信しました"}},"delete":{"confirm":{"other":"%{count} 件の投稿を削除してもよろしいですか？"}},"merge":{"confirm":{"other":"これらの %{count} 件の投稿をマージしてよろしいですか？"}},"revisions":{"controls":{"first":"最初のリビジョン","previous":"前のリビジョン","next":"次のリビジョン","last":"最後のリビジョン","hide":"リビジョンを非表示","show":"リビジョンを表示","revert":"リビジョン %{revision} に戻す","edit_wiki":"ウィキを編集","edit_post":"投稿を編集","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"追加・削除箇所をインラインで表示","button":"HTML"},"side_by_side":{"title":"出力の差分を横に並べて表示","button":"HTML"},"side_by_side_markdown":{"title":"ソースの差分を横に並べて表示","button":"Raw"}}},"raw_email":{"displays":{"raw":{"title":"メールのソースを表示","button":"ソース"},"text_part":{"title":"メールのテキスト部分を表示","button":"テキスト"},"html_part":{"title":"メールの HTML 部分を表示","button":"HTML"}}},"bookmarks":{"create":"ブックマークを作成","edit":"ブックマークを編集","created":"作成","updated":"更新","name":"名前","name_placeholder":"これは何のブックマークですか？","set_reminder":"リマインダー","options":"オプション","actions":{"delete_bookmark":{"name":"ブックマークを削除","description":"プロフィールからブックマークを削除し、ブックマークのすべてのリマインダーを停止します"},"edit_bookmark":{"name":"ブックマークを編集","description":"ブックマーク名を編集するか、リマインダーの日時を変更します"},"pin_bookmark":{"name":"ブックマークを固定","description":"ブックマークを固定します。固定すると、ブックマークリストの一番上に表示されるようになります。"},"unpin_bookmark":{"name":"ブックマークの固定を解除","description":"ブックマークの固定を解除します。解除すると、ブックマークリストの一番上に表示されなくなります。"}}},"filtered_replies":{"viewing_posts_by":"次の投稿者の %{post_count} 件の投稿を閲覧中","viewing_subset":"一部の返信は折りたたまれています","viewing_summary":"このトピックの要約を表示中","post_number":"%{username}、投稿 #%{post_number}","show_all":"すべて表示"}},"category":{"none":"(カテゴリなし)","all":"すべてのカテゴリ","choose":"カテゴリ\u0026hellip;","edit":"編集","edit_dialog_title":"編集: %{categoryName}","view":"カテゴリのトピックを表示","back":"カテゴリに戻る","general":"一般","settings":"設定","topic_template":"トピックテンプレート","tags":"タグ","tags_allowed_tags":"これらのタグをこのカテゴリに制限する:","tags_allowed_tag_groups":"これらのタググループをこのカテゴリに制限する:","tags_placeholder":"(オプション) 許可されたタグのリスト","tags_tab_description":"上記に指定されたタグとタググループはこのカテゴリと、それらを同様に指定したほかのカテゴリでのみ利用できるようになります。指定されていないカテゴリでは利用できません。","tag_groups_placeholder":"(オプション) 許可されたタググループのリスト","manage_tag_groups_link":"タググループの管理","allow_global_tags_label":"他のタグも許可","tag_group_selector_placeholder":"(オプション) タググループ","required_tag_group_description":"新しいトピックでタググループのタグの使用を必須とする:","min_tags_from_required_group_label":"タグ数:","required_tag_group_label":"タググループ:","topic_featured_link_allowed":"このカテゴリに注目のリンクを許可する","delete":"カテゴリを削除","create":"新規カテゴリ","create_long":"新しいカテゴリを作成する","save":"カテゴリを保存","slug":"カテゴリのスラッグ","slug_placeholder":"(オプション) URL 用のダッシュ区切りの語","creation_error":"カテゴリを作成中にエラーが発生しました。","save_error":"カテゴリを保存中にエラーが発生しました。","name":"カテゴリ名","description":"説明","logo":"カテゴリのロゴの画像","background_image":"カテゴリの背景画像","badge_colors":"バッジの色","background_color":"背景色","foreground_color":"前景色","name_placeholder":"簡単な名前にしてください","color_placeholder":"すべてのウェブ色","delete_confirm":"このカテゴリを削除してもよろしいですか？","delete_error":"カテゴリを削除中にエラーが発生しました。","list":"カテゴリをリスト表示","no_description":"このカテゴリの説明を追加してください。","change_in_category_topic":"説明を編集","already_used":"この色は他のカテゴリで使用されています。","security":"セキュリティ","security_add_group":"グループの追加","permissions":{"group":"グループ","see":"閲覧","reply":"返信","create":"作成","no_groups_selected":"アクセスを許可されたグループはありません。このカテゴリはスタッフにのみ表示されます。","everyone_has_access":"このカテゴリは公開されており、全員が閲覧、返信、および投稿の作成を行えます。権限を制限するには、\"全員\" グループに付与されている 1 つ以上の権限を削除してください。","toggle_reply":"返信権限の切り替え","toggle_full":"作成権限の切り替え","inherited":"この権限は \"全員\" から継承されます"},"special_warning":"警告: このカテゴリは事前作成されたカテゴリであるため、セキュリティ設定を編集できません。このカテゴリを使用しない場合は、転用せずに削除してください。","uncategorized_security_warning":"このカテゴリは特殊です。カテゴリのないトピックを保存するために用意されているため、セキュリティを設定できません。","uncategorized_general_warning":"このカテゴリは特殊です。カテゴリが選択されていない新しいトピックのデフォルトのカテゴリとして使用されます。この動作を適用せずにカテゴリの選択を強制するには、\u003ca href=\"%{settingLink}\"\u003eここで設定を無効にしてください\u003c/a\u003e。名前または説明を変更するには、\u003ca href=\"%{customizeLink}\"\u003eカスタマイズ/テキストコンテンツ\u003c/a\u003eに移動してください。","pending_permission_change_alert":"このカテゴリに %{group} を追加していません。このボタンをクリックして追加してください。","images":"画像","email_in":"カスタム受信メールアドレス:","email_in_allow_strangers":"登録されていない匿名のユーザーからのメールを受け取る","email_in_disabled":"メールによる新しいトピックの投稿は、サイトの設定で無効になっています。メールによる新しいトピックの投稿を有効にするには、 ","email_in_disabled_click":"\"email in\" 設定を有効にする。","mailinglist_mirror":"カテゴリはメーリングリストを反映","show_subcategory_list":"このカテゴリのトピックの上にサブカテゴリのリストを表示します。","read_only_banner":"ユーザーがこのカテゴリにトピックを作成できない場合のバナーテキスト:","num_featured_topics":"カテゴリページに表示するトピック数:","subcategory_num_featured_topics":"親カテゴリのページに掲載する注目のトピック数:","all_topics_wiki":"デフォルトで新しいトピックをウィキにする","allow_unlimited_owner_edits_on_first_post":"最初の投稿へのオーナーによる無制限の編集を許可する","subcategory_list_style":"サブカテゴリのリストのスタイル:","sort_order":"トピックリストの並べ替え順:","default_view":"デフォルトのトピックリスト:","default_top_period":"デフォルトのトップの期間:","default_list_filter":"デフォルトのリストのフィルタ:","allow_badges_label":"このカテゴリでバッジの付与を許可する","edit_permissions":"権限を編集","reviewable_by_group":"このカテゴリのコンテンツはスタッフのほか、次のユーザーもレビューできる:","review_group_name":"グループ名","require_topic_approval":"すべての新しいトピックにモデレーターの承認を必要とする","require_reply_approval":"すべての新しい返信にモデレーターの承認を必要とする","this_year":"今年","position":"カテゴリページの位置:","default_position":"デフォルトの位置","position_disabled":"カテゴリはアクティビティ順で表示されます。リスト内のカテゴリの順番を管理するには、 ","position_disabled_click":"「カテゴリの位置の固定」の設定を有効にしてください。","minimum_required_tags":"トピックに必要なタグの最小数:","parent":"親カテゴリ","num_auto_bump_daily":"毎日自動的にバンプするオープントピックの数:","navigate_to_first_post_after_read":"トピックが読まれた後最初の投稿に移動する","notifications":{"watching":{"title":"ウォッチ中","description":"このカテゴリのすべてのトピックを自動的にウォッチします。各トピックに新しい投稿があるたびに通知され、新しい返信の数が表示されます。"},"watching_first_post":{"title":"最初の投稿をウォッチ中","description":"このカテゴリの新しいトピックについて通知されますが、トピックへの返信は通知されません。"},"tracking":{"title":"追跡中","description":"カテゴリ内のすべてのトピックを自動的に追跡します。誰かがあなたを @name でメンションした場合やあなたに返信した場合は通知され、新しい返信の数が表示されます。"},"regular":{"title":"通常","description":"誰かが @ユーザー名であなたをメンションしたり、あなたに返信したりすると通知が送信されます。"},"muted":{"title":"ミュート","description":"このカテゴリの新しいトピックについて何も通知されません。また最新にも表示されません。"}},"search_priority":{"label":"検索の優先度","options":{"normal":"通常","ignore":"無視","very_low":"非常に低い","low":"低","high":"高","very_high":"非常に高い"}},"sort_options":{"default":"デフォルト","likes":"いいね！","op_likes":"元の投稿の「いいね！」","views":"表示","posts":"投稿","activity":"アクティビティ","posters":"投稿者","category":"カテゴリ","created":"作成"},"sort_ascending":"昇順","sort_descending":"降順","subcategory_list_styles":{"rows":"行","rows_with_featured_topics":"注目のトピックのある行","boxes":"ボックス","boxes_with_featured_topics":"注目のトピックのあるボックス"},"settings_sections":{"general":"一般","moderation":"介入","appearance":"外観","email":"メール"},"list_filters":{"all":"すべてのトピック","none":"サブカテゴリなし"},"colors_disabled":"category style が none であるため色を選択できません。"},"flagging":{"title":"報告していただきありがとうございます。","action":"投稿を通報","take_action":"対応する...","take_action_options":{"default":{"title":"対応する","details":"誰かの通報を待たずに、今すぐ通報する"},"suspend":{"title":"ユーザーを凍結","details":"通報のしきい値に達すると、ユーザーを凍結します"},"silence":{"title":"ユーザーを投稿禁止にする","details":"通報のしきい値に達すると、ユーザーを投稿禁止にします"}},"notify_action":"メッセージ","official_warning":"運営スタッフからの警告","delete_spammer":"迷惑行為者を削除","flag_for_review":"レビューのキューに入れる","yes_delete_spammer":"はい、迷惑行為者を削除する","ip_address_missing":"(該当なし)","hidden_email_address":"(非表示)","submit_tooltip":"非公開の通報を送信する","take_action_tooltip":"誰かの通報を待たずに、今すぐ通報する","cant":"現在、この投稿を通報することはできません。","notify_staff":"非公開でスタッフに通報","formatted_name":{"off_topic":"話題に関係ない","inappropriate":"不適切","spam":"迷惑コンテンツ"},"custom_placeholder_notify_user":"具体的に、建設的に、そして常に親切に説明しましょう。","custom_placeholder_notify_moderators":"具体的にどのような問題が発生しているか説明してください。可能なら、関連するリンクや例を含めてください。","custom_message":{"at_least":{"other":"%{count} 文字以上を入力してください"},"more":{"other":"あと %{count}..."},"left":{"other":"残り %{count}"}}},"flagging_topic":{"title":"報告していただきありがとうございます。","action":"トピックを通報","notify_action":"メッセージ"},"topic_map":{"title":"トピックの要約","participants_title":"よく投稿する人","links_title":"人気のリンク","links_shown":"リンクをもっと表示...","clicks":{"other":"%{count} クリック"}},"post_links":{"about":"この投稿のリンクをもっと表示","title":{"other":"他 %{count}"}},"topic_statuses":{"warning":{"help":"これは運営スタッフからの警告です。"},"bookmarked":{"help":"このトピックをブックマークしました"},"locked":{"help":"このトピックはクローズしています。新たに返信することはできません。"},"archived":{"help":"このトピックはアーカイブされています。凍結状態のため一切の変更ができません"},"locked_and_archived":{"help":"このトピックはクローズされ、アーカイブされています。新しい返信を受け入れず、変更することはできません"},"unpinned":{"title":"固定解除","help":"このトピックは固定解除されています。 通常の順番で表示されます"},"pinned_globally":{"title":"全体に固定","help":"このトピックは全体に固定されています。常に最新とカテゴリのトップに表示されます"},"pinned":{"title":"固定","help":"このトピックは固定されています。常にカテゴリのトップに表示されます"},"unlisted":{"help":"このトピックは非表示です。トピックリストには表示されません。直リンクでのみアクセス可能です"},"personal_message":{"title":"このトピックは個人メッセージです","help":"このトピックは個人メッセージです"}},"posts":"投稿","original_post":"元の投稿","views":"表示","views_lowercase":{"other":"表示"},"replies":"返信","views_long":{"other":"このトピックは %{number} 回表示されました"},"activity":"アクティビティ","likes":"いいね！","likes_lowercase":{"other":"いいね！"},"users":"ユーザー","users_lowercase":{"other":"ユーザー"},"category_title":"カテゴリ","history_capped_revisions":"履歴、直近の 100 回のレビジョン","changed_by":"%{author}","raw_email":{"title":"受信メール","not_available":"利用できません！"},"categories_list":"カテゴリリスト","filters":{"with_topics":"%{filter} トピック","with_category":"%{filter} %{category} トピック","latest":{"title":"最新","title_with_count":{"other":"最新 (%{count})"},"help":"最近の投稿のあるトピック"},"read":{"title":"既読","help":"既読のトピックを最後に読んだ順に表示する"},"categories":{"title":"カテゴリ","title_in":"カテゴリ - %{categoryName}","help":"カテゴリ別トピック"},"unread":{"title":"未読","title_with_count":{"other":"未読 (%{count})"},"help":"未読の投稿のあるウォッチ中または追跡中のトピック","lower_title_with_count":{"other":"未読 %{count}"}},"new":{"lower_title_with_count":{"other":"新規 %{count}"},"lower_title":"新規","title":"新規","title_with_count":{"other":"新規 (%{count})"},"help":"数日以内に作成されたトピック"},"posted":{"title":"自分の投稿","help":"投稿したトピック"},"bookmarks":{"title":"ブックマーク","help":"ブックマークしたトピック"},"category":{"title":"%{categoryName}","title_with_count":{"other":"%{categoryName} (%{count})"},"help":"%{categoryName} カテゴリの最新トピック"},"top":{"title":"人気","help":"昨年、先月、先週、または昨日で最もアクティブだったトピック","all":{"title":"全期間"},"yearly":{"title":"年間"},"quarterly":{"title":"四半期"},"monthly":{"title":"月間"},"weekly":{"title":"週間"},"daily":{"title":"日間"},"all_time":"全期間","this_year":"今年","this_quarter":"今季","this_month":"今月","this_week":"今週","today":"今日","other_periods":"人気を参照:"}},"browser_update":"残念ながら、\u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eあなたのブラウザは古すぎるため、このサイトを処理できません\u003c/a\u003e。リッチコンテンツを表示するには\u003ca href=\"https://browsehappy.com\"\u003eブラウザをアップグレード\u003c/a\u003eしてからログインして、返信してください。","permission_types":{"full":"作成 / 返信 / 閲覧","create_post":"返信 / 閲覧","readonly":"閲覧"},"lightbox":{"download":"ダウンロード","previous":"前へ (左矢印キー)","next":"次へ (右矢印キー)","counter":"%curr% / %total%","close":"閉じる (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eコンテンツ\u003c/a\u003eを読み込めませんでした。","image_load_error":"\u003ca href=\"%url%\"\u003e画像\u003c/a\u003eを読み込めませんでした。"},"cannot_render_video":"ブラウザがコーデックをサポートしていないため、この動画をレンダリングできません。","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":"、","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} または %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"ショートカットキー","jump_to":{"title":"ページ移動","home":"%{shortcut} ホーム","latest":"%{shortcut} 最新","new":"%{shortcut} 新規","unread":"%{shortcut} 未読","categories":"%{shortcut} カテゴリ","top":"%{shortcut} トップへ","bookmarks":"%{shortcut} ブックマーク","profile":"%{shortcut} プロフィール","messages":"%{shortcut} メッセージ","drafts":"%{shortcut} 下書き","next":"%{shortcut} 次のトピック","previous":"%{shortcut} 前のトピック"},"navigation":{"title":"ナビゲーション","jump":"%{shortcut} 投稿へ移動","back":"%{shortcut} 戻る","up_down":"%{shortcut} 選択を移動 \u0026uarr; \u0026darr;","open":"%{shortcut} 選択したトピックを開く","next_prev":"%{shortcut} 次/前のセクション","go_to_unread_post":"%{shortcut} 最初の未読の投稿に移動"},"application":{"title":"アプリケーション","create":"%{shortcut} 新しいトピックを作成","notifications":"%{shortcut} 通知を開く","hamburger_menu":"%{shortcut} ハンバーガーメニューを開く","user_profile_menu":"%{shortcut} ユーザーメニューを開く","show_incoming_updated_topics":"%{shortcut} 更新されたトピックを表示する","search":"%{shortcut} 検索","help":"%{shortcut} キーボードヘルプを表示する","dismiss_new":"%{shortcut} 新規を閉じる","dismiss_topics":"%{shortcut} トピックを閉じる","log_out":"%{shortcut} ログアウト"},"composing":{"title":"作成","return":"%{shortcut} コンポーザーに戻る","fullscreen":"%{shortcut} コンポーザーを全画面表示にする"},"bookmarks":{"title":"ブックマークの設定","enter":"%{shortcut} 保存して閉じる","later_today":"%{shortcut} 今日の後程","later_this_week":"%{shortcut} 今週の後半","tomorrow":"%{shortcut} 明日","next_week":"%{shortcut} 来週","next_month":"%{shortcut} 来月","next_business_week":"%{shortcut} 来週の始め","next_business_day":"%{shortcut} 翌営業日","custom":"%{shortcut} カスタム日時","none":"%{shortcut} リマインダーなし","delete":"%{shortcut} ブックマークを削除"},"actions":{"title":"操作","bookmark_topic":"%{shortcut} ブックマークのトピックを切り替える","pin_unpin_topic":"%{shortcut}トピックを固定/固定解除","share_topic":"%{shortcut} トピックを共有","share_post":"%{shortcut} 投稿を共有","reply_as_new_topic":"%{shortcut} リンクトピックとして返信","reply_topic":"%{shortcut} トピックに返信","reply_post":"%{shortcut} 投稿に返信","quote_post":"%{shortcut} 投稿を引用","like":"%{shortcut} 投稿に「いいね！」する","flag":"%{shortcut} 投稿を通報","bookmark":"%{shortcut} 投稿をブックマーク","edit":"%{shortcut} 投稿を編集","delete":"%{shortcut} 投稿を削除","mark_muted":"%{shortcut} トピックをミュート","mark_regular":"%{shortcut} レギュラー (デフォルト) トピック","mark_tracking":"%{shortcut} トピックを追跡","mark_watching":"%{shortcut} トピックをウォッチ","print":"%{shortcut} トピックを印刷","defer":"%{shortcut} トピックを未読にする","topic_admin_actions":"%{shortcut} トピックの管理者操作を開く"},"search_menu":{"title":"検索メニュー","prev_next":"%{shortcut} 選択を上下に移動","insert_url":"%{shortcut} 開いたコンポーザーに選択を挿入する"}},"badges":{"earned_n_times":{"other":"このバッジを %{count} 回獲得しました"},"granted_on":"%{date} にゲット！","others_count":"このバッジを獲得した他のユーザー (%{count})","title":"バッジ","allow_title":"このバッジをタグラインとして使用できます","multiple_grant":"これは何度でも獲得できます","badge_count":{"other":"%{count} 個のバッジ"},"more_badges":{"other":"他 %{count}"},"granted":{"other":"%{count} 個付与"},"select_badge_for_title":"タグラインとして使用するバッジを選択","none":"(なし)","successfully_granted":"%{badge} を %{username} に正常に付与しました","badge_grouping":{"getting_started":{"name":"はじめの一歩"},"community":{"name":"コミュニティ"},"trust_level":{"name":"信頼レベル"},"other":{"name":"その他"},"posting":{"name":"投稿"}},"favorite_max_reached":"これ以上のバッジをお気に入りにできません。","favorite_max_not_reached":"このバッジをお気に入りにする","favorite_count":"%{count}/%{max} 個のバッジがお気に入りに登録されています"},"download_calendar":{"download":"ダウンロード"},"tagging":{"all_tags":"すべてのタグ","other_tags":"他のタグ","selector_all_tags":"すべてのタグ","selector_no_tags":"タグなし","changed":"タグを変更しました:","tags":"タグ","choose_for_topic":"オプションのタグ","info":"情報","default_info":"このタグはどのカテゴリにも制限されておらず、同義語もありません。制限を追加するには、このタグを\u003ca href=%{basePath}/tag_groups\u003eタググループ\u003c/a\u003eに追加してください。","category_restricted":"このタグは、アクセス権限のないカテゴリに制限されています。","synonyms":"同義語","synonyms_description":"次のタグが使用されている場合、\u003cb\u003e%{base_tag_name}\u003c/b\u003e に置き換えられます。","tag_groups_info":{"other":"このタグは次のグループに属しています: %{tag_groups}。"},"category_restrictions":{"other":"次のカテゴリでのみ使用できます:"},"edit_synonyms":"同義語を管理","add_synonyms_label":"同義語の追加:","add_synonyms":"追加","add_synonyms_explanation":{"other":"これらのタグが現在使用されている場所は、\u003cb\u003e%{tag_name}\u003c/b\u003e を使用するように変更されます。この変更を行ってもよろしいですか？"},"add_synonyms_failed":"次のタグを同義語として追加できませんでした: \u003cb\u003e%{tag_names}\u003c/b\u003e。同義語が存在せず、別のタグの同義語でないことを確認してください。","remove_synonym":"同義語を削除","delete_synonym_confirm":"本当に同義語 \"%{tag_name}\" を削除しますか？","delete_tag":"タグを削除","delete_confirm":{"other":"このタグを削除して、それが割り当てられている %{count} 件のトピックから削除してもよろしいですか？"},"delete_confirm_no_topics":"このタグを削除してもよろしいですか？","delete_confirm_synonyms":{"other":"その %{count} 個の同義語も削除されます。"},"rename_tag":"タグの名前を変更","rename_instructions":"タグの新しい名前を選択:","sort_by":"並べ替え:","sort_by_count":"件数","sort_by_name":"名前","manage_groups":"タググループを管理","manage_groups_description":"グループを定義してタグを整理します","upload":"タグをアップロード","upload_description":"csv ファイルをアップロードしてタグを一括作成します","upload_instructions":"1 行に 1 つ、オプションで 'タグ名,タググループ' の形式でタググループを使用します。","upload_successful":"タグを正常にアップロードしました","delete_unused_confirmation":{"other":"%{count} 個のタグが削除されます: %{tags}"},"delete_unused_confirmation_more_tags":{"other":"%{tags} と他 %{count} 個"},"delete_no_unused_tags":"未使用のタグはありません。","tag_list_joiner":"、","delete_unused":"未使用のタグを削除","delete_unused_description":"どのトピックまたは個人メッセージにも添付されていないすべてのタグを削除します","cancel_delete_unused":"キャンセル","filters":{"without_category":"%{filter} %{tag} トピック","with_category":"%{filter} %{category} の %{tag} 件のトピック","untagged_without_category":"%{filter} タグなしのトピック","untagged_with_category":"%{filter} %{category} のタグなしのトピック"},"notifications":{"watching":{"title":"ウォッチ中","description":"このタグのついたすべてのトピックを自動的にウォッチします。すべての新しい投稿とトピックが通知され、トピックの隣に未読と新しい投稿の件数が表示されます。"},"watching_first_post":{"title":"最初の投稿をウォッチ中","description":"このタグの新規トピックは通知されますが、トピックへの返信は通知されません。"},"tracking":{"title":"追跡中","description":"このタグが付いたすべてのトピックを自動的に追跡します。トピックの隣に未読と新しい投稿の件数が表示されます。"},"regular":{"title":"通常","description":"誰かが @ユーザー名であなたをメンションしたり、あなたの投稿に返信したりすると通知が送信されます。"},"muted":{"title":"ミュート","description":"このタグのついた新しいトピックについては何も通知されず、未読タブにも表示されません。"}},"groups":{"title":"タグのグループ","about_heading":"タググループの選択または新しいタググループの作成","about_heading_empty":"まず新しいタググループを作成します","about_description":"タググループでは、1 か所で複数のタグの権限を管理できます。","new":"新しいグループ","new_title":"グループの新規作成","edit_title":"タググループの編集","tags_label":"このグループのタグ","parent_tag_label":"親タグ","parent_tag_description":"親タグがある場合、このグループのタグのみを使用できます。","one_per_topic_label":"トピック当たりこのグループから 1 つのタグに制限する","new_name":"新しいタグのグループ","name_placeholder":"名前","save":"保存","delete":"削除","confirm_delete":"このタググループを削除してもよろしいですか？","everyone_can_use":"全員がタグを使用できます。","usable_only_by_groups":"タグは全員に表示されますが、次のグループのみが使用できます。","visible_only_to_groups":"タグは次のグループにのみ表示されます","cannot_save":"タググループを保存できません。少なくとも 1 つのタグが存在し、タググループ名が空でなく、タグ権限のグループが選択されていることを確認してください。","tags_placeholder":"タグを検索または作成","parent_tag_placeholder":"オプション","select_groups_placeholder":"グループを選択...","disabled":"タグ付けは無効になっています。 "},"topics":{"none":{"unread":"未読のトピックはありません。","new":"新規トピックはありません。","read":"まだトピックを一つも読んでいません。","posted":"まだトピックを一つも投稿していません。","latest":"最新のトピックはありません。","bookmarks":"ブックマークしたトピックはありません。","top":"人気のトピックはありません。"}}},"invite":{"custom_message":"\u003ca href\u003eカスタムメッセージ\u003c/a\u003eで、招待をもう少し個人的にします。","custom_message_placeholder":"カスタムメッセージを入力","approval_not_required":"ユーザーはこの招待を承認するとすぐに自動認証されます。","custom_message_template_forum":"このフォーラムに参加しませんか？","custom_message_template_topic":"このトピックを読んでみませんか？"},"forced_anonymous":"負荷が非常に高いため、ログアウトしたユーザーに表示される内容を一時的に全員に表示しています。","forced_anonymous_login_required":"このサイトは負荷が非常に高くなっているため、現在読み込めません。数分後にもう一度お試しください。","footer_nav":{"back":"戻る","forward":"転送","share":"共有","dismiss":"閉じる"},"safe_mode":{"enabled":"セーフモードが有効になっています。セーフモードを終了するには、このブラウザウィンドウを閉じてください。"},"image_removed":"(画像は削除されました)","do_not_disturb":{"title":"おやすみモード...","label":"おやすみモード","remaining":"残り %{remaining}","options":{"half_hour":"30 分","one_hour":"１時間","two_hours":"２時間","tomorrow":"明日まで","custom":"カスタム"},"set_schedule":"通知スケジュールを設定する"},"trust_levels":{"names":{"newuser":"新規ユーザー","basic":"基本ユーザー","member":"メンバー","regular":"レギュラー","leader":"リーダー"},"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"サポートされていないファイルを選択しました。サポートされているファイルタイプ – %{types}。"},"user_activity":{"no_activity_others":"アクティビティがありません。","no_replies_others":"返信はありません。","no_likes_others":"「いいね！」した投稿はありません。"},"chat_integration":{"settings":"設定","all_categories":"(すべてのカテゴリ)","delete_channel":"削除する","edit_channel":"編集","test_modal":{"topic":"トピック","close":"投票をクローズする"},"type":{"normal":"デフォルト"},"filter":{"mute":"ミュート"},"rule_table":{"filter":"フィルター","category":"カテゴリ","tags":"タグ","edit_rule":"編集","delete_rule":"削除する"},"edit_channel_modal":{"cancel":"キャンセル"},"edit_rule_modal":{"cancel":"キャンセル","type":"タイプ","filter":"フィルター","category":"カテゴリ","group":"グループ","tags":"タグ"},"provider":{"telegram":{"param":{"name":{"title":"名前"}}},"discord":{"param":{"name":{"title":"名前"}}},"matrix":{"param":{"name":{"title":"名前"}}},"zulip":{"param":{"subject":{"title":"件名"}}},"gitter":{"param":{"name":{"title":"名前"}}}}},"details":{"title":"詳細を隠す"},"discourse_local_dates":{"relative_dates":{"today":"今日 %{time}","tomorrow":"明日 %{time}","yesterday":"昨日 %{time}","countdown":{"passed":"終了しました"}},"title":"日付/時刻を挿入","create":{"form":{"insert":"挿入","advanced_mode":"詳細モード","simple_mode":"シンプルモード","format_description":"ユーザーに日付を表示するために使用されるフォーマット。オフセットを表示するには Z、タイムゾーン名を表示するには zz を使用します。","timezones_title":"表示するタイムゾーン","timezones_description":"タイムゾーンは、プレビューとフォールバックで日付を表示するために使用されます。","recurring_title":"繰り返し","recurring_description":"イベントの繰り返しを設定します。 フォームによって生成された繰り返しオプションを手動で編集して、年、四半期、月、週、日、時間、分、秒、ミリ秒のいずれかのキーを使用することもできます。","recurring_none":"繰り返しなし","invalid_date":"日付が無効です。日付と時刻が正しいことを確認してください。","date_title":"日付","time_title":"時刻","format_title":"日付のフォーマット","timezone":"タイムゾーン","until":"終了日...","recurring":{"every_day":"毎日","every_week":"毎週","every_two_weeks":"隔週","every_month":"毎月","every_two_months":"隔月","every_three_months":"3 か月ごと","every_six_months":"6 か月毎","every_year":"毎年"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"すべての新規ユーザーに新規ユーザー向けチュートリアルを開始する","welcome_message":"すべての新規ユーザーにクイックスタートガイド付きのようこそメッセージを送信する"}},"presence":{"replying":{"other":"返信中"},"editing":{"other":"編集中"},"replying_to_topic":{"other":"返信中"}},"poll":{"voters":{"other":"投票者数"},"total_votes":{"other":"合計得票数"},"average_rating":"平均評価: \u003cstrong\u003e%{average}\u003c/strong\u003e。","public":{"title":"投票は\u003cstrong\u003e公開\u003c/strong\u003eされています。"},"results":{"groups":{"title":"このアンケートに投票するには %{groups} のメンバーである必要があります。"},"vote":{"title":"結果は\u003cstrong\u003e投票\u003c/strong\u003eしたとき表示されます。"},"closed":{"title":"結果は投票が\u003cstrong\u003eクローズ\u003c/strong\u003eになると表示されます。"},"staff":{"title":"結果は\u003cstrong\u003eスタッフ\u003c/strong\u003eメンバーにのみ表示されます。"}},"multiple":{"help":{"at_least_min_options":{"other":"少なくともオプションを \u003cstrong\u003e%{count}\u003c/strong\u003e 個を選択してください。"},"up_to_max_options":{"other":"オプションを \u003cstrong\u003e%{count}\u003c/strong\u003e 個まで選択してください。"},"x_options":{"other":"オプションを \u003cstrong\u003e%{count}\u003c/strong\u003e 個選択してください。"},"between_min_and_max_options":"\u003cstrong\u003e%{min}\u003c/strong\u003e～\u003cstrong\u003e%{max}\u003c/strong\u003e 個のオプションを選択してください。"}},"cast-votes":{"title":"投票する","label":"今すぐ投票！"},"show-results":{"title":"投票結果を表示する","label":"結果を表示する"},"hide-results":{"title":"自分の投票に戻る","label":"投票を表示する"},"group-results":{"title":"ユーザーフィールド別に投票をグループ化","label":"内訳を表示する"},"export-results":{"title":"投票結果をエクスポートする","label":"エクスポート"},"open":{"title":"投票をオープンする","label":"オープン","confirm":"この投票をオープンにしてもよろしいですか？"},"close":{"title":"投票をクローズする","label":"クローズ","confirm":"この投票をクローズしてもよろしいですか？"},"automatic_close":{"closes_in":"\u003cstrong\u003e%{timeLeft}\u003c/strong\u003e でクローズします。","age":"\u003cstrong\u003e%{age}\u003c/strong\u003e にクローズ"},"breakdown":{"title":"投票結果","votes":"%{count} 票","breakdown":"内訳","percentage":"割合","count":"票数"},"error_while_toggling_status":"この投票のステータスを切り替える際にエラーが発生しました。","error_while_casting_votes":"投票の際にエラーが発生しました。","error_while_fetching_voters":"投票者を表示する際にエラーが発生しました。","error_while_exporting_results":"投票結果のエクスポート中にエラーが発生しました。","ui_builder":{"title":"投票を作成","insert":"投票の挿入","help":{"options_min_count":"少なくとも1つのオプションを入力してください。","options_max_count":"オプションを %{count} 個まで入力してください。","invalid_min_value":"最小値は少なくとも 1 である必要があります。","invalid_max_value":"最大値は少なくとも 1 である必要がありますが、オプションの数以下である必要があります。","invalid_values":"最小値は最大値より小さくなければなりません。","min_step_value":"最小ステップの値は 1 です"},"poll_type":{"label":"タイプ","regular":"単一選択","multiple":"複数選択","number":"数字評価"},"poll_result":{"label":"結果を表示する...","always":"常に表示","vote":"投票後のみ","closed":"投票がクローズされたとき","staff":"スタッフのみ"},"poll_groups":{"label":"次のグループに投票を制限する"},"poll_chart_type":{"label":"結果グラフ","bar":"棒","pie":"円グラフ"},"poll_config":{"max":"最大選択肢数","min":"最小選択肢数","step":"間隔"},"poll_public":{"label":"投票者を表示する"},"poll_title":{"label":"タイトル (オプション)"},"poll_options":{"label":"オプション (1 行に 1 つ)","add":"オプションを追加"},"automatic_close":{"label":"投票を自動的にクローズする"},"show_advanced":"高度なオプションを表示","hide_advanced":"高度なオプションを非表示"}},"styleguide":{"title":"スタイルガイド","welcome":"開始するには、左側のメニューからセクションを選択します。","categories":{"atoms":"原子","molecules":"分子","organisms":"有機体"},"sections":{"typography":{"title":"タイポグラフィ","example":"Discourse へようこそ","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"日付/時刻の入力"},"font_scale":{"title":"フォントシステム"},"colors":{"title":"色"},"icons":{"title":"アイコン","full_list":"Font Awesome Icons の全リストを表示"},"input_fields":{"title":"入力フィールド"},"buttons":{"title":"ボタン"},"dropdowns":{"title":"ドロップダウン"},"categories":{"title":"カテゴリ"},"bread_crumbs":{"title":"パンくずリスト"},"navigation":{"title":"ナビゲーション"},"navigation_bar":{"title":"ナビゲーションバー"},"navigation_stacked":{"title":"スタックナビゲーション"},"categories_list":{"title":"カテゴリリスト"},"topic_link":{"title":"トピックリンク"},"topic_list_item":{"title":"トピックリスト項目"},"topic_statuses":{"title":"トピックのステータス"},"topic_list":{"title":"トピックリスト"},"basic_topic_list":{"title":"基本トピックリスト"},"footer_message":{"title":"フッターメッセージ"},"signup_cta":{"title":"アカウント登録 CTA"},"topic_timer_info":{"title":"トピックタイマー"},"topic_footer_buttons":{"title":"トピックフッターボタン"},"topic_notifications":{"title":"トピック通知"},"post":{"title":"投稿"},"topic_map":{"title":"トピックマップ"},"site_header":{"title":"サイトヘッダー"},"suggested_topics":{"title":"推奨トピック"},"post_menu":{"title":"投稿メニュー"},"modal":{"title":"モーダル","header":"モーダルタイトル","footer":"モーダルフッター"},"user_about":{"title":"ユーザープロフィールボックス"},"header_icons":{"title":"ヘッダーアイコン"},"spinners":{"title":"スピナー"}}}}},"en":{"js":{"number":{"human":{"storage_units":{"units":{"byte":{"one":"Byte"}}}}},"dates":{"tiny":{"less_than_x_seconds":{"one":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m"},"about_x_hours":{"one":"%{count}h"},"x_days":{"one":"%{count}d"},"x_months":{"one":"%{count}mon"},"about_x_years":{"one":"%{count}y"},"over_x_years":{"one":"\u003e %{count}y"},"almost_x_years":{"one":"%{count}y"}},"medium":{"x_minutes":{"one":"%{count} min"},"x_hours":{"one":"%{count} hour"},"x_days":{"one":"%{count} day"}},"medium_with_ago":{"x_minutes":{"one":"%{count} min ago"},"x_hours":{"one":"%{count} hour ago"},"x_days":{"one":"%{count} day ago"},"x_months":{"one":"%{count} month ago"},"x_years":{"one":"%{count} year ago"}},"later":{"x_days":{"one":"%{count} day later"},"x_months":{"one":"%{count} month later"},"x_years":{"one":"%{count} year later"}},"from_placeholder":"from date"},"skip_to_main_content":"Skip to main content","bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined."},"s3":{"regions":{"eu_south_1":"EU (Milan)"}},"links_lowercase":{"one":"link"},"x_more":{"one":"%{count} More"},"character_count":{"one":"%{count} character"},"period_chooser":{"aria_label":"Filter by period"},"bookmarked":{"help":{"edit_bookmark_for_topic":"Click to edit the bookmark for this topic"}},"drafts":{"label_with_count":"Drafts (%{count})"},"topic_count_categories":{"one":"See %{count} new or updated topic"},"topic_count_latest":{"one":"See %{count} new or updated topic"},"topic_count_unseen":{"one":"See %{count} new or updated topic"},"topic_count_unread":{"one":"See %{count} unread topic"},"topic_count_new":{"one":"See %{count} new topic"},"review":{"date_filter":"Posted between","topic_has_pending":{"one":"This topic has \u003cb\u003e%{count}\u003c/b\u003e post pending approval"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)"},"agreed":{"one":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore"}},"topics":{"unique_users":{"one":"%{count} user"}},"replies":{"one":"%{count} reply"},"approval":{"pending_posts":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e post pending."}}},"relative_time_picker":{"minutes":{"one":"minute"},"hours":{"one":"hour"},"days":{"one":"day"},"months":{"one":"month"},"years":{"one":"year"}},"directory":{"total_rows":{"one":"%{count} user"}},"groups":{"title":{"one":"Group"},"members":{"no_filter_matches":"No members match that search."}},"categories":{"topic_sentence":{"one":"%{count} topic"},"topic_stat":{"one":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month."}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"sr_expand_profile":"Expand profile details","sr_collapse_profile":"Collapse profile details","no_notifications_page_body":"You will be notified about activity directly relevant to you, including replies to your topics and posts, when someone \u003cb\u003e@mentions\u003c/b\u003e you or quotes you, and replies to topics you are watching. Notifications will also be sent to your email when you haven’t logged in for a while. \u003cbr\u003e\u003cbr\u003e Look for the %{icon} to decide which specific topics, categories and tags you want to be notified about. For more, see your \u003ca href='%{preferencesUrl}'\u003enotification preferences\u003c/a\u003e.\n","messages":{"all":"all inboxes","personal":"Personal","unread_with_count":{"one":"Unread (%{count})"},"new_with_count":{"one":"New (%{count})"},"read_more_in_group":"Want to read more? Browse other messages in %{groupLink}.","read_more":"Want to read more? Browse other messages in \u003ca href='%{basePath}/u/%{username}/message'\u003epersonal messages\u003c/a\u003e."},"second_factor_backup":{"manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."}},"email":{"frequency":{"one":"We'll only email you if we haven't seen you in the last minute."}},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}},"invited":{"truncated":{"one":"Showing the first invite."}},"summary":{"topic_count":{"one":"topic created"},"post_count":{"one":"post created"},"likes_given":{"one":"given"},"likes_received":{"one":"received"},"days_visited":{"one":"day visited"},"topics_entered":{"one":"topic viewed"},"posts_read":{"one":"post read"},"bookmark_count":{"one":"bookmark"}}},"replies_lowercase":{"one":"reply"},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply."},"short_label":"Summarize","short_title":"Show a summary of this topic: the most interesting posts as determined by the community"},"create_account":{"associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"login":{"google_oauth2":{"sr_title":"Login with Google"},"twitter":{"sr_title":"Login with Twitter"},"instagram":{"sr_title":"Login with Instagram"},"facebook":{"sr_title":"Login with Facebook"},"github":{"sr_title":"Login with GitHub"},"discord":{"sr_title":"Login with Discord"}},"category_row":{"topic_count":{"one":"%{count} topic in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory"},"plus_subcategories":{"one":"+ %{count} subcategory"}},"select_kit":{"results_count":{"one":"%{count} result","other":"%{count} results"},"max_content_reached":{"one":"You can only select %{count} item."},"min_content_not_reached":{"one":"Select at least %{count} item."},"invalid_selection_length":{"one":"Selection must be at least %{count} character."}},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified."},"group_mentioned":{"one":"By mentioning %{group}, you are about to notify \u003ca href='%{group_link}'\u003e%{count} person\u003c/a\u003e – are you sure?"},"error":{"title_too_short":{"one":"Title must be at least %{count} character"},"title_too_long":{"one":"Title can't be more than %{count} character"},"post_length":{"one":"Post must be at least %{count} character"},"tags_missing":{"one":"You must choose at least %{count} tag"}},"title":"Or press %{modifier}Enter"},"notifications":{"tooltip":{"regular":{"one":"%{count} unseen notification"},"message":{"one":"%{count} unread message"},"high_priority":{"one":"%{count} unread high priority notification"}},"liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"liked %{count} of your posts"},"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'"},"group_message_summary":{"one":"%{count} message in your %{group_name} inbox"}},"search":{"open_advanced":"Open advanced search","clear_search":"Clear search","sort_or_bulk_actions":"Sort or bulk select results","result_count":{"one":"\u003cspan\u003e%{count} result for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"search_term_label":"enter search keyword","in":"in","in_this_topic":"in this topic","in_topics_posts":"in all topics and posts","enter_hint":"or press Enter","in_posts_by":"in posts by %{username}","type":{"default":"Topics/posts","categories_and_tags":"Categories/tags"},"tips":{"category_tag":"filters by category or tag","author":"filters by post author","in":"filters by metadata (e.g. in:title, in:personal, in:pinned)","status":"filters by topic status","full_search":"launches full page search","full_search_key":"%{modifier} + Enter"},"advanced":{"title":"Advanced filters","posted_by":{"aria_label":"Filter by post author"},"with_tags":{"aria_label":"Filter using tags"},"post":{"min":{"aria_label":"filter by minimum number of posts"},"max":{"aria_label":"filter by maximum number of posts"},"time":{"aria_label":"Filter by posted date"}},"min_views":{"aria_label":"filter by minimum views"},"max_views":{"aria_label":"filter by maximum views"},"additional_options":{"label":"Filter by post count and topic views"}}},"hamburger_menu":"menu","topics":{"bulk":{"dismiss_read_with_selected":{"one":"Dismiss %{count} unread"},"dismiss_button_with_selected":{"one":"Dismiss (%{count})…"},"dismiss_new_with_selected":{"one":"Dismiss New (%{count})"},"change_category":"Set Category...","notification_level":"Notifications...","selected":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e topic."},"confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic"}},"none":{"unseen":"You have no unseen topics."},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"filter_to":{"one":"%{count} post in topic"},"new_topics":{"one":"%{count} new topic"},"unread_topics":{"one":"%{count} unread topic"},"unread_posts":{"one":"you have %{count} unread post in this topic"},"likes":{"one":"there is %{count} like in this topic"},"topic_status_update":{"duration":"Duration"},"auto_close_immediate":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed immediately."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post"}},"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."},"share":{"notify_users":{"success":{"one":"Successfully notified %{username} about this topic."}}},"feature_topic":{"already_pinned":{"one":"Topics currently pinned in %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"},"already_pinned_globally":{"one":"Topics currently pinned globally: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"}},"filters":{"n_posts":{"one":"%{count} post"}},"split_topic":{"instructions":{"one":"You are about to create a new topic and populate it with the post you've selected."}},"merge_topic":{"instructions":{"one":"Please choose the topic you'd like to move that post to."}},"move_to_new_message":{"instructions":{"one":"You are about to create a new message and populate it with the post you've selected."}},"move_to_existing_message":{"instructions":{"one":"Please choose the message you'd like to move that post to."}},"change_owner":{"instructions":{"one":"Please choose a new owner for the post by \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Please choose a new owner for the post"}},"multi_select":{"description":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e post."}}},"post":{"quote_reply_shortcut":"Or press q","quote_edit_shortcut":"Or press e","gap":{"one":"view %{count} hidden reply"},"has_replies":{"one":"%{count} Reply"},"has_likes_title":{"one":"%{count} person liked this post"},"has_likes_title_you":{"one":"you and %{count} other person liked this post"},"filtered_replies_hint":{"one":"View this post and its reply"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to"},"errors":{"file_too_large_humanized":"Sorry, that file is too big (maximum size is %{max_size}). Why not upload your large file to a cloud sharing service, then paste the link?","too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time."}},"controls":{"delete_replies":{"direct_replies":{"one":"Yes, and %{count} direct reply"},"all_replies":{"one":"Yes, and %{count} reply"}},"permanently_delete":"Permanently Delete","permanently_delete_confirmation":"Are you sure you permanently want to delete this post? You will not be able to recover it.","change_owner":"Change Ownership...","grant_badge":"Grant Badge...","delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"},"add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice..."},"actions":{"people":{"like":{"one":"liked this"},"read":{"one":"read this"},"like_capped":{"one":"and %{count} other liked this"},"read_capped":{"one":"and %{count} other read this"}}},"delete":{"confirm":{"one":"Are you sure you want to delete that post?"}},"merge":{"confirm":{"one":"Are you sure you want to merge those posts?"}},"bookmarks":{"create_for_topic":"Create bookmark for topic","edit_for_topic":"Edit bookmark for topic"}},"category":{"default_slow_mode":"Enable \"Slow Mode\" for new topics in this category.","notifications":{"title":"change notification level for this category"}},"flagging":{"custom_message":{"at_least":{"one":"enter at least %{count} character"},"more":{"one":"%{count} to go..."},"left":{"one":"%{count} remaining"}}},"topic_map":{"clicks":{"one":"%{count} click"}},"post_links":{"title":{"one":"%{count} more"}},"views_lowercase":{"one":"view"},"views_long":{"one":"this topic has been viewed %{count} time"},"likes_lowercase":{"one":"like"},"users_lowercase":{"one":"user"},"history":"History","filters":{"latest":{"title_with_count":{"one":"Latest (%{count})"}},"unread":{"title_with_count":{"one":"Unread (%{count})"},"lower_title_with_count":{"one":"%{count} unread"}},"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"},"new":{"lower_title_with_count":{"one":"%{count} new"},"title_with_count":{"one":"New (%{count})"}},"category":{"title_with_count":{"one":"%{categoryName} (%{count})"}}},"badges":{"earned_n_times":{"one":"Earned this badge %{count} time"},"badge_count":{"one":"%{count} Badge"},"more_badges":{"one":"+%{count} More"},"granted":{"one":"%{count} granted"}},"download_calendar":{"title":"Download calendar","save_ics":"Download .ics file","save_google":"Add to Google calendar","remember":"Don’t ask me again","remember_explanation":"(you can change this preference in your user prefs)","default_calendar":"Default calendar","default_calendar_instruction":"Determine which calendar should be used when dates are saved","add_to_calendar":"Add to calendar","google":"Google Calendar","ics":"ICS"},"tagging":{"tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\"."},"category_restrictions":{"one":"It can only be used in this category:"},"add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"delete_confirm":{"one":"Are you sure you want to delete this tag and remove it from %{count} topic it is assigned to?"},"delete_confirm_synonyms":{"one":"Its synonym will also be deleted."},"delete_unused_confirmation":{"one":"%{count} tag will be deleted: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} and %{count} more"},"topics":{"none":{"unseen":"You have no unseen topics."}}},"user_activity":{"no_activity_title":"No activity yet","no_activity_body":"Welcome to our community! You are brand new here and have not yet contributed to discussions. As a first step, visit \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e and just start reading! Select %{heartIcon} on posts that you like or want to learn more about. If you have not already done so, help others get to know you by adding a picture and bio in your \u003ca href='%{preferencesUrl}'\u003euser preferences\u003c/a\u003e.","no_replies_title":"You have not replied to any topics yet","no_drafts_title":"You haven’t started any drafts","no_drafts_body":"Not quite ready to post? We’ll automatically save a new draft and list it here whenever you start composing a topic, reply, or personal message. Select the cancel button to discard or save your draft to continue later.","no_likes_title":"You haven’t liked any topics yet","no_likes_body":"A great way to jump in and start contributing is to start reading conversations that have already taken place, and select the %{heartIcon} on posts that you like!","no_topics_title":"You have not started any topics yet","no_read_topics_title":"You haven’t read any topics yet","no_read_topics_body":"Once you start reading discussions, you’ll see a list here. To start reading, look for topics that interest you in \u003ca href='%{topUrl}'\u003eTop\u003c/a\u003e or \u003ca href='%{categoriesUrl}'\u003eCategories\u003c/a\u003e or search by keyword %{searchIcon}"},"no_group_messages_title":"No group messages found","admin":{"site_settings":{"categories":{"chat_integration":"Chat Integrations"}}},"chat_integration":{"menu_title":"Chat Integrations","no_providers":"You need to enable some providers in the plugin settings","channels_with_errors":"Some channels for this provider failed last time messages were sent. Click the error icon(s) to learn more.","channel_exception":"An unknown error occured when a message was last sent to this channel.","group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","choose_group":"(choose a group)","all_tags":"(all tags)","create_rule":"Create Rule","create_channel":"Create Channel","test_channel":"Test","channel_delete_confirm":"Are you sure you want to delete this channel? All associated rules will be deleted.","test_modal":{"title":"Send a test message","send":"Send Test Message","error":"An unknown error occured while sending the message. Check the site logs for more information.","success":"Message sent successfully"},"type":{"group_message":"Group Message","group_mention":"Group Mention"},"filter":{"follow":"First post only","watch":"All posts and replies","thread":"All posts with threaded replies"},"edit_channel_modal":{"title":"Edit Channel","save":"Save Channel","provider":"Provider","channel_validation":{"ok":"Valid","fail":"Invalid format"}},"edit_rule_modal":{"title":"Edit Rule","save":"Save Rule","provider":"Provider","channel":"Channel","instructions":{"type":"Change the type to trigger notifications for group messages or mentions","filter":"Notification level. Mute overrides other matching rules","category":"This rule will only apply to topics in the specified category","group":"This rule will apply to posts referencing this group","tags":"If specified, this rule will only apply to topics which have at least one of these tags"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"action_prohibited":"The bot does not have permission to post to that channel","channel_not_found":"The specified channel does not exist on slack"}},"telegram":{"title":"Telegram","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Telegram."},"chat_id":{"title":"Chat ID","help":"A number given to you by the bot, or a broadcast channel identifier in the form @channelname"}},"errors":{"channel_not_found":"The specified channel does not exist on Telegram","forbidden":"The bot does not have permission to post to this channel"}},"discord":{"title":"Discord","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Discord."},"webhook_url":{"title":"Webhook URL","help":"The webhook URL created in your Discord server settings"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"channel_not_found":"The specified channel does not exist on Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"help":"A name to describe the channel. It is not used for the connection to Matrix."},"room_id":{"title":"Room ID","help":"The 'private identifier' for the room. It should look something like !abcdefg:matrix.org"}},"errors":{"unknown_token":"Access token is invalid","unknown_room":"Room ID is invalid"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"The name of the Zulip stream the message should be sent to. e.g. 'general'"},"subject":{"help":"The subject that these messages sent by the bot should be given"}},"errors":{"does_not_exist":"That stream does not exist on Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"Channel","help":"e.g. #channel, @username."}},"errors":{"invalid_channel":"That channel does not exist on Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"help":"A Gitter room's name e.g. gitterHQ/services."},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new integration in a Gitter room."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow Token","help":"The flow token provided after creating a source for a flow into which you want to send messages."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Name","help":"A name for the channel (only shown in the Discourse admin interface)"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new webhook"}}}}},"discourse_local_dates":{"default_title":"%{site_name} Event"},"presence":{"replying":{"one":"replying"},"editing":{"one":"editing"},"replying_to_topic":{"one":"replying"}},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"poll":{"voters":{"one":"voter"},"total_votes":{"one":"total vote"},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option."}}},"remove-vote":{"title":"Remove your vote","label":"Remove vote"}}}}};
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

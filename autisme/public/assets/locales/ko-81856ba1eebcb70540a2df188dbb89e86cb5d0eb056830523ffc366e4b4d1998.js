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
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">토론을 시작합니다!</a> ";
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
})() + "</strong> 글";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 글";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " 과 ";
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
})() + "</strong> 댓글";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 댓글";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "이 있습니다. 방문자가 더 많은";
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
})() + "</strong> 글";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 글";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " 및 ";
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
})() + "</strong> 댓글";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> 댓글";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "을 읽고 작성하도록 권장합니다. 이 메시지는 관리자만 볼 수 있습니다.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">토론을 시작</a> 합시다 <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">!</a> ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "가 있습니다. 방문자는 더 읽고 답장해야합니다. 적어도 ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "을 (를) 권장합니다. 직원 만이 메시지를 볼 수 있습니다.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "<a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">토론을 시작</a> 합시다 <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">!</a> ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "가 있습니다. 방문자는 더 읽고 답장해야합니다. – ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " 이상을 권장합니다. 직원 만이 메시지를 볼 수 있습니다.";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> 사이트 설정 한계에 도달 ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> 사이트 설정 한계에 도달 ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> 사이트 설정 제한 초과 ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> 사이트 설정 제한 초과 ";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
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
}, "admin.user.delete_all_posts_confirm_MF" : function(d){
var r = "";
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
})() + " 댓글";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 댓글";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " 그리고 ";
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
})() + " 글";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " 글";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " 을 삭제하려고 합니다. 확실합니까?";
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += (pf_0[ MessageFormat.locale["ko"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
}};
MessageFormat.locale.ko = function ( n ) {
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

I18n.translations = {"ko":{"js":{"number":{"format":{"separator":".","delimiter":","},"human":{"storage_units":{"format":"%n %u","units":{"byte":{"other":"바이트"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}천","millions":"%{number}백만"}},"dates":{"time":"HH:mm","time_with_zone":"HH:mm (z)","time_short_day":"ddd, HH:mm","timeline_date":"YYYY MMM","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"MMM D","full_no_year_no_time":"MMMM Do","long_with_year":"YYYY MMM D a h:mm","long_with_year_no_time":"YYYY MMM D","full_with_year_no_time":"YYYY MMMM Do","long_date_with_year":"'YY MMM D. LT","long_date_without_year":"MMM D, LT","long_date_with_year_without_time":"'YY MMM D","long_date_without_year_with_linebreak":"MMM D \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"'YY MMM D \u003cbr/\u003eLT","wrap_ago":"%{date}전","tiny":{"half_a_minute":"\u003c 1분","less_than_x_seconds":{"other":"\u003c %{count}초"},"x_seconds":{"other":"%{count}초"},"less_than_x_minutes":{"other":"\u003c %{count}분"},"x_minutes":{"other":"%{count}분"},"about_x_hours":{"other":"%{count}시간"},"x_days":{"other":"%{count}일 전"},"x_months":{"other":"%{count}달"},"about_x_years":{"other":"%{count}년"},"over_x_years":{"other":"\u003e %{count}년"},"almost_x_years":{"other":"%{count}년"},"date_month":"MMM D","date_year":"'YY MMM"},"medium":{"x_minutes":{"other":"%{count}분"},"x_hours":{"other":"%{count}시간"},"x_days":{"other":"%{count}일"},"date_year":"'YY MMM D"},"medium_with_ago":{"x_minutes":{"other":"%{count}분 전"},"x_hours":{"other":"%{count}시간 전"},"x_days":{"other":"%{count}일 전"},"x_months":{"other":"%{count}달 전"},"x_years":{"other":"%{count}년 전"}},"later":{"x_days":{"other":"%{count}일 후"},"x_months":{"other":"%{count}달 후"},"x_years":{"other":"%{count}년 후"}},"previous_month":"지난 달","next_month":"다음 달","placeholder":"날짜"},"share":{"topic_html":"글: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"댓글 #%{postNumber}","close":"닫기","twitter":"트위터에 공유","facebook":"페이스북에 공유","email":"이메일로 공유","url":"URL 복사 및 공유"},"action_codes":{"public_topic":"이 글을 %{when}에 공개","private_topic":"이 글을 개인 메시지로 설정 %{when}","split_topic":"이 글을 %{when}에 분리","invited_user":"%{when}에 %{who}님이 초대됨","invited_group":"%{when}에 %{who}님이 초대됨","user_left":"%{who}님이 %{when}에 이 메시지에서 자신을 제거 했습니다","removed_user":"%{when}에 %{who}님이 삭제됨","removed_group":"%{when}에 %{who}님이 삭제됨","autobumped":"%{when}에 자동으로 끌어 올려짐","autoclosed":{"enabled":"%{when}에 닫힘","disabled":"%{when}에 열림"},"closed":{"enabled":"%{when}에 닫힘","disabled":"%{when}에 열림"},"archived":{"enabled":"%{when}에 보관됨","disabled":"%{when}에 보관 취소됨"},"pinned":{"enabled":"%{when}에 고정됨","disabled":"%{when}에 고정 해제됨"},"pinned_globally":{"enabled":"%{when}에 전체적으로 고정됨","disabled":"%{when}에 고정 해제됨"},"visible":{"enabled":"%{when}에 목록에 게시","disabled":"%{when}에 목록에서 감춤"},"banner":{"enabled":"%{when}에 배너를 만들었습니다. 사용자가 닫을 때까지 모든 페이지의 상단에 나타납니다.","disabled":"%{when}에 이 배너를 제거했습니다. 더 이상 모든 페이지의 상단에 표시되지 않습니다."},"forwarded":"위의 이메일을 전달했습니다."},"topic_admin_menu":"글 관리","wizard_required":"새로운 Discourse에 오신것을 환영합니다! \u003ca href='%{url}' data-auto-route='true'\u003e설치 마법사\u003c/a\u003e로 시작합니다 ✨","emails_are_disabled":"관리자에 의해 모든 이메일의 발신이 비활성화 되었습니다. 어떤 종류의 이메일 알림도 전송되지 않습니다.","bootstrap_mode_enabled":{"other":"쉬운 시작을 위해 부트스트랩 모드로 구동 되었습니다. 모든 새로운 사용자에게 회원 레벨 1이 부여되고 이메일로 매일 요약 전송이 활성화됩니다. %{count}명의 사용자가 가입하면 자동으로 해제됩니다."},"bootstrap_mode_disabled":"Bootstrap 모드가 24시간 이내에 해제됩니다.","themes":{"default_description":"기본","broken_theme_alert":"테마 / %{theme} 구성 요소에 오류가있어 사이트가 작동하지 않을 수 있습니다. %{path}에서 비활성화 하십시오."},"s3":{"regions":{"ap_northeast_1":"아시아 태평양 (도쿄)","ap_northeast_2":"아시아 태평양 (서울)","ap_south_1":"아시아 태평양 (뭄바이)","ap_southeast_1":"아시아 태평양 (싱가폴)","ap_southeast_2":"아시아 태평양 (시드니)","ca_central_1":"캐나다 (중부)","cn_north_1":"중국 (베이징)","cn_northwest_1":"중국 (닝샤)","eu_central_1":"EU (프랑크푸르트)","eu_north_1":"EU (스톡홀름)","eu_west_1":"EU (아일랜드)","eu_west_2":"EU (런던)","eu_west_3":"EU (파리)","sa_east_1":"남아메리카 (상파울루)","us_east_1":"미국 동부 (버지니아 북부)","us_east_2":"미국 동부 (오하이오)","us_gov_east_1":"AWS GovCloud (미국 동부)","us_gov_west_1":"AWS GovCloud (미국 서부)","us_west_1":"미국 서부 (N. 캘리포니아)","us_west_2":"미국 서부 (오리건)"}},"clear_input":"입력 지우기","edit":"이 글의 제목과 카테고리 편집","expand":"확장","not_implemented":"죄송합니다. 아직 사용할 수 없는 기능입니다.","no_value":"아니오","yes_value":"예","submit":"확인","generic_error":"죄송합니다. 오류가 발생했습니다.","generic_error_with_reason":"오류가 발생했습니다: %{error}","go_ahead":"계속하기","sign_up":"회원가입","log_in":"로그인","age":"나이","joined":"가입","admin_title":"관리자","show_more":"더 보기","show_help":"옵션","links":"링크","links_lowercase":{"other":"링크"},"faq":"자주하는 질문","guidelines":"가이드라인","privacy_policy":"개인 정보 보호 정책","privacy":"개인 정보 처리 방침","tos":"서비스 약관","rules":"규칙","conduct":"행동 강령","mobile_view":"모바일 보기","desktop_view":"데스크톱 보기","you":"사용자님","or":"또는","now":"방금","read_more":"더 보기","more":"더 보기","x_more":{"other":"%{count}개 더보기"},"less":"덜","never":"전혀","every_30_minutes":"30분마다","every_hour":"매 시간마다","daily":"매일","weekly":"매주","every_month":"매달","every_six_months":"6개월마다","max_of_count":"최대 %{count}","alternation":"또는","character_count":{"other":"%{count} 글자"},"related_messages":{"title":"관련 메시지","see_all":"@%{username}의 모든 메시지 \u003ca href=\"%{path}\"\u003e보기\u003c/a\u003e..."},"suggested_topics":{"title":"주요 글","pm_title":"제안 메시지"},"about":{"simple_title":"소개","title":"소개: %{title}","stats":"사이트 통계","our_admins":"관리자","our_moderators":"관리자","moderators":"관리자","stat":{"all_time":"전체","last_7_days":"지난 7일","last_30_days":"지난 30일"},"like_count":"좋아요","topic_count":"글","post_count":"게시물","user_count":"사용자","active_user_count":"활성 사용자","contact":"문의하기","contact_info":"이 사이트에 영향을 미치는 중대한 문제 또는 긴급한 문제가 발생하는 경우 %{contact_info} 에 문의하십시오."},"bookmarked":{"title":"북마크","clear_bookmarks":"북마크 취소","help":{"bookmark":"이 글의 첫 번째 게시물을 북마크하려면 클릭하세요.","unbookmark":"이 항목의 모든 북마크를 제거하려면 클릭하십시오.","unbookmark_with_reminder":"이 항목의 모든 북마크 및 미리 알림을 제거하려면 클릭하십시오. 이 글에 대해 알림이 %{reminder_at} 으로 설정되었습니다."}},"bookmarks":{"created":"이 글을 북마크했습니다. %{name}","not_bookmarked":"이 글을 북마크","created_with_reminder":"알림 %{date}으로 이 글을 북마크했습니다. %{name}","remove":"북마크 삭제","delete":"북마크 삭제","confirm_delete":"이 북마크를 삭제 하시겠습니까? 알림도 삭제됩니다.","confirm_clear":"이 글의 모든 북마크를 지우시겠습니까?","save":"저장","no_timezone":"아직 시간대를 설정하지 않았습니다. 미리 알림을 설정할 수 없습니다. \u003ca href=\"%{basePath}/my/preferences/profile\"\u003e프로필에서 설정\u003c/a\u003e 하세요.","invalid_custom_datetime":"입력한 날짜와 시간이 잘못되었습니다. 다시 시도하십시오.","list_permission_denied":"이 사용자의 북마크를 볼 수있는 권한이 없습니다.","no_user_bookmarks":"북마크된 게시물이 없습니다. 북마크를 사용하면 특정 게시물을 빠르게 확인 할 수 있습니다.","auto_delete_preference":{"label":"자동 삭제","never":"절대","when_reminder_sent":"알림이 전송되면","on_owner_reply":"이 글에 댓글을 작성한 후"},"search_placeholder":"이름, 글 제목 또는 내용으로 북마크 검색","search":"검색","reminders":{"later_today":"오늘 나중에","next_business_day":"다음 영업일","tomorrow":"내일","next_week":"다음 주","post_local_date":"게시 날짜","later_this_week":"이번 주말","start_of_next_business_week":"월요일","start_of_next_business_week_alt":"다음주 월요일","next_month":"다음 달","custom":"사용자 지정 날짜 및 시간","last_custom":"마지막","none":"알림이 필요하지 않습니다","today_with_time":"오늘 %{time}","tomorrow_with_time":"내일 %{time}","at_time":"%{date_time}","existing_reminder":"이 북마크는 %{at_date_time}에 미리 알림이 설정되어 있습니다"}},"copy_codeblock":{"copied":"복사되었습니다!"},"drafts":{"resume":"이력서","remove":"삭제","remove_confirmation":"이 초안을 삭제 하시겠습니까?","new_topic":"새 글 초안","new_private_message":"새 비공개 메시지 초안","topic_reply":"임시 댓글","abandon":{"confirm":"이 글의 다른 초안을 이미 열었습니다. 해당 초안을 포기하시겠습니까?","yes_value":"예, 포기합니다","no_value":"아니요, 유지합니다"}},"topic_count_latest":{"other":"%{count}개의 새글 또는 업데이트 된 글 보기"},"topic_count_unread":{"other":"%{count}개의 읽지 않은 글 보기"},"topic_count_new":{"other":"%{count}개의 새로운 글 보기"},"preview":"미리보기","cancel":"취소","deleting":"삭제 중...","save":"변경사항 저장","saving":"저장하는 중...","saved":"저장되었습니다!","upload":"업로드","uploading":"업로드 중...","uploading_filename":"업르도 중: %{filename}...","clipboard":"클립보드","uploaded":"업로드 되었습니다!","pasting":"붙여넣기 중...","enable":"활성화","disable":"비활성화","continue":"계속하기","undo":"실행 취소","revert":"되돌리기","failed":"실패","switch_to_anon":"익명 모드 시작","switch_from_anon":"익명 모드 종료","banner":{"close":"이 배너를 닫습니다.","edit":"이 배너 편집 \u003e\u003e"},"pwa":{"install_banner":"이 장치에 \u003ca href\u003e%{title} 바로가기를 만드시겠습니까?\u003c/a\u003e"},"choose_topic":{"none_found":"글을 찾을 수 없습니다.","title":{"search":"글 검색","placeholder":"여기에 글 제목, URL 또는 ID를 입력하십시오"}},"choose_message":{"none_found":"메시지가 없습니다.","title":{"search":"메시지 검색","placeholder":"여기에 글 제목, URL 또는 ID를 입력하십시오"}},"review":{"order_by":"정렬","in_reply_to":"다음에 댓글","explain":{"why":"이 항목이 대기열에있는 이유 설명","title":"검토 가능한 점수","formula":"공식","subtotal":"소계","total":"합계","min_score_visibility":"가시성에 대한 최소 점수","score_to_hide":"게시물 숨기기 점수","take_action_bonus":{"name":"조치를 취했습니다","title":"관리자가 신고를 처리하면 보너스가 부여됩니다."},"user_accuracy_bonus":{"name":"사용자 정확도","title":"신고가 처리된 경우 신고자 에게는 보너스가 주어집니다."},"trust_level_bonus":{"name":"회원 레벨","title":"회원 레벨이 놓은 사용자가 만든 검토 항목의 점수가 높습니다."},"type_bonus":{"name":"유형 보너스","title":"특정한 검토 유형에는 관리자가 보너스를 할당하여 우선 순위를 높일 수 있습니다."}},"claim_help":{"optional":"다른 사용자가 처리하지 못하도록 이 항목을 지정 할 수 있습니다.","required":"항목을 검토하려면 먼저 항목을 검토 요청을 해야합니다.","claimed_by_you":"이 항목을 요청했으며 검토 할 수 있습니다.","claimed_by_other":"이 항목은 \u003cb\u003e%{username}\u003c/b\u003e님에 의해서만 처리 될 수 있습니다."},"claim":{"title":"이 글을 클레임"},"unclaim":{"help":"이 클레임 제거"},"awaiting_approval":"승인 대기중","delete":"삭제","settings":{"saved":"저장되었습니다","save_changes":"변경사항 저장","title":"설정","priorities":{"title":"검토 가능한 우선 순위"}},"moderation_history":"관리 히스토리","view_all":"모두 보기","grouped_by_topic":"글 기준으로 그룹화","none":"검토 할 항목이 없습니다.","view_pending":"보류중 항목 보기","topic_has_pending":{"other":"이 글에는 승인 대기중인 \u003cb\u003e%{count}\u003c/b\u003e개의 댓글이 있습니다"},"title":"검토","topic":"글:","filtered_topic":"한 글에서 검토 가능한 콘텐츠로 필터링했습니다.","filtered_user":"사용자","filtered_reviewed_by":"검토자","show_all_topics":"모든 글 보기","deleted_post":"(게시물 삭제됨)","deleted_user":"(사용자 삭제됨)","user":{"bio":"바이오","website":"웹 사이트","username":"사용자 이름","email":"이메일","name":"이름","fields":"필드","reject_reason":"이유"},"user_percentage":{"summary":{"other":"%{agreed}, %{disagreed}, %{ignored} (최근 %{count}개의  신고중)"},"agreed":{"other":"%{count}% 동의"},"disagreed":{"other":"%{count}% 동의안함"},"ignored":{"other":"%{count}% 무시"}},"topics":{"topic":"글","reviewable_count":"수","reported_by":"신고자","deleted":"[삭제된 글]","original":"(원래 글)","details":"세부 정보","unique_users":{"other":"회원 %{count}명"}},"replies":{"other":"댓글 %{count}"},"edit":"편집","save":"저장","cancel":"취소","new_topic":"이 항목을 승인하면 새 글이 만들어집니다.","filters":{"all_categories":"(모든 카테고리)","type":{"title":"유형","all":"(모든 유형)"},"minimum_score":"최소 점수:","refresh":"새로고침","status":"상태","category":"카테고리","orders":{"score":"점수","score_asc":"점수 (역순)","created_at":"작성 날짜","created_at_asc":"작성 날짜 (역순)"},"priority":{"title":"최소 우선 순위","low":"(모든)","medium":"중간","high":"높음"}},"conversation":{"view_full":"전체 대화 보기"},"scores":{"about":"이 점수는 보고자의 회원 레벨, 이전 신고의 정확도 및 보고되는 항목의 우선 순위를 기준으로 계산됩니다.","score":"점수","date":"날짜","type":"유형","status":"상태","submitted_by":"제출자","reviewed_by":"검토자"},"statuses":{"pending":{"title":"보류중"},"approved":{"title":"승인됨"},"rejected":{"title":"거부됨"},"ignored":{"title":"무시됨"},"deleted":{"title":"삭제됨"},"reviewed":{"title":"(모두 검토됨)"},"all":{"title":"(모두)"}},"types":{"reviewable_flagged_post":{"title":"신고된 글","flagged_by":"신고자"},"reviewable_queued_topic":{"title":"대기중인 글"},"reviewable_queued_post":{"title":"대기중인 글"},"reviewable_user":{"title":"사용자"}},"approval":{"title":"승인이 필요한 게시물","description":"새로운 게시글이 있습니다. 그러나 이 게시글이 보여지려면 운영자의 승인이 필요합니다.","pending_posts":{"other":"승인 대기중인 게시물이 \u003cstrong\u003e%{count}\u003c/strong\u003e개 있습니다."},"ok":"확인"},"example_username":"사용자명","reject_reason":{"title":"이 사용자를 금지하는 이유는 무엇입니까?","send_email":"거부 이메일 보내기"}},"time_shortcut":{"later_today":"오늘 늦게","next_business_day":"다음 영업일","tomorrow":"내일","next_week":"다음 주","post_local_date":"게시 날짜","later_this_week":"이번 주말","start_of_next_business_week":"월요일","start_of_next_business_week_alt":"다음 월요일","next_month":"다음 달","custom":"사용자 지정 날짜 및 시간","none":"필요 없음","last_custom":"마지막"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e 사용자가 \u003ca href='%{topicUrl}'\u003e글 작성\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003e사용자님\u003c/a\u003e이 \u003ca href='%{topicUrl}'\u003e글 작성\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e님이 \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e에 글을 남김","you_replied_to_post":"\u003ca href='%{userUrl}'\u003e사용자님\u003c/a\u003e이 \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e에 글을 남김","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e님이 \u003ca href='%{topicUrl}'\u003e글\u003c/a\u003e에 댓글을 작성했습니다","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003e사용자님\u003c/a\u003e이 \u003ca href='%{topicUrl}'\u003e글\u003c/a\u003e에 댓글을 작성했습니다","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e님이 \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e를 멘션함","user_mentioned_you":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e님이 \u003ca href='%{user2Url}'\u003e나\u003c/a\u003e를 멘션함","you_mentioned_user":"\u003ca href='%{user1Url}'\u003e내가\u003c/a\u003e \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e님을 멘션함","posted_by_user":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e님이 작성","posted_by_you":"\u003ca href='%{userUrl}'\u003e사용자님\u003c/a\u003e이 작성","sent_by_user":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e님이 보냄","sent_by_you":"\u003ca href='%{userUrl}'\u003e내\u003c/a\u003e가 보냄"},"directory":{"username":"사용자명","filter_name":"사용자명으로 필터링","title":"사용자","likes_given":"줌","likes_received":"받음","topics_entered":"읽음","topics_entered_long":"글 조회","time_read":"읽은 시간","topic_count":"글","topic_count_long":"글 작성됨","post_count":"댓글","post_count_long":"댓글 게시됨","no_results":"결과가 없습니다.","days_visited":"방문","days_visited_long":"방문 일수","posts_read":"읽음","posts_read_long":"게시물 읽음","last_updated":"마지막 업데이트 :","total_rows":{"other":"사용자 %{count}명"}},"group_histories":{"actions":{"change_group_setting":"그룹 설정 변경","add_user_to_group":"사용자 추가","remove_user_from_group":"사용자 삭제","make_user_group_owner":"소유자로 지정하기","remove_user_as_group_owner":"소유자 지정 취소하기"}},"groups":{"member_added":"추가됨","member_requested":"요청됨","add_members":{"title":"%{group_name}에 구성원 추가","description":"쉼표로 구분해 붙여 넣을 수도 있습니다.","usernames":"사용자 이름 또는 이메일 주소를 입력하세요.","input_placeholder":"사용자 이름 또는 이메일","notify_users":"사용자에게 알림"},"requests":{"title":"요청","reason":"이유","accept":"동의","accepted":"수락됨","deny":"거부","denied":"거부됨","undone":"요청 실행 취소","handle":"멤버십 요청 처리"},"manage":{"title":"관리","name":"이름","full_name":"전체 이름","add_members":"회원 추가","delete_member_confirm":"'%{group}'그룹에서 '%{username}' 사용자를 제거 하시겠습니까?","profile":{"title":"프로필"},"interaction":{"title":"상호 작용","posting":"게시","notification":"알림"},"email":{"title":"이메일","status":"IMAP을 통해 %{old_emails} / %{total_emails} 동기화","credentials":{"title":"자격 증명","smtp_server":"SMTP 서버","smtp_port":"SMTP 포트","smtp_ssl":"SMTP에 SSL 사용","imap_server":"IMAP 서버","imap_port":"IMAP 포트","imap_ssl":"IMAP에 SSL 사용","username":"사용자명","password":"비밀번호"},"settings":{"title":"설정","allow_unknown_sender_topic_replies":"알 수 없는 발신자 주제 응답을 허용합니다.","allow_unknown_sender_topic_replies_hint":"알 수없는 발신자가 그룹 글에 댓글을 작성 할 수 있습니다. 이 기능이 활성화되어 있지 않으면 IMAP 이메일 스레드에 아직 포함되지 않았거나 글에 초대되지 않은 이메일 주소에서 답장하면 새 글이 생성됩니다."},"mailboxes":{"synchronized":"동기화된 사서함","none_found":"현재 이메일 계정에 사서함이 없습니다.","disabled":"비활성"}},"membership":{"title":"멤버십","access":"접근"},"categories":{"title":"분류","long_title":"카테고리 기본 알림","description":"사용자가 이 그룹에 추가되면 카테고리 알림 설정이 기본값으로 설정됩니다. 나중에 변경할 수 있습니다.","watched_categories_instructions":"이 카테고리의 모든 글을 자동으로 봅니다. 그룹 회원에게는 모든 새 글에 대한 알림이 전송되며 새 게시물 수도 글 옆에 표시됩니다.","tracked_categories_instructions":"이 카테고리의 모든 글을 추적하도록 자동설정됩니다. 새로운 게시글의 수가 글 옆에 표시됩니다.","watching_first_post_categories_instructions":"사용자는 이 카테고리의 새 글의 첫 번째 댓글에 대한 알림을받습니다.","regular_categories_instructions":"이 카테고리가 뮤트되면 그룹 회원의 뮤트가 해제됩니다. 사용자가 언급되거나 누군가가 답글을 보내면 사용자에게 알림이 전송됩니다.","muted_categories_instructions":"이 카테고리의 새 글에 대한 알림을 받지 않으며 카테고리 또는 최글 글 페이지에 나타나지 않습니다."},"tags":{"title":"태그","long_title":"태그 기본 알림","description":"사용자가 이 그룹에 추가되면 태그 알림 설정이 기본값으로 설정됩니다. 나중에 변경할 수 있습니다.","watched_tags_instructions":"이 태그의 모든 글을 자동으로 봅니다. 그룹 회원에게는 모든 새 글에 대한 알림이 전송되며 새 게시물 수도 글 옆에 표시됩니다.","tracked_tags_instructions":"이 태그의 모든 글을 자동으로 확인합니다. 글 옆에 새 게시물 수가 표시됩니다.","watching_first_post_tags_instructions":"사용자는 이 태그의 새 글과 첫 번째 댓글에 대한 알림을받습니다.","regular_tags_instructions":"이 태그가 뮤트되면 그룹 회원의 뮤트가 해제됩니다. 사용자가 언급되거나 누군가가 답글을 보내면 사용자에게 알림이 전송됩니다.","muted_tags_instructions":"사용자는 이 태그가 있는 새 글에 대한 알림을받지 않으며 최근 글에 표시되지 않습니다."},"logs":{"title":"로그","when":"언제","action":"처리","acting_user":"활동하는 사용자","target_user":"대상 사용자","subject":"제목","details":"세부 정보","from":"보내는사람","to":"받는사람"}},"permissions":{"title":"권한","none":"이 그룹과 관련된 카테고리가 없습니다.","description":"이 그룹의 회원은 이 카테고리에 접근 할 수 있습니다."},"public_admission":"사용자가 그룹에 자유롭게 가입할 수 있도록 허용합니다. (공개 그룹이어야 함)","public_exit":"사용자가 스스로 그룹에서 탈퇴 할 수 있도록 허용","empty":{"posts":"이 그룹에는 아직 회원들이 글을 작성하지 않았습니다.","members":"이 그룹에는 회원이 없습니다.","requests":"이 그룹에 대한 멤버십 요청이 없습니다.","mentions":"이 그룹에 대한 언급이 없습니다.","messages":"이 그룹에 대한 메시지가 없습니다.","topics":"이 그룹의 회원이 작성한 글이 없습니다.","logs":"이 그룹에 대한 로그가 없습니다."},"add":"추가","join":"가입","leave":"나가기","request":"요청","message":"메시지","confirm_leave":"이 그룹을 탈퇴 하시겠습니까?","allow_membership_requests":"사용자가 그룹 소유자에게 멤버십 요청을 보낼 수 있도록 허용 (공개 그룹이어야 함)","membership_request_template":"멤버십 요청을 보낼 때 사용자에게 표시 할 사용자 지정 템플릿","membership_request":{"submit":"요청 보내기","title":"@%{group_name}에 가입 요청하기","reason":"그룹 소유자에게 왜 이 그룹에 속해야하는지 알립니다."},"membership":"멤버십","name":"이름","group_name":"그룹 이름","user_count":"사용자","bio":"그룹 소개","selector_placeholder":"사용자 이름 입력","owner":"소유자","index":{"title":"그룹","all":"모든 그룹","empty":"공개된 그룹이 없습니다.","filter":"그룹 유형으로 필터링","owner_groups":"내가 소유한 그룹","close_groups":"닫힌 그룹","automatic_groups":"자동 그룹","automatic":"자동","closed":"닫힘","public":"공개","private":"비공개","public_groups":"공개 그룹","automatic_group":"자동 그룹","close_group":"그룹 닫기","my_groups":"내 그룹","group_type":"그룹 유형","is_group_user":"회원","is_group_owner":"소유자"},"title":{"other":"그룹"},"activity":"활동","members":{"title":"회원","filter_placeholder_admin":"아이디 혹은 이메일","filter_placeholder":"사용자명","remove_member":"회원 삭제","remove_member_description":"이 그룹에서 \u003cb\u003e%{username}\u003c/b\u003e 제거","make_owner":"소유자로 만들기","make_owner_description":"\u003cb\u003e%{username}\u003c/b\u003e 사용자를 이 그룹의 소유자로 만들기","remove_owner":"소유자로 제거","remove_owner_description":"\u003cb\u003e%{username}\u003c/b\u003e님을 이 그룹의 소유자에서 제거","make_primary":"기본으로 설정","remove_primary":"기본에서 제거","remove_members":"회원 삭제","remove_members_description":"이 그룹에서 선택한 사용자 제거","make_owners":"소유자로 만들기","make_owners_description":"선택한 사용자를 이 그룹의 소유자로 지정","remove_owners":"소유자 제거","remove_owners_description":"선택한 사용자를 이 그룹의 소유자에서 제거","make_all_primary":"모두 기본으로 설정","make_all_primary_description":"선택한 모든 사용자의 기본 그룹으로 설정","remove_all_primary":"기본에서 제거","remove_all_primary_description":"이 그룹을 기본 그룹에서 제거","owner":"소유자","primary":"기본","forbidden":"회원을 볼 수 없습니다."},"topics":"글","posts":"게시글","mentions":"멘션","messages":"메시지","notification_level":"그룹 메시지에 대한 기본 알림 수준","alias_levels":{"mentionable":"이 그룹은 누가 @mention 할 수 있습니까?","messageable":"누가 이 그룹에 메시지를 보낼 수 있습니까?","nobody":"0명","only_admins":"관리자 전용","mods_and_admins":"운영자 및 관리자만","members_mods_and_admins":"그룹 멤버, 운영자, 관리자만","owners_mods_and_admins":"그룹 소유자, 운영자 및 관리자만","everyone":"모두"},"notifications":{"watching":{"title":"주시중","description":"모든 메시지의 모든 새 게시물에 대한 알림을 받게되며 새 댓글 개수가 표시됩니다."},"watching_first_post":{"title":"새글 알림","description":"이 그룹의 새 메시지에 대한 알림을 받지만 메시지에 회신하지는 않습니다."},"tracking":{"title":"알림","description":"누군가 사용자님을 @name 형식으로 언급하거나 사용자님에게 댓글을 보내면 알림을 받게되며 새 댓글 수가 표시됩니다."},"regular":{"title":"보통","description":"누군가 사용자님을 @name 형식으로 언급하거나 사용자님에게 댓글을 보내면 알림을 받게됩니다."},"muted":{"title":"뮤트","description":"이 그룹의 메시지에 대한 알림을받지 않습니다."}},"flair_url":"아바타 플레어 이미지","flair_upload_description":"20 x 20픽셀보다 작은 정사각형 이미지를 사용하세요.","flair_bg_color":"아바타 플레어 배경 색상","flair_bg_color_placeholder":"(선택 사항) 16진수 색상 값","flair_color":"아바타 플레어 색상","flair_color_placeholder":"(선택 사항) 16진수 색상 값","flair_preview_icon":"미리보기 아이콘","flair_preview_image":"미리보기 이미지","flair_type":{"icon":"아이콘 선택","image":"이미지 업로드"}},"user_action_groups":{"1":"좋아요","2":"좋아요","3":"북마크","4":"글","5":"댓글","6":"응답","7":"멘션","9":"인용","11":"편집","12":"보낸 편지함","13":"받은 편지함","14":"보류중","15":"임시저장"},"categories":{"all":"모든 카테고리","all_subcategories":"모두","no_subcategory":"없음","category":"카테고리","category_list":"카테고리 목록 표시","reorder":{"title":"카테고리 순서변경","title_long":"카테고리 목록 재구성","save":"순서 저장","apply_all":"적용","position":"위치"},"posts":"게시글","topics":"글","latest":"최신","toggle_ordering":"정렬 컨트롤 토글","subcategories":"하위 카테고리","muted":"뮤트된 카테고리","topic_sentence":{"other":"%{count}개의 글"},"topic_stat":{"other":"%{number} / %{unit}"},"topic_stat_unit":{"week":"주","month":"월"},"topic_stat_all_time":{"other":"총 %{number}개"},"topic_stat_sentence_week":{"other":"지난주 %{count}개의 새 글이 있습니다."},"topic_stat_sentence_month":{"other":"지난달 %{count}개의 새 글이 있습니다."},"n_more":"카테고리 (%{count}개 더보기)..."},"ip_lookup":{"title":"IP 주소 조회","hostname":"호스트 이름","location":"위치","location_not_found":"(알수없음)","organisation":"소속","phone":"전화","other_accounts":"현재 IP주소의 다른 계정들:","delete_other_accounts":"%{count}개 삭제","username":"사용자명","trust_level":"TL","read_time":"읽은 시간","topics_entered":"읽은 글","post_count":"# 게시물","confirm_delete_other_accounts":"정말 이 계정들을 삭제하시겠습니까?","powered_by":"\u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e 사용","copied":"복사됨"},"user_fields":{"none":"(옵션 선택)","required":"\"%{name}\"에 대한 값을 입력하십시오."},"user":{"said":"%{username}:","profile":"프로필","mute":"알림 끄기","edit":"환경 설정 편집","download_archive":{"button_text":"모두 다운로드","confirm":"정말로 작성한 모든 글을 다운로드할까요?","success":"다운로드가 시작되었습니다. 다운로드 과정이 완료되면 메시지로 알려드리겠습니다.","rate_limit_error":"게시글은 하루에 한번만 다운로드할 수 있습니다. 내일 다시 시도해보세요."},"new_private_message":"새로운 메시지","private_message":"메시지","private_messages":"메시지","user_notifications":{"filters":{"filter_by":"필터 기준","all":"모두","read":"읽기","unread":"읽지 않음"},"ignore_duration_title":"사용자 무시","ignore_duration_username":"사용자명","ignore_duration_when":"기간:","ignore_duration_save":"무시","ignore_duration_note":"무시 기간이 만료되면 모든 무시가 자동으로 제거됩니다.","ignore_duration_time_frame_required":"기간을 선택하세요","ignore_no_users":"무시 된 사용자가 없습니다.","ignore_option":"무시됨","ignore_option_title":"이 사용자와 관련된 알림은 수신되지 않으며 해당 글과 댓글이 모두 숨겨집니다.","add_ignored_user":"추가...","mute_option":"알림 꺼짐","mute_option_title":"이 사용자와 관련된 알림을 받지 않습니다.","normal_option":"보통","normal_option_title":"이 사용자가 사용자님에게 댓글을 작성 하거나, 인용하거나, 멘션하면 알림이 전송됩니다."},"notification_schedule":{"title":"알림 일정","label":"사용자 지정 알림 일정 사용","tip":"이 시간 이외에는 자동으로 '방해 금지' 상태가 됩니다.","midnight":"한밤중","none":"없음","monday":"월요일","tuesday":"화요일","wednesday":"수요일","thursday":"목요일","friday":"금요일","saturday":"토요일","sunday":"일요일"},"activity_stream":"활동","preferences":"환경 설정","feature_topic_on_profile":{"open_search":"새 글 선택","title":"글 선택","search_label":"제목으로 글 검색","save":"저장","clear":{"title":"지우기","warning":"추천 글을 지우시겠습니까?"}},"use_current_timezone":"현재 시간대 사용","profile_hidden":"이 사용자의 프로필은 비공개 상태입니다.","expand_profile":"확장","collapse_profile":"축소","bookmarks":"북마크","bio":"내 소개","timezone":"시간대","invited_by":"초대 자","trust_level":"회원 레벨","notifications":"알림","statistics":"통계","desktop_notifications":{"label":"실시간 알림","not_supported":"이 브라우저에서는 알림이 지원되지 않습니다. 죄송합니다.","perm_default":"알림 켜기","perm_denied_btn":"사용 권한 거부됨","perm_denied_expl":"알림을 허가하지 않으셨군요. 브라우저 설정을 통해서 알림을 허용해주세요.","disable":"알림 비활성화","enable":"알림 활성화","each_browser_note":"참고: 사용하는 모든 브라우저에서 이 설정을 변경해야합니다. 이 설정에 관계없이 \"방해 금지\"에있는 경우 모든 알림이 비활성화됩니다.","consent_prompt":"내 글에 댓글이 달리면 실시간으로 알림을 받으시겠습니까?"},"dismiss":"읽음","dismiss_notifications":"모두 읽음","dismiss_notifications_tooltip":"읽지 않은 알림을 모두 읽음으로 표시","first_notification":"첫 번째 알림! 시작하려면 선택하세요.","dynamic_favicon":"브라우저 아이콘에 수 표시","skip_new_user_tips":{"description":"새 사용자 온보딩 팁 및 배지 건너뛰기","not_first_time":"처음이 아니십니까?","skip_link":"이 팁 건너 뛰기"},"theme_default_on_all_devices":"이 테마를 모든 기기에서 기본 테마로 설정","color_scheme_default_on_all_devices":"모든 장치에서 기본 색 구성표 설정","color_scheme":"색상 구성표","color_schemes":{"default_description":"테마 기본값","disable_dark_scheme":"일반과 동일","dark_instructions":"기기의 어두운 모드를 전환하여 어두운 모드 색 구성표를 미리 볼 수 있습니다.","undo":"초기화","regular":"일반","dark":"어두운 모드","default_dark_scheme":"(사이트 기본값)"},"dark_mode":"어두운 모드","dark_mode_enable":"어두운 모드 색 구성표 자동 사용","text_size_default_on_all_devices":"모든 장치에서 기본 텍스트 크기로 설정","allow_private_messages":"다른 사용자가 나에게 개인 메시지를 보내는것을 허용","external_links_in_new_tab":"새 탭에서 모든 외부 링크 열기","enable_quoting":"강조 표시된 텍스트에 대한 알림 활성화","enable_defer":"글을 읽지 않은 상태로 표시 연장","change":"변경","featured_topic":"주요 글","moderator":"%{user}님은 운영자입니다","admin":"%{user}님은 관리자 입니다","moderator_tooltip":"이 회원은 운영자 입니다","admin_tooltip":"이 회원은 관리자입니다.","silenced_tooltip":"이 회원은 차단되었습니다","suspended_notice":"이 회원은 %{date}까지 접근 금지 되었습니다.","suspended_permanently":"이 회원은 일시정지 되었습니다.","suspended_reason":"이유: ","github_profile":"GitHub","email_activity_summary":"활동 요약","mailing_list_mode":{"label":"메일링 리스트 모드","enabled":"메일링 리스트 모드 활성화","instructions":"이 설정은 활동 요약보다 우선합니다.\u003cbr /\u003e\n뮤트된 글 및 카테고리는 이메일에 포함되지 않습니다.\n","individual":"모든 새 게시물에 대한 이메일 보내기","individual_no_echo":"내 게시물을 제외한 모든 새 게시물에 대해 이메일 보내기","many_per_day":"모든 새 게시물에 대해 이메일을 보냅니다 (하루에 약 %{dailyEmailEstimate}개)","few_per_day":"모든 새 게시물에 대해 이메일을 보냅니다 (하루에 약 2개).","warning":"메일링 리스트 모드가 활성화되었습니다. 이메일 알림 설정이 재설정 됩니다."},"tag_settings":"태그","watched_tags":"주시중","watched_tags_instructions":"이 태그가 있는 모든 글을 자동으로 볼 수 있습니다. 모든 새 글에 대한 알림이 표시되고 글 옆에 새 게시물 개수도 표시됩니다.","tracked_tags":"팔로우중","tracked_tags_instructions":"이 태그를 사용하여 모든 글을 자동으로 팔로우 합니다. 글 옆에 새 게시물 수가 표시됩니다.","muted_tags":"알림 끔","muted_tags_instructions":"이 태그를 사용하면 새 글에 대한 알림을 받지 않으며 최신 항목에도 표시되지 않습니다.","watched_categories":"주시중","watched_categories_instructions":"이 카테고리의 모든 글을 자동으로 팔로우하게 됩니다. 모든 새 글에 대한 알림을 받게되며 새 게시물 수도 글 옆에 표시됩니다.","tracked_categories":"팔로우중","tracked_categories_instructions":"이 카테고리의 모든 글을 자동으로 팔로우 합니다. 글 옆에 새 게시물 수가 표시됩니다.","watched_first_post_categories":"새글 알림","watched_first_post_categories_instructions":"이 카테고리의 각 새 글에 대한 첫 번째 댓글 알림을 받습니다.","watched_first_post_tags":"새글 알림","watched_first_post_tags_instructions":"이 태그를 사용하여 각 새 글에 대한 첫 번째 댓글 알림을 받습니다.","muted_categories":"알림 끔","muted_categories_instructions":"이 카테고리의 새로운 글에 대한 알림은 제공되지 않으며 카테고리 또는 최근 글 페이지에 표시되지 않습니다.","muted_categories_instructions_dont_hide":"이 카테고리의 새로운 글에 대한 알림은 받지 않습니다.","regular_categories":"일반","regular_categories_instructions":"“최근 글” 및 “주요 글” 목록에서 이 카테고리를 볼 수 있습니다.","no_category_access":"관리자로서 카테고리 접근이 제한되어 있으므로 저장이 비활성화됩니다.","delete_account":"내 계정 삭제","delete_account_confirm":"계정을 영구적으로 삭제 하시겠습니까? 이 작업은 취소 할 수 없습니다!","deleted_yourself":"사용자님의 계정이 삭제되었습니다.","delete_yourself_not_allowed":"계정 삭제를 원하시면 관리자에게 문의하시기 바랍니다.","unread_message_count":"메시지","admin_delete":"삭제","users":"사용자","muted_users":"알림 끔","muted_users_instructions":"이 사용자의 모든 알림 및 개인 메시지를 표시하지 않습니다.","allowed_pm_users":"허용됨","allowed_pm_users_instructions":"이 사용자의 개인 메시지만 허용합니다.","allow_private_messages_from_specific_users":"특정 사용자만 나에게 개인 메시지를 보내도록 허용","ignored_users":"무시됨","ignored_users_instructions":"이 사용자의 모든 게시물, 알림 및 개인 메시지를 표시하지 않습니다.","tracked_topics_link":"보이기","automatically_unpin_topics":"글 끝에 도달하면 글을 자동으로 고정 해제합니다.","apps":"앱","revoke_access":"접근 권한을 취소","undo_revoke_access":"접근 권한 해지 취소","api_approved":"승인됨:","api_last_used_at":"마지막 사용 :","theme":"테마","save_to_change_theme":"\"%{save_text}\"을 클릭하면 테마가 업데이트됩니다.","home":"기본 홈페이지","staged":"격리됨","staff_counters":{"flags_given":"유용한 신고","flagged_posts":"신고된 글","deleted_posts":"삭제된 글","suspensions":"차단","warnings_received":"경고","rejected_posts":"거부된 게시물"},"messages":{"all":"모두","inbox":"받은 편지함","sent":"보낸 편지함","archive":"저장함","groups":"내 그룹","bulk_select":"메시지 선택","move_to_inbox":"받은 편지함으로 이동","move_to_archive":"저장함","failed_to_move":"선택한 메시지를 이동하지 못했습니다. (네트워크가 다운되었을 수 있음)","select_all":"모두 선택","tags":"태그"},"preferences_nav":{"account":"계정","profile":"프로필","emails":"이메일","notifications":"알림","categories":"카테고리","users":"사용자","tags":"태그","interface":"인터페이스","apps":"앱"},"change_password":{"success":"(이메일 전송)","in_progress":"(이메일 전송 중)","error":"(오류)","emoji":"이모티콘 잠금","action":"비밀번호 재설정 이메일 보내기","set_password":"비밀번호 설정","choose_new":"새 비밀번호를 입력하세요","choose":"비밀번호를 입력하세요"},"second_factor_backup":{"title":"2단계 백업 코드","regenerate":"재생성","disable":"비활성","enable":"활성화","enable_long":"백업 코드 사용","manage":{"other":"백업 코드를 관리합니다. \u003cstrong\u003e%{count}\u003c/strong\u003e개의 백업 코드가 남아 있습니다."},"copy_to_clipboard":"클립 보드에 복사","copy_to_clipboard_error":"데이터를 클립보드로 복사하는 중 오류 발생","copied_to_clipboard":"클립보드에 복사됨","download_backup_codes":"백업 코드 다운로드","remaining_codes":{"other":"\u003cstrong\u003e%{count}\u003c/strong\u003e개의 백업 코드가 남아 있습니다."},"use":"백업 코드 사용","enable_prerequisites":"백업 코드를 생성하기 전에 기본 2단계 방법을 활성화해야 합니다.","codes":{"title":"생성된 백업 코드","description":"이 백업 코드는 한 번만 사용할 수 있습니다. 안전한 곳에 보관하십시오."}},"second_factor":{"title":"2단계 인증","enable":"2단계 인증 관리","disable_all":"모두 비활성화","forgot_password":"비밀번호를 잊으셨습니까?","confirm_password_description":"계속하려면 비밀번호를 입력하세요","name":"이름","label":"코드","rate_limit":"다른 인증 코드를 시도하기 전에 잠시 기다려 주십시오.","enable_description":"지원되는 앱 (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e – \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e)에서 이 QR코드를 스캔하고 인증 코드를 입력하세요.\n","disable_description":"앱의 인증 코드를 입력하세요","show_key_description":"수동으로 입력","short_description":"일회용 보안 코드로 계정을 보호하십시오.\n","extended_description":"이중 인증은 암호 외에 일회성 토큰을 요구하여 계정에 보안을 강화합니다. 토큰은 \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003e안드로이드\u003c/a\u003e 및 \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e 장치에서 생성 될 수 있습니다.\n","oauth_enabled_warning":"계정에서 2단계 인증이 활성화되면 소셜 로그인이 비활성화됩니다.","use":"Authenticator 앱 사용","enforced_notice":"이 사이트에 접근하려면 2단계 인증을 활성화해야합니다.","disable":"해제","disable_confirm":"모든 2단계 인증을 비활성화 하시겠습니까?","save":"저장","edit":"편집","edit_title":"인증자 편집","edit_description":"인증자 명칭","enable_security_key_description":"\u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003e하드웨어 보안 키\u003c/a\u003e가 준비되었다면 아래의 등록 버튼을 누르십시오.\n","totp":{"title":"토큰 기반 인증 자","add":"인증자 추가","default_name":"내 인증 자","name_and_code_required_error":"인증 앱의 이름과 코드를 제공해야합니다."},"security_key":{"register":"등록하기","title":"보안 키","add":"보안 키 추가","default_name":"기본 보안 키","not_allowed_error":"보안 키 등록 프로세스가 시간 초과되었거나 취소되었습니다.","already_added_error":"이 보안 키를 이미 등록했습니다. 다시 등록 할 필요가 없습니다.","edit":"보안 키 편집","save":"저장","edit_description":"보안 키 이름","name_required_error":"보안 키의 이름을 제공해야 합니다."}},"change_about":{"title":"내 소개 변경","error":"이 값을 변경하는 중에 오류가 발생했습니다."},"change_username":{"title":"사용자명 변경","confirm":"사용자명을 변경 하시겠습니까?","taken":"죄송합니다. 사용중인 사용자명 입니다.","invalid":"해당 사용자명이 잘못되었습니다. 숫자와 문자만 포함해야 합니다."},"add_email":{"title":"이메일 추가","add":"추가"},"change_email":{"title":"이메일 변경","taken":"죄송합니다. 해당 이메일은 사용 할 수 없습니다.","error":"이메일 변경 중 오류가 발생했습니다. 이미 사용 중인 이메일인지 확인해주세요.","success":"이메일 발송이 완료되었습니다. 확인하신 후 절차에 따라주세요.","success_via_admin":"해당 주소로 이메일을 보냈습니다. 이메일에 있는 확인 지침을 따라야 합니다.","success_staff":"현재 주소로 이메일을 보냈습니다. 확인 절차에 따라 진행해 주세요."},"change_avatar":{"title":"프로필 사진 변경","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e 기반","gravatar_title":"%{gravatarName}의 웹 사이트에서 아바타 변경","gravatar_failed":"해당 이메일 주소로 %{gravatarName}을 찾을 수 없습니다.","refresh_gravatar_title":"%{gravatarName} 새로 고침","letter_based":"자동 생성된 아바타","uploaded_avatar":"사용자 지정 사진","uploaded_avatar_empty":"사용자 지정 사진 추가","upload_title":"사진 업로드","image_is_not_a_square":"경고: 정사각형 이미지가 아니기 때문에 사진을 수정하였습니다."},"change_profile_background":{"title":"프로필 헤더","instructions":"프로필 헤더는 중앙에 위치하며 기본 너비는 1110px입니다."},"change_card_background":{"title":"사용자 카드 배경","instructions":"배경 이미지는 중앙에 배치되며 기본 너비는 590px 입니다."},"change_featured_topic":{"title":"주요 글","instructions":"이 글에 대한 링크는 사용자 카드 및 프로필에 있습니다."},"email":{"title":"이메일","primary":"기본 이메일","secondary":"보조 이메일","primary_label":"기본","unconfirmed_label":"미확인","resend_label":"활성화 이메일 재전송","resending_label":"보내는 중...","resent_label":"이메일 보냄","update_email":"이메일 변경","set_primary":"기본 이메일 설정","destroy":"이메일 제거","add_email":"보조 이메일 추가","no_secondary":"보조 이메일이 없습니다","instructions":"다른 사용자에게 공개되지 않습니다.","admin_note":"참고 : 관리자가 아닌 다른 사용자의 이메일을 변경하는 관리자는 사용자가 원래 이메일 계정에 액세스할 수 없음을 나타내므로 비밀번호 재설정 이메일이 새 주소로 전송됩니다. 사용자의 이메일은 비밀번호 재설정 프로세스를 완료할 때까지 변경되지 않습니다.","ok":"확인을 위해 이메일을 보내드립니다.","required":"이메일 주소를 입력하십시오","invalid":"유효한 이메일 주소를 입력하십시오.","authenticated":"사용자님의 이메일은 %{provider}에 의해 인증되었습니다.","frequency_immediately":"만약 전송된 메일을 읽지 않았을 경우, 즉시 메일을 다시 보내드립니다.","frequency":{"other":"최근 %{count}분 동안 접속하지 않을 경우에만 메일이 전송됩니다."}},"associated_accounts":{"title":"연결된 계정","connect":"연결","revoke":"취소","cancel":"취소","not_connected":"(연결되지 않음)","confirm_modal_title":"%{provider} 계정 연결","confirm_description":{"account_specific":"사용자님의 %{provider} 계정 '%{account_description}'이 인증에 사용됩니다.","generic":"%{provider} 계정이 인증에 사용됩니다."}},"name":{"title":"이름","instructions":"전체 이름 (선택 사항)","instructions_required":"전체 이름","required":"이름을 입력하세요","too_short":"이름이 너무 짧습니다.","ok":"사용 가능한 이름입니다."},"username":{"title":"사용자명","instructions":"공백없이, 짧고 특이하게","short_instructions":"다른 사용자가 사용자님을 @%{username} 으로 멘션 할 수 있습니다.","available":"사용자명으로 사용할 수 있습니다.","not_available":"사용할 수 없습니다. %{suggestion}는 어떠세요?","not_available_no_suggestion":"사용할 수 없음","too_short":"사용자명 너무 짧습니다","too_long":"사용자명이 너무 깁니다.","checking":"사용자명 사용 가능 여부 확인 중...","prefilled":"이메일이 등록된 사용자명과 일치합니다.","required":"사용자명을 입력 해주세요"},"locale":{"title":"인터페이스 언어","instructions":"사용자 인터페이스 언어를 변경 후 페이지 새로 고침하면 반영됩니다.","default":"(기본)","any":"모든"},"password_confirmation":{"title":"비밀번호 다시 입력"},"invite_code":{"title":"초대 코드","instructions":"계정을 등록하려면 초대 코드가 필요합니다."},"auth_tokens":{"title":"최근에 사용한 장치","details":"세부 정보","log_out_all":"모두 로그아웃","not_you":"사용자님이 아닌가요?","show_all":"모두 보기 (%{count})","show_few":"간략히 보기","was_this_you":"사용자님 이었나요?","was_this_you_description":"본인이 아닌 경우 비밀번호를 변경하고 모든 곳에서 로그아웃하는 것이 좋습니다.","browser_and_device":"%{device}의 %{browser}","secure_account":"내 계정 보안","latest_post":"마지막 작성…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003e현재 사용\u003c/span\u003e","browser_last_seen":"%{browser} | %{date}"},"last_posted":"마지막 글","last_emailed":"마지막 이메일","last_seen":"마지막 접속","created":"가입","log_out":"로그아웃","location":"위치","website":"웹 사이트","email_settings":"이메일","hide_profile_and_presence":"내 공개 프로필 및 현재 상태 기능 숨기기","enable_physical_keyboard":"iPad에서 실제 키보드 지원 활성화","text_size":{"title":"글자 크기","smallest":"가장 작음","smaller":"더 작음","normal":"보통","larger":"큼","largest":"가장 큼"},"title_count_mode":{"title":"배경 페이지 제목에 다음 개수가 표시됩니다:","notifications":"새로운 알림","contextual":"새 페이지 내용"},"like_notification_frequency":{"title":"좋아요를 받았을 때 알림받기","always":"항상","first_time_and_daily":"글이 첫 좋아요를 받았을 때부터 매일 알림받기","first_time":"게시물이 처음 좋아요를 받았을때","never":"알림 받지 않기"},"email_previous_replies":{"title":"이메일 하단에 예전에 읽은 댓글도 포함하기","unless_emailed":"확인하지 않은 댓글만 포함하기","always":"항상 알림 받기","never":"알림 받지 않기"},"email_digests":{"title":"여기를 방문하지 않을 경우 인기있는 글 및 댓글에 대한 요약 이메일을 보내주세요.","every_30_minutes":"30분 마다","every_hour":"매시간","daily":"매일","weekly":"매주","every_month":"매달","every_six_months":"6개월마다"},"email_level":{"title":"누군가가 나를 인용하거나, 내 게시물에 댓글을 달거나, 내 @username 을 언급하거나, 글에 나를 초대 할 때 이메일을 보냅니다.","always":"항상 알림 받기","only_when_away":"방문이 없을때 알림 받기","never":"알림 받지 않음"},"email_messages_level":"누군가 나에게 메시지를 보내면 나에게 이메일 보내기","include_tl0_in_digests":"신규 사용자가 작성한 내용도 요약 메일에 포함시키기","email_in_reply_to":"이메일에 댓글 내용을 발췌해서 포함","other_settings":"기타","categories_settings":"카테고리","new_topic_duration":{"label":"아래 조건에 해당하면 새로운 글로 간주","not_viewed":"아직 읽어 보지 못했어요","last_here":"마지막 방문 이후 작성된 글","after_1_day":"지난 하루간 작성된 글","after_2_days":"지난 2일 동안 작성된 글","after_1_week":"지난주에 작성된 글","after_2_weeks":"지난 2주 동안 작성된 글"},"auto_track_topics":"내가 작성한 글 자동 팔로우","auto_track_options":{"never":"하지않음","immediately":"즉시","after_30_seconds":"30초 후","after_1_minute":"1분 후","after_2_minutes":"2분 후","after_3_minutes":"3분 후","after_4_minutes":"4분 후","after_5_minutes":"5분 후","after_10_minutes":"10분 후"},"notification_level_when_replying":"글에 댓글을 쓰면 그 글을 다음으로 설정","invited":{"search":"초대를 검색하려면 입력...","title":"초대","user":"초대된 사용자","sent":"마지막으로 보냄","none":"표시 할 초대가 없습니다.","truncated":{"other":"처음 %{count}개의 초대를 표시합니다."},"redeemed":"사용된 초대","redeemed_tab":"사용됨","redeemed_tab_with_count":"사용됨 (%{count})","redeemed_at":"사용됨","pending":"보류 중인 초대","pending_tab":"보류중","pending_tab_with_count":"보류중 (%{count})","topics_entered":"읽은 글","posts_read_count":"읽은 댓글","expired":"이 초대장의 기한이 만료되었습니다.","rescind":"삭제","rescinded":"초대가 제거되었습니다.","rescind_all":"만료된 초대 제거","rescinded_all":"모든 만료 된 초대가 제거되었습니다!","rescind_all_confirm":"만료 된 초대를 모두 제거 하시겠습니까?","reinvite":"초대 다시 보내기","reinvite_all":"모든 초대 다시 보내기","reinvite_all_confirm":"정말로 모든 초대를 다시 보내시겠습니까?","reinvited":"초대 메일 재전송 됨","reinvited_all":"모든 초대장이 다시 발송되었습니다!","time_read":"읽은 시간","days_visited":"방문 일수","account_age_days":"계정 사용 기간 (일)","source":"다음을 통해 초대","links_tab":"링크","links_tab_with_count":"링크 (%{count})","link_url":"링크","link_created_at":"작성됨","link_redemption_stats":"회수","link_groups":"그룹","link_expires_at":"만료","create":"초대","copy_link":"링크 표시","generate_link":"초대 링크 만들기","link_generated":"초대 링크는 다음과 같습니다!","valid_for":"초대 링크는 다음 이메일 주소에만 유효합니다: %{email}","single_user":"이메일로 초대","multiple_user":"링크로 초대","invite_link":{"title":"초대 링크","success":"초대 링크가 성공적으로 생성되었습니다!","error":"초대 링크를 생성하는 중에 오류가 발생했습니다.","max_redemptions_allowed_label":"이 링크를 사용하여 등록 할 수있는 사람은 몇 명입니까?","expires_at":"이 초대 링크는 언제 만료됩니까?"},"bulk_invite":{"none":"이 페이지에 표시할 초대장이 없습니다.","text":"일괄 초대","success":"파일이 성공적으로 업로드되었습니다. 처리가 완료되면 메시지를 통해 알림을 받게됩니다.","error":"죄송합니다. 파일은 CSV 형식이어야 합니다.","confirmation_message":"업로드된 파일의 모든 사람에게 초대를 메일로 보내려 합니다."}},"password":{"title":"비밀번호","too_short":"비밀번호가 너무 짧습니다.","common":"이 비밀번호는 너무 평범합니다.","same_as_username":"비밀번호가 사용자명과 동일합니다.","same_as_email":"비밀번호가 이메일과 동일합니다.","ok":"적절한 비밀번호 입니다.","instructions":"%{count}자 이상","required":"비밀번호를 입력하세요"},"summary":{"title":"요약","stats":"통계","time_read":"읽은 시간","recent_time_read":"최근 읽은 시간","topic_count":{"other":"작성 글"},"post_count":{"other":"작성 댓글"},"likes_given":{"other":"줌"},"likes_received":{"other":"받음"},"days_visited":{"other":"방문 일수"},"topics_entered":{"other":"읽은 글"},"posts_read":{"other":"게시물 읽음"},"bookmark_count":{"other":"북마크"},"top_replies":"주요 댓글","no_replies":"아직 댓글이 없습니다.","more_replies":"댓글 더 보기","top_topics":"주요 글","no_topics":"아직 글이 없습니다.","more_topics":"더 많은 글","top_badges":"주요 배지","no_badges":"아직 배지가 없습니다.","more_badges":"배지 더 보기","top_links":"상위 링크","no_links":"아직 링크가 없습니다.","most_liked_by":"가장 많은 좋아요를 받은 사용자","most_liked_users":"가장 많이 좋아요를 받은","most_replied_to_users":"댓글을 가장 많이 단 사람","no_likes":"아직 좋아요가 없습니다.","top_categories":"상위 카테고리","topics":"글","replies":"댓글"},"ip_address":{"title":"마지막 IP 주소"},"registration_ip_address":{"title":"등록 IP 주소"},"avatar":{"title":"프로필 사진","header_title":"프로필, 메시지, 북마크 및 환경설정","name_and_description":"%{name} - %{description}"},"title":{"title":"제목","none":"(없음)"},"primary_group":{"title":"기본 그룹","none":"(없음)"},"filters":{"all":"모두"},"stream":{"posted_by":"게시자 :","sent_by":"보낸 사람","private_message":"메시지","the_topic":"글"}},"loading":"로드 중...","errors":{"prev_page":"로드하는 동안","reasons":{"network":"네트워크 오류","server":"서버 오류","forbidden":"접근 거부됨","unknown":"오류","not_found":"페이지를 찾을 수 없습니다"},"desc":{"network":"연결 상태를 확인하십시오.","network_fixed":"문제가 해결된 것으로 보입니다.","server":"오류 코드: %{status}","forbidden":"사용자님은 볼 수 없습니다.","not_found":"죄송합니다. 애플리케이션이 존재하지 않는 URL을 로드하려고 했습니다.","unknown":"문제가 발생했습니다."},"buttons":{"back":"뒤로 가기","again":"다시 시도","fixed":"페이지 열기"}},"modal":{"close":"닫기","dismiss_error":"오류 무시"},"close":"닫기","assets_changed_confirm":"이 사이트는 방금 업데이트되었습니다. 지금 최신 버전으로 새로 고침 하시겠습니까?","logout":"로그아웃 되었습니다.","refresh":"새로 고침","home":"홈","read_only_mode":{"enabled":"이 사이트는 현재 읽기전용 모드입니다. 브라우징은 가능하지만, 댓글 달기, 좋아요 및 기타 작업을 사용할 수 없습니다.","login_disabled":"사이트가 읽기 전용 모드인 동안에는 로그인이 비활성화됩니다.","logout_disabled":"사이트가 읽기 전용 모드인 동안에는 로그아웃이 비활성화됩니다."},"logs_error_rate_notice":{},"learn_more":"더 알아보기...","first_post":"첫 번째 글","mute":"알림끔","unmute":"알림끔 해제","last_post":"게시됨","local_time":"현지 시각","time_read":"읽음","time_read_recently":"최근 %{time_read}","time_read_tooltip":"읽은 총 시간 %{time_read}","time_read_recently_tooltip":"%{time_read} 총 읽기 시간 (지난 60 일 동안 %{recent_time_read})","last_reply_lowercase":"마지막 댓글","replies_lowercase":{"other":"댓글"},"signup_cta":{"sign_up":"회원가입","hide_session":"내일 알려주세요","hide_forever":"사양합니다.","hidden_for_session":"알겠습니다. 내일 다시 물어볼께요. 언제든지 '로그인'을 통해서도 계정을 만들 수 있습니다.","intro":"사이트에 관심이 있지만 아직 계정을 만들지 않은 것 같습니다.","value_prop":"계정을 만들면 사이트내 읽은 글과 읽지 않은 글을 기억해 보다 편한 이용을 도와 줍니다. 또한 누군가가 댓글을 달거나 질문을 할 경우 이메일을 통해 알림을 받을 수 있습니다. :heartpulse:"},"summary":{"enabled_description":"이 글에 대한 요약: 현재 커뮤니티의 주요 글 요약본을 보고 있습니다","description":{"other":"\u003cb\u003e%{count}\u003c/b\u003e개의 댓글이 있습니다."},"enable":"이 글 요약","disable":"모든 글 표시"},"deleted_filter":{"enabled_description":"이 글에는 숨겨진 삭제 된 게시물이 있습니다.","disabled_description":"글에 삭제 된 게시물이 표시됩니다.","enable":"삭제된 게시물 숨기기","disable":"삭제된 게시물 표시"},"private_message_info":{"title":"메시지","invite":"다른 사람 초대...","edit":"추가 또는 제거...","remove":"제거...","add":"추가...","leave_message":"정말 이 메시지를 남기시겠습니까?","remove_allowed_user":"%{name}에게서 온 메시지를 삭제할까요?","remove_allowed_group":"%{name}에게서 온 메시지를 삭제할까요?"},"email":"이메일","username":"사용자명","last_seen":"마지막 접속","created":"작성됨","created_lowercase":"작성됨","trust_level":"회원 레벨","search_hint":"사용자명, 이메일 또는 IP 주소","create_account":{"disclaimer":"등록하면 \u003ca href='%{privacy_link}' target='blank'\u003e개인 정보 보호 정책\u003c/a\u003e 및 \u003ca href='%{tos_link}' target='blank'\u003e서비스 약관에\u003c/a\u003e 동의하게됩니다.","title":"새 계정 만들기","failed":"문제가 발생했습니다. 이 이메일이 이미 등록되어있을 수 있습니다. 비밀번호 찾기 링크를 시도해보세요."},"forgot_password":{"title":"비밀번호 재설정","action":"비밀번호를 잊어버렸습니다.","invite":"사용자명 또는 이메일 주소를 입력하면 비밀번호 재설정 이메일을 보내드립니다.","reset":"비밀번호 재설정","complete_username":"계정의 사용자명이 \u003cb\u003e%{username}\u003c/b\u003e와 일치하면 곧 비밀번호 재설정 방법에 대한 지침이 포함 된 이메일을 받게됩니다.","complete_email":"\u003cb\u003e%{email}\u003c/b\u003e이 계정의 이메일과 일치하면, 비밀번호를 재설정하는 방법에 대한 지침이 포함 된 이메일을 받게됩니다.","complete_username_found":"사용자명 \u003cb\u003e%{username}\u003c/b\u003e와 일치하는 계정을 찾았습니다. 곧 비밀번호 재설정 방법에 대한 지침이 포함 된 이메일을 받게됩니다.","complete_email_found":"\u003cb\u003e%{email}\u003c/b\u003e와 일치하는 계정을 찾았습니다. 곧 비밀번호 재설정 방법에 대한 지침이 포함 된 이메일을 받게됩니다.","complete_username_not_found":"\u003cb\u003e%{username}\u003c/b\u003e과 일치하는 계정이 없습니다.","complete_email_not_found":"\u003cb\u003e%{email}\u003c/b\u003e과 일치하는 계정이 없습니다.","help":"이메일이 도착하지 않았습니까? 먼저 스팸 폴더를 확인해보세요.\u003cp\u003e어떤 이메일 주소를 사용했는지 잘 모르시겠습니까? 이메일 주소를 여기에 입력하면 기록이 있는지 확인해 드리겠습니다.\u003c/p\u003e\u003cp\u003e만약 더 이상 그 이메일 주소로 접근할 수 없다면, \u003ca href='%{basePath}/about'\u003e사이트 관리자\u003c/a\u003e에게 도움을 요청하세요.\u003c/p\u003e","button_ok":"확인","button_help":"도움말"},"email_login":{"link_label":"로그인 링크를 이메일로 보내기","button_label":"이메일 사용","emoji":"이모티콘 잠금","complete_username":"계정이 사용자 이름 \u003cb\u003e%{username}\u003c/b\u003e 과 일치하면 곧 로그인 링크가 포함 된 이메일을 받게됩니다.","complete_email":"계정이 \u003cb\u003e%{email}\u003c/b\u003e 과 일치하면 곧 로그인 링크가 포함 된 이메일을 받게됩니다.","complete_username_found":"사용자명이 \u003cb\u003e%{username}\u003c/b\u003e와 일치하는 계정을 찾았습니다. 곧 로그인 링크가 포함 된 이메일을 받게됩니다.","complete_email_found":"\u003cb\u003e%{email}\u003c/b\u003e 와 일치하는 계정을 찾았습니다. 곧 로그인 링크가 포함 된 이메일을 받게됩니다.","complete_username_not_found":"\u003cb\u003e%{username}\u003c/b\u003e과 일치하는 계정이 없습니다.","complete_email_not_found":"\u003cb\u003e%{email}\u003c/b\u003e과 일치하는 계정이 없습니다.","confirm_title":"%{site_name}으로 가기","logging_in_as":"%{email}으로 로그인","confirm_button":"로그인 완료"},"login":{"title":"로그인","username":"사용자","password":"비밀번호","second_factor_title":"2단계 인증","second_factor_description":"앱에서 인증 코드를 입력하십시오 :","second_factor_backup":"백업 코드를 사용하여 로그인","second_factor_backup_title":"2단계 백업","second_factor_backup_description":"백업 코드 중 하나를 입력하세요:","second_factor":"OTP 앱을 사용하여 로그인","security_key_description":"실제 보안 키가 준비되면 아래의 보안 키로 인증 버튼을 누릅니다.","security_key_alternative":"다른 방법으로 시도","security_key_authenticate":"보안 키로 인증","security_key_not_allowed_error":"보안 키 인증 프로세스가 시간 초과되었거나 취소되었습니다.","security_key_no_matching_credential_error":"제공된 보안 키에서 일치하는 자격 증명을 찾을 수 없습니다.","security_key_support_missing_error":"현재 장치 또는 브라우저가 보안 키 사용을 지원하지 않습니다. 다른 방법을 사용하십시오.","email_placeholder":"이메일 또는 사용자명","caps_lock_warning":"Caps Lock 켜짐","error":"알 수없는 오류","cookies_error":"브라우저의 쿠키가 비활성화 된 것 같습니다. 먼저 활성화하지 않으면 로그인하지 못할 수 있습니다.","rate_limit":"다시 로그인을 시도하기 전에 잠시 기다려주십시오.","blank_username":"이메일 또는 사용자명을 입력하십시오.","blank_username_or_password":"이메일 또는 사용자명, 비밀번호를 입력하십시오.","reset_password":"비밀번호 재설정","logging_in":"로그인 중..","or":"또는","authenticating":"인증 중...","awaiting_activation":"계정이 아직 미활성 상태입니다. 활성화 메일을 보내려면 비밀번호 찾기 링크를 사용하세요.","awaiting_approval":"사용자님의 계정은 아직 관리자의 승인이 처리되지 않았습니다. 승인되면 이메일이 전송됩니다.","requires_invite":"죄송합니다. 이 포럼에 대한 접근은 초대를 통해서만 가능합니다.","not_activated":"아직 로그인 할 수 없습니다. 이전에 활성화 이메일을 \u003cb\u003e%{sentTo}\u003c/b\u003e로 보냈습니다. 해당 이메일의 지침에 따라 계정을 활성화하십시오.","not_allowed_from_ip_address":"해당 IP 주소로는 로그인 할 수 없습니다.","admin_not_allowed_from_ip_address":"해당 IP 주소에서는 관리자로 로그인 할 수 없습니다.","resend_activation_email":"활성화 이메일을 다시 보내려면 여기를 클릭하십시오.","omniauth_disallow_totp":"계정의 2단계 인증이 활성화되어 있습니다. 비밀번호로 로그인하세요.","resend_title":"활성화 이메일 다시 보내기","change_email":"이메일 주소 변경","provide_new_email":"새 주소를 입력하면 확인 이메일이 다시 전송됩니다.","submit_new_email":"이메일 주소 업데이트","sent_activation_email_again":"\u003cb\u003e%{currentEmail}\u003c/b\u003e 주소로 다른 계정 활성화 이메일을 보냈습니다. 도착하는데 몇 분 정도 걸릴 수 있습니다. 스팸 폴더를 확인하십시오.","sent_activation_email_again_generic":"다른 활성화 이메일을 보냈습니다. 도착하는 데 몇 분이 걸릴 수 있습니다. 스팸 폴더를 확인하십시오.","to_continue":"로그인 해주세요","preferences":"사용자 기본 설정을 변경하려면 로그인해야 합니다.","not_approved":"계정이 아직 승인되지 않았습니다. 승인 되면 이메일로 알림을 받게 됩니다.","google_oauth2":{"name":"구글","title":"구글 사용"},"twitter":{"name":"트위터","title":"트위터 사용"},"instagram":{"name":"인스타그램","title":"인스타그램 사용"},"facebook":{"name":"페이스북","title":"페이스북 사용"},"github":{"name":"GitHub","title":"GitHub 사용"},"discord":{"name":"디스코드","title":"디스코드 사용"},"second_factor_toggle":{"totp":"대신 인증 자 앱을 사용하십시오.","backup_code":"대신 백업 코드 사용"}},"invites":{"accept_title":"초대","emoji":"봉투 이모티콘","welcome_to":"%{site_name}에 오신 것을 환영합니다!","invited_by":"사용자님을 초대한 사람 :","social_login_available":"또한 해당 이메일을 사용하여 소셜 로그인으로 로그인 할 수 있습니다.","your_email":"사용자님의 계정 이메일 주소는 \u003cb\u003e%{email}\u003c/b\u003e입니다.","accept_invite":"초대 수락","success":"사용자님의 계정이 생성되었으며 이제 로그인 되었습니다.","name_label":"이름","password_label":"비밀번호","optional_description":"(선택 사항)"},"password_reset":{"continue":"%{site_name}으로 가기"},"emoji_set":{"apple_international":"애플/인터내셔널","google":"구글","twitter":"트위터","emoji_one":"JoyPixels (이전의 EmojiOne)","win10":"윈10","google_classic":"구글 클래식","facebook_messenger":"페이스북 메신저"},"category_page_style":{"categories_only":"카테고리만","categories_with_featured_topics":"주요 글이 있는 카테고리","categories_and_latest_topics":"카테고리와 최신 글","categories_and_top_topics":"카테고리 및 주요 글","categories_boxes":"하위 카테고리가 있는 상자","categories_boxes_with_topics":"주요 글이 있는 상자"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"시작하다"},"conditional_loading_section":{"loading":"로드 중..."},"category_row":{"topic_count":{"other":"이 카테고리에는 %{count}개의 글이 있습니다"},"plus_subcategories_title":{"other":"%{name} 및 %{count}개의 하위 카테고리"},"plus_subcategories":{"other":"+ %{count}개의 하위 카테고리"}},"select_kit":{"default_header_text":"선택...","no_content":"일치하는 항목을 찾을 수 없음","filter_placeholder":"검색...","filter_placeholder_with_any":"검색 또는 생성...","create":"만들기: '%{content}'","max_content_reached":{"other":"%{count}개 항목만 선택할 수 있습니다."},"min_content_not_reached":{"other":"항목을 %{count}개 이상 선택하세요."},"invalid_selection_length":{"other":"선택은 %{count}글자 이상이어야 합니다."},"components":{"categories_admin_dropdown":{"title":"카테고리 관리"}}},"date_time_picker":{"from":"보내는사람","to":"받는사람"},"emoji_picker":{"filter_placeholder":"이모티콘 검색","smileys_\u0026_emotion":"웃는 얼굴과 감정","people_\u0026_body":"사람과 몸","animals_\u0026_nature":"동물과 자연","food_\u0026_drink":"음식과 음료","travel_\u0026_places":"여행 및 장소","activities":"활동","objects":"사물","symbols":"기호","flags":"신고","recent":"최근 사용","default_tone":"피부색 없음","light_tone":"밝은 피부색","medium_light_tone":"중간 밝기 피부색","medium_tone":"중간 피부색","medium_dark_tone":"중간 정도의 어두운 피부색","dark_tone":"어두운 피부색","default":"사용자 정의 이모티콘"},"shared_drafts":{"title":"공유 초안","notice":"이 항목은 공유 초안을 게시할 수 있는 사용자만 볼 수 있습니다.","destination_category":"대상 카테고리","publish":"공유 초안 게시","confirm_publish":"이 초안을 게시 하시겠습니까?","publishing":"글 게시 중..."},"composer":{"emoji":"이모티콘:)","more_emoji":"더보기...","options":"옵션","whisper":"귓속말","unlist":"목록에서 제외됨","add_warning":"경고 메시지","toggle_whisper":"귀속말 켜고 끄기","toggle_unlisted":"목록제외 켜고 끄기","posting_not_on_topic":"어떤 글에 댓글을 작성하시겠습니까?","saved_local_draft_tip":"로컬에 저장","similar_topics":"작성하려는 내용과 비슷한 글들...","drafts_offline":"오프라인 초안","edit_conflict":"충돌 편집","group_mentioned_limit":{"other":"\u003cb\u003e경고!\u003c/b\u003e \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e을 언급했지만 이 그룹에는 관리자가 구성한 멘션 제한인 %{count}명의 사용자보다 많은 회원이 있습니다. 아무도 알림을 받지 않습니다."},"group_mentioned":{"other":"%{group}을 언급하면, \u003ca href='%{group_link}'\u003e%{count}명\u003c/a\u003e의 회원에게 알림이 전송됩니다. 그렇게 하시겠습니까?"},"cannot_see_mention":{"category":"%{username}에게 멘션을 썼지만, 해당 사용자가 이 카테고리에 접근할 수 없기 때문에 알림이 가지 않습니다. 이 카테고리에 접근할 수 있는 그룹에 해당 멤버가 추가되어야 합니다.","private":"%{username}에게 멘션을 썼지만, 해당 사용자가 개인 메시지를 볼 수 없기 때문에 알림이 가지 않습니다. 이 개인 메시지에 해당 사용자를 초대해야 합니다."},"duplicate_link":"이 글에는 이미\u003cb\u003e%{domain}\u003c/b\u003e의 링크가 \u003cb\u003e@%{username}\u003c/b\u003e님이 \u003ca href='%{post_url}'\u003e%{ago}\u003c/a\u003e에 쓴 게시글에 포함되어 있습니다. 그래도 다시 작성하시겠습니까?","reference_topic_title":"RE : %{title}","error":{"title_missing":"제목은 필수 항목입니다","title_too_short":{"other":"제목은 %{count}자 이상이어야 합니다."},"title_too_long":{"other":"제목은 %{count}자를 초과 할 수 없습니다."},"post_missing":"게시물은 비워 둘 수 없습니다","post_length":{"other":"내용은 %{count}자 이상이어야 합니다."},"try_like":"%{heart} 버튼을 사용해 보셨습니까?","category_missing":"카테고리를 선택해주세요.","tags_missing":{"other":"최소한 %{count}개의 태그를 선택해야 합니다."},"topic_template_not_modified":"글 템플릿을 편집하여 글에 세부 정보와 세부 사항을 추가하십시오."},"save_edit":"편집 저장","overwrite_edit":"덮어 쓰기 편집","reply_original":"기존 글에 대한 댓글 작성","reply_here":"여기에 댓글을 작성하세요.","reply":"댓글","cancel":"취소","create_topic":"새글 작성","create_pm":"메시지","create_whisper":"귓속말","create_shared_draft":"공유 초안 만들기","edit_shared_draft":"공유 초안 편집","title":"혹은 Ctrl + Enter 누름","users_placeholder":"사용자 추가","title_placeholder":"이야기 나누고자 하는 내용을 한문장으로 적는다면?","title_or_link_placeholder":"여기에 제목을 입력하거나 링크를 붙여 넣으세요.","edit_reason_placeholder":"왜 편집 중입니까?","topic_featured_link_placeholder":"제목과 함께 표시된 링크를 입력하십시오.","remove_featured_link":"글에서 링크를 제거하십시오.","reply_placeholder":"여기에 입력하세요. Markdown, BBCode 또는 HTML을 사용하여 입력 할 수 있습니다. 이미지를 드래그하거나 붙여 넣을 수 있습니다.","reply_placeholder_no_images":"여기에 입력하세요. Markdown, BBCode 또는 HTML을 사용하여 작성합니다.","reply_placeholder_choose_category":"여기에 입력하기 전에 카테고리를 선택하십시오.","view_new_post":"새로운 글을 볼 수 있습니다.","saving":"저장하는 중","saved":"저장되었습니다!","saved_draft":"초안 게시가 진행 중입니다. 다시 시작하려면 탭하세요.","uploading":"업로드 중...","show_preview":"미리보기 열기 \u0026raquo;","hide_preview":"\u0026laquo; 미리보기 숨김","quote_post_title":"전체 글을 인용","bold_label":"B","bold_title":"굵게","bold_text":"굵게하기","italic_label":"I","italic_title":"기울이기 적용","italic_text":"강조하기","link_title":"하이퍼링크","link_description":"여기에 링크 설명을 입력하십시오.","link_dialog_title":"하이퍼링크 삽입","link_optional_text":"선택적 제목","link_url_placeholder":"글을 검색하려면 URL을 붙여 넣거나 입력하세요.","blockquote_title":"인용구","blockquote_text":"인용구","code_title":"코드","code_text":"미리 서식이 지정된 텍스트를 4칸 들여쓰기","paste_code_text":"여기에 코드를 입력하거나 붙여 넣습니다.","upload_title":"업로드","upload_description":"여기에 업로드 설명을 입력하십시오.","olist_title":"번호 매기기 목록","ulist_title":"글 머리 기호 목록","list_item":"목록 항목","toggle_direction":"방향 전환","help":"Markdown 편집 도움말","collapse":"글쓰기 화면 최소화","open":"글쓰기 화면을 엽니다","abandon":"글쓰기 화면을 닫고 초안을 삭제합니다.","enter_fullscreen":"전체 화면으로 글쓰기","exit_fullscreen":"전체 화면 글쓰기 종료","show_toolbar":"글 입력기 도구 모음 표시","hide_toolbar":"글 입력기 도구 모음 숨기기","modal_ok":"확인","modal_cancel":"취소","cant_send_pm":"죄송합니다. %{username}님에게 메시지를 보낼 수 없습니다.","yourself_confirm":{"title":"받는 사람 추가를 잊으셨나요?","body":"지금 이 메시지는 자신에게만 전송됩니다!"},"slow_mode":{"error":"이 항목은 느린 모드입니다. %{duration}마다 한 번만 게시 할 수 있습니다."},"admin_options_title":"이 글에 대한 옵션 설정","composer_actions":{"reply":"댓글","draft":"임시저장","edit":"편집","reply_to_post":{"label":"%{postUsername}님 게시물에 답장","desc":"특정 게시물에 답장"},"reply_as_new_topic":{"label":"링크 된 글로 답장","desc":"이 글에 링크된 새로운 글 쓰기","confirm":"새 글 초안이 저장되어 있으며 링크된 글을 만들면 덮어 쓰게됩니다."},"reply_as_new_group_message":{"label":"새 그룹 메시지로 답장","desc":"받는 사람이 같은 새 비공개 메시지 만들기"},"reply_as_private_message":{"label":"새 메시지","desc":"새 개인 메시지 쓰기"},"reply_to_topic":{"label":"댓글 쓰기","desc":"특정 게시물이 아닌 글에 대한 댓글"},"toggle_whisper":{"label":"귀속말 켜고 끄기","desc":"귓속말은 관리자만 볼 수 있습니다."},"create_topic":{"label":"새 글"},"shared_draft":{"label":"공유 초안","desc":"허용된 사용자만 볼 수 있는 글 초안 작성"},"toggle_topic_bump":{"label":"글 범프 전환","desc":"최신 회신 날짜를 변경하지 않고 회신"}},"reload":"새로 고침","ignore":"무시","details_title":"요약","details_text":"이 텍스트는 숨겨집니다."},"notifications":{"tooltip":{"regular":{"other":"%{count}개의 확인하지 않은 알림이 있습니다"},"message":{"other":"%{count}개의 읽지않은 메시지가 있습니다"},"high_priority":{"other":"읽지 않은 높은 우선 순위의 알림 %{count}개"}},"title":"@name 멘션 알림, 글에 대한 댓글, 개인 메시지 등에 대한 알림","none":"현재 알림을 불러올 수 없습니다.","empty":"알림이 없습니다.","post_approved":"사용자님의 게시물이 승인되었습니다","reviewable_items":"검토가 필요한 항목","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description} ","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description} ","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} 그리고 %{count} 그외 \u003c/span\u003e %{description}"},"liked_consolidated_description":{"other":"내 게시물 중 %{count}개를 좋아합니다."},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description} ","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e 님이 초대를 수락했습니다","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e 님이 %{description} (을)를 이동했습니다","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"'%{description}' 획득","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003e새 글\u003c/span\u003e %{description}","membership_request_accepted":"'%{group_name}'에 회원 가입","membership_request_consolidated":{"other":"'%{group_name}'의 회원 가입 요청 %{count}건"},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - 완료됨","group_message_summary":{"other":" %{group_name} 사서함에 %{count}개의 메시지가 있습니다"},"popup":{"mentioned":"\"%{topic}\"에서 %{username}님이 나를 멘션했습니다 - %{site_title}","group_mentioned":"\"%{topic}\"에서 %{username}님이 사용자님을 언급했습니다 - %{site_title}","quoted":"\"%{topic}\"에서 %{username}님이 사용자님을 인용했습니다 - %{site_title}","replied":"\"%{topic}\"에서 %{username}님이 사용자님에게 댓글을 달았습니다 - %{site_title}","posted":"\"%{topic}\"에서 %{username}님이 글을 게시하였습니다 - %{site_title}","private_message":"%{username}에서 \"%{topic}\"에 개인 메시지를 보냈습니다-%{site_title}","linked":"%{username}님이 \"%{topic}\" 글에서 사용자님을 링크했습니다 - %{site_title}","watching_first_post":"%{username}님이 새 글 \"%{topic}\"을 만들었습니다 - %{site_title}","confirm_title":"알림 사용 - %{site_title}","confirm_body":"완료! 알림이 활성화되었습니다.","custom":"%{site_title}의 %{username}님의 알림"},"titles":{"mentioned":"멘션","replied":"새 댓글","quoted":"인용됨","edited":"편집됨","liked":"새로운 좋아요","private_message":"새 개인 메시지","invited_to_private_message":"비공개 메시지에 초대됨","invitee_accepted":"초대 수락","posted":"새 글","moved_post":"게시물 이동됨","linked":"연결됨","bookmark_reminder":"북마크 알림","bookmark_reminder_with_name":"북마크 알림 - %{name}","granted_badge":"부여된 배지","invited_to_topic":"글에 초대","group_mentioned":"언급 된 그룹","group_message_summary":"새 그룹 메시지","watching_first_post":"새 글","topic_reminder":"글 알림","liked_consolidated":"새로운 좋아요","post_approved":"게시물 승인됨","membership_request_consolidated":"신규 멤버십 요청","reaction":"새로운 반응","votes_released":"투표가 발표되었습니다"}},"upload_selector":{"title":"이미지 추가","title_with_attachments":"이미지 또는 파일 추가","from_my_computer":"내 기기에서","from_the_web":"웹에서","remote_tip":"이미지 링크","remote_tip_with_attachments":"이미지 또는 파일의 링크 %{authorized_extensions}","local_tip":"기기에서 이미지 선택","local_tip_with_attachments":"기기에서 이미지 또는 파일 선택 %{authorized_extensions}","hint":"(편집기로 드래그 앤 드롭하여 업로드 할 수도 있습니다)","hint_for_supported_browsers":"편집기로 이미지를 끌어다 놓거나 붙여 넣을 수도 있습니다.","uploading":"업로드 중","select_file":"파일 선택","default_image_alt_text":"이미지"},"search":{"sort_by":"정렬 기준","relevance":"관련성","latest_post":"최신 글","latest_topic":"최신 글","most_viewed":"가장 많이 봄","most_liked":"가장 좋아함","select_all":"모두 선택","clear_all":"모두 지우기","too_short":"검색어가 너무 짧습니다.","result_count":{"other":"\u003cspan\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e에 대한 %{count}%{plus}개의 검색 결과\u003c/span\u003e"},"title":"글, 사용자 또는 카테고리 검색","full_page_title":"글 또는 댓글 검색","no_results":"검색 결과가 없습니다","no_more_results":"더 이상 결과가 없습니다.","post_format":"%{username}님의 글 #%{post_number}","results_page":"'%{term}'에 대한 검색 결과","more_results":"검색 결과가 많습니다. 검색 조건을 좁혀보세요.","cant_find":"원하는 것을 찾을 수 없습니까?","start_new_topic":"새 글을 만들어볼까요?","or_search_google":"혹은 구글에서 검색해볼 수도 있습니다.","search_google":"대신 구글에서 검색해보세요.","search_google_button":"구글","search_button":"검색","context":{"user":"@%{username}님의 글 검색","category":"#%{category} 카테고리에서 검색","tag":"#%{tag} 태그 검색","topic":"이 글에서 검색","private_messages":"메시지 검색"},"advanced":{"title":"상세 검색","posted_by":{"label":"글쓴이:"},"in_category":{"label":"분류됨"},"in_group":{"label":"그룹 내"},"with_badge":{"label":"배지 포함"},"with_tags":{"label":"태그 됨"},"filters":{"label":"항목/게시물 만 반환...","title":"제목에서만 일치","likes":"내가 좋아요 누름","posted":"내가 쓴 글","created":"내가 작성함","watching":"내가 주시중","tracking":"내가 팔로우중","private":"내 메시지","bookmarks":"내 북마크","first":"첫 번째 게시물입니다","pinned":"고정됨","seen":"읽음","unseen":"읽지 않음","wiki":"위키입니다","images":"이미지 포함","all_tags":"위의 모든 태그"},"statuses":{"label":"글 상태","open":"가 열렸습니다","closed":"가 닫혔습니다","public":"공개","archived":"보관 됨","noreplies":"댓글이 없습니다","single_user":"1명의 사용자를 포함합니다"},"post":{"count":{"label":"글"},"min":{"placeholder":"최소"},"max":{"placeholder":"최대"},"time":{"label":"게시 됨","before":"이전","after":"이후"}},"views":{"label":"조회"},"min_views":{"placeholder":"최소"},"max_views":{"placeholder":"최대"}}},"hamburger_menu":"다른 글 목록 또는 카테고리로 이동","new_item":"새 항목","go_back":"돌아가기","not_logged_in_user":"현재 활동 및 기본 설정에 대한 요약이 포함된 사용자 페이지","current_user":"사용자 페이지로 이동","view_all":"모두 보기","topics":{"new_messages_marker":"마지막 방문","bulk":{"select_all":"모두 선택","clear_all":"모두 지우기","unlist_topics":"목록에서 글 숨기기","relist_topics":"목록에서 글 다시 보이기","reset_read":"읽기 초기화","delete":"글 삭제","dismiss":"읽음","dismiss_read":"읽지 않은 항목 모두 읽음","dismiss_button":"읽음...","dismiss_tooltip":"새 게시물만 닫거나 글 팔로우 중지","also_dismiss_topics":"이 글 팔로우를 중지하여 다시 읽지 않은 것으로 표시되지 않도록합니다.","dismiss_new":"새글 모두 읽음","toggle":"글 일괄 선택 전환","actions":"일괄 적용","change_category":"카테고리 설정","close_topics":"글 닫기","archive_topics":"글 보관","notification_level":"알림","change_notification_level":"알림 수준 변경","choose_new_category":"글에 대한 새 카테고리 선택:","selected":{"other":"사용자님은 \u003cb\u003e%{count}\u003c/b\u003e개의 글을 선택했습니다."},"change_tags":"태그 바꾸기","append_tags":"태그 추가","choose_new_tags":"다음 글에 대한 새 태그를 선택하십시오:","choose_append_tags":"다음 글에 추가 할 새 태그를 선택하십시오:","changed_tags":"해당 글의 태그가 변경되었습니다.","remove_tags":"모든 태그 제거","confirm_remove_tags":{"other":"\u003cb\u003e%{count}\u003c/b\u003e개의 글에서 모든 태그가 제거됩니다. 확실한가요?"},"progress":{"other":"진행률: \u003cstrong\u003e%{count}\u003c/strong\u003e개의 글"}},"none":{"unread":"읽지 않은 글이 없습니다.","new":"새로운 글이 없습니다.","read":"아직 읽은 글이 없습니다.","posted":"아직 어떤 글도 게시하지 않았습니다.","ready_to_create":"지금 ","latest":"모두 확인했습니다!","bookmarks":"아직 북마크된 글이 없습니다.","category":"%{category}에 글이 없습니다.","top":"주요 글이 없습니다.","educate":{"new":"\u003cp\u003e새로운 글이 여기에 표시됩니다. 기본적으로 지난 2일 이내에 작성된 글은 새로운 글로 간주되며 \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e 가 표시됩니다.\u003c/p\u003e\u003cp\u003e이 기준을 변경하려면 \u003ca href=\"%{userPrefsUrl}\"\u003e환경설정\u003c/a\u003e에서 변경 하십시오.\u003c/p\u003e","unread":"\u003cp\u003e읽지 않은 글은 여기에 표시됩니다.\u003c/p\u003e\u003cp\u003e기본적으로 글은 읽지 않은 것으로 간주하고 다음과 같은 조건 중 하나를 만족하면 읽지 않은 글갯수 \u003cspan class=\"badge new-posts badge-notification\"\u003e1\u003c/span\u003e 을 표시합니다:\u003c/p\u003e\u003cul\u003e\u003cli\u003e글 만들기\u003c/li\u003e\u003cli\u003e글에 댓글달기\u003c/li\u003e\u003cli\u003e글을 4분 이상 읽기\u003c/li\u003e\u003c/ul\u003e\u003cp\u003e또는 글을 팔로우 하거나 지켜보기 위해 각 글의 밑부분에 달린 알림 제어판에서 설정하는 경우도 포합됩니다.\u003c/p\u003e\u003cp\u003e설정을 바꾸려면 \u003ca href=\"%{userPrefsUrl}\"\u003e환경설정\u003c/a\u003e 페이지로 가세요.\u003c/p\u003e"}},"bottom":{"latest":"더 이상 최근 글이 없습니다.","posted":"더 이상 작성한 글이 없습니다.","read":"더 이상 읽을 글이 없습니다.","new":"더 이상 새로운 글이 없습니다.","unread":"더 이상 읽지 않은 글이 없습니다.","category":"더 이상 %{category}에 글이 없습니다.","tag":"더 이상 %{tag}의 글이 없습니다.","top":"더 이상 주요 글이 없습니다.","bookmarks":"더이상 북마크한 글이 없습니다."}},"topic":{"filter_to":{"other":"이 글에 %{count}개의 게시글"},"create":"새글 쓰기","create_long":"새글 쓰기","open_draft":"초안 열기","private_message":"메시지 시작","archive_message":{"help":"저장함으로 이동","title":"저장됨"},"move_to_inbox":{"title":"받은 편지함으로 이동","help":"메시지를 받은 편지함으로 다시 이동"},"edit_message":{"help":"메시지의 첫 번째 게시물 수정","title":"편집"},"defer":{"help":"읽지 않은 상태로 표시","title":"연기"},"feature_on_profile":{"help":"사용자 카드 및 프로필에 이 글에 대한 링크 추가","title":"프로필 기능"},"remove_from_profile":{"warning":"프로필에 이미 추천 글이 있습니다. 계속하면 이 글이 기존 글을 대체합니다.","help":"사용자 프로필에서 이 항목에 대한 링크 제거","title":"프로필에서 제거"},"list":"글","new":"새 글","unread":"읽지 않음","new_topics":{"other":"%{count}개의 새로운 글"},"unread_topics":{"other":"%{count}개의 읽지 않은 글"},"title":"글","invalid_access":{"title":"비공개 글입니다.","description":"죄송합니다. 해당 글에 접근 할 수 없습니다!","login_required":"해당 글을 보려면 로그인이 필요합니다."},"server_error":{"title":"글을 불러오지 못했습니다.","description":"죄송합니다. 연결 문제로 인해 해당 글을 불러올 수 없습니다. 다시 시도하십시오. 문제가 지속되면 문의해 주시기 바랍니다"},"not_found":{"title":"글을 찾을 수 없음","description":"죄송합니다. 해당 글을 찾을 수 없습니다. 관리자가 삭제 한 것일 수 있습니다."},"total_unread_posts":{"other":"이 글에 %{count}개의 읽지 않은 게시 글이 있습니다."},"unread_posts":{"other":"이 글에 %{count}개의 읽지 않은 예전 게시물이 있습니다."},"new_posts":{"other":"마지막으로 읽은 이후 이 글에 %{count}개의 새로운 게시물이 있습니다."},"likes":{"other":"이 글에 %{count}개의 좋아요가 있습니다."},"back_to_list":"글 목록으로 돌아 가기","options":"글 옵션","show_links":"이 글의 링크 표시","toggle_information":"글의 세부 정보를 열고 닫습니다.","read_more_in_category":"더 읽을거리가 필요하신가요? %{catLink} 또는 %{latestLink}를 살펴보세요.","read_more":"%{catLink} 또는 %{latestLink}에서 더 많은 글을 찾으실 수 있습니다.","unread_indicator":"아직 이 글의 마지막 게시물을 읽은 회원이 없습니다.","browse_all_categories":"모든 카테고리 보기","browse_all_tags":"모든 태그 보기","view_latest_topics":"최근 글 보기","suggest_create_topic":"새로운 대화를 시작 하시겠습니까?","jump_reply_up":"이전 답글로 이동","jump_reply_down":"이후 답글로 이동","deleted":"글이 삭제되었습니다.","slow_mode_update":{"title":"느린 모드","select":"사용자는 이 글에 한 번 씩만 댓글을 작성 할 수 있습니다.","description":"빠르게 진행되거나 논쟁이되는 대화에서 신중한 대화를 유도하기위해 사용자는이 글에 추가로 글을 작성하기 위해서는 기다려야합니다.","save":"활성화","enabled_until":"(선택 사항) 다음 시점까지 사용:","remove":"비활성화","hours":"시간:","minutes":"분:","seconds":"초:","durations":{"15_minutes":"15분","1_hour":"1시간","4_hours":"4시간","1_day":"1일","1_week":"1주","custom":"사용자 지정 기간"}},"slow_mode_notice":{"duration":"이 글에 댓글을 작성하려면 %{duration}을 기다려야합니다."},"topic_status_update":{"title":"글 타이머","save":"타이머 설정","num_of_hours":"시간:","num_of_days":"일 수:","remove":"타이머 제거하기","publish_to":"게시되는 곳:","when":"게시일:","time_frame_required":"기간을 선택하세요.","min_duration":"기간은 0보다 커야 합니다."},"auto_update_input":{"none":"시간대 선택","now":"지금","later_today":"오늘 나중에","tomorrow":"내일","later_this_week":"이번 주말","this_weekend":"이번 주말","next_week":"다음 주","two_weeks":"2주","next_month":"다음 달","two_months":"2개월","three_months":"3개월","four_months":"4개월","six_months":"6개월","one_year":"1년","forever":"영원히","pick_date_and_time":"날짜 및 시간 선택","set_based_on_last_post":"마지막 게시글 기준으로 닫기"},"publish_to_category":{"title":"게시 예약"},"temp_open":{"title":"임시로 열기"},"auto_reopen":{"title":"자동으로 열린 글"},"temp_close":{"title":"임시로 닫기"},"auto_close":{"title":"글 자동 잠금","label":"자동으로 글 닫기 시간:","error":"유효한 값을 입력하십시오.","based_on_last_post":"글의 마지막 게시물이 이보다 오래 될 때까지 닫지 마십시오."},"auto_delete":{"title":"글 자동 삭제"},"auto_bump":{"title":"자동 끌어올림 글"},"reminder":{"title":"알림"},"auto_delete_replies":{"title":"댓글 자동 삭제"},"status_update_notice":{"auto_open":"이 글은 %{timeLeft}에 자동으로 열립니다.","auto_close":"이 글은 %{timeLeft}에 자동으로 닫힙니다.","auto_publish_to_category":"이 글은 \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e에 %{timeLeft} 후 게시됩니다.","auto_close_based_on_last_post":"이 글은 마지막 댓글이 달린 %{duration} 후 닫힙니다.","auto_delete":"이 글은 %{timeLeft}에 자동으로 삭제됩니다.","auto_bump":"이 글은 %{timeLeft}에 자동으로 끌어올려 집니다.","auto_reminder":"%{timeLeft}에 현재 글 알림","auto_delete_replies":"이 글에 대한 댓글은 %{duration}후에 자동으로 삭제됩니다."},"auto_close_title":"자동 닫기 설정","auto_close_immediate":{"other":"글의 마지막 게시물은 이미 %{count}시간이 지났으므로 해당 글은 즉시 닫힙니다."},"auto_close_momentarily":{"other":"글의 마지막 게시물은 이미 %{count}시간이 지났으므로 일시적으로 닫힙니다."},"timeline":{"back":"뒤로","back_description":"읽지 않은 마지막 게시물로 돌아가기","replies_short":"%{current} / %{total}"},"progress":{"title":"진행 중인 주제","go_top":"맨 위","go_bottom":"맨 아래","go":"이동","jump_bottom":"마지막 게시물로 이동","jump_prompt":"이동...","jump_prompt_of":{"other":"번째, %{count}개 중"},"jump_prompt_long":"이동...","jump_bottom_with_number":"%{post_number}로 이동","jump_prompt_to_date":"현재까지","jump_prompt_or":"또는","total":"총 게시물","current":"현재 글"},"notifications":{"title":"이 글에 대한 알림을 받는 빈도 변경","reasons":{"mailing_list_mode":"메일링 리스트 모드가 활성화되어 있으므로 이 글의 댓글을 메일로 받게 됩니다.","3_10":"이 글에 대한 태그를 주시중이므로 알림을 받게됩니다.","3_6":"이 카테고리를 주시중이므로 알림을 받게됩니다.","3_5":"이 글을 자동으로 주시하기 시작 했으므로 알림을 받게됩니다.","3_2":"이 글을 보고 있으므로 알림을 받게됩니다.","3_1":"이 글을 작성 했으므로 알림을 받게됩니다.","3":"이 글을 보고 있으므로 알림을 받게됩니다.","2_8":"이 카테고리를 팔로우 하고 있으므로 새 댓글 수가 표시됩니다.","2_4":"이 글에 댓글을 작성했기 때문에 새 글 수가 표시됩니다.","2_2":"이 글을 팔로우 하고 있기 때문에 새 글 수가 표시됩니다.","2":"\u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003e이 글을 읽었으므로 새 댓글 수가 표시됩니다\u003c/a\u003e.","1_2":"누군가가 사용자님을 @name 형식으로 멘션하거나 사용자님에게 댓글을 보내면 알림을 받게됩니다.","1":"누군가 @name 형식으로 나에게 멘션 했거나 내 글에 댓글이 달릴 때 알림을 받게 됩니다.","0_7":"이 카테고리의 모든 알림을 무시하고 있습니다.","0_2":"이 글에 대한 모든 알림을 무시하고 있습니다.","0":"이 글에 대한 모든 알림을 무시하고 있습니다."},"watching_pm":{"title":"모든 알림","description":"이 메시지의 모든 새 답글에 대한 알림을 받게되며 새 답글 수가 표시됩니다."},"watching":{"title":"모든 알림","description":"이 글의 모든 새 댓글에 대한 알림을 받게되며 새 댓글 수가 표시됩니다."},"tracking_pm":{"title":"알림","description":"이 메시지에 대한 새 답변 수가 표시됩니다. 누군가가 @name 형식으로 사용자님을 멘션하거나 사용자님에게 답글을 보내면 알림을 받게됩니다."},"tracking":{"title":"알림","description":"이 글에 대한 새 답글 수가 표시됩니다. 누군가가 @name 형식으로 사용자님을 멘션하거나 사용자님에게 답글을 보내면 알림을 받게됩니다."},"regular":{"title":"일반","description":"누군가가 @name 형식으로 사용자님에게 멘션하거나 사용자님에게 답글을 보내면 알림을 받게됩니다."},"regular_pm":{"title":"일반","description":"누군가 @name 형식으로 사용자님에게 멘션하거나 사용자님에게 답글을 보내면 알림을 받게됩니다."},"muted_pm":{"title":"알림끔","description":"이 메시지에 대해 어떠한 알림도 받지 않지 않습니다."},"muted":{"title":"알림 꺼짐","description":"이 글에 대한 어떠한 알림도 받지 않고 최근글 목록에도 표시되지 않습니다."}},"actions":{"title":"작업","recover":"글 삭제 취소","delete":"글 삭제","open":"글 열기","close":"글 닫기","multi_select":"게시물 선택…","slow_mode":"느린 모드 설정","timed_update":"글 타이머 설정...","pin":"글 고정...","unpin":"글 고정 해제...","unarchive":"글 보관 취소","archive":"글 보관","invisible":"목록에서 제외하기","visible":"목록에 넣기","reset_read":"값 재설정","make_public":"공개 글로 만들기","make_private":"개인 메시지 작성","reset_bump_date":"끌어올림 날짜 초기화"},"feature":{"pin":"글 고정","unpin":"글 고정 해제","pin_globally":"전체 공지글로 설정하기","make_banner":"배너 주제","remove_banner":"배너 주제 제거"},"reply":{"title":"댓글쓰기","help":"이 글에 대한 댓글을 작성합니다"},"clear_pin":{"title":"고정 취소","help":"더 이상 목록의 맨 위에 표시하지 않도록 이 주제의 고정 상태를 해제합니다."},"share":{"title":"공유하기","extended_title":"링크 공유","help":"이 글의 링크 공유"},"print":{"title":"프린트하기","help":"이 토픽을 인쇄하기 좋은 버전으로 보기"},"flag_topic":{"title":"신고하기","help":"이 주제를 주의깊게 보거나 비밀리에 주의성 알림을 보내기 위해 신고합니다","success_message":"신고했습니다"},"make_public":{"title":"공개 주제로 변환","choose_category":"공개 주제의 카테고리를 선택하십시오 :"},"feature_topic":{"title":"주요 주제로 설정","pin":" %{categoryLink} 카테고리 주제 목록 상단에 고정 until","unpin":"이 주제를 %{categoryLink} 카테고리 상단에서 제거 합니다.","unpin_until":"%{categoryLink} 카테고리 주제 목록 상단에서 이 주제를 제거하거나 \u003cstrong\u003e%{until}\u003c/strong\u003e까지 기다림.","pin_note":"개별적으로 사용자가 주제 고정을 취소할 수 있습니다.","pin_validation":"주제를 고정하려면 날짜를 지정해야 합니다.","not_pinned":" %{categoryLink} 카테고리에 고정된 주제가 없습니다.","already_pinned":{"other":"%{categoryLink}에 고정된 주제 개수: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"모든 주제 목록 상단 고정 until","confirm_pin_globally":{"other":"이미 전체적으로 고정 된 글이 %{count}개 있습니다. 고정 된 글이 너무 많으면 사용자들에게 불편을 줄 수 있습니다. 추가로 글을 전체 고정 하시겠습니까?"},"unpin_globally":"모든 주제 목록 상단에서 이 주제를 제거","unpin_globally_until":"모든 주제 목록 상단에서 이 주제를 제거하거나 \u003cstrong\u003e%{until}\u003c/strong\u003e까지 기다림.","global_pin_note":"개별적으로 사용자가 주제 고정을 취소할 수 있습니다.","not_pinned_globally":"전체 공지된 주제가 없습니다.","already_pinned_globally":{"other":"전체 공지된 주제 개수: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"이 주제를 모든 페이지의 상단에 나타나는 배너로 만들기","remove_banner":"모든 페이지에서 나타나는 배너에서 제거","banner_note":"사용자는 배너를 닫음으로써 배너를 나타나지 않게 할 수 있습니다. 단지 어떤 기간동안 딱 하나의 주제만이 배너로 지정 가능합니다.","no_banner_exists":"배너 주제가 없습니다.","banner_exists":"현재 배너 주제가 \u003cstrong class='badge badge-notification unread'\u003e있습니다\u003c/strong\u003e."},"inviting":"초대 중...","automatically_add_to_groups":"이 초청은 다음 그룹에 대한 접근권한도 포함합니다:","invite_private":{"title":"초대 메시지","email_or_username":"초대하려는 이메일 또는 아이디","email_or_username_placeholder":"이메일 또는 아이디","action":"초대","success":"사용자가 메세지에 참여할 수 있도록 초대했습니다.","success_group":"해당 사용자가 메세지에 참여할 수 있도록 초대했습니다.","error":"죄송합니다. 해당 사용자를 초대하는 도중 오류가 발생했습니다.","not_allowed":"죄송합니다. 해당 사용자를 초대할 수 없습니다.","group_name":"그룹명"},"controls":"글 관리","invite_reply":{"title":"초대하기","username_placeholder":"아이디","action":"초대장 보내기","help":"이메일을 통해 다른 사람을 이 주제에 초대합니다.","to_forum":"링크를 클릭하여 친구가 즉시 참여할 수 있도록 간단한 이메일을 보내드립니다.","to_topic_blank":"이 글에 초대 할 사람의 사용자명 또는 이메일 주소를 입력하십시오.","to_topic_email":"이메일 주소를 입력했습니다. 친구가 이 글에 즉시 댓글을 작성 할 수있는 초대장을 이메일로 보내드립니다.","to_topic_username":"아이디를 입력하셨습니다. 이 주제에 초대하는 링크와 함께 알림을 보내겠습니다.","to_username":"초대하려는 사용자의 아이디를 입력하세요. 이 주제에 초대하는 링크와 함께 알림을 보내겠습니다.","email_placeholder":"이메일 주소","success_email":"\u003cb\u003e%{invitee}\u003c/b\u003e로 초대장을 발송했습니다. 초대를 수락하면 알려 드리겠습니다. 초대상태를 확인하려면 사용자 페이지에서 '초대장' 탭을 선택하세요.","success_username":"사용자가 이 주제에 참여할 수 있도록 초대했습니다.","error":"그 사람을 초대할 수 없습니다. 혹시 이미 초대하진 않았나요? (Invites are rate limited)","success_existing_email":"해당 email을 사용하고 있는 사용자 \u003cb\u003e%{emailOrUsername}\u003c/b\u003e 가 이미 존재합니다. 그 사용자를 이 토픽에 참여하도록 초청했습니다."},"login_reply":"로그인하고 댓글 쓰기","filters":{"n_posts":{"other":"%{count} 글"},"cancel":"필터 제거"},"move_to":{"title":"로 이동","action":"로 이동","error":"소식을 이동하는 중에 오류가 발생했습니다."},"split_topic":{"title":"새로운 주제로 이동","action":"새로운 주제로 이동","topic_name":"새로운 주제 제목","radio_label":"새 주제글","error":"새로운 주제로 이동시키는데 문제가 발생하였습니다.","instructions":{"other":"새로운 주제를 생성하여, 선택한 \u003cb\u003e%{count}\u003c/b\u003e개의 글로 채우려고 합니다."}},"merge_topic":{"title":"이미 있는 주제로 옮기기","action":"이미 있는 주제로 옮기기","error":"이 주제를 이동시키는데 문제가 발생하였습니다.","radio_label":"기존 주제","instructions":{"other":" \u003cb\u003e%{count}\u003c/b\u003e개의 글을 옮길 주제를 선택해주세요."}},"move_to_new_message":{"title":"새 메시지로 이동","action":"새 메시지로 이동","message_title":"새 메시지 제목","radio_label":"새로운 메시지","participants":"참여자","instructions":{"other":"새 메시지를 작성하고 선택한 \u003cb\u003e%{count}\u003c/b\u003e개의 게시물로 채우려고 합니다."}},"move_to_existing_message":{"title":"기존 메시지로 이동","action":"기존 메시지로 이동","radio_label":"기존 메시지","participants":"참여자","instructions":{"other":"이동하고자 하는 \u003cb\u003e%{count}\u003c/b\u003e개의 게시물을 선택하십시오."}},"merge_posts":{"title":"선택한 게시글 합치기","action":"선택한 게시글 합치기","error":"선택한 게시글을 합치는 중 에러가 발생했습니다."},"publish_page":{"title":"페이지 출판","publish":"게시","description":"주제가 페이지로 게시되면 해당 URL을 공유 할 수 있으며 사용자 정의 스타일과 함께 표시됩니다.","slug":"강타","public":"공개","public_description":"관련 글이 비공개인 경우에도 해당 페이지를 볼 수 있습니다.","publish_url":"귀하의 페이지는 다음 위치에 게시되었습니다.","topic_published":"귀하의 주제는 다음 위치에 게시되었습니다.","preview_url":"귀하의 페이지는 다음 위치에 게시됩니다.","invalid_slug":"이 페이지를 게시 할 수 없습니다.","unpublish":"게시 취소","unpublished":"귀하의 페이지가 게시 해제되었으며 더 이상 액세스 할 수 없습니다.","publishing_settings":"게시 설정"},"change_owner":{"title":"소유자 변경","action":"작성자 바꾸기","error":"작성자를 바꾸는 중 에러가 발생하였습니다.","placeholder":"새로운 작성자의 아이디","instructions":{"other":"%{count}개의 \u003cb\u003e@%{old_user}\u003c/b\u003e님 게시물에 대한 새 소유자를 선택하십시오."},"instructions_without_old_user":{"other":"%{count}개의 게시물에 대한 새 소유자를 선택하십시오."}},"change_timestamp":{"title":"타임스탬프 변경하기...","action":"타임스탬프 변경","invalid_timestamp":"타임스탬프는 미래값으로 할 수 없습니다.","error":"주제의 시간을 변경하는 중 오류가 발생하였습니다.","instructions":"토픽의 새로운 타임스탬프를 선택해주세요. 토픽에 속한 게시글은 같은 시간 간격으로 조정됩니다."},"multi_select":{"select":"선택","selected":"(%{count})개가 선택됨","select_post":{"label":"선택","title":"선택에 게시물 추가"},"selected_post":{"label":"선택됨","title":"선택에서 게시물을 삭제하려면 클릭"},"select_replies":{"label":"선택 + 답글","title":"게시물과 모든 답글을 선택에 추가"},"select_below":{"label":"+ 아래에서 선택","title":"선택 후 게시물 및 게시물 추가"},"delete":"선택 삭제","cancel":"선택을 취소","select_all":"전체 선택","deselect_all":"전체 선택 해제","description":{"other":"\u003cb\u003e%{count}\u003c/b\u003e개의 개시글을 선택하셨어요."}},"deleted_by_author":{"other":"(작성자에 의해 취소된 글입니다. 글이 신고된 것이 아닌 한 %{count} 시간 뒤에 자동으로 삭제됩니다)"}},"post":{"quote_reply":"인용하기","quote_share":"공유","edit_reason":"사유: ","post_number":"%{number}번째 글","ignored":"무시 된 콘텐츠","wiki_last_edited_on":"%{dateTime}에 마지막으로 편집 된 위키","last_edited_on":"%{dateTime}에 마지막으로 수정 된 글","reply_as_new_topic":"연결된 주제로 답글 작성하기","reply_as_new_private_message":"같은 수신자에게 새로운 메시지로 답글쓰기","continue_discussion":"%{postLink}에서 토론을 계속:","follow_quote":"인용 글로 이동","show_full":"전체 글 보기","show_hidden":"무시 된 내용을 봅니다.","deleted_by_author":{"other":"(작성자에 의해 취소된 글입니다. 글이 신고된 것이 아닌 한 %{count} 시간 뒤에 자동으로 삭제됩니다)"},"collapse":"축소","expand_collapse":"확장/축소","locked":"이 글은 운영진에 의해 수정이 금지 되었습니다.","gap":{"other":"%{count}개의 숨겨진 답글 보기"},"notice":{"new_user":"%{user}님이 처음으로 작성한 글 입니다. 커뮤니티에 온 것을 환영해주세요!","returning_user":"우리가 %{user}을 본 지 오래되었습니다. 마지막 게시물은 %{time}입니다."},"unread":"읽지 않은 포스트","has_replies":{"other":"%{count}개의 댓글"},"has_replies_count":"%{count}","unknown_user":"(알 수 없음/삭제된 사용자)","has_likes_title":{"other":"%{count}명이 이 글을 좋아합니다"},"has_likes_title_only_you":"당신이 이 글을 좋아합니다.","has_likes_title_you":{"other":"당신 외 %{count}명이 이 글을 좋아합니다"},"filtered_replies_hint":{"other":"이 글과 %{count}개의 댓글 보기"},"filtered_replies_viewing":{"other":"댓글 %{count}개 보기"},"in_reply_to":"상위 게시물 로드","view_all_posts":"모든 글 보기","errors":{"create":"죄송합니다. 글을 만드는 동안 오류가 발생했습니다. 다시 시도하십시오.","edit":"죄송합니다. 글을 수정하는 중에 오류가 발생했습니다. 다시 시도하십시오.","upload":"죄송합니다. 해당 파일을 업로드하는 중에 오류가 발생했습니다. 다시 시도하십시오.","file_too_large":"죄송합니다, 해당 파일이 너무 큽니다. (최대 %{max_size_kb}KB) 대용량 파일은 클라우드 공유 서비스에 업로드 한 다음 링크를 붙여 넣으십시오.","too_many_uploads":"한번에 한 파일만 업로드 하실 수 있습니다.","too_many_dragged_and_dropped_files":{"other":"죄송합니다. 한 번에 %{count}개의 파일만 업로드 할 수 있습니다."},"upload_not_authorized":"죄송합니다. 허가되지 않은 확장자의 파일이 있습니다. (허가된 확장자: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"죄송합니다. 새로운 유저는 이미지를 업로드 하실 수 없습니다.","attachment_upload_not_allowed_for_new_user":"죄송합니다. 새로운 유저는 파일 첨부를 업로드 하실 수 없습니다.","attachment_download_requires_login":"죄송합니다. 첨부 파일을 받으려면 로그인이 필요합니다."},"abandon_edit":{"confirm":"변경 사항을 삭제 하시겠습니까?","no_value":"아니요, 버리지 않습니다.","no_save_draft":"아니오, 초안 저장","yes_value":"예, 편집 삭제"},"abandon":{"title":"초안 삭제","confirm":"글 작성을 취소 하시겠습니까?","no_value":"아니오","no_save_draft":"아니오, 초안 저장","yes_value":"예"},"via_email":"이 주제는 이메일을 통해 등록되었습니다.","via_auto_generated_email":"이 게시글은 자동 생성된 이메일로 작성되었습니다","whisper":"이 포스트는 운영자를 위한 비공개 귓말입니다.","wiki":{"about":"이 게시글은 위키입니다"},"archetypes":{"save":"옵션 저장"},"few_likes_left":"사랑을 나누어주셔서 감사합니다! 오늘 표시할 수 있는 좋아요가 얼마 남지 않았습니다.","controls":{"reply":"이 글에 대한 답글을 작성합니다.","like":"이 글을 좋아합니다.","has_liked":"이 글을 좋아합니다.","read_indicator":"이 게시물을 읽는 회원","undo_like":"'좋아요' 취소","edit":"이 글 편집","edit_action":"편집","edit_anonymous":"이 주제를 수정하려면 먼저 로그인을 해야합니다.","flag":"이 글을 신고하고 개인 알림을 받습니다","delete":"이 글을 삭제합니다.","undelete":"이 글 삭제를 취소합니다.","share":"이 글의 링크 공유","more":"더","delete_replies":{"confirm":"이 글에 대한 댓글을 삭제 하시겠습니까?","direct_replies":{"other":"예, %{count}개 직접 답장"},"all_replies":{"other":"예, %{count}개 모두 답변"},"just_the_post":"아니오, 글만 삭제합니다."},"admin":"관리자 기능","wiki":"위키 만들기","unwiki":"위키 제거하기","convert_to_moderator":"스태프 색상 추가하기","revert_to_regular":"스태프 색상 제거하기","rebake":"HTML 다시 빌드하기","publish_page":"페이지 출판","unhide":"숨기지 않기","change_owner":"소유자 변경","grant_badge":"배지 부여","lock_post":"글 잠그기","lock_post_description":"포스터가이 게시물을 편집하지 못하도록 방지","unlock_post":"글 잠금 해제","unlock_post_description":"작성자가 글을 수정하도록 허용","delete_topic_disallowed_modal":"이 주제를 삭제할 권한이 없습니다. 실제로 삭제하려면 추론과 함께 중재자주의 플래그를 제출하십시오.","delete_topic_disallowed":"이 글을 삭제할 수있는 권한이 없습니다","delete_topic_confirm_modal":{"other":"이 글은 현재 조회수가 %{count}회 이상이며 인기 글 검색 대상 일 수 있습니다. 이 글을 개선하기 위해 편집하는 대신 완전히 삭제 하시겠습니까?"},"delete_topic_confirm_modal_yes":"예, 이 글을 삭제합니다.","delete_topic_confirm_modal_no":"아니요, 이 글을 유지합니다.","delete_topic_error":"이 항목을 삭제하는 동안 오류가 발생했습니다.","delete_topic":"글 삭제","add_post_notice":"직원 공지 사항 추가","change_post_notice":"관리자 공지 변경","delete_post_notice":"관리자 공지 삭제","remove_timer":"타이머를 제거"},"actions":{"people":{"like":{"other":"좋아요"},"read":{"other":"이것을 읽으세요"},"like_capped":{"other":"그리고 다른 사람들이 %{count} 좋아했습니다"},"read_capped":{"other":"그리고 다른 사람들이 %{count}회 읽었습니다"}},"by_you":{"off_topic":"이글을 주제에서 벗어났다고 신고했습니다","spam":"이글을 스팸으로 신고했습니다","inappropriate":"이 글을 부적절한 컨텐츠로 신고했습니다","notify_moderators":"운영자에게 알렸습니다","notify_user":"글쓴이에게 메시지를 보냈습니다"}},"delete":{"confirm":{"other":"정말로 %{count}개의 글을 삭제 하시겠습니까?"}},"merge":{"confirm":{"other":"정말로 이 %{count}개의 게시글을 합칠까요?"}},"revisions":{"controls":{"first":"초판","previous":"이전 판","next":"다음 판","last":"최신판","hide":"편집 기록 가리기","show":"편집 기록 보기","revert":"%{revision} 수정본으로 되돌리기","edit_wiki":"Wiki 편집","edit_post":"포스트 편집","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e / %{total}"},"displays":{"inline":{"title":"Show the rendered output with additions and removals inline","button":"HTML"},"side_by_side":{"title":"Show the rendered output diffs side-by-side","button":"HTML"},"side_by_side_markdown":{"title":"Raw source diff를 양쪽으로 보기","button":"Raw"}}},"raw_email":{"displays":{"raw":{"title":"raw 이메일 표시하기","button":"Raw"},"text_part":{"title":"이메일 텍스트 파트 보이기","button":"텍스트"},"html_part":{"title":"이메일 HTML 파트 보이기","button":"HTML"}}},"bookmarks":{"create":"북마크 만들기","edit":"북마크 수정","created":"생성일자","updated":"업데이트됨","name":"이름","name_placeholder":"이 북마크는 무엇입니까?","set_reminder":"알림","actions":{"delete_bookmark":{"name":"북마크 삭제","description":"프로필에서 북마크를 제거하고 북마크에 대한 모든 알림을 중지합니다"},"edit_bookmark":{"name":"북마크 수정","description":"북마크 이름을 수정하거나 알림 날짜 및 시간을 변경하십시오."}}},"filtered_replies":{"viewing_posts_by":"%{post_count} 개의 게시물 보기","viewing_subset":"몇 개의 댓글이 접혀 있습니다.","viewing_summary":"이 글의 요약 보기","post_number":"%{username}, 글 #%{post_number}","show_all":"모두 보기"}},"category":{"can":"허용","none":"(카테고리 없음)","all":"모든 카테고리","choose":"카테고리\u0026hellip;","edit":"수정","edit_dialog_title":"편집 : %{categoryName}","view":"카테고리 안의 주제 보기","back":"카테고리로 돌아 가기","general":"일반","settings":"설정","topic_template":"주제 템플릿","tags":"태그","tags_allowed_tags":"이 태그를 현재 카테고리로 제한:","tags_allowed_tag_groups":"이 태그 그룹을 현재 카테고리로 제한:","tags_placeholder":"(선택사항) 허용된 태그 목록","tags_tab_description":"위에 지정된 태그 및 태그 그룹은 현재 카테고리 및 태그가 지정된 카테고리에서만 사용할 수 있습니다. 그외 카테고리에서는 사용할 수 없습니다.","tag_groups_placeholder":"(선택사항) 허용된 태그 그룹 목록","manage_tag_groups_link":"태그 그룹 관리","allow_global_tags_label":"다른 태그도 허용","tag_group_selector_placeholder":"(선택 사항) 태그 그룹","required_tag_group_description":"새 글은 태그 그룹의 태그를 포함:","min_tags_from_required_group_label":"태그 수:","required_tag_group_label":"태그 그룹 :","topic_featured_link_allowed":"이 카테고리에 주요 링크 허용","delete":"카테고리 삭제","create":"새 카테고리","create_long":"새 카테고리 만들기","save":"카테고리 저장","slug":"카테고리 영문 고유명","slug_placeholder":"(Optional) dashed-words for url","creation_error":"카테고리 생성 중 오류가 발생했습니다.","save_error":"카테고리 저장 중 오류가 발생했습니다.","name":"카테고리 이름","description":"설명","topic":"카테고리 주제","logo":"카테고리 로고 이미지","background_image":"카테고리 백그라운드 이미지","badge_colors":"배지 색상","background_color":"배경 색상","foreground_color":"글씨 색상","name_placeholder":"짧고 간결해야합니다","color_placeholder":"웹 색상","delete_confirm":"이 카테고리를 삭제 하시겠습니까?","delete_error":"카테고리를 삭제하는 동안 오류가 발생했습니다.","list":"카테고리 목록","no_description":"이 카테고리에 대한 설명을 추가해주세요.","change_in_category_topic":"설명 편집","already_used":"이 색은 다른 카테고리에서 사용되고 있습니다.","security":"보안","security_add_group":"그룹 추가","permissions":{"group":"그룹","see":"보기","reply":"댓글","create":"만들기","no_groups_selected":"접근 권한이 부여된 그룹이 없습니다. 이 카테고리는 관리자만 볼 수 있습니다.","everyone_has_access":"이 카테고리는 공개이며, 누구나 볼 수 있고, 댓글을 작성 하고, 글을 쓸 수 있습니다. 사용 권한을 제한하려면 \"everyone\" 그룹에 부여된 사용 권한 중 하나 이상을 제거해야 합니다.","toggle_reply":"토글 댓글 권한","toggle_full":"토글 생성 권한","inherited":"이 권한은 \"everyone\" 으로부터 상속됩니다."},"special_warning":"경고: 이 카테고리는 사전 생성된 카테고리이기 때문에 보안 설정 변경이 불가합니다. 이 카테고리를 사용하고 싶지 않다면, 수정하지말고 삭제하세요.","uncategorized_security_warning":"이 카테고리는 특별합니다. 카테고리가없는 주제의 보관 영역으로 사용됩니다. 보안 설정을 가질 수 없습니다.","uncategorized_general_warning":"이 카테고리는 특별합니다. 카테고리를 선택하지 않은 새 주제의 기본 카테고리로 사용됩니다. 이 동작을 방지하고 범주를 강제로 선택 \u003ca href=\"%{settingLink}\"\u003e하려면 여기에서 설정을 비활성화하십시오\u003c/a\u003e . 이름이나 설명을 변경하려면 \u003ca href=\"%{customizeLink}\"\u003e사용자 정의 / 텍스트 내용으로 이동하십시오\u003c/a\u003e .","pending_permission_change_alert":"이 카테고리에 %{group}을 추가하지 않았습니다. 이 버튼을 클릭하여 추가하십시오.","images":"이미지","email_in":"incoming 메일 주소 수정","email_in_allow_strangers":"계정이 없는 익명 유저들에게 이메일을 받습니다.","email_in_disabled":"이메일을 통한 새 글 작성은 사이트 설정에서 비활성화되어 있습니다. 이메일을 통해 새 글을 작성 하려면 ","email_in_disabled_click":"\"이메일로 새 글 작성하기\"를 사용하도록 설정해야 합니다.","mailinglist_mirror":"카테고리는 메일 링리스트를 반영","show_subcategory_list":"이 카테고리의 글 위에 하위 카테고리 목록을 표시합니다.","read_only_banner":"사용자가이 카테고리에서 글을 작성 할 수 없는 경우의 배너 텍스트:","num_featured_topics":"카테고리 페이지에 표시되는 글 수:","subcategory_num_featured_topics":"상위 카테고리 페이지에 표시되는 주요 글 수:","all_topics_wiki":"기본으로 새로운 글 위키 만들기","subcategory_list_style":"하위 카테고리 목록 스타일:","sort_order":"글 목록 정렬 기준:","default_view":"글 기본 목록:","default_top_period":"기본 Top 기간:","default_list_filter":"목록 기본 필터:","allow_badges_label":"배지가 이 카테고리에서 주어질 수 있도록 허용","edit_permissions":"권한 수정","reviewable_by_group":"이 카테고리의 콘텐츠는 관리자 외에도 다음과 같은 방법으로 검토할 수 있습니다.","review_group_name":"그룹명","require_topic_approval":"모든 새 글에 대한 관리자 승인 필요","require_reply_approval":"모든 새 댓글의 관리자 승인 필요","this_year":"올해","position":"카테고리 정렬 순서:","default_position":"기본 위치","position_disabled":"카테고리는 활동량에 따라서 표시됩니다. 목록 내의 카테고리 순서를 지정하하려면","position_disabled_click":"\"카테고리 위치 고정\" 설정을 활성화 시키십시요.","minimum_required_tags":"글 작성에 필요한 최소 태그 수:","parent":"상위 카테고리","num_auto_bump_daily":"열린 글 중 매일 자동으로 끌어올릴 수:","navigate_to_first_post_after_read":"글을 읽은 후 첫 번째 게시물로 이동","notifications":{"watching":{"title":"주시 중","description":"이 카테고리의 모든 토픽을 주시하도록 자동 설정됩니다. 모든 토픽과 게시글에 대하여 알림을 받게 되며, 새로운 게시글의 수가 표시됩니다."},"watching_first_post":{"title":"새글 알림","description":"이 카테고리의 새 주제에 대한 알림을 받지만 주제에 대한 답장은 없습니다."},"tracking":{"title":"추적 중","description":"이 카테고리의 모든 토픽을 추적하도록 자동 설정됩니다. 다른 사용자가 당신의 @이름 을 언급하거나 당신의 게시글에 답글을 달 때 알림을 받게 되며 새로운 게시글의 수가 표시됩니다."},"regular":{"title":"알림 : 일반","description":"누군가 내 @아아디 으로 멘션했거나 당신의 글에 답글이 달릴 때 알림을 받게 됩니다."},"muted":{"title":"알림 꺼짐","description":"이 카테고리 내의 새 토픽에 대해 어떠한 알림도 받지 않으며, 최신 토픽 항목에도 나타나지 않습니다."}},"search_priority":{"label":"검색 우선 순위","options":{"normal":"알림 : 일반","ignore":"무시","very_low":"매우 낮은","low":"낮은","high":"높음","very_high":"매우 높음"}},"sort_options":{"default":"기본값","likes":"좋아요 수","op_likes":"원본 게시글 좋아요 수","views":"조회수","posts":"게시글 수","activity":"활동","posters":"게시자","category":"카테고리","created":"생성일자"},"sort_ascending":"오름차순","sort_descending":"내림차순","subcategory_list_styles":{"rows":"행수","rows_with_featured_topics":"주요 토픽의 행 스타일","boxes":"박스","boxes_with_featured_topics":"주요 토픽의 박스 스타일"},"settings_sections":{"general":"일반","moderation":"관리","appearance":"외관","email":"이메일"},"list_filters":{"all":"모든 글","none":"하위 카테고리 없음"},"colors_disabled":"카테고리 스타일이 없음이므로 색상을 선택할 수 없습니다."},"flagging":{"title":"우리 커뮤니티 질서를 지키는데 도와주셔서 감사합니다!","action":"글 신고했습니다","take_action":"조치하기...","take_action_options":{"default":{"title":"조치하기","details":"더 이상 커뮤니티 플래그를 기다리지 않고 바로 플래그 임계 값에 도달합니다."},"suspend":{"title":"사용자 차단","details":"플래그 임계 값에 도달하고 사용자를 차단합니다."},"silence":{"title":"글 작성 중지 사용자","details":"신고가 최대치에 도달했으며, 사용자의 글 작성을 중지시킵니다."}},"notify_action":"메시지 보내기","official_warning":"공식 경고","delete_spammer":"네, 스패머 회원을 삭제합니다","yes_delete_spammer":"예, 스팸 회원을 삭제합니다","ip_address_missing":"(알 수 없음)","hidden_email_address":"(숨김)","submit_tooltip":"비밀 신고하기","take_action_tooltip":"커뮤니티의 신고 수가 채워지기 기다리지 않고, 바로 신고 수를 제재 수준까지 채웁니다.","cant":"죄송합니다, 지금은 이 글을 신고할 수 없습니다","notify_staff":"운영진에게 알리기","formatted_name":{"off_topic":"주제에 벗어났습니다","inappropriate":"부적절 컨텐츠입니다","spam":"스팸입니다"},"custom_placeholder_notify_user":"구체적이고, 건설적이며, 항상 친절하세요.","custom_placeholder_notify_moderators":"구체적으로 회원님이 걱정하는 내용과 가능한 모든 관련된 링크를 제공해주세요.","custom_message":{"at_least":{"other":"최소 %{count}자 이상 입력하세요"},"more":{"other":"%{count} 남았습니다"},"left":{"other":"%{count} 남았습니다"}}},"flagging_topic":{"title":"우리 커뮤니티 질서를 지키는데 도와주셔서 감사합니다!","action":"주제 신고하기","notify_action":"메시지 보내기"},"topic_map":{"title":"주제 요약","participants_title":"빈번한 게시자","links_title":"인기 링크","links_shown":"더 많은 링크보기...","clicks":{"other":"%{count}번 클릭"}},"post_links":{"about":"이 게시글의 링크 더 보기","title":{"other":"%{count} more"}},"topic_statuses":{"warning":{"help":"공식적인 주의입니다."},"bookmarked":{"help":"북마크한 주제"},"locked":{"help":"이 주제는 폐쇄되었습니다. 더 이상 새 답글을 받을 수 없습니다."},"archived":{"help":"이 주제는 보관중입니다. 고정되어 변경이 불가능합니다."},"locked_and_archived":{"help":"이 토픽은 폐쇄되어 보관중입니다. 새로운 답글을 달거나 수정할 수 없습니다."},"unpinned":{"title":"고정 해제","help":"이 글은 고정 해제 상태입니다."},"pinned_globally":{"title":"전체에서 고정됨","help":"이 글은 전체에서 고정되어 있으며 최신 항목 및 해당 카테고리에 표시됩니다."},"pinned":{"title":"핀 지정됨","help":"이 주제는 고정되었습니다. 카테고리의 상단에 표시됩니다."},"unlisted":{"help":"이 주제는 목록에서 제외됩니다. 주제 목록에 표시되지 않으며 링크를 통해서만 접근 할 수 있습니다."},"personal_message":{"title":"이 주제는 개인 메시지입니다","help":"이 주제는 개인 메시지입니다"}},"posts":"글","original_post":"원본 글","views":"조회수","views_lowercase":{"other":"조회"},"replies":"댓글","views_long":{"other":"이 토픽은 %{number}번 조회되었습니다."},"activity":"활동","likes":"좋아요","likes_lowercase":{"other":"좋아요"},"users":"사용자","users_lowercase":{"other":"사용자"},"category_title":"카테고리","history":"기록","changed_by":"%{author}에 의해","raw_email":{"title":"수신 이메일","not_available":"Raw 이메일이 가능하지 않습니다."},"categories_list":"카테고리 목록","filters":{"with_topics":"%{filter} 주제","with_category":"%{filter} %{category} 주제","latest":{"title":"최근글","title_with_count":{"other":"최근글 (%{count})"},"help":"가장 최근 글"},"read":{"title":"읽은 글","help":"마지막으로 순서대로 읽은 주제"},"categories":{"title":"카테고리","title_in":"카테고리 - %{categoryName}","help":"카테고리별로 그룹화 된 모든 주제"},"unread":{"title":"읽지 않은 글","title_with_count":{"other":"읽지 않은 글 (%{count})"},"help":"팔로우 중인 읽지 않은 글","lower_title_with_count":{"other":"%{count} unread"}},"new":{"lower_title_with_count":{"other":"%{count} new"},"lower_title":"new","title":"새글","title_with_count":{"other":"새글 (%{count})"},"help":"지난 며칠 동안 작성된 글"},"posted":{"title":"내 글","help":"내가 게시한 글"},"bookmarks":{"title":"북마크","help":"북마크된 주제"},"category":{"title":"%{categoryName}","title_with_count":{"other":"%{categoryName} (%{count})"},"help":"%{categoryName}카테고리의 최신 주제"},"top":{"title":"인기글","help":"작년 또는 지난 달, 지난 주, 어제에 활발했던 주제","all":{"title":"전체 시간"},"yearly":{"title":"연"},"quarterly":{"title":"분기마다"},"monthly":{"title":"월"},"weekly":{"title":"주"},"daily":{"title":"일"},"all_time":"전체 시간","this_year":"년","this_quarter":"분기","this_month":"월","this_week":"주","today":"오늘","other_periods":"상단 참조 :"}},"browser_update":"안타깝게도 \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003e브라우저가 이 사이트에서 작동하지 않습니다\u003c/a\u003e. \u003ca href=\"https://browsehappy.com\"\u003e브라우저를 업그레이드\u003c/a\u003e하여 여러 내용을 읽고 댓글도 작성해보세요.","permission_types":{"full":"생성 / 답글 / 보기","create_post":"답글 / 보기","readonly":"보기"},"lightbox":{"download":"다운로드","previous":"이전 (왼쪽 화살표 키)","next":"다음 (오른쪽 화살표 키)","counter":"%total %의 %curr %","close":"닫기 (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003e내용을\u003c/a\u003e 로드 할 수 없습니다.","image_load_error":"\u003ca href=\"%url%\"\u003e이미지를\u003c/a\u003e 로드 할 수 없습니다."},"keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":",","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} 또는 %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1} / %{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"키보드 단축키","jump_to":{"title":"이동","home":"%{shortcut} 홈","latest":"%{shortcut} 최신","new":"%{shortcut} 새로운","unread":"%{shortcut} 읽지 않은","categories":"%{shortcut} 카테고리","top":"%{shortcut} 인기글","bookmarks":"%{shortcut} 북마크","profile":"%{shortcut} 프로필","messages":"%{shortcut} 메시지","drafts":"초안 %{shortcut}","next":"다음 항목 %{shortcut}","previous":"이전 글 %{shortcut}"},"navigation":{"title":"탐색","jump":"%{shortcut} 글 번호로 이동","back":"%{shortcut} 이전","up_down":"%{shortcut} 선택된 글 이동 \u0026uarr; \u0026darr;","open":"%{shortcut} 선택한 토픽 열기","next_prev":"%{shortcut} 이전/다음 섹션","go_to_unread_post":"%{shortcut} 읽지 않은 첫 번째 게시물로 이동"},"application":{"title":"어플리케이션","create":"%{shortcut} 새 토픽을 만듭니다.","notifications":"%{shortcut} 알림창 열기","hamburger_menu":"%{shortcut} 햄버거 메뉴 열기","user_profile_menu":"%{shortcut} 사용자 메뉴 열기","show_incoming_updated_topics":"%{shortcut} 갱신된 토픽 보기","search":"%{shortcut} 를 사용하여 검색","help":"%{shortcut} 키보드 도움말 열기","dismiss_new_posts":"%{shortcut} 새글을 읽은 상태로 표시하기","dismiss_topics":"%{shortcut} 토픽 무시하기","log_out":"%{shortcut} 로그아웃"},"composing":{"title":"식자","return":"%{shortcut} 글쓰기 화면으로 돌아가기","fullscreen":"%{shortcut} 전체 화면으로 글쓰기"},"bookmarks":{"title":"북마크","enter":"%{shortcut} 저장 후 닫기","later_today":"%{shortcut} 나중에 오늘","later_this_week":"%{shortcut} 이번 주 후반","tomorrow":"내일 %{shortcut}","next_week":"다음주에 %{shortcut}","next_month":"다음 달 %{shortcut}","next_business_week":"%{shortcut} 다음 주 시작","next_business_day":"%{shortcut} 다음 영업일","custom":"%{shortcut} 사용자 정의 날짜 및 시간","none":"알림 없음 %{shortcut}","delete":"%{shortcut} 북마크 삭제"},"actions":{"title":"액션","bookmark_topic":"%{shortcut} 북마크 토픽 켜고 끄기","pin_unpin_topic":"%{shortcut} 글 고정/고정 해제","share_topic":"%{shortcut} 토픽 공유","share_post":"%{shortcut} 게시글 공유","reply_as_new_topic":"%{shortcut} 연결된 토픽으로 답글 작성하기","reply_topic":"%{shortcut} 토픽에 답글 달기","reply_post":"%{shortcut} 글에 답글 달기","quote_post":"%{shortcut} 게시글 인용","like":"%{shortcut} 게시글에 좋아요 표시","flag":"%{shortcut} 게시글에 플래그달기","bookmark":"%{shortcut} 게시글 북마크","edit":"%{shortcut} 게시글 편집","delete":"%{shortcut} 게시글 삭제","mark_muted":"%{shortcut} 토픽 알람 : 끄기","mark_regular":"%{shortcut} 토픽 알람 : 일반(기본)으로 설정하기","mark_tracking":"%{shortcut} 토픽 알람 : 추적하기","mark_watching":"%{shortcut} 토픽 알람 : 주시하기","print":"%{shortcut} 토픽 인쇄하기","defer":"%{shortcut} 주제 지연","topic_admin_actions":"%{shortcut} 주제 열기 관리자 작업"},"search_menu":{"title":"검색 메뉴","prev_next":"%{shortcut} 선택을 위아래로 이동","insert_url":"%{shortcut} 열린 글 작성기에 선택 영역 삽입"}},"badges":{"earned_n_times":{"other":"이 배지를 %{count}번 받았습니다"},"granted_on":"%{date} 에 수여함","others_count":"(%{count})명의 사용자가 이 배지를 가지고 있습니다","title":"배지","allow_title":"이 배지는 타이틀로 사용할 수 있습니다","multiple_grant":"이 배지는 중복해서 취득할 수 있습니다","badge_count":{"other":"%{count}개의 배지"},"more_badges":{"other":"+%{count}개 이상"},"granted":{"other":"%{count}개 수여됨"},"select_badge_for_title":"타이틀로 사용할 배지 선택하기","none":"(없음)","successfully_granted":"%{username}에 %{badge}을 성공적으로 부여 함","badge_grouping":{"getting_started":{"name":"시작하기"},"community":{"name":"커뮤니티"},"trust_level":{"name":"회원 레벨"},"other":{"name":"기타"},"posting":{"name":"포스팅"}}},"tagging":{"all_tags":"모든 태그","other_tags":"기타 태그","selector_all_tags":"모든 태그","selector_no_tags":"태그 없음","changed":"바뀐 태그:","tags":"태그","choose_for_topic":"태그 선택","info":"정보","default_info":"이 태그는 카테고리로 제한되지 않으며 동의어가 없습니다.","category_restricted":"이 태그는 액세스 권한이없는 카테고리로 제한됩니다.","synonyms":"동의어","synonyms_description":"다음 태그를 사용하면 \u003cb\u003e%{base_tag_name}\u003c/b\u003e 으로 대체됩니다.","tag_groups_info":{"other":"이 태그는 다음 그룹에 속합니다: %{tag_groups}."},"category_restrictions":{"other":"다음 카테고리에서만 사용할 수 있습니다:"},"edit_synonyms":"동의어 관리","add_synonyms_label":"동의어 추가 :","add_synonyms":"추가","add_synonyms_explanation":{"other":"현재 이 태그를 사용하는 모든 게시물의 태그가 \u003cb\u003e%{tag_name}\u003c/b\u003e으로 변경됩니다. 정말로 변경 하시겠습니까?"},"add_synonyms_failed":"다음 태그를 동의어로 추가 할 수 없습니다 : \u003cb\u003e%{tag_names}\u003c/b\u003e . 동의어가없고 다른 태그의 동의어가 아닌지 확인하십시오.","remove_synonym":"동의어 제거","delete_synonym_confirm":"동의어 \u0026quot;%{tag_name}\u0026quot;를 삭제 하시겠습니까?","delete_tag":"태그 삭제","delete_confirm":{"other":"정말로 이 태그를 삭제하고 이 태그가 붙은 %{count} 개의 토픽에서 태그를 제거할까요?"},"delete_confirm_no_topics":"정말로 이 태그를 삭제할까요?","delete_confirm_synonyms":{"other":"%{count}개의 동의어도 삭제됩니다."},"rename_tag":"태그명 변경","rename_instructions":"새로운 태그명을 입력하세요:","sort_by":"정렬 기준:","sort_by_count":"개수","sort_by_name":"이름","manage_groups":"태그 그룹 관리","manage_groups_description":"태그 정리를 위한 그룹 정의","upload":"태그 업로드","upload_description":"CSV 파일을 업로드하여 대량으로 태그 생성","upload_instructions":"선택적으로 \u0026#39;tag_name, tag_group\u0026#39;형식의 태그 그룹이있는 한 줄에 하나씩.","upload_successful":"태그가 성공적으로 업로드되었습니다","delete_unused_confirmation":{"other":"%{count}개의 태그가 삭제됩니다: %{tags}"},"delete_unused_confirmation_more_tags":{"other":"%{tags} 외 %{count}개"},"delete_no_unused_tags":"사용되지 않은 태그가 없습니다.","tag_list_joiner":", ","delete_unused":"사용하지 않은 태그 삭제","delete_unused_description":"글 또는 개인 메시지에 첨부되지 않은 모든 태그 삭제","cancel_delete_unused":"취소","filters":{"without_category":"%{filter} %{tag} 토픽","with_category":"%{category}에서 %{filter}%{tag}태그가 달린 토픽","untagged_without_category":"%{filter} 태깅안된 토픽","untagged_with_category":"%{category}에서 %{filter}태그가 없는 토픽"},"notifications":{"watching":{"title":"주시중","description":"이 태그가 있는 모든 글이 자동으로 관심글로 설정 됩니다. 모든 새 글 및 댓글에 대한 알림을 받게되며 읽지 않은 게시물 및 새 게시물의 수도 글 옆에 표시됩니다."},"watching_first_post":{"title":"첫 게시글 주시중","description":"이 태그의 새 글에 대한 알림은 받지만 댓글 알림은 받지 않습니다."},"tracking":{"title":"추적중","description":"이 태그의 모든 글이 자동으로 관심글로 설정됩니다. 읽지 않은 글 및 새로운 게시물의 수가 글 옆에 표시됩니다."},"regular":{"title":"일반","description":"누군가 당신의 @아이디 로 언급했거나 당신의 글에 답글이 달릴 때 알림을 받게 됩니다."},"muted":{"title":"알림끔","description":"이 태그의 새 글에 대한 알림이 표시되지 않으며, 읽지 않은 탭에도 표시되지 않습니다."}},"groups":{"title":"태그 그룹","about":"태그 관리를 쉽게하려면 그룹에 태그를 추가하세요.","new":"새 그룹","tags_label":"이 그룹의 태그:","parent_tag_label":"부모 태그:","parent_tag_description":"이 그룹에 속한 태그는 부모 태그가 붙기 전에는 사용할 수 없습니다.","one_per_topic_label":"이 그룹의 태그는 토픽당 하나만 선택할 수 있도록 제한하기","new_name":"새 태그 그룹","name_placeholder":"태그 그룹명","save":"저장","delete":"삭제","confirm_delete":"이 태그 그룹을 삭제 하시겠습니까?","everyone_can_use":"모든 사람이 태그를 사용할 수 있습니다","usable_only_by_groups":"태그는 모든 사람에게 보이지만 다음 그룹만 태그를 사용할 수 있습니다.","visible_only_to_groups":"태그는 다음 그룹에만 표시됩니다."},"topics":{"none":{"unread":"읽지 않은 토픽이 없습니다.","new":"새로운 토픽이 없습니다.","read":"아직 어떠한 토픽도 읽지 않았습니다.","posted":"아직 게시글을 하나도 쓰지 않았습니다.","latest":"최신 토픽이 없습니다.","bookmarks":"북마크한 토픽이 없습니다.","top":"주요 글이 없습니다."}}},"invite":{"custom_message":"\u003ca href\u003e맞춤 메시지\u003c/a\u003e 를 작성하여 초대를 좀 더 개인적으로 만드십시오.","custom_message_placeholder":"사용자 설정 메시지를 입력하세요","approval_not_required":"사용자는이 초대를 수락하는 즉시 자동 승인됩니다.","custom_message_template_forum":"저기요, 이 포럼에 가입하셔야 해요!","custom_message_template_topic":"이 토픽에 흥미 있을 거 같은데요!"},"forced_anonymous":"극단적 인로드로 인해 로그 아웃 한 사용자가 볼 수있는 것처럼 모든 사람에게 일시적으로 표시됩니다.","footer_nav":{"back":"이전","forward":"앞으로","share":"공유","dismiss":"읽음"},"safe_mode":{"enabled":"안전모드가 활성화 되었습니다. 안전모드를 종료하려면 이 웹브라우저창을 닫아야 합니다."},"image_removed":"(이미지 제거됨)","do_not_disturb":{"title":"방해 금지...","label":"방해 금지","remaining":"%{remaining} 남음","options":{"half_hour":"30분","one_hour":"1시간","two_hours":"2시간","tomorrow":"내일까지","custom":"사용자 정의"},"set_schedule":"알림 일정 설정"},"presence":{"replying":{"other":"댓글 작성중"},"editing":{"other":"수정중"},"replying_to_topic":{"other":"댓글 작성중"}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"모든 신규 사용자를 위한 튜토리얼을 시작합니다.","welcome_message":"모든 신규 사용자에게 퀵 스타트 가이드와 함께 환영 메세지를 보냅니다."}},"details":{"title":"세부 정보 숨기기"},"discourse_local_dates":{"relative_dates":{"today":"오늘 %{time}","tomorrow":"내일 %{time}","yesterday":"어제 %{time}","countdown":{"passed":"날짜가 지났습니다"}},"title":"날짜 / 시간 삽입","create":{"form":{"insert":"삽입","advanced_mode":"고급 모드","simple_mode":"단순 모드","format_description":"사용자에게 날짜를 표시하는 데 사용되는 형식. \"\\T\\Z\"를 사용하여 사용자 시간대를 단어 (유럽/파리)로 표시하십시오","timezones_title":"표시 할 시간대","timezones_description":"시간대는 미리보기 및 폴백으로 날짜를 표시하는 데 사용됩니다.","recurring_title":"반복","recurring_description":"이벤트의 반복을 정의하십시오. 양식에서 생성 된 반복 옵션을 수동으로 편집하고 연도, 분기, 월, 주, 일, 시, 분, 초, 밀리 초 중 하나를 사용할 수 있습니다.","recurring_none":"반복 없음","invalid_date":"날짜가 잘못되었습니다. 날짜와 시간이 올바른지 확인하십시오","date_title":"날짜","time_title":"시간","format_title":"날짜 형식","timezone":"시간대","until":"까지...","recurring":{"every_day":"매일","every_week":"매주","every_two_weeks":"2주마다","every_month":"매월","every_two_months":"2개월마다","every_three_months":"3개월마다","every_six_months":"6개월마다","every_year":"매년"}}}},"styleguide":{"title":"스타일 가이드","welcome":"시작하려면 왼쪽 메뉴에서 섹션을 선택하세요.","categories":{"atoms":"Atoms","molecules":"분자","organisms":"유기체"},"sections":{"typography":{"title":"타이포그래피","example":"Discourse에 오신 것을 환영합니다","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"날짜/시간 입력"},"font_scale":{"title":"글꼴 시스템"},"colors":{"title":"색상"},"icons":{"title":"아이콘","full_list":"Font Awesome Icons의 전체 목록보기"},"input_fields":{"title":"입력 필드"},"buttons":{"title":"버튼"},"dropdowns":{"title":"드롭다운"},"categories":{"title":"카테고리"},"bread_crumbs":{"title":"메뉴 경로"},"navigation":{"title":"내비게이션"},"navigation_bar":{"title":"내비게이션 바"},"navigation_stacked":{"title":"내비게이션 스택"},"categories_list":{"title":"카테고리 목록"},"topic_link":{"title":"글 링크"},"topic_list_item":{"title":"글 목록 항목"},"topic_statuses":{"title":"글 상태"},"topic_list":{"title":"글 목록"},"basic_topic_list":{"title":"기본 글 목록"},"footer_message":{"title":"하단 메시지"},"signup_cta":{"title":"가입 CTA"},"topic_timer_info":{"title":"글 타이머"},"topic_footer_buttons":{"title":"글 하단 버턴"},"topic_notifications":{"title":"글 알림"},"post":{"title":"글"},"topic_map":{"title":"글 맵"},"site_header":{"title":"사이트 헤더"},"suggested_topics":{"title":"주요 글"},"post_menu":{"title":"글쓰기 메뉴"},"modal":{"title":"모달","header":"모달 제목","footer":"모달 하단"},"user_about":{"title":"사용자 소개 상자"},"header_icons":{"title":"헤더 아이콘"},"spinners":{"title":"스피너"}}},"poll":{"voters":{"other":"투표자"},"total_votes":{"other":"전체 투표"},"average_rating":"평균: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"투표는 \u003cstrong\u003e공개\u003c/strong\u003e 입니다."},"results":{"groups":{"title":"이 여론 조사에 투표하려면 %{groups} 회원이어야합니다."},"vote":{"title":"\u003cstrong\u003e투표\u003c/strong\u003e 결과가 표시됩니다."},"closed":{"title":"결과가 \u003cstrong\u003e닫히면 표시\u003c/strong\u003e 됩니다."},"staff":{"title":"결과는 \u003cstrong\u003e직원\u003c/strong\u003e 에게만 표시됩니다."}},"multiple":{"help":{"at_least_min_options":{"other":"최소 \u003cstrong\u003e%{count}\u003c/strong\u003e개의 옵션을 선택하십시오."},"up_to_max_options":{"other":"최대 \u003cstrong\u003e%{count}\u003c/strong\u003e개의 옵션을 선택하십시오."},"x_options":{"other":"\u003cstrong\u003e%{count}\u003c/strong\u003e 옵션 선택"},"between_min_and_max_options":"\u003cstrong\u003e%{min}\u003c/strong\u003e 과 \u003cstrong\u003e%{max}\u003c/strong\u003e 중에서 옵션을 선택하십시오."}},"cast-votes":{"title":"표 던지기","label":"지금 투표!"},"show-results":{"title":"투표 결과 표시","label":"결과 보기"},"hide-results":{"title":"투표로 돌아가기","label":"투표 표시"},"group-results":{"title":"사용자 필드 별 그룹 투표","label":"고장 표시"},"export-results":{"title":"설문 조사 결과 내보내기","label":"내보내기"},"open":{"title":"투표 열기","label":"열기","confirm":"투표를 여시겠습니까?"},"close":{"title":"투표 닫기","label":"닫기","confirm":"정말 이 투표를 닫으시겠어요?"},"automatic_close":{"closes_in":"\u003cstrong\u003e%{timeLeft}\u003c/strong\u003e 에서 닫습니다.","age":"휴관일 \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"투표 결과","votes":"%{count} 투표","breakdown":"분석","percentage":"백분율","count":"수"},"error_while_toggling_status":"죄송합니다. 이 투표의 상태를 바꾸는 도중 에러가 발생하였습니다.","error_while_casting_votes":"죄송합니다. 투표를 하는 도중 에러가 발생하였습니다.","error_while_fetching_voters":"죄송합니다. 투표한 사람을 표시하는 도중 에러가 발생하였습니다.","error_while_exporting_results":"설문 조사 결과를 내보내는 중에 오류가 발생했습니다.","ui_builder":{"title":"투표 만들기","insert":"투표 삽입하기","help":{"options_count":"최소 1 개의 옵션을 입력하십시오","invalid_values":"최소값은 최대값보다는 작아야 합니다.","min_step_value":"최소 단계 값은 1입니다."},"poll_type":{"label":"유형","regular":"단일 선택","multiple":"복수 선택","number":"점수 매기기"},"poll_result":{"label":"검색 결과","always":"항상 보이는","vote":"투표에","closed":"닫을 때","staff":"직원 만"},"poll_groups":{"label":"허용 된 그룹"},"poll_chart_type":{"label":"차트 종류","bar":"바","pie":"그래프"},"poll_config":{"max":"최대","min":"최소","step":"단계"},"poll_public":{"label":"투표한 사람 보기"},"poll_title":{"label":"제목 (선택 사항)"},"poll_options":{"label":"투표 선택지는 한줄에 하나씩 입력하세요"},"automatic_close":{"label":"설문 조사 자동 종료"}}},"admin":{"site_settings":{"categories":{"chat_integration":"채팅 통합"}}},"chat_integration":{"menu_title":"채팅 통합","settings":"설정","no_providers":"플러그인 설정에서 일부 제공자를 활성화해야합니다","channels_with_errors":"이 제공자의 일부 채널은 마지막으로 메시지를 송신 할 때 실패했습니다. 자세한 내용을 보려면 오류 아이콘을 클릭하십시오.","channel_exception":"메시지가이 채널로 마지막으로 전송 될 때 알 수없는 오류가 발생했습니다.","choose_group":"(그룹을 선택하십시오)","all_categories":"(전체 카테고리)","all_tags":"(모든 태그)","create_rule":"규칙 만들기","create_channel":"채널 만들기","delete_channel":"삭제","test_channel":"테스트","edit_channel":"수정","channel_delete_confirm":"이 채널을 삭제 하시겠습니까? 관련된 모든 규칙이 삭제됩니다.","test_modal":{"title":"테스트 메시지 보내기","topic":"토픽","send":"테스트 메시지 보내기","close":"닫기","error":"메시지를 보내는 동안 알 수없는 오류가 발생했습니다. 자세한 내용은 사이트 로그를 확인하십시오.","success":"메세지가 성공적으로 전송되었습니다"},"type":{"normal":"알림 : 일반","group_message":"그룹 메시지","group_mention":"그룹 언급"},"filter":{"mute":"알림 끄기","follow":"첫 번째 게시물 만","watch":"모든 게시물과 답글"},"rule_table":{"filter":"필터","category":"카테고리","tags":"태그","edit_rule":"수정","delete_rule":"삭제"},"edit_channel_modal":{"title":"채널 수정","save":"채널 저장","cancel":"취소","provider":"공급자","channel_validation":{"ok":"유효한","fail":"잘못된 형식"}},"edit_rule_modal":{"title":"규칙 수정","save":"규칙 저장","cancel":"취소","provider":"공급자","type":"형식","channel":"채널","filter":"필터","category":"카테고리","group":"그룹","tags":"태그","instructions":{"type":"그룹 메시지 또는 멘션에 대한 알림을 트리거하도록 유형 변경","filter":"알림 수준. 음소거는 다른 일치 규칙보다 우선합니다.","category":"이 규칙은 지정된 카테고리의 주제에만 적용됩니다.","group":"이 규칙은이 그룹을 참조하는 게시물에 적용됩니다.","tags":"지정된 경우이 규칙은 이러한 태그 중 하나 이상을 가진 주제에만 적용됩니다."}},"provider":{"slack":{"title":"느슨하게","param":{"identifier":{"title":"채널","help":"예 : #channel, @username"}},"errors":{"action_prohibited":"봇은 해당 채널에 게시 할 권한이 없습니다","channel_not_found":"지정된 채널이 여유 시간에 존재하지 않습니다"}},"telegram":{"title":"텔레그램","param":{"name":{"title":"이름","help":"채널을 설명하는 이름입니다. Telegram에 연결하는 데 사용되지 않습니다."},"chat_id":{"title":"채팅 ID","help":"봇이 제공 한 번호 또는 @channelname 형식의 브로드 캐스트 채널 식별자"}},"errors":{"channel_not_found":"지정된 채널이 텔레 그램에 없습니다","forbidden":"봇은이 채널에 게시 할 권한이 없습니다"}},"discord":{"title":"불일치","param":{"name":{"title":"이름","help":"채널을 설명하는 이름입니다. Discord 연결에는 사용되지 않습니다."},"webhook_url":{"title":"웹 후크 URL","help":"Discord 서버 설정에서 생성 된 웹 후크 URL"}}},"mattermost":{"title":"가장 중요한","param":{"identifier":{"title":"채널","help":"예 : #channel, @username"}},"errors":{"channel_not_found":"지정된 채널이 Mattermost에 존재하지 않습니다"}},"matrix":{"title":"매트릭스","param":{"name":{"title":"이름","help":"채널을 설명하는 이름입니다. Matrix에 연결하는 데 사용되지 않습니다."},"room_id":{"title":"방 ID","help":"회의실의 \u0026#39;개인 식별자\u0026#39;입니다. ! abcdefg : matrix.org와 같은 형식이어야합니다."}},"errors":{"unknown_token":"액세스 토큰이 유효하지 않습니다","unknown_room":"방 ID가 잘못되었습니다"}},"zulip":{"title":"줄립","param":{"stream":{"title":"흐름"},"subject":{"title":"제목"}}},"rocketchat":{"param":{"identifier":{"title":"채널","help":"예 : #channel, @username"}}},"gitter":{"param":{"name":{"title":"이름"},"webhook_url":{"title":"웹 후크 URL"}}}}}}},"en":{"js":{"number":{"human":{"storage_units":{"units":{"byte":{"one":"Byte"}}}}},"dates":{"tiny":{"less_than_x_seconds":{"one":"\u003c %{count}s"},"x_seconds":{"one":"%{count}s"},"less_than_x_minutes":{"one":"\u003c %{count}m"},"x_minutes":{"one":"%{count}m"},"about_x_hours":{"one":"%{count}h"},"x_days":{"one":"%{count}d"},"x_months":{"one":"%{count}mon"},"about_x_years":{"one":"%{count}y"},"over_x_years":{"one":"\u003e %{count}y"},"almost_x_years":{"one":"%{count}y"}},"medium":{"x_minutes":{"one":"%{count} min"},"x_hours":{"one":"%{count} hour"},"x_days":{"one":"%{count} day"}},"medium_with_ago":{"x_minutes":{"one":"%{count} min ago"},"x_hours":{"one":"%{count} hour ago"},"x_days":{"one":"%{count} day ago"},"x_months":{"one":"%{count} month ago"},"x_years":{"one":"%{count} year ago"}},"later":{"x_days":{"one":"%{count} day later"},"x_months":{"one":"%{count} month later"},"x_years":{"one":"%{count} year later"}}},"bootstrap_mode_enabled":{"one":"To make launching your new site easier, you are in bootstrap mode. All new users will be granted trust level 1 and have daily email summary emails enabled. This will be automatically turned off when %{count} user has joined."},"links_lowercase":{"one":"link"},"x_more":{"one":"%{count} More"},"character_count":{"one":"%{count} character"},"topic_count_latest":{"one":"See %{count} new or updated topic"},"topic_count_unread":{"one":"See %{count} unread topic"},"topic_count_new":{"one":"See %{count} new topic"},"review":{"topic_has_pending":{"one":"This topic has \u003cb\u003e%{count}\u003c/b\u003e post pending approval"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (of last flag)"},"agreed":{"one":"%{count}% agree"},"disagreed":{"one":"%{count}% disagree"},"ignored":{"one":"%{count}% ignore"}},"topics":{"unique_users":{"one":"%{count} user"}},"replies":{"one":"%{count} reply"},"approval":{"pending_posts":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e post pending."}}},"directory":{"total_rows":{"one":"%{count} user"},"map":{"title":"Users Map"},"list":{"title":"Users List"}},"groups":{"title":{"one":"Group"},"members":{"make_primary_description":"Make this the primary group for \u003cb\u003e%{username}\u003c/b\u003e","remove_primary_description":"Remove this as the primary group for \u003cb\u003e%{username}\u003c/b\u003e"}},"categories":{"topic_sentence":{"one":"%{count} topic"},"topic_stat":{"one":"%{number} / %{unit}"},"topic_stat_all_time":{"one":"%{number} total"},"topic_stat_sentence_week":{"one":"%{count} new topic in the past week."},"topic_stat_sentence_month":{"one":"%{count} new topic in the past month."}},"user":{"notification_schedule":{"to":"to"},"second_factor_backup":{"manage":{"one":"Manage backup codes. You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."},"remaining_codes":{"one":"You have \u003cstrong\u003e%{count}\u003c/strong\u003e backup code remaining."}},"email":{"auth_override_instructions":"Email can be updated from authentication provider.","frequency":{"one":"We'll only email you if we haven't seen you in the last minute."}},"invited":{"truncated":{"one":"Showing the first invite."}},"summary":{"topic_count":{"one":"topic created"},"post_count":{"one":"post created"},"likes_given":{"one":"given"},"likes_received":{"one":"received"},"days_visited":{"one":"day visited"},"topics_entered":{"one":"topic viewed"},"posts_read":{"one":"post read"},"bookmark_count":{"one":"bookmark"}},"map_location":{"title":"Map Location","warning":"Your location will be displayed publicly."}},"replies_lowercase":{"one":"reply"},"summary":{"description":{"one":"There is \u003cb\u003e%{count}\u003c/b\u003e reply."}},"category_row":{"topic_count":{"one":"%{count} topic in this category"},"plus_subcategories_title":{"one":"%{name} and one subcategory"},"plus_subcategories":{"one":"+ %{count} subcategory"}},"select_kit":{"filter_by":"Filter by: %{name}","select_to_filter":"Select a value to filter","max_content_reached":{"one":"You can only select %{count} item."},"min_content_not_reached":{"one":"Select at least %{count} item."},"invalid_selection_length":{"one":"Selection must be at least %{count} character."}},"composer":{"group_mentioned_limit":{"one":"\u003cb\u003eWarning!\u003c/b\u003e You mentioned \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, however this group has more members than the administrator configured mention limit of %{count} user. Nobody will be notified."},"group_mentioned":{"one":"By mentioning %{group}, you are about to notify \u003ca href='%{group_link}'\u003e%{count} person\u003c/a\u003e – are you sure?"},"error":{"title_too_short":{"one":"Title must be at least %{count} character"},"title_too_long":{"one":"Title can't be more than %{count} character"},"post_length":{"one":"Post must be at least %{count} character"},"tags_missing":{"one":"You must choose at least %{count} tag"}},"location":{"btn":"Add Location","title":"Add a Location"}},"notifications":{"tooltip":{"regular":{"one":"%{count} unseen notification"},"message":{"one":"%{count} unread message"},"high_priority":{"one":"%{count} unread high priority notification"}},"liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} and %{count} other\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"liked %{count} of your posts"},"membership_request_consolidated":{"one":"%{count} open membership request for '%{group_name}'"},"group_message_summary":{"one":"%{count} message in your %{group_name} inbox"}},"search":{"result_count":{"one":"\u003cspan\u003e%{count} result for\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"}},"topics":{"bulk":{"selected":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e topic."},"confirm_remove_tags":{"one":"All tags will be removed from this topic. Are you sure?"},"progress":{"one":"Progress: \u003cstrong\u003e%{count}\u003c/strong\u003e topic"}}},"topic":{"filter_to":{"one":"%{count} post in topic"},"new_topics":{"one":"%{count} new topic"},"unread_topics":{"one":"%{count} unread topic"},"total_unread_posts":{"one":"you have %{count} unread post in this topic"},"unread_posts":{"one":"you have %{count} unread old post in this topic"},"new_posts":{"one":"there is %{count} new post in this topic since you last read it"},"likes":{"one":"there is %{count} like in this topic"},"auto_close_immediate":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed immediately."},"auto_close_momentarily":{"one":"The last post in the topic is already %{count} hour old, so the topic will be closed momentarily."},"progress":{"jump_prompt_of":{"one":"of %{count} post"}},"feature_topic":{"already_pinned":{"one":"Topics currently pinned in %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"confirm_pin_globally":{"one":"You already have %{count} globally pinned topic. Too many pinned topics may be a burden for new and anonymous users. Are you sure you want to pin another topic globally?"},"already_pinned_globally":{"one":"Topics currently pinned globally: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"}},"invite_reply":{"discourse_connect_enabled":"Enter the username of the person you'd like to invite to this topic."},"filters":{"n_posts":{"one":"%{count} post"}},"split_topic":{"instructions":{"one":"You are about to create a new topic and populate it with the post you've selected."}},"merge_topic":{"instructions":{"one":"Please choose the topic you'd like to move that post to."}},"move_to_new_message":{"instructions":{"one":"You are about to create a new message and populate it with the post you've selected."}},"move_to_existing_message":{"instructions":{"one":"Please choose the message you'd like to move that post to."}},"change_owner":{"instructions":{"one":"Please choose a new owner for the post by \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Please choose a new owner for the post"}},"multi_select":{"description":{"one":"You have selected \u003cb\u003e%{count}\u003c/b\u003e post."}},"deleted_by_author":{"one":"(topic withdrawn by author, will be automatically deleted in %{count} hour unless flagged)"}},"post":{"deleted_by_author":{"one":"(post withdrawn by author, will be automatically deleted in %{count} hour unless flagged)"},"gap":{"one":"view %{count} hidden reply"},"has_replies":{"one":"%{count} Reply"},"has_likes_title":{"one":"%{count} person liked this post"},"has_likes_title_you":{"one":"you and %{count} other person liked this post"},"filtered_replies_hint":{"one":"View this post and its reply"},"filtered_replies_viewing":{"one":"Viewing %{count} reply to"},"errors":{"too_many_dragged_and_dropped_files":{"one":"Sorry, you can only upload %{count} file at a time."}},"controls":{"delete_replies":{"direct_replies":{"one":"Yes, and %{count} direct reply"},"all_replies":{"one":"Yes, and %{count} reply"}},"delete_topic_confirm_modal":{"one":"This topic currently has over %{count} view and may be a popular search destination. Are you sure you want to delete this topic entirely, instead of editing it to improve it?"}},"actions":{"people":{"like":{"one":"liked this"},"read":{"one":"read this"},"like_capped":{"one":"and %{count} other liked this"},"read_capped":{"one":"and %{count} other read this"}}},"delete":{"confirm":{"one":"Are you sure you want to delete that post?"}},"merge":{"confirm":{"one":"Are you sure you want to merge those posts?"}}},"category":{"location_settings_label":"Locations","location_enabled":"Allow locations to be added to topics in this category","location_topic_status":"Enable location topic status icons for topic lists in this category.","location_map_filter_closed":"Filter closed topics from the map topic list in this category."},"flagging":{"custom_message":{"at_least":{"one":"enter at least %{count} character"},"more":{"one":"%{count} to go..."},"left":{"one":"%{count} remaining"}}},"topic_map":{"clicks":{"one":"%{count} click"}},"post_links":{"title":{"one":"%{count} more"}},"topic_statuses":{"location":{"help":"This topic has a location."}},"views_lowercase":{"one":"view"},"views_long":{"one":"this topic has been viewed %{count} time"},"likes_lowercase":{"one":"like"},"users_lowercase":{"one":"user"},"filters":{"latest":{"title_with_count":{"one":"Latest (%{count})"}},"unread":{"title_with_count":{"one":"Unread (%{count})"},"lower_title_with_count":{"one":"%{count} unread"}},"new":{"lower_title_with_count":{"one":"%{count} new"},"title_with_count":{"one":"New (%{count})"}},"category":{"title_with_count":{"one":"%{categoryName} (%{count})"}},"map":{"title":"Map","help":"Mark topics with locations in this category on a map."}},"badges":{"earned_n_times":{"one":"Earned this badge %{count} time"},"badge_count":{"one":"%{count} Badge"},"more_badges":{"one":"+%{count} More"},"granted":{"one":"%{count} granted"}},"tagging":{"tag_groups_info":{"one":"This tag belongs to the group \"%{tag_groups}\"."},"category_restrictions":{"one":"It can only be used in this category:"},"add_synonyms_explanation":{"one":"Any place that currently uses this tag will be changed to use \u003cb\u003e%{tag_name}\u003c/b\u003e instead. Are you sure you want to make this change?"},"delete_confirm":{"one":"Are you sure you want to delete this tag and remove it from %{count} topic it is assigned to?"},"delete_confirm_synonyms":{"one":"Its synonym will also be deleted."},"delete_unused_confirmation":{"one":"%{count} tag will be deleted: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} and %{count} more"}},"whos_online":{"title":"Online (%{count}):","tooltip":"Users seen in the last 5 minutes","no_users":"No users currently online"},"presence":{"replying":{"one":"replying"},"editing":{"one":"editing"},"replying_to_topic":{"one":"replying"}},"location":{"address":"Address","name":{"title":"Name (optional)","desc":"e.g. P. Sherman Dentist"},"street":{"title":"Number and Street","desc":"e.g. 42 Wallaby Way"},"postalcode":{"title":"Postal Code (Zip)","desc":"e.g. 2548"},"neighbourhood":{"title":"Neighbourhood","desc":"e.g. Cremorne Point"},"city":{"title":"City, Town or Village","desc":"e.g. Sydney"},"state":{"title":"State or Province","desc":"e.g. New South Wales"},"country_code":{"title":"Country","placeholder":"Select a Country"},"coordinates":"Coordinates","lat":{"title":"Latitude","desc":"e.g. -31.9456702"},"lon":{"title":"Longitude","desc":"e.g. 115.8626477"},"query":{"title":"Address","desc":"e.g. 42 Wallaby Way, Sydney."},"geo":{"desc":"Locations provided by {{provider}}","btn":{"label":"Find Address"},"results":"Addresses","no_results":"No results.","show_map":"Show Map","hide_map":"Hide Map"},"label":{"add":"Add a Location","title":"Show Location Details"},"clear":"Clear","done":"Done","errors":{"search":"There was a problem looking up that address. Please wait 5 seconds and try again."}},"map":{"search_placeholder":"Search"},"discourse_calendar":{"invite_user_notification":"%{username} invited you to: %{description}","on_holiday":"On Holiday","holiday":"Holiday","add_to_calendar":"Add to Google Calendar","region":{"title":"Region","none":"None","use_current_region":"Use Current Region","names":{"ar":"Argentina","at":"Austria","au_act":"Australia (au_act)","au_nsw":"Australia (au_nsw)","au_nt":"Australia (au_nt)","au_qld_brisbane":"Australia (au_qld_brisbane)","au_qld_cairns":"Australia (au_qld_cairns)","au_qld":"Australia (au_qld)","au_sa":"Australia (au_sa)","au_tas_north":"Australia (au_tas_north)","au_tas_south":"Australia (au_tas_south)","au_tas":"Australia (au_tas)","au_vic_melbourne":"Australia (au_vic_melbourne)","au_vic":"Australia (au_vic)","au_wa":"Australia (au_wa)","au":"Australia","be_fr":"Belgium (be_fr)","be_nl":"Belgium (be_nl)","bg_bg":"Bulgaria (bg_bg)","bg_en":"Bulgaria (bg_en)","br":"Brazil","ca_ab":"Canada (ca_ab)","ca_bc":"Canada (ca_bc)","ca_mb":"Canada (ca_mb)","ca_nb":"Canada (ca_nb)","ca_nl":"Canada (ca_nl)","ca_ns":"Canada (ca_ns)","ca_nt":"Canada (ca_nt)","ca_nu":"Canada (ca_nu)","ca_on":"Canada (ca_on)","ca_pe":"Canada (ca_pe)","ca_qc":"Canada (ca_qc)","ca_sk":"Canada (ca_sk)","ca_yt":"Canada (ca_yt)","ca":"Canada","ch_ag":"Switzerland (ch_ag)","ch_ai":"Switzerland (ch_ai)","ch_ar":"Switzerland (ch_ar)","ch_be":"Switzerland (ch_be)","ch_bl":"Switzerland (ch_bl)","ch_bs":"Switzerland (ch_bs)","ch_fr":"Switzerland (ch_fr)","ch_ge":"Switzerland (ch_ge)","ch_gl":"Switzerland (ch_gl)","ch_gr":"Switzerland (ch_gr)","ch_ju":"Switzerland (ch_ju)","ch_lu":"Switzerland (ch_lu)","ch_ne":"Switzerland (ch_ne)","ch_nw":"Switzerland (ch_nw)","ch_ow":"Switzerland (ch_ow)","ch_sg":"Switzerland (ch_sg)","ch_sh":"Switzerland (ch_sh)","ch_so":"Switzerland (ch_so)","ch_sz":"Switzerland (ch_sz)","ch_tg":"Switzerland (ch_tg)","ch_ti":"Switzerland (ch_ti)","ch_ur":"Switzerland (ch_ur)","ch_vd":"Switzerland (ch_vd)","ch_vs":"Switzerland (ch_vs)","ch_zg":"Switzerland (ch_zg)","ch_zh":"Switzerland (ch_zh)","ch":"Switzerland","cl":"Chile","co":"Colombia","cr":"Costa Rica","cz":"Czech Republic","de_bb":"Germany (de_bb)","de_be":"Germany (de_be)","de_bw":"Germany (de_bw)","de_by_augsburg":"Germany (de_by_augsburg)","de_by_cath":"Germany (de_by_cath)","de_by":"Germany (de_by)","de_hb":"Germany (de_hb)","de_he":"Germany (de_he)","de_hh":"Germany (de_hh)","de_mv":"Germany (de_mv)","de_ni":"Germany (de_ni)","de_nw":"Germany (de_nw)","de_rp":"Germany (de_rp)","de_sh":"Germany (de_sh)","de_sl":"Germany (de_sl)","de_sn_sorbian":"Germany (de_sn_sorbian)","de_sn":"Germany (de_sn)","de_st":"Germany (de_st)","de_th_cath":"Germany (de_th_cath)","de_th":"Germany (de_th)","de":"Germany","dk":"Denmark","ee":"Estonia","el":"Greece","es_an":"Spain (es_an)","es_ar":"Spain (es_ar)","es_ce":"Spain (es_ce)","es_cl":"Spain (es_cl)","es_cm":"Spain (es_cm)","es_cn":"Spain (es_cn)","es_ct":"Spain (es_ct)","es_ex":"Spain (es_ex)","es_ga":"Spain (es_ga)","es_ib":"Spain (es_ib)","es_lo":"Spain (es_lo)","es_m":"Spain (es_m)","es_mu":"Spain (es_mu)","es_na":"Spain (es_na)","es_o":"Spain (es_o)","es_pv":"Spain (es_pv)","es_v":"Spain (es_v)","es_vc":"Spain (es_vc)","es":"Spain","fi":"Finland","fr_a":"France (fr_a)","fr_m":"France (fr_m)","fr":"France","gb_con":"United Kingdom (gb_con)","gb_eaw":"United Kingdom (gb_eaw)","gb_eng":"United Kingdom (gb_eng)","gb_gsy":"United Kingdom (gb_gsy)","gb_iom":"United Kingdom (gb_iom)","gb_jsy":"United Kingdom (gb_jsy)","gb_nir":"United Kingdom (gb_nir)","gb_sct":"United Kingdom (gb_sct)","gb_wls":"United Kingdom (gb_wls)","gb":"United Kingdom","ge":"Georgia","gg":"Guernsey","hk":"Hong Kong","hr":"Croatia","hu":"Hungary","ie":"Ireland","im":"Isle of Man","is":"Iceland","it_bl":"Italy (it_bl)","it_fi":"Italy (it_fi)","it_ge":"Italy (it_ge)","it_pd":"Italy (it_pd)","it_rm":"Italy (it_rm)","it_ro":"Italy (it_ro)","it_to":"Italy (it_to)","it_tv":"Italy (it_tv)","it_ve":"Italy (it_ve)","it_vi":"Italy (it_vi)","it_vr":"Italy (it_vr)","it":"Italy","je":"Jersey","jp":"Japan","kr":"Korea (Republic of)","li":"Liechtenstein","lt":"Lithuania","lu":"Luxembourg","lv":"Latvia","ma":"Morocco","mt_en":"Malta (mt_en)","mt_mt":"Malta (mt_mt)","mx_pue":"Mexico (mx_pue)","mx":"Mexico","my":"Malaysia","ng":"Nigeria","nl":"Netherlands","no":"Norway","nz_ak":"New Zealand (nz_ak)","nz_ca":"New Zealand (nz_ca)","nz_ch":"New Zealand (nz_ch)","nz_hb":"New Zealand (nz_hb)","nz_mb":"New Zealand (nz_mb)","nz_ne":"New Zealand (nz_ne)","nz_nl":"New Zealand (nz_nl)","nz_ot":"New Zealand (nz_ot)","nz_sc":"New Zealand (nz_sc)","nz_sl":"New Zealand (nz_sl)","nz_ta":"New Zealand (nz_ta)","nz_we":"New Zealand (nz_we)","nz_wl":"New Zealand (nz_wl)","nz":"New Zealand","pe":"Peru","ph":"Philippines","pl":"Poland","pt_li":"Portugal (pt_li)","pt_po":"Portugal (pt_po)","pt":"Portugal","ro":"Romania","rs_cyrl":"Serbia (rs_cyrl)","rs_la":"Serbia (rs_la)","ru":"Russian Federation","se":"Sweden","sg":"Singapore","si":"Slovenia","sk":"Slovakia","th":"Thailand","tn":"Tunisia","tr":"Turkey","ua":"Ukraine","unitednations":" (unitednations)","ups":" (ups)","us_ak":"United States (us_ak)","us_al":"United States (us_al)","us_ar":"United States (us_ar)","us_az":"United States (us_az)","us_ca":"United States (us_ca)","us_co":"United States (us_co)","us_ct":"United States (us_ct)","us_dc":"United States (us_dc)","us_de":"United States (us_de)","us_fl":"United States (us_fl)","us_ga":"United States (us_ga)","us_gu":"United States (us_gu)","us_hi":"United States (us_hi)","us_ia":"United States (us_ia)","us_id":"United States (us_id)","us_il":"United States (us_il)","us_in":"United States (us_in)","us_ks":"United States (us_ks)","us_ky":"United States (us_ky)","us_la":"United States (us_la)","us_ma":"United States (us_ma)","us_md":"United States (us_md)","us_me":"United States (us_me)","us_mi":"United States (us_mi)","us_mn":"United States (us_mn)","us_mo":"United States (us_mo)","us_ms":"United States (us_ms)","us_mt":"United States (us_mt)","us_nc":"United States (us_nc)","us_nd":"United States (us_nd)","us_ne":"United States (us_ne)","us_nh":"United States (us_nh)","us_nj":"United States (us_nj)","us_nm":"United States (us_nm)","us_nv":"United States (us_nv)","us_ny":"United States (us_ny)","us_oh":"United States (us_oh)","us_ok":"United States (us_ok)","us_or":"United States (us_or)","us_pa":"United States (us_pa)","us_pr":"United States (us_pr)","us_ri":"United States (us_ri)","us_sc":"United States (us_sc)","us_sd":"United States (us_sd)","us_tn":"United States (us_tn)","us_tx":"United States (us_tx)","us_ut":"United States (us_ut)","us_va":"United States (us_va)","us_vi":"United States (us_vi)","us_vt":"United States (us_vt)","us_wa":"United States (us_wa)","us_wi":"United States (us_wi)","us_wv":"United States (us_wv)","us_wy":"United States (us_wy)","us":"United States","ve":"Venezuela","vi":"Virgin Islands (U.S.)","za":"South Africa"}}},"group_timezones":{"search":"Search...","group_availability":"%{group} availability"},"discourse_post_event":{"notifications":{"invite_user_notification":"%{username} has invited you to %{description}","invite_user_predefined_attendance_notification":"%{username} has automatically set your attendance and invited you to %{description}","before_event_reminder":"An event is about to start %{description}","after_event_reminder":"An event has ended %{description}","ongoing_event_reminder":"An event is ongoing  %{description}"},"preview":{"more_than_one_event":"You can’t have more than one event."},"edit_reason":"Event updated","topic_title":{"starts_at":"Event will start: %{date}","ended_at":"Event ended: %{date}","ends_in_duration":"Ends %{duration}"},"models":{"invitee":{"status":{"unknown":"Not interested","going":"Going","not_going":"Not Going","interested":"Interested"}},"event":{"expired":"Expired","status":{"standalone":{"title":"Standalone","description":"A standalone event can't be joined."},"public":{"title":"Public","description":"A public event can be joined by anyone."},"private":{"title":"Private","description":"A private event can only be joined by invited users."}}}},"event_ui":{"show_all":"Show all","participants":{"one":"%{count} user participated.","other":"%{count} users participated."},"invite":"Notify user","add_to_calendar":"Add to calendar","send_pm_to_creator":"Send PM to %{username}","edit_event":"Edit event","export_event":"Export event","created_by":"Created by","bulk_invite":"Bulk Invite","close_event":"Close event"},"invitees_modal":{"title_invited":"List of RSVPed users","title_participated":"List of users who participated","filter_placeholder":"Filter users"},"bulk_invite_modal":{"text":"Upload CSV file","title":"Bulk Invite","success":"File uploaded successfully, you will be notified via message when the process is complete.","error":"Sorry, file should be CSV format.","confirmation_message":"You’re about to notify everyone in the uploaded file.","description_public":"Public events only accept usernames for bulk invites.","description_private":"Private events only accept group names for bulk invites.","download_sample_csv":"Download a sample CSV file","send_bulk_invites":"Send invites","group_selector_placeholder":"Choose a group...","user_selector_placeholder":"Choose user...","inline_title":"Inline bulk invite","csv_title":"CSV bulk invite"},"builder_modal":{"custom_fields":{"label":"Custom Fields","placeholder":"Optional","description":"Allowed custom fields are defined in site settings. Custom fields are used to transmit data to other plugins."},"create_event_title":"Create Event","update_event_title":"Edit Event","confirm_delete":"Are you sure you want to delete this event?","confirm_close":"Are you sure you want to close this event?","create":"Create","update":"Save","attach":"Create event","add_reminder":"Add reminder","reminders":{"label":"Reminders"},"recurrence":{"label":"Recurrence","none":"No recurrence","every_day":"Every day","every_month":"Every month at this weekday","every_weekday":"Every weekday","every_week":"Every week at this weekday"},"url":{"label":"URL","placeholder":"Optional"},"name":{"label":"Event name","placeholder":"Optional, defaults to topic title"},"invitees":{"label":"Invited groups"},"status":{"label":"Status"}},"invite_user_or_group":{"title":"Notify user(s) or group(s)","invite":"Send"},"upcoming_events":{"title":"Upcoming events","creator":"Creator","status":"Status","starts_at":"Starts at"}},"poll":{"voters":{"one":"voter"},"total_votes":{"one":"total vote"},"multiple":{"help":{"at_least_min_options":{"one":"Choose at least \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"up_to_max_options":{"one":"Choose up to \u003cstrong\u003e%{count}\u003c/strong\u003e option."},"x_options":{"one":"Choose \u003cstrong\u003e%{count}\u003c/strong\u003e option."}}}},"chat_integration":{"group_mention_template":"Mentions of: @%{name}","group_message_template":"Messages to: @%{name}","filter":{"thread":"All posts with threaded replies"},"provider":{"zulip":{"param":{"stream":{"help":"The name of the Zulip stream the message should be sent to. e.g. 'general'"},"subject":{"help":"The subject that these messages sent by the bot should be given"}},"errors":{"does_not_exist":"That stream does not exist on Zulip"}},"rocketchat":{"title":"Rocket.Chat","errors":{"invalid_channel":"That channel does not exist on Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"help":"A Gitter room's name e.g. gitterHQ/services."},"webhook_url":{"help":"The URL provided when you create a new integration in a Gitter room."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Flow Token","help":"The flow token provided after creating a source for a flow into which you want to send messages."}}},"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}},"errors":{"not_found":"The path you attempted to post your message to was not found. Check the Bot ID in Site Settings.","instance_names_issue":"instance names incorrectly formatted or not provided"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Name","help":"A Teams channel name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Name","help":"A Webex space name e.g. discourse"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new incomming webhook"}},"errors":{"invalid_channel":"That channel does not exist on Webex"}},"google":{"title":"Google Chat","param":{"name":{"title":"Name","help":"A name for the channel (only shown in the Discourse admin interface)"},"webhook_url":{"title":"Webhook URL","help":"The URL provided when you create a new webhook"}}}}}}}};
I18n.locale = 'ko';
I18n.pluralizationRules.ko = MessageFormat.locale.ko;
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
//! locale : Korean [ko]
//! author : Kyungwook, Park : https://github.com/kyungw00k
//! author : Jeeeyul Lee <jeeeyul@gmail.com>

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var ko = moment.defineLocale('ko', {
        months: '1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월'.split('_'),
        monthsShort: '1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월'.split(
            '_'
        ),
        weekdays: '일요일_월요일_화요일_수요일_목요일_금요일_토요일'.split('_'),
        weekdaysShort: '일_월_화_수_목_금_토'.split('_'),
        weekdaysMin: '일_월_화_수_목_금_토'.split('_'),
        longDateFormat: {
            LT: 'A h:mm',
            LTS: 'A h:mm:ss',
            L: 'YYYY.MM.DD.',
            LL: 'YYYY년 MMMM D일',
            LLL: 'YYYY년 MMMM D일 A h:mm',
            LLLL: 'YYYY년 MMMM D일 dddd A h:mm',
            l: 'YYYY.MM.DD.',
            ll: 'YYYY년 MMMM D일',
            lll: 'YYYY년 MMMM D일 A h:mm',
            llll: 'YYYY년 MMMM D일 dddd A h:mm',
        },
        calendar: {
            sameDay: '오늘 LT',
            nextDay: '내일 LT',
            nextWeek: 'dddd LT',
            lastDay: '어제 LT',
            lastWeek: '지난주 dddd LT',
            sameElse: 'L',
        },
        relativeTime: {
            future: '%s 후',
            past: '%s 전',
            s: '몇 초',
            ss: '%d초',
            m: '1분',
            mm: '%d분',
            h: '한 시간',
            hh: '%d시간',
            d: '하루',
            dd: '%d일',
            M: '한 달',
            MM: '%d달',
            y: '일 년',
            yy: '%d년',
        },
        dayOfMonthOrdinalParse: /\d{1,2}(일|월|주)/,
        ordinal: function (number, period) {
            switch (period) {
                case 'd':
                case 'D':
                case 'DDD':
                    return number + '일';
                case 'M':
                    return number + '월';
                case 'w':
                case 'W':
                    return number + '주';
                default:
                    return number;
            }
        },
        meridiemParse: /오전|오후/,
        isPM: function (token) {
            return token === '오후';
        },
        meridiem: function (hour, minute, isUpper) {
            return hour < 12 ? '오전' : '오후';
        },
    });

    return ko;

})));

moment.fn.shortDateNoYear = function(){ return this.format('D MMM'); };
moment.fn.shortDate = function(){ return this.format('D MMM, YYYY'); };
moment.fn.longDate = function(){ return this.format('MMMM D, YYYY h:mma'); };
moment.fn.relativeAge = function(opts){ return Discourse.Formatter.relativeAge(this.toDate(), opts)};

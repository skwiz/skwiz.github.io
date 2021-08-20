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
r += "Vamos <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">começar a discussão!</a> ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "Existe <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tópico";
return r;
},
"other" : function(d){
var r = "";
r += "Existem <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tópicos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + "</strong> uma postagem";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postagens";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Os visitantes precisam de mais conteúdo para ler e responder. Recomendamos pelo menos ";
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
})() + "</strong> tópico";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tópicos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + "</strong> postagem";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postagens";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Somente a equipe pode ver esta mensagem.";
return r;
}, "too_few_topics_notice_MF" : function(d){
var r = "";
r += "Vamos <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">começar a discussão!</a> ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentTopics";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "Existe <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tópico";
return r;
},
"other" : function(d){
var r = "";
r += "Existem <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tópicos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Os visitantes precisam de mais conteúdo para ler e responder. Recomendamos pelo menos ";
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
})() + "</strong> tópico";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> tópicos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Somente a equipe pode ver esta mensagem.";
return r;
}, "too_few_posts_notice_MF" : function(d){
var r = "";
r += "Vamos <a href=\"https://blog.discourse.org/2014/08/building-a-discourse-community/\">começar a discussão!</a> ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "currentPosts";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"one" : function(d){
var r = "";
r += "Existe <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postagem";
return r;
},
"other" : function(d){
var r = "";
r += "Existem <strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postagens";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Os visitantes precisam de mais conteúdo para ler e responder. Recomendamos pelo menos ";
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
})() + "</strong> postagem";
return r;
},
"other" : function(d){
var r = "";
r += "<strong>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</strong> postagens";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Somente a equipe pode ver esta mensagem.";
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
r += "' target='_blank'>a quantidade de ";
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
})() + " erro/hora";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/hora";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> alcançou o limite de configuração do site de ";
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
})() + " erro/hora";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/hora";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "' target='_blank'>a quantidade de ";
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/minuto";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> alcançou o limite de configuração do site de ";
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/minuto";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "' target='_blank'>a quantidade de ";
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
})() + " erro/hora";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/hora";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> ultrapassou o limite de configuração do site de ";
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
})() + " erro/hora";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/hora";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erros/minutos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</a> ultrapassou o limite de configuração do site de ";
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
})() + " erro/minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " erro/minutos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ".";
return r;
}, "summary.description_time_MF" : function(d){
var r = "";
r += "Há ";
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
})() + "</b> resposta";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> respostas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " com um tempo de leitura estimado de <b>";
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
})() + " minuto";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " minutos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += "</b>.";
return r;
}, "topic.read_more_MF" : function(d){
var r = "";
r += "Há ";
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
})() + " não lido</a> ";
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
})() + " não lidos</a> ";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "é ";
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
})() + " novo</a> tópico";
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
r += "são ";
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
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " restante(s), ou ";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
var lastkey_1 = "CATEGORY";
var k_1=d[lastkey_1];
var off_0 = 0;
var pf_0 = { 
"true" : function(d){
var r = "";
r += "procure outros tópicos em ";
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
r += "Você está prestes a excluir ";
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
})() + "</b> postagem";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> postagens";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + "</b> tópico";
return r;
},
"other" : function(d){
var r = "";
r += "<b>" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + "</b> tópicos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " deste(a) usuário(a), remover sua conta, bloquear cadastros a partir do seu endereço IP <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["ip_address"];
r += "</b> e adicionar seu endereço de e-mail <b>";
if(!d){
throw new Error("MessageFormat: No data passed to function.");
}
r += d["email"];
r += "</b> a uma lista de bloqueio permanente. Você tem certeza que este(a) usuário(a) é realmente remetente de spam?";
return r;
}, "posts_likes_MF" : function(d){
var r = "";
r += "Este tópico tem ";
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
})() + " resposta";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " respostas";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
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
r += "com uma alta taxa de postagns para curtidas";
return r;
},
"med" : function(d){
var r = "";
r += "com uma alta muito alta de postagens para curtidas";
return r;
},
"high" : function(d){
var r = "";
r += "com uma taxa extremamente alta de taxa de postagens para curtidas";
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
r += "Você está prestes a excluir ";
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
})() + " postagem";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " postagens";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += " e ";
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
})() + " tópico";
return r;
},
"other" : function(d){
var r = "";
r += "" + (function(){ var x = k_1 - off_0;
if( isNaN(x) ){
throw new Error("MessageFormat: `"+lastkey_1+"` isnt a number.");
}
return x;
})() + " tópicos";
return r;
}
};
if ( pf_0[ k_1 + "" ] ) {
r += pf_0[ k_1 + "" ]( d ); 
}
else {
r += (pf_0[ MessageFormat.locale["pt_BR"]( k_1 - off_0 ) ] || pf_0[ "other" ] )( d );
}
r += ". Deseja prosseguir?";
return r;
}};
MessageFormat.locale.pt_BR = function ( n ) {
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

I18n.translations = {"pt_BR":{"js":{"number":{"format":{"separator":",","delimiter":"."},"human":{"storage_units":{"format":"%n,%u","units":{"byte":{"one":"Byte","other":"Bytes"},"gb":"GB","kb":"KB","mb":"MB","tb":"TB"}}},"short":{"thousands":"%{number}k","millions":"%{number}M"}},"dates":{"time":"h:mm a","time_with_zone":"hh:mm a (z)","time_short_day":"ddd, HH:mm a","timeline_date":"MMM YYYY","long_no_year":"D MMM, HH:mm","long_no_year_no_time":"D MMM","full_no_year_no_time":"D [de] MMMM","long_with_year":"D MMM, YYYY H:mm","long_with_year_no_time":"D MMM, YYYY","full_with_year_no_time":"D [de] MMMM, YYYY","long_date_with_year":"D MMM, 'YY LT","long_date_without_year":"D MMM, LT","long_date_with_year_without_time":"D MMM, 'YY","long_date_without_year_with_linebreak":"D MMM \u003cbr/\u003eLT","long_date_with_year_with_linebreak":"D MMM, 'YY \u003cbr/\u003eLT","wrap_ago":"%{date} atrás","wrap_on":"em %{date}","tiny":{"half_a_minute":"\u003c 1 m","less_than_x_seconds":{"one":"\u003c %{count} s","other":"\u003c %{count} s"},"x_seconds":{"one":"%{count} s","other":"%{count} s"},"less_than_x_minutes":{"one":"\u003c %{count} m","other":"\u003c %{count} m"},"x_minutes":{"one":"%{count} m","other":"%{count} m"},"about_x_hours":{"one":"%{count} h","other":"%{count} h"},"x_days":{"one":"%{count} d","other":"%{count} d"},"x_months":{"one":"%{count} mês","other":"%{count} meses"},"about_x_years":{"one":"%{count} a","other":"%{count} a"},"over_x_years":{"one":"\u003e %{count} a","other":"\u003e %{count} a"},"almost_x_years":{"one":"%{count} a","other":"%{count} a"},"date_month":"D MMM","date_year":"MMM 'YY"},"medium":{"x_minutes":{"one":"%{count} minuto","other":"%{count} minutos"},"x_hours":{"one":"%{count} hora","other":"%{count} horas"},"x_days":{"one":"%{count} dia","other":"%{count} dias"},"date_year":"D MMM, 'YY"},"medium_with_ago":{"x_minutes":{"one":"%{count} minuto atrás","other":"%{count} minutos atrás"},"x_hours":{"one":"%{count} hora atrás","other":"%{count} horas atrás"},"x_days":{"one":"%{count} dia atrás","other":"%{count} dias atrás"},"x_months":{"one":"%{count} mês atrás","other":"%{count} meses atrás"},"x_years":{"one":"%{count} ano atrás","other":"%{count} anos atrás"}},"later":{"x_days":{"one":"%{count} dia depois","other":"%{count} dias depois"},"x_months":{"one":"%{count} mês depois","other":"%{count} meses depois"},"x_years":{"one":"%{count} ano depois","other":"%{count} anos depois"}},"previous_month":"Mês anterior","next_month":"Próximo mês","placeholder":"data"},"share":{"topic_html":"Tópico: \u003cspan class=\"topic-title\"\u003e%{topicTitle}\u003c/span\u003e","post":"postagem #%{postNumber}","close":"fechar","twitter":"Compartilhar no Twitter","facebook":"Compartilhar no Facebook","email":"Enviar por e-mail","url":"Copiar e compartilhar a URL"},"action_codes":{"public_topic":"tornou este tópico público em %{when}","private_topic":"tornou este tópico uma mensagem pessoal %{when} atrás","split_topic":"dividiu este tópico %{when}","invited_user":"convidou %{who} %{when} atrás","invited_group":"onvidou %{who} %{when} atrás","user_left":"%{who} foi removido(a) desta mensagem %{when} atrás","removed_user":"%{who} foi removido(a) %{when} atrás","removed_group":"%{who} foi removido(a) %{when} atrás","autobumped":"automaticamente promovido(a) %{when} atrás","autoclosed":{"enabled":"fechou %{when} atrás","disabled":"abriu %{when} atrás"},"closed":{"enabled":"fechou %{when} atrás","disabled":"abriu %{when} atrás"},"archived":{"enabled":"arquivou %{when} atrás","disabled":"desarquivou %{when} atrás"},"pinned":{"enabled":"fixou %{when} atrás","disabled":"desafixou %{when} atrás"},"pinned_globally":{"enabled":"fixou globalmente %{when} atrás","disabled":"desafixou %{when} atrás"},"visible":{"enabled":"listou %{when} atrás","disabled":"removeu da lista %{when} atrás"},"banner":{"enabled":"tornou isto um banner %{when} atrás. Isso será mostrado no topo de todas as páginas até que seja descartado pelo(a) usuário(a).","disabled":"removeu este banner %{when} atrás. Ele não irá mais aparecer no topo de todas as páginas."},"forwarded":"encaminhou o e-mail acima"},"topic_admin_menu":"ações de tópico","wizard_required":"Boas-vindas ao seu novo Discourse! Vamos começar com o \u003ca href='%{url}' data-auto-route='true'\u003eassistente de configuração\u003c/a\u003e ✨","emails_are_disabled":"Todos os envios de e-mail foram desabilitados globalmente por um administrador. Nenhuma notificação por e-mail de qualquer tipo será enviada.","software_update_prompt":{"message":"Nós atualizamos este site, \u003cspan\u003eatualize a página\u003c/span\u003e, ou você poderá enfrentar uma situação inesperada.","dismiss":"Descartar"},"bootstrap_mode_enabled":{"one":"Para facilitar o lançamento do seu novo site, você está no modo de inicialização. Todos os usuários novos receberão o nível de confiança 1 e terão os e-mails diários do resumo de e-mails ativados. Isso será desativado automaticamente quando %{count} usuários se registrarem.","other":"Para facilitar o lançamento do seu novo site, você está no modo de inicialização. Todos os usuários novos receberão o nível de confiança 1 e terão os e-mails diários do resumo de e-mails ativados. Isso será desativado automaticamente quando %{count} usuários se registrarem."},"bootstrap_mode_disabled":"O modo de inicialização será desativado em 24 horas.","themes":{"default_description":"Padrão","broken_theme_alert":"Seu site pode não funcionar porque o tema/componente %{theme} tem erros. Desative-o em %{path}."},"s3":{"regions":{"ap_northeast_1":"Ásia Pacífico (Tóquio)","ap_northeast_2":"Ásia Pacífico (Seul)","ap_east_1":"Ásia Pacífico (Hong Kong)","ap_south_1":"Ásia-Pacífico (Mumbai)","ap_southeast_1":"Ásia Pacífico (Singapura)","ap_southeast_2":"Ásia Pacífico (Sidney)","ca_central_1":"Canadá (Central)","cn_north_1":"China (Beijing)","cn_northwest_1":"China (Ningxia)","eu_central_1":"UE (Frankfurt)","eu_north_1":"UE (Estocolmo)","eu_west_1":"UE (Irlanda)","eu_west_2":"UE (Londres)","eu_west_3":"UE (Paris)","sa_east_1":"América do Sul (São Paulo)","us_east_1":"Leste do EUA (N. da Virgínia)","us_east_2":"Leste do EUA (Ohio)","us_gov_east_1":"AWS GovCloud (Leste dos EUA)","us_gov_west_1":"AWS GovCloud (Oeste dos EUA)","us_west_1":"Oeste dos EUA (N. da Califórnia)","us_west_2":"Oeste dos EUA (Oregon)"}},"clear_input":"Limpar entrada","edit":"edite o título e a categoria deste tópico","expand":"Expandir","not_implemented":"Este recurso ainda não foi implementado, desculpe!","no_value":"Não","yes_value":"Sim","submit":"Enviar","generic_error":"Desculpe, ocorreu um erro.","generic_error_with_reason":"Ocorreu um erro: %{error}","sign_up":"Cadastrar-se","log_in":"Entrar","age":"Idade","joined":"Ingressou","admin_title":"Administrador(a)","show_more":"exibir mais","show_help":"opções","links":"Links","links_lowercase":{"one":"link","other":"links"},"faq":"FAQ","guidelines":"Diretrizes","privacy_policy":"Política de Privacidade","privacy":"Privacidade","tos":"Termos de Serviço","rules":"Regras","conduct":"Código de Conduta","mobile_view":"VIsualização Móvel","desktop_view":"Visualização do Desktop","or":"ou","now":"agora","read_more":"leia mais","more":"Mais","x_more":{"one":"Mais %{count}","other":"Mais %{count}"},"never":"nunca","every_30_minutes":"a cada 30 minutos","every_hour":"a cada hora","daily":"a cada dia","weekly":"semanal","every_month":"a cada mês","every_six_months":"a cada seis meses","max_of_count":"máx de %{count}","character_count":{"one":"%{count} carácter","other":"%{count} caracteres"},"related_messages":{"title":"Mensagens relacionadas","see_all":"Ver \u003ca href=\"%{path}\"\u003etodas as mensagens\u003c/a\u003e de @ %{username} ..."},"suggested_topics":{"title":"Tópicos sugeridos","pm_title":"Mensagens sugeridas"},"about":{"simple_title":"Sobre","title":"Sobre %{title}","stats":"Estatísticas do site","our_admins":"Nossos administradores","our_moderators":"Nossos moderadores","moderators":"Moderadores","stat":{"all_time":"Desde o início","last_day":"Últimas 24 horas","last_7_days":"Últimos sete dias","last_30_days":"Últimos 30 dias"},"like_count":"Curtidas","topic_count":"Tópicos","post_count":"Mensagens","user_count":"Usuários","active_user_count":"Usuários(as) ativos(as)","contact":"Fale conosco","contact_info":"Em caso de algum problema crítico ou assunto urgente relacionado a este site, fale conosco em %{contact_info}."},"bookmarked":{"title":"Favorito","edit_bookmark":"Editar favorito","clear_bookmarks":"Limpar favoritos","help":{"bookmark":"Clique para adicionar a primeira postagem deste tópico aos favoritos","edit_bookmark":"Clique para editar o favorito neste tópico","unbookmark":"Clique para remover todos os favoritos neste tópico","unbookmark_with_reminder":"Clique para remover todos os favoritos e lembretes neste tópico."}},"bookmarks":{"created":"Você marcou esta postagem como favorita. %{name}","not_bookmarked":"marcar postagem como favorita","created_with_reminder":"Você marcou esta postagem com um lembrete em %{date}. %{name}","remove":"Remover favorito","delete":"Excluir favorito","confirm_delete":"Tem certeza de que deseja excluir este favorito? O lembrete também será excluído.","confirm_clear":"Você tem certeza de que deseja apagar todos os seus favoritos deste tópico?","save":"Salvar","no_timezone":"Você ainda não definiu um fuso horário. Você não poderá definir lembretes. Configure um \u003ca href=\"%{basePath}/my/preferences/profile\"\u003eno seu perfil\u003c/a\u003e.","invalid_custom_datetime":"A data e a hora que você informou são inválidas, tente novamente.","list_permission_denied":"Você não tem permissão para visualizar os favoritos deste usuário(a).","no_user_bookmarks":"Você não tem postagens favoritas. Os favoritos permitem que você consulte rapidamente postagens específicas.","auto_delete_preference":{"label":"Excluir automaticamente","never":"Nunca","when_reminder_sent":"Assim que o lembrete for enviado","on_owner_reply":"Após responder a este tópico"},"search_placeholder":"Pesquisar os favoritos por nome, título do tópico ou conteúdo da postagem","search":"Pesquisar","reminders":{"today_with_time":"hoje à(s) %{time}","tomorrow_with_time":"amanhã à(s) %{time}","at_time":"em %{date_time}","existing_reminder":"Você tem um lembrete definido para este favorito que será enviado em %{at_date_time}"}},"copy_codeblock":{"copied":"copiado!"},"drafts":{"resume":"Retomar","remove":"Remover","remove_confirmation":"Tem certeza de que deseja excluir este rascunho?","new_topic":"Novo rascunho de tópico","new_private_message":"Novo rascunho de mensagem","topic_reply":"Rascunho de resposta","abandon":{"confirm":"Você tem um rascunho em andamento para este tópico. O que deseja fazer com ele?","yes_value":"Descartar","no_value":"Retomar a edição"}},"topic_count_latest":{"one":"Veja %{count} tópico novo ou atualizado","other":"Veja %{count} tópicos novos ou atualizados"},"topic_count_unread":{"one":"Veja %{count} tópico não lido","other":"Veja %{count} tópicos não lidos"},"topic_count_new":{"one":"Veja %{count} novo tópico","other":"Veja %{count} novos tópicos"},"preview":"pré-visualizar","cancel":"cancelar","deleting":"Excluindo...","save":"Salvar alterações","saving":"Salvando...","saved":"Salvo!","upload":"Enviar","uploading":"Enviando...","uploading_filename":"Enviando: %{filename}...","processing_filename":"Processando: %{filename}...","clipboard":"área de transferência","uploaded":"Enviado!","pasting":"Colando...","enable":"Ativar","disable":"Desativar","continue":"Continuar","undo":"Desfazer","revert":"Reverter","failed":"Falhou","switch_to_anon":"Entrar no Modo anônimo","switch_from_anon":"Sair do Modo anônimo","banner":{"close":"Descarte este banner.","edit":"Editar este banner \u003e\u003e"},"pwa":{"install_banner":"Você quer \u003ca href\u003einstalar %{title} no seu dispositivo?\u003c/a\u003e"},"choose_topic":{"none_found":"Nenhum tópico encontrado.","title":{"search":"Pesquisar um tópico","placeholder":"digite o título do tópico, URL ou ID aqui"}},"choose_message":{"none_found":"Nenhuma mensagem encontrada.","title":{"search":"Pesquisar mensagem","placeholder":"digite o título da mensagem, URL ou ID aqui"}},"review":{"order_by":"Ordenar por","in_reply_to":"em resposta a","explain":{"why":"explique por que este item foi colocado na fila","title":"Pontuação revisável","formula":"Fórmula","subtotal":"Subtotal","total":"Total","min_score_visibility":"Pontuação mínima para visibilidade","score_to_hide":"Pontuação para ocultar postagem","take_action_bonus":{"name":"tomou medidas","title":"Quando qualquer membro da equipe decide agir, o sinalizador recebe um bônus."},"user_accuracy_bonus":{"name":"precisão do(a) usuário(a)","title":"Os(as) usuários(as) com sinalizadores historicamente acordados recebem um bônus."},"trust_level_bonus":{"name":"nível de confiança","title":"Itens revisáveis criados por usuários(as) com nível de confiança mais alto têm uma pontuação maior."},"type_bonus":{"name":"bônus de tipo","title":"Certos tipos revisáveis podem receber um bônus da equipe para aumentar sua prioridade."}},"stale_help":"Este revisável foi encerrado por \u003cb\u003e%{username}\u003c/b\u003e.","claim_help":{"optional":"Você pode reivindicar este item para impedir que outras pessoas o revisem.","required":"Você precisa reivindicar itens antes de poder revisá-los.","claimed_by_you":"Você reivindicou este item e pode revisá-lo.","claimed_by_other":"Este item só pode ser revisado por \u003cb\u003e%{username}\u003c/b\u003e."},"claim":{"title":"reivindicar este tópico"},"unclaim":{"help":"remover esta reivindicação"},"awaiting_approval":"Aguardando aprovação","delete":"Excluir","settings":{"saved":"Salvo","save_changes":"Salvar alterações","title":"Configurações","priorities":{"title":"Prioridades revisáveis"}},"moderation_history":"Histórico de moderação","view_all":"Visualizar tudo","grouped_by_topic":"Agrupado por tópico","none":"Não há itens para revisar.","view_pending":"visualização pendente","topic_has_pending":{"one":"Este tópico tem \u003cb\u003e%{count}\u003c/b\u003e postagem com aprovação pendente","other":"Este tópico tem \u003cb\u003e%{count}\u003c/b\u003e postagens com aprovação pendente"},"title":"Revisar","topic":"Tópico:","filtered_topic":"Você filtrou para conteúdo revisável em um único tópico.","filtered_user":"Usuário(a)","filtered_reviewed_by":"Revisado por","show_all_topics":"exibir todos os tópicos","deleted_post":"(postagem excluída)","deleted_user":"(usuário(a) excluído(a))","user":{"bio":"Bio","website":"Site","username":"Nome do(a) usuário(a)","email":"E-mail","name":"Nome","fields":"Campos","reject_reason":"Motivo"},"user_percentage":{"summary":{"one":"%{agreed}, %{disagreed}, %{ignored} (do último sinalizador)","other":"%{agreed}, %{disagreed}, %{ignored} (dos últimos %{count} sinalizadores)"},"agreed":{"one":"%{count}% concorda","other":"%{count}% concordam"},"disagreed":{"one":"%{count}% discorda","other":"%{count}% discordam"},"ignored":{"one":"%{count}% ignora","other":"%{count}% ignoram"}},"topics":{"topic":"Tópico","reviewable_count":"Contagem","reported_by":"Relatado por","deleted":"[Tópico excluído]","original":"(tópico original)","details":"detalhes","unique_users":{"one":"%{count} usuário","other":"%{count} usuários"}},"replies":{"one":"%{count} resposta","other":"%{count} respostas"},"edit":"Editar","save":"Salvar","cancel":"Cancelar","new_topic":"A aprovação deste item criará um novo tópico","filters":{"all_categories":"(todas as categorias)","type":{"title":"Tipo","all":"(todos os tipos)"},"minimum_score":"Pontuação mínima:","refresh":"Atualizar","status":"Status","category":"Categoria","orders":{"score":"Pontuação","score_asc":"Pontuação (reversa)","created_at":"Criado em","created_at_asc":"Criado em (reverso)"},"priority":{"title":"Prioridade mínima","any":"(qualquer um)","low":"Baixa","medium":"Média","high":"Alta"}},"conversation":{"view_full":"visualizar conversa completa"},"scores":{"about":"Esta pontuação é calculada com base no nível de confiança do relator, na precisão de suas sinalizações anteriores e na prioridade do item que está sendo relatado.","score":"Pontuação","date":"Data","type":"Tipo","status":"Status","submitted_by":"Enviado por","reviewed_by":"Revisado por"},"statuses":{"pending":{"title":"Pendentes"},"approved":{"title":"Aprovado"},"rejected":{"title":"Rejeitado"},"ignored":{"title":"Ignorados(as)"},"deleted":{"title":"Excluído"},"reviewed":{"title":"(Tudo revisado)"},"all":{"title":"(tudo)"}},"types":{"reviewable_flagged_post":{"title":"Postagem sinalizada","flagged_by":"Sinalizado por"},"reviewable_queued_topic":{"title":"Tópico na fila"},"reviewable_queued_post":{"title":"Postagem na fila"},"reviewable_user":{"title":"Usuário"},"reviewable_post":{"title":"Postagem"}},"approval":{"title":"A postagem precisa de aprovação","description":"Nós recebemos sua nova postagem, mas é necessário ter aprovação da moderação antes de ser exibida. Pedimos paciência.","pending_posts":{"one":"Você tem \u003cstrong\u003e%{count}\u003c/strong\u003e postagem pendente.","other":"Você tem postagens \u003cstrong\u003e%{count}\u003c/strong\u003e pendentes."},"ok":"Ok"},"example_username":"nome do(a) usuário(a)","reject_reason":{"title":"Por que você está rejeitando este(a) usuário(a)?","send_email":"Enviar e-mail de rejeição"}},"relative_time_picker":{"minutes":{"one":"minuto","other":"minutos"},"hours":{"one":"hora","other":"horas"},"days":{"one":"dia","other":"dias"},"months":{"one":"mês","other":"meses"},"years":{"one":"ano","other":"anos"},"relative":"Relativo"},"time_shortcut":{"later_today":"Hoje mais tarde","next_business_day":"Próximo dia útil","tomorrow":"Amanhã","post_local_date":"Data na postagem","later_this_week":"Mais tarde nesta semana","this_weekend":"Neste fim de semana","start_of_next_business_week":"Segunda-feira","start_of_next_business_week_alt":"Próxima segunda-feira","two_weeks":"Duas semanas","next_month":"Próximo mês","six_months":"Seis meses","custom":"Data e hora personalizadas","relative":"Tempo relativo","none":"Nenhum necessário","last_custom":"Última data personalizada"},"user_action":{"user_posted_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e postou \u003ca href='%{topicUrl}'\u003eo tópico\u003c/a\u003e","you_posted_topic":"\u003ca href='%{userUrl}'\u003eVocê\u003c/a\u003e postou \u003ca href='%{topicUrl}'\u003eo tópico\u003c/a\u003e","user_replied_to_post":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e respondeu \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","you_replied_to_post":"\u003ca href='%{userUrl}'\u003eVocê\u003c/a\u003e respondeu a \u003ca href='%{postUrl}'\u003e%{post_number}\u003c/a\u003e","user_replied_to_topic":"\u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e respondeu ao \u003ca href='%{topicUrl}'\u003etópico\u003c/a\u003e","you_replied_to_topic":"\u003ca href='%{userUrl}'\u003eVocê\u003c/a\u003e respondeu ao \u003ca href='%{topicUrl}'\u003etópico\u003c/a\u003e","user_mentioned_user":"\u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e mencionou \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","user_mentioned_you":"\u003ca href='%{user2Url}'\u003eVocê\u003c/a\u003e foi mencionado(a) por \u003ca href='%{user1Url}'\u003e%{user}\u003c/a\u003e","you_mentioned_user":"\u003ca href='%{user1Url}'\u003eVocê\u003c/a\u003e mencionou \u003ca href='%{user2Url}'\u003e%{another_user}\u003c/a\u003e","posted_by_user":"Postado por \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","posted_by_you":"Postado por \u003ca href='%{userUrl}'\u003evocê\u003c/a\u003e","sent_by_user":"Enviado por \u003ca href='%{userUrl}'\u003e%{user}\u003c/a\u003e","sent_by_you":"Enviado por \u003ca href='%{userUrl}'\u003evocê\u003c/a\u003e"},"directory":{"username":"Nome do(a) usuário(a)","filter_name":"Filtrar por nome do usuário(a)","title":"Usuários","likes_given":"Dados","likes_received":"Recebidos","topics_entered":"Visualizados","topics_entered_long":"Tópicos visualizados","time_read":"Tempo lido","topic_count":"Tópicos","topic_count_long":"Tópicos criados","post_count":"Respostas","post_count_long":"Respostas postadas","no_results":"Nenhum resultado foi encontrado.","days_visited":"Acessos","days_visited_long":"Dias acessados","posts_read":"Lidos","posts_read_long":"Postagens lidas","last_updated":"Última atualização:","total_rows":{"one":"%{count} usuário","other":"%{count} usuários"},"edit_columns":{"title":"Editar colunas do diretório","save":"Salvar","reset_to_default":"Restaurar para padrão"},"group":{"all":"todos os grupos"}},"group_histories":{"actions":{"change_group_setting":"Alterar configurações do grupo","add_user_to_group":"Adicionar usuário","remove_user_from_group":"Remover usuário","make_user_group_owner":"Tornar proprietário","remove_user_as_group_owner":"Revogar proprietário"}},"groups":{"member_added":"Adicionado","member_requested":"Solicitado em","add_members":{"title":"Adicionar usuários(a) a %{group_name}","description":"Insira uma lista de usuários(as) que você quer convidar para o grupo ou cole em uma lista separada por vírgulas:","usernames_placeholder":"nomes de usuário(a)","usernames_or_emails_placeholder":"nomes de usuário(a) ou e-maiis","notify_users":"Notificar usuários","set_owner":"Definir usuários(as) como proprietários(as) deste grupo"},"requests":{"title":"Solicitações","reason":"Motivo","accept":"Aceitar","accepted":"aceito","deny":"Negar","denied":"negado","undone":"solicitação desfeita","handle":"tratar solicitação de associação"},"manage":{"title":"Gerenciar","name":"Nome","full_name":"Nome completo","add_members":"Adicionar usuários(as)","invite_members":"Convidar","delete_member_confirm":"Remover %{username} do %{group} grupo?","profile":{"title":"Perfil"},"interaction":{"title":"Interação","posting":"Postando","notification":"Notificação"},"email":{"title":"E-mail","status":"Sincronizado(s) %{old_emails}/%{total_emails} e-mail(s) via IMAP.","enable_smtp":"Ativar SMTP","enable_imap":"Ativar IMAP","test_settings":"Configurações de teste","save_settings":"Salvar configurações","last_updated":"Última atualização:","last_updated_by":"de","settings_required":"Todas as configurações são obrigatórias, preencha todos os campos antes de validar.","smtp_settings_valid":"Configurações de SMTP válidas.","smtp_title":"SMTP","smtp_instructions":"Quando você ativa o SMTP para o grupo, todos os e-mails enviados da caixa de entrada do grupo serão enviados pelas configurações de SMTP especificadas aqui, em vez do servidor de e-mail configurado para outros e-mails enviados pelo seu fórum.","imap_title":"IMAP","imap_additional_settings":"Configurações adicionais","imap_instructions":"Quando você ativa o IMAP para o grupo, os e-mails são sincronizados entre a caixa de entrada do grupo, o servidor IMAP e a caixa de mensagens fornecidos. O SMTP deve ser ativado com as credenciais válidas e testadas antes que o IMAP possa ser ativado. O nome do(a) usuário(a) e a senha de e-mail usados para o SMTP serão aplicados ao IMAP. Para obter mais informações, consulte \u003ca target=\"_blank\" href=\"https://meta.discourse.org/t/imap-support-for-group-inboxes/160588\"\u003eanúncio de recursos no Discourse Meta\u003c/a\u003e.","imap_alpha_warning":"Aviso: este recurso está no estágio alfa. Apenas o Gmail é oficialmente compatível. Use por sua conta e risco!","imap_settings_valid":"Configurações IMAP válidas.","smtp_disable_confirm":"Se você desativar o SMTP, todas as configurações de SMTP e IMAP serão redefinidas e os recursos correspondentes serão desativados. Tem certeza de que quer continuar?","imap_disable_confirm":"Se você desativar o IMAP, todas as configurações de IMAP serão redefinidas e os recursos correspondentes serão desativados. Tem certeza de que quer continuar?","imap_mailbox_not_selected":"Se você selecionar uma caixa de entrada para esta configuração IMAP ou nenhuma caixa postal será sincronizada!","prefill":{"title":"Preencher com configurações para:","gmail":"Gmail"},"credentials":{"title":"Credenciais","smtp_server":"Servidor SMTP","smtp_port":"Porta SMTP","smtp_ssl":"Usar SSL para SMTP","imap_server":"Servidor IMAP","imap_port":"Porta IMAP","imap_ssl":"Usar SSL para IMAP","username":"Nome do(a) usuário(a)","password":"Senha"},"settings":{"title":"Configurações","allow_unknown_sender_topic_replies":"Permita que remetentes desconhecidos respondam a tópicos.","allow_unknown_sender_topic_replies_hint":"Permite que remetentes desconhecidos(as) respondam a tópicos de grupo. Se não estiver ativado, será criado um novo tópico para respostas de endereços de e-mail de usuários(as) não convidados para o tópico."},"mailboxes":{"synchronized":"Caixa de mensagens sincronizada","none_found":"Nenhuma caixa de mensagens foi encontrada nesta conta de e-mail.","disabled":"Desativado(a)"}},"membership":{"title":"Associação","access":"Acesso"},"categories":{"title":"Categorias","long_title":"Notificações padrão da categoria","description":"Quando usuários(as) são adicionados(as) a esse grupo, suas configurações de notificação de categoria serão definidas para estes padrões. Em seguida, poderão ser alteradas.","watched_categories_instructions":"Você acompanha todos os tópicos destas categorias automaticamente. Membros do grupo serão notificados de todas as postagens novas, e varias delas também serão exibidas perto do tópico.","tracked_categories_instructions":"Você monitora todos os tópicos nestas categorias automaticamente . Várias postagens novas serão exibidas ao lado do tópico.","watching_first_post_categories_instructions":"Usuários(as) serão notificados(as) sobre a primeira mensagem postada em cada tópico novo destas categorias.","regular_categories_instructions":"Se estas categorias forem silenciadas, elas não serão silenciadas para membros do grupo. Os(as) usuários(as) serão notificados em caso de menção ou resposta.","muted_categories_instructions":"Os(as) usuários(as) não serão notificados sobre novos tópicos nestas categorias nem aparecerão nas categorias ou nas páginas de tópicos mais recentes."},"tags":{"title":"Etiquetas","long_title":"Notificações padrão das etiquetas","description":"Quando usuários(as) são adicionados(as) a esse grupo, suas configurações de notificação de etiqueta serão definidas para estes padrões. Em seguida, poderão ser alteradas.","watched_tags_instructions":"Você acompanha todos os tópicos com estas etiquetas automaticamente. Membros do grupo serão notificados de todas as postagens novas, e varias delas também serão exibidas perto do tópico.","tracked_tags_instructions":"Monitore automaticamente todos os tópicos com estas etiquetas. Uma contagem de postagens novas será exibida ao lado do tópico.","watching_first_post_tags_instructions":"Os(as) usuários(as) receberão uma notificação sobre a primeira postagem em cada tópico novo com estas etiquetas.","regular_tags_instructions":"Se estas etiquetas forem silenciadas, elas não serão silenciadas para membros do grupo. Os(as) usuários(as) serão notificados em caso de menção ou resposta.","muted_tags_instructions":"Os(as) usuários(as) não receberão notificação sobre novos tópicos com estas etiquetas, e eles não serão exibidas nos mais recentes."},"logs":{"title":"Registros","when":"Quando","action":"Ação","acting_user":"Usuário agindo","target_user":"Usuário(a) de destino","subject":"Assunto","details":"Detalhes","from":"De","to":"Para"}},"permissions":{"title":"Permissões","none":"Não há categorias associadas a este grupo.","description":"Membros deste grupo podem acessar estas categorias"},"public_admission":"Permitir que os usuários entrem no grupo livremente (Requer grupo publicamente visível)","public_exit":"Permitir que os usuários saiam do grupo livremente","empty":{"posts":"Não há publicações de membros deste grupo.","members":"Não há membros neste grupo.","requests":"Não há solicitações de associação para este grupo.","mentions":"Não há menções a este grupo.","messages":"Não há mensagens para este grupo.","topics":"Não há tópicos de membros deste grupo.","logs":"Não há registros para este grupo."},"add":"Adicionar","join":"Ingressar","leave":"Sair","request":"Solicitar","message":"Mensagem","confirm_leave":"Tem certeza de que deseja sair deste grupo?","allow_membership_requests":"Permitir que usuários(as) enviem pedidos de associação a proprietários(as) do grupo (requer grupo visível ao público)","membership_request_template":"Modelo personalizado para exibir aos usuários ao enviar um pedido de associação","membership_request":{"submit":"Enviar solicitação","title":"Pedir para entrar no grupo @%{group_name}","reason":"Diga aos proprietários do grupo por que você pertence a este grupo"},"membership":"Associação","name":"Nome","group_name":"Nome do grupo","user_count":"Usuários(as)","bio":"Sobre o grupo","selector_placeholder":"insira o nome do(a) usuário(a)","owner":"proprietário(a)","index":{"title":"Grupos","all":"Todos os grupos","empty":"Não há grupos visíveis.","filter":"Filtrar por tipo de grupo","owner_groups":"Grupos que eu tenho","close_groups":"Grupos fechados","automatic_groups":"Grupos automáticos","automatic":"Automático","closed":"Fechado","public":"Público","private":"Privado","public_groups":"Grupos públicos","my_groups":"Meus grupos","group_type":"Tipo de grupo","is_group_user":"Membro","is_group_owner":"Proprietário(a)"},"title":{"one":"Grupo","other":"Grupos"},"activity":"Atividade","members":{"title":"Membros","filter_placeholder_admin":"nome do(a) usuário(a) ou e-mail","filter_placeholder":"nome do(a) usuário(a)","remove_member":"Remover membro","remove_member_description":"Remover \u003cb\u003e%{username}\u003c/b\u003e deste grupo","make_owner":"Tornar proprietário(a)","make_owner_description":"Tornar \u003cb\u003e%{username}\u003c/b\u003e proprietário(a) deste grupo","remove_owner":"Remover como proprietário(a)","remove_owner_description":"Remover \u003cb\u003e%{username}\u003c/b\u003e como proprietário(a) deste grupo","make_primary":"Tornar primário","make_primary_description":"Tornar este grupo primário para \u003cb\u003e%{username}\u003c/b\u003e","remove_primary":"Remover como primário","remove_primary_description":"Remover este grupo como primário para \u003cb\u003e%{username}\u003c/b\u003e","remove_members":"Remover membros","remove_members_description":"Remover usuários(as) selecionados(as) deste grupo","make_owners":"Tornar proprietários(as)","make_owners_description":"Tornar usuários(as) selecionados(as) proprietários(as) deste grupo","remove_owners":"Remover proprietários(as)","remove_owners_description":"Remover usuários(as) selecionados(as) como proprietários(as) deste grupo","make_all_primary":"Tornar primário para todos","make_all_primary_description":"Tornar este grupo primário para todos os(as) usuários(as) selecionados(as)","remove_all_primary":"Remover como primário","remove_all_primary_description":"Remover este grupo como primário","owner":"Proprietário(a)","primary":"Primário","forbidden":"Você não tem permissão para visualizar membros."},"topics":"Tópicos","posts":"Postagens","mentions":"Menções","messages":"Mensagens","notification_level":"Nível de notificação padrão para mensagens de grupo","alias_levels":{"mentionable":"Quem pode @mencionar este grupo?","messageable":"Quem pode enviar mensagens a este grupo?","nobody":"Ninguém","only_admins":"Somente administradores","mods_and_admins":"Somente moderadores e administradores","members_mods_and_admins":"Somente membros do grupo, moderadores e administradores","owners_mods_and_admins":"Somente proprietários do grupo, moderadores e administradores","everyone":"Todos"},"notifications":{"watching":{"title":"Observando","description":"Você será notificado sobre novas postagens em cada mensagem, e uma contagem de novas respostas será exibida."},"watching_first_post":{"title":"Acompanhando primeira postagem","description":"Você será notificado(a) sobre novas mensagens neste grupo, mas não sobre respostas."},"tracking":{"title":"Acompanhando","description":"Você será notificado(a) se alguém mencionar seu @nome ou responder, e uma contagem de novas respostas será exibida."},"regular":{"title":"Normal","description":"Você será notificado(a) se alguém mencionar seu @nome ou responder."},"muted":{"title":"Silenciado","description":"Você não receberá nenhuma notificação sobre mensagens neste grupo."}},"flair_url":"Imagem de estilo de avatar","flair_upload_description":"Use imagens quadradas não menores do que 20px por 20px.","flair_bg_color":"Cor de fundo do estilo de avatar","flair_bg_color_placeholder":"(Opcional) Valor da cor em hexadecimal","flair_color":"Cor do estilo de avatar","flair_color_placeholder":"(Opcional) Valor da cor em hexadecimal","flair_preview_icon":"Pré-visualizar ícone","flair_preview_image":"Pré-visualizar imagem","flair_type":{"icon":"Selecione um ícone","image":"Enviar arquivo"},"default_notifications":{"modal_title":"Notificações padrão do(a) usuário(a)","modal_description":"Você gostaria de aplicar esta alteração historicamente? Isto mudará as preferências de %{count} usuários(as) existentes.","modal_yes":"Sim","modal_no":"Não, apenas aplique alterações daqui para frente"}},"user_action_groups":{"1":"Curtidas","2":"Curtidas","3":"Favoritos","4":"Tópicos","5":"Respostas","6":"Reações","7":"Menções","9":"Citações","11":"Edições","12":"Itens enviados","13":"Caixa de entrada","14":"Pendentes","15":"Rascunhos"},"categories":{"all":"todas as categorias","all_subcategories":"tudo","no_subcategory":"nenhum","category":"Categoria","category_list":"Exibir lista de categorias","reorder":{"title":"Reordenar Categorias","title_long":"Reorganizar a lista de categorias","save":"Salvar ordem","apply_all":"Aplicar","position":"Posição"},"posts":"Postagens","topics":"Tópicos","latest":"Últimos","subcategories":"Subcategorias","muted":"Categorias silenciadas","topic_sentence":{"one":"%{count} tópico","other":"%{count} tópicos"},"topic_stat":{"one":"%{number}/%{unit}\n","other":"%{number}/%{unit}"},"topic_stat_unit":{"week":"semana","month":"mês"},"topic_stat_all_time":{"one":"%{number} no total","other":"%{number} no total"},"topic_stat_sentence_week":{"one":"%{count} novo tópico na última semana.","other":"%{count} novos tópicos na última semana."},"topic_stat_sentence_month":{"one":"%{count} novo tópico no último mês.","other":"%{count} novos tópicos no último mês."},"n_more":"Categorias (mais %{count})..."},"ip_lookup":{"title":"Pesquisa de endereço IP","hostname":"Nome do host","location":"Localização","location_not_found":"(desconhecido)","organisation":"Organização","phone":"Telefone","other_accounts":"Outras contas com este endereço IP:","delete_other_accounts":"Excluir %{count}","username":"nome do(a) usuário(a)","trust_level":"NC","read_time":"tempo de leitura","topics_entered":"tópicos inseridos","post_count":"# postagens","confirm_delete_other_accounts":"Tem certeza de que deseja excluir estas contas?","powered_by":"usando \u003ca href='https://maxmind.com'\u003eMaxMindDB\u003c/a\u003e","copied":"copiado"},"user_fields":{"none":"(selecione uma opção)","required":"Digite um valor para \"%{name}\""},"user":{"said":"%{username}:","profile":"Perfil","mute":"Silenciar","edit":"Editar preferências","download_archive":{"button_text":"Baixar tudo","confirm":"Tem certeza de que deseja baixar suas postagens?","success":"Transferência iniciada, você receberá notificação por mensagem quando o processo estiver concluído.","rate_limit_error":"Postagens podem ser baixadas somente uma vez por dia, tente novamente amanhã."},"new_private_message":"Nova mensagem","private_message":"Mensagem","private_messages":"Mensagens","user_notifications":{"filters":{"filter_by":"Filtrar por","all":"Tudo","read":"Lidos(as)","unread":"Não lidos(as)"},"ignore_duration_title":"Ignorar usuário(a)","ignore_duration_username":"Nome do(a) usuário(a)","ignore_duration_when":"Duração:","ignore_duration_save":"Ignorar","ignore_duration_note":"Observe que todas as ações ignorar serão removidas automaticamente após essa ação expirar.","ignore_duration_time_frame_required":"Selecione um intervalo de tempo","ignore_no_users":"Você não tem usuários(as) ignorados(as).","ignore_option":"Ignorados(as)","ignore_option_title":"Você não receberá notificações relacionadas a este(a) usuário(a), e todos os tópicos e respostas serão ocultos.","add_ignored_user":"Adicionar...","mute_option":"Silenciados(as)","mute_option_title":"Você não receberá notificações relacionadas a este(a) usuário(a).","normal_option":"Normal","normal_option_title":"Você receberá uma notificação se este(a) usuário(a) responder, citar ou mencionar."},"notification_schedule":{"title":"Agendamento de notificações","label":"Ativar agendamento de notificações personalizada","tip":"Fora desses horários, você será colocado automaticamente \"não perturbe\".","midnight":"Meia-noite","none":"Nenhum","monday":"Segunda-feira","tuesday":"Terça-feira","wednesday":"Quarta-feira","thursday":"Quinta-feira","friday":"Sexta-feira","saturday":"Sábado","sunday":"Domingo","to":"para"},"activity_stream":"Atividade","read":"Lidos(as)","read_help":"Tópicos lidos recentemente","preferences":"Preferências","feature_topic_on_profile":{"open_search":"Selecione um novo tópico","title":"Selecione um tópico","search_label":"Pesquisar tópico por título","save":"Salvar","clear":{"title":"Limpar","warning":"Tem certeza de que deseja remover o tópico em destaque?"}},"use_current_timezone":"Usar fuso horário atual","profile_hidden":"O perfil público deste(a) usuário(a) está oculto.","expand_profile":"Expandir","collapse_profile":"Recolher","bookmarks":"Favoritos","bio":"Sobre mim","timezone":"Fuso horário","invited_by":"Convidado por","trust_level":"Nível de confiança","notifications":"Notificações","statistics":"Estatísticas","desktop_notifications":{"label":"Notificações ao vivo","not_supported":"Notificações não compatíveis com este navegador. Desculpe.","perm_default":"Ativar notificações","perm_denied_btn":"Permissão negada","perm_denied_expl":"Você negou permissão para notificações. Permita as notificações nas configurações do seu navegador.","disable":"Desativar notificações","enable":"Ativar notificações","each_browser_note":"Observação: é preciso alterar esta configuração em cada navegador utilizado. Todas as notificações serão desativadas no modo \"Não incomodar\", seja qual for a configuração.","consent_prompt":"Você quer notificações em tempo real quando as pessoas responderem às suas postagens?"},"dismiss":"Descartar","dismiss_notifications":"Descartar tudo","dismiss_notifications_tooltip":"Marcar todas as notificações não lidas como lidas","no_messages_title":"Você não tem mensagens","no_messages_body":"Precisa ter uma conversa pessoal direta, fora do fluxo de conversa normal? Envie uma mensagem ao selecionar o seu avatar e usar o botão de mensagem %{icon}.\u003cbr\u003e\u003cbr\u003e Se precisar de ajuda, envie uma \u003ca href='%{aboutUrl}'\u003emensagem a um membro da equipe\u003c/a\u003e.\n","no_bookmarks_title":"Você ainda não adicionou nada aos favoritos","no_bookmarks_body":"Comece a adicionar postagens aos favoritos com o botão %{icon}, eles serão listados aqui para consulta rápida. Você pode agendar um lembrete também!\n","no_notifications_title":"Você ainda não tem nenhuma notificação","no_notifications_body":"Neste painel, você receberá notificações sobre atividades relevantes, inclusive respostas aos seus tópicos e postagens, quando você for citado(a) ou mencionado(a) (\u003cb\u003e@mentions\u003c/b\u003e) por alguém e quando os tópicos que você estiver acompanhando receberem respostas. As notificações também serão enviadas por e-mail quando você passar algum tempo sem entrar com a conta. \u003cbr\u003e\u003cbr\u003e Procure por %{icon} para decidir sobre quais tópicos, categorias e etiquetas específicas você quer receber notificações. Para obter mais informações, verifique suas \u003ca href='%{preferencesUrl}'\u003epreferências de notificações\u003c/a\u003e.\n","first_notification":"Sua primeira notificação! Selecione-a para começar.","dynamic_favicon":"Exibir contagens no ícone do navegador","skip_new_user_tips":{"description":"Pular emblemas e dicas de integração de novo(a) usuário(a)","not_first_time":"Não é a sua primeira vez?","skip_link":"Pular estas dicas","read_later":"Vou ler mais tarde."},"theme_default_on_all_devices":"Definir este tema como padrão em todos os meus dispositivos","color_scheme_default_on_all_devices":"Definir esquemas de cores padrão em todos os meus dispositivos","color_scheme":"Esquema de cores","color_schemes":{"default_description":"Tema padrão","disable_dark_scheme":"O mesmo que o normal","dark_instructions":"É possível pré-visualizar o esquema de cores do modo escuro ao ativar/desativar o modo escuro do seu dispositivo.","undo":"Redefinir","regular":"Normal","dark":"Modo escuro","default_dark_scheme":"(padrão do site)"},"dark_mode":"Modo escuro","dark_mode_enable":"Ativar o esquema de cores do modo escuro automaticamente","text_size_default_on_all_devices":"Definir este tamanho de texto como padrão em todos os meus dispositivos","allow_private_messages":"Permitir que outros(as) usuários(as) me enviem mensagens pessoais","external_links_in_new_tab":"Abrir todos os links externos em uma nova aba","enable_quoting":"Ativar resposta citando o texto destacado","enable_defer":"Ativar adiamento para marcar tópicos como não lidos","change":"alterar","featured_topic":"Tópico em destaque","moderator":"%{user} é moderador(a)","admin":"%{user} é administrador(a)","moderator_tooltip":"Este(a) usuário(a) é moderador(a)","admin_tooltip":"Este(a) usuário(a) é administrador(a)","silenced_tooltip":"Este(a) usuário(a) está silenciado(a)","suspended_notice":"Este(a) usuário(a) está suspenso(a) até %{date}.","suspended_permanently":"Este(a) usuário(a) está suspenso(a).","suspended_reason":"Motivo: ","github_profile":"GitHub","email_activity_summary":"Resumo de atividades","mailing_list_mode":{"label":"Modo lista de endereçamento","enabled":"Ativar modo lista de endereçamento","instructions":"Esta opção substitui o resumo de atividades.\u003cbr /\u003e\nTópicos e categorias silenciadas não são incluídas nestes e-mails.\n","individual":"Enviar um e-mail a cada postagem nova","individual_no_echo":"Enviar um e-mail a cada postagem nova, exceto as minhas","many_per_day":"Me envie um e-mail a cada postagem nova (aproximadamente %{dailyEmailEstimate} por dia)","few_per_day":"Me envie um e-mail a cada postagem nova (aproximadamente dois por dia)","warning":"Modo lista de endereçamento ativado. As configurações de notificação por e-mail serão substituídas."},"tag_settings":"Etiquetas","watched_tags":"Acompanhados(as)","watched_tags_instructions":"Você acompanhará automaticamente todos os tópicos com estas etiquetas. Você receberá notificação de todas as novas postagens e tópicos, e uma contagem de postagens novas também será exibida ao lado do tópico.","tracked_tags":"Monitorados(as)","tracked_tags_instructions":"Você irá monitorar automaticamente todos os tópicos com estas etiquetas. Uma contagem de postagens novas será exibida ao lado do tópico.","muted_tags":"Silenciados(as)","muted_tags_instructions":"Você não receberá notificação sobre novos tópicos com estas etiquetas, e eles não serão exibidas nos mais recentes.","watched_categories":"Acompanhados(as)","watched_categories_instructions":"Você acompanhará automaticamente todos os tópicos nestas categorias. Você receberá notificação de todas as novas postagens e tópicos, e uma contagem de postagens novas também será exibida ao lado do tópico.","tracked_categories":"Monitorados(as)","tracked_categories_instructions":"Você irá monitorar automaticamente todos os tópicos nestas categorias. Uma contagem de postagens novas será exibida ao lado do tópico.","watched_first_post_categories":"Acompanhando primeira postagem","watched_first_post_categories_instructions":"Você receberá uma notificação sobre a primeira postagem em cada tópico novo nestas categorias.","watched_first_post_tags":"Acompanhando primeira postagem","watched_first_post_tags_instructions":"Você receberá uma notificação sobre a primeira postagem em cada tópico novo com estas etiquetas.","muted_categories":"Silenciados(as)","muted_categories_instructions":"Você receberá notificações sobre novos tópicos nestas categorias, e eles não serão exibidos nas categorias ou nas últimas páginas.","muted_categories_instructions_dont_hide":"Você não receberá notificações sobre novos tópicos nestas categorias.","regular_categories":"Normal","regular_categories_instructions":"Você verá estas categorias nas listas de tópicos “Recentes” e “Melhores”.","no_category_access":"Como moderador, você tem acesso limitado às categorias, não é possível salvar.","delete_account":"Excluir minha conta","delete_account_confirm":"Você tem certeza de que deseja excluir a sua conta permanentemente? Essa ação não pode ser desfeita!","deleted_yourself":"Sua conta foi excluída com êxito.","delete_yourself_not_allowed":"Entre em contato com um membro da equipe se você deseja que a sua conta seja excluída.","unread_message_count":"Mensagens","admin_delete":"Excluir","users":"Usuários","muted_users":"Silenciados(as)","muted_users_instructions":"Bloquear todas as notificações e mensagens privadas destes(as) usuários(as).","allowed_pm_users":"Permitido(a)","allowed_pm_users_instructions":"Apenas MP destes(as) usuários(as).","allow_private_messages_from_specific_users":"Permitir que apenas usuários(as) específicos(as) mandem mensagens pessoais","ignored_users":"Ignorados(as)","ignored_users_instructions":"Bloquear todas as postagens, notificações e mensagens privadas destes(as) usuários(as).","tracked_topics_link":"Exibir","automatically_unpin_topics":"Desafixar automaticamente os tópicos ao terminar de ler.","apps":"Aplicativos","revoke_access":"Revogar acesso","undo_revoke_access":"Desfazer revogação de acesso","api_approved":"Aprovada:","api_last_used_at":"Usada pela última vez em:","theme":"Tema","save_to_change_theme":"O tema será atualizado quando você clicar em \"%{save_text}\"","home":"Página inicial padrão","staged":"Encenado(a)","staff_counters":{"flags_given":"sinalizações úteis","flagged_posts":"postagens sinalizadas","deleted_posts":"postagens excluídas","suspensions":"suspensões","warnings_received":"avisos","rejected_posts":"postagens rejeitadas"},"messages":{"inbox":"Caixa de entrada","sent":"Enviadas","archive":"Arquivo","groups":"Meus grupos","move_to_inbox":"Mover para caixa de entrada","move_to_archive":"Arquivar","failed_to_move":"Falha ao mover as mensagens selecionadas (talvez você esteja sem conexão com a internet)","tags":"Etiquetas","warnings":"Avisos oficiais"},"preferences_nav":{"account":"Conta","security":"Segurança","profile":"Perfil","emails":"E-mails","notifications":"Notificações","categories":"Categorias","users":"Usuários","tags":"Etiquetas","interface":"Interface","apps":"Aplicativos"},"change_password":{"success":"(e-mail enviado)","in_progress":"(enviando e-mail)","error":"(erro)","emoji":"emoji de bloqueio","action":"Enviar e-mail de redefinição de senha","set_password":"Definir senha","choose_new":"Escolha uma nova senha","choose":"Escolha uma senha"},"second_factor_backup":{"title":"Códigos de backup de dois fatores","regenerate":"Gerar novamente","disable":"Desativar","enable":"Ativar","enable_long":"Ativar códigos de backup","manage":{"one":"Gerenciar códigos de backup. Você tem \u003cstrong\u003e%{count}\u003c/strong\u003e código de backup restante.","other":"Gerenciar códigos de backup. Você tem \u003cstrong\u003e%{count}\u003c/strong\u003e códigos de backup restantes."},"copy_to_clipboard":"Copiar para área de transferência","copy_to_clipboard_error":"Erro ao copiar dados para a área de transferência","copied_to_clipboard":"Copiou para a área de transferência","download_backup_codes":"Baixar códigos de backup","remaining_codes":{"one":"Você tem \u003cstrong\u003e%{count}\u003c/strong\u003e código de backup restante.","other":"Você tem \u003cstrong\u003e%{count}\u003c/strong\u003e códigos de backup restantes."},"use":"Usar um código de backup","enable_prerequisites":"Você deve ativar um método de dois fatores primários antes de gerar código de backup.","codes":{"title":"Códigos de backup gerados","description":"Cada um destes códigos de backup só pode ser usado uma vez. Mantenha-os em algum lugar seguro, mas acessível."}},"second_factor":{"title":"Autenticação de dois fatores","enable":"Gerenciar autenticação de dois fatores","disable_all":"Desativar tudo","forgot_password":"Esqueceu a senha?","confirm_password_description":"Confirme sua senha para continuar","name":"Nome","label":"Código","rate_limit":"Aguarde antes de tentar outro código de autenticação.","enable_description":"Digitalize este código QR em um aplicativo compatível (\u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target=\"_blank\"\u003eAndroid\u003c/a\u003e - \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\" target=\"_blank\"\u003eiOS\u003c/a\u003e) e digite seu código de autenticação.\n","disable_description":"Insira o código de autenticação do seu aplicativo","show_key_description":"Inserir manualmente","short_description":"Proteja sua conta com códigos de segurança de uso único.\n","extended_description":"A autenticação de dois fatores adiciona segurança extra à sua conta, exigindo um token único além da sua senha. Tokens podem ser gerados em dispositivos \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+android\" target='_blank'\u003eAndroid\u003c/a\u003e e \u003ca href=\"https://www.google.com/search?q=authenticator+apps+for+ios\"\u003eiOS\u003c/a\u003e.\n","oauth_enabled_warning":"Observe que as entradas com rede social serão desativadas após a ativação da autenticação de dois fatores na sua conta.","use":"Usar app autenticador","enforced_notice":"Você precisa ativar a autenticação de dois fatores antes de acessar este site.","disable":"Desativar","disable_confirm":"Tem certeza que você quer desativar todos os métodos de dois fatores?","save":"Salvar","edit":"Editar","edit_title":"Editar autenticador","edit_description":"Nome do autenticador","enable_security_key_description":"Quando sua \u003ca href=\"https://www.google.com/search?q=hardware+security+key\" target=\"_blank\"\u003echave de segurança física\u003c/a\u003e estiver preparada, pressione o botão Registrar abaixo.\n","totp":{"title":"Autenticadores baseados em token","add":"Adicionar autenticador","default_name":"Meu autenticador","name_and_code_required_error":"Você deve informar um nome e o código do seu aplicativo autenticador."},"security_key":{"register":"Registrar","title":"Chaves de segurança","add":"Adicionar chave de segurança","default_name":"Chave de segurança principal","not_allowed_error":"O processo de registro da chave de segurança atingiu o tempo limite ou foi cancelado.","already_added_error":"Você já registrou esta chave de segurança.\nVocê não precisa registrá-la novamente.","edit":"Editar chave de segurança","save":"Salvar","edit_description":"Nome da chave de segurança","name_required_error":"Você deve informar um nome para sua chave de segurança."}},"change_about":{"title":"Alterar Sobre mim","error":"Houve um erro ao alterar este valor."},"change_username":{"title":"Alterar nome do(a) usuário(a)","confirm":"Você tem certeza de que deseja alterar seu nome do(a) usuário(a)?","taken":"Desculpe, este nome do(a) usuário(a) já está sendo usado.","invalid":"Este nome do(a) usuário(a) é inválido. Deve conter apenas números e letras"},"add_email":{"title":"Adicione o e-mail","add":"adicionar"},"change_email":{"title":"Alterar e-mail","taken":"Desculpe, este e-mail não está disponível.","error":"Houve um erro ao alterar seu e-mail. Talvez aquele endereço já esteja sendo usado?","success":"Enviamos um e-mail para esse endereço. Siga as instruções para confirmar.","success_via_admin":"Enviamos um e-mail para esse endereço. O(a) usuário(a) precisará seguir as instruções de confirmação do e-mail.","success_staff":"Enviamos um e-mail para o seu endereço atual. Siga as instruções para confirmar."},"change_avatar":{"title":"Alterar sua imagem de perfil","gravatar":"\u003ca href='//%{gravatarBaseUrl}%{gravatarLoginUrl}' target='_blank'\u003e%{gravatarName}\u003c/a\u003e, baseado em","gravatar_title":"Altere seu avatar no site de %{gravatarName}","gravatar_failed":"Não foi possível encontrar um %{gravatarName} com este endereço de e-mail.","refresh_gravatar_title":"Atualizar seu %{gravatarName}","letter_based":"Imagem de perfil atribuída pelo sistema","uploaded_avatar":"Imagem personalizada","uploaded_avatar_empty":"Adicionar uma imagem personalizada","upload_title":"Enviar sua imagem","image_is_not_a_square":"Aviso: cortamos a sua imagem. A largura e a altura não eram iguais.","logo_small":"Logotipo pequeno do site. Usado por padrão."},"change_profile_background":{"title":"Cabeçalho do perfil","instructions":"Os cabeçalhos do perfil serão centralizados e terão largura padrão de 1110px."},"change_card_background":{"title":"Plano de fundo do cartão do(a) usuário(a)","instructions":"Imagens de plano de fundo serão centralizadas e terão largura padrão de 590px."},"change_featured_topic":{"title":"Tópico em destaque","instructions":"Um link para este tópico estará no seu cartão do(a) usuário(a) e no seu perfil."},"email":{"title":"E-mail","primary":"E-mail primário","secondary":"E-mails secundários","primary_label":"primário","unconfirmed_label":"não confirmado","resend_label":"Enviar novamente e-mail de confirmação","resending_label":"enviando...","resent_label":"e-mail enviado","update_email":"Alterar e-mail","set_primary":"Definir e-mail primário","destroy":"Remover e-mail","add_email":"Adicionar e-mail alternativo","auth_override_instructions":"É possível atualizar o e-mail com o provedor de autenticação.","no_secondary":"Nenhum e-mail secundário","instructions":"Nunca visível publicamente.","admin_note":"Observação: se um usuário(a) administrador(a) alterar o e-mail de um(a) usuário(a) não administrador(a), esse usuário(a) perderá acesso à sua conta de e-mail original, de modo que um e-mail de redefinição de senha será enviado para o novo endereço. O e-mail do usuário não será alterado até que o processo de redefinição de senha seja concluído.","ok":"Enviaremos um e-mail para confirmar","required":"Digite um endereço de e-mail","invalid":"Insira um endereço de e-mail válido","authenticated":"Seu e-mail foi autenticado por %{provider}","invite_auth_email_invalid":"Seu e-mail de convite não é igual ao e-mail autenticado por %{provider}","authenticated_by_invite":"Seu e-mail foi autenticado pelo convite","frequency_immediately":"Enviaremos um e-mail imediatamente se você não tiver lido sobre o motivo do envio da nossa mensagem.","frequency":{"one":"Enviaremos um e-mail apenas se você não tiver acessado no último minuto.","other":"Enviaremos um e-mail apenas se você não tiver acessado nos últimos %{count} minutos."}},"associated_accounts":{"title":"Contas associadas","connect":"Conectar","revoke":"Revogar","cancel":"Cancelar","not_connected":"(não conectada)","confirm_modal_title":"Conecte-se à conta %{provider}","confirm_description":{"account_specific":"Sua conta %{provider} \"%{account_description}\" será usada para autenticação.","generic":"Sua conta %{provider} será usada para autenticação."}},"name":{"title":"Nome","instructions":"seu nome completo (opcional)","instructions_required":"Seu nome completo","required":"Digite um nome","too_short":"Seu nome é muito curto","ok":"Seu nome parece bom"},"username":{"title":"Nome do(a) usuário(a)","instructions":"único, sem espaços, curto","short_instructions":"Você pode ser mencioado(a) usando @%{username}.","available":"Seu nome do(a) usuário(a) está disponível","not_available":"Não está disponível. Tentar %{suggestion}?","not_available_no_suggestion":"Não disponível","too_short":"Seu nome do(a) usuário(a) é muito curto","too_long":"Seu nome do(a) usuário(a) é muito longo","checking":"Verificando disponibilidade do nome do(a) usuário(a)...","prefilled":"O e-mail corresponde a este nome do(a) usuário(a) cadastrado","required":"Digite um nome do(a) usuário(a)","edit":"Editar nome do(a) usuário(a)"},"locale":{"title":"Idioma da interface","instructions":"Idioma da interface do(a) usuário(a). Será alterado quando você atualizar a página.","default":"(padrão)","any":"qualquer"},"password_confirmation":{"title":"Senha outra vez"},"invite_code":{"title":"Código de convite","instructions":"O cadastro da conta requer um código de convite"},"auth_tokens":{"title":"Dispositivos usados recentemente","details":"Detalhes","log_out_all":"Sair de tudo","not_you":"Não é você?","show_all":"Exibir tudo (%{count})","show_few":"Exibir menos","was_this_you":"Foi você?","was_this_you_description":"Se tiver sido você, recomendamos alterar sua senha e sair de todos os dispositivos.","browser_and_device":"%{browser} em %{device}","secure_account":"Proteger minha conta","latest_post":"Você postou por último…","device_location":"\u003cspan class=\"auth-token-device\"\u003e%{device}\u003c/span\u003e \u0026ndash; \u003cspan title=\"IP: %{ip}\"\u003e%{location}\u003c/span\u003e","browser_active":"%{browser} | \u003cspan class=\"active\"\u003eativar agora\u003c/span\u003e","browser_last_seen":"%{browser}|%{date}"},"last_posted":"Última postagem","last_seen":"Vistos","created":"Ingressou","log_out":"Sair","location":"Localização","website":"Site","email_settings":"E-mail","hide_profile_and_presence":"Ocultar meu perfil público e recursos de presença","enable_physical_keyboard":"Ativar suporte para teclado físico no iPad","text_size":{"title":"Tamanho do texto","smallest":"Menor","smaller":"Menor","normal":"Normal","larger":"Grande","largest":"Maior"},"title_count_mode":{"title":"O plano de fundo do título da página exibe a contagem de:","notifications":"Novas notificações","contextual":"Novo conteúdo da página"},"like_notification_frequency":{"title":"Notificar ao receber curtida","always":"Sempre","first_time_and_daily":"Primeira vez que uma postagem é curtida diariamente","first_time":"Primeira vez que uma postagem é curtida","never":"Nunca"},"email_previous_replies":{"title":"Incluir respostas anteriores ao final dos e-mails","unless_emailed":"exceto enviados anteriormente","always":"sempre","never":"nunca"},"email_digests":{"title":"Quando eu não acessar o site, envie um resumo por e-mail de tópicos e respostas mais acessadas","every_30_minutes":"a cada 30 minutos","every_hour":"a cada hora","daily":"a cada dia","weekly":"a cada semana","every_month":"a cada mês","every_six_months":"a cada seis meses"},"email_level":{"title":"Envie um e-mail quando alguém me citar, responder à minha postagem, mencionar meu @username ou me convidar para um tópico","always":"sempre","only_when_away":"somente quando estiver longe","never":"nunca"},"email_messages_level":"Envie um e-mail quando alguém me enviar uma mensagem","include_tl0_in_digests":"Incluir conteúdo de usuários novos no resumo de e-mail","email_in_reply_to":"Incluir um trecho das respostas à postagem nos e-mails","other_settings":"Outros(as)","categories_settings":"Categorias","new_topic_duration":{"label":"Considerar novos os tópicos quando","not_viewed":"Eu ainda não tiver visualizado","last_here":"forem criados desde a última vez que estive aqui","after_1_day":"forem criados no último dia","after_2_days":"forem criados nos últimos dois dias","after_1_week":"forem criados na última semana","after_2_weeks":"forem criados nas últimas duas semanas"},"auto_track_topics":"Acompanhar automaticamente os tópicos em que eu entrar","auto_track_options":{"never":"nunca","immediately":"imediatamente","after_30_seconds":"após 30 segundos","after_1_minute":"após 1 minuto","after_2_minutes":"após 2 minutos","after_3_minutes":"após 3 minutos","after_4_minutes":"após 4 minutos","after_5_minutes":"após 5 minutos","after_10_minutes":"após 10 minutos"},"notification_level_when_replying":"Quando eu postar em um tópico, definir esse tópico como","invited":{"title":"Convites","pending_tab":"Pendentes","pending_tab_with_count":"Pendentes (%{count})","expired_tab":"Expirado(a)","expired_tab_with_count":"Expirado(a) (%{count})","redeemed_tab":"Resgatados(as)","redeemed_tab_with_count":"Resgatados (%{count})","invited_via":"Convite","invited_via_link":"vincular %{key} (%{count}/%{max} resgatado(s))","groups":"Grupos","topic":"Tópico","sent":"Criado/enviado por último","expires_at":"Expira","edit":"Editar","remove":"Remover","copy_link":"Obter link","reinvite":"Enviar e-mail novamente","reinvited":"Convite enviado novamente","removed":"Removido(a)","search":"digite para pesquisar convites...","user":"Usuário(a) convidado(a)","none":"Não há convites para exibir.","truncated":{"one":"Exibindo o primeiro convite.","other":"Exibindo os primeiros %{count} convites."},"redeemed":"Convites resgatados","redeemed_at":"Resgatados(as)","pending":"Convites pendentes","topics_entered":"Tópicos visualizados","posts_read_count":"Postagens lidas","expired":"Este convite expirou.","remove_all":"Remover convites expirados","removed_all":"Todos os convites expirados foram removidos!","remove_all_confirm":"Tem certeza de que deseja remover todos os convites expirados?","reinvite_all":"Reenviar todos os convites","reinvite_all_confirm":"Tem certeza de que deseja enviar novamente todos os convites?","reinvited_all":"Todos os convites foram enviados!","time_read":"Tempo de leitura","days_visited":"Dias acessados","account_age_days":"Idade da conta em dias","create":"Convidar","generate_link":"Criar link de convite","link_generated":"Confira o seu link de convite","valid_for":"O link do convite é válido apenas para este endereço de e-mail: %{email}","single_user":"Convidar por e-mail","multiple_user":"Convidar por link","invite_link":{"title":"Link de convite","success":"Link do convite gerado com sucesso!","error":"Ocorreu um erro ao gerar o link de convite","max_redemptions_allowed_label":"Quantas pessoas têm permissão para se cadastrar usando este link?","expires_at":"Quando este link de convite irá expirar?"},"invite":{"new_title":"Criar convite","edit_title":"Editar convite","instructions":"Compartilhar este link para conceder acesso imediato ao site","copy_link":"copiar link","expires_in_time":"Expira em %{time}","expired_at_time":"Expirou em %{time}","show_advanced":"Exibir opções avançadas","hide_advanced":"Ocultar opções avançadas","restrict_email":"Restringir a um endereço de e-mail","max_redemptions_allowed":"Máximo de usos","add_to_groups":"Adicionar a grupos","invite_to_topic":"Buscar tópico","expires_at":"Expira após","custom_message":"Mensagem pessoal opcional","send_invite_email":"Salvar e enviar e-mail","save_invite":"Salvar convite","invite_saved":"Convite salvo","invite_copied":"Link de convite copiado"},"bulk_invite":{"none":"Nenhum convite para exibir nesta página.","text":"Convite em massa","instructions":"\u003cp\u003eConvide uma lista de usuários(as) para promover a sua comunidade rapidamente. Prepare um \u003ca href=\"https://en.wikipedia.org/wiki/Comma-separated_values\" target=\"_blank\"\u003earquivo CSV\u003c/a\u003e contendo pelo menos uma linha por endereço de e-mail dos usuários(as) que você quer convidar. As informações separadas por vírgula a seguir podem ser fornecidas se você quiser adicionar pessoas a grupos ou enviá-las para um tópico específico quando entrarem com a conta pela primeira vez.\u003c/p\u003e\n\u003cpre\u003ejohn@smith.com,first_group_name;second_group_name,topic_id\u003c/pre\u003e\n\u003cp\u003eTodos os endereços de e-mail no arquivo CSV enviado serão mandados como convite, e você poderá gerenciá-lo mais tarde.\u003c/p\u003e\n","progress":"%{progress} enviado(s)...","success":"Arquivo enviado com sucesso, você será notificado(a) por mensagem quando o processo for concluído.","error":"Desculpe, o arquivo deve estar no formato CSV."}},"password":{"title":"Senha","too_short":"A sua senha é muito curta.","common":"A senha é muito comum.","same_as_username":"A sua senha é igual ao seu nome do(a) usuário(a).","same_as_email":"A sua senha é igual ao seu e-mail.","ok":"A sua senha parece boa.","instructions":"pelo menos %{count} caracteres","required":"Digite uma senha"},"summary":{"title":"Resumo","stats":"Estatísticas","time_read":"tempo de leitura","recent_time_read":"tempo de leitura recente","topic_count":{"one":"tópico criado","other":"tópicos criados"},"post_count":{"one":"postagem criada","other":"postagens criadas"},"likes_given":{"one":"dado","other":"dados"},"likes_received":{"one":"recebido","other":"recebidos"},"days_visited":{"one":"dia acessado","other":"dias acessados"},"topics_entered":{"one":"tópico visualizado","other":"tópicos visualizados"},"posts_read":{"one":"postagem lida","other":"postagens lidas"},"bookmark_count":{"one":"favorito","other":"favoritos"},"top_replies":"Melhores respostas","no_replies":"Nenhuma resposta ainda.","more_replies":"Mais respostas","top_topics":"Melhores tópicos","no_topics":"Nenhum tópico ainda.","more_topics":"Mais tópicos","top_badges":"Melhores emblemas","no_badges":"Nenhum emblema ainda.","more_badges":"Mais emblemas","top_links":"Melhores links","no_links":"Nenhum link ainda.","most_liked_by":"Mais curtido por","most_liked_users":"Com mais curtidas","most_replied_to_users":"Mais respondidos(as)","no_likes":"Nenhuma curtida ainda.","top_categories":"Melhores categorias","topics":"Tópicos","replies":"Respostas"},"ip_address":{"title":"Último endereço IP"},"registration_ip_address":{"title":"Endereço IP do cadastro"},"avatar":{"title":"Imagem do perfil","header_title":"perfil, mensagens, favoritos e preferências","name_and_description":"%{name} - %{description}","edit":"Editar imagem do perfil"},"title":{"title":"Título","none":"(nenhum)","instructions":"aparece depois do seu nome de usuário(a)"},"flair":{"title":"Estilo","none":"(nenhum)","instructions":"ícone exibido perto da imagem do seu perfil"},"primary_group":{"title":"Grupo primário","none":"(nenhum)"},"filters":{"all":"Tudo"},"stream":{"posted_by":"Postado por","sent_by":"Enviado por","private_message":"mensagem","the_topic":"o tópico"}},"loading":"Carregando...","errors":{"prev_page":"ao tentar carregar","reasons":{"network":"Erro de rede","server":"Erro de servidor","forbidden":"Acesso negado","unknown":"Erro","not_found":"Página não encontrada"},"desc":{"network":"Verifique sua conexão.","network_fixed":"Parece que voltou.","server":"Código do erro: %{status}","forbidden":"Você não tem permissão para ver isto.","not_found":"Ops, o aplicativo tentou carregar uma URL que não existe.","unknown":"Algo deu errado."},"buttons":{"back":"Voltar","again":"Tentar novamente","fixed":"Carregar página"}},"modal":{"close":"fechar","dismiss_error":"Descartar erro"},"close":"Fechar","assets_changed_confirm":"Este site acabou de receber uma atualização de software. Obter a versão mais recente agora?","logout":"Você foi desconectado(a).","refresh":"Atualizar","home":"Início","read_only_mode":{"enabled":"Este site está em modo somente leitura. Continue a navegar, mas as respostas, curtidas e outras ações estão desativadas por enquanto.","login_disabled":"Não é possível entrar enquanto o site estiver em modo somente leitura. Esse recurso está desativado.","logout_disabled":"Não é possível sair enquanto o site estiver em modo somente leitura. Esse recurso está desativado."},"logs_error_rate_notice":{},"learn_more":"saiba mais...","first_post":"Primeira postagem","mute":"Silenciar","unmute":"Remover silêncio","last_post":"Postado","local_time":"Horário local","time_read":"Lido","time_read_recently":"%{time_read} recentemente","time_read_tooltip":"%{time_read} tempo total lido","time_read_recently_tooltip":"%{time_read} tempo total lido (%{recent_time_read} nos últimos 60 dias)","last_reply_lowercase":"última resposta","replies_lowercase":{"one":"resposta","other":"respostas"},"signup_cta":{"sign_up":"Cadastrar-se","hide_session":"Lembrar amanhã","hide_forever":"não, obrigado(a)","hidden_for_session":"Ok, vamos perguntar amanhã. Você sempre pode usar \"Entrar\" para criar uma conta também.","intro":"Olá! Parece que você está gostando da discussão, mas ainda não cadastou uma conta.","value_prop":"Ao cadastrar uma conta, lembramos exatamente o que foi lido para que você sempre continue de onde parou. Você também recebe notificações, por aqui e via e-mail, sempre que alguém responder. E você pode curtir as postagens para compartilhar o amor. :heartpulse:"},"summary":{"enabled_description":"Você está vendo um resumo deste tópico: as postagens mais interessantes segundo a comunidade.","description":{"one":"Existe \u003cb\u003e%{count}\u003c/b\u003e resposta.","other":"Existem \u003cb\u003e%{count}\u003c/b\u003e respostas."},"enable":"Resumir este tópico","disable":"Exibir todas as postagens"},"deleted_filter":{"enabled_description":"Este tópico contém postagens excluídas, que foram ocultadas.","disabled_description":"As postagens excluídas deste tópico estão sendo exibidas.","enable":"Ocultar postagens excluídas","disable":"Exibir postagens excluídas"},"private_message_info":{"title":"Mensagem","invite":"Convidar outros...","edit":"Adicionar ou remover...","remove":"Remover...","add":"Adicionar...","leave_message":"Tem certeza de que quer sair desta mensagem?","remove_allowed_user":"Tem certeza de que quer remover %{name} desta mensagem?","remove_allowed_group":"Tem certeza de que quer remover %{name} desta mensagem?"},"email":"E-mail","username":"Nome do(a) usuário(a)","last_seen":"Visto(a)","created":"Criado(a)","created_lowercase":"criado(a)","trust_level":"Nível de confiança","search_hint":"nome do(a) usuário(a), e-mail ou endereço IP","create_account":{"header_title":"Boas-vindas!","subheader_title":"Vamos criar a sua conta","disclaimer":"Ao se cadastrar, você concorda com a \u003ca href='%{privacy_link}' target='blank'\u003epolítica de privacidade\u003c/a\u003e e os \u003ca href='%{tos_link}' target='blank'\u003etermos de serviço\u003c/a\u003e.","title":"Criar sua conta","failed":"Algo deu errado, talvez este e-mail já esteja cadastrado, tente usar o link de senha esquecida."},"forgot_password":{"title":"Redefinição de senha","action":"Esqueci minha senha","invite":"Digite o seu nome do(a) usuário(a) ou endereço de e-mail, e enviaremos um e-mail para redefinir sua senha.","reset":"Redefinir senha","complete_username":"Se uma conta corresponder ao nome do(a) usuário(a) \u003cb\u003e%{username}\u003c/b\u003e, você deverá receber um e-mail com instruções de como redefinir sua senha rapidamente.","complete_email":"Se uma conta corresponder a \u003cb\u003e%{email}\u003c/b\u003e, você deverá receber um e-mail com instruções de como redefinir sua senha rapidamente.","complete_username_found":"Encontramos uma conta que corresponde ao nome do(a) usuário(a) \u003cb\u003e%{username}\u003c/b\u003e. Você deverá receber um e-mail com instruções sobre como redefinir sua senha em breve.","complete_email_found":"Encontramos uma conta que corresponde a \u003cb\u003e%{email}\u003c/b\u003e. Você deverá receber um e-mail com instruções de como redefinir sua senha em breve.","complete_username_not_found":"Nenhuma conta corresponde ao nome de usuário(a) \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Nenhuma conta corresponde a \u003cb\u003e%{email}\u003c/b\u003e","help":"O e-mail não chegou? Verifique sua pasta de spam primeiro.\u003cp\u003eNão tem certeza de qual endereço de e-mail você usou? Digite um endereço de e-mail e informaremos se existe aqui.\u003c/p\u003e\u003cp\u003eSe você não tiver mais acesso ao endereço de e-mail da sua conta, entre em contato com \u003ca href='%{basePath}/about'\u003enossa equipe, que está sempre disposta a ajudar.\u003c/a\u003e\u003c/p\u003e","button_ok":"Ok","button_help":"Ajuda"},"email_login":{"link_label":"Envie por e-mail um link para entrar","button_label":"com e-mail","login_link":"Pular a senha, enviar um link por e-mail para entrar com a conta","emoji":"emoji de bloqueio","complete_username":"Se uma conta corresponder ao nome de usuário(a) \u003cb\u003e%{username}\u003c/b\u003e, em breve você deverá receber um e-mail com um link para entrar.","complete_email":"Se uma conta corresponder à \u003cb\u003e%{email}\u003c/b\u003e, em breve você deverá receber um e-mail com um link para entrar.","complete_username_found":"Encontramos uma conta que corresponde ao nome de usuário(a) \u003cb\u003e%{username}\u003c/b\u003e, em breve você deverá receber um e-mail com um link para entrar.","complete_email_found":"Encontramos uma conta que corresponde a \u003cb\u003e%{email}\u003c/b\u003e, em breve você deverá receber um e-mail com um link para entrar.","complete_username_not_found":"Nenhuma conta corresponde ao nome de usuário(a) \u003cb\u003e%{username}\u003c/b\u003e","complete_email_not_found":"Nenhuma conta corresponde a \u003cb\u003e%{email}\u003c/b\u003e","confirm_title":"Continuar para %{site_name}","logging_in_as":"Entrando como %{email}","confirm_button":"Terminar de entrar"},"login":{"header_title":"Boas-vindas outra vez","subheader_title":"Entrar com a sua conta","title":"Entrar","username":"Usuário(a)","password":"Senha","second_factor_title":"Autenticação de dois fatores","second_factor_description":"Digite o código de autenticação do seu aplicativo:","second_factor_backup":"Entrar usando um código de backup","second_factor_backup_title":"Backup de dois fatores","second_factor_backup_description":"Insira um dos seus códigos de backup:","second_factor":"Fazer login usando um aplicativo de autenticação","security_key_description":"Quando você tiver sua chave física de segurança preparada, pressione o botão Autenticar com chave de segurança abaixo.","security_key_alternative":"Tentar de outra maneira","security_key_authenticate":"Autenticar com chave de segurança","security_key_not_allowed_error":"O processo de autenticação com chave de segurança atingiu o limite de tempo ou foi cancelado.","security_key_no_matching_credential_error":"Nenhuma credencial correspondente pôde ser encontrada na chave de segurança informada.","security_key_support_missing_error":"Seu dispositivo ou navegador atual não são compatíveis com o uso de chaves de segurança. Use um método diferente.","email_placeholder":"E-mail/nome do(a) usuário(a)","caps_lock_warning":"Caps Lock está ativado","error":"Erro desconhecido","cookies_error":"Pelo visto, os cookies do seu navegador estão desativados. Talvez você não consiga entrar em ativá-los antes.","rate_limit":"Aguarde antes de tentar entrar novamente.","blank_username":"Digite seu e-mail ou nome do(a) usuário(a).","blank_username_or_password":"Digite seu e-mail ou nome do(a) usuário(a) e a senha.","reset_password":"Redefinir senha","logging_in":"Entrando...","or":"Ou","authenticating":"Autenticando...","awaiting_activation":"Sua conta está aguardando ativação, utilize o link \"Esqueci a senha\" para enviar um novo e-mail de ativação.","awaiting_approval":"Sua conta ainda não foi aprovada por um membro da equipe. Você receberá um e-mail quando isso acontecer.","requires_invite":"Desculpe, o acesso a este fórum é permitido somente pelo convite de outro membro.","not_activated":"Você não pode entrar ainda. Nós enviamos um e-mail de ativação antes para o endereço \u003cb\u003e%{sentTo}\u003c/b\u003e. Siga as instruções deste e-mail para ativar a sua conta.","not_allowed_from_ip_address":"Você não pode entrar com este endereço IP.","admin_not_allowed_from_ip_address":"Você não pode entrar como administrador(a) com este endereço IP.","resend_activation_email":"Clique aqui para enviar o e-mail de ativação novamente.","omniauth_disallow_totp":"Sua conta tem autenticação dois fatores ativada. Entre com sua senha.","resend_title":"Enviar novamente e-mail de ativação","change_email":"Alterar endereço de e-mail","provide_new_email":"Informe um novo endereço de e-mail e enviaremos novamente o seu e-mail de confirmação.","submit_new_email":"Atualizar endereço de e-mail","sent_activation_email_again":"Enviamos mais um e-mail de ativação para o endereço \u003cb\u003e%{currentEmail}\u003c/b\u003e. Pode ser que demore alguns minutos para chegar, verifique sempre sua caixa de spam.","sent_activation_email_again_generic":"Enviamos mais um e-mail de ativação. Pode ser que demore alguns minutos para chegar, verifique sua caixa de spam.","to_continue":"Entre com sua conta","preferences":"Você precisa entrar para mudar suas preferências de usuário(a).","not_approved":"Sua conta ainda não foi aprovada. Você será notificado(a) por e-mail quando tudo estiver pronto para entrar.","google_oauth2":{"name":"Google","title":"com o Google"},"twitter":{"name":"Twitter","title":"com o Twitter"},"instagram":{"name":"Instagram","title":"com o Instagram"},"facebook":{"name":"Facebook","title":"com o Facebook"},"github":{"name":"GitHub","title":"com o GitHub"},"discord":{"name":"Discord","title":"com o Discord"},"second_factor_toggle":{"totp":"Use um aplicativo autenticador","backup_code":"Use um código de backup"}},"invites":{"accept_title":"Convite","emoji":"emoji de envelope","welcome_to":"Boas-vindas ao %{site_name}!","invited_by":"Você foi convidado(a) por:","social_login_available":"Você também poderá entrar com qualquer rede social usando este e-mail.","your_email":"O endereço de e-mail da sua conta é \u003cb\u003e%{email}\u003c/b\u003e.","accept_invite":"Aceitar convite","success":"Sua conta foi criada e você já entrou.","name_label":"Nome","password_label":"Senha","optional_description":"(opcional)"},"password_reset":{"continue":"Continuar para %{site_name}"},"emoji_set":{"apple_international":"Apple/Internacional","google":"Google","twitter":"Twitter","win10":"Win10","google_classic":"Google Classic","facebook_messenger":"Facebook Messenger"},"category_page_style":{"categories_only":"Apenas categorias","categories_with_featured_topics":"Categorias com tópicos em destaque","categories_and_latest_topics":"Categorias e últimos tópicos","categories_and_top_topics":"Categorias e melhores tópicos","categories_boxes":"Caixas de seleção com subcategorias","categories_boxes_with_topics":"Caixas de seleção com tópicos em destaque"},"shortcut_modifier_key":{"shift":"Shift","ctrl":"Ctrl","alt":"Alt","enter":"Enter"},"conditional_loading_section":{"loading":"Carregando..."},"category_row":{"topic_count":{"one":"%{count} tópico nesta categoria","other":"%{count} tópicos nesta categoria"},"plus_subcategories_title":{"one":"%{name} e uma subcategoria","other":"%{name} e %{count} subcategorias"},"plus_subcategories":{"one":"+%{count} subcategoria","other":"+%{count} subcategorias"}},"select_kit":{"filter_by":"Filtrar por: %{name}","select_to_filter":"Selecione um valor para filtrar","default_header_text":"Selecionar...","no_content":"Nenhuma correspondência encontrada","filter_placeholder":"Pesquisar...","filter_placeholder_with_any":"Pesquisar ou criar…","create":"Criar: \"%{content}\"","max_content_reached":{"one":"Você só pode selecionar %{count} item.","other":"Você só pode selecionar %{count} itens."},"min_content_not_reached":{"one":"Selecione pelo menos %{count} item.","other":"Selecione pelo menos %{count} itens."},"invalid_selection_length":{"one":"A seleção deve ter pelo menos %{count} caracter.","other":"A seleção deve ter pelo menos %{count} caracteres."},"components":{"tag_drop":{"filter_for_more":"Filtre para ver mais..."},"categories_admin_dropdown":{"title":"Gerenciar categorias"}}},"date_time_picker":{"from":"De","to":"Para"},"emoji_picker":{"filter_placeholder":"Pesquisar por emoji","smileys_\u0026_emotion":"Carinhas e emotion","people_\u0026_body":"Pessoas e corpo","animals_\u0026_nature":"Animais e natureza","food_\u0026_drink":"Comida e bebida","travel_\u0026_places":"Viagens e lLugares","activities":"Atividades","objects":"Objetos","symbols":"Símbolos","flags":"Sinalizadores","recent":"Usados recentemente","default_tone":"Sem tom de pele","light_tone":"Tom de pele claro","medium_light_tone":"Tom de pele médio-claro","medium_tone":"Tom de pele médio","medium_dark_tone":"Tom de pele médio-escuro","dark_tone":"Tom de pele escuro","default":"Emojis personalizados"},"shared_drafts":{"title":"Rascunhos compartilhados","notice":"Este tópico está visível apenas para quem puder publicar rascunhos compartilhados.","destination_category":"Categoria de destino","publish":"Publicar rascunho compartilhado","confirm_publish":"Você tem certeza de que deseja publicar este rascunho?","publishing":"Publicando tópico..."},"composer":{"emoji":"Emoji :)","more_emoji":"mais...","options":"Opções","whisper":"sussuro","unlist":"não listado(a)","add_warning":"Esta é uma advertência oficial.","toggle_whisper":"Alternar sussuro","toggle_unlisted":"Alternar não listado","posting_not_on_topic":"Qual tópico você gostaria de responder?","saved_local_draft_tip":"salvo em modo local","similar_topics":"Seu tópico é parecido com...","drafts_offline":"rascunhos off-line","edit_conflict":"editar conflito","group_mentioned_limit":{"one":"\u003cb\u003eAviso!\u003c/b\u003e Você menciou \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, mas este grupo tem mais membros do que o limite de menções configurado pelo(a) administrador(a) de %{count} usuário(a). Ninguém será notificado(a).","other":"\u003cb\u003eAviso!\u003c/b\u003e Você menciou \u003ca href='%{group_link}'\u003e%{group}\u003c/a\u003e, mas este grupo tem mais membros do que o limite de menções configurado pelo(a) administrador(a) de %{count} usuários(as). Ninguém será notificado(a)."},"group_mentioned":{"one":"Ao mencionar %{group}, você está prestes a notificar \u003ca href='%{group_link}'\u003e%{count} pessoa\u003c/a\u003e. Tem certeza?","other":"Ao mencionar %{group}, você está prestes a notificar \u003ca href='%{group_link}'\u003e%{count} pessoas\u003c/a\u003e. Tem certeza?"},"cannot_see_mention":{"category":"Você mencionou %{username}, mas ele(a) não será notificado(a), pois não tem acesso a esta categoria. Você precisará adicioná-lo(a) ao grupo que tem acesso à categoria.","private":"Você mencionou %{username}, mas ele(a) não será notificado(a), pois não pode ver esta mensagem pessoal. Você precisará convidá-lo(a) para esta MP."},"duplicate_link":"Parece que o seu link de \u003cb\u003e%{domain}\u003c/b\u003e já foi postado neste tópico por \u003cb\u003e@%{username}\u003c/b\u003e em \u003ca href='%{post_url}'\u003euma resposta em %{ago}\u003c/a\u003e. Tem certeza de que deseja postar novamente?","reference_topic_title":"RE: %{title}","error":{"title_missing":"O título é obrigatório","title_too_short":{"one":"O título deve ter pelo menos %{count} caracter","other":"Título precisa ter no mínimo %{count} caracteres"},"title_too_long":{"one":"O título não pode ter mais do que %{count} caracter","other":"O título não pode ter mais do que %{count} caracteres"},"post_missing":"A postagem não pode estar vazia","post_length":{"one":"A postagem deve ter pelo menos %{count} caracter","other":"A postagem deve ter pelo menos %{count} caracteres"},"try_like":"Você já tentou o botão %{heart}?","category_missing":"Você precisa escolher uma categoria","tags_missing":{"one":"É preciso escolher pelo menos %{count} etiqueta","other":"É preciso escolher pelo menos %{count} etiquetas"},"topic_template_not_modified":"Adicione detalhes e especificações ao seu tópico editando o modelo do tópico."},"save_edit":"Salvar edição","overwrite_edit":"Sobrescrever edição","reply_original":"Responder no tópico original","reply_here":"Responder aqui","reply":"Responder","cancel":"Cancelar","create_topic":"Criar tópico","create_pm":"Mensagem","create_whisper":"Sussuro","create_shared_draft":"Criar rascunho compartilhado","edit_shared_draft":"Editar rascunho compartilhado","title":"Ou pressione Ctrl+Enter","users_placeholder":"Adicionar um usuário","title_placeholder":"Em algumas palavras, sobre o que é esta discussão?","title_or_link_placeholder":"Digite um título, ou cole um link aqui","edit_reason_placeholder":"por que você está editando?","topic_featured_link_placeholder":"Inserir link mostrado no título.","remove_featured_link":"Remover link do tópico.","reply_placeholder":"Digite aqui. Use Markdown, BBCode, ou HTML para formatar. Arraste ou cole imagens.","reply_placeholder_no_images":"Digite aqui. Use Markdown, BBCode, ou HTML para formatar.","reply_placeholder_choose_category":"Selecione uma categoria antes de digitar aqui.","view_new_post":"Veja a sua nova postagem.","saving":"Salvando","saved":"Salvo!","saved_draft":"Rascunho de postagem em andamento. Toque para retomar.","uploading":"Enviando...","show_preview":"exibir pré-visualização","hide_preview":"ocultar pré-visualização","quote_post_title":"Citar postagem inteira","bold_label":"N","bold_title":"Negrito","bold_text":"texto em negrito","italic_label":"I","italic_title":"Realce","italic_text":"texto realçado","link_title":"Hiperlink","link_description":"digite a descrição do link aqui","link_dialog_title":"Inserir hiperlink","link_optional_text":"título opcional","link_url_placeholder":"Cole uma URL ou digite para pesquisar tópicos","blockquote_title":"Citação em bloco","blockquote_text":"Bloco de Citação","code_title":"Texto pré-formatado","code_text":"recuar o texto pré-formatado em quatro espaços","paste_code_text":"digite ou cole o código aqui","upload_title":"Enviar","upload_description":"digite aqui a descrição do arquivo enviado","olist_title":"Lista numerada","ulist_title":"Lista com marcadores","list_item":"Item da lista","toggle_direction":"Alternar direção","help":"Ajuda de edição de redução","collapse":"minimizar o painel do compositor","open":"abrir o painel do compositor","abandon":"fechar compositor e descartar rascunho","enter_fullscreen":"entrar no compositor em tela cheia","exit_fullscreen":"sair do compositor em tela cheia","show_toolbar":"exibir barra de ferramentas do compositor","hide_toolbar":"ocultar barra de ferramentas do compositor","modal_ok":"Ok","modal_cancel":"Cancelar","cant_send_pm":"Desculpe, você não pode enviar uma mensagem para %{username}.","yourself_confirm":{"title":"Você se esqueceu de adicionar destinatários?","body":"Por enquanto, esta mensagem está sendo enviada apenas para você mesmo(a)!"},"slow_mode":{"error":"Este tópico está no modo lento. Você já postou recentemente. É possível postar outra vez em %{timeLeft}."},"admin_options_title":"Configurações opcionais da equipe para este tópico","composer_actions":{"reply":"Responder","draft":"Rascunho","edit":"Editar","reply_to_post":{"label":"Responder a uma publicação de %{postUsername}","desc":"Responder a uma postagem específica"},"reply_as_new_topic":{"label":"Responder como tópico relacionado","desc":"Criar um novo tópico relacionado a este tópico","confirm":"Você tem um novo rascunho de tópico salvo, que será substituído ao criar um tópico vinculado."},"reply_as_new_group_message":{"label":"Responder como nova mensagem de grupo","desc":"Crie uma nova mensagem começando com os mesmos destinatários"},"reply_as_private_message":{"label":"Nova mensagem","desc":"Criar uma nova mensagem pessoal"},"reply_to_topic":{"label":"Responder ao tópico","desc":"Responder ao tópico, não a uma postagem específica"},"toggle_whisper":{"label":"Alternar sussurro","desc":"Sussurros são visíveis apenas para membros da equipe"},"create_topic":{"label":"Novo tópico"},"shared_draft":{"label":"Rascunho compartilhado","desc":"Fazer rascunho do tópico visívei apenas para usuários(as) com permissão"},"toggle_topic_bump":{"label":"Alternar promoção de tópico","desc":"Responder sem alterar a data da última resposta"}},"reload":"Recarregar","ignore":"Ignorar","details_title":"Resumo","details_text":"Este texto ficará oculto."},"notifications":{"tooltip":{"regular":{"one":"%{count} notificação não visualizada","other":"%{count} notificações não visualizadas"},"message":{"one":"%{count} mensagem não lida","other":"%{count} mensagens não lidas"},"high_priority":{"one":"%{count} notificação não lida de alta prioridade","other":"%{count} notificações não lidas de alta prioridade"}},"title":"notificações de menção de @nome, respostas às suas postagens, tópicos, mensagens, etc","none":"Não foi possível carregar notificações no momento.","empty":"Nenhuma notificação foi encontrada.","post_approved":"Sua postagem foi aprovada","reviewable_items":"itens que exigem revisão","mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","group_mentioned":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","quoted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","bookmark_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","replied":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","posted":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","edited":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","liked_2":"\u003cspan class='double-user'\u003e%{username}, %{username2}\u003c/span\u003e %{description}","liked_many":{"one":"\u003cspan class='multi-user'\u003e%{username}, %{username2} e %{count} outro\u003c/span\u003e %{description}","other":"\u003cspan class='multi-user'\u003e%{username}, %{username2} e %{count} outros\u003c/span\u003e %{description}"},"liked_consolidated_description":{"one":"curtiu %{count} de suas postagens","other":"curtiu %{count} de suas postagens"},"liked_consolidated":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","private_message":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_private_message":"\u003cp\u003e\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invited_to_topic":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","invitee_accepted":"\u003cspan\u003e%{username}\u003c/span\u003e aceitou o seu convite","moved_post":"\u003cspan\u003e%{username}\u003c/span\u003e moveu %{description}","linked":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","granted_badge":"Ganhou \"%{description}'","topic_reminder":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","watching_first_post":"\u003cspan\u003eNovo tópico\u003c/span\u003e %{description}","membership_request_accepted":"Associação aceita em '%{group_name}'","membership_request_consolidated":{"one":"%{count} solicitação de associação aberta para \"%{group_name}\"","other":"%{count} solicitações de associação abertas para \"%{group_name}\""},"reaction":"\u003cspan\u003e%{username}\u003c/span\u003e %{description}","reaction_2":"\u003cspan\u003e%{username}, %{username2}\u003c/span\u003e %{description}","votes_released":"%{description} - concluído(a)","group_message_summary":{"one":"%{count} mensagem na caixa de entrada de %{group_name}","other":"%{count} mensagens na caixa de entrada de %{group_name}"},"popup":{"mentioned":"Você foi mencionado(a) por %{username} em \"%{topic}\" - %{site_title}","group_mentioned":"Você foi mencionado(a) por %{username} em \"%{topic}\" - %{site_title}","quoted":"Você foi citado(a) por %{username} em \"%{topic}\" - %{site_title}","replied":"%{username} respondeu em \"%{topic}\" - %{site_title}","posted":"%{username} postou em \"%{topic}\" - %{site_title}","private_message":"%{username} enviou uma mensagem pessoal em \"%{topic}\" - %{site_title}","linked":"%{username} vinculou sua postagem em \"%{topic}\" - %{site_title}","watching_first_post":"%{username} criou um novo tópico \"%{topic}\" - %{site_title}","confirm_title":"Notificações ativadas - %{site_title}","confirm_body":"Sucesso! As notificações foram ativadas.","custom":"Notificação de %{username} em %{site_title}"},"titles":{"mentioned":"mencionado(a)","replied":"nova resposta","quoted":"citado(a)","edited":"editado(a)","liked":"nova curtida","private_message":"nova mensagem privada","invited_to_private_message":"convidado(a) para mensagem privada","invitee_accepted":"convite aceito","posted":"nova postagem","moved_post":"postagem movida","linked":"vinculado(a)","bookmark_reminder":"lembrete de favorito","bookmark_reminder_with_name":"lembrete de favorito - %{name}","granted_badge":"emblema concedido","invited_to_topic":"convidado(a) para o tópico","group_mentioned":"grupo mencionado","group_message_summary":"novas mensagens de grupo","watching_first_post":"novo tópico","topic_reminder":"lembrete de tópico","liked_consolidated":"novas curtidas","post_approved":"postagem aprovada","membership_request_consolidated":"novas solicitações de associação","reaction":"nova reação","votes_released":"Voto emitido"}},"upload_selector":{"uploading":"Enviando","processing":"Processando envio","select_file":"Selecionar arquivo","default_image_alt_text":"imagem"},"search":{"sort_by":"Ordenar por","relevance":"Relevância","latest_post":"Última postagem","latest_topic":"Último tópico","most_viewed":"Mais visto(a)","most_liked":"Mais curtido(a)","select_all":"Selecionar tudo","clear_all":"Limpar tudo","too_short":"Seu termo de pesquisa é muito curto.","result_count":{"one":"\u003cspan\u003e%{count} resultado para\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e","other":"\u003cspan\u003e%{count}%{plus} resultados para\u003c/span\u003e\u003cspan class='term'\u003e%{term}\u003c/span\u003e"},"title":"pesquisar tópicos, postagens, usuários ou categorias","full_page_title":"pesquisar tópicos ou postagens","no_results":"Nenhum resultado encontrado.","no_more_results":"Nenhum outro resultado encontrado.","post_format":"#%{post_number} por %{username}","results_page":"Pesquisar resultados para \"%{term}\"","more_results":"Existem mais resultados. Restrinja os seus critérios de pesquisa.","cant_find":"Não consegue encontrar o que está procurando?","start_new_topic":"Que tal começar um novo tópico?","or_search_google":"Ou tente pesquisar com o Google:","search_google":"Tente pesquisar com o Google:","search_google_button":"Google","search_button":"Pesquisar","context":{"user":"Pesquisar postagens de @%{username}","category":"Pesquisar a categoria #%{category}","tag":"Pesquisar a etiqueta #%{tag}","topic":"Pesquisar este tópico","private_messages":"Pesquisar mensagens"},"advanced":{"title":"Pesquisa avançada","posted_by":{"label":"Postado por"},"in_category":{"label":"Categorizado"},"in_group":{"label":"Em grupo"},"with_badge":{"label":"Com emblema"},"with_tags":{"label":"Com etiqueta"},"filters":{"label":"Retornar somente tópicos/postagens...","title":"Correspondência somente no título","likes":"Curti","posted":"Postei em","created":"Criei","watching":"Estou acompanhando","tracking":"Estou monitorando","private":"Nas minhas mensagens","bookmarks":"Marquei como favorito","first":"são exatamente a primeira postagem","pinned":"estão fixados","seen":"Li","unseen":"Não li","wiki":"são wiki","images":"incluem imagem(ns)","all_tags":"Todas as etiquetas acima"},"statuses":{"label":"Em que os tópicos","open":"estão abertos","closed":"estão fechados","public":"são públicos","archived":"estão arquivados","noreplies":"não possuem respostas","single_user":"contêm um único usuário"},"post":{"count":{"label":"Mensagens"},"min":{"placeholder":"mínimo"},"max":{"placeholder":"máximo"},"time":{"label":"Postado","before":"antes","after":"depois"}},"views":{"label":"Visualizações"},"min_views":{"placeholder":"mínimo"},"max_views":{"placeholder":"máximo"}}},"hamburger_menu":"ir para outra listagem de tópicos ou categoria","new_item":"novo","go_back":"voltar","not_logged_in_user":"página do(a) usuário(a) com resumo de atividades e preferências atuais","current_user":"ir para a sua página do(a) usuário(a)","view_all":"exibir tudo %{tab}","topics":{"new_messages_marker":"último acesso","bulk":{"select_all":"Selecionar tudo","clear_all":"Limpar tudo","unlist_topics":"Remover tópicos da lista","relist_topics":"Reinserir tópicos na lista","reset_read":"Redefinir lidos","delete":"Excluir tópicos","dismiss":"Descartar","dismiss_read":"Descartar todos os não lidos","dismiss_read_with_selected":{"one":"Descartar %{count} não lida","other":"Descartar %{count} não lidos(as)"},"dismiss_button":"Descartar...","dismiss_button_with_selected":{"one":"Descartar (%{count})…","other":"Descartar (%{count})…"},"dismiss_tooltip":"Descartar apenas postagens novas ou parar de monitorar tópicos","also_dismiss_topics":"Parar de acompanhar estes tópicos para que eles deixem de aparecer como não lidos para mim","dismiss_new":"Descartar novos","dismiss_new_with_selected":{"one":"Descartar novo(a) (%{count})","other":"Descartar novos(as) (%{count})"},"toggle":"alternar seleção de tópicos em massa","actions":"Ações em massa","close_topics":"Fechar tópicos","archive_topics":"Arquivar tópicos","move_messages_to_inbox":"Mover para caixa de entrada","change_notification_level":"Alterar nível de notificação","choose_new_category":"Escolha a nova categoria para os tópicos:","selected":{"one":"Você selecionou \u003cb\u003e%{count}\u003c/b\u003e tópico.","other":"Você selecionou \u003cb\u003e%{count}\u003c/b\u003e tópicos."},"change_tags":"Substituir etiquetas","append_tags":"Adicionar etiquetas","choose_new_tags":"Escolha novas etiquetas para estes tópicos:","choose_append_tags":"Escolha novas etiquetas para adicionar a estes tópicos:","changed_tags":"As etiquetas destes tópicos foram alteradas.","remove_tags":"Remover todas as etiquetas","confirm_remove_tags":{"one":"Todas as etiquetas serão removidas deste tópico. Deseja prosseguir?","other":"Todas as etiquetas serão removidas de \u003cb\u003e%{count}\u003c/b\u003e tópicos. Deseja prosseguir?"},"progress":{"one":"Progresso: \u003cstrong\u003e%{count}\u003c/strong\u003e tópico","other":"Progresso: \u003cstrong\u003e%{count}\u003c/strong\u003e tópicos"}},"none":{"unread":"Você não tem tópicos não lidos.","new":"Você não tem novos tópicos.","read":"Você ainda não leu nenhum tópico.","posted":"Você ainda não postou em nenhum tópico.","latest":"Não tem mais novidades!","bookmarks":"Você ainda não tem nenhum tópico favorito.","category":"Não há tópicos na categoria %{category}.","top":"Não há melhores tópicos.","educate":{"new":"\u003cp\u003eSeus novos tópicos serão exibidos aqui. Por padrão, os tópicos serão considerados novos e exibirão um \u003cspan class=\"badge new-topic badge-notification\" style=\"vertical-align:middle;line-height:inherit;\"\u003e\u003c/span\u003e indicador se tiverem tido criados nos últimos dois dias.\u003c/p\u003e\u003cp\u003eAcesse suas \u003ca href=\"%{userPrefsUrl}\"\u003epreferências\u003c/a\u003e para alterar essa configuração.\u003c/p\u003e","unread":"\u003cp\u003eSeus tópicos não lidos são exibidos aqui.\u003c/p\u003e\u003cp\u003ePor padrão, os tópicos são considerados como não lidos e exibirão contadores \u003cspan class=\"badge unread-posts badge-notification\"\u003e1\u003c/span\u003e se você tiver:\u003c/p\u003e\u003cul\u003e\u003cli\u003ecriado o tópico\u003c/li\u003e\u003cli\u003erespondido ao tópico\u003c/li\u003e\u003cli\u003elido o tópico por mais de 4 minutos\u003c/li\u003e\u003c/ul\u003e\u003cp\u003eou marcado o tópico como Monitorado ou Acompanhado pelo 🔔 em cada tópico.\u003c/p\u003e\u003cp\u003eAcesse suas \u003ca href=\"%{userPrefsUrl}\"\u003epreferências\u003c/a\u003e para alterar essa configuração.\u003c/p\u003e"}},"bottom":{"latest":"Não há mais últimos tópicos.","posted":"Não há mais tópicos postados.","read":"Não há mais tópicos lidos.","new":"Não há mais tópicos novos.","unread":"Não há mais tópicos não lidos.","category":"Não há mais tópicos na categoria %{category}.","tag":"Não há mais tópicos na categoria %{tag}.","top":"Não há mais melhores tópicos.","bookmarks":"Não há mais tópicos favoritos."}},"topic":{"filter_to":{"one":"%{count} postagem no tópico","other":"%{count} postagens no tópico"},"create":"Novo tópico","create_long":"Criar um novo tópico","open_draft":"Rascunho aberto","private_message":"Iniciar uma mensagem","archive_message":{"help":"Mover mensagem para o seu arquivo","title":"Arquivar"},"move_to_inbox":{"title":"Mover para caixa de entrada","help":"Mover mensagem de volta para caixa de entrada"},"edit_message":{"help":"Editar primeira postagem da mensagem","title":"Editar"},"defer":{"help":"Marcar como não lido","title":"Adiar"},"list":"Tópicos","new":"novo tópico","unread":"não lido","new_topics":{"one":"%{count} tópico novo","other":"%{count} tópicos novos"},"unread_topics":{"one":"%{count} tópico não lido","other":"%{count} tópicos não lidos"},"title":"Tópico","invalid_access":{"title":"Tópico é privado","description":"Desculpe, você não tem acesso a esse tópico!","login_required":"Você precisa entrar para ver esse tópico."},"server_error":{"title":"Falha ao carregar tópico","description":"Desculpe, não foi possível este tópico, possivelmente devido a um problema na conexão. Tente novamente. Se o problema persistir, entre em contato conosco."},"not_found":{"title":"Tópico não encontrado","description":"Desculpe, não foi possível encontrar esse tópico. Talvez tenha sido removido pela moderação."},"unread_posts":{"one":"você tem %{count} postagem não lida neste tópico","other":"você tem %{count} postagens não lidas neste tópico"},"likes":{"one":"há %{count} curtida neste tópico","other":"há %{count} curtidas neste tópico"},"back_to_list":"Voltar para a lista de tópicos","options":"Opções de tópico","show_links":"exibir links neste tópico","collapse_details":"recolher detalhes do tópico","expand_details":"expandir detalhes do tópico","read_more_in_category":"Quer ler mais? Veja outros tópicos em %{catLink} ou %{latestLink}.","read_more":"Quer ler mais? %{catLink} ou %{latestLink}.","unread_indicator":"Nenhum membro leu a última postagem deste tópico ainda.","browse_all_categories":"Ver todas as categorias","browse_all_tags":"Procurar todas as etiquetas","view_latest_topics":"ver últimos tópicos","suggest_create_topic":"Tudo pronto para \u003ca href\u003ecomeçar uma nova conversa?\u003c/a\u003e","jump_reply_up":"pular para a primeira resposta","jump_reply_down":"pular para a última resposta","deleted":"Este tópico foi excluído","slow_mode_update":{"title":"Modo lento","select":"Os(as) usuários(as) podem postar neste tópico apenas a cada:","description":"Para promover um diálogo saudável em discussões dinâmicas e acirradas, os(as) usuários(as) devem aguardar antes de postar neste tópico outra vez.","enable":"Ativar","update":"Atualizar","enabled_until":"Ativado(a) até:","remove":"Desativar","hours":"Horas:","minutes":"Minutos:","seconds":"Segundos:","durations":{"10_minutes":"10 minutos","15_minutes":"15 minutos","30_minutes":"30 minutos","45_minutes":"45 minutos","1_hour":"1 hora","2_hours":"2 horas","4_hours":"4 horas","8_hours":"8 horas","12_hours":"12 horas","24_hours":"24 horas","custom":"Duração personalizada"}},"slow_mode_notice":{"duration":"Aguarde %{duration} entre as postagens neste tópico"},"topic_status_update":{"title":"Timer de tópico","save":"Definir timer","num_of_hours":"Quantidade de horas:","num_of_days":"Quantidade de dias:","remove":"Remover timer","publish_to":"Publicar em:","when":"Quando:","time_frame_required":"Selecione um intervalo de tempo","min_duration":"A duração deve ser maior do que 0","max_duration":"A duração deve ser menor do que 20 anos"},"auto_update_input":{"none":"Selecione um intervalo de tempo","now":"Agora","later_today":"Hoje mais tarde","tomorrow":"Amanhã","later_this_week":"Mais tarde nesta semana","this_weekend":"Neste fim de semana","next_week":"Próxima semana","two_weeks":"Duas semanas","next_month":"Próximo mês","two_months":"Dois meses","three_months":"Três meses","four_months":"Quatro meses","six_months":"Seis meses","one_year":"Um ano","forever":"Para sempre","pick_date_and_time":"Escolher data e hora","set_based_on_last_post":"Fechar com base na última postagem"},"publish_to_category":{"title":"Agendar publicação"},"temp_open":{"title":"Abrir temporariamente"},"auto_reopen":{"title":"Abrir tópico automaticamente"},"temp_close":{"title":"Fechar temporariamente"},"auto_close":{"title":"Fechar tópico automaticamente","label":"Fechar tópico automaticamente após:","error":"Digite um valor válido.","based_on_last_post":"Não fechaeaté que a última postagem do tópico tenha pelo menos esta duração."},"auto_close_after_last_post":{"title":"Fechar tópico automaticamente após a última postagem"},"auto_delete":{"title":"Excluir tópico automaticamente"},"auto_bump":{"title":"Promover tópico automaticamente"},"reminder":{"title":"Lembrar"},"auto_delete_replies":{"title":"Excluir respostas automaticamente"},"status_update_notice":{"auto_open":"Este tópico abrirá automaticamente em %{timeLeft}.","auto_close":"Este tópico fechará automaticamente em %{timeLeft}.","auto_publish_to_category":"Este tópico será publicado em \u003ca href=%{categoryUrl}\u003e#%{categoryName}\u003c/a\u003e %{timeLeft}.","auto_close_after_last_post":"Este tópico fechará %{duration} após a última resposta.","auto_delete":"Este tópico será automaticamente excluído em %{timeLeft}.","auto_bump":"Este tópico será automaticamente promovido em %{timeLeft}.","auto_reminder":"Você será lembrado sobre este tópico em %{timeLeft}.","auto_delete_replies":"As respostas deste tópico são excluídas automaticamente após %{duration}."},"auto_close_title":"Configurações de fechamento automático","auto_close_immediate":{"one":"A última postagem no tópico foi feita há %{count} hora, portanto o tópico será fechado imediatamente.","other":"A última postagem no tópico já foi feita há %{count} horas, portanto o tópico será fechado imediatamente."},"auto_close_momentarily":{"one":"A última postagem no tópico foi feita há %{count} hora, portanto o tópico será fechado momentaneamente.","other":"A última postagem no tópico foi feita há %{count} horas, portanto o tópico será fechado momentaneamente."},"timeline":{"back":"Voltar","back_description":"Voltar para a sua última postagem não lida","replies_short":"%{current}/%{total}"},"progress":{"title":"progresso do tópico","go_top":"topo","go_bottom":"último","go":"ir","jump_bottom":"pular para a última postagem","jump_prompt":"pular para...","jump_prompt_of":{"one":"de %{count} postagem","other":"de %{count} postagens"},"jump_prompt_long":"Pular para...","jump_bottom_with_number":"pular para postagem %{post_number}","jump_prompt_to_date":"até agora","jump_prompt_or":"ou","total":"total de postagens","current":"postagem atual"},"notifications":{"title":"altere a frequência de notificações sobre este tópico","reasons":{"mailing_list_mode":"Você está com o modo lista de endereçamento ativado, por isso receberá por e-mail notificações sobre as respostas.","3_10":"Você receberá notificações porque está acompanhando uma etiqueta neste tópico.","3_10_stale":"Você receberá notificações porque estava acompanhando uma etiqueta neste tópico.","3_6":"Você receberá notificações porque você está acompanhando esta categoria.","3_6_stale":"Você receberá notificações porque estava acompanhando esta categoria.","3_5":"Você receberá notificações porque começou a acompanhar este tópico automaticamente.","3_2":"Você receberá notificações porque está acompanhando este tópico.","3_1":"Você receberá notificações porque criou este tópico.","3":"Você receberá notificações porque você está acompanhando este tópico.","2_8":"Você verá uma contagem de respostas novas porque está monitorando esta categoria.","2_8_stale":"Você verá uma contagem de respostas novas porque você estava monitorando esta categoria.","2_4":"Você verá uma contagem de respostas novas porque postou uma resposta a este tópico.","2_2":"Você verá uma contagem de respostas novas porque está monitorando este tópico.","2":"Você verá uma contagem de respostas novas porque \u003ca href=\"%{basePath}/u/%{username}/preferences/notifications\"\u003eleu este tópico\u003c/a\u003e.","1_2":"Você será notificado(a) se alguém mencionar seu @nome ou responder às suas mensagens.","1":"Você será notificado(a) se alguém mencionar seu @nome ou responder às suas mensagens.","0_7":"Você está ignorando todas as notificações nesta categoria.","0_2":"Você está ignorando todas as notificações deste tópico.","0":"Você está ignorando todas as notificações deste tópico."},"watching_pm":{"title":"Acompanhando","description":"Você será notificado(a) sobre cada resposta nova nesta mensagem. Um contador de respostas novas será exibido."},"watching":{"title":"Acompanhando","description":"Você será notificado(a) sobre cada resposta nova neste tópico. Um contador de respostas novas será exibido."},"tracking_pm":{"title":"Monitorando","description":"Um contador de respostas novas será exibido para esta mensagem. Você será notificado(a) se alguém mencionar seu @nome ou responder às suas mensagens."},"tracking":{"title":"Monitorando","description":"Um contador de respostas novas será exibido para este tópico. Você será notificado(a) se alguém mencionar seu @nome ou responder às suas mensagens."},"regular":{"title":"Normal","description":"Você será notificado(a) se alguém mencionar seu @nome ou responder às suas mensagens."},"regular_pm":{"title":"Normal","description":"Você será notificado(a) se alguém mencionar seu @nome ou responder às suas mensagens."},"muted_pm":{"title":"Silenciado(a)","description":"Você nunca receberá nenhuma notificação sobre esta mensagem."},"muted":{"title":"Silenciado(a)","description":"Você nunca receberá nenhuma notificação sobre este tópico, e ele não aparecerá nos mais recentes."}},"actions":{"title":"Ações","recover":"Restaurar tópico","delete":"Excluir tópico","open":"Abrir tópico","close":"Fechar tópico","multi_select":"Selecionar postagens...","timed_update":"Definir timer do tópico...","pin":"Fixar tópico...","unpin":"Desafixar tópico...","unarchive":"Desarquivar tópico","archive":"Arquivar tópico","invisible":"Remover da lista","visible":"Adicionar à lista","reset_read":"Redefinir data de leitura","make_private":"Crie uma mensagem pessoal","reset_bump_date":"Redefinir data de promoção"},"feature":{"pin":"Fixar tópico","unpin":"Desafixar tópico","pin_globally":"Fixar tópico globalmente","make_banner":"Criar tópico de banner","remove_banner":"Remover tópico de banner"},"reply":{"title":"Responder","help":"começar a escrever uma resposta para este tópico"},"share":{"title":"Compartilhar","extended_title":"Compartilhar um link","help":"compartilhar um link deste tópico","instructions":"Compartilhar um link para este tópico:","copied":"Link do tópico copiado.","notify_users":{"title":"Notificar","instructions":"Notificar os(as) usuários(as) a seguir sobre este tópico:","success":{"one":"%{username} foi notificado(a) sobre este tópico.","other":"Todos os(as) usuários(as) foram notificados sobre este tópico."}},"invite_users":"Convite"},"print":{"title":"Imprimir","help":"Abrir uma versão imprimível deste tópico"},"flag_topic":{"title":"Sinalizar","help":"sinalize este tópico de forma privada para chamar atenção ou notificar sobre isto","success_message":"Você sinalizou com êxito este tópico."},"make_public":{"title":"Converter para o tópico público","choose_category":"Escolha uma categoria para o tópico público:"},"feature_topic":{"title":"Destacar este tópico","pin":"Fazer que este tópico apareça no topo da categoria %{categoryLink} até","unpin":"Remover este tópico do inicio da categoria %{categoryLink}.","unpin_until":"Remover este tópico do topo da categoria %{categoryLink} ou esperar até \u003cstrong\u003e%{until}\u003c/strong\u003e.","pin_note":"Usuários(as) podem desafixar o tópico individualmente para si.","pin_validation":"Uma data é necessária para fixar este tópico.","not_pinned":"Não existem tópicos fixados em %{categoryLink}.","already_pinned":{"one":"Tópicos fixados em %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e","other":"Tópicos fixados em %{categoryLink}: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"pin_globally":"Fazer com que este tópico apareça no topo de todas listas de tópicos até","confirm_pin_globally":{"one":"Você já tem %{count} tópico ficado globalmente. Uma grande quantidade de tópicos fixados pode atrapalhar usuários(as) novos(as) e anônimos(as). Tem certeza de que quer fixar outro tópico globalmente?","other":"Você já tem %{count} tópicos ficados globalmente. Uma grande quantidade de tópicos fixados pode atrapalhar usuários(as) novos(as) e anônimos(as). Tem certeza de que quer fixar outro tópico globalmente?"},"unpin_globally":"Remover este tópico do inicio de todas as listas de tópicos.","unpin_globally_until":"Remover este tópico do topo de todas listagens de tópicos ou esperar até \u003cstrong\u003e%{until}\u003c/strong\u003e.","global_pin_note":"Usuários(as) podem desafixar o tópico individualmente para si.","not_pinned_globally":"Não existem tópicos fixados globalmente.","already_pinned_globally":{"one":"Tópicos atuais fixados globalmente: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e.","other":"Tópicos atuais fixados globalmente: \u003cstrong class='badge badge-notification unread'\u003e%{count}\u003c/strong\u003e"},"make_banner":"Tornar este tópico um banner que é exibido no inicio de todas as páginas.","remove_banner":"Remover o banner que é exibido no topo de todas as páginas.","banner_note":"Usuários(as) podem descartar o banner ao fechar. Apenas um tópico pode ser colocado como banner em um momento.","no_banner_exists":"Não existe tópico de banner.","banner_exists":"\u003cstrong class='badge badge-notification unread'\u003eExiste\u003c/strong\u003e um tópico de banner."},"inviting":"Convidando...","automatically_add_to_groups":"Este convite também inclui acesso a estes grupos:","invite_private":{"title":"Convidar para conversa privada","email_or_username":"E-mail ou nome do(a) usuário(a) do(a) convidado(a)","email_or_username_placeholder":"e-mail ou nome do(a) usuário(a)","action":"Convite","success":"Convidamos esse usuário(a) para participar desta mensagem privada.","success_group":"Convidamos esse grupo para participar desta mensagem.","error":"Desculpe, houve um erro ao convidar este(a) usuário(a).","not_allowed":"Desculpe, não é possível convidar este(a) usuário(a).","group_name":"nome do grupo"},"controls":"Controles do tópico","invite_reply":{"title":"Convite","username_placeholder":"nome do(a) usuário(a)","action":"Enviar convite","help":"Convidar outras pessoas para este tópico por e-mail ou notificação","to_forum":"Enviaremos um e-mail breve que permite que seu(sua) amigo(a) ingresse imediatamente ao clicar no link.","discourse_connect_enabled":"Digite o nome do(a) usuário(a) da pessoa que você gostaria de convidar para este tópico.","to_topic_blank":"Digite o nome do(a) usuário(a) ou endereço de e-mail da pessoa que você gostaria de convidar para este tópico.","to_topic_email":"Você digitou um endereço de e-mail. Enviaremos por e-mail um convite que permite que seu(sua) amigo(a) responda imediatamente a este tópico.","to_topic_username":"Você digitou um nome do(a) usuário(a). Enviaremos uma notificação com um link convidando para este tópico.","to_username":"Você digitou o nome do(a) usuário(a) da pessoa que gostaria de convidar. Enviaremos uma notificação com um link convidando para este tópico.","email_placeholder":"nome@exemplo.com","success_email":"Enviamos por e-mail um convite para \u003cb\u003e%{invitee}\u003c/b\u003e. Você será notificado(a) quando o convite for resgatado. Verifique a aba de convites na sua página de usuário(a) para monitorar seus convites.","success_username":"Convidamos o(a) usuário(a) para participar neste tópico.","error":"Desculpe, não foi possível convidar essa pessoa. Talvez já tenha sido convidada. (os convites são limitados)","success_existing_email":"Já existe um(a) usuário(a) com o e-mail \u003cb\u003e%{emailOrUsername}\u003c/b\u003e. Convidamos esse(a) usuário(a) para participar deste tópico."},"login_reply":"Entrar para responder","filters":{"n_posts":{"one":"%{count} mensagem","other":"%{count} mensagens"},"cancel":"Remover filtro"},"move_to":{"title":"Mover para","action":"mover para","error":"Ocorreu um erro ao mover postagens."},"split_topic":{"title":"Mover para novo tópico","action":"mover para novo tópico","topic_name":"Título do novo tópico","radio_label":"Novo tópico","error":"Houve um erro ao mover postagens para o novo tópico.","instructions":{"one":"Você está prestes a criar um novo tópico e preenchê-lo com a postagem selecionada.","other":"Você está prestes a criar um novo tópico e preenchê-lo com as \u003cb\u003e%{count}\u003c/b\u003e postagens selecionadas."}},"merge_topic":{"title":"Mover para tópico existente","action":"mover para tópico existente","error":"Ocorreu um erro ao mover as postagens para esse tópico.","radio_label":"Tópico existente","instructions":{"one":"Selecione o tópico para o qual você gostaria de mover esta postagem.","other":"Selecione o tópico para o qual você gostaria de mover estas \u003cb\u003e%{count}\u003c/b\u003e postagens."}},"move_to_new_message":{"title":"Mover para nova mensagem","action":"mover para nova mensagem","message_title":"Título da nova mensagem","radio_label":"Nova mensagem","participants":"Participantes","instructions":{"one":"Você está prestes a criar uma nova mensagem e preenchê-la com a postagem selecionada.","other":"Você está prestes a criar uma nova mensagem e preenchê-la com as \u003cb\u003e%{count}\u003c/b\u003e postagens selecionadas."}},"move_to_existing_message":{"title":"Mover para mensagem existente","action":"mover para mensagem existente","radio_label":"Mensagem existente","participants":"Participantes","instructions":{"one":"Escolha a mensagem para a qual você gostaria de mover aquela postagem.","other":"Escolha a mensagem para a qual você gostaria de mover aquelas \u003cb\u003e%{count}\u003c/b\u003e postagens."}},"merge_posts":{"title":"Mesclar as postagens selecionadas","action":"mesclar as postagens selecionadas","error":"Houve um erro ao mesclar as postagens selecionadas."},"publish_page":{"title":"Publicação de páginas","publish":"Publicar","description":"Quando um tópico for publicado como uma página, sua URL pode ser compartilhada e será exibida com um estilo personalizado.","slug":"Slug","public":"Público(a)","public_description":"As pessoas podem visualizar a página se o tópico associado for privado.","publish_url":"Sua página foi publicada em:","topic_published":"Seu tópico foi publicado em:","preview_url":"Sua página será publicada em:","invalid_slug":"Desculpe, você não pode publicar esta página.","unpublish":"Cancelar publicação","unpublished":"A publicação da sua página foi cancelada e ela não está mais acessível.","publishing_settings":"Configurações de publicação"},"change_owner":{"title":"Trocar autor(a)","action":"trocar propriedade","error":"Houve um erro ao alterar o(a) autor(a) destas publicações.","placeholder":"nome do(a) usuário(a) do(a) novo(a) proprietário(a)","instructions":{"one":"Escolha um(a) novo(a) proprietário(a) para a postagem de \u003cb\u003e@%{old_user}\u003c/b\u003e","other":"Escolha um(a) novo(a) proprietário(a) para as %{count} postagens de \u003cb\u003e@%{old_user}\u003c/b\u003e"},"instructions_without_old_user":{"one":"Escolha um(a) novo(a) proprietário(a) para a postagem","other":"Escolha um(a) novo(a) proprietário(a) para as %{count} postagens"}},"change_timestamp":{"title":"Alterar carimbo de data/hora...","action":"alterar carimbo de data/hora","invalid_timestamp":"O carimbo de data/hora não pode ser posterior ao atual.","error":"Ocorreu um erro ao alterar o carimbo de data/hora do tópico.","instructions":"Selecione um novo carimbo de data/hora para o tópico. As publicações do tópico serão atualizadas para terem a mesma diferença de tempo."},"multi_select":{"select":"selecionar","selected":"(%{count}) selecionados(as)","select_post":{"label":"selecionar","title":"Adicionar postagem à seleção"},"selected_post":{"label":"selecionado(a)","title":"Clique para remover a postagem da seleção"},"select_replies":{"label":"selecionar +respostas","title":"Adicionar postagem e todas as suas respostas à seleção"},"select_below":{"label":"selecionar +abaixo","title":"Adicionar a postagem e todo o conteúdo abaixo à seleção"},"delete":"Excluir selecionados(as)","cancel":"cancelar seleção","select_all":"selecionar tudo","deselect_all":"cancelar todas as seleções","description":{"one":"\u003cb\u003e%{count}\u003c/b\u003e resposta selecionada.","other":"\u003cb\u003e%{count}\u003c/b\u003e respostas selecionadas."}},"deleted_by_author_simple":"(tópico excluído pelo(a) autor(a))"},"post":{"quote_reply":"Citação","quote_share":"Compartilhar","edit_reason":"Motivo:","post_number":"postagem %{number}","ignored":"Conteúdo ignorado","wiki_last_edited_on":"última edição do wiki em %{dateTime}","last_edited_on":"última edição da postagem em %{dateTime}","reply_as_new_topic":"Responder como um tópico vinculado","reply_as_new_private_message":"Responder como nova mensagem aos mesmos destinatários","continue_discussion":"Continuando a discussão de %{postLink}:","follow_quote":"ir para a resposta citada","show_full":"Exibir postagem completa","show_hidden":"Ver o conteúdo ignorado.","deleted_by_author_simple":"(postagem excluída pelo(a) autor(a))","collapse":"recolher","expand_collapse":"expandir/recolher","locked":"um membro da equipe bloqueou esta publicação para edição","gap":{"one":"ver %{count} resposta oculta","other":"ver %{count} respostas ocultas"},"notice":{"new_user":"Esta é a primeira vez que o %{user} postou. Vamos dar boas-vindas à nossa comunidade","returning_user":"Faz tempo que não vemos %{user}. Sua última postagem foi em %{time}."},"unread":"A postagem não foi lida","has_replies":{"one":"%{count} resposta","other":"%{count} respostas"},"has_replies_count":"%{count}","unknown_user":"(usuário desconhecido/excluído)","has_likes_title":{"one":"%{count} pessoa curtiu esta postagem","other":"%{count} pessoas curtiram esta postagem"},"has_likes_title_only_you":"você curtiu esta postagem","has_likes_title_you":{"one":"você e mais %{count} pessoa curtiram esta postagem","other":"você e mais %{count} outras pessoas curtiram esta postagem"},"filtered_replies_hint":{"one":"Exibir esta postagem e a resposta","other":"Exibir esta postagem e as %{count} respostas"},"filtered_replies_viewing":{"one":"Exibindo %{count} resposta a","other":"Exibindo %{count} respostas a"},"in_reply_to":"Carregar postagem pai","view_all_posts":"visualizar todas as postagens","errors":{"create":"Desculpe, houve um erro ao criar sua postagem. Tente outra vez.","edit":"Desculpe, houve um erro ao editar sua postagem. Tente outra vez.","upload":"Desculpe, houve um erro ao enviar o arquivo. Tente outra vez.","file_too_large":"Desculpe, este arquivo é muito grande (o tamanho máximo é de %{max_size_kb} KB). Que tal enviar o arquivo grande para um serviço de nuvem e compartilhar o link?","too_many_uploads":"Desculpe, você pode enviar apenas um arquivo por vez.","too_many_dragged_and_dropped_files":{"one":"Desculpe, é possível carregar apenas %{count} arquivo por vez.","other":"Desculpe, é possível carregar apenas %{count} arquivos por vez."},"upload_not_authorized":"Desculpe, o arquivo que você está tentando enviar não é permitido (extensões permitidas: %{authorized_extensions}).","image_upload_not_allowed_for_new_user":"Desculpe, usuários(as) novos(as) não podem enviar imagens.","attachment_upload_not_allowed_for_new_user":"Desculpe, usuários(as) novos(as) não podem enviar anexos.","attachment_download_requires_login":"Desculpe, você precisa entrar para baixar arquivos anexos."},"cancel_composer":{"confirm":"O que gostaria de fazer com sua postagem?","discard":"Descartar","save_draft":"Salvar rascunho para mais tarde","keep_editing":"Continuar editando"},"via_email":"postagem recebida via e-mail","via_auto_generated_email":"esta mensagem chegou por um e-mail gerado automaticamente","whisper":"esta mensagem é um sussuro privado para a moderação","wiki":{"about":"esta postagem é uma wiki"},"few_likes_left":"Obrigado por compartilhar o amor! Restam apenas algumas curtidas sobrando para você usar hoje.","controls":{"reply":"começar a escrever uma resposta para esta postagem","like":"curtir esta postagem","has_liked":"você curtiu esta postagem","read_indicator":"membros que leram esta postagem","undo_like":"desfazer curtida","edit":"editar esta postagem","edit_action":"Editar","edit_anonymous":"Você precisa estar conectado(a) para editar esta postagem.","flag":"sinalize esta postagem de forma privada para chamar atenção ou notificar sobre isto","delete":"excluir esta postagem","undelete":"recuperar esta postagem","share":"compartilhar o link desta postagem","more":"Mais","delete_replies":{"confirm":"Você também deseja excluir as respostas desta postagem?","direct_replies":{"one":"Sim e %{count} resposta direta","other":"Sim e %{count} respostas diretas"},"all_replies":{"one":"Sim, e %{count} resposta","other":"Sim, e todas as %{count} respostas"},"just_the_post":"Não, apenas esta postagem"},"admin":"ações administrativas da postagem","wiki":"Tornar Wiki","unwiki":"Remover Wiki","convert_to_moderator":"Adicionar cor da equipe","revert_to_regular":"Remover cor da equipe","rebake":"Reconstruir HTML","publish_page":"Publicação de página","unhide":"Revelar","lock_post":"Bloquear postagem","lock_post_description":"impedir que o(a) autor(a) edite esta postagem","unlock_post":"Desbloquear postagem","unlock_post_description":"permitir que o(a) autor(a) edite esta postagem","delete_topic_disallowed_modal":"Você não tem permissão para apagar este tópico. Se realmente quiser que seja excluído, envie um sinalizador para alertar a moderação, além dos argumentos.","delete_topic_disallowed":"você não tem permissão para excluir este tópico","delete_topic_confirm_modal":{"one":"Atualmente este tópico tem mais de %{count} visualização e pode ser um destino de busca muito acessado. Tem certeza de que deseja excluir todo o tópico em vez de editar para melhorá-lo?","other":"Atualmente este tópico tem mais de %{count} visualizações e pode ser um destino de busca muito acessado. Tem certeza de que deseja excluir todo o tópico em vez de editar para melhorá-lo?"},"delete_topic_confirm_modal_yes":"Sim, excluir este tópico","delete_topic_confirm_modal_no":"Não, manter este tópico","delete_topic_error":"Ocorreu um erro ao excluir este tópico","delete_topic":"excluir tópico","delete_post_notice":"Excluir aviso da equipe","remove_timer":"remover timer","edit_timer":"editar timer"},"actions":{"people":{"like":{"one":"curtiu isto","other":"curtiram isto"},"read":{"one":"leu isto","other":"Leram isto"},"like_capped":{"one":"e %{count} outro(a) curtiu","other":"e %{count} outros(as) curtiram"},"read_capped":{"one":"e %{count} outro(a) leu isto","other":"e %{count} outros(as) leram isto"}},"by_you":{"off_topic":"Você sinalizou isto como desvio de tópico","spam":"Você sinalizou isto como spam","inappropriate":"Você sinalizou isto como inapropriado","notify_moderators":"Você sinalizou isto para a moderação","notify_user":"Você enviou uma mensagem particular para este(a) usuário(a)"}},"delete":{"confirm":{"one":"Tem certeza de que deseja excluir esta postagem?","other":"Tem certeza de que deseja excluir estas %{count} postagens?"}},"merge":{"confirm":{"one":"Tem certeza de que deseja mesclar estas postagens?","other":"Tem certeza de que deseja mesclar estas %{count} postagens?"}},"revisions":{"controls":{"first":"Primeira revisão","previous":"Revisão anterior","next":"Próxima revisão","last":"Última revisão","hide":"Ocultar revisão","show":"Exibir revisão","revert":"Reverter para a revisão %{revision}","edit_wiki":"Editar wiki","edit_post":"Editar postagem","comparing_previous_to_current_out_of_total":"\u003cstrong\u003e%{previous}\u003c/strong\u003e %{icon} \u003cstrong\u003e%{current}\u003c/strong\u003e/%{total}"},"displays":{"inline":{"title":"Exibir a saída renderizada com adições e remoções em linha","button":"HTML"},"side_by_side":{"title":"Exibir diferenças de saídas renderizadas lado a lado","button":"HTML"},"side_by_side_markdown":{"title":"Exibir diferenças de fontes não processadas lado a lado","button":"Não processado"}}},"raw_email":{"displays":{"raw":{"title":"Exibir e-mail não processado","button":"Não processado"},"text_part":{"title":"Exibir parte do texto do e-mail","button":"Texto"},"html_part":{"title":"Exibir parte em html do e-mail","button":"HTML"}}},"bookmarks":{"create":"Criar favorito","edit":"Editar favorito","created":"Criado","updated":"Atualizado","name":"Nome","name_placeholder":"Para que serve este favorito?","set_reminder":"Lembrar","options":"Opções","actions":{"delete_bookmark":{"name":"Excluir favorito","description":"Remove o favorito do seu perfil e interrompe todos os lembretes do favorito"},"edit_bookmark":{"name":"Editar favorito","description":"Editar o nome do favorito ou alterar a data e hora do lembrete"},"pin_bookmark":{"name":"Fixar favoritos","description":"Fixe o favorito. Isso fará que seja exibido no topo da sua lista de favoritos."},"unpin_bookmark":{"name":"Desafixar favoritos","description":"Desafixe o favorito. Ele não será mais exibido no topo da sua lista de favoritos."}}},"filtered_replies":{"viewing_posts_by":"Vendo %{post_count} postagens de","viewing_subset":"Algumas respostas foram recolhidas","viewing_summary":"visualizando um resumo deste tópico","post_number":"%{username}, postagem #%{post_number}","show_all":"Exibir tudo"}},"category":{"none":"(sem categoria)","all":"Todas as categorias","choose":"categoria\u0026hellip;","edit":"Editar","edit_dialog_title":"Editar: %{categoryName}","view":"Visualizar tópicos na categoria","back":"Voltar para a categoria","general":"Geral","settings":"Configurações","topic_template":"Modelo de tópico","tags":"Etiquetas","tags_allowed_tags":"Restringir estas etiquetas a esta categoria:","tags_allowed_tag_groups":"Restringir estes grupos de etiquetas a esta categoria:","tags_placeholder":"(Opcional) lista de etiquetas permitidas","tags_tab_description":"As etiquetas e grupos de etiquetas especificadas acima estarão disponíveis apenas nesta categoria e nas outras categorias que também as especificarem, sendo que não estarão disponíveis para uso em outras categorias.","tag_groups_placeholder":"(Opcional) lista de grupos de etiquetas permitidos","manage_tag_groups_link":"Gerenciar grupos de etiquetas","allow_global_tags_label":"Permitir também outras etiquetas","tag_group_selector_placeholder":"(Opcional) grupo de etiquetas","required_tag_group_description":"Exigir que novos tópicos tenham etiquetas de um grupo de etiquetas:","min_tags_from_required_group_label":"Número de etiquetas:","required_tag_group_label":"Grupo de etiquetas:","topic_featured_link_allowed":"Permitir links em destaque nesta categoria","delete":"Excluir categoria","create":"Nova categoria","create_long":"Criar uma nova categoria","save":"Salvar categoria","slug":"Slug da categoria","slug_placeholder":"(Opcional) palavras hifenizadas para url","creation_error":"Houve um erro durante a criação da categoria.","save_error":"Houve um erro ao salvar a categoria.","name":"Nome da categoria","description":"Descrição","logo":"Imagem do logotipo da categoria","background_image":"Imagem de fundo da categoria","badge_colors":"Cores do emblema","background_color":"Cor de fundo","foreground_color":"Cor de primeiro plano","name_placeholder":"máximo de uma ou duas palavras","color_placeholder":"Qualquer cor da web","delete_confirm":"Tem certeza que quer excluir esta categoria?","delete_error":"Houve um erro ao excluir a categoria.","list":"Categorias da lista","no_description":"Adicione uma descrição para esta categoria.","change_in_category_topic":"Editar descrição","already_used":"Esta cor já foi usada para outra categoria","security":"Segurança","security_add_group":"Adicionar a um grupo","permissions":{"group":"Grupo","see":"Ver","reply":"Responder","create":"Criar","no_groups_selected":"Nenhum grupo recebeu acesso, esta categoria será visível apenas para a equipe.","everyone_has_access":"Esta categoria é pública, todos(as) podem ver, responder e criar postagens. Para restringir permissões, remova uma ou mais permissões concedidas para o grupo \"todos(as)\".","toggle_reply":"Alternar permissão de resposta","toggle_full":"Alternar criação de permissão","inherited":"Esta permissão é herdada de \"todos(as)\""},"special_warning":"Atenção: esta categoria é uma categoria pré-propagada, e as configurações de segurança não podem ser editadas. Se você não quer usar esta categoria, exclua em vez de reaproveitar.","uncategorized_security_warning":"Esta categoria é especial. É destinada para tópicos que não têm categoria e não pode ter configurações de segurança.","uncategorized_general_warning":"Esta categoria é especial. Ela é usada como a categoria padrão para novos tópicos que não têm uma categoria selecionada. Se quiser evitar este comportamento e forçar a seleção da categoria, \u003ca href=\"%{settingLink}\"\u003edesative a configuração aqui\u003c/a\u003e. Se você quiser alterar o nome ou a descrição, vá para \u003ca href=\"%{customizeLink}\"\u003ePersonalização/Conteúdo de texto\u003c/a\u003e.","pending_permission_change_alert":"Você não adicionou %{group} a esta categoria. Clique neste botão para adicionar.","images":"Imagens","email_in":"Endereço de e-mail de entrada personalizado:","email_in_allow_strangers":"Aceitar e-mails de usuários anônimos sem contas","email_in_disabled":"Postar novos tópicos via e-mail está desativado nas configurações do site. Para ativar respostas em novos tópicos via e-mail, ","email_in_disabled_click":"ative a configuração de \"e-mail em\".","mailinglist_mirror":"A categoria espelha uma lista de endereçamento","show_subcategory_list":"Exibir lista de subcategorias acima dos tópicos nesta categoria.","read_only_banner":"Texto do banner quando um usuário não pode criar um tópico nesta categoria:","num_featured_topics":"Quantidade de tópicos exibidos na página de categorias:","subcategory_num_featured_topics":"Quantidade de tópicos em destaque na página da categoria pai:","all_topics_wiki":"Criar novos tópicos wikis por padrão","allow_unlimited_owner_edits_on_first_post":"Permitir edições ilimitadas na primeira postagem","subcategory_list_style":"Estilo da lista de subcategorias","sort_order":"Classificar lista de tópicos por:","default_view":"Lista de tópicos padrão:","default_top_period":"Período superior padrão:","default_list_filter":"Filtro de lista padrão:","allow_badges_label":"Permitir a concessão de emblemas nesta categoria","edit_permissions":"Editar permissões","reviewable_by_group":"Além da equipe, o conteúdo desta categoria também pode ser revisado por:","review_group_name":"nome do grupo","require_topic_approval":"Requer aprovação dos moderadores(as) de todos os novos tópicos","require_reply_approval":"Requer aprovação dos moderadores(as) de todas as novas respostas","this_year":"este ano","position":"Posição na página de categorias:","default_position":"Posição padrão","position_disabled":"Categorias serão exibidas em ordem de atividade. Para controlar a ordem das categorias nas listas,","position_disabled_click":"ative a configuração \"posições de categoria fixas\".","minimum_required_tags":"Número mínimo de etiquetas exigidas em um tópico:","default_slow_mode":"Ative o \"Modo lento\" para obter novos tópicos nesta categoria.","parent":"Categoria principal","num_auto_bump_daily":"Número de tópicos em aberto para promover automaticamente:","navigate_to_first_post_after_read":"Navegue até a primeira postagem depois que os tópicos forem lidos","notifications":{"watching":{"title":"Acompanhando","description":"Você acompanhará automaticamente todos os tópicos nesta categoria. Você será notificado(a) de todas as novas postagens em todos os tópicos. Além disso, uma contagem de novas respostas será exibida."},"watching_first_post":{"title":"Acompanhando a primeira postagem","description":"Você será notificado(a) sobre novos tópicos nesta categoria, mas não sobre respostas dos tópicos."},"tracking":{"title":"Monitorando","description":"Você vai monitorar automaticamente todos os tópicos nesta categoria. Você será notificado(a) se alguém mencionar o seu @nome ou responder para você. Além disso, uma contagem de novas respostas será exibida."},"regular":{"title":"Normal","description":"Você será notificado(a) se alguém mencionar o seu @nome ou responder às suas mensagens."},"muted":{"title":"Silenciado(a)","description":"Você nunca será notificado(a) sobre novos tópicos nesta categoria e eles não aparecerão nos mais recentes."}},"search_priority":{"label":"Prioridade de pesquisa","options":{"normal":"Normal","ignore":"Ignorar","very_low":"Muito baixa","low":"Baixa","high":"Alta","very_high":"Muito alta"}},"sort_options":{"default":"padrão","likes":"Curtidas","op_likes":"Curtidas da publicação original","views":"Visualizações","posts":"Postagens","activity":"Atividade","posters":"Autores","category":"Categoria","created":"Criado"},"sort_ascending":"Ordem crescente","sort_descending":"Ordem decrescente","subcategory_list_styles":{"rows":"Linhas","rows_with_featured_topics":"Linhas com tópicos em destaque","boxes":"Caixas de seleção","boxes_with_featured_topics":"Caixas de seleção com tópicos em destaque"},"settings_sections":{"general":"Geral","moderation":"Moderação","appearance":"Aparência","email":"E-mail"},"list_filters":{"all":"todos os tópicos","none":"nenhuma subcategoria"},"colors_disabled":"Não é possível selecionar cores porque você tem um, ou não tem nenhum, estilo de categoria."},"flagging":{"title":"Obrigado por ajudar a tornar a nossa comunidade um ambiente saudável!","action":"Sinalizar resposta","take_action":"Tomar medida...","take_action_options":{"default":{"title":"Tomar medida","details":"Atingir o limite de denuncias imediatamente em vez de esperar por mais denuncias da comunidade"},"suspend":{"title":"Suspender usuário(a)","details":"Alcance o limite de sinalizadores e suspenda o(a) usuário(a)"},"silence":{"title":"Silenciar usuário(a)","details":"Alcance o limite de sinalizadores e silencie o(a) usuário(a)"}},"notify_action":"Mensagem","official_warning":"Aviso oficial","delete_spammer":"Excluir remetente de spam","flag_for_review":"Fila para revisão","yes_delete_spammer":"Sim, excluir remetente de spam","ip_address_missing":"(N/D)","hidden_email_address":"(oculto)","submit_tooltip":"Enviar um sinalizador privado","take_action_tooltip":"Atingir o limite de denuncias imediatamente em vez de esperar por mais denuncias da comunidade","cant":"Desculpe, não é possível colocar um sinalizador neste momento.","notify_staff":"Avisar a equipe de forma privada","formatted_name":{"off_topic":"É um desvio de tópico","inappropriate":"Isto não é apropriado","spam":"É spam"},"custom_placeholder_notify_user":"Seja objetivo(a), positivo(a) e sempre gentil.","custom_placeholder_notify_moderators":"Diga-nos o motivo da sua preocupação e envie links e eventos relevantes sempre que for possível.","custom_message":{"at_least":{"one":"insira pelo menos %{count} carácter","other":"insira pelo menos %{count} caracteres"},"more":{"one":"Falta apenas %{count}...","other":"Faltam %{count}..."},"left":{"one":"%{count} restante","other":"%{count} restantes"}}},"flagging_topic":{"title":"Obrigado por ajudar a tornar a nossa comunidade um ambiente saudável!","action":"Sinalizar tópico","notify_action":"Mensagem"},"topic_map":{"title":"Resumo do tópico","participants_title":"Autores frequentes","links_title":"Links mais acessados","links_shown":"exibir mais links...","clicks":{"one":"%{count} clique","other":"%{count} cliques"}},"post_links":{"about":"expandir mais links para esta mensagem","title":{"one":"mais %{count}","other":"mais %{count}"}},"topic_statuses":{"warning":{"help":"Este é um aviso oficial."},"bookmarked":{"help":"Você adicionou este tópico aos favoritos"},"locked":{"help":"Este tópico está fechado. Não serão aceitas respostas novas"},"archived":{"help":"Este tópico foi arquivado. Está congelado e não pode ser alterado"},"locked_and_archived":{"help":"Este tópico está fechado e foi arquivado. Não é permitido enviar respostas nem alterar."},"unpinned":{"title":"Desafixado","help":"Este tópico foi desfixado para você. Será mostrado em ordem normal"},"pinned_globally":{"title":"Fixado globalmente","help":"Este tópico está fixado globalmente. Será exibido no topo da aba dos mais recentes e da sua categoria"},"pinned":{"title":"Fixado","help":"Este tópico está fixado para você. Será exibido no topo de sua categoria"},"unlisted":{"help":"Este tópico não está listado. Não será exibido nas listas de tópicos e só poderá ser acessado por meio de um link direto"},"personal_message":{"title":"Este tópico é uma mensagem pessoal","help":"Este tópico é uma mensagem pessoal"}},"posts":"Postagens","original_post":"Postagem original","views":"Visualizações","views_lowercase":{"one":"visualização","other":"visualizações"},"replies":"Respostas","views_long":{"one":"este tópico foi visto %{count} vez","other":"este tópico foi visto %{number} vezes"},"activity":"Atividade","likes":"Curtidas","likes_lowercase":{"one":"curtida","other":"curtidas"},"users":"Usuários(as)","users_lowercase":{"one":"usuário(a)","other":"usuários(as)"},"category_title":"Categoria","history":"Histórico, últimas 100 revisões","changed_by":"de %{author}","raw_email":{"title":"E-mails recebidos","not_available":"Não disponível!"},"categories_list":"Lista de categorias","filters":{"with_topics":"%{filter} tópicos","with_category":"%{filter} %{category} tópicos","latest":{"title":"Recentes","title_with_count":{"one":"Recente (%{count})","other":"Recentes (%{count})"},"help":"tópicos com postagens recentes"},"read":{"title":"Lidos","help":"tópicos que você leu em ordem de leitura a partir do mais recente"},"categories":{"title":"Categorias","title_in":"Categoria - %{categoryName}","help":"todos os tópicos agrupados por categoria"},"unread":{"title":"Não lidos","title_with_count":{"one":"Não lido (%{count})","other":"Não lidos (%{count})"},"help":"tópicos que você está acompanhando ou monitorando com postagens não lidas","lower_title_with_count":{"one":"%{count} não lido","other":"%{count} não lidos"}},"new":{"lower_title_with_count":{"one":"%{count} nova","other":"%{count} novas"},"lower_title":"nova","title":"Novo","title_with_count":{"one":"Novo (%{count})","other":"Novos (%{count})"},"help":"tópicos criados nos últimos dias"},"posted":{"title":"Minhas postagens","help":"tópicos nos quais você postou"},"bookmarks":{"title":"Favoritos","help":"tópicos que você adicionou aos favoritos"},"category":{"title":"%{categoryName}","title_with_count":{"one":"%{categoryName} (%{count})","other":"%{categoryName} (%{count})"},"help":"tópicos recentes na categoria %{categoryName}"},"top":{"title":"Melhores","help":"os tópicos mais ativos no último ano, mês, semana ou dia","all":{"title":"Desde o início"},"yearly":{"title":"Todo ano"},"quarterly":{"title":"Todo semestre"},"monthly":{"title":"Todo mês"},"weekly":{"title":"A cada semana"},"daily":{"title":"A cada dia"},"all_time":"Desde o início","this_year":"Ano","this_quarter":"Trimestre","this_month":"Mês","this_week":"Semana","today":"Hoje","other_periods":"ver melhores:"}},"browser_update":"Infelizmente, \u003ca href=\"https://www.discourse.org/faq/#browser\"\u003eseu navegador é muito antigo para funcionar neste site\u003c/a\u003e. \u003ca href=\"https://browsehappy.com\"\u003eAtualize seu navegador\u003c/a\u003e para visualizar um conteúdo interessante, entrar com a conta e responder.","permission_types":{"full":"Criar/Responder/Ver","create_post":"Responder/Ver","readonly":"Ver"},"lightbox":{"download":"download","previous":"Anterior (seta para a esquerda)","next":"Próximo (seta para a direita)","counter":"%curr% de %total%","close":"Fechar (Esc)","content_load_error":"\u003ca href=\"%url%\"\u003eO conteúdo\u003c/a\u003e não pôde ser carregado.","image_load_error":"\u003ca href=\"%url%\"\u003eA imagem\u003c/a\u003e não pôde ser carregada."},"cannot_render_video":"Este vídeo não pode ser renderizado porque o seu navegador não é compatível com o codec.","keyboard_shortcuts_help":{"shortcut_key_delimiter_comma":",","shortcut_key_delimiter_plus":"+","shortcut_delimiter_or":"%{shortcut1} ou %{shortcut2}","shortcut_delimiter_slash":"%{shortcut1}/%{shortcut2}","shortcut_delimiter_space":"%{shortcut1} %{shortcut2}","title":"Atalhos do teclado","jump_to":{"title":"Pular para","home":"%{shortcut} Início","latest":"%{shortcut} Mais recentes","new":"%{shortcut} Novos","unread":"%{shortcut} Não lidos","categories":"%{shortcut} Categorias","top":"%{shortcut} Melhores","bookmarks":"%{shortcut} Favoritos","profile":"%{shortcut} Perfil","messages":"%{shortcut} Mensagens","drafts":"%{shortcut} Rascunhos","next":"%{shortcut} próximo tópico","previous":"%{shortcut} tópico anterior"},"navigation":{"title":"Navegação","jump":"%{shortcut} Ir para a postagem #","back":"%{shortcut} Voltar","up_down":"%{shortcut} Move seleção \u0026uarr; \u0026darr;","open":"%{shortcut} Abrir tópico selecionado","next_prev":"%{shortcut} Pŕoxima seção/seção anterior","go_to_unread_post":"%{shortcut} Ir para a primeira postagem não lida"},"application":{"title":"Solicitação","create":"%{shortcut} Criar um tópico novo","notifications":"%{shortcut} Abrir notificações","hamburger_menu":"%{shortcut} Abrir menu de hambúrguer","user_profile_menu":"%{shortcut} Abrir menu do usuário","show_incoming_updated_topics":"%{shortcut} Exibir tópicos atualizados","search":"%{shortcut} Procurar","help":"%{shortcut} Abrir ajuda de teclado","dismiss_new":"%{shortcut} descartar novos(as)","dismiss_topics":"%{shortcut} Descartar tópicos","log_out":"%{shortcut} Sair"},"composing":{"title":"Criação","return":"%{shortcut} Retornar ao compositor","fullscreen":"%{shortcut} Compositor em tela cheia"},"bookmarks":{"title":"Favoritos","enter":"%{shortcut} Salvar e fechar","later_today":"%{shortcut} Mais tarde hoje","later_this_week":"%{shortcut} No final desta semana","tomorrow":"%{shortcut} Amanhã","next_week":"%{shortcut} Próxima semana","next_month":"%{shortcut} Próximo mês","next_business_week":"%{shortcut} Início da próxima semana","next_business_day":"%{shortcut} Próximo dia útil","custom":"%{shortcut} Data e hora personalizadas","none":"%{shortcut} Sem lembrete","delete":"%{shortcut} Excluir favorito"},"actions":{"title":"Ações","bookmark_topic":"%{shortcut} Adicionar/remover tópico dos favoritos ","pin_unpin_topic":"%{shortcut} Fixar/desafixar tópico","share_topic":"%{shortcut} Compartilhar tópico","share_post":"%{shortcut} Compartilhar postagem","reply_as_new_topic":"%{shortcut} Responder como tópico vinculado","reply_topic":"%{shortcut} Responder ao tópico","reply_post":"%{shortcut} Responder à postagem","quote_post":"%{shortcut} Citar postagem","like":"%{shortcut} Curtir a postagem","flag":"%{shortcut} Sinalizar postagem","bookmark":"%{shortcut} Adicionar postagem aos favoritos","edit":"%{shortcut} Editar postagem","delete":"%{shortcut} Excluir postagem","mark_muted":"%{shortcut} Silenciar tópico","mark_regular":"%{shortcut} Tópico regular (padrão)","mark_tracking":"%{shortcut} Monitorar tópico","mark_watching":"%{shortcut} Acompanhar tópico","print":"%{shortcut} Imprimir tópico","defer":"%{shortcut} Adiar tópico","topic_admin_actions":"%{shortcut} Abrir ações de administração de tópico"},"search_menu":{"title":"Menu de pesquisa","prev_next":"%{shortcut} Mover seleção para cima e para baixo","insert_url":"%{shortcut} Inserir seleção no compositor aberto"}},"badges":{"earned_n_times":{"one":"Emblema obtido %{count} vez","other":"Emblema obtido %{count} vezes"},"granted_on":"Concedido em %{date}","others_count":"Outros(as) com este emblema (%{count})","title":"Emblemas","allow_title":"Você pode usar este emblema como um título","multiple_grant":"Você pode ganhar isto várias vezes","badge_count":{"one":"%{count} Emblema","other":"%{count} Emblemas"},"more_badges":{"one":"Mais %{count}","other":"Mais %{count}"},"granted":{"one":"%{count} concedido","other":"%{count} concedidos"},"select_badge_for_title":"Selecione um emblema para usar como o seu título","none":"(nenhum)","successfully_granted":"%{badge} concedido com êxito para %{username}","badge_grouping":{"getting_started":{"name":"Primeiros passos"},"community":{"name":"Comunidade"},"trust_level":{"name":"Nível de confiança"},"other":{"name":"Outros(as)"},"posting":{"name":"Publicando"}},"favorite_max_reached":"Não é possível adicionar mais emblemas aos favoritos.","favorite_max_not_reached":"Marcar este emblema com o favorito","favorite_count":"%{count}/%{max} emblemas marcados como favoritos"},"tagging":{"all_tags":"Todas as etiquetas","other_tags":"Outras etiquetas","selector_all_tags":"todas as etiquetas","selector_no_tags":"sem etiquetas","changed":"etiquetas alteradas:","tags":"Etiquetas","choose_for_topic":"etiquetas opcionais","info":"Informações","default_info":"Esta etiqueta não é restrita a nenhuma categoria nem tem sinônimos. Para adicionar restrições, coloque esta etiqueta em um a \u003ca href=%{basePath}/tag_groups\u003egrupo de etiquetas\u003c/a\u003e.","category_restricted":"Essa tag é restrita a categorias que você não tem permissão para acessar.","synonyms":"Sinônimos","synonyms_description":"Quando as seguintes etiquetas forem usadas, serão substituídas por \u003cb\u003e%{base_tag_name}\u003c/b\u003e.","tag_groups_info":{"one":"Esta etiqueta pertence ao grupo: %{tag_groups}.","other":"Esta etiqueta pertence aos grupos: %{tag_groups}."},"category_restrictions":{"one":"Pode ser usada apenas nesta categoria:","other":"Pode ser usada apenas nestas categorias:"},"edit_synonyms":"Gerenciar sinônimos","add_synonyms_label":"Adicionar sinônimos:","add_synonyms":"Adicionar","add_synonyms_explanation":{"one":"Qualquer local que atualmente use essa tag será alterado para usar \u003cb\u003e%{tag_name}\u003c/b\u003e . Tem certeza de que deseja fazer essa alteração?","other":"Locais que usam estas etiquetas serão alterados para \u003cb\u003e%{tag_name}\u003c/b\u003e. Tem certeza de que deseja fazer essa alteração?"},"add_synonyms_failed":"As etiquetas a seguir não podem ser adicionadas como sinônimos: \u003cb\u003e%{tag_names}\u003c/b\u003e. Verifique se elas não têm sinônimos nem sejam sinônimos de outras etiquetas.","remove_synonym":"Remover sinônimo","delete_synonym_confirm":"Você tem certeza que deseja excluir o sinônimo \"%{tag_name}\"?","delete_tag":"Excluir etiqueta","delete_confirm":{"one":"Tem certeza de que deseja excluir esta etiqueta e removê-la de %{count} tópico para o qual ela está atribuída?","other":"Tem certeza de que deseja excluir esta etiqueta e removê-la dos %{count} tópicos aos quais ela está atribuída?"},"delete_confirm_no_topics":"Tem certeza de que deseja excluir esta etiqueta?","delete_confirm_synonyms":{"one":"Seu sinônimo também será excluído.","other":"Seus %{count} sinônimos também serão excluídos."},"rename_tag":"Renomear marcador","rename_instructions":"Escolha um novo nome para a etiqueta:","sort_by":"Ordenar por","sort_by_count":"quantidade","sort_by_name":"nome","manage_groups":"Gerenciar grupos de etiquetas","manage_groups_description":"Definir grupos para organizar etiquetas","upload":"Enviar etiquetas","upload_description":"Enviar um arquivo csv para criar etiquetas em massa","upload_instructions":"Uma por linha, opcionalmente com um grupo de etiquetas no formato \"nome_etiqueta,grupo_etiqueta\".","upload_successful":"Etiquetas enviadas com êxito","delete_unused_confirmation":{"one":"%{count} etiqueta será excluída: %{tags}","other":"%{count} etiquetas serão excluídas: %{tags}"},"delete_unused_confirmation_more_tags":{"one":"%{tags} e mais %{count}","other":"%{tags} e mais %{count}"},"delete_no_unused_tags":"Não há etiquetas não usadas.","tag_list_joiner":", ","delete_unused":"Excluir etiquetas não usadas","delete_unused_description":"Excluir todas as etiquetas que não foram anexadas a nenhum tópico ou mensagens pessoais","cancel_delete_unused":"Cancelar","filters":{"without_category":"%{filter} %{tag} tópicos","with_category":"%{filter} %{tag} tópicos em %{category}","untagged_without_category":"%{filter} tópicos não etiquetados","untagged_with_category":"%{filter} tópicos não etiquetados em %{category}"},"notifications":{"watching":{"title":"Acompanhando","description":"Você acompanhará automaticamente todos os tópicos com esta etiqueta e será notificado(a) sobre todas as novas postagens e tópicos. Além disso, a contagem das postagens novas e não lidas também será exibida ao lado do tópico."},"watching_first_post":{"title":"Acompanhando a primeira postagem","description":"Você será notificado(a) sobre novos tópicos com esta etiqueta, mas não sobre as respostas dos tópicos."},"tracking":{"title":"Monitorando","description":"Você irá monitorar automaticamente todos os tópicos com esta etiqueta. Uma contagem de postagens novas e não lidas será exibida ao lado do tópico."},"regular":{"title":"Normal","description":"Você será notificado(a) se alguém mencionar o seu @nome ou responder à sua postagem."},"muted":{"title":"Silenciado(a)","description":"Você não receberá nenhuma notificação sobre novos tópicos com esta etiqueta, e eles não serão exibidos na aba de não lidos."}},"groups":{"title":"Grupos de etiquetas","about_heading":"Selecione um grupo de etiquetas ou crie uma nova","about_heading_empty":"Crie um novo grupo de etiquetas para começar","about_description":"Grupos de etiquetas ajudam a gerenciar permissões de várias etiquetas em um lugar.","new":"Novo grupo","new_title":"Criar novo grupo","edit_title":"Editar grupo de etiquetas","tags_label":"Etiquetas neste grupo","parent_tag_label":"Etiqueta pai","parent_tag_description":"As etiquetas deste grupo podem ser usadas apenas se a etiqueta pai estiver presente.","one_per_topic_label":"Limite de uma etiqueta por tópico deste grupo","new_name":"Novo grupo de etiquetas","name_placeholder":"Nome","save":"Salvar","delete":"Excluir","confirm_delete":"Tem certeza de que deseja excluir este grupo de etiquetas?","everyone_can_use":"Etiquetas podem ser usadas por todos(as)","usable_only_by_groups":"Etiquetas são visíveis para todos(as), mas somente os seguintes grupos podem usá-las","visible_only_to_groups":"As etiquetas são visíveis somente para os seguintes grupos","cannot_save":"Não é possível salvar grupo de etiquetas. Verifique se há pelo menos uma etiqueta presente, o nome do grupo de etiquetas não está vazio e um grupo foi selecionado para permissão de etiquetas.","tags_placeholder":"Pesquisar ou criar etiquetas","parent_tag_placeholder":"Opcional","select_groups_placeholder":"Selecionar grupos...","disabled":"A marcação com etiqueta está desativada. "},"topics":{"none":{"unread":"Você não tem tópicos não lidos.","new":"Você não tem tópicos novos.","read":"Você ainda não leu nenhum tópico.","posted":"Você ainda não postou em nenhum tópico.","latest":"Não há tópicos mais recentes.","bookmarks":"Você ainda não adicionou tópicos aos favoritos.","top":"Não há tópicos principais."}}},"invite":{"custom_message":"Torne o seu convite um pouco mais pessoal escrevendo uma \u003ca href\u003emensagem personalizada\u003c/a\u003e.","custom_message_placeholder":"Digite a sua mensagem personalizada","approval_not_required":"O(a) usuário(a) será aprovado(a) automaticamente assim que aceitar este convite.","custom_message_template_forum":"Ei, você tem que entrar neste fórum!","custom_message_template_topic":"Ei, acho que você vai gostar deste tópico!"},"forced_anonymous":"Devido à quantidade de acessos, o conteúdo está sendo exibido temporariamente para todos(as) como se fossem um(a) usuário(a) que não entrou com a conta.","forced_anonymous_login_required":"O site está congestionado e não pode ser carregado neste momento, tente novamente em alguns minutos.","footer_nav":{"back":"Voltar","forward":"Avançar","share":"Compartilhar","dismiss":"Descartar"},"safe_mode":{"enabled":"O modo seguro está ativado. Para sair do modo seguro, feche a janela do navegador"},"image_removed":"(imagem removida)","do_not_disturb":{"title":"Não perturbe por...","label":"Não perturbe","remaining":"%{remaining} restante(s)","options":{"half_hour":"30 minutos","one_hour":"1 hora","two_hours":"2 horas","tomorrow":"Até amanhã","custom":"Personalizado(a)"},"set_schedule":"Definir agendamento de notificação"},"trust_levels":{"names":{"newuser":"usuário(a) novo(a)","basic":"usuário(a) básico(a)","member":"membro","regular":"regular","leader":"líder"},"detailed_name":"%{level}: %{name}"},"pick_files_button":{"unsupported_file_picked":"Você escolheu um arquivo incompatível. Tipos de arquivos compatíveis: %{types}."},"admin":{"site_settings":{"categories":{"chat_integration":"Integrações de bate-papo"}}},"chat_integration":{"menu_title":"Integrações de bate-papo","settings":"Configurações","no_providers":"Você precisa habilitar alguns provedores nas configurações do plugin","channels_with_errors":"Alguns canais deste provedor falharam na última vez em que as mensagens foram enviadas. Clique no(s) ícone(s) de erro para saber mais.","channel_exception":"Um erro desconhecido ocorreu na última vez que uma mensagem foi enviada para este canal.","group_mention_template":"Menções de: @%{name}","group_message_template":"Mensagens para: @%{name}","choose_group":"(escolha um grupo)","all_categories":"(todas as categorias)","all_tags":"(todas as tags)","create_rule":"Criar Regra","create_channel":"Criar Canal","delete_channel":"Excluir","test_channel":"Testar","edit_channel":"Editar","channel_delete_confirm":"Você tem certeza de que deseja excluir este canal? Todas as regras associadas serão excluídas.","test_modal":{"title":"Enviar uma mensagem de teste","topic":"Tópico","send":"Enviar Mensagem de Teste","close":"Fechar","error":"Um erro desconhecido ocorreu durante o envio da mensagem. Verifique os logs do site para mais informações.","success":"Mensagem enviada com sucesso"},"type":{"normal":"Normal","group_message":"Mensagem de Grupo","group_mention":"Menção de Grupo"},"filter":{"mute":"Silenciar","follow":"Somente a primeira postagem","watch":"Todas as postagens e respostas"},"rule_table":{"filter":"Filtro","category":"Categoria","tags":"Etiquetas","edit_rule":"Editar","delete_rule":"Excluir"},"edit_channel_modal":{"title":"Editar Canal","save":"Salvar Canal","cancel":"Cancelar","provider":"Provedor","channel_validation":{"ok":"Válido","fail":"Formato inválido"}},"edit_rule_modal":{"title":"Editar Regra","save":"Salvar Regra","cancel":"Cancelar","provider":"Provedor","type":"Tipo","channel":"Canal","filter":"Filtro","category":"Categoria","group":"Grupo","tags":"Etiquetas","instructions":{"type":"Alterar o tipo para acionar notificações para mensagens de grupo ou menções","filter":"Nível de notificação. Silenciar sobrescreve outras regras correspondentes","category":"Esta regra será aplicada apenas a tópicos na categoria especificada","group":"Esta regra será aplicada a postagens que referenciem este grupo","tags":"Se especificado, esta regra será aplicada apenas a tópicos que possuem pelo menos uma destas etiquetas"}},"provider":{"slack":{"title":"Slack","param":{"identifier":{"title":"Canal","help":"ex.: #canal, @nome_de_usuário."}},"errors":{"action_prohibited":"Este robô não tem permissão para postar naquele canal","channel_not_found":"O canal especificado não existe no Slack"}},"telegram":{"title":"Telegram","param":{"name":{"title":"Nome","help":"Um nome para descrever o canal. Não é usado para a conexão ao Telegram."},"chat_id":{"title":"ID do Bate-Papo","help":"Um número dado a você pelo robô, ou um identificador do canal de transmissão no formato @nome_do_canal"}},"errors":{"channel_not_found":"O canal especificado não existe no Telegram","forbidden":"O robô não tem permissão para postar neste canal"}},"discord":{"title":"Discord","param":{"name":{"title":"Nome","help":"Um nome para descrever o canal. Não é usado para a conexão ao Discord."},"webhook_url":{"title":"Webhook URL","help":"A URL do webhook criada nas configurações do seu servidor Discord"}}},"mattermost":{"title":"Mattermost","param":{"identifier":{"title":"Canal","help":"ex.: #canal, @nome_de_usuário."}},"errors":{"channel_not_found":"O canal especificado não existe no Mattermost"}},"matrix":{"title":"Matrix","param":{"name":{"title":"Nome","help":"Um nome para descrever o canal. Não é usado para a conexão com o Matrix."},"room_id":{"title":"ID da Sala","help":"O 'identificador privado' para a sala. Precisa ser algo como !abcdefg:matrix.org"}},"errors":{"unknown_token":"O token de acesso é inválido","unknown_room":"O ID da sala é inválido"}},"zulip":{"title":"Zulip","param":{"stream":{"title":"Stream","help":"O nome da stream do Zulip para a qual a mensagem deve ser enviada. ex.: 'geral'"},"subject":{"title":"Assunto","help":"O assunto que estas mensagens enviadas pelo robô devem ser dadas"}},"errors":{"does_not_exist":"Esta stream não existe no Zulip"}},"rocketchat":{"title":"Rocket.Chat","param":{"identifier":{"title":"Canal","help":"ex.: #canal, @nome_de_usuário."}},"errors":{"invalid_channel":"Este canal não existe no Rocket Chat"}},"gitter":{"title":"Gitter","param":{"name":{"title":"Nome","help":"O nome de uma sala Gitter, ex.: gitterHQ/services."},"webhook_url":{"title":"URL do Webhook","help":"O URL fornecido quando você cria uma nova integração em uma sala Gitter."}}},"flowdock":{"title":"Flowdock","param":{"flow_token":{"title":"Token de Fluxo","help":"O token de fluxo fornecido depois de criar uma fonte para um fluxo no qual você deseja enviar mensagens."}}},"groupme":{"errors":{"not_found":"O caminho para qual você tentou publicar sua mensagem não foi encontrado. Verifique o ID do Bot nas Configurações do Site.","instance_names_issue":"Nomes de instância formatados incorretamente ou não fornecidos"}},"teams":{"title":"Microsoft Teams","param":{"name":{"title":"Nome","help":"Um nome de canal do Teams, por exemplo: discourse"},"webhook_url":{"title":"Webhook URL","help":"O URL fornecido quando você cria um novo webhook de entrada"}},"errors":{"invalid_channel":"Este canal não existe no Microsoft Teams"}},"webex":{"title":"Webex Teams","param":{"name":{"title":"Nome","help":"Um nome de espaço do Webex, exemplo: discourse"},"webhook_url":{"title":"Webhook URL","help":"O URL fornecido quando você cria um novo webhook de entrada"}},"errors":{"invalid_channel":"Este canal não existe no Webex"}},"google":{"title":"Bate-papo do Google","param":{"name":{"title":"Nome","help":"Um nome para o canal (exibido apenas na interface de administração do Discourse)"},"webhook_url":{"title":"Webhook URL","help":"O URL fornecido quando você cria um novo webhook de entrada"}}}}},"details":{"title":"Ocultar detalhes"},"discourse_local_dates":{"relative_dates":{"today":"Hoje %{time}","tomorrow":"Amanhã %{time}","yesterday":"Ontem %{time}","countdown":{"passed":"a data já passou"}},"title":"Inserir data/hora","create":{"form":{"insert":"Inserir","advanced_mode":"Modo avançado","simple_mode":"Modo simples","format_description":"Formato usado para exibir a dada ao(à) usuário(a). Use Z para exibir o resultado e zz para o nome do fuso horário.","timezones_title":"Fusos horários para exibir","timezones_description":"Os fusos horários serão usados ​​para exibir datas na pré-visualização e no fallback.","recurring_title":"Recorrência","recurring_description":"Defina a recorrência de um evento. Você também pode editar manualmente a opção recorrente gerada pelo formulário e usar uma das seguintes chaves em inglês: years, quarters, months, weeks, days, hours, minutes, seconds, milliseconds.","recurring_none":"Sem recorrência","invalid_date":"Data inválida, verifique se a data e a hora estão corretas","date_title":"Data","time_title":"Hora","format_title":"Formato de data","timezone":"Fuso horário","until":"Até…","recurring":{"every_day":"Todos os dias","every_week":"Todas as semanas","every_two_weeks":"A cada duas semanas","every_month":"A cada mês","every_two_months":"A cada dois meses","every_three_months":"A cada tres meses","every_six_months":"A cada seis meses","every_year":"Todos os anos"}}}},"discourse_narrative_bot":{"welcome_post_type":{"new_user_track":"Iniciar o tutorial de novo(a) usuário(a) para todos(as) os(as) usuários(as) novos(as)","welcome_message":"Enviar uma mensagem de boas-vindas com um guia de início rápido para todos os(as) usuários(as) novos(as)"}},"presence":{"replying":{"one":"respondendo","other":"respondendo"},"editing":{"one":"editando","other":"editando"},"replying_to_topic":{"one":"respondendo","other":"respondendo"}},"whos_online":{"title":"Online ({{count}}):","tooltip":"Usuários online nos últimos 5 minutos","no_users":"Nenhum usuário online no momento"},"poll":{"voters":{"one":"votante","other":"votantes"},"total_votes":{"one":"voto no total","other":"votos no total"},"average_rating":"Classificação média: \u003cstrong\u003e%{average}\u003c/strong\u003e.","public":{"title":"Votos são \u003cstrong\u003epúblicos\u003c/strong\u003e."},"results":{"groups":{"title":"Você precisa ser membro de %{groups} para votar nesta enquete."},"vote":{"title":"Resultados serão mostrados ao \u003cstrong\u003evotar\u003c/strong\u003e."},"closed":{"title":"Resultados serão mostrados quando a votação \u003cstrong\u003eterminar\u003c/strong\u003e."},"staff":{"title":"Resultados são mostrados apenas para membros da \u003cstrong\u003eequipe\u003c/strong\u003e."}},"multiple":{"help":{"at_least_min_options":{"one":"Escolha pelo menos \u003cstrong\u003e%{count}\u003c/strong\u003e opção.","other":"Escolha pelo menos \u003cstrong\u003e%{count}\u003c/strong\u003e opções."},"up_to_max_options":{"one":"Escolha até \u003cstrong\u003e%{count}\u003c/strong\u003e opção.","other":"Escolha até \u003cstrong\u003e%{count}\u003c/strong\u003e opções."},"x_options":{"one":"Escolha \u003cstrong\u003e%{count}\u003c/strong\u003e opção.","other":"Escolha \u003cstrong\u003e%{count}\u003c/strong\u003e opções."},"between_min_and_max_options":"Escolha entre \u003cstrong\u003e%{min}\u003c/strong\u003e e \u003cstrong\u003e%{max}\u003c/strong\u003e opções."}},"cast-votes":{"title":"Participe da enquete","label":"Votar agora!"},"show-results":{"title":"Mostrar o resultado da enquete","label":"Mostrar resultados"},"hide-results":{"title":"Voltar para os seus votos","label":"Mostrar voto"},"group-results":{"title":"Agrupar votos por campo de usuário(a)","label":"Mostrar divisão"},"export-results":{"title":"Exportar os resultados da enquete","label":"Exportar"},"open":{"title":"Abrir a enquete","label":"Abrir","confirm":"Você tem certeza de que deseja abrir esta enquete?"},"close":{"title":"Fechar enquete","label":"Fechar","confirm":"Você tem certeza de que deseja fechar esta enquete?"},"automatic_close":{"closes_in":"Fecha em \u003cstrong\u003e%{timeLeft}\u003c/strong\u003e.","age":"Fechou \u003cstrong\u003e%{age}\u003c/strong\u003e"},"breakdown":{"title":"Resultados da enquete","votes":"%{count} votos","breakdown":"Divisão","percentage":"Porcentagem","count":"Contagem"},"error_while_toggling_status":"Desculpe, houve um erro ao mudar o status desta enquete.","error_while_casting_votes":"Desculpe, houve um erro ao registrar os seus votos.","error_while_fetching_voters":"Desculpe, houve um erro ao exibir os votantes.","error_while_exporting_results":"Desculpe, houve um erro ao exportar os resultados da pesquisa.","ui_builder":{"title":"Criar enquete","insert":"Inserir enquete","help":{"options_min_count":"Insira pelo menos uma opção.","options_max_count":"Insira no máximo %{count} opções.","invalid_min_value":"O valor mínimo deve ser pelo menos 1.","invalid_max_value":"O valor máximo deve ser pelo menos 1, mas menor ou igual ao número de opções.","invalid_values":"O valor mínimo precisa ser menor do que o valor máximo.","min_step_value":"O valor mínimo de intervalo é 1"},"poll_type":{"label":"Tipo","regular":"Única escolha","multiple":"Múltipla escolha","number":"Classificação numérica"},"poll_result":{"label":"Exibir resultados","always":"Sempre visível","vote":"Apenas após a votação","closed":"Quando a enquete for encerrada","staff":"Somente equipe"},"poll_groups":{"label":"Limitar votação a estes grupos"},"poll_chart_type":{"label":"Gráfico de resultados","bar":"Barras","pie":"Pizza"},"poll_config":{"max":"Escolhas máx.","min":"Escolhas mínimas","step":"Intervalo"},"poll_public":{"label":"Exibir quem votou"},"poll_title":{"label":"Título (opcional)"},"poll_options":{"label":"Opções (uma por linha)","add":"Adicionar opção"},"automatic_close":{"label":"Fechar automaticamente a enquete"},"show_advanced":"Exibir opções avançadas","hide_advanced":"Ocultar opções avançadas"}},"styleguide":{"title":"Guia de estilo","welcome":"Para começar, escolha uma seção no menu à esquerda.","categories":{"atoms":"Átomos","molecules":"Moléculas","organisms":"Organismos"},"sections":{"typography":{"title":"Tipografia","example":"Boas-vindas ao Discourse","paragraph":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."},"date_time_inputs":{"title":"Entradas de data/hora"},"font_scale":{"title":"Sistema da fonte"},"colors":{"title":"Cores"},"icons":{"title":"Ícones","full_list":"Exibir a lista completa de ícones incríveis de fonte"},"input_fields":{"title":"Campos de entrada"},"buttons":{"title":"Botões"},"dropdowns":{"title":"Menus suspensos"},"categories":{"title":"Categorias"},"bread_crumbs":{"title":"Navegação estrutural"},"navigation":{"title":"Navegação"},"navigation_bar":{"title":"Barra de navegação"},"navigation_stacked":{"title":"Navegação empilhada"},"categories_list":{"title":"Lista de categorias"},"topic_link":{"title":"Link de tópico"},"topic_list_item":{"title":"Item de lista de tópicos"},"topic_statuses":{"title":"Status do tópico"},"topic_list":{"title":"Lista de tópicos"},"basic_topic_list":{"title":"Lista de tópicos básicos"},"footer_message":{"title":"Mensagem de rodapé"},"signup_cta":{"title":"CTA de cadastro"},"topic_timer_info":{"title":"Timers de tópico"},"topic_footer_buttons":{"title":"Botões no rodapé do tópico"},"topic_notifications":{"title":"Notificações de tópico"},"post":{"title":"Postagem"},"topic_map":{"title":"Mapa do tópico"},"site_header":{"title":"Cabeçalho do site"},"suggested_topics":{"title":"Tópicos sugeridos"},"post_menu":{"title":"Menu de postagem"},"modal":{"title":"Modal","header":"Título do modal","footer":"Rodapé do modal"},"user_about":{"title":"Caixa Sobre do(a) usuário(a)"},"header_icons":{"title":"Ícones no cabeçalho"},"spinners":{"title":"Controle giratório"}}}}},"en":{"js":{"drafts":{"label":"Drafts","label_with_count":"Drafts (%{count})"},"topic_count_unseen":{"one":"See %{count} new or updated topic","other":"See %{count} new or updated topics"},"groups":{"members":{"no_filter_matches":"No members match that search."}},"user":{"user_notifications":{"filters":{"unseen":"Unseen"}},"no_bookmarks_search":"No bookmarks found with the provided search query.","messages":{"all":"all inboxes","personal":"Personal","latest":"Latest","unread":"Unread","new":"New"},"associated_accounts":{"confirm_description":{"disconnect":"Your existing %{provider} account '%{account_description}' will be disconnected."}}},"create_account":{"associate":"Already have an account? \u003ca href='%{associate_link}'\u003eLog In\u003c/a\u003e to link your %{provider} account."},"topics":{"bulk":{"change_category":"Set Category...","notification_level":"Notifications..."},"none":{"unseen":"You have no unseen topics."},"bottom":{"unseen":"There are no more unseen topics."}},"topic":{"actions":{"slow_mode":"Set Slow Mode...","make_public":"Make Public Topic..."}},"post":{"controls":{"change_owner":"Change Ownership...","grant_badge":"Grant Badge...","add_post_notice":"Add Staff Notice...","change_post_notice":"Change Staff Notice..."}},"history_capped_revisions":"History, last 100 revisions","filters":{"unseen":{"title":"Unseen","lower_title":"unseen","help":"new topics and topics you are currently watching or tracking with unread posts"}},"tagging":{"topics":{"none":{"unseen":"You have no unseen topics."}}},"chat_integration":{"filter":{"thread":"All posts with threaded replies"},"provider":{"groupme":{"title":"GroupMe","param":{"groupme_instance_name":{"title":"GroupMe Instance Name","help":"name of the Groupme instance as listed in Site Settings. use 'all' to send to all  instances"}}}}}}}};
I18n.locale = 'pt_BR';
I18n.pluralizationRules.pt_BR = MessageFormat.locale.pt_BR;
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
//! locale : Portuguese (Brazil) [pt-br]
//! author : Caio Ribeiro Pereira : https://github.com/caio-ribeiro-pereira

;(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined'
       && typeof require === 'function' ? factory(require('../moment')) :
   typeof define === 'function' && define.amd ? define(['../moment'], factory) :
   factory(global.moment)
}(this, (function (moment) { 'use strict';

    //! moment.js locale configuration

    var ptBr = moment.defineLocale('pt-br', {
        months: 'janeiro_fevereiro_março_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro'.split(
            '_'
        ),
        monthsShort: 'jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez'.split('_'),
        weekdays: 'domingo_segunda-feira_terça-feira_quarta-feira_quinta-feira_sexta-feira_sábado'.split(
            '_'
        ),
        weekdaysShort: 'dom_seg_ter_qua_qui_sex_sáb'.split('_'),
        weekdaysMin: 'do_2ª_3ª_4ª_5ª_6ª_sá'.split('_'),
        weekdaysParseExact: true,
        longDateFormat: {
            LT: 'HH:mm',
            LTS: 'HH:mm:ss',
            L: 'DD/MM/YYYY',
            LL: 'D [de] MMMM [de] YYYY',
            LLL: 'D [de] MMMM [de] YYYY [às] HH:mm',
            LLLL: 'dddd, D [de] MMMM [de] YYYY [às] HH:mm',
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
            s: 'poucos segundos',
            ss: '%d segundos',
            m: 'um minuto',
            mm: '%d minutos',
            h: 'uma hora',
            hh: '%d horas',
            d: 'um dia',
            dd: '%d dias',
            M: 'um mês',
            MM: '%d meses',
            y: 'um ano',
            yy: '%d anos',
        },
        dayOfMonthOrdinalParse: /\d{1,2}º/,
        ordinal: '%dº',
        invalidDate: 'Data inválida',
    });

    return ptBr;

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
